import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

const Demo = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // 🔒 OPTIONAL: protected API test (frontend only)
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
      console.warn("API not running (expected for frontend-only work)");
    }
  };

  const handleLogin = async () => {
    setError("");
    try {
      // 🔐 Firebase login
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const firebaseUser = userCredential.user;

      // 🔑 Get Firebase ID token
      const token = await firebaseUser.getIdToken();
      console.log("Firebase ID Token:", token);

      // 💾 Store token
      localStorage.setItem("nexasense_token", token);

      // 🧪 Optional API test
      await callProtectedAPI();

      // 🚀 REDIRECT TO DASHBOARD
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-accent/10 flex items-center justify-center">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-center text-primary mb-6">
          Welcome to NexaSense
        </h2>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full border border-input rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full border border-input rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <button
            onClick={handleLogin}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition duration-200"
          >
            Sign In
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Secure login powered by Firebase
        </p>
      </div>
    </div>
  );
};

export default Demo;