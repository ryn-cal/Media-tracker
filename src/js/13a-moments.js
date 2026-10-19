/* =====================================================================
   Moments: what the Surprise section understands about "this evening, rainy, with the family, something cosy".
   Nothing here is stored on an item. Each value of each facet is a small table of how well things fit it, written once for every
   language and read against what the app already knows about an item: its tags, its kind, its year, its length and its language.
   momentFit(item, moment) → { fit: 0…1, hits: [[facet, value], …] } — the facets that fit well, for the sentence under the result.
   ===================================================================== */
const MFACETS = ['mood', 'occasion', 'atmosphere', 'festival', 'era', 'place', 'weather', 'age'];
const MFACETS_MAIN = ['mood', 'occasion', 'atmosphere', 'festival'];            // the rest are under "More moments"
/* value → { tag: weight, … }  (tags are the built-in genre keys; kinds are written k:film, k:book …; extra rules below) */
const MVALUES = {
  mood: {
    laugh:   { comedy:1, animation:.6, romance:.4 },
    cry:     { drama:1, romance:.7, history:.4, animation:.3 },
    think:   { documentary:1, scifi:.8, 'psychological-thriller':.7, mystery:.6, drama:.6, history:.6, 'k:book':.4 },
    thrill:  { thriller:1, 'psychological-thriller':.9, action:.9, crime:.8, horror:.7, mystery:.7 },
    relax:   { animation:.8, comedy:.7, romance:.6, fantasy:.6, 'k:music':.8, 'k:art':.6 },
    inspire: { documentary:.8, drama:.6, history:.6, action:.4 }
  },
  occasion: {                                                                      // length rules are in MLEN
    alone:   {},
    date:    { romance:1, comedy:.8, drama:.5, fantasy:.4 },
    friends: { comedy:1, action:.9, horror:.8, thriller:.6, scifi:.6 },
    family:  { animation:1, fantasy:.8, comedy:.7, 'k:anime':.5 },
    commute: { 'k:music':1, 'k:book':.7, comedy:.4 },
    bedtime: { 'k:music':.9, 'k:book':.8, animation:.6, fantasy:.4, romance:.3 },
    marathon:{ 'k:series':1, 'k:anime':1, fantasy:.5, scifi:.4 }
  },
  atmosphere: {
    cosy:    { animation:.8, romance:.7, comedy:.6, fantasy:.6, drama:.4, 'k:book':.6 },
    tense:   { thriller:1, 'psychological-thriller':1, mystery:.9, horror:.8, crime:.8 },
    dreamy:  { fantasy:1, animation:.8, scifi:.6, romance:.5, 'k:art':.8, 'k:music':.7 },
    epic:    { history:.9, fantasy:.9, action:.8, scifi:.8, 'k:anime':.6 },
    quiet:   { drama:.8, documentary:.7, 'k:book':1, 'k:music':.8, 'k:art':.8 },
    warm:    { romance:.8, comedy:.7, animation:.7, drama:.5 },
    eerie:   { horror:1, gothic:1, mystery:.8, 'psychological-thriller':.8, thriller:.6 }
  },
  festival: {
    spring:  { comedy:.9, animation:.7, drama:.5, romance:.3 },
    midautumn:{ romance:.8, drama:.6, animation:.5, 'k:music':.7 },
    christmas:{ animation:.9, romance:.8, comedy:.8, fantasy:.6 },
    halloween:{ horror:1, gothic:1, thriller:.8, 'psychological-thriller':.8, mystery:.7, fantasy:.4 },
    valentine:{ romance:1, comedy:.6, drama:.5 },
    newyear: { comedy:.6, 'k:music':.8, documentary:.4, drama:.4 },
    summer:  { comedy:.8, action:.7, animation:.7, romance:.6 }
  },
  era: {},                                                                         // by year, see MERA
  place: {
    west:    {},                                                                   // by language, see MLANG
    europe:  {}, asia:{},
    space:   { scifi:1, fantasy:.3 },
    past:    { history:1, gothic:.6, drama:.3 }
  },
  weather: {
    rainy:   { drama:.8, mystery:.8, romance:.7, crime:.6, thriller:.5, 'k:book':.6, 'k:music':.6 },
    snowy:   { animation:.8, romance:.7, fantasy:.7, drama:.6 },
    hot:     { comedy:.8, action:.7, animation:.6, romance:.6, horror:.5 },
    grey:    { drama:.8, crime:.7, mystery:.7, 'k:book':.6, documentary:.5 },
    clear:   { comedy:.7, 'k:music':.7, action:.6, documentary:.6, animation:.6 }
  },
  age: {
    kids:    { animation:1, fantasy:.8, comedy:.6, horror:0, crime:0, thriller:0, 'psychological-thriller':0 },
    teens:   { animation:.6, action:.8, comedy:.8, fantasy:.7, scifi:.7, horror:.3 },
    adults:  { drama:.8, crime:.8, thriller:.8, mystery:.7, history:.6, documentary:.7, horror:.6 },
    allages: { animation:1, comedy:.8, fantasy:.8, romance:.4, horror:0, crime:0, thriller:0 }
  }
};
const MERA = { classic:[0, 1969], seventies:[1970, 1989], nineties:[1990, 1999], noughties:[2000, 2009], recent:[2010, 3000] };
const MLANG = { west:/^(en|english|英语|英文|fr|french|法语|de|german|德语|es|spanish|西班牙语|it|italian|意大利语)/i, europe:/^(fr|french|法语|de|german|德语|es|spanish|西班牙语|it|italian|意大利语|sv|swedish|瑞典语|ru|russian|俄语)/i, asia:/^(zh|chinese|中文|汉语|普通话|粤语|ja|japanese|日语|ko|korean|韩语|hi|hindi|th|thai)/i };
const MLEN = {                                                                      // minutes: [soft low, soft high]; outside it the fit drops
  commute:[0, 45], bedtime:[0, 70], date:[80, 135], friends:[80, 150], family:[70, 130], marathon:[0, 1e9]
};
const MPAGES = { commute:[0, 220], bedtime:[0, 320] };                              // books, in pages

