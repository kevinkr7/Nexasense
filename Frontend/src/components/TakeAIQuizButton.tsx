import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  EvalionQuizQuestion,
  pushQuizToEvalion,
} from "@/lib/pushQuizToEvalion";

type RawQuizQuestion = {
  question: string;
  options: string[];
  correctAnswer?: string;
  correct?: number;
};

type TakeAIQuizButtonProps = {
  quizData: RawQuizQuestion[];
};

const mapQuizDataToEvalion = (
  quizData: RawQuizQuestion[]
): EvalionQuizQuestion[] => {
  return quizData.map((item) => {
    const correctAnswer =
      item.correctAnswer ??
      (typeof item.correct === "number" ? item.options[item.correct] : "");

    return {
      question: item.question,
      options: item.options,
      correctAnswer,
    };
  });
};

export const TakeAIQuizButton = ({ quizData }: TakeAIQuizButtonProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleTakeAIQuiz = async () => {
    if (isUploading) {
      return;
    }

    setIsUploading(true);
    setStatusMessage("");

    try {
      const formattedQuizData = mapQuizDataToEvalion(quizData);
      await pushQuizToEvalion(formattedQuizData);
      setStatusMessage("Quiz ready! Redirecting...");

      setTimeout(() => {
        window.location.href = "https://technical-quiz-1c612.web.app/";
      }, 800);
    } catch (error) {
      console.error("Quiz upload failed", error);
      setStatusMessage("Failed to prepare quiz. Please try again.");
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="cta"
        size="lg"
        onClick={handleTakeAIQuiz}
        disabled={isUploading}
        className="px-8"
      >
        {isUploading ? "Preparing Quiz..." : "Take AI Quiz"}
      </Button>

      {statusMessage ? (
        <p className="text-sm text-muted-foreground">{statusMessage}</p>
      ) : null}
    </div>
  );
};
