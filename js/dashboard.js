import { loadCountryClassificationData } from './data/loader.js';
import { renderWorldMap } from './charts/worldMap.js';

let data = null;

function getUi() {
  return {
    loadingEl: document.getElementById('loading-screen'),
    errorEl: document.getElementById('error-screen'),
    appEl: document.getElementById('app'),
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
  await renderWorldMap('chart-world-map', data.countryList);
}

async function init() {
  const { loadingEl, errorEl, appEl, retryBtn } = getUi();

  if (!loadingEl || !errorEl || !appEl) {
    console.error('Dashboard bootstrap aborted: required UI elements are missing.');
    return;
  }

  try {
    data = await loadCountryClassificationData();
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
