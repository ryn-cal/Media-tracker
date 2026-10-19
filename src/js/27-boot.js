/* ---- boot ---- */
(async function boot() {
  applyTheme();
  if (!I18N[prefs.lang]) { await loadPacks(); }
  applyLook(); setTab(['home', 'tracker', 'ask'].includes(prefs.start) ? prefs.start : 'home'); applyLang(); initHomeScroll(); initOnboarding();          // paint the interface first; the database may take a moment
  setInterval(() => tick(), 1000);
  await reload();
  try { const w = await DB.get('kv', 'wpmine'), old = await DB.get('kv', 'wallpaper'); mineList = w && Array.isArray(w.v) ? w.v : (old && old.v ? [old.v] : []); } catch (e) {}
  await loadPacks(); applyLang(); renderPacks(); tick(true);
})();
