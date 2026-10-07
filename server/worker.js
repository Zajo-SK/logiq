/* LogiQ server – Cloudflare Worker + KV.
   Roles: admin (správca) · teacher (učiteľ) · student device (secret) · parent (read-only code).
   Student records contain only a nickname/first name, class label and progress numbers. */
const enc = new TextEncoder();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const rnd = (n, alpha) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(x => alpha[x % alpha.length]).join(''); };
const CODE_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TOKEN_ALPHA = 'abcdefghijklmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ0123456789';

async function pbkdf2(password, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 }, key, 256));
}
async function sha256(s) { return b64(await crypto.subtle.digest('SHA-256', enc.encode(s))); }
function safeEq(a, b) { a = String(a); b = String(b); let r = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) r |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return r === 0; }

function corsHeaders(req, env) {
  const origin = req.headers.get('Origin') || '', allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin);
  return { 'Access-Control-Allow-Origin': ok ? origin : (allowed[0] || ''), 'Access-Control-Allow-Headers': 'content-type, authorization', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS', 'Vary': 'Origin' };
}
const J = (obj, status, cors) => new Response(JSON.stringify(obj), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cors } });

async function rateLimit(env, key, max, ttl) {
  const k = 'rl:' + key, n = parseInt(await env.DB.get(k) || '0', 10);
  if (n >= max) return false;
  await env.DB.put(k, String(n + 1), { expirationTtl: ttl }); return true;
}
async function session(req, env) {
  const t = (req.headers.get('authorization') || '').replace(/^Bearer /, ''); if (!t) return null;
  return await env.DB.get('session:' + t, 'json');
}
const clean = (s, n) => String(s ?? '').replace(/[<>]/g, '').trim().slice(0, n);
const validLabel = s => /^[2-9]\.[A-Z]$/.test(s);
const id8 = () => rnd(10, CODE_ALPHA);

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env), url = new URL(req.url), p = url.pathname.replace(/\/+$/, ''), m = req.method;
    if (m === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const ip = req.headers.get('CF-Connecting-IP') || 'x';
    let body = {}; if (m === 'POST') { try { body = await req.json(); } catch (e) { return J({ error: 'Neplatné dáta' }, 400, cors); } }
    const q = (sql, ...a) => env.SQL.prepare(sql).bind(...a);
    const first = (sql, ...a) => q(sql, ...a).first(), all = async (sql, ...a) => (await q(sql, ...a).all()).results, run = (sql, ...a) => q(sql, ...a).run();
    try {
      if (p === '/api/health') return J({ ok: true, db: 'd1' }, 200, cors);

      /* ---- login ---- */
      if (p === '/api/login' && m === 'POST') {
        if (!await rateLimit(env, 'login:' + ip, 20, 600)) return J({ error: 'Príliš veľa pokusov, skús neskôr' }, 429, cors);
        const email = clean(body.email, 80).toLowerCase(), pw = String(body.password || ''); let role = null;
        if (email === 'admin') { if (env.ADMIN_PASSWORD && safeEq(pw, env.ADMIN_PASSWORD)) role = 'admin'; }
        else { const t = await first('SELECT salt, hash FROM teachers WHERE email=?', email); if (t && safeEq(await pbkdf2(pw, t.salt), t.hash)) role = 'teacher'; }
        if (!role) return J({ error: 'Nesprávne meno alebo heslo' }, 401, cors);
        const token = rnd(40, TOKEN_ALPHA); await env.DB.put('session:' + token, JSON.stringify({ email, role }), { expirationTtl: 43200 });
        return J({ token, role, email }, 200, cors);
      }

      /* ---- student device ---- */
      const myAssignments = async (code, id) => (await all('SELECT a.id, a.title, a.note, a.due, a.created, a.items FROM assignments a WHERE EXISTS (SELECT 1 FROM targets t WHERE t.aid = a.id AND t.code = ? AND (t.student = \'\' OR t.student = ?)) ORDER BY a.created DESC LIMIT 60', code, id))
        .map(a => ({ id: a.id, title: a.title, note: a.note, due: a.due, created: a.created, items: JSON.parse(a.items || '[]') }));
      if (p === '/api/join' && m === 'POST') {
        if (!await rateLimit(env, 'join:' + ip, 40, 3600)) return J({ error: 'Príliš veľa pokusov' }, 429, cors);
        const code = clean(body.code, 10).toUpperCase(), cls = await first('SELECT label FROM classes WHERE code=?', code);
        if (!cls) return J({ error: 'Kód triedy neexistuje' }, 404, cors);
        const id = rnd(8, CODE_ALPHA), secret = rnd(28, TOKEN_ALPHA), parentCode = rnd(8, CODE_ALPHA), now = Date.now();
        await run('INSERT INTO students (id, code, nick, grade, secret_hash, parent_code, created, updated, data) VALUES (?,?,?,?,?,?,?,?,NULL)', id, code, clean(body.nick, 30) || 'Žiak', +body.grade || 0, await sha256(secret), parentCode, now, now);
        return J({ studentId: id, secret, parentCode, classLabel: cls.label, classCode: code, assignments: await myAssignments(code, id) }, 200, cors);
      }
      if (p === '/api/sync' && m === 'POST') {
        const code = clean(body.classCode, 10).toUpperCase(), id = clean(body.studentId, 12), rec = await first('SELECT secret_hash, nick, grade FROM students WHERE id=? AND code=?', id, code);
        if (!rec || !safeEq(await sha256(String(body.secret || '')), rec.secret_hash)) return J({ error: 'Neplatný prístup' }, 403, cors);
        const raw = JSON.stringify(body.data || {}); if (raw.length > 30000) return J({ error: 'Príliš veľké dáta' }, 413, cors);
        await run('UPDATE students SET data=?, nick=?, grade=?, updated=? WHERE id=?', raw, clean(body.data?.nick, 30) || rec.nick, +body.data?.grade || rec.grade, Date.now(), id);
        return J({ ok: true, assignments: await myAssignments(code, id) }, 200, cors);
      }

      /* ---- parent (read only) ---- */
      const pm = p.match(/^\/api\/parent\/([A-Za-z0-9]+)$/);
      if (pm && m === 'GET') {
        if (!await rateLimit(env, 'parent:' + ip, 60, 600)) return J({ error: 'Príliš veľa pokusov' }, 429, cors);
        const r = await first('SELECT s.*, c.label FROM students s JOIN classes c ON c.code = s.code WHERE s.parent_code = ?', pm[1].toUpperCase());
        if (!r) return J({ error: 'Kód neexistuje' }, 404, cors);
        return J({ student: pub(r), classLabel: r.label }, 200, cors);
      }

      /* ---- support tickets: anyone can submit ---- */
      if (p === '/api/tickets' && m === 'POST') {
        if (!await rateLimit(env, 'ticket:' + ip, 6, 3600)) return J({ error: 'Príliš veľa správ, skús neskôr' }, 429, cors);
        if (body.website) return J({ ok: true }, 200, cors);
        const message = clean(body.message, 1500); if (message.length < 5) return J({ error: 'Opíš problém aspoň niekoľkými slovami' }, 400, cors);
        const kind = ['bug', 'idea', 'question'].includes(body.kind) ? body.kind : 'bug', id = id8(), now = Date.now();
        await run('INSERT INTO tickets (id, created, updated, name, kind, message, page, task, version, ua, grade, cls, contact, status, note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', id, now, now, clean(body.name, 40) || 'Anonym', kind, message, clean(body.page, 120), clean(body.task, 160), clean(body.version, 12), clean(body.ua, 160), +body.grade || 0, clean(body.cls, 6), clean(body.contact, 80), 'new', '');
        return J({ ok: true, id }, 200, cors);
      }

      /* ---- teacher / admin ---- */
      const s = await session(req, env); if (!s) return J({ error: 'Nie si prihlásený' }, 401, cors);
      const isAdmin = s.role === 'admin';
      const ownClass = async code => { const c = await first('SELECT * FROM classes WHERE code=?', code); return c && (isAdmin || c.owner === s.email) ? c : null; };

      /* ---- support inbox (admin only) ---- */
      if (p.startsWith('/api/tickets')) {
        if (!isAdmin) return J({ error: 'Len správca' }, 403, cors);
        if (p === '/api/tickets' && m === 'GET') {
          const st = url.searchParams.get('status'), rows = await all('SELECT * FROM tickets' + (st && st !== 'all' ? ' WHERE status = ?' : '') + ' ORDER BY created DESC LIMIT 300', ...(st && st !== 'all' ? [st] : []));
          const sum = await all('SELECT status, COUNT(*) n FROM tickets GROUP BY status');
          return J({ tickets: rows, summary: Object.fromEntries(sum.map(x => [x.status, x.n])) }, 200, cors);
        }
        const tk = p.match(/^\/api\/tickets\/([A-Z0-9]+)$/i);
        if (tk && m === 'POST') {
          const st = ['new', 'progress', 'done'].includes(body.status) ? body.status : null, note = body.note != null ? clean(body.note, 1000) : null;
          await run('UPDATE tickets SET status = COALESCE(?, status), note = COALESCE(?, note), updated = ? WHERE id = ?', st, note, Date.now(), tk[1].toUpperCase()); return J({ ok: true }, 200, cors);
        }
        if (tk && m === 'DELETE') { await run('DELETE FROM tickets WHERE id = ?', tk[1].toUpperCase()); return J({ ok: true }, 200, cors); }
      }

      if (p === '/api/teachers') {
        if (!isAdmin) return J({ error: 'Len správca' }, 403, cors);
        if (m === 'GET') return J({ teachers: await all('SELECT email, created FROM teachers ORDER BY email') }, 200, cors);
        if (m === 'POST') {
          const email = clean(body.email, 80).toLowerCase(), pw = String(body.password || '');
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || pw.length < 8) return J({ error: 'Zadaj platný e-mail a heslo (min. 8 znakov)' }, 400, cors);
          if (await first('SELECT 1 x FROM teachers WHERE email=?', email)) return J({ error: 'Účet už existuje' }, 409, cors);
          const salt = rnd(16, TOKEN_ALPHA); await run('INSERT INTO teachers (email, salt, hash, created) VALUES (?,?,?,?)', email, salt, await pbkdf2(pw, salt), Date.now());
          return J({ ok: true }, 200, cors);
        }
      }
      const tm = p.match(/^\/api\/teachers\/(.+)$/);
      if (tm && m === 'DELETE') { if (!isAdmin) return J({ error: 'Len správca' }, 403, cors); await run('DELETE FROM teachers WHERE email=?', decodeURIComponent(tm[1]).toLowerCase()); return J({ ok: true }, 200, cors); }

      if (p === '/api/classes') {
        if (m === 'GET') {
          const rows = await all('SELECT c.code, c.label, c.owner, c.created, (SELECT COUNT(*) FROM students x WHERE x.code = c.code) AS count FROM classes c' + (isAdmin ? '' : ' WHERE c.owner = ?') + ' ORDER BY c.label', ...(isAdmin ? [] : [s.email]));
          return J({ classes: rows }, 200, cors);
        }
        if (m === 'POST') {
          const label = clean(body.label, 4).toUpperCase(); if (!validLabel(label)) return J({ error: 'Neplatná trieda' }, 400, cors);
          if (await first('SELECT 1 x FROM classes WHERE owner=? AND label=?', s.email, label)) return J({ error: `Triedu ${label} už máš vytvorenú` }, 409, cors);
          const code = rnd(6, CODE_ALPHA); await run('INSERT INTO classes (code, label, owner, created) VALUES (?,?,?,?)', code, label, s.email, Date.now());
          return J({ code, label }, 200, cors);
        }
      }
      const cm = p.match(/^\/api\/classes\/([A-Z0-9]+)(\/students)?$/i);
      if (cm) {
        const code = cm[1].toUpperCase(), c = await ownClass(code); if (!c) return J({ error: 'Trieda nenájdená' }, 404, cors);
        if (cm[2] && m === 'GET') return J({ label: c.label, students: (await all('SELECT * FROM students WHERE code=?', code)).map(pub) }, 200, cors);
        if (!cm[2] && m === 'DELETE') { await run('DELETE FROM students WHERE code=?', code); await run('DELETE FROM targets WHERE code=?', code); await run('DELETE FROM classes WHERE code=?', code); return J({ ok: true }, 200, cors); }
      }
      const sm = p.match(/^\/api\/students\/([A-Z0-9]+)\/([A-Z0-9]+)$/i);
      if (sm && m === 'DELETE') { const code = sm[1].toUpperCase(); if (!await ownClass(code)) return J({ error: 'Nenájdené' }, 404, cors); await run('DELETE FROM students WHERE id=? AND code=?', sm[2].toUpperCase(), code); await run('DELETE FROM targets WHERE student=?', sm[2].toUpperCase()); return J({ ok: true }, 200, cors); }

      /* ---- assignments ---- */
      const targetsOf = async aid => {
        const t = await all('SELECT code, student FROM targets WHERE aid=?', aid), out = [];
        for (const x of t) {
          if (x.student) { const r = await first('SELECT s.*, c.label FROM students s JOIN classes c ON c.code = s.code WHERE s.id=?', x.student); if (r) out.push(r); }
          else for (const r of await all('SELECT s.*, c.label FROM students s JOIN classes c ON c.code = s.code WHERE s.code=?', x.code)) out.push(r);
        }
        const seen = new Set(); return out.filter(r => !seen.has(r.id) && seen.add(r.id));
      };
      const progress = (r, aid) => { try { return (JSON.parse(r.data || '{}').asg || {})[aid] || null; } catch (e) { return null; } };
      if (p === '/api/assignments') {
        if (m === 'GET') {
          const rows = await all('SELECT * FROM assignments' + (isAdmin ? '' : ' WHERE owner = ?') + ' ORDER BY created DESC LIMIT 100', ...(isAdmin ? [] : [s.email])), out = [];
          for (const a of rows) {
            const items = JSON.parse(a.items || '[]'), st = await targetsOf(a.id), tg = await all('SELECT t.code, t.student, c.label FROM targets t LEFT JOIN classes c ON c.code = t.code WHERE t.aid = ?', a.id);
            const done = st.filter(r => (progress(r, a.id) || {}).d >= items.length).length;
            out.push({ id: a.id, title: a.title, note: a.note, due: a.due, created: a.created, owner: a.owner, nItems: items.length, nStudents: st.length, nDone: done, targets: tg.map(x => x.student ? { student: true } : { label: x.label }) });
          }
          return J({ assignments: out }, 200, cors);
        }
        if (m === 'POST') {
          const title = clean(body.title, 80), note = clean(body.note, 400), due = +body.due || null, items = Array.isArray(body.items) ? body.items.slice(0, 80) : [];
          if (!title) return J({ error: 'Zadaj názov zadania' }, 400, cors);
          const okItems = items.filter(i => i && ((typeof i.st === 'string' && /^[\w-]{1,40}$/.test(i.st)) || (typeof i.lv === 'string' && /^L[2-9]-[a-z]{2,8}-[1-7]$/.test(i.lv) && Number.isInteger(i.i) && i.i >= 0 && i.i < 10))).map(i => i.st ? { st: i.st } : { lv: i.lv, i: i.i });
          if (!okItems.length) return J({ error: 'Vyber aspoň jednu úlohu' }, 400, cors);
          const classes = [...new Set((body.classes || []).map(c => clean(c, 10).toUpperCase()))], studs = Array.isArray(body.students) ? body.students.slice(0, 500) : [], tg = [];
          for (const code of classes) { if (!await ownClass(code)) return J({ error: 'Neplatná trieda' }, 400, cors); tg.push([code, '']); }
          for (const x of studs) { const code = clean(x && x.code, 10).toUpperCase(), id = clean(x && x.id, 12).toUpperCase(); if (!await ownClass(code) || !await first('SELECT 1 x FROM students WHERE id=? AND code=?', id, code)) return J({ error: 'Neplatný žiak' }, 400, cors); if (!classes.includes(code)) tg.push([code, id]); }
          if (!tg.length) return J({ error: 'Vyber triedu alebo žiakov' }, 400, cors);
          const id = id8(); await run('INSERT INTO assignments (id, owner, title, note, due, created, items) VALUES (?,?,?,?,?,?,?)', id, s.email, title, note, due, Date.now(), JSON.stringify(okItems));
          for (const [code, st] of tg) await run('INSERT INTO targets (aid, code, student) VALUES (?,?,?)', id, code, st);
          return J({ id }, 200, cors);
        }
      }
      const am = p.match(/^\/api\/assignments\/([A-Z0-9]+)$/i);
      if (am) {
        const a = await first('SELECT * FROM assignments WHERE id=?', am[1].toUpperCase());
        if (!a || (!isAdmin && a.owner !== s.email)) return J({ error: 'Zadanie nenájdené' }, 404, cors);
        if (m === 'DELETE') { await run('DELETE FROM targets WHERE aid=?', a.id); await run('DELETE FROM assignments WHERE id=?', a.id); return J({ ok: true }, 200, cors); }
        if (m === 'GET') { const items = JSON.parse(a.items || '[]'), st = await targetsOf(a.id); return J({ assignment: { id: a.id, title: a.title, note: a.note, due: a.due, created: a.created, items }, rows: st.map(r => ({ id: r.id, nick: r.nick, label: r.label, updated: r.updated, p: progress(r, a.id) })) }, 200, cors); }
      }
      return J({ error: 'Nenájdené' }, 404, cors);
    } catch (e) { return J({ error: 'Chyba servera' }, 500, cors); }
  }
};
const pub = r => ({ id: r.id, classCode: r.code, nick: r.nick, grade: r.grade, parentCode: r.parent_code, created: r.created, updated: r.updated, data: r.data ? JSON.parse(r.data) : null });
