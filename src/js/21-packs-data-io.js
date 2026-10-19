/* =====================================================================
   Plug-in packs: quotes, picture collections and interface languages are optional files.
   The app ships with a starter set; everything else is imported (or fetched from the packs/ folder) and kept in this browser.
   How often each pack and language comes up is tuned on the Plug-ins page — not in Settings.
   ===================================================================== */
const PACKS = { list:[], remote:null };                                    // list: installed packs { id, kind, name, desc, langs, count, bytes, data }
let PW = jsonStore('vmm.packw', { packs:{}, q:{}, p:{}, neutral:3, off:{} }); PW.off = PW.off || {};       // weights: per pack, quote language, picture language
const savePW = () => store.set('vmm.packw', JSON.stringify(PW));
const CORE_PACKS = [
  { id:'core-quotes', kind:'quotes', core:true, langs:['en', 'zh'], name:{ en:'Built-in poems', zh:'内置诗文', fr:'Poèmes intégrés' }, desc:{ en:'Poems and short lines for every time of day, in English and Chinese.', zh:'适合各个时段的中英文诗句。', fr:'Poèmes et courtes phrases pour chaque moment de la journée, en anglais et en chinois.' } },
  { id:'core-pictures', kind:'pictures', core:true, langs:['zh'], name:{ en:'Starter pictures', zh:'入门图片', fr:'Images de départ' }, desc:{ en:'A small set of paintings and landscapes, three for each time of day.', zh:'一小组绘画与风景，每个时段三幅。', fr:'Une petite sélection de peintures et de paysages, trois par moment de la journée.' } }
];
const packName = pk => (pk.name && (pk.name[prefs.lang] || pk.name.en)) || pk.id, packDesc = pk => (pk.desc && (pk.desc[prefs.lang] || pk.desc.en)) || '';
const packW = id => (PW.off && PW.off[id]) ? 0 : PW.packs[id] != null ? PW.packs[id] : (id === 'mine' ? 2 : 1);
const qLangW = l => PW.q[l] != null ? PW.q[l] : (l === prefs.lang ? 8 : 0);
const pLangW = l => !l ? PW.neutral : PW.p[l] != null ? PW.p[l] : (l === prefs.lang ? 8 : 1);
const allPacks = () => [...CORE_PACKS, ...PACKS.list];
function uiLangs() { const l = [['en', 'English'], ['zh', '中文']]; PACKS.list.filter(p => p.kind === 'ui').forEach(p => { if (!l.some(x => x[0] === p.lang)) l.push([p.lang, p.langName || p.lang]); }); return l; }
const LANG_NAMES = { en:'English', zh:'中文', ja:'日本語', fr:'Français', es:'Español', de:'Deutsch', ko:'한국어', it:'Italiano', pt:'Português', ru:'Русский' };
const langLabel = c => LANG_NAMES[c] || c;
/* languages that actually have something to show */
function dataLangs(kind) {
  const set = new Set();
  if (kind === 'quotes') { POEMS.forEach(q => q.l && q.l !== 'any' && set.add(q.l)); if (QMINED.q.length) set.add('en'); if (QZH_MINED.length) set.add('zh'); }
  else WP_LIST.forEach(w => w.g && set.add(w.g));
  return [...set].sort((a, b) => Object.keys(LANG_NAMES).indexOf(a) - Object.keys(LANG_NAMES).indexOf(b));
}
function quoteLang(seed) {
  const ls = dataLangs('quotes'), w = ls.map(l => qLangW(l) * Math.max(0.0001, quotePackW(l))), tot = w.reduce((a, b) => a + b, 0);
  if (!tot) return ls.includes(prefs.lang) ? prefs.lang : 'en';
  let r = (seed % 10000) / 10000 * tot; for (let i = 0; i < ls.length; i++) { r -= w[i]; if (r < 0) return ls[i]; } return ls[ls.length - 1];
}
function quotePackW(l) { const ps = allPacks().filter(p => p.kind === 'quotes' && (p.langs || []).includes(l)); return ps.length ? Math.max(...ps.map(p => packW(p.id))) : 1; }
const wpPackOf = w => w.custom ? 'mine' : (w._p || 'core-pictures');
const wpWeight = w => packW(wpPackOf(w)) * pLangW(w.g);
function chooseWallpaper(per, now, bump) {
  if (prefs.wp === 'fixed' && prefs.wpFixed) { const w = WP_LIST.find(x => x.f === prefs.wpFixed); if (w) return w; }
  let all = WP_LIST.filter(w => w.p === per || w.p === '*').concat(mineList.map((u, i) => ({ custom:true, url:u, f:'mine:' + i, p:'*', c:'mine', t:'', a:'', y:'' })));
  if (!all.length) return null;
  const wt = all.map(wpWeight); let tot = wt.reduce((a, b) => a + b, 0); if (!tot) { all.forEach((_, i) => wt[i] = 1); tot = all.length; }
  const day = now.getFullYear() * 400 + now.getMonth() * 31 + now.getDate(), pi = PERIODS.indexOf(per), slot = wpSlot(per, now) + bump;
  let r = hash(day * 131 + pi * 17 + slot * 7919) % 100000 / 100000 * tot; for (let i = 0; i < all.length; i++) { r -= wt[i]; if (r < 0) return all[i]; } return all[all.length - 1];
}
function rebuildQIDX() { QIDX.clear(); QMINED.q.forEach((r, i) => { const [h, m, amb] = r, hs = amb ? [h % 12, h % 12 + 12] : [h]; hs.forEach(hh => { const k = hh * 60 + m; (QIDX.get(k) || QIDX.set(k, []).get(k)).push(i); }); }); }
function deepMerge(base, over) { for (const k in over) { if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && base[k] && typeof base[k] === 'object') deepMerge(base[k], over[k]); else base[k] = over[k]; } return base; }
function applyPack(pk) {
  if (pk.kind === 'quotes') {
    if (pk.format === 'mined') { if ((pk.langs || [])[0] === 'zh') QZH_MINED.splice(0, QZH_MINED.length, ...pk.data); else { QMINED.b = pk.data.b; QMINED.q = pk.data.q; rebuildQIDX(); } }
    else { const have = new Set(POEMS.map(q => q.l + q.text)); pk.data.forEach(q => { if (!have.has(q.l + q.text)) POEMS.push({ ...q, _p:pk.id }); }); }
  } else if (pk.kind === 'pictures') { const have = new Set(WP_LIST.map(w => w.f)); pk.data.forEach(w => { if (!have.has(w.f)) WP_LIST.push({ ...w, _p:pk.id }); }); }
  else if (pk.kind === 'ui') { const base = JSON.parse(JSON.stringify(I18N.en)); I18N[pk.lang] = deepMerge(base, pk.data); }
}
function unapplyPack(pk) {
  if (pk.kind === 'quotes') { if (pk.format === 'mined') { if ((pk.langs || [])[0] === 'zh') QZH_MINED.length = 0; else { QMINED.b = []; QMINED.q = []; rebuildQIDX(); } } else { for (let i = POEMS.length - 1; i >= 0; i--) if (POEMS[i]._p === pk.id) POEMS.splice(i, 1); } }
  else if (pk.kind === 'pictures') { for (let i = WP_LIST.length - 1; i >= 0; i--) if (WP_LIST[i]._p === pk.id) WP_LIST.splice(i, 1); }
  else if (pk.kind === 'ui' && pk.lang !== 'en' && pk.lang !== 'zh') { delete I18N[pk.lang]; if (prefs.lang === pk.lang) { prefs.lang = 'en'; store.set('vmm.lang', 'en'); } }
}
/* A pack of mined quotes is text with a lot of repetition, so it is kept gzip-compressed on the device (about a third of its size) and
   unpacked when the app starts. Older installs, and browsers without CompressionStream, keep working: the pack is simply stored as it is. */
