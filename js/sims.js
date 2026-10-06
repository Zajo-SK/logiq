'use strict';
/* LogiQ – "try it with your hands" simulations shown above the answer: sticks pile, chocolate bar, knock-out players. Also text-to-speech. */
function speak(text) {
  try {
    if (!('speechSynthesis' in window)) return false;
    const clean = String(text).replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{27BF}\u{2B00}-\u{2BFF}️]/gu, ' ').replace(/·/g, ',').replace(/×/g, LANG === 'sk' ? ' krát ' : ' times ').replace(/−/g, LANG === 'sk' ? ' mínus ' : ' minus ').replace(/\s+/g, ' ').trim();
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(clean); u.lang = LANG === 'sk' ? 'sk-SK' : 'en-GB'; u.rate = .88;
    const v = speechSynthesis.getVoices().find(x => x.lang.toLowerCase().startsWith(LANG === 'sk' ? 'sk' : 'en')); if (v) u.voice = v; speechSynthesis.speak(u); return true;
  } catch (e) { return false; }
}
const stopSpeaking = () => { try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } };

function simPanel(title, body) { return h('details', { class: 'sim', open: true }, h('summary', null, '🎮 ' + title), body); }
const simAnim = () => st().settings.anim && !matchMedia('(prefers-reduced-motion: reduce)').matches;

function simSticks({ N, moves, misere }) {
  let n = N, turn = 0, over = false, demo = null, gone = 0; const who = ['🐻', '🐰'];
  const pile = h('div', { class: 'pile', role: 'img' }), info = h('p', { class: 'siminfo', role: 'status', 'aria-live': 'polite' }), ctl = h('div', { class: 'simctl' });
  const stop = () => { clearInterval(demo); demo = null; };
  cleanups.push(stop);
  function draw() {
    pile.replaceChildren(...range(Math.ceil(N / 5)).map(gi => h('div', { class: 'stkgrp' }, range(5).map(j => { const idx = gi * 5 + j; if (idx >= N) return null; const there = idx < n, leaving = !there && idx < n + gone; return h('i', { class: 'stk' + (there ? '' : leaving ? ' gone' : ' empty') }); }))));
    info.replaceChildren(h('b', { class: 'bigno' }, n), ' ', over ? '' : `${who[turn]} ${L2('je na ťahu', 'is next')}`);
    ctl.replaceChildren();
    if (!over) moves.filter(m => m <= n).forEach(m => ctl.append(h('button', { type: 'button', class: 'btn primary', disabled: !!demo, onclick: () => take(m), 'aria-label': L2(`Vziať ${m}`, `Take ${m}`) }, h('span', { class: 'mini-stk' }, '｜'.repeat(m)), ' ' + m)));
    else ctl.append(h('p', { class: 'simwin' }, `${who[misere ? 1 - turn : turn]} ${L2('vyhráva!', 'wins!')} (${who[turn]} ${L2('vzal poslednú', 'took the last one')})`));
    ctl.append(h('button', { type: 'button', class: 'btn ghost small', onclick: reset }, '↺ ' + L2('Znova', 'Again')), h('button', { type: 'button', class: 'btn ghost small', disabled: !!demo || over, onclick: play }, '▶ ' + L2('Ukážka', 'Demo')));
  }
  function take(m) { if (over) return; gone = m; n -= m; if (n <= 0) { over = true; } else turn = 1 - turn; if (over) { /* turn stays at the last taker */ } draw(); if (simAnim()) setTimeout(() => { gone = 0; draw(); }, 420); else { gone = 0; draw(); } tone && tone(SND.tap); }
  function reset() { stop(); n = N; turn = 0; over = false; gone = 0; draw(); }
  function play() { reset(); demo = setInterval(() => { if (over) { stop(); draw(); return; } const ms = moves.filter(m => m <= n); take(ms[Math.floor(Math.random() * ms.length)]); }, 950); draw(); }
  draw();
  return simPanel(L2('Vyskúšaj si to', 'Try it yourself'), h('div', null, h('p', { class: 'muted' }, L2('Hrajú 🐻 a 🐰 – ťukni, koľko paličiek chceš vziať.', '🐻 and 🐰 play – tap how many sticks to take.')), pile, info, ctl));
}

