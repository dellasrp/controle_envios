const session = requireAuth(['administrador']);
let paginaAtual = 1;
let totalPaginas = 1;
let ultimoResultado = [];
let buscaTimer = null;

const LABELS_ACAO = {
  criar: 'Criar cliente', editar: 'Editar cliente', excluir: 'Excluir cliente',
  criar_usuario: 'Criar usuário', editar_usuario: 'Editar usuário', excluir_usuario: 'Excluir usuário',
  editar_prazos: 'Editar prazos', exportar_backup: 'Exportar backup',
  importar_backup: 'Importar backup', troca_senha: 'Troca de senha'
};

const COR_ACAO = {
  criar: 'bg-emerald-100 text-emerald-700',
  criar_usuario: 'bg-emerald-100 text-emerald-700',
  editar: 'bg-blue-100 text-blue-700',
  editar_usuario: 'bg-blue-100 text-blue-700',
  editar_prazos: 'bg-blue-100 text-blue-700',
  excluir: 'bg-red-100 text-red-700',
  excluir_usuario: 'bg-red-100 text-red-700',
  exportar_backup: 'bg-amber-100 text-amber-700',
  importar_backup: 'bg-orange-100 text-orange-700',
  troca_senha: 'bg-purple-100 text-purple-700'
};

function initHeader() {
  document.getElementById('userNome').textContent = session.user.nome;
}

function buscar() {
  clearTimeout(buscaTimer);
  buscaTimer = setTimeout(() => { paginaAtual = 1; carregar(); }, 350);
}

function params() {
  const p = new URLSearchParams();
  p.set('pagina', paginaAtual);
  p.set('porPagina', 50);
  const u = document.getElementById('fUsuario').value.trim();
  const a = document.getElementById('fAcao').value;
  const f = document.getElementById('fFuncionalidade').value;
  const di = document.getElementById('fDataInicio').value;
  const df = document.getElementById('fDataFim').value;
  if (u) p.set('usuario', u);
  if (a) p.set('acao', a);
  if (f) p.set('funcionalidade', f);
  if (di) p.set('dataInicio', di);
  if (df) p.set('dataFim', df);
  return p.toString();
}

function badge(texto, cor) {
  return `<span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cor}">${texto}</span>`;
}

function truncar(ua, max) {
  if (!ua) return '-';
  const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)[\/\s]([\d.]+)/);
  if (browser) return browser[1] + ' ' + browser[2].split('.')[0];
  return ua.slice(0, max);
}

