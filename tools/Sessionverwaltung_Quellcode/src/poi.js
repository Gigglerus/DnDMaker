/* DND5e Sessionverwaltung – Points of Interest und Orte bearbeiten */
(function (W) {
'use strict';
const V = W.SV; const { $, $$, esc, S, T, L, uid, save, toast } = V; const P = W.SV_POI; const AT = W.AT_DATA; const G = V.G;
const render = () => V.render();

/* ---------- Übersetzung der Atlas-Werte ---------- */
const ATL = { Weiler: 'Hamlet', Dorf: 'Village', Ortschaft: 'Small settlement', Kleinstadt: 'Small town', Stadt: 'Town', 'Großstadt': 'City', Metropole: 'Metropolis', Festung: 'Fortress', niedrig: 'low', mittel: 'medium', hoch: 'high', 'sehr hoch': 'very high', arm: 'poor', normal: 'normal', reich: 'rich', 'fürstlich': 'princely', Mensch: 'Human', Zwerg: 'Dwarf', Elf: 'Elf', Halbling: 'Halfling', Drachenblütiger: 'Dragonborn', Gnom: 'Gnome', Halbelf: 'Half-Elf', Halbork: 'Half-Orc', Tiefling: 'Tiefling' };
const tA = v => S.lang === 'en' && ATL[v] ? ATL[v] : v;
V.tA = tA;
const cityWealthOf = name => { const ci = V.findCity(name); return ci ? ci.city.wealth : 'normal'; };
const poiCtx = p => ({ cityWealth: cityWealthOf(p.city), owner: ownerName(p) });
function ownerName(p) { const n = (p.npcIds || []).map(id => S.camp.npcs.find(x => x.id === id)).find(Boolean); return n ? n.name : ''; }
V.poiKind = p => P.KBY[p.kind] ? L([P.KBY[p.kind].de, P.KBY[p.kind].en]) : (p.kindText || T('Ort', 'Place'));
V.poiIcon = p => P.KBY[p.kind] ? P.KBY[p.kind].icon : '📍';
const fmt = cp => P.fmtPrice(cp, S.lang);
const num2 = x => (Math.round(x * 100) / 100).toLocaleString(S.lang === 'en' ? 'en-GB' : 'de-DE');

/* ---------- Orte (wie im Atlas) ---------- */
V.cityPanel = function (m, ci) {
  const npcs = S.camp.npcs.filter(n => n.city && n.city.toLowerCase() === (ci.name || '').toLowerCase());
  const pois = (S.camp.pois || []).filter(p => p.city && p.city.toLowerCase() === (ci.name || '').toLowerCase());
  const sel = (k, list) => '<select data-ch="cityF" data-k="' + k + '">' + list.map(v => '<option value="' + esc(v) + '"' + (ci[k] === v ? ' selected' : '') + '>' + esc(tA(v)) + '</option>').join('') + '</select>';
  const numIn = (k, lbl) => '<label>' + lbl + '<input type="number" min="0" data-in="cityN" data-k="' + k + '" value="' + (+ci[k] || 0) + '"></label>';
  const sum = (ci.races || []).reduce((s, r) => s + (+r.p || 0), 0);
  return '<h3>🏘️ <input type="text" class="cname" data-ch="cityName" value="' + esc(ci.name) + '" placeholder="' + T('Name des Ortes', 'Place name') + '"><span class="r"><button class="btn sm ghost" data-a="selCity" data-id="">✖</button></span></h3>' +
    '<div class="cgrid"><label>' + T('Art', 'Type') + sel('type', AT.TYPES) + '</label><label>' + T('Bevölkerungsdichte', 'Density') + sel('density', AT.DENS) + '</label><label>' + T('Reichtum', 'Wealth') + sel('wealth', AT.WEALTH) + '</label>' + numIn('pop', T('Einwohner (ca.)', 'Population (approx.)')) + numIn('lodging', T('Unterkünfte', 'Lodging')) + numIn('restaurants', T('Restaurants', 'Restaurants')) + numIn('shops', T('Geschäfte', 'Shops')) + '</div>' +
    '<div class="tiny muted">' + esc(S.lang === 'en' ? '' : (AT.TYPE_DESC[ci.type] || '')) + (ci.manual ? (S.lang === 'en' ? '' : ' · ') + '✏️ ' + T('Zahlen von Hand gesetzt', 'numbers set by hand') : ' · ' + T('Zahlen folgen Art, Dichte und Reichtum', 'numbers follow type, density and wealth')) + '</div>' +
    '<div class="row" style="margin:.3em 0"><button class="btn sm" data-a="cityReroll">🎲 ' + T('Zahlen vorschlagen', 'Suggest numbers') + '</button></div>' +
    '<h4 class="kick">👥 ' + T('Völker', 'Peoples') + ' <span class="tiny ' + (sum === 100 ? '' : 'warn') + '">Σ ' + sum + ' %</span></h4><datalist id="dl-races">' + AT.RACES.map(r => '<option value="' + esc(r) + '">').join('') + '</datalist>' +
    (ci.races || []).map((r, i) => '<div class="rrow"><input type="text" list="dl-races" data-in="cityRace" data-i="' + i + '" data-k="n" value="' + esc(r.n) + '"><input type="number" min="0" max="100" data-in="cityRace" data-i="' + i + '" data-k="p" value="' + (+r.p || 0) + '"> %<button class="btn sm ghost" data-a="cityRaceDel" data-i="' + i + '">×</button></div>').join('') +
    '<div class="row"><button class="btn sm" data-a="cityRaceAdd">＋ ' + T('Volk', 'People') + '</button><button class="btn sm" data-a="cityRaceNorm">↻ 100 %</button><button class="btn sm" data-a="cityRaceRoll">🎲</button></div>' +
    '<label class="blk">' + T('Notizen zum Ort', 'Notes on this place') + '<textarea data-in="cityNote" placeholder="' + T('Herrscher, Fraktionen, Stimmung, Geheimnisse …', 'Rulers, factions, mood, secrets …') + '">' + esc(ci.notes) + '</textarea></label>' +
    '<div class="row" style="margin-top:.4em"><button class="btn sm primary" data-a="npcHere" data-v="' + esc(ci.name) + '">⚡ ' + T('NSC hier', 'NPC here') + '</button><button class="btn sm primary" data-a="poiHere" data-v="' + esc(ci.name) + '">🏛️ ' + T('PoI hier', 'PoI here') + '</button>' + (ci.cmap ? '<button class="btn sm gold" data-a="cityMap">🏘️ ' + T('Stadtkarte', 'City map') + '</button>' : '') + '<span class="sp"></span><button class="btn sm ghost" data-a="cityDel">🗑️</button></div>' +
    (pois.length ? '<h4 class="kick">🏛️ ' + T('PoI hier', 'PoI here') + '</h4>' + pois.map(p => '<div class="li" data-a="openPoi" data-id="' + p.id + '"><span class="st">' + V.poiIcon(p) + '</span><div><b>' + esc(p.name) + '</b> <span class="tiny muted">' + esc(V.poiKind(p)) + '</span></div></div>').join('') : '') +
    (npcs.length ? '<h4 class="kick">🎭 ' + T('NSCs hier', 'NPCs here') + '</h4>' + npcs.map(n => '<div class="li" data-a="openNpc" data-id="' + n.id + '"><div><b>' + esc(n.name) + '</b> <span class="tiny muted">' + esc(V.npcProf(n)) + '</span></div></div>').join('') : '');
};
const curCity = () => { const m = V.curMap(); return m && m.cities.find(c => c.id === S.selCity); };
function cityNumbersFollow(c) { if (!c.manual) AT.reroll(c, false); }

/* ---------- PoI ---------- */
/* PoI aus dem Atlas / der Kartenschmiede übernehmen – gleiches Modell: id, name, kind, kindText, city, owner, style, district, notes, x, y (+ goods, traits, npcIds) */
const LEG = { Gemischtwaren: 'general', Schmiede: 'smithy', Waffenschmied: 'weaponsmith', 'Rüstungsschmied': 'armorer', Alchemist: 'alchemist', 'Kräuterladen': 'herbalist', Schneider: 'tailor', Juwelier: 'jeweler', Buchhandlung: 'bookshop', Magieladen: 'magic', 'Bäckerei': 'bakery', Metzger: 'butcher', Marktstand: 'market', Stall: 'stable', Bogner: 'bowyer', Schreiner: 'carpentry', Pfandleiher: 'pawn', 'Schänke': 'tavern', Gasthaus: 'inn', Restaurant: 'tavern', Rathaus: 'townhall', Tempel: 'temple', Schrein: 'shrine', Wache: 'guardhouse', Palast: 'palace', Festung: 'castle', Gildenhaus: 'guildhall', Hafenmeisterei: 'harbor' };
const LEGS = { 'für Arme': 'poor', 'bürgerlich': 'common', 'für Reiche': 'rich', 'beschränkter Zutritt': 'restricted' };
V.importAtlasPois = function (cities) {
  const c = S.camp; let add = 0, upd = 0, del = 0;
  (cities || []).forEach(ci => {
    if (!ci || !Array.isArray(ci.pois)) return; const ids = new Set();
    ci.pois.forEach(ap => {
      if (!ap || !ap.id) return; ids.add(ap.id);
      const kind = P.KBY[ap.kind] ? ap.kind : (LEG[ap.kind] || 'custom'), style = LEGS[ap.style] || (P.STYLES[ap.style] ? ap.style : ''), district = P.DISTRICTS[ap.district] ? ap.district : '';
      const sh = { name: ap.name || '', kind, city: ci.name || ap.city || '', owner: ap.owner || '', notes: ap.notes || '', atlas: true };
      if (kind === 'custom') sh.kindText = ap.kindText || (ap.kind !== 'custom' ? ap.kind : '') || '';
      if (style) sh.style = style; if (district) sh.district = district; if (ap.styleText) sh.styleText = ap.styleText; if (ap.styleF) sh.styleF = ap.styleF;
      if (ap.x != null) { sh.x = ap.x; sh.y = ap.y; }
      let p = c.pois.find(x => x.id === ap.id);
      if (p) { if (ap.x == null) { delete p.x; delete p.y; } Object.assign(p, sh); if (Array.isArray(ap.goods) && ap.goods.length && !(p.goods || []).length) p.goods = ap.goods; p.updated = Date.now(); upd++; }
      else { const base = Object.assign({ id: ap.id, npcIds: (ap.npcIds || []).filter(id => c.npcs.some(n => n.id === id)), goods: ap.goods || [], traits: ap.traits || {}, notes: '', created: Date.now(), updated: Date.now() }, sh);
        base.lock = Object.assign({}, ap.lock, { name: true, kind: true }); if (style) base.lock.style = true; if (district) base.lock.district = true; if (base.goods.length) base.lock.goods = true; Object.keys(base.traits).forEach(k => { base.lock['t_' + k] = true; });
        p = P.rollPoi(base, { cityWealth: ci.wealth || 'normal', owner: base.owner }, S.lang); if (!ap.lock || !ap.lock.goods) delete p.lock.goods; Object.keys(base.traits).forEach(k => { if (!ap.lock || !ap.lock['t_' + k]) delete p.lock['t_' + k]; });
        c.pois.push(p); add++; }
    });
    const lo = (ci.name || '').toLowerCase(), n0 = c.pois.length;
    c.pois = c.pois.filter(p => !(p.atlas && (p.city || '').toLowerCase() === lo && !ids.has(p.id))); del += n0 - c.pois.length;
  });
  if (S.poi && !S.poiNew && !c.pois.includes(S.poi)) S.poi = c.pois.find(x => x.id === S.poi.id) || null;
  return { add, upd, del };
};
V.newPoiDraft = function (preset) {
  preset = preset || {};
  const base = Object.assign({ id: uid(), kind: 'tavern', city: '', npcIds: [], goods: [], traits: {}, lock: {}, notes: '', created: Date.now() }, preset);
  if (preset.kind) base.lock.kind = true;
  S.poi = P.rollPoi(base, poiCtx(base), S.lang); S.poiNew = true;
};
function lockBtn(p, k) { const on = p.lock && p.lock[k]; return '<button class="lk ' + (on ? 'on' : '') + '" data-a="poiLock" data-k="' + k + '" title="' + (on ? T('Gesperrt – „Alles würfeln“ lässt dieses Feld in Ruhe.', 'Locked – "Roll all" leaves this field alone.') : T('Frei – wird beim Würfeln neu bestimmt.', 'Free – rerolled by "Roll all".')) + '">' + (on ? '🔒' : '🔓') + '</button>'; }
const dieBtn = k => '<button class="dz" data-a="poiRoll" data-k="' + k + '" title="' + T('Neu würfeln', 'Reroll') + '">🎲</button>';
V.renderPois = function () {
  if (!S.poi) V.newPoiDraft();
  return '<div class="split npcs"><div class="mainc">' + poiEditor() + '</div><div class="side">' + poiList() + '</div></div>';
};
function priceInfo(p) {
  const cw = cityWealthOf(p.city); const st = P.STYLES[p.style] || P.STYLES.common; const di = P.DISTRICTS[p.district] || P.DISTRICTS.civic;
  const sf = p.style === 'custom' && +p.styleF > 0 ? +p.styleF : st.f;
  return T('Preisniveau', 'Price level') + ' <b>×' + num2(P.priceFactor(p, cw)) + '</b> = ' + T('Stil', 'style') + ' ×' + num2(sf) + ' · ' + T('Umgebung', 'district') + ' ×' + num2(di.f) + ' · ' + T('Stadt', 'town') + ' (' + esc(tA(cw)) + ') ×' + num2(P.CITY_F[cw] || 1);
}
function poiEditor() {
  const p = S.poi; const c = S.camp; const K = P.KBY[p.kind]; const ci = V.findCity(p.city);
  const kindOpts = P.KIND_GROUPS.map((g, gi) => '<optgroup label="' + esc(L(g)) + '">' + P.KINDS.filter(k => k.grp === gi).map(k => '<option value="' + k.k + '"' + (p.kind === k.k ? ' selected' : '') + '>' + k.icon + ' ' + esc(L([k.de, k.en])) + '</option>').join('') + '</optgroup>').join('') + '<option value="custom"' + (p.kind === 'custom' ? ' selected' : '') + '>✏️ ' + T('Eigene Art …', 'Custom kind …') + '</option>';
  const npcs = (p.npcIds || []).map(id => c.npcs.find(n => n.id === id)).filter(Boolean);
  const wild = K && K.wild;
  let h = '<div class="card npced poied"><h3><span>' + (S.poiNew ? '🏛️ ' + T('Neuer Point of Interest', 'New point of interest') : V.poiIcon(p) + ' ' + esc(p.name || 'PoI')) + '</span><span class="r">' + (S.poiNew ? '' : '<button class="btn sm" data-a="poiDup">⧉ ' + T('Kopie', 'Copy') + '</button> <button class="btn sm" data-a="poiMark">📍 ' + T('Auf Karte', 'On map') + '</button> <button class="btn sm ghost" data-a="poiDel">🗑️</button> ') + '<button class="btn sm" data-a="poiNew">＋ ' + T('Neu', 'New') + '</button></span></h3>' +
    '<div class="ngrid">' +
    '<label class="wide">' + T('Name', 'Name') + '<span class="fld"><input type="text" class="nmin" data-in="poi" data-k="name" data-lk="name" value="' + esc(p.name) + '">' + dieBtn('name') + lockBtn(p, 'name') + '</span></label>' +
    '<label>' + T('Art der Location', 'Kind of location') + '<span class="fld"><select data-ch="poiKind">' + kindOpts + '</select>' + lockBtn(p, 'kind') + '</span>' + (p.kind === 'custom' ? '<input type="text" data-in="poi" data-k="kindText" value="' + esc(p.kindText) + '" placeholder="' + T('z. B. Leuchtende Grotte, Gauklerwagen', 'e.g. glowing grotto, jester\'s wagon') + '">' : '') + '</label>' +
    '<label>' + T('Stadt', 'Town') + '<span class="fld"><input type="text" list="dl-cities" data-in="poiCity" value="' + esc(p.city) + '" placeholder="' + T('aus der Karte oder frei', 'from the map or free text') + '"></span>' + (ci ? '<span class="tiny muted">' + esc([tA(ci.city.type), tA(ci.city.wealth)].filter(Boolean).join(' · ')) + '</span>' : (p.city ? '<span class="tiny muted">' + T('nicht auf der Karte – Reichtum „normal“', 'not on the map – wealth "normal"') + '</span>' : '')) + '</label>' +
    '<label>' + T('Betreiber', 'Proprietor') + '<span class="fld"><input type="text" data-in="poi" data-k="owner" value="' + esc(p.owner || '') + '" placeholder="' + T('Name – oder unten einen NSC verknüpfen', 'name – or link an NPC below') + '"></span>' + (p.atlas ? '<span class="tiny muted">🧭 ' + T('aus dem Atlas', 'from the Atlas') + (p.x != null ? ' · ' + T('auf der Stadtkarte verortet', 'placed on the city map') : '') + '</span>' : '') + '</label>' +
    '<label>' + T('Stil', 'Style') + '<span class="fld"><select data-ch="poiStyle">' + Object.keys(P.STYLES).map(k => '<option value="' + k + '"' + (p.style === k ? ' selected' : '') + '>' + esc(L(P.STYLES[k].n)) + '</option>').join('') + '</select>' + dieBtn('style') + lockBtn(p, 'style') + '</span>' + (p.style === 'custom' ? '<span class="fld"><input type="text" data-in="poi" data-k="styleText" value="' + esc(p.styleText) + '" placeholder="' + T('z. B. nur für Gildenmitglieder', 'e.g. guild members only') + '"><span class="tiny">' + T('Preis ×', 'Price ×') + '</span><input type="number" step="0.1" min="0.1" data-in="poiStyleF" value="' + esc(p.styleF || 1) + '"></span>' : '') + '</label>' +
    '<label>' + T('Umgebung', 'Surroundings') + '<span class="fld"><select data-ch="poiDistrict">' + Object.keys(P.DISTRICTS).map(k => '<option value="' + k + '"' + (p.district === k ? ' selected' : '') + '>' + esc(L(P.DISTRICTS[k].n)) + '</option>').join('') + '</select>' + dieBtn('district') + lockBtn(p, 'district') + '</span></label>' +
    '</div><div class="hint pinfo">💰 ' + priceInfo(p) + '</div>' +
    '<h4 class="kick">🎭 ' + T('Verknüpfte NSCs', 'Linked NPCs') + '</h4><div class="chips">' + (npcs.length ? npcs.map(n => '<span class="npcchip" data-a="openNpc" data-id="' + n.id + '"><b>' + esc(n.name) + '</b> <span class="tiny">' + esc(V.npcProf(n)) + '</span><button class="x" data-a="poiUnlink" data-id="' + n.id + '" title="' + T('Verknüpfung lösen', 'Unlink') + '">×</button></span>').join('') : '<span class="muted small">' + T('Noch kein NSC verknüpft.', 'No NPC linked yet.') + '</span>') + '</div>' +
    '<div class="row" style="margin-top:.35em">' + (c.npcs.length > npcs.length ? '<select data-ch="poiLink"><option value="">＋ ' + T('NSC verknüpfen …', 'Link NPC …') + '</option>' + c.npcs.filter(n => !npcs.includes(n)).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(n => '<option value="' + n.id + '">' + esc(n.name) + ' – ' + esc(V.npcProf(n)) + (n.city ? ' (' + esc(n.city) + ')' : '') + '</option>').join('') + '</select>' : '') +
    '<button class="btn sm primary" data-a="poiMakeNpc">⚡ ' + (K && K.prof ? T('Betreiber erstellen', 'Create proprietor') + ' (' + esc(G.profLabel(K.prof, 'm', S.lang)) + ')' : T('NSC erstellen', 'Create NPC')) + '</button></div>' +
    '<h4 class="kick">' + (wild ? '💎 ' + T('Funde & Schätze', 'Finds & treasure') : '🛒 ' + T('Waren & Dienstleistungen', 'Goods & services')) + ' ' + lockBtn(p, 'goods') + '</h4>' +
    '<table class="goods"><tr><th>' + T('Bezeichnung', 'Item') + '</th><th>' + (wild ? T('Wert', 'Value') : T('Preis', 'Price')) + '</th><th>' + T('pro', 'per') + '</th><th></th></tr>' +
    (p.goods || []).map((g, i) => '<tr class="' + (g.manual ? 'man' : '') + '"><td><input type="text" data-in="poiGood" data-i="' + i + '" data-k="n" value="' + esc(g.n) + '"></td><td><input type="text" class="pr" data-ch="poiPrice" data-i="' + i + '" value="' + esc(fmt(g.price)) + '" title="' + (g.manual ? T('Von Hand gesetzt – bleibt beim Neuberechnen erhalten', 'Set by hand – kept when recalculating') : T('Berechnet', 'Calculated') + (g.base ? ': ' + T('Grundpreis', 'base') + ' ' + fmt(g.base) : '')) + '">' + (g.manual ? '<span class="tiny" title="' + T('von Hand', 'by hand') + '">✏️</span>' : '') + '</td><td><input type="text" class="un" data-in="poiGood" data-i="' + i + '" data-k="unit" value="' + esc(g.unit) + '"></td><td><button class="btn sm ghost" data-a="poiGoodDel" data-i="' + i + '">×</button></td></tr>').join('') +
    '</table><div class="row goodsbar"><button class="btn sm" data-a="poiGoodAdd">＋ ' + T('Eigener Eintrag', 'Custom entry') + '</button>' + (K ? '<select data-ch="poiGoodPick"><option value="">＋ ' + T('Aus dem Sortiment', 'From the range') + ' …</option>' + K.goods.filter(k => !(p.goods || []).some(g => g.key === k)).map(k => '<option value="' + k + '">' + esc(L([P.C[k][0], P.C[k][1]])) + '</option>').join('') + '</select>' : '') + '<button class="btn sm gold" data-a="poiRoll" data-k="goods">🎲 ' + T('Sortiment würfeln', 'Roll range') + '</button><button class="btn sm" data-a="poiReprice">↻ ' + T('Preise neu berechnen', 'Recalculate prices') + '</button></div>' +
    '<div class="tiny muted">' + T('Preise eingeben wie „2 GM 5 SM“, „8 KM“ oder „3“ (= GM). Von Hand geänderte Preise (✏️) bleiben beim Würfeln und Neuberechnen erhalten; „Preise neu berechnen“ fragt, ob auch sie zurückgesetzt werden.', 'Enter prices like "2 gp 5 sp", "8 cp" or "3" (= gp). Prices changed by hand (✏️) are kept when rolling or recalculating; "Recalculate prices" asks whether to reset them too.') + '</div>' +
    '<h4 class="kick">✨ ' + T('Eigenschaften', 'Traits') + ' <button class="btn sm gold" data-a="poiRollAll">🎲 ' + T('Alles würfeln', 'Roll all') + '</button></h4><div class="traits">' +
    P.PTRAIT_KEYS.map(k => '<label><span class="tn">' + esc(L(P.PTRAITS[k].n)) + '</span><span class="fld"><input type="text" data-in="poiTrait" data-k="' + k + '" value="' + esc(p.traits[k]) + '">' + dieBtn('t_' + k) + lockBtn(p, 't_' + k) + '</span></label>').join('') + '</div>' +
    '<h4 class="kick">🖋️ ' + T('Notizen', 'Notes') + '</h4><textarea data-in="poi" data-k="notes" placeholder="' + T('Räume, Wachen, Geheimnisse, was die Gruppe hier erlebt hat …', 'Rooms, guards, secrets, what the party experienced here …') + '">' + esc(p.notes) + '</textarea>' +
    '<div class="foot">' + (S.poiNew ? '<button class="btn primary" data-a="poiSave">💾 ' + T('PoI speichern', 'Save PoI') + '</button>' : '<span class="small muted">✔ ' + T('Änderungen werden automatisch gespeichert.', 'Changes are saved automatically.') + '</span>') + '</div></div>' + V.cityDatalist();
  return h;
}
function poiList() {
  const c = S.camp; const q = (S.poiQ || '').toLowerCase();
  const list = c.pois.filter(p => (!q || [p.name, V.poiKind(p), p.city, p.notes, (p.goods || []).map(g => g.n).join(' ')].join(' ').toLowerCase().includes(q)) && (!S.poiCity || (p.city || '') === S.poiCity)).sort((a, b) => (a.city || '').localeCompare(b.city || '') || (a.name || '').localeCompare(b.name || ''));
  const cities = Array.from(new Set(c.pois.map(p => p.city || ''))).filter(Boolean).sort();
  return '<div class="card"><h3>🏛️ ' + T('PoI-Liste', 'PoI list') + ' <span class="r">' + c.pois.length + '</span></h3><div class="row"><input type="text" class="grow" data-in="poiQ" value="' + esc(S.poiQ || '') + '" placeholder="🔍 ' + T('Suchen (auch Waren) …', 'Search (goods too) …') + '">' + (cities.length ? '<select data-ch="poiCityF"><option value="">' + T('Alle Orte', 'All places') + '</option>' + cities.map(x => '<option' + (S.poiCity === x ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select>' : '') + '</div><div class="npclist">' +
    (list.length ? list.map(p => '<div class="li ' + (!S.poiNew && S.poi && S.poi.id === p.id ? 'on' : '') + '" data-a="openPoi" data-id="' + p.id + '"><span class="st">' + V.poiIcon(p) + '</span><div><b>' + esc(p.name) + '</b><div class="tiny muted">' + esc([V.poiKind(p), p.city, L((P.STYLES[p.style] || P.STYLES.common).n)].filter(Boolean).join(' · ')) + '</div></div></div>').join('') : '<p class="muted small">' + (c.pois.length ? T('Keine Treffer.', 'No matches.') : T('Noch keine PoI gespeichert.', 'No PoI saved yet.')) + '</p>') + '</div></div>';
}
/* Hinweise für andere Ansichten */
V.poisOfNpc = id => (S.camp.pois || []).filter(p => (p.npcIds || []).includes(id));

/* ---------- Aktionen ---------- */
function poiSaved() { if (!S.poiNew && S.poi) { S.poi.updated = Date.now(); save(); } }
function lockOn(k) { S.poi.lock = S.poi.lock || {}; S.poi.lock[k] = true; }
function rollField(p, k) {
  const ctx = poiCtx(p); const K = P.KBY[p.kind];
  if (k === 'name') p.name = P.rollPoiName(p.kind, { owner: ctx.owner, city: p.city, kindText: p.kindText }, S.lang);
  else if (k === 'style') { const r = P.rollPoi(Object.assign({}, p, { lock: Object.assign({}, allLocked(), { style: false }) }), ctx, S.lang); p.style = r.style; P.repriceAll(p, ctx.cityWealth); }
  else if (k === 'district') { const keys = Object.keys(P.DISTRICTS); p.district = K && K.dist === 'outside' ? 'outside' : keys[Math.floor(Math.random() * keys.length)]; P.repriceAll(p, ctx.cityWealth); }
  else if (k === 'goods') { const keep = (p.goods || []).filter(g => g.manual || !g.key); p.goods = P.rollGoods(p.kind, p, ctx.cityWealth, S.lang).filter(g => !keep.some(x => x.key && x.key === g.key)).concat(keep); }
  else if (k.startsWith('t_')) p.traits[k.slice(2)] = P.rollPTrait(k.slice(2), S.lang, p.traits[k.slice(2)]);
}
function allLocked() { const o = { kind: true, name: true, style: true, district: true, goods: true }; P.PTRAIT_KEYS.forEach(k => { o['t_' + k] = true; }); return o; }
function repatch() { const el = $('.pinfo'); if (el && S.poi) el.innerHTML = '💰 ' + priceInfo(S.poi); $$('[data-ch="poiPrice"]').forEach(i => { const g = S.poi.goods[+i.dataset.i]; if (g && document.activeElement !== i) i.value = fmt(g.price); }); }
Object.assign(V.A, {
  poiNew() { V.newPoiDraft({ city: S.poi && S.poi.city || '' }); render(); },
  poiHere(el) { V.newPoiDraft({ city: el.dataset.v }); S.tab = 'pois'; render(); },
  openPoi(el, ev) { if (ev && ev.target.closest('.x')) return; const p = S.camp.pois.find(x => x.id === el.dataset.id); if (!p) return; S.poi = p; S.poiNew = false; S.tab = 'pois'; S.modal = null; render(); W.scrollTo(0, 0); },
  poiLock(el) { const k = el.dataset.k; S.poi.lock[k] = !S.poi.lock[k]; poiSaved(); render(); },
  poiRoll(el) { rollField(S.poi, el.dataset.k); poiSaved(); render(); },
  poiRollAll() { const p = S.poi; Object.assign(p, P.rollPoi(p, poiCtx(p), S.lang)); poiSaved(); render(); },
  poiReprice() {
    const p = S.poi; const cw = cityWealthOf(p.city); const man = p.goods.filter(g => g.manual && g.base > 0);
    if (man.length && W.confirm(T(man.length + ' Preis(e) wurden von Hand gesetzt. Auch diese neu berechnen?', man.length + ' price(s) were set by hand. Recalculate those as well?'))) man.forEach(g => { g.manual = false; });
    P.repriceAll(p, cw); poiSaved(); render();
  },
  poiGoodAdd() { S.poi.goods.push({ id: uid(), key: '', n: '', unit: L(P.U.pc), base: 0, price: 0, manual: true }); poiSaved(); render(); setTimeout(() => { const ins = $$('[data-in="poiGood"][data-k="n"]'); if (ins.length) ins[ins.length - 1].focus(); }, 20); },
  poiGoodDel(el) { S.poi.goods.splice(+el.dataset.i, 1); poiSaved(); render(); },
  poiSave() {
    const p = S.poi; if (!p.name || !p.name.trim()) { toast(T('Bitte einen Namen eingeben.', 'Please enter a name.')); return; }
    p.created = Date.now(); p.updated = Date.now(); S.camp.pois.push(p); S.poiNew = false; save(); toast('💾 ' + p.name); render();
  },
  poiDup() { const c = JSON.parse(JSON.stringify(S.poi)); c.id = uid(); c.name += T(' (Kopie)', ' (copy)'); S.poi = c; S.poiNew = true; render(); },
  poiDel() { const p = S.poi; S.modal = () => V.confirmDlg('🗑️ ' + esc(p.name), T('PoI löschen? Verknüpfte NSCs bleiben erhalten.', 'Delete PoI? Linked NPCs are kept.'), 'poiDelDo', p.id); render(); },
  poiDelDo(el) { const id = el.dataset.id; S.camp.pois = S.camp.pois.filter(p => p.id !== id); S.camp.maps.forEach(m => m.markers.forEach(k => { if (k.poiId === id) k.poiId = null; })); S.poi = null; S.modal = null; save(); render(); },
  poiUnlink(el) { S.poi.npcIds = S.poi.npcIds.filter(x => x !== el.dataset.id); poiSaved(); render(); },
  poiMakeNpc() {
    const p = S.poi; const K = P.KBY[p.kind]; const base = { id: uid(), prof: K && K.prof ? K.prof : 'commoner', city: p.city || '', traits: {}, lock: { prof: true }, notes: '', sessions: [], created: Date.now() };
    if (!G.PROF_BY[base.prof]) base.prof = 'shopkeeper';
    const ci = V.findCity(p.city); const n = G.rollNpc(base, ci ? { cityRaces: ci.city.races, cityWealth: ci.city.wealth } : {}, S.lang); n.sb = G.statBlock(n.prof);
    // Reichtum an den Stil anpassen
    if (p.style === 'rich' && n.wealth < 4) n.wealth = 4; if (p.style === 'poor' && n.wealth > 2) n.wealth = 2;
    n.purse = G.rollPurse(n.wealth, S.lang); n.name = G.rollName({ race: n.race, gender: n.gender, wealth: n.wealth, prof: n.prof, city: n.city }, S.lang);
    n.notes = T('Zu finden in: ', 'Found at: ') + (p.name || '');
    S.camp.npcs.push(n); p.npcIds = (p.npcIds || []).concat(n.id); if (!p.owner) p.owner = n.name;
    if (S.poiNew) { p.created = Date.now(); S.camp.pois.push(p); S.poiNew = false; }
    p.updated = Date.now(); save(); toast('⚡ ' + n.name + ' – ' + G.profLabel(n.prof, n.gender, S.lang)); render();
  },
  poiMark() { if (!S.camp.maps.length) { toast(T('Bitte zuerst eine Karte hochladen.', 'Please upload a map first.')); S.tab = 'map'; render(); return; } S.pendingPoi = S.poi.id; S.pendingNpc = null; S.mapMode = 'add'; S.curType = 'place'; S.tab = 'map'; render(); toast(T('Klicke auf die Karte, um „' + S.poi.name + '“ zu markieren.', 'Click the map to mark "' + S.poi.name + '".'), 4000); },
  npcPoiUnlink(el) { const p = S.camp.pois.find(x => x.id === el.dataset.id); if (p) { p.npcIds = p.npcIds.filter(x => x !== S.npc.id); save(); render(); } },
  // Orte
  cityMap() {
    const ci = curCity(); if (!ci || !ci.cmap) return;
    S.modal = () => { const list = (S.camp.pois || []).filter(q => q.city && q.city.toLowerCase() === (ci.name || '').toLowerCase()).sort((a, b) => (a.name || '').localeCompare(b.name || '')), r = Math.max(9, ci.cmap.w / 110);
      return '<h2>🏘️ ' + esc(ci.name) + '</h2><div class="cmapG"><div class="cmapV"><img src="' + ci.cmap.src + '" alt=""><svg viewBox="0 0 ' + ci.cmap.w + ' ' + ci.cmap.h + '">' + list.map((q, i) => q.x == null ? '' : '<g class="pin" data-a="openPoi" data-id="' + q.id + '"><title>' + esc(q.name + ' (' + V.poiKind(q) + ')') + '</title><circle cx="' + q.x + '" cy="' + q.y + '" r="' + r + '"/><text x="' + q.x + '" y="' + (q.y + r * .38) + '" font-size="' + r * 1.05 + '">' + (i + 1) + '</text></g>').join('') + '</svg></div>' +
        '<div class="cmapS">' + (list.length ? list.map((q, i) => '<div class="li" data-a="openPoi" data-id="' + q.id + '"><span class="st">' + (i + 1) + '</span><div><b>' + esc(q.name) + '</b> <span class="tiny muted">' + V.poiIcon(q) + ' ' + esc(V.poiKind(q)) + (q.x == null ? ' · ?' : '') + '</span></div></div>').join('') : '<p class="muted small">' + T('Noch keine PoI in diesem Ort.', 'No PoI in this place yet.') + '</p>') + '</div></div><p class="tiny muted">' + T('Ein Klick auf Marker oder Eintrag öffnet den PoI zum Bearbeiten. Verortet werden PoI im Atlas oder in der Kartenschmiede.', 'Click a marker or an entry to edit the PoI. PoI are placed in the Atlas or the Map Forge.') + '</p><div class="foot"><button class="btn" data-a="closeModal">' + T('Schließen', 'Close') + '</button></div>'; };
    S.modal.cls = 'wide'; render();
  },
  atlasExport() {
    const m = V.curMap(); if (!m) return;
    const cities = m.cities.map(c => Object.assign({ races: [], notes: '', pop: 0, lodging: 0, restaurants: 0, shops: 0, type: 'Ortschaft', density: 'mittel', wealth: 'normal', manual: false, src: 'session' }, c, { pois: (S.camp.pois || []).filter(q => q.city && q.city.toLowerCase() === (c.name || '').toLowerCase()).map(q => JSON.parse(JSON.stringify(q))) }));
    const p = { app: 'The Ultimate DND5e Atlas', version: 1, savedAt: new Date().toISOString(), map: { name: m.name, kind: m.kind, w: m.w, h: m.h, src: m.src }, cities, labels: [], fonts: [], lstyle: null };
    V.download(String(m.name || 'Karte').replace(/[\\/:*?"<>|]+/g, '_') + '_Atlas.json', new Blob([JSON.stringify(p)], { type: 'application/json' }));
    toast('💾 ' + T('Atlas-Datei gespeichert – im Atlas mit „Projekt laden“ öffnen. Orte und PoI sind enthalten, Beschriftungen aus dem Atlas nicht.', 'Atlas file saved – open it in the Atlas with "Load project". Places and PoI are included, labels made in the Atlas are not.'), 5000);
  },
  cityReroll() { const c = curCity(); c.manual = false; AT.reroll(c, false); save(); render(); },
  cityRaceAdd() { const c = curCity(); c.races = c.races || []; c.races.push({ n: '', p: 0 }); save(); render(); },
  cityRaceDel(el) { const c = curCity(); c.races.splice(+el.dataset.i, 1); save(); render(); },
  cityRaceNorm() { const c = curCity(); c.races = AT.normalize(c.races || []); save(); render(); },
  cityRaceRoll() { const c = curCity(); c.races = AT.suggestRaces(c); save(); render(); },
  cityDel() { const c = curCity(); S.modal = () => V.confirmDlg('🗑️ ' + esc(c.name || T('Ort', 'Place')), T('Ort von der Karte entfernen? NSCs und PoI behalten den Stadtnamen.', 'Remove the place from the map? NPCs and PoI keep the town name.'), 'cityDelDo', c.id); render(); },
  cityDelDo(el) { const m = V.curMap(); m.cities = m.cities.filter(c => c.id !== el.dataset.id); S.selCity = null; S.modal = null; save(); render(); }
});
Object.assign(V.IN, {
  poi(el) { const k = el.dataset.k; S.poi[k] = el.value; if (el.dataset.lk) lockOn(el.dataset.lk); poiSaved(); if (k === 'name' && !S.poiNew) V.scheduleRender(900); },
  poiCity(el) { S.poi.city = el.value; P.repriceAll(S.poi, cityWealthOf(S.poi.city)); poiSaved(); repatch(); V.scheduleRender(900); },
  poiStyleF(el) { S.poi.styleF = parseFloat(String(el.value).replace(',', '.')) || 1; P.repriceAll(S.poi, cityWealthOf(S.poi.city)); poiSaved(); repatch(); },
  poiGood(el) { const g = S.poi.goods[+el.dataset.i]; if (g) { g[el.dataset.k] = el.value; poiSaved(); } },
  poiTrait(el) { S.poi.traits[el.dataset.k] = el.value; lockOn('t_' + el.dataset.k); poiSaved(); },
  poiQ(el) { S.poiQ = el.value; V.scheduleRender(250); },
  cityN(el) { const c = curCity(); c[el.dataset.k] = Math.max(0, parseInt(el.value, 10) || 0); c.manual = true; save(); },
  cityRace(el) { const c = curCity(); const r = c.races[+el.dataset.i]; if (!r) return; r[el.dataset.k] = el.dataset.k === 'p' ? (parseInt(el.value, 10) || 0) : el.value; save(); },
  cityNote(el) { const c = curCity(); c.notes = el.value; save(); }
});
Object.assign(V.CH, {
  poiKind(el) { const p = S.poi; p.kind = el.value; lockOn('kind'); if (el.value !== 'custom') { const K = P.KBY[p.kind]; if (!p.lock.style) p.style = K.style; if (!p.lock.district) p.district = K.dist; ['goods', 'name'].forEach(k => { if (!p.lock[k]) rollField(p, k); }); } poiSaved(); render(); },
  poiStyle(el) { const p = S.poi; p.style = el.value; lockOn('style'); if (p.style === 'custom' && !p.styleF) p.styleF = 1; P.repriceAll(p, cityWealthOf(p.city)); poiSaved(); render(); },
  poiDistrict(el) { const p = S.poi; p.district = el.value; lockOn('district'); P.repriceAll(p, cityWealthOf(p.city)); poiSaved(); render(); },
  poiPrice(el) { const g = S.poi.goods[+el.dataset.i]; const v = P.parsePrice(el.value); if (v === null) { el.value = fmt(g.price); return; } g.price = v; g.manual = true; if (!g.base) g.base = 0; poiSaved(); render(); },
  poiGoodPick(el) { if (!el.value) return; const p = S.poi; const k = el.value; const c = P.C[k]; const find = c[3] === 'find'; const g = { id: uid(), key: k, n: L([c[0], c[1]]), unit: L(P.U[c[3]]), base: c[2], j: 1, find, manual: false }; g.price = find ? c[2] : P.priceOf(c[2], p, cityWealthOf(p.city), 1); p.goods.push(g); poiSaved(); render(); },
  poiLink(el) { if (!el.value) return; S.poi.npcIds = (S.poi.npcIds || []).concat(el.value); if (!S.poi.lock.name && S.poiNew) rollField(S.poi, 'name'); poiSaved(); render(); },
  poiCityF(el) { S.poiCity = el.value; render(); },
  npcPoiLink(el) { const p = S.camp.pois.find(x => x.id === el.value); if (p && !p.npcIds.includes(S.npc.id)) { p.npcIds.push(S.npc.id); save(); } render(); },
  mkPoi(el) { const m = V.curMap(); const k = m.markers.find(x => x.id === S.selMarker); k.poiId = el.value || null; const p = S.camp.pois.find(x => x.id === k.poiId); if (p && !k.label) k.label = p.name; save(); render(); },
  cityF(el) { const c = curCity(); const k = el.dataset.k; c[k] = el.value; cityNumbersFollow(c); save(); render(); },
  cityName(el) {
    const c = curCity(); const old = (c.name || '').trim(); const nw = el.value.trim(); c.name = nw;
    if (old && nw && old !== nw) { const lo = old.toLowerCase(); let n = 0; S.camp.npcs.forEach(x => { if ((x.city || '').toLowerCase() === lo) { x.city = nw; n++; } }); S.camp.pois.forEach(x => { if ((x.city || '').toLowerCase() === lo) { x.city = nw; n++; } }); S.camp.sessions.forEach(x => { if ((x.place || '').toLowerCase() === lo) x.place = nw; }); S.camp.quests.forEach(x => { if ((x.place || '').toLowerCase() === lo) x.place = nw; }); if (n) toast(T(n + ' NSC/PoI auf „' + nw + '“ umgestellt', n + ' NPC/PoI moved to "' + nw + '"')); }
    save(); render();
  }
});
})(window);
