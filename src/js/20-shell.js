/* =====================================================================
   App shell
   ===================================================================== */
function toast(msg, warn, undo) {                                 // undo: a function that puts things back; the toast then stays longer and offers it
  const el = $('toast'), ub = $('toastUndo'); $('toastText').textContent = msg; $('srLive').textContent = ''; setTimeout(() => { $('srLive').textContent = msg; }, 30); el.classList.toggle('warn', !!warn); ub.hidden = !undo; ub.textContent = t('t_undo'); ub.onclick = undo ? () => { el.classList.remove('show'); undo(); } : null; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), undo ? 8000 : warn ? 7000 : 2800);
}
/* Run a change to a set of items, and offer to take it back. The records as they were are kept; Undo writes them again (what was added since is removed). */
async function withUndo(ids, run, msg) {
  const was = ids.map(id => media.find(m => m.id === id)).filter(Boolean).map(m => JSON.parse(JSON.stringify(m))), had = new Set(was.map(m => m.id));
  await run(); toast(msg, false, async () => { await DB.putMany('media', was); await reload(); toast(t('t_undone')); });
}
/* native shell (HarmonyOS): blob downloads can't reach the file system from a WebView, so hand them to the app's save dialog */
if (window.nativeBridge) {
  const _click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (!(this.download && this.href.startsWith('blob:'))) return _click.call(this);
    const name = this.download;
    fetch(this.href).then(r => r.blob()).then(b => new Promise(res => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] || ''); fr.readAsDataURL(b); }))
      .then(b64 => { try { toast(nativeBridge.save(name, b64) === 'ok' ? '✓ ' + name : '✗ ' + name); } catch (e) { toast('✗ ' + name); } });
  };
}
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
const stamp = () => new Date().toISOString().slice(0, 10);
const fmtSize = b => b >= 1073741824 ? (b / 1073741824).toFixed(2) + ' GB' : (b / 1048576).toFixed(1) + ' MB';
const fmtDur = s => { const h = Math.floor(s / 3600), m = Math.round(s % 3600 / 60); return h ? t('u_hm', { h, m }) : t('u_min', { n:m }); };
let curTab = 'home';
function setTab(name) {
  if (name === 'packs') { name = 'settings'; store.set('vmm.setsec', 'plugins'); }
  curTab = name; document.body.classList.toggle('home', name === 'home');
  $$('.nav').forEach(b => { const on = b.dataset.tab === name || (!!b.dataset.hub && b.dataset.hub.split(',').includes(name)); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  $$('.panel').forEach(p => p.hidden = p.dataset.panel !== name);
  if (name !== 'tracker' && TS.selecting) setSelecting(false);
  const fb = $('fileBar'); if (fb) fb.classList.toggle('show', name === 'files' && (fb._ids || []).length > 0);
  document.body.dataset.page = name; store.set('vmm.tab', name); window.scrollTo(0, 0); document.documentElement.classList.toggle('snap', name === 'home'); if (name === 'home') tick(true); if (name === 'insights') renderInsights(); if (name === 'lists') renderListsPage(); if (name === 'profile') renderProfile(); if (name === 'settings') showSetSec(); 
}
function labelControls() {
  $$('[data-i18n-aria]').forEach(e => e.setAttribute('aria-label', t(e.dataset.i18nAria)));
  $$('input[placeholder], textarea[placeholder]').forEach(e => { if (!e.getAttribute('aria-label') && !(e.labels && e.labels.length)) e.setAttribute('aria-label', e.placeholder); });
}
{ let pending = 0; new MutationObserver(() => { if (!pending) pending = requestAnimationFrame(() => { pending = 0; labelControls(); }); }).observe(document.body, { childList:true, subtree:true }); }   // screens that draw their own fields are named too
function applyLang() {
  document.documentElement.lang = prefs.lang; document.title = t('brand');
  $$('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  const seg = (id, val) => $$('#' + id + ' button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === val));
  $('segLang').innerHTML = uiLangs().map(([c, n]) => `<button data-v="${c}">${esc(n)}</button>`).join(''); seg('segLang', prefs.lang); seg('segTheme', prefs.theme); seg('segClock', prefs.clock); seg('segWp', prefs.wp); if (curTab === 'settings') showSetSec();
  $('wpFixedBox').hidden = prefs.wp !== 'fixed';
  $('myQ').value = prefs.myq; $('setNote').textContent = t('set_note');
  const taglist = [...new Set([...GENRE_KEYS.map(gname), ...media.flatMap(m => (m.genre || []).map(gname)), ...files.flatMap(r => (r.genre || []).map(gname))])];
  $('tagList').innerHTML = taglist.map(x => `<option value="${esc(x)}">`).join('');
  if ($('banner').dataset.mem) $('banner').textContent = t('t_mem');
  $$('[data-i18n-title]').forEach(el => el.title = t(el.dataset.i18nTitle)); $$('[data-i18n-ph]').forEach(el => el.placeholder = t(el.dataset.i18nPh));
  $$('#hdots button').forEach((b, i) => b.title = [t('nav_home'), t('pick_title'), t('continue_title')][i]);
  seg('segRot', prefs.rot); applySide();
  $$('.nav').forEach(b => { const sp = b.querySelector('span[data-i18n]'); if (sp) b.title = sp.textContent; });
  [mTags, fTags].forEach(x => x.refresh()); mountFiles(); renderAll(); renderGallery(); renderImpTabs(); tick(true);
}
function applyTheme() { if (prefs.theme === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = prefs.theme; }
/* Each (re)mount gets a fresh host element — mounting twice into the same node used to stack click handlers, which made one "Track" click add several records. */
function mountFiles() { renderFilesLib(); }
function renderFileBar(ids) {
  let bar = $('fileBar'); if (!bar) { bar = document.createElement('div'); bar.id = 'fileBar'; bar.className = 'selbar'; document.body.appendChild(bar); bar.addEventListener('click', onFileBar); }
  const n = ids.length; bar.classList.toggle('show', n > 0 && curTab === 'files'); bar._ids = ids;
  bar.innerHTML = `<span class="n">${esc(t('sel_n', { n }))}</span><button class="btn sm" data-fb="all">${esc(t('sel_all', { n:fileView ? fileView.shownIds().length : 0 }))}</button><button class="btn sm" data-fb="clear">${esc(t('sel_clear'))}</button><button class="btn sm" data-fb="track"><i class="ti ti-bookmark-plus"></i>${esc(t('sel_track'))}</button><button class="btn sm" data-fb="edit"><i class="ti ti-edit"></i>${esc(t('sel_edit'))}</button><button class="btn sm danger" data-fb="del"><i class="ti ti-trash"></i>${esc(t('sel_delete'))}</button>`;
}
async function onFileBar(e) {
  const b = e.target.closest('[data-fb]'); if (!b) return; const ids = $('fileBar')._ids || [], k = b.dataset.fb;
  if (k === 'all') fileView.all(); else if (k === 'clear') fileView.clear();
  else if (k === 'edit') openBulk('videos', ids);
  else if (k === 'track') { const r = await trackFiles(ids); toast(t('t_tracked_n', r)); fileView.clear(); }
  else if (k === 'del' && await ask(t('t_confirm_del_n', { n:ids.length }))) { await DB.delMany('videos', ids); await reload(); toast(t('t_deleted', { n:ids.length })); }
}
function renderAll() {
  $('sTotal').textContent = files.length; $('pillFiles').textContent = files.length; $('pillTracker').textContent = media.length;
  $('sSize').textContent = fmtSize(files.reduce((a, r) => a + (r.fileSize || 0), 0));
  $('sDur').textContent = fmtDur(files.reduce((a, r) => a + (r.duration || 0), 0));
  $('sUntagged').textContent = files.filter(r => !(r.genre || []).length).length;
  if (typeof STAT !== 'undefined') STAT.by(7).then(o => { const s = o.video + o.audio + o.book; const sp = x => x < 60 ? x + ' s' : fmtDur(x); $('sWeek').textContent = s ? sp(s) : '—'; $('sWeekSub').innerHTML = s ? [['video', 'movie'], ['audio', 'headphones'], ['book', 'book-2']].filter(([k]) => o[k]).map(([k, ic]) => `<span><i class="ti ti-${ic}"></i>${esc(sp(o[k]))}</span>`).join('') : ''; });
  $('clearTrackerD').textContent = t('clear_tracker_d', { n:media.length }); $('clearFilesD').textContent = t('clear_files_d', { n:files.length });
  $$('[data-exp]').forEach(b => b.disabled = (b.dataset.exp.startsWith('t') ? !media.length : b.dataset.exp.startsWith('f') ? !files.length : b.dataset.exp.startsWith('l') ? !LISTS.length : !(media.length || files.length)));
  $('exList').innerHTML = LISTS.map(l => `<option value="${esc(l.id)}">${esc(l.name)} (${listCount(l.id)})</option>`).join('') || `<option value="">${esc(t('l_none'))}</option>`;
  if (curTab === 'insights') renderInsights(); if (curTab === 'lists') renderListsPage(); if (curTab === 'profile') renderProfile();
  syncClear(); renderTracker(); renderHome(); if (typeof renderMe === 'function') renderMe();
}
function syncClear() {
  const ok = $('clearOk').checked;
  document.querySelector('[data-clear="media"]').disabled = !ok || !media.length;
  document.querySelector('[data-clear="videos"]').disabled = !ok || !files.length;
  document.querySelector('[data-clear="thumbs"]').disabled = !ok || !files.some(r => r.thumb);
}
async function reload() {
  PVER++;
  files = (await DB.all('videos')).sort((a, b) => b.addedAt - a.addedAt); media = await DB.all('media'); if (await normalizeTags()) { files = (await DB.all('videos')).sort((a, b) => b.addedAt - a.addedAt); media = await DB.all('media'); } await loadLists(); await loadListOrder(); await loadProfile();
  const mem = new Set(media.map(m => m.id)); [...TS.sel].forEach(id => !mem.has(id) && TS.sel.delete(id));
  fileView && fileView.refresh(); renderAll();
  const tl = [...new Set([...GENRE_KEYS.map(gname), ...media.flatMap(m => (m.genre || []).map(gname)), ...files.flatMap(r => (r.genre || []).map(gname))])]; $('tagList').innerHTML = tl.map(x => `<option value="${esc(x)}">`).join('');
}
async function deleteFile(id) { if (await ask(t('t_confirm_del'))) { await DB.del('videos', id); reload(); } }
async function trackFiles(ids) {
  const have = new Set(media.map(m => { const f = fileOfMedia(m); return f ? f.sig : m.fileSig; }).filter(Boolean)), haveK = new Set(media.map(mediaKey)); let n = 0, d = 0; const recs = [];
  for (const id of ids) {
    const r = files.find(x => x.id === id); if (!r) continue;
    const title = r.titleCn || r.titleEn || r.fileName.replace(/\.[^.]+$/, ''), rec = { title, alt:r.titleCn && r.titleEn ? r.titleEn : '', creator:r.director || r.people || '', cast:r.cast || r.people || '', writers:r.writers || '', producers:r.producers || '', language:r.language || '', runtime:r.cls === 'book' ? null : r.runtime || (r.duration ? Math.round(r.duration / 60) : null), type:TYPES[r.kind] ? r.kind : 'film', pages:r.pages || null, status:'want', year:r.year, genre:r.genre || [], notes:r.description || '', fileSig:r.sig, rating:0, progress:'', cover:'', addedAt:Date.now() + n };
    if (have.has(r.sig) || haveK.has(mediaKey(rec))) { d++; continue; }
    have.add(r.sig); haveK.add(mediaKey(rec)); recs.push(rec); n++;
  }
  if (recs.length) await DB.putMany('media', recs); await reload(); return { n, d };
}
async function trackFile(id) { const r = await trackFiles([id]); toast(r.n ? t('t_tracked') : t('t_already'), !r.n); }

/* ---- navigation & settings wiring ---- */
$('side').addEventListener('click', e => { const b = e.target.closest('.nav[data-tab]'); if (b) setTab(b.dataset.tab); });
document.addEventListener('click', e => { const g = e.target.closest('[data-goto]'); if (g) setTab(g.dataset.goto); });
const bindSeg = (id, key, after) => $(id).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; prefs[key] = b.dataset.v; store.set('vmm.' + key, prefs[key]); if (after) after(); applyLang(); });
bindSeg('segRot', 'rot'); bindSeg('segSide', 'side', () => {}); bindSeg('segLang', 'lang'); bindSeg('segTheme', 'theme', applyTheme); bindSeg('segClock', 'clock');
bindSeg('segWp', 'wp', () => { HS.wpFor = ''; });
$('btnSaveQ').onclick = () => { prefs.myq = $('myQ').value; store.set('vmm.myq', prefs.myq); tick(true); toast(t('t_saved')); };
function renderGallery() {
  $('gal').innerHTML = WP_LIST.slice().sort((a, b) => (prefs.lang === 'zh' ? (b.c === 'cn') - (a.c === 'cn') : (a.c === 'cn') - (b.c === 'cn'))).map(w => `<button data-f="${esc(w.f)}" aria-pressed="${prefs.wpFixed === w.f}" title="${esc(wpT(w) + ' — ' + wpA(w))}"><img loading="lazy" src="${esc(wpUrl(w, 330))}" alt=""><span>${esc(wpT(w))}</span></button>`).join('');
}
$('gal').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; prefs.wpFixed = b.dataset.f; store.set('vmm.wpFixed', prefs.wpFixed); HS.wpFor = ''; renderGallery(); tick(true); });
const shrinkImage = f => new Promise(res => { const url = URL.createObjectURL(f), img = new Image(); img.onload = () => { const k = Math.min(1, 2000 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', .84)); }; img.onerror = () => res(null); img.src = url; });
const saveMine = () => DB.put('kv', { k:'wpmine', v:mineList });
