import { readDb } from './_lib/db.js';
import { verifyPassword, signToken, json, parseBody, sanitizeString } from './_lib/security.js';

const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function throttled(key) {
  const rec = attempts.get(key);
  if (!rec) return false;
  if (Date.now() - rec.first > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}

function registerFail(key) {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.first > WINDOW_MS) {
    attempts.set(key, { first: now, count: 1 });
    return;
  }
  rec.count += 1;
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });

  let body;
  try {
    body = parseBody(event);
  } catch (e) {
    return json(400, { error: e.message });
  }

  const username = sanitizeString(body.username, 60).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const ip = (event.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  const key = `${ip}:${username}`;

  if (throttled(key)) return json(429, { error: 'too_many_attempts' });
  if (!username || !password) return json(400, { error: 'missing_credentials' });

  const db = await readDb();
  const user = (db.usuarios || []).find((u) => u.username === username && u.ativo !== false);

  if (!user || !verifyPassword(password, user.senha)) {
    registerFail(key);
    return json(401, { error: 'invalid_credentials' });
  }

  attempts.delete(key);
  const token = signToken({ sub: user.id, username: user.username, role: user.role, nome: user.nome });
  return json(200, {
    token,
    user: { id: user.id, username: user.username, role: user.role, nome: user.nome }
  });
};
