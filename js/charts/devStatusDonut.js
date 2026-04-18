import { CONFIG } from '../config.js';
import { showTooltip, hideTooltip } from './tooltip.js';

const colors = CONFIG.colors.devStatus;

export function renderDevStatusDonut(container, countryList, state, onFilter) {
  const el = document.getElementById(container);
  if (!el) return;
  el.innerHTML = '';

  const W = el.clientWidth || 320, H = 300;
  const R = Math.min(W, H) / 2 - 20;
  const Ri = R * 0.55;

  // Count by Final Classification
  const counts = d3.rollup(countryList, v => v.length, d => d.finalClassification);
  const data = Array.from(counts, ([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value);

  const total = d3.sum(data, d => d.value);

  const svg = d3.select(el).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const g = svg.append('g').attr('transform', `translate(${W / 2},${H / 2})`);

  const pie = d3.pie().value(d => d.value).sort(null).padAngle(0.02);
  const arc = d3.arc().innerRadius(Ri).outerRadius(R).cornerRadius(3);
  const arcHover = d3.arc().innerRadius(Ri).outerRadius(R + 6).cornerRadius(3);

  const arcs = g.selectAll('.arc')
    .data(pie(data))
    .join('g')
    .attr('class', 'arc');

  arcs.append('path')
    .attr('d', arc)
    .attr('fill', d => colors[d.data.key] || '#4b5563')
    .attr('opacity', d => !state.devGroup || state.devGroup === d.data.key ? 1 : 0.3)
    .on('mouseover', (event, d) => {
      d3.select(event.currentTarget).attr('d', arcHover);
      showTooltip(event, `<strong>${d.data.key}</strong>
        <span class="t-row"><span>Countries</span><span class="t-val">${d.data.value}</span></span>
        <span class="t-row"><span>Share</span><span class="t-val">${((d.data.value / total) * 100).toFixed(1)}%</span></span>`);
    })
    .on('mousemove', showTooltip)
    .on('mouseout', (event) => {
      d3.select(event.currentTarget).attr('d', arc);
      hideTooltip();
    })
    .on('click', (_, d) => onFilter('devGroup', d.data.key));

  // Centre label
  const centreText = g.append('g');
  centreText.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '-0.3em')
    .attr('font-size', '22px')
    .attr('font-weight', '700')
    .attr('fill', '#e6edf3')
    .text(total);
  centreText.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '1em')
    .attr('font-size', '11px')
    .attr('fill', '#8b949e')
    .text('countries');

  // Legend
  const legend = d3.select(el).append('div').attr('class', 'legend');
  data.forEach(d => {
    const item = legend.append('div')
      .attr('class', 'legend-item')
      .classed('dimmed', state.devGroup && state.devGroup !== d.key)
      .on('click', () => onFilter('devGroup', d.key));
    item.append('div')
      .attr('class', 'legend-swatch')
      .style('background', colors[d.key] || '#4b5563');
    item.append('span').text(`${d.key} (${d.value})`);
  });
}
