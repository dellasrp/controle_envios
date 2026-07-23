const session = requireAuth(['administrador']);
let prazos = {};
let anoAtual = null;

const PERIODOS_ORDEM = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', 'anual'];
const NOMES_PERIODO = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
  '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
  '13': 'Mês 13', '14': 'Mês 14', anual: 'Contas Anuais'
};

function initHeader() {
  document.getElementById('userNome').textContent = session.user.nome;
}

function anosOrdenados() {
  return Object.keys(prazos).sort();
}

function popularAnoSelect() {
  const sel = document.getElementById('anoSelect');
  sel.innerHTML = '';
  anosOrdenados().forEach((a) => {
    const opt = document.createElement('option');
    opt.value = a;
    opt.textContent = a;
    if (a === anoAtual) opt.selected = true;
    sel.appendChild(opt);
  });
}

function renderTabela() {
  const tbody = document.getElementById('tabelaBody');
  tbody.innerHTML = '';
  const periodosAno = prazos[anoAtual] || {};
  for (const p of PERIODOS_ORDEM) {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-100';
    const tdNome = document.createElement('td');
    tdNome.className = 'px-4 py-2.5 font-medium text-slate-700';
    tdNome.textContent = NOMES_PERIODO[p];
    const tdInput = document.createElement('td');
    tdInput.className = 'px-4 py-2.5';
    const input = document.createElement('input');
    input.type = 'date';
    input.id = 'prazo_' + p;
    input.value = periodosAno[p] || '';
    input.className = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-accent';
    tdInput.appendChild(input);
    tr.appendChild(tdNome);
    tr.appendChild(tdInput);
    tbody.appendChild(tr);
  }
}

async function carregar() {
  const data = await apiFetch('prazos');
  prazos = data.prazos || {};
  const anos = anosOrdenados();
  const anoRealAtual = String(new Date().getFullYear());
  anoAtual = anos.includes(anoRealAtual) ? anoRealAtual : (anos[anos.length - 1] || anoRealAtual);
  if (anos.length === 0) {
    prazos[anoAtual] = {};
  }
  popularAnoSelect();
  renderTabela();

  document.getElementById('anoSelect').addEventListener('change', (e) => {
    anoAtual = e.target.value;
    renderTabela();
  });
}

function abrirNovoAno() {
  document.getElementById('novoAnoBox').classList.remove('hidden');
  document.getElementById('novoAnoBox').classList.add('flex');
}

function fecharNovoAno() {
  document.getElementById('novoAnoBox').classList.add('hidden');
  document.getElementById('novoAnoBox').classList.remove('flex');
  document.getElementById('f_novo_ano').value = '';
}

function criarAno() {
  const v = document.getElementById('f_novo_ano').value.trim();
  if (!/^[0-9]{4}$/.test(v)) {
    mostrarMsg('Digite um ano válido com 4 dígitos.', true);
    return;
  }
  if (!prazos[v]) prazos[v] = {};
  anoAtual = v;
  popularAnoSelect();
  renderTabela();
  fecharNovoAno();
}

function mostrarMsg(texto, erro) {
  const box = document.getElementById('msgBox');
  box.textContent = texto;
  box.className = 'mt-3 rounded-lg px-3 py-2 text-sm ' + (erro ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200');
}

async function salvar() {
  const periodos = {};
  for (const p of PERIODOS_ORDEM) {
    periodos[p] = document.getElementById('prazo_' + p).value || null;
  }
  const btn = document.getElementById('btnSalvar');
  btn.disabled = true;
  btn.textContent = 'Salvando...';
  try {
    await apiFetch('prazos', { method: 'PUT', body: JSON.stringify({ ano: anoAtual, periodos }) });
    prazos[anoAtual] = periodos;
    mostrarMsg('Prazos de ' + anoAtual + ' salvos com sucesso.', false);
  } catch (err) {
    mostrarMsg('Não foi possível salvar. Tente novamente.', true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar prazos';
  }
}

initHeader();
carregar();
