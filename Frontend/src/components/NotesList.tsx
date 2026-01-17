import { useNavigate } from "react-router-dom";

type NotePreview = {
  id: string;
  title: string;
  topic: string;
  createdAt: Date | null;
};

type NotesListProps = {
  notes: NotePreview[];
};

const NotesList = ({ notes }: NotesListProps) => {
  const navigate = useNavigate();

  const formatDate = (date: Date | null) => {
    if (!date) {
      return "No date recorded";
    }
    return date.toLocaleDateString();
  };

  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold mb-4">Your Notes</h2>

      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
          No notes yet. Upload a file to see summaries here.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {notes.map((note) => (
          <div
            key={note.id}
            className="bg-card p-6 rounded-xl shadow hover:shadow-md transition"
          >
            <h3 className="text-lg font-semibold mb-1">
              {note.title}
            </h3>

            <p className="text-sm text-muted-foreground">
              {note.topic}
            </p>

            <p className="text-xs text-muted-foreground mt-2">
              {formatDate(note.createdAt)}
            </p>

            <button
              type="button"
              onClick={() => navigate(`/notes/${note.id}`)}
              className="mt-4 text-primary text-sm font-medium"
            >
              View Notes →
            </button>
          </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotesList;
