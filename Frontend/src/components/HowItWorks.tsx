import { Upload, Scan, Brain, GraduationCap } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload",
    description: "Drag & drop notes, photos, or type directly",
    color: "text-primary"
  },
  {
    icon: Scan,
    title: "OCR",
    description: "AI extracts text and recognizes handwriting",
    color: "text-accent"
  },
  {
    icon: Brain,
    title: "Summarize", 
    description: "Generate summaries, mind-maps, and quizzes",
    color: "text-purple-600"
  },
  {
    icon: GraduationCap,
    title: "Learn",
    description: "Study with your personalized learning pack",
    color: "text-orange-600"
  }
];

export const HowItWorks = () => {
  return (
    <section className="py-24 bg-gradient-feature">
      <div className="container mx-auto px-6">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-5xl font-heading font-bold">
            How it works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-body">
            From messy notes to organized knowledge in four simple steps
          </p>
        </div>

        <div className="relative">
          {/* Desktop Flow */}
          <div className="hidden lg:flex items-center justify-between mb-8">
            <div className="absolute top-8 left-20 right-20 h-0.5 bg-gradient-to-r from-primary via-accent to-purple-600 opacity-30" />
            {steps.map((step, index) => (
              <div key={step.title} className="relative z-10">
                <div className="flex flex-col items-center space-y-4 group">
                  <div className={`w-16 h-16 rounded-2xl bg-white shadow-lift flex items-center justify-center group-hover:scale-110 transition-all duration-300`}>
                    <step.icon className={`w-8 h-8 ${step.color}`} />
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      Step {index + 1}
                    </div>
                    <h3 className="text-lg font-heading font-semibold">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-32">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Stack */}
          <div className="lg:hidden space-y-6">
            {steps.map((step, index) => (
              <div key={step.title} className="flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-xl bg-white shadow-soft flex items-center justify-center flex-shrink-0`}>
                  <step.icon className={`w-6 h-6 ${step.color}`} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Step {index + 1}
                    </span>
                    <h3 className="text-lg font-heading font-semibold">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-muted-foreground font-body">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};