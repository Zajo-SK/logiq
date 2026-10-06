'use strict';
/* LogiQ – chess maths problems, Tower of Hanoi, dominoes. Includes the interactive 'chess' and 'hanoi' task types. */

/* ---------- chess engine ---------- */
const CHP = {
  king: { g: '♚', n: S('Kráľ', 'King'), d: S('Kráľ sa hýbe o jedno políčko na ktorúkoľvek stranu – vodorovne, zvisle aj uhlopriečne.', 'The king moves one square in any direction – sideways, up/down or diagonally.') },
  queen: { g: '♛', n: S('Dáma', 'Queen'), d: S('Dáma ide po rovnej línii ľubovoľne ďaleko – vodorovne, zvisle aj uhlopriečne (je to veža a strelec dokopy). Cez iné políčka neskáče.', 'The queen moves any distance along a straight line – sideways, up/down or diagonally (rook and bishop combined). She cannot jump.') },
  rook: { g: '♜', n: S('Veža', 'Rook'), d: S('Veža ide ľubovoľne ďaleko vodorovne alebo zvisle. Cez iné políčka neskáče.', 'The rook moves any distance sideways or up/down. It cannot jump.') },
  bishop: { g: '♝', n: S('Strelec', 'Bishop'), d: S('Strelec ide ľubovoľne ďaleko uhlopriečne, preto zostáva stále na políčkach jednej farby. Cez iné políčka neskáče.', 'The bishop moves any distance diagonally, so it always stays on squares of one colour. It cannot jump.') },
  knight: { g: '♞', n: S('Kôň', 'Knight'), d: S('Kôň skáče do tvaru písmena L: o 2 políčka jedným smerom a o 1 kolmo naň. Ako jediný vie preskakovať iné políčka.', 'The knight jumps in an L-shape: 2 squares one way and 1 square at a right angle. It is the only piece that can jump over others.') },
  pawn: { g: '♟', n: S('Pešiak', 'Pawn'), d: S('Pešiak ide o jedno políčko dopredu (smerom nahor). Z východiskového radu môže prvý ťah ísť o dve políčka.', 'The pawn moves one square forward (upwards). From its starting row its first move may be two squares.') }
};
const FILES = 'abcdefgh';
const sqName = (N, r, c) => FILES[c] + (N - r);
const SLIDE = { rook: [[1, 0], [-1, 0], [0, 1], [0, -1]], bishop: [[1, 1], [1, -1], [-1, 1], [-1, -1]] };
SLIDE.queen = SLIDE.rook.concat(SLIDE.bishop);
function chessMoves(piece, r, c, N, blocked) {
  const ok = (a, b) => a >= 0 && b >= 0 && a < N && b < N && !blocked.has(a * N + b), out = [];
  if (piece === 'king') { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if ((a || b) && ok(r + a, c + b)) out.push([r + a, c + b]); }
  else if (piece === 'knight') { [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]].forEach(([a, b]) => { if (ok(r + a, c + b)) out.push([r + a, c + b]); }); }
  else if (piece === 'pawn') { if (ok(r - 1, c)) out.push([r - 1, c]); }
  else SLIDE[piece].forEach(([a, b]) => { let x = r + a, y = c + b; while (ok(x, y)) { out.push([x, y]); x += a; y += b; } });
  return out;
}
function chessPath(piece, N, blocked, from, to) {
  const key = (r, c) => r * N + c, prev = new Map([[key(...from), null]]), q = [from];
  while (q.length) { const [r, c] = q.shift(); if (r === to[0] && c === to[1]) break; chessMoves(piece, r, c, N, blocked).forEach(([a, b]) => { if (!prev.has(key(a, b))) { prev.set(key(a, b), [r, c]); q.push([a, b]); } }); }
  if (!prev.has(key(...to))) return null; const path = []; let cur = to; while (cur) { path.unshift(cur); cur = prev.get(key(...cur)); } return path;
}
const boardHtml = (N, fn) => {
  let h2 = `<div class="chessb" style="--n:${N}" role="img">`;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const o = fn(r, c) || {}; h2 += `<div class="cs ${(r + c) % 2 ? 'dc' : 'lc'} ${o.cls || ''}">${c === 0 ? `<i class="co l">${N - r}</i>` : ''}${r === N - 1 ? `<i class="co b">${FILES[c]}</i>` : ''}<span>${o.txt || ''}</span></div>`; }
  return h2 + '</div>';
};
const pieceIntro = (keys, extraNote) => () => `<div class="intro-in">${keys.map(k => {
  const P = CHP[k], N = 5, cr = k === 'pawn' ? 3 : 2, cc = 2, mv = chessMoves(k, cr, cc, N, new Set()), set = new Set(mv.map(([a, b]) => a * N + b));
  const board = boardHtml(N, (r, c) => r === cr && c === cc ? { txt: P.g, cls: 'pc' } : set.has(r * N + c) ? { txt: '•', cls: 'mvdot' } : {});
  return `<div class="pintro"><div class="pi-t"><b class="pi-g">${P.g}</b> <b>${esc(tx(P.n))}</b></div><p>${esc(tx(P.d))}</p>${board}</div>`;
}).join('')}${extraNote ? `<p class="muted">${esc(tx(extraNote))}</p>` : ''}</div>`;
const INTRO_T = S('Ako sa hýbe figúrka? (prečítaj si pred úlohou)', 'How does the piece move? (read before the task)');
const pickPiece = (r, D, list) => pick(list.filter((p, i) => i / list.length <= D + .35), r) || list[0];

