// Builds js/lang/<code>.js from translation parts: tools/i18n/tr/<code>/NN.tsv  (lines "N<TAB>translation", N = line number in batches/NN.tsv, starting at 1)
// Usage: node tools/i18n/build-lang.js [code ...]
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..', '..'), bdir = path.join(__dirname, 'batches'), tdir = path.join(__dirname, 'tr'), out = path.join(root, 'js', 'lang');
fs.mkdirSync(out, { recursive: true });
const batches = fs.readdirSync(bdir).filter(f => f.endsWith('.tsv')).sort().map(f => ({ name: f, rows: fs.readFileSync(path.join(bdir, f), 'utf8').split('\n').filter(Boolean).map(l => l.split('\t')) }));
const ph = s => (s.match(/\{[a-zA-Z0-9_]+\}/g) || []).sort().join(',');
const langs = process.argv.slice(2).length ? process.argv.slice(2) : fs.existsSync(tdir) ? fs.readdirSync(tdir).filter(d => fs.statSync(path.join(tdir, d)).isDirectory()) : [];
langs.forEach(code => {
  const ui = {}, s = {}; let n = 0, warn = 0, total = 0; batches.forEach(b => total += b.rows.length);
  batches.forEach(b => {
    const f = path.join(tdir, code, b.name); if (!fs.existsSync(f)) return;
    fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).forEach(line => {
      const i = line.indexOf('\t'); if (i < 0) return; const num = parseInt(line.slice(0, i), 10), text = line.slice(i + 1).replace(/\\n/g, '\n'), row = b.rows[num - 1]; if (!row) { warn++; return; }
      const [key, en] = row; if (ph(en.replace(/\\n/g, '\n')) !== ph(text)) { warn++; console.warn(`[${code}] placeholder mismatch ${b.name}#${num}: ${en} -> ${text}`); return; }
      if (key.startsWith('ui:')) ui[key.slice(3)] = text; else s[key] = text; n++;
    });
  });
  fs.writeFileSync(path.join(out, code + '.js'), `registerLang(${JSON.stringify(code)}, ${JSON.stringify({ ui, s })});\n`);
  console.log(`${code}: ${n}/${total} strings, ${warn} warnings`);
});
