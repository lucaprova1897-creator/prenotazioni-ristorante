/**
 * storage.js
 * Wrapper su localStorage per dati locali (config, API key, cache).
 * Le prenotazioni invece viaggiano su JSONBin tramite api.js.
 */

const STORAGE_PREFIX = 'ristoPWA:';

const Storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
      return true;
    } catch (err) {
      return false;
    }
  },
};

window.Storage = Storage;
