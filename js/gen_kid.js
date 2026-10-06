'use strict';
/* LogiQ – picture-based tasks with minimal text for the youngest students (grades 2–3/4), plus age gating of abstract families. */
const KEMO = ['🍎', '🍌', '🍇', '🍓', '🐶', '🐱', '🐸', '🐥', '⭐', '🔵', '🔺', '🟩', '🚗', '🎈', '🌸', '⚽'];
/* difficulty inside the kid range (grades 2–3): grade 2 spans 0–.55, grade 3 spans .45–1 */
const kd = c => c.g <= 2 ? clamp((c.D - .03) / .11 * .55, 0, .6) : c.g === 3 ? clamp(.45 + (c.D - .14) / .12 * .55, .4, 1) : 1;
const kpm = (parts) => `<div class="pm">${parts.join('')}</div>`;
const kspan = (e, n) => `<span class="pmg">${e.repeat(n)}</span>`;
const kop = x => `<b class="pmop">${x}</b>`;

reg('emopattern', 'seq', 2, c => {
  const { r } = c, D = kd(c), pats = D < .3 ? ['AB', 'AAB', 'ABB'] : D < .6 ? ['AAB', 'ABC', 'ABB', 'AABB'] : ['ABC', 'AABB', 'ABAC', 'AABC'];
  const p = pick(pats, r), letters = [...new Set(p)], em = shuffle(KEMO, r).slice(0, letters.length + 2), map = {}; letters.forEach((l, i) => map[l] = em[i]);
  const L = p.length * 2 + ri(r, 0, p.length - 1), items = range(L).map(i => map[p[i % p.length]]), next = map[p[L % p.length]];
  const opts = shuffle([next, ...shuffle(em.filter(x => x !== next), r).slice(0, 2)], r), unit = p.split('').map(l => map[l]).join(' ');
  return { title: S('Čo bude ďalej?', 'What comes next?'), type: 'choice', visual: () => vEmo([...items, '❓']), prompt: S('Čo bude ďalej?', 'What comes next?'), data: { options: opts, correct: opts.indexOf(next), cols: 3 },
    hints: [S('Pozri, čo sa opakuje.', 'Look at what repeats.'), S('Ukáž prstom každú skupinku.', 'Point at each little group.')], explain: [S(`Opakuje sa: ${unit}`, `This repeats: ${unit}`), S(`Ďalší je ${next}.`, `Next is ${next}.`)] };
});

const ODD = [[['🍎', '🍌', '🍇', '🍓', '🍒'], S('ovocie', 'fruit')], [['🐶', '🐱', '🐰', '🐻', '🐸'], S('zvieratá', 'animals')], [['🚗', '🚌', '🚲', '✈️', '🚂'], S('dopravné prostriedky', 'vehicles')], [['⚽', '🏀', '🎾', '🏐', '🏈'], S('lopty', 'balls')], [['🌹', '🌻', '🌷', '🌼', '🌸'], S('kvety', 'flowers')]];
reg('oddone', 'logic', 2, c => {
  const { r } = c, [ga, gb] = shuffle(ODD, r), three = shuffle(ga[0], r).slice(0, 3), odd = pick(gb[0], r), items = shuffle([...three, odd], r);
  return { title: S('Ktorý sa nehodí?', 'Which does not belong?'), type: 'choice', prompt: S('Ktorý sa nehodí k ostatným?', 'Which one does not belong?'), data: { options: items, correct: items.indexOf(odd), cols: 4 },
    hints: [S('Povedz si, čo to je.', 'Say what each one is.'), S('Tri sú rovnaký druh.', 'Three are the same kind.')], explain: [S(`Tri sú ${tx(ga[1])}: ${three.join(' ')}`, `Three are ${ga[1].en}: ${three.join(' ')}`), S(`${odd} je ${tx(gb[1])}, preto sa nehodí.`, `${odd} is ${gb[1].en}, so it does not belong.`)] };
});

