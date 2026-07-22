const form = document.getElementById('loginForm');
const errorBox = document.getElementById('loginError');

const existente = getSession();
if (existente && existente.token && !isExpired(existente.token)) {
  window.location.replace('/app.html');
}

function mensagemErro(code) {
  const map = {
    invalid_credentials: 'Usuário ou senha inválidos.',
    too_many_attempts: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    missing_credentials: 'Preencha usuário e senha.',
    invalid_json: 'Requisição inválida.'
  };
  return map[code] || 'Não foi possível entrar. Tente novamente.';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.classList.add('hidden');
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.textContent = 'Entrando...';
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'invalid_credentials');
    saveSession({ token: data.token, user: data.user });
    window.location.replace('/app.html');
  } catch (err) {
    errorBox.textContent = mensagemErro(err.message);
    errorBox.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});
