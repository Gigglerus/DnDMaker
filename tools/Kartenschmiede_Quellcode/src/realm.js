/* DND5e Kartenschmiede – Ebene „Reiche“: Königreiche, Fürstentümer … (nur Land, Seen und Flüsse werden eingefärbt, das Meer nie) */
const REALM_TYPES = ['Kaiserreich', 'Königreich', 'Fürstentum', 'Herzogtum', 'Grafschaft', 'Markgrafschaft', 'Baronie', 'Freie Stadt', 'Stadtstaat', 'Republik', 'Stammesgebiet', 'Theokratie'];
const REALM_COLS = ['#c0392b', '#2e6fb5', '#d4a017', '#3f8f4f', '#7d3c98', '#d35400', '#16a085', '#a0522d', '#c2185b', '#5d6d7e', '#6b8e23', '#1f3a93'];
const RN = [['Ald', 'Bren', 'Cor', 'Dun', 'Ebers', 'Fal', 'Gor', 'Hal', 'Ivers', 'Kael', 'Lor', 'Mor', 'Nor', 'Ost', 'Rav', 'Sel', 'Tor', 'Ulm', 'Val', 'Wester', 'Ys', 'Thar'], ['land', 'mark', 'gard', 'heim', 'ria', 'wald', 'berg', 'mund', 'reich', 'tal', 'ien', 'or']];
function realmName() { for (let t = 0; t < 40; t++) { const n = RN[0][(Math.random() * RN[0].length) | 0] + RN[1][(Math.random() * RN[1].length) | 0]; if (!S.realms.some(r => r.name === n)) return n; } return 'Reich ' + (S.realms.length + 1); }
function newRealm() {
  const used = new Set(S.realms.map(r => r.col)), col = REALM_COLS.find(c => !used.has(c)) || toHex([60 + Math.random() * 160, 60 + Math.random() * 160, 60 + Math.random() * 160]);
  const r = { id: uid('k'), name: realmName(), type: 'Königreich', col, ruler: '', capital: '', notes: '' }; S.realms.push(r); return S.realms.length; // Index + 1 = Wert im Raster
}
const realmFull = r => r ? (r.type ? r.type + ' ' : '') + (r.name || '') : '';
const realmOfCell = i => { const k = S.realm[i]; return k ? S.realms[k - 1] || null : null; };
/* Zugehörigkeit je Pixel: gewichtete Mehrheit der vier nächsten Zellen (glatte Grenzen statt Treppenstufen), leicht verwackelt */
function realmIdAt(x, y) {
  const c = S.cell, gw = S.gw, gh = S.gh, R = S.realm;
  const fx = clamp(x / c - .5 + (nt(T1, x * .31 + 311, y * .31 + 17) - .5) * 1.6, 0, gw - 1.001), fy = clamp(y / c - .5 + (nt(T2, x * .31 + 57, y * .31 + 211) - .5) * 1.6, 0, gh - 1.001);
  const x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0, i = y0 * gw + x0, a = R[i], b = R[i + 1], d = R[i + gw], e = R[i + gw + 1];
  if (a === b && a === d && a === e) return a;
  const w = [(1 - tx) * (1 - ty), tx * (1 - ty), (1 - tx) * ty, tx * ty], v = [a, b, d, e]; let best = a, bw = -1;
  for (let k = 0; k < 4; k++) { let sum = 0; for (let m = 0; m < 4; m++) if (v[m] === v[k]) sum += w[m]; if (sum > bw) { bw = sum; best = v[k]; } }
  return best;
}
const realmAt = (x, y) => landAt(x, y) ? S.realms[realmIdAt(x, y) - 1] || null : null;

