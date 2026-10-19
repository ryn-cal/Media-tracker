/* =====================================================================
   Insights: one report (day · month · year · lifetime) + rhythm + taste. Plain SVG/CSS, no libraries.
   ===================================================================== */
const INS = { mode:'year', ref:new Date(), list:store.get('vmm.insscope', ''), data:null };      // list: what the page counts (set in Settings → Insights): '' the whole library, 'fav', or a list id
const dayKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const doneTs = m => m.status === 'done' ? (m.doneAt || m.addedAt || 0) : 0;
const scoped = () => !INS.list ? media : INS.list === 'fav' ? media.filter(m => m.fav) : media.filter(m => (m.lists || []).includes(INS.list));
const locOf = () => ({ zh:'zh-CN', fr:'fr-FR', ja:'ja-JP', es:'es-ES', de:'de-DE' })[prefs.lang] || 'en-US';
function insRange() {
  const r = INS.ref, y = r.getFullYear(), mo = r.getMonth();
  if (INS.mode === 'day') { const s = new Date(y, mo, r.getDate()); return [s, addDays(s, 1)]; }
  if (INS.mode === 'month') return [new Date(y, mo, 1), new Date(y, mo + 1, 1)];
  if (INS.mode === 'year') return [new Date(y, 0, 1), new Date(y + 1, 0, 1)];
  return [new Date(0), new Date(8.64e15)];
}
function insLabel() {
  const r = INS.ref;
  if (INS.mode === 'day') return r.toLocaleDateString(locOf(), { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  if (INS.mode === 'month') return r.toLocaleDateString(locOf(), { year:'numeric', month:'long' });
  if (INS.mode === 'year') return String(r.getFullYear());
  return t('p_all');
}
const inR = (ts, [s, e]) => ts && ts >= +s && ts < +e;
function insData() {
  const rg = insRange(), pool = scoped();
  const added = pool.filter(m => inR(m.addedAt, rg)), finished = pool.filter(m => inR(doneTs(m), rg));
  return { rg, pool, added, finished, period:[...new Set([...added, ...finished])] };
}
function eventDays(pool) { const days = new Set(); pool.forEach(m => { if (m.addedAt) days.add(dayKey(new Date(m.addedAt))); const d = doneTs(m); if (d) days.add(dayKey(new Date(d))); }); return days; }
function bestStreak(days) { const a = [...days].sort(); let best = 0, cur = 0, prev = null; a.forEach(k => { const [y, m, d] = k.split('-').map(Number), dt = new Date(y, m - 1, d); cur = prev && Math.round((dt - prev) / 864e5) === 1 ? cur + 1 : 1; prev = dt; if (cur > best) best = cur; }); return best; }
function renderInsights() {
  if (!$('insReportBox')) return;
  $$('#insMode button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === INS.mode)); $('insLabel').title = insLabel();
  if (INS.list && INS.list !== 'fav' && !listById(INS.list)) INS.list = '';
  const sc = INS.list === 'fav' ? '♥ ' + t('l_fav') : INS.list ? (listById(INS.list) || {}).name : ''; $('insScopeNote').hidden = !sc; $('insScopeNote').textContent = sc || '';
  const data = insData();
  renderReport(data); renderBoard(data);
}
/* ---- the report ---- */
const topCount = (items, pick) => { const c = new Map(); items.forEach(m => pick(m).forEach(k => k && c.set(k, (c.get(k) || 0) + 1))); return [...c].sort((a, b) => b[1] - a[1]); };
const splitNames = s => String(s || '').split(/[,，、;；\/]| & | and /).map(x => x.trim()).filter(Boolean);
function footprintBuckets(finished) {
  const loc = locOf();
  if (INS.mode === 'year') { const y = INS.ref.getFullYear(); return [...Array(12)].map((_, i) => ({ label:new Date(y, i, 1).toLocaleDateString(loc, { month:'short' }), items:finished.filter(m => new Date(doneTs(m)).getMonth() === i) })); }
  if (INS.mode === 'month') { const n = new Date(INS.ref.getFullYear(), INS.ref.getMonth() + 1, 0).getDate(), out = []; for (let s = 1; s <= n; s += 7) out.push({ label:s + '–' + Math.min(n, s + 6), items:finished.filter(m => { const d = new Date(doneTs(m)).getDate(); return d >= s && d <= s + 6; }) }); return out; }
  if (INS.mode === 'all') { const ys = finished.map(m => new Date(doneTs(m)).getFullYear()); if (!ys.length) return []; const a = Math.min(...ys), b = Math.max(...ys); return [...Array(b - a + 1)].map((_, i) => ({ label:String(a + i), items:finished.filter(m => new Date(doneTs(m)).getFullYear() === a + i) })); }
  return [];
}
const miniPoster = m => { const cover = safeUrl(m.cover), h = hue(m.title); return `<div class="pp" data-id="${m.id}" title="${esc(m.title)}" style="background-image:${cover ? `url('${esc(cover)}')` : `linear-gradient(150deg,hsl(${h} 55% 52%),hsl(${(h + 40) % 360} 50% 34%))`}">${cover ? '' : esc([...m.title][0].toUpperCase())}</div>`; };
function renderReport({ rg, pool, added, finished, period }) {
  const box = $('insReportBox'), mode = INS.mode;
  const mins = finished.filter(m => unitOf(m.type) === 'time').reduce((a, m) => a + (m.runtime || 0), 0), pagesRead = finished.reduce((a, m) => a + (m.pages || 0), 0), rated = finished.filter(m => m.rating > 0), avg = rated.length ? rated.reduce((a, m) => a + m.rating, 0) / rated.length : 0;
  const evDays = new Set(); pool.forEach(m => { if (inR(m.addedAt, rg)) evDays.add(dayKey(new Date(m.addedAt))); if (inR(doneTs(m), rg)) evDays.add(dayKey(new Date(doneTs(m)))); });
  const big = mode === 'year' ? String(INS.ref.getFullYear()) : mode === 'month' ? INS.ref.toLocaleDateString(locOf(), { month:'long' }) + `<small>${INS.ref.getFullYear()}</small>` : mode === 'day' ? String(INS.ref.getDate()) + `<small>${INS.ref.toLocaleDateString(locOf(), { month:'short', weekday:'short' })}</small>` : esc(t('p_all'));
  const topType = topCount(finished, m => [m.type])[0], topTag = topCount(finished, m => m.genre || [])[0], topCr = topCount(finished, m => splitNames(m.creator))[0], topLang = topCount(finished, m => [(m.language || '').trim()])[0];
  const buckets = footprintBuckets(finished), busiest = buckets.slice().sort((a, b) => b.items.length - a.items.length)[0];
  let sum = '';
  if (!finished.length && !added.length) sum = t('rp_empty');
  else if (!finished.length) sum = t('rp_sum_added', { a:added.length });
  else sum = t(mins ? 'rp_sum' : 'rp_sum_n', { n:finished.length, h:mins ? fmtRuntime(mins) : '—', type:topType ? L().types[topType[0]] : '', x:busiest && busiest.items.length > 1 && mode !== 'day' ? t('rp_busiest_s', { m:busiest.label, c:busiest.items.length }) : '' });
  const stat = (v, l) => `<div class="rp-stat"><div class="v">${esc(v)}</div><div class="l">${esc(l)}</div></div>`;
  let html = `<div class="rp"><div class="rp-hero"><div class="rp-kicker">${esc(t('rp_k_' + mode))}${INS.list ? ' · ' + esc(INS.list === 'fav' ? t('l_fav') : (listById(INS.list) || {}).name) : ''}</div><div class="rp-big">${big}</div><p class="rp-sum">${esc(sum)}</p></div>
    <div class="rp-stats">${stat(finished.length, t('ti_finished'))}${stat(added.length, t('ti_added'))}${stat(mins ? fmtRuntime(mins) : '—', t('ti_time'))}${pagesRead ? stat(pagesRead.toLocaleString(), t('ti_pages')) : ''}${stat(avg ? avg.toFixed(1) + ' ★' : '—', t('ti_rating'))}${stat(evDays.size, t('rp_active'))}${stat(bestStreak(evDays), t('rp_streak'))}</div>${finished.length ? `<div class="rp-kinds"><div class="rp-kh">${esc(t('iwk_kinds'))} <span>${esc(t('iw_kinds_hint'))}</span></div>${kindsHtml({}, finished)}</div>` : ''}`;
  if (!finished.length && !added.length) return box.innerHTML = html + `<div class="rp-empty">${esc(t('ins_none'))}</div></div>`;
  html += '<div class="rp-body">';
  if (mode === 'day') {
    const rows = []; finished.forEach(m => rows.push({ m, k:'done' })); added.forEach(m => rows.push({ m, k:'add' }));
    html += `<div><h4 class="rp-h">${esc(t('rp_log'))}</h4><div class="replist">${rows.map(r => `<div class="rep" data-id="${r.m.id}">${posterHtml(r.m, false)}<div class="grow"><div class="tt">${esc(r.m.title)}</div><div class="msub">${esc([L().types[r.m.type], r.m.creator, r.m.year].filter(Boolean).join(' · '))}</div></div>${starsHtml(r.m.rating)}<span class="schip ${r.k === 'done' ? 's-done' : 's-want'}"><i class="ti ti-${r.k === 'done' ? 'check' : 'plus'}"></i>${esc(t(r.k === 'done' ? 'rep_done' : 'rep_add'))}</span></div>`).join('')}</div></div>`;
  } else {
    const hl = [];
    if (busiest && busiest.items.length) hl.push([t('rp_busiest'), busiest.label, t('rp_n_fin', { n:busiest.items.length })]);
    if (topType) hl.push([t('rp_toptype'), L().types[topType[0]], t('rp_n_fin', { n:topType[1] })]);
    if (topTag) hl.push([t('rp_toptag'), gname(topTag[0]), t('rp_n_fin', { n:topTag[1] })]);
    if (topCr) hl.push([t('rp_topcreator'), topCr[0], t('rp_n_fin', { n:topCr[1] })]);
    if (topLang) hl.push([t('rp_toplang'), topLang[0], t('rp_n_fin', { n:topLang[1] })]);
    const best = rated.slice().sort((a, b) => b.rating - a.rating || doneTs(b) - doneTs(a))[0]; if (best) hl.push([t('rp_best'), best.title, '★ ' + best.rating]);
    const withLen = finished.filter(m => m.runtime), longest = withLen.slice().sort((a, b) => b.runtime - a.runtime)[0], shortest = withLen.slice().sort((a, b) => a.runtime - b.runtime)[0];
    if (longest) hl.push([t('rp_longest'), longest.title, fmtRuntime(longest.runtime)]); if (shortest && shortest !== longest) hl.push([t('rp_shortest'), shortest.title, fmtRuntime(shortest.runtime)]);
    const sorted = finished.slice().sort((a, b) => doneTs(a) - doneTs(b)), fmtD = m => new Date(doneTs(m)).toLocaleDateString(locOf(), { month:'short', day:'numeric' });
    if (sorted.length) { hl.push([t('rp_first'), sorted[0].title, fmtD(sorted[0])]); if (sorted.length > 1) hl.push([t('rp_last'), sorted[sorted.length - 1].title, fmtD(sorted[sorted.length - 1])]); }
    if (hl.length) html += `<div><h4 class="rp-h">${esc(t('rp_highlights'))}</h4><div class="rp-hl">${hl.map(([k, v, s]) => `<div class="hl"><div class="k">${esc(k)}</div><div class="vv">${esc(v)}</div><div class="ss">${esc(s)}</div></div>`).join('')}</div></div>`;
    const tops = rated.slice().sort((a, b) => b.rating - a.rating || doneTs(b) - doneTs(a)).slice(0, 5), crs = topCount(finished, m => splitNames(m.creator)).slice(0, 5), tgs = topCount(finished, m => m.genre || []).slice(0, 6), mx = tgs.length ? tgs[0][1] : 1;
    html += `<div class="rp-cols"><div><h4 class="rp-h">${esc(t('rp_toprated'))}</h4><div class="rp-list">${tops.length ? tops.map((m, i) => `<div class="it" data-id="${m.id}"><span class="n">${i + 1}</span><span class="nm">${esc(m.title)}</span>${starsHtml(m.rating)}</div>`).join('') : `<div class="ins-empty">${esc(t('ins_none'))}</div>`}</div></div>
      <div><h4 class="rp-h">${esc(t('rp_topcreators'))}</h4><div class="rp-list">${crs.length ? crs.map(([n, c], i) => `<div class="it"><span class="n">${i + 1}</span><span class="nm">${esc(n)}</span><span class="c">${c}</span></div>`).join('') : `<div class="ins-empty">${esc(t('ins_none'))}</div>`}</div></div>
      <div><h4 class="rp-h">${esc(t('rp_toptags'))}</h4>${tgs.length ? tgs.map(([g, c]) => `<div class="rp-bar"><span class="nm">${esc(gname(g))}</span><span class="tr"><i style="width:${c / mx * 100}%"></i></span><span class="c">${c}</span></div>`).join('') : `<div class="ins-empty">${esc(t('ins_none'))}</div>`}</div></div>`;
    if (buckets.length) html += `<div><h4 class="rp-h">${esc(t('rp_foot'))}</h4><div class="fp">${buckets.map(b => `<div class="fp-col"><div class="stack">${b.items.slice(0, 5).map(miniPoster).join('')}${b.items.length > 5 ? `<span class="more">+${b.items.length - 5}</span>` : ''}</div><div class="lab">${esc(b.label)}</div></div>`).join('')}</div></div>`;
    const mix = topCount(finished, m => [m.type]), tot = mix.reduce((a, [, c]) => a + c, 0);
    if (tot) html += `<div><h4 class="rp-h">${esc(t('rp_mix'))}</h4><div class="mixbar">${mix.map(([k, c]) => `<i style="width:${c / tot * 100}%;background:${(TYPES[k] || TYPES.other).c}" title="${esc(L().types[k])} · ${c}"></i>`).join('')}</div><div class="mixlegend">${mix.map(([k, c]) => `<span><i style="background:${(TYPES[k] || TYPES.other).c}"></i>${esc(L().types[k])} · ${c}</span>`).join('')}</div></div>`;
  }
  box.innerHTML = html + '</div></div>';
}
$('insReportBox').addEventListener('click', e => { const el = e.target.closest('[data-id]'); if (el) openMedia(Number(el.dataset.id)); });
