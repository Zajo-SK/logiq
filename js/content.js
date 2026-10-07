'use strict';
/* LogiQ – content database.
   Task:   { id, cat, band, diff(1-3), pts, type, title{sk,en}, prompt{sk,en}, visual?, data, hints[S|'dyn'], explain[S], src{kind,note,license} }
   Level:  { id, name, tasks:[ taskId | {gen:'seq',off} ] }       World: { id, band, icon, color, name, desc, levels[] }
   Everything translatable is stored as {sk,en}. New tasks = push into TASKS; new worlds/levels = edit WORLDS. */

const BANDS = { A: { grades: [2], label: '2.' }, B: { grades: [3, 4], label: '3.–4.' }, C: { grades: [5, 6], label: '5.–6.' }, D: { grades: [7, 8, 9], label: '7.–9.' } };
const BAND_ORDER = ['A', 'B', 'C', 'D'];
const bandOf = g => g <= 2 ? 'A' : g <= 4 ? 'B' : g <= 6 ? 'C' : 'D';
const tierFor = g => ({ 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4, 9: 5 })[g] || 1;

const CATS = {
  logic: { icon: '🧠', n: S('Logika a dedukcia', 'Logic & deduction') },
  word: { icon: '📝', n: S('Slovné úlohy', 'Word problems') },
  combi: { icon: '🎲', n: S('Kombinatorika a stratégia', 'Combinatorics & strategy') },
  spatial: { icon: '🧊', n: S('Priestorová predstavivosť', 'Spatial thinking') },
  geom: { icon: '📐', n: S('Geometrické hlavolamy', 'Geometry puzzles') },
  seq: { icon: '🔢', n: S('Číselné rady a vzory', 'Number patterns') },
  sudoku: { icon: '🔲', n: S('Sudoku', 'Sudoku') },
  grid: { icon: '🗂️', n: S('Logické mriežky', 'Logic grids') },
  maze: { icon: '🧭', n: S('Bludiská a cesty', 'Mazes & routes') },
  ferry: { icon: '⛵', n: S('Prevozy cez rieku', 'River crossings') },
  weights: { icon: '⚖️', n: S('Váhy a mince', 'Scales & coins') },
  truth: { icon: '🕵️', n: S('Pravda a lož', 'Truth & lies') },
  crypto: { icon: '🔐', n: S('Kryptogramy a šifry', 'Ciphers & cryptograms') },
  data: { icon: '📊', n: S('Grafy a údaje', 'Charts & data') },
  olymp: { icon: '🏆', n: S('Olympiádne úlohy', 'Olympiad problems') },
  toggle: { icon: '💡', n: S('Prepínanie stavov', 'Switch puzzles') },
  prob: { icon: '🎯', n: S('Pravdepodobnosť', 'Probability') },
  algebra: { icon: '🧮', n: S('Algebraické hádanky', 'Algebra riddles') },
  strategy: { icon: '🎮', n: S('Stratégia a hry', 'Strategy & games') },
  chess: { icon: '♟️', n: S('Šach a figúrky', 'Chess & pieces') },
  hanoi: { icon: '🗼', n: S('Hanojské veže', 'Tower of Hanoi') }
};

const ORIG = { kind: 'original', note: S('Pôvodné zadanie autora aplikácie.', 'Original task written for this app.'), license: 'CC BY 4.0' };
const CLASSIC = { kind: 'folk', note: S('Voľne spracovaná klasická hádanka (voľné dielo / ľudová tradícia), vlastné znenie.', 'Freely reworded classic puzzle (public domain / folklore), own wording.'), license: 'Public domain idea / CC BY 4.0 text' };
const OLY = { kind: 'inspired', note: S('Inšpirované typom úloh z matematických súťaží; vlastné číselné zadanie a text.', 'Inspired by a type of competition problem; own numbers and wording.'), license: 'CC BY 4.0' };
const GEN = { kind: 'generated', note: S('Generované programom podľa vzoru (seed), bez cudzieho obsahu.', 'Program-generated from a pattern (seeded), no third-party content.'), license: 'CC0' };