/* ---------- generators ---------- */
reg('chessmoves', 'chess', 2, c => {
  const { r, D, k } = c, N = clamp(lerp(5, 8, D * 1.6), 5, 8), pc = k % 7 === 6 && D < .45 ? 'pawn' : pickPiece(r, D, ['king', 'rook', 'bishop', 'knight', 'queen']);
  if (pc === 'pawn') return { title: S('Pešiak na ceste', 'Pawn on its way'), type: 'number', intro: pieceIntro(['pawn']), introTitle: INTRO_T, visual: () => boardHtml(8, (a, b) => a === 6 && b === 3 ? { txt: CHP.pawn.g, cls: 'pc' } : a === 0 ? { cls: 'goal' } : {}),
    prompt: S('Biely pešiak stojí na políčku d2 (7. riadok zhora). Hýbe sa iba dopredu, prvý ťah môže byť o dve políčka, ďalšie ťahy o jedno. Najmenej koľko ťahov potrebuje, aby došiel do horného radu (zvýraznený)?', 'A white pawn stands on d2 (the 7th row from the top). It moves only forward; its first move may be two squares, later moves one. What is the fewest moves to reach the top row (highlighted)?'), data: { answer: 5 },
    hints: [S('Koľko riadkov musí pešiak prejsť?', 'How many rows must the pawn cross?'), S('Prvý ťah môže byť dlhý o dve políčka – tým ušetríš ťah.', 'The first move can be two squares long – that saves a move.')], explain: [S('Z 2. do 8. radu je to 6 riadkov.', 'From row 2 to row 8 is 6 rows.'), S('Prvý ťah o 2 políčka (pešiak je na 4. rade), zostávajú 4 riadky po jednom: spolu 1 + 4 = 5 ťahov.', 'First move 2 squares (the pawn is on row 4), 4 rows remain one by one: 1 + 4 = 5 moves in total.')] };
  const blocked = new Set(); const nb = D > .5 && (pc === 'rook' || pc === 'bishop' || pc === 'queen') ? ri(r, 2, 6) : 0;
  const pr = ri(r, 0, N - 1), pcc = ri(r, 0, N - 1); for (let t = 0; t < nb; t++) { const a = ri(r, 0, N - 1), b = ri(r, 0, N - 1); if (a !== pr || b !== pcc) blocked.add(a * N + b); }
  const mv = chessMoves(pc, pr, pcc, N, blocked); if (mv.length < 2) return null;
  const P = CHP[pc], list = mv.map(([a, b]) => sqName(N, a, b)).sort().join(', ');
  return { title: S('Kam môže figúrka ísť?', 'Where can the piece go?'), type: 'number', intro: pieceIntro([pc]), introTitle: INTRO_T,
    visual: () => boardHtml(N, (a, b) => a === pr && b === pcc ? { txt: P.g, cls: 'pc' } : blocked.has(a * N + b) ? { txt: '✖', cls: 'blk' } : {}),
    prompt: S(`${P.g} stojí na ${sqName(N, pr, pcc)}.${nb ? ' ✖ = zablokované.' : ''} Na koľko polí môže ísť jedným ťahom?`, `${P.g} stands on ${sqName(N, pr, pcc)}.${nb ? ' ✖ = blocked.' : ''} How many squares can it reach in one move?`),
    data: { answer: mv.length },
    hints: [S('Zober figúrku po jednotlivých smeroch a v každom spočítaj voľné políčka.', 'Take the piece direction by direction and count the free squares in each.'), S('Pozor na okraj šachovnice' + (nb ? ' a na zablokované políčka.' : '.'), 'Mind the edge of the board' + (nb ? ' and the blocked squares.' : '.'))],
    explain: [S('Prejdeme všetky možné ťahy figúrky a vyradíme tie, ktoré vedú mimo šachovnice' + (nb ? ' alebo cez zablokované políčka' : '') + '.', 'We go through all of the piece’s moves and discard those that leave the board' + (nb ? ' or cross a blocked square' : '') + '.'), S(`Dosiahnuteľné políčka: ${list} – spolu ${mv.length}.`, `Reachable squares: ${list} – ${mv.length} in total.`)] };
});

reg('chessreach', 'chess', 2, c => {
  const { r, D } = c, pc = pickPiece(r, D, ['king', 'rook', 'bishop', 'queen', 'knight']), N = clamp(lerp(5, 8, D * 1.4), 5, 8), P = CHP[pc], blocked = new Set();
  const nb = D > .6 && pc !== 'king' && pc !== 'knight' ? ri(r, 3, 7) : 0, A = [ri(r, 0, N - 1), ri(r, 0, N - 1)], B = [ri(r, 0, N - 1), ri(r, 0, N - 1)];
  for (let t = 0; t < nb; t++) { const a = ri(r, 0, N - 1), b = ri(r, 0, N - 1); if (!((a === A[0] && b === A[1]) || (a === B[0] && b === B[1]))) blocked.add(a * N + b); }
  const path = chessPath(pc, N, blocked, A, B); if (!path || path.length < 3) return null; const steps = path.length - 1;
  return { title: S('Najkratšia cesta figúrky', 'The piece’s shortest route'), type: 'number', intro: pieceIntro([pc]), introTitle: INTRO_T,
    visual: () => boardHtml(N, (a, b) => a === A[0] && b === A[1] ? { txt: P.g, cls: 'pc' } : a === B[0] && b === B[1] ? { txt: '🏁', cls: 'goal' } : blocked.has(a * N + b) ? { txt: '✖', cls: 'blk' } : {}),
    prompt: S(`${P.g} ide z ${sqName(N, ...A)} na ${sqName(N, ...B)} 🏁.${nb ? ' ✖ = zablokované.' : ''} Koľko ťahov najmenej?`, `${P.g} goes from ${sqName(N, ...A)} to ${sqName(N, ...B)} 🏁.${nb ? ' ✖ = blocked.' : ''} Fewest moves?`),
    data: { answer: steps },
    hints: [S('Zisti, kam sa figúrka dostane jedným ťahom, potom dvoma ťahmi…', 'Find where the piece can get in one move, then in two moves…'), S('Skús to aj odzadu: z ktorých políčok sa dá dostať do cieľa jedným ťahom?', 'Try it backwards too: from which squares can the goal be reached in one move?')],
    explain: [S('Prehľadáme všetky možnosti po jednotlivých ťahoch (1 ťah, 2 ťahy, …), kým nenarazíme na cieľ.', 'We search all options move by move (1 move, 2 moves, …) until we hit the goal.'), { text: S(`Najkratšia cesta: ${path.map(p => sqName(N, ...p)).join(' → ')} (${steps} ťahov). Menej sa nedá.`, `Shortest route: ${path.map(p => sqName(N, ...p)).join(' → ')} (${steps} moves). Fewer is impossible.`), render: box => box.insertAdjacentHTML('beforeend', boardHtml(N, (a, b) => { const i = path.findIndex(p => p[0] === a && p[1] === b); return blocked.has(a * N + b) ? { txt: '✖', cls: 'blk' } : i === 0 ? { txt: P.g, cls: 'pc' } : i > 0 ? { txt: i, cls: 'trail' } : {}; })) }] };
});

