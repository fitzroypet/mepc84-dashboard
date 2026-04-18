import { CONFIG } from '../config.js';
import { showTooltip, hideTooltip } from './tooltip.js';

const stanceColors = CONFIG.colors.stanceMacro;
const devColors = CONFIG.colors.devStatus;

export function renderStanceByGroup(container, register, state, onFilter) {
  const el = document.getElementById(container);
  if (!el) return;
  el.innerHTML = '';

  const groups = [
    'Developed', 'Developing (Other)', 'LDC only', 'SIDS only',
    'SIDS + LDC (Dual Status)', 'Economy in Transition',
    'NGO-Industry', 'NGO-Environment', 'Coalition', 'Intergovernmental',
  ];

  const stances = ['Strengthen', 'Weaken', 'Technical', 'Admin', 'Adopt', 'Amend', 'Replace', 'Review', 'Other'];

  // Build: group → stanceMacro → count, then normalise to %
  const byGroup = d3.rollup(register, rows => {
    const counts = {};
    stances.forEach(s => counts[s] = 0);
    rows.forEach(r => { if (counts[r.stanceMacro] !== undefined) counts[r.stanceMacro]++; });
    const total = d3.sum(Object.values(counts));
    const pct = {};
    stances.forEach(s => pct[s] = total > 0 ? (counts[s] / total) * 100 : 0);
    pct._total = total;
    return pct;
  }, d => d.devClassification);

  // Filter to groups that have data
  const activeGroups = groups.filter(g => byGroup.has(g));
  if (!activeGroups.length) {
    el.innerHTML = '<p style="color:#8b949e;padding:16px">No cross-reference data available.</p>';
    return;
  }

  const margin = { top: 10, right: 16, bottom: 90, left: 60 };
  const W = (el.clientWidth || 800) - margin.left - margin.right;
  const H = 220 - margin.top - margin.bottom;

  const xGroup = d3.scaleBand().domain(activeGroups).range([0, W]).paddingInner(0.2);
  const xStance = d3.scaleBand().domain(stances).range([0, xGroup.bandwidth()]).paddingInner(0.05);
  const y = d3.scaleLinear().domain([0, 100]).range([H, 0]);

  const svg = d3.select(el).append('svg')
    .attr('viewBox', `0 0 ${W + margin.left + margin.right} ${H + margin.top + margin.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Y gridlines
  g.append('g').attr('class', 'axis')
    .call(d3.axisLeft(y).ticks(5).tickSize(-W).tickFormat(d => `${d}%`))
    .call(a => a.selectAll('.tick line').attr('stroke', '#30363d').attr('stroke-dasharray', '3,3'))
    .call(a => a.select('.domain').remove());

  // Grouped bars
  activeGroups.forEach(grp => {
    const data = byGroup.get(grp);
    const gx = xGroup(grp);

    stances.forEach(stance => {
      const val = data[stance] || 0;
      if (val < 0.5) return;

      g.append('rect')
        .attr('class', 'bar-group')
        .attr('x', gx + xStance(stance))
        .attr('y', y(val))
        .attr('width', xStance.bandwidth())
        .attr('height', H - y(val))
        .attr('fill', stanceColors[stance] || '#64748b')
        .attr('opacity', () => {
          if (state.devGroup && state.devGroup !== grp) return 0.1;
          if (state.stanceMacro && state.stanceMacro !== stance) return 0.1;
          return 0.85;
        })
        .on('mouseover', (event) => {
          showTooltip(event, `<strong>${grp}</strong>
            <span class="t-row"><span>${stance}</span><span class="t-val">${val.toFixed(1)}%</span></span>
            <span class="t-row"><span>n</span><span class="t-val">${data._total}</span></span>`);
        })
        .on('mousemove', showTooltip)
        .on('mouseout', hideTooltip)
        .on('click', () => onFilter('devGroup', grp));
    });
  });

  // X axis (group names)
  g.append('g').attr('class', 'axis')
    .attr('transform', `translate(0,${H})`)
    .call(d3.axisBottom(xGroup).tickSize(0))
    .call(a => a.select('.domain').remove())
    .selectAll('text')
    .attr('transform', 'rotate(-30)')
    .attr('text-anchor', 'end')
    .attr('dy', '0.5em')
    .attr('font-size', '11px');

  // Y axis
  g.append('g').attr('class', 'axis')
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d}%`));

  // Stance legend
  const legend = d3.select(el).append('div').attr('class', 'legend').style('margin-top', '8px');
  stances.forEach(s => {
    const item = legend.append('div')
      .attr('class', 'legend-item')
      .classed('dimmed', state.stanceMacro && state.stanceMacro !== s)
      .on('click', () => onFilter('stanceMacro', s));
    item.append('div').attr('class', 'legend-swatch').style('background', stanceColors[s] || '#64748b');
    item.append('span').text(s);
  });
}
