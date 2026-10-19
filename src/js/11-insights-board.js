/* =====================================================================
   Insights board · every kind of work counts in its own unit, charts are widgets you can rearrange
   items → comparable across kinds · time → film/series/anime/music/game (minutes) · pages → books
   ≈ time → optional estimate that turns pages into reading minutes at a pace you choose
   ===================================================================== */
const DEFAULT_UNIT = { film:'time', series:'time', anime:'time', music:'time', game:'time', book:'pages', art:'count', other:'time' };
const unitOf = k => (TYPES[k] && TYPES[k].unit) || DEFAULT_UNIT[k] || 'time';
const PACE = () => Math.max(5, Number(store.get('vmm.pace', '40')) || 40);
const mval = (m, metric) => metric === 'items' ? 1 : metric === 'time' ? (m.runtime || 0) : metric === 'pages' ? (m.pages || 0) : metric === 'est' ? (m.runtime || 0) + (m.pages ? m.pages * 60 / PACE() : 0) : (m.rating || 0);
function agg(items, metric) {
  if (metric === 'rating') { const r = items.filter(m => m.rating > 0); return r.length ? r.reduce((a, m) => a + m.rating, 0) / r.length : 0; }
  return items.reduce((a, m) => a + mval(m, metric), 0);
}
const fmtMetric = (metric, v) => metric === 'items' ? String(Math.round(v)) : metric === 'pages' ? t('u_pages', { n:Math.round(v).toLocaleString() }) : metric === 'rating' ? (v ? v.toFixed(1) + ' ★' : '—') : (v ? fmtRuntime(Math.round(v)) : '—');
/* one line per kind of work, each in its own unit */
function kindRows(items) {
  const g = new Map(); items.forEach(m => (g.get(m.type) || g.set(m.type, []).get(m.type)).push(m));
  return [...g].map(([k, a]) => { const u = unitOf(k), time = a.reduce((s, m) => s + (m.runtime || 0), 0), pages = a.reduce((s, m) => s + (m.pages || 0), 0); return { k, n:a.length, items:a, unit:u, text:u === 'pages' ? (pages ? t('u_pages', { n:pages.toLocaleString() }) : '') : u === 'time' ? (time ? fmtRuntime(time) : '') : '' }; }).sort((a, b) => b.n - a.n);
}
/* slices without a colour of their own are steps of one ramp: the accent, then lighter and lighter (the legend and the hover card name each one) */
function iwRamp(i, n) { const [r, g, b] = hex2rgb(accentHex()), k = n < 2 ? 0 : i / (n - 1) * .72, mix = c => c + (255 - c) * k; return rgb2hex(mix(r), mix(g), mix(b)); }
const ORDERED = new Set(['when', 'rating', 'weekday', 'decade']);
const INS_BY = ['type', 'when', 'rating', 'tag', 'language', 'creator', 'status', 'decade', 'weekday'];
const basisTs = (cfg, m) => cfg.basis === 'added' || cfg.basis === 'lib' ? (m.addedAt || 0) : doneTs(m);
function boardItems(cfg, data) {
  let items = cfg.basis === 'lib' ? data.pool : cfg.basis === 'added' ? data.added : cfg.basis === 'events' ? data.period : data.finished;
  if (cfg.types && cfg.types.length) items = items.filter(m => cfg.types.includes(m.type));
  return items;
}
function whenBuckets(cfg) {
  const loc = locOf(), y = INS.ref.getFullYear();
  if (INS.mode === 'month') { const n = new Date(y, INS.ref.getMonth() + 1, 0).getDate(), out = []; for (let s = 1; s <= n; s += 7) out.push({ key:'w' + s, label:s + '–' + Math.min(n, s + 6), has:ts => { const d = new Date(ts).getDate(); return d >= s && d <= s + 6; } }); return out; }
  if (INS.mode === 'day') return [...Array(24)].map((_, h) => ({ key:'h' + h, label:String(h), has:ts => new Date(ts).getHours() === h }));
  if (INS.mode === 'all') { const ys = media.map(m => new Date(basisTs(cfg, m) || Date.now()).getFullYear()), a = Math.min(...ys, new Date().getFullYear()), b = Math.max(...ys, new Date().getFullYear()); return [...Array(b - a + 1)].map((_, i) => ({ key:'y' + (a + i), label:String(a + i), has:ts => new Date(ts).getFullYear() === a + i })); }
  return [...Array(12)].map((_, i) => ({ key:'m' + i, label:new Date(y, i, 1).toLocaleDateString(loc, { month:'short' }), has:ts => new Date(ts).getMonth() === i }));
}
function groupRows(cfg, items) {
  const metric = cfg.metric || 'items', rows = new Map(), put = (k, label, color, m) => { const r = rows.get(k) || rows.set(k, { key:k, label, color, items:[] }).get(k); r.items.push(m); };
  const by = cfg.by || 'type';
  if (by === 'when') { const bk = whenBuckets(cfg); bk.forEach(b => rows.set(b.key, { key:b.key, label:b.label, items:[] })); items.forEach(m => { const ts = basisTs(cfg, m), b = ts && bk.find(x => x.has(ts)); if (b) rows.get(b.key).items.push(m); }); }
  else items.forEach(m => {
    if (by === 'type') put(m.type, L().types[m.type] || m.type, (TYPES[m.type] || TYPES.other).c, m);
    else if (by === 'rating') { if (m.rating > 0) put(String(Math.round(m.rating * 2) / 2), (Math.round(m.rating * 2) / 2).toFixed(1) + ' ★', null, m); }
    else if (by === 'tag') (m.genre || []).forEach(g => put(g, gname(g), null, m));
    else if (by === 'language') { const l = (m.language || '').trim(); if (l) put(l, l, null, m); }
    else if (by === 'creator') splitNames(m.creator).forEach(n => put(n, n, null, m));
    else if (by === 'status') put(m.status, L().status[m.status] || m.status, null, m);
    else if (by === 'decade') { const d = decadeOf(m.year); if (d) put(d, d, null, m); }
    else if (by === 'weekday') { const ts = basisTs(cfg, m); if (ts) { const w = (new Date(ts).getDay() + 6) % 7; put(String(w), new Date(2024, 0, 1 + w).toLocaleDateString(locOf(), { weekday:'short' }), null, m); } }
  });
  let out = [...rows.values()].map(r => ({ ...r, n:r.items.length, value:agg(r.items, metric) }));
  if (ORDERED.has(by)) out.sort((a, b) => by === 'when' ? 0 : String(a.key).localeCompare(String(b.key), undefined, { numeric:true }));
  else out.sort((a, b) => b.value - a.value || b.n - a.n);
  return out;
}
/* Hover card and "click to view data" (js/03b-tooltip.js, js/11d-insights-data.js). Only the live page has them: a shared card, the
   editor's preview and the exported page are built with TIPS off. A tip's first line is "label<TAB>value<TAB>colour", the rest is detail. */
