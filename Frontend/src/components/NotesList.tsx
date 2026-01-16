const notes = [
  {
    id: 1,
    title: "Binary Trees",
    subject: "Data Structures",
    date: "Jan 3, 2026",
  },
  {
    id: 2,
    title: "Operating System Basics",
    subject: "OS",
    date: "Jan 2, 2026",
  },
  {
    id: 3,
    title: "DBMS Normalization",
    subject: "Database",
    date: "Jan 1, 2026",
  },
];

const NotesList = () => {
  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold mb-4">Your Notes</h2>

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
              {note.subject}
            </p>

            <p className="text-xs text-muted-foreground mt-2">
              {note.date}
            </p>

            <button className="mt-4 text-primary text-sm font-medium">
              View Notes →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotesList;