import crypto from 'crypto';

const SECRET = process.env.SESSION_SECRET || 'dev-insecure-secret-change-me';
const TOKEN_TTL_SECONDS = 60 * 60 * 8;

function b64urlJson(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const derived = crypto.scryptSync(String(password), salt, 64);
  const hashBuf = Buffer.from(hash, 'hex');
  if (hashBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(hashBuf, derived);
}

export function signToken(payload) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64urlJson({ alg: 'HS256', typ: 'JWT' });
  const data = b64urlJson({ ...payload, iat: now, exp: now + TOKEN_TTL_SECONDS });
  const sig = crypto.createHmac('sha256', SECRET).update(`${header}.${data}`).digest('base64url');
  return `${header}.${data}.${sig}`;
}

export function verifyToken(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, data, sig] = parts;
  const expected = crypto.createHmac('sha256', SECRET).update(`${header}.${data}`).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  let body;
  try {
    body = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  if (typeof body.exp !== 'number' || body.exp < now) return null;
  return body;
}

export function getBearer(event) {
  const h = event.headers || {};
  const auth = h.authorization || h.Authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

export function authenticate(event) {
  const token = getBearer(event);
  if (!token) return null;
  return verifyToken(token);
}

export function requireRole(user, roles) {
  if (!user) return false;
  return roles.includes(user.role);
}

export function sanitizeString(value, max = 500) {
  if (value === null || value === undefined) return '';
  let s = String(value);
  s = s.replace(/[\u0000-\u001f\u007f]/g, '');
  s = s.replace(/[<>]/g, '');
  s = s.trim();
  if (s.length > max) s = s.slice(0, max);
  return s;
}

export function sanitizeEnum(value, allowed, fallback) {
  const s = sanitizeString(value, 40);
  return allowed.includes(s) ? s : fallback;
}

export function json(statusCode, payload) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(payload)
  };
}

export function parseBody(event, maxBytes = 100000) {
  if (!event.body) return {};
  if (event.body.length > maxBytes) throw new Error('payload_too_large');
  try {
    return JSON.parse(event.body);
  } catch {
    throw new Error('invalid_json');
  }
}
