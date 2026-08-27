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
import * as drive from './googleDriveCloud'
import { CloudError, type CloudCode, type CloudProvider, type CloudUser, type RemoteData } from './cloudTypes'

export { CloudError }
export type { CloudCode, CloudProvider, CloudUser, RemoteData }

const MAX_DOCUMENT_BYTES = 900 * 1024
let activeProvider: CloudProvider = 'firebase'
let firebaseAuthReady: Promise<void> | null = null
const userListeners = new Set<(user: CloudUser | null) => void>()
let firebaseUserOff: (() => void) | null = null
let driveUserOff: (() => void) | null = null

function currentFirebaseUser(): CloudUser | null {
  if (!isFirebaseConfigured() || !auth?.currentUser) return null
  const { uid, displayName, email, photoURL } = auth.currentUser
  return { uid, displayName, email, photoURL }
}

function emitUser() {
  const user = getCurrentUser()
  for (const listener of userListeners) listener(user)
}

function ensureUserBridges() {
  if (!firebaseUserOff && isFirebaseConfigured() && auth) {
    firebaseUserOff = onAuthStateChanged(auth, () => {
      if (activeProvider === 'firebase') emitUser()
    })
  }
  if (!driveUserOff) {
    driveUserOff = drive.watchUser(() => {
      if (activeProvider === 'googleDrive') emitUser()
    })
  }
}

/** تغییر سرویس، نشست سرویس دیگر را پاک نمی‌کند. */
export function configureCloudProvider(provider: CloudProvider, googleScriptUrl = ''): void {
  activeProvider = provider === 'googleDrive' ? 'googleDrive' : 'firebase'
  drive.configure(googleScriptUrl)
  ensureUserBridges()
  emitUser()
  void initCloudAuth().then(emitUser).catch(() => {})
}

export function getCloudProvider(): CloudProvider { return activeProvider }
export function normalizeGoogleScriptUrl(value: string): string { return drive.normalizeGoogleScriptUrl(value) }
export function testGoogleScriptEndpoint(value: string): Promise<boolean> { return drive.health(value) }

function requireFirebase() {
  if (!isFirebaseConfigured() || !auth || !firestore) throw new CloudError('not_configured')
  return { auth, firestore }
}

function requireFirebaseUser(): User {
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
  if (detail.includes('network') || detail.includes('timeout') || detail.includes('unavailable') || detail.includes('fetch')) return new CloudError('network', rawCode)
  console.warn(`[NEXUS HQ] ${activeProvider} sync failed`, error)
  return new CloudError('unknown', rawCode || String((error as Error)?.message ?? '').slice(0, 120))
}

export async function initCloudAuth(): Promise<void> {
  ensureUserBridges()
  if (activeProvider === 'googleDrive') {
    await drive.init()
    return
  }
  if (!isFirebaseConfigured()) return
  if (!firebaseAuthReady) {
    firebaseAuthReady = (async () => {
      const { auth: activeAuth } = requireFirebase()
      try { await setPersistence(activeAuth, browserLocalPersistence) } catch (error) {
        console.warn('[NEXUS HQ] Firebase persistence fallback', error)
      }
    })()
  }
  await firebaseAuthReady
}

export function getCurrentUser(): CloudUser | null {
  return activeProvider === 'googleDrive' ? drive.getCurrentUser() : currentFirebaseUser()
}

export function watchCloudUser(callback: (user: CloudUser | null) => void): () => void {
  userListeners.add(callback)
  ensureUserBridges()
  callback(getCurrentUser())
  return () => { userListeners.delete(callback) }
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  try {
    if (activeProvider === 'googleDrive') await drive.signIn(email, password)
    else {
      const { auth: activeAuth } = requireFirebase()
      await signInWithEmailAndPassword(activeAuth, email.trim(), password)
    }
  } catch (error) { throw mapCloudError(error) }
}

export async function createEmailAccount(email: string, password: string): Promise<void> {
  try {
    if (activeProvider === 'googleDrive') await drive.createAccount(email, password)
    else {
      const { auth: activeAuth } = requireFirebase()
      await createUserWithEmailAndPassword(activeAuth, email.trim(), password)
    }
  } catch (error) { throw mapCloudError(error) }
}

export async function signOutCloud(): Promise<void> {
  try {
    if (activeProvider === 'googleDrive') await drive.signOut()
    else {
      const { auth: activeAuth } = requireFirebase()
      await signOut(activeAuth)
    }
  } catch (error) { throw mapCloudError(error) }
}

export function payloadSize(data: AppData): number {
  try { return new Blob([JSON.stringify(data)]).size } catch { return JSON.stringify(data).length }
}

export async function pushCloudData(data: AppData): Promise<string> {
  if (payloadSize(data) > MAX_DOCUMENT_BYTES) throw new CloudError('too_large')
  try {
    if (activeProvider === 'googleDrive') return await drive.push(data)
    const user = requireFirebaseUser()
    const { firestore: db } = requireFirebase()
    const updatedAt = new Date().toISOString()
    await setDoc(doc(db, 'users', user.uid, 'appData', 'main'), { version: data.version, updatedAt, data })
    return updatedAt
  } catch (error) { throw mapCloudError(error) }
}

export async function pullCloudData(): Promise<RemoteData> {
  try {
    if (activeProvider === 'googleDrive') return await drive.pull()
    const user = requireFirebaseUser()
    const { firestore: db } = requireFirebase()
    const snapshot = await getDoc(doc(db, 'users', user.uid, 'appData', 'main'))
    if (!snapshot.exists()) return null
    const raw = snapshot.data() as { data?: unknown; updatedAt?: unknown }
    if (!raw.data) return null
    return { data: raw.data, updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '' }
  } catch (error) { throw mapCloudError(error) }
}

/** Firebase شنونده زنده دارد؛ دریافت Drive فقط با Refresh دستی است. */
export function watchCloudData(callback: (data: RemoteData) => void, onError: (error: CloudError) => void): Unsubscribe {
  if (activeProvider === 'googleDrive') return () => {}
  try {
    const user = requireFirebaseUser()
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
  return activeProvider === 'googleDrive' ? drive.isReady() : isFirebaseConfigured() && !!auth?.currentUser
}
