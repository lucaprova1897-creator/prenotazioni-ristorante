/**
 * app.js — bootstrap, event listeners, service worker, stato online/offline.
 */

document.addEventListener('DOMContentLoaded', () => init());

async function init() {
  // Se non configurato, mostra il setup; altrimenti carica i dati e vai
  if (!Api.isConfigured()) {
    UI.showScreen('setup');
    bindSetup();
  } else {
    bindAll();
    UI.state.selectedDate = Utils.todayISO();
    UI.state.selectedService = Utils.currentService();
    UI.state.previewDate = UI.state.selectedDate;
    UI.state.previewService = UI.state.selectedService;

    // Carica prenotazioni dal bin condiviso prima di mostrare la dashboard
    UI.showSyncIndicator(true);
    await Bookings.loadAll();
    UI.showSyncIndicator(false);
    UI.showScreen('dashboard');
  }

  registerServiceWorker();
  watchOnlineStatus();
}

function bindAll() {
  bindSetup();
  bindBottomNav();
  bindDashboard();
  bindList();
  bindSearch();
  bindConfig();
  bindForm();
  bindDeleteModal();
  bindPreview();
}

/* ==========================================================================
   SETUP INIZIALE
   ========================================================================== */
function bindSetup() {
  const btn = document.getElementById('setupSubmitBtn');
  if (btn && !btn._bound) {
    btn._bound = true;
    btn.addEventListener('click', async () => {
      await UI.handleSetupSubmit();
      // Dopo il setup, collega tutti i listener
      bindAll();
    });
  }

  const resetBtn = document.getElementById('resetSetupBtn');
  if (resetBtn && !resetBtn._bound) {
    resetBtn._bound = true;
    resetBtn.addEventListener('click', () => {
      Storage.remove('jsonbinApiKey');
      Storage.remove('jsonbinBinId');
      document.getElementById('setupApiKey').value = '';
      document.getElementById('setupBinId').value = '';
      document.getElementById('setupError').classList.add('hidden');
      UI.showScreen('setup');
    });
  }
}

/* ==========================================================================
   BOTTOM NAV
   ========================================================================== */
function bindBottomNav() {
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => UI.showScreen(btn.dataset.screen));
  });
}

/* ==========================================================================
   DASHBOARD
   ========================================================================== */
function bindDashboard() {
  document.getElementById('dashPrevDay').addEventListener('click', () => {
    UI.state.selectedDate = UI.shiftDate(UI.state.selectedDate, -1);
    UI.renderDashboard();
  });
  document.getElementById('dashNextDay').addEventListener('click', () => {
    UI.state.selectedDate = UI.shiftDate(UI.state.selectedDate, 1);
    UI.renderDashboard();
  });
  document.getElementById('btnServiceLunch').addEventListener('click', () => {
    UI.state.selectedService = 'lunch';
    UI.renderDashboard();
  });
  document.getElementById('btnServiceDinner').addEventListener('click', () => {
    UI.state.selectedService = 'dinner';
    UI.renderDashboard();
  });
  document.getElementById('fabNewBooking').addEventListener('click', () => UI.openNewForm());
  document.getElementById('refreshBtn').addEventListener('click', async () => {
    UI.showSyncIndicator(true);
    await Bookings.loadAll();
    UI.showSyncIndicator(false);
    UI.renderDashboard();
    UI.toast('Dati aggiornati ✓');
  });
}

/* ==========================================================================
   LISTA
   ========================================================================== */
function bindList() {
  document.getElementById('listPrevDay').addEventListener('click', () => {
    UI.state.selectedDate = UI.shiftDate(UI.state.selectedDate, -1);
    UI.renderList();
  });
  document.getElementById('listNextDay').addEventListener('click', () => {
    UI.state.selectedDate = UI.shiftDate(UI.state.selectedDate, 1);
    UI.renderList();
  });
  document.getElementById('listBtnLunch').addEventListener('click', () => {
    UI.state.selectedService = 'lunch';
    UI.renderList();
  });
  document.getElementById('listBtnDinner').addEventListener('click', () => {
    UI.state.selectedService = 'dinner';
    UI.renderList();
  });
  document.getElementById('fabNewBookingList').addEventListener('click', () => UI.openNewForm());
  document.getElementById('openPreviewBtn').addEventListener('click', () => UI.openPreview());
}

/* ==========================================================================
   RICERCA
   ========================================================================== */
