/* =====================================================================
   Open a file and remember where you stopped (v18)
   The catalogue only knew about files; this is what lets it open them. Four things live here:
     opening   a file handle kept in IndexedDB (Chrome, Edge) reopens the file with one click; elsewhere a file picked in this
               session is remembered until the tab closes, and after that you are asked for it once ("Find the file")
     memory    where you stopped, bookmarks, highlights: two small records in kv ('pos', 'marks'), keyed by file name + size so the
               same file on another device lands on the same place (js/21c-cloud-sync.js carries them there)
     link      a tracker item and a file are one thing seen twice: the item finds its file (by the link, else by its title), and
               its progress is the file's position, never a second copy that can disagree
     tracker   starting a file moves its item to "doing"; reaching the end marks it done, with Undo in the message
   Nothing here uploads a file: what is read stays in the tab.
   ===================================================================== */
const xkey = r => (r.fileName || '') + '|' + (r.fileSize || 0);          // the same file on another device: same name and size (the modified time changes with a copy)
const FH = { mem:new Map() };                                           // sig → File picked or dropped in this session (browsers that cannot keep a handle)
const fhGet = async id => { try { const r = await DB.get('kv', 'fh:' + id); return (r && r.v) || null; } catch (e) { return null; } };
/* DB.put reads any failure as "IndexedDB is not available" and drops the whole app into memory-only mode, so a handle the browser cannot store
   is tried with structuredClone first: the worst outcome is that the file is asked for again next time. */
const canKeep = h => { try { structuredClone(h); return true; } catch (e) { return false; } };
const fhPut = async (id, h) => { if (h && h.kind === 'file' && canKeep(h)) { try { await DB.put('kv', { k:'fh:' + id, v:h }); } catch (e) {} } };
async function fhFile(h) {
  let p = await h.queryPermission({ mode:'read' });
  if (p !== 'granted') p = await h.requestPermission({ mode:'read' });          // needs the click that started this; one prompt per browser session
  return p === 'granted' ? h.getFile() : null;
}
/* One way to choose files in every browser. Chrome and Edge give handles (so the file opens again with one click); elsewhere an <input> that is
   attached to the page: Safari never fires the change event of one that is only held in a variable. Resolves null when nothing was chosen. */
function pickLocal(o = {}) {
  return new Promise(async res => {
    if (window.showOpenFilePicker) {
      try { const hs = await showOpenFilePicker({ multiple:!!o.multiple }); res({ files:await Promise.all(hs.map(h => h.getFile())), handles:hs }); }
      catch (e) { res(null); }
      return;
    }
    const i = document.createElement('input'); i.type = 'file'; i.multiple = !!o.multiple; if (o.accept) i.accept = o.accept; i.hidden = true; i.tabIndex = -1; document.body.appendChild(i);
    const end = v => { i.remove(); res(v); };
    i.addEventListener('change', () => end(i.files && i.files.length ? { files:[...i.files], handles:[] } : null));
    i.addEventListener('cancel', () => end(null));
    i.click();
  });
}
/* the File for a record, or null when we have to ask */
async function fileFor(rec) {
  const m = FH.mem.get(rec.sig); if (m) return m;
  try {
    if (rec.dir && typeof dirFile === 'function') { const f = await dirFile(rec); if (f) return f; }      // one permission for the whole folder
    const h = await fhGet(rec.id); if (h) { const f = await fhFile(h); if (f) return f; }
  } catch (e) { /* moved, renamed or permission refused: fall through to asking */ }
  return null;
}
/* "Find the file": a picker and a drop target. Same name and size is the same file; anything else asks first. */
function locateFile(rec) {
  return uiDialog(`<div class="loc"><h3>${esc(t('loc_h'))}</h3><p class="ask-msg">${esc(t('loc_d', { name:rec.fileName, size:fmtSize(rec.fileSize || 0) }))}</p>
    <div class="upload-zone" data-drop tabindex="0" role="button" aria-label="${esc(t('loc_pick'))}"><i class="ti ti-file-search upload-icon" aria-hidden="true"></i><div class="upload-text">${esc(t('loc_drop'))}</div></div>
    <div class="ask-btns"><button type="button" class="btn" data-no>${esc(t('cancel'))}</button><button type="button" class="btn primary" data-pick>${esc(t('loc_pick'))}</button></div></div>`,
  (d, done) => {
    const take = async (f, h) => {
      if (!f) return;
      if ((f.name !== rec.fileName || f.size !== rec.fileSize) && !(await ask(t('loc_diff', { name:f.name }), { safe:true, yes:t('loc_use') }))) return;
      FH.mem.set(rec.sig, f); if (h) await fhPut(rec.id, h); done(f);
    };
    const pick = async () => { const r = await pickLocal({ multiple:false }); if (r) take(r.files[0], r.handles[0]); };
    d.querySelector('[data-no]').onclick = () => done(null); d.querySelector('[data-pick]').onclick = pick;
    const z = d.querySelector('[data-drop]'); z.onclick = pick; z.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } };
    ['dragenter', 'dragover'].forEach(n => z.addEventListener(n, e => { e.preventDefault(); z.classList.add('active'); }));
    ['dragleave', 'drop'].forEach(n => z.addEventListener(n, e => { e.preventDefault(); z.classList.remove('active'); }));
    z.addEventListener('drop', async e => { const it = e.dataTransfer.items && e.dataTransfer.items[0]; let h = null; try { h = it && it.getAsFileSystemHandle ? await it.getAsFileSystemHandle() : null; } catch (x) {} take(e.dataTransfer.files[0], h && h.kind === 'file' ? h : null); });
    d.querySelector('[data-pick]').focus();
  });
}

