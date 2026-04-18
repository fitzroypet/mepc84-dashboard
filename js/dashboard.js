import { loadAllData } from './data/loader.js';
import { enrichRegister, enrichCrossAgenda } from './data/crossref.js';
import { CONFIG } from './config.js';

import { renderStancePie }      from './charts/stancePie.js';
import { renderSentimentBar }   from './charts/sentimentBar.js';
import { renderOriginatorBubble }from './charts/originatorBubble.js';
import { renderAgendaHeatmap }  from './charts/agendaHeatmap.js';
import { renderDevStatusDonut } from './charts/devStatusDonut.js';
import { renderWorldMap }       from './charts/worldMap.js';
import { renderStanceByGroup }  from './charts/stanceByGroup.js';

// ── Global state ─────────────────────────────────────────────────────────────
const state = {
  agendaItem: null,
  devGroup:   null,
  sentiment:  null,
  stanceMacro: null,
};

let _data = null;  // raw loaded data
let _enrichedRegister  = null;
let _enrichedCrossAgenda = null;

// ── Filter helpers ────────────────────────────────────────────────────────────
function applyFilters(register) {
  return register.filter(r => {
    if (state.agendaItem && r.agendaItem !== state.agendaItem) return false;
    if (state.sentiment  && r.sentiment  !== state.sentiment)  return false;
    if (state.stanceMacro && r.stanceMacro !== state.stanceMacro) return false;
    if (state.devGroup && r.devClassification !== state.devGroup) return false;
    return true;
  });
}

function filterCrossAgenda(crossAgenda) {
  if (!state.devGroup) return crossAgenda;
  return crossAgenda.filter(r => r.devClassification === state.devGroup);
}

// ── Render all charts ─────────────────────────────────────────────────────────
function renderAll() {
  const filteredRegister    = applyFilters(_enrichedRegister);
  const filteredCrossAgenda = filterCrossAgenda(_enrichedCrossAgenda);

  renderStancePie('chart-stance-pie', filteredRegister, state, onFilter);
  renderSentimentBar('chart-sentiment-bar', filteredRegister, state, onFilter);
  renderOriginatorBubble('chart-bubble', filteredCrossAgenda, state, onFilter);
  renderAgendaHeatmap('chart-heatmap', filteredCrossAgenda, state, onFilter);
  renderDevStatusDonut('chart-dev-donut', _data.countryList, state, onFilter);
  renderWorldMap('chart-world-map', _data.countryList, _data.imoMembers, state, onFilter);
  renderStanceByGroup('chart-stance-group', filteredRegister, state, onFilter);

  updateFilterSummary(filteredRegister.length);
}

// ── Filter callback ───────────────────────────────────────────────────────────
function onFilter(key, value) {
  // Toggle off if same value clicked again
  state[key] = state[key] === value ? null : value;
  syncDropdowns();
  renderAll();
}

// ── Sync sidebar dropdowns to state ──────────────────────────────────────────
function syncDropdowns() {
  document.getElementById('filter-agenda').value   = state.agendaItem || '';
  document.getElementById('filter-sentiment').value = state.sentiment || '';
  document.getElementById('filter-stance').value   = state.stanceMacro || '';
  document.getElementById('filter-dev').value      = state.devGroup || '';
}

function updateFilterSummary(count) {
  const active = Object.values(state).filter(Boolean).length;
  const el = document.getElementById('filter-summary');
  if (!el) return;
  el.textContent = active
    ? `${count} submissions match ${active} active filter${active > 1 ? 's' : ''}`
    : '';
  document.getElementById('record-count').textContent = `${count} submissions`;
}

// ── Populate Agenda Item dropdown ─────────────────────────────────────────────
function populateAgendaDropdown(register) {
  const agendas = [...new Set(register.map(r => r.agendaItem))]
    .filter(Boolean)
    .sort((a, b) => +a - +b);
  const sel = document.getElementById('filter-agenda');
  agendas.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a;
    opt.textContent = `${a} — ${CONFIG.agendaLabels[a] || 'Item ' + a}`;
    sel.appendChild(opt);
  });
}

// ── Wire sidebar dropdowns ────────────────────────────────────────────────────
function wireDropdowns() {
  document.getElementById('filter-agenda').addEventListener('change', e => {
    state.agendaItem = e.target.value || null;
    renderAll();
  });
  document.getElementById('filter-sentiment').addEventListener('change', e => {
    state.sentiment = e.target.value || null;
    renderAll();
  });
  document.getElementById('filter-stance').addEventListener('change', e => {
    state.stanceMacro = e.target.value || null;
    renderAll();
  });
  document.getElementById('filter-dev').addEventListener('change', e => {
    state.devGroup = e.target.value || null;
    renderAll();
  });
  document.getElementById('clear-filters').addEventListener('click', () => {
    state.agendaItem = null;
    state.devGroup   = null;
    state.sentiment  = null;
    state.stanceMacro = null;
    syncDropdowns();
    renderAll();
  });
}

// ── Setup overlay ─────────────────────────────────────────────────────────────
function handleSetupOverlay() {
  const overlay = document.getElementById('setup-overlay');
  const { isConfigured } = CONFIG;
  // Show overlay if using local files
  if (_data._source === 'Local Excel') {
    overlay.classList.remove('hidden');
  }
  document.getElementById('setup-dismiss').addEventListener('click', () => {
    overlay.classList.add('hidden');
  });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function init() {
  const loadingEl  = document.getElementById('loading-screen');
  const errorEl    = document.getElementById('error-screen');
  const appEl      = document.getElementById('app');
  const sourceBadge = document.getElementById('data-source-badge');

  try {
    _data = await loadAllData();

    // Enrich with cross-reference classification
    [_enrichedRegister, _enrichedCrossAgenda] = await Promise.all([
      enrichRegister(_data.register, _data.countryList),
      enrichCrossAgenda(_data.crossAgenda, _data.countryList),
    ]);

    // Update source badge
    sourceBadge.textContent = _data._source;

    // Show app
    loadingEl.classList.add('hidden');
    appEl.classList.remove('hidden');

    populateAgendaDropdown(_data.register);
    wireDropdowns();
    handleSetupOverlay();
    renderAll();

    // Re-render on resize (debounced)
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderAll, 250);
    });

  } catch (err) {
    loadingEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
    document.getElementById('error-message').textContent =
      err.message || 'Failed to load data. Check console for details.';
    console.error(err);

    document.getElementById('retry-btn').addEventListener('click', () => {
      errorEl.classList.add('hidden');
      loadingEl.classList.remove('hidden');
      init();
    });
  }
}

// postMessage API for iframe embed
window.addEventListener('message', (event) => {
  const { filter, value } = event.data || {};
  if (filter && filter in state) {
    state[filter] = value || null;
    syncDropdowns();
    renderAll();
  }
});

init();
