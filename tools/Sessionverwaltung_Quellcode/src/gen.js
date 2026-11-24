/* DND5e Sessionverwaltung – NSC-Schnellgenerator (Daten + Logik, in Node testbar) */
(function (W) {
'use strict';
const rnd = () => Math.random();
const pick = a => a[Math.floor(rnd() * a.length)];
const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const d = (n, s) => { let t = 0; for (let i = 0; i < n; i++) t += rint(1, s); return t; };
function hash(s) { let h = 2166136261; s = String(s || ''); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function wpick(entries) { // [[value, weight]]
  const tot = entries.reduce((a, e) => a + Math.max(0, e[1]), 0); if (tot <= 0) return entries[0] && entries[0][0];
  let r = rnd() * tot; for (const e of entries) { r -= Math.max(0, e[1]); if (r <= 0) return e[0]; } return entries[entries.length - 1][0];
}
const L = (p, lang) => Array.isArray(p) ? (lang === 'en' ? (p[1] != null ? p[1] : p[0]) : p[0]) : p;

/* ---------- Völker (PHB) ---------- */
// adult = Erwachsenenalter, max = typische Höchstgrenze (PHB-Angaben)
const RACES = {
  human: { n: ['Mensch', 'Human'], adult: 18, max: 95, subs: [] },
  dwarf: { n: ['Zwerg', 'Dwarf'], adult: 50, max: 350, subs: [['Hügelzwerg', 'Hill Dwarf'], ['Bergzwerg', 'Mountain Dwarf']] },
  elf: { n: ['Elf', 'Elf'], adult: 100, max: 750, subs: [['Hochelf', 'High Elf'], ['Waldelf', 'Wood Elf'], ['Dunkelelf (Drow)', 'Dark Elf (Drow)']] },
  halfling: { n: ['Halbling', 'Halfling'], adult: 20, max: 150, subs: [['Leichtfuß', 'Lightfoot'], ['Robuster Halbling', 'Stout']] },
  dragonborn: { n: ['Drachenblütiger', 'Dragonborn'], adult: 15, max: 80, subs: [] },
  gnome: { n: ['Gnom', 'Gnome'], adult: 40, max: 450, subs: [['Waldgnom', 'Forest Gnome'], ['Felsgnom', 'Rock Gnome']] },
  halfelf: { n: ['Halbelf', 'Half-Elf'], adult: 20, max: 180, subs: [] },
  halforc: { n: ['Halbork', 'Half-Orc'], adult: 14, max: 75, subs: [] },
  tiefling: { n: ['Tiefling', 'Tiefling'], adult: 18, max: 105, subs: [] }
};
const RACE_KEYS = Object.keys(RACES);
const RACE_DEFAULT_W = { human: 50, halfling: 12, dwarf: 12, elf: 10, halfelf: 8, gnome: 6, halforc: 5, dragonborn: 3, tiefling: 3 };
function raceFromText(t) {
  const n = String(t || '').toLowerCase();
  if (!n) return null;
  if (/halbelf|half-?elf/.test(n)) return 'halfelf';
  if (/halbork|half-?orc/.test(n)) return 'halforc';
  if (/drachen|dragon/.test(n)) return 'dragonborn';
  if (/zwerg|dwarf/.test(n)) return 'dwarf';
  if (/halbling|halfling/.test(n)) return 'halfling';
  if (/gnom/.test(n)) return 'gnome';
  if (/tiefling/.test(n)) return 'tiefling';
  if (/elf|drow/.test(n)) return 'elf';
  if (/mensch|human/.test(n)) return 'human';
  return null;
}

/* ---------- Altersstufen ---------- */
const STAGES = [['jung', 'young'], ['erwachsen', 'adult'], ['mittleres Alter', 'middle-aged'], ['alt', 'old'], ['greis', 'venerable']];
const STAGE_Q = [[0, .12], [.12, .38], [.38, .62], [.62, .84], [.84, 1]];
function ageStage(race, age) {
  const R = RACES[race] || RACES.human; if (!(age > 0)) return -1;
  if (age < R.adult) return -2; // Kind/Jugendlich
  const q = (age - R.adult) / (R.max - R.adult);
  for (let i = 0; i < STAGE_Q.length; i++) if (q < STAGE_Q[i][1]) return i;
  return 4;
}
function stageLabel(race, age, lang) { const s = ageStage(race, age); if (s === -2) return lang === 'en' ? 'adolescent' : 'jugendlich'; if (s < 0) return ''; return L(STAGES[s], lang); }
function rollAge(race, prof) {
  const R = RACES[race] || RACES.human; const P = PROF_BY[prof];
  const w = (P && P.age) || [2, 4, 3, 1.5, .5];
  const st = wpick(w.map((x, i) => [i, x]));
  const [a, b] = STAGE_Q[st];
  return Math.round(R.adult + (R.max - R.adult) * (a + rnd() * (b - a)));
}

/* ---------- Reichtum (Lebensstil, PHB) ---------- */
const WEALTH = [
  { n: ['Elend', 'Wretched'], d: ['lebt auf der Straße, besitzt kaum mehr als die Kleider am Leib', 'lives on the street with little more than the clothes on their back'] },
  { n: ['Ärmlich', 'Squalid'], d: ['haust in einem undichten Verschlag, kämpft täglich ums Essen', 'lives in a leaky hovel, struggles for food every day'] },
  { n: ['Arm', 'Poor'], d: ['einfache Unterkunft, schlichte Kleidung, wenig Erspartes', 'simple lodging, plain clothes, little savings'] },
  { n: ['Bescheiden', 'Modest'], d: ['eigenes kleines Heim, ehrliches Auskommen', 'a small home of their own, an honest living'] },
  { n: ['Komfortabel', 'Comfortable'], d: ['gutes Haus, gute Kleidung, angesehen im Viertel', 'a good house, fine clothes, respected in the quarter'] },
  { n: ['Wohlhabend', 'Wealthy'], d: ['Diener, edle Stoffe, Einfluss in der Stadt', 'servants, fine fabrics, influence in town'] },
  { n: ['Aristokratisch', 'Aristocratic'], d: ['Prunk, Gefolge und Macht – Geld spielt keine Rolle', 'splendour, retinue and power – money is no object'] }
];
const CITY_WEALTH_SHIFT = { arm: -1, normal: 0, reich: 1, 'fürstlich': 1 };
function rollWealth(prof, cityWealth) {
  const P = PROF_BY[prof]; const [a, b] = P ? P.w : [2, 4];
  let v = rint(a, b); const sh = CITY_WEALTH_SHIFT[cityWealth] || 0;
  if (sh && rnd() < .6) v += sh;
  return Math.max(Math.max(0, a - 1), Math.min(Math.min(6, b + 1), v));
}
function rollPurse(w, lang) {
  const de = lang !== 'en'; const cp = de ? 'KM' : 'cp', sp = de ? 'SM' : 'sp', gp = de ? 'GM' : 'gp', pp = de ? 'PM' : 'pp';
  const parts = [];
  switch (+w) {
    case 0: { const n = rint(0, 6); parts.push(n ? n + ' ' + cp : (de ? 'keine Münze' : 'not a coin')); break; }
    case 1: parts.push(d(1, 10) + ' ' + cp); if (rnd() < .4) parts.push(d(1, 4) + ' ' + sp); break;
    case 2: parts.push(d(2, 6) + ' ' + sp, d(2, 10) + ' ' + cp); break;
    case 3: parts.push(d(1, 6) + ' ' + gp, d(2, 10) + ' ' + sp); break;
    case 4: parts.push(d(2, 10) + ' ' + gp, d(1, 20) + ' ' + sp); break;
    case 5: parts.push(d(4, 10) + ' ' + gp); if (rnd() < .5) parts.push(d(1, 4) + ' ' + pp); parts.push(pick(de ? ['ein Siegelring', 'ein kleiner Edelstein (50 GM)', 'eine silberne Taschenuhr'] : ['a signet ring', 'a small gem (50 gp)', 'a silver pocket watch'])); break;
    default: parts.push(d(1, 10) * 10 + ' ' + gp, d(2, 6) + ' ' + pp); parts.push(pick(de ? ['juwelenbesetzte Brosche (250 GM)', 'Wappenring aus Gold', 'Perlenkette (500 GM)'] : ['jewelled brooch (250 gp)', 'golden crest ring', 'pearl necklace (500 gp)']));
  }
  return parts.join(', ');
}

/* ---------- Berufe ---------- */
// k, [de m, de f], [en m, en f], w [min,max] (0–6), age (Gewichte der Altersstufen), sb (SRD-Werteblock), sur (Berufsname), title, grp
const PROFS = [
  { k: 'guard', de: ['Wache', 'Wache'], en: ['Guard', 'Guard'], w: [2, 3], age: [3, 5, 2, .6, 0], sb: 'guard', grp: 0 },
  { k: 'captain', de: ['Hauptmann der Wache', 'Hauptfrau der Wache'], en: ['Guard Captain', 'Guard Captain'], w: [3, 4], age: [.3, 3, 4, 1.5, .1], sb: 'veteran', grp: 0 },
  { k: 'soldier', de: ['Soldat', 'Soldatin'], en: ['Soldier', 'Soldier'], w: [2, 3], age: [4, 5, 1.5, .3, 0], sb: 'guard', grp: 0 },
  { k: 'knight', de: ['Ritter', 'Ritterin'], en: ['Knight', 'Knight'], w: [4, 5], age: [1.5, 4, 3, 1, .1], sb: 'knight', title: [['Sir', 'Dame', 'Sir'], ['Sir', 'Dame', 'Sir']], grp: 0 },
  { k: 'merc', de: ['Söldner', 'Söldnerin'], en: ['Mercenary', 'Mercenary'], w: [1, 3], age: [2, 5, 2.5, .5, 0], sb: 'thug', grp: 0 },
  { k: 'priest', de: ['Priester', 'Priesterin'], en: ['Priest', 'Priest'], w: [2, 4], age: [.6, 2.5, 4, 3, 1], sb: 'priest', title: [['Hochwürden', 'Hochwürden', 'Hochwürden'], ['Father', 'Mother', 'Reverend']], titleMin: 4, grp: 1 },
  { k: 'acolyte', de: ['Tempeldiener', 'Tempeldienerin'], en: ['Acolyte', 'Acolyte'], w: [1, 2], age: [5, 4, 1, .3, 0], sb: 'acolyte', grp: 1 },
  { k: 'healer', de: ['Heiler', 'Heilerin'], en: ['Healer', 'Healer'], w: [2, 3], age: [.8, 3, 4, 2.5, .6], sb: 'acolyte', grp: 1 },
  { k: 'innkeeper', de: ['Schankwirt', 'Schankwirtin'], en: ['Innkeeper', 'Innkeeper'], w: [2, 4], age: [.5, 3, 4, 2, .3], sb: 'commoner', grp: 2 },
  { k: 'server', de: ['Schankbursche', 'Schankmaid'], en: ['Barkeep', 'Barmaid'], w: [1, 2], age: [5, 4, 1, .2, 0], sb: 'commoner', grp: 2 },
  { k: 'cook', de: ['Koch', 'Köchin'], en: ['Cook', 'Cook'], w: [2, 3], age: [1.5, 4, 3, 1, .2], sb: 'commoner', grp: 2 },
  { k: 'merchant', de: ['Händler', 'Händlerin'], en: ['Merchant', 'Merchant'], w: [3, 5], age: [1, 4, 4, 1.5, .2], sb: 'commoner', grp: 3 },
  { k: 'shopkeeper', de: ['Krämer', 'Krämerin'], en: ['Shopkeeper', 'Shopkeeper'], w: [2, 3], age: [1, 4, 3.5, 1.5, .3], sb: 'commoner', grp: 3 },
  { k: 'peddler', de: ['Hausierer', 'Hausiererin'], en: ['Peddler', 'Peddler'], w: [1, 2], age: [2, 4, 3, 1.5, .4], sb: 'commoner', grp: 3 },
  { k: 'smith', de: ['Schmied', 'Schmiedin'], en: ['Blacksmith', 'Blacksmith'], w: [2, 3], age: [1.5, 4.5, 3.5, 1, .1], sb: 'commoner', sur: ['Schmied', 'Smith'], grp: 4 },
  { k: 'carpenter', de: ['Zimmermann', 'Zimmerin'], en: ['Carpenter', 'Carpenter'], w: [2, 3], age: [2, 4.5, 3, 1, .1], sb: 'commoner', sur: ['Zimmermann', 'Carpenter'], grp: 4 },
  { k: 'tailor', de: ['Schneider', 'Schneiderin'], en: ['Tailor', 'Tailor'], w: [2, 4], age: [1.5, 4, 3.5, 1.5, .3], sb: 'commoner', sur: ['Schneider', 'Taylor'], grp: 4 },
  { k: 'baker', de: ['Bäcker', 'Bäckerin'], en: ['Baker', 'Baker'], w: [2, 3], age: [1.5, 4, 3.5, 1.5, .2], sb: 'commoner', sur: ['Becker', 'Baker'], grp: 4 },
  { k: 'alchemist', de: ['Alchemist', 'Alchemistin'], en: ['Alchemist', 'Alchemist'], w: [3, 4], age: [.8, 3, 4, 2.5, .8], sb: 'commoner', grp: 4 },
  { k: 'farmer', de: ['Bauer', 'Bäuerin'], en: ['Farmer', 'Farmer'], w: [1, 3], age: [2.5, 4, 3, 1.5, .4], sb: 'commoner', grp: 5 },
  { k: 'hunter', de: ['Jäger', 'Jägerin'], en: ['Hunter', 'Hunter'], w: [1, 3], age: [2.5, 4.5, 3, 1, .2], sb: 'scout', sur: ['Jäger', 'Hunter'], grp: 5 },
  { k: 'fisher', de: ['Fischer', 'Fischerin'], en: ['Fisher', 'Fisher'], w: [1, 2], age: [2.5, 4, 3, 1.5, .4], sb: 'commoner', sur: ['Fischer', 'Fisher'], grp: 5 },
  { k: 'miner', de: ['Bergmann', 'Bergfrau'], en: ['Miner', 'Miner'], w: [1, 2], age: [2.5, 5, 2.5, .5, 0], sb: 'commoner', grp: 5 },
  { k: 'herbalist', de: ['Kräuterkundiger', 'Kräuterhexe'], en: ['Herbalist', 'Hedge Witch'], w: [1, 3], age: [.6, 2.5, 3, 3, 1.5], sb: 'druid', grp: 5 },
  { k: 'stablehand', de: ['Stallknecht', 'Stallmagd'], en: ['Stablehand', 'Stablehand'], w: [1, 2], age: [5, 4, 1, .3, 0], sb: 'commoner', grp: 5 },
  { k: 'sailor', de: ['Seemann', 'Seefrau'], en: ['Sailor', 'Sailor'], w: [1, 2], age: [3.5, 4.5, 2, .5, 0], sb: 'bandit', grp: 6 },
  { k: 'shipcaptain', de: ['Kapitän', 'Kapitänin'], en: ['Ship Captain', 'Ship Captain'], w: [3, 4], age: [.3, 3, 4, 2, .3], sb: 'bandit-captain', title: [['Käpt\'n', 'Käpt\'n', 'Käpt\'n'], ['Captain', 'Captain', 'Captain']], grp: 6 },
  { k: 'coachman', de: ['Kutscher', 'Kutscherin'], en: ['Coachman', 'Coachwoman'], w: [1, 2], age: [2, 4, 3, 1.5, .3], sb: 'commoner', grp: 6 },
  { k: 'king', de: ['König', 'Königin'], en: ['King', 'Queen'], w: [6, 6], age: [.6, 2.5, 4, 3, 1], sb: 'noble', title: [['König', 'Königin', 'Monarch'], ['King', 'Queen', 'Monarch']], noble: true, grp: 7 },
  { k: 'duke', de: ['Herzog', 'Herzogin'], en: ['Duke', 'Duchess'], w: [6, 6], age: [.6, 2.5, 4, 3, 1], sb: 'noble', title: [['Herzog', 'Herzogin', 'Durchlaucht'], ['Duke', 'Duchess', 'Highness']], noble: true, grp: 7 },
  { k: 'noble', de: ['Adliger', 'Adlige'], en: ['Noble', 'Noble'], w: [5, 6], age: [2, 3.5, 3, 1.5, .4], sb: 'noble', title: [['Graf', 'Gräfin', 'Hochgeboren'], ['Count', 'Countess', 'Lord'], ['Baron', 'Baronin', 'Hochgeboren'], ['Baron', 'Baroness', 'Lord']], noble: true, grp: 7 },
  { k: 'mayor', de: ['Bürgermeister', 'Bürgermeisterin'], en: ['Mayor', 'Mayor'], w: [4, 5], age: [.2, 2, 4, 3, .8], sb: 'noble', grp: 7 },
  { k: 'courtier', de: ['Höfling', 'Hofdame'], en: ['Courtier', 'Lady-in-waiting'], w: [4, 5], age: [2.5, 4, 2.5, 1, .2], sb: 'noble', grp: 7 },
  { k: 'taxman', de: ['Steuereintreiber', 'Steuereintreiberin'], en: ['Tax Collector', 'Tax Collector'], w: [3, 4], age: [1, 3.5, 4, 1.5, .2], sb: 'commoner', grp: 7 },
  { k: 'servant', de: ['Diener', 'Dienerin'], en: ['Servant', 'Servant'], w: [1, 2], age: [3, 4, 2.5, 1.5, .3], sb: 'commoner', grp: 7 },
  { k: 'wizard', de: ['Magier', 'Magierin'], en: ['Wizard', 'Wizard'], w: [3, 5], age: [.8, 2.5, 3.5, 3, 1.5], sb: 'mage', title: [['Magister', 'Magistra', 'Magister'], ['Magister', 'Magistra', 'Magister']], titleMin: 5, grp: 8 },
  { k: 'scholar', de: ['Gelehrter', 'Gelehrte'], en: ['Scholar', 'Scholar'], w: [2, 4], age: [1, 2.5, 3.5, 3, 1.2], sb: 'commoner', grp: 8 },
  { k: 'bard', de: ['Barde', 'Bardin'], en: ['Bard', 'Bard'], w: [1, 4], age: [3.5, 4, 2, .8, .2], sb: 'commoner', grp: 8 },
  { k: 'thief', de: ['Dieb', 'Diebin'], en: ['Thief', 'Thief'], w: [0, 2], age: [4.5, 4, 1.5, .3, 0], sb: 'spy', grp: 9 },
  { k: 'smuggler', de: ['Schmuggler', 'Schmugglerin'], en: ['Smuggler', 'Smuggler'], w: [1, 3], age: [2.5, 4.5, 2.5, .6, 0], sb: 'bandit', grp: 9 },
  { k: 'spy', de: ['Spion', 'Spionin'], en: ['Spy', 'Spy'], w: [2, 4], age: [2, 5, 2.5, .5, 0], sb: 'spy', grp: 9 },
  { k: 'cultist', de: ['Kultist', 'Kultistin'], en: ['Cultist', 'Cultist'], w: [1, 3], age: [3, 4, 2, 1, .2], sb: 'cultist', grp: 9 },
  { k: 'beggar', de: ['Bettler', 'Bettlerin'], en: ['Beggar', 'Beggar'], w: [0, 0], age: [2, 2.5, 2.5, 2.5, 1], sb: 'commoner', grp: 9 },
  { k: 'gravedigger', de: ['Totengräber', 'Totengräberin'], en: ['Gravedigger', 'Gravedigger'], w: [1, 2], age: [1, 3, 3, 2.5, .8], sb: 'commoner', grp: 9 },
  { k: 'gladiator', de: ['Gladiator', 'Gladiatorin'], en: ['Gladiator', 'Gladiator'], w: [2, 4], age: [3, 5, 1.5, .2, 0], sb: 'gladiator', grp: 0 }
];
const PROF_GROUPS = [['Wehr & Waffen', 'Arms'], ['Glaube & Heilung', 'Faith & Healing'], ['Wirtshaus', 'Tavern'], ['Handel', 'Trade'], ['Handwerk', 'Craft'], ['Land & Wildnis', 'Land & Wild'], ['Reise & See', 'Travel & Sea'], ['Hof & Verwaltung', 'Court & Office'], ['Wissen & Kunst', 'Lore & Art'], ['Schattenseite', 'Underworld']];
const PROF_BY = {}; PROFS.forEach(p => { PROF_BY[p.k] = p; });
function profLabel(k, gender, lang) { const P = PROF_BY[k]; if (!P) return k || ''; const arr = lang === 'en' ? P.en : P.de; return gender === 'f' ? arr[1] : arr[0]; }
function profFromText(t) {
  const n = String(t || '').trim().toLowerCase(); if (!n) return null;
  for (const p of PROFS) if (p.de.concat(p.en).some(x => x.toLowerCase() === n)) return p.k;
  return null;
}

/* ---------- Namen ---------- */
const CULTURES = {
  mid: { n: ['Mittelländisch', 'Midland'],
    m: ['Aldric', 'Bertram', 'Cedric', 'Dorian', 'Eamon', 'Falk', 'Gerold', 'Hagen', 'Ivo', 'Jorin', 'Konrad', 'Leopold', 'Magnus', 'Niklas', 'Oswin', 'Roderich', 'Severin', 'Tobias', 'Ulrich', 'Wendel', 'Anselm', 'Benedikt', 'Gottfried', 'Lambert'],
    f: ['Adela', 'Berit', 'Cordula', 'Elise', 'Gisela', 'Hedda', 'Ida', 'Johanna', 'Klara', 'Lene', 'Margit', 'Mechthild', 'Ottilie', 'Rosamund', 'Sieglinde', 'Theda', 'Ute', 'Wilma', 'Agnes', 'Brunhilde', 'Irmgard', 'Walburga'] },
  north: { n: ['Nordländisch', 'Northern'],
    m: ['Arne', 'Bjarke', 'Eirik', 'Gunnar', 'Halvar', 'Ingvar', 'Knut', 'Leif', 'Orm', 'Sten', 'Torvald', 'Ulf', 'Vidar', 'Asgeir', 'Hakon', 'Sigvald', 'Trygve', 'Yngvar'],
    f: ['Astrid', 'Brynja', 'Dagny', 'Eira', 'Frida', 'Gudrun', 'Hilde', 'Ingrid', 'Liv', 'Ragna', 'Sigrun', 'Solveig', 'Thyra', 'Yrsa', 'Alva', 'Runa', 'Svala', 'Tove'] },
  south: { n: ['Südländisch', 'Southern'],
    m: ['Adriano', 'Belisar', 'Cassian', 'Cosimo', 'Dario', 'Emilio', 'Fabian', 'Lucan', 'Marius', 'Orsino', 'Renzo', 'Sandro', 'Tiberio', 'Valerian', 'Aurelio', 'Matteo', 'Silvano'],
    f: ['Alessia', 'Bianca', 'Cassia', 'Giulia', 'Livia', 'Lucia', 'Marisa', 'Mirela', 'Nerina', 'Octavia', 'Serafina', 'Valeria', 'Viola', 'Chiara', 'Fiora', 'Ornella'] },
  east: { n: ['Östlich', 'Eastern'],
    m: ['Arkadi', 'Bogdan', 'Borys', 'Darian', 'Dragan', 'Jaromir', 'Kasimir', 'Lev', 'Miroslav', 'Radomir', 'Stanimir', 'Taras', 'Vadim', 'Zoran', 'Ilja', 'Wenzel'],
    f: ['Anja', 'Danica', 'Dunja', 'Jelena', 'Katarina', 'Ljuba', 'Milena', 'Mira', 'Nadja', 'Oksana', 'Radka', 'Svetla', 'Vesna', 'Zorya', 'Bozena', 'Irina'] }
};
const CULT_KEYS = Object.keys(CULTURES);
const SUR_PRE = [['Eichen', 'Oak'], ['Stein', 'Stone'], ['Raben', 'Raven'], ['Wolfs', 'Wolf'], ['Grün', 'Green'], ['Schwarz', 'Black'], ['Weiden', 'Willow'], ['Falken', 'Falcon'], ['Hirsch', 'Hart'], ['Sturm', 'Storm'], ['Rosen', 'Rose'], ['Birken', 'Birch'], ['Kupfer', 'Copper'], ['Mühl', 'Mill'], ['Nebel', 'Mist'], ['Dorn', 'Thorn'], ['Silber', 'Silver'], ['Eschen', 'Ash'], ['Hasel', 'Hazel'], ['Roth', 'Red']];
const SUR_SUF = [['bach', 'brook'], ['feld', 'field'], ['berg', 'hill'], ['brück', 'bridge'], ['hain', 'grove'], ['wald', 'wood'], ['furt', 'ford'], ['hag', 'hedge'], ['tal', 'dale'], ['hof', 'stead'], ['au', 'mead'], ['heim', 'ham'], ['mark', 'mark'], ['wies', 'meadow']];
const NICK = [['Krähe', 'Crow'], ['Funke', 'Spark'], ['Nadel', 'Needle'], ['Fuchs', 'Fox'], ['Maus', 'Mouse'], ['Rotbart', 'Redbeard'], ['Kessel', 'Kettle'], ['Hinkebein', 'Limpleg'], ['Flickenhut', 'Patchhat'], ['Spatz', 'Sparrow'], ['Knopf', 'Button'], ['Ratte', 'Rat'], ['Zwiebel', 'Onion'], ['Schatten', 'Shadow'], ['Glückspilz', 'Lucky'], ['Rübe', 'Turnip']];
const DW_M = ['Balgrim', 'Baldrek', 'Brokk', 'Durgal', 'Gorrik', 'Grimbold', 'Hrodgar', 'Korgan', 'Murdok', 'Skorri', 'Thrandur', 'Throm', 'Undrik', 'Vargrim', 'Dolgrin', 'Haldor', 'Torbek'];
const DW_F = ['Bodhild', 'Brekka', 'Dagna', 'Dorna', 'Durra', 'Gunnhild', 'Hjordis', 'Ketra', 'Marga', 'Ormhild', 'Ragnhild', 'Sigrid', 'Thyrna', 'Valda', 'Embra', 'Grenna'];
const DW_PRE = [['Eisen', 'Iron'], ['Stein', 'Stone'], ['Gold', 'Gold'], ['Amboss', 'Anvil'], ['Fels', 'Rock'], ['Glut', 'Ember'], ['Kohlen', 'Coal'], ['Erz', 'Ore'], ['Granit', 'Granite'], ['Donner', 'Thunder'], ['Bronze', 'Bronze'], ['Tiefen', 'Deep']];
const DW_SUF = [['faust', 'fist'], ['bart', 'beard'], ['schild', 'shield'], ['brecher', 'breaker'], ['hammer', 'hammer'], ['hand', 'hand'], ['helm', 'helm'], ['axt', 'axe'], ['stirn', 'brow'], ['schmied', 'forge']];
const EL_M = ['Aerendil', 'Caelith', 'Calithar', 'Elandor', 'Faelar', 'Ilvarin', 'Lathrin', 'Merethil', 'Nythras', 'Saelvan', 'Sylvarin', 'Vaerith', 'Ynvaril', 'Thaelis', 'Orivan', 'Elrevan'];
const EL_F = ['Aeloria', 'Arwyn', 'Celyndra', 'Elowen', 'Faenya', 'Ilyana', 'Lireth', 'Myrielle', 'Naeris', 'Nimuel', 'Sylvaine', 'Thalia', 'Vaelora', 'Ysmira', 'Eluné', 'Seraphel'];
const EL_PRE = [['Silber', 'Silver'], ['Mond', 'Moon'], ['Stern', 'Star'], ['Tau', 'Dew'], ['Nacht', 'Night'], ['Sommer', 'Summer'], ['Wind', 'Wind'], ['Morgen', 'Dawn'], ['Nebel', 'Mist'], ['Licht', 'Light'], ['Eichen', 'Oak']];
const EL_SUF = [['laub', 'leaf'], ['quell', 'spring'], ['blüte', 'blossom'], ['sang', 'song'], ['schein', 'glow'], ['zweig', 'bough'], ['wisper', 'whisper'], ['strom', 'stream'], ['blatt', 'petal']];
const HL_M = ['Barnabus', 'Cado', 'Corbin', 'Dunstan', 'Fennick', 'Ferris', 'Hobb', 'Jory', 'Merrin', 'Nobbin', 'Perrin', 'Rollo', 'Tobin', 'Wilco', 'Bodo', 'Ruppert'];
const HL_F = ['Amaryl', 'Bella', 'Clover', 'Daisy', 'Elsie', 'Hazel', 'Junia', 'Lavinia', 'Mirabel', 'Pansy', 'Poppy', 'Rosie', 'Tansy', 'Wren', 'Linnea', 'Petra'];
const HL_PRE = [['Distel', 'Thistle'], ['Hügel', 'Hill'], ['Apfel', 'Apple'], ['Honig', 'Honey'], ['Klee', 'Clover'], ['Butter', 'Butter'], ['Kessel', 'Kettle'], ['Brombeer', 'Bramble'], ['Pilz', 'Mushroom'], ['Weizen', 'Wheat']];
const HL_SUF = [['wolle', 'wool'], ['topf', 'pot'], ['fuß', 'foot'], ['hecke', 'hedge'], ['bach', 'brook'], ['kraut', 'herb'], ['busch', 'bush'], ['hügel', 'barrow']];
const DB_M1 = ['Ar', 'Bal', 'Dra', 'Ghe', 'Hes', 'Kri', 'Med', 'Nad', 'Pan', 'Rho', 'Sha', 'Tor', 'Vor', 'Zan'], DB_M2 = ['asar', 'rash', 'zan', 'thar', 'gar', 'kan', 'vor', 'juhr', 'mash', 'dorn', 'rix'];
const DB_F1 = ['Ak', 'Bi', 'Da', 'Far', 'Ha', 'Ka', 'Mi', 'Nal', 'Sor', 'Thav', 'Ur', 'Zy'], DB_F2 = ['ra', 'ideth', 'shann', 'ideh', 'ina', 'nara', 'irith', 'essa', 'vys'];
const DB_C1 = ['Del', 'Ker', 'Myas', 'Nor', 'Ophin', 'Prex', 'Tur', 'Yar', 'Ves', 'Zhar', 'Daar', 'Kim'], DB_C2 = ['mirev', 'rhylon', 'tarsis', 'ixius', 'jerin', 'lynn', 'thar', 'inax', 'kesh', 'orrim'];
const GN_M1 = ['Al', 'Bod', 'Bur', 'Dim', 'Fon', 'Glim', 'Ner', 'Orr', 'Seeb', 'Wre', 'Zook', 'Fizz', 'Tock'], GN_M2 = ['ble', 'dle', 'bo', 'nik', 'wick', 'ston', 'kin', 'ry', 'lo', 'mo'];
const GN_F1 = ['Bim', 'Car', 'Ell', 'Lil', 'Lor', 'Mar', 'Nis', 'Or', 'Roy', 'Tan', 'Wal', 'Zin', 'Pim'], GN_F2 = ['bi', 'ella', 'ywyn', 'ri', 'illa', 'etta', 'anna', 'ina', 'ix', 'wen'];
const GN_PRE = [['Zahnrad', 'Cog'], ['Funken', 'Spark'], ['Kessel', 'Kettle'], ['Glimmer', 'Glimmer'], ['Tüftel', 'Tinker'], ['Kupfer', 'Copper'], ['Pilz', 'Toadstool'], ['Zwirbel', 'Twirl']];
const GN_SUF = [['dreh', 'spin'], ['pfeif', 'whistle'], ['nadel', 'needle'], ['knopf', 'button'], ['wirbel', 'whirl'], ['funk', 'fizzle'], ['schraub', 'bolt']];
const HO_M = ['Brug', 'Drakk', 'Durm', 'Gorm', 'Grisk', 'Hruk', 'Krag', 'Morg', 'Narg', 'Skarn', 'Thrug', 'Urzog', 'Vurk', 'Zagash'];
const HO_F = ['Azka', 'Bruga', 'Drashka', 'Grenna', 'Hulga', 'Kansa', 'Murza', 'Ogra', 'Shara', 'Teska', 'Urga', 'Vola', 'Yeska', 'Zurra'];
const HO_PRE = [['Blut', 'Blood'], ['Knochen', 'Bone'], ['Eisen', 'Iron'], ['Schädel', 'Skull'], ['Asche', 'Ash'], ['Narben', 'Scar'], ['Stein', 'Stone']];
const HO_SUF = [['zahn', 'tusk'], ['brecher', 'breaker'], ['spalter', 'splitter'], ['faust', 'fist'], ['kiefer', 'jaw'], ['heuler', 'howl']];
const TF_M1 = ['Ak', 'Bar', 'Dam', 'Ek', 'Ka', 'Leu', 'Mor', 'Ska', 'Mel', 'Zar', 'Vel', 'Az', 'Kor'], TF_M2 = ['menos', 'akas', 'aios', 'emnon', 'airon', 'cus', 'eth', 'iel', 'oth', 'avor'];
const TF_F1 = ['Ak', 'Bry', 'Cri', 'Dam', 'Ea', 'Kal', 'Lery', 'Mak', 'Nem', 'Ori', 'Riet', 'Sey'], TF_F2 = ['ta', 'seis', 'ella', 'aia', 'thea', 'lista', 'aria', 'iza', 'ess', 'ira'];
const TF_VIRTUE = [['Asche', 'Ash'], ['Demut', 'Humility'], ['Ehre', 'Honor'], ['Glut', 'Ember'], ['Hoffnung', 'Hope'], ['Klage', 'Lament'], ['Mut', 'Valor'], ['Sehnsucht', 'Longing'], ['Stille', 'Silence'], ['Treue', 'Fidelity'], ['Wehmut', 'Sorrow'], ['Zweifel', 'Doubt'], ['Zuversicht', 'Faith'], ['Rätsel', 'Riddle'], ['Gnade', 'Mercy']];
const ROMAN = ['I.', 'II.', 'III.', 'IV.', 'V.', 'VI.'];

function comp(pre, suf, lang, avoid) {
  for (let i = 0; i < 8; i++) {
    const p = pick(pre), s = pick(suf); const de = p[0] + s[0], en = p[1] + s[1];
    if (p[0].toLowerCase().replace(/s$/, '') === s[0] || p[1].toLowerCase() === s[1] || (avoid && de.toLowerCase() === String(avoid).toLowerCase())) continue;
    return lang === 'en' ? en : de;
  }
  const p = pick(pre), s = pick(suf); return lang === 'en' ? p[1] + s[1] : p[0] + s[0];
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
function cultureFor(city) { if (!city) return pick(CULT_KEYS); return CULT_KEYS[hash(String(city).trim().toLowerCase()) % CULT_KEYS.length]; }
function gPick(g, m, f) { return g === 'f' ? pick(f) : g === 'm' ? pick(m) : pick(rnd() < .5 ? m : f); }
function humanSurname(cult, g, lang, P) {
  if (cult === 'north') { const fa = pick(CULTURES.north.m); return fa + (g === 'f' ? 'sdottir' : g === 'm' ? 'sson' : pick(['sson', 'sdottir'])); }
  if (cult === 'south') return pick(['Al', 'Ca', 'Do', 'Fe', 'Mo', 'Sa', 'Ve', 'Lo', 'Ri', 'Ba', 'Ta']) + pick(['bre', 'sta', 'ra', 'ru', 'nta', 'lvi', 'ce', 'va', 'ri']) + pick(['nza', 'lli', 'nti', 'cci', 'ro', 'ti', 'no', 'lla', 'rdi']);
  if (cult === 'east') { const b = pick(['Volk', 'Zar', 'Mir', 'Dragom', 'Bel', 'Kras', 'Stan', 'Jar', 'Rad', 'Vlad', 'Bor', 'Les']); const s = pick(['ov', 'ev', 'in', 'ski']); const fem = g === 'f' || (g === 'x' && rnd() < .5); return b + (fem ? { ov: 'ova', ev: 'eva', in: 'ina', ski: 'ska' }[s] : s); }
  if (P && P.sur && rnd() < .35) return L(P.sur, lang);
  return comp(SUR_PRE, SUR_SUF, lang);
}
function givenName(race, g, cult) {
  switch (race) {
    case 'dwarf': return gPick(g, DW_M, DW_F);
    case 'elf': return gPick(g, EL_M, EL_F);
    case 'halfling': return gPick(g, HL_M, HL_F);
    case 'dragonborn': return g === 'f' || (g === 'x' && rnd() < .5) ? pick(DB_F1) + pick(DB_F2) : pick(DB_M1) + pick(DB_M2);
    case 'gnome': return g === 'f' || (g === 'x' && rnd() < .5) ? pick(GN_F1) + pick(GN_F2) : pick(GN_M1) + pick(GN_M2);
    case 'halforc': return rnd() < .7 ? gPick(g, HO_M, HO_F) : gPick(g, CULTURES[cult].m, CULTURES[cult].f);
    case 'halfelf': return rnd() < .5 ? gPick(g, EL_M, EL_F) : gPick(g, CULTURES[cult].m, CULTURES[cult].f);
    case 'tiefling': return g === 'f' || (g === 'x' && rnd() < .5) ? pick(TF_F1) + pick(TF_F2) : pick(TF_M1) + pick(TF_M2);
    default: return gPick(g, CULTURES[cult].m, CULTURES[cult].f);
  }
}
/* Name nach Volk, Stadt (Namenskultur, Adelssitz) und Stand (Reichtum, Beruf) */
function rollName(o, lang) {
  o = o || {}; const race = RACES[o.race] ? o.race : 'human'; const g = o.gender || pick(['m', 'f']);
  const w = o.wealth == null ? 3 : +o.wealth; const P = PROF_BY[o.prof]; const cult = cultureFor(o.city);
  const en = lang === 'en';
  let given = givenName(race, g, cult);
  if (race === 'tiefling' && rnd() < .3) given = L(pick(TF_VIRTUE), lang);
  let sur = '';
  switch (race) {
    case 'dwarf': sur = comp(DW_PRE, DW_SUF, lang); break;
    case 'elf': sur = comp(EL_PRE, EL_SUF, lang); break;
    case 'halfling': sur = comp(HL_PRE, HL_SUF, lang); break;
    case 'dragonborn': sur = pick(DB_C1) + pick(DB_C2); break;
    case 'gnome': sur = comp(GN_PRE, GN_SUF, lang); break;
    case 'halforc': sur = w >= 3 ? humanSurname(cult, g, lang, P) : comp(HO_PRE, HO_SUF, lang); break;
    case 'halfelf': sur = rnd() < .6 ? humanSurname(cult, g, lang, P) : comp(EL_PRE, EL_SUF, lang); break;
    case 'tiefling': sur = w >= 3 ? humanSurname(cult, g, lang, P) : ''; break;
    default: sur = humanSurname(cult, g, lang, P);
  }
  const gi = g === 'f' ? 1 : g === 'm' ? 0 : 2;
  // Stand
  if (w <= 1) { // keine Familie, eher Spitzname
    const nick = L(pick(NICK), lang);
    return rnd() < .6 ? given + ' „' + nick + '“' : given + (race === 'dwarf' || race === 'dragonborn' ? ' ' + sur : '');
  }
  if (w === 2 && rnd() < .35 && race !== 'dwarf' && race !== 'dragonborn') return given + ' „' + L(pick(NICK), lang) + '“';
  let name = given + (sur ? ' ' + sur : '');
  const noble = P && P.noble || w >= 6;
  if (noble || (w >= 5 && rnd() < .45)) {
    const seat = o.city && rnd() < .45 ? String(o.city).trim() : (sur || comp(SUR_PRE, SUR_SUF, lang));
    name = given + (en ? ' of ' : ' von ') + seat;
    if (o.prof === 'king' && rnd() < .6) name = given + ' ' + pick(ROMAN) + (en ? ' of ' : ' von ') + seat;
  }
  if (P && P.title && w >= (P.titleMin || 0)) {
    const tl = P.title.length > 2 ? pick([0, 2]) : 0; const t = (en ? P.title[tl + 1] : P.title[tl])[gi];
    name = t + ' ' + name;
  } else if (noble && !(P && P.title)) {
    name = (en ? ['Lord', 'Lady', 'Lord'] : ['Herr', 'Frau', ''])[gi] + (gi === 2 && !en ? '' : ' ') + name;
    name = name.trim();
  }
  return name;
}

/* ---------- Charaktereigenschaften ---------- */
const TRAITS = {
  look: { n: ['Aussehen', 'Appearance'], v: [
    ['Auffällige Narbe quer über die Wange', 'A prominent scar across one cheek'], ['Trägt Schmuck, der nicht zum Stand passt', 'Wears jewellery that doesn\'t fit their station'], ['Wildes, ungekämmtes Haar', 'Wild, uncombed hair'], ['Tadellos gekleidet, kein Fleck auf dem Gewand', 'Impeccably dressed, not a spot on their clothes'],
    ['Fehlender Finger an der linken Hand', 'Missing a finger on the left hand'], ['Tätowierungen bis an den Hals', 'Tattoos up to the neck'], ['Ungewöhnliche Augenfarbe (bernstein, violett)', 'Unusual eye colour (amber, violet)'], ['Riecht stark nach Kräutern oder Rauch', 'Smells strongly of herbs or smoke'],
    ['Sehr groß und leicht gebeugt', 'Very tall and slightly stooped'], ['Klein und drahtig, immer in Bewegung', 'Small and wiry, always moving'], ['Trägt eine Augenklappe', 'Wears an eyepatch'], ['Abgetragene Kleidung, sorgsam geflickt', 'Worn clothes, carefully mended'],
    ['Breites Kreuz und Hände wie Schaufeln', 'Broad shoulders and hands like shovels'], ['Auffälliger Hut mit Feder', 'A striking feathered hat'], ['Sommersprossen und ein schiefes Lächeln', 'Freckles and a crooked smile'], ['Graue Strähne im ansonsten dunklen Haar', 'A grey streak in otherwise dark hair'],
    ['Zittrige Hände', 'Trembling hands'], ['Trägt stets Handschuhe', 'Always wears gloves'], ['Stattlicher, gepflegter Bart oder kunstvolle Zöpfe', 'A grand, well-kept beard or elaborate braids'], ['Abgekaute Fingernägel und dunkle Augenringe', 'Bitten nails and dark rings under the eyes']] },
  pers: { n: ['Persönlichkeit', 'Personality'], v: [
    ['Herzlich und redselig, kennt jeden im Viertel', 'Warm and chatty, knows everyone in the quarter'], ['Misstrauisch gegenüber Fremden', 'Suspicious of strangers'], ['Ruhig, nachdenklich, spricht wenig', 'Calm and thoughtful, says little'], ['Aufbrausend, aber schnell wieder versöhnt', 'Hot-tempered, but quick to make up'],
    ['Übertrieben höflich und förmlich', 'Excessively polite and formal'], ['Neugierig, stellt ständig Fragen', 'Curious, constantly asks questions'], ['Zynisch, erwartet stets das Schlimmste', 'Cynical, always expects the worst'], ['Fröhlich, lacht über die eigenen Witze', 'Cheerful, laughs at their own jokes'],
    ['Ehrgeizig und berechnend', 'Ambitious and calculating'], ['Nervös und schreckhaft', 'Nervous and jumpy'], ['Stolz bis zur Arroganz', 'Proud to the point of arrogance'], ['Sanftmütig und hilfsbereit', 'Gentle and helpful'],
    ['Abergläubisch, sieht überall Zeichen', 'Superstitious, sees omens everywhere'], ['Pragmatisch und direkt', 'Pragmatic and blunt'], ['Melancholisch, schwelgt in alten Zeiten', 'Melancholic, dwells on the old days'], ['Großspurig, übertreibt maßlos', 'Boastful, wildly exaggerates'],
    ['Geizig, feilscht um jeden Kupferling', 'Stingy, haggles over every copper'], ['Verträumt, oft mit den Gedanken woanders', 'Dreamy, often lost in thought'], ['Streng und pflichtbewusst', 'Strict and dutiful'], ['Verschmitzt, liebt kleine Streiche', 'Mischievous, loves small pranks']] },
  quirk: { n: ['Eigenart', 'Mannerism'], v: [
    ['Summt bei der Arbeit immer dieselbe Melodie', 'Always hums the same tune while working'], ['Spielt ständig mit einer Münze', 'Constantly fiddles with a coin'], ['Zitiert Sprichwörter – oft falsch', 'Quotes proverbs – often wrongly'], ['Kaut auf einem Grashalm oder Pfeifenstiel', 'Chews on a straw or pipe stem'],
    ['Nennt alle „mein Freund“', 'Calls everyone "my friend"'], ['Kratzt sich am Ohr, wenn gelogen wird', 'Scratches an ear when lying'], ['Spricht von sich in der dritten Person', 'Refers to themself in the third person'], ['Zählt beim Reden an den Fingern ab', 'Counts on their fingers while talking'],
    ['Flucht blumig bei jeder Gelegenheit', 'Swears colourfully at every opportunity'], ['Bietet ungefragt Essen an', 'Offers food unasked'], ['Hält ununterbrochen Blickkontakt', 'Holds unbroken eye contact'], ['Weicht jedem Blick aus', 'Avoids every glance'],
    ['Streichelt ein Haustier (Katze, Ratte, Rabe)', 'Strokes a pet (cat, rat, raven)'], ['Schnippt mit den Fingern, wenn ihm/ihr etwas einfällt', 'Snaps their fingers when an idea strikes'], ['Verwechselt ständig Namen', 'Constantly mixes up names'], ['Putzt unablässig etwas', 'Is always cleaning something']] },
  voice: { n: ['Sprechweise', 'Voice'], v: [
    ['Tiefe, brummige Stimme', 'Deep, gruff voice'], ['Hohe, schnelle Stimme', 'High, rapid voice'], ['Flüstert fast nur', 'Almost always whispers'], ['Laut, als stünde man auf einem Marktplatz', 'Loud, as if standing in a market square'],
    ['Starker ländlicher Dialekt', 'Thick rural dialect'], ['Gewählte, gestelzte Ausdrucksweise', 'Elaborate, stilted phrasing'], ['Lispelt leicht', 'A slight lisp'], ['Lange Pausen mitten im Satz', 'Long pauses mid-sentence'],
    ['Singender Tonfall', 'A sing-song tone'], ['Kurz angebunden, nur das Nötigste', 'Curt, only what\'s necessary'], ['Kichert nervös zwischen den Sätzen', 'Giggles nervously between sentences'], ['Spricht mit fremdem Akzent', 'Speaks with a foreign accent'],
    ['Heiser, räuspert sich ständig', 'Hoarse, constantly clears their throat'], ['Sanft und beruhigend', 'Soft and soothing']] },
  ideal: { n: ['Ideal', 'Ideal'], v: [
    ['Familie geht über alles', 'Family comes first'], ['Ordnung – ohne Gesetze herrscht Chaos', 'Order – without laws there is chaos'], ['Freiheit – niemand soll in Ketten liegen', 'Freedom – no one should be in chains'], ['Gold – alles hat seinen Preis', 'Gold – everything has its price'],
    ['Glaube – die Götter lenken alles', 'Faith – the gods guide everything'], ['Ehre – ein Wort ist ein Wort', 'Honour – a word given is a word kept'], ['Wissen – Unwissenheit ist die größte Gefahr', 'Knowledge – ignorance is the greatest danger'], ['Gemeinschaft – wir halten zusammen', 'Community – we stand together'],
    ['Macht – nur die Starken überleben', 'Power – only the strong survive'], ['Tradition – so war es immer', 'Tradition – it has always been this way'], ['Schönheit – Kunst macht das Leben lebenswert', 'Beauty – art makes life worth living'], ['Gerechtigkeit – Unrecht darf nicht ungesühnt bleiben', 'Justice – wrongs must not go unpunished'],
    ['Genuss – man lebt nur einmal', 'Pleasure – you only live once'], ['Wohltätigkeit – den Schwachen helfen', 'Charity – help those who are weak']] },
  bond: { n: ['Bindung', 'Bond'], v: [
    ['Sorgt für ein krankes Familienmitglied', 'Cares for a sick family member'], ['Schuldet einem Gildenmeister viel Geld', 'Owes a guild master a lot of money'], ['Liebt heimlich jemanden aus einem anderen Stand', 'Secretly loves someone of another station'], ['Ist der örtlichen Kirche zutiefst verbunden', 'Is deeply devoted to the local temple'],
    ['Hütet ein Erbstück der Familie', 'Guards a family heirloom'], ['Will den Tod eines Freundes rächen', 'Wants to avenge a friend\'s death'], ['Ist seinem/ihrem Lehrmeister treu ergeben', 'Is utterly loyal to their mentor'], ['Hängt an der eigenen Werkstatt / dem eigenen Laden', 'Is attached to their workshop or shop'],
    ['Sucht ein verschollenes Geschwister', 'Searches for a lost sibling'], ['Dient einem Adelshaus seit Generationen', 'Their family has served a noble house for generations'], ['Gehört einer verbotenen Gemeinschaft an', 'Belongs to a forbidden fellowship'], ['Fühlt sich der Stadt und ihren Bewohnern verpflichtet', 'Feels bound to the town and its people'],
    ['Zieht ein Waisenkind groß', 'Is raising an orphan'], ['Hat einem Sterbenden ein Versprechen gegeben', 'Made a promise to a dying person']] },
  flaw: { n: ['Makel', 'Flaw'], v: [
    ['Trinkt zu viel', 'Drinks too much'], ['Kann ein Geheimnis nicht für sich behalten', 'Can\'t keep a secret'], ['Spielsüchtig – würfelt um alles', 'Addicted to gambling – bets on anything'], ['Feige, wenn es ernst wird', 'Cowardly when things get serious'],
    ['Neidisch auf den Erfolg anderer', 'Envious of others\' success'], ['Lügt aus Gewohnheit, auch grundlos', 'Lies out of habit, even for no reason'], ['Hält sich für klüger als alle anderen', 'Thinks they\'re smarter than everyone'], ['Nachtragend – vergisst nie eine Kränkung', 'Holds grudges – never forgets a slight'],
    ['Gierig, kann Gold nicht widerstehen', 'Greedy, can\'t resist gold'], ['Vorurteile gegenüber einem bestimmten Volk', 'Prejudiced against a certain people'], ['Leichtgläubig', 'Gullible'], ['Jähzornig', 'Quick to anger'],
    ['Unterwürfig gegenüber Mächtigen', 'Servile towards the powerful'], ['Faul, sucht immer den leichtesten Weg', 'Lazy, always looks for the easy way'], ['Eitel, braucht ständig Bewunderung', 'Vain, constantly needs admiration'], ['Paranoid, wittert überall Verrat', 'Paranoid, smells betrayal everywhere']] },
  goal: { n: ['Ziel / Motivation', 'Goal / Motivation'], v: [
    ['Will genug sparen, um die Stadt zu verlassen', 'Wants to save enough to leave town'], ['Möchte in eine angesehene Gilde aufgenommen werden', 'Wants to join a respected guild'], ['Sucht jemanden, der ein altes Unrecht aufklärt', 'Looks for someone to right an old wrong'], ['Will den Konkurrenten ausstechen', 'Wants to outdo a rival'],
    ['Träumt von einem Leben als Abenteurer', 'Dreams of a life of adventure'], ['Braucht dringend Geld für eine Schuld', 'Urgently needs money to pay a debt'], ['Will die Hand eines/einer Geliebten gewinnen', 'Wants to win a beloved\'s hand'], ['Will einfach seine/ihre Ruhe', 'Just wants to be left alone'],
    ['Strebt nach einem Amt im Stadtrat', 'Aims for a seat on the town council'], ['Will ein verlorenes Familienerbstück zurück', 'Wants a lost heirloom back'], ['Sucht ein Heilmittel', 'Is searching for a cure'], ['Will einen Fluch loswerden', 'Wants to be rid of a curse'],
    ['Möchte den eigenen Ruf wiederherstellen', 'Wants to restore their reputation'], ['Will Wissen über ein bestimmtes Rätsel', 'Wants knowledge about a particular mystery']] },
  secret: { n: ['Geheimnis', 'Secret'], v: [
    ['Ist in Wahrheit von adliger Abstammung', 'Is secretly of noble birth'], ['Hat einst einen Mord beobachtet und geschwiegen', 'Once witnessed a murder and stayed silent'], ['Arbeitet heimlich für die Diebesgilde', 'Secretly works for the thieves\' guild'], ['Lebt unter falschem Namen', 'Lives under a false name'],
    ['Besitzt eine Karte zu einem verborgenen Ort', 'Owns a map to a hidden place'], ['Betet heimlich zu einer dunklen Gottheit', 'Secretly prays to a dark deity'], ['Ist hoch verschuldet', 'Is deeply in debt'], ['Hat magische Begabung, die niemand kennen darf', 'Has a magical gift nobody may know about'],
    ['Ist Spitzel der Obrigkeit', 'Is an informant for the authorities'], ['Hat einen Zwilling, von dem niemand weiß', 'Has a twin nobody knows about'], ['Hat etwas Wertvolles gestohlen und versteckt', 'Stole something valuable and hid it'], ['Wird erpresst', 'Is being blackmailed'],
    ['Weiß von einem Geheimgang unter der Stadt', 'Knows of a secret passage beneath the town'], ['Kein Geheimnis – ein offenes Buch', 'No secret – an open book']] },
  talent: { n: ['Talent', 'Talent'], v: [
    ['Spielt meisterhaft ein Instrument', 'Plays an instrument masterfully'], ['Kennt jedes Gerücht der Stadt', 'Knows every rumour in town'], ['Hervorragender Koch', 'Excellent cook'], ['Kann Schlösser knacken', 'Can pick locks'],
    ['Spricht viele Sprachen', 'Speaks many languages'], ['Unschlagbar beim Würfelspiel', 'Unbeatable at dice'], ['Fälscht Handschriften perfekt', 'Forges handwriting perfectly'], ['Kennt sich mit Kräutern und Giften aus', 'Knows herbs and poisons'],
    ['Erstaunliches Gedächtnis für Gesichter', 'Remarkable memory for faces'], ['Geschickter Reiter', 'Skilled rider'], ['Kann Wetter am Himmel ablesen', 'Can read the weather in the sky'], ['Talentierter Geschichtenerzähler', 'Gifted storyteller'],
    ['Kräftig wie ein Ochse', 'Strong as an ox'], ['Kann jedes Tier beruhigen', 'Can calm any animal']] },
  attitude: { n: ['Haltung zur Gruppe', 'Attitude to the party'], v: [
    ['Freundlich – freut sich über Kundschaft', 'Friendly – happy to have customers'], ['Gleichgültig – will nur das Geschäft', 'Indifferent – just wants the business done'], ['Misstrauisch – Abenteurer bedeuten Ärger', 'Wary – adventurers mean trouble'], ['Hilfsbereit – braucht aber selbst Hilfe', 'Helpful – but needs help too'],
    ['Feindselig – hat schlechte Erfahrungen gemacht', 'Hostile – has had bad experiences'], ['Bewundernd – hält die Gruppe für Helden', 'Admiring – thinks the party are heroes'], ['Berechnend – will die Gruppe für eigene Zwecke nutzen', 'Calculating – wants to use the party'], ['Ängstlich – hofft, dass sie bald gehen', 'Fearful – hopes they leave soon'],
    ['Neugierig – will alles über ihre Reisen wissen', 'Curious – wants to hear all about their travels'], ['Herablassend – hält sie für Gesindel', 'Condescending – thinks they\'re riff-raff']] },
  rumor: { n: ['Weiß / Gerücht', 'Knows / Rumour'], v: [
    ['Im alten Brunnen sollen nachts Stimmen zu hören sein', 'Voices are said to come from the old well at night'], ['Ein Händler zahlt Gold für seltsame Pilze aus dem Wald', 'A merchant pays gold for strange mushrooms from the woods'], ['Die Wache nimmt Bestechungsgeld an', 'The watch takes bribes'], ['Auf der Nordstraße verschwinden Reisende', 'Travellers are disappearing on the north road'],
    ['Im Tempel wurde ein heiliges Relikt gestohlen', 'A holy relic was stolen from the temple'], ['Ein Fremder in Grau fragt nach den Helden', 'A stranger in grey is asking about the heroes'], ['Der Bürgermeister trifft sich heimlich mit Schmugglern', 'The mayor meets with smugglers in secret'], ['In der Mine hat man eine versiegelte Tür gefunden', 'A sealed door was found in the mine'],
    ['Die Preise steigen, weil die Ernte verdorben ist', 'Prices are rising because the harvest is blighted'], ['Ein Drache wurde über den Bergen gesehen', 'A dragon was seen over the mountains'], ['Das Gasthaus am Fluss ist ein Treffpunkt von Kultisten', 'The riverside inn is a cultist meeting place'], ['Eine alte Frau im Hafen kann angeblich die Zukunft sehen', 'An old woman at the harbour can supposedly see the future'],
    ['Weiß nichts – oder tut zumindest so', 'Knows nothing – or pretends not to'], ['Hat gehört, dass die Gilde neue Leute sucht', 'Heard that the guild is recruiting']] }
};
const TRAIT_KEYS = Object.keys(TRAITS);
function rollTrait(k, lang, not) { const T = TRAITS[k]; if (!T) return ''; let v; for (let i = 0; i < 6; i++) { v = L(pick(T.v), lang); if (v !== not) break; } return v; }
function genders() { return [['m', ['männlich', 'male']], ['f', ['weiblich', 'female']], ['x', ['divers', 'non-binary']]]; }
function rollRace(cityRaces) {
  // cityRaces: [{n:'Mensch', p:60}, ...] (Atlas)
  const ent = [];
  if (Array.isArray(cityRaces) && cityRaces.length) cityRaces.forEach(r => { const k = raceFromText(r.n); if (k && r.p > 0) ent.push([k, r.p]); });
  if (!ent.length) RACE_KEYS.forEach(k => ent.push([k, RACE_DEFAULT_W[k]]));
  return wpick(ent);
}
/* Kompletter NSC (gesperrte Felder bleiben erhalten) */
function rollNpc(cur, ctx, lang) {
  cur = cur || {}; ctx = ctx || {}; const lock = cur.lock || {}; const n = Object.assign({}, cur); n.traits = Object.assign({}, cur.traits || {}); n.lock = Object.assign({}, lock);
  if (!lock.prof && !n.prof) n.prof = pick(PROFS).k;
  if (!lock.gender) n.gender = pick(['m', 'f', 'm', 'f', 'x'].slice(0, rnd() < .06 ? 5 : 4));
  if (!lock.race) n.race = rollRace(ctx.cityRaces);
  if (!lock.sub) { const R = RACES[n.race]; n.sub = R && R.subs.length ? rint(0, R.subs.length - 1) : -1; }
  if (!lock.age) n.age = rollAge(n.race, n.prof);
  if (!lock.wealth) n.wealth = rollWealth(n.prof, ctx.cityWealth);
  if (!lock.purse) n.purse = rollPurse(n.wealth, lang);
  if (!lock.name) n.name = rollName({ race: n.race, gender: n.gender, wealth: n.wealth, prof: n.prof, city: n.city }, lang);
  TRAIT_KEYS.forEach(k => { if (!(n.lock['t_' + k])) n.traits[k] = rollTrait(k, lang, n.traits[k]); });
  return n;
}
function playHint(n, lang) {
  const t = n.traits || {}; const en = lang === 'en';
  const parts = [];
  if (t.pers) parts.push(t.pers); if (t.voice) parts.push(t.voice); if (t.quirk) parts.push(t.quirk);
  let s = parts.join(' · ');
  if (t.goal) s += (s ? (en ? ' — goal: ' : ' — Ziel: ') : '') + t.goal;
  return s;
}
function statBlock(prof) { const P = PROF_BY[prof]; return P ? P.sb : 'commoner'; }

const API = { RACES, RACE_KEYS, STAGES, WEALTH, PROFS, PROF_BY, PROF_GROUPS, CULTURES, TRAITS, TRAIT_KEYS, L, hash, pick, rint, ageStage, stageLabel, rollAge, rollWealth, rollPurse, rollName, rollTrait, rollRace, rollNpc, raceFromText, profLabel, profFromText, cultureFor, genders, playHint, statBlock };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else W.SV_GEN = API;
})(typeof window !== 'undefined' ? window : globalThis);
