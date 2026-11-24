/* DND5e Kartenschmiede – Städte: Atlas-Eigenschaften, Stadtkarten-Modell, Zufallsgenerator, Darstellung */
const A_TYPES = ['Weiler', 'Dorf', 'Ortschaft', 'Kleinstadt', 'Stadt', 'Großstadt', 'Metropole', 'Festung'];
const A_DENS = ['niedrig', 'mittel', 'hoch', 'sehr hoch'], A_WEALTH = ['arm', 'normal', 'reich', 'fürstlich'];
const A_POPR = { Weiler: [20, 80], Dorf: [80, 400], Ortschaft: [400, 1000], Kleinstadt: [1000, 5000], Stadt: [5000, 15000], 'Großstadt': [15000, 40000], Metropole: [40000, 120000], Festung: [150, 2000] };
const A_DQ = { niedrig: [0, .35], mittel: [.25, .65], hoch: [.55, .9], 'sehr hoch': [.8, 1] }, A_WF = { arm: .55, normal: 1, reich: 1.35, 'fürstlich': 1.75 };
const A_NR = { Weiler: [1, 2], Dorf: [1, 2], Ortschaft: [1, 3], Kleinstadt: [2, 3], Stadt: [2, 4], 'Großstadt': [3, 5], Metropole: [4, 7], Festung: [1, 3] };
const A_DD = { Weiler: 'niedrig', Dorf: 'niedrig', Ortschaft: 'mittel', Kleinstadt: 'mittel', Stadt: 'hoch', 'Großstadt': 'hoch', Metropole: 'sehr hoch', Festung: 'mittel' };
const STYLE_TYPE = { Dorf: 'Dorf', Stadt: 'Stadt', Festung: 'Festung', 'Großstadt': 'Großstadt', Zeltstadt: 'Ortschaft', Hafen: 'Kleinstadt' };
const RACE_COL = { Mensch: '#b5835a', Zwerg: '#7a4a2a', Elf: '#4f8a4a', Halbling: '#c9a13b', 'Drachenblütiger': '#a8322d', Gnom: '#5b7fb0', Halbelf: '#7fae7a', Halbork: '#5f6b3a', Tiefling: '#7a3a8a' };
const rr = (a, b) => a + Math.random() * (b - a), sround = x => Math.floor(x) + (Math.random() < x % 1 ? 1 : 0);
function aPop(a) { const [lo, hi] = A_POPR[a.type] || A_POPR.Ortschaft, [q0, q1] = A_DQ[a.density] || A_DQ.mittel, v = lo * Math.pow(hi / lo, rr(q0, q1)), mag = Math.pow(10, Math.max(0, Math.floor(Math.log10(v)) - 1)); return Math.max(1, Math.round(v / mag) * mag); }
function aNums(a) {
  const pop = a.pop > 0 ? a.pop : aPop(a), wf = A_WF[a.wealth] || 1, r = () => rr(.75, 1.25); let lod = pop / 900 * (.8 + .2 * wf) * r(), res = pop / 600 * wf * r(), shop = pop / 160 * Math.pow(wf, 1.3) * r();
  if (a.type === 'Festung') { lod *= .4; res *= .5; shop *= .4; } const ti = A_TYPES.indexOf(a.type); let L = sround(lod), Rn = sround(res), Sn = sround(shop);
  if (ti >= 1) { L = Math.max(1, L); Rn = Math.max(1, Rn); } if (ti >= 2 && ti < 7) Sn = Math.max(2, Sn); return { lodging: L, restaurants: Rn, shops: Sn };
}
function aNorm(list) { const v = list.filter(r => r.n && +r.p > 0), tot = v.reduce((s, r) => s + +r.p, 0); if (!tot) return list; const raw = v.map(r => ({ n: r.n, v: +r.p * 100 / tot })); raw.forEach(r => { r.p = Math.floor(r.v); }); let left = 100 - raw.reduce((s, r) => s + r.p, 0); raw.slice().sort((x, y) => (y.v % 1) - (x.v % 1)).forEach(r => { if (left > 0) { r.p++; left--; } }); return raw.map(r => ({ n: r.n, p: r.p })).filter(r => r.p > 0).sort((x, y) => y.p - x.p); }
/* Völker: Das Besitzervolk stellt die Mehrheit, der Rest wird wie im Atlas gewürfelt */
function aRaces(a, owner) {
  const [lo, hi] = A_NR[a.type] || [1, 3], n = Math.floor(rr(lo, hi + 1)), pool = Object.entries(A_W).filter(e => e[0] !== owner), pk = [];
  while (pk.length < n - 1 && pool.length) { const tot = pool.reduce((s, e) => s + e[1], 0); let v = Math.random() * tot, j = 0; while (j < pool.length - 1 && (v -= pool[j][1]) > 0) j++; pk.push(pool[j][0]); pool.splice(j, 1); }
  if (!pk.length) return [{ n: owner, p: 100 }]; const prim = pk.length === 1 ? rr(60, 92) : rr(45, 80), w = pk.map(() => rr(.3, 1)), ws = w.reduce((s, x) => s + x, 0);
  return aNorm([{ n: owner, p: prim }].concat(pk.map((k, i) => ({ n: k, p: (100 - prim) * w[i] / ws }))));
}
function ensureA(c) {
  const R = resolve(c); let a = c.a;
  if (!a) { a = c.a = { type: STYLE_TYPE[R.style], density: 'mittel', wealth: 'normal', races: [], pop: 0, lodging: 0, restaurants: 0, shops: 0, notes: '', style: R.style, owner: R.race }; a.density = A_DD[a.type]; a.pop = aPop(a); Object.assign(a, aNums(a)); a.races = aRaces(a, R.race); return a; }
  if (a.style !== R.style) { a.style = R.style; if (!a.typeManual) { a.type = STYLE_TYPE[R.style]; if (!a.densityManual) a.density = A_DD[a.type]; if (!a.popManual) a.pop = aPop(a); if (!a.numsManual) Object.assign(a, aNums(a)); } }
  if (a.owner !== R.race) { a.owner = R.race; if (!a.racesManual) a.races = aRaces(a, R.race); }
  return a;
}
function setA(c, f, v) { const a = ensureA(c); a[f] = v; if (f === 'type') { a.typeManual = true; if (!a.densityManual) a.density = A_DD[v] || a.density; } if (f === 'density') a.densityManual = true; if (!a.popManual) a.pop = aPop(a); if (!a.numsManual) Object.assign(a, aNums(a)); if (f === 'type' && !a.racesManual) a.races = aRaces(a, a.owner); }

