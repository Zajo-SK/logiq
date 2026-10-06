'use strict';
/* LogiQ – app shell, router, views */
const PLAY_ROUTES = ['play', 'practice', 'dplay', 'train'];
let cleanups = [], curSession = null, colFilter = { cat: 'all', band: 'all' };
const runCleanups = () => { cleanups.forEach(f => { try { f(); } catch (e) { /* noop */ } }); cleanups = []; };
const st = () => Store.state;
const grade = () => st().profile.grade;

/* ---------- effects ---------- */
let audioCtx;
function tone(freqs, dur = .12, vol = .14) {
  if (!st().settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    freqs.forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t0 = audioCtx.currentTime + i * dur;
      o.type = 'sine'; o.frequency.value = f; g.gain.value = .0001; o.connect(g); g.connect(audioCtx.destination);
      g.gain.exponentialRampToValueAtTime(vol, t0 + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur + .12);
      o.start(t0); o.stop(t0 + dur + .14);
    });
  } catch (e) { /* audio unavailable */ }
}
const SND = { ok: [523, 659, 784], badge: [659, 784, 988, 1318], oops: [392, 349], tap: [660] };
const animOn = () => st().settings.anim && !matchMedia('(prefers-reduced-motion: reduce)').matches;
function confetti() {
  if (!animOn()) return;
  const c = h('canvas', { class: 'confetti', 'aria-hidden': 'true' }); document.body.append(c);
  const W = c.width = innerWidth, H = c.height = innerHeight, x = c.getContext('2d');
  const cols = ['#f6b81d', '#12b5c0', '#6a4cf0', '#ff6b8b', '#0f1f4b'];
  const ps = range(150).map(() => ({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .4, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, s: 6 + Math.random() * 8, c: cols[Math.floor(Math.random() * cols.length)], r: Math.random() * 6, vr: (Math.random() - .5) * .4 }));
  const t0 = performance.now();
  (function frame(now) {
    const k = now - t0; x.clearRect(0, 0, W, H);
    ps.forEach(p => { p.vy += .38; p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.globalAlpha = Math.max(0, 1 - k / 2400); x.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .6); x.restore(); });
    if (k < 2400) requestAnimationFrame(frame); else c.remove();
  })(t0);
}
function toast(msg) {
  const el = h('div', { class: 'toast', role: 'status' }, msg); document.body.append(el);
  requestAnimationFrame(() => el.classList.add('in')); setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, 2600);
}
function openSheet(content, { dismiss = true, cls = '' } = {}) {
  const ov = h('div', { class: 'overlay' }), sh = h('div', { class: 'sheet ' + cls, role: 'dialog', 'aria-modal': 'true' }, content);
  ov.append(sh); document.body.append(ov);
  const onEsc = e => { if (e.key === 'Escape' && dismiss) close(); };
  const close = () => { document.removeEventListener('keydown', onEsc); ov.remove(); api.onClose && api.onClose(); };
  const api = { close, el: sh };
  document.addEventListener('keydown', onEsc);
  if (dismiss) ov.addEventListener('click', e => { if (e.target === ov) close(); });
  requestAnimationFrame(() => ov.classList.add('in'));
  return api;
}

/* ---------- language, settings ---------- */
function setLang(l) {
  LANG = l; st().profile.lang = l; Store.save(); document.documentElement.lang = l;
  document.title = 'LogiQ – ' + t('subtitle'); render();
}
function applySettings() {
  document.body.classList.toggle('no-anim', !st().settings.anim);
  document.documentElement.classList.toggle('big', !!st().settings.bigtext);
  document.documentElement.dataset.theme = st().settings.theme || 'base';
}

/* ---------- domain helpers ---------- */
const gradeLabel = g => LANG === 'sk' ? `${g}. ročník` : `Grade ${g}`;
const bandLabel = b => LANG === 'sk' ? `${BANDS[b].label} ročník` : `Grade ${BANDS[b].label.replace(/\./g, '')}`;
const diffDots = n => '●'.repeat(n) + '○'.repeat(3 - n);
function levelInfo(entry, g) {
  const lv = entry.level, ids = lv.tasks.map(sp => sp.static || `g:${lv.grade}:${lv.worldKey}:${sp.u}`), done = ids.filter(id => Store.isDone(id)).length;
  return { ids, done, total: ids.length, complete: done === ids.length, stars: ids.reduce((a, id) => a + Store.stars(id), 0), maxStars: ids.length * 3,
    get tasks() { return levelTasks(lv); }, get pts() { return levelTasks(lv).reduce((a, x) => a + x.pts * 3, 0); } };
}
function isUnlocked(seq, i, g) { return seq[i].idx === 0 || levelInfo(seq[i - 1], g).complete; }
function nextTarget(g) {
  const seq = gradeSequence(g);
  for (let i = 0; i < seq.length; i++) {
    const li = levelInfo(seq[i], g);
    if (!li.complete) { if (!isUnlocked(seq, i, g)) return null; return { entry: seq[i], li, idx: Math.max(0, li.ids.findIndex(id => !Store.isDone(id))) }; }
  }
  return null;
}
const dailyCache = new Map();
function dailyTask(g) {
  const key = dayKey(), cid = `daily:${key}:${g}`;
  if (dailyCache.has(cid)) return dailyCache.get(cid);
  const r = rng(hash(cid)), pool = Object.values(TASKS).filter(x => x.band === bandOf(g)), fams = Object.keys(GF).filter(f => GF[f].min <= g);
  let tk;
  if (r() < .15 && pool.length) tk = Object.assign({}, pick(pool, r), { id: cid, daily: true });
  else tk = Object.assign(buildTask(pick(fams, r), g, gradeD(g, ri(r, 15, 60)), ri(r, 0, 9), cid, cid), { daily: true });
  dailyCache.set(cid, tk); return tk;
}
function strengths() {
  const by = {};
  Object.values(st().tasks).forEach(x => { if (!x.done || x.cat == null) return; (by[x.cat] = by[x.cat] || { n: 0, s: 0 }); by[x.cat].n++; by[x.cat].s += x.stars || 0; });
  return Object.entries(by).map(([cat, v]) => ({ cat, n: v.n, avg: v.s / v.n })).sort((a, b) => b.avg - a.avg);
}
function recommendations() {
  const out = [], tot = Store.totals(), sg = strengths(), g = grade();
  const nt = nextTarget(g);
  if (nt) out.push({ icon: '🚀', text: tot.done ? t('recNext', { n: tx(nt.entry.level.name) }) : t('recStart', { n: tx(nt.entry.level.name) }), go: `#/level/${nt.entry.level.id}` });
  if (sg.length >= 2) { const w = sg[sg.length - 1]; if (w.avg < 2.6) out.push({ icon: '🔁', text: t('recPractice', { c: tx(CATS[w.cat].n) }), go: '#/collection', cat: w.cat }); }
  const tried = new Set(sg.map(x => x.cat)), fresh = Object.keys(CATS).find(c => !tried.has(c) && (Object.values(TASKS).some(x => x.cat === c) || Object.values(GF).some(f => f.cat === c && f.min <= g)));
  if (fresh && tot.done) out.push({ icon: '🧪', text: t('recNew', { c: tx(CATS[fresh].n) }), go: '#/collection', cat: fresh });
  if (sg.length && sg[0].avg >= 2.5) out.push({ icon: '💪', text: t('recStrong', { c: tx(CATS[sg[0].cat].n) }) });
  return out;
}
function evalBadges(extra) {
  const info = Object.assign({ st: st(), tot: Store.totals() }, extra), earned = [];
  BADGES.forEach(b => { if (!st().badges[b.id] && b.test(info)) { Store.award(b.id); earned.push(b); } });
  return earned;
}

