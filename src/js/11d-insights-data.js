/* =====================================================================
   Click a slice, bar, day, word or tile on Insights and its items open in a table (the data behind the number).
   The filters it was drawn with are shown as chips, so the table says what it is a table of.
   ===================================================================== */
function insGoDay(key) { const [y, m, d] = key.split('-').map(Number); INS.mode = 'day'; INS.ref = new Date(y, m - 1, d); renderInsights(); window.scrollTo({ top:0, behavior:'smooth' }); }
function openInsData(pk) {
  if (!pk) return; const cfg = pk.cfg || {}, items = pk.items.slice().sort((a, b) => (doneTs(b) || b.addedAt || 0) - (doneTs(a) || a.addedAt || 0));
  const scope = INS.list === 'fav' ? '♥ ' + t('l_fav') : INS.list ? (listById(INS.list) || {}).name : '';
  const chips = [[cfg.kind ? iwTitle(cfg) : '', 'chart-dots-3'], [insLabel(), 'calendar'], [cfg.basis ? t('ibs_' + cfg.basis) : '', 'filter'], [scope, 'books'], [cfg.types && cfg.types.length ? cfg.types.map(k => L().types[k] || k).join(', ') : '', 'category-2']].filter(c => c[0]);
  const fmt = ts => ts ? new Date(ts).toLocaleDateString(locOf(), { year:'numeric', month:'short', day:'numeric' }) : '';
  const rows = items.slice(0, 300).map(m => `<tr data-id="${m.id}" tabindex="0"><td class="dt-n">${esc(m.title)}</td><td>${esc(L().types[m.type] || m.type)}</td><td>${esc(L().status[m.status] || '')}</td><td>${m.rating ? '★ ' + m.rating : ''}</td><td>${esc(fmt(doneTs(m) || m.addedAt))}</td></tr>`).join('');
  uiDialog(`<div class="dt-h"><h2>${esc(pk.title)}</h2><span class="dt-n2">${esc(t('lp_items', { n:items.length }))}</span><button type="button" class="ibtn" data-no aria-label="${esc(t('sh_close'))}"><i class="ti ti-x"></i></button></div>
    <div class="dt-chips">${chips.map(([l, ic]) => `<span class="dt-chip"><i class="ti ti-${ic}"></i>${esc(l)}</span>`).join('')}</div>
    <div class="dt-scroll"><table class="dt"><thead><tr><th>${esc(t('tc_title'))}</th><th>${esc(t('tc_type'))}</th><th>${esc(t('tc_status'))}</th><th>${esc(t('tc_rating'))}</th><th>${esc(t('ins_date'))}</th></tr></thead><tbody>${rows}</tbody></table>${items.length > 300 ? `<p class="hint">${esc(t('ins_data_more', { n:items.length - 300 }))}</p>` : ''}</div>
    <div class="dt-f">${pk.day ? `<button type="button" class="btn sm" data-day><i class="ti ti-calendar"></i>${esc(t('ins_go_day'))}</button>` : ''}${pk.rules ? `<button type="button" class="btn sm" data-db><i class="ti ti-database"></i>${esc(t('ins_open_db'))}</button>` : ''}</div>`,
    (d, done) => {
      d.classList.add('data'); d.querySelector('[data-no]').onclick = () => done(null);
      const open = tr => { const id = Number(tr.dataset.id); done(null); openMedia(id); };
      d.querySelector('tbody').onclick = e => { const tr = e.target.closest('tr'); if (tr) open(tr); };
      d.querySelector('tbody').onkeydown = e => { if (e.key === 'Enter') { const tr = e.target.closest('tr'); if (tr) open(tr); } };
      const dayB = d.querySelector('[data-day]'); if (dayB) dayB.onclick = () => { done(null); insGoDay(pk.day); };
      const dbB = d.querySelector('[data-db]'); if (dbB) dbB.onclick = () => { done(null); libQuick(pk.rules); };
    });
}
