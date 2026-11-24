/* Regel-Engine: Würfel, Zuordnung (Klassen/Zauber/Waffen), Klassenressourcen, Optionen. */
(function (W) {
'use strict';
const D = W.CM_DATA;

/* ---------- Würfel ---------- */
function rnd(n) { const a = new Uint32Array(1); (W.crypto || crypto).getRandomValues(a); return (a[0] % n) + 1; }
// "2d6+1d4-1", "-1d4", "3", "1d8V+3" → Terme
function parseDice(expr) {
  const s = String(expr || '').toLowerCase().replace(/w/g, 'd').replace(/\s+/g, '').replace(/[^0-9d+\-]/g, '');
  const terms = []; let flat = 0; const re = /([+-]?)(\d*)d(\d+)|([+-]?)(\d+)/g; let m;
  while ((m = re.exec(s))) {
    if (m[3]) terms.push({ n: m[2] === '' ? 1 : +m[2], d: +m[3], sign: m[1] === '-' ? -1 : 1 });
    else if (m[5]) flat += (m[4] === '-' ? -1 : 1) * +m[5];
  }
  return { terms, flat };
}
function diceStr(p) {
  let s = p.terms.map((t, i) => (t.sign < 0 ? '−' : (i ? '+' : '')) + t.n + 'W' + t.d).join('');
  if (p.flat) s += (p.flat < 0 ? '−' : (s ? '+' : '')) + Math.abs(p.flat);
  return s || '0';
}
function addDice(a, b) { return { terms: a.terms.concat(b.terms), flat: a.flat + b.flat }; }
function scaleDice(p, k) { return { terms: p.terms.map(t => ({ ...t, n: t.n * k })), flat: p.flat * k }; }
function rollDice(p, crit) {
  const parts = []; let total = p.flat;
  for (const t of p.terms) {
    const n = t.n * (crit ? 2 : 1); const vals = [];
    for (let i = 0; i < n; i++) vals.push(rnd(t.d));
    const sum = vals.reduce((a, b) => a + b, 0) * t.sign; total += sum;
    parts.push({ d: t.d, sign: t.sign, vals });
  }
  return { total, parts };
}
function rollD20(mode) {
  const a = rnd(20), b = rnd(20);
  if (mode === 'adv') return { dice: [a, b], nat: Math.max(a, b), mode };
  if (mode === 'dis') return { dice: [a, b], nat: Math.min(a, b), mode };
  return { dice: [a], nat: a, mode: 'normal' };
}
const mod = s => Math.floor((s - 10) / 2);
const fmt = n => (n >= 0 ? '+' : '−') + Math.abs(n);
function num(v, dflt) { if (v === undefined || v === null) return dflt; const m = String(v).replace(',', '.').match(/[+-−]?\s*\d+/); if (!m) return dflt; return parseInt(m[0].replace('−', '-').replace(/\s/g, ''), 10); }

/* ---------- Text-Zuordnung ---------- */
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
function lev(a, b) {
  if (a === b) return 0; const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = new Array(n + 1), cur = new Array(n + 1); for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) { cur[0] = i; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); [prev, cur] = [cur, prev]; }
  return prev[n];
}

