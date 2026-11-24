/* DND5e Kartenschmiede – Kern: Zustand, Rauschen, Raster, Generatoren, Geometrie */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash2(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y, s, per) {
  const xi = Math.floor(x), yi = Math.floor(y); let tx = x - xi, ty = y - yi; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
  let x0 = xi, x1 = xi + 1, y0 = yi, y1 = yi + 1;
  if (per) { x0 = ((x0 % per) + per) % per; x1 = ((x1 % per) + per) % per; y0 = ((y0 % per) + per) % per; y1 = ((y1 % per) + per) % per; }
  const a = hash2(x0, y0, s), b = hash2(x1, y0, s), c = hash2(x0, y1, s), d = hash2(x1, y1, s);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}
function fbm(x, y, s, o) { let v = 0, a = .5, f = 1, n = 0; for (let i = 0; i < o; i++) { v += a * vnoise(x * f, y * f, s + i * 17); n += a; a *= .5; f *= 2; } return v / n; }

/* Kachelbare Rauschtabellen (256 × 256) für die Pixel-Renderer */
function makeTile(seed) {
  const T = new Float32Array(65536); let mn = 1, mx = 0;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    let v = 0, a = .5, n = 0;
    for (let o = 0; o < 5; o++) { const f = 4 << o; v += a * vnoise(x * f / 256, y * f / 256, seed + o * 13, f); n += a; a *= .55; }
    v /= n; T[y << 8 | x] = v; if (v < mn) mn = v; if (v > mx) mx = v;
  }
  for (let i = 0; i < 65536; i++) T[i] = (T[i] - mn) / (mx - mn);
  return T;
}
const T1 = makeTile(11), T2 = makeTile(97);
function nt(T, x, y) {
  const xf = Math.floor(x), yf = Math.floor(y), tx = x - xf, ty = y - yf;
  const x0 = xf & 255, x1 = (xf + 1) & 255, y0 = (yf & 255) << 8, y1 = ((yf + 1) & 255) << 8;
  const a = T[y0 | x0], b = T[y0 | x1], c = T[y1 | x0], d = T[y1 | x1];
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}
function bl(A, gw, gh, fx, fy) {
  if (fx < 0) fx = 0; else if (fx > gw - 1) fx = gw - 1; if (fy < 0) fy = 0; else if (fy > gh - 1) fy = gh - 1;
  const x0 = fx | 0, y0 = fy | 0, x1 = x0 < gw - 1 ? x0 + 1 : x0, y1 = y0 < gh - 1 ? y0 + 1 : y0, tx = fx - x0, ty = fy - y0;
  const a = A[y0 * gw + x0], b = A[y0 * gw + x1], c = A[y1 * gw + x0], d = A[y1 * gw + x1];
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

/* ---------- Stammdaten ---------- */
const LAYERS = [
  { k: 'ocean', n: 'Ozean', i: '🌊', d: 'Grundebene – füllt die ganze Karte' },
  { k: 'land', n: 'Land', i: '🏝️', d: 'Landmassen malen oder erzeugen' },
  { k: 'terr', n: 'Gelände', i: '🌲', d: 'Wüste, Gebirge, Wiese, Wald …' },
  { k: 'water', n: 'Gewässer', i: '💧', d: 'Flüsse und Seen' },
  { k: 'realm', n: 'Reiche', i: '👑', d: 'Königreiche, Fürstentümer … – färbt nur Land, Seen und Flüsse' },
  { k: 'road', n: 'Wege und Straßen', i: '🛣️', d: 'Straßen, Wege, Brücken' },
  { k: 'city', n: 'Stadt', i: '🏰', d: 'Siedlungen setzen' }
];
const TERR = [
  { n: 'Ohne', c: '#c4d696' }, { n: 'Wiese', c: '#9ccb6a' }, { n: 'Grasland', c: '#d3cd82' }, { n: 'Wald', c: '#5f9d58' }, { n: 'Dschungel', c: '#3f9a5a' },
  { n: 'Wüste', c: '#ecd08c' }, { n: 'Hügel', c: '#b4bf7a' }, { n: 'Gebirge', c: '#a89e90' }, { n: 'Sumpf', c: '#7f9e78' }, { n: 'Tundra', c: '#c2c6aa' }, { n: 'Schnee', c: '#eef2f6' }
];
const ZONE_OF = ['wiese', 'wiese', 'wiese', 'wald', 'wald', 'wueste', 'wiese', 'berg', 'sumpf', 'schnee', 'schnee'];
const ZONE_N = { wiese: 'Wiese / Grasland', wald: 'Wald', wueste: 'Wüste', berg: 'Gebirge', sumpf: 'Sumpf', schnee: 'Schnee / Tundra' };
const STYLES = ['Dorf', 'Stadt', 'Festung', 'Großstadt', 'Zeltstadt', 'Hafen'];
const RACES = ['Mensch', 'Zwerg', 'Elf', 'Halbling', 'Drachenblütiger', 'Gnom', 'Halbelf', 'Halbork', 'Tiefling'];
const RACE_PL = { Mensch: 'Menschen', Zwerg: 'Zwerge', Elf: 'Elfen', Halbling: 'Halblinge', 'Drachenblütiger': 'Drachenblütige', Gnom: 'Gnome', Halbelf: 'Halbelfen', Halbork: 'Halborks', Tiefling: 'Tieflinge' };
const SIZES = { klein: [1200, 800, 'Klein (1200 × 800)'], mittel: [1600, 1100, 'Mittel (1600 × 1100)'], gross: [2400, 1600, 'Groß (2400 × 1600)'] };
const RSTYLES = [{ k: 'art', n: 'Künstlerisch', d: 'Bäume, Berge und farbige Städte' }, { k: 'real', n: 'Realistisch', d: 'wie ein Globus aus dem All' }, { k: 'ink', n: 'Gezeichnet', d: 'mittelalterliche Tuschekarte' }];

/* ---------- Zustand ---------- */
const S = {
  ready: false, name: 'Neue Welt', W: 0, H: 0, cell: 4, gw: 0, gh: 0, seed: 1, land: null, terr: null, lake: null, sd: null,
  rivers: [], roads: [], cities: [], ocean: 0,
  vis: { ocean: true, land: true, terr: true, water: true, realm: true, road: true, city: true }, realm: null, realms: [], rv: 1, rl: 1, rsel: 0, rmode: 'add', rkeep: false,
  layer: 'land', tool: { land: 'add', terr: 'paint', water: 'river', road: 'strasse', city: 'place' },
  brush: 28, tt: 3, rw: 3, cs: { style: '', race: '' }, sel: null, view: 'art', names: true,
  opt: { names: true, frame: true, compass: true, title: true, scale: false, grid: true, icon: 1.1, miles: 50, realmNames: true },
  v: { s: 1, tx: 0, ty: 0 }, undo: [], redo: []
};

function newMap(name, W, H) {
  S.name = name || 'Neue Welt'; S.W = W; S.H = H; S.gw = Math.ceil(W / S.cell); S.gh = Math.ceil(H / S.cell);
  const n = S.gw * S.gh; S.land = new Uint8Array(n); S.terr = new Uint8Array(n); S.lake = new Uint8Array(n); S.realm = new Uint8Array(n); S.realms = []; S.rsel = 0; S.rv++; S.rl++; S.sd = new Float32Array(n);
  S.rivers = []; S.roads = []; S.cities = []; S.sel = null; S.undo = []; S.redo = []; S.seed = (Math.random() * 1e6) | 0;
  S.vis = { ocean: true, land: true, terr: true, water: true, realm: true, road: true, city: true };
  invalidate(); computeSD(); S.ready = true;
}

/* ---------- Abstandsfeld zur Küste (in Zellen; Ozean positiv, Land negativ) ---------- */
function chamfer(A, gw, gh) {
  const D = 1.4142;
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const i = y * gw + x; let v = A[i]; if (v === 0) continue;
    if (x > 0 && A[i - 1] + 1 < v) v = A[i - 1] + 1;
    if (y > 0) { if (A[i - gw] + 1 < v) v = A[i - gw] + 1; if (x > 0 && A[i - gw - 1] + D < v) v = A[i - gw - 1] + D; if (x < gw - 1 && A[i - gw + 1] + D < v) v = A[i - gw + 1] + D; }
    A[i] = v;
  }
  for (let y = gh - 1; y >= 0; y--) for (let x = gw - 1; x >= 0; x--) {
    const i = y * gw + x; let v = A[i]; if (v === 0) continue;
    if (x < gw - 1 && A[i + 1] + 1 < v) v = A[i + 1] + 1;
    if (y < gh - 1) { if (A[i + gw] + 1 < v) v = A[i + gw] + 1; if (x < gw - 1 && A[i + gw + 1] + D < v) v = A[i + gw + 1] + D; if (x > 0 && A[i + gw - 1] + D < v) v = A[i + gw - 1] + D; }
    A[i] = v;
  }
}
function computeSD() {
  const { gw, gh, land } = S, n = gw * gh, a = new Float32Array(n), b = new Float32Array(n);
  for (let i = 0; i < n; i++) { if (land[i] > 127) { a[i] = 0; b[i] = 1e4; } else { a[i] = 1e4; b[i] = 0; } }
  chamfer(a, gw, gh); chamfer(b, gw, gh);
  const sd = S.sd; for (let i = 0; i < n; i++) sd[i] = land[i] > 127 ? -Math.min(b[i], 60) : Math.min(a[i], 60);
}

