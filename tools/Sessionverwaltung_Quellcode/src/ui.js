/* DND5e Sessionverwaltung – Oberfläche */
(function (W) {
'use strict';
const V = W.SV; const { $, esc, S, T, L, G } = V;
/*ORN*/
V.D20 = D20; V.orn = orn;

const fmtDate = t => { try { return new Date(t).toLocaleString(S.lang === 'en' ? 'en-GB' : 'de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
const fmtDay = d => { if (!d) return ''; try { const [y, m, dd] = d.split('-'); return S.lang === 'en' ? d : dd + '.' + m + '.' + y; } catch (e) { return d; } };
const sign = n => (n >= 0 ? '+' : '−') + Math.abs(n);
const modOf = s => Math.floor((s - 10) / 2);
V.sign = sign;

function langSw() { return '<div class="lang">🌐 <button data-a="lang" data-v="de" class="' + (S.lang === 'de' ? 'on' : '') + '">Deutsch</button><button data-a="lang" data-v="en" class="' + (S.lang === 'en' ? 'on' : '') + '">English</button></div>'; }

function render() {
  const root = $('#app'); let h = '';
  if (S.view !== 'camp' || !S.camp) h = renderWelcome();
  else h = renderTop() + '<main class="tab-' + S.tab + '">' + renderTab() + '</main>';
  if (S.modal) h += '<div class="modal" data-a="modalBg"><div class="dlg ' + (S.modal.cls || S.modalCls || '') + '" data-stop="1">' + S.modal() + '</div></div>';
  const y = W.scrollY; const ms = $('.modal') ? $('.modal').scrollTop : 0;
  const keep = {}; ['.sesslist', '.npclist', '.notelist', '.mapside'].forEach(k => { const el = $(k); if (el) keep[k] = el.scrollTop; });
  root.innerHTML = h; document.documentElement.lang = S.lang;
  W.scrollTo(0, y); const m2 = $('.modal'); if (m2) m2.scrollTop = ms;
  Object.keys(keep).forEach(k => { const el = $(k); if (el) el.scrollTop = keep[k]; });
  if (S.view === 'camp' && S.tab === 'map') V.mountMap && V.mountMap();
  if (S.view === 'camp' && S.tab === 'graph') V.mountGraph && V.mountGraph();
}
V.render = render;

/* ---------- Willkommen ---------- */
function renderWelcome() {
  const list = S.index.slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));
  return corners() + '<div class="welcome">' + orn + D20 + '<div class="kicker" style="margin-top:.5em">The Ultimate</div><h1>DND5e ' + T('Sessionverwaltung', 'Session Manager') + '</h1>' + orn +
    '<p class="sub">' + T('Kampagnen und Spielabende planen: Charakterbögen der Gruppe mit Notizen, Schnell-NSCs mit Persönlichkeit, Karte mit Markern, Session-Notizen und Begegnungen aus dem Encounter Builder.', 'Plan campaigns and game nights: party character sheets with notes, quick NPCs with personality, a map with markers, session notes and encounters from the Encounter Builder.') + '</p>' +
    '<p class="sub" style="margin-top:0">' + T('Dein Abenteuer beginnt hier.', 'Your adventure begins here.') + '</p>' + langSw() +
    '<div class="grid2"><button class="btn primary" data-a="newCamp">➕ ' + T('Neue Kampagne', 'New campaign') + '</button><button class="btn" data-a="pickCamp">📂 ' + T('Kampagne laden (Datei)', 'Load campaign (file)') + '</button></div>' +
    (list.length ? '<div class="camplist">' + list.map(c => '<div class="campcard"><div class="cc-main" data-a="openCamp" data-id="' + c.id + '"><b>' + esc(c.name) + '</b><span class="small muted">' + (c.sessions || 0) + ' ' + T('Sessions', 'sessions') + ' · ' + (c.pcs || 0) + ' ' + T('Charaktere', 'characters') + ' · ' + (c.npcs || 0) + ' ' + T('NSCs', 'NPCs') + '<br>' + T('Stand', 'Updated') + ': ' + fmtDate(c.updated) + '</span></div><button class="btn sm ghost" data-a="delCamp" data-id="' + c.id + '" title="' + T('Löschen', 'Delete') + '">🗑️</button></div>').join('') + '</div>' : '') +
    '<div class="drop" id="drop">' + T('…oder eine Kampagnen-Datei (.json) hierher ziehen', '…or drop a campaign file (.json) here') + '</div>' +
    (!S.dbOk ? '<div class="note" style="max-width:560px;margin:0 auto">' + T('Der Browser blockiert den lokalen Speicher. Bitte die Kampagne regelmäßig mit 💾 als Datei sichern.', 'The browser blocks local storage. Please export the campaign regularly with 💾.') + '</div>' : '') +
    '<p><a class="btn sm" href="DND5e_Startseite.html">🏠 ' + T('Zur Startseite', 'To the landing page') + '</a></p></div>';
}

/* ---------- Kopfzeile ---------- */
const TABS = [['sessions', '📅', ['Sessions', 'Sessions']], ['quests', '❗', ['Questlog', 'Quest log']], ['pcs', '🛡️', ['Charaktere', 'Characters']], ['npcs', '🎭', ['NSCs', 'NPCs']], ['pois', '🏛️', ['PoI', 'PoI']], ['graph', '🕸️', ['Beziehungen', 'Relations']], ['map', '🗺️', ['Karte', 'Map']], ['notes', '📜', ['Notizen', 'Notes']]];
function renderTop() {
  const c = S.camp; const s = V.curSession();
  return '<div class="top"><div class="brand" data-a="home" title="' + T('Kampagnen', 'Campaigns') + '">' + D20.replace('class="d20"', '') + '<b>' + T('Sessionverwaltung', 'Session Manager') + '</b></div>' +
    '<input class="campname" data-in="campName" value="' + esc(c.name) + '" title="' + T('Name der Kampagne', 'Campaign name') + '">' +
    '<div class="tabs">' + TABS.map(t => '<div class="tab ' + (S.tab === t[0] ? 'on' : '') + '" data-a="tab" data-v="' + t[0] + '">' + t[1] + ' ' + L(t[2]) + countBadge(t[0]) + '</div>').join('') + '</div>' +
    (s ? '<span class="cursess" data-a="tab" data-v="sessions" title="' + T('Aktuelle Session', 'Current session') + '">📅 ' + esc(V.sessionLabel(s)) + '</span>' : '') +
    '<button class="btn sm" data-a="export" title="' + T('Kampagne als Datei speichern', 'Save campaign as file') + '">💾 ' + T('Speichern', 'Save') + '</button>' +
    '<a class="btn sm" href="DND5e_Startseite.html" title="' + T('Zur Startseite (DND5e Maker)', 'To the landing page (DND5e Maker)') + '">🏠</a>' + langSw() + '</div>';
}
function countBadge(t) { const c = S.camp; const n = t === 'graph' ? (c.groups || []).length + (c.rels || []).length : t === 'pois' ? c.pois.length : t === 'quests' ? c.quests.filter(q => q.status === 'open' || q.status === 'active').length : t === 'sessions' ? c.sessions.length : t === 'pcs' ? c.pcs.length : t === 'npcs' ? c.npcs.length : t === 'notes' ? c.notes.length : c.maps.length; return n ? ' <span class="hpm">' + n + '</span>' : ''; }
function renderTab() {
  switch (S.tab) {
    case 'pcs': return renderPcs();
    case 'npcs': return renderNpcs();
    case 'map': return V.renderMap();
    case 'notes': return renderNotes();
    case 'quests': return V.renderQuests();
    case 'pois': return V.renderPois();
    case 'graph': return V.renderGraph();
    default: return renderSessions();
  }
}

/* ---------- Sessions ---------- */
const STATUS = { planned: ['geplant', 'planned', '🗓️'], live: ['läuft', 'in progress', '🎲'], done: ['abgeschlossen', 'finished', '✅'] };
function renderSessions() {
  const c = S.camp; const list = c.sessions.slice().sort((a, b) => (b.no || 0) - (a.no || 0)); const s = V.curSession();
  let h = '<div class="split"><div class="side"><div class="card"><h3>📅 ' + T('Sessions', 'Sessions') + '<button class="btn sm primary" data-a="newSession">＋ ' + T('Neue Session', 'New session') + '</button></h3><div class="sesslist">' +
    (list.length ? list.map(x => '<div class="li ' + (s && x.id === s.id ? 'on' : '') + '" data-a="selSession" data-id="' + x.id + '"><span class="st">' + STATUS[x.status || 'planned'][2] + '</span><div><b>' + esc(V.sessionLabel(x)) + '</b><div class="tiny muted">' + esc([fmtDay(x.date), x.gameDate, x.place].filter(Boolean).join(' · ')) + (x.encounters.length ? ' · ⚔️ ' + x.encounters.length : '') + '</div></div></div>').join('') : '<p class="muted small">' + T('Noch keine Session. Lege die erste an!', 'No session yet. Create the first one!') + '</p>') +
    '</div></div>' + partyCard() + '</div><div class="mainc">';
  if (!s) h += '<div class="card empty"><p>' + T('Wähle links eine Session oder lege eine neue an.', 'Pick a session on the left or create a new one.') + '</p><button class="btn primary" data-a="newSession">＋ ' + T('Neue Session', 'New session') + '</button></div>';
  else h += sessionDetail(s);
  return h + '</div></div>';
}
function partyCard() {
  const c = S.camp; if (!c.pcs.length) return '<div class="card"><h3>🛡️ ' + T('Gruppe', 'Party') + '</h3><p class="small muted">' + T('Noch keine Charaktere.', 'No characters yet.') + '</p><button class="btn sm" data-a="tab" data-v="pcs">📄 ' + T('Charakterbögen laden', 'Load character sheets') + '</button></div>';
  return '<div class="card"><h3>🛡️ ' + T('Gruppe', 'Party') + '</h3><table class="ptab"><tr><th></th><th title="' + T('Stufe', 'Level') + '">St</th><th title="' + T('Rüstungsklasse', 'Armour class') + '">RK</th><th title="' + T('Trefferpunkte', 'Hit points') + '">TP</th><th title="' + T('Passive Wahrnehmung', 'Passive Perception') + '">PW</th></tr>' +
    c.pcs.map(p => '<tr data-a="gotoPc" data-id="' + p.id + '"><td><b>' + esc(p.name) + '</b></td><td>' + p.lvl + '</td><td>' + p.ac + '</td><td>' + (p.hp || '–') + '</td><td>' + p.pp + '</td></tr>').join('') + '</table></div>';
}
function sessionDetail(s) {
  const c = S.camp;
  let h = '<div class="card"><h3><span>📅 Session ' + esc(s.no) + '</span><span class="r"><button class="btn sm ghost" data-a="delSession" data-id="' + s.id + '">🗑️ ' + T('Löschen', 'Delete') + '</button></span></h3>' +
    '<div class="fgrid sform"><label>' + T('Nr.', 'No.') + '<input type="number" min="0" data-in="sess" data-k="no" value="' + esc(s.no) + '"></label>' +
    '<label class="wide">' + T('Titel', 'Title') + '<input type="text" data-in="sess" data-k="title" value="' + esc(s.title) + '" placeholder="' + T('z. B. Die Ratten im Keller', 'e.g. Rats in the cellar') + '"></label>' +
    '<label>' + T('Datum', 'Date') + '<input type="date" data-in="sess" data-k="date" value="' + esc(s.date) + '"></label>' +
    '<label>' + T('Datum in der Spielwelt', 'In-game date') + '<input type="text" data-in="sess" data-k="gameDate" value="' + esc(s.gameDate) + '"></label>' +
    '<label>' + T('Schauplatz', 'Location') + '<input type="text" list="dl-cities" data-in="sess" data-k="place" value="' + esc(s.place) + '"></label>' +
    '<label>' + T('Status', 'Status') + '<select data-ch="sessStatus">' + Object.keys(STATUS).map(k => '<option value="' + k + '"' + ((s.status || 'planned') === k ? ' selected' : '') + '>' + STATUS[k][2] + ' ' + L(STATUS[k]) + '</option>').join('') + '</select></label></div>' + cityDatalist() +
    (c.pcs.length ? '<div class="present"><span class="small muted">' + T('Anwesend:', 'Present:') + '</span> ' + c.pcs.map(p => '<label class="chk"><input type="checkbox" data-ch="present" data-id="' + p.id + '"' + (s.present.includes(p.id) ? ' checked' : '') + '> ' + esc(p.name) + '</label>').join('') + '</div>' : '') + '</div>';
  h += '<div class="notes3">' +
    noteBox('prep', '🧭 ' + T('Vorbereitung', 'Preparation'), T('Was soll passieren? Szenen, Hinweise, Hooks …', 'What should happen? Scenes, clues, hooks …'), s.prep) +
    noteBox('notes', '🖋️ ' + T('Notizen zur Session', 'Session notes'), T('Was passiert gerade? Entscheidungen, Namen, Beute …', 'What is happening? Decisions, names, loot …'), s.notes) +
    noteBox('recap', '📖 ' + T('Rückblick', 'Recap'), T('Zusammenfassung für die nächste Runde', 'Summary for next time'), s.recap) + '</div>';
  // Begegnungen
  h += '<div class="card"><h3><span>⚔️ ' + T('Begegnungen', 'Encounters') + '</span><span class="r"><button class="btn sm primary" data-a="ebImport">📥 ' + T('Aus Encounter Builder', 'From Encounter Builder') + '</button> <button class="btn sm" data-a="ebFile">📂 ' + T('Datei', 'File') + '</button></span></h3>' +
    (s.encounters.length ? '<div class="pmode small">' + T('Schwierigkeit berechnen für:', 'Rate difficulty for:') + ' <div class="advsel"><button data-a="pmode" data-v="eb" class="' + (S.partyMode !== 'pcs' ? 'on' : '') + '">' + T('Gruppe aus der Begegnung', 'Party from encounter') + '</button><button data-a="pmode" data-v="pcs" class="' + (S.partyMode === 'pcs' ? 'on' : '') + '">' + T('Anwesende Charaktere', 'Present characters') + '</button></div></div>' + s.encounters.map(e => encCard(s, e)).join('') : '<p class="muted small">' + T('Noch keine Begegnungen. Im Encounter Builder gespeicherte Begegnungen lassen sich hier übernehmen – direkt oder als exportierte JSON-Datei.', 'No encounters yet. Encounters saved in the Encounter Builder can be imported here – directly or from an exported JSON file.') + '</p>') + '</div>';
  // Quests
  const qAct = c.quests.filter(q => q.status === 'open' || q.status === 'active' || q.sessionId === s.id || q.log.some(l => l.sessionId === s.id));
  h += '<div class="card"><h3><span>❗ ' + T('Quests', 'Quests') + '</span><span class="r"><button class="btn sm primary" data-a="qNewFor">＋ ' + T('Neue Quest', 'New quest') + '</button> <button class="btn sm" data-a="tab" data-v="quests">' + T('Zum Questlog', 'To the quest log') + '</button></span></h3>' + V.questMini(qAct, T('Keine laufenden Quests.', 'No running quests.')) + '</div>';
  // NSCs
  const npcs = c.npcs.filter(n => s.npcIds.includes(n.id) || (n.sessions || []).includes(s.id));
  h += '<div class="card"><h3><span>🎭 ' + T('NSCs dieser Session', 'NPCs in this session') + '</span><span class="r"><button class="btn sm primary" data-a="quickNpc">⚡ ' + T('Schnell-NSC', 'Quick NPC') + '</button></span></h3><div class="chips">' +
    (npcs.length ? npcs.map(n => '<span class="npcchip" data-a="openNpc" data-id="' + n.id + '">' + (V.isBoss && V.isBoss(n) ? '👑 ' : '') + '<b>' + esc(n.name) + '</b> <span class="tiny">' + esc(V.npcProf(n)) + (n.city ? ' · ' + esc(n.city) : '') + '</span><button class="x" data-a="unlinkNpc" data-id="' + n.id + '" title="' + T('Aus Session entfernen', 'Remove from session') + '">×</button></span>').join('') : '<span class="muted small">' + T('Keine NSCs verknüpft.', 'No NPCs linked.') + '</span>') + '</div>' +
    (c.npcs.length > npcs.length ? '<div class="row" style="margin-top:.4em"><select data-ch="linkNpc"><option value="">＋ ' + T('Vorhandenen NSC verknüpfen …', 'Link existing NPC …') + '</option>' + c.npcs.filter(n => !npcs.includes(n)).map(n => '<option value="' + n.id + '">' + esc(n.name) + ' – ' + esc(V.npcProf(n)) + '</option>').join('') + '</select></div>' : '') + '</div>';
  // Marker
  const mks = []; c.maps.forEach(m => m.markers.forEach(k => { if (k.sessionId === s.id) mks.push([m, k]); }));
  h += '<div class="card"><h3><span>📍 ' + T('Marker dieser Session', 'Markers in this session') + '</span><span class="r"><button class="btn sm" data-a="tab" data-v="map">🗺️ ' + T('Zur Karte', 'To the map') + '</button></span></h3>' +
    (mks.length ? '<div class="chips">' + mks.map(([m, k]) => { const st = V.mkStyle(k); return '<span class="npcchip" data-a="gotoMarker" data-map="' + m.id + '" data-id="' + k.id + '">' + st.icon + ' <b>' + esc(k.label || L(V.mkType(k).n)) + '</b>' + (S.camp.maps.length > 1 ? ' <span class="tiny">' + esc(m.name) + '</span>' : '') + '</span>'; }).join('') + '</div>' : '<p class="muted small">' + T('Marker, die auf der Karte gesetzt werden, während diese Session ausgewählt ist, erscheinen hier.', 'Markers placed on the map while this session is selected appear here.') + '</p>') + '</div>';
  return h;
}
function noteBox(k, title, ph, val) { return '<div class="card nb"><h3>' + title + '</h3><textarea data-in="sess" data-k="' + k + '" placeholder="' + esc(ph) + '">' + esc(val) + '</textarea></div>'; }
function cityDatalist() { return '<datalist id="dl-cities">' + V.cityList().map(c => '<option value="' + esc(c.name) + '">').join('') + '</datalist>'; }
V.cityDatalist = cityDatalist;
function encCard(s, e) {
  const lv = V.partyLevels(e); const ev = V.evalEnc(e, lv); const D = ev.diff >= 0 ? V.DIFF[ev.diff] : null;
  const meta = [e.encType && V.ENCT[e.encType] ? V.ENCT[e.encType][2] + ' ' + L(V.ENCT[e.encType]) : '', e.env && V.ENV[e.env] ? V.ENV[e.env][2] + ' ' + L(V.ENV[e.env]) : ''].filter(Boolean).join(' · ');
  return '<div class="enc ' + (e.status === 'done' ? 'done' : '') + '"><div class="row"><b class="en">' + esc(e.name) + '</b><span class="badge ' + (ev.diff >= 2 ? 'bad' : 'good') + '">' + (D ? D[2] + ' ' + L(D) : '⚪ ' + T('trivial', 'trivial')) + '</span><span class="small muted">' + esc(meta) + '</span><span class="sp"></span>' +
    '<button class="btn sm primary" data-a="encStart" data-id="' + e.id + '" title="' + T('Öffnet den Encounter Builder und startet den Kampf mit den anwesenden Charakteren', 'Opens the Encounter Builder and starts combat with the present characters') + '">⚔️ ' + T('Begegnung starten', 'Start encounter') + '</button>' +
    '<button class="btn sm ' + (e.status === 'done' ? 'gold' : '') + '" data-a="encDone" data-id="' + e.id + '">' + (e.status === 'done' ? '✅ ' + T('erledigt', 'done') : '☐ ' + T('offen', 'open')) + '</button>' +
    (S.camp.sessions.length > 1 ? '<select data-ch="encMove" data-id="' + e.id + '" title="' + T('In andere Session verschieben', 'Move to another session') + '"><option value="">↪</option>' + S.camp.sessions.filter(x => x.id !== s.id).map(x => '<option value="' + x.id + '">' + esc(V.sessionLabel(x)) + '</option>').join('') + '</select>' : '') +
    '<button class="btn sm ghost" data-a="encDel" data-id="' + e.id + '">🗑️</button></div>' +
    '<table class="mtab"><tr><th>#</th><th>' + T('Kreatur', 'Creature') + '</th><th>HG</th><th>RK</th><th>TP</th><th>EP</th></tr>' + e.items.map(it => '<tr><td>' + it.count + '×</td><td>' + esc(S.lang === 'en' ? it.en : it.de) + (it.role && S.lang === 'de' && it.de !== it.en ? '' : '') + (it.leader ? ' 👑' : '') + '</td><td>' + esc(it.cr) + '</td><td>' + esc(it.ac) + '</td><td>' + esc(it.hp) + '</td><td>' + (V.crXp(it.cr) * it.count) + '</td></tr>').join('') + '</table>' +
    '<div class="small">' + T('EP gesamt', 'Total XP') + ': <b>' + ev.xp + '</b> · ' + T('angepasst', 'adjusted') + ' ×' + ev.m + ' = <b>' + ev.adj + '</b> · ' + T('Gruppe', 'Party') + ': ' + (lv.length ? lv.length + ' × ' + T('St.', 'lvl') + ' ' + lv.join('/') : '–') +
    (lv.length ? ' · ' + T('Schwellen', 'Thresholds') + ' ' + ev.th.join(' / ') + ' · <b>' + ev.perPlayer + ' EP</b> ' + T('pro Spieler', 'per player') : '') + '</div>' +
    (e.hint ? '<details class="small"><summary>' + T('Taktischer Hinweis', 'Tactical hint') + '</summary><div>' + esc(typeof e.hint === 'string' ? e.hint : L(e.hint.text || e.hint.t || e.hint) || '') + '</div></details>' : '') +
    '<textarea class="encnote" data-in="encNote" data-id="' + e.id + '" placeholder="' + T('Notizen zur Begegnung (Ort, Auslöser, Beute …)', 'Encounter notes (location, trigger, loot …)') + '">' + esc(e.notes) + '</textarea></div>';
}

/* ---------- Charaktere ---------- */
function renderPcs() {
  const c = S.camp;
  let h = '<div class="card toolbar"><div class="row"><h3 style="margin:0">🛡️ ' + T('Charaktere der Gruppe', 'Party characters') + '</h3><span class="sp"></span>' +
    '<button class="btn primary" data-a="pickPdf">📄 ' + T('Charakterbögen laden (PDF)', 'Load character sheets (PDF)') + '</button>' +
    '<button class="btn" data-a="fromManager">🛡️ ' + T('Aus Charakterverwaltung', 'From Character Manager') + '</button>' +
    '<button class="btn" data-a="newPc">＋ ' + T('Ohne Bogen anlegen', 'Add without sheet') + '</button></div>' +
    '<div class="drop slim" id="drop">' + T('PDF-Charakterbögen (Creator oder offizieller 5e-Bogen) hierher ziehen – auch mehrere auf einmal. Ein Bogen mit gleichem Namen aktualisiert den Charakter, die Notizen bleiben.', 'Drop PDF character sheets (Creator or official 5e sheet) here – several at once is fine. A sheet with the same name updates the character; notes are kept.') + '</div></div>';
  if (!c.pcs.length) return h + '<div class="card empty"><p>' + T('Noch keine Charaktere.', 'No characters yet.') + '</p></div>';
  return h + '<div class="pcgrid">' + c.pcs.map(pcCard).join('') + '</div>';
}
function pcCard(p) {
  const AN = V.ABIL_N[S.lang] || V.ABIL_N.de; const ini = (p.name || '?').split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase();
  const pers = p.pers || {}; const tx = p.text || {};
  const det = [[T('Persönlichkeit', 'Personality'), pers.traits], [T('Ideale', 'Ideals'), pers.ideals], [T('Bindungen', 'Bonds'), pers.bonds], [T('Makel', 'Flaws'), pers.flaws], [T('Merkmale & Fähigkeiten', 'Features & traits'), tx.features], [T('Angriffe', 'Attacks'), tx.attacks], [T('Ausrüstung', 'Equipment'), tx.equipment], [T('Übungen & Sprachen', 'Proficiencies & languages'), tx.profs], [T('Hintergrund', 'Background'), tx.backstory]].filter(x => x[1]);
  return '<div class="card pc" id="pc-' + p.id + '"><div class="pchead"><div class="por" data-a="pcImg" data-id="' + p.id + '" title="' + T('Bild ändern', 'Change picture') + '">' + (p.img ? '<img src="' + p.img + '" alt="">' : '<span>' + esc(ini) + '</span>') + '</div><div class="pcn"><h2>' + esc(p.name) + '</h2><div class="small">' + esc([p.cls, p.race].filter(Boolean).join(' · ')) + '</div><div class="tiny muted">' + esc([p.bg, p.align, p.player ? T('Spieler', 'Player') + ': ' + p.player : ''].filter(Boolean).join(' · ')) + '</div></div></div>' +
    '<div class="stats3 s5"><div class="stat"><b>' + p.lvl + '</b><span>' + T('Stufe', 'Level') + '</span></div><div class="stat"><b>' + p.ac + '</b><span>RK</span></div><div class="stat"><b>' + (p.hp || '–') + '</b><span>' + T('TP max.', 'Max HP') + '</span></div><div class="stat"><b>' + p.pp + '</b><span>' + T('Pass. Wahrn.', 'Pass. Perc.') + '</span></div><div class="stat"><b>' + sign(p.init || 0) + '</b><span>Init.</span></div></div>' +
    '<div class="abils">' + V.ABIL.map((a, i) => '<div class="abil"><div class="n">' + AN[i] + '</div><div class="m">' + sign(modOf(p.abil[i])) + '</div><div class="s">' + p.abil[i] + '</div><div class="sv" title="' + T('Rettungswurf', 'Saving throw') + '">RW ' + sign(p.saves[i]) + '</div></div>').join('') + '</div>' +
    '<div class="tiny muted pcx">' + [p.speed ? T('Bewegung', 'Speed') + ' ' + esc(p.speed) : '', p.spell && p.spell.dc ? T('Zauber-SG', 'Spell DC') + ' ' + p.spell.dc : '', p.insight != null ? T('Motiv erkennen', 'Insight') + ' ' + sign(p.insight) + ' (' + T('passiv', 'passive') + ' ' + (10 + p.insight) + ')' : '', p.investigation != null ? T('Nachforschungen', 'Investigation') + ' ' + sign(p.investigation) : ''].filter(Boolean).join(' · ') + '</div>' +
    (det.length ? '<details><summary>' + T('Aus dem Bogen', 'From the sheet') + '</summary>' + det.map(x => '<div class="tiny"><b>' + x[0] + ':</b></div><div class="txt">' + esc(x[1]) + '</div>').join('') + '</details>' : '') +
    '<h4 class="kick">❗ ' + T('Quests', 'Quests') + ' <button class="btn sm" data-a="qNewFor" data-pc="' + p.id + '">＋</button></h4>' + V.questMini(V.questsFor(p.id).filter(q => q.status === 'open' || q.status === 'active'), T('Keine laufenden Quests.', 'No running quests.')) + (V.questsFor(p.id).some(q => q.status === 'done' || q.status === 'failed') ? '<div class="tiny muted">' + V.questsFor(p.id).filter(q => q.status === 'done').length + ' ' + T('erledigt', 'completed') + ', ' + V.questsFor(p.id).filter(q => q.status === 'failed').length + ' ' + T('gescheitert', 'failed') + '</div>' : '') +
    (V.graphMini ? V.graphMini('pc', p.id) : '') +
    '<h4 class="kick">🖋️ ' + T('Notizen der Spielleitung', 'GM notes') + '</h4><textarea class="pcnote" data-in="pcNote" data-id="' + p.id + '" placeholder="' + T('Geheimnisse, Verbindungen, offene Fäden, Belohnungen …', 'Secrets, connections, loose threads, rewards …') + '">' + esc(p.notes) + '</textarea>' +
    '<div class="row pcbtn">' + (p.pdf ? '<button class="btn sm" data-a="pcPdf" data-id="' + p.id + '">📄 ' + T('PDF öffnen', 'Open PDF') + '</button>' : '') + '<button class="btn sm" data-a="pcReplace" data-id="' + p.id + '">🔄 ' + T('Neuer Bogen', 'New sheet') + '</button><button class="btn sm" data-a="pcEdit" data-id="' + p.id + '">✏️ ' + T('Werte', 'Stats') + '</button><span class="sp"></span><button class="btn sm ghost" data-a="pcDel" data-id="' + p.id + '">🗑️</button></div>' +
    '<div class="tiny muted">' + (p.src === 'creator' ? '⚔️ Creator' : p.src === 'manager' ? '🛡️ ' + T('Charakterverwaltung', 'Character Manager') : p.src === 'manual' ? '✏️ ' + T('manuell', 'manual') : '📄 PDF') + (p.pdfName ? ' · ' + esc(p.pdfName) : '') + ' · ' + fmtDate(p.imported) + '</div></div>';
}
function pcEditDlg(p) {
  const f = (k, lbl, type) => '<label>' + lbl + '<input type="' + (type || 'text') + '" data-pe="' + k + '" value="' + esc(p[k]) + '"></label>';
  return '<h2>✏️ ' + esc(p.name) + '</h2><div class="fgrid">' + f('name', T('Name', 'Name')) + f('cls', T('Klasse & Stufe', 'Class & level')) + f('race', T('Volk', 'Race')) + f('player', T('Spieler', 'Player')) + f('bg', T('Hintergrund', 'Background')) + f('align', T('Gesinnung', 'Alignment')) + f('ac', 'RK', 'number') + f('hp', T('TP max.', 'Max HP'), 'number') + f('pp', T('Passive Wahrnehmung', 'Passive Perception'), 'number') + f('init', 'Initiative', 'number') + f('speed', T('Bewegung', 'Speed')) + '</div>' +
    '<h3>' + T('Attribute / Rettungswürfe', 'Abilities / saves') + '</h3><div class="fgrid">' + V.ABIL.map((a, i) => '<label>' + (V.ABIL_N[S.lang] || V.ABIL_N.de)[i] + '<span><input type="number" data-pa="' + i + '" value="' + p.abil[i] + '"> RW <input type="number" data-ps="' + i + '" value="' + p.saves[i] + '"></span></label>').join('') + '</div>' +
    '<div class="foot"><button class="btn" data-a="closeModal">' + T('Abbrechen', 'Cancel') + '</button><button class="btn primary" data-a="pcEditSave" data-id="' + p.id + '">' + T('Übernehmen', 'Apply') + '</button></div>';
}
V.pcEditDlg = pcEditDlg;

/* ---------- NSCs ---------- */
V.npcProf = n => n.prof === 'custom' ? (n.profText || '') : G.profLabel(n.prof, n.gender, S.lang);
function renderNpcs() {
  return '<div class="split npcs"><div class="mainc">' + npcEditor() + '</div><div class="side">' + npcList() + '</div></div>';
}
function lockBtn(n, k) { const on = n.lock && n.lock[k]; return '<button class="lk ' + (on ? 'on' : '') + '" data-a="npcLock" data-k="' + k + '" title="' + (on ? T('Gesperrt – „Alles würfeln“ lässt dieses Feld in Ruhe. Klicken zum Entsperren.', 'Locked – "Roll all" leaves this field alone. Click to unlock.') : T('Frei – wird beim Würfeln neu bestimmt. Klicken zum Sperren.', 'Free – rerolled by "Roll all". Click to lock.')) + '">' + (on ? '🔒' : '🔓') + '</button>'; }
function dieBtn(k) { return '<button class="dz" data-a="npcRoll" data-k="' + k + '" title="' + T('Neu würfeln', 'Reroll') + '">🎲</button>'; }
function npcEditor() {
  if (!S.npc) V.newNpcDraft();
  const n = S.npc; const R = G.RACES[n.race] || G.RACES.human; const ci = V.findCity(n.city);
  const profOpts = G.PROF_GROUPS.map((g, gi) => '<optgroup label="' + esc(L(g)) + '">' + G.PROFS.filter(p => p.grp === gi).map(p => '<option value="' + p.k + '"' + (n.prof === p.k ? ' selected' : '') + '>' + esc(G.profLabel(p.k, n.gender, S.lang)) + '</option>').join('') + '</optgroup>').join('') + '<option value="custom"' + (n.prof === 'custom' ? ' selected' : '') + '>✏️ ' + T('Eigener Beruf …', 'Custom profession …') + '</option>';
  const sbIds = ['commoner', 'guard', 'acolyte', 'bandit', 'cultist', 'noble', 'tribal-warrior', 'scout', 'thug', 'spy', 'priest', 'druid', 'bandit-captain', 'berserker', 'cult-fanatic', 'knight', 'veteran', 'gladiator', 'mage', 'assassin', 'archmage'];
  const sb = n.sb || G.statBlock(n.prof); const M = W.SV_MON[sb];
  const w = +n.wealth; const WD = G.WEALTH[w] || G.WEALTH[3];
  const cult = G.CULTURES[G.cultureFor(n.city)];
  let h = '<div class="card npced"><h3><span>' + (S.npcNew ? '⚡ ' + T('Schnell-NSC erstellen', 'Quick NPC') : '🎭 ' + esc(n.name || T('NSC', 'NPC'))) + '</span><span class="r">' + (S.npcNew ? '' : '<button class="btn sm" data-a="npcDup">⧉ ' + T('Kopie', 'Copy') + '</button> <button class="btn sm" data-a="npcMark">📍 ' + T('Auf Karte', 'On map') + '</button> <button class="btn sm ghost" data-a="npcDel">🗑️</button> ') + '<button class="btn sm" data-a="npcNew">＋ ' + T('Neu', 'New') + '</button></span></h3>' +
    '<div class="ngrid">' +
    '<label>' + T('Beruf', 'Profession') + '<span class="fld"><select data-ch="npcProf">' + profOpts + '</select>' + lockBtn(n, 'prof') + '</span>' + (n.prof === 'custom' ? '<input type="text" data-in="npc" data-k="profText" value="' + esc(n.profText) + '" placeholder="' + T('z. B. Rattenfänger', 'e.g. rat catcher') + '">' : '') + '</label>' +
    '<label>' + T('Stadt', 'Town') + '<span class="fld"><input type="text" list="dl-cities" data-in="npcCity" value="' + esc(n.city) + '" placeholder="' + T('aus der Karte wählen oder frei eingeben', 'pick from the map or type freely') + '"></span>' + (ci ? '<span class="tiny muted">' + esc([ci.city.type, ci.city.wealth, (ci.city.races || []).filter(r => r.n).slice(0, 4).map(r => r.n + ' ' + r.p + ' %').join(', ')].filter(Boolean).join(' · ')) + '</span>' : (n.city && ['human', 'halfelf', 'halforc', 'tiefling'].includes(n.race) ? '<span class="tiny muted">' + T('Namenskultur', 'Naming culture') + ': ' + esc(L(cult.n)) + '</span>' : '')) + '</label>' +
    '<label>' + T('Volk', 'Race') + '<span class="fld"><select data-ch="npcRace">' + G.RACE_KEYS.map(k => '<option value="' + k + '"' + (n.race === k ? ' selected' : '') + '>' + esc(L(G.RACES[k].n)) + '</option>').join('') + '</select>' + (R.subs.length ? '<select data-ch="npcSub">' + R.subs.map((s, i) => '<option value="' + i + '"' + (+n.sub === i ? ' selected' : '') + '>' + esc(L(s)) + '</option>').join('') + '</select>' : '') + dieBtn('race') + lockBtn(n, 'race') + '</span></label>' +
    '<label>' + T('Geschlecht', 'Gender') + '<span class="fld"><select data-ch="npcGender">' + G.genders().map(g => '<option value="' + g[0] + '"' + (n.gender === g[0] ? ' selected' : '') + '>' + esc(L(g[1])) + '</option>').join('') + '</select>' + lockBtn(n, 'gender') + '</span></label>' +
    '<label>' + T('Alter', 'Age') + '<span class="fld"><input type="number" min="1" data-in="npcAge" value="' + esc(n.age) + '"><span class="tiny agel">' + esc(G.stageLabel(n.race, n.age, S.lang)) + '</span>' + dieBtn('age') + lockBtn(n, 'age') + '</span><span class="tiny muted">' + T('Erwachsen ab', 'Adult at') + ' ' + R.adult + ', ' + T('bis ca.', 'up to about') + ' ' + R.max + '</span></label>' +
    '<label class="wide">' + T('Reichtum', 'Wealth') + ' – <b class="wl">' + esc(L(WD.n)) + '</b><span class="fld"><input type="range" min="0" max="6" step="1" data-in="npcWealth" value="' + w + '" class="wslider">' + dieBtn('wealth') + lockBtn(n, 'wealth') + '</span><span class="tiny muted wd">' + esc(L(WD.d)) + '</span></label>' +
    '<label class="wide">' + T('Name', 'Name') + '<span class="fld"><input type="text" class="nmin" data-in="npc" data-k="name" data-lk="name" value="' + esc(n.name) + '">' + dieBtn('name') + lockBtn(n, 'name') + '</span><span class="tiny muted">' + T('abhängig von Volk, Stadt und Stand', 'depends on race, town and status') + '</span></label>' +
    '<label>' + T('Geldbeutel', 'Purse') + '<span class="fld"><input type="text" data-in="npc" data-k="purse" data-lk="purse" value="' + esc(n.purse) + '">' + dieBtn('purse') + lockBtn(n, 'purse') + '</span></label>' +
    '<label>' + T('Spielwerte (SRD)', 'Stat block (SRD)') + '<span class="fld"><select data-ch="npcSb">' + sbIds.map(id => '<option value="' + id + '"' + (sb === id ? ' selected' : '') + '>' + esc(S.lang === 'en' ? W.SV_MON[id][1] : W.SV_MON[id][0]) + ' (HG ' + W.SV_MON[id][2] + ')</option>').join('') + '</select></span>' + (M ? '<span class="tiny muted">RK ' + M[3] + ' · TP ' + M[4] + ' · HG ' + M[2] + '</span>' : '') + '</label>' +
    '</div>' +
    '<h4 class="kick">✨ ' + T('Charaktereigenschaften', 'Character traits') + ' <button class="btn sm gold" data-a="npcRollAll">🎲 ' + T('Alles würfeln', 'Roll all') + '</button> <button class="btn sm" data-a="npcRollTraits">🎲 ' + T('Nur Eigenschaften', 'Traits only') + '</button></h4><div class="traits">' +
    G.TRAIT_KEYS.map(k => '<label><span class="tn">' + esc(L(G.TRAITS[k].n)) + '</span><span class="fld"><input type="text" data-in="npcTrait" data-k="' + k + '" value="' + esc(n.traits[k]) + '">' + dieBtn('t_' + k) + lockBtn(n, 't_' + k) + '</span></label>').join('') + '</div>' +
    '<div class="hint"><b>🎭 ' + T('So spielst du', 'How to play') + ' ' + esc((n.name || '').split(' „')[0]) + ':</b> ' + esc(G.playHint(n, S.lang)) + '</div>' +
    (V.bossSection ? V.bossSection(n) : '') +
    '<h4 class="kick">🖋️ ' + T('Notizen', 'Notes') + '</h4><textarea data-in="npc" data-k="notes" placeholder="' + T('Was die Gruppe mit diesem NSC erlebt hat …', 'What the party experienced with this NPC …') + '">' + esc(n.notes) + '</textarea>' +
    (S.npcNew ? '' : npcQuestBlock(n)) +
    (S.npcNew || !V.graphMini ? '' : V.graphMini('npc', n.id)) +
    (S.npcNew ? '' : '<h4 class="kick">🏛️ ' + T('Zu finden in', 'Found at') + '</h4><div class="chips">' + (V.poisOfNpc(n.id).length ? V.poisOfNpc(n.id).map(p => '<span class="npcchip" data-a="openPoi" data-id="' + p.id + '">' + V.poiIcon(p) + ' <b>' + esc(p.name) + '</b><button class="x" data-a="npcPoiUnlink" data-id="' + p.id + '">×</button></span>').join('') : '<span class="muted small">' + T('Keinem PoI zugeordnet.', 'Not linked to a PoI.') + '</span>') + (S.camp.pois.length ? '<select data-ch="npcPoiLink"><option value="">＋ ' + T('PoI zuordnen …', 'Link to PoI …') + '</option>' + S.camp.pois.filter(p => !(p.npcIds || []).includes(n.id)).map(p => '<option value="' + p.id + '">' + V.poiIcon(p) + ' ' + esc(p.name) + (p.city ? ' (' + esc(p.city) + ')' : '') + '</option>').join('') + '</select>' : '') + '</div>') +
    sessionLinks(n) +
    '<div class="foot">' + (S.npcNew ? '<button class="btn primary" data-a="npcSave">💾 ' + T('NSC speichern', 'Save NPC') + '</button>' : '<span class="small muted">✔ ' + T('Änderungen werden automatisch gespeichert.', 'Changes are saved automatically.') + '</span>') + '</div></div>' + cityDatalist();
  return h;
}
function npcQuestBlock(n) {
  const qs = V.questsOfNpc(n.id); const rest = S.camp.quests.filter(q => !qs.includes(q)).sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  return '<h4 class="kick">❗ ' + T('Quests dieses NSC', 'Quests of this NPC') + ' <button class="btn sm" data-a="qNewFor" data-npc="' + n.id + '" title="' + T('Neue Quest mit diesem NSC als Auftraggeber', 'New quest with this NPC as quest giver') + '">＋ ' + T('Neue Quest', 'New quest') + '</button></h4>' +
    V.questMini(qs, T('Noch an keiner Quest beteiligt.', 'Not involved in any quest yet.'), n.id) +
    (rest.length ? '<div class="row qnpcadd"><select id="npcQuestPick"><option value="">＋ ' + T('Zu Quest hinzufügen …', 'Add to quest …') + '</option>' + rest.map(q => '<option value="' + q.id + '">' + V.QST[q.status][2] + ' ' + esc(q.title || T('(ohne Titel)', '(untitled)')) + '</option>').join('') + '</select>' + V.questRoleSel('id="npcQuestRole"', 'info', '<option value="giver">📜 ' + T('Auftraggeber', 'Quest giver') + '</option>') + '<button class="btn sm primary" data-a="npcQuestAdd">＋ ' + T('Hinzufügen', 'Add') + '</button></div>' : '');
}
function sessionLinks(n) {
  const c = S.camp; if (!c.sessions.length) return '';
  const ids = new Set((n.sessions || []).concat(c.sessions.filter(s => s.npcIds.includes(n.id)).map(s => s.id)));
  return '<div class="present"><span class="small muted">' + T('Kommt vor in:', 'Appears in:') + '</span> ' + c.sessions.slice().sort((a, b) => b.no - a.no).slice(0, 12).map(s => '<label class="chk"><input type="checkbox" data-ch="npcSess" data-id="' + s.id + '"' + (ids.has(s.id) ? ' checked' : '') + '> #' + s.no + '</label>').join('') + '</div>';
}
function npcList() {
  const c = S.camp; const q = S.npcQ.toLowerCase();
  let list = c.npcs.filter(n => (!q || [n.name, V.npcProf(n), n.city, n.notes].join(' ').toLowerCase().includes(q)) && (!S.npcCity || (n.city || '') === S.npcCity));
  list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));
  const cities = Array.from(new Set(c.npcs.map(n => n.city || ''))).filter(Boolean).sort();
  return '<div class="card"><h3>📇 ' + T('NSC-Liste', 'NPC list') + ' <span class="r">' + c.npcs.length + '</span></h3><div class="row"><input type="text" class="grow" data-in="npcQ" value="' + esc(S.npcQ) + '" placeholder="🔍 ' + T('Suchen …', 'Search …') + '">' + (cities.length ? '<select data-ch="npcCityF"><option value="">' + T('Alle Orte', 'All places') + '</option>' + cities.map(x => '<option' + (S.npcCity === x ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select>' : '') + '</div><div class="npclist">' +
    (list.length ? list.map(n => '<div class="li ' + (!S.npcNew && S.npc && S.npc.id === n.id ? 'on' : '') + '" data-a="openNpc" data-id="' + n.id + '"><span class="st">' + (V.isBoss && V.isBoss(n) ? '👑' : (W.SV_WICON[n.wealth] || '•')) + '</span><div><b>' + esc(n.name) + '</b><div class="tiny muted">' + esc([V.npcProf(n), L(G.RACES[n.race] ? G.RACES[n.race].n : ['', '']), n.age, n.city].filter(Boolean).join(' · ')) + '</div></div></div>').join('') : '<p class="muted small">' + (c.npcs.length ? T('Keine Treffer.', 'No matches.') : T('Noch keine NSCs gespeichert.', 'No NPCs saved yet.')) + '</p>') + '</div></div>';
}
W.SV_WICON = ['🥀', '🪙', '🪙', '💰', '💰', '💎', '👑'];

/* ---------- Notizen ---------- */
const CATS = [['general', ['Allgemein', 'General'], '📜'], ['quest', ['Auftrag', 'Quest'], '❗'], ['lore', ['Lore & Geschichte', 'Lore & history'], '📚'], ['place', ['Ort', 'Place'], '🏰'], ['faction', ['Fraktion', 'Faction'], '⚜️'], ['item', ['Gegenstand', 'Item'], '🗝️'], ['rule', ['Hausregel', 'House rule'], '⚖️'], ['idea', ['Idee', 'Idea'], '💡']];
const catOf = k => CATS.find(c => c[0] === k) || CATS[0];
function renderNotes() {
  const c = S.camp; const q = S.noteQ.toLowerCase();
  const list = c.notes.filter(n => (!q || (n.title + ' ' + n.text).toLowerCase().includes(q)) && (!S.noteCat || n.cat === S.noteCat)).sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || (b.updated || 0) - (a.updated || 0));
  const n = c.notes.find(x => x.id === S.selNote);
  let h = '<div class="split"><div class="side"><div class="card"><h3>📜 ' + T('Allgemeine Notizen', 'General notes') + '<button class="btn sm primary" data-a="newNote">＋ ' + T('Neu', 'New') + '</button></h3><div class="row"><input type="text" class="grow" data-in="noteQ" value="' + esc(S.noteQ) + '" placeholder="🔍 ' + T('Suchen …', 'Search …') + '"><select data-ch="noteCat"><option value="">' + T('Alle', 'All') + '</option>' + CATS.map(k => '<option value="' + k[0] + '"' + (S.noteCat === k[0] ? ' selected' : '') + '>' + k[2] + ' ' + esc(L(k[1])) + '</option>').join('') + '</select></div><div class="notelist">' +
    (list.length ? list.map(x => '<div class="li ' + (n && n.id === x.id ? 'on' : '') + '" data-a="selNote" data-id="' + x.id + '"><span class="st">' + (x.pin ? '📌' : catOf(x.cat)[2]) + '</span><div><b>' + esc(x.title || T('(ohne Titel)', '(untitled)')) + '</b><div class="tiny muted">' + esc((x.text || '').slice(0, 70)) + '</div></div></div>').join('') : '<p class="muted small">' + T('Keine Notizen.', 'No notes.') + '</p>') + '</div></div></div><div class="mainc">';
  if (!n) h += '<div class="card empty"><p>' + T('Notizen für alles, was über eine Session hinaus wichtig ist: Aufträge, Lore, Fraktionen, Hausregeln …', 'Notes for anything that matters beyond one session: quests, lore, factions, house rules …') + '</p><button class="btn primary" data-a="newNote">＋ ' + T('Neue Notiz', 'New note') + '</button></div>';
  else h += '<div class="card noteed"><div class="row"><input type="text" class="grow ntitle" data-in="note" data-k="title" value="' + esc(n.title) + '" placeholder="' + T('Titel', 'Title') + '"><select data-ch="noteCatSet">' + CATS.map(k => '<option value="' + k[0] + '"' + (n.cat === k[0] ? ' selected' : '') + '>' + k[2] + ' ' + esc(L(k[1])) + '</option>').join('') + '</select><button class="btn sm ' + (n.pin ? 'gold' : '') + '" data-a="notePin">📌</button><button class="btn sm ghost" data-a="noteDel">🗑️</button></div><textarea class="bignote" data-in="note" data-k="text" placeholder="' + T('Text …', 'Text …') + '">' + esc(n.text) + '</textarea><div class="tiny muted">' + T('Zuletzt geändert', 'Last changed') + ': ' + fmtDate(n.updated) + '</div></div>';
  return h + '</div></div>';
}

/* ---------- Dialoge ---------- */
V.ebDialog = function (src, list, ctx) {
  const s = V.curSession();
  return '<h2>📥 ' + T('Begegnungen übernehmen', 'Import encounters') + '</h2><p class="small">' + (src === 'ls' ? T('Gespeicherte Begegnungen aus dem Encounter Builder (gleicher Browser):', 'Encounters saved in the Encounter Builder (same browser):') : T('Begegnungen aus der Datei:', 'Encounters in the file:')) + ' ' + T('Ziel', 'Target') + ': <b>' + esc(s ? V.sessionLabel(s) : '') + '</b></p>' +
    (list.length ? '<table><tr><th></th><th>' + T('Name', 'Name') + '</th><th>' + T('Kreaturen', 'Creatures') + '</th><th>' + T('Gruppe', 'Party') + '</th></tr>' + list.map((e, i) => { const r = V.resolveEnc(e, ctx); const already = s && s.encounters.some(x => x.srcId && x.srcId === e.id); return '<tr><td><input type="checkbox" data-ebsel="' + i + '"' + (already ? '' : ' checked') + '></td><td><b>' + esc(e.name) + '</b>' + (already ? ' <span class="badge">' + T('schon da', 'already added') + '</span>' : '') + '</td><td class="small">' + esc(r.items.map(it => it.count + '× ' + (S.lang === 'en' ? it.en : it.de)).join(', ')) + '</td><td class="small">' + (e.levels || []).length + ' × ' + esc((e.levels || []).join('/')) + '</td></tr>'; }).join('') + '</table>'
      : '<div class="note">' + (src === 'ls' ? T('Im Encounter Builder wurden in diesem Browser noch keine Begegnungen gespeichert. Speichere dort eine Begegnung (💾) oder exportiere sie als Datei und lade sie hier mit „📂 Datei“.', 'No encounters saved in the Encounter Builder in this browser yet. Save one there (💾) or export a file and load it here with "📂 File".') : T('Die Datei enthält keine Begegnungen.', 'The file contains no encounters.')) + '</div>') +
    '<div class="foot"><button class="btn" data-a="closeModal">' + T('Abbrechen', 'Cancel') + '</button>' + (list.length ? '<button class="btn primary" data-a="ebDo">📥 ' + T('Übernehmen', 'Import') + '</button>' : '') + '</div>';
};
V.mgrDialog = function (chars) {
  return '<h2>🛡️ ' + T('Aus der Charakterverwaltung', 'From the Character Manager') + '</h2>' + (chars.length ? '<table>' + chars.map((c, i) => '<tr><td><input type="checkbox" data-mgsel="' + i + '" checked></td><td><b>' + esc(c.name) + '</b></td><td class="small">' + esc([c.classStr, c.race].filter(Boolean).join(' · ')) + '</td></tr>').join('') + '</table>' : '<div class="note">' + T('In der Charakterverwaltung (gleicher Browser) sind keine Charaktere gespeichert.', 'No characters are stored in the Character Manager (same browser).') + '</div>') +
    '<div class="foot"><button class="btn" data-a="closeModal">' + T('Abbrechen', 'Cancel') + '</button>' + (chars.length ? '<button class="btn primary" data-a="mgrDo">' + T('Übernehmen', 'Import') + '</button>' : '') + '</div>';
};
V.confirmDlg = function (title, text, action, data) {
  return '<h2>' + title + '</h2><p>' + text + '</p><div class="foot"><button class="btn" data-a="closeModal">' + T('Abbrechen', 'Cancel') + '</button><button class="btn primary" data-a="' + action + '" data-id="' + esc(data || '') + '">' + T('Ja', 'Yes') + '</button></div>';
};
V.promptDlg = function (title, label, val, action) {
  return '<h2>' + title + '</h2><label class="blk">' + label + '<input type="text" id="promptIn" value="' + esc(val) + '"></label><div class="foot"><button class="btn" data-a="closeModal">' + T('Abbrechen', 'Cancel') + '</button><button class="btn primary" data-a="' + action + '">OK</button></div>';
};
V.CATS = CATS; V.fmtDate = fmtDate;
})(window);
