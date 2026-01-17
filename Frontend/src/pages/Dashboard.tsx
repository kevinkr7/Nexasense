import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import ProgressChart from "@/components/ProgressChart";
import NotesList from "@/components/NotesList";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase";

const Dashboard = () => {
  const navigate = useNavigate();
  const { userId, userEmail } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [notesCount, setNotesCount] = useState(0);
  const [lastUploaded, setLastUploaded] = useState<Date | null>(null);
  const [topicsLearned, setTopicsLearned] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressLevel, setProgressLevel] = useState<string | null>(null);
  const [progressRank, setProgressRank] = useState<string | null>(null);
  const [notePreviews, setNotePreviews] = useState<
    { id: string; title: string; topic: string; createdAt: Date | null }[]
  >([]);
  const [chartData, setChartData] = useState<
    { label: string; value: number }[]
  >([]);

  useEffect(() => {
    if (!userId) {
      setNotesCount(0);
      setLastUploaded(null);
      setTopicsLearned(0);
      setProgressPercent(0);
      setProgressLevel(null);
      setProgressRank(null);
      setNotePreviews([]);
      setChartData([]);
      setIsLoading(false);
      return;
    }

    const loadDashboard = async () => {
      setIsLoading(true);
      try {
        const notesRef = collection(db, "users", userId, "notes");
        const notesSnapshot = await getDocs(
          query(notesRef, orderBy("createdAt", "desc"))
        );
        const notesData = notesSnapshot.docs.map((docSnap) => {
          const data = docSnap.data() as {
            fileName?: string;
            mostRelevantTopic?: string;
            createdAt?: Timestamp;
          };
          return {
            id: docSnap.id,
            title: data.fileName || "Untitled note",
            topic: data.mostRelevantTopic || "General",
            createdAt: data.createdAt ? data.createdAt.toDate() : null,
          };
        });

        const notesCountSnapshot = await getCountFromServer(notesRef);
        const latestNote = notesData[0];
        setNotesCount(notesCountSnapshot.data().count);
        setLastUploaded(latestNote?.createdAt ?? null);

        const uniqueTopics = new Set(
          notesData
            .map((note) => note.topic)
            .filter((topic) => topic && topic !== "General")
        );
        setTopicsLearned(uniqueTopics.size);

        setNotePreviews(notesData.slice(0, 5));

        const progressStatsRef = doc(
          db,
          "users",
          userId,
          "progress",
          "stats"
        );
        const progressStatsSnapshot = await getDoc(progressStatsRef);
        if (progressStatsSnapshot.exists()) {
          const stats = progressStatsSnapshot.data();
          setProgressPercent(
            Number(stats.completionPercent ?? stats.completion ?? 0)
          );
          setProgressLevel(stats.level ? String(stats.level) : null);
          setProgressRank(stats.rank ? String(stats.rank) : null);
        } else {
          setProgressPercent(0);
          setProgressLevel(null);
          setProgressRank(null);
        }

        const progressEntriesSnapshot = await getDocs(
          collection(db, "users", userId, "progress")
        );
        const progressEntries = progressEntriesSnapshot.docs
          .filter((docSnap) => docSnap.id !== "stats")
          .map((docSnap) => {
            const data = docSnap.data() as {
              completion?: number;
              createdAt?: Timestamp;
            };
            return {
              completion: Number(data.completion ?? 0),
              createdAt: data.createdAt ? data.createdAt.toDate() : null,
            };
          })
          .filter((entry) => entry.createdAt !== null)
          .sort(
            (a, b) =>
              (a.createdAt?.getTime() ?? 0) -
              (b.createdAt?.getTime() ?? 0)
          );

        if (progressEntries.length > 0) {
          setChartData(
            progressEntries.map((entry) => ({
              label: entry.createdAt?.toLocaleDateString() ?? "",
              value: entry.completion,
            }))
          );
        } else {
          const notesChronological = [...notesData]
            .filter((note) => note.createdAt)
            .sort(
              (a, b) =>
                (a.createdAt?.getTime() ?? 0) -
                (b.createdAt?.getTime() ?? 0)
            );
          setChartData(
            notesChronological.map((note, index) => ({
              label: note.createdAt?.toLocaleDateString() ?? "",
              value: index + 1,
            }))
          );
        }
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [userId]);

  const lastUploadedLabel = useMemo(() => {
    if (!lastUploaded) {
      return "No uploads yet";
    }
    return lastUploaded.toLocaleDateString();
  }, [lastUploaded]);

  return (
    <div className="min-h-screen bg-background">
      {/* NAVBAR */}
      <Navigation />

      <div className="max-w-6xl mx-auto p-6">
        {/* TITLE */}
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>

        {/* PROFILE WELCOME */}
        <p className="text-muted-foreground mb-6">
          {isLoading
            ? "Loading profile..."
            : `Welcome ${userEmail ?? "back"}`}
        </p>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Notes Uploaded */}
          <button
            type="button"
            onClick={() => navigate("/notes")}
            className="bg-card p-6 rounded-xl shadow text-left transition hover:shadow-md"
          >
            📘 <b>Notes Uploaded</b>
            <p className="text-2xl font-bold mt-2">
              {isLoading ? "—" : notesCount}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Last upload: {isLoading ? "Loading..." : lastUploadedLabel}
            </p>
          </button>

          {/* Topics Learned */}
          <button
            type="button"
            onClick={() => navigate("/notes")}
            className="bg-card p-6 rounded-xl shadow text-left transition hover:shadow-md"
          >
            🧠 <b>Topics Learned</b>
            <p className="text-2xl font-bold mt-2">
              {isLoading ? "—" : topicsLearned}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Unique topics from your notes
            </p>
          </button>

          {/* Progress */}
          <button
            type="button"
            onClick={() => navigate("/progress")}
            className="bg-card p-6 rounded-xl shadow text-left transition hover:shadow-md"
          >
            📊 <b>Progress</b>
            <p className="text-2xl font-bold mt-2">
              {isLoading ? "—" : `${progressPercent}%`}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {progressLevel ? `Level ${progressLevel}` : "Keep learning"}
              {progressRank ? ` • Rank ${progressRank}` : ""}
            </p>
          </button>
        </div>

        {/* PROGRESS CHART */}
        <div className="mt-8">
          <ProgressChart
            data={chartData}
            valueLabel="Progress"
            title="Learning Progress"
          />
        </div>

        {/* NOTES LIST */}
        <NotesList notes={notePreviews} />
      </div>
    </div>
  );
};

export default Dashboard;
