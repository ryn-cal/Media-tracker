/* =====================================================================
   Video and audio player (v18)
   Kept deliberately small. Habits taken from VLC where a browser lets them through (Space, F, M, N/P, + − =, G/H subtitle delay,
   V subtitles, L order); the rest of VLC is left to VLC. What is here: play, ±10 s, previous/next, volume, speed, subtitles,
   order, bookmarks, full screen. The full version with A–B loop, frame step, aspect, snapshot, sleep timer and remappable keys is
   kept in docs/v18/archive-full-player-reader/ should it be wanted back.
   A browser plays what its decoders allow (MP4/H.264, WebM, MP3, AAC, FLAC, OGG…). A file it cannot decode is said so plainly, with the way out.
   ===================================================================== */
const PL_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3];
const PL_STEP = 10;
const PL_ORDER = ['off', 'all', 'one', 'shuffle'];
/* id, icon, keys, group (the order is the order of the Shortcuts sheet) */
const PL_ACT = [
  ['play', 'player-play', ['Space', 'k'], 'g_play'], ['back', 'rewind-backward-10', ['ArrowLeft', 'j'], 'g_play'], ['fwd', 'rewind-forward-10', ['ArrowRight'], 'g_play'],
  ['prev', 'player-skip-back', ['p', 'PageUp'], 'g_list'], ['next', 'player-skip-forward', ['n', 'PageDown'], 'g_list'], ['loop', 'repeat', ['l'], 'g_list'],
  ['volup', 'volume', ['ArrowUp'], 'g_sound'], ['voldown', 'volume-2', ['ArrowDown'], 'g_sound'], ['mute', 'volume-off', ['m'], 'g_sound'],
  ['faster', 'gauge', ['+'], 'g_speed'], ['slower', 'gauge', ['-'], 'g_speed'], ['normal', 'gauge', ['='], 'g_speed'],
  ['subs', 'badge-cc', ['v'], 'g_pic'], ['subearlier', 'badge-cc', ['g'], 'g_pic'], ['sublater', 'badge-cc', ['h'], 'g_pic'], ['full', 'maximize', ['f'], 'g_pic'],
  ['mark', 'bookmark-plus', ['d'], 'g_mark'], ['marks', 'bookmarks', ['b'], 'g_mark'], ['keys', 'keyboard', ['?', 'F1'], 'g_mark']
];
const PL = { rec:null, file:null, url:'', queue:[], qi:-1, sub:null, subs:[], subOff:false, subDelay:0, loop:'off', remain:false, lastSave:0, started:false, hideTm:0, osdTm:0, altType:0, native:[], menu:null, secs:0, closed:null };
const plv = () => $('plVideo'), pld = () => $('pl');
/* a key name as e.key gives it, with Ctrl/Shift in front: "ArrowLeft", "Shift+v", "Ctrl+f" */
const keyName = e => {
  const k = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toLowerCase() : e.key, sh = e.shiftKey && (k.length > 1 || /[a-z]/.test(k));
  return [e.ctrlKey || e.metaKey ? 'Ctrl' : '', e.altKey ? 'Alt' : '', sh ? 'Shift' : '', k].filter(Boolean).join('+');
};
const keyShow = k => k.replace('ArrowLeft', '←').replace('ArrowRight', '→').replace('ArrowUp', '↑').replace('ArrowDown', '↓').replace(/^Ctrl\+/, (/Mac/.test(navigator.platform) ? '⌘' : 'Ctrl+')).replace(/\+([a-z])$/, (a, c) => '+' + c.toUpperCase()).replace(/^([a-z])$/, c => c.toUpperCase());
const plKeyMap = () => { const m = new Map(); PL_ACT.forEach(([id, , keys]) => keys.forEach(k => m.set(k, id))); return m; };
const plTip = id => { const k = (PL_ACT.find(a => a[0] === id) || [, , []])[2][0]; return `${t('pc_' + id)}${k ? '  ·  ' + keyShow(k) : ''}`; };
const subLine = () => { const el = $('plSub'); return el ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, 48) : ''; };

