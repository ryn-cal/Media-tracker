/* =====================================================================
   Form widgets: tag input, half-star rating, icon chip groups
   ===================================================================== */
function tagInput(host) {
  let tags = [];
  host.innerHTML = '<div class="taginput"><div class="tags"></div><input type="text" autocomplete="off"></div><div class="tagsug"></div>';
  const box = host.firstChild, tg = box.firstChild, inp = box.lastChild, sug = host.lastChild;
  const drawSug = () => {
    const raw = inp.value.trim(), q = raw.toLowerCase(), all = tagCounts();
    const list = all.filter(([k]) => !tags.includes(k) && (!q || gname(k).toLowerCase().includes(q) || k.includes(q))).slice(0, 14);
    const exists = q && (all.some(([k]) => gname(k).toLowerCase() === q || k.toLowerCase() === q) || tags.some(k => gname(k).toLowerCase() === q));
    sug.innerHTML = (raw && !exists ? `<button type="button" class="sg new" data-new="${esc(raw)}"><i class="ti ti-plus"></i>${esc(t('tag_create', { x:raw }))}</button>` : '')
      + (list.length ? `<span class="cap">${esc(t(q ? 'tag_matches' : 'tag_popular'))}</span>` : '')
      + list.map(([k]) => `<button type="button" class="sg" style="${hv(k)}" data-add="${esc(k)}">${esc(gname(k))}</button>`).join('');
  };
  const draw = () => { tg.innerHTML = tags.map((x, i) => `<span class="tg" style="${hv(x)}">${esc(gname(x))}<button type="button" data-i="${i}" aria-label="×">×</button></span>`).join(''); inp.placeholder = tags.length ? '' : t('tag_ph'); drawSug(); };
  const add = s => { s.split(/[,，、;；]/).map(x => genreKey(x)).filter(Boolean).forEach(k => { if (!tags.includes(k)) tags.push(k); }); };
  const commit = () => { if (inp.value.trim()) { add(inp.value); inp.value = ''; draw(); } };
  inp.addEventListener('input', drawSug);
  inp.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ',' || e.key === '，') && inp.value.trim()) { e.preventDefault(); commit(); }
    else if (e.key === 'Backspace' && !inp.value && tags.length) { tags.pop(); draw(); }
  });
  sug.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; add(b.dataset.new || b.dataset.add); inp.value = ''; draw(); inp.focus(); });
  tg.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { tags.splice(+b.dataset.i, 1); draw(); } });
  box.addEventListener('click', e => { if (e.target === box || e.target === tg) inp.focus(); });
  draw();
  return { get() { commit(); return tags.slice(); }, set(v) { tags = (v || []).slice(); inp.value = ''; draw(); }, refresh:draw };
}
function rateWidget(host) {
  let v = 0, hover = null;
  host.innerHTML = [1, 2, 3, 4, 5].map(i => `<span class="st" data-i="${i}"><span class="fill"></span><b data-v="${i - .5}"></b><b data-v="${i}"></b></span>`).join('') + '<span class="rv"></span><button type="button" class="rclear" data-v="0">×</button>';
  const draw = () => { const x = hover != null ? hover : v; $$('.st', host).forEach(s => { const i = +s.dataset.i; s.firstChild.style.width = Math.max(0, Math.min(1, x - (i - 1))) * 100 + '%'; }); host.querySelector('.rv').textContent = x ? x.toFixed(1) : ''; };
  host.addEventListener('mousemove', e => { const b = e.target.closest('b'); hover = b ? +b.dataset.v : null; draw(); });
  host.addEventListener('mouseleave', () => { hover = null; draw(); });
  host.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; const n = +b.dataset.v; v = (n === v) ? 0 : n; hover = null; draw(); });
  draw();
  return { get:() => v, set(x) { v = Number(x) || 0; draw(); } };
}
function iconChips(host, items, onChange) {          // single-select chip group; items: [[key,label,icon]]
  let val = '';
  const draw = () => { host.innerHTML = items.map(([k, lab, ic]) => `<button type="button" class="chip" data-k="${k}" aria-pressed="${k === val}">${ic ? `<i class="ti ti-${ic}"></i>` : ''}${esc(lab)}</button>`).join(''); };
  host.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) { val = b.dataset.k; draw(); onChange && onChange(val); } });
  draw();
  return { get:() => val, set(v) { val = v; draw(); }, items(it) { items = it; draw(); } };
}
function wireDrawer(dlg, form, onSubmit) {
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  form.addEventListener('submit', e => { e.preventDefault(); onSubmit(e.submitter ? e.submitter.value : 'save'); });
  form.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); onSubmit('save'); } });
}

