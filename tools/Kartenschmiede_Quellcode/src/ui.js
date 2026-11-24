/* DND5e Kartenschmiede – Oberfläche, Werkzeuge, Export */
const app = () => $('#app');
const DB = {
  open() { return new Promise((res, rej) => { try { const r = indexedDB.open('dnd5e-kartenschmiede', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }); },
  async get(k) { try { const db = await DB.open(); return await new Promise(res => { const t = db.transaction('kv').objectStore('kv').get(k); t.onsuccess = () => res(t.result); t.onerror = () => res(undefined); }); } catch (e) { return undefined; } },
  async set(k, v) { try { const db = await DB.open(); await new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; tx.onerror = res; }); } catch (e) { } }
};
let saveT = null;
function persist() { clearTimeout(saveT); saveT = setTimeout(() => { if (!S.ready) return; let thumb = ''; try { thumb = renderMap(document.createElement('canvas'), 'art', 240 / S.W, { names: false }, S.vis).toDataURL('image/jpeg', .7); } catch (e) { } DB.set('last', { p: toProject(), thumb, n: S.cities.length }); }, 1200); }
function toast(msg) { let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); } t.textContent = msg; clearTimeout(toast.t); toast.t = setTimeout(() => t.remove(), 3200); }
function busy(msg, fn) { const b = document.createElement('div'); b.className = 'busy'; b.innerHTML = '<div>' + esc(msg) + '</div>'; document.body.appendChild(b); return new Promise(res => setTimeout(async () => { let r; try { r = await fn(); } catch (e) { console.error(e); toast('Fehler: ' + e.message); } b.remove(); res(r); }, 50)); }
function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
const baseName = n => String(n || 'Karte').trim().replace(/[\\/:*?"<>|]+/g, '_') || 'Karte';
function modal(html, wide) { closeModal(); const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = '<div class="dlg"' + (wide ? ' style="max-width:' + wide + 'px"' : '') + '>' + html + '</div>'; m.addEventListener('mousedown', e => { if (e.target === m) closeModal(); }); document.body.appendChild(m); return m; }
function closeModal() { const m = $('.modal'); if (m) m.remove(); }
const fontsReady = () => Promise.all([document.fonts.load('20px "EB Title"'), document.fonts.load('bold 14px "EB Body"'), document.fonts.load('14px "EB Body"')]).catch(() => { });

/* ---------- Startbildschirm ---------- */
async function renderHome() {
  document.body.className = 'home'; S.ready = false;
  app().innerHTML = corners() + '<div class="welcome">' + orn + D20 + '<div class="kicker" style="margin-top:.5em">The Ultimate</div><h1>DND5e Kartenschmiede</h1>' + orn +
    '<p class="sub">Zeichne Kontinente, Inselreiche und Gebirge, verteile Wälder und Wüsten, ziehe Flüsse und Straßen und gründe Städte für alle Völker.</p><p class="sub" style="margin-top:0">Deine Welt beginnt mit einem leeren Ozean.</p>' +
    '<div id="resume"></div>' +
    '<div class="grid2"><button class="btn primary" data-a="new">🗺️ Neue Karte</button><button class="btn" data-a="open">📂 Projekt öffnen</button></div>' +
    '<p class="small muted" style="max-width:560px;margin:1.5em auto 0">Alles bleibt auf deinem Rechner. Die zuletzt bearbeitete Karte wird im Browser zwischengespeichert; mit „💾 Speichern“ sicherst du sie als Datei. Fertige Karten lassen sich direkt im <b>DND5e Atlas</b> weiterbearbeiten.</p></div>' + fileInput();
  const l = await DB.get('last');
  if (l && l.p && $('#resume')) { $('#resume').innerHTML = '<div class="resume"><img src="' + (l.thumb || '') + '" alt=""><div style="flex:1"><b>' + esc(l.p.name) + '</b><div class="small muted">' + l.p.W + ' × ' + l.p.H + ' · ' + (l.n || 0) + ' Städte · zuletzt bearbeitet</div></div><button class="btn primary" data-a="resume">↻ Fortsetzen</button></div>'; S._last = l.p; }
}
const fileInput = () => '<input type="file" id="fProj" accept=".json,application/json" class="hidden">';
function newDialog() {
  const m = modal('<h2>Neue Karte</h2><div class="fld"><label>Name der Welt</label><input type="text" id="nName" value="Neue Welt" style="width:100%"></div>' +
    '<div class="fld"><label>Größe</label><div class="seg" id="nSize">' + Object.entries(SIZES).map(([k, v]) => '<button data-v="' + k + '" class="' + (k === 'mittel' ? 'on' : '') + '">' + v[2] + '</button>').join('') + '</div></div>' +
    '<div class="fld"><label>Beginnen mit</label><div class="seg" id="nKind"><button data-v="" >🌊 Leerer Ozean (Freihand)</button><button data-v="kontinent" class="on">🌍 Kontinent</button><button data-v="archipel">🏝️ Archipel</button><button data-v="gebirge">⛰️ Gebirge</button></div></div>' +
    '<div class="fld" id="nOpt"><label class="chk"><input type="checkbox" id="nTerr" checked> Gelände automatisch verteilen (Wald, Wüste, Gebirge …)</label><label class="chk"><input type="checkbox" id="nRiv" checked> Flüsse erzeugen</label></div>' +
    '<div class="foot"><button class="btn" data-a="close">Abbrechen</button><button class="btn primary" data-a="new-ok">✨ Karte erschaffen</button></div>');
  segPick(m, '#nSize'); segPick(m, '#nKind', v => { $('#nOpt', m).style.display = v ? '' : 'none'; });
}
function segPick(root, sel, cb) { $(sel, root).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $$('button', $(sel, root)).forEach(x => x.classList.toggle('on', x === b)); if (cb) cb(b.dataset.v); }); }
const segVal = sel => { const b = $(sel + ' button.on'); return b ? b.dataset.v : ''; };

