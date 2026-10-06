'use strict';
/* LogiQ – task type components.
   To add a new type: TaskTypes.myType = { mount(box, task, ctx) -> instance?, explainSteps?(task), answerText?(task) }
   ctx: { task, session, setCheck(fn|null), solved(), wrong(msgS?), nudge(msg), cleanup(fn) }
   instance may expose dynHint(index) -> { text:S, hl?:fn } for hints marked 'dyn'. */
const TaskTypes = {};

function normNum(s) {
  s = String(s).trim().replace(/\s/g, '').replace(',', '.').replace('−', '-');
  if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const m = s.match(/^(-?\d+)\/(\d+)$/);
  if (m && +m[2] !== 0) return +m[1] / +m[2];
  return NaN;
}
const both = fn => ({ sk: fn('sk'), en: fn('en') });

/* ---------------- choice ---------------- */
TaskTypes.choice = {
  mount(box, task, ctx) {
    const d = task.data; let sel = null;
    const wrap = h('div', { class: 'opts cols' + (d.cols || 1), role: 'radiogroup', 'aria-label': tx(task.title) });
    d.options.forEach((o, i) => {
      const b = h('button', { class: 'opt', type: 'button', role: 'radio', 'aria-checked': 'false' },
        h('span', { class: 'opt-key' }, String.fromCharCode(65 + i)),
        h('span', { class: 'opt-txt' }, tx(o)),
        h('span', { class: 'opt-mark', 'aria-hidden': 'true' }, '✓'));
      b.addEventListener('click', () => {
        sel = i;
        [...wrap.children].forEach((c, j) => { c.classList.toggle('sel', j === i); c.setAttribute('aria-checked', j === i); });
      });
      wrap.append(b);
    });
    box.append(wrap);
    ctx.setCheck(() => { if (sel == null) return ctx.nudge(t('pickFirst')); sel === d.correct ? ctx.solved() : ctx.wrong(d.wrongMsg && d.wrongMsg[sel]); });
  },
  answerText: task => tx(task.data.options[task.data.correct])
};

/* ---------------- multi (mark all that apply) ---------------- */
TaskTypes.multi = {
  mount(box, task, ctx) {
    const d = task.data; const sel = new Set();
    const wrap = h('div', { class: 'opts cols1', role: 'group' });
    d.options.forEach((o, i) => {
      const b = h('button', { class: 'opt', type: 'button', role: 'checkbox', 'aria-checked': 'false' },
        h('span', { class: 'opt-key sq' }, ''), h('span', { class: 'opt-txt' }, tx(o)), h('span', { class: 'opt-mark', 'aria-hidden': 'true' }, '✓'));
      b.addEventListener('click', () => { sel.has(i) ? sel.delete(i) : sel.add(i); b.classList.toggle('sel', sel.has(i)); b.setAttribute('aria-checked', sel.has(i)); });
      wrap.append(b);
    });
    box.append(wrap);
    ctx.setCheck(() => {
      if (!sel.size) return ctx.nudge(t('pickFirst'));
      const ok = d.correct.length === sel.size && d.correct.every(i => sel.has(i));
      ok ? ctx.solved() : ctx.wrong();
    });
  },
  answerText: task => task.data.correct.map(i => tx(task.data.options[i])).join(' • ')
};

/* ---------------- number (own keypad – no iPad keyboard covering the page) ---------------- */
TaskTypes.number = {
  mount(box, task, ctx) {
    const d = task.data; let val = ctx.session.data.val || '';
    const disp = h('div', { class: 'numdisp', role: 'status', 'aria-live': 'polite' });
    const draw = () => { disp.replaceChildren(...[h('span', { class: val ? '' : 'ph' }, val || t('yourAnswer')), d.unit ? h('small', null, ' ' + tx(d.unit)) : null].filter(Boolean)); ctx.session.data.val = val; };
    const press = k => {
      if (k === '⌫') val = val.slice(0, -1);
      else if (k === 'C') val = '';
      else if (k === '✔') return doCheck();
      else if (val.length < 12) val += k;
      draw();
    };
    const keys = ['7', '8', '9', '⌫', '4', '5', '6', 'C', '1', '2', '3', '/', '0', ',', '−', '✔'];
    const pad = h('div', { class: 'keypad' }, keys.map(k => h('button', { type: 'button', class: 'key' + (k === '✔' ? ' go' : ''), 'aria-label': k === '⌫' ? t('erase') : k === '✔' ? t('check') : k, onclick: () => press(k) }, k)));
    const onKey = e => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (/^[0-9.,\/]$/.test(e.key)) press(e.key === '.' ? ',' : e.key);
      else if (e.key === '-') press('−');
      else if (e.key === 'Backspace') press('⌫');
      else if (e.key === 'Enter') doCheck();
    };
    document.addEventListener('keydown', onKey); ctx.cleanup(() => document.removeEventListener('keydown', onKey));
    box.append(disp, pad);
    if (d.work) {
      const ta = h('textarea', { class: 'work', rows: 4, placeholder: t('workPh'), 'aria-label': t('workLabel') });
      ta.value = ctx.session.work || ''; ta.addEventListener('input', () => ctx.session.work = ta.value);
      box.append(h('label', { class: 'worklabel' }, t('workLabel')), ta);
    }
    const doCheck = () => {
      if (!val) return ctx.nudge(t('typeFirst'));
      const n = normNum(val); const acc = [].concat(d.answer).map(normNum);
      acc.some(a => Math.abs(a - n) < 1e-9) ? ctx.solved() : ctx.wrong(d.wrongMsg);
    };
    ctx.setCheck(doCheck); draw();
  },
  answerText: task => [].concat(task.data.answer)[0] + (task.data.unit ? ' ' + tx(task.data.unit) : '')
};