const CAN_GZ = typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';
const gzPipe = async (bytes, S) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new S('gzip'))).arrayBuffer());
const gzip = text => gzPipe(new TextEncoder().encode(text), CompressionStream), gunzip = async bytes => new TextDecoder().decode(await gzPipe(bytes, DecompressionStream));
async function loadPacks() {
  try { const rows = await DB.all('kv'); PACKS.list = rows.filter(r => String(r.k).startsWith('pack:') && r.v).map(r => r.v); } catch (e) { PACKS.list = []; }
  for (const p of PACKS.list) if (p.gz && !p.data) { try { p.data = JSON.parse(await gunzip(p.gz)); } catch (e) { p.data = p.format === 'mined' ? { b:[], q:[] } : []; } }
  PACKS.list.filter(p => !PW.off[p.id]).forEach(applyPack); if (!I18N[prefs.lang]) prefs.lang = 'en';
}
const validPack = pk => pk && pk.pack === 'media-tracker' && pk.id && ['quotes', 'pictures', 'ui'].includes(pk.kind) && pk.data != null;
async function installPack(pk) {
  if (!validPack(pk)) throw new Error('invalid');
  const old = PACKS.list.find(p => p.id === pk.id); if (old && !PW.off[old.id]) unapplyPack(old); delete PW.off[pk.id];
  let rec = pk; pk.bytes = pk.bytes || JSON.stringify(pk).length;
  if (CAN_GZ && pk.kind === 'quotes' && pk.format === 'mined') { try { const gz = await gzip(JSON.stringify(pk.data)); rec = { ...pk, data:null, gz, bytes:gz.byteLength }; pk.bytes = gz.byteLength; } catch (e) { rec = pk; } }
  await DB.put('kv', { k:'pack:' + pk.id, v:rec });
  PACKS.list = PACKS.list.filter(p => p.id !== pk.id).concat([pk]); applyPack(pk);
  if (pk.kind === 'quotes') (pk.langs || []).forEach(l => { if (PW.q[l] == null && l !== prefs.lang) PW.q[l] = 2; });      // a language you just installed should actually show up
  savePW(); packsChanged();
}
async function removePack(id) { const pk = PACKS.list.find(p => p.id === id); if (!pk) return; if (!PW.off[id]) unapplyPack(pk); delete PW.off[id]; delete PW.packs[id]; await DB.del('kv', 'pack:' + id); PACKS.list = PACKS.list.filter(p => p.id !== id); const have = new Set(dataLangs('quotes')); Object.keys(PW.q).forEach(l => { if (!have.has(l)) delete PW.q[l]; }); savePW(); packsChanged(); }
function packsChanged() { HS.wpFor = ''; HS.wbump = 0; HS.bump = 0; if (typeof applyLang === 'function') applyLang(); renderPacks(); tick(true); }
async function importPackFiles(files) {
  let ok = 0, bad = 0; for (const f of files) { try { await installPack(JSON.parse(await f.text())); ok++; } catch (e) { bad++; } }
  toast(bad ? t('pk_import_bad', { ok, bad }) : t('pk_imported', { n:ok }), !!bad);
}
async function fetchCatalogue() { try { const r = await fetch('packs/index.json', { cache:'no-store' }); if (!r.ok) throw 0; PACKS.remote = (await r.json()).packs || []; } catch (e) { PACKS.remote = []; toast(t('pk_no_folder'), true); } renderPacks(); }
async function installRemote(file) { try { const r = await fetch('packs/' + file); await installPack(await r.json()); toast(t('t_saved')); } catch (e) { toast(t('pk_import_bad', { ok:0, bad:1 }), true); } }
/* ---- Settings: one section at a time ---- */
/* Settings: on a wide screen five groups, each a page of cards behind a tab strip; on a phone a list of pages
   (one section each, see js/26-settings-nav.js). Old section names still resolve. */
