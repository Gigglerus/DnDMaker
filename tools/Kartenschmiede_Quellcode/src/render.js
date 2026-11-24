/* DND5e Kartenschmiede – Darstellung: Pixel-Grundkarte, Geländesymbole, Linien, Städte, Rahmen */
const FAM = { title: '"EB Title", "Almendra", Georgia, serif', body: '"EB Body", "Crimson Text", Georgia, serif', sans: '"Segoe UI", Arial, Helvetica, sans-serif', kick: '"EB Kicker", "Cinzel", Georgia, serif' };
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const toHex = a => '#' + a.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]); };

const OCEANS = [
  { n: 'Tiefblau', real: [[8, 30, 70], [22, 74, 128], [62, 142, 168]], art: [[104, 164, 194], [134, 190, 210], [182, 220, 226]] },
  { n: 'Türkis', real: [[6, 52, 74], [18, 104, 122], [72, 172, 168]], art: [[92, 176, 178], [128, 202, 198], [186, 228, 218]] },
  { n: 'Sturmgrau', real: [[26, 36, 50], [52, 72, 92], [104, 132, 146]], art: [[122, 148, 166], [150, 174, 188], [192, 208, 214]] }
];
const TC = {
  real: [[118, 142, 86], [104, 146, 72], [164, 160, 98], [46, 92, 54], [28, 98, 50], [216, 190, 134], [126, 134, 84], [126, 114, 100], [76, 100, 72], [150, 150, 128], [236, 240, 244]],
  art: [[202, 218, 158], [178, 212, 130], [220, 212, 142], [150, 196, 124], [112, 186, 118], [240, 218, 156], [196, 206, 138], [206, 198, 182], [158, 186, 142], [206, 210, 186], [244, 247, 250]],
  ink: [[236, 219, 178], [226, 219, 168], [236, 218, 162], [214, 214, 160], [206, 214, 156], [242, 222, 164], [230, 214, 166], [226, 210, 180], [212, 212, 166], [228, 220, 190], [244, 236, 214]]
};
const RELIEF = [.5, .5, .5, .9, 1, .8, 1.7, 4.2, .4, .7, .8];

/* ---------- Grundkarte: Ozean, Land, Gelände, Seen (Pixel für Pixel) ---------- */
function renderBase(sc, st, rx, ry, rw, rh, vis) {
  const { W, H, cell, gw, gh, land, terr, lake, sd } = S, inv = 1 / sc, ic = 1 / cell;
  const img = new ImageData(rw, rh), D = img.data, m = 2, mw = rw + 2 * m, mh = rh + 2 * m, M = new Uint8Array(mw * mh);
  const vL = vis.land, vT = vis.terr, vW = vis.water, oc = OCEANS[S.ocean] || OCEANS[0];
  for (let j = 0; j < mh; j++) { const y = (ry + j - m + .5) * inv, fy = y * ic - .5;
    for (let i = 0; i < mw; i++) { const x = (rx + i - m + .5) * inv, fx = x * ic - .5; let v = 0;
      if (vL) { const na = nt(T1, x * .9, y * .9); if (bl(land, gw, gh, fx, fy) + (na - .5) * 38 > 127.5) { v = 1; if (vW && bl(lake, gw, gh, fx, fy) + (nt(T1, x * .9 + 50, y * .9) - .5) * 30 > 127.5) v = 2; } }
      M[j * mw + i] = v; } }
  const tc = TC[st], ink = [58, 38, 22], edgeR = Math.min(W, H) * .16, thick = sc >= .9;
  let p = 0;
  for (let j = 0; j < rh; j++) { const y = (ry + j + .5) * inv, fy = y * ic - .5, mrow = (j + m) * mw + m;
    for (let i = 0; i < rw; i++, p += 4) { const x = (rx + i + .5) * inv, fx = x * ic - .5, mi = mrow + i, k = M[mi];
      const na = nt(T1, x * .9, y * .9), nb = nt(T1, x * .23 + 77, y * .23 + 31);
      let r, g, b;
      let edge = false;
      if (k !== 0) { const o = k === 2 ? 1 : 0; edge = M[mi - 1] === o || M[mi + 1] === o || M[mi - mw] === o || M[mi + mw] === o || (thick && (M[mi - 2] === o || M[mi + 2] === o || M[mi - 2 * mw] === o || M[mi + 2 * mw] === o)); }
      if (k === 0) {
        const d = bl(sd, gw, gh, fx, fy);
        if (st === 'real') { const A = oc.real, t1 = clamp(d / 3.2, 0, 1), t2 = clamp((d - 3) / 20, 0, 1), q = (nb - .5) * 14 + (na - .5) * 6;
          r = A[2][0] + (A[1][0] - A[2][0]) * t1; g = A[2][1] + (A[1][1] - A[2][1]) * t1; b = A[2][2] + (A[1][2] - A[2][2]) * t1;
          r += (A[0][0] - r) * t2 + q; g += (A[0][1] - g) * t2 + q; b += (A[0][2] - b) * t2 + q;
        } else if (st === 'art') { const A = oc.art, t1 = clamp((d - .4) / 3, 0, 1), t2 = clamp((d - 4) / 30, 0, 1), q = (nb - .5) * 10;
          r = A[2][0] + (A[1][0] - A[2][0]) * t1; g = A[2][1] + (A[1][1] - A[2][1]) * t1; b = A[2][2] + (A[1][2] - A[2][2]) * t1;
          r += (A[0][0] - r) * t2 + q; g += (A[0][1] - g) * t2 + q; b += (A[0][2] - b) * t2 + q;
          const dd = d + (nb - .5) * 1.4; if (Math.abs(dd - 2.4) < .13 || Math.abs(dd - 4.6) < .09) { r += 26; g += 22; b += 16; }
        } else { const q = (nb - .5) * 30 + (na - .5) * 10; r = 222 + q; g = 208 + q; b = 172 + q * .8;
          const dd = d + (nb - .5) * 1.3; let a = 0;
          if (Math.abs(dd - 1.4) < .17) a = .55; else if (Math.abs(dd - 2.9) < .13) a = .36; else if (Math.abs(dd - 4.7) < .1) a = .22;
          if (a) { r += (ink[0] - r) * a; g += (ink[1] - g) * a; b += (ink[2] - b) * a; } }
      } else if (k === 2) {
        if (st === 'real') { const A = oc.real[1], q = (nb - .5) * 12; r = A[0] + q; g = A[1] + q + 6; b = A[2] + q + 6; }
        else if (st === 'art') { const A = oc.art[1]; r = A[0] - 6; g = A[1] - 2; b = A[2] + 4; if (edge) { r = 62; g = 104; b = 132; } }
        else { const q = (nb - .5) * 24; r = 212 + q; g = 206 + q; b = 180 + q; if (edge) { r = ink[0]; g = ink[1]; b = ink[2]; } else if (((j + ry) * inv) % 5 < inv * 1.05 && na > .42) { r -= 42; g -= 40; b -= 34; } }
      } else {
        let t = 0;
        if (vT) { const nc = nt(T1, x * .23 + 191, y * .23 + 113); let gx = Math.floor(x * ic + (nb - .5) * 7 + (na - .5) * 2.6), gy = Math.floor(y * ic + (nc - .5) * 7 + (nt(T2, x * .9, y * .9) - .5) * 2.6); if (gx < 0) gx = 0; else if (gx >= gw) gx = gw - 1; if (gy < 0) gy = 0; else if (gy >= gh) gy = gh - 1; t = terr[gy * gw + gx]; }
        const c = tc[t];
        if (st === 'real') {
          const v = .84 + na * .32, q = (nb - .5) * 22; r = c[0] * v + q; g = c[1] * v + q; b = c[2] * v + q * .7;
          const T = t === 7 || t === 6 ? T2 : T1, r1 = nt(T, x * .55 + 9, y * .55 + 3), r2 = nt(T, x * .55 + 10.3, y * .55 + 4.3);
          let e1 = r1, e2 = r2; if (t === 7) { e1 = 1 - Math.abs(2 * r1 - 1); e2 = 1 - Math.abs(2 * r2 - 1); }
          const sh = (e1 - e2) * RELIEF[t] * 300; r += sh; g += sh; b += sh * .9;
          if (t === 7 && e1 > .9 && nb > .42) { const s = clamp((e1 - .9) * 12, 0, 1) * clamp((nb - .42) * 8, 0, 1); r += (240 - r) * s; g += (242 - g) * s; b += (246 - b) * s; }
          if (t === 3 || t === 4) { const f = nt(T2, x * 2.1, y * 2.1); r -= f * 16; g -= f * 12; b -= f * 12; }
          const d = bl(sd, gw, gh, fx, fy); if (d > -.9 && t !== 10 && t !== 7) { const s = clamp(d + .9, 0, 1) * .55; r += (224 - r) * s; g += (208 - g) * s; b += (162 - b) * s; }
        } else if (st === 'art') {
          const v = .95 + na * .09, q = (nb - .5) * 9; r = c[0] * v + q; g = c[1] * v + q; b = c[2] * v + q;
          if (edge) { r = 74; g = 62; b = 44; }
        } else {
          const q = (nb - .5) * 26 + (na - .5) * 9; r = c[0] + q; g = c[1] + q; b = c[2] + q * .8;
          if (edge) { r = ink[0]; g = ink[1]; b = ink[2]; }
        }
      }
      if (st !== 'art') { const ed = Math.min(x, W - x, y, H - y); if (ed < edgeR) { const f = 1 - (1 - ed / edgeR) * (1 - ed / edgeR) * (st === 'real' ? .42 : .2); r *= f; g *= f; b *= st === 'ink' ? 1 - (1 - f) * 1.35 : f; } }
      D[p] = r; D[p + 1] = g; D[p + 2] = b; D[p + 3] = 255;
    } }
  return img;
}