/* ---------- where you stopped, and what you marked ----------
   pos[key]   { p: 0..1, v: seconds | "chapter:fraction" | page, at: ms, n: length or pages }
   marks[key] { bm: [{ id, v, label, at, x? }], hl: [{ id, c, a, b, text, note, color, at, x? }] }   x = deleted (kept so a deletion syncs) */
const POS = {
  data:{}, marks:{}, tm:0,
  load: null,
  get(rec) { return this.data[xkey(rec)] || null; },
  set(rec, p, v, n) { this.data[xkey(rec)] = { p:Math.max(0, Math.min(1, p || 0)), v, at:Date.now(), n:n || 0 }; clearTimeout(this.tm); this.tm = setTimeout(() => this.flush(), 2500); },
  flush() { clearTimeout(this.tm); this.tm = 0; return DB.put('kv', { k:'pos', v:this.data }); },
  m(rec) { const k = xkey(rec); return this.marks[k] || (this.marks[k] = { bm:[], hl:[] }); },
  live(rec, kind) { return this.m(rec)[kind].filter(x => !x.x); },
  add(rec, kind, item) { item.id = item.id || syUid(); item.at = Date.now(); this.m(rec)[kind].push(item); return this.saveMarks(); },
  drop(rec, kind, id) { const x = this.m(rec)[kind].find(i => i.id === id); if (x) { x.x = 1; x.at = Date.now(); } return this.saveMarks(); },
  edit(rec, kind, id, patch) { const x = this.m(rec)[kind].find(i => i.id === id); if (x) { Object.assign(x, patch); x.at = Date.now(); } return this.saveMarks(); },
  saveMarks() { return DB.put('kv', { k:'marks', v:this.marks }); }
};
POS.ready = (async () => {
  try { POS.data = ((await DB.get('kv', 'pos')) || {}).v || {}; POS.marks = ((await DB.get('kv', 'marks')) || {}).v || {}; } catch (e) { /* a fresh start is fine */ }
  if (typeof renderHome === 'function') renderHome();
})();
addEventListener('pagehide', () => { if (POS.tm) POS.flush(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && POS.tm) POS.flush(); });

