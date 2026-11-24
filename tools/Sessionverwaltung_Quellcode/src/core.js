/* DND5e Sessionverwaltung – Kern: Zustand, Speicher, Datenoperationen */
(function (W) {
'use strict';
const G = W.SV_GEN;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const LSget = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const LSset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };

const S = W.SV_S = {
  lang: LSget('sv.lang', 'de'), view: 'home', tab: 'sessions', camp: null, index: [], dbOk: true,
  selSession: null, selNote: null, npc: null, npcNew: true, npcQ: '', npcCity: '', mapId: null,
  mv: { s: 1, tx: 0, ty: 0 }, mapMode: 'select', curType: 'party', selMarker: null, selCity: null, mapFilter: 'all', showCities: true, showLabels: true, bindSession: true,
  noteQ: '', noteCat: '', questQ: '', questSt: 'open', questPc: '', selQuest: null, modal: null, partyMode: 'eb'
};
const T = (de, en) => S.lang === 'en' ? en : de;
const L = p => G.L(p, S.lang);

/* ---------- IndexedDB ---------- */
const DB = {
  _db: null,
  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((res, rej) => { try { const r = indexedDB.open('dnd5e-session', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => { this._db = r.result; res(r.result); }; r.onerror = () => rej(r.error); } catch (e) { rej(e); } });
  },
  async get(k) { try { const db = await this.open(); return await new Promise(res => { const t = db.transaction('kv').objectStore('kv').get(k); t.onsuccess = () => res(t.result); t.onerror = () => res(undefined); }); } catch (e) { S.dbOk = false; return undefined; } },
  async set(k, v) { try { const db = await this.open(); await new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); return true; } catch (e) { S.dbOk = false; return false; } },
  async del(k) { try { const db = await this.open(); await new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').delete(k); tx.oncomplete = res; tx.onerror = res; }); } catch (e) { } }
};
/* Atlas-Daten (gleicher Ursprung file://) */
function readAtlasDB() {
  return new Promise(res => {
    try {
      const r = indexedDB.open('dnd5e-atlas', 1);
      r.onupgradeneeded = () => { r.transaction.abort(); res(null); };
      r.onerror = () => res(null);
      r.onsuccess = () => {
        const db = r.result; if (!db.objectStoreNames.contains('kv')) { db.close(); res(null); return; }
        const out = {}; const tx = db.transaction('kv'); const st = tx.objectStore('kv');
        const a = st.get('map'), b = st.get('state'); a.onsuccess = () => { out.map = a.result; }; b.onsuccess = () => { out.state = b.result; };
        tx.oncomplete = () => { db.close(); res(out.map ? out : null); }; tx.onerror = () => { db.close(); res(null); };
      };
    } catch (e) { res(null); }
  });
}

let saveT = null;
function save(now) {
  if (!S.camp) return; S.camp.updated = Date.now();
  clearTimeout(saveT);
  const run = async () => {
    const c = S.camp; if (!c) return;
    const ok = await DB.set('c:' + c.id, c);
    const ix = S.index.find(x => x.id === c.id); const meta = { id: c.id, name: c.name, updated: c.updated, sessions: c.sessions.length, pcs: c.pcs.length, npcs: c.npcs.length };
    if (ix) Object.assign(ix, meta); else S.index.push(meta);
    await DB.set('index', S.index);
    if (!ok) flagSave();
  };
  if (now) return run(); saveT = setTimeout(run, 450);
}
function flagSave() { if (!flagSave.done) { flagSave.done = true; toast(T('Achtung: Der Browser erlaubt kein Speichern. Bitte die Kampagne mit 💾 als Datei sichern.', 'Warning: the browser does not allow saving. Please export the campaign with 💾.'), 6000); } }
W.addEventListener('beforeunload', () => { if (saveT) { clearTimeout(saveT); save(true); } });

/* ---------- Kampagne ---------- */
const DEF_TYPES = () => [
  { id: 'party', n: ['Gruppe', 'Party'], icon: '🛡️', color: '#2f5fa8', shape: 'pin', size: 34 },
  { id: 'enc', n: ['Begegnung', 'Encounter'], icon: '⚔️', color: '#8a2222', shape: 'pin', size: 32 },
  { id: 'npc', n: ['NSC', 'NPC'], icon: '🎭', color: '#7a3a8a', shape: 'circle', size: 28 },
  { id: 'quest', n: ['Auftrag', 'Quest'], icon: '❗', color: '#c98a12', shape: 'diamond', size: 30 },
  { id: 'treasure', n: ['Schatz', 'Treasure'], icon: '💰', color: '#b8902f', shape: 'circle', size: 28 },
  { id: 'danger', n: ['Gefahr', 'Danger'], icon: '☠️', color: '#3b2416', shape: 'square', size: 28 },
  { id: 'place', n: ['Ort', 'Place'], icon: '🏰', color: '#4f8a4a', shape: 'pin', size: 30 },
  { id: 'camp', n: ['Lager', 'Camp'], icon: '⛺', color: '#a0705a', shape: 'circle', size: 26 },
  { id: 'note', n: ['Notiz', 'Note'], icon: '📜', color: '#5a6a9a', shape: 'flag', size: 28 }
];
function newCampaign(name) {
  return { id: uid(), app: 'sv', v: 1, name: name || T('Neue Kampagne', 'New campaign'), created: Date.now(), updated: Date.now(), sessions: [], pcs: [], npcs: [], notes: [], quests: [], pois: [], groups: [], rels: [], graph: { nodes: [] }, maps: [], markerTypes: DEF_TYPES(), activeSession: null };
}
function upgrade(c) {
  ['sessions', 'pcs', 'npcs', 'notes', 'quests', 'pois', 'maps'].forEach(k => { if (!Array.isArray(c[k])) c[k] = []; });
  if (!Array.isArray(c.markerTypes) || !c.markerTypes.length) c.markerTypes = DEF_TYPES();
  c.sessions.forEach(s => { s.encounters = s.encounters || []; s.npcIds = s.npcIds || []; s.present = s.present || []; });
  c.groups = c.groups || []; c.rels = c.rels || []; c.graph = c.graph || { nodes: [] }; c.graph.nodes = c.graph.nodes || []; c.groups.forEach(g => { g.members = g.members || []; });
  c.quests.forEach(q => { q.npcs = q.npcs || []; q.pcIds = q.pcIds || []; q.steps = q.steps || []; q.log = q.log || []; });
  c.pois.forEach(p => { p.npcIds = p.npcIds || []; p.goods = p.goods || []; p.traits = p.traits || {}; p.lock = p.lock || {}; });
  c.maps.forEach(m => { m.markers = m.markers || []; m.cities = m.cities || []; });
  c.npcs.forEach(n => { n.traits = n.traits || {}; n.lock = n.lock || {}; n.sessions = n.sessions || []; });
  return c;
}
async function loadIndex() { S.index = (await DB.get('index')) || []; }
async function openCampaign(id) {
  const c = await DB.get('c:' + id); if (!c) { toast(T('Kampagne nicht gefunden.', 'Campaign not found.')); return; }
  S.camp = upgrade(c); S.view = 'camp'; S.tab = LSget('sv.tab', 'sessions');
  S.selSession = c.activeSession && c.sessions.find(s => s.id === c.activeSession) ? c.activeSession : (lastSession() || {}).id || null;
  S.mapId = c.maps[0] ? c.maps[0].id : null; S.selMarker = null; S.selCity = null; S.npc = null; S.selNote = c.notes[0] ? c.notes[0].id : null; S.selQuest = null; S.questNpc = ''; S.gSel = null; S.gRel = null; S.gLinkFrom = null; S.gMode = 'select'; S.gv = null; S.poi = null; S.pendingPoi = null;
  LSset('sv.last', id); W.SV.render(); W.SV.fitMap && setTimeout(W.SV.fitMap, 30);
}
async function createCampaign(name) { const c = newCampaign(name); S.camp = c; await save(true); await openCampaign(c.id); }
async function deleteCampaign(id) { await DB.del('c:' + id); S.index = S.index.filter(x => x.id !== id); await DB.set('index', S.index); }
function lastSession() { const a = S.camp ? S.camp.sessions.slice().sort((x, y) => (y.no || 0) - (x.no || 0)) : []; return a[0]; }
const curSession = () => S.camp && S.camp.sessions.find(s => s.id === S.selSession);
const curMap = () => S.camp && S.camp.maps.find(m => m.id === S.mapId);
function newSession() {
  const c = S.camp; const no = c.sessions.reduce((a, s) => Math.max(a, +s.no || 0), 0) + 1;
  const s = { id: uid(), no, title: '', date: new Date().toISOString().slice(0, 10), gameDate: '', place: '', status: 'planned', prep: '', notes: '', recap: '', encounters: [], npcIds: [], present: c.pcs.map(p => p.id), created: Date.now() };
  c.sessions.push(s); S.selSession = s.id; c.activeSession = s.id; save(); return s;
}
function sessionLabel(s) { return '#' + s.no + (s.title ? ' – ' + s.title : ''); }

/* ---------- Downloads / Dateien ---------- */
function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); }
const safeName = s => String(s || 'Kampagne').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'Kampagne';
function exportCampaign() {
  const c = S.camp; if (!c) return;
  const data = { app: 'The Ultimate DND5e Sessionverwaltung', version: 1, savedAt: new Date().toISOString(), campaign: c };
  download(safeName(c.name) + '_Kampagne.json', new Blob([JSON.stringify(data)], { type: 'application/json' }));
  toast('💾 ' + T('Kampagne gespeichert', 'Campaign saved'));
}
const readAs = (f, how) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r[how](f); });
function dataUrlToBlob(u) { const [h, b] = u.split(','); const mime = (h.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream'; const bin = atob(b); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: mime }); }
function openDataUrl(u, name) { try { const url = URL.createObjectURL(dataUrlToBlob(u)); const w = W.open(url, '_blank'); if (!w) download(name || 'datei', dataUrlToBlob(u)); } catch (e) { toast(e.message); } }
let toastT = null;
function toast(msg, ms) { let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); } t.textContent = msg; clearTimeout(toastT); toastT = setTimeout(() => t.remove(), ms || 2800); }

