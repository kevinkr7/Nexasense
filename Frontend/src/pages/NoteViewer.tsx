import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/firebase";

const NoteViewer = () => {
  const { id } = useParams();
  const { userId } = useAuth();
  const [note, setNote] = useState<{
    title: string;
    topic: string;
    summary: string;
    createdAt: Date | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId || !id) {
      return;
    }

    const loadNote = async () => {
      setIsLoading(true);
      try {
        const noteRef = doc(db, "users", userId, "notes", id);
        const noteSnapshot = await getDoc(noteRef);
        if (noteSnapshot.exists()) {
          const data = noteSnapshot.data() as {
            fileName?: string;
            mostRelevantTopic?: string;
            summary?: string;
            createdAt?: Timestamp;
          };
          setNote({
            title: data.fileName || "Untitled note",
            topic: data.mostRelevantTopic || "General",
            summary: data.summary || "",
            createdAt: data.createdAt ? data.createdAt.toDate() : null,
          });
        } else {
          setNote(null);
        }
      } catch (error) {
        console.error("Failed to load note", error);
        setNote(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadNote();
  }, [userId, id]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">
          {isLoading ? "Loading note..." : note?.title || "Note not found"}
        </h1>

        <p className="text-sm text-muted-foreground mb-6">
          {note
            ? `Topic: ${note.topic} • ${note.createdAt?.toLocaleDateString() ?? "No date"}`
            : "We couldn't locate this note."}
        </p>

        <div className="bg-card rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Study Summary</h2>

          {note?.summary ? (
            <p className="whitespace-pre-line text-foreground">
              {note.summary}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No summary available for this note yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteViewer;
