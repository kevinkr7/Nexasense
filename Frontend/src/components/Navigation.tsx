import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDemo = location.pathname === '/demo';

  return (
    <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {isDemo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            )}
            
            <h1 className="text-2xl font-heading font-bold bg-gradient-hero bg-clip-text text-transparent">
              NexaSense
            </h1>
            
            {isDemo && (
              <div className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium">
                Demo Mode
              </div>
            )}
          </div>
          
          {!isDemo && (
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
              <Button variant="default" size="sm">
                Get Started
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};