/* ---------- the dialog, built once ---------- */
function plBuild() {
  if ($('pl')) return;
  const d = document.createElement('dialog'); d.id = 'pl'; d.className = 'plr'; d.setAttribute('aria-label', t('pl_aria'));
  const btn = (id, extra) => `<button type="button" class="pl-b" id="plb_${id}" data-act="${id}" data-tip="${esc(plTip(id))}" aria-label="${esc(t('pc_' + id))}"${extra || ''}><i class="ti ti-${PL_ACT.find(a => a[0] === id)[1]}"></i></button>`;
  d.innerHTML = `<div class="pl-stage" id="plStage"><video id="plVideo" playsinline preload="auto"></video>
      <div class="pl-art" id="plArt" hidden><div class="pl-cover" id="plCover"></div></div>
      <div class="pl-sub" id="plSub" aria-hidden="true"></div><div class="pl-osd" id="plOsd" aria-hidden="true"></div>
      <div class="pl-err" id="plErr" role="alert" hidden></div></div>
    <div class="pl-top" id="plTop"><button type="button" class="pl-b" id="plClose" aria-label="${esc(t('pl_close'))}" data-tip="${esc(t('pl_close') + '  ·  Esc')}"><i class="ti ti-chevron-down"></i></button>
      <div class="pl-head"><b id="plTitle"></b><span id="plSubtitle"></span></div>${btn('keys')}</div>
    <div class="pl-bar" id="plBar">
      <div class="pl-seekrow"><span class="pl-t" id="plCur">0:00</span>
        <div class="pl-seekwrap"><div class="pl-buf" id="plBuf"></div><div class="pl-ticks" id="plTicks"></div>
          <input type="range" id="plSeek" min="0" max="0" step="any" value="0" aria-label="${esc(t('pl_seek'))}"><div class="pl-hov" id="plHov" hidden></div></div>
        <button type="button" class="pl-t pl-tt" id="plDur" aria-label="${esc(t('pl_remain'))}" aria-pressed="false">0:00</button></div>
      <div class="pl-row">
        <div class="pl-grp">${btn('prev')}${btn('back')}${btn('play')}${btn('fwd')}${btn('next')}</div>
        <div class="pl-grp pl-vol">${btn('mute')}<input type="range" id="plVol" min="0" max="1" step="0.05" aria-label="${esc(t('pc_volup'))}"></div>
        <span class="pl-sp"></span>
        <div class="pl-grp"><button type="button" class="pl-b pl-txt" id="plSpeed"  aria-haspopup="menu" aria-label="${esc(t('pl_speed'))}">1×</button>
          <button type="button" class="pl-b" id="plSubsB" data-act="subsmenu" data-tip="${esc(plTip('subs'))}" aria-haspopup="menu" aria-label="${esc(t('pc_subs'))}"><i class="ti ti-badge-cc"></i></button>
          <button type="button" class="pl-b" id="plMarksB" data-act="marks" data-tip="${esc(plTip('marks'))}" aria-haspopup="dialog" aria-label="${esc(t('pc_marks'))}"><i class="ti ti-bookmarks"></i></button>
          ${btn('loop')}${btn('full')}</div>
      </div></div>
    <div class="sr-only" id="plLive" role="status" aria-live="polite"></div>`;
  document.body.appendChild(d);
  const m = document.createElement('div'); m.className = 'pl-mini glass'; m.id = 'plMini'; m.hidden = true; m.setAttribute('role', 'region'); m.setAttribute('aria-label', t('pl_mini_aria'));
  m.innerHTML = `<button type="button" class="pl-mcover" id="plMiniOpen" aria-label="${esc(t('pl_expand'))}"></button><div class="pl-mt" id="plMiniT"></div>
    <button type="button" class="ibtn" data-mini="prev" aria-label="${esc(t('pc_prev'))}"><i class="ti ti-player-skip-back"></i></button>
    <button type="button" class="ibtn" data-mini="play" id="plMiniPlay" aria-label="${esc(t('pc_play'))}"><i class="ti ti-player-play"></i></button>
    <button type="button" class="ibtn" data-mini="next" aria-label="${esc(t('pc_next'))}"><i class="ti ti-player-skip-forward"></i></button>
    <button type="button" class="ibtn" data-mini="stop" aria-label="${esc(t('pl_stop'))}"><i class="ti ti-x"></i></button>`;
  document.body.appendChild(m);
  plWire(d, m);
}

/* ---------- open / load ---------- */
async function playerOpen(rec, file, o = {}) {
  plBuild();
  const ids = (o.queue || [rec.id]).filter(id => { const r = files.find(x => x.id === id); return r && fileClass(r) !== 'book'; });
  PL.queue = ids.includes(rec.id) ? ids : [rec.id]; PL.qi = PL.queue.indexOf(rec.id);
  const d = pld(); if (!d.open) d.showModal();                               // on screen first: some browsers will not start a video that is not displayed
  $('plMini').hidden = true; plShowUi(); AWAKE.on();
  $('plb_play').focus({ preventScroll:true });                              // so that Space pauses, as everywhere; Close is one Tab away (and Esc)
  await plLoad(rec, file, o.start, o.side);
}
async function plLoad(rec, file, start, side) {
  const v = plv(); if (PL.rec) plPersist(true);
  v.pause(); if (PL.url) URL.revokeObjectURL(PL.url);
  Object.assign(PL, { rec, file, sub:null, subs:[], subOff:false, subDelay:0, altType:0, native:[], started:false });
  plPopClose(); $('plErr').hidden = true; $('plSub').textContent = '';
  const cls = fileClass(rec), title = rec.titleCn || rec.titleEn || rec.fileName;
  pld().dataset.cls = cls; $('plArt').hidden = cls !== 'audio'; $('plTitle').textContent = title; $('plSubtitle').textContent = [rec.director, rec.album].filter(Boolean).join(' · ');
  $('plCover').style.backgroundImage = rec.thumb ? `url('${rec.thumb}')` : ''; $('plCover').classList.toggle('empty', !rec.thumb); $('plCover').innerHTML = rec.thumb ? '' : '<i class="ti ti-music"></i>';
  v.poster = cls === 'video' && rec.thumb ? rec.thumb : '';
  PL.url = URL.createObjectURL(file); v.src = PL.url; v.load(); v.playbackRate = Number(store.get('vmm.plrate', '1')) || 1; v.volume = Number(store.get('vmm.plvol', '1')); v.muted = store.get('vmm.plmute', '0') === '1';
  $('plVol').value = v.muted ? 0 : v.volume; plSync(); plTicks(); plMediaSession();
  const pos = POS.get(rec), at = start != null ? start : (pos && pos.p > 0 && pos.p < .97 ? Math.max(0, (pos.v || 0) - 3) : 0);
  v.addEventListener('loadedmetadata', () => {
    if (isFinite(v.duration)) { $('plSeek').max = v.duration; }
    if (at > 1 && at < (v.duration || 1e9)) { v.currentTime = at; plOsd(t('pl_resumed', { t:fmtClock(at) })); }
    PL.started = true; plSync(); plTicks();
  }, { once:true });
  PL.subCand = side || PL.subCand || [];
  const mine = PL.subCand.find(f => f.name.replace(/\.[^.]+$/, '').toLowerCase() === rec.fileName.replace(/\.[^.]+$/, '').toLowerCase());
  if (mine) plSubFile(mine, true);
  try { await v.play(); } catch (e) { /* the browser asks for a click first; the play button is right there */ }
  trackerStarted(rec); plSync();
}
/* a file the browser cannot decode: try the other container name once (an .mkv is often WebM- or MP4-compatible), then say so plainly */
function plFail() {
  const v = plv(), f = PL.file; if (!f) return; const ext = (f.name.split('.').pop() || '').toLowerCase(), alt = { mkv:['video/webm', 'video/mp4'], mov:['video/mp4'], m4v:['video/mp4'], ts:['video/mp2t'], avi:[], wmv:[], flv:[], rmvb:[] }[ext] || [];
  if (PL.altType < alt.length) {
    const type = alt[PL.altType++], keep = v.currentTime; URL.revokeObjectURL(PL.url); PL.url = URL.createObjectURL(f.slice(0, f.size, type)); v.src = PL.url; v.load(); v.currentTime = keep; v.play().catch(() => {}); return;
  }
  const e = $('plErr'); e.hidden = false;
  e.innerHTML = `<i class="ti ti-alert-triangle"></i><b>${esc(t('pl_err_h'))}</b><p>${esc(t('pl_err_d', { ext:(ext || '?').toUpperCase() }))}</p><div class="row-btns"><a class="btn primary" href="https://www.videolan.org/vlc/" target="_blank" rel="noopener noreferrer"><i class="ti ti-external-link"></i>${esc(t('pl_err_vlc'))}</a>${PL.queue.length > 1 ? `<button type="button" class="btn" data-act="next">${esc(t('pc_next'))}</button>` : ''}</div>`;
}

