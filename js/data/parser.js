import { CONFIG } from '../config.js';

// d3 is loaded globally via CDN
const { csvParseRows, csvParse, timeParse } = d3;

const clean = v => (v == null ? '' : String(v).trim());
const num   = v => { const n = parseFloat(clean(v)); return isNaN(n) ? 0 : n; };
const bool  = v => { const s = clean(v).toLowerCase(); return s === 'yes' || s === 'true' || s === '1'; };

// ── Stance macro resolution ──────────────────────────────────────────────────
function stanceMacro(rawCamp) {
  const lc = clean(rawCamp).toLowerCase();
  for (const { macro, patterns } of CONFIG.stanceMacroGroups) {
    if (patterns.some(p => lc.includes(p))) return macro;
  }
  return 'Other';
}

// ── Register (enriched) ──────────────────────────────────────────────────────
// Expected columns (0-indexed after header row):
// No. | Date | Document Symbol | Originator | Agenda Item | Title/Subtitle |
// Overall Sentiment | Priority | Stance Camp | Stance Detail | Confidence |
// Classification Basis | Core Issue / Comment | Drive Link
export function parseRegister(csv) {
  const rows = csvParse(csv, d => ({
    no:                   num(d['No.']),
    date:                 clean(d['Date']),
    docSymbol:            clean(d['Document Symbol']),
    originator:           clean(d['Originator']),
    agendaItem:           clean(d['Agenda Item']),
    title:                clean(d['Title / Subtitle']),
    sentiment:            clean(d['Overall Sentiment']),
    priority:             clean(d['Priority']),
    stanceCamp:           clean(d['Stance Camp']),
    stanceMacro:          stanceMacro(d['Stance Camp']),
    stanceDetail:         clean(d['Stance Detail']),
    confidence:           clean(d['Confidence']),
    classificationBasis:  clean(d['Classification Basis']),
    coreIssue:            clean(d['Core Issue / Comment']),
    driveLink:            clean(d['Drive Link']),
  }));
  // Drop empty/header repeat rows
  return rows.filter(r => r.originator && r.agendaItem);
}

// ── Cross-Agenda Profile ─────────────────────────────────────────────────────
// Header is on row index 1 (0-based), row 0 is often a title row.
// Columns: Originator | A1 | A2 … A15 | Total
export function parseCrossAgenda(csv) {
  const allRows = csvParseRows(csv);

  // Find the header row: it contains "Originator" in the first cell
  let headerIdx = allRows.findIndex(r => clean(r[0]).toLowerCase() === 'originator');
  if (headerIdx < 0) headerIdx = 0;
  const headers = allRows[headerIdx].map(clean);

  return allRows
    .slice(headerIdx + 1)
    .filter(r => clean(r[0]))
    .map(r => {
      const obj = { originator: clean(r[0]), total: 0 };
      headers.slice(1).forEach((h, i) => {
        const v = num(r[i + 1]);
        obj[h] = v;
        if (h.toLowerCase() !== 'total') obj.total += v;
      });
      return obj;
    })
    .filter(r => r.originator);
}

// ── Originator Landscape ─────────────────────────────────────────────────────
// Multi-section CSV: each section starts with a single-cell row naming the agenda item.
// Next row is the column header for that section.
// Data rows follow until the next section header or end of file.
export function parseLandscape(csv) {
  const allRows = csvParseRows(csv);
  const sections = [];
  let current = null;
  let headers = [];

  for (const row of allRows) {
    const cells = row.map(clean);
    const nonEmpty = cells.filter(c => c);

    // Section header: single non-empty cell, no digits that look like data
    if (nonEmpty.length === 1 && !cells[1]) {
      current = { agendaItem: nonEmpty[0], originators: [] };
      sections.push(current);
      headers = [];
      continue;
    }

    if (!current) continue;

    // After section header, first multi-cell row is the column header
    if (headers.length === 0 && nonEmpty.length > 1) {
      headers = cells;
      continue;
    }

    // Data row
    if (headers.length > 0 && cells[0]) {
      const camps = {};
      headers.slice(1).forEach((h, i) => {
        if (h) camps[h] = num(cells[i + 1]);
      });
      current.originators.push({ originator: cells[0], camps });
    }
  }

  return sections;
}

// ── Country List ─────────────────────────────────────────────────────────────
// Headers: Country | ISO-3 | Region (WESP 2026) | Primary Status | LDC | SIDS |
//          Dual Status | Final Classification | Source Table(s) | ...
export function parseCountryList(csv) {
  return csvParse(csv, d => {
    const fc = clean(d['Final Classification']);
    if (!fc || !clean(d['Country'])) return null;
    return {
      country:             clean(d['Country']),
      iso3:                clean(d['ISO-3']),
      region:              clean(d['Region (WESP 2026)']),
      primaryStatus:       clean(d['Primary Status']),
      isLdc:               bool(d['LDC']),
      isSids:              bool(d['SIDS']),
      isDual:              bool(d['Dual Status']),
      finalClassification: fc,
      sourceTables:        clean(d['Source Table(s)']),
    };
  }).filter(Boolean);
}

// ── IMO Members ──────────────────────────────────────────────────────────────
// Header is at row index 3 (0-based). Rows 0-2 are title/description rows.
export function parseImoMembers(csv) {
  const allRows = csvParseRows(csv);

  // Find header row: contains "Country" and "ISO-3"
  let headerIdx = allRows.findIndex(r => {
    const cells = r.map(clean);
    return cells.includes('Country') && cells.includes('ISO-3');
  });
  if (headerIdx < 0) headerIdx = 3;
  const headers = allRows[headerIdx].map(clean);

  return allRows
    .slice(headerIdx + 1)
    .filter(r => clean(r[0]))
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h] = clean(r[i]); });
      return {
        country:             obj['Country'] || '',
        iso3:                obj['ISO-3'] || '',
        region:              obj['Region'] || '',
        imoMember:           bool(obj['IMO Member']),
        imoTier:             obj['IMO Tier (seat-allocation)'] || '',
        marpolAnnexVI:       obj['MARPOL Annex VI'] || '',
        hydrocarbonDependent:bool(obj['Hydrocarbon-dependent']),
        rePotential:         obj['Renewable Energy Potential'] || '',
        landlocked:          bool(obj['Landlocked']),
        francophone:         bool(obj['Francophone (OIF)']),
      };
    })
    .filter(r => r.country);
}

// ── Master parse entry point ─────────────────────────────────────────────────
export function parseAll({ registerCsv, crossAgendaCsv, landscapeCsv, countryListCsv, imoMembersCsv }) {
  return {
    register:    parseRegister(registerCsv),
    crossAgenda: parseCrossAgenda(crossAgendaCsv),
    landscape:   parseLandscape(landscapeCsv),
    countryList: parseCountryList(countryListCsv),
    imoMembers:  parseImoMembers(imoMembersCsv),
  };
}