/* ---------- Geländesymbole (Künstlerisch und Gezeichnet) ---------- */
const DENS = {
  art: [0, .03, .045, .5, .56, .05, .1, .1, .09, .04, .016],
  ink: [0, .018, .03, .4, .44, .085, .09, .105, .08, .035, 0]
};
function occGrid(vis) {
  const { gw, gh, cell } = S, O = new Uint8Array(gw * gh);
  const mark = (x, y, r) => { const cx = Math.floor(x / cell), cy = Math.floor(y / cell); for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) { const X = cx + a, Y = cy + b; if (X >= 0 && Y >= 0 && X < gw && Y < gh) O[Y * gw + X] = 1; } };
  if (vis.water) S.rivers.forEach(o => smooth(o).forEach(p => mark(p[0], p[1], 1)));
  if (vis.road) S.roads.forEach(o => smooth(o).forEach(p => mark(p[0], p[1], 1)));
  if (vis.city) { const u = iconU(); S.cities.forEach(c => { const R = resolve(c), d = ICON_DIM[R.style], w = d[0] * u / 2 + 3, h = d[1] * u; for (let y = c.y - h - 2; y <= c.y + 14 * u; y += cell) for (let x = c.x - w; x <= c.x + w; x += cell) mark(x, y, 0); }); }
  return O;
}
function drawDeco(g, st, vis) {
  if (!vis.terr || !vis.land || st === 'real') return;
  const { W, H, cell, gw, seed } = S, step = 6, O = occGrid(vis), dn = DENS[st], art = st === 'art';
  g.lineJoin = 'round'; g.lineCap = 'round';
  for (let ry = 0; ry * step < H; ry++) for (let rx = 0; rx * step < W; rx++) {
    const x = (rx + hash2(rx, ry, seed)) * step, y = (ry + hash2(rx, ry, seed + 1)) * step, h = hash2(rx, ry, seed + 2);
    const t = terrAt(x, y), d = dn[t]; if (!d || h > d) continue;
    if (!landAt(x, y) || (vis.water && lakeAt(x, y)) || O[cellIdx(x, y)]) continue;
    if (sdAt(x, y) > -(t === 7 ? 1.6 : .7)) continue;
    const v = h / d, w2 = hash2(rx, ry, seed + 3);
    (art ? decoArt : decoInk)(g, t, x, y, v, w2);
  }
}
function decoArt(g, t, x, y, v, w) {
  switch (t) {
    case 3: case 4: {
      if (t === 3 && w < .3) { const s = 4.2 + v * 2; g.fillStyle = '#7a5a3a'; g.fillRect(x - .5, y - 1.5, 1, 2); g.beginPath(); g.moveTo(x, y - s * 1.9); g.lineTo(x + s * .62, y - 1.2); g.lineTo(x - s * .62, y - 1.2); g.closePath(); g.fillStyle = w < .15 ? '#2f6b46' : '#3a7a4c'; g.fill(); g.strokeStyle = '#1f4a30'; g.lineWidth = .6; g.stroke(); break; }
      if (t === 4 && w < .16) { g.strokeStyle = '#6b4a2a'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 1.4, y - 4, x + .6, y - 8); g.stroke(); g.strokeStyle = '#2e8a48'; g.lineWidth = 1.2; for (const a of [-2.6, -1.9, -1.2, -.5]) { g.beginPath(); g.moveTo(x + .6, y - 8); g.quadraticCurveTo(x + .6 + Math.cos(a) * 3.5, y - 8 + Math.sin(a) * 3.5 - 1.5, x + .6 + Math.cos(a) * 5.2, y - 8 + Math.sin(a) * 2.2 + 1); g.stroke(); } break; }
      const r = 3.3 + v * 1.5 + (t === 4 ? .5 : 0); g.fillStyle = '#6b4a2a'; g.fillRect(x - .6, y - 2, 1.2, 2.6);
      g.beginPath(); g.arc(x, y - 2 - r * .8, r, 0, 6.2832); g.fillStyle = t === 4 ? (w < .55 ? '#2e9a52' : '#3fae5a') : (w < .6 ? '#4f9a4f' : '#5aa856'); g.fill(); g.strokeStyle = t === 4 ? '#1c5c30' : '#2d5a30'; g.lineWidth = .65; g.stroke();
      g.beginPath(); g.arc(x - r * .3, y - 2 - r * 1.05, r * .38, 0, 6.2832); g.fillStyle = 'rgba(255,255,220,.3)'; g.fill(); break; }
    case 7: { const hw = 8 + v * 5, hh = 12 + w * 9; g.beginPath(); g.moveTo(x - hw, y); g.lineTo(x, y - hh); g.lineTo(x + hw, y); g.closePath(); g.fillStyle = '#d6cdbb'; g.fill();
      g.beginPath(); g.moveTo(x, y - hh); g.lineTo(x + hw, y); g.lineTo(x + hw * .15, y); g.lineTo(x - hw * .12, y - hh * .45); g.closePath(); g.fillStyle = '#948a7a'; g.fill();
      if (hh > 15) { g.beginPath(); g.moveTo(x, y - hh); g.lineTo(x + hw * .28, y - hh * .68); g.lineTo(x + hw * .08, y - hh * .74); g.lineTo(x - hw * .06, y - hh * .64); g.lineTo(x - hw * .27, y - hh * .7); g.closePath(); g.fillStyle = '#fbfcfd'; g.fill(); }
      g.beginPath(); g.moveTo(x - hw, y); g.lineTo(x, y - hh); g.lineTo(x + hw, y); g.strokeStyle = '#4a4034'; g.lineWidth = .9; g.stroke(); break; }
    case 6: { const hw = 6 + v * 3; g.beginPath(); g.moveTo(x - hw, y); g.quadraticCurveTo(x, y - hw * 1.25, x + hw, y); g.closePath(); g.fillStyle = '#a9bd72'; g.fill(); g.beginPath(); g.moveTo(x - hw, y); g.quadraticCurveTo(x, y - hw * 1.25, x + hw, y); g.strokeStyle = '#64753c'; g.lineWidth = .8; g.stroke(); break; }
    case 5: { if (w < .1) { g.strokeStyle = '#4f8a4a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 6); g.moveTo(x - 2.2, y - 4.6); g.lineTo(x - 2.2, y - 2.6); g.lineTo(x, y - 2.6); g.moveTo(x + 2.2, y - 5.4); g.lineTo(x + 2.2, y - 3.6); g.lineTo(x, y - 3.6); g.stroke(); break; }
      const L = 7 + v * 7; g.beginPath(); g.moveTo(x - L, y); g.quadraticCurveTo(x - L * .2, y - 4.5, x + L * .3, y - .5); g.quadraticCurveTo(x + L * .65, y - 2.6, x + L, y - .4); g.strokeStyle = '#c59c56'; g.lineWidth = .9; g.stroke(); break; }
    case 1: case 2: { g.strokeStyle = t === 1 ? '#5f9440' : '#a39544'; g.lineWidth = .8; g.beginPath(); g.moveTo(x - 1.8, y); g.lineTo(x - 2.6, y - 3); g.moveTo(x, y); g.lineTo(x, y - 4); g.moveTo(x + 1.8, y); g.lineTo(x + 2.6, y - 3); g.stroke(); break; }
    case 8: { g.strokeStyle = '#4f7250'; g.lineWidth = .8; g.beginPath(); g.moveTo(x - 1.5, y); g.lineTo(x - 1.5, y - 5); g.moveTo(x + 1.2, y); g.lineTo(x + 1.2, y - 6.2); g.stroke(); g.fillStyle = '#6b4a2a'; g.fillRect(x - 2.1, y - 6.4, 1.2, 2.2); g.fillRect(x + .6, y - 7.6, 1.2, 2.2); g.strokeStyle = '#5f9cb8'; g.beginPath(); g.moveTo(x - 5, y + 1.6); g.lineTo(x + 5, y + 1.6); g.stroke(); break; }
    case 9: { g.beginPath(); g.ellipse(x, y, 2.2 + v, 1.3, 0, 0, 6.2832); g.fillStyle = '#a3a394'; g.fill(); g.strokeStyle = '#6f6f62'; g.lineWidth = .5; g.stroke(); break; }
    case 10: { g.strokeStyle = '#b9cbdc'; g.lineWidth = .9; g.beginPath(); g.moveTo(x - 5, y); g.quadraticCurveTo(x, y - 3, x + 5, y); g.stroke(); break; }
  }
}
function decoInk(g, t, x, y, v, w) {
  const I = '#4a321e', P = '#ead9ae'; g.strokeStyle = I; g.lineWidth = .8;
  switch (t) {
    case 3: case 4: {
      if (w < .3) { const s = 4.2 + v * 2; g.beginPath(); g.moveTo(x, y - s * 1.9); g.lineTo(x + s * .6, y - 1.2); g.lineTo(x - s * .6, y - 1.2); g.closePath(); g.fillStyle = P; g.fill(); g.stroke(); g.beginPath(); g.moveTo(x, y - 1.2); g.lineTo(x, y + 1); g.moveTo(x, y - s * 1.2); g.lineTo(x + s * .3, y - s * .5); g.stroke(); break; }
      const r = 3 + v * 1.4; g.beginPath(); g.moveTo(x, y + .6); g.lineTo(x, y - 2); g.stroke(); g.beginPath(); g.arc(x, y - 2 - r * .8, r, 0, 6.2832); g.fillStyle = P; g.fill(); g.stroke();
      g.beginPath(); g.arc(x + r * .15, y - 2 - r * .7, r * .55, -.3, 1.5); g.lineWidth = .6; g.stroke(); if (t === 4) { g.beginPath(); g.arc(x - r * .2, y - 2 - r * .9, r * .45, 2.6, 4.6); g.stroke(); } break; }
    case 7: { const hw = 8 + v * 5, hh = 12 + w * 9; g.beginPath(); g.moveTo(x - hw, y); g.lineTo(x - hw * .1, y - hh); g.lineTo(x + hw, y); g.closePath(); g.fillStyle = P; g.fill();
      g.beginPath(); g.moveTo(x - hw, y); g.lineTo(x - hw * .1, y - hh); g.lineTo(x + hw, y); g.lineWidth = 1; g.stroke(); g.lineWidth = .6; g.beginPath();
      for (let k = 1; k <= 4; k++) { const f = k / 5, sx = x - hw * .1 + (hw * 1.1) * f, sy = y - hh + hh * f; g.moveTo(sx, sy); g.lineTo(sx - hw * .38 * f - 1, sy + hh * .2 + 1.5); }
      g.stroke(); break; }
    case 6: { const hw = 6 + v * 3; g.beginPath(); g.moveTo(x - hw, y); g.quadraticCurveTo(x, y - hw * 1.2, x + hw, y); g.fillStyle = P; g.fill(); g.stroke(); g.lineWidth = .55; g.beginPath(); g.moveTo(x + hw * .3, y - hw * .42); g.lineTo(x + hw * .1, y - .5); g.moveTo(x + hw * .6, y - hw * .22); g.lineTo(x + hw * .45, y - .3); g.stroke(); break; }
    case 5: { g.fillStyle = I; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + (hash2(k, (x | 0), 5) - .5) * 9, y + (hash2((y | 0), k, 6) - .5) * 6, .55, 0, 6.2832); g.fill(); }
      if (w < .3) { g.lineWidth = .6; g.beginPath(); g.moveTo(x - 6, y + 3); g.quadraticCurveTo(x, y - 1, x + 6, y + 3); g.stroke(); } break; }
    case 1: case 2: { g.lineWidth = .6; g.beginPath(); g.moveTo(x - 1.6, y); g.lineTo(x - 2.3, y - 2.6); g.moveTo(x, y); g.lineTo(x, y - 3.4); g.moveTo(x + 1.6, y); g.lineTo(x + 2.3, y - 2.6); g.stroke(); break; }
    case 8: { g.lineWidth = .6; g.beginPath(); g.moveTo(x - 1.5, y); g.lineTo(x - 2, y - 4); g.moveTo(x, y); g.lineTo(x, y - 5); g.moveTo(x + 1.5, y); g.lineTo(x + 2, y - 4); g.moveTo(x - 5, y + 1.4); g.lineTo(x + 5, y + 1.4); g.moveTo(x - 3, y + 3); g.lineTo(x + 3, y + 3); g.stroke(); break; }
    case 9: { g.fillStyle = I; g.beginPath(); g.arc(x, y, .6, 0, 6.2832); g.fill(); g.beginPath(); g.arc(x + 3, y + 1.5, .5, 0, 6.2832); g.fill(); break; }
  }
}