/* ---------- art ---------- */
const logoMark = `<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6a4cf0"/><stop offset="1" stop-color="#12b5c0"/></linearGradient></defs><rect width="48" height="48" rx="13" fill="url(#lg)"/><path d="M24 9a10 10 0 0 0-5.8 18.1c1 .8 1.8 2 1.8 3.4h8c0-1.4.8-2.6 1.8-3.4A10 10 0 0 0 24 9z" fill="#f6b81d"/><rect x="20" y="33" width="8" height="3" rx="1.5" fill="#fff"/><rect x="21.5" y="37.5" width="5" height="2.5" rx="1.2" fill="#fff"/></svg>`;
const heroArt = `<svg class="heroart" viewBox="0 0 340 230" aria-hidden="true"><defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8f74ff"/><stop offset="1" stop-color="#12b5c0"/></linearGradient><radialGradient id="hb" cx=".4" cy=".35"><stop offset="0" stop-color="#ffe083"/><stop offset="1" stop-color="#f6b81d"/></radialGradient></defs>
<g class="float2"><circle cx="262" cy="64" r="40" fill="url(#hg)"/><ellipse cx="262" cy="64" rx="66" ry="14" fill="none" stroke="#f6b81d" stroke-width="5" transform="rotate(-20 262 64)" opacity=".95"/><circle cx="250" cy="52" r="7" fill="#fff" opacity=".25"/></g>
<g class="float1"><path d="M118 40a52 52 0 0 0-30 94c6 5 10 12 10 20h40c0-8 4-15 10-20a52 52 0 0 0-30-94z" fill="url(#hb)"/><rect x="100" y="162" width="36" height="9" rx="4.5" fill="#fff"/><rect x="106" y="175" width="24" height="9" rx="4.5" fill="#fff" opacity=".85"/><path d="M104 96l14 14 14-14M118 110v34" fill="none" stroke="#0f1f4b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/></g>
<g fill="#fff" opacity=".9">${[0, 1, 2].flatMap(r => [0, 1, 2].map(c => `<rect x="${196 + c * 24}" y="${132 + r * 24}" width="16" height="16" rx="4" opacity="${(r + c) % 2 ? .35 : .9}"/>`)).join('')}</g>
<g stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85"><circle cx="48" cy="190" r="22"/><path d="M48 190l12-14M48 190l-10-12"/></g>
<g fill="#f6b81d">${[[20, 30, 5], [175, 20, 4], [310, 150, 5], [150, 205, 3]].map(([x, y, r]) => `<circle class="tw" cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g></svg>`;

/* ---------- shell ---------- */
function renderHeader(r) {
  const hd = $('#top'); hd.replaceChildren();
  const tot = Store.totals();
  hd.append(...[
    h('a', { class: 'logo', href: '#/home', 'aria-label': 'LogiQ', html: logoMark + `<span><b>Logi<i>Q</i></b><small>${esc(t('subtitle'))}</small></span>` }),
    h('div', { class: 'spacer' }),
    r.name !== 'welcome' ? h('div', { class: 'chip', title: t('starsPoints') }, h('span', { class: 'av', 'aria-hidden': 'true' }, st().settings.avatar), h('span', { class: 'gold', 'aria-hidden': 'true' }, '★'), h('b', null, tot.stars), h('span', { class: 'sep', 'aria-hidden': 'true' }, '·'), h('span', { 'aria-hidden': 'true' }, '💎'), h('b', null, tot.points), h('span', { class: 'sr' }, t('starsPoints'))) : null,
    h('div', { class: 'seg lang', role: 'group', 'aria-label': t('language') },
      ['sk', 'en'].map(l => h('button', { type: 'button', 'aria-pressed': LANG === l, class: LANG === l ? 'on' : '', onclick: () => LANG !== l && setLang(l) }, l.toUpperCase())))].filter(Boolean));
}
const NAV = [['home', 'home'], ['map', 'map'], ['daily', 'daily'], ['collection', 'collection'], ['badges', 'badges'], ['profile', 'profile']];
function renderNav(r) {
  const nav = $('#nav'); nav.replaceChildren();
  const active = { level: 'map', done: 'map', play: 'map', practice: 'collection', train: 'collection', hanoi: 'collection', sudoku: 'collection', dplay: 'daily' }[r.name] || r.name;
  NAV.forEach(([route, icon]) => nav.append(h('a', { href: '#/' + route, class: active === route ? 'on' : '', 'aria-current': active === route ? 'page' : null, html: ic(icon) + `<span>${esc(t('nav_' + route))}</span>` })));
}
function route() { const p = location.hash.replace(/^#\/?/, '').split('/'); return { name: p[0] || 'home', args: p.slice(1) }; }
const go = hsh => { if (location.hash === hsh) render(); else location.hash = hsh; };
function render() {
  document.querySelectorAll('.overlay').forEach(o => o.remove());
  runCleanups();
  const r = route();
  if (!grade() && !['teacher', 'parent'].includes(r.name)) r.name = 'welcome';
  if (!VIEWS[r.name]) r.name = 'home';
  $('#app').classList.toggle('focus', r.name === 'welcome' || r.name === 'teacher' || r.name === 'parent' || PLAY_ROUTES.includes(r.name));
  if (!PLAY_ROUTES.includes(r.name)) curSession = null;
  renderHeader(r); renderNav(r);
  const v = $('#view'); v.replaceChildren(); window.scrollTo(0, 0);
  VIEWS[r.name](v, r.args);
}

/* ---------- views ---------- */
const VIEWS = {};
const page = (v, title, sub, ...kids) => { v.append(h('div', { class: 'page' }, h('div', { class: 'pagehead' }, h('h1', null, title), sub ? h('p', null, sub) : null), kids)); };
const card = (cls, ...kids) => h('section', { class: 'card ' + cls }, kids);
const btn = (label, cls, fn, extra) => h('button', Object.assign({ type: 'button', class: 'btn ' + cls, onclick: fn }, extra || {}), label);

VIEWS.welcome = (v) => {
  const p = st().profile; let cls = p.cls || (grade() ? 'home' : ''), g = grade() || null;
  const grid = h('div', { class: 'gradegrid', role: 'radiogroup', 'aria-label': t('pickGrade') });
  const nameIn = h('input', { class: 'textin', type: 'text', maxlength: 24, placeholder: t('namePh'), value: p.name, 'aria-label': t('yourName'), autocomplete: 'off' });
  const codeIn = API.on() ? h('input', { class: 'textin', type: 'text', maxlength: 10, placeholder: L2('Kód od učiteľa (nepovinné)', 'Code from teacher (optional)'), 'aria-label': L2('Kód triedy', 'Class code'), autocapitalize: 'characters' }) : null;
  const sel = h('select', { class: 'textin', 'aria-label': L2('Trieda', 'Class'), onchange: e => { cls = e.target.value; if (cls && cls !== 'home') g = parseInt(cls); draw(); } },
    h('option', { value: '' }, L2('— vyber triedu —', '— choose your class —')), CLASS_LABELS.map(c => h('option', { value: c, selected: c === cls }, c)), h('option', { value: 'home', selected: cls === 'home' }, L2('Bez triedy (doma)', 'No class (at home)')));
  const start = btn(t('letsGo') + ' ▸', 'primary big', async () => {
    if (!g) return; p.grade = g; p.cls = cls && cls !== 'home' ? cls : ''; p.name = nameIn.value.trim().slice(0, 24); Store.save();
    if (codeIn && codeIn.value.trim()) { try { await Sync.join(codeIn.value.trim().toUpperCase()); } catch (e) { toast(fmtErr(e)); } }
    go('#/home');
  });
  const draw = () => {
    grid.hidden = cls !== 'home'; if (cls !== 'home') grid.replaceChildren();
    else grid.replaceChildren(...range(8).map(i => { const n = i + 2; return h('button', { type: 'button', role: 'radio', class: 'gbtn' + (g === n ? ' on' : ''), 'aria-checked': g === n, onclick: () => { g = n; draw(); } }, h('b', null, n + '.'), h('small', null, LANG === 'sk' ? 'ročník' : 'grade'), g === n ? h('span', { class: 'gk', 'aria-hidden': 'true' }, '✓') : null); }));
    start.disabled = !g;
  };
  v.append(h('div', { class: 'welcome' },
    h('div', { class: 'wl-hero', html: heroArt }),
    h('div', { class: 'wl-body' },
      h('h1', { class: 'wl-title' }, 'Logi', h('i', null, 'Q')), h('p', { class: 'wl-sub' }, t('subtitle')), h('p', { class: 'wl-lead' }, t('welcomeLead')),
      h('label', { class: 'flabel' }, L2('Tvoje meno alebo prezývka', 'Your name or nickname')), nameIn,
      h('label', { class: 'flabel' }, L2('Tvoja trieda', 'Your class')), sel, grid, h('p', { class: 'fine' }, t('gradeChangeLater')),
      codeIn ? [h('label', { class: 'flabel' }, L2('Pripojiť k učiteľovi', 'Join your teacher')), codeIn, h('p', { class: 'fine' }, L2('Ak zadáš kód, učiteľ uvidí tvoje meno a postup.', 'If you enter a code your teacher sees your name and progress.'))] : null,
      start, h('p', { class: 'fine' }, '🔒 ' + t('noAccount')),
      h('p', { class: 'fine' }, h('a', { href: '#/teacher' }, L2('Som učiteľ', 'I am a teacher')), ' · ', h('a', { href: '#/parent' }, L2('Som rodič', 'I am a parent'))))));
  draw();
};

VIEWS.home = (v) => {
  const g = grade(), seq = gradeSequence(g), tot = Store.totals(), nt = nextTarget(g), name = st().profile.name;
  const doneLv = seq.filter(e => levelInfo(e, g).complete).length, pct = seq.length ? doneLv / seq.length : 0, C = 2 * Math.PI * 34;
  const dt = dailyTask(g), dDone = !!(st().daily[dayKey()] || {}).done;
  const recs = recommendations().slice(0, 3);
  const cont = nt
    ? btn(h('span', { class: 'inl' }, h('span', { html: ic('play') }), t(tot.done ? 'continue' : 'start')), 'gold big', () => go(`#/play/${nt.entry.level.id}/${nt.idx}`))
    : btn(t('browseCollection'), 'gold big', () => go('#/collection'));
  const sg = strengths().slice(0, 3);
  v.append(h('div', { class: 'page home' },
    h('section', { class: 'hero' },
      h('div', { class: 'hero-text' },
        h('p', { class: 'eyebrow' }, gradeLabel(g)),
        h('h1', null, name ? t('hello', { n: name }) : t('helloAnon')),
        h('p', null, nt ? t('heroNext', { w: tx(nt.entry.world.name), l: tx(nt.entry.level.name) }) : t('heroAllDone')),
        cont),
      h('div', { class: 'hero-art', html: heroArt })),
    rankCard(),
    h('div', { class: 'statrow' },
      h('div', { class: 'stat' }, h('b', null, '★ ' + tot.stars), h('span', null, t('stars'))),
      h('div', { class: 'stat' }, h('b', null, '💎 ' + tot.points), h('span', null, t('points'))),
      h('div', { class: 'stat' }, h('b', null, '🔥 ' + st().streak.count), h('span', null, t('streakDays'))),
      h('div', { class: 'stat' }, h('b', null, '🏅 ' + Object.keys(st().badges).length), h('span', null, t('nav_badges')))),
    h('div', { class: 'grid2' },
      card('progress', h('div', { class: 'ring', html: `<svg viewBox="0 0 80 80" role="img" aria-label="${Math.round(pct * 100)}%"><circle cx="40" cy="40" r="34" fill="none" stroke="#e3e8f5" stroke-width="9"/><circle cx="40" cy="40" r="34" fill="none" stroke="url(#lg)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C * pct} ${C}" transform="rotate(-90 40 40)"/><text x="40" y="46" text-anchor="middle" font-size="18" font-weight="800" fill="#0f1f4b">${Math.round(pct * 100)}%</text></svg>` }),
        h('div', null, h('h2', null, t('yourProgress')), h('p', null, t('levelsDone', { a: doneLv, b: seq.length })), btn(t('openMap'), 'ghost small', () => go('#/map')))),
      card('daily-card', h('div', { class: 'dc-ico', 'aria-hidden': 'true' }, dDone ? '✅' : '📅'),
        h('div', null, h('h2', null, t('nav_daily')), h('p', null, dDone ? t('dailyDone') : `${CATS[dt.cat].icon} ${tx(CATS[dt.cat].n)}`), btn(dDone ? t('seeDaily') : t('playDaily'), dDone ? 'ghost small' : 'primary small', () => go('#/daily'))))),
    card('', h('h2', null, '🎮 ' + t('gamesTitle')), h('div', { class: 'recs' }, h('p', { class: 'muted' }, t('hanoiLead')), h('div', { class: 'btnrow left' }, btn('🗼 ' + t('hanoiGame') + ' ▸', 'ghost', () => go('#/hanoi')), btn('🧩 Sudoku ▸', 'ghost', () => go('#/sudoku'))))),
    card('recs', h('h2', null, t('recommended')),
      h('ul', { class: 'reclist' }, recs.length ? recs.map(rc => h('li', null, h('span', { class: 'ri', 'aria-hidden': 'true' }, rc.icon), h('span', { class: 'rt' }, rc.text), rc.go ? h('a', { class: 'btn ghost small', href: rc.go, onclick: () => { if (rc.cat) colFilter = { cat: rc.cat, band: 'all' }; } }, t('go') + ' ▸') : null)) : h('li', null, t('recNone')))),
    sg.length ? card('', h('h2', null, t('strongAreas')), h('div', { class: 'bars2' }, sg.map(s => h('div', { class: 'bar2' }, h('span', null, CATS[s.cat].icon + ' ' + tx(CATS[s.cat].n)), h('div', { class: 'track', role: 'img', 'aria-label': s.avg.toFixed(1) + '/3' }, h('div', { style: `width:${s.avg / 3 * 100}%` })), h('b', null, s.avg.toFixed(1) + '★'))))) : null));
};

