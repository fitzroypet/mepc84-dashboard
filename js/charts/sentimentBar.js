import { CONFIG } from '../config.js';
import { showTooltip, hideTooltip } from './tooltip.js';

const colors = CONFIG.colors.sentiment;
const agendaLabels = CONFIG.agendaLabels;

export function renderSentimentBar(container, register, state, onFilter) {
  const el = document.getElementById(container);
  if (!el) return;
  el.innerHTML = '';

  const margin = { top: 16, right: 16, bottom: 60, left: 36 };
  const W = (el.clientWidth || 500) - margin.left - margin.right;
  const H = 240 - margin.top - margin.bottom;

  const sentiments = ['Favourable', 'Neutral', 'Problematic'];

  // Get all agenda items present in data
  const agendas = [...new Set(register.map(d => d.agendaItem))]
    .filter(Boolean)
    .sort((a, b) => +a - +b);

  // Build stacked data
  const byAgenda = d3.rollup(
    register,
    rows => {
      const counts = { Favourable: 0, Neutral: 0, Problematic: 0 };
      rows.forEach(r => { if (counts[r.sentiment] !== undefined) counts[r.sentiment]++; });
      return counts;
    },
    d => d.agendaItem
  );

  const stackData = agendas.map(a => ({
    agenda: a,
    label: agendaLabels[a] || `A${a}`,
    ...(byAgenda.get(a) || { Favourable: 0, Neutral: 0, Problematic: 0 }),
  }));

  const stack = d3.stack().keys(sentiments);
  const stacked = stack(stackData);

  const x = d3.scaleBand().domain(agendas).range([0, W]).padding(0.2);
  const y = d3.scaleLinear()
    .domain([0, d3.max(stackData, d => d.Favourable + d.Neutral + d.Problematic)])
    .nice().range([H, 0]);

  const svg = d3.select(el).append('svg')
    .attr('viewBox', `0 0 ${W + margin.left + margin.right} ${H + margin.top + margin.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Gridlines
  g.append('g').attr('class', 'axis')
    .call(d3.axisLeft(y).ticks(5).tickSize(-W).tickFormat(d3.format('d')))
    .call(a => a.selectAll('.tick line').attr('stroke', '#30363d').attr('stroke-dasharray', '3,3'))
    .call(a => a.select('.domain').remove());

  // Stacked bars
  g.selectAll('.layer')
    .data(stacked)
    .join('g')
    .attr('class', 'layer')
    .attr('fill', d => colors[d.key] || '#6b7280')
    .selectAll('rect')
    .data(d => d.map(point => ({ ...point, sentiment: d.key })))
    .join('rect')
    .attr('x', d => x(d.data.agenda))
    .attr('y', d => y(d[1]))
    .attr('height', d => Math.max(0, y(d[0]) - y(d[1])))
    .attr('width', x.bandwidth())
    .attr('opacity', d => !state.agendaItem || state.agendaItem === d.data.agenda ? 1 : 0.3)
    .on('mouseover', (event, d) => {
      showTooltip(event, `<strong>${d.data.label}</strong>
        <span class="t-row"><span>${d.sentiment}</span><span class="t-val">${d[1] - d[0]}</span></span>
        <span class="t-row"><span>Total</span><span class="t-val">${d.data.Favourable + d.data.Neutral + d.data.Problematic}</span></span>`);
    })
    .on('mousemove', showTooltip)
    .on('mouseout', hideTooltip)
    .on('click', (_, d) => onFilter('agendaItem', d.data.agenda));

  // X axis
  g.append('g').attr('class', 'axis')
    .attr('transform', `translate(0,${H})`)
    .call(d3.axisBottom(x).tickFormat(a => `A${a}`))
    .selectAll('text')
    .attr('transform', 'rotate(-40)')
    .attr('text-anchor', 'end')
    .attr('dy', '0.5em')
    .attr('dx', '-0.5em');

  // Y axis
  g.append('g').attr('class', 'axis')
    .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('d')));

  // Legend
  const legend = d3.select(el).append('div').attr('class', 'legend');
  sentiments.forEach(s => {
    const item = legend.append('div').attr('class', 'legend-item');
    item.append('div').attr('class', 'legend-swatch').style('background', colors[s]);
    item.append('span').text(s);
  });
}
