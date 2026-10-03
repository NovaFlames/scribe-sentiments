import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  imageDataUrl: z
    .string()
    .startsWith("data:image/")
    .max(12_000_000, "Image too large — keep the scan under about 8 MB."),
  notes: z.string().max(600).optional(),
});

export const AnalysisSchema = z.object({
  transcript: z.string(),
  legibility: z.enum(["high", "moderate", "low"]),
  sentiment: z.enum(["negative", "mixed", "neutral", "positive"]),
  sentimentLabel: z.string(),
  confidence: z.number().min(0).max(100),
  emotions: z
    .array(z.object({ name: z.string(), score: z.number().min(0).max(1) }))
    .max(8),
  indicators: z
    .array(
      z.object({
        phrase: z.string(),
        note: z.string(),
        weight: z.enum(["high", "medium", "low"]),
      }),
    )
    .max(8),
  caveats: z.string(),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

const SYSTEM_PROMPT = `You are a forensic document examiner's assistant supporting a police / detective investigation.
You receive a photograph or scan of handwritten text.

Do two things:
1. Transcribe the handwriting as faithfully as possible. Mark unreadable words as [illegible].
2. Assess the emotional tone and apparent state of the writer from the written language and, where relevant, visible writing pressure, corrections, crossings-out, and letter control.

Rules:
- Base every claim on what is visible. Never invent content that is not in the image.
- If the text is typed/printed rather than handwritten, still transcribe and analyse it, and mention that in caveats. Only if the image contains no readable text at all, set transcript to "" and confidence to 0.
- confidence is a calibrated 0-100 score for how certain the sentiment read is. Use the full range: a clearly legible sample with unambiguous emotional language should score 70-90; a legible but tonally flat or short sample 45-70; only genuinely ambiguous, fragmentary, or barely legible samples should fall below 45. Never default to a near-zero value when the text is readable.
- Emotion scores are 0..1 and should cover the most relevant 4-6 emotions for this sample.
- indicators are literal quoted phrases from the transcript plus a short investigative note.
- caveats must state the analytical limits: sentiment is advisory, reflects tone not legal intent, and requires corroboration.
- Never state guilt, never identify a person, never diagnose a medical or psychiatric condition.
Respond with JSON only, matching the requested schema.`;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "transcript",
    "legibility",
    "sentiment",
    "sentimentLabel",
    "confidence",
    "emotions",
    "indicators",
    "caveats",
  ],
  properties: {
    transcript: { type: "string" },
    legibility: { type: "string", enum: ["high", "moderate", "low"] },
    sentiment: {
      type: "string",
      enum: ["negative", "mixed", "neutral", "positive"],
    },
    sentimentLabel: { type: "string" },
    confidence: { type: "number" },
    emotions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "score"],
        properties: { name: { type: "string" }, score: { type: "number" } },
      },
    },
    indicators: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["phrase", "note", "weight"],
        properties: {
          phrase: { type: "string" },
          note: { type: "string" },
          weight: { type: "string", enum: ["high", "medium", "low"] },
        },
      },
    },
    caveats: { type: "string" },
  },
} as const;

export const analyzeHandwriting = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<Analysis> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
        },
        body: JSON.stringify({
          model: "google/gemini-3.7-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: data.notes
                    ? `Examiner context: ${data.notes}`
                    : "Examine this handwriting sample.",
                },
                { type: "image_url", image_url: { url: data.imageDataUrl } },
              ],
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "handwriting_sentiment",
              strict: true,
              schema: RESPONSE_SCHEMA,
            },
          },
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      let message = body;
      try {
        const parsed = JSON.parse(body) as { error?: { message?: string } };
        message = parsed.error?.message ?? body;
      } catch {
        /* keep raw body */
      }
      if (response.status === 429)
        throw new Error("Too many examinations at once. Try again shortly.");
      if (response.status === 402)
        throw new Error(
          message || "AI credits exhausted — add credits to continue.",
        );
      throw new Error(message || `Analysis failed (${response.status}).`);
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("The examiner returned an empty result.");

    return AnalysisSchema.parse(JSON.parse(content));
  });
