# -*- coding: utf-8 -*-
"""Builds the LogiQ companion website into info/ (static pages, same visual style as the app). Run: python3 tools/build-site.py"""
import io, os, re
OUT = os.path.join(os.path.dirname(__file__), '..', 'info')
APP = '../'

HERO_SVG = '''<svg class="heroart" viewBox="0 0 340 230" aria-hidden="true"><defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8f74ff"/><stop offset="1" stop-color="#12b5c0"/></linearGradient><radialGradient id="hb" cx=".4" cy=".35"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#f6b81d"/></radialGradient></defs>
<g class="float2"><circle cx="262" cy="64" r="40" fill="url(#hg)"/><ellipse cx="262" cy="64" rx="66" ry="14" fill="none" stroke="#f6b81d" stroke-width="5" transform="rotate(-20 262 64)" opacity=".95"/><circle cx="250" cy="52" r="7" fill="#fff" opacity=".25"/></g>
<g class="float1"><path d="M118 40a52 52 0 0 0-30 94c6 5 10 12 10 20h40c0-8 4-15 10-20a52 52 0 0 0-30-94z" fill="url(#hb)"/><rect x="100" y="162" width="36" height="9" rx="4.5" fill="#fff"/><rect x="106" y="175" width="24" height="9" rx="4.5" fill="#fff" opacity=".85"/><path d="M104 96l14 14 14-14M118 110v28" stroke="#0f1f4b" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
<g fill="#fff" opacity=".9">''' + ''.join('<rect x="%d" y="%d" width="16" height="16" rx="4" opacity="%s"/>' % (196 + c * 24, 132 + r * 24, '.35' if (r + c) % 2 else '.9') for r in range(3) for c in range(3)) + '''</g>
<g stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85"><circle cx="48" cy="190" r="22"/><path d="M48 190l12-14M48 190l-10-12"/></g>
<g fill="#f6b81d"><circle class="tw" cx="20" cy="30" r="5"/><circle class="tw" cx="175" cy="20" r="4"/><circle class="tw" cx="310" cy="150" r="5"/><circle class="tw" cx="150" cy="205" r="3"/></g></svg>'''

NAV = [('index.html', 'Domov'), ('pre-nadanych.html', 'Pre nadaných'), ('svp.html', 'Súlad so ŠVP'), ('pre-ucitelov.html', 'Pre učiteľov'), ('pre-rodicov.html', 'Pre rodičov'), ('faq.html', 'Otázky a údaje')]

def page(fname, title, desc, body, hero=None):
    nav = ''.join('<a href="%s"%s>%s</a>' % (f, ' class="on" aria-current="page"' if f == fname else '', n) for f, n in NAV)
    html = '''<!doctype html>
<html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(t)s</title><meta name="description" content="%(d)s">
<meta property="og:title" content="%(t)s"><meta property="og:description" content="%(d)s"><meta property="og:type" content="website">
<meta name="theme-color" content="#0f1f4b"><link rel="icon" href="../icons/icon.svg" type="image/svg+xml"><link rel="stylesheet" href="site.css">
</head><body>
<a class="skip" href="#main">Preskočiť na obsah</a>
<header class="top"><div class="wrap bar"><a class="brand" href="index.html"><img src="../icons/icon-192.png" alt="" width="38" height="38"><span>Logi<i>Q</i><small>matematické výzvy</small></span></a>
<nav class="menu" aria-label="Hlavná navigácia">%(nav)s</nav><a class="btn gold" href="%(app)s">Otvoriť aplikáciu</a></div></header>
%(hero)s
<main id="main">%(body)s</main>
<footer class="foot"><div class="wrap"><div class="fcols"><div><b>LogiQ</b><p>Bezplatná aplikácia na rozvoj logického a matematického myslenia pre 2.–9. ročník.</p></div>
<div><b>Aplikácia</b><p><a href="%(app)s">Otvoriť LogiQ</a><br><a href="%(app)s#/privacy">Aké údaje spracúvame</a><br><a href="%(app)s#/rules">Pravidlá používania</a></p></div>
<div><b>Stránky</b><p>%(flinks)s</p></div></div>
<p class="fine">🚧 Aplikácia je vo vývoji. Ak nájdete chybu, napíšte nám cez ikonku 💬 v aplikácii. LogiQ nie je oficiálny produkt ministerstva školstva; súlad so ŠVP je orientačný.</p><p class="fine">© 2026 LogiQ. Všetky práva vyhradené.</p></div></footer>
</body></html>''' % {'t': title, 'd': desc, 'nav': nav, 'app': APP, 'hero': hero or '', 'body': body, 'flinks': '<br>'.join('<a href="%s">%s</a>' % (f, n) for f, n in NAV)}
    io.open(os.path.join(OUT, fname), 'w', encoding='utf-8').write(html)

