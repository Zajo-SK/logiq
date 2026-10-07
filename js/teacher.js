'use strict';
/* LogiQ – class selection, student sync, teacher / parent / admin environment */
const L2 = (sk, en) => LANG === 'sk' ? sk : en;
const CLASS_LABELS = range(8).flatMap(i => ['A', 'B', 'C'].map(l => `${i + 2}.${l}`));
const API = {
  base() { try { return localStorage.getItem('logiq.api') || window.LOGIQ_API || ''; } catch (e) { return window.LOGIQ_API || ''; } },
  on() { return !!API.base(); },
  async call(path, method = 'GET', body, token) {
    const r = await fetch(API.base().replace(/\/$/, '') + path, { method, headers: Object.assign({ 'content-type': 'application/json' }, token ? { authorization: 'Bearer ' + token } : {}), body: body ? JSON.stringify(body) : undefined });
    let j = {}; try { j = await r.json(); } catch (e) { /* no body */ }
    if (!r.ok) throw Object.assign(new Error(j.error || ('HTTP ' + r.status)), { status: r.status });
    return j;
  }
};
const TS = {
  get() { try { return JSON.parse(sessionStorage.getItem('logiq.teacher') || 'null'); } catch (e) { return null; } },
  set(v) { try { v ? sessionStorage.setItem('logiq.teacher', JSON.stringify(v)) : sessionStorage.removeItem('logiq.teacher'); } catch (e) { /* ignore */ } }
};

/* ---------- student device -> server ---------- */
const Sync = {
  timer: null,
  connected() { const s = st().sync; return !!(s && s.studentId && s.secret && s.classCode); },
  payload() {
    const s = st(), tot = Store.totals(), g = grade(), seq = g ? gradeSequence(g) : [], cats = {};
    Object.values(s.tasks).forEach(t => { if (!t.done || !t.cat) return; const c = cats[t.cat] = cats[t.cat] || { n: 0, s: 0 }; c.n++; c.s += t.stars || 0; });
    Object.keys(cats).forEach(k => cats[k] = { n: cats[k].n, avg: +(cats[k].s / cats[k].n).toFixed(2) });
    return { nick: s.profile.name || 'Žiak', cls: s.profile.cls, grade: g, stars: tot.stars, points: tot.points, done: tot.done, rank: rankOf(tot.points).i, streak: s.streak.count, lastActive: Date.now(), badges: Object.keys(s.badges).length,
      levelsDone: seq.filter(e => levelInfo(e, g).complete).length, levelsTotal: seq.length, cats, asg: Sync.asgProgress(), history: s.history.slice(0, 15).map(x => ({ t: x.title, c: x.cat, s: x.stars, p: x.points, ts: x.ts })) };
  },
  asgProgress() { const out = {}; (st().assign || []).forEach(a => { const ids = a.items.map(itemId).filter(Boolean); out[a.id] = { d: ids.filter(id => Store.isDone(id)).length, s: ids.reduce((x, id) => x + Store.stars(id), 0) }; }); return out; },
  keep(list) { const before = JSON.stringify(st().assign || []); st().assign = list || []; if (JSON.stringify(st().assign) !== before) { const n = route().name; if (n === 'home' || n === 'assigned') render(); } },
  schedule() { if (!Sync.connected() || !API.on()) return; clearTimeout(Sync.timer); Sync.timer = setTimeout(Sync.push, 2500); },
  async push() {
    const s = st().sync; if (!Sync.connected() || !API.on()) return;
    try { const r = await API.call('/api/sync', 'POST', { classCode: s.classCode, studentId: s.studentId, secret: s.secret, data: Sync.payload() }); Sync.keep(r.assignments); s.lastSynced = Date.now(); s.dirty = false; }
    catch (e) { s.dirty = true; if (e.status === 403) Sync.leave(true); }
    Store.save();
  },
  async join(code) {
    const r = await API.call('/api/join', 'POST', { code, nick: st().profile.name || 'Žiak', grade: grade() || 0, cls: st().profile.cls });
    Object.assign(st().sync, { studentId: r.studentId, secret: r.secret, classCode: r.classCode, classLabel: r.classLabel, parentCode: r.parentCode }); st().assign = r.assignments || [];
    if (r.classLabel) { st().profile.cls = r.classLabel; if (!grade()) st().profile.grade = parseInt(r.classLabel); }
    Store.save(); Sync.push(); return r;
  },
  leave(quiet) { Object.assign(st().sync, { studentId: null, secret: null, classCode: null, classLabel: null, parentCode: null }); st().assign = []; Store.save(); if (!quiet) toast(L2('Odpojené od triedy.', 'Disconnected from the class.')); }
};
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') Sync.schedule(); });

/* ---------- shared helpers ---------- */
const ago = ts => { if (!ts) return '–'; const m = Math.round((Date.now() - ts) / 60000); if (m < 2) return L2('teraz', 'now'); if (m < 60) return L2(`pred ${m} min`, `${m} min ago`); const hh = Math.round(m / 60); if (hh < 36) return L2(`pred ${hh} h`, `${hh} h ago`); const d = Math.round(hh / 24); return L2(`pred ${d} dňami`, `${d} days ago`); };
const fmtErr = e => e && e.message ? e.message : L2('Chyba spojenia', 'Connection error');
const noServer = () => card('', h('h2', null, L2('Server nie je nastavený', 'Server not set up')), h('p', null, L2('Učiteľské a rodičovské prostredie potrebuje server (Cloudflare Worker). Postup nastavenia je v súbore server/README.md. Po nastavení vlož jeho adresu do js/config.js.', 'The teacher and parent area needs a server (Cloudflare Worker). Setup steps are in server/README.md. After setting it up put its address into js/config.js.')));
const backLink = () => h('button', { class: 'backlink', type: 'button', onclick: () => go(grade() ? '#/profile' : '#/'), html: ic('back') + `<span>${esc(L2('Späť', 'Back'))}</span>` });

