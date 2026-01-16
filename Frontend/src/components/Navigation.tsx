import { ArrowLeft, Bell, Moon, Sun, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase";

export const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Route checks
  const isLogin = location.pathname === "/login";
  const isHome = location.pathname === "/";

  // Auth check
  const isLoggedIn = !!localStorage.getItem("nexasense_token");

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") {
      return "light";
    }
    const storedTheme = localStorage.getItem("nexasense_theme");
    if (storedTheme) {
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
    if (!isProfileOpen) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (!profileMenuRef.current) {
        return;
      }
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileOpen]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const showBackToHome = isLoggedIn && !isHome;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("nexasense_token");
      window.location.href = "/";
    } catch (err) {
      console.error("Logout failed", err);
    }
    return localStorage.getItem("nexasense_theme") ?? "light";
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

            {isLogin && (
              <div className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium">
                Login
              </div>
            )}
          </div>

          {/* RIGHT SIDE */}
          <div className="flex items-center space-x-4">
            {!isLoggedIn ? (
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-sm font-semibold text-foreground hover:text-foreground/80"
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
                    <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-background shadow-lg">
                      <div className="flex flex-col py-2 text-sm text-foreground">
                        {["Notes uploaded", "Settings", "Progress", "Rewards"].map(
                          (item) => (
                            <button
                              key={item}
                              type="button"
                              className="px-4 py-2 text-left hover:bg-muted"
                            >
                              {item}
                            </button>
                          )
                        )}
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="px-4 py-2 text-left text-destructive hover:bg-muted"
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
