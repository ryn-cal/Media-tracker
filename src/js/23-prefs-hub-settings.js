/* =====================================================================
   v3 — look & feel prefs, data hub, switches, profile chip, guide, welcome tour, AI assistant
   ===================================================================== */
/* hints: one switch in Settings, and every hint can also be dismissed on its own ("Don't show again") */
function hintOn(k) { return prefs.hints && !prefs.hintsOff.includes(k); }
function dismissHint(k) { if (!prefs.hintsOff.includes(k)) prefs.hintsOff.push(k); store.set('vmm.hintsOff', JSON.stringify(prefs.hintsOff)); }
document.addEventListener('click', e => { const b = e.target.closest('[data-hint-off]'); if (!b) return; dismissHint(b.dataset.hintOff); const h = b.closest('.selhint'); if (h) h.hidden = true; toast(t('hint_off_done')); });
const setPref = (k, v, raw) => { prefs[k] = v; store.set('vmm.' + k, raw != null ? raw : typeof v === 'boolean' ? (v ? '1' : '0') : v); };
function applyLook() {
  const h = document.documentElement;
  h.dataset.font = prefs.font; h.dataset.size = prefs.size; h.dataset.motion = prefs.motion ? 'on' : 'off';
  document.body.classList.toggle('no-credit', !prefs.credit); document.body.classList.toggle('ai-off', !prefs.ai);
}

/* ---- profile chip ---- */
function paintAv(el) {
  if (!el) return; const nm = (PROFILE.name || prefs.name || '').trim();
  el.style.backgroundImage = PROFILE.avatar ? `url('${PROFILE.avatar}')` : ''; el.textContent = PROFILE.avatar ? '' : ([...nm][0] || '☺').toUpperCase();
}
function renderMe() {
  const nm = (PROFILE.name || prefs.name || '').trim(); let lv = 0; try { lv = profileLevel(profileStats()); } catch (e) {}
  $('meName').textContent = nm || t('me_guest'); $('meLv').textContent = t('lvl_' + lv); paintAv($('meAv')); renderSetProfile();
  $('navMe').title = (nm || t('me_guest')) + ' · ' + t('lvl_' + lv);
}
{ const _sp = saveProfile; saveProfile = async function () { const r = await _sp.apply(this, arguments); renderMe(); return r; }; }

/* ---- Import · Export · Share · Reset hub ---- */
const HUB = [['import', 'upload', 'nav_import'], ['export', 'download', 'nav_export'], ['share', 'share-3', 'hub_share'], ['clear', 'trash', 'hub_reset']];
function renderHub() {
  HUB.forEach(([p]) => {
    const panel = document.querySelector(`.panel[data-panel="${p}"]`); if (!panel) return;
    let nav = panel.querySelector(':scope > .hub-tabs'); if (!nav) { nav = document.createElement('nav'); nav.className = 'hub-tabs'; nav.setAttribute('role', 'tablist'); panel.insertBefore(nav, panel.querySelector('.pg-head')); }
    nav.innerHTML = HUB.map(([k, ic, lb], i) => `${k === 'clear' ? '<span class="sp"></span>' : ''}<button role="tab" data-goto="${k}" aria-selected="${k === p}" class="${k === 'clear' ? 'danger' : ''}"><i class="ti ti-${ic}"></i>${esc(t(lb))}</button>`).join('');
  });
}
document.addEventListener('click', e => {
  const sg = e.target.closest('[data-sharego]'); if (sg) { openShare(sg.dataset.sharego); return; }
  if (e.target.closest('[data-restore]')) setTimeout(() => { impTab = 'restore'; renderImpTabs(); }, 0);
  const ss = e.target.closest('[data-setsec]'); if (ss) setTimeout(() => showSetSec(ss.dataset.setsec), 0);
});