function bindSearch() {
  const input = document.getElementById('searchInput');
  const debouncedSearch = Utils.debounce((v) => UI.renderSearch(v), 120);
  input.addEventListener('input', (e) => debouncedSearch(e.target.value));
}

/* ==========================================================================
   CONFIGURAZIONE
   ========================================================================== */
function bindConfig() {
  const debouncedSave = Utils.debounce(() => UI.saveConfigFromForm(), 400);
  ['cfgTablesIndoor','cfgTablesOutdoor','cfgLunchStart','cfgLunchEnd',
   'cfgDinnerStart','cfgDinnerEnd','cfgSlotDuration','cfgMaxPerSlot',
   'cfgDoubleShiftDuration'].forEach((id) => {
    document.getElementById(id).addEventListener('input', debouncedSave);
  });
  document.querySelectorAll('#cfgDoubleShiftDays .day-toggle').forEach((btn) => {
    btn.addEventListener('click', () => { btn.classList.toggle('active'); debouncedSave(); });
  });
}

/* ==========================================================================
   FORM PRENOTAZIONE
   ========================================================================== */
function bindForm() {
  document.getElementById('formBackBtn').addEventListener('click', () => {
    UI.showScreen(UI.state.editingBookingId ? 'list' : 'dashboard');
  });
  document.getElementById('fName').addEventListener('input', () => UI.updateSaveButtonState());
  document.getElementById('peopleMinus').addEventListener('click', () => UI.setPeopleValue(UI._peopleValue - 1));
  document.getElementById('peoplePlus').addEventListener('click', () => UI.setPeopleValue(UI._peopleValue + 1));
  document.getElementById('dogsMinus').addEventListener('click', () => UI.setDogsValue(UI._dogsValue - 1));
  document.getElementById('dogsPlus').addEventListener('click', () => UI.setDogsValue(UI._dogsValue + 1));
  document.getElementById('fDate').addEventListener('change', () => {
    UI.populateSlotGrid();
    UI._selectedTime = null;
    UI.autoSelectFirstAvailableSlot();
  });
  document.querySelectorAll('#formServiceOptions .service-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      UI.setFormService(btn.dataset.service);
      UI._selectedTime = null;
      UI.autoSelectFirstAvailableSlot();
    });
  });
  document.querySelectorAll('#formZoneOptions .zone-btn').forEach((btn) => {
    btn.addEventListener('click', () => UI.setFormZone(btn.dataset.zone));
  });
  document.getElementById('optionalToggle').addEventListener('click', () => {
    const expanded = document.getElementById('optionalToggle').classList.toggle('expanded');
    document.getElementById('optionalFields').classList.toggle('expanded', expanded);
  });
  document.getElementById('saveBtn').addEventListener('click', () => UI.saveForm());
  document.getElementById('deleteLink').addEventListener('click', (e) => {
    e.preventDefault();
    UI.confirmDelete();
  });
}

/* ==========================================================================
   MODAL CANCELLAZIONE
   ========================================================================== */
function bindDeleteModal() {
  document.getElementById('deleteModalCancel').addEventListener('click', () => {
    document.getElementById('deleteModal').classList.remove('active');
  });
  document.getElementById('deleteModalConfirm').addEventListener('click', () => UI.executeDelete());
}

/* ==========================================================================
   ANTEPRIMA
   ========================================================================== */
function bindPreview() {
  document.getElementById('previewBackBtn').addEventListener('click', () => UI.showScreen('list'));
  document.getElementById('previewPrevDay').addEventListener('click', () => {
    UI.state.previewDate = UI.shiftDate(UI.state.previewDate, -1);
    UI.renderPreview();
  });
  document.getElementById('previewNextDay').addEventListener('click', () => {
    UI.state.previewDate = UI.shiftDate(UI.state.previewDate, 1);
    UI.renderPreview();
  });
  document.getElementById('previewBtnLunch').addEventListener('click', () => {
    UI.state.previewService = 'lunch';
    UI.renderPreview();
  });
  document.getElementById('previewBtnDinner').addEventListener('click', () => {
    UI.state.previewService = 'dinner';
    UI.renderPreview();
  });
}

/* ==========================================================================
   ONLINE / OFFLINE
   ========================================================================== */
function watchOnlineStatus() {
  const badge = document.getElementById('offlineBadge');
  function update() { badge.classList.toggle('visible', !navigator.onLine); }
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

/* ==========================================================================
   SERVICE WORKER
   ========================================================================== */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch(console.error);
    });
  }
}
