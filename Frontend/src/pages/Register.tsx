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
import { AuthVideo } from "@/components/AuthVideo";

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
  const [view, setView] = useState<"form" | "waiting" | "success">("form");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (isAuthenticated && isEmailVerified) {
      navigate("/");
    }
  }, [isAuthenticated, isEmailVerified, navigate]);

  const handleRegister = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setIsBusy(true);
      setView("waiting");
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
    } catch (err: any) {
      setError("Registration failed. Please try again.");
      setView("form");
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (view !== "waiting") return;
    let isActive = true;
    const interval = setInterval(async () => {
      if (!auth.currentUser) return;
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified && isActive) {
        const token = await auth.currentUser.getIdToken();
        localStorage.setItem("nexasense_token", token);
        setView("success");
        setTimeout(() => {
          navigate("/");
        }, 1200);
      }
    }, 2500);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [navigate, view]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-accent/10 flex flex-col">
      <Navigation />
      <div className="flex flex-1 items-stretch">
        <div className="hidden md:block md:w-1/2">
          <AuthVideo />
        </div>
        <div className="flex w-full md:w-1/2 items-center justify-center px-6 py-12">
          <div className="w-full max-w-lg bg-card/90 backdrop-blur rounded-2xl shadow-xl p-8 transition-opacity duration-300">
            {view === "form" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-2xl font-bold text-center text-primary mb-2">
                    Create your account
                  </h2>
                  <p className="text-sm text-center text-muted-foreground">
                    Join NexaSense for focused academic progress.
                  </p>
                </div>

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

                  {error && (
                    <p className="text-sm text-destructive text-center">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isBusy}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-70"
                  >
                    {isBusy ? "Creating..." : "Register"}
                  </button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
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
            )}

            {view === "waiting" && (
              <div className="space-y-4 text-center animate-in fade-in duration-300">
                <h2 className="text-2xl font-bold text-primary">
                  Waiting for email verification
                </h2>
                <p className="text-sm text-muted-foreground">
                  Check your inbox to complete setup.
                </p>
                <div className="text-sm text-muted-foreground animate-pulse">
                  {isBusy ? "Sending verification..." : "Standing by..."}
                </div>
              </div>
            )}

            {view === "success" && (
              <div className="space-y-4 text-center animate-in fade-in duration-300">
                <h2 className="text-2xl font-bold text-primary">
                  Registered Successfully
                </h2>
                <p className="text-sm text-muted-foreground">
                  Signing you in now.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