reg('compare', 'data', 2, c => {
  const { r, k } = c, D = kd(c), e1 = pick(KEMO, r), e2 = pick(KEMO.filter(x => x !== e1), r), mx = lerp(5, 12, D); let a = ri(r, 1, mx), b = ri(r, 1, mx); if (k % 4 === 3) b = a;
  const vis = () => `<div class="cmp"><div>${e1.repeat(a)}</div><div>${e2.repeat(b)}</div></div>`;
  if (k % 3 === 2 && a !== b) { const big = Math.abs(a - b); return { title: S('O koľko viac?', 'How many more?'), sim: { kind: 'tapcount', rows: [Array(a).fill(e1), Array(b).fill(e2)] }, type: 'number', visual: vis, prompt: S(`O koľko je ${a > b ? e1 : e2} viac?`, `How many more ${a > b ? e1 : e2} are there?`), data: { answer: big },
    hints: [S('Spáruj obrázky z oboch riadkov.', 'Pair up the pictures from both rows.'), S('Spočítaj, čo ostalo bez páru.', 'Count what has no partner.')], explain: [S('Každému z menšieho riadku priraď jeden z väčšieho.', 'Match each in the shorter row with one in the longer.'), S(`Bez páru ostáva ${big}.`, `${big} are left without a partner.`)] }; }
  const opts = [e1, e2, S('Rovnako', 'Same')];
  return { title: S('Čoho je viac?', 'Which has more?'), sim: { kind: 'tapcount', rows: [Array(a).fill(e1), Array(b).fill(e2)] }, type: 'choice', visual: vis, prompt: S('Čoho je viac?', 'Which has more?'), data: { options: opts, correct: a > b ? 0 : a < b ? 1 : 2, cols: 3 },
    hints: [S('Spočítaj každý riadok.', 'Count each row.'), S('Porovnaj dve čísla.', 'Compare the two numbers.')], explain: [S(`${e1}: ${a}, ${e2}: ${b}.`, `${e1}: ${a}, ${e2}: ${b}.`), a === b ? S('Je ich rovnako.', 'They are the same.') : S(`Viac je ${a > b ? e1 : e2}.`, `There are more ${a > b ? e1 : e2}.`)] };
});

reg('picmath', 'word', 2, c => {
  const { r, g, k } = c, D = kd(c), e = pick(KEMO, r), mx = lerp(8, 30, D), v = k % 3;
  if (v === 0) { const a = ri(r, 1, mx - 2), b = ri(r, 1, mx - a); return { title: S('Koľko spolu?', 'How many in all?'), sim: { kind: 'tapcount', rows: [Array(a).fill(e), Array(b).fill(e)] }, type: 'number', visual: () => kpm([kspan(e, a), kop('+'), kspan(e, b), kop('='), kop('?')]), prompt: S('Koľko je spolu?', 'How many altogether?'), data: { answer: a + b },
    hints: [S('Spočítaj všetky obrázky.', 'Count all the pictures.'), S('Najprv prvú skupinku, potom pridaj druhú.', 'Count the first group, then add the second.')], explain: [S(`${a} + ${b} = ${a + b}`, `${a} + ${b} = ${a + b}`)] }; }
  if (v === 1) { const a = ri(r, 3, mx), b = ri(r, 1, a - 1); return { title: S('Koľko ostane?', 'How many are left?'), sim: { kind: 'tapcount', rows: [Array(a).fill(e)] }, type: 'number', visual: () => kpm([kspan(e, a), kop('−'), kspan('❌', b), kop('='), kop('?')]), prompt: S('Koľko ostane?', 'How many are left?'), data: { answer: a - b },
    hints: [S('❌ znamená, že sa odoberie.', '❌ means they are taken away.'), S('Spočítaj tie, ktoré ostali.', 'Count the ones that stay.')], explain: [S(`${a} − ${b} = ${a - b}`, `${a} − ${b} = ${a - b}`)] }; }
  const gp = ri(r, 2, Math.min(5, 2 + Math.floor(D * 4))), per = ri(r, 2, Math.min(6, 2 + Math.floor(D * 5)));
  return { title: S('Skupinky', 'Groups'), sim: { kind: 'tapcount', rows: [Array(gp * per).fill(e)] }, type: 'number', visual: () => kpm([...range(gp).map(() => kspan(e, per)), kop('='), kop('?')]), prompt: S('Koľko je spolu?', 'How many altogether?'), data: { answer: gp * per },
    hints: [S('Spočítaj jednu skupinku.', 'Count one group.'), S('Teraz pripočítaj ďalšie skupinky.', 'Now add the other groups.')], explain: [S(`${range(gp).map(() => per).join(' + ')} = ${gp * per}`, `${range(gp).map(() => per).join(' + ')} = ${gp * per}`)] };
});

