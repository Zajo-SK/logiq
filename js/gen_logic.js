'use strict';
/* LogiQ – task generators, part 1: helpers, strategy games, truth & deduction.
   Every generator computes its answer by search / formula and is seeded, so a task id always yields the same task.
   make({r, g, D, k, gb}) -> task fields; r = seeded rng, g = grade, D = difficulty 0..1, k = index of this family in the world. */
const GF = {};
const reg = (key, cat, min, make) => { GF[key] = { key, cat, min, make }; };
const lerp = (a, b, t) => Math.round(a + (b - a) * Math.max(0, Math.min(1, t)));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const fact = n => n <= 1 ? 1 : n * fact(n - 1);
const binom = (n, k) => { let x = 1; for (let i = 1; i <= k; i++) x = x * (n - k + i) / i; return Math.round(x); };
const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
const lcm = (a, b) => a / gcd(a, b) * b;
const fracStr = (a, b) => { const g = gcd(a, b); a /= g; b /= g; return b === 1 ? String(a) : a + '/' + b; };
const J = (arr, l) => arr.length < 2 ? String(arr[0] ?? '') : arr.slice(0, -1).join(', ') + (l === 'sk' ? ' a ' : ' and ') + arr[arr.length - 1];
const JO = (arr, l) => arr.length < 2 ? String(arr[0] ?? '') : arr.slice(0, -1).join(', ') + (l === 'sk' ? ' alebo ' : ' or ') + arr[arr.length - 1];
const NOUN = {
  stick: { sk: ['zápalka', 'zápalky', 'zápaliek'], en: ['stick', 'sticks'] },
  child: { sk: ['dieťa', 'deti', 'detí'], en: ['child', 'children'] },
  piece: { sk: ['kus', 'kusy', 'kusov'], en: ['piece', 'pieces'] },
  team: { sk: ['tím', 'tímy', 'tímov'], en: ['team', 'teams'] },
  coin: { sk: ['minca', 'mince', 'mincí'], en: ['coin', 'coins'] },
  person: { sk: ['človek', 'ľudia', 'ľudí'], en: ['person', 'people'] },
  minute: { sk: ['minúta', 'minúty', 'minút'], en: ['minute', 'minutes'] },
  step: { sk: ['krok', 'kroky', 'krokov'], en: ['step', 'steps'] },
  book: { sk: ['kniha', 'knihy', 'kníh'], en: ['book', 'books'] },
  cube: { sk: ['kocka', 'kocky', 'kociek'], en: ['cube', 'cubes'] },
  dial: { sk: ['kotúčik', 'kotúčiky', 'kotúčikov'], en: ['dial', 'dials'] }
};
const cnt = (n, key, l) => { const f = NOUN[key][l]; return l === 'sk' ? `${n} ${n === 1 ? f[0] : n >= 2 && n <= 4 ? f[1] : f[2]}` : `${n} ${n === 1 ? f[0] : f[1]}`; };
const names = (r, k) => shuffle(NM, r).slice(0, k);
const NM = ['Ema', 'Adam', 'Lea', 'Max', 'Nina', 'Oliver', 'Sofia', 'Filip', 'Zoe', 'Leo', 'Mia', 'Noah'];
const INS = { Ema: 'Emou', Adam: 'Adamom', Lea: 'Leou', Max: 'Maxom', Nina: 'Ninou', Oliver: 'Oliverom', Sofia: 'Sofiou', Filip: 'Filipom', Zoe: 'Zoe', Leo: 'Leom', Mia: 'Miou', Noah: 'Noahom' };
const LET = ['A', 'B', 'C', 'D', 'E', 'F'];
const pickOf = (arr, k, seedKey) => { const s = shuffle(arr, rng(hash(seedKey))); return s[k % s.length]; };
const vList = items => `<ul class="clues">${items.map(x => `<li>${x}</li>`).join('')}</ul>`;
const vEqs = lines => `<div class="eqs">${lines.map(x => `<p>${x}</p>`).join('')}</div>`;
const vGrid = rows => `<table class="vtab magic"><tbody>${rows.map(r => `<tr>${r.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const allPerms = n => { const out = []; const rec = (a, rest) => { if (!rest.length) { out.push(a); return; } rest.forEach((x, i) => rec([...a, x], rest.filter((_, j) => j !== i))); }; rec([], range(n)); return out; };
const mkMoves = (moves, l) => { const mx = Math.max(...moves); return moves.length > 1 && moves.every((m, i) => m === i + 1) ? (l === 'sk' ? `1 až ${mx}` : `1 to ${mx}`) : JO(moves, l); };

/* ---------- strategy ---------- */
const NIM_MOVESETS = { A: [[1, 2], [1, 2, 3], [1, 2, 3, 4]], B: [[1, 2, 3], [1, 3], [2, 3], [1, 3, 4], [1, 2, 5], [1, 2, 3, 4], [2, 3, 4]], C: [[1, 3, 4], [2, 3, 5], [1, 4, 5], [2, 5], [3, 4, 6], [1, 5, 6], [1, 2, 3, 4, 5], [2, 3, 7]] };
reg('subgame', 'strategy', 2, c => {
  const { r, D, k } = c, sets = D < .35 ? NIM_MOVESETS.A.concat(NIM_MOVESETS.B.slice(0, 2)) : D < .7 ? NIM_MOVESETS.B : NIM_MOVESETS.C;
  const moves = pick(sets, r), misere = D > .3 && r() < .35 && moves.includes(1), N = lerp(7, 44, D) + k;
  const win = [misere]; for (let n = 1; n <= N; n++) win[n] = moves.some(m => m <= n && !win[n - m]);
  const wm = moves.filter(m => m <= N && !win[N - m]), first = win[N] && wm.length === 1 && r() < .7;
  const lose = range(N + 1).filter(n => !win[n]), loseTxt = lose.length > 12 ? lose.slice(0, 12).join(', ') + ' …' : lose.join(', ');
  const rule = both(l => l === 'sk'
    ? `🪵 Je tu ${N} paličiek. Hráči sa striedajú a berú ${mkMoves(moves, 'sk')}. ${misere ? 'Kto vezme poslednú, PREHRÁVA.' : 'Kto vezme poslednú, vyhráva.'}`
    : `🪵 There are ${N} sticks. Players take turns taking ${mkMoves(moves, 'en')}. ${misere ? 'Whoever takes the last one LOSES.' : 'Whoever takes the last one wins.'}`);
  const q = first ? S('Začínaš ty. Koľko vezmeš ako prvý, aby si vyhral?', 'You start. How many do you take first to win?') : S('Začína 🐻. Obaja hrajú najlepšie, ako vedia – nikto sa nepomýli. Kto vyhrá?', '🐻 starts. Both play as well as they can – nobody makes a mistake. Who wins?');
  return {
    title: S('Paličky', 'Sticks'), prompt: both(l => rule[l] + ' ' + q[l]), type: first ? 'number' : 'choice', sim: N <= 60 ? { kind: 'sticks', N, moves, misere } : null,
    data: first ? { answer: wm[0] } : { options: [S('Začínajúci hráč', 'The first player'), S('Druhý hráč', 'The second player')], correct: win[N] ? 0 : 1, cols: 2 },
    hints: [S('Premýšľaj odzadu: pri akom počte zápaliek vyhráva ten, kto je na ťahu, a pri akom prehráva?', 'Think backwards: with how many matches does the player to move win, and with how many lose?'),
      S(`Prehrávajúce počty (pre hráča na ťahu) sú: ${loseTxt}. Je ${N} medzi nimi?`, `The losing counts (for the player to move) are: ${loseTxt}. Is ${N} among them?`)],
    explain: [S(`Hľadáme „prehrávajúce“ počty: ak na kope zostane taký počet a si na ťahu, súper ťa vždy prekoná. Sú to: ${loseTxt}.${misere ? ' (Poslednú zápalku nechceme, preto je prehrávajúce aj 1.)' : ''}`, `We look for “losing” counts: if you are to move at such a count your opponent can always beat you. They are: ${loseTxt}.${misere ? ' (We do not want the last match, so 1 is losing too.)' : ''}`),
      win[N] ? S(`Počet ${N} nie je prehrávajúci, takže začínajúci vyhráva: vezme ${wm[0]} a súperovi nechá ${N - wm[0]}.`, `${N} is not a losing count, so the first player wins: take ${wm[0]} and leave ${N - wm[0]}.`) : S(`Počet ${N} je prehrávajúci pre hráča na ťahu, preto vyhráva druhý hráč.`, `${N} is a losing count for the player to move, so the second player wins.`)]
  };
});

let _nimCand = {};
function nimCandidates(mode) {
  if (_nimCand[mode]) return _nimCand[mode];
  const out = [], memo = new Map();
  const add = (piles, moves, misere) => { const w = Nim.win(piles, moves, misere, new Map()); out.push({ piles, moves, misere, first: w ? 'you' : 'cpu' }); };
  if (mode === 'A') NIM_MOVESETS.A.forEach(m => range(16).forEach(i => add([7 + i], m, false)));
  else if (mode === 'B') NIM_MOVESETS.B.concat(NIM_MOVESETS.C).forEach(m => range(24).forEach(i => add([12 + i], m, i % 5 === 4 && m.includes(1))));
  else { for (let a = 2; a <= 8; a++) for (let b = a; b <= 8; b++) { add([a, b], null, false); if (b > a) add([a, b], null, true); for (let cc = b; cc <= 8; cc++) { add([a, b, cc], null, false); if (cc > 4) add([a, b, cc], null, true); } } }
  return _nimCand[mode] = out;
}
reg('nimplay', 'strategy', 2, c => {
  const { r, D, k, g } = c, mode = D < .3 ? 'A' : D < .6 ? 'B' : 'C', cand = pickOf(nimCandidates(mode), k, 'nim' + g + mode);
  const single = !!cand.moves;
  const rules = both(l => single
    ? (l === 'sk' ? `🪵 Je tu ${cand.piles[0]} paličiek. Berieš ${mkMoves(cand.moves, 'sk')}.` : `🪵 There are ${cand.piles[0]} sticks. You take ${mkMoves(cand.moves, 'en')}.`)
    : (l === 'sk' ? `🪵 ${cand.piles.length === 2 ? 'Dve' : 'Tri'} kopy: ${cand.piles.join(', ')}. Z jednej kopy vezmi koľko chceš.` : `🪵 ${cand.piles.length} piles: ${cand.piles.join(', ')}. Take as many as you like from one pile.`));
  const who = both(l => l === 'sk' ? (cand.first === 'you' ? 'Začínaš ty.' : 'Začína počítač.') : (cand.first === 'you' ? 'You start.' : 'The computer starts.'));
  const win = both(l => l === 'sk' ? (cand.misere ? 'Kto vezme poslednú, PREHRÁVA.' : 'Kto vezme poslednú, vyhráva.') : (cand.misere ? 'Whoever takes the last one LOSES.' : 'Whoever takes the last one wins.'));
  return {
    title: S('Hra proti počítaču', 'Game against the computer'), type: 'nim', pts: 15,
    prompt: both(l => `${rules[l]} ${win[l]} ${who[l]}`),
    data: cand, hints: [S('Premýšľaj odzadu: ktoré pozície sú pre hráča na ťahu prehrávajúce?', 'Think backwards: which positions are losing for the player to move?'), 'dyn', 'dyn'], explain: []
  };
});

let _pgCand = null;
function pilesCandidates() {
  if (_pgCand) return _pgCand;
  const out = [], memo = new Map();
  for (let a = 5; a <= 12; a++) for (let b = a + 1; b <= 12; b++) {
    out.push({ piles: [a, b], ans: b - a, who: null });
    for (let cc = b + 1; cc <= 12; cc++) { const best = Nim.best([a, b, cc], null, false, memo); if (best.length === 1) out.push({ piles: [a, b, cc], ans: best[0].t, from: [a, b, cc][best[0].i] }); }
  }
  for (let a = 5; a <= 12; a++) for (let b = a; b <= 12; b++) for (let cc = b; cc <= 12; cc++) if ((a ^ b ^ cc) === 0) out.push({ piles: [a, b, cc], who: 2 });
  return _pgCand = out;
}
reg('pilesgame', 'strategy', 3, c => {
  const { D, k, g } = c, all = pilesCandidates(), pool = all.filter(x => D < .45 ? x.piles.length === 2 : x.piles.length === 3), cand = pickOf(pool.length ? pool : all, k, 'pg' + g);
  const piles = cand.piles, x = piles.reduce((a, b) => a ^ b, 0);
  const rule = both(l => l === 'sk' ? `🪵 Kopy: ${piles.join(', ')}. Z jednej kopy vezmi koľko chceš. Kto vezme poslednú, vyhráva.` : `🪵 Piles: ${piles.join(', ')}. Take as many as you like from one pile. Whoever takes the last one wins.`);
  if (cand.who) return {
    title: S('Kto vyhrá? (kopy)', 'Who wins? (piles)'), prompt: both(l => rule[l] + ' ' + (l === 'sk' ? 'Kto vyhrá?' : 'Who wins?')), type: 'choice',
    data: { options: [S('Začínajúci hráč', 'The first player'), S('Druhý hráč', 'The second player')], correct: 1, cols: 2 },
    hints: [S('Skús si zapísať veľkosti kôp v dvojkovej sústave a spočítať každý stĺpec.', 'Write the pile sizes in binary and add each column.'), S('Ak je v každom stĺpci párny počet jednotiek, pozícia je prehrávajúca pre hráča na ťahu.', 'If every column has an even number of ones, the position is losing for the player to move.')],
    explain: [S(`Nim-súčet (XOR) čísel ${piles.join(', ')} je 0.`, `The nim-sum (XOR) of ${piles.join(', ')} is 0.`), S('Pri nim-súčte 0 prehráva hráč na ťahu – druhý hráč vždy odpovie tak, aby znova dostal 0. Vyhráva druhý hráč.', 'With nim-sum 0 the player to move loses – the second player always answers to restore 0. The second player wins.')]
  };
  const two = piles.length === 2;
  return {
    title: S('Nim – víťazný ťah', 'Nim – the winning move'), type: 'number',
    prompt: both(l => rule[l] + ' ' + (two ? (l === 'sk' ? 'Začínaš ty. Koľko vezmeš z väčšej kopy, aby si vyhral?' : 'You start. How many do you take from the bigger pile to win?') : (l === 'sk' ? `Začínaš ty. Koľko vezmeš z kopy s ${cand.from}, aby si vyhral?` : `You start. How many do you take from the pile of ${cand.from} to win?`))),
    data: { answer: cand.ans },
    hints: two ? [S('Čo ak kopy vyrovnáš? Čo potom môže urobiť súper?', 'What if you make the piles equal? What can your opponent do then?'), S('Súperov ťah vždy zopakuješ na druhej kope.', 'You can always copy your opponent’s move on the other pile.')]
      : [S('Zapíš si veľkosti kôp v dvojkovej sústave. Chceš, aby bol po tvojom ťahu v každom stĺpci párny počet jednotiek.', 'Write the piles in binary. After your move every column should have an even number of ones.'), S(`Nim-súčet (XOR) kôp je teraz ${x}. Ktorú kopu musíš zmenšiť, aby sa nim-súčet stal 0?`, `The nim-sum (XOR) is now ${x}. Which pile must be reduced to make it 0?`)],
    explain: two ? [S('Pri dvoch kopách vyrovnaj ich veľkosti: z väčšej vezmi rozdiel.', 'With two piles equalise them: take the difference from the bigger one.'), S(`Rozdiel je ${piles[1]} − ${piles[0]} = ${cand.ans}. Potom už stačí kopírovať súperove ťahy na druhej kope.`, `The difference is ${piles[1]} − ${piles[0]} = ${cand.ans}. Then just copy your opponent’s moves on the other pile.`)]
      : [S(`Nim-súčet (XOR) čísel ${piles.join(', ')} je ${x}, takže si v „vyhrávajúcej“ pozícii.`, `The nim-sum (XOR) of ${piles.join(', ')} is ${x}, so you are in a “winning” position.`), S(`Treba vziať ${cand.ans} z kopy ${cand.from}: ${cand.from} ⊕ ${x} = ${cand.from - cand.ans}, a tak sa nim-súčet zmení na 0.`, `Take ${cand.ans} from the pile of ${cand.from}: ${cand.from} ⊕ ${x} = ${cand.from - cand.ans}, which makes the nim-sum 0.`)]
  };
});

reg('chocolate', 'strategy', 2, c => {
  const { D, k, g } = c, lim = lerp(9, 24, D), pairs = []; for (let a = 2; a <= lim; a++) for (let b = a; b <= lim; b++) pairs.push([a, b]);
  const [a, b] = pairs[ri(c.r, 0, pairs.length - 1)], n = a * b;
  return {
    title: S('Lámanie čokolády', 'Breaking chocolate'), type: 'number', sim: { kind: 'choc', a, b },
    prompt: S(`🍫 Čokoláda ${a} × ${b}. Jedno lámanie = jeden kus na dva. Koľko lámaní treba, aby bol každý štvorček osobitne?`, `🍫 A chocolate ${a} × ${b}. One break = one piece into two. How many breaks until every square is separate?`),
    data: { answer: n - 1 },
    hints: [S('Koľko kusov máš na začiatku a koľko na konci? Čo sa stane s počtom kusov pri jednom lámaní?', 'How many pieces do you have at the start and at the end? What happens to the count with one break?'), S('Každé lámanie pridá práve jeden kus. Na dôvode, ako lámeš, nezáleží.', 'Every break adds exactly one piece. How you break does not matter.')],
    explain: [S('Na začiatku je 1 kus a na konci ich chceme ' + n + '.', 'At the start there is 1 piece and at the end we want ' + n + '.'), S(`Každé lámanie zvýši počet kusov presne o 1, preto potrebujeme ${n} − 1 = ${n - 1} lámaní – bez ohľadu na spôsob.`, `Each break raises the number of pieces by exactly 1, so we need ${n} − 1 = ${n - 1} breaks – whatever the method.`)]
  };
});

reg('knockout', 'strategy', 2, c => {
  const { D, k, r, g } = c, n = lerp(5, 70, D) + k * 2 + ri(r, 0, 3), v = k % 3;
  if (v === 2) { const m = clamp(2 + Math.floor(k / 2) % 6 + Math.floor(D * 4), 2, 10); return {
    title: S('Turnaj – počet kôl', 'Tournament – rounds'), type: 'number',
    prompt: S(`🏆 ${2 ** m} hráčov. V každom kole hrajú dvojice a víťaz postupuje. Koľko kôl sa odohrá?`, `🏆 ${2 ** m} players. In each round pairs play and the winner moves on. How many rounds are played?`),
    data: { answer: m },
    hints: [S('Koľko hráčov zostane po 1. kole?', 'How many players remain after round 1?'), S('Počet hráčov sa každé kolo zníži na polovicu. Koľkokrát môžeš deliť dvoma, kým ostane 1?', 'The number halves each round. How many times can you halve until 1 is left?')],
    explain: [S(`Po každom kole zostane polovica hráčov: ${range(m + 1).map(i => 2 ** (m - i)).join(' → ')}.`, `After every round half remain: ${range(m + 1).map(i => 2 ** (m - i)).join(' → ')}.`), S(`Je to ${m} polovičení, teda ${m} kôl.`, `That is ${m} halvings, so ${m} rounds.`)] }; }
  return {
    title: S('Turnaj – počet zápasov', 'Tournament – matches'), type: 'number', sim: n <= 16 ? { kind: 'players', n } : null,
    prompt: both(l => l === 'sk' ? `🏆 ${n} hráčov hrá turnaj. Kto prehrá, vypadne. Koľko zápasov sa odohrá, kým zostane víťaz?` : `🏆 ${n} players play a tournament. Whoever loses is out. How many matches until one winner is left?`),
    data: { answer: n - 1 },
    hints: [S('Koľko hráčov musí byť vyradených, aby ostal víťaz?', 'How many players must be eliminated for a champion to remain?'), S('Jeden zápas = jeden vyradený hráč.', 'One match = one eliminated player.')],
    explain: [S(`Z ${n} hráčov musí byť vyradených ${n - 1}.`, `Out of ${n} players, ${n - 1} must be eliminated.`), S(`Každý zápas vyradí jedného, takže sa odohrá ${n - 1} zápasov – nezáleží na tom, ako sa dvojice losujú.`, `Each match eliminates one, so ${n - 1} matches are played – however the pairs are drawn.`)]
  };
});

/* ---------- truth & deduction ---------- */
reg('knights', 'truth', 2, c => {
  const { r, D } = c, n = D < .25 ? 2 : D < .55 ? 3 : D < .85 ? 4 : 5, L = LET.slice(0, n);
  const mk = i => {
    const others = range(n).filter(j => j !== i), t = pick(['knight', 'liar', 'liars', 'allK', 'allL', 'same', 'oneL', 'oneK'], r), x = pick(others, r), y = pick(others.filter(j => j !== x), r) ?? x, kk = ri(r, 0, n);
    return { t, x, y, kk };
  };
  const ev = (s, a) => { switch (s.t) { case 'knight': return a[s.x]; case 'liar': return !a[s.x]; case 'liars': return a.filter(v => !v).length === s.kk; case 'allK': return a.every(v => v); case 'allL': return a.every(v => !v); case 'same': return a[s.x] === a[s.y]; case 'oneL': return a.some(v => !v); case 'oneK': return a.some(v => v); } };
  const text = (s, l) => { const X = L[s.x], Y = L[s.y]; switch (s.t) { case 'knight': return l === 'sk' ? `${X} je rytier.` : `${X} is a knight.`; case 'liar': return l === 'sk' ? `${X} je luhár.` : `${X} is a liar.`; case 'liars': return l === 'sk' ? `Medzi nami je presne ${s.kk} luhárov.` : `Exactly ${s.kk} of us are liars.`; case 'allK': return l === 'sk' ? 'Sme všetci rytieri.' : 'We are all knights.'; case 'allL': return l === 'sk' ? 'Sme všetci luhári.' : 'We are all liars.'; case 'same': return l === 'sk' ? `${X} a ${Y} sú rovnakého typu.` : `${X} and ${Y} are of the same type.`; case 'oneL': return l === 'sk' ? 'Aspoň jeden z nás je luhár.' : 'At least one of us is a liar.'; case 'oneK': return l === 'sk' ? 'Aspoň jeden z nás je rytier.' : 'At least one of us is a knight.'; } };
  const assigns = range(1 << n).map(m => range(n).map(i => !!(m >> i & 1)));
  for (let tries = 0; tries < 400; tries++) {
    const st = range(n).map(mk); if (n === 2 && st.some(s => s.t === 'same')) continue;
    const sols = assigns.filter(a => st.every((s, i) => a[i] === ev(s, a)));
    if (sols.length !== 1) continue;
    const sol = sols[0], ask = r() < .5 ? 'count' : 'is', who = ri(r, 0, n - 1), kn = sol.filter(Boolean).length;
    const say = both(l => st.map((s, i) => `${L[i]}: „${text(s, l)}“`).join(l === 'sk' ? '  ' : '  '));
    return {
      title: S('Rytieri a luhári', 'Knights and liars'), type: ask === 'count' ? 'number' : 'choice',
      visual: () => vList(st.map((s, i) => `<b>${L[i]}</b>: „${esc(text(s, LANG))}“`)),
      prompt: both(l => (l === 'sk' ? `🏝️ Rytier hovorí vždy pravdu, luhár vždy klame. Skupina ${J(L, 'sk')} povie vety. ` : `🏝️ A knight always tells the truth, a liar always lies. Group ${J(L, 'en')} speaks. `) + (ask === 'count' ? (l === 'sk' ? 'Koľko rytierov je v skupine?' : 'How many knights are in the group?') : (l === 'sk' ? `Je ${L[who]} rytier?` : `Is ${L[who]} a knight?`))),
      data: ask === 'count' ? { answer: kn } : { options: [S('Áno', 'Yes'), S('Nie', 'No')], correct: sol[who] ? 0 : 1, cols: 2 },
      hints: [S(`Skús predpokladať, že ${L[0]} je rytier. Čo z toho vyplýva pre ostatných?`, `Try assuming ${L[0]} is a knight. What follows for the others?`), S('Ak sa dostaneš do sporu, tvoj predpoklad bol zlý – skús opačný.', 'If you reach a contradiction your assumption was wrong – try the opposite.')],
      explain: [S('Skúšame možnosti: rytier musí hovoriť pravdu, luhár klamať. Každý predpoklad overíme proti všetkým vetám.', 'We test cases: a knight must tell the truth, a liar must lie. We check each assumption against all sentences.'),
        both(l => (l === 'sk' ? 'Jediný možný stav: ' : 'The only consistent case: ') + L.map((x, i) => `${x} = ${sol[i] ? (l === 'sk' ? 'rytier' : 'knight') : (l === 'sk' ? 'luhár' : 'liar')}`).join(', ') + '.')]
    };
  }
  return null;
});

reg('culprit', 'truth', 2, c => {
  const { r, D } = c, n = D < .35 ? 3 : D < .7 ? 4 : 5, P = names(r, n);
  for (let tries = 0; tries < 400; tries++) {
    const real = ri(r, 0, n - 1);
    const st = P.map((_, i) => { const t = pick(['was', 'wasnt', 'or'], r), x = pick(range(n).filter(j => j !== i || t === 'wasnt'), r), y = pick(range(n).filter(j => j !== x), r); return { t, x, y }; });
    const tr = (s, cu) => s.t === 'was' ? cu === s.x : s.t === 'wasnt' ? cu !== s.x : (cu === s.x || cu === s.y);
    const count = cu => st.filter(s => tr(s, cu)).length, K = count(real);
    if (range(n).filter(cu => count(cu) === K).length !== 1 || K === 0 || K === n) continue;
    const text = (s, i, l) => s.t === 'was' ? (l === 'sk' ? `Rozbil to ${P[s.x]}.` : `${P[s.x]} did it.`) : s.t === 'wasnt' ? (s.x === i ? (l === 'sk' ? 'Ja som to nebol.' : 'It was not me.') : (l === 'sk' ? `${P[s.x]} to nebol.` : `It was not ${P[s.x]}.`)) : (l === 'sk' ? `Rozbil to ${P[s.x]} alebo ${P[s.y]}.` : `It was ${P[s.x]} or ${P[s.y]}.`);
    return {
      title: S('Kto rozbil okno?', 'Who broke the window?'), type: 'choice',
      visual: () => vList(st.map((s, i) => `<b>${P[i]}</b>: „${esc(text(s, i, LANG))}“`)),
      prompt: S(`🪟 Okno rozbil jeden z ${n} detí (${P.join(', ')}). Pravdu ${K === 1 || K >= 5 ? 'hovorí' : 'hovoria'} presne ${K}. Kto to bol?`, `🪟 One of ${n} children (${P.join(', ')}) broke the window. Exactly ${K} ${K === 1 ? 'tells' : 'tell'} the truth. Who did it?`),
      data: { options: P.map(x => x), correct: real, cols: n > 3 ? 2 : 3 },
      hints: [S('Skús postupne každého podozrivého: ak by to bol on, koľko výrokov by bolo pravdivých?', 'Try each suspect in turn: if it was them, how many statements would be true?'), S(`Hľadáš podozrivého, pri ktorom je pravdivých presne ${K} výrokov.`, `You want the suspect for whom exactly ${K} statements are true.`)],
      explain: [S('Pre každého podozrivého spočítame, koľko výrokov by bolo pravdivých:', 'For each suspect we count how many statements would be true:'), both(l => P.map((p, cu) => `${p}: ${count(cu)}`).join(' • ')), S(`Presne ${K} pravdivých výrokov vychádza len pri ${P[real]}.`, `Exactly ${K} true statements happens only for ${P[real]}.`)]
    };
  }
  return null;
});

reg('numberclue', 'truth', 2, c => {
  const { r, D } = c, hi = lerp(30, 600, D), lo = 1, N = ri(r, 10, hi);
  const dg = x => String(x).split('').map(Number), ds = x => dg(x).reduce((a, b) => a + b, 0);
  const pool = [];
  [2, 3, 4, 5, 6, 7, 9].forEach(d => { if (N % d === 0) pool.push({ f: x => x % d === 0, t: S(`je deliteľné číslom ${d}`, `is divisible by ${d}`) }); else pool.push({ f: x => x % d !== 0, t: S(`nie je deliteľné číslom ${d}`, `is not divisible by ${d}`) }); });
  pool.push({ f: x => x > N - ri(r, 1, Math.max(2, hi / 6 | 0)), t: null });
  const kid = c.g <= 3, a = kid ? Math.max(1, N - ri(r, 2, 7)) : ri(r, 1, Math.max(1, Math.floor(N * .6))), b = kid ? N + ri(r, 2, 7) : N + ri(r, 1, Math.max(2, Math.floor(hi * .3)));
  pool.push({ f: x => x > a, t: S(`je väčšie ako ${a}`, `is greater than ${a}`) }, { f: x => x < b, t: S(`je menšie ako ${b}`, `is less than ${b}`) });
  pool.push({ f: x => ds(x) === ds(N), t: S(`má ciferný súčet ${ds(N)}`, `has digit sum ${ds(N)}`) });
  pool.push({ f: x => x % 10 === N % 10, t: S(`končí číslicou ${N % 10}`, `ends in the digit ${N % 10}`) });
  pool.push({ f: x => (x % 2 === 0) === (N % 2 === 0), t: N % 2 === 0 ? S('je párne', 'is even') : S('je nepárne', 'is odd') });
  if (Math.sqrt(N) % 1 === 0) pool.push({ f: x => Math.sqrt(x) % 1 === 0, t: S('je druhá mocnina celého čísla', 'is a perfect square') });
  pool.push({ f: x => String(x).length === String(N).length, t: S(`má ${String(N).length} ${String(N).length === 1 ? 'cifru' : String(N).length < 5 ? 'cifry' : 'cifier'}`, `has ${String(N).length} digit${String(N).length === 1 ? '' : 's'}`) });
  const clues = pool.filter(p => p.t && p.f(N) && (c.g > 3 || /párne|nepárne|končí|väčšie|menšie|deliteľné číslom (2|5)\b|ciferi|cifry|cifru/.test(p.t.sk))); let cand = range(hi + 1).filter(x => x >= lo), used = [];
  for (const cl of shuffle(clues, r)) { const nx = cand.filter(cl.f); if (nx.length < cand.length) { used.push({ cl, before: cand.length, after: nx.length }); cand = nx; } if (cand.length === 1) break; }
  if (cand.length !== 1 || used.length < 2 || used.length > 6) return null;
  return {
    title: S('Hádaj moje číslo', 'Guess my number'), sim: hi <= 120 ? { kind: 'chart', hi } : null, type: 'number',
    visual: () => vList(used.map(u => esc(tx(u.cl.t)))),
    prompt: S(`Myslím si číslo od 1 do ${hi}. Platí o ňom všetko zo zoznamu. Aké je to číslo?`, `I am thinking of a number from 1 to ${hi}. Everything on the list is true. Which number is it?`),
    data: { answer: N },
    hints: [S('Začni tou podmienkou, ktorá vylúči najviac čísel.', 'Start with the clue that rules out the most numbers.'), S('Kombinuj podmienky: hľadáš číslo, ktoré spĺňa všetky naraz.', 'Combine the clues: you need a number that satisfies all of them at once.')],
    explain: [S('Čísla postupne vylučujeme podľa podmienok:', 'We cross out numbers clue by clue:'), both(l => used.map((u, i) => `${i + 1}. ${l === 'sk' ? 'zostáva' : 'left'}: ${u.after}`).join(' → ')), S(`Zostane jediné číslo: ${N}.`, `Only one number is left: ${N}.`)]
  };
});

/* ---------- logical reasoning ---------- */
reg('ordering', 'logic', 2, c => {
  const { r, D } = c, n = clamp(lerp(3, 6, D * 1.15), 3, 6), P = names(r, n), all = allPerms(n); // all[i][person] = position
  const hidden = pick(all, r);
  const kinds = [() => { const a = ri(r, 0, n - 1), b = pick(range(n).filter(x => x !== a), r); return { f: p => p[a] < p[b], t: S(`${P[a]} stojí pred ${INS[P[b]]}.`, `${P[a]} stands before ${P[b]}.`) }; },
    () => { const a = ri(r, 0, n - 1), b = pick(range(n).filter(x => x !== a), r); return { f: p => p[a] === p[b] + 1, t: S(`${P[a]} stojí hneď za ${INS[P[b]]}.`, `${P[a]} stands right behind ${P[b]}.`) }; },
    () => { const a = ri(r, 0, n - 1); return { f: p => p[a] !== 0, t: S(`${P[a]} nestojí na prvom mieste.`, `${P[a]} is not first.`) }; },
    () => { const a = ri(r, 0, n - 1); return { f: p => p[a] !== n - 1, t: S(`${P[a]} nestojí na poslednom mieste.`, `${P[a]} is not last.`) }; },
    () => { const [m, a, b] = shuffle(range(n), r); return { f: p => (p[a] < p[m] && p[m] < p[b]) || (p[b] < p[m] && p[m] < p[a]), t: S(`${P[m]} stojí niekde medzi ${INS[P[a]]} a ${INS[P[b]]}.`, `${P[m]} stands somewhere between ${P[a]} and ${P[b]}.`) }; }];
  const kindMax = D < .3 ? 4 : 5;
  let L = all, clues = [];
  for (let t = 0; t < 60 && L.length > 1; t++) { const cl = kinds[ri(r, 0, kindMax - 1)](); if (!cl.f(hidden)) continue; const nx = L.filter(cl.f); if (nx.length < L.length) { L = nx; clues.push(cl); } }
  if (L.length !== 1) return null;
  for (let i = clues.length - 1; i >= 0; i--) { const rest = clues.filter((_, j) => j !== i); if (all.filter(p => rest.every(cl => cl.f(p))).length === 1) clues = rest; }
  const order = range(n).sort((a, b) => hidden[a] - hidden[b]), askPlace = r() < .5, place = ri(r, 0, n - 1), who = ri(r, 0, n - 1);
  const ordTxt = both(l => order.map((p, i) => `${i + 1}. ${P[p]}`).join(', '));
  return {
    title: S('Poradie v rade', 'Order in the queue'), type: askPlace ? 'choice' : 'number',
    visual: () => vList(clues.map(cl => esc(tx(cl.t)))),
    prompt: S(`🍦 V rade stoja: ${P.join(', ')}. ${askPlace ? `Kto je ${place + 1}. od začiatku?` : `Kolký od začiatku je ${P[who]}?`}`, `🍦 In the queue: ${P.join(', ')}. ${askPlace ? `Who is number ${place + 1} from the front?` : `Which place from the front is ${P[who]}?`}`),
    data: askPlace ? { options: P.slice(), correct: order[place], cols: n > 4 ? 3 : 2 } : { answer: hidden[who] + 1 },
    hints: [S('Začni výrokom, ktorý ti hneď dá niečo isté (napr. „hneď za“). Spoj dvojice do reťazca.', 'Start with a clue that gives something certain (like “right behind”). Chain pairs together.'), S('Zapíš si miesta 1, 2, 3 … a postupne k nim priraď mená. Vylučuj to, čo nejde.', 'Write down places 1, 2, 3 … and fit names to them step by step, ruling out what cannot be.')],
    explain: [S('Výroky spájame do jedného poradia – každé miesto, ktoré sa nedá, vylúčime.', 'We join the clues into one order – every place that is impossible gets crossed out.'), both(l => (l === 'sk' ? 'Poradie od začiatku: ' : 'Order from the front: ') + ordTxt[l] + '.')]
  };
});

const PETS = [{ e: '🐶', n: S('Pes', 'Dog'), acc: S('psa', 'a dog'), the: S('psa', 'the dog') }, { e: '🐱', n: S('Mačka', 'Cat'), acc: S('mačku', 'a cat'), the: S('mačku', 'the cat') }, { e: '🐹', n: S('Škrečok', 'Hamster'), acc: S('škrečka', 'a hamster'), the: S('škrečka', 'the hamster') }, { e: '🐰', n: S('Králik', 'Rabbit'), acc: S('králika', 'a rabbit'), the: S('králika', 'the rabbit') }, { e: '🐠', n: S('Rybka', 'Fish'), acc: S('rybku', 'a fish'), the: S('rybku', 'the fish') }];
reg('assign', 'logic', 2, c => {
  const { r, D } = c, n = D < .4 ? 3 : D < .8 ? 4 : 5, P = names(r, n), items = shuffle(PETS, r).slice(0, n), all = allPerms(n), hidden = pick(all, r); // hidden[person]=item
  const kinds = [() => { const a = ri(r, 0, n - 1), x = pick(range(n).filter(i => i !== hidden[a]), r); return { f: p => p[a] !== x, t: S(`${P[a]} nemá ${items[x].the.sk}.`, `${P[a]} does not have ${items[x].the.en}.`) }; },
    () => { const a = ri(r, 0, n - 1), b = pick(range(n).filter(i => i !== a), r), cm = range(n).filter(x => x !== hidden[a] && x !== hidden[b]); if (!cm.length) return { f: () => false }; const x = pick(cm, r); return { f: p => p[a] !== x && p[b] !== x, t: S(`Ani ${P[a]}, ani ${P[b]} nemajú ${items[x].the.sk}.`, `Neither ${P[a]} nor ${P[b]} has ${items[x].the.en}.`) }; },
    () => { const a = ri(r, 0, n - 1); return { f: p => p[a] === hidden[a], t: S(`${P[a]} má ${items[hidden[a]].the.sk}.`, `${P[a]} has ${items[hidden[a]].the.en}.`) }; }];
  let L = all, clues = [], direct = 0;
  for (let t = 0; t < 80 && L.length > 1; t++) { const idx = r() < .12 && direct < 1 ? 2 : ri(r, 0, 1), cl = kinds[idx](); if (!cl.f(hidden)) continue; const nx = L.filter(cl.f); if (nx.length < L.length) { L = nx; clues.push(cl); if (idx === 2) direct++; } }
  if (L.length !== 1) return null;
  for (let i = clues.length - 1; i >= 0; i--) { const rest = clues.filter((_, j) => j !== i); if (all.filter(p => rest.every(cl => cl.f(p))).length === 1) clues = rest; }
  const who = ri(r, 0, n - 1);
  return {
    title: S('Kto má ktoré zviera?', 'Who owns which pet?'), sim: { kind: 'logicgrid', rows: P, cols: items.map(i => i.e) }, type: 'choice',
    visual: () => vList(clues.map(cl => esc(tx(cl.t)))),
    prompt: S(`${J(P, 'sk')} majú každý jedno zviera: ${items.map(i => i.e).join(' ')}. Čo má ${P[who]}?`, `${J(P, 'en')} each have one pet: ${items.map(i => i.e).join(' ')}. What does ${P[who]} have?`),
    data: { options: items.map(i => S(i.e + ' ' + i.n.sk, i.e + ' ' + i.n.en)), correct: hidden[who], cols: n > 3 ? 2 : 3 },
    hints: [S('Vytvor si tabuľku: riadky sú deti, stĺpce zvieratá. Zakrížkuj, čo nejde.', 'Make a table: rows are children, columns pets. Cross out what is impossible.'), S('Keď ostane v riadku alebo stĺpci jediné voľné políčko, je tam odpoveď.', 'When a row or column has only one free cell left, that is the answer.')],
    explain: [S('Do tabuľky zaznačujeme ✗ pri tom, čo informácie vylučujú, a ✓ keď ostane iba jedna možnosť.', 'In the table we mark ✗ for what the clues rule out and ✓ when only one option is left.'), both(l => P.map((p, i) => `${p} → ${items[hidden[i]].e} ${items[hidden[i]].n[l]}`).join(' • '))]
  };
});

const WORDS = ['blik', 'zork', 'fenn', 'drel', 'tulo', 'mirk', 'plon', 'gax', 'vesk', 'trum', 'nolk', 'sarb'];
reg('syllogism', 'logic', 2, c => {
  const { r, D, k } = c, w = shuffle(WORDS, r), [A, B, C, Dd] = w;
  const all = (a, b) => S(`Každý ${a} je ${b}.`, `Every ${a} is a ${b}.`), none = (a, b) => S(`Žiadny ${a} nie je ${b}.`, `No ${a} is a ${b}.`), some = (a, b) => S(`Aspoň jeden ${a} je ${b}.`, `At least one ${a} is a ${b}.`), someNot = (a, b) => S(`Aspoň jeden ${a} nie je ${b}.`, `At least one ${a} is not a ${b}.`);
  const T = [
    () => ({ pre: [all(A, B), all(B, C)], ok: all(A, C), bad: [all(C, A), none(A, C), someNot(A, C)], ex: S('Ak každý A je B a každý B je C, tak každý A je aj C – vetvy sa reťazia.', 'If every A is a B and every B is a C, then every A is a C – the chain continues.') }),
    () => ({ pre: [all(A, B), S(`Axel nie je ${B}.`, `Axel is not a ${B}.`)], ok: S(`Axel nie je ${A}.`, `Axel is not an ${A}.`), bad: [S(`Axel je ${A}.`, `Axel is an ${A}.`), all(B, A), S(`Axel je ${B}, ale nie ${A}.`, `Axel is a ${B} but not an ${A}.`)], ex: S('Keby Axel bol A, musel by byť aj B. Nie je B, preto nie je ani A.', 'If Axel were an A he would have to be a B. He is not a B, so he is not an A.') }),
    () => ({ pre: [none(A, B), all(C, B)], ok: none(C, A), bad: [all(C, A), some(C, A), all(A, C)], ex: S('Každý C je B a žiadny B nie je A, takže žiadny C nemôže byť A.', 'Every C is a B and no B is an A, so no C can be an A.') }),
    () => ({ pre: [all(A, B), all(C, A)], ok: all(C, B), bad: [all(B, C), none(C, B), all(B, A)], ex: S('Každý C je A a každý A je B, teda každý C je B.', 'Every C is an A and every A is a B, so every C is a B.') }),
    () => ({ pre: [some(A, B), all(B, C)], ok: some(A, C), bad: [all(A, C), none(A, C), all(C, A)], ex: S('Niektorý A je B a každý B je C, takže tento A je aj C.', 'Some A is a B and every B is a C, so that A is also a C.') }),
    () => ({ pre: [all(A, B), all(B, C), none(C, Dd)], ok: none(A, Dd), bad: [some(A, Dd), all(Dd, A), all(A, Dd)], ex: S('Každý A je C a žiadny C nie je D, preto žiadny A nie je D.', 'Every A is a C and no C is a D, so no A is a D.') }),
    () => ({ pre: [some(A, B), none(B, C)], ok: someNot(A, C), bad: [all(A, C), none(A, B), some(B, C)], ex: S('Niektorý A je B, a žiadny B nie je C – takže tento A nie je C.', 'Some A is a B and no B is a C – so that A is not a C.') })
  ];
  const idxs = D < .35 ? [0, 1, 3] : D < .7 ? [0, 1, 2, 3, 4] : [2, 4, 5, 6, 5];
  const t = T[idxs[(k + ri(r, 0, 1)) % idxs.length]](), opts = shuffle([t.ok, ...t.bad], r);
  return {
    title: S('Čo z toho vyplýva?', 'What follows?'), type: 'choice',
    visual: () => vList(t.pre.map(x => esc(tx(x)))),
    prompt: S('Platia vety v zozname. Ktoré tvrdenie z nich NUTNE vyplýva? (Slová sú vymyslené – spoliehaj sa len na logiku.)', 'The statements in the list are true. Which claim MUST follow from them? (The words are made up – rely on logic only.)'),
    data: { options: opts, correct: opts.indexOf(t.ok), cols: 1 },
    hints: [S('Nakresli si kruhy (množiny) pre jednotlivé druhy. Ktorý kruh je vo vnútri ktorého?', 'Draw circles (sets) for each kind. Which circle sits inside which?'), S('Skús každú možnosť: dá sa nakresliť situácia, kde predpoklady platia, ale možnosť nie? Potom nevyplýva.', 'Test each option: can you draw a case where the premises hold but the option does not? Then it does not follow.')],
    explain: [t.ex, S(`Správna odpoveď: „${tx(t.ok)}“ – ostatné možnosti sa nedajú z predpokladov odvodiť.`, `Correct: “${tx(t.ok)}” – the others cannot be derived from the premises.`)]
  };
});