/* Zauberdatenbank */
const SPELLS = W.CM_SPELLS_RAW.trim().split('\n').map(l => {
  const c = l.split('|').map(x => x.trim());
  const ex = {}; (c[9] || '').split(',').map(x => x.trim()).filter(Boolean).forEach(x => { const [k, v] = x.split('='); ex[k] = v === undefined ? true : v; });
  const mode = c[5] || '';
  return { key: norm(c[0]).replace(/ /g, '_'), en: c[0], de: c[1], lvl: +c[2], time: c[3], conc: c[4].includes('C'), ritual: c[4].includes('R'), half: c[4].includes('H'),
    mode: mode.startsWith('save') ? 'save' : mode, save: mode.startsWith('save') ? mode.split(':')[1] : null, dmg: c[6] || '', type: c[7] || '', up: c[8] || '', ex };
});
const AOE = ['acid_splash', 'create_bonfire', 'sword_burst', 'word_of_radiance', 'thunderclap', 'arms_of_hadar', 'burning_hands', 'thunderwave', 'cloud_of_daggers', 'dragon_s_breath', 'shatter', 'spike_growth', 'call_lightning', 'fireball', 'hunger_of_hadar', 'lightning_bolt', 'spirit_guardians', 'ice_storm', 'wall_of_fire', 'cloudkill', 'cone_of_cold', 'destructive_wave', 'flame_strike', 'insect_plague', 'synaptic_static', 'chain_lightning', 'circle_of_death', 'sunbeam', 'delayed_blast_fireball', 'fire_storm', 'prismatic_spray', 'incendiary_cloud', 'sunburst', 'meteor_swarm', 'moonbeam', 'blight_x', 'aura_of_vitality_x', 'guardian_of_faith', 'hypnotic_pattern', 'fear', 'slow', 'web', 'entangle', 'faerie_fire', 'bane', 'stinking_cloud', 'confusion', 'mass_suggestion', 'earthquake', 'tasha_s_hideous_laughter_x'];
AOE.forEach(k => { const s = SPELLS.find(x => x.key === k); if (s) s.ex.aoe = true; });
const SPELL = Object.fromEntries(SPELLS.map(s => [s.key, s]));
const ALIAS = Object.entries(W.CM_SPELL_ALIAS || {}).filter(([, k]) => SPELL[k]).map(([n, k]) => [norm(n), SPELL[k]]);
function matchSpell(text) {
  let t = String(text || '').replace(/\(.*?\)/g, ' ').replace(/\bS\.?\s*\d+\b/gi, ' ').split(/[+:;,\/\[]|\s-\s/)[0];
  const n = norm(t).replace(/\b\d+\b/g, '').trim(); if (!n) return null;
  const words = n.split(' ');
  const full = norm(String(text || '').replace(/\(.*?\)/g, ' '));
  for (const [an, sp] of ALIAS) if (full === an || full.startsWith(an + ' ')) return sp;
  let best = null, bestScore = 1;
  for (const s of SPELLS) {
    for (const nm of [s.en, s.de]) {
      const sn = norm(nm); const k = sn.split(' ').length;
      const cand = words.slice(0, k).join(' ');
      const d = lev(cand, sn) / Math.max(sn.length, 1);
      const score = n === sn ? 0 : d;
      if (score < bestScore) { bestScore = score; best = s; }
    }
  }
  return bestScore <= 0.26 ? best : null;
}
function matchWeapon(name, dmg) {
  const n = norm(name); if (!n) return null;
  const toks = n.split(' ').filter(x => x.length >= 1);
  const pd = parseDice(dmg); const die = pd.terms[0] ? pd.terms[0].n + 'd' + pd.terms[0].d : null;
  const alt = (String(dmg).match(/\/\s*(\d+d\d+)/i) || [])[1];
  let best = null, bestScore = 0;
  for (const w of D.WEAPONS) {
    for (const nm of [w.en, w.de]) {
      const wn = norm(nm), wt = wn.split(' '), compact = wn.replace(/ /g, '');
      let sc = 0;
      if (n === wn) sc = 100;
      else for (const t of toks) {
        if (t.length >= 3 && compact.includes(t)) sc += t.length * 2;
        else if (wt.some(x => x.startsWith(t))) sc += Math.min(t.length, 3) + 1;
        else if (t.length >= 4 && wt.some(x => lev(x.slice(0, t.length), t) <= 1)) sc += t.length;
      }
      if (sc <= 0) continue;
      if (die && w.dmg === die) sc += 3;
      if (alt && w.versatile === alt) sc += 3;
      sc -= Math.abs(compact.length - n.replace(/ /g, '').length) * 0.05;
      if (sc > bestScore) { bestScore = sc; best = w; }
    }
  }
  return bestScore >= 3 ? best : null;
}
function parseClasses(str, hdTotal) {
  const s = norm(str).replace(/(\d+)(st|nd|rd|th|\.)?/g, ' $1 ');
  const toks = s.split(' ').filter(Boolean); const out = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]; if (/^\d+$/.test(t)) continue;
    let key = null;
    for (const [k, c] of Object.entries(D.CLASSES)) if (c.alias.some(a => t === norm(a) || (t.length >= 3 && norm(a).startsWith(t)) || (t.length >= 5 && t.startsWith(norm(a))))) { key = k; break; }
    if (!key) continue;
    let lvl = null; for (let j = i + 1; j < Math.min(toks.length, i + 3); j++) if (/^\d+$/.test(toks[j])) { lvl = +toks[j]; break; }
    if (lvl === null && i > 0 && /^\d+$/.test(toks[i - 1])) lvl = +toks[i - 1];
    out.push({ key, lvl: lvl || 1 });
  }
  // Trefferwürfel als Plausibilitätsprüfung (z. B. "Warlock 1st" + "4 d8")
  const hd = parseHD(hdTotal);
  const hdSum = hd.reduce((a, p) => a + p.total, 0);
  if (out.length === 1 && hdSum > out[0].lvl) out[0].lvlHint = hdSum;
  return out;
}
function parseHD(str) {
  const s = String(str || '').toLowerCase().replace(/w/g, 'd'); const out = []; const re = /(\d+)\s*[x×]?\s*d\s*(\d+)/g; let m;
  while ((m = re.exec(s))) { const die = +m[2]; const ex = out.find(p => p.die === die); if (ex) ex.total += +m[1]; else out.push({ die, total: +m[1], used: 0 }); }
  return out;
}
function parseRace(str) {
  const n = norm(str).replace(/-/g, ' ');
  for (const [k, r] of Object.entries(D.RACES)) if (r.alias.some(a => n.includes(norm(a)))) return k;
  return null;
}

/* ---------- Klassen-Kit ---------- */
const clsLvl = (ch, k) => (ch.classes.find(c => c.key === k) || {}).lvl || 0;
const totalLvl = ch => ch.classes.reduce((a, c) => a + (c.lvl || 0), 0) || 1;
const amod = (ch, a) => (ch.abil[a] ? ch.abil[a].mod : 0);

function computeSlots(ch) {
  let cl = 0, casterClasses = 0;
  for (const c of ch.classes) { const C = D.CLASSES[c.key]; if (!C) continue; if (C.caster === 1) { cl += c.lvl; casterClasses++; } else if (C.caster === .5) { cl += casterClasses || ch.classes.length > 1 ? Math.floor(c.lvl / 2) : Math.ceil(c.lvl / 2) * (c.lvl >= 2 ? 1 : 0); casterClasses++; } }
  // Einzelklasse Halbzauberer: Paladin/Waldläufer Stufe n ≙ Zauberstufe ceil(n/2) ab Stufe 2
  if (ch.classes.length === 1) { const c = ch.classes[0], C = D.CLASSES[c.key]; if (C && C.caster === .5) cl = c.lvl >= 2 ? Math.ceil(c.lvl / 2) : 0; }
  const row = D.SLOT_TABLE[Math.min(20, cl)] || [];
  return Array.from({ length: 9 }, (_, i) => row[i] || 0);
}