reg('chessnon', 'chess', 2, c => {
  const { r, D, k } = c, pcs = ['rook', 'king', 'bishop', 'knight', 'queen'], pc = pcs[(k + (D > .4 ? 2 : 0)) % (D < .35 ? 3 : 5)] || 'rook', P = CHP[pc], N = clamp(lerp(3, 7, D) + ri(r, 0, 1), pc === 'queen' ? 4 : pc === 'knight' ? 3 : 2, 8);
  const ans = pc === 'rook' ? N : pc === 'bishop' ? 2 * N - 2 : pc === 'king' ? Math.ceil(N / 2) ** 2 : pc === 'knight' ? Math.ceil(N * N / 2) : N;
  const why = { rook: S('Veža ohrozuje celý riadok a stĺpec, takže v každom riadku môže byť najviac jedna veža – spolu N. A N veží na uhlopriečku sa zmestí.', 'A rook attacks its whole row and column, so each row holds at most one rook – N in total – and N rooks on a diagonal fit.'), bishop: S('Strelci sa neohrozujú, ak stoja na rôznych uhlopriečkach. Pri okraji (prvý a posledný riadok) sa dá zaplniť všetko okrem dvoch rohov: 2N − 2.', 'Bishops do not attack each other if they stand on different diagonals. Filling the first and last row except two corners gives 2N − 2.'), king: S('Kráľ ohrozuje susedné políčka. Šachovnicu rozdelíme na štvorce 2×2 – v každom môže byť najviac jeden kráľ: ⌈N/2⌉².', 'A king attacks adjacent squares. Split the board into 2×2 blocks – each holds at most one king: ⌈N/2⌉².'), knight: S('Kôň ohrozuje len políčka opačnej farby, takže všetky kone na jednej farbe sa neohrozujú: ⌈N²/2⌉.', 'A knight attacks only squares of the opposite colour, so knights all on one colour never attack: ⌈N²/2⌉.'), queen: S('Dáma ohrozuje riadok, stĺpec aj uhlopriečky, v každom riadku je najviac jedna. Pre N ≥ 4 sa dá rozmiestniť N dám.', 'A queen attacks row, column and diagonals, so each row holds at most one. For N ≥ 4, N queens can be placed.') }[pc];
  return { title: S('Navzájom sa neohrozujú', 'No two attack each other'), type: 'number', intro: pieceIntro([pc]), introTitle: INTRO_T,
    prompt: S(`Koľko ${P.g} sa zmestí na šachovnicu ${N}×${N}, aby sa žiadne dve neohrozovali?`, `How many ${P.g} fit on a ${N}×${N} board so that no two attack each other?`),
    data: { answer: ans },
    hints: [S('Najprv zisti, ktoré políčka jedna figúrka ohrozuje. Ako ich rozmiestniť, aby sa nepotrebovali?', 'First find which squares one piece attacks. How can you spread them out so they do not clash?'), S('Skús malú šachovnicu 3×3 alebo 4×4 a hľadaj vzor.', 'Try a small 3×3 or 4×4 board and look for a pattern.')],
    explain: [why, S(`Pre ${N}×${N} to dáva ${ans}.`, `For ${N}×${N} this gives ${ans}.`)] };
});

reg('chessplay', 'chess', 2, c => {
  const { r, D, k } = c, N = clamp(lerp(5, 8, D * 1.4), 5, 8), mode = k % 2 === 0 ? 'attack' : 'reach';
  if (mode === 'attack') { const pc = pickPiece(r, D, ['king', 'rook', 'knight', 'bishop', 'queen']), blocked = [], nb = D > .45 && pc !== 'king' && pc !== 'knight' ? ri(r, 2, 5) : 0, pr = ri(r, 0, N - 1), pcc = ri(r, 0, N - 1);
    for (let t = 0; t < nb; t++) { const a = ri(r, 0, N - 1), b = ri(r, 0, N - 1); if (a !== pr || b !== pcc) blocked.push([a, b]); }
    if (chessMoves(pc, pr, pcc, N, new Set(blocked.map(([a, b]) => a * N + b))).length < 2) return null;
    return { title: S('Označ všetky ťahy', 'Mark all the moves'), type: 'chess', pts: 15, intro: pieceIntro([pc]), introTitle: INTRO_T, prompt: S(`Označ všetky polia, kam môže ${CHP[pc].g} ísť jedným ťahom.${nb ? ' ✖ = zablokované.' : ''}`, `Mark every square ${CHP[pc].g} can reach in one move.${nb ? ' ✖ = blocked.' : ''}`), data: { mode, N, piece: pc, start: [pr, pcc], blocked },
      hints: [S('Ťahaj figúrku v duchu po jednotlivých smeroch.', 'Move the piece in your head direction by direction.'), 'dyn', 'dyn'], explain: [] }; }
  const pc = pickPiece(r, D, ['king', 'rook', 'bishop', 'knight', 'queen']), A = [ri(r, 0, N - 1), ri(r, 0, N - 1)], B = [ri(r, 0, N - 1), ri(r, 0, N - 1)], path = chessPath(pc, N, new Set(), A, B);
  if (!path || path.length < 3) return null;
  return { title: S('Doveď figúrku do cieľa', 'Lead the piece to the goal'), type: 'chess', pts: 15, intro: pieceIntro([pc]), introTitle: INTRO_T, prompt: S(`Doveď ${CHP[pc].g} na 🏁 za ${path.length - 1} ${path.length - 1 === 1 ? 'ťah' : path.length - 1 < 5 ? 'ťahy' : 'ťahov'}. Ťukaj na políčka.`, `Lead ${CHP[pc].g} to 🏁 in ${path.length - 1} move${path.length === 2 ? '' : 's'}. Tap the squares.`), data: { mode, N, piece: pc, start: A, target: B, blocked: [] },
    hints: [S('Zisti, z ktorých políčok sa dá do cieľa dostať jedným ťahom.', 'Find the squares from which the goal can be reached in one move.'), 'dyn', 'dyn'], explain: [] };
});

