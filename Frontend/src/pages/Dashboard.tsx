import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import ProgressChart from "@/components/ProgressChart";
import NotesList from "@/components/NotesList";

const Dashboard = () => {
  // 🔹 Profile data from backend
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Mock stats (will be replaced later by backend)
  const stats = {
    notesUploaded: 3,
    topicsLearned: 8,
    progress: 45,
  };

  // 🔹 Fetch profile from backend
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("nexasense_token");

      try {
        const response = await fetch("http://localhost:8000/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        setProfile(data);
      } catch (error) {
        console.error("Failed to fetch profile", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* NAVBAR */}
      <Navigation />

      <div className="max-w-6xl mx-auto p-6">
        {/* TITLE */}
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>

        {/* PROFILE WELCOME */}
        <p className="text-muted-foreground mb-6">
          {loading
            ? "Loading profile..."
            : `Welcome ${profile?.email}`}
        </p>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Notes Uploaded */}
          <div className="bg-card p-6 rounded-xl shadow">
            📘 <b>Notes Uploaded</b>
            <p className="text-2xl font-bold mt-2">
              {stats.notesUploaded}
            </p>
          </div>

          {/* Topics Learned */}
          <div className="bg-card p-6 rounded-xl shadow">
            🧠 <b>Topics Learned</b>
            <p className="text-2xl font-bold mt-2">
              {stats.topicsLearned}
            </p>
          </div>

          {/* Progress */}
          <div className="bg-card p-6 rounded-xl shadow">
            📊 <b>Progress</b>
            <p className="text-2xl font-bold mt-2">
              {stats.progress}%
            </p>
          </div>
        </div>

        {/* PROGRESS CHART */}
        <div className="mt-8">
          <ProgressChart />
        </div>

        {/* NOTES LIST */}
        <NotesList />
      </div>
    </div>
  );
};

export default Dashboard;