/* ---------- Malen: Rahmen, Vieleck, Lasso, Pinsel, Füllen ---------- */
// Zugewiesen werden nur Zellen auf Land oder direkt an der Küste – das Meer bleibt frei.
function realmSet(i, id, keep) { if (id && S.sd[i] > 3) return false; const cur = S.realm[i]; if (keep && id && cur && cur !== id) return false; if (!id && keep && cur !== keep) return false; if (cur === id) return false; S.realm[i] = id; return true; }
function realmCells(x0, y0, x1, y1, test, id, keep) {
  const c = S.cell, gx0 = clamp(Math.floor(Math.min(x0, x1) / c), 0, S.gw - 1), gx1 = clamp(Math.ceil(Math.max(x0, x1) / c), 0, S.gw - 1), gy0 = clamp(Math.floor(Math.min(y0, y1) / c), 0, S.gh - 1), gy1 = clamp(Math.ceil(Math.max(y0, y1) / c), 0, S.gh - 1);
  let n = 0; for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) { const x = (gx + .5) * c, y = (gy + .5) * c; if (test(x, y) && realmSet(gy * S.gw + gx, id, keep)) n++; } return n;
}
function ptInPoly(p, x, y) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; }
function realmRect(a, b, id, keep) { return realmCells(a.x, a.y, b.x, b.y, () => true, id, keep); }
function realmPoly(pts, id, keep) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }); return realmCells(x0, y0, x1, y1, (x, y) => ptInPoly(pts, x, y), id, keep); }
function realmBrush(x, y, r, id, keep) { return realmCells(x - r, y - r, x + r, y + r, (cx, cy) => Math.hypot(cx - x, cy - y) <= r, id, keep); }
/* Zusammenhängende Landfläche mit gleicher Zugehörigkeit füllen (z. B. eine ganze Insel); Küste und andere Reiche begrenzen */
function realmFill(x, y, id) {
  const { gw, gh, realm, land } = S, st = cellIdx(x, y); if (land[st] <= 127) return 0;
  const from = realm[st]; if (from === id) return 0; const q = [st]; realm[st] = id; let n = 1;
  while (q.length) { const i = q.pop(), cx = i % gw, cy = (i / gw) | 0; const tr = j => { if (realm[j] === from && land[j] > 127) { realm[j] = id; q.push(j); n++; } };
    if (cx > 0) tr(i - 1); if (cx < gw - 1) tr(i + 1); if (cy > 0) tr(i - gw); if (cy < gh - 1) tr(i + gw); }
  // Küstensaum (Zellen knapp unter der Landschwelle) mitnehmen, damit am Ufer keine Lücke bleibt
  for (let i = 0; i < realm.length; i++) if (realm[i] === from && land[i] <= 127 && S.sd[i] <= 3) { const cx = i % gw, cy = (i / gw) | 0; for (const j of [i - 1, i + 1, i - gw, i + gw]) if (j >= 0 && j < realm.length && Math.abs((j % gw) - cx) <= 1 && realm[j] === id && land[j] > 127) { realm[i] = id; break; } }
  return n;
}
function realmCount(k) { let n = 0; for (let i = 0; i < S.realm.length; i++) if (S.realm[i] === k && S.land[i] > 127) n++; return n; }
function realmDelete(k) { // Index k (1-basiert); höhere Indizes rücken nach
  S.realms.splice(k - 1, 1); const R = S.realm; for (let i = 0; i < R.length; i++) { if (R[i] === k) R[i] = 0; else if (R[i] > k) R[i]--; }
}

