'use strict';
/* LogiQ – reward system.
   • 💎 points → permanent RANK (never lost)          • ★ stars, streak, solved tasks → unlock avatars & colour themes
   • daily bonus (first task of the day, grows with the streak) and a level bonus (+50 once per level) */
const RANKS = [
  { p: 0, i: '🌱', n: S('Učeň', 'Apprentice') }, { p: 100, i: '🧭', n: S('Objaviteľ', 'Explorer') }, { p: 300, i: '🧩', n: S('Riešiteľ', 'Solver') }, { p: 700, i: '♟️', n: S('Stratég', 'Strategist') },
  { p: 1500, i: '🧠', n: S('Logik', 'Logician') }, { p: 3000, i: '🎓', n: S('Majster', 'Master') }, { p: 6000, i: '🏆', n: S('Veľmajster', 'Grandmaster') }, { p: 12000, i: '👑', n: S('Legenda', 'Legend') }, { p: 20000, i: '🔮', n: S('Mudrc', 'Sage') }, { p: 35000, i: '🪐', n: S('Kozmický mudrc', 'Cosmic sage') }
];
function rankOf(pts) { let i = 0; RANKS.forEach((r, j) => { if (pts >= r.p) i = j; }); return { i, r: RANKS[i], next: RANKS[i + 1] || null }; }
const REWARDS = [
  { id: 'av-fox', type: 'avatar', v: '🦊', n: S('Líška', 'Fox'), k: 'points', need: 0 }, { id: 'av-cat', type: 'avatar', v: '🐱', n: S('Mačka', 'Cat'), k: 'tasks', need: 15 },
  { id: 'av-octo', type: 'avatar', v: '🐙', n: S('Chobotnica', 'Octopus'), k: 'points', need: 100 }, { id: 'av-owl', type: 'avatar', v: '🦉', n: S('Sova', 'Owl'), k: 'points', need: 300 },
  { id: 'av-rocket', type: 'avatar', v: '🚀', n: S('Raketa', 'Rocket'), k: 'points', need: 600 }, { id: 'av-panda', type: 'avatar', v: '🐼', n: S('Panda', 'Panda'), k: 'tasks', need: 80 },
  { id: 'av-dragon', type: 'avatar', v: '🐉', n: S('Drak', 'Dragon'), k: 'points', need: 1500 }, { id: 'av-unicorn', type: 'avatar', v: '🦄', n: S('Jednorožec', 'Unicorn'), k: 'points', need: 3000 },
  { id: 'av-robot', type: 'avatar', v: '🤖', n: S('Robot', 'Robot'), k: 'stars', need: 300 }, { id: 'av-crown', type: 'avatar', v: '👑', n: S('Koruna', 'Crown'), k: 'points', need: 6000 },
  { id: 'th-base', type: 'theme', v: 'base', n: S('Základná', 'Classic'), k: 'points', need: 0 }, { id: 'th-ocean', type: 'theme', v: 'ocean', n: S('Oceán', 'Ocean'), k: 'stars', need: 25 },
  { id: 'th-forest', type: 'theme', v: 'forest', n: S('Les', 'Forest'), k: 'streak', need: 3 }, { id: 'th-sunset', type: 'theme', v: 'sunset', n: S('Západ slnka', 'Sunset'), k: 'stars', need: 75 },
  { id: 'av-frog', type: 'avatar', v: '🐸', n: S('Žabka', 'Frog'), k: 'tasks', need: 30 }, { id: 'av-lion', type: 'avatar', v: '🦁', n: S('Lev', 'Lion'), k: 'points', need: 200 },
  { id: 'av-peng', type: 'avatar', v: '🐧', n: S('Tučniak', 'Penguin'), k: 'stars', need: 60 }, { id: 'av-trex', type: 'avatar', v: '🦖', n: S('Dinosaurus', 'Dinosaur'), k: 'points', need: 1000 },
  { id: 'av-wiz', type: 'avatar', v: '🧙', n: S('Čarodej', 'Wizard'), k: 'stickers', need: 15 }, { id: 'av-astro', type: 'avatar', v: '🧑‍🚀', n: S('Astronaut', 'Astronaut'), k: 'medals', need: 1 },
  { id: 'av-ninja', type: 'avatar', v: '🥷', n: S('Ninja', 'Ninja'), k: 'quests', need: 5 }, { id: 'av-hero', type: 'avatar', v: '🦸', n: S('Hrdina', 'Hero'), k: 'stickers', need: 35 },
  { id: 'av-phoenix', type: 'avatar', v: '🦅', n: S('Orol', 'Eagle'), k: 'streak', need: 7 }, { id: 'av-alien', type: 'avatar', v: '👽', n: S('Mimozemšťan', 'Alien'), k: 'medals', need: 4 },
  { id: 'th-candy', type: 'theme', v: 'candy', n: S('Cukrík', 'Candy'), k: 'stickers', need: 10 }, { id: 'th-night', type: 'theme', v: 'night', n: S('Nočná obloha', 'Night sky'), k: 'streak', need: 7 },
  { id: 'th-mint', type: 'theme', v: 'mint', n: S('Mäta', 'Mint'), k: 'medals', need: 2 },
  { id: 'th-galaxy', type: 'theme', v: 'galaxy', n: S('Galaxia', 'Galaxy'), k: 'stars', need: 200 }, { id: 'th-gold', type: 'theme', v: 'gold', n: S('Zlatá', 'Gold'), k: 'points', need: 5000 }
];
const THEME_ICON = { base: '🎨', ocean: '🌊', forest: '🌲', sunset: '🌅', galaxy: '🌌', gold: '🥇', candy: '🍭', night: '🌃', mint: '🍃' };
const rewardIcon = r => r.type === 'avatar' ? r.v : THEME_ICON[r.v];
function rewardCur(r) { const tot = Store.totals(), s = st(); return r.k === 'points' ? tot.points : r.k === 'stars' ? tot.stars : r.k === 'tasks' ? tot.done : r.k === 'stickers' ? Object.keys(s.stickers || {}).length : r.k === 'medals' ? Object.keys(s.medals || {}).length : r.k === 'quests' ? Object.values(s.quests || {}).filter(q => q.all).length : Math.max(s.streak.count, s.maxStreak || 0); }
function evalRewards() {
  const out = []; REWARDS.forEach(r => { if (!st().rewards[r.id] && rewardCur(r) >= r.need) { st().rewards[r.id] = Date.now(); out.push(r); } });
  if (st().streak.count > (st().maxStreak || 0)) st().maxStreak = st().streak.count; if (out.length) Store.save(); return out;
}
function extraEls(x) {
  const out = [];
  if (x.bonus) out.push(h('p', { class: 'bonusline' }, (x.bonusLabel ? t(x.bonusLabel) : '🔥 ' + t('dailyBonus')) + ' +' + x.bonus + ' 💎'));
  if (x.stickers && x.stickers.length) out.push(h('div', { class: 'newbadges' }, h('h3', null, '🎴 ' + L2('Nové nálepky!', 'New stickers!')), h('div', { class: 'stkrow' }, x.stickers.map(k => h('span', { class: 'stk got', title: tx(LEVEL_NAMES[k.i]) }, STICKERS[k.wk][k.i])))));
  (x.medals || []).forEach(m => out.push(h('div', { class: 'chest' }, h('span', { class: 'ci', 'aria-hidden': 'true' }, '🥇'), h('span', null, L2('Medaila: ', 'Medal: ') + tx(m.w.name) + ' · ' + gradeLabel(m.g) + ' +100 💎'))));
  (x.mile || []).forEach(m => out.push(h('p', { class: 'bonusline' }, m.icon + ' ' + tx(m.n) + ' +' + m.bonus + ' 💎')));
  (x.quests || []).forEach(q => out.push(h('p', { class: 'bonusline' }, '🎯 ' + L2('Misia splnená: ', 'Mission complete: ') + tx(q.text) + ' +' + q.gem + ' 💎')));
  if (x.questsAll) out.push(h('div', { class: 'chest' }, h('span', { class: 'ci', 'aria-hidden': 'true' }, '🎁'), h('span', null, L2('Všetky dnešné misie splnené! Truhlica: +40 💎', 'All missions done today! Chest: +40 💎'))));
  if (x.rankUp) out.push(h('div', { class: 'rankup' }, '🎖️ ' + t('rankUp') + ' ' + x.rankUp.i + ' ' + tx(x.rankUp.n)));
  if (x.rewards && x.rewards.length) out.push(h('div', { class: 'newbadges' }, h('h3', null, t('newReward')), h('div', { class: 'badgerow' }, x.rewards.map(r => h('div', { class: 'badge got pop' }, h('span', { class: 'bi' }, rewardIcon(r)), h('b', null, tx(r.n)))))));
  return out;
}
function rankCard() {
  const pts = Store.totals().points, rk = rankOf(pts), nx = rk.next, pct = nx ? (pts - rk.r.p) / (nx.p - rk.r.p) : 1;
  return h('section', { class: 'card rankcard' }, h('div', { class: 'rk-av', 'aria-hidden': 'true' }, st().settings.avatar), h('div', { class: 'rk-body' },
    h('p', { class: 'eyebrow' }, t('rank')), h('h2', null, rk.r.i + ' ' + tx(rk.r.n)),
    h('div', { class: 'track', role: 'img', 'aria-label': Math.round(pct * 100) + '%' }, h('div', { style: `width:${pct * 100}%` })),
    h('p', { class: 'muted' }, nx ? t('pointsToGo', { n: nx.p - pts, r: nx.i + ' ' + tx(nx.n) }) : t('maxRank'))));
}
function reqText(r) {
  if (r.k === 'stickers') return L2(`Zbieraj nálepky: ${r.need}`, `Collect stickers: ${r.need}`);
  if (r.k === 'medals') return L2(`Získaj medaily za svety: ${r.need}`, `Earn world medals: ${r.need}`);
  if (r.k === 'quests') return L2(`Splň všetky dnešné misie ${r.need}× (v rôzne dni)`, `Finish all daily missions on ${r.need} days`);
  return t('req_' + r.k, { n: r.need });
}
function rewardsGrid() {
  const s = st(), tot = Store.totals();
  const sec = (type, title) => h('div', null, h('h3', { class: 'mt' }, title), h('div', { class: 'badgegrid' }, REWARDS.filter(r => r.type === type).map(r => {
    const on = !!s.rewards[r.id], using = type === 'avatar' ? s.settings.avatar === r.v : (s.settings.theme || 'base') === r.v, cur = rewardCur(r);
    return h('div', { class: 'badge' + (on ? ' got' : '') + (using ? ' using' : '') }, h('span', { class: 'bi' }, on ? rewardIcon(r) : '🔒'), h('b', null, tx(r.n)),
      on ? h('button', { type: 'button', class: 'btn small ' + (using ? 'ghost' : 'primary'), disabled: using, onclick: () => { if (type === 'avatar') s.settings.avatar = r.v; else s.settings.theme = r.v; Store.save(); applySettings(); render(); } }, using ? '✓ ' + t('rewardInUse') : t('rewardUse'))
        : h('small', null, reqText(r) + ` (${Math.min(cur, r.need)}/${r.need})`));
  })));
  return h('section', { class: 'card' }, h('h2', null, '🎁 ' + t('rewardsTitle')), h('p', { class: 'muted' }, t('rewardsLead')), sec('avatar', t('avatarTitle')), sec('theme', t('themeTitle')));
}

