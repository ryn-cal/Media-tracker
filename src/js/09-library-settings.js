/* =====================================================================
   Settings → Library & insights: the one place that decides how the library is organised.
   Views · Properties · Types (the templates that say which fields a kind of work has) · Tags · Insight layouts.
   Every list drags to reorder; tapping a row opens its editor; every change saves at once, so there is no Save button.
   ===================================================================== */
const LS = { open:{}, sel:new Set() };                       // LS.open[card] = the row that is expanded
const lsToggle = (card, id) => { LS.open[card] = LS.open[card] === id ? '' : id; };
function lsItem(card, id, icon, title, sum, body) {
  const open = LS.open[card] === id;
  return `<div class="ls-item ${open ? 'open' : ''}" data-id="${esc(id)}"><div class="ls-head">${gripHtml()}<button type="button" class="ls-main" data-ls="toggle" aria-expanded="${open}">${icon}<span class="ls-t"><b>${esc(title)}</b>${sum ? `<small>${esc(sum)}</small>` : ''}</span><i class="ti ti-chevron-${open ? 'up' : 'down'}"></i></button></div>${open ? `<div class="ls-body">${body}</div>` : ''}</div>`;
}
const lsIc = n => `<i class="ti ti-${n} ls-ic"></i>`;
const lsSeg = (f, items, cur) => `<div class="seg" data-seg="${f}">${items.map(([v, l]) => `<button type="button" data-v="${esc(v)}" aria-pressed="${cur === v}">${esc(l)}</button>`).join('')}</div>`;
const lsAdd = (id, ph, extra, label) => `<div class="ls-new"><input type="text" id="${id}" placeholder="${esc(ph)}" aria-label="${esc(ph)}" maxlength="40" autocomplete="off">${extra || ''}<button class="btn sm" type="button" data-ls="add"><i class="ti ti-plus"></i>${esc(label)}</button></div>`;