def hero(h1, lead, cta=True, art=True, eyebrow=''):
    btns = '<div class="btnrow"><a class="btn gold big" href="%s">▶ Vyskúšať aplikáciu</a><a class="btn ghost big light" href="pre-ucitelov.html">Pre učiteľov</a></div>' % APP if cta else ''
    return '<section class="hero"><div class="wrap herogrid"><div><p class="eyebrow">%s</p><h1>%s</h1><p class="lead">%s</p>%s</div>%s</div></section>' % (eyebrow, h1, lead, btns, '<div class="heroart-wrap">%s</div>' % HERO_SVG if art else '')

def card(icon, title, text):
    return '<article class="card"><div class="ci" aria-hidden="true">%s</div><h3>%s</h3><p>%s</p></article>' % (icon, title, text)

# ---------------- index ----------------
worlds = [('🎮', 'Hry a stratégia', 'víťazné stratégie, hry proti počítaču'), ('🕵️', 'Pravda, lož a dedukcia', 'rytieri, luhári, tajné čísla'), ('🧠', 'Logické uvažovanie', 'poradia, priradenia, závery'), ('🎲', 'Kombinatorika', 'koľkými spôsobmi sa to dá'), ('🔢', 'Čísla a vzory', 'rady, magické štvorce, kryptogramy, pavučiny'), ('🧊', 'Priestor a tvary', 'kocky, mriežky, obsahy'), ('🧩', 'Hlavolamy', 'sudoku, bludiská, žabky, výstavisko'), ('♟️', 'Šach a Hanoj', 'ťahy figúrok, domino, Hanojské veže'), ('🏆', 'Matematická olympiáda', 'algebra, deliteľnosť, pravdepodobnosť')]
body = '''
<section class="wrap sec"><h2 class="sh">Pre koho je LogiQ</h2><div class="grid3">%s%s%s</div></section>
<section class="band"><div class="wrap sec"><h2 class="sh">Čo v aplikácii nájdete</h2><p class="center muted">9 svetov × 7 levelov × 10 úloh pre každý ročník. Viac ako 500 jedinečných úloh na ročník, ktoré postupne naberajú na náročnosti od 2. po 9. ročník.</p><div class="grid3 worlds">%s</div></div></section>
<section class="wrap sec"><h2 class="sh">Ako to funguje</h2><div class="grid3 steps">%s%s%s</div></section>
<section class="band alt"><div class="wrap sec split"><div><h2>Vymyslené pre myslenie, nie pre drilovanie</h2><ul class="tick"><li><b>Bez trestu za chybu.</b> Hviezdy ubúdajú len pri nápovedách a pri viacerých nesprávnych pokusoch.</li><li><b>Nápoveda vedie k riešeniu</b>, nie k odpovedi: najprv otázka, potom krok, až potom konkrétny ťah.</li><li><b>Po riešení vysvetlenie</b> – prečo to funguje a ako to vidí matematik.</li><li><b>Simulácie a obrázky</b> pre slabších čitateľov: žiak si hru najprv vyskúša rukami.</li><li><b>Odmeny, mapa, nálepky a denné misie</b> motivujú vydržať aj pri ťažších úlohách.</li></ul></div>
<div class="mock" aria-hidden="true"><div class="mmap"><span class="mn done">✓</span><span class="mn done">✓</span><span class="mn cur">3</span><span class="mn">🔒</span><span class="mn boss">🏆</span></div><p>Mapa levelov ako cesta, na ktorej sa žiak posúva ďalej.</p></div></div></section>
<section class="wrap sec"><div class="cta"><h2>Vyskúšajte LogiQ</h2><p>Bezplatne, bez reklám a bez registrácie. Stačí otvoriť odkaz v prehliadači alebo ho pridať na plochu.</p><div class="btnrow center"><a class="btn gold big" href="%s">▶ Otvoriť aplikáciu</a><a class="btn ghost big" href="pre-ucitelov.html">Ako začať v triede</a></div></div></section>
''' % (
    card('🌟', 'Žiaci s všeobecným intelektovým nadaním', 'Úlohy, ktoré ich skutočne vyzvú: strategické hry, dedukcia, kombinatorika a olympiádne témy. Žiak môže ísť vlastným tempom aj do vyššieho ročníka.'),
    card('🧠', 'Rozvoj matematického a logického myslenia', 'Pre každého zvedavého žiaka: systematické uvažovanie, hľadanie vzorov, dokazovanie a riešenie problémov.'),
    card('👩‍🏫', 'Učitelia a rodičia', 'Učiteľ zadáva úlohy triede alebo konkrétnym žiakom a vidí postup. Rodič sleduje svoje dieťa cez rodičovský kód.'),
    ''.join('<div class="card w"><div class="ci">%s</div><h3>%s</h3><p>%s</p></div>' % w for w in worlds),
    card('1️⃣', 'Žiak si vyberie ročník', 'Aplikácia ponúkne cestu levelov pre jeho ročník. Je dostupná po slovensky aj po anglicky.'),
    card('2️⃣', 'Rieši, hrá, skúša', 'Úlohy majú rôzne podoby: voľba, číslo, radenie, sudoku, bludisko, šach, Hanoj, hry proti počítaču.'),
    card('3️⃣', 'Učiteľ vidí postup', 'Po pripojení kódom triedy vidí učiteľ postup, môže zadávať úlohy a sledovať ich plnenie.'),
    APP)
