/* DND5e Sessionverwaltung – Boss-NSCs (Werteblock + Charakterbogen) und Start von Begegnungen im Encounter Builder */
(function (W) {
'use strict';
const V = W.SV; const { $, esc, S, T, L, uid, save, toast } = V;
const render = () => V.render();

/* ---------- Stammdaten (wie im Encounter Builder) ---------- */
const AB_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const CRS = ['0', '1/8', '1/4', '1/2'].concat(Array.from({ length: 30 }, (_, i) => String(i + 1)));
const SIZES = { T: ['Winzig', 'Tiny'], S: ['Klein', 'Small'], M: ['Mittelgroß', 'Medium'], L: ['Groß', 'Large'], H: ['Riesig', 'Huge'], G: ['Gigantisch', 'Gargantuan'] };
const CTYPES = { aberration: ['Aberration', 'Aberration'], beast: ['Bestie', 'Beast'], celestial: ['Himmlischer', 'Celestial'], construct: ['Konstrukt', 'Construct'], dragon: ['Drache', 'Dragon'], elemental: ['Elementar', 'Elemental'], fey: ['Feenwesen', 'Fey'], fiend: ['Unhold', 'Fiend'], giant: ['Riese', 'Giant'], humanoid: ['Humanoider', 'Humanoid'], monstrosity: ['Monstrosität', 'Monstrosity'], ooze: ['Schlick', 'Ooze'], plant: ['Pflanze', 'Plant'], undead: ['Untoter', 'Undead'] };
const DMG = { acid: ['Säure', 'acid'], bludgeoning: ['Wucht', 'bludgeoning'], cold: ['Kälte', 'cold'], fire: ['Feuer', 'fire'], force: ['Energie', 'force'], lightning: ['Blitz', 'lightning'], necrotic: ['Nekrotisch', 'necrotic'], piercing: ['Stich', 'piercing'], poison: ['Gift', 'poison'], psychic: ['Psychisch', 'psychic'], radiant: ['Gleißend', 'radiant'], slashing: ['Hieb', 'slashing'], thunder: ['Schall', 'thunder'] };
const DMG_WORDS = { hieb: 'slashing', stich: 'piercing', wucht: 'bludgeoning', feuer: 'fire', kälte: 'cold', blitz: 'lightning', gift: 'poison', säure: 'acid', nekrotisch: 'necrotic', gleißend: 'radiant', psychisch: 'psychic', schall: 'thunder', energie: 'force', energ: 'force' };
const ABN = () => V.ABIL_N[S.lang] || V.ABIL_N.de;
const mod = v => Math.floor(((+v || 10) - 10) / 2);
const sign = v => (v >= 0 ? '+' : '') + v;
const Lp = p => (S.lang === 'en' ? p[1] : p[0]);

/* ---------- Pfade zu den anderen Tools (Einstellungen der Startseite, gleicher Ursprung) ---------- */
function toolUrl(key, file) {
  let U = {}; try { U = JSON.parse(localStorage.getItem('dnd5e-landing-v1') || '{}') || {}; } catch (e) { U = {}; }
  const p = U.paths || {}; const f = String(p[key] || file).trim(); const dir = String(p.folder || '').trim();
  const isAbs = s => /^[a-zA-Z]:[\\/]/.test(s) || /^\\\\/.test(s) || /^\//.test(s) || /^[a-z]+:\/\//i.test(s);
  const path = isAbs(f) || !dir ? f : dir.replace(/[\\/]+$/, '') + (/^[a-zA-Z]:|\\/.test(dir) ? '\\' : '/') + f.replace(/^[\\/]+/, '');
  if (/^[a-z]+:\/\//i.test(path)) return path;
  let s = path.replace(/\\/g, '/');
  if (/^[a-zA-Z]:\//.test(s)) s = 'file:///' + s; else if (/^\/\//.test(s)) s = 'file:' + s;
  return encodeURI(s).replace(/#/g, '%23').replace(/\?/g, '%3F');
}
V.toolUrl = toolUrl;

/* ---------- Boss-Daten ---------- */
function newBoss(n) {
  const sb = n.sb || (V.G.statBlock ? V.G.statBlock(n.prof) : 'commoner'); const M = W.SV_MON[sb];
  return {
    on: true, base: sb, useBase: true, cr: M ? String(M[2]) : '1', ac: M ? M[3] : 12, hp: M ? M[4] : 20, hd: '', speed: 30, size: 'M', type: M ? M[5] : 'humanoid', acn: '',
    ab: [null, null, null, null, null, null], sv: ['', '', '', '', '', ''],
    multi: '', atk: [], area: { n: '', dc: '', save: 'dex', dmg: '', type: 'fire', half: true },
    legRes: 0, legN: 3, leg: '', rea: '', traits: '', dr: '', di: '', ci: '', sen: '', lang: ''
  };
}
function bossOf(n) { if (!n.boss) n.boss = newBoss(n); const b = n.boss; b.ab = b.ab || [null, null, null, null, null, null]; b.sv = b.sv || ['', '', '', '', '', '']; b.atk = b.atk || []; b.area = b.area || { n: '', save: 'dex', type: 'fire', half: true }; return b; }
const isBoss = n => !!(n && n.boss && n.boss.on);
V.isBoss = isBoss;
const crXp = cr => V.crXp(cr);

function normDice(s) { const d = String(s || '').trim().replace(/[wW]/g, 'd').replace(/\s+/g, ''); return /^(\d*d\d+([+-]\d+)?|\d+)$/.test(d) ? d : ''; }
function lines(txt) {
  return String(txt || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => { const i = l.indexOf(':'); const n = i > 0 ? l.slice(0, i).trim() : (S.lang === 'en' ? 'Trait' : 'Merkmal'); const d = i > 0 ? l.slice(i + 1).trim() : l; return { n, nd: n, d, dd: d }; });
}
/* Kreatur im Format des Encounter Builders (eigene Kreatur) */
function bossCreature(n) {
  const b = bossOf(n); const name = (n.name || 'NSC').split(' „')[0].trim() || 'NSC';
  const ab = b.ab.map(v => (v === null || v === '' || isNaN(+v) ? null : Math.max(1, Math.min(30, +v))));
  const sv = {}; AB_KEYS.forEach((k, i) => { if (b.sv[i] !== '' && b.sv[i] != null && !isNaN(+b.sv[i])) sv[k] = +b.sv[i]; });
  const act = [];
  if (String(b.multi || '').trim()) act.push({ n: 'Multiattack', nd: 'Mehrfachangriff', d: b.multi.trim(), dd: b.multi.trim() });
  b.atk.forEach(a => { if (!a || !String(a.n || '').trim()) return; const dx = normDice(a.dmg); act.push({ n: a.n.trim(), nd: a.n.trim(), hit: parseInt(a.hit, 10) || 0, rng: a.rng || 'reach 5 ft.', dmg: dx ? [[dx, a.type || 'slashing']] : [] }); });
  const ar = b.area || {};
  if (String(ar.n || '').trim()) { const dx = normDice(ar.dmg); act.push({ n: ar.n.trim(), nd: ar.n.trim(), dc: parseInt(ar.dc, 10) || 10, save: ar.save || 'dex', dmg: dx ? [[dx, ar.type || 'fire']] : [], half: !!ar.half }); }
  const tr = lines(b.traits);
  const lr = parseInt(b.legRes, 10) || 0;
  if (lr > 0) tr.unshift({ n: 'Legendary Resistance (' + lr + '/Day)', nd: 'Legendäre Resistenz (' + lr + '/Tag)', d: 'If ' + name + ' fails a saving throw, they can choose to succeed instead.', dd: 'Wenn ' + name + ' einen Rettungswurf nicht schafft, kann er stattdessen entscheiden, ihn zu bestehen.' });
  let leg = lines(b.leg);
  if (leg.length) { const k = parseInt(b.legN, 10) || 3; leg.unshift({ n: 'Legendary Actions (' + k + '/round)', nd: 'Legendäre Aktionen (' + k + '/Runde)', d: name + ' can take ' + k + ' legendary actions, choosing from the options below, at the end of another creature\'s turn. Spent actions are regained at the start of their turn.', dd: name + ' kann ' + k + ' legendäre Aktionen ausführen, jeweils am Ende des Zuges einer anderen Kreatur. Verbrauchte Aktionen erhält er zu Beginn seines Zuges zurück.' }); }
  const rea = lines(b.rea);
  const hp = Math.max(1, parseInt(b.hp, 10) || 1);
  const m = {
    id: 'sv-npc-' + n.id, en: name, de: name, size: b.size || 'M', type: b.type || 'humanoid', al: '', ac: parseInt(b.ac, 10) || 10, acn: b.acn || '', hp, hd: b.hd || String(hp),
    spd: { walk: parseInt(b.speed, 10) || 30 }, ab, sv, sen: b.sen || '', lang: b.lang || '', cr: String(b.cr || '1'), env: ['urban'], tr, act, custom: true, faction: '', svNpc: n.id, boss: true
  };
  if (leg.length) m.leg = leg; if (rea.length) m.rea = rea;
  if (b.dr) m.dr = b.dr; if (b.di) m.di = b.di; if (b.ci) m.ci = b.ci;
  if (b.useBase && b.base) m.base = b.base; // fehlende Werte ergänzt der Encounter Builder aus dem SRD-Block
  return m;
}
V.bossCreature = bossCreature;

/* Werte aus einem Charakterbogen übernehmen */
function crFromLevel(l) { l = +l || 1; if (l <= 1) return '1/2'; if (l === 2) return '1'; return String(Math.min(20, l - 1)); }
function speedFt(p) { const s = String(p.speedRaw || p.speed || ''); const v = parseFloat(s.replace(',', '.')); if (!v) return 30; return /ft|fuß/i.test(s) ? Math.round(v) : Math.round(v / 1.5 * 5); }
function parseAttacks(txt) {
  const out = [];
  String(txt || '').split(/\n|;/).forEach(l => {
    const m = l.match(/^\s*([^:]+?):?\s+([+-]\d+)(?:\s*(?:Angriff|to hit|attack))?\s*,?\s*(\d+\s*[dDwW]\s*\d+(?:\s*[+-]\s*\d+)?)\s*([A-Za-zÄÖÜäöüß]+)?/i);
    if (!m) return; const w = (m[4] || '').toLowerCase(); const ty = DMG_WORDS[w] || (DMG[w] ? w : 'slashing');
    out.push({ n: m[1].replace(/[:–-]\s*$/, '').trim(), hit: m[2].replace('+', ''), dmg: m[3].replace(/\s/g, '').replace(/[+-]0$/, ''), type: ty });
  });
  return out.slice(0, 6);
}
function applySheet(n) {
  const p = n.sheet; if (!p) return; const b = bossOf(n);
  b.ac = p.ac || b.ac; b.hp = p.hp || b.hp; b.ab = (p.abil || []).slice(0, 6).map(v => +v || 10);
  b.sv = (p.saves || []).map((v, i) => (+v !== mod(b.ab[i]) ? String(v) : ''));
  b.cr = crFromLevel(p.lvl); b.speed = speedFt(p); b.type = 'humanoid'; b.useBase = false;
  const at = parseAttacks(p.text && p.text.attacks); if (at.length) b.atk = at;
  const ft = String((p.text && p.text.features) || '');
  if (/Zusätzlicher Angriff|Extra Attack/i.test(ft) && !b.multi) { const k = /Kämpfer|Fighter/i.test(p.cls || '') ? (p.lvl >= 20 ? 4 : p.lvl >= 11 ? 3 : 2) : 2; b.multi = T(k + ' Waffenangriffe pro Aktion.', k + ' weapon attacks per action.'); }
  if (ft && !b.traits) {
    const own = [], cls = [];
    ft.split('\n').map(l => l.trim()).filter(Boolean).forEach(l => { const m = l.match(/^(?:Stufe|Level)\s*\d+\s*:\s*(.+)$/i); if (m) m[1].split(/,\s*/).forEach(x => { if (!/Attributsverbesserung|Ability Score/i.test(x) && x.trim()) cls.push(x.trim()); }); else own.push(l); });
    if (cls.length) own.push(T('Klassenmerkmale', 'Class features') + ': ' + cls.join(', '));
    b.traits = own.slice(0, 12).join('\n');
  }
  if (p.spell && p.spell.dc && !/Zauber|Spellcasting/i.test(b.traits)) b.traits = (b.traits ? b.traits + '\n' : '') + T('Zauberwirken', 'Spellcasting') + ': ' + T('Zauber-SG', 'spell save DC') + ' ' + p.spell.dc + (p.spell.atk ? ', ' + T('Zauberangriff', 'spell attack') + ' ' + p.spell.atk : '') + (p.spell.cls ? ' (' + p.spell.cls + ')' : '');
}
/* Boss-Einträge in Begegnungen aktuell halten */
function bossItem(n) { const b = bossOf(n); const nm = (n.name || 'NSC').split(' „')[0]; return { mid: 'sv-npc-' + n.id, count: 1, role: '', de: nm, en: nm, cr: String(b.cr), ac: b.ac, hp: b.hp, custom: true, leader: true, npcId: n.id }; }
function refreshBossItems(n) {
  if (!S.camp) return; const it0 = bossItem(n);
  S.camp.sessions.forEach(s => (s.encounters || []).forEach(e => e.items.forEach(it => { if (it.npcId === n.id) { const c = it.count; Object.assign(it, it0, { count: c }); } })));
}
function touch(n) { refreshBossItems(n); if (!S.npcNew) { n.updated = Date.now(); save(); } }

/* ---------- Begegnung im Encounter Builder starten ---------- */
function partyOf() {
  const c = S.camp; const s = V.curSession();
  const ids = s && s.present && s.present.length ? s.present : c.pcs.map(p => p.id);
  return c.pcs.filter(p => ids.includes(p.id)).map(p => ({ name: p.name, lvl: p.lvl || 1, ac: p.ac || '', hp: p.hp || '', init: p.init || 0 }));
}
function launch(enc) {
  const c = S.camp; const party = partyOf(); const custom = [];
  enc.items.forEach(it => { const nid = it.npcId || (String(it.mid).indexOf('sv-npc-') === 0 ? String(it.mid).slice(7) : null); if (!nid) return; const n = c.npcs.find(x => x.id === nid); if (n) custom.push(bossCreature(n)); });
  const payload = {
    v: 1, ts: Date.now(), from: 'sv', camp: c.name,
    enc: { svId: enc.id, name: enc.name, items: enc.items.map(it => ({ mid: it.mid, count: it.count || 1, role: it.role || '', leader: !!it.leader })), levels: enc.levels || [], pnames: enc.pnames || [], diff: enc.diff || '', encType: enc.encType || '', env: enc.env || '', hint: enc.hint || null },
    party, custom
  };
  try { localStorage.setItem('eb.launch', JSON.stringify(payload)); }
  catch (e) { toast(T('Konnte die Begegnung nicht übergeben (Speicher voll?).', 'Could not hand over the encounter (storage full?).')); return; }
  const w = W.open(toolUrl('encounter', 'DND5e_Encounter_Builder.html'), 'dnd5e-eb');
  toast(w ? '⚔️ ' + T('Encounter Builder wird geöffnet – die Begegnung startet direkt im Kampf.', 'Opening the Encounter Builder – the encounter starts right in combat.') : T('Bitte Pop-ups für diese Seite erlauben und erneut klicken.', 'Please allow pop-ups for this page and click again.'), 4500);
}
V.launchEncounter = launch;
function findEnc(id) { for (const s of S.camp.sessions) { const e = (s.encounters || []).find(x => x.id === id); if (e) return e; } return null; }

/* ---------- Oberfläche: Boss-Abschnitt im NSC-Editor ---------- */
const opt = (o, cur) => Object.keys(o).map(k => '<option value="' + k + '"' + (String(cur) === k ? ' selected' : '') + '>' + esc(Lp(o[k])) + '</option>').join('');
const inp = (k, v, type, ph, cls) => '<input type="' + (type || 'text') + '" data-in="boss" data-k="' + k + '" value="' + esc(v == null ? '' : v) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + (cls ? ' class="' + cls + '"' : '') + '>';
V.bossSection = function (n) {
  const on = isBoss(n);
  let h = '<div class="bosswrap' + (on ? ' on' : '') + '"><h4 class="kick">👑 ' + T('Boss / wichtiger Gegner', 'Boss / major foe') +
    ' <label class="chk bosstgl"><input type="checkbox" data-ch="bossOn"' + (on ? ' checked' : '') + '> ' + T('mit vollen Spielwerten', 'with full stats') + '</label></h4>';
  if (!on) return h + '<p class="tiny muted">' + T('Für Bösewichte, Anführer und Bosse: eigener Werteblock (HG, Angriffe, legendäre Aktionen …) und/oder ein richtiger Charakterbogen aus dem Creator. Der NSC lässt sich dann direkt im Encounter Builder bekämpfen.', 'For villains, leaders and bosses: a custom stat block (CR, attacks, legendary actions …) and/or a real character sheet from the Creator. The NPC can then be fought directly in the Encounter Builder.') + '</p></div>';
  const b = bossOf(n); const p = n.sheet; const M = W.SV_MON[b.base];
  // Charakterbogen
  h += '<div class="bossgrid"><div class="bcard"><div class="bh">📄 ' + T('Charakterbogen', 'Character sheet') + '</div>' +
    (p ? '<div class="small"><b>' + esc(p.name) + '</b> · ' + esc([p.cls, p.race].filter(Boolean).join(' · ')) + '</div><div class="tiny muted">' + T('Stufe', 'Level') + ' ' + p.lvl + ' · RK ' + p.ac + ' · TP ' + (p.hp || '–') + ' · ' + ABN().map((a, i) => a + ' ' + p.abil[i]).join(' ') + (p.spell && p.spell.dc ? ' · ' + T('Zauber-SG', 'Spell DC') + ' ' + p.spell.dc : '') + '</div>' +
      '<div class="row bbtn">' + (p.pdf ? '<button class="btn sm" data-a="bossPdf">📄 ' + T('PDF öffnen', 'Open PDF') + '</button>' : '') + '<button class="btn sm gold" data-a="bossFromSheet">⤵ ' + T('Werte in den Werteblock', 'Copy to stat block') + '</button><button class="btn sm" data-a="bossSheet">🔄 ' + T('Neuer Bogen', 'New sheet') + '</button><button class="btn sm ghost" data-a="bossSheetDel">🗑️</button></div>'
      : '<p class="tiny muted">' + T('Erstelle den NSC im Creator wie einen Spielercharakter (Klasse, Stufe, Zauber …), speichere das PDF und lade es hier. Die Werte lassen sich dann in den Werteblock übernehmen.', 'Create the NPC in the Creator like a player character (class, level, spells …), save the PDF and load it here. Its values can then be copied into the stat block.') + '</p>' +
      '<div class="row bbtn"><button class="btn sm" data-a="bossCreator">⚔️ ' + T('Im Creator erstellen', 'Create in the Creator') + '</button><button class="btn sm primary" data-a="bossSheet">📄 ' + T('Bogen laden (PDF)', 'Load sheet (PDF)') + '</button></div>') + '</div>';
  // Werteblock
  const xp = crXp(b.cr);
  h += '<div class="bcard"><div class="bh">👑 ' + T('Boss-Werteblock', 'Boss stat block') + ' <span class="tiny muted">HG ' + esc(b.cr) + ' · ' + xp.toLocaleString(S.lang === 'en' ? 'en-US' : 'de-DE') + ' EP</span></div>' +
    '<div class="bgrid">' +
    '<label>HG<select data-ch="boss" data-k="cr">' + CRS.map(c => '<option' + (String(b.cr) === c ? ' selected' : '') + '>' + c + '</option>').join('') + '</select></label>' +
    '<label>RK' + inp('ac', b.ac, 'number') + '</label><label>TP' + inp('hp', b.hp, 'number') + '</label><label>' + T('Trefferwürfel', 'Hit dice') + inp('hd', b.hd, 'text', '12W8+24') + '</label>' +
    '<label>' + T('Bewegung (ft)', 'Speed (ft)') + inp('speed', b.speed, 'number') + '</label>' +
    '<label>' + T('Größe', 'Size') + '<select data-ch="boss" data-k="size">' + opt(SIZES, b.size) + '</select></label>' +
    '<label>' + T('Art', 'Type') + '<select data-ch="boss" data-k="type">' + opt(CTYPES, b.type) + '</select></label>' +
    '<label>' + T('Rüstung', 'Armor') + inp('acn', b.acn, 'text', T('z. B. Plattenpanzer', 'e.g. plate')) + '</label></div>' +
    '<div class="babs">' + ABN().map((a, i) => '<div class="bab"><b>' + a + '</b><input type="number" min="1" max="30" data-in="bossAb" data-i="' + i + '" value="' + (b.ab[i] == null ? '' : b.ab[i]) + '" placeholder="' + (b.useBase ? 'SRD' : '10') + '"><span class="tiny">' + (b.ab[i] == null ? '' : sign(mod(b.ab[i]))) + '</span><input type="number" data-in="bossSv" data-i="' + i + '" value="' + esc(b.sv[i]) + '" placeholder="RW" title="' + T('Rettungswurf-Bonus (leer = Attributsmodifikator)', 'Saving throw bonus (empty = ability modifier)') + '"></div>').join('') + '</div>' +
    (M ? '<label class="chk tiny"><input type="checkbox" data-ch="bossBase"' + (b.useBase ? ' checked' : '') + '> ' + T('Fehlende Werte, Angriffe und Merkmale aus dem SRD-Block ergänzen:', 'Fill missing stats, attacks and traits from the SRD block:') + ' <b>' + esc(S.lang === 'en' ? M[1] : M[0]) + '</b> (' + T('siehe „Spielwerte (SRD)“ oben', 'see "Stat block (SRD)" above') + ')</label>' : '') +
    '<div class="bsub">' + T('Angriffe', 'Attacks') + ' <span class="tiny muted">' + T('Name · Bonus · Schaden · Art', 'name · bonus · damage · type') + '</span></div>' +
    b.atk.map((a, i) => '<div class="row batk"><input type="text" data-in="bossAtk" data-i="' + i + '" data-k="n" value="' + esc(a.n) + '" placeholder="' + T('z. B. Langschwert', 'e.g. Longsword') + '" class="grow"><input type="number" data-in="bossAtk" data-i="' + i + '" data-k="hit" value="' + esc(a.hit) + '" placeholder="+" class="bhit"><input type="text" data-in="bossAtk" data-i="' + i + '" data-k="dmg" value="' + esc(a.dmg) + '" placeholder="2W8+4" class="bdmg"><select data-ch="bossAtkT" data-i="' + i + '">' + opt(DMG, a.type || 'slashing') + '</select><button class="btn sm ghost" data-a="bossAtkDel" data-i="' + i + '">✕</button></div>').join('') +
    (b.atk.length < 8 ? '<button class="btn sm" data-a="bossAtkAdd">＋ ' + T('Angriff', 'Attack') + '</button>' : '') +
    '<label class="blk2">' + T('Mehrfachangriff', 'Multiattack') + inp('multi', b.multi, 'text', T('z. B. Zwei Langschwert-Angriffe und ein Schildstoß', 'e.g. two longsword attacks and a shield bash')) + '</label>' +
    '<div class="bsub">' + T('Flächenwirkung / Rettungswurf-Fähigkeit', 'Area / saving throw ability') + '</div><div class="row batk"><input type="text" data-in="bossArea" data-k="n" value="' + esc(b.area.n) + '" placeholder="' + T('z. B. Höllenfeuer', 'e.g. Hellfire') + '" class="grow">SG<input type="number" data-in="bossArea" data-k="dc" value="' + esc(b.area.dc) + '" class="bhit"><select data-ch="bossAreaS">' + AB_KEYS.map((k, i) => '<option value="' + k + '"' + (b.area.save === k ? ' selected' : '') + '>' + ABN()[i] + '</option>').join('') + '</select><input type="text" data-in="bossArea" data-k="dmg" value="' + esc(b.area.dmg) + '" placeholder="8W6" class="bdmg"><select data-ch="bossAreaT">' + opt(DMG, b.area.type || 'fire') + '</select><label class="chk tiny"><input type="checkbox" data-ch="bossAreaH"' + (b.area.half ? ' checked' : '') + '> ½</label></div>' +
    '<div class="bgrid">' +
    '<label>' + T('Legendäre Resistenz (pro Tag)', 'Legendary resistance (per day)') + inp('legRes', b.legRes, 'number') + '</label>' +
    '<label>' + T('Legendäre Aktionen pro Runde', 'Legendary actions per round') + inp('legN', b.legN, 'number') + '</label>' +
    '<label>' + T('Resistenzen', 'Resistances') + inp('dr', b.dr, 'text', T('z. B. Feuer, Gift', 'e.g. fire, poison')) + '</label>' +
    '<label>' + T('Immunitäten', 'Immunities') + inp('di', b.di) + '</label>' +
    '<label>' + T('Zustandsimmunitäten', 'Condition immunities') + inp('ci', b.ci) + '</label>' +
    '<label>' + T('Sinne', 'Senses') + inp('sen', b.sen, 'text', T('z. B. Dunkelsicht 18 m', 'e.g. darkvision 60 ft.')) + '</label></div>' +
    '<label class="blk2">' + T('Legendäre Aktionen', 'Legendary actions') + ' <span class="tiny muted">' + T('eine pro Zeile – „Name: Beschreibung“', 'one per line – "Name: description"') + '</span><textarea data-in="boss" data-k="leg" placeholder="' + T('Angriff: Der Boss führt einen Waffenangriff aus.\nRückzug (kostet 2 Aktionen): Bewegung ohne Gelegenheitsangriffe.', 'Attack: The boss makes one weapon attack.\nWithdraw (costs 2 actions): moves without provoking opportunity attacks.') + '">' + esc(b.leg) + '</textarea></label>' +
    '<label class="blk2">' + T('Reaktionen', 'Reactions') + '<textarea data-in="boss" data-k="rea" class="short" placeholder="' + T('Parieren: +3 RK gegen einen Nahkampfangriff.', 'Parry: +3 AC against one melee attack.') + '">' + esc(b.rea) + '</textarea></label>' +
    '<label class="blk2">' + T('Merkmale', 'Traits') + '<textarea data-in="boss" data-k="traits" placeholder="' + T('Zweite Phase: Bei halben TP …', 'Second phase: at half HP …') + '">' + esc(b.traits) + '</textarea></label>' +
    '</div></div>';
  // Aktionen
  const s = V.curSession(); const encs = s ? s.encounters || [] : [];
  h += '<div class="row bossact"><button class="btn primary" data-a="bossFight">⚔️ ' + T('Kampf gegen die Gruppe starten', 'Fight the party now') + '</button>' +
    '<select data-ch="bossToEnc"><option value="">➕ ' + T('Zu einer Begegnung der Session …', 'Add to a session encounter …') + '</option>' + encs.map(e => '<option value="' + e.id + '">' + esc(e.name) + '</option>').join('') + '<option value="new">＋ ' + T('Neue Begegnung', 'New encounter') + ' „' + esc(T('Boss', 'Boss') + ': ' + (n.name || '').split(' „')[0]) + '“</option></select>' +
    '<button class="btn" data-a="bossToEb">🛠️ ' + T('Als Kreatur in den Encounter Builder', 'Add to the Encounter Builder as creature') + '</button></div>' +
    (S.npcNew ? '<p class="tiny warn">' + T('Speichere den NSC zuerst, damit der Boss erhalten bleibt.', 'Save the NPC first so the boss is kept.') + '</p>' : '');
  return h + '</div>';
};

/* ---------- Aktionen ---------- */
const cur = () => S.npc;
Object.assign(V.A, {
  encStart(el) { const e = findEnc(el.dataset.id); if (!e) return; if (!e.items.length) { toast(T('Diese Begegnung hat keine Gegner.', 'This encounter has no enemies.')); return; } launch(e); },
  bossCreator() { W.open(toolUrl('creator', 'the-ultimate-dnd5e-creator.html'), 'dnd5e-creator'); toast(T('Creator geöffnet – PDF speichern und hier mit „Bogen laden“ einlesen.', 'Creator opened – save the PDF and load it here with "Load sheet".'), 4500); },
  bossSheet() {
    const n = cur(); V.pickFile('.pdf,application/pdf', false, async fs => {
      if (!fs[0]) return;
      try { const p = await V.parseSheet(fs[0]); const first = !n.sheet; n.sheet = p; if (first) applySheet(n); touch(n); toast('📄 ' + p.name + (first ? ' – ' + T('Werte übernommen', 'stats copied') : '')); render(); }
      catch (e) { console.error(e); toast(fs[0].name + ': ' + e.message); }
    });
  },
  bossSheetDel() { const n = cur(); n.sheet = null; touch(n); render(); },
  bossPdf() { const n = cur(); if (n.sheet && n.sheet.pdf) V.openDataUrl(n.sheet.pdf, n.sheet.pdfName); },
  bossFromSheet() { const n = cur(); applySheet(n); touch(n); toast('⤵ ' + T('Werte aus dem Bogen übernommen', 'Stats copied from the sheet')); render(); },
  bossAtkAdd() { const n = cur(); bossOf(n).atk.push({ n: '', hit: '', dmg: '', type: 'slashing' }); touch(n); render(); },
  bossAtkDel(el) { const n = cur(); bossOf(n).atk.splice(+el.dataset.i, 1); touch(n); render(); },
  bossFight() {
    const n = cur(); if (!n.name) { toast(T('Bitte zuerst einen Namen vergeben.', 'Please give the NPC a name first.')); return; }
    const nm = n.name.split(' „')[0];
    launch({ id: 'boss-' + n.id, name: T('Boss', 'Boss') + ': ' + nm, items: [bossItem(n)], levels: [], pnames: [], encType: 'boss', env: 'urban' });
  },
  bossToEb() {
    const n = cur(); const m = bossCreature(n); let arr = [];
    try { arr = JSON.parse(localStorage.getItem('eb.custom') || '[]') || []; } catch (e) { arr = []; }
    const i = arr.findIndex(x => x.id === m.id); if (i >= 0) arr[i] = m; else arr.push(m);
    try { localStorage.setItem('eb.custom', JSON.stringify(arr)); toast('🛠️ ' + m.de + ' – ' + T('im Encounter Builder unter „Eigene Kreaturen“ verfügbar (ggf. dort neu laden).', 'available in the Encounter Builder under custom creatures (reload it if open).'), 4500); }
    catch (e) { toast(T('Speichern im Encounter Builder nicht möglich.', 'Could not save to the Encounter Builder.')); }
  }
});
Object.assign(V.IN, {
  boss(el) { const n = cur(); const b = bossOf(n); const k = el.dataset.k; b[k] = el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value; touch(n); },
  bossAb(el) { const n = cur(); const b = bossOf(n); const i = +el.dataset.i; b.ab[i] = el.value === '' ? null : Math.max(1, Math.min(30, +el.value)); const t = el.nextElementSibling; if (t) t.textContent = b.ab[i] == null ? '' : sign(mod(b.ab[i])); touch(n); },
  bossSv(el) { const n = cur(); bossOf(n).sv[+el.dataset.i] = el.value; touch(n); },
  bossAtk(el) { const n = cur(); const a = bossOf(n).atk[+el.dataset.i]; if (a) { a[el.dataset.k] = el.value; touch(n); } },
  bossArea(el) { const n = cur(); bossOf(n).area[el.dataset.k] = el.value; touch(n); }
});
Object.assign(V.CH, {
  bossOn(el) { const n = cur(); const b = bossOf(n); b.on = el.checked; touch(n); render(); },
  boss(el) { const n = cur(); bossOf(n)[el.dataset.k] = el.value; touch(n); if (el.dataset.k === 'cr') render(); },
  bossBase(el) { const n = cur(); bossOf(n).useBase = el.checked; touch(n); render(); },
  bossAtkT(el) { const n = cur(); const a = bossOf(n).atk[+el.dataset.i]; if (a) { a.type = el.value; touch(n); } },
  bossAreaS(el) { const n = cur(); bossOf(n).area.save = el.value; touch(n); },
  bossAreaT(el) { const n = cur(); bossOf(n).area.type = el.value; touch(n); },
  bossAreaH(el) { const n = cur(); bossOf(n).area.half = el.checked; touch(n); },
  bossToEnc(el) {
    const n = cur(); const v = el.value; el.value = ''; if (!v) return;
    if (S.npcNew) { toast(T('Bitte den NSC zuerst speichern.', 'Please save the NPC first.')); return; }
    if (!V.curSession()) V.newSession(); const s = V.curSession(); const nm = (n.name || '').split(' „')[0];
    let e = v === 'new' ? null : s.encounters.find(x => x.id === v);
    if (!e) { e = { id: uid(), srcId: null, name: T('Boss', 'Boss') + ': ' + nm, levels: [], pnames: [], diff: '', encType: 'boss', env: '', hint: null, status: 'planned', notes: '', imported: Date.now(), items: [] }; s.encounters.push(e); }
    const ex = e.items.find(it => it.npcId === n.id); if (ex) ex.count++; else e.items.push(bossItem(n));
    if (!(n.sessions || []).includes(s.id)) { n.sessions = (n.sessions || []).concat(s.id); }
    save(); toast('👑 ' + nm + ' → ' + e.name); render();
  }
});
})(window);
