// Joins Register originators → development classification
// Uses two sources:
//   1. Direct match against countryList by country name
//   2. originator_country_map.json for all other cases (coalitions, NGOs, etc.)

let _mapCache = null;

async function loadOriginatorMap() {
  if (_mapCache) return _mapCache;
  const res = await fetch('data/originator_country_map.json');
  _mapCache = await res.json();
  return _mapCache;
}

// Build a fast lookup: ISO-3 → finalClassification from countryList
function buildCountryIndex(countryList) {
  const byIso = new Map(countryList.map(c => [c.iso3, c.finalClassification]));
  const byName = new Map(countryList.map(c => [c.country.toLowerCase(), c.finalClassification]));
  return { byIso, byName };
}

// Resolve a single originator name → { type, iso3, finalClassification }
function resolveOriginator(name, index, mapData) {
  const norm = name.trim().toLowerCase();

  // 1. Direct name match against country list
  if (index.byName.has(norm)) {
    return { type: 'Country', finalClassification: index.byName.get(norm) };
  }

  // 2. Lookup in curated map
  const entry = mapData[name] || mapData[norm];
  if (entry) {
    const fc = entry.finalClassification || entry.type;
    return { type: entry.type, iso3: entry.iso3, finalClassification: fc };
  }

  // 3. Heuristics for common patterns
  if (/secretariat/i.test(name)) return { type: 'IMO-Secretariat', finalClassification: 'IMO-Secretariat' };
  if (/\band\b|,/.test(name) && !name.includes('(')) return { type: 'Coalition', finalClassification: 'Coalition' };
  if (/INTERTANKO|BIMCO|ICS|IICL|WSC|INTERCARGO/i.test(name)) return { type: 'NGO-Industry', finalClassification: 'NGO-Industry' };
  if (/WWF|Pacific Environment|Transport & Environment|FOEI|CSC/i.test(name)) return { type: 'NGO-Environment', finalClassification: 'NGO-Environment' };
  if (/European Commission|EU\b|CARICOM|AOSIS|G77/i.test(name)) return { type: 'Intergovernmental', finalClassification: 'Intergovernmental' };

  return { type: 'Unknown', finalClassification: 'Unknown' };
}

// Enrich register rows with a devClassification field
export async function enrichRegister(register, countryList) {
  const mapData = await loadOriginatorMap();
  const index = buildCountryIndex(countryList);

  return register.map(row => ({
    ...row,
    devClassification: resolveOriginator(row.originator, index, mapData).finalClassification,
  }));
}

// Enrich crossAgenda rows with devClassification
export async function enrichCrossAgenda(crossAgenda, countryList) {
  const mapData = await loadOriginatorMap();
  const index = buildCountryIndex(countryList);

  return crossAgenda.map(row => ({
    ...row,
    devClassification: resolveOriginator(row.originator, index, mapData).finalClassification,
  }));
}