page('index.html', 'LogiQ – trénuj mozog hrou | logické a matematické myslenie 2.–9. ročník', 'Bezplatná aplikácia na rozvoj logického a matematického myslenia pre 2.–9. ročník. Určená najmä pre žiakov so všeobecným intelektovým nadaním. Slovensky aj anglicky, bez reklám.',
     body, hero('Trénuj mozog hrou', 'Aplikácia na <b>rozvoj myslenia</b> pre žiakov so <b>všeobecným intelektovým nadaním</b> a pre všetkých, ktorí chcú rozvíjať <b>matematické a logické myslenie</b>. 2.–9. ročník, bezplatne, bez reklám.', eyebrow='Logika · stratégia · hlavolamy'))

# ---------------- pre nadanych ----------------
body = '''
<section class="wrap sec narrow"><h2>Nadaní žiaci potrebujú výzvu, nie viac toho istého</h2>
<p>Školský zákon (245/2008 Z. z., § 103) rozlišuje všeobecné a špecifické intelektové nadanie. Podľa materiálov CVTI SR ide o nadanie s vysoko nadpriemerne rozvinutými poznávacími schopnosťami, pri ktorom je podstatné nielen chápať informácie, ale aj <b>nachádzať nové súvislosti, vytvárať vzťahy a zákonitosti</b>. Podľa toho istého zdroja ide približne o 2–2,5 %% populácie.</p>
<p>Takýmto žiakom často nestačí precvičovať to isté. Potrebujú <b>hĺbku, tempo a otvorené problémy</b>, pri ktorých musia premýšľať, nie len počítať. Presne na to je LogiQ postavený.</p></section>
<section class="band"><div class="wrap sec"><h2 class="sh">Ako LogiQ rozvíja nadanie</h2><div class="grid3">%s%s%s%s%s%s</div></div></section>
<section class="wrap sec narrow"><h2>Využitie v škole</h2><ul class="tick"><li><b>Diferenciácia v bežnej triede.</b> Učiteľ zadá nadaným žiakom úlohy z vyššieho ročníka alebo z olympiádneho sveta, kým ostatní riešia základnú líniu.</li><li><b>Akcelerácia.</b> Žiak, ktorý prekonáva ročník rýchlejšie, pokračuje na ďalšie levely bez čakania.</li><li><b>Krúžok a tréning na súťaže.</b> Cvičné typy myslenia pre Pytagoriádu, Klokana, Olympiádu či iBobra (úlohy nie sú kopírované z týchto súťaží).</li><li><b>Domáca práca podľa záujmu.</b> Učiteľ zadá „výzvu týždňa“ a vidí, kto ju zvládol.</li><li><b>Doplnok k individuálnemu plánu.</b> Aplikácia je pomôcka, nie náhrada odbornej starostlivosti.</li></ul>
<div class="note"><b>Dôležité:</b> LogiQ <b>nediagnostikuje</b> nadanie. Diagnostiku vykonáva centrum poradenstva a prevencie so súhlasom zákonného zástupcu. Aplikácia však dáva učiteľovi a rodičovi pozorovanie: čo žiaka baví, kde postupuje rýchlo a kde potrebuje podporu.</div></section>
<section class="wrap sec"><div class="cta"><h2>Vyskúšajte s nadaným žiakom</h2><p>Stačí otvoriť aplikáciu. V sekcii Mapa nájdete „Výzvy pre odvážnych“ z vyšších ročníkov.</p><div class="btnrow center"><a class="btn gold big" href="%s">▶ Otvoriť aplikáciu</a></div></div></section>
''' % (
    card('🧗', 'Plynulá a vysoká náročnosť', 'Náročnosť rastie plynulo od 2. po 9. ročník. Každý ročník ponúka aj „Výzvy pre odvážnych“ z vyšších ročníkov.'),
    card('🔍', 'Otvorené problémy', 'Strategické hry, dedukcia, kombinatorika a olympiádne úlohy, kde nestačí poznať postup – treba ho objaviť.'),
    card('🔦', 'Nápoveda bez prezradenia', 'Postupné nápovedy vedú k objaveniu riešenia. Po vyriešení vysvetlenie ukáže elegantný spôsob.'),
    card('🕊️', 'Bez tlaku a trestov', 'Žiaci s perfekcionizmom nie sú trestaní za chyby. Nie je časový limit, je len hra a postup.'),
    card('🧩', 'Rôzne druhy myslenia', 'Algoritmické, kombinatorické, priestorové, deduktívne – nielen počítanie. Tým sa rozvíja šírka myslenia.'),
    card('🏅', 'Motivácia bez súťaženia o všetko', 'Nálepky, medaily a misie odmeňujú vytrvalosť a pokrok, nie len rýchlosť.'),
    APP)
