import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
}

/** Firebase فقط وقتی همه‌ی مقادیر محیطی موجود هستند راه‌اندازی می‌شود. */
export function isFirebaseConfigured(): boolean {
  return Object.values(config).every(value => typeof value === 'string' && value.length > 0)
}

let app: FirebaseApp | null = null
let auth: Auth | null = null
let firestore: Firestore | null = null

if (isFirebaseConfigured()) {
  app = getApps().length ? getApp() : initializeApp(config)
  auth = getAuth(app)
  firestore = getFirestore(app)
}

export { app, auth, firestore }