/* ---------- SVG-Zeichenfläche mit der Schnittstelle eines Canvas (nur Verschieben + Skalieren) ---------- */
class SvgCtx {
  constructor() { this.out = []; this.stk = []; this.m = [1, 0, 0]; this.fillStyle = '#000'; this.strokeStyle = '#000'; this.lineWidth = 1; this.lineCap = 'butt'; this.lineJoin = 'miter'; this.globalAlpha = 1; this.dash = []; this.d = ''; this.isSvg = true; }
  save() { this.stk.push({ m: this.m.slice(), f: this.fillStyle, s: this.strokeStyle, w: this.lineWidth, c: this.lineCap, j: this.lineJoin, a: this.globalAlpha, d: this.dash }); }
  restore() { const o = this.stk.pop(); if (!o) return; this.m = o.m; this.fillStyle = o.f; this.strokeStyle = o.s; this.lineWidth = o.w; this.lineCap = o.c; this.lineJoin = o.j; this.globalAlpha = o.a; this.dash = o.d; }
  translate(x, y) { this.m[1] += x * this.m[0]; this.m[2] += y * this.m[0]; }
  scale(s) { this.m[0] *= s; }
  X(x) { return Math.round((x * this.m[0] + this.m[1]) * 100) / 100; } Y(y) { return Math.round((y * this.m[0] + this.m[2]) * 100) / 100; } R(r) { return Math.round(r * this.m[0] * 100) / 100; }
  beginPath() { this.d = ''; }
  moveTo(x, y) { this.d += 'M' + this.X(x) + ' ' + this.Y(y); } lineTo(x, y) { this.d += (this.d ? 'L' : 'M') + this.X(x) + ' ' + this.Y(y); } closePath() { this.d += 'Z'; }
  quadraticCurveTo(a, b, x, y) { this.d += 'Q' + this.X(a) + ' ' + this.Y(b) + ' ' + this.X(x) + ' ' + this.Y(y); }
  bezierCurveTo(a, b, c, d, x, y) { this.d += 'C' + this.X(a) + ' ' + this.Y(b) + ' ' + this.X(c) + ' ' + this.Y(d) + ' ' + this.X(x) + ' ' + this.Y(y); }
  rect(x, y, w, h) { this.d += 'M' + this.X(x) + ' ' + this.Y(y) + 'H' + this.X(x + w) + 'V' + this.Y(y + h) + 'H' + this.X(x) + 'Z'; }
  ellipse(cx, cy, rx, ry, rot, a0, a1, ccw) {
    const P = a => [this.X(cx + Math.cos(a) * rx), this.Y(cy + Math.sin(a) * ry)], A = (a, b, lg) => { const e = P(b); this.d += 'A' + this.R(rx) + ' ' + this.R(ry) + ' 0 ' + (lg ? 1 : 0) + ' ' + (ccw ? 0 : 1) + ' ' + e[0] + ' ' + e[1]; };
    const s = P(a0); this.d += (this.d && !/Z$/.test(this.d) ? 'L' : 'M') + s[0] + ' ' + s[1];
    let sw = ccw ? a0 - a1 : a1 - a0; if (Math.abs(a1 - a0) >= 6.2831) { const mid = a0 + (ccw ? -Math.PI : Math.PI); A(a0, mid, 0); A(mid, a0 + (ccw ? -6.2831 : 6.2831), 0); this.d += 'Z'; return; }
    while (sw < 0) sw += 6.28318; A(a0, a1, sw > Math.PI);
  }
  arc(cx, cy, r, a0, a1, ccw) { this.ellipse(cx, cy, r, r, 0, a0, a1, ccw); }
  _op() { return this.globalAlpha < 1 ? ' opacity="' + this.globalAlpha + '"' : ''; }
  fill() { if (this.d) this.out.push('<path d="' + this.d + '" fill="' + this.fillStyle + '"' + this._op() + '/>'); }
  stroke() { if (this.d) this.out.push('<path d="' + this.d + '" fill="none" stroke="' + this.strokeStyle + '" stroke-width="' + this.R(this.lineWidth) + '" stroke-linecap="' + this.lineCap + '" stroke-linejoin="' + this.lineJoin + '"' + (this.dash.length ? ' stroke-dasharray="' + this.dash.map(v => this.R(v)).join(' ') + '"' : '') + this._op() + '/>'); }
  fillRect(x, y, w, h) { this.beginPath(); this.rect(x, y, w, h); this.fill(); this.d = ''; }
  strokeRect(x, y, w, h) { this.beginPath(); this.rect(x, y, w, h); this.stroke(); this.d = ''; }
  setLineDash(a) { this.dash = a || []; }
  raw(s) { this.out.push(s); }
}
function txt(g, s, x, y, o) {
  const fam = FAM[o.fam || 'title'], al = o.align || 'center';
  if (g.isSvg) { g.raw('<text x="' + g.X(x) + '" y="' + g.Y(y) + '" font-family=\'' + fam + '\' font-size="' + g.R(o.px) + '"' + (o.bold ? ' font-weight="bold"' : '') + (o.italic ? ' font-style="italic"' : '') + ' text-anchor="' + (al === 'center' ? 'middle' : al === 'right' ? 'end' : 'start') + '" fill="' + o.fill + '"' + (o.halo ? ' stroke="' + o.halo + '" stroke-width="' + g.R(o.hw || 3) + '" stroke-linejoin="round" paint-order="stroke"' : '') + (o.ls ? ' letter-spacing="' + g.R(o.ls) + '"' : '') + '>' + esc(s) + '</text>'); return; }
  g.save(); g.font = (o.italic ? 'italic ' : '') + (o.bold ? 'bold ' : '') + o.px + 'px ' + fam; g.textAlign = al; g.textBaseline = 'alphabetic'; g.lineJoin = 'round'; try { g.letterSpacing = (o.ls || 0) + 'px'; } catch (e) { }
  if (o.halo) { g.strokeStyle = o.halo; g.lineWidth = o.hw || 3; g.strokeText(s, x, y); } g.fillStyle = o.fill; g.fillText(s, x, y); g.restore();
}
const grp = (g, open) => { if (g.isSvg) g.raw(open); };

