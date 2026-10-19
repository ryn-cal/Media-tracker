/* =====================================================================
   Colour picker + small popup menu (shared by lists and the share studio)
   ===================================================================== */
const hsl2hex = (h, s, l) => { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); };
const PALETTE = (() => { const rows = []; [[72, 56], [64, 44], [54, 70], [56, 30]].forEach(([s, l]) => { const r = []; for (let h = 0; h < 360; h += 30) r.push(hsl2hex((h + 8) % 360, s, l)); rows.push(r); }); rows.push(['#111827', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#8a5a44', '#a47551', '#c9a66b', '#7c8a6e', '#4a5d6b', '#b7a4d0', '#e8b4b8']); return rows; })();
const HEX_RE = /^#[0-9a-f]{6}$/i;
function colorPicker(host, get, set, rows) {          // rows: a smaller palette (an array of rows of hex); the full one by default
  const draw = () => {
    const v = String(get() || '').toLowerCase();
    host.innerHTML = `<div class="cp">${(rows || PALETTE).map(r => `<div class="cp-row">${r.map(c => `<button type="button" class="cp-sw" style="--c:${c}" data-c="${c}" aria-pressed="${c === v}" aria-label="${c}"></button>`).join('')}</div>`).join('')}
      <div class="cp-custom"><label class="cp-pick" title="${esc(t('c_custom'))}"><input type="color" value="${HEX_RE.test(v) ? v : '#7c5cff'}"><span style="background:${esc(v)}"></span></label><input type="text" class="cp-hex" value="${esc(v)}" maxlength="7" spellcheck="false" aria-label="${esc(t('c_hex'))}"><span class="cp-cap">${esc(t('c_custom'))}</span></div></div>`;
  };
  const mark = v => { host.querySelectorAll('.cp-sw').forEach(x => x.setAttribute('aria-pressed', x.dataset.c === v)); const sp = host.querySelector('.cp-pick span'); if (sp) sp.style.background = v; };
  host.onclick = e => { const b = e.target.closest('[data-c]'); if (b) { set(b.dataset.c); draw(); } };
  host.oninput = e => {
    if (e.target.type === 'color') { const v = e.target.value.toLowerCase(); set(v); host.querySelector('.cp-hex').value = v; mark(v); }
    else if (e.target.classList.contains('cp-hex')) { let v = e.target.value.trim(); if (/^#?[0-9a-f]{6}$/i.test(v)) { v = (v[0] === '#' ? v : '#' + v).toLowerCase(); set(v); host.querySelector('input[type=color]').value = v; mark(v); } }
  };
  draw(); return draw;
}
let menuEl = null;
function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
function openMenu(anchor, items) {
  closeMenu(); const m = document.createElement('div'); m.className = 'pmenu';
  m.innerHTML = items.map(([k, l, ic]) => (k === '-' ? '<hr>' : `<button type="button" data-k="${k}"><i class="ti ti-${ic}"></i>${esc(l)}</button>`)).join('');
  document.body.appendChild(m); const r = anchor.getBoundingClientRect();
  m.style.top = Math.max(8, Math.min(r.bottom + 6, innerHeight - m.offsetHeight - 8)) + 'px'; m.style.left = Math.max(8, Math.min(r.right - m.offsetWidth, innerWidth - m.offsetWidth - 8)) + 'px'; menuEl = m;
  return new Promise(res => { m.onclick = e => { const b = e.target.closest('[data-k]'); if (b) { closeMenu(); res(b.dataset.k); } }; });
}
document.addEventListener('mousedown', e => { if (menuEl && !menuEl.contains(e.target) && !e.target.closest('[data-menu]')) closeMenu(); }, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
addEventListener('scroll', closeMenu, { passive:true });

