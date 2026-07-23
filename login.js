async function apiFetch(path, options = {}) {
  const session = getSession();
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  if (session && session.token) headers['Authorization'] = 'Bearer ' + session.token;
  const res = await fetch('/api/' + path, Object.assign({}, options, { headers }));
  if (res.status === 401) {
    clearSession();
    window.location.replace('/index.html');
    throw new Error('unauthorized');
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || 'request_failed');
  return data;
}
