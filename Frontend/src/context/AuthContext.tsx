import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/firebase";

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isLoading: boolean;
  userId: string | null;
  userDisplayName: string | null;
  userPhotoURL: string | null;
  userEmail: string | null;
  refreshUser: (nextUser: User | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthContextValue>({
    user: null,
    isAuthenticated: false,
    isEmailVerified: false,
    isLoading: true,
    userId: null,
    userDisplayName: null,
    userPhotoURL: null,
    userEmail: null,
    refreshUser: () => undefined,
  });

  const updateState = useCallback((user: User | null, isLoading = false) => {
    setState((prev) => ({
      ...prev,
      user,
      isAuthenticated: user ? user.emailVerified : false,
      isEmailVerified: user ? user.emailVerified : false,
      isLoading,
      userId: user?.uid ?? null,
      userDisplayName: user?.displayName ?? null,
      userPhotoURL: user?.photoURL ?? null,
      userEmail: user?.email ?? null,
    }));
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      updateState(user, false);
    });

    return () => unsubscribe();
  }, [updateState]);

  const value = useMemo(
    () => ({ ...state, refreshUser: updateState }),
    [state, updateState]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
