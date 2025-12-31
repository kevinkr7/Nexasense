import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Brain, 
  Play, 
  Download, 
  Share, 
  Eye, 
  EyeOff, 
  CheckCircle,
  Clock,
  Target
} from "lucide-react";
import demoData from "@/data/demo.json";

export const StudyPackViewer = () => {
  const [summaryMode, setSummaryMode] = useState<'compact' | 'detailed'>('compact');
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleQuizAnswer = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
    
    if (currentQuestion < demoData.quizzes.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    selectedAnswers.forEach((answer, index) => {
      if (answer === demoData.quizzes[index].correct) correct++;
    });
    return Math.round((correct / demoData.quizzes.length) * 100);
  };

  return (
    <div className="min-h-screen bg-background pt-4">
      <div className="container mx-auto px-6 py-8">
        {/* Study Pack Header */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
              <h1 className="text-3xl font-heading font-bold text-foreground">
                {demoData.title}
              </h1>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-accent/10 text-accent">
                  {demoData.subject}
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  {demoData.learning_style}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="ghost" size="sm">
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
        <Tabs defaultValue="summary" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50">
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="mindmap" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Mind Map
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Quiz
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Resources
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-6">
            <Card className="p-6 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-heading font-semibold">Study Summary</h2>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={summaryMode === 'compact' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSummaryMode('compact')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Compact
                  </Button>
                  <Button
                    variant={summaryMode === 'detailed' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSummaryMode('detailed')}
                  >
                    <EyeOff className="w-4 h-4 mr-2" />
                    Detailed
                  </Button>
                </div>
              </div>

              {summaryMode === 'compact' ? (
                <ul className="space-y-3">
                  {demoData.summary_compact.map((point, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                      <span className="font-body leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="font-body leading-relaxed text-muted-foreground">
                  {demoData.summary_detailed}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                <Button variant="cta" size="sm">
                  Generate Flashcards
                </Button>
                <Button variant="outline" size="sm">
                  Explain This
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Mind Map Tab */}
          <TabsContent value="mindmap" className="space-y-6">
            <Card className="p-6 shadow-soft">
              <h2 className="text-xl font-heading font-semibold mb-4">Interactive Mind Map</h2>
              <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-8 min-h-[400px] flex items-center justify-center">
                <div className="text-center space-y-4">
                  <Brain className="w-16 h-16 text-primary mx-auto" />
                  <h3 className="text-lg font-heading font-semibold">Mind Map Preview</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Interactive mind map would be rendered here with draggable nodes and connections. 
                    Click nodes to expand, add notes, or generate flashcards.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {demoData.mindmap.nodes.slice(0, 6).map((node) => (
                      <Badge 
                        key={node.id} 
                        variant="secondary" 
                        className="bg-white/80 hover:bg-primary hover:text-white transition-colors cursor-pointer"
                      >
                        {node.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Quiz Tab */}
          <TabsContent value="quiz" className="space-y-6">
            <Card className="p-6 shadow-soft">
              {!quizStarted && !showResults ? (
                <div className="text-center space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-heading font-semibold">Practice Quiz</h2>
                    <p className="text-muted-foreground">
                      Test your understanding with {demoData.quizzes.length} auto-generated questions
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>~5 minutes</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Target className="w-4 h-4" />
                      <span>{demoData.quizzes.length} questions</span>
                    </div>
                  </div>

                  <Button 
                    variant="hero" 
                    size="lg" 
                    onClick={() => setQuizStarted(true)}
                    className="px-8"
                  >
                    Start Quiz
                  </Button>
                </div>
              ) : showResults ? (
                <div className="text-center space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-heading font-semibold">Quiz Complete!</h2>
                    <div className="text-4xl font-bold text-primary">{calculateScore()}%</div>
                    <p className="text-muted-foreground">
                      You got {selectedAnswers.filter((answer, index) => answer === demoData.quizzes[index].correct).length} out of {demoData.quizzes.length} questions correct
                    </p>
                  </div>
                  
                  <div className="flex justify-center space-x-4">
                    <Button 
                      variant="default"
                      onClick={() => {
                        setQuizStarted(false);
                        setShowResults(false);
                        setCurrentQuestion(0);
                        setSelectedAnswers([]);
                      }}
                    >
                      Retake Quiz
                    </Button>
                    <Button variant="outline">
                      Review Answers
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Question {currentQuestion + 1} of {demoData.quizzes.length}
                    </div>
                    <div className="w-32 h-2 bg-muted rounded-full">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${((currentQuestion + 1) / demoData.quizzes.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-heading font-semibold">
                      {demoData.quizzes[currentQuestion].question}
                    </h3>
                    
                    <div className="grid gap-3">
                      {demoData.quizzes[currentQuestion].options.map((option, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="justify-start text-left h-auto p-4 hover-scale"
                          onClick={() => handleQuizAnswer(index)}
                        >
                          <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium mr-3">
                            {String.fromCharCode(65 + index)}
                          </span>
                          {option}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-6">
            <Card className="p-6 shadow-soft">
              <h2 className="text-xl font-heading font-semibold mb-6">Related Resources</h2>
              
              <div className="space-y-4">
                <h3 className="font-heading font-medium text-muted-foreground">Recommended Videos</h3>
                <div className="grid gap-4">
                  {demoData.videos.map((video, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group">
                      <div className="relative flex-shrink-0">
                        <img 
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-24 h-16 rounded-lg object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center group-hover:bg-black/40 transition-colors">
                          <Play className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        <h4 className="font-heading font-medium text-sm leading-tight">
                          {video.title}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>{video.channel}</span>
                          <span>•</span>
                          <span>{video.duration}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};