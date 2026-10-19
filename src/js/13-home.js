/* =====================================================================
   Home · Surprise (what suits this moment), continue list, overview
   Surprise: you describe the moment (mood, occasion, atmosphere, festival, and under "More moments" era, place, weather, age); each
   candidate in the pool gets a fit for it (js/13a-moments.js) and the usual gentle weights (waiting, favourite, variety, skips);
   one of the best few is drawn, and the sentence under it says why. No game, no spinning: the card fades in.
   ===================================================================== */
const PK = { list:'', autoIds:null, src:new Set(['want']), moment:{}, strict:Number(store.get('vmm.pkstrict', '2')) || 2, more:store.get('vmm.pkmore', '') === '1', cur:null, alts:[], why:'', skipped:new Set(), drawn:false };
const SRC = { any:m => true, fav:m => m.fav, want:m => m.status === 'want', revisit:m => m.status === 'done' && (m.rating || 0) >= 4, second:m => m.status === 'dropped', doing:m => m.status === 'doing' };
const PK_POWER = { 1:1, 2:2, 3:4 };                                    // how hard the fit counts: a hint, balanced, must fit
function pkPool() { return media.filter(m => [...PK.src].some(s => SRC[s](m)) && (!PK.list || (m.lists || []).includes(PK.list)) && (!PK.autoIds || PK.autoIds.has(m.id)) && !PK.skipped.has(m.id)); }
/* the moment in force: what you picked; for a facet you have not touched, what the app can tell (the evening, a festival this week) */
function pkMoment() { const auto = pkAuto(), o = {}; MFACETS.forEach(f => { const v = PK.moment[f] !== undefined ? PK.moment[f] : auto[f]; if (v) o[f] = v; }); return o; }
const mvLabel = (f, v) => t('mv_' + f + '_' + v);
const pkAutoOn = () => store.get('vmm.pkauto', '1') !== '0';
const pkAuto = () => pkAutoOn() ? momentAuto() : {};
/* the full set of choices (the sheet) */
function fitHtml() {
  const mo = pkMoment(), auto = pkAuto(), vals = f => Object.keys(f === 'era' ? MERA : MVALUES[f]);
  const row = f => `<div class="mf" data-f="${f}"><span class="mf-l">${esc(t('mf_' + f))}</span><div class="mf-c" role="group" aria-label="${esc(t('mf_' + f))}">${vals(f).map(v => `<button type="button" class="chip ${auto[f] === v && PK.moment[f] === undefined ? 'auto' : ''}" data-mf="${f}" data-v="${v}" aria-pressed="${mo[f] === v}">${esc(mvLabel(f, v))}</button>`).join('')}</div></div>`;
  const cnt = k => media.filter(SRC[k]).length;
  return `<div class="dt-h"><h2>${esc(t('pk_fit'))}</h2><span class="dt-n2">${esc(t('pk_fit_d'))}</span><button type="button" class="ibtn" data-no aria-label="${esc(t('sh_close'))}"><i class="ti ti-x"></i></button></div>
    <div class="fit-body">${MFACETS.map(row).join('')}
    <div class="mf mf-pool"><span class="mf-l">${esc(t('pk_from'))}</span><div class="mf-c">${['want', 'doing', 'revisit', 'second'].map(k => `<button type="button" class="chip" data-s="${k}" aria-pressed="${PK.src.has(k)}">${esc(t('src_' + k))} <b>${cnt(k)}</b></button>`).join('')}</div></div>
    <div class="mf mf-str"><span class="mf-l">${esc(t('pk_strict'))}</span><div class="seg" role="group">${[1, 2, 3].map(k => `<button type="button" data-strict="${k}" aria-pressed="${PK.strict === k}">${esc(t('pk_strict_' + k))}</button>`).join('')}</div></div></div>
    <div class="dt-f"><button type="button" class="btn sm" data-reset>${esc(t('pk_reset_m'))}</button><button type="button" class="btn primary sm" data-no>${esc(t('pk_done'))}</button></div>`;
}
/* Home shows one button; what you chose or what the date suggests is a line of small chips */
function renderPickControls() {
  const mo = pkMoment(), auto = pkAuto(), scope = PK.autoIds ? t('pk_from_auto') : PK.list ? ((listById(PK.list) || {}).name || '') : '';
  if (PK.list && !listById(PK.list)) PK.list = '';
  const chips = MFACETS.filter(f => mo[f]).map(f => `<span class="mchip ${auto[f] === mo[f] && PK.moment[f] === undefined ? 'auto' : ''}">${esc(mvLabel(f, mo[f]))}<button type="button" data-drop="${f}" aria-label="${esc(t('pk_clear_scope'))}">×</button></span>`).join('') + (scope ? `<span class="mchip">${esc(scope)}<button type="button" data-clear-scope aria-label="${esc(t('pk_clear_scope'))}">×</button></span>` : '');
  $('pkMoment').innerHTML = `<div class="mf-go"><button type="button" class="btn primary" id="pkGo"><i class="ti ti-sparkles"></i>${esc(t(PK.drawn ? 'pk_again' : 'pk_find'))}</button><button type="button" class="linkbtn" id="pkFit"><i class="ti ti-adjustments-horizontal"></i><span>${esc(t('pk_fit'))}</span></button></div>${chips ? `<div class="mchips" aria-label="${esc(t('pk_why_h'))}">${chips}</div>` : ''}`;
}
function stageIdle(msg) { PK.cur = null; $('pkStage').innerHTML = `<div class="pk-hint">${esc(msg || t('pk_hint'))}</div>`; }
function stageEmpty(msg) { PK.cur = null; $('pkStage').innerHTML = `<div class="pick-empty"><i class="ti ti-moon-stars"></i>${esc(msg)}</div>`; }
function resultHtml(x, hint) {
  const m = x.m, why = [...x.hits.map(([f, v]) => `<span class="why-chip">${esc(mvLabel(f, v))}</span>`)].join('');
  return `<div class="mres">${hint ? `<div class="mres-hint"><i class="ti ti-info-circle"></i>${esc(hint)}</div>` : ''}<div class="res">${posterHtml(m, false)}<div class="res-body"><div class="res-name">${esc(m.title)}</div><div class="res-meta">${esc([L().types[m.type], m.creator, m.year, fmtRuntime(m.runtime)].filter(Boolean).join(' · '))}</div>
    ${why ? `<div class="why-chips" aria-label="${esc(t('pk_why_h'))}">${why}</div>` : ''}${PK.why ? `<div class="why"><i class="ti ti-info-circle"></i>${esc(PK.why)}</div>` : ''}
    <div class="row-btns"><button class="btn primary sm" data-pk="start"><i class="ti ti-player-play"></i>${esc(t('pk_start'))}</button><button class="btn sm" data-pk="skip"><i class="ti ti-arrow-forward-up"></i>${esc(t('pk_notnow'))}</button><button class="btn sm" data-pk="open" aria-label="${esc(t('pk_open'))}"><i class="ti ti-external-link"></i></button></div></div></div>
    ${PK.alts.length ? `<div class="mres-alts"><span>${esc(t('pk_or'))}</span>${PK.alts.map((a, i) => `<button type="button" class="linkbtn" data-alt="${i}">${esc(a.m.title)}</button>`).join('')}</div>` : ''}</div>`;
}
/* How the draw weighs a candidate (js/13a-moments.js gives the fit; these are the rest):
     waiting    the longer it has sat in your list the likelier it is (gently: at most 2.5×)
     favourite  a small nudge for what you hearted (1.25×)
     variety    not the same kind as your last two picks (0.6× per repeat)
     patience   skipped before? less likely each time (÷ 1 + skips) */
