import { CONFIG } from '../config.js';
import { showTooltip, hideTooltip } from './tooltip.js';

const colors = CONFIG.colors.devStatus;

// ISO numeric → ISO-3 lookup (subset covering IMO members)
// Full table vendored here to avoid a runtime fetch
const NUM_TO_ISO3 = {"4":"AFG","8":"ALB","12":"DZA","20":"AND","24":"AGO","28":"ATG","32":"ARG","36":"AUS","40":"AUT","44":"BHS","48":"BHR","50":"BGD","52":"BRB","56":"BEL","60":"BMU","64":"BTN","68":"BOL","70":"BIH","72":"BWA","76":"BRA","84":"BLZ","90":"SLB","96":"BRN","100":"BGR","104":"MMR","108":"BDI","116":"KHM","120":"CMR","124":"CAN","132":"CPV","136":"CYM","140":"CAF","144":"LKA","148":"TCD","152":"CHL","156":"CHN","170":"COL","174":"COM","178":"COG","180":"COD","188":"CRI","191":"HRV","192":"CUB","196":"CYP","203":"CZE","208":"DNK","262":"DJI","212":"DMA","214":"DOM","218":"ECU","818":"EGY","222":"SLV","226":"GNQ","232":"ERI","233":"EST","231":"ETH","238":"FLK","242":"FJI","246":"FIN","250":"FRA","266":"GAB","270":"GMB","268":"GEO","276":"DEU","288":"GHA","300":"GRC","308":"GRD","320":"GTM","324":"GIN","624":"GNB","328":"GUY","332":"HTI","340":"HND","348":"HUN","352":"ISL","356":"IND","360":"IDN","364":"IRN","368":"IRQ","372":"IRL","376":"ISR","380":"ITA","388":"JAM","392":"JPN","400":"JOR","398":"KAZ","404":"KEN","296":"KIR","408":"PRK","410":"KOR","414":"KWT","417":"KGZ","418":"LAO","422":"LBN","426":"LSO","428":"LVA","430":"LBR","434":"LBY","440":"LTU","442":"LUX","450":"MDG","454":"MWI","458":"MYS","462":"MDV","466":"MLI","470":"MLT","478":"MRT","480":"MUS","484":"MEX","496":"MNG","504":"MAR","508":"MOZ","516":"NAM","520":"NRU","524":"NPL","528":"NLD","540":"NCL","554":"NZL","558":"NIC","562":"NER","566":"NGA","578":"NOR","512":"OMN","586":"PAK","585":"PLW","591":"PAN","598":"PNG","600":"PRY","604":"PER","608":"PHL","616":"POL","620":"PRT","630":"PRI","634":"QAT","642":"ROU","643":"RUS","646":"RWA","659":"KNA","662":"LCA","670":"VCT","882":"WSM","674":"SMR","678":"STP","682":"SAU","686":"SEN","694":"SLE","703":"SVK","705":"SVN","706":"SOM","710":"ZAF","724":"ESP","144":"LKA","729":"SDN","740":"SUR","748":"SWZ","752":"SWE","756":"CHE","760":"SYR","762":"TJK","764":"THA","626":"TLS","768":"TGO","776":"TON","780":"TTO","788":"TUN","792":"TUR","795":"TKM","798":"TUV","800":"UGA","804":"UKR","784":"ARE","826":"GBR","834":"TZA","840":"USA","858":"URY","860":"UZB","548":"VUT","862":"VEN","704":"VNM","887":"YEM","894":"ZMB","716":"ZWE","191":"HRV","807":"MKD","499":"MNE","688":"SRB","100":"BGR"};