const trainTitles = new Map();
let chGrade = 0;
VIEWS.map = (v) => {
  const g = grade(), seq = gradeSequence(g), chOpts = [g + 1, g + 2].filter(x => x <= 9);
  if (!chOpts.includes(chGrade)) chGrade = chOpts[0] || 0;
  const worldBlock = (w, challenge) => {
    const gs = challenge ? gradeSequence(w.grade) : seq, entries = gs.filter(e => e.world.key === w.key), infos = entries.map(e => levelInfo(e, g)), wd = infos.filter(x => x.complete).length;
    return h('section', { class: 'world' + (challenge ? ' challenge' : ''), style: `--wc:${w.color}` },
      h('header', { class: 'world-h' }, h('span', { class: 'w-ico', 'aria-hidden': 'true' }, w.icon), h('div', null, h('h2', null, tx(w.name), challenge ? h('span', { class: 'tag' }, '⚡ ' + gradeLabel(w.grade)) : null), h('p', null, tx(w.desc))), h('span', { class: 'w-prog' }, `${wd}/${entries.length}`)),
      h('div', { class: 'path' }, entries.map((e, i) => {
        const li = infos[i], open = challenge || e.idx === 0 || infos[i - 1].complete, state = li.complete ? 'done' : open ? 'open' : 'locked';
        return h('button', { type: 'button', class: `node ${state}`, 'aria-disabled': !open, onclick: () => open ? go('#/level/' + e.level.id) : toast(t('finishPrev')) },
          h('span', { class: 'n-badge' }, state === 'locked' ? h('span', { html: ic('lock') }) : state === 'done' ? '✓' : (i + 1)),
          h('span', { class: 'n-body' }, h('b', null, tx(e.level.name)), h('small', null, state === 'locked' ? t('locked') : `${li.done}/${li.total} · ${li.stars}★`)));
      })));
  };
  const chip = (label, on, fn) => h('button', { type: 'button', class: 'fchip' + (on ? ' on' : ''), 'aria-pressed': on, onclick: fn }, label);
  const ch = chOpts.length ? [h('h2', { class: 'section-h' }, '⚡ ' + t('challengeWorlds')), h('p', { class: 'muted' }, t('challengeLead')), h('div', { class: 'frow' }, chOpts.map(x => chip(gradeLabel(x), chGrade === x, () => { chGrade = x; render(); }))), ...worldsFor(chGrade).map(w => worldBlock(w, true))] : [];
  page(v, t('nav_map'), `${gradeLabel(g)} · ${t('mapLead')}`, h('div', { class: 'worlds' }, worldsFor(g).map(w => worldBlock(w, false))), ch);
};

