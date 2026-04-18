import { showTooltip, hideTooltip } from './tooltip.js';
import { CONFIG } from '../config.js';

const agendaLabels = CONFIG.agendaLabels;

export function renderAgendaHeatmap(container, crossAgenda, state, onFilter) {
  const el = document.getElementById(container);
  if (!el) return;
  el.innerHTML = '';

  const margin = { top: 10, right: 16, bottom: 80, left: 160 };
  const W = (el.clientWidth || 600) - margin.left - margin.right;

  // Top 20 originators by total
  const top20 = [...crossAgenda]
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  const originators = top20.map(d => d.originator);

  // Agenda item columns (keys starting with A and a number)
  const agendaCols = Object.keys(top20[0] || {})
    .filter(k => /^A\d+$/.test(k))
    .sort((a, b) => +a.slice(1) - +b.slice(1));

  const rowH = 22;
  const H = originators.length * rowH;

  const x = d3.scaleBand().domain(agendaCols).range([0, W]).padding(0.05);
  const y = d3.scaleBand().domain(originators).range([0, H]).padding(0.05);

  const maxVal = d3.max(top20, d => d3.max(agendaCols, col => d[col] || 0));
  const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, maxVal]);

  const svg = d3.select(el).append('svg')
    .attr('viewBox', `0 0 ${W + margin.left + margin.right} ${H + margin.top + margin.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Cells
  top20.forEach(row => {
    agendaCols.forEach(col => {
      const val = row[col] || 0;
      if (val === 0) return;

      g.append('rect')
        .attr('class', 'heatmap-cell')
        .attr('x', x(col))
        .attr('y', y(row.originator))
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .attr('fill', colorScale(val))
        .attr('rx', 2)
        .attr('opacity', !state.agendaItem || state.agendaItem === col.slice(1) ? 1 : 0.2)
        .on('mouseover', (event) => {
          showTooltip(event, `<strong>${row.originator}</strong>
            <span class="t-row"><span>Agenda ${col.slice(1)}</span><span class="t-val">${val}</span></span>
            <span class="t-row"><span>Total</span><span class="t-val">${row.total}</span></span>`);
        })
        .on('mousemove', showTooltip)
        .on('mouseout', hideTooltip)
        .on('click', () => onFilter('agendaItem', col.slice(1)));

      // Cell label if wide enough
      if (x.bandwidth() > 20) {
        g.append('text')
          .attr('x', x(col) + x.bandwidth() / 2)
          .attr('y', y(row.originator) + y.bandwidth() / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('font-size', '10px')
          .attr('fill', val > maxVal * 0.6 ? '#fff' : '#8b949e')
          .text(val);
      }
    });
  });

  // Y axis (originator names)
  g.append('g').attr('class', 'axis')
    .call(d3.axisLeft(y).tickSize(0))
    .call(a => a.select('.domain').remove())
    .selectAll('text')
    .attr('font-size', '11px')
    .attr('fill', '#8b949e');

  // X axis (agenda items)
  g.append('g').attr('class', 'axis')
    .attr('transform', `translate(0,${H})`)
    .call(d3.axisBottom(x).tickFormat(d => `A${d.slice(1)}`))
    .call(a => a.select('.domain').remove())
    .selectAll('text')
    .attr('transform', 'rotate(-40)')
    .attr('text-anchor', 'end')
    .attr('font-size', '11px')
    .attr('fill', '#8b949e');
}
