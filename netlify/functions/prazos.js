import { readDb, writeDb, connectLambda } from './_lib/db.js';
import { authenticate, requireRole, json, parseBody, sanitizeString } from './_lib/security.js';

const PERIODOS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', 'anual'];

function sanitizeAno(ano) {
  const s = sanitizeString(ano, 4);
  return /^[0-9]{4}$/.test(s) ? s : null;
}

function sanitizeData(v) {
  const s = sanitizeString(v, 20);
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s) ? s : null;
}

export const handler = async (event) => {
  connectLambda(event);
  const user = authenticate(event);
  if (!user) return json(401, { error: 'unauthorized' });

  const db = await readDb();
  db.prazos = db.prazos || {};

  if (event.httpMethod === 'GET') {
    return json(200, { prazos: db.prazos });
  }

  if (!requireRole(user, ['administrador'])) return json(403, { error: 'forbidden' });

  let body;
  try {
    body = parseBody(event, 20000);
  } catch (e) {
    return json(400, { error: e.message });
  }

  if (event.httpMethod === 'PUT') {
    const ano = sanitizeAno(body.ano);
    if (!ano) return json(400, { error: 'ano_invalido' });
    const origem = body.periodos && typeof body.periodos === 'object' ? body.periodos : {};
    const periodosAno = {};
    for (const p of PERIODOS) {
      periodosAno[p] = sanitizeData(origem[p]);
    }
    db.prazos[ano] = periodosAno;
    await writeDb(db);
    return json(200, { ano, periodos: periodosAno });
  }

  return json(405, { error: 'method_not_allowed' });
};
