"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { auth } from "@/lib/auth";
import { seedSampleData } from "@/lib/seed";
import { isFirebaseConfigured, getFirebase } from "@/lib/firebase";
import { syncFirestoreToLocal } from "@/lib/store";
import type { User } from "@/types";

interface AppContextValue {
  user: User | null;
  loading: boolean;
  signin: (email: string, password: string) => Promise<User>;
  signup: (
    email: string,
    password: string,
    displayName?: string,
    username?: string,
    firstName?: string,
    lastName?: string,
    birthYear?: number,
    birthMonth?: string,
    birthDay?: number,
    gender?: string
  ) => Promise<User>;
  signout: () => Promise<void>;
  refresh: () => void;
  resendVerificationEmail: () => Promise<void>;
  checkVerificationStatus: () => Promise<boolean>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function initAuth() {
      if (isFirebaseConfigured()) {
        const fb = await getFirebase();
        if (fb && fb.auth) {
          const { onAuthStateChanged } = await import("firebase/auth");
          unsubscribe = onAuthStateChanged(fb.auth, async (fbUser) => {
            if (fbUser) {
              const cached = auth.getCurrentUser();
              const mappedUser: User = {
                uid: fbUser.uid,
                email: fbUser.email || "",
                displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
                photoURL: fbUser.photoURL || undefined,
                role: "admin",
                createdAt: Date.now(),
                emailVerified: fbUser.emailVerified,
                ...cached?.uid === fbUser.uid ? cached : {}
              };
              if (fbUser.photoURL) {
                mappedUser.photoURL = fbUser.photoURL;
              }
              
              seedSampleData(mappedUser);
              setUser(mappedUser);
              
              if (fbUser.emailVerified) {
                await syncFirestoreToLocal(fbUser.uid);
              }
            } else {
              setUser(null);
            }
            setLoading(false);
          });
          return;
        }
      }

      const u = auth.getCurrentUser();
      if (u) {
        seedSampleData(u);
        setUser(u);
      }
      setLoading(false);
    }

    initAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const signin = async (email: string, password: string) => {
    const u = await auth.signin({ email, password });
    seedSampleData(u);
    setUser(u);
    if (u.emailVerified) {
      await syncFirestoreToLocal(u.uid);
    }
    return u;
  };

  const signup = async (
    email: string,
    password: string,
    displayName?: string,
    username?: string,
    firstName?: string,
    lastName?: string,
    birthYear?: number,
    birthMonth?: string,
    birthDay?: number,
    gender?: string
  ) => {
    const u = await auth.signup({
      email,
      password,
      displayName,
      username,
      firstName,
      lastName,
      birthYear,
      birthMonth,
      birthDay,
      gender
    });
    setUser(u);
    return u;
  };

  const signout = async () => {
    await auth.signout();
    setUser(null);
  };

  const refresh = () => {
    const u = auth.getCurrentUser();
    setUser(u);
  };

  const resendVerificationEmail = async () => {
    await auth.sendVerificationEmail();
  };

  const checkVerificationStatus = async (): Promise<boolean> => {
    const updatedUser = await auth.reloadCurrentUser();
    if (updatedUser) {
      setUser(updatedUser);
      if (updatedUser.emailVerified) {
        await syncFirestoreToLocal(updatedUser.uid);
        return true;
      }
    }
    return false;
  };

  return (
    <AppContext.Provider value={{ 
      user, 
      loading, 
      signin, 
      signup, 
      signout, 
      refresh,
      resendVerificationEmail,
      checkVerificationStatus
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