/* ------------ visuals ------------ */
const vEmo = (arr) => `<div class="emorow" aria-hidden="false">${arr.map(x => `<span>${x}</span>`).join('')}</div>`;
const vTable = (head, rows) => `<table class="vtab"><thead><tr>${head.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const vTowers = rows => `<table class="vtab towers" aria-label="plan"><tbody>${rows.map(r => `<tr>${r.map(x => `<td>${'🧱'.repeat(0)}<b>${x}</b></td>`).join('')}</tr>`).join('')}</tbody></table>`;
const vBars = (vals, labels) => {
  const max = Math.max(...vals), w = 56, H = 140, top = 26;
  return `<svg class="bars" viewBox="0 0 ${vals.length * w + 20} ${H + top + 30}" role="img" aria-label="${labels.map((l, i) => l + ' ' + vals[i]).join(', ')}">${vals.map((v, i) => { const bh = v / max * H, y = top + H - bh; return `<rect x="${i * w + 14}" y="${y}" width="38" height="${bh}" rx="8" fill="#6a4cf0"/><text x="${i * w + 33}" y="${y - 7}" text-anchor="middle" font-size="16" font-weight="700" fill="#14213d">${v}</text><text x="${i * w + 33}" y="${top + H + 22}" text-anchor="middle" font-size="14" fill="#56637f">${labels[i]}</text>`; }).join('')}</svg>`;
};

/* ------------ ferry configs ------------ */
const FERRY = {
  classic: {
    mode: 'farmer', cap: 1, rower: { e: '🧑‍🌾', n: S('Farmár', 'Farmer') },
    cast: [{ e: '🐺', n: S('Vlk', 'Wolf') }, { e: '🐐', n: S('Koza', 'Goat') }, { e: '🥬', n: S('Kapusta', 'Cabbage') }],
    conflicts: [[0, 1, S('Bez farmára by vlk zjedol kozu! Skúsme to inak.', 'Without the farmer the wolf would eat the goat! Let us try differently.')], [1, 2, S('Bez farmára by koza zjedla kapustu! Skúsme to inak.', 'Without the farmer the goat would eat the cabbage! Let us try differently.')]]
  },
  fox: {
    mode: 'farmer', cap: 1, rower: { e: '🚣', n: S('Veslár', 'Rower') },
    cast: [{ e: '🦊', n: S('Líška', 'Fox') }, { e: '🐔', n: S('Sliepka', 'Hen') }, { e: '🌽', n: S('Kukurica', 'Corn') }],
    conflicts: [[0, 1, S('Bez veslára by líška zjedla sliepku! Skúsme to inak.', 'Without the rower the fox would eat the hen! Let us try differently.')], [1, 2, S('Bez veslára by sliepka zobala kukuricu! Skúsme to inak.', 'Without the rower the hen would peck the corn! Let us try differently.')]]
  },
  mc22: {
    mode: 'mc', cap: 2,
    cast: [{ e: '🧑‍🚀', g: 'E', n: S('Astronaut', 'Astronaut') }, { e: '🧑‍🚀', g: 'E', n: S('Astronaut', 'Astronaut') }, { e: '🤖', g: 'R', n: S('Robot', 'Robot') }, { e: '🤖', g: 'R', n: S('Robot', 'Robot') }],
    msg: S('Na brehu by bolo viac robotov ako astronautov – to nie je bezpečné!', 'There would be more robots than astronauts on a bank – not safe!')
  },
  mc33: {
    mode: 'mc', cap: 2,
    cast: [0, 1, 2].map(() => ({ e: '🧑‍🚀', g: 'E', n: S('Astronaut', 'Astronaut') })).concat([0, 1, 2].map(() => ({ e: '🤖', g: 'R', n: S('Robot', 'Robot') }))),
    msg: S('Na brehu by bolo viac robotov ako astronautov – to nie je bezpečné!', 'There would be more robots than astronauts on a bank – not safe!')
  }
};

/* ------------ task registry ------------ */
const TASKS = {};
const add = o => { TASKS[o.id] = Object.assign({ pts: 10 * (o.diff || 1), src: ORIG, hints: [], explain: [] }, o); return TASKS[o.id]; };

/* ---- Band A · 2nd grade ---- */
add({ id: 'a1', cat: 'seq', band: 'A', diff: 1, type: 'choice', title: S('Farebný vzor', 'Colour pattern'), prompt: S('Akú farbu má mať ďalší kruh?', 'Which colour should the next circle be?'), visual: vEmo(['🔴', '🔵', '🔴', '🔵', '🔴', '❓']),
  data: { options: ['🔴', '🔵', '🟡'], correct: 1, cols: 3 },
  hints: [S('Všimni si, ako sa farby opakujú. Ktoré dve sa striedajú?', 'Notice how the colours repeat. Which two take turns?'), S('Opakuje sa dvojica: červená, modrá. Posledná bola červená.', 'The pair red–blue repeats. The last one was red.')],
  explain: [S('Pozrime sa na vzor: 🔴 🔵 🔴 🔵 🔴 – farby sa striedajú.', 'Look at the pattern: 🔴 🔵 🔴 🔵 🔴 – the colours take turns.'), S('Po každej červenej prišla modrá, preto ďalší kruh bude modrý.', 'Every red was followed by a blue, so the next circle is blue.')] });
add({ id: 'a2', cat: 'logic', band: 'A', diff: 2, type: 'number', title: S('Ponožky v tme', 'Socks in the dark'),
  prompt: S('V zásuvke je 4 červených a 4 modrých ponožiek. Je tma a farby nevidíš. Koľko ponožiek musíš aspoň vytiahnuť, aby si mal určite dve rovnakej farby?', 'A drawer holds 4 red and 4 blue socks. It is dark, so you cannot see colours. What is the fewest socks you must pull out to be sure you have two of the same colour?'),
  data: { answer: 3 }, src: CLASSIC,
  hints: [S('Skús najhoršiu možnosť: čo ak máš stále smolu?', 'Try the worst case: what if you are unlucky every time?'), S('Po dvoch ponožkách môžu mať rôzne farby. Čo sa stane s treťou?', 'Two socks can be different colours. What happens with the third one?')],
  explain: [S('Predstav si smolu: prvá ponožka je červená a druhá modrá.', 'Imagine bad luck: the first sock is red and the second is blue.'), S('Tretia ponožka je červená alebo modrá – a vždy sa hodí do páru k jednej z prvých dvoch.', 'The third sock is red or blue – and it always pairs with one of the first two.'), S('Stačia teda 3 ponožky. Matematici tomu hovoria Dirichletov princíp.', 'So 3 socks are enough. Mathematicians call this the pigeonhole principle.')] });
add({ id: 'a3', cat: 'word', band: 'A', diff: 1, type: 'number', title: S('Rad na zmrzlinu', 'Ice-cream queue'),
  prompt: S('V rade na zmrzlinu stojí Adam. Pred ním je 5 detí a za ním 4 deti. Koľko detí je v rade spolu?', 'Adam waits in an ice-cream queue. There are 5 children in front of him and 4 behind him. How many children are in the queue?'),
  data: { answer: 10, unit: S('detí', 'children') },
  hints: [S('Počítaš aj Adama?', 'Are you counting Adam too?'), S('Spočítaj tých pred ním, Adama a tých za ním.', 'Add those in front, Adam, and those behind.')],
  explain: [S('V rade je 5 detí pred Adamom.', 'There are 5 children in front of Adam.'), S('Potom je tam samotný Adam – to je 1 dieťa.', 'Then there is Adam himself – 1 child.'), S('A za ním 4 deti. Spolu 5 + 1 + 4 = 10.', 'And 4 behind him. In total 5 + 1 + 4 = 10.')] });
add({ id: 'a4', cat: 'spatial', band: 'A', diff: 2, type: 'number', title: S('Stavba z kociek', 'Cube building'),
  prompt: S('Pozeráš sa zhora na stavbu z kociek. Čísla ukazujú, koľko kociek je na sebe v každej veži. Koľko kociek je v stavbe spolu?', 'You look down at a building made of cubes. Each number shows how many cubes are stacked in that tower. How many cubes are there in total?'),
  visual: vTowers([[2, 1], [1, 3]]), data: { answer: 7, unit: S('kociek', 'cubes') },
  hints: [S('Každé číslo je jedna veža. Čo musíš s vežami urobiť?', 'Each number is one tower. What do you need to do with the towers?'), S('Sčítaj všetky štyri čísla.', 'Add all four numbers.')],
  explain: [S('Každé číslo hovorí, z koľkých kociek je veža.', 'Each number says how many cubes make up the tower.'), S('Spolu: 2 + 1 + 1 + 3 = 7 kociek.', 'Total: 2 + 1 + 1 + 3 = 7 cubes.')] });
add({ id: 'a5', cat: 'logic', band: 'A', diff: 2, type: 'number', title: S('Tajné číslo guľôčok', 'Secret number of marbles'),
  prompt: S('Janko má viac ako 3 a menej ako 6 guľôčok. Počet jeho guľôčok je párny. Koľko guľôčok má Janko?', 'Janko has more than 3 and fewer than 6 marbles. His number of marbles is even. How many marbles does he have?'),
  data: { answer: 4 },
  hints: [S('Ktoré čísla sú väčšie ako 3 a menšie ako 6?', 'Which numbers are bigger than 3 and smaller than 6?'), S('Zostali 4 a 5. Ktoré z nich je párne?', '4 and 5 are left. Which one is even?')],
  explain: [S('Väčšie ako 3 a menšie ako 6 sú čísla 4 a 5.', 'Numbers bigger than 3 and smaller than 6 are 4 and 5.'), S('Párne je iba 4 (delí sa dvoma bez zvyšku).', 'Only 4 is even (divisible by two with no remainder).')] });
add({ id: 'a6', cat: 'logic', band: 'A', diff: 1, type: 'choice', title: S('Kto je najnižší?', 'Who is the shortest?'),
  prompt: S('Ema je vyššia ako Dana. Dana je vyššia ako Filip. Kto z nich je najnižší?', 'Ema is taller than Dana. Dana is taller than Filip. Who is the shortest?'),
  data: { options: [S('Ema', 'Ema'), S('Dana', 'Dana'), S('Filip', 'Filip')], correct: 2 },
  hints: [S('Skús si ich postaviť do radu od najvyššieho.', 'Try lining them up from tallest.'), S('Ema je prvá. Kto je za ňou, ak Dana je vyššia ako Filip?', 'Ema is first. Who comes next if Dana is taller than Filip?')],
  explain: [S('Ema > Dana, takže Ema je pred Danou.', 'Ema > Dana, so Ema comes before Dana.'), S('Dana > Filip, takže Dana je pred Filipom.', 'Dana > Filip, so Dana comes before Filip.'), S('Poradie: Ema, Dana, Filip. Najnižší je Filip.', 'Order: Ema, Dana, Filip. The shortest is Filip.')] });
add({ id: 'a7', cat: 'combi', band: 'A', diff: 2, type: 'number', title: S('Oblečenie na výlet', 'Outfit for a trip'),
  prompt: S('Mám 3 tričká a 2 nohavice. Koľko rôznych oblečení si môžem zostaviť (jedno tričko a jedny nohavice)?', 'I have 3 T-shirts and 2 pairs of trousers. How many different outfits can I make (one T-shirt and one pair of trousers)?'),
  data: { answer: 6 },
  hints: [S('Vyber si jedno tričko. S koľkými nohavicami ho môžeš obliecť?', 'Pick one T-shirt. With how many trousers can you wear it?'), S('Takto to platí pre každé z 3 tričiek.', 'This is true for each of the 3 T-shirts.')],
  explain: [S('Prvé tričko sa dá obliecť s 2 nohavicami – to sú 2 možnosti.', 'The first T-shirt works with 2 trousers – 2 options.'), S('To isté platí pre druhé aj tretie tričko.', 'The same holds for the second and third T-shirt.'), S('Spolu 2 + 2 + 2 = 6, teda 3 × 2 = 6.', 'In total 2 + 2 + 2 = 6, that is 3 × 2 = 6.')] });
add({ id: 'a8', cat: 'geom', band: 'A', diff: 2, type: 'number', title: S('Rohy tvarov', 'Corners of shapes'),
  prompt: S('Koľko rohov (vrcholov) majú spolu 1 štvorec a 2 trojuholníky?', 'How many corners (vertices) do 1 square and 2 triangles have altogether?'),
  visual: vEmo(['⬜', '🔺', '🔺']), data: { answer: 10 },
  hints: [S('Koľko rohov má štvorec a koľko trojuholník?', 'How many corners does a square have, and a triangle?'), S('Štvorec 4, každý trojuholník 3. Čo teraz?', 'A square has 4, each triangle 3. What now?')],
  explain: [S('Štvorec má 4 rohy.', 'A square has 4 corners.'), S('Každý trojuholník má 3 rohy, dva majú 6.', 'Each triangle has 3 corners, two have 6.'), S('Spolu 4 + 6 = 10 rohov.', 'Together 4 + 6 = 10 corners.')] });

/* ---- Band B · 3rd–4th grade ---- */
add({ id: 'b1', cat: 'seq', band: 'B', diff: 2, type: 'number', title: S('Rastúci rad', 'Growing sequence'), prompt: S('Doplň ďalšie číslo: 2, 6, 18, 54, ?', 'Fill in the next number: 2, 6, 18, 54, ?'),
  data: { answer: 162 },
  hints: [S('Pozri sa na pomer čísel: koľkokrát je 6 väčšie než 2?', 'Look at the ratio: how many times bigger is 6 than 2?'), S('Skús aj 18 : 6. Čo zistíš?', 'Try 18 : 6 too. What do you notice?')],
  explain: [S('6 : 2 = 3, 18 : 6 = 3, 54 : 18 = 3 – vždy násobíme tromi.', '6 : 2 = 3, 18 : 6 = 3, 54 : 18 = 3 – we always multiply by three.'), S('Ďalšie číslo je 54 · 3 = 162.', 'The next number is 54 · 3 = 162.')] });
add({ id: 'b2', cat: 'logic', band: 'B', diff: 2, type: 'sort', title: S('Zlomky do radu', 'Fractions in order'), prompt: S('Zoraď kartičky od najmenšieho čísla po najväčšie. Presúvaj ich prstom alebo šípkami.', 'Sort the cards from the smallest number to the biggest. Drag them or use the arrows.'),
  data: { items: ['1/4', '1/2', '3/4', '1'], dir: S('od najmenšieho po najväčšie', 'smallest to biggest') },
  hints: [S('Ktorý zlomok je menej než polovica?', 'Which fraction is less than a half?'), S('Predstav si pizzu: koľko štvrtín je v jednotlivých kartičkách?', 'Imagine a pizza: how many quarters are in each card?')],
  explain: [S('Prepíšme všetko na štvrtiny: 1/4, 2/4, 3/4, 4/4.', 'Rewrite everything in quarters: 1/4, 2/4, 3/4, 4/4.'), S('Čím viac štvrtín, tým väčšie číslo.', 'The more quarters, the bigger the number.')] });
add({ id: 'b3', cat: 'data', band: 'B', diff: 1, type: 'number', title: S('Prečítané knihy', 'Books read'), prompt: S('Graf ukazuje, koľko kníh prečítala trieda v jednotlivé dni. Koľko kníh prečítali v pondelok až štvrtok spolu?', 'The chart shows how many books the class read each day. How many books did they read from Monday to Thursday altogether?'),
  visual: () => vBars([4, 7, 5, 9], [tx(S('Po', 'Mon')), tx(S('Ut', 'Tue')), tx(S('St', 'Wed')), tx(S('Št', 'Thu'))]),
  data: { answer: 25, unit: S('kníh', 'books') },
  hints: [S('Prečítaj číslo nad každým stĺpcom.', 'Read the number above each bar.'), S('Aké číslo si prečítal pri štvrtku?', 'What number did you read for Thursday?')],
  explain: [S('Zo stĺpcov prečítame: 4, 7, 5 a 9.', 'From the bars we read: 4, 7, 5 and 9.'), S('Spolu 4 + 7 + 5 + 9 = 25.', 'Total 4 + 7 + 5 + 9 = 25.')] });
add({ id: 'b4', cat: 'combi', band: 'B', diff: 2, type: 'number', title: S('Rad troch kamarátov', 'Three friends in a row'), prompt: S('Ema, Tomáš a Lea sa chcú postaviť do radu na fotku. Koľkými rôznymi spôsobmi sa môžu zoradiť?', 'Ema, Tom and Lea want to line up for a photo. In how many different orders can they stand?'),
  data: { answer: 6 },
  hints: [S('Kto môže stáť na prvom mieste? Koľko je možností?', 'Who can stand first? How many options are there?'), S('Keď je prvý vybraný, koľko možností zostane pre druhé miesto?', 'Once the first is chosen, how many options remain for the second place?')],
  explain: [S('Na prvom mieste môžu byť 3 deti.', 'Any of 3 children can be first.'), S('Na druhom mieste už iba 2 a na treťom posledné dieťa (1).', 'For second place only 2 remain, and the last child takes third (1).'), S('Spolu 3 · 2 · 1 = 6 spôsobov.', 'In total 3 · 2 · 1 = 6 ways.')] });
add({ id: 'b5', cat: 'weights', band: 'B', diff: 2, type: 'number', title: S('Ovocné váhy', 'Fruit scales'), prompt: S('Na váhach platí: 1 jablko vyváži 2 slivky a 1 slivka vyváži 3 jahody. Koľko jahôd vyváži 1 jablko?', 'On a balance: 1 apple balances 2 plums and 1 plum balances 3 strawberries. How many strawberries balance 1 apple?'),
  data: { answer: 6, unit: S('jahôd', 'strawberries') }, src: ORIG,
  hints: [S('Najprv nahraď jablko slivkami.', 'First replace the apple with plums.'), S('Každú zo sliviek teraz nahraď jahodami.', 'Now replace each plum with strawberries.')],
  explain: [S('1 jablko = 2 slivky.', '1 apple = 2 plums.'), S('1 slivka = 3 jahody, teda 2 slivky = 2 · 3 = 6 jahôd.', '1 plum = 3 strawberries, so 2 plums = 2 · 3 = 6 strawberries.')] });
add({ id: 'b6', cat: 'weights', band: 'B', diff: 3, type: 'choice', title: S('Falošná minca', 'The fake coin'), prompt: S('Medzi 9 mincami je jedna falošná – je ľahšia. Máš rovnoramenné váhy bez závaží. Koľko vážení stačí, aby si falošnú mincu určite našiel?', 'Among 9 coins one is fake – it is lighter. You have a balance scale with no weights. How many weighings are enough to surely find the fake?'),
  data: { options: ['1', '2', '3', '4'], correct: 1, cols: 4 }, src: CLASSIC,
  hints: [S('Čo ak mince rozdelíš na trojice a porovnáš dve z nich?', 'What if you split the coins into groups of three and compare two groups?'), S('Po prvom vážení vieš, v ktorej trojici je falošná. Ako ju nájdeš z troch mincí?', 'After the first weighing you know which group of three holds the fake. How do you find it among three coins?')],
  explain: [S('Rozdeľ mince na 3 trojice a polož dve trojice na váhy. Ľahšia strana alebo rovnováha prezradí trojicu s falošnou mincou.', 'Split the coins into 3 groups and weigh two groups. The lighter side – or balance – tells you which group has the fake.'), S('Z trojice vyber dve mince a zvážiť ich: ľahšia je falošná, a ak sú rovnaké, falošná je tretia.', 'Weigh two coins from that group: the lighter is fake, and if they balance, the third is.'), S('Spolu stačia 2 vážania.', 'Two weighings in total are enough.')] });
add({ id: 'b7', cat: 'truth', band: 'B', diff: 2, type: 'choice', title: S('Kto hovorí pravdu?', 'Who tells the truth?'), prompt: S('Maťo povie: „Dnes je utorok.“ Zuzka povie: „Maťo klame.“ Vieme, že Zuzka hovorí pravdu. Je dnes utorok?', 'Matt says: “Today is Tuesday.” Zoe says: “Matt is lying.” We know Zoe tells the truth. Is today Tuesday?'),
  data: { options: [S('Áno', 'Yes'), S('Nie', 'No'), S('Nedá sa zistiť', 'Cannot tell')], correct: 1, cols: 3 },
  hints: [S('Ak Zuzka hovorí pravdu, čo z toho vyplýva o Maťovi?', 'If Zoe tells the truth, what follows about Matt?'), S('Maťo klame. Čo to znamená pre jeho vetu?', 'Matt lies. What does that mean for his sentence?')],
  explain: [S('Zuzka hovorí pravdu, takže „Maťo klame“ je pravda.', 'Zoe tells the truth, so “Matt is lying” is true.'), S('Keď Maťo klame, jeho veta „Dnes je utorok“ nie je pravdivá.', 'Since Matt lies, his sentence “Today is Tuesday” is not true.'), S('Dnes teda nie je utorok.', 'So today is not Tuesday.')] });
add({ id: 'b8', cat: 'grid', band: 'B', diff: 2, type: 'choice', title: S('Domáci miláčikovia', 'Pets'), prompt: S('Ana, Boris a Cyril majú psa, mačku a škrečka (každý jedno zviera). Ana nemá psa ani mačku. Boris nemá psa. Čo má Cyril?', 'Anna, Boris and Cyril own a dog, a cat and a hamster (one each). Anna has neither dog nor cat. Boris has no dog. What does Cyril have?'),
  visual: () => vTable([tx(S('Meno', 'Name')), '🐶', '🐱', '🐹'], [['Ana', '✗', '✗', '?'], ['Boris', '✗', '?', '?'], ['Cyril', '?', '?', '?']]),
  data: { options: [S('Psa', 'The dog'), S('Mačku', 'The cat'), S('Škrečka', 'The hamster')], correct: 0, cols: 3 },
  hints: [S('Začni tým, o kom vieš najviac: čo musí mať Ana?', 'Start with who you know most about: what must Anna have?'), S('Keď má Ana škrečka, čo môže mať Boris?', 'Once Anna has the hamster, what can Boris have?')],
  explain: [S('Ana nemá psa ani mačku, preto má škrečka.', 'Anna has neither dog nor cat, so she has the hamster.'), S('Boris nemá psa a škrečka už nie je voľný, preto má mačku.', 'Boris has no dog and the hamster is taken, so he has the cat.'), S('Cyrilovi zostáva pes.', 'Cyril is left with the dog.')] });

/* ---- Band C · 5th–6th grade ---- */
add({ id: 'c1', cat: 'crypto', band: 'C', diff: 2, type: 'number', title: S('Tajné súčty', 'Secret sums'), prompt: S('Tri tajné čísla A, B, C spĺňajú: A + B = 10, B + C = 12, A + C = 8. Aké číslo je A?', 'Three secret numbers A, B, C satisfy: A + B = 10, B + C = 12, A + C = 8. What is A?'),
  data: { answer: 3 }, src: ORIG,
  hints: [S('Čo ak sčítaš všetky tri rovnosti naraz?', 'What if you add all three equations together?'), S('Súčet je 2 · (A + B + C) = 30. Aký je potom súčet A + B + C a čo z neho odpočítaš?', 'The sum is 2 · (A + B + C) = 30. What is A + B + C, and what do you subtract from it?')],
  explain: [S('Sčítame všetky tri rovnosti: 2 · (A + B + C) = 10 + 12 + 8 = 30, teda A + B + C = 15.', 'Add the three equations: 2 · (A + B + C) = 10 + 12 + 8 = 30, so A + B + C = 15.'), S('Keďže B + C = 12, platí A = 15 − 12 = 3.', 'Since B + C = 12, we get A = 15 − 12 = 3.')] });
add({ id: 'c2', cat: 'word', band: 'C', diff: 2, type: 'number', title: S('Kniha na dovolenku', 'Holiday book'), prompt: S('Jana prečítala 3/8 knihy a potom ďalšie 2/8. Zostáva jej prečítať 15 strán. Koľko strán má celá kniha?', 'Jane read 3/8 of a book and then another 2/8. She still has 15 pages left. How many pages does the whole book have?'),
  data: { answer: 40, unit: S('strán', 'pages') },
  hints: [S('Koľko osmín knihy už prečítala spolu?', 'How many eighths of the book has she read in total?'), S('Ak 5/8 sú prečítané, koľko osmín zostáva? A koľko strán je jedna osmina?', 'If 5/8 are read, how many eighths are left? And how many pages is one eighth?')],
  explain: [S('Prečítané: 3/8 + 2/8 = 5/8 knihy.', 'Read: 3/8 + 2/8 = 5/8 of the book.'), S('Zostáva 3/8 a to je 15 strán, teda 1/8 je 5 strán.', '3/8 are left, which is 15 pages, so 1/8 is 5 pages.'), S('Celá kniha má 8 · 5 = 40 strán.', 'The whole book has 8 · 5 = 40 pages.')] });
add({ id: 'c3', cat: 'combi', band: 'C', diff: 2, type: 'number', title: S('Trojciferné čísla', 'Three-digit numbers'), prompt: S('Z číslic 1, 2, 3, 4 vytváraš trojciferné čísla, v ktorých sa žiadna číslica neopakuje. Koľko takých čísel vznikne?', 'From the digits 1, 2, 3, 4 you build three-digit numbers with no repeated digit. How many such numbers are there?'),
  data: { answer: 24 },
  hints: [S('Koľko číslic môžeš dať na miesto stoviek?', 'How many digits can go in the hundreds place?'), S('Keď jednu číslicu použiješ, koľko ich zostane pre desiatky a potom pre jednotky?', 'After using one digit, how many remain for tens, then for units?')],
  explain: [S('Na stovky máme 4 možnosti.', 'There are 4 options for the hundreds.'), S('Na desiatky zostanú 3 a na jednotky 2 číslice.', '3 digits remain for the tens and 2 for the units.'), S('Spolu 4 · 3 · 2 = 24 čísel.', 'Altogether 4 · 3 · 2 = 24 numbers.')] });
add({ id: 'c4', cat: 'combi', band: 'C', diff: 3, type: 'number', title: S('Hra so zápalkami', 'The matchstick game'), prompt: S('Na kope je 15 zápaliek. Hráči sa striedajú a každý vezme 1, 2 alebo 3 zápalky. Kto vezme poslednú, vyhráva. Koľko zápaliek máš vziať ako prvý, aby si pri správnej hre určite vyhral?', 'There are 15 matchsticks in a pile. Players take turns removing 1, 2 or 3. Whoever takes the last one wins. How many should you take first to be sure to win with correct play?'),
  data: { answer: 3 }, src: CLASSIC,
  hints: [S('Premýšľaj odzadu: pri koľkých zápalkách na kope prehráva hráč, ktorý je na ťahu?', 'Think backwards: with how many sticks left does the player to move lose?'), S('Pri 4 zápalkách prehráva ten na ťahu. Aké násobky 4 chceš nechať súperovi?', 'With 4 sticks left the player to move loses. Which multiples of 4 do you want to leave for your opponent?')],
  explain: [S('Ak na kope zostane 4 zápalky a si na ťahu, prehráš: vezmeš 1–3 a súper vezme zvyšok.', 'If 4 sticks are left and it is your turn you lose: you take 1–3 and your opponent takes the rest.'), S('Preto chceš súperovi vždy nechať 12, 8, 4 zápaliek – násobky štyroch.', 'So you always want to leave your opponent 12, 8, 4 sticks – multiples of four.'), S('Z 15 teda vezmi 3 a nechaj 12. Potom vždy dopĺňaj jeho ťah na 4.', 'From 15 take 3 and leave 12. Then always complete his move to 4.')] });
add({ id: 'c5', cat: 'geom', band: 'C', diff: 1, type: 'number', title: S('Záhrada v tvare štvorca', 'Square garden'), prompt: S('Štvorcová záhrada má obvod 36 m. Aký je jej obsah?', 'A square garden has a perimeter of 36 m. What is its area?'),
  data: { answer: 81, unit: 'm²' },
  hints: [S('Koľko je dlhá jedna strana štvorca?', 'How long is one side of the square?'), S('Strana je 36 : 4 = 9 m. Ako sa počíta obsah štvorca?', 'The side is 36 : 4 = 9 m. How do you find a square’s area?')],
  explain: [S('Štvorec má 4 rovnaké strany: 36 : 4 = 9 m.', 'A square has 4 equal sides: 36 : 4 = 9 m.'), S('Obsah = strana · strana = 9 · 9 = 81 m².', 'Area = side · side = 9 · 9 = 81 m².')] });
add({ id: 'c6', cat: 'geom', band: 'C', diff: 2, type: 'number', title: S('Obdĺžnik podľa obvodu', 'Rectangle from perimeter'), prompt: S('Obdĺžnik má obvod 30 cm a jedna jeho strana je 9 cm. Aký je jeho obsah?', 'A rectangle has a perimeter of 30 cm and one side is 9 cm. What is its area?'),
  data: { answer: 54, unit: 'cm²' },
  hints: [S('Obvod je 2 · (a + b). Koľko je a + b?', 'The perimeter is 2 · (a + b). What is a + b?'), S('a + b = 15, jedna strana je 9. Aká je druhá?', 'a + b = 15 and one side is 9. What is the other?')],
  explain: [S('Polovica obvodu: 30 : 2 = 15 = a + b.', 'Half the perimeter: 30 : 2 = 15 = a + b.'), S('Druhá strana je 15 − 9 = 6 cm.', 'The other side is 15 − 9 = 6 cm.'), S('Obsah = 9 · 6 = 54 cm².', 'Area = 9 · 6 = 54 cm².')] });
add({ id: 'c7', cat: 'spatial', band: 'C', diff: 3, type: 'number', title: S('Natretá kocka', 'The painted cube'), prompt: S('Veľká kocka 3×3×3 je zložená z 27 malých kociek a zvonku celá natretá. Rozoberieme ju. Koľko malých kociek má natreté presne 3 steny?', 'A big 3×3×3 cube is made of 27 small cubes and painted on the outside. We take it apart. How many small cubes have exactly 3 painted faces?'),
  data: { answer: 8 }, src: CLASSIC,
  hints: [S('Ktoré malé kocky sú v rohoch veľkej kocky?', 'Which small cubes sit in the corners of the big cube?'), S('Koľko rohov má kocka?', 'How many corners does a cube have?')],
  explain: [S('Tri natreté steny majú iba kocky v rohoch – tam sa stretávajú tri steny veľkej kocky.', 'Only corner cubes have three painted faces – three faces of the big cube meet there.'), S('Kocka má 8 rohov, preto je takých kociek 8.', 'A cube has 8 corners, so there are 8 such cubes.')] });
add({ id: 'c8', cat: 'olymp', band: 'C', diff: 2, type: 'number', title: S('Gaussov trik', 'Gauss’s trick'), prompt: S('Vypočítaj bez kalkulačky: 1 + 2 + 3 + … + 20.', 'Without a calculator: 1 + 2 + 3 + … + 20.'),
  data: { answer: 210 }, src: CLASSIC,
  hints: [S('Skús spárovať prvé číslo s posledným: 1 + 20.', 'Try pairing the first number with the last: 1 + 20.'), S('Ďalší pár je 2 + 19. Koľko takých párov je?', 'The next pair is 2 + 19. How many such pairs are there?')],
  explain: [S('1 + 20 = 21, 2 + 19 = 21, 3 + 18 = 21 … každý pár dáva 21.', '1 + 20 = 21, 2 + 19 = 21, 3 + 18 = 21 … every pair makes 21.'), S('Čísel je 20, teda párov je 10.', 'There are 20 numbers, so 10 pairs.'), S('Súčet je 10 · 21 = 210.', 'The sum is 10 · 21 = 210.')] });

/* ---- Band D · 7th–9th grade ---- */
add({ id: 'd1', cat: 'olymp', band: 'D', diff: 2, type: 'number', title: S('Nuly na konci', 'Trailing zeros'), prompt: S('Na koľko núl končí číslo 20! = 1 · 2 · 3 · … · 20?', 'How many zeros does 20! = 1 · 2 · 3 · … · 20 end with?'),
  data: { answer: 4, work: true }, src: OLY,
  hints: [S('Nula na konci vzniká z dvojice činiteľov 2 a 5. Čoho je v súčine menej?', 'A trailing zero comes from a pair of factors 2 and 5. Which one is rarer in the product?'), S('Spočítaj, v koľkých číslach od 1 do 20 sa vyskytuje činiteľ 5 (aj viackrát).', 'Count how many times the factor 5 appears among 1 to 20.')],
  explain: [S('Každá nula na konci znamená jeden činiteľ 10 = 2 · 5. Dvojok je v 20! oveľa viac, rozhodujú päťky.', 'Each trailing zero is one factor 10 = 2 · 5. There are far more twos in 20!, so the fives decide.'), S('Päťky: 5, 10, 15, 20 – každé číslo prispieva jednou päťkou (25 by dalo dve, ale nie je v súčine).', 'Fives: 5, 10, 15, 20 – each contributes one five (25 would give two, but it is not in the product).'), S('Preto je núl 4.', 'So there are 4 zeros.')] });
add({ id: 'd2', cat: 'prob', band: 'D', diff: 2, type: 'choice', title: S('Dve kocky', 'Two dice'), prompt: S('Hodíme dvoma pravidelnými kockami. Aká je pravdepodobnosť, že súčet bodov je 7?', 'We roll two fair dice. What is the probability that the sum is 7?'),
  data: { options: ['1/12', '1/6', '7/36', '1/36'], correct: 1, cols: 4 }, src: OLY,
  hints: [S('Koľko všetkých výsledkov hodu dvoch kociek existuje?', 'How many outcomes exist when rolling two dice?'), S('Vypíš dvojice so súčtom 7: (1,6), (2,5) … Koľko ich je?', 'List the pairs with sum 7: (1,6), (2,5) … How many are there?')],
  explain: [S('Všetkých výsledkov je 6 · 6 = 36.', 'There are 6 · 6 = 36 outcomes.'), S('Súčet 7 dávajú dvojice (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) – je ich 6.', 'Sum 7 comes from (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) – six pairs.'), S('Pravdepodobnosť je 6/36 = 1/6.', 'The probability is 6/36 = 1/6.')] });
add({ id: 'd3', cat: 'algebra', band: 'D', diff: 2, type: 'number', title: S('Tri po sebe idúce', 'Three in a row'), prompt: S('Súčet troch po sebe idúcich celých čísel je 105. Aké je najväčšie z nich?', 'The sum of three consecutive integers is 105. What is the largest of them?'),
  data: { answer: 36, work: true },
  hints: [S('Označ prostredné číslo n. Ako zapíšeš susedné čísla?', 'Call the middle number n. How do you write its neighbours?'), S('n − 1, n, n + 1 – čomu sa rovná ich súčet?', 'n − 1, n, n + 1 – what is their sum?')],
  explain: [S('Čísla sú n − 1, n, n + 1 a ich súčet je 3n.', 'The numbers are n − 1, n, n + 1 and their sum is 3n.'), S('3n = 105, teda n = 35.', '3n = 105, so n = 35.'), S('Najväčšie je n + 1 = 36.', 'The largest is n + 1 = 36.')] });
add({ id: 'd4', cat: 'combi', band: 'D', diff: 2, type: 'number', title: S('Delegácia', 'The delegation'), prompt: S('Zo šiestich žiakov vyberáme dvojčlennú delegáciu. Koľkými spôsobmi to môžeme urobiť?', 'We choose a two-person delegation from six students. In how many ways can we do it?'),
  data: { answer: 15 },
  hints: [S('Najprv spočítaj usporiadané dvojice. Koľko ich je?', 'First count ordered pairs. How many are there?'), S('Každá dvojica sa tak započíta dvakrát (A,B aj B,A). Čo s tým?', 'Each pair is counted twice (A,B and B,A). What to do about it?')],
  explain: [S('Prvého vyberieme 6 spôsobmi, druhého 5: spolu 30 usporiadaných dvojíc.', 'The first is chosen in 6 ways, the second in 5: 30 ordered pairs.'), S('Na poradí nezáleží, každú dvojicu sme počítali dvakrát.', 'Order does not matter, we counted every pair twice.'), S('Výsledok 30 : 2 = 15.', 'Result 30 : 2 = 15.')] });
add({ id: 'd5', cat: 'olymp', band: 'D', diff: 3, type: 'number', title: S('Posledná číslica', 'The last digit'), prompt: S('Aká je posledná číslica čísla 7¹⁰⁰? Do poľa „Postup“ napíš, ako si na to prišiel.', 'What is the last digit of 7¹⁰⁰? Write how you found it in the “Working” box.'),
  data: { answer: 1, work: true }, src: OLY,
  hints: [S('Vypíš posledné číslice mocnín 7¹, 7², 7³, 7⁴ …', 'Write down the last digits of the powers 7¹, 7², 7³, 7⁴ …'), S('Posledné číslice sa opakujú s nejakou periódou. Aká je a čo je 100 po delení periódou?', 'The last digits repeat with some period. What is it, and what is 100 divided by the period?')],
  explain: [S('Posledné číslice: 7, 9, 3, 1, potom sa opakuje 7, 9, 3, 1 … (perióda 4).', 'Last digits: 7, 9, 3, 1, then again 7, 9, 3, 1 … (period 4).'), S('100 je násobok 4, preto 7¹⁰⁰ končí rovnako ako 7⁴.', '100 is a multiple of 4, so 7¹⁰⁰ ends like 7⁴.'), S('Posledná číslica je 1.', 'The last digit is 1.')] });
add({ id: 'd6', cat: 'truth', band: 'D', diff: 3, type: 'choice', title: S('Ostrov rytierov a luhárov', 'Island of knights and liars'), prompt: S('Na ostrove rytieri vždy hovoria pravdu a luhári vždy klamú. A povie: „Sme obaja luhári.“ Čo je B?', 'On an island knights always tell the truth and liars always lie. A says: “We are both liars.” What is B?'),
  data: { options: [S('Rytier', 'Knight'), S('Luhár', 'Liar'), S('Nedá sa určiť', 'Cannot be determined')], correct: 0, cols: 3 }, src: CLASSIC,
  hints: [S('Môže byť A rytier? Čo by potom jeho veta znamenala?', 'Can A be a knight? What would his sentence then mean?'), S('Ak je A luhár, jeho veta je nepravdivá. Čo to hovorí o B?', 'If A is a liar his sentence is false. What does that say about B?')],
  explain: [S('Ak by A bol rytier, jeho veta by bola pravdivá – ale tvrdí, že je luhár. To je spor.', 'If A were a knight his sentence would be true – but it says he is a liar. Contradiction.'), S('A je teda luhár a jeho veta je nepravdivá: nie sú obaja luhári.', 'So A is a liar and his sentence is false: they are not both liars.'), S('Keďže A je luhár, B musí byť rytier.', 'Since A is a liar, B must be a knight.')] });
add({ id: 'd7', cat: 'prob', band: 'D', diff: 3, type: 'choice', title: S('Guľôčky vo vrecku', 'Marbles in a bag'), prompt: S('Vo vreci sú 3 červené a 2 modré guľôčky. Vytiahneme dve bez vrátenia. Aká je pravdepodobnosť, že obe budú červené?', 'A bag holds 3 red and 2 blue marbles. We draw two without replacement. What is the probability both are red?'),
  data: { options: ['3/10', '9/25', '1/2', '3/5'], correct: 0, cols: 4 },
  hints: [S('Aká je pravdepodobnosť, že prvá je červená?', 'What is the probability that the first is red?'), S('Keď prvú nevrátiš, koľko červených a koľko všetkých zostane?', 'If you do not put it back, how many red and how many marbles remain?')],
  explain: [S('Prvá červená: 3/5.', 'First red: 3/5.'), S('Potom zostanú 2 červené zo 4 guľôčok: 2/4 = 1/2.', 'Then 2 red remain out of 4 marbles: 2/4 = 1/2.'), S('Spolu 3/5 · 1/2 = 3/10.', 'Together 3/5 · 1/2 = 3/10.')] });
add({ id: 'd8', cat: 'logic', band: 'D', diff: 2, type: 'multi', title: S('Označ pravdivé výroky', 'Mark the true statements'), prompt: S('Ktoré z týchto výrokov sú pravdivé? Označ všetky.', 'Which of these statements are true? Mark all of them.'),
  data: { options: [S('2¹⁰ je väčšie ako 10³', '2¹⁰ is greater than 10³'), S('Súčet uhlov v trojuholníku je 180°', 'The angles of a triangle add up to 180°'), S('Každé prvočíslo je nepárne', 'Every prime number is odd'), S('0,999… je menšie ako 1', '0.999… is less than 1')], correct: [0, 1] }, src: OLY,
  hints: [S('Skús každý výrok samostatne. Nájdeš protipríklad?', 'Test each statement on its own. Can you find a counter-example?'), S('Pozri sa na najmenšie prvočíslo. A koľko je 2¹⁰ a 10³?', 'Look at the smallest prime. And what are 2¹⁰ and 10³?')],
  explain: [S('2¹⁰ = 1024 a 10³ = 1000, takže prvý výrok platí.', '2¹⁰ = 1024 and 10³ = 1000, so the first holds.'), S('Súčet uhlov v trojuholníku je vždy 180° – druhý výrok platí.', 'The angles of a triangle always add to 180° – the second holds.'), S('Číslo 2 je párne prvočíslo, tretí výrok neplatí. A 0,999… sa rovná 1, štvrtý neplatí.', 'The number 2 is an even prime, so the third fails. And 0.999… equals 1, so the fourth fails.')] });

/* ---- builders for interactive tasks ---- */
function sudokuTask(id, n, holes, seed, band, diff) {
  const size = `${n}×${n}`;
  return add({
    id, cat: 'sudoku', band, diff, pts: 15 * diff, type: 'sudoku', title: S(`Sudoku ${size}`, `Sudoku ${size}`),
    prompt: S(`Doplň mriežku ${size} tak, aby sa v každom riadku, stĺpci a ${n === 4 ? 'štvorčeku 2×2' : n === 6 ? 'obdĺžniku 2×3' : 'štvorčeku 3×3'} každé číslo od 1 do ${n} vyskytlo práve raz.`,
      `Fill the ${size} grid so that every row, column and ${n === 4 ? '2×2 box' : n === 6 ? '2×3 box' : '3×3 box'} contains each number from 1 to ${n} exactly once.`),
    data: { n, holes, seed }, src: ORIG,
    hints: [S('Začni tam, kde v riadku, stĺpci alebo štvorčeku chýba najmenej čísel.', 'Start where a row, column or box is missing the fewest numbers.'), 'dyn', 'dyn'],
    explain: [S('V každom riadku, stĺpci a štvorčeku sa číslo opakovať nesmie.', 'No number may repeat in any row, column or box.')]
  });
}
function lightsTask(id, size, presses, seed, band, diff) {
  return add({
    id, cat: 'toggle', band, diff, pts: 15 * diff, type: 'lights', title: S('Zhasni všetky svetlá', 'Switch all lights off'),
    prompt: S('Stlačením políčka prepneš jeho svetlo aj svetlá susedov (hore, dole, vľavo, vpravo). Zhasni všetky svetlá (○).', 'Pressing a cell flips its light and its neighbours’ (up, down, left, right). Turn all lights off (○).'),
    data: { size, presses, seed }, src: CLASSIC,
    hints: [S('Skús jedno políčko stlačiť dvakrát. Čo sa stane?', 'Try pressing one cell twice. What happens?'), 'dyn', 'dyn'], explain: []
  });
}
function mazeTask(id, rows, band, diff) {
  return add({
    id, cat: 'maze', band, diff, pts: 15 * diff, type: 'maze', title: S('Najkratšia cesta', 'The shortest route'),
    prompt: S('Prstom nakresli cestu z rakety 🚀 do cieľa 🏁. Cez steny sa nedá a hľadáme najkratšiu cestu!', 'Draw a path with your finger from the rocket 🚀 to the finish 🏁. You cannot cross walls – and we look for the shortest route!'),
    data: { rows }, src: ORIG, hints: [S('Ktoré chodby sú slepé uličky?', 'Which corridors are dead ends?'), 'dyn', 'dyn'], explain: []
  });
}
function ferryTask(id, cfg, band, diff, intro) {
  return add({
    id, cat: 'ferry', band, diff, pts: 20 * diff, type: 'ferry', title: intro.title, prompt: intro.prompt, data: { cfg }, src: CLASSIC,
    hints: [intro.h1, intro.h2, 'dyn'], explain: intro.explain
  });
}

sudokuTask('sud4a', 4, 6, 101, 'A', 1);
sudokuTask('sud4b', 4, 9, 102, 'A', 1);
sudokuTask('sud6a', 6, 14, 201, 'B', 2);
sudokuTask('sud6b', 6, 20, 202, 'B', 2);
sudokuTask('sud6c', 6, 23, 203, 'C', 2);
sudokuTask('sud9a', 9, 38, 301, 'D', 3);
sudokuTask('sud9b', 9, 46, 302, 'D', 3);
lightsTask('lightsA', 3, 2, 11, 'A', 1);
lightsTask('lightsB', 3, 4, 12, 'B', 2);
lightsTask('lightsC', 4, 5, 13, 'C', 2);
lightsTask('lightsD', 4, 8, 14, 'D', 3);
mazeTask('mazeA', ['S.#..', '#.#.#', '....#', '.##..', '...#E'], 'A', 1);
mazeTask('mazeB', ['S..#...', '##.#.#.', '.....#.', '.###...', '...###.', '##.....', '...###E'], 'B', 2);
mazeTask('mazeC', ['S...#....', '###.#.##.', '.......#.', '.#####.#.', '.....#...', '####.####', '.........', '.#######.', '........E'], 'C', 3);
ferryTask('ferry_classic', 'classic', 'A', 2, {
  title: S('Vlk, koza a kapusta', 'Wolf, goat and cabbage'),
  prompt: S('Prevez 🐺 🐐 🥬 cez rieku. Loď uvezie farmára a jedného. Sami: vlk zje kozu, koza zje kapustu.', 'Take 🐺 🐐 🥬 across the river. The boat holds the farmer and one. Alone: the wolf eats the goat, the goat eats the cabbage.'),
  h1: S('Koho nemôžeš nechať samého spolu? Ktorá postava nevadí nikomu z ostatných?', 'Who can never be left alone together? Which character gets along with both others?'),
  h2: S('Koza je v oboch nebezpečných dvojiciach. Čo keď ju vezmeš ako prvú?', 'The goat is in both dangerous pairs. What if you take it first?'),
  explain: [S('Kľúčový nápad: koza je problém pre oboch (vlk ju zje, ona zje kapustu), preto ju farmár nesmie nechať s nikým samú.', 'Key idea: the goat is the troublemaker – the wolf eats it, it eats the cabbage – so the farmer must never leave it alone with either.'), S('Vlk a kapusta si navzájom neublížia, takže môžu chvíľu stáť spolu.', 'The wolf and the cabbage do not harm each other, so they may wait together.')]
});
ferryTask('ferry_fox', 'fox', 'B', 2, {
  title: S('Líška, sliepka a kukurica', 'Fox, hen and corn'),
  prompt: S('Veslár prevezie cez potok líšku, sliepku a vrece kukurice. Loďka uvezie veslára a jedného pasažiera. Bez veslára líška zje sliepku a sliepka zobe kukuricu. Nájdi bezpečný postup!', 'A rower must take a fox, a hen and a sack of corn across a stream. The boat holds the rower and one passenger. Alone, the fox eats the hen and the hen pecks the corn. Find a safe plan!'),
  h1: S('Kto je v oboch nebezpečných dvojiciach?', 'Who appears in both dangerous pairs?'),
  h2: S('Sliepku treba brať ako prvú. Čo potom, keď je na druhom brehu? Môžeš ju aj vrátiť späť!', 'The hen goes first. What next, once she is across? You may also bring her back!'),
  explain: [S('Sliepka je v oboch nebezpečných dvojiciach, preto ju veslár vezie ako prvú a nikdy ju nenecháva samú s líškou ani kukuricou.', 'The hen is in both dangerous pairs, so the rower takes her first and never leaves her alone with the fox or the corn.'), S('Niekedy sa oplatí previezť niekoho aj späť – ide o to, aby nikto nikomu neublížil.', 'Sometimes it pays to bring someone back – what matters is that nobody is left in danger.')]
});
ferryTask('ferry_mc22', 'mc22', 'C', 3, {
  title: S('Astronauti a roboty', 'Astronauts and robots'),
  prompt: S('Dvaja astronauti a dvaja roboti musia raketovým člnom prejsť na druhý breh. Čln uvezie najviac dvoch a niekto ním musí plávať. Ak by na brehu bolo viac robotov ako astronautov, astronauti by boli v nebezpečenstve. Nájdi bezpečný plán!', '2 astronauts and 2 robots must cross a river in a small rocket-boat. It carries at most two and someone must row. If robots outnumber astronauts on a bank (while astronauts are there), the astronauts are in danger. Find a safe plan!'),
  h1: S('Na oboch brehoch sleduj počty: astronauti ≥ roboty, ak tam nejaký astronaut je.', 'Watch the counts on both banks: astronauts ≥ robots whenever any astronaut is present.'),
  h2: S('Neboj sa vrátiť niekoho späť. Niekedy je to jediná cesta.', 'Do not be afraid to bring someone back – sometimes it is the only way.'),
  explain: [S('Na oboch brehoch (a v čase plavby) udržiavame pravidlo: ak je tam astronaut, nie je tam viac robotov ako astronautov.', 'On both banks we keep the rule: if an astronaut is there, robots never outnumber astronauts.')]
});
ferryTask('ferry_mc33', 'mc33', 'D', 3, {
  title: S('Traja astronauti, traja roboti', 'Three astronauts, three robots'),
  prompt: S('Traja astronauti a traja roboti prechádzajú cez rieku člnom pre dvoch. Pravidlo: na brehu, kde je aspoň jeden astronaut, nesmie byť viac robotov ako astronautov. Aký je najmenší počet plavieb?', '3 astronauts and 3 robots cross a river in a boat for two. Rule: on a bank with at least one astronaut, robots may not outnumber astronauts. What is the smallest number of crossings?'),
  h1: S('Zapisuj si, kto je na ktorom brehu. Čo sa stane, ak ako prvých pošleš dvoch robotov?', 'Imagine all possible states – how often could you start by sending “2 robots”?'),
  h2: S('Pozor na to, kto ostane na brehu, z ktorého odplávaš. Niekedy je dobré vrátiť jedného robota alebo astronauta.', 'Mind who is left on the bank you leave. Sometimes returning one robot or astronaut is best.'),
  explain: [S('Toto je slávna úloha o misionároch a kanibaloch v kozmickej verzii. Pomôže, keď si systematicky zapisuješ, kto je na ktorom brehu.', 'This is the famous missionaries-and-cannibals puzzle in a space version. Systematically writing down the bank states helps.')]
});

/* ------------ generators (number patterns) ------------ */
const SEQ = {
  add(r) { const a = ri(r, 1, 9), d = ri(r, 2, 7), terms = range(5).map(i => a + i * d), last = terms[4];
    return { terms, ans: last + d, h: [S('Spočítaj rozdiel medzi dvoma susednými číslami.', 'Work out the difference between neighbouring numbers.'), S(`Rozdiel je stále ${d}. Pripočítaj ho k poslednému číslu.`, `The difference is always ${d}. Add it to the last number.`)], ex: [S(`Rozdiely medzi číslami sú stále ${d}.`, `The differences are always ${d}.`), S(`Posledné číslo je ${last}, ďalšie je ${last} + ${d} = ${last + d}.`, `The last number is ${last}, the next is ${last} + ${d} = ${last + d}.`)] }; },
  mul(r) { const a = ri(r, 1, 3), m = ri(r, 2, 3), terms = range(5).map(i => a * m ** i);
    return { terms, ans: a * m ** 5, h: [S('Skús, či čísla nevznikajú násobením.', 'Check whether the numbers come from multiplying.'), S(`Každé číslo je ${m}-krát väčšie než predchádzajúce.`, `Each number is ${m} times the previous one.`)], ex: [S(`Každé číslo dostaneme vynásobením predchádzajúceho číslom ${m}.`, `Each number is the previous one times ${m}.`), S(`${terms[4]} · ${m} = ${a * m ** 5}.`, `${terms[4]} · ${m} = ${a * m ** 5}.`)] }; },
  incr(r) { const s = ri(r, 1, 6), k = ri(r, 1, 3), terms = [s]; for (let i = 0; i < 4; i++) terms.push(terms[i] + k + i);
    return { terms, ans: terms[4] + k + 4, h: [S('Pozri sa na rozdiely medzi susednými číslami. Menia sa?', 'Look at the differences between neighbours. Do they change?'), S(`Rozdiely sú ${k}, ${k + 1}, ${k + 2}, ${k + 3} – zväčšujú sa o 1.`, `The differences are ${k}, ${k + 1}, ${k + 2}, ${k + 3} – growing by 1.`)], ex: [S(`Rozdiely sú ${k}, ${k + 1}, ${k + 2}, ${k + 3}: každý je o 1 väčší.`, `The differences are ${k}, ${k + 1}, ${k + 2}, ${k + 3}: each is 1 bigger.`), S(`Ďalší rozdiel je ${k + 4}, preto ${terms[4]} + ${k + 4} = ${terms[4] + k + 4}.`, `The next difference is ${k + 4}, so ${terms[4]} + ${k + 4} = ${terms[4] + k + 4}.`)] }; },
  sq(r) { const c = ri(r, 0, 5), terms = range(5).map(i => (i + 1) ** 2 + c);
    return { terms, ans: 36 + c, h: [S('Porovnaj čísla so štvorcami 1, 4, 9, 16, 25…', 'Compare the numbers with squares 1, 4, 9, 16, 25…'), S(c ? `Od každého čísla odpočítaj ${c}. Čo dostaneš?` : 'Sú to druhé mocniny. Ktorá je na rade?', c ? `Subtract ${c} from each number. What do you get?` : 'They are square numbers. Which one comes next?')], ex: [S(`Čísla sú ${c ? 'štvorce zväčšené o ' + c : 'štvorce'}: 1², 2², 3², 4², 5².`, `The numbers are ${c ? 'squares plus ' + c : 'squares'}: 1², 2², 3², 4², 5².`), S(`Ďalšie je 6² + ${c} = ${36 + c}.`, `The next is 6² + ${c} = ${36 + c}.`)] }; },
  fib(r) { const a = ri(r, 1, 4), b = ri(r, 1, 4), terms = [a, b]; for (let i = 2; i < 5; i++) terms.push(terms[i - 1] + terms[i - 2]);
    return { terms, ans: terms[4] + terms[3], h: [S('Skús spočítať dve susedné čísla.', 'Try adding two neighbouring numbers.'), S('Každé číslo je súčtom dvoch predchádzajúcich.', 'Each number is the sum of the two before it.')], ex: [S(`${terms[0]} + ${terms[1]} = ${terms[2]}, ${terms[1]} + ${terms[2]} = ${terms[3]} … každé číslo je súčet dvoch predchádzajúcich.`, `${terms[0]} + ${terms[1]} = ${terms[2]}, ${terms[1]} + ${terms[2]} = ${terms[3]} … each number is the sum of the previous two.`), S(`Ďalšie: ${terms[3]} + ${terms[4]} = ${terms[4] + terms[3]}.`, `Next: ${terms[3]} + ${terms[4]} = ${terms[4] + terms[3]}.`)] }; },
  inter(r) { const x = ri(r, 1, 5), a = ri(r, 2, 4), y = ri(r, 14, 22), b = ri(r, 2, 5), terms = [x, y, x + a, y - b, x + 2 * a];
    return { terms, ans: y - 2 * b, h: [S('Čo ak sú to dva rady poprehadzované do jedného?', 'What if two sequences are mixed into one?'), S(`Čísla na 1., 3., 5. mieste rastú o ${a}, čísla na 2., 4. mieste klesajú o ${b}.`, `Numbers in places 1, 3, 5 grow by ${a}, those in places 2, 4 fall by ${b}.`)], ex: [S(`Rozdeľ rad na dva: ${terms[0]}, ${terms[2]}, ${terms[4]} (rastie o ${a}) a ${terms[1]}, ${terms[3]}, ? (klesá o ${b}).`, `Split into two: ${terms[0]}, ${terms[2]}, ${terms[4]} (grows by ${a}) and ${terms[1]}, ${terms[3]}, ? (falls by ${b}).`), S(`Chýbajúce číslo je ${terms[3]} − ${b} = ${y - 2 * b}.`, `The missing number is ${terms[3]} − ${b} = ${y - 2 * b}.`)] }; },
  cube() { const terms = [1, 8, 27, 64, 125];
    return { terms, ans: 216, h: [S('Skús čísla, ktoré vzniknú trojnásobným násobením: 2 · 2 · 2…', 'Try numbers made by multiplying three times: 2 · 2 · 2…'), S('Sú to tretie mocniny: 1³, 2³, 3³…', 'They are cubes: 1³, 2³, 3³…')], ex: [S('Čísla sú 1³, 2³, 3³, 4³, 5³ – tretie mocniny.', 'The numbers are 1³, 2³, 3³, 4³, 5³ – cubes.'), S('Ďalšie je 6³ = 216.', 'The next is 6³ = 216.')] }; }
};
const SEQ_TIERS = { 1: ['add'], 2: ['add', 'mul', 'incr'], 3: ['incr', 'sq', 'mul'], 4: ['fib', 'inter', 'sq'], 5: ['fib', 'inter', 'cube', 'incr'] };
function genSeq(id, tier, band) {
  const r = rng(hash(id)), key = pick(SEQ_TIERS[Math.min(5, Math.max(1, tier))], r), p = SEQ[key](r);
  return { id, cat: 'seq', band, diff: Math.min(3, Math.ceil(tier / 2)), pts: 10 * Math.min(3, Math.ceil(tier / 2)), type: 'number', title: S('Číselný rad', 'Number pattern'), prompt: S('Aké číslo patrí na miesto otáznika?', 'Which number replaces the question mark?'),
    visual: `<div class="seqrow">${p.terms.map(x => `<span>${x}</span>`).join('<i>,</i>')}<i>,</i><span class="q">?</span></div>`, data: { answer: p.ans }, hints: p.h, explain: p.ex, src: GEN };
}

/* ------------ badges ------------ */
const BADGES = [
  { id: 'first', icon: '⭐', n: S('Prvá hviezda', 'First star'), d: S('Vyrieš svoju prvú úlohu.', 'Solve your first task.'), test: i => i.tot.done >= 1 },
  { id: 'ten', icon: '🔟', n: S('Desiatka', 'Ten tasks'), d: S('Dokonči 10 úloh.', 'Finish 10 tasks.'), test: i => i.tot.done >= 10 },
  { id: 'explorer', icon: '🧭', n: S('Objaviteľ', 'Explorer'), d: S('Dokonči 25 úloh.', 'Finish 25 tasks.'), test: i => i.tot.done >= 25 },
  { id: 'sharp', icon: '🎯', n: S('Bystré oko', 'Sharp mind'), d: S('Získaj 3 hviezdy v 5 úlohách.', 'Earn 3 stars on 5 tasks.'), test: i => Object.values(i.st.tasks).filter(t => t.stars === 3).length >= 5 },
  { id: 'persist', icon: '💪', n: S('Vytrvalec', 'Persistent'), d: S('Vyrieš úlohu aj po viacerých pokusoch.', 'Solve a task after several attempts.'), test: i => i.ss && i.ss.attempts >= 3 },
  { id: 'ferry', icon: '⛵', n: S('Kapitán', 'Captain'), d: S('Vyrieš úlohu o prevoze cez rieku.', 'Solve a river-crossing task.'), test: i => i.task && i.task.type === 'ferry' },
  { id: 'sudoku', icon: '🔲', n: S('Sudoku majster', 'Sudoku master'), d: S('Vyrieš sudoku.', 'Solve a sudoku.'), test: i => i.task && i.task.type === 'sudoku' },
  { id: 'maze', icon: '🚀', n: S('Navigátor', 'Navigator'), d: S('Nájdi najkratšiu cestu bludiskom.', 'Find the shortest path through a maze.'), test: i => i.task && i.task.type === 'maze' },
  { id: 'lights', icon: '💡', n: S('Elektrikár', 'Electrician'), d: S('Zhasni všetky svetlá.', 'Switch all the lights off.'), test: i => i.task && i.task.type === 'lights' },
  { id: 'allround', icon: '🌈', n: S('Všestranný', 'All-rounder'), d: S('Vyrieš úlohy z 5 rôznych kategórií.', 'Solve tasks from 5 different categories.'), test: i => new Set(Object.values(i.st.tasks).filter(t => t.done).map(t => t.cat)).size >= 5 },
  { id: 'streak3', icon: '🔥', n: S('Tri dni po sebe', 'Three-day streak'), d: S('Rieš úlohy 3 dni po sebe.', 'Solve tasks 3 days in a row.'), test: i => i.st.streak.count >= 3 },
  { id: 'pts500', icon: '💎', n: S('500 bodov', '500 points'), d: S('Získaj 500 bodov.', 'Earn 500 points.'), test: i => i.tot.points >= 500 },
  { id: 'daily', icon: '📅', n: S('Denný riešiteľ', 'Daily solver'), d: S('Vyrieš dennú výzvu.', 'Solve a daily challenge.'), test: i => i.daily },
  { id: 'level', icon: '🏅', n: S('Prvý level', 'First level'), d: S('Dokonči celý level.', 'Complete a whole level.'), test: i => i.levelDone },
  { id: 'brave', icon: '⚡', n: S('Odvážlivec', 'Daredevil'), d: S('Vyrieš úlohu z vyššieho ročníka.', 'Solve a task from a higher grade.'), test: i => i.challenge }
];