/* ---------- Arbeitsansicht ---------- */
let ES = 1, cvB, cvD, wrap, stage, ui;
const EOPT = () => ({ names: S.names, frame: false, compass: false, title: false, scale: false, grid: false, rsc: ES, realmNames: S.opt.realmNames });
function renderWork() {
  document.body.className = '';
  app().innerHTML = '<div class="work"><div class="top"><div class="brand" data-a="home" title="Zur Startseite">' + D20 + '<b>Kartenschmiede</b></div>' +
    '<input type="text" id="mapName" class="mapName" value="' + esc(S.name) + '" title="Name der Welt">' +
    '<div class="sep"></div><button class="btn sm" data-a="undo" title="Rückgängig (Strg+Z)">↶</button><button class="btn sm" data-a="redo" title="Wiederholen (Strg+Y)">↷</button>' +
    '<div class="sep"></div><div class="seg" id="viewSeg">' + RSTYLES.map(r => '<button data-a="view" data-v="' + r.k + '" title="' + r.d + '">' + r.n + '</button>').join('') + '</div>' +
    '<button class="btn sm" data-a="names" id="namesBtn" title="Ortsnamen ein-/ausblenden">🏷️ Namen</button><button class="btn sm" data-a="realmVis" id="realmBtn" title="Reiche (Königreiche, Fürstentümer …) in der Ansicht ein-/ausblenden">👑 Reiche</button><span class="sp"></span>' +
    '<button class="btn sm" data-a="new">🗺️ Neu</button><button class="btn sm" data-a="open">📂 Öffnen</button><button class="btn sm" data-a="save" title="Projekt als Datei sichern">💾 Speichern</button>' +
    '<button class="btn sm primary" data-a="export">🎨 Rendern &amp; Export</button><button class="btn sm gold" data-a="atlas" title="Karte samt Städten als Atlas-Projekt ablegen">🧭 Für den Atlas</button><button class="btn sm" data-a="help">❓</button></div>' +
    '<div class="kbody"><aside class="side" id="side"></aside><div class="mapwrap" id="wrap"><div class="stage" id="stage"><canvas id="cvB"></canvas><canvas id="cvD"></canvas></div><svg id="ui" class="uisvg"></svg>' +
    '<div class="status" id="status"></div><div class="zoomctl"><button class="btn sm" data-a="zin">＋</button><button class="btn sm" data-a="zout">－</button><button class="btn sm" data-a="fit" title="Ganze Karte zeigen">⤢</button></div></div></div></div>' + fileInput();
  cvB = $('#cvB'); cvD = $('#cvD'); wrap = $('#wrap'); stage = $('#stage'); ui = $('#ui');
  ES = Math.min(1, 1600 / S.W);
  for (const c of [cvB, cvD]) { c.width = Math.round(S.W * ES); c.height = Math.round(S.H * ES); c.style.width = S.W + 'px'; c.style.height = S.H + 'px'; }
  stage.style.width = S.W + 'px'; stage.style.height = S.H + 'px';
  bindMap(); renderTop(); renderSide(); fitView(); redrawAll();
  $('#mapName').addEventListener('input', e => { S.name = e.target.value; persist(); });
}
function renderTop() { $$('#viewSeg button').forEach(b => b.classList.toggle('on', b.dataset.v === S.view)); $('#namesBtn').classList.toggle('on', S.names); $('#realmBtn').classList.toggle('on', !!S.vis.realm); }
const curTool = () => S.tool[S.layer];
function renderSide() {
  const L = S.layer, T = curTool(); let h = '<div class="lbl">Ebenen</div><div class="layers">';
  LAYERS.slice().reverse().forEach(l => { h += '<div class="lay' + (l.k === L ? ' on' : '') + '" data-a="layer" data-v="' + l.k + '" title="' + l.d + '"><button class="eye' + (S.vis[l.k] ? '' : ' off') + '" data-a="eye" data-v="' + l.k + '" title="Ebene ein-/ausblenden"' + (l.k === 'ocean' ? ' disabled' : '') + '>' + (S.vis[l.k] ? '👁️' : '🚫') + '</button><span class="li">' + l.i + '</span><span class="ln">' + l.n + '</span></div>'; });
  h += '</div><div class="tools">';
  const seg = (items) => '<div class="seg col">' + items.map(([v, t, tip]) => '<button data-a="tool" data-v="' + v + '" class="' + (T === v ? 'on' : '') + '" title="' + (tip || '') + '">' + t + '</button>').join('') + '</div>';
  const brush = (lab) => '<div class="fld"><label>' + lab + ' <span id="brV">' + S.brush + ' px</span></label><input type="range" min="6" max="140" value="' + S.brush + '" data-f="brush" style="width:100%"></div>';
  if (L === 'ocean') h += '<div class="lbl">Ozean</div><p class="small muted">Die Grundebene: Der Ozean füllt die ganze Karte. Alles andere liegt darüber.</p><div class="fld"><label>Farbton des Meeres</label><div class="seg">' + OCEANS.map((o, i) => '<button data-a="ocean" data-v="' + i + '" class="' + (S.ocean === i ? 'on' : '') + '">' + o.n + '</button>').join('') + '</div></div>';
  if (L === 'land') h += '<div class="lbl">Land – Freihand</div>' + seg([['add', '🖌️ Land malen'], ['erase', '🌊 Land entfernen']]) + brush('Pinselgröße') +
    '<div class="lbl">Land – nach Vorgabe</div><div class="seg col"><button data-a="gen" data-v="kontinent">🌍 Kontinent</button><button data-a="gen" data-v="archipel">🏝️ Archipel</button><button data-a="gen" data-v="gebirge">⛰️ Gebirge</button></div>' + (S.lastGen ? '<button class="btn sm" data-a="regen" style="margin-top:.4em;width:100%">🎲 ' + ({ kontinent: 'Kontinent', archipel: 'Archipel', gebirge: 'Gebirge' }[S.lastGen.kind]) + ' neu würfeln</button>' : '') + '<p class="small muted">Eine Vorgabe lässt sich danach frei mit dem Pinsel überarbeiten.</p>';
  if (L === 'terr') h += '<div class="lbl">Geländeart</div><div class="terrs">' + TERR.slice(1).map((t, i) => '<button data-a="terr" data-v="' + (i + 1) + '" class="' + (S.tt === i + 1 ? 'on' : '') + '"><i style="background:' + t.c + '"></i>' + t.n + '</button>').join('') + '</div>' +
    seg([['paint', '🖌️ Malen'], ['fill', '🪣 Fläche füllen', 'Füllt die zusammenhängende Landfläche gleicher Geländeart'], ['erase', '🧽 Gelände entfernen']]) + brush('Pinselgröße') + '<p class="small muted">Gelände erscheint nur auf Land. Es bestimmt die Klimazone – und damit das Aussehen der Städte.</p>';
  if (L === 'water') h += '<div class="lbl">Gewässer</div>' + seg([['river', '〰️ Fluss zeichnen', 'Von der Quelle zur Mündung ziehen'], ['lake', '💧 See malen'], ['lakeErase', '🧽 See entfernen'], ['select', '👆 Fluss auswählen']]) +
    (T === 'river' ? '<div class="fld"><label>Flussbreite <span id="rwV">' + S.rw + '</span></label><input type="range" min="1.5" max="7" step=".5" value="' + S.rw + '" data-f="rw" style="width:100%"></div>' : '') + (T === 'lake' || T === 'lakeErase' ? brush('Pinselgröße') : '') + '<p class="small muted">Flüsse werden zur Mündung hin breiter.</p>';
  if (L === 'realm') {
    const sel = S.realms[S.rsel - 1];
    h += '<div class="lbl">Reiche</div><div class="rlist">' + (S.realms.length ? S.realms.map((r, i) => '<div class="it' + (S.rsel === i + 1 ? ' sel' : '') + '" data-a="rsel" data-v="' + (i + 1) + '"><i class="rsw" style="background:' + esc(r.col) + '"></i><span class="nm">' + esc(r.name || 'Ohne Namen') + '</span><span class="ty">' + esc(r.type) + ' · ' + Math.round(realmCount(i + 1) / Math.max(1, S.land.reduce((a, v) => a + (v > 127), 0)) * 100) + ' %</span></div>').join('') : '<p class="small muted">Noch kein Reich. Lege eines an oder male einfach los.</p>') + '</div>' +
      '<button class="btn sm" data-a="radd" style="width:100%;margin:.35em 0">＋ Neues Reich</button>';
    if (sel) h += '<div class="selbox" style="margin:.3em 0 .5em"><div class="lbl">Ausgewähltes Reich</div><div style="display:flex;gap:.3em"><input type="text" data-f="rName" value="' + esc(sel.name) + '" style="flex:1;min-width:0;font-weight:700"><button class="dice" data-a="rroll" title="Namen würfeln">🎲</button><input type="color" data-f="rCol" value="' + esc(sel.col) + '" title="Farbe" class="rcol"></div>' +
      '<div class="fld"><label>Art</label><select data-f="rType" style="width:100%">' + REALM_TYPES.map(t => '<option' + (t === sel.type ? ' selected' : '') + '>' + t + '</option>').join('') + (REALM_TYPES.includes(sel.type) ? '' : '<option selected>' + esc(sel.type) + '</option>') + '</select></div>' +
      '<div class="fld"><label>Herrscher</label><input type="text" data-f="rRuler" value="' + esc(sel.ruler || '') + '" placeholder="z. B. König Aldric III." style="width:100%"></div>' +
      '<div class="fld"><label>Hauptstadt</label><select data-f="rCap" style="width:100%"><option value="">–</option>' + S.cities.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(c => '<option value="' + c.id + '"' + (c.id === sel.capital ? ' selected' : '') + '>' + esc(c.name || 'Ohne Namen') + (realmAt(c.x, c.y) === sel ? '' : ' (außerhalb)') + '</option>').join('') + '</select></div>' +
      '<div class="fld"><label>Notizen</label><textarea data-f="rNotes" style="min-height:3em" placeholder="Geschichte, Bündnisse, Feinde …">' + esc(sel.notes || '') + '</textarea></div>' +
      '<button class="btn sm" data-a="rdel">🗑️ Reich löschen</button></div>';
    h += '<div class="lbl">Werkzeug</div>' + seg([['rect', '▭ Rechteck-Auswahl', 'Rahmen aufziehen'], ['poly', '⬠ Vieleck-Auswahl', 'Ecken anklicken, Doppelklick oder Enter schließt'], ['lasso', '➰ Lasso', 'Umriss mit gedrückter Maustaste ziehen'], ['brush', '🖌️ Pinsel'], ['fill', '🪣 Fläche füllen', 'Färbt die zusammenhängende Landfläche (z. B. eine Insel)'], ['pick', '👆 Reich anklicken']]) +
      (T === 'brush' ? brush('Pinselgröße') : '') +
      '<div class="lbl">Modus</div><div class="seg"><button data-a="rmode" data-v="add" class="' + (S.rmode === 'add' ? 'on' : '') + '">➕ Zuweisen</button><button data-a="rmode" data-v="del" class="' + (S.rmode === 'del' ? 'on' : '') + '">➖ Entfernen</button></div>' +
      '<label class="chk"><input type="checkbox" data-f="rKeep"' + (S.rkeep ? ' checked' : '') + '> ' + (S.rmode === 'add' ? 'Andere Reiche nicht überschreiben' : 'Nur das ausgewählte Reich entfernen') + '</label>' +
      '<label class="chk"><input type="checkbox" data-f="rNames"' + (S.opt.realmNames ? ' checked' : '') + '> Namen der Reiche anzeigen</label>' +
      '<p class="small muted">Eingefärbt werden nur Landflächen samt Seen und Flüssen – das Meer bleibt frei. Ein- und ausblenden über 👑 Reiche oben oder das Auge.</p>';
  }
  if (L === 'road') h += '<div class="lbl">Wege und Straßen</div>' + seg([['strasse', '🛣️ Straße zeichnen'], ['weg', '🥾 Weg zeichnen'], ['select', '👆 Auswählen']]) + '<p class="small muted">Kreuzt eine Straße oder ein Weg einen Fluss, entsteht dort automatisch eine <b>Brücke</b>. Enden rasten an nahen Städten ein.</p><p class="small">🌉 Brücken: <b>' + bridges().length + '</b></p>';
  if (L === 'city') h += '<div class="lbl">Städte</div>' + seg([['place', '🏰 Stadt setzen'], ['select', '👆 Auswählen / verschieben']]) +
    '<div class="fld"><label>Neue Städte: Art</label>' + sel('csStyle', S.cs.style, STYLES.map(s => [s, s])) + '</div><div class="fld"><label>Neue Städte: Volk</label>' + sel('csRace', S.cs.race, RACES.map(r => [r, RACE_PL[r]])) + '</div>' +
    '<p class="small muted">„Automatisch“ richtet sich nach der Klimazone: Gebirge → Zwerge, Festung · Wald → Elfen, Stadt · Wiese, Wüste, Küste → Menschen, Stadt.</p>';
  h += '</div><div id="selBox"></div>';
  if (L === 'city' && S.cities.length) h += '<div class="lbl" style="padding:0 .6em">Alle Städte (' + S.cities.length + ')</div><div class="clist">' + S.cities.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(c => { const R = resolve(c); return '<div class="it' + (S.sel && S.sel.id === c.id ? ' sel' : '') + '" data-a="pick" data-v="' + c.id + '"><span class="nm">' + esc(c.name || 'Ohne Namen') + '</span><span class="ty">' + R.style + ' · ' + RACE_PL[R.race] + '</span></div>'; }).join('') + '</div>';
  $('#side').innerHTML = h; renderSel();
}
const sel = (id, val, items) => '<select data-f="' + id + '" style="width:100%"><option value="">Automatisch (nach Klimazone)</option>' + items.map(([v, t]) => '<option value="' + esc(v) + '"' + (v === val ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select>';
function renderSel() {
  const box = $('#selBox'); if (!box) return; const o = selObj(); if (!o) { box.innerHTML = ''; drawUi(); return; }
  let h = '<div class="selbox">';
  if (S.sel.k === 'city') { const R = resolve(o);
    h += '<div class="lbl">Ausgewählte Stadt</div><div style="display:flex;gap:.3em"><input type="text" data-f="cName" value="' + esc(o.name) + '" placeholder="Name" style="flex:1;min-width:0;font-weight:700"><button class="dice" data-a="rename" title="Namen würfeln (passend zum Volk)">🎲</button></div>' +
      '<div class="fld"><label>Art</label>' + sel('cStyle', o.style, STYLES.map(s => [s, s])) + '</div><div class="fld"><label>Volk (Besitzer)</label>' + sel('cRace', o.race, RACES.map(r => [r, RACE_PL[r]])) + '</div>' +
      '<canvas id="prev" width="456" height="210" class="prev"></canvas><div class="small"><b>Klimazone:</b> ' + ZONE_N[R.zone] + (R.coast ? ' · Küste' : '') + (realmAt(o.x, o.y) ? '<br><b>Reich:</b> ' + esc(realmFull(realmAt(o.x, o.y))) + (realmAt(o.x, o.y).capital === o.id ? ' (Hauptstadt)' : '') : '') + '<br><b>Abbild:</b> ' + esc(lookText(R)) + (R.autoRace || R.autoStyle ? '<br><span class="muted">' + (R.autoRace ? 'Volk' : '') + (R.autoRace && R.autoStyle ? ' und ' : '') + (R.autoStyle ? 'Art' : '') + ' automatisch aus der Klimazone</span>' : '') + '</div>';
    const at = ensureA(o), sm = at.races.reduce((q, r) => q + (+r.p || 0), 0), opt = (l, cur) => l.map(x => '<option' + (x === cur ? ' selected' : '') + '>' + x + '</option>').join('');
    h += '<button class="btn primary" data-a="cmap" style="width:100%;margin:.6em 0 .2em">🏘️ Stadtkarte ' + (o.map ? 'bearbeiten' : 'erstellen') + '</button>' +
      '<div class="lbl">Eigenschaften (wie im Atlas)</div><div class="fld"><label>Größe</label><select data-f="aType" style="width:100%">' + opt(A_TYPES, at.type) + '</select></div>' +
      '<div class="two"><div class="fld"><label>Dichte</label><select data-f="aDens">' + opt(A_DENS, at.density) + '</select></div><div class="fld"><label>Reichtum</label><select data-f="aWealth">' + opt(A_WEALTH, at.wealth) + '</select></div></div>' +
      '<div class="fld"><label>Völker <button class="dice" data-a="aRollRaces" title="Völker neu würfeln">🎲</button></label><div class="bar">' + at.races.filter(r => +r.p > 0).map(r => '<i title="' + esc(r.n) + ' ' + r.p + ' %" style="width:' + (r.p / Math.max(100, sm) * 100) + '%;background:' + (RACE_COL[r.n] || '#8a6f9e') + '"></i>').join('') + '</div>' +
      at.races.map((r, i) => '<div class="rrow"><input type="text" list="raceL" data-f="aRN" data-i="' + i + '" value="' + esc(r.n) + '"><input type="number" min="0" max="100" data-f="aRP" data-i="' + i + '" value="' + (+r.p || 0) + '"><span class="small">%</span><button class="x" data-a="aDelRace" data-v="' + i + '">✕</button></div>').join('') +
      '<div style="display:flex;gap:.3em;align-items:center;flex-wrap:wrap"><button class="btn sm" data-a="aAddRace">＋ Volk</button><button class="btn sm" data-a="aNorm">⚖️ 100 %</button><span class="small' + (Math.round(sm) !== 100 ? ' bad' : '') + '">Summe ' + Math.round(sm) + ' %</span></div><datalist id="raceL">' + RACES.map(r => '<option value="' + r + '">').join('') + '</datalist></div>' +
      '<div class="fld"><label>Zahlen <button class="dice" data-a="aRoll" title="Einwohner und Anzahlen neu würfeln">🎲 alle</button></label><div class="nums2">' + [['pop', 'Einwohner'], ['lodging', 'Unterkünfte'], ['restaurants', 'Restaurants'], ['shops', 'Geschäfte']].map(n => '<span>' + n[1] + '</span><input type="number" min="0" data-f="aN" data-k="' + n[0] + '" value="' + (+at[n[0]] || 0) + '">').join('') + '</div></div>' +
      '<div class="fld"><label>Notizen</label><textarea data-f="aNotes" style="min-height:3em" placeholder="Herrscher, Gerüchte …">' + esc(at.notes || '') + '</textarea></div>';
  } else if (S.sel.k === 'river') h += '<div class="lbl">Ausgewählter Fluss</div><div class="fld"><label>Breite <span>' + o.w + '</span></label><input type="range" min="1.5" max="7" step=".5" value="' + o.w + '" data-f="oW" style="width:100%"></div>';
  else h += '<div class="lbl">Ausgewählte' + (o.type === 'weg' ? 'r Weg' : ' Straße') + '</div><div class="seg"><button data-a="rtype" data-v="strasse" class="' + (o.type === 'strasse' ? 'on' : '') + '">🛣️ Straße</button><button data-a="rtype" data-v="weg" class="' + (o.type === 'weg' ? 'on' : '') + '">🥾 Weg</button></div>';
  h += '<div style="margin-top:.5em"><button class="btn sm" data-a="del">🗑️ Löschen <kbd>Entf</kbd></button></div></div>';
  box.innerHTML = h;
  const pv = $('#prev'); if (pv && S.sel.k === 'city') { const R = resolve(o), g = pv.getContext('2d'), art = S.view === 'ink' ? 'ink' : 'art'; g.fillStyle = art === 'ink' ? '#ead9ae' : toHex(TC.art[R.terr]); g.fillRect(0, 0, 456, 210); g.save(); g.translate(228, 168); g.scale(6.4, 6.4); cityIcon(g, R, art); g.restore(); }
  drawUi();
}

/* ---------- Zeichnen im Editor ---------- */
let dirty = null, rafD = 0, decoT = 0;
function redrawBase() { const g = cvB.getContext('2d'), w = cvB.width, h = cvB.height; for (let y = 0; y < h; y += 256) g.putImageData(renderBase(ES, S.view, 0, y, w, Math.min(256, h - y), S.vis), 0, y); }
function redrawDeco() { clearTimeout(decoT); decoT = 0; const g = cvD.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cvD.width, cvD.height); g.save(); g.scale(ES, ES); drawDeco(g, S.view, S.vis); drawOverlay(g, S.view, EOPT(), S.vis); g.restore(); drawUi(); }
function redrawAll() { S.rv++; S.rl++; computeSD(); redrawBase(); redrawDeco(); persist(); }
function decoSoon(ms) { if (!decoT) decoT = setTimeout(() => { decoT = 0; redrawDeco(); }, ms || 160); }
function touch(x0, y0, x1, y1) { if (!dirty) dirty = [x0, y0, x1, y1]; else { dirty[0] = Math.min(dirty[0], x0); dirty[1] = Math.min(dirty[1], y0); dirty[2] = Math.max(dirty[2], x1); dirty[3] = Math.max(dirty[3], y1); } if (!rafD) rafD = requestAnimationFrame(flushDirty); }
function flushDirty() { rafD = 0; if (!dirty) return; const d = dirty; dirty = null; computeSD();
  const rx = clamp(Math.floor(d[0] * ES) - 2, 0, cvB.width - 1), ry = clamp(Math.floor(d[1] * ES) - 2, 0, cvB.height - 1), rw = clamp(Math.ceil(d[2] * ES) + 2, 1, cvB.width) - rx, rh = clamp(Math.ceil(d[3] * ES) + 2, 1, cvB.height) - ry;
  if (rw > 0 && rh > 0) cvB.getContext('2d').putImageData(renderBase(ES, S.view, rx, ry, rw, rh, S.vis), rx, ry); if (S.realms.length) realmPatch(d[0], d[1], d[2], d[3]); decoSoon(); }
function applyView() { stage.style.transform = 'translate(' + S.v.tx + 'px,' + S.v.ty + 'px) scale(' + S.v.s + ')'; drawUi(); }
function fitView() { const r = wrap.getBoundingClientRect(); S.v.s = Math.min((r.width - 30) / S.W, (r.height - 30) / S.H) || 1; S.v.tx = (r.width - S.W * S.v.s) / 2; S.v.ty = (r.height - S.H * S.v.s) / 2; applyView(); }
function zoomAt(f, px, py) { const r = wrap.getBoundingClientRect(); if (px === undefined) { px = r.width / 2; py = r.height / 2; } const ns = clamp(S.v.s * f, .15, 8), k = ns / S.v.s; S.v.tx = px - (px - S.v.tx) * k; S.v.ty = py - (py - S.v.ty) * k; S.v.s = ns; applyView(); }
const toMap = e => { const r = wrap.getBoundingClientRect(); return { x: (e.clientX - r.left - S.v.tx) / S.v.s, y: (e.clientY - r.top - S.v.ty) / S.v.s, px: e.clientX - r.left, py: e.clientY - r.top }; };
let drag = null, mouse = null, space = false;
const isBrush = () => (S.layer === 'land') || (S.layer === 'realm' && curTool() === 'brush') || (S.layer === 'terr' && curTool() !== 'fill') || (S.layer === 'water' && (curTool() === 'lake' || curTool() === 'lakeErase'));
function drawUi() {
  if (!ui) return; const v = S.v, P = p => (p[0] * v.s + v.tx).toFixed(1) + ' ' + (p[1] * v.s + v.ty).toFixed(1); let h = '';
  const o = selObj();
  if (o && S.sel.k === 'city') { const R = resolve(o), d = ICON_DIM[R.style], u = iconU() * v.s; h += '<rect x="' + (o.x * v.s + v.tx - d[0] * u / 2 - 5) + '" y="' + (o.y * v.s + v.ty - d[1] * u - 6) + '" width="' + (d[0] * u + 10) + '" height="' + (d[1] * u + 12) + '" rx="5" class="selr"/>'; }
  else if (o) h += '<path d="M' + smooth(o).map(P).join('L') + '" class="sell"/>';
  if (drag && drag.k === 'line' && drag.pts.length > 1) h += '<path d="M' + drag.pts.map(P).join('L') + '" class="drawl ' + (S.layer === 'water' ? 'w' : 'r') + '"/>';
  if (drag && drag.k === 'rsel') { if (drag.t === 'rect') { const x0 = Math.min(drag.a.x, drag.b.x), y0 = Math.min(drag.a.y, drag.b.y); h += '<rect x="' + (x0 * v.s + v.tx) + '" y="' + (y0 * v.s + v.ty) + '" width="' + Math.abs(drag.b.x - drag.a.x) * v.s + '" height="' + Math.abs(drag.b.y - drag.a.y) * v.s + '" class="rsel"/>'; } else if (drag.pts.length > 1) h += '<path d="M' + drag.pts.map(P).join('L') + 'Z" class="rsel"/>'; }
  if (S.rpoly && S.rpoly.length) { const pts = S.rpoly.concat(mouse ? [[mouse.x, mouse.y]] : []); h += '<path d="M' + pts.map(P).join('L') + '" class="rsel"/>' + S.rpoly.map(q => '<circle cx="' + (q[0] * v.s + v.tx) + '" cy="' + (q[1] * v.s + v.ty) + '" r="4" fill="#8a2222"/>').join(''); }
  if (mouse && isBrush() && !space) h += '<circle cx="' + mouse.px + '" cy="' + mouse.py + '" r="' + (S.brush * v.s) + '" class="cur"/>';
  ui.innerHTML = h;
}
function hitCity(p) { const u = iconU(); let best = null; for (const c of S.cities) { const d = ICON_DIM[resolve(c).style]; if (Math.abs(p.x - c.x) < d[0] * u / 2 + 4 && p.y > c.y - d[1] * u - 4 && p.y < c.y + 14 * u) best = c; } return best; }
function hitLine(list, p) { let b = null, m = 7 / S.v.s + 3; for (const o of list) { const d = distToLine(o, p.x, p.y); if (d < m) { m = d; b = o; } } return b; }
function realmTarget() { return S.rmode === 'add' ? S.rsel : 0; }
function realmKeep() { return S.rkeep ? (S.rmode === 'add' ? 1 : S.rsel) : 0; }
function realmDone(box) { if (box) realmPatch(box[0], box[1], box[2], box[3]); else { S.rv++; S.rl++; } redrawDeco(); persist(); }
function strokeBrush(a, b) {
  const L = S.layer, T = curTool(), r = S.brush, n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / Math.max(2, r / 3)));
  if (L === 'realm') { const id = realmTarget(), kp = realmKeep(); for (let i = 1; i <= n; i++) realmBrush(a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n, r, id, kp && id ? S.rsel : kp); realmPatch(Math.min(a.x, b.x) - r - 12, Math.min(a.y, b.y) - r - 12, Math.max(a.x, b.x) + r + 12, Math.max(a.y, b.y) + r + 12); decoSoon(90); return; }
  for (let i = 1; i <= n; i++) { const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n;
    if (L === 'land') paintField(S.land, x, y, r, T === 'add'); else if (L === 'terr') paintTerr(x, y, r, T === 'erase' ? 0 : S.tt); else paintField(S.lake, x, y, r, T === 'lake'); }
  const m = r + 40; touch(Math.min(a.x, b.x) - m, Math.min(a.y, b.y) - m, Math.max(a.x, b.x) + m, Math.max(a.y, b.y) + m);
}
function bindMap() {
  wrap.addEventListener('contextmenu', e => e.preventDefault());
  wrap.addEventListener('wheel', e => { e.preventDefault(); const p = toMap(e); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.px, p.py); }, { passive: false });
  wrap.addEventListener('pointerdown', e => {
    if (e.target.closest('.zoomctl')) return; const p = toMap(e); wrap.setPointerCapture(e.pointerId);
    const L = S.layer, T = curTool();
    if (e.button !== 0 || space || L === 'ocean') { drag = { k: 'pan', px: e.clientX, py: e.clientY, tx: S.v.tx, ty: S.v.ty }; wrap.classList.add('pan'); return; }
    if (!S.vis[L]) { S.vis[L] = true; renderTop(); renderSide(); redrawAll(); }
    if (L === 'realm') {
      if (T === 'pick') { const r = realmAt(p.x, p.y); if (r) { S.rsel = S.realms.indexOf(r) + 1; renderSide(); } else toast(landAt(p.x, p.y) ? 'Dieses Gebiet gehört zu keinem Reich.' : 'Das Meer gehört zu keinem Reich.'); return; }
      if (S.rmode === 'add' && !S.realms[S.rsel - 1]) { S.rsel = newRealm(); renderSide(); toast('Neues Reich „' + S.realms[S.rsel - 1].name + '“ angelegt.'); }
      if (S.rmode === 'del' && S.rkeep && !S.rsel) { toast('Bitte zuerst ein Reich auswählen.'); return; }
      if (T === 'fill') { pushUndo(); const n = realmFill(p.x, p.y, realmTarget()); if (!n) { S.undo.pop(); toast(landAt(p.x, p.y) ? 'Diese Fläche hat schon diese Zugehörigkeit.' : 'Füllen geht nur auf Land – das Meer bleibt frei.'); } else { realmDone(); renderSide(); } return; }
      if (T === 'rect' || T === 'lasso') { drag = { k: 'rsel', t: T, pts: [[p.x, p.y]], a: p, b: p }; return; }
      if (T === 'poly') { if (!S.rpoly) S.rpoly = []; const f = S.rpoly[0]; if (S.rpoly.length >= 3 && Math.hypot(f[0] - p.x, f[1] - p.y) < 10 / S.v.s) { finishRealmPoly(); return; } S.rpoly.push([p.x, p.y]); drawUi(); return; }
    }
    if (isBrush()) { pushUndo(); drag = { k: 'brush', last: p }; strokeBrush(p, p); return; }
    if (L === 'terr') { pushUndo(); const n = fillTerr(p.x, p.y, S.tt); if (!n) { S.undo.pop(); toast('Hier ist kein Land oder die Fläche hat schon diese Geländeart.'); } else redrawAll(); return; }
    if ((L === 'water' && T === 'river') || (L === 'road' && T !== 'select')) { drag = { k: 'line', pts: [[p.x, p.y]] }; return; }
    if (L === 'city') { const c = hitCity(p);
      if (c) { S.sel = { k: 'city', id: c.id }; drag = { k: 'move', c, ox: p.x - c.x, oy: p.y - c.y, moved: false }; renderSide(); return; }
      if (T === 'place') { if (!landAt(p.x, p.y) || lakeAt(p.x, p.y)) { toast('Städte brauchen festen Boden – bitte auf Land setzen.'); return; }
        pushUndo(); const c2 = { id: uid('s'), x: Math.round(p.x), y: Math.round(p.y), name: '', style: S.cs.style, race: S.cs.race }; c2.name = genName(resolve(c2)); ensureA(c2); S.cities.push(c2); S.sel = { k: 'city', id: c2.id }; renderSide(); redrawDeco(); persist(); return; }
      S.sel = null; renderSide(); return; }
    const o = hitLine(L === 'water' ? S.rivers : S.roads, p); S.sel = o ? { k: L === 'water' ? 'river' : 'road', id: o.id } : null; renderSel();
  });
  wrap.addEventListener('pointermove', e => {
    const p = toMap(e); mouse = p;
    if (drag) {
      if (drag.k === 'pan') { S.v.tx = drag.tx + e.clientX - drag.px; S.v.ty = drag.ty + e.clientY - drag.py; applyView(); return; }
      if (drag.k === 'brush') { strokeBrush(drag.last, p); drag.last = p; }
      else if (drag.k === 'rsel') { drag.b = p; const l = drag.pts[drag.pts.length - 1]; if (drag.t === 'lasso' && Math.hypot(p.x - l[0], p.y - l[1]) > 3 / S.v.s) drag.pts.push([p.x, p.y]); }
      else if (drag.k === 'line') { const l = drag.pts[drag.pts.length - 1]; if (Math.hypot(p.x - l[0], p.y - l[1]) > 3 / Math.min(1, S.v.s)) drag.pts.push([p.x, p.y]); }
      else if (drag.k === 'move') { const nx = p.x - drag.ox, ny = p.y - drag.oy; if (!drag.moved && Math.hypot(nx - drag.c.x, ny - drag.c.y) < 3) return; if (!drag.moved) { pushUndo(); drag.moved = true; } if (landAt(nx, ny)) { drag.c.x = Math.round(nx); drag.c.y = Math.round(ny); decoSoon(40); } }
    } else status(p);
    drawUi();
  });
  const up = e => {
    const d = drag; drag = null; wrap.classList.remove('pan'); if (!d) return;
    if (d.k === 'brush' && S.layer === 'realm') { redrawDeco(); persist(); renderSide(); }
    else if (d.k === 'rsel') { pushUndo(); const id = realmTarget(), kp = realmKeep(), k2 = kp && id ? S.rsel : kp; let n = 0, box;
      if (d.t === 'rect') { n = realmRect(d.a, d.b, id, k2); box = [Math.min(d.a.x, d.b.x), Math.min(d.a.y, d.b.y), Math.max(d.a.x, d.b.x), Math.max(d.a.y, d.b.y)]; }
      else if (d.pts.length > 2) { n = realmPoly(d.pts, id, k2); box = [1e9, 1e9, -1e9, -1e9]; d.pts.forEach(q => { box[0] = Math.min(box[0], q[0]); box[1] = Math.min(box[1], q[1]); box[2] = Math.max(box[2], q[0]); box[3] = Math.max(box[3], q[1]); }); }
      if (!n) { S.undo.pop(); drawUi(); if (Math.hypot(d.b.x - d.a.x, d.b.y - d.a.y) > 8) toast('Im Rahmen liegt kein Land, das sich ändern lässt.'); return; }
      realmDone([box[0] - 12, box[1] - 12, box[2] + 12, box[3] + 12]); renderSide(); }
    else if (d.k === 'brush') { invalidate(); if (rafD) { cancelAnimationFrame(rafD); flushDirty(); } redrawAll(); if (S.layer === 'land' || S.layer === 'terr') renderSel(); }
    else if (d.k === 'line') { let len = 0; for (let i = 1; i < d.pts.length; i++) len += Math.hypot(d.pts[i][0] - d.pts[i - 1][0], d.pts[i][1] - d.pts[i - 1][1]);
      if (len < 14) { drawUi(); return; } pushUndo(); const pts = simplify(d.pts, 2.2);
      if (S.layer === 'water') { const o = { id: uid('r'), pts, w: S.rw }; S.rivers.push(o); }
      else { for (const k of [0, pts.length - 1]) { let b = null, m = 22; for (const c of S.cities) { const dd = Math.hypot(c.x - pts[k][0], c.y - pts[k][1]); if (dd < m) { m = dd; b = c; } } if (b) pts[k] = [b.x, b.y]; } S.roads.push({ id: uid('w'), pts, type: curTool() }); }
      invalidate(); const nb = bridges().length; redrawDeco(); persist(); if (S.layer === 'road') { renderSide(); if (nb > (up.nb || 0)) toast('🌉 Brücke gebaut – die Straße kreuzt einen Fluss.'); } up.nb = nb; }
    else if (d.k === 'move') { if (d.moved) { redrawDeco(); persist(); renderSide(); } }
  };
  wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
  wrap.addEventListener('pointerleave', () => { mouse = null; drawUi(); });
  wrap.addEventListener('dblclick', () => { if (S.rpoly) { S.rpoly.pop(); finishRealmPoly(); } });
}
function finishRealmPoly() { const pts = S.rpoly; S.rpoly = null; if (!pts || pts.length < 3) { drawUi(); return; } pushUndo(); const id = realmTarget(), kp = realmKeep(), n = realmPoly(pts, id, kp && id ? S.rsel : kp); if (!n) { S.undo.pop(); toast('Im Vieleck liegt kein Land, das sich ändern lässt.'); drawUi(); return; } let b = [1e9, 1e9, -1e9, -1e9]; pts.forEach(q => { b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[0]); b[3] = Math.max(b[3], q[1]); }); realmDone([b[0] - 12, b[1] - 12, b[2] + 12, b[3] + 12]); renderSide(); drawUi(); }
function status(p) { const s = $('#status'); if (!s) return; if (p.x < 0 || p.y < 0 || p.x >= S.W || p.y >= S.H) { s.textContent = ''; return; } const ld = landAt(p.x, p.y); s.textContent = Math.round(p.x) + ' , ' + Math.round(p.y) + ' · ' + (ld ? (lakeAt(p.x, p.y) ? 'See' : 'Land · ' + TERR[terrAt(p.x, p.y)].n + ' · Klimazone ' + ZONE_N[ZONE_OF[terrAt(p.x, p.y)]]) + (S.realms.length && realmAt(p.x, p.y) ? ' · 👑 ' + realmFull(realmAt(p.x, p.y)) : '') : 'Ozean'); }

