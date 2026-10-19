#!/usr/bin/env python3
"""Builds the app and its plug-in packs.

  src/index.html    page template; src/css/<block>/*.css and src/js/*.js are stitched in, in filename order
  index.html        the app itself: interface, a small starter set of pictures, the built-in poems. Nothing else.
  packs/*.json      optional plug-ins: time quotes, picture collections, extra poems, interface languages
  packs/index.json  the catalogue the app shows under "Plug-ins" when it is opened from a web server

Usage:  python3 build.py [data_dir]      (data_dir defaults to ./data)
"""
import json, os, re, sys

root = os.path.dirname(os.path.abspath(__file__))
data = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'data')


def parts(*sub):
    d = os.path.join(root, 'src', *sub)
    return ''.join(open(os.path.join(d, n), encoding='utf-8').read() for n in sorted(os.listdir(d)) if not n.startswith('.'))


def assemble():
    s = open(os.path.join(root, 'src', 'index.html'), encoding='utf-8').read()
    for block in ('base', 'card', 'app', 'share'):          # <style id="<block>-css"> blocks; the app reads some of them back at runtime
        s = s.replace('<!--@css %s-->\n' % block, parts('css', block))
    return s.replace('<!--@js-->\n', parts('js'))


src = assemble()


def load(name, default=None):
    path = os.path.join(data, name)
    if not os.path.exists(path):
        return default
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def dump(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':'))


en = load('quotes_en.json')
zh = load('quotes_zh.json')
wp = load('wallpapers.json')
world = load('quotes_world.json', [])
starter = set(load('starter.json', []))
ui_packs = [n for n in sorted(os.listdir(data)) if n.startswith('ui_') and n.endswith('.json')]

# Chinese mined quotes: [startMin, endMin, text, hlStart, hlLen, bookIdx, term] -> compact rows the app expects
zhq = [[s, e, text, text[a:a + n], zh['b'][b][1], zh['b'][b][0], term] for s, e, text, a, n, b, term in zh['q']]


def inject(s, marker, payload):
    pat = re.compile(r'/\*__%s__\*/.*?/\*__END__\*/' % marker, re.S)
    js = dump(payload).replace('</', '<\\/')
    return pat.sub(lambda m: '/*__%s__*/%s/*__END__*/' % (marker, js), s, count=1)