function studentDetail(s, onDelete) {
  const d = s.data, rk = d ? RANKS[Math.min(d.rank || 0, RANKS.length - 1)] : null;
  const cats = d && d.cats ? Object.entries(d.cats).sort((a, b) => b[1].avg - a[1].avg) : [];
  return h('div', { class: 'sheetin sdetail' },
    h('h2', null, `${s.nick} `, h('small', { class: 'muted' }, `${d && d.cls ? d.cls : ''} · ${L2('ročník', 'grade')} ${s.grade || (d && d.grade) || '?'}`)),
    !d ? h('p', { class: 'muted' }, L2('Zatiaľ žiadne údaje – žiak ešte nič nevyriešil alebo nie je online.', 'No data yet – the student has not solved anything or has not been online.')) : [
      h('p', null, `${rk.i} ${tx(rk.n)} · ${L2('naposledy aktívny', 'last active')}: ${ago(s.updated)}`),
      h('div', { class: 'statrow tight' }, h('div', { class: 'stat' }, h('b', null, '★ ' + d.stars), h('span', null, L2('hviezdy', 'stars'))), h('div', { class: 'stat' }, h('b', null, '💎 ' + d.points), h('span', null, L2('body', 'points'))), h('div', { class: 'stat' }, h('b', null, '✅ ' + d.done), h('span', null, L2('úlohy', 'tasks'))), h('div', { class: 'stat' }, h('b', null, '🔥 ' + d.streak), h('span', null, L2('séria dní', 'streak')))),
      h('p', { class: 'muted' }, L2(`Levely: ${d.levelsDone} z ${d.levelsTotal} · odznaky: ${d.badges}`, `Levels: ${d.levelsDone} of ${d.levelsTotal} · badges: ${d.badges}`)),
      h('div', { class: 'track', role: 'img' }, h('div', { style: `width:${d.levelsTotal ? d.levelsDone / d.levelsTotal * 100 : 0}%` })),
      cats.length ? h('div', null, h('h3', { class: 'mt' }, L2('Silné a slabé stránky (priemer hviezd)', 'Strengths and weaknesses (average stars)')), h('div', { class: 'bars2' }, cats.map(([c, v]) => h('div', { class: 'bar2' }, h('span', null, (CATS[c] ? CATS[c].icon + ' ' + tx(CATS[c].n) : c)), h('div', { class: 'track', role: 'img', 'aria-label': v.avg + '/3' }, h('div', { style: `width:${v.avg / 3 * 100}%` })), h('b', null, v.avg.toFixed(1) + '★ · ' + v.n))))) : null,
      d.history && d.history.length ? h('div', null, h('h3', { class: 'mt' }, L2('Posledné úlohy', 'Recent tasks')), h('ul', { class: 'histlist' }, d.history.map(x => h('li', null, h('span', { 'aria-hidden': 'true' }, CATS[x.c] ? CATS[x.c].icon : '•'), h('span', { class: 'ht' }, tx(x.t), h('small', null, ago(x.ts))), starsHtml(x.s), h('b', null, '+' + x.p))))) : null],
    h('p', { class: 'muted mt' }, L2('Rodičovský kód', 'Parent code') + ': ', h('b', { class: 'code' }, s.parentCode)),
    onDelete ? h('div', { class: 'btnrow' }, btn(L2('Zmazať žiaka', 'Delete student'), 'ghost small danger', onDelete)) : null);
}

/* ---------- student: join a class & teacher/parent entry ---------- */
function connectCard() {
  if (!API.on()) return null;
  const s = st().sync;
  if (Sync.connected()) return card('', h('h2', null, '🏫 ' + L2('Pripojený k učiteľovi', 'Connected to teacher')),
    h('p', null, L2(`Trieda ${s.classLabel || ''}. Učiteľ vidí tvoje meno a postup. Posledná synchronizácia: ${s.lastSynced ? ago(s.lastSynced) : '–'}.`, `Class ${s.classLabel || ''}. Your teacher sees your name and progress. Last sync: ${s.lastSynced ? ago(s.lastSynced) : '–'}.`)),
    h('p', null, L2('Rodičovský kód', 'Parent code') + ': ', h('b', { class: 'code' }, s.parentCode), h('br'), h('small', { class: 'muted' }, L2('Ak ho dáš rodičovi, uvidí tvoj postup na stránke Rodičovský prístup.', 'Give it to a parent so they can see your progress in the Parent access area.'))),
    h('div', { class: 'btnrow left' }, btn(L2('Synchronizovať teraz', 'Sync now'), 'ghost small', async () => { await Sync.push(); toast(L2('Hotovo', 'Done')); render(); }), btn(L2('Odpojiť', 'Disconnect'), 'ghost small danger', () => { Sync.leave(); render(); })));
  const inp = h('input', { class: 'textin', type: 'text', maxlength: 10, placeholder: L2('Kód od učiteľa (napr. K7M2QX)', 'Code from teacher (e.g. K7M2QX)'), 'aria-label': L2('Kód triedy', 'Class code'), autocapitalize: 'characters' });
  return card('', h('h2', null, '🏫 ' + L2('Pripojiť k učiteľovi', 'Connect to a teacher')), h('p', { class: 'muted' }, L2('Po pripojení uvidí učiteľ tvoje meno a postup. Nič iné sa neodosiela.', 'After connecting, your teacher sees your name and progress. Nothing else is sent.')), inp,
    h('div', { class: 'btnrow left' }, btn(L2('Pripojiť', 'Connect'), 'primary', async () => { try { await Sync.join(inp.value.trim().toUpperCase()); toast(L2('Pripojené!', 'Connected!')); render(); } catch (e) { toast(fmtErr(e)); } })));
}
const teacherEntry = () => card('', h('h2', null, '👩‍🏫 ' + L2('Učiteľ, správca, rodič', 'Teacher, admin, parent')), h('div', { class: 'btnrow left' }, btn(L2('Prihlásenie učiteľa / správcu', 'Teacher / admin login'), 'ghost', () => go('#/teacher')), btn(L2('Rodičovský prístup', 'Parent access'), 'ghost', () => go('#/parent'))));

