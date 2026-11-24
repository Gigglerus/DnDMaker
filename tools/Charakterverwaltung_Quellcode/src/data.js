/* Regeldaten D&D 5e (PHB 2014 / SRD 5.1) – nur Spielmechanik. */
(function (W) {
'use strict';
const ABIL = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const ABIL_N = { STR: ['Stärke', 'Strength', 'ST', 'STR'], DEX: ['Geschicklichkeit', 'Dexterity', 'GE', 'DEX'], CON: ['Konstitution', 'Constitution', 'KO', 'CON'], INT: ['Intelligenz', 'Intelligence', 'IN', 'INT'], WIS: ['Weisheit', 'Wisdom', 'WE', 'WIS'], CHA: ['Charisma', 'Charisma', 'CH', 'CHA'] };
const SKILLS = [
  ['acrobatics', 'DEX', 'Akrobatik', 'Acrobatics', 'Acrobatics'], ['animal', 'WIS', 'Mit Tieren umgehen', 'Animal Handling', 'Animal'],
  ['arcana', 'INT', 'Arkane Kunde', 'Arcana', 'Arcana'], ['athletics', 'STR', 'Athletik', 'Athletics', 'Athletics'],
  ['deception', 'CHA', 'Täuschen', 'Deception', 'Deception '], ['history', 'INT', 'Geschichte', 'History', 'History '],
  ['insight', 'WIS', 'Motiv erkennen', 'Insight', 'Insight'], ['intimidation', 'CHA', 'Einschüchtern', 'Intimidation', 'Intimidation'],
  ['investigation', 'INT', 'Nachforschungen', 'Investigation', 'Investigation '], ['medicine', 'WIS', 'Heilkunde', 'Medicine', 'Medicine'],
  ['nature', 'INT', 'Naturkunde', 'Nature', 'Nature'], ['perception', 'WIS', 'Wahrnehmung', 'Perception', 'Perception '],
  ['performance', 'CHA', 'Auftreten', 'Performance', 'Performance'], ['persuasion', 'CHA', 'Überzeugen', 'Persuasion', 'Persuasion'],
  ['religion', 'INT', 'Religion', 'Religion', 'Religion'], ['sleight', 'DEX', 'Fingerfertigkeit', 'Sleight of Hand', 'SleightofHand'],
  ['stealth', 'DEX', 'Heimlichkeit', 'Stealth', 'Stealth '], ['survival', 'WIS', 'Überlebenskunst', 'Survival', 'Survival']
];
const DTYPES = { acid: ['Säure', 'acid'], bludgeoning: ['Wucht', 'bludgeoning'], cold: ['Kälte', 'cold'], fire: ['Feuer', 'fire'], force: ['Energie', 'force'], lightning: ['Blitz', 'lightning'], necrotic: ['nekrotisch', 'necrotic'], piercing: ['Stich', 'piercing'], poison: ['Gift', 'poison'], psychic: ['psychisch', 'psychic'], radiant: ['gleißend', 'radiant'], slashing: ['Hieb', 'slashing'], thunder: ['Schall', 'thunder'], var: ['wählbar', 'varies'] };

/* Waffen: en|de|Schaden|Typ|Eigenschaften (L leicht, F Finesse, T Wurf, H schwer, 2 zweihändig, R Reichweite, A Munition, D Laden, N Fernkampf, V<W> vielseitig) */
const WEAPONS = `Club|Knüppel|1d4|bludgeoning|L
Dagger|Dolch|1d4|piercing|F L T
Greatclub|Zweihandknüppel|1d8|bludgeoning|2
Handaxe|Handaxt|1d6|slashing|L T
Javelin|Wurfspeer|1d6|piercing|T
Light Hammer|Leichter Hammer|1d4|bludgeoning|L T
Mace|Streitkolben|1d6|bludgeoning|
Quarterstaff|Kampfstab|1d6|bludgeoning|V1d8
Sickle|Sichel|1d4|slashing|L
Spear|Speer|1d6|piercing|T V1d8
Light Crossbow|Leichte Armbrust|1d8|piercing|A D 2 N
Dart|Wurfpfeil|1d4|piercing|F T N
Shortbow|Kurzbogen|1d6|piercing|A 2 N
Sling|Schleuder|1d4|bludgeoning|A N
Battleaxe|Streitaxt|1d8|slashing|V1d10
Flail|Flegel|1d8|bludgeoning|
Glaive|Glefe|1d10|slashing|H R 2
Greataxe|Zweihandaxt|1d12|slashing|H 2
Greatsword|Zweihandschwert|2d6|slashing|H 2
Halberd|Hellebarde|1d10|slashing|H R 2
Lance|Lanze|1d12|piercing|R
Longsword|Langschwert|1d8|slashing|V1d10
Maul|Zweihandhammer|2d6|bludgeoning|H 2
Morningstar|Morgenstern|1d8|piercing|
Pike|Pike|1d10|piercing|H R 2
Rapier|Rapier|1d8|piercing|F
Scimitar|Krummsäbel|1d6|slashing|F L
Shortsword|Kurzschwert|1d6|piercing|F L
Trident|Dreizack|1d6|piercing|T V1d8
War Pick|Kriegspicke|1d8|piercing|
Warhammer|Kriegshammer|1d8|bludgeoning|V1d10
Whip|Peitsche|1d4|slashing|F R
Blowgun|Blasrohr|1|piercing|A D N
Hand Crossbow|Handarmbrust|1d6|piercing|A L D N
Heavy Crossbow|Schwere Armbrust|1d10|piercing|A H D 2 N
Longbow|Langbogen|1d8|piercing|A H 2 N
Unarmed Strike|Waffenloser Schlag|1|bludgeoning|U`.split('\n').map(l => {
  const [en, de, dmg, type, p] = l.split('|'); const props = (p || '').split(/\s+/).filter(Boolean);
  const v = props.find(x => x[0] === 'V');
  return { en, de, dmg, type, light: props.includes('L'), finesse: props.includes('F'), thrown: props.includes('T'), heavy: props.includes('H'), twoH: props.includes('2'), reach: props.includes('R'), ranged: props.includes('N'), versatile: v ? v.slice(1) : null, unarmed: props.includes('U') };
});

/* Klassen */
const CLASSES = {
  barbarian: { de: 'Barbar', en: 'Barbarian', hd: 12, caster: 0, alias: ['barb', 'barbar', 'barbarian'] },
  bard: { de: 'Barde', en: 'Bard', hd: 8, caster: 1, alias: ['bard', 'barde', 'bardin'] },
  cleric: { de: 'Kleriker', en: 'Cleric', hd: 8, caster: 1, alias: ['cler', 'cleric', 'kler', 'kleriker', 'klerikerin'] },
  druid: { de: 'Druide', en: 'Druid', hd: 8, caster: 1, alias: ['dru', 'druid', 'druide', 'druidin'] },
  fighter: { de: 'Kämpfer', en: 'Fighter', hd: 10, caster: 0, alias: ['fight', 'fighter', 'kampf', 'kämpfer', 'kaempfer', 'kämpferin', 'krieger'] },
  monk: { de: 'Mönch', en: 'Monk', hd: 8, caster: 0, alias: ['monk', 'mönch', 'moench', 'mönchin'] },
  paladin: { de: 'Paladin', en: 'Paladin', hd: 10, caster: .5, alias: ['pal', 'pala', 'paladin', 'paladina'] },
  ranger: { de: 'Waldläufer', en: 'Ranger', hd: 10, caster: .5, alias: ['rang', 'ranger', 'waldl', 'waldläufer', 'waldlaeufer', 'waldläuferin'] },
  rogue: { de: 'Schurke', en: 'Rogue', hd: 8, caster: 0, alias: ['rog', 'rogue', 'schurk', 'schurke', 'schurkin', 'dieb'] },
  sorcerer: { de: 'Zauberer', en: 'Sorcerer', hd: 6, caster: 1, alias: ['sorc', 'sorcerer', 'zauberer', 'zauberin'] },
  warlock: { de: 'Hexenmeister', en: 'Warlock', hd: 8, caster: 0, pact: true, alias: ['warl', 'warlock', 'hexenm', 'hexenmeister', 'hexenmeisterin', 'hexer'] },
  wizard: { de: 'Magier', en: 'Wizard', hd: 6, caster: 1, alias: ['wiz', 'wizard', 'magier', 'magierin', 'mag'] }
};
// Zauberplätze nach Zauberwirkerstufe (Mehrklassen-Tabelle PHB)
const SLOT_TABLE = [[], [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]];
const PACT = lvl => ({ count: lvl >= 17 ? 4 : lvl >= 11 ? 3 : lvl >= 2 ? 2 : lvl >= 1 ? 1 : 0, level: Math.min(5, Math.ceil(lvl / 2)) });

const RACES = {
  tiefling: { de: 'Tiefling', en: 'Tiefling', alias: ['tiefling'] },
  dragonborn: { de: 'Drachenblütiger', en: 'Dragonborn', alias: ['dragonborn', 'drachenbl', 'drachengeb'] },
  halforc: { de: 'Halbork', en: 'Half-Orc', alias: ['halforc', 'half orc', 'halbork', 'halb ork'] },
  halfling: { de: 'Halbling', en: 'Halfling', alias: ['halfling', 'halbling'] },
  dwarf: { de: 'Zwerg', en: 'Dwarf', alias: ['dwarf', 'zwerg'] },
  halfelf: { de: 'Halbelf', en: 'Half-Elf', alias: ['halfelf', 'half elf', 'halbelf', 'halb elf'] },
  elf: { de: 'Elf', en: 'Elf', alias: ['elf', 'elfe', 'drow'] },
  gnome: { de: 'Gnom', en: 'Gnome', alias: ['gnome', 'gnom'] },
  human: { de: 'Mensch', en: 'Human', alias: ['human', 'mensch'] }
};

/* Zustände & Effekte. fx: ac, atk('adv'|'dis'), vsMe, atkDice, saveDice, checkDice, saveAdv[], saveDis[], checkAdv[], checkDis(true|[]),
   autoFail[], incap, speed(0|'half'|'double'|+n), noReact, noSpells, oneOf, extraAction, acSet, acMin */
const E = (id, de, en, pos, d_de, d_en, fx, o) => Object.assign({ id, de, en, pos, desc: [d_de, d_en], fx: fx || {} }, o || {});
const EFFECTS = [
  // --- Negative Zustände (PHB Anhang A)
  E('blinded', 'Blind', 'Blinded', 0, 'Scheitert bei Proben, die Sicht erfordern. Eigene Angriffe mit Nachteil, Angriffe gegen dich mit Vorteil.', 'Fails checks requiring sight. Your attacks have disadvantage, attacks against you have advantage.', { atk: 'dis', vsMe: 'adv' }),
  E('charmed', 'Bezaubert', 'Charmed', 0, 'Kann den Bezauberer nicht angreifen; dieser hat Vorteil bei sozialen Proben gegen dich.', 'Can\'t attack the charmer; the charmer has advantage on social checks against you.', {}),
  E('deafened', 'Taub', 'Deafened', 0, 'Kann nichts hören, scheitert bei Proben, die Gehör erfordern.', 'Can\'t hear and fails checks that require hearing.', {}),
  E('frightened', 'Verängstigt', 'Frightened', 0, 'Nachteil bei Attributsproben und Angriffen, solange die Quelle sichtbar ist. Kann sich ihr nicht freiwillig nähern.', 'Disadvantage on ability checks and attacks while the source is in sight. Can\'t willingly move closer.', { atk: 'dis', checkDis: true }),
  E('grappled', 'Gepackt', 'Grappled', 0, 'Bewegungsrate 0.', 'Speed becomes 0.', { speed: 0 }),
  E('incapacitated', 'Kampfunfähig', 'Incapacitated', 0, 'Keine Aktionen und Reaktionen.', 'Can\'t take actions or reactions.', { incap: true }),
  E('paralyzed', 'Gelähmt', 'Paralyzed', 0, 'Kampfunfähig, kann sich nicht bewegen/sprechen. Scheitert automatisch bei ST- und GE-Rettungswürfen. Angriffe gegen dich mit Vorteil, Treffer aus 1,5 m sind kritisch.', 'Incapacitated, can\'t move or speak. Auto-fails STR and DEX saves. Attacks against you have advantage; hits within 5 ft are critical.', { incap: true, speed: 0, autoFail: ['STR', 'DEX'], vsMe: 'adv' }),
  E('petrified', 'Versteinert', 'Petrified', 0, 'Kampfunfähig, scheitert bei ST/GE-Rettungswürfen, Resistenz gegen alle Schadensarten, Angriffe gegen dich mit Vorteil.', 'Incapacitated, auto-fails STR/DEX saves, resistant to all damage, attacks against you have advantage.', { incap: true, speed: 0, autoFail: ['STR', 'DEX'], vsMe: 'adv' }),
  E('poisoned', 'Vergiftet', 'Poisoned', 0, 'Nachteil bei Angriffswürfen und Attributsproben.', 'Disadvantage on attack rolls and ability checks.', { atk: 'dis', checkDis: true }),
  E('prone', 'Liegend', 'Prone', 0, 'Eigene Angriffe mit Nachteil. Nahkampfangriffe gegen dich (1,5 m) mit Vorteil, Fernkampf mit Nachteil. Aufstehen kostet die halbe Bewegung.', 'Your attacks have disadvantage. Melee attacks against you (5 ft) have advantage, ranged attacks disadvantage. Standing up costs half your speed.', { atk: 'dis', vsMe: 'adv*' }),
  E('restrained', 'Festgesetzt', 'Restrained', 0, 'Bewegungsrate 0, eigene Angriffe mit Nachteil, Angriffe gegen dich mit Vorteil, Nachteil bei GE-Rettungswürfen.', 'Speed 0, your attacks have disadvantage, attacks against you have advantage, disadvantage on DEX saves.', { speed: 0, atk: 'dis', vsMe: 'adv', saveDis: ['DEX'] }),
  E('stunned', 'Betäubt', 'Stunned', 0, 'Kampfunfähig, scheitert bei ST/GE-Rettungswürfen, Angriffe gegen dich mit Vorteil.', 'Incapacitated, auto-fails STR/DEX saves, attacks against you have advantage.', { incap: true, speed: 0, autoFail: ['STR', 'DEX'], vsMe: 'adv' }),
  E('unconscious', 'Bewusstlos', 'Unconscious', 0, 'Kampfunfähig, liegend, scheitert bei ST/GE-Rettungswürfen; Angriffe gegen dich mit Vorteil, Treffer aus 1,5 m kritisch.', 'Incapacitated, prone, auto-fails STR/DEX saves; attacks against you have advantage, hits within 5 ft are critical.', { incap: true, speed: 0, autoFail: ['STR', 'DEX'], vsMe: 'adv' }),
  // --- Negative Effekte mit wiederholtem Rettungswurf
  E('holdPerson', 'Gelähmt (Person/Monster festhalten)', 'Paralyzed (Hold Person/Monster)', 0, 'Wie Gelähmt. Am Ende jedes deiner Züge WE-Rettungswurf, bei Erfolg endet der Effekt.', 'As Paralyzed. WIS save at the end of each of your turns ends it on a success.', { incap: true, speed: 0, autoFail: ['STR', 'DEX'], vsMe: 'adv' }, { save: 'WIS', when: 'end', dur: 10 }),
  E('laughter', 'Fürchterliches Gelächter', 'Hideous Laughter', 0, 'Liegend und kampfunfähig. Am Ende jedes Zuges (und bei Schaden mit Vorteil) WE-Rettungswurf.', 'Prone and incapacitated. WIS save at the end of each turn (and with advantage when damaged).', { incap: true, speed: 0, atk: 'dis', vsMe: 'adv*' }, { save: 'WIS', when: 'end', dur: 10 }),
  E('fear', 'Verängstigt (Furcht)', 'Frightened (Fear)', 0, 'Wie Verängstigt; muss fliehen. Endet die Sichtlinie, WE-Rettungswurf am Zugende.', 'As Frightened; must dash away. If out of line of sight, WIS save at the end of your turn.', { atk: 'dis', checkDis: true }, { save: 'WIS', when: 'end', dur: 10 }),
  E('blindSpell', 'Blind/Taub (Zauber)', 'Blinded/Deafened (spell)', 0, 'Am Ende jedes Zuges KO-Rettungswurf, Erfolg beendet den Effekt.', 'CON save at the end of each turn ends it on a success.', { atk: 'dis', vsMe: 'adv' }, { save: 'CON', when: 'end', dur: 10 }),
  E('bane', 'Fluch (Bane)', 'Bane', 0, '−1W4 auf Angriffswürfe und Rettungswürfe.', '−1d4 to attack rolls and saving throws.', { atkDice: '-1d4', saveDice: '-1d4' }, { dur: 10 }),
  E('slow', 'Verlangsamt', 'Slowed', 0, '−2 RK und GE-Rettungswürfe, halbe Bewegung, keine Reaktionen, Aktion ODER Bonusaktion, nur ein Angriff. WE-Rettungswurf am Zugende.', '−2 AC and DEX saves, half speed, no reactions, action OR bonus action, one attack only. WIS save at the end of each turn.', { ac: -2, saveFlat: { DEX: -2 }, speed: 'half', noReact: true, oneOf: true }, { save: 'WIS', when: 'end', dur: 10 }),
  E('enfeebled', 'Geschwächt (Strahl)', 'Enfeebled (Ray)', 0, 'ST-Waffenangriffe machen nur halben Schaden. KO-Rettungswurf am Zugende.', 'STR weapon attacks deal half damage. CON save at the end of each turn.', { halfStrDmg: true }, { save: 'CON', when: 'end', dur: 10 }),
  E('confused', 'Verwirrt', 'Confused', 0, 'Kein Reaktionen; W10 zu Zugbeginn bestimmt dein Verhalten. WE-Rettungswurf am Zugende.', 'No reactions; roll a d10 at the start of each turn. WIS save at the end of each turn.', { noReact: true }, { save: 'WIS', when: 'end', dur: 10, startRoll: 'd10' }),
  E('stinking', 'Stinkende Wolke', 'Stinking Cloud', 0, 'Zu Beginn des Zuges in der Wolke: KO-Rettungswurf, bei Misserfolg Aktion verloren.', 'Starting your turn in the cloud: CON save or lose your action.', {}, { save: 'CON', when: 'start' }),
  E('hexed', 'Verhext', 'Hexed', 0, 'Nachteil bei Proben eines Attributs (wähle in der Notiz).', 'Disadvantage on checks with one ability (note it).', {}, { dur: 600 }),
  E('cursed', 'Verflucht', 'Cursed', 0, 'Effekt laut Zauber (Notiz).', 'Effect as per the spell (note).', {}),
  E('burning', 'Brennend', 'Burning', 0, 'Nimmt zu Beginn des Zuges Feuerschaden; Aktion zum Löschen.', 'Takes fire damage at the start of the turn; use an action to douse.', {}, { when: 'start' }),
  E('poisonedSave', 'Vergiftet (mit Rettungswurf)', 'Poisoned (repeat save)', 0, 'Wie Vergiftet; KO-Rettungswurf am Zugende.', 'As Poisoned; CON save at the end of each turn.', { atk: 'dis', checkDis: true }, { save: 'CON', when: 'end' }),
  E('stunnedSave', 'Betäubt (bis Ende nächster Zug)', 'Stunned (until end of next turn)', 0, 'Wie Betäubt, z. B. durch Betäubender Schlag.', 'As Stunned, e.g. from Stunning Strike.', { incap: true, speed: 0, autoFail: ['STR', 'DEX'], vsMe: 'adv' }, { dur: 1 }),
  E('lethargy', 'Lethargie (Hast endet)', 'Lethargy (Haste ended)', 0, 'Kann sich bis Ende des nächsten Zuges weder bewegen noch Aktionen ausführen.', 'Can\'t move or take actions until after your next turn.', { incap: true, speed: 0 }, { dur: 1 }),
  E('reduced', 'Verkleinert', 'Reduced', 0, 'Nachteil bei ST-Proben und -Rettungswürfen, Waffenschaden −1W4.', 'Disadvantage on STR checks and saves, weapon damage −1d4.', { checkDis: ['STR'], saveDis: ['STR'], wpnDice: '-1d4' }, { dur: 10 }),
  // --- Positive Effekte
  E('bless', 'Gesegnet', 'Blessed', 1, '+1W4 auf Angriffswürfe und Rettungswürfe.', '+1d4 to attack rolls and saving throws.', { atkDice: '+1d4', saveDice: '+1d4' }, { dur: 10 }),
  E('guidance', 'Göttliche Führung', 'Guidance', 1, '+1W4 auf eine Attributsprobe (wird verbraucht).', '+1d4 to one ability check (consumed).', { checkDice: '+1d4', once: 'check' }, { dur: 10 }),
  E('resistance', 'Resistenz (Zaubertrick)', 'Resistance (cantrip)', 1, '+1W4 auf einen Rettungswurf (wird verbraucht).', '+1d4 to one saving throw (consumed).', { saveDice: '+1d4', once: 'save' }, { dur: 10 }),
  E('bardic', 'Bardische Inspiration', 'Bardic Inspiration', 1, 'Füge den Inspirationswürfel einmal zu Angriff, Probe oder Rettungswurf hinzu (Würfel in der Notiz, Standard W6).', 'Add the inspiration die once to an attack, check or save (die in the note, default d6).', { anyDice: 'bardic', once: 'any' }, { dur: 100 }),
  E('inspiration', 'Inspiration', 'Inspiration', 1, 'Vorteil auf einen Wurf (wird verbraucht).', 'Advantage on one roll (consumed).', { anyAdv: true, once: 'any' }),
  E('haste', 'Hast', 'Hasted', 1, '+2 RK, Vorteil bei GE-Rettungswürfen, doppelte Bewegung, eine zusätzliche eingeschränkte Aktion (ein Waffenangriff, Spurt, Rückzug, Verstecken, Gegenstand benutzen).', '+2 AC, advantage on DEX saves, double speed, one extra limited action (one weapon attack, Dash, Disengage, Hide, Use an Object).', { ac: 2, saveAdv: ['DEX'], speed: 'double', extraAction: 'haste' }, { dur: 10, conc: true, onEnd: 'lethargy' }),
  E('shieldOfFaith', 'Schild des Glaubens', 'Shield of Faith', 1, '+2 RK.', '+2 AC.', { ac: 2 }, { dur: 100, conc: true }),
  E('shield', 'Schild (Zauber)', 'Shield (spell)', 1, '+5 RK bis zum Beginn deines nächsten Zuges, kein Schaden durch Magisches Geschoss.', '+5 AC until the start of your next turn, immune to Magic Missile.', { ac: 5 }, { dur: 1 }),
  E('mageArmor', 'Magierrüstung', 'Mage Armor', 1, 'Basis-RK 13 + GE-Mod (nur ohne Rüstung).', 'Base AC 13 + DEX mod (only without armor).', { acSet: 'mage' }, { dur: 4800 }),
  E('barkskin', 'Borkenhaut', 'Barkskin', 1, 'RK mindestens 16.', 'AC can\'t be lower than 16.', { acMin: 16 }, { dur: 600, conc: true }),
  E('blur', 'Verschwommen', 'Blurred', 1, 'Angriffe gegen dich mit Nachteil (außer Blindsicht/Wahrsicht).', 'Attacks against you have disadvantage (unless blindsight/truesight).', { vsMe: 'dis' }, { dur: 10, conc: true }),
  E('mirrorImage', 'Spiegelbilder', 'Mirror Image', 1, '3 Duplikate. Bei Angriff W20: 3 Dupl. 6+, 2 Dupl. 8+, 1 Dupl. 11+ → trifft ein Duplikat (RK 10 + GE).', '3 duplicates. When attacked roll d20: 3 dupl. 6+, 2 dupl. 8+, 1 dupl. 11+ → hits a duplicate (AC 10 + DEX).', {}, { dur: 10 }),
  E('invisible', 'Unsichtbar', 'Invisible', 1, 'Eigene Angriffe mit Vorteil, Angriffe gegen dich mit Nachteil. (Unsichtbarkeit endet bei Angriff oder Zauber.)', 'Your attacks have advantage, attacks against you have disadvantage. (Invisibility ends when you attack or cast.)', { atk: 'adv', vsMe: 'dis' }, { dur: 600, conc: true }),
  E('rage', 'Kampfrausch (Wut)', 'Raging', 1, 'Vorteil bei ST-Proben und -Rettungswürfen, +Wutschaden bei ST-Nahkampfwaffenangriffen, Resistenz gegen Wucht/Stich/Hieb. Keine Zauber/Konzentration. Endet, wenn du seit deinem letzten Zug weder angegriffen noch Schaden genommen hast.', 'Advantage on STR checks and saves, +rage damage on STR melee weapon attacks, resistance to bludgeoning/piercing/slashing. No spells/concentration. Ends if you haven\'t attacked or taken damage since your last turn.', { checkAdv: ['STR'], saveAdv: ['STR'], noSpells: true, rage: true }, { dur: 10 }),
  E('reckless', 'Tollkühner Angriff', 'Reckless Attack', 1, 'Vorteil bei ST-Nahkampfwaffenangriffen in diesem Zug; Angriffe gegen dich mit Vorteil bis zu deinem nächsten Zug.', 'Advantage on STR melee weapon attacks this turn; attacks against you have advantage until your next turn.', { atkStrAdv: true, vsMe: 'adv' }, { dur: 1 }),
  E('dodge', 'Ausweichen', 'Dodging', 1, 'Angriffe gegen dich mit Nachteil, Vorteil bei GE-Rettungswürfen (bis zu deinem nächsten Zug).', 'Attacks against you have disadvantage, advantage on DEX saves (until your next turn).', { vsMe: 'dis', saveAdv: ['DEX'] }, { dur: 1 }),
  E('disengage', 'Rückzug', 'Disengaged', 1, 'Deine Bewegung provoziert in diesem Zug keine Gelegenheitsangriffe.', 'Your movement doesn\'t provoke opportunity attacks this turn.', {}, { dur: 1 }),
  E('hidden', 'Versteckt', 'Hidden', 1, 'Eigene Angriffe mit Vorteil, solange du unentdeckt bist.', 'Your attacks have advantage while unseen.', { atk: 'adv' }),
  E('huntersMark', 'Mal des Jägers (aktiv)', 'Hunter\'s Mark (active)', 1, '+1W6 Schaden bei Waffentreffern gegen das markierte Ziel.', '+1d6 damage on weapon hits against the marked target.', { hitDice: '1d6', hitType: 'force*' }, { dur: 600, conc: true }),
  E('hex', 'Verhexen (aktiv)', 'Hex (active)', 1, '+1W6 nekrotischer Schaden bei Treffern gegen das verhexte Ziel.', '+1d6 necrotic damage on hits against the hexed target.', { hitDice: '1d6', hitType: 'necrotic', hitAny: true }, { dur: 600, conc: true }),
  E('divineFavor', 'Göttliche Gunst', 'Divine Favor', 1, '+1W4 gleißender Schaden bei Waffentreffern.', '+1d4 radiant damage on weapon hits.', { hitDice: '1d4', hitType: 'radiant' }, { dur: 10, conc: true }),
  E('crusader', 'Mantel des Kreuzfahrers', 'Crusader\'s Mantle', 1, '+1W4 gleißender Schaden bei Waffentreffern.', '+1d4 radiant damage on weapon hits.', { hitDice: '1d4', hitType: 'radiant' }, { dur: 10, conc: true }),
  E('smite', 'Niederstrecken vorbereitet', 'Smite readied', 1, 'Nächster Waffentreffer verursacht den Zusatzschaden des Zaubers (siehe Notiz).', 'Your next weapon hit deals the spell\'s extra damage (see note).', { smite: true }, { dur: 10, conc: true }),
  E('enlarge', 'Vergrößert', 'Enlarged', 1, 'Vorteil bei ST-Proben und -Rettungswürfen, Waffenschaden +1W4.', 'Advantage on STR checks and saves, weapon damage +1d4.', { checkAdv: ['STR'], saveAdv: ['STR'], wpnDice: '+1d4' }, { dur: 10, conc: true }),
  E('enhance', 'Attribut verbessert', 'Enhanced Ability', 1, 'Vorteil bei Proben eines Attributs (in der Notiz).', 'Advantage on checks with one ability (in the note).', {}, { dur: 600, conc: true }),
  E('heroism', 'Heldenmut', 'Heroism', 1, 'Immun gegen Verängstigt; zu Beginn jedes Zuges temporäre TP in Höhe deines Zaubermods.', 'Immune to frightened; temp HP equal to your spellcasting modifier at the start of each turn.', {}, { dur: 10, conc: true, when: 'start' }),
  E('protEvil', 'Schutz vor Gut und Böse', 'Protection from Evil and Good', 1, 'Aberrationen, Celestische, Elementare, Feen, Unholde, Untote haben Nachteil gegen dich.', 'Aberrations, celestials, elementals, fey, fiends and undead have disadvantage against you.', {}, { dur: 100, conc: true }),
  E('fly', 'Fliegend', 'Flying', 1, 'Flugbewegung 18 m.', 'Flying speed 60 ft.', {}, { dur: 100, conc: true }),
  E('longstrider', 'Schneller Schritt', 'Longstrider', 1, '+3 m (10 ft) Bewegungsrate.', '+10 ft speed.', { speed: 10 }, { dur: 600 }),
  E('expRetreat', 'Rasender Rückzug', 'Expeditious Retreat', 1, 'Spurt als Bonusaktion in jedem Zug.', 'Dash as a bonus action each turn.', { bonusDash: true }, { dur: 100, conc: true }),
  E('passWithoutTrace', 'Spurloses Gehen', 'Pass without Trace', 1, '+10 auf Heimlichkeit.', '+10 to Stealth.', { skillFlat: { stealth: 10 } }, { dur: 600, conc: true }),
  E('aid', 'Beistand', 'Aid', 1, 'TP-Maximum und aktuelle TP +5 (pro Grad über 2 je +5).', 'HP maximum and current HP +5 (+5 per slot level above 2nd).', {}, { dur: 4800 }),
  E('falseLife', 'Falsches Leben', 'False Life', 1, '1W4+4 temporäre TP.', '1d4+4 temporary HP.', {}, { dur: 600 }),
  E('agathys', 'Rüstung des Agathys', 'Armor of Agathys', 1, '5 temp. TP je Grad; Nahkampfangreifer erleiden Kälteschaden.', '5 temp HP per slot level; melee attackers take cold damage.', {}, { dur: 600 }),
  E('bladeWard', 'Klingenbann', 'Blade Ward', 1, 'Resistenz gegen Wucht/Stich/Hieb durch Waffenangriffe bis Ende deines nächsten Zuges.', 'Resistance to bludgeoning/piercing/slashing from weapon attacks until the end of your next turn.', {}, { dur: 1 }),
  E('shillelagh', 'Shillelagh', 'Shillelagh', 1, 'Knüppel/Kampfstab nutzt Zaubermod., Schaden W8.', 'Club/quarterstaff uses spellcasting modifier, damage d8.', {}, { dur: 10 }),
  E('holyAura', 'Heilige Aura', 'Holy Aura', 1, 'Vorteil bei allen Rettungswürfen, Angriffe gegen dich mit Nachteil.', 'Advantage on all saving throws, attacks against you have disadvantage.', { saveAdv: ABIL, vsMe: 'dis' }, { dur: 10, conc: true }),
  E('foresight', 'Vorahnung', 'Foresight', 1, 'Vorteil bei Angriffen, Proben und Rettungswürfen; Angriffe gegen dich mit Nachteil.', 'Advantage on attacks, checks and saves; attacks against you have disadvantage.', { atk: 'adv', checkAdv: ABIL, saveAdv: ABIL, vsMe: 'dis' }, { dur: 4800 }),
  E('stable', 'Stabil', 'Stable', 1, 'Bewusstlos bei 0 TP, aber keine Todesrettungswürfe mehr.', 'Unconscious at 0 HP but no more death saves.', {}),
  E('concentrating', 'Konzentration', 'Concentrating', 1, 'Bei Schaden KO-Rettungswurf (SG 10 oder halber Schaden).', 'When damaged, CON save (DC 10 or half the damage).', {})
];
const EFF = Object.fromEntries(EFFECTS.map(e => [e.id, e]));

W.CM_DATA = { ABIL, ABIL_N, SKILLS, DTYPES, WEAPONS, CLASSES, SLOT_TABLE, PACT, RACES, EFFECTS, EFF };
})(window);
