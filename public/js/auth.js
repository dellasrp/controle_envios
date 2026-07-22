const SESSION_KEY = 'ce_session';

function saveSession(data) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function tokenPayload(token) {
  try {
    const part = token.split('.')[1];
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(normalized))));
  } catch {
    return null;
  }
}

function isExpired(token) {
  const p = tokenPayload(token);
  if (!p || !p.exp) return true;
  return p.exp * 1000 < Date.now();
}

function requireAuth(allowedRoles) {
  const s = getSession();
  if (!s || !s.token || isExpired(s.token)) {
    clearSession();
    window.location.replace('/index.html');
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(s.user.role)) {
    window.location.replace('/app.html');
    return null;
  }
  return s;
}

function logout() {
  clearSession();
  window.location.replace('/index.html');
}