/* ---------- teacher / admin ---------- */
let tTab = 'classes', tOpen = null;
VIEWS.teacher = (v) => {
  const sess = TS.get(), root = h('div', { class: 'page teacher' }, backLink(), h('div', { class: 'pagehead' }, h('h1', null, '👩‍🏫 ' + L2('Učiteľské prostredie', 'Teacher area'))));
  v.append(root);
  if (!API.on()) return root.append(noServer());
  if (!sess) {
    const em = h('input', { class: 'textin', type: 'text', autocomplete: 'username', placeholder: L2('E-mail (správca: admin)', 'E-mail (admin: admin)'), 'aria-label': 'E-mail' }), pw = h('input', { class: 'textin', type: 'password', autocomplete: 'current-password', placeholder: L2('Heslo', 'Password'), 'aria-label': L2('Heslo', 'Password') }), err = h('p', { class: 'errmsg', role: 'alert' });
    const go2 = async () => { err.textContent = ''; try { const r = await API.call('/api/login', 'POST', { email: em.value, password: pw.value }); TS.set(r); render(); } catch (e) { err.textContent = fmtErr(e); } };
    pw.addEventListener('keydown', e => { if (e.key === 'Enter') go2(); });
    return root.append(card('', h('h2', null, L2('Prihlásenie', 'Sign in')), em, h('div', { style: 'height:.6rem' }), pw, err, h('div', { class: 'btnrow left' }, btn(L2('Prihlásiť', 'Sign in'), 'primary', go2)), h('p', { class: 'fine' }, L2('Účty učiteľov vytvára správca. Správca sa prihlasuje menom „admin“.', 'Teacher accounts are created by the admin. The admin signs in as “admin”.'))));
  }
  const isAdmin = sess.role === 'admin', body = h('div');
  const chip = (k, label) => h('button', { type: 'button', class: 'fchip' + (tTab === k ? ' on' : ''), 'aria-pressed': tTab === k, onclick: () => { tTab = k; tOpen = null; render(); } }, label);
  root.append(card('', h('div', { class: 'tbar' }, h('span', null, `${sess.email} · ${isAdmin ? L2('správca', 'admin') : L2('učiteľ', 'teacher')}`), btn(L2('Odhlásiť', 'Sign out'), 'ghost small', () => { TS.set(null); render(); })),
    h('div', { class: 'frow' }, chip('classes', L2('Triedy', 'Classes')), chip('assign', '📌 ' + L2('Zadania', 'Assignments')), isAdmin ? chip('teachers', L2('Učitelia', 'Teachers')) : null)), body);
  const fail = e => { if (e.status === 401) { TS.set(null); render(); } else body.append(h('p', { class: 'errmsg' }, fmtErr(e))); };
  if (tTab === 'teachers' && isAdmin) teachersPane(body, sess, fail); else if (tTab === 'assignNew') asgNewPane(body, sess, fail); else if (tTab === 'assign') asgListPane(body, sess, fail); else if (tOpen) classPane(body, sess, fail); else classesPane(body, sess, isAdmin, fail);
};

function showCodeFull(code, label) {
  const close = () => { document.removeEventListener('keydown', esc); try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { /* ignore */ } ov.remove(); };
  const esc = e => { if (e.key === 'Escape') close(); };
  const ov = h('div', { class: 'codefull', role: 'dialog', 'aria-label': L2('Kód triedy', 'Class code') },
    h('p', { class: 'cf-top' }, L2('Trieda ', 'Class ') + label), h('div', { class: 'cf-code' }, code),
    h('p', { class: 'cf-how' }, L2('Otvor aplikáciu LogiQ → Profil → „Pripojiť k učiteľovi“ → napíš tento kód.', 'Open LogiQ → Profile → “Connect to a teacher” → type this code.')),
    h('button', { type: 'button', class: 'btn primary big', onclick: close }, '✕ ' + L2('Zavrieť', 'Close')));
  document.body.append(ov); document.addEventListener('keydown', esc); try { ov.requestFullscreen && ov.requestFullscreen(); } catch (e) { /* ignore */ }
}
const codeBtn = (code, label) => btn('🖥️ ' + L2('Kód na celú obrazovku', 'Show code full screen'), 'ghost', () => showCodeFull(code, label));

