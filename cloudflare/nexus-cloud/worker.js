import { DurableObject } from 'cloudflare:workers'
import { hashPassword, verifyPassword, randomToken, sha256 } from './crypto.js'

const MAX_BODY_BYTES = 1024 * 1024
const MAX_DATA_BYTES = 900 * 1024
const SESSION_MS = 30 * 24 * 60 * 60 * 1000
const SESSION_RENEW_MS = 7 * 24 * 60 * 60 * 1000
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 8
const API_PATHS = new Set(['/auth/register', '/auth/login', '/auth/logout', '/me', '/data'])

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  })
}

async function readJson(request) {
  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new ApiFailure('too_large', 413)
  try { return JSON.parse(text || '{}') }
  catch { throw new ApiFailure('bad_request', 400) }
}

class ApiFailure extends Error {
  constructor(code, status = 400) {
    super(code)
    this.code = code
    this.status = status
  }
}

function validEmail(email) {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export class NexusCloud extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env)
    this.sql = ctx.storage.sql
    ctx.blockConcurrencyWhile(async () => {
      this.sql.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          password_salt TEXT NOT NULL,
          password_iterations INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
          token_hash TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
        CREATE TABLE IF NOT EXISTS app_data (
          user_id TEXT PRIMARY KEY,
          version INTEGER NOT NULL,
          updated_at TEXT NOT NULL,
          data_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS auth_attempts (
          attempt_key TEXT PRIMARY KEY,
          attempt_count INTEGER NOT NULL,
          reset_at INTEGER NOT NULL
        );
      `)
    })
  }

  async fetch(request) {
    try {
      const url = new URL(request.url)
      if (request.method === 'POST' && url.pathname === '/auth/register') return await this.register(request)
      if (request.method === 'POST' && url.pathname === '/auth/login') return await this.login(request)
      if (request.method === 'POST' && url.pathname === '/auth/logout') return await this.logout(request)
      if (request.method === 'GET' && url.pathname === '/me') return await this.me(request)
      if (request.method === 'GET' && url.pathname === '/data') return await this.getData(request)
      if (request.method === 'PUT' && url.pathname === '/data') return await this.putData(request)
      return json({ ok: false, code: 'not_found' }, 404)
    } catch (error) {
      if (error instanceof ApiFailure) return json({ ok: false, code: error.code }, error.status)
      return json({ ok: false, code: 'server_error' }, 500)
    }
  }

  attemptKey(request, email) {
    const client = request.headers.get('X-Nexus-Client') || 'unknown'
    return sha256(`${client}|${email}`)
  }

  async checkAttempts(request, email) {
    const key = await this.attemptKey(request, email)
    const now = Date.now()
    const row = this.sql.exec('SELECT attempt_count, reset_at FROM auth_attempts WHERE attempt_key = ?', key).toArray()[0]
    if (!row) return key
    if (Number(row.reset_at) <= now) {
      this.sql.exec('DELETE FROM auth_attempts WHERE attempt_key = ?', key)
      return key
    }
    if (Number(row.attempt_count) >= MAX_ATTEMPTS) throw new ApiFailure('too_many_requests', 429)
    return key
  }

  recordFailure(key) {
    const now = Date.now()
    const row = this.sql.exec('SELECT attempt_count, reset_at FROM auth_attempts WHERE attempt_key = ?', key).toArray()[0]
    if (!row || Number(row.reset_at) <= now) {
      this.sql.exec('INSERT OR REPLACE INTO auth_attempts (attempt_key, attempt_count, reset_at) VALUES (?, 1, ?)', key, now + ATTEMPT_WINDOW_MS)
    } else {
      this.sql.exec('UPDATE auth_attempts SET attempt_count = attempt_count + 1 WHERE attempt_key = ?', key)
    }
  }

  async register(request) {
    const body = await readJson(request)
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    if (!validEmail(email)) throw new ApiFailure('bad_email')
    if (password.length < 8 || password.length > 128) throw new ApiFailure('weak_password')
    const attemptKey = await this.checkAttempts(request, email)
    if (this.sql.exec('SELECT id FROM users WHERE email = ?', email).toArray().length) {
      this.recordFailure(attemptKey)
      throw new ApiFailure('email_in_use', 409)
    }

    const secured = await hashPassword(password)
    const uid = crypto.randomUUID()
    const now = Date.now()
    try {
      this.sql.exec(
        'INSERT INTO users (id, email, password_hash, password_salt, password_iterations, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        uid, email, secured.hash, secured.salt, secured.iterations, now,
      )
    } catch { throw new ApiFailure('email_in_use', 409) }
    this.sql.exec('DELETE FROM auth_attempts WHERE attempt_key = ?', attemptKey)
    return this.createSession(uid, email)
  }

  async login(request) {
    const body = await readJson(request)
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    if (!validEmail(email)) throw new ApiFailure('bad_email')
    const attemptKey = await this.checkAttempts(request, email)
    const user = this.sql.exec(
      'SELECT id, email, password_hash, password_salt, password_iterations FROM users WHERE email = ?', email,
    ).toArray()[0]
    const valid = user && await verifyPassword(password, {
      hash: String(user.password_hash),
      salt: String(user.password_salt),
      iterations: Number(user.password_iterations),
    })
    if (!valid) {
      this.recordFailure(attemptKey)
      throw new ApiFailure('wrong_password', 401)
    }
    this.sql.exec('DELETE FROM auth_attempts WHERE attempt_key = ?', attemptKey)
    return this.createSession(String(user.id), String(user.email))
  }

  async createSession(uid, email) {
    const token = randomToken()
    const tokenHash = await sha256(token)
    const now = Date.now()
    this.sql.exec('DELETE FROM sessions WHERE expires_at <= ?', now)
    this.sql.exec(
      'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
      tokenHash, uid, now, now + SESSION_MS,
    )
    return json({ ok: true, token, user: { uid, email } })
  }

  async session(request, optional = false) {
    const auth = request.headers.get('Authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
    if (!token) {
      if (optional) return null
      throw new ApiFailure('not_signed_in', 401)
    }
    const tokenHash = await sha256(token)
    const row = this.sql.exec(
      `SELECT s.token_hash, s.user_id, s.expires_at, u.email
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`,
      tokenHash,
    ).toArray()[0]
    const now = Date.now()
    if (!row || Number(row.expires_at) <= now) {
      if (row) this.sql.exec('DELETE FROM sessions WHERE token_hash = ?', tokenHash)
      throw new ApiFailure('not_signed_in', 401)
    }
    if (Number(row.expires_at) - now < SESSION_RENEW_MS) {
      this.sql.exec('UPDATE sessions SET expires_at = ? WHERE token_hash = ?', now + SESSION_MS, tokenHash)
    }
    return { tokenHash, uid: String(row.user_id), email: String(row.email) }
  }

  async logout(request) {
    const current = await this.session(request, true)
    if (current) this.sql.exec('DELETE FROM sessions WHERE token_hash = ?', current.tokenHash)
    return json({ ok: true })
  }

  async me(request) {
    const current = await this.session(request)
    return json({ ok: true, user: { uid: current.uid, email: current.email } })
  }

  async getData(request) {
    const current = await this.session(request)
    const row = this.sql.exec('SELECT version, updated_at, data_json FROM app_data WHERE user_id = ?', current.uid).toArray()[0]
    if (!row) return json({ ok: true, data: null, updatedAt: '' })
    try {
      return json({ ok: true, version: Number(row.version), updatedAt: String(row.updated_at), data: JSON.parse(String(row.data_json)) })
    } catch { throw new ApiFailure('server_error', 500) }
  }

  async putData(request) {
    const current = await this.session(request)
    const body = await readJson(request)
    if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) throw new ApiFailure('bad_request')
    const dataJson = JSON.stringify(body.data)
    if (new TextEncoder().encode(dataJson).byteLength > MAX_DATA_BYTES) throw new ApiFailure('too_large', 413)
    const updatedAt = new Date().toISOString()
    const version = Number(body.version) || 1
    this.sql.exec(
      `INSERT INTO app_data (user_id, version, updated_at, data_json) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET version = excluded.version, updated_at = excluded.updated_at, data_json = excluded.data_json`,
      current.uid, version, updatedAt, dataJson,
    )
    return json({ ok: true, updatedAt })
  }
}

function corsHeaders(request) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
    'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'authorization, content-type',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) })
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true, service: 'nexus-hq-cloud', version: 1 }, 200, corsHeaders(request))
    }
    if (!API_PATHS.has(url.pathname)) return json({ ok: false, code: 'not_found' }, 404, corsHeaders(request))
    const declared = Number(request.headers.get('Content-Length') || 0)
    if (declared > MAX_BODY_BYTES) return json({ ok: false, code: 'too_large' }, 413, corsHeaders(request))

    const headers = new Headers(request.headers)
    headers.set('X-Nexus-Client', request.headers.get('CF-Connecting-IP') || 'unknown')
    headers.delete('Cookie')
    const body = request.method === 'GET' ? undefined : await request.arrayBuffer()
    const inner = new Request(`https://nexus.internal${url.pathname}`, { method: request.method, headers, body })
    const response = await env.NEXUS_CLOUD.getByName('primary').fetch(inner)
    const outputHeaders = new Headers(response.headers)
    for (const [key, value] of Object.entries(corsHeaders(request))) outputHeaders.set(key, value)
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: outputHeaders })
  },
}
