import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  GoogleAuthProvider,
  confirmPasswordReset,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/context/AuthContext";
import { AuthVideo } from "@/components/AuthVideo";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, isEmailVerified } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [view, setView] = useState<"login" | "reset" | "new" | "success">(
    "login"
  );

  const resetCode = useMemo(() => {
    const mode = searchParams.get("mode");
    const code = searchParams.get("oobCode");
    return mode === "resetPassword" && code ? code : null;
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated && isEmailVerified) {
      navigate("/");
    }
  }, [isAuthenticated, isEmailVerified, navigate]);

  useEffect(() => {
    if (resetCode) {
      setError("");
      setView("new");
    }
  }, [resetCode]);

  // 🔒 OPTIONAL: protected API test (frontend only)
  const callProtectedAPI = async (token: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/protected`, {
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

  const handleLogin = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setError("");
    try {
      // 🔐 Firebase login
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const firebaseUser = userCredential.user;
      if (!firebaseUser.emailVerified) {
        setError("Please verify your email before logging in.");
        return;
      }

      // 🔑 Get Firebase ID token
      const token = await firebaseUser.getIdToken();
      console.log("Firebase ID Token:", token);

      // 🧪 Optional API test
      await callProtectedAPI(token);

      // 🚀 REDIRECT TO HOME
      navigate("/");
    } catch (err: any) {
      setError("Invalid email or password");
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;
      if (!firebaseUser.emailVerified) {
        setError("Please verify your email before logging in.");
        return;
      }
      const token = await firebaseUser.getIdToken();
      await callProtectedAPI(token);
      navigate("/");
    } catch (err: any) {
      setError("Google sign-in failed");
    }
  };

  const handlePasswordReset = async () => {
    setError("");
    if (!resetEmail) {
      setError("Enter your email address.");
      return;
    }
    try {
      setIsBusy(true);
      await sendPasswordResetEmail(auth, resetEmail);
    } catch (err: any) {
      if (err?.code === "auth/invalid-email") {
        setError("Enter a valid email address.");
      } else if (err?.code === "auth/user-not-found") {
        setError("No account found for that email.");
      } else {
        setError("Failed to send reset email. Please try again.");
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleSetNewPassword = async () => {
    if (!resetCode) {
      setError("Reset link is missing or expired.");
      return;
    }
    setError("");
    try {
      setIsBusy(true);
      await confirmPasswordReset(auth, resetCode, resetPassword);
      setView("success");
      setTimeout(() => {
        setView("login");
        setResetPassword("");
        setResetEmail("");
        setSearchParams({});
      }, 1500);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-accent/10 flex flex-col">
      <Navigation />
      <div className="flex flex-1 items-stretch">
        <div className="hidden md:block md:w-1/2">
          <AuthVideo />
        </div>
        <div className="flex w-full md:w-1/2 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md bg-card/90 backdrop-blur rounded-2xl shadow-xl p-8 transition-opacity duration-300">
            {view === "login" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-2xl font-bold text-center text-primary mb-2">
                    Welcome to NexaSense
                  </h2>
                  <p className="text-sm text-center text-muted-foreground">
                    Sign in to continue your learning journey.
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleLogin}>
                  <input
                    type="email"
                    placeholder="Email"
                    className="w-full border border-input rounded-lg px-4 py-3 bg-background text-foreground placeholder:text-muted-foreground caret-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  <input
                    type="password"
                    placeholder="Password"
                    className="w-full border border-input rounded-lg px-4 py-3 bg-background text-foreground placeholder:text-muted-foreground caret-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />

                  {error && (
                    <p className="text-sm text-destructive text-center">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition duration-200"
                  >
                    Sign In
                  </button>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full border border-input text-foreground font-semibold py-3 rounded-lg transition duration-200 hover:bg-muted"
                  >
                    Continue with Google
                  </button>
                </form>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setView("reset");
                    }}
                    className="text-primary hover:underline"
                  >
                    Forgot Password?
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/register")}
                    className="text-primary hover:underline"
                  >
                    Register
                  </button>
                </div>
              </div>
            )}

            {view === "reset" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-2xl font-bold text-center text-primary mb-2">
                    Verify your account
                  </h2>
                  <p className="text-sm text-center text-muted-foreground">
                    We'll send a secure reset link to your email.
                  </p>
                </div>

                <div className="space-y-4">
                  <input
                    type="email"
                    placeholder="Email"
                    className="w-full border border-input rounded-lg px-4 py-3 bg-background text-foreground placeholder:text-muted-foreground caret-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />

                  {error && (
                    <p className="text-sm text-destructive text-center">
                      {error}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={isBusy}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-70"
                  >
                    {isBusy ? "Sending..." : "Send reset link"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                >
                  Back to sign in
                </button>
              </div>
            )}

            {view === "new" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-2xl font-bold text-center text-primary mb-2">
                    Set a new password
                  </h2>
                  <p className="text-sm text-center text-muted-foreground">
                    Choose a secure password to continue.
                  </p>
                </div>

                <div className="space-y-4">
                  <input
                    type="password"
                    placeholder="New password"
                    className="w-full border border-input rounded-lg px-4 py-3 bg-background text-foreground placeholder:text-muted-foreground caret-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                  />

                  {error && (
                    <p className="text-sm text-destructive text-center">
                      {error}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleSetNewPassword}
                    disabled={isBusy}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-70"
                  >
                    {isBusy ? "Updating..." : "Update password"}
                  </button>
                </div>
              </div>
            )}

            {view === "success" && (
              <div className="space-y-4 text-center animate-in fade-in duration-300">
                <h2 className="text-2xl font-bold text-primary">
                  Password updated
                </h2>
                <p className="text-sm text-muted-foreground">
                  Returning you to sign in.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
