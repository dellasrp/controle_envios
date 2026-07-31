import crypto from 'crypto';
import { readDb, writeDb, connectLambda } from './_lib/db.js';
import { gravarLog } from './_lib/log.js';
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
  return {
    id: u.id,
    nome: u.nome,
    username: u.username,
    role: u.role,
    ativo: u.ativo !== false,
    senhaProvisoria: u.mustChangePassword === true
  };
}

export const handler = async (event) => {
  connectLambda(event);
  const user = authenticate(event);
  if (!requireRole(user, ['administrador'])) return json(403, { error: 'forbidden' });
  if (user.mustChange === true) return json(403, { error: 'senha_pendente' });

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
      ativo: true,
      mustChangePassword: true
    };
    db.usuarios.push(novo);
    await writeDb(db);
    await gravarLog(event, user, { funcionalidade: 'Usuários', rotina: 'POST /api/usuarios', acao: 'criar_usuario', dadoAnterior: null, dadoAtual: publicUser(novo) });
    return json(201, { usuario: publicUser(novo) });
  }

  if (event.httpMethod === 'PUT') {
    const id = sanitizeString(body.id, 40);
    const idx = db.usuarios.findIndex((u) => u.id === id);
    if (idx === -1) return json(404, { error: 'not_found' });
    const uAnterior = { ...db.usuarios[idx] };
    const u = db.usuarios[idx];
    const anteriorPublico = publicUser(u);
    if (body.nome !== undefined) u.nome = sanitizeString(body.nome, 80) || u.nome;
    if (body.role !== undefined) u.role = sanitizeEnum(body.role, ROLES, u.role);
    if (body.ativo !== undefined) u.ativo = Boolean(body.ativo);
    if (typeof body.senha === 'string' && body.senha.length >= 8) {
      u.senha = hashPassword(body.senha);
      u.mustChangePassword = user.sub !== u.id;
    }
    db.usuarios[idx] = u;
    await writeDb(db);
    await gravarLog(event, user, { funcionalidade: 'Usuários', rotina: 'PUT /api/usuarios', acao: 'editar_usuario', dadoAnterior: anteriorPublico, dadoAtual: publicUser(u) });
    return json(200, { usuario: publicUser(u) });
  }

  if (event.httpMethod === 'DELETE') {
    const id = sanitizeString(body.id, 40);
    if (user.sub === id) return json(400, { error: 'cannot_delete_self' });
    const usuarioRemovido = publicUser(db.usuarios.find((u) => u.id === id) || {});
    const before = db.usuarios.length;
    db.usuarios = db.usuarios.filter((u) => u.id !== id);
    if (db.usuarios.length === before) return json(404, { error: 'not_found' });
    await writeDb(db);
    await gravarLog(event, user, { funcionalidade: 'Usuários', rotina: 'DELETE /api/usuarios', acao: 'excluir_usuario', dadoAnterior: usuarioRemovido, dadoAtual: null });
    return json(200, { ok: true });
  }

  return json(405, { error: 'method_not_allowed' });
};
