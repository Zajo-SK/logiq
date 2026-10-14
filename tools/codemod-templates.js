// One-off codemod: S(skTemplate, enTemplate) / L2(...) with simple ${} expressions  ->  S(sk, en, "English with {0} {1}", [expr0, expr1])
// so that translated templates can be looked up at runtime. Idempotent (skips calls that already have 4 args).
// Usage: NODE_PATH=<acorn dir> node tools/codemod-templates.js
const fs = require('fs'), path = require('path'), acorn = require('acorn'), walk = require('acorn-walk');
const dir = path.join(__dirname, '..', 'js'); let total = 0;
fs.readdirSync(dir).filter(f => f.endsWith('.js')).forEach(f => {
  const p = path.join(dir, f), src = fs.readFileSync(p, 'utf8'); let ast; try { ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true }); } catch (e) { console.error('parse error', f); return; }
  const edits = [];
  walk.simple(ast, { CallExpression(n) {
    if (n.callee.type !== 'Identifier' || !['S', 'L2'].includes(n.callee.name) || n.arguments.length !== 2) return;
    const en = n.arguments[1]; if (en.type !== 'TemplateLiteral' || !en.expressions.length) return;
    const complex = en.expressions.some(e => { let c = false; walk.full(e, x => { if (x.type === 'ConditionalExpression' || x.type === 'TemplateLiteral' || (x.type === 'Literal' && typeof x.value === 'string')) c = true; }); return c; });
    if (complex) return;
    let tpl = ''; en.quasis.forEach((q, i) => { tpl += q.value.cooked; if (i < en.expressions.length) tpl += '{' + i + '}'; });
    const args = en.expressions.map(e => src.slice(e.start, e.end));
    edits.push({ at: en.end, text: ', ' + JSON.stringify(tpl) + ', [' + args.join(', ') + ']' });
  } });
  if (!edits.length) return; let out = src; edits.sort((a, b) => b.at - a.at).forEach(e => { out = out.slice(0, e.at) + e.text + out.slice(e.at); });
  fs.writeFileSync(p, out); total += edits.length; console.log(f, edits.length);
});
console.log('rewritten calls:', total);
