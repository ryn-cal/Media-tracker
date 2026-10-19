/* =====================================================================
   Database footer calculations and the selection gutter — one copy for the Tracker and the Files library
   ===================================================================== */
let CALC_ALL = null;                      // the whole filtered list while an ungrouped table draws (the table itself only holds one chunk)
const CALC_COMMON = ['count', 'values', 'empty', 'unique', 'pfilled', 'pempty'];
const CALC_NUM = ['sum', 'avg', 'median', 'min', 'max', 'range'];
const calcOpsFor = p => ['none', ...CALC_COMMON, ...(p.type === 'number' || p.type === 'rating' ? CALC_NUM : p.type === 'date' ? ['min', 'max'] : [])];
const calcLabel = (op, p) => t('calc_' + ((p && p.type === 'date' && (op === 'min' || op === 'max')) ? (op === 'min' ? 'earliest' : 'latest') : op));
function calcValue(op, p, rows) {
  const vals = rows.map(r => pGet(r, p)), has = vals.filter(v => !isEmptyVal(p, v)), n = rows.length, pct = x => n ? Math.round(x / n * 100) + '%' : '0%';
  if (op === 'count') return String(n);
  if (op === 'values') return String(has.length);
  if (op === 'empty') return String(n - has.length);
  if (op === 'pfilled') return pct(has.length);
  if (op === 'pempty') return pct(n - has.length);
  if (op === 'unique') return String(new Set(has.flatMap(v => Array.isArray(v) ? v : [String(v)])).size);
  const nums = has.map(Number).filter(Number.isFinite).sort((a, b) => a - b); if (!nums.length) return '';
  const fmt = x => p.type === 'date' ? new Date(x).toLocaleDateString(locOf()) : p.id === 'runtime' ? fmtRuntime(Math.round(x)) : p.id === 'length' ? lenText(x) : p.id === 'size' ? fmtSize(x) : String(Math.round(x * 100) / 100);
  if (op === 'sum') return fmt(nums.reduce((a, b) => a + b, 0));
  if (op === 'avg') return fmt(nums.reduce((a, b) => a + b, 0) / nums.length);
  if (op === 'median') return fmt(nums.length % 2 ? nums[nums.length >> 1] : (nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2);
  if (op === 'min') return fmt(nums[0]);
  if (op === 'max') return fmt(nums[nums.length - 1]);
  if (op === 'range') return fmt(nums[nums.length - 1] - nums[0]);
  return '';
}
/* the first column counts by default, like the reference; every other column starts empty and offers "Calculate" on hover */
function calcFootHtml(view, cols, rows, lead, tail) {
  const cs = view.calc || {};
  return `<tfoot><tr>${'<td class="ck"></td>'.repeat(lead)}${cols.map((p, i) => {
    const op = cs[p.id] != null ? cs[p.id] : i === 0 ? 'count' : 'none';
    return `<td class="cf${p.id === 'fav' ? ' ck' : ''}" data-calc="${esc(p.id)}" tabindex="0">${op === 'none' ? `<span class="cf-add">${esc(t('calc_calculate'))}</span>` : `<span class="cf-l">${esc(calcLabel(op, p))}</span><b>${esc(calcValue(op, p, rows))}</b>`}</td>`;
  }).join('')}${'<td class="ck"></td>'.repeat(tail)}</tr></tfoot>`;
}
function calcPop(anchor, host, p) {
  if (!p) return; const cur = () => (host.view().calc || {})[p.id] || (host.view().vis[0] === p.id ? 'count' : 'none');
  openPop(anchor, () => `<div class="pop-h"><i class="ti ti-sum"></i> ${esc(t('calc_calculate'))}</div>${[['', ['none']], ['calc_count', ['count', 'values', 'empty', 'unique']], ['calc_percent', ['pfilled', 'pempty']], ['calc_more', calcOpsFor(p).filter(o => !CALC_COMMON.includes(o) && o !== 'none')]].filter(g => g[1].length).map(([h, ops]) => `${h ? `<div class="pop-sub">${esc(t(h))}</div>` : ''}${ops.map(op => `<button class="pm" data-op="${op}">${esc(op === 'none' ? t('calc_none') : calcLabel(op, p))}${cur() === op ? ' ✓' : ''}</button>`).join('')}`).join('')}`, {
    click:e => { const b = e.target.closest('[data-op]'); if (!b) return; const v = host.view(); v.calc = { ...(v.calc || {}), [p.id]:b.dataset.op }; host.save(); closePop(); host.render(); }
  }, 'pop-menu');
}
/* a gutter or corner checkbox: ticks one row (shift = a range) or the whole filtered list; selecting is on while anything is ticked */
function gutterPick(S, el, shift, last, redraw) {
  const on = el.checked;
  if (el.hasAttribute('data-all')) S.order.forEach(id => on ? S.sel.add(id) : S.sel.delete(id));
  else {
    const id = Number(el.closest('[data-id]').dataset.id), a = last == null ? -1 : S.order.indexOf(last), b = S.order.indexOf(id);
    if (shift && a >= 0 && b >= 0) S.order.slice(Math.min(a, b), Math.max(a, b) + 1).forEach(x => on ? S.sel.add(x) : S.sel.delete(x)); else on ? S.sel.add(id) : S.sel.delete(id);
    last = id;
  }
  S.selecting = S.sel.size > 0; redraw(); return last;
}
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('td.cf')) { e.preventDefault(); e.target.click(); } });

