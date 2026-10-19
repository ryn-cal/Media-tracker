/* =====================================================================
   Assistant — on-device rules, with optional Claude for open questions
   ===================================================================== */
const AIS = { msgs:(() => { try { const v = JSON.parse(store.get('vmm.aichat', '[]')); return Array.isArray(v) ? v : []; } catch (e) { return []; } })(), busy:false };
const saveChat = () => store.set('vmm.aichat', JSON.stringify(AIS.msgs.slice(-40)));
const AI_CHIPS = { local:['a_c1', 'a_c2', 'a_c3', 'a_c4', 'a_c5', 'a_c6'], claude:['a_c1', 'a_c8', 'a_c9', 'a_c3', 'a_c7', 'a_c6'] };
const AI_CAN = [['wand', 'a_c1'], ['clock', 'a_c2'], ['chart-bar', 'a_c3'], ['star', 'a_c4'], ['player-play', 'a_c5'], ['plus', 'a_c6'], ['star-off', 'a_c7']];
/* the assistant's mark: a small four-point spark inside a hairline ring, drawn in the page's accent — no gradient, no letters */
const AI_MARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z"/></svg>';
const stripName = () => { const n = (PROFILE.name || prefs.name || '').trim(); return n ? (prefs.lang === 'zh' ? '，' : ', ') + n : ''; };
const typeLabel = ty => (L().types || {})[ty] || ty;

function renderAsk() {
  const claude = aiMode() === 'claude';
  $('askMode').className = 'modebadge' + (claude ? ' cl' : ''); $('askMode').innerHTML = `<i class="ti ti-${claude ? 'sparkles' : 'lock'}"></i>${esc(t(claude ? 'ask_mode_claude' : 'ask_mode_local'))}`;
  $('askPriv').textContent = t(claude ? 'ask_priv_claude' : 'ask_priv_local');
  $('askCan').innerHTML = AI_CAN.map(([ic, k]) => `<li><button type="button" data-q="${esc(t(k))}"><i class="ti ti-${ic}"></i><span>${esc(t(k))}</span></button></li>`).join('');
  $('askChips').innerHTML = AI_CHIPS[claude ? 'claude' : 'local'].map(k => `<button class="chip" type="button" data-q="${esc(t(k))}">${esc(t(k))}</button>`).join('');
  const hello = `<div class="am ai"><span class="av" role="img" aria-label="${esc(t('ask_avatar'))}">${AI_MARK}</span><div class="stack"><div class="bub">${esc(t('a_hello', { name:stripName() }))}\n${esc(t('a_hello2'))}</div></div></div>`;
  $('askMsgs').innerHTML = hello + AIS.msgs.map(msgHtml).join(''); const box = $('askMsgs'); box.scrollTop = box.scrollHeight; requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
}
function msgHtml(m, i) {
  if (m.role === 'user') return `<div class="am user"><div class="bub">${esc(m.text)}</div></div>`;
  return `<div class="am ai"><span class="av" role="img" aria-label="${esc(t('ask_avatar'))}">${AI_MARK}</span><div class="stack">${m.text ? `<div class="bub ${m.cls || ''}">${esc(m.text)}</div>` : ''}${(m.cards || []).map((c, ci) => aiCardHtml(c, i, ci)).join('')}</div></div>`;
}
function aiCardHtml(c, mi, ci) {
  const at = `data-mi="${mi}" data-ci="${ci}"`;
  if (c.k === 'media') {
    const m = media.find(x => x.id === c.id); if (!m) return '';
    const col = (TYPES[m.type] || TYPES.other).c, meta = [typeLabel(m.type), m.year, m.runtime ? fmtRuntime(m.runtime) : '', m.rating ? '★ ' + m.rating : ''].filter(Boolean).join(' · ');
    const acts = `<button class="btn sm" data-act="open" ${at}>${esc(t('a_btn_open'))}</button>${m.status === 'want' ? `<button class="btn sm primary" data-act="start" ${at}><i class="ti ti-player-play"></i>${esc(t('a_btn_start'))}</button>` : ''}${m.status === 'doing' ? `<button class="btn sm primary" data-act="finish" ${at}><i class="ti ti-check"></i>${esc(t('a_btn_done'))}</button>` : ''}`;
    return `<div class="ac"><div class="po" style="--c:${col};${m.cover ? `background-image:url('${esc(m.cover)}')` : ''}">${m.cover ? '' : esc([...m.title][0] || '')}</div><div class="tx"><b>${esc(m.title)}</b><span>${esc(meta)}</span></div><div class="acts">${acts}</div></div>`;
  }
  if (c.k === 'add') {
    const r = c.rec, meta = [typeLabel(r.type), r.year, (L().status || {})[r.status], r.rating ? '★ ' + r.rating : ''].filter(Boolean).join(' · ');
    return `<div class="ac confirm ${c.done ? 'done' : ''}"><div class="po" style="--c:${(TYPES[r.type] || TYPES.other).c}">${esc([...r.title][0] || '')}</div><div class="tx"><b>${esc(r.title)}</b><span>${esc(meta)}</span></div><div class="acts">${c.done ? `<span class="tx"><span>✓</span></span>` : `<button class="btn sm primary" data-act="add" ${at}><i class="ti ti-plus"></i>${esc(t('a_btn_add'))}</button><button class="btn sm" data-act="no" ${at}>${esc(t('a_btn_cancel'))}</button>`}</div></div>`;
  }
  if (c.k === 'finish') {
    const m = media.find(x => x.id === c.id); if (!m) return '';
    return `<div class="ac confirm ${c.done ? 'done' : ''}"><div class="po" style="--c:${(TYPES[m.type] || TYPES.other).c}">${esc([...m.title][0] || '')}</div><div class="tx"><b>${esc(m.title)}</b><span>${esc(c.rating ? '★ ' + c.rating : (L().status || {}).done)}</span></div><div class="acts">${c.done ? `<span class="tx"><span>✓</span></span>` : `<button class="btn sm primary" data-act="fin" ${at}><i class="ti ti-check"></i>${esc(t('a_btn_done'))}</button><button class="btn sm" data-act="no" ${at}>${esc(t('a_btn_cancel'))}</button>`}</div></div>`;
  }
  return '';
}
function aiPush(msg) { AIS.msgs.push(msg); saveChat(); renderAsk(); }

