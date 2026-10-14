'use strict';
/* LogiQ – two environments inspired by Hejný's method (tasks are our own):
   • Pavučiny (webs): circles joined by coloured arrows; every arrow adds the number of its colour.
   • Výstavisko (exhibition): a plan of rooms with doors; walk through every room exactly once.
   Needs: gen_logic.js (reg, both, lerp), tasktypes.js, util.js. */
CATS.webs = { icon: '🕸️', n: S('Pavučiny', 'Webs') };
CATS.expo = { icon: '🎪', n: S('Výstavisko', 'Exhibition') };

/* small shared digit pad used by the interactive types */
function digitPad(onKey) {
  return h('div', { class: 'keypad small' }, ['1', '2', '3', '⌫', '4', '5', '6', 'C', '7', '8', '9', '0'].map(k => h('button', { type: 'button', class: 'key', 'aria-label': k === '⌫' ? t('erase') : k, onclick: () => onKey(k) }, k)));
}
const editStr = (cur, k) => k === '⌫' ? cur.slice(0, -1) : k === 'C' ? '' : (cur.length < 3 ? cur + k : cur);

/* ======================================================= Pavučiny ======================================================= */
const WEB_COL = [{ c: '#d9382a', dot: '🔴', n: S('červená', 'red') }, { c: '#2563eb', dot: '🔵', n: S('modrá', 'blue') }, { c: '#12a05f', dot: '🟢', n: S('zelená', 'green') }];
function webBuild(r, cols, rows, diag, cut, steps, base) {
  const nodes = [], id = (c, rr) => rr * cols + c;
  for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) nodes.push({ id: id(c, rr), c, r: rr, v: base + c * steps[0] + rr * steps[1] });
  const gone = new Set();
  if (cut >= 1 && cols >= 3 && rows >= 2) gone.add(id(cols - 1, 0));
  if (cut >= 2 && cols >= 3 && rows >= 3) gone.add(id(0, rows - 1));
  const N = nodes.filter(n => !gone.has(n.id)), has = i => !gone.has(i), edges = [];
  for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) {
    const a = id(c, rr); if (!has(a)) continue;
    if (c + 1 < cols && has(id(c + 1, rr))) edges.push({ a, b: id(c + 1, rr), col: 0 });
    if (rr + 1 < rows && has(id(c, rr + 1))) edges.push({ a, b: id(c, rr + 1), col: 1 });
    if (diag && c + 1 < cols && rr + 1 < rows && has(id(c + 1, rr + 1))) edges.push({ a, b: id(c + 1, rr + 1), col: 2 });
  }
  return { nodes: N, edges, steps: diag ? [steps[0], steps[1], steps[0] + steps[1]] : steps.slice() };
}
/* all consistent solutions: hidden steps are unknown (1..maxStep), known = Set of node ids whose value is given */
function webSolve(W, shown, known, maxStep) {
  const hid = W.steps.map((_, i) => i).filter(i => !shown[i]), sols = [];
  const tryVec = vec => {
    const st = W.steps.map((s, i) => shown[i] ? s : vec[hid.indexOf(i)]), val = {}; W.nodes.forEach(n => { if (known.has(n.id)) val[n.id] = n.v; });
    let ch = true; while (ch) { ch = false; W.edges.forEach(e => { const s = st[e.col]; if (val[e.a] != null && val[e.b] == null) { val[e.b] = val[e.a] + s; ch = true; } else if (val[e.b] != null && val[e.a] == null) { val[e.a] = val[e.b] - s; ch = true; } }); }
    if (W.nodes.some(n => val[n.id] == null || val[n.id] < 0)) return;
    if (W.edges.some(e => val[e.b] - val[e.a] !== st[e.col])) return;
    sols.push({ st, val });
  };
  const rec = (k, vec) => { if (sols.length > 1) return; if (k === hid.length) return tryVec(vec); for (let s = 1; s <= maxStep; s++) rec(k + 1, vec.concat(s)); };
  rec(0, []); return sols;
}
function webPos(n) { return { x: 52 + n.c * 112 + n.r * 30, y: 40 + n.r * 92 }; }
function webHTML(W, o = {}) {
  const pos = {}; W.nodes.forEach(n => pos[n.id] = webPos(n)); const w = Math.max(...Object.values(pos).map(p => p.x)) + 52, hgt = Math.max(...Object.values(pos).map(p => p.y)) + 44;
  const mk = WEB_COL.map((c, i) => `<marker id="wa${i}${o.uid || ''}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c.c}"/></marker>`).join('');
  const es = W.edges.map((e, k) => { const a = pos[e.a], b = pos[e.b], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, R = 27, bad = o.badEdges && o.badEdges.has(k);
    return `<g><line x1="${(a.x + ux * R).toFixed(1)}" y1="${(a.y + uy * R).toFixed(1)}" x2="${(b.x - ux * (R + 3)).toFixed(1)}" y2="${(b.y - uy * (R + 3)).toFixed(1)}" stroke="${bad ? '#111' : WEB_COL[e.col].c}" stroke-width="${bad ? 3 : 5}" ${bad ? 'stroke-dasharray="4 4"' : ''} marker-end="url(#wa${e.col}${o.uid || ''})"/></g>`; }).join('');
  const ns = W.nodes.map(n => { const p = pos[n.id], lab = o.label ? o.label(n) : { text: '' }, cls = 'wn' + (lab.edit ? ' edit' : '') + (lab.sel ? ' sel' : '') + (lab.bad ? ' bad' : '') + (lab.x ? ' pink' : '');
    return `<g class="${cls}" data-id="${n.id}" ${lab.edit ? 'tabindex="0" role="button"' : ''}><circle cx="${p.x}" cy="${p.y}" r="26"/><text x="${p.x}" y="${p.y + 7}" text-anchor="middle">${lab.text}</text></g>`; }).join('');
  return `<svg class="websvg" viewBox="0 0 ${w} ${hgt}" role="img" aria-label="Pavučina"><defs>${mk}</defs>${es}${ns}</svg>`;
}
function webLegend(W, shown) {
  return `<div class="weblegend">${W.steps.map((s, i) => `<span class="wlg"><i style="background:${WEB_COL[i].c}"></i>${WEB_COL[i].dot} ${tx(WEB_COL[i].n)}: <b>${shown[i] ? '+' + s : '+?'}</b></span>`).join('')}</div>`;
}
function webMake(c, kind) {
  const { r, D, g } = c, small = D < .22;
  const dimsPool = D < .25 ? [[3, 1], [2, 2]] : D < .5 ? [[3, 2], [2, 3]] : D < .75 ? [[3, 3], [4, 2], [3, 2]] : [[4, 3], [3, 4], [4, 2]], [cols, rows] = pick(dimsPool, r);
  const diag = D > .4 && cols >= 2 && rows >= 2 && r() < .6, cut = D > .55 ? ri(r, 0, 2) : 0, mx = D < .25 ? 3 : D < .5 ? 5 : D < .75 ? 9 : 14;
  for (let attempt = 0; attempt < 60; attempt++) {
    const A = ri(r, 1, mx), B0 = ri(r, 1, mx), B = B0 === A ? (A === mx ? A - 1 || 2 : A + 1) : B0, base = ri(r, 0, small ? 6 : D < .6 ? 20 : 40), W = webBuild(r, cols, rows, diag, cut, [A, B], base), n = W.nodes.length;
    if (Math.max(...W.nodes.map(x => x.v)) > (small ? 22 : 150)) continue;
    const nCol = W.steps.length;
    if (kind === 'x') {
      if (nCol > 2 && r() < .5) continue; const anchor = pick(W.nodes, r), x0 = anchor.v; if (x0 < 1) continue;
      const S0 = W.nodes.reduce((a, q) => a + q.v, 0), offs = W.nodes.map(q => q.v - x0);
      return { W, shown: W.steps.map(() => true), kind, anchor: anchor.id, x: x0, sum: S0, offs: Object.fromEntries(W.nodes.map((q, i) => [q.id, offs[i]])) };
    }
    const hiddenN = kind === 'step' ? 1 : D < .35 ? 0 : D < .65 ? 1 : Math.min(2, nCol - 1), idxs = shuffle(range(nCol), r), hidden = new Set(idxs.slice(0, hiddenN)), shown = W.steps.map((_, i) => !hidden.has(i));
    const mHard = kind === 'step' ? 2 : D < .35 ? Math.max(2, n - 2) : D < .65 ? Math.ceil(n / 2) : 2;
    for (let t2 = 0; t2 < 80; t2++) {
      const m = Math.min(n - 1, Math.max(kind === 'step' ? 2 : 1, mHard + (t2 > 40 ? 1 : 0) + (t2 > 60 ? 1 : 0))), known = new Set(shuffle(W.nodes, r).slice(0, m).map(q => q.id));
      const sol = webSolve(W, shown, known, mx + 12); if (sol.length === 1 && n - known.size >= 1) { if (kind === 'step' && hiddenN !== 1) continue; return { W, shown, kind, known: [...known] }; }
    }
  }
  return null;
}
reg('webs', 'webs', 2, c => {
  const { r, D, k, g } = c, kind = D > .45 && g >= 5 && k % 3 === 2 ? 'x' : k % 3 === 1 ? 'step' : 'fill', P = webMake(c, kind) || webMake(c, 'fill'); if (!P) return null;
  const { W, shown } = P, uid = 'u' + ri(r, 100, 999);
  if (P.kind === 'x') {
    const lab = n => ({ text: n.id === P.anchor ? 'x' : 'x' + (P.offs[n.id] > 0 ? '+' + P.offs[n.id] : '−' + Math.abs(P.offs[n.id])), x: n.id === P.anchor });
    return { title: S('Pavučina s písmenom', 'Web with a letter'), type: 'number', pts: 15, prompt: S(`🕸️ Súčet všetkých čísel v kolieskach je ${P.sum}. Šípky pripočítavajú číslo svojej farby. Aké číslo je x?`, `🕸️ The sum of all numbers in the circles is ${P.sum}. Each arrow adds the number of its colour. What is x?`, "🕸️ The sum of all numbers in the circles is {0}. Each arrow adds the number of its colour. What is x?", [P.sum]),
      visual: () => '<div class="webbox">' + webHTML(W, { label: lab, uid }) + webLegend(W, shown) + '</div>', data: { answer: P.x },
      hints: [S('Vyjadri každé číslo pomocou x. Koliesko vedľa x je napríklad x + 2.', 'Write every number using x. The circle next to x is, say, x + 2.'), S(`Spočítaj, koľko je v súčte „x“ a koľko ostane iných čísel. Potom ${P.sum} − (ostatné) = počet x-ov krát x.`, `Count how many x there are in the sum and what is left over. Then ${P.sum} − (the rest) = (number of x) × x.`, "Count how many x there are in the sum and what is left over. Then {0} − (the rest) = (number of x) × x.", [P.sum])],
      explain: [S(`Čísla v kolieskach sú: ${W.nodes.map(n => lab(n).text).join(', ')}.`, `The numbers are: ${W.nodes.map(n => lab(n).text).join(', ')}.`), S(`Spolu je ${W.nodes.length} x-ov a zvyšok je ${P.sum - W.nodes.length * P.x}. Takže ${W.nodes.length}·x + ${P.sum - W.nodes.length * P.x} = ${P.sum}, a x = ${P.x}.`, `There are ${W.nodes.length} x’s and the rest is ${P.sum - W.nodes.length * P.x}. So ${W.nodes.length}·x + ${P.sum - W.nodes.length * P.x} = ${P.sum} and x = ${P.x}.`, "There are {0} x’s and the rest is {1}. So {2}·x + {3} = {4} and x = {5}.", [W.nodes.length, P.sum - W.nodes.length * P.x, W.nodes.length, P.sum - W.nodes.length * P.x, P.sum, P.x])] };
  }
  const known = new Set(P.known), hiddenCols = W.steps.map((_, i) => i).filter(i => !shown[i]);
  if (P.kind === 'step') {
    const col = hiddenCols[0], ans = W.steps[col];
    return { title: S('Koľko pripočíta šípka?', 'How much does the arrow add?'), type: 'number', pts: 15, prompt: both(l => l === 'sk' ? `🕸️ Šípky rovnakej farby pripočítavajú rovnaké číslo. Koľko pripočítava ${WEB_COL[col].dot} ${tx(WEB_COL[col].n)} šípka?` : `🕸️ Arrows of the same colour add the same number. How much does the ${WEB_COL[col].dot} ${tx(WEB_COL[col].n)} arrow add?`),
      visual: () => '<div class="webbox">' + webHTML(W, { label: n => ({ text: known.has(n.id) ? n.v : '?' }), uid }) + webLegend(W, shown) + '</div>', data: { answer: ans },
      hints: [S('Nájdi dve známe čísla spojené aspoň jednou šípkou tej farby. O koľko sa líšia?', 'Find two known numbers joined by arrows of that colour. By how much do they differ?'), S('Ak cesta vedie cez viac šípok, rozdiel rozdeľ medzi ne (a odpočítaj známe šípky inej farby).', 'If the path has several arrows, share the difference among them (after subtracting the arrows of other colours).')],
      explain: [S(`Hľadaná šípka pripočítava ${ans}. Všetky šípky tej farby majú rovnakú hodnotu – stačí ju nájsť na jednom mieste.`, `The arrow adds ${ans}. All arrows of that colour have the same value, so finding it in one place is enough.`, "The arrow adds {0}. All arrows of that colour have the same value, so finding it in one place is enough.", [ans])] };
  }
  const prompt = hiddenCols.length ? S('🕸️ Šípky rovnakej farby pripočítavajú rovnaké číslo (niektoré hodnoty nepoznáš). Doplň čísla do prázdnych kolieskov. Ťukni na koliesko a píš.', '🕸️ Arrows of the same colour add the same number (some values are unknown). Fill in the empty circles. Tap a circle and type.')
    : S('🕸️ Každá šípka pripočíta číslo svojej farby. Doplň čísla do prázdnych kolieskov. Ťukni na koliesko a píš.', '🕸️ Each arrow adds the number of its colour. Fill in the empty circles. Tap a circle and type.');
  const miss = W.nodes.filter(n => !known.has(n.id));
  return { title: S('Pavučina', 'Web'), type: 'web', pts: 15, prompt, data: { W, shown, known: P.known, uid },
    hints: [S('Nájdi šípku, ktorá spája dve známe čísla – o koľko sa líšia? Tak zistíš, čo pripočítava jej farba.', 'Find an arrow joining two known numbers – by how much do they differ? That tells you what its colour adds.'), S('Šípky rovnakej farby pripočítavajú vždy to isté. Pavučina „funguje“, ak každá šípka sedí.', 'Arrows of one colour always add the same. The web “works” if every arrow fits.')],
    explain: [S('Začni miestom, kde poznáš dve čísla spojené šípkou: ich rozdiel je hodnota farby. Potom dopočítavaj ďalej po šípkach (dopredu pripočítaj, dozadu odpočítaj).', 'Start where two known numbers are joined by an arrow: their difference is the value of that colour. Then continue along the arrows (add going forward, subtract going back).'), S(`Správne čísla: ${miss.map(n => n.v).join(', ')} (zľava zhora).`, `Correct numbers: ${miss.map(n => n.v).join(', ')} (left to right, top to bottom).`)] };
});
TaskTypes.web = {
  mount(box, task, ctx) {
    const d = task.data, W = d.W, known = new Set(d.known), D = ctx.session.data; if (!D.vals) D.vals = {}; let sel = null, bad = new Set(), badNodes = new Set();
    const wrap = h('div', { class: 'webwrap' }), legend = h('div', { html: webLegend(W, d.shown) });
    const valOf = n => known.has(n.id) ? n.v : (D.vals[n.id] !== undefined && D.vals[n.id] !== '' ? +D.vals[n.id] : null);
    function draw() {
      const be = new Set(); W.edges.forEach((e, k) => { const a = W.nodes.find(n => n.id === e.a), b = W.nodes.find(n => n.id === e.b), va = valOf(a), vb = valOf(b); if (va != null && vb != null && d.shown[e.col] && vb - va !== W.steps[e.col]) be.add(k); });
      wrap.innerHTML = webHTML(W, { badEdges: be, uid: d.uid, label: n => known.has(n.id) ? { text: n.v } : { text: D.vals[n.id] || (sel === n.id ? '▍' : '?'), edit: true, sel: sel === n.id, bad: badNodes.has(n.id) } });
      wrap.querySelectorAll('.wn.edit').forEach(g => { const pick2 = () => { sel = +g.dataset.id; badNodes.clear(); draw(); }; g.addEventListener('click', pick2); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') pick2(); }); });
    }
    const pad = digitPad(k => { if (sel == null) return ctx.nudge(S('Najprv ťukni na prázdne koliesko.', 'Tap an empty circle first.')); D.vals[sel] = editStr(D.vals[sel] || '', k); badNodes.clear(); draw(); });
    const onKey = e => { if (sel == null || /TEXTAREA|INPUT/.test(e.target.tagName)) return; if (/^[0-9]$/.test(e.key)) { D.vals[sel] = editStr(D.vals[sel] || '', e.key); draw(); } else if (e.key === 'Backspace') { D.vals[sel] = editStr(D.vals[sel] || '', '⌫'); draw(); } };
    document.addEventListener('keydown', onKey); ctx.cleanup(() => document.removeEventListener('keydown', onKey));
    box.append(wrap, legend, pad); draw();
    ctx.setCheck(() => {
      const miss = W.nodes.filter(n => !known.has(n.id)); if (miss.some(n => !D.vals[n.id])) return ctx.nudge(S('Doplň všetky prázdne koliesky.', 'Fill in all the empty circles.'));
      badNodes = new Set(miss.filter(n => +D.vals[n.id] !== n.v).map(n => n.id)); draw();
      if (!badNodes.size) return ctx.solved();
      ctx.wrong(S('Niečo nesedí. Čiarkované šípky ukazujú, kde sa čísla nezhodujú s farbou šípky.', 'Something does not fit. Dashed arrows show where the numbers disagree with the arrow colour.'));
    });
    return { dynHint(idx) {
      const miss = W.nodes.filter(n => !known.has(n.id) && +D.vals[n.id] !== n.v); if (!miss.length) return null;
      const n0 = miss.find(n => W.edges.some(e => (e.a === n.id || e.b === n.id) && [e.a, e.b].some(o => o !== n.id && (known.has(o) || +D.vals[o] === W.nodes.find(q => q.id === o).v)) && d.shown[e.col])) || miss[0];
      return idx <= 1 ? { text: S('Skús najprv koliesko, ktoré susedí s už známym číslom a šípkou, ktorej hodnotu poznáš.', 'Try first a circle next to a known number along an arrow whose value you know.'), hl: () => { sel = n0.id; draw(); } } : { text: S(`Do označeného kolieska patrí ${n0.v}.`, `The marked circle should be ${n0.v}.`, "The marked circle should be {0}.", [n0.v]), hl: () => { sel = n0.id; D.vals[n0.id] = String(n0.v); draw(); } };
    } };
  },
  answerText: task => task.data.W.nodes.filter(n => !task.data.known.includes(n.id)).map(n => n.v).join(', ')
};

/* ======================================================= Výstavisko ======================================================= */
const edgeKey = (a, b) => a < b ? a + '-' + b : b + '-' + a;
function expoNbrs(R, C, i) { const r = Math.floor(i / C), c = i % C, o = []; if (r > 0) o.push(i - C); if (c > 0) o.push(i - 1); if (c < C - 1) o.push(i + 1); if (r < R - 1) o.push(i + C); return o; }
const expoBorder = (R, C, i) => { const r = Math.floor(i / C), c = i % C; return r === 0 || c === 0 || r === R - 1 || c === C - 1; };
function expoPath(R, C, rnd, wantEnd) {
  const total = R * C; let budget = 30000;
  const border = range(total).filter(i => expoBorder(R, C, i));
  for (let att = 0; att < 40; att++) {
    const s = pick(border, rnd), seen = new Set([s]), path = [s];
    const dfs = () => { if (--budget < 0) return false; if (path.length === total) return !wantEnd || expoBorder(R, C, path[path.length - 1]); const cur = path[path.length - 1];
      for (const nb of shuffle(expoNbrs(R, C, cur), rnd)) { if (seen.has(nb)) continue; seen.add(nb); path.push(nb); if (dfs()) return true; path.pop(); seen.delete(nb); } return false; };
    if (dfs()) return path.slice(); budget = 30000;
  }
  return null;
}
/* count Hamiltonian paths s→t (t null = any end) using the doors; fixed = {cell: number} constraints (1-based visit order); cap */
function expoCount(R, C, doors, s, t, fixed, cap) {
  const total = R * C, seen = new Set([s]), byNum = {}; Object.entries(fixed || {}).forEach(([cell, num]) => byNum[num] = +cell); let n = 0, steps = 0;
  const ok = (cell, k) => (fixed == null || ((fixed[cell] == null || fixed[cell] === k) && (byNum[k] == null || byNum[k] === cell)));
  if (!ok(s, 1)) return 0;
  const dfs = (cur, k) => { if (n >= cap || ++steps > 400000) return; if (k === total) { if (t == null || cur === t) n++; return; }
    for (const nb of expoNbrs(R, C, cur)) { if (seen.has(nb) || !doors.has(edgeKey(cur, nb)) || !ok(nb, k + 1)) continue; seen.add(nb); dfs(nb, k + 1); seen.delete(nb); } };
  dfs(s, 1); return n;
}
function expoBuild(R, C, rnd, extra, wantEnd) {
  const path = expoPath(R, C, rnd, wantEnd); if (!path) return null; const doors = new Set(); path.forEach((p, i) => { if (i) doors.add(edgeKey(path[i - 1], p)); });
  const all = []; for (let i = 0; i < R * C; i++) expoNbrs(R, C, i).forEach(j => { if (j > i && !doors.has(edgeKey(i, j))) all.push([i, j]); });
  shuffle(all, rnd).slice(0, extra).forEach(([a, b]) => doors.add(edgeKey(a, b)));
  return { R, C, path, doors, s: path[0], t: path[path.length - 1] };
}
function expoHTML(E, o = {}) {
  const { R, C } = E, sideOf = i => { const r = Math.floor(i / C), c = i % C; return r === 0 ? 't' : c === C - 1 ? 'r' : r === R - 1 ? 'b' : 'l'; };
  const cells = range(R * C).map(i => { const r = Math.floor(i / C), c = i % C, b = [];
    const wall = (j, side) => { const edge = j == null ? !(o.inSide && (i === E.s && side === o.inSide(i) || (o.showExit && i === E.t && side === o.exitSide(i)))) : !E.doors.has(edgeKey(i, j)); if (edge) b.push('x' + side); };
    wall(r > 0 ? i - C : null, 't'); wall(c < C - 1 ? i + 1 : null, 'r'); wall(r < R - 1 ? i + C : null, 'b'); wall(c > 0 ? i - 1 : null, 'l');
    const lab = o.label ? o.label(i) : { text: '' }, ic = i === E.s ? '<em class="gate">🚪</em>' : (o.showExit && i === E.t ? '<em class="gate">🏁</em>' : '');
    return `<div class="xrm ${b.join(' ')}${lab.cls ? ' ' + lab.cls : ''}" data-i="${i}" ${lab.edit || lab.btn ? 'tabindex="0" role="button"' : ''}>${ic}<span>${lab.text}</span></div>`; }).join('');
  return `<div class="expo" style="--c:${C}" role="img" aria-label="Výstavisko">${cells}</div>`;
}
function expoSides(E) { const { R, C } = E, f = i => { const r = Math.floor(i / C), c = i % C; return r === 0 ? 't' : c === C - 1 ? 'r' : r === R - 1 ? 'b' : 'l'; }; return { inSide: f, exitSide: f }; }
function expoSize(r, D, kind) {
  const pool = kind === 'count' ? (D < .5 ? [[2, 3], [3, 3]] : [[3, 3], [3, 4], [4, 4]]) : D < .3 ? [[2, 3], [3, 3]] : D < .6 ? [[3, 3], [3, 4]] : D < .85 ? [[4, 4], [3, 5], [4, 3]] : [[4, 5], [5, 4], [4, 4]]; return pick(pool, r);
}
reg('expo', 'expo', 2, c => {
  const { r, D, k } = c, kind = k % 3 === 0 ? 'walk' : k % 3 === 1 ? 'fill' : 'count';
  for (let att = 0; att < 50; att++) {
    const [R, C] = expoSize(r, D, kind);
    if (kind === 'count') {
      const E = expoBuild(R, C, r, ri(r, 2, 3 + Math.floor(D * 4)), true); if (!E) continue; const n = expoCount(R, C, E.doors, E.s, E.t, null, 30); if (n < 2 || n > 12) continue;
      const sd = expoSides(E);
      return { title: S('Koľko ciest cez výstavisko?', 'How many routes?'), type: 'number', pts: 20, prompt: S('🎪 Z 🚪 vchodu do 🏁 východu prejdeš výstaviskom tak, že každou miestnosťou prejdeš práve raz. Medzi miestnosťami vedú len otvorené dvere. Koľkými spôsobmi to ide?', '🎪 From the 🚪 entrance to the 🏁 exit you walk so that you pass every room exactly once. You can only use the open doors. In how many ways can it be done?'),
        visual: () => expoHTML(E, { inSide: sd.inSide, exitSide: sd.exitSide, showExit: true }), data: { answer: n },
        hints: [S('Začni od vchodu a skús všetky možnosti ťahu po ťahu. Kde sa cesta rozdeľuje?', 'Start at the entrance and try the options step by step. Where does the route split?'), S('Zapisuj si cesty ako poradie miestností. Slepé uličky ti ukážu, ktoré cesty nefungujú.', 'Write the routes as a sequence of rooms. Dead ends show which routes fail.')],
        explain: [S(`Všetkých úplných ciest je ${n}. Pri každej rozvetvenej miestnosti vyskúšaš obe možnosti a vyškrtneš tie, ktoré skončia v slepej uličke alebo nenavštívia všetky miestnosti.`, `There are ${n} complete routes. At every fork try both options and cross out those that end in a dead end or miss a room.`, "There are {0} complete routes. At every fork try both options and cross out those that end in a dead end or miss a room.", [n])] };
    }
    const E = expoBuild(R, C, r, D < .3 ? 0 : ri(r, 1, 2 + Math.floor(D * 3)), kind === 'fill' || D > .4); if (!E) continue; const sd = expoSides(E), N = R * C;
    if (kind === 'walk') {
      const needExit = D > .4;
      return { title: S('Prejdi výstavisko', 'Walk through the exhibition'), type: 'expo', pts: 15, prompt: needExit ? S('🎪 Vojdi cez 🚪 vchod a prejdi každou miestnosťou práve raz, až skončíš pri 🏁 východe. Ťukaj na susedné miestnosti cez otvorené dvere.', '🎪 Enter through the 🚪 and walk through every room exactly once, ending at the 🏁 exit. Tap the neighbouring rooms through open doors.') : S('🎪 Vojdi cez 🚪 vchod a prejdi každou miestnosťou práve raz. Ťukaj na susedné miestnosti cez otvorené dvere.', '🎪 Enter through the 🚪 and walk through every room exactly once. Tap the neighbouring rooms through open doors.'),
        data: { mode: 'walk', R, C, doors: [...E.doors], s: E.s, t: E.t, needExit, sol: E.path },
        hints: [S('Ak si uviazol v slepej uličke, vráť sa tlačidlom Späť a skús inú cestu.', 'If you are stuck in a dead end, go back with the Back button and try another way.'), S('Miestnosť s jedinými dverami musí byť začiatok alebo koniec cesty. Choď tam, kde by si sa inak nemohol vrátiť, ako posledný.', 'A room with a single door must be the start or the end of the route. Leave such rooms for last.')],
        explain: [S('Pozri sa na miestnosti s jediným východom (slepé uličky). Do nich môžeš vojsť len na konci cesty, preto ich nechaj na koniec.', 'Look at rooms with only one exit (dead ends). You can only enter them at the end of the route, so leave them for last.')] };
    }
    // fill
    const fixed = { [E.s]: 1, [E.t]: N }, num = {}; E.path.forEach((p, i) => num[p] = i + 1);
    let guard = 0; const order = shuffle(range(N).filter(i => i !== E.s && i !== E.t), r), extraShown = Math.max(1, Math.round(N * (D < .35 ? .5 : D < .65 ? .3 : .15)));
    order.slice(0, extraShown).forEach(i => fixed[i] = num[i]);
    let cnt = expoCount(R, C, E.doors, E.s, E.t, fixed, 2); for (const i of order.slice(extraShown)) { if (cnt === 1 || guard++ > 40) break; fixed[i] = num[i]; cnt = expoCount(R, C, E.doors, E.s, E.t, fixed, 2); }
    if (cnt !== 1) continue; const hid = range(N).filter(i => fixed[i] == null); if (!hid.length) continue;
    return { title: S('Doplň čísla v miestnostiach', 'Fill in the room numbers'), type: 'expo', pts: 20, prompt: S('🎪 Návštevník prešiel výstaviskom od 🚪 vchodu po 🏁 východ a v každej miestnosti bol práve raz. Miestnosti číslujeme v poradí návštevy 1, 2, 3, … Doplň chýbajúce čísla. Ťukni na prázdnu miestnosť a píš.', '🎪 A visitor walked from the 🚪 entrance to the 🏁 exit and was in every room exactly once. Rooms are numbered in the order of the visit 1, 2, 3, … Fill in the missing numbers. Tap an empty room and type.'),
      data: { mode: 'fill', R, C, doors: [...E.doors], s: E.s, t: E.t, fixed, num },
      hints: [S('Pozeraj sa na susedov: číslo n+1 je vždy v susednej miestnosti cez otvorené dvere.', 'Look at the neighbours: number n+1 is always in a neighbouring room through an open door.'), S('Miestnosť s jedinými dverami je koniec alebo začiatok cesty. Skús aj odzadu: od východu.', 'A room with a single door is the end or the start. Try going backwards from the exit.')],
      explain: [S('Číslo n+1 je vždy v miestnosti hneď vedľa miestnosti s číslom n, cez otvorené dvere. Postupuj od známych čísel a vylučuj slepé cesty.', 'Number n+1 is always next to number n through an open door. Work from the known numbers and rule out dead ends.'), S(`Správne poradie (po riadkoch): ${range(N).map(i => num[i]).join(', ')}.`, `The correct numbers (row by row): ${range(N).map(i => num[i]).join(', ')}.`)] };
  }
  return null;
});
TaskTypes.expo = {
  mount(box, task, ctx) {
    const d = task.data, E = { R: d.R, C: d.C, doors: new Set(d.doors), s: d.s, t: d.t }, sd = expoSides(E), D = ctx.session.data, wrap = h('div', { class: 'expowrap' }), info = h('p', { class: 'ferry-info', role: 'status' }); let hl = null;
    if (d.mode === 'walk') {
      if (!D.path) D.path = [d.s];
      const done = () => D.path.length === E.R * E.C && (!d.needExit || D.path[D.path.length - 1] === d.t);
      function draw() {
        const vis = new Map(D.path.map((p, i) => [p, i + 1])), last = D.path[D.path.length - 1];
        wrap.innerHTML = expoHTML(E, { inSide: sd.inSide, exitSide: sd.exitSide, showExit: d.needExit, label: i => ({ text: vis.get(i) || '', btn: true, cls: (vis.has(i) ? 'x-seen' : '') + (i === last ? ' x-cur' : '') + (hl === i ? ' x-hint' : '') }) });
        wrap.querySelectorAll('.xrm').forEach(el => { const i = +el.dataset.i, go2 = () => step(i); el.addEventListener('click', go2); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') go2(); }); });
        info.textContent = `${t('moves')}: ${D.path.length - 1} / ${E.R * E.C - 1}`;
      }
      function step(i) { hl = null; const last = D.path[D.path.length - 1];
        if (D.path.length > 1 && i === D.path[D.path.length - 2]) { D.path.pop(); return draw(); }
        if (i === last || D.path.includes(i)) return ctx.nudge(S('Do tejto miestnosti si už vošiel. Každá sa smie len raz.', 'You have been in this room. Each can be used once only.'));
        if (!E.doors.has(edgeKey(last, i))) return ctx.nudge(S('Tadiaľ nevedú dvere. Ťukni na susednú miestnosť s otvoreným prechodom.', 'There is no door that way. Tap a neighbouring room with an open passage.'));
        D.path.push(i); draw(); if (done()) setTimeout(() => ctx.solved(), 350); else if (D.path.length === E.R * E.C) ctx.nudge(S('Prešiel si všetky, ale nie si pri východe. Skús inú cestu.', 'You visited all rooms but you are not at the exit. Try another route.')); }
      box.append(wrap, info, h('div', { class: 'btnrow left' }, h('button', { type: 'button', class: 'btn ghost small', onclick: () => { if (D.path.length > 1) { D.path.pop(); hl = null; draw(); } } }, '↩ ' + L2('Späť', 'Back')), h('button', { type: 'button', class: 'btn ghost small', onclick: () => { D.path = [d.s]; hl = null; draw(); } }, t('restart'))));
      draw(); ctx.setCheck(null);
      return { dynHint(idx) {
        const sol = (function find() { const total = E.R * E.C, seen = new Set(D.path), p = D.path.slice(); const dfs = () => { if (p.length === total) return !d.needExit || p[p.length - 1] === d.t; const cur = p[p.length - 1]; for (const nb of expoNbrs(E.R, E.C, cur)) { if (seen.has(nb) || !E.doors.has(edgeKey(cur, nb))) continue; seen.add(nb); p.push(nb); if (dfs()) return true; p.pop(); seen.delete(nb); } return false; }; return dfs() ? p : null; })();
        if (!sol) return { text: S('Z tejto pozície sa už všetky miestnosti prejsť nedajú. Vráť sa o pár krokov späť (↩ Späť).', 'From here you cannot visit all rooms any more. Go back a few steps (↩ Back).') };
        const nxt = sol[D.path.length]; if (nxt == null) return null;
        return idx <= 1 ? { text: S('Skontroluj, či nenechávaš za sebou miestnosť, do ktorej sa už nedá vrátiť (slepú uličku).', 'Check that you do not leave behind a room you can no longer reach (a dead end).') } : { text: S('Pokračuj do označenej miestnosti.', 'Continue to the marked room.'), hl: () => { hl = nxt; draw(); } };
      } };
    }
    // fill mode
    if (!D.vals) D.vals = {}; let sel = null, bad = new Set(); const N = E.R * E.C;
    function draw2() {
      wrap.innerHTML = expoHTML(E, { inSide: sd.inSide, exitSide: sd.exitSide, showExit: true, label: i => d.fixed[i] != null ? { text: d.fixed[i], cls: 'x-given' } : { text: D.vals[i] || (sel === i ? '▍' : ''), edit: true, cls: 'x-blank' + (sel === i ? ' x-sel' : '') + (bad.has(i) ? ' x-bad' : '') } });
      wrap.querySelectorAll('.xrm[role=button]').forEach(el => { const i = +el.dataset.i, p = () => { sel = i; bad.clear(); draw2(); }; el.addEventListener('click', p); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') p(); }); });
    }
    const pad = digitPad(k => { if (sel == null) return ctx.nudge(S('Najprv ťukni na prázdnu miestnosť.', 'Tap an empty room first.')); D.vals[sel] = editStr(D.vals[sel] || '', k); bad.clear(); draw2(); });
    const onKey = e => { if (sel == null || /TEXTAREA|INPUT/.test(e.target.tagName)) return; if (/^[0-9]$/.test(e.key)) { D.vals[sel] = editStr(D.vals[sel] || '', e.key); draw2(); } else if (e.key === 'Backspace') { D.vals[sel] = editStr(D.vals[sel] || '', '⌫'); draw2(); } };
    document.addEventListener('keydown', onKey); ctx.cleanup(() => document.removeEventListener('keydown', onKey));
    box.append(wrap, pad); draw2();
    ctx.setCheck(() => {
      const hid = range(N).filter(i => d.fixed[i] == null); if (hid.some(i => !D.vals[i])) return ctx.nudge(S('Doplň všetky prázdne miestnosti.', 'Fill in all the empty rooms.'));
      bad = new Set(hid.filter(i => +D.vals[i] !== d.num[i])); draw2(); if (!bad.size) return ctx.solved();
      ctx.wrong(S('Niektoré čísla nesedia. Pamätaj: číslo n+1 je vždy v susednej miestnosti cez otvorené dvere.', 'Some numbers do not fit. Remember: n+1 is always in a neighbouring room through an open door.'));
    });
    return { dynHint(idx) { const hid = range(N).filter(i => d.fixed[i] == null && +D.vals[i] !== d.num[i]); if (!hid.length) return null; const i0 = hid[0]; return idx <= 1 ? { text: S('Skús miestnosť, ktorá susedí s už známym číslom: hľadáš nasledujúce číslo.', 'Try a room next to a known number: you are looking for the next number.'), hl: () => { sel = i0; draw2(); } } : { text: S(`Do označenej miestnosti patrí ${d.num[i0]}.`, `The marked room should be ${d.num[i0]}.`, "The marked room should be {0}.", [d.num[i0]]), hl: () => { sel = i0; D.vals[i0] = String(d.num[i0]); draw2(); } }; } };
  },
  answerText: task => task.data.mode === 'fill' ? Object.keys(task.data.num).map(i => task.data.num[i]).join(', ') : ''
};
