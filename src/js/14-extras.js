/* =====================================================================
   Extras: celebrations, today's pick, sidebar & start page
   ===================================================================== */
const doneCount = () => media.filter(m => m.status === 'done').length;
function renderToday() {
  const pool = media.filter(m => m.status === 'want').sort((a, b) => a.id - b.id), box = $('todayBox');
  if (!pool.length) return box.innerHTML = '';
  const d = new Date(), m = pool[hash(d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()) % pool.length];
  box.innerHTML = `<div class="today glass" data-id="${m.id}">${posterHtml(m, false)}<div class="grow"><div class="cap">${esc(t('today_cap'))}</div><div class="nm">${esc(m.title)}</div><div class="msub">${esc([L().types[m.type], m.creator, m.year, fmtRuntime(m.runtime)].filter(Boolean).join(' · '))}</div></div><button class="btn primary sm" data-today-start><i class="ti ti-player-play"></i>${esc(t('pk_start'))}</button></div>`;
}
$('todayBox').addEventListener('click', async e => {
  const c = e.target.closest('.today'); if (!c) return; const id = Number(c.dataset.id);
  if (e.target.closest('[data-today-start]')) { await setStatus(id, 'doing'); toast(t('q_start')); } else openMedia(id);
});
/* sidebar mode + start page */
function applySide() {
  $('appShell').dataset.side = prefs.side; $$('#segSide button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === prefs.side));
}


