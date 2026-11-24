/* ---------- Beschriftungen ---------- */
/* Textbreite messen und Text so umbrechen, dass er nicht über den Kartenrand ragt */
const _mc = document.createElement('canvas').getContext('2d');
function measureW(t, font, sp) { _mc.font = font; return _mc.measureText(t).width + Math.max(0, t.length - 1) * (sp || 0); }
function wrapToWidth(text, font, maxW, sp) {
  const out = [];
  String(text || '').split('\n').forEach(par => {
    if (measureW(par, font, sp) <= maxW) { out.push(par); return; }
    let cur = '';
    par.split(/(?<=[\s-])/).forEach(w => { const t = cur + w; if (!cur || measureW(t.trimEnd(), font, sp) <= maxW) cur = t; else { out.push(cur.trimEnd()); cur = w.trimStart(); } });
    if (cur) out.push(cur.trimEnd());
  });
  return out;
}
const maxLineW = (lines, font, sp) => Math.max(0, ...lines.map(t => measureW(t, font, sp)));
/* Ortsname neben dem Symbol: rechts, bei Platzmangel mehrzeilig, notfalls links */
function nameLayout(name, font, avR, avL, unit) {
  if (measureW(name, font) <= avR) return { lines: [name], side: 'r' };
  // passt jedes Wort rechts hin, wird der Name dort mehrzeilig
  const longest = maxLineW(String(name).split(/(?<=[\s-])/).map(w => w.trim()), font);
  if (longest <= avR || avR >= avL) return { lines: wrapToWidth(name, font, Math.max(avR, longest)), side: 'r' };
  // sonst links vom Symbol, ebenfalls kompakt mehrzeilig
  return { lines: wrapToWidth(name, font, Math.max(longest, Math.min(avL, 130 * (unit || 1)))), side: 'l' };
}
/* Ortsnamen ohne Überschneidung platzieren.
   o: { k: Maßstab Karte→Zeichenfläche, u: Grundeinheit, font, lh: Zeilenhöhe, ro(c): Markerradius }
   Ergebnis je Ort: { lines, anchor, tx, ys } relativ zum Ort, oder hidden:true wenn nirgends Platz ist. */