page('pre-nadanych.html', 'LogiQ pre žiakov s intelektovým nadaním', 'Ako LogiQ rozvíja myslenie žiakov so všeobecným intelektovým nadaním: náročné úlohy, otvorené problémy, diferenciácia a akcelerácia.', body,
     hero('Pre žiakov s všeobecným intelektovým nadaním', 'Úlohy, pri ktorých sa nadaný žiak <b>naozaj zamyslí</b>. Stratégia, logika a olympiádne témy v hravej podobe.', cta=False, eyebrow='Rozvoj nadania'))

# ---------------- svp ----------------
body = '''
<section class="wrap sec narrow"><h2>Napojenie na Štátny vzdelávací program</h2>
<p>Štátny vzdelávací program pre základné vzdelávanie (platný od 1. 9. 2023) zaraďuje matematiku a informatiku do spoločnej vzdelávacej oblasti <b>Matematika a informatika</b>. Matematika sa člení na obsahové komponenty <i>Čísla a operácie s číslami</i>, <i>Závislosti, vzťahy a práca s údajmi</i> a <i>Geometria</i>. Prvý cyklus tvorí 1.–3. ročník, druhý 4.–5. ročník a tretí druhý stupeň. Sprievodcovia k oblasti zdôrazňujú aj <b>riešenie zložitejších problémov</b>, ktoré vyžadujú chápanie súvislostí a vzťahov.</p>
<div class="note"><b>Poznámka:</b> LogiQ nie je schválený ani certifikovaný ministerstvom školstva. Tabuľka ukazuje <b>orientačnú zhodu</b> tém s komponentmi ŠVP. Presné výkonové štandardy si učiteľ overí v aktuálnom znení ŠVP.</div></section>
<section class="band"><div class="wrap sec"><h2 class="sh">Ktoré svety podporujú ktorú časť ŠVP</h2><div class="tablewrap"><table><thead><tr><th>Svet v LogiQ</th><th>Orientačná zhoda so ŠVP (matematika a informatika)</th><th>Čo žiak rozvíja</th></tr></thead><tbody>
<tr><td>🔢 Čísla a vzory</td><td>Čísla a operácie s číslami</td><td>zákonitosti, rady, odhad, kryptogramy</td></tr>
<tr><td>🧊 Priestor a tvary</td><td>Geometria</td><td>priestorová predstavivosť, obsahy, stavby z kociek</td></tr>
<tr><td>🕵️ Pravda, lož a dedukcia · 🧠 Logické uvažovanie</td><td>Závislosti, vzťahy a práca s údajmi; riešenie problémov</td><td>logické závery, vylučovanie, dôkaz sporom</td></tr>
<tr><td>🎲 Kombinatorika</td><td>Závislosti, vzťahy a práca s údajmi</td><td>systematické vypisovanie, počítanie možností</td></tr>
<tr><td>🎮 Hry a stratégia · ♟️ Šach a Hanoj</td><td>Riešenie problémov; informatika (algoritmické myslenie)</td><td>plánovanie, spätné uvažovanie, rekurzia</td></tr>
<tr><td>🧩 Hlavolamy (sudoku, bludiská, svetlá, žabky)</td><td>Riešenie problémov; informatika (postupy a algoritmy)</td><td>vytrvalosť, skúšanie hypotéz, postupné kroky</td></tr>
<tr><td>🏆 Matematická olympiáda</td><td>Matematika – rozšírené učivo a riešenie problémov</td><td>algebra, deliteľnosť, pravdepodobnosť, čas</td></tr></tbody></table></div></div></section>
<section class="wrap sec"><h2 class="sh">Podľa cyklov</h2><div class="grid3">%s%s%s</div></section>
<section class="wrap sec narrow"><h2>Čo to znamená v praxi</h2><ul class="tick"><li>Učiteľ nájde v aplikácii <b>doplnok k matematike aj informatike</b>: aktivity na rozvoj riešenia problémov a algoritmického myslenia.</li><li>Úlohy sú <b>kompetenčné</b> – žiak musí objaviť postup a zdôvodniť, nielen vykonať naučený algoritmus.</li><li>Nápoveda a vysvetlenia podporujú <b>formatívne hodnotenie</b>: žiak vie, kde je a čo ďalej.</li><li>Prehľad pre učiteľa ukazuje silné a slabé oblasti žiakov.</li></ul>
<p class="fine">Zdroje: <a href="https://www.minedu.sk/statny-vzdelavaci-program-2023-konsolidovane-znenie-v-zneni-dodatku-c-5/">ŠVP pre základné vzdelávanie (minedu.sk)</a>, <a href="https://vzdelavanie21.sk/wp-content/uploads/2024/12/Matematika-a-informatika_matematika.pdf">Sprievodca: Matematika</a>, <a href="https://vzdelavanie21.sk/wp-content/uploads/2024/12/Matematika-a-informatika_predmet-informatika.pdf">Sprievodca: Informatika</a>.</p></section>
''' % (
    card('🌱', '1. cyklus (2.–3. ročník)', 'Obrázky, simulácie a minimum textu. Prvé hry so strategickým myslením, hádanky, jednoduché vzory a poradia. Vhodné aj pre slabších čitateľov.'),
    card('🧭', '2. cyklus (4.–5. ročník)', 'Systematické uvažovanie, kombinatorika, sudoku, hry s víťaznou stratégiou, prevozy cez rieku, šachové ťahy.'),
    card('🎓', '3. cyklus (6.–9. ročník)', 'Algebra, deliteľnosť, pravdepodobnosť, kombinatorika, pravda a lož, Hanojské veže, olympiádne typy úloh.'))