reg('sharing', 'word', 2, c => {
  const { r } = c, D = kd(c), kids = ri(r, 2, Math.min(5, 2 + Math.floor(D * 4))), per = ri(r, 2, Math.min(7, 3 + Math.floor(D * 5))), e = pick(['🍪', '🍎', '🍬', '🍓', '⭐', '🎈'], r), who = shuffle(['👧', '👦', '🧒', '👶', '🧑'], r).slice(0, kids);
  return { title: S('Rozdeľ rovnako', 'Share equally'), sim: { kind: 'share', kids, total: kids * per, e, who }, type: 'number', visual: () => `<div class="cmp"><div>${e.repeat(kids * per)}</div><div>${who.join(' ')}</div></div>`, prompt: S('Rozdeľ rovnako. Koľko dostane každé dieťa?', 'Share equally. How many does each child get?'), data: { answer: per },
    hints: [S('Dávaj každému po jednom, kým sa nerozdá všetko.', 'Give each child one at a time until all are given out.'), S('Spočítaj, koľko má jedno dieťa.', 'Count how many one child has.')], explain: [S(`${kids * per} : ${kids} = ${per}`, `${kids * per} : ${kids} = ${per}`)] };
});

reg('numline', 'seq', 2, c => {
  const { r } = c, D = kd(c), step = pick(D < .3 ? [1, 1, 2] : D < .65 ? [1, 2, 5, 10] : [2, 5, 10, 3, 4], r), start = ri(r, 0, Math.max(3, lerp(8, 60, D))) * (step > 1 && r() < .5 ? 1 : 1), len = 5, hole = ri(r, 1, len - 1), terms = range(len).map(i => start + i * step), ans = terms[hole];
  return { title: S('Aké číslo chýba?', 'Which number is missing?'), type: 'number', visual: () => `<div class="seqrow">${terms.map((x, i) => `<span class="${i === hole ? 'q' : ''}">${i === hole ? '?' : x}</span>`).join('<i>,</i>')}</div>`, prompt: S('Aké číslo chýba?', 'Which number is missing?'), data: { answer: ans },
    hints: [S('O koľko sa čísla menia?', 'By how much do the numbers change?'), S('Pridaj to isté číslo.', 'Add the same number.')], explain: [S(`Pridávame ${step}. Chýba ${ans}.`, `We add ${step}. The missing number is ${ans}.`)] };
});

reg('shapecount', 'geom', 2, c => {
  const { r } = c, D = kd(c), pool = shuffle(['🔺', '🟦', '🔵', '⭐', '🟨', '🟢'], r).slice(0, ri(r, 3, 4)), total = lerp(8, 18, D), items = range(total).map(() => pick(pool, r)), target = pick(pool, r); if (!items.includes(target)) items[0] = target;
  const cntT = items.filter(x => x === target).length;
  return { title: S('Spočítaj tvary', 'Count the shapes'), sim: { kind: 'tapcount', rows: [items] }, type: 'number', visual: () => vEmo(items), prompt: S(`Koľko ${target} vidíš?`, `How many ${target} do you see?`), data: { answer: cntT },
    hints: [S('Každý tvar označ prstom.', 'Touch each shape with your finger.'), S('Počítaj len tie, ktoré hľadáš.', 'Count only the ones you look for.')], explain: [S(`Je ich ${cntT}.`, `There are ${cntT}.`)] };
});

