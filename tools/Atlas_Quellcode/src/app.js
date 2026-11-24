/* DND5e Atlas – Oberfläche */
(function (W) {
'use strict';
const D = W.AT_DATA, X = W.AT_DETECT;
const $ = (s, r) => (r || document).querySelector(s);
const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NS = 'http://www.w3.org/2000/svg';
/*ORN*/
const MK_LBL = { dot: '📍 Symbol: Punkt', ring: '⭕ Symbol: Ring', none: '👻 Symbol: aus' };
const DEF_DENS = { Weiler: 'niedrig', Dorf: 'niedrig', Ortschaft: 'mittel', Kleinstadt: 'mittel', Stadt: 'hoch', 'Großstadt': 'hoch', Metropole: 'sehr hoch', Festung: 'mittel' };

const S = W.AT_S = { map: null, cities: [], sel: null, mode: 'select', v: { s: 1, tx: 0, ty: 0 }, names: true, q: '', tf: '', undo: [], labels: [], fonts: [], selL: null, lstyle: null, mk: 'dot', ltab: 'cities', det: null, prev: [], work: null, workAuto: null, img: null };
const app = () => $('#app');

/* ---------- Speicher (IndexedDB) ---------- */
const DB = {
  open() { return new Promise((res, rej) => { try { const r = indexedDB.open('dnd5e-atlas', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }); },
  async get(k) { try { const db = await DB.open(); return await new Promise(res => { const t = db.transaction('kv').objectStore('kv').get(k); t.onsuccess = () => res(t.result); t.onerror = () => res(undefined); }); } catch (e) { return undefined; } },
  async set(k, v) { try { const db = await DB.open(); await new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; tx.onerror = res; }); } catch (e) { } }
};
let saveT = null;
function persist() { clearTimeout(saveT); saveT = setTimeout(() => { if (S.map) DB.set('state', { mapId: S.map.id, cities: S.cities, labels: S.labels, fonts: S.fonts, lstyle: S.lstyle, names: S.names, mk: S.mk, v: S.v }); }, 500); }
function persistMap() { if (S.map) DB.set('map', S.map); }

/* ---------- Hilfen ---------- */
function toast(msg) { let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); } t.textContent = msg; clearTimeout(toast.t); toast.t = setTimeout(() => t.remove(), 2800); }
function busy(msg, fn) { const b = document.createElement('div'); b.className = 'busy'; b.innerHTML = '<div>' + esc(msg) + '</div>'; document.body.appendChild(b); return new Promise(res => setTimeout(() => { let r; try { r = fn(); } catch (e) { console.error(e); toast('Fehler: ' + e.message); } Promise.resolve(r).catch(e => { console.error(e); toast('Fehler: ' + e.message); }).finally(() => { b.remove(); res(r); }); }, 40)); }
const CMAPS = {};
function pushUndo() { S.cities.forEach(c => { if (c.cmap) CMAPS[c.id] = c.cmap; }); S.undo.push(JSON.stringify({ c: S.cities, l: S.labels }, (k, v) => k === 'cmap' ? undefined : v)); if (S.undo.length > 60) S.undo.shift(); }
function undo() { const s = S.undo.pop(); if (!s) { toast('Nichts zum Rückgängigmachen.'); return; } const u = JSON.parse(s); S.cities.forEach(c => { if (c.cmap) CMAPS[c.id] = c.cmap; }); S.cities = u.c; S.cities.forEach(c => { if (CMAPS[c.id]) c.cmap = CMAPS[c.id]; }); S.labels = u.l; if (S.sel && !cityById(S.sel)) S.sel = null; if (S.selL && !selL()) S.selL = null; refresh(); toast('Rückgängig gemacht.'); }
const cityById = id => S.cities.find(c => c.id === id);
const sel = () => cityById(S.sel);
function nextName() { let n = 0; S.cities.forEach(c => { const m = /^Ort (\d+)$/.exec(c.name); if (m) n = Math.max(n, +m[1]); }); return 'Ort ' + (n + 1); }
function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
const baseName = n => String(n || 'Karte').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '_');
const fmtN = n => (+n || 0).toLocaleString('de-DE');

/* ---------- Startbildschirm ---------- */
async function renderHome() {
  document.body.className = 'home'; S.det = null; S.prev = [];
  app().innerHTML = corners() + '<div class="welcome">' + orn + D20 + '<div class="kicker" style="margin-top:.5em">The Ultimate</div><h1>DND5e Atlas</h1>' + orn +
    '<p class="sub">Lade deine Weltkarte, lass die Städte erkennen und gib jedem Ort Völker, Größe, Reichtum, Unterkünfte, Gasthäuser und Geschäfte.</p><p class="sub" style="margin-top:0">Deine Welt wartet darauf, bewohnt zu werden.</p>' +
    '<div class="drop" id="drop">🗺️ Karte hierher ziehen oder klicken<br><span class="small">JPG, PNG, WEBP, GIF, BMP oder SVG · auch gespeicherte Atlas-Projekte (.json)</span></div>' +
    '<div id="resume"></div>' +
    '<div class="grid2"><button class="btn primary" data-a="open-map">🗺️ Karte laden</button><button class="btn" data-a="open-proj">📂 Projekt öffnen</button></div>' +
    '<p class="small muted" style="max-width:560px;margin:1.5em auto 0">Alles bleibt auf deinem Rechner. Die zuletzt bearbeitete Karte wird im Browser zwischengespeichert; mit „💾 Speichern“ sicherst du dein Projekt als Datei.</p></div>' +
    '<input type="file" id="fMap" accept="image/*,.svg,.json" class="hidden"><input type="file" id="fProj" accept=".json,application/json" class="hidden">';
  const dr = $('#drop');
  dr.onclick = () => $('#fMap').click();
  dr.ondragover = e => { e.preventDefault(); dr.classList.add('over'); };
  dr.ondragleave = () => dr.classList.remove('over');
  dr.ondrop = e => { e.preventDefault(); dr.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) openFile(f); };
  const [m, st] = await Promise.all([DB.get('map'), DB.get('state')]);
  if (m && st && st.mapId === m.id && $('#resume')) {
    const src = m.kind === 'svg' ? URL.createObjectURL(new Blob([m.src], { type: 'image/svg+xml' })) : m.src;
    $('#resume').innerHTML = '<div class="resume"><img src="' + src + '" alt=""><div style="flex:1"><b>' + esc(m.name) + '</b><div class="small muted">' + st.cities.length + ' Orte · zuletzt bearbeitet</div></div><button class="btn primary" data-a="resume">↻ Fortsetzen</button></div>';
    S._resume = { m, st };
  }
}

