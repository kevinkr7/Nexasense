import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/context/AuthContext";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/firebase";

type RewardRecord = {
  id: string;
  title: string;
  description: string;
  earnedAt: Date | null;
  status: "locked" | "unlocked";
  streakCount?: number;
};

const Rewards = () => {
  const { userId } = useAuth();
  const [rewards, setRewards] = useState<RewardRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const loadRewards = async () => {
      setIsLoading(true);
      try {
        const rewardsSnapshot = await getDocs(
          collection(db, "users", userId, "rewards")
        );
        const rewardsData = rewardsSnapshot.docs.map((docSnap) => {
          const data = docSnap.data() as {
            title?: string;
            description?: string;
            earnedAt?: Timestamp;
            unlocked?: boolean;
            streakCount?: number;
          };
          return {
            id: docSnap.id,
            title: data.title || "Reward",
            description: data.description || "No description provided.",
            earnedAt: data.earnedAt ? data.earnedAt.toDate() : null,
            status: data.unlocked ? "unlocked" : "locked",
            streakCount: data.streakCount,
          } as RewardRecord;
        });
        setRewards(rewardsData);
      } catch (error) {
        console.error("Failed to load rewards", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRewards();
  }, [userId]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Rewards</h1>
          <p className="mt-2 text-muted-foreground">
            Celebrate milestones and stay motivated with your earned badges.
          </p>
        </header>

        {isLoading ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
            Loading rewards...
          </div>
        ) : rewards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
            No rewards unlocked yet. Keep learning to earn badges and streaks.
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className={`rounded-2xl border p-5 shadow-sm ${
                  reward.status === "unlocked"
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-border/60 bg-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">
                    {reward.title}
                  </h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      reward.status === "unlocked"
                        ? "bg-emerald-500/10 text-emerald-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {reward.status === "unlocked" ? "Unlocked" : "Locked"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {reward.description}
                </p>
                <div className="mt-4 text-xs text-muted-foreground">
                  {reward.earnedAt
                    ? `Earned on ${reward.earnedAt.toLocaleDateString()}`
                    : "Not earned yet"}
                </div>
                {reward.streakCount !== undefined && (
                  <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    Streak: {reward.streakCount} days
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
};

export default Rewards;
