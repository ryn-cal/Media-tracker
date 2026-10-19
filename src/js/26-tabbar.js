/* =====================================================================
   Customisable tab bar (bar layout only): which destinations sit in the bar, in what order, and how many.
   The rest live in the ☰ menu, in the order of the second list. Settings → Tab bar.
   ===================================================================== */
const TAB_DEFS = { home:['sun', 'nav_home'], tracker:['bookmarks', 'nav_tracker'], lists:['books', 'nav_lists'], files:['database', 'nav_files'], insights:['chart-dots-3', 'nav_insights'], ask:['sparkles', 'nav_ask'], import:['arrows-exchange', 'nav_data'], guide:['compass', 'nav_guide'] };   // Settings and Profile are not tabs: they live in the ☰ menu header
const TAB_DEFAULT = ['home', 'tracker', 'lists', 'files'];
const TB = (() => {
  const read = k => { try { const v = JSON.parse(store.get(k, '')); return Array.isArray(v) ? v : null; } catch (e) { return null; } };
  const known = a => (a || []).filter((id, i, arr) => TAB_DEFS[id] && arr.indexOf(id) === i);
  let on = known(read('vmm.tabbar') || TAB_DEFAULT); if (!on.length) on = TAB_DEFAULT.slice();
  const off = known(read('vmm.tabmenu')).filter(id => !on.includes(id)); Object.keys(TAB_DEFS).forEach(id => { if (!on.includes(id) && !off.includes(id)) off.push(id); });
  const max = Number(store.get('vmm.tabmax', '4'));
  return { on, off, max:max >= 3 && max <= 5 ? max : 4 };
})();
const tbSave = () => { store.set('vmm.tabbar', JSON.stringify(TB.on)); store.set('vmm.tabmenu', JSON.stringify(TB.off)); store.set('vmm.tabmax', String(TB.max)); applyTabBar(); renderTabBarSettings(); };
const tbShown = () => TB.on.filter(id => id !== 'ask' || prefs.ai).slice(0, TB.max);
const tbMenu = () => [...TB.on.filter(id => !tbShown().includes(id)), ...TB.off].filter(id => id !== 'ask' || prefs.ai);   // what the ☰ menu lists, in order
function applyTabBar() {
  const shown = tbShown();
  $$('.nav[data-tab]').forEach(b => { const i = shown.indexOf(b.dataset.tab); b.toggleAttribute('data-primary', i >= 0); b.style.setProperty('--bo', i >= 0 ? i : 50); });
  applyTabIcons(); renderDrawer(); syncMenu();
}
{ const _look = applyLook; applyLook = function () { _look.apply(this, arguments); applyTabBar(); }; }
const tbLabel = id => t(TAB_DEFS[id][1]);
function renderTabBarSettings() {
  const row = (id, i, list) => `<div class="tb-row ${list === 'on' && i >= TB.max ? 'over' : ''}" data-id="${id}" data-list="${list}"><button type="button" class="tb-ctl ${list === 'on' ? 'rm' : 'add'}" data-tb="${list === 'on' ? 'rm' : 'add'}" aria-label="${esc(t(list === 'on' ? 'tb_remove' : 'tb_add'))}"><i class="ti ti-${list === 'on' ? 'minus' : 'plus'}"></i></button>${iconHtml(id, 'tb-ic')}<b>${esc(tbLabel(id))}</b>${list === 'on' && i >= TB.max ? `<small>${esc(t('tb_in_more'))}</small>` : ''}<span class="tb-grip" role="button" tabindex="0" aria-label="${esc(t('tb_reorder'))}"><i class="ti ti-grip-horizontal"></i></span></div>`;
  $('tbPreview').innerHTML = tbShown().map(id => `<span>${iconHtml(id)}<em>${esc(tbLabel(id))}</em></span>`).join('');
  $('tbOn').innerHTML = TB.on.map((id, i) => row(id, i, 'on')).join('');
  $('tbOff').innerHTML = TB.off.map((id, i) => row(id, i, 'off')).join('') || `<div class="tb-none">${esc(t('tb_none'))}</div>`;
  $$('#tbMax button').forEach(b => b.setAttribute('aria-pressed', Number(b.dataset.v) === TB.max));
}
$('tbMax').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { TB.max = Number(b.dataset.v); tbSave(); } });
$('tbReset').onclick = () => { TB.on = TAB_DEFAULT.slice(); TB.off = Object.keys(TAB_DEFS).filter(id => !TB.on.includes(id)); TB.max = 4; tbSave(); };
['tbOn', 'tbOff'].forEach(id => $(id).addEventListener('click', e => {
  const b = e.target.closest('[data-tb]'); if (!b) return; const k = b.closest('[data-id]').dataset.id;
  if (b.dataset.tb === 'rm') { if (TB.on.length < 2) return toast(t('tb_min')); TB.on = TB.on.filter(x => x !== k); TB.off.unshift(k); } else { TB.off = TB.off.filter(x => x !== k); TB.on.push(k); }
  tbSave();
}));
/* reorder either list: drag the grip (finger or mouse); with the keyboard, focus the grip and press ↑ / ↓.
   The tab bar keeps at least one tab, but the menu order below it can always be rearranged. */
function sortable(list, key) {
  let drag = null;
  list.addEventListener('pointerdown', e => {
    const g = e.target.closest('.tb-grip'); if (!g) return; e.preventDefault();
    drag = { row:g.closest('.tb-row'), id:e.pointerId }; drag.row.classList.add('drag'); g.setPointerCapture(e.pointerId);
  });
  list.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const rows = $$('.tb-row', list).filter(r => r !== drag.row), after = rows.find(r => { const b = r.getBoundingClientRect(); return e.clientY < b.top + b.height / 2; });
    if (after) { if (drag.row.nextSibling !== after) list.insertBefore(drag.row, after); } else list.appendChild(drag.row);
  });
  const end = e => { if (!drag || e.pointerId !== drag.id) return; drag.row.classList.remove('drag'); drag = null; TB[key] = $$('.tb-row', list).map(r => r.dataset.id); tbSave(); };
  list.addEventListener('pointerup', end); list.addEventListener('pointercancel', end);
  list.addEventListener('keydown', e => {
    const g = e.target.closest('.tb-grip'); if (!g || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return; e.preventDefault();
    const id = g.closest('.tb-row').dataset.id, a = TB[key], i = a.indexOf(id), j = i + (e.key === 'ArrowUp' ? -1 : 1);
    if (j < 0 || j >= a.length) return; a.splice(i, 1); a.splice(j, 0, id); tbSave();
    const again = list.querySelector(`[data-id="${id}"] .tb-grip`); if (again) again.focus();
  });
}
sortable($('tbOn'), 'on'); sortable($('tbOff'), 'off');
