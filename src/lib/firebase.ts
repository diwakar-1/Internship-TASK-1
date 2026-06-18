import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

export async function getFirebase() {
  if (!isFirebaseConfigured()) return null;
  if (_app) return { app: _app, auth: _auth!, db: _db!, storage: _storage! };
  const [
    { initializeApp, getApps, getApp },
    { getAuth },
    { getFirestore },
    { getStorage }
  ] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
    import("firebase/storage"),
  ]);
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig as Record<string, string>);
  _auth = getAuth(_app);
  _db = getFirestore(_app);
  _storage = getStorage(_app);
  return { app: _app, auth: _auth, db: _db, storage: _storage };
}

export async function uploadFile(file: File): Promise<string> {
  const isLocalhost = typeof window !== "undefined" && 
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  if (!isLocalhost) {
    try {
      const fb = await getFirebase();
      if (fb && fb.storage) {
        const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
        const storageRef = ref(fb.storage, `uploads/${Date.now()}_${file.name}`);
        
        const uploadPromise = (async () => {
          const snapshot = await uploadBytes(storageRef, file);
          return await getDownloadURL(snapshot.ref);
        })();

        const timeoutPromise = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error("Upload timed out after 2.5 seconds")), 2500)
        );

        return await Promise.race([uploadPromise, timeoutPromise]);
      }
    } catch (error) {
      console.warn("Firebase Storage upload failed or timed out, falling back to local server upload:", error);
    }
  }

  // Upload to local Next.js upload API
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch (err) {
    console.error("Local upload API failed, falling back to Base64:", err);
  }

  // Fallback to Base64 encoding as last resort
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}