/* ---------- Abfragen in Kartenpixeln ---------- */
const cellIdx = (x, y) => clamp(Math.floor(y / S.cell), 0, S.gh - 1) * S.gw + clamp(Math.floor(x / S.cell), 0, S.gw - 1);
function landAt(x, y) { return bl(S.land, S.gw, S.gh, x / S.cell - .5, y / S.cell - .5) + (nt(T1, x * .9, y * .9) - .5) * 38 > 127.5; }
function lakeAt(x, y) { return bl(S.lake, S.gw, S.gh, x / S.cell - .5, y / S.cell - .5) + (nt(T1, x * .9 + 50, y * .9) - .5) * 30 > 127.5; }
function terrAt(x, y) {
  const c = S.cell, gx = clamp(Math.floor(x / c + (nt(T1, x * .23 + 77, y * .23 + 31) - .5) * 7 + (nt(T1, x * .9, y * .9) - .5) * 2.6), 0, S.gw - 1), gy = clamp(Math.floor(y / c + (nt(T1, x * .23 + 191, y * .23 + 113) - .5) * 7 + (nt(T2, x * .9, y * .9) - .5) * 2.6), 0, S.gh - 1);
  return S.terr[gy * S.gw + gx];
}
const sdAt = (x, y) => bl(S.sd, S.gw, S.gh, x / S.cell - .5, y / S.cell - .5);