/* ---------- Gebäudetypen und PoI ---------- */
const BT = {
  wohn: { n: 'Wohnhaus', i: '🏠' }, reich: { n: 'Reich', i: '💎' }, arm: { n: 'Arm', i: '🛖' }, shop: { n: 'Shop', i: '🛒', poi: 1 }, schaenke: { n: 'Schänke', i: '🍺', poi: 1 },
  gemeinde: { n: 'Gemeindehaus', i: '🏛️', poi: 1 }, rathaus: { n: 'Rathaus', i: '⚖️', poi: 1 }, relig: { n: 'Religiös', i: '⛪', poi: 1 }, palast: { n: 'Palast', i: '👑', poi: 1 }, festung: { n: 'Festung', i: '🏰', poi: 1 },
  platz: { n: 'Platz / Markt', i: '⬜', flat: 1 }, feld: { n: 'Feld', i: '🌾', flat: 1 }, park: { n: 'Grünfläche', i: '🌿', flat: 1 }, wasser: { n: 'Wasser', i: '💧', flat: 1 }, steg: { n: 'Steg / Kai', i: '🪵', flat: 1 }
};
const SHOP_W = [['general', 10], ['smithy', 7], ['bakery', 7], ['butcher', 5], ['tailor', 5], ['carpentry', 5], ['herbalist', 4], ['market', 6], ['stable', 3], ['weaponsmith', 3], ['armorer', 2], ['alchemist', 2], ['bowyer', 2], ['jeweler', 1.5], ['bookshop', 1.5], ['pawn', 1.5], ['magic', 1]];
const PN = ['Alrik', 'Brunhild', 'Corvin', 'Dara', 'Edda', 'Falk', 'Gundar', 'Hilda', 'Ivo', 'Jorun', 'Kasimir', 'Lioba', 'Marek', 'Nessa', 'Orin', 'Petra', 'Quirin', 'Runa', 'Sigmar', 'Thea', 'Ulf', 'Vanya', 'Wendel', 'Yara'];
const TAV = [['Goldenen', 'Tanzenden', 'Schlafenden', 'Roten', 'Trunkenen', 'Lachenden', 'Silbernen', 'Alten', 'Schwarzen', 'Einäugigen'], ['Drachen', 'Eber', 'Greif', 'Krug', 'Hirsch', 'Zwerg', 'Bären', 'Raben', 'Kessel', 'Wanderer']];
function poiDefault(t, rnd, used) {
  const pick = l => l[(rnd() * l.length) | 0]; let kind, name, kindText, owner = '';
  if (t === 'shop') { const tot = SHOP_W.reduce((s, e) => s + e[1], 0); let v = rnd() * tot, j = 0; while (j < SHOP_W.length - 1 && (v -= SHOP_W[j][1]) > 0) j++; kind = SHOP_W[j][0]; owner = pick(PN); name = owner + (/[sxz]$/.test(owner) ? '’ ' : 's ') + PKBY[kind].de; }
  else if (t === 'schaenke') { kind = rnd() < .4 ? 'inn' : 'tavern'; name = 'Zum ' + pick(TAV[0]) + ' ' + pick(TAV[1]); }
  else if (t === 'relig') { kind = rnd() < .3 ? 'shrine' : 'temple'; name = PKBY[kind].de + ' ' + pick(['des Lichts', 'der Ernte', 'des Schmiedefeuers', 'der Sterne', 'des Meeres', 'der Ahnen', 'der Morgenröte', 'des Waldes']); }
  else if (t === 'gemeinde') { kind = 'custom'; kindText = 'Gemeindehaus'; name = 'Gemeindehaus'; }
  else { kind = { rathaus: 'townhall', palast: 'palace', festung: 'castle' }[t] || 'custom'; name = PKBY[kind] ? PKBY[kind].de : 'Ort'; }
  if (used) { let k = 2, b = name; while (used.has(name) && k < 9) name = b + ' ' + ['', '', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][k++]; used.add(name); }
  const K = PKBY[kind]; return { kind, kindText, name, owner, style: K ? K.style : 'common', district: K ? K.dist : 'civic' };
}

/* ---------- Geometrie ---------- */
function dPoly(p, x, y, closed) { let m = 1e9; const n = p.length; for (let i = 0; i < (closed ? n : n - 1); i++) { const a = p[i], b = p[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / L, 0, 1), d = Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t); if (d < m) m = d; } return m; }
function inPoly(p, x, y) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; }
function bHit(b, x, y) { if (b.s === 'c') return Math.hypot(x - b.x, y - b.y) <= b.r; if (b.s === 'p') return inPoly(b.pts, x, y); const c = Math.cos(-(b.a || 0)), s = Math.sin(-(b.a || 0)), dx = x - b.x, dy = y - b.y, lx = dx * c - dy * s, ly = dx * s + dy * c; return Math.abs(lx) <= b.w / 2 && Math.abs(ly) <= b.h / 2; }
function bCenter(b) { if (b.s !== 'p') return [b.x, b.y]; let x = 0, y = 0; b.pts.forEach(p => { x += p[0]; y += p[1]; }); return [x / b.pts.length, y / b.pts.length]; }
const SW = { haupt: 17, gasse: 10, pfad: 5 };
/* Küste als Profil entlang einer Kartenseite */
function seaUV(m, x, y) { const s = m.sea.side; return s === 'S' ? [x, m.H - y] : s === 'N' ? [x, y] : s === 'W' ? [y, x] : [y, m.W - x]; }
function seaXY(m, u, v) { const s = m.sea.side; return s === 'S' ? [u, m.H - v] : s === 'N' ? [u, v] : s === 'W' ? [v, u] : [m.W - v, u]; }
function coastV(m, u) { const P = m.sea.prof, f = clamp(u / m.sea.step, 0, P.length - 1.001), i = f | 0; return P[i] + (P[i + 1] - P[i]) * (f - i); }
function inWater(m, x, y, pad) { pad = pad || 0; if (m.sea) { const q = seaUV(m, x, y); if (q[1] < coastV(m, q[0]) + pad) return true; } if (m.river && dPoly(m.river.pts, x, y) < m.river.w / 2 + pad) return true; return m.b.some(b => b.t === 'wasser' && bHit(b, x, y)); }