/* ---------- state out: the bar, the seek line, the lock screen, the saved place ---------- */
function plSync() {
  const v = plv(), dur = isFinite(v.duration) ? v.duration : 0, cur = v.currentTime || 0, playing = !v.paused && !v.ended;
  const seek = $('plSeek'); if (document.activeElement !== seek || !PL.drag) { seek.max = dur || 0; seek.value = cur; }
  seek.style.setProperty('--p', dur ? (cur / dur * 100) + '%' : '0%'); seek.setAttribute('aria-valuetext', t('pl_at', { a:fmtClock(cur), b:fmtClock(dur) }));
  $('plCur').textContent = fmtClock(cur); $('plDur').textContent = PL.remain && dur ? '−' + fmtClock(dur - cur) : fmtClock(dur);
  const b = v.buffered; $('plBuf').style.width = dur && b.length ? (b.end(b.length - 1) / dur * 100) + '%' : '0%';
  const pb = $('plb_play'); if (pb) { pb.firstElementChild.className = 'ti ti-player-' + (playing ? 'pause' : 'play'); pb.setAttribute('aria-pressed', String(playing)); }
  const mp = $('plMiniPlay'); if (mp) mp.firstElementChild.className = 'ti ti-player-' + (playing ? 'pause' : 'play');
  const mv = $('plb_mute'); if (mv) mv.firstElementChild.className = 'ti ti-volume' + (v.muted || v.volume === 0 ? '-off' : v.volume < .5 ? '-2' : '');
  const lp = $('plb_loop'); if (lp) { lp.firstElementChild.className = 'ti ti-' + (PL.loop === 'one' ? 'repeat-once' : PL.loop === 'shuffle' ? 'arrows-shuffle' : 'repeat'); lp.classList.toggle('on', PL.loop !== 'off'); lp.setAttribute('aria-label', t('pc_loop') + ': ' + t('pl_loop_' + PL.loop)); }
  $('plSpeed').textContent = (+v.playbackRate.toFixed(2)) + '×';
  pld().classList.toggle('playing', playing);
}
/* bookmarks on the seek line: a mark you can see, hover to read its time, press to go there */
function plTicks() {
  const v = plv(), dur = isFinite(v.duration) ? v.duration : 0, el = $('plTicks'); if (!PL.rec) return;
  el.innerHTML = dur ? POS.live(PL.rec, 'bm').map(b => `<button type="button" class="pl-tick" tabindex="-1" style="left:${b.v / dur * 100}%" data-go="${esc(b.id)}" data-tip="${esc(fmtClock(b.v) + (b.label && b.label !== fmtClock(b.v) ? ' · ' + b.label : ''))}" aria-label="${esc(t('pl_bm_go', { t:fmtClock(b.v) }))}"></button>`).join('') : '';
}
function plMediaSession() {
  if (!('mediaSession' in navigator) || !PL.rec) return; const r = PL.rec, v = plv();
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title:r.titleCn || r.titleEn || r.fileName, artist:r.director || '', album:r.album || '', artwork:r.thumb ? [{ src:r.thumb, sizes:'240x240', type:'image/jpeg' }] : [] });
    const h = { play:() => v.play(), pause:() => v.pause(), seekbackward:e => plSeekBy(-(e.seekOffset || PL_STEP)), seekforward:e => plSeekBy(e.seekOffset || PL_STEP), previoustrack:() => plGo(-1), nexttrack:() => plGo(1), stop:() => plStop(),
      seekto:e => { v.currentTime = e.seekTime; } };
    Object.entries(h).forEach(([k, f]) => { try { navigator.mediaSession.setActionHandler(k, f); } catch (e) {} });
  } catch (e) {}
}
function plPersist(force) {
  const v = plv(), r = PL.rec; if (!r || !PL.started) return; const dur = isFinite(v.duration) ? v.duration : 0, cur = v.currentTime || 0, now = Date.now();
  if (!force && now - PL.lastSave < 5000) return; PL.lastSave = now;
  const p = dur ? cur / dur : 0; POS.set(r, p, cur, dur);
  if (force) { trackerProgress(r, p); if (p > .985 && dur > 30 && !v.loop) { POS.set(r, 1, 0, dur); trackerFinished(r); } }       // stopped in the credits is finished too
}
function plOsd(text, keep) {
  const o = $('plOsd'); o.textContent = text; o.classList.add('on'); clearTimeout(PL.osdTm); PL.osdTm = setTimeout(() => o.classList.remove('on'), keep || 1100); $('plLive').textContent = text;
}