/* ---------- collection: stickers (one per world-level) & world medals ---------- */
const STICKERS = {
  strat: ['🎮', '🕹️', '🎯', '🥊', '🛡️', '⚔️', '🏰'], truth: ['🕵️', '🔍', '🗝️', '🎭', '📜', '🧐', '🦉'], logic: ['🧠', '💡', '🧩', '📐', '🔗', '⚖️', '🎓'],
  combi: ['🎲', '🃏', '🎰', '🧮', '🌈', '🎪', '🎡'], num: ['🔢', '➕', '✖️', '➗', '♾️', '🧮', '📈'], space: ['🧊', '🔺', '🏗️', '📏', '🧱', '🏛️', '🗼'],
  puzzle: ['🪀', '💡', '🌀', '🔓', '🪤', '🧩', '🎁'], chess: ['♟️', '♞', '♝', '♜', '♛', '♚', '🏆'], olymp: ['📘', '✏️', '🔬', '🚀', '🥉', '🥈', '🥇']
};
function ownedLevelKeys() {
  const out = new Set();
  for (let g = 2; g <= 9; g++) worldsFor(g).forEach(w => w.levels.forEach((lv, i) => { if (levelInfo({ level: lv }, g).complete) out.add(`${g}|${w.key}|${i}`); }));
  return out;
}
function evalCollection() {
  const s = st(); s.stickers = s.stickers || {}; s.medals = s.medals || {}; const done = ownedLevelKeys(), out = { stickers: [], medals: [], bonus: 0 };
  done.forEach(k => { const [, wk, i] = k.split('|'), sk = wk + '|' + i; if (!s.stickers[sk]) { s.stickers[sk] = Date.now(); out.stickers.push({ wk, i: +i }); } });
  for (let g = 2; g <= 9; g++) worldsFor(g).forEach(w => { const mk = g + '|' + w.key; if (!s.medals[mk] && w.levels.every((_, i) => done.has(`${g}|${w.key}|${i}`))) { s.medals[mk] = Date.now(); out.medals.push({ g, w }); out.bonus += 100; } });
  if (out.bonus) Store.addBonus(out.bonus);
  if (out.stickers.length || out.medals.length) Store.save();
  return out;
}
function albumCard() {
  const s = st(); evalCollection();
  const rows = WORLD_DEFS.map(def => h('div', { class: 'alrow', style: `--wc:${def.color}` }, h('h4', null, def.icon + ' ' + tx(def.name)),
    h('div', { class: 'stkrow' }, STICKERS[def.key].map((e, i) => { const got = !!s.stickers[def.key + '|' + i]; return h('span', { class: 'stk' + (got ? ' got' : ''), title: tx(LEVEL_NAMES[i]), 'aria-label': tx(LEVEL_NAMES[i]) + (got ? '' : ' 🔒') }, got ? e : '❔'); })),
    h('div', { class: 'medals', title: L2('Medaily za dokončený svet v ročníkoch 2–9', 'World medals for grades 2–9') }, range(8).map(k => h('span', { class: s.medals[(k + 2) + '|' + def.key] ? 'got' : '', 'aria-label': gradeLabel(k + 2) }, '🥇')))));
  return h('section', { class: 'card' }, h('h2', null, '🎴 ' + L2('Album nálepiek a medailí', 'Sticker & medal album')),
    h('p', { class: 'muted' }, L2('Za každý dokončený level získaš nálepku. Keď dokončíš celý svet v ročníku, dostaneš zlatú medailu (+100 💎). Medaily sú pre ročníky 2 až 9.', 'Every finished level gives a sticker. Finish a whole world in a grade to earn a gold medal (+100 💎). Medals exist for grades 2 to 9.')),
    h('p', null, h('b', null, `🎴 ${Object.keys(s.stickers).length}/${WORLD_DEFS.length * 7}   🥇 ${Object.keys(s.medals).length}`)), h('div', { class: 'album' }, rows));
}