const PK_HIST = { get() { try { return JSON.parse(store.get('vmm.pkhist', '')) || {}; } catch (e) { return {}; } }, set(h) { store.set('vmm.pkhist', JSON.stringify(h)); } };
function pkWeights(pool) {
  const h = PK_HIST.get(), recent = (h.recent || []).slice(-2), skips = h.skips || {}, now = Date.now();
  return pool.map(m => { const days = (now - (m.addedAt || now)) / 864e5, f = { wait:1 + Math.min(1.5, days / 120), fav:m.fav ? 1.25 : 1, vary:Math.pow(.6, recent.filter(x => x === m.type).length), skip:1 / (1 + (skips[m.id] || 0)) }; return { m, w:f.wait * f.fav * f.vary * f.skip, f, days }; });
}
function pkWhy(x) {
  const f = x.f, d = Math.round(x.days);
  if (f.wait >= 1.6) return t('pk_why_wait', { when:d >= 60 ? t('pk_months', { n:Math.round(d / 30) }) : t('pk_days', { n:d }) });
  if (f.fav > 1) return t('pk_why_fav');
  return '';
}
function pkDraw() {
  const pool = pkPool(); if (!pool.length) { PK.drawn = true; renderPickControls(); return stageEmpty(t('pk_none')); }
  const mo = pkMoment(), pw = PK_POWER[PK.strict] || 2, n = Object.keys(mo).length;
  const scored = pkWeights(pool).map(x => { const r = momentFit(x.m, mo); return { ...x, fit:r.fit, hits:r.hits, score:Math.pow(Math.max(.03, r.fit), pw) * x.w }; }).sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 8); let r = Math.random() * top.reduce((a, x) => a + x.score, 0), hit = top[top.length - 1]; for (const x of top) { r -= x.score; if (r <= 0) { hit = x; break; } }
  PK.alts = top.filter(x => x !== hit).slice(0, 2); PK.cur = hit; PK.why = pkWhy(hit); PK.drawn = true;
  const unknown = n ? scored.filter(x => !(x.m.genre || []).length).length : 0;
  const hint = !n ? t('pk_no_moment') : hit.fit < .35 ? t('pk_weak') : unknown > pool.length / 2 ? t('pk_untagged', { n:unknown, m:pool.length }) : '';
  $('pkStage').innerHTML = resultHtml(hit, hint); renderPickControls();
}
function pkChoose(e) {                                                  // the chips and switches of the sheet
  const chip = e.target.closest('[data-mf]'); if (chip) { const f = chip.dataset.mf, v = chip.dataset.v; PK.moment[f] = pkMoment()[f] === v ? '' : v; return true; }
  const src = e.target.closest('[data-s]'); if (src) { const k = src.dataset.s; PK.src.has(k) ? PK.src.delete(k) : PK.src.add(k); if (!PK.src.size) PK.src.add('want'); PK.autoIds = null; return true; }
  const st = e.target.closest('[data-strict]'); if (st) { PK.strict = Number(st.dataset.strict); store.set('vmm.pkstrict', String(PK.strict)); return true; }
  if (e.target.closest('[data-reset]')) { PK.moment = {}; MFACETS.forEach(f => { PK.moment[f] = ''; }); PK.list = ''; PK.autoIds = null; PK.src = new Set(['want']); return true; }
  return false;
}
$('pkMoment').addEventListener('click', e => {
  const drop = e.target.closest('[data-drop]'); if (drop) { PK.moment[drop.dataset.drop] = ''; return renderPickControls(); }
  if (e.target.closest('[data-clear-scope]')) { PK.list = ''; PK.autoIds = null; PK.src = new Set(['want']); return renderPickControls(); }
  if (e.target.closest('#pkFit')) return uiDialog(fitHtml(), (d, done) => { d.classList.add('fit'); d.addEventListener('click', ev => { if (ev.target.closest('[data-no]')) return done(null); if (pkChoose(ev)) { const sc = d.querySelector('.fit-body').scrollTop; d.innerHTML = fitHtml(); d.querySelector('.fit-body').scrollTop = sc; renderPickControls(); } }); }).then(renderPickControls);
  if (e.target.closest('#pkGo')) pkDraw();
});
$('pkStage').addEventListener('click', async e => {
  const alt = e.target.closest('[data-alt]'); if (alt) { const a = PK.alts[Number(alt.dataset.alt)]; if (a) { PK.alts = [PK.cur, ...PK.alts.filter(x => x !== a)].slice(0, 2); PK.cur = a; PK.why = pkWhy(a); $('pkStage').innerHTML = resultHtml(a, ''); } return; }
  const b = e.target.closest('[data-pk]'); if (!b || !PK.cur) return; const m = PK.cur.m;
  if (b.dataset.pk === 'start') { pkRemember(m, true); PK.cur = null; PK.drawn = false; await setStatus(m.id, 'doing'); toast(t('q_start') + ' · ' + m.title); stageIdle(); renderPickControls(); }
  else if (b.dataset.pk === 'skip') { pkSkipped(m); PK.skipped.add(m.id); pkDraw(); }
  else if (b.dataset.pk === 'open') openMedia(m.id);
});
const pkRemember = (m, started) => { const h = PK_HIST.get(); h.recent = [...(h.recent || []), m.type].slice(-6); h.skips = h.skips || {}; if (started) delete h.skips[m.id]; PK_HIST.set(h); };
const pkSkipped = m => { const h = PK_HIST.get(); h.skips = h.skips || {}; h.skips[m.id] = (h.skips[m.id] || 0) + 1; PK_HIST.set(h); };