reg('domino', 'chess', 2, c => {
  const { r, D, k } = c, v = k % 3, a = 2 * ri(r, 2, clamp(lerp(2, 4, D), 2, 4)), b = 2 * ri(r, 2, clamp(lerp(2, 4, D) + 1, 2, 5));
  if (v === 0) { const x = ri(r, 3, lerp(7, 15, D)), y = ri(r, 3, lerp(7, 15, D)); return { title: S('Domino na doske', 'Dominoes on a board'), sim: x <= 8 && y <= 8 ? { kind: 'dominoes', a: x, b: y, removed: [] } : null, type: 'number', prompt: S(`🁢 Doska ${x}×${y}. Koľko domín 1×2 sa najviac zmestí?`, `🁢 A ${x}×${y} board. How many 1×2 dominoes fit at most?`), data: { answer: Math.floor(x * y / 2) },
    hints: [S('Každé domino zaberie 2 políčka.', 'Each domino covers 2 squares.'), S('Koľko políčok má doska? Čo ak je ich nepárny počet?', 'How many squares does the board have? What if the number is odd?')], explain: [S(`Doska má ${x} · ${y} = ${x * y} políčok.`, `The board has ${x} · ${y} = ${x * y} squares.`), S(`Domino zaberá 2 políčka, preto ${x * y} : 2 = ${Math.floor(x * y / 2)}${(x * y) % 2 ? ' (jedno políčko ostane voľné)' : ''}.`, `A domino covers 2 squares, so ${x * y} : 2 = ${Math.floor(x * y / 2)}${(x * y) % 2 ? ' (one square stays free)' : ''}.`)] }; }
  const same = v === 1, cells = []; let rem;
  if (same) rem = [[0, 0], [a - 1, b - 1]]; else { const p = [ri(r, 0, a - 1), ri(r, 0, b - 1)]; let q; do q = [ri(r, 0, a - 1), ri(r, 0, b - 1)]; while ((p[0] + p[1]) % 2 === (q[0] + q[1]) % 2); rem = [p, q]; }
  const ok = (rem[0][0] + rem[0][1]) % 2 !== (rem[1][0] + rem[1][1]) % 2, remSet = new Set(rem.map(([x, y]) => x * b + y));
  return { title: S('Domino a šachovnica', 'Dominoes and the chessboard'), sim: a <= 10 && b <= 10 ? { kind: 'dominoes', a, b, removed: [...remSet] } : null, type: 'choice',
    visual: () => `<div class="chessb" style="--n:${b}" role="img">` + range(a).map(x => range(b).map(y => `<div class="cs ${(x + y) % 2 ? 'dc' : 'lc'}"><span>${remSet.has(x * b + y) ? '✖' : ''}</span></div>`).join('')).join('') + '</div>',
    prompt: S(`🁢 Dve políčka (✖) chýbajú. Dá sa zvyšok pokryť dominami 1×2?`, `🁢 Two squares (✖) are missing. Can the rest be covered with 1×2 dominoes?`), data: { options: [S('Áno, dá sa', 'Yes, it can'), S('Nie, nedá sa', 'No, it cannot')], correct: ok ? 0 : 1, cols: 2 },
    hints: [S('Každé domino pokryje jedno biele a jedno čierne políčko. Koľko je na doske bielych a čiernych po odobratí?', 'Every domino covers one light and one dark square. How many light and dark squares remain after the removal?'), S('Ak počty nesedia, pokrytie je nemožné.', 'If the counts do not match, covering is impossible.')],
    explain: [S('Domino vždy zakryje jedno svetlé a jedno tmavé políčko, preto by ich musel byť rovnaký počet.', 'A domino always covers one light and one dark square, so there would have to be equal numbers.'), ok ? S('Odstránené políčka majú rôzne farby – počty sedia. Na šachovnici s párnymi rozmermi sa to vtedy vždy podarí (Gomoryho veta).', 'The removed squares have different colours, so the counts match. On a board with even sides this always works (Gomory’s theorem).') : S('Odstránené políčka majú rovnakú farbu, takže jednej farby ostane o 2 viac. Pokryť to nejde.', 'The removed squares share a colour, so one colour has 2 more squares left. It cannot be covered.')] };
});