/* ---------- actions ---------- */
const plSeekBy = s => { const v = plv(), d = isFinite(v.duration) ? v.duration : 1e9; v.currentTime = Math.max(0, Math.min(d, v.currentTime + s)); plOsd((s > 0 ? '+' : '−') + Math.abs(s) + ' s  ·  ' + fmtClock(v.currentTime)); plSync(); };
/* next / previous in the list. A file that cannot be opened without asking (moved, or not given access this session) is passed over, never
   turned into a dialog in the middle of listening: only Find-the-file from a click on that very file asks. */
async function plGo(dir, auto) {
  const n = PL.queue.length; if (!n) return false; let i = PL.qi, skipped = 0;
  for (let tries = 0; tries < n; tries++) {
    if (PL.loop === 'shuffle' && n > 1) { do { i = Math.floor(Math.random() * n); } while (i === PL.qi); }
    else { i += dir; if (i >= n) { if (PL.loop === 'all' || !auto) i = 0; else break; } if (i < 0) i = n - 1; }
    const r = files.find(x => x.id === PL.queue[i]); if (!r || i === PL.qi) continue;
    const f = await fileFor(r); if (!f) { skipped++; continue; }
    PL.qi = i; if (skipped) toast(t('pl_skipped', { n:skipped }), true);
    await plLoad(r, f, undefined, typeof dirSubs === 'function' ? await dirSubs(r) : undefined); plMediaSession(); return true;
  }
  if (skipped) toast(t('pl_skipped_all', { n:skipped }), true);
  return false;
}
function plSpeed(x) { const v = plv(); v.playbackRate = Math.max(0.25, Math.min(4, x)); store.set('vmm.plrate', String(v.playbackRate)); plOsd(t('pl_speed') + ' ' + (+v.playbackRate.toFixed(2)) + '×'); plSync(); }
function plVolume(x) { const v = plv(); v.muted = false; v.volume = Math.max(0, Math.min(1, x)); store.set('vmm.plvol', String(v.volume)); store.set('vmm.plmute', '0'); $('plVol').value = v.volume; plOsd(t('pl_volume') + ' ' + Math.round(v.volume * 100) + '%'); plSync(); }
function plMute() { const v = plv(); v.muted = !v.muted; store.set('vmm.plmute', v.muted ? '1' : '0'); $('plVol').value = v.muted ? 0 : v.volume; plOsd(t(v.muted ? 'pl_muted' : 'pl_unmuted')); plSync(); }
function plLoop() { PL.loop = PL_ORDER[(PL_ORDER.indexOf(PL.loop) + 1) % PL_ORDER.length]; plv().loop = PL.loop === 'one'; plOsd(t('pl_loop_' + PL.loop)); plSync(); }
async function plBookmark() {
  const v = plv(); if (!PL.rec) return; const at = v.currentTime, line = subLine();
  const near = POS.live(PL.rec, 'bm').find(b => Math.abs(b.v - at) < 2);                     // one place never holds two bookmarks
  if (near) { plOsd(t('pl_bm_dup', { t:fmtClock(near.v) })); return; }
  await POS.add(PL.rec, 'bm', { v:at, label:line || fmtClock(at), note:'' }); plTicks(); plOsd(t('pl_bm_added', { t:fmtClock(at) }));
  if (PL.menu && PL.menu.marks) plMarksPanel($('plMarksB'), true);
}
function plFull() { const d = pld(); if (document.fullscreenElement) document.exitFullscreen(); else if (d.requestFullscreen) d.requestFullscreen().catch(() => {}); }
function plStop() { plPersist(true); const v = plv(); v.pause(); if (pld().open) pld().close(); $('plMini').hidden = true; AWAKE.off(); PL.queue = []; }

