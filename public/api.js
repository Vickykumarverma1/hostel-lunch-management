/* ===================================================================
   API Client — Authenticated fetch wrapper
   =================================================================== */

const API = {
  baseUrl: '/api',

  getToken() {
    return localStorage.getItem('hlm_token');
  },

  setToken(token) {
    localStorage.setItem('hlm_token', token);
  },

  clearToken() {
    localStorage.removeItem('hlm_token');
    localStorage.removeItem('hlm_role');
    localStorage.removeItem('hlm_user');
  },

  setUser(role, user) {
    localStorage.setItem('hlm_role', role);
    localStorage.setItem('hlm_user', JSON.stringify(user));
  },

  getRole() {
    return localStorage.getItem('hlm_role');
  },

  getUser() {
    try { return JSON.parse(localStorage.getItem('hlm_user')); } catch { return null; }
  },

  async request(method, path, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const token = this.getToken();
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(this.baseUrl + path, opts);
    const data = await res.json();

    if (res.status === 401) {
      this.clearToken();
      showPage('landing-page');
      showToast('Session expired. Please login again.');
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  delete(path) { return this.request('DELETE', path); }
};