function render(data) {
  ultimoResultado = data.registros || [];
  totalPaginas = data.totalPaginas || 1;

  document.getElementById('resumo').textContent =
    data.total + ' evento(s) encontrado(s)' +
    (totalPaginas > 1 ? ' · Página ' + paginaAtual + ' de ' + totalPaginas : '');

  const tbody = document.getElementById('tabelaBody');
  tbody.innerHTML = '';

  if (ultimoResultado.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.className = 'px-4 py-8 text-center text-slate-400';
    td.textContent = 'Nenhum evento encontrado.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  for (const r of ultimoResultado) {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-100 hover:bg-slate-50';
    const corAcao = COR_ACAO[r.acao] || 'bg-slate-100 text-slate-600';
    const labelAcao = LABELS_ACAO[r.acao] || r.acao;
    tr.innerHTML = `
      <td class="px-4 py-3 whitespace-nowrap text-xs text-slate-500">${r.data}<br/><span class="font-mono">${r.hora}</span></td>
      <td class="px-4 py-3 font-medium">${r.usuario?.nome || '-'}<br/><span class="text-xs text-slate-400">${r.usuario?.username || ''}</span></td>
      <td class="px-4 py-3 text-xs capitalize text-slate-500">${r.usuario?.role || '-'}</td>
      <td class="px-4 py-3 font-mono text-xs text-slate-500">${r.ip || '-'}</td>
      <td class="px-4 py-3 text-xs text-slate-500">${truncar(r.maquina, 30)}</td>
      <td class="px-4 py-3 text-xs">${r.funcionalidade || '-'}</td>
      <td class="px-4 py-3">${badge(labelAcao, corAcao)}</td>
      <td class="px-4 py-3">
        <button onclick="verDetalhe('${r.id}')" class="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">Ver</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  const pag = document.getElementById('paginacao');
  pag.innerHTML = '';
  if (totalPaginas > 1) {
    const btnAnterior = document.createElement('button');
    btnAnterior.className = 'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-40';
    btnAnterior.textContent = '← Anterior';
    btnAnterior.disabled = paginaAtual <= 1;
    btnAnterior.onclick = () => { paginaAtual--; carregar(); };
    const info = document.createElement('span');
    info.textContent = 'Página ' + paginaAtual + ' de ' + totalPaginas;
    const btnProxima = document.createElement('button');
    btnProxima.className = 'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-40';
    btnProxima.textContent = 'Próxima →';
    btnProxima.disabled = paginaAtual >= totalPaginas;
    btnProxima.onclick = () => { paginaAtual++; carregar(); };
    pag.appendChild(btnAnterior);
    pag.appendChild(info);
    pag.appendChild(btnProxima);
  }
}

async function carregar() {
  const data = await apiFetch('auditlog?' + params());
  render(data);
}

function jsonParaLinhas(obj) {
  if (obj === null || obj === undefined) return [];
  return JSON.stringify(obj, null, 2).split('\n');
}

function renderDiff(elAnterior, elAtual, dadoAnterior, dadoAtual) {
  if (!dadoAnterior && !dadoAtual) {
    elAnterior.textContent = '(sem dado anterior)';
    elAtual.textContent = '(sem dado atual)';
    return;
  }
  if (!dadoAnterior) {
    elAnterior.textContent = '(sem dado anterior)';
    elAtual.innerHTML = '';
    jsonParaLinhas(dadoAtual).forEach(linha => {
      const span = document.createElement('div');
      span.className = 'bg-emerald-100 text-emerald-800';
      span.textContent = linha;
      elAtual.appendChild(span);
    });
    return;
  }
  if (!dadoAtual) {
    elAtual.textContent = '(sem dado atual)';
    elAnterior.innerHTML = '';
    jsonParaLinhas(dadoAnterior).forEach(linha => {
      const span = document.createElement('div');
      span.className = 'bg-red-100 text-red-800';
      span.textContent = linha;
      elAnterior.appendChild(span);
    });
    return;
  }

  const linhasAnt = jsonParaLinhas(dadoAnterior);
  const linhasAtu = jsonParaLinhas(dadoAtual);
  const maxLen = Math.max(linhasAnt.length, linhasAtu.length);

  elAnterior.innerHTML = '';
  elAtual.innerHTML = '';

  for (let i = 0; i < maxLen; i++) {
    const la = linhasAnt[i] !== undefined ? linhasAnt[i] : '';
    const lu = linhasAtu[i] !== undefined ? linhasAtu[i] : '';
    const mudou = la !== lu;

    const dA = document.createElement('div');
    dA.textContent = la || ' ';
    if (mudou && la) dA.className = 'bg-red-100 text-red-800 font-semibold rounded';
    elAnterior.appendChild(dA);

    const dU = document.createElement('div');
    dU.textContent = lu || ' ';
    if (mudou && lu) dU.className = 'bg-emerald-100 text-emerald-800 font-semibold rounded';
    elAtual.appendChild(dU);
  }
}

function verDetalhe(id) {
  const r = ultimoResultado.find(x => x.id === id);
  if (!r) return;
  const info = document.getElementById('detalheInfo');
  info.innerHTML = `
    <div><span class="font-medium text-slate-500">Data:</span> ${r.data}</div>
    <div><span class="font-medium text-slate-500">Hora:</span> ${r.hora}</div>
    <div><span class="font-medium text-slate-500">Usuário:</span> ${r.usuario?.nome} (${r.usuario?.username})</div>
    <div><span class="font-medium text-slate-500">Perfil:</span> ${r.usuario?.role}</div>
    <div><span class="font-medium text-slate-500">IP:</span> ${r.ip}</div>
    <div><span class="font-medium text-slate-500">Funcionalidade:</span> ${r.funcionalidade}</div>
    <div><span class="font-medium text-slate-500">Rotina:</span> ${r.rotina}</div>
    <div><span class="font-medium text-slate-500">Ação:</span> ${LABELS_ACAO[r.acao] || r.acao}</div>
    <div class="col-span-2 font-mono text-xs break-all"><span class="font-medium text-slate-500">Máquina:</span> ${r.maquina}</div>
  `;
  const elAnt = document.getElementById('detalheAnterior');
  const elAtu = document.getElementById('detalheAtual');
  renderDiff(elAnt, elAtu, r.dadoAnterior, r.dadoAtual);
  const m = document.getElementById('modalDetalhe');
  m.classList.remove('hidden');
  m.classList.add('flex');
}

function fecharDetalhe() {
  const m = document.getElementById('modalDetalhe');
  m.classList.add('hidden');
  m.classList.remove('flex');
}

async function exportarLog() {
  const data = await apiFetch('auditlog?porPagina=5000');
  const blob = new Blob([JSON.stringify(data.registros, null, 2)], { type: 'application/json' });
  const hoje = new Date();
  const dt = hoje.getFullYear() + '-' + String(hoje.getMonth()+1).padStart(2,'0') + '-' + String(hoje.getDate()).padStart(2,'0');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'auditlog-' + dt + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

initHeader();
carregar();
