// Firebase is optional - only initialize if properly configured
const isSimulationMode = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY.includes("DEMO") ||
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY.includes("mock") ||
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "AIzaSyD4A7YHGDpcBYyDW04FL0d92c3Br5Mqk6g";

let app: any = null;
let auth: any = null;
let db: any = null;

// Only initialize Firebase if we have a real API key
if (!isSimulationMode && typeof window !== 'undefined') {
  try {
    const { initializeApp, getApps, getApp } = require("firebase/app");
    const { getAuth } = require("firebase/auth");
    const { getDatabase } = require("firebase/database");

    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    };

    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getDatabase(app);
  } catch (error) {
    console.warn("⚠️ Firebase not configured - using localStorage fallback");
  }
}

export { app, auth, db, isSimulationMode };
