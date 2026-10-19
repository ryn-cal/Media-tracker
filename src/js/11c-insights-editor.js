/* =====================================================================
   Settings → Insights: the one place the Insights page is edited.
   The page itself only shows (period, scope, which layout) and shares. Here: the layouts (the built-in one and yours), the widgets
   of the layout being edited in their order, what each widget measures, and a preview drawn by the same code from the same data.
   ===================================================================== */
const LE = { edit:null };                                    // name of the layout being edited; null = none
const IW_SPANS = [[2, 'iw_w_third'], [3, 'iw_w_half'], [4, 'iw_w_two'], [6, 'iw_w_full']];
const wid = () => 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4);
const leLayout = () => (LE.edit != null && INSL.presets[LE.edit]) || null;
const leName = base => { let n = base, i = 2; while (INSL.presets[n]) n = base + ' ' + i++; return n; };
const leCopy = (src, base) => { const n = leName(base); INSL.presets[n] = JSON.parse(JSON.stringify(src)); return n; };
function iwDefaults(kind) { const c = { id:wid(), kind, basis:'done' }; if (IW_BYS[kind]) c.by = IW_BYS[kind][0]; if (IW_METRICS[kind]) c.metric = 'items'; if (['heat', 'cal'].includes(kind)) c.basis = 'events'; if (['heat', 'cal', 'kinds'].includes(kind)) c.w = 6; return c; }