/* ---------- views ---------- */
function renderViews() {
  ensureViews();
  $('lsViews').innerHTML = LIB.views.map(v => lsItem('view', v.id, lsIc(LAYOUTS.find(l => l[0] === v.layout)[1]), v.name, t('lib_view_sum', { f:rulesOf(v).length, s:(v.sorts || []).length, p:v.vis.length }),
    `<label class="fld"><span>${esc(t('lib_view_name'))}</span><input type="text" data-f="name" value="${esc(v.name)}" maxlength="30"></label>
     <div class="fld"><span>${esc(t('lib_layout'))}</span>${lsSeg('layout', LAYOUTS.map(([k, , lab]) => [k, t(lab)]), v.layout)}</div>
     <div class="ls-acts"><button class="btn sm" type="button" data-ls="use"><i class="ti ti-external-link"></i>${esc(t('lib_open_view'))}</button><button class="btn sm" type="button" data-ls="dup"><i class="ti ti-copy"></i>${esc(t('lib_duplicate'))}</button><button class="btn sm danger" type="button" data-ls="del" ${LIB.views.length < 2 ? 'disabled' : ''}><i class="ti ti-trash"></i>${esc(t('lib_delete_view'))}</button></div>`)).join('')
    + `<button class="btn sm ls-addbtn" type="button" data-ls="newview"><i class="ti ti-plus"></i>${esc(t('lib_new_view'))}</button>`;
}
/* ---------- properties ---------- */
function renderProps() {
  const kinds = new Set(media.map(m => m.type)), gone = BUILTIN.filter(b => PDEF.deleted.includes(b.id));
  $('lsProps').innerHTML = allProps().map(p => lsItem('prop', p.id, lsIc(PROP_ICON[p.type]), propLabel(p, kinds), t('pt_' + p.type),
    `<label class="fld"><span>${esc(t('lib_prop_name'))}</span><input type="text" data-f="name" value="${esc(p.name)}" maxlength="40" ${p.core ? 'disabled' : ''}></label>${p.sch ? `<p class="hint">${esc(t('lib_sch_note'))}</p>` : ''}
     <div class="ls-acts">${p.type === 'select' || p.type === 'multi' ? `<button class="btn sm" type="button" data-ls="opts"><i class="ti ti-list"></i>${esc(t('lib_edit_options'))}</button>` : ''}${p.core ? `<small class="hint">${esc(t('lib_core_prop'))}</small>` : `<button class="btn sm danger" type="button" data-ls="delp"><i class="ti ti-trash"></i>${esc(t('lib_delete_prop'))}</button>`}</div>`)).join('')
    + (LS.addOpen ? `<div class="ls-new" id="lsNewForm"><input type="text" id="lsNewName" placeholder="${esc(t('lib_prop_name'))}" aria-label="${esc(t('lib_prop_name'))}" maxlength="40" autocomplete="off"><select id="lsNewType" aria-label="${esc(t('lib_prop_type'))}">${PROP_TYPES.map(ty => `<option value="${ty}">${esc(t('pt_' + ty))}</option>`).join('')}</select><button class="btn sm primary" type="button" data-ls="add"><i class="ti ti-check"></i>${esc(t('lib_create_prop'))}</button><button class="btn sm" type="button" data-ls="addcancel">${esc(t('cancel'))}</button></div>`
      : `<button class="btn sm ls-addbtn" type="button" data-ls="addopen"><i class="ti ti-plus"></i>${esc(t('lib_new_prop'))}</button>`)
    + (gone.length ? `<div class="ls-gone"><span>${esc(t('lib_deleted_props'))}</span>${gone.map(b => `<button class="chip" type="button" data-ls="restore" data-pid="${b.id}"><i class="ti ti-restore"></i>${esc(t(BUILTIN_LABEL[b.id] || 'tc_' + b.id))}</button>`).join('')}</div>` : '');
}
/* ---------- types: the template of a kind of work ---------- */
function renderTypes() {
  $('lsTypes').innerHTML = typeDrafts().map(d => lsItem('type', d.id, `<span class="ls-dot" style="background:${esc(d.color)}"><i class="ti ti-${esc(d.icon)}"></i></span>`, d.name, Object.values(d.fields).filter(Boolean).join(' · ') || t('tm_no_fields'),
    `<label class="fld"><span>${esc(t('tm_name'))}</span><input type="text" data-f="name" value="${esc(d.name)}" maxlength="24"></label>
     <div class="ic-opt"><label>${esc(t('ap_color'))}</label><input type="color" data-f="color" value="${esc(d.color)}"></div>
     <div class="ic-opt"><label>${esc(t('tm_icon'))}</label><div class="ic-grid">${TYPE_ICONS.map(ic => `<button type="button" data-ic="${ic}" aria-pressed="${d.icon === ic}" aria-label="${ic}"><i class="ti ti-${ic}"></i></button>`).join('')}</div></div>
     <div class="ic-opt"><label>${esc(t('tm_unit'))}</label>${lsSeg('unit', ['time', 'pages', 'count'].map(u => [u, t('tm_u_' + u)]), d.unit)}</div>
     <div class="ic-opt"><label>${esc(t('tm_fields'))}</label><div class="tm-f-list">${FIELD_KEYS.map(k => `<label class="tm-f"><input type="checkbox" data-fk="${k}" ${d.fields[k] ? 'checked' : ''}><input type="text" data-fl="${k}" value="${esc(d.fields[k] || t('tc_' + k))}" ${d.fields[k] ? '' : 'disabled'} maxlength="28"></label>`).join('')}</div></div>
     <div class="ls-acts">${d.builtin ? `<button class="btn sm" type="button" data-ls="reset"><i class="ti ti-restore"></i>${esc(t('tm_reset'))}</button>` : `<button class="btn sm danger" type="button" data-ls="delt"><i class="ti ti-trash"></i>${esc(t('del'))}</button>`}</div>`)).join('')
    + `<div class="ls-gone"><span>${esc(t('tm_new'))}</span>${TYPE_PRESETS.map(p => `<button type="button" class="chip" data-ls="preset" data-key="${p.key}"><i class="ti ti-${p.icon}"></i>${esc(p[prefs.lang])}</button>`).join('')}<button type="button" class="chip" data-ls="preset" data-key="blank"><i class="ti ti-plus"></i>${esc(t('tm_blank'))}</button></div>`;
}
/* ---------- tags ---------- */
function renderTags() {
  const rows = allTags();
  $('lsTags').innerHTML = `<div class="tm-tagbar"><span>${esc(t('sel_n', { n:LS.sel.size }))}</span><button class="btn sm" type="button" data-ls="merge" ${LS.sel.size > 1 ? '' : 'disabled'}><i class="ti ti-arrows-join"></i>${esc(t('tm_merge'))}</button><button class="btn sm danger" type="button" data-ls="deltag" ${LS.sel.size ? '' : 'disabled'}><i class="ti ti-trash"></i>${esc(t('del'))}</button></div>
    <div class="ls-tags">${rows.length ? rows.map(([g, n]) => `<div class="ls-tag" data-g="${esc(g)}"><input type="checkbox" data-ls="seltag" ${LS.sel.has(g) ? 'checked' : ''} aria-label="${esc(gname(g))}"><span class="mtag" style="${hv(g)}">${esc(gname(g))}</span><em>${n}</em><input type="color" class="tagcol" value="${tagHex(g)}" data-ls="col" aria-label="${esc(t('tm_tag_color'))}">${tagSL(g) ? `<button class="ibtn sm" type="button" data-ls="colreset" aria-label="${esc(t('ap_reset'))}"><i class="ti ti-restore"></i></button>` : ''}<button class="ibtn sm" type="button" data-ls="rename" aria-label="${esc(t('tm_rename'))}"><i class="ti ti-pencil"></i></button></div>`).join('') : `<div class="ins-empty">${esc(t('ov_none'))}</div>`}</div>`;
}
/* insight layouts: js/11c-insights-editor.js */
function renderLibSettings() { renderViews(); renderProps(); renderTypes(); renderTags(); renderLayouts(); }

