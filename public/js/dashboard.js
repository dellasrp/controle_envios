const session = requireAuth(['diretoria', 'administrador']);
const charts = {};

function initHeader() {
  document.getElementById('userNome').textContent = session.user.nome;
  if (session.user.role === 'administrador') {
    document.getElementById('linkUsuarios').classList.remove('hidden');
  }
}

function renderMensal(porMes) {
  const ctx = document.getElementById('chartMensal');
  charts.mensal = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: porMes.map((m) => m.mes),
      datasets: [
        { label: 'Concluído', data: porMes.map((m) => m.concluido), backgroundColor: '#10b981' },
        { label: 'Pendente', data: porMes.map((m) => m.pendente), backgroundColor: '#f59e0b' }
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
  const paleta = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6', '#14b8a6', '#f97316', '#64748b', '#ec4899'];
  charts.org = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: porOrg.map((o) => o.org),
      datasets: [{ data: porOrg.map((o) => o.qtd), backgroundColor: porOrg.map((o, i) => paleta[i % paleta.length]) }]
    },
    options: { responsive: true, plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } } }
  });
}

function renderEvolucao(porMes, total) {
  const ctx = document.getElementById('chartEvolucao');
  const pct = porMes.map((m) => (total > 0 ? Math.round((m.concluido / total) * 100) : 0));
  charts.evolucao = new Chart(ctx, {
    type: 'line',
    data: {
      labels: porMes.map((m) => m.mes),
      datasets: [{
        label: 'Conclusão (%)',
        data: pct,
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79,70,229,0.1)',
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

async function carregar() {
  initHeader();
  const data = await apiFetch('dashboard');
  document.getElementById('kpiTotal').textContent = data.total;
  document.getElementById('kpiIntegracao').textContent = data.comIntegracao;
  document.getElementById('kpiGerador').textContent = data.comGerador;
  const idx = new Date().getMonth();
  const mesCorrente = data.porMes[idx];
  document.getElementById('kpiConcluido').textContent = mesCorrente ? mesCorrente.concluido : 0;
  renderMensal(data.porMes);
  renderOrg(data.porOrg);
  renderEvolucao(data.porMes, data.total);
}

carregar();
