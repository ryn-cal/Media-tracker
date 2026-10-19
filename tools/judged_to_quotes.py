"""Turns the lines judge_quotes.py kept into the {"b","q"} file the app and merge_quotes.py read.
   python3 judged_to_quotes.py judged.jsonl --out llm_quotes.json [--min-quality 4]"""
import json, argparse
ap = argparse.ArgumentParser(); ap.add_argument('judged'); ap.add_argument('--out', required=True); ap.add_argument('--min-quality', type=int, default=4); a = ap.parse_args()
books, bidx, q = [], {}, []
for l in open(a.judged, encoding='utf-8'):
    d = json.loads(l)
    if not d.get('is_time') or d.get('quality', 0) < a.min_quality or d.get('hour24') is None or d.get('minute') is None: continue
    key = (d['title'], d['author'])
    if key not in bidx: bidx[key] = len(books); books.append(list(key))
    text = d['text']; ph = d.get('phrase') or ''; st = text.find(ph) if ph else -1
    q.append([d['hour24'], d['minute'], 1 if d.get('am_pm') == 'either' else 0, text, max(st, 0), len(ph) if st >= 0 else 0, bidx[key]])
json.dump({'b':books, 'q':q}, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':')); print(len(q), 'quotes kept')
