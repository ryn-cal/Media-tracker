/* =====================================================================
   Badges: the look of every badge is chosen in Settings → Badges (drawn in code, historic artwork, or your own picture).
   The profile only shows them; each badge opens its own page, where it is shared.
   ===================================================================== */
function renderBadgeSettings() {
  $$('#bdStyle button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === badgeStyle()));
  $('bsGrid').innerHTML = BADGES.map(([k, ic, m, need, bh]) => { const own = (PROFILE.badgeArt || {})[k];
    return `<div class="bs-card" data-b="${k}" style="--bh:${bh}"><span class="emb">${badgeFace(k)}</span><div class="tx"><b>${esc(t('b_' + k))}</b><small>${esc(own ? t('bs_custom') : badgeStyle() === 'art' && BADGE_ART[k] ? badgeCredit(k) : t('bs_default'))}</small></div>
      <div class="acts"><button type="button" class="btn sm" data-bs="up"><i class="ti ti-photo-up"></i><span>${esc(t('bs_upload'))}</span></button>${own ? `<button type="button" class="btn sm" data-bs="rm" title="${esc(t('pf_badge_reset'))}"><i class="ti ti-restore"></i></button>` : ''}</div></div>`; }).join('');
}
$('bdStyle').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; store.set('vmm.badgestyle', b.dataset.v); renderBadgeSettings(); renderProfile(); });
$('bsGrid').addEventListener('click', async e => {
  const b = e.target.closest('[data-bs]'); if (!b) return; const k = b.closest('[data-b]').dataset.b;
  if (b.dataset.bs === 'up') { PF.upBadge = k; return $('bdFile').click(); }
  delete PROFILE.badgeArt[k]; await saveProfile(); renderBadgeSettings(); renderProfile();
});

/* the page of one badge: its picture, what it asks for, how far you are, and Share */
const bpage = $('bpage');
function openBadgePage(k) {
  const row = BADGES.find(b => b[0] === k); if (!row) return; const [, ic, m, need, bh] = row, S = profileStats(), c = Math.min(S[m], need), on = S[m] >= need;
  $('bpTitle').textContent = t('b_' + k);
  $('bpBody').innerHTML = `<div class="bp" style="--bh:${bh};--pg:${Math.round(c / need * 100)}"><div class="badge2 ${on ? 'on' : ''} bp-emb"><span class="emb">${badgeFace(k)}</span></div>
    <h2>${esc(t('b_' + k))}</h2><p class="bp-d">${esc(t('bm_' + k, { n:need }))}</p>
    <div class="bp-prog"><div class="bar2"><i style="width:${Math.round(c / need * 100)}%"></i></div><span>${on ? esc(t('bp_earned')) : `${c} / ${need}`}</span></div>
    ${badgeStyle() === 'art' && BADGE_ART[k] && !(PROFILE.badgeArt || {})[k] ? `<p class="bp-cr">${esc(badgeCredit(k))}</p>` : ''}
    <div class="bp-acts"><button class="btn primary" id="bpShare" ${on ? '' : 'disabled'}><i class="ti ti-share-3"></i>${esc(t('bp_share'))}</button></div>
    ${on ? '' : `<p class="bp-hint">${esc(t('bp_locked'))}</p>`}</div>`;
  $('bpShare').onclick = () => { bpage.close(); openShare('badges', k); };
  bpage.showModal();
}
$('bpX').onclick = () => bpage.close();
bpage.addEventListener('click', e => { if (e.target === bpage) bpage.close(); });
$('pfBody').addEventListener('keydown', e => { const bt = e.target.closest('.badge2[data-b]'); if (bt && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openBadgePage(bt.dataset.b); } });
