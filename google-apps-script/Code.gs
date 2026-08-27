var NEXUS_FILE_NAME = 'NEXUS-HQ-backup.json';
var SESSION_MS = 30 * 24 * 60 * 60 * 1000;
var SESSION_RENEW_MS = 7 * 24 * 60 * 60 * 1000;
var MAX_ATTEMPTS = 8;
var ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
var MAX_DATA_BYTES = 900 * 1024;

/** Health check used before the app saves this deployment URL. */
function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'health') {
    return output_({ ok: true, service: 'nexus-hq-drive', version: 1 });
  }
  return output_({ ok: false, code: 'not_found' });
}

/**
 * All private operations are POST text/plain requests. The request body is never
 * logged. The app sends a PBKDF2-derived verifier, never the Google password or
 * even the plain NEXUS password.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var request = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = String(request.action || '');
    if (action === 'register') return register_(request);
    if (action === 'login') return login_(request);
    if (action === 'logout') return logout_(request);
    if (action === 'me') return me_(request);
    if (action === 'save') return save_(request);
    if (action === 'load') return load_(request);
    return output_({ ok: false, code: 'not_found' });
  } catch (error) {
    return output_({ ok: false, code: error && error.nexusCode ? error.nexusCode : 'server_error' });
  } finally {
    try { lock.releaseLock(); } catch (_) { /* lock was not acquired */ }
  }
}

function register_(request) {
  var email = normalizeEmail_(request.email);
  var credential = String(request.credential || '');
  validateAuth_(email, credential);
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('ACCOUNT_EMAIL')) return output_({ ok: false, code: 'email_in_use' });

  var uid = Utilities.getUuid().replace(/-/g, '');
  props.setProperties({
    ACCOUNT_EMAIL: email,
    ACCOUNT_UID: uid,
    CREDENTIAL_HASH: digest_(credential),
    AUTH_ATTEMPTS: JSON.stringify({ count: 0, resetAt: 0 })
  }, false);
  return createSession_(email, uid);
}

function login_(request) {
  var email = normalizeEmail_(request.email);
  var credential = String(request.credential || '');
  validateAuth_(email, credential);
  checkAttempts_();
  var props = PropertiesService.getScriptProperties();
  var expectedEmail = props.getProperty('ACCOUNT_EMAIL') || '';
  var expectedHash = props.getProperty('CREDENTIAL_HASH') || '';
  if (!expectedEmail || !constantEqual_(email, expectedEmail) || !constantEqual_(digest_(credential), expectedHash)) {
    recordFailure_();
    return output_({ ok: false, code: 'wrong_password' });
  }
  props.setProperty('AUTH_ATTEMPTS', JSON.stringify({ count: 0, resetAt: 0 }));
  return createSession_(expectedEmail, props.getProperty('ACCOUNT_UID'));
}

function logout_(request) {
  var current = session_(request.token, true);
  if (current) {
    var sessions = readSessions_();
    delete sessions[current.tokenHash];
    saveSessions_(sessions);
  }
  return output_({ ok: true });
}

function me_(request) {
  var current = session_(request.token, false);
  return output_({ ok: true, user: { uid: current.uid, email: current.email } });
}

function save_(request) {
  var current = session_(request.token, false);
  if (!request.data || typeof request.data !== 'object' || Array.isArray(request.data)) fail_('unknown');
  var serialized = JSON.stringify(request.data);
  if (Utilities.newBlob(serialized).getBytes().length > MAX_DATA_BYTES) fail_('too_large');
  var file = backupFile_(true);
  file.setContent(serialized);
  file.setDescription('NEXUS HQ local-first JSON backup for ' + current.email);
  var updatedAt = file.getLastUpdated().toISOString();
  return output_({ ok: true, updatedAt: updatedAt, fileName: NEXUS_FILE_NAME });
}