/* ---------- Pinsel ---------- */
function brushCells(x, y, r, fn) {
  const c = S.cell, cx = x / c - .5, cy = y / c - .5, rc = Math.max(.6, r / c);
  const x0 = Math.max(0, Math.floor(cx - rc - 1)), x1 = Math.min(S.gw - 1, Math.ceil(cx + rc + 1)), y0 = Math.max(0, Math.floor(cy - rc - 1)), y1 = Math.min(S.gh - 1, Math.ceil(cy + rc + 1));
  for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) { const d = Math.hypot(gx - cx, gy - cy); if (d <= rc + 1) fn(gy * S.gw + gx, d, rc); }
}
function paintField(A, x, y, r, add) { brushCells(x, y, r, (i, d, rc) => { const v = clamp((rc - d) / 1.5 + .5, 0, 1) * 255; if (add) { if (v > A[i]) A[i] = v; } else if (255 - v < A[i]) A[i] = 255 - v; }); }
function paintTerr(x, y, r, t) { brushCells(x, y, r, (i, d, rc) => { if (d <= rc) S.terr[i] = t; }); }
function fillTerr(x, y, t) {
  const { gw, gh, terr, land } = S, st = cellIdx(x, y); if (land[st] <= 127) return 0;
  const from = terr[st]; if (from === t) return 0;
  const q = [st]; terr[st] = t; let n = 0;
  while (q.length) { const i = q.pop(); n++; const cx = i % gw, cy = (i / gw) | 0;
    const tr = j => { if (terr[j] === from && land[j] > 127) { terr[j] = t; q.push(j); } };
    if (cx > 0) tr(i - 1); if (cx < gw - 1) tr(i + 1); if (cy > 0) tr(i - gw); if (cy < gh - 1) tr(i + gw); }
  return n;
}