VIEWS.level = (v, [lid]) => {
  const entry = allLevels().find(x => x.level.id === lid); if (!entry) return go('#/map');
  const g = grade(), li = levelInfo(entry, g), challenge = entry.world.grade > g, first = Math.max(0, li.tasks.findIndex(x => !Store.isDone(x.id)));
  const types = [...new Set(li.tasks.map(x => x.cat))];
  v.append(h('div', { class: 'page level' },
    h('button', { class: 'backlink', type: 'button', onclick: () => go('#/map'), html: ic('back') + `<span>${esc(t('nav_map'))}</span>` }),
    h('section', { class: 'lv-hero', style: `--wc:${entry.world.color}` }, h('span', { class: 'w-ico big', 'aria-hidden': 'true' }, entry.world.icon),
      h('div', null, h('p', { class: 'eyebrow' }, tx(entry.world.name) + (challenge ? ' · ⚡ ' + bandLabel(entry.world.band) : '')), h('h1', null, tx(entry.level.name)), h('p', null, t('levelIntro', { n: li.total })))),
    h('div', { class: 'grid2' },
      card('', h('h2', null, t('whatWaits')), h('ul', { class: 'tasklist' }, li.tasks.map((x, i) => h('li', null, h('button', { type: 'button', class: 'taskrow', onclick: () => go(`#/play/${lid}/${i}`) },
        h('span', { class: 'tr-ico', 'aria-hidden': 'true' }, CATS[x.cat].icon), h('span', { class: 'tr-t' }, h('b', null, tx(x.title)), h('small', null, tx(CATS[x.cat].n) + ' · ' + diffDots(x.diff))),
        Store.isDone(x.id) ? starsHtml(Store.stars(x.id)) : h('span', { class: 'tr-go' }, '▸')))))),
      card('rewards', h('h2', null, t('rewards')), h('ul', { class: 'rewlist' },
        h('li', null, h('span', { 'aria-hidden': 'true' }, '★'), t('rewStars', { n: li.maxStars })), h('li', null, h('span', { 'aria-hidden': 'true' }, '💎'), t('rewPoints', { n: li.pts })),
        h('li', null, h('span', { 'aria-hidden': 'true' }, '🏅'), t('rewBadge')), h('li', null, h('span', { 'aria-hidden': 'true' }, '🗺️'), t('rewMap'))),
        h('p', { class: 'muted' }, t('topics') + ': ' + types.map(c => CATS[c].icon + ' ' + tx(CATS[c].n)).join(', ')),
        h('p', { class: 'muted' }, '💡 ' + t('noPenalty')),
        btn(li.done ? t('continue') + ' ▸' : t('startLevel') + ' ▸', 'primary big', () => go(`#/play/${lid}/${first}`))))));
};

VIEWS.play = (v, [lid, idx]) => {
  const entry = allLevels().find(x => x.level.id === lid); if (!entry) return go('#/map');
  const g = grade(), tasks = levelTasks(entry.level, g), i = Math.min(+idx || 0, tasks.length - 1);
  openTask(tasks[i], { levelId: lid, idx: i, tasks, challenge: entry.world.grade > g, backHash: '#/level/' + lid, onNext: () => go(i + 1 < tasks.length ? `#/play/${lid}/${i + 1}` : `#/done/${lid}`) });
};
VIEWS.practice = (v, [id]) => { const tk = TASKS[id]; if (!tk) return go('#/collection'); openTask(tk, { backHash: '#/collection', practice: true, challenge: BAND_ORDER.indexOf(tk.band) > BAND_ORDER.indexOf(bandOf(grade())), onNext: () => go('#/collection') }); };
let hanoiN = 4;
VIEWS.hanoi = (v) => {
  const sg = st(); sg.games = sg.games || { hanoi: {} }; sg.games.hanoi = sg.games.hanoi || {};
  const box = h('div', { class: 'playbox' }), sess = { data: {}, fast: false }, task = { id: 'hanoi-free', title: S('Hanojské veže', 'Tower of Hanoi'), data: { n: hanoiN, free: true } };
  const best = sg.games.hanoi[hanoiN], chip = (n) => h('button', { type: 'button', class: 'fchip' + (n === hanoiN ? ' on' : ''), 'aria-pressed': n === hanoiN, onclick: () => { hanoiN = n; render(); } }, n);
  const ctx = { task, session: sess, setCheck() { }, nudge: toast, wrong() { }, cleanup(fn) { cleanups.push(fn); },
    solved() { const mv = sess.data.moves, prev = sg.games.hanoi[hanoiN]; if (!prev || mv < prev) { sg.games.hanoi[hanoiN] = mv; Store.save(); } tone(SND.ok); confetti();
      const sh = openSheet(h('div', { class: 'sheetin result' }, h('div', { class: 'burst', 'aria-hidden': 'true' }, '🗼'), h('h2', null, t('hanoiDone')), h('p', { class: 'pts' }, `${t('moves')}: ${mv} · ${t('hanoiMin')}: ${2 ** hanoiN - 1}`), h('div', { class: 'btnrow' }, btn(t('close'), 'ghost', () => sh.close()), btn(t('playAgain'), 'primary', () => { sh.close(); render(); }))), { cls: 'center' }); } };
  page(v, '🗼 ' + t('hanoiGame'), t('hanoiLead'),
    h('p', { class: 'flabel' }, t('hanoiDiscs')), h('div', { class: 'frow' }, [3, 4, 5, 6, 7, 8].map(chip)),
    h('article', { class: 'taskcard' }, h('details', { class: 'intro' }, h('summary', null, '📘 ' + tx(HAN_INTRO)), h('div', { html: hanoiIntro() })), box, h('p', { class: 'muted' }, best ? `${t('hanoiBest')}: ${best}` : '')));
  TaskTypes.hanoi.mount(box, task, ctx);
};
VIEWS.train = (v, [fam, seed]) => { if (!GF[fam]) return go('#/collection'); openTask(trainTask(fam, grade(), +seed || 1), { backHash: '#/collection', train: true, onNext: () => go('#/train/' + fam + '/' + Math.floor(Math.random() * 1e6)) }); };
VIEWS.dplay = () => openTask(dailyTask(grade()), { backHash: '#/daily', daily: true, onNext: () => go('#/daily') });

