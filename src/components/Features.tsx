import { FileText, Brain, Target, Youtube } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Summarize",
    description: "Transform lengthy notes into concise, digestible summaries with key concepts highlighted",
    gradient: "from-primary/10 to-primary/5"
  },
  {
    icon: Brain,
    title: "Mind-maps", 
    description: "Visualize connections between concepts with interactive, explorable mind-maps",
    gradient: "from-accent/10 to-accent/5"
  },
  {
    icon: Target,
    title: "Quiz & Test Mode",
    description: "Auto-generate practice questions and track your understanding with instant feedback",
    gradient: "from-purple-500/10 to-purple-500/5"
  },
  {
    icon: Youtube,
    title: "YouTube Integration",
    description: "Discover relevant educational videos matched to your study topics and level",
    gradient: "from-red-500/10 to-red-500/5"
  }
];

export const Features = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-5xl font-heading font-bold">
            Everything you need to{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              study smarter
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-body">
            AI-powered tools that adapt to your learning style and help you master any subject
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`group p-8 rounded-2xl bg-gradient-to-br ${feature.gradient} border border-white/10 hover-scale cursor-pointer`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-hero flex items-center justify-center shadow-soft group-hover:shadow-glow transition-all duration-300">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                
                <h3 className="text-xl font-heading font-semibold">
                  {feature.title}
                </h3>
                
                <p className="text-muted-foreground font-body leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};