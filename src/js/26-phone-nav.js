/* =====================================================================
   Phone navigation (bar layout), the way TickTick does it:
   - the bottom bar holds only the tabs you chose (js/26-tabbar.js), nothing else;
   - ONE tab (Tracker, or the first one in the bar) carries a ☰ button that opens a left menu;
   - the menu header is you (tap → Profile) with a gear (→ Settings); below it, the destinations that are not in the bar.
   The menu takes a history entry, so the system back gesture (HarmonyOS accessBackward) closes it before leaving the app.
   ===================================================================== */
const app = $('appShell'), menuOpen = () => app.classList.contains('nav-open');
const menuHost = () => { const s = tbShown(); return s.includes('tracker') ? 'tracker' : s[0]; };
function syncMenu() { $('menuBtn').classList.toggle('on', curTab === menuHost()); document.body.classList.toggle('has-menu', curTab === menuHost()); }
function renderDrawer() {
  const nm = (PROFILE.name || prefs.name || '').trim(); let lv = 0; try { lv = profileLevel(profileStats()); } catch (e) {}
  $('mDrawer').innerHTML = `<div class="md-head"><button class="md-me" data-go="profile"><span class="me-av" id="mdAv"></span><span class="tx"><b>${esc(nm || t('me_guest'))}</b><small>${esc(t('lvl_' + lv))}</small></span></button><button class="md-ico" data-go="settings" aria-label="${esc(t('nav_settings'))}"><i class="ti ti-settings"></i></button></div>
    <nav class="md-list">${tbMenu().map(id => `<button class="md-item" data-go="${id}" ${id === curTab ? 'aria-current="page"' : ''}>${iconHtml(id)}<span>${esc(t(TAB_DEFS[id][1]))}</span></button>`).join('')}</nav>`;
  paintAv($('mdAv'));
}
function setMenu(on, popped) {
  if (on === menuOpen()) return;
  if (on) renderDrawer();
  app.classList.toggle('nav-open', on); $('menuBtn').setAttribute('aria-expanded', on); $('mDrawer').inert = !on;
  if (on) history.pushState({ menu: 1 }, '');
  else if (!popped && history.state && history.state.menu) history.back();
}
$('mDrawer').inert = true;
document.addEventListener('click', e => {
  if (!PLAT.bar()) return setMenu(false);
  if (e.target.closest('#menuBtn')) return setMenu(!menuOpen());
  const go = e.target.closest('#mDrawer [data-go]');
  if (go) { const dest = go.dataset.go, pops = history.state && history.state.menu; setMenu(false); return pops ? addEventListener('popstate', () => setTab(dest), { once:true }) : setTab(dest); }   // let the menu's history entry pop first, so the stack stays in step
  if (!e.target.closest('#mDrawer')) setMenu(false);   // the dimmed page closes it
}, true);
addEventListener('popstate', () => setMenu(false, true));
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
{ const _tab = setTab; setTab = function () { const r = _tab.apply(this, arguments); syncMenu(); return r; }; }