VIEWS.done = (v, [lid]) => {
  const entry = allLevels().find(x => x.level.id === lid); if (!entry) return go('#/map');
  const g = grade(), li = levelInfo(entry, g); if (!li.complete) return go('#/level/' + lid);
  const rankBefore = rankOf(Store.totals().points).i, lvBonus = !st().levelBonus[lid] ? 50 : 0; if (lvBonus) { st().levelBonus[lid] = true; Store.addBonus(lvBonus); }
  const rw = evalRewards(), ra = rankOf(Store.totals().points), xtra = { bonus: lvBonus, bonusLabel: 'levelBonus', rewards: rw, rankUp: ra.i > rankBefore ? ra.r : null };
  const earned = evalBadges({ levelDone: true }), seq = gradeSequence(g), si = seq.findIndex(e => e.level === entry.level);
  const nxt = (si >= 0 && seq[si + 1] && seq[si + 1].world === entry.world) ? seq[si + 1] : seq.find((e, ix) => !levelInfo(e, g).complete && isUnlocked(seq, ix, g)) || null;
  renderHeader(route());
  tone(SND.ok); setTimeout(() => confetti(), 150); if (earned.length) setTimeout(() => tone(SND.badge, .11), 700);
  const recs = [];
  if (nxt) recs.push({ icon: '🚀', text: t('recNext', { n: tx(nxt.level.name) }), go: '#/level/' + nxt.level.id });
  else recs.push({ icon: '⚡', text: t('recChallenge'), go: '#/map' });
  const sg = strengths(); if (sg.length > 1) { const w = sg[sg.length - 1]; recs.push({ icon: '🔁', text: t('recPractice', { c: tx(CATS[w.cat].n) }), go: '#/collection', cat: w.cat }); }
  v.append(h('div', { class: 'page done' }, card('celebrate',
    h('div', { class: 'burst', 'aria-hidden': 'true' }, '🏆'), h('h1', null, t('levelDoneTitle')), h('p', { class: 'lead' }, tx(entry.level.name)),
    h('div', { class: 'bigstars' }, starsHtml(Math.round(li.stars / li.maxStars * 3) || 1)),
    h('div', { class: 'statrow tight' }, h('div', { class: 'stat' }, h('b', null, `★ ${li.stars}/${li.maxStars}`), h('span', null, t('stars'))), h('div', { class: 'stat' }, h('b', null, '💎 ' + li.tasks.reduce((a, x) => a + ((Store.info(x.id) || {}).points || 0), 0)), h('span', null, t('points')))),
    extraEls(xtra),
    earned.length ? h('div', { class: 'newbadges' }, h('h2', null, t('newBadges')), h('div', { class: 'badgerow' }, earned.map(b => h('div', { class: 'badge got pop' }, h('span', { class: 'bi' }, b.icon), h('b', null, tx(b.n)))))) : null,
    h('p', { class: 'motiv' }, t('motivation')),
    h('h2', null, t('whatNext')), h('ul', { class: 'reclist' }, recs.map(rc => h('li', null, h('span', { class: 'ri', 'aria-hidden': 'true' }, rc.icon), h('span', { class: 'rt' }, rc.text), h('a', { class: 'btn ghost small', href: rc.go, onclick: () => { if (rc.cat) colFilter = { cat: rc.cat, band: 'all' }; } }, t('go') + ' ▸')))),
    h('div', { class: 'btnrow' }, btn(t('nav_map'), 'ghost', () => go('#/map')), nxt ? btn(t('nextLevel') + ' ▸', 'primary', () => go('#/level/' + nxt.level.id)) : btn(t('nav_home'), 'primary', () => go('#/home'))))));
};

