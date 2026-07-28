import { readDb, writeDb, connectLambda } from './_lib/db.js';
import {
  authenticate,
  verifyPassword,
  hashPassword,
  signToken,
  json,
  parseBody
} from './_lib/security.js';

const TAMANHO_MINIMO = 8;

export const handler = async (event) => {
  connectLambda(event);
  const sessao = authenticate(event);
  if (!sessao) return json(401, { error: 'unauthorized' });
  if (event.httpMethod !== 'PUT') return json(405, { error: 'method_not_allowed' });

  let body;
  try {
    body = parseBody(event, 5000);
  } catch (e) {
    return json(400, { error: e.message });
  }

  const senhaAtual = typeof body.senhaAtual === 'string' ? body.senhaAtual : '';
  const novaSenha = typeof body.novaSenha === 'string' ? body.novaSenha : '';

  if (novaSenha.length < TAMANHO_MINIMO) return json(400, { error: 'senha_curta' });
  if (novaSenha === senhaAtual) return json(400, { error: 'senha_igual' });

  const db = await readDb();
  db.usuarios = db.usuarios || [];
  const idx = db.usuarios.findIndex((u) => u.id === sessao.sub);
  if (idx === -1) return json(404, { error: 'not_found' });

  const usuario = db.usuarios[idx];
  if (usuario.ativo === false) return json(403, { error: 'forbidden' });
  if (!verifyPassword(senhaAtual, usuario.senha)) return json(400, { error: 'senha_atual_incorreta' });

  usuario.senha = hashPassword(novaSenha);
  usuario.mustChangePassword = false;
  db.usuarios[idx] = usuario;
  await writeDb(db);

  const token = signToken({
    sub: usuario.id,
    username: usuario.username,
    role: usuario.role,
    nome: usuario.nome,
    mustChange: false
  });

  return json(200, {
    token,
    user: {
      id: usuario.id,
      username: usuario.username,
      role: usuario.role,
      nome: usuario.nome,
      mustChange: false
    }
  });
};