/* ---------- Dateien ---------- */
const readAs = (f, how) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r[how](f); });
async function openFile(f) {
  try {
    if (/\.json$/i.test(f.name) || f.type === 'application/json') return loadProject(JSON.parse(await readAs(f, 'readAsText')));
    if (/\.svg$/i.test(f.name) || f.type === 'image/svg+xml') {
      const s = X.sanitizeSvg(await readAs(f, 'readAsText'));
      return startMap({ id: 'm' + Date.now(), name: f.name, kind: 'svg', src: s.text, w: s.w, h: s.h }, [], true);
    }
    if (!/^image\//.test(f.type) && !/\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(f.name)) { toast('Dieses Dateiformat wird nicht unterstützt.'); return; }
    const url = await readAs(f, 'readAsDataURL');
    const im = await loadImg(url);
    startMap({ id: 'm' + Date.now(), name: f.name, kind: 'raster', src: url, w: im.naturalWidth, h: im.naturalHeight }, [], true);
  } catch (e) { console.error(e); toast('Die Datei konnte nicht geöffnet werden: ' + e.message); }
}
const loadImg = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Bild nicht lesbar')); im.src = src; });
function loadProject(p) {
  if (!p || !p.map || !p.map.src) { toast('Das ist keine Atlas-Projektdatei.'); return; }
  startMap(Object.assign({ id: 'm' + Date.now() }, p.map), (p.cities || []).map(upgradeCity), false, { labels: p.labels, fonts: p.fonts, lstyle: p.lstyle });
  toast('Projekt geladen: ' + (p.cities || []).length + ' Orte');
}
function upgradeCity(c) { return Object.assign({ races: [], notes: '', pop: 0, lodging: 0, restaurants: 0, shops: 0, type: 'Ortschaft', density: 'mittel', wealth: 'normal', name: '' }, c); }
function saveProject() {
  if (!S.map) return;
  const p = { app: 'The Ultimate DND5e Atlas', version: 1, savedAt: new Date().toISOString(), map: { name: S.map.name, kind: S.map.kind, w: S.map.w, h: S.map.h, src: S.map.src }, cities: S.cities, labels: S.labels, fonts: S.fonts, lstyle: S.lstyle };
  download(baseName(S.map.name) + '_Atlas.json', new Blob([JSON.stringify(p)], { type: 'application/json' }));
  toast('Projekt gespeichert.');
}
function exportCsv() {
  const q = v => '"' + String(v === undefined || v === null ? '' : v).replace(/"/g, '""') + '"';
  const rows = [['Name', 'Art', 'Bevölkerungsdichte', 'Reichtum', 'Einwohner (ca.)', 'Völker', 'Unterkünfte', 'Restaurants', 'Geschäfte', 'Notizen', 'X', 'Y']];
  sorted(S.cities).forEach(c => rows.push([c.name, c.type, c.density, c.wealth, c.pop, c.races.filter(r => r.n).map(r => r.n + ' ' + r.p + ' %').join(', '), c.lodging, c.restaurants, c.shops, c.notes, Math.round(c.x), Math.round(c.y)]));
  download(baseName(S.map.name) + '_Orte.csv', new Blob(['﻿' + rows.map(r => r.map(q).join(';')).join('\r\n')], { type: 'text/csv' }));
}

/* ---------- Arbeitsansicht ---------- */
async function startMap(map, cities, fresh, ex) {
  ex = ex || {}; S.labels = ex.labels || []; S.fonts = ex.fonts || []; S.lstyle = ex.lstyle || null; S.selL = null; S.ltab = 'cities';
  await Promise.all(S.fonts.map(registerFont));
  S.map = map; S.cities = cities; S.sel = null; S.undo = []; S.prev = []; S.det = null; S.work = null; S.workAuto = null; S.mode = 'select';
  if (fresh) persistMap(); else persistMap();
  document.body.className = '';
  const src = map.kind === 'svg' ? URL.createObjectURL(new Blob([map.src], { type: 'image/svg+xml' })) : map.src;
  app().innerHTML = '<div class="work"><div class="top">' +
    '<div class="brand" data-a="home" title="Zur Startseite">' + D20.replace('class="d20"', '') + '<b>Atlas</b></div>' +
    '<button class="btn sm" data-a="open-map" title="Andere Karte laden">🗺️ Karte</button><button class="btn sm" data-a="open-proj" title="Projektdatei öffnen">📂 Öffnen</button><button class="btn sm" data-a="save" title="Projekt als Datei speichern (Strg+S)">💾 Speichern</button><button class="btn sm" data-a="csv" title="Orte als Tabelle (Excel) exportieren">📄 CSV</button><button class="btn sm" data-a="exportImg" title="Karte mit Beschriftungen als Bild speichern">🖼️ Bild</button><span class="sep"></span>' +
    '<button class="btn sm" data-a="mode" data-m="select" title="Orte auswählen und verschieben (Esc)">🖱️ Auswählen</button><button class="btn sm" data-a="mode" data-m="add" title="Mit einem Klick einen Ort setzen (A)">➕ Ort setzen</button><button class="btn sm" data-a="detect" title="Städte auf der Karte erkennen">🔍 Städte erkennen</button><button class="btn sm" data-a="mode" data-m="text" title="Beschriftung auf die Karte setzen (T)">✍️ Beschriften</button><span class="sep"></span>' +
    '<button class="btn sm" data-a="mk" id="mkBtn" title="Darstellung der Ortsmarkierung wechseln: Punkt → Ring (Kartensymbol bleibt sichtbar) → aus (Orte bleiben anklickbar)">📍 Symbol: Punkt</button><button class="btn sm" data-a="names" title="Ortsnamen auf der Karte ein-/ausblenden">🏷️ Namen</button><button class="btn sm" data-a="undo" title="Rückgängig (Strg+Z)">↶</button><span class="sp"></span><span class="small muted" id="mapName">' + esc(map.name) + '</span></div>' +
    '<div class="body"><aside class="list"><div class="hd"><div class="seg" id="ltab"></div><span class="small muted" id="cnt" style="margin-top:-.2em"></span><input type="search" id="q" placeholder="Suchen …"><select id="tf"><option value="">Alle Arten</option>' + D.TYPES.map(t => '<option>' + t + '</option>').join('') + '</select></div><div class="items" id="items"></div>' +
    '<div class="legend">' + D.WEALTH.map(w => '<span><i class="dot" style="background:' + D.W_COL[w] + '"></i>' + w + '</span>').join('') + '<span><i class="dot sq" style="background:#ccc"></i>Festung</span></div></aside>' +
    '<div class="mapwrap" id="mw"><div class="stage" id="stage"><img id="mimg" alt="Karte" src="' + src + '" width="' + map.w + '" height="' + map.h + '"><svg class="lsvg" id="lsvg" width="' + map.w + '" height="' + map.h + '" viewBox="0 0 ' + map.w + ' ' + map.h + '"></svg></div><svg class="ovl" id="ovl"></svg><div class="hint hidden" id="hint"></div><div class="tip hidden" id="tip"></div><div id="detBox"></div>' +
    '<div class="zoomctl"><button class="btn sm" data-a="zin" title="Hineinzoomen">＋</button><button class="btn sm" data-a="zout" title="Herauszoomen">－</button><button class="btn sm" data-a="fit" title="Ganze Karte">⛶</button></div></div>' +
    '<aside class="panel hidden" id="panel"></aside></div></div>' +
    '<input type="file" id="fMap" accept="image/*,.svg,.json" class="hidden"><input type="file" id="fProj" accept=".json,application/json" class="hidden"><input type="file" id="fFont" accept=".ttf,.otf,.woff,.woff2" class="hidden">';
  S.img = $('#mimg');
  await new Promise(r => { if (S.img.complete) r(); else { S.img.onload = r; S.img.onerror = r; } });
  bindMap();
  try { document.fonts.ready.then(() => { if (S.map === map) { renderMarkers(); renderLabels(); } }); } catch (e) { }
  fit();
  refresh();
  if (fresh) openDetect(true);
  else if (!cities.length) openDetect(false);
}
function refresh() { renderList(); renderMarkers(); renderLabels(); renderPanel(); renderTop(); persist(); }
function renderTop() {
  document.querySelectorAll('[data-a="mode"]').forEach(b => b.classList.toggle('on', b.dataset.m === S.mode && !S.det));
  const d = $('[data-a="detect"]'); if (d) d.classList.toggle('on', !!S.det);
  const n = $('[data-a="names"]'); if (n) n.classList.toggle('on', S.names); const mkb = $('#mkBtn'); if (mkb) { mkb.textContent = MK_LBL[S.mk]; mkb.classList.toggle('on', S.mk !== 'none'); }
  const mw = $('#mw'); if (mw) { mw.classList.toggle('add', S.mode === 'add' || S.mode === 'text'); mw.classList.toggle('pick', !!(S.det && S.det.picking)); }
  const h = $('#hint'); if (!h) return;
  const msg = S.det && S.det.picking ? 'Klicke auf ein Stadtsymbol der Karte – danach werden alle ähnlichen Symbole gesucht. (Esc bricht ab)' : S.mode === 'text' ? 'Klicke auf die Karte, um dort eine Beschriftung einzufügen. Vorhandene Beschriftungen kannst du ziehen. (Esc beendet)' : S.mode === 'add' ? 'Klicke auf die Karte, um einen Ort zu setzen. (Esc beendet)' : '';
  h.textContent = msg; h.classList.toggle('hidden', !msg);
}
const sorted = list => list.slice().sort((a, b) => (a.name || '~').localeCompare(b.name || '~', 'de', { numeric: true }));
function renderList() {
  const it = $('#items'); if (!it) return;
  const q = S.q.toLowerCase();
  $('#ltab').innerHTML = '<button data-a="ltab" data-v="cities" class="' + (S.ltab === 'cities' ? 'on' : '') + '">Orte</button><button data-a="ltab" data-v="labels" class="' + (S.ltab === 'labels' ? 'on' : '') + '">Beschriftungen</button>';
  $('#tf').classList.toggle('hidden', S.ltab !== 'cities'); document.querySelector('.legend').classList.toggle('hidden', S.ltab !== 'cities');
  if (S.ltab === 'labels') {
    const ll = S.labels.filter(l => !q || (l.text || '').toLowerCase().includes(q));
    $('#cnt').textContent = S.labels.length + ' Beschriftungen';
    it.innerHTML = ll.map(l => '<div class="it' + (l.id === S.selL ? ' sel' : '') + '" data-lid="' + l.id + '"><span class="nm" style="font-family:' + esc(famCss(l.font)) + ';font-weight:' + (l.bold ? 700 : 400) + ';font-style:' + (l.italic ? 'italic' : 'normal') + ';color:' + esc(l.color) + '">' + esc((l.text || '').replace(/\n/g, ' ') || '(leer)') + '</span><span class="ty">' + Math.round(l.size) + ' px</span></div>').join('') ||
      '<p class="small muted" style="padding:.6em">Noch keine Beschriftungen. Klicke auf „✍️ Beschriften“ und dann auf die Karte.</p>';
    return;
  }
  const l = sorted(S.cities).filter(c => (!S.tf || c.type === S.tf) && (!q || (c.name || '').toLowerCase().includes(q) || c.races.some(r => (r.n || '').toLowerCase().includes(q))));
  $('#cnt').textContent = (l.length !== S.cities.length ? l.length + ' / ' : '') + S.cities.length + ' Orte';
  it.innerHTML = l.map(c => '<div class="it' + (c.id === S.sel ? ' sel' : '') + '" data-id="' + c.id + '"><i class="dot' + (c.type === 'Festung' ? ' sq' : '') + '" style="background:' + D.W_COL[c.wealth] + '"></i><span class="nm">' + esc(c.name || '(ohne Namen)') + '</span><span class="ty">' + esc(c.type) + '</span></div>').join('') ||
    '<p class="small muted" style="padding:.6em">' + (S.cities.length ? 'Keine Treffer.' : 'Noch keine Orte. Nutze „🔍 Städte erkennen“ oder „➕ Ort setzen“.') + '</p>';
  const s = it.querySelector('.sel'); if (s && s.scrollIntoViewIfNeeded) s.scrollIntoViewIfNeeded(false);
}

/* ---------- Marker ---------- */
function renderMarkers() {
  const o = $('#ovl'); if (!o) return;
  let h = '';
  S.prev.forEach((p, i) => { if (p.off) return; h += '<g class="mk prev' + (p.dup ? ' dup' : '') + '" data-p="' + i + '"><circle class="core" r="' + Math.max(7, Math.min(16, p.size * S.v.s / 2 + 3)).toFixed(1) + '"/>' + (p.name && S.names ? '<text x="10" y="4">' + esc(p.name) + '</text>' : '') + '</g>'; });
  const NL = S.names ? layoutNames({ k: S.v.s, u: 1, font: NAME_FONT, lh: 15, ro: markerR }) : {};
  S.cities.forEach(c => {
    const r = D.R_SIZE[c.type] || 6, sq = c.type === 'Festung', on = c.id === S.sel, st = S.det ? 'dot' : S.mk;
    const half = (c.sym || 0) * S.v.s / 2, rr = Math.max(r, half + 3), col = D.W_COL[c.wealth];
    let body;
    if (st === 'dot') body = sq ? '<rect class="ring" x="' + (-r - 1.5) + '" y="' + (-r - 1.5) + '" width="' + (2 * r + 3) + '" height="' + (2 * r + 3) + '" rx="2"/><rect class="core" x="' + -r + '" y="' + -r + '" width="' + 2 * r + '" height="' + 2 * r + '" rx="1.5" fill="' + col + '"/>'
      : '<circle class="ring" r="' + (r + 1.5) + '"/><circle class="core" r="' + r + '" fill="' + col + '"/>';
    else if (st === 'ring') body = sq ? '<rect class="hollow2" x="' + -rr + '" y="' + -rr + '" width="' + 2 * rr + '" height="' + 2 * rr + '" rx="2"/><rect class="hollow" x="' + -rr + '" y="' + -rr + '" width="' + 2 * rr + '" height="' + 2 * rr + '" rx="2" stroke="' + col + '"/>'
      : '<circle class="hollow2" r="' + rr + '"/><circle class="hollow" r="' + rr + '" stroke="' + col + '"/>';
    else body = '<circle class="ghost" r="' + rr + '"/>';
    const ro = st === 'dot' ? r : rr;
    h += '<g class="mk mk-' + st + (on ? ' sel' : '') + '" data-id="' + c.id + '">' + (on ? '<circle class="halo" r="' + (ro + 5) + '"/>' : '') + body +
      (NL[c.id] ? nameSvg(NL[c.id]) : '') + '</g>';
  });
  o.innerHTML = h; place();
}
const NAME_FONT = '700 13px "Crimson Text", "EB Body", "Book Antiqua", Georgia, serif';
function markerR(c) { const r = D.R_SIZE[c.type] || 6, st = S.det ? 'dot' : S.mk; return st === 'dot' ? r : Math.max(r, (c.sym || 0) * S.v.s / 2 + 3); }
function nameSvg(L) {
  if (L.hidden) return '';
  return '<text text-anchor="' + L.anchor + '" dominant-baseline="central">' + L.lines.map((t, i) => '<tspan x="' + L.tx.toFixed(1) + '" y="' + L.ys[i].toFixed(1) + '">' + esc(t) + '</tspan>').join('') + '</text>';
}
function place() {
  const v = S.v;
  const st = $('#stage'); if (st) st.style.transform = 'translate(' + v.tx + 'px,' + v.ty + 'px) scale(' + v.s + ')';
  document.querySelectorAll('#ovl .mk').forEach(g => {
    const c = g.dataset.id ? cityById(g.dataset.id) : S.prev[+g.dataset.p]; if (!c) return;
    g.setAttribute('transform', 'translate(' + (v.tx + c.x * v.s).toFixed(1) + ',' + (v.ty + c.y * v.s).toFixed(1) + ')');
  });
}
function fit() {
  const mw = $('#mw'); if (!mw || !S.map) return; const W_ = mw.clientWidth, H_ = mw.clientHeight;
  const s = Math.min(W_ / S.map.w, H_ / S.map.h) * .97;
  S.v = { s, tx: (W_ - S.map.w * s) / 2, ty: (H_ - S.map.h * s) / 2 }; place();
}
function zoomAt(f, sx, sy) {
  const mw = $('#mw'); const minS = Math.min(mw.clientWidth / S.map.w, mw.clientHeight / S.map.h) * .4;
  const ns = Math.min(8, Math.max(minS, S.v.s * f)); const k = ns / S.v.s;
  S.v.tx = sx - (sx - S.v.tx) * k; S.v.ty = sy - (sy - S.v.ty) * k; S.v.s = ns;
  renderMarkers();
  if (S.selL) renderLabels();
  persist();
}
function centerOn(c) {
  const mw = $('#mw'); if (S.v.s < .6) { S.v.s = Math.min(1.2, Math.max(S.v.s, .6)); }
  S.v.tx = mw.clientWidth / 2 - c.x * S.v.s; S.v.ty = mw.clientHeight / 2 - c.y * S.v.s; renderMarkers();
}
const toMap = (sx, sy) => ({ x: (sx - S.v.tx) / S.v.s, y: (sy - S.v.ty) / S.v.s });

function bindMap() {
  const mw = $('#mw'); let drag = null;
  const rel = e => { const r = mw.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  mw.addEventListener('scroll', () => { if (mw.scrollTop || mw.scrollLeft) { mw.scrollTop = 0; mw.scrollLeft = 0; } });
  mw.addEventListener('wheel', e => { e.preventDefault(); const p = rel(e); zoomAt(Math.pow(1.0015, -e.deltaY), p.x, p.y); }, { passive: false });
  mw.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('.detect,.zoomctl')) return;
    const p = rel(e), mk = e.target.closest('.mk');
    drag = { sx: p.x, sy: p.y, tx: S.v.tx, ty: S.v.ty, moved: false, mk, id: mk && mk.dataset.id, pi: mk && mk.dataset.p };
    if (drag.id && S.mode === 'select' && !(S.det && S.det.picking)) { const c = cityById(drag.id); drag.cx = c.x; drag.cy = c.y; }
    const lb = !mk && !(S.det && S.det.picking) && e.target.closest('.lb');
    if (lb && (S.mode === 'select' || S.mode === 'text')) { const l = S.labels.find(x => x.id === lb.dataset.l); if (l) { drag.lid = l.id; drag.cx = l.x; drag.cy = l.y; } }
    mw.setPointerCapture(e.pointerId);
  });
  mw.addEventListener('pointermove', e => {
    const p = rel(e);
    if (!drag) { hover(e, p); return; }
    const dx = p.x - drag.sx, dy = p.y - drag.sy;
    if (!drag.moved && dx * dx + dy * dy < 16) return;
    if (!drag.moved) { drag.moved = true; if (drag.cx !== undefined) pushUndo(); }
    $('#tip').classList.add('hidden');
    if (drag.lid) { const l = S.labels.find(x => x.id === drag.lid); l.x = drag.cx + dx / S.v.s; l.y = drag.cy + dy / S.v.s; renderLabelsAndNames(); }
    else if (drag.cx !== undefined) { const c = cityById(drag.id); c.x = drag.cx + dx / S.v.s; c.y = drag.cy + dy / S.v.s; place(); }
    else { mw.classList.add('pan'); S.v.tx = drag.tx + dx; S.v.ty = drag.ty + dy; place(); }
  });
  const up = e => {
    if (!drag) return; const d = drag; drag = null; mw.classList.remove('pan');
    if (d.moved) { if (d.lid) { S.selL = d.lid; S.sel = null; refresh(); } persist(); return; }
    const m = toMap(d.sx, d.sy);
    if (S.det && S.det.picking) { pickAt(m); return; }
    if (d.pi !== undefined && d.pi !== null) { const p = S.prev[+d.pi]; if (p) { p.off = true; renderMarkers(); renderDetect(); } return; }
    if (d.id) { select(d.id); return; }
    if (d.lid) { selectLabel(d.lid); return; }
    if (S.mode === 'text') { if (m.x < 0 || m.y < 0 || m.x > S.map.w || m.y > S.map.h) return; addLabelAt(m.x, m.y); return; }
    if (S.mode === 'add') { if (m.x < 0 || m.y < 0 || m.x > S.map.w || m.y > S.map.h) return; pushUndo(); const c = D.newCity(m.x, m.y, { name: nextName(), type: 'Ortschaft', density: DEF_DENS.Ortschaft }); S.cities.push(c); S.sel = c.id; refresh(); setTimeout(() => { const n = $('#panel .nameIn'); if (n) { n.focus(); n.select(); } }, 30); return; }
    if (S.sel || S.selL) { S.sel = null; S.selL = null; refresh(); }
  };
  mw.addEventListener('pointerup', up); mw.addEventListener('pointercancel', () => { drag = null; mw.classList.remove('pan'); });
  mw.addEventListener('pointerleave', () => $('#tip').classList.add('hidden'));
  W.addEventListener('resize', () => place());
}
function hover(e, p) {
  const t = $('#tip'), mk = e.target.closest('.mk');
  if (!mk) { t.classList.add('hidden'); return; }
  let txt;
  if (mk.dataset.id) { const c = cityById(mk.dataset.id); txt = (c.name || '(ohne Namen)') + ' · ' + c.type + ' · ' + c.wealth; }
  else { const pr = S.prev[+mk.dataset.p]; txt = (pr.dup ? 'Schon vorhanden' : 'Treffer') + (pr.name ? ': ' + pr.name : '') + (pr.type ? ' · ' + pr.type : '') + ' – Klick entfernt'; }
  t.textContent = txt; t.style.left = (p.x + 14) + 'px'; t.style.top = (p.y + 10) + 'px'; t.classList.remove('hidden');
}
function select(id) { if (S.sel !== id) S.poi = null; S.sel = id; S.selL = null; S.ltab = 'cities'; if (S.mode !== 'text') S.mode = 'select'; refresh(); }

