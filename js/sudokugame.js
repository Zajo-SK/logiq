'use strict';
/* LogiQ – stand-alone Sudoku module: 3×3 (Latin square), 4×4, 6×6 (2×3 boxes) and 9×9; three levels, notes, hints, undo, timer, saved game, best times. */
const SDK_LEVELS = [0, 1, 2, 3, 4, 5];
const sdkLevelName = l => [L2('1 · Začiatočník', '1 · Beginner'), L2('2 · Ľahká', '2 · Easy'), L2('3 · Stredná', '3 · Medium'), L2('4 · Ťažká', '4 · Hard'), L2('5 · Expert', '5 · Expert'), L2('6 · Majster', '6 · Master')][l];
const sdkLevelDesc = (n, l) => n === 9 ? [L2('Stačí technika „jediný kandidát“, veľa zadaných čísel.', 'Only “naked singles” needed, many givens.'), L2('Treba aj „skrytého jediného“ v riadku, stĺpci či boxe.', 'You also need “hidden singles” in a row, column or box.'), L2('Rovnaké techniky, ale oveľa menej zadaných čísel.', 'Same techniques but far fewer givens.'), L2('Vyžaduje uzamknuté kandidáty alebo skryté/odkryté dvojice.', 'Needs locked candidates or naked pairs.'), L2('Vyžaduje skryté dvojice alebo odkryté trojice.', 'Needs hidden pairs or naked triples.'), L2('Pokročilé techniky (X-Wing a ťažšie) – pre majstrov.', 'Advanced techniques (X-Wing and beyond) – for masters.')][l]
  : n === 6 ? [L2('Veľa zadaných čísel (23).', 'Many givens (23).'), L2('Menej zadaných čísel (19).', 'Fewer givens (19).'), L2('Len 12 zadaných čísel, potrebuješ skrytých jediných.', 'Only 12 givens; hidden singles needed.'), L2('Iba asi 11 zadaných čísel.', 'About 11 givens only.'), L2('Iba asi 10 zadaných čísel.', 'About 10 givens only.'), L2('Najmenší možný počet zadaných čísel (9).', 'Smallest possible number of givens (9).')][l]
    : L2('Počet zadaných čísel sa s úrovňou zmenšuje.', 'The number of givens shrinks with the level.');
const sdkSizeName = n => n === 3 ? '3×3' : n === 4 ? '4×4' : n === 6 ? '6×6 (2×3)' : '9×9 (3×3)';
const fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const TECH_NAME = () => [L2('Jediný kandidát', 'Naked single'), L2('Skrytý jediný', 'Hidden single'), L2('Uzamknuté kandidáty', 'Locked candidates'), L2('Odkrytá dvojica', 'Naked pair'), L2('Skrytá dvojica', 'Hidden pair'), L2('Odkrytá trojica', 'Naked triple'), L2('X-Wing', 'X-Wing')];
const unitText = (n, ui) => { const u = SudokuEngine.unitName(n, ui); return u.kind === 'row' ? L2(`${u.k}. riadku`, `row ${u.k}`) : u.kind === 'col' ? L2(`${u.k}. stĺpci`, `column ${u.k}`) : L2(`${u.k}. boxe`, `box ${u.k}`); };
function sdkPuzzle(n, level, seed) {
  const bank = typeof SDK_BANK !== 'undefined' && SDK_BANK[n] && SDK_BANK[n][level];
  const r = rng(seed);
  if (!bank || !bank.length) { const P = genSudoku(n, Math.round(n * n * (.3 + level * .07)), seed); return P; }
  const str = bank[Math.floor(r() * bank.length)], flat = SudokuEngine.transform(str, n, r), sol = SudokuEngine.countSolutions(flat, n, 2).sol, [br, bc] = SudokuEngine.dims(n);
  const to2 = a => range(n).map(i => a.slice(i * n, i * n + n));
  return { n, br, bc, given: to2(flat), sol: to2(sol) };
}
let sdkSel = { n: 6, level: 1 };

