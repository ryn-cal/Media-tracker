/* =====================================================================
   Library · a database in the Notion sense
   Every field is a typed property you can add, rename, reorder, hide or delete. A view is a saved lens on the same items:
   its own layout (table · gallery · board · list), filters, sorts, grouping and visible properties. Changes save into the current view.
   ===================================================================== */
const PROP_ICON = { action:'player-play', text:'letter-case', number:'hash', select:'selector', multi:'tags', date:'calendar', rating:'star', checkbox:'checkbox', url:'link' };
const PROP_TYPES = ['text', 'number', 'select', 'multi', 'date', 'rating', 'checkbox', 'url'];
const COMMON_LANGS = ['English', '中文', '日本語', '한국어', 'Français', 'Español', 'Deutsch', 'Italiano', 'Português', 'Русский', 'العربية', 'हिन्दी', 'ไทย', 'Tiếng Việt'];
const BUILTIN = [
  { id:'title', type:'text', field:'title', core:true }, { id:'alt', type:'text', field:'alt' }, { id:'type', type:'select', field:'type', src:'types' }, { id:'status', type:'select', field:'status', src:'statuses' },
  { id:'rating', type:'rating', field:'rating' }, { id:'year', type:'number', field:'year' }, { id:'creator', type:'text', field:'creator', sch:true }, { id:'cast', type:'text', field:'cast', sch:true },
  { id:'writers', type:'text', field:'writers', sch:true }, { id:'producers', type:'text', field:'producers', sch:true }, { id:'runtime', type:'number', field:'runtime', sch:true }, { id:'pages', type:'number', field:'pages', sch:true },
  { id:'language', type:'select', field:'language', src:'languages' }, { id:'progress', type:'text', field:'progress' }, { id:'genre', type:'multi', field:'genre', src:'tags' }, { id:'lists', type:'multi', field:'lists', src:'lists' },
  { id:'fav', type:'checkbox', field:'fav' }, { id:'addedAt', type:'date', field:'addedAt', ro:true }, { id:'doneAt', type:'date', field:'doneAt' }, { id:'notes', type:'text', field:'notes' }, { id:'cover', type:'url', field:'cover' }, { id:'open', type:'action', field:'open', ro:true, get:() => '' }
];
/* The database engine below serves two datasets: the tracker ('media') and the files library ('files').
   PCTX says which one the code is working on; a popover remembers it, so its handlers keep working on the right data. */
