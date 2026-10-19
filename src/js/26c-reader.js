/* =====================================================================
   Book reader (v18)
   Kept small: read, find, mark, and a look you can make your own. Habits from Moon+ Reader where they earn their place — day/night/paper
   backgrounds, side margins, tap zones, bookmarks, highlights with notes, search, "time left in chapter". Formats: EPUB, TXT (chapters found for
   Chinese and English headings), FB2, CBZ and PDF. MOBI/AZW3 are catalogued but not opened here — said plainly, with Calibre as the way out.
   Left out on purpose (and kept in docs/v18/archive-full-player-reader/): auto-scroll, read aloud, blue-light filter, brightness gestures,
   regular-expression search, remappable keys.
   A book's text is shown inside a script-less sandboxed frame with a content policy that allows no network: what is in a book
   cannot run code or phone home.
   ===================================================================== */
const RD_THEMES = {
  day:   { bg:'#fbfaf6', fg:'#1d1d1b', link:'#1f5fbf', sel:'rgba(79,107,216,.30)', ui:'light' },
  paper: { bg:'#f3ead7', fg:'#4a3b2a', link:'#8a4b12', sel:'rgba(180,120,40,.32)', ui:'light' },
  green: { bg:'#cfe6d2', fg:'#1f2d22', link:'#1c5a34', sel:'rgba(40,120,70,.30)', ui:'light' },
  night: { bg:'#16181c', fg:'#c8c9c4', link:'#8fb4ff', sel:'rgba(120,150,255,.38)', ui:'dark' },
  black: { bg:'#000000', fg:'#a9aaa5', link:'#7fa6f0', sel:'rgba(120,150,255,.38)', ui:'dark' }
};
const RD_FONTS = {
  serif:'Georgia,"Noto Serif SC","Songti SC","Source Han Serif SC",serif', sans:'system-ui,-apple-system,"Segoe UI","PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif',
  kai:'"Kaiti SC","KaiTi","STKaiti","BiauKai",serif'
};
const RD_HL = [['#ffe066', 'yellow'], ['#9be29b', 'green'], ['#8ec5ff', 'blue'], ['#ffb0b0', 'pink']];
const RD_DEF = { theme:'day', bg:'#f6f1e3', fg:'', size:19, lh:1.75, mx:9, family:'serif', flow:'auto' };
/* id, icon, keys, group */
const RD_ACT = [
  ['next', 'chevron-right', ['ArrowRight', 'PageDown', 'Space'], 'g_turn'], ['prev', 'chevron-left', ['ArrowLeft', 'PageUp', 'Shift+Space'], 'g_turn'], ['nextch', 'chevrons-right', [']', 'Ctrl+ArrowRight'], 'g_turn'], ['prevch', 'chevrons-left', ['[', 'Ctrl+ArrowLeft'], 'g_turn'],
  ['toc', 'list', ['t'], 'g_find'], ['search', 'search', ['/', 'Ctrl+f'], 'g_find'], ['mark', 'bookmark', ['d'], 'g_find'], ['marks', 'notebook', ['m'], 'g_find'],
  ['look', 'typography', ['o'], 'g_look'], ['bigger', 'text-increase', ['+', '='], 'g_look'], ['smaller', 'text-decrease', ['-'], 'g_look'], ['night', 'moon', ['n'], 'g_look'],
  ['full', 'maximize', ['f'], 'g_read'], ['keys', 'keyboard', ['?', 'F1'], 'g_read']
];
/* what an older version saved: 'auto' theme, 'page' flow, reading aids that are gone */
function rdLoadSettings() {
  const s = { ...RD_DEF, theme:matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day', ...jsonStore('vmm.rd', {}) };
  if (!RD_THEMES[s.theme] && s.theme !== 'custom') s.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
  if (!['auto', 'one', 'two', 'scroll'].includes(s.flow)) s.flow = 'auto';
  if (!RD_FONTS[s.family]) s.family = 'serif';
  return { theme:s.theme, bg:s.bg, fg:s.fg, size:s.size, lh:s.lh, mx:s.mx, family:s.family, flow:s.flow };
}
const RD = { rec:null, file:null, kind:'', s:rdLoadSettings(), chapters:[], toc:[], ci:0, frac:0, text:[], zip:null, blobs:new Map(), lang:'', title:'', panel:'', secs:0, lastSave:0, ready:false, cbz:null, pdf:null, page:1, pages:0,
  speedCpm:Number(store.get('vmm.rdcpm', '0')) || 0, hideTm:0, find:'', loading:0, findTok:0, hits:[], lastTurn:0, openTok:0, sel:null };
const rdd = () => $('rd'), rdf = () => $('rdFrame');
const rdSave = () => store.set('vmm.rd', JSON.stringify(RD.s));
/* contrast of two #rrggbb colours (WCAG relative luminance), for picking a readable text colour on any background */
const rdLum = hex => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return 1; const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255].map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }).reduce((a, c, i) => a + c * [.2126, .7152, .0722][i], 0); };
const rdContrast = (a, b) => { const x = rdLum(a), y = rdLum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const rdBest = (bg, cands) => cands.reduce((best, c) => rdContrast(bg, c) > rdContrast(bg, best) ? c : best, cands[0]);
/* a colour part-way from a to b (#rrggbb, 0..1), as plain hex: no color-mix(), which older Safari does not know */
const rdMix = (a, b, k) => { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), ch = sh => Math.round((x >> sh & 255) * (1 - k) + (y >> sh & 255) * k); return '#' + [16, 8, 0].map(sh => ch(sh).toString(16).padStart(2, '0')).join(''); };
function rdTheme() {
  const S = RD.s; if (S.theme !== 'custom') return RD_THEMES[S.theme] || RD_THEMES.day;
  const bg = /^#[0-9a-f]{6}$/i.test(S.bg) ? S.bg : RD_DEF.bg, fg = /^#[0-9a-f]{6}$/i.test(S.fg) ? S.fg : rdBest(bg, ['#1d1d1b', '#e6e6e1']), dark = rdLum(bg) < .18;
  return { bg, fg, link:rdBest(bg, ['#1f5fbf', '#8fb4ff', '#8a4b12', '#ffd479']), sel:dark ? 'rgba(120,150,255,.38)' : 'rgba(79,107,216,.30)', ui:dark ? 'dark' : 'light' };
}
const rdKeyMap = () => { const m = new Map(); RD_ACT.forEach(([id, , keys]) => keys.forEach(k => m.set(k, id))); return m; };
const rdKeysOf = id => (RD_ACT.find(a => a[0] === id) || [, , []])[2];
const rdTip = id => { const k = rdKeysOf(id)[0]; return `${t('rc_' + id)}${k ? '  ·  ' + keyShow(k) : ''}`; };
const rdKindOf = f => { const e = (f.name.split('.').pop() || '').toLowerCase(); return ['epub', 'txt', 'fb2', 'cbz', 'pdf', 'mobi', 'azw', 'azw3'].includes(e) ? e : /^text\//.test(f.type) ? 'txt' : e; };
const rdText = h => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent; };
const rdPaged = () => RD.s.flow !== 'scroll';
/* two pages side by side: when asked for, or when "auto" and the window is wide enough for two comfortable pages */
const rdSpread = () => { const W = rdf().clientWidth; return rdPaged() && W >= 640 && (RD.s.flow === 'two' || (RD.s.flow === 'auto' && W >= 1000)); };

/* ---------- the dialog ---------- */
function rdBuild() {
  if ($('rd')) return;
  const d = document.createElement('dialog'); d.id = 'rd'; d.className = 'rdr idle'; d.setAttribute('aria-label', t('rd_aria'));
  const b = (id, extra) => `<button type="button" class="pl-b" data-ract="${id}" id="rdb_${id}" data-tip="${esc(rdTip(id))}" aria-label="${esc(t('rc_' + id))}"${extra || ''}><i class="ti ti-${RD_ACT.find(a => a[0] === id)[1]}"></i></button>`;
  d.innerHTML = `<div class="rd-top" id="rdTop"><button type="button" class="pl-b" id="rdClose" aria-label="${esc(t('rd_close'))}" data-tip="${esc(t('rd_close') + '  ·  Esc')}"><i class="ti ti-chevron-down"></i></button>
      <div class="pl-head"><b id="rdTitle"></b><span id="rdChap"></span></div>${b('search')}${b('toc')}${b('marks')}${b('mark', ' aria-pressed="false"')}${b('look')}</div>
    <div class="rd-view" id="rdView"><iframe id="rdFrame" sandbox="allow-same-origin" title="${esc(t('rd_frame'))}"></iframe>
      <div class="rd-pic" id="rdPic" hidden><canvas id="rdCanvas"></canvas><div class="textLayer" id="rdTextLayer"></div><img id="rdImg" alt=""></div>
      <button type="button" class="rd-edge l" data-ract="prev" aria-label="${esc(t('rd_prev_pg'))}"><i class="ti ti-chevron-left"></i></button><button type="button" class="rd-edge r" data-ract="next" aria-label="${esc(t('rd_next_pg'))}"><i class="ti ti-chevron-right"></i></button>
      <div class="rd-sel" id="rdSel" hidden role="toolbar" aria-label="${esc(t('rd_sel'))}"></div>
      <div class="pl-osd" id="rdOsd" aria-hidden="true"></div><div class="pl-err" id="rdErr" role="alert" hidden></div></div>
    <div class="rd-bar" id="rdBar"><div class="rd-row"><span class="pl-t" id="rdPct">0%</span><input type="range" id="rdSeek" min="0" max="1000" value="0" aria-label="${esc(t('rd_seek'))}"><span class="pl-t" id="rdLeft"></span></div></div>
    <aside class="rd-panel" id="rdPanel" hidden></aside><div class="sr-only" id="rdLive" role="status" aria-live="polite"></div>`;
  document.body.appendChild(d); rdWire(d);
}

