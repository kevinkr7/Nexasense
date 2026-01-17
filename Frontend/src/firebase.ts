// Firebase core
import { initializeApp } from "firebase/app";

// Firebase Auth
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 🔹 Your Firebase configuration (replace values)
const firebaseConfig = {
  apiKey: "AIzaSyDomxijymuZwm0KGmVyI5eI_Qu8ARWgTHw",
  authDomain: "nexasense-ca198.firebaseapp.com",
  projectId: "nexasense-ca198",
  storageBucket: "nexasense-ca198.firebasestorage.app",
  messagingSenderId: "554170658710",
  appId: "1:554170658710:web:09619ed424f616138237b7",
  measurementId: "G-Y1RDY45NLV"
};

// 🔹 Initialize Firebase
const app = initializeApp(firebaseConfig);

// 🔹 Initialize Auth
export const auth = getAuth(app);
export const db = getFirestore(app);

// 🔹 Export app (optional but good practice)
export default app;