/* ---------- Darstellung ---------- */
const RSTY = { art: { fill: .36, line: .95 }, real: { fill: .3, line: .85 }, ink: { fill: .17, line: .9 } };
function realmImage(sc, st, rx, ry, rw, rh) {
  const img = new ImageData(rw, rh), D = img.data, inv = 1 / sc, m = 3, mw = rw + 2 * m, mh = rh + 2 * m, ID = new Int16Array(mw * mh), RS = RSTY[st] || RSTY.art;
  for (let j = 0; j < mh; j++) { const y = (ry + j - m + .5) * inv; for (let i = 0; i < mw; i++) { const x = (rx + i - m + .5) * inv; ID[j * mw + i] = landAt(x, y) ? realmIdAt(x, y) : -1; } }
  const cols = S.realms.map(r => { const c = hex(r.col || '#888888'), dk = hex(mix(r.col || '#888888', '#000000', .45)), lt = hex(mix(r.col || '#888888', '#ffffff', .55)); return { c, b: st === 'real' ? lt : dk }; });
  const bw = Math.max(1, Math.round(1.3 * sc)), N = [-bw, bw, -bw * mw, bw * mw];
  let p = 0;
  for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++, p += 4) {
    const mi = (j + m) * mw + i + m, id = ID[mi]; if (id <= 0) continue; const C = cols[id - 1]; if (!C) continue;
    let border = false; for (const d of N) { const o = ID[mi + d]; if (o !== id && o !== -1) { border = true; break; } }
    const X = rx + i, Y = ry + j;
    if (border && st === 'ink' && ((Math.floor(X / (5 * sc)) + Math.floor(Y / (5 * sc))) & 1)) border = false; // gestrichelte Grenze
    if (border) { D[p] = C.b[0]; D[p + 1] = C.b[1]; D[p + 2] = C.b[2]; D[p + 3] = RS.line * 255; continue; }
    let a = RS.fill; if (st === 'ink' && ((X + Y) % Math.max(4, Math.round(7 * sc))) < Math.max(1, sc)) a = .42; // Schraffur
    D[p] = C.c[0]; D[p + 1] = C.c[1]; D[p + 2] = C.c[2]; D[p + 3] = a * 255;
  }
  return img;
}
let RC = null, RL = null;
function realmCanvas(st, sc) {
  if (RC && RC.st === st && RC.sc === sc && RC.rv === S.rv) return RC.cv;
  const w = Math.round(S.W * sc), h = Math.round(S.H * sc), cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
  for (let y = 0; y < h; y += 256) g.putImageData(realmImage(sc, st, 0, y, w, Math.min(256, h - y)), 0, y);
  if (w * h <= 4.2e6) RC = { st, sc, rv: S.rv, cv }; return cv;
}
/* Nach Pinselstrichen nur den betroffenen Ausschnitt neu berechnen */
function realmPatch(x0, y0, x1, y1) {
  S.rl++; if (!RC || RC.rv !== S.rv) return; const sc = RC.sc, w = RC.cv.width, h = RC.cv.height;
  const rx = clamp(Math.floor(x0 * sc) - 4, 0, w - 1), ry = clamp(Math.floor(y0 * sc) - 4, 0, h - 1), rw = clamp(Math.ceil(x1 * sc) + 4, 1, w) - rx, rh = clamp(Math.ceil(y1 * sc) + 4, 1, h) - ry;
  if (rw > 0 && rh > 0) RC.cv.getContext('2d').putImageData(realmImage(sc, RC.st, rx, ry, rw, rh), rx, ry);
}
/* Namen der Reiche: an der Stelle, die am weitesten von der Grenze entfernt liegt */
function realmLabels() {
  if (RL && RL.v === S.rl) return RL.list; const { gw, gh, realm, land, cell } = S, n = gw * gh, list = [];
  S.realms.forEach((r, k) => { const A = new Float32Array(n); let cnt = 0; for (let i = 0; i < n; i++) { if (realm[i] === k + 1 && land[i] > 127) { A[i] = 1e4; cnt++; } }
    if (cnt < 8) return; chamfer(A, gw, gh); let bi = 0, bd = -1; for (let i = 0; i < n; i++) if (A[i] > bd) { bd = A[i]; bi = i; }
    const nm = (r.name || '').toUpperCase(); let px = clamp(bd * cell * .5, 12, 54); px = Math.max(11, Math.min(px, 2 * bd * cell * 1.5 / (.78 * Math.max(4, nm.length))));
    list.push({ x: ((bi % gw) + .5) * cell, y: (((bi / gw) | 0) + .5) * cell, name: nm, type: r.type || '', col: r.col, px }); });
  RL = { v: S.rl, list }; return list;
}
function drawRealmTint(g, st, o) {
  const cv = realmCanvas(st, o.rsc || 1);
  if (g.isSvg) g.raw('<g id="reiche"><image x="0" y="0" width="' + S.W + '" height="' + S.H + '" preserveAspectRatio="none" href="' + cv.toDataURL('image/png') + '"/></g>');
  else g.drawImage(cv, 0, 0, S.W, S.H);
}
function drawRealmNames(g, st) {
  grp(g, '<g id="reichsnamen">');
  realmLabels().forEach(l => { const real = st === 'real', fill = real ? '#ffffff' : st === 'ink' ? '#3a2616' : mix(l.col, '#1a0f08', .55), halo = real ? '#0d1a26' : st === 'ink' ? '#ecdcb2' : '#fbf1d6';
    if (l.type) txt(g, l.type.toUpperCase(), l.x, l.y - l.px * .62, { fam: real ? 'sans' : 'kick', px: Math.max(8, l.px * .36), fill, halo, hw: 2.4, ls: l.px * .12, bold: real });
    txt(g, l.name, l.x, l.y + l.px * .3, { fam: real ? 'sans' : 'title', px: l.px, fill, halo, hw: Math.max(3, l.px * .12), ls: l.px * .18, bold: real }); });
  grp(g, '</g>');
}
