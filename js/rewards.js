'use strict';
/* LogiQ – reward system.
   • 💎 points → permanent RANK (never lost)          • ★ stars, streak, solved tasks → unlock avatars & colour themes
   • daily bonus (first task of the day, grows with the streak) and a level bonus (+50 once per level) */
const RANKS = [
  { p: 0, i: '🌱', n: S('Učeň', 'Apprentice') }, { p: 100, i: '🧭', n: S('Objaviteľ', 'Explorer') }, { p: 300, i: '🧩', n: S('Riešiteľ', 'Solver') }, { p: 700, i: '♟️', n: S('Stratég', 'Strategist') },
  { p: 1500, i: '🧠', n: S('Logik', 'Logician') }, { p: 3000, i: '🎓', n: S('Majster', 'Master') }, { p: 6000, i: '🏆', n: S('Veľmajster', 'Grandmaster') }, { p: 12000, i: '👑', n: S('Legenda', 'Legend') }
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
  { id: 'th-galaxy', type: 'theme', v: 'galaxy', n: S('Galaxia', 'Galaxy'), k: 'stars', need: 200 }, { id: 'th-gold', type: 'theme', v: 'gold', n: S('Zlatá', 'Gold'), k: 'points', need: 5000 }
];
const THEME_ICON = { base: '🎨', ocean: '🌊', forest: '🌲', sunset: '🌅', galaxy: '🌌', gold: '🥇' };
const rewardIcon = r => r.type === 'avatar' ? r.v : THEME_ICON[r.v];
function rewardCur(r) { const tot = Store.totals(); return r.k === 'points' ? tot.points : r.k === 'stars' ? tot.stars : r.k === 'tasks' ? tot.done : Math.max(st().streak.count, st().maxStreak || 0); }
function evalRewards() {
  const out = []; REWARDS.forEach(r => { if (!st().rewards[r.id] && rewardCur(r) >= r.need) { st().rewards[r.id] = Date.now(); out.push(r); } });
  if (st().streak.count > (st().maxStreak || 0)) st().maxStreak = st().streak.count; if (out.length) Store.save(); return out;
}
function extraEls(x) {
  const out = [];
  if (x.bonus) out.push(h('p', { class: 'bonusline' }, (x.bonusLabel ? t(x.bonusLabel) : '🔥 ' + t('dailyBonus')) + ' +' + x.bonus + ' 💎'));
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
function reqText(r) { return t('req_' + r.k, { n: r.need }); }
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
