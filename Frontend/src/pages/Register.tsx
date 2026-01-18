import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/context/AuthContext";

const Register = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isEmailVerified } = useAuth();
  const [name, setName] = useState("");
  const [displayUsername, setDisplayUsername] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isSendingVerification, setIsSendingVerification] = useState(false);

  useEffect(() => {
    if (isAuthenticated && isEmailVerified) {
      navigate("/");
    }
  }, [isAuthenticated, isEmailVerified, navigate]);

  const handleRegister = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setError("");
    setStatus("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayUsername || name,
        });
      }

      await setDoc(
        doc(db, "users", userCredential.user.uid, "profile", "info"),
        {
          displayName: displayUsername || name,
          email,
          dateOfBirth,
          bio: "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await sendEmailVerification(userCredential.user);
      setStatus(
        "Verification email sent. Please verify before logging in."
      );
    } catch (err: any) {
      setError("Registration failed. Please try again.");
    }
  };

  const handleResendVerification = async () => {
    setError("");
    setStatus("");
    if (!auth.currentUser) {
      setError("Please register or sign in to resend verification.");
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
          <div className="w-full max-w-lg bg-card/90 backdrop-blur rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-center text-primary mb-2">
              Create your account
            </h2>
            <p className="text-sm text-center text-muted-foreground mb-6">
              Join NexaSense for focused academic progress.
            </p>

            <form className="space-y-4" onSubmit={handleRegister}>
              <input
                type="text"
                placeholder="Full name"
                className="w-full border border-input rounded-lg px-4 py-3 bg-background text-foreground placeholder:text-muted-foreground caret-primary focus:outline-none focus:ring-2 focus:ring-ring"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                type="text"
                placeholder="Display username"
                className="w-full border border-input rounded-lg px-4 py-3 bg-background text-foreground placeholder:text-muted-foreground caret-primary focus:outline-none focus:ring-2 focus:ring-ring"
                value={displayUsername}
                onChange={(e) => setDisplayUsername(e.target.value)}
              />

              <input
                type="date"
                placeholder="Date of birth"
                className="w-full border border-input rounded-lg px-4 py-3 bg-background text-foreground placeholder:text-muted-foreground caret-primary focus:outline-none focus:ring-2 focus:ring-ring"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />

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

              <input
                type="password"
                placeholder="Confirm password"
                className="w-full border border-input rounded-lg px-4 py-3 bg-background text-foreground placeholder:text-muted-foreground caret-primary focus:outline-none focus:ring-2 focus:ring-ring"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isSendingVerification}
                className="w-full border border-input text-muted-foreground font-semibold py-2 rounded-lg transition duration-200 hover:bg-muted disabled:opacity-60"
              >
                Resend verification email
              </button>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
              {status && (
                <p className="text-sm text-emerald-600 text-center">
                  {status}
                </p>
              )}

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition duration-200"
              >
                Register
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-primary hover:underline"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
