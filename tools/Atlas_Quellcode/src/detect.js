/* DND5e Atlas – Städteerkennung (Rasterbilder und SVG) */
(function (W) {
'use strict';

/* ---------- Arbeitsbild ---------- */
function makeWork(img, natW, natH, maxDim) {
  const sc = Math.min(1, maxDim / Math.max(natW, natH));
  const w = Math.max(1, Math.round(natW * sc)), h = Math.max(1, Math.round(natH * sc));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; p < w * h; p++, i += 4) gray[p] = .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2];
  return { w, h, sc, d, gray };
}
const dist2 = (d, i, c) => { const r = d[i] - c[0], g = d[i + 1] - c[1], b = d[i + 2] - c[2]; return r * r + g * g + b * b; };

function maskFor(wk, col, tol) {
  const n = wk.w * wk.h, m = new Uint8Array(n), t2 = tol * tol, d = wk.d;
  for (let p = 0, i = 0; p < n; p++, i += 4) if (dist2(d, i, col) <= t2) m[p] = 1;
  return m;
}
/* Zusammenhängende Flächen (Lücken bis 1 px werden überbrückt, z. B. bei JPG-Artefakten) */
function components(wk, m, maxArea) {
  const w = wk.w, h = wk.h, lab = new Int32Array(w * h), out = [], st = new Int32Array(w * h);
  let id = 0;
  for (let s = 0; s < w * h; s++) {
    if (!m[s] || lab[s]) continue;
    id++; let sp = 0; st[sp++] = s; lab[s] = id;
    let area = 0, sx = 0, sy = 0, x0 = w, y0 = h, x1 = 0, y1 = 0, big = false;
    while (sp) {
      const p = st[--sp], x = p % w, y = (p - x) / w;
      area++; sx += x; sy += y; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -2; dy <= 2; dy++) {
        const yy = y + dy; if (yy < 0 || yy >= h) continue;
        for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx; if (xx < 0 || xx >= w) continue;
          const q = yy * w + xx; if (m[q] && !lab[q]) { lab[q] = id; st[sp++] = q; }
        }
      }
    }
    if (maxArea && area > maxArea) big = true;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    out.push({ id, area, cx: sx / area, cy: sy / area, x0, y0, bw, bh, fill: area / (bw * bh), asp: bw / bh, big, edge: x0 === 0 || y0 === 0 || x1 === w - 1 || y1 === h - 1 });
  }
  out.lab = lab;
  return out;
}

