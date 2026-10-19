/* =====================================================================
   File metadata: what the file itself says about itself — nobody types it in.
   video   length, size, a preview frame
   audio   length + tags (MP3 ID3, FLAC, M4A) with the embedded cover
   books   EPUB / MOBI / AZW3 / CBZ (title, author, cover…), PDF (title, author, pages), FB2 and TXT (the file name gives the title)
   Only slices of a file are read (never the whole of a large one), and nothing leaves the device.
   ===================================================================== */
const sigOf = f => [f.name, f.size, f.lastModified].join('|');
const EXT_RE = { video:/\.(mp4|mkv|mov|avi|wmv|flv|webm|m4v|ts|mts|m2ts|mpe?g|3gp|rmvb|ogv)$/i, audio:/\.(mp3|wav|ogg|oga|opus|flac|m4a|aac|wma|aiff?|mka)$/i, book:/\.(epub|pdf|mobi|azw3?|fb2|cbz|txt)$/i };
const CLASS_KIND = { video:'film', audio:'music', book:'book' };
const classOf = f => f.type.startsWith('video/') || EXT_RE.video.test(f.name) ? 'video' : f.type.startsWith('audio/') || EXT_RE.audio.test(f.name) ? 'audio' : EXT_RE.book.test(f.name) || /^application\/(epub|pdf|x-mobipocket)/.test(f.type) ? 'book' : '';
const FILE_ACCEPT = 'video/*,audio/*,.mkv,.avi,.mov,.wmv,.flv,.webm,.m4v,.ts,.mts,.m2ts,.mpg,.mpeg,.3gp,.rmvb,.ogv,.mp3,.wav,.ogg,.oga,.opus,.flac,.m4a,.aac,.wma,.aif,.aiff,.mka,.epub,.pdf,.mobi,.azw,.azw3,.fb2,.cbz,.txt';
function probe(file) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file), v = document.createElement('video'), out = { duration:0, width:0, height:0, thumb:'' };
    let done = false;
    const finish = () => { if (done) return; done = true; clearTimeout(timer); v.removeAttribute('src'); v.load(); URL.revokeObjectURL(url); resolve(out); };
    const timer = setTimeout(finish, 10000);
    v.muted = true; v.preload = 'metadata'; v.playsInline = true; v.onerror = finish;
    v.onloadedmetadata = () => {
      out.duration = isFinite(v.duration) ? v.duration : 0; out.width = v.videoWidth; out.height = v.videoHeight;
      if (!v.videoWidth) return finish();
      v.currentTime = Math.min(Math.max(out.duration * 0.1, 0.1), out.duration || 1);
    };
    v.onseeked = () => {
      try { const c = document.createElement('canvas'), w = 224, h = Math.round(w * v.videoHeight / v.videoWidth); c.width = w; c.height = h; c.getContext('2d').drawImage(v, 0, 0, w, h); out.thumb = c.toDataURL('image/jpeg', 0.7); } catch (e) {}
      finish();
    };
    v.src = url;
  });
}
/* A title and a year from a file name. The last plausible year wins, because a title can contain one: "Blade Runner 2049 (2017)" is 2017, "2012.2009.720p" is 2009.
   A year at the very start is part of the title ("1917 (2019)", "1984"). A leading [release group] tag and trailing [1080p] tags are dropped. */