/* ---------- Generatoren: Archipel, Kontinent, Gebirge ---------- */
function generate(kind, seed, o) {
  const { gw, gh, cell } = S, n = gw * gh, rnd = mulberry(seed * 7919 + 13), E = new Float32Array(n), RN = new Float32Array(n);
  const blobs = []; if (kind === 'archipel') { const k = 10 + Math.floor(rnd() * 7); for (let i = 0; i < k; i++) blobs.push([(rnd() * 1.7 - .85), (rnd() * 1.6 - .8), .1 + rnd() * .17]); }
  const ph = rnd() * 6.28, asp = gw / gh, amp = .18 + rnd() * .14;
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const i = y * gw + x, px = ((x + .5) / gw - .5) * 2, py = ((y + .5) / gh - .5) * 2, nx = x / gh * 4.2, ny = y / gh * 4.2;
    const nn = clamp((fbm(nx, ny, seed, 6) - .5) * 1.5 + .5, 0, 1);
    const wx = fbm(nx * .6 + 5, ny * .6, seed + 9, 3) - .5, wy = fbm(nx * .6, ny * .6 + 9, seed + 19, 3) - .5;
    let rn = 1 - Math.abs(2 * fbm(nx * 1.3, ny * 1.3, seed + 33, 5) - 1); rn = clamp((rn - .55) * 2.4, 0, 1); rn *= rn;
    let h, sw = 0;
    if (kind === 'archipel') {
      const n2 = clamp((fbm(nx * 2.1, ny * 2.1, seed, 5) - .5) * 1.6 + .5, 0, 1); let b = 0;
      for (const B of blobs) { const dx = (px - B[0]) * asp, dy = py - B[1]; b += Math.exp(-(dx * dx + dy * dy) / (B[2] * B[2] * 2.2)); }
      const ed = Math.pow(Math.max(Math.abs(px), Math.abs(py)), 6) * .5;
      h = n2 * .5 + Math.min(b, 1.1) * .4 + .06 - ed;
    } else if (kind === 'gebirge') {
      const d = Math.hypot(px * .98 + wx * .5, py * 1.22 + wy * .5), y0 = Math.sin(px * 2.3 + ph) * amp;
      sw = Math.exp(-Math.pow((py - y0) / .36, 2));
      h = nn * .5 + .56 - d * d * .62 + rn * sw * .2 + sw * .05;
    } else {
      const d = Math.hypot(px * 1.04 + wx * .6, py * 1.12 + wy * .6);
      h = nn * .62 + .52 - d * d * .66;
    }
    E[i] = h - .5; RN[i] = kind === 'gebirge' ? rn * (.22 * sw + .04) + sw * .06 : rn * .1;
  }
  const mt = kind === 'gebirge' ? .25 : kind === 'archipel' ? .27 : .4;
  for (let i = 0; i < n; i++) S.land[i] = clamp(127.5 + E[i] * 1100, 0, 255);
  S.lake.fill(0); S.rivers = [];
  if (o.terrain) {
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      const i = y * gw + x; if (S.land[i] <= 127) { S.terr[i] = 0; continue; }
      const nx = x / gh * 4.2, ny = y / gh * 4.2, e = E[i], me = e + RN[i];
      const T = (y + .5) / gh * .9 + .05 + (fbm(nx * .5 + 40, ny * .5, seed + 5, 3) - .5) * .34 - Math.max(0, e) * .22;
      const M = clamp((fbm(nx * .9 + 11, ny * .9 + 7, seed + 21, 4) - .5) * 2 + .5, 0, 1);
      let t;
      if (me > mt) t = 7; else if (T < .13) t = 10; else if (me > mt * .8) t = 6; else if (T < .22) t = 9;
      else if (T > .7 && M < .47) t = 5; else if (T > .72 && M > .6) t = 4;
      else if (e < .035 && M > .68 && T > .3) t = 8; else if (M > .56) t = 3; else if (M < .36) t = 2; else t = 1;
      S.terr[i] = t;
    }
  } else S.terr.fill(0);
  computeSD();
  if (o.rivers) genRivers(E, RN, seed);
  S.cities = S.cities.filter(c => S.land[cellIdx(c.x, c.y)] > 127); S.roads = o.keepRoads ? S.roads : [];
  S.seed = seed; invalidate();
}
function genRivers(E, RN, seed) {
  const { gw, gh, cell, land, sd, terr } = S, n = gw * gh, rnd = mulberry(seed + 4242);
  // Prioritätsflut vom Meer aus: jede Landzelle bekommt einen Abfluss
  const down = new Int32Array(n).fill(-1), done = new Uint8Array(n), hk = [], hi = [];
  const push = (k, i) => { hk.push(k); hi.push(i); let c = hk.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (hk[p] <= hk[c]) break; [hk[p], hk[c]] = [hk[c], hk[p]];[hi[p], hi[c]] = [hi[c], hi[p]]; c = p; } };
  const pop = () => { const k = hk[0], i = hi[0], lk = hk.pop(), li = hi.pop(); if (hk.length) { hk[0] = lk; hi[0] = li; let c = 0; for (;;) { let m = c; const l = 2 * c + 1, r = l + 1; if (l < hk.length && hk[l] < hk[m]) m = l; if (r < hk.length && hk[r] < hk[m]) m = r; if (m === c) break; [hk[m], hk[c]] = [hk[c], hk[m]];[hi[m], hi[c]] = [hi[c], hi[m]]; c = m; } } return [k, i]; };
  const el = i => E[i] + RN[i] + hash2(i % gw, (i / gw) | 0, seed) * .012;
  for (let i = 0; i < n; i++) if (land[i] <= 127 && sd[i] < 1.6) { done[i] = 1; push(-1, i); }
  const NB = [-1, 1, -gw, gw, -gw - 1, -gw + 1, gw - 1, gw + 1];
  while (hk.length) {
    const [k, i] = pop(), cx = i % gw;
    for (const d of NB) { const j = i + d; if (j < 0 || j >= n || done[j]) continue; const jx = j % gw; if (Math.abs(jx - cx) > 1) continue; if (land[j] <= 127) continue; done[j] = 1; down[j] = i; push(Math.max(k, el(j)), j); }
  }
  let cand = []; for (let i = 0; i < n; i++) if ((terr[i] === 7 || terr[i] === 6) && sd[i] < -4) cand.push(i);
  if (cand.length < 40) { cand = []; for (let i = 0; i < n; i++) if (sd[i] < -7) cand.push(i); }
  let lc = 0; for (let i = 0; i < n; i++) if (land[i] > 127) lc++;
  const want = clamp(Math.round(lc / 2400), 2, 16), src = [], used = new Uint8Array(n);
  for (let t = 0; t < 4000 && src.length < want && cand.length; t++) { const i = cand[(rnd() * cand.length) | 0], x = i % gw, y = (i / gw) | 0; if (src.every(s => Math.hypot(s % gw - x, ((s / gw) | 0) - y) > 16)) src.push(i); }
  for (const s of src) {
    const path = []; let i = s, g = 0;
    while (i >= 0 && g++ < 4000) { path.push(i); if (land[i] <= 127) break; if (used[i] && path.length > 1) break; i = down[i]; }
    if (path.length < 9) continue; path.forEach(p => { used[p] = 1; });
    const pts = path.map((p, k) => [((p % gw) + .5) * cell + (hash2(p, k, seed) - .5) * cell * .9, (((p / gw) | 0) + .5) * cell + (hash2(k, p, seed + 1) - .5) * cell * .9]);
    S.rivers.push({ id: uid('r'), pts: simplify(pts, 2.6), w: clamp(1.6 + path.length / 55, 1.8, 4.6) });
  }
}