/* ---------- Charakterbögen ---------- */
const num = (v, d) => { const m = String(v == null ? '' : v).replace('−', '-').match(/[+-]?\d+/); return m ? parseInt(m[0], 10) : d; };
const ABIL = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const ABIL_N = { de: ['STÄ', 'GES', 'KON', 'INT', 'WEI', 'CHA'], en: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] };
function levelOf(cls) { let t = 0; String(cls || '').replace(/(\d+)/g, (_, n) => { if (+n <= 20) t += +n; }); return Math.max(1, Math.min(20, t || 1)); }
function creatorJson(bytes) {
  // eingebetteter Datenblock des Creators: DND5EDATA{…}ENDDND5E
  const b = bytes; const key = [68, 78, 68, 53, 69, 68, 65, 84, 65];
  outer: for (let i = 0; i < b.length - key.length; i++) {
    for (let j = 0; j < key.length; j++) if (b[i + j] !== key[j]) continue outer;
    let end = -1; const e = [69, 78, 68, 68, 78, 68, 53, 69];
    outer2: for (let k = i + 9; k < b.length - e.length; k++) { for (let j = 0; j < e.length; j++) if (b[k + j] !== e[j]) continue outer2; end = k; break; }
    if (end < 0) return null;
    try { const txt = new TextDecoder('utf-8').decode(b.subarray(i + 9, end)); return JSON.parse(txt); } catch (err) { return null; }
  }
  return null;
}
async function parseSheet(file) {
  const buf = new Uint8Array(await readAs(file, 'readAsArrayBuffer'));
  const pdf = await readAs(file, 'readAsDataURL');
  let f = null, src = 'pdf', img = '';
  const cj = creatorJson(buf);
  if (cj && cj.gen) { f = cj.gen; src = 'creator'; try { const st = typeof cj.S === 'string' ? JSON.parse(cj.S) : cj.S; if (st && typeof st.img === 'string' && /^data:image/.test(st.img)) img = st.img; } catch (e) { } }
  if (!f) { try { f = await W.PdfForm.readFields(buf); } catch (e) { f = {}; } if (f && f.kl !== undefined && f.a0 !== undefined) src = 'creator'; }
  const pc = sheetToPc(f || {}, src, file.name);
  pc.pdf = pdf; pc.pdfName = file.name; pc.pdfSize = file.size; if (img) pc.img = img;
  return pc;
}
function sheetToPc(f, src, fileName) {
  const g = (...ks) => { for (const k of ks) { if (f[k] !== undefined && f[k] !== '' && f[k] !== false) return String(f[k]).replace(/\r\n?/g, '\n').trim(); const kk = Object.keys(f).find(x => x.trim() === k.trim()); if (kk && f[kk] !== '' && f[kk] !== false && f[kk] !== undefined) return String(f[kk]).replace(/\r\n?/g, '\n').trim(); } return ''; };
  const pc = { id: uid(), src, imported: Date.now(), notes: '' };
  if (src === 'creator') {
    pc.name = g('n'); pc.cls = g('kl'); pc.race = g('ra'); pc.bg = g('bg'); pc.player = g('sp'); pc.align = g('ge');
    pc.abil = ABIL.map((a, i) => num(g('a' + i), 10)); pc.saves = ABIL.map((a, i) => num(g('s' + i), 0));
    pc.ac = num(g('ac'), 10); pc.hp = num(g('hm'), 0); pc.init = num(g('in'), 0); pc.pp = num(g('pw'), 10);
    const sd = g('sd'); const sn = parseFloat(sd.replace(',', '.')) || 9; pc.speed = /ft|fuß/i.test(sd) ? Math.round(sn) + ' ft' : (S.lang === 'en' ? Math.round(sn / 1.5 * 5) + ' ft' : String(sn).replace('.', ',') + ' m');
    pc.speedRaw = sd;
    pc.pers = { traits: g('pe'), ideals: g('id'), bonds: g('bi'), flaws: g('ma') };
    pc.text = { features: g('ft'), equipment: g('eq'), profs: g('kn'), attacks: g('at'), backstory: g('bk') };
    pc.spell = g('zd') ? { cls: g('zc'), dc: num(g('zd'), null), atk: g('zb') } : null;
    pc.insight = num(g('k8'), null); pc.investigation = num(g('k9'), null);
  } else {
    pc.name = g('CharacterName', 'CharacterName 2', 'Charaktername'); pc.cls = g('ClassLevel', 'Klasse & Stufe', 'Klasse'); pc.race = g('Race ', 'Race', 'Volk', 'Rasse'); pc.bg = g('Background', 'Hintergrund'); pc.player = g('PlayerName', 'Spielername', 'Spieler'); pc.align = g('Alignment', 'Gesinnung');
    pc.abil = ABIL.map(a => num(g(a), 10));
    const SV = ['ST Strength', 'ST Dexterity', 'ST Constitution', 'ST Intelligence', 'ST Wisdom', 'ST Charisma'];
    pc.saves = ABIL.map((a, i) => num(g(SV[i]), Math.floor((pc.abil[i] - 10) / 2)));
    pc.ac = num(g('AC', 'RK', 'Rüstungsklasse'), 10); pc.hp = num(g('HPMax', 'TP Maximum'), 0); pc.init = num(g('Initiative'), Math.floor((pc.abil[1] - 10) / 2)); pc.pp = num(g('Passive', 'Passive Wahrnehmung'), 10);
    pc.speed = g('Speed', 'Bewegungsrate') || '30 ft';
    pc.pers = { traits: g('PersonalityTraits', 'PersonalityTraits '), ideals: g('Ideals'), bonds: g('Bonds'), flaws: g('Flaws') };
    pc.text = { features: [g('Features and Traits'), g('Feat+Traits')].filter(Boolean).join('\n'), equipment: g('Equipment'), profs: g('ProficienciesLang'), attacks: g('AttacksSpellcasting'), backstory: g('Backstory') };
    pc.spell = g('SpellSaveDC  2') ? { cls: g('Spellcasting Class 2'), dc: num(g('SpellSaveDC  2'), null), atk: g('SpellAtkBonus 2') } : null;
    pc.insight = num(g('Insight'), null); pc.investigation = num(g('Investigation '), null);
  }
  if (!pc.name) pc.name = String(fileName || T('Charakter', 'Character')).replace(/\.pdf$/i, '');
  pc.lvl = levelOf(pc.cls);
  return pc;
}
function pcFromManager(c) {
  const pc = { id: uid(), src: 'manager', imported: Date.now(), notes: '' };
  pc.name = c.name; pc.cls = c.classStr || ''; pc.race = c.race || ''; pc.bg = c.background || ''; pc.player = c.player || ''; pc.align = c.alignment || '';
  pc.abil = ABIL.map(a => (c.abil && c.abil[a] ? c.abil[a].score : 10)); pc.saves = ABIL.map(a => (c.saves && c.saves[a] ? c.saves[a].bonus : 0));
  pc.ac = c.ac || 10; pc.hp = c.hp ? c.hp.max : 0; pc.init = c.init || 0; pc.pp = c.passive || 10; pc.speed = c.speed ? c.speed + ' ft' : '';
  pc.pers = {}; pc.text = c.text || {}; pc.spell = c.spellcasting && c.spellcasting.dc ? { cls: c.spellcasting.cls, dc: c.spellcasting.dc, atk: c.spellcasting.atk } : null;
  pc.insight = c.skills && c.skills.insight ? c.skills.insight.bonus : null; pc.investigation = c.skills && c.skills.investigation ? c.skills.investigation.bonus : null;
  pc.lvl = levelOf(pc.cls); pc.mgrId = c.id; return pc;
}
function addPcs(list) {
  const c = S.camp; let added = 0, upd = 0;
  list.forEach(pc => {
    const ex = c.pcs.find(p => p.name && pc.name && p.name.toLowerCase() === pc.name.toLowerCase());
    if (ex) { const keep = { id: ex.id, notes: ex.notes, img: ex.img }; Object.assign(ex, pc, keep, pc.img ? { img: pc.img } : {}); upd++; }
    else { c.pcs.push(pc); added++; c.sessions.forEach(s => { if (s.status !== 'done' && s.present && !s.present.includes(pc.id)) s.present.push(pc.id); }); }
  });
  save(); return { added, upd };
}