function guess(name) {
  const base = name.replace(/\.[^.]+$/, ''), top = new Date().getFullYear() + 1;
  let s = base.replace(/[._]+/g, ' ').replace(/^\s*[\[【]([^\]】]*)[\]】]\s*/, (all, inner) => /^\d{4}$/.test(inner.trim()) ? all : ''), year = null, cut = s.length;
  for (const m of s.matchAll(/(?:^|[\s\-(\[（【])((?:19|20)\d\d)(?=$|[\s\-)\]）】])/g)) {
    const y = Number(m[1]), at = m.index + m[0].length - 4;
    if (y <= top && at > 0) { year = y; cut = at; }
  }
  s = s.slice(0, cut).replace(/[\[(（【].*$/, '').replace(/\b(1080p|720p|2160p|4k|bluray|brrip|webrip|web-dl|x264|x265|hevc|h264)\b.*$/i, '').replace(/[\s\-]+$/, '').trim();
  return { title:s || base, year };
}
/* ---- small helpers ---- */
const dv = buf => new DataView(buf.buffer ? buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) : buf);
const readBytes = async (f, a, b) => new Uint8Array(await f.slice(a, b).arrayBuffer());
const decodeBytes = (u8, enc) => { try { return new TextDecoder(enc || 'utf-8').decode(u8).replace(/\0+$/g, '').trim(); } catch (e) { return ''; } };
const looksCjk = s => /[㐀-鿿가-힯぀-ヿ]/.test(s) && !s.includes('�');
function legacyText(u8) {                                      // latin-1 tags written by Chinese/Japanese software are really GBK/Shift-JIS
  const l = decodeBytes(u8, 'windows-1252'); if (!u8.some(b => b > 127)) return l;
  for (const enc of ['gb18030', 'shift_jis', 'euc-kr']) { const s = decodeBytes(u8, enc); if (looksCjk(s)) return s; } return l;
}
async function toThumb(blob, w) {
  w = w || 240; const bmp = await createImageBitmap(blob), k = Math.min(1, w / bmp.width), c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); if (bmp.close) bmp.close(); return c.toDataURL('image/jpeg', .74);
}
function mediaDuration(f, tag) {
  return new Promise(res => { const url = URL.createObjectURL(f), el = document.createElement(tag); let done = false; const end = d => { if (done) return; done = true; clearTimeout(tm); el.removeAttribute('src'); el.load(); URL.revokeObjectURL(url); res(d); };
    const tm = setTimeout(() => end(0), 8000); el.preload = 'metadata'; el.onloadedmetadata = () => end(isFinite(el.duration) ? el.duration : 0); el.onerror = () => end(0); el.src = url; });
}
/* ---- ZIP (EPUB and CBZ are zip files): read the directory at the end, then only the entries we want ---- */
async function zipDir(f) {
  const tl = Math.min(f.size, 65557), tail = dv(await readBytes(f, f.size - tl, f.size)); let p = tl - 22; while (p >= 0 && tail.getUint32(p, true) !== 0x06054b50) p--; if (p < 0) throw new Error('zip');
  const n = tail.getUint16(p + 10, true), size = tail.getUint32(p + 12, true), off = tail.getUint32(p + 16, true), raw = await readBytes(f, off, off + size), d = dv(raw), map = new Map(); let q = 0;
  for (let i = 0; i < n && q + 46 <= size && d.getUint32(q, true) === 0x02014b50; i++) { const nl = d.getUint16(q + 28, true), el = d.getUint16(q + 30, true), cl = d.getUint16(q + 32, true); map.set(decodeBytes(raw.subarray(q + 46, q + 46 + nl)), { method:d.getUint16(q + 10, true), csize:d.getUint32(q + 20, true), usize:d.getUint32(q + 24, true), lo:d.getUint32(q + 42, true) }); q += 46 + nl + el + cl; }
  return map;
}
/* DecompressionStream arrived in Safari 16.4 (and Firefox 113); before that no EPUB or comic could be opened there. This small inflate (RFC 1951,
   the algorithm of zlib's "puff") stands in, and is also the fallback if the stream cannot be built. */