/* ---------- subtitles: SRT, WebVTT, ASS read here, so delay is ours to set ---------- */
const subTime = s => { const m = String(s).trim().match(/(?:(\d+):)?(\d+):(\d+)[.,](\d+)/); return m ? (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]) + Number('0.' + m[4]) : NaN; };
const subClean = s => s.replace(/<[^>]+>/g, '').replace(/\{\\[^}]*\}/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();
function parseSubs(txt) {
  txt = txt.replace(/^﻿/, '').replace(/\r\n?/g, '\n'); const cues = [];
  if (/^\[Events\]/im.test(txt)) {                                       // ASS / SSA
    let cols = null, ti = -1;
    for (const line of txt.split('\n')) {
      if (/^Format:/i.test(line) && !cols && /text/i.test(line)) { cols = line.slice(7).split(',').map(x => x.trim().toLowerCase()); ti = cols.indexOf('text'); continue; }
      if (cols && /^Dialogue:/i.test(line)) { const p = line.slice(9).split(','), head = p.slice(0, ti), text = p.slice(ti).join(','); const s = subTime(head[cols.indexOf('start')]), e = subTime(head[cols.indexOf('end')]);
        if (!isNaN(s) && !isNaN(e)) cues.push({ s, e, t:subClean(text.replace(/\\N/gi, '\n').replace(/\\h/g, ' ')) }); }
    }
  } else for (const blk of txt.split(/\n{2,}/)) {
    const ls = blk.split('\n'), i = ls.findIndex(l => l.includes('-->')); if (i < 0) continue; const [a, b] = ls[i].split('-->'), s = subTime(a), e = subTime(b.trim().split(/\s/)[0]);
    if (!isNaN(s) && !isNaN(e)) cues.push({ s, e, t:subClean(ls.slice(i + 1).join('\n')) });
  }
  return cues.filter(c => c.t).sort((a, b) => a.s - b.s);
}
async function readTextFile(f) {                                         // UTF-8 first; the Chinese, Japanese and Korean encodings subtitle files are often saved in come next
  const u8 = new Uint8Array(await f.arrayBuffer());
  if (u8[0] === 0xff && u8[1] === 0xfe) return new TextDecoder('utf-16le').decode(u8); if (u8[0] === 0xfe && u8[1] === 0xff) return new TextDecoder('utf-16be').decode(u8);
  try { return new TextDecoder('utf-8', { fatal:true }).decode(u8); } catch (e) { /* not UTF-8 */ }
  for (const enc of ['gb18030', 'big5', 'shift_jis', 'euc-kr']) { try { const s = new TextDecoder(enc).decode(u8); if (looksCjk(s)) return s; } catch (e) {} }
  return new TextDecoder('windows-1252').decode(u8);
}
async function plSubFile(f, quiet) {
  try {
    const cues = parseSubs(await readTextFile(f)); if (!cues.length) throw 0;
    PL.subs.push({ id:'x' + PL.subs.length, label:f.name, cues }); PL.sub = PL.subs[PL.subs.length - 1]; PL.subOff = false; PL.subDelay = 0; plSubDraw();
    if (!quiet) plOsd(t('pl_sub_on', { n:f.name }));
  } catch (e) { toast(t('pl_sub_bad'), true); }
}
function plNative() {                                                    // text tracks that are inside the file itself
  const v = plv(); PL.native = [...v.textTracks].filter(tr => /subtitles|captions/.test(tr.kind)).map((tr, i) => { tr.mode = 'hidden'; return { id:'n' + i, label:tr.label || tr.language || t('pl_track_n', { n:i + 1 }), tr, native:true }; });
}
function plSubDraw() {
  const el = $('plSub'), v = plv(); let txt = '';
  if (!PL.subOff && PL.sub) {
    if (PL.sub.native) txt = [...(PL.sub.tr.activeCues || [])].map(c => (c.text || '').replace(/<[^>]+>/g, '')).join('\n');
    else { const c = PL.sub.cues, tt = v.currentTime - PL.subDelay; let lo = 0, hi = c.length - 1, k = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (c[m].s <= tt) { k = m; lo = m + 1; } else hi = m - 1; }
      const out = []; for (let i = k; i >= 0 && i > k - 4; i--) if (c[i].e > tt) out.unshift(c[i].t); txt = out.join('\n'); }
  }
  if (txt !== el.textContent) el.textContent = txt;
}
const plSubChoose = id => { PL.subOff = id === 'off'; if (!PL.subOff) { PL.sub = [...PL.subs, ...PL.native].find(s => s.id === id) || PL.sub; } plSubDraw(); plOsd(PL.subOff ? t('pl_sub_off') : t('pl_sub_on', { n:PL.sub.label })); };
function plSubCycle() { plNative(); const all = [...PL.subs, ...PL.native]; if (!all.length) return plOsd(t('pl_sub_none')); const i = PL.subOff ? -1 : all.indexOf(PL.sub), n = i + 1; if (n >= all.length) plSubChoose('off'); else plSubChoose(all[n].id); }
function plSubDelay(d) { PL.subDelay = Math.round((PL.subDelay + d) * 1000) / 1000; plOsd(t('pl_sub_delay', { n:(PL.subDelay >= 0 ? '+' : '') + Math.round(PL.subDelay * 1000) })); plSubDraw(); }
async function plSubPick() { const r = await pickLocal({ multiple:true, accept:'.srt,.vtt,.ass,.ssa,.txt' }); if (r) r.files.forEach(f => plSubFile(f)); }

