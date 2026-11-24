/* DND5e Sessionverwaltung – Beziehungsnetz (Mindmap) mit Gruppen */
(function (W) {
'use strict';
const V = W.SV; const { $, $$, esc, S, T, L, uid, save, toast } = V;
const render = () => V.render();

/* ---------- Stammdaten ---------- */
const GKIND = {
  kingdom: ['Königreich / Reich', 'Kingdom / realm', '👑'], city: ['Stadt / Ort', 'Town / place', '🏰'], guild: ['Gilde', 'Guild', '⚒️'], gang: ['Bande', 'Gang', '🗡️'],
  faction: ['Fraktion', 'Faction', '⚜️'], order: ['Orden / Tempel', 'Order / temple', '⛪'], house: ['Adelshaus / Familie', 'Noble house / family', '🏠'], cult: ['Kult', 'Cult', '🕯️'],
  military: ['Armee / Wache', 'Army / guard', '🛡️'], party: ['Abenteurergruppe', 'Adventuring party', '🎒'], other: ['Sonstige (eigene Art)', 'Other (custom kind)', '✏️']
};
const LEVEL = {
  ally: ['Verbündet', 'Allied', '#1f7a3a'], good: ['Gut', 'Good', '#64a83a'], known: ['Bekannt', 'Acquainted', '#6b7c8c'],
  bad: ['Schlecht', 'Bad', '#d57a12'], enemy: ['Verfeindet', 'Hostile', '#b3261e']
};
const LEVELS = Object.keys(LEVEL);
const GCOL = ['#6e1a1a', '#2f5fa8', '#4f8a4a', '#7a3a8a', '#b8902f', '#3b6e6e', '#a0522d', '#5a6a9a', '#8a6f2a', '#2b2b2b'];
V.GKIND = GKIND; V.RLEVEL = LEVEL;

function ensure() { const c = S.camp; if (!c) return; c.groups = c.groups || []; c.rels = c.rels || []; c.graph = c.graph || { nodes: [] }; c.graph.nodes = c.graph.nodes || []; c.groups.forEach(g => { g.members = g.members || []; }); }
V.graphEnsure = ensure;
const K = r => r.t + ':' + r.id;
const same = (a, b) => a && b && a.t === b.t && a.id === b.id;
function ent(r) { const c = S.camp; if (!r) return null; return r.t === 'pc' ? c.pcs.find(x => x.id === r.id) : r.t === 'npc' ? c.npcs.find(x => x.id === r.id) : c.groups.find(x => x.id === r.id); }
function kindLbl(g) { return g.kind === 'other' ? (g.kindText || L(GKIND.other).split(' (')[0]) : L(GKIND[g.kind] || GKIND.other); }
function kindKey(g) { return g.kind === 'other' ? 'other:' + String(g.kindText || '').trim().toLowerCase() : g.kind; }
function info(r) {
  const e = ent(r); if (!e) return null;
  if (r.t === 'grp') return { name: e.name || T('Gruppe', 'Group'), l1: (GKIND[e.kind] || GKIND.other)[2] + ' ' + kindLbl(e), l2: e.members.length + ' ' + T('Mitglieder', 'members'), img: e.img, col: e.color || GCOL[0] };
  if (r.t === 'pc') return { name: e.name, l1: e.cls || T('Spielercharakter', 'Player character'), l2: [e.race, e.player ? '🎲 ' + e.player : ''].filter(Boolean).join(' · '), img: e.img, pc: true };
  return { name: e.name || T('NSC', 'NPC'), l1: V.npcProf(e) || '', l2: e.city || '', img: e.img, boss: e.boss && e.boss.on };
}
const groupsOf = r => S.camp.groups.filter(g => g.members.some(m => same(m, r)));
V.groupsOf = groupsOf;
const relsOf = r => S.camp.rels.filter(x => same(x.a, r) || same(x.b, r));
const onMap = r => S.camp.graph.nodes.find(n => same(n, r));
function addNode(r, x, y) {
  ensure(); if (!ent(r)) return null; let n = onMap(r); if (n) return n;
  const ns = S.camp.graph.nodes; if (x == null) { const v = viewCenter(); const k = ns.length; const a = k * 2.4, d = 40 + 34 * Math.sqrt(k); x = v.x + Math.cos(a) * d; y = v.y + Math.sin(a) * d; }
  n = { t: r.t, id: r.id, x: Math.round(x), y: Math.round(y) }; ns.push(n); return n;
}
V.graphAddNode = addNode;
function viewCenter() { const v = $('#gview'); const g = S.gv || { s: 1, tx: 0, ty: 0 }; if (!v) return { x: 400, y: 300 }; const r = v.getBoundingClientRect(); return { x: (r.width / 2 - g.tx) / g.s, y: (r.height / 2 - g.ty) / g.s }; }

/* ---------- Geometrie ---------- */
function box(n) { const i = info(n); if (!i) return null; if (i.img) { const r = n.t === 'grp' ? 46 : 38; return { round: true, r, w: 2 * r, h: 2 * r }; } return n.t === 'grp' ? { w: 176, h: 64 } : { w: 156, h: 60 }; }
function clip(n, b, tx, ty) { // Randpunkt von Knoten n in Richtung (tx,ty)
  const dx = tx - n.x, dy = ty - n.y; const len = Math.hypot(dx, dy) || 1;
  if (b.round) return { x: n.x + dx / len * (b.r + 5), y: n.y + dy / len * (b.r + 5) };
  const hw = b.w / 2 + 5, hh = b.h / 2 + 5; const k = Math.min(hw / Math.abs(dx || 1e-9), hh / Math.abs(dy || 1e-9));
  return { x: n.x + dx * k, y: n.y + dy * k };
}

/* ---------- Zeichnen ---------- */
function nodeSvg(n) {
  const i = info(n); if (!i) return ''; const b = box(n); const sel = S.gSel && S.gSel.t === n.t && S.gSel.id === n.id; const src = S.gLinkFrom && same(S.gLinkFrom, n);
  const grs = n.t === 'grp' ? [] : groupsOf(n); const cls = 'gn ' + n.t + (sel ? ' sel' : '') + (src ? ' src' : '');
  let h = '<g class="' + cls + '" data-gn="' + K(n) + '" transform="translate(' + n.x + ',' + n.y + ')">';
  const ring = n.t === 'grp' ? i.col : i.pc ? '#2f5fa8' : '#8a6f55';
  if (b.round) {
    const cid = 'gc' + n.t + n.id;
    h += '<defs><clipPath id="' + cid + '"><circle r="' + b.r + '"/></clipPath></defs><circle class="hl" r="' + (b.r + 6) + '"/><circle r="' + (b.r + 2) + '" fill="' + ring + '"/><image href="' + i.img + '" x="' + -b.r + '" y="' + -b.r + '" width="' + 2 * b.r + '" height="' + 2 * b.r + '" preserveAspectRatio="xMidYMid slice" clip-path="url(#' + cid + ')"/>' +
      '<text class="gname" y="' + (b.r + 17) + '">' + esc(trim(i.name, 24)) + '</text><text class="gsub" y="' + (b.r + 31) + '">' + esc(trim([i.l1, i.l2].filter(Boolean).join(' · '), 32)) + '</text>';
  } else {
    const x = -b.w / 2, y = -b.h / 2;
    h += '<rect class="hl" x="' + (x - 6) + '" y="' + (y - 6) + '" width="' + (b.w + 12) + '" height="' + (b.h + 12) + '" rx="14"/>';
    if (n.t === 'grp') h += '<rect x="' + x + '" y="' + y + '" width="' + b.w + '" height="' + b.h + '" rx="10" fill="#fffaf0" stroke="' + i.col + '" stroke-width="3"/><rect x="' + x + '" y="' + y + '" width="' + b.w + '" height="20" rx="10" fill="' + i.col + '"/><rect x="' + x + '" y="' + (y + 10) + '" width="' + b.w + '" height="10" fill="' + i.col + '"/>' +
      '<text class="gk" y="' + (y + 14) + '">' + esc(trim(i.l1, 28)) + '</text><text class="gname" y="' + (y + 39) + '">' + esc(trim(i.name, 22)) + '</text><text class="gsub" y="' + (y + 55) + '">' + esc(i.l2) + '</text>';
    else h += '<rect x="' + x + '" y="' + y + '" width="' + b.w + '" height="' + b.h + '" rx="8" fill="' + (i.pc ? '#eef3fb' : '#fffaf0') + '" stroke="' + ring + '" stroke-width="2"/>' +
      '<text class="gname" y="' + (y + 19) + '">' + (i.boss ? '👑 ' : '') + esc(trim(i.name, 21)) + '</text><text class="gsub" y="' + (y + 36) + '">' + esc(trim(i.l1, 26)) + '</text><text class="gsub" y="' + (y + 51) + '">' + esc(trim(i.l2 ? (n.t === 'npc' ? '📍 ' : '') + i.l2 : '', 26)) + '</text>';
  }
  // Gruppen-Punkte
  if (grs.length) { const yy = b.round ? -b.r - 4 : -b.h / 2 - 4; grs.slice(0, 6).forEach((g, k) => { h += '<circle cx="' + (-((grs.length > 6 ? 6 : grs.length) - 1) * 7 + k * 14) + '" cy="' + yy + '" r="6" fill="' + (g.color || GCOL[0]) + '" stroke="#fffaf0" stroke-width="1.5"><title>' + esc(g.name) + '</title></circle>'; }); }
  return h + '</g>';
}
const trim = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
function edgesSvg() {
  const c = S.camp; const pos = {}; c.graph.nodes.forEach(n => { pos[K(n)] = n; });
  const vis = S.gLevels || {}; let h = '';
  // Mitgliedschaften
  if (S.gMembers !== false) c.groups.forEach(g => { const gn = pos['grp:' + g.id]; if (!gn) return; const gb = box(gn); g.members.forEach(m => { const mn = pos[K(m)]; if (!mn) return; const mb = box(mn); const p1 = clip(mn, mb, gn.x, gn.y), p2 = clip(gn, gb, mn.x, mn.y); h += '<line class="gm" x1="' + p1.x + '" y1="' + p1.y + '" x2="' + p2.x + '" y2="' + p2.y + '" stroke="' + (g.color || GCOL[0]) + '"/>'; }); });
  // Beziehungen
  const pairCount = {};
  c.rels.forEach(r => { const k = [K(r.a), K(r.b)].sort().join('|'); pairCount[k] = (pairCount[k] || 0) + 1; });
  const pairIdx = {};
  c.rels.forEach(r => {
    const A = pos[K(r.a)], B = pos[K(r.b)]; if (!A || !B || vis[r.level] === false) return;
    const pk = [K(r.a), K(r.b)].sort().join('|'); const idx = pairIdx[pk] = (pairIdx[pk] || 0) + 1; const tot = pairCount[pk];
    const col = (LEVEL[r.level] || LEVEL.known)[2];
    const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1; const nx = -dy / len, ny = dx / len;
    const flip = K(r.a) < K(r.b) ? 1 : -1; const off = tot > 1 ? (idx - (tot + 1) / 2) * 46 * flip : 0;
    const mx = (A.x + B.x) / 2 + nx * off * 1.0, my = (A.y + B.y) / 2 + ny * off * 1.0;
    const p1 = clip(A, box(A), mx, my), p2 = clip(B, box(B), mx, my);
    const cx = 2 * mx - (p1.x + p2.x) / 2, cy = 2 * my - (p1.y + p2.y) / 2;
    const d = off ? 'M' + p1.x + ',' + p1.y + ' Q' + cx + ',' + cy + ' ' + p2.x + ',' + p2.y : 'M' + p1.x + ',' + p1.y + ' L' + p2.x + ',' + p2.y;
    const sel = S.gRel === r.id;
    h += '<g class="ge' + (sel ? ' sel' : '') + '" data-ge="' + r.id + '"><path class="gehit" d="' + d + '"/><path class="gel" d="' + d + '" stroke="' + col + '" marker-end="url(#ah-' + (r.level || 'known') + ')"' + (r.dir === 'both' ? ' marker-start="url(#ah-' + (r.level || 'known') + ')"' : '') + '/>';
    if (r.label) { const lx = off ? (p1.x + 2 * cx + p2.x) / 4 : mx, ly = off ? (p1.y + 2 * cy + p2.y) / 4 : my; h += '<text class="glab" x="' + lx + '" y="' + (ly - 5) + '" fill="' + col + '">' + esc(trim(r.label, 30)) + '</text>'; }
    h += '</g>';
  });
  return h;
}
function svgAll() {
  const g = S.gv; let defs = '<defs>' + LEVELS.map(l => '<marker id="ah-' + l + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="16" markerHeight="16" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0,0.5 L10,5 L0,9.5 L2.5,5 z" fill="' + LEVEL[l][2] + '"/></marker>').join('') + '</defs>';
  return defs + '<g transform="translate(' + g.tx + ',' + g.ty + ') scale(' + g.s + ')">' + edgesSvg() + S.camp.graph.nodes.map(nodeSvg).join('') + '</g>';
}
function draw() { const sv = $('#gsvg'); if (sv) sv.innerHTML = svgAll(); }
V.drawGraph = draw;

/* ---------- Ansicht ---------- */
V.renderGraph = function () {
  ensure(); if (!S.gv) S.gv = { s: 1, tx: 0, ty: 0 }; if (!S.gLevels) S.gLevels = {};
  const c = S.camp;
  const h = '<div class="maptop card"><div class="row">' +
    '<div class="advsel"><button data-a="gMode" data-v="select" class="' + (S.gMode !== 'link' ? 'on' : '') + '">🖐️ ' + T('Auswählen / Verschieben', 'Select / move') + '</button><button data-a="gMode" data-v="link" class="' + (S.gMode === 'link' ? 'on' : '') + '">↗ ' + T('Beziehung ziehen', 'Draw relationship') + '</button></div>' +
    '<button class="btn sm primary" data-a="gNewGroup">＋ ' + T('Neue Gruppe', 'New group') + '</button>' +
    '<select data-ch="gAdd"><option value="">＋ ' + T('Auf die Mindmap …', 'Add to the mind map …') + '</option>' + addOptions() + '</select>' +
    '<button class="btn sm" data-a="gAddAll" title="' + T('Alle Spielercharaktere und Gruppen auf die Mindmap', 'All player characters and groups onto the mind map') + '">👥 ' + T('Gruppe & Charaktere', 'Party & groups') + '</button>' +
    '<span class="sp"></span>' +
    '<div class="glegend">' + LEVELS.map(l => '<label class="chk" title="' + T('ein-/ausblenden', 'show/hide') + '"><input type="checkbox" data-ch="gLevel" data-v="' + l + '"' + (S.gLevels[l] === false ? '' : ' checked') + '><i style="background:' + LEVEL[l][2] + '"></i>' + esc(L(LEVEL[l])) + '</label>').join('') +
    '<label class="chk"><input type="checkbox" data-ch="gMembers"' + (S.gMembers === false ? '' : ' checked') + '><i class="dash"></i>' + T('Mitgliedschaft', 'Membership') + '</label></div>' +
    '<button class="btn sm" data-a="gLayout" title="' + T('Automatisch anordnen', 'Arrange automatically') + '">🧭</button><button class="btn sm" data-a="gZoom" data-v="1.25">＋</button><button class="btn sm" data-a="gZoom" data-v="0.8">－</button><button class="btn sm" data-a="gFit">⤢</button></div>' +
    (S.gMode === 'link' ? '<div class="note small">' + (S.gLinkFrom ? '↗ ' + T('Jetzt das Ziel anklicken – der Pfeil zeigt von „', 'Now click the target – the arrow points from "') + esc((info(S.gLinkFrom) || {}).name) + T('“ dorthin. Esc bricht ab.', '" to it. Esc cancels.') : T('Klicke zuerst die Person oder Gruppe an, von der die Beziehung ausgeht, dann das Ziel.', 'First click the person or group the relationship starts from, then the target.')) + '</div>' : '') + '</div>' +
    '<div class="mapsplit"><div class="mapview gview ' + (S.gMode === 'link' ? 'adding' : '') + '" id="gview">' + (c.graph.nodes.length ? '' : '<div class="gempty">' + T('Noch leer. Lege eine Gruppe an oder hole Charaktere, NSCs und Gruppen über „Auf die Mindmap …“ dazu.', 'Still empty. Create a group or add characters, NPCs and groups via "Add to the mind map …".') + '</div>') + '<svg id="gsvg" xmlns="http://www.w3.org/2000/svg"></svg></div><div class="mapside card">' + side() + '</div></div>';
  return h;
};
function addOptions() {
  const c = S.camp; const not = (t, l) => l.filter(e => !onMap({ t, id: e.id }));
  const og = (lbl, t, l, nm) => l.length ? '<optgroup label="' + esc(lbl) + '">' + l.map(e => '<option value="' + t + ':' + e.id + '">' + esc(nm(e)) + '</option>').join('') + '</optgroup>' : '';
  return og(T('Gruppen', 'Groups'), 'grp', not('grp', c.groups), g => (GKIND[g.kind] || GKIND.other)[2] + ' ' + g.name) + og(T('Spielercharaktere', 'Player characters'), 'pc', not('pc', c.pcs), p => '🛡️ ' + p.name) + og(T('NSCs', 'NPCs'), 'npc', not('npc', c.npcs).sort((a, b) => (a.name || '').localeCompare(b.name || '')), n => '🎭 ' + n.name + (n.city ? ' (' + n.city + ')' : ''));
}
V.mountGraph = function () {
  const v = $('#gview'); if (!v) return; ensure();
  if (!S.gv.ok) { fit(); S.gv.ok = true; } else draw();
  if (v._b) return; v._b = true;
  v.addEventListener('wheel', e => { e.preventDefault(); const r = v.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  v.addEventListener('mousedown', e => {
    if (e.button !== 0) return; const ng = e.target.closest('[data-gn]'); const eg = e.target.closest('[data-ge]');
    if (ng) { const [t, id] = ng.dataset.gn.split(':'); const n = onMap({ t, id }); drag = { kind: 'node', n, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y, moved: false }; }
    else if (eg) drag = { kind: 'edge', id: eg.dataset.ge, sx: e.clientX, sy: e.clientY, moved: false };
    else drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, tx: S.gv.tx, ty: S.gv.ty, moved: false };
    e.preventDefault();
  });
  if (V._gWin) return; V._gWin = true;
  W.addEventListener('mousemove', e => {
    if (!drag || !$('#gview')) return; const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true; if (!drag.moved) return;
    if (drag.kind === 'node' && S.gMode !== 'link') { drag.n.x = Math.round(drag.ox + dx / S.gv.s); drag.n.y = Math.round(drag.oy + dy / S.gv.s); draw(); }
    else if (drag.kind === 'pan') { S.gv.tx = drag.tx + dx; S.gv.ty = drag.ty + dy; draw(); }
  });
  W.addEventListener('mouseup', () => {
    if (!drag || !$('#gview')) { drag = null; return; } const d = drag; drag = null;
    if (d.kind === 'node') {
      if (d.moved && S.gMode !== 'link') { save(); return; }
      const r = { t: d.n.t, id: d.n.id };
      if (S.gMode === 'link') { if (!S.gLinkFrom) { S.gLinkFrom = r; render(); return; } if (same(S.gLinkFrom, r)) { S.gLinkFrom = null; render(); return; } createRel(S.gLinkFrom, r); return; }
      S.gSel = r; S.gRel = null; render(); return;
    }
    if (d.kind === 'edge' && !d.moved) { S.gRel = d.id; S.gSel = null; render(); return; }
    if (d.kind === 'pan' && !d.moved && (S.gSel || S.gRel || S.gLinkFrom)) { S.gSel = null; S.gRel = null; if (S.gMode !== 'link') S.gLinkFrom = null; render(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.tab === 'graph' && (S.gLinkFrom || S.gMode === 'link')) { S.gLinkFrom = null; S.gMode = 'select'; render(); } if ((e.key === 'Delete') && S.tab === 'graph' && S.gRel && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) V.A.gRelDel(); });
};
let drag = null;
function zoomAt(f, cx, cy) { const g = S.gv; const ns = Math.max(.15, Math.min(4, g.s * f)); const k = ns / g.s; g.tx = cx - (cx - g.tx) * k; g.ty = cy - (cy - g.ty) * k; g.s = ns; draw(); }
function fit() {
  const v = $('#gview'); const ns = S.camp.graph.nodes; if (!v) return; const r = v.getBoundingClientRect();
  if (!ns.length) { S.gv = { s: 1, tx: r.width / 2 - 400, ty: r.height / 2 - 300, ok: true }; draw(); return; }
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; ns.forEach(n => { const b = box(n) || { w: 100, h: 60 }; x0 = Math.min(x0, n.x - b.w / 2); x1 = Math.max(x1, n.x + b.w / 2); y0 = Math.min(y0, n.y - b.h / 2); y1 = Math.max(y1, n.y + b.h / 2 + 34); });
  const s = Math.max(.2, Math.min(1.4, Math.min((r.width - 60) / (x1 - x0 || 1), (r.height - 60) / (y1 - y0 || 1))));
  S.gv = { s, tx: r.width / 2 - (x0 + x1) / 2 * s, ty: r.height / 2 - (y0 + y1) / 2 * s, ok: true }; draw();
}
function layout() { // einfache Kräfte-Anordnung
  const ns = S.camp.graph.nodes; if (ns.length < 2) return; const idx = {}; ns.forEach((n, i) => { idx[K(n)] = i; if (!isFinite(n.x)) { n.x = Math.random() * 600; n.y = Math.random() * 400; } });
  const links = []; S.camp.rels.forEach(r => { const a = idx[K(r.a)], b = idx[K(r.b)]; if (a != null && b != null) links.push([a, b, 240]); });
  S.camp.groups.forEach(g => { const gi = idx['grp:' + g.id]; if (gi == null) return; g.members.forEach(m => { const mi = idx[K(m)]; if (mi != null) links.push([gi, mi, 180]); }); });
  const P = ns.map(n => ({ x: n.x, y: n.y }));
  for (let it = 0; it < 400; it++) {
    const F = P.map(() => ({ x: 0, y: 0 })); const t = 1 - it / 400;
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { let dx = P[i].x - P[j].x, dy = P[i].y - P[j].y; let d2 = dx * dx + dy * dy || .01; const d = Math.sqrt(d2); if (d > 900) continue; const f = 60000 / d2; F[i].x += dx / d * f; F[i].y += dy / d * f; F[j].x -= dx / d * f; F[j].y -= dy / d * f; }
    links.forEach(([a, b, L0]) => { const dx = P[b].x - P[a].x, dy = P[b].y - P[a].y; const d = Math.hypot(dx, dy) || .01; const f = (d - L0) * .06; F[a].x += dx / d * f; F[a].y += dy / d * f; F[b].x -= dx / d * f; F[b].y -= dy / d * f; });
    let cx = 0, cy = 0; P.forEach(p => { cx += p.x; cy += p.y; }); cx /= P.length; cy /= P.length;
    P.forEach((p, i) => { F[i].x += (cx - p.x) * .004; F[i].y += (cy - p.y) * .004; const m = Math.hypot(F[i].x, F[i].y); const lim = 40 * t + 2; if (m > lim) { F[i].x *= lim / m; F[i].y *= lim / m; } p.x += F[i].x; p.y += F[i].y; });
  }
  ns.forEach((n, i) => { n.x = Math.round(P[i].x); n.y = Math.round(P[i].y); });
}

/* ---------- Seitenleiste ---------- */
function levelSel(attr, v) { return '<select ' + attr + '>' + LEVELS.map(l => '<option value="' + l + '"' + (v === l ? ' selected' : '') + '>' + esc(L(LEVEL[l])) + '</option>').join('') + '</select>'; }
function relLine(r, from) {
  const other = same(r.a, from) ? r.b : r.a; const out = same(r.a, from); const i = info(other); if (!i) return '';
  const arrow = r.dir === 'both' ? '↔' : out ? '→' : '←';
  return '<div class="li grel" data-a="gSelRel" data-id="' + r.id + '"><span class="st" style="color:' + LEVEL[r.level || 'known'][2] + '">' + arrow + '</span><div><b>' + esc(i.name) + '</b> <span class="rlv" style="background:' + LEVEL[r.level || 'known'][2] + '">' + esc(L(LEVEL[r.level || 'known'])) + '</span>' + (r.label ? '<div class="tiny muted">' + esc(r.label) + '</div>' : '') + '</div></div>';
}
function side() {
  const c = S.camp;
  const r = S.gRel && c.rels.find(x => x.id === S.gRel);
  if (r) return relEditor(r);
  const sel = S.gSel && ent(S.gSel) ? S.gSel : null;
  if (sel) return sel.t === 'grp' ? groupEditor(ent(sel)) : personPanel(sel);
  return '<h3>🕸️ ' + T('Beziehungsnetz', 'Relationship web') + '</h3><p class="small muted">' + T('Gruppen (Königreiche, Banden, Gilden, Städte …), Spielercharaktere und NSCs mit ihren Beziehungen. Elemente anklicken zum Bearbeiten, ziehen zum Verschieben. Mit „↗ Beziehung ziehen“ erst den Ausgangspunkt, dann das Ziel anklicken – der Pfeil zeigt vom ersten zum zweiten.', 'Groups (kingdoms, gangs, guilds, towns …), player characters and NPCs with their relationships. Click an element to edit it, drag to move it. With "↗ Draw relationship" click the starting point first, then the target – the arrow points from the first to the second.') + '</p>' +
    '<h4 class="kick">🏛️ ' + T('Gruppen', 'Groups') + ' <span class="tiny">' + c.groups.length + '</span></h4>' + (c.groups.length ? c.groups.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(g => '<div class="li" data-a="gSelect" data-v="grp:' + g.id + '"><span class="st"><i class="gdot" style="background:' + (g.color || GCOL[0]) + '"></i></span><div><b>' + esc(g.name) + '</b><div class="tiny muted">' + esc(kindLbl(g)) + ' · ' + g.members.length + ' ' + T('Mitglieder', 'members') + (onMap({ t: 'grp', id: g.id }) ? '' : ' · ' + T('nicht auf der Mindmap', 'not on the map')) + '</div></div></div>').join('') : '<p class="small muted">' + T('Noch keine Gruppen.', 'No groups yet.') + '</p>') +
    '<div class="row" style="margin-top:.4em"><button class="btn sm" data-a="gNewGroup">＋ ' + T('Neue Gruppe', 'New group') + '</button>' + (V.cityList().length ? '<button class="btn sm" data-a="gCities" title="' + T('Für jeden Ort der Karte eine Gruppe „Stadt“ anlegen und die NSCs mit diesem Wohnort zuordnen', 'Create a "town" group for every place on the map and assign the NPCs who live there') + '">🏰 ' + T('Städte als Gruppen', 'Towns as groups') + '</button>' : '') + '</div>' +
    '<h4 class="kick">↗ ' + T('Beziehungen', 'Relationships') + ' <span class="tiny">' + c.rels.length + '</span></h4>' + (c.rels.length ? c.rels.map(x => { const a = info(x.a), b = info(x.b); if (!a || !b) return ''; return '<div class="li grel" data-a="gSelRel" data-id="' + x.id + '"><span class="st" style="color:' + LEVEL[x.level || 'known'][2] + '">' + (x.dir === 'both' ? '↔' : '→') + '</span><div><b>' + esc(a.name) + '</b> ' + (x.dir === 'both' ? '↔' : '→') + ' <b>' + esc(b.name) + '</b><div class="tiny muted">' + esc(L(LEVEL[x.level || 'known'])) + (x.label ? ' · ' + esc(x.label) : '') + '</div></div></div>'; }).join('') : '<p class="small muted">' + T('Noch keine Beziehungen.', 'No relationships yet.') + '</p>');
}
function imgBtns(r, e) { return '<div class="row">' + '<button class="btn sm" data-a="gImg" data-v="' + K(r) + '">🖼️ ' + (e.img ? T('Bild ändern', 'Change picture') : T('Bild wählen', 'Choose picture')) + '</button>' + (e.img ? '<button class="btn sm ghost" data-a="gImgDel" data-v="' + K(r) + '">✖ ' + T('Bild entfernen', 'Remove picture') + '</button>' : '') + '</div>'; }
function relBlock(r) {
  const rs = relsOf(r);
  return '<h4 class="kick">↗ ' + T('Beziehungen', 'Relationships') + ' <button class="btn sm" data-a="gLinkStart" data-v="' + K(r) + '" title="' + T('Neue Beziehung von hier aus ziehen', 'Draw a new relationship from here') + '">＋ ' + T('Ziehen', 'Draw') + '</button></h4>' +
    (rs.length ? rs.map(x => relLine(x, r)).join('') : '<p class="small muted">' + T('Keine Beziehungen.', 'No relationships.') + '</p>') +
    '<div class="row gaddrel"><select id="gRelTo"><option value="">＋ ' + T('Beziehung zu …', 'Relationship to …') + '</option>' + allRefs(r) + '</select>' + levelSel('id="gRelLv"', 'known') + '<button class="btn sm primary" data-a="gRelAdd" data-v="' + K(r) + '">＋</button></div>';
}
function allRefs(except) {
  const c = S.camp; const o = (t, e, lbl) => same(except, { t, id: e.id }) ? '' : '<option value="' + t + ':' + e.id + '">' + esc(lbl) + '</option>';
  return '<optgroup label="' + T('Gruppen', 'Groups') + '">' + c.groups.map(g => o('grp', g, (GKIND[g.kind] || GKIND.other)[2] + ' ' + g.name)).join('') + '</optgroup><optgroup label="' + T('Spielercharaktere', 'Player characters') + '">' + c.pcs.map(p => o('pc', p, '🛡️ ' + p.name)).join('') + '</optgroup><optgroup label="' + T('NSCs', 'NPCs') + '">' + c.npcs.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(n => o('npc', n, '🎭 ' + n.name)).join('') + '</optgroup>';
}
function personPanel(r) {
  const e = ent(r); const i = info(r); const grs = groupsOf(r);
  const avail = S.camp.groups.filter(g => !grs.includes(g));
  return '<h3>' + (r.t === 'pc' ? '🛡️ ' : '🎭 ') + esc(i.name) + '<span class="r"><button class="btn sm ghost" data-a="gClose">✖</button></span></h3><div class="small muted">' + esc([i.l1, i.l2].filter(Boolean).join(' · ')) + '</div>' +
    '<div class="row" style="margin:.35em 0"><button class="btn sm" data-a="gOpenEnt" data-v="' + K(r) + '">' + (r.t === 'pc' ? '🛡️ ' + T('Zum Charakter', 'Open character') : '🎭 ' + T('NSC öffnen', 'Open NPC')) + '</button>' + (onMap(r) ? '<button class="btn sm ghost" data-a="gRemoveNode" data-v="' + K(r) + '" title="' + T('Nur von der Mindmap nehmen – Beziehungen bleiben gespeichert', 'Only take off the mind map – relationships are kept') + '">⤫ ' + T('Von der Mindmap', 'Off the map') + '</button>' : '<button class="btn sm" data-a="gPut" data-v="' + K(r) + '">＋ ' + T('Auf die Mindmap', 'Onto the map') + '</button>') + '</div>' + imgBtns(r, e) +
    '<h4 class="kick">🏛️ ' + T('Gruppen', 'Groups') + '</h4><div class="chips">' + (grs.length ? grs.map(g => '<span class="npcchip" data-a="gSelect" data-v="grp:' + g.id + '"><i class="gdot" style="background:' + (g.color || GCOL[0]) + '"></i><b>' + esc(g.name) + '</b> <span class="tiny">' + esc(kindLbl(g)) + '</span><button class="x" data-a="gLeave" data-g="' + g.id + '" data-v="' + K(r) + '" title="' + T('Aus der Gruppe nehmen', 'Remove from group') + '">×</button></span>').join('') : '<span class="small muted">' + T('Keiner Gruppe zugeordnet.', 'Not in any group.') + '</span>') + '</div>' +
    (avail.length ? '<div class="row gaddrel"><select id="gJoin"><option value="">＋ ' + T('Zu Gruppe hinzufügen …', 'Add to group …') + '</option>' + avail.map(g => '<option value="' + g.id + '">' + (GKIND[g.kind] || GKIND.other)[2] + ' ' + esc(g.name) + ' (' + esc(kindLbl(g)) + ')</option>').join('') + '</select><button class="btn sm primary" data-a="gJoin" data-v="' + K(r) + '">＋</button></div>' : '') +
    relBlock(r);
}
function groupEditor(g) {
  const r = { t: 'grp', id: g.id }; const c = S.camp;
  const cand = c.pcs.map(p => ({ t: 'pc', id: p.id, n: '🛡️ ' + p.name })).concat(c.npcs.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(n => ({ t: 'npc', id: n.id, n: '🎭 ' + n.name + (n.city ? ' (' + n.city + ')' : '') }))).filter(x => !g.members.some(m => same(m, x)));
  const cityHits = g.kind === 'city' ? c.npcs.filter(n => n.city && n.city.trim().toLowerCase() === String(g.name || '').trim().toLowerCase() && !g.members.some(m => m.t === 'npc' && m.id === n.id)) : [];
  return '<h3>' + (GKIND[g.kind] || GKIND.other)[2] + ' <input type="text" class="cname" data-in="grp" data-k="name" value="' + esc(g.name) + '"><span class="r"><button class="btn sm ghost" data-a="gClose">✖</button></span></h3>' +
    '<div class="cgrid"><label>' + T('Art', 'Kind') + '<select data-ch="grpKind">' + Object.keys(GKIND).map(k => '<option value="' + k + '"' + (g.kind === k ? ' selected' : '') + '>' + GKIND[k][2] + ' ' + esc(L(GKIND[k])) + '</option>').join('') + '</select></label><label>' + T('Farbe', 'Colour') + '<input type="color" data-ch="grpColor" value="' + esc(g.color || GCOL[0]) + '"></label></div>' +
    (g.kind === 'other' ? '<label class="blk">' + T('Eigene Art', 'Custom kind') + '<input type="text" data-in="grp" data-k="kindText" value="' + esc(g.kindText) + '" placeholder="' + T('z. B. Handelsbund, Zirkel, Stamm', 'e.g. trade league, circle, tribe') + '"></label>' : '') +
    '<div class="row" style="margin:.35em 0">' + (onMap(r) ? '<button class="btn sm ghost" data-a="gRemoveNode" data-v="' + K(r) + '">⤫ ' + T('Von der Mindmap', 'Off the map') + '</button>' : '<button class="btn sm" data-a="gPut" data-v="' + K(r) + '">＋ ' + T('Auf die Mindmap', 'Onto the map') + '</button>') + '<button class="btn sm ghost" data-a="gGroupDel">🗑️ ' + T('Gruppe löschen', 'Delete group') + '</button></div>' + imgBtns(r, g) +
    '<label class="blk">' + T('Notizen', 'Notes') + '<textarea data-in="grp" data-k="notes" placeholder="' + T('Ziele, Anführer, Sitz, Geheimnisse …', 'Goals, leader, seat, secrets …') + '">' + esc(g.notes) + '</textarea></label>' +
    '<h4 class="kick">👥 ' + T('Mitglieder', 'Members') + ' <span class="tiny">' + g.members.length + '</span></h4>' +
    (g.members.length ? g.members.map(m => { const i = info(m); if (!i) return ''; return '<div class="li" data-a="gSelect" data-v="' + K(m) + '"><span class="st">' + (m.t === 'pc' ? '🛡️' : '🎭') + '</span><div><b>' + esc(i.name) + '</b><div class="tiny muted">' + esc([i.l1, i.l2].filter(Boolean).join(' · ')) + '</div></div><button class="btn sm ghost x" data-a="gLeave" data-g="' + g.id + '" data-v="' + K(m) + '">×</button></div>'; }).join('') : '<p class="small muted">' + T('Noch keine Mitglieder.', 'No members yet.') + '</p>') +
    (cand.length ? '<div class="row gaddrel"><select id="gMemberPick"><option value="">＋ ' + T('Mitglied hinzufügen …', 'Add member …') + '</option>' + cand.map(x => '<option value="' + x.t + ':' + x.id + '">' + esc(x.n) + '</option>').join('') + '</select><button class="btn sm primary" data-a="gMemberAdd">＋</button></div>' : '') +
    (cityHits.length ? '<button class="btn sm" data-a="gCityResidents">🏘️ ' + cityHits.length + ' ' + T('NSCs mit Wohnort hier zuordnen', 'NPCs living here – assign') + '</button>' : '') +
    relBlock(r);
}
function relEditor(r) {
  const a = info(r.a), b = info(r.b); const col = LEVEL[r.level || 'known'][2];
  return '<h3>↗ ' + T('Beziehung', 'Relationship') + '<span class="r"><button class="btn sm ghost" data-a="gClose">✖</button></span></h3>' +
    '<div class="relhead"><span class="npcchip" data-a="gSelect" data-v="' + K(r.a) + '"><b>' + esc(a ? a.name : '?') + '</b></span><span class="rarrow" style="color:' + col + '">' + (r.dir === 'both' ? '⟷' : '⟶') + '</span><span class="npcchip" data-a="gSelect" data-v="' + K(r.b) + '"><b>' + esc(b ? b.name : '?') + '</b></span></div>' +
    '<div class="row" style="margin:.4em 0"><div class="advsel"><button data-a="gDir" data-v="ab" class="' + (r.dir !== 'both' ? 'on' : '') + '">→ ' + T('einseitig', 'one-way') + '</button><button data-a="gDir" data-v="both" class="' + (r.dir === 'both' ? 'on' : '') + '">↔ ' + T('wechselseitig', 'mutual') + '</button></div>' + (r.dir !== 'both' ? '<button class="btn sm" data-a="gSwap" title="' + T('Richtung umkehren', 'Reverse direction') + '">⇄</button>' : '') + '</div>' +
    '<div class="tiny muted">' + T('Art der Beziehung', 'Kind of relationship') + '</div><div class="lvpick">' + LEVELS.map(l => '<button class="lvb ' + (r.level === l ? 'on' : '') + '" data-a="gLevelSet" data-v="' + l + '" style="--c:' + LEVEL[l][2] + '"><i></i>' + esc(L(LEVEL[l])) + '</button>').join('') + '</div>' +
    '<label class="blk">' + T('Bezeichnung (am Pfeil)', 'Label (on the arrow)') + '<input type="text" data-in="rel" data-k="label" value="' + esc(r.label) + '" placeholder="' + T('z. B. Bruder, schuldet Geld, Lehensherr', 'e.g. brother, owes money, liege lord') + '"></label>' +
    '<label class="blk">' + T('Notiz', 'Note') + '<textarea data-in="rel" data-k="note">' + esc(r.note) + '</textarea></label>' +
    '<div class="foot"><button class="btn sm ghost" data-a="gRelDel">🗑️ ' + T('Beziehung löschen', 'Delete relationship') + '</button></div>';
}

/* ---------- Mini-Ansicht für NSC- und Charakterseite ---------- */
V.graphMini = function (t, id) {
  ensure(); const r = { t, id }; const grs = groupsOf(r); const rs = relsOf(r);
  return '<h4 class="kick">🕸️ ' + T('Gruppen & Beziehungen', 'Groups & relationships') + ' <button class="btn sm" data-a="gShow" data-v="' + K(r) + '">' + T('In der Mindmap', 'In the mind map') + '</button></h4>' +
    '<div class="chips">' + grs.map(g => '<span class="npcchip" data-a="gShow" data-v="grp:' + g.id + '"><i class="gdot" style="background:' + (g.color || GCOL[0]) + '"></i>' + esc(g.name) + '</span>').join('') + rs.map(x => { const o = same(x.a, r) ? x.b : x.a; const i = info(o); if (!i) return ''; return '<span class="npcchip" data-a="gShowRel" data-id="' + x.id + '"><span style="color:' + LEVEL[x.level || 'known'][2] + ';font-weight:700">' + (x.dir === 'both' ? '↔' : same(x.a, r) ? '→' : '←') + '</span> ' + esc(i.name) + ' <span class="tiny">' + esc(x.label || L(LEVEL[x.level || 'known'])) + '</span></span>'; }).join('') + (grs.length || rs.length ? '' : '<span class="small muted">' + T('Noch keine.', 'None yet.') + '</span>') + '</div>';
};

/* ---------- Aktionen ---------- */
function parseRef(v) { const i = String(v || '').indexOf(':'); return i < 0 ? null : { t: v.slice(0, i), id: v.slice(i + 1) }; }
function createRel(a, b, level) {
  ensure(); if (same(a, b)) return; addNode(a); addNode(b);
  const r = { id: uid(), a: { t: a.t, id: a.id }, b: { t: b.t, id: b.id }, dir: 'ab', level: level || 'known', label: '', note: '', created: Date.now() };
  S.camp.rels.push(r); S.gRel = r.id; S.gSel = null; S.gLinkFrom = null; save(); render();
  setTimeout(() => { const i = $('[data-in="rel"][data-k="label"]'); if (i) i.focus(); }, 30);
  return r;
}
V.graphCreateRel = createRel;
function newGroup(o) {
  ensure(); const c = S.camp;
  const g = Object.assign({ id: uid(), name: T('Neue Gruppe', 'New group'), kind: 'faction', kindText: '', color: GCOL[c.groups.length % GCOL.length], img: '', notes: '', members: [], created: Date.now() }, o || {});
  c.groups.push(g); return g;
}
V.graphNewGroup = newGroup;
/* Mitglied aufnehmen – standardmäßig nur eine Gruppe je Art */
function join(g, r, mode) {
  const kk = kindKey(g); const clash = S.camp.groups.filter(x => x !== g && kindKey(x) === kk && x.members.some(m => same(m, r)));
  if (clash.length && !mode) {
    S.pendingJoin = { g: g.id, r };
    S.modal = () => '<h2>🏛️ ' + T('Schon in einer Gruppe dieser Art', 'Already in a group of this kind') + '</h2><p>' + T('„', '"') + esc((info(r) || {}).name) + T('“ gehört bereits zu ', '" already belongs to ') + clash.map(x => '<b>' + esc(x.name) + '</b>').join(', ') + ' (' + esc(kindLbl(g)) + '). ' + T('Normalerweise gehört eine Person nur zu einer Gruppe jeder Art.', 'Normally a person belongs to only one group of each kind.') + '</p>' +
      '<div class="foot"><button class="btn" data-a="closeModal">' + T('Abbrechen', 'Cancel') + '</button><button class="btn" data-a="gJoinDo" data-v="also">＋ ' + T('Zusätzlich (Ausnahme)', 'Additionally (exception)') + '</button><button class="btn primary" data-a="gJoinDo" data-v="replace">⇄ ' + T('Wechseln zu „', 'Switch to "') + esc(g.name) + T('“', '"') + '</button></div>';
    render(); return false;
  }
  if (mode === 'replace') clash.forEach(x => { x.members = x.members.filter(m => !same(m, r)); });
  if (!g.members.some(m => same(m, r))) g.members.push({ t: r.t, id: r.id });
  save(); return true;
}
V.graphJoin = join;
function purge(t, id) {
  const c = S.camp; if (!c) return; ensure(); const r = { t, id };
  c.rels = c.rels.filter(x => !same(x.a, r) && !same(x.b, r)); c.groups.forEach(g => { g.members = g.members.filter(m => !same(m, r)); });
  c.graph.nodes = c.graph.nodes.filter(n => !same(n, r)); if (S.gSel && same(S.gSel, r)) S.gSel = null;
}
V.graphPurge = purge;
const curRel = () => S.camp.rels.find(x => x.id === S.gRel);
const curGrp = () => S.gSel && S.gSel.t === 'grp' ? S.camp.groups.find(g => g.id === S.gSel.id) : null;
Object.assign(V.A, {
  gMode(el) { S.gMode = el.dataset.v; S.gLinkFrom = null; render(); },
  gZoom(el) { const v = $('#gview'); if (!v) return; const r = v.getBoundingClientRect(); zoomAt(+el.dataset.v, r.width / 2, r.height / 2); },
  gFit() { fit(); },
  gLayout() { layout(); save(); fit(); },
  gNewGroup() { const g = newGroup(); addNode({ t: 'grp', id: g.id }); S.gSel = { t: 'grp', id: g.id }; S.gRel = null; S.tab = 'graph'; save(); render(); setTimeout(() => { const i = $('.cname'); if (i) { i.focus(); i.select(); } }, 30); },
  gAddAll() { ensure(); S.camp.pcs.forEach(p => addNode({ t: 'pc', id: p.id })); S.camp.groups.forEach(g => addNode({ t: 'grp', id: g.id })); S.gv.ok = false; save(); render(); },
  gCities() {
    ensure(); let ng = 0, nm = 0;
    V.cityList().forEach(ci => { let g = S.camp.groups.find(x => x.kind === 'city' && x.name.trim().toLowerCase() === ci.name.trim().toLowerCase()); if (!g) { g = newGroup({ name: ci.name, kind: 'city', notes: ci.city && ci.city.notes ? ci.city.notes : '' }); ng++; }
      S.camp.npcs.forEach(n => { if (n.city && n.city.trim().toLowerCase() === ci.name.trim().toLowerCase() && !g.members.some(m => m.t === 'npc' && m.id === n.id) && !S.camp.groups.some(x => x !== g && x.kind === 'city' && x.members.some(m => m.t === 'npc' && m.id === n.id))) { g.members.push({ t: 'npc', id: n.id }); nm++; } }); });
    save(); toast('🏰 ' + ng + ' ' + T('Städte angelegt', 'towns created') + ', ' + nm + ' ' + T('NSCs zugeordnet', 'NPCs assigned')); render();
  },
  gSelect(el, ev) { if (ev && ev.target.closest('.x')) return; const r = parseRef(el.dataset.v); if (!r || !ent(r)) return; S.gSel = r; S.gRel = null; render(); },
  gSelRel(el) { S.gRel = el.dataset.id; S.gSel = null; render(); },
  gClose() { S.gSel = null; S.gRel = null; render(); },
  gPut(el) { const r = parseRef(el.dataset.v); addNode(r); save(); render(); },
  gRemoveNode(el) { const r = parseRef(el.dataset.v); S.camp.graph.nodes = S.camp.graph.nodes.filter(n => !same(n, r)); save(); render(); },
  gOpenEnt(el) { const r = parseRef(el.dataset.v); if (r.t === 'npc') V.A.openNpc({ dataset: { id: r.id } }, { target: el }); else V.A.gotoPc({ dataset: { id: r.id } }); },
  gImg(el) { const r = parseRef(el.dataset.v); V.pickFile('image/*', false, async fs => { if (!fs[0]) return; const e = ent(r); e.img = await V.shrinkImg(await V.readAs(fs[0], 'readAsDataURL'), 240); save(); render(); }); },
  gImgDel(el) { const e = ent(parseRef(el.dataset.v)); e.img = ''; save(); render(); },
  gJoin(el) { const r = parseRef(el.dataset.v); const gid = ($('#gJoin') || {}).value; const g = S.camp.groups.find(x => x.id === gid); if (!g) { toast(T('Bitte eine Gruppe wählen.', 'Please choose a group.')); return; } if (join(g, r)) render(); },
  gJoinDo(el) { const p = S.pendingJoin; S.modal = null; S.pendingJoin = null; if (!p) return render(); const g = S.camp.groups.find(x => x.id === p.g); if (g) join(g, p.r, el.dataset.v); render(); },
  gLeave(el) { const g = S.camp.groups.find(x => x.id === el.dataset.g); const r = parseRef(el.dataset.v); if (g) { g.members = g.members.filter(m => !same(m, r)); save(); } render(); },
  gMemberAdd() { const g = curGrp(); const r = parseRef(($('#gMemberPick') || {}).value); if (!g || !r) { toast(T('Bitte zuerst jemanden wählen.', 'Please choose someone first.')); return; } if (join(g, r)) { if (onMap({ t: 'grp', id: g.id })) addNode(r); save(); render(); } },
  gCityResidents() { const g = curGrp(); let n = 0; S.camp.npcs.forEach(x => { if (x.city && x.city.trim().toLowerCase() === g.name.trim().toLowerCase() && !g.members.some(m => m.t === 'npc' && m.id === x.id)) { const ok = !S.camp.groups.some(o => o !== g && o.kind === 'city' && o.members.some(m => m.t === 'npc' && m.id === x.id)); if (ok) { g.members.push({ t: 'npc', id: x.id }); n++; } } }); save(); toast('🏘️ ' + n + ' ' + T('zugeordnet', 'assigned')); render(); },
  gGroupDel() { const g = curGrp(); S.modal = () => V.confirmDlg('🗑️ ' + esc(g.name), T('Gruppe samt ihren Beziehungen löschen? Die Mitglieder bleiben erhalten.', 'Delete the group and its relationships? Members are kept.'), 'gGroupDelDo', g.id); render(); },
  gGroupDelDo(el) { const id = el.dataset.id; purge('grp', id); S.camp.groups = S.camp.groups.filter(g => g.id !== id); S.modal = null; save(); render(); },
  gLinkStart(el) { S.gMode = 'link'; S.gLinkFrom = parseRef(el.dataset.v); addNode(S.gLinkFrom); S.gSel = null; S.gRel = null; render(); },
  gRelAdd(el) { const a = parseRef(el.dataset.v); const b = parseRef(($('#gRelTo') || {}).value); if (!b) { toast(T('Bitte ein Ziel wählen.', 'Please choose a target.')); return; } createRel(a, b, ($('#gRelLv') || {}).value || 'known'); },
  gDir(el) { const r = curRel(); r.dir = el.dataset.v; save(); render(); },
  gSwap() { const r = curRel(); const t = r.a; r.a = r.b; r.b = t; save(); render(); },
  gLevelSet(el) { const r = curRel(); r.level = el.dataset.v; save(); render(); },
  gRelDel() { const r = curRel(); if (!r) return; S.camp.rels = S.camp.rels.filter(x => x !== r); S.gRel = null; save(); render(); },
  gShow(el) { const r = parseRef(el.dataset.v); addNode(r); S.gSel = r; S.gRel = null; S.tab = 'graph'; S.modal = null; save(); render(); centerOn(r); },
  gShowRel(el) { const r = S.camp.rels.find(x => x.id === el.dataset.id); if (!r) return; addNode(r.a); addNode(r.b); S.gRel = r.id; S.gSel = null; S.tab = 'graph'; save(); render(); centerOn(r.a); }
});
function centerOn(r) { setTimeout(() => { const n = onMap(r); const v = $('#gview'); if (!n || !v) return; const b = v.getBoundingClientRect(); S.gv.tx = b.width / 2 - n.x * S.gv.s; S.gv.ty = b.height / 2 - n.y * S.gv.s; S.gv.ok = true; draw(); }, 40); }
Object.assign(V.IN, {
  grp(el) { const g = curGrp(); if (!g) return; g[el.dataset.k] = el.value; save(); draw(); },
  rel(el) { const r = curRel(); if (!r) return; r[el.dataset.k] = el.value; save(); draw(); }
});
Object.assign(V.CH, {
  gAdd(el) { const r = parseRef(el.value); if (!r) return; addNode(r); S.gSel = r; S.gRel = null; save(); render(); },
  gLevel(el) { S.gLevels[el.dataset.v] = el.checked; draw(); },
  gMembers(el) { S.gMembers = el.checked; draw(); },
  grpKind(el) { const g = curGrp(); g.kind = el.value; save(); render(); },
  grpColor(el) { const g = curGrp(); g.color = el.value; save(); render(); }
});
/* Aufräumen beim Löschen von NSC / Charakter */
const oNpc = V.A.npcDelDo, oPc = V.A.pcDelDo;
V.A.npcDelDo = function (el) { purge('npc', el.dataset.id); return oNpc.apply(this, arguments); };
V.A.pcDelDo = function (el) { purge('pc', el.dataset.id); return oPc.apply(this, arguments); };
})(window);