/* ---------- Eigenschaften ---------- */
const seg = (f, list, cur) => '<div class="seg">' + list.map(v => '<button data-a="set" data-f="' + f + '" data-v="' + esc(v) + '" class="' + (v === cur ? 'on' : '') + '">' + esc(v) + '</button>').join('') + '</div>';
function renderPanel() {
  const p = $('#panel'); if (!p) return; const c = sel();
  const lab = !c && selL(); if (lab) { p.classList.remove('hidden'); renderLabelPanel(p, lab); return; }
  if (!c) { p.classList.add('hidden'); p.innerHTML = ''; return; }
  p.classList.remove('hidden');
  const sum = c.races.reduce((s, r) => s + (+r.p || 0), 0);
  p.innerHTML = '<div style="display:flex;align-items:center;gap:.4em"><div class="kicker" style="flex:1">' + esc(c.type) + '</div><button class="btn sm" data-a="center" title="Auf der Karte zeigen">🎯</button><button class="btn sm" data-a="close" title="Schließen (Esc)">✕</button></div>' +
    '<input class="nameIn" data-f="name" value="' + esc(c.name) + '" placeholder="Name des Ortes">' +
    '<div class="fld"><label>Art der Stadt</label>' + seg('type', D.TYPES, c.type) + '<div class="tiny muted" style="margin-top:.2em">' + esc(D.TYPE_DESC[c.type] || '') + '</div></div>' +
    '<div class="fld"><label>Bevölkerungsdichte</label>' + seg('density', D.DENS, c.density) + '</div>' +
    '<div class="fld"><label>Reichtum der Stadt</label>' + seg('wealth', D.WEALTH, c.wealth) + '</div>' +
    '<div class="fld races"><label>Völker <span style="display:flex;gap:.3em"><button class="dice" data-a="rollRaces" title="Völker neu würfeln">🎲</button></span></label>' +
    '<div class="bar" id="rbar">' + barHtml(c) + '</div>' +
    c.races.map((r, i) => '<div class="rr"><input type="text" list="raceList" data-f="race" data-i="' + i + '" value="' + esc(r.n) + '" placeholder="Volk"><input type="number" min="0" max="100" data-f="raceP" data-i="' + i + '" value="' + (r.p === '' ? '' : +r.p) + '"><span class="small">%</span><button class="x" data-a="delRace" data-i="' + i + '" title="Entfernen">✕</button></div>').join('') +
    '<div style="display:flex;gap:.4em;align-items:center;flex-wrap:wrap"><button class="btn sm" data-a="addRace">＋ Volk</button><button class="btn sm" data-a="norm" title="Anteile so anpassen, dass sie zusammen 100 % ergeben">⚖️ auf 100 %</button><span class="sum' + (c.races.length && Math.round(sum) !== 100 ? ' bad' : '') + '" id="rsum">Summe ' + Math.round(sum) + ' %</span></div></div>' +
    '<div class="fld"><label>Zahlen <button class="dice" data-a="rollAll" title="Einwohner und alle Anzahlen neu würfeln">🎲 alle</button></label><div class="nums">' +
    numRow('Einwohner (ca.)', 'pop', c.pop) + numRow('Anzahl an Unterkünften', 'lodging', c.lodging) + numRow('Anzahl an Restaurants', 'restaurants', c.restaurants) + numRow('Anzahl an Geschäften', 'shops', c.shops) + '</div>' +
    '<div class="tiny muted" style="margin-top:.3em">' + (c.numsManual || c.popManual ? '✏️ Von Hand angepasst – Änderungen an Art, Dichte oder Reichtum überschreiben diese Werte nicht.' : '🎲 Vorschlag aus Art, Dichte und Reichtum – passt sich automatisch an, bis du einen Wert änderst.') + '</div></div>' +
    poiHtml(c) +
    '<div class="fld"><label>Notizen</label><textarea data-f="notes" placeholder="Herrscher, Gasthäuser, Gerüchte …">' + esc(c.notes) + '</textarea></div>' +
    '<div class="pfoot"><button class="btn sm" data-a="dup" title="Eigenschaften auf einen neuen Ort kopieren">⧉ Duplizieren</button><button class="btn sm" data-a="nameLabel" title="Den Ortsnamen als Beschriftung auf die Karte schreiben">✍️ Name beschriften</button><span class="sp"></span><button class="btn sm" data-a="del" style="color:var(--fail)" title="Ort löschen (Entf)">🗑️ Löschen</button></div>' +
    '<datalist id="raceList">' + D.RACES.map(r => '<option value="' + r + '">').join('') + '</datalist>';
}
function barHtml(c) { const sum = c.races.reduce((s, r) => s + (+r.p || 0), 0); return c.races.filter(r => +r.p > 0).map((r, i) => '<i title="' + esc(r.n) + ' ' + r.p + ' %" style="width:' + (r.p / Math.max(100, sum) * 100) + '%;background:' + D.raceColor(r.n, i) + '"></i>').join(''); }
const numRow = (l, f, v) => '<span class="n">' + l + '</span><input type="number" min="0" step="1" data-f="' + f + '" value="' + (+v || 0) + '"><button class="dice" data-a="roll" data-f="' + f + '" title="Neu würfeln">🎲</button>';
function setProp(c, f, v) {
  pushUndo(); c[f] = v;
  if (f === 'type' && !c.densityManual) c.density = DEF_DENS[v] || c.density;
  if (f === 'density') c.densityManual = true;
  if (!c.popManual) c.pop = D.suggestPop(c);
  if (!c.numsManual) Object.assign(c, D.suggestNums(c));
  if (f === 'type' && !c.racesManual) c.races = D.suggestRaces(c);
  refresh();
}
function onPanelInput(e) {
  const t = e.target, c = sel(); if (!c || !t.dataset.f) return; const f = t.dataset.f;
  if (f === 'name') { c.name = t.value; (c.pois || []).forEach(q => { q.city = c.name; }); renderMarkers(); renderList(); persist(); return; }
  if (f === 'notes') { c.notes = t.value; persist(); return; }
  if (f === 'race') { c.races[+t.dataset.i].n = t.value; c.racesManual = true; persist(); return; }
  if (f === 'raceP') { c.races[+t.dataset.i].p = t.value === '' ? '' : Math.max(0, +t.value); c.racesManual = true; const s = c.races.reduce((a, r) => a + (+r.p || 0), 0); const el = $('#rsum'); el.textContent = 'Summe ' + Math.round(s) + ' %'; el.classList.toggle('bad', Math.round(s) !== 100); persist(); return; }
  if (['pop', 'lodging', 'restaurants', 'shops'].includes(f)) {
    const v = Math.max(0, Math.round(+t.value || 0)); c[f] = v;
    if (f === 'pop') { c.popManual = true; if (!c.numsManual) { const n = D.suggestNums(c); ['lodging', 'restaurants', 'shops'].forEach(k => { c[k] = n[k]; const el = $('#panel input[data-f="' + k + '"]'); if (el) el.value = n[k]; }); } }
    else c.numsManual = true;
    persist();
  }
}
function onPanelChange(e) { const c = sel(); if (c && (e.target.dataset.f === 'race' || e.target.dataset.f === 'raceP')) { const b = $('#rbar'); if (b) b.innerHTML = barHtml(c); } }

