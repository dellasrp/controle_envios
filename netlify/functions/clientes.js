import crypto from 'crypto';
import { readDb, writeDb, connectLambda } from './_lib/db.js';
import {
  authenticate,
  requireRole,
  json,
  parseBody,
  sanitizeString,
  sanitizeEnum
} from './_lib/security.js';

const SIM_NAO = ['Sim', 'Não'];
const WEB_DD = ['Web', 'DD', ''];
const PERIODOS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', 'anual'];

function sanitizePeriodo(src) {
  const obj = src && typeof src === 'object' ? src : {};
  return {
    dataValidacao: sanitizeString(obj.dataValidacao, 20),
    tecnico: sanitizeString(obj.tecnico, 120),
    observacoes: sanitizeString(obj.observacoes, 1000),
    contato: sanitizeString(obj.contato, 300)
  };
}

function sanitizeAno(ano) {
  const s = sanitizeString(ano, 4);
  return /^[0-9]{4}$/.test(s) ? s : null;
}

function sanitizePeriodosPorAno(src, anosConhecidos) {
  const out = {};
  const origem = src && typeof src === 'object' ? src : {};
  const anos = new Set(anosConhecidos || []);
  for (const anoRaw of Object.keys(origem)) {
    const ano = sanitizeAno(anoRaw);
    if (ano) anos.add(ano);
  }
  for (const ano of anos) {
    const periodosAno = {};
    const origemAno = origem[ano] && typeof origem[ano] === 'object' ? origem[ano] : {};
    for (const p of PERIODOS) {
      periodosAno[p] = sanitizePeriodo(origemAno[p]);
    }
    out[ano] = periodosAno;
  }
  return out;
}

function sanitizeCliente(body, anosConhecidos) {
  const abertura = body.abertura && typeof body.abertura === 'object' ? body.abertura : {};
  return {
    cliente: sanitizeString(body.cliente, 120),
    integracaoAmCp: sanitizeEnum(body.integracaoAmCp, SIM_NAO, 'Não'),
    clienteComGerador: sanitizeEnum(body.clienteComGerador, SIM_NAO, 'Não'),
    org: sanitizeString(body.org, 40),
    abertura: {
      data: sanitizeString(abertura.data, 20),
      tecnico: sanitizeString(abertura.tecnico, 120),
      webOuDd: sanitizeEnum(abertura.webOuDd, WEB_DD, '')
    },
    periodos: sanitizePeriodosPorAno(body.periodos, anosConhecidos)
  };
}

export const handler = async (event) => {
  connectLambda(event);
  const user = authenticate(event);
  if (!user) return json(401, { error: 'unauthorized' });

  const db = await readDb();
  db.clientes = db.clientes || [];
  const anosConhecidos = Object.keys(db.prazos || {});

  if (event.httpMethod === 'GET') {
    return json(200, { clientes: db.clientes, anos: anosConhecidos });
  }

  if (!requireRole(user, ['operacional', 'administrador'])) return json(403, { error: 'forbidden' });

  let body;
  try {
    body = parseBody(event, 300000);
  } catch (e) {
    return json(400, { error: e.message });
  }

  if (event.httpMethod === 'POST') {
    const data = sanitizeCliente(body, anosConhecidos);
    if (!data.cliente) return json(400, { error: 'cliente_required' });
    const registro = { id: crypto.randomUUID(), ...data };
    db.clientes.push(registro);
    await writeDb(db);
    return json(201, { cliente: registro });
  }

  if (event.httpMethod === 'PUT') {
    const id = sanitizeString(body.id, 40);
    const idx = db.clientes.findIndex((c) => c.id === id);
    if (idx === -1) return json(404, { error: 'not_found' });
    const data = sanitizeCliente(body, anosConhecidos);
    if (!data.cliente) return json(400, { error: 'cliente_required' });
    db.clientes[idx] = { id, ...data };
    await writeDb(db);
    return json(200, { cliente: db.clientes[idx] });
  }

  if (event.httpMethod === 'DELETE') {
    const id = sanitizeString(body.id, 40);
    const before = db.clientes.length;
    db.clientes = db.clientes.filter((c) => c.id !== id);
    if (db.clientes.length === before) return json(404, { error: 'not_found' });
    await writeDb(db);
    return json(200, { ok: true });
  }

  return json(405, { error: 'method_not_allowed' });
};
