import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase";

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  userDisplayName: string | null;
  userPhotoURL: string | null;
  userEmail: string | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthContextValue>({
    isAuthenticated: false,
    isLoading: true,
    userId: null,
    userDisplayName: null,
    userPhotoURL: null,
    userEmail: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        localStorage.setItem("nexasense_token", token);
        setState({
          isAuthenticated: true,
          isLoading: false,
          userId: user.uid,
          userDisplayName: user.displayName,
          userPhotoURL: user.photoURL,
          userEmail: user.email,
        });
      } else {
        localStorage.removeItem("nexasense_token");
        setState({
          isAuthenticated: false,
          isLoading: false,
          userId: null,
          userDisplayName: null,
          userPhotoURL: null,
          userEmail: null,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo(() => state, [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
