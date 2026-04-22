import { CONFIG } from '../config.js';
import { WORLD_MAP_MARKERS } from '../data/worldMapMarkers.js';
import { showTooltip, hideTooltip, positionTooltip } from './tooltip.js';

const NUM_TO_ISO3 = {"4":"AFG","8":"ALB","12":"DZA","20":"AND","24":"AGO","28":"ATG","32":"ARG","36":"AUS","40":"AUT","44":"BHS","48":"BHR","50":"BGD","52":"BRB","56":"BEL","60":"BMU","64":"BTN","68":"BOL","70":"BIH","72":"BWA","76":"BRA","84":"BLZ","90":"SLB","96":"BRN","100":"BGR","104":"MMR","108":"BDI","116":"KHM","120":"CMR","124":"CAN","132":"CPV","136":"CYM","140":"CAF","144":"LKA","148":"TCD","152":"CHL","156":"CHN","170":"COL","174":"COM","178":"COG","180":"COD","188":"CRI","191":"HRV","192":"CUB","196":"CYP","203":"CZE","208":"DNK","262":"DJI","212":"DMA","214":"DOM","218":"ECU","818":"EGY","222":"SLV","226":"GNQ","232":"ERI","233":"EST","231":"ETH","238":"FLK","242":"FJI","246":"FIN","250":"FRA","266":"GAB","270":"GMB","268":"GEO","276":"DEU","288":"GHA","300":"GRC","308":"GRD","320":"GTM","324":"GIN","624":"GNB","328":"GUY","332":"HTI","340":"HND","348":"HUN","352":"ISL","356":"IND","360":"IDN","364":"IRN","368":"IRQ","372":"IRL","376":"ISR","380":"ITA","388":"JAM","392":"JPN","400":"JOR","398":"KAZ","404":"KEN","296":"KIR","408":"PRK","410":"KOR","414":"KWT","417":"KGZ","418":"LAO","422":"LBN","426":"LSO","428":"LVA","430":"LBR","434":"LBY","440":"LTU","442":"LUX","450":"MDG","454":"MWI","458":"MYS","462":"MDV","466":"MLI","470":"MLT","478":"MRT","480":"MUS","484":"MEX","496":"MNG","504":"MAR","508":"MOZ","516":"NAM","520":"NRU","524":"NPL","528":"NLD","540":"NCL","554":"NZL","558":"NIC","562":"NER","566":"NGA","578":"NOR","512":"OMN","586":"PAK","585":"PLW","591":"PAN","598":"PNG","600":"PRY","604":"PER","608":"PHL","616":"POL","620":"PRT","630":"PRI","634":"QAT","642":"ROU","643":"RUS","646":"RWA","659":"KNA","662":"LCA","670":"VCT","882":"WSM","674":"SMR","678":"STP","682":"SAU","686":"SEN","694":"SLE","703":"SVK","705":"SVN","706":"SOM","710":"ZAF","724":"ESP","729":"SDN","740":"SUR","748":"SWZ","752":"SWE","756":"CHE","760":"SYR","762":"TJK","764":"THA","626":"TLS","768":"TGO","776":"TON","780":"TTO","788":"TUN","792":"TUR","795":"TKM","798":"TUV","800":"UGA","804":"UKR","784":"ARE","826":"GBR","834":"TZA","840":"USA","858":"URY","860":"UZB","548":"VUT","862":"VEN","704":"VNM","887":"YEM","894":"ZMB","716":"ZWE","807":"MKD","499":"MNE","688":"SRB"};

const CLASSIFICATION_ORDER = [
  'Developed',
  'Developing (Other)',
  'LDC only',
  'SIDS only',
  'SIDS + LDC (Dual Status)',
  'Economy in Transition',
];

const NO_DATA_FILL = '#45505d';
const NUM_TO_ISO3_OVERRIDES = {
  "31": "AZE",
  "51": "ARM",
  "112": "BLR",
  "158": "TWN",
  "204": "BEN",
  "275": "PSE",
  "384": "CIV",
  "498": "MDA",
  "728": "SSD",
  "854": "BFA"
};
const ISO3_BY_NUMERIC_ID = { ...NUM_TO_ISO3, ...NUM_TO_ISO3_OVERRIDES };

let worldGeometryPromise = null;

function getClassificationColor(classification) {
  return CONFIG.colors.devStatus[classification] || NO_DATA_FILL;
}

async function loadWorldGeometry() {
  if (!worldGeometryPromise) {
    worldGeometryPromise = d3.json('data/countries-110m.json').catch(error => {
      worldGeometryPromise = null;
      throw error;
    });
  }

  return worldGeometryPromise;
}

function normalizeFeatureId(id) {
  return String(id ?? '').replace(/^0+/, '') || '0';
}

function getIso3ForFeature(feature) {
  return ISO3_BY_NUMERIC_ID[normalizeFeatureId(feature?.id)] || null;
}

function getTooltipHtml(countryName, classification) {
  return `<strong>${countryName}</strong>
    <span class="t-row"><span>Classification</span><span class="t-val">${classification}</span></span>`;
}

function showCountryTooltip(event, country, fallbackName) {
  const countryName = country?.country || fallbackName || 'Unknown country';
  const classification = country?.finalClassification || 'No classification data';
  showTooltip(event, getTooltipHtml(countryName, classification));
}