/* ---------- Linien: vereinfachen, glätten, schneiden ---------- */
function simplify(pts, eps) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const st = [[0, pts.length - 1]];
  while (st.length) { const [a, b] = st.pop(); let md = 0, mi = -1; const ax = pts[a][0], ay = pts[a][1], dx = pts[b][0] - ax, dy = pts[b][1] - ay, L = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L; if (d > md) { md = d; mi = i; } }
    if (md > eps) { keep[mi] = 1; st.push([a, mi], [mi, b]); } }
  return pts.filter((p, i) => keep[i]).map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]);
}
const SM = new WeakMap();
function smooth(o) {
  let s = SM.get(o); if (s && s.src === o.pts) return s.p;
  let p = o.pts;
  for (let k = 0; k < 2 && p.length > 2; k++) { const q = [p[0]]; for (let i = 0; i < p.length - 1; i++) { const a = p[i], b = p[i + 1]; q.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } q.push(p[p.length - 1]); p = q; }
  SM.set(o, { src: o.pts, p }); return p;
}
function distToLine(o, x, y) { const p = smooth(o); let m = 1e9; for (let i = 0; i < p.length - 1; i++) { const ax = p[i][0], ay = p[i][1], dx = p[i + 1][0] - ax, dy = p[i + 1][1] - ay, L = dx * dx + dy * dy || 1, t = clamp(((x - ax) * dx + (y - ay) * dy) / L, 0, 1), d = Math.hypot(x - ax - dx * t, y - ay - dy * t); if (d < m) m = d; } return m; }
const riverW = (r, i, n) => .8 + (r.w - .8) * Math.pow(i / Math.max(1, n - 1), .7);

