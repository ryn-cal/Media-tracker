/* =====================================================================
   Guided tour ("coach marks").
   The tour opens each screen itself, dims everything except the control it is talking about, says what it is for and, where it
   helps, does the first click for you. The beginner's guide runs the same engine with just the steps for one task.
   A step is: which screen · which element (per layout, because the phone and the desktop arrange things differently) · text.
   ===================================================================== */
const coachBar = () => PLAT.bar();
const COACH_STEPS = {
  home_draw:    { tab:'home',    sel:'#pkMoment', demo:() => { const o = $('pkGo'); if (o) setTimeout(() => o.click(), 1100); } },
  trk_views:    { tab:'tracker', sel:'#libTabs' },
  trk_tools:    { tab:'tracker', sel:'.panel[data-panel="tracker"] .lib-tools' },
  trk_add:      { tab:'tracker', sel:'#trackerGrid .newrow' },
  trk_row:      { tab:'tracker', sel:'#trackerGrid tbody tr, #trackerGrid .mcard, #trackerGrid .drow, #trackerGrid .bcard' },
  lists_new:    { tab:'lists',   sel:'#lpNew' },
  files_tabs:   { tab:'files',   sel:'#fTabs' },
  files_import: { tab:'import',  sel:'.panel[data-panel="import"] #impTabs' },
  ins_period:   { tab:'insights', sel:'#insMode' },
  set_menu:     { tab:() => coachBar() ? 'tracker' : 'home', sel:() => coachBar() ? '#menuBtn' : '#side .nav[data-tab="settings"]' },
  set_look:     { tab:'settings', sel:() => coachBar() ? '#setList [data-open="colors"]' : '#setNav [data-sec="appearance"]' },
  backup:       { tab:'export',  sel:'.panel[data-panel="export"] .hub-tabs' }
};
const COACH_ALL = ['home_draw', 'trk_views', 'trk_tools', 'trk_add', 'trk_row', 'lists_new', 'files_tabs', 'files_import', 'ins_period', 'set_menu', 'set_look', 'backup'];
const COACH = { steps:[], i:0, root:null, seeded:false, token:0 };
const wait = ms => new Promise(r => setTimeout(r, ms));
const coachFind = sel => [...document.querySelectorAll(sel)].find(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; });
async function startCoach(steps) {
  if (COACH.root) endCoach(false);
  COACH.steps = (steps || COACH_ALL).slice(); COACH.seeded = false;
  if (!media.length && COACH.steps.some(s => s.startsWith('trk') || s === 'home_draw')) { await addSamples(); COACH.seeded = true; await wait(250); }
  const root = document.createElement('div'); root.id = 'coach'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'coachT');
  root.innerHTML = '<div class="coach-spot"></div><div class="coach-card"><div class="coach-n"></div><h3 id="coachT"></h3><p id="coachP"></p><div class="coach-btns"><button type="button" class="btn sm" data-c="skip"></button><span class="sp"></span><button type="button" class="btn sm" data-c="back"></button><button type="button" class="btn primary sm" data-c="next"></button></div></div>';
  document.body.appendChild(root); COACH.root = root; setMenuClosed();
  root.addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; if (b.dataset.c === 'next') coachGo(COACH.i + 1); else if (b.dataset.c === 'back') coachGo(COACH.i - 1); else endCoach(true); });
  coachGo(0);
}
function setMenuClosed() { if (typeof menuOpen === 'function' && menuOpen()) setMenu(false); }
async function coachGo(i) {
  if (!COACH.root) return; const my = ++COACH.token;
  if (i >= COACH.steps.length) return endCoach(true); i = Math.max(0, i); COACH.i = i;
  const id = COACH.steps[i], def = COACH_STEPS[id], tab = typeof def.tab === 'function' ? def.tab() : def.tab;
  if (curTab !== tab) { setMenuClosed(); setTab(tab); }
  const card = COACH.root.querySelector('.coach-card'), spot = COACH.root.querySelector('.coach-spot');
  card.classList.remove('in'); spot.style.opacity = 0; await wait(curTab === tab ? 380 : 120); if (my !== COACH.token) return;
  const sel = typeof def.sel === 'function' ? def.sel() : def.sel, el = coachFind(sel);
  if (el) { el.scrollIntoView({ block:'center', behavior:'smooth' }); await wait(420); if (my !== COACH.token) return; }
  $('coachT').textContent = t('tr_' + id + '_t'); $('coachP').textContent = t('tr_' + id + '_p' + (id === 'set_menu' ? (coachBar() ? 'b' : 'w') : ''));
  card.querySelector('.coach-n').textContent = t('tr_n', { a:i + 1, b:COACH.steps.length });
  const last = i === COACH.steps.length - 1; card.querySelector('[data-c="skip"]').textContent = t(last ? 'tr_close' : 'wl_skip'); card.querySelector('[data-c="skip"]').style.visibility = last ? 'hidden' : 'visible';
  card.querySelector('[data-c="back"]').style.visibility = i ? 'visible' : 'hidden'; card.querySelector('[data-c="back"]').textContent = t('wl_back'); card.querySelector('[data-c="next"]').textContent = t(last ? 'tr_finish' : 'wl_next');
  coachPlace(el); card.classList.add('in'); card.querySelector('[data-c="next"]').focus({ preventScroll:true });
  if (def.demo) def.demo();
}
function coachPlace(el) {
  const root = COACH.root; if (!root) return; const spot = root.querySelector('.coach-spot'), card = root.querySelector('.coach-card'); COACH.el = el || COACH.el;
  el = COACH.el; const W = innerWidth, H = innerHeight, cw = Math.min(340, W - 24);
  card.style.width = cw + 'px';
  if (!el || !document.contains(el)) { spot.style.cssText = 'left:50%;top:50%;width:0;height:0;opacity:1'; card.style.left = (W - cw) / 2 + 'px'; card.style.top = Math.max(16, H / 2 - card.offsetHeight / 2) + 'px'; return; }
  const r = el.getBoundingClientRect(), pad = 8, x = Math.max(4, r.left - pad), y = Math.max(4, r.top - pad), w = Math.min(W - 8, r.width + pad * 2), h = r.height + pad * 2;
  spot.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;opacity:1`;
  const ch = card.offsetHeight, below = y + h + 14 + ch < H - 8, top = below ? y + h + 14 : Math.max(8, y - 14 - ch);
  card.style.top = top + 'px'; card.style.left = Math.max(12, Math.min(W - cw - 12, r.left + r.width / 2 - cw / 2)) + 'px';
}
async function endCoach(asked) {
  const seeded = COACH.seeded; if (COACH.root) { COACH.root.remove(); COACH.root = null; } COACH.token++;
  if (asked && seeded && media.some(m => m.sample)) {
    const keep = await uiDialog(`<p class="ask-msg">${esc(t('tr_keep'))}</p><div class="ask-btns"><button type="button" class="btn" data-no>${esc(t('tr_remove'))}</button><button type="button" class="btn primary" data-yes>${esc(t('tr_keep_yes'))}</button></div>`, (d, done) => { d.querySelector('[data-no]').onclick = () => done(false); d.querySelector('[data-yes]').onclick = () => done(true); d.querySelector('[data-yes]').focus(); });
    if (keep === false) await removeSamples();
  }
}
addEventListener('resize', () => coachPlace());
addEventListener('keydown', e => { if (!COACH.root) return; if (e.key === 'Escape') endCoach(true); else if (e.key === 'ArrowRight') coachGo(COACH.i + 1); else if (e.key === 'ArrowLeft') coachGo(COACH.i - 1); });