export async function renderWorldMap(container, countryList, imoMembers, state, onFilter) {
  const el = document.getElementById(container);
  if (!el) return;
  el.innerHTML = '';

  const W = el.clientWidth || 800, H = Math.round(W * 0.5);

  // Build ISO-3 → classification lookup
  const classMap = new Map(countryList.map(c => [c.iso3, c.finalClassification]));
  // Build ISO-3 → IMO member details
  const imoMap = new Map(imoMembers.map(c => [c.iso3, c]));
  // Build ISO-3 → country full record
  const countryRec = new Map(countryList.map(c => [c.iso3, c]));

  // Load TopoJSON
  let world;
  try {
    world = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
  } catch (e) {
    el.innerHTML = '<p style="color:#8b949e;padding:16px;text-align:center">World map unavailable (requires internet connection)</p>';
    return;
  }

  const projection = d3.geoNaturalEarth1()
    .scale(W / 6.28)
    .translate([W / 2, H / 2]);
  const path = d3.geoPath().projection(projection);
  const countries = topojson.feature(world, world.objects.countries);

  const svg = d3.select(el).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  // Zoom behaviour
  const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on('zoom', (event) => { mapG.attr('transform', event.transform); });
  svg.call(zoom);

  const mapG = svg.append('g');

  // Sphere (ocean)
  mapG.append('path')
    .datum({ type: 'Sphere' })
    .attr('d', path)
    .attr('fill', '#1a2332')
    .attr('stroke', 'none');

  // Country paths
  mapG.selectAll('.country-path')
    .data(countries.features)
    .join('path')
    .attr('class', 'country-path')
    .attr('d', path)
    .attr('fill', d => {
      const iso3 = NUM_TO_ISO3[String(d.id)];
      const cls = iso3 ? classMap.get(iso3) : null;
      if (!cls) return '#2d3748';
      return colors[cls] || '#4b5563';
    })
    .attr('stroke', '#0d1117')
    .attr('stroke-width', 0.3)
    .attr('opacity', d => {
      if (!state.devGroup) return 0.9;
      const iso3 = NUM_TO_ISO3[String(d.id)];
      const cls = iso3 ? classMap.get(iso3) : null;
      return state.devGroup === cls ? 1 : 0.2;
    })
    .on('mouseover', (event, d) => {
      d3.select(event.currentTarget).attr('opacity', 1).attr('stroke-width', 1);
      const iso3 = NUM_TO_ISO3[String(d.id)];
      const rec = iso3 ? countryRec.get(iso3) : null;
      const imo = iso3 ? imoMap.get(iso3) : null;
      if (!rec) return showTooltip(event, '<strong>No data</strong>');
      showTooltip(event, `<strong>${rec.country}</strong>
        <span class="t-row"><span>Status</span><span class="t-val">${rec.finalClassification}</span></span>
        <span class="t-row"><span>Region</span><span class="t-val">${rec.region || '—'}</span></span>
        <span class="t-row"><span>LDC</span><span class="t-val">${rec.isLdc ? 'Yes' : 'No'}</span></span>
        <span class="t-row"><span>SIDS</span><span class="t-val">${rec.isSids ? 'Yes' : 'No'}</span></span>
        ${imo ? `<span class="t-row"><span>MARPOL VI</span><span class="t-val">${imo.marpolAnnexVI}</span></span>` : ''}`);
    })
    .on('mousemove', showTooltip)
    .on('mouseout', (event, d) => {
      const iso3 = NUM_TO_ISO3[String(d.id)];
      const cls = iso3 ? classMap.get(iso3) : null;
      d3.select(event.currentTarget)
        .attr('stroke-width', 0.3)
        .attr('opacity', () => {
          if (!state.devGroup) return 0.9;
          return state.devGroup === cls ? 1 : 0.2;
        });
      hideTooltip();
    })
    .on('click', (_, d) => {
      const iso3 = NUM_TO_ISO3[String(d.id)];
      const cls = iso3 ? classMap.get(iso3) : null;
      if (cls) onFilter('devGroup', cls);
    });

  // Graticule
  mapG.append('path')
    .datum(d3.geoGraticule()())
    .attr('d', path)
    .attr('fill', 'none')
    .attr('stroke', '#1e293b')
    .attr('stroke-width', 0.3);

  // Zoom controls
  const controls = d3.select(el).append('div')
    .style('position', 'absolute')
    .style('bottom', '8px')
    .style('right', '8px')
    .style('display', 'flex')
    .style('gap', '4px');
  controls.append('button')
    .text('+')
    .style('background', '#161b22')
    .style('border', '1px solid #30363d')
    .style('color', '#e6edf3')
    .style('border-radius', '4px')
    .style('cursor', 'pointer')
    .style('padding', '2px 8px')
    .on('click', () => svg.transition().call(zoom.scaleBy, 1.5));
  controls.append('button')
    .text('−')
    .style('background', '#161b22')
    .style('border', '1px solid #30363d')
    .style('color', '#e6edf3')
    .style('border-radius', '4px')
    .style('cursor', 'pointer')
    .style('padding', '2px 8px')
    .on('click', () => svg.transition().call(zoom.scaleBy, 0.67));

  el.style.position = 'relative';

  // Legend
  const legend = d3.select(el).append('div').attr('class', 'legend').style('margin-top', '8px');
  const categories = [...new Set(countryList.map(c => c.finalClassification))];
  categories.forEach(cat => {
    const item = legend.append('div')
      .attr('class', 'legend-item')
      .classed('dimmed', state.devGroup && state.devGroup !== cat)
      .on('click', () => onFilter('devGroup', cat));
    item.append('div').attr('class', 'legend-swatch').style('background', colors[cat] || '#4b5563');
    item.append('span').text(cat);
  });
}
