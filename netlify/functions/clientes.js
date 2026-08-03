import crypto from 'crypto';
import { readDb, writeDb, connectLambda } from './_lib/db.js';
import { gravarLog } from './_lib/log.js';
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
const PERIODOS = ['abertura', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', 'anual'];

function sanitizePeriodo(src) {
  const obj = src && typeof src === 'object' ? src : {};
  return {
    dataValidacao: sanitizeString(obj.dataValidacao, 20),
    tecnico: sanitizeString(obj.tecnico, 120),
    observacoes: sanitizeString(obj.observacoes, 1000),
    contato: sanitizeString(obj.contato, 300)
  };
}

function sanitizeAbertura(src) {
  const obj = src && typeof src === 'object' ? src : {};
  return {
    data: sanitizeString(obj.data, 20),
    tecnico: sanitizeString(obj.tecnico, 120),
    webOuDd: sanitizeEnum(obj.webOuDd, WEB_DD, '')
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
    periodosAno.abertura = sanitizeAbertura(origemAno.abertura);
    out[ano] = periodosAno;
  }
  return out;
}

function sanitizeCliente(body, anosConhecidos) {
  return {
    cliente: sanitizeString(body.cliente, 120),
    integracaoAmCp: sanitizeEnum(body.integracaoAmCp, SIM_NAO, 'Não'),
    clienteComGerador: sanitizeEnum(body.clienteComGerador, SIM_NAO, 'Não'),
    org: sanitizeString(body.org, 40),
    periodos: sanitizePeriodosPorAno(body.periodos, anosConhecidos)
  };
}

export const handler = async (event) => {
  connectLambda(event);
  const user = authenticate(event);
  if (!user) return json(401, { error: 'unauthorized' });
  if (user.mustChange === true) return json(403, { error: 'senha_pendente' });

  const db = await readDb();
  db.clientes = db.clientes || [];
  const anosConhecidos = Object.keys(db.prazos || {});

  if (event.httpMethod === 'GET') {
    return json(200, { clientes: db.clientes, anos: anosConhecidos });
  }

  if (event.httpMethod === 'GET') {
    if (!requireRole(user, ['operacional', 'administrador', 'diretoria'])) return json(403, { error: 'forbidden' });
  } else if (event.httpMethod === 'PUT') {
    if (!requireRole(user, ['operacional', 'administrador'])) return json(403, { error: 'forbidden' });
  } else {
    if (!requireRole(user, ['administrador'])) return json(403, { error: 'forbidden' });
  }

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
    await gravarLog(event, user, { funcionalidade: 'Clientes', rotina: 'POST /api/clientes', acao: 'criar', dadoAnterior: null, dadoAtual: registro });
    return json(201, { cliente: registro });
  }

  if (event.httpMethod === 'PUT') {
    const id = sanitizeString(body.id, 40);
    const idx = db.clientes.findIndex((c) => c.id === id);
    if (idx === -1) return json(404, { error: 'not_found' });
    const anterior = JSON.parse(JSON.stringify(db.clientes[idx]));
    const data = sanitizeCliente(body, anosConhecidos);
    if (!data.cliente) return json(400, { error: 'cliente_required' });
    db.clientes[idx] = { id, ...data };
    await writeDb(db);
    await gravarLog(event, user, { funcionalidade: 'Clientes', rotina: 'PUT /api/clientes', acao: 'editar', dadoAnterior: anterior, dadoAtual: db.clientes[idx] });
    return json(200, { cliente: db.clientes[idx] });
  }

  if (event.httpMethod === 'DELETE') {
    const id = sanitizeString(body.id, 40);
    const clienteRemovido = db.clientes.find((c) => c.id === id);
    const before = db.clientes.length;
    db.clientes = db.clientes.filter((c) => c.id !== id);
    if (db.clientes.length === before) return json(404, { error: 'not_found' });
    await writeDb(db);
    await gravarLog(event, user, { funcionalidade: 'Clientes', rotina: 'DELETE /api/clientes', acao: 'excluir', dadoAnterior: clienteRemovido, dadoAtual: null });
    return json(200, { ok: true });
  }

  return json(405, { error: 'method_not_allowed' });
};
