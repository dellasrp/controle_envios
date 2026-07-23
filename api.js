const session = requireAuth();
let clientes = [];
let prazos = {};
let anoAtual = null;
let periodoAtual = null;
let editId = null;
let filtroStatus = 'todos';
let sortCol = null;
let sortDir = 'asc';

const PERIODOS_ORDEM = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', 'anual'];
const NOMES_PERIODO = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
  '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
  '13': 'Mês 13', '14': 'Mês 14', anual: 'Contas Anuais'
};

const podeEditar = session && ['operacional', 'administrador'].includes(session.user.role);

function initHeader() {
  document.getElementById('userNome').textContent = session.user.nome;
  document.getElementById('userRole').textContent = session.user.role;
  if (['diretoria', 'administrador'].includes(session.user.role)) {
    document.getElementById('linkDashboard').classList.remove('hidden');
  }
  if (session.user.role === 'administrador') {
    document.getElementById('linkUsuarios').classList.remove('hidden');
    document.getElementById('linkPrazos').classList.remove('hidden');
  }
  if (!podeEditar) document.getElementById('btnNovo').classList.add('hidden');
}

function formatarDataBr(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return d + '/' + m + '/' + a;
}

function anosOrdenados() {
  return Object.keys(prazos).sort();
}

function initSeletores() {
  const anoSel = document.getElementById('anoSelect');
  const anos = anosOrdenados();
  const anoRealAtual = String(new Date().getFullYear());
  anoAtual = anos.includes(anoRealAtual) ? anoRealAtual : (anos[anos.length - 1] || anoRealAtual);

  anos.forEach((a) => {
    const opt = document.createElement('option');
    opt.value = a;
    opt.textContent = a;
    if (a === anoAtual) opt.selected = true;
    anoSel.appendChild(opt);
  });
  anoSel.addEventListener('change', () => {
    anoAtual = anoSel.value;
    atualizarPrazoInfo();
    render();
  });

  const mesAtualNum = String(new Date().getMonth() + 1).padStart(2, '0');
  periodoAtual = anoAtual === anoRealAtual ? mesAtualNum : '01';

  const mesSel = document.getElementById('mesSelect');
  PERIODOS_ORDEM.forEach((k) => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = NOMES_PERIODO[k];
    if (k === periodoAtual) opt.selected = true;
    mesSel.appendChild(opt);
  });
  mesSel.addEventListener('change', () => {
    periodoAtual = mesSel.value;
    atualizarPrazoInfo();
    render();
  });
}

function atualizarPrazoInfo() {
  const el = document.getElementById('prazoInfo');
  const prazo = prazos[anoAtual] && prazos[anoAtual][periodoAtual];
  el.textContent = prazo
    ? 'Prazo final do TCE-SP para ' + NOMES_PERIODO[periodoAtual] + '/' + anoAtual + ': ' + formatarDataBr(prazo)
    : 'Prazo final ainda não definido para ' + NOMES_PERIODO[periodoAtual] + '/' + anoAtual + '.';
}

function initFiltros() {
  const sel = document.getElementById('filtroStatus');
  sel.addEventListener('change', () => {
    filtroStatus = sel.value;
    render();
  });
}

function ordenarPor(coluna) {
  if (sortCol === coluna) {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    sortCol = coluna;
    sortDir = 'asc';
  }
  render();
}

function atualizarSetas() {
  const colunas = ['cliente', 'org', 'status', 'dataValidacao', 'tecnico'];
  for (const c of colunas) {
    const el = document.getElementById('seta-' + c);
    if (!el) continue;
    el.textContent = sortCol === c ? (sortDir === 'asc' ? '▲' : '▼') : '';
  }
}

function td(texto, extra) {
  const cell = document.createElement('td');
  cell.className = 'px-4 py-3 align-top ' + (extra || '');
  cell.textContent = texto;
  return cell;
}

function badge(texto, cor) {
  const span = document.createElement('span');
  span.className = 'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ' + cor;
  span.textContent = texto;
  return span;
}

function tdStatus(l) {
  const cell = document.createElement('td');
  cell.className = 'px-4 py-3 align-top';
  let texto = l.status;
  let cor = 'bg-amber-100 text-amber-700';
  if (l.status === 'Concluído') cor = 'bg-emerald-100 text-emerald-700';
  else if (l.atrasado) { texto = 'Atrasado'; cor = 'bg-red-100 text-red-700'; }
  cell.appendChild(badge(texto, cor));
  return cell;
}

