import { useEffect, useMemo, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase";

type NoteRecord = {
  topic: string;
  createdAt: Date | null;
};

type ProgressEntry = {
  createdAt: Date | null;
  completion: number;
  accuracy?: number;
  testScore?: number;
};

const Progress = () => {
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  const [progressStats, setProgressStats] = useState<{
    totalSummaries: number;
    notesUploaded: number;
    level?: string;
    rank?: string;
  } | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const loadProgress = async () => {
      setIsLoading(true);
      try {
        const [notesSnapshot, progressStatsSnapshot, progressEntriesSnapshot] =
          await Promise.all([
            getDocs(
              query(
                collection(db, "users", userId, "notes"),
                orderBy("createdAt", "desc")
              )
            ),
            getDoc(doc(db, "users", userId, "progress", "stats")),
            getDocs(collection(db, "users", userId, "progress")),
          ]);

        const notesData = notesSnapshot.docs.map((docSnap) => {
          const data = docSnap.data() as {
            mostRelevantTopic?: string;
            createdAt?: Timestamp;
          };
          return {
            topic: data.mostRelevantTopic || "General",
            createdAt: data.createdAt ? data.createdAt.toDate() : null,
          };
        });
        setNotes(notesData);

        if (progressStatsSnapshot.exists()) {
          const stats = progressStatsSnapshot.data();
          setProgressStats({
            totalSummaries: Number(stats.totalSummaries || 0),
            notesUploaded: Number(stats.notesUploaded || 0),
            level: stats.level ? String(stats.level) : undefined,
            rank: stats.rank ? String(stats.rank) : undefined,
          });
        } else {
          setProgressStats({
            totalSummaries: 0,
            notesUploaded: 0,
          });
        }

        const entries = progressEntriesSnapshot.docs
          .filter((docSnap) => docSnap.id !== "stats")
          .map((docSnap) => {
            const data = docSnap.data() as {
              createdAt?: Timestamp;
              completion?: number;
              accuracy?: number;
              testScore?: number;
            };
            return {
              createdAt: data.createdAt ? data.createdAt.toDate() : null,
              completion: Number(data.completion ?? 0),
              accuracy:
                data.accuracy !== undefined ? Number(data.accuracy) : undefined,
              testScore:
                data.testScore !== undefined ? Number(data.testScore) : undefined,
            };
          })
          .sort(
            (a, b) =>
              (a.createdAt?.getTime() ?? 0) -
              (b.createdAt?.getTime() ?? 0)
          );
        setProgressEntries(entries);
      } catch (error) {
        console.error("Failed to load progress data", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [userId]);

  const topicsCovered = useMemo(() => {
    const uniqueTopics = new Set(
      notes.map((note) => note.topic).filter((topic) => topic)
    );
    return uniqueTopics.size;
  }, [notes]);

  const topicBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    notes.forEach((note) => {
      counts.set(note.topic, (counts.get(note.topic) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([topic, count]) => ({
      topic,
      count,
    }));
  }, [notes]);

  const progressTimeline = useMemo(() => {
    if (progressEntries.length > 0) {
      return progressEntries.map((entry) => ({
        label: entry.createdAt?.toLocaleDateString() ?? "",
        value: entry.completion,
        accuracy: entry.accuracy ?? null,
      }));
    }

    const sortedNotes = [...notes]
      .filter((note) => note.createdAt)
      .sort(
        (a, b) =>
          (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)
      );
    return sortedNotes.map((note, index) => ({
      label: note.createdAt?.toLocaleDateString() ?? "",
      value: index + 1,
      accuracy: null,
    }));
  }, [progressEntries, notes]);

  const latestTestScore = useMemo(() => {
    const scores = progressEntries
      .map((entry) => entry.testScore)
      .filter((score): score is number => score !== undefined);
    return scores.length > 0 ? scores[scores.length - 1] : null;
  }, [progressEntries]);

  const latestAccuracy = useMemo(() => {
    const accuracies = progressEntries
      .map((entry) => entry.accuracy)
      .filter((accuracy): accuracy is number => accuracy !== undefined);
    return accuracies.length > 0 ? accuracies[accuracies.length - 1] : null;
  }, [progressEntries]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Progress</h1>
          <p className="mt-2 text-muted-foreground">
            Review your learning analytics, topic coverage, and improvement
            trends.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <p className="text-xs uppercase text-muted-foreground">
              Notes processed
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {isLoading ? "—" : progressStats?.notesUploaded ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <p className="text-xs uppercase text-muted-foreground">
              Topics covered
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {isLoading ? "—" : topicsCovered}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <p className="text-xs uppercase text-muted-foreground">
              Summaries generated
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {isLoading ? "—" : progressStats?.totalSummaries ?? 0}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Progress trend
              </h2>
              <div className="text-xs text-muted-foreground">
                {progressStats?.level
                  ? `Level ${progressStats.level}`
                  : "Level not set"}
                {progressStats?.rank ? ` • Rank ${progressStats.rank}` : ""}
              </div>
            </div>
            <div className="mt-4 h-[260px]">
              {progressTimeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Upload notes to build a progress timeline.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressTimeline}>
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      name="Progress"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">
              Performance signals
            </h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs uppercase text-muted-foreground">
                  Latest test score
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {latestTestScore !== null ? `${latestTestScore}%` : "N/A"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pulls from progress entries when available.
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs uppercase text-muted-foreground">
                  Accuracy trend
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {latestAccuracy !== null ? `${latestAccuracy}%` : "N/A"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Based on recorded accuracy metrics.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Topics breakdown
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            See where you are spending most of your learning time.
          </p>
          <div className="mt-4 h-[260px]">
            {topicBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No topics recorded yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topicBreakdown}>
                  <XAxis dataKey="topic" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Progress;
