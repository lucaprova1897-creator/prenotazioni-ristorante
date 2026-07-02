/**
 * bookings.js
 * CRUD prenotazioni con backend JSONBin condiviso.
 * Tutti i metodi principali sono async: leggono/scrivono online
 * ma cadono sulla cache locale se la rete non è disponibile.
 */

const STATUS = {
  CONFIRMED: 'confirmed',
  ARRIVED: 'arrived',
  SEATED: 'seated',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NOSHOW: 'noshow',
};

const STATUS_LABELS = {
  [STATUS.CONFIRMED]: 'Confermata',
  [STATUS.ARRIVED]: 'Arrivati',
  [STATUS.SEATED]: 'Seduti',
  [STATUS.COMPLETED]: 'Terminata',
  [STATUS.CANCELLED]: 'Cancellata',
  [STATUS.NOSHOW]: 'No Show',
};

const ZONE_LABELS = {
  indoor: 'Interno',
  outdoor: 'Esterno',
  any: 'Indifferente',
};

const Bookings = {
  // Cache in memoria: viene ricaricata da JSONBin all'avvio e dopo ogni modifica
  _cache: null,

  _generateId() {
    return `bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  },

  /**
   * Carica le prenotazioni da JSONBin (o dalla cache locale se offline).
   * Deve essere chiamato all'avvio e prima di ogni operazione critica.
   */
  async loadAll() {
    const bookings = await Api.fetchBookings();
    this._cache = bookings || [];
    return this._cache;
  },

  /**
   * Ritorna la cache in memoria senza fare chiamate di rete.
   * Da usare dentro operazioni che hanno già chiamato loadAll().
   */
  getCached() {
    return this._cache || [];
  },

  async _persist() {
    return await Api.saveBookings(this._cache);
  },

  async create(data) {
    if (!this._cache) await this.loadAll();
    const now = new Date().toISOString();
    const doubleShift = Slots.getDoubleShiftInfo(data.service, data.date, data.time);

    const booking = {
      id: this._generateId(),
      name: data.name?.trim() || '',
      phone: data.phone?.trim() || '',
      people: Number(data.people) || 1,
      date: data.date,
      time: data.time,
      service: data.service,
      zone: data.zone || 'any',
      dogs: Number(data.dogs) || 0,
      intolerances: data.intolerances?.trim() || '',
      specialNeeds: data.specialNeeds?.trim() || '',
      notes: data.notes?.trim() || '',
      status: data.status || STATUS.CONFIRMED,
      doubleShift: doubleShift,
      isNew: true,
      createdAt: now,
      updatedAt: now,
    };

    this._cache.push(booking);
    const ok = await this._persist();
    return { booking, synced: ok };
  },

  async update(id, patch) {
    if (!this._cache) await this.loadAll();
    const idx = this._cache.findIndex((b) => b.id === id);
    if (idx === -1) return null;

    const updated = { ...this._cache[idx], ...patch, updatedAt: new Date().toISOString() };
    if (patch.date || patch.time || patch.service) {
      updated.doubleShift = Slots.getDoubleShiftInfo(updated.service, updated.date, updated.time);
    }
    this._cache[idx] = updated;
    const ok = await this._persist();
    return { booking: updated, synced: ok };
  },

  async remove(id) {
    if (!this._cache) await this.loadAll();
    this._cache = this._cache.filter((b) => b.id !== id);
    return await this._persist();
  },

  async markAsTranscribed(id) {
    if (!this._cache) await this.loadAll();
    const idx = this._cache.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    this._cache[idx] = { ...this._cache[idx], isNew: false };
    const ok = await this._persist();
    return { booking: this._cache[idx], synced: ok };
  },

  getById(id) {
    return (this._cache || []).find((b) => b.id === id) || null;
  },

  getByDateAndService(dateISO, serviceKey) {
    return (this._cache || [])
      .filter((b) => b.date === dateISO && b.service === serviceKey)
      .sort((a, b) => {
        if (a.time !== b.time) return a.time.localeCompare(b.time);
        return a.createdAt.localeCompare(b.createdAt);
      });
  },

  getByDate(dateISO) {
    return (this._cache || [])
      .filter((b) => b.date === dateISO)
      .sort((a, b) => {
        if (a.time !== b.time) return a.time.localeCompare(b.time);
        return a.createdAt.localeCompare(b.createdAt);
      });
  },

  search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (this._cache || [])
      .filter((b) =>
        b.name.toLowerCase().includes(q) ||
        b.phone.toLowerCase().includes(q) ||
        b.date.includes(q)
      )
      .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  },

  getStatsForDateAndService(dateISO, serviceKey) {
    const list = this.getByDateAndService(dateISO, serviceKey).filter(
      (b) => b.status !== STATUS.CANCELLED
    );
    const totalGuests = list.reduce((sum, b) => sum + b.people, 0);
    return { totalGuests, totalTablesBooked: list.length, totalBookings: list.length };
  },
};

window.STATUS = STATUS;
window.STATUS_LABELS = STATUS_LABELS;
window.ZONE_LABELS = ZONE_LABELS;
window.Bookings = Bookings;
