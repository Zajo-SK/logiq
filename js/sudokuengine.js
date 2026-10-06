'use strict';
/* LogiQ – Sudoku engine: uniqueness solver + human-technique rater (used to grade levels and to give technique hints).
   Techniques, in order of difficulty: 0 naked single · 1 hidden single · 2 locked candidates (pointing/claiming) · 3 naked pair · 4 hidden pair · 5 naked triple · 6 X-Wing */
const SudokuEngine = (function () {
  const dims = n => n === 3 ? [1, 3] : n === 4 ? [2, 2] : n === 6 ? [2, 3] : [3, 3];
  const pop = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
  const geo = {};
  function geometry(n) {
    if (geo[n]) return geo[n];
    const [br, bc] = dims(n), N = n * n, units = [];
    for (let r = 0; r < n; r++) units.push(Array.from({ length: n }, (_, c) => r * n + c));
    for (let c = 0; c < n; c++) units.push(Array.from({ length: n }, (_, r) => r * n + c));
    if (br > 1) for (let r0 = 0; r0 < n; r0 += br) for (let c0 = 0; c0 < n; c0 += bc) { const u = []; for (let i = 0; i < br; i++) for (let j = 0; j < bc; j++) u.push((r0 + i) * n + c0 + j); units.push(u); }
    const unitsOf = Array.from({ length: N }, () => []); units.forEach((u, ui) => u.forEach(c => unitsOf[c].push(ui)));
    const peers = unitsOf.map((us, i) => [...new Set(us.flatMap(ui => units[ui]).filter(c => c !== i))]);
    return geo[n] = { n, br, bc, N, units, unitSets: units.map(u => new Set(u)), unitsOf, peers, full: (1 << n) - 1 };
  }
  const unitName = (n, ui) => ui < n ? { kind: 'row', k: ui + 1 } : ui < 2 * n ? { kind: 'col', k: ui - n + 1 } : { kind: 'box', k: ui - 2 * n + 1 };

  function countSolutions(g, n, limit) {
    const G = geometry(n), grid = g.slice(); let count = 0, sol = null;
    const cand = i => { let m = G.full; for (const p of G.peers[i]) if (grid[p]) m &= ~(1 << (grid[p] - 1)); return m; };
    (function rec() {
      if (count >= limit) return;
      let best = -1, bm = 0, bcnt = 99;
      for (let i = 0; i < G.N; i++) if (!grid[i]) { const m = cand(i), c = pop(m); if (c < bcnt) { bcnt = c; best = i; bm = m; if (c <= 1) break; } }
      if (best < 0) { count++; if (!sol) sol = grid.slice(); return; }
      for (let d = 0; d < n; d++) if (bm >> d & 1) { grid[best] = d + 1; rec(); grid[best] = 0; if (count >= limit) return; }
    })();
    return { count, sol };
  }

  /* ---- human techniques ---- */
  function newCtx(g, n) {
    const G = geometry(n), grid = g.slice(), cand = new Array(G.N).fill(0);
    for (let i = 0; i < G.N; i++) if (!grid[i]) { let m = G.full; for (const p of G.peers[i]) if (grid[p]) m &= ~(1 << (grid[p] - 1)); cand[i] = m; }
    return { G, grid, cand };
  }
  const bits = m => { const o = []; for (let d = 0; m >> d; d++) if (m >> d & 1) o.push(d + 1); return o; };
  const T = [
    /* 0 naked single */ ({ G, grid, cand }) => { for (let i = 0; i < G.N; i++) if (!grid[i] && cand[i] && !(cand[i] & (cand[i] - 1))) return { t: 0, place: [i, bits(cand[i])[0]], cells: [i] }; return null; },
    /* 1 hidden single */ ({ G, grid, cand }) => {
      for (let ui = 0; ui < G.units.length; ui++) for (let d = 0; d < G.n; d++) { const ps = G.units[ui].filter(c => !grid[c] && (cand[c] >> d & 1)); if (ps.length === 1) return { t: 1, place: [ps[0], d + 1], cells: ps, unit: ui }; }
      return null;
    },
    /* 2 locked candidates */ ({ G, grid, cand }) => {
      for (let ui = 0; ui < G.units.length; ui++) for (let d = 0; d < G.n; d++) {
        const ps = G.units[ui].filter(c => !grid[c] && (cand[c] >> d & 1)); if (ps.length < 2) continue;
        for (let vi = 0; vi < G.units.length; vi++) { if (vi === ui || !ps.every(c => G.unitSets[vi].has(c))) continue;
          const el = G.units[vi].filter(c => !G.unitSets[ui].has(c) && !grid[c] && (cand[c] >> d & 1)); if (el.length) return { t: 2, elim: el.map(c => [c, 1 << d]), cells: ps, unit: ui, unit2: vi, digit: d + 1 }; }
      }
      return null;
    },
    /* 3 naked pair */ c => nakedSubset(c, 2, 3),
    /* 4 hidden pair */ ({ G, grid, cand }) => {
      for (let ui = 0; ui < G.units.length; ui++) { const U = G.units[ui], pos = d => U.filter(c => !grid[c] && (cand[c] >> d & 1));
        for (let a = 0; a < G.n; a++) for (let b = a + 1; b < G.n; b++) { const pa = pos(a); if (pa.length !== 2) continue; const pb = pos(b); if (pb.length !== 2 || pa[0] !== pb[0] || pa[1] !== pb[1]) continue;
          const keep = (1 << a) | (1 << b), el = pa.filter(c => cand[c] & ~keep).map(c => [c, cand[c] & ~keep]); if (el.length) return { t: 4, elim: el, cells: pa, unit: ui, digits: [a + 1, b + 1] }; } }
      return null;
    },
    /* 5 naked triple */ c => nakedSubset(c, 3, 5),
    /* 6 X-Wing */ ({ G, grid, cand }) => {
      const n = G.n; if (n < 4) return null;
      for (const rowMode of [true, false]) for (let d = 0; d < n; d++) {
        const lines = []; for (let a = 0; a < n; a++) { const ps = []; for (let b = 0; b < n; b++) { const i = rowMode ? a * n + b : b * n + a; if (!grid[i] && (cand[i] >> d & 1)) ps.push(b); } lines.push(ps); }
        for (let a1 = 0; a1 < n; a1++) for (let a2 = a1 + 1; a2 < n; a2++) { const p = lines[a1], q = lines[a2]; if (p.length !== 2 || q.length !== 2 || p[0] !== q[0] || p[1] !== q[1]) continue;
          const el = []; for (let a = 0; a < n; a++) if (a !== a1 && a !== a2) for (const b of p) { const i = rowMode ? a * n + b : b * n + a; if (!grid[i] && (cand[i] >> d & 1)) el.push([i, 1 << d]); }
          if (el.length) return { t: 6, elim: el, cells: [a1, a2].flatMap(a => p.map(b => rowMode ? a * n + b : b * n + a)), digit: d + 1 }; }
      }
      return null;
    }
  ];
  function nakedSubset({ G, grid, cand }, k, tech) {
    for (let ui = 0; ui < G.units.length; ui++) {
      const cs = G.units[ui].filter(c => !grid[c] && pop(cand[c]) >= 2 && pop(cand[c]) <= k); if (cs.length < k) continue;
      const rec = (start, chosen, mask) => {
        if (chosen.length === k) { if (pop(mask) !== k) return null; const el = G.units[ui].filter(c => !grid[c] && !chosen.includes(c) && (cand[c] & mask)).map(c => [c, cand[c] & mask]); return el.length ? { t: tech, elim: el, cells: chosen.slice(), unit: ui, digits: bits(mask) } : null; }
        for (let i = start; i < cs.length; i++) { const nm = mask | cand[cs[i]]; if (pop(nm) > k) continue; chosen.push(cs[i]); const r = rec(i + 1, chosen, nm); chosen.pop(); if (r) return r; }
        return null;
      };
      const r = rec(0, [], 0); if (r) return r;
    }
    return null;
  }
  function apply(ctx, st) {
    if (st.place) { const [i, d] = st.place; ctx.grid[i] = d; ctx.cand[i] = 0; for (const p of ctx.G.peers[i]) ctx.cand[p] &= ~(1 << (d - 1)); }
    else st.elim.forEach(([c, m]) => { ctx.cand[c] &= ~m; });
  }
  const findStep = (ctx, maxTech = 6) => { for (let t = 0; t <= maxTech; t++) { const s = T[t](ctx); if (s) return s; } return null; };
  function rate(g, n, maxTech = 6) {
    const ctx = newCtx(g, n); let max = -1, steps = 0;
    for (let guard = 0; guard < 2000; guard++) {
      if (ctx.grid.every(v => v)) return { solved: true, max: Math.max(max, 0), steps };
      const s = findStep(ctx, maxTech); if (!s) return { solved: false, max: 7, steps };
      apply(ctx, s); steps++; if (s.t > max) max = s.t;
    }
    return { solved: false, max: 7, steps };
  }
  /* next logical step for the CURRENT board (hints) */
  function nextStep(g, n) { const ctx = newCtx(g, n); return findStep(ctx, 6); }

  /* ---- puzzle transforms (keep difficulty) ---- */
  function transform(str, n, rnd) {
    const [br, bc] = dims(n), g = [...str].map(Number), perm = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const grp = (cnt, size) => perm(Array.from({ length: cnt }, (_, i) => i)).flatMap(x => perm(Array.from({ length: size }, (_, i) => i)).map(y => x * size + y));
    const rows = grp(n / br, br), cols = grp(n / bc, bc), dg = perm(Array.from({ length: n }, (_, i) => i + 1)), tr = br === bc && rnd() < .5;
    const out = new Array(n * n); for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const v = g[rows[r] * n + cols[c]]; const rr = tr ? c : r, cc = tr ? r : c; out[rr * n + cc] = v ? dg[v - 1] : 0; }
    return out;
  }
  return { dims, geometry, countSolutions, rate, nextStep, newCtx, findStep, apply, transform, unitName, bits };
})();
if (typeof module !== 'undefined') module.exports = SudokuEngine;