let newG = 2, newL = 'A';
async function classesPane(body, sess, isAdmin, fail) {
  const list = h('div', { class: 'grid2' }), pick = h('div');
  const drawPick = () => pick.replaceChildren(
    h('p', { class: 'flabel' }, L2('Ročník', 'Grade')), h('div', { class: 'frow bigchips' }, range(8).map(i => h('button', { type: 'button', class: 'fchip' + (newG === i + 2 ? ' on' : ''), 'aria-pressed': newG === i + 2, onclick: () => { newG = i + 2; drawPick(); } }, i + 2 + '.'))),
    h('p', { class: 'flabel' }, L2('Trieda (písmeno)', 'Class letter')), h('div', { class: 'frow bigchips' }, ['A', 'B', 'C', 'D', 'E', 'F'].map(l => h('button', { type: 'button', class: 'fchip' + (newL === l ? ' on' : ''), 'aria-pressed': newL === l, onclick: () => { newL = l; drawPick(); } }, l))),
    h('div', { class: 'btnrow left' }, btn('➕ ' + L2(`Vytvoriť triedu ${newG}.${newL}`, `Create class ${newG}.${newL}`), 'primary big', async () => { try { await API.call('/api/classes', 'POST', { label: `${newG}.${newL}` }, sess.token); toast(L2('Trieda vytvorená', 'Class created')); render(); } catch (e) { fail(e); } })));
  drawPick();
  body.append(card('bigcard', h('h2', null, L2('Nová trieda', 'New class')), pick), list);
  try {
    const { classes } = await API.call('/api/classes', 'GET', null, sess.token);
    if (!classes.length) list.append(h('p', { class: 'muted' }, L2('Zatiaľ nemáš žiadnu triedu. Vytvor ju vyššie a kód daj žiakom.', 'You have no class yet. Create one above and give the code to students.')));
    classes.forEach(c => list.append(card('bigcard', h('h2', null, `${c.label} `, h('small', { class: 'muted' }, L2(`${c.count} žiakov`, `${c.count} students`))), isAdmin ? h('p', { class: 'muted' }, c.owner) : null,
      h('p', null, L2('Kód pre žiakov', 'Code for students') + ': ', h('b', { class: 'code' }, c.code)),
      h('div', { class: 'btnrow left' }, btn(L2('Otvoriť', 'Open'), 'primary', () => { tOpen = c.code; render(); }), codeBtn(c.code, c.label),
        btn(L2('Zmazať triedu', 'Delete class'), 'ghost small danger', () => { const sh = openSheet(h('div', { class: 'sheetin' }, h('h2', null, L2('Zmazať triedu?', 'Delete class?')), h('p', null, L2('Vymažú sa aj všetci žiaci a ich postup. Nedá sa to vrátiť.', 'All students and their progress will be deleted. This cannot be undone.')), h('div', { class: 'btnrow' }, btn(L2('Zrušiť', 'Cancel'), 'ghost', () => sh.close()), btn(L2('Zmazať', 'Delete'), 'primary danger', async () => { sh.close(); try { await API.call('/api/classes/' + c.code, 'DELETE', null, sess.token); render(); } catch (e) { fail(e); } })))); })))));
  } catch (e) { fail(e); }
}
async function classPane(body, sess, fail) {
  const wrap = h('div'); body.append(wrap);
  try {
    const r = await API.call(`/api/classes/${tOpen}/students`, 'GET', null, sess.token), st2 = r.students.sort((a, b) => a.nick.localeCompare(b.nick));
    const csv = () => { const rows = [['Meno', 'Trieda', 'Rocnik', 'Hviezdy', 'Body', 'Ulohy', 'Seria', 'Levely', 'Posledna aktivita']].concat(st2.map(s => { const d = s.data || {}; return [s.nick, r.label, s.grade, d.stars ?? '', d.points ?? '', d.done ?? '', d.streak ?? '', d.levelsDone ?? '', s.updated ? new Date(s.updated).toISOString() : '']; }));
      const blob = new Blob(['﻿' + rows.map(x => x.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')], { type: 'text/csv' }), a = h('a', { href: URL.createObjectURL(blob), download: `logiq-${r.label}.csv` }); document.body.append(a); a.click(); a.remove(); };
    wrap.append(card('', h('div', { class: 'tbar' }, h('h2', null, L2(`Trieda ${r.label}`, `Class ${r.label}`)), h('div', { class: 'btnrow left' }, btn('← ' + L2('Triedy', 'Classes'), 'ghost small', () => { tOpen = null; render(); }), btn(L2('Obnoviť', 'Refresh'), 'ghost small', () => render()), btn('⬇ CSV', 'ghost small', csv))),
      h('p', { class: 'muted' }, L2('Kód pre žiakov: ', 'Code for students: '), h('b', { class: 'code' }, tOpen)), h('div', { class: 'btnrow left' }, codeBtn(tOpen, r.label), btn('📌 ' + L2('Zadať úlohy triede', 'Assign tasks to the class'), 'ghost', () => { asgNew(); asgForm.classes.add(tOpen); tTab = 'assignNew'; tOpen = null; render(); })),
      st2.length ? h('div', { class: 'tablewrap' }, h('table', { class: 'admintab st' }, h('thead', null, h('tr', null, [L2('Meno', 'Name'), L2('Hodnosť', 'Rank'), '★', '💎', L2('Úlohy', 'Tasks'), L2('Séria', 'Streak'), L2('Aktivita', 'Activity')].map(x => h('th', null, x)))),
        h('tbody', null, st2.map(s => { const d = s.data || {}; return h('tr', { class: 'clickable', tabindex: 0, onclick: () => showStudent(s), onkeydown: e => { if (e.key === 'Enter') showStudent(s); } }, h('td', null, h('b', null, s.nick)), h('td', null, d.rank != null ? RANKS[Math.min(d.rank, RANKS.length - 1)].i + ' ' + tx(RANKS[Math.min(d.rank, RANKS.length - 1)].n) : '–'), h('td', null, d.stars ?? '–'), h('td', null, d.points ?? '–'), h('td', null, d.done ?? '–'), h('td', null, d.streak ?? '–'), h('td', null, ago(s.updated))); })))) : h('p', { class: 'muted' }, L2('Zatiaľ sa nikto nepripojil. Žiaci zadajú kód triedy v Profile alebo pri prvom spustení.', 'Nobody has joined yet. Students enter the class code in Profile or at first launch.'))));
    function showStudent(s) { const sh = openSheet(studentDetail(s, () => { sh.close(); const sh2 = openSheet(h('div', { class: 'sheetin' }, h('h2', null, L2('Zmazať žiaka?', 'Delete student?')), h('p', null, s.nick), h('div', { class: 'btnrow' }, btn(L2('Zrušiť', 'Cancel'), 'ghost', () => sh2.close()), btn(L2('Zmazať', 'Delete'), 'primary danger', async () => { sh2.close(); try { await API.call(`/api/students/${tOpen}/${s.id}`, 'DELETE', null, sess.token); render(); } catch (e) { fail(e); } })))); }), { cls: 'tall' }); }
  } catch (e) { fail(e); }
}
async function teachersPane(body, sess, fail) {
  const em = h('input', { class: 'textin', type: 'email', placeholder: L2('E-mail učiteľa', 'Teacher e-mail'), 'aria-label': 'E-mail' }), pw = h('input', { class: 'textin', type: 'text', placeholder: L2('Dočasné heslo (min. 8 znakov)', 'Temporary password (min. 8 chars)'), 'aria-label': L2('Heslo', 'Password') }), msg = h('p', { class: 'errmsg', role: 'alert' }), list = h('div');
  const gen = () => { const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = new Uint8Array(12); crypto.getRandomValues(r); pw.value = [...r].map(x => a[x % a.length]).join(''); };
  body.append(card('', h('h2', null, L2('Nový učiteľ', 'New teacher')), em, h('div', { style: 'height:.6rem' }), pw, h('div', { class: 'btnrow left' }, btn(L2('Vygenerovať heslo', 'Generate password'), 'ghost small', gen), btn(L2('Vytvoriť účet', 'Create account'), 'primary', async () => { msg.textContent = ''; try { await API.call('/api/teachers', 'POST', { email: em.value, password: pw.value }, sess.token); const e2 = em.value; toast(L2('Účet vytvorený – pošli učiteľovi e-mail a heslo.', 'Account created – send the teacher the e-mail and password.')); msg.className = 'okmsg'; msg.textContent = `${e2} / ${pw.value}`; list.replaceChildren(); load(); } catch (e) { msg.className = 'errmsg'; msg.textContent = fmtErr(e); } })), msg), card('', h('h2', null, L2('Učitelia', 'Teachers')), list));
  async function load() { try { const { teachers } = await API.call('/api/teachers', 'GET', null, sess.token); list.replaceChildren(...(teachers.length ? teachers.map(t => h('div', { class: 'setrow' }, h('span', null, t.email), btn(L2('Zmazať', 'Delete'), 'ghost small danger', async () => { if (confirm(L2('Zmazať účet ' + t.email + '?', 'Delete account ' + t.email + '?'))) { try { await API.call('/api/teachers/' + encodeURIComponent(t.email), 'DELETE', null, sess.token); load(); } catch (e) { fail(e); } } }))) : [h('p', { class: 'muted' }, L2('Zatiaľ žiadny učiteľ.', 'No teachers yet.'))])); } catch (e) { fail(e); } }
  load();
}

/* ---------- parent (read only) ---------- */
VIEWS.parent = (v, [code]) => {
  const root = h('div', { class: 'page teacher' }, backLink(), h('div', { class: 'pagehead' }, h('h1', null, '👨‍👩‍👧 ' + L2('Rodičovský prístup', 'Parent access')), h('p', null, L2('Zadaj kód, ktorý ti dal žiak alebo učiteľ. Uvidíš len postup tohto jedného žiaka.', 'Enter the code your child or teacher gave you. You will see the progress of that one student only.'))));
  v.append(root); if (!API.on()) return root.append(noServer());
  const inp = h('input', { class: 'textin', type: 'text', maxlength: 8, placeholder: L2('Rodičovský kód', 'Parent code'), 'aria-label': L2('Rodičovský kód', 'Parent code'), value: code || '', autocapitalize: 'characters' }), out = h('div'), err = h('p', { class: 'errmsg', role: 'alert' });
  let timer = null;
  const load = async () => { err.textContent = ''; const c = inp.value.trim().toUpperCase(); if (!c) return; try { const r = await API.call('/api/parent/' + c); out.replaceChildren(card('', studentDetail(Object.assign({}, r.student, { data: r.student.data && Object.assign({ cls: r.classLabel }, r.student.data) })))); clearInterval(timer); timer = setInterval(load, 60000); } catch (e) { out.replaceChildren(); err.textContent = fmtErr(e); } };
  cleanups.push(() => clearInterval(timer));
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') load(); });
  root.append(card('', inp, err, h('div', { class: 'btnrow left' }, btn(L2('Zobraziť', 'Show'), 'primary', load))), out); if (code) load();
};

/* =====================  ASSIGNMENTS  ===================== */
/* An assignment item is {lv:'L4-strat-2', i:3} (task #i of a level) or {st:'taskId'} (hand-written task from the collection). */
function itemTask(it) {
  if (it.st) return TASKS[it.st] || null;
  const m = /^L(\d)-([a-z]+)-(\d)$/.exec(it.lv || ''); if (!m) return null;
  const w = worldsFor(+m[1]).find(x => x.key === m[2]), lv = w && w.levels[+m[3] - 1]; return lv ? (levelTasks(lv)[it.i] || null) : null;
}
function itemId(it) {
  if (it.st) return it.st;
  const m = /^L(\d)-([a-z]+)-(\d)$/.exec(it.lv || ''); if (!m) return null;
  const w = worldsFor(+m[1]).find(x => x.key === m[2]), lv = w && w.levels[+m[3] - 1], sp = lv && lv.tasks[it.i]; return sp ? (sp.static || `g:${lv.grade}:${lv.worldKey}:${sp.u}`) : null;
}
const itemTitle = it => { const t = itemTask(it); return t ? tx(t.title) : '?'; };
const fmtDay = ms => ms ? new Date(ms).toLocaleDateString(LANG === 'sk' ? 'sk-SK' : 'en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' }) : '';

let asgForm = null, tOpenA = null;
function asgNew() { asgForm = { title: '', note: '', due: '', items: [], classes: new Set(), students: new Map(), mode: 'lv', g: 4, w: 'strat', lv: 1, cat: 'all' }; }
const hasItem = it => asgForm.items.some(x => x.st ? x.st === it.st : (x.lv === it.lv && x.i === it.i));
const toggleItem = it => { const k = asgForm.items.findIndex(x => x.st ? x.st === it.st : (x.lv === it.lv && x.i === it.i)); if (k >= 0) asgForm.items.splice(k, 1); else asgForm.items.push(it); };

async function asgNewPane(body, sess, fail) {
  if (!asgForm) asgNew(); const F = asgForm, root = h('div'); body.append(root);
  let classes = []; try { classes = (await API.call('/api/classes', 'GET', null, sess.token)).classes; } catch (e) { return fail(e); }
  const studentsCache = {};
  const draw = () => {
    const lvId = `L${F.g}-${F.w}-${F.lv}`;
    const chip = (label, on, fn) => h('button', { type: 'button', class: 'fchip' + (on ? ' on' : ''), 'aria-pressed': on, onclick: fn }, label);
    const picker = h('div');
    if (F.mode === 'lv') {
      const w = worldsFor(F.g).find(x => x.key === F.w) || worldsFor(F.g)[0], lv = w.levels[F.lv - 1], tasks = levelTasks(lv);
      picker.append(h('p', { class: 'flabel' }, L2('Ročník', 'Grade')), h('div', { class: 'frow bigchips' }, range(8).map(i => chip(i + 2 + '.', F.g === i + 2, () => { F.g = i + 2; draw(); }))),
        h('p', { class: 'flabel' }, L2('Svet', 'World')), h('div', { class: 'frow' }, WORLD_DEFS.map(d => chip(d.icon + ' ' + tx(d.name), F.w === d.key, () => { F.w = d.key; draw(); }))),
        h('p', { class: 'flabel' }, L2('Level', 'Level')), h('div', { class: 'frow bigchips' }, range(7).map(i => chip(i + 1 + '', F.lv === i + 1, () => { F.lv = i + 1; draw(); }))),
        h('div', { class: 'btnrow left' }, btn(L2('Pridať celý level (10 úloh)', 'Add the whole level (10 tasks)'), 'ghost small', () => { tasks.forEach((_, i) => { const it = { lv: lvId, i }; if (!hasItem(it)) F.items.push(it); }); draw(); })),
        h('ul', { class: 'pickl' }, tasks.map((t, i) => { const it = { lv: lvId, i }; return h('li', null, h('label', null, h('input', { type: 'checkbox', checked: hasItem(it), onchange: () => { toggleItem(it); draw(); } }), h('span', null, `${i + 1}. ${CATS[t.cat] ? CATS[t.cat].icon : ''} ${tx(t.title)} `, h('small', { class: 'muted' }, diffDots(t.diff || 1)))), h('small', { class: 'muted pq' }, tx(t.prompt).replace(/\s+/g, ' ').slice(0, 110))); })));
    } else {
      const all = Object.values(TASKS).filter(t => F.cat === 'all' || t.cat === F.cat), cats = [...new Set(Object.values(TASKS).map(t => t.cat))];
      picker.append(h('div', { class: 'frow' }, chip(L2('Všetko', 'All'), F.cat === 'all', () => { F.cat = 'all'; draw(); }), cats.map(c => chip((CATS[c] ? CATS[c].icon + ' ' + tx(CATS[c].n) : c), F.cat === c, () => { F.cat = c; draw(); }))),
        h('ul', { class: 'pickl' }, all.map(t => { const it = { st: t.id }; return h('li', null, h('label', null, h('input', { type: 'checkbox', checked: hasItem(it), onchange: () => { toggleItem(it); draw(); } }), h('span', null, `${CATS[t.cat] ? CATS[t.cat].icon : ''} ${tx(t.title)} `, h('small', { class: 'muted' }, bandLabel(t.band)))), h('small', { class: 'muted pq' }, tx(t.prompt).replace(/\s+/g, ' ').slice(0, 110))); })));
    }
    const targets = h('div', null, classes.length ? classes.map(c => {
      const sd = h('div', { class: 'stsel' });
      const drawStudents = (list) => sd.replaceChildren(...list.map(s => h('label', { class: 'stlab' }, h('input', { type: 'checkbox', checked: F.students.has(c.code + '|' + s.id) || F.classes.has(c.code), disabled: F.classes.has(c.code), onchange: e => { if (e.target.checked) F.students.set(c.code + '|' + s.id, { code: c.code, id: s.id, nick: s.nick }); else F.students.delete(c.code + '|' + s.id); } }), ' ' + s.nick)));
      return h('div', { class: 'tcls' }, h('label', { class: 'bigcheck' }, h('input', { type: 'checkbox', checked: F.classes.has(c.code), onchange: e => { if (e.target.checked) F.classes.add(c.code); else F.classes.delete(c.code); draw(); } }), h('b', null, ' ' + L2('Celá trieda ', 'Whole class ') + c.label), h('small', { class: 'muted' }, ` (${c.count})`)),
        h('button', { type: 'button', class: 'btn ghost small', onclick: async () => { if (sd.childNodes.length) return sd.replaceChildren(); try { studentsCache[c.code] = studentsCache[c.code] || (await API.call(`/api/classes/${c.code}/students`, 'GET', null, sess.token)).students.sort((a, b) => a.nick.localeCompare(b.nick)); drawStudents(studentsCache[c.code]); } catch (e) { fail(e); } } }, '👤 ' + L2('Vybrať konkrétnych žiakov', 'Pick individual students')), sd);
    }) : h('p', { class: 'muted' }, L2('Najprv vytvor triedu.', 'Create a class first.')));
    const err = h('p', { class: 'errmsg', role: 'alert' });
    const ti = h('input', { class: 'textin', type: 'text', maxlength: 80, value: F.title, placeholder: L2('Názov zadania (napr. Domáca úloha – logika)', 'Assignment title'), 'aria-label': L2('Názov', 'Title'), oninput: e => { F.title = e.target.value; } });
    const no = h('textarea', { class: 'textin', rows: 2, maxlength: 400, placeholder: L2('Poznámka pre žiakov (nepovinné)', 'Note for students (optional)'), 'aria-label': L2('Poznámka', 'Note'), oninput: e => { F.note = e.target.value; } }, F.note);
    const du = h('input', { class: 'textin', type: 'date', value: F.due, 'aria-label': L2('Termín', 'Due date'), oninput: e => { F.due = e.target.value; } });
    root.replaceChildren(
      card('bigcard', h('div', { class: 'tbar' }, h('h2', null, '📌 ' + L2('Nové zadanie', 'New assignment')), btn('← ' + L2('Zadania', 'Assignments'), 'ghost small', () => { tTab = 'assign'; render(); })), ti, h('div', { style: 'height:.6rem' }), no, h('div', { style: 'height:.6rem' }), h('label', { class: 'flabel' }, L2('Termín odovzdania (nepovinné)', 'Due date (optional)')), du),
      card('bigcard', h('h2', null, '1️⃣ ' + L2('Vyber úlohy', 'Pick tasks')), h('div', { class: 'frow bigchips' }, chip('🗺️ ' + L2('Z levelov', 'From levels'), F.mode === 'lv', () => { F.mode = 'lv'; draw(); }), chip('📚 ' + L2('Zo zbierky', 'From collection'), F.mode === 'st', () => { F.mode = 'st'; draw(); })), picker,
        h('p', null, h('b', null, L2(`Vybraných úloh: ${F.items.length}`, `Selected tasks: ${F.items.length}`))),
        F.items.length ? h('div', { class: 'selitems' }, F.items.map((it, k) => h('span', { class: 'selit' }, itemTitle(it), h('button', { type: 'button', 'aria-label': L2('Odobrať', 'Remove'), onclick: () => { F.items.splice(k, 1); draw(); } }, '×')))) : null),
      card('bigcard', h('h2', null, '2️⃣ ' + L2('Komu', 'Assign to')), targets),
      card('bigcard', h('h2', null, '3️⃣ ' + L2('Zadať', 'Send')), err, h('div', { class: 'btnrow left' }, btn('📌 ' + L2('Zadať úlohy', 'Assign'), 'primary big', async () => {
        err.textContent = ''; if (!F.title.trim()) return err.textContent = L2('Zadaj názov zadania.', 'Enter a title.'); if (!F.items.length) return err.textContent = L2('Vyber aspoň jednu úlohu.', 'Pick at least one task.'); if (!F.classes.size && !F.students.size) return err.textContent = L2('Vyber triedu alebo žiakov.', 'Pick a class or students.');
        try { await API.call('/api/assignments', 'POST', { title: F.title, note: F.note, due: F.due ? new Date(F.due + 'T23:59:00').getTime() : null, items: F.items, classes: [...F.classes], students: [...F.students.values()].map(x => ({ code: x.code, id: x.id })) }, sess.token); asgForm = null; tTab = 'assign'; toast(L2('Zadanie odoslané', 'Assignment sent')); render(); } catch (e) { err.textContent = fmtErr(e); } }))));
  };
  draw();
}

async function asgListPane(body, sess, fail) {
  if (tOpenA) return asgDetailPane(body, sess, fail);
  const list = h('div', { class: 'grid2' });
  body.append(card('bigcard', h('div', { class: 'tbar' }, h('h2', null, '📌 ' + L2('Zadania', 'Assignments')), btn('➕ ' + L2('Nové zadanie', 'New assignment'), 'primary big', () => { asgNew(); tTab = 'assignNew'; render(); }))), list);
  try {
    const { assignments } = await API.call('/api/assignments', 'GET', null, sess.token);
    if (!assignments.length) list.append(h('p', { class: 'muted' }, L2('Zatiaľ žiadne zadania. Vytvor prvé tlačidlom vyššie.', 'No assignments yet. Create the first one above.')));
    assignments.forEach(a => { const labels = [...new Set(a.targets.filter(t => t.label).map(t => t.label))], ns = a.targets.filter(t => t.student).length, pct = a.nStudents ? a.nDone / a.nStudents * 100 : 0;
      list.append(card('bigcard', h('h2', null, a.title), h('p', { class: 'muted' }, `${labels.length ? L2('Triedy: ', 'Classes: ') + labels.join(', ') : ''}${labels.length && ns ? ' · ' : ''}${ns ? L2(`žiaci: ${ns}`, `students: ${ns}`) : ''}`), h('p', { class: 'muted' }, L2(`${a.nItems} úloh`, `${a.nItems} tasks`) + (a.due ? ' · ' + L2('termín ', 'due ') + fmtDay(a.due) : '')),
        h('div', { class: 'track', role: 'img', 'aria-label': Math.round(pct) + '%' }, h('div', { style: `width:${pct}%` })), h('p', null, L2(`Splnilo ${a.nDone} z ${a.nStudents} žiakov`, `${a.nDone} of ${a.nStudents} students finished`)),
        h('div', { class: 'btnrow left' }, btn(L2('Otvoriť', 'Open'), 'primary', () => { tOpenA = a.id; render(); }), btn(L2('Zmazať', 'Delete'), 'ghost small danger', () => { if (confirm(L2('Zmazať zadanie?', 'Delete the assignment?'))) API.call('/api/assignments/' + a.id, 'DELETE', null, sess.token).then(() => render()).catch(fail); })))); });
  } catch (e) { fail(e); }
}
async function asgDetailPane(body, sess, fail) {
  try {
    const r = await API.call('/api/assignments/' + tOpenA, 'GET', null, sess.token), a = r.assignment, n = a.items.length, rows = r.rows.sort((x, y) => (x.label + x.nick).localeCompare(y.label + y.nick));
    body.append(card('bigcard', h('div', { class: 'tbar' }, h('h2', null, a.title), h('div', { class: 'btnrow left' }, btn('← ' + L2('Zadania', 'Assignments'), 'ghost small', () => { tOpenA = null; render(); }), btn(L2('Obnoviť', 'Refresh'), 'ghost small', () => render()))),
      a.note ? h('p', null, a.note) : null, h('p', { class: 'muted' }, L2(`${n} úloh`, `${n} tasks`) + (a.due ? ' · ' + L2('termín ', 'due ') + fmtDay(a.due) : '')),
      h('details', null, h('summary', null, L2('Zoznam úloh', 'Task list')), h('ol', null, a.items.map(it => h('li', null, itemTitle(it))))),
      rows.length ? h('div', { class: 'tablewrap' }, h('table', { class: 'admintab st' }, h('thead', null, h('tr', null, [L2('Žiak', 'Student'), L2('Trieda', 'Class'), L2('Splnené', 'Done'), '★', L2('Stav', 'Status')].map(x => h('th', null, x)))),
        h('tbody', null, rows.map(x => { const d = x.p ? x.p.d : 0, ok = d >= n; return h('tr', null, h('td', null, h('b', null, x.nick)), h('td', null, x.label), h('td', null, `${d}/${n}`), h('td', null, x.p ? x.p.s : '–'), h('td', null, ok ? '✅ ' + L2('hotovo', 'done') : d ? '🟡 ' + L2('rozpracované', 'in progress') : '⚪ ' + L2('nezačal', 'not started'))); })))) : h('p', { class: 'muted' }, L2('Zadanie zatiaľ nemá žiadnych žiakov.', 'No students yet.'))));
  } catch (e) { fail(e); }
}

/* ---------- student side ---------- */
function asgState(a) { const ids = a.items.map(itemId), done = ids.filter(id => id && Store.isDone(id)).length, late = a.due && Date.now() > a.due && done < a.items.length; return { done, total: a.items.length, late, first: Math.max(0, ids.findIndex(id => id && !Store.isDone(id))) }; }
function assignCard() {
  if (!API.on() || !Sync.connected()) return null;
  if (Date.now() - (Sync.lastPull || 0) > 60000) { Sync.lastPull = Date.now(); Sync.push(); }
  const list = (st().assign || []).filter(a => asgState(a).done < a.items.length); if (!list.length) return null;
  return card('', h('h2', null, '📌 ' + L2('Zadané úlohy od učiteľa', 'Tasks from your teacher')), h('ul', { class: 'reclist' }, list.slice(0, 3).map(a => { const s = asgState(a);
    return h('li', null, h('span', { class: 'ri', 'aria-hidden': 'true' }, s.late ? '⏰' : '📌'), h('span', { class: 'rt' }, h('b', null, a.title), h('small', { class: 'muted' }, ` ${s.done}/${s.total}` + (a.due ? ' · ' + L2('do ', 'due ') + fmtDay(a.due) : ''))), h('a', { class: 'btn primary small', href: `#/atask/${a.id}/${s.first}` }, L2('Spustiť', 'Start') + ' ▸')); })),
    h('div', { class: 'btnrow left' }, btn(L2('Všetky zadania', 'All assignments'), 'ghost small', () => go('#/assigned'))));
}
VIEWS.assigned = (v) => {
  if (API.on() && Sync.connected()) Sync.push();
  const list = st().assign || [];
  page(v, '📌 ' + L2('Zadané úlohy', 'Assigned tasks'), L2('Úlohy, ktoré ti zadal učiteľ.', 'Tasks your teacher gave you.'),
    !API.on() || !Sync.connected() ? card('', h('p', null, L2('Pripoj sa k učiteľovi v Profile, aby sa ti zobrazili zadané úlohy.', 'Connect to a teacher in Profile to see assigned tasks.')), btn(L2('Do profilu', 'Open Profile'), 'primary', () => go('#/profile'))) : null,
    list.length ? list.map(a => { const s = asgState(a); return card('', h('h2', null, (s.late ? '⏰ ' : '📌 ') + a.title), a.note ? h('p', null, a.note) : null,
      h('p', { class: 'muted' }, L2(`Hotovo ${s.done} z ${s.total}`, `Done ${s.done} of ${s.total}`) + (a.due ? ' · ' + L2('termín ', 'due ') + fmtDay(a.due) + (s.late ? ' (' + L2('po termíne', 'overdue') + ')' : '') : '')),
      h('div', { class: 'track', role: 'img', 'aria-label': Math.round(s.done / s.total * 100) + '%' }, h('div', { style: `width:${s.done / s.total * 100}%` })),
      h('ul', { class: 'tasklist' }, a.items.map((it, i) => { const id = itemId(it), ok = id && Store.isDone(id), t = itemTask(it); return h('li', null, h('button', { type: 'button', class: 'taskrow', onclick: () => go(`#/atask/${a.id}/${i}`) }, h('span', { class: 'tr-ico', 'aria-hidden': 'true' }, t && CATS[t.cat] ? CATS[t.cat].icon : '•'), h('span', { class: 'tr-t' }, h('b', null, t ? tx(t.title) : '?')), ok ? starsHtml(Store.stars(id)) : h('span', { class: 'tr-go' }, '▸'))); })),
      s.done < s.total ? btn((s.done ? L2('Pokračovať', 'Continue') : L2('Začať', 'Start')) + ' ▸', 'primary big', () => go(`#/atask/${a.id}/${s.first}`)) : h('p', null, '✅ ' + L2('Hotovo, super!', 'Done, great job!'))); })
    : (Sync.connected() ? h('p', { class: 'muted' }, L2('Zatiaľ nemáš žiadne zadané úlohy.', 'No assigned tasks yet.')) : null));
};
VIEWS.atask = (v, [aid, idx]) => {
  const a = (st().assign || []).find(x => x.id === aid); if (!a) return go('#/assigned');
  const i = Math.min(Math.max(+idx || 0, 0), a.items.length - 1), tasks = a.items.map(itemTask);
  if (tasks.some(t => !t)) { toast(L2('Úloha sa nenašla – skús obnoviť aplikáciu.', 'Task not found – try reloading the app.')); return go('#/assigned'); }
  openTask(tasks[i], { tasks, backHash: '#/assigned', onNext: () => go(i + 1 < tasks.length ? `#/atask/${aid}/${i + 1}` : '#/assigned') });
};