page('svp.html', 'LogiQ a Štátny vzdelávací program (ŠVP 2023)', 'Orientačné napojenie aplikácie LogiQ na Štátny vzdelávací program 2023: matematika a informatika, komponenty, cykly a riešenie problémov.', body,
     hero('Súlad so ŠVP', 'Ako sa témy v LogiQ viažu na vzdelávaciu oblasť <b>Matematika a informatika</b> v ŠVP 2023.', cta=False, eyebrow='Kurikulum'))

# ---------------- ucitelia ----------------
body = '''
<section class="wrap sec"><h2 class="sh">Čo dostanete ako učiteľ</h2><div class="grid3">%s%s%s%s%s%s</div></section>
<section class="band"><div class="wrap sec narrow"><h2>Ako začať za 10 minút</h2><ol class="steps2"><li><b>Získajte účet.</b> Učiteľské účty vytvára správca aplikácie (e-mail a heslo). Zatiaľ ich prideľujeme individuálne; napíšte nám cez ikonku 💬 v aplikácii.</li><li><b>Vytvorte triedu.</b> V Učiteľskom prostredí zvoľte ročník a písmeno (napr. 4.B). Dostanete kód triedy.</li><li><b>Zobrazte kód na projektore.</b> Tlačidlo „Kód na celú obrazovku“ ukáže obrovský kód. Žiaci ho zadajú v Profile → Pripojiť k učiteľovi.</li><li><b>Zadajte úlohy.</b> Vyberte úlohy z levelov alebo zo zbierky, zvoľte celú triedu alebo konkrétnych žiakov, nastavte termín.</li><li><b>Sledujte postup.</b> V prehľade vidíte, kto je hotový a kto nezačal. Výsledky si môžete exportovať do CSV.</li></ol></div></section>
<section class="wrap sec"><h2 class="sh">Nápady na využitie</h2><div class="grid3">%s%s%s%s</div></section>
<section class="band alt"><div class="wrap sec narrow"><h2>Nasadenie na zariadeniach</h2><ul class="tick"><li><b>iPad / Android bez inštalácie z obchodu.</b> Aplikácia beží v prehliadači a dá sa pridať na plochu.</li><li><b>Správa zariadení (napr. Jamf).</b> Cez konfiguračný profil typu <i>Web Clip</i> viete odkaz na aplikáciu poslať na všetky zariadenia naraz.</li><li><b>Sieť školy.</b> Povoľte adresu aplikácie a servera vo filtri webu. Po prvom načítaní funguje aj offline.</li><li><b>Údaje žiakov.</b> Ukladáme len prezývku, triedu a postup. Podrobnosti sú na stránke <a href="faq.html">Otázky a údaje</a>.</li></ul></div></section>
<section class="wrap sec"><div class="cta"><h2>Chcete LogiQ vyskúšať v triede?</h2><p>Napíšte nám cez ikonku 💬 v aplikácii. Radi vám pomôžeme s nastavením a vypočujeme vaše pripomienky. V pilotnej fáze je používanie bezplatné.</p><div class="btnrow center"><a class="btn gold big" href="%s">▶ Otvoriť aplikáciu</a></div></div></section>
''' % (
    card('🏫', 'Triedy a kód', 'Triedy 2.A až 9.F. Žiaci sa pripoja kódom, ktorý môžete ukázať na projektore na celú obrazovku.'),
    card('📌', 'Zadávanie úloh', 'Zadajte úlohy celej triede alebo konkrétnym žiakom, s termínom a poznámkou.'),
    card('📊', 'Prehľad postupu', 'Hviezdy, body, splnené úlohy, silné a slabé oblasti a posledná aktivita každého žiaka.'),
    card('🌟', 'Diferenciácia', 'Nadaným žiakom zadáte úlohy z vyššieho ročníka alebo z olympiádneho sveta.'),
    card('👨‍👩‍👧', 'Rodičovský prístup', 'Každý žiak má rodičovský kód len na čítanie, rodič vidí postup svojho dieťaťa.'),
    card('🛟', 'Podpora', 'Tlačidlo 💬 priamo v aplikácii: nahláste chybu alebo pošlite nápad.'),
    card('⏱️', '5-minútová rozcvička', 'Na začiatku hodiny žiaci riešia jednu úlohu z levelu. Rýchle aktivovanie myslenia.'),
    card('🎒', 'Domáca úloha s výberom', 'Zadáte 3–5 úloh, žiaci ich riešia vo vlastnom tempe a vy vidíte plnenie.'),
    card('🏆', 'Vlastná triedna liga', 'Podľa hviezd a splnených úloh v prehľade si viete zorganizovať súťaž tried alebo skupín.'),
    card('🎯', 'Príprava na súťaže', 'Tréning typov myslenia pred Pytagoriádou, Klokanom a Olympiádou.'),
    APP)
