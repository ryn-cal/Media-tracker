import sys, re, glob, json, random, os, collections
sys.path.insert(0, 'pylib')
from opencc import OpenCC
cc = OpenCC('t2s')
random.seed(11)
AUTH = {'24264':'曹雪芹','23863':'施耐庵','24032':'吴敬梓','23910':'许仲琳','23835':'袁于令','25128':'曾朴','25130':'宣鼎','25192':'沈复','24141':'冯梦龙','24239':'冯梦龙','24162':'凌濛初','24099':'吴趼人','23950':'罗贯中','23962':'吴承恩','23849':'汤显祖','23817':'纪昀','24138':'李宝嘉','25217':'陈忱','23876':'徐霞客','24042':'鲁迅','24231':'杨尔曾'}
TITLES={'24264':'红楼梦','23863':'水浒传','24032':'儒林外史','23910':'封神演义','23835':'隋唐演义','25128':'孽海花','25130':'夜雨秋灯录','25192':'浮生六记','24141':'警世通言','24239':'醒世恒言','24162':'二刻拍案惊奇','24099':'二十年目睹之怪现状','23950':'三国志演义','23962':'西游记','23849':'牡丹亭','23817':'阅微草堂笔记','24138':'官场现形记','25217':'水浒后传','23876':'徐霞客游记','24042':'彷徨','24231':'韩湘子全传'}
# slot name -> (start minute, end minute) ; end may wrap
SHICHEN = {'子':(23*60,60),'丑':(60,180),'寅':(180,300),'卯':(300,420),'辰':(420,540),'巳':(540,660),'午':(660,780),'未':(780,900),'申':(900,1020),'酉':(1020,1140),'戌':(1140,1260),'亥':(1260,1380)}
GENG = {'一':(19*60,21*60),'二':(21*60,23*60),'三':(23*60,60),'四':(60,180),'五':(180,300)}
WORDS = [('清晨',(330,450)),('清早',(330,450)),('大清早',(330,450)),('平明',(330,450)),('天明',(270,390)),('天亮',(270,390)),('黎明',(270,390)),('早饭',(420,540)),('晌午',(660,780)),('正午',(690,750)),('午饭',(690,810)),('午后',(780,960)),('晌午',(660,780)),('傍晚',(1020,1140)),('黄昏',(1050,1170)),('日落',(1020,1140)),('日暮',(1020,1140)),('掌灯',(1080,1200)),('晚饭',(1050,1170)),('三更半夜',(23*60,120)),('半夜',(23*60,180)),('夜半',(23*60,120)),('深夜',(23*60,180)),('五鼓',(180,300)),('鸡鸣',(180,330)),('鸡叫',(180,330))]
SH = re.compile(r'(?<![日星生出同当此那一二三四五六七八九十])([子丑寅卯辰巳午未申酉戌亥])时(?:分|初|正|三刻|一刻)?')
GE = re.compile(r'([一二三四五])更(?:天|时|时分|左右|鼓|以后|已过|已尽|时候|才|方)')
BAD = re.compile(r'(奸|淫|强暴|杀|血|死|尸|妓|娼|裸|屁|屎|奴才|贼)')
books, out = [], []
files = sorted(glob.glob('booksz/*.txt')) + sorted(glob.glob('zh*.txt'))
for fn in files:
    id_ = re.sub(r'\D', '', os.path.basename(fn))
    if id_ not in AUTH: continue
    raw = open(fn, encoding='utf-8-sig', errors='ignore').read()
    m = re.search(r'The Project Gutenberg eBook of (.+)', raw)
    title = TITLES[id_]
    s = raw.find('*** START OF'); e = raw.find('*** END OF')
    txt = raw[raw.find('\n', s) + 1: e if e > s else None]
    txt = cc.convert(txt).replace('\r', '')
    bi = len(books); books.append((title, AUTH[id_]))
    found = 0
    for para in re.split(r'\n\s*\n', txt):
        para = re.sub(r'\s+', '', para)
        if len(para) < 15: continue
        sents = re.findall(r'[^。！？]+[。！？][”」』’]*', para)
        for i, st in enumerate(sents):
            hits = []
            for mm in SH.finditer(st):
                if mm.group(1)=='子' and not (mm.start()==0 or st[mm.start()-1] in '交到至及是在过当那这个，、：；于已将') : continue
                hits.append((mm.start(), mm.end(), SHICHEN[mm.group(1)], mm.group(0), 3))
            for mm in GE.finditer(st):
                hits.append((mm.start(), mm.end(), GENG[mm.group(1)], mm.group(0)[:2], 3))
            for w, rng in WORDS:
                k = st.find(w)
                if k >= 0: hits.append((k, k + len(w), rng, w, 1))
            if not hits: continue
            hits.sort(key=lambda x: -x[4]); a, b, rng, term, pri = hits[0]
            q = st
            if len(q) < 24 and i > 0 and len(sents[i - 1]) + len(q) < 90: q = sents[i - 1] + q; a += len(sents[i - 1])
            q = q.strip('“「『‘')
            if not (22 <= len(q) <= 100) or BAD.search(q): continue
            if q.count('，') + q.count('、') + q.count('；') > 7: continue
            a = q.find(term)
            if a < 0: continue
            if q[0] in '，。、：”」' or re.search(r'[．─—…]{2}|．|─',q): continue
            score = 50 + (15 if pri == 3 else 0) + (10 if 28 <= len(q) <= 70 else 0) + random.random() * 8
            out.append(dict(rng=rng, text=q, a=a, ln=len(term), b=bi, term=term, score=score))
            found += 1
    print(fn, title, found)
# choose: per 2-hour-ish slot bucket (use start minute) up to 14, per book cap
by = collections.defaultdict(list)
for q in out: by[q['rng'][0] // 60].append(q)
chosen = []; bc = collections.Counter()
for k in sorted(by):
    lst = sorted(by[k], key=lambda x: -x['score']); n = 0; seen = set()
    for q in lst:
        if bc[q['b']] >= 60 or q['text'][:12] in seen: continue
        chosen.append(q); bc[q['b']] += 1; seen.add(q['text'][:12]); n += 1
        if n >= 16: break
print('books', len(books), 'raw', len(out), 'chosen', len(chosen))
res = {'b': books, 'q': [[q['rng'][0], q['rng'][1], q['text'], q['a'], q['ln'], q['b'], q['term']] for q in chosen]}
json.dump(res, open('quotes_zh.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(os.path.getsize('quotes_zh.json'), 'bytes')
for q in chosen[:: max(1, len(chosen) // 12)]: print(q['rng'], q['text'], '——', books[q['b']])
