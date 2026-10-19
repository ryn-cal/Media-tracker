/* =====================================================================
   Your own kinds of work (cartoon, documentary, podcast…) and tags — the data layer.
   Built-in kinds can be renamed, recoloured and given different fields; new ones are added next to them.
   The screens that edit them live in Settings → Library (js/09-library-settings.js).
   ===================================================================== */
const FIELD_KEYS = ['creator', 'cast', 'writers', 'producers', 'runtime', 'pages'];
const PRISTINE = { types:JSON.parse(JSON.stringify(TYPES)), labels:{ en:{ ...I18N.en.types }, zh:{ ...I18N.zh.types } }, fs:{ en:JSON.parse(JSON.stringify(I18N.en.fs)), zh:JSON.parse(JSON.stringify(I18N.zh.fs)) } };
const BUILTIN_TYPES = Object.keys(PRISTINE.types);
let CTYPES = jsonStore('vmm.ctypes', []);                   // [{ id, name, icon, color, unit, fields:{creator:'Author'…} }]
let TOVER = jsonStore('vmm.tover', {});                      // overrides of built-in kinds: { film:{ name, icon, color, unit, fields } }
const TORDER = jsonStore('vmm.torder', []);                 // the order kinds are listed in
const saveTypes = () => { store.set('vmm.ctypes', JSON.stringify(CTYPES)); store.set('vmm.tover', JSON.stringify(TOVER)); };
const TYPE_ICONS = ['movie', 'device-tv', 'sparkles', 'book', 'book-2', 'music', 'headphones', 'microphone', 'device-gamepad-2', 'palette', 'camera', 'video', 'masks-theater', 'mood-kid', 'school', 'ticket', 'news', 'flask', 'rocket', 'bulb', 'map-pin', 'heart', 'star', 'category-2'];
const TYPE_PRESETS = [
  { key:'cartoon', en:'Cartoon', zh:'卡通', icon:'mood-kid', color:'#e85d9c', base:'anime', unit:'time' }, { key:'documentary', en:'Documentary', zh:'纪录片', icon:'camera', color:'#3a7d8c', base:'film', unit:'time' },
  { key:'podcast', en:'Podcast', zh:'播客', icon:'microphone', color:'#8a5cc2', base:'music', unit:'time' }, { key:'comic', en:'Comic', zh:'漫画', icon:'book-2', color:'#d9822b', base:'book', unit:'pages' },
  { key:'theatre', en:'Theatre', zh:'戏剧', icon:'masks-theater', color:'#b0413e', base:'film', unit:'time' }, { key:'course', en:'Course', zh:'课程', icon:'school', color:'#2f7f5f', base:'other', unit:'time' }
];
function applyTypeCustomisation() {
  Object.keys(TYPES).forEach(k => { if (!BUILTIN_TYPES.includes(k)) delete TYPES[k]; });
  BUILTIN_TYPES.forEach(k => {
    const ov = TOVER[k] || {}; TYPES[k] = { ...PRISTINE.types[k], ...(ov.icon ? { i:ov.icon } : {}), ...(ov.color ? { c:ov.color } : {}), unit:ov.unit || undefined };
    ['en', 'zh'].forEach(l => { I18N[l].types[k] = ov.name || PRISTINE.labels[l][k]; I18N[l].fs[k] = ov.fields ? { ...ov.fields } : PRISTINE.fs[l][k]; });
  });
  CTYPES.forEach(c => { TYPES[c.id] = { i:c.icon, c:c.color, unit:c.unit, custom:true }; ['en', 'zh'].forEach(l => { I18N[l].types[c.id] = c.name; I18N[l].fs[c.id] = { ...(c.fields || {}) }; }); });
  const copy = { ...TYPES }, keys = [...TORDER.filter(k => copy[k]), ...Object.keys(copy).filter(k => !TORDER.includes(k))];
  Object.keys(TYPES).forEach(k => delete TYPES[k]); keys.forEach(k => { TYPES[k] = copy[k]; });
}
applyTypeCustomisation();
const typeUsage = id => media.filter(m => m.type === id).length;
const typeFieldsOf = id => { const c = CTYPES.find(x => x.id === id); return c ? c.fields || {} : (TOVER[id] && TOVER[id].fields) || PRISTINE.fs[prefs.lang][id] || {}; };
/* the editable copy of every kind, in display order */
const typeDrafts = () => Object.keys(TYPES).map(id => { const c = CTYPES.find(x => x.id === id), ov = TOVER[id] || {}; return c ? JSON.parse(JSON.stringify(c)) : { id, name:ov.name || I18N[prefs.lang].types[id], icon:ov.icon || PRISTINE.types[id].i, color:ov.color || PRISTINE.types[id].c, unit:ov.unit || DEFAULT_UNIT[id] || 'time', fields:{ ...typeFieldsOf(id) }, builtin:true }; });
const typePristine = id => ({ name:PRISTINE.labels[prefs.lang][id], icon:PRISTINE.types[id].i, color:PRISTINE.types[id].c, unit:DEFAULT_UNIT[id] || 'time', fields:{ ...PRISTINE.fs[prefs.lang][id] } });
/* write the drafts back: built-ins keep only what differs from the original, custom kinds are stored whole; items of a deleted kind become "other" */
async function commitTypes(drafts, order) {
  if (drafts.some(d => !d.name.trim())) return toast(t('tm_need_name'), true);
  const newC = [], newO = {};
  drafts.forEach(d => { const fields = Object.fromEntries(Object.entries(d.fields).filter(([k, v]) => FIELD_KEYS.includes(k) && String(v).trim()).map(([k, v]) => [k, String(v).trim()]));
    if (BUILTIN_TYPES.includes(d.id)) { const p = typePristine(d.id), same = d.name.trim() === p.name && d.icon === p.icon && d.color === p.color && d.unit === p.unit && JSON.stringify(fields) === JSON.stringify(p.fields); if (!same) newO[d.id] = { name:d.name.trim(), icon:d.icon, color:d.color, unit:d.unit, fields }; }
    else newC.push({ id:d.id, name:d.name.trim(), icon:d.icon, color:d.color, unit:d.unit, fields }); });
  const gone = CTYPES.filter(c => !newC.some(x => x.id === c.id)).map(c => c.id);
  CTYPES = newC; TOVER = newO; if (order) { TORDER.length = 0; TORDER.push(...order); store.set('vmm.torder', JSON.stringify(TORDER)); }
  saveTypes(); applyTypeCustomisation();
  const recs = media.filter(m => gone.includes(m.type)).map(m => ({ ...m, type:'other' })); if (recs.length) await DB.putMany('media', recs);
  await reload();
}
/* ---- tags ---- */
const TAGHUE = jsonStore('vmm.taghue', {});
const saveTagHue = () => { PVER++; store.set('vmm.taghue', JSON.stringify(TAGHUE)); };
function allTags() { const c = new Map(); media.forEach(m => (m.genre || []).forEach(g => c.set(g, (c.get(g) || 0) + 1))); files.forEach(m => (m.genre || []).forEach(g => c.set(g, (c.get(g) || 0) + 0))); return [...c].sort((a, b) => b[1] - a[1] || collator().compare(gname(a[0]), gname(b[0]))); }
async function retag(map) {                                   // map: old key → new key | null (remove)
  const fix = r => { const g = (r.genre || []).flatMap(x => x in map ? (map[x] ? [map[x]] : []) : [x]); return { ...r, genre:[...new Set(g)] }; };
  const mr = media.filter(m => (m.genre || []).some(x => x in map)).map(fix), fr = files.filter(m => (m.genre || []).some(x => x in map)).map(fix);
  if (mr.length) await DB.putMany('media', mr); if (fr.length) await DB.putMany('videos', fr); await reload();
}
/* tags that mean the same thing under another spelling or language become one key (see genreKey); runs on every load, writes only what changes */
async function normalizeTags() {
  const fix = r => { const old = r.genre || [], g = [...new Set(old.map(genreKey))]; return g.length === old.length && g.every((x, i) => x === old[i]) ? null : { ...r, genre:g }; };
  const mr = media.map(fix).filter(Boolean), fr = files.map(fix).filter(Boolean);
  if (mr.length) await DB.putMany('media', mr); if (fr.length) await DB.putMany('videos', fr); return mr.length + fr.length;
}
