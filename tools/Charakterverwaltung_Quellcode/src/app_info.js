/* Charakterverwaltung – „Wie berechnet sich der Wert?“ (Info-Knöpfe) */
(function (W) {
'use strict';
const C = W.CM, { D, R, S, T, L, esc } = C;
const sign = n => (n >= 0 ? '+' : '−') + Math.abs(n);
const ABN = a => D.ABIL_N[a][S.lang === 'en' ? 3 : 2];
const ABL = a => D.ABIL_N[a][S.lang === 'en' ? 1 : 0];
const lvlOf = ch => R.totalLvl(ch);

/* Zerlegt einen Bogenwert in Attributsmodifikator + Übung + Rest */
function split(total, mod, prof, profLabel) {
  const rows = [[T('Attributsmodifikator', 'Ability modifier'), mod]];
  if (prof) rows.push([profLabel || T('Übungsbonus', 'Proficiency bonus'), prof]);
  const rest = total - mod - (prof || 0);
  if (rest) rows.push([T('Sonstiges laut Bogen (z. B. Gegenstand, Talent, Expertise, Aura)', 'Other per sheet (e.g. item, feat, expertise, aura)'), rest]);
  return rows;
}
function explain(ch, kind, key) {
  const pb = ch.prof;
  if (kind === 'save') { const a = key, sv = ch.saves[a]; return { title: ABL(a) + T('-Rettungswurf', ' saving throw'), rows: split(sv.bonus, ch.abil[a].mod, sv.prof ? pb : 0).map((r, i) => i === 0 ? [ABN(a) + '-Mod. (' + ch.abil[a].score + ')', r[1]] : r), total: sv.bonus, note: sv.prof ? T('Geübt im Rettungswurf.', 'Proficient in this save.') : T('Nicht geübt.', 'Not proficient.') }; }
  if (kind === 'skill') { const sk = D.SKILLS.find(x => x[0] === key); const a = sk[1], s = ch.skills[key]; const rest = s.bonus - ch.abil[a].mod - (s.prof ? pb : 0);
    const rows = split(s.bonus, ch.abil[a].mod, s.prof ? pb : 0).map((r, i) => i === 0 ? [ABN(a) + '-Mod.', r[1]] : r);
    return { title: L(sk.slice(2, 4)), rows, total: s.bonus, note: (s.prof ? T('Geübt.', 'Proficient.') : T('Nicht geübt.', 'Not proficient.')) + (s.prof && rest === pb ? T(' Der Rest entspricht genau einem zweiten Übungsbonus → Expertise.', ' The rest equals a second proficiency bonus → expertise.') : '') + (!s.prof && rest === Math.floor(pb / 2) && R.clsLvl(ch, 'bard') >= 2 ? T(' Rest = halber Übungsbonus → Hansdampf (Barde).', ' Rest = half proficiency → Jack of All Trades (bard).') : '') }; }
  if (kind === 'check') { const a = key; return { title: ABL(a) + T('-Probe', ' check'), rows: [[T('Attributswert ', 'Ability score ') + ch.abil[a].score + ' → (' + ch.abil[a].score + ' − 10) ÷ 2', ch.abil[a].mod]], total: ch.abil[a].mod }; }
  if (kind === 'init') return { title: T('Initiative', 'Initiative'), rows: split(ch.init, ch.abil.DEX.mod, 0).map((r, i) => i === 0 ? [ABN('DEX') + '-Mod.', r[1]] : r), total: ch.init, note: C.K(ch).passives.some(p => /Feral|Wilder/.test(p[0])) ? T('Wilder Instinkt: Vorteil auf Initiative.', 'Feral Instinct: advantage on initiative.') : '' };
  if (kind === 'prof') return { title: T('Übungsbonus', 'Proficiency bonus'), rows: [[T('Grundwert', 'Base'), 2], [T('Gesamtstufe ', 'Total level ') + lvlOf(ch) + T(': +1 je 4 Stufen ab Stufe 5', ': +1 per 4 levels from level 5'), Math.floor((lvlOf(ch) - 1) / 4)]].concat(ch.prof !== 2 + Math.floor((lvlOf(ch) - 1) / 4) ? [[T('Abweichung laut Bogen', 'Difference per sheet'), ch.prof - 2 - Math.floor((lvlOf(ch) - 1) / 4)]] : []), total: ch.prof };
  if (kind === 'passive') { const p = ch.skills.perception.bonus; return { title: T('Passive Wahrnehmung', 'Passive Perception'), rows: [[T('Grundwert', 'Base'), 10], [T('Wahrnehmung', 'Perception'), p]].concat(ch.passive - 10 - p ? [[T('Sonstiges (z. B. Aufmerksam, Vorteil +5)', 'Other (e.g. Observant, advantage +5)'), ch.passive - 10 - p]] : []), total: ch.passive }; }
  if (kind === 'speed') { const rows = [[T('Bewegungsrate laut Bogen (Volk, Klasse, Rüstung)', 'Speed per sheet (race, class, armor)'), ch.speed]]; for (const f of C.fxList(ch)) { const v = f.fx.speed; if (v === undefined) continue; rows.push([L([f.def.de, f.def.en]), v === 0 ? '= 0' : v === 'half' ? '× ½' : v === 'double' ? '× 2' : v]); } return { title: T('Bewegungsrate (ft)', 'Speed (ft)'), rows, total: C.speedNow(ch), note: T('1,5 m = 5 ft. Spurt verdoppelt die Bewegung dieses Zuges.', '5 ft = 1.5 m. Dash doubles this turn\'s movement.') }; }
  if (kind === 'ac') { const ac = C.acNow(ch); return { title: T('Rüstungsklasse', 'Armor Class'), rows: ac.parts.map(p => [p.n, p.base ? p.v : p.v]), total: ac.total, note: T('Der Basiswert stammt aus dem Bogen (Rüstung + GE-Mod. bzw. ungerüstete Verteidigung, Schild, Kampfstil Verteidigung …). Darauf kommen aktive Effekte und eigene Modifikatoren.', 'The base comes from the sheet (armor + DEX mod or unarmored defense, shield, Defense fighting style …). Active effects and custom modifiers are added on top.') + (ac.notes.length ? ' ' + ac.notes.join(' ') : '') }; }
  if (kind === 'spelldc') { const a = ch.spellcasting.abil || 'CHA', m = ch.abil[a].mod, calc = 8 + pb + m; const rows = [[T('Grundwert', 'Base'), 8], [T('Übungsbonus', 'Proficiency'), pb], [ABN(a) + '-Mod.', m]]; if (C.spellDC(ch) !== calc) rows.push([T('Abweichung laut Bogen', 'Difference per sheet'), C.spellDC(ch) - calc]); return { title: T('Zauberrettungswurf-SG', 'Spell save DC'), rows, total: C.spellDC(ch) }; }
  if (kind === 'spellatk') { const a = ch.spellcasting.abil || 'CHA', m = ch.abil[a].mod; const rows = [[T('Übungsbonus', 'Proficiency'), pb], [ABN(a) + '-Mod.', m]]; if (C.spellAtk(ch) !== pb + m) rows.push([T('Abweichung laut Bogen (z. B. magischer Fokus)', 'Difference per sheet (e.g. magic focus)'), C.spellAtk(ch) - pb - m]); return { title: T('Zauberangriffsbonus', 'Spell attack bonus'), rows, total: C.spellAtk(ch) }; }
  if (kind === 'weapon') { const w = C.wById(ch, key); const wi = C.weaponInfo(ch, w); const rows = [[ABN(wi.abil) + '-Mod. (' + (wi.ranged ? T('Fernkampf', 'ranged') : wi.finesse ? T('Finesse: höherer Wert', 'finesse: higher score') : T('Nahkampf', 'melee')) + ')', wi.mod], [T('Übungsbonus (Annahme: geübt)', 'Proficiency (assumed proficient)'), pb]]; const rest = w.atk - wi.mod - pb; if (rest) rows.push([T('Sonstiges laut Bogen (magische Waffe, Kampfstil Bogenschießen, keine Übung …)', 'Other per sheet (magic weapon, Archery style, not proficient …)'), rest]);
    const p = R.parseDice(w.dmg); return { title: w.name + ' – ' + T('Angriffsbonus', 'attack bonus'), rows, total: w.atk, note: T('Schaden: ', 'Damage: ') + w.dmg.replace(/d/g, T('W', 'd')) + (p.flat ? T(' (der feste Wert ist meist der ', ' (the flat value is usually the ') + ABN(wi.abil) + T('-Mod.)', ' mod)') : '') }; }
  return null;
}
function explainTable(x) {
  if (!x) return '';
  return '<table class="xtab" style="width:100%"><tbody>' + x.rows.map(r => '<tr><td>' + esc(r[0]) + '</td><td style="text-align:right">' + (typeof r[1] === 'number' ? sign(r[1]) : esc(r[1])) + '</td></tr>').join('') + '<tr><td class="tot">' + T('Ergebnis', 'Result') + '</td><td class="tot" style="text-align:right">' + (x.title.match(/SG|DC|Rüstungsklasse|Armor|Passive|Bewegung|Speed/) ? x.total : sign(x.total)) + '</td></tr></tbody></table>' + (x.note ? '<div class="small muted" style="margin-top:.3em">' + esc(x.note) + '</div>' : '');
}
/* Kurzform für den Wurfbereich */
function explainShort(x) {
  if (!x) return '';
  return '<div class="tiny muted">= ' + x.rows.map(r => esc(String(r[0]).replace(/ \(.*\)$/, '').replace(/ laut Bogen.*| per sheet.*/, ' (Bogen)')) + ' ' + (typeof r[1] === 'number' ? sign(r[1]) : esc(r[1]))).join(' · ') + '</div>';
}
function dlgInfo() {
  const ch = C.cur(); const q = S.infoQ || {};
  let h = '<h2>ℹ️ ' + T('Wie berechnet sich das?', 'How is this calculated?') + '</h2>' + C.orn;
  if (q.k === 'abil') {
    h += '<h3>' + T('Rettungswürfe', 'Saving throws') + '</h3><div class="small">' + T('Rettungswurf = Attributsmod. + Übungsbonus (falls geübt) + Sonstiges.', 'Save = ability mod + proficiency (if proficient) + other.') + '</div><table class="xtab" style="width:100%"><tr><th></th><th>' + T('Mod.', 'Mod') + '</th><th>' + T('Übung', 'Prof.') + '</th><th>' + T('Sonst.', 'Other') + '</th><th>' + T('Gesamt', 'Total') + '</th></tr>' + D.ABIL.map(a => { const sv = ch.saves[a], m = ch.abil[a].mod, pr = sv.prof ? ch.prof : 0; return '<tr><td>' + ABL(a) + '</td><td>' + sign(m) + '</td><td>' + (pr ? sign(pr) : '—') + '</td><td>' + (sv.bonus - m - pr ? sign(sv.bonus - m - pr) : '—') + '</td><td class="tot">' + sign(sv.bonus) + '</td></tr>'; }).join('') + '</table>';
    h += '<h3>' + T('Fertigkeiten', 'Skills') + '</h3><div class="small">' + T('Fertigkeit = Attributsmod. + Übungsbonus (falls geübt; doppelt bei Expertise) + Sonstiges.', 'Skill = ability mod + proficiency (if proficient; double with expertise) + other.') + '</div><table class="xtab" style="width:100%"><tr><th></th><th>' + T('Attr.', 'Abil.') + '</th><th>' + T('Mod.', 'Mod') + '</th><th>' + T('Übung', 'Prof.') + '</th><th>' + T('Sonst.', 'Other') + '</th><th>' + T('Gesamt', 'Total') + '</th></tr>' + D.SKILLS.map(([id, a, de, en]) => { const s = ch.skills[id], m = ch.abil[a].mod, pr = s.prof ? ch.prof : 0; return '<tr><td>' + esc(L([de, en])) + '</td><td>' + ABN(a) + '</td><td>' + sign(m) + '</td><td>' + (pr ? sign(pr) : '—') + '</td><td>' + (s.bonus - m - pr ? sign(s.bonus - m - pr) : '—') + '</td><td class="tot">' + sign(s.bonus) + '</td></tr>'; }).join('') + '</table>';
    h += '<div class="small muted" style="margin-top:.3em">' + T('Attributsmodifikator = (Attributswert − 10) ÷ 2, abgerundet. Übungsbonus ', 'Ability modifier = (score − 10) ÷ 2, rounded down. Proficiency bonus ') + sign(ch.prof) + '.</div>';
  } else h += '<h3>' + esc((explain(ch, q.k, q.id) || {}).title || '') + '</h3>' + explainTable(explain(ch, q.k, q.id));
  return h + '<div class="foot"><button class="btn primary" data-a="modalClose">OK</button></div>';
}
Object.assign(C, { explain, explainTable, explainShort, dlgInfo });
})(window);
