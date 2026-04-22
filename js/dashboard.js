import { loadCountryClassificationData } from './data/loader.js';
import { renderWorldMap } from './charts/worldMap.js';
import {
  enrichCountryList,
  getAvailableContinents,
  IMO_MEMBER_FILTER_OPTIONS,
  MARPOL_FILTER_OPTIONS,
} from './data/continents.js';

let data = null;
let selectedContinents = new Set();
let selectedImoMember = 'all';
let selectedMarpol = 'all';

function getUi() {
  return {
    loadingEl: document.getElementById('loading-screen'),
    errorEl: document.getElementById('error-screen'),
    appEl: document.getElementById('app'),
    continentFilterLabelEl: document.getElementById('continent-filter-label'),
    continentFilterOptionsEl: document.getElementById('continent-filter-options'),
    continentSelectAllBtn: document.getElementById('continent-select-all'),
    continentClearBtn: document.getElementById('continent-clear'),
    imoFilterEl: document.getElementById('imo-filter'),
    marpolFilterEl: document.getElementById('marpol-filter'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    filterSummaryEl: document.getElementById('filter-summary'),
    errorMessageEl: document.getElementById('error-message')
      || document.querySelector('#error-screen p'),
    retryBtn: document.getElementById('retry-btn'),
  };
}

function showError(error) {
  const { loadingEl, errorEl, appEl, errorMessageEl } = getUi();

  loadingEl?.classList.add('hidden');
  appEl?.classList.add('hidden');
  errorEl?.classList.remove('hidden');

  if (errorMessageEl) {
    errorMessageEl.textContent =
      error?.message || 'Failed to load country classification data.';
  }
}

async function render() {
  if (!data) return;
  const stats = await renderWorldMap('chart-world-map', data.countryList, {
    continents: [...selectedContinents],
    imoMember: selectedImoMember,
    marpol: selectedMarpol,
  });
  updateFilterSummary(stats);
}

function formatCountryCount(count) {
  return `${count} ${count === 1 ? 'country' : 'countries'}`;
}

function getContinentSelectionLabel(continents) {
  if (selectedContinents.size === 0 || selectedContinents.size === continents.length) {
    return 'All continents';
  }

  const selectedLabels = continents.filter(continent => selectedContinents.has(continent));
  if (selectedLabels.length <= 2) {
    return selectedLabels.join(', ');
  }

  return `${selectedLabels.length} continents selected`;
}

function updateContinentFilterLabel(continents) {
  const { continentFilterLabelEl } = getUi();
  if (!continentFilterLabelEl) return;
  continentFilterLabelEl.textContent = getContinentSelectionLabel(continents);
}

function syncContinentCheckboxes() {
  const { continentFilterOptionsEl } = getUi();
  if (!continentFilterOptionsEl) return;
  continentFilterOptionsEl.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.checked = selectedContinents.has(input.value);
  });
}

function updateFilterSummary(stats) {
  const { filterSummaryEl, resetFiltersBtn } = getUi();
  const activeCountryCount = stats?.activeCountryCount ?? data?.countryList.length ?? 0;
  const totalCountryCount = stats?.totalCountryCount ?? data?.countryList.length ?? 0;
  const hasActiveFilters =
    selectedContinents.size > 0 ||
    selectedImoMember !== 'all' ||
    selectedMarpol !== 'all';

  if (filterSummaryEl) {
    filterSummaryEl.textContent = activeCountryCount === totalCountryCount
      ? `${formatCountryCount(totalCountryCount)} shown`
      : `${formatCountryCount(activeCountryCount)} of ${totalCountryCount} shown`;
  }

  if (resetFiltersBtn) {
    resetFiltersBtn.disabled = !hasActiveFilters;
  }
}

function populateContinentFilter() {
  const {
    continentFilterOptionsEl,
    continentSelectAllBtn,
    continentClearBtn,
  } = getUi();
  if (!continentFilterOptionsEl || !data) return;

  const continents = getAvailableContinents(data.countryList);
  continentFilterOptionsEl.innerHTML = continents
    .map(continent => `
      <label class="filter-check">
        <input type="checkbox" value="${continent}">
        <span>${continent}</span>
      </label>
    `)
    .join('');

  continentFilterOptionsEl.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.onchange = event => {
      if (event.target.checked) {
        selectedContinents.add(event.target.value);
      } else {
        selectedContinents.delete(event.target.value);
      }

      updateContinentFilterLabel(continents);
      render().catch(error => console.error(error));
    };
  });

  if (continentSelectAllBtn) {
    continentSelectAllBtn.onclick = () => {
      selectedContinents = new Set(continents);
      syncContinentCheckboxes();
      updateContinentFilterLabel(continents);
      render().catch(error => console.error(error));
    };
  }

  if (continentClearBtn) {
    continentClearBtn.onclick = () => {
      selectedContinents.clear();
      syncContinentCheckboxes();
      updateContinentFilterLabel(continents);
      render().catch(error => console.error(error));
    };
  }

  syncContinentCheckboxes();
  updateContinentFilterLabel(continents);
}

function populateDropdown(selectEl, options, selectedValue) {
  if (!selectEl) return;

  selectEl.innerHTML = options
    .map(option => {
      const selected = option.value === selectedValue ? ' selected' : '';
      return `<option value="${option.value}"${selected}>${option.label}</option>`;
    })
    .join('');
}

function populateSecondaryFilters() {
  const { imoFilterEl, marpolFilterEl, resetFiltersBtn } = getUi();

  populateDropdown(imoFilterEl, IMO_MEMBER_FILTER_OPTIONS, selectedImoMember);
  populateDropdown(marpolFilterEl, MARPOL_FILTER_OPTIONS, selectedMarpol);

  if (imoFilterEl) {
    imoFilterEl.onchange = event => {
      selectedImoMember = event.target.value || 'all';
      render().catch(error => console.error(error));
    };
  }

  if (marpolFilterEl) {
    marpolFilterEl.onchange = event => {
      selectedMarpol = event.target.value || 'all';
      render().catch(error => console.error(error));
    };
  }

  if (resetFiltersBtn) {
    resetFiltersBtn.onclick = () => {
      selectedContinents.clear();
      selectedImoMember = 'all';
      selectedMarpol = 'all';
      populateContinentFilter();
      populateSecondaryFilters();
      render().catch(error => console.error(error));
    };
  }
}

async function init() {
  const { loadingEl, errorEl, appEl, retryBtn } = getUi();

  if (!loadingEl || !errorEl || !appEl) {
    console.error('Dashboard bootstrap aborted: required UI elements are missing.');
    return;
  }

  try {
    const loadedData = await loadCountryClassificationData();
    data = {
      ...loadedData,
      countryList: enrichCountryList(loadedData.countryList, loadedData.imoMembers),
    };
    populateContinentFilter();
    populateSecondaryFilters();
    loadingEl.classList.add('hidden');
    errorEl.classList.add('hidden');
    appEl.classList.remove('hidden');
    await render();
  } catch (error) {
    console.error(error);
    showError(error);
  }

  if (retryBtn) {
    retryBtn.onclick = () => {
      errorEl.classList.add('hidden');
      loadingEl.classList.remove('hidden');
      selectedContinents.clear();
      selectedImoMember = 'all';
      selectedMarpol = 'all';
      init().catch(error => {
        console.error(error);
        showError(error);
      });
    };
  }
}

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    render().catch(error => console.error(error));
  }, 200);
});

function start() {
  init().catch(error => {
    console.error(error);
    showError(error);
  });
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