/* ---- board: each column's header summarises its cards (count by default; sum, average, min or max of a number property) ---- */
const baggNum = () => allProps().filter(p => p.type === 'number' || p.type === 'rating');
function baggLabel(key) {
  if (!key || key === 'count') return t('calc_count'); if (key === 'none') return t('bagg_none');
  const [op, pid] = key.split(':'), p = propById(pid); return p ? t('calc_' + op) + ' · ' + p.name : t('calc_count');
}
function baggValue(key, items) {
  if (!key || key === 'count') return String(items.length); if (key === 'none') return '';
  const [op, pid] = key.split(':'), p = propById(pid); return p ? calcValue(op, p, items) : String(items.length);
}
function baggPop(anchor, host, col, field = 'bagg') {
  const v = host.view(), cur = () => (v[field] || {})[col] || 'count', keys = ['none', 'count', ...baggNum().flatMap(p => ['sum', 'avg', 'min', 'max'].map(o => o + ':' + p.id))];
  openPop(anchor, () => `<div class="pop-h"><i class="ti ti-sum"></i> ${esc(t('bagg'))}</div>${['none', 'count'].map(k => `<button class="pm" data-k="${k}">${esc(baggLabel(k))}${cur() === k ? ' ✓' : ''}</button>`).join('')}${baggNum().map(p => `<div class="pop-sub">${esc(p.name)}</div>${['sum', 'avg', 'min', 'max'].map(o => { const k = o + ':' + p.id; return `<button class="pm" data-k="${esc(k)}">${esc(t('calc_' + o))}${cur() === k ? ' ✓' : ''}</button>`; }).join('')}`).join('')}`, {
    click:e => { const b = e.target.closest('[data-k]'); if (!b) return; v[field] = { ...(v[field] || {}), [col]:b.dataset.k }; host.save(); closePop(); host.render(); }
  }, 'pop-menu');
}
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.bagg')) { e.preventDefault(); e.target.click(); } });