page('pre-ucitelov.html', 'LogiQ pre učiteľov – triedy, zadávanie úloh, prehľad postupu', 'Ako používať LogiQ v triede: vytvorenie triedy, kód na projektore, zadávanie úloh celej triede alebo žiakom, prehľad postupu a nasadenie na iPadoch.', body,
     hero('Pre učiteľov', 'Zadajte úlohy za minútu a <b>uvidíte, kto ich zvládol</b>. Aplikácia pre triedu, krúžok aj individuálnu prácu.', cta=False, eyebrow='V triede'))

# ---------------- rodicia ----------------
body = '''
<section class="wrap sec narrow"><h2>Ako môže LogiQ pomôcť doma</h2><ul class="tick"><li>Dieťa si <b>pridá aplikáciu na plochu</b> a hrá sa vlastným tempom.</li><li>Úlohy sú krátke, hravé a bez reklám. Dieťa nepotrebuje e-mail ani registráciu.</li><li>Ak je dieťa pripojené k učiteľovi, môže vám dať <b>rodičovský kód</b> (je v jeho Profile). Po jeho zadaní na stránke „Rodičovský prístup“ uvidíte postup len svojho dieťaťa.</li></ul></section>
<section class="band"><div class="wrap sec"><h2 class="sh">Ako dieťa podporiť</h2><div class="grid3">%s%s%s</div></div></section>
<section class="wrap sec narrow"><h2>Zvedavé a nadané deti</h2><p>Ak je vaše dieťa rýchle a hľadá väčšiu výzvu, v mape nájde „Výzvy pre odvážnych“ z vyšších ročníkov. LogiQ však <b>nediagnostikuje nadanie</b>. Ak si myslíte, že má vaše dieťa nadanie, obráťte sa na centrum poradenstva a prevencie alebo na školu.</p>
<div class="note"><b>Súkromie:</b> bez pripojenia k učiteľovi zostáva všetko len v zariadení. S pripojením sa odosiela prezývka, ročník, trieda a súhrn výsledkov. Viac na stránke <a href="faq.html">Otázky a údaje</a>.</div></section>
<section class="wrap sec"><div class="cta"><h2>Pridajte LogiQ na plochu</h2><div class="grid2 how"><div><h3>iPhone / iPad</h3><p>Otvorte aplikáciu v Safari → ikona zdieľania → <b>Pridať na plochu</b>.</p></div><div><h3>Android</h3><p>Otvorte aplikáciu v Chrome → menu ⋮ → <b>Pridať na plochu</b> / <b>Inštalovať aplikáciu</b>.</p></div></div><div class="btnrow center"><a class="btn gold big" href="%s">▶ Otvoriť aplikáciu</a><a class="btn ghost big" href="%s#/parent">Rodičovský prístup</a></div></div></section>
''' % (
    card('🤝', 'Nepovedzte odpoveď', 'Opýtajte sa: „Čo už vieš? Čo skúsiš ako prvé?“ Nápoveda v aplikácii funguje presne takto.'),
    card('🧘', 'Chyba je súčasť učenia', 'Za chyby nie sú tresty. Pochváľte snahu a postup, nie len výsledok.'),
    card('⏳', 'Krátko a pravidelne', 'Stačí 10–15 minút denne. Denná misia a séria dní pomáhajú vytvoriť návyk.'),
    APP, APP)