/* ---------- Begegnungen (Encounter Builder) ---------- */
const CR_XP = { '0': 10, '1/8': 25, '1/4': 50, '1/2': 100, '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800, '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900, '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000, '16': 15000, '17': 18000, '18': 20000, '19': 22000, '20': 25000, '21': 33000, '22': 41000, '23': 50000, '24': 62000, '25': 75000, '26': 90000, '27': 105000, '28': 120000, '29': 135000, '30': 155000 };
const THR = [null, [25, 50, 75, 100], [50, 100, 150, 200], [75, 150, 225, 400], [125, 250, 375, 500], [250, 500, 750, 1100], [300, 600, 900, 1400], [350, 750, 1100, 1700], [450, 900, 1400, 2100], [550, 1100, 1600, 2400], [600, 1200, 1900, 2800], [800, 1600, 2400, 3600], [1000, 2000, 3000, 4500], [1100, 2200, 3400, 5100], [1250, 2500, 3800, 5700], [1400, 2800, 4300, 6400], [1600, 3200, 4800, 7200], [2000, 3900, 5900, 8800], [2100, 4200, 6300, 9500], [2400, 4900, 7300, 10900], [2800, 5700, 8500, 12700]];
const MULT = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];
function multIdx(n) { return n <= 0 ? 1 : n === 1 ? 1 : n === 2 ? 2 : n <= 6 ? 3 : n <= 10 ? 4 : n <= 14 ? 5 : 6; }
function multiplier(count, party) { let i = multIdx(count); if (party > 0 && party < 3) i++; else if (party >= 6) i--; return MULT[Math.max(0, Math.min(7, i))]; }
const crXp = cr => CR_XP[String(cr)] || 0;
const DIFF = [['leicht', 'easy', '🟢'], ['mittel', 'medium', '🟡'], ['schwer', 'hard', '🟠'], ['tödlich', 'deadly', '🔴']];
const ENV = { any: ['Beliebig', 'Any', '🗺️'], forest: ['Wald', 'Forest', '🌲'], mountain: ['Gebirge', 'Mountains', '⛰️'], underdark: ['Höhle / Underdark', 'Cave / Underdark', '🕳️'], swamp: ['Sumpf', 'Swamp', '🐸'], desert: ['Wüste', 'Desert', '🏜️'], urban: ['Stadt', 'City', '🏰'], coast: ['Küste / Wasser', 'Coast / Water', '🌊'], arctic: ['Arktis', 'Arctic', '❄️'], grassland: ['Ebene', 'Plains', '🌾'], dungeon: ['Dungeon', 'Dungeon', '🗝️'] };
const ENCT = { battle: ['Offene Schlacht', 'Open battle', '⚔️'], ambush: ['Hinterhalt', 'Ambush', '🏹'], hunt: ['Jagd', 'Hunt', '🐾'], defense: ['Verteidigung', 'Defense', '🛡️'], chase: ['Verfolgung', 'Chase', '🏃'], boss: ['Boss-Kampf', 'Boss fight', '👑'], horde: ['Horde', 'Horde', '🌊'], patrol: ['Patrouille', 'Patrol', '🚩'] };
function evalEnc(e, levels) {
  const items = e.items || []; let xp = 0, n = 0;
  items.forEach(it => { xp += crXp(it.cr) * (it.count || 0); n += it.count || 0; });
  const lv = (levels || []).filter(x => x > 0);
  const m = multiplier(n, lv.length); const adj = Math.round(xp * m);
  const th = [0, 0, 0, 0]; lv.forEach(l => { const t = THR[Math.max(1, Math.min(20, l))]; for (let i = 0; i < 4; i++) th[i] += t[i]; });
  let diff = -1; for (let i = 0; i < 4; i++) if (adj >= th[i]) diff = i;
  return { xp, n, m, adj, th, diff, perPlayer: lv.length ? Math.floor(xp / lv.length) : xp };
}
function readEB() {
  return { saved: LSget('eb.saved', []), custom: LSget('eb.custom', []), names: LSget('eb.names', {}) };
}
function resolveEnc(e, ctx) {
  ctx = ctx || {}; const custom = {}; (ctx.custom || []).forEach(m => { if (m && m.id) custom[m.id] = m; }); const names = ctx.names || {};
  const out = { id: uid(), srcId: e.id || null, name: e.name || T('Begegnung', 'Encounter'), levels: Array.isArray(e.levels) ? e.levels.slice() : [], pnames: (e.pnames || []).slice(), diff: e.diff || '', encType: e.encType || '', env: e.env || '', hint: e.hint || null, status: 'planned', notes: '', imported: Date.now(), items: [] };
  (e.items || []).forEach(it => {
    const mid = it.mid || (it.m && it.m.id); if (!mid) return;
    const m = custom[mid] || (W.SV_MON[mid] ? { de: W.SV_MON[mid][0], en: W.SV_MON[mid][1], cr: W.SV_MON[mid][2], ac: W.SV_MON[mid][3], hp: W.SV_MON[mid][4], type: W.SV_MON[mid][5] } : null);
    let de = m ? (names[mid] || m.de || m.en) : mid, en = m ? (m.en || m.de) : mid;
    if (it.role) { const [fk, ri] = String(it.role).split(':'); const F = W.SV_FAC[fk]; const r = F && F.r[+ri]; if (r && r[0] === mid) { de = r[1]; en = r[2]; } }
    out.items.push({ mid, count: +it.count || 1, role: it.role || '', de, en, cr: m ? String(m.cr) : '0', ac: m ? m.ac : '', hp: m ? m.hp : '', custom: !!custom[mid], leader: !!it.leader });
  });
  return out;
}
function parseEncFile(data) {
  const arr = Array.isArray(data) ? data : Array.isArray(data.encounters) ? data.encounters : (data && Array.isArray(data.items) ? [data] : (data.encounter ? [data.encounter] : null));
  if (!arr) return null;
  return { list: arr.filter(e => e && Array.isArray(e.items)), custom: data.custom || [], names: data.names || {} };
}