/* ---------- behaviour ---------- */
const idOf = e => (e.target.closest('.ls-item') || {}).dataset ? e.target.closest('.ls-item').dataset.id : '';
/* views */
sortList($('lsViews'), { row:'.ls-item', grip:'.grip', done:ids => { LIB.views = ids.map(id => LIB.views.find(v => v.id === id)); saveViews(); renderTracker(); renderViews(); } });
$('lsViews').addEventListener('click', async e => {
  const b = e.target.closest('[data-ls]'), id = idOf(e); if (!b) { const s = e.target.closest('[data-seg] [data-v]'); if (s && id) { const v = LIB.views.find(x => x.id === id); v.layout = s.dataset.v; v.icon = LAYOUTS.find(l => l[0] === v.layout)[1]; saveViews(); renderTracker(); renderViews(); } return; }
  const a = b.dataset.ls, i = LIB.views.findIndex(x => x.id === id);
  if (a === 'toggle') { lsToggle('view', id); return renderViews(); }
  if (a === 'newview') { const v = { id:newViewId(), name:t('lib_untitled'), icon:'table', layout:'table', boardBy:'status', filters:{ mode:'and', rules:[] }, sorts:[{ p:'addedAt', dir:'desc' }], group:'', vis:DEFAULT_VIS.slice(), cover:true }; LIB.views.push(v); LS.open.view = v.id; }
  else if (a === 'use') { LIB.active = id; saveViews(); setTab('tracker'); return; }
  else if (a === 'dup' && i >= 0) { const c = JSON.parse(JSON.stringify(LIB.views[i])); c.id = newViewId(); c.name += ' ' + t('lib_copy'); LIB.views.splice(i + 1, 0, c); LS.open.view = c.id; }
  else if (a === 'del' && i >= 0) { if (LIB.views.length < 2 || !(await ask(t('lib_delete_view_c', { x:LIB.views[i].name })))) return; LIB.views.splice(i, 1); if (LIB.active === id) LIB.active = LIB.views[0].id; LS.open.view = ''; }
  saveViews(); renderTracker(); renderViews();
});
$('lsViews').addEventListener('change', e => { const id = idOf(e), v = LIB.views.find(x => x.id === id); if (v && e.target.dataset.f === 'name' && e.target.value.trim()) { v.name = e.target.value.trim(); saveViews(); renderTracker(); renderViews(); } });
/* properties */
sortList($('lsProps'), { row:'.ls-item', grip:'.grip', done:ids => { PDEF.order = ids; savePdef(); renderTracker(); if (curTab === 'lists') renderListsPage(); renderProps(); } });
$('lsProps').addEventListener('click', async e => {
  const b = e.target.closest('[data-ls]'); if (!b) return; const a = b.dataset.ls, id = idOf(e), p = id && propById(id);
  if (a === 'toggle') { lsToggle('prop', id); return renderProps(); }
  if (a === 'addopen') { LS.addOpen = true; renderProps(); return $('lsNewName').focus(); }       // nothing is made until Create
  if (a === 'addcancel') { LS.addOpen = false; return renderProps(); }
  if (a === 'add') { const name = $('lsNewName').value.trim(); if (!name) return $('lsNewName').focus(); createProp(name, $('lsNewType').value, null); const np = PDEF.custom[PDEF.custom.length - 1]; LS.open.prop = np.id; LS.addOpen = false; renderProps();
    return toast(t('lib_prop_made', { x:name }), false, () => { PDEF.custom = PDEF.custom.filter(x => x.id !== np.id); savePdef(); renderTracker(); LS.open.prop = ''; renderProps(); toast(t('t_undone')); }); }
  if (a === 'restore') { PDEF.deleted = PDEF.deleted.filter(x => x !== b.dataset.pid); savePdef(); renderTracker(); return renderProps(); }
  if (a === 'opts' && p) return openOptionsEditor(p);
  if (a === 'delp' && p) { await deleteProp(p); LS.open.prop = ''; renderProps(); }
});
$('lsProps').addEventListener('change', e => { const p = propById(idOf(e)); if (p && e.target.dataset.f === 'name' && e.target.value.trim()) { renameProp(p, e.target.value.trim()); renderProps(); } });
$('lsProps').addEventListener('keydown', e => { if (e.target.id !== 'lsNewName' && e.target.id !== 'lsNewType') return; if (e.key === 'Enter') { e.preventDefault(); $('lsProps').querySelector('[data-ls="add"]').click(); } else if (e.key === 'Escape') { e.stopPropagation(); LS.addOpen = false; renderProps(); } });
/* types */
sortList($('lsTypes'), { row:'.ls-item', grip:'.grip', done:async ids => { await commitTypes(typeDrafts(), ids); renderTypes(); } });
async function typeEdit(id, fn) { const drafts = typeDrafts(), d = drafts.find(x => x.id === id); if (!d) return; fn(d); await commitTypes(drafts); renderTypes(); }
$('lsTypes').addEventListener('click', async e => {
  const b = e.target.closest('[data-ls]'), id = idOf(e);
  const ic = e.target.closest('[data-ic]'); if (ic) return typeEdit(id, d => { d.icon = ic.dataset.ic; });
  const un = e.target.closest('[data-seg="unit"] [data-v]'); if (un) return typeEdit(id, d => { d.unit = un.dataset.v; });
  if (!b) return; const a = b.dataset.ls;
  if (a === 'toggle') { lsToggle('type', id); return renderTypes(); }
  if (a === 'reset') return typeEdit(id, d => Object.assign(d, typePristine(id)));
  if (a === 'delt') { const n = typeUsage(id); if (n && !(await ask(t('tm_del_confirm', { n })))) return; LS.open.type = ''; const drafts = typeDrafts().filter(x => x.id !== id); await commitTypes(drafts); return renderTypes(); }
  if (a === 'preset') { const p = TYPE_PRESETS.find(x => x.key === b.dataset.key), base = p ? p.base : 'other', d = { id:'t_' + Date.now().toString(36), name:p ? p[prefs.lang] : t('tm_blank'), icon:p ? p.icon : 'category-2', color:p ? p.color : '#64748b', unit:p ? p.unit : 'time', fields:{ ...PRISTINE.fs[prefs.lang][base] } }; const drafts = typeDrafts(); drafts.push(d); LS.open.type = d.id; await commitTypes(drafts); renderTypes(); }
});
$('lsTypes').addEventListener('change', e => {
  const id = idOf(e), f = e.target.dataset.f, fk = e.target.dataset.fk, fl = e.target.dataset.fl;
  if (f === 'name' && !e.target.value.trim()) return toast(t('tm_need_name'), true);
  if (f) typeEdit(id, d => { d[f] = e.target.value.trim ? e.target.value.trim() : e.target.value; });
  else if (fk) typeEdit(id, d => { if (e.target.checked) d.fields[fk] = d.fields[fk] || t('tc_' + fk); else delete d.fields[fk]; });
  else if (fl) typeEdit(id, d => { d.fields[fl] = e.target.value; });
});
/* tags */
$('lsTags').addEventListener('click', async e => {
  const b = e.target.closest('[data-ls]'); if (!b) return; const a = b.dataset.ls, row = b.closest('.ls-tag'), g = row && row.dataset.g;
  if (a === 'colreset') { delete TAGHUE[g]; saveTagHue(); renderAll(); return renderTags(); }
  if (a === 'seltag') { b.checked ? LS.sel.add(g) : LS.sel.delete(g); return renderTags(); }
  if (a === 'rename') { const n = ((await askText(t('tm_rename_prompt'), gname(g))) || '').trim(); if (!n || n === gname(g)) return; await retag({ [g]:n }); toast(t('t_saved')); return renderTags(); }
  if (a === 'merge') { const keys = [...LS.sel], n = ((await askText(t('tm_merge_prompt'), gname(keys[0]))) || '').trim(); if (!n) return; LS.sel.clear(); await retag(Object.fromEntries(keys.map(x => [x, n]))); toast(t('t_saved')); return renderTags(); }
  if (a === 'deltag') { const keys = [...LS.sel]; if (!(await ask(t('tm_tag_del', { n:keys.length })))) return; LS.sel.clear(); await retag(Object.fromEntries(keys.map(x => [x, null]))); toast(t('t_deleted', { n:keys.length })); renderTags(); }
});
$('lsTags').addEventListener('input', e => { if (e.target.dataset.ls !== 'col') return; const row = e.target.closest('.ls-tag'), v = hexToHsl(e.target.value); TAGHUE[row.dataset.g] = v; row.querySelector('.mtag').setAttribute('style', hv(row.dataset.g)); });
$('lsTags').addEventListener('change', e => { if (e.target.dataset.ls === 'col') { saveTagHue(); renderAll(); renderTags(); } });
