import { loadCountryClassificationData } from './data/loader.js';
import { renderWorldMap } from './charts/worldMap.js';

let data = null;

async function render() {
  if (!data) return;
  await renderWorldMap('chart-world-map', data.countryList);
}

async function init() {
  const loadingEl = document.getElementById('loading-screen');
  const errorEl = document.getElementById('error-screen');
  const appEl = document.getElementById('app');
  const errorMessageEl = document.getElementById('error-message');
  const retryBtn = document.getElementById('retry-btn');

  try {
    data = await loadCountryClassificationData();
    loadingEl.classList.add('hidden');
    errorEl.classList.add('hidden');
    appEl.classList.remove('hidden');
    await render();
  } catch (error) {
    console.error(error);
    loadingEl.classList.add('hidden');
    appEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
    errorMessageEl.textContent =
      error?.message || 'Failed to load country classification data.';
  }

  retryBtn?.addEventListener('click', () => {
    errorEl.classList.add('hidden');
    loadingEl.classList.remove('hidden');
    init();
  }, { once: true });
}

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    render().catch(error => console.error(error));
  }, 200);
});

init().catch(error => console.error(error));
