'use strict';
/* LogiQ – leaping frogs: n frogs → on the left, n frogs ← on the right, one empty lily pad. A frog steps to the free pad ahead or jumps over ONE frog of the other kind.
   Fewest moves = n² + 2n (the jump rule: over any ONE frog if the pad behind it is free). Used as: interactive task, "how many moves" task with a try-it panel, and a stand-alone game. */
const Frogs = {
  start: n => '>'.repeat(n) + '_' + '<'.repeat(n),
  goal: n => '<'.repeat(n) + '_' + '>'.repeat(n),
  moves(s) {
    const out = [];
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '>') { if (s[i + 1] === '_') out.push([i, i + 1]); else if (s[i + 1] !== '_' && s[i + 2] === '_') out.push([i, i + 2]); }
      else if (s[i] === '<') { if (s[i - 1] === '_') out.push([i, i - 1]); else if (s[i - 1] !== '_' && s[i - 2] === '_') out.push([i, i - 2]); }
    }
    return out;
  },
  apply(s, [a, b]) { const x = [...s]; [x[a], x[b]] = [x[b], x[a]]; return x.join(''); },
  solve(s, n) {
    const goal = Frogs.goal(n), prev = new Map([[s, null]]), q = [s];
    for (let h0 = 0; h0 < q.length; h0++) {
      const cur = q[h0]; if (cur === goal) break;
      for (const m of Frogs.moves(cur)) { const nx = Frogs.apply(cur, m); if (!prev.has(nx)) { prev.set(nx, [cur, m]); q.push(nx); } }
    }
    if (!prev.has(goal)) return null;
    const path = []; let c = goal; while (prev.get(c)) { const [p, m] = prev.get(c); path.unshift({ from: p, move: m, to: c }); c = p; } return path;
  }
};
const FROG_THEMES = [{ a: '🐸', b: '🐸', brown: true }, { a: '🐰', b: '🐻' }, { a: '🐭', b: '🐱' }, { a: '🦆', b: '🐔' }];
const FROG_RULES = S('Zelené 🐸 skáču len doprava →, hnedé len doľava ←. Krok na voľný lístok alebo skok cez jednu žabku (akúkoľvek), ak je za ňou voľné miesto. Späť sa nedá. Vymeň ich miesta!', 'Green 🐸 only hop right →, brown ones only left ←. Step to the free pad, or jump over ONE frog (any colour) if the pad behind it is free. No going back. Swap their places!');
const frogsIntro = () => `<div class="intro-in"><p>${esc(tx(FROG_RULES))}</p><div class="frogs demo" style="--n:5">${['>', '>', '_', '<', '<'].map((c, i) => `<span class="pad">${c === '_' ? '' : `<span class="frog ${c === '>' ? 'g' : 'b'}">🐸<i>${c === '>' ? '→' : '←'}</i></span>`}</span>`).join('')}</div></div>`;