/* ---- tracker item drawer ---- */
const mdlg = $('mdlg'), mform = $('mform'); let mEditId = null;
const mTypes = iconChips($('mTypes'), [], () => { paintPoster(); applySchema(mTypes.get()); }), mStatus = iconChips($('mStatus'), []), mRate = rateWidget($('mRate')), mTags = tagInput($('mTags'));
function paintPoster() { $('mPoster').innerHTML = posterHtml({ title:mform.elements.title.value || '?', cover:mform.elements.cover.value, type:mTypes.get() }, false); }
mform.elements.title.addEventListener('input', paintPoster); mform.elements.cover.addEventListener('input', paintPoster);
let mFav = false, mListSel = new Set();
function setMFav(v) { mFav = !!v; $('mFav').setAttribute('aria-pressed', mFav); $('mFav').innerHTML = heartSvg(mFav); }
function drawMLists() { $('mLists').innerHTML = LISTS.map(l => `<button type="button" class="chip" style="--lc:${esc(l.color)}" data-l="${esc(l.id)}" aria-pressed="${mListSel.has(l.id)}">${esc(l.name)}</button>`).join('') + `<button type="button" class="chip" data-lnew><i class="ti ti-plus"></i>${esc(t('l_new'))}</button>`; }
$('mFav').onclick = () => setMFav(!mFav);
$('mLists').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.hasAttribute('data-lnew')) return openListDialog(null, l => { mListSel.add(l.id); drawMLists(); }); mListSel.has(b.dataset.l) ? mListSel.delete(b.dataset.l) : mListSel.add(b.dataset.l); drawMLists(); });
const M_TEXT = ['title', 'alt', 'creator', 'year', 'runtime', 'pages', 'language', 'progress', 'cast', 'writers', 'producers', 'cover', 'notes'];
/* Each kind of work asks for different things: a book has an author and a publisher, not a cast. */
const SCHEMA_FIELDS = ['creator', 'cast', 'writers', 'producers', 'runtime', 'pages'];
const schemaOf = type => (L().fs[type] || L().fs.other);
function applySchema(type) {
  const sc = schemaOf(type), f = mform.elements;
  SCHEMA_FIELDS.forEach(k => { const lab = f[k].closest('label'); lab.hidden = !sc[k]; if (sc[k]) lab.querySelector('span').textContent = sc[k]; });
}
function fillMediaDrawer(id) {
  mEditId = id; const m = id ? media.find(x => x.id === id) : { type:'film', status:'want', genre:[], rating:0 }, f = mform.elements;
  mTypes.items(Object.keys(TYPES).map(k => [k, L().types[k], TYPES[k].i])); mStatus.items(Object.keys(STATUSES).map(k => [k, L().status[k], STATUSES[k].i]));
  fillLangSelect(f.language, m.language);
  for (const k of M_TEXT) f[k].value = m[k] == null ? '' : m[k];
  drawCustomProps(m);
  mTypes.set(m.type); applySchema(m.type); mStatus.set(m.status); mRate.set(m.rating || 0); mTags.set(m.genre || []); setMFav(m.fav); mListSel = new Set((m.lists || []).filter(listById)); drawMLists(); paintPoster();
  $('mTitleH').textContent = t(id ? 'm_edit' : 'm_add'); $('mDelete').style.display = id ? '' : 'none';
  /* the one Read / Play: the item's file when it has one, else a choice of file (which is then remembered). The progress is the file's position. */
  const lf = id ? fileOfMedia(m) : null, op = $('mOpen'); op.hidden = !id || !(lf || mediaWantsFile(m));
  if (!op.hidden) { op.firstElementChild.className = 'ti ti-' + (lf ? fileVerbIcon(lf) : m.type === 'book' ? 'book-2' : 'player-play'); op.lastElementChild.textContent = lf ? fileVerb(lf) + (resumeLabel(lf) ? ' · ' + resumeLabel(lf) : '') : t(m.type === 'book' ? 'fp_choose_read' : 'fp_choose_play'); }
  const follows = id && followsFile(m); f.progress.disabled = !!follows; f.progress.title = follows ? t('prog_follows') : ''; if (follows) f.progress.value = progressOf(m);
  const i = TS.order.indexOf(id), nav = id && i >= 0; $('mPrev').style.visibility = $('mNext').style.visibility = nav ? '' : 'hidden'; $('mSaveNext').style.display = nav ? '' : 'none';
  $('mPos').textContent = nav ? `${i + 1} / ${TS.order.length}` : '';
}
function openMedia(id) { fillMediaDrawer(id); if (!mdlg.open) mdlg.showModal(); setTimeout(() => mform.elements.title.focus(), 60); }
async function saveMedia() {
  const f = mform.elements, old = mEditId ? media.find(x => x.id === mEditId) : null, r = old ? { ...old } : { addedAt:Date.now() };
  for (const k of ['title', 'alt', 'creator', 'progress', 'cover', 'notes', 'language', 'cast', 'writers', 'producers']) { if (k === 'progress' && f.progress.disabled) continue; r[k] = f[k].value.trim(); }       // a followed progress is not typed over
  if (!r.title) { f.title.focus(); return null; }
  collectCustomProps(r);
  r.type = mTypes.get() || 'film'; r.status = mStatus.get() || 'want'; r.year = f.year.value ? Number(f.year.value) : null; r.runtime = f.runtime.value ? Number(f.runtime.value) : null; r.pages = f.pages.value ? Number(f.pages.value) : null; r.rating = mRate.get(); r.genre = mTags.get(); r.fav = mFav; r.lists = [...mListSel].filter(listById);
  if (r.status === 'doing' && (!old || old.status !== 'doing')) r.startedAt = Date.now();
  if (r.status === 'done' && (!old || old.status !== 'done')) r.doneAt = Date.now();
  await DB.put('media', r); await reload(); return r;
}
const stepMedia = async dir => { const i = TS.order.indexOf(mEditId); const j = i + dir; if (i >= 0 && j >= 0 && j < TS.order.length) fillMediaDrawer(TS.order[j]); };
wireDrawer(mdlg, mform, async how => {
  const idBefore = mEditId, pos = TS.order.indexOf(idBefore); const r = await saveMedia(); if (!r) return; toast(t('t_saved'));
  if (how === 'savenext' && pos >= 0) { if (TS.order[pos + 1] != null) fillMediaDrawer(TS.order[pos + 1]); else mdlg.close(); } else mdlg.close();
});
$('mOpen').onclick = () => { const id = mEditId; mdlg.close(); openForMedia(id); };
$('mX').onclick = () => mdlg.close(); $('mPrev').onclick = () => stepMedia(-1); $('mNext').onclick = () => stepMedia(1);
$('mDelete').onclick = async () => { if (await ask(t('t_mconfirm'))) { await DB.del('media', mEditId); mdlg.close(); reload(); } };

