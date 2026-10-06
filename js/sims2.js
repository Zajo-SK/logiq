'use strict';
/* LogiQ – more hands-on simulations (registered into SIM_KINDS). Each returns a <details class="sim"> panel. */
const SIM_TITLE = () => L2('Vyskúšaj si to', 'Try it yourself');
const simBanner = (txt) => h('p', { class: 'simwin' }, txt);
const simBtn = (label, fn, cls = 'ghost small', extra) => h('button', Object.assign({ type: 'button', class: 'btn ' + cls, onclick: fn }, extra || {}), label);
const simTap = () => { if (typeof tone === 'function') tone(SND.tap); };
const simWrap = (hint, ...kids) => simPanel(SIM_TITLE(), h('div', null, hint ? h('p', { class: 'muted' }, hint) : null, ...kids));
const rndI = n => Math.floor(Math.random() * n);

/* ---- balance scale: find the lighter fake coin ---- */
SIM_KINDS.scale = ({ n }) => {
  let fake = rndI(n), zone = Array(n).fill(1), count = 0, tilt = 0, msg = '', guess = false, done = false;
  const beam = h('div', { class: 'beam' }), zones = h('div', { class: 'zones' }), info = h('p', { class: 'siminfo', role: 'status' }), ctl = h('div', { class: 'simctl' });
  const zoneNames = [L2('⬅️ Ľavá miska', '⬅️ Left pan'), L2('Mimo váh', 'Off the scale'), L2('Pravá miska ➡️', 'Right pan ➡️')];
  function draw() {
    beam.style.transform = `rotate(${tilt}deg)`;
    zones.replaceChildren(...[0, 1, 2].map(z => h('div', { class: 'zone z' + z }, h('b', null, zoneNames[z]), h('div', { class: 'coins' }, range(n).filter(i => zone[i] === z).map(i => h('button', { type: 'button', class: 'coin', disabled: done, 'aria-label': `${L2('minca', 'coin')} ${i + 1}`, onclick: () => { if (guess) return pick1(i); zone[i] = zone[i] === 1 ? 0 : zone[i] === 0 ? 2 : 1; draw(); } }, '🪙', h('small', null, i + 1)))))));
    info.textContent = `${L2('Vážení', 'Weighings')}: ${count}${msg ? ' · ' + msg : ''}`;
    ctl.replaceChildren(simBtn('⚖️ ' + L2('Zváž', 'Weigh'), weigh, 'primary', { disabled: done }), simBtn((guess ? '✋ ' : '🔍 ') + (guess ? L2('Zrušiť tip', 'Cancel guess') : L2('Tipnem falošnú', 'Guess the fake')), () => { guess = !guess; msg = guess ? L2('Ťukni na mincu, ktorú tipuješ.', 'Tap the coin you think is fake.') : ''; draw(); }, 'ghost small', { disabled: done }), simBtn('↺ ' + L2('Nová hra', 'New game'), reset));
  }
  function weigh() { const L = range(n).filter(i => zone[i] === 0), R = range(n).filter(i => zone[i] === 2); if (!L.length || !R.length) { msg = L2('Daj mince na obe misky.', 'Put coins on both pans.'); return draw(); } if (L.length !== R.length) { msg = L2('Na obe misky daj rovnaký počet mincí.', 'Put the same number of coins on both pans.'); return draw(); } count++; const wl = L.reduce((s, i) => s + (i === fake ? 1 : 2), 0), wr = R.reduce((s, i) => s + (i === fake ? 1 : 2), 0); tilt = wl === wr ? 0 : wl < wr ? 12 : -12; msg = wl === wr ? L2('Rovnováha ⚖️', 'Balanced ⚖️') : wl < wr ? L2('Ľavá strana je ľahšia', 'The left side is lighter') : L2('Pravá strana je ľahšia', 'The right side is lighter'); simTap(); draw(); }
  function pick1(i) { if (i === fake) { done = true; msg = L2(`Správne! Minca ${i + 1} je falošná – našiel si ju na ${count} vážení.`, `Correct! Coin ${i + 1} is the fake – found with ${count} weighings.`); } else { msg = L2(`Minca ${i + 1} nie je falošná. Skús ďalej.`, `Coin ${i + 1} is not fake. Keep trying.`); } guess = false; draw(); }
  function reset() { fake = rndI(n); zone = Array(n).fill(1); count = 0; tilt = 0; msg = ''; guess = false; done = false; draw(); }
  draw();
  return simWrap(L2('Jedna z mincí je ľahšia. Ťukaním meníš miesto mince (vľavo → vpravo → mimo), potom stlač „Zváž“.', 'One coin is lighter. Tap a coin to move it (left → right → off), then press “Weigh”.'), h('div', { class: 'scalebox' }, beam), zones, info, ctl);
};

