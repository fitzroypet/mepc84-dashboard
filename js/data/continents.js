export const CONTINENT_ORDER = [
  'Africa',
  'Asia',
  'Europe',
  'North America',
  'Oceania',
  'South America',
];

export const IMO_MEMBER_FILTER_OPTIONS = [
  { value: 'all', label: 'All countries' },
  { value: 'Member', label: 'IMO member states' },
  { value: 'Non-member', label: 'Non-member states' },
];

export const MARPOL_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'Ratified', label: 'MARPOL ratified' },
  { value: 'Not ratified', label: 'MARPOL not ratified' },
];

const ISO3_CONTINENT_OVERRIDES = {
  ARM: 'Asia',
  AUS: 'Oceania',
  AZE: 'Asia',
  BLR: 'Europe',
  GEO: 'Asia',
  JPN: 'Asia',
  KAZ: 'Asia',
  KGZ: 'Asia',
  KOR: 'Asia',
  MDA: 'Europe',
  NZL: 'Oceania',
  RUS: 'Europe',
  SYC: 'Africa',
  TJK: 'Asia',
  TKM: 'Asia',
  UKR: 'Europe',
  UZB: 'Asia',
};

const REGION_TO_CONTINENT = {
  'AIMS (SIDS)': 'Africa',
  'Caribbean': 'North America',
  'Central Africa': 'Africa',
  'CIS and Georgia': 'Europe',
  'Developed Asia and the Pacific': 'Asia',
  'East Africa': 'Africa',
  'East Asia': 'Asia',
  'Europe (EU)': 'Europe',
  'Europe (micro-state)': 'Europe',
  'Mexico and Central America': 'North America',
  'North Africa': 'Africa',
  'Northern America': 'North America',
  'Other Europe': 'Europe',
  'Pacific (SIDS)': 'Oceania',
  'Pacific (SIDS, non-UN member)': 'Oceania',
  'South America': 'South America',
  'South Asia': 'Asia',
  'South-Eastern Europe': 'Europe',
  'Southern Africa': 'Africa',
  'West Africa': 'Africa',
  'Western Asia': 'Asia',
};

export function getCountryContinent(country) {
  return ISO3_CONTINENT_OVERRIDES[country?.iso3]
    || REGION_TO_CONTINENT[country?.region]
    || null;
}

export function addCountryContinents(countryList) {
  return countryList.map(country => ({
    ...country,
    continent: getCountryContinent(country),
  }));
}

export function enrichCountryList(countryList, imoMembers = []) {
  const imoByIso3 = new Map(imoMembers.map(country => [country.iso3, country]));

  return countryList.map(country => {
    const imoRecord = imoByIso3.get(country.iso3);

    return {
      ...country,
      continent: getCountryContinent(country),
      imoMember: imoRecord?.imoMember ?? null,
      imoMemberRaw: imoRecord?.imoMemberRaw || '',
      imoMemberGroup: imoRecord?.imoMemberGroup || null,
      marpolAnnexVI: imoRecord?.marpolAnnexVI || '',
      marpolGroup: imoRecord?.marpolGroup || null,
    };
  });
}

export function getAvailableContinents(countryList) {
  const continents = new Set(countryList.map(country => country.continent).filter(Boolean));
  return CONTINENT_ORDER.filter(continent => continents.has(continent));
}