reg('rice', 'chess', 2, c => {
  const { D, k, r } = c, n = clamp(3 + Math.floor(D * 6) + k % 7 + ri(r, 0, 2), 3, 20), tot = k % 2 === 0;
  return { title: S('Zrnká na šachovnici', 'Grains on the chessboard'), type: 'number', prompt: tot ? S(`Na prvé políčko šachovnice dáme 1 zrnko, na druhé 2, na tretie 4 – na každé ďalšie dvakrát toľko ako na predchádzajúce. Koľko zŕn bude spolu na prvých ${n} políčkach?`, `We put 1 grain on the first square of a chessboard, 2 on the second, 4 on the third – each square gets twice as many as the one before. How many grains are there in total on the first ${n} squares?`) : S(`Na prvé políčko šachovnice dáme 1 zrnko, na druhé 2, na tretie 4 – vždy dvakrát toľko ako na predchádzajúce. Koľko zŕn bude na ${n}. políčku?`, `We put 1 grain on the first square of a chessboard, 2 on the second, 4 on the third – always twice as many as before. How many grains are on square number ${n}?`),
    data: { answer: tot ? 2 ** n - 1 : 2 ** (n - 1) },
    hints: tot ? [S('Zapíš si prvé členy: 1, 2, 4, 8… Čo majú spoločné so súčtom?', 'Write the first terms: 1, 2, 4, 8… What do they have in common with the running sum?'), S('Súčet prvých členov je vždy o 1 menej než ďalší člen.', 'The sum of the first terms is always 1 less than the next term.')] : [S('Počet zŕn sa na každom políčku zdvojnásobí.', 'The grain count doubles on every square.'), S('Na 1. políčku je 2⁰, na 2. políčku 2¹ …', 'Square 1 has 2⁰, square 2 has 2¹ …')],
    explain: tot ? [S(`Prvých ${n} členov: ${range(Math.min(n, 8)).map(i => 2 ** i).join(' + ')}${n > 8 ? ' + …' : ''}.`, `The first ${n} terms: ${range(Math.min(n, 8)).map(i => 2 ** i).join(' + ')}${n > 8 ? ' + …' : ''}.`), S(`Súčet je vždy o 1 menší než nasledujúci člen: 2^${n} − 1 = ${2 ** n - 1}.`, `The sum is always 1 less than the next term: 2^${n} − 1 = ${2 ** n - 1}.`)] : [S(`Na ${n}. políčku je 2^${n - 1} zŕn.`, `Square ${n} has 2^${n - 1} grains.`), S(`To je ${2 ** (n - 1)}.`, `That is ${2 ** (n - 1)}.`)] };
});

/* ---------- Tower of Hanoi ---------- */
function hanoiPlan(pegs, target) {
  const pos = {}; pegs.forEach((p, i) => p.forEach(d => pos[d] = i)); const n = Object.keys(pos).length, moves = [];
  const solve = (d, to) => { if (d === 0) return; if (pos[d] === to) { solve(d - 1, to); return; } const aux = 3 - pos[d] - to; solve(d - 1, aux); moves.push([pos[d], to, d]); pos[d] = to; solve(d - 1, to); };
  solve(n, target); return moves;
}
const hanoiIntro = () => `<div class="intro-in"><p>${esc(tx(S('Hanojské veže: máš 3 tyče a kopu diskov rôznej veľkosti navlečených na prvej tyči (najväčší dole). Cieľ: presunúť všetky disky na poslednú tyč.', 'Tower of Hanoi: there are 3 pegs and a stack of discs of different sizes on the first peg (largest at the bottom). Goal: move all discs to the last peg.')))}</p><ul class="clues"><li>${esc(tx(S('Naraz presúvaš len jeden disk – vrchný z niektorej tyče.', 'Move only one disc at a time – the top disc of a peg.')))}</li><li>${esc(tx(S('Väčší disk nikdy nesmieš položiť na menší.', 'Never place a larger disc on a smaller one.')))}</li><li>${esc(tx(S('Voľné tyče môžeš používať ako pomocné miesto.', 'You can use the free pegs as parking places.')))}</li></ul><svg viewBox="0 0 300 90" class="gridsvg" aria-hidden="true">${[0, 1, 2].map(i => `<rect x="${50 + i * 100 - 3}" y="10" width="6" height="70" fill="#8a94b0"/>`).join('')}<rect x="10" y="78" width="280" height="6" fill="#14213d"/>${[0, 1, 2].map(i => `<rect x="${50 - 8 - i * 14}" y="${62 - i * 16}" width="${16 + i * 28}" height="14" rx="6" fill="${['#f6b81d', '#12b5c0', '#6a4cf0'][i]}"/>`).join('')}</svg></div>`;
const HAN_INTRO = S('Pravidlá Hanojských veží (prečítaj si pred úlohou)', 'Rules of the Tower of Hanoi (read before the task)');
const fs4 = n => { const M = [0, 1]; for (let i = 2; i <= n; i++) { let best = Infinity; for (let j = 1; j < i; j++) best = Math.min(best, 2 * M[j] + 2 ** (i - j) - 1); M[i] = best; } return M[n]; };
reg('hanoi', 'hanoi', 2, c => {
  const { r, D, k } = c, v = k % 4, j = Math.floor(k / 4), n = clamp(lerp(2, 6, D) + (v === 0 ? j : 0) + ri(r, 0, 1), 2, 10);
  if (v === 1) { const nn = clamp(2 + Math.floor(D * 3) + j % 2 + (r() < .3 ? 1 : 0), 2, 5); return { title: S('Hanojské veže – hra', 'Tower of Hanoi – the game'), type: 'hanoi', pts: 15, intro: hanoiIntro, introTitle: HAN_INTRO, prompt: S(`🗼 Presuň ${nn} disky na poslednú tyč za ${2 ** nn - 1} ťahov.`, `🗼 Move ${nn} discs to the last peg in ${2 ** nn - 1} moves.`), data: { n: nn, require: 'min' }, hints: [S('Ak chceš presunúť najväčší disk, kam musia najprv ísť všetky menšie?', 'To move the largest disc, where must all the smaller ones go first?'), 'dyn', 'dyn'], explain: [] }; }
  if (v === 0) return { title: S('Najmenší počet ťahov', 'Fewest moves'), type: 'number', intro: hanoiIntro, introTitle: HAN_INTRO, prompt: S(`🗼 Hanojská veža má ${n} ${n < 5 ? 'disky' : 'diskov'}. Koľko ťahov najmenej treba na presun?`, `🗼 A Hanoi tower has ${n} discs. Fewest moves to move it?`), data: { answer: 2 ** n - 1 },
    hints: [S('Zisti, koľko ťahov treba pre 1, 2 a 3 disky. Všimni si vzor.', 'Find how many moves 1, 2 and 3 discs need. Spot the pattern.'), S('Pre n diskov platí: najprv n − 1 diskov preč, potom jeden ťah, potom znova n − 1 diskov.', 'For n discs: first n − 1 discs out of the way, then one move, then n − 1 discs again.')],
    explain: [S('Označme T(n) počet ťahov. Najväčší disk sa dá hýbať, až keď sú ostatné n − 1 diskov na inej tyči: T(n) = T(n − 1) + 1 + T(n − 1).', 'Let T(n) be the number of moves. The largest disc can move only when the other n − 1 discs sit on another peg: T(n) = T(n − 1) + 1 + T(n − 1).'), S(`Z toho T(1)=1, T(2)=3, T(3)=7 … T(n)=2ⁿ − 1, teda T(${n}) = ${2 ** n - 1}.`, `So T(1)=1, T(2)=3, T(3)=7 … T(n)=2ⁿ − 1, hence T(${n}) = ${2 ** n - 1}.`)] };
  if (v === 2 || D < .6) { const kk = ri(r, 1, n), times = 2 ** (n - kk); return { title: S('Koľkokrát sa disk pohne?', 'How often does a disc move?'), type: 'number', intro: hanoiIntro, introTitle: HAN_INTRO, prompt: S(`🗼 ${n} ${n < 5 ? 'disky' : 'diskov'}, najrýchlejší spôsob. Koľkokrát sa pohne disk č. ${kk}? (1 = najmenší)`, `🗼 ${n} discs, the fastest way. How many times does disc no. ${kk} move? (1 = smallest)`), data: { answer: times },
    hints: [S('Koľkokrát sa pohne najväčší disk?', 'How many times does the largest disc move?'), S('Každý menší disk sa pohne dvakrát tak často ako nasledujúci väčší.', 'Each smaller disc moves twice as often as the next larger one.')],
    explain: [S('Najväčší disk (číslo ' + n + ') sa pohne iba raz.', 'The largest disc (number ' + n + ') moves only once.'), S(`Každý menší disk sa pohne dvakrát častejšie: disk ${kk} sa pohne 2^${n - kk} = ${times} krát.`, `Each smaller disc moves twice as often: disc ${kk} moves 2^${n - kk} = ${times} times.`)] }; }
  const m = clamp(Math.floor(D * 8) + 1 + (j % 3), 3, 8); return { title: S('Štyri tyče', 'Four pegs'), type: 'number', intro: hanoiIntro, introTitle: HAN_INTRO, prompt: S(`Hanojské veže so ŠTYRMI tyčami (ostatné pravidlá sú rovnaké) a ${m} diskami. Najmenej koľko ťahov potrebuješ? (Tip: pre 1, 2, 3, 4 disky je to 1, 3, 5, 9 ťahov.)`, `A Tower of Hanoi with FOUR pegs (other rules the same) and ${m} discs. What is the fewest moves needed? (Hint: for 1, 2, 3, 4 discs it is 1, 3, 5, 9 moves.)`), data: { answer: fs4(m) },
    hints: [S('Najprv presuň časť diskov na pomocnú tyč pomocou všetkých štyroch tyčí.', 'First move some discs to a helper peg using all four pegs.'), S('Zvyšok presuň na 3 tyčiach a potom časť zase naspäť.', 'Move the rest using 3 pegs, then move the first part again.')],
    explain: [S('Rozdelíme veže: horných k diskov presunieme na 4 tyčiach, spodných (n − k) na 3 tyčiach (2^(n−k) − 1 ťahov) a hornú časť znova.', 'Split the tower: the top k discs move using 4 pegs, the bottom n − k discs using 3 pegs (2^(n−k) − 1 moves), then the top part again.'), S(`Najlepšia voľba k dáva ${fs4(m)} ťahov.`, `The best choice of k gives ${fs4(m)} moves.`)] };
});