/* ---------- Beispiel-Symbol ---------- */
function pickExample(wk, wx, wy, tol) {
  const w = wk.w, h = wk.h, d = wk.d;
  wx = Math.round(wx); wy = Math.round(wy);
  if (wx < 0 || wy < 0 || wx >= w || wy >= h) return { err: 'Außerhalb der Karte.' };
  // Umgebungsfarbe (Ring) bestimmen, dann den Pixel nahe dem Klick, der am stärksten abweicht
  let ar = 0, ag = 0, ab = 0, an = 0;
  for (let a = 0; a < 32; a++) { const t = a / 32 * Math.PI * 2; for (const r of [11, 14]) { const x = Math.round(wx + Math.cos(t) * r), y = Math.round(wy + Math.sin(t) * r); if (x < 0 || y < 0 || x >= w || y >= h) continue; const i = (y * w + x) * 4; ar += d[i]; ag += d[i + 1]; ab += d[i + 2]; an++; } }
  const bg = an ? [ar / an, ag / an, ab / an] : [255, 255, 255];
  let best = -1, bp = wy * w + wx;
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
    const x = wx + dx, y = wy + dy; if (x < 0 || y < 0 || x >= w || y >= h || dx * dx + dy * dy > 16) continue;
    const p = y * w + x, v = dist2(d, p * 4, bg) - (dx * dx + dy * dy) * 6; if (v > best) { best = v; bp = p; }
  }
  const col = [d[bp * 4], d[bp * 4 + 1], d[bp * 4 + 2]];
  // Flutfüllung ab dem Startpunkt
  const lim = Math.max(400, Math.round(w * h * .002)), t2 = tol * tol, seen = new Uint8Array(w * h), st = [bp];
  seen[bp] = 1; let area = 0, sx = 0, sy = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
  while (st.length) {
    const p = st.pop(), x = p % w, y = (p - x) / w; area++; sx += x; sy += y;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    if (area > lim) return { err: 'Das angeklickte Symbol ist zu groß oder geht in den Hintergrund über. Bitte genauer auf ein Stadtsymbol klicken oder die Farbtoleranz senken.' };
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const q = yy * w + xx; if (!seen[q] && dist2(d, q * 4, col) <= t2) { seen[q] = 1; st.push(q); }
    }
  }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const tpl = { col, area, bw, bh, fill: area / (bw * bh), asp: bw / bh, cx: sx / area, cy: sy / area, wx, wy, tol };
  tpl.patch = patchAt(wk, tpl.cx, tpl.cy, Math.max(5, bw + 4), Math.max(5, bh + 4));
  tpl.bx = x0 + bw / 2; tpl.by = y0 + bh / 2;
  return { tpl };
}
function patchAt(wk, cx, cy, pw, ph) {
  const a = new Float32Array(pw * ph), ox = Math.round(cx - pw / 2), oy = Math.round(cy - ph / 2);
  for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
    const xx = Math.min(wk.w - 1, Math.max(0, ox + x)), yy = Math.min(wk.h - 1, Math.max(0, oy + y));
    a[y * pw + x] = wk.gray[yy * wk.w + xx];
  }
  return { a, pw, ph };
}
function ncc(p, q) {
  const n = p.a.length; let ma = 0, mb = 0; for (let i = 0; i < n; i++) { ma += p.a[i]; mb += q.a[i]; } ma /= n; mb /= n;
  let s = 0, sa = 0, sb = 0; for (let i = 0; i < n; i++) { const x = p.a[i] - ma, y = q.a[i] - mb; s += x * y; sa += x * x; sb += y * y; }
  return sa && sb ? s / Math.sqrt(sa * sb) : 0;
}
function bestNcc(wk, tpl, cx, cy) {
  let b = -1; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) b = Math.max(b, ncc(tpl.patch, patchAt(wk, cx + dx, cy + dy, tpl.patch.pw, tpl.patch.ph)));
  return b;
}
/* Maske um einen Punkt herum (Symbol + Umgebung) */
function binAt(wk, m, cx, cy, pw, ph) {
  const a = new Uint8Array(pw * ph), ox = Math.round(cx - pw / 2), oy = Math.round(cy - ph / 2);
  for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) { const xx = ox + x, yy = oy + y; if (xx >= 0 && yy >= 0 && xx < wk.w && yy < wk.h) a[y * pw + x] = m[yy * wk.w + xx]; }
  return a;
}
function iou(a, b) { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { if (a[k] && b[k]) i++; if (a[k] || b[k]) u++; } return u ? i / u : 0; }
/* Anteil gleichfarbiger Pixel rund um ein Symbol: echte Stadtsymbole stehen frei, Flächen/Landstriche nicht */
function ringRatio(wk, m, c, mg) {
  const x0 = Math.max(0, c.x0 - mg), y0 = Math.max(0, c.y0 - mg), x1 = Math.min(wk.w - 1, c.x0 + c.bw - 1 + mg), y1 = Math.min(wk.h - 1, c.y0 + c.bh - 1 + mg);
  let n = 0, tot = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (x >= c.x0 && x < c.x0 + c.bw && y >= c.y0 && y < c.y0 + c.bh) continue; tot++; if (m[y * wk.w + x]) n++; }
  return tot ? n / tot : 0;
}
/* Form des Symbols selbst (nur die eigene Fläche) */
function compBin(wk, lab, c, pw, ph) {
  const a = new Uint8Array(pw * ph), ox = Math.round(c.x0 + c.bw / 2 - pw / 2), oy = Math.round(c.y0 + c.bh / 2 - ph / 2);
  for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) { const xx = ox + x, yy = oy + y; if (xx >= 0 && yy >= 0 && xx < wk.w && yy < wk.h && lab[yy * wk.w + xx] === c.id) a[y * pw + x] = 1; }
  return a;
}
/* Formvergleich mit 1 px Toleranz: Anteil der Pixel, die im anderen Symbol einen Nachbarn haben */
function shiftIou(a, b, pw, ph) {
  const near = (m, x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < pw && yy < ph && m[yy * pw + xx]) return true; } return false; };
  let best = 0;
  for (let sy = -1; sy <= 1; sy++) for (let sx = -1; sx <= 1; sx++) {
    let na = 0, ha = 0, nb = 0, hb = 0;
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
      if (a[y * pw + x]) { na++; if (near(b, x + sx, y + sy)) ha++; }
      if (b[y * pw + x]) { nb++; if (near(a, x - sx, y - sy)) hb++; }
    }
    if (na && nb) best = Math.max(best, Math.min(ha / na, hb / nb));
  }
  return best;
}
/* Farbe direkt am Rand des Symbols (z. B. schwarze Umrandung) und die Farbe weiter außen */
function edgeColors(wk, lab, c, mg) {
  const w = wk.w, h = wk.h, d = wk.d, e = [0, 0, 0, 0], o = [0, 0, 0, 0];
  const x0 = Math.max(0, c.x0 - mg - 2), y0 = Math.max(0, c.y0 - mg - 2), x1 = Math.min(w - 1, c.x0 + c.bw + mg + 1), y1 = Math.min(h - 1, c.y0 + c.bh + mg + 1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const p = y * w + x; if (lab[p] === c.id) continue;
    let near = false;
    for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h && lab[yy * w + xx] === c.id) { near = true; break; } }
    const out = x < c.x0 - mg || x >= c.x0 + c.bw + mg || y < c.y0 - mg || y >= c.y0 + c.bh + mg;
    const t = near ? e : out ? o : null; if (!t) continue;
    t[0] += d[p * 4]; t[1] += d[p * 4 + 1]; t[2] += d[p * 4 + 2]; t[3]++;
  }
  const f = t => t[3] ? [t[0] / t[3], t[1] / t[3], t[2] / t[3]] : null;
  return { edge: f(e), outer: f(o) };
}
const cd = (a, b) => a && b ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) : 999;
/* Ähnliche Symbole suchen; strict 0..1
   Prüft: Größe/Seitenverhältnis/Füllgrad, Form (Maskenvergleich), Helligkeitsmuster,
   Randfarbe (Umrandung) und – bei Symbolen ohne Umrandung – dass das Symbol frei steht. */
