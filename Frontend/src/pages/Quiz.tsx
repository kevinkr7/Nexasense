import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/context/AuthContext";
import { addDoc, collection, doc, increment, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/firebase";

type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
};

type QuizPayload = {
  generatedAt: number;
  source: string;
  topic: string;
  noteTitle: string;
  summaryPreview: string;
  questions: QuizQuestion[];
};

const Quiz = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedStatus, setSavedStatus] = useState("");

  const payload = useMemo<QuizPayload | null>(() => {
    const raw = localStorage.getItem("nexasense.quiz.current");
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as QuizPayload;
      if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        return null;
      }
      return parsed;
    } catch (error) {
      console.error("Unable to parse quiz payload", error);
      return null;
    }
  }, []);

  const questions = payload?.questions ?? [];
  const answeredCount = selectedAnswers.filter(Boolean).length;
  const isComplete = questions.length > 0 && answeredCount === questions.length;

  const score = useMemo(() => {
    if (questions.length === 0) {
      return 0;
    }

    let correct = 0;
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        correct += 1;
      }
    });

    return Math.round((correct / questions.length) * 100);
  }, [questions, selectedAnswers]);

  const handleChooseOption = (option: string) => {
    const next = [...selectedAnswers];
    next[currentQuestion] = option;
    setSelectedAnswers(next);
  };

  const saveQuizAttempt = async () => {
    if (!payload || !userId || !isComplete || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSavedStatus("");

    try {
      const correctAnswers = questions.reduce((count, question, index) => {
        return count + (selectedAnswers[index] === question.correctAnswer ? 1 : 0);
      }, 0);

      await addDoc(collection(db, "users", userId, "quizAttempts"), {
        source: payload.source,
        topic: payload.topic,
        noteTitle: payload.noteTitle,
        generatedAt: payload.generatedAt,
        totalQuestions: questions.length,
        correctAnswers,
        score,
        selectedAnswers,
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "users", userId, "progress"), {
        createdAt: serverTimestamp(),
        completion: score,
        accuracy: score,
        testScore: score,
        type: "quiz",
        topic: payload.topic,
      });

      await setDoc(
        doc(db, "users", userId, "progress", "stats"),
        {
          quizzesTaken: increment(1),
          totalQuizScore: increment(score),
          latestQuizScore: score,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSavedStatus("Results saved to your learning analytics.");
    } catch (error) {
      console.error("Failed to save quiz attempt", error);
      setSavedStatus("Could not save results. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!payload) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-10">
          <h1 className="text-3xl font-bold text-foreground">Quiz</h1>
          <p className="text-muted-foreground">
            No quiz is available yet. Go to Summarize and generate Card 10.
          </p>
          <button
            type="button"
            onClick={() => navigate("/summarize")}
            className="w-fit rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Go to Summarize
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-lg">
          <p className="text-xs uppercase tracking-wide text-primary">Quiz workspace</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">{payload.noteTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Topic: {payload.topic}</p>

          <div className="mt-5 flex items-center justify-between text-sm text-muted-foreground">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{answeredCount}/{questions.length} answered</span>
          </div>

          <div className="mt-5 rounded-2xl border border-border/60 bg-background p-5">
            <p className="text-lg font-medium text-foreground">{questions[currentQuestion].question}</p>
            <div className="mt-4 grid gap-3">
              {questions[currentQuestion].options.map((option) => {
                const active = selectedAnswers[currentQuestion] === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleChooseOption(option)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentQuestion((prev) => Math.max(prev - 1, 0))}
                disabled={currentQuestion === 0}
                className="rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentQuestion((prev) => Math.min(prev + 1, questions.length - 1))
                }
                disabled={currentQuestion === questions.length - 1}
                className="rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>

            <div className="text-right">
              <p className="text-sm text-muted-foreground">Current score preview: {score}%</p>
              <button
                type="button"
                onClick={saveQuizAttempt}
                disabled={!isComplete || isSubmitting}
                className="mt-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Submit & Save Result"}
              </button>
            </div>
          </div>

          {savedStatus && <p className="mt-4 text-sm text-primary">{savedStatus}</p>}
        </div>
      </main>
    </div>
  );
};

export default Quiz;