function load_(request) {
  session_(request.token, false);
  var file = backupFile_(false);
  if (!file) return output_({ ok: true, data: null, updatedAt: '' });
  try {
    var data = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
    return output_({ ok: true, data: data, updatedAt: file.getLastUpdated().toISOString(), fileName: NEXUS_FILE_NAME });
  } catch (_) {
    return output_({ ok: false, code: 'server_error' });
  }
}

function backupFile_(create) {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('BACKUP_FILE_ID');
  if (id) {
    try {
      var existing = DriveApp.getFileById(id);
      if (!existing.isTrashed()) return existing;
    } catch (_) { /* deleted file: create another below */ }
    props.deleteProperty('BACKUP_FILE_ID');
  }
  if (!create) return null;
  var file = DriveApp.createFile(NEXUS_FILE_NAME, '{}', MimeType.PLAIN_TEXT);
  props.setProperty('BACKUP_FILE_ID', file.getId());
  return file;
}

function createSession_(email, uid) {
  var token = digest_(Utilities.getUuid() + '|' + Utilities.getUuid() + '|' + new Date().getTime());
  var tokenHash = digest_(token);
  var sessions = readSessions_();
  var now = new Date().getTime();
  Object.keys(sessions).forEach(function (key) {
    if (!sessions[key] || Number(sessions[key].expiresAt) <= now) delete sessions[key];
  });
  sessions[tokenHash] = { email: email, uid: uid, expiresAt: now + SESSION_MS };
  saveSessions_(sessions);
  return output_({ ok: true, token: token, user: { uid: uid, email: email } });
}

function session_(token, optional) {
  token = String(token || '');
  if (!token) {
    if (optional) return null;
    fail_('not_signed_in');
  }
  var tokenHash = digest_(token);
  var sessions = readSessions_();
  var value = sessions[tokenHash];
  var now = new Date().getTime();
  if (!value || Number(value.expiresAt) <= now) {
    if (value) { delete sessions[tokenHash]; saveSessions_(sessions); }
    if (optional) return null;
    fail_('not_signed_in');
  }
  if (Number(value.expiresAt) - now < SESSION_RENEW_MS) {
    value.expiresAt = now + SESSION_MS;
    sessions[tokenHash] = value;
    saveSessions_(sessions);
  }
  return { tokenHash: tokenHash, email: value.email, uid: value.uid };
}

function readSessions_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('SESSIONS') || '{}'); }
  catch (_) { return {}; }
}

function saveSessions_(sessions) {
  PropertiesService.getScriptProperties().setProperty('SESSIONS', JSON.stringify(sessions));
}

function checkAttempts_() {
  var attempts = readAttempts_();
  var now = new Date().getTime();
  if (attempts.resetAt <= now) return;
  if (attempts.count >= MAX_ATTEMPTS) fail_('too_many_requests');
}

function recordFailure_() {
  var props = PropertiesService.getScriptProperties();
  var attempts = readAttempts_();
  var now = new Date().getTime();
  if (attempts.resetAt <= now) attempts = { count: 0, resetAt: now + ATTEMPT_WINDOW_MS };
  attempts.count += 1;
  props.setProperty('AUTH_ATTEMPTS', JSON.stringify(attempts));
}

function readAttempts_() {
  try {
    var value = JSON.parse(PropertiesService.getScriptProperties().getProperty('AUTH_ATTEMPTS') || '{}');
    return { count: Number(value.count) || 0, resetAt: Number(value.resetAt) || 0 };
  } catch (_) { return { count: 0, resetAt: 0 }; }
}

function normalizeEmail_(value) { return String(value || '').trim().toLowerCase(); }

function validateAuth_(email, credential) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) fail_('bad_email');
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(credential)) fail_('weak_password');
}

function digest_(value) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '');
}

function constantEqual_(left, right) {
  left = String(left || ''); right = String(right || '');
  if (left.length !== right.length) return false;
  var difference = 0;
  for (var i = 0; i < left.length; i++) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return difference === 0;
}

function fail_(code) {
  var error = new Error(code);
  error.nexusCode = code;
  throw error;
}

function output_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