const SET_GROUPS = { general:['general', 'features'], appearance:['appearance', 'colors', 'fonts', 'icons', 'tabbar', 'home'], library:['views', 'data'], insights:['layouts'], badges:['badges'], ai:['ai'], plugins:['plugins', 'system'] };
const SET = { level:'list', sec:'', from:'tracker', depth:0 };
const setGroupOf = s => SET_GROUPS[s] ? s : Object.keys(SET_GROUPS).find(g => SET_GROUPS[g].includes(s)) || 'general';
const SET_PART = { props:1, entry:1, types:1, tags:1 };            // pages that used to be sections of their own are now parts of Settings → Database
function showSetSec(sec) {
  if (SET_PART[sec]) { DATA.part = sec; store.set('vmm.datapart', sec); sec = 'data'; }
  const pan = document.querySelector('.panel[data-panel="settings"]'); let show;
  if (PLAT.bar()) {                                    // phone: '' → the list of pages, a section → just that page, no argument → stay where you are (a re-render must not throw you back to the list)
    const want = sec === undefined ? SET.sec : sec, s = want ? (SET_GROUPS[want] ? SET_GROUPS[want][0] : want) : ''; SET.sec = s && document.querySelector(`.set-sec[data-sec="${s}"]`) ? s : ''; SET.level = SET.sec ? 'sec' : 'list'; show = SET.sec ? [SET.sec] : [];
  } else {                                             // wide: a group of sections
    const g = setGroupOf(sec || store.get('vmm.setsec', 'general')); store.set('vmm.setsec', g); SET.level = 'sec'; show = SET_GROUPS[g];
    $$('#setNav button').forEach(b => { if (b.dataset.sec === g) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  }
  pan.dataset.lv = SET.level; $$('.set-sec').forEach(x => x.hidden = !show.includes(x.dataset.sec));
  if (show.includes('plugins')) renderPacks(); if (['views', 'data', 'layouts'].some(k => show.includes(k))) renderLibSettings();
}
$('setNav').addEventListener('click', e => { const b = e.target.closest('[data-sec]'); if (b) { showSetSec(b.dataset.sec); window.scrollTo(0, 0); } });
/* ---- Settings → Plug-ins ---- */
const packOn = id => !(PW.off && PW.off[id]);
const fmtKB = b => b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
const KIND_ICON = { quotes:'quote', pictures:'photo', ui:'language' };
function mixSummary() {
  const q = dataLangs('quotes').map(l => [l, qLangW(l) * quotePackW(l)]).filter(x => x[1] > 0), qt = q.reduce((a, x) => a + x[1], 0);
  const groups = new Map(); WP_LIST.forEach(w => { const wgt = wpWeight(w); if (wgt > 0) { const k = w.g || '_'; groups.set(k, (groups.get(k) || 0) + wgt / Math.max(1, WP_LIST.filter(x => (x.p === w.p || x.p === '*')).length)); } });
  const pt = [...groups.values()].reduce((a, b) => a + b, 0);
  return { q:q.map(([l, w]) => `${langLabel(l)} ${Math.round(w / qt * 100)}%`).join(' · ') || '—', p:[...groups].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g, w]) => `${g === '_' ? t('pk_neutral') : langLabel(g)} ${Math.round(w / pt * 100)}%`).join(' · ') || '—' };
}
async function toggleStorage() {
  let est = null; try { est = await navigator.storage.estimate(); } catch (e) {}
  const el = $('pkStorage'); if (!el) return; const used = PACKS.list.reduce((a, p) => a + (p.bytes || 0), 0);
  el.textContent = t('pk_storage', { p:fmtKB(used), n:PACKS.list.length }) + (est && est.quota ? ' · ' + t('pk_quota', { u:fmtKB(est.usage || 0), q:fmtKB(est.quota) }) : '');
}
function renderPacks() {
  const box = $('packsBody'); if (!box) return;
  const qL = dataLangs('quotes'), pL = dataLangs('pictures'), langs = [...new Set([...qL, ...pL])].sort((a, b) => Object.keys(LANG_NAMES).indexOf(a) - Object.keys(LANG_NAMES).indexOf(b));
  const slider = (cls, key, val, max) => `<span class="pk-sl"><input type="range" class="${cls}" data-k="${esc(key)}" min="0" max="${max || 10}" step="1" value="${val}"><b>${val === 0 ? t('pk_off') : val}</b></span>`;
  const mix = mixSummary();
  const sw = (id, on) => `<button type="button" class="pk-switch" role="switch" aria-checked="${on}" data-pk="toggle" data-id="${esc(id)}" title="${esc(t(on ? 'pk_turn_off' : 'pk_turn_on'))}"><i></i></button>`;
  const row = pk => {
    const on = packOn(pk.id), isUi = pk.kind === 'ui';
    const meta = [pk.core ? t('pk_builtin') : fmtKB(pk.bytes || 0), String(pk.core ? (pk.kind === 'quotes' ? POEMS.filter(q => !q._p).length : WP_LIST.filter(w => !w._p).length) : (pk.count != null ? pk.count : '')) + ' ' + t('pk_n_' + pk.kind), ...(pk.langs || []).length && !isUi ? [(pk.langs || []).map(langLabel).join(' ')] : []].filter(Boolean).join(' · ');
    return `<div class="pk-row ${on ? '' : 'off'}" data-id="${esc(pk.id)}"><i class="ti ti-${KIND_ICON[pk.kind]}"></i><div class="pk-t"><b>${esc(packName(pk))}</b><span>${esc(packDesc(pk))}</span><small>${esc(meta)}</small></div>
      ${isUi ? `<button class="btn sm ${prefs.lang === pk.lang ? 'primary' : ''}" data-pk="use" data-id="${esc(pk.id)}" data-lang="${esc(pk.lang)}" ${on ? '' : 'disabled'}>${esc(prefs.lang === pk.lang ? t('pk_in_use') : t('pk_use'))}</button>` : `<div class="pk-w" ${on ? '' : 'hidden'}>${slider('pk-w', pk.id, packW(pk.id))}</div>`}
      ${sw(pk.id, on)}${pk.core ? '' : `<button class="ibtn sm" data-pk="rm" data-id="${esc(pk.id)}" title="${esc(t('lp_remove'))}"><i class="ti ti-trash"></i></button>`}</div>`;
  };
  const mineRow = `<div class="pk-row mine"><i class="ti ti-photo-up"></i><div class="pk-t"><b>${esc(t('wk_mine'))}</b><span>${esc(t('wkd_mine'))}</span><div class="gal mine" id="galMine">${mineList.map((u, i) => `<button type="button" data-mi="${i}" title="${esc(t('lp_remove'))}"><img src="${u}" alt=""><span><i class="ti ti-x"></i></span></button>`).join('')}</div><button class="btn sm" id="btnWpUp" type="button"><i class="ti ti-photo-up"></i><span>${esc(t('wp_upload'))}</span></button></div><div class="pk-w">${slider('pk-w', 'mine', packW('mine'))}</div></div>`;
  const staged = (PACKS.staged || []).length ? `<div class="pk-stage"><div class="pk-sh"><b>${esc(t('pk_found', { n:PACKS.staged.length }))}</b><span class="sp"></span><button class="btn sm" data-pk="stage-all">${esc(t('sel_all', { n:PACKS.staged.length }))}</button><button class="btn sm primary" data-pk="stage-install" ${PACKS.staged.some(s => s.on) ? '' : 'disabled'}><i class="ti ti-download"></i>${esc(t('pk_install'))}</button><button class="ibtn sm" data-pk="stage-x" title="${esc(t('cancel'))}"><i class="ti ti-x"></i></button></div>${PACKS.staged.map((s, i) => `<label class="pk-sr"><input type="checkbox" data-st="${i}" ${s.on ? 'checked' : ''}><span>${esc(packName(s.pack))}</span><small>${esc(t('pk_kind_' + s.pack.kind))} · ${esc(fmtKB(s.pack.bytes || 0))}${PACKS.list.some(p => p.id === s.pack.id) ? ' · ' + esc(t('pk_replace')) : ''}</small></label>`).join('')}</div>` : '';
  const remote = (PACKS.remote || []).filter(r => !PACKS.list.some(p => p.id === r.id));
  const online = PACKS.remote == null ? '' : `<div class="pk-stage"><div class="pk-sh"><b>${esc(t('pk_available'))}</b></div>${remote.length ? remote.map(r => `<div class="pk-sr"><span>${esc((r.name && (r.name[prefs.lang] || r.name.en)) || r.id)}</span><small>${esc(fmtKB(r.bytes))} · ${esc(String(r.count))} ${esc(t('pk_n_' + r.kind))}</small><button class="btn sm primary" data-pk="install" data-file="${esc(r.file)}"><i class="ti ti-download"></i>${esc(t('pk_install'))}</button></div>`).join('') : `<div class="pk-sr"><small>${esc(t('pk_all_installed'))}</small></div>`}</div>`;
  box.innerHTML = `<div class="pk-add"><div class="pk-drop" id="pkDrop"><i class="ti ti-package-import"></i><div><b>${esc(t('pk_drop'))}</b><span>${esc(t('pk_drop_s'))}</span></div></div><div class="pk-btns"><button class="btn" data-pk="files"><i class="ti ti-file-import"></i>${esc(t('pk_import'))}</button><button class="btn" data-pk="dir"><i class="ti ti-folder-open"></i>${esc(t('pk_choose_dir'))}</button><button class="btn" data-pk="browse"><i class="ti ti-world-download"></i>${esc(t('pk_browse_short'))}</button></div></div>${staged}${online}
    <div class="pk-hd"><h4>${esc(t('pk_installed'))}</h4><span id="pkStorage" class="pk-store"></span><span class="sp"></span>${PACKS.list.length ? `<button class="linkbtn2" data-pk="rm-all"><i class="ti ti-trash"></i>${esc(t('pk_rm_all'))}</button>` : ''}</div>
    <div class="pk-rows">${['quotes', 'pictures', 'ui'].map(k => allPacks().filter(p => p.kind === k).map(row).join('')).join('')}${mineRow}</div>
    <div class="pk-hd"><h4>${esc(t('pk_mix'))}</h4></div><p class="section-desc">${esc(t('pk_mix_desc'))}</p>
    <div class="pk-lang"><div class="pk-lr head"><span></span><span>${esc(t('pk_quotes'))}</span><span>${esc(t('pk_pictures'))}</span></div>${langs.map(l => `<div class="pk-lr"><span>${esc(langLabel(l))}</span>${qL.includes(l) ? slider('pk-q', l, qLangW(l)) : '<span class="pk-sl na">—</span>'}${pL.includes(l) ? slider('pk-p', l, pLangW(l)) : '<span class="pk-sl na">—</span>'}</div>`).join('')}<div class="pk-lr"><span>${esc(t('pk_neutral'))}</span><span class="pk-sl na">—</span>${slider('pk-n', 'neutral', PW.neutral)}</div></div>
    <p class="cnote"><b>${esc(t('pk_quotes'))}</b> ${esc(mix.q)}<br><b>${esc(t('pk_pictures'))}</b> ${esc(mix.p)}</p>`;
  toggleStorage();
}
const packsRefresh = () => { HS.wpFor = ''; HS.wbump = 0; HS.bump = 0; tick(true); };
async function stagePackFiles(files) {
  const out = []; let bad = 0;
  for (const f of files) { if (!/\.json$/i.test(f.name) || f.name === 'index.json') continue; try { const pk = JSON.parse(await f.text()); if (validPack(pk)) { pk.bytes = f.size; out.push({ pack:pk, on:true }); } else bad++; } catch (e) { bad++; } }
  PACKS.staged = out; renderPacks(); if (!out.length) toast(t('pk_none_found'), true);
}
$('packsBody').addEventListener('input', e => {
  const el = e.target; if (el.type !== 'range') return; const v = Number(el.value), k = el.dataset.k; el.nextElementSibling.textContent = v === 0 ? t('pk_off') : v;
  if (el.classList.contains('pk-q')) PW.q[k] = v; else if (el.classList.contains('pk-p')) PW.p[k] = v; else if (el.classList.contains('pk-n')) PW.neutral = v; else if (el.classList.contains('pk-w')) PW.packs[k] = v;
});
$('packsBody').addEventListener('change', e => {
  if (e.target.type === 'range') { savePW(); renderPacks(); packsRefresh(); return; }
  if (e.target.dataset.st != null) { PACKS.staged[Number(e.target.dataset.st)].on = e.target.checked; renderPacks(); }
});
$('packsBody').addEventListener('click', async e => {
  const b = e.target.closest('[data-pk]');
  if (b) { const a = b.dataset.pk;
    if (a === 'files') $('packFile').click(); else if (a === 'dir') $('packDir').click();
    else if (a === 'browse') fetchCatalogue();
    else if (a === 'install') { b.disabled = true; await installRemote(b.dataset.file); }
    else if (a === 'rm') { if (await ask(t('pk_rm_confirm'))) await removePack(b.dataset.id); }
    else if (a === 'rm-all') { if (await ask(t('pk_rm_all_confirm'))) { for (const p of [...PACKS.list]) await removePack(p.id); } }
    else if (a === 'toggle') { PW.off = PW.off || {}; const id = b.dataset.id, on = packOn(id); if (on) PW.off[id] = true; else delete PW.off[id]; const pk = PACKS.list.find(p => p.id === id); if (pk) { on ? unapplyPack(pk) : applyPack(pk); } savePW(); packsChanged(); }
    else if (a === 'use') { prefs.lang = b.dataset.lang; store.set('vmm.lang', prefs.lang); packsChanged(); }
    else if (a === 'stage-all') { PACKS.staged.forEach(s => s.on = true); renderPacks(); }
    else if (a === 'stage-x') { PACKS.staged = []; renderPacks(); }
    else if (a === 'stage-install') { let n = 0; for (const s of PACKS.staged.filter(s => s.on)) { try { await installPack(s.pack); n++; } catch (er) {} } PACKS.staged = []; toast(t('pk_imported', { n })); renderPacks(); }
    return; }
  const mi = e.target.closest('[data-mi]'); if (mi) { mineList.splice(Number(mi.dataset.mi), 1); await saveMine(); packsRefresh(); return renderPacks(); }
  if (e.target.closest('#btnWpUp')) $('wpFile').click();
});
['dragover', 'dragenter'].forEach(ev => $('packsBody').addEventListener(ev, e => { if (e.target.closest('#pkDrop') || e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); const d = $('pkDrop'); if (d) d.classList.add('over'); } }));
$('packsBody').addEventListener('dragleave', e => { const d = $('pkDrop'); if (d && !d.contains(e.relatedTarget)) d.classList.remove('over'); });
$('packsBody').addEventListener('drop', e => { if (!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); const d = $('pkDrop'); if (d) d.classList.remove('over'); stagePackFiles([...e.dataTransfer.files]); });
$('packFile').onchange = e => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) stagePackFiles(fs); };
$('packDir').onchange = e => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) stagePackFiles(fs); };
$('wpFile').onchange = async e => {
  const fs = [...e.target.files]; e.target.value = ''; if (!fs.length) return;
  for (const f of fs) { if (mineList.length >= 12) break; const u = await shrinkImage(f); if (u) mineList.push(u); }
  await saveMine(); packsRefresh(); renderPacks(); toast(t('t_saved'));
};



