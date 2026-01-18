import { useEffect, useState, type FormEvent } from "react";
import {
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isEmailVerified } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [resetStatus, setResetStatus] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);

  useEffect(() => {
    if (isAuthenticated && isEmailVerified) {
      navigate("/");
    }
  }, [isAuthenticated, isEmailVerified, navigate]);

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

  const handleLogin = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setError("");
    setStatus("");
    setResetStatus("");
    try {
      // 🔐 Firebase login
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const firebaseUser = userCredential.user;
      if (!firebaseUser.emailVerified) {
        await sendEmailVerification(firebaseUser);
        setStatus(
          "Verification email sent. Please verify before logging in."
        );
        return;
      }

      // 🔑 Get Firebase ID token
      const token = await firebaseUser.getIdToken();
      console.log("Firebase ID Token:", token);

      // 💾 Store token
      localStorage.setItem("nexasense_token", token);

      // 🧪 Optional API test
      await callProtectedAPI();

      // 🚀 REDIRECT TO HOME
      navigate("/");
    } catch (err: any) {
      setError("Invalid email or password");
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setStatus("");
    setResetStatus("");
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;
      if (!firebaseUser.emailVerified) {
        await sendEmailVerification(firebaseUser);
        setStatus(
          "Verification email sent. Please verify before logging in."
        );
        return;
      }
      const token = await firebaseUser.getIdToken();
      localStorage.setItem("nexasense_token", token);
      navigate("/");
    } catch (err: any) {
      setError("Google sign-in failed");
    }
  };

  const handlePasswordReset = async () => {
    setError("");
    setStatus("");
    setResetStatus("");
    if (!email) {
      setError("Enter your email to reset your password.");
      return;
    }
    try {
      setIsSendingReset(true);
      await sendPasswordResetEmail(auth, email);
      setResetStatus("Password reset email sent.");
    } catch (err: any) {
      if (err?.code === "auth/invalid-email") {
        setError("Enter a valid email address.");
      } else if (err?.code === "auth/user-not-found") {
        setError("No account found for that email.");
      } else {
        setError("Failed to send reset email. Please try again.");
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleResendVerification = async () => {
    setError("");
    setStatus("");
    setResetStatus("");
    if (!auth.currentUser) {
      setError("Please sign in to resend the verification email.");
      return;
    }
    try {
      setIsSendingVerification(true);
      await sendEmailVerification(auth.currentUser);
      setStatus("Verification email resent. Please check your inbox.");
    } catch (err: any) {
      setError("Unable to resend verification email.");
    } finally {
      setIsSendingVerification(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-accent/10 flex flex-col">
      <Navigation />
      <div className="flex flex-1 items-stretch">
        <div className="hidden md:block md:w-1/2">
          <video
            className="h-full w-full object-cover"
            src="/resources/ambient-study.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
        </div>
        <div className="flex w-full md:w-1/2 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md bg-card/90 backdrop-blur rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-center text-primary mb-2">
              Welcome to NexaSense
            </h2>
            <p className="text-sm text-center text-muted-foreground mb-6">
              Sign in to continue your learning journey.
            </p>

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

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={isSendingReset}
                  className="text-primary hover:underline disabled:opacity-60"
                >
                  Forgot Password?
                </button>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isSendingVerification}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-60"
                >
                  Resend verification
                </button>
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
              {status && (
                <p className="text-sm text-emerald-600 text-center">
                  {status}
                </p>
              )}
              {resetStatus && (
                <p className="text-sm text-emerald-600 text-center">
                  {resetStatus}
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

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="text-primary hover:underline"
              >
                Register
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
