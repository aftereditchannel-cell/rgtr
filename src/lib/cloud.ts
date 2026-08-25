import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore'
import type { AppData } from '../store/types'
import { auth, firestore, isFirebaseConfigured } from './firebase'

const MAX_DOCUMENT_BYTES = 900 * 1024

export type CloudCode =
  | 'not_configured' | 'not_signed_in' | 'bad_email' | 'weak_password'
  | 'email_in_use' | 'wrong_password' | 'user_not_found' | 'too_many_requests'
  | 'network' | 'permission' | 'provider_disabled' | 'firestore_missing'
  | 'bad_firebase_config' | 'too_large' | 'unknown'

export class CloudError extends Error {
  code: CloudCode
  /** Firebase code is safe to show and makes support/debugging possible without exposing credentials. */
  detail: string
  constructor(code: CloudCode, detail = '') { super(code); this.code = code; this.detail = detail; this.name = 'CloudError' }
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

export function mapCloudError(error: unknown): CloudError {
  if (error instanceof CloudError) return error
  const rawCode = String((error as { code?: string })?.code ?? '')
  const detail = `${rawCode} ${String((error as Error)?.message ?? '')}`.toLowerCase()
  if (detail.includes('invalid-email')) return new CloudError('bad_email', rawCode)
  if (detail.includes('weak-password')) return new CloudError('weak_password', rawCode)
  if (detail.includes('email-already-in-use')) return new CloudError('email_in_use', rawCode)
  if (detail.includes('wrong-password') || detail.includes('invalid-credential')) return new CloudError('wrong_password', rawCode)
  if (detail.includes('user-not-found')) return new CloudError('user_not_found', rawCode)
  if (detail.includes('too-many-requests')) return new CloudError('too_many_requests', rawCode)
  if (detail.includes('operation-not-allowed') || detail.includes('operation-not-supported')) return new CloudError('provider_disabled', rawCode)
  if (detail.includes('permission-denied')) return new CloudError('permission', rawCode)
  if (detail.includes('failed-precondition')) return new CloudError('firestore_missing', rawCode)
  if (detail.includes('api-key-not-valid') || detail.includes('invalid-api-key') || detail.includes('app-not-authorized')) return new CloudError('bad_firebase_config', rawCode)
  if (detail.includes('network') || detail.includes('timeout') || detail.includes('unavailable')) return new CloudError('network', rawCode)
  console.warn('[NEXUS HQ] Firebase sync failed', error)
  return new CloudError('unknown', rawCode || String((error as Error)?.message ?? '').slice(0, 120))
}

/** نشست ایمیل/رمز را روی دستگاه نگه می‌دارد؛ هیچ redirect یا Google login وجود ندارد. */
export async function initCloudAuth(): Promise<void> {
  if (!isFirebaseConfigured()) return
  if (!authReady) {
    authReady = (async () => {
      const { auth: activeAuth } = requireFirebase()
      await setPersistence(activeAuth, browserLocalPersistence)
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

export async function signInWithEmail(email: string, password: string): Promise<void> {
  try {
    const { auth: activeAuth } = requireFirebase()
    await signInWithEmailAndPassword(activeAuth, email.trim(), password)
  } catch (error) { throw mapCloudError(error) }
}

export async function createEmailAccount(email: string, password: string): Promise<void> {
  try {
    const { auth: activeAuth } = requireFirebase()
    await createUserWithEmailAndPassword(activeAuth, email.trim(), password)
  } catch (error) { throw mapCloudError(error) }
}

export async function signOutCloud(): Promise<void> {
  try {
    const { auth: activeAuth } = requireFirebase()
    await signOut(activeAuth)
  } catch (error) { throw mapCloudError(error) }
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
    await setDoc(doc(db, 'users', user.uid, 'appData', 'main'), { version: data.version, updatedAt, data })
    return updatedAt
  } catch (error) { throw mapCloudError(error) }
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
  } catch (error) { throw mapCloudError(error) }
}

/** شنونده‌ی لحظه‌ای Firestore؛ با تغییر دستگاه دیگر فوراً callback صدا زده می‌شود. */
export function watchCloudData(callback: (data: RemoteData) => void, onError: (error: CloudError) => void): Unsubscribe {
  try {
    const user = requireUser()
    const { firestore: db } = requireFirebase()
    return onSnapshot(doc(db, 'users', user.uid, 'appData', 'main'), snapshot => {
      if (!snapshot.exists()) { callback(null); return }
      const raw = snapshot.data() as { data?: unknown; updatedAt?: unknown }
      callback(raw.data ? { data: raw.data, updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '' } : null)
    }, error => onError(mapCloudError(error)))
  } catch (error) {
    onError(mapCloudError(error))
    return () => {}
  }
}

export function isCloudReady(): boolean {
  return isFirebaseConfigured() && !!auth?.currentUser
}