function renderScope() {
  $('leScope').innerHTML = `<option value="">${esc(t('ins_lib'))}</option><option value="fav">♥ ${esc(t('l_fav'))}</option>` + LISTS.map(l => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join(''); $('leScope').value = INS.list;
}
$('leScope').onchange = e => { INS.list = e.target.value; store.set('vmm.insscope', INS.list); renderInsights(); };
function renderLayouts() {
  renderScope(); if (LE.edit == null && INSL.active && INSL.presets[INSL.active]) LE.edit = INSL.active;      // open the layout the page uses
  const act = INSL.active && INSL.presets[INSL.active] ? INSL.active : '', rows = [['', t('ins_default'), DEFAULT_LAYOUT], ...Object.keys(INSL.presets).map(n => [n, n, INSL.presets[n]])];
  $('lsLayouts').innerHTML = rows.map(([n, label, lay]) => lsItem('lay', n || '__default', lsIc(act === n ? 'circle-check' : 'layout-dashboard'), label, [t('ins_n_widgets', { n:lay.length }), act === n ? t('ins_in_use') : ''].filter(Boolean).join(' · '),
    `${n ? `<label class="fld"><span>${esc(t('lib_view_name'))}</span><input type="text" data-f="name" value="${esc(n)}" maxlength="30"></label>` : `<p class="hint">${esc(t('ins_default_d'))}</p>`}
     <div class="ls-acts"><button class="btn sm primary" type="button" data-ls="ledit"><i class="ti ti-pencil"></i>${esc(t(n ? 'ins_edit_ws' : 'ins_edit_copy'))}</button>${act === n ? '' : `<button class="btn sm" type="button" data-ls="use"><i class="ti ti-check"></i>${esc(t('ins_use'))}</button>`}<button class="btn sm" type="button" data-ls="dupl"><i class="ti ti-copy"></i>${esc(t('lib_duplicate'))}</button>${n ? `<button class="btn sm danger" type="button" data-ls="dell"><i class="ti ti-trash"></i>${esc(t('del'))}</button>` : ''}</div>`)).join('')
    + `<button class="btn sm ls-addbtn" type="button" data-ls="newl"><i class="ti ti-plus"></i>${esc(t('ins_new_layout'))}</button>`;
  renderLayoutEditor();
}
function renderLayoutEditor() {
  const lay = leLayout(), card = $('leCard'); card.hidden = !lay; if (!lay) return;
  $('leTitle').textContent = t('ins_editing', { x:LE.edit });
  $('lsWidgets').innerHTML = lay.map(cfg => {
    const by = IW_BYS[cfg.kind], mets = IW_METRICS[cfg.kind], bs = ['heat', 'cal'].includes(cfg.kind) ? ['events', 'done', 'added'] : ['done', 'added', 'lib'], sel = (arr, cur, lab) => arr.map(k => `<option value="${k}" ${String(cur) === String(k) ? 'selected' : ''}>${esc(t(lab + k))}</option>`).join('');
    const size = (IW_SPANS.find(s => s[0] === iwSpan(cfg)) || IW_SPANS[1])[1];
    return lsItem('wid', cfg.id, lsIc(IW_ICON[cfg.kind]), iwTitle(cfg), [t(size), cfg.basis && !['heat', 'cal'].includes(cfg.kind) ? t('ibs_' + cfg.basis) : ''].filter(Boolean).join(' · '),
      `<label class="fld"><span>${esc(t('ins_w_kind'))}</span><select data-f="kind">${sel(Object.keys(IW_ICON), cfg.kind, 'iwk_')}</select></label>
       ${by ? `<label class="fld"><span>${esc(t('ins_w_by'))}</span><select data-f="by">${sel(by, cfg.by, 'ib_')}</select></label>` : ''}
       ${mets ? `<label class="fld"><span>${esc(t('ins_w_metric'))}</span><select data-f="metric">${sel(mets, cfg.metric || 'items', 'im_')}</select></label>` : ''}
       <label class="fld"><span>${esc(t('ins_w_basis'))}</span><select data-f="basis">${sel(bs, cfg.basis || 'done', 'ibs_')}</select></label>
       ${['list', 'bars'].includes(cfg.kind) ? `<label class="fld"><span>${esc(t('iw_top'))}</span><input type="number" data-f="top" min="3" max="30" value="${cfg.top || 8}"></label>` : ''}
       <label class="fld"><span>${esc(t('iw_title'))}</span><input type="text" data-f="title" maxlength="60" value="${esc(cfg.title || '')}" placeholder="${esc(iwTitle({ ...cfg, title:'' }))}"></label>
       <div class="fld"><span>${esc(t('iw_width'))}</span>${lsSeg('w', IW_SPANS.map(([n, l]) => [String(n), t(l)]), String(iwSpan(cfg)))}</div>
       <div class="fld"><span>${esc(t('iw_types'))}</span><div class="chips">${Object.keys(TYPES).map(k => `<button type="button" class="chip" data-ty="${k}" aria-pressed="${(cfg.types || []).includes(k)}">${esc(L().types[k] || k)}</button>`).join('')}</div></div>
       <div class="ls-acts"><button class="btn sm" type="button" data-ls="wdup"><i class="ti ti-copy"></i>${esc(t('lib_duplicate'))}</button><button class="btn sm danger" type="button" data-ls="wdel"><i class="ti ti-trash"></i>${esc(t('del'))}</button></div>`);
  }).join('') || `<div class="pop-empty">${esc(t('ins_no_widgets'))}</div>`;
  $('lePace').value = PACE();
  renderLayoutMap(lay);
}
/* The map: the layout drawn as tiles, to arrange by hand. It shows structure (order, widths), not data, so it is instant and never
   looks like a second copy of the page; "Preview" draws the real thing. */
const LE_H = { tile:58, pie:104, bars:104, heat:70, cal:84, cloud:86, radar:104, list:92, kinds:66 };
function renderLayoutMap(lay) {
  $('lePrev').innerHTML = lay.map(cfg => {
    const n = iwSpan(cfg), sel = LS.open.wid === cfg.id;
    return `<div class="le-tile ${sel ? 'sel' : ''}" data-id="${esc(cfg.id)}" style="grid-column:span ${n};--h:${LE_H[cfg.kind] || 80}px">
      <div class="le-tt">${gripHtml()}<i class="ti ti-${IW_ICON[cfg.kind]}"></i><b>${esc(iwTitle(cfg))}</b></div><i class="le-shape k-${cfg.kind}" aria-hidden="true"></i>
      <div class="le-tools"><button type="button" class="ibtn sm" data-le="narrow" ${n <= 2 ? 'disabled' : ''} aria-label="${esc(t('le_narrower'))}"><i class="ti ti-minus"></i></button><span>${esc(t((IW_SPANS.find(s => s[0] === n) || IW_SPANS[1])[1]))}</span><button type="button" class="ibtn sm" data-le="wider" ${n >= 6 ? 'disabled' : ''} aria-label="${esc(t('le_wider'))}"><i class="ti ti-plus"></i></button></div></div>`;
  }).join('');
}
sortList($('lePrev'), { row:'.le-tile', grip:'.grip', grid:true, done:ids => leReorder(ids) });
$('lePrev').addEventListener('click', e => {
  const tile = e.target.closest('.le-tile'); if (!tile) return; const id = tile.dataset.id, step = e.target.closest('[data-le]');
  if (step) return leMut(id, cfg => { const spans = IW_SPANS.map(s => s[0]), i = spans.indexOf(iwSpan(cfg)); cfg.w = spans[Math.max(0, Math.min(spans.length - 1, i + (step.dataset.le === 'wider' ? 1 : -1)))]; delete cfg.wide; });
  if (e.target.closest('.grip')) return; LS.open.wid = LS.open.wid === id ? '' : id; renderLayoutEditor();
  const row = document.querySelector(`#lsWidgets .ls-item[data-id="${CSS.escape(id)}"]`); if (row && LS.open.wid === id) row.scrollIntoView({ block:'nearest', behavior:'smooth' });
});
function leReorder(ids) { const lay = leLayout(); if (!lay) return; const by = new Map(lay.map(w => [w.id, w])); lay.splice(0, lay.length, ...ids.map(i => by.get(i)).filter(Boolean)); saveInsl(); renderLayoutEditor(); }
function leMut(id, fn) { const lay = leLayout(), i = lay ? lay.findIndex(w => w.id === id) : -1; if (i < 0) return; fn(lay[i], lay); saveInsl(); renderLayoutEditor(); }

/* layouts */
sortList($('lsLayouts'), { row:'.ls-item', grip:'.grip', done:ids => { const o = {}; ids.filter(n => n !== '__default' && INSL.presets[n]).forEach(n => { o[n] = INSL.presets[n]; }); INSL.presets = o; saveInsl(); renderLayouts(); } });
$('lsLayouts').addEventListener('click', async e => {
  const b = e.target.closest('[data-ls]'); if (!b) return; const a = b.dataset.ls, id = idOf(e), n = id === '__default' ? '' : id;
  if (a === 'toggle') { lsToggle('lay', id); return renderLayouts(); }
  if (a === 'use') INSL.active = n;
  else if (a === 'ledit') { LE.edit = n || leCopy(DEFAULT_LAYOUT, t('ins_mine')); LS.open.lay = LE.edit; saveInsl(); renderLayouts(); return $('leCard').scrollIntoView({ block:'start', behavior:'smooth' }); }
  else if (a === 'newl') { LE.edit = leCopy(DEFAULT_LAYOUT, t('ins_mine')); LS.open.lay = LE.edit; saveInsl(); renderLayouts(); return $('leCard').scrollIntoView({ block:'start', behavior:'smooth' }); }
  else if (a === 'dupl') LS.open.lay = leCopy(n ? INSL.presets[n] : DEFAULT_LAYOUT, n ? n + ' ' + t('lib_copy') : t('ins_mine'));
  else if (a === 'dell') { if (!(await ask(t('ins_del_confirm', { x:n })))) return; delete INSL.presets[n]; if (INSL.active === n) INSL.active = ''; if (LE.edit === n) LE.edit = null; LS.open.lay = ''; }
  saveInsl(); renderLayouts();
});
$('lsLayouts').addEventListener('change', e => {
  const old = idOf(e), nn = e.target.value.trim(); if (e.target.dataset.f !== 'name' || !nn || nn === old || INSL.presets[nn]) return;
  const o = {}; Object.keys(INSL.presets).forEach(k => { o[k === old ? nn : k] = INSL.presets[k]; }); INSL.presets = o; if (INSL.active === old) INSL.active = nn; if (LE.edit === old) LE.edit = nn; LS.open.lay = nn; saveInsl(); renderLayouts();
});
/* widgets of the layout being edited */
sortList($('lsWidgets'), { row:'.ls-item', grip:'.grip', done:ids => leReorder(ids) });
$('lsWidgets').addEventListener('click', e => {
  const b = e.target.closest('[data-ls],[data-ty],[data-seg] button'); if (!b) return; const id = idOf(e);
  if (b.dataset.ls === 'toggle') { lsToggle('wid', id); return renderLayoutEditor(); }
  if (b.dataset.ty) return leMut(id, cfg => { const s = new Set(cfg.types || []); s.has(b.dataset.ty) ? s.delete(b.dataset.ty) : s.add(b.dataset.ty); if (s.size) cfg.types = [...s]; else delete cfg.types; });
  if (b.closest('[data-seg]')) return leMut(id, cfg => { cfg.w = Number(b.dataset.v); delete cfg.wide; });
  if (b.dataset.ls === 'wdel') return leMut(id, (cfg, lay) => { lay.splice(lay.indexOf(cfg), 1); LS.open.wid = ''; });
  if (b.dataset.ls === 'wdup') return leMut(id, (cfg, lay) => { const c = JSON.parse(JSON.stringify(cfg)); c.id = wid(); lay.splice(lay.indexOf(cfg) + 1, 0, c); LS.open.wid = c.id; });
});
$('lsWidgets').addEventListener('change', e => {
  const f = e.target.dataset.f, id = idOf(e); if (!f || !id) return;
  leMut(id, cfg => { const v = e.target.value;
    if (f === 'kind') { const d = iwDefaults(v); Object.keys(cfg).forEach(k => { if (!['id', 'title', 'types', 'w'].includes(k)) delete cfg[k]; }); Object.assign(cfg, { kind:v, basis:d.basis }); if (d.by) cfg.by = d.by; if (d.metric) cfg.metric = d.metric; }
    else if (f === 'top') cfg.top = Math.max(3, Math.min(30, Number(v) || 8)); else if (f === 'title') { if (v.trim()) cfg.title = v.trim(); else delete cfg.title; } else cfg[f] = v; });
});
$('leAdd').onclick = e => openMenu(e.currentTarget, Object.keys(IW_ICON).map(k => [k, t('iwk_' + k), IW_ICON[k]])).then(k => { const lay = leLayout(); if (!k || !lay) return; const c = iwDefaults(k); lay.push(c); LS.open.wid = c.id; saveInsl(); renderLayoutEditor(); });
$('lePace').onchange = e => { store.set('vmm.pace', String(Math.max(5, Number(e.target.value) || 40))); renderLayoutEditor(); };
/* phones have no room beside the list, so the preview opens full screen on request */
$('lePreviewBtn').onclick = () => { const lay = leLayout(); if (!lay) return; const data = insData(); 
  const html = lay.map(cfg => widgetHtml(cfg, data, false, true)).join('');
  uiDialog(`<div class="le-prev-h"><b>${esc(t('ins_preview'))}</b><small>${esc(t('ins_preview_note'))}</small><button type="button" class="ibtn" data-no aria-label="${esc(t('sh_close'))}"><i class="ti ti-x"></i></button></div><div class="iw-board">${html}</div>`, (d, done) => { d.classList.add('prev'); d.querySelector('[data-no]').onclick = () => done(null); }); };