const TYPE_RANK = { Metropole: 8, 'Großstadt': 7, Stadt: 6, Festung: 5, Kleinstadt: 4, Ortschaft: 3, Dorf: 2, Weiler: 1 };
function layoutNames(o) {
  const k = o.k, u = o.u, font = o.font, lh = o.lh, W = S.map.w * k, H = S.map.h * k, gap = 8 * u, pad = 2 * u, res = {};
  const boxes = [];
  S.cities.forEach(c => { const r = o.ro(c), X = c.x * k, Y = c.y * k; boxes.push({ x0: X - r, y0: Y - r, x1: X + r, y1: Y + r, own: c.id }); });
  S.labels.forEach(l => {
    try {
      const ll = labelLines(l), f = labelFont(l), sp = l.spacing / 100 * l.size, w = maxLineW(ll.lines, f, sp), h = ll.lines.length * l.size * 1.2;
      const a = (+l.rot || 0) * Math.PI / 180, cw = Math.abs(Math.cos(a)), sw = Math.abs(Math.sin(a)), bw = (w * cw + h * sw) / 2 * k, bh = (w * sw + h * cw) / 2 * k, X = (l.x + ll.dx) * k, Y = l.y * k;
      boxes.push({ x0: X - bw, y0: Y - bh, x1: X + bw, y1: Y + bh });
    } catch (e) { }
  });
  const hits = (b, own) => { let a = 0; for (const q of boxes) { if (q.own === own) continue; const ox = Math.min(b.x1, q.x1) - Math.max(b.x0, q.x0), oy = Math.min(b.y1, q.y1) - Math.max(b.y0, q.y0); if (ox > 0 && oy > 0) a += ox * oy; } return a; };
  const order = S.cities.filter(c => c.name).sort((a, b) => (b.id === S.sel) - (a.id === S.sel) || (TYPE_RANK[b.type] || 0) - (TYPE_RANK[a.type] || 0) || a.y - b.y);
  order.forEach(c => {
    const X = c.x * k, Y = c.y * k, r = o.ro(c), off = r + gap, d = r * .72 + 3 * u;
    const words = String(c.name).split(/(?<=[\s-])/).map(w => w.trim()).filter(Boolean), longest = maxLineW(words, font), w1 = measureW(c.name, font);
    const vars = [[c.name]], add = ls => { if (!vars.some(v => v.join('|') === ls.join('|'))) vars.push(ls); };
    add(wrapToWidth(c.name, font, Math.max(longest, w1 * .55)));
    add(wrapToWidth(c.name, font, Math.max(longest, W - X - off - pad)));
    add(wrapToWidth(c.name, font, Math.max(longest, X - off - pad)));
    add(wrapToWidth(c.name, font, longest));
    let best = null;
    for (const lines of vars) {
      const w = maxLineW(lines, font), h = lines.length * lh;
      const pos = [
        ['start', X + off, Y - h / 2], ['end', X - off, Y - h / 2], ['middle', X, Y - r - 4 * u - h], ['middle', X, Y + r + 4 * u],
        ['start', X + d, Y - d - h], ['start', X + d, Y + d], ['end', X - d, Y - d - h], ['end', X - d, Y + d]
      ];
      for (const [an, tx, y0] of pos) {
        const x0 = an === 'start' ? tx : an === 'end' ? tx - w : tx - w / 2, b = { x0: x0 - pad, y0: y0 - pad, x1: x0 + w + pad, y1: y0 + h + pad };
        const out = Math.max(0, -b.x0) + Math.max(0, b.x1 - W) + Math.max(0, -b.y0) + Math.max(0, b.y1 - H);
        const cost = hits(b, c.id) + out * h * 50;
        if (!best || cost < best.cost) best = { cost, lines, an, tx, y0, b };
        if (cost === 0) break;
      }
      if (best.cost === 0) break;
    }
    if (best.cost > 0 && !o.forceAll) { res[c.id] = { hidden: true }; return; }
    boxes.push(best.b);
    res[c.id] = { lines: best.lines, anchor: best.an, tx: best.tx - X, ys: best.lines.map((t, i) => best.y0 + lh * (i + .5) - Y) };
  });
  return res;
}
/* Beschriftung: verfügbare Breite bis zum Kartenrand (zentrierter Text, Drehung berücksichtigt) */
function labelFont(l) { return (l.italic ? 'italic ' : '') + (l.bold ? 'bold ' : '') + l.size + 'px ' + famCss(l.font); }
function labelLines(l) {
  const sp = l.spacing / 100 * l.size, pad = Math.max(2, l.size * .15);
  const half = Math.min(l.x, S.map.w - l.x) - pad, k = Math.max(Math.abs(Math.cos((+l.rot || 0) * Math.PI / 180)), .3);
  const maxW = Math.max(l.size * 2, 2 * half / k);
  const lines = wrapToWidth(l.text, labelFont(l), maxW, sp);
  // ein einzelnes Wort, das breiter als der Platz ist: Beschriftung so weit nach innen rücken, dass sie auf der Karte bleibt
  const lw = maxLineW(lines, labelFont(l), sp) * k / 2 + pad; let dx = 0;
  if (l.x - lw < 0) dx = lw - l.x; else if (l.x + lw > S.map.w) dx = S.map.w - lw - l.x;
  if (lw * 2 > S.map.w) dx = S.map.w / 2 - l.x;
  return { lines, dx, wrapped: lines.length > String(l.text || '').split('\n').length || Math.abs(dx) > .5 };
}
const FONT_LIST = [
  ['EB Title', 'Fantasy-Titel'], ['EB Kicker', 'Fantasy-Versalien'], ['EB Body', 'Buchschrift'],
  ['Georgia'], ['Palatino Linotype'], ['Book Antiqua'], ['Garamond'], ['Times New Roman'], ['Constantia'], ['Cambria'],
  ['Monotype Corsiva'], ['Lucida Calligraphy'], ['Lucida Handwriting'], ['Old English Text MT'], ['Segoe Script'], ['Gabriola'], ['Papyrus'], ['Blackadder ITC'], ['Harrington'], ['Viner Hand ITC'],
  ['Segoe UI'], ['Arial'], ['Trebuchet MS'], ['Verdana'], ['Courier New'], ['Impact']
];
const EMBED = ['EB Title', 'EB Kicker', 'EB Body'];
let fontAvail = null;
function fontInstalled(f) {
  const c = fontInstalled.c || (fontInstalled.c = document.createElement('canvas').getContext('2d')); const t = 'mmmmmmmmmwwwwwlliIIO0@#';
  return ['monospace', 'serif', 'sans-serif'].some(b => { c.font = '40px ' + b; const w0 = c.measureText(t).width; c.font = '40px "' + f + '",' + b; return c.measureText(t).width !== w0; });
}
function fontOptions(cur) {
  if (!fontAvail) fontAvail = FONT_LIST.filter(f => EMBED.includes(f[0]) || fontInstalled(f[0]));
  const list = fontAvail.concat(S.fonts.map(f => [f.name, 'eigene Schrift']));
  if (cur && !list.some(f => f[0] === cur)) list.push([cur, 'nicht verfügbar']);
  return list.map(f => '<option value="' + esc(f[0]) + '"' + (f[0] === cur ? ' selected' : '') + ' style="font-family:\'' + esc(f[0]) + '\'">' + esc(f[0]) + (f[1] ? ' – ' + esc(f[1]) : '') + '</option>').join('');
}
async function registerFont(f) { try { const ff = new FontFace(f.name, 'url(' + f.data + ')'); await ff.load(); document.fonts.add(ff); } catch (e) { console.warn('Schrift', f.name, e); } }
async function addFontFile(file) {
  const data = await readAs(file, 'readAsDataURL'); let name = baseName(file.name).replace(/[-_]+/g, ' ').trim() || 'Eigene Schrift';
  if (S.fonts.some(f => f.name === name)) name += ' ' + (S.fonts.length + 1);
  const f = { name, data }; await registerFont(f); S.fonts.push(f);
  const l = selL(); if (l) { pushUndo(); l.font = name; S.lstyle.font = name; }
  refresh(); toast('Schrift „' + name + '“ geladen.');
}
const defStyle = () => ({ font: 'EB Title', size: Math.max(12, Math.round(Math.max(S.map.w, S.map.h) / 70)), color: '#3b2416', bold: false, italic: false, rot: 0, spacing: 0, outline: true, ocolor: '#f6ecd2', ow: 12, opacity: 100 });
const selL = () => S.labels.find(l => l.id === S.selL);
function newLabel(x, y, text, o) { return Object.assign({ id: 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), x, y, text }, S.lstyle || defStyle(), o || {}); }
const famCss = f => '"' + String(f).replace(/"/g, '') + '", Georgia, serif';
function renderLabels() {
  const g = $('#lsvg'); if (!g) return;
  g.innerHTML = S.labels.map(l => {
    const ll = labelLines(l), lines = ll.lines, lx = l.x + ll.dx, lh = l.size * 1.2, y0 = l.y - (lines.length - 1) * lh / 2;
    const st = 'font-family:' + esc(famCss(l.font)) + ';font-size:' + l.size + 'px;font-weight:' + (l.bold ? 700 : 400) + ';font-style:' + (l.italic ? 'italic' : 'normal') + ';letter-spacing:' + (l.spacing / 100 * l.size) + 'px';
    const paint = 'fill="' + esc(l.color) + '"' + (l.outline ? ' stroke="' + esc(l.ocolor) + '" stroke-width="' + (l.size * l.ow / 100) + '" stroke-linejoin="round" paint-order="stroke"' : '');
    return '<g class="lb' + (l.id === S.selL ? ' lbsel' : '') + '" data-l="' + l.id + '" transform="rotate(' + (+l.rot || 0) + ' ' + lx + ' ' + l.y + ')" opacity="' + ((+l.opacity || 100) / 100) + '">' +
      lines.map((t, i) => '<text x="' + lx + '" y="' + (y0 + i * lh) + '" text-anchor="middle" dominant-baseline="central" style="' + st + '" ' + paint + '>' + (esc(t) || ' ') + '</text>').join('') + '</g>';
  }).join('');
  const s = g.querySelector('.lbsel');
  if (s) { try { const b = s.getBBox(), p = Math.max(3, 4 / S.v.s); const r = document.createElementNS(NS, 'rect'); r.setAttribute('x', b.x - p); r.setAttribute('y', b.y - p); r.setAttribute('width', b.width + 2 * p); r.setAttribute('height', b.height + 2 * p); r.setAttribute('class', 'lbbox'); r.setAttribute('stroke-width', 2 / S.v.s); r.setAttribute('stroke-dasharray', (6 / S.v.s) + ' ' + (4 / S.v.s)); s.insertBefore(r, s.firstChild); } catch (e) { } }
}
function renderLabelsAndNames() { renderLabels(); if (S.names && S.cities.length) renderMarkers(); }
function selectLabel(id) { S.selL = id; S.sel = null; if (S.mode === 'text') S.mode = 'text'; S.ltab = 'labels'; refresh(); }
function addLabelAt(x, y, text) {
  pushUndo(); const l = newLabel(x, y, text || 'Beschriftung'); S.labels.push(l); S.selL = l.id; S.sel = null; S.ltab = 'labels'; refresh();
  setTimeout(() => { const t = $('#panel textarea[data-l="text"]'); if (t) { t.focus(); t.select(); } }, 30);
}
const chk = (k, v, t) => '<label style="display:inline-flex;gap:.3em;align-items:center;font-family:var(--fB);letter-spacing:0;text-transform:none;color:var(--ink);font-size:.95em"><input type="checkbox" data-l="' + k + '"' + (v ? ' checked' : '') + '>' + t + '</label>';
function rng(k, v, min, max, step, unit, lbl) { return '<div class="fld"><label>' + lbl + ' <span style="display:flex;gap:.3em;align-items:center"><input type="number" data-l="' + k + '" value="' + v + '" min="' + min + '" max="' + max + '" step="' + (step || 1) + '" style="width:5em">' + (unit || '') + '</span></label><input type="range" data-l="' + k + '" value="' + v + '" min="' + min + '" max="' + max + '" step="' + (step || 1) + '" style="width:100%"></div>'; }
function renderLabelPanel(p, l) {
  const maxS = Math.max(60, Math.round(Math.max(S.map.w, S.map.h) / 5));
  p.innerHTML = '<div style="display:flex;align-items:center;gap:.4em"><div class="kicker" style="flex:1">Beschriftung</div><button class="btn sm" data-a="lcenter" title="Auf der Karte zeigen">🎯</button><button class="btn sm" data-a="close" title="Schließen (Esc)">✕</button></div>' +
    '<div class="fld"><label>Text</label><textarea data-l="text" rows="2" style="font-family:' + esc(famCss(l.font)) + ';font-size:1.2em">' + esc(l.text) + '</textarea><div class="tiny muted" id="wrapHint">' + wrapHint(l) + '</div></div>' +
    '<div class="fld"><label>Schriftart <button class="btn sm" data-a="fontFile" title="Eigene Schriftdatei laden (TTF, OTF, WOFF)">＋ Schrift laden</button></label><select data-l="font" style="width:100%;font-family:' + esc(famCss(l.font)) + ';font-size:1.1em">' + fontOptions(l.font) + '</select></div>' +
    rng('size', l.size, 4, maxS, 1, 'px', 'Schriftgröße') +
    '<div class="fld"><label>Stil</label><div style="display:flex;gap:1em;flex-wrap:wrap;align-items:center">' + chk('bold', l.bold, '<b>Fett</b>') + chk('italic', l.italic, '<i>Kursiv</i>') + '<label style="display:inline-flex;gap:.3em;align-items:center;font-family:var(--fB);letter-spacing:0;text-transform:none;color:var(--ink);font-size:.95em">Farbe <input type="color" data-l="color" value="' + esc(l.color) + '"></label></div>' +
    '<div class="seg" style="margin-top:.35em">' + ['#3b2416', '#000000', '#6e1a1a', '#1f3b6e', '#2e5a2e', '#b8902f', '#ffffff'].map(c => '<button data-a="lcol" data-v="' + c + '" title="' + c + '" style="width:1.8em;height:1.5em;background:' + c + (l.color === c ? ';box-shadow:0 0 0 2px var(--bur)' : '') + '"></button>').join('') + '</div></div>' +
    '<div class="fld"><label>Kontur ' + chk('outline', l.outline, 'anzeigen') + '</label>' + (l.outline ? '<div style="display:flex;gap:.6em;align-items:center"><input type="color" data-l="ocolor" value="' + esc(l.ocolor) + '"><input type="range" data-l="ow" min="2" max="40" value="' + l.ow + '" style="flex:1" title="Konturstärke"><span class="small">' + l.ow + ' %</span></div>' : '') + '</div>' +
    rng('rot', l.rot, -180, 180, 1, '°', 'Drehung') + rng('spacing', l.spacing, -10, 100, 1, '%', 'Zeichenabstand') + rng('opacity', l.opacity, 10, 100, 1, '%', 'Deckkraft') +
    '<div class="pfoot"><button class="btn sm" data-a="lstd" title="Diese Schrift und Größe für neue Beschriftungen verwenden">⭐ Als Standard</button><button class="btn sm" data-a="ldup">⧉ Duplizieren</button><span class="sp"></span><button class="btn sm" data-a="ldel" style="color:var(--fail)" title="Löschen (Entf)">🗑️ Löschen</button></div>' +
    '<p class="tiny muted">Verschieben: Beschriftung auf der Karte ziehen. „🖼️ Bild“ speichert die Karte mit allen Beschriftungen als PNG oder JPG.</p>';
}
const wrapHint = l => labelLines(l).wrapped ? '↩️ Wird automatisch mehrzeilig, weil der Text sonst über den Kartenrand ragt.' : 'Zeilenumbruch mit Enter. Ragt der Text über den Kartenrand, wird er automatisch umbrochen.';
function onLabelInput(t) {
  const l = selL(); if (!l) return; const k = t.dataset.l;
  let v = t.type === 'checkbox' ? t.checked : t.value;
  if (['size', 'rot', 'spacing', 'opacity', 'ow'].includes(k)) { v = +v; if (isNaN(v)) return; document.querySelectorAll('#panel [data-l="' + k + '"]').forEach(x => { if (x !== t) x.value = v; }); if (k === 'ow') { const s = t.parentElement.querySelector('span'); if (s) s.textContent = v + ' %'; } }
  l[k] = v; if (k !== 'text') S.lstyle = pickStyle(l);
  renderLabelsAndNames(); persist(); { const h = $('#wrapHint'); if (h) h.textContent = wrapHint(l); }
  if (k === 'font' || k === 'outline' || k === 'bold' || k === 'italic' || k === 'color') renderPanel();
  renderList();
}
const pickStyle = l => ({ font: l.font, size: l.size, color: l.color, bold: l.bold, italic: l.italic, rot: 0, spacing: l.spacing, outline: l.outline, ocolor: l.ocolor, ow: l.ow, opacity: l.opacity });

/* Bild mit Beschriftungen exportieren */
function exportDialog() {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = '<div class="dlg" style="max-width:440px"><h2>🖼️ Karte als Bild speichern</h2><p class="small">Die Karte wird in Originalgröße (' + S.map.w + ' × ' + S.map.h + ' px) mit allen Beschriftungen gespeichert.</p>' +
    '<p><label><input type="checkbox" id="exMk"> Ortsmarker (wie gerade eingestellt) und Ortsnamen mit einzeichnen</label></p><div class="foot"><button class="btn" data-x="cancel">Abbrechen</button><button class="btn" data-x="jpg">JPG</button><button class="btn primary" data-x="png">PNG</button></div></div>';
  m.onclick = e => { const b = e.target.closest('[data-x]'); if (e.target === m || (b && b.dataset.x === 'cancel')) { m.remove(); return; } if (b) { const mk = $('#exMk').checked; m.remove(); exportImage(b.dataset.x, mk); } };
  document.body.appendChild(m);
}
async function exportImage(fmt, withMk) {
  await document.fonts.ready;
  await busy('Erzeuge Bild …', () => new Promise(res => {
    const Wd = S.map.w, Hd = S.map.h, k = Math.min(1, 16000 / Math.max(Wd, Hd), Math.sqrt(150e6 / (Wd * Hd)));
    const cv = document.createElement('canvas'); cv.width = Math.round(Wd * k); cv.height = Math.round(Hd * k);
    const g = cv.getContext('2d'); g.scale(k, k);
    if (fmt === 'jpg') { g.fillStyle = '#ffffff'; g.fillRect(0, 0, Wd, Hd); }
    g.drawImage(S.img, 0, 0, Wd, Hd);
    if (withMk) {
      const u = Math.max(1, Math.max(Wd, Hd) / 1500);
      S.cities.forEach(c => {
        let r = (D.R_SIZE[c.type] || 6) * u;
        if (S.mk === 'ring') r = Math.max(r, (c.sym || 0) / 2 + 3 * u);
        if (S.mk !== 'none') {
          g.beginPath(); if (c.type === 'Festung') g.rect(c.x - r, c.y - r, 2 * r, 2 * r); else g.arc(c.x, c.y, r, 0, Math.PI * 2);
          if (S.mk === 'dot') { g.fillStyle = D.W_COL[c.wealth]; g.strokeStyle = '#2b1a0e'; g.lineWidth = 1.6 * u; g.fill(); g.stroke(); }
          else { g.strokeStyle = '#fff6d8'; g.lineWidth = 4.5 * u; g.stroke(); g.strokeStyle = D.W_COL[c.wealth]; g.lineWidth = 2.5 * u; g.stroke(); }
        } else r = Math.max(r, (c.sym || 0) / 2 + 3 * u);
      });
      if (S.names) {
        const fnt = 'bold ' + (13 * u) + 'px "EB Body", Georgia, serif';
        const NL = layoutNames({ k: 1, u, font: fnt, lh: 15 * u, ro: c => { const r = (D.R_SIZE[c.type] || 6) * u; return S.mk === 'dot' ? r : Math.max(r, (c.sym || 0) / 2 + 3 * u); } });
        g.font = fnt; g.textBaseline = 'middle'; g.lineWidth = 3.4 * u; g.strokeStyle = '#fff6dc'; g.lineJoin = 'round'; g.fillStyle = '#2b1a0e';
        let hid = 0;
        S.cities.forEach(c => { const L = NL[c.id]; if (!L) return; if (L.hidden) { hid++; return; } g.textAlign = L.anchor === 'start' ? 'left' : L.anchor === 'end' ? 'right' : 'center'; L.lines.forEach((t, i) => { g.strokeText(t, c.x + L.tx, c.y + L.ys[i]); g.fillText(t, c.x + L.tx, c.y + L.ys[i]); }); });
        if (hid) setTimeout(() => toast(hid + (hid === 1 ? ' Ortsname wurde' : ' Ortsnamen wurden') + ' weggelassen, weil kein freier Platz war.'), 300);
      }
    }
    S.labels.forEach(l => {
      g.save(); g.globalAlpha = (+l.opacity || 100) / 100; g.translate(l.x + labelLines(l).dx, l.y); g.rotate((+l.rot || 0) * Math.PI / 180);
      g.font = (l.italic ? 'italic ' : '') + (l.bold ? 'bold ' : '') + l.size + 'px ' + famCss(l.font);
      try { g.letterSpacing = (l.spacing / 100 * l.size) + 'px'; } catch (e) { }
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      const ll = labelLines(l), lines = ll.lines, lh = l.size * 1.2, y0 = -(lines.length - 1) * lh / 2;
      lines.forEach((t, i) => { if (l.outline) { g.lineWidth = l.size * l.ow / 100; g.strokeStyle = l.ocolor; g.strokeText(t, 0, y0 + i * lh); } g.fillStyle = l.color; g.fillText(t, 0, y0 + i * lh); });
      g.restore();
    });
    try {
      cv.toBlob(b => { if (b) download(baseName(S.map.name) + '_beschriftet.' + fmt, b); else toast('Das Bild ist zu groß zum Speichern.'); res(); }, fmt === 'jpg' ? 'image/jpeg' : 'image/png', .93);
    } catch (e) { toast('Bild konnte nicht erzeugt werden: ' + e.message); res(); }
  }));
}
