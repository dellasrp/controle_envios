const session = requireAuthTrocaSenha();

function init() {
  if (!session) return;
  if (senhaPendente(session)) {
    document.getElementById('subtitulo').textContent =
      'Sua senha atual é provisória. Defina uma senha pessoal para continuar.';
  } else {
    document.getElementById('subtitulo').textContent = 'Altere sua senha de acesso.';
  }
}

function mensagemErro(code) {
  const mapa = {
    senha_curta: 'A nova senha precisa ter ao menos 8 caracteres.',
    senha_igual: 'A nova senha precisa ser diferente da atual.',
    senha_atual_incorreta: 'A senha atual está incorreta.',
    forbidden: 'Usuário inativo. Procure o administrador.',
    not_found: 'Usuário não encontrado.'
  };
  return mapa[code] || 'Não foi possível salvar. Tente novamente.';
}

document.getElementById('trocaForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const erroBox = document.getElementById('erroBox');
  const sucessoBox = document.getElementById('sucessoBox');
  erroBox.classList.add('hidden');
  sucessoBox.classList.add('hidden');

  const senhaAtual = document.getElementById('senhaAtual').value;
  const novaSenha = document.getElementById('novaSenha').value;
  const confirma = document.getElementById('confirmaSenha').value;

  if (novaSenha.length < 8) {
    erroBox.textContent = mensagemErro('senha_curta');
    erroBox.classList.remove('hidden');
    return;
  }
  if (novaSenha !== confirma) {
    erroBox.textContent = 'A confirmação não confere com a nova senha.';
    erroBox.classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('btnSalvar');
  btn.disabled = true;
  btn.textContent = 'Salvando...';
  try {
    const data = await apiFetch('senha', {
      method: 'PUT',
      body: JSON.stringify({ senhaAtual, novaSenha })
    });
    saveSession({ token: data.token, user: data.user });
    sucessoBox.textContent = 'Senha alterada com sucesso. Redirecionando...';
    sucessoBox.classList.remove('hidden');
    setTimeout(() => window.location.replace('/app.html'), 1200);
  } catch (err) {
    erroBox.textContent = mensagemErro(err.message);
    erroBox.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar nova senha';
  }
});

init();