/* ---------- Zufallsgenerator: eigene Struktur je Stadtart ---------- */
function coastSide(c) { const e = 26, gx = sdAt(c.x + e, c.y) - sdAt(c.x - e, c.y), gy = sdAt(c.x, c.y + e) - sdAt(c.x, c.y - e); if (Math.abs(gx) < .05 && Math.abs(gy) < .05) return 'S'; return Math.abs(gx) > Math.abs(gy) ? (gx > 0 ? 'E' : 'W') : (gy > 0 ? 'S' : 'N'); }
function riverNear(c) { for (const r of S.rivers) { const p = smooth(r); for (let i = 0; i < p.length - 1; i++) if (Math.hypot(p[i][0] - c.x, p[i][1] - c.y) < 30) return Math.atan2(p[i + 1][1] - p[i][1], p[i + 1][0] - p[i][0]); } return null; }
function genCity(c, seed, o) {
  o = o || {}; const R = resolve(c), a = ensureA(c), rnd = mulberry(seed * 31 + 7), ri = (x, y) => x + rnd() * (y - x), style = R.style;
  const big = a.type === 'Großstadt' || a.type === 'Metropole', mid = a.type === 'Kleinstadt' || a.type === 'Stadt';
  const W = big ? 1900 : mid ? 1500 : 1150, H = big ? 1350 : mid ? 1050 : 820;
  const m = { v: 1, W, H, seed, ground: R.terr, streets: [], b: [], st: [], walls: [], trees: [], sea: null, river: null, style, view: (c.map && c.map.view) || 'art', labels: true };
  const dn = { niedrig: .8, mittel: 1, hoch: 1.15, 'sehr hoch': 1.3 }[a.density] || 1, gap = { niedrig: 11, mittel: 6, hoch: 3, 'sehr hoch': 1.5 }[a.density] || 6;
  let n = clamp(Math.round(a.pop / 9 * dn), 9, 430); if (R.race === 'Elf') n = Math.round(n * .75); if (style === 'Festung') n = clamp(Math.round(a.pop / 12), 14, 130);
  let Rr = clamp(Math.sqrt(n) * (9.8 + gap * .7), 105, Math.min(W, H) * .42);
  let cx = W / 2, cy = H / 2;
  if (style === 'Hafen' || (o.coast !== false && R.coast)) { const side = R.coast ? coastSide(c) : 'S', L = side === 'S' || side === 'N' ? W : H, dep = (side === 'S' || side === 'N' ? H : W) * (style === 'Hafen' ? .27 : .12), prof = []; const ph = ri(0, 6);
    for (let u = 0; u <= L + 40; u += 40) prof.push(dep + Math.sin(u / 170 + ph) * dep * .12 + (fbm(u / 90, seed, seed, 3) - .5) * dep * .3); m.sea = { side, prof, step: 40 };
    const sh = style === 'Hafen' ? dep + Rr * .3 : dep + Rr + 40, D = side === 'S' || side === 'N' ? H : W, v = Math.min(sh, D / 2 + 60), q = seaXY(m, (side === 'S' || side === 'N' ? W : H) / 2, v); cx = q[0]; cy = q[1]; }
  const ra = o.river !== false ? riverNear(c) : null;
  if (ra !== null && style !== 'Zeltstadt' || o.river === true) { let ang = ra === null ? ri(0, 3.14) : ra; if (m.sea) { const s = m.sea.side; ang = s === 'S' || s === 'N' ? 1.5708 + ri(-.25, .25) : ri(-.25, .25); }
    const ox = -Math.sin(ang) * Rr * .45, oy = Math.cos(ang) * Rr * .45, dx = Math.cos(ang), dy = Math.sin(ang), pts = [], L = Math.hypot(W, H);
    for (let t = -L; t <= L; t += 60) { const w = (fbm(t / 260 + 9, seed * .1, seed + 3, 3) - .5) * 130; pts.push([cx + ox + dx * t - dy * w, cy + oy + dy * t + dx * w]); } m.river = { pts, w: big ? 54 : 40 }; }
  const C = [cx, cy], inReg = (x, y, k) => { const dx = (x - cx) / (Rr * (k || 1) * 1.12), dy = (y - cy) / (Rr * (k || 1)); return dx * dx + dy * dy <= 1 && x > 14 && y > 14 && x < W - 14 && y < H - 14; };
  const wig = (p0, p1, k, amp) => { const pts = [], dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy) || 1; for (let i = 0; i <= k; i++) { const t = i / k, w = (i === 0 || i === k) ? 0 : ri(-amp, amp); pts.push([p0[0] + dx * t - dy / L * w, p0[1] + dy * t + dx / L * w]); } return pts; };
  const street = (pts, k, closed) => { const s = { id: uid('t'), pts: pts.map(p => [Math.round(p[0]), Math.round(p[1])]), k }; if (closed) s.pts.push(s.pts[0].slice()); m.streets.push(s); return s; };
  const edgePt = ang => { const dx = Math.cos(ang), dy = Math.sin(ang), t = Math.min(dx > 0 ? (W - cx) / dx : dx < 0 ? -cx / dx : 1e9, dy > 0 ? (H - cy) / dy : dy < 0 ? -cy / dy : 1e9); return [cx + dx * t, cy + dy * t]; };
  const occ = [], free = (x, y, r) => occ.every(q => Math.hypot(q[0] - x, q[1] - y) > q[2] + r);
  const dStreet = (x, y, ex) => { let d = 1e9; for (const s of m.streets) { if (s === ex) continue; const v = dPoly(s.pts, x, y) - SW[s.k] / 2; if (v < d) d = v; } return d; };
  const dWall = (x, y) => { let d = 1e9; m.walls.forEach(w => { d = Math.min(d, dPoly(w.pts, x, y, w.closed)); }); return d; };
  const round = R.race === 'Halbling' || style === 'Zeltstadt';
  const addB = b => { m.b.push(b); if (b.s === 'c') occ.push([b.x, b.y, b.r]); else if (b.s === 'r') { const L = Math.max(b.w, b.h), sh = Math.min(b.w, b.h), k = Math.max(1, Math.round(L / sh)), ca = Math.cos(b.a + (b.w >= b.h ? 0 : 1.5708)), sa = Math.sin(b.a + (b.w >= b.h ? 0 : 1.5708)); for (let i = 0; i < k; i++) { const t = k === 1 ? 0 : (i / (k - 1) - .5) * (L - sh); occ.push([b.x + ca * t, b.y + sa * t, sh * .5]); } } return b; };
  const slot = (s, d, side, w, h, t, reg) => { let acc = 0; for (let i = 0; i < s.pts.length - 1; i++) { const p = s.pts[i], q = s.pts[i + 1], L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (acc + L >= d) { const f = (d - acc) / (L || 1), ang = Math.atan2(q[1] - p[1], q[0] - p[0]), off = SW[s.k] / 2 + h / 2 + 2.5, x = p[0] + (q[0] - p[0]) * f - Math.sin(ang) * off * side, y = p[1] + (q[1] - p[1]) * f + Math.cos(ang) * off * side;
        if (x < 16 || y < 16 || x > W - 16 || y > H - 16 || (reg && !reg(x, y))) return null; const r = Math.min(w, h) * .5; if (!free(x, y, r * .92) || dStreet(x, y, s) < h * .5 + 1.5 || inWater(m, x, y, Math.max(w, h) * .55) || dWall(x, y) < Math.max(w, h) * .5 + 7) return null;
        return round && !BT[t].poi ? { id: uid('b'), s: 'c', x: Math.round(x), y: Math.round(y), r: Math.round(Math.min(w, h) * .55), t, on: s.k } : { id: uid('b'), s: 'r', x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), a: Math.round(ang * 100) / 100, t, on: s.k }; } acc += L; } return null; };
  const sLen = s => { let L = 0; for (let i = 0; i < s.pts.length - 1; i++) L += Math.hypot(s.pts[i + 1][0] - s.pts[i][0], s.pts[i + 1][1] - s.pts[i][1]); return L; };
  const special = (t, w, h, list, near, tries) => { for (let k = 0; k < (tries || 90); k++) { const s = list[(rnd() * list.length) | 0], L = sLen(s), d = ri(8, L - 8), b = slot(s, d, rnd() < .5 ? 1 : -1, w, h, t, (x, y) => Math.hypot(x - near[0], y - near[1]) < (near[2] || Rr * .5) * (1 + k / 40)); if (b) return addB(b); } return null; };
  const fill = (list, reg, lim) => { for (const s of list) { const L = sLen(s); for (const side of [1, -1]) { let d = ri(4, 14); while (d < L - 6 && m.b.filter(b => !BT[b.t].flat).length < lim) { const w = ri(15, 27), h = ri(13, 21), b = slot(s, d + w / 2, side, w, h, 'wohn', reg); if (b) { addB(b); d += w + gap * ri(.4, 1.6); } else d += 7; } } } };
  const polyAt = (x, y, r, k, jit) => { const p = [], a0 = ri(0, 6.28); for (let i = 0; i < k; i++) { const an = a0 + i / k * 6.2832, q = r * (1 + ri(-jit, jit)); p.push([Math.round(x + Math.cos(an) * q), Math.round(y + Math.sin(an) * q)]); } return p; };
  const count = () => m.b.filter(b => !BT[b.t].flat).length;
  let mains = [], inner = [], lanes = [];
  if (style === 'Zeltstadt') {
    m.b.push({ id: uid('b'), s: 'c', x: Math.round(cx), y: Math.round(cy), r: 30, t: 'platz' }); occ.push([cx, cy, 34]);
    const k = 3 + ((rnd() * 2) | 0), a0 = ri(0, 6.28); for (let i = 0; i < k; i++) mains.push(street(wig(C, edgePt(a0 + i / k * 6.28 + ri(-.3, .3)), 6, 26), 'pfad'));
    addB({ id: uid('b'), s: 'c', x: Math.round(cx + 58), y: Math.round(cy - 38), r: 25, t: 'palast' }); addB({ id: uid('b'), s: 'c', x: Math.round(cx - 60), y: Math.round(cy - 30), r: 19, t: 'gemeinde' }); addB({ id: uid('b'), s: 'c', x: Math.round(cx - 20), y: Math.round(cy + 64), r: 15, t: 'relig' });
    for (let ring = 1; count() < n && ring < 14; ring++) { const rad = 62 + ring * (30 + gap), k2 = Math.floor(6.28 * rad / (30 + gap * 2)); for (let i = 0; i < k2 && count() < n; i++) { const an = i / k2 * 6.28 + ri(-.1, .1), r2 = rad + ri(-9, 9), x = cx + Math.cos(an) * r2 * 1.1, y = cy + Math.sin(an) * r2, r = ri(9, 14); if (x < 20 || y < 20 || x > W - 20 || y > H - 20 || !free(x, y, r + 2) || dStreet(x, y) < r + 2 || inWater(m, x, y, r + 6)) continue; addB({ id: uid('b'), s: 'c', x: Math.round(x), y: Math.round(y), r: Math.round(r), t: 'wohn', on: ring < 3 ? 'haupt' : 'gasse' }); } }
  } else if (style === 'Dorf' || (!mid && !big && style !== 'Festung' && style !== 'Hafen')) {
    const a0 = ri(-.4, .4) + (m.sea && (m.sea.side === 'E' || m.sea.side === 'W') ? 1.5708 : 0), main = street(wig(edgePt(a0 + 3.1416), C, 5, 34).concat(wig(C, edgePt(a0), 5, 34).slice(1)), 'gasse'); mains = [main];
    const k = 1 + ((rnd() * 2) | 0); for (let i = 0; i < k; i++) { const an = a0 + (i ? -1 : 1) * 1.5708 + ri(-.4, .4); lanes.push(street(wig([cx + Math.cos(a0) * ri(-60, 60), cy + Math.sin(a0) * ri(-60, 60)], [cx + Math.cos(an) * Rr * 1.25, cy + Math.sin(an) * Rr * 1.25], 4, 22), 'pfad')); }
    m.b.push({ id: uid('b'), s: 'p', pts: polyAt(cx + Math.sin(a0) * 46, cy - Math.cos(a0) * 46, 26, 7, .18), t: 'park' }); occ.push([cx + Math.sin(a0) * 46, cy - Math.cos(a0) * 46, 30]);
    special('gemeinde', 44, 28, mains, [cx, cy, 90]); special('relig', 26, 22, mains.concat(lanes), [cx, cy, 130]);
    fill(mains.concat(lanes), (x, y) => inReg(x, y, 1.15), n);
    for (let i = 0, t = 0; i < 4 + ((rnd() * 3) | 0) && t < 60; t++) { const an = ri(0, 6.28), d = Rr * ri(1.35, 1.9), x = cx + Math.cos(an) * d * 1.1, y = cy + Math.sin(an) * d, w = ri(70, 130), h = ri(50, 90), rot = ri(0, 3.14); if (x < 60 || y < 60 || x > W - 60 || y > H - 60 || !free(x, y, 70) || dStreet(x, y) < 50 || inWater(m, x, y, 70)) continue; const ca = Math.cos(rot), sa = Math.sin(rot); m.b.push({ id: uid('b'), s: 'p', t: 'feld', pts: [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(p => [Math.round(x + p[0] * ca - p[1] * sa), Math.round(y + p[0] * sa + p[1] * ca)]) }); occ.push([x, y, 66]); i++; }
  } else if (style === 'Festung') {
    Rr = clamp(Rr, 170, Math.min(W, H) * .36); const wp = polyAt(cx, cy, Rr * 1.02, 6 + ((rnd() * 3) | 0), .07); m.walls.push({ id: uid('w'), pts: wp, closed: true });
    const ga = Math.atan2((wp[0][1] + wp[1][1]) / 2 - cy, (wp[0][0] + wp[1][0]) / 2 - cx), road = street(wig(edgePt(ga), C, 6, 18), 'haupt'); mains = [road];
    const keep = { id: uid('b'), s: 'r', x: Math.round(cx - Math.cos(ga) * 30), y: Math.round(cy - Math.sin(ga) * 30), w: 96, h: 74, a: Math.round(ga * 100) / 100, t: 'festung' }; addB(keep);
    inner = [street(polyAt(cx, cy, Rr * .68, 12, .05), 'gasse', true)];
    special('gemeinde', 46, 26, inner, [cx, cy, Rr]); special('relig', 26, 22, inner, [cx, cy, Rr]);
    fill(inner.concat(mains), (x, y) => inPoly(wp, x, y), Math.round(n * .7)); fill(mains, (x, y) => !inPoly(wp, x, y) && Math.hypot(x - cx, y - cy) < Rr * 2, n);
  } else {
    const k = big ? 4 + ((rnd() * 2) | 0) : 3, a0 = ri(0, 6.28); let angs = []; for (let i = 0; i < k; i++) angs.push(a0 + i / k * 6.2832 + ri(-.25, .25));
    if (m.sea) { const sa = { S: 1.5708, N: -1.5708, E: 0, W: 3.1416 }[m.sea.side]; angs = angs.filter(an => Math.cos(an - sa) < .55); if (style === 'Hafen') angs = [sa + 3.1416 + ri(-.2, .2), sa + 3.1416 - 1 + ri(-.15, .15), sa + 3.1416 + 1 + ri(-.15, .15)]; }
    m.b.push({ id: uid('b'), s: 'p', pts: polyAt(cx, cy, big ? 52 : 38, 7, .14), t: 'platz' }); occ.push([cx, cy, big ? 50 : 36]);
    angs.forEach(an => mains.push(street(wig(C, edgePt(an), 7, big ? 30 : 24), 'haupt')));
    if (style === 'Hafen' && m.sea) { const L = m.sea.side === 'S' || m.sea.side === 'N' ? W : H, uc = seaUV(m, cx, cy)[0], q = []; for (let u = Math.max(30, uc - Rr * 1.25); u <= Math.min(L - 30, uc + Rr * 1.25); u += 40) q.push(seaXY(m, u, coastV(m, u) + 17)); const quay = street(q, 'haupt'); mains.push(quay);
      const np = 3 + ((rnd() * 3) | 0); for (let i = 0; i < np; i++) { const u = uc + (i - (np - 1) / 2) * (Rr * 1.7 / np) + ri(-14, 14), v0 = coastV(m, u) + 6, len = ri(70, 125), pw = 8; m.b.push({ id: uid('b'), s: 'p', t: 'steg', pts: [seaXY(m, u - pw, v0), seaXY(m, u + pw, v0), seaXY(m, u + pw, v0 - len), seaXY(m, u - pw, v0 - len)].map(p => [Math.round(p[0]), Math.round(p[1])]) }); if (rnd() < .75) { const p = seaXY(m, u + 30, v0 - len * ri(.4, .9)); m.st.push({ id: uid('s'), k: 'schiff', x: Math.round(p[0]), y: Math.round(p[1]), s: 3.4 }); } }
      const cm = seaXY(m, uc, coastV(m, uc) + 17); mains.push(street(wig(C, cm, 3, 8), 'haupt')); }
    const rings = big ? [.5, .9] : [.62]; rings.forEach(f => { const p = polyAt(cx, cy, Rr * f, 14, .06).map(q => [cx + (q[0] - cx) * 1.1, q[1]]).filter(q => !inWater(m, q[0], q[1], 24)); if (p.length > 5) inner.push(street(p, 'gasse', !m.sea)); });
    const walled = big || a.type === 'Stadt';
    if (walled) { const wp = polyAt(cx, cy, Rr * 1.12, big ? 18 : 14, .04).map(q => [Math.round(cx + (q[0] - cx) * 1.12), q[1]]); if (m.sea) { const lp = wp.filter(q => !inWater(m, q[0], q[1], 18) && q[0] > 20 && q[1] > 20 && q[0] < W - 20 && q[1] < H - 20); let bi = 0; for (let i = 0; i < wp.length; i++) if (inWater(m, wp[i][0], wp[i][1], 18)) bi = i; const rot = wp.slice(bi + 1).concat(wp.slice(0, bi + 1)).filter(q => lp.includes(q)); if (rot.length > 3) m.walls.push({ id: uid('w'), pts: rot, closed: false }); } else m.walls.push({ id: uid('w'), pts: wp, closed: true }); }
    const all = mains.concat(inner), nl = Math.round(n / 13);
    for (let i = 0, t = 0; i < nl && t < nl * 6; t++) { const s = all[(rnd() * all.length) | 0], j = (rnd() * (s.pts.length - 1)) | 0, p = s.pts[j], q = s.pts[j + 1], f = rnd(), x = p[0] + (q[0] - p[0]) * f, y = p[1] + (q[1] - p[1]) * f; if (!inReg(x, y, .95)) continue; const an = Math.atan2(q[1] - p[1], q[0] - p[0]) + (rnd() < .5 ? 1 : -1) * 1.5708 + ri(-.3, .3), L = ri(70, 190), e = [x + Math.cos(an) * L, y + Math.sin(an) * L]; if (!inReg(e[0], e[1], 1) || inWater(m, e[0], e[1], 20) || dStreet((x + e[0]) / 2, (y + e[1]) / 2) < 22) continue; lanes.push(street(wig([x, y], e, 3, 12), 'gasse')); i++; }
    const near = [cx, cy, big ? 150 : 110];
    if (big || a.wealth === 'fürstlich') { const pa = ri(0, 6.28), px = cx + Math.cos(pa) * Rr * .42, py = cy + Math.sin(pa) * Rr * .42; special('palast', 104, 66, all, [px, py, 90]); }
    if (big) special('festung', 78, 60, inner, [cx, cy, Rr]);
    special('rathaus', 58, 36, mains, near); special('relig', 62, 34, mains, near); if (mid && a.type === 'Kleinstadt') special('gemeinde', 46, 28, mains, near); else special('gemeinde', 54, 30, all, [cx, cy, Rr * .8]);
    for (let i = 0; i < (big ? 3 : 1); i++) special('relig', 30, 24, all, [cx, cy, Rr]);
    const reg = walled ? (x, y) => inReg(x, y, 1.02) : (x, y) => inReg(x, y, 1.12);
    fill(mains, reg, Math.round(n * .45)); fill(inner, reg, Math.round(n * .75)); fill(lanes, reg, n); if (count() < n) fill(mains, (x, y) => inReg(x, y, 1.6), n);
  }
  /* Typen verteilen: Läden und Schänken an die Hauptstraßen, Reiche ins Zentrum, Arme an den Rand */
  const used = new Set(), homes = m.b.filter(b => b.t === 'wohn'), dc = b => Math.hypot(b.x - cx, b.y - cy), tot = homes.length;
  m.b.forEach(b => { if (BT[b.t].poi) Object.assign(b, poiDefault(b.t, rnd, used)); });
  const nS = Math.min(a.shops, Math.round(tot * .32), 70), nT = Math.min(a.lodging + a.restaurants, Math.round(tot * .14), 30);
  const byMain = homes.slice().sort((p, q) => (dc(p) + (p.on === 'haupt' ? 0 : Rr * .5)) - (dc(q) + (q.on === 'haupt' ? 0 : Rr * .5)));
  const quayD = b => m.sea && style === 'Hafen' ? seaUV(m, b.x, b.y)[1] - coastV(m, seaUV(m, b.x, b.y)[0]) : dc(b) + (b.on === 'haupt' ? 0 : Rr * .4);
  byMain.slice(0, nS).forEach(b => { b.t = 'shop'; Object.assign(b, poiDefault('shop', rnd, used)); });
  homes.filter(b => b.t === 'wohn').sort((p, q) => quayD(p) + rnd() * 60 - quayD(q) - rnd() * 60).slice(0, nT).forEach((b, i) => { b.t = 'schaenke'; Object.assign(b, poiDefault('schaenke', rnd, used)); if (i < a.lodging && i >= Math.min(a.restaurants, nT - a.lodging)) b.kind = 'inn'; });
  const rest = homes.filter(b => b.t === 'wohn').sort((p, q) => dc(p) - dc(q)), wr = { arm: [.03, .5], normal: [.1, .22], reich: [.24, .1], 'fürstlich': [.38, .05] }[a.wealth] || [.1, .2];
  const pal = m.b.find(b => b.t === 'palast'); if (pal) rest.sort((p, q) => Math.hypot(p.x - pal.x, p.y - pal.y) - Math.hypot(q.x - pal.x, q.y - pal.y));
  rest.slice(0, Math.round(rest.length * wr[0])).forEach(b => { b.t = 'reich'; if (b.s === 'r') { b.w = Math.round(b.w * 1.12); } });
  rest.slice().sort((p, q) => dc(q) - dc(p)).filter(b => b.t === 'wohn').slice(0, Math.round(rest.length * wr[1])).forEach(b => { b.t = 'arm'; if (b.s === 'r') { b.w = Math.round(b.w * .82); b.h = Math.round(b.h * .85); } else b.r = Math.round(b.r * .85); });
  m.b.forEach(b => { delete b.on; });
  /* Bäume und Felsen je nach Gelände */
  const td = [26, 46, 18, 300, 340, 5, 44, 24, 60, 12, 22][R.terr] * W * H / 1.3e6 * (R.race === 'Elf' ? 1.5 : 1), wallIn = (x, y) => m.walls.some(w => w.closed && inPoly(w.pts, x, y));
  for (let i = 0, t = 0; i < td && t < td * 5; t++) { const x = ri(10, W - 10), y = ri(10, H - 10), r = ri(6, 11.5), ins = inReg(x, y, 1.05); if (ins && R.race !== 'Elf' && R.terr !== 3 && R.terr !== 4 && rnd() < .85) continue; if (wallIn(x, y) && rnd() < .7) continue; if (!free(x, y, r * .7) || dStreet(x, y) < r + 2 || inWater(m, x, y, r + 3) || dWall(x, y) < r + 8 || m.b.some(b => BT[b.t].flat && bHit(b, x, y))) continue; m.trees.push([Math.round(x), Math.round(y), Math.round(r * 10) / 10]); i++; }
  return m;
}
function emptyCity(c) { const R = resolve(c); return { v: 1, W: 1500, H: 1050, seed: 1, ground: R.terr, streets: [], b: [], st: [], walls: [], trees: [], sea: null, river: null, style: R.style, view: 'art', labels: true }; }

