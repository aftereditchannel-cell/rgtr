import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

/**
 * Public Firebase Web configuration for the NEXUS HQ client.
 * This is intentionally embedded so Electron, Capacitor and render tooling use the
 * same configuration without requiring .env.local or build-time environment values.
 * It is not an Admin SDK credential and must be protected by Firebase Rules.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyByoWZR-6Gna7LerhD2UEMKiP-HbTmLt0Y',
  authDomain: 'nexus-hq-c42cd.firebaseapp.com',
  projectId: 'nexus-hq-c42cd',
  storageBucket: 'nexus-hq-c42cd.firebasestorage.app',
  messagingSenderId: '222910675316',
  appId: '1:222910675316:web:4e3cbcd6abfd36045e5421',
}

export function isFirebaseConfigured(): boolean {
  return true
}

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)
const auth: Auth = getAuth(app)
const firestore: Firestore = getFirestore(app)

export { app, auth, firestore, firebaseConfig }