function tdPrazo(l) {
  const cell = document.createElement('td');
  cell.className = 'px-4 py-3 align-top';
  if (l.status !== 'Concluído' || !l.prazo) {
    cell.textContent = '-';
    return cell;
  }
  if (l.dataValidacao <= l.prazo) {
    cell.appendChild(badge('No prazo', 'bg-emerald-100 text-emerald-700'));
  } else {
    cell.appendChild(badge('Em atraso', 'bg-red-100 text-red-700'));
  }
  return cell;
}

function tdAcoes(c) {
  const cell = document.createElement('td');
  cell.className = 'px-4 py-3 text-right align-top';
  if (!podeEditar) {
    cell.textContent = '—';
    return cell;
  }
  const wrap = document.createElement('div');
  wrap.className = 'flex justify-end gap-2';
  const bEdit = document.createElement('button');
  bEdit.className = 'rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50';
  bEdit.textContent = 'Editar';
  bEdit.addEventListener('click', () => abrirModal(c.id));
  const bDel = document.createElement('button');
  bDel.className = 'rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50';
  bDel.textContent = 'Excluir';
  bDel.addEventListener('click', () => excluir(c.id, c.cliente));
  wrap.appendChild(bEdit);
  wrap.appendChild(bDel);
  cell.appendChild(wrap);
  return cell;
}

async function carregar() {
  const [dataClientes, dataPrazos] = await Promise.all([apiFetch('clientes'), apiFetch('prazos')]);
  clientes = dataClientes.clientes || [];
  prazos = dataPrazos.prazos || {};
  initSeletores();
  atualizarPrazoInfo();
  render();
}

function periodoDoCliente(c) {
  return (c.periodos && c.periodos[anoAtual] && c.periodos[anoAtual][periodoAtual]) || {
    dataValidacao: '', tecnico: '', observacoes: '', contato: ''
  };
}

function prepararLista() {
  const termo = document.getElementById('busca').value.toLowerCase();
  const prazoPeriodo = prazos[anoAtual] && prazos[anoAtual][periodoAtual];
  const hojeStr = new Date().toISOString().slice(0, 10);

  let linhas = clientes.map((c) => {
    const dado = periodoDoCliente(c);
    const status = dado.dataValidacao ? 'Concluído' : 'Pendente';
    const atrasado = status === 'Pendente' && Boolean(prazoPeriodo) && hojeStr > prazoPeriodo;
    return {
      id: c.id,
      cliente: c.cliente,
      org: c.org || '',
      status,
      atrasado,
      prazo: prazoPeriodo || null,
      dataValidacao: dado.dataValidacao || '',
      tecnico: dado.tecnico || '',
      observacoes: dado.observacoes || '',
      contato: dado.contato || '',
      raw: c
    };
  });

  linhas = linhas.filter((l) => {
    const bate = l.cliente.toLowerCase().includes(termo) || l.org.toLowerCase().includes(termo);
    if (!bate) return false;
    if (filtroStatus === 'todos') return true;
    if (filtroStatus === 'Atrasado') return l.atrasado;
    return l.status === filtroStatus;
  });

  if (sortCol) {
    const dir = sortDir === 'desc' ? -1 : 1;
    linhas.sort((a, b) => String(a[sortCol] || '').localeCompare(String(b[sortCol] || ''), 'pt-BR') * dir);
  }

  return linhas;
}

function render() {
  const tbody = document.getElementById('tabelaBody');
  tbody.innerHTML = '';
  const linhas = prepararLista();
  atualizarSetas();

  document.getElementById('contador').textContent =
    linhas.length + ' de ' + clientes.length + ' cliente(s) · ' + NOMES_PERIODO[periodoAtual] + '/' + anoAtual;

  if (linhas.length === 0) {
    const tr = document.createElement('tr');
    const cell = td('Nenhum cliente encontrado.', 'text-slate-400');
    cell.colSpan = 9;
    tr.appendChild(cell);
    tbody.appendChild(tr);
    return;
  }

  for (const l of linhas) {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-100 hover:bg-slate-50' + (l.atrasado ? ' bg-red-50' : '');
    tr.appendChild(td(l.cliente, 'font-medium text-slate-800'));
    tr.appendChild(td(l.org || '-'));
    tr.appendChild(tdStatus(l));
    tr.appendChild(tdPrazo(l));
    tr.appendChild(td(l.dataValidacao ? formatarDataBr(l.dataValidacao) : '-'));
    tr.appendChild(td(l.tecnico || '-'));
    tr.appendChild(td(l.observacoes || '-', 'max-w-xs text-slate-600'));
    tr.appendChild(td(l.contato || '-'));
    tr.appendChild(tdAcoes(l.raw));
    tbody.appendChild(tr);
  }
}

