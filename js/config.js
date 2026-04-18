// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Paste your Google Sheet IDs here after uploading to Google Drive.
//
// How to find the Sheet ID:
//   Open the spreadsheet → look at the URL:
//   https://docs.google.com/spreadsheets/d/ [SHEET_ID] /edit#gid=[TAB_GID]
//
// How to find each Tab's GID:
//   Click the tab at the bottom → the URL changes to show #gid=XXXXXXX
//
// Make both sheets "Anyone with the link can view" before saving here.
// ─────────────────────────────────────────────────────────────────────────────

export const CONFIG = {
  sheets: {
    mepc84: {
      id: 'YOUR_MEPC84_SHEET_ID',        // ← paste MEPC84 sheet ID here
      tabs: {
        register:    { gid: 'YOUR_REGISTER_GID' },       // "Register (enriched)" tab
        crossAgenda: { gid: 'YOUR_CROSS_AGENDA_GID' },   // "Cross-Agenda Profile" tab
        landscape:   { gid: 'YOUR_LANDSCAPE_GID' },      // "Originator Landscape" tab
      },
    },
    countries: {
      id: 'YOUR_COUNTRIES_SHEET_ID',     // ← paste Country Classification sheet ID here
      tabs: {
        countryList: { gid: 'YOUR_COUNTRY_LIST_GID' },   // "Country List" tab
        imoMembers:  { gid: 'YOUR_IMO_MEMBERS_GID' },    // "IMO Members" tab
      },
    },
  },

  // ── Colour palette ──────────────────────────────────────────────────────
  colors: {
    devStatus: {
      'Developed':               '#3b82f6',
      'Developing (Other)':      '#22c55e',
      'LDC only':                '#ef4444',
      'SIDS only':               '#f97316',
      'SIDS + LDC (Dual Status)':'#a855f7',
      'Economy in Transition':   '#eab308',
      'NGO-Industry':            '#94a3b8',
      'NGO-Environment':         '#34d399',
      'Coalition':               '#fb923c',
      'Intergovernmental':       '#c084fc',
      'IMO-Secretariat':         '#60a5fa',
      'Unknown':                 '#4b5563',
    },
    sentiment: {
      'Favourable': '#22c55e',
      'Neutral':    '#6b7280',
      'Problematic':'#ef4444',
    },
    stanceMacro: {
      'Strengthen': '#14b8a6',
      'Weaken':     '#f43f5e',
      'Technical':  '#6366f1',
      'Admin':      '#94a3b8',
      'Adopt':      '#22d3ee',
      'Amend':      '#f59e0b',
      'Replace':    '#ef4444',
      'Review':     '#a78bfa',
      'Other':      '#64748b',
    },
  },

  // ── Stance macro-grouping ────────────────────────────────────────────────
  // Maps raw stance camp strings (lowercased, partial match) → macro category
  stanceMacroGroups: [
    { macro: 'Strengthen', patterns: ['strengthen'] },
    { macro: 'Weaken',     patterns: ['weaken', 'oppose', 'against'] },
    { macro: 'Technical',  patterns: ['technical', 'lca', 'fuel factor', 'cii', 'eexi', 'eedi', 'methane', 'ammonia', 'hydrogen'] },
    { macro: 'Admin',      patterns: ['admin', 'procedur', 'info', 'status', 'legal', 'regulatory', 'report'] },
    { macro: 'Adopt',      patterns: ['adopt', 'advance', 'approve'] },
    { macro: 'Amend',      patterns: ['amend', 'modify', 'revise', 'revision'] },
    { macro: 'Replace',    patterns: ['replace', 'new instrument', 'new output'] },
    { macro: 'Review',     patterns: ['review', 'queue'] },
    { macro: 'Other',      patterns: [] },  // catch-all
  ],

  // ── Agenda item labels ───────────────────────────────────────────────────
  agendaLabels: {
    '1':  'Opening',
    '2':  'Adoption of Agenda',
    '3':  'Decisions of Other Bodies',
    '4':  'Harmful Aquatic Organisms',
    '5':  'Air Pollution & Energy Eff.',
    '6':  'Ship Recycling',
    '7':  'GHG Emissions',
    '8':  'Pollution Prevention',
    '9':  'Harmful Anti-fouling',
    '10': 'Ballast Water',
    '11': 'Incidents & Investigations',
    '12': 'Facilitating',
    '13': 'Technical Cooperation',
    '14': 'Legal Matters',
    '15': 'Any Other Business',
  },
};

// Detect whether Sheet IDs have been filled in
export function isConfigured() {
  const c = CONFIG.sheets;
  return (
    c.mepc84.id !== 'YOUR_MEPC84_SHEET_ID' &&
    c.countries.id !== 'YOUR_COUNTRIES_SHEET_ID'
  );
}

// Build Google Sheets CSV export URL
export function sheetCsvUrl(sheetId, gid) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}