/* ---- Import: sub-tabs ---- */
let impTab = 'csv';
function renderImpTabs() { $$('#impTabs button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === impTab)); $$('[data-imp]').forEach(x => x.hidden = x.dataset.imp !== impTab); }
$('impTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { impTab = b.dataset.v; renderImpTabs(); } });
const drop = $('drop');
/* Where the browser can hand over file handles (Chrome, Edge) the picker and the drop keep them, so the files open again with one click later. */
async function pickMedia() {
  if (!window.showOpenFilePicker) return $('filePick').click();
  try { const hs = await showOpenFilePicker({ multiple:true }); importFiles(await Promise.all(hs.map(h => h.getFile())), hs); }
  catch (e) { if (e.name !== 'AbortError') $('filePick').click(); }
}
drop.onclick = pickMedia;
$('filePick').onchange = e => { importFiles(e.target.files); e.target.value = ''; };
['dragenter', 'dragover'].forEach(n => drop.addEventListener(n, e => { e.preventDefault(); drop.classList.add('active'); }));
['dragleave', 'drop'].forEach(n => drop.addEventListener(n, e => { e.preventDefault(); drop.classList.remove('active'); }));
drop.addEventListener('drop', e => {          // handles must be asked for while the drop event is still being dispatched
  const fl = [...e.dataTransfer.files], hp = [...(e.dataTransfer.items || [])].filter(i => i.kind === 'file').map(i => i.getAsFileSystemHandle ? i.getAsFileSystemHandle().catch(() => null) : Promise.resolve(null));
  Promise.all(hp).then(hs => {
    const dirs = hs.filter(h => h && h.kind === 'directory'); if (dirs.length && typeof folderAdd === 'function') dirs.forEach(folderAdd);
    importFiles(fl.filter((f, i) => !(hs[i] && hs[i].kind === 'directory')), hs.filter(h => !(h && h.kind === 'directory')).map(h => h || null));
  });
});
window.addEventListener('dragover', e => e.preventDefault()); window.addEventListener('drop', e => e.preventDefault());
$('btnRestore').onclick = () => $('jsonPick').click();
$('jsonPick').onchange = async e => {
  const file = e.target.files[0]; e.target.value = ''; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const vids = Array.isArray(data) ? data : data.videos, meds = Array.isArray(data) ? [] : data.media || [];
    if (!Array.isArray(vids)) throw 0;
    const haveV = new Set(files.map(r => r.sig)), haveM = new Set(media.map(mediaKey)); let n = 0, d = 0; const rv = [], rm = [];
    for (const r of vids) { if (!r || !r.sig || haveV.has(r.sig)) { d++; continue; } delete r.id; rv.push(r); haveV.add(r.sig); n++; }
    for (const m of meds) { if (!m || !m.title || haveM.has(mediaKey(m))) { d++; continue; } delete m.id; rm.push(m); haveM.add(mediaKey(m)); n++; }
    if (!Array.isArray(data) && Array.isArray(data.lists)) { data.lists.forEach(l => { if (l && l.id && !listById(l.id)) LISTS.push(l); }); await saveLists(); }
    if (rv.length) await DB.putMany('videos', rv); if (rm.length) await DB.putMany('media', rm);
    if (!Array.isArray(data) && (data.pos || data.marks || data.stat)) { await POS.ready; await syExtra(data); }                  // the newer of each place, every bookmark and highlight, the larger time count
    $('restoreLog').innerHTML = `<div class="ok"><i class="ti ti-check"></i> ${esc(t('t_restored', { n, d }))}</div>`; reload();
  } catch (err) { toast(t('t_bad'), true); }
};

/* ---- Import: CSV / TSV / JSON from other apps ---- */
function parseCsv(text) {
  text = text.replace(/^﻿/, ''); const first = text.split(/\r?\n/, 1)[0] || '';
  const delim = [',', '\t', ';', '|'].map(d => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"' && cur === '') q = true;
    else if (c === delim) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(x => x.trim() !== '')) rows.push(row); row = []; }
    else cur += c;
  }
  row.push(cur); if (row.some(x => x.trim() !== '')) rows.push(row);
  return { headers:(rows.shift() || []).map(h => h.trim()), rows };
}
const CSV_FIELDS = ['title', 'alt', 'creator', 'type', 'status', 'rating', 'fav', 'year', 'runtime', 'language', 'cast', 'writers', 'producers', 'progress', 'tags', 'notes', 'cover'];
const ALIAS = {
  fav:['favorite', 'favourite', 'favorites', 'favourites', 'liked', 'like', 'loved', 'starred', '收藏', '喜欢', '最爱'],
  runtime:['runtime', 'runtime (mins)', 'runtime (min)', 'duration', 'length', 'minutes', 'running time', '片长', '时长', '长度'], language:['language', 'languages', 'original language', 'spoken language', '语言', '原语言'],
  cast:['cast', 'actors', 'actor', 'stars', 'starring', 'performers', '主演', '演员'], writers:['writer', 'writers', 'screenplay', 'written by', 'screenwriter', '编剧'], producers:['producer', 'producers', 'produced by', 'publisher', 'studio', '制片人', '制作人', '出版社'],
  title:['title', 'name', 'film', 'movie', 'book title', 'series', '标题', '名称', '片名', '作品', '书名', '电影', '影片名'], alt:['original title', 'alt', 'alternative title', 'other title', '原名', '其他名称'],
  creator:['director', 'directors', 'author', 'creator', 'artist', 'by', 'authors', '导演', '作者', '艺术家', '创作者'], type:['type', 'title type', 'kind', 'media', 'media type', 'format', '类型', '媒介'],
  status:['status', 'exclusive shelf', 'shelf', 'list', 'state', 'watch status', '状态', '书架', '标记'], rating:['rating', 'my rating', 'your rating', 'score', 'stars', 'user rating', '评分', '我的评分', '个人评分'],
  year:['year', 'release year', 'year published', 'original publication year', 'released', 'date released', '年份', '上映年份', '出版年份', '年'], progress:['progress', 'current', 'episode', '进度'],
  tags:['genres', 'genre', 'tags', 'categories', 'bookshelves', '标签', '题材', '分类'], notes:['notes', 'review', 'my review', 'comment', 'comments', 'description', '笔记', '短评', '评论', '简介'], cover:['cover', 'image', 'poster', 'cover url', 'image url', 'poster url', '封面']
};
function detectPreset(h) {
  const s = h.map(x => x.toLowerCase());
  if (s.includes('letterboxd uri')) return { name:'Letterboxd', type:'film', status:s.includes('rating') || s.includes('date') ? 'done' : 'done' };
  if (s.includes('exclusive shelf') || s.includes('my rating') && s.includes('author')) return { name:'Goodreads', type:'book' };
  if (s.includes('const') && s.includes('title type')) return { name:'IMDb', type:'film' };
  if (s.includes('creator') && s.includes('status') && s.includes('rating') && s.includes('progress')) return { name:'Media Tracker', type:'film' };
  return null;
}
const mapType = (v, def) => { v = String(v || '').toLowerCase(); if (!v) return def; for (const k of Object.keys(TYPES)) { const n = (I18N.en.types[k] || '').toLowerCase(), z = (I18N.zh.types[k] || '').toLowerCase(); if (!BUILTIN_TYPES.includes(k) ? (v === n || v === z) : false) return k; } if (/series|tv|episode|show|剧/.test(v)) return 'series'; if (/anime|animation|动画|动漫/.test(v)) return 'anime'; if (/book|novel|书|小说|manga|comic/.test(v)) return 'book'; if (/music|album|song|音乐|专辑/.test(v)) return 'music'; if (/game|游戏/.test(v)) return 'game'; if (/art|exhibit|painting|展|艺术/.test(v)) return 'art'; if (/movie|film|short|电影|影/.test(v)) return 'film'; return TYPES[v] ? v : def; };
const mapStatus = (v, def) => { v = String(v || '').toLowerCase().trim(); if (!v) return def; if (/to-?read|want|watchlist|wish|plan|backlog|想|待|未/.test(v)) return 'want'; if (/currently|watching|reading|playing|doing|progress|在看|在读|在玩|进行/.test(v)) return 'doing'; if (/drop|abandon|dnf|stop|弃|搁/.test(v)) return 'dropped'; if (/read|watched|done|complete|finish|seen|看过|读过|玩过|已/.test(v)) return 'done'; return STATUSES[v] ? v : def; };
const CS = { headers:[], rows:[], map:{}, sel:new Set(), preset:null, defType:'film', defStatus:'want', scale:'auto', skipDup:true, shown:0, list:'' };
function csvLoad(text, name) {
  let headers, rows;
  if (/\.json$/i.test(name || '') || /^\s*[\[{]/.test(text)) {
    let d; try { d = JSON.parse(text); } catch (e) { return toast(t('t_bad'), true); }
    if (!Array.isArray(d)) d = d.media || d.items || d.videos || [];
    headers = [...new Set(d.flatMap(o => Object.keys(o)))]; rows = d.map(o => headers.map(h => Array.isArray(o[h]) ? o[h].join('|') : o[h] == null ? '' : String(o[h])));
  } else ({ headers, rows } = parseCsv(text));
  if (!rows.length) return toast(t('csv_empty'), true);
  CS.headers = headers; CS.rows = rows.slice(0, 20000); CS.preset = detectPreset(headers); CS.map = {};
  const low = headers.map(h => h.toLowerCase().trim());
  CSV_FIELDS.forEach(f => { let i = -1; for (const a of ALIAS[f]) { const k = low.indexOf(a); if (k >= 0 && !Object.values(CS.map).includes(k)) { i = k; break; } } CS.map[f] = i; });
  if (CS.preset && CS.preset.name === 'IMDb') { const k = low.indexOf('title type'); if (k >= 0) CS.map.type = k; }
  CS.defType = CS.preset ? CS.preset.type : 'film'; CS.defStatus = CS.preset && CS.preset.status ? CS.preset.status : 'want'; CS.sel = new Set(CS.rows.map((_, i) => i)); CS.shown = 0; csvRender();
}
function csvConvert(r) {
  const g = f => CS.map[f] >= 0 ? (r[CS.map[f]] || '').trim() : '';
  const raw = g('rating'); let rating = 0;
  if (raw) {
    let v = parseFloat(raw.replace(',', '.')); if (isFinite(v) && v > 0) {
      let max = CS.scale === 'auto' ? (() => { const all = CS.rows.map(x => parseFloat((x[CS.map.rating] || '').replace(',', '.'))).filter(isFinite); const mx = Math.max(0, ...all); return mx <= 5 ? 5 : mx <= 10 ? 10 : 100; })() : Number(CS.scale);
      rating = Math.max(0, Math.min(5, Math.round(v / max * 5 * 2) / 2));
    }
  }
  const yr = parseInt((g('year').match(/(\d{4})/) || [])[1], 10);
  const rtRaw = g('runtime'); let runtime = null; if (rtRaw) { let mm = rtRaw.match(/^(\d+):(\d{2})(?::\d{2})?$/); if (mm) runtime = +mm[1] * 60 + +mm[2]; else { mm = rtRaw.match(/(\d+)\s*h\w*\s*(\d+)?/i); if (mm) runtime = +mm[1] * 60 + (+mm[2] || 0); else { const v = parseFloat(rtRaw.replace(',', '.')); if (isFinite(v) && v > 0) runtime = Math.round(v); } } }
  const favRaw = g('fav').toLowerCase(); const fav = !!favRaw && !/^(0|false|no|n|否|无|none)$/.test(favRaw);
  return { fav, runtime, language:g('language'), cast:g('cast'), writers:g('writers'), producers:g('producers'), title:g('title'), alt:g('alt'), creator:g('creator'), type:CS.map.type >= 0 ? mapType(g('type'), CS.defType) : CS.defType, status:CS.map.status >= 0 ? mapStatus(g('status'), CS.defStatus) : (CS.preset && CS.preset.name === 'Letterboxd' && raw === '' ? CS.defStatus : CS.defStatus),
    rating, year:isFinite(yr) ? yr : null, progress:g('progress'), genre:g('tags').split(/[,;|，、]/).map(x => genreKey(x)).filter(Boolean), notes:g('notes'), cover:safeUrl(g('cover')) };
}
function csvRender() {
  const stage = $('csvStage'), opt = (v, cur, lab) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`;
  const colOpts = f => opt(-1, CS.map[f], t('csv_none')) + CS.headers.map((h, i) => opt(i, CS.map[f], h || '#' + (i + 1))).join('');
  const n = CS.sel.size, show = Math.min(CS.rows.length, Math.max(CS.shown || 0, 200));
  stage.innerHTML = `<div class="card" style="gap:10px"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b>${esc(t('csv_rows', { n:CS.rows.length }))}</b>${CS.preset ? `<span class="twist" style="animation:none"><i class="ti ti-sparkles"></i>${esc(t('csv_preset', { x:CS.preset.name }))}</span>` : ''}</div>
    <div class="lbl" style="margin:6px 0 0">${esc(t('csv_cols'))}</div>
    <div class="map-grid">${CSV_FIELDS.map(f => `<label class="fld"><span>${esc(t('csv_f_' + f))}${f === 'title' ? ' *' : ''}</span><select data-map="${f}">${colOpts(f)}</select></label>`).join('')}</div>
    <div class="map-grid"><label class="fld"><span>${esc(t('csv_default_type'))}</span><select data-def="type">${Object.keys(TYPES).map(k => opt(k, CS.defType, L().types[k])).join('')}</select></label>
      <label class="fld"><span>${esc(t('csv_default_status'))}</span><select data-def="status">${Object.keys(STATUSES).map(k => opt(k, CS.defStatus, L().status[k])).join('')}</select></label>
      <label class="fld"><span>${esc(t('csv_scale'))}</span><select data-def="scale">${opt('auto', CS.scale, t('csv_scale_auto'))}${[5, 10, 100].map(v => opt(v, CS.scale, '0–' + v)).join('')}</select></label></div>
    <label class="checkline" style="margin:0"><input type="checkbox" id="csvDup" ${CS.skipDup ? 'checked' : ''}><span>${esc(t('csv_skipdup'))}</span></label>
    ${LISTS.length ? `<label class="fld" style="max-width:340px"><span>${esc(t('csv_list'))}</span><select data-def="list"><option value="">${esc(t('csv_nolist'))}</option>${LISTS.map(l => `<option value="${esc(l.id)}" ${CS.list === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label>` : ''}
    ${CS.map.title < 0 ? `<div class="log"><span class="warn">${esc(t('csv_nocol'))}</span></div>` : ''}
    <div class="lbl" style="margin:8px 0 0">${esc(t('csv_preview', { n:show }))}</div>
    <div class="preview-box"><table><thead><tr><th class="ck"><input type="checkbox" id="csvAll" ${n === CS.rows.length ? 'checked' : ''}></th><th>${esc(t('csv_f_title'))}</th><th>${esc(t('csv_f_creator'))}</th><th>${esc(t('csv_f_type'))}</th><th>${esc(t('csv_f_status'))}</th><th>${esc(t('csv_f_rating'))}</th><th>${esc(t('csv_f_year'))}</th><th>${esc(t('csv_f_tags'))}</th></tr></thead><tbody>
      ${CS.rows.slice(0, show).map((r, i) => { const m = csvConvert(r); return `<tr class="${CS.sel.has(i) ? 'sel' : ''}"><td class="ck"><input type="checkbox" data-r="${i}" ${CS.sel.has(i) ? 'checked' : ''}></td><td>${esc(m.title)}</td><td>${esc(m.creator)}</td><td>${esc(L().types[m.type])}</td><td>${esc(L().status[m.status])}</td><td>${m.rating || ''}</td><td>${m.year || ''}</td><td>${esc(m.genre.map(gname).join(', '))}</td></tr>`; }).join('')}</tbody></table></div>
    ${show < CS.rows.length ? `<div><button class="btn sm" id="csvMore">+ ${CS.rows.length - show}</button></div>` : ''}
    <div class="row-btns" style="margin-top:6px"><button class="btn sm" id="csvSelAll">${esc(t('csv_sel_all'))}</button><button class="btn sm" id="csvSelNone">${esc(t('csv_sel_none'))}</button><span class="sp" style="flex:1"></span><button class="btn primary" id="csvGo" ${n && CS.map.title >= 0 ? '' : 'disabled'}><i class="ti ti-download"></i>${esc(t('csv_go', { n }))}</button></div></div>`;
}
$('csvStage').addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.map) { CS.map[el.dataset.map] = +el.value; csvRender(); }
  else if (el.dataset.def) { CS[{ type:'defType', status:'defStatus', list:'list' }[el.dataset.def] || 'scale'] = el.value; csvRender(); }
  else if (el.id === 'csvDup') CS.skipDup = el.checked;
  else if (el.id === 'csvAll') { CS.sel = el.checked ? new Set(CS.rows.map((_, i) => i)) : new Set(); csvRender(); }
  else if (el.dataset.r != null) { const i = +el.dataset.r; el.checked ? CS.sel.add(i) : CS.sel.delete(i); const tr = el.closest('tr'); tr.classList.toggle('sel', el.checked); $('csvGo').lastChild.textContent = t('csv_go', { n:CS.sel.size }); $('csvGo').disabled = !CS.sel.size || CS.map.title < 0; }
});
$('csvStage').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'csvSelAll') { CS.sel = new Set(CS.rows.map((_, i) => i)); csvRender(); }
  else if (b.id === 'csvSelNone') { CS.sel.clear(); csvRender(); }
  else if (b.id === 'csvMore') { CS.shown = Math.min(CS.rows.length, (CS.shown || 200) + 400); csvRender(); }
  else if (b.id === 'csvGo') {
    const have = new Map(media.map(m => [mediaKey(m), m])); let n = 0, d = 0; const recs = [], linked = new Map();
    [...CS.sel].sort((a, b) => a - b).forEach(i => { const m = csvConvert(CS.rows[i]); if (!m.title) return; const k = mediaKey(m); if (CS.skipDup && have.has(k)) { d++; const ex = have.get(k); if (CS.list && ex.id != null) linked.set(ex.id, { ...ex, lists:[...new Set([...(ex.lists || []), CS.list])] }); return; } have.set(k, { title:m.title }); recs.push({ alt:'', progress:'', notes:'', cover:'', ...m, lists:CS.list ? [CS.list] : [], addedAt:Date.now() + n, ...(m.status === 'done' ? { doneAt:Date.now() } : {}) }); n++; });
    if (linked.size) await DB.putMany('media', [...linked.values()]);
    if (recs.length) await DB.putMany('media', recs);
    await reload(); toast(t('csv_done', { n, d })); $('csvStage').innerHTML = `<div class="log"><div class="ok"><i class="ti ti-check"></i> ${esc(t('csv_done', { n, d }))}</div></div>`;
  }
});
const csvDrop = $('csvDrop'); csvDrop.onclick = () => $('csvPick').click();
$('csvPick').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (f) csvLoad(await f.text(), f.name); };
['dragenter', 'dragover'].forEach(n => csvDrop.addEventListener(n, e => { e.preventDefault(); csvDrop.classList.add('active'); }));
['dragleave', 'drop'].forEach(n => csvDrop.addEventListener(n, e => { e.preventDefault(); csvDrop.classList.remove('active'); }));
csvDrop.addEventListener('drop', async e => { const f = e.dataTransfer.files[0]; if (f) csvLoad(await f.text(), f.name); });
$('csvParseText').onclick = () => { const v = $('csvText').value; if (v.trim()) csvLoad(v, ''); };

