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

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env), url = new URL(req.url), p = url.pathname.replace(/\/+$/, ''), m = req.method;
    if (m === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const ip = req.headers.get('CF-Connecting-IP') || 'x';
    let body = {}; if (m === 'POST') { try { body = await req.json(); } catch (e) { return J({ error: 'Neplatné dáta' }, 400, cors); } }
    try {
      if (p === '/api/health') return J({ ok: true }, 200, cors);

      /* ---- login ---- */
      if (p === '/api/login' && m === 'POST') {
        if (!await rateLimit(env, 'login:' + ip, 20, 600)) return J({ error: 'Príliš veľa pokusov, skús neskôr' }, 429, cors);
        const email = clean(body.email, 80).toLowerCase(), pw = String(body.password || ''); let role = null;
        if (email === 'admin') { if (env.ADMIN_PASSWORD && safeEq(pw, env.ADMIN_PASSWORD)) role = 'admin'; }
        else { const t = await env.DB.get('teacher:' + email, 'json'); if (t && safeEq(await pbkdf2(pw, t.salt), t.hash)) role = 'teacher'; }
        if (!role) return J({ error: 'Nesprávne meno alebo heslo' }, 401, cors);
        const token = rnd(40, TOKEN_ALPHA); await env.DB.put('session:' + token, JSON.stringify({ email, role }), { expirationTtl: 43200 });
        return J({ token, role, email }, 200, cors);
      }

      /* ---- student device ---- */
      if (p === '/api/join' && m === 'POST') {
        if (!await rateLimit(env, 'join:' + ip, 40, 3600)) return J({ error: 'Príliš veľa pokusov' }, 429, cors);
        const code = clean(body.code, 10).toUpperCase(), cls = await env.DB.get('class:' + code, 'json');
        if (!cls) return J({ error: 'Kód triedy neexistuje' }, 404, cors);
        const id = rnd(8, CODE_ALPHA), secret = rnd(28, TOKEN_ALPHA), parentCode = rnd(8, CODE_ALPHA);
        const rec = { id, code, nick: clean(body.nick, 30) || 'Žiak', grade: +body.grade || 0, secretHash: await sha256(secret), parentCode, created: Date.now(), updated: Date.now(), data: null };
        await env.DB.put(`student:${code}:${id}`, JSON.stringify(rec)); await env.DB.put('parent:' + parentCode, `${code}:${id}`);
        return J({ studentId: id, secret, parentCode, classLabel: cls.label, classCode: code }, 200, cors);
      }
      if (p === '/api/sync' && m === 'POST') {
        const code = clean(body.classCode, 10).toUpperCase(), id = clean(body.studentId, 12), key = `student:${code}:${id}`, rec = await env.DB.get(key, 'json');
        if (!rec || !safeEq(await sha256(String(body.secret || '')), rec.secretHash)) return J({ error: 'Neplatný prístup' }, 403, cors);
        const raw = JSON.stringify(body.data || {}); if (raw.length > 30000) return J({ error: 'Príliš veľké dáta' }, 413, cors);
        rec.data = body.data; rec.nick = clean(body.data?.nick, 30) || rec.nick; rec.grade = +body.data?.grade || rec.grade; rec.updated = Date.now();
        await env.DB.put(key, JSON.stringify(rec)); return J({ ok: true }, 200, cors);
      }

      /* ---- parent (read only) ---- */
      const pm = p.match(/^\/api\/parent\/([A-Za-z0-9]+)$/);
      if (pm && m === 'GET') {
        if (!await rateLimit(env, 'parent:' + ip, 60, 600)) return J({ error: 'Príliš veľa pokusov' }, 429, cors);
        const ref = await env.DB.get('parent:' + pm[1].toUpperCase()); if (!ref) return J({ error: 'Kód neexistuje' }, 404, cors);
        const rec = await env.DB.get('student:' + ref, 'json'); if (!rec) return J({ error: 'Kód neexistuje' }, 404, cors);
        const cls = await env.DB.get('class:' + rec.code, 'json');
        return J({ student: pub(rec), classLabel: cls?.label }, 200, cors);
      }

      /* ---- teacher / admin ---- */
      const s = await session(req, env); if (!s) return J({ error: 'Nie si prihlásený' }, 401, cors);
      const isAdmin = s.role === 'admin';

      if (p === '/api/teachers') {
        if (!isAdmin) return J({ error: 'Len správca' }, 403, cors);
        if (m === 'GET') { const l = await env.DB.list({ prefix: 'teacher:' }); const out = []; for (const k of l.keys) { const t = await env.DB.get(k.name, 'json'); out.push({ email: k.name.slice(8), created: t.created }); } return J({ teachers: out }, 200, cors); }
        if (m === 'POST') {
          const email = clean(body.email, 80).toLowerCase(), pw = String(body.password || '');
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || pw.length < 8) return J({ error: 'Zadaj platný e-mail a heslo (min. 8 znakov)' }, 400, cors);
          if (await env.DB.get('teacher:' + email)) return J({ error: 'Účet už existuje' }, 409, cors);
          const salt = rnd(16, TOKEN_ALPHA); await env.DB.put('teacher:' + email, JSON.stringify({ salt, hash: await pbkdf2(pw, salt), created: Date.now() }));
          return J({ ok: true }, 200, cors);
        }
      }
      const tm = p.match(/^\/api\/teachers\/(.+)$/);
      if (tm && m === 'DELETE') { if (!isAdmin) return J({ error: 'Len správca' }, 403, cors); await env.DB.delete('teacher:' + decodeURIComponent(tm[1]).toLowerCase()); return J({ ok: true }, 200, cors); }

      if (p === '/api/classes') {
        if (m === 'GET') {
          const l = await env.DB.list({ prefix: 'class:' }); const out = [];
          for (const k of l.keys) { const c = await env.DB.get(k.name, 'json'); if (!isAdmin && c.owner !== s.email) continue; const st = await env.DB.list({ prefix: `student:${k.name.slice(6)}:` }); out.push({ code: k.name.slice(6), label: c.label, owner: c.owner, count: st.keys.length, created: c.created }); }
          return J({ classes: out.sort((a, b) => a.label.localeCompare(b.label)) }, 200, cors);
        }
        if (m === 'POST') {
          const label = clean(body.label, 4).toUpperCase(); if (!validLabel(label)) return J({ error: 'Neplatná trieda' }, 400, cors);
          const code = rnd(6, CODE_ALPHA); await env.DB.put('class:' + code, JSON.stringify({ label, owner: s.email, created: Date.now() }));
          return J({ code, label }, 200, cors);
        }
      }
      const cm = p.match(/^\/api\/classes\/([A-Z0-9]+)(\/students)?$/i);
      if (cm) {
        const code = cm[1].toUpperCase(), c = await env.DB.get('class:' + code, 'json');
        if (!c || (!isAdmin && c.owner !== s.email)) return J({ error: 'Trieda nenájdená' }, 404, cors);
        if (cm[2] && m === 'GET') { const l = await env.DB.list({ prefix: `student:${code}:` }); const out = []; for (const k of l.keys) out.push(pub(await env.DB.get(k.name, 'json'))); return J({ label: c.label, students: out }, 200, cors); }
        if (!cm[2] && m === 'DELETE') { const l = await env.DB.list({ prefix: `student:${code}:` }); for (const k of l.keys) { const r = await env.DB.get(k.name, 'json'); await env.DB.delete('parent:' + r.parentCode); await env.DB.delete(k.name); } await env.DB.delete('class:' + code); return J({ ok: true }, 200, cors); }
      }
      const sm = p.match(/^\/api\/students\/([A-Z0-9]+)\/([A-Z0-9]+)$/i);
      if (sm && m === 'DELETE') {
        const code = sm[1].toUpperCase(), c = await env.DB.get('class:' + code, 'json'); if (!c || (!isAdmin && c.owner !== s.email)) return J({ error: 'Nenájdené' }, 404, cors);
        const k = `student:${code}:${sm[2].toUpperCase()}`, r = await env.DB.get(k, 'json'); if (r) { await env.DB.delete('parent:' + r.parentCode); await env.DB.delete(k); } return J({ ok: true }, 200, cors);
      }
      return J({ error: 'Nenájdené' }, 404, cors);
    } catch (e) { return J({ error: 'Chyba servera' }, 500, cors); }
  }
};
const pub = r => ({ id: r.id, classCode: r.code, nick: r.nick, grade: r.grade, parentCode: r.parentCode, created: r.created, updated: r.updated, data: r.data });
