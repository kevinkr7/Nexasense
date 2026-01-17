import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";

type NoteRecord = {
  id: string;
  title: string;
  topic: string;
  fileType: string;
  summary: string;
  createdAt: Date | null;
  status: string;
};

const Notes = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [fileTypeFilter, setFileTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const loadNotes = async () => {
      setIsLoading(true);
      try {
        const notesSnapshot = await getDocs(
          query(
            collection(db, "users", userId, "notes"),
            orderBy("createdAt", "desc")
          )
        );
        const notesData = notesSnapshot.docs.map((docSnap) => {
          const data = docSnap.data() as {
            fileName?: string;
            mostRelevantTopic?: string;
            fileType?: string;
            summary?: string;
            createdAt?: Timestamp;
            status?: string;
          };
          return {
            id: docSnap.id,
            title: data.fileName || "Untitled note",
            topic: data.mostRelevantTopic || "General",
            fileType: data.fileType || "Unknown",
            summary: data.summary || "",
            createdAt: data.createdAt ? data.createdAt.toDate() : null,
            status: data.status || "Processed",
          };
        });
        setNotes(notesData);
      } catch (error) {
        console.error("Failed to load notes", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotes();
  }, [userId]);

  const topics = useMemo(() => {
    const values = new Set(
      notes.map((note) => note.topic).filter((topic) => topic)
    );
    return ["all", ...Array.from(values)];
  }, [notes]);

  const fileTypes = useMemo(() => {
    const values = new Set(
      notes.map((note) => note.fileType).filter((fileType) => fileType)
    );
    return ["all", ...Array.from(values)];
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = notes.filter((note) => {
      const matchesSearch =
        !normalizedSearch ||
        note.title.toLowerCase().includes(normalizedSearch) ||
        note.topic.toLowerCase().includes(normalizedSearch) ||
        note.summary.toLowerCase().includes(normalizedSearch);
      const matchesTopic = topicFilter === "all" || note.topic === topicFilter;
      const matchesFileType =
        fileTypeFilter === "all" || note.fileType === fileTypeFilter;
      return matchesSearch && matchesTopic && matchesFileType;
    });

    const sorted = [...filtered];
    switch (sortBy) {
      case "date_asc":
        sorted.sort(
          (a, b) =>
            (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)
        );
        break;
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "topic":
        sorted.sort((a, b) => a.topic.localeCompare(b.topic));
        break;
      default:
        sorted.sort(
          (a, b) =>
            (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
        );
    }
    return sorted;
  }, [notes, searchTerm, topicFilter, fileTypeFilter, sortBy]);

  const handleDelete = async (noteId: string) => {
    if (!userId) {
      return;
    }
    setIsDeleting(noteId);
    try {
      await deleteDoc(doc(db, "users", userId, "notes", noteId));
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
    } catch (error) {
      console.error("Failed to delete note", error);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        <header>
          <h1 className="text-3xl font-bold text-foreground">
            Notes Uploaded
          </h1>
          <p className="mt-2 text-muted-foreground">
            Search, sort, and manage every study note you have uploaded.
          </p>
        </header>

        <section className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr]">
            <label className="text-sm font-medium text-foreground">
              Search notes
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by keyword, topic, or summary"
                className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-foreground">
              Topic
              <select
                value={topicFilter}
                onChange={(event) => setTopicFilter(event.target.value)}
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {topics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic === "all" ? "All topics" : topic}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-foreground">
              File type
              <select
                value={fileTypeFilter}
                onChange={(event) => setFileTypeFilter(event.target.value)}
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {fileTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === "all" ? "All file types" : type}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-foreground">
              Sort by
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="date_desc">Date (newest)</option>
                <option value="date_asc">Date (oldest)</option>
                <option value="title">Title</option>
                <option value="topic">Topic</option>
              </select>
            </label>
          </div>
        </section>

        <section className="grid gap-4">
          {isLoading ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
              Loading your notes...
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
              No notes match your current filters.
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        {note.title}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {note.topic} • {note.fileType}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {note.createdAt
                          ? `Uploaded ${note.createdAt.toLocaleDateString()}`
                          : "Upload date unknown"}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      {note.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                    {note.summary || "No summary stored yet."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => navigate(`/notes/${note.id}`)}
                    >
                      View note
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/summarize")}
                    >
                      Re-summarize
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleDelete(note.id)}
                      disabled={isDeleting === note.id}
                    >
                      {isDeleting === note.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Notes;
