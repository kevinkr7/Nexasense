import { useParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";

const NoteViewer = () => {
  const { id } = useParams();

  // ✅ Mock note data (backend later)
  const note = {
    id,
    title: "Binary Trees — Class Notes",
    subject: "Computer Science",
    summary: [
      "Binary tree is a hierarchical data structure.",
      "Each node has at most two children.",
      "Binary Search Tree maintains sorted order.",
      "Tree traversals include inorder, preorder, postorder.",
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">{note.title}</h1>

        <p className="text-sm text-muted-foreground mb-6">
          Subject: {note.subject}
        </p>

        <div className="bg-card rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Study Summary</h2>

          <ul className="list-disc list-inside space-y-2 text-foreground">
            {note.summary.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NoteViewer;