/* ---------------- sort (drag cards or use arrows) ---------------- */
TaskTypes.sort = {
  mount(box, task, ctx) {
    const d = task.data, n = d.items.length, D = ctx.session.data;
    if (!D.order) { const o = shuffle(range(n), rng(hash(task.id))); if (o.every((v, i) => v === i)) o.push(o.shift()); D.order = o; }
    const list = h('ul', { class: 'sortlist' });
    box.append(h('p', { class: 'sortdir' }, '⇅ ', tx(d.dir)), list);
    const move = (from, to) => { const [k] = D.order.splice(from, 1); D.order.splice(Math.max(0, Math.min(n - 1, to)), 0, k); draw(); };
    function draw() {
      list.replaceChildren();
      D.order.forEach((k, pos) => {
        const li = h('li', { class: 'sortcard' },
          h('span', { class: 'grip', 'aria-hidden': 'true' }, '⠿'),
          h('span', { class: 'sc-pos' }, pos + 1),
          h('span', { class: 'sc-txt' }, tx(d.items[k])),
          h('span', { class: 'sc-btns' },
            h('button', { type: 'button', class: 'mini', 'aria-label': t('moveUp'), disabled: pos === 0, onclick: () => move(pos, pos - 1) }, '▲'),
            h('button', { type: 'button', class: 'mini', 'aria-label': t('moveDown'), disabled: pos === n - 1, onclick: () => move(pos, pos + 1) }, '▼')));
        const grip = li.firstChild; let startY = 0, mids = [];
        grip.addEventListener('pointerdown', e => {
          grip.setPointerCapture(e.pointerId); startY = e.clientY; li.classList.add('drag');
          mids = [...list.children].map(c => { const r = c.getBoundingClientRect(); return r.top + r.height / 2; });
        });
        grip.addEventListener('pointermove', e => { if (grip.hasPointerCapture(e.pointerId)) li.style.transform = `translateY(${e.clientY - startY}px)`; });
        const end = e => {
          if (!grip.hasPointerCapture(e.pointerId)) return;
          const y = e.clientY; let target = 0;
          mids.forEach((m, i) => { if (i !== pos && m < y) target++; });
          move(pos, target);
        };
        grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
        list.append(li);
      });
    }
    draw();
    ctx.setCheck(() => D.order.every((v, i) => v === i) ? ctx.solved() : ctx.wrong());
  },
  answerText: task => task.data.items.map(tx).join('  →  ')
};