VIEWS.daily = (v) => {
  const g = grade(), dt = dailyTask(g), key = dayKey(), rec = st().daily[key] || {}, done = !!rec.done;
  const days = range(7).map(i => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
  v.append(h('div', { class: 'page daily' },
    h('div', { class: 'pagehead' }, h('h1', null, t('nav_daily')), h('p', null, new Date().toLocaleDateString(LANG === 'sk' ? 'sk-SK' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))),
    card('daily-hero', h('div', { class: 'dc-big', 'aria-hidden': 'true' }, done ? '🎉' : '🧩'),
      h('div', null, h('p', { class: 'eyebrow' }, t('todayChallenge')), h('h2', null, `${CATS[dt.cat].icon} ${tx(CATS[dt.cat].n)}`), h('p', null, done ? t('dailyDoneLong') : t('dailyLead')),
        done ? h('div', null, starsHtml(rec.stars || 1), ' ', h('span', { class: 'muted' }, t('comeBack'))) : null,
        btn(done ? t('replay') : t('playDaily') + ' ▸', done ? 'ghost' : 'primary big', () => go('#/dplay')))),
    card('', h('h2', null, `🔥 ${t('streak')}: ${st().streak.count} ${t('streakDays')}`),
      h('div', { class: 'week' }, days.map(d => { const k = dayKey(d), ok = (st().daily[k] || {}).done; return h('div', { class: 'day' + (ok ? ' ok' : '') + (k === key ? ' today' : '') }, h('small', null, d.toLocaleDateString(LANG === 'sk' ? 'sk-SK' : 'en-GB', { weekday: 'short' })), h('b', { 'aria-label': ok ? t('done') : t('notYet') }, ok ? '✓' : '·')); })),
      h('p', { class: 'muted' }, t('streakLead')))));
};

VIEWS.collection = (v) => {
  const g = grade(), gb = BAND_ORDER.indexOf(bandOf(g));
  const list = Object.values(TASKS).filter(x => (colFilter.cat === 'all' || x.cat === colFilter.cat) && (colFilter.band === 'all' || x.band === colFilter.band));
  const cats = Object.keys(CATS).filter(c => Object.values(TASKS).some(x => x.cat === c));
  const chip = (label, on, fn) => h('button', { type: 'button', class: 'fchip' + (on ? ' on' : ''), 'aria-pressed': on, onclick: fn }, label);
  const rer = () => { v.replaceChildren(); VIEWS.collection(v); };
  v.append(h('div', { class: 'page' },
    h('div', { class: 'pagehead' }, h('h1', null, t('nav_collection')), h('p', null, t('collectionLead', { n: Object.keys(TASKS).length }))),
    h('div', { class: 'filters' }, h('div', { class: 'frow', role: 'group', 'aria-label': t('category') }, chip(t('all'), colFilter.cat === 'all', () => { colFilter.cat = 'all'; rer(); }), cats.map(c => chip(CATS[c].icon + ' ' + tx(CATS[c].n), colFilter.cat === c, () => { colFilter.cat = c; rer(); }))),
      h('div', { class: 'frow', role: 'group', 'aria-label': t('gradeBand') }, chip(t('all'), colFilter.band === 'all', () => { colFilter.band = 'all'; rer(); }), BAND_ORDER.map(b => chip(bandLabel(b), colFilter.band === b, () => { colFilter.band = b; rer(); })))),
    h('div', { class: 'btnrow left' }, btn('🎲 ' + t('randomTask'), 'ghost', () => { const p = list.length ? list : Object.values(TASKS); go('#/practice/' + p[Math.floor(Math.random() * p.length)].id); })),
    h('h2', { class: 'section-h' }, '🎮 ' + t('gamesTitle')),
    h('div', { class: 'tgrid' }, h('button', { type: 'button', class: 'tcard train', onclick: () => go('#/hanoi') }, h('div', { class: 'tc-top' }, h('span', { class: 'tc-ico', 'aria-hidden': 'true' }, '🗼'), h('span', { class: 'tc-new' }, '★')), h('b', null, t('hanoiGame')), h('small', null, t('hanoiLead'))),
      h('button', { type: 'button', class: 'tcard train', onclick: () => go('#/sudoku') }, h('div', { class: 'tc-top' }, h('span', { class: 'tc-ico', 'aria-hidden': 'true' }, '🧩'), h('span', { class: 'tc-new' }, '★')), h('b', null, 'Sudoku'), h('small', null, L2('3×3, 4×4, 6×6 a 9×9 · 3 obtiažnosti · poznámky a nápovedy', '3×3, 4×4, 6×6 and 9×9 · 3 levels · notes and hints')))),
    h('h2', { class: 'section-h' }, '♾️ ' + t('trainSets')), h('p', { class: 'muted' }, t('trainLead')),
    h('div', { class: 'tgrid' }, Object.values(GF).filter(f => f.min <= g && (colFilter.cat === 'all' || f.cat === colFilter.cat)).map(f => {
      if (!trainTitles.has(f.key + g)) trainTitles.set(f.key + g, trainTask(f.key, g, 1).title);
      return h('button', { type: 'button', class: 'tcard train', onclick: () => go('#/train/' + f.key + '/' + Math.floor(Math.random() * 1e6)) }, h('div', { class: 'tc-top' }, h('span', { class: 'tc-ico', 'aria-hidden': 'true' }, CATS[f.cat].icon), h('span', { class: 'tc-new' }, '∞')), h('b', null, tx(trainTitles.get(f.key + g))), h('small', null, tx(CATS[f.cat].n)));
    })),
    h('h2', { class: 'section-h' }, '⭐ ' + t('handmade')),
    h('div', { class: 'tgrid' }, list.map(x => {
      const hard = BAND_ORDER.indexOf(x.band) > gb, inf = Store.info(x.id);
      return h('a', { class: 'tcard', href: '#/practice/' + x.id }, h('div', { class: 'tc-top' }, h('span', { class: 'tc-ico', 'aria-hidden': 'true' }, CATS[x.cat].icon), inf && inf.done ? starsHtml(inf.stars) : h('span', { class: 'tc-new' }, t('new'))),
        h('b', null, tx(x.title)), h('small', null, tx(CATS[x.cat].n)), h('div', { class: 'tc-foot' }, h('span', { title: t('difficulty') }, diffDots(x.diff)), h('span', { class: 'tag' + (hard ? ' hot' : '') }, (hard ? '⚡ ' : '') + bandLabel(x.band))));
    }))));
};

VIEWS.badges = (v) => {
  const tot = Store.totals(), got = st().badges;
  evalRewards();
  page(v, t('nav_badges'), t('badgesLead', { a: Object.keys(got).length, b: BADGES.length }), rankCard(), rewardsGrid(), h('h2', { class: 'section-h' }, '🏅 ' + t('badgesTitle')),
    h('div', { class: 'statrow' }, h('div', { class: 'stat' }, h('b', null, '★ ' + tot.stars), h('span', null, t('stars'))), h('div', { class: 'stat' }, h('b', null, '💎 ' + tot.points), h('span', null, t('points'))), h('div', { class: 'stat' }, h('b', null, '✅ ' + tot.done), h('span', null, t('tasksSolved'))), h('div', { class: 'stat' }, h('b', null, '🔥 ' + st().streak.count), h('span', null, t('streakDays')))),
    h('div', { class: 'badgegrid' }, BADGES.map(b => { const on = !!got[b.id]; return h('div', { class: 'badge' + (on ? ' got' : '') }, h('span', { class: 'bi' }, on ? b.icon : '🔒'), h('b', null, tx(b.n)), h('small', null, tx(b.d)), h('span', { class: 'bstate' }, on ? '✓ ' + t('earned') : t('locked'))); })));
};

VIEWS.profile = (v) => {
  const p = st().profile, s = st().settings, g = p.grade, sg = strengths(), recs = recommendations();
  const nameIn = h('input', { class: 'textin', type: 'text', maxlength: 24, value: p.name, placeholder: t('namePh'), 'aria-label': t('yourName'), onchange: e => { p.name = e.target.value.trim().slice(0, 24); Store.save(); toast(t('saved')); } });
  const toggle = (key, label, fn) => h('div', { class: 'setrow' }, h('span', null, label), h('button', { type: 'button', role: 'switch', class: 'switch' + (s[key] ? ' on' : ''), 'aria-checked': !!s[key], 'aria-label': label, onclick: e => { s[key] = !s[key]; Store.save(); e.currentTarget.classList.toggle('on', s[key]); e.currentTarget.setAttribute('aria-checked', s[key]); applySettings(); fn && fn(); } }, h('i')));
  const hist = st().history.slice(0, 12);
  const exportJson = () => {
    const tasks = Object.values(TASKS).map(x => { const c = Object.assign({}, x); delete c.puzzle; if (typeof c.visual === 'function') c.visual = '[dynamic]'; return c; });
    const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), tasks }, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'logiq-task-database.json' }); document.body.append(a); a.click(); a.remove();
  };
  v.append(h('div', { class: 'page profile' }, h('div', { class: 'pagehead' }, h('h1', null, t('nav_profile')), h('p', null, `${p.name || t('anon')} · ${gradeLabel(g)}`)),
    h('div', { class: 'grid2' },
      card('', h('h2', null, t('yourProfile')), h('label', { class: 'flabel' }, t('yourName')), nameIn,
        h('label', { class: 'flabel' }, L2('Trieda', 'Class')), h('select', { class: 'textin', 'aria-label': L2('Trieda', 'Class'), onchange: e => { const c = e.target.value; p.cls = c; if (c) p.grade = parseInt(c); Store.save(); Sync.schedule(); render(); } }, h('option', { value: '' }, L2('— bez triedy —', '— no class —')), CLASS_LABELS.map(c => h('option', { value: c, selected: c === p.cls }, c))),
        h('label', { class: 'flabel' }, t('pickGrade')), h('div', { class: 'chiprow', role: 'radiogroup' }, range(8).map(i => { const n = i + 2; return h('button', { type: 'button', role: 'radio', 'aria-checked': g === n, class: 'fchip' + (g === n ? ' on' : ''), onclick: () => { p.grade = n; Store.save(); render(); } }, n + '.'); })),
        h('p', { class: 'fine' }, t('gradeChangeNote'))),
      card('', h('h2', null, t('settings')),
        h('div', { class: 'setrow' }, h('span', null, t('language')), h('div', { class: 'seg' }, ['sk', 'en'].map(l => h('button', { type: 'button', 'aria-pressed': LANG === l, class: LANG === l ? 'on' : '', onclick: () => LANG !== l && setLang(l) }, l === 'sk' ? 'Slovenčina' : 'English')))),
        toggle('sound', t('sounds'), () => tone(SND.tap)), toggle('anim', t('animations')), toggle('bigtext', t('bigText')))),
    card('', h('h2', null, t('strongAreas')), sg.length ? h('div', { class: 'bars2' }, sg.map(x => h('div', { class: 'bar2' }, h('span', null, CATS[x.cat].icon + ' ' + tx(CATS[x.cat].n)), h('div', { class: 'track', role: 'img', 'aria-label': x.avg.toFixed(1) + '/3' }, h('div', { style: `width:${x.avg / 3 * 100}%` })), h('b', null, x.avg.toFixed(1) + '★ · ' + x.n)))) : h('p', { class: 'muted' }, t('noHistory')),
      h('h2', { class: 'mt' }, t('recommended')), h('ul', { class: 'reclist' }, recs.length ? recs.map(rc => h('li', null, h('span', { class: 'ri', 'aria-hidden': 'true' }, rc.icon), h('span', { class: 'rt' }, rc.text), rc.go ? h('a', { class: 'btn ghost small', href: rc.go, onclick: () => { if (rc.cat) colFilter = { cat: rc.cat, band: 'all' }; } }, t('go') + ' ▸') : null)) : h('li', null, t('recNone')))),
    card('', h('h2', null, t('history')), hist.length ? h('ul', { class: 'histlist' }, hist.map(x => h('li', null, h('span', { 'aria-hidden': 'true' }, CATS[x.cat] ? CATS[x.cat].icon : '•'), h('span', { class: 'ht' }, tx(x.title), h('small', null, new Date(x.ts).toLocaleDateString(LANG === 'sk' ? 'sk-SK' : 'en-GB'))), starsHtml(x.stars), h('b', null, '+' + x.points)))) : h('p', { class: 'muted' }, t('noHistory'))),
    connectCard(), teacherEntry(),
    card('', h('details', { class: 'admin' }, h('summary', null, '🛠️ ' + t('adminTitle')),
      h('p', { class: 'muted' }, t('adminLead')), h('div', { class: 'btnrow left' }, btn('⬇ ' + t('exportDb'), 'ghost small', exportJson)),
      h('div', { class: 'tablewrap' }, h('table', { class: 'admintab' }, h('thead', null, h('tr', null, ['ID', t('category'), t('gradeBand'), t('taskType'), t('source'), t('license')].map(x => h('th', null, x)))),
        h('tbody', null, Object.values(TASKS).map(x => h('tr', null, h('td', null, x.id), h('td', null, tx(CATS[x.cat].n)), h('td', null, BANDS[x.band].label), h('td', null, x.type), h('td', null, tx(x.src.note)), h('td', null, x.src.license))))))),
      h('p', { class: 'fine' }, t('syncNote') + ' ' + `(userId: ${st().userId})`)),
    card('danger', h('h2', null, t('dataTitle')), h('p', { class: 'muted' }, t('dataLead')), btn(t('resetProgress'), 'ghost small danger', () => {
      const sh = openSheet(h('div', { class: 'sheetin' }, h('h2', null, t('resetProgress') + '?'), h('p', null, t('resetConfirm')), h('div', { class: 'btnrow' }, btn(t('cancel'), 'ghost', () => sh.close()), btn(t('yesReset'), 'primary danger', () => { Store.reset(); sh.close(); toast(t('resetDone')); render(); }))));
    }))));
};

