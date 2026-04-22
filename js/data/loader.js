import { CONFIG, sheetCsvUrl } from '../config.js';
import { parseCountryList } from './parser.js';

let XLSX = null;

async function ensureXlsx() {
  if (XLSX) return XLSX;

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  XLSX = window.XLSX;
  return XLSX;
}

async function fetchCsv(sheetId, gid) {
  const res = await fetch(sheetCsvUrl(sheetId, gid));
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching country classification data`);
  return res.text();
}

async function loadFromSheets() {
  const { countries } = CONFIG.sheets;
  const countryListCsv = await fetchCsv(countries.id, countries.tabs.countryList.gid);
  return {
    countryList: parseCountryList(countryListCsv),
    _source: 'Google Sheets',
  };
}

function isCountrySheetConfigured() {
  const countries = CONFIG.sheets.countries;
  return (
    countries.id !== 'YOUR_COUNTRIES_SHEET_ID' &&
    countries.tabs.countryList.gid !== 'YOUR_COUNTRY_LIST_GID'
  );
}

async function readXlsxSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);
  return window.XLSX.utils.sheet_to_csv(sheet);
}

async function loadFromXlsx() {
  const xlsx = await ensureXlsx();
  const res = await fetch('data/UN_IMO_Country_Development_Classification.xlsx');
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching local country classification workbook`);
  }
  const buffer = await res.arrayBuffer();

  const workbook = xlsx.read(buffer, { type: 'array' });
  const countryListCsv = await readXlsxSheet(workbook, 'Country List');

  return {
    countryList: parseCountryList(countryListCsv),
    _source: 'Local Excel',
  };
}

export async function loadCountryClassificationData() {
  if (isCountrySheetConfigured()) {
    try {
      return await loadFromSheets();
    } catch (error) {
      console.warn('Country classification sheet fetch failed, falling back to local Excel:', error);
    }
  }

  return loadFromXlsx();
}