function simChoc({ a, b }) {
  let pieces; let breaks = 0; const area = h('div', { class: 'chocarea' }), info = h('p', { class: 'siminfo', role: 'status' }), cell = Math.min(44, Math.floor(280 / Math.max(a, b)));
  const init = () => { pieces = [{ r: 0, c: 0, h: a, w: b }]; breaks = 0; };
  function draw() {
    area.style.cssText = `position:relative;width:${b * cell + 40}px;height:${a * cell + 40}px;margin:0 auto`;
    area.replaceChildren(...pieces.map((p, i) => h('button', { type: 'button', class: 'chocp' + (p.h * p.w > 1 ? '' : ' one'), style: `left:${20 + p.c * cell + (p.c > 0 ? 0 : 0)}px;top:${20 + p.r * cell}px;width:${p.w * cell - 3}px;height:${p.h * cell - 3}px;--gx:${(p.c - (b - 1) / 2) * 1.5}px;--gy:${(p.r - (a - 1) / 2) * 1.5}px;background-size:${cell}px ${cell}px`, disabled: p.h * p.w === 1, 'aria-label': L2('Zlomiť kus', 'Break this piece'), onclick: () => brk(i) })));
    info.textContent = `${L2('Zlomení', 'Breaks')}: ${breaks} · ${L2('kusov', 'pieces')}: ${pieces.length}` + (pieces.length === a * b ? ' ✓' : '');
  }
  function brk(i) { const p = pieces[i]; let p1, p2; if (p.w >= p.h) { const k = Math.floor(p.w / 2); p1 = { ...p, w: k }; p2 = { ...p, c: p.c + k, w: p.w - k }; } else { const k = Math.floor(p.h / 2); p1 = { ...p, h: k }; p2 = { ...p, r: p.r + k, h: p.h - k }; } pieces.splice(i, 1, p1, p2); breaks++; draw(); tone && tone(SND.tap); }
  init(); draw();
  return simPanel(L2('Vyskúšaj si to', 'Try it yourself'), h('div', null, h('p', { class: 'muted' }, L2('Ťukni na kus čokolády a zlomí sa na dva. Zlom ich všetky na štvorčeky!', 'Tap a piece to break it in two. Break everything into single squares!')), area, info, h('div', { class: 'simctl' }, h('button', { type: 'button', class: 'btn ghost small', onclick: () => { init(); draw(); } }, '↺ ' + L2('Znova', 'Again')))));
}

function simPlayers({ n }) {
  let alive, matches; const row = h('div', { class: 'players' }), info = h('p', { class: 'siminfo', role: 'status' });
  const faces = ['🧑', '👧', '👦', '🧒', '👩', '👨', '🧓', '👵'];
  const init = () => { alive = range(n).map(() => true); matches = 0; };
  function draw() { row.replaceChildren(...alive.map((a, i) => h('button', { type: 'button', class: 'plyr' + (a ? '' : ' out'), disabled: !a || alive.filter(Boolean).length < 2, 'aria-label': L2('Vyradiť hráča', 'Eliminate player'), onclick: () => { alive[i] = false; matches++; draw(); tone && tone(SND.tap); } }, a ? faces[i % faces.length] : '❌')));
    const left = alive.filter(Boolean).length; info.textContent = `${L2('Odohrané zápasy', 'Matches played')}: ${matches}` + (left === 1 ? ' · 🏆' : ''); }
  init(); draw();
  return simPanel(L2('Vyskúšaj si to', 'Try it yourself'), h('div', null, h('p', { class: 'muted' }, L2('Každý zápas = jeden hráč vypadne. Ťukni na hráča, ktorý prehral.', 'Each match = one player drops out. Tap the player who lost.')), row, info, h('div', { class: 'simctl' }, h('button', { type: 'button', class: 'btn ghost small', onclick: () => { init(); draw(); } }, '↺ ' + L2('Znova', 'Again')))));
}
function simMount(sim) { return sim.kind === 'sticks' ? simSticks(sim) : sim.kind === 'choc' ? simChoc(sim) : sim.kind === 'players' ? simPlayers(sim) : null; }
