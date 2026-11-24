/* DND5e Sessionverwaltung – Karte mit Markern */
(function (W) {
'use strict';
const V = W.SV; const { $, $$, esc, S, T, L, uid, save, toast } = V;
const ICONS = ['🛡️', '⚔️', '🎭', '❗', '❓', '💰', '☠️', '🏰', '⛺', '📜', '🐉', '👑', '🗝️', '🔥', '🌲', '⛰️', '🌊', '🕳️', '⚓', '🍺', '⛪', '⚒️', '🧙', '👁️', '🕯️', '⭐', '🚩', '🏹', '🐺', '💀', '🧭', '🪦', '🔮', '🏠', '🛒', '🐎'];
const SHAPES = [['pin', ['Nadel', 'Pin']], ['circle', ['Kreis', 'Circle']], ['square', ['Quadrat', 'Square']], ['diamond', ['Raute', 'Diamond']], ['flag', ['Fahne', 'Flag']], ['icon', ['Nur Symbol', 'Icon only']]];
V.ICONS = ICONS; V.SHAPES = SHAPES;
function mkType(m) { const ts = S.camp.markerTypes; return ts.find(t => t.id === m.type) || ts[0] || { n: ['Marker', 'Marker'], icon: '📍', color: '#8a2222', shape: 'pin', size: 30 }; }
function mkStyle(m) { const t = mkType(m); const o = m.style || {}; return { icon: o.icon || t.icon, color: o.color || t.color, shape: o.shape || t.shape, size: +(o.size || t.size || 30) }; }
V.mkType = mkType; V.mkStyle = mkStyle;
function shapeSvg(st) {
  const c = st.color, s = st.size;
  switch (st.shape) {
    case 'circle': return '<svg viewBox="0 0 40 40" width="' + s + '" height="' + s + '"><circle cx="20" cy="20" r="17" fill="' + c + '" stroke="#f6ecd2" stroke-width="3"/></svg>';
    case 'square': return '<svg viewBox="0 0 40 40" width="' + s + '" height="' + s + '"><rect x="4" y="4" width="32" height="32" rx="5" fill="' + c + '" stroke="#f6ecd2" stroke-width="3"/></svg>';
    case 'diamond': return '<svg viewBox="0 0 40 40" width="' + s + '" height="' + s + '"><path d="M20 2 L38 20 L20 38 L2 20Z" fill="' + c + '" stroke="#f6ecd2" stroke-width="3"/></svg>';
    case 'flag': return '<svg viewBox="0 0 40 40" width="' + s + '" height="' + s + '"><path d="M8 38 V3" stroke="#3b2416" stroke-width="3"/><path d="M9 4 H35 L29 12 L35 20 H9Z" fill="' + c + '" stroke="#f6ecd2" stroke-width="2"/></svg>';
    case 'icon': return '';
    default: return '<svg viewBox="0 0 40 52" width="' + s + '" height="' + Math.round(s * 1.3) + '"><path d="M20 50 C20 50 4 30 4 18 A16 16 0 0 1 36 18 C36 30 20 50 20 50Z" fill="' + c + '" stroke="#f6ecd2" stroke-width="3"/></svg>';
  }
}
function anchor(st) { // Bildschirm-Versatz des Ankerpunkts
  const s = st.size;
  if (st.shape === 'pin') return { w: s, h: Math.round(s * 1.3), ax: s / 2, ay: Math.round(s * 1.3) - 1, iy: s * .45 };
  if (st.shape === 'flag') return { w: s, h: s, ax: s * .2, ay: s * .95, iy: s * .3, ix: s * .55 };
  return { w: s, h: s, ax: s / 2, ay: s / 2, iy: s / 2 };
}
function visibleMarkers(m) {
  return m.markers.filter(k => S.mapFilter === 'all' || (S.mapFilter === 'session' ? k.sessionId === S.selSession : S.mapFilter === 'none' ? !k.sessionId : k.type === S.mapFilter.slice(2)));
}

V.renderMap = function () {
  const c = S.camp; const m = V.curMap(); const s = V.curSession();
  let h = '<div class="maptop card"><div class="row">' +
    (c.maps.length ? '<select data-ch="mapSel">' + c.maps.map(x => '<option value="' + x.id + '"' + (m && m.id === x.id ? ' selected' : '') + '>🗺️ ' + esc(x.name) + '</option>').join('') + '</select>' : '') +
    '<button class="btn sm primary" data-a="mapUpload">🖼️ ' + T('Karte hochladen', 'Upload map') + '</button>' +
    '<button class="btn sm" data-a="atlasDb" title="' + T('Karte und Orte aus dem zuletzt im Atlas geöffneten Projekt übernehmen', 'Take map and places from the project last opened in the Atlas') + '">🗺️ ' + T('Aus dem Atlas', 'From the Atlas') + '</button>' +
    '<button class="btn sm" data-a="atlasFile" title="…_Atlas.json">📂 ' + T('Atlas-Datei', 'Atlas file') + '</button>' +
    (m ? '<button class="btn sm" data-a="atlasExport" title="' + T('Karte mit allen Orten als Atlas-Projekt speichern (im Atlas öffnen)', 'Save the map with all places as an Atlas project (open it in the Atlas)') + '">💾 ' + T('Als Atlas-Datei', 'As Atlas file') + '</button><button class="btn sm ghost" data-a="mapRename" title="' + T('Umbenennen', 'Rename') + '">✏️</button><button class="btn sm ghost" data-a="mapDel" title="' + T('Karte entfernen', 'Remove map') + '">🗑️</button>' : '') +
    '<span class="sp"></span>' +
    (m ? '<select data-ch="mapFilter" title="' + T('Welche Marker zeigen?', 'Which markers to show?') + '"><option value="all"' + (S.mapFilter === 'all' ? ' selected' : '') + '>' + T('Alle Marker', 'All markers') + '</option>' + (s ? '<option value="session"' + (S.mapFilter === 'session' ? ' selected' : '') + '>' + T('Nur', 'Only') + ' ' + esc(V.sessionLabel(s)) + '</option>' : '') + '<option value="none"' + (S.mapFilter === 'none' ? ' selected' : '') + '>' + T('Ohne Session', 'Without session') + '</option>' + c.markerTypes.map(t => '<option value="t:' + t.id + '"' + (S.mapFilter === 't:' + t.id ? ' selected' : '') + '>' + t.icon + ' ' + esc(L(t.n)) + '</option>').join('') + '</select>' +
      '<label class="chk"><input type="checkbox" data-ch="showCities"' + (S.showCities ? ' checked' : '') + '> ' + T('Orte', 'Places') + '</label><label class="chk"><input type="checkbox" data-ch="showLabels"' + (S.showLabels ? ' checked' : '') + '> ' + T('Beschriftung', 'Labels') + '</label>' : '') +
    '</div>' + (m ? '<div class="row mtools"><div class="advsel"><button data-a="mapMode" data-v="select" class="' + (S.mapMode === 'select' ? 'on' : '') + '">🖐️ ' + T('Auswählen / Verschieben', 'Select / move') + '</button><button data-a="mapMode" data-v="add" class="' + (S.mapMode === 'add' ? 'on' : '') + '">📍 ' + T('Marker setzen', 'Place marker') + '</button><button data-a="mapMode" data-v="city" class="' + (S.mapMode === 'city' ? 'on' : '') + '" title="' + T('Neuen Ort (Stadt, Dorf …) auf die Karte setzen', 'Put a new place (town, village …) on the map') + '">🏘️ ' + T('Ort setzen', 'Add place') + '</button></div>' +
      '<div class="tpal">' + c.markerTypes.map(t => '<button class="tp ' + (S.curType === t.id ? 'on' : '') + '" data-a="curType" data-v="' + t.id + '" title="' + esc(L(t.n)) + '"><span class="tpi" style="background:' + t.color + '">' + t.icon + '</span>' + esc(L(t.n)) + '</button>').join('') + '<button class="btn sm ghost" data-a="mkTypes" title="' + T('Marker-Typen bearbeiten', 'Edit marker types') + '">⚙️</button></div>' +
      (s ? '<label class="chk small" title="' + T('Neue Marker gehören zur aktuellen Session', 'New markers belong to the current session') + '"><input type="checkbox" data-ch="bindSession"' + (S.bindSession ? ' checked' : '') + '> ' + T('an', 'link to') + ' ' + esc(V.sessionLabel(s)) + '</label>' : '') +
      '<span class="sp"></span><button class="btn sm" data-a="zoom" data-v="1.25">＋</button><button class="btn sm" data-a="zoom" data-v="0.8">－</button><button class="btn sm" data-a="fit">⤢</button></div>' : '') + '</div>';
  if (!m) return h + '<div class="card empty"><div class="drop" id="drop">' + T('Karte (JPG, PNG, WEBP, SVG …) oder Atlas-Projekt (…_Atlas.json) hierher ziehen', 'Drop a map (JPG, PNG, WEBP, SVG …) or an Atlas project (…_Atlas.json) here') + '</div><p class="small muted">' + T('Tipp: Wurde die Karte im DND5e Atlas bearbeitet, übernimmt „🗺️ Aus dem Atlas“ Karte und Orte samt Eigenschaften. Die Orte stehen dann auch im NSC-Generator zur Auswahl.', 'Tip: if the map was edited in the DND5e Atlas, "🗺️ From the Atlas" takes the map and places with their properties. The places are then available in the NPC generator too.') + '</p></div>';
  return h + '<div class="mapsplit"><div class="mapview ' + (S.mapMode !== 'select' ? 'adding' : '') + '" id="mapview"><div class="maplayer" id="maplayer"></div><div class="mapov" id="mapov"></div></div><div class="mapside card">' + sidePanel(m) + '</div></div>';
};
function sidePanel(m) {
  const k = S.selMarker && m.markers.find(x => x.id === S.selMarker);
  if (k) return markerEditor(m, k);
  const ci = S.selCity && m.cities.find(x => x.id === S.selCity);
  if (ci) return V.cityPanel(m, ci);
  const vis = visibleMarkers(m);
  return '<h3>📍 ' + T('Marker', 'Markers') + ' <span class="r">' + vis.length + ' / ' + m.markers.length + '</span></h3><p class="tiny muted">' + (S.mapMode === 'city' ? T('Klicke auf die Karte, um einen neuen Ort zu setzen.', 'Click the map to put a new place.') : S.mapMode === 'add' ? T('Klicke auf die Karte, um einen Marker zu setzen.', 'Click the map to place a marker.') : T('Mausrad = Zoom, Ziehen = Karte verschieben. Marker anklicken zum Bearbeiten, ziehen zum Verschieben.', 'Mouse wheel = zoom, drag = pan. Click a marker to edit it, drag to move it.')) + '</p><div class="mklist">' +
    (vis.length ? vis.map(x => { const st = mkStyle(x); const s = x.sessionId && S.camp.sessions.find(y => y.id === x.sessionId); return '<div class="li" data-a="selMarker" data-id="' + x.id + '"><span class="st">' + st.icon + '</span><div><b>' + esc(x.label || L(mkType(x).n)) + '</b><div class="tiny muted">' + esc([L(mkType(x).n), s ? '#' + s.no : ''].filter(Boolean).join(' · ')) + '</div></div></div>'; }).join('') : '<p class="small muted">' + T('Keine Marker.', 'No markers.') + '</p>') + '</div>' +
    (m.cities.length ? '<p class="tiny muted">🏘️ ' + m.cities.length + ' ' + T('Orte aus dem Atlas', 'places from the Atlas') + '</p>' : '');
}
function markerEditor(m, k) {
  const st = mkStyle(k); const c = S.camp; const t = mkType(k); const o = k.style || {};
  const npcs = c.npcs.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return '<h3>' + st.icon + ' ' + T('Marker', 'Marker') + '<span class="r"><button class="btn sm ghost" data-a="selMarker" data-id="">✖</button></span></h3>' +
    '<label class="blk">' + T('Beschriftung', 'Label') + '<input type="text" data-in="mk" data-k="label" value="' + esc(k.label) + '"></label>' +
    '<label class="blk">' + T('Typ', 'Type') + '<select data-ch="mkType">' + c.markerTypes.map(x => '<option value="' + x.id + '"' + (x.id === k.type ? ' selected' : '') + '>' + x.icon + ' ' + esc(L(x.n)) + '</option>').join('') + '</select></label>' +
    '<div class="tiny muted">' + T('Aussehen (leer = wie der Typ)', 'Look (empty = like the type)') + '</div><div class="iconpick">' + ICONS.map(i => '<button class="ip ' + (st.icon === i ? 'on' : '') + '" data-a="mkIcon" data-v="' + i + '">' + i + '</button>').join('') + '<input type="text" class="ipx" data-in="mkStyle" data-k="icon" value="' + esc(o.icon || '') + '" placeholder="' + esc(t.icon) + '" title="' + T('Eigenes Symbol (Emoji oder Zeichen)', 'Custom symbol (emoji or character)') + '"></div>' +
    '<div class="row"><label>' + T('Farbe', 'Colour') + ' <input type="color" data-in="mkStyle" data-k="color" value="' + esc(st.color) + '"></label><label>' + T('Form', 'Shape') + ' <select data-ch="mkShape">' + SHAPES.map(s => '<option value="' + s[0] + '"' + (st.shape === s[0] ? ' selected' : '') + '>' + esc(L(s[1])) + '</option>').join('') + '</select></label></div>' +
    '<label class="blk">' + T('Größe', 'Size') + ' <input type="range" min="16" max="72" data-in="mkStyle" data-k="size" value="' + st.size + '"></label>' +
    '<div class="row"><label class="chk"><input type="checkbox" data-ch="mkLabel"' + (k.hideLabel ? '' : ' checked') + '> ' + T('Beschriftung zeigen', 'Show label') + '</label>' + (k.style && Object.keys(k.style).length ? '<button class="btn sm ghost" data-a="mkReset">↺ ' + T('wie Typ', 'like type') + '</button>' : '') + '</div>' +
    '<label class="blk">' + T('Session', 'Session') + '<select data-ch="mkSession"><option value="">– ' + T('keine', 'none') + ' –</option>' + c.sessions.slice().sort((a, b) => b.no - a.no).map(s => '<option value="' + s.id + '"' + (k.sessionId === s.id ? ' selected' : '') + '>' + esc(V.sessionLabel(s)) + '</option>').join('') + '</select></label>' +
    '<label class="blk">' + T('Verknüpfter NSC', 'Linked NPC') + '<select data-ch="mkNpc"><option value="">–</option>' + npcs.map(n => '<option value="' + n.id + '"' + (k.npcId === n.id ? ' selected' : '') + '>' + esc(n.name) + '</option>').join('') + '</select></label>' +
    (k.npcId && c.npcs.find(n => n.id === k.npcId) ? '<button class="btn sm" data-a="openNpc" data-id="' + k.npcId + '">🎭 ' + T('NSC öffnen', 'Open NPC') + '</button>' : '') +
    '<label class="blk">' + T('Verknüpfter PoI', 'Linked PoI') + '<select data-ch="mkPoi"><option value="">–</option>' + (c.pois || []).map(p => '<option value="' + p.id + '"' + (k.poiId === p.id ? ' selected' : '') + '>' + V.poiIcon(p) + ' ' + esc(p.name) + '</option>').join('') + '</select></label>' +
    (k.poiId && (c.pois || []).find(p => p.id === k.poiId) ? '<button class="btn sm" data-a="openPoi" data-id="' + k.poiId + '">🏛️ ' + T('PoI öffnen', 'Open PoI') + '</button>' : '') +
    '<label class="blk">' + T('Verknüpfte Quest', 'Linked quest') + '<select data-ch="mkQuest"><option value="">–</option>' + c.quests.map(q => '<option value="' + q.id + '"' + (k.questId === q.id ? ' selected' : '') + '>' + V.QST[q.status][2] + ' ' + esc(q.title || '?') + '</option>').join('') + '</select></label>' +
    (k.questId && c.quests.find(q => q.id === k.questId) ? '<button class="btn sm" data-a="qOpen" data-id="' + k.questId + '">❗ ' + T('Quest öffnen', 'Open quest') + '</button>' : '') +
    '<label class="blk">' + T('Notiz', 'Note') + '<textarea data-in="mk" data-k="note">' + esc(k.note) + '</textarea></label>' +
    '<div class="foot"><button class="btn sm ghost" data-a="mkDel">🗑️ ' + T('Marker löschen', 'Delete marker') + '</button></div>';
}
function cityPanel(m, ci) {
  const npcs = S.camp.npcs.filter(n => n.city && n.city.toLowerCase() === (ci.name || '').toLowerCase());
  return '<h3>🏘️ ' + esc(ci.name || T('Ort', 'Place')) + '<span class="r"><button class="btn sm ghost" data-a="selCity" data-id="">✖</button></span></h3>' +
    '<table class="ptab"><tr><td>' + T('Art', 'Type') + '</td><td>' + esc(ci.type || '') + '</td></tr><tr><td>' + T('Reichtum', 'Wealth') + '</td><td>' + esc(ci.wealth || '') + '</td></tr><tr><td>' + T('Dichte', 'Density') + '</td><td>' + esc(ci.density || '') + '</td></tr>' + (ci.pop ? '<tr><td>' + T('Einwohner', 'Population') + '</td><td>~' + Number(ci.pop).toLocaleString('de-DE') + '</td></tr>' : '') +
    '<tr><td>' + T('Völker', 'Peoples') + '</td><td>' + esc((ci.races || []).filter(r => r.n).map(r => r.n + ' ' + r.p + ' %').join(', ')) + '</td></tr><tr><td>' + T('Unterkünfte / Gasthäuser / Geschäfte', 'Lodging / taverns / shops') + '</td><td>' + [ci.lodging, ci.restaurants, ci.shops].map(x => x || 0).join(' / ') + '</td></tr></table>' +
    (ci.notes ? '<div class="txt">' + esc(ci.notes) + '</div>' : '') +
    '<div class="row" style="margin-top:.5em"><button class="btn sm primary" data-a="npcHere" data-v="' + esc(ci.name) + '">⚡ ' + T('NSC hier erstellen', 'Create NPC here') + '</button></div>' +
    (npcs.length ? '<h4 class="kick">🎭 ' + T('NSCs hier', 'NPCs here') + '</h4>' + npcs.map(n => '<div class="li" data-a="openNpc" data-id="' + n.id + '"><div><b>' + esc(n.name) + '</b> <span class="tiny muted">' + esc(V.npcProf(n)) + '</span></div></div>').join('') : '');
}

/* ---------- Ansicht ---------- */
let img = null, svgUrl = null;
V.mountMap = function () {
  const m = V.curMap(); const lay = $('#maplayer'); if (!m || !lay) return;
  if (svgUrl) { URL.revokeObjectURL(svgUrl); svgUrl = null; }
  const src = m.kind === 'svg' ? (svgUrl = URL.createObjectURL(new Blob([m.src], { type: 'image/svg+xml' }))) : m.src;
  lay.innerHTML = '<img id="mapimg" draggable="false" alt="">'; img = $('#mapimg'); img.style.width = m.w + 'px'; img.style.height = m.h + 'px'; img.src = src;
  if (!S.mv.ok || S.mv.map !== m.id) fit(); else applyView();
  bindView();
};
function fit() {
  const m = V.curMap(); const v = $('#mapview'); if (!m || !v) return;
  const r = v.getBoundingClientRect(); const s = Math.min(r.width / m.w, r.height / m.h) || 1;
  S.mv = { s, tx: (r.width - m.w * s) / 2, ty: (r.height - m.h * s) / 2, ok: true, map: m.id }; applyView();
}
V.fitMap = fit;
function applyView() {
  const lay = $('#maplayer'); if (!lay) return;
  lay.style.transform = 'translate(' + S.mv.tx + 'px,' + S.mv.ty + 'px) scale(' + S.mv.s + ')';
  drawOverlay();
}
function drawOverlay() {
  const ov = $('#mapov'); const m = V.curMap(); if (!ov || !m) return;
  const { s, tx, ty } = S.mv; let h = '';
  if (S.showCities) m.cities.forEach(c => {
    const x = tx + c.x * s, y = ty + c.y * s; const on = S.selCity === c.id;
    h += '<div class="city ' + (on ? 'on' : '') + '" data-city="' + c.id + '" style="left:' + x + 'px;top:' + y + 'px" title="' + esc(c.name) + '"><i></i>' + (S.showLabels && c.name && (s > .35 || ['Metropole', 'Großstadt', 'Stadt'].includes(c.type)) ? '<span>' + esc(c.name) + '</span>' : '') + '</div>';
  });
  visibleMarkers(m).forEach(k => {
    const st = mkStyle(k); const a = anchor(st); const x = tx + k.x * s - a.ax, y = ty + k.y * s - a.ay;
    const fs = Math.max(10, Math.round(st.size * (st.shape === 'icon' ? .9 : .5)));
    h += '<div class="mk ' + (S.selMarker === k.id ? 'on' : '') + ' sh-' + st.shape + '" data-mk="' + k.id + '" style="left:' + x + 'px;top:' + y + 'px;width:' + a.w + 'px;height:' + a.h + 'px">' + shapeSvg(st) + '<span class="mki" style="font-size:' + fs + 'px;top:' + a.iy + 'px;left:' + (a.ix || a.w / 2) + 'px">' + esc(st.icon) + '</span>' + (S.showLabels && !k.hideLabel && k.label ? '<span class="mkl" style="top:' + (a.h + 2) + 'px">' + esc(k.label) + '</span>' : '') + '</div>';
  });
  ov.innerHTML = h;
}
V.drawOverlay = drawOverlay;
function toMap(ev) { const r = $('#mapview').getBoundingClientRect(); return { x: (ev.clientX - r.left - S.mv.tx) / S.mv.s, y: (ev.clientY - r.top - S.mv.ty) / S.mv.s }; }
function zoomAt(f, cx, cy) {
  const v = $('#mapview'); if (!v) return; const r = v.getBoundingClientRect(); if (cx == null) { cx = r.width / 2; cy = r.height / 2; }
  const ns = Math.max(.05, Math.min(12, S.mv.s * f)); const k = ns / S.mv.s;
  S.mv.tx = cx - (cx - S.mv.tx) * k; S.mv.ty = cy - (cy - S.mv.ty) * k; S.mv.s = ns; applyView();
}
V.zoomMap = f => zoomAt(f);
let drag = null;
function bindView() {
  const v = $('#mapview'); if (!v || v._bound) return; v._bound = true;
  v.addEventListener('wheel', e => { e.preventDefault(); const r = v.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  v.addEventListener('mousedown', e => {
    if (e.button !== 0) return; const m = V.curMap(); if (!m) return;
    const mkEl = e.target.closest('[data-mk]'); const cEl = e.target.closest('[data-city]');
    if (mkEl && S.mapMode === 'select') { const k = m.markers.find(x => x.id === mkEl.dataset.mk); drag = { kind: 'mk', k, sx: e.clientX, sy: e.clientY, ox: k.x, oy: k.y, moved: false }; e.preventDefault(); return; }
    drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, tx: S.mv.tx, ty: S.mv.ty, moved: false, city: cEl ? cEl.dataset.city : null, mk: mkEl ? mkEl.dataset.mk : null }; e.preventDefault();
  });
  if (V._winBound) return; V._winBound = true;
  W.addEventListener('mousemove', e => {
    if (!drag) return; const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (!drag.moved) return;
    if (drag.kind === 'mk') { drag.k.x = drag.ox + dx / S.mv.s; drag.k.y = drag.oy + dy / S.mv.s; drawOverlay(); }
    else { S.mv.tx = drag.tx + dx; S.mv.ty = drag.ty + dy; applyView(); }
  });
  W.addEventListener('mouseup', e => {
    if (!drag) return; const d = drag; drag = null; const m = V.curMap(); if (!m || !$('#mapview')) return;
    if (d.kind === 'mk') { if (d.moved) { save(); } else { S.selMarker = d.k.id; S.selCity = null; } V.render(); return; }
    if (d.moved) return;
    if (d.mk) { S.selMarker = d.mk; S.selCity = null; V.render(); return; }
    if (S.mapMode === 'city') { const p = toMap(e); if (p.x < 0 || p.y < 0 || p.x > m.w || p.y > m.h) return; const c = W.AT_DATA.newCity(p.x, p.y, { name: T('Neuer Ort', 'New place'), src: 'session' }); m.cities.push(c); S.selCity = c.id; S.selMarker = null; S.mapMode = 'select'; S.showCities = true; save(); V.render(); setTimeout(() => { const i = $('.cname'); if (i) { i.focus(); i.select(); } }, 30); return; }
    if (S.mapMode === 'add') { const p = toMap(e); if (p.x < 0 || p.y < 0 || p.x > m.w || p.y > m.h) return; addMarker(m, p.x, p.y); return; }
    if (d.city) { S.selCity = d.city; S.selMarker = null; V.render(); return; }
    if (S.selMarker || S.selCity) { S.selMarker = null; S.selCity = null; V.render(); }
  });
  W.addEventListener('resize', () => { if ($('#mapview')) drawOverlay(); });
}
function addMarker(m, x, y, extra) {
  const t = S.camp.markerTypes.find(t => t.id === S.curType) || S.camp.markerTypes[0];
  const k = Object.assign({ id: uid(), x, y, type: t.id, label: '', note: '', sessionId: S.bindSession && S.selSession ? S.selSession : null, created: Date.now() }, extra || {});
  if (S.pendingNpc) { const n = S.camp.npcs.find(z => z.id === S.pendingNpc); if (n) { k.npcId = n.id; k.label = n.name; k.type = (S.camp.markerTypes.find(t => t.id === 'npc') || t).id; } S.pendingNpc = null; S.mapMode = 'select'; }
  if (S.pendingPoi) { const p = (S.camp.pois || []).find(z => z.id === S.pendingPoi); if (p) { k.poiId = p.id; k.label = p.name; k.type = (S.camp.markerTypes.find(t => t.id === 'place') || t).id; k.style = { icon: V.poiIcon(p) }; } S.pendingPoi = null; S.mapMode = 'select'; }
  m.markers.push(k); S.selMarker = k.id; S.selCity = null; save(); V.render();
  setTimeout(() => { const i = $('[data-in="mk"][data-k="label"]'); if (i && !k.label) i.focus(); }, 30);
}
V.centerOn = function (x, y) { const v = $('#mapview'); if (!v) return; const r = v.getBoundingClientRect(); if (S.mv.s < .6) S.mv.s = Math.min(1, S.mv.s * 2.5); S.mv.tx = r.width / 2 - x * S.mv.s; S.mv.ty = r.height / 2 - y * S.mv.s; applyView(); };

/* ---------- Karten laden ---------- */
const loadImg = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error(T('Bild nicht lesbar', 'Image not readable'))); im.src = src; });
function svgSize(txt) {
  const m = txt.match(/<svg[^>]*>/i); const tag = m ? m[0] : '';
  const vb = tag.match(/viewBox\s*=\s*["']\s*([-\d.]+)[ ,]+([-\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i);
  const w = tag.match(/\bwidth\s*=\s*["']([\d.]+)/i), h = tag.match(/\bheight\s*=\s*["']([\d.]+)/i);
  if (w && h) return { w: +w[1], h: +h[1] }; if (vb) return { w: +vb[3], h: +vb[4] }; return { w: 1600, h: 1000 };
}
V.loadMapFile = async function (f) {
  try {
    if (/\.json$/i.test(f.name) || f.type === 'application/json') { const p = JSON.parse(await V.readAs(f, 'readAsText')); return V.addAtlasProject(p, f.name); }
    if (/svg/i.test(f.type) || /\.svg$/i.test(f.name)) { const txt = await V.readAs(f, 'readAsText'); const sz = svgSize(txt); return addMap({ name: f.name.replace(/\.[^.]+$/, ''), kind: 'svg', src: txt, w: sz.w, h: sz.h }); }
    if (!/^image\//.test(f.type) && !/\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(f.name)) { toast(T('Dieses Dateiformat wird nicht unterstützt.', 'This file format is not supported.')); return; }
    const url = await V.readAs(f, 'readAsDataURL'); const im = await loadImg(url);
    addMap({ name: f.name.replace(/\.[^.]+$/, ''), kind: 'raster', src: url, w: im.naturalWidth, h: im.naturalHeight });
  } catch (e) { console.error(e); toast(T('Datei konnte nicht geöffnet werden: ', 'Could not open file: ') + e.message); }
};
function addMap(o, cities) {
  const m = Object.assign({ id: uid(), markers: [], cities: cities || [], added: Date.now() }, o);
  S.camp.maps.push(m); S.mapId = m.id; S.selMarker = null; S.selCity = null; S.mv.ok = false; save(); S.tab = 'map'; V.render();
  toast('🗺️ ' + m.name + (m.cities.length ? ' – ' + m.cities.length + ' ' + T('Orte', 'places') : ''));
  return m;
}
const cityPick = c => ({ id: c.id || uid(), name: c.name || '', x: +c.x, y: +c.y, type: c.type || '', density: c.density || '', wealth: c.wealth || '', pop: c.pop || 0, races: (c.races || []).map(r => ({ n: r.n, p: r.p })), lodging: c.lodging || 0, restaurants: c.restaurants || 0, shops: c.shops || 0, notes: c.notes || '', cmap: c.cmap && c.cmap.src ? { src: c.cmap.src, w: c.cmap.w, h: c.cmap.h } : undefined, look: c.look, sym: c.sym });
V.addAtlasProject = function (p, fname) {
  if (!p || !p.map || !p.map.src) { toast(T('Das ist keine Atlas-Projektdatei.', 'This is not an Atlas project file.')); return; }
  const name = (p.map.name || fname || 'Atlas').replace(/\.[^.]+$/, '').replace(/_Atlas$/, '');
  const ex = S.camp.maps.find(m => m.atlas && m.name === name && m.w === p.map.w && m.h === p.map.h);
  const cities = (p.cities || []).filter(c => isFinite(+c.x) && isFinite(+c.y)).map(cityPick);
  const pr = V.importAtlasPois(p.cities || []), pt = pr.add + pr.upd + pr.del ? ' · PoI: ' + pr.add + ' ' + T('neu', 'new') + ', ' + pr.upd + ' ' + T('aktualisiert', 'updated') + (pr.del ? ', ' + pr.del + ' ' + T('entfernt', 'removed') : '') : '';
  if (ex) { ex.cities = cities; ex.src = p.map.src; ex.kind = p.map.kind; S.mapId = ex.id; save(); S.tab = 'map'; V.render(); toast(T('Orte aktualisiert', 'Places updated') + ': ' + cities.length + ' – ' + T('deine Marker bleiben erhalten.', 'your markers are kept.') + pt, 5000); return ex; }
  const nm = addMap({ name, kind: p.map.kind === 'svg' ? 'svg' : 'raster', src: p.map.src, w: p.map.w, h: p.map.h, atlas: true }, cities); if (pt) toast('🗺️ ' + name + ' – ' + cities.length + ' ' + T('Orte', 'places') + pt, 5000); return nm;
};
V.fromAtlasDB = async function () {
  const r = await V.readAtlasDB();
  if (!r || !r.map) { S.modal = () => '<h2>🗺️ ' + T('Aus dem Atlas', 'From the Atlas') + '</h2><div class="note">' + T('Im Atlas wurde in diesem Browser noch keine Karte geöffnet – oder der Browser trennt die Speicher der einzelnen Dateien. Speichere im Atlas das Projekt (💾 → …_Atlas.json) und lade die Datei hier mit „📂 Atlas-Datei“.', 'No map has been opened in the Atlas in this browser yet – or the browser keeps each file\'s storage separate. Save the project in the Atlas (💾 → …_Atlas.json) and load it here with "📂 Atlas file".') + '</div><div class="foot"><button class="btn primary" data-a="atlasFile">📂 ' + T('Atlas-Datei wählen', 'Choose Atlas file') + '</button><button class="btn" data-a="closeModal">OK</button></div>'; V.render(); return; }
  V.addAtlasProject({ map: r.map, cities: r.state && r.state.mapId === r.map.id ? r.state.cities : (r.state ? r.state.cities : []) });
};
/* Marker-Typen */
V.typesDialog = function () {
  const ts = S.camp.markerTypes;
  return '<h2>⚙️ ' + T('Marker-Typen', 'Marker types') + '</h2><p class="small muted">' + T('Änderungen gelten für alle Marker dieses Typs (außer bei Markern mit eigenem Aussehen).', 'Changes apply to all markers of this type (except markers with their own look).') + '</p><table class="ttab"><tr><th>' + T('Name', 'Name') + '</th><th>' + T('Symbol', 'Icon') + '</th><th>' + T('Farbe', 'Colour') + '</th><th>' + T('Form', 'Shape') + '</th><th>' + T('Größe', 'Size') + '</th><th></th></tr>' +
    ts.map((t, i) => '<tr><td><input type="text" data-tt="n" data-i="' + i + '" value="' + esc(L(t.n)) + '"></td><td><input type="text" class="ipx" data-tt="icon" data-i="' + i + '" value="' + esc(t.icon) + '"></td><td><input type="color" data-tt="color" data-i="' + i + '" value="' + esc(t.color) + '"></td><td><select data-tt="shape" data-i="' + i + '">' + SHAPES.map(s => '<option value="' + s[0] + '"' + (t.shape === s[0] ? ' selected' : '') + '>' + esc(L(s[1])) + '</option>').join('') + '</select></td><td><input type="number" min="16" max="72" data-tt="size" data-i="' + i + '" value="' + t.size + '"></td><td>' + (ts.length > 1 ? '<button class="btn sm ghost" data-a="ttDel" data-i="' + i + '">🗑️</button>' : '') + '</td></tr>').join('') + '</table>' +
    '<div class="foot"><button class="btn" data-a="ttAdd">＋ ' + T('Neuer Typ', 'New type') + '</button><button class="btn" data-a="ttReset">↺ ' + T('Standard', 'Defaults') + '</button><button class="btn primary" data-a="closeModal">' + T('Fertig', 'Done') + '</button></div>';
};
})(window);