function inflateRaw(src) {
  let pos = 0, bb = 0, bc = 0, out = new Uint8Array(Math.max(1024, src.length * 4)), op = 0;
  const room = n => { if (op + n > out.length) { const o = new Uint8Array(Math.max(out.length * 2, op + n)); o.set(out.subarray(0, op)); out = o; } };
  const bits = n => { while (bc < n) { if (pos >= src.length) throw new Error('inflate'); bb |= src[pos++] << bc; bc += 8; } const v = bb & ((1 << n) - 1); bb >>>= n; bc -= n; return v; };
  const build = lens => { const count = new Uint16Array(16), offs = new Uint16Array(16), syms = new Uint16Array(lens.length); for (const l of lens) count[l]++; count[0] = 0; for (let i = 1; i < 16; i++) offs[i] = offs[i - 1] + count[i - 1]; lens.forEach((l, s) => { if (l) syms[offs[l]++] = s; }); return { count, syms }; };
  const decode = h => { let code = 0, first = 0, index = 0; for (let len = 1; len < 16; len++) { code |= bits(1); const c = h.count[len]; if (code - c < first) return h.syms[index + (code - first)]; index += c; first += c; first <<= 1; code <<= 1; } throw new Error('inflate'); };
  const LB = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258], LE = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  const DB = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577], DE = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
  const ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]; let last;
  do {
    last = bits(1); const type = bits(2);
    if (type === 0) { bb = 0; bc = 0; const len = src[pos] | src[pos + 1] << 8; pos += 4; room(len); out.set(src.subarray(pos, pos + len), op); op += len; pos += len; continue; }
    if (type === 3) throw new Error('inflate');
    let lh, dh;
    if (type === 1) { const l = new Uint8Array(288).fill(8, 0, 144).fill(9, 144, 256).fill(7, 256, 280).fill(8, 280); lh = build(l); dh = build(new Uint8Array(30).fill(5)); }
    else {
      const nl = bits(5) + 257, nd = bits(5) + 1, nc = bits(4) + 4, cl = new Uint8Array(19); for (let i = 0; i < nc; i++) cl[ORDER[i]] = bits(3);
      const ch = build(cl), lens = [];
      while (lens.length < nl + nd) { const sym = decode(ch); if (sym < 16) lens.push(sym); else { let rep, val = 0; if (sym === 16) { val = lens[lens.length - 1]; rep = 3 + bits(2); } else if (sym === 17) rep = 3 + bits(3); else rep = 11 + bits(7); while (rep--) lens.push(val); } }
      lh = build(lens.slice(0, nl)); dh = build(lens.slice(nl));
    }
    for (;;) {
      const sym = decode(lh);
      if (sym < 256) { room(1); out[op++] = sym; } else if (sym === 256) break;
      else { const s = sym - 257, len = LB[s] + bits(LE[s]), ds = decode(dh), dist = DB[ds] + bits(DE[ds]); room(len); for (let i = 0; i < len; i++) { out[op] = out[op - dist]; op++; } }
    }
  } while (!last);
  return out.slice(0, op);
}
async function zipGet(f, ent) {
  const h = dv(await readBytes(f, ent.lo, ent.lo + 30)), start = ent.lo + 30 + h.getUint16(26, true) + h.getUint16(28, true), raw = f.slice(start, start + ent.csize);
  if (ent.method === 0) return new Uint8Array(await raw.arrayBuffer());
  if (typeof DecompressionStream === 'function' && typeof raw.stream === 'function') { try { return new Uint8Array(await new Response(raw.stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()); } catch (e) { /* older engines: fall through */ } }
  return inflateRaw(new Uint8Array(await raw.arrayBuffer()));
}
const joinPath = (dir, rel) => { const out = []; (dir + rel).split('/').forEach(s => s === '..' ? out.pop() : s && s !== '.' && out.push(s)); return out.join('/'); };
async function epubMeta(f) {
  const z = await zipDir(f), get = async n => { const e = z.get(n); if (!e) throw new Error(n); return zipGet(f, e); }, xml = async n => new DOMParser().parseFromString(decodeBytes(await get(n)), 'application/xml');
  const opfPath = (await xml('META-INF/container.xml')).querySelector('rootfile').getAttribute('full-path'), opf = await xml(opfPath), dc = tag => [...opf.getElementsByTagNameNS('*', tag)].map(e => e.textContent.trim()).filter(Boolean);
  const out = { title:dc('title')[0] || '', author:dc('creator').join(', '), language:dc('language')[0] || '', publisher:dc('publisher')[0] || '', description:(dc('description')[0] || '').replace(/<[^>]+>/g, '').slice(0, 500), year:Number((dc('date')[0] || '').slice(0, 4)) || null };
  const items = [...opf.getElementsByTagNameNS('*', 'item')]; let cover = items.find(i => /cover-image/.test(i.getAttribute('properties') || ''));
  if (!cover) { const m = [...opf.getElementsByTagNameNS('*', 'meta')].find(x => x.getAttribute('name') === 'cover'); if (m) cover = items.find(i => i.getAttribute('id') === m.getAttribute('content')); }
  if (!cover) cover = items.find(i => /^image\//.test(i.getAttribute('media-type') || '') && /cover/i.test(i.getAttribute('href') || ''));
  if (cover) { const dir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '', ent = z.get(joinPath(dir, decodeURIComponent(cover.getAttribute('href')))); if (ent) out.thumb = await toThumb(new Blob([await zipGet(f, ent)])); }
  return out;
}
async function cbzMeta(f) {
  const z = await zipDir(f), pages = [...z.keys()].filter(n => /\.(jpe?g|png|webp|gif)$/i.test(n)).sort((a, b) => a.localeCompare(b, undefined, { numeric:true })), out = { pages:pages.length };
  if (pages.length) out.thumb = await toThumb(new Blob([await zipGet(f, z.get(pages[0]))])); return out;
}
/* ---- PDF: the document-information strings and the page count, found by scanning the ends of the file ---- */
function pdfString(tok) {
  let bytes; if (tok[0] === '<') { const h = tok.replace(/[<>\s]/g, ''); bytes = new Uint8Array(h.match(/../g).map(x => parseInt(x, 16))); }
  else { const s = tok.slice(1, -1).replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, c) => ({ n:'\n', r:'\r', t:'\t', b:'\b', f:'\f' })[c] || (/^[0-7]/.test(c) ? String.fromCharCode(parseInt(c, 8)) : c)); bytes = Uint8Array.from(s, ch => ch.charCodeAt(0) & 255); }
  return bytes[0] === 0xfe && bytes[1] === 0xff ? decodeBytes(bytes.subarray(2), 'utf-16be') : bytes[0] === 0xff && bytes[1] === 0xfe ? decodeBytes(bytes.subarray(2), 'utf-16le') : legacyText(bytes);
}
async function pdfMeta(f) {
  const N = 1500000, s = decodeBytes(await readBytes(f, 0, Math.min(f.size, N)), 'latin1') + '\n' + (f.size > N ? decodeBytes(await readBytes(f, f.size - N, f.size), 'latin1') : '');
  const str = k => { const m = s.match(new RegExp('/' + k + '\\s*(\\((?:\\\\.|[^\\\\)])*\\)|<[0-9A-Fa-f\\s]+>)')); try { return m ? pdfString(m[1]) : ''; } catch (e) { return ''; } };
  const counts = [...s.matchAll(/\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)|\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages\b/g)].map(m => Number(m[1] || m[2])), junk = /^(untitled|microsoft word|powerpoint|\s*$)/i;
  const title = str('Title'), author = str('Author');
  return { title:junk.test(title) ? '' : title, author:junk.test(author) ? '' : author, pages:counts.length ? Math.max(...counts) : (s.match(/\/Type\s*\/Page[^s]/g) || []).length || 0 };
}
/* ---- MOBI / AZW3: a Palm database whose first record holds the title, the EXTH fields and where the cover image is ---- */
async function mobiMeta(f) {
  const n = dv(await readBytes(f, 76, 78)).getUint16(0), h = dv(await readBytes(f, 0, 78 + 8 * n)), off = i => h.getUint32(78 + i * 8), r0 = off(0), r0end = n > 1 ? off(1) : r0 + 65536;
  const rec = await readBytes(f, r0, Math.min(r0end, r0 + 262144)), d = dv(rec); if (decodeBytes(rec.subarray(16, 20), 'latin1') !== 'MOBI') throw new Error('mobi');
  const enc = d.getUint32(28) === 65001 ? 'utf-8' : 'windows-1252', hl = d.getUint32(20), out = { title:decodeBytes(rec.subarray(d.getUint32(84), d.getUint32(84) + d.getUint32(88)), enc) }, first = d.getUint32(108);
  if (d.getUint32(128) & 0x40) { let p = 16 + hl; if (decodeBytes(rec.subarray(p, p + 4), 'latin1') === 'EXTH') { const cnt = d.getUint32(p + 8); p += 12; let coverIdx = -1;
    for (let i = 0; i < cnt && p + 8 <= rec.length; i++) { const t = d.getUint32(p), len = d.getUint32(p + 4), data = rec.subarray(p + 8, p + len);
      if (t === 100) out.author = (out.author ? out.author + ', ' : '') + decodeBytes(data, enc); else if (t === 101) out.publisher = decodeBytes(data, enc); else if (t === 103) out.description = decodeBytes(data, enc).slice(0, 500);
      else if (t === 106) out.year = Number(decodeBytes(data, enc).slice(0, 4)) || null; else if (t === 503) out.title = decodeBytes(data, enc) || out.title; else if (t === 524) out.language = decodeBytes(data, enc); else if (t === 201) coverIdx = new DataView(data.buffer, data.byteOffset, 4).getUint32(0);
      p += len; }
    if (coverIdx >= 0 && first < n) { const a = off(first + coverIdx), b = first + coverIdx + 1 < n ? off(first + coverIdx + 1) : f.size; out.thumb = await toThumb(new Blob([await readBytes(f, a, b)])); } } }
  return out;
}
/* ---- audio tags ---- */
const synchsafe = (d, o) => (d.getUint8(o) << 21) | (d.getUint8(o + 1) << 14) | (d.getUint8(o + 2) << 7) | d.getUint8(o + 3);
function id3Text(u8) {
  const enc = u8[0], b = u8.subarray(1); if (enc === 1) return b[0] === 0xff ? decodeBytes(b.subarray(2), 'utf-16le') : decodeBytes(b.subarray(b[0] === 0xfe ? 2 : 0), 'utf-16be');
  return enc === 2 ? decodeBytes(b, 'utf-16be') : enc === 3 ? decodeBytes(b, 'utf-8') : legacyText(b.subarray(0, b.indexOf(0) < 0 ? b.length : b.indexOf(0)));
}
async function id3Meta(f) {
  const out = {}, head = await readBytes(f, 0, 10), hd = dv(head);
  if (decodeBytes(head.subarray(0, 3), 'latin1') === 'ID3') {
    const ver = head[3], size = synchsafe(hd, 6), raw = await readBytes(f, 10, 10 + size), d = dv(raw); let p = 0;
    while (p + 10 <= size) { const id = decodeBytes(raw.subarray(p, p + 4), 'latin1'), fs = ver === 4 ? synchsafe(d, p + 4) : d.getUint32(p + 4); if (!/^[A-Z0-9]{4}$/.test(id) || fs <= 0 || p + 10 + fs > size) break; const data = raw.subarray(p + 10, p + 10 + fs);
      if (id === 'TIT2') out.title = id3Text(data); else if (id === 'TPE1') out.author = id3Text(data); else if (id === 'TALB') out.album = id3Text(data); else if (id === 'TYER' || id === 'TDRC') out.year = Number(id3Text(data).slice(0, 4)) || null;
      else if (id === 'APIC' && !out.thumb) { let q = 1; while (data[q] !== 0 && q < data.length) q++; q += 2; const e = data[0]; if (e === 1 || e === 2) { while (q + 1 < data.length && !(data[q] === 0 && data[q + 1] === 0)) q += 2; q += 2; } else { while (q < data.length && data[q] !== 0) q++; q++; } try { out.thumb = await toThumb(new Blob([data.subarray(q)])); } catch (e) {} }
      p += 10 + fs; }
  } else if (f.size > 128) { const t = await readBytes(f, f.size - 128, f.size); if (decodeBytes(t.subarray(0, 3), 'latin1') === 'TAG') { out.title = legacyText(t.subarray(3, 33)).replace(/\0.*$/, ''); out.author = legacyText(t.subarray(33, 63)).replace(/\0.*$/, ''); out.album = legacyText(t.subarray(63, 93)).replace(/\0.*$/, ''); out.year = Number(decodeBytes(t.subarray(93, 97), 'latin1')) || null; } }
  return out;
}
async function flacMeta(f) {
  const buf = await readBytes(f, 0, Math.min(f.size, 4000000)), d = dv(buf), out = {}; if (decodeBytes(buf.subarray(0, 4), 'latin1') !== 'fLaC') throw new Error('flac'); let p = 4, last = false;
  while (!last && p + 4 <= buf.length) { const hdr = buf[p], type = hdr & 127, len = (buf[p + 1] << 16) | (buf[p + 2] << 8) | buf[p + 3]; last = !!(hdr & 128); p += 4;
    if (type === 4) { let q = p + 4 + d.getUint32(p, true); const n = d.getUint32(q, true); q += 4; for (let i = 0; i < n && q + 4 <= p + len; i++) { const l = d.getUint32(q, true), kv = decodeBytes(buf.subarray(q + 4, q + 4 + l)), eq = kv.indexOf('='), k = kv.slice(0, eq).toUpperCase(), v = kv.slice(eq + 1); if (k === 'TITLE') out.title = v; else if (k === 'ARTIST') out.author = v; else if (k === 'ALBUM') out.album = v; else if (k === 'DATE') out.year = Number(v.slice(0, 4)) || null; q += 4 + l; } }
    else if (type === 6 && !out.thumb) { let q = p + 4; q += 4 + d.getUint32(q); q += 4 + d.getUint32(q); q += 16; const dl = d.getUint32(q); try { out.thumb = await toThumb(new Blob([buf.subarray(q + 4, q + 4 + dl)])); } catch (e) {} }
    p += len; }
  return out;
}
async function m4aMeta(f) {
  const out = {}; let pos = 0, moov = null;
  while (pos + 8 <= f.size && !moov) { const h = dv(await readBytes(f, pos, pos + 16)), sz = h.getUint32(0), type = decodeBytes(new Uint8Array(h.buffer, 4, 4), 'latin1'), big = sz === 1 ? Number(h.getBigUint64(8)) : sz || f.size - pos; if (type === 'moov') moov = await readBytes(f, pos, Math.min(pos + big, pos + 12000000)); pos += big; }
  if (!moov) return out;
  const find = (u8, name, from, to) => { let p = from; while (p + 8 <= to) { const sz = dv(u8.subarray(p, p + 8)).getUint32(0), ty = decodeBytes(u8.subarray(p + 4, p + 8), 'latin1'); if (sz < 8) return null; if (ty === name) return [p + 8, p + sz]; p += sz; } return null; };
  const udta = find(moov, 'udta', 8, moov.length), meta = udta && find(moov, 'meta', udta[0], udta[1]), ilst = meta && find(moov, 'ilst', meta[0] + 4, meta[1]); if (!ilst) return out;
  const grab = name => { const it = find(moov, name, ilst[0], ilst[1]), da = it && find(moov, 'data', it[0], it[1]); return da ? moov.subarray(da[0] + 8, da[1]) : null; };
  const text = n => { const b = grab(n); return b ? decodeBytes(b) : ''; };
  out.title = text('\xa9nam'); out.author = text('\xa9ART'); out.album = text('\xa9alb'); out.year = Number(text('\xa9day').slice(0, 4)) || null; const cv = grab('covr'); if (cv) { try { out.thumb = await toThumb(new Blob([cv])); } catch (e) {} }
  return out;
}
/* ---- one entry point ---- */
async function readFileMeta(f, cls) {
  const ext = (f.name.split('.').pop() || '').toLowerCase(); let m = {};
  try {
    if (cls === 'video') { const p = await probe(f); m = { duration:p.duration, width:p.width, height:p.height, thumb:p.thumb }; }
    else if (cls === 'audio') { try { m = ext === 'mp3' ? await id3Meta(f) : ext === 'flac' ? await flacMeta(f) : /^(m4a|mp4|aac)$/.test(ext) ? await m4aMeta(f) : {}; } catch (e) {} m.duration = await mediaDuration(f, 'audio'); }
    else if (ext === 'epub') m = await epubMeta(f); else if (ext === 'pdf') m = await pdfMeta(f); else if (/^(mobi|azw3?)$/.test(ext)) m = await mobiMeta(f); else if (ext === 'cbz') m = await cbzMeta(f);
  } catch (e) { /* unreadable details are fine: the file name still gives a title */ }
  return m;
}
/* fl: the Files; handles: the same files as file handles where the browser gave them (a picker or a drop in Chrome/Edge), so they can be reopened later;
   extras: fields to add to each new record (a folder scan gives dir and rel) */
