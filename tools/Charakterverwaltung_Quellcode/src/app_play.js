/* Charakterverwaltung – Spiellogik: Optionen, Würfe, Ausführen, TP, Runden, Rasten */
(function (W) {
'use strict';
const C = W.CM, { D, R, S, T, L, esc, fmt } = C;

/* ---------- Waffen ---------- */
function weaponInfo(ch, w) {
  const db = w.wref ? D.WEAPONS.find(x => x.en === w.wref) : null;
  const unarmed = w.id === 'unarmed' || (db && db.unarmed);
  const ranged = !!(db && db.ranged) || w.ranged === true;
  const finesse = !!(db && db.finesse);
  let abil = ranged ? 'DEX' : (finesse && ch.abil.DEX.mod > ch.abil.STR.mod ? 'DEX' : 'STR');
  if (unarmed && R.clsLvl(ch, 'monk') && ch.abil.DEX.mod > ch.abil.STR.mod) abil = 'DEX';
  return { db, unarmed, ranged, melee: !ranged, finesse, light: !!(db && db.light), thrown: !!(db && db.thrown), versatile: !!w.dmg2, abil, mod: ch.abil[abil].mod, twoH: !!(db && db.twoH) };
}
function unarmedWeapon(ch) {
  const md = C.K(ch).martial; const wi = { abil: md && ch.abil.DEX.mod > ch.abil.STR.mod ? 'DEX' : 'STR' }; const m = ch.abil[wi.abil].mod;
  return { id: 'unarmed', name: T('Waffenloser Schlag', 'Unarmed Strike'), atk: ch.prof + m, dmg: md ? '1d' + md + (m ? (m > 0 ? '+' : '') + m : '') : String(Math.max(1, 1 + m)), type: 'bludgeoning', wref: 'Unarmed Strike' };
}
function allWeapons(ch) { return ch.weapons.concat([unarmedWeapon(ch)]); }
const wById = (ch, id) => allWeapons(ch).find(w => w.id === id);

/* ---------- Optionen ("Was kannst du tun?") ---------- */
function preparedFilter(ch, s) {
  if (s.lvl === 0) return true;
  if (ch.prepMode) return !!s.prepared;
  const anyPrep = ch.spells.some(x => x.lvl > 0 && x.prepared);
  const preparers = ['cleric', 'druid', 'paladin', 'wizard'];
  if (!anyPrep || !ch.classes.some(c => preparers.includes(c.key))) return true;
  return !!s.prepared;
}
/* Auslöser für Reaktionen (Hinweis: Reaktionen finden meist im Zug eines anderen statt) */
const SPELL_TRIGGER = {
  shield: ['Wenn dich ein Angriff trifft oder du Ziel von Magisches Geschoss bist', 'When an attack hits you or you are targeted by Magic Missile'],
  hellish_rebuke: ['Wenn dir eine Kreatur, die du sehen kannst, Schaden zufügt', 'When a creature you can see damages you'],
  counterspell: ['Wenn eine Kreatur in 18 m einen Zauber wirkt', 'When a creature within 60 ft casts a spell'],
  feather_fall: ['Wenn du oder eine Kreatur in 18 m fällt', 'When you or a creature within 60 ft falls'],
  absorb_elements: ['Wenn du Säure-, Kälte-, Feuer-, Blitz- oder Schallschaden erleidest', 'When you take acid, cold, fire, lightning or thunder damage']
};
const OA_TRIGGER = ['Wenn eine Kreatur, die du sehen kannst, deine Reichweite verlässt', 'When a creature you can see leaves your reach'];
function buildOptions(ch) {
  const E = C.econ(ch), t = ch.turn, k = C.K(ch);
  const G = { action: [], bonus: [], reaction: [], free: [], move: [] };
  const add = (g, o) => { o.key = g + '|' + o.k + '|' + (o.id || '') + '|' + (o.cost || ''); G[g].push(o); };
  const notTurn = t.phase !== 'turn' ? T('Nicht dein Zug (Gegnerphase)', 'Not your turn (enemy phase)') : null;
  const incW = E.inc ? T('Kampfunfähig', 'Incapacitated') : null;
  const actW = incW || notTurn || (!E.actionLeft ? (E.slow && t.bonusUsed ? T('Verlangsamt: Bonusaktion bereits genutzt', 'Slowed: bonus action already used') : T('Aktion bereits verbraucht', 'Action already used')) : null);
  const bonW = incW || notTurn || (!E.bonusLeft ? (E.slow && t.actUsed ? T('Verlangsamt: Aktion bereits genutzt', 'Slowed: action already used') : T('Bonusaktion bereits verbraucht', 'Bonus action already used')) : null);
  const reaW = incW || (C.anyFx(ch, 'noReact') ? T('Keine Reaktionen möglich', 'No reactions possible') : t.reactUsed ? T('Reaktion bereits verbraucht', 'Reaction already used') : null);
  const weps = allWeapons(ch);
  const wdesc = (w) => { const wi = weaponInfo(ch, w); return fmt(w.atk) + ' · ' + w.dmg.replace(/d/g, T('W', 'd')) + (w.dmg2 ? '/' + R.parseDice(w.dmg2).terms.map(x => x.n + T('W', 'd') + x.d)[0] : '') + ' ' + dt(w.type) + (wi.ranged ? ' · ' + T('Fernkampf', 'ranged') : ''); };

  // AKTION
  if (t.attacksLeft > 0 && !incW && !notTurn) {
    weps.forEach(w => add('action', { k: 'weapon', id: w.id, cost: 'attack', label: w.name, tag: T('Angriff', 'Attack') + ' · ' + T('noch ', '') + t.attacksLeft + T('', ' left'), desc: wdesc(w), ok: true, cls: 'atk' }));
    add('action', { k: 'basic', id: 'grapple', cost: 'attack', label: T('Packen', 'Grapple'), tag: T('ersetzt Angriff', 'replaces attack'), desc: T('Athletik gegen Athletik/Akrobatik', 'Athletics vs Athletics/Acrobatics'), ok: true });
    add('action', { k: 'basic', id: 'shove', cost: 'attack', label: T('Stoßen', 'Shove'), tag: T('ersetzt Angriff', 'replaces attack'), desc: T('Umstoßen oder 1,5 m wegstoßen', 'Knock prone or push 5 ft'), ok: true });
  }
  const n = C.attacksPerAction(ch);
  weps.forEach(w => add('action', { k: 'weapon', id: w.id, cost: 'action', label: w.name, tag: T('Angriffsaktion', 'Attack action') + (n > 1 ? ' ×' + n : ''), desc: wdesc(w), ok: !actW && !(t.attacksLeft > 0), why: actW || T('Angriffsaktion läuft', 'Attack action in progress'), cls: 'atk' }));
  ch.spells.forEach(s => {
    if (!preparedFilter(ch, s)) return; const si = C.spellInfo(ch, s); if (si.time !== 'A' && si.time !== 'M') return;
    const b = si.time === 'M' ? T('Wirkzeit > 1 Aktion', 'Casting time > 1 action') : C.spellBlock(ch, si, 'action');
    add('action', { k: 'spell', id: s.id, cost: 'action', label: si.name, tag: si.lvl ? si.lvl + '. ' + T('Grad', 'lvl') : T('Zaubertrick', 'Cantrip'), desc: spellSummary(ch, si), ok: !actW && !b, why: actW || b, cls: 'spell' });
    if (k.metamagic && si.time === 'A' && C.resLeft(ch, 'sorcery') >= 2) {
      const b2 = C.spellBlock(ch, si, 'bonus');
      add('bonus', { k: 'spell', id: s.id, cost: 'bonus', quick: true, label: si.name + T(' (beschleunigt)', ' (quickened)'), tag: T('2 Zaubereipunkte', '2 sorcery pts'), desc: spellSummary(ch, si), ok: !bonW && !b2, why: bonW || b2, cls: 'spell' });
    }
  });
  const BASIC = [
    ['dash', T('Spurt', 'Dash'), T('Zusätzliche Bewegung = Bewegungsrate', 'Extra movement equal to your speed')],
    ['disengage', T('Rückzug', 'Disengage'), T('Keine Gelegenheitsangriffe in diesem Zug', 'No opportunity attacks this turn')],
    ['dodge', T('Ausweichen', 'Dodge'), T('Angriffe gegen dich mit Nachteil, Vorteil auf GE-RW', 'Attacks against you have disadvantage, advantage on DEX saves')],
    ['help', T('Helfen', 'Help'), T('Verbündeter erhält Vorteil', 'An ally gains advantage')],
    ['hide', T('Verstecken', 'Hide'), T('Heimlichkeitsprobe', 'Stealth check')],
    ['ready', T('Vorbereiten', 'Ready'), T('Aktion für einen Auslöser vorbereiten (nutzt später die Reaktion)', 'Prepare an action for a trigger (uses your reaction later)')],
    ['search', T('Suchen', 'Search'), T('Wahrnehmung oder Nachforschungen', 'Perception or Investigation')],
    ['useObject', T('Gegenstand benutzen', 'Use an Object'), T('z. B. Trank trinken', 'e.g. drink a potion')],
    ['grapple', T('Packen', 'Grapple'), T('Startet Angriffsaktion; Athletikprobe', 'Starts Attack action; Athletics check')],
    ['shove', T('Stoßen', 'Shove'), T('Startet Angriffsaktion; Athletikprobe', 'Starts Attack action; Athletics check')]
  ];
  BASIC.forEach(([id, l, d]) => add('action', { k: 'basic', id, cost: 'action', label: l, desc: d, ok: !actW && !(t.attacksLeft > 0 && (id === 'grapple' || id === 'shove')), why: actW || T('Angriffsaktion läuft', 'Attack action in progress') }));
  // Haste: eingeschränkte Zusatzaktion
  if (C.anyFx(ch, 'extraAction')) {
    const hW = incW || notTurn || (t.hasteUsed ? T('Hast-Aktion verbraucht', 'Haste action used') : t.attacksLeft ? T('Angriffsaktion läuft', 'Attack action in progress') : null);
    weps.forEach(w => add('action', { k: 'weapon', id: w.id, cost: 'haste', label: w.name, tag: T('Hast: 1 Angriff', 'Haste: 1 attack'), desc: wdesc(w), ok: !hW, why: hW, cls: 'atk' }));
    [['dash', T('Spurt', 'Dash')], ['disengage', T('Rückzug', 'Disengage')], ['hide', T('Verstecken', 'Hide')], ['useObject', T('Gegenstand benutzen', 'Use an Object')]].forEach(([id, l]) => add('action', { k: 'basic', id, cost: 'haste', label: l, tag: T('Hast', 'Haste'), ok: !hW, why: hW }));
  }

  // Klassen-/Volksoptionen + eigene Fähigkeiten
  const feats = k.options.slice();
  ch.customRes.forEach(c => { if (c.cost && c.cost !== 'none') feats.push({ id: 'c_' + c.id, name: [c.name, c.name], cost: c.cost, res: c.max ? c.id : null, desc: [c.desc || '', c.desc || ''], roll: c.dice ? { dice: c.dice, heal: c.heal, label: [T('Wurf', 'Roll'), 'Roll'], save: c.save ? { abil: c.save, dc: +c.saveDC || C.spellDC(ch), half: c.saveHalf !== false, aoe: !!c.aoe } : null } : null, custom: c, grant: c.grant ? 'action' : null, grantReact: c.grantReact, grantBonus: c.grantBonus }); });
  feats.forEach(o => {
    let g = o.cost === 'action' ? 'action' : o.cost === 'bonus' ? 'bonus' : o.cost === 'reaction' ? 'reaction' : o.cost === 'onhit' ? null : 'free';
    if (!g) return;
    let why = g === 'action' ? actW : g === 'bonus' ? bonW : g === 'reaction' ? reaW : (incW && o.id !== 'endRage' ? incW : null);
    if (!why && o.res && !o.pool && C.resLeft(ch, o.res) <= 0) why = T('Keine Nutzungen übrig', 'No uses left');
    if (!why && o.pool && C.resLeft(ch, o.res) <= 0) why = T('Vorrat leer', 'Pool empty');
    if (!why && o.hideIf && C.hasEff(ch, o.hideIf)) why = T('Bereits aktiv', 'Already active');
    if (!why && o.showIf && !C.hasEff(ch, o.showIf)) why = T('Nicht aktiv', 'Not active');
    if (!why && o.needsAttackAction && !t.attackAction) why = T('Erst die Angriffsaktion nutzen', 'Take the Attack action first');
    if (!why && o.firstAttack && t.firstAtkDone) why = T('Nur vor dem ersten Angriff im Zug', 'Only before your first attack this turn');
    if (!why && o.oncePerTurn && t.surges > 0) why = T('Nur einmal pro Zug', 'Only once per turn');
    if (!why && o.grant === 'action' && notTurn) why = notTurn;
    if (!why && o.firstAttack && notTurn) why = notTurn;
    if (!why && o.id === 'rage' && C.hasEff(ch, 'rage')) why = T('Bereits im Kampfrausch', 'Already raging');
    if (!why && o.font === 'toPts' && !ch.slots.some(s => s.max - s.used > 0)) why = T('Kein Zauberplatz frei', 'No free slot');
    if (!why && o.font === 'toSlot' && C.resLeft(ch, 'sorcery') < 2) why = T('Zu wenige Zaubereipunkte', 'Not enough sorcery points');
    if (!why && o.spellRef && C.anyFx(ch, 'noSpells')) why = T('Kein Zaubern im Kampfrausch', 'No spellcasting while raging');
    const left = o.res ? C.resLeft(ch, o.res) : null;
    const tag = (o.res ? (o.pool ? left + ' ' + T('Pkt.', 'pts') : left + '×') : (o.cost === 'free' ? T('frei', 'free') : ''));
    add(g, { k: 'feat', id: o.id, cost: o.cost, label: L(o.name), tag, desc: o.group ? L(o.desc).replace(/^[^:]+:\s*/, '') : L(o.desc), trigger: o.trigger || null, group: o.group ? L(o.group) : null, ok: !why, why, cls: 'feat', opt: o });
  });
  // Rasender Rückzug: Spurt als Bonusaktion
  if (C.anyFx(ch, 'bonusDash')) add('bonus', { k: 'basic', id: 'dash', cost: 'bonus', label: T('Spurt (Rasender Rückzug)', 'Dash (Expeditious Retreat)'), ok: !bonW, why: bonW });

  // BONUSAKTION
  if (t.bonusAttacks > 0 && !incW) { const u = unarmedWeapon(ch); add('bonus', { k: 'weapon', id: 'unarmed', cost: 'battack', label: u.name, tag: T('noch ', '') + t.bonusAttacks + T('', ' left'), desc: wdesc(u), ok: true, cls: 'atk' }); }
  const lightMelee = ch.weapons.filter(w => { const wi = weaponInfo(ch, w); return wi.light && wi.melee; });
  if (lightMelee.length) {
    const twW = bonW || (!t.lightAtk ? T('Erst Angriffsaktion mit leichter Nahkampfwaffe', 'First attack with a light melee weapon') : null);
    lightMelee.forEach(w => add('bonus', { k: 'weapon', id: w.id, cost: 'bonus', offhand: true, label: w.name + T(' (Zweitwaffe)', ' (off-hand)'), tag: T('Zwei Waffen', 'Two-weapon'), desc: wdesc(w) + (ch.settings.twf ? '' : T(' · ohne Attributsbonus', ' · no ability mod')), ok: !twW, why: twW, cls: 'atk' }));
  }
  ch.spells.forEach(s => { if (!preparedFilter(ch, s)) return; const si = C.spellInfo(ch, s); if (si.time !== 'B') return; const b = C.spellBlock(ch, si, 'bonus'); add('bonus', { k: 'spell', id: s.id, cost: 'bonus', label: si.name, tag: si.lvl ? si.lvl + '. ' + T('Grad', 'lvl') : T('Zaubertrick', 'Cantrip'), desc: spellSummary(ch, si), ok: !bonW && !b, why: bonW || b, cls: 'spell' }); });

  // REAKTION
  weps.filter(w => weaponInfo(ch, w).melee).forEach(w => add('reaction', { k: 'weapon', id: w.id, cost: 'reaction', label: w.name, tag: T('Gelegenheitsangriff', 'Opportunity attack'), desc: wdesc(w), trigger: OA_TRIGGER, ok: !reaW, why: reaW, cls: 'atk' }));
  ch.spells.forEach(s => { if (!preparedFilter(ch, s)) return; const si = C.spellInfo(ch, s); if (si.time !== 'R') return; const b = C.spellBlock(ch, si, 'reaction'); add('reaction', { k: 'spell', id: s.id, cost: 'reaction', label: si.name, tag: si.lvl ? si.lvl + '. ' + T('Grad', 'lvl') : '', desc: spellSummary(ch, si), trigger: SPELL_TRIGGER[s.ref] || null, ok: !reaW && !b, why: reaW || b, cls: 'spell' }); });

  // FREI / BEWEGUNG
  const prone = ch.effects.find(e => e.id === 'prone');
  if (prone) add('move', { k: 'basic', id: 'standUp', cost: 'move', label: T('Aufstehen', 'Stand up'), tag: Math.ceil(E.speed / 2) + ' ft', ok: !incW && !notTurn && E.moveLeft >= Math.ceil(E.speed / 2) && E.speed > 0, why: incW || notTurn || T('Nicht genug Bewegung', 'Not enough movement') });
  else add('move', { k: 'basic', id: 'dropProne', cost: 'free', label: T('Hinlegen', 'Drop prone'), tag: T('frei', 'free'), ok: !notTurn && !incW, why: notTurn || incW });
  add('free', { k: 'basic', id: 'object', cost: 'free', label: T('Objektinteraktion', 'Object interaction'), tag: '1×', desc: T('Waffe ziehen, Tür öffnen …', 'Draw a weapon, open a door …'), ok: E.objLeft, why: incW || notTurn || T('Bereits genutzt', 'Already used') });
  if (ch.concentration) add('free', { k: 'basic', id: 'endConc', cost: 'free', label: T('Konzentration beenden', 'End concentration'), desc: ch.concentration.name, ok: true });
  if (ch.effects.some(e => e.id === 'inspiration') || ch.inspiration) add('free', { k: 'basic', id: 'inspo', cost: 'free', label: T('Inspiration nutzen', 'Use Inspiration'), desc: T('Vorteil auf den nächsten Wurf', 'Advantage on your next roll'), ok: true });
  return G;
}
function dt(type) { return type && D.DTYPES[type] ? L(D.DTYPES[type]) : (type || ''); }
function spellSummary(ch, si) {
  const p = [];
  if (si.mode === 'atk') p.push(fmt(si.atk));
  if (si.mode === 'save') p.push(T('SG ', 'DC ') + C.spellDC(ch) + ' ' + (D.ABIL_N[si.save] ? D.ABIL_N[si.save][S.lang === 'en' ? 3 : 2] : si.save));
  const dm = C.spellDamage(ch, si, si.lvl); if (dm) p.push((dm.count > 1 ? dm.count + '× ' : '') + R.diceStr(dm.p).replace(/W/g, T('W', 'd')) + ' ' + (si.mode === 'heal' ? T('TP', 'HP') : dt(si.type)));
  if (si.conc) p.push(T('Konz.', 'Conc.'));
  return p.join(' · ');
}

/* ---------- Ökonomie verbrauchen ---------- */
function spend(ch, cost) {
  const t = ch.turn;
  switch (cost) {
    case 'action': t.actUsed++; break;
    case 'attackStart': t.actUsed++; t.attackAction = true; t.attacksLeft = C.attacksPerAction(ch) - 1; break;
    case 'attack': t.attacksLeft = Math.max(0, t.attacksLeft - 1); break;
    case 'haste': t.hasteUsed = true; break;
    case 'bonus': t.bonusUsed = true; break;
    case 'battack': t.bonusAttacks = Math.max(0, t.bonusAttacks - 1); break;
    case 'reaction': t.reactUsed = true; break;
  }
}
const costName = c => ({ action: T('Aktion', 'Action'), attack: T('Angriff der Angriffsaktion', 'Attack (Attack action)'), haste: T('Hast-Aktion', 'Haste action'), bonus: T('Bonusaktion', 'Bonus action'), battack: T('Bonusangriff', 'Bonus attack'), reaction: T('Reaktion', 'Reaction'), free: T('frei', 'free'), move: T('Bewegung', 'Movement') }[c] || c);

/* ---------- Vorteil/Nachteil & Modifikatoren ---------- */
function rollContext(ch, kind, o) {
  // kind: attack|save|check|init|death|conc ; o: {abil, weapon (wi), skill, prof}
  const adv = [], dis = [], dice = [], flats = []; let autoFail = false;
  for (const f of C.fxList(ch)) {
    const nm = L([f.def.de, f.def.en]); const fx = f.fx;
    if (kind === 'attack') {
      if (fx.atk === 'adv') adv.push(nm); if (fx.atk === 'dis') dis.push(nm);
      if (fx.atkStrAdv && o.wi && o.wi.melee && o.wi.abil === 'STR') adv.push(nm);
      if (fx.atkDice) dice.push({ id: f.e.uid || nm, label: nm, dice: fx.atkDice, on: true, eff: f.e.uid, once: fx.once === 'attack' });
    }
    if (kind === 'save' || kind === 'conc' || kind === 'death') {
      const a = o.abil;
      if (fx.saveAdv && a && fx.saveAdv.includes(a)) adv.push(nm);
      if (fx.saveDis && a && fx.saveDis.includes(a)) dis.push(nm);
      if (fx.autoFail && a && fx.autoFail.includes(a)) autoFail = nm;
      if (fx.saveDice) dice.push({ id: f.e.uid, label: nm, dice: fx.saveDice, on: true, eff: f.e.uid, once: fx.once === 'save' });
      if (fx.saveFlat && a && fx.saveFlat[a]) flats.push({ label: nm, v: fx.saveFlat[a] });
    }
    if (kind === 'check' || kind === 'init') {
      const a = o.abil;
      if (fx.checkDis === true || (Array.isArray(fx.checkDis) && fx.checkDis.includes(a))) dis.push(nm);
      if (fx.checkAdv && fx.checkAdv.includes(a)) adv.push(nm);
      if (fx.checkDice) dice.push({ id: f.e.uid, label: nm, dice: fx.checkDice, on: true, eff: f.e.uid, once: fx.once === 'check' });
      if (fx.skillFlat && o.skill && fx.skillFlat[o.skill]) flats.push({ label: nm, v: fx.skillFlat[o.skill] });
    }
    if (fx.anyDice && kind !== 'death') { const die = (String(f.e.note || '').match(/[dw]\s*(\d+)/i) || [])[1] || 6; dice.push({ id: f.e.uid, label: nm + ' (W' + die + ')', dice: '+1d' + die, on: false, eff: f.e.uid, once: true }); }
    if (fx.anyAdv) adv.push(nm + T(' (optional)', ' (optional)'));
  }
  if (kind === 'init' && C.K(ch).passives.some(p => /Feral|Wilder Instinkt/.test(p[0] + p[1]))) adv.push(T('Wilder Instinkt', 'Feral Instinct'));
  return { adv, dis, dice, flats, autoFail };
}
function finalMode(ctx, override) {
  if (override && override !== 'auto') return override;
  const a = ctx.adv.filter(x => !/optional/.test(x)).length > 0, d = ctx.dis.length > 0;
  return a && d ? 'normal' : a ? 'adv' : d ? 'dis' : 'normal';
}

/* ---------- Würfe ---------- */
function fxAnim(kind) {
  const el = document.createElement('div'); el.className = 'fx ' + kind; el.innerHTML = '<span>' + (kind === 'n20' ? 'NATURAL 20' : 'FAIL!') + '</span>';
  document.body.appendChild(el); setTimeout(() => el.remove(), 2000);
}
function d20(ch, spec) {
  // spec: {label, base, mode, dice:[{label,dice}], flats:[{label,v}], kind, crit, dc, reliable, autoFail}
  const r = R.rollD20(spec.mode);
  let nat = r.nat; if (spec.reliable && nat < 10) nat = 10;
  let total = nat + (spec.base || 0); const extra = [];
  for (const m of spec.dice || []) { const p = R.parseDice(m.dice); const rr = R.rollDice(p); total += rr.total; extra.push({ label: m.label, v: rr.total, dice: m.dice }); }
  for (const f of spec.flats || []) { total += f.v; extra.push({ label: f.label, v: f.v }); }
  const res = { type: 'd20', label: spec.label, kind: spec.kind, dice: r.dice, nat: r.nat, used: nat, mode: r.mode, base: spec.base || 0, extra, total, dc: spec.dc, crit: spec.crit || 20, autoFail: spec.autoFail, spec };
  if (spec.autoFail) res.fail = true;
  if (spec.kind === 'attack') { res.isCrit = r.nat >= (spec.crit || 20); res.isFumble = r.nat === 1; }
  if (spec.dc) res.success = !spec.autoFail && (spec.kind === 'attack' ? (res.isCrit || (!res.isFumble && total >= spec.dc)) : total >= spec.dc);
  if (r.nat === 20) setTimeout(() => fxAnim('n20'), 30); else if (r.nat === 1) setTimeout(() => fxAnim('n1'), 30);
  const modeTxt = r.mode === 'adv' ? T(' mit Vorteil', ' with advantage') : r.mode === 'dis' ? T(' mit Nachteil', ' with disadvantage') : '';
  C.logL(ch, [spec.label + modeTxt + ': ' + total + ' (W20 ' + r.dice.join('/') + ')' + (res.isCrit ? ' – KRITISCH' : '') + (r.nat === 1 ? ' – natürliche 1' : '') + (spec.dc ? (res.success ? ' ✔' : ' ✘') : ''),
    spec.labelEn ? spec.labelEn : spec.label + modeTxt + ': ' + total + ' (d20 ' + r.dice.join('/') + ')' + (res.isCrit ? ' – CRITICAL' : '') + (r.nat === 1 ? ' – natural 1' : '') + (spec.dc ? (res.success ? ' ✔' : ' ✘') : '')]);
  return res;
}
function damage(ch, parts, opt) {
  // parts: [{label, dice, type}] ; opt: {crit, extraDie: {d, n}, half}
  opt = opt || {}; const out = []; let total = 0;
  for (const p of parts) { const pd = R.parseDice(p.dice); const rr = R.rollDice(pd, opt.crit && !p.noCrit); total += rr.total; out.push({ label: p.label, type: p.type, rr, dice: p.dice }); }
  if (opt.crit && opt.extraDie && opt.extraDie.n > 0) { const rr = R.rollDice({ terms: [{ n: opt.extraDie.n, d: opt.extraDie.d, sign: 1 }], flat: 0 }); total += rr.total; out.push({ label: opt.extraDie.label, rr, type: parts[0] && parts[0].type }); }
  total = Math.max(0, total);
  const res = { type: 'dmg', label: opt.label, parts: out, total, crit: !!opt.crit, heal: !!opt.heal, half: opt.half };
  C.logL(ch, [(opt.label || T('Schaden', 'Damage')) + ': ' + total + (opt.crit ? ' (kritisch)' : '') + ' – ' + out.map(o => (o.type ? dt(o.type) + ' ' : '') + o.rr.total).join(', '), (opt.label || 'Damage') + ': ' + total + (opt.crit ? ' (critical)' : '')]);
  return res;
}

/* ---------- Waffenschaden-Bausteine ---------- */
function weaponParts(ch, w, P) {
  const wi = weaponInfo(ch, w); const k = C.K(ch); const parts = []; const t = ch.turn;
  let dice = (P.grip === 2 && w.dmg2) ? w.dmg2 : w.dmg;
  if (w.id !== 'unarmed' && C.hasEff(ch, 'shillelagh') && wi.db && ['Club', 'Quarterstaff'].includes(wi.db.en)) { dice = '1d8+' + C.castMod(ch); }
  if (P.offhand && !ch.settings.twf) { const p = R.parseDice(dice); if (p.flat > 0 && wi.mod > 0) p.flat -= Math.min(p.flat, wi.mod); dice = R.diceStr(p).replace(/W/g, 'd').replace(/−/g, '-'); }
  parts.push({ id: 'base', label: w.name, dice, type: w.type, on: true, fixed: true });
  const melee = wi.melee && !P.thrown;
  if (C.hasEff(ch, 'rage') && melee && wi.abil === 'STR' && k.rageDmg) parts.push({ id: 'rage', label: T('Kampfrausch', 'Rage'), dice: '+' + k.rageDmg, type: w.type, on: true, noCrit: true });
  for (const f of C.fxList(ch)) {
    if (f.fx.hitDice) parts.push({ id: 'e' + f.e.uid, label: L([f.def.de, f.def.en]), dice: f.fx.hitDice, type: f.fx.hitType === 'force*' ? w.type : f.fx.hitType, on: true });
    if (f.fx.wpnDice) parts.push({ id: 'w' + f.e.uid, label: L([f.def.de, f.def.en]), dice: f.fx.wpnDice, type: w.type, on: true });
    if (f.fx.smite && f.e.smite) parts.push({ id: 's' + f.e.uid, label: f.e.smite.name, dice: f.e.smite.dice, type: f.e.smite.type, on: true, smiteEff: f.e.uid });
  }
  if (k.sneak && (wi.finesse || wi.ranged) && !t.sneakUsed) parts.push({ id: 'sneak', label: T('Hinterhältiger Angriff', 'Sneak Attack') + ' (' + k.sneak + T('W6', 'd6') + ')', dice: k.sneak + 'd6', type: w.type, on: false, sneak: true });
  if (k.improvedSmite && melee) parts.push({ id: 'ids', label: T('Verb. göttl. Niederstrecken', 'Improved Divine Smite'), dice: '1d8', type: 'radiant', on: true });
  if (k.divineSmite && melee && P.smiteLvl) { const n = Math.min(5, 1 + +P.smiteLvl) + (P.smiteUndead ? 1 : 0); parts.push({ id: 'ds', label: T('Göttliches Niederstrecken', 'Divine Smite') + ' (' + P.smiteLvl + '. ' + T('Grad', 'lvl') + ')', dice: n + 'd8', type: 'radiant', on: true, divineSmite: true }); }
  if (P.customDmg) parts.push({ id: 'cust', label: T('Zusatz', 'Extra'), dice: P.customDmg, type: '', on: true });
  return { parts, wi };
}

/* ---------- TP ---------- */
function applyDamage(ch, amount, opts) {
  opts = opts || {}; amount = Math.max(0, Math.floor(amount)); if (!amount) return;
  C.snap(ch, T('Schaden', 'Damage'));
  const before = ch.hp.cur; let rest = amount;
  if (ch.hp.temp > 0) { const a = Math.min(ch.hp.temp, rest); ch.hp.temp -= a; rest -= a; }
  ch.turn.tookDmg = true;
  if (before <= 0 && rest > 0) {
    if (rest >= ch.hp.max) { ch.dead = true; C.logL(ch, ['Massiver Schaden – Tod', 'Massive damage – death']); return; }
    ch.death.f = Math.min(3, ch.death.f + (opts.crit ? 2 : 1)); ch.effects = ch.effects.filter(e => e.id !== 'stable');
    C.logL(ch, ['Schaden bei 0 TP: Todesrettungswurf-Fehlschlag', 'Damage at 0 HP: death save failure']); if (ch.death.f >= 3) ch.dead = true; return;
  }
  ch.hp.cur = before - rest;
  C.logL(ch, [amount + ' Schaden erlitten (TP ' + Math.max(0, ch.hp.cur) + '/' + ch.hp.max + ')', 'Took ' + amount + ' damage (HP ' + Math.max(0, ch.hp.cur) + '/' + ch.hp.max + ')']);
  if (ch.concentration && rest + (amount - rest) > 0) S.pendingConc = { dc: Math.max(10, Math.floor(amount / 2)), name: ch.concentration.name };
  if (ch.hp.cur <= 0) {
    const overflow = -ch.hp.cur; ch.hp.cur = 0;
    if (overflow >= ch.hp.max) { ch.dead = true; C.logL(ch, ['Massiver Schaden – sofortiger Tod', 'Massive damage – instant death']); return; }
    S.zeroPrompt = { overflow };
  }
}
function dropToZero(ch) {
  ch.hp.cur = 0; if (!C.hasEff(ch, 'unconscious')) C.addEffect(ch, 'unconscious', { rounds: null, note: '0 TP' });
  ch.death = { s: 0, f: 0 }; C.endConcentration(ch, T('bewusstlos', 'unconscious'));
  ch.effects.filter(e => e.id === 'rage').forEach(e => C.removeEffect(ch, e.uid, T('bewusstlos', 'unconscious')));
  C.logL(ch, ['Auf 0 TP – bewusstlos, Todesrettungswürfe beginnen', 'Dropped to 0 HP – unconscious, death saves begin']);
}
function heal(ch, amount) {
  amount = Math.max(0, Math.floor(amount)); if (!amount || ch.dead) return; C.snap(ch, T('Heilung', 'Healing'));
  const was0 = ch.hp.cur <= 0; ch.hp.cur = Math.min(ch.hp.max, ch.hp.cur + amount);
  if (was0 && ch.hp.cur > 0) { ch.death = { s: 0, f: 0 }; ch.effects = ch.effects.filter(e => !(e.id === 'unconscious' && e.note === '0 TP') && e.id !== 'stable'); }
  C.logL(ch, [amount + ' TP geheilt (' + ch.hp.cur + '/' + ch.hp.max + ')', 'Healed ' + amount + ' HP (' + ch.hp.cur + '/' + ch.hp.max + ')']);
}
function setTemp(ch, v) { v = Math.max(0, Math.floor(v)); C.snap(ch, T('Temp. TP', 'Temp HP')); if (v > ch.hp.temp) { ch.hp.temp = v; C.logL(ch, ['Temporäre TP: ' + v, 'Temporary HP: ' + v]); } else C.toast(T('Temporäre TP addieren sich nicht – höherer Wert bleibt.', 'Temporary HP don\'t stack – the higher value stays.')); }

/* ---------- Rundenende ---------- */
function endRoundItems(ch) {
  const items = [];
  for (const e of ch.effects) {
    const def = C.effDef(e);
    if (def.save && (def.when || 'end') === 'end') items.push({ kind: 'save', e, abil: def.save, dc: e.dc, name: L([def.de, def.en]) });
  }
  for (const e of ch.effects) { if (e.rounds !== null && e.rounds !== undefined && e.rounds <= 1) items.push({ kind: 'expire', e, name: L([C.effDef(e).de, C.effDef(e).en]) }); }
  if (C.hasEff(ch, 'rage')) items.push({ kind: 'rage', keep: ch.turn.attacked || ch.turn.tookDmg });
  if (ch.concentration) items.push({ kind: 'conc', name: ch.concentration.name, rounds: ch.concentration.rounds });
  // Beginn des nächsten Zuges
  for (const e of ch.effects) { const def = C.effDef(e); if (def.when === 'start' || (def.save && def.when === 'start')) items.push({ kind: 'start', e, name: L([def.de, def.en]), abil: def.save || null, id: e.id }); if (def.startRoll) items.push({ kind: 'startRoll', e, name: L([def.de, def.en]), dice: def.startRoll }); }
  if (ch.hp.cur <= 0 && !ch.dead && !C.hasEff(ch, 'stable')) items.push({ kind: 'death' });
  return items;
}
function finishRound(ch, decisions, startNext) {
  C.snap(ch, T('Runde beenden', 'End round'));
  // Entscheidungen anwenden (Rettungswürfe bestanden → entfernen)
  for (const uid of decisions.remove || []) C.removeEffect(ch, uid, T('Rettungswurf geschafft', 'save succeeded'));
  if (decisions.endRage) ch.effects.filter(e => e.id === 'rage').forEach(e => C.removeEffect(ch, e.uid, T('kein Angriff/Schaden', 'no attack/damage')));
  ch.turn.phase = 'wait'; ch.turn.actUsed = ch.turn.actions; ch.turn.bonusUsed = true; ch.turn.attacksLeft = 0; ch.turn.bonusAttacks = 0;
  C.logL(ch, ['— Runde ' + ch.round + ' beendet —', '— Round ' + ch.round + ' ended —']);
  if (startNext) startRound(ch, true);
}
function startRound(ch, noSnap) {
  if (!noSnap) C.snap(ch, T('Neue Runde', 'New round'));
  // Dauer herunterzählen (Ende = Beginn deines nächsten Zuges)
  for (const e of ch.effects.slice()) { if (e.rounds !== null && e.rounds !== undefined) { e.rounds--; if (e.rounds <= 0) { if (e.id === 'concentrating') C.endConcentration(ch, T('Dauer abgelaufen', 'duration expired')); else C.removeEffect(ch, e.uid, T('Dauer abgelaufen', 'duration expired')); } } }
  if (ch.concentration) { ch.concentration.rounds--; if (ch.concentration.rounds <= 0) C.endConcentration(ch, T('Dauer abgelaufen', 'duration expired')); }
  // Heldenmut: temporäre TP
  if (C.hasEff(ch, 'heroism')) { const v = Math.max(0, C.castMod(ch)); if (v > ch.hp.temp) ch.hp.temp = v; }
  ch.round++; ch.turn = C.newTurn(ch);
  C.logL(ch, ['— Runde ' + ch.round + ' beginnt —', '— Round ' + ch.round + ' begins —']);
}

/* ---------- Rasten ---------- */
function shortRest(ch, o) {
  C.snap(ch, T('Kurze Rast', 'Short rest'));
  for (const r of C.allRes(ch)) if (r.recharge === 'SR') r.st.used = 0;
  if (ch.pact) ch.pact.used = 0;
  if (o.arcane) { for (const lv of o.arcane) { const s = ch.slots[lv - 1]; if (s && s.used > 0) s.used--; } C.useRes(ch, 'arcaneRecovery'); }
  ch.effects = ch.effects.filter(e => e.rounds === null || e.rounds === undefined || e.rounds > 600);
  if (ch.concentration && ch.concentration.rounds <= 600) C.endConcentration(ch, T('Rast', 'rest'));
  ch.turn = C.newTurn(ch); ch.round = 1;
  C.logL(ch, ['☾ Kurze Rast beendet', '☾ Short rest finished']);
}
function longRest(ch, o) {
  C.snap(ch, T('Lange Rast', 'Long rest'));
  ch.hp.cur = ch.hp.max; ch.hp.temp = 0; ch.death = { s: 0, f: 0 }; ch.dead = false;
  const total = ch.hd.reduce((a, p) => a + p.total, 0); let regain = Math.max(1, Math.floor(total / 2));
  for (const p of ch.hd.slice().sort((a, b) => b.die - a.die)) { const g = Math.min(p.used, regain); p.used -= g; regain -= g; }
  for (const r of C.allRes(ch)) if (r.recharge === 'SR' || r.recharge === 'LR') r.st.used = 0;
  ch.slots.forEach(s => s.used = 0); if (ch.pact) ch.pact.used = 0;
  if (o.food !== false && ch.exhaustion > 0) ch.exhaustion--;
  C.endConcentration(ch, T('Rast', 'rest'));
  ch.effects = ch.effects.filter(e => (e.rounds === null || e.rounds === undefined || e.rounds > 4800) && e.id !== 'unconscious' && e.id !== 'stable' && !['bless', 'rage', 'dodge', 'reckless', 'hidden', 'disengage'].includes(e.id));
  ch.turn = C.newTurn(ch); ch.round = 1;
  C.logL(ch, ['☀ Lange Rast beendet – TP, Zauberplätze und Fähigkeiten zurückgesetzt', '☀ Long rest finished – HP, spell slots and abilities restored']);
}

Object.assign(C, { SPELL_TRIGGER, OA_TRIGGER, weaponInfo, unarmedWeapon, allWeapons, wById, buildOptions, spellSummary, dt, spend, costName, rollContext, finalMode, d20, damage, weaponParts, applyDamage, dropToZero, heal, setTemp, endRoundItems, finishRound, startRound, shortRest, longRest, fxAnim, preparedFilter });
})(window);