function findSimilar(wk, tpl, tol, strict, dbg) {
  const m = maskFor(wk, tpl.col, tol), comps = components(wk, m, 0), lab = comps.lab;
  let tc = null, bd = 1e9;
  comps.forEach(c => { const dd = Math.hypot(c.x0 + c.bw / 2 - tpl.bx, c.y0 + c.bh / 2 - tpl.by); if (dd < bd && c.area >= tpl.area * .5) { bd = dd; tc = c; } });
  if (!tc) return [];
  const sz = Math.max(tc.bw, tc.bh), mg = Math.max(3, Math.round(sz * .6));
  const pw = tc.bw + 4, ph = tc.bh + 4, tb = compBin(wk, lab, tc, pw, ph);
  const te = edgeColors(wk, lab, tc, mg), outlined = cd(te.edge, te.outer) > 55;
  const f = 1.4 + (1 - strict) * 2.2, aspT = .18 + (1 - strict) * .6, fillT = .08 + (1 - strict) * .3, nccT = .3 + strict * .5, iouT = .55 + strict * .35;
  const edgeT = 40 + (1 - strict) * 50, ringMax = Math.min(.6, ringRatio(wk, m, tc, mg) * 1.6 + .06 + (1 - strict) * .12);
  let hits = comps.filter(c => c.area >= tc.area / f && c.area <= tc.area * f && Math.abs(Math.log(c.asp / tc.asp)) <= aspT && Math.abs(c.fill - tc.fill) <= fillT);
  if (dbg) dbg.push(['size', hits.length, outlined, te]);
  if (dbg) dbg.push(['ious', hits.map(c => +shiftIou(tb, compBin(wk, lab, c, pw, ph), pw, ph).toFixed(2)).join(' ')]);
  hits = hits.filter(c => shiftIou(tb, compBin(wk, lab, c, pw, ph), pw, ph) >= iouT);
  if (dbg) dbg.push(['iou', hits.length]);
  if (dbg) dbg.push(['edges', hits.map(c => { const e = edgeColors(wk, lab, c, mg); return Math.round(cd(e.edge, te.edge)) + '/' + Math.round(cd(e.edge, e.outer)); }).join(' ')]);
  hits = hits.filter(c => { const e = edgeColors(wk, lab, c, mg); return outlined ? cd(e.edge, te.edge) <= edgeT && cd(e.edge, e.outer) > 35 : ringRatio(wk, m, c, mg) <= ringMax; });
  if (dbg) dbg.push(['edge', hits.length, 'ncc', hits.map(c => +bestNcc(wk, tpl, c.cx, c.cy).toFixed(2)).join(' ')]);
  if (tpl.area >= 10) hits = hits.filter(c => bestNcc(wk, tpl, c.cx, c.cy) >= nccT);
  return mergeClose(hits, Math.max(tpl.bw, tpl.bh) * .9).map(c => ({ x: c.cx / wk.sc, y: c.cy / wk.sc, size: Math.max(c.bw, c.bh) / wk.sc }));
}
function mergeClose(list, r) {
  const out = []; const r2 = r * r;
  list.slice().sort((a, b) => b.area - a.area).forEach(c => { if (!out.some(o => (o.cx - c.cx) ** 2 + (o.cy - c.cy) ** 2 < r2)) out.push(c); });
  return out;
}

