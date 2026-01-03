import { Navigation } from "@/components/Navigation";
import ProgressChart from "@/components/ProgressChart";

const Dashboard = () => {
  // ✅ Mock stats (temporary – backend will replace later)
  const stats = {
    notesUploaded: 3,
    topicsLearned: 8,
    progress: 45,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>

        <p className="text-gray-600 mb-6">
          Welcome to NexaSense. Your learning journey starts here.
        </p>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Notes Uploaded */}
          <div className="bg-white p-6 rounded-xl shadow">
            📘 <b>Notes Uploaded</b>
            <p className="text-2xl font-bold mt-2">
              {stats.notesUploaded}
            </p>
          </div>

          {/* Topics Learned */}
          <div className="bg-white p-6 rounded-xl shadow">
            🧠 <b>Topics Learned</b>
            <p className="text-2xl font-bold mt-2">
              {stats.topicsLearned}
            </p>
          </div>

          {/* Progress */}
          <div className="bg-white p-6 rounded-xl shadow">
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
      </div>
    </div>
  );
};

export default Dashboard;
