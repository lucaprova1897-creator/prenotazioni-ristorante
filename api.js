/**
 * api.js
 * Gestisce tutta la comunicazione con JSONBin.io.
 * Le prenotazioni vivono su un bin condiviso: chiunque apra l'app
 * legge e scrive sullo stesso contenitore, in tempo reale.
 *
 * Strategia:
 * - Al caricamento si legge il bin remoto e si sovrascrive la cache locale
 * - Ogni modifica (crea/aggiorna/cancella) riscrive l'intero array sul bin
 * - In caso di errore di rete si lavora sulla cache locale e si ritenta
 */

const JSONBIN_BASE = 'https://api.jsonbin.io/v3';
const API_KEY_STORAGE_KEY = 'jsonbinApiKey';
const BIN_ID_STORAGE_KEY = 'jsonbinBinId';
const CACHE_KEY = 'bookingsCache';

const Api = {
  _syncing: false,

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
      'X-Bin-Meta': 'false', // risposta solo con i dati, senza metadata
    };
  },

  /**
   * Legge le prenotazioni dal bin remoto.
   * Ritorna l'array di prenotazioni, o null in caso di errore.
   */
  async fetchBookings() {
    if (!this.isConfigured()) return null;
    try {
      const res = await fetch(`${JSONBIN_BASE}/b/${this.getBinId()}/latest`, {
        headers: this._headers(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // JSONBin v3 risponde con { record: {...}, metadata: {...} }
      // oppure direttamente con il contenuto se X-Bin-Meta: false funziona.
      // Gestiamo entrambi i casi per sicurezza.
      // Debug: logga la struttura reale della risposta JSONBin
      console.log('[JSONBin] fetchBookings raw:', JSON.stringify(data).slice(0, 200));
      const payload = data?.record ?? data;
      const bookings = Array.isArray(payload?.bookings) ? payload.bookings : [];

      Storage.set(CACHE_KEY, bookings);
      return bookings;
    } catch (err) {
      console.warn('fetchBookings fallito, uso cache locale:', err.message);
      return Storage.get(CACHE_KEY, []);
    }
  },

  /**
   * Sovrascrive l'intero array prenotazioni sul bin remoto.
   * Ritorna true se riuscito, false altrimenti.
   */
  async saveBookings(bookings) {
    if (!this.isConfigured()) return false;
    // Aggiorna subito la cache locale (ottimistico)
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

  /**
   * Crea un nuovo bin per le prenotazioni.
   * Chiamato solo la prima volta, durante il setup iniziale.
   * Ritorna il binId creato, o null in caso di errore.
   */
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

  /**
   * Verifica che la API key sia valida facendo una chiamata test.
   * Ritorna true se valida, false altrimenti.
   */
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
      // 200 o 201 = chiave valida
      if (res.ok) {
        // Eliminiamo subito il bin di test
        const data = await res.json();
        const testId = data?.metadata?.id;
        if (testId) {
          fetch(`${JSONBIN_BASE}/b/${testId}`, {
            method: 'DELETE',
            headers: { 'X-Master-Key': key },
          }).catch(() => {});
        }
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  },
};

window.Api = Api;