/* shared widget: returns {el, dynHint, reset} */
function frogsWidget(n, S0, opts = {}) {
  const theme = opts.theme || FROG_THEMES[0];
  if (!S0.s) { S0.s = Frogs.start(n); S0.moves = 0; S0.hist = []; }
  const row = h('div', { class: 'frogs', style: `--n:${2 * n + 1}` }), msg = h('div', { class: 'ferry-msg', role: 'status', 'aria-live': 'polite' }), info = h('p', { class: 'ferry-info' }), ctl = h('div', { class: 'ferry-controls' });
  let hop = -1, hl = -1, busy = false, timer = null; if (opts.cleanup) opts.cleanup(() => clearTimeout(timer));
  const min = n * n + 2 * n;
  function draw() {
    row.replaceChildren(...[...S0.s].map((c, i) => h('button', { type: 'button', class: 'pad' + (i === hop ? ' hop' : '') + (i === hl ? ' hint' : ''), disabled: busy, 'aria-label': `${L2('lístok', 'pad')} ${i + 1}: ${c === '_' ? L2('voľný', 'free') : c === '>' ? L2('žabka doprava', 'frog going right') : L2('žabka doľava', 'frog going left')}`, onclick: () => tap(i) },
      c === '_' ? null : h('span', { class: 'frog ' + (c === '>' ? 'g' : 'b') + (c === '<' && theme.brown ? ' brown' : '') }, c === '>' ? theme.a : theme.b, h('i', { 'aria-hidden': 'true' }, c === '>' ? '→' : '←')))));
    info.textContent = `${t('moves')}: ${S0.moves} · ${t('hanoiMin')}: ${min}`;
  }
  function doMove(mv) {
    S0.hist.push(S0.s); S0.s = Frogs.apply(S0.s, mv); S0.moves++; hop = mv[1]; hl = -1; msg.textContent = ''; simTap(); draw();
    if (S0.s === Frogs.goal(n)) { if (opts.onSolved) opts.onSolved(S0.moves); }
    else if (!Frogs.moves(S0.s).length) msg.textContent = L2('Zasekol si sa 🙂 Vráť ťah späť alebo začni znova.', 'You are stuck 🙂 Undo a move or start again.');
  }
  function tap(i) { if (busy || S0.s[i] === '_') return; const mv = Frogs.moves(S0.s).find(m => m[0] === i); if (!mv) { msg.textContent = L2('Táto žabka teraz nemôže skočiť. Skús inú.', 'This frog cannot jump now. Try another.'); return; } doMove(mv); }
  const undo = () => { if (!S0.hist.length || busy) return; S0.s = S0.hist.pop(); S0.moves = Math.max(0, S0.moves - 1); hop = -1; hl = -1; msg.textContent = ''; draw(); };
  const reset = () => { S0.s = Frogs.start(n); S0.moves = 0; S0.hist = []; hop = -1; hl = -1; msg.textContent = ''; draw(); };
  function auto() { if (busy) return; const p = Frogs.solve(S0.s, n); if (!p || !p.length) return; busy = true; const step = () => { const x = p.shift(); if (!x) { busy = false; draw(); return; } doMove(x.move); timer = setTimeout(step, 520); }; draw(); timer = setTimeout(step, 300); }
  ctl.append(simBtn('↶ ' + t('undo'), undo), simBtn(t('restart'), reset), opts.free ? simBtn('💡 ' + t('hint'), () => { const p = Frogs.solve(S0.s, n); if (p && p[0]) { hl = p[0].move[0]; msg.textContent = L2(`Skús pohnúť žabku z lístka ${p[0].move[0] + 1}.`, `Try moving the frog on pad ${p[0].move[0] + 1}.`); draw(); } else msg.textContent = L2('Odtiaľto sa už nedá – vráť ťah späť.', 'No way forward from here – undo a move.'); }) : null, opts.free ? simBtn('▶ ' + t('hanoiAuto'), auto, 'primary small') : null);
  draw();
  return { el: [row, msg, info, ctl], reset,
    dynHint() { const p = Frogs.solve(S0.s, n); if (!p || !p.length) return { text: S('Odtiaľto sa už nedá – vráť ťah späť alebo začni znova.', 'There is no way forward from here – undo or restart.') }; const m = p[0].move; return { text: S(`Skús pohnúť žabku z lístka ${m[0] + 1} na lístok ${m[1] + 1}.`, `Try moving the frog from pad ${m[0] + 1} to pad ${m[1] + 1}.`), hl: () => { hl = m[0]; draw(); } }; } };
}

TaskTypes.frogs = {
  mount(box, task, ctx) {
    const d = task.data, theme = FROG_THEMES[d.theme || 0], w = frogsWidget(d.n, ctx.session.data, { theme, onSolved: () => ctx.solved(), cleanup: ctx.cleanup, free: !!d.free });
    box.append(...w.el); ctx.setCheck(null); return { dynHint: () => w.dynHint() };
  },
  explainSteps(task) {
    const n = task.data.n, p = Frogs.solve(Frogs.start(n), n), th = FROG_THEMES[task.data.theme || 0];
    const draw = s => h('div', { class: 'frogs demo', style: `--n:${s.length}` }, [...s].map(c => h('span', { class: 'pad' }, c === '_' ? null : h('span', { class: 'frog ' + (c === '>' ? 'g' : 'b') + (c === '<' && th.brown ? ' brown' : '') }, c === '>' ? th.a : th.b, h('i', null, c === '>' ? '→' : '←')))));
    return [{ text: S(`Trik: skáč tak, aby sa žabky striedali – posuň, preskoč, preskoč, posuň… (Skok cez žabku rovnakej farby nepomáha.) Najmenší počet ťahov je ${n}² + 2·${n} = ${p.length}.`, `Trick: keep the frogs alternating – step, jump, jump, step… (Jumping a same-colour frog does not help.) The fewest moves is ${n}² + 2·${n} = ${p.length}.`) },
      { text: S('Takto vyzerá celé riešenie:', 'Here is the whole solution:'), render: b => { b.append(draw(Frogs.start(n))); p.forEach(x => b.append(draw(x.to))); } }];
  }
};
SIM_KINDS.frogs = ({ n, theme }) => { const w = frogsWidget(n, {}, { theme: FROG_THEMES[theme || 0], free: true, cleanup: x => cleanups.push(x) }); return simWrap(L2('Skús to so žabkami: ťukni na žabku, ktorá má skočiť.', 'Try it with the frogs: tap the frog that should move.'), ...w.el); };

