import { getStore, connectLambda as _connectLambda } from '@netlify/blobs';

const LOG_STORE = 'controle-envios-log';
const LOG_KEY = 'auditlog';
const MAX_REGISTROS = 5000;

function extrairIp(event) {
  const headers = event.headers || {};
  return (
    headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    headers['x-real-ip'] ||
    headers['client-ip'] ||
    'desconhecido'
  );
}

function extrairMaquina(event) {
  return (event.headers || {})['user-agent'] || 'desconhecido';
}

function sanitizarParaLog(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'senha' || k === 'senhaAtual' || k === 'novaSenha') {
      out[k] = '[protegido]';
    } else if (typeof v === 'object' && v !== null) {
      out[k] = sanitizarParaLog(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function gravarLog(event, user, campos) {
  try {
    const store = getStore(LOG_STORE);
    const agora = new Date();
    const registro = {
      id: agora.getTime() + '-' + Math.random().toString(36).slice(2, 7),
      dataHora: agora.toISOString(),
      data: agora.toLocaleDateString('pt-BR'),
      hora: agora.toLocaleTimeString('pt-BR'),
      usuario: user ? {
        id: user.sub || user.id || '',
        nome: user.nome || '',
        username: user.username || '',
        role: user.role || ''
      } : null,
      ip: extrairIp(event),
      maquina: extrairMaquina(event),
      funcionalidade: campos.funcionalidade || '',
      rotina: campos.rotina || '',
      acao: campos.acao || '',
      dadoAnterior: sanitizarParaLog(campos.dadoAnterior ?? null),
      dadoAtual: sanitizarParaLog(campos.dadoAtual ?? null)
    };

    const atual = await store.get(LOG_KEY, { type: 'json' });
    const lista = Array.isArray(atual) ? atual : [];
    lista.unshift(registro);
    if (lista.length > MAX_REGISTROS) lista.length = MAX_REGISTROS;
    await store.setJSON(LOG_KEY, lista);
  } catch (err) {
    console.error('[auditlog] falha ao gravar log:', err.message);
  }
}

export async function lerLog(pagina, porPagina, filtros) {
  const store = getStore(LOG_STORE);
  const lista = await store.get(LOG_KEY, { type: 'json' }) || [];
  let filtrada = lista;

  if (filtros) {
    if (filtros.usuario) {
      const termo = filtros.usuario.toLowerCase();
      filtrada = filtrada.filter(r =>
        r.usuario?.username?.toLowerCase().includes(termo) ||
        r.usuario?.nome?.toLowerCase().includes(termo)
      );
    }
    if (filtros.acao) {
      filtrada = filtrada.filter(r => r.acao === filtros.acao);
    }
    if (filtros.funcionalidade) {
      filtrada = filtrada.filter(r => r.funcionalidade === filtros.funcionalidade);
    }
    if (filtros.dataInicio) {
      filtrada = filtrada.filter(r => r.dataHora >= filtros.dataInicio);
    }
    if (filtros.dataFim) {
      filtrada = filtrada.filter(r => r.dataHora <= filtros.dataFim + 'T23:59:59Z');
    }
  }

  const p = Math.max(1, pagina || 1);
  const pp = Math.min(200, Math.max(1, porPagina || 50));
  const inicio = (p - 1) * pp;
  return {
    total: filtrada.length,
    pagina: p,
    porPagina: pp,
    totalPaginas: Math.ceil(filtrada.length / pp),
    registros: filtrada.slice(inicio, inicio + pp)
  };
}
