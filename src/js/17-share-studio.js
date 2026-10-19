/* =====================================================================
   Share studio: preview exactly what leaves the app, edit it, then export
   ===================================================================== */
const SH = { font:'auto', style:'journal', theme:'light', kind:'', id:'', title:'', desc:'', color:'#7c5cff', layout:'grid', inc:{}, ids:[], titles:{}, favIds:[], tagList:[], listIds:[] };
const sdlg = $('sdlg'), shInc = k => SH.inc[k] !== false;
const shTitleOf = m => SH.titles[m.id] != null ? SH.titles[m.id] : m.title;
function scPoster(m) { if (!shInc('cover')) return ''; const cover = safeUrl(m.cover), h = hue(m.title || '?'); return `<div class="sc-po" data-l="${esc([...(m.title || '?')][0].toUpperCase())}" data-h="${h}" style="background-image:${cover ? `url('${esc(cover.replace(/'/g, '%27'))}')` : `linear-gradient(150deg,hsl(${h} 50% 56%),hsl(${(h + 40) % 360} 46% 38%))`}">${cover ? '' : esc([...(m.title || '?')][0].toUpperCase())}</div>`; }
const ce = (k, extra) => `contenteditable="true" spellcheck="false" data-e="${k}" ${extra || ''}`;
function profileLevel(S) { let lv = 0; LEVELS.forEach((x, i) => { if (S.done >= x) lv = i; }); return lv; }
function shCardHtml() {
  if (SH.kind === 'badges') {
    const S = profileStats(), list = BADGES.filter(b => SH.badgeIds.includes(b[0]) && S[b[2]] >= b[3]);
    const x = k => `<button class="sc-x" type="button" data-xk="b:${esc(k)}" title="${esc(t('sh_remove'))}">×</button>`;
    return `<div class="sc-hero"><div class="sc-kick">${esc(t('sh_kick_badges'))}</div><h2 class="sc-t" ${ce('title', `data-ph="${esc(t('sh_name'))}"`)}>${esc(SH.title)}</h2><p class="sc-d" ${ce('desc', `data-ph="${esc(t('sh_desc_ph'))}"`)}>${esc(SH.desc)}</p><div class="sc-meta">${esc(PROFILE.name || t('pf_anon'))} · ${esc(t('lvl_' + profileLevel(S)))}</div></div>
      <div class="sc-badges ${list.length === 1 ? 'one' : ''} ${SH.layout === 'list' ? 'rowsx' : ''} ${shInc('bsize') ? '' : 'small'}">${list.length ? list.map(b => `<div class="sc-bd">${x(b[0])}<div class="sc-bface">${badgeFace(b[0])}</div><div class="sc-bn" ${ce('bn', `data-k="${b[0]}"`)}>${esc((SH.bnames || {})[b[0]] || t('b_' + b[0]))}</div>${shInc('bdesc') ? `<div class="sc-bm">${esc(t('bm_' + b[0], { n:b[3] }))}</div>` : ''}</div>`).join('') : `<div class="sc-empty">${esc(t('sh_badges_none'))}</div>`}</div>`;
  }
  if (SH.kind === 'insights') {
    const data = INS.data || insData(), lay = curLayout().filter(w => !SH.hideW.has(w.id)), fin = data.finished;
    const xb = id => `<button class="sc-x" type="button" data-xk="w:${esc(id)}" title="${esc(t('sh_remove'))}">×</button>`;
    return `<div class="sc-hero"><div class="sc-kick">${esc(t('sh_kick_ins'))}${INS.list ? ' · ' + esc(INS.list === 'fav' ? t('l_fav') : (listById(INS.list) || {}).name) : ''}</div><h2 class="sc-t" ${ce('title', `data-ph="${esc(t('sh_name'))}"`)}>${esc(SH.title)}</h2><p class="sc-d" ${ce('desc', `data-ph="${esc(t('sh_desc_ph'))}"`)}>${esc(SH.desc)}</p><div class="sc-meta">${esc(t('rp_n_fin', { n:fin.length }))}</div></div>
      <div class="sc-wgrid">${lay.map(w => `<div class="sc-wg ${iwSpan(w) >= 5 ? 'wide' : ''}">${xb(w.id)}${widgetHtml(w, data, true)}</div>`).join('')}</div>`;
  }
  if (SH.kind === 'list') {
    const items = SH.ids.map(id => media.find(x => x.id === id)).filter(Boolean);
    const one = m => {
      const sub = [m.creator, m.year].filter(Boolean).join(' · '), tags = shInc('tags') ? (m.genre || []).slice(0, 3).map(g => `<i class="sc-tag">${esc(gname(g))}</i>`).join('') : '';
      const meta = [shInc('status') ? esc(L().status[m.status]) : '', shInc('rating') && m.rating ? '★ ' + m.rating : ''].filter(Boolean).join(' · ');
      return `<div class="sc-it"><button class="sc-x" type="button" data-x="${m.id}" title="${esc(t('sh_remove'))}">×</button>${scPoster(m)}<div class="sc-in"><div class="sc-it-t" ${ce('item', `data-id="${m.id}"`)}>${esc(shTitleOf(m))}</div>${sub ? `<div class="sc-it-s">${esc(sub)}</div>` : ''}${meta ? `<div class="sc-it-s">${meta}</div>` : ''}${tags ? `<div class="sc-tags">${tags}</div>` : ''}</div></div>`;
    };
    return `<div class="sc-hero"><div class="sc-kick">${esc(t('sh_kick_list'))}</div><h2 class="sc-t" ${ce('title', `data-ph="${esc(t('l_name'))}"`)}>${esc(SH.title)}</h2><p class="sc-d" ${ce('desc', `data-ph="${esc(t('sh_desc_ph'))}"`)}>${esc(SH.desc)}</p><div class="sc-meta">${esc(t('lp_items', { n:items.length }))}</div></div><div class="sc-items ${SH.layout} ${shInc('cover') ? '' : 'nocover'}">${items.length ? items.map(one).join('') : `<div class="sc-empty">${esc(t('lp_empty'))}</div>`}</div>`;
  }
  const S = profileStats(), lv = profileLevel(S), initial = esc([...(SH.title || '?')][0].toUpperCase());
  const av = PROFILE.avatar ? `<div class="sc-av" style="background-image:url('${esc(PROFILE.avatar)}')"></div>` : `<div class="sc-av">${initial}</div>`;
  const favs = SH.favIds.map(id => media.find(m => m.id === id)).filter(Boolean), lists = SH.listIds.map(listById).filter(Boolean);
  const x = (k) => `<button class="sc-x" type="button" data-xk="${esc(k)}" title="${esc(t('sh_remove'))}">×</button>`;
  const earned = BADGES.filter(b => S[b[2]] >= b[3] && !(SH.hideBadges && SH.hideBadges.has(b[0])));
  return `<div class="sc-hero sc-id">${av}<div><div class="sc-kick">${esc(t('pf_kicker'))}</div><h2 class="sc-t" ${ce('title', `data-ph="${esc(t('pf_name_ph'))}"`)}>${esc(SH.title)}</h2><p class="sc-d" ${ce('desc', `data-ph="${esc(t('pf_bio_ph'))}"`)}>${esc(SH.desc)}</p><div class="sc-meta">${esc(t('lvl_' + lv))}</div></div></div>
    ${shInc('stats') ? `<div class="sc-stats">${[[S.done, 'pf_s_done'], [S.mins ? fmtRuntime(S.mins) : '—', 'pf_s_time'], [S.fav, 'pf_s_fav'], [S.best, 'pf_s_streak']].map(([v, k]) => `<div><b>${esc(v)}</b><span>${esc(t(k))}</span></div>`).join('')}</div>` : ''}
    ${shInc('favs') && favs.length ? `<div class="sc-sec"><h3>${esc(t('pf_favs'))}</h3><div class="sc-shelf">${favs.map(m => `<div class="sc-fv">${x('fav:' + m.id)}${scPoster(m)}<div class="sc-it-t" ${ce('item', `data-id="${m.id}"`)}>${esc(shTitleOf(m))}</div></div>`).join('')}</div></div>` : ''}
    ${shInc('taste') && SH.tagList.length ? `<div class="sc-sec"><h3>${esc(t('pf_taste'))}</h3><div class="sc-chips">${SH.tagList.map(([g, c]) => `<span class="sc-chip">${esc(gname(g))} <em>${c}</em>${x('tag:' + g)}</span>`).join('')}</div></div>` : ''}
    ${shInc('lists') && lists.length ? `<div class="sc-sec"><h3>${esc(t('pf_lists'))}</h3><div class="sc-chips">${lists.map(l => `<span class="sc-chip" style="--lc:${esc(l.color)}"><i class="sc-dot"></i>${esc(l.name)} <em>${listCount(l.id)}</em>${x('list:' + l.id)}</span>`).join('')}</div></div>` : ''}
    ${shInc('badges') && earned.length ? `<div class="sc-sec"><h3>${esc(t('pf_badges'))}</h3><div class="sc-chips">${earned.map(b => `<span class="sc-chip">${esc(t('b_' + b[0]))}${x('badge:' + b[0])}</span>`).join('')}</div></div>` : ''}`;
}
/* a font choice that looks exactly like another one on this device is not a choice: only distinct ones are offered */
let SH_FONT_OK = null;
const SH_TPL_FONT = { journal:'serif', poster:'sans', ticket:'mono', mosaic:'sans' };      // what "Template's own" means for each template (kept in step with the data-st rules in share css)
async function shMeasureFonts() {
  if (SH_FONT_OK) return;
  try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  const cx = document.createElement('canvas').getContext('2d'), seen = new Set(), ok = [];
  ['serif', 'sans', 'kai', 'brush', 'mono'].forEach(k => {
    const el = document.createElement('div'); el.className = 'sc'; el.dataset.ft = k; el.style.cssText = 'position:absolute;left:-9999px;top:0'; el.innerHTML = '<h2 class="sc-t">x</h2>'; document.body.appendChild(el);
    const ff = getComputedStyle(el.firstChild).fontFamily; el.remove(); cx.font = `48px ${ff}`; const sig = Math.round(cx.measureText('Aa光影 Quiet evenings mmmm').width * 10);
    if (!seen.has(sig)) { seen.add(sig); ok.push(k); }
  });
  SH_FONT_OK = ok; if (sdlg.open) { const sc = $('shOpts').scrollTop; $('shOpts').innerHTML = shOptsHtml(); shCp = colorPicker($('shC'), () => SH.color, v => { SH.color = v; $('shCard').style.setProperty('--ac', v); }); $('shOpts').scrollTop = sc; }
}
function renderShare() { const c = $('shCard'); c.innerHTML = shCardHtml(); c.style.setProperty('--ac', SH.color); c.dataset.ft = SH.font; c.dataset.st = SH.style; c.dataset.th = SH.theme; }
const shLookOpts = () => `<div class="fld"><span>${esc(t('sh_font'))}</span><div class="optchips">${[['auto', 'sf_auto'], ['serif', 'sf_serif'], ['sans', 'sf_sans'], ['kai', 'sf_kai'], ['brush', 'sf_brush'], ['mono', 'sf_mono']].filter(([k]) => k === 'auto' || !SH_FONT_OK || SH_FONT_OK.includes(k) || SH.font === k).map(([k, l]) => `<button type="button" class="optchip" data-opt="font" data-v="${k}" data-ft="${k}" aria-pressed="${SH.font === k}"><b>Aa 字</b><span>${esc(k === 'auto' ? t(l) + ' · ' + t('sf_' + SH_TPL_FONT[SH.style]) : t(l))}</span></button>`).join('')}</div></div>
    <div class="fld"><span>${esc(t('sh_style'))}</span><div class="optchips">${[['journal', 'sst_journal'], ['poster', 'sst_poster'], ['ticket', 'sst_ticket'], ['mosaic', 'sst_mosaic']].map(([k, l]) => `<button type="button" class="optchip" data-opt="style" data-v="${k}" aria-pressed="${SH.style === k}"><span>${esc(t(l))}</span></button>`).join('')}</div></div>
    <div class="fld"><span>${esc(t('sh_theme'))}</span><div class="optchips">${[['light', 'st_light', '#fffdf8'], ['sepia', 'st_sepia', '#f4e9d2'], ['dark', 'st_dark', '#17161b'], ['tint', 'st_tint', 'color-mix(in srgb,' + SH.color + ' 18%,#fff)']].map(([k, l, c]) => `<button type="button" class="optchip" data-opt="theme" data-v="${k}" aria-pressed="${SH.theme === k}"><i class="oc-dot" style="background:${c}"></i><span>${esc(t(l))}</span></button>`).join('')}</div></div>`;