VIEWS.sudoku = (v) => {
  const games = st().games = st().games || {}; games.hanoi = games.hanoi || {}; games.sudoku = games.sudoku || { best: {}, cur: null };
  const S0 = games.sudoku;
  const mk = (n, level, seed) => ({ n, level, seed: seed || Math.floor(Math.random() * 1e9), cur: null, notes: {}, elapsed: 0, hints: 0 });
  if (S0.cur && typeof S0.cur.level !== 'number') S0.cur = null;
  let G = S0.cur && S0.cur.n === sdkSel.n && S0.cur.level === sdkSel.level ? S0.cur : mk(sdkSel.n, sdkSel.level);
  S0.cur = G;
  const P = sdkPuzzle(G.n, G.level, G.seed), { n, br, bc } = P;
  if (!G.cur) G.cur = P.given.map(r => r.slice());
  const cur = G.cur, notes = G.notes, undo = []; let sel = null, noteMode = false, hl = null, flash = new Set(), won = false, last = Date.now();
  const save = () => Store.save();
  const key = (r, c) => r * n + c;

  const timeEl = h('b', { class: 'sdk-time', role: 'timer' }, fmtTime(G.elapsed));
  const tick = setInterval(() => { const now = Date.now(); if (!won && document.visibilityState === 'visible') { G.elapsed += Math.round((now - last) / 1000); timeEl.textContent = fmtTime(G.elapsed); if (G.elapsed % 5 === 0) save(); } last = now; }, 1000);
  cleanups.push(() => { clearInterval(tick); save(); });

  const grid = h('div', { class: 'sudoku n' + n, style: `--n:${n}`, role: 'grid', 'aria-label': 'Sudoku ' + sdkSizeName(n) }), cells = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const cl = ['sc']; if (c % bc === bc - 1 && c < n - 1) cl.push('br'); if (br > 1 && r % br === br - 1 && r < n - 1) cl.push('bb');
    const b = h('button', { type: 'button', class: cl.join(' '), role: 'gridcell', 'aria-label': `${L2('riadok', 'row')} ${r + 1}, ${L2('stĺpec', 'column')} ${c + 1}`, onclick: () => { sel = [r, c]; draw(); } });
    cells.push(b); grid.append(b);
  }
  const conflicts = () => {
    const bad = new Set(), mark = list => { const seen = {}; list.forEach(([r, c]) => { const x = cur[r][c]; if (x) (seen[x] = seen[x] || []).push([r, c]); }); Object.values(seen).forEach(a => { if (a.length > 1) a.forEach(([r, c]) => bad.add(key(r, c))); }); };
    for (let i = 0; i < n; i++) { mark(range(n).map(j => [i, j])); mark(range(n).map(j => [j, i])); }
    if (br > 1) for (let r0 = 0; r0 < n; r0 += br) for (let c0 = 0; c0 < n; c0 += bc) { const l = []; for (let i = 0; i < br; i++) for (let j = 0; j < bc; j++) l.push([r0 + i, c0 + j]); mark(l); }
    return bad;
  };
  const left = d => { let k = 0; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (cur[r][c] === d) k++; return n - k; };
  function draw() {
    const bad = conflicts(), nc = Math.ceil(Math.sqrt(n));
    cells.forEach((b, i) => {
      const r = Math.floor(i / n), c = i % n, val = cur[r][c], given = !!P.given[r][c], nt = notes[i];
      b.classList.toggle('given', given); b.classList.toggle('selc', !!sel && sel[0] === r && sel[1] === c);
      b.classList.toggle('rel', !!sel && (sel[0] === r || sel[1] === c || (br > 1 && Math.floor(sel[0] / br) === Math.floor(r / br) && Math.floor(sel[1] / bc) === Math.floor(c / bc))));
      b.classList.toggle('same', !!sel && !!val && cur[sel[0]][sel[1]] === val); b.classList.toggle('bad', bad.has(i) || flash.has(i)); b.classList.toggle('hint', !!hl && hl.has(i));
      b.replaceChildren(...(val ? [document.createTextNode(String(val))] : nt && nt.length ? [h('span', { class: 'nt', style: `--nc:${nc}` }, range(n).map(d => h('i', null, nt.includes(d + 1) ? d + 1 : '')))] : []));
    });
    pad.querySelectorAll('.key[data-d]').forEach(k => { const d = +k.dataset.d, l = left(d); k.disabled = l <= 0; k.querySelector('small').textContent = l > 0 ? l : '✓'; });
    noteBtn.classList.toggle('on', noteMode); noteBtn.setAttribute('aria-pressed', noteMode);
    stat.textContent = `${L2('Nápovedy', 'Hints')}: ${G.hints}`;
  }
  function place(d) {
    if (!sel) return toast(L2('Najprv ťukni na prázdne políčko.', 'Tap an empty cell first.'));
    const [r, c] = sel; if (P.given[r][c]) return; const i = key(r, c);
    undo.push({ i, r, c, val: cur[r][c], nt: (notes[i] || []).slice() }); hl = null;
    if (d === 0) { cur[r][c] = 0; delete notes[i]; }
    else if (noteMode) { if (cur[r][c]) return; const nt = notes[i] = notes[i] || []; const x = nt.indexOf(d); x >= 0 ? nt.splice(x, 1) : nt.push(d); }
    else { cur[r][c] = d; delete notes[i]; for (let k = 0; k < n; k++) { [key(r, k), key(k, c)].forEach(j => { if (notes[j]) notes[j] = notes[j].filter(x => x !== d); }); } if (br > 1) { const r0 = r - r % br, c0 = c - c % bc; for (let a = 0; a < br; a++) for (let b2 = 0; b2 < bc; b2++) { const j = key(r0 + a, c0 + b2); if (notes[j]) notes[j] = notes[j].filter(x => x !== d); } } }
    save(); draw(); checkWin();
  }
  function checkWin() {
    if (won || cur.some(r => r.some(x => !x))) return;
    if (conflicts().size) return toast(L2('Niektoré čísla sa opakujú – pozri políčka označené „!“.', 'Some numbers repeat – look at the cells marked “!”.'));
    won = true; S0.cur = null; const bk = `${n}-${G.level}`, prev = S0.best[bk], isBest = !prev || G.elapsed < prev; if (isBest) S0.best[bk] = G.elapsed; save(); tone(SND.ok); confetti();
    const sh = openSheet(h('div', { class: 'sheetin result' }, h('div', { class: 'burst', 'aria-hidden': 'true' }, '🧩'), h('h2', null, L2('Sudoku vyriešené!', 'Sudoku solved!')),
      h('p', { class: 'pts' }, `⏱ ${fmtTime(G.elapsed)}`), h('p', { class: 'muted' }, `${sdkSizeName(n)} · ${sdkLevelName(G.level)} · ${L2('nápovedy', 'hints')}: ${G.hints}`), isBest ? h('p', { class: 'bonusline' }, '🏅 ' + L2('Nový osobný rekord!', 'New personal best!')) : h('p', { class: 'muted' }, `${L2('Tvoj rekord', 'Your best')}: ${fmtTime(prev)}`),
      h('div', { class: 'btnrow' }, btn(L2('Zavrieť', 'Close'), 'ghost', () => sh.close()), btn(L2('Nová hra', 'New game') + ' ▸', 'primary', () => { sh.close(); S0.cur = null; render(); }))), { cls: 'center' });
  }
  const move = (dr, dc) => { sel = sel ? [(sel[0] + dr + n) % n, (sel[1] + dc + n) % n] : [0, 0]; draw(); };
  const onKey = e => { if (e.target.tagName === 'INPUT') return; if (e.key >= '1' && e.key <= String(n)) place(+e.key); else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') place(0); else if (e.key === 'n' || e.key === 'N') { noteMode = !noteMode; draw(); } else if (e.key === 'ArrowUp') move(-1, 0); else if (e.key === 'ArrowDown') move(1, 0); else if (e.key === 'ArrowLeft') move(0, -1); else if (e.key === 'ArrowRight') move(0, 1); };
  document.addEventListener('keydown', onKey); cleanups.push(() => document.removeEventListener('keydown', onKey));

  const pad = h('div', { class: 'sudpad sdk-pad', style: `--n:${n}` }, range(n).map(i => h('button', { type: 'button', class: 'key', 'data-d': i + 1, onclick: () => place(i + 1) }, String(i + 1), h('small', null, ''))), h('button', { type: 'button', class: 'key', 'aria-label': t('erase'), onclick: () => place(0) }, '⌫'));
  const noteBtn = h('button', { type: 'button', class: 'btn ghost small', onclick: () => { noteMode = !noteMode; draw(); } }, '✏️ ' + L2('Poznámky', 'Notes')), stat = h('span', { class: 'muted' });
  let hstep = null;
  const hint = () => {
    if (conflicts().size) { toast(L2('Najprv oprav opakujúce sa čísla („!“).', 'First fix the repeating numbers (“!”).')); return; }
    const flat = cur.flat(), step = SudokuEngine.nextStep(flat, n), names = TECH_NAME(), cn = i => `(${Math.floor(i / n) + 1}, ${i % n + 1})`;
    G.hints++;
    const fillFewest = () => { let b = null; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!cur[r][c]) { const cs = sudokuCands(cur, n, br, bc, r, c); if (!b || cs.length < b.cs.length) b = { r, c, cs }; } if (!b) return; sel = [b.r, b.c]; const sv = P.sol[b.r][b.c]; undo.push({ i: key(b.r, b.c), r: b.r, c: b.c, val: 0, nt: [] }); cur[b.r][b.c] = sv; hl = null; hstep = null; toast(L2(`Do políčka ${cn(key(b.r, b.c))} patrí ${sv}.`, `Cell ${cn(key(b.r, b.c))} takes ${sv}.`)); save(); draw(); checkWin(); };
    if (hstep && hl) {
      if (hstep.place) { const [i, d] = hstep.place; sel = [Math.floor(i / n), i % n]; undo.push({ i, r: sel[0], c: sel[1], val: 0, nt: [] }); cur[sel[0]][sel[1]] = d; hl = null; hstep = null; toast(L2(`Do políčka ${cn(i)} patrí ${d}.`, `Cell ${cn(i)} takes ${d}.`)); save(); draw(); checkWin(); }
      else if (!hstep.shown) { const e = hstep.elim.map(([c, m]) => `${cn(c)}: ${SudokuEngine.bits(m).join(',')}`).join(' · '); hstep.shown = true; toast(L2(`Vyškrtni kandidátov – ${e}. Ďalšia nápoveda vyplní jedno políčko.`, `Cross out candidates – ${e}. Another hint fills one cell.`)); }
      else fillFewest();
      return;
    }
    if (!step) { fillFewest(); return; }
    hstep = step; hl = new Set(step.cells.map(c => typeof c === 'number' ? c : -1)); sel = step.place ? [Math.floor(step.place[0] / n), step.place[0] % n] : sel;
    const nm = names[step.t];
    let msg = L2(`Technika: ${nm}. `, `Technique: ${nm}. `);
    if (step.t === 0) msg += L2(`V políčku ${cn(step.place[0])} môže byť len jedno číslo.`, `Cell ${cn(step.place[0])} can hold only one number.`);
    else if (step.t === 1) msg += L2(`V ${unitText(n, step.unit)} sa jedno číslo dá umiestniť len na jedno políčko – pozri zvýraznené.`, `In ${unitText(n, step.unit)} one number fits in only one cell – look at the highlighted one.`);
    else if (step.t === 2) msg += L2(`Číslo ${step.digit} v ${unitText(n, step.unit)} je „uzamknuté“ aj v ${unitText(n, step.unit2)} – inde v ňom ho môžeš vyškrtnúť.`, `The number ${step.digit} in ${unitText(n, step.unit)} is “locked” within ${unitText(n, step.unit2)} – cross it out elsewhere there.`);
    else if (step.t === 6) msg += L2(`Číslo ${step.digit} tvorí obdĺžnik X-Wing – vyškrtni ho v príslušných stĺpcoch/riadkoch.`, `The number ${step.digit} forms an X-Wing rectangle – cross it out in the matching lines.`);
    else msg += L2(`Zvýraznené políčka v ${unitText(n, step.unit)} obsahujú ${step.digits.join(', ')} – ostatné kandidáty z nich vyškrtni.`, `The highlighted cells in ${unitText(n, step.unit)} hold ${step.digits.join(', ')} – eliminate the other candidates.`);
    toast(msg + L2(' (Ďalšia nápoveda ukáže viac.)', ' (Another hint shows more.)')); save(); draw();
  };
  const check = () => { flash = new Set(); for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (cur[r][c] && cur[r][c] !== P.sol[r][c]) flash.add(key(r, c)); draw(); toast(flash.size ? L2(`Nesprávnych políčok: ${flash.size} (označené „!“).`, `Wrong cells: ${flash.size} (marked “!”).`) : L2('Zatiaľ je všetko správne – pokračuj!', 'All correct so far – keep going!')); setTimeout(() => { flash = new Set(); draw(); }, 3500); };
  const undoMove = () => { const u = undo.pop(); if (!u) return; cur[u.r][u.c] = u.val; if (u.nt.length) notes[u.i] = u.nt; else delete notes[u.i]; hl = null; save(); draw(); };
  const chip = (label, on, fn) => h('button', { type: 'button', class: 'fchip' + (on ? ' on' : ''), 'aria-pressed': on, onclick: fn }, label);
  const best = S0.best[`${n}-${G.level}`];
  page(v, '🧩 Sudoku', L2('Doplň čísla tak, aby sa v každom riadku, stĺpci' + (br > 1 ? ' a štvorčeku' : '') + ' každé číslo od 1 do ' + n + ' vyskytlo práve raz.', 'Fill the numbers so every row, column' + (br > 1 ? ' and box' : '') + ' contains each number from 1 to ' + n + ' exactly once.'),
    h('div', { class: 'frow', role: 'group', 'aria-label': L2('Veľkosť', 'Size') }, [3, 4, 6, 9].map(k => chip(sdkSizeName(k), k === n, () => { sdkSel.n = k; S0.cur = null; render(); }))),
    h('div', { class: 'frow', role: 'group', 'aria-label': L2('Obtiažnosť', 'Level') }, SDK_LEVELS.map(l => chip(sdkLevelName(l), l === G.level, () => { sdkSel.level = l; S0.cur = null; render(); }))),
    h('p', { class: 'muted' }, 'ℹ️ ' + sdkLevelDesc(n, G.level)),
    h('article', { class: 'taskcard' }, h('div', { class: 'tc-meta' }, h('span', { class: 'catchip' }, `⏱ `, timeEl), h('span', { class: 'muted' }, `${L2('Úloha č.', 'Puzzle #')} ${G.seed % 100000}${best ? ' · ' + L2('rekord', 'best') + ' ' + fmtTime(best) : ''}`)),
      h('div', { class: 'sudwrap' }, grid, pad),
      h('div', { class: 'ferry-controls' }, noteBtn, btn('↶ ' + L2('Späť ťah', 'Undo'), 'ghost small', undoMove), btn('💡 ' + L2('Nápoveda', 'Hint'), 'ghost small', hint), btn('✔ ' + L2('Skontrolovať', 'Check'), 'ghost small', check), btn('🔄 ' + L2('Nová hra', 'New game'), 'primary small', () => { S0.cur = null; render(); }), stat)));
  draw();
};
