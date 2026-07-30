import { readDb, connectLambda } from './_lib/db.js';
import { authenticate, requireRole, json } from './_lib/security.js';

export const handler = async (event) => {
  connectLambda(event);
  const user = authenticate(event);
  if (!requireRole(user, ['administrador'])) return json(403, { error: 'forbidden' });

  const db = await readDb();

  const seguro = {
    exportadoEm: new Date().toISOString(),
    seedVersion: db.seedVersion,
    prazos: db.prazos,
    clientes: db.clientes,
    usuarios: (db.usuarios || []).map((u) => ({
      id: u.id,
      nome: u.nome,
      username: u.username,
      role: u.role,
      ativo: u.ativo,
      mustChangePassword: u.mustChangePassword || false,
      senha: u.senha
    }))
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="backup-controle-envios.json"',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(seguro, null, 2)
  };
};