reg('frogs', 'logic', 2, c => {
  const { r, D } = c, n = clamp(2 + Math.floor(D * 4.2) + (r() < .25 ? 1 : 0), 2, 5), ti = ri(r, 0, FROG_THEMES.length - 1), th = FROG_THEMES[ti];
  return { title: S('Skákajúce žabky', 'Leaping frogs'), type: 'frogs', pts: 15, intro: frogsIntro, introTitle: S('Ako žabky skáču (prečítaj si pred úlohou)', 'How the frogs jump (read before the task)'),
    prompt: S(`${th.a}→ idú doprava, ${th.b}← doľava. Vymeň ich miesta!`, `${th.a}→ go right, ${th.b}← go left. Swap their places!`), data: { n, theme: ti },
    hints: [S('Skús najprv s menším počtom žabiek.', 'Try with fewer frogs first.'), 'dyn', 'dyn'], explain: [] };
});
reg('frogmoves', 'logic', 3, c => {
  const { r, D } = c, n = clamp(2 + Math.floor(D * 7) + ri(r, 0, 1), 2, 8), ti = ri(r, 0, FROG_THEMES.length - 1), th = FROG_THEMES[ti];
  return { title: S('Žabky: koľko ťahov?', 'Frogs: how many moves?'), type: 'number', sim: { kind: 'frogs', n: Math.min(n, 6), theme: ti }, intro: frogsIntro, introTitle: S('Ako žabky skáču (prečítaj si pred úlohou)', 'How the frogs jump (read before the task)'),
    prompt: S(`${n} × ${th.a}→ a ${n} × ${th.b}←. Koľko ťahov najmenej treba na výmenu? (krok aj skok = 1 ťah)`, `${n} × ${th.a}→ and ${n} × ${th.b}←. What is the fewest moves to swap them? (a step or a jump = 1 move)`), data: { answer: n * n + 2 * n },
    hints: [S('Zapíš si počet ťahov pre 1, 2 a 3 žabky.', 'Write down the moves for 1, 2 and 3 frogs.'), S('Počty ťahov sú 3, 8, 15, 24 … Nájdeš vzorec?', 'The move counts are 3, 8, 15, 24 … Can you find the formula?')],
    explain: [S(`Každá žabka → musí preskočiť každú žabku ←: to je ${n} · ${n} = ${n * n} skokov.`, `Every frog → must jump over every frog ←: that is ${n} · ${n} = ${n * n} jumps.`), S(`Okrem toho každá z ${2 * n} žabiek urobí jeden krok na voľný lístok: ${2 * n} krokov.`, `Besides that each of the ${2 * n} frogs makes one step to a free pad: ${2 * n} steps.`), S(`Spolu ${n * n} + ${2 * n} = ${n * n + 2 * n} ťahov.`, `In total ${n * n} + ${2 * n} = ${n * n + 2 * n} moves.`)] };
});

/* stand-alone game */
let frogsN = 3;
VIEWS.frogs = (v) => {
  const sg = st(); sg.games = sg.games || {}; sg.games.frogs = sg.games.frogs || {};
  const box = h('div', { class: 'playbox' }), S0 = {}, n = frogsN, best = sg.games.frogs[n], min = n * n + 2 * n;
  const w = frogsWidget(n, S0, { free: true, cleanup: x => cleanups.push(x), onSolved: mv => { const prev = sg.games.frogs[n]; if (!prev || mv < prev) { sg.games.frogs[n] = mv; Store.save(); } tone(SND.ok); confetti();
    const sh = openSheet(h('div', { class: 'sheetin result' }, h('div', { class: 'burst', 'aria-hidden': 'true' }, '🐸'), h('h2', null, L2('Žabky si vymenili miesta!', 'The frogs swapped places!')), h('p', { class: 'pts' }, `${t('moves')}: ${mv} · ${t('hanoiMin')}: ${min}`), mv === min ? h('p', { class: 'bonusline' }, '🏅 ' + L2('Najlepší možný počet ťahov!', 'The best possible number of moves!')) : h('p', { class: 'muted' }, L2('Dá sa to aj za menej ťahov – skús znova!', 'It can be done in fewer moves – try again!')), h('div', { class: 'btnrow' }, btn(t('close'), 'ghost', () => sh.close()), btn(t('playAgain'), 'primary', () => { sh.close(); render(); }))), { cls: 'center' }); } });
  box.append(...w.el);
  page(v, '🐸 ' + L2('Skákajúce žabky', 'Leaping frogs'), tx(FROG_RULES), h('p', { class: 'flabel' }, L2('Počet žabiek z každej strany', 'Frogs on each side')), h('div', { class: 'frow' }, [1, 2, 3, 4, 5, 6].map(k => h('button', { type: 'button', class: 'fchip' + (k === n ? ' on' : ''), 'aria-pressed': k === n, onclick: () => { frogsN = k; render(); } }, k))),
    h('article', { class: 'taskcard' }, h('details', { class: 'intro' }, h('summary', null, '📘 ' + L2('Pravidlá', 'Rules')), h('div', { html: frogsIntro() })), box, h('p', { class: 'muted' }, best ? `${t('hanoiBest')}: ${best}` : '')));
};