function buildLegend(container, countryList, markerCount) {
  const counts = d3.rollup(countryList, values => values.length, d => d.finalClassification);

  const legend = d3.select(container)
    .append('div')
    .attr('class', 'legend map-legend');

  CLASSIFICATION_ORDER.forEach(classification => {
    const item = legend.append('div').attr('class', 'legend-item');
    item.append('div')
      .attr('class', 'legend-swatch')
      .style('background', getClassificationColor(classification));
    item.append('span').text(`${classification} (${counts.get(classification) || 0})`);
  });

  d3.select(container)
    .append('p')
    .attr('class', 'map-note')
    .text(
      `Gray land areas do not have a matching workbook classification. `
      + `${markerCount} classified entries are shown as colored dots because polygon geometry is unavailable in this basemap.`
    );
}

function buildMarkerCountries(countryList, polygonIso3Set, projection, width) {
  const offsetScale = Math.max(0.75, Math.min(width / 960, 1.35));
  const missingMarkers = [];

  const markerCountries = countryList
    .filter(country => !polygonIso3Set.has(country.iso3))
    .map(country => {
      const marker = WORLD_MAP_MARKERS[country.iso3];
      if (!marker) {
        missingMarkers.push(country.iso3);
        return null;
      }

      const point = projection([marker.lon, marker.lat]);
      if (!point) {
        missingMarkers.push(country.iso3);
        return null;
      }

      return {
        ...country,
        x: point[0] + ((marker.dx || 0) * offsetScale),
        y: point[1] + ((marker.dy || 0) * offsetScale),
      };
    })
    .filter(Boolean);

  if (missingMarkers.length) {
    console.warn('World map markers missing for ISO-3 codes:', missingMarkers.join(', '));
  }

  return markerCountries;
}

export async function renderWorldMap(container, countryList) {
  const el = document.getElementById(container);
  if (!el) return;

  el.innerHTML = '';

  const width = Math.max(el.clientWidth || 960, 320);
  const height = Math.max(Math.round(width * 0.56), 360);
  const countryByIso3 = new Map(countryList.map(country => [country.iso3, country]));

  let world;
  try {
    world = await loadWorldGeometry();
  } catch {
    el.innerHTML = '<p class="map-empty">World map data is missing. Add <code>data/countries-110m.json</code> to render the map.</p>';
    return;
  }

  const countries = topojson.feature(world, world.objects.countries);
  const projection = d3.geoNaturalEarth1()
    .fitExtent([[16, 16], [width - 16, height - 16]], { type: 'Sphere' });
  const path = d3.geoPath().projection(projection);
  const polygonFeatures = countries.features.map(feature => {
    const iso3 = getIso3ForFeature(feature);
    return {
      feature,
      iso3,
      country: iso3 ? countryByIso3.get(iso3) : null,
    };
  });
  const polygonIso3Set = new Set(
    polygonFeatures
      .filter(item => item.country)
      .map(item => item.country.iso3)
  );
  const markerCountries = buildMarkerCountries(countryList, polygonIso3Set, projection, width);
  const markerRadius = Math.max(4.5, Math.min(width / 190, 7));

  const svg = d3.select(el)
    .append('svg')
    .attr('class', 'map-svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  svg.append('path')
    .datum({ type: 'Sphere' })
    .attr('d', path)
    .attr('fill', '#0f1b2b');

  svg.append('path')
    .datum(d3.geoGraticule10())
    .attr('d', path)
    .attr('fill', 'none')
    .attr('stroke', 'rgba(210, 222, 240, 0.18)')
    .attr('stroke-width', 0.5);

  svg.append('g')
    .selectAll('path')
    .data(polygonFeatures)
    .join('path')
    .attr('class', 'country-path')
    .attr('d', d => path(d.feature))
    .attr('fill', d => {
      return d.country ? getClassificationColor(d.country.finalClassification) : NO_DATA_FILL;
    })
    .attr('stroke', '#09111b')
    .attr('stroke-width', 0.75)
    .on('mouseover', (event, d) => {
      d3.select(event.currentTarget)
        .attr('stroke', '#f8fafc')
        .attr('stroke-width', 1.3);

      showCountryTooltip(event, d.country, d.feature.properties?.name || d.iso3);
    })
    .on('mousemove', event => positionTooltip(event))
    .on('mouseout', event => {
      d3.select(event.currentTarget)
        .attr('stroke', '#09111b')
        .attr('stroke-width', 0.75);
      hideTooltip();
    });

  const markerLayer = svg.append('g')
    .attr('class', 'marker-layer')
    .selectAll('g')
    .data(markerCountries)
    .join('g')
    .attr('class', 'country-marker')
    .attr('transform', d => `translate(${d.x}, ${d.y})`)
    .on('mouseover', function(event, d) {
      const marker = d3.select(this);
      marker.select('.marker-halo').attr('r', markerRadius + 3);
      marker.select('.marker-dot')
        .attr('r', markerRadius + 1.2)
        .attr('stroke', '#f8fafc');
      showCountryTooltip(event, d, d.country);
    })
    .on('mousemove', event => positionTooltip(event))
    .on('mouseout', function() {
      const marker = d3.select(this);
      marker.select('.marker-halo').attr('r', markerRadius + 1.9);
      marker.select('.marker-dot')
        .attr('r', markerRadius)
        .attr('stroke', 'rgba(248, 250, 252, 0.72)');
      hideTooltip();
    });

  markerLayer.append('circle')
    .attr('class', 'marker-hit')
    .attr('r', markerRadius + 7);

  markerLayer.append('circle')
    .attr('class', 'marker-halo')
    .attr('r', markerRadius + 1.9);

  markerLayer.append('circle')
    .attr('class', 'marker-dot')
    .attr('r', markerRadius)
    .attr('fill', d => getClassificationColor(d.finalClassification));

  buildLegend(el, countryList, markerCountries.length);
}
