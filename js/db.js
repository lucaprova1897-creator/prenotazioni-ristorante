const SUPABASE_URL = 'https://shdzchwhymajnqhocirp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mGeU1ZJTZytOTxuXln9wKQ_KK_zOjKG';
const API_URL = `${SUPABASE_URL}/rest/v1/prenotazioni`;

const PASSWORD_READ  = 'Ristorante2026';
const PASSWORD_ADMIN = 'RistoranteTchappe26';

const DB = {
  _role: 'none',

  getRole()    { return this._role; },
  isLoggedIn() { return this._role !== 'none'; },
  canEdit()    { return this._role === 'admin'; },

  login(password) {
    if (password === PASSWORD_ADMIN) { this._role = 'admin'; Storage.set('role', 'admin'); return 'admin'; }
    if (password === PASSWORD_READ)  { this._role = 'read';  Storage.set('role', 'read');  return 'read'; }
    return null;
  },

  logout() {
    this._role = 'none';
    Storage.remove('role');
  },

  restoreSession() {
    const saved = Storage.get('role', 'none');
    if (saved === 'admin' || saved === 'read') { this._role = saved; return true; }
    return false;
  },

  _headers() {
    return {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation',
    };
  },

  async fetchAll() {
    try {
      const res = await fetch(`${API_URL}?order=date.asc,time.asc`, {
        headers: this._headers(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('fetchAll fallito:', err.message);
      return Storage.get('bookingsCache', []);
    }
  },

  async create(booking) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(booking),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
  },

  async update(id, patch) {
    const res = await fetch(`${API_URL}?id=eq.${id}`, {
      method: 'PATCH',
      headers: this._headers(),
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
  },

  async remove(id) {
    const res = await fetch(`${API_URL}?id=eq.${id}`, {
      method: 'DELETE',
      headers: this._headers(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  },
};

window.DB = DB;