/* Brücken: überall dort, wo eine Straße oder ein Weg einen Fluss kreuzt */
let BR = null;
function invalidate() { BR = null; }
function bridges() {
  if (BR) return BR; BR = [];
  for (const rd of S.roads) { const a = smooth(rd); let ax0 = 1e9, ay0 = 1e9, ax1 = -1e9, ay1 = -1e9; a.forEach(p => { ax0 = Math.min(ax0, p[0]); ax1 = Math.max(ax1, p[0]); ay0 = Math.min(ay0, p[1]); ay1 = Math.max(ay1, p[1]); });
    for (const rv of S.rivers) { const b = smooth(rv);
      for (let j = 0; j < b.length - 1; j++) { const cx = b[j][0], cy = b[j][1], ex = b[j + 1][0], ey = b[j + 1][1];
        if (Math.max(cx, ex) < ax0 || Math.min(cx, ex) > ax1 || Math.max(cy, ey) < ay0 || Math.min(cy, ey) > ay1) continue;
        for (let i = 0; i < a.length - 1; i++) { const px = a[i][0], py = a[i][1], rx = a[i + 1][0] - px, ry = a[i + 1][1] - py, sx = ex - cx, sy = ey - cy, den = rx * sy - ry * sx; if (Math.abs(den) < 1e-9) continue;
          const t = ((cx - px) * sy - (cy - py) * sx) / den, u = ((cx - px) * ry - (cy - py) * rx) / den;
          if (t < 0 || t > 1 || u < 0 || u > 1) continue;
          const x = px + rx * t, y = py + ry * t; if (lakeAt(x, y) || BR.some(q => Math.hypot(q.x - x, q.y - y) < 9)) continue;
          BR.push({ x, y, ang: Math.atan2(ry, rx), rw: riverW(rv, j, b.length), type: rd.type }); } } } }
  return BR;
}

/* ---------- Städte: Volk, Art und Aussehen aus Klimazone ableiten ---------- */
function resolve(c) {
  const t = terrAt(c.x, c.y), zone = ZONE_OF[t] || 'wiese', coast = sdAt(c.x, c.y) > -3.2;
  const race = c.race || (zone === 'berg' ? 'Zwerg' : zone === 'wald' ? 'Elf' : 'Mensch');
  const style = c.style || (zone === 'berg' ? 'Festung' : 'Stadt');
  let seed = 0; for (let i = 0; i < c.id.length; i++) seed = (seed * 31 + c.id.charCodeAt(i)) | 0;
  return { zone, coast, race, style, terr: t, seed, autoRace: !c.race, autoStyle: !c.style };
}
const NAMES = {
  Mensch: [['Alten', 'Neuen', 'Hohen', 'Wald', 'Grün', 'Stein', 'Eichen', 'Falken', 'Königs', 'Sturm', 'Weißen', 'Roten', 'Silber', 'Löwen'], ['furt', 'burg', 'hafen', 'stadt', 'tal', 'heim', 'brück', 'feld', 'wacht', 'mark', 'berg', 'au']],
  orient: [['Al-', 'Qar', 'Zah', 'Sham', 'Bas', 'Dar-', 'Naz', 'Kal', 'Sul', 'Ras-'], ['ira', 'abad', 'un', 'esh', 'mir', 'ah', 'ara', 'adin', 'ukh', 'hariq']],
  Zwerg: [['Khaz', 'Dur', 'Bar', 'Gor', 'Thra', 'Mor', 'Kel', 'Zar', 'Bal', 'Grim'], ['ak', 'grim', 'dûm', 'heim', 'bar', 'gund', 'dain', 'al', 'ghal', 'run']],
  Elf: [['Sil', 'Ael', 'Lóri', 'Mith', 'Eva', 'Thal', 'Ny', 'Cael', 'Ilu', 'Fae'], ['variel', 'thas', 'dalar', 'mareth', 'ondë', 'wen', 'lithil', 'anor', 'rien', 'ethil']],
  Halbling: [['Hügel', 'Klee', 'Brombeer', 'Tiefen', 'Apfel', 'Wiesen', 'Butter', 'Honig', 'Weiden'], ['grund', 'au', 'bach', 'hof', 'dorf', 'loch', 'winkel', 'feld']],
  'Drachenblütiger': [['Dra', 'Arj', 'Kri', 'Vor', 'Sha', 'Bala', 'Tor', 'Mede', 'Rhog'], ['khan', 'sar', 'zhul', 'rax', 'thar', 'gash', 'ix', 'ador']],
  Gnom: [['Zipp', 'Fenn', 'Glimm', 'Nack', 'Wimm', 'Tink', 'Bodd', 'Quill'], ['elbach', 'erwick', 'eltal', 'lingen', 'enstein', 'ersporn', 'elrad']],
  Halbelf: [['Silber', 'Mond', 'Stern', 'Abend', 'Morgen', 'Nebel', 'Lied'], ['hain', 'furt', 'wacht', 'quell', 'weiler', 'see', 'tor']],
  Halbork: [['Grum', 'Ur', 'Mog', 'Skar', 'Drak', 'Bol', 'Gash', 'Thok'], ['gar', 'dush', 'nak', 'rok', 'mar', 'zug', 'gol']],
  Tiefling: [['Asch', 'Nacht', 'Glut', 'Schatten', 'Dorn', 'Rauch', 'Zinn', 'Blut'], ['fall', 'bann', 'glut', 'wacht', 'feste', 'hafen', 'kron', 'tor']]
};
function genName(R) {
  const k = R.race === 'Mensch' && R.zone === 'wueste' ? 'orient' : R.race, [a, b] = NAMES[k] || NAMES.Mensch;
  for (let t = 0; t < 30; t++) { let s = a[(Math.random() * a.length) | 0] + b[(Math.random() * b.length) | 0]; s = s.replace(/(.)\1\1/g, '$1$1'); if (!S.cities.some(c => c.name === s)) return s; }
  return 'Ort ' + (S.cities.length + 1);
}

