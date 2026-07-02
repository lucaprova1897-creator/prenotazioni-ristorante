/**
 * api.js
 * Comunicazione con JSONBin.io per prenotazioni condivise tra dispositivi.
 * JSONBin v3 risponde sempre con { record: {...}, metadata: {...} }
 * quindi leggiamo sempre data.record come payload principale.
 */

const JSONBIN_BASE = 'https://api.jsonbin.io/v3';
const API_KEY_STORAGE_KEY = 'jsonbinApiKey';
const BIN_ID_STORAGE_KEY = 'jsonbinBinId';
const CACHE_KEY = 'bookingsCache';

const Api = {

  getApiKey() {
    return Storage.get(API_KEY_STORAGE_KEY, null);
  },

  saveApiKey(key) {
    Storage.set(API_KEY_STORAGE_KEY, key.trim());
  },

  getBinId() {
    return Storage.get(BIN_ID_STORAGE_KEY, null);
  },

  saveBinId(id) {
    Storage.set(BIN_ID_STORAGE_KEY, id.trim());
  },

  isConfigured() {
    return !!(this.getApiKey() && this.getBinId());
  },

  _headers() {
    return {
      'Content-Type': 'application/json',
      'X-Master-Key': this.getApiKey(),
    };
  },

  async fetchBookings() {
    if (!this.isConfigured()) return null;
    try {
      const res = await fetch(`${JSONBIN_BASE}/b/${this.getBinId()}/latest`, {
        headers: this._headers(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const bookings = Array.isArray(data?.record?.bookings) ? data.record.bookings : [];
      Storage.set(CACHE_KEY, bookings);
      return bookings;
    } catch (err) {
      console.warn('fetchBookings fallito, uso cache locale:', err.message);
      return Storage.get(CACHE_KEY, []);
    }
  },

  async saveBookings(bookings) {
    if (!this.isConfigured()) return false;
    Storage.set(CACHE_KEY, bookings);
    try {
      const res = await fetch(`${JSONBIN_BASE}/b/${this.getBinId()}`, {
        method: 'PUT',
        headers: this._headers(),
        body: JSON.stringify({ bookings }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err) {
      console.warn('saveBookings fallito:', err.message);
      return false;
    }
  },

  async createBin() {
    if (!this.getApiKey()) return null;
    try {
      const res = await fetch(`${JSONBIN_BASE}/b`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': this.getApiKey(),
          'X-Bin-Name': 'prenotazioni-ristorante',
          'X-Bin-Private': 'true',
        },
        body: JSON.stringify({ bookings: [] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const binId = data?.metadata?.id;
      if (binId) {
        this.saveBinId(binId);
        return binId;
      }
      return null;
    } catch (err) {
      console.error('createBin fallito:', err.message);
      return null;
    }
  },

  async testApiKey(key) {
    try {
      const res = await fetch(`${JSONBIN_BASE}/b`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': key,
          'X-Bin-Name': 'test-connessione',
          'X-Bin-Private': 'true',
        },
        body: JSON.stringify({ test: true }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      const testId = data?.metadata?.id;
      if (testId) {
        fetch(`${JSONBIN_BASE}/b/${testId}`, {
          method: 'DELETE',
          headers: { 'X-Master-Key': key },
        }).catch(() => {});
      }
      return true;
    } catch (err) {
      return false;
    }
  },
};

window.Api = Api;
