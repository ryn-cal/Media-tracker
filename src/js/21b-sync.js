/* Sync between devices without a server: library and lists go to one JSON file you keep in your own cloud folder (iCloud, Drive, Dropbox…).
   Every record carries uid + upd; the newest upd wins and deletions travel as tombstones. Where the browser can keep a file handle
   (Chrome/Edge on desktop) "Sync now" reads, merges and writes the file; elsewhere Save / Merge do the same by hand. Video files are not synced. */
const SY = { applying:false, tomb:null, raw:{ put:DB.put, putMany:DB.putMany, del:DB.del, delMany:DB.delMany } };
const syTomb = async () => SY.tomb || (SY.tomb = ((await DB.get('kv', 'tomb')) || {}).v || {});
const syUid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const syHash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0; return h; };
const syStamp = r => { if (!r.uid) r.uid = syUid(); if (!SY.applying) r.upd = Date.now(); return r; };
async function syGone(keys) { if (SY.applying || !keys.length) return; const tb = await syTomb(), now = Date.now(); keys.forEach(k => { tb[k] = now; }); await SY.raw.put('kv', { k:'tomb', v:tb }); }
async function syLists(rec) {
  const old = ((await DB.get('kv', 'lists')) || {}).v || [], ids = new Set(rec.v.map(l => l.id));
  await syGone(old.filter(l => !ids.has(l.id)).map(l => 'l:' + l.id));
  if (!SY.applying) rec.v.forEach(l => { const { upd, h, ...rest } = l, sig = syHash(JSON.stringify(rest)); if (l.h !== sig || !l.upd) { l.h = sig; l.upd = Date.now(); } });
}
/* a change to what syncs asks the account sync (js/21c-cloud-sync.js) for a round a little later */
const syTouch = () => { if (!SY.applying && typeof cloudTouch === 'function') cloudTouch(); };
DB.put = async (n, r) => { if (n === 'media') syStamp(r); else if (n === 'kv' && r.k === 'lists') await syLists(r); if (n === 'media' || (n === 'kv' && /^(lists|pos|marks)$/.test(r.k))) syTouch(); return SY.raw.put(n, r); };
DB.putMany = (n, rs) => { if (n === 'media') syTouch(); return SY.raw.putMany(n, n === 'media' ? rs.map(syStamp) : rs); };
DB.del = async (n, id) => { if (n === 'media') { await syGone(media.filter(m => m.id === id && m.uid).map(m => m.uid)); syTouch(); } return SY.raw.del(n, id); };
DB.delMany = async (n, ids) => { if (n === 'media') { await syGone(media.filter(m => ids.includes(m.id) && m.uid).map(m => m.uid)); syTouch(); } return SY.raw.delMany(n, ids); };

