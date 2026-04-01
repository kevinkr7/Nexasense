import { useEffect, useMemo, useRef, useState } from "react";
import { Navigation } from "@/components/Navigation";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  increment,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ExternalLink,
  PlayCircle,
  Wrench,
} from "lucide-react";

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

type VideoResult = {
  id: string;
  title: string;
  url: string;
  channel?: string;
  duration?: string;
  thumbnail?: string;
  description?: string;
  query?: string;
};

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
  videos?: VideoResult[];
};

type SlideItem = {
  id: string;
  title: string;
  description?: string;
  content: JSX.Element;
};

type ResourceCategory = "video" | "reading" | "practical";

type ResourceItem = {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  duration?: string;
  category: ResourceCategory;
  tag?: string;
  badge?: string;
  thumbnail?: string;
  channel?: string;
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

const buildSearchUrl = (baseUrl: string, query: string) =>
  `${baseUrl}${encodeURIComponent(query)}`;

const createVideoRecommendations = (
  topic: string,
  concepts: string[],
  videos: VideoResult[] = []
): ResourceItem[] => {
  if (videos.length > 0) {
    return videos.slice(0, 6).map((video, index) => ({
      id: video.id || `video-${index}`,
      title: video.title,
      description:
        video.description ||
        "Matched YouTube lesson based on the extracted topic and concepts.",
      url: video.url,
      source: video.channel || "YouTube",
      difficulty: index < 2 ? "Beginner" : index < 4 ? "Intermediate" : "Advanced",
      duration: video.duration || "Watch on YouTube",
      category: "video" as const,
      tag: video.query || "Matched video",
      thumbnail: video.thumbnail,
      channel: video.channel || "YouTube",
      badge: index < 3 ? "Top match" : "Live result",
    }));
  }

  const sanitizedTopic = topic || "Study topic";
  const trimmedConcepts = uniqueStrings(concepts).slice(0, 3);
  const videoTemplates = [
    {
      query: `${sanitizedTopic} explained`,
      difficulty: "Beginner" as const,
      duration: "6-12 min",
    },
    {
      query: `${sanitizedTopic} for beginners`,
      difficulty: "Beginner" as const,
      duration: "8-15 min",
    },
    {
      query: `${sanitizedTopic} animation`,
      difficulty: "Intermediate" as const,
      duration: "6-10 min",
    },
    {
      query: `${sanitizedTopic} real world applications`,
      difficulty: "Intermediate" as const,
      duration: "8-14 min",
    },
  ];

  const conceptTemplates = trimmedConcepts.map((concept, index) => ({
    query:
      index === 0
        ? `${concept} detailed explanation`
        : index === 1
          ? `${concept} walkthrough`
          : `${concept} mistakes to avoid`,
    difficulty:
      index === 0
        ? ("Intermediate" as const)
        : index === 1
          ? ("Advanced" as const)
          : ("Intermediate" as const),
    duration: index === 0 ? "10-18 min" : index === 1 ? "12-20 min" : "7-12 min",
  }));

  return [...videoTemplates, ...conceptTemplates]
    .slice(0, 6)
    .map((entry, index) => ({
      id: `video-${index}-${entry.query.toLowerCase().replace(/\s+/g, "-")}`,
      title: entry.query,
      description:
        "Fallback YouTube search focused on clear, instructor-led explanations.",
      url: buildSearchUrl(
        "https://www.youtube.com/results?search_query=",
        entry.query
      ),
      source: "YouTube search",
      difficulty: entry.difficulty,
      duration: entry.duration,
      category: "video" as const,
      tag: "Fallback search",
      channel: "Suggested channels: Khan Academy, CrashCourse, MIT OCW",
    }));
};

const createReadingRecommendations = (
  topic: string,
  concepts: string[]
): ResourceItem[] => {
  const primaryTopic = topic || concepts[0] || "Study topic";
  const readingSources = [
    {
      source: "Britannica",
      description: "Authoritative overview with academic definitions.",
      url: buildSearchUrl("https://www.britannica.com/search?query=", primaryTopic),
    },
    {
      source: "Wikipedia",
      description: "Broad overview and references for deeper reading.",
      url: buildSearchUrl("https://en.wikipedia.org/wiki/Special:Search?search=", primaryTopic),
    },
    {
      source: "Stanford Encyclopedia of Philosophy",
      description: "Scholarly essays and expert-authored context.",
      url: buildSearchUrl(
        "https://plato.stanford.edu/search/searcher.py?query=",
        primaryTopic
      ),
    },
    {
      source: "MIT OpenCourseWare",
      description: "Lecture notes and academic course materials.",
      url: buildSearchUrl("https://ocw.mit.edu/search/?q=", primaryTopic),
    },
  ];

  return readingSources.slice(0, 4).map((entry, index) => ({
    id: `reading-${index}-${entry.source.toLowerCase().replace(/\s+/g, "-")}`,
    title: `${entry.source} overview`,
    description: entry.description,
    url: entry.url,
    source: entry.source,
    difficulty: "Intermediate",
    category: "reading" as const,
    tag: "Authoritative reading",
  }));
};

const createPracticalRecommendations = (
  topic: string,
  concepts: string[]
): ResourceItem[] => {
  const primaryConcept = concepts[0] || topic || "Study topic";
  const practicalSources = [
    {
      source: "GeeksforGeeks",
      description: "Worked examples and coding-focused explanations.",
      url: buildSearchUrl("https://www.geeksforgeeks.org/?s=", primaryConcept),
    },
    {
      source: "TutorialsPoint",
      description: "Step-by-step tutorials and quick reference guides.",
      url: buildSearchUrl("https://www.tutorialspoint.com/search?search=", primaryConcept),
    },
    {
      source: "MIT OpenCourseWare — Assignments",
      description: "Practice sets and problem-focused learning.",
      url: buildSearchUrl("https://ocw.mit.edu/search/?q=", `${primaryConcept} problem set`),
    },
    {
      source: "Wolfram MathWorld",
      description: "Worked problems and applied mathematics context.",
      url: buildSearchUrl("https://mathworld.wolfram.com/search/?query=", primaryConcept),
    },
  ];

  return practicalSources.slice(0, 4).map((entry, index) => ({
    id: `practical-${index}-${entry.source.toLowerCase().replace(/\s+/g, "-")}`,
    title: `${primaryConcept} practice on ${entry.source}`,
    description: entry.description,
    url: entry.url,
    source: entry.source,
    difficulty: "Intermediate",
    category: "practical" as const,
    badge: "Practice-focused",
    tag: primaryConcept,
  }));
};

const uniqueStrings = (values: string[]) => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
};

