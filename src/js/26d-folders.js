/* =====================================================================
   Library folders (v18)
   Point the app at a folder once (Chrome, Edge); it finds the videos, music and books in it, catalogues what is new each time you
   rescan, and opens any of them later with one permission for the whole folder. Subtitle files that sit next to a video and carry
   the same name are loaded with it. Where the browser cannot keep a folder (Safari, Firefox), "Choose a folder" still catalogues it
   for this session and the files open until the tab is closed.
   Inspired by Moon+ Reader's "import new books in selected folders to the shelf automatically".
   ===================================================================== */
const DIRS = { list:[], busy:false };
const SUB_EXT = /\.(srt|vtt|ass|ssa)$/i, SKIP_DIR = /^(\.|node_modules$|\$RECYCLE|System Volume)/i;
const dirGet = async id => { try { const r = await DB.get('kv', 'dh:' + id); return (r && r.v) || null; } catch (e) { return null; } };
async function dirLoad() { try { DIRS.list = ((await DB.get('kv', 'dirs')) || {}).v || []; } catch (e) { DIRS.list = []; } dirPaint(); }
const dirSave = () => DB.put('kv', { k:'dirs', v:DIRS.list });
async function dirAllowed(d, mode) {
  let p = await d.queryPermission({ mode:mode || 'read' }); if (p !== 'granted') p = await d.requestPermission({ mode:mode || 'read' });
  return p === 'granted';
}
async function dirWalk(rec) {                                              // the parent folder handle of a catalogued file
  const d = await dirGet(rec.dir); if (!d || !(await dirAllowed(d))) return null; let cur = d;
  for (const part of rec.rel.slice(0, -1)) cur = await cur.getDirectoryHandle(part);
  return cur;
}
async function dirFile(rec) {                                              // used by fileFor() in js/26a-open-and-resume.js
  if (!rec.rel || !rec.rel.length) return null; const p = await dirWalk(rec); if (!p) return null;
  return (await p.getFileHandle(rec.rel[rec.rel.length - 1])).getFile();
}
/* subtitle files beside a video, same name before the extension: "Film.mkv" → "Film.srt", "Film.zh.srt" */
async function dirSubs(rec) {
  if (!rec.dir || !rec.rel) return []; const out = [];
  try { const p = await dirWalk(rec); if (!p) return out; const base = rec.rel[rec.rel.length - 1].replace(/\.[^.]+$/, '').toLowerCase();
    for await (const [name, h] of p.entries()) { if (h.kind === 'file' && SUB_EXT.test(name) && name.toLowerCase().startsWith(base)) out.push(await h.getFile()); } } catch (e) {}
  return out;
}
/* what a folder holds: [{ file, handle, rel }] */
async function dirScan(handle, prefix, depth, out, tick) {
  for await (const [name, h] of handle.entries()) {
    if (name.startsWith('.')) continue;
    if (h.kind === 'directory') { if (depth < 8 && !SKIP_DIR.test(name)) await dirScan(h, [...prefix, name], depth + 1, out, tick); continue; }
    if (!(EXT_RE.video.test(name) || EXT_RE.audio.test(name) || EXT_RE.book.test(name))) continue;
    try { const f = await h.getFile(); if (/\.txt$/i.test(name) && f.size < 8192) continue; out.push({ file:f, handle:h, rel:[...prefix, name] }); tick && tick(out.length); } catch (e) { /* unreadable: skipped */ }
  }
}
async function folderAdd(handle) {
  if (!handle || handle.kind !== 'directory') return;
  let ent = DIRS.list.find(d => d.name === handle.name); const id = ent ? ent.id : 'd' + Date.now().toString(36);
  for (const d of DIRS.list) { const h = await dirGet(d.id); if (h && h.isSameEntry && await h.isSameEntry(handle).catch(() => false)) { ent = d; break; } }
  if (!canKeep(handle)) return toast(t('fo_err'), true);
  if (ent) { await DB.put('kv', { k:'dh:' + ent.id, v:handle }); return folderScan(ent.id); }
  DIRS.list.push({ id, name:handle.name, added:Date.now(), last:0, n:0 }); await DB.put('kv', { k:'dh:' + id, v:handle }); await dirSave(); dirPaint(); return folderScan(id);
}
async function folderPick() {
  if (window.showDirectoryPicker) { try { const h = await showDirectoryPicker({ mode:'read' }); return folderAdd(h); } catch (e) { if (e.name !== 'AbortError') toast(t('fo_err'), true); return; } }
  $('dirPickFallback').click();                                            // Safari, Firefox: a one-off pass over the folder, no memory of it
}
async function folderScan(id) {
  const ent = DIRS.list.find(d => d.id === id); if (!ent || DIRS.busy) return; const h = await dirGet(id); if (!h) return toast(t('fo_gone'), true);
  if (!(await dirAllowed(h))) return toast(t('fo_denied'), true);
  DIRS.busy = true; dirPaint(); const log = $('log'); log.textContent = t('fo_scanning', { n:0 });
  try {
    const found = []; await dirScan(h, [], 0, found, n => { if (n % 20 === 0) log.textContent = t('fo_scanning', { n }); });
    const have = new Map(files.map(f => [f.sig, f])), fresh = found.filter(x => !have.has(sigOf(x.file))), same = found.filter(x => have.has(sigOf(x.file)));
    /* files already catalogued get the folder as a second way to open them */
    for (const x of same) { const r = have.get(sigOf(x.file)); if (r.dir !== id || (r.rel || []).join('/') !== x.rel.join('/')) await DB.put('videos', { ...r, dir:id, rel:x.rel }); }
    if (fresh.length) await importFiles(fresh.map(x => x.file), fresh.map(x => x.handle), fresh.map(x => ({ dir:id, rel:x.rel })));
    const seen = new Set(found.map(x => xkey({ fileName:x.file.name, fileSize:x.file.size }))), missing = files.filter(f => f.dir === id && !seen.has(xkey(f))).length;
    ent.last = Date.now(); ent.n = found.length; ent.missing = missing; await dirSave(); await reload();
    toast(t('fo_done', { new:fresh.length, n:found.length }) + (missing ? ' · ' + t('fo_missing', { n:missing }) : ''));
  } catch (e) { toast(t('fo_err'), true); }
  finally { DIRS.busy = false; dirPaint(); }
}
function dirPaint() {
  const box = $('dirBox'); if (!box) return; const can = !!window.showDirectoryPicker;
  box.innerHTML = `<div class="dir-h"><b>${esc(t('fo_h'))}</b><span>${esc(t(can ? 'fo_d' : 'fo_d_nofs'))}</span></div>
    ${DIRS.list.map(d => `<div class="dir-row"><i class="ti ti-folder"></i><div class="grow"><b>${esc(d.name)}</b><span>${esc(d.last ? t('fo_last', { n:d.n, when:new Date(d.last).toLocaleString(locOf()) }) + (d.missing ? ' · ' + t('fo_missing', { n:d.missing }) : '') : t('fo_never'))}</span></div>
      <button type="button" class="btn sm" data-dir="scan:${esc(d.id)}" ${DIRS.busy ? 'disabled' : ''}><i class="ti ti-refresh"></i><span>${esc(t('fo_rescan'))}</span></button>
      <button type="button" class="ibtn sm" data-dir="del:${esc(d.id)}" aria-label="${esc(t('fo_remove'))}" data-tip="${esc(t('fo_remove') + '\n' + t('fo_remove_d'))}"><i class="ti ti-x"></i></button></div>`).join('')}
    <div class="row-btns"><button type="button" class="btn ${DIRS.list.length ? '' : 'primary'}" data-dir="add"><i class="ti ti-folder-plus"></i><span>${esc(t('fo_add'))}</span></button>${DIRS.list.length > 1 ? `<button type="button" class="btn" data-dir="all"><i class="ti ti-refresh"></i><span>${esc(t('fo_rescan_all'))}</span></button>` : ''}</div>
    <input type="file" id="dirPickFallback" hidden webkitdirectory multiple>`;
  const fb = $('dirPickFallback'); if (fb) fb.onchange = async e => { const fl = [...e.target.files].filter(f => classOf(f) && !(/\.txt$/i.test(f.name) && f.size < 8192)); e.target.value = ''; if (fl.length) importFiles(fl); };
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-dir]'); if (!b) return; const [k, id] = b.dataset.dir.split(':');
  if (k === 'add') folderPick(); else if (k === 'scan') folderScan(id); else if (k === 'all') { for (const d of DIRS.list) await folderScan(d.id); }
  else if (k === 'del') { if (await ask(t('fo_remove_ask'), { safe:true, yes:t('fo_remove') })) { DIRS.list = DIRS.list.filter(d => d.id !== id); await DB.del('kv', 'dh:' + id); await dirSave(); dirPaint(); } }
});
dirLoad();
