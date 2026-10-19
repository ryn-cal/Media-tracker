/* =====================================================================
   Wallpapers: public-domain paintings (Wikimedia Commons)
   ===================================================================== */
const WP_FALLBACK = { dawn:'linear-gradient(160deg,#3b4a6b,#e0906a)', morning:'linear-gradient(160deg,#6aa6d6,#cfe6f3)', noon:'linear-gradient(160deg,#4f9a8a,#a9d3c3)', afternoon:'linear-gradient(160deg,#7aa95c,#e6d38a)', dusk:'linear-gradient(160deg,#5d6b8c,#e0a15e)', evening:'linear-gradient(160deg,#7a2d2a,#2f5a45)', night:'linear-gradient(160deg,#10204a,#2c4a8a)' };
const WP_TINT = { dawn:'#c2785a', morning:'#4f8fc4', noon:'#4a9a86', afternoon:'#6f9f50', dusk:'#b8774a', evening:'#a8503f', night:'#3d5fa8' };
const wpT = w => prefs.lang === 'zh' ? (w.tz || (w.c && w.c !== 'art' && w.c !== 'mine' ? t('wk_' + w.c) : w.t)) : w.t, wpA = w => prefs.lang === 'zh' && w.az ? w.az : w.a, wpY = w => prefs.lang === 'zh' ? String(w.y).replace(/^c\.\s*/, '约') : w.y;
const wpWidth = () => innerWidth > 1900 ? 1920 : 1280;   // 1280 is a standard Wikimedia thumbnail step that is already cached for every painting listed
const PERIOD_START = { dawn:240, morning:360, noon:660, afternoon:840, dusk:1020, evening:1140, night:1320 };
const wpSlot = (per, now) => { let rel = now.getHours() * 60 + now.getMinutes() - PERIOD_START[per]; if (rel < 0) rel += 1440; return Math.floor(rel / (Number(prefs.rot) || 20)); };
const wpUrl = (w, width) => 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(w.f) + '?width=' + (width || 1920);
let mineList = [];                       // the user's own images (book covers, album art, photos…), stored as data URLs