async function importFiles(fl, handles, extras, opts) {
  fl = [...fl]; handles = handles || []; extras = extras || []; opts = opts || {};
  const ok = fl.map((f, i) => [f, handles[i] || null, extras[i] || null]).filter(([f]) => classOf(f)), skipped = fl.length - ok.length;
  const existing = new Map((await DB.all('videos')).map(r => [r.sig, r]));
  const bar = $('bar'), fill = bar.firstElementChild, log = $('log');
  bar.style.display = 'block'; let added = 0, dup = 0, noMeta = 0, failed = 0;
  for (let i = 0; i < ok.length; i++) {
    const [f, h, ex] = ok[i], sig = sigOf(f), cls = classOf(f);
    log.textContent = t('t_reading', { i:i + 1, n:ok.length, name:f.name }); fill.style.width = (i / ok.length * 100) + '%';
    FH.mem.set(sig, f);                                                  // opened from here for the rest of this session, no questions asked
    if (existing.has(sig)) { dup++; if (h) await fhPut(existing.get(sig).id, h); continue; }       // importing it again re-links a file that had moved
    try {
      const meta = await readFileMeta(f, cls), g = guess(f.name), title = (meta.title || g.title).trim(), ascii = /^[\x00-\x7f]*$/.test(title);
      if (cls === 'video' && !meta.duration) noMeta++;
      const rec = { sig, cls, fileName:f.name, fileSize:f.size, fileType:f.type, ext:(f.name.split('.').pop() || '').toLowerCase(), lastModified:f.lastModified,
        duration:meta.duration || 0, width:meta.width || 0, height:meta.height || 0, thumb:meta.thumb || '', pages:meta.pages || 0, album:meta.album || '', publisher:meta.publisher || '',
        titleCn:ascii ? '' : title, titleEn:ascii ? title : '', director:meta.author || '', people:'', kind:CLASS_KIND[cls], genre:[], language:meta.language || '', year:meta.year || g.year, description:meta.description || '', douban:'', imdb:'', addedAt:Date.now() };
      if (ex) Object.assign(rec, ex);                                    // a folder scan says which folder and path the file came from
      const id = (await DB.put('videos', rec)) || rec.id; if (h && !ex) await fhPut(id, h);
      if (opts.track != null ? opts.track : $('alsoTrack').checked) await addMedia({ title, type:CLASS_KIND[cls], status:'want', year:rec.year, creator:rec.director, pages:rec.pages || null, runtime:cls === 'book' ? null : rec.duration ? Math.round(rec.duration / 60) : null, fileSig:sig });
      existing.set(sig, rec); added++;
    } catch (e) { failed++; }                                            // one unreadable file is counted and reported, never allowed to stop the rest
  }
  fill.style.width = '100%'; setTimeout(() => bar.style.display = 'none', 1000);
  const lines = [`<div class="ok"><i class="ti ti-check"></i> ${esc(t('t_imported', { n:added }))}</div>`];
  if (dup) lines.push(`<div>${esc(t('t_dups', { n:dup }))}</div>`);
  if (skipped) lines.push(`<div class="warn">${esc(t('t_skipped', { n:skipped }))}</div>`);
  if (noMeta) lines.push(`<div class="warn">${esc(t('t_nometa', { n:noMeta }))}</div>`);
  if (failed) lines.push(`<div class="warn">${esc(t('t_failed', { n:failed }))}</div>`);
  log.innerHTML = lines.join(''); toast(t('t_imported', { n:added }), !!failed);
  await reload();
}
$('filePick').accept = FILE_ACCEPT;