const syFile = () => JSON.stringify({ app:'media-tracker-sync', v:2, at:new Date().toISOString(), media:media.map(({ id, ...r }) => r), lists:LISTS, tomb:SY.tomb || {}, pos:POS.data, marks:POS.marks, stat:STAT.data || {} });
/* where you stopped (the newer wins per file), bookmarks and highlights (per item, the newer wins; a deletion is an item marked x), time spent (the larger count per day) */
async function syExtra(rm) {
  let ch = false;
  for (const [k, r] of Object.entries(rm.pos || {})) { const l = POS.data[k]; if (r && typeof r === 'object' && (!l || (r.at || 0) > (l.at || 0))) { POS.data[k] = r; ch = true; } }
  for (const [k, r] of Object.entries(rm.marks || {})) {
    const l = POS.marks[k] || (POS.marks[k] = { bm:[], hl:[] });
    for (const kind of ['bm', 'hl']) { const by = new Map((l[kind] || []).map(x => [x.id, x])); for (const x of (r && r[kind]) || []) { if (!x || !x.id) continue; const o = by.get(x.id); if (!o || (x.at || 0) > (o.at || 0)) { by.set(x.id, x); ch = true; } } l[kind] = [...by.values()]; }
  }
  const st = await STAT.load();
  for (const [day, r] of Object.entries(rm.stat || {})) { const l = st[day] || (st[day] = {}); for (const [k, v] of Object.entries(r || {})) if (typeof v === 'number' && (l[k] || 0) < v) { l[k] = v; ch = true; } }
  if (ch) { await SY.raw.put('kv', { k:'pos', v:POS.data }); await SY.raw.put('kv', { k:'marks', v:POS.marks }); await SY.raw.put('kv', { k:'stat', v:st }); }
}
async function syMerge(rm) {
  const tb = await syTomb(), gone = (k, u) => tb[k] >= (u || 0); SY.applying = true;
  try {
    Object.entries(rm.tomb || {}).forEach(([k, v]) => { if (!(tb[k] >= v)) tb[k] = v; });
    const byUid = new Map(media.filter(m => m.uid).map(m => [m.uid, m])), byKey = new Map(media.map(m => [mediaKey(m), m])), put = new Map(), del = [];
    let a = 0, u = 0;
    for (const r of rm.media || []) {
      if (!r || !r.title || !r.uid || gone(r.uid, r.upd)) continue;
      const l = byUid.get(r.uid) || byKey.get(mediaKey(r));
      if (!l) { const n = { ...r }; delete n.id; put.set(r.uid, n); byUid.set(r.uid, n); a++; }
      else if ((r.upd || 0) > (l.upd || 0)) { put.set(l.id, { ...r, id:l.id }); u++; }
      else if (l.uid !== r.uid) put.set(l.id, { ...l, uid:r.uid });
    }
    media.forEach(m => { if (m.uid && gone(m.uid, m.upd)) del.push(m.id); else if (!m.uid && !put.has(m.id)) put.set(m.id, { ...m, uid:syUid(), upd:m.upd || m.addedAt || 0 }); });
    let L = LISTS.slice();
    for (const r of rm.lists || []) { if (!r || !r.id || gone('l:' + r.id, r.upd)) continue; const i = L.findIndex(x => x.id === r.id); if (i < 0) L.push(r); else if ((r.upd || 0) > (L[i].upd || 0)) L[i] = r; }
    L = L.filter(l => !gone('l:' + l.id, l.upd));
    const cut = Date.now() - 90 * 864e5; Object.keys(tb).forEach(k => { if (tb[k] < cut) delete tb[k]; });
    if (put.size) await SY.raw.putMany('media', [...put.values()]);
    if (del.length) await SY.raw.delMany('media', del);
    await SY.raw.put('kv', { k:'lists', v:L }); await SY.raw.put('kv', { k:'tomb', v:tb });
    await syExtra(rm);
    return { a, u, d:del.length };
  } finally { SY.applying = false; await reload(); }
}
const syDone = r => $('syLog').insertAdjacentHTML('afterbegin', `<div class="ok"><i class="ti ti-check"></i> ${esc(t('sync_done', r))}</div>`);
async function syNow(pick) {
  try {
    let h = ((await DB.get('kv', 'syncH')) || {}).v;
    if (!h || pick) { h = await showSaveFilePicker({ suggestedName:'media-tracker-sync.json', types:[{ description:'JSON', accept:{ 'application/json':['.json'] } }] }); await SY.raw.put('kv', { k:'syncH', v:h }); }
    if (await h.requestPermission({ mode:'readwrite' }) !== 'granted') return;
    const txt = await (await h.getFile()).text(), r = await syMerge(txt.trim() ? JSON.parse(txt) : {});
    const w = await h.createWritable(); await w.write(syFile()); await w.close(); syDone(r); syPaint();
  } catch (e) { if (e.name !== 'AbortError') toast(t('sync_err'), true); }
}
async function syPaint() { const h = ((await DB.get('kv', 'syncH')) || {}).v; $('syNow').lastElementChild.textContent = h ? t('sync_now') + ' · ' + h.name : t('sync_pick'); $('syForget').hidden = !h; }
/* cloud option: any WebDAV address (Nutstore/Jianguoyun, Nextcloud, Synology, Box…); the login stays on this device */
async function syDav() {
  const old = ((await DB.get('kv', 'syDav')) || {}).v || {}, c = { url:$('syUrl').value.trim(), user:$('syUser').value.trim(), pw:$('syPw').value || old.pw || '' };
  if (!/^https?:\/\//i.test(c.url)) return toast(t('sync_err'), true);
  const hd = { Authorization:'Basic ' + btoa(unescape(encodeURIComponent(c.user + ':' + c.pw))) };
  try {
    await SY.raw.put('kv', { k:'syDav', v:c });
    const g = await fetch(c.url, { headers:hd, cache:'no-store' }); if (g.status === 401 || g.status === 403) throw 'auth'; if (!g.ok && g.status !== 404) throw 0;
    const txt = g.ok ? await g.text() : '', r = await syMerge(txt.trim() ? JSON.parse(txt) : {});
    const p = await fetch(c.url, { method:'PUT', headers:{ ...hd, 'Content-Type':'application/json' }, body:syFile() }); if (!p.ok) throw 0;
    syDone(r); $('syPw').value = '';
  } catch (e) { toast(t(e === 'auth' ? 'sync_auth' : e instanceof TypeError ? 'sync_cors' : 'sync_err'), true); }
}
$('syDavGo').onclick = syDav;
(async () => { const c = ((await DB.get('kv', 'syDav')) || {}).v; if (c) { $('syUrl').value = c.url; $('syUser').value = c.user; $('syPw').placeholder = '••••••••'; $('syDavForget').hidden = false; } })();   // the saved password is never put back on screen
$('syDavForget').onclick = async () => { await SY.raw.del('kv', 'syDav'); $('syUrl').value = $('syUser').value = $('syPw').value = ''; $('syPw').placeholder = t('sync_pw'); $('syDavForget').hidden = true; };
$('syNow').hidden = !window.showSaveFilePicker;
$('syNow').onclick = () => syNow(false);
$('syForget').onclick = async () => { await SY.raw.del('kv', 'syncH'); syPaint(); };
$('sySave').onclick = async () => { await syTomb(); download(`media-tracker-sync-${stamp()}.json`, syFile(), 'application/json'); };
$('syMerge').onclick = () => $('syPick').click();
$('syPick').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { const d = JSON.parse(await f.text()); if (d.app !== 'media-tracker-sync') throw 0; syDone(await syMerge(d)); } catch (err) { toast(t('t_bad'), true); }
};
$('impTabs').addEventListener('click', e => { if (e.target.closest('[data-v=sync]')) syPaint(); });
