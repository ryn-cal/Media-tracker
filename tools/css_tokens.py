"""Snaps the CSS onto the token ladder of src/css/base/00-tokens.css (see AUDIT-style.md, solution A).
   python3 tools/css_tokens.py [--write]      without --write it only reports what it would change
   font-size (px)   → --fs-*          border-radius (px) → --r-*          transition / animation seconds → --dur-*
   black blurred box-shadow → --elev-1/2/3 (rings, insets and coloured glows are left alone)
   Not touched: the share card (css/share/01-share-card.css is exported on its own), sizes above 40 px (hero numbers), z-index, spacing."""
import re, glob, sys, os
WRITE = '--write' in sys.argv
FS = [(11, '--fs-2xs'), (12, '--fs-xs'), (13, '--fs-sm'), (14, '--fs-md'), (16, '--fs-lg'), (20, '--fs-xl'), (28, '--fs-2xl'), (40, '--fs-3xl')]
def fs(px):
    if px > 40: return None
    best = min(FS, key=lambda a: (abs(a[0] - px), a[0])); return 'var(%s)' % best[1]
RAD = [(6, '--r-xs'), (10, '--r-sm'), (14, '--r-md'), (20, '--r-lg')]
def rad(px):
    if px <= 3: return None                     # hairlines and bars
    if px >= 900: return 'var(--r-pill)'
    return 'var(%s)' % min(RAD, key=lambda a: (abs(a[0] - px), a[0]))[1]
def dur(sec):
    if sec >= .55: return None
    return 'var(--dur-1)' if sec <= .16 else 'var(--dur-2)' if sec <= .26 else 'var(--dur-3)'
cnt = {'font-size':0, 'radius':0, 'duration':0, 'shadow':0}
def sub_fs(m):
    px = float(m.group(2)); r = fs(px)
    if r is None: return m.group(0)
    cnt['font-size'] += 1; return m.group(1) + r
def sub_rad(m):
    vals = m.group(2).strip()
    if 'var(' in vals or '/' in vals or '%' in vals and vals != '50%': return m.group(0)
    toks = re.split(r'\s+', vals); out = []
    for t in toks:
        mm = re.fullmatch(r'(\d*\.?\d+)px', t)
        if mm: r = rad(float(mm.group(1))); out.append(r or t); cnt['radius'] += 1 if r else 0
        else: out.append(t)
    return m.group(1) + ' '.join(out)
def sub_dur(m):
    decl = m.group(0)
    def one(d):
        r = dur(float(d.group(1)) if d.group(1).startswith('.') or '.' in d.group(1) else float(d.group(1)))
        if r is None: return d.group(0)
        cnt['duration'] += 1; return r
    return re.sub(r'(?<![\w.-])(\d*\.?\d+)s(?![\w-])', one, decl)
def split_layers(v):
    out, depth, cur = [], 0, ''
    for ch in v:
        if ch == '(': depth += 1
        if ch == ')': depth -= 1
        if ch == ',' and depth == 0: out.append(cur.strip()); cur = ''
        else: cur += ch
    out.append(cur.strip()); return out
LAYER = re.compile(r'^(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+([\d.]+)(?:px)?(?:\s+-?[\d.]+(?:px)?)?\s+rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)')
def sub_shadow(m):
    v = m.group(2).strip()
    if 'inset' in v or 'var(' in v or 'color-mix' in v: return m.group(0)
    blurs = []
    for l in split_layers(v):
        mm = LAYER.match(l)
        if not mm or max(int(mm.group(i)) for i in (4, 5, 6)) > 40: return m.group(0)       # a ring, a glow or a coloured shadow: leave it
        x, y, b = float(mm.group(1)), float(mm.group(2)), float(mm.group(3))
        if b == 0 and x == 0 and y == 0: return m.group(0)
        blurs.append(b)
    blur = max(blurs); cnt['shadow'] += 1
    return m.group(1) + ('var(--elev-1)' if blur <= 12 else 'var(--elev-2)' if blur <= 32 else 'var(--elev-3)')
files = [f for f in sorted(glob.glob('src/css/*/*.css')) if not f.endswith('share/01-share-card.css') and not f.endswith('base/00-tokens.css')]
for f in files:
    s = open(f, encoding='utf-8').read(); o = s
    s = re.sub(r'(font-size:\s*)(\d*\.?\d+)px', sub_fs, s)
    s = re.sub(r'(border-radius:\s*)([^;}!]+)', sub_rad, s)
    s = re.sub(r'(?<![\w-])(?:transition|animation)(?:-duration)?:[^;}]+', sub_dur, s)
    s = re.sub(r'(box-shadow:\s*)([^;}!]+)', sub_shadow, s)
    if WRITE and s != o: open(f, 'w', encoding='utf-8').write(s)
print(cnt, 'written' if WRITE else '(dry run)')