/* ---------- menus: speed and subtitles (a list of choices), bookmarks (a list you can act on) ---------- */
function plPop(anchor, rows, label) {
  plPopClose(); const m = document.createElement('div'); m.className = 'pl-menu'; m.setAttribute('role', 'menu'); m.setAttribute('aria-label', label || '');
  m.innerHTML = rows.map((r, i) => r.sep ? '<hr>' : `<button type="button" role="${r.radio ? 'menuitemradio' : 'menuitem'}" ${r.radio ? `aria-checked="${!!r.on}"` : ''} data-i="${i}" class="${r.on ? 'on' : ''}"><i class="ti ti-${r.icon || (r.on ? 'check' : 'blank')}"></i><span>${esc(r.label)}</span>${r.hint ? `<em>${esc(r.hint)}</em>` : ''}</button>`).join('');
  pld().appendChild(m); PL.menu = { el:m, anchor, rows }; plPlace(m, anchor);
  m.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; const row = rows[+b.dataset.i]; if (row.keep) { row.fn(); return plPop(anchor, rows, label); } plPopClose(); anchor.focus(); row.fn && row.fn(); });
  m.addEventListener('keydown', plMenuKeys(m, anchor));
  (m.querySelector('button.on') || m.querySelector('button') || m).focus();
}
function plPlace(m, anchor) { const r = anchor.getBoundingClientRect(), d = pld().getBoundingClientRect(); m.style.left = Math.max(8, Math.min(r.left - d.left, d.width - m.offsetWidth - 8)) + 'px'; m.style.bottom = (d.bottom - r.top + 8) + 'px'; }
const plMenuKeys = (m, anchor) => e => {
  const bs = [...m.querySelectorAll('button')], i = bs.indexOf(document.activeElement);
  if (e.key === 'ArrowDown') { e.preventDefault(); bs[(i + 1) % bs.length].focus(); } else if (e.key === 'ArrowUp') { e.preventDefault(); bs[(i - 1 + bs.length) % bs.length].focus(); }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); plPopClose(); anchor.focus(); }
};
function plPopClose() { if (PL.menu) { PL.menu.el.remove(); PL.menu = null; } }
function plMenuSpeed(a) { plPop(a, PL_SPEEDS.map(x => ({ label:x + '×', radio:true, on:Math.abs(plv().playbackRate - x) < .01, fn:() => plSpeed(x) })), t('pl_speed')); }
function plMenuSubs(a) {
  plNative(); const all = [...PL.subs, ...PL.native], rows = [{ label:t('pl_sub_off'), radio:true, on:PL.subOff || !PL.sub, fn:() => plSubChoose('off') }, ...all.map(s => ({ label:s.label, radio:true, on:!PL.subOff && PL.sub === s, fn:() => plSubChoose(s.id) })), { sep:1 },
    { label:t('pl_sub_load'), icon:'file-plus', fn:plSubPick },
    { label:t('pc_subearlier'), hint:'G', icon:'minus', keep:true, fn:() => plSubDelay(-.05) }, { label:t('pc_sublater'), hint:'H', icon:'plus', keep:true, fn:() => plSubDelay(.05) }];
  plPop(a, rows, t('pc_subs'));
}
/* the bookmarks: where each one is (time and share of the whole), what was on screen, go there, remove */
function plMarksPanel(a, keepFocus) {
  const v = plv(), dur = isFinite(v.duration) ? v.duration : 0, S = PL.mk || (PL.mk = { sort:'time', q:'', edit:'' }), q = S.q.trim().toLowerCase();
  let list = POS.live(PL.rec, 'bm').filter(b => !q || (b.label + ' ' + (b.note || '') + ' ' + fmtClock(b.v)).toLowerCase().includes(q));
  list = S.sort === 'new' ? list.sort((x, y) => y.at - x.at) : list.sort((x, y) => x.v - y.v);
  const all = POS.live(PL.rec, 'bm').length;
  const row = b => S.edit === b.id
    ? `<div class="pl-mkedit"><label>${esc(t('pl_bm_name'))}<input type="text" class="pl-nm" maxlength="120" value="${esc(b.label || '')}"></label><label>${esc(t('pl_bm_note'))}<textarea rows="2" maxlength="1000">${esc(b.note || '')}</textarea></label><div class="row-btns"><button type="button" data-ecancel>${esc(t('cancel'))}</button><button type="button" data-esave="${esc(b.id)}">${esc(t('rd_note_save'))}</button></div></div>`
    : `<div class="pl-mk"><button type="button" class="pl-mkgo" data-go="${esc(b.id)}"><b>${fmtClock(b.v)}</b><span>${dur ? Math.round(b.v / dur * 100) + '%' : ''}${b.label && b.label !== fmtClock(b.v) ? ' · ' + esc(b.label) : ''}</span>${b.note ? `<span class="nt">${esc(b.note)}</span>` : ''}</button><button type="button" class="pl-b pl-del" data-edit="${esc(b.id)}" aria-label="${esc(t('pl_bm_rename'))}"><i class="ti ti-pencil"></i></button><button type="button" class="pl-b pl-del" data-del="${esc(b.id)}" aria-label="${esc(t('pl_bm_del'))}"><i class="ti ti-trash"></i></button></div>`;
  const m = document.createElement('div'); m.className = 'pl-menu pl-marks'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', t('pl_marks'));
  m.innerHTML = `<button type="button" class="pl-add" data-add><i class="ti ti-bookmark-plus"></i><span>${esc(t('pl_marks_add'))}</span><em>${fmtClock(v.currentTime)}</em></button>`
    + (all > 1 ? `<div class="pl-tools"><input type="search" id="plMkQ" placeholder="${esc(t('pl_marks_filter'))}" aria-label="${esc(t('pl_marks_filter'))}" value="${esc(S.q)}"><button type="button" class="pl-sortb" data-sort>${esc(t(S.sort === 'time' ? 'pl_marks_time' : 'pl_marks_new'))}</button></div>` : '')
    + (list.length ? list.map(row).join('') : `<div class="pl-none">${esc(t(all ? 'rd_nb_nomatch' : 'pl_marks_none'))}</div>`);
  const had = PL.menu && PL.menu.marks, prev = PL.menu && PL.menu.el; plPopClose(); pld().appendChild(m); PL.menu = { el:m, anchor:a, marks:true }; plPlace(m, a);
  m.addEventListener('click', async e => {
    if (e.target.closest('[data-add]')) return plBookmark();
    if (e.target.closest('[data-sort]')) { S.sort = S.sort === 'time' ? 'new' : 'time'; return plMarksPanel(a, true); }
    const go = e.target.closest('[data-go]'); if (go) { const b = list.find(x => x.id === go.dataset.go); if (b) { v.currentTime = b.v; plSync(); plSubDraw(); } plPopClose(); a.focus(); return; }
    const ed = e.target.closest('[data-edit]'); if (ed) { S.edit = ed.dataset.edit; plMarksPanel(a, true); const f = $('pl').querySelector('.pl-nm'); if (f) f.focus(); return; }
    if (e.target.closest('[data-ecancel]')) { S.edit = ''; return plMarksPanel(a, true); }
    const sv = e.target.closest('[data-esave]'); if (sv) { const box = sv.closest('.pl-mkedit'); await POS.edit(PL.rec, 'bm', sv.dataset.esave, { label:box.querySelector('.pl-nm').value.trim(), note:box.querySelector('textarea').value.trim() }); S.edit = ''; plTicks(); return plMarksPanel(a, true); }
    const del = e.target.closest('[data-del]'); if (del) { await POS.drop(PL.rec, 'bm', del.dataset.del); plTicks(); plMarksPanel(a, true); }
  });
  m.addEventListener('input', e => { if (e.target.id === 'plMkQ') { S.q = e.target.value; const pos = e.target.selectionStart; plMarksPanel(a, true); const f = $('plMkQ'); if (f) { f.focus(); f.setSelectionRange(pos, pos); } } });
  m.addEventListener('keydown', plMenuKeys(m, a));
  if (!keepFocus || !had) (m.querySelector('.pl-mkgo') || m.querySelector('.pl-add')).focus();
}