/* ---------- Städte ---------- */
function cityList() {
  const set = new Map();
  (S.camp ? S.camp.maps : []).forEach(m => (m.cities || []).forEach(c => { if (c.name) set.set(c.name.toLowerCase(), { name: c.name, city: c, map: m }); }));
  (S.camp ? S.camp.npcs : []).forEach(n => { if (n.city && !set.has(n.city.toLowerCase())) set.set(n.city.toLowerCase(), { name: n.city }); });
  (S.camp ? S.camp.pois || [] : []).forEach(n => { if (n.city && !set.has(n.city.toLowerCase())) set.set(n.city.toLowerCase(), { name: n.city }); });
  (S.camp ? S.camp.sessions : []).forEach(s => { if (s.place && !set.has(s.place.toLowerCase())) set.set(s.place.toLowerCase(), { name: s.place }); });
  return Array.from(set.values()).sort((a, b) => a.name.localeCompare(b.name, 'de'));
}
function findCity(name) { if (!name) return null; const n = String(name).trim().toLowerCase(); for (const m of (S.camp ? S.camp.maps : [])) for (const c of (m.cities || [])) if (c.name && c.name.toLowerCase() === n) return { city: c, map: m }; return null; }
function partyLevels(e) { if (S.partyMode === 'pcs' && S.camp.pcs.length) { const s = curSession(); const ids = s && s.present && s.present.length ? s.present : S.camp.pcs.map(p => p.id); return S.camp.pcs.filter(p => ids.includes(p.id)).map(p => p.lvl || 1); } return e.levels && e.levels.length ? e.levels : S.camp.pcs.map(p => p.lvl || 1); }

W.SV = Object.assign(W.SV || {}, { $, $$, esc, uid, S, T, L, G, DB, save, toast, download, readAs, openDataUrl, exportCampaign, newCampaign, upgrade, loadIndex, openCampaign, createCampaign, deleteCampaign, curSession, curMap, newSession, sessionLabel, parseSheet, sheetToPc, pcFromManager, addPcs, levelOf, ABIL, ABIL_N, evalEnc, readEB, resolveEnc, parseEncFile, crXp, DIFF, ENV, ENCT, cityList, findCity, partyLevels, readAtlasDB, LSget, LSset, lastSession, num, creatorJson });
})(window);
