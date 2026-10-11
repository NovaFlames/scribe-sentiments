import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { analyzeHandwriting, type Analysis } from "@/lib/analyze.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Forensic Handwriting Analysis — Quill/Bench Sentiment Examination" },
      {
        name: "description",
        content:
          "Forensic handwriting analysis for police and detectives: upload a scan of handwritten text and get an advisory sentiment and emotional-state read for investigations.",
      },
      {
        property: "og:title",
        content: "Forensic Handwriting Analysis — Quill/Bench Sentiment Examination",
      },
      {
        property: "og:description",
        content:
          "Forensic handwriting analysis bench for transcribing handwritten evidence and reading the writer's emotional tone.",
      },
    ],
  }),
  component: Bench,
});

type Exhibit = {
  id: string;
  fileName: string;
  sizeKb: number;
  capturedAt: string;
  analysis: Analysis;
};

const SENTIMENT_COLOR: Record<Analysis["sentiment"], string> = {
  negative: "text-rose",
  mixed: "text-amber",
  neutral: "text-frost-2",
  positive: "text-teal",
};

const BAR_COLOR = ["bg-rose", "bg-amber", "bg-frost-2", "bg-teal", "bg-panel-2"];

function certaintyTier(confidence: number) {
  if (confidence >= 75)
    return { label: "High certainty", note: "Reading is firm — verify before filing", bar: "bg-teal", text: "text-teal" };
  if (confidence >= 45)
    return { label: "Moderate certainty", note: "Reading is indicative — seek corroboration", bar: "bg-amber", text: "text-amber" };
  return { label: "Low certainty", note: "Reading is weak — treat as unconfirmed", bar: "bg-rose", text: "text-rose" };
}

function caseNumber(seed: number) {
  return `#2026-${String(400 + seed).padStart(4, "0")}`;
}

