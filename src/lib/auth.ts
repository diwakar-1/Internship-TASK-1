import { dataStore, generateId } from "./store";
import { isFirebaseConfigured, getFirebase } from "./firebase";
import type { User, UserRole } from "@/types";

const SESSION_KEY = "formcraft:session";

export interface AuthCredentials {
  email: string;
  password: string;
  displayName?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  birthYear?: number;
  birthMonth?: string;
  birthDay?: number;
  gender?: string;
}

export const auth = {
  async signup({
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
  }: AuthCredentials): Promise<User> {
    if (!email || !password) throw new Error("Email and password are required");
    if (password.length < 6) throw new Error("Password must be at least 6 characters");

    if (isFirebaseConfigured()) {
      const fb = await getFirebase();
      if (fb && fb.auth && fb.db) {
        const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
        const { doc, setDoc } = await import("firebase/firestore");

        try {
          const userCredential = await createUserWithEmailAndPassword(fb.auth, email, password);
          const fbUser = userCredential.user;

          const finalDisplayName = displayName || `${firstName} ${lastName}`.trim() || email.split("@")[0];
          await updateProfile(fbUser, { displayName: finalDisplayName });

          const user: User = {
            uid: fbUser.uid,
            email,
            displayName: finalDisplayName,
            role: "admin",
            createdAt: Date.now(),
            tier: "free",
            username,
            firstName,
            lastName,
            birthYear,
            birthMonth,
            birthDay,
            gender
          };

          const cleanUser = JSON.parse(JSON.stringify(user));
          await setDoc(doc(fb.db, "users", fbUser.uid), cleanUser);
          dataStore.saveUser(user);
          dataStore.setCurrentUser(user);
          dataStore.addNotification({
            userId: user.uid,
            title: "Welcome to FormCraft! 🚀",
            message: `Hi ${firstName || finalDisplayName || "there"}, thanks for joining FormCraft! Start building your beautiful forms.`,
            type: "info"
          });
          if (typeof window !== "undefined") localStorage.setItem(SESSION_KEY, JSON.stringify({ uid: user.uid }));
          return user;
        } catch (error: any) {
          if (error.code === "auth/email-already-in-use") {
            throw new Error("An account with that email already exists");
          }
          throw error;
        }
      }
    }

    if (dataStore.findUserByEmail(email)) throw new Error("An account with that email already exists");
    const finalDisplayName = displayName || `${firstName} ${lastName}`.trim() || email.split("@")[0];
    const user: User = {
      uid: generateId("u_"),
      email,
      displayName: finalDisplayName,
      role: "admin",
      createdAt: Date.now(),
      tier: "free",
      username,
      firstName,
      lastName,
      birthYear,
      birthMonth,
      birthDay,
      gender
    };
    dataStore.saveUser(user);
    dataStore.setCurrentUser(user);
    dataStore.addNotification({
      userId: user.uid,
      title: "Welcome to FormCraft! 🚀",
      message: `Hi ${firstName || finalDisplayName || "there"}, thanks for joining FormCraft! Start building your beautiful forms.`,
      type: "info"
    });
    if (typeof window !== "undefined") localStorage.setItem(SESSION_KEY, JSON.stringify({ uid: user.uid }));
    return user;
  },

  async signin({ email, password }: AuthCredentials): Promise<User> {
    if (!email || !password) throw new Error("Email and password are required");

    if (isFirebaseConfigured()) {
      const fb = await getFirebase();
      if (fb && fb.auth && fb.db) {
        const { signInWithEmailAndPassword } = await import("firebase/auth");
        const { doc, getDoc, setDoc } = await import("firebase/firestore");

        try {
          const userCredential = await signInWithEmailAndPassword(fb.auth, email, password);
          const fbUser = userCredential.user;

          const userDocRef = doc(fb.db, "users", fbUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          let user: User;
          if (userDocSnap.exists()) {
            user = userDocSnap.data() as User;
            user.emailVerified = fbUser.emailVerified;
          } else {
            user = {
              uid: fbUser.uid,
              email: fbUser.email || email,
              displayName: fbUser.displayName || email.split("@")[0],
              role: "admin",
              createdAt: Date.now(),
              emailVerified: fbUser.emailVerified,
            };
            await setDoc(userDocRef, user);
          }

          dataStore.saveUser(user);
          dataStore.setCurrentUser(user);
          if (typeof window !== "undefined") localStorage.setItem(SESSION_KEY, JSON.stringify({ uid: user.uid }));
          return user;
        } catch (error: any) {
          if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
            throw new Error("Incorrect email or password");
          }
          throw error;
        }
      }
    }

    const user = dataStore.findUserByEmail(email);
    if (!user) throw new Error("No account found with that email");
    const stored = dataStore.getUsers().find((u) => u.uid === user.uid) as User & { passwordHash?: string };
    if (stored?.passwordHash && stored.passwordHash !== hashPassword(password)) {
      throw new Error("Incorrect password");
    }
    if (!stored?.passwordHash) {
      (user as User & { passwordHash?: string }).passwordHash = hashPassword(password);
      dataStore.saveUser(user);
    }
    dataStore.setCurrentUser(user);
    if (typeof window !== "undefined") localStorage.setItem(SESSION_KEY, JSON.stringify({ uid: user.uid }));
    return user;
  },

  async signout(): Promise<void> {
    if (isFirebaseConfigured()) {
      const fb = await getFirebase();
      if (fb && fb.auth) {
        const { signOut } = await import("firebase/auth");
        await signOut(fb.auth);
      }
    }
    dataStore.setCurrentUser(null);
    if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser(): User | null {
    return dataStore.getCurrentUser();
  },

  async sendVerificationEmail(): Promise<void> {
    if (isFirebaseConfigured()) {
      const fb = await getFirebase();
      if (fb && fb.auth && fb.auth.currentUser) {
        const { sendEmailVerification } = await import("firebase/auth");
        await sendEmailVerification(fb.auth.currentUser);
      }
    }
  },

  async reloadCurrentUser(): Promise<User | null> {
    const current = this.getCurrentUser();
    if (!current) return null;

    if (isFirebaseConfigured()) {
      const fb = await getFirebase();
      if (fb && fb.auth && fb.auth.currentUser && fb.db) {
        const { doc, getDoc } = await import("firebase/firestore");
        await fb.auth.currentUser.reload();
        const fbUser = fb.auth.currentUser;
        
        const userDocRef = doc(fb.db, "users", current.uid);
        const userDocSnap = await getDoc(userDocRef);
        let updated = { ...current, emailVerified: fbUser.emailVerified };
        if (userDocSnap.exists()) {
          const remoteData = userDocSnap.data() as User;
          updated = { ...updated, ...remoteData };
        }
        dataStore.saveUser(updated);
        dataStore.setCurrentUser(updated);
        return updated;
      }
    }
    current.emailVerified = true;
    return current;
  },

  async updateProfile(updates: Partial<User>): Promise<User> {
    const current = this.getCurrentUser();
    if (!current) throw new Error("Not authenticated");
    const updated = { ...current, ...updates };

    if (isFirebaseConfigured()) {
      const fb = await getFirebase();
      if (fb && fb.auth && fb.db) {
        const { updateProfile: updateFbProfile } = await import("firebase/auth");
        const { doc, setDoc } = await import("firebase/firestore");

        if (fb.auth.currentUser) {
          await updateFbProfile(fb.auth.currentUser, {
            displayName: updates.displayName || fb.auth.currentUser.displayName,
            photoURL: updates.photoURL !== undefined ? (updates.photoURL || null) : fb.auth.currentUser.photoURL,
          });
        }
        const cleanUpdated = JSON.parse(JSON.stringify(updated));
        await setDoc(doc(fb.db, "users", current.uid), cleanUpdated, { merge: true });
      }
    }

    dataStore.saveUser(updated);
    dataStore.setCurrentUser(updated);
    dataStore.addNotification({
      userId: current.uid,
      title: "Profile Updated",
      message: "Your profile information has been successfully updated.",
      type: "success"
    });
    return updated;
  },

  async deleteAccount(): Promise<void> {
    const current = this.getCurrentUser();
    if (!current) throw new Error("Not authenticated");

    if (isFirebaseConfigured()) {
      const fb = await getFirebase();
      if (fb && fb.auth && fb.db) {
        const { deleteUser } = await import("firebase/auth");
        const { doc, deleteDoc, collection, query, where, getDocs } = await import("firebase/firestore");

        // First attempt to delete from Firebase Auth (since it might throw requires-recent-login)
        if (fb.auth.currentUser) {
          try {
            await deleteUser(fb.auth.currentUser);
          } catch (authErr: any) {
            if (authErr.code === "auth/requires-recent-login") {
              throw new Error("For security reasons, this action requires a recent login. Please sign out, sign back in, and try again.");
            }
            throw authErr;
          }
        }

        // Delete from Firestore
        try {
          await deleteDoc(doc(fb.db, "users", current.uid));

          const formsQuery = query(collection(fb.db, "forms"), where("ownerId", "==", current.uid));
          const formsSnap = await getDocs(formsQuery);
          const deletePromises: Promise<void>[] = [];
          
          for (const formDoc of formsSnap.docs) {
            const formId = formDoc.id;
            deletePromises.push(deleteDoc(doc(fb.db, "forms", formId)));
            
            const responsesQuery = query(collection(fb.db, "responses"), where("formId", "==", formId));
            const responsesSnap = await getDocs(responsesQuery);
            responsesSnap.forEach((respDoc) => {
              deletePromises.push(deleteDoc(doc(fb.db, "responses", respDoc.id)));
            });
          }
          await Promise.all(deletePromises);
        } catch (dbErr) {
          console.error("Firestore deletion failed during account delete:", dbErr);
        }
      }
    }

    // Clear local cache/states
    dataStore.deleteUserAndData(current.uid);
  },

  async updateRole(uid: string, role: UserRole): Promise<void> {
    const users = dataStore.getUsers();
    const user = users.find((u) => u.uid === uid);
    if (user) {
      user.role = role;
      
      if (isFirebaseConfigured()) {
        const fb = await getFirebase();
        if (fb && fb.db) {
          const { doc, setDoc } = await import("firebase/firestore");
          await setDoc(doc(fb.db, "users", uid), { role }, { merge: true });
        }
      }
      
      dataStore.saveUser(user);
    }
  },
};

function hashPassword(pw: string): string {
  let hash = 0;
  for (let i = 0; i < pw.length; i++) {
    hash = (hash << 5) - hash + pw.charCodeAt(i);
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}_${pw.length}`;
}
