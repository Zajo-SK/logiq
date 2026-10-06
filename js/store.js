'use strict';
/* LogiQ – local persistence with a pluggable adapter (ready for future login + sync).
   Data model (v1):
   user    { userId, profile{name,grade,lang,created}, settings{sound,anim,bigtext} }
   tasks   { [taskId]: { done, stars(best), points(best), hints, attempts, secs, tries, cat, ts } }
   badges  { [badgeId]: timestamp }
   daily   { [YYYY-MM-DD]: { taskId, done, stars } }
   streak  { count, last }
   history [ { id, cat, title{sk,en}, stars, points, ts } ]
   sync    { adapter, lastSynced }  <- a remote adapter only needs load()/save(state) */
const Store = (() => {
  const KEY = 'logiq.v1';
  const nav = (navigator.language || 'sk').toLowerCase();
  const fresh = () => ({
    v: 1,
    userId: 'u-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
    profile: { name: '', grade: null, cls: '', lang: nav.startsWith('en') ? 'en' : 'sk', created: Date.now() },
    settings: { sound: true, anim: true, bigtext: false, avatar: '🦊', theme: 'base' }, rewards: {}, bonus: 0, levelBonus: {}, maxStreak: 0,
    tasks: {}, badges: {}, daily: {}, streak: { count: 0, last: null }, history: [],
    sync: { adapter: 'local', lastSynced: null, studentId: null, secret: null, classCode: null, classLabel: null, parentCode: null, dirty: false }
  });
  const adapters = {
    local: {
      load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } },
      save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode */ } }
    }
  };
  let adapter = adapters.local;
  const base = fresh();
  const saved = adapter.load() || {};
  let state = Object.assign(base, saved);
  state.profile = Object.assign(fresh().profile, saved.profile);
  state.settings = Object.assign(fresh().settings, saved.settings);

  const api = {
    get state() { return state; },
    setAdapter(a) { adapter = a; },
    save() { adapter.save(state); },
    reset() { const keep = { profile: state.profile, settings: state.settings, userId: state.userId }; state = Object.assign(fresh(), keep); api.save(); },
    resetAll() { state = fresh(); api.save(); },
    info(id) { return state.tasks[id] || null; },
    isDone(id) { return !!(state.tasks[id] && state.tasks[id].done); },
    stars(id) { return (state.tasks[id] && state.tasks[id].stars) || 0; },
    recordTask(task, r) {
      const cur = state.tasks[task.id] || {};
      state.tasks[task.id] = {
        done: true,
        stars: Math.max(cur.stars || 0, r.stars),
        points: Math.max(cur.points || 0, r.points),
        hints: r.hints, attempts: r.attempts, secs: r.secs,
        tries: (cur.tries || 0) + 1, cat: task.cat, ts: Date.now()
      };
      state.history.unshift({ id: task.id, cat: task.cat, title: task.title, stars: r.stars, points: r.points, ts: Date.now() });
      state.history = state.history.slice(0, 120);
      const today = dayKey(), y = new Date(); y.setDate(y.getDate() - 1);
      if (state.streak.last !== today) {
        state.streak.count = state.streak.last === dayKey(y) ? state.streak.count + 1 : 1;
        state.streak.last = today;
      }
      api.save(); if (typeof Sync !== 'undefined') Sync.schedule();
    },
    totals() {
      let stars = 0, points = state.bonus || 0, done = 0;
      for (const v of Object.values(state.tasks)) if (v.done) { done++; stars += v.stars || 0; points += v.points || 0; }
      return { stars, points, done };
    },
    addBonus(n) { state.bonus = (state.bonus || 0) + n; api.save(); },
    award(id) { if (!state.badges[id]) { state.badges[id] = Date.now(); api.save(); return true; } return false; }
  };
  return api;
})();
