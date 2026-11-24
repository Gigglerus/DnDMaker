/* Charakterverwaltung – Oberfläche */
(function (W) {
'use strict';
const C = W.CM, { D, R, I, S, T, L, esc, fmt } = C;
const $ = s => document.querySelector(s);
const ABN = a => D.ABIL_N[a][S.lang === 'en' ? 3 : 2];
const ABL = a => D.ABIL_N[a][S.lang === 'en' ? 1 : 0];
const sign = n => (n >= 0 ? '+' : '−') + Math.abs(n);
const dS = s => String(s).replace(/(\d)d(\d)/g, '$1' + T('W', 'd') + '$2');

const D20 = '<svg viewBox="0 0 100 100" class="d20" aria-hidden="true"><defs><linearGradient id="dg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a42d2a"/><stop offset="1" stop-color="#5a1212"/></linearGradient><linearGradient id="dg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8f2321"/><stop offset="1" stop-color="#4a0d0d"/></linearGradient></defs><g stroke="#d4a845" stroke-width="2.2" stroke-linejoin="round"><polygon points="50,3 91,27 91,73 50,97 9,73 9,27" fill="url(#dg2)"/><polygon points="50,3 9,27 24,66" fill="#7a1b1b"/><polygon points="50,3 91,27 76,66" fill="#6a1515"/><polygon points="9,27 9,73 24,66" fill="#5a1111"/><polygon points="91,27 91,73 76,66" fill="#4f0e0e"/><polygon points="24,66 76,66 50,97" fill="#5e1212"/><polygon points="9,73 24,66 50,97" fill="#4a0d0d"/><polygon points="91,73 76,66 50,97" fill="#420b0b"/><polygon points="50,3 76,66 24,66" fill="url(#dg1)"/></g><text x="50" y="57" text-anchor="middle" font-family="EB Kicker, Georgia, serif" font-size="22" font-weight="700" fill="#f0cf6a">20</text></svg>';
const G_ = '#b8902f';
const orn = '<svg class="divider" viewBox="0 0 520 26" aria-hidden="true"><defs><linearGradient id="dvl" x1="0" x2="1"><stop offset="0" stop-color="' + G_ + '" stop-opacity="0"/><stop offset="1" stop-color="' + G_ + '"/></linearGradient><linearGradient id="dvr" x1="1" x2="0"><stop offset="0" stop-color="' + G_ + '" stop-opacity="0"/><stop offset="1" stop-color="' + G_ + '"/></linearGradient></defs><g fill="none" stroke-width="1.7" stroke-linecap="round"><path d="M8 13 H214" stroke="url(#dvl)"/><path d="M306 13 H512" stroke="url(#dvr)"/><path d="M214 13 C224 2 238 2 240 9 C241 14 234 15 233 11" stroke="' + G_ + '"/><path d="M214 13 C224 24 238 24 240 17 C241 12 234 11 233 15" stroke="' + G_ + '"/><path d="M306 13 C296 2 282 2 280 9 C279 14 286 15 287 11" stroke="' + G_ + '"/><path d="M306 13 C296 24 282 24 280 17 C279 12 286 11 287 15" stroke="' + G_ + '"/><path d="M244 13 H250 M270 13 H276" stroke="' + G_ + '"/></g><circle cx="196" cy="13" r="1.8" fill="' + G_ + '"/><circle cx="324" cy="13" r="1.8" fill="' + G_ + '"/><path d="M260 2 L271 13 L260 24 L249 13Z" fill="#7a1d1d" stroke="' + G_ + '" stroke-width="1.5"/><path d="M260 7 L266 13 L260 19 L254 13Z" fill="none" stroke="#d4a845" stroke-width=".8" opacity=".8"/></svg>';
const cornerSvg = cls => '<svg class="corner ' + cls + '" viewBox="0 0 150 150" aria-hidden="true"><g fill="none" stroke="' + G_ + '" stroke-linecap="round"><path d="M6 144 V34 Q6 6 34 6 H144" stroke-width="2.4"/><path d="M15 118 V40 Q15 15 40 15 H118" stroke-width="1.2" opacity=".8"/><path d="M34 6 C52 24 34 44 50 54 C62 61 72 48 64 41 C57 35 49 43 55 48" stroke-width="2"/><path d="M6 34 C24 52 44 34 54 50 C61 62 48 72 41 64 C35 57 43 49 48 55" stroke-width="2"/><path d="M60 22 C74 18 86 24 96 16 M22 60 C18 74 24 86 16 96" stroke-width="1.4"/><path d="M96 16 C100 10 108 10 110 15 M16 96 C10 100 10 108 15 110" stroke-width="1.4"/><path d="M70 10 q6 6 0 12 M10 70 q6 6 12 0" stroke-width="1.1"/></g><path d="M15 8 L22 15 L15 22 L8 15Z" fill="#7a1d1d" stroke="' + G_ + '" stroke-width="1.3"/><circle cx="120" cy="6" r="2.2" fill="' + G_ + '"/><circle cx="6" cy="120" r="2.2" fill="' + G_ + '"/></svg>';
const corners = () => ['tl', 'tr', 'bl', 'br'].map(cornerSvg).join('');

/* ================= Rendering ================= */
function render() {
  const root = $('#app'); const ch = C.cur();
  let h = '';
  if (!ch || S.view === 'home') h = renderWelcome();
  else h = renderTop(ch) + '<main>' + renderChar(ch) + '</main>';
  if (S.modal) h += '<div class="modal" data-a="modalBg"><div class="dlg" data-stop="1">' + S.modal() + '</div></div>';
  if (S.toast) h += '<div class="toast">' + esc(S.toast) + '</div>';
  const y = window.scrollY; const pr = $('.rollwrap'); const pScroll = pr ? pr.scrollTop : 0;
  const mdl = $('.modal'); const mScroll = mdl ? mdl.scrollTop : 0;
  root.innerHTML = h; window.scrollTo(0, y);
  const m2 = $('.modal'); if (m2) m2.scrollTop = mScroll;
  if (S.scrollPanel) { S.scrollPanel = false; const rp = $('#rollPanel'); if (rp) { const r = rp.getBoundingClientRect(); if (r.top < 60 || r.top > window.innerHeight - 120) rp.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
  document.documentElement.lang = S.lang;
  C.save();
}
C.render = render;

function langSw() { return '<div class="lang">🌐 <button data-a="lang" data-v="de" class="' + (S.lang === 'de' ? 'on' : '') + '">Deutsch</button><button data-a="lang" data-v="en" class="' + (S.lang === 'en' ? 'on' : '') + '">English</button></div>'; }
function renderWelcome() {
  return corners() + '<div class="welcome">' + orn + D20 + '<div class="kicker" style="margin-top:.5em">The Ultimate</div><h1>' + T('DND5e Charakterverwaltung', 'DND5e Character Manager') + '</h1>' + orn +
    '<p class="sub">' + T('Lade deine Charakterbögen aus dem Creator, verwalte Runden, Aktionen, Zauberplätze und Zustände – und würfle direkt mit allen Boni.', 'Load your character sheets from the Creator, manage rounds, actions, spell slots and conditions – and roll with all bonuses applied.') + '</p>' +
    '<p class="sub"><b>' + T('Dein Abenteuer geht weiter.', 'Your adventure continues.') + '</b></p>' + langSw() +
    '<div class="grid2"><button class="btn primary" data-a="pickFile">📜 ' + T('Charakterbogen laden (PDF)', 'Load character sheet (PDF)') + '</button><button class="btn" data-a="pickFile">📂 ' + T('Gruppe laden (JSON)', 'Load party (JSON)') + '</button>' +
    '<button class="btn" data-a="newBlank">✏️ ' + T('Leerer Charakter', 'Blank character') + '</button>' + (S.chars.length ? '<button class="btn gold" data-a="home0">⚔️ ' + T('Zur Gruppe', 'To the party') + ' (' + S.chars.length + ')</button>' : '<button class="btn" data-a="help">ℹ️ ' + T('So funktioniert’s', 'How it works') + '</button>') + '</div>' +
    '<div class="drop" id="drop">' + T('…oder Charakterbogen-PDF bzw. Gruppen-JSON hierher ziehen', '…or drop a character sheet PDF or party JSON here') + '</div>' +
    '<p><a class="btn sm" href="DND5e_Startseite.html" style="text-decoration:none">🏠 ' + T('Zur Startseite', 'To the landing page') + '</a></p>' + (S.chars.length ? '<div class="row" style="justify-content:center">' + S.chars.map(c => '<span class="row" style="gap:0"><button class="btn sm" data-a="tab" data-id="' + c.id + '">' + esc(c.name) + '</button><button class="btn sm ghost" data-a="delChar" data-id="' + c.id + '" title="' + T('Charakter entfernen', 'Remove character') + '">🗑</button></span>').join('') + '</div>' : '') + '</div>';
}
function renderTop(ch) {
  return '<div class="top"><div class="brand" data-a="home" title="' + T('Startseite', 'Home') + '">' + D20.replace('class="d20"', '') + '<b>' + T('Charakterverwaltung', 'Character Manager') + '</b></div><div class="tabs">' +
    S.chars.map(c => '<div class="tab ' + (c.id === ch.id ? 'on' : '') + '" data-a="tab" data-id="' + c.id + '">' + esc(c.name) + ' <span class="hpm">' + (c.dead ? '☠' : c.hp.cur + '/' + c.hp.max) + '</span><span class="tabx" data-a="delChar" data-id="' + c.id + '" title="' + T('Charakter entfernen', 'Remove character') + '">✕</span></div>').join('') +
    '<button class="btn sm" data-a="pickFile" title="PDF/JSON">＋ ' + T('Bogen laden', 'Load sheet') + '</button></div>' +
    '<a class="btn sm" href="DND5e_Startseite.html" title="' + T('Zur Startseite (DND5e Maker)', 'To the landing page (DND5e Maker)') + '">🏠</a><button class="btn sm" data-a="export">💾 ' + T('Gruppe speichern', 'Save party') + '</button>' + langSw() + '</div>';
}

function renderChar(ch) {
  const ban = [];
  if (!ch.setupDone) ban.push('<div class="banner info">📝 ' + T('Bevor die erste Runde beginnt: Lege den aktuellen Zustand fest (TP, verbrauchte Fähigkeiten, Zustände).', 'Before the first round: set the current state (HP, used abilities, conditions).') + ' <button class="btn sm primary" data-a="setup">' + T('Startzustand festlegen', 'Set starting state') + '</button></div>');
  if (ch.dead) ban.push('<div class="banner">☠ <b>' + T('Der Charakter ist tot.', 'The character is dead.') + '</b> <button class="btn sm" data-a="revive">' + T('Wiederbeleben (1 TP)', 'Revive (1 HP)') + '</button></div>');
  if (S.pendingConc && !ch.dead) ban.push('<div class="banner">🧠 ' + T('Konzentration halten: KO-Rettungswurf SG ', 'Keep concentration: CON save DC ') + S.pendingConc.dc + ' (' + esc(S.pendingConc.name) + ') <button class="btn sm primary" data-a="concSave">🎲 ' + T('Würfeln', 'Roll') + '</button> <button class="btn sm" data-a="concDismiss">✕</button></div>');
  return ban.join('') + '<div class="cols"><div class="col1">' + cardHeader(ch) + cardHP(ch) + cardStats(ch) + cardAbil(ch) + cardEffects(ch) + '</div><div class="col2">' + cardRound(ch) + cardOptions(ch) + '</div><div class="col3">' + C.cardPanel(ch) + cardResources(ch) + cardSpells(ch) + cardLog(ch) + cardNotes(ch) + '</div></div>';
}
function clsText(ch) { return ch.classes.map(c => L([D.CLASSES[c.key].de, D.CLASSES[c.key].en]) + ' ' + c.lvl).join(' / ') || esc(ch.classStr); }
function cardHeader(ch) {
  const race = ch.raceKey ? L([D.RACES[ch.raceKey].de, D.RACES[ch.raceKey].en]) : ch.race;
  return '<div class="card hdr"><div class="row"><div class="sp"><div class="kicker">' + esc(race || '') + (ch.background ? ' · ' + esc(ch.background) : '') + '</div><h2>' + esc(ch.name) + '</h2><div>' + clsText(ch) + ' · ' + T('Stufe ', 'Level ') + R.totalLvl(ch) + (ch.player ? ' · <span class="muted">' + esc(ch.player) + '</span>' : '') + '</div></div>' +
    '<div class="row" style="flex-direction:column;align-items:flex-end"><button class="btn sm" data-a="setup">✏️ ' + T('Bearbeiten', 'Edit') + '</button><button class="btn sm" data-a="delChar" data-id="' + ch.id + '">🗑 ' + T('Charakter entfernen', 'Remove character') + '</button></div></div></div>';
}
function cardHP(ch) {
  const pct = Math.max(0, Math.min(100, 100 * ch.hp.cur / Math.max(1, ch.hp.max))); const tp = Math.min(100, 100 * ch.hp.temp / Math.max(1, ch.hp.max));
  let h = '<div class="card"><h3>' + T('Trefferpunkte', 'Hit Points') + '<span class="r">' + T('Trefferwürfel', 'Hit dice') + ': ' + ch.hd.map(p => (p.total - p.used) + '/' + p.total + T('W', 'd') + p.die).join(' · ') + '</span></h3>' +
    '<div class="row"><span class="hpnum">' + ch.hp.cur + '</span><span>/ ' + ch.hp.max + '</span>' + (ch.hp.temp ? '<span class="badge good">+' + ch.hp.temp + ' ' + T('temp.', 'temp') + '</span>' : '') + '<span class="sp"></span>' +
    '<input type="number" id="hpIn" min="0" placeholder="0" style="width:4.5em"><button class="btn sm primary" data-a="dmg">− ' + T('Schaden', 'Damage') + '</button><button class="btn sm" data-a="dmgHalf" title="' + T('Resistenz: halber Schaden', 'Resistance: half damage') + '">½</button><button class="btn sm" data-a="heal">+ ' + T('Heilen', 'Heal') + '</button><button class="btn sm" data-a="temp">' + T('Temp', 'Temp') + '</button></div>' +
    '<div class="hpbar"><i class="' + (pct <= 25 ? 'crit' : pct <= 50 ? 'low' : '') + '" style="width:' + pct + '%"></i>' + (tp ? '<b style="width:' + tp + '%"></b>' : '') + '</div>';
  if (ch.hp.cur <= 0 && !ch.dead) {
    const pip = (n, on, c) => Array.from({ length: 3 }, (_, i) => '<span class="pip ' + (i < n ? '' : 'u') + '" style="border-color:' + c + ';background:' + (i < n ? c : 'transparent') + '"></span>').join('');
    h += '<div class="remind"><b>' + T('Todesrettungswürfe', 'Death saves') + '</b> ' + (C.hasEff(ch, 'stable') ? '<span class="badge good">' + T('stabil', 'stable') + '</span>' : '') + '<div class="row">' + T('Erfolge', 'Successes') + ' <span class="pips">' + pip(ch.death.s, 1, '#2e7d32') + '</span> ' + T('Fehlschläge', 'Failures') + ' <span class="pips">' + pip(ch.death.f, 1, '#8a0303') + '</span><span class="sp"></span><button class="btn sm primary" data-a="sel" data-k="death">🎲 ' + T('Todesrettungswurf', 'Death save') + '</button></div></div>';
  }
  return h + '</div>';
}
const info = k => '<button class="ibtn" data-a="info" data-k="' + k + '" title="' + T('Wie berechnet sich der Wert?', 'How is this value calculated?') + '">ℹ️</button>';
function prepLimit(ch) {
  const P = { cleric: ['WIS', 1], druid: ['WIS', 1], wizard: ['INT', 1], paladin: ['CHA', .5] };
  let n = 0; for (const c of ch.classes) { const p = P[c.key]; if (p) n += Math.max(1, ch.abil[p[0]].mod + Math.floor(c.lvl * p[1])); }
  return n;
}
function cardStats(ch) {
  const ac = C.acNow(ch), E = C.econ(ch);
  const parts = ac.parts.map(p => '<li class="' + (p.base ? '' : p.v < 0 ? 'neg' : 'pos') + '">' + esc(p.n) + ': ' + (p.base ? p.v : sign(p.v)) + (p.custom ? ' <a href="#" data-a="acModDel" data-id="' + ch.acMods.indexOf(p.custom) + '">✕</a>' : '') + '</li>').join('');
  return '<div class="card"><div class="stats3"><div class="stat" title="' + T('Rüstungsklasse', 'Armor Class') + '">' + info('ac') + '<b>🛡 ' + ac.total + '</b><span>' + T('Rüstungsklasse', 'Armor Class') + '</span></div><div class="stat click" data-a="sel" data-k="init">' + info('init') + '<b>' + sign(ch.init) + '</b><span>Initiative 🎲</span></div><div class="stat">' + info('speed') + '<b>' + E.speed + '</b><span>' + T('Bewegung (ft)', 'Speed (ft)') + '</span></div><div class="stat">' + info('prof') + '<b>' + sign(ch.prof) + '</b><span>' + T('Übungsbonus', 'Proficiency') + '</span></div></div>' +
    '<ul class="acb">' + parts + '</ul>' + ac.notes.map(n => '<div class="small muted">⚠ ' + esc(n) + '</div>').join('') +
    '<div class="row small" style="margin-top:.3em">' + T('RK-Modifikator', 'AC modifier') + ': <input type="text" id="acModN" placeholder="' + T('z. B. Schild', 'e.g. Shield') + '" style="width:8em"><input type="number" id="acModV" value="2"><button class="btn sm" data-a="acModAdd">＋</button><button class="btn sm" data-a="effQuick" data-id="cover2">' + T('½ Deckung', '½ cover') + '</button><button class="btn sm" data-a="effQuick" data-id="cover5">' + T('¾ Deckung', '¾ cover') + '</button></div>' +
    '<div class="small muted" style="margin-top:.2em">' + T('Passive Wahrnehmung', 'Passive Perception') + ' ' + ch.passive + ' ' + info('passive') + '</div></div>';
}
function cardAbil(ch) {
  let h = '<div class="card"><h3>' + T('Attribute & Rettungswürfe', 'Abilities & Saves') + '<span class="r muted">' + T('klicken zum Würfeln', 'click to roll') + ' <button class="btn sm" data-a="info" data-k="abil" title="' + T('Wie berechnen sich die Werte?', 'How are the values calculated?') + '">ℹ️ ' + T('Berechnung', 'Calculation') + '</button></span></h3><div class="abils">';
  for (const a of D.ABIL) { const ab = ch.abil[a], sv = ch.saves[a]; h += '<div class="abil"><div class="n">' + ABN(a) + '</div><div class="m" data-a="sel" data-k="check" data-ab="' + a + '" title="' + T('Attributsprobe', 'Ability check') + '">' + sign(ab.mod) + '</div><div class="s">' + ab.score + '</div><div class="sv ' + (sv.prof ? 'p' : '') + '" data-a="sel" data-k="save" data-ab="' + a + '" title="' + T('Rettungswurf', 'Saving throw') + '">' + (sv.prof ? '● ' : '') + 'RW ' + sign(sv.bonus) + '</div></div>'; }
  h += '</div><details style="margin-top:.4em"' + (S.openSkills ? ' open' : '') + ' data-a="tglSkills"><summary>' + T('Fertigkeiten', 'Skills') + '</summary><div class="skills">';
  for (const [id, ab, de, en] of D.SKILLS) { const s = ch.skills[id]; h += '<div class="' + (s.prof ? 'p' : '') + '" data-a="sel" data-k="check" data-ab="' + ab + '" data-sk="' + id + '"><span>' + (s.prof ? '● ' : '') + esc(L([de, en])) + ' <span class="tiny muted">' + ABN(ab) + '</span></span><b>' + sign(s.bonus) + '</b></div>'; }
  return h + '</div></details></div>';
}
function effOptions() {
  const neg = D.EFFECTS.filter(e => !e.pos), pos = D.EFFECTS.filter(e => e.pos && e.id !== 'concentrating');
  const o = arr => arr.map(e => '<option value="' + e.id + '">' + esc(L([e.de, e.en])) + (e.save ? ' (' + T('RW', 'save') + ')' : '') + '</option>').join('');
  return '<option value="">— ' + T('Zustand/Effekt wählen', 'Choose condition/effect') + ' —</option><optgroup label="' + T('Negativ', 'Negative') + '">' + o(neg) + '</optgroup><optgroup label="' + T('Positiv', 'Positive') + '">' + o(pos) + '</optgroup><option value="__custom">✏️ ' + T('Eigener Effekt …', 'Custom effect …') + '</option>';
}
function cardEffects(ch) {
  let h = '<div class="card"><h3>' + T('Zustände & Effekte', 'Conditions & Effects') + '<span class="r">' + T('Erschöpfung', 'Exhaustion') + ' <select data-c="exhaustion">' + [0, 1, 2, 3, 4, 5, 6].map(i => '<option ' + (ch.exhaustion === i ? 'selected' : '') + '>' + i + '</option>').join('') + '</select></span></h3>';
  h += '<div class="row"><select id="effSel" style="flex:1;min-width:12em">' + effOptions() + '</select><input type="number" id="effRounds" placeholder="' + T('Runden', 'Rounds') + '" title="' + T('Dauer in Runden (leer = unbegrenzt)', 'Duration in rounds (empty = unlimited)') + '"><input type="number" id="effDC" placeholder="SG" title="' + T('SG des Rettungswurfs', 'Save DC') + '"><button class="btn sm primary" data-a="effAdd">＋</button></div>';
  const list = ch.effects.filter(e => e.id !== 'concentrating');
  if (!list.length && !ch.concentration && !ch.exhaustion) h += '<div class="small muted" style="margin-top:.3em">' + T('Keine aktiven Zustände.', 'No active conditions.') + '</div>';
  if (ch.concentration) h += '<div class="eff pos"><span class="nm">🧠 ' + T('Konzentration', 'Concentration') + ': ' + esc(ch.concentration.name) + '</span><span class="small">' + ch.concentration.rounds + ' ' + T('Rd.', 'rd') + '</span><button class="btn sm ghost x" data-a="endConc">✕</button></div>';
  for (const e of list) {
    const d = C.effDef(e);
    h += '<div class="eff ' + (d.pos ? 'pos' : 'neg') + '" title="' + esc(L(d.desc)) + '"><span class="nm">' + esc(L([d.de, d.en])) + '</span>' + (e.rounds ? '<span class="small">' + e.rounds + ' ' + T('Rd.', 'rd') + '</span>' : '') + (d.save ? '<span class="small">' + ABN(d.save) + '-RW' + (e.dc ? ' SG ' + e.dc : '') + ' ' + (d.when === 'start' ? T('Zugbeginn', 'turn start') : T('Zugende', 'turn end')) + '</span>' : '') + (e.note ? '<span class="small muted">' + esc(e.note) + '</span>' : '') + '<button class="btn sm ghost x" data-a="effDel" data-id="' + e.uid + '">✕</button><div class="tiny muted" style="flex-basis:100%">' + esc(L(d.desc)) + '</div></div>';
  }
  if (ch.exhaustion) h += '<div class="eff neg"><span class="nm">' + T('Erschöpfung', 'Exhaustion') + ' ' + ch.exhaustion + '</span><span class="tiny">' + [T('Nachteil auf Proben', 'disadv. on checks'), T('halbe Bewegung', 'half speed'), T('Nachteil auf Angriffe & RW', 'disadv. on attacks & saves'), T('TP-Max halbiert', 'HP max halved'), T('Bewegung 0', 'speed 0'), T('Tod', 'death')].slice(0, ch.exhaustion).join(' · ') + '</span></div>';
  const pas = C.K(ch).passives;
  if (pas.length) h += '<details style="margin-top:.3em"><summary class="small">' + T('Passive Fähigkeiten', 'Passive features') + ' (' + pas.length + ')</summary>' + pas.map(p => '<div class="small">• ' + esc(L(p)) + '</div>').join('') + '</details>';
  return h + '</div>';
}
function chip(label, used, extra) { return '<span class="chip ' + (used ? 'used' : '') + (extra ? ' extra' : '') + '"><i></i>' + label + '</span>'; }
function cardRound(ch) {
  const t = ch.turn, E = C.econ(ch);
  let h = '<div class="card"><div class="roundbar"><span class="kicker">' + T('Runde', 'Round') + '</span><span class="rn">' + ch.round + '</span><span class="sp"></span>' +
    '<button class="btn sm" data-a="undo" ' + ((S.undo[ch.id] || []).length ? '' : 'disabled') + ' title="' + T('Letzten Schritt zurücknehmen', 'Undo the last step') + '">⟲ ' + T('Rückgängig', 'Rewind') + '</button>' +
    (t.phase === 'turn' ? '<button class="btn sm primary" data-a="endRound">⏹ ' + T('Runde beenden', 'End round') + '</button>' : '<button class="btn sm primary" data-a="startRound">▶ ' + T('Runde ', 'Start round ') + (ch.round + 1) + T(' starten', '') + '</button>') +
    '<button class="btn sm" data-a="shortRest" title="' + T('Kurze Rast', 'Short rest') + '">☾ ' + T('Kurz', 'Short') + '</button><button class="btn sm" data-a="longRest" title="' + T('Lange Rast', 'Long rest') + '">☀ ' + T('Lang', 'Long') + '</button></div>';
  if (t.phase === 'wait') h += '<div class="phase">⏳ ' + T('Gegnerphase: Deine Runde ist beendet. Du kannst noch deine Reaktion nutzen (z. B. Gelegenheitsangriff, Schild, Höllischer Tadel).', 'Enemy phase: your round has ended. You can still use your reaction (e.g. opportunity attack, Shield, Hellish Rebuke).') + '</div>';
  h += '<div class="econ">';
  const actBlocked = E.inc || t.phase !== 'turn' || (E.slow && t.bonusUsed);
  for (let i = 0; i < t.actions; i++) h += chip(T('Aktion', 'Action') + (i ? ' ' + (i + 1) : ''), actBlocked || i < t.actUsed, i > 0);
  if (C.anyFx(ch, 'extraAction')) h += chip(T('Hast-Aktion', 'Haste action'), !E.hasteLeft, true);
  h += chip(T('Bonusaktion', 'Bonus action'), !E.bonusLeft) + chip(T('Reaktion', 'Reaction'), !E.reactLeft) + chip(T('Objekt', 'Object'), !E.objLeft) + '</div>';
  if (t.attacksLeft > 0) h += '<div class="note">⚔️ ' + T('Angriffsaktion läuft: noch ', 'Attack action in progress: ') + t.attacksLeft + T(' Angriff(e) übrig.', ' attack(s) left.') + '</div>';
  if (t.bonusAttacks > 0) h += '<div class="note">👊 ' + T('Noch ', '') + t.bonusAttacks + T(' waffenlose(r) Bonusangriff(e).', ' unarmed bonus attack(s) left.') + '</div>';
  h += '<div class="row small" style="margin-top:.3em"><b>' + T('Bewegung', 'Movement') + ':</b> ' + t.move + ' / ' + E.maxMove + ' ft' + (t.dash ? ' (' + T('Spurt', 'Dash') + ' ×' + t.dash + ')' : '') + (E.speed === 0 ? ' <span class="badge bad">' + T('Bewegungsrate 0', 'Speed 0') + '</span>' : '') +
    '<span class="sp"></span>' + [5, 10, 30].map(v => '<button class="btn sm" data-a="move" data-v="' + v + '" ' + (E.moveLeft >= v && t.phase === 'turn' ? '' : 'disabled') + '>+' + v + '</button>').join('') + '<button class="btn sm" data-a="move" data-v="-5" ' + (t.move >= 5 ? '' : 'disabled') + '>−5</button></div>';
  return h + '</div>';
}
function cardOptions(ch) {
  const G = C.buildOptions(ch); S.optMap = {};
  const names = { action: T('Aktion', 'Action'), bonus: T('Bonusaktion', 'Bonus action'), reaction: T('Reaktion', 'Reaction'), move: T('Bewegung', 'Movement'), free: T('Frei', 'Free') };
  let hidden = 0, h = '<div class="card"><h3>' + T('Was kannst du tun?', 'What can you do?') + '<span class="r"><label class="small"><input type="checkbox" data-a="tglHidden" ' + (S.showHidden ? 'checked' : '') + '> ' + T('Gesperrte zeigen', 'Show locked') + ' (<span id="hidN"></span>)</label></span></h3>';
  for (const g of ['action', 'bonus', 'reaction', 'move', 'free']) {
    const list = G[g]; const vis = list.filter(o => o.ok || S.showHidden); hidden += list.filter(o => !o.ok).length;
    if (!vis.length) { if (list.length) h += '<div class="grp"><h4>' + names[g] + '<span class="tiny muted" style="letter-spacing:0;text-transform:none;font-family:var(--fB)">' + esc(list[0].why || '') + '</span></h4></div>'; continue; }
    h += '<div class="grp"><h4>' + names[g] + '</h4>' + (g === 'reaction' ? '<div class="rnote">⏱ ' + T('Reaktionen nutzt du meist <b>nicht im eigenen Zug</b>, sondern als Antwort auf einen Auslöser – oft im Zug eines Gegners. Eine pro Runde; sie wird zu Beginn deines Zuges wieder frei.', 'Reactions are usually used <b>outside your own turn</b>, in response to a trigger – often on an enemy\'s turn. One per round; it recovers at the start of your turn.') + '</div>' : '') + '<div class="opts">';
    for (const o of vis) { S.optMap[o.key] = o; const sel = S.sel && S.sel.key === o.key; h += '<div class="opt ' + (o.cls || '') + (o.ok ? '' : ' off') + (sel ? ' sel' : '') + '" data-a="opt" data-key="' + esc(o.key) + '" title="' + esc(o.ok ? (o.desc || '') : o.why) + '">' + (o.tag ? '<span class="tag">' + esc(o.tag) + '</span>' : '') + (o.group ? '<span class="grpl">' + esc(o.group) + '</span>' : '') + '<span class="t">' + esc(o.label) + '</span>' + (o.desc ? '<span class="d">' + esc(dS(o.ok ? o.desc : '🔒 ' + o.why)) + '</span>' : (!o.ok ? '<span class="d">🔒 ' + esc(o.why) + '</span>' : '')) + (o.trigger && o.ok ? '<span class="d trig">⚡ ' + esc(L(o.trigger)) + '</span>' : '') + (sel ? '<span class="selmark">▶ ' + T('ausgewählt', 'selected') + '</span>' : '') + '</div>'; }
    h += '</div></div>';
  }
  h += '</div>';
  return h.replace('<span id="hidN"></span>', hidden);
}
/* ---------- Ressourcen & Zauber ---------- */
function pips(max, used, a, id) { if (max > 12) return '<span><input type="number" data-a2="resNum" data-id="' + id + '" value="' + (max - used) + '" min="0" max="' + max + '"> / ' + max + '</span>'; return '<span class="pips">' + Array.from({ length: max }, (_, i) => '<span class="pip ' + (i < max - used ? '' : 'u') + '" data-a="' + a + '" data-id="' + id + '" data-i="' + i + '"></span>').join('') + '</span>'; }
function cardResources(ch) {
  const res = C.allRes(ch);
  let h = '<div class="card"><h3>' + T('Fähigkeiten & Zauberplätze', 'Abilities & Spell Slots') + '<span class="r"><button class="btn sm" data-a="customRes">＋ ' + T('Eigene Fähigkeit', 'Custom ability') + '</button></span></h3>';
  for (const r of res) h += '<div class="res"><span class="nm">' + esc(L(r.name)) + (r.die ? ' <span class="small muted">(' + dS(r.die) + ')</span>' : '') + (r.custom ? ' <a href="#" class="small" data-a="customRes" data-id="' + r.id + '">✏️</a>' : '') + '</span><span class="rech ' + r.recharge + '">' + (r.recharge === 'SR' ? T('kurze Rast', 'short rest') : r.recharge === 'LR' ? T('lange Rast', 'long rest') : '—') + '</span>' + pips(r.max, r.st.used || 0, 'resPip', r.id) + '</div>';
  const sl = ch.slots.map((s, i) => ({ s, i })).filter(x => x.s.max > 0);
  if (sl.length || ch.pact) {
    h += '<div class="lvlh">' + T('Zauberplätze', 'Spell slots') + ' <span class="rech LR">' + T('lange Rast', 'long rest') + '</span></div>';
    for (const { s, i } of sl) h += '<div class="res"><span class="nm">' + (i + 1) + '. ' + T('Grad', 'level') + '</span>' + pips(s.max, s.used, 'slotPip', i) + '</div>';
    if (ch.pact) h += '<div class="res"><span class="nm">' + T('Paktmagie', 'Pact Magic') + ' (' + ch.pact.level + '. ' + T('Grad', 'lvl') + ')</span><span class="rech SR">' + T('kurze Rast', 'short rest') + '</span>' + pips(ch.pact.count, ch.pact.used, 'pactPip', 0) + '</div>';
    h += '<div class="small muted">' + T('Zauber-SG', 'Spell DC') + ' ' + C.spellDC(ch) + ' ' + info('spelldc') + ' · ' + T('Zauberangriff', 'Spell attack') + ' ' + sign(C.spellAtk(ch)) + ' ' + info('spellatk') + ' · ' + (ch.spellcasting.abil ? ABN(ch.spellcasting.abil) : '') + '</div>';
  }
  if (!res.length && !sl.length && !ch.pact) h += '<div class="small muted">' + T('Keine begrenzten Fähigkeiten erkannt – füge eigene hinzu.', 'No limited abilities detected – add your own.') + '</div>';
  return h + '</div>';
}
function cardSpells(ch) {
  if (!ch.spells.length) return '';
  const nPrep = ch.spells.filter(s => s.lvl > 0 && C.preparedFilter(ch, s)).length;
  let h = '<div class="card"><h3>' + T('Zauberliste', 'Spell list') + '<span class="r"><button class="btn sm" data-a="prepOpen">📖 ' + T('Zauber vorbereiten', 'Prepare spells') + '</button></span></h3>' + (ch.prepMode ? '<div class="small muted">' + T('Vorbereitet: ', 'Prepared: ') + nPrep + (prepLimit(ch) ? ' / ' + prepLimit(ch) : '') + '</div>' : '');
  for (let lv = 0; lv <= 9; lv++) {
    const list = ch.spells.filter(s => s.lvl === lv); if (!list.length) continue;
    let left = ''; if (lv > 0) { const sc = C.slotChoices(ch, lv); const own = ch.slots[lv - 1]; left = (own && own.max ? (own.max - own.used) + '/' + own.max : '') + (ch.pact && ch.pact.level >= lv ? (own && own.max ? ' + ' : '') + T('Pakt ', 'pact ') + (ch.pact.count - ch.pact.used) + '/' + ch.pact.count : ''); if (!sc.length) left += ' 🔒'; }
    h += '<div class="lvlh">' + (lv ? lv + '. ' + T('Grad', 'level') : T('Zaubertricks', 'Cantrips')) + (left ? ' · <span style="letter-spacing:0">' + T('übrig: ', 'left: ') + left + '</span>' : '') + '</div>';
    for (const s of list) {
      const si = C.spellInfo(ch, s); const ok = C.preparedFilter(ch, s);
      const tm = { A: T('Aktion', 'action'), B: T('Bonus', 'bonus'), R: T('Reaktion', 'reaction'), M: T('länger', 'longer') }[si.time] || '';
      h += '<div class="spl ' + (ok ? '' : 'np') + '"><span class="nm" data-a="spellSel" data-id="' + s.id + '">' + esc(si.name) + '</span><span class="meta">' + tm + (si.ritual ? ' · ' + T('Ritual', 'ritual') : '') + (C.spellSummary(ch, si) ? ' · ' + esc(dS(C.spellSummary(ch, si))) : '') + (s.ref ? '' : ' · <i>' + T('nicht erkannt', 'not recognized') + '</i>') + (ok ? '' : ' · ' + T('nicht vorbereitet', 'not prepared')) + '</span></div>';
    }
  }
  return h + '</div>';
}
function cardLog(ch) {
  return '<div class="card"><h3>' + T('Protokoll', 'Log') + '<span class="r"><button class="btn sm ghost" data-a="clearLog">' + T('leeren', 'clear') + '</button></span></h3><div class="log">' + (ch.log.length ? ch.log.slice(0, 120).map(l => '<div><span class="rd">R' + l.r + '</span>' + esc(S.lang === 'en' ? l.en : l.de) + '</div>').join('') : '<div class="muted">—</div>') + '</div></div>';
}
function cardNotes(ch) {
  const tx = ch.text || {};
  const sec = (t, v) => v && v.trim() ? '<details><summary>' + t + '</summary><div class="txt">' + esc(v.trim()) + '</div></details>' : '';
  const h = sec(T('Merkmale & Fähigkeiten (Bogen)', 'Features & Traits (sheet)'), tx.features) + sec(T('Angriffe & Zauberwirken (Bogen)', 'Attacks & Spellcasting (sheet)'), tx.attacks) + sec(T('Übungen & Sprachen', 'Proficiencies & Languages'), tx.profs) + sec(T('Ausrüstung', 'Equipment'), tx.equipment);
  return h ? '<div class="card"><h3>' + T('Aus dem Charakterbogen', 'From the character sheet') + '</h3>' + h + '</div>' : '';
}

Object.assign(C, { prepLimit, $, ABN, ABL, sign, dS, D20, corners, orn, effOptions, chip });
})(window);