/* ---------- time spent: seconds per day and kind (video, audio, book), a small record in kv; it feeds the "last 7 days" card on Files ---------- */
const STAT = {
  data:null, tm:0,
  async load() { if (!this.data) this.data = ((await DB.get('kv', 'stat')) || {}).v || {}; return this.data; },
  /* one second at a time, saved at most every few seconds and always when the tab is hidden or closed, so short sessions count too */
  async add(kind, secs) { const d = await this.load(), day = new Date().toISOString().slice(0, 10), r = d[day] || (d[day] = {}); r[kind] = (r[kind] || 0) + secs; if (!this.tm) this.tm = setTimeout(() => this.flush(), 4000); },
  flush() { clearTimeout(this.tm); this.tm = 0; if (this.data) DB.put('kv', { k:'stat', v:this.data }); },
  async by(days = 7) { const d = await this.load(), cut = Date.now() - days * 864e5, o = { video:0, audio:0, book:0 }; for (const [day, r] of Object.entries(d)) if (new Date(day).getTime() >= cut - 864e5) for (const [k, v] of Object.entries(r)) o[k] = (o[k] || 0) + v; return o; },
  async week() { return Object.values(await this.by(7)).reduce((a, b) => a + b, 0); }
};
addEventListener('pagehide', () => STAT.flush());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') STAT.flush(); });

