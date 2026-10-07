'use strict';
/* LogiQ – app version + changelog (newest first). Add a new entry at the top for every release and bump APP_VERSION. */
const CHANGELOG = [
  { v: '1.17', at: '2026-10-07 11:30', items: [S('Učiteľ môže zadávať úlohy celým triedam aj konkrétnym žiakom (z levelov aj zo zbierky), s termínom a prehľadom plnenia.', 'Teachers can assign tasks to whole classes or individual pupils (from levels or the collection), with due dates and progress overview.'), S('Žiak vidí zadané úlohy na Domovskej stránke a v zozname Zadané úlohy.', 'Pupils see assigned tasks on Home and in the Assigned tasks list.'), S('Kód triedy sa dá zobraziť na celú obrazovku (na projektor).', 'The class code can be shown full screen (for a projector).'), S('Opravené vytváranie tried (nová databáza), väčšie ovládacie prvky.', 'Fixed class creation (new database), bigger controls.')] },
  { v: '1.16', at: '2026-10-07 10:00', items: [S('Aplikácia je napojená na server (učiteľské a rodičovské prostredie, synchronizácia žiakov).', 'App connected to the server (teacher and parent area, pupil sync).')] },
  { v: '1.15', at: '2026-10-07 09:30', items: [S('Zobrazenie verzie aplikácie a zoznam zmien (toto okno).', 'App version badge and changelog (this window).')] },
  { v: '1.14', at: '2026-10-07 09:05', items: [
    S('Nová mapa: kľukatá cesta levelov ako v Candy Crush, s hviezdičkami, avatarom a skokmi medzi svetmi.', 'New map: a winding level path like Candy Crush, with stars, your avatar and jumps between worlds.'),
    S('Odmeny: nálepky za levely, zlaté medaily za svety, album, truhlice po leveli, denné misie, bonusy za série, nové hodnosti, avatary, témy a odznaky.', 'Rewards: level stickers, gold world medals, album, level chests, daily missions, streak bonuses, new ranks, avatars, themes and badges.'),
    S('Úlohy sa menej opakujú (najmä šach); viac variantov domina.', 'Tasks repeat less (chess especially); more domino variants.')] },
  { v: '1.13', at: '2026-10-07 08:35', items: [S('Úloha o astronautoch: správne „tri roboty“.', 'Astronaut task: correct Slovak numerals.')] },
  { v: '1.12', at: '2026-10-07 08:30', items: [S('Automatické čítanie zadania je len voliteľné (Profil).', 'Automatic read-aloud is now opt-in only (Profile).'), S('Opravená slovenčina v úlohách o astronautoch a robotoch.', 'Fixed Slovak grammar in the astronaut and robot tasks.')] },
  { v: '1.11', at: '2026-10-06 16:08', items: [S('Menšie bludiská.', 'Smaller mazes.')] },
  { v: '1.10', at: '2026-10-06 16:05', items: [S('Desiatkový rámček s voľnými poličkami; ťažšie obrázkové úlohy pre 2.–3. ročník.', 'Ten frame with extra free cells; harder picture tasks for grades 2–3.')] },
  { v: '1.9', at: '2026-10-06 15:56', items: [S('Automatické obnovovanie nových verzií aplikácie.', 'New app versions load automatically.')] },
  { v: '1.8', at: '2026-10-06 15:53', items: [S('Žabky: žabka môže preskočiť ľubovoľnú jednu žabku, ak je za ňou voľné miesto.', 'Frogs: a frog may jump over any single frog if the pad behind it is free.')] },
  { v: '1.7', at: '2026-10-06 15:36', items: [S('Skáčuce žabky: úlohy, skúšobný panel a samostatná hra.', 'Leaping frogs: tasks, a try-it panel and a stand-alone game.')] },
  { v: '1.6', at: '2026-10-06 15:21', items: [S('Ďalšie simulácie: váhy, džbány, most, ponožky, podanie rúk, pravdepodobnosť, stovková tabuľka a iné.', 'More simulations: scale, jugs, bridge, socks, handshakes, probability, hundred chart and more.')] },
  { v: '1.5', at: '2026-10-06 15:14', items: [S('Pre malých žiakov: veľký výber triedy, čítanie nahlas, obrázkové úlohy, simulácie, kratšie zadania.', 'For young pupils: big class picker, read-aloud, picture tasks, simulations, shorter prompts.')] },
  { v: '1.4', at: '2026-10-06 13:29', items: [S('Sudoku: 6 odstupňovaných obtiažností s technikami a nápovedami.', 'Sudoku: 6 graded difficulty levels with technique hints.')] },
  { v: '1.3', at: '2026-10-06 13:16', items: [S('Samostatné sudoku 3×3, 4×4, 6×6 a 9×9 s poznámkami, nápovedami a časom.', 'Stand-alone sudoku 3×3, 4×4, 6×6 and 9×9 with notes, hints and timer.')] },
  { v: '1.2', at: '2026-10-06 12:58', items: [S('Výber triedy, učiteľské/rodičovské/správcovské prostredie, odmeny, šach a Hanojské veže.', 'Class selection, teacher/parent/admin area, rewards, chess and Tower of Hanoi.')] },
  { v: '1.0', at: '2026-10-06 12:47', items: [S('Prvá verzia LogiQ: úlohy pre 2.–9. ročník, mapa levelov, denná výzva, zbierka, úspechy.', 'First LogiQ release: tasks for grades 2–9, level map, daily challenge, collection, achievements.')] }
];
const APP_VERSION = CHANGELOG[0].v;
(function () {
  const fmt = at => { const [d, tm] = at.split(' '), [y, m, dd] = d.split('-'); return `${+dd}. ${+m}. ${y} ${tm}`; };
  const b = h('button', { type: 'button', class: 'verbadge', 'aria-label': 'Verzia / Version', onclick: () => {
    const sh = openSheet(h('div', { class: 'sheetin verlog' }, h('h2', null, 'LogiQ ' + APP_VERSION), h('p', { class: 'muted' }, L2('Posledná zmena: ', 'Last change: ') + fmt(CHANGELOG[0].at)),
      h('div', { class: 'verlist' }, CHANGELOG.map(e => h('section', null, h('h3', null, h('b', null, 'v' + e.v), h('small', null, ' · ' + fmt(e.at))), h('ul', null, e.items.map(i => h('li', null, tx(i))))))),
      h('div', { class: 'btnrow' }, btn(t('close'), 'primary', () => sh.close()))), { dismiss: true });
  } }, 'v' + APP_VERSION);
  document.body.append(b);
})();