/* ---- Export ---- */
$$('[data-exp]').forEach(b => b.onclick = () => ({ tHtml:exportTrackerHtml, tTable:exportLibraryTable, tCsv:exportTrackerCsv, fHtml:exportFilesHtml, fCsv:exportFilesCsv, json:exportJson, lShare:() => openShare('list', $('exList').value) })[b.dataset.exp]());
const csvQ = v => '"' + String(v == null ? '' : Array.isArray(v) ? v.join('|') : v).replace(/"/g, '""') + '"';
function toCsv(cols, list) { return '﻿' + cols.join(',') + '\n' + list.map(r => cols.map(c => csvQ(r[c])).join(',')).join('\n'); }
function exportFilesCsv() { download(`video-files-${stamp()}.csv`, toCsv(['titleCn', 'titleEn', 'director', 'cast', 'writers', 'producers', 'language', 'runtime', 'kind', 'genre', 'year', 'description', 'douban', 'imdb', 'fileName', 'ext', 'fileSize', 'duration', 'width', 'height'], files), 'text/csv'); }
function exportTrackerCsv() { download(`tracker-${stamp()}.csv`, toCsv(['title', 'alt', 'creator', 'cast', 'writers', 'producers', 'language', 'runtime', 'type', 'status', 'rating', 'fav', 'year', 'progress', 'genre', 'notes', 'cover'], media), 'text/csv'); }
function exportJson() { download(`media-tracker-backup-${stamp()}.json`, JSON.stringify({ app:'media-tracker', version:5, exported:new Date().toISOString(), lists:LISTS, media:media.map(({ id, ...r }) => r), videos:files.map(({ id, ...r }) => r), pos:POS.data, marks:POS.marks, stat:STAT.data || {} }), 'application/json'); }     // v5 adds where you stopped, bookmarks, highlights and time spent
const pageShell = (title, sub, body, extraScript, headExtra) => `<!doctype html>
<html lang="${prefs.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.42.0/dist/tabler-icons.min.css">
<style>${$('base-css').textContent}\n${$('card-css').textContent}</style>${headExtra || ''}</head>
<body><div class="container"><h1 style="font-size:24px;font-weight:600;margin:0 0 4px">${esc(title)}</h1><p style="margin:0 0 20px;font-size:13px;color:var(--text-secondary)">${esc(sub)}</p>${body}</div>${extraScript || ''}</body></html>`;
function exportFilesHtml() {
  const S = L().v, data = files.map(({ sig, lastModified, fileType, addedAt, ...r }) => r);
  const json = JSON.stringify(data).replace(/</g, '\\u003c'), sj = JSON.stringify(S).replace(/</g, '\\u003c');
  download(`video-files-${stamp()}.html`, pageShell(S.pageTitle, `${data.length} ${S.videos} · ${S.exported} ${stamp()}`, '<div id="app"></div>',
    `<script>const DATA=${json};\n${mountView.toString()}\nmountView(document.getElementById('app'),()=>DATA,{s:${sj}});<\/script>`), 'text/html');
}
function exportTrackerHtml() {
  const saveSel = TS.selecting; TS.selecting = false;
  const body = Object.keys(STATUSES).map(s => { const list = media.filter(m => m.status === s).sort((a, b) => b.addedAt - a.addedAt); return list.length ? `<h2 class="ex-sec">${esc(L().status[s])} · ${list.length}</h2><div class="poster-grid">${list.map(m => cardHtml(m, false)).join('')}</div>` : ''; }).join('');
  TS.selecting = saveSel;
  download(`tracker-${stamp()}.html`, pageShell(t('tracker_title'), `${media.length} ${t('items')} · ${t('exported')} ${stamp()}`, body), 'text/html');
}

/* ---- library table (HTML): self-contained so it can be written into the exported file ---- */
function mountMediaTable(root, rows, S) {
  const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const gname = g => S.genres[g] || g, rt = m => !m ? '' : m >= 60 ? S.uhm.replace('{h}', Math.floor(m / 60)).replace('{m}', String(Math.round(m % 60)).padStart(2, '0')) : S.umin.replace('{n}', Math.round(m));
  const sort = { col:'added', dir:'desc' }, tagSel = new Set(), hidden = new Set(); let tagMode = 'any', tagQ = '', ty = '';
  // Every kind of work fills in different things (a book has an author and publisher, a film a cast), so the columns follow the kind:
  // pick a type and you get exactly that type's fields, with that type's own labels; with "all" only fields someone filled in are shown.
  const SK = ['creator', 'cast', 'writers', 'producers', 'runtime', 'pages'], FIX = ['fav', 'title', 'type', 'status', 'rating', 'year'];
  const ALLC = [['fav', '♥'], ['title', S.title, 1], ['type', S.type, 1], ['status', S.status, 1], ['rating', S.rating, 1], ['year', S.year, 1], ['runtime', S.length, 1], ['pages', S.pages, 1], ['language', S.language, 1], ['creator', S.creator, 1], ['cast', S.cast], ['writers', S.writers], ['producers', S.producers], ['genre', S.tags], ['lists', S.lists], ['notes', S.notes]];
  const scOf = t => (S.fs && (S.fs[t] || S.fs.other)) || {};
  const filled = (k, pool) => pool.some(r => Array.isArray(r[k]) ? r[k].length : r[k]);
  function colsFor() {
    const pool = ty ? rows.filter(r => r.type === ty) : rows;
    return ALLC.filter(c => {
      const k = c[0]; if (hidden.has(k)) return false;
      if (SK.includes(k)) return ty ? !!scOf(ty)[k] : pool.some(r => scOf(r.type)[k]) && filled(k, pool);
      return FIX.includes(k) || filled(k === 'lists' ? 'listNames' : k, pool);
    }).map(c => SK.includes(c[0]) && ty && scOf(ty)[c[0]] ? [c[0], scOf(ty)[c[0]], c[2]] : c);
  }
  let COLS = [];
  root.innerHTML = `<div class="controls">
    <div class="filter-group"><label>${esc(S.status)}</label><select data-f="status"></select></div><div class="filter-group"><label>${esc(S.type)}</label><select data-f="type"></select></div>
    <div class="filter-group tagpop"><label>${esc(S.tags)}</label><details data-f="pop"><summary class="fbtn"><span data-f="poplab"></span></summary><div class="poppanel"><input type="text" data-f="tagq" placeholder="${esc(S.searchPh)}"><div class="mini" data-f="mode"><button type="button" data-v="any">${esc(S.matchAny)}</button><button type="button" data-v="all">${esc(S.matchAll)}</button></div><div class="poplist" data-f="taglist"></div></div></details></div>
    <div class="filter-group tagpop"><label>${esc(S.columns)}</label><details data-f="pop2"><summary class="fbtn"><span>${esc(S.columns)}</span></summary><div class="poppanel"><div class="poplist" data-f="collist"></div></div></details></div>
    <label class="favonly"><input type="checkbox" data-f="favonly"> ♥ ${esc(S.favOnly)}</label>
    <div class="filter-group"><label>${esc(S.search)}</label><input type="text" data-f="q" placeholder="${esc(S.searchPh)}" style="width:190px"></div><span class="count" data-f="count"></span></div>
    <div class="table-wrapper"><table><thead><tr data-f="head"></tr></thead><tbody></tbody></table></div>`;
  const $ = k => root.querySelector(`[data-f="${k}"]`), tbody = root.querySelector('tbody');
  const fill = (el, pairs) => { el.innerHTML = `<option value="">${esc(S.all)}</option>` + pairs.map(p => `<option value="${esc(p[0])}">${esc(p[1])}</option>`).join(''); };
  fill($('status'), Object.keys(S.statuses).map(k => [k, S.statuses[k]])); fill($('type'), Object.keys(S.types).filter(k => rows.some(r => r.type === k)).map(k => [k, S.types[k]]));
  function drawTags() {
    const c = new Map(); rows.forEach(r => (r.genre || []).forEach(g => c.set(g, (c.get(g) || 0) + 1))); const q = tagQ.toLowerCase();
    $('taglist').innerHTML = [...c].filter(([g]) => !q || gname(g).toLowerCase().includes(q)).sort((a, b) => b[1] - a[1]).map(([g, n]) => `<label class="pl" style="${hv(g)}"><input type="checkbox" data-tag="${esc(g)}" ${tagSel.has(g) ? 'checked' : ''}><span>${esc(gname(g))}</span><b>${n}</b></label>`).join('') || '—';
    $('poplab').textContent = tagSel.size ? S.tags + ' · ' + tagSel.size : S.tags; root.querySelectorAll('[data-f="mode"] button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === tagMode));
  }
  function drawCols() { $('collist').innerHTML = ALLC.filter(c => c[0] !== 'title').map(c => `<label class="pl"><input type="checkbox" data-col="${c[0]}" ${hidden.has(c[0]) ? '' : 'checked'}><span>${esc(c[1])}</span></label>`).join(''); }
  const val = (r, c) => c === 'title' ? (r.title || '').toLowerCase() : c === 'added' ? r.addedAt || 0 : c === 'fav' ? (r.fav ? 1 : 0) : typeof r[c] === 'string' ? r[c].toLowerCase() : (r[c] || 0);
  const na = '<span style="opacity:.35">–</span>';
  function cell(r, k) {
    if (SK.includes(k) && !scOf(r.type)[k]) return na;
    switch (k) {
      case 'fav': return r.fav ? '<span style="color:#ff4d79">♥</span>' : '';
      case 'title': return `<div class="title-main">${esc(r.title)}</div>${r.alt ? `<div class="title-sub">${esc(r.alt)}</div>` : ''}`;
      case 'type': return `<span class="type-badge type-${esc(r.type)}">${esc(S.types[r.type] || r.type)}</span>`;
      case 'status': return `<span class="schip s-${esc(r.status)}">${esc(S.statuses[r.status] || r.status)}</span>`;
      case 'rating': return r.rating ? `<span class="stars" style="--p:${r.rating / 5 * 100}%" title="${r.rating}"></span>` : '';
      case 'runtime': return esc(rt(r.runtime));
      case 'pages': return r.pages || '';
      case 'genre': return (r.genre || []).map(g => `<span class="genre-tag" style="${hv(g)}">${esc(gname(g))}</span>`).join('');
      case 'lists': return esc(r.listNames || '');
      case 'notes': return `<div class="desc clamp">${esc(r.notes || '')}</div>`;
      case 'cast': case 'writers': case 'producers': return `<div class="crew">${esc(r[k] || '')}</div>`;
      default: return esc(r[k] == null ? '' : r[k]);
    }
  }
  function render() {
    COLS = colsFor();
    $('head').innerHTML = COLS.map(c => `<th ${c[2] ? `class="sortable" data-sort="${c[0]}"` : ''}>${esc(c[1])}${c[2] ? ' <span class="sort-indicator">⇅</span>' : ''}</th>`).join('');
    const f = { st:$('status').value, ty:$('type').value, q:$('q').value.toLowerCase().trim(), fav:$('favonly').checked };
    const tagOk = r => !tagSel.size || (tagMode === 'all' ? [...tagSel].every(g => (r.genre || []).includes(g)) : [...tagSel].some(g => (r.genre || []).includes(g)));
    let out = rows.filter(r => (!f.st || r.status === f.st) && (!f.ty || r.type === f.ty) && (!f.fav || r.fav) && tagOk(r) && (!f.q || [r.title, r.alt, r.creator, r.cast, r.writers, r.producers, r.notes].some(x => (x || '').toLowerCase().includes(f.q))));
    out = out.slice().sort((a, b) => { const x = val(a, sort.col), y = val(b, sort.col); return (x < y ? -1 : x > y ? 1 : 0) * (sort.dir === 'asc' ? 1 : -1); });
    $('count').textContent = out.length + ' / ' + rows.length;
    tbody.innerHTML = out.length ? out.map(r => `<tr>${COLS.map(c => `<td class="${c[0] === 'runtime' ? 'num' : ''}">${cell(r, c[0])}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${COLS.length}"><div class="empty-state"><i class="ti ti-inbox"></i>${esc(S.nomatch)}</div></td></tr>`;
  }
  root.addEventListener('input', e => { if (e.target.dataset.f === 'q') render(); else if (e.target.dataset.f === 'tagq') { tagQ = e.target.value; drawTags(); } });
  root.addEventListener('change', e => {
    if (e.target.dataset.col) { e.target.checked ? hidden.delete(e.target.dataset.col) : hidden.add(e.target.dataset.col); return render(); }
    if (e.target.dataset.tag != null) { e.target.checked ? tagSel.add(e.target.dataset.tag) : tagSel.delete(e.target.dataset.tag); drawTags(); }
    if (e.target.dataset.f === 'type') ty = e.target.value;
    if (e.target.dataset.f || e.target.dataset.tag != null) render();
  });
  root.addEventListener('click', e => {
    const mb = e.target.closest('[data-f="mode"] button'); if (mb) { tagMode = mb.dataset.v; drawTags(); return render(); }
    const th = e.target.closest('th[data-sort]'); if (th) { const c = th.dataset.sort; if (sort.col === c) sort.dir = sort.dir === 'asc' ? 'desc' : 'asc'; else { sort.col = c; sort.dir = 'asc'; } render(); }
  });
  const away = e => { ['pop', 'pop2'].forEach(k => { const p = $(k); if (p && p.open && !p.contains(e.target)) p.open = false; }); }; document.addEventListener('click', away);
  drawTags(); drawCols(); render();
}
function libraryRows() { return media.map(({ id, cover, sig, ...m }) => ({ ...m, listNames:(m.lists || []).map(i => (listById(i) || {}).name).filter(Boolean).join(', ') })); }
function exportLibraryTable() {
  const S = { ...L().v, ...L().tv, types:L().types, statuses:L().status, genres:L().v.genres, fs:L().fs, pages:t('tc_pages'), columns:t('disp_cols') }, data = libraryRows();
  const json = JSON.stringify(data).replace(/</g, '\\u003c'), sj = JSON.stringify(S).replace(/</g, '\\u003c');
  download(`library-table-${stamp()}.html`, pageShell(t('tracker_title'), `${data.length} ${t('items')} · ${t('exported')} ${stamp()}`, '<div id="app"></div>',
    `<script>const DATA=${json};\n${mountMediaTable.toString()}\nmountMediaTable(document.getElementById('app'),DATA,${sj});<\/script>`), 'text/html');
}
/* ---- lists: share / import ---- */
const SHARE_FIELDS = ['title', 'alt', 'creator', 'cast', 'writers', 'producers', 'type', 'year', 'runtime', 'language', 'genre', 'cover'];
$('btnListImp').onclick = () => $('listPick').click();
async function importSharedList(file) {
  if (!file) return;
  try {
    const d = JSON.parse(await file.text()); if (d.app !== 'media-tracker-list' || !Array.isArray(d.items)) throw 0;
    let name = String(d.list.name || 'Shared list').slice(0, 60); while (LISTS.some(l => l.name === name)) name += ' (2)';
    const l = { id:newId(), name, desc:String(d.list.desc || '').slice(0, 300), color:LIST_COLORS.includes(d.list.color) ? d.list.color : LIST_COLORS[LISTS.length % LIST_COLORS.length], createdAt:Date.now() }; LISTS.push(l); await saveLists();
    const have = new Map(media.map(m => [mediaKey(m), m])), upd = [], add = []; let created = 0, linked = 0;
    d.items.forEach((it, i) => {
      if (!it || !it.title) return; const rec = { title:String(it.title), type:TYPES[it.type] ? it.type : 'film', year:it.year || null }, ex = have.get(mediaKey(rec));
      if (ex) { upd.push({ ...ex, lists:[...new Set([...(ex.lists || []), l.id])] }); linked++; }
      else { const m = { alt:'', creator:'', cast:'', writers:'', producers:'', language:'', runtime:null, genre:[], cover:'', rating:0, progress:'', notes:'', status:'want', addedAt:Date.now() + i, lists:[l.id], ...Object.fromEntries(SHARE_FIELDS.filter(k => it[k] != null && it[k] !== '').map(k => [k, it[k]])), ...rec }; m.cover = safeUrl(m.cover); m.genre = Array.isArray(m.genre) ? m.genre.map(String) : []; add.push(m); created++; }
    });
    if (upd.length) await DB.putMany('media', upd); if (add.length) await DB.putMany('media', add);
    $('listLog').innerHTML = `<div class="ok"><i class="ti ti-check"></i> ${esc(t('list_imp_done', { x:name, n:created, d:linked }))}</div>`; await reload(); toast(t('t_saved'));
  } catch (err) { toast(t('t_bad'), true); }}
$('listPick').onchange = e => { const f = e.target.files[0]; e.target.value = ''; importSharedList(f); };
$('listPick2').onchange = e => { const f = e.target.files[0]; e.target.value = ''; importSharedList(f); };

/* ---- Clear ---- */
$('clearOk').onchange = syncClear;
$$('[data-clear]').forEach(b => b.onclick = async () => {
  const k = b.dataset.clear;
  if (k === 'thumbs') { const recs = files.filter(r => r.thumb).map(r => ({ ...r, thumb:'' })); await DB.putMany('videos', recs); }
  else await DB.clear(k);
  $('clearOk').checked = false; await reload(); toast(t(k === 'thumbs' ? 't_thumbs' : 't_cleared'));
});

/* ---- Self-check ---- */
async function runSelfCheck() {
  const zh = prefs.lang === 'zh', btn = $('btnCheck'), out = [], paint = (busy) => { $('checks').innerHTML = out.map(c => `<div class="check ${c.ok ? 'ok' : 'warn'}"><i class="ti ti-${c.ok ? 'circle-check' : 'alert-triangle'}"></i><div>${esc(c.title)}${c.detail ? `<small>${esc(c.detail)}</small>` : ''}${c.fix ? `<button class="btn sm" data-fix="dups" style="margin-top:6px">${esc(t('sc_dups'))}</button>` : ''}</div></div>`).join('') + (busy ? `<div class="check"><i class="ti ti-loader-2 spin"></i><div>${esc(t('sc_running'))}</div></div>` : ''); };
  const add = (ok, title, detail, fix) => { out.push({ ok, title, detail, fix }); paint(true); };
  btn.disabled = true; paint(true);
  const step = async (fn, label) => { try { await fn(); } catch (e) { add(false, label, String(e && e.message || e)); } };
  try {
    await step(async () => { add(!DB.isMem(), t(DB.isMem() ? 'sc_mem' : 'sc_idb'), ''); }, 'storage');
    await step(async () => { await DB.put('kv', { k:'__selfcheck', v:Date.now() }); const g = await DB.get('kv', '__selfcheck'); add(!!g, t('sc_rw'), ''); }, t('sc_rw'));
    await step(async () => {                                   // temporary records: create → bulk-edit → read back → delete
      const tmp = [1, 2, 3].map(i => ({ title:'__selfcheck_' + i, type:'film', status:'want', genre:[], addedAt:Date.now(), rating:0 })); await DB.putMany('media', tmp); await reload();
      const ids = media.filter(m => m.title.startsWith('__selfcheck_')).map(m => m.id); const n = await bulkMedia(ids, m => { m.status = 'doing'; m.fav = true; m.genre = ['__t']; return m; });
      const ok = n === 3 && media.filter(m => ids.includes(m.id)).every(m => m.status === 'doing' && m.fav && m.genre.includes('__t')); await DB.delMany('media', ids); await reload(); add(ok, t(ok ? 'sc_bulk' : 'sc_bulk_bad'), '');
    }, t('sc_bulk_bad'));
    await step(async () => {
      const keys = new Map(); media.forEach(m => { const k = m.fileSig ? 'f:' + m.fileSig : mediaKey(m); (keys.get(k) || keys.set(k, []).get(k)).push(m); });
      const dups = [...keys.values()].filter(a => a.length > 1), extra = dups.reduce((a, g) => a + g.length - 1, 0); $('checks')._dups = dups;
      add(!extra, t(extra ? 'sc_dup_n' : 'sc_dup_none', { n:extra }), '', !!extra);
    }, t('sc_dup_none'));
    await step(async () => {                                   // quotes and pictures come from optional packs: say so instead of calling it a failure
      const cv = quoteCoverage(), zhN = QZH_MINED.length;
      add(true, t('sc_q_poems', { n:POEMS.length }), '');
      add(true, cv.total ? t('sc_q_en', { n:cv.total, b:cv.books, e:cv.en, p:(cv.en / 14.4).toFixed(0), m:NEAR_MAX }) : t('sc_q_en_none'), '');
      add(true, zhN ? t('sc_q_zh', { n:zhN }) : t('sc_q_zh_none'), '');
      add(WP_LIST.length > 0, t('sc_wp', { n:WP_LIST.length }), PACKS.list.filter(p => p.kind === 'pictures').length ? '' : t('sc_wp_hint'));
    }, t('sc_wp'));
    await step(async () => {
      const w = chooseWallpaper(periodOf(new Date().getHours()), new Date(), 0);
      if (w && !w.custom) { const ok = await new Promise(r => { const i = new Image(); i.onload = () => r(true); i.onerror = () => r(false); i.src = wpUrl(w, 250); setTimeout(() => r(false), 6000); }); add(ok, t(ok ? 'sc_img_ok' : 'sc_img_bad', { x:wpT(w) }), ok ? '' : t('sc_img_hint')); }
    }, t('sc_img_bad'));
    add(!!(CSS.supports && (CSS.supports('backdrop-filter', 'blur(4px)') || CSS.supports('-webkit-backdrop-filter', 'blur(4px)'))), t('sc_glass'), '');
  } finally { paint(false); btn.disabled = false; }
}
$('btnCheck').onclick = runSelfCheck;
$('checks').addEventListener('click', async e => {
  if (!e.target.closest('[data-fix="dups"]')) return; const ids = []; ($('checks')._dups || []).forEach(g => g.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0) || a.addedAt - b.addedAt).slice(1).forEach(m => ids.push(m.id)));
  await DB.delMany('media', ids); await reload(); toast(t('t_deleted', { n:ids.length })); runSelfCheck();
});