let TIPS = true, IW_PICKS = new Map();
const tipAttr = (first, ...rest) => TIPS ? ` data-tip="${esc([first, ...rest].filter(Boolean).join('\n'))}"` : '';
const someTitles = items => { const a = (items || []).slice(0, 3).map(m => m.title); return a.length ? a.join(' · ') + (items.length > 3 ? ' +' + (items.length - 3) : '') : ''; };
function pickAttr(cfg, title, items, more) {                    // makes the element open its items in a table when clicked
  if (!TIPS || !items || !items.length) return ''; const k = String(IW_PICKS.size); IW_PICKS.set(k, { cfg, title, items:[...new Set(items)], ...more });
  return ` data-pick="${k}" tabindex="0" role="button" aria-label="${esc(title + ', ' + t('lp_items', { n:new Set(items).size }))}"`;
}
function rowRules(cfg, key) {                                    // the database filter that matches one slice, when there is one
  const by = cfg.by || 'type', r = by === 'tag' ? { p:'genre', op:'has', v:key } : by === 'language' ? { p:'language', op:'is', v:key } : by === 'type' ? { p:'type', op:'is', v:key } : by === 'creator' ? { p:'creator', op:'contains', v:key } : by === 'status' ? { p:'status', op:'is', v:key } : null;
  if (!r) return null; const out = [r]; if (INS.list === 'fav') out.push({ p:'fav', op:'checked', v:'' }); else if (INS.list) out.push({ p:'lists', op:'has', v:INS.list }); return out;
}
function rowTip(r, metric, tot, cfg, color) {
  const v = metric === 'items' ? String(r.n) : fmtMetric(metric, r.value), extra = [tot ? Math.round(r.value / tot * 100) + '%' : '', metric === 'items' ? '' : t('lp_items', { n:r.n })].filter(Boolean).join(' · ');
  return tipAttr(`${r.label}\t${v}\t${color || ''}`, extra, someTitles(r.items)) + pickAttr(cfg, r.label, r.items, { rules:rowRules(cfg, r.key) });
}
const emptyW = () => `<div class="iw-empty">${esc(t('iw_nodata'))}</div>`;
function pieHtml(cfg, rows) {
  const metric = cfg.metric === 'rating' ? 'items' : (cfg.metric || 'items'); rows = rows.filter(r => r.value > 0); if (!rows.length) return emptyW();
  const ordered = ORDERED.has(cfg.by); let list = rows;
  if (!ordered && rows.length > 8) { const rest = rows.slice(7); list = rows.slice(0, 7).concat([{ label:t('iw_other'), value:rest.reduce((a, r) => a + r.value, 0), color:'#9ca3af', n:rest.reduce((a, r) => a + r.n, 0), items:rest.flatMap(r => r.items || []) }]); }
  const tot = list.reduce((a, r) => a + r.value, 0), R = 70, C = 2 * Math.PI * R; let off = 0;
  const col = (r, i) => r.color || iwRamp(i, list.length);
  const arcs = list.map((r, i) => { const len = r.value / tot * C, s = `<circle cx="90" cy="90" r="${R}" fill="none" stroke="${col(r, i)}" stroke-width="26" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 90 90)"${rowTip(r, metric, tot, cfg, col(r, i))}></circle>`; off += len; return s; }).join('');
  return `<div class="iw-pie"><svg viewBox="0 0 180 180" role="img"><circle cx="90" cy="90" r="${R}" fill="none" stroke="currentColor" stroke-opacity=".08" stroke-width="26"/>${arcs}<text x="90" y="92" text-anchor="middle" font-size="${metric === 'items' ? 30 : 17}" font-weight="300" fill="currentColor">${esc(fmtMetric(metric, tot))}</text><text x="90" y="110" text-anchor="middle" font-size="9.5" letter-spacing="1.5" fill="currentColor" fill-opacity=".55">${esc(t('im_' + metric).toUpperCase())}</text></svg>
    <ul class="iw-leg">${list.map((r, i) => `<li${rowTip(r, metric, tot, cfg, col(r, i))}><i style="background:${col(r, i)}"></i><span>${esc(r.label)}</span><b>${esc(fmtMetric(metric, r.value))}</b><em>${Math.round(r.value / tot * 100)}%</em></li>`).join('')}</ul></div>`;
}
function barsHtml(cfg, rows, share) {
  const metric = cfg.metric || 'items', top = cfg.top || 8; if (!rows.some(r => r.value > 0)) return emptyW();
  if (ORDERED.has(cfg.by)) {
    const W = 560, H = 190, pad = 24, max = Math.max(1e-9, ...rows.map(r => r.value)), gw = W / rows.length, bw = Math.min(28, gw - 8);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img">`;
    for (let i = 0; i <= 3; i++) { const y = pad + (H - pad * 2) * i / 3; s += `<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="currentColor" stroke-opacity=".1"/>`; }
    rows.forEach((r, i) => { const bh = (H - pad * 2) * r.value / max, x = gw * i + (gw - bw) / 2; s += `<rect x="${x.toFixed(1)}" y="${(H - pad - bh).toFixed(1)}" width="${bw}" height="${Math.max(0, bh).toFixed(1)}" rx="4" fill="var(--ac)"${rowTip(r, metric, 0, cfg, 'var(--accent)')}></rect>${r.value && rows.length <= 14 ? `<text x="${(x + bw / 2).toFixed(1)}" y="${(H - pad - bh - 5).toFixed(1)}" text-anchor="middle" font-size="10" fill="currentColor" fill-opacity=".7">${metric === 'rating' ? r.value.toFixed(1) : metric === 'items' ? Math.round(r.value) : ''}</text>` : ''}<text x="${(x + bw / 2).toFixed(1)}" y="${H - 7}" text-anchor="middle" font-size="10" fill="currentColor" fill-opacity=".55">${esc(r.label)}</text>`; });
    return `<div class="iw-bars">${s}</svg></div>`;
  }
  const list = rows.filter(r => r.value > 0).slice(0, top), max = list[0].value, tot = metric === 'rating' ? 0 : list.reduce((a, r) => a + r.value, 0);
  return `<div class="iw-hb">${list.map((r, i) => `<div class="iw-hrow"${rowTip(r, metric, tot, cfg, r.color || 'var(--accent)')}><span class="nm">${esc(r.label)}</span><span class="tr"><i style="width:${(r.value / max * 100).toFixed(1)}%;background:${r.color || 'var(--ac)'}"></i></span><b>${esc(fmtMetric(metric, r.value))}</b></div>`).join('')}</div>`;
}
function dayCounts(cfg, items) {                            // day → number of events; counts.info keeps what happened that day for the tooltip
  const c = new Map(), info = c.info = new Map(), bump = (ts, kind, m) => { const k = dayKey(new Date(ts)); c.set(k, (c.get(k) || 0) + 1); const i = info.get(k) || info.set(k, { add:0, done:0, items:[] }).get(k); i[kind]++; i.items.push(m); };
  items.forEach(m => { if (cfg.basis === 'events') { if (m.addedAt) bump(m.addedAt, 'add', m); const d = doneTs(m); if (d) bump(d, 'done', m); } else { const ts = basisTs(cfg, m); if (ts) bump(ts, cfg.basis === 'done' ? 'done' : 'add', m); } });
  return c;
}
function dayTip(cfg, counts, k) {
  const i = counts.info.get(k), d = new Date(...k.split('-').map((v, j) => j === 1 ? v - 1 : +v)).toLocaleDateString(locOf(), { weekday:'short', year:'numeric', month:'short', day:'numeric' });
  const say = i ? [i.add ? t('iw_day_add', { n:i.add }) : '', i.done ? t('iw_day_done', { n:i.done }) : ''].filter(Boolean).join(' · ') : t('iw_day_none');
  return tipAttr(`${d}\t${i ? i.items.length : 0}\t`, i ? say : '', i ? someTitles([...new Set(i.items)]) : '') + (i ? pickAttr(cfg, d, i.items, { day:k }) : (TIPS ? ` aria-label="${esc(d + ', ' + say)}"` : ''));
}
function heatHtml(cfg, data, share) {
  const counts = dayCounts(cfg, cfg.types && cfg.types.length ? data.pool.filter(m => cfg.types.includes(m.type)) : data.pool), now = new Date(), yearOf = INS.mode === 'all' ? null : INS.ref.getFullYear();
  let start, end; if (yearOf === null) { end = now; start = addDays(now, -363); } else { start = new Date(yearOf, 0, 1); end = new Date(yearOf, 11, 31); }
  start = addDays(start, -((start.getDay() + 6) % 7)); const max = Math.max(1, ...counts.values()); let cols = '', months = '', d = new Date(start), lastM = -1, total = 0;
  while (d <= end) {
    let col = '', label = '';
    for (let i = 0; i < 7; i++) { const k = dayKey(d), inY = yearOf === null || d.getFullYear() === yearOf, c = counts.get(k) || 0; if (!inY || (d > now && yearOf === null)) col += '<span class="iw-cell none"></span>'; else { total += c; col += `<button class="iw-cell" data-d="${k}" data-l="${c ? Math.min(4, Math.ceil(c / Math.max(1, max / 4))) : 0}"${dayTip(cfg, counts, k)}></button>`; } if (d.getMonth() !== lastM && inY && d.getDate() <= 7) { label = d.toLocaleDateString(locOf(), { month:'short' }); lastM = d.getMonth(); } d = addDays(d, 1); }
    cols += `<div class="col">${col}</div>`; months += `<span>${esc(label)}</span>`;
  }
  return `<div class="iw-heatwrap"><div class="iw-hm">${months}</div><div class="iw-heat">${cols}</div></div><div class="iw-sub2">${esc(t('heat_sub', { n:total, y:yearOf === null ? t('p_last12') : yearOf }))}</div>`;
}
function calHtml(cfg, data) {
  const base = cfg.types && cfg.types.length ? (cfg.basis === 'events' ? data.pool : data.pool).filter(m => cfg.types.includes(m.type)) : data.pool, counts = dayCounts(cfg, base);
  const y = INS.ref.getFullYear(), months = INS.mode === 'year' || INS.mode === 'all' ? [...Array(12)].map((_, i) => i) : [INS.ref.getMonth()], big = months.length === 1;
  const max = Math.max(1, ...[...counts.entries()].filter(([k]) => k.startsWith(y + '-')).map(e => e[1]));
  const mini = mo => { const first = new Date(y, mo, 1), n = new Date(y, mo + 1, 0).getDate(), off = (first.getDay() + 6) % 7; let cells = '<span></span>'.repeat(off);
    for (let dd = 1; dd <= n; dd++) { const k = dayKey(new Date(y, mo, dd)), c = counts.get(k) || 0; cells += `<button class="iw-cal-d" data-d="${k}" data-l="${c ? Math.min(4, Math.ceil(c / Math.max(1, max / 4))) : 0}"${dayTip(cfg, counts, k)}>${big ? dd : ''}</button>`; }
    const wd = big ? [...Array(7)].map((_, i) => `<i>${esc(new Date(2024, 0, 1 + i).toLocaleDateString(locOf(), { weekday:'narrow' }))}</i>`).join('') : '';
    return `<div class="iw-cal ${big ? 'big' : ''}"><div class="iw-cal-h">${esc(first.toLocaleDateString(locOf(), { month:'long', year:big ? 'numeric' : undefined }))}</div><div class="iw-cal-w">${wd}</div><div class="iw-cal-g">${cells}</div></div>`; };
  return `<div class="iw-cals ${big ? 'one' : ''}">${months.map(mini).join('')}</div>`;
}
function cloudHtml(cfg, rows) {
  const list = rows.filter(r => r.value > 0).slice(0, 40); if (!list.length) return emptyW();
  const max = list[0].value, min = list[list.length - 1].value, order = list.slice().sort((a, b) => hue(a.label) - hue(b.label));
  return `<div class="iw-cloud">${order.map(r => { const k = max === min ? .6 : (r.value - min) / (max - min), sz = Math.round(14 + Math.pow(k, .8) * 30); return `<button class="iw-cw" data-w="${esc(r.label)}" data-raw="${esc(r.key)}" style="font-size:${sz}px;opacity:${(.65 + k * .35).toFixed(2)}"${rowTip(r, 'items', 0, cfg, 'var(--accent)')}>${esc(r.label)}</button>`; }).join('')}</div>`;
}
function radarHtml(cfg, rows) {
  const cats = rows.filter(r => r.value > 0).slice(0, 7); if (cats.length < 3) return `<div class="iw-empty">${esc(t('ins_radar_min'))}</div>`;
  if (cfg.by === 'decade') cats.sort((a, b) => a.key.localeCompare(b.key));
  const n = cats.length, R = 100, Cc = 160, max = Math.max(1, ...cats.map(c => c.value)), pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n, r = R * v / max; return [Cc + r * Math.cos(a), Cc + r * Math.sin(a)]; };
  let s = `<svg viewBox="0 0 320 320" role="img">`;
  for (let g = 1; g <= 4; g++) s += `<polygon points="${cats.map((_, i) => pt(i, max * g / 4).join(',')).join(' ')}" fill="none" stroke="currentColor" stroke-opacity=".14"/>`;
  cats.forEach((c, i) => { const [x, y] = pt(i, max), [lx, ly] = pt(i, max * 1.22), an = Math.abs(lx - Cc) < 8 ? 'middle' : lx > Cc ? 'start' : 'end'; s += `<line x1="${Cc}" y1="${Cc}" x2="${x}" y2="${y}" stroke="currentColor" stroke-opacity=".12"/><text x="${lx}" y="${ly + 4}" text-anchor="${an}" font-size="10.5" fill="currentColor" fill-opacity=".75">${esc([...c.label].slice(0, 12).join(''))}</text>`; });
  s += `<polygon points="${cats.map((c, i) => pt(i, c.value).join(',')).join(' ')}" fill="var(--ac)" fill-opacity=".25" stroke="var(--ac)" stroke-width="1.8" stroke-linejoin="round"/>`;
  const tot = cats.reduce((a, c) => a + c.value, 0); cats.forEach((c, i) => { const [x, y] = pt(i, c.value); s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="var(--ac)" pointer-events="none"/>${TIPS ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="transparent"${rowTip(c, 'items', tot, cfg, 'var(--accent)')}/>` : ''}`; });
  return `<div class="iw-radar">${s}</svg></div>`;
}
function listHtml(cfg, items) {
  const top = cfg.top || 6, list = items.slice().sort((a, b) => cfg.by === 'rating' ? (b.rating || 0) - (a.rating || 0) || basisTs(cfg, b) - basisTs(cfg, a) : basisTs(cfg, b) - basisTs(cfg, a)).slice(0, top); if (!list.length) return emptyW();
  return `<ol class="iw-list">${list.map(m => `<li data-id="${m.id}"><span class="nm">${esc(m.title)}</span><span class="ty">${esc(L().types[m.type] || m.type)}</span>${m.rating ? `<b>★ ${m.rating}</b>` : ''}</li>`).join('')}</ol>`;
}
function kindsHtml(cfg, items) {
  const rows = kindRows(items); if (!rows.length) return emptyW();
  return `<div class="iw-kinds">${rows.map(r => `<div class="iw-kind" style="--kc:${(TYPES[r.k] || TYPES.other).c}"${tipAttr(`${L().types[r.k] || r.k}\t${r.n}\t${(TYPES[r.k] || TYPES.other).c}`, r.text)}${pickAttr(cfg, L().types[r.k] || r.k, r.items, { rules:[{ p:'type', op:'is', v:r.k }] })}><span class="kn">${esc(L().types[r.k] || r.k)}</span><b>${r.n}</b>${r.text ? `<span class="ku">${esc(r.text)}</span>` : `<span class="ku">${esc(t('iw_items_only'))}</span>`}</div>`).join('')}</div>`;
}
const IW_ICON = { tile:'number', pie:'chart-pie', bars:'chart-bar', heat:'calendar-stats', cal:'calendar-month', cloud:'cloud', radar:'radar-2', list:'list-numbers', kinds:'category-2' };
const IW_BYS = { pie:INS_BY, bars:INS_BY, cloud:['tag', 'creator', 'language', 'type'], radar:['tag', 'type', 'language', 'decade', 'creator', 'status'], list:['rating', 'when'] };
const IW_METRICS = { tile:METRICS_ALL(), pie:['items', 'time', 'pages', 'est'], bars:METRICS_ALL() };
function METRICS_ALL() { return ['items', 'time', 'pages', 'est', 'rating']; }
function iwTitle(cfg) {
  if (cfg.title) return cfg.title; const by = cfg.by ? t('ib_' + cfg.by) : '';
  if (cfg.kind === 'tile') return t('im_' + (cfg.metric || 'items')); if (cfg.kind === 'pie' || cfg.kind === 'bars') return t('im_' + (cfg.metric || 'items')) + ' · ' + by;
  return t('iwk_' + cfg.kind) + (by && cfg.kind !== 'list' ? ' · ' + by : '');
}
function widgetHtml(cfg, data, share, quiet) {                  // share: for a card to share · quiet: on screen but without hover and click-through (the editor's preview)
  const items = boardItems(cfg, data), metric = cfg.metric || 'items'; let body = '', note = '';
  const rows = ['pie', 'bars', 'cloud', 'radar'].includes(cfg.kind) ? groupRows(cfg.kind === 'cloud' || cfg.kind === 'radar' ? { ...cfg, metric:'items' } : cfg, items) : null;
  TIPS = !share && !quiet;
  switch (cfg.kind) {
    case 'tile': body = `<div class="iw-tile"><b>${esc(fmtMetric(metric, agg(items, metric)))}</b><span>${esc(t('ibs_' + (cfg.basis || 'done')))}</span></div>`; break;
    case 'pie': body = pieHtml(cfg, rows); break;
    case 'bars': body = barsHtml(cfg, rows, share); break;
    case 'heat': body = heatHtml(cfg, data, share); break;
    case 'cal': body = calHtml(cfg, data); break;
    case 'cloud': body = cloudHtml(cfg, rows); break;
    case 'radar': body = radarHtml(cfg, rows); break;
    case 'list': body = listHtml(cfg, items); break;
    case 'kinds': body = kindsHtml(cfg, items); break;
  }
  TIPS = true;
  if (['tile', 'pie', 'bars'].includes(cfg.kind) && (metric === 'time' || metric === 'pages')) { const miss = items.filter(m => !mval(m, metric)).length; if (miss) note = `<p class="iw-note">${esc(t('iw_excl', { n:miss }))}</p>`; }
  if (metric === 'est' && ['tile', 'pie', 'bars'].includes(cfg.kind) && items.some(m => m.pages)) note += `<p class="iw-note">${esc(t('iw_est_note', { p:PACE() }))}</p>`;
  const sub = ['tile', 'pie', 'bars', 'list', 'kinds', 'cloud', 'radar'].includes(cfg.kind) && cfg.basis ? t('ibs_' + cfg.basis) : '';
  return `<div class="iw ${share && cfg.wide ? 'wide' : ''}" data-w="${esc(cfg.id)}" ${!share ? `style="grid-column:span ${iwSpan(cfg)}"` : ''}><div class="iw-h"><h3>${share ? '' : `<i class="ti ti-${IW_ICON[cfg.kind]}"></i>`}${esc(iwTitle(cfg))}</h3>${sub ? `<span class="iw-s">${esc(sub)}${cfg.types && cfg.types.length ? ' · ' + esc(cfg.types.map(k => L().types[k] || k).join(', ')) : ''}</span>` : ''}</div><div class="iw-b">${body}</div>${note}</div>`;
}
/* ---- layouts: the default one is built in, yours are saved with a name ---- */
const DEFAULT_LAYOUT = [
  { id:'k1', kind:'kinds', basis:'done', wide:true }, { id:'k2', kind:'pie', by:'type', metric:'items', basis:'done' }, { id:'k3', kind:'pie', by:'rating', metric:'items', basis:'done' },
  { id:'k4', kind:'pie', by:'when', metric:'items', basis:'done' }, { id:'k5', kind:'bars', by:'when', metric:'items', basis:'done', wide:true }, { id:'k6', kind:'heat', basis:'events', wide:true },
  { id:'k7', kind:'cal', basis:'events', wide:true }, { id:'k8', kind:'bars', by:'tag', metric:'items', basis:'done' }, { id:'k9', kind:'cloud', by:'tag', basis:'done' },
  { id:'k10', kind:'radar', by:'tag', basis:'lib' }, { id:'k11', kind:'list', by:'rating', basis:'done', top:6 }
];
let INSL = (() => { try { const v = JSON.parse(store.get('vmm.insl', '')); if (v && v.presets) return v; } catch (e) {} return { active:'', presets:{} }; })();
const saveInsl = () => store.set('vmm.insl', JSON.stringify(INSL));
const curLayout = () => INSL.active && INSL.presets[INSL.active] ? INSL.presets[INSL.active] : DEFAULT_LAYOUT;
const iwSpan = cfg => Math.max(2, Math.min(6, cfg.w || (cfg.wide ? 6 : 3)));
function renderBoard(data) {
  const box = $('insBoard'); if (!box) return; INS.data = data; IW_PICKS = new Map();
  box.innerHTML = curLayout().map(cfg => widgetHtml(cfg, data)).join('');
}
/* The page only shows and shares. Everything that changes what it shows (which layout, which widgets, what it counts) is in Settings → Insights. */
$('insShare').onclick = () => openShare('insights');
$('insBoard').addEventListener('click', e => {
  const pk = e.target.closest('[data-pick]'); if (pk) return openInsData(IW_PICKS.get(pk.dataset.pick));
  const d = e.target.closest('[data-d]'); if (d) return insGoDay(d.dataset.d);
  const li = e.target.closest('.iw-list li'); if (li) return openMedia(Number(li.dataset.id));
});
$('insBoard').addEventListener('keydown', e => { const pk = (e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-pick]'); if (pk) { e.preventDefault(); openInsData(IW_PICKS.get(pk.dataset.pick)); } });

$('insMode').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { INS.mode = b.dataset.v; renderInsights(); } });
/* jump to any date: type it ("2020-01-20", "Jan 2020", "2020") or choose year, month, day from lists; no paging with arrows */
function parseWhen(txt) {
  txt = txt.trim(); let m = /^(\d{4})(?:\s*[-\/.年]\s*(\d{1,2})(?:\s*[-\/.月]\s*(\d{1,2}))?)?\s*[月日号]?$/.exec(txt); if (m) return { y:+m[1], m:m[2] ? +m[2] : 0, d:m[3] ? +m[3] : 0 };
  m = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/.exec(txt); if (m) return { y:+m[3], m:+m[2], d:+m[1] };
  const t = Date.parse(txt); if (isNaN(t)) return null; const d = new Date(t), day = /\b\d{1,2}\b(?!\s*,?\s*\d{4}\s*$)|\b\d{1,2}(st|nd|rd|th)\b/i.test(txt.replace(/\d{4}/, '')); return { y:d.getFullYear(), m:d.getMonth() + 1, d:day ? d.getDate() : 0 };
}
function insJump(w) { if (!w || w.y < 1900 || w.y > 2200) return false; INS.ref = new Date(w.y, (w.m || 1) - 1, w.d || 1); INS.mode = w.d ? 'day' : w.m ? 'month' : 'year'; renderInsights(); return true; }
/* calendar: days of a month; click the title for months, again for years. Typing a date still works. */
$('insLabel').onclick = e => {
  const now = new Date(), ys = [...media.map(m => m.addedAt), ...media.map(m => doneTs(m))].filter(Boolean).map(x => new Date(x).getFullYear()), y0 = Math.min(now.getFullYear() - 5, ...ys), y1 = now.getFullYear();
  let v = 'day', y = INS.ref.getFullYear(), mo = INS.ref.getMonth(); const sel = INS.mode === 'all' ? null : INS.ref, loc = locOf();
  const same = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const cell = (lab, data, on, now_, off) => `<button type="button" class="cal-c${on ? ' on' : ''}${now_ ? ' now' : ''}" ${data} ${off ? 'disabled' : ''}>${lab}</button>`;
  const html = () => {
    const mname = i => new Date(2000, i, 1).toLocaleDateString(loc, { month:'short' }); let title, body;
    if (v === 'year') { const s0 = Math.floor(y / 12) * 12; title = s0 + ' – ' + (s0 + 11); body = Array.from({ length:12 }, (_, i) => cell(s0 + i, `data-y="${s0 + i}"`, sel && sel.getFullYear() === s0 + i, s0 + i === y1, s0 + i < y0 || s0 + i > y1)).join(''); }
    else if (v === 'month') { title = String(y); body = Array.from({ length:12 }, (_, i) => cell(mname(i), `data-m="${i}"`, sel && sel.getFullYear() === y && sel.getMonth() === i, y === y1 && i === now.getMonth())).join(''); }
    else {
      title = new Date(y, mo, 1).toLocaleDateString(loc, { year:'numeric', month:'long' }); const lead = (new Date(y, mo, 1).getDay() + 6) % 7, n = new Date(y, mo + 1, 0).getDate();
      body = Array.from({ length:7 }, (_, i) => `<span class="cal-w">${new Date(2024, 0, 1 + i).toLocaleDateString(loc, { weekday:'narrow' })}</span>`).join('') + '<i></i>'.repeat(lead) +
        Array.from({ length:n }, (_, i) => { const d = new Date(y, mo, i + 1); return cell(i + 1, `data-d="${i + 1}"`, sel && same(d, sel), same(d, now), d > now); }).join('');
    }
    return `<input type="text" id="jmpTxt" class="jmp-txt" placeholder="${esc(t('ins_date_ph'))}" aria-label="${esc(t('ins_date_ph'))}" autocomplete="off">
      <div class="cal-h"><button type="button" class="ibtn" data-s="-1" aria-label="${esc(t('prev'))}"><i class="ti ti-chevron-left"></i></button><button type="button" class="cal-t" data-up>${title}</button><button type="button" class="ibtn" data-s="1" aria-label="${esc(t('next'))}"><i class="ti ti-chevron-right"></i></button></div>
      <div class="cal-g cal-${v}">${body}</div>
      <button type="button" class="btn sm cal-today" data-today>${esc(t('p_today'))}</button>`;
  };
  const pick = (yy, mm, dd) => { if (insJump({ y:yy, m:mm, d:dd })) closePop(); };
  openPop(e.currentTarget, html, {
    keydown:ev => { if (ev.key === 'Enter' && ev.target.id === 'jmpTxt') { ev.preventDefault(); if (insJump(parseWhen(ev.target.value))) closePop(); else ev.target.classList.add('bad'); } },
    click:ev => {
      const b = ev.target.closest('button'), D = b && b.dataset; if (!D) return;
      if ('today' in D) return pick(now.getFullYear(), now.getMonth() + 1, now.getDate());
      if (D.d) return pick(y, mo + 1, +D.d);
      if (D.m) return pick(y, +D.m + 1, 0);
      if (D.y) return pick(+D.y, 0, 0);
      if ('up' in D) v = v === 'day' ? 'month' : 'year';
      else if (D.s) { const s = +D.s; if (v === 'day') { const n = new Date(y, mo + s, 1); y = n.getFullYear(); mo = n.getMonth(); } else y += s * (v === 'year' ? 12 : 1); }
      rePop();
    }
  }); setTimeout(() => $('jmpTxt') && $('jmpTxt').focus(), 30);
};