let PCTX = 'media';
const withCtx = (c, fn) => { const p = PCTX; PCTX = c; try { return fn(); } finally { PCTX = p; } };
const BUILTIN_LABEL = { addedAt:'tc_added', doneAt:'tc_done', genre:'tc_genre', alt:'tc_alt' };
let PDEF = jsonStore('vmm.props', { custom:[], ov:{}, deleted:[], order:[] }); PDEF.custom = PDEF.custom || []; PDEF.ov = PDEF.ov || {}; PDEF.deleted = PDEF.deleted || []; PDEF.order = PDEF.order || [];
let PVER = 0;                                                  // bumped whenever data or property definitions change; keys every cache below
const savePdef = () => { PVER++; store.set('vmm.props', JSON.stringify(PDEF)); };
let AP_CACHE = { k:'', v:null };
function allProps() { const key = PCTX + prefs.lang + PVER; if (AP_CACHE.k === key) return AP_CACHE.v; const v = buildProps(); AP_CACHE = { k:key, v }; return v; }
function buildProps() { if (PCTX === 'files') return filesProps(); const rank = id => { const i = PDEF.order.indexOf(id); return i < 0 ? 1e6 : i; }; return [...BUILTIN.filter(b => !PDEF.deleted.includes(b.id)).map(b => ({ ...b, name:(PDEF.ov[b.id] || {}).name || t(BUILTIN_LABEL[b.id] || 'tc_' + b.id) })), ...PDEF.custom.map(c => ({ ...c, custom:true }))].map((p, i) => [p, i]).sort((a, b) => rank(a[0].id) - rank(b[0].id) || a[1] - b[1]).map(x => x[0]); }
const propById = id => allProps().find(p => p.id === id);
const propLabel = (p, kinds) => p.sch && !(PDEF.ov[p.id] || {}).name && kinds && kinds.size === 1 ? (schemaOf([...kinds][0])[p.id] || p.name) : p.name;
const pGet = (m, p) => p.get ? p.get(m) : p.custom ? (m.props || {})[p.id] : m[p.field];
function pSet(m, p, v) {
  if (p.custom) return { ...m, props:{ ...(m.props || {}), [p.id]:v } };
  const r = { ...m, [p.field]:v };
  if (p.id === 'status') { if (v === 'doing' && m.status !== 'doing') r.startedAt = Date.now(); if (v === 'done' && m.status !== 'done') r.doneAt = Date.now(); }
  if (p.id === 'year' || p.id === 'runtime' || p.id === 'pages') r[p.field] = v === '' || v == null ? null : Number(v);
  return r;
}
const STATUS_COL = { want:'#4f6bd8', doing:'#e08a00', done:'#22a559', dropped:'#8a8a85' };
const hsl = (h, s, l) => `hsl(${h} ${s || 60}% ${l || 48}%)`;
const OPT_CACHE = new Map();
function propOpts(p) { const k = PCTX + '|' + p.id + p.src + '|' + PVER + prefs.lang; let r = OPT_CACHE.get(k); if (!r) { r = computeOpts(p); if (OPT_CACHE.size > 300) OPT_CACHE.clear(); OPT_CACHE.set(k, r); } return r; }
function computeOpts(p) {
  if (p.optsFn) return p.optsFn();
  const pool = PCTX === 'files' ? files : media;
  if (p.custom) return (p.opts || []).map(o => ({ id:o.id, label:o.name, color:o.color }));
  if (p.src === 'types') return Object.keys(TYPES).map(k => ({ id:k, label:L().types[k] || k, color:TYPES[k].c }));
  if (p.src === 'statuses') return Object.keys(STATUSES).map(k => ({ id:k, label:L().status[k], color:STATUS_COL[k] }));
  if (p.src === 'lists') return LISTS.map(l => ({ id:l.id, label:l.name, color:l.color }));
  if (p.src === 'languages') { const used = new Map(); pool.forEach(m => { const l = (m.language || '').trim(); if (l) used.set(l, (used.get(l) || 0) + 1); }); return [...new Set([...COMMON_LANGS, ...used.keys()])].map(l => ({ id:l, label:l, color:'var(--accent)', n:used.get(l) || 0 })); }
  if (p.src === 'tags') { const c = new Map(); pool.forEach(m => (m.genre || []).forEach(g => c.set(g, (c.get(g) || 0) + 1))); return [...c].sort((a, b) => b[1] - a[1]).map(([g, n]) => ({ id:g, label:gname(g), color:tagColor(g), n })); }
  return [];
}
const OPT_MAP = new Map();
const optOf = (p, id) => { const k = PCTX + '|' + p.id + p.src + '|' + PVER + prefs.lang; let m = OPT_MAP.get(k); if (!m) { m = new Map(propOpts(p).map(o => [o.id, o])); if (OPT_MAP.size > 300) OPT_MAP.clear(); OPT_MAP.set(k, m); } return m.get(id); };
const optLabel = (p, id) => { const o = optOf(p, id); return o ? o.label : id; };
const optColor = (p, id) => { const o = optOf(p, id); return o ? o.color : 'var(--accent)'; };
const tagPill = (label, color) => `<span class="lp" style="--c:${esc(color)}">${esc(label)}</span>`;
/* ---------- views ---------- */
const DEFAULT_VIS = ['fav', 'title', 'open', 'type', 'status', 'rating', 'year', 'creator', 'language', 'genre'];
function defaultViews() {
  return [
    { id:'v_all', name:t('lib_v_all'), icon:'table', layout:'table', filters:{ mode:'and', rules:[] }, sorts:[{ p:'addedAt', dir:'desc' }], group:'', vis:DEFAULT_VIS.slice(), cover:true },
    { id:'v_posters', name:t('lv_posters'), icon:'layout-grid', layout:'gallery', filters:{ mode:'and', rules:[] }, sorts:[{ p:'addedAt', dir:'desc' }], group:'', vis:['fav', 'type', 'creator', 'year', 'rating', 'status', 'genre', 'language'], cover:true },
    { id:'v_status', name:t('lib_v_status'), icon:'layout-kanban', layout:'board', boardBy:'status', filters:{ mode:'and', rules:[] }, sorts:[{ p:'addedAt', dir:'desc' }], group:'', vis:['type', 'rating', 'genre'], cover:true }
  ];
}
/* the three starter views are saved with their name in the language they were made in; shown in the current language until the user renames one */
const VIEW_NAME_KEY = { v_all:'lib_v_all', v_posters:'lv_posters', v_status:'lib_v_status', f_all:'lib_v_all', f_cards:'lv_posters' };
const viewName = v => { const k = VIEW_NAME_KEY[v.id]; return k && (v.name === I18N.en[k] || v.name === I18N.zh[k]) ? t(k) : v.name; };
const LIB = { views:jsonStore('vmm.views', null), active:store.get('vmm.view', ''), q:'', temp:[] };
const saveViews = () => { store.set('vmm.views', JSON.stringify(LIB.views)); store.set('vmm.view', LIB.active); };
function ensureViews() { if (Array.isArray(LIB.views) && !LIB.openMig) { LIB.openMig = 1; LIB.views.forEach(v => { if (v.layout === 'table' && v.vis && !v.vis.includes('open')) v.vis.splice(Math.max(1, v.vis.indexOf('title') + 1), 0, 'open'); }); saveViews(); } if (!Array.isArray(LIB.views) || !LIB.views.length) { LIB.views = defaultViews(); LIB.active = LIB.views[0].id; saveViews(); } if (!LIB.views.some(v => v.id === LIB.active)) LIB.active = LIB.views[0].id; }
const curView = () => { ensureViews(); return LIB.views.find(v => v.id === LIB.active); };
const LAYOUTS = [['table', 'table', 'lv_table'], ['gallery', 'layout-grid', 'lv_posters'], ['board', 'layout-kanban', 'lib_board'], ['list', 'list', 'lv_rows']];
const newViewId = () => 'v_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4);
/* ---------- filter rules ---------- */
const OPS = { action:['notempty'], text:['contains', 'is', 'isnot', 'empty', 'notempty'], url:['contains', 'empty', 'notempty'], number:['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'empty', 'notempty'], rating:['gte', 'lte', 'eq', 'empty', 'notempty'], select:['is', 'isnot', 'empty', 'notempty'], multi:['has', 'hasnot', 'empty', 'notempty'], date:['before', 'after', 'lastdays', 'empty', 'notempty'], checkbox:['checked', 'unchecked'] };
const NOVAL = new Set(['empty', 'notempty', 'checked', 'unchecked']);
const isEmptyVal = (p, v) => p.type === 'action' ? false : v == null || v === '' || v === 0 && p.type === 'rating' || Array.isArray(v) && !v.length || v === false && p.type !== 'checkbox';
function matchRule(m, r) {
  const p = propById(r.p); if (!p) return true; const v = pGet(m, p), op = r.op, rv = r.v;
  if (op === 'empty') return isEmptyVal(p, v); if (op === 'notempty') return !isEmptyVal(p, v);
  if (p.type === 'checkbox') return op === 'checked' ? !!v : !v;
  if (p.type === 'text' || p.type === 'url') { const a = String(v || '').toLowerCase(), b = String(rv || '').toLowerCase(); return op === 'contains' ? a.includes(b) : op === 'is' ? a === b : a !== b; }
  if (p.type === 'number' || p.type === 'rating') { if (v == null || v === '') return false; const a = Number(v), b = Number(rv); return op === 'eq' ? a === b : op === 'neq' ? a !== b : op === 'gt' ? a > b : op === 'gte' ? a >= b : op === 'lt' ? a < b : a <= b; }
  if (p.type === 'select') { const a = String(v == null ? '' : v).trim(); return op === 'is' ? a === rv : a !== rv; }
  if (p.type === 'multi') { const has = (v || []).includes(rv); return op === 'has' ? has : !has; }
  if (p.type === 'date') { if (!v) return false; const d = Number(v), b = rv ? new Date(rv).getTime() : 0; return op === 'before' ? d < b : op === 'after' ? d >= b + 864e5 : d >= Date.now() - (Number(rv) || 30) * 864e5; }
  return true;
}
const rulesOf = v => (v.filters && v.filters.rules || []).filter(r => r.p && (NOVAL.has(r.op) || r.v !== '' && r.v != null));
function sortVal(m, p, listId) {
  if (p === '_order') { const o = (LISTORDER[listId] || []).indexOf(m.id); return o < 0 ? 1e9 + (m.addedAt || 0) : o; }
  const pr = propById(p); if (!pr) return null; const v = pGet(m, pr);
  if (pr.type === 'select') return v ? optLabel(pr, v) : null; if (pr.type === 'multi') return (v || []).length ? optLabel(pr, v[0]) : null;
  if (pr.type === 'checkbox') return v ? 1 : 0; if (v == null || v === '' || v === 0 && pr.type === 'rating') return null; return pr.type === 'number' || pr.type === 'rating' || pr.type === 'date' ? Number(v) : String(v);
}
function runView(view, items, ctx) {
  ctx = ctx || {}; const rules = rulesOf(view).concat(ctx.noTemp ? [] : LIB.temp), q = ctx.q != null ? ctx.q : LIB.q, col = collator();
  let out = items.filter(m => { const okRules = !rules.length || (view.filters.mode === 'or' && !LIB.temp.length ? rules.some(r => matchRule(m, r)) : rules.every(r => matchRule(m, r))); if (!okRules) return false; return !q || (ctx.hay ? ctx.hay(m) : [m.title, m.alt, m.creator, m.cast, m.writers, m.producers, m.notes, ...(m.genre || []).map(gname)]).some(x => (x || '').toLowerCase().includes(q)); });
  const sorts = (view.sorts || []).filter(s => s.p);
  if (sorts.length) {                                              // decorate once, sort on the stored keys, undecorate
    const keyed = out.map(m => ({ m, k:sorts.map(s => sortVal(m, s.p, ctx.listId)) }));
    keyed.sort((a, b) => { for (let i = 0; i < sorts.length; i++) { const x = a.k[i], y = b.k[i], d = sorts[i].dir === 'desc' ? -1 : 1; if (x == null && y == null) continue; if (x == null) return 1; if (y == null) return -1; const c = typeof x === 'number' && typeof y === 'number' ? x - y : col.compare(String(x), String(y)); if (c) return c * d; } return (b.m.addedAt || 0) - (a.m.addedAt || 0); });
    out = keyed.map(x => x.m);
  }
  return out;
}
function groupBy(view, list) {
  const p = propById(view.group); if (!p) return null; const out = new Map(), add = (k, label, color, m) => { if (!out.has(k)) out.set(k, { key:k, label, color, items:[] }); out.get(k).items.push(m); };
  list.forEach(m => { const v = pGet(m, p);
    if (p.type === 'multi') { (v || []).length ? v.forEach(x => add(x, optLabel(p, x), optColor(p, x), m)) : add('~', t('lib_none'), null, m); }
    else if (p.type === 'select') v ? add(v, optLabel(p, v), optColor(p, v), m) : add('~', t('lib_none'), null, m);
    else if (p.type === 'rating') add(v ? 'r' + Math.ceil(v) : '~', v ? '★'.repeat(Math.ceil(v)) : t('unrated'), null, m);
    else if (p.type === 'checkbox') add(v ? 'y' : 'n', t(v ? 'lib_yes' : 'lib_no'), null, m);
    else if (p.type === 'date') { const y = v ? new Date(Number(v)).getFullYear() : ''; add(y || '~', y || t('lib_none'), null, m); }
    else if (p.type === 'number') { const d = p.bucket ? (v ? p.bucket(v) : '') : p.id === 'year' ? decadeOf(v) : ''; add(d || '~', d || t('lib_none'), null, m); }
    else { const c = ([...String(v || '')][0] || '').toUpperCase(); add(c || '~', c || t('lib_none'), null, m); } });
  let arr = [...out.values()]; const order = p.type === 'select' || p.type === 'multi' ? propOpts(p).map(o => o.id) : p.bucketOrder || null;
  arr.sort((a, b) => a.key === '~' ? 1 : b.key === '~' ? -1 : order ? order.indexOf(a.key) - order.indexOf(b.key) : p.type === 'rating' || p.type === 'date' || p.id === 'year' ? String(b.key).localeCompare(String(a.key), undefined, { numeric:true }) : collator().compare(a.label, b.label));
  return arr;
}
/* ---------- popovers ---------- */
let POP = null;
function closePop() { if (POP) { POP.el.remove(); POP = null; } }
function openPop(anchor, html, handlers, cls) {
  closePop(); const el = document.createElement('div'); el.className = 'pop ' + (cls || ''); el.innerHTML = html(); document.body.appendChild(el);
  const place = () => { const r = anchor.getBoundingClientRect(); el.style.left = Math.max(8, Math.min(r.left, innerWidth - el.offsetWidth - 8)) + 'px'; el.style.top = Math.max(8, Math.min(r.bottom + 6, innerHeight - el.offsetHeight - 8)) + 'px'; };
  POP = { el, anchor, html, place, h:handlers, ctx:PCTX }; place();
  ['click', 'change', 'input', 'keydown'].forEach(ev => el.addEventListener(ev, e => { const f = handlers[ev]; if (f) withCtx(POP.ctx, () => f(e, POP)); }));
  return POP;
}
const rePop = () => { if (POP) { const sc = POP.el.scrollTop; POP.el.innerHTML = withCtx(POP.ctx, POP.html); POP.place(); POP.el.scrollTop = sc; } };
document.addEventListener('mousedown', e => { if (POP && !POP.el.contains(e.target) && !(POP.anchor && POP.anchor.contains && POP.anchor.contains(e.target)) && !e.target.closest('.pop')) closePop(); }, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); });
addEventListener('scroll', e => { if (POP && !POP.el.contains(e.target)) closePop(); }, { passive:true, capture:true });
/* a "host" is whatever owns a view: the library, or one list */
const libHost = () => ({ ctx:'media', filterBtn:() => $('lbFilter'), st:LIB, layouts:LAYOUTS, view:curView, save:saveViews, render:() => renderTracker(), orderable:false, mkView:(name, layout) => ({ id:newViewId(), name, icon:LAYOUTS.find(l => l[0] === layout)[1], layout, boardBy:'status', filters:{ mode:'and', rules:[] }, sorts:[{ p:'addedAt', dir:'desc' }], group:'', vis:curView().vis.slice(), cover:true }) });
function listHost(id) { return { view:() => listView(id), save:() => saveListViews(), render:() => renderListsPage(), orderable:true, listId:id }; }
const opLabel = op => t('op_' + op);
function ruleValueHtml(p, r, i) {
  if (!p || NOVAL.has(r.op)) return '';
  if (p.type === 'select' || p.type === 'multi') return `<select data-f="v" data-i="${i}"><option value="">—</option>${propOpts(p).map(o => `<option value="${esc(o.id)}" ${String(r.v) === String(o.id) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
  const ty = p.type === 'number' || p.type === 'rating' ? 'number' : p.type === 'date' && r.op !== 'lastdays' ? 'date' : r.op === 'lastdays' ? 'number' : 'text';
  return `<input type="${ty}" data-f="v" data-i="${i}" value="${esc(r.v == null ? '' : r.v)}" ${p.type === 'rating' ? 'min="0" max="5" step="0.5"' : ''} placeholder="${esc(t('lib_value'))}">`;
}
function filterPopHtml(host) {
  const v = host.view(), rules = v.filters.rules, props = allProps();
  return `<div class="pop-h">${esc(t('lib_filter'))}${rules.length > 1 ? `<span class="seg-mini"><button data-mode="and" aria-pressed="${v.filters.mode !== 'or'}">${esc(t('lib_all'))}</button><button data-mode="or" aria-pressed="${v.filters.mode === 'or'}">${esc(t('lib_any'))}</button></span>` : ''}</div>
    ${rules.map((r, i) => { const p = propById(r.p); return `<div class="fr"><select data-f="p" data-i="${i}">${props.map(x => `<option value="${esc(x.id)}" ${x.id === r.p ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select><select data-f="op" data-i="${i}">${(p ? OPS[p.type] : []).map(o => `<option value="${o}" ${o === r.op ? 'selected' : ''}>${esc(opLabel(o))}</option>`).join('')}</select>${ruleValueHtml(p, r, i)}<button class="ibtn sm" data-act="rm" data-i="${i}" aria-label="${esc(t('lp_remove'))}"><i class="ti ti-x"></i></button></div>`; }).join('') || `<div class="pop-empty">${esc(t('lib_no_filter'))}</div>`}
    <button class="pop-add" data-act="add"><i class="ti ti-plus"></i>${esc(t('lib_add_filter'))}</button>${rules.length ? `<button class="pop-add danger" data-act="clear"><i class="ti ti-trash"></i>${esc(t('lib_clear_filters'))}</button>` : ''}`;
}
function openFilterPop(anchor, host) {
  const firstOp = p => (OPS[p.type] || [])[0], upd = (e) => { const el = e.target, i = Number(el.dataset.i), r = host.view().filters.rules[i], f = el.dataset.f; if (!r) return; if (f === 'p') { r.p = el.value; const p = propById(r.p); r.op = firstOp(p); r.v = ''; } else if (f === 'op') { r.op = el.value; if (NOVAL.has(r.op)) r.v = ''; } else if (f === 'v') r.v = el.value; host.save(); host.render(); if (f !== 'v') rePop(); };
  openPop(anchor, () => filterPopHtml(host), {
    click:(e) => { const b = e.target.closest('[data-act],[data-mode]'); if (!b) return; const v = host.view();
      if (b.dataset.mode) { v.filters.mode = b.dataset.mode; } else if (b.dataset.act === 'add') { const p = propById('type') || allProps()[0]; v.filters.rules.push({ p:p.id, op:firstOp(p), v:'' }); } else if (b.dataset.act === 'rm') v.filters.rules.splice(Number(b.dataset.i), 1); else if (b.dataset.act === 'clear') v.filters.rules = [];
      host.save(); host.render(); rePop(); },
    change:upd, input:(e) => { if (e.target.dataset.f === 'v' && e.target.tagName === 'INPUT') { const r = host.view().filters.rules[Number(e.target.dataset.i)]; if (r) { r.v = e.target.value; host.save(); host.render(); } } }
  }, 'pop-wide');
}
function sortPopHtml(host) {
  const v = host.view(), props = allProps(); const opts = (sel) => (host.orderable && (sel === '_order' || !v.sorts.some(s => s.p === '_order')) ? `<option value="_order" ${sel === '_order' ? 'selected' : ''}>${esc(t('lds_custom'))}</option>` : '') + props.filter(x => x.id === sel || !v.sorts.some(s => s.p === x.id)).map(x => `<option value="${esc(x.id)}" ${x.id === sel ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
  return `<div class="pop-h">${esc(t('lib_sort'))}</div>${v.sorts.map((s, i) => `<div class="fr"><select data-f="p" data-i="${i}">${opts(s.p)}</select><button class="ibtn sm dirbtn" data-act="dir" data-i="${i}" title="${esc(t(s.dir === 'desc' ? 'lib_desc' : 'lib_asc'))}" aria-label="${esc(t(s.dir === 'desc' ? 'lib_desc' : 'lib_asc'))}"><i class="ti ti-arrow-${s.dir === 'desc' ? 'down' : 'up'}"></i></button>${i ? `<button class="ibtn sm" data-act="up" data-i="${i}" aria-label="${esc(t('ls_up'))}"><i class="ti ti-arrow-up-bar"></i></button>` : ''}<button class="ibtn sm" data-act="rm" data-i="${i}" aria-label="${esc(t('lp_remove'))}"><i class="ti ti-x"></i></button></div>`).join('') || `<div class="pop-empty">${esc(t('lib_no_sort'))}</div>`}
    ${v.sorts.length < props.length ? `<button class="pop-add" data-act="add"><i class="ti ti-plus"></i>${esc(t('lib_add_sort'))}</button>` : ''}`;
}
function openSortPop(anchor, host) {
  openPop(anchor, () => sortPopHtml(host), {
    click:e => { const b = e.target.closest('[data-act]'); if (!b) return; const v = host.view(), i = Number(b.dataset.i);
      if (b.dataset.act === 'add') v.sorts.push({ p:host.orderable && !v.sorts.some(s => s.p === '_order') ? '_order' : (allProps().find(p => !v.sorts.some(s => s.p === p.id)) || allProps()[0]).id, dir:'asc' }); else if (b.dataset.act === 'dir') v.sorts[i].dir = v.sorts[i].dir === 'desc' ? 'asc' : 'desc'; else if (b.dataset.act === 'rm') v.sorts.splice(i, 1); else if (b.dataset.act === 'up') [v.sorts[i - 1], v.sorts[i]] = [v.sorts[i], v.sorts[i - 1]];
      host.save(); host.render(); rePop(); },
    change:e => { const s = host.view().sorts[Number(e.target.dataset.i)]; if (!s) return; s[e.target.dataset.f] = e.target.value; host.save(); host.render(); rePop(); }
  });
}
function propsPopHtml(host) {
  const v = host.view(), all = allProps(), vis = v.vis.map(id => all.find(p => p.id === id)).filter(Boolean), hid = all.filter(p => !v.vis.includes(p.id) && p.id !== 'cover'), kinds = new Set(media.map(m => m.type));
  const row = (p, on) => `<div class="pr-row ${on ? 'vis' : ''}" data-id="${esc(p.id)}">${on ? gripHtml() : ''}<i class="ti ti-${PROP_ICON[p.type]}"></i><span>${esc(propLabel(p, kinds))}</span>${p.core ? `<span class="eye dim" aria-hidden="true"><i class="ti ti-eye"></i></span>` : `<button class="eye" data-act="${on ? 'hide' : 'show'}" data-id="${esc(p.id)}" title="${esc(t(on ? 'lib_hide' : 'lib_show'))}" aria-label="${esc(t(on ? 'lib_hide' : 'lib_show'))}"><i class="ti ti-eye${on ? '' : '-off'}"></i></button>`}</div>`;
  return `<div class="pop-h pop-h-row"><span>${esc(t('lib_properties'))}</span>${vis.some(p => !p.core) ? `<button type="button" class="linkbtn2" data-act="hideall">${esc(t('lib_hide_all'))}</button>` : hid.length ? `<button type="button" class="linkbtn2" data-act="showall">${esc(t('lib_show_all'))}</button>` : ''}</div>${v.layout === 'gallery' || v.layout === 'board' || v.layout === 'list' || host.ctx === 'files' ? `<div class="pr-size"><span>${esc(t('tc_cover'))}</span><div class="seg" role="group" aria-label="${esc(t('tc_cover'))}">${[['off', t('cover_off')], ['s', 'S'], ['m', 'M'], ['l', 'L']].map(([k, l]) => `<button type="button" data-act="size" data-v="${k}" aria-pressed="${k === 'off' ? v.cover === false : v.cover !== false && (v.size || 'm') === k}">${esc(l)}</button>`).join('')}</div></div>` : ''}${vis.map(p => row(p, true)).join('')}${hid.length ? `<div class="pop-sub">${esc(t('lib_hidden_props'))}</div>${hid.map(p => row(p, false)).join('')}` : ''}
    ${host.ctx === 'files' ? '' : `<button class="pop-add" data-act="new"><i class="ti ti-plus"></i>${esc(t('lib_new_prop'))}</button>`}`;
}
function openPropsPop(anchor, host) {
  const pop = openPop(anchor, () => propsPopHtml(host), {
    click:e => { const b = e.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT' || b.tagName === 'INPUT') return; const v = host.view(), id = b.dataset.id, i = v.vis.indexOf(id), a = b.dataset.act;
      if (a === 'size') { if (b.dataset.v === 'off') v.cover = false; else { delete v.cover; v.size = b.dataset.v; } host.save(); host.render(); return rePop(); }       // one control: Off, or a size
      if (a === 'new') { closePop(); return goPropSettings(null); } if (a === 'hideall') v.vis = v.vis.filter(x => (allProps().find(p => p.id === x) || {}).core); else if (a === 'showall') allProps().forEach(p => { if (p.id !== 'cover' && !v.vis.includes(p.id)) v.vis.push(p.id); }); else if (a === 'hide') v.vis.splice(i, 1); else if (a === 'show') v.vis.push(id);
      host.save(); host.render(); rePop(); }
  });
  sortList(pop.el, { row:'.pr-row.vis', grip:'.grip', done:ids => { host.view().vis = ids; host.save(); host.render(); rePop(); } });
}
function createProp(name, type, host) {
  const id = 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 3), p = { id, name, type }; if (type === 'select' || type === 'multi') p.opts = [];
  PDEF.custom.push(p); savePdef(); const v = host && host.view(); if (v) v.vis.push(id); if (host) host.save(); renderTracker(); if (curTab === 'lists') renderListsPage();
}
const $q = (s, r) => (r || document).querySelector(s);
/* ---------- selecting values (cells, drawer) ---------- */
function openValuePop(anchor, p, m, done) {
  const cur = pGet(m, p), multi = p.type === 'multi', set = new Set(multi ? (cur || []) : cur ? [cur] : []), canAdd = p.custom || p.src === 'tags' || p.src === 'languages';
  openPop(anchor, () => `<div class="vp">${propOpts(p).slice(0, 400).map(o => `<button class="vp-o" data-v="${esc(o.id)}" aria-pressed="${set.has(o.id)}">${tagPill(o.label, o.color)}</button>`).join('') || `<div class="pop-empty">${esc(t('lib_no_options'))}</div>`}</div>${p.type === 'select' && cur ? `<button class="pop-add" data-act="clear"><i class="ti ti-x"></i>${esc(t('lib_clear_value'))}</button>` : ''}${canAdd ? `<input type="text" id="vpNew" placeholder="${esc(t('lib_add_option'))}" maxlength="40" autocomplete="off">` : ''}`, {
    click:async e => { const o = e.target.closest('.vp-o'), c = e.target.closest('[data-act="clear"]'); let val;
      if (c) val = null; else if (o) { const id = o.dataset.v; if (multi) { set.has(id) ? set.delete(id) : set.add(id); val = [...set]; } else val = id; } else return;
      await done(val); if (multi) rePop(); else closePop(); },
    keydown:async e => { if (e.key === 'Enter' && e.target.id === 'vpNew') { e.preventDefault(); const name = e.target.value.trim(); if (!name) return; let id = name; if (p.custom) { let o = p.opts.find(x => x.name.toLowerCase() === name.toLowerCase()); if (!o) { o = { id:'o' + Date.now().toString(36), name, color:accentHex() }; p.opts.push(o); savePdef(); } id = o.id; } const val = multi ? [...new Set([...set, id])] : id; set.add(id); await done(val); multi ? rePop() : closePop(); } }
  }, 'pop-vals'); setTimeout(() => $('vpNew') && $('vpNew').focus(), 30);
}
async function saveItem(m) { await DB.put('media', m); const i = media.findIndex(x => x.id === m.id); if (i >= 0) media[i] = m; }
async function editCell(td) {
  const tr = td.closest('tr'), id = Number(tr.dataset.id), m = media.find(x => x.id === id), p = propById(td.dataset.p); if (!m || !p || p.ro) return;
  if (p.id === 'progress' && followsFile(m)) return toast(t('prog_follows'));        // set by the file's position; open the file to change it
  const commit = async v => { await saveItem(pSet(m, p, v)); await reload(); };
  if (p.type === 'checkbox') return commit(!pGet(m, p));
  if (p.type === 'select' || p.type === 'multi') return openValuePop(td, p, m, v => commit(v == null ? (p.type === 'multi' ? [] : '') : v));
  if (p.type === 'rating') { openPop(td, () => `<div class="rate" id="cellRate"></div>`, {}); const rw = rateWidget($('cellRate')); rw.set(pGet(m, p) || 0); $('cellRate').addEventListener('click', () => setTimeout(async () => { await commit(rw.get()); closePop(); }, 0)); return; }
  const inp = document.createElement('input'); inp.className = 'cell-in'; inp.type = p.type === 'number' ? 'number' : p.type === 'date' ? 'date' : 'text'; const cur = pGet(m, p);
  inp.value = p.type === 'date' && cur ? new Date(Number(cur)).toISOString().slice(0, 10) : cur == null ? '' : cur; td.innerHTML = ''; td.appendChild(inp); inp.focus(); inp.select && inp.select();
  let fin = false; const done = async save => { if (fin) return; fin = true; if (save) { let v = inp.value; if (p.type === 'date') v = v ? new Date(v).getTime() : null; else if (p.type === 'number') v = v === '' ? null : Number(v); else v = v.trim(); await commit(v); } else renderTracker(); };
  inp.onkeydown = e => { if (e.key === 'Enter') done(true); else if (e.key === 'Escape') done(false); }; inp.onblur = () => done(true);
}
/* ---------- cells & layouts ---------- */
function cellHtml(m, p) {
  if (p.id === 'open') return openMediaBtn(m);
  const v = pGet(m, p);
  if (p.sch && !schemaOf(m.type)[p.id]) return '<span class="na">–</span>';
  switch (p.type) {
    case 'checkbox': return p.id === 'fav' ? `<button class="heart-cell ${v ? 'on' : ''}" data-fav aria-label="${esc(t('fav_toggle'))}" aria-pressed="${!!v}">${heartSvg(v)}</button>` : `<span class="cbx ${v ? 'on' : ''}"><i class="ti ti-check"></i></span>`;
    case 'select': return v ? (p.id === 'type' ? `<span class="lp" style="--c:${esc(optColor(p, v))}"><i class="ti ti-${(TYPES[v] || TYPES.other).i}"></i>${esc(optLabel(p, v))}</span>` : tagPill(optLabel(p, v), optColor(p, v))) : '';
    case 'multi': return (v || []).slice(0, 5).map(x => tagPill(optLabel(p, x), optColor(p, x))).join('');
    case 'rating': return starsHtml(v);
    case 'date': return v ? new Date(Number(v)).toLocaleDateString(locOf()) : '';
    case 'url': return v ? `<a href="${esc(safeUrl(v))}" target="_blank" rel="noopener" class="cell-link">${esc(String(v).replace(/^https?:\/\//, '').slice(0, 40))}</a>` : '';
    case 'number': return v == null || v === '' ? '' : p.id === 'runtime' ? esc(fmtRuntime(v)) : p.id === 'pages' ? esc(t('u_pages', { n:v })) : esc(v);
    default: if (p.id === 'progress') return esc(progressOf(m));       // a linked item shows its file's position: one progress, not two
      return p.id === 'title' ? `<div class="tt-row"><div class="tt-main"><div class="tt">${esc(m.title)}</div>${m.alt && !(curView().vis || []).includes('alt') ? `<div class="ts">${esc(m.alt)}</div>` : ''}</div></div>` : p.id === 'notes' ? `<div class="tnotes">${esc(v || '')}</div>` : esc(v == null ? '' : v);
  }
}
function tableHtml(items, view, ctx) {
  ctx = ctx || {}; const all = allProps(), kinds = new Set(items.map(m => m.type)), cols = view.vis.map(id => all.find(p => p.id === id)).filter(Boolean).filter(p => !p.sch || items.some(m => schemaOf(m.type)[p.id]) || !items.length);
  const sortOf = id => (view.sorts || []).find(s => s.p === id);
  const head = cols.map(p => { const s = sortOf(p.id); return `<th data-p="${esc(p.id)}" tabindex="0"${view.widths && view.widths[p.id] ? ` style="width:${view.widths[p.id]}px;min-width:${view.widths[p.id]}px;max-width:${view.widths[p.id]}px"` : ''}${s ? ` aria-sort="${s.dir === 'desc' ? 'descending' : 'ascending'}"` : ''} class="${p.id === 'fav' ? 'ck' : ''}"><i class="ti ti-${PROP_ICON[p.type]}"></i><span${p.id === 'fav' ? ' class="sr-only"' : ''}>${esc(propLabel(p, kinds))}</span>${s ? `<i class="ti ti-arrow-${s.dir === 'desc' ? 'down' : 'up'} sd"></i>` : ''}${ctx.noAdd ? '' : '<span class="rsz" data-rsz></span>'}</th>`; }).join('');
  return `<div class="dtable-wrap"><table class="dtable"><thead><tr>${ctx.noAdd ? '' : `<th class="ck pick"><input type="checkbox" data-all aria-label="${esc(t('select'))}"${items.length && items.every(m => TS.sel.has(m.id)) ? ' checked' : ''}></th>`}${head}${ctx.noAdd ? '' : `<th class="ck add" data-newprop title="${esc(t('lib_new_prop'))}"><i class="ti ti-plus" aria-hidden="true"></i><span class="sr-only">${esc(t('lib_new_prop'))}</span></th>`}</tr></thead><tbody>${items.map(m => `<tr data-id="${m.id}" tabindex="0" class="${TS.sel.has(m.id) ? 'sel' : ''}">${ctx.noAdd ? '' : `<td class="ck pick"><input type="checkbox" data-ck ${TS.sel.has(m.id) ? 'checked' : ''} aria-label="${esc(m.title)}"></td>`}${cols.map(p => `<td data-p="${esc(p.id)}" class="tc-${p.type} ${p.id === 'title' ? 'tc-title' : ''}">${cellHtml(m, p)}</td>`).join('')}${ctx.noAdd ? '' : '<td class="ck"></td>'}</tr>`).join('')}</tbody>${ctx.noAdd ? '' : calcFootHtml(view, cols, CALC_ALL || items, 1, 1)}</table></div>`;
}
let CUR_VIS = null;
const VIS_MAP = { cover:['cover'], fav:['fav'], type:['type'], sub:['creator', 'year'], meta:['runtime', 'pages', 'language'], progress:['progress'], rating:['rating'], tags:['genre'], status:['status'] };
/* cover size: S / M / L, kept per view and applied as CSS variables on the grid */
const COVER_SIZES = { s:{ cw:'118px', cwm:'100px', rw:'26px', ba:'3/1', tw:'72px' }, m:{ cw:'168px', cwm:'150px', rw:'36px', ba:'16/9', tw:'112px' }, l:{ cw:'236px', cwm:'220px', rw:'60px', ba:'4/3', tw:'168px' } };
function applyCoverSize(el, v) { const z = COVER_SIZES[v.size] || COVER_SIZES.m; ['cw', 'cwm', 'rw', 'ba', 'tw'].forEach(k => el.style.setProperty('--' + k, z[k])); }
const showOn = k => !CUR_VIS || (k === 'cover' ? CUR_VIS.cover !== false : VIS_MAP[k].some(x => CUR_VIS.vis.includes(x)));
function withVis(view, fn) { const prev = CUR_VIS; CUR_VIS = view; try { return fn(); } finally { CUR_VIS = prev; } }
/* a board's columns are its Group: any select or multi property (status unless you pick another) */
const boardProp = view => { const g = propById(view.group); return g && (g.type === 'select' || g.type === 'multi') ? g : propById(view.boardBy) || propById('status'); };
const inCol = (m, p, id) => { const v = pGet(m, p); return Array.isArray(v) ? v.includes(id) : v === id; };
function boardHtml(items, view) {
  const p = boardProp(view), opts = propOpts(p), cols = opts.map(o => ({ id:o.id, label:o.label, color:o.color, items:items.filter(m => inCol(m, p, o.id)) })), none = items.filter(m => !opts.some(o => inCol(m, p, o.id)));
  if (none.length) cols.push({ id:'', label:t('lib_none'), color:'#9ca3af', items:none });
  return `<div class="board" data-by="${esc(p.id)}" data-multi="${p.type === 'multi'}">${cols.map(c => `<div class="bcol" data-v="${esc(c.id)}"><div class="bh">${tagPill(c.label, c.color)}<em class="bagg" data-bagg="${esc(c.id)}" tabindex="0" title="${esc(baggLabel((view.bagg || {})[c.id]))}">${esc(baggValue((view.bagg || {})[c.id], c.items) || '–')}</em></div><div class="bcards">${c.items.map(m => `<div class="bcard" draggable="true" data-id="${m.id}">${view.cover !== false ? posterHtml(m, false).replace('class="poster"', 'class="poster bp"') : ''}<div class="bt">${esc(m.title)}</div><div class="bm">${view.vis.filter(x => !['title'].includes(x)).map(id => { const q = propById(id); return q && q.id !== p.id && !isEmptyVal(q, pGet(m, q)) && !(q.sch && !schemaOf(m.type)[q.id]) ? `<span>${cellHtml(m, q)}</span>` : ''; }).join('')}</div></div>`).join('')}</div></div>`).join('')}</div>`;
}
function listRowsHtml(items, view) {
  const all = allProps(), cols = view.vis.map(id => all.find(p => p.id === id)).filter(p => p && p.id !== 'title');
  return `<div class="drows">${items.map(m => `<div class="drow" data-id="${m.id}" tabindex="0">${view.cover !== false ? posterHtml(m, false) : ''}<div class="grow"><div class="mtitle">${esc(m.title)}</div></div><div class="drp">${cols.map(p => isEmptyVal(p, pGet(m, p)) || (p.sch && !schemaOf(m.type)[p.id]) ? '' : `<span>${cellHtml(m, p)}</span>`).join('')}</div></div>`).join('')}</div>`;
}
function itemsHtml(items, view) {
  if (!items.length) return '';
  return withVis(view, () => view.layout === 'table' ? tableHtml(items, view) : view.layout === 'board' ? boardHtml(items, view) : view.layout === 'list' ? listRowsHtml(items, view) : `<div class="poster-grid">${items.map(m => cardHtml(m, true)).join('')}</div>`);
}
function renderTracker() {
  if (curTab !== 'tracker') { TS.dirty = true; return; }   // not on screen: draw it when you come back
  TS.dirty = false; ensureViews(); const v = curView();
  if (v.layout !== 'table' && (TS.selecting || TS.sel.size)) { TS.sel.clear(); TS.selecting = false; }       // picking rows is a table thing
  $('libTabs').innerHTML = LIB.views.map(x => `<button class="vt ${x.id === LIB.active ? 'on' : ''}" data-view="${esc(x.id)}"${x.id === LIB.active ? ' aria-current="true"' : ''}><i class="ti ti-${LAYOUTS.find(l => l[0] === x.layout)[1]}"></i><span>${esc(viewName(x))}</span>${x.id === LIB.active ? '<i class="ti ti-dots vt-more" data-vmore></i>' : ''}</button>`).join('') + `<button class="vt add" data-view-new title="${esc(t('lib_new_view'))}" aria-label="${esc(t('lib_new_view'))}"><i class="ti ti-plus"></i></button>`;
  const nf = rulesOf(v).length + LIB.temp.length; $('lbFilter').classList.toggle('on', !!nf); $('lbFilter').querySelector('.badge').hidden = !nf; $('lbFilter').querySelector('.badge').textContent = nf;
  $('lbSort').classList.toggle('on', !!(v.sorts || []).length); $('lbGroup').classList.toggle('on', !!v.group); { const gn = v.layout === 'board' ? boardProp(v).name : v.group ? (propById(v.group) || {}).name || t('lib_group') : t('lib_group'); $('lbGroup').title = gn; $('lbGroup').setAttribute('aria-label', gn); }
  $('selHint').hidden = !TS.selecting || !hintOn('select');
  $('activeF').innerHTML = LIB.temp.map((r, i) => { const p = propById(r.p); return `<span class="af">${esc(p ? p.name : r.p)} ${esc(opLabel(r.op))} ${esc(p && (p.type === 'select' || p.type === 'multi') ? optLabel(p, r.v) : r.v)}<button data-rmtemp="${i}" aria-label="×">×</button></span>`; }).join('');
  const list = runView(v, media); TS.order = list.map(m => m.id);
  const sig = JSON.stringify([v.id, v.filters, v.sorts, v.group, v.layout, LIB.q, LIB.temp]); if (sig !== TS.sig) { TS.sig = sig; TS.limit = CHUNK; }
  applyCoverSize($('trackerGrid'), v); $('trackerGrid').classList.toggle('selmode', TS.selecting);
  const hscroll = [...$('trackerGrid').querySelectorAll('.dtable-wrap')].map(x => x.scrollLeft);          // an edit redraws the table: keep it where it was scrolled
  const g = v.layout === 'board' ? null : groupBy(v, list); let budget = TS.limit;
  if (!list.length) $('trackerGrid').innerHTML = `<div class="empty-state"><i class="ti ti-database"></i>${esc(media.length ? t('no_match') : t('no_items'))}${media.length ? '' : `<div class="hint">${esc(t('no_items_hint'))}</div>`}</div>`;
  else if (!g) { CALC_ALL = list; try { $('trackerGrid').innerHTML = itemsHtml(list.slice(0, TS.limit), v) + moreHtml(Math.min(TS.limit, list.length), list.length); } finally { CALC_ALL = null; } }
  else $('trackerGrid').innerHTML = g.map(x => { const ck = v.group + ':' + x.key, part = x.items.slice(0, Math.max(0, budget)); budget -= part.length; return `<section class="grp ${TS.collapsed.has(ck) ? 'collapsed' : ''}" data-gk="${esc(ck)}"><div class="grp-h big" data-gt role="button" tabindex="0" aria-expanded="${!TS.collapsed.has(ck)}"><i class="ti ti-chevron-down"></i>${x.color ? `<i class="gdot" style="background:${esc(x.color)}"></i>` : ''}<span>${esc(x.label)}</span><b class="bagg" data-gagg="${esc(x.key)}" tabindex="0" title="${esc(baggLabel((v.gagg || {})[x.key]))}">${esc(baggValue((v.gagg || {})[x.key], x.items) || '–')}</b></div><div class="grp-b"><div><div style="padding-bottom:14px">${itemsHtml(part, v)}</div></div></div></section>`; }).join('') + moreHtml(Math.min(TS.limit, list.length), list.length);
  fillHide();
  $('trackerGrid').insertAdjacentHTML('beforeend', `<button type="button" class="newrow" data-newitem><i class="ti ti-plus" aria-hidden="true"></i><span>${esc(t('db_new'))}</span></button>`);
  autoMore($('trackerGrid'), () => { TS.limit += CHUNK; renderTracker(); });
  $('trackerGrid').querySelectorAll('.dtable-wrap').forEach((x, i) => { x.scrollLeft = hscroll[i] || 0; });
  applyFreeze($('trackerGrid'), v);
  renderSelbar();
}
/* ---------- library events ---------- */
function headerMenu(th, host) {
  host = host || libHost(); const p = propById(th.dataset.p), v = host.view(); if (!p) return; const i = v.vis.indexOf(p.id), s = (v.sorts || []).find(x => x.p === p.id);
  openPop(th, () => `<div class="pop-h"><i class="ti ti-${PROP_ICON[p.type]}"></i> ${esc(t('pt_' + p.type))}</div><div class="pop-name">${esc(propLabel(p, new Set(media.map(m => m.type))))}</div>
    ${p.core ? '' : `<button class="pm" data-act="edit"><i class="ti ti-settings"></i>${esc(t('lib_edit_in_settings'))}</button>`}
    <button class="pm" data-act="sort"><i class="ti ti-${s ? (s.dir === 'desc' ? 'sort-descending-off' : 'sort-descending') : 'sort-ascending'}"></i>${esc(t(!s ? 'lib_sort_asc' : s.dir === 'desc' ? 'lib_sort_off' : 'lib_sort_desc'))}</button>
    <button class="pm" data-act="filter"><i class="ti ti-filter"></i>${esc(t('lib_filter_by'))}</button><button class="pm" data-act="group"><i class="ti ti-stack-2"></i>${esc(t('lib_group_by'))}</button>
    <button class="pm" data-act="freeze"><i class="ti ti-pin${v.freeze === p.id ? '-off' : ''}"></i>${esc(t(v.freeze === p.id ? 'lib_unfreeze' : 'lib_freeze'))}</button>
    ${i > 0 ? `<button class="pm" data-act="left"><i class="ti ti-arrow-left"></i>${esc(t('lib_move_left'))}</button>` : ''}${i < v.vis.length - 1 ? `<button class="pm" data-act="right"><i class="ti ti-arrow-right"></i>${esc(t('lib_move_right'))}</button>` : ''}
    ${p.core ? '' : `<button class="pm" data-act="hide"><i class="ti ti-eye-off"></i>${esc(t('lib_hide'))}</button>`}`, {
    click:e => { const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
      if (a === 'edit') { closePop(); return goPropSettings(p); }
      if (a === 'sort') { if (!s) v.sorts = [{ p:p.id, dir:'asc' }, ...(v.sorts || [])]; else if (s.dir !== 'desc') s.dir = 'desc'; else v.sorts = v.sorts.filter(x => x.p !== p.id); }
      else if (a === 'freeze') v.freeze = v.freeze === p.id ? '' : p.id;
      else if (a === 'filter') { const op = OPS[p.type][0]; v.filters.rules.push({ p:p.id, op, v:'' }); host.save(); closePop(); host.render(); return openFilterPop(host.filterBtn(), host); }
      else if (a === 'group') v.group = v.group === p.id ? '' : p.id; else if (a === 'left') [v.vis[i - 1], v.vis[i]] = [v.vis[i], v.vis[i - 1]]; else if (a === 'right') [v.vis[i + 1], v.vis[i]] = [v.vis[i], v.vis[i + 1]]; else if (a === 'hide') v.vis.splice(i, 1);
      host.save(); closePop(); host.render(); },
  }, 'pop-menu');
}
/* Creating, renaming, deleting and giving options to a property happen in Settings → Database only; the table and the popover link there */
function goPropSettings(p) {
  setTab('settings'); const part = p && p.src === 'types' ? 'types' : p && p.src === 'tags' ? 'tags' : 'props'; openSetSec(part);
  if (p && part === 'props') { LS.open.prop = p.id; renderProps(); setTimeout(() => { const r = document.querySelector(`#lsProps .ls-item[data-id="${CSS.escape(p.id)}"]`); if (r) r.scrollIntoView({ block:'center' }); }, 60); }
  else if (!p) setTimeout(() => { LS.addOpen = true; renderProps(); const i = $('lsNewName'); if (i) { i.scrollIntoView({ block:'center' }); i.focus(); } }, 80);
}
function renameProp(p, name) { if (!name) return; if (p.custom) { PDEF.custom.find(x => x.id === p.id).name = name; } else PDEF.ov[p.id] = { ...(PDEF.ov[p.id] || {}), name }; savePdef(); renderTracker(); if (curTab === 'settings') renderLibSettings(); }
async function deleteProp(p) {
  if (!(await ask(t(p.custom ? 'lib_delete_prop_c' : 'lib_delete_prop_b', { x:p.name })))) return;
  if (p.custom) { PDEF.custom = PDEF.custom.filter(x => x.id !== p.id); const recs = media.filter(m => m.props && p.id in m.props).map(m => { const pr = { ...m.props }; delete pr[p.id]; return { ...m, props:pr }; }); if (recs.length) DB.putMany('media', recs).then(reload); }
  else PDEF.deleted.push(p.id);
  LIB.views.forEach(v => { v.vis = v.vis.filter(x => x !== p.id); v.sorts = (v.sorts || []).filter(s => s.p !== p.id); v.filters.rules = v.filters.rules.filter(r => r.p !== p.id); if (v.group === p.id) v.group = ''; });
  savePdef(); saveViews(); renderTracker(); if (curTab === 'settings') renderLibSettings();
}
function viewMenu(anchor, host) {
  host = host || libHost(); const v = host.view(), st = host.st, LAY = host.layouts, lay = k => LAY.find(l => l[0] === k)[1];
  openPop(anchor, () => `<input type="text" id="vmName" value="${esc(viewName(v))}" maxlength="30"><div class="pop-sub">${esc(t('lib_layout'))}</div><div class="np-types">${LAY.map(([k, ic, lab]) => `<button type="button" data-lay="${k}" aria-pressed="${v.layout === k}"><i class="ti ti-${ic}"></i>${esc(t(lab))}</button>`).join('')}</div><button class="pm" data-act="dup"><i class="ti ti-copy"></i>${esc(t('lib_duplicate'))}</button><button class="pm danger" data-act="del" ${st.views.length < 2 ? 'disabled' : ''}><i class="ti ti-trash"></i>${esc(t('lib_delete_view'))}</button>`, {
    click:async e => { const l = e.target.closest('[data-lay]'), a = e.target.closest('[data-act]'); if (l) { v.layout = l.dataset.lay; v.icon = lay(v.layout); host.save(); host.render(); return rePop(); }
      if (!a) return;
      if (a.dataset.act === 'dup') { const c = JSON.parse(JSON.stringify(v)); c.id = newViewId(); c.name = v.name + ' ' + t('lib_copy'); st.views.splice(st.views.indexOf(v) + 1, 0, c); st.active = c.id; }
      else if (a.dataset.act === 'del') { if (!(await ask(t('lib_delete_view_c', { x:viewName(v) })))) return; st.views = st.views.filter(x => x !== v); st.active = st.views[0].id; }
      host.save(); closePop(); host.render(); },
    change:e => { if (e.target.id === 'vmName' && e.target.value.trim()) { v.name = e.target.value.trim(); host.save(); host.render(); } },
    keydown:e => { if (e.key === 'Enter' && e.target.id === 'vmName') { v.name = e.target.value.trim() || v.name; host.save(); closePop(); host.render(); } }
  }, 'pop-menu');
}
function newViewPop(anchor, host) {
  host = host || libHost();
  openPop(anchor, () => `<div class="pop-h">${esc(t('lib_new_view'))}</div><input type="text" id="nvName" placeholder="${esc(t('lib_view_name'))}" maxlength="30" autocomplete="off"><div class="np-types">${host.layouts.map(([k, ic, lab], i) => `<button type="button" data-lay="${k}" aria-pressed="${i === 0}"><i class="ti ti-${ic}"></i>${esc(t(lab))}</button>`).join('')}</div><button class="btn primary sm" data-act="create">${esc(t('lib_create'))}</button>`, {
    click:e => { const l = e.target.closest('[data-lay]'); if (l) { $$('.np-types button', POP.el).forEach(b => b.setAttribute('aria-pressed', b === l)); return; }
      if (e.target.closest('[data-act="create"]')) { const layout = ($q('.np-types [aria-pressed="true"]', POP.el) || {}).dataset.lay || 'table'; host.st.views.push(host.mkView($('nvName').value.trim() || t('lib_untitled'), layout)); host.st.active = host.st.views[host.st.views.length - 1].id; host.save(); closePop(); host.render(); } },
    keydown:e => { if (e.key === 'Enter' && e.target.id === 'nvName') { e.preventDefault(); POP.el.querySelector('[data-act="create"]').click(); } }
  }, 'pop-menu'); setTimeout(() => $('nvName') && $('nvName').focus(), 30);
}
function groupPop(anchor, host) {
  const v = host.view(), board = v.layout === 'board', props = allProps().filter(p => board ? p.type === 'select' || p.type === 'multi' : !['text', 'url', 'action'].includes(p.type) || p.id === 'title'), cur = board ? boardProp(v).id : v.group;
  openPop(anchor, () => `<div class="pop-h">${esc(t(board ? 'lib_board_by' : 'lib_group'))}</div>${board ? '' : `<button class="pm" data-g=""><i class="ti ti-circle-off"></i>${esc(t('g_none'))}${!v.group ? ' ✓' : ''}</button>`}${props.map(p => `<button class="pm" data-g="${esc(p.id)}"><i class="ti ti-${PROP_ICON[p.type]}"></i>${esc(p.name)}${cur === p.id ? ' ✓' : ''}</button>`).join('')}`, { click:e => { const b = e.target.closest('[data-g]'); if (!b) return; v.group = b.dataset.g; host.save(); host.render(); closePop(); } }, 'pop-menu');
}
$('libTabs').addEventListener('click', e => {
  if (e.target.closest('[data-vmore]')) return viewMenu(e.target.closest('.vt'), libHost());
  const nv = e.target.closest('[data-view-new]'); if (nv) return newViewPop(nv, libHost());
  const b = e.target.closest('[data-view]'); if (b) { LIB.active = b.dataset.view; TS.sel.clear(); TS.selecting = false; saveViews(); renderTracker(); }
});
/* keyboard: the view's menu (rename, duplicate, delete) was reachable only by the small dots with a mouse */
$('libTabs').addEventListener('keydown', e => { const b = e.target.closest && e.target.closest('.vt.on[data-view]'); if (b && (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10'))) { e.preventDefault(); viewMenu(b, libHost()); } });
/* keyboard: Enter or Space on a focused row, card or header does what a click does */
document.addEventListener('keydown', e => { if ((e.key !== 'Enter' && e.key !== ' ') || e.defaultPrevented) return; const el = e.target; if (el && el.matches && !el.closest('.dt') && el.matches('tr[data-id], .mcard.click, .drow, th[data-p], [data-gt]')) {   // .dt = the insights data table, which has its own Enter handling
    e.preventDefault(); el.click(); } });
$('libTabs').addEventListener('dblclick', e => { const b = e.target.closest('[data-view]'); if (b && b.dataset.view === LIB.active) viewMenu(b); });
$('lbFilter').onclick = e => openFilterPop(e.currentTarget, libHost());
$('lbSort').onclick = e => openSortPop(e.currentTarget, libHost());
$('lbGroup').onclick = e => groupPop(e.currentTarget, libHost());
$('lbProps').onclick = e => openPropsPop(e.currentTarget, libHost());
$('qSearch').oninput = e => { LIB.q = e.target.value.toLowerCase().trim(); renderTracker(); };
$('activeF').addEventListener('click', e => { const b = e.target.closest('[data-rmtemp]'); if (b) { LIB.temp.splice(Number(b.dataset.rmtemp), 1); renderTracker(); } });
/* jump to the library with a filter from elsewhere (insights, clicking a tag) */
function libQuick(rules) { LIB.temp = rules; LIB.q = ''; $('qSearch').value = ''; setTab('tracker'); renderTracker(); }
let lastClickedId = null;
function qaHandler(e) { const qa = e.target.closest('[data-qa]'); if (!qa) return false; e.stopPropagation(); const id = Number(qa.closest('[data-id]').dataset.id); setStatus(id, qa.dataset.qa === 'start' ? 'doing' : 'done'); return true; }
$('trackerGrid').addEventListener('click', e => {
  if (e.target.closest('[data-rsz]')) return;
  if (e.target.closest('[data-open-media]')) return;        // the Play / Read link does its own job: no row selection, no cell edit
  if (e.target.closest('[data-more-items]')) { TS.limit += CHUNK; return renderTracker(); }
  const ga = e.target.closest('[data-gagg]'); if (ga) { e.stopPropagation(); return baggPop(ga, libHost(), ga.dataset.gagg, 'gagg'); }
  const gt = e.target.closest('[data-gt]'); if (gt) { const s = gt.parentElement, k = s.dataset.gk; TS.collapsed.has(k) ? TS.collapsed.delete(k) : TS.collapsed.add(k); s.classList.toggle('collapsed'); gt.setAttribute('aria-expanded', String(!s.classList.contains('collapsed'))); return; }
  if (e.target.closest('[data-newitem]')) return openMedia(null);
  const ba = e.target.closest('[data-bagg]'); if (ba) return baggPop(ba, libHost(), ba.dataset.bagg);
  const cf = e.target.closest('[data-calc]'); if (cf) return calcPop(cf, libHost(), propById(cf.dataset.calc));
  const pk = e.target.closest('input[data-ck], input[data-all]'); if (pk) { e.stopPropagation(); lastClickedId = gutterPick(TS, pk, e.shiftKey, lastClickedId, renderTracker); return; }
  const cb = e.target.closest('[data-pick]'); if (cb) { e.stopPropagation(); const id = Number(cb.closest('[data-id]').dataset.id); TS.sel.has(id) ? TS.sel.delete(id) : TS.sel.add(id); TS.selecting = TS.sel.size > 0; lastClickedId = id; return renderTracker(); }
  const th = e.target.closest('th[data-p]'); if (th) return headerMenu(th);
  const np = e.target.closest('[data-newprop]'); if (np) return goPropSettings(null);
  const fv = e.target.closest('[data-fav]'); if (fv) { e.stopPropagation(); const id = Number(fv.closest('[data-id]').dataset.id), m = media.find(x => x.id === id); setFav([id], !m.fav); return; }
  if (qaHandler(e)) return;
  if (e.target.closest('.cell-link, .cell-in')) return;
  const tg = e.target.closest('[data-tag]'); if (tg) { e.stopPropagation(); return libQuick([{ p:'genre', op:'has', v:tg.dataset.tag }]); }
  const c = e.target.closest('.mcard, tr[data-id], .bcard, .drow'); if (!c) return; const id = Number(c.dataset.id);
  if (!TS.selecting && c.tagName === 'TR' && (e.metaKey || e.ctrlKey || e.shiftKey)) { TS.sel.add(id); TS.selecting = true; lastClickedId = id; return renderTracker(); }       // ⌘/Ctrl/Shift-click starts a selection in any layout
  if (TS.selecting) {
    if (e.shiftKey && lastClickedId != null) { const a = TS.order.indexOf(lastClickedId), b = TS.order.indexOf(id); if (a >= 0 && b >= 0) TS.order.slice(Math.min(a, b), Math.max(a, b) + 1).forEach(x => TS.sel.add(x)); }
    else TS.sel.has(id) ? TS.sel.delete(id) : TS.sel.add(id);
    TS.selecting = TS.sel.size > 0; lastClickedId = id; renderTracker(); return;
  }
  const td = e.target.closest('td[data-p]'); if (td && c.tagName === 'TR' && !td.classList.contains('tc-title')) return editCell(td);
  openMedia(id);
});
/* board: drag a card to another column to change its value */
$('trackerGrid').addEventListener('dragstart', e => { const c = e.target.closest('.bcard'); if (!c) return; e.dataTransfer.setData('text/plain', c.dataset.id); c.classList.add('drag'); });
$('trackerGrid').addEventListener('dragend', e => { const c = e.target.closest('.bcard'); if (c) c.classList.remove('drag'); $$('.bcol.over').forEach(x => x.classList.remove('over')); });
$('trackerGrid').addEventListener('dragover', e => { const col = e.target.closest('.bcol'); if (col) { e.preventDefault(); $$('.bcol.over').forEach(x => x !== col && x.classList.remove('over')); col.classList.add('over'); } });
$('trackerGrid').addEventListener('drop', async e => { const col = e.target.closest('.bcol'); if (!col) return; e.preventDefault(); col.classList.remove('over'); const id = Number(e.dataTransfer.getData('text/plain')), m = media.find(x => x.id === id), board = col.closest('.board'), p = propById(board.dataset.by); if (!m || !p || board.dataset.multi === 'true') return; await saveItem(pSet(m, p, col.dataset.v || '')); await reload(); });

/* ---------- per-list views (same engine, same popovers) ---------- */
let LVIEWS = jsonStore('vmm.lviews', {});
const saveListViews = () => store.set('vmm.lviews', JSON.stringify(LVIEWS));
const LIST_VIS = ['fav', 'type', 'creator', 'year', 'rating', 'status', 'genre', 'language'];
function listView(id) { if (!LVIEWS[id]) LVIEWS[id] = { layout:'gallery', filters:{ mode:'and', rules:[] }, sorts:[{ p:'_order', dir:'asc' }], group:'', vis:LIST_VIS.slice(), cover:true }; const v = LVIEWS[id]; v.filters = v.filters || { mode:'and', rules:[] }; v.sorts = v.sorts || []; v.vis = v.vis || LIST_VIS.slice(); return v; }
const lpCustom = () => !!LP.id && !!(listView(LP.id).sorts[0] || {}).p && listView(LP.id).sorts[0].p === '_order' && !rulesOf(listView(LP.id)).length && !LP.dq.trim();
/* ---------- editing the options of a property ---------- */
const optdlg = $('optdlg'); let OE = null;
function openOptionsEditor(p) {
  if (p.src === 'types' || p.src === 'tags') { setTab('settings'); return openSetSec(p.src); }
  if (!(p.custom || p.src === 'languages')) return;
  OE = { p }; oeDraw(); optdlg.showModal();
}
function oeDraw() {
  const p = OE.p, rows = p.custom ? p.opts.map(o => ({ id:o.id, name:o.name, color:o.color, n:media.filter(m => { const v = (m.props || {})[p.id]; return Array.isArray(v) ? v.includes(o.id) : v === o.id; }).length })) : propOpts(p).filter(o => o.n);
  $('oeTitle').textContent = p.name + ' · ' + t('lib_edit_options');
  $('oeBody').innerHTML = rows.map(o => `<div class="oe-row" data-id="${esc(o.id)}">${p.custom ? `<input type="color" value="${esc(/^#/.test(o.color) ? o.color : '#7c5cff')}" data-f="color">` : `<i class="lp-dot" style="background:${esc(o.color)}"></i>`}<input type="text" value="${esc(o.name || o.label)}" data-f="name" maxlength="40"><em>${o.n}</em><button class="ibtn sm" data-act="del" title="${esc(t('del'))}"><i class="ti ti-trash"></i></button></div>`).join('') + `<div class="oe-row add"><input type="text" id="oeNew" placeholder="${esc(t('lib_add_option'))}" maxlength="40" autocomplete="off"></div>`;
}
$('oeBody').addEventListener('change', async e => {
  const row = e.target.closest('.oe-row'); if (!row || !row.dataset.id || !OE) return; const p = OE.p, id = row.dataset.id, f = e.target.dataset.f;
  if (p.custom) { const o = p.opts.find(x => x.id === id); if (!o) return; if (f === 'color') o.color = e.target.value; else if (e.target.value.trim()) o.name = e.target.value.trim(); savePdef(); renderTracker(); }
  else if (f === 'name') { const nn = e.target.value.trim(); if (nn && nn !== id) { const recs = media.filter(m => (m.language || '').trim() === id).map(m => ({ ...m, language:nn })); if (recs.length) await DB.putMany('media', recs); await reload(); oeDraw(); } }
});
$('oeBody').addEventListener('keydown', async e => { if (e.key === 'Enter' && e.target.id === 'oeNew' && OE) { e.preventDefault(); const name = e.target.value.trim(); if (!name) return; if (OE.p.custom) { OE.p.opts.push({ id:'o' + Date.now().toString(36), name, color:accentHex() }); savePdef(); oeDraw(); renderTracker(); $('oeNew').focus(); } else toast(t('lib_lang_hint')); } });
$('oeBody').addEventListener('click', async e => {
  const b = e.target.closest('[data-act="del"]'); if (!b || !OE) return; const id = b.closest('.oe-row').dataset.id, p = OE.p;
  if (!(await ask(t('lib_del_option_c')))) return;
  if (p.custom) { p.opts = p.opts.filter(o => o.id !== id); savePdef(); const recs = media.filter(m => m.props && p.id in m.props).map(m => { const v = m.props[p.id], nv = Array.isArray(v) ? v.filter(x => x !== id) : v === id ? '' : v; return { ...m, props:{ ...m.props, [p.id]:nv } }; }); if (recs.length) await DB.putMany('media', recs); await reload(); }
  else { const recs = media.filter(m => (m.language || '').trim() === id).map(m => ({ ...m, language:'' })); if (recs.length) await DB.putMany('media', recs); await reload(); }
  oeDraw();
});
$('oeX').onclick = () => optdlg.close();
/* ---------- language is picked, not typed ---------- */
function fillLangSelect(sel, cur, keep) {
  const opts = propOpts({ src:'languages' }), c = (cur || '').trim(); const list = c && !opts.some(o => o.id === c) ? [{ id:c, label:c }, ...opts] : opts;
  sel.innerHTML = `<option value="">${esc(keep ? t('bulk_keep') : '—')}</option>` + list.map(o => `<option value="${esc(o.id)}">${esc(o.label)}</option>`).join('') + `<option value="__other">${esc(t('lib_other_lang'))}</option>`; sel.value = c;
}
document.addEventListener('change', async e => { const s = e.target; if (!s.classList || !s.classList.contains('langsel') || s.value !== '__other') return; const n = ((await askText(t('lib_lang_prompt'))) || '').trim(); if (n) { const o = document.createElement('option'); o.value = n; o.textContent = n; s.insertBefore(o, s.lastElementChild); s.value = n; } else s.value = s.dataset.prev || ''; });
document.addEventListener('focusin', e => { if (e.target.classList && e.target.classList.contains('langsel')) e.target.dataset.prev = e.target.value; });
/* ---------- custom properties in the item drawer ---------- */
function drawCustomProps(m) {
  const host = $('mProps'); if (!host) return; const ps = PDEF.custom; host.innerHTML = ps.length ? ps.map(p => { const v = (m.props || {})[p.id]; let c;
    if (p.type === 'select') c = `<select data-cp="${esc(p.id)}"><option value="">—</option>${(p.opts || []).map(o => `<option value="${esc(o.id)}" ${v === o.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</select>`;
    else if (p.type === 'multi') c = `<div class="chips" data-cp="${esc(p.id)}" data-multi>${(p.opts || []).map(o => `<button type="button" class="chip" data-o="${esc(o.id)}" aria-pressed="${(v || []).includes(o.id)}">${esc(o.name)}</button>`).join('') || `<small>${esc(t('lib_no_options'))}</small>`}</div>`;
    else if (p.type === 'checkbox') c = `<label class="checkline"><input type="checkbox" data-cp="${esc(p.id)}" ${v ? 'checked' : ''}></label>`;
    else if (p.type === 'date') c = `<input type="date" data-cp="${esc(p.id)}" value="${v ? new Date(Number(v)).toISOString().slice(0, 10) : ''}">`;
    else c = `<input type="${p.type === 'number' || p.type === 'rating' ? 'number' : 'text'}" ${p.type === 'rating' ? 'min="0" max="5" step="0.5"' : ''} data-cp="${esc(p.id)}" value="${esc(v == null ? '' : v)}" autocomplete="off">`;
    c = c.replace(/data-cp="[^"]*"/, m => `${m} aria-label="${esc(p.name)}"`);
    return `<div class="fld" data-prop="${esc(p.id)}"><span>${esc(p.name)}</span>${c}</div>`; }).join('') : '';
}
document.addEventListener('click', e => { const c = e.target.closest('[data-multi] .chip'); if (c) c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') !== 'true'); });
function collectCustomProps(r) {
  const host = $('mform'); if (!host || !PDEF.custom.length) return; const pr = { ...(r.props || {}) };
  PDEF.custom.forEach(p => { const el = host.querySelector(`[data-cp="${p.id}"]`); if (!el) return; let v;
    if (el.hasAttribute('data-multi')) v = [...el.querySelectorAll('.chip[aria-pressed="true"]')].map(b => b.dataset.o); else if (el.type === 'checkbox') v = el.checked; else if (el.type === 'date') v = el.value ? new Date(el.value).getTime() : null; else if (el.type === 'number') v = el.value === '' ? null : Number(el.value); else v = el.value;
    pr[p.id] = v; });
  r.props = pr;
}
/* Settings → Library & insights lives in js/09-library-settings.js */

$('selbar').addEventListener('click', async e => {
  const st = e.target.closest('[data-sbs]');
  if (st) { const s = st.dataset.sbs, ids = [...TS.sel]; await withUndo(ids, () => bulkMedia(ids, m => { m.status = s; if (s === 'doing') m.startedAt = Date.now(); if (s === 'done') m.doneAt = Date.now(); return m; }), t('t_updated', { n:ids.length })); return; }
  const b = e.target.closest('[data-sb]'); if (!b || b.tagName === 'SELECT') return; const k = b.dataset.sb, ids = [...TS.sel];
  if (k === 'all') { TS.order.forEach(id => TS.sel.add(id)); renderTracker(); }
  else if (k === 'none') setSelecting(false);
  else if (k === 'exit') setSelecting(false);
  else if (k === 'actions') {                                          // one button, one menu: status, favourite, list, edit, delete
    const allFav = ids.every(id => (media.find(m => m.id === id) || {}).fav);
    const key = await openMenu(b, [...Object.keys(STATUSES).map(x => ['st:' + x, L().status[x], STATUSES[x].i]), ['-'], ['fav', t(allFav ? 'sel_unfav' : 'sel_fav'), 'heart'], ...(LISTS.length ? [['list', t('sel_addlist'), 'books']] : []), ['edit', t('sel_edit'), 'edit'], ['-'], ['del', t('sel_delete'), 'trash']]); if (!key) return;
    if (key.startsWith('st:')) { const s2 = key.slice(3); await withUndo(ids, () => bulkMedia(ids, m => { m.status = s2; if (s2 === 'doing') m.startedAt = Date.now(); if (s2 === 'done') m.doneAt = Date.now(); return m; }), t('t_updated', { n:ids.length })); }
    else if (key === 'fav') await withUndo(ids, () => setFav(ids, !allFav), t('t_updated', { n:ids.length }));
    else if (key === 'edit') openBulk('media', ids);
    else if (key === 'list') { const lid = await openMenu(b, LISTS.map(l => [l.id, l.name, 'books'])); if (lid) await withUndo(ids, () => addToList(ids, lid, true), t('t_listed', { n:ids.length, x:(listById(lid) || {}).name || '' })); }
    else if (key === 'del') { if (await ask(t('t_mconfirm_n', { n:ids.length }))) { const was = ids.map(id => media.find(m => m.id === id)).filter(Boolean).map(m => JSON.parse(JSON.stringify(m))); await DB.delMany('media', ids); TS.sel.clear(); await reload(); toast(t('t_deleted', { n:ids.length }), false, async () => { await DB.putMany('media', was); await reload(); toast(t('t_undone')); }); } }
  }
  else if (k === 'edit') openBulk('media', ids);
  else if (k === 'fav') { const allFav = ids.every(id => (media.find(m => m.id === id) || {}).fav); await withUndo(ids, () => setFav(ids, !allFav), t('t_updated', { n:ids.length })); }
  else if (k === 'del') { if (await ask(t('t_mconfirm_n', { n:ids.length }))) { const was = ids.map(id => media.find(m => m.id === id)).filter(Boolean).map(m => JSON.parse(JSON.stringify(m))); await DB.delMany('media', ids); TS.sel.clear(); await reload(); toast(t('t_deleted', { n:ids.length }), false, async () => { await DB.putMany('media', was); await reload(); toast(t('t_undone')); }); } }
});
$('selbar').addEventListener('change', async e => {
  if (e.target.dataset.sb !== 'list' || !e.target.value) return; const ids = [...TS.sel], lid = e.target.value;
  await withUndo(ids, () => addToList(ids, lid, true), t('t_listed', { n:ids.length, x:(listById(lid) || {}).name || '' }));
});

document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a' && TS.selecting && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); TS.order.forEach(id => TS.sel.add(id)); renderTracker(); } if (e.key === 'Escape' && TS.selecting && !document.querySelector('dialog[open]')) setSelecting(false); });

/* ---- favourites & lists ---- */
let LISTS = [];
const LIST_COLORS = ['#5b6fb8', '#6a8f78', '#b0805a', '#8a6f9e', '#5f8f9e', '#a8955f'];      // six muted tones; any other colour is still one tap away in "custom"
async function loadLists() { try { const r = await DB.get('kv', 'lists'); LISTS = (r && Array.isArray(r.v)) ? r.v : []; } catch (e) { LISTS = []; } }
let LISTORDER = {};
async function loadListOrder() { try { const r = await DB.get('kv', 'listorder'); LISTORDER = (r && r.v) || {}; } catch (e) { LISTORDER = {}; } }
const saveListOrder = () => DB.put('kv', { k:'listorder', v:LISTORDER });
async function saveLists() { PVER++; await DB.put('kv', { k:'lists', v:LISTS }); }
const listById = id => LISTS.find(l => l.id === id);
let LC = { v:-1, map:new Map() };
const listCount = id => { if (LC.v !== PVER) { const map = new Map(); media.forEach(m => (m.lists || []).forEach(l => map.set(l, (map.get(l) || 0) + 1))); LC = { v:PVER, map }; } return LC.map.get(id) || 0; };
const newId = () => 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
async function setFav(ids, val) {
  const recs = ids.map(id => media.find(m => m.id === id)).filter(Boolean).map(m => ({ ...m, fav:val }));
  if (recs.length) { await DB.putMany('media', recs); await reload(); }
}
async function setFavFiles(ids, val) {
  const recs = ids.map(id => files.find(m => m.id === id)).filter(Boolean).map(m => ({ ...m, fav:val }));
  if (recs.length) { await DB.putMany('videos', recs); await reload(); }
}
async function addToList(ids, listId, on) {
  const recs = ids.map(id => media.find(m => m.id === id)).filter(Boolean).map(m => { const s = new Set(m.lists || []); on ? s.add(listId) : s.delete(listId); return { ...m, lists:[...s] }; });
  if (recs.length) { await DB.putMany('media', recs); await reload(); }
}
/* list dialog (create / rename / recolour / delete) */
const ldlg = $('ldlg'), lform = $('lform'); let lEdit = null, lColor = LIST_COLORS[0], lAfter = null;
let lCp = null, lCover = { mode:'auto' }, lCoverTab = 'auto';
const lCoverTabs = [['auto', 'l_cover_auto'], ['item', 'l_cover_item'], ['image', 'l_cover_image']];
function drawListCover() {
  $('lCoverTabs').innerHTML = `<div class="src-tabs">${lCoverTabs.map(([k, l]) => `<button type="button" data-lc="${k}" aria-pressed="${lCoverTab === k}">${esc(t(l))}</button>`).join('')}</div>`;
  const mine = lEdit ? sortedItems(listItems(lEdit)).slice(0, 40) : [];
  $('lCoverBody').innerHTML = lCoverTab === 'auto' ? `<p class="hint">${esc(t('l_cover_auto_d'))}</p>`
    : lCoverTab === 'item' ? (mine.length ? `<div class="cover-pick">${mine.map(m => `<button type="button" data-ci="${m.id}" aria-pressed="${lCover.mode === 'item' && lCover.id === m.id}" aria-label="${esc(m.title)}" style="background-image:${itemBg(m)}"></button>`).join('')}</div>` : `<p class="hint">${esc(t('l_cover_noitems'))}</p>`)
    : `<div class="up-row"><button type="button" class="btn sm" data-lc-up><i class="ti ti-photo-up"></i>${esc(t(lCover.src ? 'l_cover_change' : 'ap_pick_img'))}</button>${lCover.src ? `<button type="button" class="btn sm" data-lc-rm><i class="ti ti-trash"></i>${esc(t('ap_remove'))}</button>` : ''}</div>${lCover.src ? `<div class="crop" id="lCrop" tabindex="0" role="group" aria-label="${esc(t('l_crop_aria'))}"><img alt="" draggable="false"></div><label class="crop-zoom"><i class="ti ti-zoom-in"></i><input type="range" id="lZoom" min="1" max="3" step="0.02" value="${lCover.z || 1}" aria-label="${esc(t('l_crop_zoom'))}"></label><p class="hint">${esc(t('l_crop_hint'))}</p>` : ''}`;
  if (lCover.mode === 'image' && lCover.src) cropStart();
}
/* choose which part of a picture is the cover: drag to move, slider to zoom; the chosen part is baked to a small picture when the list is saved */
const COVER_W = 640, COVER_H = 320; let lCrop = null;
function cropLayout() {                                   // where the picture sits in the frame, from the focus (x, y: 0–1) and zoom
  const { img, W, H } = lCrop, z = lCover.z || 1, k = Math.max(W / img.naturalWidth, H / img.naturalHeight) * z, w = img.naturalWidth * k, h = img.naturalHeight * k;
  const left = (W - w) * (lCover.x ?? .5), top = (H - h) * (lCover.y ?? .5); Object.assign(img.style, { width:w + 'px', height:h + 'px', left:left + 'px', top:top + 'px' });
  return { k, left, top };
}
function cropStart() {
  const box = $('lCrop'); if (!box) return; const img = box.querySelector('img'); lCrop = { img, W:0, H:0 };
  img.onload = () => { const r = box.getBoundingClientRect(); lCrop.W = r.width; lCrop.H = r.height; cropLayout(); }; img.src = lCover.src;
  let drag = null; const move = (dx, dy) => { const { img, W, H } = lCrop, z = lCover.z || 1, k = Math.max(W / img.naturalWidth, H / img.naturalHeight) * z, sx = W - img.naturalWidth * k, sy = H - img.naturalHeight * k;
    if (sx < -1) lCover.x = Math.min(1, Math.max(0, (lCover.x ?? .5) + dx / sx)); if (sy < -1) lCover.y = Math.min(1, Math.max(0, (lCover.y ?? .5) + dy / sy)); cropLayout(); };
  box.onpointerdown = e => { drag = [e.clientX, e.clientY]; box.setPointerCapture(e.pointerId); box.classList.add('grab'); };
  box.onpointermove = e => { if (!drag) return; move(e.clientX - drag[0], e.clientY - drag[1]); drag = [e.clientX, e.clientY]; };
  box.onpointerup = box.onpointercancel = () => { drag = null; box.classList.remove('grab'); };
  box.onkeydown = e => { const d = { ArrowLeft:[-12, 0], ArrowRight:[12, 0], ArrowUp:[0, -12], ArrowDown:[0, 12] }[e.key]; if (d) { e.preventDefault(); move(-d[0], -d[1]); } };
  $('lZoom').oninput = e => { lCover.z = Number(e.target.value); cropLayout(); };
}
function bakeCover() {
  const { img } = lCrop || {}; if (!img || !img.naturalWidth) return; const { k, left, top } = cropLayout(), c = document.createElement('canvas'); c.width = COVER_W; c.height = COVER_H;
  c.getContext('2d').drawImage(img, -left / k, -top / k, lCrop.W / k, lCrop.H / k, 0, 0, COVER_W, COVER_H); lCover.img = c.toDataURL('image/jpeg', .85);
}
$('lCoverTabs').addEventListener('click', e => { const b = e.target.closest('[data-lc]'); if (b) { lCoverTab = b.dataset.lc; if (lCoverTab === 'auto') lCover = { mode:'auto' }; drawListCover(); } });
$('lCoverBody').addEventListener('click', e => {
  const c = e.target.closest('[data-ci]'); if (c) { lCover = { mode:'item', id:Number(c.dataset.ci) }; return drawListCover(); }
  if (e.target.closest('[data-lc-up]')) return $('lCoverFile').click();
  if (e.target.closest('[data-lc-rm]')) { lCover = { mode:'auto' }; drawListCover(); }
});
$('lCoverFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { lCover = { mode:'image', src:(await readImage(f, 960, 'image/jpeg', .82)).url, x:.5, y:.5, z:1 }; drawListCover(); } catch (x) { toast(t('ap_bad_img'), true); } };
function openListDialog(id, after) {
  lEdit = id; lAfter = after || null; const l = id ? listById(id) : null;
  $('lTitle').textContent = t(id ? 'l_edit_title' : 'l_new_title'); lform.elements.name.value = l ? l.name : ''; lform.elements.desc.value = l ? (l.desc || '') : '';
  lColor = l ? l.color : LIST_COLORS[LISTS.length % LIST_COLORS.length]; (lCp = lCp || colorPicker($('lColors'), () => lColor, v => { lColor = v; }, [LIST_COLORS]))(); lCover = l && l.cover ? { ...l.cover } : { mode:'auto' }; if (lCover.mode === 'image' && !lCover.src) lCover.src = lCover.img; lCoverTab = lCover.mode; drawListCover(); $('lDelete').style.display = id ? '' : 'none'; ldlg.showModal(); setTimeout(() => lform.elements.name.focus(), 50);
}
$('lCancel').onclick = () => ldlg.close();
lform.addEventListener('submit', async e => {
  e.preventDefault(); const name = lform.elements.name.value.trim(); if (!name) return; if (lCover.mode === 'image' && lCover.src) bakeCover(); else if (lCover.mode !== 'image') lCrop = null;
  let l = lEdit && listById(lEdit); if (l) { l.name = name; l.desc = lform.elements.desc.value.trim(); l.color = lColor; l.cover = lCover; } else { l = { id:newId(), name, desc:lform.elements.desc.value.trim(), color:lColor, cover:lCover, createdAt:Date.now() }; LISTS.push(l); }
  await saveLists(); ldlg.close(); renderAll(); toast(t('t_saved')); if (lAfter) lAfter(l);
});
$('lDelete').onclick = async () => {
  if (!lEdit || !(await ask(t('l_confirm_del')))) return; const id = lEdit;
  LISTS = LISTS.filter(x => x.id !== id); await saveLists(); const recs = media.filter(m => (m.lists || []).includes(id)).map(m => ({ ...m, lists:m.lists.filter(x => x !== id) })); if (recs.length) await DB.putMany('media', recs);
  delete LVIEWS[id]; saveListViews(); ldlg.close(); await reload(); toast(t('t_deleted', { n:1 }));
};

