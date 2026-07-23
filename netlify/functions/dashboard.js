import { readDb, connectLambda } from './_lib/db.js';
import { authenticate, requireRole, json, sanitizeString } from './_lib/security.js';

const PERIODOS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', 'anual'];
const LABELS = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
  '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
  '13': 'Mês 13', '14': 'Mês 14', anual: 'Contas Anuais'
};

function sanitizeAno(ano) {
  const s = sanitizeString(ano, 4);
  return /^[0-9]{4}$/.test(s) ? s : null;
}

function sanitizePeriodo(p) {
  const s = sanitizeString(p, 10);
  return PERIODOS.includes(s) ? s : null;
}

function periodoDeCliente(cliente, ano, periodo) {
  return (cliente.periodos && cliente.periodos[ano] && cliente.periodos[ano][periodo]) || {
    dataValidacao: '', tecnico: '', observacoes: '', contato: ''
  };
}

export const handler = async (event) => {
  connectLambda(event);
  const user = authenticate(event);
  if (!requireRole(user, ['diretoria', 'administrador'])) return json(403, { error: 'forbidden' });

  const db = await readDb();
  const clientes = db.clientes || [];
  const prazos = db.prazos || {};
  const qs = event.queryStringParameters || {};

  const anosDisponiveis = Object.keys(prazos).sort();
  let ano = sanitizeAno(qs.ano);
  if (!ano || !anosDisponiveis.includes(ano)) {
    ano = anosDisponiveis[anosDisponiveis.length - 1] || String(new Date().getFullYear());
  }

  let periodo = sanitizePeriodo(qs.periodo);
  if (!periodo) {
    const hoje = new Date();
    const anoAtual = String(hoje.getFullYear());
    periodo = ano === anoAtual ? String(hoje.getMonth() + 1).padStart(2, '0') : '01';
  }

  const prazosAno = prazos[ano] || {};
  const total = clientes.length;
  const hojeStr = new Date().toISOString().slice(0, 10);

  let concluidos = 0;
  let pendentes = 0;
  let atrasados = 0;
  let concluidosNoPrazo = 0;
  let concluidosEmAtraso = 0;
  const pendentesDetalhe = [];
  const porTecnicoMap = {};

  const prazoPeriodoAtual = prazosAno[periodo] || null;

  for (const c of clientes) {
    const dado = periodoDeCliente(c, ano, periodo);
    const feito = Boolean(dado.dataValidacao);
    const tecnicoNome = dado.tecnico && dado.tecnico.trim() ? dado.tecnico.trim() : 'Sem Técnico';
    porTecnicoMap[tecnicoNome] = (porTecnicoMap[tecnicoNome] || 0) + 1;

    if (feito) {
      concluidos += 1;
      if (prazoPeriodoAtual) {
        if (dado.dataValidacao <= prazoPeriodoAtual) concluidosNoPrazo += 1;
        else concluidosEmAtraso += 1;
      }
    } else {
      pendentes += 1;
      const emAtraso = Boolean(prazoPeriodoAtual) && hojeStr > prazoPeriodoAtual;
      if (emAtraso) atrasados += 1;
      pendentesDetalhe.push({
        cliente: c.cliente,
        org: c.org || '',
        observacoes: dado.observacoes || '',
        tecnico: dado.tecnico || '',
        atrasado: emAtraso
      });
    }
  }

  pendentesDetalhe.sort((a, b) => (b.atrasado ? 1 : 0) - (a.atrasado ? 1 : 0));

  const porPeriodo = PERIODOS.map((p) => {
    let conc = 0;
    for (const c of clientes) {
      if (periodoDeCliente(c, ano, p).dataValidacao) conc += 1;
    }
    return { periodo: LABELS[p], concluido: conc, pendente: total - conc };
  });

  const porOrgMap = {};
  for (const c of clientes) {
    const org = c.org || 'N/D';
    porOrgMap[org] = (porOrgMap[org] || 0) + 1;
  }

  const porTecnico = Object.entries(porTecnicoMap)
    .map(([tecnico, qtd]) => ({ tecnico, qtd }))
    .sort((a, b) => b.qtd - a.qtd);

  return json(200, {
    ano,
    periodo,
    anosDisponiveis,
    prazoPeriodoAtual,
    total,
    concluidos,
    pendentes,
    atrasados,
    concluidosNoPrazo,
    concluidosEmAtraso,
    comIntegracao: clientes.filter((c) => c.integracaoAmCp === 'Sim').length,
    comGerador: clientes.filter((c) => c.clienteComGerador === 'Sim').length,
    porPeriodo,
    porOrg: Object.entries(porOrgMap).map(([org, qtd]) => ({ org, qtd })).sort((a, b) => b.qtd - a.qtd),
    porTecnico,
    pendentesDetalhe
  });
};
