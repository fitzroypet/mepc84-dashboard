import { CONFIG, isConfigured, sheetCsvUrl } from '../config.js';
import { parseAll } from './parser.js';

// Dynamically load SheetJS only when needed (fallback path)
let XLSX = null;
async function ensureXlsx() {
  if (XLSX) return XLSX;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  XLSX = window.XLSX;
  return XLSX;
}

// ── Google Sheets path ───────────────────────────────────────────────────────
async function fetchCsv(sheetId, gid) {
  const url = sheetCsvUrl(sheetId, gid);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching gid=${gid}`);
  return res.text();
}

async function loadFromSheets() {
  const { mepc84, countries } = CONFIG.sheets;
  const [registerCsv, crossAgendaCsv, landscapeCsv, countryListCsv, imoMembersCsv] =
    await Promise.all([
      fetchCsv(mepc84.id,    mepc84.tabs.register.gid),
      fetchCsv(mepc84.id,    mepc84.tabs.crossAgenda.gid),
      fetchCsv(mepc84.id,    mepc84.tabs.landscape.gid),
      fetchCsv(countries.id, countries.tabs.countryList.gid),
      fetchCsv(countries.id, countries.tabs.imoMembers.gid),
    ]);
  return parseAll({ registerCsv, crossAgendaCsv, landscapeCsv, countryListCsv, imoMembersCsv });
}

// ── xlsx fallback path ───────────────────────────────────────────────────────
async function readXlsxSheet(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet "${sheetName}" not found`);
  // Convert to array of arrays (raw=true keeps cell values unformatted)
  return window.XLSX.utils.sheet_to_csv(ws);
}

async function loadFromXlsx() {
  const xl = await ensureXlsx();

  const [buf1, buf2] = await Promise.all([
    fetch('data/MEPC84_Stance_Analysis_v2.xlsx').then(r => r.arrayBuffer()),
    fetch('data/UN_IMO_Country_Development_Classification.xlsx').then(r => r.arrayBuffer()),
  ]);

  const wb1 = xl.read(buf1, { type: 'array' });
  const wb2 = xl.read(buf2, { type: 'array' });

  const [registerCsv, crossAgendaCsv, landscapeCsv, countryListCsv, imoMembersCsv] =
    await Promise.all([
      readXlsxSheet(wb1, 'Register (enriched)'),
      readXlsxSheet(wb1, 'Cross-Agenda Profile'),
      readXlsxSheet(wb1, 'Originator Landscape'),
      readXlsxSheet(wb2, 'Country List'),
      readXlsxSheet(wb2, 'IMO Members'),
    ]);

  return parseAll({ registerCsv, crossAgendaCsv, landscapeCsv, countryListCsv, imoMembersCsv });
}

// ── Public entry point ───────────────────────────────────────────────────────
export async function loadAllData() {
  if (isConfigured()) {
    try {
      const data = await loadFromSheets();
      data._source = 'Google Sheets';
      return data;
    } catch (e) {
      console.warn('Google Sheets fetch failed, falling back to Excel:', e);
    }
  }

  const data = await loadFromXlsx();
  data._source = 'Local Excel';
  return data;
}
