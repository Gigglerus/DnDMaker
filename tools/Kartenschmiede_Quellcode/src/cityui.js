/* DND5e Kartenschmiede – Stadtkarten-Editor */
const CE = { on: false, c: null, v: { s: 1, tx: 0, ty: 0 }, tool: 'select', bt: 'wohn', sk: 'haupt', stamp: 'haus', ss: 3.2, sel: null, undo: [], redo: [], drag: null, poly: null, mouse: null, mini: false, world: null, space: false };
let ccv, cwrap, cui;
const cmap = () => CE.c.map;
function cPush() { CE.undo.push(JSON.stringify(cmap())); if (CE.undo.length > 40) CE.undo.shift(); CE.redo = []; }
function cUndo(redo) { const from = redo ? CE.redo : CE.undo, to = redo ? CE.undo : CE.redo, s = from.pop(); if (!s) { toast(redo ? 'Nichts zum Wiederholen.' : 'Nichts zum Rückgängigmachen.'); return; } to.push(JSON.stringify(cmap())); CE.c.map = JSON.parse(s); CE.sel = null; cSize(); cDraw(); cSide(); persist(); }
function cSelObj() { if (!CE.sel) return null; const m = cmap(), L = { b: m.b, s: m.streets, w: m.walls, t: m.st }[CE.sel.k]; return L.find(o => o.id === CE.sel.id) || null; }
function openCity(c) {
  ensureA(c); CE.c = c; CE.on = false; CE.sel = null; CE.undo = []; CE.redo = []; CE.tool = 'select'; CE.poly = null; CE.drag = null;
  CE.world = null; try { CE.wk = Math.min(1, 1400 / S.W); CE.world = renderMap(document.createElement('canvas'), 'art', CE.wk, { names: true }, S.vis); } catch (e) { console.error(e); }
  if (!c.map) { cityStartDialog(c); return; }
  c.map.b.forEach(b => { if (BT[b.t] && BT[b.t].poi) poiNorm(b); });
  cityWork();
}
function cityStartDialog(c) {
  const R = resolve(c), a = ensureA(c);
  modal('<h2>Stadtkarte für ' + esc(c.name || 'die Stadt') + '</h2><p class="sub2">' + esc(lookText(R)) + ' · ' + TERR[R.terr].n + ' · ' + a.type + ' · ' + a.pop.toLocaleString('de-DE') + ' Einwohner · Dichte ' + a.density + ' · ' + a.shops + ' Läden</p>' +
    '<div class="grid2" style="margin:.6em auto"><button class="btn primary" data-c="gen-first">🎲 Zufällig erzeugen</button><button class="btn" data-c="empty-first">✏️ Selbst zeichnen</button></div>' +
    '<p class="small muted" style="text-align:center">Die Zufallskarte entsteht aus Volk, Art, Gelände, Größe, Bevölkerungsdichte und der Zahl der Läden – und lässt sich danach frei bearbeiten.</p><div class="foot"><button class="btn" data-c="back">Abbrechen</button></div>');
}
function cSize() { const m = cmap(); ccv.width = m.W; ccv.height = m.H; ccv.style.width = m.W + 'px'; ccv.style.height = m.H + 'px'; $('#cstage').style.width = m.W + 'px'; $('#cstage').style.height = m.H + 'px'; }
function cityWork() {
  const c = CE.c, m = cmap(); document.body.className = ''; CE.on = true;
  app().innerHTML = '<div class="work"><div class="top"><button class="btn sm" data-c="back" title="Zurück zur Weltkarte">← Weltkarte</button><div class="brand" style="cursor:default">' + D20 + '<b>Stadtkarte: ' + esc(c.name || 'Ohne Namen') + '</b></div>' +
    '<div class="sep"></div><button class="btn sm" data-c="undo" title="Rückgängig (Strg+Z)">↶</button><button class="btn sm" data-c="redo" title="Wiederholen (Strg+Y)">↷</button><div class="sep"></div>' +
    '<div class="seg" id="cView">' + RSTYLES.map(r => '<button data-c="view" data-v="' + r.k + '" title="' + r.d + '">' + r.n + '</button>').join('') + '</div><button class="btn sm" data-c="labels" id="cLab" title="Namen der Läden und besonderen Orte anzeigen">🏷️ PoI-Namen</button><span class="sp"></span>' +
    '<button class="btn sm" data-c="gen" title="Neue Zufallskarte aus den Eigenschaften der Stadt">🎲 Zufällig erzeugen</button><button class="btn sm" data-c="clear" title="Alles entfernen und selbst zeichnen">🧹 Leeren</button><button class="btn sm primary" data-c="export">🎨 Rendern &amp; Export</button><button class="btn sm" data-c="help">❓</button></div>' +
    '<div class="kbody"><aside class="side" id="cside"></aside><div class="mapwrap" id="cwrap"><div class="stage" id="cstage"><canvas id="ccv"></canvas></div><svg id="cui" class="uisvg"></svg>' +
    '<div class="mini" id="mini"><button class="btn sm" data-c="mini">🗺️ Umgebung <span id="miniA">▾</span></button><canvas id="miniCv" width="300" height="220" class="hidden"></canvas><div class="small hidden" id="miniT"></div></div>' +
    '<div class="status" id="cstatus"></div><div class="zoomctl"><button class="btn sm" data-c="zin">＋</button><button class="btn sm" data-c="zout">－</button><button class="btn sm" data-c="fit">⤢</button></div></div></div></div>';
  ccv = $('#ccv'); cwrap = $('#cwrap'); cui = $('#cui'); cSize(); cBind(); cTop(); cSide(); cFit(); fontsReady().then(cDraw); cDraw(); if (CE.mini) drawMini();
}
function cTop() { $$('#cView button').forEach(b => b.classList.toggle('on', b.dataset.v === cmap().view)); $('#cLab').classList.toggle('on', !!cmap().labels); }
function cDraw() { if (!CE.on || !ccv) return; const g = ccv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); renderCity(g, CE.c, cmap().view || 'art', { labels: cmap().labels, sel: CE.sel && CE.sel.id }); cUi(); }
let cRaf = 0; const cSoon = () => { if (!cRaf) cRaf = requestAnimationFrame(() => { cRaf = 0; cDraw(); }); };
function cApply() { $('#cstage').style.transform = 'translate(' + CE.v.tx + 'px,' + CE.v.ty + 'px) scale(' + CE.v.s + ')'; cUi(); }
function cFit() { const r = cwrap.getBoundingClientRect(), m = cmap(); CE.v.s = Math.min((r.width - 30) / m.W, (r.height - 30) / m.H) || 1; CE.v.tx = (r.width - m.W * CE.v.s) / 2; CE.v.ty = (r.height - m.H * CE.v.s) / 2; cApply(); }
function cZoom(f, px, py) { const r = cwrap.getBoundingClientRect(); if (px === undefined) { px = r.width / 2; py = r.height / 2; } const ns = clamp(CE.v.s * f, .15, 8), k = ns / CE.v.s; CE.v.tx = px - (px - CE.v.tx) * k; CE.v.ty = py - (py - CE.v.ty) * k; CE.v.s = ns; cApply(); }
const cToMap = e => { const r = cwrap.getBoundingClientRect(); return { x: (e.clientX - r.left - CE.v.tx) / CE.v.s, y: (e.clientY - r.top - CE.v.ty) / CE.v.s, px: e.clientX - r.left, py: e.clientY - r.top }; };
function drawMini() {
  const cv = $('#miniCv'), t = $('#miniT'); if (!cv) return; cv.classList.toggle('hidden', !CE.mini); t.classList.toggle('hidden', !CE.mini); $('#miniA').textContent = CE.mini ? '▴' : '▾'; if (!CE.mini) return;
  const g = cv.getContext('2d'), c = CE.c, k = CE.wk || 1, vw = 400, vh = vw * 220 / 300; g.fillStyle = '#6aa4c4'; g.fillRect(0, 0, 300, 220);
  if (CE.world) g.drawImage(CE.world, (c.x - vw / 2) * k, (c.y - vh / 2 - 8) * k, vw * k, vh * k, 0, 0, 300, 220);
  g.strokeStyle = '#8a2222'; g.lineWidth = 2.5; g.setLineDash([5, 3]); g.beginPath(); g.arc(150, 116, 26, 0, 6.2832); g.stroke(); g.setLineDash([]);
  const R = resolve(c); t.innerHTML = '<b>' + ZONE_N[R.zone] + '</b> · ' + TERR[R.terr].n + (R.coast ? ' · Küste' : '') + (riverNear(c) !== null ? ' · Fluss' : '');
}
const CTOOLS = [['select', '👆 Auswählen / verschieben'], ['street', '🛣️ Straße zeichnen'], ['rect', '▭ Haus als Rechteck'], ['poly', '⬠ Haus als Vieleck'], ['circ', '◯ Rundbau / Zelt'], ['wall', '🧱 Mauer zeichnen'], ['stamp', '🏠 Künstlerisches Haus setzen'], ['tree', '🌳 Bäume setzen'], ['erase', '🧽 Radieren']];
function cSide() {
  const c = CE.c, m = cmap(), R = resolve(c), a = ensureA(c), T = CE.tool, shape = T === 'rect' || T === 'poly' || T === 'circ';
  const cnt = t => m.b.filter(b => b.t === t).length;
  let h = '<div class="cinfo"><b>' + esc(lookText(R)) + '</b><br>' + TERR[R.terr].n + ' · ' + a.type + ' · ' + a.pop.toLocaleString('de-DE') + ' Einw. · Dichte ' + a.density + '<br>🛒 ' + cnt('shop') + ' von ' + a.shops + ' Läden · 🍺 ' + cnt('schaenke') + ' von ' + (a.lodging + a.restaurants) + ' · 🏠 ' + m.b.filter(b => !BT[b.t].flat).length + ' Gebäude</div>';
  h += '<div class="tools"><div class="lbl">Werkzeug</div><div class="seg col">' + CTOOLS.map(t => '<button data-c="tool" data-v="' + t[0] + '" class="' + (T === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div>';
  if (T === 'street') h += '<div class="lbl">Straßenart</div><div class="seg">' + [['haupt', 'Hauptstraße'], ['gasse', 'Gasse'], ['pfad', 'Pfad']].map(s => '<button data-c="sk" data-v="' + s[0] + '" class="' + (CE.sk === s[0] ? 'on' : '') + '">' + s[1] + '</button>').join('') + '</div>';
  if (shape) h += '<div class="lbl">Typ</div><div class="terrs">' + Object.entries(BT).map(([k, t]) => '<button data-c="bt" data-v="' + k + '" class="' + (CE.bt === k ? 'on' : '') + '">' + t.i + ' ' + t.n + '</button>').join('') + '</div><p class="small muted">' + (T === 'poly' ? 'Ecken anklicken; Doppelklick oder <kbd>Enter</kbd> schließt die Form.' : 'Mit gedrückter Maustaste aufziehen.') + ' Aus Form und Typ entsteht das Abbild.</p>';
  if (T === 'stamp') h += '<div class="lbl">Künstlerische Häuser</div><div class="stamps">' + STAMPS.map(s => '<button data-c="stamp" data-v="' + s[0] + '" class="' + (CE.stamp === s[0] ? 'on' : '') + '" title="' + s[1] + '"><canvas width="96" height="76" data-st="' + s[0] + '"></canvas><span>' + s[1] + '</span></button>').join('') + '</div><div class="fld"><label>Größe <span>' + Math.round(CE.ss / 3.2 * 100) + ' %</span></label><input type="range" min="1.6" max="8" step=".2" value="' + CE.ss + '" data-cf="ss" style="width:100%"></div><p class="small muted">Die Häuser folgen dem Baustil des Volkes.</p>';
  if (T === 'tree') h += '<p class="small muted">Klicken oder ziehen, um Bäume zu streuen.</p>'; if (T === 'erase') h += '<p class="small muted">Klicken oder ziehen entfernt Gebäude, Straßen, Mauern, Häuser und Bäume.</p>';
  h += '</div><div id="cSel"></div>';
  const pois = m.b.filter(b => BT[b.t].poi);
  if (pois.length) h += '<div class="lbl" style="padding:0 .8em">Läden &amp; Orte – PoI (' + pois.length + ')</div><div class="clist">' + pois.slice().sort((x, y) => (x.name || '').localeCompare(y.name || '')).map(b => '<div class="it' + (CE.sel && CE.sel.id === b.id ? ' sel' : '') + '" data-c="pick" data-v="' + b.id + '"><span>' + BT[b.t].i + '</span><span class="nm">' + esc(b.name || BT[b.t].n) + '</span><span class="ty">' + esc(poiKindName(b)) + '</span></div>').join('') + '</div>';
  $('#cside').innerHTML = h;
  $$('#cside canvas[data-st]').forEach(cv => { const g = cv.getContext('2d'); g.translate(48, 66); g.scale(4, 4); drawStamp(g, cv.dataset.st, archFor(R), 'art'); });
  cSelBox();
}
function cSelBox() {
  const box = $('#cSel'); if (!box) return; const o = cSelObj(); if (!o) { box.innerHTML = ''; cUi(); return; } const k = CE.sel.k; let h = '<div class="selbox">';
  if (k === 'b') { h += '<div class="lbl">Ausgewählt: ' + BT[o.t].n + '</div><div class="fld"><label>Typ</label><select data-cf="bT" style="width:100%">' + Object.entries(BT).map(([key, t]) => '<option value="' + key + '"' + (key === o.t ? ' selected' : '') + '>' + t.i + ' ' + t.n + '</option>').join('') + '</select></div>';
    if (BT[o.t].poi) h += '<div class="fld"><label>Name (PoI)</label><div style="display:flex;gap:.3em"><input type="text" data-cf="bName" value="' + esc(o.name || '') + '" style="flex:1;min-width:0"><button class="dice" data-c="bRoll" title="Namen und Art würfeln">🎲</button></div></div><div class="fld"><label>Art</label><select data-cf="bKind" style="width:100%">' + poiKindOptions(o.kind) + '</select>' + (o.kind === 'custom' ? '<input type="text" data-cf="bKindText" value="' + esc(o.kindText || '') + '" placeholder="eigene Art" style="width:100%;margin-top:.2em">' : '') + '</div><div class="fld"><label>Betreiber</label><input type="text" data-cf="bOwner" value="' + esc(o.owner || '') + '" style="width:100%"></div><div class="two"><div class="fld"><label>Stil</label><select data-cf="bStyle">' + Object.entries(PSTYLES).map(([k2, n]) => '<option value="' + k2 + '"' + (k2 === o.style ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div><div class="fld"><label>Umgebung</label><select data-cf="bDist"><option value="">automatisch</option>' + Object.entries(PDIST).map(([k2, n]) => '<option value="' + k2 + '"' + (o.districtSet && k2 === o.district ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div></div><div class="fld"><label>Notizen</label><textarea data-cf="bNotes" style="min-height:3em">' + esc(o.notes || '') + '</textarea></div>';
    if (o.s === 'r') h += '<div class="fld"><label>Drehung <span>' + Math.round((o.a || 0) * 57.3) + '°</span></label><input type="range" min="-3.14" max="3.14" step=".02" value="' + (o.a || 0) + '" data-cf="bA" style="width:100%"></div><div class="fld"><label>Breite × Tiefe</label><div style="display:flex;gap:.3em"><input type="number" min="6" max="400" value="' + o.w + '" data-cf="bW"><input type="number" min="6" max="400" value="' + o.h + '" data-cf="bH"></div></div>';
    if (o.s === 'c') h += '<div class="fld"><label>Radius</label><input type="number" min="4" max="200" value="' + o.r + '" data-cf="bR"></div>';
  } else if (k === 's') h += '<div class="lbl">Ausgewählte Straße</div><div class="seg">' + [['haupt', 'Hauptstraße'], ['gasse', 'Gasse'], ['pfad', 'Pfad']].map(s => '<button data-c="selsk" data-v="' + s[0] + '" class="' + (o.k === s[0] ? 'on' : '') + '">' + s[1] + '</button>').join('') + '</div>';
  else if (k === 'w') h += '<div class="lbl">Ausgewählte Mauer</div><label class="chk"><input type="checkbox" data-cf="wClosed"' + (o.closed ? ' checked' : '') + '> geschlossener Ring</label>';
  else h += '<div class="lbl">Ausgewählt: ' + (STAMPS.find(s => s[0] === o.k) || ['', ''])[1] + '</div><div class="fld"><label>Größe</label><input type="range" min="1.6" max="8" step=".2" value="' + (o.s || 3.2) + '" data-cf="tS" style="width:100%"></div>';
  box.innerHTML = h + '<div style="margin-top:.5em"><button class="btn sm" data-c="del">🗑️ Löschen <kbd>Entf</kbd></button></div></div>'; cUi();
}
function cUi() {
  if (!cui || !CE.on) return; const v = CE.v, X = x => (x * v.s + v.tx).toFixed(1), Y = y => (y * v.s + v.ty).toFixed(1), P = p => X(p[0]) + ' ' + Y(p[1]); let h = ''; const o = cSelObj();
  if (o) { const k = CE.sel.k; if (k === 'b' && o.s === 'r') { const c = Math.cos(o.a || 0), s = Math.sin(o.a || 0); h += '<path d="M' + [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(q => P([o.x + q[0] * (o.w / 2 + 3) * c - q[1] * (o.h / 2 + 3) * s, o.y + q[0] * (o.w / 2 + 3) * s + q[1] * (o.h / 2 + 3) * c])).join('L') + 'Z" class="selr"/>'; }
    else if (k === 'b' && o.s === 'c') h += '<circle cx="' + X(o.x) + '" cy="' + Y(o.y) + '" r="' + ((o.r + 3) * v.s) + '" class="selr"/>'; else if (k === 'b') h += '<path d="M' + o.pts.map(P).join('L') + 'Z" class="selr"/>';
    else if (k === 't') h += '<rect x="' + X(o.x - 8 * o.s) + '" y="' + Y(o.y - 16 * o.s) + '" width="' + (16 * o.s * v.s) + '" height="' + (18 * o.s * v.s) + '" rx="5" class="selr"/>'; else h += '<path d="M' + o.pts.map(P).join('L') + (k === 'w' && o.closed ? 'Z' : '') + '" class="sell"/>'; }
  const d = CE.drag;
  if (d && d.k === 'line' && d.pts.length > 1) h += '<path d="M' + d.pts.map(P).join('L') + '" class="drawl r"/>';
  if (d && d.k === 'rect') h += '<rect x="' + X(Math.min(d.x0, d.x1)) + '" y="' + Y(Math.min(d.y0, d.y1)) + '" width="' + (Math.abs(d.x1 - d.x0) * v.s) + '" height="' + (Math.abs(d.y1 - d.y0) * v.s) + '" class="selr"/>';
  if (d && d.k === 'circ') h += '<circle cx="' + X(d.x0) + '" cy="' + Y(d.y0) + '" r="' + (Math.hypot(d.x1 - d.x0, d.y1 - d.y0) * v.s) + '" class="selr"/>';
  if (CE.poly) { const pts = CE.poly.concat(CE.mouse ? [[CE.mouse.x, CE.mouse.y]] : []); h += '<path d="M' + pts.map(P).join('L') + '" class="selr" style="fill:rgba(255,217,106,.2)"/>' + CE.poly.map(p => '<circle cx="' + X(p[0]) + '" cy="' + Y(p[1]) + '" r="4" fill="#8a2222"/>').join(''); }
  if (CE.mouse && (CE.tool === 'erase' || CE.tool === 'tree')) h += '<circle cx="' + CE.mouse.px + '" cy="' + CE.mouse.py + '" r="' + ((CE.tool === 'erase' ? 12 : 22) * v.s) + '" class="cur"/>';
  cui.innerHTML = h;
}
function cHit(p) {
  const m = cmap(); for (let i = m.st.length - 1; i >= 0; i--) { const s = m.st[i]; if (Math.abs(p.x - s.x) < 8 * s.s && p.y < s.y + 2 * s.s && p.y > s.y - 16 * s.s) return { k: 't', id: s.id }; }
  const bl2 = m.b.filter(b => bHit(b, p.x, p.y)).sort((x, y) => (BT[x.t].flat ? 1 : 0) - (BT[y.t].flat ? 1 : 0)); if (bl2.length && !BT[bl2[0].t].flat) return { k: 'b', id: bl2[0].id };
  for (const w of m.walls) if (dPoly(w.pts, p.x, p.y, w.closed) < 8) return { k: 'w', id: w.id };
  for (const s of m.streets) if (dPoly(s.pts, p.x, p.y) < SW[s.k] / 2 + 3) return { k: 's', id: s.id };
  if (bl2.length) return { k: 'b', id: bl2[0].id }; return null;
}
function cErase(p) { const m = cmap(), h = cHit(p); let ch = false; const n = m.trees.length; m.trees = m.trees.filter(t => Math.hypot(t[0] - p.x, t[1] - p.y) > 12 + t[2]); if (m.trees.length !== n) ch = true;
  if (h) { const key = { b: 'b', s: 'streets', w: 'walls', t: 'st' }[h.k]; m[key] = m[key].filter(o => o.id !== h.id); ch = true; } if (ch) cSoon(); }
function cMove(o, k, dx, dy) { if (o.pts) o.pts = o.pts.map(q => [q[0] + dx, q[1] + dy]); else { o.x += dx; o.y += dy; } }
function finishPoly() { const p = CE.poly; CE.poly = null; if (p && p.length >= 3) { cPush(); const b = { id: uid('b'), s: 'p', pts: p.map(q => [Math.round(q[0]), Math.round(q[1])]), t: CE.bt }; if (BT[b.t].poi) Object.assign(b, poiDefault(b.t, Math.random)); cmap().b.push(b); CE.sel = { k: 'b', id: b.id }; cDraw(); cSide(); persist(); } else cUi(); }
function cBind() {
  cwrap.addEventListener('contextmenu', e => e.preventDefault());
  cwrap.addEventListener('wheel', e => { e.preventDefault(); const p = cToMap(e); cZoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.px, p.py); }, { passive: false });
  cwrap.addEventListener('dblclick', () => { if (CE.poly) { CE.poly.pop(); finishPoly(); } });
  cwrap.addEventListener('pointerdown', e => {
    if (e.target.closest('.zoomctl,.mini')) return; const p = cToMap(e), T = CE.tool, m = cmap(); cwrap.setPointerCapture(e.pointerId);
    if (e.button !== 0 || CE.space) { CE.drag = { k: 'pan', px: e.clientX, py: e.clientY, tx: CE.v.tx, ty: CE.v.ty }; cwrap.classList.add('pan'); return; }
    if (T === 'select') { const h = cHit(p); CE.sel = h; if (h) CE.drag = { k: 'move', lx: p.x, ly: p.y, moved: false }; cSide(); return; }
    if (T === 'street' || T === 'wall') { CE.drag = { k: 'line', pts: [[p.x, p.y]] }; return; }
    if (T === 'rect' || T === 'circ') { CE.drag = { k: T, x0: p.x, y0: p.y, x1: p.x, y1: p.y }; return; }
    if (T === 'poly') { if (!CE.poly) CE.poly = []; if (CE.poly.length >= 3 && Math.hypot(CE.poly[0][0] - p.x, CE.poly[0][1] - p.y) < 9 / CE.v.s) { finishPoly(); return; } CE.poly.push([p.x, p.y]); cUi(); return; }
    if (T === 'stamp') { cPush(); const s = { id: uid('s'), k: CE.stamp, x: Math.round(p.x), y: Math.round(p.y), s: CE.ss }; m.st.push(s); cDraw(); persist(); return; }
    if (T === 'tree') { cPush(); CE.drag = { k: 'tree', last: null }; }
    if (T === 'erase') { cPush(); CE.drag = { k: 'erase' }; cErase(p); }
  });
  cwrap.addEventListener('pointermove', e => {
    const p = cToMap(e), d = CE.drag; CE.mouse = p;
    if (d) {
      if (d.k === 'pan') { CE.v.tx = d.tx + e.clientX - d.px; CE.v.ty = d.ty + e.clientY - d.py; cApply(); return; }
      if (d.k === 'line') { const l = d.pts[d.pts.length - 1]; if (Math.hypot(p.x - l[0], p.y - l[1]) > 4) d.pts.push([p.x, p.y]); }
      else if (d.k === 'rect' || d.k === 'circ') { d.x1 = p.x; d.y1 = p.y; }
      else if (d.k === 'move') { const o = cSelObj(); if (o) { if (!d.moved) { if (Math.hypot(p.x - d.lx, p.y - d.ly) < 3) return; cPush(); d.moved = true; } cMove(o, CE.sel.k, Math.round(p.x - d.lx), Math.round(p.y - d.ly)); d.lx += Math.round(p.x - d.lx); d.ly += Math.round(p.y - d.ly); cSoon(); } }
      else if (d.k === 'erase') cErase(p);
      else if (d.k === 'tree') { if (!d.last || Math.hypot(p.x - d.last.x, p.y - d.last.y) > 16) { d.last = p; for (let i = 0; i < 2; i++) { const x = p.x + (Math.random() - .5) * 40, y = p.y + (Math.random() - .5) * 40; cmap().trees.push([Math.round(x), Math.round(y), Math.round((6 + Math.random() * 5) * 10) / 10]); } cSoon(); } }
    } else { const st = $('#cstatus'), h = cHit(p); if (st) { const o = h && h.k === 'b' ? cmap().b.find(b => b.id === h.id) : null; st.textContent = o ? BT[o.t].n + (o.name ? ' · ' + o.name : '') + (BT[o.t].poi && poiKindName(o) !== o.name ? ' (' + poiKindName(o) + ')' : '') : ''; } }
    cUi();
  });
  const up = () => {
    const d = CE.drag; CE.drag = null; cwrap.classList.remove('pan'); if (!d) return; const m = cmap();
    if (d.k === 'line') { let len = 0; for (let i = 1; i < d.pts.length; i++) len += Math.hypot(d.pts[i][0] - d.pts[i - 1][0], d.pts[i][1] - d.pts[i - 1][1]); if (len > 14) { cPush(); const pts = simplify(d.pts, 2.5).map(q => [Math.round(q[0]), Math.round(q[1])]);
        if (CE.tool === 'wall') { const cl = pts.length > 3 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 30; if (cl) pts.pop(); m.walls.push({ id: uid('w'), pts, closed: cl }); } else m.streets.push({ id: uid('t'), pts, k: CE.sk }); } }
    else if (d.k === 'rect') { const w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0); if (w > 5 && h > 5) { cPush(); const b = { id: uid('b'), s: 'r', x: Math.round((d.x0 + d.x1) / 2), y: Math.round((d.y0 + d.y1) / 2), w: Math.round(w), h: Math.round(h), a: 0, t: CE.bt }; if (BT[b.t].poi) Object.assign(b, poiDefault(b.t, Math.random)); m.b.push(b); CE.sel = { k: 'b', id: b.id }; } }
    else if (d.k === 'circ') { const r = Math.hypot(d.x1 - d.x0, d.y1 - d.y0); if (r > 4) { cPush(); const b = { id: uid('b'), s: 'c', x: Math.round(d.x0), y: Math.round(d.y0), r: Math.round(r), t: CE.bt }; if (BT[b.t].poi) Object.assign(b, poiDefault(b.t, Math.random)); m.b.push(b); CE.sel = { k: 'b', id: b.id }; } }
    else if (d.k === 'move' && !d.moved) { cUi(); return; }
    cDraw(); cSide(); persist();
  };
  cwrap.addEventListener('pointerup', up); cwrap.addEventListener('pointercancel', up); cwrap.addEventListener('pointerleave', () => { CE.mouse = null; cUi(); });
}
function cityGenDialog() {
  const c = CE.c, R = resolve(c), a = ensureA(c);
  modal('<h2>🎲 Zufallskarte</h2><p class="sub2">' + esc(lookText(R)) + ' · ' + TERR[R.terr].n + ' · ' + a.type + ' · ' + a.pop.toLocaleString('de-DE') + ' Einwohner · Dichte ' + a.density + ' · ' + a.shops + ' Läden</p>' +
    '<div class="fld"><label>Zufallszahl (gleiche Zahl = gleiche Stadt)</label><div style="display:flex;gap:.4em"><input type="number" id="cgSeed" value="' + ((Math.random() * 99999) | 0) + '" style="flex:1"><button class="dice" data-c="cgseed">🎲</button></div></div>' +
    '<div class="fld"><label class="chk"><input type="checkbox" id="cgCoast" checked> Küste übernehmen, wenn die Stadt am Meer liegt' + (R.coast ? ' (ja)' : ' (liegt nicht am Meer)') + '</label><label class="chk"><input type="checkbox" id="cgRiver" checked> Fluss übernehmen, wenn einer an der Stadt vorbeifließt' + (riverNear(c) !== null ? ' (ja)' : ' (keiner in der Nähe)') + '</label></div>' +
    '<div class="note">Die Zufallskarte ersetzt die jetzige Stadtkarte. Mit ↶ kommt die alte zurück.</div><div class="foot"><button class="btn" data-c="mclose">Abbrechen</button><button class="btn primary" data-c="gen-ok">✨ Erzeugen</button></div>');
}
const CX = { st: 'art', fmt: 'png', sc: 1, title: true, labels: true };
function cityExportDialog() {
  CX.st = cmap().view || 'art';
  const m = modal('<h2>Stadtkarte rendern &amp; exportieren</h2><div class="lbl">Stil</div><div class="styles">' + RSTYLES.map(r => '<div class="stc" data-st="' + r.k + '"><canvas></canvas><b>' + r.n + '</b></div>').join('') + '</div><div class="lbl" style="margin-top:.7em">Dateiformat</div><div class="fmts">' + [['png', 'PNG', 'verlustfrei'], ['jpg', 'JPG', 'klein'], ['webp', 'WebP', 'sehr klein'], ['pdf', 'PDF', 'zum Drucken']].map(f => '<button data-fmt="' + f[0] + '"><b>' + f[1] + '</b><span>' + f[2] + '</span></button>').join('') + '</div>' +
    '<div class="xgrid"><div><label class="chk"><input type="checkbox" id="cxT"' + (CX.title ? ' checked' : '') + '> Titel und Rahmen</label><label class="chk"><input type="checkbox" id="cxL"' + (CX.labels ? ' checked' : '') + '> Namen der Läden und Orte (PoI)</label></div><div><div class="seg" id="cxSc"><button data-v="1" class="' + (CX.sc === 1 ? 'on' : '') + '">' + cmap().W + ' × ' + cmap().H + '</button><button data-v="2" class="' + (CX.sc === 2 ? 'on' : '') + '">doppelt</button></div></div></div>' +
    '<div class="foot"><button class="btn" data-c="mclose">Schließen</button><button class="btn primary" data-c="export-ok">⬇️ Exportieren</button></div>', 820);
  const upd = () => { $$('.stc', m).forEach(e => e.classList.toggle('on', e.dataset.st === CX.st)); $$('.fmts button', m).forEach(e => e.classList.toggle('on', e.dataset.fmt === CX.fmt)); };
  const th = () => $$('.stc', m).forEach(e => { const cv = $('canvas', e), k = 250 / cmap().W; cv.width = 250; cv.height = Math.round(cmap().H * k); const g = cv.getContext('2d'); g.scale(k, k); renderCity(g, CE.c, e.dataset.st, { title: CX.title, labels: false }); });
  m.addEventListener('click', e => { const s = e.target.closest('.stc'), f = e.target.closest('.fmts button'); if (s) CX.st = s.dataset.st; if (f) CX.fmt = f.dataset.fmt; if (s || f) upd(); });
  m.addEventListener('change', e => { if (e.target.id === 'cxT') { CX.title = e.target.checked; th(); } if (e.target.id === 'cxL') CX.labels = e.target.checked; });
  segPick(m, '#cxSc', v => { CX.sc = +v; }); upd(); fontsReady().then(th);
}
function cityCanvas(c, st, sc, o) { const cv = document.createElement('canvas'); cv.width = Math.round(c.map.W * sc); cv.height = Math.round(c.map.H * sc); const g = cv.getContext('2d'); g.scale(sc, sc); renderCity(g, c, st, o); return cv; }
async function cityExport() {
  await fontsReady(); const c = CE.c, cv = cityCanvas(c, CX.st, CX.sc, { title: CX.title, labels: CX.labels }), name = baseName(c.name || 'Stadt') + '_Stadtkarte_' + { art: 'Kuenstlerisch', real: 'Realistisch', ink: 'Gezeichnet' }[CX.st];
  if (CX.fmt === 'pdf') { const jpg = new Uint8Array(await (await toBlob(cv, 'image/jpeg', .93)).arrayBuffer()); download(name + '.pdf', new Blob([buildPdf(jpg, cv.width, cv.height, 'a4', c.name)], { type: 'application/pdf' })); }
  else { const b = await toBlob(cv, { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[CX.fmt], .93); if (!b) { toast('Dieses Format kann der Browser nicht schreiben.'); return; } download(name + '.' + CX.fmt, b); }
  toast('Stadtkarte gespeichert.');
}
function cityHelp() { modal('<h2>Stadtkarten</h2><table>' + [['🎲 Zufällig', 'Erzeugt eine Karte aus Volk, Art, Gelände, Größe, Dichte und Läden. Jede Stadtart hat ihre eigene Struktur: Dorf an der Landstraße mit Feldern, Stadt mit Markt und Ringstraße, Großstadt mit Mauer und Palast, Festung mit Bergfried, Zeltstadt in Ringen ums Feuer, Hafen mit Kai und Stegen.'], ['▭ ⬠ ◯', 'Häuser als Rechteck, Vieleck oder Rundbau zeichnen. Der Typ (Reich, Arm, Shop, Gemeindehaus, Rathaus, Festung, Schänke, Palast, Religiös …) bestimmt Dach und Schmuck.'], ['🏠 Künstlerisch', 'Gezeichnete Häuser, Türme, Tempel, Zelte, Mühlen, Brunnen und Schiffe im Baustil des Volkes einsetzen.'], ['🛒 PoI', 'Shops, Schänken, Rathaus, Tempel usw. bekommen Name und Art. Sie wandern mit der Stadtkarte in den Atlas und sind dort auswählbar.'], ['🗺️ Umgebung', 'Oben rechts zeigt die Minikarte den Ausschnitt der Weltkarte rund um die Stadt.']].map(r => '<tr><td style="white-space:nowrap"><b>' + r[0] + '</b></td><td>' + r[1] + '</td></tr>').join('') + '</table><p class="small" style="margin-top:.8em"><kbd>Mausrad</kbd> zoomen · <kbd>Leertaste</kbd> + ziehen oder rechte Maustaste: verschieben · <kbd>Entf</kbd> löschen · <kbd>Strg</kbd>+<kbd>Z</kbd> rückgängig</p><div class="foot"><button class="btn primary" data-c="mclose">Verstanden</button></div>'); }
function closeCity() { const had = CE.on; CE.on = false; CE.c = null; if (!had) { closeModal(); return; } ccv = cwrap = cui = null; closeModal(); renderWork(); }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-c]'); if (!b) return; const a = b.dataset.c, v = b.dataset.v, c = CE.c; if (!c) return; const m = c.map;
  switch (a) {
    case 'gen-first': closeModal(); busy('Die Stadt entsteht …', () => { c.map = genCity(c, (Math.random() * 99999) | 0, {}); cityWork(); persist(); }); break;
    case 'empty-first': closeModal(); c.map = emptyCity(c); cityWork(); persist(); toast('Leere Karte – zeichne Straßen und Häuser.'); break;
    case 'back': closeCity(); break; case 'mclose': closeModal(); break;
    case 'undo': cUndo(false); break; case 'redo': cUndo(true); break;
    case 'view': m.view = v; cTop(); cDraw(); persist(); break;
    case 'labels': m.labels = !m.labels; cTop(); cDraw(); persist(); break;
    case 'gen': cityGenDialog(); break; case 'cgseed': $('#cgSeed').value = (Math.random() * 99999) | 0; break;
    case 'gen-ok': { const o = { coast: $('#cgCoast').checked, river: $('#cgRiver').checked ? undefined : false }, sd = +$('#cgSeed').value || 1; closeModal(); busy('Die Stadt entsteht …', () => { cPush(); const view = m.view, lab = m.labels; c.map = genCity(c, sd, o); c.map.view = view; c.map.labels = lab; CE.sel = null; cSize(); cFit(); cDraw(); cSide(); persist(); }); break; }
    case 'clear': cPush(); c.map = Object.assign(emptyCity(c), { W: m.W, H: m.H, view: m.view, labels: m.labels }); CE.sel = null; cDraw(); cSide(); persist(); toast('Karte geleert – mit ↶ kommt sie zurück.'); break;
    case 'export': cityExportDialog(); break; case 'export-ok': busy('Die Stadtkarte wird gerendert …', cityExport); break; case 'help': cityHelp(); break;
    case 'zin': cZoom(1.3); break; case 'zout': cZoom(1 / 1.3); break; case 'fit': cFit(); break;
    case 'mini': CE.mini = !CE.mini; drawMini(); break;
    case 'tool': CE.tool = v; CE.poly = null; if (v !== 'select') CE.sel = null; cSide(); break;
    case 'sk': CE.sk = v; cSide(); break; case 'bt': CE.bt = v; cSide(); break; case 'stamp': CE.stamp = v; cSide(); break;
    case 'pick': { const o = m.b.find(x => x.id === v); if (o) { CE.sel = { k: 'b', id: v }; CE.tool = 'select'; const q = bCenter(o), r = cwrap.getBoundingClientRect(); CE.v.tx = r.width / 2 - q[0] * CE.v.s; CE.v.ty = r.height / 2 - q[1] * CE.v.s; cApply(); cSide(); } break; }
    case 'selsk': { const o = cSelObj(); if (o) { cPush(); o.k = v; cDraw(); cSelBox(); persist(); } break; }
    case 'bRoll': { const o = cSelObj(); if (o) { cPush(); Object.assign(o, poiDefault(o.t, Math.random)); cDraw(); cSide(); persist(); } break; }
    case 'del': cDel(); break;
  }
});
function cDel() { const o = cSelObj(); if (!o) return; cPush(); const m = cmap(), key = { b: 'b', s: 'streets', w: 'walls', t: 'st' }[CE.sel.k]; m[key] = m[key].filter(x => x !== o); CE.sel = null; cDraw(); cSide(); persist(); }
document.addEventListener('input', e => {
  const f = e.target.dataset.cf; if (!f || !CE.on) return; const o = cSelObj(), val = e.target.value;
  if (f === 'ss') { CE.ss = +val; e.target.previousElementSibling.querySelector('span').textContent = Math.round(CE.ss / 3.2 * 100) + ' %'; return; }
  if (!o) return;
  if (f === 'bName') o.name = val; else if (f === 'bNotes') o.notes = val; else if (f === 'bOwner') o.owner = val; else if (f === 'bKindText') o.kindText = val; else if (f === 'bA') { o.a = +val; e.target.previousElementSibling.querySelector('span').textContent = Math.round(o.a * 57.3) + '°'; } else if (f === 'bW') o.w = clamp(+val || 6, 6, 400); else if (f === 'bH') o.h = clamp(+val || 6, 6, 400); else if (f === 'bR') o.r = clamp(+val || 4, 4, 200); else if (f === 'tS') o.s = +val; else return;
  cSoon(); persist();
});
document.addEventListener('change', e => {
  const f = e.target.dataset.cf; if (!f || !CE.on) return; const o = cSelObj(); if (!o) return;
  if (f === 'bT') { cPush(); o.t = e.target.value; if (BT[o.t].poi) Object.assign(o, poiDefault(o.t, Math.random)); else { delete o.name; delete o.kind; delete o.kindText; } cDraw(); cSide(); persist(); }
  else if (f === 'bKind') { cPush(); o.kind = e.target.value; if (PKBY[o.kind]) { o.style = PKBY[o.kind].style; delete o.kindText; } cSide(); persist(); } else if (f === 'bStyle') { cPush(); o.style = e.target.value; persist(); } else if (f === 'bDist') { cPush(); if (e.target.value) { o.district = e.target.value; o.districtSet = true; } else delete o.districtSet; persist(); } else if (f === 'wClosed') { cPush(); o.closed = e.target.checked; cDraw(); persist(); } else if (f === 'bName') setTimeout(() => { if (CE.on && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) cSide(); }, 300);
});
document.addEventListener('keydown', e => {
  if (!CE.on || !cwrap) return; const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  if (e.key === 'Escape') { closeModal(); CE.poly = null; CE.drag = null; cUi(); return; }
  if ((e.ctrlKey || e.metaKey) && !inField) { const k = e.key.toLowerCase(); if (k === 'z') { e.preventDefault(); cUndo(e.shiftKey); } else if (k === 'y') { e.preventDefault(); cUndo(true); } return; }
  if (inField || $('.modal')) return;
  if (e.code === 'Space') { CE.space = true; e.preventDefault(); } else if (e.key === 'Enter' && CE.poly) finishPoly(); else if (e.key === 'Delete' || e.key === 'Backspace') cDel();
});
document.addEventListener('keyup', e => { if (e.code === 'Space') CE.space = false; });
