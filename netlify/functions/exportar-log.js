import { connectLambda } from './_lib/db.js';
import { lerLog } from './_lib/log.js';
import { authenticate, requireRole } from './_lib/security.js';

export const handler = async (event) => {
  connectLambda(event);
  const user = authenticate(event);
  if (!requireRole(user, ['administrador'])) {
    return { statusCode: 403, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'forbidden' }) };
  }

  const resultado = await lerLog(1, 5000, {});
  const payload = {
    exportadoEm: new Date().toISOString(),
    total: resultado.total,
    registros: resultado.registros
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="auditlog.json"',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(payload, null, 2)
  };
};