core_wp = [w for w in wp if w['f'] in starter] or wp[:21]
out = inject(src, 'QMINED', {'b': [], 'q': []})
out = inject(out, 'QZHMINED', [])
out = inject(out, 'CLOUDKEYS', load('cloud.json', {}))            # optional: {"dropbox":"<app key>", "onedrive":"<client id>", "google":"<client id>"}
out = inject(out, 'WALLPAPERS', core_wp)
with open(os.path.join(root, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(out)

# ---------------------------------------------------------------- packs
os.makedirs(os.path.join(root, 'packs'), exist_ok=True)
for old in os.listdir(os.path.join(root, 'packs')):
    if old.endswith('.json'):
        os.remove(os.path.join(root, 'packs', old))
catalogue = []


FR = {
    'quotes-en-time': ('Citations anglaises à l’heure', 'Phrases de romans du domaine public qui nomment la minute exacte, affichées quand cette minute arrive.'),
    'quotes-zh-time': ('Citations chinoises à l’heure', 'Extraits de romans classiques chinois sur l’heure, les veilles de la nuit, le moment de la journée.'),
    'quotes-world': ('Poèmes : japonais, français, espagnol, allemand', 'Poèmes et phrases du domaine public pour chaque moment de la journée.'),
    'pictures-art': ('Peintures', 'Huiles occidentales, encres chinoises, estampes japonaises.'),
    'pictures-scene': ('Paysages', 'Lieux et ciels réels du monde entier, classés par pays.'),
    'pictures-film': ('Photogrammes', 'Images de classiques du cinéma muet.'),
    'pictures-book': ('Livres et bibliothèques', 'Vieux livres, salles de lecture, pages imprimées.'),
    'pictures-album': ('Disques et musique', 'Vinyles, gramophones, partitions.'),
}


def write_pack(pid, kind, name, desc, langs, count, payload, **extra):
    if pid in FR:
        name = dict(name, fr=FR[pid][0]); desc = dict(desc, fr=FR[pid][1])
    pack = {'pack': 'media-tracker', 'version': 1, 'id': pid, 'kind': kind, 'name': name, 'desc': desc, 'langs': langs, 'count': count, 'data': payload}
    pack.update(extra)
    text = dump(pack)
    with open(os.path.join(root, 'packs', pid + '.json'), 'w', encoding='utf-8') as f:
        f.write(text)
    catalogue.append({'id': pid, 'file': pid + '.json', 'kind': kind, 'name': name, 'desc': desc, 'langs': langs, 'count': count, 'bytes': len(text.encode('utf-8'))})


write_pack('quotes-en-time', 'quotes', {'en': 'English time quotes', 'zh': '英文时刻引文'},
           {'en': 'Lines from public-domain novels that name the exact minute, shown when that minute comes round.', 'zh': '来自公版小说、点明具体时刻的句子，时间走到那一分钟时才会出现。'},
           ['en'], len(en['q']), en, format='mined')
write_pack('quotes-zh-time', 'quotes', {'en': 'Chinese time quotes', 'zh': '中文时辰引文'},
           {'en': 'Passages from classic Chinese novels about the hour, the watch of the night, the time of day.', 'zh': '来自古典小说、描写时辰与更点的片段。'},
           ['zh'], len(zhq), zhq, format='mined')
if world:
    write_pack('quotes-world', 'quotes', {'en': 'Poems: Japanese, French, Spanish, German', 'zh': '诗句：日、法、西、德语'},
               {'en': 'Public-domain poems and prose lines for every time of day.', 'zh': '适合各个时段的公版诗文。'},
               sorted({q['l'] for q in world}), len(world), world, format='poems')
COLS = {
    'art': ({'en': 'Paintings', 'zh': '绘画'}, {'en': 'Western oils, Chinese ink, Japanese prints.', 'zh': '西方油画、中国水墨、日本浮世绘。'}),
    'scene': ({'en': 'Landscapes', 'zh': '风景'}, {'en': 'Real places and skies from around the world, tagged by country.', 'zh': '世界各地真实的风土与天空，按国家标注。'}),
    'film': ({'en': 'Film stills', 'zh': '电影剧照'}, {'en': 'Frames from silent-era classics.', 'zh': '默片时代经典的画面。'}),
    'book': ({'en': 'Books & libraries', 'zh': '书籍与图书馆'}, {'en': 'Old books, reading rooms, printed pages.', 'zh': '古籍、阅览室与印刷页面。'}),
    'album': ({'en': 'Records & music', 'zh': '唱片与音乐'}, {'en': 'Vinyl, gramophones, sheet music.', 'zh': '黑胶、留声机与乐谱。'}),
}
for c, (nm, ds) in COLS.items():
    items = [w for w in wp if w.get('c', 'art') == c]
    if items:
        write_pack('pictures-' + c, 'pictures', nm, ds, sorted({w['g'] for w in items if w.get('g')}), len(items), items, collection=c)
for fn in ui_packs:
    ui = load(fn)
    write_pack('ui-' + ui['lang'], 'ui', {'en': ui['langName'], 'zh': ui['langName']}, {'en': 'Interface in ' + ui['langName'] + '.', 'zh': '界面语言：' + ui['langName'] + '。'},
               [ui['lang']], len(ui['strings']), ui['strings'], lang=ui['lang'], langName=ui['langName'])
with open(os.path.join(root, 'packs', 'index.json'), 'w', encoding='utf-8') as f:
    f.write(json.dumps({'pack': 'media-tracker', 'version': 1, 'packs': catalogue}, ensure_ascii=False, indent=1))

kb = lambda n: '%.0f KB' % (n / 1024)
print('index.html: %s  (starter: %d pictures)' % (kb(len(out.encode())), len(core_wp)))
for c in catalogue:
    print('  packs/%-22s %8s  %s' % (c['file'], kb(c['bytes']), c['count']))
