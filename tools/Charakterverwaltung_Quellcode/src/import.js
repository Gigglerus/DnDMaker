/* Charakterbogen (AcroForm-Felder) → Charakterobjekt */
(function (W) {
'use strict';
const D = W.CM_DATA, R = W.CM_RULES;
const SPELL_FIELDS = [
  [['1014', ''], ['1016', ''], ['1017', ''], ['1018', ''], ['1019', ''], ['1020', ''], ['1021', ''], ['1022', '']],
  [['1015', '251'], ['1023', '309'], ['1024', '3010']].concat(range(1025, 1033).map((n, i) => [String(n), String(3011 + i)])),
  [['1046', '313'], ['1034', '310']].concat(range(1035, 1045).map((n, i) => [String(n), String(3020 + i)])),
  [['1048', '315'], ['1047', '314']].concat(range(1049, 1059).map((n, i) => [String(n), String(3031 + i)])),
  [['1061', '317'], ['1060', '316']].concat(range(1062, 1072).map((n, i) => [String(n), String(3042 + i)])),
  [['1074', '319'], ['1073', '318']].concat(range(1075, 1081).map((n, i) => [String(n), String(3053 + i)])),
  [['1083', '321'], ['1082', '320']].concat(range(1084, 1090).map((n, i) => [String(n), String(3060 + i)])),
  [['1092', '323'], ['1091', '322']].concat(range(1093, 1099).map((n, i) => [String(n), String(3067 + i)])),
  [['10101', '325'], ['10100', '324']].concat(range(10102, 10106).map((n, i) => [String(n), String(3074 + i)])),
  [['10108', '327'], ['10107', '326'], ['10109', '3079'], ['101010', '3080'], ['101011', '3081'], ['101012', '3082'], ['101013', '3083']]
];
function range(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; }
const SAVE_BOX = { STR: '11', DEX: '18', CON: '19', INT: '20', WIS: '21', CHA: '22' };
const SAVE_F = { STR: 'ST Strength', DEX: 'ST Dexterity', CON: 'ST Constitution', INT: 'ST Intelligence', WIS: 'ST Wisdom', CHA: 'ST Charisma' };
const MOD_F = { STR: 'STRmod', DEX: 'DEXmod', CON: 'CONmod', INT: 'INTmod', WIS: 'WISmod', CHA: 'CHamod' };
// Alternative (z. B. deutsche) Feldnamen
const ALIAS = {
  CharacterName: ['Charaktername', 'Name', 'Charakter'], ClassLevel: ['Klasse & Stufe', 'Klasse und Stufe', 'Klasse', 'KlasseStufe', 'Class'], Race: ['Volk', 'Rasse', 'Race '], Background: ['Hintergrund'], PlayerName: ['Spielername', 'Spieler'],
  AC: ['Rüstungsklasse', 'RK', 'Armor Class'], Initiative: ['Initiative'], Speed: ['Bewegungsrate', 'Geschwindigkeit', 'Bewegung'], HPMax: ['Trefferpunkte Maximum', 'TP Maximum', 'TPMax', 'Max HP'], HPCurrent: ['Aktuelle Trefferpunkte', 'TP Aktuell', 'TPAktuell'], HPTemp: ['Temporäre Trefferpunkte', 'TP Temp', 'TPTemp'],
  ProfBonus: ['Übungsbonus', 'Uebungsbonus', 'Proficiency Bonus'], HDTotal: ['Trefferwürfel gesamt', 'Trefferwürfel', 'TW gesamt', 'Hit Dice'], Passive: ['Passive Wahrnehmung', 'Passive Weisheit (Wahrnehmung)'],
  STR: ['Stärke', 'ST'], DEX: ['Geschicklichkeit', 'GE'], CON: ['Konstitution', 'KO'], INT: ['Intelligenz', 'IN'], WIS: ['Weisheit', 'WE'], CHA: ['Charisma', 'CH'],
  'Features and Traits': ['Merkmale & Fähigkeiten', 'Merkmale und Fähigkeiten', 'Features', 'Fähigkeiten'], ProficienciesLang: ['Übungen & Sprachen', 'Sonstige Übungen & Sprachen', 'Sprachen'], Equipment: ['Ausrüstung'], AttacksSpellcasting: ['Angriffe & Zauberwirken', 'Angriffe und Zauber'],
  'Spellcasting Class 2': ['Zauberklasse'], 'SpellcastingAbility 2': ['Zauberattribut', 'Attribut zum Zauberwirken'], 'SpellSaveDC  2': ['Zauber-SG', 'Zauberrettungswurf-SG', 'SG Zauber'], 'SpellAtkBonus 2': ['Zauberangriffsbonus', 'Zauberangriff']
};

function getter(fields) {
  const byNorm = {}; for (const k of Object.keys(fields)) byNorm[R.norm(k).replace(/ /g, '')] = k;
  return function f(name) {
    const tries = [name, name + ' ', name.trim()].concat(ALIAS[name.trim()] || []);
    for (const t of tries) if (fields[t] !== undefined && fields[t] !== '') return fields[t];
    for (const t of tries) { const k = byNorm[R.norm(t).replace(/ /g, '')]; if (k && fields[k] !== '') return fields[k]; }
    return '';
  };
}
const uid = () => Math.random().toString(36).slice(2, 10);

/* Format des „The Ultimate DND5e Creator“ (Kurz-Feldnamen n, kl, a0…, k0…, z0…) */
const CR_SK = ['acrobatics', 'arcana', 'athletics', 'performance', 'intimidation', 'history', 'medicine', 'stealth', 'insight', 'investigation', 'nature', 'religion', 'sleight', 'deception', 'survival', 'persuasion', 'animal', 'perception'];
function isCreator(f) { return f.kl !== undefined && f.a0 !== undefined && f.z0 !== undefined; }
function buildCreator(fields, fileName) {
  const v = k => String(fields[k] === undefined || fields[k] === false ? '' : fields[k]).replace(/\r\n?/g, '\n').trim();
  const ch = { id: uid(), v: 1, source: fileName || '', created: Date.now(), fromCreator: true };
  ch.name = v('n') || (fileName || 'Charakter').replace(/\.pdf$/i, ''); ch.player = v('sp'); ch.classStr = v('kl'); ch.race = v('ra'); ch.raceKey = R.parseRace(ch.race);
  ch.background = v('bg'); ch.alignment = v('ge');
  ch.abil = {}; D.ABIL.forEach((a, i) => { const sc = R.num(v('a' + i), 10); const m = R.num(v('m' + i), null); ch.abil[a] = { score: sc, mod: m === null ? R.mod(sc) : m }; });
  ch.hdStr = v('hd'); ch.classes = R.parseClasses(ch.classStr, ch.hdStr); ch.classes.forEach(c => delete c.lvlHint);
  ch.prof = R.num(v('pb'), 2 + Math.floor((R.totalLvl(ch) - 1) / 4));
  ch.saves = {}; D.ABIL.forEach((a, i) => { const b = R.num(v('s' + i), ch.abil[a].mod); ch.saves[a] = { bonus: b, prof: b - ch.abil[a].mod >= ch.prof }; });
  ch.skills = {}; CR_SK.forEach((id, k) => { const ab = D.SKILLS.find(x => x[0] === id)[1]; const b = R.num(v('k' + k), ch.abil[ab].mod); ch.skills[id] = { bonus: b, prof: b - ch.abil[ab].mod >= ch.prof }; });
  ch.ac = R.num(v('ac'), 10 + ch.abil.DEX.mod); ch.init = R.num(v('in'), ch.abil.DEX.mod);
  const sd = v('sd'); const sn = parseFloat(sd.replace(',', '.')) || 9; ch.speed = /m\b|m$/.test(sd) && !/ft|fuß/i.test(sd) ? Math.round(sn / 1.5) * 5 : Math.round(sn);
  ch.passive = R.num(v('pw'), 10 + ch.skills.perception.bonus);
  ch.hd = R.parseHD(ch.hdStr); if (!ch.hd.length) ch.classes.forEach(c => ch.hd.push({ die: D.CLASSES[c.key].hd, total: c.lvl, used: 0 })); ch.hdNote = null;
  const hm = R.num(v('hm'), 10); const hc = R.num(v('hc'), hm); ch.hp = { max: hm, cur: Math.min(hc, hm), temp: R.num(v('ht'), 0) || 0 };
  ch.death = { s: 0, f: 0 };
  ch.weapons = [];
  v('at').split('\n').forEach(line => {
    const m = line.match(/^\s*([^:]+?):\s*([+\-−]\s*\d+)\s*(?:Angriff|Attack|to hit)[^,]*,\s*(.+)$/i);
    if (!m || /\(St|\(Str|\(Ge|\(Dex|Schaden\s*[+\-−]?\d+\s*$|Damage\s*[+\-−]?\d+\s*$/i.test(line) && !/\d+\s*[wd]\s*\d+/i.test(line)) return;
    if (!/\d+\s*[wd]\s*\d+/i.test(m[3])) return;
    const key = R.norm(m[1]) + m[2]; if (ch.weapons.some(w => w._k === key)) return;
    const w = makeWeapon(ch, m[1].trim(), m[2], m[3]); w._k = key; if (/fernkampf|ranged/i.test(m[3])) w.ranged = true; ch.weapons.push(w);
  });
  ch.weapons.forEach(w => delete w._k);
  ch.text = { features: v('ft') + (v('zm') ? '\n' + v('zm') : ''), profs: v('kn'), equipment: v('eq'), attacks: v('at'), treasure: v('sc') };
  ch.spellcasting = { cls: v('zc'), abil: parseAbil(v('za')), dc: R.num(v('zd'), null), atk: R.num(v('zb'), null) };
  ch.spells = []; const sheetSlots = Array(9).fill(0); let pactCount = 0, pactLvl = 0;
  for (let g = 0; g <= 9; g++) v('z' + g).split('\n').map(x => x.trim()).filter(Boolean).forEach(line => {
    let m;
    if ((m = line.match(/^(?:Plätze|Slots)\s*:\s*(\d+)/i))) { sheetSlots[g - 1] = +m[1]; return; }
    if ((m = line.match(/^(?:Paktplätze|Pact slots)\s*:\s*(\d+)/i))) { pactCount = +m[1]; pactLvl = g; return; }
    const sp = R.matchSpell(line); const s = { id: uid(), raw: line, lvl: g, ref: sp ? sp.key : null, prepared: true };
    if (sp && sp.lvl !== g) s.lvlMismatch = sp.lvl;
    ch.spells.push(s);
  });
  if (!ch.spellcasting.abil && ch.spells.length) ch.spellcasting.abil = guessCastAbil(ch);
  const calc = R.computeSlots(ch);
  ch.slots = Array.from({ length: 9 }, (_, i) => ({ max: sheetSlots.some(Boolean) ? sheetSlots[i] : calc[i], used: 0 }));
  ch.slotsFromSheet = sheetSlots.some(Boolean); ch.slotHint = [];
  const wl = R.clsLvl(ch, 'warlock'); ch.pact = wl || pactCount ? Object.assign(wl ? D.PACT(wl) : { count: pactCount, level: pactLvl }, pactCount ? { count: pactCount, level: pactLvl || D.PACT(wl).level } : {}, { used: 0 }) : null;
  ch.resources = R.kit(ch).resources.map(r => ({ id: r.id, used: 0 })); ch.customRes = [];
  ch.effects = []; ch.exhaustion = 0; ch.concentration = null; ch.inspiration = !!v('is') && v('is') !== '0';
  ch.round = 1; ch.turn = null; ch.log = []; ch.setupDone = false; ch.settings = { twf: false };
  return ch;
}
function build(fields, fileName) {
  if (isCreator(fields)) return buildCreator(fields, fileName);
  const f = getter(fields);
  const box = n => fields['Check Box ' + n] === true;
  const ch = { id: uid(), v: 1, source: fileName || '', created: Date.now() };
  ch.name = String(f('CharacterName') || f('CharacterName 2') || (fileName || 'Charakter').replace(/\.pdf$/i, '')).trim();
  ch.player = String(f('PlayerName') || '').trim();
  ch.classStr = String(f('ClassLevel') || '').trim();
  ch.race = String(f('Race') || '').trim(); ch.raceKey = R.parseRace(ch.race);
  ch.background = String(f('Background') || '').trim();
  ch.alignment = String(f('Alignment') || '').trim();
  ch.abil = {};
  for (const a of D.ABIL) {
    const score = R.num(f(a), 10); const m = R.num(f(MOD_F[a]), null);
    ch.abil[a] = { score, mod: m === null ? R.mod(score) : m };
  }
  ch.prof = R.num(f('ProfBonus'), null);
  ch.hdStr = String(f('HDTotal') || '');
  ch.classes = R.parseClasses(ch.classStr, ch.hdStr);
  ch.classes.forEach(c => { if (c.lvlHint) { c.lvl = c.lvlHint; ch.levelNote = true; } delete c.lvlHint; });
  const lvl = R.totalLvl(ch);
  if (ch.prof === null) ch.prof = 2 + Math.floor((lvl - 1) / 4);
  ch.saves = {}; for (const a of D.ABIL) { const prof = box(SAVE_BOX[a]); const b = R.num(f(SAVE_F[a]), null); ch.saves[a] = { bonus: b === null ? ch.abil[a].mod + (prof ? ch.prof : 0) : b, prof }; }
  ch.skills = {};
  D.SKILLS.forEach(([id, ab, , , field], i) => { const prof = box(23 + i); const b = R.num(f(field), null); ch.skills[id] = { bonus: b === null ? ch.abil[ab].mod + (prof ? ch.prof : 0) : b, prof }; });
  ch.ac = R.num(f('AC'), 10 + ch.abil.DEX.mod);
  ch.init = R.num(f('Initiative'), ch.abil.DEX.mod);
  ch.speed = R.num(f('Speed'), 30);
  ch.passive = R.num(f('Passive'), 10 + ch.skills.perception.bonus);
  const hd = R.parseHD(ch.hdStr);
  if (!hd.length && ch.classes.length) ch.classes.forEach(c => { const C = D.CLASSES[c.key]; const ex = hd.find(p => p.die === C.hd); if (ex) ex.total += c.lvl; else hd.push({ die: C.hd, total: c.lvl, used: 0 }); });
  ch.hd = hd;
  const used = R.num(f('HD'), null); // Feld "HD" = verbleibende/aktuelle TW (uneinheitlich genutzt) → nur Hinweis
  ch.hdNote = used;
  let hpMax = R.num(f('HPMax'), null), hpCur = R.num(f('HPCurrent'), null);
  if (hpMax === null && hpCur !== null) hpMax = hpCur;
  if (hpMax === null) { hpMax = 0; ch.classes.forEach((c, i) => { const d = D.CLASSES[c.key].hd; hpMax += (i === 0 ? d + (c.lvl - 1) * (d / 2 + 1) : c.lvl * (d / 2 + 1)) + c.lvl * ch.abil.CON.mod; }); hpMax = Math.max(1, hpMax || 10); }
  ch.hp = { max: hpMax, cur: hpCur === null ? hpMax : Math.min(hpCur, hpMax), temp: R.num(f('HPTemp'), 0) || 0 };
  ch.death = { s: [12, 13, 14].filter(box).length, f: [15, 16, 17].filter(box).length };

  // Waffen
  ch.weapons = [];
  const W3 = [['Wpn Name', 'Wpn1 AtkBonus', 'Wpn1 Damage'], ['Wpn Name 2', 'Wpn2 AtkBonus ', 'Wpn2 Damage '], ['Wpn Name 3', 'Wpn3 AtkBonus  ', 'Wpn3 Damage ']];
  for (const [n, a, d] of W3) {
    const name = String(f(n) || '').trim(); if (!name) continue;
    ch.weapons.push(makeWeapon(ch, name, f(a), f(d)));
  }
  // Text "Angriffe & Zauberwirken"
  const atkTxt = String(f('AttacksSpellcasting') || '');
  ch.text = { features: String(f('Features and Traits') || '') + '\n' + String(f('Feat+Traits') || ''), profs: String(f('ProficienciesLang') || ''), equipment: String(f('Equipment') || ''), attacks: atkTxt, treasure: String(f('Treasure') || '') };
  const spellOverrides = {};
  atkTxt.split(/\r\n|\r|\n/).forEach(line => {
    const m = line.match(/^\s*([^+\-\d(][^+\-]*?)\s*([+-]\s*\d+)\s*\(?\s*(\d+\s*[dw]\s*\d+[^)]*)\)?\s*(?:\+\s*(\d+))?/i);
    if (!m) return;
    const sp = R.matchSpell(m[1]);
    const dmgPlus = m[4] ? +m[4] : 0;
    if (sp) { spellOverrides[sp.key] = { atk: R.num(m[2], null), dmgBonus: dmgPlus }; return; }
    if (ch.weapons.some(w => R.norm(w.name) === R.norm(m[1]))) return;
    if (ch.weapons.length < 8) ch.weapons.push(makeWeapon(ch, m[1].trim(), m[2], m[3] + (dmgPlus ? '+' + dmgPlus : '')));
  });

  // Zauber
  ch.spellcasting = { cls: String(f('Spellcasting Class 2') || '').trim(), abil: parseAbil(f('SpellcastingAbility 2')), dc: R.num(f('SpellSaveDC  2'), null), atk: R.num(f('SpellAtkBonus 2'), null) };
  ch.spells = [];
  SPELL_FIELDS.forEach((list, lvlIdx) => list.forEach(([sf, cb]) => {
    const raw = String(fields['Spells ' + sf] || '').trim(); if (!raw) return;
    if (/divine smite|göttliches niederstrecken/i.test(raw)) return; // Klassenmerkmal, wird automatisch angeboten
    const sp = R.matchSpell(raw);
    const s = { id: uid(), raw, lvl: lvlIdx, ref: sp ? sp.key : null, prepared: lvlIdx === 0 || (cb ? box(cb) : false) };
    if (sp && sp.lvl !== lvlIdx) s.lvlMismatch = sp.lvl;
    if (sp && spellOverrides[sp.key]) Object.assign(s, spellOverrides[sp.key]);
    ch.spells.push(s);
  }));
  // Zauber, die nur im Angriffstext stehen
  for (const [k, o] of Object.entries(spellOverrides)) if (!ch.spells.some(s => s.ref === k)) { const sp = R.SPELL[k]; ch.spells.push(Object.assign({ id: uid(), raw: sp.en, lvl: sp.lvl, ref: k, prepared: true }, o)); }
  if (!ch.spellcasting.abil && ch.spells.length) ch.spellcasting.abil = guessCastAbil(ch);
  // Zauberplätze
  const sheetSlots = Array.from({ length: 9 }, (_, i) => R.num(fields['SlotsTotal ' + (19 + i)], 0) || 0);
  const sheetRem = Array.from({ length: 9 }, (_, i) => R.num(fields['SlotsRemaining ' + (19 + i)], null));
  const calc = R.computeSlots(ch);
  const wl = R.clsLvl(ch, 'warlock');
  ch.pact = wl ? Object.assign(D.PACT(wl), { used: 0 }) : null;
  const onlyWarlock = wl && ch.classes.length === 1;
  ch.slots = Array.from({ length: 9 }, (_, i) => {
    let max = calc[i];
    if (!onlyWarlock && sheetSlots.some(Boolean)) max = sheetSlots[i];
    return { max, used: 0 };
  });
  ch.slotHint = sheetRem;
  ch.slotsFromSheet = !onlyWarlock && sheetSlots.some(Boolean);
  // Ressourcen aus Klassen-Kit
  ch.resources = R.kit(ch).resources.map(r => ({ id: r.id, used: 0 }));
  ch.customRes = [];
  ch.effects = []; ch.exhaustion = 0; ch.concentration = null; ch.inspiration = R.num(f('Inspiration'), 0) > 0;
  ch.round = 1; ch.turn = null; ch.log = []; ch.setupDone = false;
  ch.settings = { twf: false };
  return ch;
}
function parseAbil(v) {
  const n = R.norm(v); if (!n) return null;
  const extra = { ges: 'DEX', kon: 'CON', wei: 'WIS', str: 'STR', int: 'INT', cha: 'CHA' }; if (extra[n]) return extra[n];
  for (const a of D.ABIL) if (D.ABIL_N[a].some(x => R.norm(x) === n || (n.length >= 3 && R.norm(x).startsWith(n)))) return a;
  return null;
}
function guessCastAbil(ch) {
  const order = { wizard: 'INT', cleric: 'WIS', druid: 'WIS', ranger: 'WIS', bard: 'CHA', sorcerer: 'CHA', warlock: 'CHA', paladin: 'CHA' };
  for (const c of ch.classes) if (order[c.key]) return order[c.key];
  return 'INT';
}
function makeWeapon(ch, name, atk, dmg) {
  const db = R.matchWeapon(name, dmg);
  const dmgFull = String(dmg || '').trim();
  const dm0 = dmgFull.match(/\d+\s*[dw]\s*\d+(?:\s*\/\s*\d+\s*[dw]\s*\d+)?(?:\s*[+\-−]\s*\d+)?/i);
  const dmgStr = dm0 ? dm0[0] + dmgFull.slice(dm0.index + dm0[0].length).replace(/^[^,]*/, m => m) : dmgFull;
  const alt = dmgStr.match(/^\s*(\d+\s*[dw]\s*\d+)\s*\/\s*(\d+\s*[dw]\s*\d+)(.*)$/i);
  let dmg1 = dm0 ? dm0[0] : dmgStr, dmg2 = null;
  if (alt) { dmg1 = alt[1] + alt[3]; dmg2 = alt[2] + alt[3]; }
  else if (db && db.versatile && /\dV|vielseitig|versatile/i.test(dmgFull)) { const p = R.parseDice(dmgStr); dmg2 = db.versatile + (p.flat ? (p.flat > 0 ? '+' : '') + p.flat : ''); }
  const type = (dmgFull.match(/(hieb|stich|wucht|slash|pierc|bludg|feuer|fire|kälte|cold|force|energie|blitz|lightning|nekro|necro|gift|poison|psych|gleiß|radiant|schall|thunder|säure|acid)/i) || [])[1];
  const dt = type ? Object.keys(D.DTYPES).find(k => D.DTYPES[k].some(x => R.norm(x).startsWith(R.norm(type).slice(0, 4))) || k.startsWith(R.norm(type).slice(0, 4))) : null;
  return { id: uid(), name, atk: R.num(atk, ch.prof + Math.max(ch.abil.STR.mod, 0)), dmg: R.diceStr(R.parseDice(dmg1)).replace(/W/g, 'd').replace(/−/g, '-'), dmg2: dmg2 ? R.diceStr(R.parseDice(dmg2)).replace(/W/g, 'd').replace(/−/g, '-') : null, type: dt || (db ? db.type : ''), wref: db ? db.en : null };
}
function blank(name) {
  const fields = { CharacterName: name || 'Neuer Charakter', ClassLevel: 'Fighter 1', HDTotal: '1d10', HPMax: '12' };
  const ch = build(fields, ''); ch.weapons = [{ id: uid(), name: 'Longsword', atk: 5, dmg: '1d8+3', dmg2: '1d10+3', type: 'slashing', wref: 'Longsword' }];
  return ch;
}
W.CM_IMPORT = { build, blank, makeWeapon, uid, SPELL_FIELDS };
})(window);