function shOptsHtml() {
  const chk = (k, lab) => `<label class="shchk"><input type="checkbox" data-inc="${k}" ${shInc(k) ? 'checked' : ''}><span>${esc(t(lab))}</span></label>`;
  const list = SH.kind === 'list', ins = SH.kind === 'insights';
  if (SH.kind === 'badges') { const S = profileStats(); return `<label class="fld"><span>${esc(t('sh_name'))}</span><input type="text" id="shT" value="${esc(SH.title)}" maxlength="60" autocomplete="off"></label><label class="fld"><span>${esc(t('l_desc'))}</span><textarea id="shD" rows="3" maxlength="300">${esc(SH.desc)}</textarea></label><div class="fld"><span>${esc(t('sh_accent'))}</span><div id="shC"></div></div>${shLookOpts()}<div class="fld"><span>${esc(t('sh_layout'))}</span><div class="vseg" id="shLayout">${[['grid', 'layout-grid', 'lv_posters'], ['list', 'list', 'lv_rows']].map(([k, ic, lab]) => `<button type="button" data-v="${k}" aria-pressed="${SH.layout === k}"><i class="ti ti-${ic}"></i><span>${esc(t(lab))}</span></button>`).join('')}</div></div><div class="fld"><span>${esc(t('sh_show'))}</span><div class="shchks"><label class="shchk"><input type="checkbox" data-inc="bdesc" ${shInc('bdesc') ? 'checked' : ''}><span>${esc(t('sh_bdesc'))}</span></label><label class="shchk"><input type="checkbox" data-inc="bsize" ${shInc('bsize') ? 'checked' : ''}><span>${esc(t('sh_bsize'))}</span></label></div></div><div class="fld"><span>${esc(t('sh_badges_pick'))}</span><div class="shchks">${BADGES.filter(b => S[b[2]] >= b[3]).map(b => `<label class="shchk"><input type="checkbox" data-bid="${b[0]}" ${SH.badgeIds.includes(b[0]) ? 'checked' : ''}><span>${esc(t('b_' + b[0]))}</span></label>`).join('') || esc(t('sh_badges_none'))}</div></div>`; }
  if (ins) return `<label class="fld"><span>${esc(t('sh_name'))}</span><input type="text" id="shT" value="${esc(SH.title)}" maxlength="60" autocomplete="off"></label><label class="fld"><span>${esc(t('l_desc'))}</span><textarea id="shD" rows="3" maxlength="300">${esc(SH.desc)}</textarea></label><div class="fld"><span>${esc(t('sh_accent'))}</span><div id="shC"></div></div>${shLookOpts()}<div class="fld"><span>${esc(t('sh_widgets'))}</span><div class="shchks">${curLayout().map(w => `<label class="shchk"><input type="checkbox" data-wid="${esc(w.id)}" ${SH.hideW.has(w.id) ? '' : 'checked'}><span>${esc(iwTitle(w))}</span></label>`).join('')}</div></div>`;
  return `<label class="fld"><span>${esc(t(list ? 'sh_name' : 'sh_pname'))}</span><input type="text" id="shT" value="${esc(SH.title)}" maxlength="60" autocomplete="off"></label>
    <label class="fld"><span>${esc(t(list ? 'l_desc' : 'sh_bio'))}</span><textarea id="shD" rows="3" maxlength="300">${esc(SH.desc)}</textarea></label>
    <div class="fld"><span>${esc(t('sh_accent'))}</span><div id="shC"></div></div>
    ${shLookOpts()}

    ${list ? `<div class="fld"><span>${esc(t('sh_layout'))}</span><div class="vseg" id="shLayout">${[['grid', 'layout-grid', 'lv_posters'], ['list', 'list', 'lv_rows']].map(([k, ic, lab]) => `<button type="button" data-v="${k}" aria-pressed="${SH.layout === k}"><i class="ti ti-${ic}"></i><span>${esc(t(lab))}</span></button>`).join('')}</div></div>
      <div class="fld"><span>${esc(t('sh_show'))}</span><div class="shchks">${chk('cover', 'tc_cover')}${chk('status', 'm_status')}${chk('rating', 'm_rating')}${chk('tags', 'tags_label')}</div></div>`
    : `<div class="fld"><span>${esc(t('sh_show'))}</span><div class="shchks">${chk('stats', 'sh_stats')}${chk('cover', 'tc_cover')}${chk('favs', 'pf_favs')}${chk('taste', 'pf_taste')}${chk('lists', 'pf_lists')}${chk('badges', 'pf_badges')}</div></div>`}`;
}
let shCp = null;
function openShare(kind, id) {
  closeMenu(); SH.font = 'auto'; SH.style = 'journal'; SH.theme = 'light'; SH.kind = kind; SH.id = id || ''; SH.titles = {}; SH.inc = {}; SH.hideBadges = null;
  if (kind === 'badges') { const S = profileStats(); SH.bnames = {}; Object.assign(SH, { badgeIds:id ? [id] : BADGES.filter(b => S[b[2]] >= b[3]).map(b => b[0]), title:id ? t('b_' + id) : t('pf_badges'), desc:'', color:'#b8892f' }); }
  else if (kind === 'insights') { SH.hideW = new Set(); Object.assign(SH, { title:insLabel(), desc:'', color:'#4f6bd8' }); }
  else if (kind === 'list') { const l = listOf(id); if (!l) return; if (listView(id).cover === false) SH.inc.cover = false; Object.assign(SH, { title:l.name, desc:l.desc || '', color:l.color, layout:'grid', ids:sortedItems(listItems(id)).map(m => m.id) }); }
  else {
    const favs = media.filter(m => m.fav).sort((a, b) => (b.rating || 0) - (a.rating || 0) || b.addedAt - a.addedAt).slice(0, 12);
    Object.assign(SH, { title:PROFILE.name || t('pf_anon'), desc:PROFILE.bio || '', color:'#b8892f', favIds:favs.map(m => m.id), tagList:topNames(media, m => m.genre || [], 10), listIds:LISTS.map(l => l.id) });
  }
  $('shTitle').textContent = t(kind === 'list' ? 'sh_title_list' : kind === 'insights' ? 'sh_title_ins' : kind === 'badges' ? 'sh_title_badges' : 'sh_title_pf'); $('shHint').textContent = t('sh_edit_hint');
  $('shOpts').innerHTML = shOptsHtml(); shCp = colorPicker($('shC'), () => SH.color, v => { SH.color = v; $('shCard').style.setProperty('--ac', v); });
  $('shFoot').innerHTML = `<button class="btn primary" data-sh="png"><i class="ti ti-photo-down"></i>${esc(t('sh_dl_png'))}</button><button class="btn" data-sh="html"><i class="ti ti-download"></i>${esc(t('sh_dl_html'))}</button>${kind === 'list' ? `<button class="btn" data-sh="json"><i class="ti ti-file-export"></i>${esc(t('sh_dl_json'))}</button>` : ''}<button class="btn" data-sh="copy"><i class="ti ti-copy"></i>${esc(t('lp_copy'))}</button>`;       // closing is the × in the header; a second Close here repeated it
  renderShare(); sdlg.dataset.pane = 'prev'; $$('#shPane button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === 'prev')); sdlg.showModal(); $('shX').blur(); shMeasureFonts();
}
function shCleanHtml() {
  const c = $('shCard').cloneNode(true); c.querySelectorAll('.sc-x').forEach(x => x.remove());
  c.querySelectorAll('[contenteditable]').forEach(x => ['contenteditable', 'spellcheck', 'data-e', 'data-ph', 'data-id'].forEach(a => x.removeAttribute(a)));
  c.removeAttribute('id'); return c.outerHTML;
}
/* Save the card as a picture. The card's own markup and share css go into an SVG <foreignObject>, which the browser draws onto a canvas.
   Pictures from the web are fetched and inlined first (an SVG used as an image may not load anything itself); ones the server will not
   hand over are left out and the card says so. Web fonts cannot travel inside it, so the picture uses the fonts this device has. */
const SH_IMG_W = 820, SH_IMG_MAX_PX = 16e6;
async function shInline(root) {
  let missed = 0; const seen = new Map();
  /* fetch the picture and redraw it at most 640 px wide as a JPEG: smaller, always a format the canvas understands, and decoded before the card is drawn */
  const grab = url => { if (!seen.has(url)) seen.set(url, fetch(url, { mode:'cors' }).then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); }).then(async b => {
    if (!/^image\//.test(b.type)) throw new Error('not a picture'); const bmp = await createImageBitmap(b), k = Math.min(1, 640 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', .86); })); return seen.get(url); };
  for (const el of root.querySelectorAll('[style*="url("]')) {
    const style = el.getAttribute('style'), m = style.match(/url\((['"]?)(https?:[^'")]+)\1\)/); if (!m) continue;
    try { el.setAttribute('style', style.replace(m[2], await grab(m[2]))); }
    catch (e) { missed++; const h = Number(el.dataset.h) || 40; el.style.backgroundImage = `linear-gradient(150deg,hsl(${h} 50% 56%),hsl(${(h + 40) % 360} 46% 38%))`; if (el.dataset.l && !el.textContent.trim()) el.textContent = el.dataset.l; }       // same placeholder the card shows for a work without a cover
  }
  return missed;
}
async function shImage(btn) {
  btn.disabled = true; const host = document.createElement('div'); host.className = 'sc-img'; host.style.cssText = `position:fixed;left:-99999px;top:0;width:${SH_IMG_W}px`; host.innerHTML = shCleanHtml(); document.body.appendChild(host);
  try {
    const missed = await shInline(host), w = SH_IMG_W, h = Math.ceil(host.getBoundingClientRect().height);
    const clone = host.cloneNode(true); clone.style.cssText = `width:${w}px;margin:0`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%"><style xmlns="http://www.w3.org/1999/xhtml"><![CDATA[${$('share-css').textContent}]]></style>${new XMLSerializer().serializeToString(clone)}</foreignObject></svg>`;
    const img = new Image(); img.src = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(new Blob([svg], { type:'image/svg+xml' })); }); await img.decode();      // a data: address; a blob: one would mark the canvas as tainted
    await new Promise(r => setTimeout(r, 120));      // pictures inside an SVG load a moment after the SVG itself; drawing at once can leave them blank
    const k = Math.min(2, Math.sqrt(SH_IMG_MAX_PX / (w * h))), c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k); const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height); await new Promise(r => setTimeout(r, 150)); g.clearRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);      // twice: the first draw can still miss pictures that are loading
    const blob = await new Promise(res => c.toBlob(res, 'image/png')); if (!blob) throw new Error('empty');
    download(`${SH.kind === 'list' ? 'list' : SH.kind === 'insights' ? 'insights' : SH.kind === 'badges' ? 'badges' : 'card'}-${(SH.title || 'share').replace(/[^\w一-鿿-]+/g, '_').slice(0, 40) || 'share'}-${stamp()}.png`, blob, 'image/png');
    if (missed) toast(t('sh_png_missed', { n:missed }));
  } catch (e) { toast(t('sh_png_fail'), true); } finally { host.remove(); btn.disabled = false; }
}
function shText() {
  if (SH.kind === 'badges') return [SH.title, SH.desc, ...SH.badgeIds.map(k => '• ' + ((SH.bnames || {})[k] || t('b_' + k)))].filter(Boolean).join('\n');
  if (SH.kind === 'insights') { const d = INS.data || insData(); return [SH.title, SH.desc, t('rp_n_fin', { n:d.finished.length }), ...kindRows(d.finished).map(r => `${L().types[r.k] || r.k}: ${r.n}${r.text ? ' · ' + r.text : ''}`)].filter(Boolean).join('\n'); }
  if (SH.kind === 'list') {
    const items = SH.ids.map(id => media.find(m => m.id === id)).filter(Boolean);
    return [SH.title, SH.desc].filter(Boolean).join('\n') + '\n\n' + items.map((m, i) => `${i + 1}. ${shTitleOf(m)}${m.year ? ' (' + m.year + ')' : ''}${m.creator ? ' — ' + m.creator : ''}`).join('\n');
  }
  const S = profileStats(), favs = SH.favIds.map(id => media.find(m => m.id === id)).filter(Boolean);
  return [SH.title + ' — ' + t('lvl_' + profileLevel(S)), SH.desc, shInc('stats') ? `${t('pf_s_done')}: ${S.done}` : '', shInc('favs') && favs.length ? t('pf_favs') + ': ' + favs.map(shTitleOf).join(' / ') : '', shInc('taste') && SH.tagList.length ? t('pf_taste') + ': ' + SH.tagList.map(([g]) => gname(g)).join(' · ') : ''].filter(Boolean).join('\n');
}
function shDownload(kind) {
  const safe = (SH.title || 'share').replace(/[^\w一-鿿-]+/g, '_').slice(0, 40) || 'share';
  if (kind === 'html') return download(`${SH.kind === 'list' ? 'list' : SH.kind === 'insights' ? 'insights' : SH.kind === 'badges' ? 'badges' : 'card'}-${safe}-${stamp()}.html`, `<!doctype html><html lang="${prefs.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(SH.title)}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Noto+Serif+SC:wght@400;500&family=Ma+Shan+Zheng&family=Jost:wght@300&display=swap"><style>${$('share-css').textContent}</style></head><body class="sc-page">${shCleanHtml()}</body></html>`, 'text/html');
  const items = SH.ids.map(id => media.find(m => m.id === id)).filter(Boolean);
  download(`list-${safe}-${stamp()}.json`, JSON.stringify({ app:'media-tracker-list', version:1, exported:new Date().toISOString(), list:{ name:SH.title.trim() || t('l_new'), desc:SH.desc.trim(), color:SH.color }, items:items.map(m => ({ ...Object.fromEntries(SHARE_FIELDS.map(k => [k, m[k] == null ? '' : m[k]])), title:shTitleOf(m).trim() || m.title })) }), 'application/json');
}
$('shX').onclick = () => sdlg.close();
sdlg.addEventListener('click', async e => {
  if (e.target === sdlg) return sdlg.close();
  const b = e.target.closest('[data-sh]'); if (b) { const k = b.dataset.sh; if (k === 'close') sdlg.close(); else if (k === 'copy') copyText(shText()); else if (k === 'png') shImage(b); else shDownload(k); return; }
  const op = e.target.closest('[data-opt]'); if (op) { SH[op.dataset.opt] = op.dataset.v; $$('[data-opt="' + op.dataset.opt + '"]', $('shOpts')).forEach(x => x.setAttribute('aria-pressed', x === op)); if (op.dataset.opt === 'style') { const au = $('shOpts').querySelector('[data-opt="font"][data-v="auto"] span'); if (au) au.textContent = t('sf_auto') + ' · ' + t('sf_' + SH_TPL_FONT[SH.style]); } return renderShare(); }
  const lay = e.target.closest('#shLayout [data-v]'); if (lay) { SH.layout = lay.dataset.v; $$('#shLayout button').forEach(x => x.setAttribute('aria-pressed', x === lay)); return renderShare(); }
  const x = e.target.closest('[data-x]'); if (x) { SH.ids = SH.ids.filter(id => id !== Number(x.dataset.x)); return renderShare(); }
  const xk = e.target.closest('[data-xk]'); if (xk) { const [k, v] = xk.dataset.xk.split(/:(.*)/s); if (k === 'fav') SH.favIds = SH.favIds.filter(id => id !== Number(v)); else if (k === 'tag') SH.tagList = SH.tagList.filter(([g]) => g !== v); else if (k === 'list') SH.listIds = SH.listIds.filter(id => id !== v); else if (k === 'badge') (SH.hideBadges = SH.hideBadges || new Set()).add(v); else if (k === 'w') SH.hideW.add(v); else if (k === 'b') SH.badgeIds = SH.badgeIds.filter(x => x !== v); return renderShare(); }
});
sdlg.addEventListener('change', e => { if (e.target.dataset.bid) { const k = e.target.dataset.bid; SH.badgeIds = e.target.checked ? [...new Set([...SH.badgeIds, k])] : SH.badgeIds.filter(x => x !== k); return renderShare(); } if (e.target.dataset.wid) { e.target.checked ? SH.hideW.delete(e.target.dataset.wid) : SH.hideW.add(e.target.dataset.wid); return renderShare(); } const k = e.target.dataset.inc; if (k) { SH.inc[k] = e.target.checked; renderShare(); } });
sdlg.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'shT') { SH.title = el.value; const h = $('shCard').querySelector('[data-e="title"]'); if (h) h.textContent = SH.title; }
  else if (el.id === 'shD') { SH.desc = el.value; const h = $('shCard').querySelector('[data-e="desc"]'); if (h) h.textContent = SH.desc; }
  else if (el.dataset && el.dataset.e) {                       // typing directly into the preview
    const v = el.textContent.replace(/\n/g, ' ');
    if (el.dataset.e === 'title') { SH.title = v; $('shT').value = v; } else if (el.dataset.e === 'desc') { SH.desc = el.textContent; $('shD').value = el.textContent; } else if (el.dataset.e === 'item') SH.titles[Number(el.dataset.id)] = v; else if (el.dataset.e === 'bn') (SH.bnames = SH.bnames || {})[el.dataset.k] = v;
  }
});
sdlg.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.e && e.target.dataset.e !== 'desc') { e.preventDefault(); e.target.blur(); } });
sdlg.addEventListener('paste', e => { if (e.target.dataset && e.target.dataset.e) { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); } });


$('shPane').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; sdlg.dataset.pane = b.dataset.v; $$('#shPane button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
