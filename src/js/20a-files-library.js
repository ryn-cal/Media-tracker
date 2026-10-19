/* =====================================================================
   Files library — the same database engine as the Tracker.
   Views you can save, filter rules, several sorts, grouping, properties you show, hide and reorder; table, gallery or list.
   The engine (js/08-library.js) is shared; this file only says what a file's properties are and how a file is drawn.
   ===================================================================== */
const FV_LAYOUTS = [['table', 'table', 'lv_table'], ['gallery', 'layout-grid', 'lv_posters'], ['list', 'list', 'lv_rows']];
const FLIB = { views:jsonStore('vmm.fviews', null), active:store.get('vmm.fview', ''), q:'', temp:[] };
const FS = { selecting:false, sel:new Set(), order:[], collapsed:new Set(), limit:120, sig:'', dirty:false };
const saveFViews = () => { store.set('vmm.fviews', JSON.stringify(FLIB.views)); store.set('vmm.fview', FLIB.active); };
const FV_VIS = ['title', 'open', 'crew', 'kind', 'genre', 'year', 'length', 'size', 'tracked'];     // Open sits beside the title so it is on screen on a phone too
const newFView = (name, layout, vis) => ({ id:'f_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), name, icon:FV_LAYOUTS.find(l => l[0] === layout)[1], layout, filters:{ mode:'and', rules:[] }, sorts:[{ p:'addedAt', dir:'desc' }], group:'', vis:vis || FV_VIS.slice(), cover:true });
function ensureFViews() {
  if (!Array.isArray(FLIB.views) || !FLIB.views.length) { FLIB.views = [{ ...newFView(t('lib_v_all'), 'table'), id:'f_all' }, { ...newFView(t('lv_posters'), 'gallery', ['kind', 'year', 'length', 'pages']), id:'f_cards' }]; FLIB.active = 'f_all'; saveFViews(); }
  if (!FLIB.views.some(v => v.id === FLIB.active)) FLIB.active = FLIB.views[0].id;
  if (!store.get('vmm.fv.trk', '')) { FLIB.views.forEach(v => { if (v.layout === 'table' && !v.vis.includes('tracked')) v.vis.push('tracked'); }); store.set('vmm.fv.trk', '1'); saveFViews(); }   // existing views get the Track column once
  if (!store.get('vmm.fv.open', '')) { FLIB.views.forEach(v => { if (v.layout !== 'gallery' && !v.vis.includes('open')) v.vis.splice(Math.min(1, v.vis.length), 0, 'open'); }); store.set('vmm.fv.open', '1'); saveFViews(); }   // … and the Open column, once (v18)
}
const curFView = () => { ensureFViews(); return FLIB.views.find(v => v.id === FLIB.active); };
const filesHost = () => ({ ctx:'files', filterBtn:() => $('fbFilter'), st:FLIB, layouts:FV_LAYOUTS, view:curFView, save:saveFViews, render:() => renderFilesLib(), orderable:false, mkView:(name, layout) => newFView(name, layout, curFView().vis.slice()) });

/* ---------- what a file's properties are ---------- */
const fileLen = r => r.runtime ? r.runtime * 60 : (r.duration || 0);
const fileRes = r => { const l = Math.max(r.width || 0, r.height || 0); return l >= 3800 ? '4K' : l >= 2500 ? '1440p' : l >= 1800 ? '1080p' : l >= 1200 ? '720p' : l > 0 ? 'SD' : ''; };
const LEN_B = ['<30', '30–90', '90–180', '180+'], LEN_L = () => LEN_B.map(x => t('u_min', { n:x })), SIZE_B = ['<0.5 GB', '0.5–2 GB', '2–8 GB', '8 GB+'];
const lenBucket = s => { const m = s / 60, i = m < 30 ? 0 : m < 90 ? 1 : m < 180 ? 2 : 3; return LEN_L()[i]; };
const sizeBucket = b => { const g = b / 1073741824; return g < .5 ? SIZE_B[0] : g < 2 ? SIZE_B[1] : g < 8 ? SIZE_B[2] : SIZE_B[3]; };
const usedOpts = f => () => [...new Set(files.map(f).filter(Boolean))].sort().map(x => ({ id:x, label:x, color:hsl(hue(x)) }));
const FP = [
  { id:'title', type:'text', core:true, get:r => r.titleCn || r.titleEn || r.fileName },
  { id:'crew', type:'text', fixed:true, get:r => [r.director, r.cast || r.people, r.writers, r.producers].filter(Boolean).join(' · ') },
  { id:'kind', type:'select', fixed:true, src:'types', get:r => r.kind },
  { id:'genre', type:'multi', fixed:true, src:'tags', field:'genre' },
  { id:'year', type:'number', fixed:true, field:'year' },
  { id:'length', type:'number', fixed:true, get:fileLen, bucket:lenBucket, get bucketOrder() { return LEN_L(); } },
  { id:'language', type:'select', fixed:true, src:'languages', get:r => (r.language || '').trim() },
  { id:'tracked', type:'checkbox', fixed:true, get:r => TRK.has(r.sig) },
  { id:'size', type:'number', fixed:true, get:r => r.fileSize || 0, bucket:sizeBucket, bucketOrder:SIZE_B },
  { id:'res', type:'select', fixed:true, get:fileRes, optsFn:() => ['4K', '1440p', '1080p', '720p', 'SD'].map(x => ({ id:x, label:x, color:hsl(hue(x)) })) },
  { id:'ext', type:'select', fixed:true, get:r => (r.ext || '').toUpperCase(), optsFn:usedOpts(r => (r.ext || '').toUpperCase()) },
  { id:'file', type:'text', fixed:true, get:r => r.fileName },
  { id:'addedAt', type:'date', fixed:true, field:'addedAt' },
  { id:'pages', type:'number', fixed:true, field:'pages' },
  { id:'album', type:'text', fixed:true, field:'album' },
  { id:'publisher', type:'text', fixed:true, field:'publisher' },
  { id:'description', type:'text', fixed:true, field:'description' },
  { id:'open', type:'action', fixed:true, get:r => '' }
];
const filesProps = () => FP.map(p => ({ ...p, name:t('fp_' + p.id) }));
const fileHay = r => [r.titleCn, r.titleEn, r.director, r.cast, r.people, r.writers, r.producers, r.fileName, r.description, ...(r.genre || []).map(gname)];
const lenText = s => s ? (s >= 3600 ? t('u_hm', { h:Math.floor(s / 3600), m:String(Math.round(s % 3600 / 60)).padStart(2, '0') }) : t('u_min', { n:Math.round(s / 60) })) : '';

/* ---------- drawing ---------- */
function fileCell(r, p) {
  const v = pGet(r, p);
  switch (p.id) {
    case 'title': return `<div class="tt">${esc(v)}</div>${r.titleCn && r.titleEn ? `<div class="ts">${esc(r.titleEn)}</div>` : ''}`;
    case 'kind': return v ? `<span class="lp" style="--c:${esc(optColor(p, v))}"><i class="ti ti-${(TYPES[v] || TYPES.other).i}"></i>${esc(optLabel(p, v))}</span>` : '';
    case 'genre': return (v || []).slice(0, 5).map(x => tagPill(optLabel(p, x), optColor(p, x))).join('');
    case 'open': return `<button type="button" class="btn sm opn" data-open aria-label="${esc(fileVerb(r) + ': ' + (r.titleCn || r.titleEn || r.fileName))}"><i class="ti ti-${fileVerbIcon(r)}"></i><span>${esc(fileVerb(r))}</span></button>`;
    case 'tracked': return `<button type="button" class="trk ${v ? 'on' : ''}" data-trk aria-pressed="${!!v}" aria-label="${esc(t(v ? 'fp_tracked_on' : 'fp_track'))}"><i class="ti ti-${v ? 'bookmark-filled' : 'bookmark-plus'}"></i><span>${esc(t(v ? 'fp_tracked_on' : 'fp_track'))}</span></button>`;
    case 'length': return esc(lenText(v));
    case 'size': return v ? esc(fmtSize(v)) : '';
    case 'addedAt': return v ? new Date(Number(v)).toLocaleDateString(locOf()) : '';
    case 'file': return `<div class="tt fname" title="${esc(r.fileName)}">${esc(r.fileName)}</div><div class="ts">${esc([(r.ext || '').toUpperCase(), r.width ? r.width + '×' + r.height : ''].filter(Boolean).join(' · '))}</div>`;
    case 'description': return `<div class="tnotes">${esc(v || '')}</div>`;
    case 'res': case 'ext': return v ? tagPill(v, optColor(p, v)) : '';
    default: return esc(v == null || v === 0 ? '' : v);
  }
}
const filePoster = r => {                                         // same poster as the tracker: the file's own cover, else a coloured letter
  const title = r.titleCn || r.titleEn || r.fileName, h = hue(title), bg = r.thumb ? `background-image:url('${esc(r.thumb)}')` : `background-image:linear-gradient(150deg,hsl(${h} 55% 52%),hsl(${(h + 40) % 360} 50% 34%))`;
  return `<div class="poster" style="${bg}">${r.thumb ? '' : `<span class="letter">${esc([...title][0].toUpperCase())}</span>`}<button type="button" class="pplay" data-open aria-label="${esc(fileVerb(r) + ': ' + title)}"><i class="ti ti-${fileVerbIcon(r)}"></i></button><span class="tbadge"><i class="ti ti-${(TYPES[r.kind] || TYPES.other).i}"></i>${esc(L().types[r.kind] || r.kind)}</span></div>`;
};
const thumbHtml = r => r.thumb ? `<img class="thumb" src="${esc(r.thumb)}" alt="">` : `<div class="thumb empty"><i class="ti ti-${FILE_CLASS_ICON[fileClass(r)] || 'movie'}"></i></div>`;      // a book or a song gets its own icon, not a film's
function fileTableHtml(items, v) {
  const all = filesProps(), cols = v.vis.map(id => all.find(p => p.id === id)).filter(Boolean), sortOf = id => (v.sorts || []).find(s => s.p === id);
  const head = cols.map(p => { const s = sortOf(p.id); return `<th data-p="${esc(p.id)}" tabindex="0"${v.widths && v.widths[p.id] ? ` style="width:${v.widths[p.id]}px;min-width:${v.widths[p.id]}px;max-width:${v.widths[p.id]}px"` : ''}${s ? ` aria-sort="${s.dir === 'desc' ? 'descending' : 'ascending'}"` : ''} class="${p.id === 'fav' ? 'ck' : ''}"><i class="ti ti-${PROP_ICON[p.type]}"></i><span${p.id === 'fav' ? ' class="sr-only"' : ''}>${esc(p.name)}</span>${s ? `<i class="ti ti-arrow-${s.dir === 'desc' ? 'down' : 'up'} sd"></i>` : ''}<span class="rsz" data-rsz></span></th>`; }).join('');
  return `<div class="dtable-wrap"><table class="dtable"><thead><tr><th class="ck pick"><input type="checkbox" data-all aria-label="${esc(t('select'))}"${items.length && items.every(r => FS.sel.has(r.id)) ? ' checked' : ''}></th>${v.cover !== false ? `<th class="ck"><span class="sr-only">${esc(t('fp_cover'))}</span></th>` : ''}${head}</tr></thead><tbody>${items.map(r => `<tr data-id="${r.id}" tabindex="0" class="${FS.sel.has(r.id) ? 'sel' : ''}"><td class="ck pick"><input type="checkbox" data-ck ${FS.sel.has(r.id) ? 'checked' : ''} aria-label="${esc(pGet(r, all[0]))}"></td>${v.cover !== false ? `<td class="ck">${thumbHtml(r)}</td>` : ''}${cols.map(p => `<td data-p="${esc(p.id)}" class="tc-${p.type} ${p.id === 'title' ? 'tc-title' : ''}">${fileCell(r, p)}</td>`).join('')}</tr>`).join('')}</tbody>${calcFootHtml(v, cols, CALC_ALL || items, 1 + (v.cover !== false ? 1 : 0), 0)}</table></div>`;
}
function fileCards(items, v) {
  const all = filesProps(), cols = v.vis.map(id => all.find(p => p.id === id)).filter(p => p && p.id !== 'title');
  return `<div class="poster-grid">${items.map(r => `<div class="mcard click ${v.cover === false ? 'nocover' : ''} ${FS.sel.has(r.id) ? 'sel' : ''}" data-id="${r.id}" tabindex="0">${v.cover === false ? '' : filePoster(r)}<div class="minfo"><div class="mtitle">${esc(pGet(r, all[0]))}</div><div class="msub">${esc(cols.map(p => { const x = pGet(r, p); return p.id === 'length' ? lenText(x) : p.id === 'size' ? (x ? fmtSize(x) : '') : p.type === 'select' ? optLabel(p, x) : Array.isArray(x) ? x.map(g => optLabel(p, g)).join(', ') : x; }).filter(Boolean).slice(0, 3).join(' · '))}</div></div></div>`).join('')}</div>`;
}
function fileRows(items, v) {
  const all = filesProps(), cols = v.vis.map(id => all.find(p => p.id === id)).filter(p => p && p.id !== 'title');
  return `<div class="drows">${items.map(r => `<div class="drow ${FS.sel.has(r.id) ? 'sel' : ''}" data-id="${r.id}" tabindex="0">${v.cover !== false ? thumbHtml(r) : ''}<div class="grow"><div class="mtitle">${esc(pGet(r, all[0]))}</div></div><div class="drp">${cols.map(p => { const c = fileCell(r, p); return c ? `<span>${c}</span>` : ''; }).join('')}</div></div>`).join('')}</div>`;
}
const fileItemsHtml = (items, v) => !items.length ? '' : v.layout === 'gallery' ? fileCards(items, v) : v.layout === 'list' ? fileRows(items, v) : fileTableHtml(items, v);
function renderFilesLib() {
  if (!$('fGrid')) return; if (curTab !== 'files') { FS.dirty = true; return; } FS.dirty = false; ensureFViews(); if (curFView().layout !== 'table' && (FS.selecting || FS.sel.size)) { FS.sel.clear(); FS.selecting = false; } TRK = new Set(media.map(m => { const f = fileOfMedia(m); return f ? f.sig : m.fileSig; }).filter(Boolean)); const v = curFView(), nf = rulesOf(v).length + FLIB.temp.length;
  $('fTabs').innerHTML = FLIB.views.map(x => `<button class="vt ${x.id === FLIB.active ? 'on' : ''}" data-view="${esc(x.id)}"${x.id === FLIB.active ? ' aria-current="true"' : ''}><i class="ti ti-${FV_LAYOUTS.find(l => l[0] === x.layout)[1]}"></i><span>${esc(viewName(x))}</span>${x.id === FLIB.active ? '<i class="ti ti-dots vt-more" data-vmore></i>' : ''}</button>`).join('') + `<button class="vt add" data-view-new title="${esc(t('lib_new_view'))}" aria-label="${esc(t('lib_new_view'))}"><i class="ti ti-plus"></i></button>`;
  const b = $('fbFilter').querySelector('.badge'); $('fbFilter').classList.toggle('on', !!nf); b.hidden = !nf; b.textContent = nf;
  $('fbSort').classList.toggle('on', !!(v.sorts || []).length); $('fbGroup').classList.toggle('on', !!v.group);
  const gp = withCtx('files', () => propById(v.group)); $('fbGroup').title = gp ? gp.name : t('lib_group'); $('fbGroup').setAttribute('aria-label', $('fbGroup').title);
  $('fSelHint').hidden = !FS.selecting || !hintOn('select');
  $('fActive').innerHTML = FLIB.temp.map((r, i) => { const p = withCtx('files', () => propById(r.p)); return `<span class="af">${esc(p ? p.name : r.p)} ${esc(opLabel(r.op))} ${esc(r.v)}<button data-rmtemp="${i}" aria-label="${esc(t('lp_remove'))}">×</button></span>`; }).join('');
  const list = withCtx('files', () => runView(v, files, { q:FLIB.q, hay:fileHay })); FS.order = list.map(r => r.id); [...FS.sel].forEach(id => { if (!files.some(r => r.id === id)) FS.sel.delete(id); });
  const sig = JSON.stringify([v.id, v.filters, v.sorts, v.group, v.layout, FLIB.q, FLIB.temp]); if (sig !== FS.sig) { FS.sig = sig; FS.limit = CHUNK; }
  applyCoverSize($('fGrid'), v); $('fGrid').classList.toggle('selmode', FS.selecting);
  const hscroll = [...$('fGrid').querySelectorAll('.dtable-wrap')].map(x => x.scrollLeft);
  const g = withCtx('files', () => groupBy(v, list)); let budget = FS.limit;
  if (!list.length) $('fGrid').innerHTML = `<div class="empty-state"><i class="ti ti-inbox"></i>${esc(files.length ? t('no_match') : t('fl_empty'))}${files.length ? '' : `<div class="hint">${esc(t('fl_empty_hint'))}</div>`}</div>`;
  else if (!g) { CALC_ALL = list; try { $('fGrid').innerHTML = withCtx('files', () => fileItemsHtml(list.slice(0, FS.limit), v)) + moreHtml(Math.min(FS.limit, list.length), list.length); } finally { CALC_ALL = null; } }
  else $('fGrid').innerHTML = withCtx('files', () => g.map(x => { const ck = 'f:' + v.group + ':' + x.key, part = x.items.slice(0, Math.max(0, budget)); budget -= part.length; return `<section class="grp ${FS.collapsed.has(ck) ? 'collapsed' : ''}" data-gk="${esc(ck)}"><div class="grp-h big" data-gt role="button" tabindex="0" aria-expanded="${!FS.collapsed.has(ck)}"><i class="ti ti-chevron-down"></i>${x.color ? `<i class="gdot" style="background:${esc(x.color)}"></i>` : ''}<span>${esc(x.label)}</span><b class="bagg" data-gagg="${esc(x.key)}" tabindex="0" title="${esc(baggLabel((v.gagg || {})[x.key]))}">${esc(baggValue((v.gagg || {})[x.key], x.items) || '–')}</b></div><div class="grp-b"><div><div style="padding-bottom:14px">${fileItemsHtml(x.items, v)}</div></div></div></section>`; }).join(''));
  $('fGrid').querySelectorAll('.dtable-wrap').forEach((x, i) => { x.scrollLeft = hscroll[i] || 0; });
  applyFreeze($('fGrid'), v);
  renderFileBar([...FS.sel]);
}
function setFileSelecting(on) { FS.selecting = on; if (!on) FS.sel.clear(); renderFilesLib(); }

/* ---------- events ---------- */
let TRK = new Set();                                              // signatures of files that already have a tracker item
let lastFileId = null;
$('fTabs').addEventListener('click', e => {
  const host = filesHost();
  if (e.target.closest('[data-vmore]')) return viewMenu(e.target.closest('.vt'), host);
  const nv = e.target.closest('[data-view-new]'); if (nv) return newViewPop(nv, host);
  const b = e.target.closest('[data-view]'); if (b) { FLIB.active = b.dataset.view; FS.sel.clear(); FS.selecting = false; saveFViews(); renderFilesLib(); }
});
$('fTabs').addEventListener('keydown', e => { const b = e.target.closest && e.target.closest('.vt.on[data-view]'); if (b && (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10'))) { e.preventDefault(); viewMenu(b, filesHost()); } });   // the keyboard way to the view's menu
$('fbFilter').onclick = e => withCtx('files', () => openFilterPop(e.currentTarget, filesHost()));
$('fbSort').onclick = e => withCtx('files', () => openSortPop(e.currentTarget, filesHost()));
$('fbGroup').onclick = e => withCtx('files', () => groupPop(e.currentTarget, filesHost()));
$('fbProps').onclick = e => withCtx('files', () => openPropsPop(e.currentTarget, filesHost()));
$('fSearch').oninput = e => { FLIB.q = e.target.value.toLowerCase().trim(); renderFilesLib(); };
$('fActive').addEventListener('click', e => { const b = e.target.closest('[data-rmtemp]'); if (b) { FLIB.temp.splice(Number(b.dataset.rmtemp), 1); renderFilesLib(); } });
$('fGrid').addEventListener('click', e => {
  if (e.target.closest('[data-rsz]')) return;
  if (e.target.closest('[data-more-items]')) { FS.limit += CHUNK; return renderFilesLib(); }
  const ga = e.target.closest('[data-gagg]'); if (ga) { e.stopPropagation(); return withCtx('files', () => baggPop(ga, filesHost(), ga.dataset.gagg, 'gagg')); }
  const gt = e.target.closest('[data-gt]'); if (gt) { const s = gt.parentElement, k = s.dataset.gk; FS.collapsed.has(k) ? FS.collapsed.delete(k) : FS.collapsed.add(k); s.classList.toggle('collapsed'); gt.setAttribute('aria-expanded', String(!s.classList.contains('collapsed'))); return; }
  const cf = e.target.closest('[data-calc]'); if (cf) return withCtx('files', () => calcPop(cf, filesHost(), propById(cf.dataset.calc)));
  const pk = e.target.closest('input[data-ck], input[data-all]'); if (pk) { e.stopPropagation(); lastFileId = gutterPick(FS, pk, e.shiftKey, lastFileId, renderFilesLib); return; }
  const th = e.target.closest('th[data-p]'); if (th) return withCtx('files', () => headerMenu(th, filesHost()));
  const cb = e.target.closest('[data-pick]'); if (cb) { e.stopPropagation(); const id = Number(cb.closest('[data-id]').dataset.id); FS.sel.has(id) ? FS.sel.delete(id) : FS.sel.add(id); FS.selecting = FS.sel.size > 0; lastFileId = id; return renderFilesLib(); }
  const op = e.target.closest('[data-open]'); if (op) { e.stopPropagation(); const row = op.closest('[data-id]'); return openFileById(row.dataset.id, { queue:FS.order }); }
  const tk = e.target.closest('[data-trk]'); if (tk) { e.stopPropagation(); const r = files.find(x => x.id === Number(tk.closest('[data-id]').dataset.id)); const m = trackerOf(r); return m ? openMedia(m.id) : trackFiles([r.id]).then(n => toast(t('t_tracked_n', n))); }
  if (e.target.closest('.cell-link')) return;
  const c = e.target.closest('tr[data-id], .mcard, .drow'); if (!c) return; const id = Number(c.dataset.id);
  if (!FS.selecting && c.tagName === 'TR' && (e.metaKey || e.ctrlKey || e.shiftKey)) { FS.sel.add(id); FS.selecting = true; lastFileId = id; return renderFilesLib(); }       // ⌘/Ctrl/Shift-click starts a selection in any layout
  if (FS.selecting) {
    if (e.shiftKey && lastFileId != null) { const a = FS.order.indexOf(lastFileId), b = FS.order.indexOf(id); if (a >= 0 && b >= 0) FS.order.slice(Math.min(a, b), Math.max(a, b) + 1).forEach(x => FS.sel.add(x)); }
    else FS.sel.has(id) ? FS.sel.delete(id) : FS.sel.add(id);
    FS.selecting = FS.sel.size > 0; lastFileId = id; return renderFilesLib();
  }
  openEdit(id, FS.order);
});
document.addEventListener('keydown', e => {
  if (curTab !== 'files' || document.querySelector('dialog[open]')) return;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a' && FS.selecting && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); FS.order.forEach(id => FS.sel.add(id)); renderFilesLib(); }
  if (e.key === 'Escape' && FS.selecting) setFileSelecting(false);
});
/* the bulk bar and the shell talk to the library through this small surface */
fileView = { refresh:renderFilesLib, selected:() => [...FS.sel], clear() { FS.sel.clear(); renderFilesLib(); }, all() { FS.order.forEach(id => FS.sel.add(id)); renderFilesLib(); }, shownIds:() => FS.order.slice() };