/* ---------- Darstellung der Stadtkarte ---------- */
const STAMPS = [['haus', 'Haus'], ['hof', 'Langhaus'], ['turm', 'Turm'], ['tempel', 'Tempel'], ['kuppel', 'Kuppelbau'], ['huegel', 'Hügelhaus'], ['zelt', 'Zelt'], ['burg', 'Burg'], ['muehle', 'Mühle'], ['stand', 'Marktstand'], ['brunnen', 'Brunnen'], ['baum', 'Baum'], ['schiff', 'Schiff']];
function drawStamp(g, k, A, st) {
  const P = pal(A, st === 'ink' ? 'ink' : 'art'); g.lineJoin = 'round'; g.lineCap = 'round';
  switch (k) {
    case 'haus': house(g, P, A.house === 'mound' ? 'gable' : A.house, 0, 8, 6); break;
    case 'hof': house(g, P, 'gable', -4.5, 7, 5); g.beginPath(); g.rect(-1, -5, 9, 5); fs(g, P, P.wall); shp(g, P, [-1.6, -5, .5, -8.4, 7, -8.4, 8.6, -5], P.roof); break;
    case 'turm': tower(g, P, A.tower, 0, 5, 14); break;
    case 'tempel': house(g, P, 'gable', 0, 10, 6.5); tower(g, P, A.land === 'step' ? 'dome' : A.land, -7, 4, 12); break;
    case 'kuppel': house(g, P, 'dome', 0, 9, 5.5); break;
    case 'huegel': house(g, P, 'mound', 0, 8, 5.5); break;
    case 'zelt': tent(g, P, 0, 10, 8, P.ink ? P.wall : mix(A.wall, '#f6efdc', .35)); break;
    case 'burg': tower(g, P, 'battle', 0, 8, 13); flag(g, P, 0, -16, P.acc); wallSeg(g, P, 'stone', -11, 11, 6, true); tower(g, P, 'battle', -11.5, 5, 9.5); tower(g, P, 'battle', 11.5, 5, 9.5); break;
    case 'muehle': g.beginPath(); g.moveTo(-3.4, 0); g.lineTo(-2.4, -10); g.lineTo(2.4, -10); g.lineTo(3.4, 0); g.closePath(); fs(g, P, P.wall); roof(g, P, 'gable', 0, 4.8, -10); for (const an of [.5, 2.07, 3.64, 5.21]) shp(g, P, [0, -10.5, Math.cos(an) * 8.5, -10.5 + Math.sin(an) * 8.5, Math.cos(an + .28) * 8, -10.5 + Math.sin(an + .28) * 8], P.ink ? P.wall : '#f6efdc'); break;
    case 'stand': shp(g, P, [-4.5, 0, -4.5, -5], null, true); shp(g, P, [4.5, 0, 4.5, -5], null, true); g.beginPath(); g.rect(-4.5, -2.6, 9, 1.4); fs(g, P, P.wood); shp(g, P, [-5.6, -5, -4, -7.4, 4, -7.4, 5.6, -5], P.roof); shp(g, P, [-1.8, -5, -1.2, -7.4, 1.2, -7.4, 1.8, -5], P.ink ? P.wall : '#f6efdc'); break;
    case 'brunnen': g.beginPath(); g.ellipse(0, -1.4, 5, 2.2, 0, 0, 6.2832); fs(g, P, P.stone); g.beginPath(); g.ellipse(0, -1.8, 3.6, 1.4, 0, 0, 6.2832); fs(g, P, P.water); shp(g, P, [-4, -2, -4, -7], null, true); shp(g, P, [4, -2, 4, -7], null, true); shp(g, P, [-5, -7, 0, -9.4, 5, -7], P.roof); break;
    case 'baum': shp(g, P, [0, 0, 0, -4], null, true); g.beginPath(); g.arc(0, -7, 4.6, 0, 6.2832); fs(g, P, P.green); break;
    case 'schiff': g.beginPath(); g.moveTo(-6, -3); g.quadraticCurveTo(0, 1.6, 6.4, -3); g.closePath(); fs(g, P, P.wood); shp(g, P, [0, -3, 0, -13], null, true); shp(g, P, [0, -12.4, 5, -5, 0, -4.4], P.ink ? P.wall : '#f6efdc'); shp(g, P, [0, -11, -3.8, -5.2, 0, -4.8], P.ink ? P.wall : '#f6efdc'); break;
  }
}
function roofCol(t, A) { return { wohn: A.roof, reich: mix(A.roof, '#6e1a1a', .4), arm: mix(A.roof, '#a8935c', .72), shop: mix(A.roof, '#d8973a', .3), schaenke: mix(A.roof, '#c9792e', .55), gemeinde: '#7f8fa6', rathaus: '#4f6d8f', relig: '#ece7d8', palast: '#cfa53a', festung: '#9c9ca3' }[t] || A.roof; }
function cityPal(st, ground) {
  const gc = toHex(TC[st][ground] || TC[st][1]);
  if (st === 'ink') return { st, ground: gc, line: '#3a2616', lw: 1, street: '#f4e9c8', dirt: '#eadbb2', water: '#d3d3bf', wline: '#3a2616', platz: '#f1e4c0', feld: '#e6d7a4', park: '#dcd9a6', steg: '#d6c08c', wall: '#cdb98a', tree: '#d6d6a2', shadow: 0, col: c => mix('#efe0b8', c, .3), dark: c => mix('#cdb88a', c, .3) };
  if (st === 'real') return { st, ground: gc, line: null, lw: 0, street: '#b3a78e', dirt: '#a8956e', water: '#2f6f9c', wline: null, platz: '#bdb199', feld: '#a9a060', park: '#5f8a4a', steg: '#8a6e48', wall: '#8f8b82', tree: '#2f6a3a', shadow: .42, col: c => mix(mix(c, '#8f887c', .38), '#000000', .08), dark: c => mix(mix(c, '#8f887c', .38), '#000000', .34) };
  return { st, ground: gc, line: '#3b2a1a', lw: .9, street: '#e2d3ac', dirt: '#d4bf8f', water: '#8ecbe4', wline: '#3d6f8f', platz: '#eadcb8', feld: '#d9c56e', park: '#a5cf7c', steg: '#b98a55', wall: '#b9b3a5', tree: '#58a557', shadow: .24, col: c => c, dark: c => mix(c, '#2b1a0e', .26) };
}
const LIGHT = [-.6, -.8];
function drawBuilding(g, b, A, P) {
  const t = b.t, base = roofCol(t, A), lit = P.col(mix(base, '#ffffff', .1)), drk = P.dark(base), ol = () => { if (P.line) { g.strokeStyle = P.line; g.lineWidth = P.lw; g.stroke(); } };
  if (b.s === 'r') {
    const w = b.w, h = b.h, a = b.a || 0;
    if (P.shadow) { g.save(); g.translate(b.x + 3, b.y + 4.5); g.rotate(a); g.fillStyle = 'rgba(20,12,4,' + P.shadow + ')'; g.fillRect(-w / 2, -h / 2, w, h); g.restore(); }
    g.save(); g.translate(b.x, b.y); g.rotate(a);
    if (t === 'festung') { g.fillStyle = P.col('#8a8a92'); g.fillRect(-w / 2, -h / 2, w, h); g.fillStyle = P.col('#b4b4ba'); g.fillRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16); g.fillStyle = P.dark('#8a8a92'); g.fillRect(-w * .2, -h * .2, w * .4, h * .4); g.beginPath(); g.rect(-w / 2, -h / 2, w, h); g.rect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16); g.rect(-w * .2, -h * .2, w * .4, h * .4); ol(); for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.beginPath(); g.arc(sx * w / 2, sy * h / 2, 9, 0, 6.2832); g.fillStyle = P.col('#a6a6ad'); g.fill(); ol(); } g.restore(); return; }
    const lw = w >= h, L = lw ? w : h, Sh = lw ? h : w, e = Sh * .42; if (!lw) g.rotate(1.5708);
    const up = a + (lw ? 0 : 1.5708), topLit = (Math.sin(up) * LIGHT[0] - Math.cos(up) * LIGHT[1]) > 0;
    g.beginPath(); g.moveTo(-L / 2, -Sh / 2); g.lineTo(L / 2, -Sh / 2); g.lineTo(L / 2 - e, 0); g.lineTo(-L / 2 + e, 0); g.closePath(); g.fillStyle = topLit ? lit : drk; g.fill();
    g.beginPath(); g.moveTo(-L / 2, Sh / 2); g.lineTo(L / 2, Sh / 2); g.lineTo(L / 2 - e, 0); g.lineTo(-L / 2 + e, 0); g.closePath(); g.fillStyle = topLit ? drk : lit; g.fill();
    const m1 = P.col(mix(base, '#000000', .1)); g.fillStyle = m1; g.beginPath(); g.moveTo(-L / 2, -Sh / 2); g.lineTo(-L / 2 + e, 0); g.lineTo(-L / 2, Sh / 2); g.closePath(); g.fill(); g.beginPath(); g.moveTo(L / 2, -Sh / 2); g.lineTo(L / 2 - e, 0); g.lineTo(L / 2, Sh / 2); g.closePath(); g.fill();
    g.beginPath(); g.rect(-L / 2, -Sh / 2, L, Sh); g.moveTo(-L / 2 + e, 0); g.lineTo(L / 2 - e, 0); g.moveTo(-L / 2, -Sh / 2); g.lineTo(-L / 2 + e, 0); g.lineTo(-L / 2, Sh / 2); g.moveTo(L / 2, -Sh / 2); g.lineTo(L / 2 - e, 0); g.lineTo(L / 2, Sh / 2);
    if (P.line) { g.strokeStyle = P.line; g.lineWidth = P.lw * (P.st === 'ink' ? 1 : .8); g.stroke(); } else { g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = .6; g.stroke(); }
    const dot = (x, y, r, c) => { g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fillStyle = P.col(c); g.fill(); ol(); };
    if (t === 'shop') { const k = Math.max(3, Math.round(L / 6)); for (let i = 0; i < k; i++) { g.fillStyle = P.col(i % 2 ? '#f6efdc' : '#c0392b'); g.fillRect(-L / 2 + i * L / k, Sh / 2 - 1, L / k, 4.2); } g.beginPath(); g.rect(-L / 2, Sh / 2 - 1, L, 4.2); ol(); }
    else if (t === 'schaenke') { g.fillStyle = P.col('#6b4a2a'); g.fillRect(L * .22, -Sh * .34, 5, 5); dot(-L * .2, 0, 3.4, '#e08a2e'); }
    else if (t === 'rathaus') { g.fillStyle = P.col('#d8d2c4'); g.fillRect(-7, -7, 14, 14); g.beginPath(); g.rect(-7, -7, 14, 14); ol(); dot(0, 0, 3.6, '#c9a13b'); }
    else if (t === 'relig') { dot(L / 2 - e * .9, 0, Sh * .36, '#d9d2bf'); dot(L / 2 - e * .9, 0, 2.6, '#c9a13b'); }
    else if (t === 'palast') { for (const sx of [-1, 1]) for (const sy of [-1, 1]) dot(sx * (L / 2 - 7), sy * (Sh / 2 - 7), 6.5, '#e3c468'); dot(0, 0, Sh * .26, '#e9cf7c'); dot(0, 0, 3, '#8a2222'); }
    else if (t === 'gemeinde') { g.beginPath(); g.moveTo(-L * .12, -Sh / 2); g.lineTo(-L * .12, Sh / 2); g.moveTo(L * .12, -Sh / 2); g.lineTo(L * .12, Sh / 2); ol(); }
    else if (t === 'reich') { g.fillStyle = P.col('#c9a13b'); g.fillRect(-L / 2 + e, -.9, L - 2 * e, 1.8); }
    g.restore(); return;
  }
  if (b.s === 'c') {
    if (P.shadow) { g.beginPath(); g.arc(b.x + 3, b.y + 4.5, b.r, 0, 6.2832); g.fillStyle = 'rgba(20,12,4,' + P.shadow + ')'; g.fill(); }
    const tent = A.key !== 'Halbling', c0 = tent ? mix(base, '#f1e6c8', .45) : mix(base, '#6fae4c', .5);
    g.beginPath(); g.arc(b.x, b.y, b.r, 0, 6.2832); g.fillStyle = P.dark(c0); g.fill(); g.beginPath(); g.moveTo(b.x, b.y); g.arc(b.x, b.y, b.r, 2.2, 5.6); g.closePath(); g.fillStyle = P.col(mix(c0, '#ffffff', .12)); g.fill();
    g.beginPath(); g.arc(b.x, b.y, b.r, 0, 6.2832); const k = Math.max(5, Math.round(b.r / 2.4)); for (let i = 0; i < k; i++) { g.moveTo(b.x, b.y); g.lineTo(b.x + Math.cos(i / k * 6.2832) * b.r, b.y + Math.sin(i / k * 6.2832) * b.r); } if (P.line) { g.strokeStyle = P.line; g.lineWidth = P.lw * .8; g.stroke(); } else { g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = .6; g.stroke(); }
    g.beginPath(); g.arc(b.x, b.y, Math.max(1.6, b.r * .16), 0, 6.2832); g.fillStyle = P.col(BT[t].poi || t === 'reich' ? roofCol(t, A) : '#5a3a22'); g.fill(); ol(); return;
  }
  const p = b.pts, c = bCenter(b);
  if (P.shadow) { g.beginPath(); p.forEach((q, i) => i ? g.lineTo(q[0] + 3, q[1] + 4.5) : g.moveTo(q[0] + 3, q[1] + 4.5)); g.closePath(); g.fillStyle = 'rgba(20,12,4,' + P.shadow + ')'; g.fill(); }
  for (let i = 0; i < p.length; i++) { const q = p[i], r2 = p[(i + 1) % p.length], nx = (q[1] + r2[1]) / 2 - c[1], ny = (q[0] + r2[0]) / 2 - c[0], d = (ny * LIGHT[0] + nx * LIGHT[1]) / (Math.hypot(nx, ny) || 1); g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(q[0], q[1]); g.lineTo(r2[0], r2[1]); g.closePath(); g.fillStyle = d > .25 ? lit : d < -.25 ? drk : P.col(base); g.fill(); }
  g.beginPath(); p.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); p.forEach(q => { g.moveTo(c[0], c[1]); g.lineTo(q[0], q[1]); }); if (P.line) { g.strokeStyle = P.line; g.lineWidth = P.lw * .85; g.stroke(); } else { g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = .6; g.stroke(); }
  if (BT[t].poi) { g.beginPath(); g.arc(c[0], c[1], 3.4, 0, 6.2832); g.fillStyle = P.col(t === 'schaenke' ? '#e08a2e' : '#c9a13b'); g.fill(); ol(); }
}
function pathPts(g, p, close) { g.beginPath(); p.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); if (close) g.closePath(); }
function drawFlat(g, b, P) {
  const col = P[b.t] || P.platz; if (b.s === 'c') { g.beginPath(); g.arc(b.x, b.y, b.r, 0, 6.2832); } else if (b.s === 'r') { const c = Math.cos(b.a || 0), s = Math.sin(b.a || 0); pathPts(g, [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(q => [b.x + q[0] * b.w / 2 * c - q[1] * b.h / 2 * s, b.y + q[0] * b.w / 2 * s + q[1] * b.h / 2 * c]), true); } else pathPts(g, b.pts, true);
  g.fillStyle = col; g.fill(); const ln = b.t === 'wasser' ? P.wline : P.line; if (ln) { g.strokeStyle = ln; g.lineWidth = b.t === 'feld' || b.t === 'park' ? .6 : 1; g.stroke(); }
  if (b.t === 'feld' && b.s === 'p' && b.pts.length > 3) { const p = b.pts; g.save(); pathPts(g, p, true); g.clip(); g.strokeStyle = P.st === 'ink' ? 'rgba(58,38,22,.45)' : 'rgba(90,70,20,.35)'; g.lineWidth = .8; g.beginPath(); for (let i = 1; i < 14; i++) { const f = i / 14; g.moveTo(p[0][0] + (p[3][0] - p[0][0]) * f, p[0][1] + (p[3][1] - p[0][1]) * f); g.lineTo(p[1][0] + (p[2][0] - p[1][0]) * f, p[1][1] + (p[2][1] - p[1][1]) * f); } g.stroke(); g.restore(); }
  if (b.t === 'steg' && P.st !== 'real' && b.s === 'p') { g.save(); pathPts(g, b.pts, true); g.clip(); g.strokeStyle = 'rgba(58,38,22,.4)'; g.lineWidth = .6; const c = bCenter(b); g.beginPath(); for (let i = -40; i <= 40; i++) { g.moveTo(c[0] - 200, c[1] + i * 5); g.lineTo(c[0] + 200, c[1] + i * 5); g.moveTo(c[0] + i * 5, c[1] - 200); g.lineTo(c[0] + i * 5, c[1] + 200); } g.globalAlpha = .5; g.stroke(); g.restore(); }
}
function renderCity(g, c, st, o) {
  const m = c.map, R = resolve(c), A = archFor(R), P = cityPal(st, m.ground), rnd = mulberry(m.seed + 5); o = o || {};
  g.lineJoin = 'round'; g.lineCap = 'round'; g.setLineDash([]); g.fillStyle = P.ground; g.fillRect(0, 0, m.W, m.H);
  for (let i = 0; i < 420; i++) { const x = rnd() * m.W, y = rnd() * m.H, r = 14 + rnd() * 60; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fillStyle = rnd() < .5 ? 'rgba(255,255,240,.016)' : 'rgba(60,40,10,.016)'; g.fill(); }
  if (st !== 'real') { g.strokeStyle = st === 'ink' ? 'rgba(58,38,22,.35)' : 'rgba(60,80,30,.3)'; g.lineWidth = .7; g.beginPath(); const dry = m.ground === 5 || m.ground === 10 || m.ground === 7; for (let i = 0; i < (dry ? 120 : 420) * m.W * m.H / 1.5e6; i++) { const x = rnd() * m.W, y = rnd() * m.H; if (dry) { g.moveTo(x - 5, y); g.quadraticCurveTo(x, y - 2.5, x + 5, y); } else { g.moveTo(x - 1.6, y); g.lineTo(x - 2.3, y - 3); g.moveTo(x, y); g.lineTo(x, y - 3.8); g.moveTo(x + 1.6, y); g.lineTo(x + 2.3, y - 3); } } g.stroke(); }
  m.b.filter(b => b.t === 'feld' || b.t === 'park').forEach(b => drawFlat(g, b, P));
  if (m.sea) { const L = m.sea.side === 'S' || m.sea.side === 'N' ? m.W : m.H, pts = [seaXY(m, -20, -20)]; for (let u = -20; u <= L + 20; u += 20) pts.push(seaXY(m, u, coastV(m, u))); pts.push(seaXY(m, L + 20, -20)); pathPts(g, pts, true); g.fillStyle = P.water; g.fill(); if (P.wline) { g.strokeStyle = P.wline; g.lineWidth = 1.6; g.stroke(); } if (st !== 'real') { g.strokeStyle = st === 'ink' ? 'rgba(58,38,22,.4)' : 'rgba(255,255,255,.55)'; g.lineWidth = 1; for (const off of [9, 20]) { g.beginPath(); for (let u = 0; u <= L; u += 20) { const q = seaXY(m, u, coastV(m, u) - off); u ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.stroke(); } } }
  if (m.river) { pathPts(g, m.river.pts); if (P.wline) { g.strokeStyle = P.wline; g.lineWidth = m.river.w + 3; g.stroke(); } g.strokeStyle = P.water; g.lineWidth = m.river.w; g.stroke(); }
  m.b.filter(b => b.t === 'wasser').forEach(b => drawFlat(g, b, P)); m.b.filter(b => b.t === 'platz' || b.t === 'steg').forEach(b => drawFlat(g, b, P));
  const sl = m.streets.slice().sort((x, y) => SW[x.k] - SW[y.k]);
  sl.forEach(s => { pathPts(g, s.pts); g.strokeStyle = P.line || 'rgba(40,30,15,.5)'; g.lineWidth = SW[s.k] + (s.k === 'pfad' ? 1.2 : 2.6); if (s.k === 'pfad' && st !== 'real') return; g.stroke(); });
  sl.forEach(s => { pathPts(g, s.pts); g.strokeStyle = s.k === 'haupt' ? P.street : P.dirt; g.lineWidth = SW[s.k]; if (s.k === 'pfad') g.setLineDash(st === 'ink' ? [2, 5] : [9, 5]); if (s.k === 'pfad' && st === 'ink') g.strokeStyle = P.line; if (s.k === 'pfad' && st === 'ink') g.lineWidth = 2; g.stroke(); g.setLineDash([]); });
  m.b.filter(b => b.t === 'platz').forEach(b => { const k = P.line; P.line = null; drawFlat(g, b, P); P.line = k; });
  m.walls.forEach(w => { if (P.shadow) { g.save(); g.translate(3, 4.5); pathPts(g, w.pts, w.closed); g.strokeStyle = 'rgba(20,12,4,' + P.shadow + ')'; g.lineWidth = 9; g.stroke(); g.restore(); } pathPts(g, w.pts, w.closed); g.strokeStyle = P.line || '#4a463e'; g.lineWidth = 10.5; g.stroke(); g.strokeStyle = P.wall; g.lineWidth = 7.5; g.stroke();
    g.lineCap = 'butt'; m.streets.forEach(s => { if (s.k === 'pfad') return; for (let i = 0; i < s.pts.length - 1; i++) { const a = s.pts[i], b = s.pts[i + 1], n = w.pts.length; for (let j = 0; j < (w.closed ? n : n - 1); j++) { const c1 = w.pts[j], d = w.pts[(j + 1) % n], rx = b[0] - a[0], ry = b[1] - a[1], sx = d[0] - c1[0], sy = d[1] - c1[1], den = rx * sy - ry * sx; if (Math.abs(den) < 1e-6) continue; const t = ((c1[0] - a[0]) * sy - (c1[1] - a[1]) * sx) / den, u = ((c1[0] - a[0]) * ry - (c1[1] - a[1]) * rx) / den; if (t < 0 || t > 1 || u < 0 || u > 1) continue; const x = a[0] + rx * t, y = a[1] + ry * t, L = Math.hypot(sx, sy), ux = sx / L, uy = sy / L, hw = SW[s.k] / 2 + 1; g.beginPath(); g.moveTo(x - ux * hw, y - uy * hw); g.lineTo(x + ux * hw, y + uy * hw); g.strokeStyle = s.k === 'haupt' ? P.street : P.dirt; g.lineWidth = 12; g.stroke(); for (const sg of [-1, 1]) { g.beginPath(); g.rect(x + ux * sg * (hw + 5) - 6, y + uy * sg * (hw + 5) - 6, 12, 12); g.fillStyle = P.wall; g.fill(); if (P.line) { g.strokeStyle = P.line; g.lineWidth = 1.2; g.stroke(); } } } } }); g.lineCap = 'round';
    w.pts.forEach(q => { g.beginPath(); g.arc(q[0], q[1], 8, 0, 6.2832); g.fillStyle = P.wall; g.fill(); g.strokeStyle = P.line || '#4a463e'; g.lineWidth = 1.3; g.stroke(); }); });
  m.b.filter(b => !BT[b.t].flat).sort((x, y) => bCenter(x)[1] - bCenter(y)[1]).forEach(b => drawBuilding(g, b, A, P));
  m.trees.forEach(t => { if (P.shadow) { g.beginPath(); g.arc(t[0] + 2.5, t[1] + 3.5, t[2], 0, 6.2832); g.fillStyle = 'rgba(20,12,4,' + P.shadow + ')'; g.fill(); } const rock = m.ground === 7 && (t[0] + t[1]) % 3 === 0; g.beginPath(); g.arc(t[0], t[1], t[2], 0, 6.2832); g.fillStyle = rock ? (st === 'ink' ? '#ddd0aa' : '#a59c8e') : m.ground === 10 && st !== 'ink' ? mix(P.tree, '#ffffff', .45) : P.tree; g.fill(); if (P.line) { g.strokeStyle = P.line; g.lineWidth = .8; g.stroke(); } if (st !== 'ink') { g.beginPath(); g.arc(t[0] - t[2] * .28, t[1] - t[2] * .3, t[2] * .45, 0, 6.2832); g.fillStyle = 'rgba(255,255,220,.2)'; g.fill(); } else { g.beginPath(); g.arc(t[0] + t[2] * .1, t[1] + t[2] * .1, t[2] * .55, -.2, 1.6); g.lineWidth = .6; g.stroke(); } });
  m.st.slice().sort((x, y) => x.y - y.y).forEach(s => { g.save(); g.translate(s.x, s.y); g.scale(s.s || 3.2, s.s || 3.2); drawStamp(g, s.k, A, st); g.restore(); });
  if (o.labels) { const T = { fam: st === 'real' ? 'sans' : 'body', px: 11.5, bold: true, fill: st === 'real' ? '#ffffff' : '#3a2616', halo: st === 'real' ? '#0d1a26' : '#fbf1d6', hw: 3 }; const many = m.b.filter(b => BT[b.t].poi).length > 28; m.b.forEach(b => { if (!BT[b.t].poi || !b.name || (many && (b.t === 'shop' || b.t === 'schaenke') && !(o.sel === b.id))) return; const q = bCenter(b), off = b.s === 'r' ? Math.max(b.w, b.h) * .36 + 12 : b.s === 'c' ? b.r + 12 : 22; txt(g, b.name, q[0], q[1] + off, T); }); }
  if (o.title) { const k = m.W / 1500; if (st === 'real') txt(g, (c.name || 'Stadt').toUpperCase(), 26 * k, 44 * k, { fam: 'sans', px: 24 * k, fill: '#ffffff', halo: '#0d1a26', hw: 4 * k, bold: true, align: 'left', ls: 3 * k }); else txt(g, c.name || 'Stadt', 28 * k, 58 * k, { fam: 'title', px: 42 * k, fill: st === 'ink' ? '#3a2616' : '#6e1a1a', halo: st === 'ink' ? '#ecdcb2' : '#fbf1d6', hw: 6 * k, align: 'left' });
    g.strokeStyle = st === 'real' ? '#0a1420' : '#3a2616'; g.lineWidth = 5 * k; g.strokeRect(2.5 * k, 2.5 * k, m.W - 5 * k, m.H - 5 * k); }
}
/* PoI im gemeinsamen Modell von Atlas und Sessionverwaltung; Umgebung folgt dem Viertel auf der Karte */
function cityPois(c, k) {
  const m = c.map; if (!m) return []; const homes = m.b.filter(b => b.t === 'reich' || b.t === 'arm');
  return m.b.filter(b => BT[b.t].poi).map(b => { poiNorm(b); const q = bCenter(b); let rich = 0, poor = 0; homes.forEach(h => { const hc = bCenter(h); if (Math.hypot(hc[0] - q[0], hc[1] - q[1]) < 90) { if (h.t === 'reich') rich++; else poor++; } });
    const K = PKBY[b.kind], district = b.districtSet ? b.district : (K && K.dist !== 'civic' ? K.dist : rich > poor + 1 ? 'rich' : poor > rich + 1 ? 'poor' : b.t === 'shop' ? 'merchant' : 'civic');
    return { id: 'p' + b.id, name: b.name || BT[b.t].n, kind: b.kind, kindText: b.kindText || undefined, city: c.name || '', owner: b.owner || '', style: b.style, district, notes: b.notes || '', x: Math.round(q[0] * k), y: Math.round(q[1] * k) }; });
}
