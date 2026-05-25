function resolveApiBase() {
  const overridden = process.env.REACT_APP_API_URL;
  if (overridden && overridden.trim()) return overridden.endsWith('/api') ? overridden : `${overridden.replace(/\/+$/, '')}/api`;
  const isLocal = typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname);
  if (isLocal) {
    const devPortMap = { '3000': '5001', '3001': '5001', '3002': '5001' };
    const port = window.location.port || '3000';
    const backendPort = devPortMap[port] || '5001';
    return `http://${window.location.hostname}:${backendPort}/api`;
  }
  return 'http://localhost:5001/api';
}
const API_BASE_URL = resolveApiBase();

export async function apiGet(path) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/signin';
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost(path, body) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/signin';
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

export { API_BASE_URL };