/* ---- settings: switches ---- */
function switchDefs() {
  const out = [
    { g:'sw_g_home', t:t('sw_secs'), d:t('sw_secs_d'), get:() => prefs.secs, set:v => { setPref('secs', v); HS.ds = null; tick(); } },
    { g:'sw_g_home', t:t('sw_credit'), d:t('sw_credit_d'), get:() => prefs.credit, set:v => { setPref('credit', v); applyLook(); } },
    { g:'sw_g_home', t:t('sw_motion'), d:t('sw_motion_d'), get:() => prefs.motion, set:v => { setPref('motion', v); applyLook(); } },
    { g:'sw_g_home', t:t('sw_hints'), d:t('sw_hints_d'), get:() => prefs.hints, set:v => { setPref('hints', v); if (v) { prefs.hintsOff = []; store.set('vmm.hintsOff', '[]'); } renderTracker(); renderFilesLib(); } },
    { g:'sw_g_smart', t:t('sw_ai'), d:t('sw_ai_d'), get:() => prefs.ai, set:v => { setPref('ai', v); applyLook(); if (!v && curTab === 'ask') setTab('home'); } }
  ];
  return out;
}
function renderSwitches() {
  const defs = switchDefs(); let last = '', html = '';
  defs.forEach((d, i) => { if (d.g !== last) { html += `<div class="sw-grp">${esc(t(d.g))}</div>`; last = d.g; } html += `<div class="sw-row" data-sw="${i}"><div class="tx"><b>${esc(d.t)}</b>${d.d ? `<span>${esc(d.d)}</span>` : ''}</div><button type="button" class="sw" role="switch" aria-checked="${!!d.get()}" aria-label="${esc(d.t)}"></button></div>`; });
  $('swList').innerHTML = html;
}
$('swList').addEventListener('click', e => { const r = e.target.closest('[data-sw]'); if (!r) return; const d = switchDefs()[Number(r.dataset.sw)]; d.set(!d.get()); renderSwitches(); });
const setAllSwitches = on => { switchDefs().forEach(d => { if (!!d.get() !== on) d.set(on); }); renderSwitches(); };
$('swAllOn').onclick = () => setAllSwitches(true); $('swAllOff').onclick = () => setAllSwitches(false);