/* ---------- task types: chess board & hanoi ---------- */
TaskTypes.chess = {
  mount(box, task, ctx) {
    const d = task.data, N = d.N, blocked = new Set(d.blocked.map(([a, b]) => a * N + b)), P = CHP[d.piece], D = ctx.session.data;
    const cellsEl = [], wrap = h('div', { class: 'chessb play', style: `--n:${N}`, role: 'grid' }), info = h('p', { class: 'ferry-info', role: 'status' });
    let hl = null;
    const attackSet = d.mode === 'attack' ? new Set(chessMoves(d.piece, d.start[0], d.start[1], N, blocked).map(([a, b]) => a * N + b)) : null;
    const minPath = d.mode === 'reach' ? chessPath(d.piece, N, blocked, d.start, d.target) : null;
    if (!D.sel) D.sel = new Set(); if (!D.path) D.path = [d.start.slice()];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const b = h('button', { type: 'button', class: 'cs ' + ((r + c) % 2 ? 'dc' : 'lc'), 'aria-label': sqName(N, r, c), onclick: () => tap(r, c) }); if (c === 0) b.append(h('i', { class: 'co l' }, N - r)); if (r === N - 1) b.append(h('i', { class: 'co b' }, FILES[c])); b.append(h('span')); cellsEl.push(b); wrap.append(b); }
    const same = (a, b) => a[0] === b[0] && a[1] === b[1];
    function draw() {
      const last = D.path[D.path.length - 1];
      cellsEl.forEach((b, i) => {
        const r = Math.floor(i / N), c = i % N, sp = b.lastChild; let txt = '', cls = 'cs ' + ((r + c) % 2 ? 'dc' : 'lc');
        if (blocked.has(i)) { txt = '✖'; cls += ' blk'; }
        if (d.mode === 'attack') { if (r === d.start[0] && c === d.start[1]) { txt = P.g; cls += ' pc'; } else if (D.sel.has(i)) { txt = '✓'; cls += ' sel'; } }
        else { const pi = D.path.findIndex(p => p[0] === r && p[1] === c); if (same([r, c], d.target) && !same(last, d.target)) { txt = '🏁'; cls += ' goal'; } if (pi > 0) { txt = pi; cls += ' trail'; } if (same(last, [r, c])) { txt = P.g; cls += ' pc'; } else if (pi === 0) { txt = '○'; cls += ' trail'; } if (hl && hl.has(i)) cls += ' hint'; }
        b.className = cls; sp.textContent = txt;
      });
      info.textContent = d.mode === 'attack' ? `${t('chessMarked')}: ${D.sel.size}` : `${t('moves')}: ${D.path.length - 1}`;
    }
    function tap(r, c) {
      const i = r * N + c;
      if (d.mode === 'attack') { if (blocked.has(i) || (r === d.start[0] && c === d.start[1])) return; D.sel.has(i) ? D.sel.delete(i) : D.sel.add(i); hl = null; draw(); return; }
      const last = D.path[D.path.length - 1];
      if (D.path.length > 1 && same([r, c], D.path[D.path.length - 2])) { D.path.pop(); hl = null; draw(); return; }
      if (!chessMoves(d.piece, last[0], last[1], N, blocked).some(m => same(m, [r, c]))) return ctx.nudge(t('chessIllegal'));
      D.path.push([r, c]); hl = null; draw();
      if (same([r, c], d.target)) { const used = D.path.length - 1; if (used <= minPath.length - 1) ctx.solved(); else { ctx.wrong(S(`Do cieľa si sa dostal v ${used} ťahoch – to sa dá aj rýchlejšie, najmenej je ${minPath.length - 1} ťahov. Skús znova!`, `You reached the goal in ${used} moves – it can be done faster, the minimum is ${minPath.length - 1}. Try again!`)); D.path = [d.start.slice()]; draw(); } }
    }
    box.append(wrap, info, h('button', { type: 'button', class: 'btn ghost small', onclick: () => { D.sel = new Set(); D.path = [d.start.slice()]; hl = null; draw(); } }, t('restart')));
    draw();
    if (d.mode === 'attack') ctx.setCheck(() => {
      const miss = [...attackSet].filter(i => !D.sel.has(i)).length, extra = [...D.sel].filter(i => !attackSet.has(i)).length;
      if (!miss && !extra) return ctx.solved();
      ctx.wrong(S(`${miss ? `Ešte ${miss} ${miss === 1 ? 'políčko chýba' : miss < 5 ? 'políčka chýbajú' : 'políčok chýba'}. ` : ''}${extra ? `${extra} ${extra === 1 ? 'označené políčko' : extra < 5 ? 'označené políčka' : 'označených políčok'} figúrka nedosiahne. ` : ''}Pozri sa na pravidlá pohybu hore.`, `${miss ? `${miss} square${miss === 1 ? ' is' : 's are'} still missing. ` : ''}${extra ? `${extra} marked square${extra === 1 ? '' : 's'} cannot be reached. ` : ''}Look at the movement rules above.`));
    }); else ctx.setCheck(null);
    return {
      dynHint(idx) {
        if (d.mode === 'attack') { if (idx <= 1) return { text: S('Začni smerom, ktorým figúrka vie ísť ako prvým, a označ všetky políčka v tom smere, kam dôjde.', 'Start with one direction the piece can go and mark every square it reaches that way.') }; const miss = [...attackSet].filter(i => !D.sel.has(i)); if (!miss.length) return null; const i = miss[0]; return { text: S(`Označ políčko ${sqName(N, Math.floor(i / N), i % N)}.`, `Mark the square ${sqName(N, Math.floor(i / N), i % N)}.`), hl: () => { hl = new Set([i]); draw(); } }; }
        const last = D.path[D.path.length - 1], p = chessPath(d.piece, N, blocked, last, d.target); if (!p || p.length < 2) return null;
        if (idx <= 1) return { text: S(`Z poslednej polohy vie figúrka ísť na ${chessMoves(d.piece, last[0], last[1], N, blocked).length} políčok. Ktoré z nich je bližšie k cieľu?`, `From its current square the piece can go to ${chessMoves(d.piece, last[0], last[1], N, blocked).length} squares. Which of them is closer to the goal?`), hl: () => { hl = new Set(chessMoves(d.piece, last[0], last[1], N, blocked).map(([a, b]) => a * N + b)); draw(); } };
        const nx = p[1]; return { text: S(`Dobrý ďalší ťah: ${sqName(N, ...nx)}.`, `A good next move: ${sqName(N, ...nx)}.`), hl: () => { hl = new Set([nx[0] * N + nx[1]]); draw(); } };
      }
    };
  },
  explainSteps(task) {
    const d = task.data, N = d.N, blocked = new Set(d.blocked.map(([a, b]) => a * N + b)), P = CHP[d.piece];
    if (d.mode === 'attack') { const mv = chessMoves(d.piece, d.start[0], d.start[1], N, blocked), set = new Set(mv.map(([a, b]) => a * N + b)); return [{ text: S(`Figúrka sa dostane na ${mv.length} políčok: ${mv.map(([a, b]) => sqName(N, a, b)).sort().join(', ')}.`, `The piece can reach ${mv.length} squares: ${mv.map(([a, b]) => sqName(N, a, b)).sort().join(', ')}.`), render: box => box.insertAdjacentHTML('beforeend', boardHtml(N, (r, c) => r === d.start[0] && c === d.start[1] ? { txt: P.g, cls: 'pc' } : blocked.has(r * N + c) ? { txt: '✖', cls: 'blk' } : set.has(r * N + c) ? { txt: '•', cls: 'mvdot' } : {})) }]; }
    const path = chessPath(d.piece, N, blocked, d.start, d.target);
    return [{ text: S(`Najkratšia cesta má ${path.length - 1} ťahov: ${path.map(p => sqName(N, ...p)).join(' → ')}.`, `The shortest route takes ${path.length - 1} moves: ${path.map(p => sqName(N, ...p)).join(' → ')}.`), render: box => box.insertAdjacentHTML('beforeend', boardHtml(N, (r, c) => { const i = path.findIndex(p => p[0] === r && p[1] === c); return i === 0 ? { txt: P.g, cls: 'pc' } : i > 0 ? { txt: i, cls: 'trail' } : {}; })) }];
  }
};