/* ---------- Rückgängig ---------- */
function snap() { return { land: S.land.slice(), terr: S.terr.slice(), lake: S.lake.slice(), realm: S.realm.slice(), v: JSON.stringify({ r: S.rivers, d: S.roads, c: S.cities, k: S.realms }) }; }
function applySnap(s) { S.land = s.land; S.terr = s.terr; S.lake = s.lake; if (s.realm) S.realm = s.realm; const v = JSON.parse(s.v); S.rivers = v.r; S.roads = v.d; S.cities = v.c; S.realms = v.k || []; if (S.rsel > S.realms.length) S.rsel = S.realms.length; S.rv++; S.rl++; invalidate(); computeSD(); if (S.sel && !selObj()) S.sel = null; }
function pushUndo() { S.undo.push(snap()); if (S.undo.length > 30) S.undo.shift(); S.redo = []; }
function selObj() { if (!S.sel) return null; const L = S.sel.k === 'city' ? S.cities : S.sel.k === 'river' ? S.rivers : S.roads; return L.find(o => o.id === S.sel.id) || null; }

/* ---------- Projektdatei ---------- */
const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return btoa(s); };
const unb64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
function toProject() { return { app: 'The Ultimate DND5e Kartenschmiede', version: 1, savedAt: new Date().toISOString(), name: S.name, W: S.W, H: S.H, cell: S.cell, seed: S.seed, ocean: S.ocean, view: S.view, opt: S.opt, vis: S.vis, land: b64(S.land), terr: b64(S.terr), lake: b64(S.lake), realm: b64(S.realm), realms: S.realms, rivers: S.rivers, roads: S.roads, cities: S.cities }; }
function fromProject(p) {
  if (!p || !p.land || !p.W || !/Kartenschmiede/.test(p.app || '')) throw new Error('Das ist keine Kartenschmiede-Projektdatei.');
  S.cell = p.cell || 4; newMap(p.name, p.W, p.H);
  const ld = (k) => { const u = typeof p[k] === 'string' ? unb64(p[k]) : new Uint8Array(p[k]); if (u.length === S.land.length) S[k] = u; };
  ld('land'); ld('terr'); ld('lake'); if (p.realm) ld('realm'); S.realms = Array.isArray(p.realms) ? p.realms : []; S.rsel = S.realms.length ? 1 : 0; S.rv++; S.rl++;
  S.rivers = p.rivers || []; S.roads = p.roads || []; S.cities = p.cities || []; S.seed = p.seed || 1; S.ocean = p.ocean || 0; S.view = p.view || 'art';
  Object.assign(S.opt, p.opt || {}); Object.assign(S.vis, p.vis || {}); invalidate(); computeSD();
}