/* Gruppe gleichartiger Flecken prüfen: alle müssen dem typischsten Exemplar in Größe, Form und Randfarbe gleichen */
function verifyGroup(wk, lab, list) {
  if (list.length < 3) return list;
  const md = k => list.map(c => c[k]).sort((a, b) => a - b)[list.length >> 1];
  const mA = md('area'), mF = md('fill'), mR = md('asp');
  const proto = list.slice().sort((a, b) => (Math.abs(a.area / mA - 1) + Math.abs(a.fill - mF) + Math.abs(Math.log(a.asp / mR))) - (Math.abs(b.area / mA - 1) + Math.abs(b.fill - mF) + Math.abs(Math.log(b.asp / mR))))[0];
  const pw = Math.max(proto.bw, 3) + 4, ph = Math.max(proto.bh, 3) + 4, pb = compBin(wk, lab, proto, pw, ph);
  const mg = Math.max(3, Math.round(Math.max(proto.bw, proto.bh) * .6)), pe = edgeColors(wk, lab, proto, mg);
  return list.filter(c => c.area >= proto.area * .6 && c.area <= proto.area * 1.65 && shiftIou(pb, compBin(wk, lab, c, pw, ph), pw, ph) >= .8 && cd(edgeColors(wk, lab, c, mg).edge, pe.edge) <= 45);
}
/* ---------- Vollautomatisch: häufigste kompakte Symbolfarbe ---------- */
function autoDetect(wk, dbg) {
  const n = wk.w * wk.h, d = wk.d, hist = new Map();
  for (let i = 0; i < n * 4; i += 4) { const k = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | (d[i + 2] >> 4); hist.set(k, (hist.get(k) || 0) + 1); }
  const minA = 6, maxA = Math.max(300, n * .0006);
  let bins = [...hist.entries()].filter(([, c]) => c >= 12 && c <= n * .03).sort((a, b) => b[1] - a[1]);
  const cols = [];
  for (const [k] of bins) {
    const c = [((k >> 8) & 15) * 16 + 8, ((k >> 4) & 15) * 16 + 8, (k & 15) * 16 + 8];
    if (cols.some(o => (o[0] - c[0]) ** 2 + (o[1] - c[1]) ** 2 + (o[2] - c[2]) ** 2 < 30 * 30)) continue;
    cols.push(c); if (cols.length >= 48) break;
  }
  const ranked = [];
  for (const col of cols) {
    const m = maskFor(wk, col, 34);
    const all = components(wk, m, 0), lab = all.lab, comps = all.filter(c => c.area >= 4);
    if (comps.length < 3) continue;
    const kept = comps.filter(c => c.area >= minA && c.area <= maxA && c.bw >= 3 && c.bh >= 3 && c.asp > .55 && c.asp < 1.8 && c.fill > .45 && !c.edge && ringRatio(wk, m, c, Math.max(3, Math.round(Math.max(c.bw, c.bh) * .7))) < .12);
    if (kept.length < 3) continue;
    const ar = kept.map(c => c.area).sort((a, b) => a - b), med = ar[ar.length >> 1];
    let cons = kept.filter(c => c.area >= med / 2.3 && c.area <= med * 2.3);
    cons = verifyGroup(wk, lab, cons);
    if (cons.length < 3) continue;
    const ratio = cons.length / comps.length;
    // Stadtsymbole sind meist rund oder eckig (Füllgrad ~0,79 bzw. ~1), Bäume/Berge eher spitz
    const fl = cons.map(c => c.fill).sort((a, b) => a - b)[cons.length >> 1];
    const shape = Math.max(Math.exp(-Math.pow((fl - .8) / .08, 2)), Math.exp(-Math.pow((fl - 1) / .08, 2)));
    let score = Math.min(cons.length, 150) * Math.pow(ratio, 1.5) * Math.min(1, med / 12) * (.05 + shape);
    if (cons.length > 150) score *= 150 / cons.length;
    if (dbg) dbg.push([col.join('/'), comps.length, kept.length, cons.length, +ratio.toFixed(2), med, +fl.toFixed(2), +score.toFixed(2)]);
    ranked.push({ score, col, cons, med, ratio });
  }
  // Rangliste der plausibelsten Symbolfarben (der Nutzer kann durchschalten)
  // nur eindeutige Gruppen: der Großteil der Flecken dieser Farbe muss gleich aussehen (sonst sind es Flächen, Schrift o. Ä.)
  return ranked.filter(r => r.score > .05 && r.ratio >= .35).sort((a, b) => b.score - a.score).slice(0, 6).map(b => ({ col: b.col, hits: mergeClose(b.cons, Math.sqrt(b.med) * 1.4).map(c => ({ x: c.cx / wk.sc, y: c.cy / wk.sc, size: Math.max(c.bw, c.bh) / wk.sc })) }));
}