reg('maketen', 'algebra', 2, c => {
  const { r } = c, D = kd(c), T = D < .1 ? 10 : D < .3 ? pick([10, 20], r) : D < .55 ? pick([20, 50], r) : D < .8 ? pick([50, 100], r) : pick([100, 200], r);
  const a = T <= 20 ? ri(r, 1, T - 1) : T === 50 ? ri(r, 3, 47) : T === 100 ? ri(r, 5, 95) : ri(r, 10, 190);
  if (a <= 0 || a >= T) return null;
  return { title: S('Doplň do ' + T, 'Make ' + T), sim: T <= 50 ? { kind: 'tenframe', T, a } : null, type: 'number', visual: () => `<div class="eqbig">${a} + ? = ${T}</div>`, prompt: S('Doplň číslo.', 'Fill in the number.'), data: { answer: T - a },
    hints: [S(`Počítaj od ${a} až po ${T}.`, `Count up from ${a} to ${T}.`), S('Koľko krokov si urobil?', 'How many steps did you take?')], explain: [S(`${a} + ${T - a} = ${T}`, `${a} + ${T - a} = ${T}`)] };
});

reg('missing', 'algebra', 2, c => {
  const { r } = c, D = kd(c), mx = lerp(12, 80, D), forms = D < .1 ? [0, 1] : D < .25 ? [0, 1, 2] : D < .5 ? [0, 1, 2, 3] : [0, 1, 2, 3, 4], f = pick(forms, r);
  let a, b, cc, txt, ans;
  if (f === 0) { b = ri(r, 1, mx); ans = ri(r, 1, mx); cc = ans + b; txt = `? + ${b} = ${cc}`; }
  else if (f === 1) { a = ri(r, 1, mx); ans = ri(r, 1, mx); cc = a + ans; txt = `${a} + ? = ${cc}`; }
  else if (f === 2) { a = ri(r, 4, mx + 5); ans = ri(r, 1, a - 1); cc = a - ans; txt = `${a} − ? = ${cc}`; }
  else if (f === 3) { b = ri(r, 1, mx); cc = ri(r, 1, mx); ans = cc + b; txt = `? − ${b} = ${cc}`; }
  else { a = ri(r, 2, 6 + Math.floor(D * 4)); ans = ri(r, 2, 10); cc = a * ans; txt = `${a} × ? = ${cc}`; }
  return { title: S('Aké číslo chýba?', 'Which number is missing?'), type: 'number', visual: () => `<div class="eqbig">${txt}</div>`, prompt: S('Nájdi číslo namiesto otáznika.', 'Find the number for the question mark.'), data: { answer: ans },
    hints: [S('Skús rôzne čísla a over.', 'Try numbers and check.'), S('Použi opačnú operáciu.', 'Use the opposite operation.')], explain: [S(`Správne je ${ans}: ${txt.replace('?', ans)}`, `The answer is ${ans}: ${txt.replace('?', ans)}`)] };
});

/* ---- age gating: abstract / text-heavy families start later; picture families end earlier ---- */
Object.entries({ knights: 3, culprit: 3, syllogism: 4, bridge: 4, jugs: 5, weighing: 4, numtheory: 5, algebra: 3, magic: 3, cryptarithm: 4, paintedcube: 4, areas: 3, pathgrid: 3, pigeon: 3, perm: 3, choose: 4, rice: 4, chessnon: 3 }).forEach(([k, m]) => { if (GF[k]) GF[k].min = m; });
Object.entries({ emopattern: 4, oddone: 4, compare: 3, picmath: 3, sharing: 3, numline: 3, shapecount: 3, maketen: 3, missing: 3 }).forEach(([k, m]) => { if (GF[k]) GF[k].max = m; });