/* ---------- Generator-Dialog ---------- */
const GEN_N = { kontinent: ['🌍 Kontinent', 'Eine große, zusammenhängende Landmasse mit zerklüfteter Küste.'], archipel: ['🏝️ Archipel', 'Viele große und kleine Inseln, verstreut über das Meer.'], gebirge: ['⛰️ Gebirge', 'Ein Land, das von einem mächtigen Gebirgszug durchzogen wird.'] };
function genDialog(kind) {
  modal('<h2>' + GEN_N[kind][0] + '</h2><p class="sub2">' + GEN_N[kind][1] + '</p><div class="fld"><label>Zufallszahl (gleiche Zahl = gleiche Welt)</label><div style="display:flex;gap:.4em"><input type="number" id="gSeed" value="' + ((Math.random() * 99999) | 0) + '" style="flex:1"><button class="dice" data-a="gseed">🎲</button></div></div>' +
    '<div class="fld"><label class="chk"><input type="checkbox" id="gTerr" checked> Gelände automatisch verteilen (Wald, Wüste, Gebirge …)</label><label class="chk"><input type="checkbox" id="gRiv" checked> Flüsse erzeugen</label></div>' +
    '<div class="note">Die Vorgabe ersetzt Land, Gelände, Gewässer und Straßen. Städte, die danach noch auf Land stehen, bleiben erhalten. Mit ↶ lässt sich alles zurücknehmen.</div>' +
    '<div class="foot"><button class="btn" data-a="close">Abbrechen</button><button class="btn primary" data-a="gen-ok" data-v="' + kind + '">✨ Erzeugen</button></div>');
}
function runGen(kind, seed, o) { return busy('Die Welt entsteht …', () => { pushUndo(); generate(kind, seed, o); S.lastGen = { kind, o }; S.sel = null; redrawAll(); renderSide(); }); }