/* ---------- SVG ---------- */
function sanitizeSvg(text) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) throw new Error('Die SVG-Datei konnte nicht gelesen werden.');
  doc.querySelectorAll('script,foreignObject,iframe').forEach(e => e.remove());
  doc.querySelectorAll('*').forEach(e => { [...e.attributes].forEach(a => { if (/^on/i.test(a.name) || (/href$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) e.removeAttribute(a.name); }); });
  const num = v => { const m = /^\s*([\d.]+)\s*(px)?\s*$/.exec(v || ''); return m ? +m[1] : 0; };
  let w = num(root.getAttribute('width')), h = num(root.getAttribute('height'));
  const vb = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  if ((!w || !h) && vb.length === 4 && vb[2] > 0 && vb[3] > 0) { if (!w && !h) { w = vb[2]; h = vb[3]; } else if (!w) w = h * vb[2] / vb[3]; else h = w * vb[3] / vb[2]; }
  if (!w || !h) { w = 1600; h = 1200; }
  if (!root.getAttribute('viewBox')) root.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
  // Kleine Vektorkarten auf brauchbare Größe skalieren
  const k = Math.max(w, h) < 1600 ? 1600 / Math.max(w, h) : 1;
  w = Math.round(w * k); h = Math.round(h * k);
  root.setAttribute('width', w); root.setAttribute('height', h);
  return { text: new XMLSerializer().serializeToString(root), w, h };
}
const KW = /(cit(y|ies)|town|village|burg|st(a|ä|ae)dt|dorf|d(ö|oe)rfer|siedlung|settlement|capital|hauptstadt|castle|fort(ress)?|festung|hamlet|weiler|metropol)/i;
function typeFromLabel(s) {
  s = String(s || '').toLowerCase();
  if (/metropol/.test(s)) return 'Metropole';
  if (/capital|hauptstadt/.test(s)) return 'Großstadt';
  if (/castle|fort|festung/.test(s)) return 'Festung';
  if (/hamlet|weiler/.test(s)) return 'Weiler';
  if (/village|dorf|d(ö|oe)rfer/.test(s)) return 'Dorf';
  if (/town/.test(s)) return 'Kleinstadt';
  if (/cit(y|ies)|st(a|ä|ae)dt/.test(s)) return 'Stadt';
  return '';
}
const SHAPES = 'circle,ellipse,rect,path,use,image,polygon,g';
function svgCandidates(svgText, natW, natH) {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-200000px;top:0;visibility:hidden;pointer-events:none';
  document.body.appendChild(host);
  try {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const root = document.importNode(doc.documentElement, true); host.appendChild(root);
    const rr = root.getBoundingClientRect(); if (!rr.width) return [];
    const sx = natW / rr.width, sy = natH / rr.height;
    const box = el => { const r = el.getBoundingClientRect(); return { x: (r.left - rr.left) * sx, y: (r.top - rr.top) * sy, w: r.width * sx, h: r.height * sy }; };
    const lim = Math.max(natW, natH) * .035;
    const small = b => b.w > 0 && b.h > 0 && b.w <= lim && b.h <= lim;
    const hidden = el => !!el.closest('defs,symbol,clipPath,mask,pattern,marker,title,desc');
    const lbl = el => [el.id, el.getAttribute('class'), el.getAttribute('inkscape:label'), el.getAttribute('data-name'), el.getAttribute('data-type')].filter(Boolean).join(' ');
    const cands = [];
    const add = (el, type, name) => { const b = box(el); if (!small(b)) return false; cands.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, size: Math.max(b.w, b.h), type: type || '', name: name || '', el }); return true; };
    // 1) Azgaar Fantasy Map Generator
    const azg = root.querySelector('#burgIcons');
    if (azg) {
      azg.querySelectorAll('circle,use,image,rect,path,polygon').forEach(el => {
        if (hidden(el)) return;
        const g = el.closest('g'); const t = typeFromLabel(g && g.id) || '';
        const m = /(\d+)$/.exec(el.id || el.getAttribute('data-id') || '');
        let name = '';
        if (m) { const l = root.querySelector('#burgLabel' + m[1]) || root.querySelector('#burgLabels [data-id="' + m[1] + '"]'); if (l) name = l.textContent.trim(); }
        add(el, t, name);
      });
    }
    // 2) Ebenen/Elemente mit passenden Namen
    if (!cands.length) {
      const done = new Set();
      root.querySelectorAll('*').forEach(el => {
        if (el === root || hidden(el) || /^(text|tspan|textPath)$/i.test(el.tagName)) return;
        const L = lbl(el); if (!KW.test(L)) return;
        if ([...done].some(d => d.contains(el))) return;
        const t = typeFromLabel(L);
        if (add(el, t)) { done.add(el); return; }
        if (el.tagName.toLowerCase() !== 'g') return;
        done.add(el);
        [...el.children].forEach(ch => { if (ch.matches(SHAPES) && !/^(text)$/i.test(ch.tagName)) add(ch, typeFromLabel(lbl(ch)) || t); });
      });
    }
    // 3) Rückfallebene: viele gleich große kleine Kreise
    if (!cands.length) {
      const groups = new Map();
      root.querySelectorAll('circle,use').forEach(el => { if (hidden(el)) return; const b = box(el); if (!small(b) || b.w < 2) return; const k = Math.round(b.w) + '|' + (el.getAttribute('fill') || getComputedStyle(el).fill) + '|' + (el.getAttribute('href') || el.getAttribute('xlink:href') || ''); (groups.get(k) || groups.set(k, []).get(k)).push(el); });
      [...groups.values()].filter(g => g.length >= 3 && g.length <= 800).forEach(g => g.forEach(el => add(el, '')));
    }
    // doppelte entfernen
    const out = []; cands.forEach(c => { if (!out.some(o => Math.hypot(o.x - c.x, o.y - c.y) < Math.max(3, c.size * .4))) out.push(c); });
    // Namen aus nahen Textelementen
    const texts = [];
    root.querySelectorAll('text').forEach(t => { if (hidden(t)) return; const s = t.textContent.replace(/\s+/g, ' ').trim(); if (!s || s.length > 40) return; const b = box(t); if (!b.w || b.h > natH * .05) return; texts.push({ s, x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w, h: b.h, used: false }); });
    const pairs = [];
    out.forEach((c, ci) => { if (c.name) return; const R = Math.max(natW * .025, c.size * 6); texts.forEach((t, ti) => { const dx = Math.max(0, Math.abs(t.x - c.x) - t.w / 2), dy = Math.max(0, Math.abs(t.y - c.y) - t.h / 2); const dd = Math.hypot(dx, dy); if (dd <= R) pairs.push([dd, ci, ti]); }); });
    pairs.sort((a, b) => a[0] - b[0]);
    pairs.forEach(([, ci, ti]) => { if (out[ci].name || texts[ti].used) return; out[ci].name = texts[ti].s; texts[ti].used = true; });
    // Art aus Symbolgröße ableiten, wenn nichts bekannt ist
    const sz = out.map(c => c.size).sort((a, b) => a - b);
    if (sz.length >= 6 && sz[sz.length - 1] > sz[0] * 1.5) {
      const q = v => sz.filter(s => s <= v).length / sz.length;
      out.forEach(c => { if (c.type) return; const p = q(c.size); c.type = p > .92 ? 'Großstadt' : p > .7 ? 'Stadt' : p > .35 ? 'Kleinstadt' : 'Dorf'; });
    }
    return out.map(c => ({ x: c.x, y: c.y, size: c.size, type: c.type, name: c.name }));
  } finally { host.remove(); }
}

W.AT_DETECT = { makeWork, pickExample, findSimilar, autoDetect, sanitizeSvg, svgCandidates };
})(window);