function Bench() {
  const runAnalysis = useServerFn(analyzeHandwriting);
  const inputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<{ name: string; sizeKb: number } | null>(
    null,
  );
  const [notes, setNotes] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [log, setLog] = useState<Exhibit[]>([]);
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [itemCount, setItemCount] = useState(0);

  const mutation = useMutation({
    mutationFn: async (imageDataUrl: string) =>
      runAnalysis({
        data: { imageDataUrl, notes: notes.trim() || undefined },
      }),
    onSuccess: (result) => {
      setAnalysis(result);
      setLog((prev) =>
        [
          {
            id: crypto.randomUUID(),
            fileName: file?.name ?? "sample",
            sizeKb: file?.sizeKb ?? 0,
            capturedAt: capturedAt ?? new Date().toISOString(),
            analysis: result,
          },
          ...prev,
        ].slice(0, 6),
      );
    },
  });

  function acceptFile(picked: File | undefined) {
    if (!picked || !picked.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(String(reader.result));
      setAnalysis(null);
      mutation.reset();
    };
    reader.readAsDataURL(picked);
    setFile({ name: picked.name, sizeKb: Math.round(picked.size / 1024) });
    setCapturedAt(new Date().toISOString());
    setItemCount((n) => n + 1);
  }

  const errorMessage =
    mutation.error instanceof Error ? mutation.error.message : null;

  return (
    <div className="min-h-screen bg-ink font-body text-frost selection:bg-teal/30 selection:text-frost">
      <div className="pointer-events-none fixed inset-0 -z-10 gridpaper opacity-70" />
      <div className="pointer-events-none fixed -left-32 top-10 -z-10 h-96 w-96 rounded-full bg-teal/10 blur-[120px]" />
      <div className="pointer-events-none fixed -right-24 bottom-0 -z-10 h-[28rem] w-[28rem] rounded-full bg-frost/5 blur-[130px]" />

      <header className="sticky top-0 z-30 border-b border-line/50 bg-ink/85 frost-edge backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-[min(1vw,7px)] bg-teal/15 ring-1 ring-teal/30">
              <span className="font-mono text-xs font-semibold text-teal">
                Q
              </span>
            </div>
            <div className="leading-none">
              <div className="font-display text-base font-semibold tracking-tight text-frost">
                QUILL<span className="text-dim">/</span>BENCH
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
                Forensic Handwriting
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => window.print()}
              disabled={!analysis}
              className="rounded-[min(1vw,7px)] bg-teal px-3 py-2 text-sm font-medium text-ink ring-1 ring-teal/40 transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-40"
            >
              Request report
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 py-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* EVIDENCE */}
          <section className="lg:col-span-7">
            <div className="frost frost-edge rounded-[min(1.4vw,14px)] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-dim">
                    Exhibit A · Source Evidence
                  </div>
                  <h1 className="max-w-[40ch] text-balance font-display text-2xl font-semibold leading-tight text-frost">
                    Forensic Handwriting Analysis — Sentiment Examination
                  </h1>
                  <p className="mt-1.5 max-w-[52ch] text-[13px] leading-relaxed text-dim">
                    Forensic bench for investigators: upload a photo or scan of a
                    handwritten note to transcribe it and assess the writer's
                    sentiment, emotional signals, and flagged phrases. Results are
                    advisory and require corroboration.
                  </p>
                  <div className="mt-2 font-mono text-[11px] text-teal">
                    {file
                      ? `Item #${itemCount} — ${file.name}`
                      : "Handwritten sample, awaiting intake"}
                  </div>
                </div>
                <span className="hidden rounded-[min(1vw,6px)] bg-ink/60 px-2.5 py-1 font-mono text-[11px] text-teal ring-1 ring-teal/20 sm:inline">
                  {preview ? "DIGITIZED" : "EMPTY"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
                <div className="sm:col-span-3">
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      acceptFile(e.dataTransfer.files[0]);
                    }}
                    onClick={() => inputRef.current?.click()}
                    className={`${mutation.isPending ? "scan" : ""} gridpaper relative grid h-72 cursor-pointer place-items-center overflow-hidden rounded-[min(1.4vw,12px)] bg-ink-2/70 ring-1 ring-line/50 sm:h-full sm:min-h-72`}
                  >
                    <div className="beam absolute inset-0 opacity-70" />
                    {preview ? (
                      <img
                        src={preview}
                        alt="Uploaded handwriting evidence sample"
                        className="relative z-10 max-h-[92%] w-[86%] rounded-[min(1vw,10px)] object-contain"
                      />
                    ) : (
                      <div className="relative z-10 grid aspect-[4/3] w-[86%] place-items-center gap-1 rounded-[min(1vw,10px)] bg-panel-2/80 text-center outline-1 -outline-offset-1 outline-black/5">
                        <div>
                          <div className="font-display text-lg font-semibold text-frost">
                            Drop handwriting scan
                          </div>
                          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-dim">
                            JPG · PNG · HEIC · click to browse
                          </div>
                        </div>
                      </div>
                    )}
                    <span className="absolute left-2 top-2 z-10 rounded bg-ink/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-frost-2">
                      {mutation.isPending ? "Scanning…" : "Lamp · 45°"}
                    </span>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => acceptFile(e.target.files?.[0])}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:col-span-2">
                  <div className="flex-1 rounded-[min(1.2vw,10px)] bg-ink/50 ring-1 ring-line/40">
                    <dl className="divide-y divide-line/40 font-mono text-xs">
                      <div className="flex justify-between px-3 py-2">
                        <dt className="text-dim">File</dt>
                        <dd className="break-all text-right text-frost-2">
                          {file?.name ?? "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between px-3 py-2">
                        <dt className="text-dim">Size</dt>
                        <dd className="text-frost-2">
                          {file ? `${file.sizeKb} KB` : "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between px-3 py-2">
                        <dt className="text-dim">Logged</dt>
                        <dd className="text-frost-2">
                          {capturedAt
                            ? new Date(capturedAt).toLocaleTimeString()
                            : "--:--:--"}
                        </dd>
                      </div>
                      <div className="flex justify-between px-3 py-2">
                        <dt className="text-dim">Legibility</dt>
                        <dd className="text-amber">
                          {analysis?.legibility ?? "pending"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={600}
                    rows={3}
                    placeholder="Examiner context (optional): where recovered, suspected author, prior samples…"
                    className="resize-none rounded-[min(1.2vw,10px)] bg-ink/50 p-3 font-mono text-xs text-frost-2 outline-none ring-1 ring-line/40 placeholder:text-dim focus:ring-teal/40"
                  />
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="rounded-[min(1.2vw,10px)] bg-panel px-4 py-2.5 text-sm font-medium text-frost ring-1 ring-line/50 transition-transform hover:-translate-y-0.5"
                  >
                    {preview ? "Replace image" : "Choose image"}
                  </button>
                  <button
                    onClick={() => preview && mutation.mutate(preview)}
                    disabled={!preview || mutation.isPending}
                    className="group flex items-center justify-center gap-2 rounded-[min(1.2vw,10px)] bg-teal px-4 py-3 text-sm font-medium text-ink ring-1 ring-teal/40 transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <span className="grid size-4 place-items-center rounded-full bg-ink/15 text-ink">
                      <span className="font-mono text-[11px] leading-none">
                        ▶
                      </span>
                    </span>
                    {mutation.isPending ? "Running…" : "Run analysis"}
                  </button>
                  <div className="rounded-[min(1.2vw,10px)] bg-ink/40 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-dim">
                    Model: QW-SCRIB-2 · v1.8
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="mt-4 rounded-[min(1.2vw,10px)] bg-rose/10 px-3.5 py-2.5 font-mono text-xs text-rose ring-1 ring-rose/30">
                  {errorMessage}
                </div>
              )}
            </div>

            {/* Session log */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-frost">
                  Related examinations
                </h2>
                <span className="font-mono text-[11px] text-dim">
                  {log.length} filed this session
                </span>
              </div>
              {log.length === 0 ? (
                <div className="frost rounded-[min(1.2vw,11px)] px-3.5 py-4 font-mono text-[11px] uppercase tracking-widest text-dim">
                  No examinations filed yet
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {log.map((item, i) => (
                    <div
                      key={item.id}
                      className="frost frost-edge rounded-[min(1.2vw,11px)] p-3.5 transition-transform hover:-translate-y-1"
                    >
                      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-dim">
                        <span>{caseNumber(log.length - i)}</span>
                        <span
                          className={SENTIMENT_COLOR[item.analysis.sentiment]}
                        >
                          {item.analysis.sentiment}
                        </span>
                      </div>
                      <div className="mt-2 truncate font-display text-base font-semibold leading-tight text-frost">
                        {item.fileName}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/70">
                          <div
                            className={`h-full ${item.analysis.sentiment === "positive" ? "bg-teal" : item.analysis.sentiment === "negative" ? "bg-rose" : "bg-amber"}`}
                            style={{ width: `${item.analysis.confidence}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-frost-2">
                          {Math.round(item.analysis.confidence)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ANALYSIS */}
          <section className="lg:col-span-5">
            <div className="frost frost-edge rounded-[min(1.4vw,14px)] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-dim">
                  Analysis · Sentiment Pass
                </div>
                <span className="rounded bg-teal/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-teal ring-1 ring-teal/25">
                  {mutation.isPending
                    ? "Running"
                    : analysis
                      ? "Complete"
                      : "Standby"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[min(1.2vw,10px)] bg-ink/50 p-4 ring-1 ring-line/40">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-dim">
                    Overall
                  </div>
                  <div
                    className={`mt-1 text-balance font-display text-3xl font-semibold capitalize leading-none ${analysis ? SENTIMENT_COLOR[analysis.sentiment] : "text-dim"}`}
                  >
                    {analysis?.sentiment ?? "—"}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-dim">
                    {analysis?.sentimentLabel ?? "awaiting sample"}
                  </div>
                </div>
                <div className="rounded-[min(1.2vw,10px)] bg-ink/50 p-4 ring-1 ring-line/40">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-dim">
                    Confidence
                  </div>
                  {analysis ? (
                    (() => {
                      const tier = certaintyTier(analysis.confidence);
                      return (
                        <>
                          <div className="mt-1 font-display text-3xl font-semibold leading-none text-frost">
                            {Math.round(analysis.confidence)}
                            <span className="text-lg text-dim">%</span>
                          </div>
                          <div
                            className={`mt-1 font-mono text-[11px] uppercase tracking-wider ${tier.text}`}
                          >
                            {tier.label}
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/70">
                            <div
                              className={`h-full transition-[width] duration-700 ${tier.bar}`}
                              style={{ width: `${analysis.confidence}%` }}
                            />
                          </div>
                          <div className="mt-1.5 font-mono text-[10px] leading-snug text-dim">
                            {tier.note}
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <>
                      <div className="mt-1 font-display text-3xl font-semibold leading-none text-dim">
                        --
                        <span className="text-lg text-dim">%</span>
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-dim">
                        certainty unknown
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/70">
                        <div className="h-full bg-dim/40" style={{ width: "0%" }} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-dim">
                  Emotion breakdown
                </div>
                {(
                  analysis?.emotions ?? [
                    { name: "Anger", score: 0 },
                    { name: "Anxiety", score: 0 },
                    { name: "Fear", score: 0 },
                    { name: "Calm", score: 0 },
                  ]
                ).map((emotion, i) => (
                  <div key={emotion.name}>
                    <div className="mb-1 flex justify-between font-mono text-xs">
                      <span className="text-frost-2">{emotion.name}</span>
                      <span className="text-frost">
                        {emotion.score.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink/70">
                      <div
                        className={`h-full transition-[width] duration-700 ${BAR_COLOR[i % BAR_COLOR.length]}`}
                        style={{
                          width: `${Math.round(emotion.score * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-dim">
                  Extracted transcript
                </div>
                <div className="text-pretty rounded-[min(1.2vw,10px)] bg-ink/50 p-3.5 font-body text-sm leading-relaxed text-frost ring-1 ring-line/40">
                  {analysis?.transcript ? (
                    <>“{analysis.transcript}”</>
                  ) : (
                    <span className="text-dim">
                      Transcript appears here once a sample has been examined.
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-dim">
                  Notable indicators
                </div>
                <ul className="space-y-2 font-mono text-xs">
                  {(analysis?.indicators ?? []).map((indicator) => (
                    <li
                      key={indicator.phrase + indicator.note}
                      className="flex items-start gap-2"
                    >
                      <span
                        className={`mt-1 size-1.5 shrink-0 rounded-full ${indicator.weight === "high" ? "bg-rose" : indicator.weight === "medium" ? "bg-amber" : "bg-frost-2"}`}
                      />
                      <span className="text-frost-2">
                        “{indicator.phrase}” — {indicator.note}
                      </span>
                    </li>
                  ))}
                  {!analysis && (
                    <li className="text-dim">
                      No flagged phrases on the bench.
                    </li>
                  )}
                </ul>
              </div>

              <div className="mt-5 rounded-[min(1.2vw,10px)] bg-amber/8 p-3.5 ring-1 ring-amber/25">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-amber">
                  <span className="size-1.5 rounded-full bg-amber" />
                  Investigator caveats
                </div>
                <p className="mt-1.5 text-pretty font-body text-xs leading-relaxed text-frost-2">
                  {analysis?.caveats ??
                    "Sentiment output is advisory and reflects lexical tone, not legal intent. Corroborate every flagged phrase against independent handwriting exemplars and case evidence before use."}
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