function val(id) {
  return document.getElementById(id).value;
}

function setVal(id, v) {
  document.getElementById(id).value = v || '';
}

function abrirModal(id) {
  editId = id || null;
  document.getElementById('modalErro').classList.add('hidden');
  document.getElementById('modalMesTitulo').textContent = 'Controle · ' + NOMES_PERIODO[periodoAtual] + '/' + anoAtual;
  const registro = id ? clientes.find((c) => c.id === id) : null;
  document.getElementById('modalTitulo').textContent = registro ? 'Editar cliente' : 'Novo cliente';

  const ab = (registro && registro.abertura) || {};
  const dado = registro ? periodoDoClienteRegistro(registro) : { dataValidacao: '', tecnico: '', observacoes: '', contato: '' };

  setVal('f_cliente', registro ? registro.cliente : '');
  setVal('f_org', registro ? registro.org : '');
  document.getElementById('f_integracao').value = registro ? registro.integracaoAmCp : 'Não';
  document.getElementById('f_gerador').value = registro ? registro.clienteComGerador : 'Não';
  setVal('f_ab_data', ab.data);
  setVal('f_ab_tecnico', ab.tecnico);
  document.getElementById('f_ab_web').value = ab.webOuDd || '';
  setVal('f_m_data', dado.dataValidacao);
  setVal('f_m_tecnico', dado.tecnico);
  setVal('f_m_obs', dado.observacoes);
  setVal('f_m_contato', dado.contato);

  const modal = document.getElementById('modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function periodoDoClienteRegistro(registro) {
  return (registro.periodos && registro.periodos[anoAtual] && registro.periodos[anoAtual][periodoAtual]) || {
    dataValidacao: '', tecnico: '', observacoes: '', contato: ''
  };
}

function fecharModal() {
  const modal = document.getElementById('modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  editId = null;
}

function periodoVazio() {
  return { dataValidacao: '', tecnico: '', observacoes: '', contato: '' };
}

function periodosBase(registro) {
  const base = {};
  const anos = anosOrdenados();
  for (const a of anos) {
    base[a] = {};
    for (const p of PERIODOS_ORDEM) {
      const origem = (registro && registro.periodos && registro.periodos[a] && registro.periodos[a][p]) || null;
      base[a][p] = origem ? { ...origem } : periodoVazio();
    }
  }
  return base;
}

async function salvar() {
  const erro = document.getElementById('modalErro');
  erro.classList.add('hidden');
  const nome = val('f_cliente').trim();
  if (!nome) {
    erro.textContent = 'Informe o nome do cliente.';
    erro.classList.remove('hidden');
    return;
  }

  const registro = editId ? clientes.find((c) => c.id === editId) : null;
  const periodos = periodosBase(registro);
  if (!periodos[anoAtual]) periodos[anoAtual] = {};
  periodos[anoAtual][periodoAtual] = {
    dataValidacao: val('f_m_data'),
    tecnico: val('f_m_tecnico'),
    observacoes: val('f_m_obs'),
    contato: val('f_m_contato')
  };

  const payload = {
    cliente: nome,
    org: val('f_org'),
    integracaoAmCp: val('f_integracao'),
    clienteComGerador: val('f_gerador'),
    abertura: {
      data: val('f_ab_data'),
      tecnico: val('f_ab_tecnico'),
      webOuDd: val('f_ab_web')
    },
    periodos
  };

  const btn = document.getElementById('btnSalvar');
  btn.disabled = true;
  btn.textContent = 'Salvando...';
  try {
    if (editId) {
      await apiFetch('clientes', { method: 'PUT', body: JSON.stringify({ id: editId, ...payload }) });
    } else {
      await apiFetch('clientes', { method: 'POST', body: JSON.stringify(payload) });
    }
    fecharModal();
    await carregar();
  } catch (err) {
    erro.textContent = 'Não foi possível salvar. ' + (err.message === 'forbidden' ? 'Sem permissão.' : 'Tente novamente.');
    erro.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar';
  }
}

async function excluir(id, nome) {
  if (!confirm('Excluir o cliente "' + nome + '"? Esta ação remove todo o histórico, de todos os anos.')) return;
  try {
    await apiFetch('clientes', { method: 'DELETE', body: JSON.stringify({ id }) });
    await carregar();
  } catch (err) {
    alert('Não foi possível excluir. ' + (err.message === 'forbidden' ? 'Sem permissão.' : 'Tente novamente.'));
  }
}

initHeader();
initFiltros();
carregar();
