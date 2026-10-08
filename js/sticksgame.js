'use strict';
/* LogiQ – stand-alone "Sticks" training: a campaign of matches against the computer.
   Levels get harder: the computer plays more perfectly, the piles grow, rules get stranger, then misère and several piles. */
const STICK_LEVELS = 36;
const STICK_STAGES = [
  { to: 5, name: S('Rozcvička', 'Warm-up'), icon: '🌱' }, { to: 10, name: S('Prvé triky', 'First tricks'), icon: '🧭' }, { to: 16, name: S('Čudné pravidlá', 'Odd rules'), icon: '🧩' },
  { to: 22, name: S('Naopak: kto vezme poslednú, prehráva', 'Reversed: last one loses'), icon: '🔄' }, { to: 29, name: S('Dve kopy', 'Two piles'), icon: '♟️' }, { to: 36, name: S('Majster paličiek', 'Stick master'), icon: '👑' }
];
const stickStage = n => STICK_STAGES.find(s => n <= s.to) || STICK_STAGES[STICK_STAGES.length - 1];
let _stickCache = {};
function stickLevel(n) {
  if (_stickCache[n]) return _stickCache[n];
  const pool = (mode, filt) => nimCandidates(mode).filter(c => c.first === 'you' && filt(c));
  for (let i = 1; i < n; i++) stickLevel(i);
  const sig = c => JSON.stringify([c.piles, c.moves, c.misere]), used = new Set(Object.values(_stickCache).map(sig));
  const pk = (arr, k) => { if (!arr.length) return null; const sh = shuffle(arr, rng(hash('sticks' + n))); return sh.find(c => !used.has(sig(c))) || sh[k % sh.length]; };
  let cand = null, skill = 1;
  if (n <= 5) { skill = [.2, .3, .45, .6, .75][n - 1]; cand = pk(pool('A', c => c.moves.length <= 3 && c.piles[0] <= 8 + n * 2), n); }
  else if (n <= 10) { skill = [.8, .85, .9, .95, 1][n - 6]; cand = pk(pool('A', c => c.piles[0] >= 11 && !c.misere), n); }
  else if (n <= 16) { skill = 1; cand = pk(pool('B', c => !c.misere && c.piles[0] >= 14 + (n - 11) * 2), n); }
  else if (n <= 22) { skill = 1; cand = pk(pool('B', c => c.misere && c.moves.includes(1)), n) || pk(pool('B', c => true), n); if (cand && !cand.misere) cand = Object.assign({}, cand, { misere: true }); }
  else if (n <= 29) { skill = n < 26 ? .9 : 1; cand = pk(pool('C', c => c.piles.length === 2 && !c.misere && c.piles[0] !== c.piles[1]), n); }
  else { skill = 1; cand = pk(pool('C', c => c.piles.length === 3 && c.piles.reduce((a, b) => a + b, 0) >= 12), n); }
  if (!cand) cand = nimCandidates('A').find(c => c.first === 'you');
  // misère cases must still be winning for the player when he starts
  if (cand.misere) { const w = Nim.win(cand.piles, cand.moves, true, new Map()); if (!w) cand = Object.assign({}, cand, { misere: false }); }
  return _stickCache[n] = Object.assign({}, cand, { first: 'you', skill });
}
function stickRules(d) {
  const single = !!d.moves;
  return both(l => (single
    ? (l === 'sk' ? `🪵 Je tu ${d.piles[0]} paličiek. Berieš ${mkMoves(d.moves, 'sk')}.` : `🪵 There are ${d.piles[0]} sticks. You take ${mkMoves(d.moves, 'en')}.`)
    : (l === 'sk' ? `🪵 ${d.piles.length === 2 ? 'Dve' : 'Tri'} kopy: ${d.piles.join(', ')}. Z jednej kopy vezmi koľko chceš.` : `🪵 ${d.piles.length} piles: ${d.piles.join(', ')}. Take as many as you like from one pile.`))
    + ' ' + (l === 'sk' ? (d.misere ? 'Kto vezme poslednú, PREHRÁVA.' : 'Kto vezme poslednú, vyhráva.') : (d.misere ? 'Whoever takes the last one LOSES.' : 'Whoever takes the last one wins.')) + ' ' + (l === 'sk' ? 'Začínaš ty.' : 'You start.'));
}
let stickPlay = 0;
VIEWS.sticks = (v, [arg]) => {
  const sg = st(); sg.games = sg.games || {}; const G = sg.games.sticks = sg.games.sticks || { level: 1, done: {} };
  const lvl = +arg || 0;
  if (!lvl) {
    const cur = Math.min(G.level, STICK_LEVELS), doneN = Object.keys(G.done).length;
    page(v, '🪵 ' + L2('Paličky – tréning', 'Sticks – training'), L2('Hraj proti počítaču. Najprv je ľahký, potom hrá čoraz lepšie a pravidlá sa menia. Vyhraj level a odomkneš ďalší.', 'Play against the computer. At first it is easy, then it plays better and the rules change. Win a level to unlock the next.'),
      card('', h('div', { class: 'statrow tight' }, h('div', { class: 'stat' }, h('b', null, `${doneN}/${STICK_LEVELS}`), h('span', null, L2('levely', 'levels'))), h('div', { class: 'stat' }, h('b', null, tx(stickStage(cur).name)), h('span', null, L2('aktuálna etapa', 'current stage')))),
        h('div', { class: 'track', role: 'img', 'aria-label': Math.round(doneN / STICK_LEVELS * 100) + '%' }, h('div', { style: `width:${doneN / STICK_LEVELS * 100}%` })),
        h('div', { class: 'btnrow left' }, btn((doneN ? L2('Pokračovať', 'Continue') : L2('Začať', 'Start')) + ' – ' + L2('level ', 'level ') + cur + ' ▸', 'gold big', () => go('#/sticks/' + cur)))),
      STICK_STAGES.map((s, si) => { const from = si ? STICK_STAGES[si - 1].to + 1 : 1; return card('', h('h2', null, `${s.icon} ${tx(s.name)} `, h('small', { class: 'muted' }, `${from}–${s.to}`)),
        h('div', { class: 'frow bigchips' }, range(s.to - from + 1).map(i => { const n = from + i, open = n <= G.level, ok = G.done[n]; return h('button', { type: 'button', class: 'fchip' + (ok ? ' on' : ''), disabled: !open, 'aria-label': `${L2('Level', 'Level')} ${n}`, onclick: () => go('#/sticks/' + n) }, ok ? '✓ ' + n : open ? n : '🔒'); }))); }));
    return;
  }
  if (lvl > G.level || lvl < 1 || lvl > STICK_LEVELS) return go('#/sticks');
  const d = stickLevel(lvl), task = { id: 'sticks-' + lvl, title: S('Paličky', 'Sticks'), type: 'nim', data: d, prompt: stickRules(d) }, sess = { data: {}, hints: [], fast: false, attempts: 0 }, box = h('div', { class: 'playbox' }), hintBox = h('p', { class: 'muted', role: 'status' });
  let inst = null, hintN = 0, losses = 0;
  const ctx = { task, session: sess, setCheck() { }, nudge: toast, wrong(m) { losses++; toast(tx(m)); }, cleanup(fn) { cleanups.push(fn); },
    solved() {
      const first = !G.done[lvl]; G.done[lvl] = Math.max(G.done[lvl] || 0, losses === 0 ? 3 : losses < 3 ? 2 : 1); if (lvl >= G.level && lvl < STICK_LEVELS) G.level = lvl + 1;
      if (first) Store.addBonus(5 + lvl); Store.save(); renderHeader(route()); tone(SND.ok); confetti();
      const stars = G.done[lvl], sh = openSheet(h('div', { class: 'sheetin result' }, h('div', { class: 'burst', 'aria-hidden': 'true' }, '🏆'), h('h2', null, L2('Level ' + lvl + ' hotový!', 'Level ' + lvl + ' complete!')),
        h('div', { class: 'bigstars' }, range(3).map(i => h('span', { class: 'bs' + (i < stars ? ' on' : ''), style: `animation-delay:${.15 + i * .2}s` }, i < stars ? '★' : '☆'))),
        first ? h('p', { class: 'pts' }, '+' + (5 + lvl) + ' 💎') : null, h('p', { class: 'muted' }, losses ? L2(`Prehry v tomto leveli: ${losses}`, `Losses in this level: ${losses}`) : L2('Bez prehry – skvelé!', 'No losses – great!')),
        h('div', { class: 'btnrow' }, btn(L2('Zoznam levelov', 'Level list'), 'ghost', () => { sh.close(); go('#/sticks'); }), lvl < STICK_LEVELS ? btn(L2('Ďalší level', 'Next level') + ' ▸', 'primary', () => { sh.close(); go('#/sticks/' + (lvl + 1)); }) : btn(t('close'), 'primary', () => { sh.close(); go('#/sticks'); }))), { dismiss: true, cls: 'center' });
    } };
  const hintBtn = btn('💡 ' + L2('Nápoveda', 'Hint'), 'ghost small', () => { const x = inst && inst.dynHint ? inst.dynHint(Math.min(++hintN, 2)) : null; hintBox.textContent = x ? tx(x.text) : L2('Skús sa pozrieť na hru ešte raz.', 'Take another look at the game.'); });
  page(v, '🪵 ' + L2('Paličky – level ', 'Sticks – level ') + lvl, `${stickStage(lvl).icon} ${tx(stickStage(lvl).name)}`,
    h('button', { class: 'backlink', type: 'button', onclick: () => go('#/sticks'), html: ic('back') + `<span>${esc(L2('Levely', 'Levels'))}</span>` }),
    h('article', { class: 'taskcard' }, h('p', { class: 'lead' }, tx(task.prompt)), box, h('div', { class: 'btnrow left' }, hintBtn), hintBox));
  inst = TaskTypes.nim.mount(box, task, ctx);
};