/* ---------- Erkennung ---------- */
function openDetect(auto) {
  S.det = { picking: false, tpl: null, tol: 40, strict: .5, type: 'auto', info: '', mode: '' }; S.mode = 'select'; S.prev = [];
  renderDetect(); renderTop();
  if (auto) { if (S.map.kind === 'svg') runSvg(); else runAuto(); }
}
function closeDetect() { S.det = null; S.prev = []; const b = $('#detBox'); if (b) b.innerHTML = ''; renderMarkers(); renderTop(); }
function ensureWork(maxDim) {
  const key = maxDim > 1500 ? 'work' : 'workAuto';
  if (!S[key]) S[key] = X.makeWork(S.img, S.map.w, S.map.h, maxDim);
  return S[key];
}
function setPrev(list) {
  const lim = Math.max(6, Math.max(S.map.w, S.map.h) * .006);
  S.prev = list.map(p => Object.assign({}, p, { off: false, dup: S.cities.some(c => Math.hypot(c.x - p.x, c.y - p.y) < Math.max(lim, (p.size || 0) * .8)) }));
  renderMarkers(); renderDetect();
}
async function runAuto() {
  await busy('Suche Stadtsymbole …', () => {
    let wk; try { wk = ensureWork(1400); } catch (e) { S.det.info = 'Das Bild konnte nicht ausgewertet werden (' + e.message + '). Setze die Orte mit „➕ Ort setzen“.'; return; }
    S.det.alts = X.autoDetect(wk); S.det.alt = 0; S.det.mode = 'auto'; showAlt();
  });
}
function showAlt() {
  const d = S.det, a = d.alts[d.alt];
  d.autoCol = a ? a.col : null;
  if (!a) { d.picking = true; renderTop(); }
  d.info = a ? 'Automatisch gefunden' + (d.alts.length > 1 ? ' (Vorschlag ' + (d.alt + 1) + ' von ' + d.alts.length + ')' : '') + '. Falsche Symbole? „↻ Anderer Vorschlag“ oder „🎯 Beispiel anklicken“.' : 'Auf dieser Karte gibt es keine eindeutigen Stadtsymbole für die automatische Suche. Klicke jetzt einfach auf ein Stadtsymbol der Karte – dann sucht das Tool alle gleich aussehenden.';
  setPrev(a ? a.hits : []);
}
async function runSvg() {
  await busy('Lese SVG-Elemente …', () => {
    const r = X.svgCandidates(S.map.src, S.map.w, S.map.h); S.det.mode = 'svg';
    if (r.length) { S.det.info = 'Aus den SVG-Elementen gelesen' + (r.some(x => x.name) ? ', Namen aus den Beschriftungen übernommen.' : '.'); setPrev(r); }
    else { S.det.info = 'In der SVG wurden keine Stadt-Elemente erkannt – ich suche im Bild weiter.'; renderDetect(); setTimeout(runAuto, 50); }
  });
}
async function pickAt(m) {
  S.det.picking = false; renderTop();
  await busy('Suche ähnliche Symbole …', () => {
    const wk = ensureWork(2000);
    const r = X.pickExample(wk, m.x * wk.sc, m.y * wk.sc, S.det.tol);
    if (r.err) { S.det.info = r.err; renderDetect(); return; }
    S.det.tpl = r.tpl; S.det.mode = 'tpl'; findTpl();
  });
}
function findTpl() {
  const wk = ensureWork(2000), d = S.det;
  // Vorlage mit neuer Toleranz neu aufnehmen (gleicher Klickpunkt)
  if (d.tpl.tol !== d.tol) { const r = X.pickExample(wk, d.tpl.wx, d.tpl.wy, d.tol); if (!r.err) d.tpl = r.tpl; }
  const hits = X.findSimilar(wk, d.tpl, d.tol, d.strict);
  d.info = 'Ähnliche Symbole zum Beispiel. Mit den Reglern feinjustieren.';
  setPrev(hits);
}
let detT = null;
function renderDetect() {
  const b = $('#detBox'); if (!b) return; const d = S.det; if (!d) { b.innerHTML = ''; return; }
  const act = S.prev.filter(p => !p.off && !p.dup).length, dup = S.prev.filter(p => !p.off && p.dup).length, off = S.prev.filter(p => p.off).length;
  const col = d.mode === 'tpl' && d.tpl ? d.tpl.col : d.mode === 'auto' ? d.autoCol : null;
  b.innerHTML = '<div class="detect"><h3>🔍 Städte erkennen <button class="btn sm" data-a="detClose" title="Schließen">✕</button></h3>' +
    '<div class="small" style="margin:.2em 0 .4em">' + esc(d.info || 'Wähle eine Suchart.') + '</div>' +
    '<div class="row"><button class="btn sm" data-a="detAuto">🪄 Automatisch</button>' + (S.map.kind === 'svg' ? '<button class="btn sm" data-a="detSvg">📐 SVG auswerten</button>' : '') + '<button class="btn sm' + (d.picking ? ' on' : '') + '" data-a="detPick">🎯 Beispiel anklicken</button>' + (d.mode === 'auto' && d.alts && d.alts.length > 1 ? '<button class="btn sm" data-a="detAlt">↻ Anderer Vorschlag</button>' : '') + '</div>' +
    (col ? '<div class="row"><span class="swatch" style="background:rgb(' + col.map(Math.round).join(',') + ')"></span><span class="small">Gesuchte Symbolfarbe' + (d.mode === 'tpl' ? ' · Beispiel ' + d.tpl.bw + '×' + d.tpl.bh + ' px' : '') + '</span></div>' : '') +
    (d.mode === 'tpl' ? '<div class="row"><label>Farbtoleranz <b>' + d.tol + '</b><input type="range" min="8" max="120" value="' + d.tol + '" data-d="tol"></label></div><div class="row"><label>Formgenauigkeit <b>' + Math.round(d.strict * 100) + ' %</b><input type="range" min="0" max="100" value="' + Math.round(d.strict * 100) + '" data-d="strict"></label></div>' : '') +
    '<div class="row"><span class="cnt">' + act + '</span><span class="small">neue Treffer' + (dup ? ' · ' + dup + ' schon vorhanden' : '') + (off ? ' · ' + off + ' abgewählt' : '') + '</span></div>' +
    '<div class="row"><label>Art für neue Orte <select data-d="type" style="width:100%">' + (d.mode === 'svg' ? '<option value="auto"' + (d.type === 'auto' ? ' selected' : '') + '>aus der Karte (sonst Ortschaft)</option>' : '<option value="auto"' + (d.type === 'auto' ? ' selected' : '') + '>Ortschaft (später anpassen)</option>') + D.TYPES.map(t => '<option' + (d.type === t ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></label></div>' +
    '<div class="row"><button class="btn primary" data-a="detOk"' + (act ? '' : ' disabled') + '>✓ ' + act + ' übernehmen</button>' + (off ? '<button class="btn sm" data-a="detAll">alle wieder an</button>' : '') + '</div>' +
    '<div class="tiny muted">Grüne Kreise sind Treffer – ein Klick darauf entfernt einen Fehltreffer. Fehlende Orte setzt du danach mit „➕ Ort setzen“. Für verschiedene Symbole (z. B. Hauptstadt und Dorf) die Suche mehrmals mit eigenem Beispiel und passender Art ausführen.</div></div>';
}
function acceptDetect() {
  const d = S.det; const list = S.prev.filter(p => !p.off && !p.dup); if (!list.length) return;
  pushUndo();
  list.forEach(p => {
    const type = d.type !== 'auto' ? d.type : (p.type || 'Ortschaft');
    const c = D.newCity(p.x, p.y, { name: p.name || nextName(), type, density: DEF_DENS[type], src: d.mode }); if (p.size) c.sym = Math.round(p.size * 10) / 10;
    S.cities.push(c);
  });
  toast(list.length + ' Orte übernommen.');
  S.prev = S.prev.filter(p => p.off || p.dup).map(p => Object.assign(p, { dup: true }));
  closeDetect(); refresh();
}

/*POI*/
/*LABELS*/
/* ---------- Ereignisse ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b) { const it = e.target.closest('.it'); if (it && it.dataset.lid) { selectLabel(it.dataset.lid); centerOn(selL()); } else if (it) { select(it.dataset.id); centerOn(sel()); } return; }
  const a = b.dataset.a, c = sel();
  switch (a) {
    case 'open-map': $('#fMap').click(); break;
    case 'open-proj': $('#fProj').click(); break;
    case 'resume': if (S._resume) { const { m, st } = S._resume; startMap(m, st.cities.map(upgradeCity), false, { labels: st.labels, fonts: st.fonts, lstyle: st.lstyle }).then(() => { S.names = st.names !== false; S.mk = st.mk || (st.showMk === false ? 'none' : 'dot'); if (st.v) { S.v = st.v; } refresh(); }); } break;
    case 'home': renderHome(); break;
    case 'save': saveProject(); break;
    case 'csv': exportCsv(); break;
    case 'mode': S.mode = b.dataset.m; if (S.det) closeDetect(); if (S.mode === 'text') { S.ltab = 'labels'; renderList(); } renderTop(); break;
    case 'detect': if (S.det) closeDetect(); else openDetect(false); break;
    case 'names': S.names = !S.names; renderMarkers(); renderTop(); persist(); break;
    case 'undo': undo(); break;
    case 'zin': { const mw = $('#mw'); zoomAt(1.4, mw.clientWidth / 2, mw.clientHeight / 2); break; }
    case 'zout': { const mw = $('#mw'); zoomAt(1 / 1.4, mw.clientWidth / 2, mw.clientHeight / 2); break; }
    case 'fit': fit(); if (S.prev.length) renderMarkers(); break;
    case 'close': S.sel = null; S.selL = null; refresh(); break;
    case 'ltab': S.ltab = b.dataset.v; renderList(); break;
    case 'mk': S.mk = S.mk === 'dot' ? 'ring' : S.mk === 'ring' ? 'none' : 'dot'; renderMarkers(); renderTop(); persist(); toast(S.mk === 'dot' ? 'Orte als Punkt' : S.mk === 'ring' ? 'Orte als Ring – das Kartensymbol bleibt sichtbar' : 'Ortssymbol ausgeblendet – Orte bleiben anklickbar'); break;
    case 'exportImg': exportDialog(); break;
    case 'fontFile': $('#fFont').click(); break;
    case 'lcenter': if (selL()) centerOn(selL()); break;
    case 'lcol': { const l = selL(); if (l) { pushUndo(); l.color = b.dataset.v; S.lstyle = pickStyle(l); refresh(); } break; }
    case 'lstd': { const l = selL(); if (l) { S.lstyle = pickStyle(l); persist(); toast('Neue Beschriftungen verwenden jetzt diese Schrift.'); } break; }
    case 'ldup': { const l = selL(); if (l) { pushUndo(); const n = Object.assign({}, l, { id: 'l' + Date.now().toString(36), x: l.x + l.size, y: l.y + l.size }); S.labels.push(n); S.selL = n.id; refresh(); } break; }
    case 'ldel': { const l = selL(); if (l) { pushUndo(); S.labels = S.labels.filter(x => x !== l); S.selL = null; refresh(); toast('Beschriftung gelöscht – Strg+Z holt sie zurück.'); } break; }
    case 'nameLabel': if (c) { const st = S.lstyle || defStyle(); const half = Math.max((c.sym || 0) / 2, (D.R_SIZE[c.type] || 6) / S.v.s); addLabelAt(c.x, c.y - half - Math.max(4 / S.v.s, st.size * .35) - st.size * .6, c.name || 'Ort'); } break;
    case 'center': if (c) centerOn(c); break;
    case 'set': if (c) setProp(c, b.dataset.f, b.dataset.v); break;
    case 'roll': if (c) { pushUndo(); const f = b.dataset.f; if (f === 'pop') { c.pop = D.suggestPop(c); c.popManual = false; if (!c.numsManual) Object.assign(c, D.suggestNums(c)); } else c[f] = D.suggestNums(c)[f]; refresh(); } break;
    case 'rollAll': if (c) { pushUndo(); c.popManual = c.numsManual = false; D.reroll(c, false); refresh(); } break;
    case 'rollRaces': if (c) { pushUndo(); c.racesManual = false; c.races = D.suggestRaces(c); refresh(); } break;
    case 'addRace': if (c) { pushUndo(); c.races.push({ n: '', p: '' }); c.racesManual = true; renderPanel(); const ins = document.querySelectorAll('#panel .rr input[type=text]'); if (ins.length) ins[ins.length - 1].focus(); } break;
    case 'delRace': if (c) { pushUndo(); c.races.splice(+b.dataset.i, 1); c.racesManual = true; refresh(); } break;
    case 'norm': if (c) { pushUndo(); c.races = D.normalize(c.races); c.racesManual = true; refresh(); } break;
    case 'del': if (c) { pushUndo(); S.cities = S.cities.filter(x => x !== c); S.sel = null; refresh(); toast('„' + (c.name || 'Ort') + '“ gelöscht – Strg+Z holt ihn zurück.'); } break;
    case 'dup': if (c) { pushUndo(); const n = JSON.parse(JSON.stringify(c)); n.id = 'c' + Date.now().toString(36); n.x += 20 / S.v.s; n.y += 20 / S.v.s; n.name = (c.name || 'Ort') + ' (Kopie)'; S.cities.push(n); S.sel = n.id; refresh(); } break;
    case 'detClose': closeDetect(); break;
    case 'detAuto': runAuto(); break;
    case 'detSvg': runSvg(); break;
    case 'detPick': S.det.picking = !S.det.picking; S.mode = 'select'; renderDetect(); renderTop(); break;
    case 'detOk': acceptDetect(); break;
    case 'detAlt': S.det.alt = (S.det.alt + 1) % S.det.alts.length; showAlt(); break;
    case 'detAll': S.prev.forEach(p => { p.off = false; }); renderMarkers(); renderDetect(); break;
  }
});
document.addEventListener('focusin', e => { if (e.target.closest('#panel') && (e.target.dataset.f || e.target.dataset.l) && e.target.tagName !== 'BUTTON') pushUndo(); });
document.addEventListener('input', e => {
  if (e.target.closest('#panel') && e.target.dataset.l) return onLabelInput(e.target);
  if (e.target.closest('#panel')) return onPanelInput(e);
  if (e.target.id === 'q') { S.q = e.target.value; renderList(); return; }
  const k = e.target.dataset.d; if (!k || !S.det) return;
  if (k === 'tol') S.det.tol = +e.target.value; else if (k === 'strict') S.det.strict = +e.target.value / 100; else return;
  const lb = e.target.parentElement.querySelector('b'); if (lb) lb.textContent = k === 'tol' ? S.det.tol : Math.round(S.det.strict * 100) + ' %';
  clearTimeout(detT); detT = setTimeout(() => { if (S.det && S.det.tpl) { findTpl(); } }, 250);
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'fFont') { const f = t.files[0]; t.value = ''; if (f) addFontFile(f); return; }
  if (t.id === 'fMap' || t.id === 'fProj') { const f = t.files[0]; t.value = ''; if (f) openFile(f); return; }
  if (t.id === 'tf') { S.tf = t.value; renderList(); return; }
  if (t.dataset.d === 'type' && S.det) { S.det.type = t.value; return; }
  if (t.closest('#panel')) onPanelChange(e);
});
document.addEventListener('keydown', e => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && S.map && $('.work')) { e.preventDefault(); saveProject(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing && $('.work')) { e.preventDefault(); undo(); return; }
  if (!$('.work')) return;
  if (e.key === 'Escape') { if (typing) { document.activeElement.blur(); return; } if (S.det && S.det.picking) { S.det.picking = false; renderDetect(); renderTop(); } else if (S.mode === 'add' || S.mode === 'text') { S.mode = 'select'; renderTop(); } else if (S.sel || S.selL) { S.sel = null; S.selL = null; refresh(); } else if (S.det) closeDetect(); return; }
  if (typing) return;
  if ((e.key === 'Delete' || e.key === 'Backspace') && (sel() || selL())) { e.preventDefault(); $(sel() ? '[data-a="del"]' : '[data-a="ldel"]').click(); }
  if (e.key.toLowerCase() === 't' && !e.ctrlKey) { S.mode = 'text'; if (S.det) closeDetect(); S.ltab = 'labels'; renderList(); renderTop(); }
  if (e.key.toLowerCase() === 'a' && !e.ctrlKey) { S.mode = 'add'; if (S.det) closeDetect(); renderTop(); }
});
document.addEventListener('dragover', e => { if ($('.work')) e.preventDefault(); });
document.addEventListener('drop', e => { if (!$('.work')) return; e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && confirm('„' + f.name + '“ öffnen? Die aktuelle Karte wird ersetzt – sichere sie vorher mit 💾 Speichern, wenn du sie behalten willst.')) openFile(f); });

W.AT_APP = { S, renderHome, openFile, startMap, refresh };
renderHome();
})(window);
