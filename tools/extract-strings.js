// Extracts every translatable string from the app into tools/i18n/source.json
// Usage: NODE_PATH=<dir with acorn> node tools/extract-strings.js
const fs = require('fs'), path = require('path'), vm = require('vm'), acorn = require('acorn'), walk = require('acorn-walk');
const root = path.join(__dirname, '..'), jsDir = path.join(root, 'js'), out = { ui: {}, s: [], dynamic: 0 };
// 1) UI dictionary (js/i18n.js)
const ctx = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(jsDir, 'i18n.js'), 'utf8').replace(/^'use strict';/, '') + ';this.I18N = I18N;', ctx);
Object.keys(ctx.I18N.sk).forEach(k => { out.ui[k] = { sk: ctx.I18N.sk[k], en: (ctx.I18N.en || {})[k] ?? ctx.I18N.sk[k] }; });
// 2) S(sk,en) and L2(sk,en) calls
const seen = new Map(), tpls = new Map();
const strOf = n => n.type === 'Literal' && typeof n.value === 'string' ? n.value : (n.type === 'TemplateLiteral' && n.expressions.length === 0 ? n.quasis[0].value.cooked : null);
fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).forEach(f => {
  const src = fs.readFileSync(path.join(jsDir, f), 'utf8'); let ast; try { ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true }); } catch (e) { console.error('parse error', f, e.message); return; }
  walk.simple(ast, { CallExpression(n) {
    if (n.callee.type !== 'Identifier' || !['S', 'L2'].includes(n.callee.name) || n.arguments.length < 2) return;
    if (n.arguments.length >= 3 && strOf(n.arguments[2]) != null) { const tp = strOf(n.arguments[2]); if (!tpls.has(tp)) tpls.set(tp, { en: tp, file: f }); return; }
    const sk = strOf(n.arguments[0]), en = strOf(n.arguments[1]);
    if (sk != null && en != null) { if (!seen.has(en)) { seen.set(en, { en, sk, file: f }); } } else out.dynamic++;
  } });
});
const hkey = str => { let x = 2166136261; for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(36); };
out.s = [...seen.values()].map(o => Object.assign({ id: hkey(o.en) }, o));
const ids = new Set(); out.s.forEach(o => { if (ids.has(o.id)) throw new Error('hash collision ' + o.id); ids.add(o.id); });
// dump readable batches for translators: tools/i18n/batches/NN.tsv (id<TAB>english)
const bd = path.join(__dirname, 'i18n', 'batches'); fs.mkdirSync(bd, { recursive: true });
const rows = Object.entries(out.ui).map(([k, v]) => 'ui:' + k + '\t' + v.en.replace(/\n/g, '\\n')).concat(out.s.map(o => o.id + '\t' + o.en.replace(/\n/g, '\\n')));
// Batches 00..(FROZEN-1) are frozen: translators work against them by line number, so they are never rewritten.
// Everything new (strings added later + templates with {0} {1} placeholders) goes to extra batches numbered after the frozen ones.
const frozenN = parseInt(fs.readFileSync(path.join(__dirname, 'i18n', 'FROZEN'), 'utf8'), 10) || 0, frozenIds = new Set();
for (let b = 0; b < frozenN; b++) { const f = path.join(bd, String(b).padStart(2, '0') + '.tsv'); if (fs.existsSync(f)) fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).forEach(l => frozenIds.add(l.split('\t')[0])); }
const trows = [...tpls.values()].map(o => hkey(o.en) + '\t' + o.en.replace(/\n/g, '\\n')); out.tpl = [...tpls.values()].map(o => ({ id: hkey(o.en), en: o.en, file: o.file }));
const delta = rows.filter(r => !frozenIds.has(r.split('\t')[0])).concat(trows.filter(r => !frozenIds.has(r.split('\t')[0])));
let nb = frozenN; for (let i = 0; i < delta.length; i += 200, nb++) fs.writeFileSync(path.join(bd, String(nb).padStart(2, '0') + '.tsv'), delta.slice(i, i + 200).join('\n') + '\n');
fs.readdirSync(bd).filter(f => f.endsWith('.tsv') && parseInt(f, 10) >= nb).forEach(f => fs.unlinkSync(path.join(bd, f)));
console.log('batches:', nb, '| frozen:', frozenN, '| delta strings:', delta.length, '| template strings:', tpls.size);
fs.mkdirSync(path.join(__dirname, 'i18n'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'i18n', 'source.json'), JSON.stringify(out, null, 1));
console.log('ui keys:', Object.keys(out.ui).length, '| static strings:', out.s.length, '| dynamic (template) strings:', out.dynamic);
