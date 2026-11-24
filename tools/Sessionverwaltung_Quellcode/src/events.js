/* DND5e Sessionverwaltung – Ereignisse und Aktionen */
(function (W) {
'use strict';
const V = W.SV; const { $, $$, esc, S, T, L, G, uid, save, toast } = V;
const render = () => V.render();

/* ---------- NSC ---------- */
function npcCtx(n) { const ci = V.findCity(n && n.city); return ci ? { cityRaces: ci.city.races, cityWealth: ci.city.wealth } : {}; }
V.newNpcDraft = function (preset) {
  const base = Object.assign({ id: uid(), prof: 'innkeeper', city: '', traits: {}, lock: {}, notes: '', sessions: [], created: Date.now() }, preset || {});
  if (preset && preset.prof) base.lock.prof = true;
  if (preset && preset.city !== undefined) { /* Stadt fest */ }
  S.npc = G.rollNpc(base, npcCtx(base), S.lang); S.npc.sb = G.statBlock(S.npc.prof); S.npcNew = true;
  if (preset && preset.sessionId) S.npc.sessions = [preset.sessionId];
};
// Felder, die von einer Änderung abhängen
const DEP = { prof: ['wealth', 'age', 'purse', 'name', 'sb'], race: ['sub', 'age', 'name'], gender: ['name'], city: ['race', 'wealth', 'purse', 'name'], wealth: ['purse', 'name'] };
function rollField(n, k, force) {
  const lk = n.lock || {}; if (!force && lk[k]) return; const ctx = npcCtx(n);
  switch (k) {
    case 'race': n.race = G.rollRace(ctx.cityRaces); rollField(n, 'sub'); break;
    case 'sub': { const R = G.RACES[n.race]; n.sub = R && R.subs.length ? G.rint(0, R.subs.length - 1) : -1; break; }
    case 'age': n.age = G.rollAge(n.race, n.prof); break;
    case 'wealth': n.wealth = G.rollWealth(n.prof, ctx.cityWealth); break;
    case 'purse': n.purse = G.rollPurse(n.wealth, S.lang); break;
    case 'name': n.name = G.rollName({ race: n.race, gender: n.gender, wealth: n.wealth, prof: n.prof, city: n.city }, S.lang); break;
    case 'sb': if (!lk.sb) n.sb = G.statBlock(n.prof); break;
    default: if (k.startsWith('t_')) n.traits[k.slice(2)] = G.rollTrait(k.slice(2), S.lang, n.traits[k.slice(2)]);
  }
}
function changed(n, k, deep) { (DEP[k] || []).forEach(d => { const before = d === 'race' ? n.race : null; rollField(n, d); if (d === 'race' && n.race !== before) changed(n, 'race'); if (d === 'wealth' && !deep) { rollField(n, 'purse'); rollField(n, 'name'); } }); npcSaved(); }
function npcSaved() { if (!S.npcNew && S.npc) { S.npc.updated = Date.now(); save(); } }
function patchNpcView() { // nur abhängige Anzeigen aktualisieren, ohne Eingabefokus zu verlieren
  const n = S.npc; const set = (sel, v) => { const el = $(sel); if (el && document.activeElement !== el) { if ('value' in el && el.tagName !== 'SPAN' && el.tagName !== 'B') el.value = v; else el.textContent = v; } };
  set('[data-in="npc"][data-k="name"]', n.name); set('[data-in="npc"][data-k="purse"]', n.purse); set('[data-in="npcAge"]', n.age);
  const al = $('.agel'); if (al) al.textContent = G.stageLabel(n.race, n.age, S.lang);
  const WD = G.WEALTH[+n.wealth] || G.WEALTH[3]; const wl = $('.wl'); if (wl) wl.textContent = L(WD.n); const wd = $('.wd'); if (wd) wd.textContent = L(WD.d);
  const hint = $('.hint'); if (hint) hint.innerHTML = '<b>🎭 ' + T('So spielst du', 'How to play') + ' ' + esc((n.name || '').split(' „')[0]) + ':</b> ' + esc(G.playHint(n, S.lang));
  $$('[data-a="npcLock"]').forEach(b => { const on = n.lock[b.dataset.k]; b.classList.toggle('on', !!on); b.textContent = on ? '🔒' : '🔓'; });
}
function lockOn(k) { if (!S.npc.lock) S.npc.lock = {}; S.npc.lock[k] = true; }

/* ---------- Datei-Eingaben ---------- */
function pickFile(accept, multiple, cb) { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = !!multiple; i.style.display = 'none'; i.onchange = () => { cb(Array.from(i.files || [])); i.remove(); }; document.body.appendChild(i); i.click(); }
V.pickFile = pickFile;
async function loadPdfs(files, replaceId) {
  const pcs = [];
  for (const f of files) { try { pcs.push(await V.parseSheet(f)); } catch (e) { console.error(e); toast(f.name + ': ' + e.message); } }
  if (!pcs.length) return;
  if (replaceId) { const ex = S.camp.pcs.find(p => p.id === replaceId); if (ex) { const keep = { id: ex.id, notes: ex.notes, img: pcs[0].img || ex.img }; Object.assign(ex, pcs[0], keep); save(); toast('🔄 ' + ex.name + ' – ' + T('Bogen aktualisiert, Notizen behalten', 'sheet updated, notes kept')); render(); return; } }
  const r = V.addPcs(pcs); toast('📄 ' + (r.added ? r.added + ' ' + T('neu', 'new') : '') + (r.added && r.upd ? ', ' : '') + (r.upd ? r.upd + ' ' + T('aktualisiert', 'updated') : '')); render();
}
async function importCampaignFile(f) {
  try {
    const d = JSON.parse(await V.readAs(f, 'readAsText'));
    if (d && d.campaign) {
      const c = V.upgrade(d.campaign); const ex = S.index.find(x => x.id === c.id);
      if (ex && !W.confirm(T('Diese Kampagne gibt es schon („' + ex.name + '“). Überschreiben? (Abbrechen = als Kopie laden)', 'This campaign already exists ("' + ex.name + '"). Overwrite? (Cancel = load as copy)'))) { c.id = uid(); c.name += T(' (Kopie)', ' (copy)'); }
      S.camp = c; await save(true); await V.openCampaign(c.id); toast('📂 ' + c.name); return;
    }
    if (d && d.map && d.map.src) { if (!S.camp) await V.createCampaign(T('Neue Kampagne', 'New campaign')); V.addAtlasProject(d, f.name); return; }
    if (V.parseEncFile(d)) { if (!S.camp) { toast(T('Bitte zuerst eine Kampagne öffnen.', 'Please open a campaign first.')); return; } ebFromData(d); return; }
    toast(T('Unbekanntes Dateiformat.', 'Unknown file format.'));
  } catch (e) { console.error(e); toast(T('Datei nicht lesbar: ', 'File not readable: ') + e.message); }
}
let ebPending = null;
function ebFromData(d) {
  const p = V.parseEncFile(d); if (!p) { toast(T('Keine Begegnungen in der Datei.', 'No encounters in the file.')); return; }
  ensureSession(); ebPending = p; S.modal = () => V.ebDialog('file', p.list, p); render();
}
function ensureSession() { if (!V.curSession()) V.newSession(); }
async function handleDrop(files) {
  if (!files.length) return;
  if (S.view !== 'camp') { for (const f of files) await importCampaignFile(f); return; }
  const pdfs = files.filter(f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
  const imgs = files.filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp|avif|svg)$/i.test(f.name));
  const jsons = files.filter(f => /\.json$/i.test(f.name));
  if (pdfs.length) { S.tab = 'pcs'; await loadPdfs(pdfs); }
  for (const f of imgs) await V.loadMapFile(f);
  for (const f of jsons) await importCampaignFile(f);
}

/* ---------- Klicks ---------- */
const A = {
  lang(el) { S.lang = el.dataset.v; V.LSset('sv.lang', S.lang); render(); },
  home() { S.view = 'home'; S.camp = null; V.loadIndex().then(render); },
  async newCamp() { S.modal = () => V.promptDlg('➕ ' + T('Neue Kampagne', 'New campaign'), T('Name der Kampagne', 'Campaign name'), T('Meine Kampagne', 'My campaign'), 'newCampDo'); render(); setTimeout(() => { const i = $('#promptIn'); if (i) { i.focus(); i.select(); } }, 20); },
  async newCampDo() { const v = ($('#promptIn') || {}).value || ''; S.modal = null; await V.createCampaign(v.trim() || T('Neue Kampagne', 'New campaign')); },
  pickCamp() { pickFile('.json,application/json', false, fs => fs[0] && importCampaignFile(fs[0])); },
  openCamp(el) { V.openCampaign(el.dataset.id); },
  delCamp(el) { const c = S.index.find(x => x.id === el.dataset.id); S.modal = () => V.confirmDlg('🗑️ ' + T('Kampagne löschen?', 'Delete campaign?'), T('„' + esc(c ? c.name : '') + '“ wird aus diesem Browser gelöscht. Tipp: vorher mit 💾 als Datei sichern.', '"' + esc(c ? c.name : '') + '" will be deleted from this browser. Tip: export it with 💾 first.'), 'delCampDo', el.dataset.id); render(); },
  async delCampDo(el) { await V.deleteCampaign(el.dataset.id); S.modal = null; render(); },
  tab(el) { S.tab = el.dataset.v; V.LSset('sv.tab', S.tab); S.modal = null; render(); if (S.tab === 'map') setTimeout(() => V.drawOverlay(), 20); },
  export() { V.exportCampaign(); },
  modalBg(el, ev) { if (ev.target === el) { S.modal = null; render(); } },
  closeModal() { S.modal = null; render(); },
  // Sessions
  newSession() { V.newSession(); render(); setTimeout(() => { const i = $('[data-in="sess"][data-k="title"]'); if (i) i.focus(); }, 20); },
  selSession(el) { S.selSession = el.dataset.id; S.camp.activeSession = el.dataset.id; save(); render(); },
  delSession(el) { const s = S.camp.sessions.find(x => x.id === el.dataset.id); S.modal = () => V.confirmDlg('🗑️ ' + T('Session löschen?', 'Delete session?'), esc(V.sessionLabel(s)) + ' – ' + T('Notizen und Begegnungen dieser Session gehen verloren. Marker bleiben auf der Karte.', 'Notes and encounters of this session will be lost. Markers stay on the map.'), 'delSessionDo', s.id); render(); },
  delSessionDo(el) { const id = el.dataset.id; const c = S.camp; c.sessions = c.sessions.filter(s => s.id !== id); c.maps.forEach(m => m.markers.forEach(k => { if (k.sessionId === id) k.sessionId = null; })); c.npcs.forEach(n => { n.sessions = (n.sessions || []).filter(x => x !== id); }); S.selSession = (V.lastSession() || {}).id || null; c.activeSession = S.selSession; S.modal = null; save(); render(); },
  pmode(el) { S.partyMode = el.dataset.v; render(); },
  gotoPc(el) { S.tab = 'pcs'; render(); setTimeout(() => { const c = $('#pc-' + el.dataset.id); if (c) { c.scrollIntoView({ block: 'center' }); c.classList.add('flash'); } }, 30); },
  ebImport() { ensureSession(); const eb = V.readEB(); ebPending = { list: (eb.saved || []).filter(e => e && Array.isArray(e.items)), custom: eb.custom, names: eb.names }; S.modal = () => V.ebDialog('ls', ebPending.list, ebPending); render(); },
  ebFile() { pickFile('.json,application/json', false, async fs => { if (!fs[0]) return; try { ebFromData(JSON.parse(await V.readAs(fs[0], 'readAsText'))); } catch (e) { toast(T('Datei nicht lesbar.', 'File not readable.')); } }); },
  ebDo() { const s = V.curSession(); if (!s || !ebPending) return; let n = 0; $$('[data-ebsel]').forEach(cb => { if (cb.checked) { s.encounters.push(V.resolveEnc(ebPending.list[+cb.dataset.ebsel], ebPending)); n++; } }); ebPending = null; S.modal = null; save(); toast('⚔️ ' + n + ' ' + T('Begegnung(en) übernommen', 'encounter(s) imported')); render(); },
  encDone(el) { const e = findEnc(el.dataset.id); if (e) { e.status = e.status === 'done' ? 'planned' : 'done'; save(); render(); } },
  encDel(el) { const s = V.curSession(); s.encounters = s.encounters.filter(e => e.id !== el.dataset.id); save(); render(); },
  quickNpc() { const s = V.curSession(); V.newNpcDraft({ city: s && s.place ? s.place : '', sessionId: s ? s.id : null }); S.tab = 'npcs'; render(); },
  openNpc(el, ev) { if (ev.target.closest('[data-a="unlinkNpc"]')) return; const n = S.camp.npcs.find(x => x.id === el.dataset.id); if (!n) return; S.npc = n; S.npcNew = false; S.tab = 'npcs'; S.modal = null; render(); },
  unlinkNpc(el) { const s = V.curSession(); const id = el.dataset.id; s.npcIds = s.npcIds.filter(x => x !== id); const n = S.camp.npcs.find(x => x.id === id); if (n) n.sessions = (n.sessions || []).filter(x => x !== s.id); save(); render(); },
  gotoMarker(el) { S.mapId = el.dataset.map; S.selMarker = el.dataset.id; S.tab = 'map'; S.mapFilter = 'all'; S.mv.ok = false; render(); const m = V.curMap(); const k = m && m.markers.find(x => x.id === el.dataset.id); if (k) setTimeout(() => V.centerOn(k.x, k.y), 30); },
  // Charaktere
  pickPdf() { pickFile('.pdf,application/pdf', true, fs => loadPdfs(fs)); },
  pcReplace(el) { pickFile('.pdf,application/pdf', false, fs => loadPdfs(fs, el.dataset.id)); },
  pcPdf(el) { const p = S.camp.pcs.find(x => x.id === el.dataset.id); if (p && p.pdf) V.openDataUrl(p.pdf, p.pdfName); },
  pcImg(el) { pickFile('image/*', false, async fs => { if (!fs[0]) return; const p = S.camp.pcs.find(x => x.id === el.dataset.id); p.img = await shrink(await V.readAs(fs[0], 'readAsDataURL'), 320); save(); render(); }); },
  pcDel(el) { const p = S.camp.pcs.find(x => x.id === el.dataset.id); S.modal = () => V.confirmDlg('🗑️ ' + esc(p.name), T('Charakter samt Notizen entfernen?', 'Remove character including notes?'), 'pcDelDo', p.id); render(); },
  pcDelDo(el) { const id = el.dataset.id; S.camp.pcs = S.camp.pcs.filter(p => p.id !== id); S.camp.sessions.forEach(s => { s.present = s.present.filter(x => x !== id); }); S.modal = null; save(); render(); },
  newPc() { const pc = V.sheetToPc({ n: T('Neuer Charakter', 'New character'), kl: '1' }, 'creator', ''); pc.src = 'manual'; pc.cls = ''; pc.lvl = 1; V.addPcs([pc]); S.modal = () => V.pcEditDlg(pc); S.modalCls = ''; render(); },
  pcEdit(el) { const p = S.camp.pcs.find(x => x.id === el.dataset.id); S.modal = () => V.pcEditDlg(p); render(); },
  pcEditSave(el) {
    const p = S.camp.pcs.find(x => x.id === el.dataset.id); if (!p) return;
    $$('[data-pe]').forEach(i => { const k = i.dataset.pe; p[k] = i.type === 'number' ? (parseInt(i.value, 10) || 0) : i.value; });
    $$('[data-pa]').forEach(i => { p.abil[+i.dataset.pa] = parseInt(i.value, 10) || 10; }); $$('[data-ps]').forEach(i => { p.saves[+i.dataset.ps] = parseInt(i.value, 10) || 0; });
    p.lvl = V.levelOf(p.cls); S.modal = null; save(); render();
  },
  fromManager() { const ch = V.LSget('cm.chars', []); const list = Array.isArray(ch) ? ch.filter(c => c && c.name) : []; S.mgrList = list; S.modal = () => V.mgrDialog(list); render(); },
  mgrDo() { const pcs = []; $$('[data-mgsel]').forEach(cb => { if (cb.checked) pcs.push(V.pcFromManager(S.mgrList[+cb.dataset.mgsel])); }); const r = V.addPcs(pcs); S.modal = null; toast('🛡️ ' + (r.added + r.upd) + ' ' + T('übernommen', 'imported')); render(); },
  // NSC
  npcNew() { V.newNpcDraft({ city: S.npc && S.npc.city || '' }); render(); },
  npcRoll(el) { const k = el.dataset.k; rollField(S.npc, k, true); if (DEP[k]) changed(S.npc, k); npcSaved(); render(); },
  npcLock(el) { const k = el.dataset.k; S.npc.lock[k] = !S.npc.lock[k]; npcSaved(); patchNpcView(); },
  npcRollAll() { const n = S.npc; const r = G.rollNpc(n, npcCtx(n), S.lang); Object.assign(n, r); if (!n.lock.sb) n.sb = G.statBlock(n.prof); npcSaved(); render(); },
  npcRollTraits() { G.TRAIT_KEYS.forEach(k => rollField(S.npc, 't_' + k)); npcSaved(); render(); },
  npcSave() {
    const n = S.npc; if (!n.name || !n.name.trim()) { toast(T('Bitte einen Namen eingeben.', 'Please enter a name.')); return; }
    n.created = Date.now(); n.updated = Date.now(); S.camp.npcs.push(n);
    (n.sessions || []).forEach(sid => { const s = S.camp.sessions.find(x => x.id === sid); if (s && !s.npcIds.includes(n.id)) s.npcIds.push(n.id); });
    S.npcNew = false; save(); toast('💾 ' + n.name); render();
  },
  npcDup() { const c = JSON.parse(JSON.stringify(S.npc)); c.id = uid(); c.name += T(' (Kopie)', ' (copy)'); c.sessions = []; S.npc = c; S.npcNew = true; render(); },
  npcDel() { const n = S.npc; S.modal = () => V.confirmDlg('🗑️ ' + esc(n.name), T('NSC löschen?', 'Delete NPC?'), 'npcDelDo', n.id); render(); },
  npcDelDo(el) { const id = el.dataset.id; const c = S.camp; c.npcs = c.npcs.filter(n => n.id !== id); c.sessions.forEach(s => { s.npcIds = s.npcIds.filter(x => x !== id); }); c.maps.forEach(m => m.markers.forEach(k => { if (k.npcId === id) k.npcId = null; })); (c.quests || []).forEach(q => { if (q.giverNpc === id) q.giverNpc = ''; q.npcs = (q.npcs || []).filter(x => x.id !== id); }); S.npc = null; S.modal = null; save(); render(); },
  npcMark() { if (!S.camp.maps.length) { toast(T('Bitte zuerst eine Karte hochladen.', 'Please upload a map first.')); S.tab = 'map'; render(); return; } S.pendingNpc = S.npc.id; S.mapMode = 'add'; S.curType = 'npc'; S.tab = 'map'; render(); toast(T('Klicke auf die Karte, um den Marker für „' + S.npc.name + '“ zu setzen.', 'Click the map to place the marker for "' + S.npc.name + '".'), 4000); },
  npcHere(el) { V.newNpcDraft({ city: el.dataset.v, sessionId: S.selSession || null }); S.tab = 'npcs'; render(); },
  // Notizen
  newNote() { const n = { id: uid(), title: '', cat: S.noteCat || 'general', text: '', pin: false, created: Date.now(), updated: Date.now() }; S.camp.notes.push(n); S.selNote = n.id; save(); render(); setTimeout(() => { const i = $('.ntitle'); if (i) i.focus(); }, 20); },
  selNote(el) { S.selNote = el.dataset.id; render(); },
  notePin() { const n = curNote(); n.pin = !n.pin; save(); render(); },
  noteDel() { const n = curNote(); S.modal = () => V.confirmDlg('🗑️ ' + esc(n.title || T('Notiz', 'Note')), T('Notiz löschen?', 'Delete note?'), 'noteDelDo', n.id); render(); },
  noteDelDo(el) { S.camp.notes = S.camp.notes.filter(n => n.id !== el.dataset.id); S.selNote = null; S.modal = null; save(); render(); },
  // Karte
  mapUpload() { pickFile('image/*,.svg,.json', false, fs => fs[0] && V.loadMapFile(fs[0])); },
  atlasDb() { V.fromAtlasDB(); },
  atlasFile() { S.modal = null; pickFile('.json,application/json', false, async fs => { if (!fs[0]) return; try { V.addAtlasProject(JSON.parse(await V.readAs(fs[0], 'readAsText')), fs[0].name); } catch (e) { toast(T('Datei nicht lesbar.', 'File not readable.')); } }); },
  mapRename() { const m = V.curMap(); S.modal = () => V.promptDlg('✏️ ' + T('Karte umbenennen', 'Rename map'), T('Name', 'Name'), m.name, 'mapRenameDo'); render(); },
  mapRenameDo() { const m = V.curMap(); const v = ($('#promptIn') || {}).value; if (v && v.trim()) m.name = v.trim(); S.modal = null; save(); render(); },
  mapDel() { const m = V.curMap(); S.modal = () => V.confirmDlg('🗑️ ' + esc(m.name), T('Karte mit allen ' + m.markers.length + ' Markern entfernen?', 'Remove the map with all ' + m.markers.length + ' markers?'), 'mapDelDo', m.id); render(); },
  mapDelDo(el) { S.camp.maps = S.camp.maps.filter(m => m.id !== el.dataset.id); S.mapId = S.camp.maps[0] ? S.camp.maps[0].id : null; S.modal = null; S.mv.ok = false; save(); render(); },
  mapMode(el) { S.mapMode = el.dataset.v; if (S.mapMode === 'select') { S.pendingNpc = null; S.pendingPoi = null; } render(); },
  curType(el) { S.curType = el.dataset.v; S.mapMode = 'add'; render(); },
  zoom(el) { V.zoomMap(+el.dataset.v); },
  fit() { V.fitMap(); },
  selMarker(el) { S.selMarker = el.dataset.id || null; S.selCity = null; render(); const m = V.curMap(); const k = m && m.markers.find(x => x.id === S.selMarker); if (k) V.centerOn(k.x, k.y); },
  selCity(el) { S.selCity = el.dataset.id || null; render(); },
  mkIcon(el) { const k = curMk(); k.style = Object.assign({}, k.style, { icon: el.dataset.v }); save(); render(); },
  mkReset() { const k = curMk(); k.style = {}; save(); render(); },
  mkDel() { const m = V.curMap(); m.markers = m.markers.filter(k => k.id !== S.selMarker); S.selMarker = null; save(); render(); },
  mkTypes() { S.modal = V.typesDialog; render(); },
  ttAdd() { S.camp.markerTypes.push({ id: uid(), n: [T('Neuer Typ', 'New type'), T('Neuer Typ', 'New type')], icon: '⭐', color: '#2e7d32', shape: 'circle', size: 28 }); save(); render(); },
  ttDel(el) { const ts = S.camp.markerTypes; const t = ts[+el.dataset.i]; const rest = ts.filter(x => x !== t); S.camp.maps.forEach(m => m.markers.forEach(k => { if (k.type === t.id) k.type = rest[0].id; })); S.camp.markerTypes = rest; save(); render(); },
  ttReset() { const ids = new Set(S.camp.markerTypes.map(t => t.id)); const def = V.newCampaign('').markerTypes; S.camp.markerTypes = def.concat(S.camp.markerTypes.filter(t => !def.some(d => d.id === t.id))); save(); render(); }
};
function findEnc(id) { for (const s of S.camp.sessions) { const e = s.encounters.find(x => x.id === id); if (e) return e; } return null; }
const curNote = () => S.camp.notes.find(n => n.id === S.selNote);
const curMk = () => { const m = V.curMap(); return m && m.markers.find(k => k.id === S.selMarker); };
function shrink(url, max) { return new Promise(res => { const im = new Image(); im.onload = () => { const s = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .85)); }; im.onerror = () => res(url); im.src = url; }); }

