import { Button } from "@/components/ui/button";
import heroIllustration from "@/assets/hero-illustration.jpg";
import { ArrowRight, PlayCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-nexasense-light to-background">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
      
      <div className="container relative mx-auto px-6 py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold leading-tight">
                Turn scattered notes into{" "}
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  clear study packs
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground font-body leading-relaxed max-w-2xl">
                Upload handwritten or typed notes. Get summaries, mind-maps, quizzes & videos instantly.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                variant="hero" 
                size="lg"
                className="text-lg px-8 py-4 h-14"
                onClick={() => navigate('/demo')}
              >
                <PlayCircle className="w-5 h-5" />
                Try Demo
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="text-lg px-8 py-4 h-14 font-medium"
              >
                Sign In
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span>Free demo available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>No sign-up required</span>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative">
            <div className="relative z-10 hover-scale">
              <img 
                src={heroIllustration}
                alt="AI-powered study tools illustration showing connected learning nodes"
                className="w-full h-auto rounded-3xl shadow-lift"
              />
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-hero rounded-full opacity-20 blur-xl" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-accent/20 rounded-full opacity-30 blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
};