/* ---------- open ---------- */
async function readerOpen(rec, file, o = {}) {
  rdBuild(); const d = rdd(), kind = rdKindOf(file), tok = ++RD.openTok;
  rdReset(); Object.assign(RD, { rec, file, kind, title:rec.titleCn || rec.titleEn || rec.fileName, snap:null, doneFired:false, nb:{ q:'', sort:'book', edit:'' } });
  $('rdTitle').textContent = RD.title; $('rdChap').textContent = ''; $('rdErr').hidden = true; $('rdPic').hidden = true; rdf().hidden = false;
  if (!d.open) d.showModal(); rdApplyLook(); rdShowUi(); AWAKE.on();
  $('rdView').tabIndex = -1; $('rdView').focus({ preventScroll:true });       // the page has the focus, so Space turns it, as in any reader
  try {
    if (kind === 'epub') await rdOpenEpub(); else if (kind === 'txt') await rdOpenTxt(); else if (kind === 'fb2') await rdOpenFb2(); else if (kind === 'cbz') await rdOpenCbz(); else if (kind === 'pdf') await rdOpenPdf();
    else return rdFail('rd_err_fmt', { ext:kind.toUpperCase() });
  } catch (e) { return tok === RD.openTok ? rdFail('rd_err_read', { name:rec.fileName }) : undefined; }
  if (tok !== RD.openTok) return;                                          // another book was opened while this one was still being read
  RD.ready = true; const pos = POS.get(rec);
  if (o.start != null) rdGoLoc(o.start); else if (pos && pos.p > 0 && pos.p < .985) { rdGoLoc(pos.v); rdOsd(t('rd_resumed', { n:Math.round(pos.p * 100) })); } else rdGoLoc(RD.kind === 'cbz' || RD.kind === 'pdf' ? '1' : '0:0');
  trackerStarted(rec); document.title = RD.title + ' · ' + t('brand');
}
function rdReset() {
  RD.blobs.forEach(u => URL.revokeObjectURL(u)); RD.blobs.clear();
  if (RD.cbz && RD.cbz.cur) URL.revokeObjectURL(RD.cbz.cur);
  Object.assign(RD, { chapters:[], toc:[], ci:0, frac:0, text:[], zip:null, ready:false, cbz:null, pdf:null, page:1, pages:0, secs:0, find:'', panel:'', hits:[], sel:null });
  rdPanelClose(); const f = rdf(); if (f) f.srcdoc = ''; const s = $('rdSel'); if (s) s.hidden = true;
}
function rdFail(key, p) {
  const e = $('rdErr'); e.hidden = false; rdf().hidden = true; RD.ready = false;
  e.innerHTML = `<i class="ti ti-alert-triangle"></i><b>${esc(t('rd_err_h'))}</b><p>${esc(t(key, p))}</p><div class="row-btns"><a class="btn primary" href="https://calibre-ebook.com/" target="_blank" rel="noopener noreferrer"><i class="ti ti-external-link"></i>${esc(t('rd_err_calibre'))}</a></div>`;
}

/* ---------- EPUB ---------- */
async function rdOpenEpub() {
  const f = RD.file, z = await zipDir(f), low = new Map([...z.keys()].map(k => [k.toLowerCase(), k])); RD.zip = z; RD.zlow = low;
  const get = async n => { const k = z.has(n) ? n : low.get(n.toLowerCase()); if (!k) throw new Error(n); return zipGet(f, z.get(k)); };
  RD.zget = get; const parse = async (n, type) => new DOMParser().parseFromString(decodeBytes(await get(n)), type || 'application/xml');
  const opfPath = (await parse('META-INF/container.xml')).querySelector('rootfile').getAttribute('full-path'), opf = await parse(opfPath), dir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
  RD.dir = dir; const man = new Map(), items = [...opf.getElementsByTagNameNS('*', 'item')];
  items.forEach(i => man.set(i.getAttribute('id'), { href:decodeURIComponent((i.getAttribute('href') || '').split('#')[0]), type:i.getAttribute('media-type') || '', props:i.getAttribute('properties') || '' }));
  const dc = tag => [...opf.getElementsByTagNameNS('*', tag)].map(e => e.textContent.trim()).filter(Boolean); RD.lang = dc('language')[0] || '';
  if (dc('title')[0]) RD.title = dc('title')[0]; $('rdTitle').textContent = RD.title;
  const refs = [...opf.getElementsByTagNameNS('*', 'itemref')];
  RD.chapters = refs.map(r => man.get(r.getAttribute('idref'))).filter(m => m && /x?html|xml/.test(m.type)).map((m, i) => {
    const path = joinPath(dir, m.href), k = z.has(path) ? path : low.get(path.toLowerCase()); return { path, title:'', size:(k && z.get(k).usize) || 4000, i };
  });
  if (!RD.chapters.length) throw new Error('empty');
  /* the table of contents: EPUB 3 nav, else EPUB 2 NCX */
  const idxOf = href => { const p = joinPath(dir, decodeURIComponent(href.split('#')[0])); return RD.chapters.findIndex(c => c.path === p || c.path.toLowerCase() === p.toLowerCase()); };
  try {
    const navI = items.find(i => /(^|\s)nav(\s|$)/.test(i.getAttribute('properties') || ''));
    if (navI) { const nd = new DOMParser().parseFromString(decodeBytes(await get(joinPath(dir, decodeURIComponent(navI.getAttribute('href'))))), 'text/html'), nav = nd.querySelector('nav[epub\\:type~="toc"]') || nd.querySelector('nav#toc') || nd.querySelector('nav') || nd;
      const navDir = joinPath(dir, decodeURIComponent(navI.getAttribute('href'))).replace(/[^/]*$/, '');
      const walk = (ol, depth) => [...ol.children].forEach(li => { const a = li.querySelector(':scope > a, :scope > span'); if (a) { const h = a.getAttribute && a.getAttribute('href'); if (h) { const p = joinPath(navDir, decodeURIComponent(h.split('#')[0])), ci = RD.chapters.findIndex(c => c.path === p || c.path.toLowerCase() === p.toLowerCase()); if (ci >= 0) RD.toc.push({ label:a.textContent.trim().replace(/\s+/g, ' '), ci, anchor:(h.split('#')[1] || ''), depth }); } }
        const sub = li.querySelector(':scope > ol'); if (sub) walk(sub, depth + 1); });
      const ol = nav.querySelector('ol'); if (ol) walk(ol, 0); }
    if (!RD.toc.length) { const sp = opf.getElementsByTagNameNS('*', 'spine')[0], ncx = sp && man.get(sp.getAttribute('toc'));
      if (ncx) { const nd = await parse(joinPath(dir, ncx.href)), ndir = joinPath(dir, ncx.href).replace(/[^/]*$/, '');
        const walk = (el, depth) => [...el.children].filter(c => c.localName === 'navPoint').forEach(np => { const lab = np.getElementsByTagNameNS('*', 'text')[0], con = np.getElementsByTagNameNS('*', 'content')[0];
          if (con) { const h = con.getAttribute('src') || '', p = joinPath(ndir, decodeURIComponent(h.split('#')[0])), ci = RD.chapters.findIndex(c => c.path === p || c.path.toLowerCase() === p.toLowerCase()); if (ci >= 0) RD.toc.push({ label:(lab ? lab.textContent : '').trim(), ci, anchor:h.split('#')[1] || '', depth }); }
          walk(np, depth + 1); });
        const nm = nd.getElementsByTagNameNS('*', 'navMap')[0]; if (nm) walk(nm, 0); } }
  } catch (e) { /* no usable contents: the chapters list stands in */ }
  RD.toc.forEach(x => { const c = RD.chapters[x.ci]; if (c && !c.title) c.title = x.label; });
  RD.chapters.forEach((c, i) => { if (!c.title) c.title = t('rd_ch_n', { n:i + 1 }); });
  if (!RD.toc.length) RD.toc = RD.chapters.map((c, i) => ({ label:c.title, ci:i, anchor:'', depth:0 }));
  RD.load = rdEpubChapter;
}
async function rdBlobFor(path) {
  if (RD.blobs.has(path)) return RD.blobs.get(path);
  const k = RD.zip.has(path) ? path : RD.zlow.get(path.toLowerCase()); if (!k) return '';
  const bytes = await zipGet(RD.file, RD.zip.get(k)), ext = (path.split('.').pop() || '').toLowerCase(), type = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', gif:'image/gif', webp:'image/webp', svg:'image/svg+xml', css:'text/css', ttf:'font/ttf', otf:'font/otf', woff:'font/woff', woff2:'font/woff2' }[ext] || 'application/octet-stream';
  const u = URL.createObjectURL(new Blob([bytes], { type })); RD.blobs.set(path, u); return u;
}
const rdClean = body => {
  body.querySelectorAll('script,iframe,object,embed,form,base,meta,link[rel="import"],audio,video,noscript').forEach(n => n.remove());
  body.querySelectorAll('*').forEach(n => [...n.attributes].forEach(a => { if (/^on/i.test(a.name) || (/^(href|src|xlink:href|action|formaction)$/i.test(a.name) && /^\s*(javascript|data:text\/html)/i.test(a.value))) n.removeAttribute(a.name); }));
};
async function rdEpubChapter(ci) {
  const ch = RD.chapters[ci], txt = decodeBytes(await RD.zget(ch.path)), doc = new DOMParser().parseFromString(txt, 'text/html'), body = doc.body || doc.documentElement, cdir = ch.path.replace(/[^/]*$/, '');
  rdClean(body);
  for (const img of body.querySelectorAll('img[src], image')) {
    const attr = img.hasAttribute('src') ? 'src' : img.hasAttribute('xlink:href') ? 'xlink:href' : 'href', src = img.getAttribute(attr) || '';
    if (/^(data:image|blob:)/i.test(src)) continue;
    if (/^[a-z]+:/i.test(src)) { img.remove(); continue; }                // no remote pictures: nothing leaves the device
    const u = await rdBlobFor(joinPath(cdir, decodeURIComponent(src.split('#')[0]))); if (u) img.setAttribute(attr, u); else img.remove();
  }
  return body.innerHTML;
}

/* ---------- TXT ---------- */
const TXT_CH = /^[ \t　]*(第[0-9零一二三四五六七八九十百千万两〇]+[章回节節卷部篇集][^\n]{0,40}|[序楔][章子]?[^\n]{0,16}|(?:Chapter|CHAPTER|Prologue|Epilogue|PART|Part)\b[^\n]{0,50})[ \t　]*$/gm;
async function rdOpenTxt() {
  const text = (await readTextFile(RD.file)).replace(/\r\n?/g, '\n'), marks = [...text.matchAll(TXT_CH)].map(m => ({ at:m.index, title:m[1].trim().slice(0, 60) })), out = [];
  RD.lang = /[㐀-鿿]/.test(text.slice(0, 2000)) ? 'zh' : '';
  if (marks.length >= 2) { if (marks[0].at > 200) out.push({ title:RD.title, a:0, b:marks[0].at }); marks.forEach((m, i) => out.push({ title:m.title, a:m.at, b:i + 1 < marks.length ? marks[i + 1].at : text.length })); }
  else { const step = 14000; for (let a = 0, n = 1; a < text.length; n++) { let b = Math.min(text.length, a + step); if (b < text.length) { const nl = text.indexOf('\n', b); b = nl < 0 ? text.length : nl + 1; } out.push({ title:t('rd_part_n', { n }), a, b }); a = b; } }
  RD.chapters = out.filter(c => c.b > c.a).map((c, i) => ({ title:c.title, size:c.b - c.a, i, raw:text.slice(c.a, c.b) }));
  if (!RD.chapters.length) throw new Error('empty');
  RD.toc = RD.chapters.map((c, i) => ({ label:c.title, ci:i, anchor:'', depth:0 }));
  RD.load = async ci => { const c = RD.chapters[ci], lines = c.raw.split('\n').map(l => l.trim()).filter(Boolean);
    return lines.map((l, i) => i === 0 && l === c.title ? `<h2>${esc(l)}</h2>` : `<p>${esc(l)}</p>`).join(''); };
}