/* ---- settings: general / appearance ---- */
const FONTS = {
  classic:{ d:'"Cormorant Garamond","Noto Serif SC",Georgia,serif', u:'-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif' },
  modern:{ d:'"Inter",-apple-system,"PingFang SC",sans-serif', u:'"Inter",-apple-system,"PingFang SC",sans-serif' },
  editorial:{ d:'"Lora","Noto Serif SC",Georgia,serif', u:'"Inter",-apple-system,"PingFang SC",sans-serif' },
  friendly:{ d:'"Nunito","PingFang SC",sans-serif', u:'"Nunito","PingFang SC",sans-serif' },
  system:{ d:'-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif', u:'-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif' }
};
function renderLook() { $$('#segSize button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === prefs.size)); $$('#segTheme button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === prefs.theme)); }
$('segSize').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; setPref('size', b.dataset.v); applyLook(); renderLook(); });
$('segPkAuto').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { store.set('vmm.pkauto', b.dataset.v); renderGeneral(); renderPickControls(); } });
$('segPkStrict').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { PK.strict = Number(b.dataset.v); store.set('vmm.pkstrict', String(PK.strict)); renderGeneral(); renderPickControls(); } });
$('segStart').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; setPref('start', b.dataset.v); renderGeneral(); });
function renderGeneral() {
  renderMe();
  $$('#segPkAuto button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === store.get('vmm.pkauto', '1'))); $$('#segPkStrict button').forEach(b => b.setAttribute('aria-pressed', Number(b.dataset.v) === PK.strict));
  $$('#segStart button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === prefs.start));
}

/* ---- settings: AI ---- */
const AI_MODELS = [['claude-haiku-4-5-20251001', 'ai_m_haiku'], ['claude-sonnet-5-5', 'ai_m_sonnet']];
const aiMode = () => (prefs.aiMode === 'claude' && prefs.aiKey) ? 'claude' : 'local';
function renderAiSettings() {
  $('aiModes').innerHTML = [['local', 'cpu', 'ai_local', 'ai_local_d', 'ai_local_tag'], ['claude', 'sparkles', 'ai_claude', 'ai_claude_d', 'ai_claude_tag']].map(([k, ic, a, b, c]) => `<button type="button" class="aimode" data-m="${k}" aria-pressed="${prefs.aiMode === k}"><i class="ti ti-${ic} big"></i><b>${esc(t(a))}</b><span>${esc(t(b))}</span><span class="tag">${esc(t(c))}</span></button>`).join('');
  $('aiClaudeCard').hidden = prefs.aiMode !== 'claude'; $('aiKey').value = prefs.aiKey;
  $('aiModel').innerHTML = AI_MODELS.map(([v, l]) => `<option value="${v}" ${prefs.aiModel === v ? 'selected' : ''}>${esc(t(l))}</option>`).join('');
  $('aiFacts').innerHTML = ['ai_f1', 'ai_f2', 'ai_f3', 'ai_f4'].map(k => `<li><i class="ti ti-circle-check"></i><span>${esc(t(k))}</span></li>`).join('');
}
$('aiModes').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; setPref('aiMode', b.dataset.m); renderAiSettings(); renderAsk(); });
$('aiKey').addEventListener('change', e => { setPref('aiKey', e.target.value.trim()); renderAsk(); });
$('aiModel').addEventListener('change', e => setPref('aiModel', e.target.value));
$('aiKeyShow').onclick = () => { const i = $('aiKey'), show = i.type === 'password'; i.type = show ? 'text' : 'password'; $('aiKeyShow').innerHTML = `<i class="ti ti-eye${show ? '' : '-off'}"></i>`; $('aiKeyShow').setAttribute('aria-pressed', show); $('aiKeyShow').setAttribute('aria-label', t(show ? 'ai_key_hide' : 'ai_key_show')); };
$('aiForget').onclick = () => { setPref('aiKey', ''); renderAiSettings(); renderAsk(); $('aiTestOut').textContent = t('ai_forgot'); $('aiTestOut').className = 'ai-test'; };
$('aiTest').onclick = async () => {
  const out = $('aiTestOut'); setPref('aiKey', $('aiKey').value.trim()); if (!prefs.aiKey) { out.textContent = t('ai_nokey'); out.className = 'ai-test bad'; return; }
  out.textContent = t('ai_testing'); out.className = 'ai-test';
  try { await claudeCall('Reply with the single word: ok', 'ping', 8); out.textContent = t('ai_ok'); out.className = 'ai-test ok'; renderAsk(); } catch (e) { out.textContent = t('ai_bad', { e:e.message }); out.className = 'ai-test bad'; }
};
async function claudeCall(system, user, max) {
  const res = await fetch('https://api.anthropic.com/v1/messages', { method:'POST', headers:{ 'content-type':'application/json', 'x-api-key':prefs.aiKey, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' }, body:JSON.stringify({ model:prefs.aiModel, max_tokens:max || 700, system, messages:[{ role:'user', content:user }] }) });
  if (!res.ok) { let m = String(res.status); try { const j = await res.json(); m = (j.error && j.error.message) || m; } catch (e) {} throw new Error(m); }
  const j = await res.json(); return (j.content || []).filter(x => x.type === 'text').map(x => x.text).join('\n').trim();
}

/* ---- settings wrappers ---- */
{
  const _show = showSetSec;
  showSetSec = function (sec) {
    _show(sec); const R = { general:renderGeneral, features:renderSwitches, appearance:renderLook, colors:renderColors, fonts:renderFontSettings, icons:renderIconSettings, tabbar:renderTabBarSettings, ai:renderAiSettings, badges:renderBadgeSettings, data:renderDataSection };
    $$('.set-sec').filter(x => !x.hidden).forEach(x => R[x.dataset.sec] && R[x.dataset.sec]());
    renderSetChrome();
  };
  const _tab = setTab;
  setTab = function (name) {
    if (name === 'ask' && !prefs.ai) name = 'home';
    _tab(name); const pm = document.body.dataset.page; if (pm !== name) return;
    if (name === 'ask') renderAsk(); if (name === 'guide') renderGuide(); if (['import', 'export', 'share', 'clear'].includes(name)) renderHub();
  };
  const _lang = applyLang;
  applyLang = function () { _lang.apply(this, arguments); renderHub(); renderMe(); renderGeneral(); labelControls(); if (curTab === 'ask') renderAsk(); if (curTab === 'guide') renderGuide(); applyLook(); };
}

