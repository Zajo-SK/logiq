// Builds a minified copy of the app into dist/ (JS minified + mangled, CSS minified, other files copied).
// Deploy dist/ instead of the repository root if you want to make copying harder. Requires: npm i terser  (NODE_PATH=<dir with terser>)
// Usage: NODE_PATH=<dir> node tools/build-dist.js
const fs = require('fs'), path = require('path'), { minify } = require('terser');
const root = path.join(__dirname, '..'), out = path.join(root, 'dist'); fs.rmSync(out, { recursive: true, force: true });
const SKIP = new Set(['.git', '.github', 'node_modules', 'dist', 'tools', 'server', 'docs', 'LICENSE', 'README.md', '.gitignore', '.claude']);
const banner = '/*! LogiQ © 2026 – all rights reserved. */\n';
async function copy(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    if (SKIP.has(f) && src === root) continue; const s = path.join(src, f), d = path.join(dst, f);
    if (fs.statSync(s).isDirectory()) { await copy(s, d); continue; }
    if (f.endsWith('.js') && !f.startsWith('sw')) { const code = fs.readFileSync(s, 'utf8'); const r = await minify(code, { compress: { passes: 2 }, mangle: { toplevel: false }, format: { comments: false, preamble: banner } }); if (r.error) throw r.error; fs.writeFileSync(d, r.code); }
    else if (f.endsWith('.css')) { fs.writeFileSync(d, fs.readFileSync(s, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*([{};:,>])\s*/g, '$1').replace(/\n+/g, '')); }
    else fs.copyFileSync(s, d);
  }
}
copy(root, out).then(() => { const size = d => { let n = 0; (function w(p) { for (const f of fs.readdirSync(p)) { const q = path.join(p, f); fs.statSync(q).isDirectory() ? w(q) : n += fs.statSync(q).size; } })(d); return n; }; console.log('dist built:', Math.round(size(out) / 1024), 'KB'); });