/* ---- file edit drawer ---- */
const dlg = $('dlg'), form = $('form'); let editId = null, fileOrder = [];
const fKinds = iconChips($('fKinds'), [], null), fTags = tagInput($('fTags'));
const FILE_CLASS_ICON = { video:'movie', audio:'music', book:'book-2' };
const fileClass = r => r.cls || (r.kind === 'music' ? 'audio' : r.kind === 'book' ? 'book' : 'video');
function fileInfoHtml(r) { return `<div class="fi-thumb">${r.thumb ? `<img src="${esc(r.thumb)}" alt="">` : `<i class="ti ti-${FILE_CLASS_ICON[fileClass(r)]}"></i>`}</div><div class="fi-txt"><b title="${esc(r.fileName)}">${esc(r.fileName)}</b><span>${esc(fmtSize(r.fileSize || 0))}</span></div>`; }
/* what the file itself says, as plain rows under the editable ones */
const fileFacts = r => [['fd_c_' + fileClass(r), null], ['fp_ext', (r.ext || '').toUpperCase()], ['fp_length', r.duration ? fmtDur(r.duration) : ''], ['fp_res', r.width ? r.width + '×' + r.height : ''], ['fp_pages', r.pages ? t('u_pages', { n:r.pages }) : ''], ['fp_album', r.album], ['fp_publisher', r.publisher]].filter(([k, v]) => v);
function fillFileDrawer(id) {
  const r = files.find(x => x.id === id), f = form.elements; editId = id;
  fillLangSelect(f.language, r.language);
  fKinds.items(Object.keys(TYPES).map(k => [k, L().types[k], TYPES[k].i]));
  f.title.value = r.titleCn || r.titleEn || ''; f.director.value = r.director || r.people || ''; f.year.value = r.year || ''; f.description.value = r.description || '';
  fKinds.set(r.kind && TYPES[r.kind] ? r.kind : 'film'); fTags.set(r.genre || []); $('fInfo').innerHTML = fileInfoHtml(r);
  $('fMeta').innerHTML = [['fp_file', r.fileName], ...fileFacts(r).map(([k, v]) => [k.startsWith('fd_c_') ? 'f_kind' : k, v || t(k)])].map(([k, v]) => `<div class="np-row"><div class="fld"><span>${esc(t(k))}</span><span class="np-ro">${esc(v)}</span></div></div>`).join('');
  $('fPlay').lastElementChild.textContent = fileVerb(r); $('fPlay').firstElementChild.className = 'ti ti-' + fileVerbIcon(r);
  const i = fileOrder.indexOf(id); $('fPos').textContent = i >= 0 ? `${i + 1} / ${fileOrder.length}` : ''; $('fPrev').style.visibility = $('fNext').style.visibility = i >= 0 ? '' : 'hidden';
}
function openEdit(id, order) { fileOrder = order || [id]; fillFileDrawer(id); if (!dlg.open) dlg.showModal(); }
async function saveFile() {
  const r = { ...files.find(x => x.id === editId) }, f = form.elements, title = f.title.value.trim(), ascii = /^[\x00-\x7f]*$/.test(title);
  r.titleCn = ascii ? '' : title; r.titleEn = ascii ? title : ''; r.director = f.director.value.trim(); r.language = f.language.value; r.description = f.description.value.trim();
  r.kind = fKinds.get() || r.kind || 'film'; r.year = f.year.value ? Number(f.year.value) : null; r.genre = fTags.get();
  await DB.put('videos', r); await reload();
}
wireDrawer(dlg, form, async how => { const pos = fileOrder.indexOf(editId); await saveFile(); toast(t('t_saved')); if (how === 'savenext' && pos >= 0 && fileOrder[pos + 1] != null) fillFileDrawer(fileOrder[pos + 1]); else dlg.close(); });
$('fDel').onclick = async () => { const id = editId; if (await ask(t('t_confirm_del'))) { dlg.close(); await DB.del('videos', id); await reload(); toast(t('t_deleted', { n:1 })); } };
$('fPlay').onclick = () => { const id = editId, order = fileOrder.slice(); dlg.close(); openFileById(id, { queue:order }); };
$('fTrack').onclick = async () => { const r = await trackFiles([editId]); toast(t('t_tracked_n', r)); };
$('fX').onclick = () => dlg.close(); $('fPrev').onclick = () => { const i = fileOrder.indexOf(editId); if (i > 0) fillFileDrawer(fileOrder[i - 1]); }; $('fNext').onclick = () => { const i = fileOrder.indexOf(editId); if (i >= 0 && i < fileOrder.length - 1) fillFileDrawer(fileOrder[i + 1]); };