/* ---- continue ---- */
let contAll = false;
function renderContinue() {
  const doing = media.filter(m => m.status === 'doing').sort((a, b) => (b.startedAt || b.addedAt) - (a.startedAt || a.addedAt));
  /* files you stopped in that are not on the tracker: they still deserve a way back (v18) */
  const trackedSigs = new Set(media.filter(m => m.status !== 'want').map(m => { const f = fileOfMedia(m); return f ? f.sig : m.fileSig; }).filter(Boolean));
  const loose = (typeof POS !== 'undefined' ? files.filter(f => { const p = POS.get(f); return p && p.p > 0 && p.p < .97 && !trackedSigs.has(f.sig); }).sort((a, b) => POS.get(b).at - POS.get(a).at).slice(0, 5) : []);
  $('contSub').textContent = doing.length || loose.length ? t('ct_sub', { n:doing.length + loose.length }) : t('continue_none');
  const resume = f => f ? `<button class="qbtn" data-resume="${f.id}"><i class="ti ti-${fileVerbIcon(f)}"></i>${esc(t('fp_resume'))}${resumeLabel(f) ? ' · ' + esc(resumeLabel(f)) : ''}</button>` : '';
  const item = m => { const f = fileOfMedia(m); return `<div class="cont-item glass" data-id="${m.id}">${posterHtml(m, false)}<div class="grow"><div class="tt">${esc(m.title)}</div><div class="msub"><span class="prog" ${f ? '' : 'data-prog'}>${esc(progressOf(m) || [L().types[m.type], m.creator].filter(Boolean).join(' · ') || '+')}</span></div></div>${resume(f)}<button class="qbtn" data-qa="finish"><i class="ti ti-check"></i>${esc(t('q_finish'))}</button></div>`; };
  const looseItem = f => `<div class="cont-item glass" data-fid="${f.id}">${filePoster(f)}<div class="grow"><div class="tt">${esc(f.titleCn || f.titleEn || f.fileName)}</div><div class="msub"><span>${esc([L().types[f.kind], f.director].filter(Boolean).join(' · '))}</span></div></div>${resume(f)}</div>`;
  const any = doing.length + loose.length;
  $('hsCont').hidden = !any; document.querySelector('#hdots [data-go="1"]').hidden = !any;      // nothing in progress: no empty shelf, the Surprise moves up
  if (!any) return $('contBox').innerHTML = '';
  const LIM = 5; let html;
  if (doing.length <= LIM || !contAll) html = `<div class="cont-list">${doing.slice(0, contAll ? doing.length : LIM).map(item).join('')}</div>`;
  else { const gs = new Map(); doing.forEach(m => (gs.get(m.type) || gs.set(m.type, []).get(m.type)).push(m)); html = [...gs].map(([k, arr]) => `<section class="grp ${TS.collapsed.has('c:' + k) ? 'collapsed' : ''}" data-gk="c:${k}"><div class="grp-h" data-gt><i class="ti ti-chevron-down"></i><span>${esc(L().types[k])}</span><b>${arr.length}</b></div><div class="grp-b"><div class="cont-list" style="margin-top:6px">${arr.map(item).join('')}</div></div></section>`).join(''); }
  if (doing.length > LIM) html += `<div style="margin-top:14px"><button class="chip" data-more>${esc(contAll ? t('continue_less') : t('continue_all', { n:doing.length }))}</button></div>`;
  if (loose.length) html += `<div class="cont-list" style="margin-top:10px">${loose.map(looseItem).join('')}</div>`;
  $('contBox').innerHTML = html;
}
$('contBox').addEventListener('click', e => {
  if (e.target.closest('[data-more]')) { contAll = !contAll; return renderContinue(); }
  const gt = e.target.closest('[data-gt]'); if (gt) { const s = gt.parentElement, k = s.dataset.gk; TS.collapsed.has(k) ? TS.collapsed.delete(k) : TS.collapsed.add(k); s.classList.toggle('collapsed'); return; }
  const rs = e.target.closest('[data-resume]'); if (rs) { e.stopPropagation(); return openFileById(rs.dataset.resume); }
  if (qaHandler(e)) return;
  const pr = e.target.closest('[data-prog]');
  if (pr) {
    e.stopPropagation(); const id = Number(pr.closest('[data-id]').dataset.id), m = media.find(x => x.id === id);
    const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'prog-in'; inp.value = m.progress || ''; inp.placeholder = 'S1E3 / p.120'; pr.replaceWith(inp); inp.focus(); inp.select();
    let done = false; const fin = async save => { if (done) return; done = true; if (save && inp.value.trim() !== (m.progress || '')) { await DB.put('media', { ...m, progress:inp.value.trim() }); await reload(); } else renderContinue(); };
    inp.onkeydown = ev => { if (ev.key === 'Enter') fin(true); else if (ev.key === 'Escape') fin(false); }; inp.onblur = () => fin(true); inp.onclick = ev => ev.stopPropagation(); return;
  }
  const lf = e.target.closest('.cont-item[data-fid]'); if (lf) return openFileById(lf.dataset.fid);
  const it = e.target.closest('.cont-item'); if (it) openMedia(Number(it.dataset.id));
});
/* ---- overview ---- */
function renderHome() { renderPickControls(); renderContinue(); renderToday(); if (!PK.cur && !PK.drawn) stageIdle(); }
/* ---- scroll story: reveal, parallax veil, section dots ---- */
function initHomeScroll() {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }), { threshold:.15 });
  $$('.rv').forEach(el => io.observe(el));
  const secs = $$('.hs'), dots = $$('#hdots button');
  const onScroll = () => {
    if (curTab !== 'home') return;
    $('bg').style.setProperty('--sp', Math.min(1, scrollY / (innerHeight * .9)).toFixed(3));
    const mid = scrollY + innerHeight * .5; let idx = 0; secs.forEach((s, i) => { if (!s.hidden && s.offsetTop <= mid) idx = i; });
    dots.forEach((d, i) => d.classList.toggle('on', i === idx));
  };
  let raf = 0; addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(onScroll); }, { passive:true }); onScroll();
  $('hdots').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b && secs[+b.dataset.go]) secs[+b.dataset.go].scrollIntoView({ behavior:'smooth' }); });
  $('cue').onclick = () => (secs.find((x, i) => i && !x.hidden) || secs[0]).scrollIntoView({ behavior:'smooth' });
}

