import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import type { AppData } from '../store/types'
import { auth, firestore, isFirebaseConfigured } from './firebase'
import { isAndroid, isMobile } from './mobile'
import { isDesktop } from './desktop'

const MAX_DOCUMENT_BYTES = 900 * 1024

export type CloudCode =
  | 'not_configured' | 'not_signed_in' | 'popup_blocked' | 'cancelled'
  | 'unauthorized_domain' | 'network' | 'too_large' | 'unknown'

export class CloudError extends Error {
  code: CloudCode
  constructor(code: CloudCode) { super(code); this.code = code; this.name = 'CloudError' }
}

export type CloudUser = Pick<User, 'uid' | 'displayName' | 'email' | 'photoURL'>
export type RemoteData = { data: unknown; updatedAt: string } | null

let authReady: Promise<void> | null = null

function requireFirebase() {
  if (!isFirebaseConfigured() || !auth || !firestore) throw new CloudError('not_configured')
  return { auth, firestore }
}

function requireUser(): User {
  const { auth: activeAuth } = requireFirebase()
  if (!activeAuth.currentUser) throw new CloudError('not_signed_in')
  return activeAuth.currentUser
}

function mapError(error: unknown): CloudError {
  const code = String((error as { code?: string })?.code ?? '')
  if (code.includes('popup-blocked')) return new CloudError('popup_blocked')
  if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) return new CloudError('cancelled')
  if (code.includes('unauthorized-domain')) return new CloudError('unauthorized_domain')
  if (code.includes('network') || code.includes('timeout') || code.includes('unavailable')) return new CloudError('network')
  if (error instanceof CloudError) return error
  return new CloudError('unknown')
}

/** Auth را یک‌بار در آغاز برنامه آماده و نتیجه‌ی redirect را دریافت می‌کند. */
export async function initCloudAuth(): Promise<void> {
  if (!isFirebaseConfigured()) return
  if (!authReady) {
    authReady = (async () => {
      const { auth: activeAuth } = requireFirebase()
      await setPersistence(activeAuth, browserLocalPersistence)
      // Android از ورود بومی استفاده می‌کند و هرگز نباید redirect وب به localhost اجرا شود.
      if (!isAndroid) {
        try { await getRedirectResult(activeAuth) } catch { /* خطا در کارت تنظیمات نشان داده می‌شود */ }
      }
    })()
  }
  return authReady
}

export function getCurrentUser(): CloudUser | null {
  if (!isFirebaseConfigured() || !auth?.currentUser) return null
  const { uid, displayName, email, photoURL } = auth.currentUser
  return { uid, displayName, email, photoURL }
}

export function watchCloudUser(callback: (user: CloudUser | null) => void): () => void {
  if (!isFirebaseConfigured() || !auth) { callback(null); return () => {} }
  return onAuthStateChanged(auth, user => callback(user ? {
    uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL,
  } : null))
}

/**
 * Android uses the native Credential Manager through Capawesome's Capacitor plugin.
 * The plugin supplies a Google ID token which is then exchanged with Firebase Web
 * Auth, so Firestore receives the same authenticated uid and no localhost redirect
 * is ever opened. Other platforms retain their existing web authentication flow.
 */
async function signInWithNativeGoogle(activeAuth: NonNullable<typeof auth>): Promise<void> {
  const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
  const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true })
  const idToken = result.credential?.idToken
  if (!idToken) throw new CloudError('unknown')
  await signInWithCredential(activeAuth, GoogleAuthProvider.credential(idToken))
}

export async function signInWithGoogle(): Promise<'signed-in' | 'redirecting'> {
  try {
    const { auth: activeAuth } = requireFirebase()
    if (isAndroid) {
      await signInWithNativeGoogle(activeAuth)
      return 'signed-in'
    }
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    if (isMobile || isDesktop) {
      await signInWithRedirect(activeAuth, provider)
      return 'redirecting'
    }
    await signInWithPopup(activeAuth, provider)
    return 'signed-in'
  } catch (error) {
    const mapped = mapError(error)
    // Browsers can still block a popup; redirect is the reliable fallback.
    if (!isAndroid && mapped.code === 'popup_blocked' && auth) {
      try {
        await signInWithRedirect(auth, new GoogleAuthProvider())
        return 'redirecting'
      } catch (redirectError) { throw mapError(redirectError) }
    }
    throw mapped
  }
}

export async function signOutCloud(): Promise<void> {
  try {
    const { auth: activeAuth } = requireFirebase()
    if (isAndroid) {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
      await FirebaseAuthentication.signOut()
    }
    await signOut(activeAuth)
  } catch (error) { throw mapError(error) }
}

export function payloadSize(data: AppData): number {
  try { return new Blob([JSON.stringify(data)]).size } catch { return JSON.stringify(data).length }
}

export async function pushCloudData(data: AppData): Promise<string> {
  const bytes = payloadSize(data)
  if (bytes > MAX_DOCUMENT_BYTES) throw new CloudError('too_large')
  try {
    const user = requireUser()
    const { firestore: db } = requireFirebase()
    const updatedAt = new Date().toISOString()
    await setDoc(doc(db, 'users', user.uid, 'appData', 'main'), {
      version: data.version,
      updatedAt,
      data,
    })
    return updatedAt
  } catch (error) { throw mapError(error) }
}

export async function pullCloudData(): Promise<RemoteData> {
  try {
    const user = requireUser()
    const { firestore: db } = requireFirebase()
    const snapshot = await getDoc(doc(db, 'users', user.uid, 'appData', 'main'))
    if (!snapshot.exists()) return null
    const raw = snapshot.data() as { data?: unknown; updatedAt?: unknown }
    if (!raw.data) return null
    return { data: raw.data, updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '' }
  } catch (error) { throw mapError(error) }
}

export function isCloudReady(): boolean {
  return isFirebaseConfigured() && !!auth?.currentUser
}
