import { CONFIG } from '../config.js';
import { showTooltip, hideTooltip } from './tooltip.js';

const colors = CONFIG.colors.devStatus;

export function renderOriginatorBubble(container, crossAgenda, state, onFilter) {
  const el = document.getElementById(container);
  if (!el) return;
  el.innerHTML = '';

  const W = el.clientWidth || 480, H = 360;

  const data = crossAgenda
    .filter(d => d.total > 0)
    .sort((a, b) => b.total - a.total);

  const pack = d3.pack()
    .size([W - 4, H - 4])
    .padding(3);

  const root = d3.hierarchy({ children: data })
    .sum(d => Math.sqrt(d.total || 0) * 6 + 6);

  pack(root);

  const svg = d3.select(el).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const node = svg.selectAll('.bubble')
    .data(root.leaves())
    .join('g')
    .attr('class', 'bubble')
    .attr('transform', d => `translate(${d.x + 2},${d.y + 2})`);

  node.append('circle')
    .attr('r', d => d.r)
    .attr('fill', d => colors[d.data.devClassification] || colors['Unknown'])
    .attr('opacity', d => {
      if (!state.devGroup) return 0.85;
      return state.devGroup === d.data.devClassification ? 0.95 : 0.15;
    })
    .attr('stroke', '#0d1117')
    .attr('stroke-width', 1)
    .on('mouseover', (event, d) => {
      d3.select(event.currentTarget).attr('opacity', 1);
      const agendaCols = Object.keys(d.data)
        .filter(k => /^A\d+$/.test(k) && d.data[k] > 0)
        .sort((a, b) => d.data[b] - d.data[a])
        .slice(0, 3);
      const topAgendas = agendaCols.map(k => `A${k.slice(1)}: ${d.data[k]}`).join(', ');
      showTooltip(event, `<strong>${d.data.originator}</strong>
        <span class="t-row"><span>Total</span><span class="t-val">${d.data.total}</span></span>
        <span class="t-row"><span>Group</span><span class="t-val">${d.data.devClassification || 'Unknown'}</span></span>
        <span class="t-row"><span>Top agendas</span><span class="t-val">${topAgendas || '—'}</span></span>`);
    })
    .on('mousemove', showTooltip)
    .on('mouseout', (event, d) => {
      d3.select(event.currentTarget).attr('opacity', () => {
        if (!state.devGroup) return 0.85;
        return state.devGroup === d.data.devClassification ? 0.95 : 0.15;
      });
      hideTooltip();
    })
    .on('click', (_, d) => onFilter('devGroup', d.data.devClassification));

  // Labels for larger bubbles
  node.filter(d => d.r > 22)
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('font-size', d => Math.min(d.r / 3.5, 11) + 'px')
    .attr('fill', '#e6edf3')
    .attr('pointer-events', 'none')
    .text(d => {
      const name = d.data.originator;
      return d.r > 40 ? name : name.slice(0, Math.floor(d.r / 4));
    });
}