/* ---------------- sudoku (4×4, 6×6, 9×9) ---------------- */
function sudokuDims(n) { return n === 4 ? [2, 2] : n === 6 ? [2, 3] : [3, 3]; }
function sudokuCands(g, n, br, bc, r, c) {
  const used = new Set();
  for (let i = 0; i < n; i++) { used.add(g[r][i]); used.add(g[i][c]); }
  const r0 = r - r % br, c0 = c - c % bc;
  for (let i = 0; i < br; i++) for (let j = 0; j < bc; j++) used.add(g[r0 + i][c0 + j]);
  return range(n).map(x => x + 1).filter(v => !used.has(v));
}
function solvableBySingles(grid, n, br, bc) {
  const g = grid.map(r => r.slice()); let progress = true;
  while (progress) {
    progress = false;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!g[r][c]) {
      const cs = sudokuCands(g, n, br, bc, r, c);
      if (cs.length === 1) { g[r][c] = cs[0]; progress = true; }
    }
  }
  return g.every(r => r.every(v => v));
}
function genSudoku(n, holes, seed) {
  const [br, bc] = sudokuDims(n), r = rng(seed);
  const pat = (a, b) => (bc * (a % br) + Math.floor(a / br) + b) % n;
  const digits = shuffle(range(n).map(x => x + 1), r);
  const grp = (cnt, size) => shuffle(range(cnt), r).flatMap(x => shuffle(range(size), r).map(y => x * size + y));
  const rows = grp(n / br, br), cols = grp(n / bc, bc);
  const sol = rows.map(a => cols.map(b => digits[pat(a, b)]));
  const given = sol.map(row => row.slice());
  let removed = 0;
  for (const idx of shuffle(range(n * n), r)) {
    if (removed >= holes) break;
    const rr = Math.floor(idx / n), cc = idx % n, keep = given[rr][cc];
    given[rr][cc] = 0;
    if (solvableBySingles(given, n, br, bc)) removed++; else given[rr][cc] = keep;
  }
  return { n, br, bc, sol, given };
}
function miniSudoku(P, grid, hl) {
  const g = h('div', { class: 'minisud', style: `--n:${P.n}` });
  for (let r = 0; r < P.n; r++) for (let c = 0; c < P.n; c++) {
    const cl = ['mc'];
    if (c % P.bc === P.bc - 1 && c < P.n - 1) cl.push('br'); if (r % P.br === P.br - 1 && r < P.n - 1) cl.push('bb');
    if (hl && hl.r === r && hl.c === c) cl.push('hl');
    if (P.given[r][c]) cl.push('gv');
    g.append(h('span', { class: cl.join(' ') }, grid[r][c] || ''));
  }
  return g;
}
TaskTypes.sudoku = {
  mount(box, task, ctx) {
    const P = task.puzzle || (task.puzzle = genSudoku(task.data.n, task.data.holes, task.data.seed));
    const { n, br, bc } = P, D = ctx.session.data;
    const cur = D.grid || (D.grid = P.given.map(r => r.slice()));
    let sel = null, hlCell = null;
    const wrap = h('div', { class: 'sudwrap' });
    const grid = h('div', { class: 'sudoku n' + n, style: `--n:${n}`, role: 'grid', 'aria-label': 'Sudoku ' + n + '×' + n });
    const cells = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const cl = ['sc'];
      if (c % bc === bc - 1 && c < n - 1) cl.push('br'); if (r % br === br - 1 && r < n - 1) cl.push('bb');
      const b = h('button', { type: 'button', class: cl.join(' '), role: 'gridcell', 'aria-label': `${t('row')} ${r + 1}, ${t('col')} ${c + 1}`, onclick: () => { if (!P.given[r][c]) { sel = [r, c]; draw(); } } });
      cells.push(b); grid.append(b);
    }
    const bad = () => {
      const s = new Set();
      const mark = list => { const seen = {}; list.forEach(([r, c]) => { const v = cur[r][c]; if (!v) return; (seen[v] = seen[v] || []).push([r, c]); }); Object.values(seen).forEach(a => { if (a.length > 1) a.forEach(([r, c]) => s.add(r * n + c)); }); };
      for (let i = 0; i < n; i++) { mark(range(n).map(j => [i, j])); mark(range(n).map(j => [j, i])); }
      for (let r0 = 0; r0 < n; r0 += br) for (let c0 = 0; c0 < n; c0 += bc) { const l = []; for (let i = 0; i < br; i++) for (let j = 0; j < bc; j++) l.push([r0 + i, c0 + j]); mark(l); }
      return s;
    };
    function draw() {
      const conflicts = bad();
      cells.forEach((b, i) => {
        const r = Math.floor(i / n), c = i % n, v = cur[r][c];
        b.textContent = v || '';
        b.classList.toggle('given', !!P.given[r][c]);
        b.classList.toggle('selc', !!sel && sel[0] === r && sel[1] === c);
        b.classList.toggle('rel', !!sel && (sel[0] === r || sel[1] === c || (Math.floor(sel[0] / br) === Math.floor(r / br) && Math.floor(sel[1] / bc) === Math.floor(c / bc))));
        b.classList.toggle('same', !!sel && v && cur[sel[0]][sel[1]] === v);
        b.classList.toggle('bad', conflicts.has(i));
        b.classList.toggle('hint', !!hlCell && hlCell[0] === r && hlCell[1] === c);
      });
    }
    const setVal = v => { if (!sel) return ctx.nudge(t('pickCell')); cur[sel[0]][sel[1]] = v; hlCell = null; draw(); };
    const pad = h('div', { class: 'sudpad', style: `--n:${n}` }, range(n).map(i => h('button', { type: 'button', class: 'key', onclick: () => setVal(i + 1) }, i + 1)),
      h('button', { type: 'button', class: 'key', 'aria-label': t('erase'), onclick: () => setVal(0) }, '⌫'));
    const onKey = e => { if (e.key >= '1' && e.key <= String(n)) setVal(+e.key); else if (e.key === 'Backspace' || e.key === 'Delete') setVal(0); };
    document.addEventListener('keydown', onKey); ctx.cleanup(() => document.removeEventListener('keydown', onKey));
    wrap.append(grid, pad); box.append(wrap); draw();
    ctx.setCheck(() => {
      if (cur.some(r => r.some(v => !v))) return ctx.nudge(t('sudFill'));
      if (bad().size) return ctx.wrong(S('Niektoré čísla sa opakujú v riadku, stĺpci alebo štvorčeku. Pozri políčka označené „!“.', 'Some numbers repeat in a row, column or box. Look at the cells marked “!”.'));
      ctx.solved();
    });
    return {
      dynHint(idx) {
        if (bad().size) return { text: S('Niektoré čísla sa opakujú – pozri políčka označené „!“. Ktoré z nich treba zmeniť?', 'Some numbers repeat – look at the cells marked “!”. Which one needs changing?') };
        let best = null;
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!cur[r][c]) { const cs = sudokuCands(cur, n, br, bc, r, c); if (!best || cs.length < best.cs.length) best = { r, c, cs }; }
        if (!best) return null;
        const hl = () => { hlCell = [best.r, best.c]; draw(); };
        if (idx <= 1) return { text: S(`Pozri sa na políčko v ${best.r + 1}. riadku a ${best.c + 1}. stĺpci. Ktoré čísla tam ešte môžu byť?`, `Look at the cell in row ${best.r + 1}, column ${best.c + 1}. Which numbers can still go there?`), hl };
        return { text: S(`Do políčka (riadok ${best.r + 1}, stĺpec ${best.c + 1}) patrí ${P.sol[best.r][best.c]}.`, `The cell (row ${best.r + 1}, column ${best.c + 1}) takes ${P.sol[best.r][best.c]}.`), hl };
      }
    };
  },
  explainSteps(task) {
    const P = task.puzzle || (task.puzzle = genSudoku(task.data.n, task.data.holes, task.data.seed));
    const { n, br, bc } = P; let best = null;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!P.given[r][c]) { const cs = sudokuCands(P.given, n, br, bc, r, c); if (!best || cs.length < best.cs.length) best = { r, c, cs }; }
    const steps = [];
    if (best) {
      const rowV = P.given[best.r].filter(Boolean).join(', '), colV = P.given.map(x => x[best.c]).filter(Boolean).join(', ');
      steps.push({
        text: S(`Vezmime políčko v ${best.r + 1}. riadku a ${best.c + 1}. stĺpci. V jeho riadku už sú čísla ${rowV}, v stĺpci ${colV || '–'} a ďalšie vo štvorčeku. Zostáva ${best.cs.length === 1 ? 'iba jedno číslo' : 'málo možností'}: ${best.cs.join(', ')}.`,
          `Take the cell in row ${best.r + 1}, column ${best.c + 1}. Its row already has ${rowV}, its column ${colV || '–'}, plus more in its box. ${best.cs.length === 1 ? 'Only one number is left' : 'Few options remain'}: ${best.cs.join(', ')}.`),
        render: box => box.append(miniSudoku(P, P.given, best))
      });
    }
    steps.push({ text: S('Keď doplníš jedno číslo, ostatným políčkam sa zmenší výber. Tak postupne dopĺňaš ďalšie – vždy hľadáš miesto, kam sa hodí iba jedno číslo.', 'Once one number is placed, other cells have fewer options. Keep going – always look for a cell where only one number fits.') });
    steps.push({ text: S('Takto vyzerá hotové riešenie:', 'Here is the finished solution:'), render: box => box.append(miniSudoku(P, P.sol)) });
    return steps;
  }
};