TaskTypes.hanoi = {
  mount(box, task, ctx) {
    const d = task.data, n = d.n, D = ctx.session.data, minMoves = 2 ** n - 1, free = !!d.free;
    if (!D.pegs) { D.pegs = [range(n).map(i => n - i), [], []]; D.moves = 0; D.hist = []; }
    let from = null, busy = false, hlPeg = null, timer = null; ctx.cleanup(() => { clearTimeout(timer); busy = false; });
    const stage = h('div', { class: 'hanoi' }), info = h('p', { class: 'ferry-info', role: 'status', 'aria-live': 'polite' }), msg = h('div', { class: 'ferry-msg', role: 'status' });
    const hue = s => `hsl(${(s * 360 / (n + 1) + 20) % 360} 70% 52%)`;
    function draw() {
      stage.replaceChildren(...D.pegs.map((p, i) => {
        const peg = h('button', { type: 'button', class: 'peg' + (from === i ? ' sel' : '') + (hlPeg === i ? ' hint' : ''), 'aria-label': `${t('hanoiPeg')} ${'ABC'[i]}: ${p.length ? p.slice().reverse().join(', ') : '–'}`, disabled: busy, onclick: () => tap(i) },
          h('div', { class: 'rod' }), h('div', { class: 'discs' }, p.map((s, j) => h('div', { class: 'disc' + (from === i && j === p.length - 1 ? ' lift' : ''), style: `width:${28 + s / n * 68}%;background:${hue(s)}` }, s))), h('span', { class: 'pl' }, 'ABC'[i]));
        return peg;
      }));
      info.textContent = `${t('moves')}: ${D.moves} · ${t('hanoiMin')}: ${minMoves}`;
    }
    function apply(a, b) { const disc = D.pegs[a].pop(); D.pegs[b].push(disc); D.moves++; D.hist.push([a, b]); }
    function check() {
      if (D.pegs[2].length !== n) return;
      if (free || D.moves <= minMoves) { ctx.solved(); return; }
      ctx.wrong(S(`Veža je presunutá v ${D.moves} ťahoch – skvelé! Dá sa to však za ${minMoves}. Skús znova a hľadaj vzor.`, `The tower is moved in ${D.moves} moves – great! But it can be done in ${minMoves}. Try again and look for the pattern.`)); reset();
    }
    function tap(i) {
      if (busy) return; msg.textContent = ''; hlPeg = null;
      if (from == null) { if (!D.pegs[i].length) return ctx.nudge(t('hanoiEmpty')); from = i; draw(); return; }
      if (from === i) { from = null; draw(); return; }
      const top = D.pegs[from][D.pegs[from].length - 1], tgt = D.pegs[i][D.pegs[i].length - 1];
      if (tgt && tgt < top) { msg.textContent = t('hanoiBig'); from = null; draw(); return; }
      apply(from, i); from = null; draw(); check();
    }
    function reset() { D.pegs = [range(n).map(i => n - i), [], []]; D.moves = 0; D.hist = []; from = null; draw(); }
    function undo() { if (!D.hist.length || busy) return; const [a, b] = D.hist.pop(); D.pegs[a].push(D.pegs[b].pop()); D.moves--; from = null; draw(); }
    function auto() {
      if (busy) return; const plan = hanoiPlan(D.pegs, 2); if (!plan.length) return; busy = true; from = null;
      const step = () => { const m = plan.shift(); if (!m) { busy = false; draw(); return; } apply(m[0], m[1]); draw(); timer = setTimeout(step, ctx.session.fast ? 0 : 420); };
      draw(); timer = setTimeout(step, 300);
    }
    const ctl = h('div', { class: 'ferry-controls' }, h('button', { type: 'button', class: 'btn ghost small', onclick: undo }, '↶ ' + t('undo')), h('button', { type: 'button', class: 'btn ghost small', onclick: reset }, t('restart')),
      free ? h('button', { type: 'button', class: 'btn ghost small', onclick: () => { const p = hanoiPlan(D.pegs, 2)[0]; if (p) { hlPeg = p[0]; msg.textContent = t('hanoiHintMsg', { a: 'ABC'[p[0]], b: 'ABC'[p[1]], d: p[2] }); draw(); } } }, '💡 ' + t('hint')) : null,
      free ? h('button', { type: 'button', class: 'btn primary small', onclick: auto }, '▶ ' + t('hanoiAuto')) : null);
    box.append(stage, msg, info, ctl); draw(); ctx.setCheck(null);
    return {
      dynHint(idx) {
        const plan = hanoiPlan(D.pegs, 2); if (!plan.length) return null;
        if (idx <= 1) return { text: S('Na presun veže s n diskami potrebuješ najprv presunúť n − 1 diskov na pomocnú tyč. Ktorý disk sa v tvojej pozícii pohne ako prvý?', 'To move an n-disc tower you first need the top n − 1 discs on the helper peg. Which disc moves first in your position?') };
        const m = plan[0]; return { text: S(`Dobrý ďalší ťah: disk ${m[2]} z tyče ${'ABC'[m[0]]} na tyč ${'ABC'[m[1]]}.`, `A good next move: disc ${m[2]} from peg ${'ABC'[m[0]]} to peg ${'ABC'[m[1]]}.`), hl: () => { hlPeg = m[0]; draw(); } };
      }
    };
  },
  explainSteps(task) {
    const n = task.data.n, plan = hanoiPlan([range(n).map(i => n - i), [], []], 2);
    return [{ text: S(`Pravidlo: na presun n diskov najprv presuň n − 1 diskov na pomocnú tyč, potom najväčší disk na cieľ a nakoniec n − 1 diskov na cieľ.`, `Rule: to move n discs first move n − 1 discs to the helper peg, then the largest disc to the goal, and finally the n − 1 discs onto the goal.`) },
      { text: S(`Pre ${n} diskov to je ${plan.length} ťahov: ${plan.map(m => 'ABC'[m[0]] + '→' + 'ABC'[m[1]]).join(', ')}.`, `For ${n} discs that is ${plan.length} moves: ${plan.map(m => 'ABC'[m[0]] + '→' + 'ABC'[m[1]]).join(', ')}.`) }];
  }
};