/* ---------- Export ---------- */
const FMT = [['png', 'PNG', 'verlustfrei, beste Qualität'], ['jpg', 'JPG', 'klein, für Web und Atlas'], ['webp', 'WebP', 'sehr klein, moderne Browser'], ['svg', 'SVG', 'Städte, Wege, Flüsse und Namen als Vektoren'], ['pdf', 'PDF', 'zum Drucken'], ['atlas', 'Atlas-Projekt', 'öffnet sich im DND5e Atlas mit allen Städten']];
const X = { st: 'art', fmt: 'png', sc: 1, page: 'map' };
function exportDialog(fmt) {
  if (fmt) X.fmt = fmt; X.st = S.view; const o = S.opt;
  const ck = (k, t) => '<label class="chk"><input type="checkbox" data-o="' + k + '"' + (o[k] ? ' checked' : '') + '> ' + t + '</label>';
  const m = modal('<h2>Rendern &amp; Exportieren</h2><div class="lbl">Stil</div><div class="styles">' + RSTYLES.map(r => '<div class="stc" data-st="' + r.k + '"><canvas></canvas><b>' + r.n + '</b><span class="small muted">' + r.d + '</span></div>').join('') + '</div>' +
    '<div class="lbl" style="margin-top:.7em">Dateiformat</div><div class="fmts">' + FMT.map(f => '<button data-fmt="' + f[0] + '"><b>' + f[1] + '</b><span>' + f[2] + '</span></button>').join('') + '</div>' +
    '<div class="xgrid"><div><div class="lbl">Auf der Karte</div>' + ck('names', 'Ortsnamen') + ck('realmNames', 'Namen der Reiche') + ck('title', 'Titel (Name der Welt)') + ck('frame', 'Rahmen') + ck('compass', 'Kompassrose') + ck('scale', 'Maßstab: 100 px = <input type="number" id="xMiles" min="1" value="' + o.miles + '" style="width:4.2em"> Meilen') + ck('grid', 'Gradnetz (nur Realistisch)') + '</div>' +
    '<div><div class="lbl">Größe</div><div class="fld"><div class="seg" id="xSc"><button data-v="1" class="' + (X.sc === 1 ? 'on' : '') + '">' + S.W + ' × ' + S.H + '</button><button data-v="2" class="' + (X.sc === 2 ? 'on' : '') + '">' + S.W * 2 + ' × ' + S.H * 2 + ' (doppelt)</button></div></div>' +
    '<div class="fld"><label>Größe der Stadtsymbole <span id="xIcV">' + Math.round(o.icon * 100) + ' %</span></label><input type="range" id="xIcon" min=".7" max="1.4" step=".05" value="' + o.icon + '" style="width:100%"></div>' +
    '<div class="fld" id="xPageF"><label>PDF-Seite</label><div class="seg" id="xPage"><button data-v="map" class="' + (X.page === 'map' ? 'on' : '') + '">Kartengröße</button><button data-v="a4" class="' + (X.page === 'a4' ? 'on' : '') + '">A4 quer</button><button data-v="a3" class="' + (X.page === 'a3' ? 'on' : '') + '">A3 quer</button></div></div></div></div>' +
    '<div class="note" id="xNote"></div><div class="foot"><button class="btn" data-a="close">Schließen</button><button class="btn primary" data-a="export-ok">⬇️ Exportieren</button></div>', 860);
  const upd = () => { $$('.stc', m).forEach(e => e.classList.toggle('on', e.dataset.st === X.st)); $$('.fmts button', m).forEach(e => e.classList.toggle('on', e.dataset.fmt === X.fmt)); $('#xPageF', m).style.display = X.fmt === 'pdf' ? '' : 'none';
    const hid = LAYERS.filter(l => !S.vis[l.k]).map(l => l.n);
    $('#xNote', m).innerHTML = (X.fmt === 'atlas' ? '🧭 <b>Atlas-Projekt:</b> Die Datei <i>' + esc(baseName(S.name)) + '_Atlas.json</i> im DND5e Atlas über „Projekt öffnen“ laden (oder hineinziehen). Alle ' + S.cities.length + ' Städte sind dort sofort anklickbar – mit denselben Eigenschaften wie hier. Städte mit Stadtkarte (' + S.cities.filter(c => c.map).length + ') bringen ihre Karte und ihre Läden als PoI mit. Ortsnamen zeigt der Atlas selbst an, deshalb werden sie nicht ins Bild gezeichnet.' : X.fmt === 'svg' ? 'SVG: Der Untergrund (Meer, Land, Gelände) ist als Bild eingebettet; Flüsse, Wege, Brücken, Städte und Namen sind echte Vektoren. Der Atlas erkennt die Städte darin automatisch.' : 'PNG, JPG und WebP lassen sich im Atlas als Karte laden; am bequemsten ist das Format „Atlas-Projekt“.') + (hid.length ? '<br>⚠️ Ausgeblendete Ebenen werden nicht gerendert: ' + hid.join(', ') + '.' : ''); };
  const thumbs = () => $$('.stc', m).forEach(e => { try { renderMap($('canvas', e), e.dataset.st, 264 / S.W, Object.assign({}, S.opt, { scale: false }), S.vis); } catch (er) { console.error(er); } });
  m.addEventListener('click', e => { const s = e.target.closest('.stc'), f = e.target.closest('.fmts button'); if (s) X.st = s.dataset.st; if (f) X.fmt = f.dataset.fmt; if (s || f) upd(); });
  m.addEventListener('change', e => { const k = e.target.dataset.o; if (k) { S.opt[k] = e.target.checked; thumbs(); persist(); } if (e.target.id === 'xMiles') { S.opt.miles = Math.max(1, +e.target.value || 50); persist(); } });
  $('#xIcon', m).addEventListener('input', e => { S.opt.icon = +e.target.value; $('#xIcV', m).textContent = Math.round(S.opt.icon * 100) + ' %'; });
  $('#xIcon', m).addEventListener('change', () => { thumbs(); redrawDeco(); persist(); });
  segPick(m, '#xSc', v => { X.sc = +v; }); segPick(m, '#xPage', v => { X.page = v; });
  upd(); fontsReady().then(thumbs);
}
const toBlob = (cv, type, q) => new Promise(res => cv.toBlob(res, type, q));
async function doExport() {
  const st = X.st, o = Object.assign({}, S.opt), name = baseName(S.name), sn = { art: 'Kuenstlerisch', real: 'Realistisch', ink: 'Gezeichnet' }[st];
  await fontsReady();
  if (X.fmt === 'atlas') { o.names = false; const cv = renderMap(document.createElement('canvas'), st, 1, o, S.vis); download(name + '_Atlas.json', new Blob([JSON.stringify(atlasProject(cv.toDataURL('image/jpeg', .92), name))], { type: 'application/json' })); toast('Atlas-Projekt gespeichert – im DND5e Atlas über „Projekt öffnen“ laden.'); return; }
  if (X.fmt === 'svg') { download(name + '_' + sn + '.svg', new Blob([buildSvg(st, X.sc, o)], { type: 'image/svg+xml' })); toast('SVG gespeichert.'); return; }
  const cv = renderMap(document.createElement('canvas'), st, X.sc, o, S.vis);
  if (X.fmt === 'pdf') { const jpg = new Uint8Array(await (await toBlob(cv, 'image/jpeg', .93)).arrayBuffer()); download(name + '_' + sn + '.pdf', new Blob([buildPdf(jpg, cv.width, cv.height, X.page, S.name)], { type: 'application/pdf' })); toast('PDF gespeichert.'); return; }
  const mime = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[X.fmt], bl2 = await toBlob(cv, mime, .93);
  if (!bl2 || (X.fmt === 'webp' && bl2.type !== 'image/webp')) { toast('Dieser Browser kann kein WebP schreiben – bitte PNG oder JPG wählen.'); return; }
  download(name + '_' + sn + '.' + X.fmt, bl2); toast(X.fmt.toUpperCase() + ' gespeichert.');
}
function fontCss(names) { const t = ($('#fontcss') || {}).textContent || ''; return t.split('@font-face').filter(r => names.some(n => r.includes("'" + n + "'")) && /font-style:normal/.test(r) && /font-weight:normal/.test(r)).map(r => '@font-face' + r.trim()).join('\n'); }
function buildSvg(st, sc, o) {
  const cv = renderMap(document.createElement('canvas'), st, sc, o, S.vis, 'ground'), g = new SvgCtx(); drawOverlay(g, st, o, S.vis);
  return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + S.W + '" height="' + S.H + '" viewBox="0 0 ' + S.W + ' ' + S.H + '">\n<title>' + esc(S.name) + '</title>\n<desc>Erstellt mit The Ultimate DND5e Kartenschmiede</desc>\n' +
    (st === 'real' ? '' : '<style>' + fontCss(o.scale ? ['EB Title', 'EB Body'] : ['EB Title']) + '</style>\n') +
    '<image id="untergrund" x="0" y="0" width="' + S.W + '" height="' + S.H + '" preserveAspectRatio="none" href="' + cv.toDataURL('image/jpeg', .92) + '"/>\n' + g.out.join('\n') + '\n</svg>';
}
function buildPdf(jpg, iw, ih, page, title) {
  let pw, ph, w, h, x = 0, y = 0;
  if (page === 'map') { pw = w = Math.round(iw * 72 / 150 / (iw > 2600 ? 2 : 1)); ph = h = Math.round(pw * ih / iw); }
  else { [pw, ph] = page === 'a3' ? [1190.55, 841.89] : [841.89, 595.28]; const mg = 28.35, k = Math.min((pw - 2 * mg) / iw, (ph - 2 * mg) / ih); w = iw * k; h = ih * k; x = (pw - w) / 2; y = (ph - h) / 2; }
  const enc = new TextEncoder(), parts = [], offs = []; let pos = 0; const add = d => { const u = typeof d === 'string' ? enc.encode(d) : d; parts.push(u); pos += u.length; };
  let th = 'FEFF'; for (const ch of String(title || 'Karte')) { const c = ch.codePointAt(0); if (c < 0x10000) th += c.toString(16).padStart(4, '0').toUpperCase(); }
  const cont = 'q ' + w.toFixed(2) + ' 0 0 ' + h.toFixed(2) + ' ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' cm /Im0 Do Q';
  add('%PDF-1.4\n%âãÏÓ\n');
  const obj = (n, body, stream) => { offs[n] = pos; add(n + ' 0 obj\n' + body + '\n'); if (stream) { add('stream\n'); add(stream); add('\nendstream\n'); } add('endobj\n'); };
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>'); obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pw + ' ' + ph + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
  obj(4, '<< /Type /XObject /Subtype /Image /Width ' + iw + ' /Height ' + ih + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>', jpg);
  obj(5, '<< /Length ' + cont.length + ' >>', cont); obj(6, '<< /Title <' + th + '> /Creator (The Ultimate DND5e Kartenschmiede) >>');
  const xr = pos; let s = 'xref\n0 7\n0000000000 65535 f \n'; for (let i = 1; i <= 6; i++) s += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
  add(s + 'trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n' + xr + '\n%%EOF\n');
  const out = new Uint8Array(pos); let p = 0; for (const u of parts) { out.set(u, p); p += u.length; } return out;
}
/* Atlas-Projekt: gleiches Format wie „💾 Speichern“ im DND5e Atlas */
const A_W = { Mensch: 50, Halbling: 12, Zwerg: 12, Elf: 10, Halbelf: 8, Gnom: 6, Halbork: 5, 'Drachenblütiger': 3, Tiefling: 3 };
function atlasProject(src, name) {
  const u = iconU();
  const cities = S.cities.map((c, i) => { const R = resolve(c), d = ICON_DIM[R.style], a = ensureA(c);
    const o = { id: 'c' + Date.now().toString(36) + i.toString(36), x: c.x, y: Math.round(c.y - d[1] * u * .45), name: c.name || 'Ort ' + (i + 1), type: a.type, density: a.density, wealth: a.wealth, races: aNorm(a.races.filter(r => r.n && +r.p > 0)), pop: a.pop, lodging: a.lodging, restaurants: a.restaurants, shops: a.shops,
      notes: (a.notes ? a.notes + '\n' : '') + R.style + ' der ' + RACE_PL[R.race] + ' (' + archFor(R).n + '), Klimazone ' + ZONE_N[R.zone] + (R.coast ? ', an der Küste' : '') + '.' + (realmAt(c.x, c.y) ? ' Gehört zu: ' + realmFull(realmAt(c.x, c.y)) + (realmAt(c.x, c.y).capital === c.id ? ' (Hauptstadt)' : '') + '.' : ''), manual: false, racesManual: true, popManual: true, numsManual: true, densityManual: true, src: 'kartenschmiede', sym: Math.round(Math.max(d[0], d[1]) * u), look: { style: R.style, race: R.race, zone: R.zone } };
    if (c.map) { const k = Math.min(1, 1500 / c.map.W); o.cmap = { src: cityCanvas(c, c.map.view || 'art', k, { title: true, labels: false }).toDataURL('image/jpeg', .9), w: Math.round(c.map.W * k), h: Math.round(c.map.H * k) }; o.pois = cityPois(c, k); }
    return o; });
  return { app: 'The Ultimate DND5e Atlas', version: 1, savedAt: new Date().toISOString(), map: { name: name + '.jpg', kind: 'raster', w: S.W, h: S.H, src }, cities, labels: [], fonts: [] };
}

/* ---------- Hilfe ---------- */
function helpDialog() {
  modal('<h2>So entsteht deine Karte</h2><table>' + [
    ['🌊 Ozean', 'Grundebene. Hier wählst du nur den Farbton des Meeres.'],
    ['🏝️ Land', 'Land frei mit dem Pinsel malen oder entfernen – oder eine Vorgabe erzeugen: Kontinent, Archipel, Gebirge.'],
    ['🌲 Gelände', 'Wiese, Grasland, Wald, Dschungel, Wüste, Hügel, Gebirge, Sumpf, Tundra, Schnee malen oder Flächen füllen.'],
    ['💧 Gewässer', 'Flüsse von der Quelle zur Mündung ziehen, Seen malen.'],
    ['👑 Reiche', 'Königreiche, Fürstentümer, Grafschaften … mit Rechteck-, Vieleck- oder Lasso-Auswahl, Pinsel oder Füllen einfärben. Gefärbt werden nur Land, Seen und Flüsse, nie das Meer. Oben mit „👑 Reiche“ ein- und ausblenden.'],
    ['🛣️ Wege und Straßen', 'Straßen und Wege ziehen. Wo sie einen Fluss kreuzen, entsteht eine Brücke.'],
    ['🏰 Stadt', 'Dorf, Stadt, Festung, Großstadt, Zeltstadt oder Hafen setzen und einem Volk zuweisen. Ohne Angabe entscheidet die Klimazone. Jede Stadt hat dieselben Eigenschaften wie im Atlas.'],
    ['🏘️ Stadtkarte', 'Für jede Stadt lässt sich eine eigene Karte zufällig erzeugen oder selbst zeichnen – mit Läden als PoI für den Atlas.'],
    ['🎨 Rendern', 'Realistisch, Künstlerisch oder Gezeichnet – als PNG, JPG, WebP, SVG, PDF oder Atlas-Projekt.']
  ].map(r => '<tr><td style="white-space:nowrap"><b>' + r[0] + '</b></td><td>' + r[1] + '</td></tr>').join('') + '</table>' +
    '<p class="small" style="margin-top:.8em"><kbd>Mausrad</kbd> zoomen · <kbd>Leertaste</kbd> + ziehen oder rechte Maustaste: Karte verschieben · <kbd>1</kbd>–<kbd>7</kbd> Ebene wählen · <kbd>[</kbd> <kbd>]</kbd> Pinselgröße · <kbd>Strg</kbd>+<kbd>Z</kbd> / <kbd>Y</kbd> rückgängig / wiederholen · <kbd>Entf</kbd> Auswahl löschen</p>' +
    '<div class="foot"><button class="btn primary" data-a="close">Verstanden</button></div>');
}

/* ---------- Aktionen ---------- */
function setLayer(k) { S.layer = k; if (S.sel && ((k === 'city') !== (S.sel.k === 'city') || (k === 'water') !== (S.sel.k === 'river') || (k === 'road') !== (S.sel.k === 'road'))) S.sel = null; renderSide(); }
function delSel() { const o = selObj(); if (!o) return; pushUndo(); const k = S.sel.k; if (k === 'city') S.cities = S.cities.filter(c => c !== o); else if (k === 'river') S.rivers = S.rivers.filter(c => c !== o); else S.roads = S.roads.filter(c => c !== o); S.sel = null; invalidate(); redrawDeco(); persist(); renderSide(); }
function doUndo(redo) { const from = redo ? S.redo : S.undo, to = redo ? S.undo : S.redo; const s = from.pop(); if (!s) { toast(redo ? 'Nichts zum Wiederholen.' : 'Nichts zum Rückgängigmachen.'); return; } to.push(snap()); applySnap(s); redrawAll(); renderSide(); }
async function openProject(f) { try { const p = JSON.parse(await f.text()); if (/Atlas/.test(p.app || '') && !p.land) { toast('Das ist ein Atlas-Projekt – bitte im DND5e Atlas öffnen.'); return; } fromProject(p); renderWork(); toast('Projekt geladen: ' + S.name); } catch (e) { console.error(e); toast('Die Datei konnte nicht geöffnet werden: ' + e.message); } }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, v = b.dataset.v;
  switch (a) {
    case 'new': newDialog(); break;
    case 'new-ok': { const [W, H] = SIZES[segVal('#nSize') || 'mittel'], kind = segVal('#nKind'), nm = $('#nName').value.trim() || 'Neue Welt', o = { terrain: $('#nTerr').checked, rivers: $('#nRiv').checked }; closeModal();
      busy('Die Welt entsteht …', () => { newMap(nm, W, H); S.lastGen = null; if (kind) { generate(kind, S.seed, o); S.lastGen = { kind, o }; S.layer = 'terr'; } else S.layer = 'land'; renderWork(); if (!kind) toast('Leerer Ozean – male jetzt Land mit dem Pinsel.'); }); break; }
    case 'open': $('#fProj').value = ''; $('#fProj').onchange = ev => { const f = ev.target.files[0]; if (f) openProject(f); }; $('#fProj').click(); break;
    case 'resume': try { fromProject(S._last); renderWork(); } catch (er) { toast(er.message); } break;
    case 'home': persist(); renderHome(); break;
    case 'close': closeModal(); break;
    case 'save': download(baseName(S.name) + '_Karte.json', new Blob([JSON.stringify(toProject())], { type: 'application/json' })); toast('Projekt gespeichert.'); break;
    case 'undo': doUndo(false); break; case 'redo': doUndo(true); break;
    case 'view': S.view = v; renderTop(); busy('Zeichne …', () => { redrawBase(); redrawDeco(); renderSel(); persist(); }); break;
    case 'names': S.names = !S.names; renderTop(); redrawDeco(); break;
    case 'realmVis': S.vis.realm = !S.vis.realm; renderTop(); renderSide(); redrawDeco(); persist(); toast(S.vis.realm ? '👑 Reiche eingeblendet' : 'Reiche ausgeblendet'); break;
    case 'rsel': S.rsel = +v; renderSide(); break;
    case 'radd': pushUndo(); S.rsel = newRealm(); S.rmode = 'add'; if (S.tool.realm === 'pick') S.tool.realm = 'rect'; renderSide(); persist(); break;
    case 'rroll': { const r = S.realms[S.rsel - 1]; if (r) { pushUndo(); r.name = realmName(); S.rl++; redrawDeco(); renderSide(); persist(); } break; }
    case 'rdel': { const r = S.realms[S.rsel - 1]; if (r) { pushUndo(); realmDelete(S.rsel); S.rsel = Math.min(S.rsel, S.realms.length); S.rv++; S.rl++; redrawDeco(); renderSide(); persist(); toast('„' + r.name + '“ gelöscht – Strg+Z holt es zurück.'); } break; }
    case 'rmode': S.rmode = v; renderSide(); break;
    case 'zin': zoomAt(1.3); break; case 'zout': zoomAt(1 / 1.3); break; case 'fit': fitView(); break;
    case 'eye': e.stopPropagation(); S.vis[v] = !S.vis[v]; renderSide(); redrawBase(); redrawDeco(); persist(); break;
    case 'layer': setLayer(v); break;
    case 'tool': S.tool[S.layer] = v; if (v !== 'select' && S.layer !== 'city') S.sel = null; renderSide(); break;
    case 'terr': S.tt = +v; if (curTool() === 'erase') S.tool.terr = 'paint'; renderSide(); break;
    case 'ocean': S.ocean = +v; renderSide(); redrawBase(); persist(); break;
    case 'gen': genDialog(v); break; case 'gseed': $('#gSeed').value = (Math.random() * 99999) | 0; break;
    case 'gen-ok': { const o = { terrain: $('#gTerr').checked, rivers: $('#gRiv').checked }, sd = +$('#gSeed').value || 1; closeModal(); runGen(v, sd, o); break; }
    case 'regen': runGen(S.lastGen.kind, (Math.random() * 99999) | 0, S.lastGen.o); break;
    case 'pick': { const c = S.cities.find(x => x.id === v); if (c) { S.sel = { k: 'city', id: v }; const r = wrap.getBoundingClientRect(); S.v.tx = r.width / 2 - c.x * S.v.s; S.v.ty = r.height / 2 - c.y * S.v.s; applyView(); renderSide(); } break; }
    case 'rename': { const o = selObj(); if (o) { pushUndo(); o.name = genName(resolve(o)); redrawDeco(); persist(); renderSide(); } break; }
    case 'rtype': { const o = selObj(); if (o) { pushUndo(); o.type = v; invalidate(); redrawDeco(); persist(); renderSel(); } break; }
    case 'del': delSel(); break;
    case 'cmap': { const o = selObj(); if (o && S.sel.k === 'city') openCity(o); break; }
    case 'aRollRaces': { const o = selObj(); if (o) { pushUndo(); const at = ensureA(o); at.racesManual = false; at.races = aRaces(at, at.owner); persist(); renderSel(); } break; }
    case 'aRoll': { const o = selObj(); if (o) { pushUndo(); const at = ensureA(o); at.popManual = at.numsManual = false; at.pop = aPop(at); Object.assign(at, aNums(at)); persist(); renderSel(); } break; }
    case 'aAddRace': { const o = selObj(); if (o) { pushUndo(); const at = ensureA(o); at.races.push({ n: '', p: 0 }); at.racesManual = true; renderSel(); } break; }
    case 'aDelRace': { const o = selObj(); if (o) { pushUndo(); const at = ensureA(o); at.races.splice(+v, 1); at.racesManual = true; persist(); renderSel(); } break; }
    case 'aNorm': { const o = selObj(); if (o) { pushUndo(); const at = ensureA(o); at.races = aNorm(at.races); at.racesManual = true; persist(); renderSel(); } break; }
    case 'export': exportDialog(); break; case 'atlas': exportDialog('atlas'); break;
    case 'export-ok': busy('Die Karte wird gerendert …', doExport); break;
    case 'help': helpDialog(); break;
  }
});
document.addEventListener('input', e => {
  const f = e.target.dataset.f; if (!f) return; const o = selObj(), val = e.target.value;
  if (f === 'brush') { S.brush = +val; $('#brV').textContent = val + ' px'; }
  else if (f === 'rName' || f === 'rRuler' || f === 'rNotes') { const r = S.realms[S.rsel - 1]; if (r) { r[{ rName: 'name', rRuler: 'ruler', rNotes: 'notes' }[f]] = val; if (f === 'rName') { S.rl++; decoSoon(250); const it = document.querySelector('.rlist .it.sel .nm'); if (it) it.textContent = val || 'Ohne Namen'; } persist(); } }
  else if (f === 'rw') { S.rw = +val; $('#rwV').textContent = val; }
  else if (f === 'cName' && o) { o.name = val; decoSoon(200); persist(); }
  else if (o && S.sel.k === 'city' && f === 'aN') { const at = ensureA(o), k = e.target.dataset.k; at[k] = Math.max(0, Math.round(+val || 0)); if (k === 'pop') at.popManual = true; else at.numsManual = true; persist(); }
  else if (o && S.sel.k === 'city' && f === 'aNotes') { ensureA(o).notes = val; persist(); }
  else if (o && S.sel.k === 'city' && (f === 'aRN' || f === 'aRP')) { const at = ensureA(o), r = at.races[+e.target.dataset.i]; if (r) { if (f === 'aRN') r.n = val; else r.p = Math.max(0, +val || 0); at.racesManual = true; persist(); } }
  else if (f === 'oW' && o) { o.w = +val; e.target.previousElementSibling.querySelector('span').textContent = val; invalidate(); decoSoon(60); persist(); }
});
document.addEventListener('change', e => {
  const f = e.target.dataset.f; if (!f) return; const o = selObj(), val = e.target.value;
  if (f === 'rType' || f === 'rCol' || f === 'rCap') { const r = S.realms[S.rsel - 1]; if (r) { pushUndo(); r[{ rType: 'type', rCol: 'col', rCap: 'capital' }[f]] = val; if (f === 'rCol') S.rv++; S.rl++; redrawDeco(); renderSide(); persist(); } return; }
  if (f === 'rKeep') { S.rkeep = e.target.checked; return; }
  if (f === 'rNames') { S.opt.realmNames = e.target.checked; redrawDeco(); persist(); return; }
  if (f === 'csStyle') S.cs.style = val; else if (f === 'csRace') S.cs.race = val;
  else if ((f === 'cStyle' || f === 'cRace') && o) { pushUndo(); if (f === 'cStyle') o.style = val; else o.race = val; redrawDeco(); persist(); renderSide(); }
  else if (f === 'cName') setTimeout(() => { if (!CE.on && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) renderSide(); }, 300);
  else if (o && S.sel.k === 'city' && (f === 'aType' || f === 'aDens' || f === 'aWealth')) { pushUndo(); setA(o, { aType: 'type', aDens: 'density', aWealth: 'wealth' }[f], val); persist(); renderSel(); }
  else if (f === 'aRN' || f === 'aRP' || (f === 'aN' && e.target.dataset.k === 'pop')) { if (f === 'aN' && o) { const at = ensureA(o); if (!at.numsManual) Object.assign(at, aNums(at)); } setTimeout(() => { if (!CE.on && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) renderSel(); }, 300); }
});
document.addEventListener('keydown', e => {
  if (!S.ready || !wrap || CE.on || CE.c) return; const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  if (e.key === 'Escape') { closeModal(); S.rpoly = null; if (drag && (drag.k === 'line' || drag.k === 'rsel')) drag = null; drawUi(); return; }
  if ((e.ctrlKey || e.metaKey) && !inField) { const k = e.key.toLowerCase(); if (k === 'z') { e.preventDefault(); doUndo(e.shiftKey); } else if (k === 'y') { e.preventDefault(); doUndo(true); } else if (k === 's') { e.preventDefault(); $('[data-a="save"]').click(); } return; }
  if (inField || $('.modal')) return;
  if (e.code === 'Space') { space = true; e.preventDefault(); drawUi(); }
  else if (e.key === 'Delete' || e.key === 'Backspace') delSel();
  else if (e.key >= '1' && e.key <= String(LAYERS.length)) setLayer(LAYERS[+e.key - 1].k);
  else if (e.key === 'Enter' && S.rpoly) finishRealmPoly();
  else if (e.key === '[' || e.key === ']') { S.brush = clamp(S.brush + (e.key === ']' ? 6 : -6), 6, 140); renderSide(); drawUi(); }
});
document.addEventListener('keyup', e => { if (e.code === 'Space' && !CE.on) { space = false; drawUi(); } });
window.addEventListener('resize', () => { if (S.ready && wrap && !CE.on) drawUi(); });
window.addEventListener('beforeunload', () => { if (S.ready) try { DB.set('last', { p: toProject(), thumb: '', n: S.cities.length }); } catch (e) { } });
window.KS = { CE, genCity, openCity, renderCity, cityCanvas, ensureA, S, generate, newMap, renderMap, renderWork, redrawAll, bridges, resolve, atlasProject, buildSvg, buildPdf, toProject, fromProject, doExport, X, pushUndo, invalidate, redrawDeco, fontsReady };
renderHome();
