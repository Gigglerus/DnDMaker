/* DND5e Sessionverwaltung – Questlog */
(function (W) {
'use strict';
const V = W.SV; const { $, $$, esc, S, T, L, uid, save, toast } = V;
const QST = { open: ['offen', 'open', '📯'], active: ['aktiv', 'active', '🔥'], done: ['abgeschlossen', 'completed', '✅'], failed: ['gescheitert', 'failed', '✖️'] };
const QKIND = { main: ['Hauptquest', 'Main quest', '👑'], side: ['Nebenquest', 'Side quest', '📜'], personal: ['Persönliche Quest', 'Personal quest', '🛡️'], rumor: ['Gerücht / Spur', 'Rumour / lead', '👂'] };
const QROLE = { info: ['Infogeber', 'Informant', '💬'], contact: ['Kontaktperson', 'Contact', '🤝'], ally: ['Verbündeter', 'Ally', '🛡️'], witness: ['Zeuge', 'Witness', '👁️'], suspect: ['Verdächtiger', 'Suspect', '🕵️'], target: ['Zielperson', 'Target', '🎯'], victim: ['Opfer / Hilfesuchender', 'Victim / in need', '🆘'], antagonist: ['Gegenspieler', 'Antagonist', '⚔️'], merchant: ['Händler / Versorger', 'Supplier', '💰'], other: ['Sonstiges', 'Other', '•'] };
V.QST = QST; V.QKIND = QKIND; V.QROLE = QROLE;
const roleLbl = r => QROLE[r] ? QROLE[r][2] + ' ' + L(QROLE[r]) : '';
/* Beteiligte NSCs: Auftraggeber (giverNpc) + Liste q.npcs [{id, role, note}] */
function npcRoles(q, npcId) { const r = []; if (q.giverNpc === npcId) r.push({ role: 'giver' }); (q.npcs || []).forEach(x => { if (x.id === npcId) r.push(x); }); return r; }
V.questsOfNpc = npcId => S.camp.quests.filter(q => npcRoles(q, npcId).length);
V.questRoleText = (q, npcId) => npcRoles(q, npcId).map(x => x.role === 'giver' ? '📜 ' + T('Auftraggeber', 'Quest giver') : roleLbl(x.role) + (x.note ? ' – ' + x.note : '')).join(' · ');
function roleSel(attr, val, extra) { return '<select ' + attr + '>' + Object.keys(QROLE).map(k => '<option value="' + k + '"' + (val === k ? ' selected' : '') + '>' + roleLbl(k) + '</option>').join('') + (extra || '') + '</select>'; }
V.questRoleSel = roleSel;
const render = () => V.render();
const curQ = () => S.camp.quests.find(q => q.id === S.selQuest);
const pcsOf = q => q.allPcs ? S.camp.pcs : S.camp.pcs.filter(p => q.pcIds.includes(p.id));
V.questsFor = pcId => S.camp.quests.filter(q => q.allPcs || q.pcIds.includes(pcId));
const running = q => q.status === 'open' || q.status === 'active';
V.questStatusBadge = q => '<span class="qs qs-' + q.status + '">' + QST[q.status][2] + ' ' + esc(L(QST[q.status])) + '</span>';
function giverName(q) { const n = q.giverNpc && S.camp.npcs.find(x => x.id === q.giverNpc); return n ? n.name : (q.giver || ''); }

V.renderQuests = function () {
  const c = S.camp; const qq = S.questQ.toLowerCase();
  const list = c.quests.filter(q => (S.questSt === 'all' || (S.questSt === 'open' ? running(q) : q.status === S.questSt)) && (!S.questPc || q.allPcs || q.pcIds.includes(S.questPc)) && (!S.questNpc || npcRoles(q, S.questNpc).length) && (!qq || [q.title, q.desc, q.place, q.reward, giverName(q), (q.npcs || []).map(x => { const n = S.camp.npcs.find(y => y.id === x.id); return (n ? n.name : '') + ' ' + (x.note || ''); }).join(' '), q.log.map(l => l.t).join(' ')].join(' ').toLowerCase().includes(qq)))
    .sort((a, b) => (running(b) - running(a)) || ((b.status === 'active') - (a.status === 'active')) || ((a.kind === 'main' ? 0 : 1) - (b.kind === 'main' ? 0 : 1)) || (b.updated || 0) - (a.updated || 0));
  const q = curQ();
  const cnt = k => c.quests.filter(x => k === 'open' ? running(x) : k === 'all' ? true : x.status === k).length;
  let h = '<div class="split"><div class="side"><div class="card"><h3>❗ ' + T('Questlog', 'Quest log') + '<button class="btn sm primary" data-a="qNew">＋ ' + T('Neue Quest', 'New quest') + '</button></h3>' +
    '<div class="advsel qfilter">' + [['open', T('Laufend', 'Running')], ['done', T('Erledigt', 'Done')], ['failed', T('Gescheitert', 'Failed')], ['all', T('Alle', 'All')]].map(f => '<button data-a="qFilter" data-v="' + f[0] + '" class="' + (S.questSt === f[0] ? 'on' : '') + '">' + f[1] + ' ' + cnt(f[0]) + '</button>').join('') + '</div>' +
    '<div class="row" style="margin-top:.35em"><input type="text" class="grow" data-in="questQ" value="' + esc(S.questQ) + '" placeholder="🔍 ' + T('Suchen …', 'Search …') + '">' + (c.pcs.length ? '<select data-ch="qPcF"><option value="">🛡️ ' + T('Alle Charaktere', 'All characters') + '</option>' + c.pcs.map(p => '<option value="' + p.id + '"' + (S.questPc === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') + '</select>' : '') + (c.npcs.length ? '<select data-ch="qNpcF"><option value="">🎭 ' + T('Alle NSCs', 'All NPCs') + '</option>' + c.npcs.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(n => '<option value="' + n.id + '"' + (S.questNpc === n.id ? ' selected' : '') + '>' + esc(n.name) + '</option>').join('') + '</select>' : '') + '</div><div class="questlist">' +
    (list.length ? list.map(x => { const st = x.steps.length ? x.steps.filter(s => s.done).length + '/' + x.steps.length : ''; const who = x.allPcs ? T('ganze Gruppe', 'whole party') : pcsOf(x).map(p => p.name.split(' ')[0]).join(', '); return '<div class="li ' + (q && q.id === x.id ? 'on' : '') + ' qst-' + x.status + '" data-a="qSel" data-id="' + x.id + '"><span class="st">' + QKIND[x.kind || 'side'][2] + '</span><div><b>' + esc(x.title || T('(ohne Titel)', '(untitled)')) + '</b><div class="tiny muted">' + QST[x.status][2] + ' ' + esc(L(QST[x.status])) + (st ? ' · ☑ ' + st : '') + (who ? ' · 🛡️ ' + esc(who) : '') + '</div></div></div>'; }).join('') : '<p class="muted small">' + (c.quests.length ? T('Keine Quests in dieser Ansicht.', 'No quests in this view.') : T('Noch keine Quests. Lege die erste an und verknüpfe sie mit den Charakteren, die sie betrifft.', 'No quests yet. Create the first one and link it to the characters it concerns.')) + '</p>') + '</div></div></div><div class="mainc">';
  h += q ? questEditor(q) : '<div class="card empty"><p>' + T('Das Questlog hält alle Aufträge, Spuren und persönlichen Ziele fest – mit Zielen zum Abhaken, Notizen je Session und den Charakteren, die betroffen sind.', 'The quest log keeps track of every job, lead and personal goal – with objectives to tick off, notes per session and the characters involved.') + '</p><button class="btn primary" data-a="qNew">＋ ' + T('Neue Quest', 'New quest') + '</button></div>';
  return h + '</div></div>';
};
function questEditor(q) {
  const c = S.camp; const npcs = c.npcs.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const sess = c.sessions.slice().sort((a, b) => b.no - a.no);
  let h = '<div class="card qed"><div class="row"><input type="text" class="grow ntitle" data-in="q" data-k="title" value="' + esc(q.title) + '" placeholder="' + T('Name der Quest', 'Quest name') + '"><button class="btn sm ghost" data-a="qDel">🗑️</button></div>' +
    '<div class="fgrid sform"><label>' + T('Status', 'Status') + '<select data-ch="qStatus">' + Object.keys(QST).map(k => '<option value="' + k + '"' + (q.status === k ? ' selected' : '') + '>' + QST[k][2] + ' ' + esc(L(QST[k])) + '</option>').join('') + '</select></label>' +
    '<label>' + T('Art', 'Kind') + '<select data-ch="qKind">' + Object.keys(QKIND).map(k => '<option value="' + k + '"' + ((q.kind || 'side') === k ? ' selected' : '') + '>' + QKIND[k][2] + ' ' + esc(L(QKIND[k])) + '</option>').join('') + '</select></label>' +
    '<label>' + T('Auftraggeber', 'Quest giver') + '<select data-ch="qGiver"><option value="">– ' + T('frei eingeben', 'type freely') + ' –</option>' + npcs.map(n => '<option value="' + n.id + '"' + (q.giverNpc === n.id ? ' selected' : '') + '>🎭 ' + esc(n.name) + '</option>').join('') + '</select>' + (q.giverNpc ? '' : '<input type="text" data-in="q" data-k="giver" value="' + esc(q.giver) + '" placeholder="' + T('Name', 'Name') + '">') + '</label>' +
    '<label>' + T('Ort', 'Location') + '<input type="text" list="dl-cities" data-in="q" data-k="place" value="' + esc(q.place) + '"></label>' +
    '<label class="wide">' + T('Belohnung', 'Reward') + '<input type="text" data-in="q" data-k="reward" value="' + esc(q.reward) + '" placeholder="' + T('z. B. 200 GM und ein Gefallen der Gilde', 'e.g. 200 gp and a favour from the guild') + '"></label>' +
    '<label>' + T('Begonnen in', 'Started in') + '<select data-ch="qSess"><option value="">–</option>' + sess.map(s => '<option value="' + s.id + '"' + (q.sessionId === s.id ? ' selected' : '') + '>' + esc(V.sessionLabel(s)) + '</option>').join('') + '</select></label></div>' + V.cityDatalist() +
    '<h4 class="kick">🛡️ ' + T('Betroffene Charaktere', 'Characters involved') + '</h4><div class="present qpcs">' +
    (c.pcs.length ? '<label class="chk"><input type="checkbox" data-ch="qAll"' + (q.allPcs ? ' checked' : '') + '> <b>' + T('Ganze Gruppe', 'Whole party') + '</b></label>' + c.pcs.map(p => '<label class="chk pcchk ' + (q.allPcs || q.pcIds.includes(p.id) ? 'on' : '') + '"><input type="checkbox" data-ch="qPc" data-id="' + p.id + '"' + (q.allPcs || q.pcIds.includes(p.id) ? ' checked' : '') + (q.allPcs ? ' disabled' : '') + '> ' + esc(p.name) + '</label>').join('') : '<span class="small muted">' + T('Noch keine Charaktere – lade zuerst die Charakterbögen.', 'No characters yet – load the character sheets first.') + '</span>') + '</div>' +
    questNpcBlock(q) +
    '<h4 class="kick">📝 ' + T('Beschreibung', 'Description') + '</h4><textarea data-in="q" data-k="desc" class="qdesc" placeholder="' + T('Worum geht es? Was weiß die Gruppe?', 'What is it about? What does the party know?') + '">' + esc(q.desc) + '</textarea>' +
    '<h4 class="kick">☑ ' + T('Ziele', 'Objectives') + (q.steps.length ? ' <span class="tiny">' + q.steps.filter(s => s.done).length + '/' + q.steps.length + '</span>' : '') + '</h4><div class="steps">' +
    q.steps.map((s, i) => '<div class="step ' + (s.done ? 'done' : '') + '"><input type="checkbox" data-ch="qStepDone" data-i="' + i + '"' + (s.done ? ' checked' : '') + '><input type="text" data-in="qStep" data-i="' + i + '" value="' + esc(s.t) + '"><button class="btn sm ghost" data-a="qStepDel" data-i="' + i + '">×</button></div>').join('') +
    '<div class="step add"><span>＋</span><input type="text" id="qStepNew" placeholder="' + T('Neues Ziel – Enter zum Hinzufügen', 'New objective – Enter to add') + '"></div></div>' +
    '<h4 class="kick">📖 ' + T('Questlog-Einträge', 'Log entries') + '</h4><div class="qlogadd"><textarea id="qLogNew" placeholder="' + T('Was ist passiert? (wird mit der aktuellen Session gespeichert)', 'What happened? (saved with the current session)') + '"></textarea><button class="btn primary" data-a="qLogAdd">✍️ ' + T('Eintragen', 'Add entry') + '</button></div><div class="qlog">' +
    (q.log.length ? q.log.slice().reverse().map(l => { const s = l.sessionId && c.sessions.find(x => x.id === l.sessionId); return '<div class="qle"><div class="tiny muted">' + (s ? '📅 ' + esc(V.sessionLabel(s)) + ' · ' : '') + V.fmtDate(l.at) + '<button class="btn sm ghost" data-a="qLogDel" data-id="' + l.id + '">×</button></div><textarea data-in="qLog" data-id="' + l.id + '">' + esc(l.t) + '</textarea></div>'; }).join('') : '<p class="small muted">' + T('Noch keine Einträge.', 'No entries yet.') + '</p>') + '</div>' +
    '<div class="tiny muted">' + T('Zuletzt geändert', 'Last changed') + ': ' + V.fmtDate(q.updated) + '</div></div>';
  return h;
}
function questNpcBlock(q) {
  const c = S.camp; const list = q.npcs || []; const used = new Set(list.map(x => x.id));
  const rest = c.npcs.filter(n => !used.has(n.id)).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  let h = '<h4 class="kick">🎭 ' + T('Beteiligte NSCs', 'NPCs involved') + ' <span class="tiny">' + T('Infogeber, Kontakte, Verbündete …', 'informants, contacts, allies …') + '</span></h4><div class="qnpcs">';
  h += list.length ? list.map((x, i) => { const n = c.npcs.find(y => y.id === x.id); if (!n) return ''; return '<div class="qnpc"><span class="npcchip" data-a="openNpc" data-id="' + n.id + '">' + (n.boss && n.boss.on ? '👑 ' : '') + '<b>' + esc(n.name) + '</b> <span class="tiny">' + esc(V.npcProf(n)) + (n.city ? ' · ' + esc(n.city) : '') + '</span></span>' + roleSel('data-ch="qNpcRole" data-i="' + i + '"', x.role) + '<input type="text" class="grow" data-in="qNpcNote" data-i="' + i + '" value="' + esc(x.note) + '" placeholder="' + T('Was weiß / tut dieser NSC? z. B. „kennt das Versteck“', 'What does this NPC know / do? e.g. "knows the hideout"') + '"><button class="btn sm ghost" data-a="qNpcDel" data-i="' + i + '" title="' + T('Aus der Quest entfernen', 'Remove from quest') + '">×</button></div>'; }).join('') : '<p class="small muted">' + T('Noch keine NSCs beteiligt.', 'No NPCs involved yet.') + '</p>';
  h += '<div class="row qnpcadd">' + (rest.length ? '<select id="qNpcPick"><option value="">＋ ' + T('NSC hinzufügen …', 'Add NPC …') + '</option>' + rest.map(n => '<option value="' + n.id + '">' + esc(n.name) + ' – ' + esc(V.npcProf(n)) + (n.city ? ' (' + esc(n.city) + ')' : '') + '</option>').join('') + '</select>' + roleSel('id="qNpcPickRole"', 'info') + '<button class="btn sm primary" data-a="qNpcAdd">＋ ' + T('Hinzufügen', 'Add') + '</button>' : '') +
    '<button class="btn sm" data-a="qNpcNew" title="' + T('Neuen Schnell-NSC anlegen und als Infogeber zur Quest hinzufügen', 'Create a new quick NPC and add it to the quest as informant') + '">⚡ ' + T('Neuer NSC als Infogeber', 'New NPC as informant') + '</button></div></div>';
  return h;
}
/* Kurzlisten für andere Ansichten */
V.questMini = function (qs, emptyTxt, npcId) {
  if (!qs.length) return '<p class="small muted">' + emptyTxt + '</p>';
  return '<div class="qmini">' + qs.map(q => '<div class="li qst-' + q.status + '" data-a="qOpen" data-id="' + q.id + '"><span class="st">' + QKIND[q.kind || 'side'][2] + '</span><div><b>' + esc(q.title || T('(ohne Titel)', '(untitled)')) + '</b> ' + V.questStatusBadge(q) + (q.steps.length ? ' <span class="tiny muted">☑ ' + q.steps.filter(s => s.done).length + '/' + q.steps.length + '</span>' : '') + (npcId ? '<div class="tiny">' + esc(V.questRoleText(q, npcId)) + '</div>' : '') + (q.steps.find(s => !s.done) ? '<div class="tiny muted">➤ ' + esc(q.steps.find(s => !s.done).t) + '</div>' : '') + '</div>' + (npcId ? '<button class="btn sm ghost x" data-a="npcQuestDel" data-id="' + q.id + '" title="' + T('NSC aus dieser Quest entfernen', 'Remove NPC from this quest') + '">×</button>' : '') + '</div>').join('') + '</div>';
};

function touch(q) { q.updated = Date.now(); save(); }
function newQuest(extra) {
  const q = Object.assign({ id: uid(), title: '', kind: 'side', status: 'active', giver: '', giverNpc: '', npcs: [], place: '', reward: '', pcIds: [], allPcs: false, desc: '', steps: [], log: [], sessionId: S.selSession || '', created: Date.now(), updated: Date.now() }, extra || {});
  S.camp.quests.push(q); S.selQuest = q.id; S.tab = 'quests'; if (!running(q) && S.questSt === 'open') S.questSt = 'all'; save(); render();
  setTimeout(() => { const i = $('[data-in="q"][data-k="title"]'); if (i) i.focus(); }, 30);
}
V.newQuest = newQuest;
Object.assign(V.A, {
  qNew() { newQuest(S.questPc ? { pcIds: [S.questPc] } : {}); },
  qNewFor(el) { newQuest(el.dataset.pc ? { pcIds: [el.dataset.pc] } : el.dataset.npc ? (el.dataset.role && el.dataset.role !== 'giver' ? { npcs: [{ id: el.dataset.npc, role: el.dataset.role, note: '' }] } : { giverNpc: el.dataset.npc }) : {}); },
  qSel(el) { S.selQuest = el.dataset.id; render(); },
  qOpen(el) { S.selQuest = el.dataset.id; S.tab = 'quests'; const q = curQ(); if (q && S.questSt !== 'all' && !(S.questSt === 'open' ? running(q) : q.status === S.questSt)) S.questSt = 'all'; S.modal = null; render(); W.scrollTo(0, 0); },
  qFilter(el) { S.questSt = el.dataset.v; render(); },
  qDel() { const q = curQ(); S.modal = () => V.confirmDlg('🗑️ ' + esc(q.title || 'Quest'), T('Quest samt Logbuch löschen?', 'Delete quest including its log?'), 'qDelDo', q.id); render(); },
  qDelDo(el) { S.camp.quests = S.camp.quests.filter(q => q.id !== el.dataset.id); S.camp.maps.forEach(m => m.markers.forEach(k => { if (k.questId === el.dataset.id) k.questId = null; })); S.selQuest = null; S.modal = null; save(); render(); },
  qStepDel(el) { const q = curQ(); q.steps.splice(+el.dataset.i, 1); touch(q); render(); },
  qLogAdd() { const q = curQ(); const t = ($('#qLogNew') || {}).value || ''; if (!t.trim()) { toast(T('Bitte zuerst etwas eintragen.', 'Please write something first.')); return; } q.log.push({ id: uid(), t: t.trim(), sessionId: S.selSession || '', at: Date.now() }); touch(q); render(); },
  qNpcAdd() {
    const q = curQ(); const id = ($('#qNpcPick') || {}).value; if (!id) { toast(T('Bitte zuerst einen NSC wählen.', 'Please choose an NPC first.')); return; }
    q.npcs = q.npcs || []; if (!q.npcs.some(x => x.id === id)) q.npcs.push({ id, role: ($('#qNpcPickRole') || {}).value || 'info', note: '' }); touch(q); render();
  },
  qNpcDel(el) { const q = curQ(); q.npcs.splice(+el.dataset.i, 1); touch(q); render(); },
  qNpcNew() {
    const q = curQ(); const G = V.G; const city = q.place || ''; const ci = V.findCity(city);
    const n = G.rollNpc({ id: uid(), prof: G.pick(['innkeeper', 'server', 'merchant', 'beggar', 'guard', 'scholar', 'peddler', 'thief', 'acolyte']), city, traits: {}, lock: {}, notes: '', sessions: [], created: Date.now() }, ci ? { cityRaces: ci.city.races, cityWealth: ci.city.wealth } : {}, S.lang);
    n.sb = G.statBlock(n.prof); n.notes = T('Infogeber für „', 'Informant for "') + (q.title || '') + T('“', '"'); n.updated = Date.now();
    S.camp.npcs.push(n); q.npcs = q.npcs || []; q.npcs.push({ id: n.id, role: 'info', note: n.traits && n.traits.rumor ? n.traits.rumor : '' }); touch(q);
    toast('⚡ ' + n.name + ' – ' + T('als Infogeber hinzugefügt', 'added as informant')); render();
  },
  // vom NSC aus
  npcQuestAdd() {
    const n = S.npc; const qid = ($('#npcQuestPick') || {}).value; const role = ($('#npcQuestRole') || {}).value || 'info';
    if (!qid) { toast(T('Bitte zuerst eine Quest wählen.', 'Please choose a quest first.')); return; }
    const q = S.camp.quests.find(x => x.id === qid); if (!q) return;
    if (role === 'giver') q.giverNpc = n.id; else { q.npcs = q.npcs || []; if (!q.npcs.some(x => x.id === n.id)) q.npcs.push({ id: n.id, role, note: '' }); }
    touch(q); toast('❗ ' + (q.title || 'Quest') + ' – ' + (role === 'giver' ? T('Auftraggeber', 'quest giver') : L(QROLE[role]))); render();
  },
  npcQuestDel(el) { const n = S.npc; const q = S.camp.quests.find(x => x.id === el.dataset.id); if (!q) return; if (q.giverNpc === n.id) q.giverNpc = ''; q.npcs = (q.npcs || []).filter(x => x.id !== n.id); touch(q); render(); },
  qLogDel(el) { const q = curQ(); q.log = q.log.filter(l => l.id !== el.dataset.id); touch(q); render(); }
});
Object.assign(V.IN, {
  q(el) { const q = curQ(); q[el.dataset.k] = el.value; touch(q); if (el.dataset.k === 'title') V.scheduleRender(900); },
  qNpcNote(el) { const q = curQ(); const x = q.npcs[+el.dataset.i]; if (x) { x.note = el.value; touch(q); } },
  qStep(el) { const q = curQ(); q.steps[+el.dataset.i].t = el.value; touch(q); },
  qLog(el) { const q = curQ(); const l = q.log.find(x => x.id === el.dataset.id); if (l) { l.t = el.value; touch(q); } },
  questQ(el) { S.questQ = el.value; V.scheduleRender(250, true); }
});
Object.assign(V.CH, {
  qStatus(el) { const q = curQ(); q.status = el.value; if (el.value === 'done' || el.value === 'failed') q.closed = Date.now(); touch(q); render(); },
  qKind(el) { const q = curQ(); q.kind = el.value; touch(q); render(); },
  qGiver(el) { const q = curQ(); q.giverNpc = el.value; touch(q); render(); },
  qSess(el) { const q = curQ(); q.sessionId = el.value; touch(q); },
  qAll(el) { const q = curQ(); q.allPcs = el.checked; touch(q); render(); },
  qPc(el) { const q = curQ(); const id = el.dataset.id; q.pcIds = q.pcIds.filter(x => x !== id); if (el.checked) q.pcIds.push(id); touch(q); el.closest('.pcchk').classList.toggle('on', el.checked); },
  qNpcRole(el) { const q = curQ(); const x = q.npcs[+el.dataset.i]; if (x) { x.role = el.value; touch(q); } },
  qNpcF(el) { S.questNpc = el.value; render(); },
  qPcF(el) { S.questPc = el.value; render(); },
  qStepDone(el) { const q = curQ(); q.steps[+el.dataset.i].done = el.checked; touch(q); render(); },
  mkQuest(el) { const m = V.curMap(); const k = m.markers.find(x => x.id === S.selMarker); k.questId = el.value || null; const q = S.camp.quests.find(x => x.id === k.questId); if (q && !k.label) k.label = q.title; save(); render(); }
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Enter' && ev.target.id === 'qStepNew') { ev.preventDefault(); const v = ev.target.value.trim(); if (!v) return; const q = curQ(); q.steps.push({ id: uid(), t: v, done: false }); touch(q); render(); setTimeout(() => { const i = $('#qStepNew'); if (i) i.focus(); }, 20); }
  if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey) && ev.target.id === 'qLogNew') { ev.preventDefault(); V.A.qLogAdd(); }
});
})(window);