/* --- language understanding (English + Chinese keywords) --- */
const RX = {
  add:/^\s*(?:please\s+)?(?:add|track|log|save|new|加入|添加|加|记录)\s*[:：]?\s*(.+)$/i,
  finish:/^\s*(?:i\s+)?(?:just\s+)?(?:finished|completed|watched|read|played|看完了?|看过了?|读完了?|玩完了?)\s*[:：]?\s*(.+)$/i,
  rec:/(what\s+(?:should|can|shall)\s+i\s+(?:watch|read|play|see)|recommend|suggest|tonight|something\s+(?:to|short|light|easy)|pick\s+(?:me|something|for)|看什么|推荐|今晚|随便|挑一|选一)/i,
  doing:/(in\s+progress|currently|right\s+now|watching\s+now|what\s+am\s+i\s+(?:watching|reading|playing)|在看|进行中|正在)/i,
  stats:/(how\s+many|count|total|stats|statistics|summary|how\s+much|average|多少|统计|总共|概览|平均|一共)/i,
  top:/(best|top|highest|favou?rite|loved|最高|最好|最爱|评分最)/i,
  unrated:/(unrated|not\s+rated|without\s+(?:a\s+)?rating|no\s+rating|没评分|未评分|没打分)/i,
  old:/(oldest|longest|backlog|waiting|积压|最久|等了)/i,
  find:/(find|search|show|list|which|where|any|搜索|查找|找|列出|显示|有没有|哪些)/i,
  hi:/^\s*(hi|hello|hey|help|帮助|你好|嗨)\b/i
};
const TYPE_RX = { film:/\b(film|films|movie|movies)\b|电影/i, series:/\b(series|show|shows|tv|drama)\b|剧集|电视剧|美剧|日剧|韩剧/i, anime:/\banime\b|动画|动漫/i, book:/\b(book|books|novel|novels)\b|书籍|小说|图书/i, music:/\b(music|album|albums)\b|音乐|专辑/i, game:/\b(game|games)\b|游戏/i, art:/\b(art|painting|paintings)\b|艺术|画/i };
const STATUS_RX = { want:/\b(want|watchlist|backlog|queue|to\s?watch|to\s?read|planned)\b|想看|待看|想读|想玩/i, doing:/\b(watching|reading|playing|in\s+progress)\b|在看|在读|进行/i, done:/\b(finished|completed|done|watched)\b|看完|看过|已完成|读完/i, dropped:/\b(dropped|abandoned|quit)\b|放弃|弃/i };
const detectType = q => Object.keys(TYPE_RX).find(k => TYPE_RX[k].test(q));
const detectStatus = q => Object.keys(STATUS_RX).find(k => STATUS_RX[k].test(q));
function detectGenres(q) { const lq = q.toLowerCase(); return GENRE_KEYS.filter(g => { const nm = gname(g).toLowerCase(); return lq.includes(nm) || lq.includes(g.replace(/-/g, ' ')) || ['zh', 'en'].some(l => I18N[l] && I18N[l].v && I18N[l].v.genres[g] && lq.includes(String(I18N[l].v.genres[g]).toLowerCase())); }); }
function detectMax(q) { let m = q.match(/(?:under|below|less\s+than|within|<)\s*(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|min|mins|minutes?)?/i) || q.match(/(\d+)\s*(分钟|小时)\s*(?:以内|以下|内)/); if (!m) return /\bshort\b|短片|短的/i.test(q) ? 100 : 0; const n = parseFloat(m[1]), u = (m[2] || 'min').toLowerCase(); return /^(h|hr|hrs|hour|hours|小时)$/.test(u) ? n * 60 : n; }
const yearStart = () => new Date(new Date().getFullYear(), 0, 1).getTime(), monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
const fuzzy = s => String(s || '').toLowerCase().replace(/[\s:：·\-_.,'’"“”!?！？]/g, '');
const findByTitle = q => { const f = fuzzy(q); if (!f) return null; return media.find(m => fuzzy(m.title) === f) || media.find(m => fuzzy(m.title).includes(f) || (fuzzy(m.alt) && fuzzy(m.alt).includes(f))) || media.find(m => f.includes(fuzzy(m.title)) && fuzzy(m.title).length > 2) || null; };
function parseEntry(raw) {
  let s = raw.trim(), rating = 0, year = null;
  let m = s.match(/(\d(?:\.\d)?)\s*(?:stars?|★|星)/i); if (m) { rating = Math.min(5, parseFloat(m[1])); s = s.replace(m[0], ' '); }
  m = s.match(/\b(1[89]\d\d|20\d\d)\b/); if (m) { year = Number(m[1]); s = s.replace(m[0], ' '); }
  const type = detectType(s) || 'film', status = detectStatus(s) || (rating ? 'done' : 'want');
  Object.values(TYPE_RX).forEach(r => { s = s.replace(new RegExp(r.source, 'ig'), ' '); }); Object.values(STATUS_RX).forEach(r => { s = s.replace(new RegExp(r.source, 'ig'), ' '); });
  s = s.replace(/\b(to|as|my|a|an|the)\b(?=\s*(?:list|library|tracker|watchlist)?\s*$)/ig, ' ').replace(/\b(to my (?:list|library|tracker|watchlist)|in my (?:list|library))\b/ig, ' ').replace(/[“”"「」《》]/g, '').replace(/\s+/g, ' ').trim();
  if (!s) return null; return { title:s, type, status, year, rating, genre:[], notes:'', addedAt:Date.now() };
}
const ids = list => list.map(m => ({ k:'media', id:m.id }));
function ruleAnswer(q) {
  q = q.trim();
  let m = q.match(RX.finish); if (m && !RX.rec.test(q) && !/\?\s*$/.test(q) && !/\b(how many|which|what)\b/i.test(q) && !/多少|哪些/.test(q)) {
    const ra = m[1].match(/(\d(?:\.\d)?)\s*(?:stars?|★|星)/i), rating = ra ? Math.min(5, parseFloat(ra[1])) : 0, title = m[1].replace(ra ? ra[0] : '', '').replace(/\bwith\b\s*$/i, '').replace(/[“”"]/g, '').trim(), hit = findByTitle(title);
    if (hit && hit.status === 'done' && !rating) return { text:t('a_dup', { t:hit.title }), cards:ids([hit]) };
    if (hit) return { text:t('a_fin_ask', { t:hit.title, r:rating ? ' (★ ' + rating + ')' : '' }), cards:[{ k:'finish', id:hit.id, rating }] };
    const rec = parseEntry(title); if (rec) { rec.status = 'done'; rec.rating = rating; return { text:t('a_fin_nf', { t:rec.title }), cards:[{ k:'add', rec }] }; }
  }
  m = q.match(RX.add); if (m) { const rec = parseEntry(m[1]); if (rec) { const dup = media.find(x => mediaKey(x) === mediaKey(rec)) || findByTitle(rec.title); if (dup && fuzzy(dup.title) === fuzzy(rec.title)) return { text:t('a_dup', { t:dup.title }), cards:ids([dup]) }; return { text:t('a_add_ask'), cards:[{ k:'add', rec }] }; } }
  return null;
}
function localAnswer(q) {
  const a = ruleAnswer(q); if (a) return a;
  const ty = detectType(q), st = detectStatus(q), gs = detectGenres(q), mx = detectMax(q);
  const ofType = list => ty ? list.filter(x => x.type === ty) : list;
  if (RX.hi.test(q) && q.trim().length < 14) return { text:t('a_hello', { name:stripName() }) + '\n' + t('a_hello2') };
  if ((RX.rec.test(q) || (mx && !RX.stats.test(q) && !RX.top.test(q) && !RX.old.test(q))) && !RX.stats.test(q)) {
    const pool = media.filter(x => x.status === 'want'); if (!pool.length) return { text:t('a_rec_none') };
    let f = ofType(pool); if (gs.length) f = f.filter(x => (x.genre || []).some(g => gs.includes(g))); if (mx) f = f.filter(x => !x.runtime || x.runtime <= mx);
    const loose = !f.length, use = loose ? pool : f, why = [ty ? typeLabel(ty) : '', gs.map(gname).join(' / '), mx ? '≤ ' + fmtRuntime(mx) : ''].filter(Boolean).join(', ');
    const ranked = use.slice().sort((x, y) => (y.fav ? 2 : 0) + (y.rating || 0) * .1 - (x.fav ? 2 : 0) - (x.rating || 0) * .1 || x.addedAt - y.addedAt).slice(0, 3);
    return { text:loose && why ? t('a_rec_loose') : t('a_rec', { why:why ? ' (' + why + ')' : '' }), cards:ids(ranked) };
  }
  if (RX.unrated.test(q)) { const l = ofType(media.filter(x => x.status === 'done' && !x.rating)); return l.length ? { text:t('a_unrated', { n:l.length }), cards:ids(l.slice(0, 6)) } : { text:t('a_unrated_none') }; }
  if (RX.doing.test(q) && !RX.stats.test(q)) { const l = ofType(media.filter(x => x.status === 'doing')); return l.length ? { text:t('a_doing', { n:l.length }), cards:ids(l.slice(0, 6)) } : { text:t('a_doing_none') }; }
  if (RX.stats.test(q)) {
    const c = s => media.filter(x => x.status === s).length, done = media.filter(x => x.status === 'done'), rated = media.filter(x => x.rating > 0);
    const y = done.filter(x => doneTs(x) >= yearStart()).length, mo = done.filter(x => doneTs(x) >= monthStart()).length;
    let txt = t('a_stats', { total:media.length, want:c('want'), doing:c('doing'), done:c('done'), dropped:c('dropped'), y, m:mo });
    if (rated.length) txt += '\n' + t('a_avg', { avg:(rated.reduce((a, x) => a + x.rating, 0) / rated.length).toFixed(1), n:rated.length });
    const mins = done.reduce((a, x) => a + (x.runtime || 0), 0); if (mins >= 60) txt += '\n' + t('a_time', { h:Math.round(mins / 60) });
    return { text:txt };
  }
  if (RX.top.test(q)) { const l = ofType(media.filter(x => x.rating > 0)).sort((a, b) => b.rating - a.rating || (b.fav ? 1 : 0) - (a.fav ? 1 : 0)).slice(0, 5); return l.length ? { text:t('a_top'), cards:ids(l) } : { text:t('a_top_none') }; }
  if (RX.old.test(q)) { const l = ofType(media.filter(x => x.status === 'want')).sort((a, b) => a.addedAt - b.addedAt).slice(0, 5); return l.length ? { text:t('a_old'), cards:ids(l) } : { text:t('a_rec_none') }; }
  if (RX.find.test(q) || ty || st || gs.length) {
    let l = media.slice(); if (ty) l = l.filter(x => x.type === ty); if (st) l = l.filter(x => x.status === st); if (gs.length) l = l.filter(x => (x.genre || []).some(g => gs.includes(g)));
    const words = q.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w.length > 2 && !/^(find|search|show|list|which|where|any|all|the|that|with|have|for|and|film|films|movie|movies|series|anime|book|books|game|games|music|want|watch|watched|finished|done|not|rated|unrated|top|best)$/.test(w));
    if (words.length && !(ty || st || gs.length)) l = l.filter(x => words.some(w => [x.title, x.alt, x.creator, x.cast, x.notes].join(' ').toLowerCase().includes(w)));
    else if (words.length && l.length > 6) { const narrowed = l.filter(x => words.some(w => [x.title, x.alt, x.creator, x.cast].join(' ').toLowerCase().includes(w))); if (narrowed.length) l = narrowed; }
    return l.length ? { text:t('a_find', { n:l.length }), cards:ids(l.slice(0, 8)) } : { text:t('a_find_none') };
  }
  return null;
}
function aiSnapshot() {
  const cap = media.slice().sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)).slice(0, 400);
  return JSON.stringify({ today:new Date().toISOString().slice(0, 10), counts:Object.keys(STATUSES).reduce((o, s) => (o[s] = media.filter(m => m.status === s).length, o), {}), columns:['title', 'type', 'status', 'year', 'rating', 'genres', 'runtimeMin', 'creator', 'favourite'], items:cap.map(m => [m.title, m.type, m.status, m.year || '', m.rating || '', (m.genre || []).slice(0, 3).map(gname).join('/'), m.runtime || '', m.creator || '', m.fav ? 1 : 0]), lists:(LISTS || []).slice(0, 30).map(l => l.name) });
}
async function askClaude(q) {
  const hist = AIS.msgs.slice(-7, -1).filter(m => m.text).map(m => (m.role === 'user' ? 'User: ' : 'Assistant: ') + m.text).join('\n');
  const sys = 'You are the assistant inside Media Tracker, a private, local-first app for tracking films, series, anime, books, music, games and art. Answer ONLY from the JSON snapshot of the user\'s library; if the answer is not in it, say so. Reply in the same language as the user. Be warm and concise (under 120 words), no markdown headings. When recommending, prefer items with status "want" unless asked otherwise and use titles exactly as written in the snapshot. You cannot change the library: if the user wants to add or finish something, tell them to type e.g. "add Title 2001 film" or "finished Title 4 stars".';
  return claudeCall(sys, 'LIBRARY SNAPSHOT:\n' + aiSnapshot() + '\n\nRECENT CHAT:\n' + hist + '\n\nQUESTION: ' + q, 600);
}
async function askSubmit(q) {
  q = (q || '').trim(); if (!q || AIS.busy) return; $('askInput').value = '';
  AIS.msgs.push({ role:'user', text:q }); let ans = null;
  const rule = (aiMode() === 'claude') ? ruleAnswer(q) : localAnswer(q);
  if (rule) ans = rule;
  else if (aiMode() === 'claude') {
    AIS.busy = true; aiPush({ role:'ai', text:t('a_think'), cls:'think', tmp:true });
    try { const txt = await askClaude(q); AIS.msgs = AIS.msgs.filter(m => !m.tmp); ans = { text:txt || t('a_unknown') }; } catch (e) { AIS.msgs = AIS.msgs.filter(m => !m.tmp); ans = { text:t('a_err', { e:e.message }), cls:'err' }; }
    AIS.busy = false;
  } else ans = { text:t('a_unknown') };
  aiPush({ role:'ai', text:ans.text, cards:ans.cards, cls:ans.cls });
}
$('askForm').addEventListener('submit', e => { e.preventDefault(); askSubmit($('askInput').value); });
document.addEventListener('click', e => { const c = e.target.closest('[data-q]'); if (!c || !c.closest('.panel[data-panel="ask"], .ug-sec')) return; if (c.closest('.ug-sec')) { setTab('ask'); } askSubmit(c.dataset.q); });
$('askClear').onclick = () => { AIS.msgs = []; saveChat(); renderAsk(); };
$('askMsgs').addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return; const mi = Number(b.dataset.mi), ci = Number(b.dataset.ci), msg = AIS.msgs[mi], c = msg && msg.cards && msg.cards[ci]; if (!c) return;
  const a = b.dataset.act;
  if (a === 'open') return openMedia(c.id);
  if (a === 'start') { await setStatus(c.id, 'doing'); toast(t('a_started', { t:(media.find(x => x.id === c.id) || {}).title || '' })); return renderAsk(); }
  if (a === 'finish') { await setStatus(c.id, 'done'); toast(t('t_saved')); return renderAsk(); }
  if (a === 'no') { msg.cards.splice(ci, 1); saveChat(); return renderAsk(); }
  if (a === 'add') { await addMedia(c.rec.status === 'done' ? { ...c.rec, doneAt:Date.now() } : c.rec.status === 'doing' ? { ...c.rec, startedAt:Date.now() } : c.rec); c.done = true; saveChat(); await reload(); toast(t('a_added', { t:c.rec.title })); return renderAsk(); }
  if (a === 'fin') { const m = media.find(x => x.id === c.id); if (!m) return; await DB.put('media', { ...m, status:'done', doneAt:Date.now(), rating:c.rating || m.rating || 0 }); c.done = true; saveChat(); await reload(); toast(t('a_finished', { t:m.title })); return renderAsk(); }
});

/* ---- Fill with AI (item drawer) ---- */
(function () {
  const stack = document.querySelector('.heroedit .stack'); if (!stack) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sm aifill'; b.id = 'aiFill'; b.style.cssText = 'align-self:flex-start'; b.innerHTML = '<i class="ti ti-sparkles"></i><span></span>'; stack.appendChild(b);
  b.onclick = async () => {
    const f = mform.elements, title = f.title.value.trim(); if (!title) return toast(t('fill_title'), true);
    if (aiMode() !== 'claude') return toast(t('fill_need'), true);
    const span = b.querySelector('span'), old = span.textContent; span.textContent = t('fill_busy'); b.disabled = true;
    try {
      const sys = 'You fill in catalogue details for a media title. Return ONLY compact JSON, no prose: {"alt":"original or alternate title or empty","year":number|null,"type":"film|series|anime|book|music|game|art|other","creator":"director/author/artist","cast":"up to 4 names comma separated","runtime":minutes number|null,"language":"original language in English","genres":["from: ' + GENRE_KEYS.join(', ') + '"],"notes":"one neutral sentence"}. Use empty values when unsure; never invent.';
      const raw = await claudeCall(sys, 'Title: ' + title + (f.year.value ? '\nYear: ' + f.year.value : '') + '\nType: ' + mTypes.get() + '\nInterface language: ' + prefs.lang, 500);
      const j = JSON.parse((raw.match(/\{[\s\S]*\}/) || ['{}'])[0]); let n = 0; const put = (k, v) => { if (v != null && v !== '' && !String(f[k].value).trim()) { f[k].value = v; n++; } };
      put('alt', j.alt); put('year', j.year); put('creator', j.creator); put('cast', j.cast); put('runtime', j.runtime); put('notes', j.notes);
      if (j.language && !f.language.value) { fillLangSelect(f.language, j.language); if (f.language.value) n++; }
      if (Array.isArray(j.genres) && !(mTags.get() || []).length) { const g = j.genres.filter(x => GENRE_KEYS.includes(x)); if (g.length) { mTags.set(g); n++; } }
      toast(n ? t('fill_ok', { n }) : t('fill_none'), !n);
    } catch (e) { toast(t('a_err', { e:e.message }), true); }
    span.textContent = old; b.disabled = false;
  };
  const sync = () => { b.querySelector('span').textContent = t('fill_btn'); b.hidden = !prefs.ai; };
  const _fill = fillMediaDrawer; fillMediaDrawer = function () { _fill.apply(this, arguments); sync(); }; sync();
})();