/* ---------- Eingaben (ohne Neuzeichnen) ---------- */
const IN = {
  campName(el) { S.camp.name = el.value; save(); },
  sess(el) { const s = V.curSession(); const k = el.dataset.k; s[k] = k === 'no' ? (parseInt(el.value, 10) || 0) : el.value; save(); if (k === 'no' || k === 'title' || k === 'date' || k === 'place') schedule(render, 700); },
  encNote(el) { const e = findEnc(el.dataset.id); if (e) { e.notes = el.value; save(); } },
  pcNote(el) { const p = S.camp.pcs.find(x => x.id === el.dataset.id); if (p) { p.notes = el.value; save(); } },
  npc(el) { const k = el.dataset.k; S.npc[k] = el.value; if (el.dataset.lk) lockOn(el.dataset.lk); npcSaved(); patchNpcView(); if (k === 'name' && !S.npcNew) schedule(render, 900); },
  npcCity(el) { S.npc.city = el.value; changed(S.npc, 'city'); patchNpcView(); schedule(render, 900); },
  npcAge(el) { S.npc.age = parseInt(el.value, 10) || ''; lockOn('age'); npcSaved(); patchNpcView(); },
  npcWealth(el) { S.npc.wealth = +el.value; lockOn('wealth'); changed(S.npc, 'wealth', true); patchNpcView(); },
  npcTrait(el) { S.npc.traits[el.dataset.k] = el.value; lockOn('t_' + el.dataset.k); npcSaved(); patchNpcView(); },
  npcQ(el) { S.npcQ = el.value; schedule(() => { render(); const i = $('[data-in="npcQ"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); },
  noteQ(el) { S.noteQ = el.value; schedule(() => { render(); const i = $('[data-in="noteQ"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); },
  note(el) { const n = curNote(); n[el.dataset.k] = el.value; n.updated = Date.now(); save(); if (el.dataset.k === 'title') schedule(render, 900); },
  mk(el) { const k = curMk(); k[el.dataset.k] = el.value; save(); V.drawOverlay(); },
  mkStyle(el) { const k = curMk(); const key = el.dataset.k; k.style = Object.assign({}, k.style); if (el.value === '' ) delete k.style[key]; else k.style[key] = key === 'size' ? +el.value : el.value; save(); V.drawOverlay(); }
};
let schedT = null; function schedule(fn, ms) { clearTimeout(schedT); schedT = setTimeout(() => { const a = document.activeElement; const keep = a && a.matches && a.matches('textarea, input[type=text]') ? { sel: selectorOf(a), s: a.selectionStart, e: a.selectionEnd } : null; fn(); if (keep && keep.sel) { const b = $(keep.sel); if (b) { b.focus(); try { b.setSelectionRange(keep.s, keep.e); } catch (e) { } } } }, ms); }
V.scheduleRender = (ms, refocus) => schedule(render, ms);
function selectorOf(el) { const ds = el.dataset; if (ds.in) return '[data-in="' + ds.in + '"]' + (ds.k ? '[data-k="' + ds.k + '"]' : '') + (ds.id ? '[data-id="' + ds.id + '"]' : ''); return null; }

/* ---------- Auswahl (mit Neuzeichnen) ---------- */
const CH = {
  sessStatus(el) { V.curSession().status = el.value; save(); render(); },
  present(el) { const s = V.curSession(); const id = el.dataset.id; s.present = s.present.filter(x => x !== id); if (el.checked) s.present.push(id); save(); if (S.partyMode === 'pcs') render(); },
  linkNpc(el) { const s = V.curSession(); if (el.value && !s.npcIds.includes(el.value)) s.npcIds.push(el.value); const n = S.camp.npcs.find(x => x.id === el.value); if (n && !(n.sessions || []).includes(s.id)) (n.sessions = n.sessions || []).push(s.id); save(); render(); },
  encMove(el) { if (!el.value) return; const from = V.curSession(); const to = S.camp.sessions.find(s => s.id === el.value); const e = from.encounters.find(x => x.id === el.dataset.id); from.encounters = from.encounters.filter(x => x !== e); to.encounters.push(e); save(); toast('↪ ' + V.sessionLabel(to)); render(); },
  npcProf(el) { S.npc.prof = el.value; lockOn('prof'); if (el.value !== 'custom') changed(S.npc, 'prof'); render(); },
  npcRace(el) { S.npc.race = el.value; lockOn('race'); changed(S.npc, 'race'); render(); },
  npcSub(el) { S.npc.sub = +el.value; lockOn('sub'); npcSaved(); },
  npcGender(el) { S.npc.gender = el.value; lockOn('gender'); changed(S.npc, 'gender'); render(); },
  npcSb(el) { S.npc.sb = el.value; lockOn('sb'); npcSaved(); render(); },
  npcCityF(el) { S.npcCity = el.value; render(); },
  npcSess(el) { const n = S.npc; const id = el.dataset.id; n.sessions = (n.sessions || []).filter(x => x !== id); const s = S.camp.sessions.find(x => x.id === id); if (s) s.npcIds = s.npcIds.filter(x => x !== n.id); if (el.checked) { n.sessions.push(id); if (s && !S.npcNew) s.npcIds.push(n.id); } npcSaved(); },
  noteCat(el) { S.noteCat = el.value; render(); },
  noteCatSet(el) { const n = curNote(); n.cat = el.value; save(); render(); },
  mapSel(el) { S.mapId = el.value; S.selMarker = null; S.selCity = null; S.mv.ok = false; render(); },
  mapFilter(el) { S.mapFilter = el.value; render(); },
  showCities(el) { S.showCities = el.checked; V.drawOverlay(); },
  showLabels(el) { S.showLabels = el.checked; V.drawOverlay(); },
  bindSession(el) { S.bindSession = el.checked; },
  mkType(el) { curMk().type = el.value; save(); render(); },
  mkShape(el) { const k = curMk(); k.style = Object.assign({}, k.style, { shape: el.value }); save(); render(); },
  mkLabel(el) { curMk().hideLabel = !el.checked; save(); V.drawOverlay(); },
  mkSession(el) { curMk().sessionId = el.value || null; save(); render(); },
  mkNpc(el) { const k = curMk(); k.npcId = el.value || null; const n = S.camp.npcs.find(x => x.id === k.npcId); if (n && !k.label) k.label = n.name; save(); render(); }
};
const TT = (el) => { const t = S.camp.markerTypes[+el.dataset.i]; const k = el.dataset.tt; if (k === 'n') { t.n = S.lang === 'en' ? [t.n[0], el.value] : [el.value, t.n[1] === t.n[0] ? el.value : t.n[1]]; } else t[k] = k === 'size' ? (+el.value || 28) : el.value; save(); };

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-a]'); if (!el) return;
  if (el.dataset.stop && el.dataset.a !== 'modalBg') return;
  const f = A[el.dataset.a]; if (!f) return;
  if (el.dataset.a === 'modalBg' && ev.target !== el) return;
  ev.preventDefault(); f(el, ev);
});
document.addEventListener('input', ev => { const el = ev.target; if (el.dataset.in && IN[el.dataset.in]) IN[el.dataset.in](el); else if (el.dataset.tt) TT(el); });
document.addEventListener('change', ev => { const el = ev.target; if (el.dataset.ch && CH[el.dataset.ch]) CH[el.dataset.ch](el); else if (el.dataset.tt) { TT(el); if (V.drawOverlay) V.drawOverlay(); } });
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && S.modal) { S.modal = null; render(); } if (ev.key === 'Enter' && ev.target.id === 'promptIn') { const b = $('.dlg .btn.primary'); if (b) b.click(); } if ((ev.ctrlKey || ev.metaKey) && ev.key === 's' && S.camp) { ev.preventDefault(); V.exportCampaign(); } });
document.addEventListener('dragover', ev => { ev.preventDefault(); const d = $('#drop'); if (d) d.classList.add('over'); });
document.addEventListener('dragleave', ev => { if (!ev.relatedTarget) { const d = $('#drop'); if (d) d.classList.remove('over'); } });
document.addEventListener('drop', ev => { ev.preventDefault(); const d = $('#drop'); if (d) d.classList.remove('over'); handleDrop(Array.from(ev.dataTransfer.files || [])); });

V.shrinkImg = shrink; V.A = A; V.IN = IN; V.CH = CH; V.loadPdfs = loadPdfs; V.importCampaignFile = importCampaignFile; V.handleDrop = handleDrop; V.rollField = rollField;

/* ---------- Start ---------- */
(async function boot() {
  await V.loadIndex(); render();
  const last = V.LSget('sv.last', null); if (last && S.index.some(x => x.id === last) && !location.hash.includes('home')) await V.openCampaign(last);
})();
})(window);