page('pre-rodicov.html', 'LogiQ pre rodičov', 'Ako môže LogiQ pomôcť doma: bezplatná aplikácia na logické a matematické myslenie, rodičovský kód a tipy ako dieťa podporiť.', body,
     hero('Pre rodičov', 'Hravý tréning myslenia pre vaše dieťa. <b>Bez reklám, bez registrácie.</b>', cta=False, eyebrow='Doma'))

# ---------------- faq ----------------
faq = [
    ('Je aplikácia bezplatná?', 'Áno. V súčasnej fáze je LogiQ pre žiakov, učiteľov a rodičov bezplatný a bez reklám.'),
    ('Pre aké ročníky je určená?', 'Pre 2.–9. ročník základnej školy. Každý ročník má vlastnú cestu levelov a môžete ju vyskúšať aj z vyššieho ročníka.'),
    ('Potrebujem internet?', 'Pri prvom otvorení áno. Potom funguje aj offline. Pripojenie je potrebné na spojenie s učiteľom a na zadané úlohy.'),
    ('Aké údaje aplikácia spracúva?', 'Bez pripojenia k učiteľovi len v zariadení. S pripojením sa na server odosiela prezývka alebo krstné meno, ročník, trieda, súhrn výsledkov a postup v zadaných úlohách. Neodosielame priezvisko, e-mail, adresu ani polohu. Podrobnosti sú v aplikácii v časti „Aké údaje spracúvame“.'),
    ('Používate reklamy alebo sledovanie?', 'Nie. Aplikácia neobsahuje reklamy, analytiku ani cookies tretích strán.'),
    ('Kto vidí údaje o žiakovi?', 'Učiteľ jeho triedy, správca aplikácie a rodič, ktorý má rodičovský kód (len na čítanie).'),
    ('Ako sa dajú údaje zmazať?', 'Učiteľ môže zmazať žiaka alebo celú triedu. Žiak alebo rodič môže o zmazanie požiadať učiteľa.'),
    ('Je LogiQ určená len pre nadaných žiakov?', 'Nie. Je primárne vytvorená na rozvoj myslenia žiakov so všeobecným intelektovým nadaním, no hodí sa pre každého, kto chce rozvíjať matematické a logické myslenie.'),
    ('Nahrádza aplikácia diagnostiku nadania?', 'Nie. Nadanie diagnostikuje centrum poradenstva a prevencie. LogiQ je pomôcka na rozvoj myslenia.'),
    ('Úlohy sú z oficiálnych súťaží?', 'Nie. Úlohy sú generované a vlastné; klasické hádanky sú voľne spracované vo vlastnom znení. Pripravujú na typy myslenia v súťažiach, ale nekopírujú ich.'),
    ('Sú tam prostredia Hejného metódy?', 'Áno, v aplikácii sú prostredia inšpirované Hejného metódou: <b>Pavučiny</b> (čísla a farebné šípky) a <b>Výstavisko</b> (prechod miestnosťami s dverami). Úlohy sú vlastné, generované aplikáciou; s tvorcami metódy (H-mat) nie sme spojení.'),
    ('Kde nahlásim chybu alebo nápad?', 'V aplikácii cez ikonku 💬 vľavo dole. Stačí napísať, čo sa stalo.'),
    ('Aplikácia je stále vo vývoji?', 'Áno. Môžu sa v nej objaviť chyby; opravujeme ich priebežne. Ak na nejakú narazíte, dajte nám vedieť.')]
