/* =====================================================================
   Guide + welcome tour + sample items
   ===================================================================== */
const SAMPLES = [
  { title:'Spirited Away', alt:'千と千尋の神隠し', type:'anime', status:'want', year:2001, creator:'Hayao Miyazaki', runtime:125, genre:['animation', 'fantasy'], language:'Japanese' },
  { title:'Seven Samurai', alt:'七人の侍', type:'film', status:'want', year:1954, creator:'Akira Kurosawa', runtime:207, genre:['action', 'drama'], language:'Japanese' },
  { title:'Metropolis', type:'film', status:'done', year:1927, creator:'Fritz Lang', runtime:153, rating:4.5, genre:['scifi', 'drama'], language:'German' },
  { title:'The Cabinet of Dr. Caligari', type:'film', status:'done', year:1920, creator:'Robert Wiene', runtime:76, rating:4, genre:['horror'], language:'German' },
  { title:'Twin Peaks', type:'series', status:'doing', year:1990, creator:'David Lynch, Mark Frost', runtime:47, genre:['mystery', 'drama'], language:'English' },
  { title:'Pride and Prejudice', type:'book', status:'want', year:1813, creator:'Jane Austen', genre:['romance'], language:'English' },
  { title:'Rear Window', type:'film', status:'want', year:1954, creator:'Alfred Hitchcock', runtime:112, genre:['mystery'], language:'English' }
];
async function addSamples() { const have = new Set(media.map(mediaKey)); const recs = SAMPLES.filter(s => !have.has(mediaKey(s))).map((s, i) => ({ rating:0, ...s, sample:true, addedAt:Date.now() + i, ...(s.status === 'done' ? { doneAt:Date.now() - (i + 1) * 86400000 } : {}), ...(s.status === 'doing' ? { startedAt:Date.now() } : {}) })); if (recs.length) { await DB.putMany('media', recs.map(r => ({ title:'', alt:'', creator:'', year:null, progress:'', genre:[], cover:'', notes:'', runtime:null, language:'', cast:'', writers:'', producers:'', ...r }))); await reload(); } toast(t('guide_sample_ok', { n:recs.length })); renderGuide(); }
async function removeSamples() { const ids = media.filter(m => m.sample).map(m => m.id); if (ids.length) { await DB.delMany('media', ids); await reload(); } toast(t('guide_unsample_ok', { n:ids.length })); renderGuide(); }

