import { CONFIG, sheetCsvUrl } from '../config.js';
import { parseCountryList } from './parser.js';

const clean = value => (value == null ? '' : String(value).trim());

function parseImoMembersSheet(csv) {
  const allRows = d3.csvParseRows(csv);

  let headerIdx = allRows.findIndex(row => {
    const cells = row.map(clean);
    return cells.includes('Country') && cells.includes('ISO-3');
  });
  if (headerIdx < 0) headerIdx = 3;

  const headers = (allRows[headerIdx] || []).map(clean);

  return allRows
    .slice(headerIdx + 1)
    .filter(row => clean(row[0]))
    .map(row => {
      const record = {};
      headers.forEach((header, index) => {
        if (header) record[header] = clean(row[index]);
      });

      const imoMemberRaw = record['IMO Member'] || '';
      const marpolAnnexVI = record['MARPOL Annex VI'] || '';
      const imoMember = /^yes/i.test(imoMemberRaw);

      return {
        country: record['Country'] || '',
        iso3: record['ISO-3'] || '',
        region: record['Region'] || '',
        imoMember,
        imoMemberRaw,
        imoMemberGroup: imoMemberRaw ? (imoMember ? 'Member' : 'Non-member') : null,
        imoTier: record['IMO Tier (seat-allocation)'] || '',
        marpolAnnexVI,
        marpolGroup: marpolAnnexVI === 'Party'
          ? 'Ratified'
          : marpolAnnexVI === 'Not Party'
            ? 'Not ratified'
            : null,
      };
    })
    .filter(record => record.country);
}

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
  const imoMembersCsv = await fetchCsv(countries.id, countries.tabs.imoMembers.gid);
  return {
    countryList: parseCountryList(countryListCsv),
    imoMembers: parseImoMembersSheet(imoMembersCsv),
    _source: 'Google Sheets',
  };
}

function areCountrySheetsConfigured() {
  const countries = CONFIG.sheets.countries;
  return (
    countries.id !== 'YOUR_COUNTRIES_SHEET_ID' &&
    countries.tabs.countryList.gid !== 'YOUR_COUNTRY_LIST_GID' &&
    countries.tabs.imoMembers.gid !== 'YOUR_IMO_MEMBERS_GID'
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
  const imoMembersCsv = await readXlsxSheet(workbook, 'IMO Members');

  return {
    countryList: parseCountryList(countryListCsv),
    imoMembers: parseImoMembersSheet(imoMembersCsv),
    _source: 'Local Excel',
  };
}

export async function loadCountryClassificationData() {
  if (areCountrySheetsConfigured()) {
    try {
      return await loadFromSheets();
    } catch (error) {
      console.warn('Country classification sheet fetch failed, falling back to local Excel:', error);
    }
  }

  return loadFromXlsx();
}
