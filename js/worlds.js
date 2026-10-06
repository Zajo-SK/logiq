'use strict';
/* LogiQ – worlds & levels per grade, built from the generators.
   Each grade has 8 worlds × 7 levels × 10 tasks = 560 tasks, all deterministic from (grade, world, slot). */
const WORLD_DEFS = [
  { key: 'strat', icon: '🎮', color: '#6a4cf0', name: S('Hry a stratégia', 'Games & strategy'), desc: S('Nájdi víťaznú stratégiu a poraz počítač.', 'Find the winning strategy and beat the computer.'), fams: ['subgame', 'nimplay', 'pilesgame', 'chocolate', 'knockout'] },
  { key: 'truth', icon: '🕵️', color: '#0a8f9a', name: S('Pravda, lož a dedukcia', 'Truth, lies & deduction'), desc: S('Rytieri, luhári, podozriví a tajné čísla.', 'Knights, liars, suspects and secret numbers.'), fams: ['knights', 'culprit', 'numberclue', 'oddone', 'compare'] },
  { key: 'logic', icon: '🧠', color: '#b3417a', name: S('Logické uvažovanie', 'Logical reasoning'), desc: S('Poradia, priradenia a správne závery.', 'Orderings, matchings and valid conclusions.'), fams: ['ordering', 'assign', 'syllogism', 'emopattern', 'frogmoves'] },
  { key: 'combi', icon: '🎲', color: '#c46b00', name: S('Kombinatorika', 'Combinatorics'), desc: S('Koľkými spôsobmi sa to dá? Počítaj múdro.', 'In how many ways? Count cleverly.'), fams: ['perm', 'choose', 'product', 'pathgrid', 'pigeon', 'multiset', 'picmath', 'sharing'] },
  { key: 'num', icon: '🔢', color: '#2f6fd1', name: S('Čísla a vzory', 'Numbers & patterns'), desc: S('Rady, magické štvorce, kryptogramy.', 'Sequences, magic squares, cryptarithms.'), fams: ['seq', 'magic', 'symbols', 'cryptarithm', 'numline'] },
  { key: 'space', icon: '🧊', color: '#0f8a5f', name: S('Priestor a tvary', 'Space & shapes'), desc: S('Kocky, mriežky, obsahy a stavby.', 'Cubes, grids, areas and buildings.'), fams: ['paintedcube', 'squares', 'towers', 'areas', 'shapecount'] },
  { key: 'puzzle', icon: '🧩', color: '#7a4cc4', name: S('Hlavolamy', 'Brain-teasers'), desc: S('Sudoku, svetlá, bludiská, mosty a džbány.', 'Sudoku, lights, mazes, bridges and jugs.'), fams: ['sudoku', 'lights', 'maze', 'frogs', 'bridge', 'jugs', 'weighing'] },
  { key: 'chess', icon: '♟️', color: '#1d6f6f', name: S('Šach a Hanoj', 'Chess & Hanoi'), desc: S('Ako sa hýbu figúrky, domino a Hanojské veže.', 'How the pieces move, dominoes and the Tower of Hanoi.'), fams: ['chessmoves', 'chessreach', 'chessnon', 'chessplay', 'domino', 'rice', 'hanoi'] },
  { key: 'olymp', icon: '🏆', color: '#a8341f', name: S('Matematická olympiáda', 'Maths olympiad'), desc: S('Algebra, deliteľnosť, pravdepodobnosť a čas.', 'Algebra, divisibility, probability and time.'), fams: ['algebra', 'numtheory', 'prob', 'percent', 'clock', 'maketen', 'missing'] }
];
const LEVEL_NAMES = [S('Rozcvička', 'Warm-up'), S('Prvé kroky', 'First steps'), S('Naberáme tempo', 'Picking up speed'), S('Výzva', 'Challenge'), S('Hlbšie myslenie', 'Deeper thinking'), S('Majster', 'Master'), S('Šampión', 'Champion')];
const LEVELS_PER_WORLD = 7, TASKS_PER_LEVEL = 10;
const FERRY_BY_GRADE = { 2: 'ferry_classic', 3: 'ferry_classic', 4: 'ferry_fox', 5: 'ferry_fox', 6: 'ferry_mc22', 7: 'ferry_mc22', 8: 'ferry_mc33', 9: 'ferry_mc33' };

