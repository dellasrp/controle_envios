const session = requireAuth(['diretoria', 'administrador']);
const charts = {};
let anoAtual = null;
let periodoAtual = null;
let pendentesAtuais = [];

const PERIODOS_ORDEM = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', 'anual'];
const NOMES_PERIODO = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
  '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
  '13': 'Mês 13', '14': 'Mês 14', anual: 'Contas Anuais'
};

function initHeader() {
  document.getElementById('userNome').textContent = session.user.nome;
  if (session.user.role === 'administrador') {
    document.getElementById('linkUsuarios').classList.remove('hidden');
    document.getElementById('linkPrazos').classList.remove('hidden');
  }
}

function formatarDataBr(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return d + '/' + m + '/' + a;
}

function destruirGraficos() {
  Object.values(charts).forEach((c) => c && c.destroy());
}

function renderPeriodo(porPeriodo) {
  const ctx = document.getElementById('chartPeriodo');
  charts.periodo = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: porPeriodo.map((m) => m.periodo),
      datasets: [
        { label: 'Concluído', data: porPeriodo.map((m) => m.concluido), backgroundColor: '#8DC540' },
        { label: 'Pendente', data: porPeriodo.map((m) => m.pendente), backgroundColor: '#f59e0b' }
      ]
    },
    options: {
      responsive: true,
      scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function renderOrg(porOrg) {
  const ctx = document.getElementById('chartOrg');
  const paleta = ['#1BA085', '#8DC540', '#0EA5E9', '#F59E0B', '#8B5CF6', '#EF4444', '#14B8A6', '#F97316', '#64748B', '#EC4899'];
  charts.org = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: porOrg.map((o) => o.org),
      datasets: [{ data: porOrg.map((o) => o.qtd), backgroundColor: porOrg.map((o, i) => paleta[i % paleta.length]) }]
    },
    options: { responsive: true, plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } } }
  });
}

function renderTecnico(porTecnico) {
  const ctx = document.getElementById('chartTecnico');
  charts.tecnico = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: porTecnico.map((t) => t.tecnico),
      datasets: [{ label: 'Clientes', data: porTecnico.map((t) => t.qtd), backgroundColor: '#16836D' }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
      plugins: { legend: { display: false } }
    }
  });
}

function renderEvolucao(porPeriodo, total) {
  const ctx = document.getElementById('chartEvolucao');
  const pct = porPeriodo.map((m) => (total > 0 ? Math.round((m.concluido / total) * 100) : 0));
  charts.evolucao = new Chart(ctx, {
    type: 'line',
    data: {
      labels: porPeriodo.map((m) => m.periodo),
      datasets: [{
        label: 'Conclusão (%)',
        data: pct,
        borderColor: '#1BA085',
        backgroundColor: 'rgba(27,160,133,0.12)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%' } } },
      plugins: { legend: { display: false } }
    }
  });
}

function renderPendentes(lista) {
  pendentesAtuais = lista;
  document.getElementById('qtdPendentes').textContent = lista.length;
  const tbody = document.getElementById('pendentesBody');
  tbody.innerHTML = '';
  for (const p of lista) {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-100' + (p.atrasado ? ' bg-red-50' : '');
    const tdC = document.createElement('td');
    tdC.className = 'px-4 py-2 font-medium text-slate-800';
    tdC.textContent = p.cliente;
    const tdO = document.createElement('td');
    tdO.className = 'px-4 py-2';
    tdO.textContent = p.org || '-';
    const tdT = document.createElement('td');
    tdT.className = 'px-4 py-2';
    tdT.textContent = p.tecnico || 'Sem Técnico';
    const tdS = document.createElement('td');
    tdS.className = 'px-4 py-2';
    const badge = document.createElement('span');
    badge.className = 'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ' +
      (p.atrasado ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700');
    badge.textContent = p.atrasado ? 'Atrasado' : 'Pendente';
    tdS.appendChild(badge);
    const tdObs = document.createElement('td');
    tdObs.className = 'px-4 py-2 text-slate-600';
    tdObs.textContent = p.observacoes || '-';
    tr.appendChild(tdC);
    tr.appendChild(tdO);
    tr.appendChild(tdT);
    tr.appendChild(tdS);
    tr.appendChild(tdObs);
    tbody.appendChild(tr);
  }
}

function alternarPendentes() {
  const painel = document.getElementById('painelPendentes');
  const seta = document.getElementById('setaPendentes');
  const aberto = !painel.classList.contains('hidden');
  if (aberto) {
    painel.classList.add('hidden');
    seta.textContent = '▼';
  } else {
    painel.classList.remove('hidden');
    seta.textContent = '▲';
  }
}

function initSeletores(anosDisponiveis) {
  const anoSel = document.getElementById('anoSelect');
  anoSel.innerHTML = '';
  anosDisponiveis.forEach((a) => {
    const opt = document.createElement('option');
    opt.value = a;
    opt.textContent = a;
    if (a === anoAtual) opt.selected = true;
    anoSel.appendChild(opt);
  });
  anoSel.addEventListener('change', () => {
    anoAtual = anoSel.value;
    carregar();
  });

  const perSel = document.getElementById('periodoSelect');
  perSel.innerHTML = '';
  PERIODOS_ORDEM.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = NOMES_PERIODO[p];
    if (p === periodoAtual) opt.selected = true;
    perSel.appendChild(opt);
  });
  perSel.addEventListener('change', () => {
    periodoAtual = perSel.value;
    carregar();
  });
}

async function carregar() {
  const qs = [];
  if (anoAtual) qs.push('ano=' + encodeURIComponent(anoAtual));
  if (periodoAtual) qs.push('periodo=' + encodeURIComponent(periodoAtual));
  const data = await apiFetch('dashboard' + (qs.length ? '?' + qs.join('&') : ''));

  anoAtual = data.ano;
  periodoAtual = data.periodo;
  initSeletores(data.anosDisponiveis);

  document.getElementById('prazoInfo').textContent = data.prazoPeriodoAtual
    ? 'Prazo final do TCE-SP para ' + NOMES_PERIODO[periodoAtual] + '/' + anoAtual + ': ' + formatarDataBr(data.prazoPeriodoAtual)
    : 'Prazo final ainda não definido para ' + NOMES_PERIODO[periodoAtual] + '/' + anoAtual + '.';

  document.getElementById('kpiTotal').textContent = data.total;
  document.getElementById('kpiConcluidos').textContent = data.concluidos;
  document.getElementById('kpiPendentes').textContent = data.pendentes;
  document.getElementById('kpiAtrasados').textContent = data.atrasados;
  document.getElementById('kpiIntegracao').textContent = data.comIntegracao;
  document.getElementById('kpiGerador').textContent = data.comGerador;
  document.getElementById('kpiNoPrazo').textContent = data.concluidosNoPrazo;
  document.getElementById('kpiConcluidoAtraso').textContent = data.concluidosEmAtraso;

  destruirGraficos();
  renderPeriodo(data.porPeriodo);
  renderOrg(data.porOrg);
  renderTecnico(data.porTecnico);
  renderEvolucao(data.porPeriodo, data.total);
  renderPendentes(data.pendentesDetalhe);
}

initHeader();
carregar();