/* ---------- task player ---------- */
const PRAISE = [S('Výborne!', 'Excellent!'), S('Skvelá práca!', 'Great work!'), S('Správne!', 'Correct!'), S('Bravo, šikovné premýšľanie!', 'Bravo, clever thinking!')];
const OOPS = [
  { t: S('Skoro to máme!', 'Almost there!'), m: S('Pozri sa na zadanie ešte raz – možno ti unikol nejaký detail.', 'Look at the task once more – a detail may have slipped by.') },
  { t: S('Zaujímavý pokus!', 'Interesting try!'), m: S('Aj z nesprávnych pokusov sa učíme, čo funguje a čo nie. Skús iný uhol pohľadu.', 'Even wrong tries teach us what works and what does not. Try another angle.') },
  { t: S('Ešte nie, ale si na dobrej ceste.', 'Not yet, but you are on the right track.'), m: S('Hlavolamy sú na skúšanie. Čo by si zmenil? Ak chceš, použi nápovedu.', 'Puzzles are for trying. What would you change? Use a hint if you like.') }
];
function calcStars(ss) { return Math.max(1, 3 - Math.min(ss.hints.length, 2) - (ss.attempts >= 3 ? 1 : 0)); }

function openTask(task, o) {
  const v = $('#view');
  const ss = (curSession && curSession.task.id === task.id) ? curSession : (curSession = { task, hints: [], attempts: 0, solved: false, explained: false, finished: false, t0: Date.now(), data: {}, work: '', fast: !!window.__LOGIQ_FAST });
  const type = TaskTypes[task.type], cat = CATS[task.cat];
  let checkFn = null, inst = null;
  const playBox = h('div', { class: 'playbox' }), hintsBox = h('div', { class: 'hints', 'aria-live': 'polite' });
  const bHint = h('button', { type: 'button', class: 'btn hint', onclick: useHint }), bExp = h('button', { type: 'button', class: 'btn explain', onclick: showExplain }), bCheck = h('button', { type: 'button', class: 'btn primary', onclick: () => checkFn && checkFn() }), bNext = h('button', { type: 'button', class: 'btn primary', onclick: () => o.onNext && o.onNext() });
  const ctx = {
    task, session: ss, setCheck(fn) { checkFn = fn; refresh(); }, solved: onSolved, wrong: onWrong, nudge: toast, cleanup(fn) { cleanups.push(fn); }
  };
  function refresh() {
    const left = task.hints.length - ss.hints.length;
    bHint.replaceChildren(h('span', { html: ic('bulb') }), h('span', null, `${t('hint')} (${ss.hints.length}/${task.hints.length})`));
    bHint.disabled = ss.finished || left <= 0; bHint.title = left <= 0 ? t('noMoreHints') : '';
    bExp.replaceChildren(h('span', { html: ic('book') }), h('span', null, t('explain')));
    bCheck.replaceChildren(h('span', { html: ic('check') }), h('span', null, t('check'))); bCheck.hidden = !checkFn || ss.finished;
    bNext.replaceChildren(h('span', null, t(o.practice || o.daily ? 'done' : 'next')), h('span', { html: ic('next') })); bNext.hidden = !ss.finished;
  }
  function drawHints() {
    hintsBox.replaceChildren(...ss.hints.map((x, i) => h('div', { class: 'hintbubble' }, h('span', { class: 'hn' }, '💡 ' + (i + 1)), h('p', null, tx(x)))));
  }
  function useHint() {
    if (ss.finished || ss.hints.length >= task.hints.length) return;
    const i = ss.hints.length; let spec = task.hints[i], hl = null;
    if (spec === 'dyn') { const d = inst && inst.dynHint && inst.dynHint(i); if (d) { spec = d.text; hl = d.hl; } else spec = S('Pozri sa na úlohu ešte raz a skús iný uhol pohľadu.', 'Look at the task once more and try another angle.'); }
    ss.hints.push(spec); if (hl) hl(); tone(SND.tap); drawHints(); refresh();
  }
  function lock() { playBox.classList.add('locked'); playBox.setAttribute('inert', ''); }
  function secs() { return Math.round((Date.now() - ss.t0) / 1000); }
  function markDaily(stars) { if (o.daily) { st().daily[dayKey()] = { taskId: task.id, done: true, stars }; Store.save(); } }
  function onSolved() {
    if (ss.finished) return;
    ss.solved = ss.finished = true; lock();
    const stars = calcStars(ss), pts = task.pts * stars, firstToday = st().streak.last !== dayKey(), rankBefore = rankOf(Store.totals().points).i;
    if (!o.train) { Store.recordTask(task, { stars, points: pts, hints: ss.hints.length, attempts: ss.attempts, secs: secs() }); markDaily(stars); }
    const li = o.tasks ? o.tasks.every(x => Store.isDone(x.id)) : false;
    const earned = o.train ? [] : evalBadges({ task, ss, daily: !!o.daily, challenge: !!o.challenge && !o.daily, levelDone: false });
    const extra = { bonus: 0, rewards: [], rankUp: null };
    if (!o.train) { if (firstToday) { extra.bonus = 10 + Math.min(40, Math.max(0, st().streak.count - 1) * 5); Store.addBonus(extra.bonus); } extra.rewards = evalRewards(); const ra = rankOf(Store.totals().points); if (ra.i > rankBefore) extra.rankUp = ra.r; }
    renderHeader(route()); refresh(); showResult(stars, pts, earned, li, extra);
  }
  function showResult(stars, pts, earned, lvlDone, extra = {}) {
    tone(SND.ok); confetti();
    const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)];
    const sh = openSheet(h('div', { class: 'sheetin result' },
      h('div', { class: 'burst', 'aria-hidden': 'true' }, '🎉'), h('h2', null, tx(praise)),
      h('div', { class: 'bigstars', 'aria-label': `${stars}/3` }, range(3).map(i => h('span', { class: 'bs' + (i < stars ? ' on' : ''), style: `animation-delay:${.15 + i * .2}s` }, i < stars ? '★' : '☆'))),
      o.train ? h('p', { class: 'muted' }, t('trainNote')) : h('p', { class: 'pts' }, '+' + pts + ' ' + t('pointsLower')),
      h('p', { class: 'muted' }, ss.hints.length ? t('usedHints', { n: ss.hints.length }) : t('noHintsUsed')),
      extraEls(extra),
      earned.length ? h('div', { class: 'newbadges' }, h('h3', null, t('newBadges')), h('div', { class: 'badgerow' }, earned.map(b => h('div', { class: 'badge got pop' }, h('span', { class: 'bi' }, b.icon), h('b', null, tx(b.n)))))) : null,
      h('div', { class: 'btnrow' }, btn('📖 ' + t('explain'), 'ghost', () => { sh.close(); openExplain(task, {}); }), btn((o.practice || o.daily ? t('done') : t(lvlDone ? 'finishLevel' : 'next')) + ' ▸', 'primary', () => { sh.close(); o.onNext && o.onNext(); }))), { dismiss: true, cls: 'center' });
    if (earned.length) setTimeout(() => tone(SND.badge, .11), 900);
  }
  function onWrong(msg) {
    if (ss.finished) return;
    ss.attempts++; tone(SND.oops);
    const p = OOPS[(ss.attempts - 1) % OOPS.length], canHint = ss.hints.length < task.hints.length;
    const sh = openSheet(h('div', { class: 'sheetin oops' }, h('div', { class: 'burst', 'aria-hidden': 'true' }, '🤔'), h('h2', null, tx(p.t)), h('p', null, tx(msg) || tx(p.m)), h('p', { class: 'muted' }, t('mistakeOk')),
      h('div', { class: 'btnrow' }, canHint ? btn('💡 ' + t('hint'), 'ghost', () => { sh.close(); useHint(); }) : null, btn(t('tryAgain'), 'primary', () => sh.close()))), { cls: 'center' });
  }
  function showExplain() {
    const open = () => openExplain(task, { onClose: () => { if (!ss.finished) finishByExplain(); } });
    if (ss.finished) return open();
    const sh = openSheet(h('div', { class: 'sheetin' }, h('h2', null, '📖 ' + t('explainAsk')), h('p', null, t('explainConfirm')),
      h('div', { class: 'btnrow' }, btn(t('keepTrying'), 'primary', () => sh.close()), btn(t('showSolution'), 'ghost', () => { sh.close(); open(); }))), { cls: 'center' });
  }
  function finishByExplain() {
    ss.explained = ss.finished = true; lock();
    if (!o.train) { Store.recordTask(task, { stars: 1, points: 0, hints: ss.hints.length, attempts: ss.attempts, secs: secs() }); markDaily(1); }
    renderHeader(route()); refresh(); toast(t('explainedToast'));
  }

  const dots = o.tasks ? h('div', { class: 'dots', role: 'img', 'aria-label': `${o.idx + 1}/${o.tasks.length}` }, o.tasks.map((x, i) => h('span', { class: 'dot' + (Store.isDone(x.id) ? ' done' : '') + (i === o.idx ? ' cur' : '') }))) : null;
  v.append(h('div', { class: 'player' },
    h('div', { class: 'taskbar' },
      h('button', { type: 'button', class: 'backlink', onclick: () => go(o.backHash), html: ic('back') + `<span>${esc(t('back'))}</span>` }),
      dots || h('span'), h('span', { class: 'tb-r' }, o.daily ? '📅 ' + t('nav_daily') : o.challenge ? '⚡ ' + t('challenge') : '')),
    h('article', { class: 'taskcard' },
      h('div', { class: 'tc-meta' }, h('span', { class: 'catchip' }, cat.icon + ' ' + tx(cat.n)), h('span', { class: 'diff', title: t('difficulty') }, diffDots(task.diff))),
      h('h1', null, tx(task.title)),
      task.intro ? h('details', { class: 'intro', open: true }, h('summary', null, '📘 ' + tx(task.introTitle)), h('div', { html: task.intro() })) : null,
      h('p', { class: 'prompt' }, tx(task.prompt)),
      task.visual ? h('div', { class: 'visual', html: typeof task.visual === 'function' ? task.visual() : task.visual }) : null,
      playBox, hintsBox),
    h('div', { class: 'actionbar' }, bHint, bExp, h('span', { class: 'grow' }), bCheck, bNext)));
  inst = type.mount(playBox, task, ctx) || null;
  if (ss.finished) lock();
  drawHints(); refresh();
}