const famOk = (f, g) => GF[f].min <= g && (GF[f].max == null || g <= GF[f].max);
const _worldCache = {};
function worldsFor(g) {
  if (_worldCache[g]) return _worldCache[g];
  return _worldCache[g] = WORLD_DEFS.map(def => {
    const fams = def.fams.filter(f => famOk(f, g)), F = fams.length;
    const w = { id: `w${g}-${def.key}`, key: def.key, grade: g, band: bandOf(g), icon: def.icon, color: def.color, name: def.name, desc: def.desc, levels: [] };
    for (let l = 0; l < LEVELS_PER_WORLD; l++) w.levels.push({
      id: `L${g}-${def.key}-${l + 1}`, grade: g, worldKey: def.key, name: LEVEL_NAMES[l],
      tasks: range(TASKS_PER_LEVEL).map(s => { const u = l * TASKS_PER_LEVEL + s; return def.key === 'puzzle' && u === 5 ? { static: FERRY_BY_GRADE[g], u } : { fam: fams[u % F], k: Math.floor(u / F), u }; })
    });
    return w;
  });
}
/* Difficulty D (0..1) rises smoothly through the whole 2nd–9th grade path: each grade owns one eighth of the scale,
   and inside a grade D climbs from the start of its band to the end, so grade g+1 starts where grade g ends. */
const gradeD = (g, u) => clamp(.03 + .94 * ((g - 2) + .12 + .88 * (u / 69)) / 8, 0, 1);
const relDiff = u => u / 69 < .34 ? 1 : u / 69 < .67 ? 2 : 3;
const levelCache = new Map(), famHist = new Map();
function makeOnce(fam, grade, D, k, seed) {
  const F = GF[fam];
  for (let a = 0; a < 12; a++) {
    let t = null;
    try { t = F.make({ r: rng(hash(seed + ':' + a)), g: grade, D, k, gb: (grade - 2) / 7, fam }); } catch (e) { console.error('gen error', fam, e); }
    if (t) { const diff = D < .34 ? 1 : D < .67 ? 2 : 3; return Object.assign({ cat: F.cat, band: bandOf(grade), diff, src: GEN, gen: fam, basePts: t.pts || 10 }, t, { pts: (t.pts || 10) * diff }); }
  }
  throw new Error('generator failed: ' + fam);
}
function buildTask(fam, grade, D, k, seed, id) { return Object.assign(makeOnce(fam, grade, D, k, seed), { id }); }
function sigOf(t) {
  const keep = LANG; LANG = 'sk';
  try { return JSON.stringify([tx(t.prompt), typeof t.visual === 'function' ? t.visual() : (t.visual || ''), t.data]); } finally { LANG = keep; }
}
/* Deterministic de-duplication: the k-th task of a family in a world is derived from the history of tasks 0..k-1,
   so a task id always yields the same task whatever order levels are opened in, and no two tasks of a grade are identical. */
function famTask(fam, grade, wkey, nF, idx, k) {
  const key = `${grade}:${wkey}:${fam}`; let hs = famHist.get(key); if (!hs) famHist.set(key, hs = { list: [], sigs: new Set() });
  while (hs.list.length <= k) {
    const kk = hs.list.length, u = kk * nF + idx, D = gradeD(grade, u); let t = null;
    for (let a = 0; a < 40; a++) { const cand = makeOnce(fam, grade, D, kk, `${key}:${kk}:${a}`), sg = sigOf(cand); t = cand; if (!hs.sigs.has(sg)) { hs.sigs.add(sg); break; } }
    const rd = relDiff(u); t = Object.assign({}, t, { diff: rd, pts: t.basePts * rd }); hs.list.push(t);
  }
  return hs.list[k];
}
function levelTasks(level) {
  if (levelCache.has(level.id)) return levelCache.get(level.id);
  const g = level.grade, nF = WORLD_DEFS.find(d => d.key === level.worldKey).fams.filter(f => famOk(f, g)).length;
  const out = level.tasks.map(sp => sp.static ? TASKS[sp.static] : Object.assign({}, famTask(sp.fam, g, level.worldKey, nF, sp.u % nF, sp.k), { id: `g:${g}:${level.worldKey}:${sp.u}` }));
  levelCache.set(level.id, out); return out;
}
function gradeSequence(g) {
  const out = []; worldsFor(g).forEach(w => w.levels.forEach((lv, i) => out.push({ world: w, level: lv, idx: i }))); return out;
}
function allLevels() { return range(8).flatMap(i => worldsFor(i + 2).flatMap(w => w.levels.map(level => ({ world: w, level })))); }
function trainTask(fam, grade, seedNo) {
  const D = gradeD(grade, 20 + Math.abs(seedNo) % 40);
  return buildTask(fam, grade, D, Math.abs(seedNo) % 12, `train:${grade}:${seedNo}`, `t:${fam}:${grade}:${seedNo}`);
}