/* ---------- the Shortcuts sheet: every control, what it is for and where to find it ---------- */
function plKeysSheet(kind) {
  const rd = kind === 'rd', ACT = rd ? RD_ACT : PL_ACT, P = rd ? 'rc_' : 'pc_', groups = [...new Set(ACT.map(a => a[3]))];
  const keysOf = id => { const a = ACT.find(x => x[0] === id); return a ? a[2] : []; };
  const html = groups.map(g => `<h3>${esc(t('pl_' + g))}</h3>` + ACT.filter(a => a[3] === g).map(([id, icon]) => {
    const ks = keysOf(id);
    return `<details class="kr"><summary><i class="ti ti-${icon}" aria-hidden="true"></i><span class="kr-n">${esc(t(P + id))}</span><span class="kr-k">${ks.length ? ks.map(k => `<kbd>${esc(keyShow(k))}</kbd>`).join(' ') : '<em>—</em>'}</span></summary>
      <div class="kd"><p>${esc(t(P + id + '_d'))}</p><dl><dt>${esc(t('why_m'))}</dt><dd>${esc(t(P + id + '_m'))}</dd><dt>${esc(t('why_n'))}</dt><dd>${esc(t(P + id + '_n'))}</dd><dt>${esc(t('why_a'))}</dt><dd>${esc(t(P + id + '_a'))}</dd></dl></div></details>`;
  }).join('')).join('');
  uiDialog(`<div class="keysheet"><div class="ks-h"><h2>${esc(t('pl_keys_h'))}</h2><button type="button" class="ibtn" data-no aria-label="${esc(t('sh_close'))}"><i class="ti ti-x"></i></button></div><p class="section-desc">${esc(t('pl_keys_d'))}</p><div class="ks-b">${html}</div>
    <div class="ask-btns"><button type="button" class="btn primary" data-no>${esc(t('pk_done'))}</button></div></div>`, (d, done) => {
    d.classList.add('keysdlg'); d.querySelectorAll('[data-no]').forEach(b => b.onclick = () => done(true)); d.querySelector('.ks-h .ibtn').focus();
  });
}