/* ---- fill down / up: drag the small square at a cell's corner over other rows of the same column (desktop; a mouse is needed) ---- */
const FILL_PROPS = new Set(['status', 'type', 'genre', 'rating', 'year']);
const fillable = p => p && !p.ro && !p.core && p.type !== 'action' && p.id !== 'progress' && p.id !== 'cover' && (p.custom || ['text', 'select', 'multi', 'number', 'date', 'rating', 'checkbox'].includes(p.type));
let FILL = null, fillEl = null;
function fillHide() { if (fillEl) fillEl.hidden = true; }
function fillShow(td) {
  if (!fillEl) { fillEl = document.createElement('div'); fillEl.className = 'fillh'; fillEl.hidden = true; fillEl.setAttribute('aria-hidden', 'true'); fillEl.title = t('kk_fill'); document.body.appendChild(fillEl); fillEl.addEventListener('pointerdown', fillStart); }
  const r = td.getBoundingClientRect(); fillEl.style.left = (r.right - 7) + 'px'; fillEl.style.top = (r.bottom - 7) + 'px'; fillEl.hidden = false; fillEl._td = td;
}
function fillMark(to) {
  document.querySelectorAll('.fillrange').forEach(x => x.classList.remove('fillrange'));
  const rows = [...FILL.table.tBodies].flatMap(b => [...b.rows]), a = rows.indexOf(FILL.tr), b = rows.indexOf(to); if (a < 0 || b < 0) return [];
  const span = rows.slice(Math.min(a, b), Math.max(a, b) + 1); span.forEach(r => { const c = r.querySelector(`td[data-p="${CSS.escape(FILL.p.id)}"]`); if (c) c.classList.add('fillrange'); }); return span;
}
function fillEnd(apply) {
  const f = FILL; if (!f) return; FILL = null; document.removeEventListener('pointermove', fillMove); document.removeEventListener('pointerup', fillUp); document.removeEventListener('pointercancel', fillCancel); document.body.classList.remove('filling');
  const span = apply && f.to ? fillMarkSpan(f) : []; document.querySelectorAll('.fillrange').forEach(x => x.classList.remove('fillrange')); fillHide();
  const ids = span.map(r => Number(r.dataset.id)).filter(id => id !== Number(f.tr.dataset.id)); if (!ids.length) return;
  const src = media.find(m => m.id === Number(f.tr.dataset.id)); if (!src) return; const val = pGet(src, f.p);
  withUndo(ids, () => bulkMedia(ids, m => pSet(m, f.p, Array.isArray(val) ? val.slice() : val)), t('fill_n', { n:ids.length }));
}
const fillMove = ev => { if (!FILL) return; const el = document.elementFromPoint(ev.clientX, ev.clientY), tr = el && el.closest && el.closest('tr[data-id]'); if (tr && tr.closest('table') === FILL.table) { FILL.to = tr; fillMark(tr); } };
const fillUp = () => fillEnd(true), fillCancel = () => fillEnd(false);
function fillStart(e) {
  const td = fillEl._td; if (!td) return; e.preventDefault(); e.stopPropagation();
  FILL = { td, tr:td.closest('tr'), table:td.closest('table'), p:propById(td.dataset.p), to:td.closest('tr') }; document.body.classList.add('filling');
  document.addEventListener('pointermove', fillMove); document.addEventListener('pointerup', fillUp); document.addEventListener('pointercancel', fillCancel);     // on the document, so a release anywhere ends the drag
}
function fillMarkSpan(f) { const rows = [...f.table.tBodies].flatMap(b => [...b.rows]), a = rows.indexOf(f.tr), b = rows.indexOf(f.to); return a < 0 || b < 0 ? [] : rows.slice(Math.min(a, b), Math.max(a, b) + 1); }
document.addEventListener('mouseover', e => {
  if (FILL && e.buttons === 0) fillEnd(false);                    // a release that was never seen must not leave the handle dead
  if (FILL || !window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  const td = e.target.closest && e.target.closest('#trackerGrid td[data-p]'); if (!td || !td.closest('table.dtable')) { if (!(e.target.closest && e.target.closest('.fillh'))) fillHide(); return; }
  fillable(propById(td.dataset.p)) && !TS.selecting ? fillShow(td) : fillHide();
});
addEventListener('scroll', fillHide, { passive:true, capture:true });

/* a dark tooltip for the icon-only tools (the native title is moved into the app's own tooltip on first hover) */
document.addEventListener('mouseover', e => { const b = e.target.closest && e.target.closest('.lib-tools .fbtn[title], .ld-find .fbtn[title]'); if (b) { b.dataset.tip = b.title; b.removeAttribute('title'); } });

/* ---- columns: drag a header's right edge to resize (saved per view); "Freeze up to this column" pins columns while the rest scrolls ---- */
function applyFreeze(root, view) {
  root.querySelectorAll('table.dtable').forEach(tb => {
    tb.querySelectorAll('.frz').forEach(c => { c.classList.remove('frz', 'frz-last'); c.style.left = ''; });
    const hr = tb.tHead && tb.tHead.rows[0], fid = view && view.freeze; if (!hr || !fid) return;
    const ths = [...hr.cells], idx = ths.findIndex(th => th.dataset.p === fid); if (idx < 0) return;
    const ws = ths.slice(0, idx + 1).map(th => th.getBoundingClientRect().width); let left = 0;
    for (let i = 0; i <= idx; i++) { [...tb.rows].forEach(r => { const c = r.cells[i]; if (c) { c.classList.add('frz'); c.style.left = left + 'px'; if (i === idx) c.classList.add('frz-last'); } }); left += ws[i]; }
  });
}
document.addEventListener('pointerdown', e => {
  const h = e.target.closest && e.target.closest('[data-rsz]'); if (!h) return; e.preventDefault(); e.stopPropagation();
  const th = h.closest('th'), grid = th.closest('#trackerGrid, #fGrid'), files = grid.id === 'fGrid', x0 = e.clientX, w0 = th.getBoundingClientRect().width;
  try { h.setPointerCapture(e.pointerId); } catch (err) {} document.body.classList.add("rszing");
  const mv = ev => { const w = Math.max(70, Math.round(w0 + ev.clientX - x0)); th.style.width = th.style.minWidth = th.style.maxWidth = w + 'px'; };
  const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); document.body.classList.remove('rszing');
    const host = files ? filesHost() : libHost(), v = host.view(); v.widths = { ...(v.widths || {}), [th.dataset.p]:Math.round(th.getBoundingClientRect().width) }; host.save(); applyFreeze(grid, v); };
  h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up);
}, true);
