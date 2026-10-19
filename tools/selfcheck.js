#!/usr/bin/env node
/* Self-check for every upgrade (NOTES.md, principle 2). No dependencies: node only.
     node tools/selfcheck.js           syntax of every script, interface strings, ids, build repeatability
   Exits 1 if something that would break the page is found. Warnings (a missing Chinese string, say) do not fail the run.
   What it cannot do: open the page. The beta checklist in docs/<version>/ covers that. */
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process'), crypto = require('crypto');
const root = path.resolve(__dirname, '..'), src = p => path.join(root, 'src', p);
let fail = 0, warn = 0; const ok = m => console.log('  ok    ' + m), bad = m => { fail++; console.log('  FAIL  ' + m); }, wn = m => { warn++; console.log('  warn  ' + m); };
const jsFiles = fs.readdirSync(src('js')).filter(f => f.endsWith('.js')).sort();

console.log('1. Syntax of every script');
for (const f of jsFiles) { try { new vm.Script(fs.readFileSync(src('js/' + f), 'utf8'), { filename:f }); } catch (e) { bad(f + ': ' + e.message); } }
if (!fail) ok(jsFiles.length + ' scripts parse');

console.log('2. Interface strings');
const sandbox = { localStorage:{ getItem:() => null, setItem() {} }, navigator:{ language:'en', userAgent:'', platform:'' }, matchMedia:() => ({ matches:false, addEventListener() {} }), window:{}, document:{ documentElement:{ dataset:{}, lang:'en' }, getElementById:() => null, addEventListener() {} }, console, addEventListener() {}, location:{ search:'' } };
sandbox.window = sandbox; vm.createContext(sandbox);
let loaded = 0;
for (const f of jsFiles.filter(f => /^(01-i18n|22-i18n)/.test(f))) { try { vm.runInContext(fs.readFileSync(src('js/' + f), 'utf8').replace(/\bconst I18N\b/, 'var I18N').replace(/\bconst (store|jsonStore|prefs|t|L|fmt|esc)\b/g, 'var $1'), sandbox, { filename:f }); loaded++; } catch (e) { wn(f + ' could not be evaluated in isolation (' + e.message.slice(0, 60) + ')'); } }
const I = sandbox.I18N; if (!I || !I.en) bad('I18N did not load');
else {
  const all = new Set(Object.keys(I.en)), zh = new Set(Object.keys(I.zh || {}));
  const used = new Map(), addUse = (k, f) => { if (!used.has(k)) used.set(k, f); };
  const staticFiles = jsFiles.filter(f => !/^(01-i18n|22-i18n)/.test(f)).map(f => ['js/' + f, fs.readFileSync(src('js/' + f), 'utf8')]).concat([['index.html', fs.readFileSync(src('index.html'), 'utf8')]]);
  for (const [f, s] of staticFiles) {
    for (const m of s.matchAll(/\bt\(\s*'([a-z][a-z0-9_]*)'(?!\s*\+)/g)) addUse(m[1], f);          // 't("pc_" + id)' builds a key at run time: not checked here
    for (const m of s.matchAll(/data-i18n(?:-aria|-ph|-title)?="([a-z][a-z0-9_]*)"/g)) addUse(m[1], f);
  }
  /* keys built from a prefix at run time are checked by listing the prefixes the code uses */
  const missing = [...used].filter(([k]) => !all.has(k));
  if (missing.length) missing.slice(0, 40).forEach(([k, f]) => bad(`string "${k}" is used in ${f} but defined nowhere`)); else ok(used.size + ' string keys used, all defined in English');
  const noZh = [...all].filter(k => !zh.has(k) && /^(pc_|rc_|pl_|rd_|cl_|fo_|ab_|why_|key_|set_(step|hide|resume|awake|autodone|player|keys)|loc_|fin_|fp_(play|read|open|resume|cover)|stat_week|sync_(other|file_d|dav_forget|auth|cors)|ad_)/.test(k));
  if (noZh.length) wn(noZh.length + ' v18 English strings have no Chinese counterpart, e.g. ' + noZh.slice(0, 4).join(', ')); else ok('every v18 string exists in English and Chinese');
}

/* NOTES.md, principle 3: every control carries its lines (what it does, what you get, without it, where to find it), in both languages */
console.log('2b. Every player and reader control has its four lines');
if (I && I.en) {
  const lists = [['26b-media-player.js', 'PL_ACT', 'pc_'], ['26c-reader.js', 'RD_ACT', 'rc_']]; let miss = 0, total = 0;
  for (const [f, name, pre] of lists) {
    const src2 = fs.readFileSync(src('js/' + f), 'utf8'), blk = src2.slice(src2.indexOf('const ' + name + ' = ['), src2.indexOf('];', src2.indexOf('const ' + name + ' = [')));
    const ids = [...blk.matchAll(/\['([a-z0-9]+)',\s*'[a-z0-9-]+',\s*\[/g)].map(m => m[1]);
    for (const id of ids) for (const suf of ['', '_d', '_m', '_n', '_a']) for (const lang of ['en', 'zh']) { total++; if (!(I[lang] && I[lang][pre + id + suf])) { miss++; bad(`control "${id}" (${f}) has no ${lang} string ${pre}${id}${suf}`); } }
  }
  if (!miss) ok(total / 10 + ' controls, all five lines in English and Chinese');
}

console.log('3. Element ids the scripts rely on');
const html = fs.readFileSync(src('index.html'), 'utf8'), ids = new Set([...html.matchAll(/\bid="([A-Za-z0-9_-]+)"/g)].map(m => m[1]));
const made = new Set(), prefixes = []; for (const f of jsFiles) { const s = fs.readFileSync(src('js/' + f), 'utf8'); for (const m of s.matchAll(/\bid="([A-Za-z0-9_-]+)"/g)) made.add(m[1]); for (const m of s.matchAll(/\.id\s*=\s*'([A-Za-z0-9_-]+)'/g)) made.add(m[1]); for (const m of s.matchAll(/\bid="([A-Za-z0-9_-]+)\$\{/g)) prefixes.push(m[1]); }
/* 04-table-view.js is the script of an exported page, with its own markup: left out */
const wanted = new Map(); for (const f of jsFiles.filter(f => f !== '04-table-view.js')) { const s = fs.readFileSync(src('js/' + f), 'utf8'); for (const m of s.matchAll(/\$\('([A-Za-z0-9_-]+)'\)/g)) if (!wanted.has(m[1])) wanted.set(m[1], f); }
const noId = [...wanted].filter(([k]) => !ids.has(k) && !made.has(k) && !prefixes.some(p => k.startsWith(p)));
if (noId.length) noId.slice(0, 12).forEach(([k, f]) => wn(`$('${k}') in ${f}: no element with that id in index.html or in markup the scripts write (the Export pages carry a script of their own in 21-packs-data-io.js: those ids are theirs)`)); else ok(wanted.size + ' ids looked up, all present');

console.log('4. Build is repeatable');
const hash = f => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
try {
  const a = hash(path.join(root, 'index.html')); cp.execFileSync('python3', ['-I', path.join(root, 'build.py')], { cwd:root, stdio:'pipe' });
  const b = hash(path.join(root, 'index.html')); if (a === b) ok('build.py reproduces index.html exactly'); else wn('index.html changed when rebuilt: it was out of date (it is current now)');
} catch (e) { wn('could not run build.py: ' + String(e.message).slice(0, 80)); }

console.log('5. Network paths (nothing may send a media file or its name)');
const nets = []; for (const f of jsFiles) { const s = fs.readFileSync(src('js/' + f), 'utf8'); const n = (s.match(/\bfetch\(/g) || []).length; if (n) nets.push(f.replace('.js', '') + ' ×' + n); }
console.log('  info  fetch() appears in: ' + nets.join(', '));

console.log(`\n${fail ? 'FAILED' : 'passed'}: ${fail} failure(s), ${warn} warning(s)`);
process.exit(fail ? 1 : 0);
