/* Charakterverwaltung – Wurf-/Detailbereich */
(function (W) {
'use strict';
const C = W.CM, { D, R, S, T, L, esc, fmt } = C;
const sign = n => (n >= 0 ? '+' : '−') + Math.abs(n);
const dS = s => String(s).replace(/(\d)d(\d)/g, '$1' + T('W', 'd') + '$2').replace(/(^|[^\d])d(\d)/g, '$1' + T('W', 'd') + '$2');

function advSel() {
  const v = S.pan.adv || 'auto';
  return '<span class="advsel">' + [['auto', T('Auto', 'Auto')], ['normal', T('Normal', 'Normal')], ['adv', T('Vorteil', 'Adv.')], ['dis', T('Nachteil', 'Disadv.')]].map(([k, l]) => '<button data-a="panAdv" data-v="' + k + '" class="' + (v === k ? 'on' : '') + '">' + l + '</button>').join('') + '</span>';
}
function modsBlock(base, ctx, baseLabel) {
  const mode = C.finalMode(ctx, S.pan.adv);
  let h = '<ul class="mods"><li>' + esc(baseLabel) + '<span class="v">' + sign(base) + '</span></li>';
  for (const m of ctx.dice) { const on = S.pan.mods[m.id] !== undefined ? S.pan.mods[m.id] : m.on; h += '<li class="' + (m.dice[0] === '-' ? 'neg' : 'pos') + '"><label><input type="checkbox" data-a="panMod" data-id="' + esc(m.id) + '" ' + (on ? 'checked' : '') + '> ' + esc(m.label) + '</label><span class="v">' + dS(m.dice) + '</span></li>'; }
  for (const f of ctx.flats) h += '<li class="' + (f.v < 0 ? 'neg' : 'pos') + '">' + esc(f.label) + '<span class="v">' + sign(f.v) + '</span></li>';
  h += '<li>' + T('Sonstiger Bonus/Malus', 'Other bonus/penalty') + ' <input type="text" data-p="extra" value="' + esc(S.pan.extra || '') + '" placeholder="' + T('z. B. +2, -1d4', 'e.g. +2, -1d4') + '" style="width:7em;margin-left:auto"></li></ul>';
  h += '<div class="row small">' + advSel() + ' → <b>' + (mode === 'adv' ? T('Vorteil', 'Advantage') : mode === 'dis' ? T('Nachteil', 'Disadvantage') : T('normal', 'normal')) + '</b></div>';
  if (ctx.adv.length) h += '<div class="small" style="color:var(--ok)">▲ ' + T('Vorteil durch: ', 'Advantage from: ') + esc(ctx.adv.join(', ')) + '</div>';
  if (ctx.dis.length) h += '<div class="small" style="color:var(--fail)">▼ ' + T('Nachteil durch: ', 'Disadvantage from: ') + esc(ctx.dis.join(', ')) + '</div>';
  if (ctx.autoFail) h += '<div class="small miss">✘ ' + T('Scheitert automatisch: ', 'Automatically fails: ') + esc(ctx.autoFail) + '</div>';
  if (S.inspoNext) h += '<div class="small" style="color:var(--ok)">★ ' + T('Inspiration: Vorteil auf diesen Wurf', 'Inspiration: advantage on this roll') + '</div>';
  return h;
}
function chosenDice(ctx) {
  const list = ctx.dice.filter(m => (S.pan.mods[m.id] !== undefined ? S.pan.mods[m.id] : m.on)).map(m => ({ label: m.label, dice: m.dice, eff: m.eff, once: m.once }));
  const ex = String(S.pan.extra || '').trim();
  if (ex) { const p = R.parseDice(ex); if (p.terms.length) list.push({ label: T('Sonstiges', 'Other'), dice: ex }); }
  return list;
}
function extraFlat() { const ex = String(S.pan.extra || '').trim(); if (!ex) return []; const p = R.parseDice(ex); return p.flat && !p.terms.length ? [{ label: T('Sonstiges', 'Other'), v: p.flat }] : []; }
function consumeOnce(ch, used) { for (const m of used) if (m.once && m.eff) ch.effects = ch.effects.filter(e => e.uid !== m.eff); }
function modeWithInspo(ctx) { let m = C.finalMode(ctx, S.pan.adv); if (S.inspoNext) { m = m === 'dis' ? 'normal' : 'adv'; } return m; }

/* ---------- Ergebnisanzeige ---------- */
function resultHtml(ch, res) {
  if (!res) return '';
  if (res.type === 'd20') {
    const dice = res.dice.map((v, i) => { const kept = res.dice.length === 1 || (res.mode === 'adv' ? v === Math.max(...res.dice) && (i === res.dice.indexOf(Math.max(...res.dice))) : v === Math.min(...res.dice) && i === res.dice.indexOf(Math.min(...res.dice))); return '<span class="die ' + (kept ? (v === 20 ? 'n20' : v === 1 ? 'n1' : 'k') : 'x') + '">' + v + '</span>'; }).join('');
    let h = '<div class="result"><div class="row"><span class="tot">' + res.total + '</span><span>' + dice + '</span><span class="sp"></span><span class="small">' + esc(res.label) + '</span></div><div class="small">' + T('W20', 'd20') + ' ' + res.used + (res.used !== res.nat ? ' (' + T('Verlässliches Talent', 'Reliable Talent') + ')' : '') + ' ' + sign(res.base) + res.extra.map(e => ' ' + sign(e.v) + ' <span class="muted">(' + esc(e.label) + (e.dice ? ' ' + dS(e.dice) : '') + ')</span>').join('') + '</div>';
    if (res.kind === 'attack') { if (res.isCrit) h += '<div class="hit">💥 ' + T('Kritischer Treffer! Schadenswürfel werden verdoppelt.', 'Critical hit! Damage dice are doubled.') + '</div>'; else if (res.isFumble) h += '<div class="miss">' + T('Natürliche 1 – verfehlt automatisch.', 'Natural 1 – automatic miss.') + '</div>'; }
    if (res.dc) h += '<div class="' + (res.success ? 'hit' : 'miss') + '">' + (res.kind === 'attack' ? (res.success ? T('Treffer gegen RK ', 'Hit vs AC ') : T('Verfehlt gegen RK ', 'Miss vs AC ')) : (res.success ? T('Geschafft gegen SG ', 'Success vs DC ') : T('Misslungen gegen SG ', 'Failure vs DC '))) + res.dc + '</div>';
    if (res.autoFail) h += '<div class="miss">' + T('Automatisch misslungen', 'Automatic failure') + ' (' + esc(res.autoFail) + ')</div>';
    const k = C.K(ch);
    if (res.nat === 1 && k.lucky && ['attack', 'save', 'check', 'init', 'death', 'conc'].includes(res.kind) && !res.luckyUsed) h += '<button class="btn sm gold" data-a="lucky">🍀 ' + T('Glück (Halbling): neu würfeln', 'Lucky (halfling): reroll') + '</button> ';
    if (res.kind === 'save' && !res.success && C.resLeft(ch, 'indomitable') > 0) h += '<button class="btn sm gold" data-a="indomitable">💪 ' + T('Unbeugsam: wiederholen', 'Indomitable: reroll') + '</button>';
    return h + '</div>';
  }
  if (res.type === 'dmg') {
    let h = '<div class="result"><div class="row"><span class="tot">' + res.total + '</span><span class="small">' + (res.heal ? T('TP Heilung', 'HP healed') : T('Schaden', 'damage')) + (res.crit ? ' · <b class="hit">' + T('kritisch', 'critical') + '</b>' : '') + '</span>' + (res.half ? '<span class="sp"></span><span class="small">' + T('Bei gelungenem RW: ', 'On a successful save: ') + '<b>' + Math.floor(res.total / 2) + '</b></span>' : '') + '</div>';
    h += res.parts.map(p => '<div class="small">' + esc(p.label) + (p.type ? ' <span class="muted">(' + esc(C.dt(p.type)) + ')</span>' : '') + ': ' + p.rr.parts.map(q => q.vals.map(v => '<span class="die" style="min-width:1.5em;height:1.5em">' + v + '</span>').join('')).join(' ') + (p.rr.total - p.rr.parts.reduce((a, q) => a + q.vals.reduce((x, y) => x + y, 0) * q.sign, 0) ? ' ' + sign(p.rr.total - p.rr.parts.reduce((a, q) => a + q.vals.reduce((x, y) => x + y, 0) * q.sign, 0)) : '') + ' = <b>' + p.rr.total + '</b></div>').join('');
    if (res.heal) h += '<button class="btn sm primary" data-a="healSelf" data-v="' + res.total + '">＋ ' + T('Auf mich anwenden', 'Apply to me') + '</button>';
    if (res.temp) h += '<button class="btn sm primary" data-a="tempSelf" data-v="' + res.total + '">＋ ' + T('Als temporäre TP', 'As temporary HP') + '</button>';
    return h + '</div>';
  }
  if (res.type === 'free') return '<div class="result"><div class="row"><span class="tot">' + res.total + '</span><span>' + res.rr.parts.map(q => q.vals.map(v => '<span class="die">' + v + '</span>').join('')).join(' ') + '</span><span class="sp"></span><span class="small">' + esc(dS(res.expr)) + '</span></div></div>';
  return '';
}

/* ---------- Panel ---------- */
function cardPanel(ch) {
  const sel = S.sel;
  if (!sel) return '<div class="card rollbox"><h3>🎲 ' + T('Würfeln', 'Roll') + '</h3><div class="small muted">' + T('Wähle links eine Option („Was kannst du tun?“), ein Attribut, einen Rettungswurf oder eine Fertigkeit. Boni, Mali, Vorteil und Nachteil werden hier angezeigt.', 'Pick an option ("What can you do?"), an ability, a save or a skill. Bonuses, penalties, advantage and disadvantage are shown here.') + '</div>' + freeRoller() + resultHtml(ch, S.pan.res) + '</div>';
  let h = '<div class="card rollbox active' + (S.flash ? ' flash' : '') + '" id="rollPanel"><div class="selband">▶ ' + T('Ausgewählt', 'Selected') + ': ' + esc(selName(ch, sel)) + '</div>';
  S.flash = false;
  if (sel.cost === 'reaction' || (sel.opt && sel.opt.cost === 'reaction')) { const tr = sel.trigger || (sel.opt && sel.opt.trigger); h += '<div class="rnote">⏱ ' + T('Reaktion – nicht im eigenen Zug nötig: Du nutzt sie als Antwort auf einen Auslöser, meist im Zug eines Gegners.', 'Reaction – not tied to your own turn: you use it in response to a trigger, usually on an enemy\'s turn.') + (tr ? '<br>⚡ ' + T('Auslöser: ', 'Trigger: ') + esc(L(tr)) : '') + '</div>'; }
  try { h += ({ weapon: pWeapon, spell: pSpell, feat: pFeat, basic: pBasic, check: pCheck, save: pCheck, init: pCheck, death: pCheck, conc: pCheck })[sel.k](ch, sel); }
  catch (e) { console.error(e); h += '<div class="miss">Fehler: ' + esc(e.message) + '</div>'; }
  h += '<div class="row" style="margin-top:.5em"><span class="sp"></span><button class="btn sm ghost" data-a="selClear">✕ ' + T('schließen', 'close') + '</button></div>';
  return h + '</div>';
}
/* Rettungswürfe der Gegner: pro Ziel festlegen, ob ein geschaffter RW den Schaden halbiert oder verhindert */
const newTgt = (half) => ({ n: '', v: '', st: null, on: half === false ? 'none' : 'half' });
function makeTargets(n, half) { return Array.from({ length: Math.max(1, Math.min(30, +n || 1)) }, () => newTgt(half)); }
function saveBlock(ch, spec) {
  const P = S.pan; if (!P.tgts) P.tgts = makeTargets(1, spec.half);
  const abil = spec.choose ? (P.tgtAbil || spec.abil) : spec.abil; const dc = +P.tgtDC || spec.dc;
  const tot = P.dres && P.dres.type === 'dmg' && !P.dres.heal ? P.dres.total : null;
  const ruleTxt = spec.half === false ? T('Zauber: geschaffter RW verhindert den Schaden', 'Spell: a successful save negates the damage') : T('Zauber: geschaffter RW halbiert den Schaden', 'Spell: a successful save halves the damage');
  let h = '<div class="remind"><div class="row"><b>🎯 ' + T('Rettungswürfe der Gegner', 'Enemy saving throws') + '</b>' +
    (spec.choose ? ' <select data-p="tgtAbil">' + ['DEX', 'CON'].concat(D.ABIL.filter(a => a !== 'DEX' && a !== 'CON')).map(a => '<option value="' + a + '" ' + (abil === a ? 'selected' : '') + '>' + ABL(a) + '</option>').join('') + '</select>' : ' <span>' + (abil ? ABL(abil) + T('-Rettungswurf', ' save') : '') + '</span>') +
    ' <span class="small">' + T('SG', 'DC') + '</span> <input type="number" data-p="tgtDC" value="' + dc + '" style="width:3.4em"></div>' +
    '<div class="small muted" style="margin:.25em 0">' + ruleTxt + '. ' + T('Pro Ziel: RW-Ergebnis eintragen oder ✔/✘ wählen; bei Erfolg kannst du je Ziel „½“ oder „0“ festlegen (z. B. Entrinnen).', 'Per target: enter the save total or pick ✔/✘; on a success you can set "½" or "0" per target (e.g. Evasion).') + '</div>';
  let sum = 0;
  P.tgts.forEach((t, i) => {
    const st = t.st || (t.v !== '' && t.v !== undefined && dc ? (+t.v >= dc ? 'ok' : 'fail') : null);
    const on = t.on || (spec.half === false ? 'none' : 'half');
    let dmg = '<span class="muted">—</span>';
    if (tot !== null) {
      if (st === 'ok') { const v = on === 'none' ? 0 : Math.floor(tot / 2); dmg = '<b class="hit">' + v + '</b> <span class="tiny muted">' + (on === 'none' ? T('kein', 'none') : T('halb', 'half')) + '</span>'; sum += v; }
      else if (st === 'fail') { dmg = '<b class="miss">' + tot + '</b> <span class="tiny muted">' + T('voll', 'full') + '</span>'; sum += tot; }
      else dmg = '<span class="muted" title="' + T('voll / bei Erfolg', 'full / on success') + '">' + tot + ' / ' + (on === 'none' ? 0 : Math.floor(tot / 2)) + '</span>';
    }
    h += '<div class="row small" style="flex-wrap:nowrap;margin:.15em 0"><input type="text" data-tgt="' + i + '" data-tf="n" value="' + esc(t.n || '') + '" placeholder="' + T('Ziel ', 'Target ') + (i + 1) + '" style="flex:1;min-width:3.5em;width:5em">' +
      '<input type="number" data-tgt="' + i + '" data-tf="v" value="' + esc(t.v === undefined ? '' : t.v) + '" placeholder="RW" title="' + T('Gesamtergebnis des Rettungswurfs', 'Total of the saving throw') + '" style="width:3.4em">' +
      '<button class="btn sm ' + (st === 'ok' ? 'primary' : '') + '" data-a="tgtSt" data-i="' + i + '" data-v="ok" title="' + T('Rettungswurf geschafft', 'Save succeeded') + '">✔</button><button class="btn sm ' + (st === 'fail' ? 'primary' : '') + '" data-a="tgtSt" data-i="' + i + '" data-v="fail" title="' + T('Rettungswurf misslungen', 'Save failed') + '">✘</button>' +
      '<select data-tgt="' + i + '" data-tf="on" title="' + T('Schaden bei geschafftem Rettungswurf', 'Damage on a successful save') + '"><option value="half" ' + (on === 'half' ? 'selected' : '') + '>' + T('Erfolg: ½', 'Success: ½') + '</option><option value="none" ' + (on === 'none' ? 'selected' : '') + '>' + T('Erfolg: 0', 'Success: 0') + '</option></select>' +
      '<span style="min-width:4.2em;text-align:right">' + dmg + '</span>' + (P.tgts.length > 1 ? '<button class="btn sm ghost" data-a="tgtDel" data-i="' + i + '" style="padding:0 .2em">✕</button>' : '') + '</div>';
  });
  h += '<div class="row small"><button class="btn sm" data-a="tgtAdd" data-h="' + (spec.half === false ? 0 : 1) + '">＋ ' + T('Weiteres Ziel', 'Add target') + '</button><span class="sp"></span>' + (tot === null ? '<span class="muted">' + T('Nach dem Schadenswurf wird pro Ziel automatisch gerechnet.', 'After the damage roll each target is calculated automatically.') + '</span>' : (P.tgts.length > 1 ? T('Gesamtschaden: ', 'Total damage: ') + '<b>' + sum + '</b>' : '')) + '</div></div>';
  return h;
}
/* Abfrage beim Auslösen: wie viele Gegner werden getroffen? */
function countAsk() {
  return '<div class="row small" style="margin:.3em 0"><b>👥 ' + T('Wie viele Gegner werden getroffen?', 'How many enemies are hit?') + '</b> <input type="number" min="1" max="30" data-p="nTgt" value="' + esc(S.pan.nTgt || 1) + '" style="width:3.6em"></div>';
}
function selName(ch, sel) {
  if (sel.label) return sel.label;
  if (sel.k === 'save') return D.ABIL_N[sel.ab][S.lang === 'en' ? 1 : 0] + T('-Rettungswurf', ' saving throw');
  if (sel.k === 'check') return sel.sk ? L(D.SKILLS.find(s => s[0] === sel.sk).slice(2, 4)) : D.ABIL_N[sel.ab][S.lang === 'en' ? 1 : 0] + T('-Probe', ' check');
  if (sel.k === 'init') return 'Initiative';
  if (sel.k === 'death') return T('Todesrettungswurf', 'Death save');
  if (sel.k === 'conc') return T('Konzentration', 'Concentration');
  if (sel.k === 'spell') { const s = ch.spells.find(x => x.id === sel.id); return s ? C.spellInfo(ch, s).name : ''; }
  return '';
}
function head(title, tags, desc) { return '<h3>' + esc(title) + '</h3><div class="badges">' + tags.filter(Boolean).map(t => '<span class="badge">' + esc(t) + '</span>').join('') + '</div>' + (desc ? '<div class="small" style="margin:.3em 0">' + esc(dS(desc)) + '</div>' : ''); }
function freeRoller() {
  return '<div class="lvlh">' + T('Freier Wurf', 'Free roll') + '</div><div class="row">' + ['1d4', '1d6', '1d8', '1d10', '1d12', '1d20', '1d100'].map(d => '<button class="btn sm" data-a="freeRoll" data-v="' + d + '">' + dS(d.slice(1)) + '</button>').join('') + '<input type="text" id="freeExpr" placeholder="2d6+3" style="width:6em"><button class="btn sm primary" data-a="freeRoll">🎲</button></div>';
}

function pWeapon(ch, sel) {
  const w = C.wById(ch, sel.id); if (!w) return T('Waffe nicht gefunden', 'Weapon not found');
  const P = S.pan, wi = C.weaponInfo(ch, w), t = ch.turn, k = C.K(ch);
  const ctx = C.rollContext(ch, 'attack', { wi: Object.assign({}, wi, { melee: wi.melee && !P.thrown }) });
  let h = head(w.name, [C.costName(sel.cost === 'action' ? 'action' : sel.cost) + (sel.cost === 'action' && C.attacksPerAction(ch) > 1 ? ' (' + C.attacksPerAction(ch) + ' ' + T('Angriffe', 'attacks') + ')' : ''), wi.ranged || P.thrown ? T('Fernkampf', 'Ranged') : T('Nahkampf', 'Melee'), ABN(wi.abil), sel.offhand ? T('Zweitwaffe', 'Off-hand') : '', k.crit < 20 ? T('Krit ab ', 'Crit on ') + k.crit : '']);
  const cfg = [];
  if (w.dmg2) cfg.push('<label><input type="radio" name="grip" data-a="panSet" data-f="grip" data-v="1" ' + (P.grip !== 2 ? 'checked' : '') + '> ' + T('einhändig', 'one-handed') + '</label><label><input type="radio" name="grip" data-a="panSet" data-f="grip" data-v="2" ' + (P.grip === 2 ? 'checked' : '') + '> ' + T('zweihändig', 'two-handed') + '</label>');
  if (wi.thrown && wi.melee) cfg.push('<label><input type="checkbox" data-a="panTgl" data-f="thrown" ' + (P.thrown ? 'checked' : '') + '> ' + T('geworfen', 'thrown') + '</label>');
  cfg.push(T('Ziel-RK', 'Target AC') + ' <input type="number" data-p="targetAC" value="' + esc(P.targetAC || '') + '" style="width:3.6em">');
  h += '<div class="row small">' + cfg.join(' ') + '</div>';
  h += '<div class="lvlh">' + T('Angriffswurf', 'Attack roll') + '</div>' + modsBlock(w.atk, ctx, T('Angriffsbonus (Bogen)', 'Attack bonus (sheet)')) + C.explainShort(C.explain(ch, 'weapon', w.id));
  if (P.targetAC) { const need = +P.targetAC - w.atk; h += '<div class="small muted">' + T('Benötigt: W20 ', 'Needs: d20 ') + Math.max(2, Math.min(20, need)) + '+ ' + T('(ohne Würfelboni)', '(before dice bonuses)') + '</div>'; }
  h += '<div class="row" style="margin-top:.4em"><button class="btn primary" data-a="atkRoll">🎲 ' + (P.spent ? T('Angriff erneut würfeln', 'Reroll attack') : T('Angriff würfeln', 'Roll attack')) + '</button>' + (P.spent ? '' : '<span class="small muted">' + T('verbraucht: ', 'uses: ') + esc(C.costName(sel.cost === 'action' ? 'action' : sel.cost)) + '</span>') + '</div>';
  h += resultHtml(ch, P.res);
  // Schaden
  const wp = C.weaponParts(ch, w, P);
  h += '<div class="lvlh">' + T('Schaden', 'Damage') + '</div><ul class="mods">';
  for (const p of wp.parts) { const on = P.dm[p.id] !== undefined ? P.dm[p.id] : p.on; h += '<li class="pos">' + (p.fixed ? '' : '<input type="checkbox" data-a="panDm" data-id="' + p.id + '" ' + (on ? 'checked' : '') + '>') + ' ' + esc(p.label) + (p.type ? ' <span class="muted small">' + esc(C.dt(p.type)) + '</span>' : '') + '<span class="v">' + dS(p.dice) + '</span></li>'; }
  if (k.divineSmite && wi.melee && !P.thrown) {
    const ch1 = C.slotChoices(ch, 1);
    h += '<li>✝ ' + T('Göttliches Niederstrecken', 'Divine Smite') + ' <select data-p="smiteLvl" style="margin-left:auto"><option value="">—</option>' + ch1.map(c => '<option value="' + c.kind + ':' + c.lvl + '" ' + (P.smiteSel === c.kind + ':' + c.lvl ? 'selected' : '') + '>' + c.lvl + '. ' + T('Grad', 'lvl') + (c.kind === 'pact' ? ' (' + T('Pakt', 'pact') + ')' : '') + ' – ' + Math.min(5, c.lvl + 1) + T('W8', 'd8') + '</option>').join('') + '</select> <label class="small"><input type="checkbox" data-a="panTgl" data-f="smiteUndead" ' + (P.smiteUndead ? 'checked' : '') + '> ' + T('Untot/Unhold +1W8', 'Undead/fiend +1d8') + '</label></li>';
  }
  h += '<li>' + T('Zusatzschaden', 'Extra damage') + ' <input type="text" data-p="customDmg" value="' + esc(P.customDmg || '') + '" placeholder="1d6" style="width:5em;margin-left:auto"></li>';
  h += '<li><label><input type="checkbox" data-a="panTgl" data-f="crit" ' + (P.crit ? 'checked' : '') + '> ' + T('Kritischer Treffer (Würfel ×2)', 'Critical hit (dice ×2)') + '</label>' + ((k.brutal || k.savageAttacks) && wi.melee ? '<span class="v small">' + T('+', '+') + ((wi.melee ? k.brutal : 0) + (k.savageAttacks ? 1 : 0)) + ' ' + T('Waffenwürfel bei Krit', 'weapon dice on crit') + '</span>' : '') + '</li></ul>';
  if (C.anyFx(ch, 'halfStrDmg') && wi.abil === 'STR') h += '<div class="small miss">' + T('Geschwächt: ST-Waffenschaden halbieren!', 'Enfeebled: halve STR weapon damage!') + '</div>';
  h += '<div class="row"><button class="btn gold" data-a="dmgRoll">💥 ' + T('Schaden würfeln', 'Roll damage') + '</button>';
  if (k.options.some(o => o.id === 'stunning') && wi.melee && C.resLeft(ch, 'ki') > 0) h += '<button class="btn sm" data-a="stunning">⚡ ' + T('Betäubender Schlag (1 Ki)', 'Stunning Strike (1 ki)') + '</button>';
  h += '</div>' + resultHtml(ch, P.dres);
  if (P.spent && t.attacksLeft > 0 && ['action', 'attack'].includes(sel.cost)) h += '<div class="note">⚔️ ' + T('Noch ', '') + t.attacksLeft + T(' Angriff(e) in dieser Angriffsaktion.', ' attack(s) left in this Attack action.') + ' <button class="btn sm primary" data-a="nextAtk">' + T('Nächster Angriff', 'Next attack') + '</button></div>';
  if (P.spent && t.bonusAttacks > 0 && sel.cost === 'battack') h += '<div class="note"><button class="btn sm primary" data-a="nextAtk">' + T('Nächster Bonusangriff', 'Next bonus attack') + '</button></div>';
  return h;
}

function pSpell(ch, sel) {
  const s = ch.spells.find(x => x.id === sel.id); if (!s) return '—';
  const si = C.spellInfo(ch, s), P = S.pan;
  const tags = [si.lvl ? si.lvl + '. ' + T('Grad', 'level') : T('Zaubertrick', 'Cantrip'), C.costName(sel.cost || 'action'), si.conc ? T('Konzentration', 'Concentration') : '', si.ritual ? T('Ritual', 'Ritual') : '', sel.quick ? T('Beschleunigt (2 ZP)', 'Quickened (2 SP)') : ''];
  let h = head(si.name, tags, s.ref ? '' : T('Zauber nicht in der Datenbank erkannt – Werte unter „Bearbeiten“ ergänzen.', 'Spell not recognized – add details under "Edit".'));
  if (s.raw && s.ref) h += '<div class="tiny muted">' + T('Bogen: ', 'Sheet: ') + esc(s.raw) + '</div>';
  const blocked = sel.info ? C.spellBlock(ch, si, sel.cost || 'action') : null;
  if (!P.spent) {
    if (si.lvl > 0) {
      const ch2 = C.slotChoices(ch, si.lvl);
      if (!P.slot && ch2[0]) P.slot = ch2[0].kind + ':' + ch2[0].lvl;
      h += '<div class="row small">' + T('Zauberplatz', 'Spell slot') + ': <select data-p="slot">' + ch2.map(c => '<option value="' + c.kind + ':' + c.lvl + '" ' + (P.slot === c.kind + ':' + c.lvl ? 'selected' : '') + '>' + c.lvl + '. ' + T('Grad', 'level') + (c.kind === 'pact' ? ' (' + T('Pakt', 'pact') + ')' : '') + ' – ' + c.left + ' ' + T('übrig', 'left') + '</option>').join('') + '</select></div>';
    }
    if (si.ex.self) h += '<label class="small"><input type="checkbox" data-a="panTgl" data-f="noSelf" ' + (P.noSelf ? '' : 'checked') + '> ' + T('Effekt auf mich anwenden', 'Apply effect to me') + ' (' + esc(L([C.D.EFF[si.ex.self] ? C.D.EFF[si.ex.self].de : si.ex.self, C.D.EFF[si.ex.self] ? C.D.EFF[si.ex.self].en : si.ex.self])) + ')</label>';
    if (si.conc && ch.concentration) h += '<div class="small miss">⚠ ' + T('Beendet deine Konzentration auf ', 'Ends your concentration on ') + esc(ch.concentration.name) + '</div>';
    const ok = !blocked && !(sel.info && !S.optMap[sel.key]);
    if (si.ex.aoe && si.mode === 'save') h += countAsk();
    h += '<div class="row" style="margin-top:.4em"><button class="btn primary" data-a="cast" ' + (blocked ? 'disabled' : '') + '>✨ ' + T('Zaubern', 'Cast') + '</button>' + (blocked ? '<span class="small miss">🔒 ' + esc(blocked) + '</span>' : '') + '</div>';
    void ok;
  } else h += '<div class="note">✨ ' + T('Gewirkt', 'Cast') + (P.castLvl ? ' ' + T('mit ', 'at ') + P.castLvl + '. ' + T('Grad', 'level') : '') + '.</div>';
  const lvl = P.castLvl || si.lvl;
  if (si.mode === 'atk') {
    const ctx = C.rollContext(ch, 'attack', { wi: null });
    h += '<div class="lvlh">' + T('Zauberangriff', 'Spell attack') + '</div>' + modsBlock(si.atk, ctx, T('Zauberangriffsbonus', 'Spell attack bonus')) + (s.atk === undefined || s.atk === null ? C.explainShort(C.explain(ch, 'spellatk')) : '');
    h += '<div class="row small">' + T('Ziel-RK', 'Target AC') + ' <input type="number" data-p="targetAC" value="' + esc(P.targetAC || '') + '" style="width:3.6em"></div>';
    h += '<button class="btn primary" data-a="spellAtk" ' + (P.spent ? '' : 'disabled title="' + T('Erst zaubern', 'Cast first') + '"') + '>🎲 ' + T('Angriff würfeln', 'Roll attack') + '</button>' + resultHtml(ch, P.res);
  }
  if (si.mode === 'save') h += '<div class="note">🎯 ' + T('Ziel macht einen ', 'Target makes a ') + '<b>' + ABL(si.save) + T('-Rettungswurf', ' saving throw') + '</b> ' + T('gegen SG ', 'vs DC ') + '<b>' + C.spellDC(ch) + '</b>' + (si.half ? T(' – halber Schaden bei Erfolg.', ' – half damage on success.') : '.') + '</div>';
  const dm = C.spellDamage(ch, si, lvl);
  if (dm && !si.ex.smite) {
    h += '<div class="lvlh">' + (si.mode === 'heal' ? T('Heilung', 'Healing') : T('Schaden', 'Damage')) + '</div><div class="small">' + (dm.count > 1 ? dm.count + ' × ' : '') + dS(R.diceStr(dm.p).replace(/W/g, 'd')) + ' ' + esc(si.mode === 'heal' ? '' : C.dt(si.type)) + (dm.count > 1 ? (si.ex.beams || si.mode === 'atk' ? T(' (je Strahl eigener Angriffswurf)', ' (separate attack per ray)') : T(' (alle Geschosse)', ' (all missiles)')) : '') + '</div>';
    h += '<div class="row"><label class="small"><input type="checkbox" data-a="panTgl" data-f="crit" ' + (P.crit ? 'checked' : '') + '> ' + T('kritisch', 'critical') + '</label><button class="btn gold" data-a="spellDmg" ' + (P.spent ? '' : 'disabled') + '>' + (si.mode === 'heal' ? '💚 ' + T('Heilung würfeln', 'Roll healing') : '💥 ' + T('Schaden würfeln', 'Roll damage')) + '</button></div>' + resultHtml(ch, P.dres);
    if (si.mode === 'save') h += saveBlock(ch, { abil: si.save, dc: C.spellDC(ch), half: si.half });
  }
  if (si.ex.smite) h += '<div class="small">' + T('Der Zusatzschaden wird beim nächsten Waffentreffer automatisch angeboten.', 'The extra damage is offered automatically on your next weapon hit.') + '</div>';
  if (si.ex.note || /booming|green.flame|toll the dead|ice knife|shadow blade/i.test(si.name)) h += '<div class="tiny muted">' + T('Hinweis: Zusatzeffekte laut Zauberbeschreibung.', 'Note: additional effects per spell description.') + '</div>';
  return h;
}
const ABL = a => D.ABIL_N[a] ? D.ABIL_N[a][S.lang === 'en' ? 1 : 0] : a;
const ABN = a => D.ABIL_N[a] ? D.ABIL_N[a][S.lang === 'en' ? 3 : 2] : a;

function pFeat(ch, sel) {
  const o = sel.opt; const P = S.pan;
  let h = head(L(o.name), [C.costName(o.cost), o.res ? (o.pool ? C.resLeft(ch, o.res) + ' ' + T('Punkte', 'points') : C.resLeft(ch, o.res) + ' ' + T('Nutzungen', 'uses')) : ''], L(o.desc));
  if (o.pool) h += '<div class="row small">' + T('Punkte einsetzen', 'Points to spend') + ' <input type="number" data-p="pool" value="' + (P.pool || Math.min(5, C.resLeft(ch, o.res))) + '" min="1" max="' + C.resLeft(ch, o.res) + '"></div>';
  if (o.font === 'toSlot') h += '<div class="row small">' + T('Zauberplatz-Grad', 'Slot level') + ' <select data-p="fontLvl">' + [[1, 2], [2, 3], [3, 5], [4, 6], [5, 7]].map(([l, c]) => '<option value="' + l + '" ' + (+P.fontLvl === l ? 'selected' : '') + ' ' + (C.resLeft(ch, 'sorcery') < c ? 'disabled' : '') + '>' + l + '. (' + c + ' ' + T('Pkt.', 'pts') + ')</option>').join('') + '</select></div>';
  if (o.font === 'toPts') h += '<div class="row small">' + T('Zauberplatz', 'Slot') + ' <select data-p="fontLvl">' + ch.slots.map((s, i) => s.max - s.used > 0 ? '<option value="' + (i + 1) + '" ' + (+P.fontLvl === i + 1 ? 'selected' : '') + '>' + (i + 1) + '. ' + T('Grad', 'level') + '</option>' : '').join('') + '</select></div>';
  if (o.sub && !P.spent) h += '<div class="row">' + o.sub.map(x => '<button class="btn primary" data-a="featDo" data-v="' + x + '">' + ({ dash: T('Spurt', 'Dash'), disengage: T('Rückzug', 'Disengage'), hide: T('Verstecken', 'Hide') })[x] + '</button>').join('') + '</div>';
  else if (!P.spent) h += (o.roll && o.roll.save && o.roll.save.aoe ? countAsk() : '') + '<button class="btn primary" data-a="featDo">▶ ' + T('Ausführen', 'Use') + '</button>';
  else h += '<div class="note">✔ ' + T('Ausgeführt.', 'Done.') + '</div>';
  if (o.spellRef) {
    const sp = R.SPELL[o.spellRef]; const si = { lvl: sp.lvl, dmg: sp.dmg, up: sp.up, ex: sp.ex, type: sp.type, mode: sp.mode, dmgBonus: 0 };
    h += '<div class="note">🎯 ' + T('Ziel: ', 'Target: ') + ABL(sp.save) + T('-Rettungswurf gegen SG ', ' save vs DC ') + (8 + ch.prof + ch.abil[o.abil || 'CHA'].mod) + '</div>';
    const dm = C.spellDamage(ch, si, o.spellLvl || sp.lvl);
    if (dm) h += '<button class="btn gold" data-a="featDmg" data-v="' + R.diceStr(dm.p).replace(/W/g, 'd').replace(/−/g, '-') + '" data-t="' + sp.type + '" ' + (P.spent ? '' : 'disabled') + '>💥 ' + dS(R.diceStr(dm.p).replace(/W/g, 'd')) + ' ' + T('würfeln', 'roll') + '</button>';
    if (dm && sp.mode === 'save') h += resultHtml(ch, P.dres) + saveBlock(ch, { abil: sp.save, dc: 8 + ch.prof + ch.abil[o.abil || 'CHA'].mod, half: sp.half });
  }
  if (o.roll) h += '<div class="row"><button class="btn gold" data-a="featRoll" ' + (P.spent || o.cost === 'free' ? '' : 'disabled') + '>🎲 ' + esc(L(o.roll.label)) + ' (' + dS(o.roll.dice) + ')</button></div>';
  if (o.pool && P.spent) h += '<button class="btn sm primary" data-a="healSelf" data-v="' + (P.poolUsed || 0) + '">＋ ' + T('Heilung auf mich anwenden', 'Apply healing to me') + ' (' + (P.poolUsed || 0) + ')</button>';
  if (o.showDC) h += '<div class="small">' + T('SG ', 'DC ') + C.spellDC(ch) + '</div>';
  const saveSpec = o.roll && o.roll.save ? o.roll.save : null;
  if (!(o.spellRef && R.SPELL[o.spellRef] && R.SPELL[o.spellRef].mode === 'save')) h += resultHtml(ch, P.dres || P.res);
  if (saveSpec) h += saveBlock(ch, saveSpec);
  return h;
}
function pBasic(ch, sel) {
  const P = S.pan; const id = sel.id;
  const names = { dash: [T('Spurt', 'Dash'), T('Du erhältst zusätzliche Bewegung in Höhe deiner Bewegungsrate.', 'You gain extra movement equal to your speed.')], disengage: [T('Rückzug', 'Disengage'), T('Deine Bewegung provoziert in diesem Zug keine Gelegenheitsangriffe.', 'Your movement doesn\'t provoke opportunity attacks this turn.')], dodge: [T('Ausweichen', 'Dodge'), T('Bis zu deinem nächsten Zug: Angriffe gegen dich mit Nachteil, Vorteil auf GE-Rettungswürfe.', 'Until your next turn: attacks against you have disadvantage, advantage on DEX saves.')], help: [T('Helfen', 'Help'), T('Ein Verbündeter hat Vorteil auf seine nächste Probe oder seinen nächsten Angriff gegen ein Ziel in 1,5 m von dir.', 'An ally gains advantage on the next check or attack against a target within 5 ft of you.')], hide: [T('Verstecken', 'Hide'), T('Geschicklichkeitsprobe (Heimlichkeit).', 'Dexterity (Stealth) check.')], ready: [T('Vorbereiten', 'Ready'), T('Lege Auslöser und Reaktion fest. Wird ausgelöst, verbrauchst du deine Reaktion.', 'Choose a trigger and a response. When triggered you use your reaction.')], search: [T('Suchen', 'Search'), T('Wahrnehmung oder Nachforschungen.', 'Perception or Investigation.')], useObject: [T('Gegenstand benutzen', 'Use an Object'), T('z. B. Heiltrank trinken (2W4+2).', 'e.g. drink a healing potion (2d4+2).')], grapple: [T('Packen', 'Grapple'), T('Ersetzt einen Angriff. Athletik gegen Athletik/Akrobatik des Ziels; bei Erfolg ist es gepackt.', 'Replaces an attack. Athletics vs the target\'s Athletics/Acrobatics; on success it is grappled.')], shove: [T('Stoßen', 'Shove'), T('Ersetzt einen Angriff. Athletik gegen Athletik/Akrobatik: Ziel liegend oder 1,5 m weggestoßen.', 'Replaces an attack. Athletics vs Athletics/Acrobatics: target prone or pushed 5 ft.')], standUp: [T('Aufstehen', 'Stand up'), T('Kostet die Hälfte deiner Bewegungsrate.', 'Costs half your speed.')], dropProne: [T('Hinlegen', 'Drop prone'), T('Du bist liegend.', 'You are prone.')], object: [T('Objektinteraktion', 'Object interaction'), T('Eine freie Interaktion pro Zug.', 'One free interaction per turn.')], endConc: [T('Konzentration beenden', 'End concentration'), ch.concentration ? ch.concentration.name : ''], inspo: [T('Inspiration nutzen', 'Use Inspiration'), T('Vorteil auf deinen nächsten W20-Wurf.', 'Advantage on your next d20 roll.')] };
  const [nm, ds] = names[id] || [id, ''];
  let h = head(nm, [C.costName(sel.cost)], ds);
  if (!P.spent) h += '<button class="btn primary" data-a="basicDo">▶ ' + T('Ausführen', 'Do it') + '</button>';
  else h += '<div class="note">✔ ' + T('Ausgeführt.', 'Done.') + '</div>';
  if (P.spent && (id === 'hide' || id === 'grapple' || id === 'shove' || id === 'search')) {
    const sk = id === 'hide' ? 'stealth' : id === 'search' ? 'perception' : 'athletics';
    h += '<button class="btn gold" data-a="sel" data-k="check" data-ab="' + D.SKILLS.find(s => s[0] === sk)[1] + '" data-sk="' + sk + '">🎲 ' + L(D.SKILLS.find(s => s[0] === sk).slice(2, 4)) + '</button>';
    if (id === 'search') h += ' <button class="btn sm" data-a="sel" data-k="check" data-ab="INT" data-sk="investigation">🎲 ' + T('Nachforschungen', 'Investigation') + '</button>';
  }
  if (P.spent && id === 'hide') h += ' <button class="btn sm" data-a="effQuick" data-id="hidden">' + T('Als versteckt markieren', 'Mark as hidden') + '</button>';
  if (P.spent && id === 'grapple' && ch.turn.attacksLeft > 0) h += '<div class="note"><button class="btn sm primary" data-a="nextAtkAny">' + T('Weiter angreifen', 'Continue attacking') + '</button></div>';
  return h;
}
function pCheck(ch, sel) {
  const P = S.pan; let base, ctx, title, extra = '';
  if (sel.k === 'save' || sel.k === 'conc') { const a = sel.k === 'conc' ? 'CON' : sel.ab; base = ch.saves[a].bonus; ctx = C.rollContext(ch, 'save', { abil: a }); title = sel.k === 'conc' ? T('Konzentrationswurf (KO)', 'Concentration save (CON)') : ABL(a) + T('-Rettungswurf', ' saving throw'); if (sel.k === 'conc' && !P.dc && S.pendingConc) P.dc = S.pendingConc.dc; }
  else if (sel.k === 'check') { const a = sel.ab; if (sel.sk) { base = ch.skills[sel.sk].bonus; title = L(D.SKILLS.find(s => s[0] === sel.sk).slice(2, 4)) + ' (' + ABN(a) + ')'; } else { base = ch.abil[a].mod; title = ABL(a) + T('-Probe', ' check'); } ctx = C.rollContext(ch, 'check', { abil: a, skill: sel.sk }); }
  else if (sel.k === 'init') { base = ch.init; ctx = C.rollContext(ch, 'init', { abil: 'DEX' }); title = T('Initiative', 'Initiative'); }
  else { base = 0; ctx = C.rollContext(ch, 'death', { abil: null }); title = T('Todesrettungswurf', 'Death saving throw'); extra = '<div class="small">' + T('10+ Erfolg · 1 = zwei Fehlschläge · 20 = sofort 1 TP', '10+ success · 1 = two failures · 20 = regain 1 HP') + '</div>'; }
  const xp = sel.k === 'save' ? C.explain(ch, 'save', sel.ab) : sel.k === 'conc' ? C.explain(ch, 'save', 'CON') : sel.k === 'check' ? C.explain(ch, sel.sk ? 'skill' : 'check', sel.sk || sel.ab) : sel.k === 'init' ? C.explain(ch, 'init') : null;
  let h = head(title, [T('kein Aktionsverbrauch', 'no action cost')]) + extra + modsBlock(base, ctx, T('Bonus (Bogen)', 'Bonus (sheet)')) + C.explainShort(xp);
  if (sel.k !== 'death') h += '<div class="row small">' + T('SG (optional)', 'DC (optional)') + ' <input type="number" data-p="dc" value="' + esc(P.dc || '') + '" style="width:3.6em"></div>';
  h += '<button class="btn primary" data-a="checkRoll">🎲 ' + T('Würfeln', 'Roll') + '</button>' + resultHtml(ch, P.res);
  if (P.res && sel.k === 'check' && sel.sk === 'stealth' && P.res.total) h += '<button class="btn sm" data-a="effQuick" data-id="hidden">' + T('Als versteckt markieren', 'Mark as hidden') + '</button>';
  return h;
}

Object.assign(C, { makeTargets, cardPanel, resultHtml, chosenDice, extraFlat, consumeOnce, modeWithInspo });
})(window);
