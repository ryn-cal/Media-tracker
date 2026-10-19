"""The second pipeline: let a language model judge what the rules found. NOT RUN in this repository's build; it needs an API key.
   python3 mine.py --books books --out raw.json --candidates cand.jsonl          # rules: find every sentence that names a time
   python3 judge_quotes.py cand.jsonl --out judged.jsonl --model claude-haiku-4-5-20251001     # model: keep, fix, or drop each one
   python3 judged_to_quotes.py …   (turn the kept lines into the same {"b","q"} file; see LITERARY-CLOCK.md)

   Why a second pass. The rules cannot tell "at twelve o'clock" in a ghost story from "twelve o'clock" meaning a position on a dial, a year
   from a time, or 7.30 from a price, and they guess AM or PM from a few words. The model can, if it is shown the sentences around the hit.

   RAG here means: retrieve before you judge. Each candidate carries the sentence before and after it from the same book (and the title and
   author, which date the setting). The model never sees the hit alone.
   CoT here means: ask for short reasoning first and the verdict after, in a fixed JSON shape, so every decision can be audited.
   Cost is kept down by judging only candidates the rules scored well, by caching on a hash of the candidate, and by running in batches."""
import json, sys, os, hashlib, argparse, time
ap = argparse.ArgumentParser(); ap.add_argument('cands'); ap.add_argument('--out', default='judged.jsonl'); ap.add_argument('--model', default='claude-haiku-4-5-20251001'); ap.add_argument('--limit', type=int, default=0)
a = ap.parse_args()
try:
    import anthropic
except ImportError:
    sys.exit('pip install anthropic, and set ANTHROPIC_API_KEY')
client = anthropic.Anthropic()
SYSTEM = """You help build a literary clock: a clock that shows, for each minute of the day, a sentence from a novel that names that minute.
You get one candidate: a sentence the program thinks names a time, the sentences around it, and the book. Decide.
Think in steps, briefly:
 1. Does the phrase give a time of day on a clock or watch (a scene happening at that time), rather than a year, a date, a price, a score, a ratio, a bearing ("twelve o'clock" on a dial), a duration, or a quotation from scripture or a poem?
 2. What exact time is it, 24-hour? Use the context for morning or afternoon (light, meals, bells, lamps, "p.m."). If the context cannot decide, say "either".
 3. Would it stand alone on a clock face? It should be one or two sentences, complete, vivid or at least pleasant, no spoilers that need the plot, nothing hateful or graphic.
 4. Which part of the text is the time phrase (copy it exactly)?
Reply with JSON only, in this shape:
{"reasoning": "<two sentences at most>", "is_time": true|false, "hour24": 0-23|null, "minute": 0-59|null, "am_pm": "am"|"pm"|"either", "quality": 1-5, "text": "<the sentence or the two sentences to show, trimmed, exactly as in the book>", "phrase": "<the time phrase exactly as in the text>", "drop_reason": "<empty, or why>"}"""
def ask(c):
    msg = f"Book: {c['title']} by {c['author']}\nBefore: {c['before']}\nCandidate: {c['text']}\nAfter: {c['after']}\nThe program read it as {c['hour']:02d}:{c['minute']:02d} (ambiguous: {c['ambiguous']}), from the phrase: {c['term']!r}"
    r = client.messages.create(model=a.model, max_tokens=400, system=SYSTEM, messages=[{'role':'user', 'content':msg}])
    t = r.content[0].text.strip(); t = t[t.index('{'):t.rindex('}') + 1]; return json.loads(t)
done = {}
if os.path.exists(a.out):
    for l in open(a.out, encoding='utf-8'): d = json.loads(l); done[d['id']] = d
n = 0
with open(a.out, 'a', encoding='utf-8') as out:
    for l in open(a.cands, encoding='utf-8'):
        c = json.loads(l)
        if c['id'] in done: continue
        if a.limit and n >= a.limit: break
        try: v = ask(c)
        except Exception as e: print('skip', c['id'], e); time.sleep(2); continue
        out.write(json.dumps({'id':c['id'], 'title':c['title'], 'author':c['author'], **v}, ensure_ascii=False) + '\n'); out.flush(); n += 1
print('judged', n)
