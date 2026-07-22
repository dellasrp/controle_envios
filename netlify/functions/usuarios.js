import crypto from 'crypto';
import { readDb, writeDb } from './_lib/db.js';
import {
  authenticate,
  requireRole,
  json,
  parseBody,
  sanitizeString,
  sanitizeEnum,
  hashPassword
} from './_lib/security.js';

const ROLES = ['diretoria', 'operacional', 'administrador'];

function publicUser(u) {
  return { id: u.id, nome: u.nome, username: u.username, role: u.role, ativo: u.ativo !== false };
}

export const handler = async (event) => {
  const user = authenticate(event);
  if (!requireRole(user, ['administrador'])) return json(403, { error: 'forbidden' });

  const db = await readDb();
  db.usuarios = db.usuarios || [];

  if (event.httpMethod === 'GET') {
    return json(200, { usuarios: db.usuarios.map(publicUser) });
  }

  let body;
  try {
    body = parseBody(event);
  } catch (e) {
    return json(400, { error: e.message });
  }

  if (event.httpMethod === 'POST') {
    const nome = sanitizeString(body.nome, 80);
    const username = sanitizeString(body.username, 60).toLowerCase();
    const role = sanitizeEnum(body.role, ROLES, 'operacional');
    const senha = typeof body.senha === 'string' ? body.senha : '';
    if (!nome || !username || senha.length < 8) return json(400, { error: 'invalid_payload' });
    if (db.usuarios.some((u) => u.username === username)) return json(409, { error: 'username_taken' });
    const novo = {
      id: crypto.randomUUID(),
      nome,
      username,
      role,
      senha: hashPassword(senha),
      ativo: true
    };
    db.usuarios.push(novo);
    await writeDb(db);
    return json(201, { usuario: publicUser(novo) });
  }

  if (event.httpMethod === 'PUT') {
    const id = sanitizeString(body.id, 40);
    const idx = db.usuarios.findIndex((u) => u.id === id);
    if (idx === -1) return json(404, { error: 'not_found' });
    const u = db.usuarios[idx];
    if (body.nome !== undefined) u.nome = sanitizeString(body.nome, 80) || u.nome;
    if (body.role !== undefined) u.role = sanitizeEnum(body.role, ROLES, u.role);
    if (body.ativo !== undefined) u.ativo = Boolean(body.ativo);
    if (typeof body.senha === 'string' && body.senha.length >= 8) u.senha = hashPassword(body.senha);
    db.usuarios[idx] = u;
    await writeDb(db);
    return json(200, { usuario: publicUser(u) });
  }

  if (event.httpMethod === 'DELETE') {
    const id = sanitizeString(body.id, 40);
    if (user.sub === id) return json(400, { error: 'cannot_delete_self' });
    const before = db.usuarios.length;
    db.usuarios = db.usuarios.filter((u) => u.id !== id);
    if (db.usuarios.length === before) return json(404, { error: 'not_found' });
    await writeDb(db);
    return json(200, { ok: true });
  }

  return json(405, { error: 'method_not_allowed' });
};