/* ---- today: the moment the app can guess without being told ---- */
function lunarParts(d) {
  try { const p = new Intl.DateTimeFormat('en-u-ca-chinese', { month:'numeric', day:'numeric' }).formatToParts(d), o = {}; p.forEach(x => { o[x.type] = x.value; }); return { m:parseInt(o.month, 10), d:parseInt(o.day, 10), leap:/bis/i.test(o.month || '') }; } catch (e) { return null; }
}
function momentAuto(now) {
  now = now || new Date(); const out = {}, h = now.getHours(), dow = now.getDay(), mo = now.getMonth() + 1, day = now.getDate(), lu = lunarParts(now);
  if (h >= 22 || h < 5) out.occasion = 'bedtime'; else if ((dow === 0 || dow === 6) && h >= 9 && h < 20) out.occasion = 'marathon';
  if (lu && !lu.leap && ((lu.m === 12 && lu.d >= 24) || (lu.m === 1 && lu.d <= 8))) out.festival = 'spring';
  else if (lu && !lu.leap && lu.m === 8 && lu.d >= 10 && lu.d <= 17) out.festival = 'midautumn';
  else if (mo === 10 && day >= 24) out.festival = 'halloween';
  else if (mo === 12 && day >= 17 && day <= 26) out.festival = 'christmas';
  else if ((mo === 12 && day >= 28) || (mo === 1 && day <= 2)) out.festival = 'newyear';
  else if (mo === 2 && day >= 10 && day <= 14) out.festival = 'valentine';
  else if (mo === 7 || mo === 8) out.festival = 'summer';
  return out;
}

/* ---- how well does one item fit one value of one facet? 0…1; .5 means "no information" ---- */
function mAffinity(m, facet, value) {
  const tags = m.genre || [], tab = (MVALUES[facet] || {})[value] || {}, known = tags.length > 0;
  if (!Object.keys(tab).length && !MLEN[value] && facet !== 'era' && facet !== 'place') return .6;       // "alone" fits anything
  if (facet === 'era') { const r = MERA[value]; if (!r) return .5; if (!m.year) return .5; return m.year >= r[0] && m.year <= r[1] ? 1 : (Math.abs(m.year - (m.year < r[0] ? r[0] : r[1])) <= 10 ? .35 : .08); }
  let best = null;
  Object.keys(tab).forEach(k => { const w = tab[k]; if (k.startsWith('k:')) { if (m.type === k.slice(2)) best = Math.max(best == null ? 0 : best, w); } else if (tags.includes(k)) best = Math.max(best == null ? 0 : best, w); });
  if (facet === 'place') { const lang = (m.language || '').trim(); if (lang && MLANG[value] && MLANG[value].test(lang)) best = Math.max(best || 0, value === 'west' ? .7 : .85); else if (lang && MLANG[value] && value !== 'west' && best == null) best = .1; }
  if (facet === 'occasion' && MLEN[value]) {
    const len = m.type === 'book' || unitOf(m.type) === 'pages' ? null : m.runtime, pg = m.pages && (unitOf(m.type) === 'pages') ? m.pages : null; let lenFit = .5;
    if (len) { const [lo, hi] = MLEN[value]; lenFit = len < lo ? .6 : len <= hi ? 1 : Math.max(.1, 1 - (len - hi) / hi); } else if (pg && MPAGES[value]) { const [lo, hi] = MPAGES[value]; lenFit = pg <= hi ? 1 : Math.max(.15, 1 - (pg - hi) / hi); }
    const base = best == null ? (known || Object.keys(tab).length ? .45 : .6) : best; return Math.max(0, Math.min(1, base * .6 + lenFit * .4));
  }
  if (best == null) return known || Object.keys(tab).length ? (known ? .15 : .5) : .5;           // has tags, none match → low; no tags at all → unknown
  return best;
}
/* moment: { facet: value, … } with only the facets you chose. strict: 1 hint · 2 balanced · 3 must fit */
function momentFit(m, moment) {
  const keys = Object.keys(moment).filter(k => moment[k]); if (!keys.length) return { fit:1, hits:[] };
  let sum = 0; const hits = [];
  keys.forEach(k => { const a = mAffinity(m, k, moment[k]); sum += a; if (a >= .6) hits.push([k, moment[k]]); });
  return { fit:sum / keys.length, hits };
}