/* ---------- FB2 ---------- */
async function rdOpenFb2() {
  const xml = new DOMParser().parseFromString(await readTextFile(RD.file), 'application/xml'); if (xml.querySelector('parsererror')) throw new Error('fb2');
  const bins = {}; xml.querySelectorAll('binary').forEach(b => { bins[b.getAttribute('id')] = `data:${b.getAttribute('content-type') || 'image/jpeg'};base64,${b.textContent.replace(/\s+/g, '')}`; });
  const bt = xml.querySelector('description title-info book-title'); if (bt && bt.textContent.trim()) { RD.title = bt.textContent.trim(); $('rdTitle').textContent = RD.title; }
  const lg = xml.querySelector('description title-info lang'); RD.lang = lg ? lg.textContent.trim() : '';
  const conv = n => { if (n.nodeType === 3) return esc(n.nodeValue); if (n.nodeType !== 1) return ''; const inner = () => [...n.childNodes].map(conv).join(''), nm = n.localName;
    switch (nm) { case 'p': return `<p>${inner()}</p>`; case 'title': return `<h3>${[...n.children].map(c => c.textContent).join(' ') || n.textContent}</h3>`; case 'subtitle': return `<h4>${inner()}</h4>`; case 'emphasis': return `<em>${inner()}</em>`; case 'strong': return `<strong>${inner()}</strong>`;
      case 'empty-line': return '<br>'; case 'image': { const h = n.getAttribute('l:href') || n.getAttribute('xlink:href') || n.getAttribute('href') || ''; const u = bins[h.replace(/^#/, '')]; return u ? `<img src="${u}" alt="">` : ''; }
      case 'epigraph': case 'cite': return `<blockquote>${inner()}</blockquote>`; case 'poem': case 'stanza': return `<div>${inner()}</div>`; case 'v': return `<p class="v">${inner()}</p>`; case 'text-author': return `<p class="au">${inner()}</p>`; case 'a': return inner(); default: return inner(); } };
  const bodies = [...xml.querySelectorAll('FictionBook > body, body')].filter(b => b.getAttribute('name') !== 'notes'), secs = [];
  bodies.forEach(b => { const top = [...b.children].filter(c => c.localName === 'section'); if (top.length) top.forEach(s => secs.push(s)); else secs.push(b); });
  RD.chapters = secs.map((s, i) => { const ti = s.querySelector(':scope > title'); return { title:(ti ? ti.textContent.trim().replace(/\s+/g, ' ') : '') || t('rd_ch_n', { n:i + 1 }), size:(s.textContent || '').length, i, node:s }; }).filter(c => c.size > 0);
  if (!RD.chapters.length) throw new Error('empty'); RD.toc = RD.chapters.map((c, i) => ({ label:c.title, ci:i, anchor:'', depth:0 }));
  RD.load = async ci => [...RD.chapters[ci].node.childNodes].map(conv).join('');
}

/* ---------- CBZ: pictures, one page at a time ---------- */
async function rdOpenCbz() {
  const z = await zipDir(RD.file), pages = [...z.keys()].filter(n => /\.(jpe?g|png|webp|gif|avif)$/i.test(n)).sort((a, b) => a.localeCompare(b, undefined, { numeric:true }));
  if (!pages.length) throw new Error('empty'); RD.cbz = { z, pages, cur:'' }; RD.pages = pages.length;
  RD.toc = [{ label:t('rd_page_n', { n:1 }), ci:0, anchor:'', depth:0 }]; rdf().hidden = true; $('rdPic').hidden = false; $('rdCanvas').hidden = true; $('rdTextLayer').hidden = true; $('rdImg').hidden = false;
}
async function rdCbzShow(n) {
  n = Math.max(1, Math.min(RD.pages, n)); RD.page = n; const c = RD.cbz, name = c.pages[n - 1], bytes = await zipGet(RD.file, c.z.get(name)), ext = name.split('.').pop().toLowerCase();
  const u = URL.createObjectURL(new Blob([bytes], { type:{ jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp', gif:'image/gif', avif:'image/avif' }[ext] || 'image/jpeg' })); if (c.cur) URL.revokeObjectURL(c.cur); c.cur = u;
  const img = $('rdImg'); img.src = u; img.alt = t('rd_page_of', { n, total:RD.pages }); $('rdView').scrollTop = 0; rdProgress();
}

/* ---------- PDF: pdf.js is fetched once from a CDN, pinned; the file itself never leaves the tab ---------- */
const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/';
function pdfLib() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return RD.pdfLoad || (RD.pdfLoad = new Promise(async (res, rej) => {
    try {
      const wtxt = await (await fetch(PDFJS + 'pdf.worker.min.js')).text(), s = document.createElement('script'); s.src = PDFJS + 'pdf.min.js';
      s.onload = () => { try { pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([wtxt], { type:'text/javascript' })); res(pdfjsLib); } catch (e) { rej(e); } }; s.onerror = () => rej(new Error('pdfjs')); document.head.appendChild(s);
    } catch (e) { rej(e); }
  }).catch(e => { RD.pdfLoad = null; throw e; }));
}
async function rdOpenPdf() {
  const lib = await pdfLib(), pdf = await lib.getDocument({ data:new Uint8Array(await RD.file.arrayBuffer()) }).promise; RD.pdf = { doc:pdf, zoom:0, task:null }; RD.pages = pdf.numPages;
  try { const info = await pdf.getMetadata(); if (info.info && info.info.Title && info.info.Title.trim()) { RD.title = info.info.Title.trim(); $('rdTitle').textContent = RD.title; } } catch (e) {}
  try { const ol = await pdf.getOutline(); const walk = async (arr, depth) => { for (const o of arr || []) { let pg = 1; try { const dest = typeof o.dest === 'string' ? await pdf.getDestination(o.dest) : o.dest; if (dest) pg = (await pdf.getPageIndex(dest[0])) + 1; } catch (e) {} RD.toc.push({ label:o.title, ci:0, page:pg, depth }); await walk(o.items, depth + 1); } }; await walk(ol, 0); } catch (e) {}
  if (!RD.toc.length) RD.toc = [{ label:t('rd_page_n', { n:1 }), ci:0, page:1, depth:0 }];
  rdf().hidden = true; $('rdPic').hidden = false; $('rdCanvas').hidden = false; $('rdTextLayer').hidden = false; $('rdImg').hidden = true;
}
async function rdPdfShow(n) {
  n = Math.max(1, Math.min(RD.pages, n)); RD.page = n; const P = RD.pdf, tok = ++RD.loading; if (P.task) { try { P.task.cancel(); } catch (e) {} }
  const page = await P.doc.getPage(n); if (tok !== RD.loading) return;
  const view = $('rdView'), w = view.clientWidth - 8, base = page.getViewport({ scale:1 }), scale = P.zoom || (w / base.width), vp = page.getViewport({ scale }), dpr = Math.min(2.5, window.devicePixelRatio || 1);
  const c = $('rdCanvas'), g = c.getContext('2d'); c.width = Math.floor(vp.width * dpr); c.height = Math.floor(vp.height * dpr); c.style.width = vp.width + 'px'; c.style.height = vp.height + 'px';
  const tl = $('rdTextLayer'); tl.innerHTML = ''; tl.style.width = vp.width + 'px'; tl.style.height = vp.height + 'px'; tl.style.setProperty('--scale-factor', scale);
  P.task = page.render({ canvasContext:g, viewport:vp, transform:dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null });
  try { await P.task.promise; } catch (e) { return; }
  if (tok !== RD.loading) return;
  try { const tc = await page.getTextContent(); pdfjsLib.renderTextLayer({ textContent:tc, textContentSource:tc, container:tl, viewport:vp, textDivs:[] }); } catch (e) {}
  c.setAttribute('aria-label', t('rd_page_of', { n, total:RD.pages })); view.scrollTop = 0; rdProgress();
}

/* ---------- text: one chapter in the frame ---------- */
function rdCss() {
  const S = RD.s, T = rdTheme(), paged = rdPaged(), two = rdSpread(), fam = RD_FONTS[S.family] || RD_FONTS.serif, W = rdf().clientWidth, H = rdf().clientHeight;
  /* A page keeps a margin of M on both sides, so the gap between two columns is 2M and one "turn" is exactly the frame's width. A very wide
     single page would make lines too long to read, so its margins grow until the text is at most ~780 px wide. */
  const base = Math.round((two ? W / 2 : W) * S.mx / 100), M = two ? Math.max(base, Math.round((W / 2 - 700) / 2)) : Math.max(base, Math.round((W - 780) / 2)), pad = Math.round(S.size * 1.2);
  const cols = two ? `column-count:2;column-gap:${2 * M}px;` : `column-width:${Math.max(120, W - 2 * M)}px;column-gap:${2 * M}px;`;
  return `html{color-scheme:${T.ui};background:${T.bg};-webkit-tap-highlight-color:transparent;}html,body{margin:0;padding:0;}
body{background:${T.bg};color:${T.fg};font-family:${fam};font-size:${S.size}px;line-height:${S.lh};hyphens:auto;-webkit-hyphens:auto;overflow-wrap:break-word;box-sizing:border-box;-webkit-text-size-adjust:none;cursor:pointer;}
${paged ? `html{overflow:hidden;height:100%;}body{height:${H}px;padding:${pad}px ${M}px;${cols}column-fill:auto;}` : `body{padding:${pad}px ${M}px 38vh;}`}
p{margin:0 0 .7em;text-indent:2em;orphans:2;widows:2;} p.v,p.au{text-indent:0;} h1,h2,h3,h4{line-height:1.35;margin:1.1em 0 .6em;text-indent:0;break-after:avoid;} h1{font-size:1.5em;} h2{font-size:1.32em;} h3{font-size:1.15em;}
img,svg,image{max-width:100%;max-height:${paged ? Math.max(100, H - 2 * pad - 8) : 900}px;height:auto;display:block;margin:.8em auto;break-inside:avoid;object-fit:contain;} blockquote{margin:1em 1.6em;opacity:.92;} a{color:${T.link};}
::selection{background:${T.sel};} mark.hl{background:var(--c,#ffe066);color:#1d1d1b;border-radius:2px;cursor:pointer;} mark.hl[data-n]{text-decoration:underline dotted;} mark.find{background:#ffd54a;color:#000;outline:2px solid #ff8a00;}`;
}
async function rdLoadChapter(ci, anchor) {
  ci = Math.max(0, Math.min(RD.chapters.length - 1, ci)); const tok = ++RD.loading; let html = '';
  try { html = await RD.load(ci); } catch (e) { html = `<p>${esc(t('rd_err_ch'))}</p>`; }
  if (tok !== RD.loading) return false;
  RD.ci = ci; RD.text[ci] = rdText(html); RD.chapters[ci].chars = RD.text[ci].length;
  const f = rdf(); f.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src blob: data:; style-src 'unsafe-inline' blob:; font-src blob: data:"><style>${rdCss()}</style></head><body data-t="${tok}">${html}</body></html>`;
  /* Wait for *this* document, not for whichever load event comes first: Safari fires one for the blank page the frame starts with. */
  await new Promise(res => { let n = 0; const ready = () => { try { const dd = f.contentDocument; if (dd && dd.body && dd.body.dataset.t === String(tok) && dd.readyState !== 'loading') return res(); } catch (e) { /* not there yet */ } if (++n > 120) return res(); setTimeout(ready, 25); }; f.onload = ready; ready(); });
  if (tok !== RD.loading) return false;
  const doc = f.contentDocument; rdFrameWire(doc); rdHighlights(doc);
  RD.anchorEl = null; if (anchor) { const el = doc.getElementById(anchor) || doc.querySelector(`[name="${CSS.escape(anchor)}"]`); if (el) RD.anchorEl = el; }
  $('rdChap').textContent = RD.chapters[ci].title || ''; return true;
}
const rdPageW = () => rdf().clientWidth;
function rdPages() { const d = rdf().contentDocument; if (!d || !d.documentElement) return 1; return rdPaged() ? Math.max(1, Math.ceil((d.documentElement.scrollWidth - 4) / rdPageW())) : 1; }
function rdCurPage() { const d = rdf().contentDocument; return d && d.documentElement ? Math.round((d.documentElement.scrollLeft || d.scrollingElement.scrollLeft) / rdPageW()) : 0; }
function rdFracNow() {
  const d = rdf().contentDocument; if (!d || !d.documentElement) return 0;
  if (rdPaged()) {                                               // the start of a page, except the last: being on the last page is being at the end
    const n = rdPages(), p = rdCurPage(); if (n <= 1) return RD.ci === RD.chapters.length - 1 ? 1 : 0;
    return (p + (p >= n - 1 ? 1 : 0)) / n;
  }
  const se = d.scrollingElement, max = se.scrollHeight - se.clientHeight; return max > 0 ? se.scrollTop / max : 0;
}
function rdSetFrac(f) {
  const d = rdf().contentDocument; if (!d || !d.documentElement) return; f = Math.max(0, Math.min(1, f));
  if (rdPaged()) { const n = rdPages(); d.scrollingElement.scrollLeft = Math.min(n - 1, Math.floor(f * n + 1e-6)) * rdPageW(); }
  else { const se = d.scrollingElement; se.scrollTop = f * (se.scrollHeight - se.clientHeight); }
}
/* a place is "chapter:fraction" for text, a page number for pictures and PDF */
const rdLocNow = () => RD.kind === 'cbz' || RD.kind === 'pdf' ? String(RD.page) : RD.ci + ':' + rdFracNow().toFixed(4);
async function rdGoLoc(loc) {
  if (RD.kind === 'cbz' || RD.kind === 'pdf') { const n = Number(loc) || 1; return RD.kind === 'cbz' ? rdCbzShow(n) : rdPdfShow(n); }
  const [c, f] = String(loc).split(':'); if (!(await rdLoadChapter(Number(c) || 0))) return; RD.pendingFrac = Number(f) || 0; rdSettle();
}
/* The last page is rarely full, and a document cannot be scrolled past its own end: its final turn would stop part-way (up to a whole
   page short with two pages side by side). A 1 px marker at the far end makes the scrollable width an exact number of turns. */
function rdPad(doc) {
  if (!doc || !doc.body) return; const old = doc.getElementById('rdpad'); if (old) old.remove(); if (!rdPaged()) return;
  const W = rdPageW(), n = Math.max(1, Math.ceil((doc.documentElement.scrollWidth - 4) / W)), p = doc.createElement('i'); p.id = 'rdpad';
  p.style.cssText = `position:absolute;top:0;left:${n * W - 1}px;width:1px;height:1px;visibility:hidden;`; doc.body.appendChild(p);
}
function rdSettle() {
  const frac = RD.pendingFrac, tok = RD.loading, doc = rdf().contentDocument; rdPad(doc);
  if (RD.anchorEl) { const el = RD.anchorEl; RD.anchorEl = null; rdScrollToEl(el); } else if (frac != null) rdSetFrac(frac);
  RD.pendingFrac = null; rdProgress();
  /* pictures arrive after the first layout and push the text about: put the place back once more when they have loaded */
  const late = doc ? [...doc.images].filter(i => !i.complete) : [];
  if (late.length && frac != null) { const at = rdLocNow(); Promise.race([Promise.all(late.map(i => i.decode().catch(() => {}))), new Promise(r => setTimeout(r, 900))]).then(() => { if (tok === RD.loading && rdLocNow() === at) { rdPad(doc); rdSetFrac(frac); rdProgress(); } }); }
}
function rdScrollToEl(el) {
  const d = rdf().contentDocument; if (rdPaged()) { const r = el.getBoundingClientRect(), x = r.left + d.scrollingElement.scrollLeft; d.scrollingElement.scrollLeft = Math.floor(x / rdPageW()) * rdPageW(); }
  else el.scrollIntoView({ block:'start' });
}
/* turning pages: inside a chapter first, then on to the next. Turning a page never brings the bars back: you are reading. */
async function rdTurn(dir) {
  if (RD.kind === 'cbz' || RD.kind === 'pdf') { const n = RD.page + dir; if (n < 1 || n > RD.pages) return rdOsd(t(n < 1 ? 'rd_first' : 'rd_last')); return RD.kind === 'cbz' ? rdCbzShow(n) : rdPdfShow(n); }
  const d = rdf().contentDocument; if (!d) return;
  if (rdPaged()) { const n = rdPages(), p = rdCurPage(), q = p + dir; if (q >= 0 && q < n) { d.scrollingElement.scrollLeft = q * rdPageW(); return rdProgress(true); } }
  else { const se = d.scrollingElement, step = se.clientHeight * .9, max = se.scrollHeight - se.clientHeight, top = se.scrollTop + dir * step; if (dir > 0 ? se.scrollTop < max - 2 : se.scrollTop > 2) { se.scrollTop = Math.max(0, Math.min(max, top)); return rdProgress(true); } }
  if (dir > 0 && RD.ci + 1 < RD.chapters.length) { if (await rdLoadChapter(RD.ci + 1)) { RD.pendingFrac = 0; rdSettle(); } }
  else if (dir < 0 && RD.ci > 0) { if (await rdLoadChapter(RD.ci - 1)) { RD.pendingFrac = rdPaged() ? 0.9999 : 1; rdSettle(); } }
  else rdOsd(t(dir > 0 ? 'rd_last' : 'rd_first'));
}
async function rdChapter(dir) { if (RD.kind === 'cbz' || RD.kind === 'pdf') return rdTurn(dir * 10); const ci = RD.ci + dir; if (ci < 0 || ci >= RD.chapters.length) return rdOsd(t(dir > 0 ? 'rd_last' : 'rd_first')); if (await rdLoadChapter(ci)) { RD.pendingFrac = 0; rdSettle(); } }

/* ---------- progress: the bar, the percentage, time left, the saved place ---------- */
const rdTotalSize = () => RD.chapters.reduce((a, c) => a + c.size, 0) || 1;
function rdOverall() {
  if (RD.kind === 'cbz' || RD.kind === 'pdf') return RD.pages > 1 ? (RD.page - 1) / (RD.pages - 1) : 1;
  let before = 0; for (let i = 0; i < RD.ci; i++) before += RD.chapters[i].size; return (before + rdFracNow() * RD.chapters[RD.ci].size) / rdTotalSize();
}
function rdCharsLeft() {
  const ratio = (() => { const l = RD.chapters.filter(c => c.chars); return l.length ? l.reduce((a, c) => a + c.chars, 0) / l.reduce((a, c) => a + c.size, 0) : .5; })();
  const cur = RD.chapters[RD.ci]; return (cur.chars || cur.size * ratio) * (1 - rdFracNow());
}
/* the bookmark on this page, if there is one */
function rdBmHere() {
  const live = POS.live(RD.rec, 'bm'); if (!live.length || !RD.ready) return null;
  if (RD.kind === 'cbz' || RD.kind === 'pdf') return live.find(b => String(b.v) === String(RD.page)) || null;
  const n = rdPages(), cur = rdPaged() ? Math.min(n - 1, rdCurPage()) : -1, now = rdFracNow();
  return live.find(b => { const [c, f] = String(b.v).split(':'); if (Number(c) !== RD.ci) return false; return rdPaged() ? Math.min(n - 1, Math.floor(Number(f) * n + 1e-6)) === cur : Math.abs(Number(f) - now) < .03; }) || null;
}
function rdProgress(turned) {
  if (!RD.ready && RD.kind !== 'cbz' && RD.kind !== 'pdf' && !RD.chapters.length) return; const p = rdOverall(), pct = Math.round(p * 100);
  $('rdPct').textContent = pct + '%'; $('rdSeek').value = Math.round(p * 1000); $('rdSeek').setAttribute('aria-valuetext', t('rd_at', { p:pct }));
  let left = '';
  if (RD.kind === 'cbz' || RD.kind === 'pdf') left = t('rd_page_of', { n:RD.page, total:RD.pages });
  else { const cpm = RD.speedCpm || (RD.lang.startsWith('zh') || /[㐀-鿿]/.test((RD.text[RD.ci] || '').slice(0, 300)) ? 450 : 1100); left = t('rd_left', { ch:Math.max(0, Math.round(rdCharsLeft() / cpm)) }); }
  $('rdLeft').textContent = left; $('rdBar').dataset.p = pct;
  const here = !!rdBmHere(), mb = $('rdb_mark'); if (mb) { mb.setAttribute('aria-pressed', String(here)); mb.classList.toggle('on', here); }
  if (turned) { $('rdLive').textContent = RD.kind === 'cbz' || RD.kind === 'pdf' ? t('rd_page_of', { n:RD.page, total:RD.pages }) : pct + '%'; rdTurnTiming(); $('rdSel').hidden = true; }
  const loc = rdLocNow(), now = Date.now(); RD.snap = { p, loc };
  if (now - RD.lastSave > 1500 || turned) { RD.lastSave = now; POS.set(RD.rec, p, loc, RD.kind === 'cbz' || RD.kind === 'pdf' ? RD.pages : RD.chapters.length); }
  if (p >= .995 && RD.ready && !RD.doneFired && RD.kind !== 'cbz' && RD.kind !== 'pdf' || (p >= .999 && (RD.kind === 'cbz' || RD.kind === 'pdf') && !RD.doneFired)) { RD.doneFired = true; trackerProgress(RD.rec, 1); trackerFinished(RD.rec); }     // the last page was reached: done, without waiting for the book to be closed
}
/* reading speed, learned from how long you stay on a page (kept only when it is a plausible reading time) */
function rdTurnTiming() {
  const now = Date.now(); if (RD.lastTurn && rdPaged() && RD.kind !== 'cbz' && RD.kind !== 'pdf') {
    const sec = (now - RD.lastTurn) / 1000, ch = RD.chapters[RD.ci], perPage = (ch.chars || 0) / Math.max(1, rdPages());     // one turn: a page, or a spread
    if (sec > 4 && sec < 240 && perPage > 100) { const cpm = perPage / sec * 60; RD.speedCpm = RD.speedCpm ? RD.speedCpm * .8 + cpm * .2 : cpm; store.set('vmm.rdcpm', String(Math.round(RD.speedCpm))); }
  }
  RD.lastTurn = now;
}
function rdPersist(final) {
  if (!RD.rec || !(RD.ready || RD.kind === 'cbz' || RD.kind === 'pdf')) return;
  /* a closed dialog has no size, so the page cannot be measured any more: use the place seen last (this was why a book came back at page 1) */
  const live = rdd().open && rdf().clientWidth > 0, snap = RD.snap, p = live ? rdOverall() : snap ? snap.p : NaN, loc = live ? rdLocNow() : snap ? snap.loc : null;
  if (!isFinite(p) || loc == null || /NaN/.test(loc)) return;
  POS.set(RD.rec, p, loc, RD.chapters.length || RD.pages);
  if (final) { trackerProgress(RD.rec, p); if (p > .985) { POS.set(RD.rec, 1, RD.kind === 'cbz' || RD.kind === 'pdf' ? '1' : '0:0', RD.pages || RD.chapters.length); trackerFinished(RD.rec); } }
}

/* ---------- look ---------- */
function rdApplyLook() {
  const d = rdd(), T = rdTheme(); d.dataset.ui = T.ui; d.style.setProperty('--rd-bg', T.bg); d.style.setProperty('--rd-fg', T.fg);
  /* the chrome's own tones, worked out from the two colours: a hairline, a soft fill, the panel, and a quieter text that still reads (4.6 : 1 or better) */
  const panel = rdMix(T.bg, T.fg, .08); let mute = T.fg; for (let k = .7; k <= 1; k += .03) { mute = rdMix(T.bg, T.fg, k); if (rdContrast(mute, panel) >= 4.6) break; }
  d.style.setProperty('--rd-line', rdMix(T.bg, T.fg, .18)); d.style.setProperty('--rd-soft', panel); d.style.setProperty('--rd-panel', panel); d.style.setProperty('--rd-mute', mute);
  $('rdPic').style.filter = T.ui === 'dark' && RD.kind === 'pdf' ? 'invert(.9) hue-rotate(180deg)' : '';
}
/* a change of colour, size, spacing or layout only restyles the page that is on screen: it stays where it is, with no reload and no flash */
async function rdReflow() {
  if (RD.kind === 'cbz' || RD.kind === 'pdf') { if (RD.kind === 'pdf') rdPdfShow(RD.page); return; }
  if (!RD.chapters.length) return; const f = rdFracNow(), doc = rdf().contentDocument, st = doc && doc.querySelector('style');
  if (st) { st.textContent = rdCss(); RD.pendingFrac = f; rdSettle(); return; }
  if (await rdLoadChapter(RD.ci)) { RD.pendingFrac = f; rdSettle(); }
}
const rdSet = (k, v, reflow) => { RD.s[k] = v; rdSave(); rdApplyLook(); if (reflow) rdReflow(); };

/* ---------- highlights: kept by chapter and character offsets, so a change of font does not move them ---------- */
function rdTextNodes(doc) { const w = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT), out = []; let off = 0, n; while ((n = w.nextNode())) { if (n.parentElement && /^(SCRIPT|STYLE)$/.test(n.parentElement.tagName)) continue; out.push({ n, a:off, b:off + n.nodeValue.length }); off += n.nodeValue.length; } return out; }
function rdWrap(doc, a, b, cls, attrs) {
  const marks = []; for (const { n, a:s, b:e } of rdTextNodes(doc)) {
    const lo = Math.max(a, s), hi = Math.min(b, e); if (lo >= hi) continue; const r = doc.createRange(); r.setStart(n, lo - s); r.setEnd(n, hi - s);
    const m = doc.createElement('mark'); m.className = cls; Object.entries(attrs || {}).forEach(([k, v]) => m.setAttribute(k, v)); try { r.surroundContents(m); marks.push(m); } catch (x) {}
  } return marks;
}
function rdHighlights(doc) { POS.live(RD.rec, 'hl').filter(h => h.c === RD.ci).sort((x, y) => y.a - x.a).forEach(h => rdWrap(doc, h.a, h.b, 'hl', { 'data-id':h.id, style:'--c:' + h.color, ...(h.note ? { 'data-n':'1', title:h.note } : {}) })); }
function rdSelection() {
  const doc = rdf().contentDocument, sel = doc && doc.getSelection(); if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
  const r = sel.getRangeAt(0), nodes = rdTextNodes(doc), find = (node, off) => { const x = nodes.find(t => t.n === node); return x ? x.a + off : null; };
  const a = find(r.startContainer, r.startOffset), b = find(r.endContainer, r.endOffset); if (a == null || b == null || b <= a) return null;
  return { a, b, text:sel.toString().trim().slice(0, 600), rect:r.getBoundingClientRect() };
}
/* One small toolbar for both cases: text you have just selected (choose a colour, add a note, copy) and a highlight you tapped (change its colour,
   edit its note, remove it). The note is written in place, with room for more than a line. */
function rdSelUi(markEl) {
  const box = $('rdSel'), existing = markEl ? POS.m(RD.rec).hl.find(h => h.id === markEl.dataset.id && !h.x) : null, s = existing ? null : rdSelection();
  if (!existing && (!s || !s.text)) { box.hidden = true; RD.sel = null; return; }
  RD.sel = existing ? { id:existing.id, rect:markEl.getBoundingClientRect() } : s;
  rdSelDraw(existing ? 'edit' : 'new', existing);
}
function rdSelDraw(mode, h, noteOpen) {
  const box = $('rdSel'), s = RD.sel; if (!s) return;
  const sw = RD_HL.map(([c, n]) => `<button type="button" class="rd-sw${h && h.color === c ? ' on' : ''}" data-hl="${c}" style="background:${c}" aria-label="${esc(t('rd_hl_in', { c:t('rd_c_' + n) }))}" data-tip="${esc(t('rd_c_' + n))}"></button>`).join('');
  box.innerHTML = noteOpen ? `<div class="rd-note"><textarea rows="3" maxlength="2000" aria-label="${esc(t('rd_note'))}" placeholder="${esc(t('rd_note_ask'))}">${esc(h ? h.note || '' : RD.noteDraft || '')}</textarea><div class="rd-note-b"><button type="button" class="btn sm" data-notecancel>${esc(t('cancel'))}</button><button type="button" class="btn sm primary" data-notesave>${esc(t('rd_note_save'))}</button></div></div>`
    : `${sw}<span class="rd-sep"></span><button type="button" class="pl-b" data-hlnote aria-label="${esc(t(h && h.note ? 'rd_edit_note' : 'rd_note'))}" data-tip="${esc(t(h && h.note ? 'rd_edit_note' : 'rd_note'))}"><i class="ti ti-notes"></i></button>${h ? `<button type="button" class="pl-b" data-hldel aria-label="${esc(t('rd_hl_del'))}" data-tip="${esc(t('rd_hl_del'))}"><i class="ti ti-trash"></i></button>` : `<button type="button" class="pl-b" data-hlcopy aria-label="${esc(t('rd_copy'))}" data-tip="${esc(t('rd_copy'))}"><i class="ti ti-copy"></i></button>`}`;
  box.dataset.mode = mode; box.hidden = false;
  const fr = rdf().getBoundingClientRect(), vr = $('rdView').getBoundingClientRect(), bw = box.offsetWidth, x = fr.left - vr.left + s.rect.left + s.rect.width / 2 - bw / 2, y = fr.top - vr.top + s.rect.top - box.offsetHeight - 10;
  box.style.left = Math.max(8, Math.min(x, vr.width - bw - 8)) + 'px'; box.style.top = Math.max(8, y < 8 ? fr.top - vr.top + s.rect.bottom + 10 : y) + 'px';
  if (noteOpen) box.querySelector('textarea').focus();
}
async function rdHighlight(color) {
  const s = RD.sel; if (!s) return;
  if (s.id) { await POS.edit(RD.rec, 'hl', s.id, { color }); }
  else { await POS.add(RD.rec, 'hl', { c:RD.ci, a:s.a, b:s.b, text:s.text, color, note:RD.noteDraft || '' }); RD.noteDraft = ''; const doc = rdf().contentDocument; doc.getSelection().removeAllRanges(); }
  $('rdSel').hidden = true; tipHide(); RD.sel = null; await rdReflowKeep();
}
async function rdNoteSave(text) {
  const s = RD.sel; if (!s) return; text = text.trim();
  if (s.id) await POS.edit(RD.rec, 'hl', s.id, { note:text });
  else { await POS.add(RD.rec, 'hl', { c:RD.ci, a:s.a, b:s.b, text:s.text, color:RD_HL[0][0], note:text }); const doc = rdf().contentDocument; doc.getSelection().removeAllRanges(); }
  RD.noteDraft = ''; $('rdSel').hidden = true; RD.sel = null; await rdReflowKeep(); if (RD.panel === 'marks') rdPanelDraw();
}
async function rdHighlightDelete(id) { await POS.drop(RD.rec, 'hl', id); $('rdSel').hidden = true; RD.sel = null; toast(t('rd_hl_gone'), false); await rdReflowKeep(); if (RD.panel === 'marks') rdPanelDraw(); }
async function rdReflowKeep() { const f = rdFracNow(); if (await rdLoadChapter(RD.ci)) { RD.pendingFrac = f; rdSettle(); } }

/* ---------- search: type and the results appear; Enter goes to the first ---------- */
async function rdSearch(q) {
  const out = $('rdFindOut'); if (!out) return; q = q.trim(); if (!q) { out.innerHTML = ''; RD.hits = []; return; }
  if (RD.kind === 'cbz') { out.innerHTML = `<div class="rd-none">${esc(t('rd_no_text'))}</div>`; return; }
  if (RD.kind === 'pdf') { out.innerHTML = `<div class="rd-none">${esc(t('rd_pdf_find'))}</div>`; return; }
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), tok = ++RD.findTok, hits = []; out.innerHTML = `<div class="rd-none">${esc(t('rd_searching'))}</div>`;
  for (let i = 0; i < RD.chapters.length && hits.length < 200; i++) {
    if (tok !== RD.findTok) return;
    if (RD.text[i] == null) { try { RD.text[i] = rdText(await RD.load(i)); RD.chapters[i].chars = RD.text[i].length; } catch (e) { RD.text[i] = ''; } }
    const s = RD.text[i]; re.lastIndex = 0; let m; while ((m = re.exec(s)) && hits.length < 200) { hits.push({ ci:i, at:m.index, len:m[0].length || 1, a:(m.index > 28 ? s.slice(m.index - 28, m.index).replace(/^\S*\s/, '') : s.slice(0, m.index)), m:m[0], b:s.slice(m.index + m[0].length, m.index + m[0].length + 48).replace(/\s\S*$/, '') }); if (!m[0].length) re.lastIndex++; }
    if (i % 8 === 7) await new Promise(r => setTimeout(r, 0));
  }
  if (tok !== RD.findTok) return; RD.hits = hits;
  let html = '', last = -1; hits.forEach((h, i) => { if (h.ci !== last) { last = h.ci; html += `<h3>${esc(RD.chapters[h.ci].title)} <span>${hits.filter(x => x.ci === h.ci).length}</span></h3>`; } html += `<button type="button" class="rd-hit" data-hit="${i}"><span class="sn">${esc(h.a)}<mark>${esc(h.m)}</mark>${esc(h.b)}</span></button>`; });
  out.innerHTML = hits.length ? `<div class="rd-cnt">${esc(t('rd_found', { n:hits.length }))}${hits.length >= 200 ? ' · ' + esc(t('rd_found_cap')) : ''}</div>` + html : `<div class="rd-none">${esc(t('rd_nothing'))}</div>`;
}
async function rdGoHit(h) {
  if (h.ci !== RD.ci) { if (!(await rdLoadChapter(h.ci))) return; } const doc = rdf().contentDocument;
  doc.querySelectorAll('mark.find').forEach(m => { const p = m.parentNode; while (m.firstChild) p.insertBefore(m.firstChild, m); p.removeChild(m); p.normalize(); });
  const ms = rdWrap(doc, h.at, h.at + h.len, 'find'); setTimeout(() => { if (ms[0]) rdScrollToEl(ms[0]); rdProgress(true); }, 30);
}

/* ---------- panels: contents and marks (two tabs), search, look ---------- */
function rdPanelOpen(kind) {
  if (RD.panel === kind) return rdPanelClose(true);
  RD.panel = kind; const p = $('rdPanel'); p.hidden = false; p.dataset.kind = kind; rdPanelDraw();
  const f = p.querySelector('input[type=search]') || p.querySelector('.rd-toc.on') || p.querySelector('button'); if (f) f.focus(); rdShowUi(true);
}
function rdPanelClose(refocus) { RD.panel = ''; const p = $('rdPanel'); if (p) { p.hidden = true; p.innerHTML = ''; } if (refocus) { const v = $('rdView'); if (v) v.focus({ preventScroll:true }); rdShowUi(); } }
const rdSeg = (key, opts, labelOf) => `<div class="rd-seg" role="group">${opts.map(o => `<button type="button" data-set="${key}" data-v="${o}" aria-pressed="${String(RD.s[key]) === String(o)}">${esc(labelOf ? labelOf(o) : o)}</button>`).join('')}</div>`;
const rdHead = ti => `<div class="rd-ph"><h2>${esc(ti)}</h2><button type="button" class="pl-b" data-close aria-label="${esc(t('sh_close'))}"><i class="ti ti-x"></i></button></div>`;
/* ---------- the notebook: bookmarks, highlights and notes in one place, with search, order, editing, export and import ---------- */
const rdPosKey = it => { if (RD.kind === 'cbz' || RD.kind === 'pdf') return Number(it.v) || 0; if (it.c != null) return it.c + (it.a || 0) / 1e7; const [c, f] = String(it.v).split(':'); return (Number(c) || 0) + (Number(f) || 0) * .999; };
const rdChapOf = it => { if (RD.kind === 'cbz' || RD.kind === 'pdf') return -1; if (it.c != null) return it.c; return Number(String(it.v).split(':')[0]) || 0; };
function rdNotebookHtml() {
  const N = RD.nb, q = N.q.trim().toLowerCase(), M = POS.m(RD.rec), chapT = i => i < 0 ? '' : (RD.chapters[i] && RD.chapters[i].title) || t('rd_ch_n', { n:i + 1 });
  const all = [...M.bm.filter(x => !x.x).map(it => ({ kind:'bm', it })), ...M.hl.filter(x => !x.x).map(it => ({ kind:'hl', it }))];
  const hay = o => [o.it.label, o.it.text, o.it.note, chapT(rdChapOf(o.it))].join(' ').toLowerCase();
  let list = q ? all.filter(o => hay(o).includes(q)) : all;
  list = N.sort === 'new' ? list.sort((a, b) => b.it.at - a.it.at) : list.sort((a, b) => rdPosKey(a.it) - rdPosKey(b.it) || a.it.at - b.it.at);
  const nb = all.filter(o => o.kind === 'bm').length, nh = all.length - nb;
  const edit = o => `<div class="rd-note wide"><label class="rd-lab">${esc(t(o.kind === 'bm' ? 'rd_nb_name' : 'rd_note'))}</label>${o.kind === 'bm' ? `<input type="text" class="rd-name" maxlength="120" value="${esc(o.it.label || '')}" aria-label="${esc(t('rd_nb_name'))}">` : `<div class="rd-quote">${esc(o.it.text)}</div>`}<label class="rd-lab">${esc(t('rd_nb_note'))}</label><textarea rows="3" maxlength="2000" aria-label="${esc(t('rd_nb_note'))}">${esc(o.it.note || '')}</textarea><div class="rd-note-b"><button type="button" class="btn sm" data-editcancel>${esc(t('cancel'))}</button><button type="button" class="btn sm primary" data-editsave="${o.kind}:${esc(o.it.id)}">${esc(t('rd_note_save'))}</button></div></div>`;
  const acts = o => `<div class="rd-mka"><button type="button" class="pl-b sm" data-mkedit="${o.kind}:${esc(o.it.id)}" aria-label="${esc(t('rd_nb_edit'))}"><i class="ti ti-pencil"></i></button><button type="button" class="pl-b sm" data-mkdel="${o.kind}:${esc(o.it.id)}" aria-label="${esc(t(o.kind === 'bm' ? 'rd_del' : 'rd_hl_del'))}"><i class="ti ti-trash"></i></button></div>`;
  const row = o => {
    if (N.edit === o.kind + ':' + o.it.id) return `<div class="rd-mk">${edit(o)}</div>`;
    if (o.kind === 'bm') return `<div class="rd-mk"><i class="ti ti-bookmark rd-ico" aria-hidden="true"></i><button type="button" class="rd-mkgo" data-mk="bm:${esc(o.it.id)}"><span class="nm">${esc(o.it.label || t('rd_bm_untitled'))}</span>${o.it.note ? `<span class="nt">${esc(o.it.note)}</span>` : ''}</button>${acts(o)}</div>`;
    return `<div class="rd-mk"><span class="rd-dot" style="background:${esc(o.it.color)}"></span><button type="button" class="rd-mkgo" data-mk="hl:${esc(o.it.id)}">${o.it.note ? `<span class="nm">${esc(o.it.note)}</span>` : ''}<q class="rd-q">${esc(o.it.text)}</q></button>${acts(o)}</div>`;
  };
  let body = ''; if (!list.length) body = `<div class="rd-none">${esc(t(all.length ? 'rd_nb_nomatch' : 'rd_nb_empty'))}</div>`;
  else if (N.sort === 'book' && !(RD.kind === 'cbz' || RD.kind === 'pdf')) { let last = null; for (const o of list) { const c = rdChapOf(o.it); if (c !== last) { last = c; body += `<h3>${esc(chapT(c))}</h3>`; } body += row(o); } }
  else body = list.map(row).join('');
  return `<div class="rd-nbtools"><div class="rd-find slim"><i class="ti ti-search" aria-hidden="true"></i><input type="search" id="rdNbQ" placeholder="${esc(t('rd_nb_search'))}" aria-label="${esc(t('rd_nb_search'))}" value="${esc(N.q)}" autocomplete="off" spellcheck="false"></div>
    <div class="rd-seg" role="group"><button type="button" data-nbsort="book" aria-pressed="${N.sort === 'book'}">${esc(t('rd_nb_book'))}</button><button type="button" data-nbsort="new" aria-pressed="${N.sort === 'new'}">${esc(t('rd_nb_new'))}</button></div>
    <div class="rd-cnt">${esc(t('rd_nb_count', { b:nb, h:nh }))}</div></div><div class="rd-pb" id="rdNbList">${body}</div>
    <div class="rd-nbfoot"><button type="button" class="rd-btn sm" data-nbadd><i class="ti ti-bookmark-plus"></i>${esc(t('rd_nb_add'))}</button><button type="button" class="rd-btn sm" data-export="md"><i class="ti ti-markdown"></i>${esc(t('rd_nb_md'))}</button><button type="button" class="rd-btn sm" data-export="json"><i class="ti ti-download"></i>${esc(t('rd_nb_json'))}</button><button type="button" class="rd-btn sm" data-import><i class="ti ti-upload"></i>${esc(t('rd_nb_import'))}</button></div>`;
}
function rdNotebookExport(kind) {
  const M = POS.m(RD.rec), bm = M.bm.filter(x => !x.x).sort((a, b) => rdPosKey(a) - rdPosKey(b)), hl = M.hl.filter(x => !x.x).sort((a, b) => rdPosKey(a) - rdPosKey(b)), name = RD.title.replace(/[\\/:*?"<>|]/g, '_');
  if (kind === 'json') return download(`${name}-notebook.json`, JSON.stringify({ app:'media-tracker-notebook', v:1, book:{ name:RD.rec.fileName, size:RD.rec.fileSize }, bm:bm.map(({ v, label, note, at }) => ({ v, label, note:note || '', at })), hl:hl.map(({ c, a, b, text, note, color, at }) => ({ c, a, b, text, note:note || '', color, at })) }, null, 1), 'application/json');
  const chap = i => (RD.chapters[i] && RD.chapters[i].title) || '';
  const md = [`# ${RD.title}`, '', ...(bm.length ? ['## ' + t('rd_bookmarks'), '', ...bm.map(b => `- ${b.label || ''}${b.note ? ' — ' + b.note : ''}`), ''] : []), ...(hl.length ? ['## ' + t('rd_highlights'), '', ...hl.flatMap(h => [`> ${h.text}`, ...(chap(h.c) ? ['> — ' + chap(h.c)] : []), ...(h.note ? ['', h.note] : []), ''])] : [])].join('\n');
  download(`${name}-notebook.md`, md, 'text/markdown');
}
async function rdNotebookImport() {
  const r = await pickLocal({ multiple:false, accept:'.json,application/json' }); if (!r) return;
  let j; try { j = JSON.parse(await r.files[0].text()); } catch (e) { return toast(t('rd_nb_bad'), true); }
  if (!j || (j.app !== 'media-tracker-notebook' && !Array.isArray(j.hl))) return toast(t('rd_nb_bad'), true);
  const M = POS.m(RD.rec); let n = 0, d = 0;
  for (const b of j.bm || []) { if (b.v == null) continue; if (M.bm.some(x => !x.x && String(x.v) === String(b.v))) { d++; continue; } M.bm.push({ id:syUid(), v:b.v, label:String(b.label || ''), note:String(b.note || ''), at:Date.now() }); n++; }
  for (const h of j.hl || []) { if (h.a == null || h.b == null || !h.text) continue; if (M.hl.some(x => !x.x && x.c === h.c && x.a === h.a && x.b === h.b)) { d++; continue; } M.hl.push({ id:syUid(), c:h.c, a:h.a, b:h.b, text:String(h.text).slice(0, 600), note:String(h.note || ''), color:RD_HL.some(x => x[0] === h.color) ? h.color : RD_HL[0][0], at:Date.now() }); n++; }
  await POS.saveMarks(); toast(t('rd_nb_imported', { n, d })); rdPanelDraw(); rdProgress(); rdReflowKeep();
}
function rdPanelDraw() {
  const p = $('rdPanel'), k = RD.panel; if (!k) return;
  if (k === 'toc') {
    p.innerHTML = rdHead(t('rc_toc')) + `<div class="rd-pb">${RD.toc.map((x, i) => `<button type="button" class="rd-toc ${x.ci === RD.ci && (RD.kind !== 'pdf' || (RD.page >= (x.page || 1) && (!RD.toc[i + 1] || RD.page < (RD.toc[i + 1].page || 1e9)))) ? 'on' : ''}" style="padding-left:${14 + x.depth * 16}px" data-toc="${i}">${esc(x.label || '…')}</button>`).join('')}</div>`;
    const on = p.querySelector('.rd-toc.on'); if (on) on.scrollIntoView({ block:'center' });
  } else if (k === 'marks') {
    p.innerHTML = rdHead(t('rc_marks')) + rdNotebookHtml();
  } else if (k === 'search') {
    p.innerHTML = rdHead(t('rc_search')) + `<form class="rd-find" id="rdFindForm" role="search"><i class="ti ti-search" aria-hidden="true"></i><input type="search" id="rdFindQ" placeholder="${esc(t('rd_find_ph'))}" aria-label="${esc(t('rc_search'))}" value="${esc(RD.find)}" autocomplete="off" spellcheck="false"><button type="button" class="rd-clear" id="rdFindClear" aria-label="${esc(t('rd_find_clear'))}" ${RD.find ? '' : 'hidden'}><i class="ti ti-x"></i></button></form><div class="rd-pb" id="rdFindOut"></div>`;
    RD.findTok = 0; if (RD.find) rdSearch(RD.find);
  } else if (k === 'look') {
    const S = RD.s, sl = (key, min, max, step, lab) => `<label class="rd-sl"><span>${esc(lab)}</span><output>${S[key]}</output><input type="range" data-slide="${key}" min="${min}" max="${max}" step="${step}" value="${S[key]}"></label>`;
    const ths = [...Object.keys(RD_THEMES), 'custom'].map(id => { const T = id === 'custom' ? { bg:/^#[0-9a-f]{6}$/i.test(S.bg) ? S.bg : RD_DEF.bg, fg:rdTheme().fg } : RD_THEMES[id]; const fg = id === 'custom' && S.theme !== 'custom' ? rdBest(T.bg, ['#1d1d1b', '#e6e6e1']) : T.fg; return `<button type="button" class="rd-th" data-set="theme" data-v="${id}" aria-pressed="${S.theme === id}" style="background:${T.bg};color:${fg}"><span>Aa</span><small>${esc(t('rd_th_' + id))}</small></button>`; }).join('');
    const T = rdTheme();
    p.innerHTML = rdHead(t('rc_look')) + `<div class="rd-pb">
      <div class="rd-g"><span>${esc(t('rd_theme'))}</span><div class="rd-themes" role="group">${ths}</div></div>
      ${S.theme === 'custom' ? `<div class="rd-custom"><label><span>${esc(t('rd_bg'))}</span><input type="color" data-color="bg" value="${esc(T.bg)}"></label><label><span>${esc(t('rd_fg'))}</span><input type="color" data-color="fg" value="${esc(T.fg)}"></label><button type="button" class="rd-btn sm" data-fgauto>${esc(t('rd_text_auto'))}</button><p>${esc(t('rd_custom_d'))}</p></div>` : ''}
      ${sl('size', 12, 40, 1, t('rd_size'))}${sl('lh', 1.2, 2.6, .05, t('rd_lh'))}${sl('mx', 0, 18, 1, t('rd_mx'))}
      <div class="rd-g"><span>${esc(t('rd_font'))}</span>${rdSeg('family', ['serif', 'sans', 'kai'], v => t('rd_f_' + v))}</div>
      <div class="rd-g"><span>${esc(t('rd_flow'))}</span>${rdSeg('flow', ['auto', 'one', 'two', 'scroll'], v => t('rd_pg_' + v))}${S.flow === 'auto' ? `<small>${esc(t('rd_pg_auto_d'))}</small>` : ''}</div>
      <button type="button" class="rd-btn" data-reset><i class="ti ti-restore"></i>${esc(t('rd_reset'))}</button></div>`;
  }
}
function rdWirePanel() {
  const p = $('rdPanel');
  p.addEventListener('click', async e => {
    if (e.target.closest('[data-close]')) { rdPanelClose(true); return; }
    const toc = e.target.closest('[data-toc]'); if (toc) { const x = RD.toc[+toc.dataset.toc]; rdPanelClose(true); if (RD.kind === 'pdf') return rdPdfShow(x.page || 1); if (RD.kind === 'cbz') return; if (await rdLoadChapter(x.ci, x.anchor)) { RD.pendingFrac = x.anchor ? null : 0; rdSettle(); } return; }
    const hit = e.target.closest('[data-hit]'); if (hit) { rdGoHit(RD.hits[+hit.dataset.hit]); if (matchMedia('(max-width:700px)').matches) rdPanelClose(true); return; }
    if (e.target.closest('#rdFindClear')) { RD.find = ''; const q = $('rdFindQ'); q.value = ''; q.focus(); $('rdFindClear').hidden = true; rdSearch(''); return; }
    const set = e.target.closest('[data-set]'); if (set) { const k = set.dataset.set, v = isNaN(Number(set.dataset.v)) || k === 'theme' || k === 'flow' ? set.dataset.v : Number(set.dataset.v); rdSet(k, v, k === 'flow' || k === 'family' || k === 'theme'); rdPanelDraw(); return; }
    if (e.target.closest('[data-fgauto]')) { rdSet('fg', '', true); rdPanelDraw(); return; }
    const go = e.target.closest('[data-mk]'); if (go) { const [kind, id] = go.dataset.mk.split(':'), it = POS.m(RD.rec)[kind].find(x => x.id === id); if (!it) return; rdPanelClose(true);
      if (kind === 'bm') return rdGoLoc(it.v); if (await rdLoadChapter(it.c)) { RD.pendingFrac = null; const doc = rdf().contentDocument, m = doc.querySelector(`mark[data-id="${it.id}"]`); setTimeout(() => { if (m) rdScrollToEl(m); rdProgress(true); }, 30); } return; }
    const del = e.target.closest('[data-mkdel]'); if (del) { const [kind, id] = del.dataset.mkdel.split(':'); if (kind === 'hl') return rdHighlightDelete(id); await POS.drop(RD.rec, 'bm', id); rdPanelDraw(); rdProgress(); return; }
    const ed = e.target.closest('[data-mkedit]'); if (ed) { RD.nb.edit = ed.dataset.mkedit; rdPanelDraw(); const f = p.querySelector('.rd-name, textarea'); if (f) f.focus(); return; }
    const es = e.target.closest('[data-editsave]'); if (es) {
      const [kind, id] = es.dataset.editsave.split(':'), box = es.closest('.rd-note'), note = box.querySelector('textarea').value.trim(), nm = box.querySelector('.rd-name');
      await POS.edit(RD.rec, kind, id, kind === 'bm' ? { label:nm.value.trim(), note } : { note }); RD.nb.edit = ''; rdPanelDraw(); if (kind === 'hl') rdReflowKeep(); return; }
    if (e.target.closest('[data-editcancel]')) { RD.nb.edit = ''; rdPanelDraw(); return; }
    const so = e.target.closest('[data-nbsort]'); if (so) { RD.nb.sort = so.dataset.nbsort; rdPanelDraw(); return; }
    if (e.target.closest('[data-nbadd]')) { rdToggleBookmark(true); return; }
    const ex = e.target.closest('[data-export]'); if (ex) return rdNotebookExport(ex.dataset.export);
    if (e.target.closest('[data-import]')) return rdNotebookImport();
    if (e.target.closest('[data-reset]')) { RD.s = { ...RD_DEF, theme:matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day' }; rdSave(); rdApplyLook(); rdReflow(); rdPanelDraw(); }
  });
  p.addEventListener('input', e => {
    const nq = e.target.closest('#rdNbQ'); if (nq) { RD.nb.q = nq.value; clearTimeout(RD.nbTm); RD.nbTm = setTimeout(() => { const l = $('rdNbList'), pos = l ? l.scrollTop : 0; RD.panel === 'marks' && rdNbRefresh(); }, 120); return; }
    const q = e.target.closest('#rdFindQ'); if (q) { RD.find = q.value; $('rdFindClear').hidden = !q.value; clearTimeout(RD.findTm); RD.findTm = setTimeout(() => rdSearch(RD.find), 250); return; }
    const c = e.target.closest('[data-color]'); if (c) {                                          // a colour picked: the page follows at once; the panel is left alone so the picker stays open
      RD.s[c.dataset.color] = c.value; RD.s.theme = 'custom'; rdSave(); rdApplyLook(); rdReflow();
      const fgIn = p.querySelector('[data-color=fg]'); if (fgIn && !RD.s.fg) fgIn.value = rdTheme().fg; return; }
    const s = e.target.closest('[data-slide]'); if (!s) return; const k = s.dataset.slide, v = Number(s.value); s.previousElementSibling.textContent = v;
    clearTimeout(RD.slideTm); RD.s[k] = v; rdSave(); rdApplyLook(); RD.slideTm = setTimeout(rdReflow, 140);
  });
  p.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); rdPanelClose(true); return; }
    if (e.key === 'Enter' && e.target.id === 'rdFindQ') { e.preventDefault(); clearTimeout(RD.findTm); rdSearch(RD.find).then(() => { if (RD.hits[0]) rdGoHit(RD.hits[0]); }); }
  });
  p.addEventListener('submit', e => e.preventDefault());
}

/* ---------- frame events ---------- */
function rdFrameWire(doc) {
  doc.addEventListener('keydown', e => rdKey(e, true));
  doc.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]'); if (a) {
      e.preventDefault(); const h = a.getAttribute('href') || '';
      if (h.startsWith('#')) { const el = doc.getElementById(h.slice(1)) || doc.querySelector(`[name="${CSS.escape(h.slice(1))}"]`); if (el) rdScrollToEl(el); return; }
      if (/^https?:\/\//i.test(h)) return rdExternal(h);
      const base = RD.chapters[RD.ci] && RD.chapters[RD.ci].path ? RD.chapters[RD.ci].path.replace(/[^/]*$/, '') : '', p = joinPath(base, decodeURIComponent(h.split('#')[0])), ci = RD.chapters.findIndex(c => c.path && (c.path === p || c.path.toLowerCase() === p.toLowerCase()));
      if (ci >= 0) rdLoadChapter(ci, h.split('#')[1]).then(ok => { if (ok) { RD.pendingFrac = h.includes('#') ? null : 0; rdSettle(); } }); return;
    }
    const mk = e.target.closest && e.target.closest('mark.hl'); if (mk) { e.stopPropagation(); return rdSelUi(mk); }
    const sel = doc.getSelection(); if (sel && !sel.isCollapsed) return;
    const box = $('rdSel'); if (!box.hidden) { if (box.dataset.mode !== 'note') { box.hidden = true; RD.sel = null; } return; }
    const W = doc.documentElement.clientWidth, x = e.clientX / W;
    if (x < .28) rdTurn(-1); else if (x > .72) rdTurn(1); else rdToggleUi();
  });
  doc.addEventListener('mouseup', () => setTimeout(() => { if (RD.sel && RD.sel.id) return; rdSelUi(); }, 10)); doc.addEventListener('touchend', () => setTimeout(() => rdSelUi(), 300)); doc.addEventListener('keyup', e => { if (e.shiftKey) setTimeout(() => rdSelUi(), 10); });
  doc.addEventListener('mousemove', e => { const H = doc.documentElement.clientHeight; if (e.clientY < 44 || e.clientY > H - 56) rdShowUi(); });      // the pointer at the top or bottom edge asks for the bars
  let wheelAt = 0;
  doc.addEventListener('wheel', e => { if (!rdPaged()) return; e.preventDefault(); const n = Date.now(); if (n - wheelAt < 280) return; wheelAt = n; rdTurn(e.deltaY > 0 || e.deltaX > 0 ? 1 : -1); }, { passive:false });
  doc.addEventListener('scroll', () => { if (!rdPaged()) { clearTimeout(RD.scTm); RD.scTm = setTimeout(() => rdProgress(false), 120); } $('rdSel').hidden = true; });
  let g = null; doc.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') g = { x:e.clientX, y:e.clientY, t:Date.now() }; });     // a swipe across turns the page
  doc.addEventListener('pointerup', e => { if (!g) return; const o = g; g = null; const dx = e.clientX - o.x, dy = e.clientY - o.y; if (e.pointerType === 'touch' && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6 && Date.now() - o.t < 600) rdTurn(dx < 0 ? 1 : -1); });
}
/* An outside link is opened by pressing a real link in a small box. Browsers (Safari most of all) only let a page open a tab from a direct press,
   not from the answer to a question. */
function rdExternal(url) {
  uiDialog(`<p class="ask-msg">${esc(t('rd_ext', { url }))}</p><div class="ask-btns"><button type="button" class="btn" data-no>${esc(t('cancel'))}</button><a class="btn primary" data-go href="${esc(url)}" target="_blank" rel="noopener noreferrer"><i class="ti ti-external-link"></i>${esc(t('rd_ext_go'))}</a></div>`,
    (d, done) => { d.querySelector('[data-no]').onclick = () => done(false); d.querySelector('[data-go]').addEventListener('click', () => setTimeout(() => done(true), 0)); d.querySelector('[data-go]').focus(); });
}
function rdKey(e, fromFrame) {
  if (e.target && e.target.matches && e.target.matches('input,textarea,select')) return;
  const k = keyName(e), act = RD.keymap && RD.keymap.get(k);
  if (k === 'Escape') { if (!$('rdSel').hidden) { $('rdSel').hidden = true; RD.sel = null; return; } if (RD.panel) return rdPanelClose(true); e.preventDefault(); rdd().close(); return; }   // one Esc per layer: toolbar, panel, then the book
  if (e.target && e.target.id === 'rdSeek' && /^Arrow(Left|Right|Up|Down)$/.test(e.key)) return;
  if (e.target && e.target.matches && e.target.matches('button') && (e.key === ' ' || e.key === 'Enter')) return;
  if (act) { e.preventDefault(); rdAct(act); }
}
/* a bookmark here, or none: pressing again on the same page takes it away, so one place never holds two */
function rdToggleBookmark(addOnly) {
  const here = rdBmHere();
  if (here) { if (addOnly) return rdOsd(t('rd_bm_dup')); return POS.drop(RD.rec, 'bm', here.id).then(() => { rdOsd(t('rd_bm_off')); rdProgress(); if (RD.panel === 'marks') rdPanelDraw(); }); }
  const pct = Math.round(rdOverall() * 100), nm = (RD.kind === 'pdf' || RD.kind === 'cbz' ? t('rd_page_n', { n:RD.page }) : (RD.chapters[RD.ci].title || '')) + ' · ' + pct + '%';
  return POS.add(RD.rec, 'bm', { v:rdLocNow(), label:nm, note:'' }).then(() => { rdOsd(t('rd_bm_added')); rdProgress(); if (RD.panel === 'marks') rdPanelDraw(); });
}
/* the list under the search box is redrawn without losing the field */
function rdNbRefresh() { const p = $('rdPanel'), keep = $('rdNbQ'), pos = keep.selectionStart; const tmp = document.createElement('div'); tmp.innerHTML = rdNotebookHtml(); p.querySelector('#rdNbList').innerHTML = tmp.querySelector('#rdNbList').innerHTML; p.querySelector('.rd-cnt').textContent = tmp.querySelector('.rd-cnt').textContent; }
function rdAct(id) {
  switch (id) {
    case 'next': rdTurn(1); return; case 'prev': rdTurn(-1); return; case 'nextch': rdChapter(1); return; case 'prevch': rdChapter(-1); return;   // reading: the bars stay as they are
    case 'toc': rdPanelOpen('toc'); break; case 'search': rdPanelOpen('search'); break; case 'marks': rdPanelOpen('marks'); break; case 'look': rdPanelOpen('look'); break;
    case 'mark': rdToggleBookmark(); return;
    case 'bigger': rdSet('size', Math.min(40, RD.s.size + 1), true); rdOsd(t('rd_size') + ' ' + RD.s.size); return; case 'smaller': rdSet('size', Math.max(12, RD.s.size - 1), true); rdOsd(t('rd_size') + ' ' + RD.s.size); return;
    case 'night': { const T = rdTheme(); rdSet('theme', T.ui === 'dark' ? 'day' : 'night', true); return; }
    case 'full': { const d = rdd(); if (document.fullscreenElement) document.exitFullscreen(); else if (d.requestFullscreen) d.requestFullscreen().catch(() => {}); return; }
    case 'keys': plKeysSheet('rd'); return;
  }
  rdShowUi();
}
function rdOsd(text) { const o = $('rdOsd'); o.textContent = text; o.classList.add('on'); clearTimeout(RD.osdTm); RD.osdTm = setTimeout(() => o.classList.remove('on'), 1100); $('rdLive').textContent = text; }
/* The bars belong to the moment you ask for them (a tap in the middle, the pointer at an edge, a button): they show for a few seconds and go. */
function rdShowUi(keep) { const d = rdd(); d.classList.remove('idle'); clearTimeout(RD.hideTm); if (!keep) RD.hideTm = setTimeout(() => { if (!RD.panel && !d.querySelector('.rd-bar:hover,.rd-top:hover') && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('.rd-bar,.rd-top'))) d.classList.add('idle'); }, 3000); }
const rdToggleUi = () => { const d = rdd(); if (d.classList.contains('idle')) rdShowUi(); else { d.classList.add('idle'); clearTimeout(RD.hideTm); } };
const rdClosed = () => { rdPersist(true); AWAKE.off(); $('rdSel').hidden = true; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
function rdWire(d) {
  RD.keymap = rdKeyMap();
  d.addEventListener('click', e => {
    const b = e.target.closest('[data-ract]'); if (b) return rdAct(b.dataset.ract);
    if (e.target.closest('#rdClose')) { d.close(); return; }
    const sw = e.target.closest('[data-hl]'); if (sw) return rdHighlight(sw.dataset.hl);
    if (e.target.closest('[data-hlnote]')) { const h = RD.sel && RD.sel.id ? POS.m(RD.rec).hl.find(x => x.id === RD.sel.id) : null; rdSelDraw('note', h, true); return; }
    if (e.target.closest('[data-notesave]')) { rdNoteSave($('rdSel').querySelector('textarea').value); return; }
    if (e.target.closest('[data-notecancel]')) { $('rdSel').hidden = true; RD.sel = null; return; }
    if (e.target.closest('[data-hldel]')) { if (RD.sel && RD.sel.id) rdHighlightDelete(RD.sel.id); return; }
    if (e.target.closest('[data-hlcopy]')) { const s = RD.sel; if (s && navigator.clipboard) navigator.clipboard.writeText(s.text).then(() => rdOsd(t('rd_copied'))); $('rdSel').hidden = true; return; }
    if (e.target.closest('#rdPic') && (RD.kind === 'cbz' || RD.kind === 'pdf')) { const r = $('rdPic').getBoundingClientRect(), x = (e.clientX - r.left) / r.width; if (x < .25) rdTurn(-1); else if (x > .75) rdTurn(1); else rdToggleUi(); }
  });
  d.addEventListener('close', rdClosed);
  d.addEventListener('keydown', rdKey); d.addEventListener('mousemove', e => { if (e.clientY < 56 || e.clientY > innerHeight - 64) rdShowUi(); });
  d.querySelector('#rdTop').addEventListener('focusin', () => rdShowUi(true)); d.querySelector('#rdBar').addEventListener('focusin', () => rdShowUi(true));
  $('rdSeek').addEventListener('change', async e => {
    const f = Number(e.target.value) / 1000;
    if (RD.kind === 'cbz' || RD.kind === 'pdf') return rdGoLoc(String(Math.max(1, Math.round(f * (RD.pages - 1)) + 1)));
    const tot = rdTotalSize(); let acc = 0, ci = 0, inner = 0; for (let i = 0; i < RD.chapters.length; i++) { const s = RD.chapters[i].size; if (acc + s >= f * tot || i === RD.chapters.length - 1) { ci = i; inner = s ? Math.max(0, Math.min(1, (f * tot - acc) / s)) : 0; break; } acc += s; }
    if (await rdLoadChapter(ci)) { RD.pendingFrac = inner; rdSettle(); }
  });
  $('rdSeek').addEventListener('input', e => { $('rdPct').textContent = Math.round(Number(e.target.value) / 10) + '%'; });
  addEventListener('resize', () => { if (d.open) { clearTimeout(RD.rsTm); RD.rsTm = setTimeout(rdReflow, 200); } });
  rdWirePanel();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && d.open) rdPersist(false); });
  setInterval(() => { if (d.open && document.visibilityState === 'visible') { RD.secs++; if (typeof STAT !== 'undefined') STAT.add('book', 1); } }, 1000);
}
