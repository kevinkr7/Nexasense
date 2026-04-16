import {
  addDoc,
  collection,
  doc,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

export type EvalionQuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
};

export const pushQuizToEvalion = async (
  quizData: EvalionQuizQuestion[]
): Promise<string> => {
  if (!Array.isArray(quizData) || quizData.length === 0) {
    throw new Error("Quiz data is empty.");
  }

  const db = getFirestore();
  const setId = `auto_${Date.now()}`;

  try {
    await setDoc(doc(db, "questionSets", setId), {
      source: "nexasense",
      createdAt: serverTimestamp(),
    });

    for (const item of quizData) {
      if (
        !item?.question ||
        !Array.isArray(item.options) ||
        item.options.length === 0 ||
        !item.correctAnswer
      ) {
        throw new Error("Invalid question format in quiz data.");
      }

      await addDoc(collection(db, "questionSets", setId, "questions"), {
        question: item.question,
        options: item.options,
        correctAnswer: item.correctAnswer,
      });
    }

    await updateDoc(doc(db, "settings", "questions"), {
      activeSetId: setId,
    });

    return setId;
  } catch (error) {
    console.error("Failed to push quiz to Evalion", error);
    throw error;
  }
};