function openExplain(task, { onClose } = {}) {
  const type = TaskTypes[task.type];
  const steps = [...(task.explain || []).map(x => x && x.text ? x : { text: x }), ...(type.explainSteps ? type.explainSteps(task) : [])];
  if (type.answerText) steps.push({ text: () => t('correctAnswer') + ': ' + type.answerText(task), answer: true });
  let shown = 0; const list = h('ol', { class: 'steps' }), nextB = btn(t('nextStep') + ' ▸', 'primary', addStep), allB = btn(t('showAll'), 'ghost', () => { while (shown < steps.length) addStep(); });
  function addStep() {
    if (shown >= steps.length) return;
    const s = steps[shown++], vis = h('div', { class: 'step-vis' }); if (s.render) s.render(vis);
    list.append(h('li', { class: 'step' + (s.answer ? ' answer' : '') }, h('span', { class: 'sn' }, s.answer ? '✓' : shown), h('div', null, h('p', null, typeof s.text === 'function' ? s.text() : tx(s.text)), vis)));
    list.lastChild.scrollIntoView && list.lastChild.scrollIntoView({ block: 'nearest', behavior: animOn() ? 'smooth' : 'auto' });
    if (shown >= steps.length) { nextB.hidden = true; allB.hidden = true; }
  }
  const sh = openSheet(h('div', { class: 'sheetin explainer' }, h('h2', null, '📖 ' + t('explain')), h('p', { class: 'muted' }, t('explainIntro')), list,
    h('div', { class: 'btnrow' }, allB, nextB, btn(t('close'), 'ghost', () => sh.close()))), { cls: 'tall' });
  sh.onClose = onClose; addStep();
}

/* ---------- boot ---------- */
function boot() {
  LANG = st().profile.lang || 'sk'; document.documentElement.lang = LANG; document.title = 'LogiQ – ' + t('subtitle');
  applySettings();
  window.addEventListener('hashchange', render);
  render();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
  Sync.schedule();
}