function kit(ch) {
  const r = { resources: [], options: [], passives: [], extraAttacks: 1, brutal: 0, sneak: 0, rageDmg: 0, crit: 20, martial: null, savageAttacks: false, lucky: false };
  const L = k => clsLvl(ch, k);
  const res = (id, de, en, max, rech, extra) => r.resources.push(Object.assign({ id, name: [de, en], max, recharge: rech }, extra || {}));
  const opt = (o) => r.options.push(Object.assign({ kind: 'feature' }, o));
  const pas = (de, en) => r.passives.push([de, en]);
  const feat = norm((ch.text && ch.text.features) || '') + ' ' + norm((ch.text && ch.text.attacks) || '');
  const has = (...keys) => keys.some(k => feat.includes(norm(k)));
  const PB = ch.prof || 2;

  let lv;
  if ((lv = L('barbarian'))) {
    const uses = lv >= 20 ? 99 : lv >= 17 ? 6 : lv >= 12 ? 5 : lv >= 6 ? 4 : lv >= 3 ? 3 : 2;
    res('rage', 'Kampfrausch', 'Rage', uses, 'LR');
    r.rageDmg = lv >= 16 ? 4 : lv >= 9 ? 3 : 2;
    opt({ id: 'rage', name: ['Kampfrausch beginnen', 'Enter Rage'], cost: 'bonus', res: 'rage', apply: 'rage', hideIf: 'rage', desc: ['Vorteil auf ST-Proben/-Rettungswürfe, +' + r.rageDmg + ' Schaden bei ST-Nahkampf, Resistenz gegen Wucht/Stich/Hieb. 1 Minute.', 'Advantage on STR checks/saves, +' + r.rageDmg + ' damage on STR melee, resistance to B/P/S. 1 minute.'] });
    opt({ id: 'endRage', name: ['Kampfrausch beenden', 'End Rage'], cost: 'bonus', removes: 'rage', showIf: 'rage', desc: ['Beendet den Kampfrausch.', 'Ends your rage.'] });
    if (lv >= 2) opt({ id: 'reckless', name: ['Tollkühner Angriff', 'Reckless Attack'], cost: 'free', apply: 'reckless', hideIf: 'reckless', firstAttack: true, desc: ['Vor deinem ersten Angriff im Zug: Vorteil bei ST-Nahkampfangriffen, Angriffe gegen dich mit Vorteil.', 'Before your first attack this turn: advantage on STR melee attacks, attacks against you have advantage.'] });
    if (lv >= 2) pas('Gefahrensinn: Vorteil bei GE-Rettungswürfen gegen sichtbare Effekte.', 'Danger Sense: advantage on DEX saves against effects you can see.');
    if (lv >= 7) pas('Wilder Instinkt: Vorteil bei Initiative.', 'Feral Instinct: advantage on initiative.');
    if (lv >= 9) r.brutal = lv >= 17 ? 3 : lv >= 13 ? 2 : 1;
    if (lv >= 11) pas('Unbändige Wut: Fällst du im Kampfrausch auf 0 TP, KO-Rettungswurf SG 10 (+5 je Nutzung) → 1 TP.', 'Relentless Rage: dropping to 0 HP while raging, CON save DC 10 (+5 each use) → 1 HP.');
    if (lv >= 5) r.extraAttacks = Math.max(r.extraAttacks, 2);
  }
  if ((lv = L('bard'))) {
    const die = lv >= 15 ? 12 : lv >= 10 ? 10 : lv >= 5 ? 8 : 6;
    res('bardic', 'Bardische Inspiration', 'Bardic Inspiration', Math.max(1, amod(ch, 'CHA')), lv >= 5 ? 'SR' : 'LR', { die: 'd' + die });
    opt({ id: 'bardicGive', name: ['Bardische Inspiration geben', 'Give Bardic Inspiration'], cost: 'bonus', res: 'bardic', desc: ['Eine Kreatur in 18 m erhält einen W' + die + '.', 'A creature within 60 ft gains a d' + die + '.'], roll: { dice: '1d' + die, label: ['Inspirationswürfel', 'Inspiration die'] } });
    if (has('cutting words', 'schneidende worte')) opt({ id: 'cutting', trigger: ['Wenn eine Kreatur in 18 m angreift, eine Attributsprobe macht oder Schaden würfelt', 'When a creature within 60 ft makes an attack, an ability check or a damage roll'], name: ['Schneidende Worte', 'Cutting Words'], cost: 'reaction', res: 'bardic', desc: ['Ziehe W' + die + ' vom Angriff/Schaden/der Probe eines Gegners ab.', 'Subtract a d' + die + ' from an enemy\'s attack, damage or check.'], roll: { dice: '1d' + die, label: ['Abzug', 'Penalty'] } });
    if (lv >= 2) pas('Lied der Erholung: +1W' + (lv >= 17 ? 12 : lv >= 13 ? 10 : lv >= 9 ? 8 : 6) + ' TP bei kurzer Rast, wenn Trefferwürfel genutzt werden.', 'Song of Rest: +1d' + (lv >= 17 ? 12 : lv >= 13 ? 10 : lv >= 9 ? 8 : 6) + ' HP on a short rest when hit dice are spent.');
    if (lv >= 2) pas('Hansdampf: +' + Math.floor(PB / 2) + ' auf Proben ohne Übung.', 'Jack of All Trades: +' + Math.floor(PB / 2) + ' to checks you\'re not proficient in.');
  }
  if ((lv = L('cleric'))) {
    if (lv >= 2) {
      res('channel', 'Göttliche Macht fokussieren', 'Channel Divinity', lv >= 18 ? 3 : lv >= 6 ? 2 : 1, 'SR');
      const cdTag = ['Göttliche Macht fokussieren', 'Channel Divinity'];
      opt({ id: 'turnUndead', name: ['Untote vertreiben', 'Turn Undead'], group: cdTag, cost: 'action', res: 'channel', desc: ['Göttliche Macht fokussieren: Untote in 9 m machen einen WE-Rettungswurf gegen deinen Zauber-SG oder sind 1 Minute vertrieben.' + (lv >= 5 ? ' Zerstört Untote bis HG ' + (lv >= 17 ? 4 : lv >= 14 ? 3 : lv >= 11 ? 2 : lv >= 8 ? 1 : '1/2') + '.' : ''), 'Channel Divinity: undead within 30 ft make a WIS save vs your spell DC or are turned for 1 minute.' + (lv >= 5 ? ' Destroys undead up to CR ' + (lv >= 17 ? 4 : lv >= 14 ? 3 : lv >= 11 ? 2 : lv >= 8 ? 1 : '1/2') + '.' : '')], showDC: true });
      const dom = has('domane des lebens', 'domäne des lebens', 'life domain', 'lebensdomane', 'lebensdomäne') ? 'life' : has('domane des lichts', 'domäne des lichts', 'light domain', 'lichtdomane', 'lichtdomäne') ? 'light' : has('domane des sturms', 'domäne des sturms', 'sturmdomane', 'sturmdomäne', 'tempest domain', 'domane des unwetters', 'domäne des unwetters') ? 'tempest' : has('domane des krieges', 'domäne des krieges', 'kriegsdomane', 'kriegsdomäne', 'war domain') ? 'war' : has('domane des wissens', 'domäne des wissens', 'wissensdomane', 'wissensdomäne', 'knowledge domain') ? 'knowledge' : has('domane der natur', 'domäne der natur', 'naturdomane', 'naturdomäne', 'nature domain') ? 'nature' : has('domane der list', 'domäne der list', 'listdomane', 'listdomäne', 'trickery domain', 'domane der tauschung', 'domäne der täuschung') ? 'trickery' : null;
      const CD = {
        life: () => opt({ id: 'cdLife', name: ['Leben bewahren', 'Preserve Life'], group: cdTag, cost: 'action', res: 'channel', desc: ['Verteile ' + (5 * lv) + ' TP Heilung auf Kreaturen in 9 m (je höchstens bis zur Hälfte ihres TP-Maximums).', 'Distribute ' + (5 * lv) + ' HP of healing among creatures within 30 ft (each up to half its HP maximum).'] }),
        light: () => opt({ id: 'cdLight', name: ['Strahlen der Morgenröte', 'Radiance of the Dawn'], group: cdTag, cost: 'action', res: 'channel', desc: ['Magische Dunkelheit in 9 m endet; Feinde in 9 m: KO-Rettungswurf, 2W10+' + lv + ' gleißend (halb bei Erfolg).', 'Magical darkness within 30 ft ends; hostile creatures within 30 ft: CON save, 2d10+' + lv + ' radiant (half on success).'], roll: { dice: '2d10+' + lv, label: ['Schaden', 'Damage'], save: { abil: 'CON', dc: 8 + PB + amod(ch, 'WIS'), half: true, aoe: true } } }),
        tempest: () => opt({ id: 'cdTempest', name: ['Zerstörerischer Zorn', 'Destructive Wrath'], group: cdTag, cost: 'free', res: 'channel', desc: ['Beim Würfeln von Blitz- oder Schallschaden: Maximalschaden statt Würfeln.', 'When you roll lightning or thunder damage: deal maximum damage instead.'] }),
        war: () => opt({ id: 'cdWar', name: ['Gelenkter Schlag', 'Guided Strike'], group: cdTag, cost: 'free', res: 'channel', applyCustom: { id: 'guidedStrike', de: 'Gelenkter Schlag', en: 'Guided Strike', pos: 1, desc: ['+10 auf den nächsten Angriffswurf.', '+10 to your next attack roll.'], fx: { atkDice: '+10', once: 'attack' } }, applyRounds: 1, desc: ['+10 auf deinen nächsten Angriffswurf (nach dem Wurf, vor dem Ergebnis).', '+10 to your next attack roll (after rolling, before the result).'] }),
        knowledge: () => opt({ id: 'cdKnow', name: ['Wissen der Zeitalter', 'Knowledge of the Ages'], group: cdTag, cost: 'action', res: 'channel', desc: ['10 Minuten Übung in einer Fertigkeit oder einem Werkzeug.', 'Proficiency with one skill or tool for 10 minutes.'] }),
        nature: () => opt({ id: 'cdNature', name: ['Tiere und Pflanzen bezaubern', 'Charm Animals and Plants'], group: cdTag, cost: 'action', res: 'channel', showDC: true, desc: ['Tiere und Pflanzenwesen in 9 m: WE-Rettungswurf oder 1 Minute bezaubert.', 'Beasts and plant creatures within 30 ft: WIS save or charmed for 1 minute.'] }),
        trickery: () => opt({ id: 'cdTrick', name: ['Duplikat erschaffen', 'Invoke Duplicity'], group: cdTag, cost: 'action', res: 'channel', conc: true, desc: ['Illusionäres Duplikat für 1 Minute (Konzentration); Vorteil auf Angriffe, wenn ihr beide in 1,5 m des Ziels seid.', 'Illusory duplicate for 1 minute (concentration); advantage on attacks when both of you are within 5 ft of the target.'] })
      };
      if (dom && CD[dom]) CD[dom]();
      else opt({ id: 'cdDomain', name: ['Domänen-Option', 'Domain option'], group: cdTag, cost: 'action', res: 'channel', desc: ['Göttliche Macht fokussieren: Option deiner Domäne (Domäne im Bogen nicht erkannt).', 'Channel Divinity: your domain\'s option (domain not recognized on the sheet).'] });
    }
    if (lv >= 10) { res('intervention', 'Göttliches Eingreifen', 'Divine Intervention', 1, 'LR'); opt({ id: 'intervention', name: ['Göttliches Eingreifen', 'Divine Intervention'], cost: 'action', res: 'intervention', desc: ['W100 ≤ Klerikerstufe (' + lv + ') → Erfolg.' + (lv >= 20 ? ' Gelingt automatisch.' : ''), 'd100 ≤ cleric level (' + lv + ') → success.' + (lv >= 20 ? ' Automatically succeeds.' : '')], roll: { dice: '1d100', label: ['W100', 'd100'] } }); }
  }
  if ((lv = L('druid'))) {
    if (lv >= 2) {
      const moon = has('circle of the moon', 'zirkel des mondes', 'mondzirkel', 'combat wild shape');
      res('wildShape', 'Tiergestalt', 'Wild Shape', lv >= 20 ? 99 : 2, 'SR');
      opt({ id: 'wildShape', name: ['Tiergestalt', 'Wild Shape'], cost: moon ? 'bonus' : 'action', res: 'wildShape', desc: ['Verwandle dich in ein Tier (max. HG ' + (moon ? Math.max(1, Math.floor(lv / 3)) : lv >= 8 ? 1 : lv >= 4 ? '1/2' : '1/4') + '), ' + Math.floor(lv / 2) + ' Stunden.', 'Transform into a beast (max CR ' + (moon ? Math.max(1, Math.floor(lv / 3)) : lv >= 8 ? 1 : lv >= 4 ? '1/2' : '1/4') + '), ' + Math.floor(lv / 2) + ' hours.'] });
    }
  }
  if ((lv = L('fighter'))) {
    res('secondWind', 'Durchschnaufen', 'Second Wind', 1, 'SR');
    opt({ id: 'secondWind', name: ['Durchschnaufen', 'Second Wind'], cost: 'bonus', res: 'secondWind', desc: ['Heile 1W10 + ' + lv + ' TP.', 'Regain 1d10 + ' + lv + ' HP.'], roll: { dice: '1d10+' + lv, heal: true, label: ['Heilung', 'Healing'] } });
    if (lv >= 2) { res('actionSurge', 'Tatendrang', 'Action Surge', lv >= 17 ? 2 : 1, 'SR'); opt({ id: 'actionSurge', name: ['Tatendrang', 'Action Surge'], cost: 'free', res: 'actionSurge', grant: 'action', oncePerTurn: true, desc: ['Eine zusätzliche Aktion in diesem Zug – gesperrte Aktionsoptionen werden wieder freigegeben.', 'One additional action this turn – locked action options become available again.'] }); }
    if (lv >= 9) { res('indomitable', 'Unbeugsam', 'Indomitable', lv >= 17 ? 3 : lv >= 13 ? 2 : 1, 'LR'); pas('Unbeugsam: Misslungenen Rettungswurf wiederholen (Knopf im Wurf-Ergebnis).', 'Indomitable: reroll a failed saving throw (button in the roll result).'); }
    r.extraAttacks = Math.max(r.extraAttacks, lv >= 20 ? 4 : lv >= 11 ? 3 : lv >= 5 ? 2 : 1);
    if (has('improved critical', 'verbesserter kritischer', 'champion')) r.crit = Math.min(r.crit, 19);
    if (lv >= 15 && has('superior critical', 'überlegener kritischer', 'ueberlegener kritischer')) r.crit = 18;
  }
  if ((lv = L('monk'))) {
    const md = lv >= 17 ? 10 : lv >= 11 ? 8 : lv >= 5 ? 6 : 4; r.martial = md;
    if (lv >= 2) {
      res('ki', 'Ki-Punkte', 'Ki Points', lv, 'SR');
      opt({ id: 'flurry', name: ['Schlaghagel', 'Flurry of Blows'], cost: 'bonus', res: 'ki', needsAttackAction: true, grantAttacks: 2, desc: ['Nach der Angriffsaktion: zwei waffenlose Angriffe als Bonusaktion.', 'After the Attack action: two unarmed strikes as a bonus action.'] });
      opt({ id: 'patient', name: ['Geduldige Verteidigung', 'Patient Defense'], cost: 'bonus', res: 'ki', apply: 'dodge', desc: ['Ausweichen als Bonusaktion.', 'Dodge as a bonus action.'] });
      opt({ id: 'stepWind', name: ['Schritt des Windes', 'Step of the Wind'], cost: 'bonus', res: 'ki', desc: ['Spurt oder Rückzug als Bonusaktion, doppelte Sprungweite.', 'Dash or Disengage as a bonus action, jump distance doubled.'], dash: true });
    }
    opt({ id: 'martialBonus', name: ['Waffenloser Schlag (Kampfkunst)', 'Unarmed Strike (Martial Arts)'], cost: 'bonus', needsAttackAction: true, grantAttacks: 1, desc: ['Nach der Angriffsaktion mit Mönchswaffe/waffenlos: ein waffenloser Schlag als Bonusaktion.', 'After the Attack action with a monk weapon/unarmed: one unarmed strike as a bonus action.'] });
    if (lv >= 3) opt({ id: 'deflect', trigger: ['Wenn dich ein Fernkampf-Waffenangriff trifft', 'When a ranged weapon attack hits you'], name: ['Geschosse abwehren', 'Deflect Missiles'], cost: 'reaction', desc: ['Reduziere Fernkampfschaden um 1W10 + ' + amod(ch, 'DEX') + ' + ' + lv + '.', 'Reduce ranged damage by 1d10 + ' + amod(ch, 'DEX') + ' + ' + lv + '.'], roll: { dice: '1d10+' + (amod(ch, 'DEX') + lv), label: ['Reduktion', 'Reduction'] } });
    if (lv >= 4) opt({ id: 'slowFall', trigger: ['Wenn du fällst', 'When you fall'], name: ['Langsamer Fall', 'Slow Fall'], cost: 'reaction', desc: ['Fallschaden um ' + (5 * lv) + ' reduzieren.', 'Reduce falling damage by ' + (5 * lv) + '.'] });
    if (lv >= 5) { r.extraAttacks = Math.max(r.extraAttacks, 2); opt({ id: 'stunning', name: ['Betäubender Schlag', 'Stunning Strike'], cost: 'onhit', res: 'ki', desc: ['Bei einem Nahkampftreffer: Ziel KO-Rettungswurf SG ' + (8 + PB + amod(ch, 'WIS')) + ' oder betäubt bis Ende deines nächsten Zuges.', 'On a melee hit: target CON save DC ' + (8 + PB + amod(ch, 'WIS')) + ' or stunned until the end of your next turn.'] }); }
    if (lv >= 7) pas('Entrinnen: GE-Rettungswürfe für halben Schaden → kein Schaden bei Erfolg, halber bei Misserfolg.', 'Evasion: DEX saves for half damage → none on success, half on failure.');
  }
  if ((lv = L('paladin'))) {
    res('divineSense', 'Göttliches Gespür', 'Divine Sense', 1 + Math.max(0, amod(ch, 'CHA')), 'LR');
    opt({ id: 'divineSense', name: ['Göttliches Gespür', 'Divine Sense'], cost: 'action', res: 'divineSense', desc: ['Spüre Celestische, Unholde und Untote im Umkreis von 18 m.', 'Sense celestials, fiends and undead within 60 ft.'] });
    res('layOnHands', 'Handauflegen (Punkte)', 'Lay on Hands (pool)', 5 * lv, 'LR', { pool: true });
    opt({ id: 'layOnHands', name: ['Handauflegen', 'Lay on Hands'], cost: 'action', res: 'layOnHands', pool: true, desc: ['Heile beliebig viele Punkte aus dem Vorrat (oder 5 Punkte: Krankheit/Gift heilen).', 'Heal any number of points from the pool (or 5 points: cure disease/poison).'] });
    if (lv >= 2) r.divineSmite = true;
    if (lv >= 3) {
      res('channelP', 'Göttliche Macht fokussieren', 'Channel Divinity', 1, 'SR');
      const cdTag = ['Göttliche Macht fokussieren', 'Channel Divinity'];
      const cha = Math.max(1, amod(ch, 'CHA'));
      const oath = has('schwur der rache', 'eid der rache', 'oath of vengeance', 'vengeance') ? 'vengeance' : has('schwur der hingabe', 'eid der hingabe', 'oath of devotion', 'devotion') ? 'devotion' : has('schwur der alten', 'eid der alten', 'oath of the ancients', 'ancients') ? 'ancients' : null;
      const OPT = {
        devotion: [
          { id: 'cdSacred', name: ['Geweihte Waffe', 'Sacred Weapon'], cost: 'action', applyCustom: { id: 'sacredWeapon', de: 'Geweihte Waffe', en: 'Sacred Weapon', pos: 1, desc: ['+' + cha + ' auf Angriffswürfe mit der Waffe, Waffe leuchtet (1 Minute).', '+' + cha + ' to attack rolls with the weapon, the weapon sheds light (1 minute).'], fx: { atkDice: '+' + cha } }, applyRounds: 10, desc: ['1 Minute: +' + cha + ' (CH-Mod.) auf Angriffswürfe mit einer Waffe, die Waffe gilt als magisch und leuchtet.', '1 minute: +' + cha + ' (CHA mod) to attack rolls with one weapon; it counts as magical and sheds light.'] },
          { id: 'cdUnholy', name: ['Unheilige vertreiben', 'Turn the Unholy'], cost: 'action', showDC: true, desc: ['Unholde und Untote in 9 m: WE-Rettungswurf oder 1 Minute vertrieben.', 'Fiends and undead within 30 ft: WIS save or turned for 1 minute.'] }],
        ancients: [
          { id: 'cdWrath', name: ['Zorn der Natur', 'Nature\'s Wrath'], cost: 'action', showDC: true, desc: ['Ranken packen eine Kreatur in 3 m: ST- oder GE-Rettungswurf (Wahl des Ziels) oder festgesetzt; Wiederholung am Ende ihrer Züge.', 'Vines grasp a creature within 10 ft: STR or DEX save (its choice) or restrained; it repeats the save at the end of its turns.'] },
          { id: 'cdFaithless', name: ['Treulose vertreiben', 'Turn the Faithless'], cost: 'action', showDC: true, desc: ['Feenwesen und Unholde in 9 m: WE-Rettungswurf oder 1 Minute vertrieben.', 'Fey and fiends within 30 ft: WIS save or turned for 1 minute.'] }],
        vengeance: [
          { id: 'cdAbjure', name: ['Gegner verdammen', 'Abjure Enemy'], cost: 'action', showDC: true, desc: ['Eine Kreatur in 18 m: WE-Rettungswurf (Unholde/Untote mit Nachteil) oder 1 Minute verängstigt mit Bewegungsrate 0; bei Erfolg halbe Bewegungsrate.', 'One creature within 60 ft: WIS save (fiends/undead with disadvantage) or frightened for 1 minute with speed 0; on a success its speed is halved.'] },
          { id: 'cdVow', name: ['Eid der Feindschaft', 'Vow of Enmity'], cost: 'bonus', applyCustom: { id: 'vowEnmity', de: 'Eid der Feindschaft', en: 'Vow of Enmity', pos: 1, desc: ['Vorteil auf Angriffswürfe gegen die gewählte Kreatur (1 Minute).', 'Advantage on attack rolls against the chosen creature (1 minute).'], fx: { atk: 'adv' } }, applyRounds: 10, desc: ['Bonusaktion: 1 Minute Vorteil auf Angriffswürfe gegen eine Kreatur in 3 m.', 'Bonus action: advantage on attack rolls against one creature within 10 ft for 1 minute.'] }]
      };
      const oathName = { devotion: ['Schwur der Hingabe', 'Oath of Devotion'], ancients: ['Schwur der Alten', 'Oath of the Ancients'], vengeance: ['Schwur der Rache', 'Oath of Vengeance'] };
      (oath ? [oath] : Object.keys(OPT)).forEach(k => OPT[k].forEach(o => opt(Object.assign({ res: 'channelP', group: cdTag, oath: oathName[k] }, o, { desc: [cdTag[0] + (oath ? '' : ' (' + oathName[k][0] + ')') + ': ' + o.desc[0], cdTag[1] + (oath ? '' : ' (' + oathName[k][1] + ')') + ': ' + o.desc[1]] }))));
    }
    if (lv >= 5) r.extraAttacks = Math.max(r.extraAttacks, 2);
    if (lv >= 6) pas('Aura des Schutzes: +' + Math.max(1, amod(ch, 'CHA')) + ' auf Rettungswürfe (prüfe, ob im Bogen schon enthalten).', 'Aura of Protection: +' + Math.max(1, amod(ch, 'CHA')) + ' to saving throws (check whether the sheet already includes it).');
    if (lv >= 11) pas('Verbessertes göttliches Niederstrecken: +1W8 gleißend bei jedem Nahkampftreffer.', 'Improved Divine Smite: +1d8 radiant on every melee hit.'), r.improvedSmite = true;
    if (lv >= 14) { res('cleansing', 'Läuternde Berührung', 'Cleansing Touch', Math.max(1, amod(ch, 'CHA')), 'LR'); opt({ id: 'cleansing', name: ['Läuternde Berührung', 'Cleansing Touch'], cost: 'action', res: 'cleansing', desc: ['Beende einen Zauber auf dir oder einer willigen Kreatur.', 'End one spell on yourself or a willing creature.'] }); }
  }
  if ((lv = L('ranger'))) { if (lv >= 5) r.extraAttacks = Math.max(r.extraAttacks, 2); }
  if ((lv = L('rogue'))) {
    r.sneak = Math.ceil(lv / 2);
    if (lv >= 2) opt({ id: 'cunning', name: ['Raffinierte Aktion', 'Cunning Action'], cost: 'bonus', sub: ['dash', 'disengage', 'hide'], desc: ['Spurt, Rückzug oder Verstecken als Bonusaktion.', 'Dash, Disengage or Hide as a bonus action.'] });
    if (lv >= 5) opt({ id: 'uncanny', trigger: ['Wenn dich ein Angreifer trifft, den du sehen kannst', 'When an attacker you can see hits you'], name: ['Unglaubliches Ausweichen', 'Uncanny Dodge'], cost: 'reaction', desc: ['Halbiere den Schaden eines sichtbaren Angreifers.', 'Halve the damage from an attacker you can see.'] });
    if (lv >= 7) pas('Entrinnen: GE-Rettungswürfe für halben Schaden → kein Schaden bei Erfolg, halber bei Misserfolg.', 'Evasion: DEX saves for half damage → none on success, half on failure.');
    if (lv >= 11) pas('Verlässliches Talent: Bei geübten Proben zählt ein W20 unter 10 als 10.', 'Reliable Talent: on proficient checks, treat a d20 below 10 as 10.'), r.reliable = true;
    if (lv >= 20) res('strokeLuck', 'Glückstreffer', 'Stroke of Luck', 1, 'SR');
  }
  if ((lv = L('sorcerer'))) {
    if (lv >= 2) {
      res('sorcery', 'Zaubereipunkte', 'Sorcery Points', lv, 'LR');
      opt({ id: 'fontSlot', name: ['Zauberplatz erschaffen', 'Create Spell Slot'], cost: 'bonus', res: 'sorcery', font: 'toSlot', desc: ['Zaubereipunkte in einen Zauberplatz umwandeln (1.: 2, 2.: 3, 3.: 5, 4.: 6, 5.: 7 Punkte).', 'Convert sorcery points to a spell slot (1st: 2, 2nd: 3, 3rd: 5, 4th: 6, 5th: 7 points).'] });
      opt({ id: 'fontPts', name: ['Zauberplatz in Punkte', 'Slot to Points'], cost: 'bonus', font: 'toPts', desc: ['Einen Zauberplatz in Zaubereipunkte (= Grad) umwandeln.', 'Convert a spell slot into sorcery points (= its level).'] });
    }
    if (lv >= 3) r.metamagic = true;
  }
  if ((lv = L('warlock'))) {
    if (lv >= 11) { [6, 7, 8, 9].forEach((g, i) => { if (lv >= [11, 13, 15, 17][i]) res('arcanum' + g, 'Mystisches Arkanum (' + g + '.)', 'Mystic Arcanum (' + g + 'th)', 1, 'LR'); }); }
  }
  if ((lv = L('wizard'))) { res('arcaneRecovery', 'Arkane Erholung', 'Arcane Recovery', 1, 'LR', { note: Math.ceil(lv / 2) }); }

  // Volk
  const race = ch.raceKey; const TL = totalLvl(ch);
  if (race === 'tiefling') {
    if (TL >= 3) { res('rHellish', 'Höllischer Tadel (Volk)', 'Hellish Rebuke (racial)', 1, 'LR'); opt({ id: 'rHellish', trigger: ['Wenn dir eine Kreatur, die du sehen kannst, Schaden zufügt', 'When a creature you can see damages you'], name: ['Höllischer Tadel (Volk, 2. Grad)', 'Hellish Rebuke (racial, 2nd level)'], cost: 'reaction', res: 'rHellish', spellRef: 'hellish_rebuke', spellLvl: 2, abil: 'CHA', desc: ['Wenn dich eine Kreatur verletzt: GE-Rettungswurf, 3W10 Feuer (halb bei Erfolg).', 'When a creature damages you: DEX save, 3d10 fire (half on success).'] }); }
    if (TL >= 5) { res('rDarkness', 'Dunkelheit (Volk)', 'Darkness (racial)', 1, 'LR'); opt({ id: 'rDarkness', name: ['Dunkelheit (Volk)', 'Darkness (racial)'], cost: 'action', res: 'rDarkness', conc: true, desc: ['Magische Dunkelheit, Radius 4,5 m, Konzentration bis 10 Minuten.', 'Magical darkness, 15-ft radius, concentration up to 10 minutes.'] }); }
    pas('Höllische Resistenz: Resistenz gegen Feuer.', 'Hellish Resistance: resistance to fire.');
  }
  if (race === 'dragonborn') {
    const dd = TL >= 16 ? 5 : TL >= 11 ? 4 : TL >= 6 ? 3 : 2;
    res('rBreath', 'Odemwaffe', 'Breath Weapon', 1, 'SR');
    opt({ id: 'rBreath', name: ['Odemwaffe', 'Breath Weapon'], cost: 'action', res: 'rBreath', desc: [dd + 'W6 Schaden, Rettungswurf (GE oder KO je nach Drachenart) SG ' + (8 + amod(ch, 'CON') + PB) + ', halb bei Erfolg.', dd + 'd6 damage, save (DEX or CON by ancestry) DC ' + (8 + amod(ch, 'CON') + PB) + ', half on success.'], roll: { dice: dd + 'd6', label: ['Schaden', 'Damage'], save: { abil: 'DEX', dc: 8 + amod(ch, 'CON') + PB, half: true, choose: true, aoe: true } } });
  }
  if (race === 'halforc') { res('rRelentless', 'Unerbittlichkeit', 'Relentless Endurance', 1, 'LR'); r.savageAttacks = true; pas('Wilde Angriffe: Bei kritischem Nahkampftreffer ein zusätzlicher Waffenschadenswürfel.', 'Savage Attacks: one extra weapon damage die on a melee crit.'); }
  if (race === 'halfling') { r.lucky = true; pas('Glück: Eine natürliche 1 bei Angriff, Probe oder Rettungswurf darf neu gewürfelt werden. Tapfer: Vorteil gegen Verängstigt.', 'Lucky: reroll a natural 1 on an attack, check or save. Brave: advantage against being frightened.'); }
  if (race === 'dwarf') pas('Zwergische Unverwüstlichkeit: Vorteil bei Rettungswürfen gegen Gift, Resistenz gegen Gift.', 'Dwarven Resilience: advantage on saves against poison, resistance to poison.');
  if (race === 'elf' || race === 'halfelf') pas('Feenblut: Vorteil bei Rettungswürfen gegen Bezauberung, kein magischer Schlaf.', 'Fey Ancestry: advantage on saves against being charmed, magic can\'t put you to sleep.');
  if (race === 'gnome') pas('Gnomische List: Vorteil bei IN-, WE- und CH-Rettungswürfen gegen Magie.', 'Gnome Cunning: advantage on INT, WIS and CHA saves against magic.');
  return r;
}

W.CM_RULES = { rnd, parseDice, diceStr, addDice, scaleDice, rollDice, rollD20, mod, fmt, num, norm, lev, SPELLS, SPELL, matchSpell, matchWeapon, parseClasses, parseHD, parseRace, computeSlots, kit, totalLvl, clsLvl, amod };
})(window);