/* ---------- Flüsse, Straßen, Brücken ---------- */
function linePath(g, p, a, b) { g.beginPath(); g.moveTo(p[a][0], p[a][1]); for (let i = a + 1; i <= b; i++) g.lineTo(p[i][0], p[i][1]); }
function drawRivers(g, st) {
  grp(g, '<g id="gewaesser">'); g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash([]);
  /* Seen überzeichnen Flüsse: Im See wird der Fluss nicht gezeichnet, er endet am Ufer (und setzt am Ausfluss wieder an). */
  const runs = r => { const p = smooth(r), n = p.length, out = []; if (n < 2) return out; const dry = p.map(q => !lakeAt(q[0], q[1]));
    const shore = (o, i) => { let a = p[o], b = p[i]; for (let k = 0; k < 6; k++) { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; if (lakeAt(m[0], m[1])) b = m; else a = m; } const dx = b[0] - p[o][0], dy = b[1] - p[o][1], L = Math.hypot(dx, dy) || 1; return [b[0] + dx / L * 1.2, b[1] + dy / L * 1.2]; };
    let cur = null; for (let i = 0; i < n; i++) { if (dry[i]) { if (!cur) { cur = []; if (i > 0) cur.push({ q: shore(i, i - 1), i: i - .5 }); } cur.push({ q: p[i], i }); } else if (cur) { cur.push({ q: shore(i - 1, i), i: i - .5 }); out.push(cur); cur = null; } }
    if (cur) out.push(cur); return out.filter(c => c.length > 1).map(c => ({ c, n })); };
  const RUNS = S.rivers.map(r => [r, runs(r)]);
  const pass = (col, add, mul) => { g.strokeStyle = col; for (const [r, rs] of RUNS) for (const { c, n } of rs) for (let a = 0; a < c.length - 1; a += 5) { const b = Math.min(c.length - 1, a + 5); g.lineWidth = riverW(r, (c[a].i + c[b].i) / 2, n) * mul + add; g.beginPath(); g.moveTo(c[a].q[0], c[a].q[1]); for (let i = a + 1; i <= b; i++) g.lineTo(c[i].q[0], c[i].q[1]); g.stroke(); } };
  if (st === 'art') { pass('#3d6f8f', 1.5, 1); pass('#8ecbe4', 0, 1); } else if (st === 'real') pass('#2f6f9c', 0, .8); else { pass('#3a2616', 1.1, .9); pass('#cfd0bc', 0, .9); }
  grp(g, '</g>');
}
function drawRoads(g, st) {
  grp(g, '<g id="wege">'); g.lineCap = 'round'; g.lineJoin = 'round';
  const pass = (type, col, w, dash, al) => { g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []); g.globalAlpha = al || 1; for (const r of S.roads) { if (r.type !== type) continue; const p = smooth(r); if (p.length < 2) continue; linePath(g, p, 0, p.length - 1); g.stroke(); } g.setLineDash([]); g.globalAlpha = 1; };
  if (st === 'art') { pass('weg', '#7a5a36', 1.4, [4, 3.2]); pass('strasse', '#6b4a2a', 3.4); pass('strasse', '#ecd9a6', 1.9); }
  else if (st === 'real') { pass('weg', '#e2d8c0', .8, [3, 2.5], .7); pass('strasse', '#efe6d0', 1.3, null, .9); }
  else { pass('weg', '#4a321e', 1.2, [.2, 3.4]); pass('strasse', '#4a321e', 1.5, [6, 2.2]); }
  grp(g, '</g><g id="bruecken">');
  for (const b of bridges()) {
    const L = b.rw / 2 + 4.5, w = b.type === 'weg' ? 1.9 : 2.6, c = Math.cos(b.ang), s = Math.sin(b.ang), P = (l, t) => [b.x + c * l - s * t, b.y + s * l + c * t];
    const q = [P(-L, -w), P(L, -w), P(L, w), P(-L, w)]; g.beginPath(); g.moveTo(q[0][0], q[0][1]); for (let i = 1; i < 4; i++) g.lineTo(q[i][0], q[i][1]); g.closePath();
    g.fillStyle = st === 'art' ? (b.type === 'weg' ? '#b98a55' : '#d8d2c4') : st === 'real' ? '#f1ead8' : '#ead9ae'; g.fill();
    if (st !== 'real') { g.strokeStyle = st === 'art' ? '#4a4034' : '#3a2616'; g.lineWidth = st === 'art' ? .9 : 1; g.lineCap = 'butt';
      for (const t of [-w, w]) { const a = P(-L, t), e = P(L, t), a2 = P(-L - 2, t * 1.7), e2 = P(L + 2, t * 1.7); g.beginPath(); g.moveTo(a2[0], a2[1]); g.lineTo(a[0], a[1]); g.lineTo(e[0], e[1]); g.lineTo(e2[0], e2[1]); g.stroke(); }
      if (st === 'art' && b.type !== 'weg') { g.lineWidth = .5; for (const l of [-L * .4, L * .4]) { const a = P(l, -w), e = P(l, w); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(e[0], e[1]); g.stroke(); } } g.lineCap = 'round'; }
  }
  grp(g, '</g>');
}

