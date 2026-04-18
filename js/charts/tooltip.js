const tip = document.getElementById('tooltip');

export function showTooltip(event, html) {
  if (!tip) return;
  tip.innerHTML = html;
  tip.classList.remove('hidden');
  positionTooltip(event);
}

export function hideTooltip() {
  if (!tip) return;
  tip.classList.add('hidden');
}

// Called on mousemove to follow the cursor
export function positionTooltip(event) {
  if (!tip || tip.classList.contains('hidden')) return;
  // When called as a D3 event handler directly (second arg is datum, not event)
  const e = event?.type ? event : window.event;
  if (!e) return;
  const x = e.clientX, y = e.clientY;
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;

  let left = x + 14;
  let top  = y - 10;
  if (left + tw > vw - 8) left = x - tw - 14;
  if (top + th > vh - 8)  top  = y - th;
  tip.style.left = left + 'px';
  tip.style.top  = top  + 'px';
}