const normalizeConceptLabel = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .replace(/[_-]/g, " ")
    .replace(/[^\w\s/&(),.-]/g, "")
    .trim();

const isRelevantConcept = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (normalized.length < 3) {
    return false;
  }
  const blocked = new Set([
    "thing",
    "things",
    "example",
    "examples",
    "data",
    "result",
    "results",
    "note",
    "notes",
    "content",
    "text",
    "summary",
  ]);
  return !blocked.has(normalized);
};

const Summarize = () => {
  const { user, userId } = useAuth();
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
  const [videos, setVideos] = useState<VideoResult[]>([]);
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
  const [revealedConceptCount, setRevealedConceptCount] = useState(4);
  const [viewState, setViewState] = useState<"upload" | "loading" | "results">(
    "upload"
  );
  const [processingStep, setProcessingStep] = useState(0);
  const [expandedResourceId, setExpandedResourceId] = useState<string | null>(
    null
  );

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
    const normalized = mindmap.nodes
      .filter(
        (node) => node.id.startsWith("node_") && node.id.split("_").length === 2
      )
      .map((node) => ({
        id: node.id,
        label: normalizeConceptLabel(node.label),
      }))
      .filter((node) => isRelevantConcept(node.label));

    const seen = new Set<string>();
    return normalized.filter((node) => {
      const key = node.label.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [mindmap]);

  const visibleConceptNodes = useMemo(
    () => conceptNodes.slice(0, Math.max(1, revealedConceptCount)),
    [conceptNodes, revealedConceptCount]
  );

  const resourceRecommendations = useMemo(() => {
    const topic = mostRelevantWord || summary.split(" ").slice(0, 4).join(" ");
    const concepts = uniqueStrings(conceptNodes.map((node) => node.label)).slice(
      0,
      5
    );
    return {
      videos: createVideoRecommendations(topic, concepts, videos),
      readings: createReadingRecommendations(topic, concepts),
      practical: createPracticalRecommendations(topic, concepts),
    };
  }, [mostRelevantWord, conceptNodes, summary, videos]);

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
    setVideos([]);
    setError("");
    setActiveConcept("");
    setActiveSlideIndex(2);
    setRevealedConceptCount(4);
    setViewState("upload");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please choose a file to summarize.");
      return;
    }

    if (!user || !userId) {
      setError("Please log in again to upload your file.");
      return;
    }

    const token = await user.getIdToken();
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
      setVideos(data.videos ?? []);
      setActiveConcept("");
      setActiveSlideIndex(2);
      setRevealedConceptCount(4);
      setViewState("results");

      await addDoc(collection(db, "users", userId, "notes"), {
        fileName: data.note?.fileName || selectedFile.name,
        fileType: data.note?.fileType || selectedFile.type,
        mostRelevantTopic:
          data.note?.mostRelevantTopic || data.mostRelevantWord || "",
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

  const handleResourceClick = async (resource: ResourceItem) => {
    if (!userId) {
      return;
    }
    try {
      await setDoc(
        doc(db, "users", userId, "progress", "resourcesViewed"),
        {
          items: arrayUnion({
            id: resource.id,
            title: resource.title,
            source: resource.source,
            url: resource.url,
            category: resource.category,
            clickedAt: serverTimestamp(),
          }),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Failed to track resource view", error);
    }
  };

  const renderResourceCard = (
    resource: ResourceItem,
    icon: JSX.Element,
    showThumbnail = false
  ) => {
    const isExpanded = expandedResourceId === resource.id;
    return (
      <div
        key={resource.id}
        className="group rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {showThumbnail ? (
              resource.thumbnail ? (
                <div className="relative h-16 w-24 overflow-hidden rounded-xl border border-border/50">
                  <img
                    src={resource.thumbnail}
                    alt={resource.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <PlayCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
              ) : (
                <div className="flex h-16 w-24 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent text-primary">
                  <PlayCircle className="h-6 w-6" />
                </div>
              )
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/60 text-primary">
                {icon}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">
                {resource.title}
              </p>
              <p className="text-xs text-muted-foreground">{resource.source}</p>
              {resource.channel && resource.channel !== resource.source && (
                <p className="text-[11px] text-muted-foreground/80">
                  Channel: {resource.channel}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                  {resource.difficulty}
                </span>
                {resource.duration && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                    {resource.duration}
                  </span>
                )}
                {resource.badge && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600">
                    {resource.badge}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setExpandedResourceId((prev) =>
                prev === resource.id ? null : resource.id
              )
            }
            className="text-xs font-semibold text-primary hover:underline"
            aria-expanded={isExpanded}
          >
            {isExpanded ? "Hide" : "Details"}
          </button>
        </div>
        {isExpanded && (
          <div className="mt-3 space-y-3 text-xs text-muted-foreground">
            <p>{resource.description}</p>
            {resource.tag && (
              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {resource.tag}
              </span>
            )}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span className="uppercase tracking-wide">
            {resource.category}
          </span>
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => handleResourceClick(resource)}
            className="inline-flex items-center gap-1 rounded-full border border-border/70 px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary/60 hover:text-primary"
          >
            Open
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
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
      description:
        "Interactive map: click root to reveal child concepts and click any concept to expand evidence.",
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
              {visibleConceptNodes.map((concept, index) => {
                const angle =
                  (index / Math.max(visibleConceptNodes.length, 1)) *
                  Math.PI *
                  2;
                const radius = 140;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                const relatedEvidence = evidenceMap[concept.label] ?? [];
                const isActive = activeConcept === concept.label;

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
                      className={`stroke-primary transition ${
                        isActive
                          ? "fill-primary/40"
                          : "fill-primary/20 group-hover:fill-primary/30"
                      }`}
                      onClick={() =>
                        setActiveConcept((prev) =>
                          prev === concept.label ? "" : concept.label
                        )
                      }
                      style={{ cursor: "pointer" }}
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
                    {isActive && relatedEvidence.slice(0, 3).map((sentence, i) => {
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
                onClick={() =>
                  setRevealedConceptCount((prev) =>
                    Math.min(conceptNodes.length, prev + 1)
                  )
                }
                style={{ cursor: "pointer" }}
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
            Tip: scroll to zoom, drag to pan, click root to reveal next child,
            and click a concept to expand evidence.
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
      id: "resources",
      title: "Recommended learning resources",
      description:
        "Curated next steps based on your topic and key concepts.",
      content: (
        <div className="mt-6 space-y-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold text-foreground">
                  🎥 Video Explanations
                </h3>
              </div>
              <span className="text-xs text-muted-foreground">
                {videos.length > 0 ? "Direct YouTube matches" : "Curated fallback searches"}
              </span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {resourceRecommendations.videos.map((resource) =>
                renderResourceCard(resource, <PlayCircle className="h-5 w-5" />, true)
              )}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold text-foreground">
                  📘 Authoritative Reading
                </h3>
              </div>
              <span className="text-xs text-muted-foreground">
                Trusted academic sources
              </span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {resourceRecommendations.readings.map((resource) =>
                renderResourceCard(resource, <BookOpen className="h-5 w-5" />)
              )}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold text-foreground">
                  💻 Practical / Applied Learning
                </h3>
              </div>
              <span className="text-xs text-muted-foreground">
                Practice-focused resources
              </span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {resourceRecommendations.practical.map((resource) =>
                renderResourceCard(resource, <Wrench className="h-5 w-5" />)
              )}
            </div>
          </section>
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

  useEffect(() => {
    if (viewState !== "results") {
      return;
    }

    const listener = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveSlideIndex((prev) => Math.min(slides.length - 1, prev + 1));
      }
    };

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [viewState, slides.length]);

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

              <div className="relative mt-8">
                <div className="px-2">
                  <div
                    key={slides[activeSlideIndex]?.id}
                    className="rounded-2xl border border-border/60 bg-background p-6 transition-all duration-300 ease-out animate-in fade-in-0 zoom-in-[0.98]"
                  >
                    {slides[activeSlideIndex]?.content}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSlideChange(activeSlideIndex - 1)}
                  disabled={activeSlideIndex === 0}
                  className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full border border-primary/20 bg-background/95 p-2 text-primary shadow-md transition hover:scale-105 hover:border-primary/50 hover:bg-primary/5 disabled:opacity-35"
                  aria-label="Previous slide"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSlideChange(activeSlideIndex + 1)}
                  disabled={activeSlideIndex === slides.length - 1}
                  className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full border border-primary/20 bg-background/95 p-2 text-primary shadow-md transition hover:scale-105 hover:border-primary/50 hover:bg-primary/5 disabled:opacity-35"
                  aria-label="Next slide"
                >
                  <ArrowRight className="h-4 w-4" />
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
                        ? "bg-primary shadow-[0_0_0_4px_rgba(59,130,246,0.15)]"
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
