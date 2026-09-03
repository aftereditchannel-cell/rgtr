export type CloudProvider = 'googleDrive'

export type CloudCode =
  | 'not_configured' | 'not_signed_in' | 'bad_email' | 'weak_password'
  | 'email_in_use' | 'wrong_password' | 'user_not_found' | 'too_many_requests'
  | 'network' | 'permission' | 'provider_disabled' | 'firestore_missing'
  | 'bad_firebase_config' | 'too_large' | 'unknown'

export class CloudError extends Error {
  code: CloudCode
  detail: string
  constructor(code: CloudCode, detail = '') {
    super(code)
    this.code = code
    this.detail = detail
    this.name = 'CloudError'
  }
}

export interface CloudUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

export type RemoteData = { data: unknown; updatedAt: string } | null
