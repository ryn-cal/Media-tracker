/* =====================================================================
   Hero: clock, greeting, quotes, wallpaper & tint
   ===================================================================== */
const HS = { bad:new Set(), key:'', hour:-1, bump:0, wbump:0, layer:0, wpFor:'', wtoken:0, cur:'', ds:null };
function renderQuote(now, animate) {
  const { q, exact, near, nearT } = pickQuote(now, HS.bump), box = $('quote');
  const apply = () => {
    const lines = q.text.split('\n'); let hlDone = !q.hl;
    const html = lines.map((ln, i) => { let s = esc(ln); if (!hlDone && q.hl) { const h = esc(q.hl); const k = s.indexOf(h); if (k >= 0) { s = s.slice(0, k) + '<mark>' + h + '</mark>' + s.slice(k + h.length); hlDone = true; } } return `<span class="ln" style="--i:${i}">${s}</span>`; }).join('');
    const qt = $('qText'); qt.innerHTML = html; qt.className = 'qtext' + (/[぀-ヿ]/.test(q.text) ? ' ja' : /[一-鿿]/.test(q.text) ? ' zh' : '');
    const kana = /[぀-ヿ]/.test(q.text), zhq = !kana && /[一-鿿]/.test(q.text), br = kana ? ['『', '』'] : ['《', '》'];
    $('qBy').textContent = '— ' + (zhq || kana ? (q.a && q.w ? (q.a[0] === '《' ? q.a + ' · ' + q.w : q.a + br[0] + q.w + br[1]) : (q.a || q.w || '')) : [q.a, q.w].filter(Boolean).join(', '));
    box.classList.remove('out'); void box.offsetWidth;
  };
  if (animate) { box.classList.add('out'); setTimeout(apply, 380); } else apply();
}
function paintTint(hex) { document.body.style.setProperty('--tint', hex); }
function extractTint(img, per) {
  try {
    const c = document.createElement('canvas'); c.width = 24; c.height = 16; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 24, 16); const d = x.getImageData(0, 0, 24, 16).data;
    let r = 0, g = 0, b = 0, wsum = 0;
    for (let i = 0; i < d.length; i += 4) { const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]), sat = mx ? (mx - mn) / mx : 0, lum = (d[i] + d[i + 1] + d[i + 2]) / 765, w = sat * sat * (1 - Math.abs(lum - .5)) + .02; r += d[i] * w; g += d[i + 1] * w; b += d[i + 2] * w; wsum += w; }
    r /= wsum; g /= wsum; b /= wsum; const mx = Math.max(r, g, b), k = mx > 190 ? 190 / mx : mx < 90 ? 90 / Math.max(mx, 1) : 1;
    return `rgb(${Math.min(255, r * k) | 0},${Math.min(255, g * k) | 0},${Math.min(255, b * k) | 0})`;
  } catch (e) { return WP_TINT[per]; }
}
/* load one painting; falls back to a non-CORS load (tint then uses the preset), gives up after 14 s */
function loadPainting(w, cb) {
  const url = w.custom ? w.url : wpUrl(w, wpWidth()); let done = false;
  const fin = (img, tinted) => { if (done) return; done = true; clearTimeout(tm); cb(img, tinted, url); };
  const tm = setTimeout(() => fin(null), 14000);
  /* Wikimedia's redirect never allows a cross-origin read, so once the plain load has worked where the CORS one failed we stop asking:
     one console error per visit used to become one per painting, every time the page opened (v18) */
  const noCors = !w.custom && store.get('vmm.wpnocors', '') === '1', a = new Image(); if (!noCors) a.crossOrigin = 'anonymous';
  a.onload = () => fin(a, !noCors);
  a.onerror = () => { const b = new Image(); b.onload = () => { if (!noCors && !w.custom) store.set('vmm.wpnocors', '1'); fin(b, false); }; b.onerror = () => fin(null); b.src = url; };
  a.src = url;
}
function setWallpaper(per, now, manual) {
  const bg = $('bg');
  if (prefs.wp === 'off') { $('wpA').classList.remove('on'); $('wpB').classList.remove('on'); bg.style.background = WP_FALLBACK[per]; paintTint(WP_TINT[per]); $('creditText').textContent = ''; HS.wpFor = ''; HS.cur = ''; return; }
  const cands = []; for (let k = 0; k < 5; k++) { const w = chooseWallpaper(per, now, HS.wbump + k); if (w && !HS.bad.has(w.f) && !cands.some(c => (c.f || 'custom') === (w.f || 'custom'))) cands.push(w); }
  let list = manual && HS.cur ? cands.filter(c => c.f !== HS.cur) : cands;
  if (!list.length) { bg.style.background = WP_FALLBACK[per]; paintTint(WP_TINT[per]); return; }
  const sig = (list[0].f || 'custom') + prefs.wp; if (!manual && HS.wpFor === sig) return;
  HS.wpFor = sig; bg.style.background = WP_FALLBACK[per]; paintTint(WP_TINT[per]);
  const token = ++HS.wtoken;
  const attempt = i => {
    if (token !== HS.wtoken) return;
    if (i >= list.length) return;
    const w = list[i];
    loadPainting(w, (img, tinted, url) => {
      if (token !== HS.wtoken) return;
      if (!img) { HS.bad.add(w.f); return attempt(i + 1); }               // this one is slow or blocked: remember that and quietly try the next painting
      if (!manual && w.f && w.f === HS.cur) return;   // already showing it: no second crossfade
      const next = HS.layer ? $('wpA') : $('wpB'), prev = HS.layer ? $('wpB') : $('wpA'); HS.layer ^= 1;
      next.style.backgroundImage = `url("${url}")`; next.classList.add('on'); prev.classList.remove('on');
      paintTint(tinted ? extractTint(img, per) : WP_TINT[per]); HS.cur = w.f || ''; HS.wpFor = (w.f || 'custom') + prefs.wp;
      $('creditText').innerHTML = w.custom ? esc(t('wc_mine')) : `${esc(wpT(w))}${wpA(w) ? ' — ' + esc(wpA(w)) : ''}${w.y ? ', ' + esc(wpY(w)) : ''}${w.l ? ' · ' + esc(w.l) : ''} · <a href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(w.f.replace(/ /g, '_'))}" target="_blank" rel="noopener">${esc(t('wm'))}</a>`;
      const nx = chooseWallpaper(per, now, HS.wbump + 1); if (nx && !nx.custom && nx.f !== w.f) { const pre = new Image(); pre.src = wpUrl(nx, wpWidth()); }   // warm the cache for the next one
    });
  };
  attempt(0);
}
function greeting(h) {
  const k = h < 5 ? 'greet_late' : h < 12 ? 'greet_morning' : h < 14 ? 'greet_noon' : h < 18 ? 'greet_afternoon' : h < 22 ? 'greet_evening' : 'greet_night';
  const g = t(k); return prefs.name ? g + (prefs.lang === 'zh' ? '，' : ', ') + prefs.name : g;
}
function drawClock(now) {
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds(); let hh = String(h).padStart(2, '0'), suf = '';
  if (prefs.clock === '12') { suf = prefs.lang === 'zh' ? (h < 6 ? '凌晨' : h < 12 ? '上午' : h < 14 ? '中午' : h < 18 ? '下午' : '晚上') : h < 12 ? 'AM' : 'PM'; hh = String(h % 12 || 12); }
  const chars = (hh + ':' + String(m).padStart(2, '0') + (prefs.secs ? ':' + String(s).padStart(2, '0') : '')).split('');
  const sig = chars.length + suf + prefs.secs; const el = $('clock');
  if (HS.ds !== sig) { HS.ds = sig; el.innerHTML = chars.map((c, i) => c === ':' ? '<span class="cl">:</span>' : `<span class="dg ${prefs.secs && i >= chars.length - 2 ? 'sec' : ''}"></span>`).join('') + (suf ? `<small>${suf}</small>` : ''); el._d = null; }
  const dg = $$('.dg', el); let k = 0;
  chars.forEach(c => { if (c === ':') return; const d = dg[k++]; if (d && d.textContent !== c) { d.textContent = c; if (el._d) { d.classList.remove('roll'); void d.offsetWidth; d.classList.add('roll'); } } });
  el._d = true;
}
function tick(force) {
  const now = new Date(), h = now.getHours(), m = now.getMinutes();
  drawClock(now);
  const key = h + ':' + m, per = periodOf(h);
  if (key !== HS.key || force) {
    const first = !HS.key; HS.key = key; if (!force) HS.bump = 0;
    $('date').textContent = now.toLocaleDateString(prefs.lang === 'zh' ? 'zh-CN' : 'en-US', { weekday:'long', month:'long', day:'numeric' });
    if (h !== HS.hour || force) { $('greet').textContent = greeting(h); $('greet').classList.toggle('zh', prefs.lang === 'zh'); HS.hour = h; }
    renderQuote(now, !first && !force);
    const slot = per + ':' + wpSlot(per, now); if (slot !== HS.slot) { HS.slot = slot; HS.wbump = 0; }
    setWallpaper(per, now, false);                                       // changes by itself as the clock moves through each time-of-day slot
  }
}
$('quote').onclick = () => { HS.bump++; renderQuote(new Date(), true); };

