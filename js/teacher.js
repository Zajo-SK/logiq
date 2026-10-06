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
      levelsDone: seq.filter(e => levelInfo(e, g).complete).length, levelsTotal: seq.length, cats, history: s.history.slice(0, 15).map(x => ({ t: x.title, c: x.cat, s: x.stars, p: x.points, ts: x.ts })) };
  },
  schedule() { if (!Sync.connected() || !API.on()) return; clearTimeout(Sync.timer); Sync.timer = setTimeout(Sync.push, 2500); },
  async push() {
    const s = st().sync; if (!Sync.connected() || !API.on()) return;
    try { await API.call('/api/sync', 'POST', { classCode: s.classCode, studentId: s.studentId, secret: s.secret, data: Sync.payload() }); s.lastSynced = Date.now(); s.dirty = false; }
    catch (e) { s.dirty = true; if (e.status === 403) Sync.leave(true); }
    Store.save();
  },
  async join(code) {
    const r = await API.call('/api/join', 'POST', { code, nick: st().profile.name || 'Žiak', grade: grade() || 0, cls: st().profile.cls });
    Object.assign(st().sync, { studentId: r.studentId, secret: r.secret, classCode: r.classCode, classLabel: r.classLabel, parentCode: r.parentCode });
    if (r.classLabel) { st().profile.cls = r.classLabel; if (!grade()) st().profile.grade = parseInt(r.classLabel); }
    Store.save(); Sync.push(); return r;
  },
  leave(quiet) { Object.assign(st().sync, { studentId: null, secret: null, classCode: null, classLabel: null, parentCode: null }); Store.save(); if (!quiet) toast(L2('Odpojené od triedy.', 'Disconnected from the class.')); }
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
    h('div', { class: 'frow' }, chip('classes', L2('Triedy', 'Classes')), isAdmin ? chip('teachers', L2('Učitelia', 'Teachers')) : null)), body);
  const fail = e => { if (e.status === 401) { TS.set(null); render(); } else body.append(h('p', { class: 'errmsg' }, fmtErr(e))); };
  if (tTab === 'teachers' && isAdmin) teachersPane(body, sess, fail); else if (tOpen) classPane(body, sess, fail); else classesPane(body, sess, isAdmin, fail);
};

async function classesPane(body, sess, isAdmin, fail) {
  const sel = h('select', { class: 'textin', 'aria-label': L2('Trieda', 'Class') }, CLASS_LABELS.map(c => h('option', { value: c }, c))), list = h('div', { class: 'grid2' });
  body.append(card('', h('h2', null, L2('Nová trieda', 'New class')), h('div', { class: 'btnrow left' }, sel, btn(L2('Vytvoriť triedu', 'Create class'), 'primary', async () => { try { await API.call('/api/classes', 'POST', { label: sel.value }, sess.token); render(); } catch (e) { fail(e); } }))), list);
  try {
    const { classes } = await API.call('/api/classes', 'GET', null, sess.token);
    if (!classes.length) list.append(h('p', { class: 'muted' }, L2('Zatiaľ nemáš žiadnu triedu. Vytvor ju vyššie a kód daj žiakom.', 'You have no class yet. Create one above and give the code to students.')));
    classes.forEach(c => list.append(card('', h('h2', null, `${c.label} `, h('small', { class: 'muted' }, L2(`${c.count} žiakov`, `${c.count} students`))), isAdmin ? h('p', { class: 'muted' }, c.owner) : null,
      h('p', null, L2('Kód pre žiakov', 'Code for students') + ': ', h('b', { class: 'code' }, c.code)),
      h('div', { class: 'btnrow left' }, btn(L2('Otvoriť', 'Open'), 'primary small', () => { tOpen = c.code; render(); }),
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
      h('p', { class: 'muted' }, L2(`Kód pre žiakov: ${tOpen}`, `Code for students: ${tOpen}`)),
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