/* ---- water jugs ---- */
SIM_KINDS.jugs = ({ a, b, t }) => {
  let x = 0, y = 0, steps = 0; const cap = [a, b], unit = Math.min(18, Math.floor(150 / Math.max(a, b)));
  const jugs = h('div', { class: 'jugs' }), info = h('p', { class: 'siminfo', role: 'status' }), ctl = h('div', { class: 'simctl' });
  const lv = () => [x, y];
  function draw() {
    jugs.replaceChildren(...[0, 1].map(i => h('div', { class: 'jugcol' }, h('div', { class: 'jug', style: `height:${cap[i] * unit + 6}px` }, h('div', { class: 'water', style: `height:${lv()[i] * unit}px` })), h('b', null, `${lv()[i]} / ${cap[i]} l`))));
    const hit = x === t || y === t; info.textContent = hit ? L2(`🎉 V džbáne je presne ${t} l! Krokov: ${steps}.`, `🎉 Exactly ${t} L in a jug! Steps: ${steps}.`) : `${L2('Cieľ', 'Goal')}: ${t} l · ${L2('kroky', 'steps')}: ${steps}`;
    ctl.replaceChildren(
      simBtn(L2(`Naplniť ${a} l`, `Fill ${a} L`), () => go1(() => { x = a; })), simBtn(L2(`Naplniť ${b} l`, `Fill ${b} L`), () => go1(() => { y = b; })),
      simBtn(L2(`Vyliať ${a} l`, `Empty ${a} L`), () => go1(() => { x = 0; })), simBtn(L2(`Vyliať ${b} l`, `Empty ${b} L`), () => go1(() => { y = 0; })),
      simBtn(`${a} ➜ ${b}`, () => go1(() => { const m = Math.min(x, b - y); x -= m; y += m; })), simBtn(`${b} ➜ ${a}`, () => go1(() => { const m = Math.min(y, a - x); y -= m; x += m; })), simBtn('↺', () => { x = 0; y = 0; steps = 0; draw(); }));
  }
  function go1(f) { f(); steps++; simTap(); draw(); }
  draw();
  return simWrap(L2('Skús kroky: naplniť, vyliať, prelievať.', 'Try the steps: fill, empty, pour.'), jugs, info, ctl);
};

/* ---- bridge & torch ---- */
SIM_KINDS.bridge = ({ times }) => {
  const n = times.length; let side = Array(n).fill(0), torch = 0, total = 0; const sel = new Set();
  const banks = h('div', { class: 'bridgebanks' }), info = h('p', { class: 'siminfo', role: 'status' }), ctl = h('div', { class: 'simctl' });
  function draw() {
    const person = i => h('button', { type: 'button', class: 'plyr' + (sel.has(i) ? ' selp' : ''), disabled: side[i] !== torch, 'aria-label': `${times[i]} ${L2('min', 'min')}`, onclick: () => { sel.has(i) ? sel.delete(i) : sel.size < 2 && sel.add(i); draw(); } }, '🚶', h('small', null, times[i]));
    banks.replaceChildren(h('div', { class: 'bank0' }, h('b', null, L2('Tu', 'Here') + (torch === 0 ? ' 🔦' : '')), h('div', { class: 'players' }, range(n).filter(i => side[i] === 0).map(person))), h('div', { class: 'bridge' }, '🌉'), h('div', { class: 'bank1' }, h('b', null, L2('Tam', 'There') + (torch === 1 ? ' 🔦' : '')), h('div', { class: 'players' }, range(n).filter(i => side[i] === 1).map(person))));
    const all = side.every(s => s === 1); info.textContent = all ? L2(`🎉 Všetci sú na druhej strane! Čas: ${total} min.`, `🎉 Everyone is across! Time: ${total} min.`) : `${L2('Čas', 'Time')}: ${total} min`;
    ctl.replaceChildren(simBtn('➡️ ' + L2('Prejsť s baterkou', 'Cross with the torch'), cross, 'primary', { disabled: !sel.size || all }), simBtn('↺', () => { side = Array(n).fill(0); torch = 0; total = 0; sel.clear(); draw(); }));
  }
  function cross() { const who = [...sel]; total += Math.max(...who.map(i => times[i])); who.forEach(i => side[i] = 1 - side[i]); torch = 1 - torch; sel.clear(); simTap(); draw(); }
  draw();
  return simWrap(L2('Vyber 1 alebo 2 ľudí na strane s baterkou 🔦 a stlač „Prejsť“. Dvojica ide tempom pomalšieho.', 'Pick 1 or 2 people on the torch 🔦 side and press “Cross”. A pair walks at the slower pace.'), banks, info, ctl);
};