/* ---------------- lights (switch puzzle) ---------------- */
function lightsEffects(n) {
  return range(n * n).map(i => { const r = Math.floor(i / n), c = i % n; let m = 1 << i;[[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { const rr = r + a, cc = c + b; if (rr >= 0 && rr < n && cc >= 0 && cc < n) m |= 1 << (rr * n + cc); }); return m; });
}
function lightsSolve(n, state) {
  const eff = lightsEffects(n), N = n * n; let best = null, bestCnt = 99;
  for (let mask = 0; mask < (1 << N); mask++) {
    let x = 0, cnt = 0;
    for (let i = 0; i < N; i++) if (mask & (1 << i)) { x ^= eff[i]; cnt++; }
    if (x === state && cnt < bestCnt) { best = mask; bestCnt = cnt; }
  }
  return best == null ? [] : range(N).filter(i => best & (1 << i));
}
function lightsInit(task) {
  const n = task.data.size, eff = lightsEffects(n), r = rng(task.data.seed); let s = 0;
  for (const i of shuffle(range(n * n), r).slice(0, task.data.presses)) s ^= eff[i];
  return s || eff[0];
}
function miniLights(n, state, marks) {
  const g = h('div', { class: 'lights mini', style: `--n:${n}` });
  for (let i = 0; i < n * n; i++) g.append(h('span', { class: 'lt' + ((state >> i) & 1 ? ' on' : '') + (marks && marks.includes(i) ? ' mk' : '') }, marks && marks.includes(i) ? '👆' : ((state >> i) & 1 ? '●' : '○')));
  return g;
}
TaskTypes.lights = {
  mount(box, task, ctx) {
    const n = task.data.size, eff = lightsEffects(n), D = ctx.session.data;
    if (D.state == null) { D.state = lightsInit(task); D.moves = 0; }
    let hlCell = null;
    const grid = h('div', { class: 'lights', style: `--n:${n}`, role: 'grid' });
    const info = h('p', { class: 'ferry-info', role: 'status' });
    const cells = range(n * n).map(i => { const b = h('button', { type: 'button', class: 'lt', 'aria-label': `${t('row')} ${Math.floor(i / n) + 1}, ${t('col')} ${i % n + 1}`, onclick: () => press(i) }); grid.append(b); return b; });
    function draw() {
      cells.forEach((b, i) => { const on = (D.state >> i) & 1; b.classList.toggle('on', !!on); b.classList.toggle('hint', hlCell === i); b.textContent = on ? '●' : '○'; b.setAttribute('aria-pressed', !!on); });
      info.textContent = t('moves') + ': ' + D.moves;
    }
    function press(i) { D.state ^= eff[i]; D.moves++; hlCell = null; draw(); if (D.state === 0) setTimeout(() => ctx.solved(), 350); }
    box.append(grid, info, h('button', { type: 'button', class: 'btn ghost small', onclick: () => { D.state = lightsInit(task); D.moves = 0; hlCell = null; draw(); } }, t('restart')));
    draw(); ctx.setCheck(null);
    return {
      dynHint(idx) {
        const sol = lightsSolve(n, D.state); if (!sol.length) return null;
        const hl = () => { hlCell = sol[0]; draw(); };
        if (idx <= 1) return { text: S('Stlač políčko a všimni si, ktoré svetlá sa zmenia. Stačí stlačiť každé políčko najviac raz.', 'Press a cell and notice which lights change. Each cell needs pressing at most once.') };
        return { text: S(`Skús stlačiť políčko v ${Math.floor(sol[0] / n) + 1}. riadku a ${sol[0] % n + 1}. stĺpci.`, `Try pressing the cell in row ${Math.floor(sol[0] / n) + 1}, column ${sol[0] % n + 1}.`), hl };
      }
    };
  },
  explainSteps(task) {
    const n = task.data.size, s0 = lightsInit(task), sol = lightsSolve(n, s0);
    return [
      { text: S('Stlačenie políčka prepne seba aj susedov. Dve stlačenia toho istého políčka sa zrušia, preto každé stačí stlačiť najviac raz – na poradí nezáleží.', 'Pressing a cell flips it and its neighbours. Pressing the same cell twice cancels out, so each cell needs at most one press – order does not matter.') },
      { text: S(`Na začiatku svieti toto. Najkratšie riešenie stlačí ${sol.length} políčok (označené 👆):`, `This is the start. The shortest solution presses ${sol.length} cells (marked 👆):`), render: box => box.append(miniLights(n, s0, sol)) }
    ];
  }
};

/* ---------------- maze (draw a path with a finger) ---------------- */
function mazeInfo(rows) {
  let S0, E0; rows.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === 'S') S0 = [r, c]; if (ch === 'E') E0 = [r, c]; }));
  const R = rows.length, C = rows[0].length, key = (r, c) => r * C + c, prev = new Map([[key(...S0), null]]), q = [S0];
  while (q.length) { const [r, c] = q.shift(); if (r === E0[0] && c === E0[1]) break; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { const rr = r + a, cc = c + b; if (rr < 0 || cc < 0 || rr >= R || cc >= C || rows[rr][cc] === '#' || prev.has(key(rr, cc))) return; prev.set(key(rr, cc), [r, c]); q.push([rr, cc]); }); }
  const path = []; let cur = E0; while (cur) { path.unshift(cur); cur = prev.get(key(...cur)); }
  return { S: S0, E: E0, R, C, shortest: path, steps: path.length - 1 };
}
function mazeGrid(rows, onCell) {
  const R = rows.length, C = rows[0].length, g = h('div', { class: 'maze', style: `--c:${C}` }), cells = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const ch = rows[r][c], d = h('div', { class: 'mz' + (ch === '#' ? ' wall' : ''), 'data-r': r, 'data-c': c, 'aria-hidden': 'true' }, ch === 'S' ? '🚀' : ch === 'E' ? '🏁' : '');
    cells.push(d); g.append(d);
  }
  return { el: g, cells, at: (r, c) => cells[r * C + c] };
}
TaskTypes.maze = {
  mount(box, task, ctx) {
    const rows = task.data.rows, M = mazeInfo(rows); let path = [M.S], drawing = false;
    const mg = mazeGrid(rows), info = h('p', { class: 'ferry-info', role: 'status', 'aria-live': 'polite' });
    const same = (a, b) => a[0] === b[0] && a[1] === b[1], adj = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
    function draw() {
      mg.cells.forEach(d => d.classList.remove('path', 'tail'));
      path.forEach((p, i) => { const d = mg.at(p[0], p[1]); d.classList.add('path'); if (i === path.length - 1) d.classList.add('tail'); });
      info.textContent = `${t('steps')}: ${path.length - 1}`;
    }
    const cellOf = e => { const el = document.elementFromPoint(e.clientX, e.clientY); const m = el && el.closest && el.closest('.mz'); return m && mg.el.contains(m) ? [+m.dataset.r, +m.dataset.c] : null; };
    function step(cell) {
      if (!cell || rows[cell[0]][cell[1]] === '#') return;
      const tail = path[path.length - 1]; if (same(cell, tail)) return;
      if (path.length > 1 && same(cell, path[path.length - 2])) path.pop();
      else if (adj(tail, cell) && !path.some(p => same(p, cell))) path.push(cell);
      draw();
      if (same(path[path.length - 1], M.E)) {
        drawing = false;
        if (path.length - 1 <= M.steps) ctx.solved();
        else { ctx.wrong(S(`Do cieľa si sa dostal – to je skvelé! Ale existuje kratšia cesta. Tvoja mala ${path.length - 1} krokov, skús nájsť menej.`, `You reached the finish – great! But a shorter route exists. Yours took ${path.length - 1} steps, try for fewer.`)); path = [M.S]; draw(); }
      }
    }
    mg.el.addEventListener('pointerdown', e => {
      const cell = cellOf(e); if (!cell) return;
      const i = path.findIndex(p => same(p, cell));
      if (i >= 0) path = path.slice(0, i + 1);
      else if (adj(path[path.length - 1], cell)) step(cell);
      drawing = true; try { mg.el.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ } draw(); e.preventDefault();
    });
    mg.el.addEventListener('pointermove', e => { if (drawing) step(cellOf(e)); });
    const stop = () => { drawing = false; };
    mg.el.addEventListener('pointerup', stop); mg.el.addEventListener('pointercancel', stop);
    box.append(mg.el, info, h('button', { type: 'button', class: 'btn ghost small', onclick: () => { path = [M.S]; draw(); } }, t('restart')));
    draw(); ctx.setCheck(null);
    return {
      dynHint(idx) {
        if (idx <= 1) return { text: S(`Skús najprv nájsť všetky slepé uličky. Najkratšia cesta má ${M.steps} krokov.`, `First try spotting the dead ends. The shortest route takes ${M.steps} steps.`) };
        const nxt = M.shortest.slice(1, 4).map(([r, c]) => `(${r + 1},${c + 1})`).join(' → ');
        return { text: S(`Začiatok najkratšej cesty (riadok, stĺpec): ${nxt} …`, `The start of the shortest route (row, column): ${nxt} …`) };
      }
    };
  },
  explainSteps(task) {
    const M = mazeInfo(task.data.rows);
    return [{
      text: S(`Slepé uličky preskúmame a vyradíme. Najkratšia cesta má ${M.steps} krokov a vedie takto:`, `We explore and rule out dead ends. The shortest route takes ${M.steps} steps and goes like this:`),
      render: box => { const mg = mazeGrid(task.data.rows); M.shortest.forEach(([r, c]) => mg.at(r, c).classList.add('path')); box.append(mg.el); }
    }];
  }
};

