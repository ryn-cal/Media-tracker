/* =====================================================================
   Table view for video files — self-contained so it serialises into the exported HTML
   ===================================================================== */
function mountView(root, getRows, opts) {
  opts = opts || {}; const S = opts.s;
  const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '';
  const gname = g => S.genres[g] || g;
  const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const decade = y => y ? (y >= 2020 ? '2020+' : Math.floor(y / 10) * 10 + 's') : '';
  const dur = s => { if (!s) return ''; s = Math.round(s); const h = Math.floor(s/3600), m = Math.floor(s%3600/60), x = s%60; return (h ? h + ':' + String(m).padStart(2,'0') : m) + ':' + String(x).padStart(2,'0'); };
  const size = b => b >= 1073741824 ? (b/1073741824).toFixed(2) + ' GB' : (b/1048576).toFixed(1) + ' MB';
  const lenOf = r => r.runtime ? r.runtime * 60 : (r.duration || 0);
  const cast = r => r.cast || r.people || '';
  const sort = { col:null, dir:'asc' }, sel = new Set(), tagSel = new Set(); let shown = [], last = null, tagMode = 'any', tagQ = '';
  const selectable = !!opts.onSelect;
  const COLS = [selectable ? ['ck', ''] : null, ['fav','♥',1], ['thumb',S.preview],['title',S.title,1],['crew',S.crew,1],['kind',S.kind,1],['genre',S.genre],['year',S.year,1],['length',S.length,1],['language',S.language,1],['file',S.file,1],['links',S.links]].filter(Boolean);
  if (opts.onEdit) COLS.push(['act','']);
  root.innerHTML = `<div class="controls">
    <div class="filter-group"><label>${esc(S.kind)}</label><select data-f="kind"></select></div>
    <div class="filter-group tagpop"><label>${esc(S.genre)}</label><details data-f="pop"><summary class="fbtn"><i class="ti ti-tags"></i><span data-f="poplab"></span></summary>
      <div class="poppanel"><input type="text" data-f="tagq" placeholder="${esc(S.searchPh)}"><div class="mini" data-f="mode"><button type="button" data-v="any">${esc(S.matchAny)}</button><button type="button" data-v="all">${esc(S.matchAll)}</button></div><div class="poplist" data-f="taglist"></div></div></details></div>
    <div class="filter-group"><label>${esc(S.decade)}</label><select data-f="decade"></select></div>
    <div class="filter-group"><label>${esc(S.language)}</label><select data-f="lang"></select></div>
    <div class="filter-group tagpop"><label>${esc(S.columns || 'Columns')}</label><details data-f="pop2"><summary class="fbtn"><span>${esc(S.columns || 'Columns')}</span></summary><div class="poppanel"><div class="poplist">${COLS.filter(c => c[0] !== 'ck' && c[0] !== 'act' && c[0] !== 'title').map(c => `<label class="pl"><input type="checkbox" data-col="${c[0]}" checked><span>${esc(c[1] || c[0])}</span></label>`).join('')}</div></div></details></div>
    <label class="favonly"><input type="checkbox" data-f="favonly"> ♥ ${esc(S.favOnly)}</label>
    <div class="filter-group"><label>${esc(S.search)}</label><input type="text" data-f="q" aria-label="${esc(S.search)}" placeholder="${esc(S.searchPh)}" style="width:180px"></div>
    <span class="count" data-f="count"></span>
  </div>
  <style data-f="cs"></style><div class="table-wrapper"><table><thead><tr>${COLS.map(c => c[0] === 'ck' ? '<th class="ck"><input type="checkbox" data-all aria-label="${esc(S.all)}"></th>' : `<th ${c[2] ? `class="sortable" data-sort="${c[0]}"` : ''}>${esc(c[1])}${c[2] ? ' <span class="sort-indicator">⇅</span>' : ''}</th>`).join('')}</tr></thead><tbody></tbody></table></div>`;
  const $ = k => root.querySelector(`[data-f="${k}"]`), tbody = root.querySelector('tbody');
  function fillSelect(el, pairs) {
    const cur = el.value;
    el.innerHTML = `<option value="">${esc(S.all)}</option>` + pairs.map(p => `<option value="${esc(p[0])}">${esc(p[1])}</option>`).join('');
    el.value = pairs.some(p => p[0] === cur) ? cur : '';
  }
  function drawTags(rows) {
    const counts = new Map(); rows.forEach(r => (r.genre || []).forEach(g => counts.set(g, (counts.get(g) || 0) + 1)));
    [...tagSel].forEach(g => { if (!counts.has(g)) tagSel.delete(g); });
    const q = tagQ.toLowerCase(), list = [...counts].filter(([g]) => !q || gname(g).toLowerCase().includes(q)).sort((a, b) => b[1] - a[1] || gname(a[0]).localeCompare(gname(b[0])));
    $('taglist').innerHTML = list.length ? list.map(([g, n]) => `<label class="pl" style="${hv(g)}"><input type="checkbox" data-tag="${esc(g)}" ${tagSel.has(g) ? 'checked' : ''}><span>${esc(gname(g))}</span><b>${n}</b></label>`).join('') : `<span class="count">—</span>`;
    $('poplab').textContent = tagSel.size ? S.genre + ' · ' + tagSel.size : S.genre;
    root.querySelectorAll('[data-f="mode"] button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === tagMode));
  }
  function refreshFilters(rows) {
    fillSelect($('kind'), Object.keys(S.kinds).filter(k => rows.some(r => r.kind === k)).map(k => [k, S.kinds[k]]));
    fillSelect($('decade'), [...new Set(rows.map(r => decade(r.year)).filter(Boolean))].sort().map(d => [d, d]));
    fillSelect($('lang'), [...new Set(rows.map(r => (r.language || '').trim()).filter(Boolean))].sort().map(d => [d, d]));
    drawTags(rows);
  }
  const sortKey = (r, c) => c === 'fav' ? (r.fav ? 1 : 0) : c === 'title' ? (r.titleCn || r.titleEn || r.fileName || '').toLowerCase() : c === 'file' ? r.fileSize || 0 : c === 'length' ? lenOf(r) : c === 'crew' ? (r.director || cast(r) || '').toLowerCase() : typeof r[c] === 'string' ? r[c].toLowerCase() : (r[c] || 0);
  const notify = () => { const all = root.querySelector('[data-all]'); if (all) { all.checked = shown.length > 0 && shown.every(r => sel.has(r.id)); all.indeterminate = !all.checked && shown.some(r => sel.has(r.id)); } opts.onSelect && opts.onSelect([...sel]); };
  const crewHtml = r => [[S.director, r.director], [S.cast, cast(r)], [S.writers, r.writers], [S.producers, r.producers]].filter(x => x[1]).map(x => `<div><b>${esc(x[0])}</b>${esc(x[1])}</div>`).join('');
  function render() {
    const rows = getRows(); [...sel].forEach(id => { if (!rows.some(r => r.id === id)) sel.delete(id); });
    const f = { kind:$('kind').value, decade:$('decade').value, lang:$('lang').value, fav:$('favonly').checked, q:$('q').value.toLowerCase().trim() };
    const tagOk = r => !tagSel.size || (tagMode === 'all' ? [...tagSel].every(g => (r.genre || []).includes(g)) : [...tagSel].some(g => (r.genre || []).includes(g)));
    let out = rows.filter(r => (!f.kind || r.kind === f.kind) && (!f.fav || r.fav) && tagOk(r) && (!f.decade || decade(r.year) === f.decade) && (!f.lang || (r.language || '').trim() === f.lang) &&
      (!f.q || [r.titleCn, r.titleEn, r.director, cast(r), r.writers, r.producers, r.fileName].some(x => (x || '').toLowerCase().includes(f.q))));
    if (sort.col) out = out.slice().sort((a, b) => { const x = sortKey(a, sort.col), y = sortKey(b, sort.col); return (x < y ? -1 : x > y ? 1 : 0) * (sort.dir === 'asc' ? 1 : -1); });
    shown = out; $('count').textContent = out.length + ' / ' + rows.length;
    if (!out.length) { tbody.innerHTML = `<tr><td colspan="${COLS.length}"><div class="empty-state"><i class="ti ti-inbox"></i>${esc(rows.length ? S.nomatch : S.empty)}${rows.length ? '' : `<div class="hint">${esc(S.emptyHint)}</div>`}</div></td></tr>`; notify(); return; }
    tbody.innerHTML = out.map(r => {
      const links = [['Douban', safeUrl(r.douban)], ['IMDb', safeUrl(r.imdb)]].filter(l => l[1]).map(l => `<a href="${esc(l[1])}" target="_blank" rel="noopener" class="link-btn">${l[0]}</a>`).join('');
      const meta = [r.width ? r.width + '×' + r.height : '', dur(r.duration), size(r.fileSize || 0), (r.ext || '').toUpperCase()].filter(Boolean).join(' · ');
      const L = lenOf(r), lenTxt = L ? (L >= 3600 ? S.uhm.replace('{h}', Math.floor(L / 3600)).replace('{m}', String(Math.round(L % 3600 / 60)).padStart(2, '0')) : S.umin.replace('{n}', Math.round(L / 60))) : '';
      return `<tr data-id="${r.id}" class="${sel.has(r.id) ? 'sel' : ''}">
        ${selectable ? `<td class="ck"><input type="checkbox" data-ck ${sel.has(r.id) ? 'checked' : ''}></td>` : ''}
        <td>${opts.onFav ? `<button class="heart-cell ${r.fav ? 'on' : ''}" data-fav aria-label="${esc(t('fav_toggle'))}" aria-pressed="${!!r.fav}">${'<svg class="hrt' + (r.fav ? ' on' : '') + '" viewBox="0 0 24 24"><path d="M12 20.5s-7.8-4.9-9.7-9.7C1 7.4 3.2 4 6.6 4c2 0 3.6 1.1 5.4 3 1.8-1.9 3.4-3 5.4-3 3.4 0 5.6 3.4 4.3 6.8-1.9 4.8-9.7 9.7-9.7 9.7z"/></svg>'}</button>` : (r.fav ? '<span style="color:#ff4d79">♥</span>' : '')}</td>
        <td>${r.thumb ? `<img class="thumb" src="${esc(r.thumb)}" alt="">` : `<div class="thumb empty">${esc(S.nopreview)}</div>`}</td>
        <td><div class="title-main">${esc(r.titleCn || r.titleEn || r.fileName)}</div>${r.titleCn && r.titleEn ? `<div class="title-sub">${esc(r.titleEn)}</div>` : ''}${r.description ? `<div class="desc clamp">${esc(r.description)}</div>` : ''}</td>
        <td class="crew">${crewHtml(r) || '<span class="count">—</span>'}</td>
        <td><span class="type-badge type-${esc(r.kind)}">${esc(S.kinds[r.kind] || r.kind)}</span></td>
        <td>${(r.genre || []).map(g => `<span class="genre-tag" style="${hv(g)}">${esc(gname(g))}</span>`).join('')}</td>
        <td>${r.year || ''}</td>
        <td class="num">${esc(lenTxt)}</td>
        <td>${esc(r.language || '')}</td>
        <td class="fileinfo"><div>${esc(meta)}</div><div class="fname" title="${esc(r.fileName)}">${esc(r.fileName)}</div></td>
        <td><div class="links">${links}</div></td>
        ${opts.onEdit ? `<td><div class="links"><button class="link-btn" data-act="edit">${esc(S.edit)}</button>${opts.onTrack ? `<button class="link-btn" data-act="track">${esc(S.track)}</button>` : ''}<button class="link-btn danger" data-act="del">${esc(S.del)}</button></div></td>` : ''}
      </tr>`;
    }).join('');
    notify();
  }
  root.addEventListener('input', e => { if (e.target.dataset.f === 'q') render(); else if (e.target.dataset.f === 'tagq') { tagQ = e.target.value; drawTags(getRows()); } });
  const hiddenCols = new Set();     // columns the viewer switched off (hidden with CSS so row rendering stays untouched)
  root.addEventListener('change', e => {
    if (e.target.dataset.col) { e.target.checked ? hiddenCols.delete(e.target.dataset.col) : hiddenCols.add(e.target.dataset.col); const st = root.querySelector('[data-f="cs"]'); st.textContent = [...hiddenCols].map(k => { const i = COLS.findIndex(c => c[0] === k) + 1; return `[data-vroot] th:nth-child(${i}),[data-vroot] td:nth-child(${i}){display:none}`; }).join(''); return; }
    if (e.target.dataset.tag != null) { e.target.checked ? tagSel.add(e.target.dataset.tag) : tagSel.delete(e.target.dataset.tag); drawTags(getRows()); return render(); }
    if (e.target.dataset.f) return render();
    if (e.target.matches('[data-all]')) { shown.forEach(r => e.target.checked ? sel.add(r.id) : sel.delete(r.id)); return render(); }
  });
  root.addEventListener('click', e => {
    const fv = e.target.closest('[data-fav]'); if (fv && opts.onFav) return opts.onFav(Number(fv.closest('tr').dataset.id));
    const mb = e.target.closest('[data-f="mode"] button'); if (mb) { tagMode = mb.dataset.v; drawTags(getRows()); return render(); }
    const th = e.target.closest('th[data-sort]');
    if (th) { const c = th.dataset.sort; if (sort.col === c) sort.dir = sort.dir === 'asc' ? 'desc' : 'asc'; else { sort.col = c; sort.dir = 'asc'; } return render(); }
    const ck = e.target.closest('[data-ck]');
    if (ck) {
      const id = Number(ck.closest('tr').dataset.id);
      if (e.shiftKey && last != null) { const a = shown.findIndex(r => r.id === last), b = shown.findIndex(r => r.id === id); if (a >= 0 && b >= 0) shown.slice(Math.min(a, b), Math.max(a, b) + 1).forEach(r => ck.checked ? sel.add(r.id) : sel.delete(r.id)); }
      else ck.checked ? sel.add(id) : sel.delete(id);
      last = id; return render();
    }
    const b = e.target.closest('[data-act]');
    if (b && opts.onEdit) { const id = Number(b.closest('tr').dataset.id); ({ edit:opts.onEdit, del:opts.onDelete, track:opts.onTrack })[b.dataset.act](id, shown.map(r => r.id)); }
  });
  // close the tag popover when clicking elsewhere (self-removing, so repeated mounts never stack listeners)
  const away = e => { if (!root.isConnected) return document.removeEventListener('click', away); ['pop', 'pop2'].forEach(k => { const p = $(k); if (p && p.open && !p.contains(e.target)) p.open = false; }); };
  document.addEventListener('click', away);
  root.setAttribute('data-vroot', '');
  refreshFilters(getRows()); render();
  return { refresh() { refreshFilters(getRows()); render(); }, selected:() => [...sel], clear() { sel.clear(); render(); }, all() { shown.forEach(r => sel.add(r.id)); render(); }, shownIds:() => shown.map(r => r.id) };
}

