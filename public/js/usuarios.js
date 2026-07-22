const session = requireAuth(['administrador']);
let usuarios = [];
let editId = null;

const ROLE_LABEL = { operacional: 'Operacional', diretoria: 'Diretoria', administrador: 'Administrador' };

function initHeader() {
  document.getElementById('userNome').textContent = session.user.nome;
}

function td(texto, extra) {
  const cell = document.createElement('td');
  cell.className = 'px-4 py-3 ' + (extra || '');
  cell.textContent = texto;
  return cell;
}

async function carregar() {
  const data = await apiFetch('usuarios');
  usuarios = data.usuarios || [];
  render();
}

function render() {
  const tbody = document.getElementById('tabelaBody');
  tbody.innerHTML = '';
  for (const u of usuarios) {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-100 hover:bg-slate-50';
    tr.appendChild(td(u.nome, 'font-medium'));
    tr.appendChild(td(u.username, 'text-slate-600'));
    tr.appendChild(td(ROLE_LABEL[u.role] || u.role));

    const statusCell = document.createElement('td');
    statusCell.className = 'px-4 py-3';
    const badge = document.createElement('span');
    badge.className = 'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ' +
      (u.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600');
    badge.textContent = u.ativo ? 'Ativo' : 'Inativo';
    statusCell.appendChild(badge);
    tr.appendChild(statusCell);

    const acoes = document.createElement('td');
    acoes.className = 'px-4 py-3 text-right';
    const wrap = document.createElement('div');
    wrap.className = 'flex justify-end gap-2';
    const bEdit = document.createElement('button');
    bEdit.className = 'rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50';
    bEdit.textContent = 'Editar';
    bEdit.addEventListener('click', () => abrirModal(u.id));
    wrap.appendChild(bEdit);
    if (u.id !== session.user.id) {
      const bDel = document.createElement('button');
      bDel.className = 'rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50';
      bDel.textContent = 'Excluir';
      bDel.addEventListener('click', () => excluir(u.id, u.nome));
      wrap.appendChild(bDel);
    }
    acoes.appendChild(wrap);
    tr.appendChild(acoes);
    tbody.appendChild(tr);
  }
}

function abrirModal(id) {
  editId = id || null;
  document.getElementById('modalErro').classList.add('hidden');
  const u = id ? usuarios.find((x) => x.id === id) : null;
  document.getElementById('modalTitulo').textContent = u ? 'Editar usuário' : 'Novo usuário';
  document.getElementById('f_nome').value = u ? u.nome : '';
  document.getElementById('f_username').value = u ? u.username : '';
  document.getElementById('f_username').disabled = Boolean(u);
  document.getElementById('f_role').value = u ? u.role : 'operacional';
  document.getElementById('f_senha').value = '';
  document.getElementById('senhaHint').textContent = u ? '(deixe em branco para manter)' : '(mínimo 8 caracteres)';
  const ativoWrap = document.getElementById('ativoWrap');
  if (u) {
    ativoWrap.classList.remove('hidden');
    ativoWrap.classList.add('flex');
    document.getElementById('f_ativo').checked = u.ativo;
  } else {
    ativoWrap.classList.add('hidden');
    ativoWrap.classList.remove('flex');
  }
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

function mensagemErro(code) {
  const map = {
    invalid_payload: 'Verifique os campos. A senha precisa ter ao menos 8 caracteres.',
    username_taken: 'Este nome de usuário já existe.',
    cannot_delete_self: 'Você não pode excluir o próprio usuário.',
    forbidden: 'Sem permissão para esta ação.'
  };
  return map[code] || 'Não foi possível salvar. Tente novamente.';
}

async function salvar() {
  const erro = document.getElementById('modalErro');
  erro.classList.add('hidden');
  const nome = document.getElementById('f_nome').value.trim();
  const username = document.getElementById('f_username').value.trim();
  const role = document.getElementById('f_role').value;
  const senha = document.getElementById('f_senha').value;
  const btn = document.getElementById('btnSalvar');
  btn.disabled = true;
  btn.textContent = 'Salvando...';
  try {
    if (editId) {
      const payload = { id: editId, nome, role, ativo: document.getElementById('f_ativo').checked };
      if (senha) payload.senha = senha;
      await apiFetch('usuarios', { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('usuarios', { method: 'POST', body: JSON.stringify({ nome, username, role, senha }) });
    }
    fecharModal();
    await carregar();
  } catch (err) {
    erro.textContent = mensagemErro(err.message);
    erro.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar';
  }
}

async function excluir(id, nome) {
  if (!confirm('Excluir o usuário "' + nome + '"?')) return;
  try {
    await apiFetch('usuarios', { method: 'DELETE', body: JSON.stringify({ id }) });
    await carregar();
  } catch (err) {
    alert(mensagemErro(err.message));
  }
}

initHeader();
carregar();