/* ---------------- ferry (wolf, goat & cabbage and friends) ---------------- */
const Ferry = {
  moves(cfg, st) {
    const idx = st.pos.map((p, i) => p === st.boat ? i : -1).filter(i => i >= 0), min = cfg.mode === 'farmer' ? 0 : 1, res = [];
    const rec = (start, cur) => { if (cur.length >= min) res.push(cur.slice()); if (cur.length === cfg.cap) return; for (let k = start; k < idx.length; k++) { cur.push(idx[k]); rec(k + 1, cur); cur.pop(); } };
    rec(0, []); return res;
  },
  apply(st, combo) { const pos = st.pos.slice(); combo.forEach(i => pos[i] = 1 - st.boat); return { pos, boat: 1 - st.boat }; },
  violation(cfg, st) {
    for (const side of [0, 1]) {
      if (cfg.mode === 'farmer') {
        if (side === st.boat) continue;
        for (const [a, b, msg] of cfg.conflicts) if (st.pos[a] === side && st.pos[b] === side) return { side, idxs: [a, b], msg };
      } else {
        const E = cfg.cast.map((m, i) => m.g === 'E' && st.pos[i] === side ? i : -1).filter(i => i >= 0);
        const R = cfg.cast.map((m, i) => m.g === 'R' && st.pos[i] === side ? i : -1).filter(i => i >= 0);
        if (E.length && R.length > E.length) return { side, idxs: [...E, ...R], msg: cfg.msg };
      }
    }
    return null;
  },
  key: st => st.pos.join('') + st.boat,
  solve(cfg, st) {
    if (Ferry.violation(cfg, st)) return null;
    const goal = s => s.pos.every(p => p === 1), seen = new Set([Ferry.key(st)]), q = [{ st, path: [] }];
    while (q.length) {
      const cur = q.shift(); if (goal(cur.st)) return cur.path;
      for (const combo of Ferry.moves(cfg, cur.st)) {
        const ns = Ferry.apply(cur.st, combo), k = Ferry.key(ns);
        if (seen.has(k) || Ferry.violation(cfg, ns)) continue;
        seen.add(k); q.push({ st: ns, path: [...cur.path, { combo, from: cur.st, to: ns }] });
      }
    }
    return null;
  },
  moveText(cfg, from, combo) {
    return both(lang => {
      const right = from.boat === 0, dir = lang === 'sk' ? (right ? 'doprava' : 'doľava') : (right ? 'to the right' : 'to the left');
      if (cfg.mode === 'farmer') {
        const f = cfg.rower.e + ' ' + L(cfg.rower.n, lang);
        const names = combo.map(i => cfg.cast[i].e + ' ' + L(cfg.cast[i].n, lang)).join(' + ');
        if (!combo.length) return lang === 'sk' ? `${f} sa preplaví ${dir} sám.` : `${f} rows ${dir} alone.`;
        return lang === 'sk' ? `${f} prevezie: ${names} ${dir}.` : `${f} takes ${names} ${dir}.`;
      }
      const em = combo.map(i => cfg.cast[i].e).join(' ');
      return lang === 'sk' ? `${em} plávajú ${dir}.` : `${em} sail ${dir}.`;
    });
  },
  scene(cfg, st, o = {}) {
    const loaded = o.loaded || new Set(), warn = o.warn || { side: -1, idxs: [] };
    const char = i => {
      const m = cfg.cast[i], inBoat = loaded.has(i);
      const enabled = o.onTap && !o.busy && st.pos[i] === st.boat;
      const b = h('button', { type: 'button', class: 'char' + (inBoat ? ' inboat' : '') + (warn.idxs.includes(i) ? ' warn' : ''), disabled: !enabled, 'aria-label': L(m.n, LANG) + (inBoat ? ' (' + t('onBoat') + ')' : ''), onclick: () => o.onTap(i) },
        h('span', { class: 'emo' }, m.e), cfg.mode === 'farmer' ? h('span', { class: 'nm' }, tx(m.n)) : null, warn.idxs.includes(i) ? h('span', { class: 'wb', 'aria-hidden': 'true' }, '⚠') : null);
      return b;
    };
    const bank = side => h('div', { class: 'bank ' + (side ? 'right' : 'left') + (warn.side === side ? ' warnbank' : '') },
      h('div', { class: 'bank-label' }, side ? t('rightBank') : t('leftBank')),
      h('div', { class: 'bank-chars' }, cfg.cast.map((m, i) => i).filter(i => st.pos[i] === side && !loaded.has(i)).map(char)));
    const boat = h('div', { class: 'boat ' + (st.boat ? 'r' : 'l') },
      h('div', { class: 'boat-chars' }, cfg.mode === 'farmer' ? h('span', { class: 'rower', title: L(cfg.rower.n, LANG) }, cfg.rower.e) : null, [...loaded].map(char)),
      h('div', { class: 'hull', 'aria-hidden': 'true' }, '⛵'));
    const river = h('div', { class: 'river', 'aria-hidden': 'false' }, h('div', { class: 'waves', 'aria-hidden': 'true' }, '〰️ 〰️ 〰️'), boat);
    return { el: h('div', { class: 'ferry' }, bank(0), river, bank(1)), boat };
  }
};
TaskTypes.ferry = {
  mount(box, task, ctx) {
    const cfg = FERRY[task.data.cfg], D = ctx.session.data;
    if (!D.st) { D.st = { pos: cfg.cast.map(() => 0), boat: 0 }; D.moves = 0; D.hist = []; }
    let loaded = new Set(), busy = false, warn = null, msgTimer = null;
    const stage = h('div', { class: 'ferry-stage' }), msg = h('div', { class: 'ferry-msg', role: 'status', 'aria-live': 'polite' }), info = h('div', { class: 'ferry-info' });
    const bSail = h('button', { type: 'button', class: 'btn primary', onclick: sail }, t('sail') + ' ➜');
    const bUndo = h('button', { type: 'button', class: 'btn ghost small', onclick: undo }, '↶ ' + t('undo'));
    const bReset = h('button', { type: 'button', class: 'btn ghost small', onclick: () => { D.st = { pos: cfg.cast.map(() => 0), boat: 0 }; D.moves = 0; D.hist = []; loaded = new Set(); warn = null; setMsg(''); draw(); } }, t('restart'));
    function setMsg(m, kind) { msg.textContent = m || ''; msg.className = 'ferry-msg' + (kind ? ' ' + kind : ''); }
    function draw() {
      const sc = Ferry.scene(cfg, D.st, { loaded, warn: warn || undefined, busy, onTap: i => { if (loaded.has(i)) loaded.delete(i); else if (loaded.size < cfg.cap) loaded.add(i); else return setMsg(t('boatFull'), 'info'); setMsg(''); draw(); } });
      stage.replaceChildren(sc.el); stage._boat = sc.boat;
      info.textContent = `${t('moves')}: ${D.moves}`;
      bSail.disabled = busy; bUndo.disabled = busy || !D.hist.length;
    }
    function undo() { if (!D.hist.length) return; D.st = D.hist.pop(); D.moves = Math.max(0, D.moves - 1); loaded = new Set(); warn = null; setMsg(''); draw(); }
    function sail() {
      if (busy) return;
      if (cfg.mode === 'mc' && loaded.size === 0) return setMsg(t('needRower'), 'info');
      busy = true; clearTimeout(msgTimer);
      const combo = [...loaded], ns = Ferry.apply(D.st, combo);
      stage._boat.classList.toggle('r', ns.boat === 1); stage._boat.classList.toggle('l', ns.boat === 0);
      bSail.disabled = true;
      setTimeout(() => {
        const v = Ferry.violation(cfg, ns); D.moves++;
        D.hist.push(D.st); D.st = ns; loaded = new Set(); busy = false;
        if (v) {
          warn = v; setMsg(tx(v.msg) + ' ' + t('ferryUndoNote'), 'warn'); draw();
          msgTimer = setTimeout(() => { if (warn) undo(); }, 2600);
        } else { warn = null; setMsg(''); draw(); if (ns.pos.every(p => p === 1)) setTimeout(() => ctx.solved(), 400); }
      }, ctx.session.fast ? 0 : 750);
    }
    ctx.cleanup(() => clearTimeout(msgTimer));
    box.append(stage, msg, h('div', { class: 'ferry-controls' }, bSail, bUndo, bReset, info));
    draw(); ctx.setCheck(null);
    return {
      dynHint() {
        const p = Ferry.solve(cfg, D.st); if (!p || !p.length) return null;
        return { text: both(lang => (lang === 'sk' ? 'Dobrý ďalší ťah: ' : 'A good next move: ') + Ferry.moveText(cfg, D.st, p[0].combo)[lang]) };
      }
    };
  },
  explainSteps(task) {
    const cfg = FERRY[task.data.cfg], start = { pos: cfg.cast.map(() => 0), boat: 0 }, sol = Ferry.solve(cfg, start);
    const steps = [{ text: S('Poďme si to prehrať krok za krokom:', 'Let us replay it step by step:'), render: box => box.append(Ferry.scene(cfg, start).el) }];
    sol.forEach((m, i) => steps.push({ text: Ferry.moveText(cfg, m.from, m.combo), render: box => box.append(Ferry.scene(cfg, m.to).el) }));
    steps.push({ text: S(`Hotovo! Všetci sú na druhom brehu za ${sol.length} ťahov – a menej sa to nedá (overil to počítač prehľadaním všetkých možností).`, `Done! Everyone is across in ${sol.length} moves – and it cannot be done in fewer (a computer checked every possibility).`) });
    return steps;
  }
};

