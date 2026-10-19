/* =====================================================================
   Appearance: colour, background and type are each customisable in the same three ways —
     System  pick from what the app ships      Upload  bring your own file      Design  build it yourself
   The tab you pick is the source that is live. Each source remembers its own value, so switching back loses nothing.
   Icons work per destination (Settings → Icons). Wide and phone share all of this; only the phone shows it as separate pages.
   ===================================================================== */
const apGet = (k, d) => store.get('vmm.ap.' + k, d);
const AP = {
  acSrc:apGet('acSrc', 'system'), acSys:apGet('acSys', '#4f6bd8'), acUp:apGet('acUp', ''), acDes:apGet('acDes', '#d4572a'),
  skSrc:apGet('skSrc', 'off'), skSys:apGet('skSys', ''), skUp:'', skC1:apGet('skC1', '#e8d9c5'), skC2:apGet('skC2', '#9db4d8'), skAng:apGet('skAng', '135'), skDim:Number(apGet('skDim', '80')),
  fnSrc:apGet('fnSrc', 'system'), fnD:apGet('fnD', 'classic'), fnU:apGet('fnU', 'modern'), fnW:apGet('fnW', '400'), fnRole:'d', fnName:'',
  icQ:'', icons:(() => { try { return JSON.parse(apGet('icons', '{}')) || {}; } catch (e) { return {}; } })(), icOpen:''
};
const apSet = (k, v) => { AP[k] = v; store.set('vmm.ap.' + k, typeof v === 'object' ? JSON.stringify(v) : String(v)); };
const SRC_TABS = [['system', 'ap_system'], ['upload', 'ap_upload'], ['design', 'ap_design']];
const srcTabs = (id, cur, tabs) => `<div class="src-tabs" data-for="${id}">${(tabs || SRC_TABS).map(([k, l]) => `<button type="button" data-src="${k}" aria-pressed="${cur === k}">${esc(t(l))}</button>`).join('')}</div>`;
/* a picture → a small data URL (kept in the browser; nothing is uploaded anywhere) */
function readImage(file, side, type, q) {
  return new Promise((res, rej) => { const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { const k = Math.min(1, side / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res({ url:c.toDataURL(type, q), canvas:c }); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image')); }; img.src = url; });
}
const hex2rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgb2hex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
function hslHex(h, s, l) { const a = s * Math.min(l, 1 - l), f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return rgb2hex(f(0) * 255, f(8) * 255, f(4) * 255); }
function dominantColor(canvas) {                      // the most common saturated hue in the picture, darkened until white text reads on it
  const s = 40, c = document.createElement('canvas'); c.width = c.height = s; const x = c.getContext('2d'); x.drawImage(canvas, 0, 0, s, s); const d = x.getImageData(0, 0, s, s).data, bins = new Array(24).fill(0), sat = new Array(24).fill(0);
  for (let i = 0; i < d.length; i += 4) { const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dl = mx - mn; if (dl < .12 || l < .15 || l > .9) continue;
    const sa = dl / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / dl) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4; h = (h * 60 + 360) % 360; const k = Math.floor(h / 15); bins[k] += sa; sat[k] += sa * sa; }
  const best = bins.indexOf(Math.max(...bins)); if (!bins[best]) return '#4f6bd8'; return hslHex(best * 15 + 7, .62, .46);
}

/* ---------- accent colour ---------- */
const ACCENTS = ['#4f6bd8', '#2a78d6', '#0f9d8a', '#2f9e63', '#d98a1f', '#e0603a', '#d93f78', '#8b5cf6', '#4b5563'];
const accentNow = () => AP.acSrc === 'upload' ? AP.acUp : AP.acSrc === 'design' ? AP.acDes : AP.acSys;
function applyAccent() {
  const h = document.documentElement, c = accentNow();
  ['--accent', '--fill-accent', '--bg-accent', '--text-accent', '--border-accent'].forEach(p => h.style.removeProperty(p));
  if (!c || c.toLowerCase() === '#4f6bd8') return h.removeAttribute('data-accent');
  h.dataset.accent = '1'; h.style.setProperty('--accent', c); h.style.setProperty('--fill-accent', c);
  h.style.setProperty('--bg-accent', `color-mix(in srgb, ${c} 14%, var(--surface-2))`); h.style.setProperty('--text-accent', `color-mix(in srgb, ${c} 82%, var(--text-primary))`); h.style.setProperty('--border-accent', `color-mix(in srgb, ${c} 50%, var(--surface-2))`);
}
function renderColors() {
  $('acSrc').innerHTML = srcTabs('ac', AP.acSrc);
  const sw = (c, cur) => `<button type="button" class="swatch" data-ac="${c}" style="--c:${c}" aria-pressed="${cur.toLowerCase() === c}" aria-label="${c}"><i class="ti ti-check"></i></button>`;
  $('acBody').innerHTML = AP.acSrc === 'system' ? `<div class="swatches">${ACCENTS.map(c => sw(c, AP.acSys)).join('')}</div>`
    : AP.acSrc === 'upload' ? `<div class="up-row"><button type="button" class="btn" id="acPickImg"><i class="ti ti-photo-up"></i>${esc(t('ap_pick_img'))}</button>${AP.acUp ? `<span class="swatch big" style="--c:${AP.acUp}"></span><code>${AP.acUp}</code>` : ''}</div><p class="hint">${esc(t('ap_accent_up'))}</p>`
    : `<div class="up-row"><input type="color" id="acPick" value="${AP.acDes}"><input type="text" id="acHex" value="${AP.acDes}" maxlength="7" spellcheck="false" autocomplete="off"><span class="swatch big" style="--c:${AP.acDes}"></span></div><p class="hint">${esc(t('ap_accent_des'))}</p>`;
  const sk = AP.skSrc;
  $('skSrc').innerHTML = srcTabs('sk', sk, [['off', 'ap_off'], ...SRC_TABS]);
  let body = '';
  if (sk === 'system') body = `<div class="skin-gal">${WP_LIST.slice(0, 15).map(w => `<button type="button" class="skin-th" data-sk="${esc(w.f)}" aria-pressed="${AP.skSys === w.f}" style="background-image:url('${esc(wpUrl(w, 260).replace(/'/g, '%27'))}')"></button>`).join('')}</div>`;
  else if (sk === 'upload') body = `<div class="up-row"><button type="button" class="btn" id="skPick"><i class="ti ti-photo-up"></i>${esc(t('ap_pick_img'))}</button>${AP.skUp ? `<button type="button" class="btn" id="skRm"><i class="ti ti-trash"></i>${esc(t('ap_remove'))}</button><span class="skin-th now" style="background-image:url('${AP.skUp}')"></span>` : ''}</div>`;
  else if (sk === 'design') body = `<div class="up-row"><input type="color" id="skC1" value="${AP.skC1}"><input type="color" id="skC2" value="${AP.skC2}"><div class="seg" id="skAng">${[['135', '↘'], ['180', '↓'], ['90', '→'], ['r', '◎']].map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${AP.skAng === v}">${l}</button>`).join('')}</div></div>`;
  if (sk !== 'off') body += `<label class="slider"><span>${esc(t('ap_soft'))}</span><input type="range" id="skDim" min="40" max="96" value="${AP.skDim}"></label><p class="hint">${esc(t('ap_skin_hint'))}</p>`;
  $('skBody').innerHTML = body;
}
$('acSrc').addEventListener('click', e => { const b = e.target.closest('[data-src]'); if (b) { apSet('acSrc', b.dataset.src); applyAccent(); renderColors(); } });
$('acBody').addEventListener('click', e => {
  const s = e.target.closest('[data-ac]'); if (s) { apSet('acSys', s.dataset.ac); applyAccent(); renderColors(); }
  if (e.target.closest('#acPickImg')) $('acFile').click();
});
$('acBody').addEventListener('input', e => {
  if (e.target.id === 'acPick') { apSet('acDes', e.target.value); applyAccent(); $('acHex').value = e.target.value; document.querySelector('#acBody .swatch.big').style.setProperty('--c', e.target.value); }
  if (e.target.id === 'acHex' && /^#[0-9a-f]{6}$/i.test(e.target.value)) { apSet('acDes', e.target.value.toLowerCase()); applyAccent(); $('acPick').value = AP.acDes; document.querySelector('#acBody .swatch.big').style.setProperty('--c', AP.acDes); }
});
$('acFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { const { canvas } = await readImage(f, 160, 'image/jpeg', .8); apSet('acUp', dominantColor(canvas)); apSet('acSrc', 'upload'); applyAccent(); renderColors(); toast(t('t_saved')); } catch (x) { toast(t('ap_bad_img'), true); } };

/* ---------- background skin (every page except Home, which has its own picture) ---------- */
function skinCss() {
  if (AP.skSrc === 'system' && AP.skSys) return `url('${wpUrl({ f:AP.skSys }, 1280).replace(/'/g, '%27')}')`;
  if (AP.skSrc === 'upload' && AP.skUp) return `url('${AP.skUp}')`;
  if (AP.skSrc === 'design') return AP.skAng === 'r' ? `radial-gradient(circle at 30% 20%, ${AP.skC1}, ${AP.skC2})` : `linear-gradient(${AP.skAng}deg, ${AP.skC1}, ${AP.skC2})`;
  return '';
}
function applySkin() {
  const h = document.documentElement, v = skinCss();
  if (!v) { h.removeAttribute('data-skin'); h.style.removeProperty('--skin'); return; }
  h.dataset.skin = '1'; h.style.setProperty('--skin', v); h.style.setProperty('--skin-dim', AP.skDim + '%');
}
$('skSrc').addEventListener('click', e => { const b = e.target.closest('[data-src]'); if (b) { apSet('skSrc', b.dataset.src); applySkin(); renderColors(); } });
$('skBody').addEventListener('click', async e => {
  const th = e.target.closest('[data-sk]'); if (th) { apSet('skSys', th.dataset.sk); applySkin(); renderColors(); }
  if (e.target.closest('#skPick')) $('skFile').click();
  if (e.target.closest('#skRm')) { AP.skUp = ''; try { await DB.put('kv', { k:'skin', v:'' }); } catch (x) {} applySkin(); renderColors(); }
  const an = e.target.closest('#skAng [data-v]'); if (an) { apSet('skAng', an.dataset.v); applySkin(); renderColors(); }
});
$('skBody').addEventListener('input', e => {
  if (e.target.id === 'skC1') { apSet('skC1', e.target.value); applySkin(); } if (e.target.id === 'skC2') { apSet('skC2', e.target.value); applySkin(); }
  if (e.target.id === 'skDim') { apSet('skDim', Number(e.target.value)); applySkin(); }
});
$('skFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { AP.skUp = (await readImage(f, 1280, 'image/jpeg', .8)).url; await DB.put('kv', { k:'skin', v:AP.skUp }); apSet('skSrc', 'upload'); applySkin(); renderColors(); toast(t('t_saved')); } catch (x) { toast(t('ap_bad_img'), true); } };

/* ---------- fonts ----------
   Design lists only fonts this device really has (web fonts such as Inter or Lora do not load offline, so offering them made
   every choice look the same). Availability is measured, not assumed. */
const FONT_CAT = [
  ['HarmonyOS Sans SC', 'sans'], ['HarmonyOS Sans', 'sans'], ['PingFang SC', 'sans'], ['Noto Sans SC', 'sans'], ['Noto Sans CJK SC', 'sans'], ['Source Han Sans SC', 'sans'], ['Microsoft YaHei', 'sans'], ['Helvetica Neue', 'sans'], ['Segoe UI', 'sans'], ['Roboto', 'sans'], ['Inter', 'sans'], ['Nunito', 'sans'],
  ['Noto Serif SC', 'serif'], ['Noto Serif CJK SC', 'serif'], ['Source Han Serif SC', 'serif'], ['Songti SC', 'serif'], ['STSong', 'serif'], ['SimSun', 'serif'], ['Georgia', 'serif'], ['Times New Roman', 'serif'], ['Palatino', 'serif'], ['Cormorant Garamond', 'serif'], ['Lora', 'serif'],
  ['Kaiti SC', 'kai'], ['STKaiti', 'kai'], ['KaiTi', 'kai'], ['Ma Shan Zheng', 'kai'],
  ['Yuanti SC', 'round'], ['Arial Rounded MT Bold', 'round'], ['Hiragino Maru Gothic ProN', 'round'],
  ['SF Mono', 'mono'], ['Menlo', 'mono'], ['Consolas', 'mono'], ['Roboto Mono', 'mono'], ['Courier New', 'mono']
];
const FONT_TAIL = { sans:'"PingFang SC","Noto Sans SC",system-ui,sans-serif', serif:'"Noto Serif SC","Songti SC",Georgia,serif', kai:'"Kaiti SC","STKaiti",cursive,serif', round:'ui-rounded,"PingFang SC",sans-serif', mono:'ui-monospace,"PingFang SC",monospace' };
const fontStack = f => `"${f.n}",${FONT_TAIL[f.c]}`;
let FONT_AVAIL = null;                                 // [{ n, c, w }] once measured
const userStack = '"UserFont",-apple-system,BlinkMacSystemFont,"PingFang SC","Noto Sans SC",system-ui,sans-serif';
async function measureFonts() {
  if (FONT_AVAIL) return FONT_AVAIL;
  const cx = document.createElement('canvas').getContext('2d'), probe = 'mmmmmmmmlli丽影Ag', width = (fam, base) => { cx.font = `64px ${fam ? `"${fam}",` : ''}${base}`; return cx.measureText(probe).width; };
  await Promise.all(FONT_CAT.map(([n]) => Promise.race([document.fonts.load(`16px "${n}"`), new Promise(r => setTimeout(r, 1200))]).catch(() => {})));
  const generics = [['System Sans', 'sans', 'sans-serif'], ['System Serif', 'serif', 'serif'], ['System Mono', 'mono', 'monospace'], ['System Handwriting', 'kai', 'cursive']];
  const out = [], seen = new Set(), add = (n, c, w) => { const sig = Math.round(w * 10); if (seen.has(sig)) return; seen.add(sig); out.push({ n, c, w }); };
  generics.forEach(([n, c, base]) => add(n, c, width('', base)));
  FONT_CAT.forEach(([n, c]) => { const w1 = width(n, 'monospace'), w2 = width(n, 'serif'); if (w1 !== width('', 'monospace') || w2 !== width('', 'serif')) add(n, c, w1 === width('', 'monospace') ? w2 : w1); });
  return (FONT_AVAIL = out);
}
const fontPick = (k, role) => k === 'mine' && AP.fnName ? userStack : k === 'System Sans' ? '-apple-system,"PingFang SC","Noto Sans SC",system-ui,sans-serif' : k === 'System Serif' ? FONT_TAIL.serif : k === 'System Mono' ? FONT_TAIL.mono : k === 'System Handwriting' ? FONT_TAIL.kai : FONTS[k] ? FONTS[k][role] : (FONT_CAT.find(x => x[0] === k) ? fontStack({ n:k, c:FONT_CAT.find(x => x[0] === k)[1] }) : FONTS.classic[role]);
function applyFont() {
  const h = document.documentElement; ['--font-ui', '--font-display', '--font-num', '--fd', '--fn', '--head-w'].forEach(p => h.style.removeProperty(p));
  if (AP.fnSrc === 'system' || (AP.fnSrc === 'upload' && !AP.fnName)) { h.dataset.font = prefs.font; return; }
  const disp = AP.fnSrc === 'upload' ? userStack : fontPick(AP.fnD, 'd'), ui = AP.fnSrc === 'upload' ? userStack : fontPick(AP.fnU, 'u');
  h.dataset.font = 'custom'; h.style.setProperty('--font-display', disp); h.style.setProperty('--fd', disp); h.style.setProperty('--font-ui', ui); h.style.setProperty('--font-num', ui); h.style.setProperty('--fn', ui);
  if (AP.fnSrc === 'design') h.style.setProperty('--head-w', AP.fnW);
}
{ const _look = applyLook; applyLook = function () { _look.apply(this, arguments); applyFont(); }; }
function fontVars() {
  if (AP.fnSrc === 'upload' && AP.fnName) return { d:userStack, u:userStack, w:'500' };
  if (AP.fnSrc === 'design') return { d:fontPick(AP.fnD, 'd'), u:fontPick(AP.fnU, 'u'), w:AP.fnW };
  const f = FONTS[prefs.font] || FONTS.classic; return { d:f.d, u:f.u, w:'500' };
}
/* the preview is a small mock of the app drawn with the chosen fonts, so nothing else on screen has to change to judge them */
const fontMock = () => { const v = fontVars(); return `<div class="fn-mock" style="${esc(`--mk-d:${v.d};--mk-u:${v.u};--mk-w:${v.w}`)}"><div class="mk-t">${esc(t('ap_mk_title'))}</div><div class="mk-s">${esc(t('ap_mk_sub'))}</div><div class="mk-row"><b>${esc(t('ap_mk_a'))}</b><i>1954</i></div><div class="mk-row"><b>${esc(t('ap_mk_b'))}</b><i>2001</i></div><div class="mk-foot"><span class="mk-chip">${esc(t('ap_mk_chip'))}</span><span class="mk-btn">${esc(t('ap_mk_btn'))}</span></div></div><p class="fn-note">${esc(t('ap_f_home'))}</p>`; };
/* a weight is only offered if the font really draws it differently (most system fonts have no Light) */
function weightsFor(stack) {
  const cx = document.createElement('canvas').getContext('2d'), width = x => { cx.font = `${x} 48px ${stack}`; return cx.measureText('Hamburgefonstiv 光影 Quiet 0123').width; }, base = width(400);
  return ['400', ...['300', '600'].filter(x => Math.abs(width(x) - base) > .5)].sort();
}
async function renderFontSettings() {
  $('fnSrc').innerHTML = srcTabs('fn', AP.fnSrc);
  if (AP.fnSrc === 'system') {
    $('fnBody').innerHTML = fontMock() + `<div class="fontgrid" id="fontGrid">${Object.keys(FONTS).map(k => `<button type="button" class="fontcard" data-font="${k}" aria-pressed="${prefs.font === k}"><div class="big" style="font-family:${FONTS[k].d}">Aa 光影</div><div class="mid" style="font-family:${FONTS[k].u}">${esc(t('font_' + k + '_d'))}</div><div class="nm"><b>${esc(t('font_' + k))}</b></div></button>`).join('')}</div><p class="hint" id="fnNet" hidden>${esc(t('ap_font_net'))}</p>`;
    measureFonts().then(av => { const n = $('fnNet'); if (n) n.hidden = av.some(f => ['Inter', 'Nunito', 'Lora', 'Cormorant Garamond'].includes(f.n)); });
  } else if (AP.fnSrc === 'upload') {
    $('fnBody').innerHTML = fontMock() + `<div class="up-row"><button type="button" class="btn" id="fnPick"><i class="ti ti-file-upload"></i>${esc(t('ap_pick_font'))}</button>${AP.fnName ? `<button type="button" class="btn" id="fnRm"><i class="ti ti-trash"></i>${esc(t('ap_remove'))}</button>` : ''}</div>${AP.fnName ? `<div class="fn-prev" style="font-family:${userStack}"><div class="big">Aa 光影 ${esc(AP.fnName)}</div><div>${esc(t('ap_font_sample'))}</div></div>` : `<p class="hint">${esc(t('ap_font_none'))}</p>`}`;
  } else {
    $('fnBody').innerHTML = `<p class="hint">${esc(t('ap_f_checking'))}</p>`;
    const av = await measureFonts(); if (AP.fnSrc !== 'design' || !$('fnBody')) return;
    const role = AP.fnRole, cur = role === 'd' ? AP.fnD : AP.fnU, list = [...Object.keys(FONTS).map(k => ({ n:k, label:t('font_' + k) })), ...av.map(f => ({ n:f.n, label:f.n })), ...(AP.fnName ? [{ n:'mine', label:AP.fnName }] : [])];
    $('fnBody').innerHTML = fontMock() + `<div class="seg" id="fnRole"><button type="button" data-v="d" aria-pressed="${role === 'd'}">${esc(t('ap_f_head'))}</button><button type="button" data-v="u" aria-pressed="${role === 'u'}">${esc(t('ap_f_text'))}</button></div>
      <div class="fontlist">${list.map(f => `<button type="button" class="fontrow" data-fam="${esc(f.n)}" aria-pressed="${cur === f.n}"><span class="sample" style="font-family:${fontPick(f.n, role)}">Aa 光影 ${esc(t('ap_f_samp'))}</span><small>${esc(f.label)}</small></button>`).join('')}</div>
      ${(() => { const ws = weightsFor(fontPick(AP.fnD, 'd')); if (!ws.includes(AP.fnW)) { AP.fnW = '400'; applyFont(); } return ws.length > 1 ? `<div class="row"><label>${esc(t('ap_f_weight'))}</label><div class="seg" id="fnW">${[['300', 'ap_w_light'], ['400', 'ap_w_reg'], ['600', 'ap_w_bold']].filter(([v]) => ws.includes(v)).map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${AP.fnW === v}">${esc(t(l))}</button>`).join('')}</div></div>` : `<p class="hint">${esc(t('ap_w_one'))}</p>`; })()}`;
  }
}
$('fnSrc').addEventListener('click', e => { const b = e.target.closest('[data-src]'); if (b) { apSet('fnSrc', b.dataset.src); applyFont(); renderFontSettings(); } });
$('fnBody').addEventListener('click', async e => {
  const f = e.target.closest('[data-font]'); if (f) { setPref('font', f.dataset.font); applyFont(); renderFontSettings(); }
  const r = e.target.closest('#fnRole [data-v]'); if (r) { AP.fnRole = r.dataset.v; renderFontSettings(); }
  const fam = e.target.closest('[data-fam]'); if (fam) { apSet(AP.fnRole === 'd' ? 'fnD' : 'fnU', fam.dataset.fam); applyFont(); renderFontSettings(); }
  const w = e.target.closest('#fnW [data-v]'); if (w) { apSet('fnW', w.dataset.v); applyFont(); renderFontSettings(); }
  if (e.target.closest('#fnPick')) $('fontFile').click();
  if (e.target.closest('#fnRm')) { AP.fnName = ''; try { await DB.put('kv', { k:'font', v:null }); } catch (x) {} applyFont(); renderFontSettings(); }
});
async function installFont(name, data) { const face = new FontFace('UserFont', data); await face.load(); document.fonts.add(face); AP.fnName = name; }
$('fontFile').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return; if (f.size > 12 * 1048576) return toast(t('ap_font_big'), true);
  try { const data = await f.arrayBuffer(); await installFont(f.name.replace(/\.[^.]+$/, ''), data.slice(0)); await DB.put('kv', { k:'font', v:{ name:AP.fnName, data } }); apSet('fnSrc', 'upload'); applyFont(); renderFontSettings(); toast(t('t_saved')); } catch (x) { toast(t('ap_font_bad'), true); }
};

/* ---------- icons: one editor per destination ----------
   System   any icon of the Tabler set (about 5,000, searchable) — the list is read from the stylesheet the app already uses
   Upload   your own small picture
   Design   an icon, its colour, a tile shape and how the tile is filled */
const IC_SET = ['sun', 'home', 'smart-home', 'bookmarks', 'bookmark', 'books', 'book', 'database', 'folder', 'list-check', 'chart-dots-3', 'chart-bar', 'sparkles', 'archive', 'arrows-exchange', 'compass', 'star', 'heart', 'flame', 'bolt', 'moon', 'coffee', 'music', 'movie', 'device-tv', 'headphones', 'photo', 'camera', 'rocket', 'trophy', 'diamond', 'leaf', 'palette'];
const ICON_CSS = 'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.42.0/dist/tabler-icons.min.css';
let ICON_NAMES = null;
async function loadIconNames() {
  if (ICON_NAMES) return ICON_NAMES;
  try { const c = localStorage.getItem('vmm.ap.iconNames'); if (c) return (ICON_NAMES = c.split(',')); } catch (e) {}
  try {
    const css = await (await fetch(ICON_CSS)).text(), names = [...new Set([...css.matchAll(/\.ti-([a-z0-9-]+)::?before/g)].map(m => m[1]))].filter(n => !/-filled$/.test(n)).sort();
    if (names.length > 200) { ICON_NAMES = names; try { localStorage.setItem('vmm.ap.iconNames', names.join(',')); } catch (e) {} return names; }
  } catch (e) {}
  return (ICON_NAMES = IC_SET);                               // offline: the short list still works
}
const icSave = () => apSet('icons', AP.icons);
const TILES = [['none', 'ap_t_none'], ['round', 'ap_t_round'], ['squircle', 'ap_t_squircle'], ['square', 'ap_t_square']], FILLS = [['soft', 'ap_fill_soft'], ['solid', 'ap_fill_solid'], ['ring', 'ap_fill_ring']];
function iconSpec(id) {
  const c = AP.icons[id] || {}, src = c.src || 'system', base = TAB_DEFS[id][0];
  if (src === 'upload' && c.img) return { cls:'ti-img', style:`background-image:url('${c.img}')`, tile:'' };
  const n = (src !== 'upload' && c.n) || base;
  if (src !== 'design') return { cls:`ti ti-${n}`, style:'', tile:'' };
  const col = c.c || '#4f6bd8', tile = c.tile || 'none', fill = c.fill || 'soft';
  return { cls:`ti ti-${n}`, style:`color:${tile !== 'none' && fill === 'solid' ? '#fff' : col};--ic:${col}`, tile:tile === 'none' ? '' : `tl-${tile} tf-${fill}` };
}
const iconHtml = (id, extra) => { const s = iconSpec(id); return `<i class="${s.cls} ${s.tile} ${extra || ''}" style="${s.style}"></i>`; };
function applyTabIcons() {
  $$('.nav[data-tab]').forEach(b => { const id = b.dataset.tab, i = b.querySelector(':scope > i'); if (!i || !TAB_DEFS[id]) return; const s = iconSpec(id); i.className = `${s.cls} ${s.tile}`; i.style.cssText = s.style; });
}
const icGridHtml = id => {
  const cur = (AP.icons[id] || {}).n || TAB_DEFS[id][0], q = AP.icQ.trim().toLowerCase(), pool = ICON_NAMES || IC_SET;
  const list = q ? pool.filter(n => n.includes(q)).slice(0, 180) : (ICON_NAMES ? IC_SET : IC_SET);
  return list.length ? list.map(n => `<button type="button" data-icn="${n}" title="${n}" aria-label="${n}" aria-pressed="${cur === n}"><i class="ti ti-${n}"></i></button>`).join('') : `<span class="hint">${esc(t('ap_ic_none'))}</span>`;
};
function renderIconSettings() {
  loadIconNames().then(() => { const g = $('icGrid'); if (g && AP.icOpen) g.innerHTML = icGridHtml(AP.icOpen); });
  $('icList').innerHTML = Object.keys(TAB_DEFS).map(id => { const c = AP.icons[id] || {}, open = AP.icOpen === id, src = c.src || 'system';
    const picker = `<input type="search" id="icQ" value="${esc(AP.icQ)}" placeholder="${esc(t('ap_ic_search', { n:ICON_NAMES ? ICON_NAMES.length : '…' }))}" autocomplete="off"><div class="ic-grid" id="icGrid">${icGridHtml(id)}</div>`;
    const swatch = ACCENTS.map(a => `<button type="button" class="swatch sm" data-icc="${a}" style="--c:${a}" aria-pressed="${(c.c || '').toLowerCase() === a}" aria-label="${a}"><i class="ti ti-check"></i></button>`).join('');
    const design = `${picker}<div class="ic-opt"><label>${esc(t('ap_color'))}</label><div class="swatches">${swatch}<input type="color" id="icColor" value="${c.c || '#4f6bd8'}" aria-label="${esc(t('ap_design'))}"></div></div><div class="ic-opt"><label>${esc(t('ap_tile'))}</label><div class="seg" id="icTile">${TILES.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${(c.tile || 'none') === v}">${esc(t(l))}</button>`).join('')}</div></div>${(c.tile || 'none') !== 'none' ? `<div class="ic-opt"><label>${esc(t('ap_fill'))}</label><div class="seg" id="icFill">${FILLS.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${(c.fill || 'soft') === v}">${esc(t(l))}</button>`).join('')}</div></div>` : ''}`;
    const ed = !open ? '' : `<div class="ic-ed">${srcTabs('ic', src)}${src === 'system' ? picker : src === 'upload' ? `<div class="up-row"><button type="button" class="btn" id="icPick"><i class="ti ti-photo-up"></i>${esc(t('ap_pick_icon'))}</button>${c.img ? `<span class="ic-now" style="background-image:url('${c.img}')"></span>` : ''}</div><p class="hint">${esc(t('ap_icon_up'))}</p>` : design}<div><button type="button" class="btn sm" data-icreset="${id}"><i class="ti ti-restore"></i>${esc(t('ap_reset'))}</button></div></div>`;
    return `<div class="ic-item ${open ? 'open' : ''}" data-id="${id}"><button type="button" class="ic-row" data-icopen="${id}" aria-expanded="${open}">${iconHtml(id, 'ic-prev')}<span class="tx">${esc(t(TAB_DEFS[id][1]))}</span><small>${esc(t('ap_' + src))}</small><i class="ti ti-chevron-${open ? 'up' : 'down'}"></i></button>${ed}</div>`; }).join('');
}
$('icList').addEventListener('click', e => {
  const o = e.target.closest('[data-icopen]'); if (o) { AP.icOpen = AP.icOpen === o.dataset.icopen ? '' : o.dataset.icopen; AP.icQ = ''; return renderIconSettings(); }
  const id = AP.icOpen; if (!id) return; const c = AP.icons[id] = AP.icons[id] || {};
  const s = e.target.closest('.src-tabs [data-src]'); if (s) { c.src = s.dataset.src; if (c.src === 'design' && !c.c) c.c = '#4f6bd8'; }
  const n = e.target.closest('[data-icn]'); if (n) { c.n = n.dataset.icn; if (!c.src) c.src = 'system'; }
  const tl = e.target.closest('#icTile [data-v]'); if (tl) c.tile = tl.dataset.v; const fl = e.target.closest('#icFill [data-v]'); if (fl) c.fill = fl.dataset.v;
  const sw = e.target.closest('[data-icc]'); if (sw) { c.c = sw.dataset.icc; c.src = 'design'; }
  if (e.target.closest('#icPick')) return $('icFile').click();
  const r = e.target.closest('[data-icreset]'); if (r) delete AP.icons[id];
  if (s || n || tl || fl || sw || r) { icSave(); applyTabBar(); renderIconSettings(); }
});
$('icList').addEventListener('input', e => {
  if (e.target.id === 'icQ') { AP.icQ = e.target.value; const g = $('icGrid'); if (g) g.innerHTML = icGridHtml(AP.icOpen); return; }
  if (e.target.id !== 'icColor' || !AP.icOpen) return; const c = AP.icons[AP.icOpen] = AP.icons[AP.icOpen] || {}; c.c = e.target.value; c.src = 'design'; icSave(); applyTabIcons();
});
$('icFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f || !AP.icOpen) return; try { const c = AP.icons[AP.icOpen] = AP.icons[AP.icOpen] || {}; c.img = (await readImage(f, 96, 'image/png')).url; c.src = 'upload'; icSave(); applyTabBar(); renderIconSettings(); toast(t('t_saved')); } catch (x) { toast(t('ap_bad_img'), true); } };
$('icReset').onclick = () => { AP.icons = {}; AP.icOpen = ''; icSave(); applyTabBar(); renderIconSettings(); };

/* ---------- boot: apply what is stored; images and the font live in IndexedDB ---------- */
applyAccent(); applySkin(); if (AP.fnSrc === 'design') measureFonts().then(applyFont);
(async function () {
  try { const s = await DB.get('kv', 'skin'); if (s && s.v) { AP.skUp = s.v; applySkin(); } } catch (e) {}
  try { const f = await DB.get('kv', 'font'); if (f && f.v && f.v.data) { await installFont(f.v.name, f.v.data); applyFont(); } } catch (e) {}
})();
