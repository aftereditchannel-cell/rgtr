/*
 * NEXUS HQ — private Firebase relay for Cloudflare Workers.
 *
 * This is deliberately NOT a general-purpose proxy:
 *   - only three Firebase hosts are accepted;
 *   - Auth calls must use this app's public Firebase API key;
 *   - Firestore calls must target this app's project and carry an ID token;
 *   - no request body, password, token, or response is logged/stored;
 *   - responses are never cached.
 */

const PROJECT_ID = 'nexus-hq-c42cd'
const FIREBASE_API_KEY = 'AIzaSyByoWZR-6Gna7LerhD2UEMKiP-HbTmLt0Y'
const ALLOWED_HOSTS = new Set([
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firestore.googleapis.com',
])
const ALLOWED_METHODS = new Set(['GET', 'POST', 'OPTIONS'])

function corsHeaders(request) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers')
      || 'authorization, content-type, x-client-version, x-firebase-gmpid, x-goog-api-client',
    'Access-Control-Expose-Headers': 'content-type, x-http-session-id, x-nexus-relay',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'X-Nexus-Relay': '1',
  }
}

function json(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function parseTarget(requestUrl) {
  const incoming = new URL(requestUrl)
  const prefix = '/firebase/'
  if (!incoming.pathname.startsWith(prefix)) return null
  const rest = incoming.pathname.slice(prefix.length)
  const slash = rest.indexOf('/')
  if (slash <= 0) return null
  const host = rest.slice(0, slash).toLowerCase()
  if (!ALLOWED_HOSTS.has(host)) return null
  const pathname = rest.slice(slash) || '/'
  return { incoming, host, target: new URL(`https://${host}${pathname}${incoming.search}`) }
}

function requestAllowed(request, parsed) {
  if (!ALLOWED_METHODS.has(request.method)) return { ok: false, status: 405, error: 'method_not_allowed' }

  if (parsed.host === 'identitytoolkit.googleapis.com' || parsed.host === 'securetoken.googleapis.com') {
    if (parsed.target.searchParams.get('key') !== FIREBASE_API_KEY) {
      return { ok: false, status: 403, error: 'wrong_firebase_project' }
    }
    return { ok: true }
  }

  // Firestore SDK uses either a REST project path or WebChannel's database query.
  const database = decodeURIComponent(parsed.target.searchParams.get('database') || '')
  const projectPath = `/projects/${PROJECT_ID}/`
  const correctProject = parsed.target.pathname.includes(projectPath)
    || database.startsWith(`projects/${PROJECT_ID}/databases/`)
  if (!correctProject) return { ok: false, status: 403, error: 'wrong_firebase_project' }

  const auth = request.headers.get('Authorization') || ''
  if (!auth.startsWith('Bearer ') || auth.length < 20) {
    return { ok: false, status: 401, error: 'firebase_id_token_required' }
  }
  return { ok: true }
}

export async function handleRequest(request, upstreamFetch = fetch) {
  const url = new URL(request.url)

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) })
  if (url.pathname === '/health' && request.method === 'GET') {
    return json(request, { ok: true, service: 'nexus-hq-firebase-relay', project: PROJECT_ID })
  }

  const parsed = parseTarget(request.url)
  if (!parsed) return json(request, { ok: false, error: 'target_not_allowed' }, 404)
  const permission = requestAllowed(request, parsed)
  if (!permission.ok) return json(request, { ok: false, error: permission.error }, permission.status)

  const headers = new Headers(request.headers)
  // این هدرها مربوط به کاربر→Worker هستند و نباید به Google جعل شوند.
  for (const name of ['host', 'origin', 'referer', 'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'x-forwarded-for']) {
    headers.delete(name)
  }
  headers.set('Cache-Control', 'no-store')

  try {
    const upstream = await upstreamFetch(parsed.target.toString(), {
      method: request.method,
      headers,
      body: request.method === 'GET' ? undefined : request.body,
      redirect: 'follow',
    })
    const responseHeaders = new Headers(upstream.headers)
    responseHeaders.delete('set-cookie')
    responseHeaders.set('Access-Control-Allow-Origin', '*')
    responseHeaders.set('Access-Control-Expose-Headers', 'content-type, x-http-session-id, x-nexus-relay')
    responseHeaders.set('Cache-Control', 'no-store, max-age=0')
    responseHeaders.set('X-Content-Type-Options', 'nosniff')
    responseHeaders.set('X-Nexus-Relay', '1')
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders })
  } catch {
    // جزئیات شبکه یا درخواست کاربر لاگ نمی‌شود.
    return json(request, { ok: false, error: 'upstream_unavailable' }, 502)
  }
}

export default {
  fetch(request) {
    return handleRequest(request)
  },
}
