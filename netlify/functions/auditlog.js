import { connectLambda } from './_lib/db.js';
import { lerLog } from './_lib/log.js';
import { authenticate, requireRole, json, sanitizeString } from './_lib/security.js';

export const handler = async (event) => {
  connectLambda(event);
  const user = authenticate(event);
  if (!requireRole(user, ['administrador'])) return json(403, { error: 'forbidden' });
  if (event.httpMethod !== 'GET') return json(405, { error: 'method_not_allowed' });

  const qs = event.queryStringParameters || {};
  const pagina = parseInt(qs.pagina) || 1;
  const porPagina = parseInt(qs.porPagina) || 50;

  const filtros = {};
  if (qs.usuario) filtros.usuario = sanitizeString(qs.usuario, 80);
  if (qs.acao) filtros.acao = sanitizeString(qs.acao, 40);
  if (qs.funcionalidade) filtros.funcionalidade = sanitizeString(qs.funcionalidade, 40);
  if (qs.dataInicio) filtros.dataInicio = sanitizeString(qs.dataInicio, 20);
  if (qs.dataFim) filtros.dataFim = sanitizeString(qs.dataFim, 20);

  const resultado = await lerLog(pagina, porPagina, filtros);
  return json(200, resultado);
};