/* ---- first-run welcome: set-up only. Looking around is the guided tour, which you can start (or skip) at the end ---- */
const TOUR = { i:0, n:4 };
function tourHtml(i) {
  const hero = (ic, c1, c2) => `<div class="wl-hero" style="--c1:${c1};--c2:${c2}"><i class="ti ti-${ic}"></i></div>`;
  const btn = (id, ic, a, b) => `<button type="button" class="wl-opt" id="${id}"><i class="ti ti-${ic}"></i><div><b>${esc(t(a))}</b>${b ? `<span>${esc(t(b))}</span>` : ''}</div></button>`;
  if (i === 0) return `${hero('movie', '#4f6bd8', '#8b5cf6')}<h2>${esc(t('wl0_t'))}</h2><p>${esc(t('wl0_p'))}</p><input type="text" class="wl-name" id="wlName" maxlength="40" value="${esc(PROFILE.name || prefs.name || '')}" placeholder="${esc(t('sg_name_ph'))}" autocomplete="off"><div class="lbl" style="font-size:12px;color:var(--text-muted);margin-bottom:6px">${esc(t('wl_lang'))}</div><div class="seg" id="wlLang">${uiLangs().map(([c, n]) => `<button data-v="${c}" aria-pressed="${prefs.lang === c}">${esc(n)}</button>`).join('')}</div>`;
  if (i === 1) return `${hero('folder-open', '#0f9d8f', '#22a559')}<h2>${esc(t('wl_acc_t'))}</h2><p>${esc(t('wlx_p'))}</p><div class="wl-opts">${btn('wlPickVideo', 'files', 'wlx_a', 'wlx_ad')}${btn('wlPickFile', 'file-import', 'wl_acc_f', 'wl_acc_fd')}</div><p style="font-size:12.5px;margin-top:12px">${esc(t('wl_acc_n'))}</p>`;
  if (i === 2) return `${hero('sparkles', '#8b5cf6', '#ec4899')}<h2>${esc(t('wl3_t'))}</h2><p>${esc(t('wl3_p'))}</p><div class="wl-opts" id="wlAi"><button type="button" class="wl-opt" data-m="local" aria-pressed="${prefs.aiMode !== 'claude'}"><i class="ti ti-cpu"></i><div><b>${esc(t('wl3_a'))}</b><span>${esc(t('wl3_ad'))}</span></div></button><button type="button" class="wl-opt" data-m="claude" aria-pressed="${prefs.aiMode === 'claude'}"><i class="ti ti-sparkles"></i><div><b>${esc(t('wl3_b'))}</b><span>${esc(t('wl3_bd'))}</span></div></button></div>`;
  return `${hero('check', '#22a559', '#0f9d8f')}<h2>${esc(t('wl4_t'))}</h2><p>${esc(t('wlx_done'))}</p><div class="wl-opts">${btn('wlTour', 'player-play', 'wlx_tour', 'wlx_tourd')}${btn('wlSample', 'wand', 'wl4_a')}</div>`;
}
function renderTour() {
  $('wlDots').innerHTML = Array.from({ length:TOUR.n }, (_, i) => `<i class="${i === TOUR.i ? 'on' : ''}"></i>`).join('');
  $('wlBody').innerHTML = tourHtml(TOUR.i); $('wlBody').style.animation = 'none'; void $('wlBody').offsetWidth; $('wlBody').style.animation = '';
  const last = TOUR.i === TOUR.n - 1;
  $('wlBack').style.visibility = TOUR.i ? 'visible' : 'hidden'; $('wlNext').innerHTML = esc(t(last ? 'wlx_close' : 'wl_next')); $('wlSkip').style.visibility = last ? 'hidden' : 'visible';
  $('wlSkip').textContent = t('wl_skip'); $('wlBack').textContent = t('wl_back');
}
async function tourSaveName() { const n = $('wlName') ? $('wlName').value.trim() : null; if (n != null && n !== (PROFILE.name || '')) { PROFILE.name = n; await saveProfile(); tick(true); } }
function openTour() { TOUR.i = 0; renderTour(); if (!$('welcome').open) $('welcome').showModal(); }
function closeTour() { store.set('vmm.welcomed', '1'); if ($('welcome').open) $('welcome').close(); }
$('wlNext').onclick = async () => { await tourSaveName(); if (TOUR.i >= TOUR.n - 1) return closeTour(); TOUR.i++; renderTour(); };
$('wlBack').onclick = () => { if (TOUR.i) { TOUR.i--; renderTour(); } };
$('wlSkip').onclick = async () => { await tourSaveName(); closeTour(); };
$('welcome').addEventListener('close', () => store.set('vmm.welcomed', '1'));
$('wlBody').addEventListener('click', async e => {
  const lg = e.target.closest('#wlLang button'); if (lg) { await tourSaveName(); setPref('lang', lg.dataset.v); applyLang(); return renderTour(); }
  const am = e.target.closest('#wlAi [data-m]'); if (am) { setPref('aiMode', am.dataset.m); return renderTour(); }
  if (e.target.closest('#wlPickVideo')) return pickMedia();
  if (e.target.closest('#wlPickFile')) return $('jsonPick').click();
  if (e.target.closest('#wlSample')) { await addSamples(); return closeTour(); }
  if (e.target.closest('#wlTour')) { closeTour(); setTimeout(() => startCoach(), 300); }
});
function initOnboarding() { if (store.get('vmm.welcomed', '')) return; setTimeout(() => { if (store.get('vmm.welcomed', '')) return; if (media.length || files.length) { store.set('vmm.welcomed', '1'); return; } openTour(); }, 1200); }
