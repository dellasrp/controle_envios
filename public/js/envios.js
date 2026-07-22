const session = requireAuth();
let clientes = [];
let mesAtual = String(new Date().getMonth() + 1).padStart(2, '0');
let editId = null;

const NOMES_MES = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
  '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
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
  }
  if (!podeEditar) document.getElementById('btnNovo').classList.add('hidden');
}

function initMes() {
  const sel = document.getElementById('mesSelect');
  Object.entries(NOMES_MES).forEach(([k, v]) => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = v;
    if (k === mesAtual) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => {
    mesAtual = sel.value;
    render();
  });
}

function td(texto, extra) {
  const cell = document.createElement('td');
  cell.className = 'px-4 py-3 align-top ' + (extra || '');
  cell.textContent = texto;
  return cell;
}

function tdBadge(status) {
  const cell = document.createElement('td');
  cell.className = 'px-4 py-3 align-top';
  const badge = document.createElement('span');
  const concluido = status === 'Concluído';
  badge.className = 'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ' +
    (concluido ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700');
  badge.textContent = status;
  cell.appendChild(badge);
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
  const data = await apiFetch('clientes');
  clientes = data.clientes || [];
  render();
}

function render() {
  const termo = document.getElementById('busca').value.toLowerCase();
  const tbody = document.getElementById('tabelaBody');
  tbody.innerHTML = '';
  const filtrados = clientes.filter((c) =>
    c.cliente.toLowerCase().includes(termo) || (c.org || '').toLowerCase().includes(termo)
  );
  document.getElementById('contador').textContent =
    filtrados.length + ' de ' + clientes.length + ' cliente(s) · ' + NOMES_MES[mesAtual];

  if (filtrados.length === 0) {
    const tr = document.createElement('tr');
    const cell = td('Nenhum cliente encontrado.', 'text-slate-400');
    cell.colSpan = 8;
    tr.appendChild(cell);
    tbody.appendChild(tr);
    return;
  }

  for (const c of filtrados) {
    const mes = (c.meses && c.meses[mesAtual]) || {};
    const status = mes.dataValidacao ? 'Concluído' : 'Pendente';
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-100 hover:bg-slate-50';
    tr.appendChild(td(c.cliente, 'font-medium text-slate-800'));
    tr.appendChild(td(c.org || '-'));
    tr.appendChild(tdBadge(status));
    tr.appendChild(td(mes.dataValidacao || '-'));
    tr.appendChild(td(mes.tecnico || '-'));
    tr.appendChild(td(mes.observacoes || '-', 'max-w-xs text-slate-600'));
    tr.appendChild(td(mes.contato || '-'));
    tr.appendChild(tdAcoes(c));
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
  document.getElementById('modalMesTitulo').textContent = 'Controle · ' + NOMES_MES[mesAtual];
  const registro = id ? clientes.find((c) => c.id === id) : null;
  document.getElementById('modalTitulo').textContent = registro ? 'Editar cliente' : 'Novo cliente';

  const ab = (registro && registro.abertura) || {};
  const mes = (registro && registro.meses && registro.meses[mesAtual]) || {};

  setVal('f_cliente', registro ? registro.cliente : '');
  setVal('f_org', registro ? registro.org : '');
  document.getElementById('f_integracao').value = registro ? registro.integracaoAmCp : 'Não';
  document.getElementById('f_gerador').value = registro ? registro.clienteComGerador : 'Não';
  setVal('f_ab_data', ab.data);
  setVal('f_ab_tecnico', ab.tecnico);
  document.getElementById('f_ab_web').value = ab.webOuDd || '';
  setVal('f_m_data', mes.dataValidacao);
  setVal('f_m_tecnico', mes.tecnico);
  setVal('f_m_obs', mes.observacoes);
  setVal('f_m_contato', mes.contato);

  const modal = document.getElementById('modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function fecharModal() {
  const modal = document.getElementById('modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  editId = null;
}

function mesesBase(registro) {
  const base = {};
  const chaves = Object.keys(NOMES_MES);
  for (const k of chaves) {
    const origem = (registro && registro.meses && registro.meses[k]) || {};
    base[k] = {
      dataValidacao: origem.dataValidacao || '',
      tecnico: origem.tecnico || '',
      observacoes: origem.observacoes || '',
      contato: origem.contato || ''
    };
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
  const meses = mesesBase(registro);
  meses[mesAtual] = {
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
    meses
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
  if (!confirm('Excluir o cliente "' + nome + '"? Esta ação remove todo o histórico mensal.')) return;
  try {
    await apiFetch('clientes', { method: 'DELETE', body: JSON.stringify({ id }) });
    await carregar();
  } catch (err) {
    alert('Não foi possível excluir. ' + (err.message === 'forbidden' ? 'Sem permissão.' : 'Tente novamente.'));
  }
}

initHeader();
initMes();
carregar();
