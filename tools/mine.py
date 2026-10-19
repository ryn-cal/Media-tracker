"""Mines "time sentences" from public-domain novels: a sentence that names a clock time becomes a quote for that minute.
   This is the raw (rule-based) pipeline. python3 mine.py --books books --out quotes_en.json [--cap 6] [--cap-round 12]
   Output: {"b": [[title, author]…], "q": [[hour, minute, ambiguous(0/1), text, highlightStart, highlightLength, bookIndex]…]}"""
import re, glob, json, os, random, collections, argparse
random.seed(7)
AP = argparse.ArgumentParser(); AP.add_argument('--books', default='books'); AP.add_argument('--out', default='quotes_en.json'); AP.add_argument('--cap', type=int, default=6, help='most quotes kept for an ordinary minute'); AP.add_argument('--cap-round', type=int, default=12, help='most kept for :00 and :30')
AP.add_argument('--candidates', default='', help='also write every raw hit with its surrounding sentences to this .jsonl, for judge_quotes.py')
ARGS = AP.parse_args()
UNITS = {w:i+1 for i,w in enumerate("one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split())}
TENS = {'twenty':20,'thirty':30,'forty':40,'fifty':50}
HOURW = "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve"
NUMW = r"(?:(?:twenty|thirty|forty|fifty)(?:[- ](?:one|two|three|four|five|six|seven|eight|nine))?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)|(?:five|ten|fifteen) and twenty|\d{1,2})"
HOUR = r"(?:%s|\d{1,2}|midnight|noon)" % HOURW
OC = r"o['’]clock"
BAD = re.compile(r"\b(nigger|negro|negroes|niggers|coolie|chink|jap|jew-?boy|darky|darkey|savages?|squaw|whore|rape|raped|slut|bitch|bastard|damn|damned|hell|gypsy|gipsy|hottentot|kaffir|papist|heathen)\b", re.I)

def num(s):
    s = s.strip().lower()
    if s.isdigit(): return int(s)
    m = re.match(r"(five|ten|fifteen) and twenty", s)
    if m: return UNITS[m.group(1)] + 20
    parts = re.split(r"[- ]", s)
    if parts[0] in TENS:
        return TENS[parts[0]] + (UNITS[parts[1]] if len(parts) > 1 else 0)
    return UNITS.get(parts[0])

def hnum(s):
    s = s.lower()
    if s == 'midnight': return 0
    if s == 'noon': return 12
    n = num(s)
    return n

PATS = []
def P(rx, fn): PATS.append((re.compile(rx, re.I), fn))

# quarter past/to
P(r"\b(?:a|the) quarter[- ](past|after|to|of|before|till) (%s)\b(?!\s*o['’]clock)" % HOUR,
  lambda m: (hnum(m.group(2)), 15) if m.group(1).lower() in ('past', 'after') else (hnum(m.group(2)) - 1, 45))
P(r"\bhalf[- ]past (%s)\b" % HOUR, lambda m: (hnum(m.group(1)), 30))
P(r"\b(five|ten|twenty|twenty-five|twenty five) (past|after) (%s)\b" % HOUR, lambda m: (hnum(m.group(3)), num(m.group(1))))
P(r"\b(five|ten|twenty|twenty-five|twenty five) to (%s)\b(?=[.,;:!?\"”’])" % HOUR, lambda m: (hnum(m.group(2)) - 1, 60 - num(m.group(1))))
P(r"\b(%s|\d{1,2})\s*([ap])\.?m\.?(?![a-z])" % HOURW, lambda m: (hnum(m.group(1)) % 12 + (12 if m.group(2).lower() == 'p' else 0), 0))
P(r"\b(%s)[- ](thirty|fifteen|forty-five|forty five)\b(?=[.,;:!?\"”’])" % HOURW, lambda m: (hnum(m.group(1)), num(m.group(2))))
P(r"\b(%s) minutes? (past|after|to|of|before|till) (%s)\b" % (NUMW, HOUR),
  lambda m: None if num(m.group(1)) is None or not (1 <= num(m.group(1)) <= 59) else
  ((hnum(m.group(3)), num(m.group(1))) if m.group(2).lower() in ('past', 'after') else (hnum(m.group(3)) - 1, 60 - num(m.group(1)))))
P(r"\b(%s) %s" % (HOUR, OC), lambda m: (hnum(m.group(1)), 0))
P(r"\b(?:struck|strikes|striking) (%s)\b(?! (?:miles|times|him|her|me|them|us|the|a|an))" % HOURW, lambda m: (hnum(m.group(1)), 0))
P(r"\bat (midnight|noon)\b", lambda m: (hnum(m.group(1)), 0))
P(r"\b(?:at|by|till|until|before|after|about) (%s) (?:in the (?:morning|afternoon|evening)|at night)\b" % HOURW, lambda m: (hnum(m.group(1)), 0))
P(r"\b(\d{1,2}):(\d{2})\s*(?:[ap]\.?m\.?)?", lambda m: (int(m.group(1)), int(m.group(2))) if int(m.group(1)) <= 24 and int(m.group(2)) < 60 else None)
P(r"\bat (%s) ((?:twenty|thirty|forty|fifty)(?:[- ](?:one|two|three|four|five|six|seven|eight|nine))?|fifteen)\b(?! (?:pounds|shillings|francs|dollars|years|miles|men|feet|yards|guineas|thousand|hundred|thousands|of|to|or))" % HOURW,
  lambda m: (hnum(m.group(1)), num(m.group(2))))

MORN = re.compile(r"\b(morning|a\.m\.|dawn|sunrise|breakfast|daybreak|cock-?crow)\b", re.I)
EVE = re.compile(r"\b(afternoon|evening|night|p\.m\.|dinner|supper|sunset|twilight|dusk|candle|lamp|moonlight|ball|theatre)\b", re.I)
MID = re.compile(r"\bmidnight\b", re.I)

def resolve(h, m, sent, matched):
    """return list of (hour24, minute, ambiguous?)"""
    if h < 0: h += 12 if h == -1 else 0
    if h == 24: h = 0
    if h > 12: return [(h, m, False)]
    ctx = matched.lower() + ' ' + sent.lower()
    mid = bool(MID.search(sent)) and h in (12, 0)
    mo = bool(MORN.search(sent)); ev = bool(EVE.search(sent))
    if h == 0 and 'midnight' in matched.lower(): return [(0, m, False)]
    if h == 12 and 'noon' in matched.lower(): return [(12, m, False)]
    if mid and not mo: return [(0, m, False)]
    if mo and not ev: return [((h % 12), m, False)]
    if ev and not mo: return [((h % 12) + 12, m, False)]
    return [((h % 12), m, True)]

ABBR = ['Mr', 'Mrs', 'Ms', 'Dr', 'St', 'Messrs', 'Capt', 'Col', 'Gen', 'Lt', 'Rev', 'Hon', 'No', 'vs', 'Esq', 'Mt', 'Jr', 'Sr', 'Prof', 'Sir']
def split_sents(p):
    for a in ABBR: p = re.sub(r"\b%s\." % a, a + "․", p)
    p = re.sub(r"\b([ap])\.m\.", lambda m: m.group(1) + "․m․", p, flags=re.I)
    s = re.split(r"(?<=[.!?][\"”’'])\s+(?=[\"“‘'A-Z—])|(?<=[.!?])\s+(?=[\"“‘'A-Z—])", p)
    return [x.replace("․", ".").strip() for x in s if x.strip()]

def header(txt):
    head = txt[:4000]
    t = re.search(r"^Title:\s*(.+?)\s*$", head, re.M); a = re.search(r"^Author:\s*(.+?)\s*$", head, re.M)
    title = t.group(1).strip() if t else None; author = a.group(1).strip() if a else None
    if not title:
        for line in head.split("\n")[:12]:
            m = re.search(r"Project Gutenberg(?:'s)? (?:eBook|EBook|etext|Etext) of (.+)$", line, re.I)
            if m:
                rest = m.group(1).strip(); mm = re.match(r"(.+?),? by (.+)$", rest)
                title, author = (mm.group(1), mm.group(2)) if mm else (rest, author)
                break
    return (title or '?', author or '?')

def body(txt):
    s = txt.find("*** START OF"); e = txt.find("*** END OF")
    if s >= 0: txt = txt[txt.find("\n", s) + 1:]
    if e >= 0 and e > s: txt = txt[:txt.find("*** END OF")]
    return txt

TITLES = json.load(open('titles.json')) if os.path.exists('titles.json') else {}
books, quotes = [], []
for fn in sorted(glob.glob(os.path.join(ARGS.books, "*.txt"))):
    raw = open(fn, encoding='utf-8-sig', errors='ignore').read()
    title, author = header(raw)
    if title == '?' or author == '?':
        meta = TITLES.get(os.path.basename(fn)[:-4], '')
        mm = re.match(r'(.+?),? by (.+)$', meta)
        if mm: title, author = mm.group(1).strip(), mm.group(2).strip()
        elif meta: title = meta
    if re.search(r"(dictionary|encyclop|bible|catalog|index|chronolog|letters? of|anthology|poems|verse|songs|speeches|journal of|sermons|cyclopaedia|handbook|manual|treatise|essays)", title, re.I): continue
    txt = body(raw).replace("\r", "")
    txt = re.sub(r"\[[^\]]{0,300}\]", " ", txt)  # footnotes, illustrations
    txt = txt.replace("_", "")
    paras = [re.sub(r"\s+", " ", p).strip() for p in re.split(r"\n\s*\n", txt)]
    bi = len(books); books.append((re.sub(r"\s*\n\s*", " ", title), re.sub(r"^([^,]+),\s*([^,(]+).*$", r"\2 \1", author) if ',' in author else author))
    found = 0
    for p in paras:
        if len(p) < 25 or p.isupper() or re.match(r"^(chapter|book|part|volume|contents|\*)", p, re.I): continue
        sents = split_sents(p)
        for i, s in enumerate(sents):
            hits = []
            for rx, fn_ in PATS:
                for m in rx.finditer(s):
                    r = fn_(m)
                    if r is None or r[0] is None or r[1] is None: continue
                    hits.append((m.start(), m.end(), r, m.group(0)))
            if not hits or len(hits) > 2: continue
            st, en, (h, mi), matched = hits[0]
            ln0 = en - st
            if h < 0 or h > 24 or mi < 0 or mi > 59: continue
            if re.match(r'^\d{1,2}:\d{2}', matched) and not re.search(r'\b(at|about|by|until|till|exactly|before|after|near|nearly|past|than|from|to|and|of)\s+$', s[:st], re.I): continue
            if re.search(r'\b(Gen|Exod|Lev|Num|Deut|Matt|Mark|Luke|John|Acts|Rom|Cor|Rev|Ps|Prov|Isa|Jer|verse|chapter|Noah|Canaan)\b', s): continue
            q = s
            # extend with previous sentence if short
            if len(q) < 75 and i > 0 and len(sents[i - 1]) + len(q) < 250 and not BAD.search(sents[i - 1]):
                q = sents[i - 1] + ' ' + q; st += len(sents[i - 1]) + 1
            if not (45 <= len(q) <= 270): continue
            if BAD.search(q) or not q[0] in "\"“‘'ABCDEFGHIJKLMNOPQRSTUVWXYZ—" or not q.rstrip()[-1] in ".!?\"”’'…": continue
            if sum(c.isdigit() for c in q) > 8: continue
            q = q.replace("—", "—").strip()
            for (h24, mm, amb) in resolve(h, mi, s, matched):
                ln = len(q)
                score = 50 + (20 if 90 <= ln <= 220 else 8 if 60 <= ln <= 250 else 0) + (0 if amb else 15)
                if re.search(r"\b(clock|bell|bells|watch|struck|strike|hour)\b", q, re.I): score += 8
                if q.count('"') + q.count('“') > 2: score -= 6
                score += random.random() * 6
                quotes.append(dict(h=h24, m=mm, amb=amb, text=q, st=st, ln=ln0, b=bi, score=score, before=sents[i - 1] if i > 0 else '', after=sents[i + 1] if i + 1 < len(sents) else '', term=matched))
            found += 1
    print(fn, title[:40], found)

# choose best few per (h,m)
by = collections.defaultdict(list)
for q in quotes: by[(q['h'], q['m'], q['amb'])].append(q)
chosen = []
bookcount = collections.Counter()
for k in sorted(by):
    lst = sorted(by[k], key=lambda x: -x['score'])
    seen = set(); n = 0
    for q in lst:
        if q['b'] in seen: continue
        if bookcount[q['b']] > 220: continue
        # drop near-duplicates
        if any(q['text'][:40] == c['text'][:40] for c in chosen[-6:]): continue
        chosen.append(q); seen.add(q['b']); bookcount[q['b']] += 1; n += 1
        if n >= (ARGS.cap_round if k[1] in (0, 30) else max(ARGS.cap, ARGS.cap_round * 2 // 3) if k[1] in (15, 45) else ARGS.cap): break
cov=set()
for q in chosen:
    for hh in ([q['h'], q['h']+12] if q['amb'] else [q['h']]): cov.add((hh, q['m']))
print("books", len(books), "raw", len(quotes), "chosen", len(chosen), "minutes covered", len(cov), "unambiguous", sum(1 for q in chosen if not q['amb']))
out = {"b": books, "q": [[q['h'], q['m'], 1 if q['amb'] else 0, q['text'], q['st'], q['ln'], q['b']] for q in chosen]}
if ARGS.candidates:
    with open(ARGS.candidates, 'w', encoding='utf-8') as f:
        for n, q in enumerate(quotes): f.write(json.dumps({'id':n, 'hour':q['h'], 'minute':q['m'], 'ambiguous':q['amb'], 'term':q['term'], 'text':q['text'], 'before':q['before'], 'after':q['after'], 'title':books[q['b']][0], 'author':books[q['b']][1], 'st':q['st'], 'ln':q['ln']}, ensure_ascii=False) + '\n')
json.dump(out, open(ARGS.out, 'w'), ensure_ascii=False, separators=(',', ':'))
print(os.path.getsize(ARGS.out), "bytes")
