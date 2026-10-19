/* =====================================================================
   The entry card as a page of properties, the way Notion does it: one row per property (name · value).
   The card only shows them. Which rows exist, their order and which are hidden is decided in Settings → Database → Entry card
   (renderEntryArrange below); that order is shared by every item, and hidden rows keep their values.
   ===================================================================== */
const ENTRY_BUILTIN = ['type', 'status', 'rating', 'year', 'runtime', 'pages', 'language', 'progress', 'creator', 'cast', 'writers', 'producers', 'genre', 'lists', 'cover'];
const npHidden = () => PDEF.dhide || (PDEF.dhide = []);
const npOrder = () => { const ids = [...ENTRY_BUILTIN, ...PDEF.custom.map(p => p.id)], saved = (PDEF.dorder || []).filter(id => ids.includes(id)); return [...saved, ...ids.filter(id => !saved.includes(id))]; };
const npField = id => document.querySelector(`#npPool [data-prop="${id}"], #mProps [data-prop="${id}"], #npList [data-prop="${id}"]`);
const FORM_GROUPS = [[null, ['type', 'status', 'rating']], ['ds_info', ['year', 'runtime', 'pages', 'language', 'progress'], true], ['ds_crew', ['creator', 'cast', 'writers', 'producers']], ['ds_more', ['genre', 'lists']]];
function drawEntryProps() {
  const list = $('npList'), pool = $('npPool'), hidden = npHidden(), form = entryMode() === 'form';
  list.querySelectorAll('.fld[data-prop]').forEach(f => (ENTRY_BUILTIN.includes(f.dataset.prop) ? pool : $('mProps')).appendChild(f));      // park the real fields (built-in and custom) before redrawing the rows
  list.innerHTML = ''; list.classList.toggle('as-form', form);
  if (form) {                                                      // the classic grouped form: fixed order, nothing hidden
    const custom = PDEF.custom.map(p => p.id);
    FORM_GROUPS.forEach(([head, ids, grid], gi) => { const box = document.createElement('div'); box.className = grid ? 'fgrid' : 'fstack'; (gi === 3 ? [...ids, ...custom, 'cover'] : ids).forEach(id => { const f = npField(id); if (f) box.appendChild(f); }); if (head) list.insertAdjacentHTML('beforeend', `<div class="dsec"><span>${esc(t(head))}</span></div>`); list.appendChild(box); });
    return;
  }
  npOrder().forEach(id => {
    const f = npField(id); if (!f || hidden.includes(id)) return;
    const row = document.createElement('div'); row.className = 'np-row'; row.dataset.id = id; row.appendChild(f); list.appendChild(row);
  });
  syncEntryRows();
}
const syncEntryRows = () => $$('#npList .np-row').forEach(r => { r.hidden = !!(r.querySelector('.fld') || {}).hidden; });   // kinds that have no such field (a book has no cast) hide the row
{ const _schema = applySchema; applySchema = function () { _schema.apply(this, arguments); syncEntryRows(); }; }
{ const _fill = fillMediaDrawer; fillMediaDrawer = function () { _fill.apply(this, arguments); drawEntryProps(); }; }
$('npArrange').onclick = () => { mdlg.close(); setTab('settings'); openSetSec('entry'); };

/* ---- the template of the entry card: a property page (customisable) or the grouped form ---- */
const entryMode = () => store.get('vmm.entry', 'page') === 'form' ? 'form' : 'page';
const ENTRY_TEMPLATES = [['page', 'en_page', 'en_page_d'], ['form', 'en_form', 'en_form_d']];
function renderEntrySettings() {
  $('entryTpl').innerHTML = ENTRY_TEMPLATES.map(([k, a, b]) => `<button type="button" class="tpl" role="radio" data-tpl="${k}" aria-checked="${entryMode() === k}"><span class="tpl-art ${k}" aria-hidden="true">${k === 'page' ? '<i></i><i></i><i></i><i></i><i></i>' : '<b></b><i></i><i></i><b></b><i></i><i></i>'}</span><b>${esc(t(a))}</b><small>${esc(t(b))}</small></button>`).join('');
  renderEntryArrange();
}
$('entryTpl').addEventListener('click', e => { const b = e.target.closest('[data-tpl]'); if (b) { store.set('vmm.entry', b.dataset.tpl); renderEntrySettings(); } });
/* order and visibility of the rows of the property page: drag, or ↑ ↓ on the grip; the eye hides a row without losing what was typed in it */
function renderEntryArrange() {
  const form = entryMode() === 'form', box = $('lsEntry'), hidden = npHidden(), kinds = new Set(media.map(m => m.type));
  $('enArrangeD').textContent = t(form ? 'en_arrange_form' : 'en_arrange_d');
  box.hidden = form; if (form) { box.innerHTML = ''; return; }
  box.innerHTML = npOrder().map(id => { const p = propById(id), off = hidden.includes(id), label = p ? propLabel(p, kinds) : id;
    return `<div class="en-row ${off ? 'off' : ''}" data-id="${esc(id)}">${gripHtml()}<i class="ti ti-${PROP_ICON[p ? p.type : 'text']} en-ic"></i><span class="en-t">${esc(label)}</span><button type="button" class="ibtn sm" data-np="${off ? 'show' : 'hide'}" aria-label="${esc(t(off ? 'np_show' : 'np_hide'))}"><i class="ti ti-eye${off ? '-off' : ''}"></i></button></div>`; }).join('')
    + `<button type="button" class="btn sm ls-addbtn" data-en="newprop"><i class="ti ti-plus"></i>${esc(t('lib_new_prop'))}</button>`;
}
sortList($('lsEntry'), { row:'.en-row', grip:'.grip', done:ids => { PDEF.dorder = [...ids, ...npOrder().filter(id => !ids.includes(id))]; savePdef(); renderEntryArrange(); } });
$('lsEntry').addEventListener('click', e => {
  const b = e.target.closest('[data-np]'); if (b) { const id = b.closest('.en-row').dataset.id, h = npHidden(); if (b.dataset.np === 'hide') h.push(id); else PDEF.dhide = h.filter(x => x !== id); savePdef(); return renderEntryArrange(); }
  if (e.target.closest('[data-en="newprop"]')) return showDataPart('props');
});
/* the four parts of Settings → Database, together: Properties · Entry card · Types · Tags */
const DATA = { part:store.get('vmm.datapart', 'props') };
function showDataPart(part) { if (part) { DATA.part = part; store.set('vmm.datapart', part); } $$('#dataParts [data-part]').forEach(b => b.setAttribute('aria-selected', b.dataset.part === DATA.part)); $$('.dpart').forEach(x => x.hidden = x.dataset.part !== DATA.part); }
function renderDataSection() { renderEntrySettings(); showDataPart(); }
$('dataParts').addEventListener('click', e => { const b = e.target.closest('[data-part]'); if (b) { showDataPart(b.dataset.part); window.scrollTo(0, 0); } });