/* ---------- a tracker item and its file ---------- */
const normTitle = s => String(s || '').toLowerCase().replace(/\.[a-z0-9]{2,5}$/, '').replace(/^(the|an?)\s+/, '').replace(/[\s._\-—–:：·'’"“”‘()（）[\]【】《》,，。!！?？]+/g, '');
const FM = { src:null, n:-1, byTitle:new Map(), bySig:new Map() };
function fmIndex() {
  if (FM.src === files && FM.n === files.length) return;
  FM.src = files; FM.n = files.length; FM.byTitle = new Map(); FM.bySig = new Map();
  for (const f of files) {
    FM.bySig.set(f.sig, f);
    for (const k of new Set([f.titleCn, f.titleEn, (f.fileName || '').replace(/\.[^.]+$/, '')].map(normTitle).filter(Boolean))) (FM.byTitle.get(k) || FM.byTitle.set(k, []).get(k)).push(f);
  }
}
const classFits = (m, f) => { const c = fileClass(f); return m.type === 'book' ? c === 'book' : m.type === 'music' ? c === 'audio' : ['film', 'series', 'anime'].includes(m.type) ? c === 'video' : true; };
/* the file of a tracker item: its link, else the one file whose title is the same. Two files with that title: none is guessed. */
function fileOfMedia(m) {
  if (!m) return null; fmIndex();
  if (m.fileSig) { const f = FM.bySig.get(m.fileSig); if (f) return f; }
  for (const k of new Set([m.title, m.alt].map(normTitle).filter(Boolean))) { const c = (FM.byTitle.get(k) || []).filter(f => classFits(m, f)); if (c.length === 1) return c[0]; }
  return null;
}
const trackerOf = rec => media.find(m => m.fileSig === rec.sig) || media.find(m => !m.fileSig && fileOfMedia(m) === rec) || null;
const progressLabel = (f, p) => p.p >= .985 ? '100%' : fileClass(f) === 'book' ? Math.round(p.p * 100) + '%' : Math.round(p.p * 100) + '% · ' + fmtClock(p.v || 0);
/* The one progress. A linked item shows the file's position (and 100% once done); an item with no file keeps what was typed. */
function progressOf(m) {
  const f = fileOfMedia(m); if (!f) return m.progress || '';
  if (m.status === 'done') return '100%';
  const p = POS.get(f); return p && p.p > 0 ? progressLabel(f, p) : m.progress || '';
}
const followsFile = m => { const f = fileOfMedia(m); return !!f && !!POS.get(f) && POS.get(f).p > 0; };
async function trackerStarted(rec) {
  const m = trackerOf(rec); if (!m) return;
  const patch = {}; if (!m.fileSig) patch.fileSig = rec.sig; if (m.status === 'want') { patch.status = 'doing'; patch.startedAt = Date.now(); }
  if (!Object.keys(patch).length) return; await DB.put('media', { ...m, ...patch }); await reload();
}
async function trackerProgress(rec, p) {
  const m = trackerOf(rec); if (!m) return; const label = progressLabel(rec, { p, v:POS.get(rec) ? POS.get(rec).v : 0 });
  if (m.progress === label) return; await DB.put('media', { ...m, progress:label }); await reload();
}
/* reaching the end marks the tracker item done, quietly, with Undo in the message. There is no dialog and no setting: finishing is finishing. */
async function trackerFinished(rec) {
  const m = trackerOf(rec); if (!m || m.status === 'done') return;
  const was = JSON.parse(JSON.stringify(m));
  await DB.put('media', { ...m, status:'done', doneAt:Date.now(), progress:'100%' }); await reload();
  toast(t('fin_done', { title:m.title }), false, async () => { await DB.put('media', was); await reload(); toast(t('t_undone')); });
}
/* "Read" / "Play" on a tracker item: its file if there is one, else choose the file once and the link is kept */
async function chooseFileFor(m) {
  const r = await pickLocal({ multiple:false }); if (!r) return null; const file = r.files[0];
  if (!classOf(file)) { toast(t('fp_unsupported', { name:file.name }), true); return null; }
  const sig = sigOf(file); FH.mem.set(sig, file);
  let rec = files.find(x => x.sig === sig);
  if (!rec) { await importFiles([file], r.handles, undefined, { track:false }); rec = files.find(x => x.sig === sig); }
  else if (r.handles[0]) await fhPut(rec.id, r.handles[0]);
  return rec || null;
}
async function openForMedia(id, o) {
  const m = typeof id === 'object' ? id : media.find(x => x.id === Number(id)); if (!m) return;
  let f = fileOfMedia(m); if (!f) f = await chooseFileFor(m); if (!f) return;
  if (m.fileSig !== f.sig) { await DB.put('media', { ...m, fileSig:f.sig }); await reload(); }
  return openFile(files.find(x => x.id === f.id) || f, o);
}
const mediaWantsFile = m => ['film', 'series', 'anime', 'music', 'book'].includes(m.type);
/* the small Read / Play button on a tracker row or cover; nothing when the item has no file */
function openMediaBtn(m, cls) {
  const f = fileOfMedia(m); if (!f) return '';
  const label = fileVerb(f) + ': ' + (m.title || '');
  return `<button type="button" class="${cls || 'btn sm opn'}" data-open-media aria-label="${esc(label)}" data-tip="${esc(label)}"><i class="ti ti-${fileVerbIcon(f)}"></i>${cls ? '' : `<span>${esc(fileVerb(f))}</span>`}</button>`;
}
document.addEventListener('click', e => {                                   // before the grids see the click, so it never also opens the drawer
  const b = e.target.closest('[data-open-media]'); if (!b) return; if (typeof TS !== 'undefined' && TS.selecting) return;
  const host = b.closest('[data-id]'); if (!host) return; e.preventDefault(); e.stopPropagation(); openForMedia(host.dataset.id);
}, true);

/* ---------- screen kept awake while you watch or read ---------- */
const AWAKE = {
  lock:null, want:false,
  async on() { this.want = true; try { if (navigator.wakeLock && !this.lock) { this.lock = await navigator.wakeLock.request('screen'); this.lock.addEventListener('release', () => { this.lock = null; }); } } catch (e) {} },
  async off() { this.want = false; try { if (this.lock) await this.lock.release(); } catch (e) {} this.lock = null; }
};
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && AWAKE.want) AWAKE.on(); });

/* ---------- one way in: openFile(record, { queue, start }) ---------- */
async function openFile(rec, o = {}) {
  if (!rec) return;
  await POS.ready;
  let f = await fileFor(rec);
  if (!f) f = await locateFile(rec);
  if (!f) return;
  rec = files.find(x => x.id === rec.id) || rec;
  if (fileClass(rec) === 'book') return readerOpen(rec, f, o);
  if (!o.side && typeof dirSubs === 'function') o = { ...o, side:await dirSubs(rec) };                     // subtitle files that sit beside it
  return playerOpen(rec, f, o);
}
const openFileById = (id, o) => openFile(files.find(x => x.id === Number(id)), o);
/* Play or Read, whichever the file is */
const fileVerb = r => t(fileClass(r) === 'book' ? 'fp_read' : 'fp_play');
const fileVerbIcon = r => fileClass(r) === 'book' ? 'book-2' : 'player-play';
/* what "Resume" shows on the Home shelf */
function resumeLabel(rec) {
  const p = POS.get(rec); if (!p || !(p.p > 0)) return '';
  return fileClass(rec) === 'book' ? Math.round(p.p * 100) + '%' : fmtClock(p.v || 0);
}
const fmtClock = s => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