/* ---- socks / cards in the dark ---- */
SIM_KINDS.socks = ({ col, need, suits }) => {
  const pool = suits ? ['♠️', '♥️', '♦️', '♣️'] : ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠', '⚫', '🟤'].slice(0, col); let hand = [], hit = null;
  const out = h('div', { class: 'hand' }), info = h('p', { class: 'siminfo', role: 'status' });
  function draw() { out.replaceChildren(...hand.map(c => h('span', { class: 'sock' }, (suits ? '' : '🧦') + c))); const counts = pool.map(c => hand.filter(x => x === c).length); info.textContent = `${L2('Vytiahnuté', 'Drawn')}: ${hand.length} · ${L2('najviac rovnakých', 'most of a kind')}: ${Math.max(0, ...counts)}` + (hit ? ` · 🎉 ${L2(`${need} rovnaké po ${hit} ťahoch!`, `${need} of a kind after ${hit} draws!`)}` : ''); }
  function pull() { hand.push(pool[rndI(pool.length)]); if (!hit && pool.some(c => hand.filter(x => x === c).length >= need)) hit = hand.length; simTap(); draw(); }
  draw();
  return simWrap(L2(`Je tma – ťahaš naslepo. Kedy máš ${need} rovnaké? Skús to viackrát a hľadaj najhorší prípad.`, `It is dark – you draw blindly. When do you have ${need} of a kind? Try several times and look for the worst case.`), out, info, h('div', { class: 'simctl' }, simBtn('✋ ' + L2('Vytiahni naslepo', 'Draw blindly'), pull, 'primary'), simBtn('↺ ' + L2('Znova', 'Again'), () => { hand = []; hit = null; draw(); })));
};

/* ---- arrange kids in a row ---- */
SIM_KINDS.arrange = ({ n }) => {
  const kids = ['👧', '👦', '🧒', '👩', '👨'].slice(0, n), total = fact(n), found = new Set(); let slots = [], msg = '';
  const row = h('div', { class: 'players' }), bank = h('div', { class: 'players' }), info = h('p', { class: 'siminfo', role: 'status' }), list = h('p', { class: 'foundlist' });
  function draw() {
    row.replaceChildren(...range(n).map(i => h('button', { type: 'button', class: 'plyr slot', onclick: () => { if (slots[i] != null) { slots.splice(i, 1); draw(); } } }, slots[i] != null ? kids[slots[i]] : (i + 1))));
    bank.replaceChildren(...kids.map((k, i) => h('button', { type: 'button', class: 'plyr', disabled: slots.includes(i), onclick: () => { slots.push(i); if (slots.length === n) { const key = slots.join(''); msg = found.has(key) ? L2('Toto poradie už máš.', 'You already have this order.') : L2('Nové poradie! ✓', 'New order! ✓'); found.add(key); simTap(); } else msg = ''; draw(); } }, k)));
    info.textContent = `${L2('Nájdené poradia', 'Orders found')}: ${found.size}${msg ? ' · ' + msg : ''}`; list.textContent = [...found].slice(-12).map(k => [...k].map(i => kids[i]).join('')).join('  ');
  }
  draw();
  return simWrap(L2('Ťukaj na deti, aby si ich postavil do radu. Nájdi všetky rôzne poradia!', 'Tap the children to line them up. Find all different orders!'), row, bank, info, list, h('div', { class: 'simctl' }, simBtn(L2('Ďalšie poradie', 'Next order'), () => { slots = []; msg = ''; draw(); }, 'primary'), simBtn('↺ ' + L2('Všetko znova', 'Reset all'), () => { found.clear(); slots = []; msg = ''; draw(); })));
};

/* ---- build outfits ---- */
SIM_KINDS.outfit = ({ a, b, c }) => {
  const sel = [0, 0, 0], sets = [['👕', a], ['👖', b], ['🧢', c]], found = new Set(); let msg = '';
  const rows = h('div'), info = h('p', { class: 'siminfo', role: 'status' }), list = h('p', { class: 'foundlist' });
  function draw() {
    rows.replaceChildren(...sets.map(([e, k], r) => h('div', { class: 'players' }, range(k).map(i => h('button', { type: 'button', class: 'plyr' + (sel[r] === i ? ' selp' : ''), onclick: () => { sel[r] = i; draw(); } }, e, h('small', null, i + 1))))));
    info.textContent = `${L2('Zostavené oblečenia', 'Outfits made')}: ${found.size}${msg ? ' · ' + msg : ''}`; list.textContent = [...found].slice(-10).map(k => k.split('').map((d, r) => sets[r][0] + (+d + 1)).join('')).join('  ');
  }
  draw();
  return simWrap(L2('Vyber jedno z každého radu a stlač „Pridať“. Nájdi všetky rôzne oblečenia!', 'Pick one from each row and press “Add”. Find all different outfits!'), rows, info, list, h('div', { class: 'simctl' }, simBtn('➕ ' + L2('Pridať', 'Add'), () => { const k = sel.join(''); msg = found.has(k) ? L2('Toto už máš.', 'Already have it.') : L2('Nové! ✓', 'New! ✓'); found.add(k); simTap(); draw(); }, 'primary'), simBtn('↺', () => { found.clear(); msg = ''; draw(); })));
};

