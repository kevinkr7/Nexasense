import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

import { Navigation } from "@/components/Navigation";
import { StudyPackViewer } from "@/components/StudyPackViewer";

const Demo = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState("");

  const callProtectedAPI = async () => {
    const token = localStorage.getItem("nexasense_token");
    console.log("Token from localStorage:", token);

    try {
      const response = await fetch("http://localhost:8000/protected", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("Protected API response:", data);
    } catch (err) {
      console.error("API call failed:", err);
    }
  };

  const handleLogin = async () => {
    setError("");
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const firebaseUser = userCredential.user;

      const token = await firebaseUser.getIdToken();
      console.log("Firebase ID Token:", token);

      localStorage.setItem("nexasense_token", token);

      setUser(firebaseUser);

      await callProtectedAPI();
    } catch (err: any) {
      setError("Invalid email or password");
    }
  };

  if (user) {
    return (
      <>
        <Navigation />
        <StudyPackViewer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-center text-blue-600 mb-6">
          Welcome to NexaSense
        </h2>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full border border-gray-300 rounded-lg px-4 py-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white py-3 rounded-lg"
          >
            Sign In
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Secure login powered by Firebase
        </p>
      </div>
    </div>
  );
};

export default Demo;
