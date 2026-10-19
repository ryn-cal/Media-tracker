"""Merges two mined quote files into one and balances them over the 1 440 minutes.
   python3 merge_quotes.py old.json new.json --out ../data/quotes_en.json [--cap 6] [--cap-round 12]
   - a text that appears in both is kept once; a book keeps one quote per minute
   - a minute keeps at most --cap quotes (--cap-round for :00 and :30), the best ones first: shorter than 220 characters, unambiguous
     (a quote that says "in the morning" beats one that could be AM or PM), clock/bell words, then a stable hash so a rebuild changes nothing
   - prints coverage: minutes with an exact quote, and the longest gap to the nearest one"""
import json, re, sys, argparse, hashlib, collections
ap = argparse.ArgumentParser(); ap.add_argument('files', nargs='+'); ap.add_argument('--out', required=True); ap.add_argument('--cap', type=int, default=6); ap.add_argument('--cap-round', type=int, default=12)
a = ap.parse_args()
books, bidx, rows, seen = [], {}, [], set()
norm = lambda t: re.sub(r'\W+', ' ', t.lower()).strip()
for fn in a.files:
    d = json.load(open(fn, encoding='utf-8'))
    for h, m, amb, text, st, ln, b in d['q']:
        k = norm(text)[:120]
        if k in seen: continue
        seen.add(k); key = tuple(d['b'][b])
        if key not in bidx: bidx[key] = len(books); books.append(list(key))
        rows.append([h, m, amb, text, st, ln, bidx[key]])
def score(r):
    t = r[3]; s = 0
    s += 20 if 90 <= len(t) <= 220 else 8 if 60 <= len(t) <= 250 else 0
    s += 0 if r[2] else 15
    s += 8 if re.search(r'\b(clock|bell|bells|watch|struck|strike|hour)\b', t, re.I) else 0
    return s + int(hashlib.md5(t.encode()).hexdigest()[:4], 16) / 65535 * 6
by = collections.defaultdict(list)
for r in rows: by[(r[0], r[1], r[2])].append(r)
out, used = [], collections.Counter()
for k in sorted(by):
    cap = a.cap_round if k[1] in (0, 30) else max(a.cap, a.cap_round * 2 // 3) if k[1] in (15, 45) else a.cap; booksSeen = set(); n = 0
    for r in sorted(by[k], key=lambda r: -score(r)):
        if r[6] in booksSeen or used[r[6]] > 220: continue
        out.append(r); booksSeen.add(r[6]); used[r[6]] += 1; n += 1
        if n >= cap: break
cov = set()
for r in out:
    for hh in ([r[0] % 12, r[0] % 12 + 12] if r[2] else [r[0]]): cov.add(hh % 24 * 60 + r[1])
gap = 0
for m in range(1440):
    if m in cov: continue
    d = 1
    while (m + d) % 1440 not in cov and (m - d) % 1440 not in cov and d < 200: d += 1
    gap = max(gap, d)
used_books = sorted({r[6] for r in out}); remap = {o: i for i, o in enumerate(used_books)}
res = {'b': [books[i] for i in used_books], 'q': [r[:6] + [remap[r[6]]] for r in out]}
json.dump(res, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('quotes', len(out), 'books', len(used_books), 'minutes with an exact quote', len(cov), 'of 1440 · longest distance to the nearest', gap, 'min')