/* ---------- Städte ---------- */
const ARCH = {
  eu: { n: 'europäisch (Fachwerk)', wall: '#efe2c0', roof: '#b5442e', acc: '#6b4a2a', house: 'gable', tower: 'spire', land: 'spire', wk: 'stone', stone: '#c2bcae' },
  orient: { n: 'orientalisch', wall: '#ecd9a6', roof: '#2f9c95', acc: '#c9962e', house: 'flat', tower: 'onion', land: 'dome', wk: 'stone', stone: '#dcc48a' },
  holz: { n: 'hölzern', wall: '#b07a44', roof: '#6b4a2a', acc: '#3b2416', house: 'gable', tower: 'gable', land: 'gable', wk: 'palisade', stone: '#8a6238' },
  nord: { n: 'nordisch', wall: '#7a5a3c', roof: '#eef2f6', acc: '#3b2416', house: 'steep', tower: 'steep', land: 'steep', wk: 'palisade', stone: '#7a5a3c' },
  bergm: { n: 'Bergstein', wall: '#cfcabd', roof: '#5d6470', acc: '#3b2416', house: 'gable', tower: 'battle', land: 'spire', wk: 'stone', stone: '#a9a59a' },
  Zwerg: { n: 'zwergisch', wall: '#a6a6ac', roof: '#b5713a', acc: '#d2ac4f', house: 'step', tower: 'battle', land: 'step', wk: 'stone', stone: '#8b8b92' },
  Elf: { n: 'elfisch', wall: '#f3f4ea', roof: '#3f8f6a', acc: '#c9b458', house: 'curved', tower: 'curved', land: 'curved', wk: 'hedge', stone: '#e4e8da' },
  Halbling: { n: 'Halbling-Hügelbau', wall: '#e9d9a8', roof: '#6fae4c', acc: '#c9792e', house: 'mound', tower: 'cap', land: 'cap', wk: 'hedge', stone: '#b9b08a' },
  'Drachenblütiger': { n: 'drachenblütig', wall: '#d1a368', roof: '#a8322d', acc: '#d2ac4f', house: 'step', tower: 'step', land: 'step', wk: 'stone', stone: '#b98a55' },
  Gnom: { n: 'gnomisch', wall: '#eadcc6', roof: '#5b7fb0', acc: '#d2ac4f', house: 'cap', tower: 'cap', land: 'cap', wk: 'stone', stone: '#b7b0a2' },
  Halbelf: { n: 'halbelfisch', wall: '#efe6cf', roof: '#3f7f8f', acc: '#c9b458', house: 'gable', tower: 'curved', land: 'curved', wk: 'stone', stone: '#cfc9b8' },
  Halbork: { n: 'halborkisch', wall: '#8a7355', roof: '#5a4632', acc: '#8a2222', house: 'hide', tower: 'spike', land: 'spike', wk: 'palisade', stone: '#6e5a40' },
  Tiefling: { n: 'Tiefling-Baustil', wall: '#5a5060', roof: '#7a3a8a', acc: '#d2553b', house: 'steep', tower: 'horn', land: 'horn', wk: 'stone', stone: '#4a4350' }
};
const ICON_DIM = { Dorf: [26, 10], Stadt: [34, 20], 'Großstadt': [48, 26], Festung: [32, 22], Zeltstadt: [30, 11], Hafen: [40, 17] };
const iconU = () => (S.opt.icon || 1) * clamp(Math.max(S.W, S.H) / 1600, .8, 1.5);
function archFor(R) {
  let k = R.race;
  if (R.race === 'Mensch') k = R.style === 'Hafen' ? 'holz' : R.zone === 'wueste' ? 'orient' : R.zone === 'schnee' ? 'nord' : (R.zone === 'sumpf' || R.zone === 'wald') ? 'holz' : R.zone === 'berg' ? 'bergm' : 'eu';
  const A = Object.assign({ key: k }, ARCH[k] || ARCH.eu);
  if (R.race !== 'Mensch') { if (R.zone === 'wueste') { A.wall = mix(A.wall, '#e6cd92', .45); A.stone = mix(A.stone, '#dcc48a', .45); } if (R.zone === 'schnee') A.roof = mix(A.roof, '#ffffff', .6); if (R.style === 'Hafen') A.wk = 'palisade'; }
  return A;
}
function lookText(R) { const A = archFor(R); return RACE_PL[R.race] + ' · ' + R.style + ' · ' + A.n + (R.race !== 'Mensch' && R.zone === 'wueste' ? ', sandfarben' : '') + (R.race !== 'Mensch' && R.zone === 'schnee' ? ', verschneit' : ''); }
function pal(A, st) {
  if (st === 'ink') return { wall: '#f1e3bd', roof: mix('#c9ad7c', A.roof, .22), acc: mix('#8a6a40', A.acc, .3), stone: '#e6d5a8', wood: '#d9c08e', line: '#3a2616', lw: .7, green: '#d8d3a0', water: '#b9bfae', ink: true };
  return { wall: A.wall, roof: A.roof, acc: A.acc, stone: A.stone, wood: '#8a6238', line: '#3b2a1a', lw: .55, green: '#5aa856', water: '#8ecbe4' };
}
function shp(g, P, pts, fill, open) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); if (!open) g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } g.strokeStyle = P.line; g.lineWidth = P.lw; g.stroke(); }
function fs(g, P, fill) { g.fillStyle = fill; g.fill(); g.strokeStyle = P.line; g.lineWidth = P.lw; g.stroke(); }
function roof(g, P, type, x, w, y) {
  const h = w / 2;
  switch (type) {
    case 'gable': shp(g, P, [x - h - .8, y, x, y - w * .78, x + h + .8, y], P.roof); break;
    case 'steep': shp(g, P, [x - h - .7, y, x, y - w * 1.3, x + h + .7, y], P.roof); break;
    case 'spire': shp(g, P, [x - h - .4, y, x, y - w * 1.9, x + h + .4, y], P.roof); break;
    case 'flat': g.beginPath(); g.rect(x - h - .5, y - 1.2, w + 1, 1.2); fs(g, P, P.roof); g.beginPath(); g.rect(x - h - .5, y - 2.2, 1.3, 1); g.rect(x + h - .8, y - 2.2, 1.3, 1); fs(g, P, P.wall); break;
    case 'dome': g.beginPath(); g.moveTo(x - h, y); g.arc(x, y, h, Math.PI, 0, false); g.closePath(); fs(g, P, P.roof); shp(g, P, [x, y - h, x, y - h - 2], null, true); break;
    case 'onion': g.beginPath(); g.moveTo(x - h * .7, y); g.bezierCurveTo(x - w * .95, y - w * .55, x - w * .25, y - w * .85, x, y - w * 1.45); g.bezierCurveTo(x + w * .25, y - w * .85, x + w * .95, y - w * .55, x + h * .7, y); g.closePath(); fs(g, P, P.roof); break;
    case 'curved': g.beginPath(); g.moveTo(x - h - 1.6, y + .3); g.quadraticCurveTo(x - w * .12, y - w * .25, x, y - w * 1.7); g.quadraticCurveTo(x + w * .12, y - w * .25, x + h + 1.6, y + .3); g.closePath(); fs(g, P, P.roof); break;
    case 'step': g.beginPath(); g.rect(x - w * .34, y - w * .36, w * .68, w * .36); fs(g, P, P.wall); g.beginPath(); g.rect(x - w * .18, y - w * .66, w * .36, w * .3); fs(g, P, P.roof); g.beginPath(); g.rect(x - h - .5, y - .9, w + 1, .9); fs(g, P, P.roof); break;
    case 'cap': g.beginPath(); g.moveTo(x - w * .85, y + .2); g.quadraticCurveTo(x - w * .75, y - w * .95, x + w * .08, y - w * 1.3); g.quadraticCurveTo(x + w * .8, y - w * .65, x + w * .85, y + .2); g.closePath(); fs(g, P, P.roof); break;
    case 'hide': shp(g, P, [x - h - .8, y, x, y - w * .85, x + h + .8, y], P.roof); shp(g, P, [x - 1.2, y - w * .85 - 1.8, x + .9, y - w * .85 + 1.4], null, true); shp(g, P, [x + 1.2, y - w * .85 - 1.8, x - .9, y - w * .85 + 1.4], null, true); break;
    case 'horn': shp(g, P, [x - h - .3, y, x, y - w * 2.1, x + h + .3, y], P.roof); shp(g, P, [x - h - .3, y, x - h - 1.6, y - w * .9, x - h * .4, y - w * .4], P.roof); shp(g, P, [x + h + .3, y, x + h + 1.6, y - w * .9, x + h * .4, y - w * .4], P.roof); break;
    case 'spike': g.beginPath(); g.rect(x - h - .8, y - 1.3, w + 1.6, 1.3); fs(g, P, P.wood); shp(g, P, [x - h - .8, y - 1.3, x - h - .2, y - 4, x - h + .5, y - 1.3], P.wall); shp(g, P, [x + h - .5, y - 1.3, x + h + .2, y - 4, x + h + .8, y - 1.3], P.wall); shp(g, P, [x - .6, y - 1.3, x, y - 4.6, x + .6, y - 1.3], P.acc); break;
    default: g.beginPath(); g.rect(x - h - .8, y - 1.5, w + 1.6, 1.5); fs(g, P, P.stone); g.beginPath(); for (let k = 0; k < 3; k++) g.rect(x - h - .8 + k * ((w + 1.6 - 1.3) / 2), y - 2.7, 1.3, 1.2); fs(g, P, P.stone);
  }
}
function house(g, P, type, x, w, h) {
  if (type === 'mound') { g.beginPath(); g.moveTo(x - w * .85, 0); g.quadraticCurveTo(x - w * .7, -h * 1.5, x, -h * 1.5); g.quadraticCurveTo(x + w * .7, -h * 1.5, x + w * .85, 0); g.closePath(); fs(g, P, P.roof); g.beginPath(); g.arc(x, -h * .42, h * .36, 0, 6.2832); fs(g, P, P.acc); g.beginPath(); g.rect(x + w * .3, -h * 1.5 - 1.2, 1, 1.8); fs(g, P, P.wall); return; }
  g.beginPath(); g.rect(x - w / 2, -h, w, h); fs(g, P, P.wall);
  g.fillStyle = P.ink ? P.line : P.acc; g.fillRect(x - .7, -Math.min(2.4, h * .5), 1.4, Math.min(2.4, h * .5));
  roof(g, P, type, x, w, -h);
}
function tower(g, P, type, x, w, h) { g.beginPath(); g.rect(x - w / 2, -h, w, h); fs(g, P, P.stone === P.wall ? P.wall : P.stone); g.fillStyle = P.line; g.fillRect(x - .4, -h + 2.2, .8, 2); roof(g, P, type === 'mound' ? 'cap' : type, x, w, -h); }
function wallSeg(g, P, kind, x0, x1, h, gate) {
  if (kind === 'palisade') { const pts = [x0, 0]; for (let x = x0; x < x1 - .1; x += 1.8) pts.push(x, -h, Math.min(x + .9, x1), -h - 1.5, Math.min(x + 1.8, x1), -h); pts.push(x1, 0); shp(g, P, pts, P.wood); }
  else if (kind === 'hedge') { g.beginPath(); g.moveTo(x0, 0); for (let x = x0; x < x1 - .1; x += 3.2) g.quadraticCurveTo(x + 1.6, -h * 1.5, Math.min(x + 3.2, x1), -h * .55); g.lineTo(x1, 0); g.closePath(); fs(g, P, P.green); }
  else { g.beginPath(); g.rect(x0, -h, x1 - x0, h); fs(g, P, P.stone); g.beginPath(); for (let x = x0; x < x1 - 1; x += 2.6) g.rect(x, -h - 1.2, 1.4, 1.2); fs(g, P, P.stone); }
  if (gate) { g.beginPath(); g.moveTo(-1.8, 0); g.lineTo(-1.8, -h * .5); g.arc(0, -h * .5, 1.8, Math.PI, 0, false); g.lineTo(1.8, 0); g.closePath(); fs(g, P, P.ink ? P.line : mix(P.acc, '#2b1a0e', .5)); }
}
function tent(g, P, x, w, h, col) { shp(g, P, [x - w / 2, 0, x, -h, x + w / 2, 0], col || P.wall); shp(g, P, [x - 1.1, 0, x, -h * .55, x + 1.1, 0], P.ink ? P.line : mix(P.acc, '#2b1a0e', .4)); shp(g, P, [x, -h, x, -h - 2.4], null, true); shp(g, P, [x, -h - 2.4, x + 2.2, -h - 1.7, x, -h - 1], P.roof); }
function flag(g, P, x, y, c) { shp(g, P, [x, y, x, y - 5], null, true); shp(g, P, [x, y - 5, x + 3.6, y - 4, x, y - 3], c || P.roof); }
function miniTree(g, P, x, r) { shp(g, P, [x, 0, x, -r], null, true); g.beginPath(); g.arc(x, -r * 1.7, r, 0, 6.2832); fs(g, P, P.green); }
function cityIcon(g, R, st) {
  const A = archFor(R), P = pal(A, st), hs = (x, w, h, t) => house(g, P, t || A.house, x, w, h), tw = (x, w, h, t) => tower(g, P, t || A.tower, x, w, h);
  g.lineJoin = 'round'; g.lineCap = 'round'; g.setLineDash([]);
  if (R.zone === 'berg' && (R.style === 'Festung' || R.style === 'Großstadt' || R.race === 'Zwerg') && R.style !== 'Zeltstadt') { const w = ICON_DIM[R.style][0] / 2, h = ICON_DIM[R.style][1] + 3; shp(g, P, [-w, 0, -w * .35, -h * .82, -w * .1, -h * .62, w * .25, -h, w, 0], P.ink ? '#e6d5a8' : '#9a9186'); if (!P.ink) shp(g, P, [w * .25, -h, w * .08, -h * .78, w * .22, -h * .7, w * .38, -h * .8], '#f6f8fa'); }
  const wood = R.zone === 'wald' || R.race === 'Elf';
  switch (R.style) {
    case 'Dorf': if (wood) { miniTree(g, P, -12.5, 2.6); miniTree(g, P, 12.8, 2.3); } hs(-7.5, 6.2, 4.4); hs(7.5, 5.8, 4); hs(0, 7.4, 5.4); break;
    case 'Stadt': if (wood) { miniTree(g, P, -16, 2.8); miniTree(g, P, 16.4, 2.5); } tw(.5, 4.6, 12.5); hs(-11.5, 5.8, 4.8); hs(11.8, 6, 4.8); hs(-5.6, 6.6, 6.2); hs(6.2, 6.6, 5.8); hs(.3, 6.4, 4.6); break;
    case 'Großstadt': tw(-10.5, 4.4, 14.5); tw(11, 4.4, 13.5); tower(g, P, A.land, 0, 7, 15.5); if (!P.ink || true) flag(g, P, 0, -15.5 - (A.land === 'spire' || A.land === 'curved' || A.land === 'horn' ? 13 : 5), P.acc);
      hs(-15.5, 5.6, 8); hs(-5.6, 5.8, 9); hs(5.8, 5.8, 9); hs(15.6, 5.6, 8); wallSeg(g, P, A.wk, -21, 21, 4.8, true); tower(g, P, A.wk === 'stone' ? 'battle' : A.tower, -21.4, 4.4, 8.4); tower(g, P, A.wk === 'stone' ? 'battle' : A.tower, 21.4, 4.4, 8.4); break;
    case 'Festung': tower(g, P, A.tower === 'spire' ? 'battle' : A.tower, 0, 8.6, 14); flag(g, P, 0, -14 - (A.tower === 'horn' || A.tower === 'curved' ? 16 : A.tower === 'cap' ? 10 : 3), P.acc);
      wallSeg(g, P, A.wk === 'hedge' ? 'stone' : A.wk, -12, 12, 6.6, true); tower(g, P, A.wk === 'palisade' ? A.tower : 'battle', -12.6, 5.2, 10.5); tower(g, P, A.wk === 'palisade' ? A.tower : 'battle', 12.6, 5.2, 10.5); break;
    case 'Zeltstadt': { const c1 = P.ink ? P.wall : mix(A.wall, '#f6efdc', .35); tent(g, P, -9.6, 8, 6, c1); tent(g, P, 9.4, 7.6, 5.6, P.ink ? P.wall : mix(A.roof, '#f6efdc', .55)); tent(g, P, 0, 10, 8.2, c1);
      g.beginPath(); g.arc(-5, 1.6, .9, 0, 6.2832); fs(g, P, P.ink ? P.line : '#e0702e'); break; }
    case 'Hafen': tw(-15.5, 3.4, 11.5, A.tower === 'battle' ? 'gable' : A.tower); hs(-9.4, 6.2, 5.2); hs(-2.4, 6.6, 6); hs(4.6, 5.8, 4.8);
      g.beginPath(); g.rect(8, -1.4, 11.5, 1.2); fs(g, P, P.wood); for (const x of [9.5, 13.5, 17.8]) shp(g, P, [x, -.2, x, 2.2], null, true);
      g.beginPath(); g.moveTo(11.8, -3); g.quadraticCurveTo(15.6, .2, 19.6, -3); g.closePath(); fs(g, P, P.wood); shp(g, P, [15.6, -3, 15.6, -11.5], null, true); shp(g, P, [15.6, -11, 19.4, -5, 15.6, -4.4], P.ink ? P.wall : '#f6efdc'); shp(g, P, [15.6, -10, 12.6, -5.2, 15.6, -4.8], P.ink ? P.wall : '#f6efdc');
      g.strokeStyle = P.ink ? P.line : '#3d6f8f'; g.lineWidth = P.lw; g.beginPath(); g.moveTo(7, 2.6); g.quadraticCurveTo(9, 1.4, 11, 2.6); g.quadraticCurveTo(13, 3.8, 15, 2.6); g.quadraticCurveTo(17, 1.4, 19, 2.6); g.quadraticCurveTo(20.5, 3.6, 22, 2.6); g.stroke(); break;
  }
}
function cityReal(g, R) {
  const A = archFor(R), rnd = mulberry(R.seed), roofC = mix(A.roof, '#b9b2a6', .5), wallC = mix(A.stone, '#d9d2c4', .4);
  const N = { Dorf: [5, 4], Stadt: [15, 7.5], 'Großstadt': [34, 12], Festung: [5, 3.5], Zeltstadt: [7, 5], Hafen: [11, 6.5] }[R.style];
  if (R.style === 'Festung' || R.style === 'Großstadt') { const r = N[1] + 2; g.beginPath(); if (R.style === 'Festung') g.rect(-r, -r, 2 * r, 2 * r); else g.arc(0, 0, r, 0, 6.2832); g.fillStyle = mix(wallC, '#8a8478', .3); g.globalAlpha = .55; g.fill(); g.globalAlpha = 1; g.strokeStyle = wallC; g.lineWidth = 1.1; g.stroke(); }
  for (let i = 0; i < N[0]; i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * N[1], x = Math.cos(a) * d, y = Math.sin(a) * d * .8, s = 1.3 + rnd() * 1.2;
    g.fillStyle = i % 3 ? roofC : mix(A.wall, '#c9c2b4', .4); if (R.style === 'Zeltstadt') { g.beginPath(); g.arc(x, y, s * .7, 0, 6.2832); g.fill(); } else g.fillRect(x - s / 2, y - s / 2, s, s * .8); }
  if (R.style === 'Hafen') { g.fillStyle = '#d9c9a8'; g.fillRect(N[1] - 1, -.5, 6, 1); g.fillRect(N[1] + 1, 2.2, 4.5, .9); }
  g.beginPath(); g.arc(0, 0, 1.4, 0, 6.2832); g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = '#1a1a1a'; g.lineWidth = .6; g.stroke();
}
const NAME_ST = {
  art: { fam: 'title', fill: '#3b2416', halo: '#fbf1d6', hw: 3.2 },
  ink: { fam: 'title', fill: '#3a2616', halo: '#ecdcb2', hw: 3 },
  real: { fam: 'sans', fill: '#ffffff', halo: '#0d1a26', hw: 2.6, bold: true }
};
const NAME_PX = { Dorf: 12.5, Zeltstadt: 12.5, Hafen: 14, Stadt: 14.5, Festung: 14.5, 'Großstadt': 17.5 };
function drawCities(g, st, o) {
  const u = iconU(), list = S.cities.slice().sort((a, b) => a.y - b.y);
  grp(g, '<g id="staedte">');
  list.forEach((c, i) => { const R = resolve(c);
    const ty = { Dorf: 'dorf', Stadt: 'stadt', Festung: 'festung', 'Großstadt': 'hauptstadt', Zeltstadt: 'dorf', Hafen: 'town' }[R.style];
    grp(g, '<g id="siedlung-' + (i + 1) + '" data-type="' + ty + '" data-art="' + esc(R.style) + '" data-volk="' + esc(R.race) + '" data-name="' + esc(c.name) + '">');
    g.save(); g.translate(c.x, c.y); g.scale(u, u); if (st === 'real') cityReal(g, R); else cityIcon(g, R, st); g.restore(); grp(g, '</g>'); });
  grp(g, '</g>');
  if (o.names) { grp(g, '<g id="namen">'); list.forEach(c => { if (!c.name) return; const R = resolve(c), ns = NAME_ST[st], px = NAME_PX[R.style] * u * (st === 'real' ? .88 : 1);
    txt(g, c.name, c.x, c.y + (st === 'real' ? ({ 'Großstadt': 14, Stadt: 9.5, Hafen: 8.5 }[R.style] || 6) * u : (R.style === 'Hafen' ? 4.5 : 2.5) * u) + px * .9, Object.assign({ px }, ns)); }); grp(g, '</g>'); }
}