/* ---- bulk edit drawer (tracker & files) ---- */
const bdlg = $('bdlg'), bform = $('bform'); let bCtx = null, bAdd, bRm, bRate, bAddL = new Set(), bRmL = new Set();
function drawBulkLists() {
  const chips = (set, withNew) => LISTS.map(l => `<button type="button" class="chip" style="--lc:${esc(l.color)}" data-l="${esc(l.id)}" aria-pressed="${set.has(l.id)}">${esc(l.name)}</button>`).join('') + (withNew ? `<button type="button" class="chip" data-lnew><i class="ti ti-plus"></i>${esc(t('l_new'))}</button>` : '');
  if ($('bAddL')) $('bAddL').innerHTML = chips(bAddL, true); if ($('bRmL')) $('bRmL').innerHTML = chips(bRmL, false);
}
/* bulk-edit the properties that belong to the selected kinds of work (a book has a publisher, not a cast) */
const BULK_PROPS = ['creator', 'cast', 'writers', 'producers', 'runtime', 'pages', 'progress'];
function bulkProps(ids) {
  const sel = ids.map(id => media.find(m => m.id === id)).filter(Boolean), kinds = new Set(sel.map(m => m.type)), single = kinds.size === 1 ? [...kinds][0] : '';
  const has = k => k === 'progress' || sel.some(m => schemaOf(m.type)[k]), lab = k => k === 'progress' ? t('m_progress') : single ? schemaOf(single)[k] : t('tc_' + k);
  const f = BULK_PROPS.filter(has).map(k => `<label class="fld"><span>${esc(lab(k))}</span><input type="${k === 'runtime' || k === 'pages' ? 'number' : 'text'}" name="p_${k}" ${k === 'runtime' || k === 'pages' ? 'min="0" max="99999"' : ''} autocomplete="off"></label>`).join('');
  return f ? `<div class="dsec"><span>${esc(t('bulk_props'))}</span></div><div class="fgrid">${f}</div>` : '';
}
function openBulk(kind, ids) {
  bCtx = { kind, ids }; bAddL = new Set(); bRmL = new Set(); $('bTitle').textContent = t('bulk_edit', { n:ids.length });
  const keep = `<option value="">${esc(t('bulk_keep'))}</option>`;
  const favSel = `<label class="fld"><span>${esc(t('fav_label'))}</span><select name="fav">${keep}<option value="1">${esc(t('bulk_fav_add'))}</option><option value="0">${esc(t('bulk_fav_rm'))}</option></select></label>`;
  const tagsBlock = `<div class="fld"><span>${esc(t('bulk_add_tags'))}</span><div id="bAdd"></div></div><div class="fld"><span>${esc(t('bulk_rm_tags'))}</span><div id="bRm"></div></div>`;
  if (kind === 'media') $('bBody').innerHTML = `<p class="bulk-note">${esc(t('bulk_note'))}</p>
      <div class="fgrid"><label class="fld"><span>${esc(t('m_status'))}</span><select name="status">${keep}${Object.keys(STATUSES).map(s => `<option value="${s}">${esc(L().status[s])}</option>`).join('')}</select></label>
      <label class="fld"><span>${esc(t('f_type'))}</span><select name="type">${keep}${Object.keys(TYPES).map(s => `<option value="${s}">${esc(L().types[s])}</option>`).join('')}</select></label>
      <label class="fld"><span>${esc(t('f_lang'))}</span><select name="language" class="langsel"></select></label><label class="fld"><span>${esc(t('f_year'))}</span><input type="number" name="year" min="-3000" max="2100"></label>${favSel}</div>
      <div class="fld"><span>${esc(t('m_rating'))}</span><div class="rate" id="bRate"></div></div><label class="checkline" style="margin:-8px 0 0"><input type="checkbox" name="clearRate"><span>${esc(t('bulk_clear'))}</span></label>
      ${bulkProps(ids)}
      ${tagsBlock}<div class="fld"><span>${esc(t('bulk_add_lists'))}</span><div class="chipset" id="bAddL"></div></div><div class="fld"><span>${esc(t('bulk_rm_lists'))}</span><div class="chipset" id="bRmL"></div></div>`;
  else $('bBody').innerHTML = `<p class="bulk-note">${esc(t('bulk_note'))}</p><div class="fgrid"><label class="fld"><span>${esc(t('f_kind'))}</span><select name="kind">${keep}${Object.entries(L().v.kinds).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
      <label class="fld"><span>${esc(t('f_year'))}</span><input type="number" name="year" min="1880" max="2100"></label>
      <label class="fld"><span>${esc(t('f_lang'))}</span><select name="language" class="langsel"></select></label><label class="fld"><span>${esc(t('f_director'))}</span><input type="text" name="director"></label>${favSel}</div>${tagsBlock}`;
  bAdd = tagInput($('bAdd')); bRm = tagInput($('bRm')); if (kind === 'media') { bRate = rateWidget($('bRate')); drawBulkLists(); }
  $$('#bBody select.langsel').forEach(x => fillLangSelect(x, '', true));
  bdlg.showModal();
}
$('bBody').addEventListener('click', e => {
  const b = e.target.closest('button[data-l], button[data-lnew]'); if (!b) return;
  if (b.hasAttribute('data-lnew')) return openListDialog(null, l => { bAddL.add(l.id); drawBulkLists(); });
  const inAdd = b.closest('#bAddL'), set = inAdd ? bAddL : bRmL, other = inAdd ? bRmL : bAddL, id = b.dataset.l;
  set.has(id) ? set.delete(id) : (set.add(id), other.delete(id)); drawBulkLists();
});
wireDrawer(bdlg, bform, async () => {
  const f = bform.elements, add = bAdd.get(), rm = bRm.get(), { kind, ids } = bCtx; let n = 0, becameDone = false; const before = doneCount();
  const tagFix = r => { r.genre = [...new Set([...(r.genre || []), ...add])].filter(x => !rm.includes(x)); };
  const favVal = f.fav && f.fav.value !== '' ? f.fav.value === '1' : null;
  if (kind === 'media') {
    const rate = bRate.get(), clr = f.clearRate.checked;
    n = await bulkMedia(ids, m => {
      if (f.status.value) { m.status = f.status.value; if (m.status === 'doing') m.startedAt = Date.now(); if (m.status === 'done') { m.doneAt = Date.now(); becameDone = true; } }
      if (f.type.value) m.type = f.type.value; if (f.language.value.trim()) m.language = f.language.value.trim(); if (f.year.value) m.year = Number(f.year.value);
      BULK_PROPS.forEach(k => { const el = f['p_' + k]; if (el && el.value.trim() !== '' && (k === 'progress' || schemaOf(m.type)[k])) m[k] = el.type === 'number' ? Number(el.value) : el.value.trim(); });
      if (rate) m.rating = rate; if (clr) m.rating = 0; if (favVal !== null) m.fav = favVal; tagFix(m);
      if (bAddL.size || bRmL.size) m.lists = [...new Set([...(m.lists || []), ...bAddL])].filter(x => !bRmL.has(x));
      return m;
    });
  } else {
    const recs = ids.map(id => files.find(x => x.id === id)).filter(Boolean).map(r => { r = { ...r }; if (f.kind.value) r.kind = f.kind.value; if (f.year.value) r.year = Number(f.year.value); if (f.language.value.trim()) r.language = f.language.value.trim(); if (f.director.value.trim()) r.director = f.director.value.trim(); if (favVal !== null) r.fav = favVal; tagFix(r); return r; });
    await DB.putMany('videos', recs); n = recs.length; await reload();
  }
  bdlg.close(); toast(t('t_updated', { n }));
});
$('bX').onclick = $('bCancel').onclick = () => bdlg.close();