/* ---- handshakes / pairs ---- */
SIM_KINDS.handshake = ({ n }) => {
  const total = n * (n - 1) / 2, lines = new Set(), faces = ['🧑', '👧', '👦', '🧒', '👩', '👨', '🧓', '👵']; let first = null, msg = '';
  const W = 280, cx = W / 2, R = 100, pos = i => [cx + R * Math.sin(2 * Math.PI * i / n), cx - R * Math.cos(2 * Math.PI * i / n)];
  const svgNS = 'http://www.w3.org/2000/svg', info = h('p', { class: 'siminfo', role: 'status' }), box = h('div', { class: 'hsbox' });
  function draw() {
    const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${W}`); svg.setAttribute('class', 'hs');
    lines.forEach(k => { const [i, j] = k.split('-').map(Number), [x1, y1] = pos(i), [x2, y2] = pos(j), l = document.createElementNS(svgNS, 'line'); [['x1', x1], ['y1', y1], ['x2', x2], ['y2', y2], ['stroke', '#6a4cf0'], ['stroke-width', 3], ['stroke-linecap', 'round']].forEach(([a, v]) => l.setAttribute(a, v)); svg.append(l); });
    range(n).forEach(i => { const [x, y] = pos(i), g = document.createElementNS(svgNS, 'g'); g.setAttribute('style', 'cursor:pointer'); g.addEventListener('click', () => tapP(i)); const c = document.createElementNS(svgNS, 'circle'); [['cx', x], ['cy', y], ['r', 22], ['fill', first === i ? '#e4dcff' : '#fff'], ['stroke', first === i ? '#6a4cf0' : '#cfd5e6'], ['stroke-width', 3]].forEach(([a, v]) => c.setAttribute(a, v)); const tx2 = document.createElementNS(svgNS, 'text'); [['x', x], ['y', y + 9], ['text-anchor', 'middle'], ['font-size', 26]].forEach(([a, v]) => tx2.setAttribute(a, v)); tx2.textContent = faces[i % faces.length]; g.append(c, tx2); svg.append(g); });
    box.replaceChildren(svg); info.textContent = `${L2('Spojenia', 'Pairs')}: ${lines.size}${lines.size === total ? ' 🎉' : ''}${msg ? ' · ' + msg : ''}`;
  }
  function tapP(i) { if (first == null) { first = i; msg = ''; } else if (first === i) first = null; else { const k = Math.min(first, i) + '-' + Math.max(first, i); if (lines.has(k)) { lines.delete(k); msg = L2('Spojenie zrušené.', 'Pair removed.'); } else { lines.add(k); msg = ''; simTap(); } first = null; } draw(); }
  draw();
  return simWrap(L2('Ťukni na dvoch ľudí – spoja sa čiarou. Spoj každú dvojicu práve raz!', 'Tap two people – they get joined by a line. Join every pair exactly once!'), box, info, h('div', { class: 'simctl' }, simBtn('↺', () => { lines.clear(); first = null; msg = ''; draw(); })));
};

/* ---- robot on a grid ---- */
SIM_KINDS.robot = ({ R, C, blocked, total }) => {
  const bl = new Set(blocked), found = new Set(); let r = 0, c = 0, path = '', msg = '';
  const grid = h('div', { class: 'rgrid', style: `--c:${C}` }), info = h('p', { class: 'siminfo', role: 'status' }), list = h('p', { class: 'foundlist' });
  function draw() {
    grid.replaceChildren(...range(R * C).map(i => { const rr = Math.floor(i / C), cc = i % C; return h('div', { class: 'rcell' + (bl.has(i) ? ' blk' : '') }, bl.has(i) ? '✖️' : rr === r && cc === c ? '🤖' : rr === R - 1 && cc === C - 1 ? '🏁' : rr === 0 && cc === 0 ? '🚩' : ''); }));
    info.textContent = `${L2('Nájdené cesty', 'Paths found')}: ${found.size}${total ? ' / ' + total : ''}${msg ? ' · ' + msg : ''}`; list.textContent = [...found].slice(-8).join('   ');
  }
  function step(dr, dc, ch) { const nr = r + dr, nc = c + dc; if (nr >= R || nc >= C || bl.has(nr * C + nc)) { msg = L2('Tam sa nedá.', 'You cannot go there.'); return draw(); } r = nr; c = nc; path += ch; msg = ''; simTap(); if (r === R - 1 && c === C - 1) { msg = found.has(path) ? L2('Túto cestu už máš.', 'You already have this path.') : L2('Nová cesta! ✓', 'New path! ✓'); found.add(path); r = 0; c = 0; path = ''; } draw(); }
  draw();
  return simWrap(L2('Posúvaj 🤖 šípkami doprava alebo nadol až do 🏁. Nájdi všetky rôzne cesty!', 'Move 🤖 right or down to the 🏁. Find all different paths!'), grid, info, list, h('div', { class: 'simctl' }, simBtn('➡️', () => step(0, 1, '→'), 'primary'), simBtn('⬇️', () => step(1, 0, '↓'), 'primary'), simBtn('↺', () => { r = 0; c = 0; path = ''; msg = ''; draw(); }), simBtn('🗑', () => { found.clear(); r = 0; c = 0; path = ''; msg = ''; draw(); })));
};

/* ---- fair sharing ---- */
SIM_KINDS.share = ({ kids, total, e, who }) => {
  let pile = total; const got = Array(kids).fill(0); const pileEl = h('div', { class: 'cmpbox' }), row = h('div', { class: 'players' }), info = h('p', { class: 'siminfo', role: 'status' });
  function draw() {
    pileEl.textContent = e.repeat(pile) || '—'; row.replaceChildren(...who.map((w, i) => h('button', { type: 'button', class: 'kidbox', disabled: pile === 0, onclick: () => { pile--; got[i]++; simTap(); draw(); }, 'aria-label': L2('Dať jedno', 'Give one') }, h('span', { class: 'kface' }, w), h('span', { class: 'kitems' }, e.repeat(got[i])), h('b', null, got[i]))));
    info.textContent = pile ? `${L2('Zostáva', 'Left')}: ${pile}` : (got.every(x => x === got[0]) ? L2(`🎉 Každé dieťa má ${got[0]}.`, `🎉 Every child has ${got[0]}.`) : L2('Nie je rovnako – skús znova.', 'Not equal – try again.'));
  }
  draw();
  return simWrap(L2('Ťukni na dieťa – dostane jedno. Rozdeľ všetko rovnako!', 'Tap a child – they get one. Share everything equally!'), pileEl, row, info, h('div', { class: 'simctl' }, simBtn('↺', () => { pile = total; got.fill(0); draw(); })));
};

/* ---- count by tapping ---- */
SIM_KINDS.tapcount = ({ rows }) => {
  const marked = rows.map(r => new Set()), wrap = h('div');
  function draw() { wrap.replaceChildren(...rows.map((items, ri) => h('div', { class: 'tcrow' }, h('div', { class: 'tcitems' }, items.map((e, i) => h('button', { type: 'button', class: 'tc' + (marked[ri].has(i) ? ' on' : ''), 'aria-pressed': marked[ri].has(i), onclick: () => { marked[ri].has(i) ? marked[ri].delete(i) : marked[ri].add(i); simTap(); draw(); } }, e))), h('b', { class: 'bigno' }, marked[ri].size)))); }
  draw();
  return simWrap(L2('Ťukaj na obrázky a počítaj. Číslo sa zväčší s každým ťuknutím.', 'Tap the pictures to count. The number grows with every tap.'), wrap, h('div', { class: 'simctl' }, simBtn('↺', () => { marked.forEach(s => s.clear()); draw(); })));
};

/* ---- ten frame: more free cells than needed, count to exactly T ---- */
SIM_KINDS.tenframe = ({ T, a }) => {
  const total = Math.ceil((T + 10) / 5) * 5, add = new Set(), grid = h('div', { class: 'tenf' }), info = h('p', { class: 'siminfo', role: 'status' });
  function draw() {
    grid.replaceChildren(...range(total).map(i => i < a ? h('span', { class: 'tcell full' }, '🟡') : h('button', { type: 'button', class: 'tcell' + (add.has(i) ? ' add' : ''), 'aria-pressed': add.has(i), onclick: () => { add.has(i) ? add.delete(i) : add.add(i); simTap(); draw(); } }, add.has(i) ? '🔴' : '')));
    const sum = a + add.size; info.textContent = `${a} + ${add.size} = ${sum}` + (sum === T ? ` 🎉 ${L2('Presne ' + T + '!', 'Exactly ' + T + '!')}` : sum > T ? ' · ' + L2('To je viac než ' + T + '.', 'That is more than ' + T + '.') : ' · ' + L2('Cieľ: ' + T, 'Goal: ' + T));
  }
  draw();
  return simWrap(L2(`Žlté sú dané. Pridaj červené tak, aby ich bolo spolu presne ${T}. Voľných políčok je viac!`, `Yellow ones are given. Add red ones so there are exactly ${T} in all. There are more free cells than you need!`), grid, info, h('div', { class: 'simctl' }, simBtn('↺', () => { add.clear(); draw(); })));
};

/* ---- place dominoes ---- */
SIM_KINDS.dominoes = ({ a, b, removed }) => {
  const rem = new Set(removed), owner = new Map(); let sel = null, nextId = 1; const pal = ['#ffd58a', '#a8e0f0', '#c9f0b0', '#f3b5d4', '#d4c7ff', '#ffc8a8'];
  const grid = h('div', { class: 'dgrid', style: `--c:${b};--cell:${Math.min(44, Math.floor(300 / b))}px` }), info = h('p', { class: 'siminfo', role: 'status' });
  const free = () => range(a * b).filter(i => !rem.has(i) && !owner.has(i)).length;
  function draw() {
    grid.replaceChildren(...range(a * b).map(i => { const r = Math.floor(i / b), c = i % b, o = owner.get(i); return h('button', { type: 'button', class: 'dcell ' + ((r + c) % 2 ? 'dc' : 'lc') + (sel === i ? ' sel' : ''), disabled: rem.has(i), style: o ? `background:${pal[o % pal.length]}` : '', onclick: () => tapC(i), 'aria-label': `${r + 1},${c + 1}` }, rem.has(i) ? '✖' : ''); }));
    const f = free(); info.textContent = `${L2('Položené domina', 'Dominoes placed')}: ${new Set(owner.values()).size} · ${L2('voľné políčka', 'free cells')}: ${f}${f === 0 ? ' 🎉' : ''}`;
  }
  function tapC(i) {
    if (owner.has(i)) { const id = owner.get(i); [...owner].filter(([, v]) => v === id).forEach(([k]) => owner.delete(k)); sel = null; return draw(); }
    if (sel == null) { sel = i; return draw(); }
    const dr = Math.abs(Math.floor(sel / b) - Math.floor(i / b)), dc = Math.abs(sel % b - i % b);
    if (sel !== i && dr + dc === 1) { owner.set(sel, nextId); owner.set(i, nextId); nextId++; simTap(); }
    sel = null; draw();
  }
  draw();
  return simWrap(L2('Ťukni na dve susedné políčka – položíš domino. Ťuknutím na domino ho zdvihneš.', 'Tap two neighbouring cells to place a domino. Tap a domino to lift it.'), grid, info, h('div', { class: 'simctl' }, simBtn('↺', () => { owner.clear(); sel = null; draw(); })));
};

/* ---- enumerate squares / rectangles ---- */
SIM_KINDS.squares = ({ n, m, mode }) => {
  const items = []; if (mode === 'rects') { for (let r1 = 0; r1 < n; r1++) for (let r2 = r1; r2 < n; r2++) for (let c1 = 0; c1 < m; c1++) for (let c2 = c1; c2 < m; c2++) items.push([r1, c1, r2 - r1 + 1, c2 - c1 + 1]); } else for (let s = 1; s <= Math.min(n, m); s++) for (let r = 0; r + s <= n; r++) for (let c = 0; c + s <= m; c++) items.push([r, c, s, s]);
  let idx = -1, timer = null; const cell = 36, svgNS = 'http://www.w3.org/2000/svg', box = h('div', { class: 'hsbox' }), info = h('p', { class: 'siminfo', role: 'status' }); cleanups.push(() => clearInterval(timer));
  function draw() {
    const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('viewBox', `0 0 ${m * cell + 8} ${n * cell + 8}`); svg.setAttribute('class', 'gridsvg');
    if (idx >= 0) { const [r, c, hh, ww] = items[idx], rc = document.createElementNS(svgNS, 'rect'); [['x', 4 + c * cell + 3], ['y', 4 + r * cell + 3], ['width', ww * cell - 6], ['height', hh * cell - 6], ['fill', 'rgba(106,76,240,.25)'], ['stroke', '#6a4cf0'], ['stroke-width', 4], ['rx', 4]].forEach(([k, v]) => rc.setAttribute(k, v)); svg.append(rc); }
    for (let i = 0; i <= n; i++) { const l = document.createElementNS(svgNS, 'line'); [['x1', 4], ['y1', 4 + i * cell], ['x2', 4 + m * cell], ['y2', 4 + i * cell], ['stroke', '#14213d'], ['stroke-width', 2.5]].forEach(([k, v]) => l.setAttribute(k, v)); svg.append(l); }
    for (let i = 0; i <= m; i++) { const l = document.createElementNS(svgNS, 'line'); [['x1', 4 + i * cell], ['y1', 4], ['x2', 4 + i * cell], ['y2', 4 + n * cell], ['stroke', '#14213d'], ['stroke-width', 2.5]].forEach(([k, v]) => l.setAttribute(k, v)); svg.append(l); }
    box.replaceChildren(svg); info.textContent = `${L2('Ukázané', 'Shown')}: ${idx + 1}` + (idx >= 0 && mode !== 'rects' ? ` · ${L2('veľkosť', 'size')} ${items[idx][2]}×${items[idx][2]}` : '');
  }
  const next = () => { if (idx < items.length - 1) { idx++; draw(); } else clearInterval(timer); };
  draw();
  return simWrap(L2('Stláčaj „Ďalší“ – ukážem ti postupne každý štvorec' + (mode === 'rects' ? ' (obdĺžnik)' : '') + ' a ty ich počítaj.', 'Press “Next” – I show every ' + (mode === 'rects' ? 'rectangle' : 'square') + ' one by one and you count them.'), box, info, h('div', { class: 'simctl' }, simBtn('▶ ' + L2('Ďalší', 'Next'), next, 'primary'), simBtn('⏩ ' + L2('Prehrať všetky', 'Play all'), () => { clearInterval(timer); idx = -1; timer = setInterval(next, 220); }), simBtn('↺', () => { clearInterval(timer); idx = -1; draw(); })));
};

/* ---- probability experiments ---- */
SIM_KINDS.prob = (cfg) => {
  const out = h('div', { class: 'probout' }), info = h('p', { class: 'siminfo', role: 'status' }); let counts = {}, total = 0, both = 0;
  const bag = cfg.mode === 'bag' || cfg.mode === 'bag2' ? [...'🔴'.repeat(cfg.rd), ...'🔵'.repeat(cfg.bl), ...(cfg.gr ? ['🟢'.repeat(cfg.gr)].flatMap(x => [...x]) : [])] : null;
  const reds = cfg.rd; let balls = null; if (cfg.mode === 'bag' || cfg.mode === 'bag2') { balls = [...Array(cfg.rd).fill('🔴'), ...Array(cfg.bl).fill('🔵'), ...Array(cfg.gr || 0).fill('🟢')]; }
  const trial = () => { if (cfg.mode === 'dice') { const s = 1 + rndI(6) + 1 + rndI(6); counts[s] = (counts[s] || 0) + 1; } else if (cfg.mode === 'coins') { let hd = 0; for (let i = 0; i < cfg.n; i++) if (Math.random() < .5) hd++; counts[hd] = (counts[hd] || 0) + 1; } else if (cfg.mode === 'bag') { const x = balls[rndI(balls.length)]; counts[x] = (counts[x] || 0) + 1; } else { const i = rndI(balls.length); let j; do j = rndI(balls.length); while (j === i); const key = balls[i] + balls[j]; counts[key] = (counts[key] || 0) + 1; if (balls[i] === '🔴' && balls[j] === '🔴') both++; } total++; };
  const keys = cfg.mode === 'dice' ? range(11).map(i => i + 2) : cfg.mode === 'coins' ? range(cfg.n + 1) : cfg.mode === 'bag' ? ['🔴', '🔵', ...(cfg.gr ? ['🟢'] : [])] : null;
  function draw() {
    const ks = keys || Object.keys(counts).sort(), mx = Math.max(1, ...ks.map(k => counts[k] || 0));
    out.replaceChildren(h('div', { class: 'bars3' }, ks.map(k => h('div', { class: 'bar3' }, h('div', { class: 'col3', style: `height:${(counts[k] || 0) / mx * 90}px` }), h('small', null, counts[k] || 0), h('b', null, String(k))))));
    info.textContent = `${L2('Pokusov', 'Trials')}: ${total}` + (cfg.mode === 'bag2' && total ? ` · ${L2('obe 🔴', 'both 🔴')}: ${both} (${(both / total * 100).toFixed(0)} %)` : '') + (cfg.mode === 'dice' && cfg.target && total ? ` · ${L2('súčet', 'sum')} ${cfg.target}: ${((counts[cfg.target] || 0) / total * 100).toFixed(0)} %` : '');
  }
  const run = k => { for (let i = 0; i < k; i++) trial(); simTap(); draw(); };
  draw();
  const hintTxt = { dice: L2('Hádž dvoma kockami veľa-krát a pozoruj, ktoré súčty padajú najčastejšie.', 'Roll two dice many times and watch which sums come up most.'), coins: L2(`Hoď ${cfg.n} mincí a pozoruj počet hláv. Opakuj!`, `Toss ${cfg.n} coins and watch the number of heads. Repeat!`), bag: L2('Ťahaj naslepo (a vráť späť). Pozoruj, ako často vyjde ktorá farba.', 'Draw blindly (and put back). Watch how often each colour appears.'), bag2: L2('Ťahaj dve guľôčky bez vrátenia. Ako často sú obe 🔴?', 'Draw two marbles without putting back. How often are both 🔴?') }[cfg.mode];
  return simWrap(hintTxt, balls ? h('p', { class: 'marbles' }, balls.join('')) : null, out, info, h('div', { class: 'simctl' }, simBtn('×1', () => run(1), 'primary'), simBtn('×10', () => run(10), 'primary'), simBtn('×100', () => run(100), 'primary'), simBtn('↺', () => { counts = {}; total = 0; both = 0; draw(); })));
};

/* ---- hundred chart: cross out numbers ---- */
SIM_KINDS.chart = ({ hi }) => {
  const crossed = new Set(), grid = h('div', { class: 'chart' }), info = h('p', { class: 'siminfo', role: 'status' });
  function draw() { grid.replaceChildren(...range(hi).map(i => h('button', { type: 'button', class: 'chc' + (crossed.has(i + 1) ? ' x' : ''), 'aria-pressed': crossed.has(i + 1), onclick: () => { crossed.has(i + 1) ? crossed.delete(i + 1) : crossed.add(i + 1); draw(); } }, i + 1))); info.textContent = `${L2('Ostáva čísel', 'Numbers left')}: ${hi - crossed.size}`; }
  draw();
  return simWrap(L2('Ťukni na číslo, ktoré nesedí k nápovedám – prečiarkne sa. Ostane jediné!', 'Tap a number that does not fit the clues – it gets crossed out. One will be left!'), grid, info, h('div', { class: 'simctl' }, simBtn('↺', () => { crossed.clear(); draw(); })));
};

/* ---- helper table for logic puzzles ---- */
SIM_KINDS.logicgrid = ({ rows, cols }) => {
  const st2 = {}; const tbl = h('div', { class: 'lgrid', style: `--c:${cols.length + 1}` });
  const sym = ['', '✗', '✓'];
  function draw() { tbl.replaceChildren(h('span'), ...cols.map(c => h('b', { class: 'lgh' }, c)), ...rows.flatMap((r, ri) => [h('b', { class: 'lgh' }, r), ...cols.map((c, ci) => h('button', { type: 'button', class: 'lgc s' + (st2[ri + '-' + ci] || 0), 'aria-label': `${r} – ${c}`, onclick: () => { st2[ri + '-' + ci] = ((st2[ri + '-' + ci] || 0) + 1) % 3; draw(); } }, sym[st2[ri + '-' + ci] || 0]))])); }
  draw();
  return simWrap(L2('Pomocná tabuľka: ťukaním striedaj prázdne ➜ ✗ (nie je) ➜ ✓ (je).', 'Helper table: tap to cycle empty ➜ ✗ (not) ➜ ✓ (is).'), tbl, h('div', { class: 'simctl' }, simBtn('↺', () => { Object.keys(st2).forEach(k => delete st2[k]); draw(); })));
};

/* ---- week wheel ---- */
SIM_KINDS.week = ({ d0, n }) => {
  let pos = d0, steps = 0, timer = null; cleanups.push(() => clearInterval(timer)); const wheel = h('div', { class: 'week' }), info = h('p', { class: 'siminfo', role: 'status' });
  function draw() { wheel.replaceChildren(...DAYS.map((d, i) => h('div', { class: 'wd' + (i === pos ? ' now' : '') + (i === d0 ? ' start' : '') }, tx(d).slice(0, 2), i === pos ? h('span', { class: 'tok' }, '📍') : null))); info.textContent = `${L2('Prešlo dní', 'Days passed')}: ${steps} / ${n}`; }
  const hop = k => { for (let i = 0; i < k && steps < n; i++) { pos = (pos + 1) % 7; steps++; } simTap(); draw(); };
  draw();
  return simWrap(L2(`Začíname v ${tx(DAYS[d0])}. Posúvaj sa po dňoch – kam dôjdeš po ${n} dňoch?`, `We start on ${tx(DAYS[d0])}. Hop day by day – where do you land after ${n} days?`), wheel, info, h('div', { class: 'simctl' }, simBtn('+1', () => hop(1), 'primary'), simBtn('+7', () => hop(7), 'primary'), simBtn('▶', () => { clearInterval(timer); timer = setInterval(() => { if (steps >= n) clearInterval(timer); else hop(1); }, 380); }), simBtn('↺', () => { clearInterval(timer); pos = d0; steps = 0; draw(); })));
};

/* ---- hundred square: percent ---- */
SIM_KINDS.hundred = ({ p }) => {
  const on = new Set(), grid = h('div', { class: 'hundred' }), info = h('p', { class: 'siminfo', role: 'status' });
  function draw() { grid.replaceChildren(...range(100).map(i => h('button', { type: 'button', class: 'hc' + (on.has(i) ? ' on' : ''), 'aria-pressed': on.has(i), onclick: () => { on.has(i) ? on.delete(i) : on.add(i); draw(); } }))); info.textContent = `${on.size} ${L2('zo 100', 'of 100')} = ${on.size} %`; }
  draw();
  return simWrap(L2(`Vyfarbi ${p} štvorčekov zo 100 – to je ${p} %.`, `Colour ${p} squares out of 100 – that is ${p}%.`), grid, info, h('div', { class: 'simctl' }, simBtn('↺', () => { on.clear(); draw(); })));
};
