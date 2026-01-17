import { useMemo, useRef, useState } from "react";
import { Navigation } from "@/components/Navigation";
import {
  addDoc,
  collection,
  doc,
  increment,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";

type MindmapNode = {
  id: string;
  label: string;
};

type MindmapEdge = {
  from: string;
  to: string;
};

type MindmapResponse = {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
};

type EnrichedContent = {
  concept: string;
  verified_info: string;
};

type EnrichedSummary = {
  original_summary?: string;
  enriched_content?: EnrichedContent[];
};

type NamedEntities =
  | {
      people?: string[];
      organizations?: string[];
      dates?: string[];
      locations?: string[];
    }
  | Array<{ label?: string; text?: string }>;

type SummaryResponse = {
  note?: {
    fileName?: string;
    fileType?: string;
    status?: string;
  };
  summary?: string;
  simplified?: string;
  mostRelevantWord?: string;
  mindmap?: MindmapResponse;
  enriched?: EnrichedSummary;
  entities?: NamedEntities;
};

type SlideItem = {
  id: string;
  title: string;
  description?: string;
  content: JSX.Element;
};

const buildBulletPoints = (summary: string) => {
  if (!summary) {
    return [];
  }
  return summary
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((line) => line.trim())
    .filter(Boolean);
};

const normalizeFileType = (fileType?: string) => {
  if (!fileType) {
    return "Unknown";
  }
  if (fileType.startsWith("image/")) {
    return "Image";
  }
  if (fileType === "application/pdf") {
    return "PDF";
  }
  if (
    fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileType === "application/msword"
  ) {
    return "DOCX";
  }
  return fileType;
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const highlightConcept = (sentence: string, concept: string) => {
  if (!concept) {
    return sentence;
  }
  const regex = new RegExp(`(${escapeRegExp(concept)})`, "ig");
  return sentence.replace(
    regex,
    '<mark class="rounded bg-primary/20 px-1 py-0.5 text-primary">$1</mark>'
  );
};

const buildEvidenceMap = (mindmap?: MindmapResponse) => {
  if (!mindmap?.nodes?.length || !mindmap?.edges?.length) {
    return {};
  }

  const nodeLookup = new Map(
    mindmap.nodes.map((node) => [node.id, node.label])
  );

  const evidence: Record<string, string[]> = {};

  mindmap.edges.forEach((edge) => {
    if (
      !edge.from.startsWith("node_") ||
      edge.from.split("_").length !== 2
    ) {
      return;
    }
    if (!edge.to.startsWith(`${edge.from}_`)) {
      return;
    }
    const conceptLabel = nodeLookup.get(edge.from);
    const sentence = nodeLookup.get(edge.to);
    if (!conceptLabel || !sentence) {
      return;
    }
    if (!evidence[conceptLabel]) {
      evidence[conceptLabel] = [];
    }
    evidence[conceptLabel].push(sentence);
  });

  return evidence;
};

const normalizeEntities = (entities?: NamedEntities) => {
  if (!entities) {
    return null;
  }

  if (Array.isArray(entities)) {
    const buckets = {
      People: [] as string[],
      Organizations: [] as string[],
      Dates: [] as string[],
      Locations: [] as string[],
    };

    entities.forEach((entity) => {
      const label = entity.label?.toLowerCase();
      const text = entity.text?.trim();
      if (!text) {
        return;
      }
      if (label?.includes("per")) {
        buckets.People.push(text);
      } else if (label?.includes("org")) {
        buckets.Organizations.push(text);
      } else if (label?.includes("date")) {
        buckets.Dates.push(text);
      } else if (label?.includes("loc")) {
        buckets.Locations.push(text);
      }
    });

    return buckets;
  }

  return {
    People: entities.people ?? [],
    Organizations: entities.organizations ?? [],
    Dates: entities.dates ?? [],
    Locations: entities.locations ?? [],
  };
};

const Summarize = () => {
  const { userId } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [summary, setSummary] = useState("");
  const [simplified, setSimplified] = useState("");
  const [mostRelevantWord, setMostRelevantWord] = useState("");
  const [mindmap, setMindmap] = useState<MindmapResponse | null>(null);
  const [enriched, setEnriched] = useState<EnrichedSummary | null>(null);
  const [entities, setEntities] = useState<NamedEntities | undefined>(
    undefined
  );
  const [noteMeta, setNoteMeta] = useState<SummaryResponse["note"]>(undefined);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [activeConcept, setActiveConcept] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [explanationMode, setExplanationMode] = useState<"academic" | "simple">(
    "academic"
  );
  const [mindmapZoom, setMindmapZoom] = useState(1);
  const [mindmapPan, setMindmapPan] = useState({ x: 0, y: 0 });
  const panState = useRef({ isPanning: false, startX: 0, startY: 0 });
  const evidenceRef = useRef<HTMLDivElement | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(2);
  const [viewState, setViewState] = useState<"upload" | "loading" | "results">(
    "upload"
  );
  const [processingStep, setProcessingStep] = useState(0);

  const bulletPoints = useMemo(() => buildBulletPoints(summary), [summary]);
  const evidenceMap = useMemo(() => buildEvidenceMap(mindmap ?? undefined), [
    mindmap,
  ]);
  const normalizedEntities = useMemo(() => normalizeEntities(entities), [
    entities,
  ]);

  const conceptNodes = useMemo(() => {
    if (!mindmap?.nodes?.length) {
      return [];
    }
    return mindmap.nodes
      .filter(
        (node) => node.id.startsWith("node_") && node.id.split("_").length === 2
      )
      .map((node) => ({
        id: node.id,
        label: node.label,
      }));
  }, [mindmap]);

  const handleConceptClick = (concept: string) => {
    setActiveConcept(concept);
    requestAnimationFrame(() => {
      evidenceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setSummary("");
    setSimplified("");
    setMostRelevantWord("");
    setMindmap(null);
    setEnriched(null);
    setEntities(undefined);
    setNoteMeta(undefined);
    setError("");
    setActiveConcept("");
    setActiveSlideIndex(2);
    setViewState("upload");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please choose a file to summarize.");
      return;
    }

    const token = localStorage.getItem("nexasense_token");
    if (!token || !userId) {
      setError("Please log in again to upload your file.");
      return;
    }

    setIsUploading(true);
    setViewState("loading");
    setError("");
    setProcessingStep(0);
    const processingTimer = window.setInterval(() => {
      setProcessingStep((prev) => (prev + 1) % 3);
    }, 1800);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("http://localhost:8000/notes/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        const message =
          errorPayload?.detail ??
          "Upload failed. Please check the file and try again.";
        throw new Error(message);
      }

      const data: SummaryResponse = await response.json();
      setSummary(data.summary ?? "");
      setNoteMeta(data.note);
      setSimplified(data.simplified ?? "");
      setMostRelevantWord(data.mostRelevantWord ?? "");
      setMindmap(data.mindmap ?? null);
      setEnriched(data.enriched ?? null);
      setEntities(data.entities);
      setActiveConcept("");
      setActiveSlideIndex(2);
      setViewState("results");

      await addDoc(collection(db, "users", userId, "notes"), {
        fileName: data.note?.fileName || selectedFile.name,
        fileType: data.note?.fileType || selectedFile.type,
        summary: data.summary ?? "",
        createdAt: serverTimestamp(),
        status: data.note?.status ?? "Processed",
      });

      await setDoc(
        doc(db, "users", userId, "progress", "stats"),
        {
          notesUploaded: increment(1),
          totalSummaries: increment(1),
          lastActivity: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (uploadError) {
      console.error(uploadError);
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "We could not summarize that file. Please try again.";
      setError(message);
      setViewState("upload");
    } finally {
      setIsUploading(false);
      window.clearInterval(processingTimer);
    }
  };

  const slides: SlideItem[] = [
    {
      id: "original",
      title: "Original uploaded content",
      description: "Track the file you submitted and its processing state.",
      content: (
        <div className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
          <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
            <p className="text-xs uppercase text-muted-foreground">File name</p>
            <p className="mt-2 font-semibold text-foreground">
              {noteMeta?.fileName || selectedFile?.name || "No file detected"}
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
            <p className="text-xs uppercase text-muted-foreground">File type</p>
            <p className="mt-2 font-semibold text-foreground">
              {normalizeFileType(noteMeta?.fileType || selectedFile?.type)}
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
            <p className="text-xs uppercase text-muted-foreground">
              Upload status
            </p>
            <p className="mt-2 font-semibold text-foreground">
              {noteMeta?.status || "Processed"}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "topic",
      title: "Most relevant topic",
      description: "Use this as the mindmap root and study anchor.",
      content: (
        <div className="mt-6 rounded-2xl border border-border/60 bg-muted/20 p-6 text-center">
          <p className="text-3xl font-semibold text-primary">
            {mostRelevantWord || "No dominant topic detected yet."}
          </p>
        </div>
      ),
    },
    {
      id: "points",
      title: "Study points",
      description: "The default view for quick revision.",
      content: (
        <div className="mt-6 space-y-4">
          {bulletPoints.length > 0 ? (
            <ul className="space-y-3">
              {bulletPoints.map((point, index) => (
                <li key={`${point}-${index}`} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    ✦
                  </span>
                  <span className="text-sm leading-relaxed text-foreground">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No study points were generated. Try a clearer document or a longer
              passage.
            </p>
          )}
        </div>
      ),
    },
    {
      id: "summary",
      title: "Academic summary",
      description: "Scrollable summary you can copy for notes.",
      content: (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={async () => {
                if (!summary) {
                  return;
                }
                await navigator.clipboard.writeText(summary);
                setCopyStatus("Copied to clipboard");
                setTimeout(() => setCopyStatus(""), 2000);
              }}
              className="rounded-full border border-border px-4 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/60 hover:text-primary"
            >
              Copy summary
            </button>
            {copyStatus && <p className="text-xs text-primary">{copyStatus}</p>}
          </div>
          <div className="mt-4 max-h-52 overflow-y-auto rounded-xl border border-border/50 bg-muted/20 p-4 text-sm leading-relaxed text-foreground">
            {summary ? (
              summary
            ) : (
              <p className="text-sm text-muted-foreground">
                We couldn&apos;t generate a full summary. Upload a longer or
                higher-quality file.
              </p>
            )}
          </div>
        </>
      ),
    },
    {
      id: "simplified",
      title: "Simplified explanation",
      description: "Toggle between academic and student-friendly language.",
      content: (
        <>
          <div className="mt-4 flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setExplanationMode("academic")}
              className={`rounded-full px-3 py-1 transition ${
                explanationMode === "academic"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Academic
            </button>
            <button
              type="button"
              onClick={() => setExplanationMode("simple")}
              className={`rounded-full px-3 py-1 transition ${
                explanationMode === "simple"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Simplified
            </button>
          </div>
          <div className="mt-4 rounded-xl border border-border/50 bg-muted/20 p-4 text-sm leading-relaxed text-foreground">
            {explanationMode === "academic" ? (
              summary ? (
                summary
              ) : (
                <p className="text-sm text-muted-foreground">
                  Academic wording is unavailable for this upload.
                </p>
              )
            ) : simplified ? (
              simplified
            ) : (
              <p className="text-sm text-muted-foreground">
                Simplified explanation is not available yet.
              </p>
            )}
          </div>
        </>
      ),
    },
    {
      id: "concepts",
      title: "Key concepts & keywords",
      description: "Click a concept to jump to its evidence.",
      content: (
        <div className="mt-6 flex flex-wrap gap-2">
          {conceptNodes.length > 0 ? (
            conceptNodes.map((concept) => (
              <button
                key={concept.id}
                type="button"
                onClick={() => handleConceptClick(concept.label)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition hover:shadow-sm ${
                  activeConcept === concept.label
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/60 hover:text-primary"
                }`}
              >
                {concept.label}
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Key concepts will appear after processing your document.
            </p>
          )}
        </div>
      ),
    },
    {
      id: "mindmap",
      title: "Mindmap visualization",
      description: "Scroll to zoom and drag to pan the map.",
      content: mindmap?.nodes?.length ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-border/50 bg-muted/20 p-2">
          <svg
            className="h-[420px] w-full touch-none"
            viewBox="-300 -220 600 440"
            onWheel={(event) => {
              event.preventDefault();
              const delta = event.deltaY > 0 ? -0.1 : 0.1;
              setMindmapZoom((prev) =>
                Math.min(2.4, Math.max(0.6, prev + delta))
              );
            }}
            onPointerDown={(event) => {
              panState.current = {
                isPanning: true,
                startX: event.clientX,
                startY: event.clientY,
              };
            }}
            onPointerMove={(event) => {
              if (!panState.current.isPanning) {
                return;
              }
              const dx = (event.clientX - panState.current.startX) / 4;
              const dy = (event.clientY - panState.current.startY) / 4;
              panState.current.startX = event.clientX;
              panState.current.startY = event.clientY;
              setMindmapPan((prev) => ({
                x: prev.x + dx,
                y: prev.y + dy,
              }));
            }}
            onPointerUp={() => {
              panState.current.isPanning = false;
            }}
            onPointerLeave={() => {
              panState.current.isPanning = false;
            }}
          >
            <g
              transform={`translate(${mindmapPan.x} ${mindmapPan.y}) scale(${mindmapZoom})`}
            >
              {conceptNodes.map((concept, index) => {
                const angle =
                  (index / Math.max(conceptNodes.length, 1)) * Math.PI * 2;
                const radius = 140;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                const relatedEvidence = evidenceMap[concept.label] ?? [];

                return (
                  <g key={concept.id} className="group">
                    <line
                      x1={0}
                      y1={0}
                      x2={x}
                      y2={y}
                      stroke="currentColor"
                      className="text-border"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={28}
                      className="fill-primary/20 stroke-primary transition group-hover:fill-primary/30"
                    />
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      className="fill-primary text-[10px] font-semibold transition group-hover:fill-primary/80"
                      onClick={() => handleConceptClick(concept.label)}
                      style={{ cursor: "pointer" }}
                    >
                      {concept.label}
                    </text>
                    {relatedEvidence.slice(0, 2).map((sentence, i) => {
                      const detailRadius = radius + 70 + i * 50;
                      const detailX = Math.cos(angle) * detailRadius;
                      const detailY = Math.sin(angle) * detailRadius;
                      return (
                        <g key={`${concept.id}-${i}`}>
                          <line
                            x1={x}
                            y1={y}
                            x2={detailX}
                            y2={detailY}
                            stroke="currentColor"
                            className="text-border"
                          />
                          <circle
                            cx={detailX}
                            cy={detailY}
                            r={20}
                            className="fill-muted/50 stroke-border"
                          />
                          <text
                            x={detailX}
                            y={detailY}
                            textAnchor="middle"
                            className="fill-foreground text-[8px]"
                          >
                            {sentence.length > 22
                              ? `${sentence.slice(0, 22)}…`
                              : sentence}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              <circle
                cx={0}
                cy={0}
                r={36}
                className="fill-primary/30 stroke-primary"
              />
              <text
                x={0}
                y={0}
                textAnchor="middle"
                className="fill-primary text-[12px] font-semibold"
              >
                {mostRelevantWord || "Topic"}
              </text>
            </g>
          </svg>
          <p className="mt-2 text-xs text-muted-foreground">
            Tip: Use scroll to zoom and drag to explore the map.
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-border/50 bg-muted/20 p-4 text-sm text-muted-foreground">
          <p>
            Mindmap data is unavailable. Here&apos;s a textual outline instead:
          </p>
          {conceptNodes.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {conceptNodes.map((concept) => (
                <li key={concept.id} className="text-foreground">
                  {concept.label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2">Upload a document to generate a concept map.</p>
          )}
        </div>
      ),
    },
    {
      id: "evidence",
      title: "Concept evidence",
      description: "Sentences supporting each concept.",
      content: (
        <div ref={evidenceRef} className="mt-6 space-y-4">
          {activeConcept ? (
            <div className="space-y-3 text-sm text-foreground">
              {(evidenceMap[activeConcept] || []).length > 0 ? (
                evidenceMap[activeConcept].map((sentence, index) => (
                  <p
                    key={`${activeConcept}-${index}`}
                    className="rounded-xl border border-border/50 bg-muted/20 p-3 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: highlightConcept(sentence, activeConcept),
                    }}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No supporting sentences were mapped for this concept.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a concept to reveal the sentences that support it.
            </p>
          )}
          {enriched?.enriched_content && enriched.enriched_content.length > 0 ? (
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
              <p className="text-xs font-semibold text-muted-foreground">
                Additional verified context
              </p>
              <div className="mt-3 space-y-4 text-sm text-foreground">
                {enriched.enriched_content.map((entry) => (
                  <div key={entry.concept}>
                    <p className="font-semibold text-primary">
                      {entry.concept}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {entry.verified_info}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ),
    },
  ];

  const handleSlideChange = (index: number) => {
    if (index < 0 || index >= slides.length) {
      return;
    }
    setActiveSlideIndex(index);
  };

  const processingSteps = [
    "Analyzing document…",
    "Extracting concepts…",
    "Structuring study material…",
  ];

  const handleSlideKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      handleSlideChange(activeSlideIndex - 1);
    }
    if (event.key === "ArrowRight") {
      handleSlideChange(activeSlideIndex + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="min-h-[calc(100vh-80px)] px-6 py-12">
        <div className="mx-auto w-full max-w-4xl">
          {viewState === "upload" && (
            <div className="rounded-3xl border border-border bg-card p-8 shadow-lg">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-foreground">
                  Summarize your notes
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Upload a file and receive structured, study-ready outputs in
                  guided steps.
                </p>
              </div>

              <div className="mt-8 flex flex-col items-center gap-4">
                <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-muted-foreground/40 bg-muted/30 px-6 py-8 text-center transition hover:border-primary/60">
                  <input
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                  <div className="text-sm font-semibold text-foreground">
                    {selectedFile ? selectedFile.name : "Choose a file to upload"}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {selectedFile?.type
                      ? `File type: ${normalizeFileType(selectedFile.type)}`
                      : "Drag and drop or click to browse"}
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isUploading ? "Processing..." : "Generate study materials"}
                </button>

                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            </div>
          )}

          {viewState === "loading" && (
            <div className="flex min-h-[520px] items-center justify-center rounded-3xl border border-border bg-card p-8 text-center shadow-lg">
              <div className="w-full max-w-md space-y-6">
                <div className="flex justify-center">
                  <div className="relative h-24 w-24">
                    <div className="absolute inset-0 rounded-full border-4 border-muted" />
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">
                    Processing your document
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {processingSteps[processingStep]}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-primary/60" />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>OCR &amp; parsing</span>
                    <span>Concepts &amp; mindmap</span>
                    <span>Study outputs</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewState === "results" && (
            <div
              className="rounded-3xl border border-border bg-card p-8 shadow-lg"
              tabIndex={0}
              onKeyDown={handleSlideKeyDown}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">
                    Study flow
                  </p>
                  <h1 className="text-2xl font-semibold text-foreground">
                    {slides[activeSlideIndex]?.title}
                  </h1>
                  {slides[activeSlideIndex]?.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {slides[activeSlideIndex]?.description}
                    </p>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  Slide {activeSlideIndex + 1} of {slides.length}
                </div>
              </div>

              <div className="relative mt-8 overflow-hidden">
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{
                    transform: `translateX(-${activeSlideIndex * 100}%)`,
                  }}
                >
                  {slides.map((slide, index) => (
                    <div key={slide.id} className="w-full flex-shrink-0 px-2">
                      <div
                        className={`min-h-[380px] rounded-2xl border border-border/60 bg-background p-6 transition-opacity duration-500 ${
                          index === activeSlideIndex
                            ? "opacity-100"
                            : "opacity-0"
                        }`}
                      >
                        {slide.content}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleSlideChange(activeSlideIndex - 1)}
                  disabled={activeSlideIndex === 0}
                  className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/90 px-3 py-2 text-sm font-semibold text-muted-foreground shadow transition hover:text-primary disabled:opacity-40"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => handleSlideChange(activeSlideIndex + 1)}
                  disabled={activeSlideIndex === slides.length - 1}
                  className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/90 px-3 py-2 text-sm font-semibold text-muted-foreground shadow transition hover:text-primary disabled:opacity-40"
                >
                  →
                </button>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => handleSlideChange(index)}
                    className={`h-2.5 w-2.5 rounded-full transition ${
                      index === activeSlideIndex
                        ? "bg-primary"
                        : "bg-muted-foreground/40 hover:bg-primary/60"
                    }`}
                    aria-label={`Go to ${slide.title}`}
                  />
                ))}
              </div>

              {normalizedEntities &&
              Object.values(normalizedEntities).some((items) => items.length > 0) ? (
                <div className="mt-8 rounded-2xl border border-border/60 bg-background p-6">
                  <h2 className="text-lg font-semibold text-foreground">
                    Named entities
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    People, organizations, dates, and locations identified in
                    the document.
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {Object.entries(normalizedEntities).map(([label, items]) =>
                      items.length > 0 ? (
                        <div
                          key={label}
                          className="rounded-xl border border-border/50 bg-muted/20 p-4"
                        >
                          <p className="text-xs uppercase text-muted-foreground">
                            {label}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {items.map((item) => (
                              <span
                                key={`${label}-${item}`}
                                className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Summarize;
