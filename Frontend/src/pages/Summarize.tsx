import { useMemo, useState } from "react";
import { Navigation } from "@/components/Navigation";

type SummaryResponse = {
  note?: {
    file_name?: string;
    file_type?: string;
  };
  summary?: string;
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

const Summarize = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [summary, setSummary] = useState("");
  const [noteMeta, setNoteMeta] = useState<SummaryResponse["note"]>(undefined);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const bulletPoints = useMemo(() => buildBulletPoints(summary), [summary]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setSummary("");
    setNoteMeta(undefined);
    setError("");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please choose a file to summarize.");
      return;
    }

    const token = localStorage.getItem("nexasense_token");
    if (!token) {
      setError("Please log in again to upload your file.");
      return;
    }

    setIsUploading(true);
    setError("");

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
        throw new Error("Upload failed. Please try again.");
      }

      const data: SummaryResponse = await response.json();
      setSummary(data.summary ?? "");
      setNoteMeta(data.note);
    } catch (uploadError) {
      console.error(uploadError);
      setError("We could not summarize that file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="flex min-h-[calc(100vh-80px)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-8 shadow-lg">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground">
              Summarize your notes
            </h1>
            <p className="mt-2 text-muted-foreground">
              Upload any file and we&apos;ll generate clear, study-ready notes in
              seconds.
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
                Drag and drop or click to browse
              </span>
            </label>

            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isUploading ? "Summarizing..." : "Generate summary"}
            </button>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          {(summary || bulletPoints.length > 0) && (
            <div className="mt-10 rounded-2xl border border-border/60 bg-background p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Generated notes
                </h2>
                {noteMeta?.file_name && (
                  <span className="text-xs font-medium text-muted-foreground">
                    Source: {noteMeta.file_name}
                  </span>
                )}
              </div>

              <div className="mt-6 space-y-4">
                {bulletPoints.length > 0 ? (
                  <ul className="space-y-3">
                    {bulletPoints.map((point, index) => (
                      <li
                        key={`${point}-${index}`}
                        className="flex items-start gap-3"
                      >
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
                    We generated your summary. If it looks empty, try a clearer
                    document or upload a different file type.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Summarize;
