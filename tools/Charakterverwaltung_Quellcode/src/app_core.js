/* Charakterverwaltung – Kern: Zustand, Persistenz, Ableitungen, Regeln pro Zug */
(function (W) {
'use strict';
const D = W.CM_DATA, R = W.CM_RULES, I = W.CM_IMPORT;
// Deckung als zusätzliche Effekte
D.EFFECTS.push(
  { id: 'cover2', de: 'Halbe Deckung', en: 'Half Cover', pos: 1, desc: ['+2 RK und GE-Rettungswürfe.', '+2 AC and DEX saving throws.'], fx: { ac: 2, saveFlat: { DEX: 2 } }, dur: 1 },
  { id: 'cover5', de: 'Dreivierteldeckung', en: 'Three-Quarters Cover', pos: 1, desc: ['+5 RK und GE-Rettungswürfe.', '+5 AC and DEX saving throws.'], fx: { ac: 5, saveFlat: { DEX: 5 } }, dur: 1 }
);
D.EFFECTS.forEach(e => { D.EFF[e.id] = e; });

const S = W.CM_S = { lang: 'de', chars: [], active: null, sel: null, showHidden: false, undo: {}, result: null, modal: null, toast: null };
const T = W.T = (de, en) => (S.lang === 'en' ? en : de);
const L = W.Lx = a => (Array.isArray(a) ? (S.lang === 'en' ? (a[1] !== undefined ? a[1] : a[0]) : a[0]) : (a && typeof a === 'object' && 'de' in a ? (S.lang === 'en' ? a.en : a.de) : (a === undefined || a === null ? '' : a)));
const esc = W.esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = R.fmt;

/* ---------- Persistenz ---------- */
const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
function load() { S.lang = LS.get('cm.lang', 'de'); S.chars = LS.get('cm.chars', []); S.active = LS.get('cm.active', null); S.chars.forEach(upgrade); if (!S.chars.some(c => c.id === S.active)) S.active = S.chars[0] ? S.chars[0].id : null; }
function save() { LS.set('cm.chars', S.chars); LS.set('cm.active', S.active); LS.set('cm.lang', S.lang); }
function upgrade(ch) { ch.customRes = ch.customRes || []; ch.acMods = ch.acMods || []; ch.effects = ch.effects || []; ch.log = ch.log || []; ch.settings = ch.settings || {}; if (!ch.turn) ch.turn = newTurn(ch); }
const cur = () => S.chars.find(c => c.id === S.active) || null;

/* ---------- Undo / Rewind ---------- */
function snap(ch, label) { ch = ch || cur(); if (!ch) return; const st = S.undo[ch.id] = S.undo[ch.id] || []; st.push({ label, data: JSON.stringify(ch) }); if (st.length > 80) st.shift(); }
function undo() {
  const ch = cur(); if (!ch) return; const st = S.undo[ch.id] || []; const last = st.pop(); if (!last) return;
  const old = JSON.parse(last.data); const i = S.chars.findIndex(c => c.id === ch.id); S.chars[i] = old;
  S.sel = null; S.result = null; toast(T('Rückgängig: ', 'Undone: ') + (last.label || '')); save();
}

/* ---------- Ableitungen ---------- */
const K = ch => R.kit(ch);
function effDef(e) { return e.custom ? e.custom : (D.EFF[e.id] || { id: e.id, de: e.id, en: e.id, pos: 0, fx: {}, desc: ['', ''] }); }
function hasEff(ch, id) { return ch.effects.some(e => e.id === id); }
function fxList(ch) {
  const out = ch.effects.map(e => ({ e, def: effDef(e), fx: effDef(e).fx || {} }));
  const x = ch.exhaustion || 0;
  if (x >= 1) out.push({ e: { id: 'exh' }, def: { de: 'Erschöpfung ' + x, en: 'Exhaustion ' + x, pos: 0 }, fx: { checkDis: true, speed: x >= 5 ? 0 : x >= 2 ? 'half' : undefined, atk: x >= 3 ? 'dis' : undefined, saveDis: x >= 3 ? D.ABIL : undefined } });
  return out;
}
const anyFx = (ch, key) => fxList(ch).some(f => f.fx[key]);
function incap(ch) { return anyFx(ch, 'incap') || (ch.hp.cur <= 0); }
function speedNow(ch) {
  let s = ch.speed, zero = false, dbl = false, half = false;
  for (const f of fxList(ch)) { const v = f.fx.speed; if (v === 0) zero = true; else if (v === 'double') dbl = true; else if (v === 'half') half = true; else if (typeof v === 'number') s += v; }
  if (hasEff(ch, 'rage') && R.clsLvl(ch, 'barbarian') >= 5) s += 0; // Schnelle Bewegung steht bereits im Bogen
  if (dbl) s *= 2; if (half) s = Math.floor(s / 2); if (zero) s = 0;
  return s;
}
function acNow(ch) {
  const parts = [{ n: T('Basis (Bogen)', 'Base (sheet)'), v: ch.ac, base: true }]; let total = ch.ac; const notes = [];
  for (const f of fxList(ch)) {
    if (f.fx.acSet === 'mage') { const m = 13 + ch.abil.DEX.mod; if (m > total) { parts.push({ n: L([f.def.de, f.def.en]) + ' (13+GE)', v: m - total }); total = m; } }
  }
  for (const f of fxList(ch)) if (f.fx.ac) { parts.push({ n: L([f.def.de, f.def.en]), v: f.fx.ac }); total += f.fx.ac; }
  for (const m of ch.acMods) if (m.v) { parts.push({ n: m.n || T('Modifikator', 'Modifier'), v: +m.v, custom: m }); total += +m.v; }
  for (const f of fxList(ch)) if (f.fx.acMin && total < f.fx.acMin) { parts.push({ n: L([f.def.de, f.def.en]) + ' (min ' + f.fx.acMin + ')', v: f.fx.acMin - total }); total = f.fx.acMin; }
  let adv = [], dis = [];
  for (const f of fxList(ch)) { const v = f.fx.vsMe; if (!v) continue; (String(v).startsWith('adv') ? adv : dis).push(L([f.def.de, f.def.en]) + (v === 'adv*' ? T(' (Nahkampf; Fernkampf: Nachteil)', ' (melee; ranged: disadvantage)') : '')); }
  if (adv.length) notes.push(T('Angriffe gegen dich mit Vorteil: ', 'Attacks against you have advantage: ') + adv.join(', '));
  if (dis.length) notes.push(T('Angriffe gegen dich mit Nachteil: ', 'Attacks against you have disadvantage: ') + dis.join(', '));
  return { total, parts, notes };
}
function castMod(ch) { const a = ch.spellcasting.abil || 'CHA'; return ch.abil[a] ? ch.abil[a].mod : 0; }
function spellDC(ch) { return ch.spellcasting.dc || (8 + ch.prof + castMod(ch)); }
function spellAtk(ch) { return ch.spellcasting.atk !== null && ch.spellcasting.atk !== undefined ? ch.spellcasting.atk : ch.prof + castMod(ch); }

/* Ressourcen */
function allRes(ch) {
  const k = K(ch); const list = k.resources.map(r => { const st = ch.resources.find(x => x.id === r.id) || { id: r.id, used: 0 }; if (!ch.resources.includes(st)) ch.resources.push(st); return Object.assign({}, r, { st }); });
  for (const c of ch.customRes) list.push({ id: c.id, name: [c.name, c.name], max: +c.max || 0, recharge: c.recharge, custom: c, st: c });
  return list;
}
function resById(ch, id) { return allRes(ch).find(r => r.id === id); }
const resLeft = (ch, id) => { const r = resById(ch, id); return r ? Math.max(0, r.max - (r.st.used || 0)) : 0; };
function useRes(ch, id, n) { const r = resById(ch, id); if (r) r.st.used = Math.min(r.max, (r.st.used || 0) + (n || 1)); }

/* Zauber */
function spellInfo(ch, s) {
  const db = s.ref ? R.SPELL[s.ref] : null;
  const name = db ? L([db.de, db.en]) : String(s.raw || '').replace(/\(.*$/, '').trim() || s.raw;
  const g = (k, d) => (s[k] !== undefined && s[k] !== null && s[k] !== '' ? s[k] : db && db[k] !== undefined ? db[k] : d);
  return { s, db, name, lvl: s.lvl, time: g('time', 'A'), conc: !!g('conc', false), ritual: !!(db && db.ritual), mode: g('mode', ''), save: g('save', null), dmg: g('dmg', ''), type: g('type', ''), up: g('up', ''), half: !!(db && db.half), ex: (db && db.ex) || {}, atk: s.atk !== undefined && s.atk !== null ? s.atk : spellAtk(ch), dmgBonus: s.dmgBonus || 0 };
}
function slotChoices(ch, lvl) {
  const out = []; if (lvl === 0) return [{ lvl: 0, kind: 'cantrip' }];
  for (let i = lvl; i <= 9; i++) { const sl = ch.slots[i - 1]; if (sl && sl.max - sl.used > 0) out.push({ lvl: i, kind: 'slot', left: sl.max - sl.used }); }
  if (ch.pact && ch.pact.level >= lvl && ch.pact.count - ch.pact.used > 0) out.push({ lvl: ch.pact.level, kind: 'pact', left: ch.pact.count - ch.pact.used });
  return out;
}
const tier = ch => { const l = R.totalLvl(ch); return l >= 17 ? 4 : l >= 11 ? 3 : l >= 5 ? 2 : 1; };
function spellDamage(ch, si, slotLvl) {
  if (!si.dmg) return null;
  let p = R.parseDice(si.dmg);
  if (si.lvl === 0 && !si.ex.beams && p.terms.length) p = { terms: p.terms.map(t => ({ ...t, n: t.n * tier(ch) })), flat: p.flat };
  const extra = Math.max(0, (slotLvl || si.lvl) - si.lvl);
  if (si.up && extra) { const steps = si.ex.up2 ? Math.floor(extra / 2) : extra; if (/d/.test(si.up)) p = R.addDice(p, R.scaleDice(R.parseDice(si.up), steps)); else p = R.addDice(p, { terms: [], flat: (+si.up || 0) * steps }); }
  if (si.ex.mod) p = R.addDice(p, { terms: [], flat: castMod(ch) });
  if (si.dmgBonus) p = R.addDice(p, { terms: [], flat: si.dmgBonus });
  let count = 1;
  if (si.ex.n) count = +si.ex.n + (si.ex['n+'] ? extra * +si.ex['n+'] : 0);
  if (si.ex.beams) count = tier(ch);
  return { p, count };
}

/* ---------- Zug / Aktionsökonomie ---------- */
function newTurn(ch) { return { actions: 1, actUsed: 0, hasteAvail: true, hasteUsed: false, bonusUsed: false, reactUsed: false, move: 0, dash: 0, attacksLeft: 0, attackSrc: null, attackAction: false, bonusAttacks: 0, spells: [], sneakUsed: false, objUsed: false, lightAtk: false, attacked: false, firstAtkDone: false, surges: 0, phase: 'turn', tookDmg: false }; }
function econ(ch) {
  const t = ch.turn, inc = incap(ch);
  const slow = anyFx(ch, 'oneOf');
  const actionLeft = !inc && t.phase === 'turn' && t.actUsed < t.actions && !(slow && t.bonusUsed);
  const hasteLeft = !inc && t.phase === 'turn' && anyFx(ch, 'extraAction') && !t.hasteUsed && !t.attacksLeft;
  const bonusLeft = !inc && t.phase === 'turn' && !t.bonusUsed && !(slow && t.actUsed > 0);
  const reactLeft = !inc && !t.reactUsed && !anyFx(ch, 'noReact');
  const sp = speedNow(ch); const maxMove = sp * (1 + t.dash);
  return { actionLeft, hasteLeft, bonusLeft, reactLeft, inc, slow, speed: sp, maxMove, moveLeft: Math.max(0, maxMove - t.move), objLeft: !t.objUsed && t.phase === 'turn' && !inc };
}
function attacksPerAction(ch) { return anyFx(ch, 'oneOf') ? 1 : K(ch).extraAttacks; }

/* Verfügbarkeit eines Zaubers in diesem Zug */
function spellBlock(ch, si, cost) {
  if (anyFx(ch, 'noSpells')) return T('Kein Zaubern im Kampfrausch', 'No spellcasting while raging');
  const t = ch.turn; const tm = cost === 'bonus' ? 'B' : cost === 'reaction' ? 'R' : 'A';
  if (t.phase === 'turn') {
    const bonusCast = t.spells.some(x => x.time === 'B');
    const other = t.spells.some(x => !(x.time === 'A' && x.lvl === 0));
    if (tm === 'B' && other) return T('Nach einem anderen Zauber (außer Zaubertrick als Aktion) kein Bonusaktions-Zauber', 'No bonus-action spell after another spell (except an action cantrip)');
    if (bonusCast && !(tm === 'A' && si.lvl === 0)) return T('Nach einem Bonusaktions-Zauber nur noch Zaubertricks mit 1 Aktion', 'After a bonus-action spell only 1-action cantrips');
  }
  if (si.lvl > 0 && !slotChoices(ch, si.lvl).length) return T('Keine passenden Zauberplätze übrig', 'No suitable spell slots left');
  if (si.time === 'M') return T('Wirkzeit länger als 1 Aktion', 'Casting time longer than 1 action');
  return null;
}

/* ---------- Effekte ---------- */
function addEffect(ch, id, o) {
  o = o || {}; const def = o.custom || D.EFF[id]; if (!def) return;
  const e = { uid: I.uid(), id, rounds: o.rounds !== undefined ? o.rounds : (def.dur || null), dc: o.dc || null, note: o.note || '', src: o.src || null, conc: o.conc || false, smite: o.smite || null };
  if (o.custom) e.custom = o.custom;
  ch.effects.push(e); return e;
}
function removeEffect(ch, uid, why) {
  const i = ch.effects.findIndex(e => e.uid === uid); if (i < 0) return; const e = ch.effects[i]; ch.effects.splice(i, 1);
  const def = effDef(e);
  if (def.onEnd) addEffect(ch, def.onEnd);
  if (why !== false) logL(ch, [def.de + ' endet' + (why ? ' (' + why + ')' : ''), def.en + ' ends' + (why ? ' (' + why + ')' : '')]);
}
function endConcentration(ch, why) {
  if (!ch.concentration) return; const c = ch.concentration; ch.concentration = null;
  ch.effects.filter(e => e.conc).slice().forEach(e => removeEffect(ch, e.uid, false));
  ch.effects = ch.effects.filter(e => e.id !== 'concentrating');
  logL(ch, ['Konzentration auf ' + c.name + ' endet' + (why ? ' (' + why + ')' : ''), 'Concentration on ' + c.name + ' ends' + (why ? ' (' + why + ')' : '')]);
}
function startConcentration(ch, name, rounds) {
  if (ch.concentration) endConcentration(ch, T('neuer Zauber', 'new spell'));
  ch.concentration = { name, rounds: rounds || 10 };
  addEffect(ch, 'concentrating', { rounds: rounds || 10, note: name, conc: true });
}

/* ---------- Protokoll ---------- */
function logL(ch, pair, html) { ch.log.unshift({ r: ch.round, de: pair[0], en: pair[1], h: !!html, t: Date.now() }); if (ch.log.length > 250) ch.log.length = 250; }
function toast(msg) { S.toast = msg; clearTimeout(S._tt); S._tt = setTimeout(() => { S.toast = null; const el = document.querySelector('.toast'); if (el) el.remove(); }, 2600); }

W.CM = { D, R, I, S, T, L, esc, fmt, LS, load, save, cur, snap, undo, K, effDef, hasEff, fxList, anyFx, incap, speedNow, acNow, castMod, spellDC, spellAtk, allRes, resById, resLeft, useRes, spellInfo, slotChoices, spellDamage, newTurn, econ, attacksPerAction, spellBlock, addEffect, removeEffect, endConcentration, startConcentration, logL, toast, tier, upgrade };
})(window);
