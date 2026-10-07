'use strict';
/* LogiQ – support: small “report a problem” button on every screen + form that posts to the server (admin handles it in the Support tab). */
(function () {
  const KINDS = [['bug', '🐞', S('Chyba v aplikácii', 'Bug in the app')], ['idea', '💡', S('Návrh / požiadavka', 'Idea / request')], ['question', '❓', S('Otázka', 'Question')]];
  function context() {
    const r = route(), onTask = ['play', 'atask', 'practice', 'train', 'dplay'].includes(r.name) && typeof curSession !== 'undefined' && curSession && curSession.task;
    const t = onTask ? curSession.task : null;
    return { page: '#/' + [r.name].concat(r.args || []).join('/'), task: t ? `${t.id} – ${tx(t.title)}` : '', version: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '', ua: (navigator.userAgent.match(/(iPad|iPhone|Android|Macintosh|Windows|Linux)[^;)]*/) || [''])[0].slice(0, 60) + ' ' + innerWidth + 'x' + innerHeight, grade: grade() || 0, cls: st().profile.cls || '' };
  }
  function open() {
    const ctx = context(); let kind = 'bug';
    const name = h('input', { class: 'textin', type: 'text', maxlength: 40, value: st().profile.name || '', placeholder: L2('Tvoje meno (nepovinné)', 'Your name (optional)'), 'aria-label': L2('Meno', 'Name') });
    const msg = h('textarea', { class: 'textin', rows: 5, maxlength: 1500, placeholder: L2('Opíš, čo sa stalo alebo čo by si chcel/a zmeniť…', 'Describe what happened or what you would like to change…'), 'aria-label': L2('Správa', 'Message') });
    const hp = h('input', { type: 'text', name: 'website', tabindex: -1, autocomplete: 'off', style: 'position:absolute;left:-9999px', 'aria-hidden': 'true' });
    const err = h('p', { class: 'errmsg', role: 'alert' }), kinds = h('div', { class: 'frow' });
    const drawKinds = () => kinds.replaceChildren(...KINDS.map(([k, ic2, n]) => h('button', { type: 'button', class: 'fchip' + (kind === k ? ' on' : ''), 'aria-pressed': kind === k, onclick: () => { kind = k; drawKinds(); } }, ic2 + ' ' + tx(n))));
    drawKinds();
    const send = btn('📨 ' + L2('Odoslať', 'Send'), 'primary big', async () => {
      err.textContent = ''; if (msg.value.trim().length < 5) { err.textContent = L2('Opíš problém aspoň niekoľkými slovami.', 'Please describe it in a few words.'); return; }
      send.disabled = true;
      try { await API.call('/api/tickets', 'POST', Object.assign({ name: name.value, kind, message: msg.value, website: hp.value }, ctx)); sh.close(); toast(L2('Ďakujeme! Správa bola odoslaná.', 'Thank you! Your message was sent.')); }
      catch (e) { send.disabled = false; err.textContent = fmtErr(e); }
    });
    const sh = openSheet(h('div', { class: 'sheetin supform' }, h('h2', null, '💬 ' + L2('Kontaktovať podporu', 'Contact support')),
      API.on() ? [h('p', { class: 'muted' }, L2('Napíš nám, ak niečo nefunguje, nesedí odpoveď v úlohe alebo máš nápad.', 'Tell us if something does not work, an answer looks wrong, or you have an idea.')), kinds, name, h('div', { style: 'height:.5rem' }), msg, hp,
        h('p', { class: 'fine' }, L2('Automaticky priložíme stránku, názov úlohy a typ zariadenia, aby sme chybu vedeli nájsť. Nepíš sem heslá ani priezvisko.', 'We automatically attach the page, task title and device type so we can find the problem. Do not write passwords or a surname here.')), err,
        h('div', { class: 'btnrow' }, btn(L2('Zrušiť', 'Cancel'), 'ghost', () => sh.close()), send)]
      : [h('p', null, L2('Podpora potrebuje pripojenie k serveru, ktoré nie je nastavené. Napíš učiteľovi.', 'Support needs the server connection, which is not set up. Please tell your teacher.')), h('div', { class: 'btnrow' }, btn(t('close'), 'primary', () => sh.close()))]));
  }
  const b = h('button', { type: 'button', class: 'supbadge', 'aria-label': L2('Kontaktovať podporu / nahlásiť chybu', 'Contact support / report a problem'), title: L2('Nahlásiť chybu / podpora', 'Report a problem / support'), onclick: open }, '💬');
  document.body.append(b);
  window.openSupport = open;
})();
