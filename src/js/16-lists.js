/* =====================================================================
   Lists page: curate, find, edit and share your own collections.
   Lists are created and managed here and nowhere else.
   ===================================================================== */
const LP = { sort:store.get('vmm.lsort', 'custom'), id:'', q:'', dq:'', view:store.get('vmm.lview', 'covers'), dview:store.get('vmm.ldview', 'posters'), dsort:'custom', drev:false };
const smartFav = () => ({ id:'fav', name:t('l_fav'), desc:t('l_fav_d'), color:'#ff4d79', smart:true });
/* Auto lists: made from what you have filled in (kind, status, rating, decade, tag, creator, language). Read-only; "Save as list" turns one into your own. */
const AUTO_GROUPS = ['type', 'status', 'top', 'old', 'decade', 'tag', 'creator', 'lang'];
let AUTO_ON = (() => { try { return new Set(JSON.parse(store.get('vmm.lauto', '[]'))); } catch (e) { return new Set(); } })();
function autoLists(all) {
  const out = [], add = (id, name, desc, color, pred, min, grp) => { if ((all || AUTO_ON.has(grp)) && media.filter(pred).length >= (min || 2)) out.push({ id:'auto:' + id, name, desc, color, smart:true, auto:true, pred, grp }); };
  Object.keys(TYPES).forEach(k => add('type:' + k, L().types[k], t('al_type'), TYPES[k].c, m => m.type === k, 2, 'type'));
  [['doing', '#e08a00'], ['done', '#22a559'], ['want', '#3b82f6'], ['dropped', '#6b7280']].forEach(([k, c]) => add('st:' + k, L().status[k], t('al_status'), c, m => m.status === k, 2, 'status'));
  add('top', t('al_top'), t('al_top_d'), '#e2a400', m => (m.rating || 0) >= 4.5, 2, 'top');
  add('old', t('al_old'), t('al_old_d'), '#8b5cf6', m => m.status === 'want' && m.addedAt && Date.now() - m.addedAt > 365 * 864e5, 2, 'old');
  const tally = pick => { const c = new Map(); media.forEach(m => pick(m).forEach(k => k && c.set(k, (c.get(k) || 0) + 1))); return [...c].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]); };
  tally(m => m.year ? [Math.floor(m.year / 10) * 10] : []).slice(0, 4).forEach(([d]) => add('dec:' + d, t('al_decade', { d }), t('al_decade_d'), '#0f9d8f', m => m.year && Math.floor(m.year / 10) * 10 === d, 3, 'decade'));
  tally(m => m.genre || []).slice(0, 4).forEach(([g]) => add('tag:' + g, gname(g), t('al_tag'), tagHex(g), m => (m.genre || []).includes(g), 3, 'tag'));
  tally(m => splitNames(m.creator)).slice(0, 4).forEach(([n]) => add('cr:' + n, n, t('al_creator'), '#ea6a3c', m => splitNames(m.creator).includes(n), 3, 'creator'));
  tally(m => [(m.language || '').trim()]).slice(0, 3).forEach(([n]) => add('lg:' + n, n, t('al_lang'), '#3b82f6', m => (m.language || '').trim() === n, 3, 'lang'));
  return out;
}
const listOf = id => id === 'fav' ? smartFav() : String(id).startsWith('auto:') ? autoLists(true).find(l => l.id === id) : listById(id);
const listItems = id => id === 'fav' ? media.filter(m => m.fav) : String(id).startsWith('auto:') ? media.filter((autoLists(true).find(l => l.id === id) || { pred:() => false }).pred) : media.filter(m => (m.lists || []).includes(id));
/* a list's cover: the collage of its first items (auto), one item's poster, or a picture you chose */
const itemBg = m => { const cover = safeUrl(m.cover), h = hue(m.title); return cover ? `url('${esc(cover)}')` : `linear-gradient(150deg,hsl(${h} 55% 52%),hsl(${(h + 40) % 360} 50% 34%))`; };
function mosaic(items, l) {
  if (!showOn('cover')) return '<div class="lmos blank"></div>';
  const c = l && l.cover;
  if (c && c.mode === 'image' && c.img) return `<div class="lmos one" style="background-image:url('${esc(c.img)}')"></div>`;
  if (c && c.mode === 'item') { const m = media.find(x => x.id === c.id); if (m) return `<div class="lmos one" style="background-image:${itemBg(m)}">${safeUrl(m.cover) ? '' : `<span class="letter">${esc([...m.title][0].toUpperCase())}</span>`}</div>`; }
  const four = items.slice(0, 4);
  return `<div class="lmos">${[0, 1, 2, 3].map(i => { const m = four[i]; if (!m) return '<div></div>'; const cover = safeUrl(m.cover), h = hue(m.title); return `<div style="background-image:${cover ? `url('${esc(cover)}')` : `linear-gradient(150deg,hsl(${h} 55% 52%),hsl(${(h + 40) % 360} 50% 34%))`}">${cover ? '' : esc([...m.title][0].toUpperCase())}</div>`; }).join('')}</div>`;
}
function listText(id) {
  const l = listOf(id), items = sortedItems(listItems(id));
  return [l.name, l.desc || '', ''].filter((x, i) => x || i === 0).join('\n') + '\n' + items.map((m, i) => `${i + 1}. ${m.title}${m.year ? ' (' + m.year + ')' : ''}${m.creator ? ' — ' + m.creator : ''}`).join('\n');
}
async function copyText(txt) {
  try { await navigator.clipboard.writeText(txt); } catch (e) { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e2) {} ta.remove(); }
  toast(t('lp_copied'));
}
const VIEWS_O = [['covers', 'layout-grid', 'lv_covers'], ['rows', 'list', 'lv_rows'], ['spines', 'books', 'lv_spines']];
const VIEWS_D = [['posters', 'layout-grid', 'lv_posters'], ['rows', 'list', 'lv_rows'], ['table', 'table', 'lv_table'], ['compact', 'list-numbers', 'lv_compact']];
const vseg = (id, views, cur) => `<div class="vseg" id="${id}">${views.map(([k, ic, lab]) => `<button type="button" data-v="${k}" aria-pressed="${cur === k}" title="${esc(t(lab))}"><i class="ti ti-${ic}"></i><span>${esc(t(lab))}</span></button>`).join('')}</div>`;
function listStats(l) { const items = listItems(l.id), done = items.filter(m => m.status === 'done').length; return { items, done, pct:items.length ? Math.round(done / items.length * 100) : 0 }; }
function renderListsPage() {
  const box = $('lpBody'); if (!box) return; $('lpHeadBtns').hidden = !!LP.id;
  const had = document.activeElement && document.activeElement.id, pos = document.activeElement && document.activeElement.selectionStart;
  if (LP.id) renderListDetail(box); else renderListOverview(box);
  markSortable(box);
  if (had === 'lpQ' || had === 'ldQ') { const el = $(had); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) {} } }
}
/* free ordering: drag cards / rows (or use the arrows) when the order is "mine" */
function markSortable(box) {
  let sel = '', grp = '';
  if (LP.id) { if (lpCustom()) { sel = '.mcard,.drow,.dchip'; grp = 'items'; } }
  else if (LP.sort === 'custom' && !LP.q.trim()) { sel = '.lcard[data-lid],.lrow[data-lid],.spine[data-lid]'; grp = 'lists'; }
  if (!sel) return;
  box.querySelectorAll(sel).forEach(el => { const id = el.dataset.id || el.dataset.lid; if (grp === 'lists' && (id === 'fav' || id.startsWith('auto:'))) return; el.draggable = true; el.dataset.sortable = id; el.dataset.grp = grp; });
}
(function dragSort() {
  const box = $('lpBody'); let drag = null;
  const clear = () => box.querySelectorAll('.drop-before,.drop-after').forEach(x => x.classList.remove('drop-before', 'drop-after'));
  box.addEventListener('dragstart', e => { const it = e.target.closest('[data-sortable]'); if (!it) return; drag = it; it.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', it.dataset.sortable); } catch (x) {} });
  box.addEventListener('dragover', e => {
    if (!drag) return; const it = e.target.closest('[data-sortable]'); if (!it || it === drag || it.dataset.grp !== drag.dataset.grp) return; e.preventDefault();
    const r = it.getBoundingClientRect(), rows = it.classList.contains('drow') || it.classList.contains('lrow'), before = rows ? e.clientY < r.top + r.height / 2 : e.clientX < r.left + r.width / 2;
    clear(); it.classList.add(before ? 'drop-before' : 'drop-after');
  });
  box.addEventListener('drop', e => {
    if (!drag) return; const it = e.target.closest('[data-sortable]'); if (!it || it === drag || it.dataset.grp !== drag.dataset.grp) return; e.preventDefault();
    const after = it.classList.contains('drop-after'), grp = drag.dataset.grp, num = grp === 'items';
    const ids = [...box.querySelectorAll(`[data-sortable][data-grp="${grp}"]`)].map(x => num ? Number(x.dataset.sortable) : x.dataset.sortable), dv = num ? Number(drag.dataset.sortable) : drag.dataset.sortable, tv = num ? Number(it.dataset.sortable) : it.dataset.sortable;
    ids.splice(ids.indexOf(dv), 1); ids.splice(ids.indexOf(tv) + (after ? 1 : 0), 0, dv); clear(); drag = null;
    if (num) reorderItems(LP.id, ids); else reorderLists(ids);
  });
  box.addEventListener('dragend', () => { if (drag) drag.classList.remove('dragging'); drag = null; clear(); });
})();
const LS_SORTS = ['custom', 'name', 'size', 'recent'];
function sortLists(arr) {
  const col = collator(), a = arr.slice();
  if (LP.sort === 'name') a.sort((x, y) => col.compare(x.name, y.name)); else if (LP.sort === 'size') a.sort((x, y) => listItems(y.id).length - listItems(x.id).length); else if (LP.sort === 'recent') a.sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0));
  return a;
}
function listBlock(arr, withNew) {
  withNew = false;                      // one "New list": the button in the page head
  const menu = `<button class="lmenu" type="button" data-menu aria-label="${esc(t('lp_more'))}"><i class="ti ti-dots"></i></button>`;
  if (LP.view === 'rows') return `<div class="lrows">${arr.map(l => { const S = listStats(l); return `<div class="lrow" data-lid="${esc(l.id)}" style="--lc:${esc(l.color)}"><i class="ldot"></i><div class="grow"><div class="lname">${esc(l.name)}</div>${l.desc ? `<div class="ldesc one">${esc(l.desc)}</div>` : ''}</div><div class="lcount">${esc(t('lp_items', { n:S.items.length }))}<small>${esc(t('lp_done', { n:S.done }))}</small></div><div class="lbar"><i style="width:${S.pct}%"></i></div>${menu}</div>`; }).join('')}${withNew ? `<button class="lrow new" data-lnew2><i class="ti ti-plus"></i>${esc(t('l_new'))}</button>` : ''}</div>`;
  if (LP.view === 'spines') return `<div class="spines">${arr.map(l => { const S = listStats(l); return `<button class="spine" data-lid="${esc(l.id)}" style="--lc:${esc(l.color)};--sh:${200 + (hue(l.name) % 5) * 14}px" title="${esc(l.name)}"><span class="sp-name">${esc(l.name)}</span><b>${S.items.length}</b></button>`; }).join('')}${withNew ? `<button class="spine new" data-lnew2 title="${esc(t('l_new'))}"><i class="ti ti-plus"></i></button>` : ''}</div>`;
  return `<div class="lgrid">${arr.map(l => { const S = listStats(l); return `<div class="lcard" data-lid="${esc(l.id)}" style="--lc:${esc(l.color)}">${menu}${mosaic(S.items, l)}<div class="lbody"><div class="lname">${esc(l.name)}</div><div class="ldesc">${esc(l.desc || '')}</div><div class="lmeta"><span>${esc(t('lp_items', { n:S.items.length }))}</span><span>${esc(t('lp_done', { n:S.done }))}</span></div></div><div class="lbar"><i style="width:${S.pct}%"></i></div></div>`; }).join('')}${withNew ? `<button class="lcard new" data-lnew2><i class="ti ti-plus"></i>${esc(t('l_new'))}</button>` : ''}</div>`;
}
function renderListOverview(box) {
  const q = LP.q.toLowerCase().trim(), hit = l => !q || (l.name + ' ' + (l.desc || '')).toLowerCase().includes(q) || listItems(l.id).some(m => (m.title + ' ' + (m.alt || '')).toLowerCase().includes(q));
  const mine = sortLists(LISTS).filter(hit), fav = [smartFav()].filter(hit), autos = sortLists(autoLists()).filter(hit);
  const first = fav.concat(LP.sort === 'custom' ? mine : mine);
  box.innerHTML = `<div class="lp-tools"><div class="search"><i class="ti ti-search"></i><input type="text" id="lpQ" value="${esc(LP.q)}" placeholder="${esc(t('lp_search'))}" aria-label="${esc(t('lp_search'))}" autocomplete="off"></div>
      <button class="fbtn" id="lpAuto" data-auto type="button"><i class="ti ti-sparkles"></i>${esc(t('al_head'))}${AUTO_ON.size ? `<span class="badge">${AUTO_ON.size}</span>` : ''}</button><label class="sortsel"><span>${esc(t('sort'))}</span><select id="lpSort">${LS_SORTS.map(k => `<option value="${k}" ${LP.sort === k ? 'selected' : ''}>${esc(t('ls_' + k))}</option>`).join('')}</select></label><span class="grow"></span>${vseg('lpView', VIEWS_O, LP.view)}</div>
    ${first.length || !q ? listBlock(first, !q) : ''}
    ${autos.length ? `<div class="exgroup auto">${esc(t('al_head'))}<small>${esc(t('al_head_s'))}</small></div>${listBlock(autos, false)}` : ''}
    ${!first.length && !autos.length ? `<div class="empty-state"><i class="ti ti-books"></i>${esc(t('lp_nomatch'))}</div>` : ''}`;
}
async function reorderItems(listId, ids) { LISTORDER[listId] = ids; await saveListOrder(); renderListsPage(); }
async function reorderLists(ids) { const known = ids.map(listById).filter(Boolean), rest = LISTS.filter(l => !ids.includes(l.id)); LISTS = known.concat(rest); await saveLists(); renderListsPage(); }
function listCardHtml(m) { return cardHtml(m, true, true); }
function renderListDetail(box) {
  const l = listOf(LP.id); if (!l) { LP.id = ''; return renderListOverview(box); }
  const all = listItems(l.id), done = all.filter(m => m.status === 'done').length, mins = all.reduce((a, m) => a + (m.runtime || 0), 0), q = LP.dq.toLowerCase().trim();
  const lv = listView(l.id), items = runView(lv, all, { listId:l.id, noTemp:true, q }), custom = lpCustom(), nf = rulesOf(lv).length;
  const rm = m => l.smart ? '' : `<button class="ibtn sm" data-lrm title="${esc(t('lp_remove'))}"><i class="ti ti-x"></i></button>`;
  let body; const prevVis = CUR_VIS; CUR_VIS = lv;
  if (!all.length) body = `<div class="empty-state"><i class="ti ti-books"></i>${esc(t('lp_empty'))}</div>`;
  else if (!items.length) body = `<div class="empty-state"><i class="ti ti-search"></i>${esc(t('no_match'))}</div>`;
  else if (LP.dview === 'rows') body = `<div class="drows">${items.map((m, i) => `<div class="drow" data-id="${m.id}">${custom ? `<span class="grip" title="${esc(t('ls_drag'))}"><i class="ti ti-grip-vertical"></i></span>` : ''}${showOn('cover') ? posterHtml(m, false) : ''}<div class="grow"><div class="mtitle">${esc(m.title)}</div>${showOn('sub') ? `<div class="msub">${esc([showOn('type') ? L().types[m.type] : '', m.creator, m.year].filter(Boolean).join(' · '))}</div>` : ''}</div>${showOn('rating') ? starsHtml(m.rating) : ''}${showOn('status') ? statusChip(m.status) : ''}${showOn('fav') ? `<button class="heart-cell ${m.fav ? 'on' : ''}" data-fav aria-label="${esc(t('fav_toggle'))}" aria-pressed="${!!m.fav}">${heartSvg(m.fav)}</button>` : ''}${custom ? `<span class="mv"><button class="ibtn sm" data-mv="-1" ${i ? '' : 'disabled'} title="${esc(t('ls_up'))}"><i class="ti ti-arrow-up"></i></button><button class="ibtn sm" data-mv="1" ${i < items.length - 1 ? '' : 'disabled'} title="${esc(t('ls_down'))}"><i class="ti ti-arrow-down"></i></button></span>` : ''}${rm(m)}</div>`).join('')}</div>`;
  else if (LP.dview === 'table') body = withVis(lv, () => tableHtml(items, lv, { noAdd:true }));
  else if (LP.dview === 'compact') body = `<div class="dchips">${items.map((m, i) => `<button type="button" class="dchip" data-id="${m.id}"><b>${i + 1}</b><span>${esc(m.title)}</span>${m.year ? `<small>${m.year}</small>` : ''}</button>`).join('')}</div>`;
  else body = `<div class="poster-grid">${items.map(m => listCardHtml(m)).join('')}</div>`;
  CUR_VIS = prevVis;
  applyCoverSize(box, lv);
  box.innerHTML = `<div class="ld-head" style="--lc:${esc(l.color)}">
      <button class="linkback" data-ld="back"><i class="ti ti-arrow-left"></i>${esc(t('lp_back'))}</button>
      <div class="ld-title"><i class="ldot"></i><h2>${esc(l.name)}</h2></div>${l.desc ? `<p class="ld-desc">${esc(l.desc)}</p>` : ''}
      <div class="ld-stat">${esc(t('lp_items', { n:all.length }))} · ${esc(t('lp_done', { n:done }))}${mins ? ' · ' + esc(fmtRuntime(mins)) : ''}</div></div>
    <div class="ld-bar">
      <div class="ld-find"><div class="search"><i class="ti ti-search"></i><input type="text" id="ldQ" value="${esc(LP.dq)}" placeholder="${esc(t('lp_find_in'))}" autocomplete="off"></div>
        <button class="fbtn ${nf ? 'on' : ''}" data-lf="filter" type="button" title="${esc(t('lib_filter'))}" aria-label="${esc(t('lib_filter'))}"><i class="ti ti-filter"></i>${nf ? `<span class="badge">${nf}</span>` : ''}</button><button class="fbtn ${lv.sorts.length ? 'on' : ''}" data-lf="sort" type="button" title="${esc(t('lib_sort'))}" aria-label="${esc(t('lib_sort'))}"><i class="ti ti-arrows-sort"></i></button><button class="fbtn" data-lf="props" type="button" title="${esc(t('lib_properties'))}" aria-label="${esc(t('lib_properties'))}"><i class="ti ti-columns"></i></button>
        <button class="btn sm" data-ld="draw" ${all.length ? '' : 'disabled'}><i class="ti ti-dice-5"></i>${esc(t('lp_pick'))}</button></div>
      ${vseg('ldView', VIEWS_D, LP.dview)}<span class="grow"></span>
      <div class="ld-manage">${l.auto ? `<button class="btn sm" data-ld="save"><i class="ti ti-bookmark-plus"></i>${esc(t('al_save'))}</button>` : ''}${l.smart ? '' : `<button class="btn sm" data-ld="add"><i class="ti ti-plus"></i>${esc(t('lp_add'))}</button><button class="btn sm" data-ld="edit"><i class="ti ti-pencil"></i>${esc(t('lp_edit'))}</button>`}<button class="btn sm primary" data-ld="share" ${all.length ? '' : 'disabled'}><i class="ti ti-share-3"></i>${esc(t('lp_share'))}</button></div>
    </div>${body}`;
}
function drawFromList(id) {
  PK.autoIds = null; PK.fav = false;
  if (id.startsWith('auto:')) { PK.autoIds = new Set(listItems(id).map(m => m.id)); PK.list = ''; PK.src = new Set(['any']); } else if (id === 'fav') { PK.src = new Set(['want', 'doing', 'revisit', 'second']); PK.fav = true; PK.list = ''; } else { PK.list = id; PK.src = new Set(['want']); }
  PK.drawn = false; setTab('home'); renderPickControls(); setTimeout(() => $('hsPick').scrollIntoView({ behavior:'smooth' }), 120);
}
async function saveAutoAsList(id) {
  const a = listOf(id); if (!a) return; const ids = listItems(id).map(m => m.id), l = { id:newId(), name:a.name, desc:a.desc, color:HEX_RE.test(a.color) ? a.color : LIST_COLORS[LISTS.length % LIST_COLORS.length], createdAt:Date.now() };
  LISTS.push(l); await saveLists(); await addToList(ids, l.id, true); LP.id = l.id; renderListsPage(); toast(t('t_saved'));
}
async function moveList(id, dir) { const i = LISTS.findIndex(l => l.id === id), j = i + dir; if (i < 0 || j < 0 || j >= LISTS.length) return; [LISTS[i], LISTS[j]] = [LISTS[j], LISTS[i]]; await saveLists(); renderListsPage(); }
function listAction(id, a) {
  if (a === 'save') saveAutoAsList(id); else if (a === 'up') moveList(id, -1); else if (a === 'down') moveList(id, 1); else if (a === 'edit') openListDialog(id, () => renderListsPage()); else if (a === 'share') openShare('list', id); else if (a === 'draw') drawFromList(id);
}
$('lpBody').addEventListener('click', async e => {
  const mb = e.target.closest('[data-menu]');
  if (mb) { e.stopPropagation(); const lid = mb.closest('[data-lid]').dataset.lid, smart = lid === 'fav'; const auto = lid.startsWith('auto:'), reorder = !smart && !auto && LP.sort === 'custom' && !LP.q; const k = await openMenu(mb, [['draw', t('lp_menu_pick'), 'dice-5'], ['share', t('lp_menu_share'), 'share-3'], ...(auto ? [['save', t('al_save'), 'bookmark-plus']] : []), ...(smart || auto ? [] : [['-'], ['edit', t('lp_menu_edit'), 'pencil']]), ...(reorder ? [['-'], ['up', t('ls_up'), 'arrow-up'], ['down', t('ls_down'), 'arrow-down']] : [])]); return listAction(lid, k); }
  const lf = e.target.closest('[data-lf]'); if (lf) { const h = listHost(LP.id); return lf.dataset.lf === 'filter' ? openFilterPop(lf, h) : lf.dataset.lf === 'sort' ? openSortPop(lf, h) : openPropsPop(lf, h); }
  const aut = e.target.closest('[data-auto]'); if (aut) return openChecks(aut, t('al_head'), AUTO_GROUPS.map(k => [k, t('ag_' + k), AUTO_ON.has(k)]), (k, on) => { on ? AUTO_ON.add(k) : AUTO_ON.delete(k); store.set('vmm.lauto', JSON.stringify([...AUTO_ON])); renderListsPage(); });
  if (e.target.closest('[data-lnew2]')) return openListDialog(null, l => { LP.id = l.id; LP.dq = ''; renderListsPage(); });
  const vb = e.target.closest('#lpView [data-v]'); if (vb) { LP.view = vb.dataset.v; store.set('vmm.lview', LP.view); return renderListsPage(); }
  const dv = e.target.closest('#ldView [data-v]'); if (dv) { LP.dview = dv.dataset.v; store.set('vmm.ldview', LP.dview); return renderListsPage(); }
  const mv = e.target.closest('[data-mv]'); if (mv) { e.stopPropagation(); const id = Number(mv.closest('[data-id]').dataset.id), ids = runView(listView(LP.id), listItems(LP.id), { listId:LP.id, noTemp:true, q:'' }).map(m => m.id), i = ids.indexOf(id), j = i + Number(mv.dataset.mv); if (i >= 0 && j >= 0 && j < ids.length) { ids.splice(j, 0, ids.splice(i, 1)[0]); reorderItems(LP.id, ids); } return; }
  const ld = e.target.closest('[data-ld]');
  if (ld) { const a = ld.dataset.ld; if (a === 'back') { LP.id = ''; LP.dq = ''; renderListsPage(); } else if (a === 'add') openAddItems(LP.id); else listAction(LP.id, a); return; }
  const fv = e.target.closest('[data-fav]'); if (fv) { e.stopPropagation(); const id = Number(fv.closest('[data-id]').dataset.id); return setFav([id], !(media.find(m => m.id === id) || {}).fav); }
  const rm = e.target.closest('[data-lrm]'); if (rm) { e.stopPropagation(); return addToList([Number(rm.closest('[data-id]').dataset.id)], LP.id, false); }
  if (qaHandler(e)) return;
  const c = e.target.closest('.mcard, .drow, .dchip, tr[data-id]'); if (c) return openMedia(Number(c.dataset.id));
  const lc = e.target.closest('[data-lid]'); if (lc) { LP.id = lc.dataset.lid; LP.dq = ''; renderListsPage(); window.scrollTo({ top:0, behavior:'smooth' }); }
});
$('lpBody').addEventListener('input', e => { if (e.target.id === 'lpQ') { LP.q = e.target.value; renderListsPage(); } else if (e.target.id === 'ldQ') { LP.dq = e.target.value; renderListsPage(); } });
$('lpBody').addEventListener('change', e => { if (e.target.id === 'lpSort') { LP.sort = e.target.value; store.set('vmm.lsort', LP.sort); renderListsPage(); } });
$('lpNew').onclick = () => openListDialog(null, l => { LP.id = l.id; LP.dq = ''; renderListsPage(); });
$('lpMore').onclick = async e => { const k = await openMenu(e.currentTarget, [['import', t('lp_import'), 'file-import']]); if (k === 'import') $('listPick2').click(); };
/* add existing library items to a list */
const adlg = $('adlg'), aSel = new Set(); let aList = '';
function drawAddItems() {
  const q = $('aSearch').value.toLowerCase().trim(), rows = media.filter(m => !(m.lists || []).includes(aList) && (!q || (m.title + ' ' + (m.alt || '') + ' ' + (m.creator || '')).toLowerCase().includes(q))).sort((a, b) => a.title.localeCompare(b.title)).slice(0, 300);
  $('aList').innerHTML = rows.length ? rows.map(m => `<label class="arow">${aSel.has(m.id) ? '<input type="checkbox" checked>' : '<input type="checkbox">'}${posterHtml(m, false)}<span class="nm" data-id="${m.id}">${esc(m.title)} <small>${esc([L().types[m.type], m.year].filter(Boolean).join(' · '))}</small></span></label>`).join('') : `<div class="ins-empty">${esc(t('ad_none'))}</div>`;
  $('aOk').textContent = t('ad_add', { n:aSel.size }); $('aOk').disabled = !aSel.size;
}
function openAddItems(id) { aList = id; aSel.clear(); $('aTitle').textContent = t('ad_title', { x:(listById(id) || {}).name || '' }); $('aSearch').value = ''; drawAddItems(); adlg.showModal(); setTimeout(() => $('aSearch').focus(), 60); }
$('aSearch').oninput = drawAddItems;
$('aList').addEventListener('change', e => { const row = e.target.closest('.arow'); const id = Number(row.querySelector('[data-id]').dataset.id); e.target.checked ? aSel.add(id) : aSel.delete(id); $('aOk').textContent = t('ad_add', { n:aSel.size }); $('aOk').disabled = !aSel.size; });
$('aCancel').onclick = () => adlg.close();
$('aform').addEventListener('submit', async e => { e.preventDefault(); const ids = [...aSel]; adlg.close(); await addToList(ids, aList, true); toast(t('t_listed', { n:ids.length, x:(listById(aList) || {}).name || '' })); });
adlg.addEventListener('click', e => { if (e.target === adlg) adlg.close(); });

