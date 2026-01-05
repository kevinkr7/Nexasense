import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
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

  // Logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("nexasense_token");
      window.location.href = "/demo";
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          
          {/* LEFT SIDE */}
          <div className="flex items-center space-x-4">
            {isDemo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
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
          <div className="flex items-center space-x-3">
            {isLoggedIn && !isHome ? (
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/demo")}
                >
                  Sign In
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate("/demo")}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
};