/* ---------------- nim / subtraction games against the computer ---------------- */
const Nim = {
  moves(piles, moves) {
    const out = [];
    piles.forEach((p, i) => (moves ? moves.filter(m => m <= p) : range(p).map(x => x + 1)).forEach(t => { const nx = piles.slice(); nx[i] -= t; out.push({ i, t, nx }); }));
    return out;
  },
  win(piles, moves, misere, memo) {
    const key = piles.slice().sort((a, b) => a - b).join(',');
    if (memo.has(key)) return memo.get(key);
    const ms = Nim.moves(piles, moves);
    const w = ms.length ? ms.some(m => !Nim.win(m.nx, moves, misere, memo)) : !!misere;
    memo.set(key, w); return w;
  },
  best(piles, moves, misere, memo) { return Nim.moves(piles, moves).filter(m => !Nim.win(m.nx, moves, misere, memo)); }
};
TaskTypes.nim = {
  mount(box, task, ctx) {
    const d = task.data, D = ctx.session.data, memo = new Map(), single = !!d.moves;
    const init = () => ({ piles: d.piles.slice(), turn: d.first, log: [], over: false });
    if (!D.g) D.g = init();
    let sel = null, timer = null;
    const board = h('div', { class: 'nimboard' }), ctl = h('div', { class: 'nimctl' }), msg = h('div', { class: 'ferry-msg', role: 'status', 'aria-live': 'polite' }), log = h('ul', { class: 'nimlog' });
    ctx.cleanup(() => clearTimeout(timer));
    const total = () => D.g.piles.reduce((a, b) => a + b, 0);
    function draw() {
      const g = D.g; board.replaceChildren(); ctl.replaceChildren();
      g.piles.forEach((p, i) => {
        const row = h('div', { class: 'nimpile' }, h('span', { class: 'pl' }, single ? t('nimPile') : `${t('nimPile')} ${i + 1}`), h('b', { class: 'pc' }, p));
        const toks = h('div', { class: 'toks' });
        range(p).forEach(j => {
          const picked = !single && sel && sel.i === i && j >= p - sel.t;
          toks.append(h('button', { type: 'button', class: 'tok' + (picked ? ' sel' : ''), disabled: single || g.turn !== 'you' || g.over, 'aria-label': `${t('nimToken')} ${j + 1}`, onclick: () => { sel = { i, t: p - j }; draw(); } }, picked ? '✕' : '●'));
        });
        row.append(toks); board.append(row);
      });
      if (g.turn === 'you' && !g.over) {
        if (single) d.moves.filter(m => m <= g.piles[0]).forEach(m => ctl.append(h('button', { type: 'button', class: 'btn primary', onclick: () => play(0, m) }, t('nimTake', { n: m }))));
        else if (sel) ctl.append(h('button', { type: 'button', class: 'btn primary', onclick: () => play(sel.i, sel.t) }, t('nimTakeFrom', { n: sel.t, p: sel.i + 1 })), h('button', { type: 'button', class: 'btn ghost small', onclick: () => { sel = null; draw(); } }, t('cancel')));
        else ctl.append(h('p', { class: 'muted' }, t('nimPickHint')));
      }
      msg.textContent = g.over ? '' : g.turn === 'you' ? t('nimYourTurn') : t('nimCpuTurn');
      log.replaceChildren(...g.log.slice(-4).map(x => h('li', null, (x.who === 'you' ? t('nimYouTook') : t('nimCpuTook')) + ' ' + x.t + (single ? '' : ` (${t('nimPile')} ${x.i + 1})`))));
    }
    function finish(lastWho) {
      const winner = d.misere ? (lastWho === 'you' ? 'cpu' : 'you') : lastWho;
      D.g.over = true;
      if (winner === 'you') { draw(); ctx.solved(); return; }
      draw();
      ctx.wrong(S('Tentoraz vyhral počítač – ale ty môžeš hru skúsiť znova! Premýšľaj, ktorý ťah nechá súperovi „prehrávajúcu“ pozíciu.', 'The computer won this time – but you can play again! Think about which move leaves your opponent a “losing” position.'));
      D.g = init(); sel = null; draw(); schedule();
    }
    function play(i, tk) {
      const g = D.g; if (g.turn !== 'you' || g.over) return;
      g.piles[i] -= tk; g.log.push({ who: 'you', t: tk, i }); sel = null;
      if (!Nim.moves(g.piles, d.moves).length) return finish('you');
      g.turn = 'cpu'; draw(); schedule();
    }
    function cpu() {
      const g = D.g; if (g.turn !== 'cpu' || g.over) return;
      const best = Nim.best(g.piles, d.moves, d.misere, memo), all = Nim.moves(g.piles, d.moves);
      const m = (best.length ? best : all)[Math.floor(Math.random() * (best.length || all.length))];
      g.piles[m.i] -= m.t; g.log.push({ who: 'cpu', t: m.t, i: m.i });
      if (!Nim.moves(g.piles, d.moves).length) return finish('cpu');
      g.turn = 'you'; draw();
    }
    function schedule() { clearTimeout(timer); if (D.g.turn === 'cpu' && !D.g.over) timer = setTimeout(cpu, ctx.session.fast ? 0 : 750); }
    box.append(board, msg, ctl, log, h('button', { type: 'button', class: 'btn ghost small', onclick: () => { D.g = init(); sel = null; draw(); schedule(); } }, t('restart')));
    draw(); schedule(); ctx.setCheck(null);
    return {
      dynHint(idx) {
        const g = D.g; if (g.turn !== 'you' || g.over) return null;
        const best = Nim.best(g.piles, d.moves, d.misere, memo);
        if (!best.length) return { text: S('Z tejto pozície už vyhrávajúci ťah nie je – počítač by musel urobiť chybu. Skús hru začať znova a sleduj, kde sa to zlomilo.', 'There is no winning move from here – the computer would have to slip. Restart and watch where it went wrong.') };
        if (idx <= 1) {
          if (single) { const lose = range(g.piles[0] + 1).filter(n => !Nim.win([n], d.moves, d.misere, memo)); return { text: S(`Hľadaj ťah, po ktorom zostane súperovi „prehrávajúci“ počet. Takéto počty sú: ${lose.join(', ')}.`, `Look for a move that leaves your opponent a “losing” count. Those counts are: ${lose.join(', ')}.`) }; }
          return { text: S('Hľadaj ťah, po ktorom je súper v prehrávajúcej pozícii. Pri dvoch kopách ich skús vyrovnať.', 'Look for a move that leaves your opponent in a losing position. With two piles, try to make them equal.') };
        }
        const m = best[0];
        return { text: S(`Vezmi ${m.t}${single ? '' : ' z ' + (m.i + 1) + '. kopy'}.`, `Take ${m.t}${single ? '' : ' from pile ' + (m.i + 1)}.`) };
      }
    };
  },
  explainSteps(task) {
    const d = task.data, memo = new Map(), single = !!d.moves, steps = [];
    if (single) {
      const N = d.piles[0], lose = range(N + 1).filter(n => !Nim.win([n], d.moves, d.misere, memo));
      steps.push({ text: S(`Najprv zistíme „prehrávajúce“ počty – ak na kope zostane taký počet a si na ťahu, súper ťa vždy prekoná. Sú to: ${lose.join(', ')}.`, `First find the “losing” counts – if you are to move at such a count, your opponent can always beat you. They are: ${lose.join(', ')}.`) });
      const best = Nim.best(d.piles, d.moves, d.misere, memo);
      steps.push({ text: d.first === 'you' ? S(`Začínaš pri ${N}: vezmi ${best[0].t}, aby zostalo ${N - best[0].t} (prehrávajúci počet pre súpera). Potom vždy dopĺňaj jeho ťah tak, aby si znova trafil prehrávajúci počet.`, `You start at ${N}: take ${best[0].t} to leave ${N - best[0].t} (a losing count for your opponent). Then always answer so that you land on a losing count again.`) : S(`Počítač začína pri ${N}, čo je prehrávajúci počet pre hráča na ťahu. Nech urobí akýkoľvek ťah, ty odpovieš tak, aby si znova nechal súperovi prehrávajúci počet.`, `The computer starts at ${N}, a losing count for the player to move. Whatever it does, answer by leaving a losing count again.`) });
    } else {
      const x = d.piles.reduce((a, b) => a ^ b, 0);
      steps.push({ text: S(`Spočítame „nim-súčet“ (XOR) veľkostí kôp ${d.piles.join(', ')} v dvojkovej sústave: je ${x}. Ak je 0, hráč na ťahu prehráva; inak vie ťahom dosiahnuť 0.`, `Compute the “nim-sum” (XOR) of the pile sizes ${d.piles.join(', ')} in binary: it is ${x}. If 0, the player to move loses; otherwise a move can make it 0.`) });
      if (d.piles.length === 2) steps.push({ text: S('Pri dvoch kopách stačí kopy vyrovnať: z väčšej vezmi rozdiel. Potom opakuj súperov ťah na druhej kope.', 'With two piles just equalise them: take the difference from the bigger one. Then mirror your opponent on the other pile.') });
      if (d.misere) steps.push({ text: S('Pri hre „kto vezme poslednú, prehráva“ hraj rovnako, kým nezostanú iba kopy s 1 zápalkou – vtedy nechaj súperovi nepárny počet takých kôp.', 'In the “last one loses” version play the same until only piles of size 1 remain – then leave your opponent an odd number of such piles.') });
      const best = Nim.best(d.piles, null, d.misere, memo);
      if (d.first === 'you' && best.length) steps.push({ text: S(`Tu vyhráš napríklad ťahom: vezmi ${best[0].t} z ${best[0].i + 1}. kopy.`, `Here you win with, for example: take ${best[0].t} from pile ${best[0].i + 1}.`) });
    }
    return steps;
  }
};
