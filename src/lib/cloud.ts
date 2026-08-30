import type { AppData } from '../store/types'
import * as drive from './googleDriveCloud'
import { CloudError, type CloudCode, type CloudProvider, type CloudUser, type RemoteData } from './cloudTypes'

export { CloudError }
export type { CloudCode, CloudProvider, CloudUser, RemoteData }

const MAX_DOCUMENT_BYTES = 900 * 1024
const userListeners = new Set<(user: CloudUser | null) => void>()
let driveUserOff: (() => void) | null = null

function emitUser() {
  const user = getCurrentUser()
  for (const listener of userListeners) listener(user)
}

function ensureUserBridges() {
  if (!driveUserOff) {
    driveUserOff = drive.watchUser(() => {
      emitUser()
    })
  }
}

export function configureCloudProvider(_provider: CloudProvider, googleScriptUrl = ''): void {
  drive.configure(googleScriptUrl)
  ensureUserBridges()
  emitUser()
  void initCloudAuth().then(emitUser).catch(() => {})
}

export function getCloudProvider(): CloudProvider { return 'googleDrive' }
export function normalizeGoogleScriptUrl(value: string): string { return drive.normalizeGoogleScriptUrl(value) }
export function testGoogleScriptEndpoint(value: string): Promise<boolean> { return drive.health(value) }

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
  if (detail.includes('network') || detail.includes('timeout') || detail.includes('unavailable') || detail.includes('fetch')) return new CloudError('network', rawCode)
  console.warn(`[NEXUS HQ] Google Drive sync failed`, error)
  return new CloudError('unknown', rawCode || String((error as Error)?.message ?? '').slice(0, 120))
}

export async function initCloudAuth(): Promise<void> {
  ensureUserBridges()
  await drive.init()
}

export function getCurrentUser(): CloudUser | null {
  return drive.getCurrentUser()
}

export function watchCloudUser(callback: (user: CloudUser | null) => void): () => void {
  userListeners.add(callback)
  ensureUserBridges()
  callback(getCurrentUser())
  return () => { userListeners.delete(callback) }
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  try {
    await drive.signIn(email, password)
  } catch (error) { throw mapCloudError(error) }
}

export async function createEmailAccount(email: string, password: string): Promise<void> {
  try {
    await drive.createAccount(email, password)
  } catch (error) { throw mapCloudError(error) }
}

export async function signOutCloud(): Promise<void> {
  try {
    await drive.signOut()
  } catch (error) { throw mapCloudError(error) }
}

export function payloadSize(data: AppData): number {
  try { return new Blob([JSON.stringify(data)]).size } catch { return JSON.stringify(data).length }
}

export async function pushCloudData(data: AppData): Promise<string> {
  if (payloadSize(data) > MAX_DOCUMENT_BYTES) throw new CloudError('too_large')
  try {
    return await drive.push(data)
  } catch (error) { throw mapCloudError(error) }
}

export async function pullCloudData(): Promise<RemoteData> {
  try {
    return await drive.pull()
  } catch (error) { throw mapCloudError(error) }
}

export function watchCloudData(_callback: (data: RemoteData) => void, _onError: (error: CloudError) => void): () => void {
  // Google Drive only supports manual pull, no live sync
  return () => {}
}

export function isCloudReady(): boolean {
  return drive.isReady()
}