/* ---------- wiring ---------- */
function plShowUi() {
  const d = pld(); d.classList.remove('idle'); clearTimeout(PL.hideTm);
  if (fileClass(PL.rec || {}) === 'video') PL.hideTm = setTimeout(() => { if (plv().paused || PL.menu || d.contains(document.activeElement) && document.activeElement.matches('input,select')) return; if (d.querySelector('.pl-bar:hover')) return; d.classList.add('idle'); }, 3000);
}
function plAct(id) {
  const v = plv(), speedIdx = () => { const i = PL_SPEEDS.findIndex(x => x >= v.playbackRate - .001); return i < 0 ? PL_SPEEDS.length - 1 : i; };
  switch (id) {
    case 'play': if (v.ended) { v.currentTime = 0; } v.paused || v.ended ? v.play().catch(() => {}) : v.pause(); break;
    case 'back': plSeekBy(-PL_STEP); break; case 'fwd': plSeekBy(PL_STEP); break;
    case 'prev': if (v.currentTime > 4 || PL.queue.length < 2) { v.currentTime = 0; } else plGo(-1); break; case 'next': plGo(1); break;
    case 'loop': plLoop(); break;
    case 'volup': plVolume(v.volume + .05); break; case 'voldown': plVolume(v.volume - .05); break; case 'mute': plMute(); break;
    case 'faster': plSpeed(PL_SPEEDS[Math.min(PL_SPEEDS.length - 1, speedIdx() + (PL_SPEEDS[speedIdx()] > v.playbackRate + .001 ? 0 : 1))]); break;
    case 'slower': plSpeed(PL_SPEEDS[Math.max(0, speedIdx() - 1)]); break; case 'normal': plSpeed(1); break;
    case 'subs': plSubCycle(); break; case 'subearlier': plSubDelay(-.05); break; case 'sublater': plSubDelay(.05); break; case 'subsmenu': plMenuSubs($('plSubsB')); break;
    case 'full': plFull(); break;
    case 'mark': plBookmark(); break; case 'marks': PL.menu && PL.menu.marks ? plPopClose() : plMarksPanel($('plMarksB')); break; case 'keys': plKeysSheet('pl'); break;
  }
  plSync(); plShowUi();
}
function plWire(d, mini) {
  const v = plv(), seek = $('plSeek');
  d.addEventListener('click', e => {
    const tick = e.target.closest('.pl-tick'); if (tick) { const b = POS.live(PL.rec, 'bm').find(x => x.id === tick.dataset.go); if (b) { v.currentTime = b.v; plSync(); plSubDraw(); } return; }
    const b = e.target.closest('[data-act]'); if (b && !b.disabled) { if (b.dataset.act !== 'marks') plPopClose(); return plAct(b.dataset.act); }
    if (PL.menu && !e.target.closest('.pl-menu')) plPopClose();
    if (e.target.id === 'plSpeed') plMenuSpeed(e.target);
    else if (e.target.id === 'plDur') { PL.remain = !PL.remain; e.target.setAttribute('aria-pressed', String(PL.remain)); plSync(); }
    else if (e.target.closest('#plClose')) { d.close(); closed(); }
  });
  /* what closing means: audio goes on in the small bar, video pauses here. Idempotent, because the browser fires 'close' a moment after close(). */
  const closed = () => {
    plPopClose(); plPersist(true); if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (PL.rec && fileClass(PL.rec) === 'audio' && !v.paused) { plMiniShow(); } else { v.pause(); AWAKE.off(); }
  };
  d.addEventListener('close', closed); PL.closed = closed;
  d.addEventListener('mousemove', plShowUi); d.addEventListener('keydown', plShowUi); d.addEventListener('pointerdown', plShowUi);
  const keymap = plKeyMap();
  d.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.target.closest('.pl-menu')) return;
    if (e.target.matches('input[type=text],textarea,select')) return;
    const k = keyName(e), act = keymap.get(k);
    if (k === 'Escape') { if (PL.menu) { plPopClose(); return; } e.preventDefault(); d.close(); return; }
    if (e.target.id === 'plVol' && /^Arrow(Left|Right|Up|Down)$/.test(e.key)) return;       // the volume slider keeps its own arrows
    if (e.target.matches('button') && (e.key === ' ' || e.key === 'Enter')) return;           // a focused button activates itself
    if (/^[1-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) { const dur = v.duration; if (isFinite(dur)) { v.currentTime = dur * Number(e.key) / 10; plOsd(Number(e.key) * 10 + '%'); plSync(); } e.preventDefault(); return; }
    if (act) { e.preventDefault(); plAct(act); }
  });
  seek.addEventListener('input', () => { PL.drag = true; v.currentTime = Number(seek.value); plSubDraw(); plSync(); });
  seek.addEventListener('change', () => { PL.drag = false; });
  seek.addEventListener('pointermove', e => { const r = seek.getBoundingClientRect(), f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), h = $('plHov'); h.hidden = false; h.textContent = fmtClock(f * (v.duration || 0)); h.style.left = f * 100 + '%'; });
  seek.addEventListener('pointerleave', () => { $('plHov').hidden = true; });
  $('plVol').addEventListener('input', e => plVolume(Number(e.target.value)));
  const stage = $('plStage'); let lastTap = 0;
  stage.addEventListener('click', e => { if (e.pointerType === 'touch' || (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents)) return; plPopClose(); if (fileClass(PL.rec) === 'video') plAct('play'); });
  stage.addEventListener('dblclick', e => { if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return; plAct('full'); });
  stage.addEventListener('pointerup', e => {                                // touch: double-tap the sides to jump, the middle to pause, a single tap shows or hides the bar
    if (e.pointerType !== 'touch') return; const now = Date.now(), third = stage.clientWidth / 3, x = e.clientX - stage.getBoundingClientRect().left;
    if (now - lastTap < 320) { lastTap = 0; if (x < third) plSeekBy(-PL_STEP); else if (x > 2 * third) plSeekBy(PL_STEP); else plAct('play'); }
    else { lastTap = now; if (d.classList.contains('idle')) plShowUi(); else { d.classList.add('idle'); clearTimeout(PL.hideTm); } }
  });
  ['play', 'pause', 'ended', 'volumechange', 'ratechange', 'seeked', 'progress', 'durationchange', 'loadedmetadata'].forEach(n => v.addEventListener(n, plSync));
  v.addEventListener('play', () => { AWAKE.on(); plShowUi(); }); v.addEventListener('pause', () => { plPersist(true); plShowUi(); if (!v.ended) AWAKE.off(); });
  v.addEventListener('timeupdate', () => { plSync(); plSubDraw(); plPersist(false); });
  v.addEventListener('ended', () => {
    const rec = PL.rec; plPersist(true); POS.set(rec, 1, 0, v.duration || 0); trackerProgress(rec, 1); plSync();
    trackerFinished(rec);                                                   // this file is finished, whatever plays next
    if (PL.loop === 'one') return;
    const more = PL.queue.length > 1 && (PL.loop === 'shuffle' || PL.qi < PL.queue.length - 1 || PL.loop === 'all');
    if (more) plGo(1, true);
  });
  v.addEventListener('error', plFail);
  setInterval(() => { if (PL.rec && !v.paused && !v.ended) { PL.secs++; STAT.add(fileClass(PL.rec) === 'video' ? 'video' : 'audio', 1); } }, 1000);
  document.addEventListener('fullscreenchange', () => { const on = !!document.fullscreenElement; const b = $('plb_full'); if (b) b.firstElementChild.className = 'ti ti-' + (on ? 'minimize' : 'maximize'); });
  mini.addEventListener('click', e => {
    if (e.target.closest('#plMiniOpen')) { mini.hidden = true; pld().showModal(); plShowUi(); return; }
    const b = e.target.closest('[data-mini]'); if (!b) return; const a = b.dataset.mini;
    if (a === 'play') plAct('play'); else if (a === 'prev') plAct('prev'); else if (a === 'next') plAct('next'); else if (a === 'stop') plStop();
  });
}
function plMiniShow() {
  const r = PL.rec, m = $('plMiniOpen'); if (!r) return; $('plMini').hidden = false; $('plMiniT').innerHTML = `<b>${esc(r.titleCn || r.titleEn || r.fileName)}</b><span>${esc(r.director || r.album || '')}</span>`;
  m.style.backgroundImage = r.thumb ? `url('${r.thumb}')` : ''; m.innerHTML = r.thumb ? '' : '<i class="ti ti-music"></i>'; plSync();
}
