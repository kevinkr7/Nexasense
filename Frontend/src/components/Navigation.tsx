import { ArrowLeft, Bell, Moon, Sun, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase";
import { useAuth } from "@/context/AuthContext";

export const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Route checks
  const isLogin = location.pathname === "/login";
  const isRegister = location.pathname === "/register";
  const isHome = location.pathname === "/";
  const isAuthPage = isLogin || isRegister;

  const { isAuthenticated, userDisplayName, userEmail, userPhotoURL } =
    useAuth();
  const isLoggedIn = isAuthenticated;

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [dailyQuote, setDailyQuote] = useState("");
  const [typedQuote, setTypedQuote] = useState("");

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const storedTheme = localStorage.getItem("nexasense_theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("nexasense_theme", theme);
  }, [theme]);

  useEffect(() => {
    let isMounted = true;
    const loadQuotes = async () => {
      try {
        const response = await fetch("/resources/quotes.txt");
        if (!response.ok) {
          return;
        }
        const text = await response.text();
        const quotes = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        if (quotes.length === 0) {
          return;
        }
        const dayIndex = new Date().getDate() - 1;
        const quote = quotes[dayIndex % quotes.length];
        if (isMounted) {
          setDailyQuote(quote);
        }
      } catch (error) {
        console.warn("Failed to load daily quote", error);
      }
    };

    loadQuotes();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!dailyQuote) {
      setTypedQuote("");
      return;
    }
    let index = 0;
    setTypedQuote("");
    const interval = setInterval(() => {
      index += 1;
      setTypedQuote(dailyQuote.slice(0, index));
      if (index >= dailyQuote.length) {
        clearInterval(interval);
      }
    }, 60);

    return () => clearInterval(interval);
  }, [dailyQuote]);

  useEffect(() => {
    if (!isProfileOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileOpen]);

  const toggleTheme = () => {
    // Check if browser supports View Transitions
    if (!document.startViewTransition) {
      setTheme((prev) => (prev === "dark" ? "light" : "dark"));
      return;
    }

    // This triggers the browser's native cross-fade animation
    document.startViewTransition(() => {
      setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    });
  };

  const showBackToHome = isLoggedIn && !isHome;
  const showAuthCta = !isLoggedIn && !isAuthPage;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsProfileOpen(false);
      navigate("/");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <nav className="border-b bg-white/80 dark:bg-nexasense-dark/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* LEFT SIDE */}
          <div className="flex items-center space-x-4">
            {showBackToHome && (
              <button
                type="button"
                onClick={() => navigate("/")}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </button>
            )}

            <h1
              className="text-2xl font-heading font-bold bg-gradient-hero bg-clip-text text-transparent cursor-pointer"
              onClick={() => navigate("/")}
            >
              NexaSense
            </h1>

            {typedQuote && (
              <div className="hidden md:flex items-center text-sm font-mono text-muted-foreground">
                <span className="whitespace-nowrap">{typedQuote}</span>
              </div>
            )}

            {isLogin && (
              <div className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium">
                Login
              </div>
            )}

            {isRegister && (
              <div className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium">
                Register
              </div>
            )}
          </div>

          {/* RIGHT SIDE */}
          <div className="flex items-center space-x-4">
            {!isLoggedIn ? (
              <button
                type="button"
                onClick={() => navigate("/login")}
                className={`text-sm font-semibold text-foreground hover:text-foreground/80 ${
                  showAuthCta ? "" : "hidden"
                }`}
              >
                Get Started
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Dashboard
                </button>

                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                </button>

                <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsProfileOpen((prev) => !prev)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground"
                    aria-label="Profile options"
                  >
                    <User className="h-4 w-4" />
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-border bg-background shadow-lg">
                      <div className="flex gap-4 px-4 pb-4 pt-4">
                        <div className="flex flex-col items-start gap-2">
                          <div className="h-16 w-16 overflow-hidden rounded-full bg-muted">
                            {userPhotoURL ? (
                              <img
                                src={userPhotoURL}
                                alt="Profile"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <User className="h-6 w-6" />
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsProfileOpen(false);
                              navigate("/profile");
                            }}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            View Profile
                          </button>
                        </div>
                        <div className="flex flex-1 flex-col justify-center">
                          <p className="text-sm font-semibold text-foreground">
                            {userDisplayName || "Your account"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {userEmail || "Signed in"}
                          </p>
                        </div>
                      </div>
                      <div className="border-t border-border/70 py-2 text-sm text-foreground">
                        {[
                          { label: "Notes uploaded", path: "/notes" },
                          { label: "Progress", path: "/progress" },
                          { label: "Rewards", path: "/rewards" },
                          { label: "Settings", path: "/settings" },
                        ].map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              setIsProfileOpen(false);
                              navigate(item.path);
                            }}
                            className="flex w-full items-center px-4 py-2 text-left hover:bg-muted"
                          >
                            {item.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center px-4 py-2 text-left text-destructive hover:bg-muted"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
