import { ArrowLeft, Bell, Moon, Sun, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase";

export const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Route checks
  const isDemo = location.pathname === "/demo";
  const isHome = location.pathname === "/";

  // Auth check
  const isLoggedIn = !!localStorage.getItem("nexasense_token");

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") {
      return "light";
    }
    return localStorage.getItem("nexasense_theme") ?? "light";
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

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const showBackToHome = isLoggedIn && !isHome;

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

            {isDemo && (
              <div className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium">
                Demo Mode
              </div>
            )}
          </div>

          {/* RIGHT SIDE */}
          <div className="flex items-center space-x-4">
            {!isLoggedIn ? (
              <button
                type="button"
                onClick={() => navigate("/demo")}
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
                <div className="relative">
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