/* ---------- daily missions ---------- */
const todayTasks = () => { const d = dayKey(); return Object.values(st().tasks).filter(x => x.done && x.ts && dayKey(new Date(x.ts)) === d); };
const QUEST_POOL = [
  { id: 's3', grp: 'cnt', icon: '✅', text: S('Vyrieš 3 úlohy', 'Solve 3 tasks'), need: 3, gem: 15, cur: T => T.length },
  { id: 's5', grp: 'cnt', icon: '✅', text: S('Vyrieš 5 úloh', 'Solve 5 tasks'), need: 5, gem: 25, cur: T => T.length },
  { id: 's8', grp: 'cnt', icon: '🚀', text: S('Vyrieš 8 úloh', 'Solve 8 tasks'), need: 8, gem: 40, cur: T => T.length },
  { id: 'st8', grp: 'star', icon: '⭐', text: S('Získaj 8 hviezd', 'Earn 8 stars'), need: 8, gem: 25, cur: T => T.reduce((a, x) => a + (x.stars || 0), 0) },
  { id: 'st15', grp: 'star', icon: '🌠', text: S('Získaj 15 hviezd', 'Earn 15 stars'), need: 15, gem: 40, cur: T => T.reduce((a, x) => a + (x.stars || 0), 0) },
  { id: 'th2', grp: 'three', icon: '🌟', text: S('Získaj 3 hviezdy v 2 úlohách', 'Get 3 stars on 2 tasks'), need: 2, gem: 25, cur: T => T.filter(x => x.stars === 3).length },
  { id: 'nh3', grp: 'hint', icon: '🧠', text: S('Vyrieš 3 úlohy bez nápovedy', 'Solve 3 tasks without a hint'), need: 3, gem: 30, cur: T => T.filter(x => !x.hints).length },
  { id: 'cat3', grp: 'cat', icon: '🌈', text: S('Vyskúšaj 3 rôzne oblasti', 'Try 3 different topics'), need: 3, gem: 25, cur: T => new Set(T.map(x => x.cat)).size },
  { id: 'day', grp: 'day', icon: '📅', text: S('Vyrieš dennú výzvu', 'Solve the daily challenge'), need: 1, gem: 20, cur: () => ((st().daily[dayKey()] || {}).done ? 1 : 0) }
];
function todayQuests() {
  const r = rng(hash('quests:' + dayKey())), pool = QUEST_POOL.slice(), picked = [], used = new Set();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  pool.forEach(q => { if (picked.length < 3 && !used.has(q.grp)) { picked.push(q); used.add(q.grp); } });
  return picked.sort((a, b) => a.gem - b.gem);
}
function questState() { const s = st(); s.quests = s.quests || {}; const k = dayKey(); if (!s.quests[k]) { s.quests[k] = { done: {} }; Object.keys(s.quests).sort().slice(0, -10).forEach(d => delete s.quests[d]); } return s.quests[k]; }
function evalQuests() {
  const T = todayTasks(), qs = todayQuests(), qs_ = questState(), out = { quests: [], all: false };
  qs.forEach(q => { if (!qs_.done[q.id] && q.cur(T) >= q.need) { qs_.done[q.id] = Date.now(); out.quests.push(q); Store.addBonus(q.gem); } });
  if (!qs_.all && qs.every(q => qs_.done[q.id])) { qs_.all = Date.now(); out.all = true; Store.addBonus(40); }
  if (out.quests.length) Store.save();
  return out;
}
function questsCard() {
  const T = todayTasks(), qs = todayQuests(), qs_ = questState();
  return h('section', { class: 'card' }, h('h2', null, '🎯 ' + L2('Dnešné misie', "Today's missions")),
    h('div', { class: 'quests' }, qs.map(q => { const c = Math.min(q.cur(T), q.need), ok = !!qs_.done[q.id] || c >= q.need;
      return h('div', { class: 'quest' + (ok ? ' ok' : '') }, h('span', { class: 'qi', 'aria-hidden': 'true' }, ok ? '✅' : q.icon), h('div', null, h('b', null, tx(q.text)), h('div', { class: 'track', role: 'img', 'aria-label': c + '/' + q.need }, h('div', { style: `width:${c / q.need * 100}%` })), h('small', { class: 'muted' }, `${c}/${q.need}`)), h('span', { class: 'qg' }, '+' + q.gem + ' 💎')); })),
    h('p', { class: 'muted' }, qs_.all ? '🎁 ' + L2('Truhlica otvorená: +40 💎. Zajtra budú nové misie!', 'Chest opened: +40 💎. New missions tomorrow!') : '🎁 ' + L2('Splň všetky tri misie a otvoríš truhlicu: +40 💎.', 'Finish all three missions to open the chest: +40 💎.')));
}

/* ---------- streak milestones ---------- */
const MILESTONES = [{ d: 3, b: 20, i: '🔥' }, { d: 7, b: 50, i: '🌋' }, { d: 14, b: 100, i: '☄️' }, { d: 30, b: 250, i: '🌞' }, { d: 60, b: 400, i: '🌌' }, { d: 100, b: 700, i: '💫' }];
function evalMilestones() {
  const s = st(); s.mile = s.mile || {}; const out = [];
  MILESTONES.forEach(m => { if (s.streak.count >= m.d && !s.mile[m.d]) { s.mile[m.d] = Date.now(); Store.addBonus(m.b); out.push({ icon: m.i, n: S(`Séria ${m.d} dní!`, `${m.d}-day streak!`), bonus: m.b }); } });
  if (out.length) Store.save(); return out;
}
