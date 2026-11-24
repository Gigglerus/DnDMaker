/* Charakterverwaltung – Ereignisse, Dialoge, Import/Export */
(function (W) {
'use strict';
const C = W.CM, { D, R, I, S, T, L, esc } = C;
const $ = s => document.querySelector(s);
const ABN = a => D.ABIL_N[a][S.lang === 'en' ? 3 : 2];
const newPan = () => ({ adv: 'auto', mods: {}, dm: {}, extra: '', spent: false, res: null, dres: null });
S.pan = newPan();
function select(o) { S.sel = o; S.pan = newPan(); S.flash = true; S.scrollPanel = true; }

/* ---------- Ausführen ---------- */
function doAttack(ch) {
  const sel = S.sel, P = S.pan, w = C.wById(ch, sel.id); const wi = C.weaponInfo(ch, w); const t = ch.turn; const k = C.K(ch);
  const ctx = C.rollContext(ch, 'attack', { wi: Object.assign({}, wi, { melee: wi.melee && !P.thrown }) });
  const mode = C.modeWithInspo(ctx);
  if (!P.spent) {
    C.snap(ch, T('Angriff ', 'Attack ') + w.name);
    const cost = sel.cost === 'action' ? 'attackStart' : sel.cost; C.spend(ch, cost); P.spent = true;
    t.attacked = true; t.firstAtkDone = true;
    if (wi.light && wi.melee && (cost === 'attackStart' || cost === 'attack')) t.lightAtk = true;
  }
  const dice = C.chosenDice(ctx);
  const res = C.d20(ch, { label: w.name, base: w.atk, mode, dice, flats: ctx.flats.concat(C.extraFlat()), kind: 'attack', crit: k.crit, dc: +P.targetAC || null });
  P.res = res; P.crit = res.isCrit; S.inspoNext = false; C.consumeOnce(ch, dice);
  // Verstecken/Unsichtbarkeit enden durch Angriff
  ch.effects.filter(e => e.id === 'hidden' || (e.id === 'invisible' && e.src === 'invisibility')).slice().forEach(e => C.removeEffect(ch, e.uid, T('Angriff', 'attack')));
}
function doDamage(ch) {
  const sel = S.sel, P = S.pan, w = C.wById(ch, sel.id); const k = C.K(ch);
  if (P.smiteSel) { const [kind, lv] = P.smiteSel.split(':'); P.smiteLvl = +lv; P.smiteKind = kind; } else P.smiteLvl = null;
  const { parts, wi } = C.weaponParts(ch, w, P);
  const use = parts.filter(p => (P.dm[p.id] !== undefined ? P.dm[p.id] : p.on));
  C.snap(ch, T('Schaden', 'Damage'));
  if (use.some(p => p.sneak)) ch.turn.sneakUsed = true;
  if (use.some(p => p.divineSmite)) { if (P.smiteKind === 'pact') ch.pact.used++; else ch.slots[P.smiteLvl - 1].used++; P.smiteSel = ''; }
  use.filter(p => p.smiteEff).forEach(p => { ch.effects = ch.effects.filter(e => e.uid !== p.smiteEff); });
  const baseDie = R.parseDice(use[0].dice).terms[0];
  const extraN = (wi.melee && !P.thrown ? k.brutal + (k.savageAttacks ? 1 : 0) : 0);
  P.dres = C.damage(ch, use.map(p => ({ label: p.label, dice: p.dice, type: p.type, noCrit: p.noCrit })), { crit: !!P.crit, extraDie: baseDie ? { n: extraN, d: baseDie.d, label: T('Brutaler Kritischer/Wilde Angriffe', 'Brutal Critical/Savage Attacks') } : null, label: w.name });
}
function doCast(ch) {
  const sel = S.sel, P = S.pan, s = ch.spells.find(x => x.id === sel.id); const si = C.spellInfo(ch, s);
  const cost = sel.cost || (si.time === 'B' ? 'bonus' : si.time === 'R' ? 'reaction' : 'action');
  const b = C.spellBlock(ch, si, cost); if (b) { C.toast(b); return; }
  const E = C.econ(ch);
  if (!sel.info || true) {
    const okEcon = cost === 'action' ? E.actionLeft : cost === 'bonus' ? E.bonusLeft : cost === 'reaction' ? E.reactLeft : true;
    if (!okEcon) { C.toast(T('Dafür ist keine ', 'No ') + C.costName(cost) + T(' mehr frei.', ' left.')); return; }
  }
  C.snap(ch, T('Zauber ', 'Spell ') + si.name);
  C.spend(ch, cost); if (sel.quick) C.useRes(ch, 'sorcery', 2);
  let lvl = 0;
  if (si.lvl > 0) { const choice = P.slot || (C.slotChoices(ch, si.lvl)[0] ? C.slotChoices(ch, si.lvl)[0].kind + ':' + C.slotChoices(ch, si.lvl)[0].lvl : null); if (!choice) { C.toast(T('Kein Zauberplatz', 'No slot')); return; } const [kind, lv] = choice.split(':'); lvl = +lv; if (kind === 'pact') ch.pact.used++; else ch.slots[lvl - 1].used++; }
  ch.turn.spells.push({ time: cost === 'bonus' ? 'B' : cost === 'reaction' ? 'R' : 'A', lvl: si.lvl });
  P.spent = true; P.castLvl = lvl || si.lvl;
  if (si.mode === 'save') P.tgts = C.makeTargets(si.ex.aoe ? P.nTgt : 1, si.half);
  C.logL(ch, [si.name + ' gewirkt' + (lvl ? ' (' + lvl + '. Grad)' : ''), si.name + ' cast' + (lvl ? ' (level ' + lvl + ')' : '')]);
  ch.effects.filter(e => e.id === 'invisible' && e.src === 'invisibility').slice().forEach(e => C.removeEffect(ch, e.uid, T('Zauber gewirkt', 'spell cast')));
  ch.effects.filter(e => e.id === 'hidden').slice().forEach(e => C.removeEffect(ch, e.uid, false));
  if (si.conc) C.startConcentration(ch, si.name, si.ex.self && D.EFF[si.ex.self] && D.EFF[si.ex.self].dur ? D.EFF[si.ex.self].dur : 10);
  if (si.ex.self && !P.noSelf) {
    const id = si.ex.self; const def = D.EFF[id];
    if (id === 'falseLife') { const r = R.rollDice(R.parseDice('1d4+4')); const v = r.total + 5 * (P.castLvl - 1); if (v > ch.hp.temp) ch.hp.temp = v; C.logL(ch, ['Falsches Leben: ' + v + ' temp. TP', 'False Life: ' + v + ' temp HP']); }
    if (id === 'agathys') { const v = 5 * P.castLvl; if (v > ch.hp.temp) ch.hp.temp = v; }
    if (id === 'aid') { const v = 5 * (P.castLvl - 1); ch.hp.max += v; ch.hp.cur += v; C.logL(ch, ['Beistand: TP-Maximum +' + v, 'Aid: HP maximum +' + v]); }
    if (def) C.addEffect(ch, id, { conc: si.conc, src: s.ref, note: id === 'enhance' ? '' : '' });
    if (id === 'haste') { /* Zusatzaktion steht sofort zur Verfügung */ }
  }
  if (si.ex.smite) { const dm = C.spellDamage(ch, si, P.castLvl); C.addEffect(ch, 'smite', { conc: si.conc, note: si.name, smite: { dice: dm ? R.diceStr(dm.p).replace(/W/g, 'd').replace(/−/g, '-') : '0', type: si.type, name: si.name } }); }
}
function doSpellAtk(ch) {
  const P = S.pan, s = ch.spells.find(x => x.id === S.sel.id); const si = C.spellInfo(ch, s); const ctx = C.rollContext(ch, 'attack', { wi: null });
  const dice = C.chosenDice(ctx); const res = C.d20(ch, { label: si.name, base: si.atk, mode: C.modeWithInspo(ctx), dice, flats: ctx.flats.concat(C.extraFlat()), kind: 'attack', crit: 20, dc: +P.targetAC || null });
  P.res = res; P.crit = res.isCrit; S.inspoNext = false; C.consumeOnce(ch, dice); ch.turn.attacked = true;
}
function doSpellDmg(ch) {
  const P = S.pan, s = ch.spells.find(x => x.id === S.sel.id); const si = C.spellInfo(ch, s); const dm = C.spellDamage(ch, si, P.castLvl || si.lvl);
  const ds = R.diceStr(dm.p).replace(/W/g, 'd').replace(/−/g, '-');
  const n = si.mode === 'auto' ? dm.count : 1;
  const parts = Array.from({ length: n }, (_, i) => ({ label: si.name + (n > 1 ? ' #' + (i + 1) : ''), dice: ds, type: si.type }));
  P.dres = C.damage(ch, parts, { crit: !!P.crit, heal: si.mode === 'heal', half: si.half, label: si.name });
}
function doFeat(ch, sub) {
  const o = S.sel.opt, P = S.pan, t = ch.turn;
  C.snap(ch, L(o.name));
  if (['action', 'bonus', 'reaction'].includes(o.cost)) C.spend(ch, o.cost);
  if (o.res) { if (o.pool) { const n = Math.max(1, Math.min(C.resLeft(ch, o.res), +P.pool || 1)); C.useRes(ch, o.res, n); P.poolUsed = n; } else if (!o.font) C.useRes(ch, o.res, 1); }
  if (o.custom && o.custom.max) { /* bereits über res */ }
  if (o.apply) { if (o.apply === 'rage') C.endConcentration(ch, T('Kampfrausch', 'rage')); C.addEffect(ch, o.apply); }
  if (o.applyCustom) { ch.effects = ch.effects.filter(e => !(e.custom && e.custom.id === o.applyCustom.id)); C.addEffect(ch, 'custom', { custom: o.applyCustom, rounds: o.applyRounds || null }); }
  if (o.removes) ch.effects.filter(e => e.id === o.removes).slice().forEach(e => C.removeEffect(ch, e.uid));
  if (o.grant === 'action') { t.actions++; t.surges++; }
  if (o.grantAttacks) t.bonusAttacks += o.grantAttacks;
  if (o.grantReact) t.reactUsed = false;
  if (o.grantBonus) t.bonusUsed = false;
  if (o.dash) t.dash++;
  if (sub === 'dash') t.dash++; if (sub === 'disengage') C.addEffect(ch, 'disengage'); if (sub === 'hide') { S.sel = { k: 'check', ab: 'DEX', sk: 'stealth' }; S.pan = newPan(); }
  if (o.font === 'toSlot') { const lv = +P.fontLvl || 1; const cost = { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7 }[lv]; C.useRes(ch, 'sorcery', cost); const s = ch.slots[lv - 1]; if (s.used > 0) s.used--; else { s.max++; s.bonus = (s.bonus || 0) + 1; } }
  if (o.font === 'toPts') { const lv = +P.fontLvl || (ch.slots.findIndex(s => s.max - s.used > 0) + 1); if (lv > 0) { ch.slots[lv - 1].used++; const r = C.resById(ch, 'sorcery'); r.st.used = Math.max(0, r.st.used - lv); } }
  if (o.conc) C.startConcentration(ch, L(o.name), 100);
  if (o.roll && o.roll.save) P.tgts = C.makeTargets(o.roll.save.aoe ? P.nTgt : 1, o.roll.save.half);
  P.spent = true; if (sub === 'hide') return;
  C.logL(ch, [o.name[0] + ' eingesetzt' + (P.poolUsed ? ' (' + P.poolUsed + ')' : ''), o.name[1] + ' used' + (P.poolUsed ? ' (' + P.poolUsed + ')' : '')]);
  if (o.roll && o.cost !== 'free') doFeatRoll(ch);
}
function doFeatRoll(ch) { const o = S.sel.opt; S.pan.dres = C.damage(ch, [{ label: L(o.roll.label), dice: o.roll.dice }], { heal: !!o.roll.heal, label: L(o.name) }); }
function doBasic(ch) {
  const sel = S.sel, P = S.pan, t = ch.turn, id = sel.id;
  C.snap(ch, id);
  if (sel.cost === 'action' || sel.cost === 'haste' || sel.cost === 'attack' || sel.cost === 'bonus') C.spend(ch, (id === 'grapple' || id === 'shove') && sel.cost === 'action' ? 'attackStart' : sel.cost);
  if (id === 'dash') t.dash++;
  if (id === 'disengage') C.addEffect(ch, 'disengage');
  if (id === 'dodge') C.addEffect(ch, 'dodge');
  if (id === 'standUp') { t.move += Math.ceil(C.speedNow(ch) / 2); ch.effects.filter(e => e.id === 'prone').forEach(e => C.removeEffect(ch, e.uid, false)); }
  if (id === 'dropProne') C.addEffect(ch, 'prone', { rounds: null });
  if (id === 'object') t.objUsed = true;
  if (id === 'endConc') C.endConcentration(ch, T('freiwillig', 'voluntarily'));
  if (id === 'inspo') { S.inspoNext = true; ch.inspiration = false; ch.effects = ch.effects.filter(e => e.id !== 'inspiration'); }
  if (id === 'grapple' || id === 'shove') { t.attacked = true; t.firstAtkDone = true; }
  P.spent = true;
  C.logL(ch, [(C.S.optMap[sel.key] ? C.S.optMap[sel.key].label : id) + ' (' + C.costName(sel.cost) + ')', (C.S.optMap[sel.key] ? C.S.optMap[sel.key].label : id) + ' (' + C.costName(sel.cost) + ')']);
}
function doCheck(ch) {
  const sel = S.sel, P = S.pan; let base, ctx, label, spec = {};
  if (sel.k === 'save' || sel.k === 'conc') { const a = sel.k === 'conc' ? 'CON' : sel.ab; base = ch.saves[a].bonus; ctx = C.rollContext(ch, 'save', { abil: a }); label = sel.k === 'conc' ? T('Konzentration', 'Concentration') : ABN(a) + T('-Rettungswurf', ' save'); spec.kind = 'save'; spec.autoFail = ctx.autoFail; }
  else if (sel.k === 'check') { const a = sel.ab; base = sel.sk ? ch.skills[sel.sk].bonus : ch.abil[a].mod; ctx = C.rollContext(ch, 'check', { abil: a, skill: sel.sk }); label = sel.sk ? L(D.SKILLS.find(s => s[0] === sel.sk).slice(2, 4)) : ABN(a) + T('-Probe', ' check'); spec.kind = 'check'; spec.reliable = C.K(ch).reliable && sel.sk && ch.skills[sel.sk].prof; }
  else if (sel.k === 'init') { base = ch.init; ctx = C.rollContext(ch, 'init', { abil: 'DEX' }); label = 'Initiative'; spec.kind = 'init'; }
  else { base = 0; ctx = C.rollContext(ch, 'death', { abil: null }); label = T('Todesrettungswurf', 'Death save'); spec.kind = 'death'; }
  const dice = C.chosenDice(ctx); C.snap(ch, label);
  const res = C.d20(ch, Object.assign(spec, { label, base, mode: C.modeWithInspo(ctx), dice, flats: ctx.flats.concat(C.extraFlat()), dc: sel.k === 'death' ? 10 : (+P.dc || null) }));
  P.res = res; S.inspoNext = false; C.consumeOnce(ch, dice);
  if (sel.k === 'death') applyDeath(ch, res);
  if (sel.k === 'conc') { if (res.dc && !res.success) C.endConcentration(ch, T('Konzentrationswurf misslungen', 'concentration save failed')); S.pendingConc = null; }
}
function applyDeath(ch, res) {
  if (res.nat === 20) { ch.hp.cur = 1; ch.death = { s: 0, f: 0 }; ch.effects = ch.effects.filter(e => !(e.id === 'unconscious' && e.note === '0 TP') && e.id !== 'stable'); C.logL(ch, ['Natürliche 20: wieder bei Bewusstsein mit 1 TP!', 'Natural 20: back up with 1 HP!']); return; }
  if (res.nat === 1) ch.death.f += 2; else if (res.total >= 10) ch.death.s++; else ch.death.f++;
  if (ch.death.f >= 3) { ch.dead = true; C.logL(ch, ['Drei Fehlschläge – der Charakter stirbt.', 'Three failures – the character dies.']); }
  else if (ch.death.s >= 3) { C.addEffect(ch, 'stable', { rounds: null }); ch.death = { s: 0, f: 0 }; C.logL(ch, ['Drei Erfolge – stabil.', 'Three successes – stable.']); }
}

/* ---------- Dialoge ---------- */
function openModal(fn) { S.modal = fn; C.render(); }
function closeModal() { S.modal = null; S.draft = null; S.prepAfterRest = false; C.render(); }
function setPath(o, path, v) { const ks = path.split('.'); let x = o; for (let i = 0; i < ks.length - 1; i++) x = x[isNaN(ks[i]) ? ks[i] : +ks[i]]; x[ks[ks.length - 1]] = v; }
function getPath(o, path) { return path.split('.').reduce((x, k) => (x === undefined || x === null ? x : x[isNaN(k) ? k : +k]), o); }
const inp = (path, type, extra) => { const v = getPath(S.draft, path); if (type === 'b') return '<input type="checkbox" data-f="' + path + '" data-t="b" ' + (v ? 'checked' : '') + '>'; return '<input type="' + (type === 'n' ? 'number' : 'text') + '" data-f="' + path + '" data-t="' + type + '" value="' + esc(v === null || v === undefined ? '' : v) + '" ' + (extra || '') + '>'; };

function dlgSetup() {
  const d = S.draft, first = !d.setupDone; const k = R.kit(d);
  // Ressourcen-Status synchronisieren
  d.resources = k.resources.map(r => d.resources.find(x => x.id === r.id) || { id: r.id, used: 0 });
  let h = '<h2>' + (first ? T('Startzustand vor der ersten Runde', 'Starting state before round 1') : T('Charakter bearbeiten', 'Edit character')) + '</h2>' + C.orn;
  if (first) h += '<p class="small" style="text-align:center;font-style:italic">' + T('Prüfe die aus dem Bogen gelesenen Werte und trage den aktuellen Zustand ein: Lebenspunkte, verbrauchte Fähigkeiten und Zauberplätze, aktive Zustände.', 'Check the values read from the sheet and enter the current state: hit points, used abilities and spell slots, active conditions.') + '</p>';
  if (d.levelNote) h += '<div class="note">⚠ ' + T('Die Stufe im Feld „Klasse & Stufe“ passt nicht zu den Trefferwürfeln – es wurde die Summe der Trefferwürfel übernommen. Bitte prüfen.', 'The level in "Class & Level" doesn\'t match the hit dice – the hit dice total was used. Please check.') + '</div>';
  h += '<h3>' + T('Charakter', 'Character') + '</h3><div class="fgrid"><label>' + T('Name', 'Name') + inp('name', 's') + '</label><label>' + T('Spieler', 'Player') + inp('player', 's') + '</label><label>' + T('Volk', 'Race') + '<select data-f="raceKey" data-t="s"><option value="">— ' + esc(d.race || '') + '</option>' + Object.entries(D.RACES).map(([k2, r]) => '<option value="' + k2 + '" ' + (d.raceKey === k2 ? 'selected' : '') + '>' + L([r.de, r.en]) + '</option>').join('') + '</select></label>' +
    '<label>' + T('Rüstungsklasse', 'Armor Class') + inp('ac', 'n') + '</label><label>' + T('Bewegung (ft)', 'Speed (ft)') + inp('speed', 'n') + '</label><label>' + T('Initiative', 'Initiative') + inp('init', 'n') + '</label><label>' + T('Übungsbonus', 'Proficiency') + inp('prof', 'n') + '</label><label>' + T('Passive Wahrn.', 'Passive Perc.') + inp('passive', 'n') + '</label></div>';
  h += '<div class="small" style="margin-top:.3em"><b>' + T('Klassen', 'Classes') + '</b> <span class="muted">(' + T('Bogen: ', 'sheet: ') + esc(d.classStr) + ')</span></div><div class="row">' + d.classes.map((c, i) => '<span class="row" style="gap:.2em"><select data-f="classes.' + i + '.key" data-t="s" data-re="1">' + Object.entries(D.CLASSES).map(([k2, c2]) => '<option value="' + k2 + '" ' + (c.key === k2 ? 'selected' : '') + '>' + L([c2.de, c2.en]) + '</option>').join('') + '</select><input type="number" min="1" max="20" data-f="classes.' + i + '.lvl" data-t="n" data-re="1" value="' + c.lvl + '"><button class="btn sm ghost" data-a="dClsDel" data-i="' + i + '">✕</button></span>').join('') + '<button class="btn sm" data-a="dClsAdd">＋ ' + T('Klasse', 'Class') + '</button></div>';
  h += '<h3>' + T('Aktueller Zustand', 'Current state') + '</h3><div class="fgrid"><label>' + T('TP aktuell', 'HP current') + inp('hp.cur', 'n') + '</label><label>' + T('TP maximal', 'HP max') + inp('hp.max', 'n') + '</label><label>' + T('Temporäre TP', 'Temp HP') + inp('hp.temp', 'n') + '</label><label>' + T('Erschöpfung', 'Exhaustion') + inp('exhaustion', 'n', 'min="0" max="6"') + '</label><label>' + T('Inspiration', 'Inspiration') + inp('inspiration', 'b') + '</label>';
  d.hd.forEach((p, i) => { h += '<label>' + T('W', 'd') + p.die + ' ' + T('verbraucht', 'used') + ' (' + T('von', 'of') + ' ' + p.total + ')' + inp('hd.' + i + '.used', 'n', 'min="0" max="' + p.total + '"') + '</label>'; });
  h += '</div>';
  if (d.hdNote !== null && d.hdNote !== undefined) h += '<div class="tiny muted">' + T('Im Bogen steht bei „Trefferwürfel“: ', 'The sheet\'s "Hit Dice" field says: ') + esc(d.hdNote) + '</div>';
  // Ressourcen
  if (k.resources.length || d.customRes.length) {
    h += '<h3>' + T('Verbrauchte Fähigkeiten', 'Used abilities') + '</h3><table>';
    k.resources.forEach(r => { const i = d.resources.findIndex(x => x.id === r.id); h += '<tr><td>' + esc(L(r.name)) + '</td><td>' + (r.recharge === 'SR' ? T('kurze Rast', 'short rest') : T('lange Rast', 'long rest')) + '</td><td>' + T('verbraucht', 'used') + ' ' + inp('resources.' + i + '.used', 'n', 'min="0" max="' + r.max + '"') + ' / ' + r.max + '</td></tr>'; });
    d.customRes.forEach((r, i) => { h += '<tr><td>' + esc(r.name) + '</td><td>' + r.recharge + '</td><td>' + T('verbraucht', 'used') + ' ' + inp('customRes.' + i + '.used', 'n') + ' / ' + r.max + '</td></tr>'; });
    h += '</table>';
  }
  // Zauberplätze
  h += '<h3>' + T('Zauberplätze', 'Spell slots') + '</h3><table><tr><th>' + T('Grad', 'Level') + '</th>' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => '<th>' + i + '</th>').join('') + '</tr><tr><td>' + T('Maximum', 'Maximum') + '</td>' + d.slots.map((s, i) => '<td>' + inp('slots.' + i + '.max', 'n', 'style="width:3em" min="0"') + '</td>').join('') + '</tr><tr><td>' + T('verbraucht', 'used') + '</td>' + d.slots.map((s, i) => '<td>' + inp('slots.' + i + '.used', 'n', 'style="width:3em" min="0"') + '</td>').join('') + '</tr></table>';
  h += '<div class="row small"><button class="btn sm" data-a="dSlotsCalc">' + T('Nach Klassenstufen berechnen', 'Calculate from class levels') + '</button>' + (d.slotsFromSheet ? '<span class="muted">' + T('Werte aus dem Bogen übernommen.', 'Values taken from the sheet.') + '</span>' : '') + '</div>';
  if (d.pact) h += '<div class="fgrid" style="margin-top:.3em"><label>' + T('Paktmagie-Plätze', 'Pact slots') + inp('pact.count', 'n') + '</label><label>' + T('Paktmagie-Grad', 'Pact slot level') + inp('pact.level', 'n') + '</label><label>' + T('Pakt verbraucht', 'Pact used') + inp('pact.used', 'n') + '</label></div>';
  h += '<div class="fgrid" style="margin-top:.3em"><label>' + T('Zauberattribut', 'Casting ability') + '<select data-f="spellcasting.abil" data-t="s"><option value="">—</option>' + D.ABIL.map(a => '<option value="' + a + '" ' + (d.spellcasting.abil === a ? 'selected' : '') + '>' + ABN(a) + '</option>').join('') + '</select></label><label>' + T('Zauber-SG', 'Spell DC') + inp('spellcasting.dc', 'n') + '</label><label>' + T('Zauberangriff', 'Spell attack') + inp('spellcasting.atk', 'n') + '</label></div>';
  // Zustände
  h += '<h3>' + T('Aktive Zustände', 'Active conditions') + '</h3><div class="row"><select id="dEff">' + C.effOptions().replace('<option value="__custom">', '<option value="__x" disabled>') + '</select><input type="number" id="dEffR" placeholder="' + T('Runden', 'Rounds') + '"><input type="number" id="dEffDC" placeholder="SG"><button class="btn sm" data-a="dEffAdd">＋</button></div>' + d.effects.filter(e => e.id !== 'concentrating').map((e, i) => { const df = C.effDef(e); return '<span class="badge ' + (df.pos ? 'good' : 'bad') + '">' + esc(L([df.de, df.en])) + (e.rounds ? ' · ' + e.rounds + ' Rd.' : '') + ' <a href="#" data-a="dEffDel" data-id="' + e.uid + '">✕</a></span> '; }).join('');
  const concOpts = d.spells.filter(s => C.spellInfo(d, s).conc);
  h += '<div class="row small" style="margin-top:.3em">' + T('Konzentration auf', 'Concentrating on') + ' <select id="dConc"><option value="">—</option>' + concOpts.map(s => '<option ' + (d.concentration && d.concentration.name === C.spellInfo(d, s).name ? 'selected' : '') + '>' + esc(C.spellInfo(d, s).name) + '</option>').join('') + '</select> ' + T('Runden übrig', 'rounds left') + ' <input type="number" id="dConcR" value="' + (d.concentration ? d.concentration.rounds : 10) + '"></div>';
  // Waffen
  h += '<h3>' + T('Waffen & Angriffe', 'Weapons & attacks') + '</h3><table><tr><th>' + T('Name', 'Name') + '</th><th>' + T('Bonus', 'Bonus') + '</th><th>' + T('Schaden', 'Damage') + '</th><th>' + T('zweihändig', 'two-handed') + '</th><th>' + T('Schadensart', 'Type') + '</th><th>' + T('Waffentyp', 'Weapon type') + '</th><th></th></tr>' + d.weapons.map((w, i) => '<tr><td>' + inp('weapons.' + i + '.name', 's', 'style="width:9em"') + '</td><td>' + inp('weapons.' + i + '.atk', 'n', 'style="width:3.5em"') + '</td><td>' + inp('weapons.' + i + '.dmg', 's', 'style="width:6em"') + '</td><td>' + inp('weapons.' + i + '.dmg2', 's', 'style="width:6em"') + '</td><td><select data-f="weapons.' + i + '.type" data-t="s"><option value=""></option>' + Object.keys(D.DTYPES).filter(x => x !== 'var').map(t => '<option value="' + t + '" ' + (w.type === t ? 'selected' : '') + '>' + L(D.DTYPES[t]) + '</option>').join('') + '</select></td><td><select data-f="weapons.' + i + '.wref" data-t="s"><option value="">—</option>' + D.WEAPONS.map(x => '<option value="' + x.en + '" ' + (w.wref === x.en ? 'selected' : '') + '>' + L([x.de, x.en]) + '</option>').join('') + '</select></td><td><button class="btn sm ghost" data-a="dWDel" data-i="' + i + '">✕</button></td></tr>').join('') + '</table><button class="btn sm" data-a="dWAdd">＋ ' + T('Waffe', 'Weapon') + '</button> <label class="small"><input type="checkbox" data-f="settings.twf" data-t="b" ' + (d.settings.twf ? 'checked' : '') + '> ' + T('Kampfstil „Kampf mit zwei Waffen“', 'Fighting style "Two-Weapon Fighting"') + '</label>';
  // Zauber
  h += '<h3>' + T('Zauber', 'Spells') + '</h3><datalist id="spellDL">' + R.SPELLS.map(s => '<option value="' + esc(L([s.de, s.en])) + '">' + s.lvl + '</option>').join('') + '</datalist><table><tr><th>' + T('Bogen-Text', 'Sheet text') + '</th><th>' + T('Grad', 'Lvl') + '</th><th>' + T('Erkannt als', 'Recognized as') + '</th><th>' + T('vorber.', 'prep.') + '</th><th>' + T('Wirkzeit', 'Time') + '</th><th></th></tr>' + d.spells.map((s, i) => { const db = s.ref ? R.SPELL[s.ref] : null; return '<tr><td>' + inp('spells.' + i + '.raw', 's', 'style="width:14em"') + '</td><td>' + inp('spells.' + i + '.lvl', 'n', 'style="width:3em" min="0" max="9"') + '</td><td><input list="spellDL" data-a2="spellRef" data-i="' + i + '" value="' + esc(db ? L([db.de, db.en]) : '') + '" placeholder="' + T('— eigener Zauber —', '— custom spell —') + '" style="width:12em">' + (s.lvlMismatch !== undefined ? ' <span class="tiny miss">' + T('DB: Grad ', 'DB: lvl ') + s.lvlMismatch + '</span>' : '') + '</td><td>' + inp('spells.' + i + '.prepared', 'b') + '</td><td><select data-f="spells.' + i + '.time" data-t="s"><option value="">' + (db ? '(' + db.time + ')' : '') + '</option>' + [['A', T('Aktion', 'Action')], ['B', T('Bonus', 'Bonus')], ['R', T('Reaktion', 'Reaction')], ['M', T('länger', 'longer')]].map(([v, l]) => '<option value="' + v + '" ' + (s.time === v ? 'selected' : '') + '>' + l + '</option>').join('') + '</select>' + (db ? '' : ' <select data-f="spells.' + i + '.mode" data-t="s" title="Modus"><option value="">—</option><option value="atk" ' + (s.mode === 'atk' ? 'selected' : '') + '>' + T('Angriff', 'Attack') + '</option><option value="save" ' + (s.mode === 'save' ? 'selected' : '') + '>RW</option><option value="heal" ' + (s.mode === 'heal' ? 'selected' : '') + '>' + T('Heilung', 'Heal') + '</option></select>' + (s.mode === 'save' ? '<select data-f="spells.' + i + '.save" data-t="s">' + D.ABIL.map(a => '<option ' + (s.save === a ? 'selected' : '') + '>' + a + '</option>').join('') + '</select>' : '') + ' ' + inp('spells.' + i + '.dmg', 's', 'style="width:4.5em" placeholder="2d6"') + ' ' + T('Konz.', 'Conc.') + inp('spells.' + i + '.conc', 'b')) + '</td><td><button class="btn sm ghost" data-a="dSDel" data-i="' + i + '">✕</button></td></tr>'; }).join('') + '</table><button class="btn sm" data-a="dSAdd">＋ ' + T('Zauber', 'Spell') + '</button>';
  h += '<div class="foot"><button class="btn" data-a="modalClose">' + T('Abbrechen', 'Cancel') + '</button><button class="btn primary" data-a="dSave">' + (first ? '⚔️ ' + T('Runde 1 beginnen', 'Begin round 1') : '💾 ' + T('Speichern', 'Save')) + '</button></div>';
  return h;
}
function openSetup() { const ch = C.cur(); S.draft = JSON.parse(JSON.stringify(ch)); openModal(dlgSetup); }
function saveSetup() {
  const d = S.draft; const ch = C.cur(); const first = !d.setupDone;
  const cs = $('#dConc'); if (cs) { const v = cs.value; if (v) { if (!d.concentration || d.concentration.name !== v) { d.concentration = { name: v, rounds: +$('#dConcR').value || 10 }; d.effects = d.effects.filter(e => e.id !== 'concentrating'); d.effects.push({ uid: I.uid(), id: 'concentrating', rounds: d.concentration.rounds, note: v, conc: true }); } else d.concentration.rounds = +$('#dConcR').value || d.concentration.rounds; } else { d.concentration = null; d.effects = d.effects.filter(e => !e.conc); } }
  d.hp.cur = Math.min(d.hp.cur, d.hp.max); d.setupDone = true; d.levelNote = false;
  if (first) { d.round = 1; d.turn = C.newTurn(d); }
  C.snap(ch, T('Bearbeitung', 'Edit'));
  if (d.hp.cur <= 0 && !d.effects.some(e => e.id === 'unconscious')) d.effects.push({ uid: I.uid(), id: 'unconscious', rounds: null, note: '0 TP' });
  const i = S.chars.findIndex(c => c.id === ch.id); S.chars[i] = d;
  C.logL(d, first ? ['Startzustand festgelegt – Runde 1 beginnt', 'Starting state set – round 1 begins'] : ['Charakter bearbeitet', 'Character edited']);
  S.modal = null; S.draft = null; S.sel = null; C.render();
}
function dlgEndRound() {
  const ch = C.cur(); const items = C.endRoundItems(ch); S.endItems = items;
  let h = '<h2>' + T('Runde ', 'End of round ') + ch.round + T(' beenden', '') + '</h2>' + C.orn;
  const saves = items.filter(x => x.kind === 'save'), exp = items.filter(x => x.kind === 'expire'), rage = items.find(x => x.kind === 'rage'), conc = items.find(x => x.kind === 'conc'), start = items.filter(x => x.kind === 'start' || x.kind === 'startRoll'), death = items.find(x => x.kind === 'death');
  if (!items.length) h += '<p style="text-align:center" class="muted">' + T('Keine Rettungswürfe oder Erinnerungen.', 'No saving throws or reminders.') + '</p>';
  if (saves.length) {
    h += '<h3>🎲 ' + T('Rettungswürfe am Ende deines Zuges', 'Saving throws at the end of your turn') + '</h3>';
    saves.forEach((s, i) => { const r = S.endRes && S.endRes[i]; h += '<div class="remind"><b>' + esc(s.name) + '</b> – ' + ABN(s.abil) + T('-Rettungswurf', ' save') + ' SG <input type="number" id="erDC' + i + '" value="' + (s.dc || '') + '" style="width:3.5em"> <button class="btn sm primary" data-a="erSave" data-i="' + i + '">🎲 ' + T('Würfeln', 'Roll') + '</button> ' + (r ? C.resultHtml(ch, r) : '') + '<label class="small"><input type="checkbox" id="erRm' + i + '" ' + (r && r.success ? 'checked' : '') + '> ' + T('Geschafft – Effekt endet', 'Succeeded – effect ends') + '</label></div>'; });
  }
  if (rage) h += '<h3>😤 ' + T('Kampfrausch', 'Rage') + '</h3><div class="remind"><label><input type="checkbox" id="erRage" ' + (rage.keep ? 'checked' : '') + '> ' + T('Ich habe seit meinem letzten Zug angegriffen oder Schaden erlitten (sonst endet der Kampfrausch).', 'I attacked or took damage since my last turn (otherwise the rage ends).') + '</label></div>';
  if (exp.length) h += '<h3>⌛ ' + T('Läuft zu Beginn deines nächsten Zuges ab', 'Expires at the start of your next turn') + '</h3>' + exp.map(e => '<div class="small">• ' + esc(e.name) + '</div>').join('');
  if (conc) h += '<h3>🧠 ' + T('Konzentration', 'Concentration') + '</h3><div class="small">' + esc(conc.name) + ' – ' + T('noch ', '') + conc.rounds + T(' Runde(n)', ' round(s) left') + '. ' + T('Schaden erfordert einen KO-Rettungswurf.', 'Damage requires a CON save.') + '</div>';
  if (start.length || death) {
    h += '<h3>⏭ ' + T('Zu Beginn deines nächsten Zuges', 'At the start of your next turn') + '</h3>';
    start.forEach(s => { h += '<div class="small">• <b>' + esc(s.name) + '</b>: ' + (s.id === 'stinking' ? T('KO-Rettungswurf, sonst keine Aktion.', 'CON save or lose your action.') : s.id === 'burning' ? T('Feuerschaden nehmen.', 'Take fire damage.') : s.id === 'heroism' ? T('Temporäre TP = Zaubermod. (automatisch).', 'Temp HP = spellcasting modifier (automatic).') : s.kind === 'startRoll' ? T('Würfle ', 'Roll ') + s.dice + T(' für dein Verhalten.', ' for your behavior.') : '') + '</div>'; });
    if (death) h += '<div class="remind">💀 ' + T('Du liegst bei 0 TP: Todesrettungswurf zu Beginn deines Zuges.', 'You are at 0 HP: death saving throw at the start of your turn.') + '</div>';
  }
  if (ch.turn.reactUsed === false) h += '<p class="small muted">' + T('Deine Reaktion bleibt bis zum Beginn deines nächsten Zuges verfügbar.', 'Your reaction stays available until the start of your next turn.') + '</p>';
  h += '<div class="foot"><button class="btn" data-a="modalClose">' + T('Abbrechen', 'Cancel') + '</button><button class="btn" data-a="erDo" data-v="wait">⏳ ' + T('Runde beenden (Gegnerphase)', 'End round (enemy phase)') + '</button><button class="btn primary" data-a="erDo" data-v="next">⏭ ' + T('Runde beenden & nächste starten', 'End round & start next') + '</button></div>';
  return h;
}
function dlgShortRest() {
  const ch = C.cur(); const k = C.K(ch); const bard = R.clsLvl(ch, 'bard');
  let h = '<h2>☾ ' + T('Kurze Rast', 'Short rest') + '</h2>' + C.orn + '<p class="small" style="text-align:center">' + T('Mindestens 1 Stunde. Du kannst Trefferwürfel ausgeben: je Würfel 1W + KO-Mod. TP.', 'At least 1 hour. You may spend hit dice: each die heals 1d + CON mod.') + '</p>';
  h += '<h3>' + T('Trefferwürfel', 'Hit dice') + '</h3>' + ch.hd.map((p, i) => '<div class="row">' + T('W', 'd') + p.die + ': ' + (p.total - p.used) + '/' + p.total + ' ' + T('übrig', 'left') + ' <button class="btn sm primary" data-a="hdRoll" data-i="' + i + '" ' + (p.total - p.used > 0 && ch.hp.cur < ch.hp.max ? '' : 'disabled') + '>🎲 ' + T('1 Würfel ausgeben', 'Spend 1 die') + '</button></div>').join('') + '<div class="small">' + T('TP: ', 'HP: ') + '<b>' + ch.hp.cur + '/' + ch.hp.max + '</b></div>' + (S.hdLog ? '<div class="small muted">' + esc(S.hdLog) + '</div>' : '');
  if (bard >= 2) h += '<div class="small">🎵 ' + T('Lied der Erholung: Barde fügt 1 Würfel hinzu, wenn Trefferwürfel ausgegeben werden.', 'Song of Rest: the bard adds one die when hit dice are spent.') + ' <button class="btn sm" data-a="freeRoll2" data-v="1d' + (bard >= 17 ? 12 : bard >= 13 ? 10 : bard >= 9 ? 8 : 6) + '">🎲</button></div>';
  const sr = C.allRes(ch).filter(r => r.recharge === 'SR');
  h += '<h3>' + T('Wird zurückgesetzt', 'Will be restored') + '</h3>' + (sr.length || ch.pact ? sr.map(r => '<div class="small">• ' + esc(L(r.name)) + '</div>').join('') + (ch.pact ? '<div class="small">• ' + T('Paktmagie-Plätze', 'Pact slots') + '</div>' : '') : '<div class="small muted">' + T('Keine Fähigkeiten mit „kurzer Rast“.', 'No short-rest abilities.') + '</div>') + '<div class="small muted">' + T('Effekte mit höchstens 1 Stunde Dauer enden.', 'Effects lasting up to 1 hour end.') + '</div>';
  if (R.clsLvl(ch, 'wizard') && C.resLeft(ch, 'arcaneRecovery') > 0) { const lim = Math.ceil(R.clsLvl(ch, 'wizard') / 2); h += '<h3>' + T('Arkane Erholung', 'Arcane Recovery') + '</h3><div class="small">' + T('Zauberplätze bis zur Gesamtsumme ', 'Recover slots totalling up to ') + lim + T(' Grade (max. 5. Grad) zurückgewinnen:', ' levels (max 5th level):') + '</div><div class="row">' + ch.slots.slice(0, 5).map((s, i) => s.used > 0 ? '<label class="small"><input type="checkbox" class="arc" value="' + (i + 1) + '"> ' + (i + 1) + '.</label>' : '').join('') + '</div>'; }
  h += '<div class="foot"><button class="btn" data-a="modalClose">' + T('Abbrechen', 'Cancel') + '</button><button class="btn primary" data-a="srDo">☾ ' + T('Kurze Rast beenden', 'Finish short rest') + '</button></div>';
  return h;
}
function dlgLongRest() {
  const ch = C.cur(); const tot = ch.hd.reduce((a, p) => a + p.total, 0);
  return '<h2>☀ ' + T('Lange Rast', 'Long rest') + '</h2>' + C.orn + '<ul class="small"><li>' + T('TP auf Maximum (', 'HP to maximum (') + ch.hp.max + '), ' + T('temporäre TP verfallen', 'temporary HP lost') + '</li><li>' + T('Trefferwürfel: bis zu ', 'Hit dice: regain up to ') + Math.max(1, Math.floor(tot / 2)) + T(' zurück', '') + '</li><li>' + T('Alle Zauberplätze und Fähigkeiten (kurze und lange Rast) werden zurückgesetzt', 'All spell slots and abilities (short and long rest) are restored') + '</li><li>' + T('Zeitlich begrenzte Effekte und Konzentration enden', 'Timed effects and concentration end') + '</li></ul>' +
    (ch.exhaustion ? '<label class="small"><input type="checkbox" id="lrFood" checked> ' + T('Mit Essen und Trinken: Erschöpfung −1', 'With food and drink: exhaustion −1') + '</label><br>' : '') +
    (ch.spells.some(s => s.lvl > 0) || isPreparer(ch) ? '<label class="small"><input type="checkbox" id="lrPrep" ' + (isPreparer(ch) ? 'checked' : '') + '> 📖 ' + T('Danach Zauber vorbereiten', 'Prepare spells afterwards') + (isPreparer(ch) ? '' : T(' (deine Klasse kennt feste Zauber – Wechsel normalerweise nur beim Stufenaufstieg)', ' (your class knows fixed spells – normally changed only on level-up)')) + '</label>' : '') +
    '<div class="foot"><button class="btn" data-a="modalClose">' + T('Abbrechen', 'Cancel') + '</button><button class="btn primary" data-a="lrDo">☀ ' + T('Lange Rast beenden', 'Finish long rest') + '</button></div>';
}
function dlgCustomRes() {
  const ch = C.cur(); const c = S.crEdit;
  const sel = (id, opts, v) => '<select id="' + id + '">' + opts.map(([k, l]) => '<option value="' + k + '" ' + (v === k ? 'selected' : '') + '>' + l + '</option>').join('') + '</select>';
  return '<h2>' + T('Eigene Fähigkeit', 'Custom ability') + '</h2>' + C.orn + '<p class="small" style="text-align:center">' + T('Für Unterklassen-Merkmale, Gegenstände oder Talente (z. B. „Rewind“, „Glücksbringer 3/LR“).', 'For subclass features, items or feats (e.g. "Rewind", "Lucky 3/LR").') + '</p><div class="fgrid">' +
    '<label>' + T('Name', 'Name') + '<input type="text" id="crN" value="' + esc(c.name || '') + '"></label><label>' + T('Nutzungen (0 = unbegrenzt)', 'Uses (0 = unlimited)') + '<input type="number" id="crM" value="' + (c.max || 0) + '"></label>' +
    '<label>' + T('Aufladung', 'Recharge') + sel('crR', [['LR', T('lange Rast', 'long rest')], ['SR', T('kurze Rast', 'short rest')], ['-', T('keine', 'none')]], c.recharge || 'LR') + '</label>' +
    '<label>' + T('Kosten', 'Cost') + sel('crC', [['action', T('Aktion', 'Action')], ['bonus', T('Bonusaktion', 'Bonus action')], ['reaction', T('Reaktion', 'Reaction')], ['free', T('frei', 'free')], ['none', T('nur Zähler', 'counter only')]], c.cost || 'action') + '</label>' +
    '<label>' + T('Würfel (optional)', 'Dice (optional)') + '<input type="text" id="crD" value="' + esc(c.dice || '') + '" placeholder="2d6+3"></label><label>' + T('Ist Heilung', 'Is healing') + '<input type="checkbox" id="crH" ' + (c.heal ? 'checked' : '') + '></label>' +
    '<label>' + T('Rettungswurf des Gegners', 'Enemy saving throw') + sel('crS', [['', '—']].concat(D.ABIL.map(a => [a, ABN(a)])), c.save || '') + '</label><label>' + T('SG (leer = Zauber-SG)', 'DC (empty = spell DC)') + '<input type="number" id="crSD" value="' + (c.saveDC || '') + '"></label><label>' + T('Bei geschafftem RW', 'On a successful save') + sel('crSH', [['1', T('halber Schaden', 'half damage')], ['0', T('kein Schaden', 'no damage')]], c.saveHalf === false ? '0' : '1') + '</label><label>' + T('Kann mehrere Gegner treffen', 'Can hit several enemies') + '<input type="checkbox" id="crA" ' + (c.aoe ? 'checked' : '') + '></label>' +
    '<label>' + T('Gibt eine Aktion zurück', 'Grants an extra action') + '<input type="checkbox" id="crG" ' + (c.grant ? 'checked' : '') + '></label><label>' + T('Gibt die Reaktion zurück', 'Restores the reaction') + '<input type="checkbox" id="crGR" ' + (c.grantReact ? 'checked' : '') + '></label><label>' + T('Gibt die Bonusaktion zurück', 'Restores the bonus action') + '<input type="checkbox" id="crGB" ' + (c.grantBonus ? 'checked' : '') + '></label></div>' +
    '<label class="small">' + T('Beschreibung', 'Description') + '<textarea id="crT">' + esc(c.desc || '') + '</textarea></label>' +
    '<div class="foot">' + (c.id ? '<button class="btn" data-a="crDel">🗑 ' + T('Löschen', 'Delete') + '</button>' : '') + '<button class="btn" data-a="modalClose">' + T('Abbrechen', 'Cancel') + '</button><button class="btn primary" data-a="crSave">💾 ' + T('Speichern', 'Save') + '</button></div>';
}
function dlgCustomEff() {
  return '<h2>' + T('Eigener Effekt', 'Custom effect') + '</h2>' + C.orn + '<div class="fgrid"><label>' + T('Name', 'Name') + '<input type="text" id="ceN"></label><label>' + T('Art', 'Kind') + '<select id="ceP"><option value="0">' + T('negativ', 'negative') + '</option><option value="1">' + T('positiv', 'positive') + '</option></select></label>' +
    '<label>' + T('RK-Modifikator', 'AC modifier') + '<input type="number" id="ceAC" value="0"></label><label>' + T('Angriffe', 'Attacks') + '<select id="ceAtk"><option value="">—</option><option value="adv">' + T('Vorteil', 'Advantage') + '</option><option value="dis">' + T('Nachteil', 'Disadvantage') + '</option></select></label>' +
    '<label>' + T('Würfel auf Angriffe', 'Dice on attacks') + '<input type="text" id="ceAD" placeholder="+1d4"></label><label>' + T('Würfel auf Rettungswürfe', 'Dice on saves') + '<input type="text" id="ceSD" placeholder="-1d4"></label>' +
    '<label>' + T('Angriffe gegen mich', 'Attacks against me') + '<select id="ceVs"><option value="">—</option><option value="adv">' + T('Vorteil', 'Advantage') + '</option><option value="dis">' + T('Nachteil', 'Disadvantage') + '</option></select></label><label>' + T('Bewegung', 'Speed') + '<select id="ceSp"><option value="">—</option><option value="0">0</option><option value="half">½</option><option value="double">×2</option></select></label>' +
    '<label>' + T('Kampfunfähig', 'Incapacitated') + '<input type="checkbox" id="ceInc"></label><label>' + T('Rettungswurf je Runde', 'Save each round') + '<select id="ceSv"><option value="">—</option>' + D.ABIL.map(a => '<option value="' + a + '">' + ABN(a) + '</option>').join('') + '</select></label>' +
    '<label>' + T('Zeitpunkt', 'When') + '<select id="ceW"><option value="end">' + T('Zugende', 'end of turn') + '</option><option value="start">' + T('Zugbeginn', 'start of turn') + '</option></select></label><label>SG<input type="number" id="ceDC"></label><label>' + T('Dauer (Runden)', 'Duration (rounds)') + '<input type="number" id="ceR"></label></div>' +
    '<div class="foot"><button class="btn" data-a="modalClose">' + T('Abbrechen', 'Cancel') + '</button><button class="btn primary" data-a="ceSave">＋ ' + T('Hinzufügen', 'Add') + '</button></div>';
}
function dlgZero() {
  const ch = C.cur(); const k = C.K(ch);
  let h = '<h2>💀 ' + T('Auf 0 Trefferpunkte', 'Dropped to 0 hit points') + '</h2>' + C.orn;
  if (C.resLeft(ch, 'rRelentless') > 0) h += '<div class="remind"><b>' + T('Unerbittlichkeit (Halbork)', 'Relentless Endurance (half-orc)') + '</b>: ' + T('Stattdessen auf 1 TP fallen (1× pro langer Rast).', 'Drop to 1 HP instead (once per long rest).') + ' <button class="btn sm primary" data-a="zeroRel">' + T('Einsetzen', 'Use') + '</button></div>';
  if (C.hasEff(ch, 'rage') && R.clsLvl(ch, 'barbarian') >= 11) { ch.rrDC = ch.rrDC || 10; h += '<div class="remind"><b>' + T('Unbändige Wut', 'Relentless Rage') + '</b>: ' + T('KO-Rettungswurf SG ', 'CON save DC ') + ch.rrDC + T(' → bei Erfolg 1 TP.', ' → on success 1 HP.') + ' <button class="btn sm primary" data-a="zeroRR">🎲 ' + T('Würfeln', 'Roll') + '</button>' + (S.rrRes ? C.resultHtml(ch, S.rrRes) : '') + '</div>'; }
  h += '<div class="foot"><button class="btn primary" data-a="zeroFall">' + T('Bewusstlos werden (Todesrettungswürfe)', 'Fall unconscious (death saves)') + '</button></div>';
  return h;
}
function dlgHelp() {
  return '<h2>' + T('So funktioniert’s', 'How it works') + '</h2>' + C.orn + '<ol class="small"><li>' + T('Charakterbogen-PDF aus dem Creator (oder einen ausgefüllten offiziellen 5e-Bogen) laden – per Knopf oder Drag & Drop.', 'Load a character sheet PDF from the Creator (or a filled official 5e sheet) – via button or drag & drop.') + '</li><li>' + T('Startzustand prüfen: TP, verbrauchte Fähigkeiten und Zauberplätze, aktive Zustände.', 'Check the starting state: HP, used abilities and slots, active conditions.') + '</li><li>' + T('„Was kannst du tun?“ zeigt alle Optionen nach Aktion, Bonusaktion, Reaktion, Bewegung. Verbrauchte Optionen werden ausgeblendet.', '"What can you do?" lists all options by action, bonus action, reaction and movement. Used options are hidden.') + '</li><li>' + T('Option anklicken → rechts würfeln: Boni, Mali, Vorteil/Nachteil werden automatisch berücksichtigt.', 'Click an option → roll on the right: bonuses, penalties and advantage/disadvantage are applied automatically.') + '</li><li>' + T('„Rückgängig“ nimmt den letzten Schritt zurück; Fähigkeiten wie Tatendrang geben Aktionen wieder frei.', '"Rewind" undoes the last step; abilities like Action Surge unlock actions again.') + '</li><li>' + T('„Runde beenden“ erinnert an Rettungswürfe und setzt rundenabhängige Sperren zurück.', '"End round" reminds you of saves and resets per-round limits.') + '</li><li>' + T('Daten bleiben im Browser gespeichert; „Gruppe speichern“ erzeugt eine JSON-Datei zum Sichern/Weitergeben.', 'Data stays in the browser; "Save party" creates a JSON file for backup/sharing.') + '</li></ol><div class="foot"><button class="btn primary" data-a="modalClose">OK</button></div>';
}

const PREP = ['cleric', 'druid', 'paladin', 'wizard'];
function isPreparer(ch) { return ch.classes.some(c => PREP.includes(c.key)); }
function dlgDelete() {
  const c = S.chars.find(x => x.id === S.delId); if (!c) return '<div class="foot"><button class="btn" data-a="modalClose">OK</button></div>';
  return '<h2>🗑 ' + T('Charakter entfernen?', 'Remove character?') + '</h2>' + C.orn + '<p style="text-align:center"><b>' + esc(c.name) + '</b> ' + T('wird aus der Charakterverwaltung entfernt (Zustand, Protokoll und Rundenstand). Der Charakterbogen (PDF) auf deinem Rechner bleibt unverändert; du kannst ihn jederzeit neu laden.', 'will be removed from the Character Manager (state, log and round). The character sheet (PDF) on your computer is unchanged; you can load it again any time.') + '</p><p class="small muted" style="text-align:center">' + T('Tipp: Mit „💾 Gruppe speichern“ sicherst du vorher alle Charaktere als Datei.', 'Tip: use "💾 Save party" first to back up all characters to a file.') + '</p><div class="foot"><button class="btn" data-a="modalClose">' + T('Abbrechen', 'Cancel') + '</button><button class="btn primary" data-a="delYes">🗑 ' + T('Entfernen', 'Remove') + '</button></div>';
}
function dlgPrepare() {
  const ch = C.cur(); const d = S.prepDraft; const lim = C.prepLimit(ch); const prepar = isPreparer(ch);
  const n = d.filter(x => x.lvl > 0 && x.prepared).length;
  let h = '<h2>📖 ' + T('Zauber vorbereiten', 'Prepare spells') + '</h2>' + C.orn;
  if (S.prepAfterRest) h += '<div class="note">☀ ' + T('Lange Rast beendet. Wähle jetzt die Zauber, die du für den nächsten Tag vorbereitest.', 'Long rest finished. Choose the spells you prepare for the next day.') + '</div>';
  h += '<p class="small">' + (prepar ? T('Kleriker, Druiden, Paladine und Magier wählen nach jeder langen Rast neu aus, welche Zauber sie vorbereiten. Zaubertricks sind immer verfügbar. Nur vorbereitete Zauber erscheinen unter „Was kannst du tun?“.', 'Clerics, druids, paladins and wizards choose their prepared spells after every long rest. Cantrips are always available. Only prepared spells appear under "What can you do?".') : T('Deine Klasse kennt eine feste Zauberauswahl. Hier kannst du die Liste trotzdem anpassen (z. B. nach einem Stufenaufstieg).', 'Your class knows a fixed selection of spells. You can still adjust the list here (e.g. after a level-up).')) + '</p>';
  h += '<div class="row"><b>' + T('Vorbereitet: ', 'Prepared: ') + n + (lim ? ' / ' + lim : '') + '</b>' + (lim && n > lim ? ' <span class="miss small">' + T('mehr als erlaubt', 'more than allowed') + '</span>' : '') + (lim ? ' <span class="small muted">(' + T('Limit = Zauberattribut-Mod. + Klassenstufe; Paladin: + halbe Stufe; mindestens 1', 'limit = casting ability mod + class level; paladin: + half level; at least 1') + ')</span>' : '') + '<span class="sp"></span><button class="btn sm" data-a="prepAll" data-v="1">' + T('alle', 'all') + '</button><button class="btn sm" data-a="prepAll" data-v="0">' + T('keine', 'none') + '</button></div>';
  for (let lv = 1; lv <= 9; lv++) {
    const list = d.filter(x => x.lvl === lv); if (!list.length) continue;
    h += '<h3>' + lv + '. ' + T('Grad', 'level') + '</h3><div class="opts">' + list.map(x => { const si = C.spellInfo(ch, x); return '<div class="opt ' + (x.prepared ? 'sel' : '') + '" data-a="prepTgl" data-id="' + x.id + '"><span class="t">' + (x.prepared ? '✔ ' : '○ ') + esc(si.name) + '</span><span class="d">' + esc(C.dS ? C.dS(C.spellSummary(ch, si)) : C.spellSummary(ch, si)) + (x.added ? ' <a href="#" data-a="prepDel" data-id="' + x.id + '">✕</a>' : '') + '</span></div>'; }).join('') + '</div>';
  }
  if (!d.some(x => x.lvl > 0)) h += '<p class="muted small">' + T('Noch keine Zauber ab Grad 1 in der Liste.', 'No spells of level 1+ in the list yet.') + '</p>';
  h += '<h3>' + T('Zauber hinzufügen', 'Add a spell') + '</h3><div class="row"><input list="spellDL2" id="prepNew" placeholder="' + T('z. B. Segnen, Wunden heilen …', 'e.g. Bless, Cure Wounds …') + '" style="flex:1"><button class="btn sm" data-a="prepAdd">＋</button></div><datalist id="spellDL2">' + R.SPELLS.filter(x => x.lvl > 0).map(x => '<option value="' + esc(L([x.de, x.en])) + '">' + x.lvl + '</option>').join('') + '</datalist>';
  h += '<div class="foot"><button class="btn" data-a="modalClose">' + T('Abbrechen', 'Cancel') + '</button><button class="btn primary" data-a="prepSave">📖 ' + T('Vorbereitung übernehmen', 'Apply preparation') + '</button></div>';
  return h;
}

/* ---------- Import / Export ---------- */
async function importFile(file) {
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    const isPdf = buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;
    if (isPdf) {
      const fields = await W.PdfForm.readFields(buf);
      const n = Object.values(fields).filter(v => v !== '' && v !== false).length;
      if (n < 3) { C.toast(T('Keine ausgefüllten Formularfelder gefunden – leerer Charakter angelegt.', 'No filled form fields found – created a blank character.')); }
      const ch = I.build(fields, file.name); C.upgrade(ch); S.chars.push(ch); S.active = ch.id; S.view = null; S.sel = null;
      C.logL(ch, ['Bogen „' + file.name + '“ geladen (' + n + ' Felder)', 'Loaded sheet "' + file.name + '" (' + n + ' fields)']);
      C.save(); openSetup(); return;
    }
    const data = JSON.parse(new TextDecoder().decode(buf));
    const list = Array.isArray(data) ? data : (data.chars || [data]);
    let added = 0; for (const c of list) { if (!c || !c.abil) continue; if (S.chars.some(x => x.id === c.id)) c.id = I.uid(); C.upgrade(c); S.chars.push(c); added++; }
    if (added) { S.active = S.chars[S.chars.length - 1].id; S.view = null; C.toast(added + T(' Charakter(e) geladen', ' character(s) loaded')); } else C.toast(T('Keine Charaktere in der Datei', 'No characters in file'));
    C.render();
  } catch (e) { console.error(e); C.toast(T('Datei konnte nicht gelesen werden: ', 'Could not read file: ') + e.message); C.render(); }
}
function exportParty() {
  const data = { app: 'DND5e Charakterverwaltung', v: 1, saved: new Date().toISOString(), chars: S.chars };
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Gruppe_' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function pickFile() { const i = document.createElement('input'); i.type = 'file'; i.accept = '.pdf,.json,application/pdf,application/json'; i.multiple = true; i.onchange = async () => { for (const f of i.files) await importFile(f); }; i.click(); }

/* ---------- Klick-Verteiler ---------- */
async function onClick(ev) {
  const el = ev.target.closest('[data-a]'); if (!el) return;
  const a = el.dataset.a; const ch = C.cur();
  if (a === 'modalBg') { if (ev.target === el) closeModal(); return; }
  if (el.tagName === 'A') ev.preventDefault();
  if (a === 'tglSkills') { S.openSkills = !el.open; return; }
  if (a === 'tglHidden') { S.showHidden = el.checked; C.render(); return; }
  if (['panMod', 'panTgl', 'panSet', 'panDm'].includes(a)) return; // über change
  const A = {
    lang: () => { S.lang = el.dataset.v; }, pickFile, newBlank: () => { const c = I.blank(T('Neuer Charakter', 'New character')); C.upgrade(c); S.chars.push(c); S.active = c.id; S.view = null; C.save(); openSetup(); return 'x'; },
    home: () => { S.view = 'home'; }, home0: () => { S.view = null; }, help: () => { openModal(dlgHelp); return 'x'; },
    tab: () => { S.active = el.dataset.id; S.view = null; S.sel = null; S.pan = newPan(); S.pendingConc = null; },
    export: exportParty, setup: () => { openSetup(); return 'x'; },
    delChar: () => { ev.stopPropagation(); S.delId = el.dataset.id || (ch && ch.id); openModal(dlgDelete); return 'x'; },
    delYes: () => { const id = S.delId; const c = S.chars.find(x => x.id === id); S.chars = S.chars.filter(x => x.id !== id); delete S.undo[id]; if (S.active === id) { S.active = S.chars[0] ? S.chars[0].id : null; S.sel = null; S.pan = newPan(); } if (!S.chars.length) S.view = 'home'; S.modal = null; C.toast(T('Entfernt: ', 'Removed: ') + (c ? c.name : '')); },
    info: () => { S.infoQ = { k: el.dataset.k, id: el.dataset.id }; ev.stopPropagation(); openModal(C.dlgInfo); return 'x'; },
    prepOpen: () => { S.prepDraft = JSON.parse(JSON.stringify(ch.spells)); openModal(dlgPrepare); return 'x'; },
    prepTgl: () => { const s2 = S.prepDraft.find(x => x.id === el.dataset.id); s2.prepared = !s2.prepared; C.render(); return 'x'; },
    prepAll: () => { S.prepDraft.forEach(x => { if (x.lvl > 0) x.prepared = el.dataset.v === '1'; }); C.render(); return 'x'; },
    prepAdd: () => { const v = R.norm(($('#prepNew') || {}).value || ''); const sp = R.SPELLS.find(x => R.norm(x.de) === v || R.norm(x.en) === v) || R.matchSpell(v); if (!sp) { C.toast(T('Zauber nicht gefunden', 'Spell not found')); return 'x'; } if (S.prepDraft.some(x => x.ref === sp.key)) { C.toast(T('Schon in der Liste', 'Already listed')); return 'x'; } S.prepDraft.push({ id: I.uid(), raw: sp.en, lvl: sp.lvl, ref: sp.key, prepared: true, added: true }); C.render(); return 'x'; },
    prepDel: () => { S.prepDraft = S.prepDraft.filter(x => x.id !== el.dataset.id); C.render(); return 'x'; },
    prepSave: () => { C.snap(ch, T('Zauber vorbereitet', 'Spells prepared')); ch.spells = S.prepDraft; ch.prepMode = true; const n = ch.spells.filter(x => x.lvl > 0 && x.prepared).length; C.logL(ch, [n + ' Zauber vorbereitet', n + ' spells prepared']); S.modal = null; S.prepDraft = null; if (S.sel && S.sel.k === 'spell') S.sel = null; },
    revive: () => { C.snap(ch, 'revive'); ch.dead = false; ch.hp.cur = 1; ch.death = { s: 0, f: 0 }; ch.effects = ch.effects.filter(e => e.id !== 'unconscious' && e.id !== 'stable'); },
    undo: () => C.undo(),
    opt: () => { const o = S.optMap[el.dataset.key]; if (!o) return; if (!o.ok) { C.toast('🔒 ' + o.why); return; } select(o); },
    spellSel: () => { const s = ch.spells.find(x => x.id === el.dataset.id); const si = C.spellInfo(ch, s); const cost = si.time === 'B' ? 'bonus' : si.time === 'R' ? 'reaction' : 'action'; const key = Object.keys(S.optMap || {}).find(k2 => S.optMap[k2].k === 'spell' && S.optMap[k2].id === s.id && !S.optMap[k2].quick); select(key ? S.optMap[key] : { k: 'spell', id: s.id, cost, info: true, key: 'info' }); },
    sel: () => { select({ k: el.dataset.k, ab: el.dataset.ab, sk: el.dataset.sk, key: 'x' }); },
    selClear: () => { S.sel = null; S.pan = newPan(); },
    panAdv: () => { S.pan.adv = el.dataset.v; },
    atkRoll: () => doAttack(ch), dmgRoll: () => doDamage(ch), cast: () => doCast(ch), spellAtk: () => doSpellAtk(ch), spellDmg: () => doSpellDmg(ch),
    featDo: () => doFeat(ch, el.dataset.v), featRoll: () => doFeatRoll(ch), featDmg: () => { S.pan.dres = C.damage(ch, [{ label: L(S.sel.opt.name), dice: el.dataset.v, type: el.dataset.t }], { half: true, label: L(S.sel.opt.name) }); },
    basicDo: () => doBasic(ch), checkRoll: () => doCheck(ch),
    nextAtk: () => { const s2 = S.sel; select(Object.assign({}, s2, { cost: s2.cost === 'battack' ? 'battack' : 'attack', key: 'action|weapon|' + s2.id + '|attack' })); },
    nextAtkAny: () => { S.sel = null; S.pan = newPan(); },
    stunning: () => { C.snap(ch, 'Stunning'); C.useRes(ch, 'ki', 1); C.logL(ch, ['Betäubender Schlag: Ziel KO-RW SG ' + (8 + ch.prof + ch.abil.WIS.mod), 'Stunning Strike: target CON save DC ' + (8 + ch.prof + ch.abil.WIS.mod)]); C.toast(T('Ziel: KO-Rettungswurf SG ', 'Target: CON save DC ') + (8 + ch.prof + ch.abil.WIS.mod)); },
    lucky: () => { const r = S.pan.res || S.rrRes; if (!r) return; const spec = Object.assign({}, r.spec, { label: r.spec.label + T(' (Glück)', ' (Lucky)') }); const nr = C.d20(ch, spec); nr.luckyUsed = true; S.pan.res = nr; if (S.sel && S.sel.k === 'death') applyDeath(ch, nr); if (nr.kind === 'attack') S.pan.crit = nr.isCrit; },
    indomitable: () => { C.useRes(ch, 'indomitable', 1); const r = S.pan.res; const nr = C.d20(ch, Object.assign({}, r.spec, { label: r.spec.label + T(' (Unbeugsam)', ' (Indomitable)'), flats: (r.spec.flats || []).concat([{ label: T('Kämpferstufe', 'Fighter level'), v: 0 }]) })); S.pan.res = nr; },
    tgtAdd: () => { S.pan.tgts = (S.pan.tgts || []).concat(C.makeTargets(1, el.dataset.h !== '0')); },
    tgtDel: () => { S.pan.tgts.splice(+el.dataset.i, 1); },
    tgtSt: () => { const t = S.pan.tgts[+el.dataset.i]; t.st = t.st === el.dataset.v ? null : el.dataset.v; },
    healSelf: () => { C.heal(ch, +el.dataset.v); }, tempSelf: () => { C.setTemp(ch, +el.dataset.v); },
    freeRoll: () => { const ex = el.dataset.v || ($('#freeExpr') || {}).value || '1d20'; const p = R.parseDice(ex); const rr = R.rollDice(p); S.pan.res = { type: 'free', expr: ex, rr, total: rr.total }; C.logL(ch, ['Freier Wurf ' + ex + ': ' + rr.total, 'Free roll ' + ex + ': ' + rr.total]); if (ex === '1d20') { if (rr.total === 20) C.fxAnim('n20'); if (rr.total === 1) C.fxAnim('n1'); } },
    freeRoll2: () => { const rr = R.rollDice(R.parseDice(el.dataset.v)); S.hdLog = T('Lied der Erholung: +', 'Song of Rest: +') + rr.total; C.heal(ch, rr.total); },
    dmg: () => { const v = +($('#hpIn') || {}).value || 0; if (!v) return; C.applyDamage(ch, v); afterDamage(ch); }, dmgHalf: () => { const v = Math.floor((+($('#hpIn') || {}).value || 0) / 2); if (!v) return; C.applyDamage(ch, v); afterDamage(ch); },
    heal: () => { const v = +($('#hpIn') || {}).value || 0; C.heal(ch, v); }, temp: () => { const v = +($('#hpIn') || {}).value || 0; C.setTemp(ch, v); },
    concSave: () => { select({ k: 'conc', key: 'conc' }); S.pan.dc = S.pendingConc ? S.pendingConc.dc : 10; }, concDismiss: () => { S.pendingConc = null; },
    acModAdd: () => { C.snap(ch, 'RK'); ch.acMods.push({ n: ($('#acModN').value || T('Modifikator', 'Modifier')), v: +$('#acModV').value || 0 }); }, acModDel: () => { C.snap(ch, 'RK'); ch.acMods.splice(+el.dataset.id, 1); },
    effQuick: () => { C.snap(ch, el.dataset.id); C.addEffect(ch, el.dataset.id, el.dataset.id === 'hidden' ? { rounds: null } : {}); C.logL(ch, [L([D.EFF[el.dataset.id].de, D.EFF[el.dataset.id].de]) + ' aktiv', D.EFF[el.dataset.id].en + ' active']); },
    effAdd: () => { const id = $('#effSel').value; if (!id) return; if (id === '__custom') { openModal(dlgCustomEff); return 'x'; } C.snap(ch, id); const r = $('#effRounds').value; const e = C.addEffect(ch, id, { rounds: r === '' ? undefined : +r || null, dc: +$('#effDC').value || null }); if (id === 'rage') C.endConcentration(ch, T('Kampfrausch', 'rage')); C.logL(ch, [D.EFF[id].de + ' hinzugefügt', D.EFF[id].en + ' added']); void e; },
    effDel: () => { C.snap(ch, 'eff'); C.removeEffect(ch, el.dataset.id); }, endConc: () => { C.snap(ch, 'conc'); C.endConcentration(ch, T('freiwillig', 'voluntarily')); },
    clearLog: () => { ch.log = []; },
    move: () => { C.snap(ch, T('Bewegung', 'Move')); ch.turn.move = Math.max(0, ch.turn.move + +el.dataset.v); },
    resPip: () => { const r = C.resById(ch, el.dataset.id); const i = +el.dataset.i; C.snap(ch, 'res'); const left = r.max - (r.st.used || 0); r.st.used = i < left ? r.max - i : r.max - i - 1; r.st.used = Math.max(0, Math.min(r.max, r.st.used)); },
    slotPip: () => { const s = ch.slots[+el.dataset.id]; const i = +el.dataset.i; C.snap(ch, 'slot'); const left = s.max - s.used; s.used = i < left ? s.max - i : s.max - i - 1; s.used = Math.max(0, Math.min(s.max, s.used)); },
    pactPip: () => { const p = ch.pact; const i = +el.dataset.i; C.snap(ch, 'pact'); const left = p.count - p.used; p.used = i < left ? p.count - i : p.count - i - 1; p.used = Math.max(0, Math.min(p.count, p.used)); },
    customRes: () => { S.crEdit = el.dataset.id ? Object.assign({}, ch.customRes.find(c => c.id === el.dataset.id)) : {}; openModal(dlgCustomRes); return 'x'; },
    crSave: () => { const c = S.crEdit; Object.assign(c, { name: $('#crN').value || '?', max: +$('#crM').value || 0, recharge: $('#crR').value, cost: $('#crC').value, dice: $('#crD').value.trim(), heal: $('#crH').checked, grant: $('#crG').checked, grantReact: $('#crGR').checked, grantBonus: $('#crGB').checked, desc: $('#crT').value, save: $('#crS').value || null, saveDC: +$('#crSD').value || null, saveHalf: $('#crSH').value !== '0', aoe: $('#crA').checked }); C.snap(ch, 'custom'); if (c.id) { const i = ch.customRes.findIndex(x => x.id === c.id); ch.customRes[i] = Object.assign(ch.customRes[i], c); } else { c.id = I.uid(); c.used = 0; ch.customRes.push(c); } S.modal = null; },
    crDel: () => { ch.customRes = ch.customRes.filter(x => x.id !== S.crEdit.id); S.modal = null; },
    ceSave: () => { const fx = {}; const ac = +$('#ceAC').value; if (ac) fx.ac = ac; if ($('#ceAtk').value) fx.atk = $('#ceAtk').value; if ($('#ceAD').value.trim()) fx.atkDice = $('#ceAD').value.trim(); if ($('#ceSD').value.trim()) fx.saveDice = $('#ceSD').value.trim(); if ($('#ceVs').value) fx.vsMe = $('#ceVs').value; const sp = $('#ceSp').value; if (sp) fx.speed = sp === '0' ? 0 : sp; if ($('#ceInc').checked) fx.incap = true; const nm = $('#ceN').value || T('Eigener Effekt', 'Custom effect'); const custom = { id: 'custom', de: nm, en: nm, pos: +$('#ceP').value, desc: ['', ''], fx, save: $('#ceSv').value || null, when: $('#ceW').value }; C.snap(ch, 'eff'); C.addEffect(ch, 'custom', { custom, rounds: +$('#ceR').value || null, dc: +$('#ceDC').value || null }); S.modal = null; },
    endRound: () => { S.endRes = []; openModal(dlgEndRound); return 'x'; },
    erSave: () => { const i = +el.dataset.i; const it = S.endItems[i]; const dc = +$('#erDC' + i).value || null; const ctx = C.rollContext(ch, 'save', { abil: it.abil }); const dice = C.chosenDice(ctx); S.endRes[i] = C.d20(ch, { label: it.name + ' – ' + ABN(it.abil) + '-RW', base: ch.saves[it.abil].bonus, mode: C.finalMode(ctx, 'auto'), dice, flats: ctx.flats, kind: 'save', dc, autoFail: ctx.autoFail }); it.dc = dc; const e = ch.effects.find(x => x.uid === it.e.uid); if (e && dc) e.dc = dc; C.render(); return 'x'; },
    erDo: () => { const rm = []; S.endItems.forEach((it, i) => { if (it.kind === 'save') { const cb = $('#erRm' + i); if (cb && cb.checked) rm.push(it.e.uid); } }); const rg = $('#erRage'); C.finishRound(ch, { remove: rm, endRage: rg ? !rg.checked : false }, el.dataset.v === 'next'); S.modal = null; S.sel = null; S.pan = newPan(); },
    startRound: () => { C.startRound(ch); S.sel = null; S.pan = newPan(); },
    shortRest: () => { S.hdLog = ''; openModal(dlgShortRest); return 'x'; },
    hdRoll: () => { const p = ch.hd[+el.dataset.i]; const rr = R.rollDice(R.parseDice('1d' + p.die)); const v = Math.max(0, rr.total + ch.abil.CON.mod); p.used++; C.heal(ch, v); S.hdLog = T('W', 'd') + p.die + ': ' + rr.total + ' ' + R.fmt(ch.abil.CON.mod) + ' = ' + v + T(' TP', ' HP'); C.render(); return 'x'; },
    srDo: () => { const arc = [...document.querySelectorAll('.arc:checked')].map(x => +x.value); const lim = Math.ceil(R.clsLvl(ch, 'wizard') / 2); if (arc.reduce((a, b) => a + b, 0) > lim) { C.toast(T('Zu viele Grade gewählt (max. ', 'Too many levels selected (max ') + lim + ')'); return; } C.shortRest(ch, { arcane: arc.length ? arc : null }); S.modal = null; S.sel = null; },
    longRest: () => { openModal(dlgLongRest); return 'x'; },
    lrDo: () => { const f = $('#lrFood'); const pr = $('#lrPrep'); const wantPrep = pr ? pr.checked : false; C.longRest(ch, { food: f ? f.checked : true }); ch.slots.forEach(s => { if (s.bonus) { s.max -= s.bonus; s.bonus = 0; } }); S.modal = null; S.sel = null; if (wantPrep) { S.prepDraft = JSON.parse(JSON.stringify(ch.spells)); S.prepAfterRest = true; openModal(dlgPrepare); return 'x'; } },
    zeroRel: () => { C.useRes(ch, 'rRelentless', 1); ch.hp.cur = 1; C.logL(ch, ['Unerbittlichkeit: 1 TP', 'Relentless Endurance: 1 HP']); S.zeroPrompt = null; S.modal = null; },
    zeroRR: () => { const r = C.d20(ch, { label: T('Unbändige Wut', 'Relentless Rage'), base: ch.saves.CON.bonus, mode: 'normal', kind: 'save', dc: ch.rrDC }); S.rrRes = r; ch.rrDC += 5; if (r.success) { ch.hp.cur = 1; S.zeroPrompt = null; S.modal = null; S.rrRes = null; C.toast(T('Unbändige Wut: 1 TP!', 'Relentless Rage: 1 HP!')); } else C.render(); return S.modal ? 'x' : undefined; },
    zeroFall: () => { C.dropToZero(ch); S.zeroPrompt = null; S.modal = null; S.rrRes = null; },
    modalClose: () => { closeModal(); return 'x'; },
    dClsAdd: () => { S.draft.classes.push({ key: 'fighter', lvl: 1 }); recalcHD(S.draft); rerenderDraft(); return 'x'; }, dClsDel: () => { S.draft.classes.splice(+el.dataset.i, 1); recalcHD(S.draft); rerenderDraft(); return 'x'; },
    dSlotsCalc: () => { const c = R.computeSlots(S.draft); S.draft.slots.forEach((s, i) => s.max = c[i]); const wl = R.clsLvl(S.draft, 'warlock'); S.draft.pact = wl ? Object.assign(D.PACT(wl), { used: S.draft.pact ? S.draft.pact.used : 0 }) : null; rerenderDraft(); return 'x'; },
    dEffAdd: () => { const id = $('#dEff').value; if (!id || !D.EFF[id]) return 'x'; const r = $('#dEffR').value; S.draft.effects.push({ uid: I.uid(), id, rounds: r === '' ? (D.EFF[id].dur || null) : +r, dc: +$('#dEffDC').value || null, note: '' }); rerenderDraft(); return 'x'; },
    dEffDel: () => { S.draft.effects = S.draft.effects.filter(e => e.uid !== el.dataset.id); rerenderDraft(); return 'x'; },
    dWAdd: () => { S.draft.weapons.push({ id: I.uid(), name: T('Neue Waffe', 'New weapon'), atk: S.draft.prof + 2, dmg: '1d6+2', dmg2: null, type: 'slashing', wref: null }); rerenderDraft(); return 'x'; }, dWDel: () => { S.draft.weapons.splice(+el.dataset.i, 1); rerenderDraft(); return 'x'; },
    dSAdd: () => { S.draft.spells.push({ id: I.uid(), raw: '', lvl: 1, ref: null, prepared: true }); rerenderDraft(); return 'x'; }, dSDel: () => { S.draft.spells.splice(+el.dataset.i, 1); rerenderDraft(); return 'x'; },
    dSave: () => { saveSetup(); return 'x'; }
  };
  const fn = A[a]; if (!fn) return;
  const r = await fn(); if (r === 'x') return;
  C.render();
}
function afterDamage(ch) { if (S.zeroPrompt) { const k = C.K(ch); if (C.resLeft(ch, 'rRelentless') > 0 || (C.hasEff(ch, 'rage') && R.clsLvl(ch, 'barbarian') >= 11)) { S.modal = dlgZero; } else { C.dropToZero(ch); S.zeroPrompt = null; } void k; } }
function rerenderDraft() { C.render(); }
function recalcHD(d) {
  const tot = {}; d.classes.forEach(c => { const die = D.CLASSES[c.key].hd; tot[die] = (tot[die] || 0) + (+c.lvl || 0); });
  const sum = Object.values(tot).reduce((a, b) => a + b, 0); const cur = d.hd.reduce((a, p) => a + p.total, 0);
  if (sum === cur && d.hd.every(p => tot[p.die] === p.total)) return;
  d.hd = Object.entries(tot).map(([die, n]) => { const old = d.hd.find(p => p.die === +die); return { die: +die, total: n, used: old ? Math.min(old.used, n) : 0 }; }).sort((a, b) => b.die - a.die);
  d.prof = 2 + Math.floor((Math.max(1, sum) - 1) / 4);
}
function onChange(ev) {
  const el = ev.target; const ch = C.cur();
  if (el.dataset.f && S.draft) { const t = el.dataset.t; let v = t === 'n' ? (el.value === '' ? null : +el.value) : t === 'b' ? el.checked : el.value; if (t === 'n' && v === null && /\.(used|max|lvl|cur|temp)$|^(ac|speed|init|prof|passive|exhaustion)$/.test(el.dataset.f)) v = 0; if (t === 's' && v === '' && /dmg2$/.test(el.dataset.f)) v = null; setPath(S.draft, el.dataset.f, v); if (el.dataset.f === 'raceKey') S.draft.raceKey = v || null; if (/^classes\./.test(el.dataset.f)) recalcHD(S.draft); if (el.dataset.re) rerenderDraft(); return; }
  if (el.dataset.a2 === 'spellRef' && S.draft) { const s = S.draft.spells[+el.dataset.i]; const v = R.norm(el.value); const sp = R.SPELLS.find(x => R.norm(x.de) === v || R.norm(x.en) === v); s.ref = sp ? sp.key : null; if (sp && !s.raw) s.raw = sp.en; if (sp) { s.lvl = s.lvl === undefined ? sp.lvl : s.lvl; delete s.lvlMismatch; if (sp.lvl !== s.lvl) s.lvlMismatch = sp.lvl; } rerenderDraft(); return; }
  if (el.dataset.a2 === 'resNum' && ch) { const r = C.resById(ch, el.dataset.id); C.snap(ch, 'res'); r.st.used = Math.max(0, Math.min(r.max, r.max - (+el.value || 0))); C.render(); return; }
  if (el.dataset.c === 'exhaustion' && ch) { C.snap(ch, 'exh'); ch.exhaustion = +el.value; if (ch.exhaustion >= 6) ch.dead = true; C.render(); return; }
  if (el.dataset.tgt !== undefined && S.pan.tgts) { const t = S.pan.tgts[+el.dataset.tgt]; t[el.dataset.tf] = el.value; if (el.dataset.tf === 'v') t.st = null; C.render(); return; }
  if (el.dataset.p) { S.pan[el.dataset.p] = el.value; if (el.dataset.p === 'smiteLvl') S.pan.smiteSel = el.value; if (['slot', 'smiteLvl', 'fontLvl', 'targetAC', 'dc', 'tgtDC', 'tgtAbil'].includes(el.dataset.p)) C.render();
  if (el.dataset.p === 'nTgt') S.pan.nTgt = Math.max(1, Math.min(30, +el.value || 1)); return; }
  const a = el.dataset.a;
  if (a === 'panMod') { S.pan.mods[el.dataset.id] = el.checked; C.render(); }
  if (a === 'panDm') { S.pan.dm[el.dataset.id] = el.checked; C.render(); }
  if (a === 'panTgl') { S.pan[el.dataset.f] = el.checked; C.render(); }
  if (a === 'panSet') { S.pan[el.dataset.f] = +el.dataset.v; C.render(); }
}
function init() {
  C.load();
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.modal) closeModal(); if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !S.modal && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); C.undo(); C.render(); } });
  ['dragover', 'dragenter'].forEach(t => document.addEventListener(t, e => { e.preventDefault(); const d = $('#drop'); if (d) d.classList.add('over'); }));
  document.addEventListener('dragleave', () => { const d = $('#drop'); if (d) d.classList.remove('over'); });
  document.addEventListener('drop', async e => { e.preventDefault(); for (const f of e.dataTransfer.files) await importFile(f); });
  if (!S.chars.length) S.view = 'home';
  C.render();
  const ch = C.cur(); if (ch && !ch.setupDone) openSetup();
}
Object.assign(C, { importFile, exportParty, openSetup, select, newPan });
W.addEventListener('DOMContentLoaded', init);
})(window);
