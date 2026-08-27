const PASSWORD_ITERATIONS = 210_000
const encoder = new TextEncoder()

function bytesToBase64(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value) {
  const binary = atob(value)
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

async function derive(password, salt, iterations = PASSWORD_ITERATIONS) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt,
    iterations,
  }, material, 256)
  return new Uint8Array(bits)
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(password, salt)
  return { salt: bytesToBase64(salt), hash: bytesToBase64(hash), iterations: PASSWORD_ITERATIONS }
}

export async function verifyPassword(password, stored) {
  const actual = await derive(password, base64ToBytes(stored.salt), stored.iterations)
  return constantTimeEqual(actual, base64ToBytes(stored.hash))
}

export async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return bytesToBase64(new Uint8Array(digest))
}

export function randomToken(bytes = 32) {
  const value = crypto.getRandomValues(new Uint8Array(bytes))
  return bytesToBase64(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false
  let difference = 0
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i]
  return difference === 0
}

export { PASSWORD_ITERATIONS }
