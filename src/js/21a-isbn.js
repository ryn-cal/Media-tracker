/* Import books by ISBN: type it or scan the barcode. Open Library supplies title, author, year and cover (the only network call here). */
const ISBN = { stream:null, timer:0, seen:new Set() };
const isbnOk = s => /^\d{9}[\dX]$/.test(s) ? [...s].reduce((a, c, i) => a + (c === 'X' ? 10 : +c) * (10 - i), 0) % 11 === 0
  : /^97[89]\d{10}$/.test(s) && [...s].reduce((a, c, i) => a + +c * (i % 2 ? 3 : 1), 0) % 10 === 0;
const isbnSay = (ok, msg) => { $('isbnLog').insertAdjacentHTML('afterbegin', `<div class="${ok ? 'ok' : ''}"><i class="ti ti-${ok ? 'check' : 'alert-circle'}"></i> ${esc(msg)}</div>`); };
/* EAN-13 reader for browsers without BarcodeDetector: threshold some pixel rows, cut them into 59 bars and spaces, match the digit patterns */
const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const EAN_G = EAN_L.map(p => [...p].reverse().map(c => c ^ 1).join('')), EAN_R = EAN_L.map(p => [...p].map(c => c ^ 1).join(''));
const EAN_P = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
function eanRow(px) {                                   // px: array of 0/1 (1 = dark) → 13 digits or ''
  const runs = []; let v = px[0], n = 0, x = 0; px.forEach(c => { if (c === v) n++; else { runs.push([v, x, n]); x += n; v = c; n = 1; } }); runs.push([v, x, n]);
  for (let i = 0; i + 59 <= runs.length; i++) {
    if (!runs[i][0]) continue;
    const x0 = runs[i][1], last = runs[i + 58], m = (last[1] + last[2] - x0) / 95; if (m < 1) continue;
    const bit = k => px[Math.min(px.length - 1, Math.floor(x0 + (k + .5) * m))];
    const word = k => { let w = ''; for (let j = 0; j < 7; j++) w += bit(k + j); return w; };
    if (word(0).slice(0, 3) !== '101' || word(45).slice(0, 5) !== '01010' || word(92).slice(0, 3) !== '101') continue;
    let d = '', par = '';
    for (let k = 0; k < 6; k++) { const w = word(3 + 7 * k); let j = EAN_L.indexOf(w); if (j >= 0) par += 'L'; else { j = EAN_G.indexOf(w); par += 'G'; } if (j < 0) { d = ''; break; } d += j; }
    const f = EAN_P.indexOf(par); if (f < 0 || d.length !== 6) continue;
    let r = ''; for (let k = 0; k < 6; k++) { const j = EAN_R.indexOf(word(50 + 7 * k)); if (j < 0) { r = ''; break; } r += j; } if (r.length !== 6) continue;
    const c = f + d + r; if ([...c].reduce((a, ch, q) => a + +ch * (q % 2 ? 3 : 1), 0) % 10 === 0) return c;
  }
  return '';
}
function eanFrame(cv) {                                 // look at the middle band of a canvas, both directions and both orientations
  const ctx = cv.getContext('2d', { willReadFrequently:true }), W = cv.width, H = cv.height, img = ctx.getImageData(0, 0, W, H).data;
  const lum = (x, y) => { const i = (y * W + x) * 4; return img[i] * .3 + img[i + 1] * .59 + img[i + 2] * .11; };
  for (const vert of [false, true]) for (let f = .2; f <= .8; f += .04) {
    const len = vert ? H : W, at = Math.floor((vert ? W : H) * f), row = []; for (let i = 0; i < len; i++) row.push(vert ? lum(at, i) : lum(i, at));
    const s = row.slice().sort((a, b) => a - b), th = (s[Math.floor(len * .05)] + s[Math.floor(len * .95)]) / 2, px = row.map(c => c < th ? 1 : 0);
    const c = eanRow(px) || eanRow(px.slice().reverse()); if (c) return c;
  }
  return '';
}
const isbnCanvas = (src, w, h) => { const cv = document.createElement('canvas'), k = Math.min(1, 900 / w); cv.width = Math.round(w * k); cv.height = Math.round(h * k); cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height); return cv; };
/* title lookup: Google Books has far more Chinese and commercial editions, Open Library more English and public ones; ask the better fit first */
const ISBN_SRC = {
  ol:async s => { const b = (await (await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${s}&format=json&jscmd=data`)).json())['ISBN:' + s]; return b && { title:b.title + (b.subtitle ? ': ' + b.subtitle : ''), creator:(b.authors || []).map(a => a.name).join(', '), date:b.publish_date, cover:(b.cover || {}).large || (b.cover || {}).medium }; },
  gb:async s => { const i = ((await (await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${s}`)).json()).items || [])[0], v = i && i.volumeInfo; return v && { title:v.title + (v.subtitle ? ': ' + v.subtitle : ''), creator:(v.authors || []).join(', '), date:v.publishedDate, cover:((v.imageLinks || {}).thumbnail || '').replace(/^http:/, 'https:') }; }
};
async function isbnAdd(raw) {
  const s = String(raw).replace(/[\s-]/g, '').toUpperCase();
  if (!isbnOk(s)) return isbnSay(false, t('isbn_bad', { x:raw }));
  if (media.some(m => m.isbn === s)) return isbnSay(false, t('isbn_dup', { x:s }));
  const order = prefs.lang === 'zh' || /^978(7|957|986)/.test(s) ? ['gb', 'ol'] : ['ol', 'gb']; let b, net = 0;
  for (const k of order) { try { b = await ISBN_SRC[k](s); } catch (e) { net++; } if (b) break; }
  if (!b) return isbnSay(false, t(net === 2 ? 'isbn_net' : 'isbn_none', { x:s }));
  const rec = { title:b.title, creator:b.creator, type:'book', status:'want', isbn:s, year:parseInt(((b.date || '').match(/\d{4}/) || [])[0], 10) || null, cover:safeUrl(b.cover) };
  if (media.some(m => mediaKey(m) === mediaKey(rec))) return isbnSay(false, t('isbn_dup', { x:rec.title }));
  await addMedia(rec); media.push(rec); isbnSay(true, rec.title + (rec.creator ? ' — ' + rec.creator : '')); reload();
}
function isbnStop() { clearInterval(ISBN.timer); if (ISBN.stream) ISBN.stream.getTracks().forEach(x => x.stop()); ISBN.stream = null; $('isbnVid').hidden = true; $('isbnScan').lastElementChild.textContent = t('isbn_scan'); }
async function isbnScan() {
  if (ISBN.stream) return isbnStop();
  try {
    const det = 'BarcodeDetector' in window ? new BarcodeDetector({ formats:['ean_13'] }) : null, v = $('isbnVid');
    ISBN.stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' } }); v.srcObject = ISBN.stream; v.hidden = false; await v.play();
    $('isbnScan').lastElementChild.textContent = t('isbn_stop');
    const found = c => { if (isbnOk(c) && !ISBN.seen.has(c)) { ISBN.seen.add(c); isbnAdd(c); } };
    ISBN.timer = setInterval(async () => { try { if (det) (await det.detect(v)).forEach(c => found(c.rawValue)); else if (v.videoWidth) found(eanFrame(isbnCanvas(v, v.videoWidth, v.videoHeight))); } catch (e) {} }, 350);
  } catch (e) { isbnStop(); toast(t('isbn_cam'), true); }
}
/* a photo of the barcode works everywhere, camera permission or not */
$('isbnPhoto').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { const bm = await createImageBitmap(f), c = eanFrame(isbnCanvas(bm, bm.width, bm.height)); c ? isbnAdd(c) : isbnSay(false, t('isbn_nocode')); } catch (err) { isbnSay(false, t('isbn_nocode')); }
};
$('isbnScan').hidden = !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
$('isbnShot').onclick = () => $('isbnPhoto').click();
$('isbnScan').onclick = isbnScan;
$('isbnAdd').onclick = () => { const v = $('isbnIn').value.trim(); if (v) { $('isbnIn').value = ''; isbnAdd(v); } };
$('isbnIn').addEventListener('keydown', e => { if (e.key === 'Enter') $('isbnAdd').click(); });