body = '''
<section class="wrap sec narrow"><h2>Časté otázky</h2>%s</section>
<section class="band"><div class="wrap sec narrow"><h2>Údaje a pravidlá</h2><p>Úplné znenie zásad ochrany údajov a pravidiel používania je priamo v aplikácii:</p><div class="btnrow"><a class="btn ghost" href="%s#/privacy">🔒 Aké údaje spracúvame</a><a class="btn ghost" href="%s#/rules">📜 Pravidlá používania</a></div><p class="fine">Prevádzkovateľ: doplní škola (kontakt bude uvedený v aplikácii).</p></div></section>
<section class="wrap sec"><div class="cta"><h2>Nenašli ste odpoveď?</h2><p>Otvorte aplikáciu a napíšte nám cez ikonku 💬 vľavo dole.</p><div class="btnrow center"><a class="btn gold big" href="%s">▶ Otvoriť aplikáciu</a></div></div></section>
''' % (''.join('<details class="qa"><summary>%s</summary><p>%s</p></details>' % qa for qa in faq), APP, APP, APP)
page('faq.html', 'LogiQ – časté otázky, údaje a súkromie', 'Odpovede na časté otázky o aplikácii LogiQ: cena, údaje, súkromie, ročníky, nadanie a podpora.', body,
     hero('Otázky a údaje', 'Čo aplikácia spracúva, komu ukazuje údaje a ako ich zmazať.', cta=False, eyebrow='Súkromie a pravidlá'))
print('built', len(os.listdir(OUT)), 'files')