/* ---------- Rahmen, Gradnetz, Kompass, Maßstab, Titel ---------- */
function drawGrid(g) {
  const { W, H } = S; g.strokeStyle = '#ffffff'; g.lineWidth = .7; g.globalAlpha = .16; g.setLineDash([]);
  for (let i = 1; i < 8; i++) { const x = W * i / 8, bend = (x - W / 2) * .16; g.beginPath(); g.moveTo(x - bend, 0); g.quadraticCurveTo(x + bend, H / 2, x - bend, H); g.stroke(); }
  for (let i = 1; i < 6; i++) { const y = H * i / 6, bend = (y - H / 2) * .14; g.beginPath(); g.moveTo(0, y - bend); g.quadraticCurveTo(W / 2, y + bend, W, y - bend); g.stroke(); }
  g.globalAlpha = 1;
}
function drawFrame(g, st) {
  const { W, H } = S, k = clamp(Math.max(W, H) / 1600, .8, 1.5);
  if (st === 'ink') { g.strokeStyle = '#3a2616'; g.lineWidth = 3 * k; g.strokeRect(9 * k, 9 * k, W - 18 * k, H - 18 * k); g.lineWidth = 1 * k; g.strokeRect(15 * k, 15 * k, W - 30 * k, H - 30 * k);
    g.fillStyle = '#3a2616'; for (const [x, y] of [[9, 9], [W / k - 21, 9], [9, H / k - 21], [W / k - 21, H / k - 21]]) g.fillRect(x * k, y * k, 12 * k, 12 * k);
    g.lineWidth = 1 * k; const n = Math.round((W - 42 * k) / (40 * k)); for (let i = 0; i <= n; i++) { const x = 21 * k + (W - 42 * k) * i / n; for (const y of [9 * k, H - 15 * k]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 6 * k); g.stroke(); } }
    const m = Math.round((H - 42 * k) / (40 * k)); for (let i = 0; i <= m; i++) { const y = 21 * k + (H - 42 * k) * i / m; for (const x of [9 * k, W - 15 * k]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6 * k, y); g.stroke(); } }
  } else if (st === 'art') { g.strokeStyle = '#5a3a22'; g.lineWidth = 9 * k; g.strokeRect(4.5 * k, 4.5 * k, W - 9 * k, H - 9 * k); g.strokeStyle = '#d2ac4f'; g.lineWidth = 1.6 * k; g.strokeRect(11 * k, 11 * k, W - 22 * k, H - 22 * k); g.strokeStyle = '#fbf1d6'; g.lineWidth = 1 * k; g.strokeRect(4.5 * k, 4.5 * k, W - 9 * k, H - 9 * k); }
  else { g.strokeStyle = '#0a1420'; g.lineWidth = 6 * k; g.strokeRect(3 * k, 3 * k, W - 6 * k, H - 6 * k); g.strokeStyle = '#c9d6e2'; g.lineWidth = 1 * k; g.strokeRect(7.5 * k, 7.5 * k, W - 15 * k, H - 15 * k); }
}
function drawCompass(g, st) {
  const { W, H } = S, k = clamp(Math.max(W, H) / 1600, .8, 1.5), cx = W - 78 * k, cy = 86 * k, R = 40 * k;
  const C = st === 'ink' ? ['#3a2616', '#ead9ae', '#3a2616'] : st === 'art' ? ['#6e1a1a', '#f5e9cc', '#3b2416'] : ['#ffffff', '#1c2a38', '#e8eef4'];
  g.setLineDash([]); g.lineJoin = 'round';
  g.beginPath(); g.arc(cx, cy, R * .78, 0, 6.2832); g.strokeStyle = C[2]; g.lineWidth = 1 * k; g.globalAlpha = st === 'real' ? .7 : 1; g.stroke(); g.beginPath(); g.arc(cx, cy, R * .7, 0, 6.2832); g.lineWidth = .5 * k; g.stroke();
  const star = (len, wd, off) => { for (let i = 0; i < 4; i++) { const a = off + i * Math.PI / 2, ax = Math.cos(a), ay = Math.sin(a), bx = Math.cos(a + Math.PI / 4), by = Math.sin(a + Math.PI / 4), cx2 = Math.cos(a - Math.PI / 4), cy2 = Math.sin(a - Math.PI / 4);
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + bx * wd, cy + by * wd); g.lineTo(cx + ax * len, cy + ay * len); g.closePath(); g.fillStyle = C[0]; g.fill(); g.strokeStyle = C[2]; g.lineWidth = .6 * k; g.stroke();
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + cx2 * wd, cy + cy2 * wd); g.lineTo(cx + ax * len, cy + ay * len); g.closePath(); g.fillStyle = C[1]; g.fill(); g.stroke(); } };
  star(R * .6, R * .13, Math.PI / 4); star(R, R * .17, -Math.PI / 2); g.globalAlpha = 1;
  txt(g, 'N', cx, cy - R - 5 * k, { fam: st === 'real' ? 'sans' : 'title', px: 15 * k, fill: st === 'real' ? '#ffffff' : C[2], halo: st === 'real' ? '#0d1a26' : (st === 'ink' ? '#ecdcb2' : '#fbf1d6'), hw: 3 * k, bold: st === 'real' });
}
function drawScale(g, st, o) {
  const { H } = S, k = clamp(Math.max(S.W, H) / 1600, .8, 1.5), x = 34 * k, y = H - 36 * k, seg = 50 * k, C = st === 'real' ? ['#ffffff', '#0d1a26'] : ['#3a2616', st === 'ink' ? '#ead9ae' : '#fbf1d6'];
  for (let i = 0; i < 4; i++) { g.fillStyle = C[i % 2]; g.fillRect(x + i * seg, y, seg, 5 * k); } g.strokeStyle = C[0]; g.lineWidth = 1 * k; g.setLineDash([]); g.strokeRect(x, y, seg * 4, 5 * k);
  const mi = (o.miles || 50) / 100 * 50; const T = { fam: st === 'real' ? 'sans' : 'body', px: 11 * k, fill: C[0], halo: C[1], hw: 2.6 * k, bold: true };
  txt(g, '0', x, y - 4 * k, T); txt(g, String(Math.round(mi * 2)), x + seg * 2, y - 4 * k, T); txt(g, Math.round(mi * 4) + ' Meilen', x + seg * 4, y - 4 * k, T);
}
function drawTitle(g, st) {
  if (!S.name) return; const { W } = S, k = clamp(Math.max(W, S.H) / 1600, .8, 1.5);
  if (st === 'real') { txt(g, S.name.toUpperCase(), 30 * k, 46 * k, { fam: 'sans', px: 22 * k, fill: '#ffffff', halo: '#0d1a26', hw: 3.5 * k, bold: true, align: 'left', ls: 3 * k }); return; }
  txt(g, S.name, 34 * k, 62 * k, { fam: 'title', px: 38 * k, fill: st === 'ink' ? '#3a2616' : '#6e1a1a', halo: st === 'ink' ? '#ecdcb2' : '#fbf1d6', hw: 5 * k, align: 'left' });
}
function drawOverlay(g, st, o, vis) {
  if (st === 'real' && o.grid) drawGrid(g);
  if (vis.water) drawRivers(g, st);
  const rk = vis.realm && vis.land && S.realms && S.realms.length;
  if (rk) drawRealmTint(g, st, o);
  if (vis.road) drawRoads(g, st);
  if (vis.city) drawCities(g, st, o);
  if (rk && o.realmNames !== false) drawRealmNames(g, st);
  grp(g, '<g id="rahmen">');
  if (o.frame) drawFrame(g, st); if (o.compass) drawCompass(g, st); if (o.scale) drawScale(g, st, o); if (o.title) drawTitle(g, st);
  grp(g, '</g>');
}
/* Vollständige Karte auf ein Canvas rendern */
function renderMap(cv, st, sc, o, vis, part) {
  const w = Math.round(S.W * sc), h = Math.round(S.H * sc); cv.width = w; cv.height = h; const g = cv.getContext('2d');
  for (let y = 0; y < h; y += 256) g.putImageData(renderBase(sc, st, 0, y, w, Math.min(256, h - y), vis), 0, y);
  g.save(); g.scale(sc, sc); drawDeco(g, st, vis); if (part !== 'ground') drawOverlay(g, st, Object.assign({ rsc: sc }, o), vis); g.restore(); return cv;
}
