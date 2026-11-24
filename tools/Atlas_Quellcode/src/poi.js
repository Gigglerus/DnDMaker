/* DND5e Atlas – Läden & Orte (PoI) je Stadt, optionale Stadtkarte */
/*POIKINDS*/
const PK_COL = ['#8a2222', '#c9792e', '#4f6d8f', '#6b2d8f', '#3b3b3b', '#4f7a3a'];
const P_SHOPW = [['general', 10], ['smithy', 7], ['bakery', 7], ['butcher', 5], ['tailor', 5], ['carpentry', 5], ['herbalist', 4], ['market', 6], ['stable', 3], ['weaponsmith', 3], ['armorer', 2], ['alchemist', 2], ['bowyer', 2], ['jeweler', 1.5], ['bookshop', 1.5], ['pawn', 1.5], ['magic', 1]];
const P_NAMES = ['Alrik', 'Brunhild', 'Corvin', 'Dara', 'Edda', 'Falk', 'Gundar', 'Hilda', 'Ivo', 'Jorun', 'Kasimir', 'Lioba', 'Marek', 'Nessa', 'Orin', 'Petra', 'Quirin', 'Runa', 'Sigmar', 'Thea', 'Ulf', 'Vanya', 'Wendel', 'Yara'];
const P_TAV = [['Goldenen', 'Tanzenden', 'Schlafenden', 'Roten', 'Trunkenen', 'Lachenden', 'Silbernen', 'Alten', 'Schwarzen', 'Einäugigen'], ['Drachen', 'Eber', 'Greif', 'Krug', 'Hirsch', 'Zwerg', 'Bären', 'Raben', 'Kessel', 'Wanderer']];
const pois = c => { if (!c.pois) c.pois = []; c.pois.forEach(p => { if (!p._n) { poiNorm(p); if (!p.city) p.city = c.name || ''; Object.defineProperty(p, '_n', { value: 1, enumerable: false }); } }); return c.pois; };
const pCol = p => PK_COL[poiGrp(p)] || '#5a3a22';
const pid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const pk = l => l[Math.floor(Math.random() * l.length)];
function poiRandom(group) {
  if (group === 0) return { kind: pk(['tavern', 'tavern', 'inn', 'dive']), name: 'Zum ' + pk(P_TAV[0]) + ' ' + pk(P_TAV[1]), owner: pk(P_NAMES) };
  const tot = P_SHOPW.reduce((s, e) => s + e[1], 0); let v = Math.random() * tot, j = 0; while (j < P_SHOPW.length - 1 && (v -= P_SHOPW[j][1]) > 0) j++;
  const o = pk(P_NAMES); return { kind: P_SHOPW[j][0], name: o + (/[sxz]$/.test(o) ? '’ ' : 's ') + PKBY[P_SHOPW[j][0]].de, owner: o };
}
const poiSel = c => c && pois(c).find(p => p.id === S.poi);
function poiEditor(c, p) {
  const o = (m, cur) => Object.entries(m).map(([k, n]) => '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + n + '</option>').join('');
  return '<div class="ped"><input type="text" data-pf="name" value="' + esc(p.name) + '" placeholder="Name" style="width:100%;font-weight:700">' +
    '<div class="pgrid"><span>Art</span><select data-pf="kind">' + poiKindOptions(p.kind) + '</select>' + (p.kind === 'custom' ? '<span></span><input type="text" data-pf="kindText" value="' + esc(p.kindText || '') + '" placeholder="z. B. Gemeindehaus, Lagerhaus">' : '') +
    '<span>Betreiber</span><input type="text" data-pf="owner" value="' + esc(p.owner || '') + '" placeholder="Wer führt den Ort?">' +
    '<span>Stil</span><select data-pf="style">' + o(PSTYLES, p.style) + (p.style === 'custom' ? '<option value="custom" selected>' + esc(p.styleText || 'Eigener Stil') + '</option>' : '') + '</select>' +
    '<span>Umgebung</span><select data-pf="district">' + o(PDIST, p.district) + '</select></div>' +
    '<textarea data-pf="notes" placeholder="Besonderheiten, Gerüchte …" style="min-height:3.4em">' + esc(p.notes || '') + '</textarea>' +
    ((p.goods && p.goods.length) || (p.traits && Object.keys(p.traits).length) ? '<div class="tiny muted">🧺 ' + (p.goods || []).length + ' Waren und Dienstleistungen' + (p.npcIds && p.npcIds.length ? ' · 🎭 ' + p.npcIds.length + ' NSC' : '') + ' – in der Sessionverwaltung bearbeitbar, bleiben hier erhalten.</div>' : '<div class="tiny muted">Waren, Preise und NSCs ergänzt die Sessionverwaltung (gleiches PoI-Modell).</div>') +
    '<div style="display:flex;gap:.3em;flex-wrap:wrap;margin-top:.3em">' + (c.cmap ? '<button class="btn sm" data-p="place" title="Auf der Stadtkarte anklicken, wo dieser Ort liegt">📍 ' + (p.x != null ? 'Auf der Stadtkarte zeigen' : 'Auf Stadtkarte setzen') + '</button>' : '') + '<span class="sp"></span><button class="btn sm" data-p="del" style="color:var(--fail)">🗑️ Entfernen</button></div></div>';
}
function poiRows(c, sub) {
  const L = pois(c).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));
  return L.map(p => { const on = p.id === S.poi; return '<div class="prow' + (on ? ' on' : '') + '" data-p="sel" data-id="' + p.id + '"><span>' + poiKindIcon(p) + '</span><b>' + esc(p.name || 'Ohne Namen') + '</b><i>' + esc(poiKindName(p)) + (c.cmap && p.x == null ? ' · nicht verortet' : '') + '</i></div>' + (on && !sub ? poiEditor(c, p) : ''); }).join('');
}
function poiHtml(c) {
  const L = pois(c), nS = L.filter(p => poiGrp(p) === 1).length, nG = L.filter(p => poiGrp(p) === 0).length;
  return '<div class="fld"><label>Läden &amp; Orte (PoI) <button class="dice" data-p="gen" title="Fehlende Läden, Schänken und Gasthäuser passend zu den Zahlen erzeugen">🎲 erzeugen</button></label>' +
    '<div class="tiny muted">🛒 ' + nS + ' von ' + (+c.shops || 0) + ' Geschäften · 🍺 ' + nG + ' von ' + ((+c.lodging || 0) + (+c.restaurants || 0)) + ' Unterkünften und Restaurants angelegt</div>' +
    '<div class="plist">' + (L.length ? poiRows(c) : '<div class="tiny muted" style="padding:.3em 0">Noch keine PoI. Lege einzelne an oder lass sie erzeugen.</div>') + '</div>' +
    '<div style="display:flex;gap:.3em;flex-wrap:wrap;margin-top:.3em"><button class="btn sm" data-p="add">＋ PoI</button><button class="btn sm" data-p="cmap">🏘️ Stadtkarte ' + (c.cmap ? 'öffnen' : 'laden …') + '</button>' + (c.cmap ? '<button class="btn sm" data-p="cmapDel" title="Stadtkarte entfernen">✕</button>' : '') + '</div><input type="file" id="fCmap" accept="image/*" class="hidden"></div>';
}
/* Stadtkarte mit PoI-Markern */
function cmapOpen(placing) {
  const c = sel(); if (!c || !c.cmap) return; S.cmapOn = true; S.placing = !!placing; let m = $('#cmapM');
  if (!m) { m = document.createElement('div'); m.className = 'modal'; m.id = 'cmapM'; m.addEventListener('mousedown', e => { if (e.target === m) cmapClose(); }); document.body.appendChild(m); }
  const L = pois(c).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de')), p = poiSel(c), r = Math.max(9, c.cmap.w / 110);
  m.innerHTML = '<div class="dlg cmapD"><div style="display:flex;align-items:center;gap:.5em"><h2 style="flex:1;text-align:left;margin:0">🏘️ ' + esc(c.name || 'Stadt') + '</h2><button class="btn sm' + (S.placing ? ' on' : '') + '" data-p="placing"' + (p ? '' : ' disabled') + ' title="Danach auf die Karte klicken">📍 Ausgewählten PoI setzen</button><button class="btn sm" data-p="cmapClose">✕ Schließen</button></div>' +
    (S.placing && p ? '<div class="note">Klicke auf die Karte, um „' + esc(p.name) + '“ zu verorten.</div>' : '') +
    '<div class="cmapG"><div class="cmapV' + (S.placing ? ' placing' : '') + '" id="cmapV"><img src="' + c.cmap.src + '" alt=""><svg viewBox="0 0 ' + c.cmap.w + ' ' + c.cmap.h + '">' +
    L.map((q, i) => q.x == null ? '' : '<g class="pin' + (q.id === S.poi ? ' on' : '') + '" data-p="sel" data-id="' + q.id + '"><title>' + esc(q.name + ' (' + poiKindName(q) + ')') + '</title><circle cx="' + q.x + '" cy="' + q.y + '" r="' + r + '" fill="' + pCol(q) + '"/><text x="' + q.x + '" y="' + (q.y + r * .38) + '" font-size="' + r * 1.05 + '">' + (i + 1) + '</text></g>').join('') + '</svg></div>' +
    '<div class="cmapS"><div class="plist" style="max-height:none">' + L.map((q, i) => '<div class="prow' + (q.id === S.poi ? ' on' : '') + '" data-p="sel" data-id="' + q.id + '"><span class="num" style="background:' + pCol(q) + '">' + (i + 1) + '</span><b>' + esc(q.name || 'Ohne Namen') + '</b><i>' + esc(poiKindName(q)) + (q.x == null ? ' · ?' : '') + '</i></div>' + (q.id === S.poi ? poiEditor(c, q) : '')).join('') + '</div><button class="btn sm" data-p="add" style="margin-top:.4em">＋ PoI</button></div></div></div>';
  const on = m.querySelector('.cmapS .prow.on'); if (on) on.scrollIntoView({ block: 'nearest' });
}
function cmapClose() { S.cmapOn = false; S.placing = false; const m = $('#cmapM'); if (m) m.remove(); renderPanel(); }
function poiRefresh() { if (S.cmapOn) cmapOpen(S.placing); else renderPanel(); persist(); }
document.addEventListener('click', e => {
  const v = e.target.closest('#cmapV'), c = sel();
  if (v && S.placing && c && c.cmap && !e.target.closest('.pin')) { const p = poiSel(c); if (p) { const r = v.querySelector('img').getBoundingClientRect(); pushUndo(); p.x = Math.round((e.clientX - r.left) / r.width * c.cmap.w); p.y = Math.round((e.clientY - r.top) / r.height * c.cmap.h); S.placing = false; poiRefresh(); } return; }
  const b = e.target.closest('[data-p]'); if (!b || !c) return; const a = b.dataset.p, p = poiSel(c);
  switch (a) {
    case 'sel': S.poi = S.poi === b.dataset.id && !S.cmapOn ? null : b.dataset.id; poiRefresh(); break;
    case 'add': { pushUndo(); const n = poiNorm({ id: pid(), name: 'Neuer Ort', kind: 'general', city: c.name || '', owner: '', notes: '' }); pois(c).push(n); S.poi = n.id; poiRefresh(); const i = document.querySelector((S.cmapOn ? '#cmapM' : '#panel') + ' [data-pf="name"]'); if (i) { i.focus(); i.select(); } break; }
    case 'del': if (p) { pushUndo(); c.pois = pois(c).filter(x => x !== p); S.poi = null; poiRefresh(); } break;
    case 'gen': { const L = pois(c), wS = Math.min(+c.shops || 0, 30), wG = Math.min((+c.lodging || 0) + (+c.restaurants || 0), 14); let nS = L.filter(x => poiGrp(x) === 1).length, nG = L.filter(x => poiGrp(x) === 0).length, add = 0; if (nS >= wS && nG >= wG) { toast('Es sind schon genug Läden und Gasthäuser angelegt.'); break; } pushUndo();
      const used = new Set(L.map(x => x.name)), mk = g => { let o, t = 0; do { o = poiRandom(g); } while (used.has(o.name) && t++ < 20); used.add(o.name); L.push(poiNorm(Object.assign({ id: pid(), city: c.name || '', notes: '' }, o))); add++; };
      while (nS++ < wS) mk(1); while (nG++ < wG) mk(0); poiRefresh(); toast(add + ' PoI erzeugt' + ((+c.shops || 0) > 30 ? ' (höchstens 30 Läden auf einmal)' : '') + '.'); break; }
    case 'cmap': if (c.cmap) cmapOpen(false); else $('#fCmap').click(); break;
    case 'cmapDel': if (confirm('Stadtkarte dieser Stadt entfernen? Die PoI bleiben erhalten.')) { delete c.cmap; pois(c).forEach(x => { delete x.x; delete x.y; }); poiRefresh(); } break;
    case 'cmapClose': cmapClose(); break;
    case 'placing': S.placing = !S.placing; cmapOpen(S.placing); break;
    case 'place': if (p) cmapOpen(p.x == null); break;
  }
});
document.addEventListener('input', e => { const f = e.target.dataset.pf, c = sel(), p = poiSel(c); if (!f || !p) return; e.stopPropagation(); p[f] = e.target.value; if (f === 'kind' && PKBY[p.kind]) { p.style = PKBY[p.kind].style; p.district = PKBY[p.kind].dist; } if (f === 'name') document.querySelectorAll('.prow.on b').forEach(x => { x.textContent = p.name || 'Ohne Namen'; }); persist(); }, true);
document.addEventListener('change', e => {
  if (e.target.id === 'fCmap') { const f = e.target.files[0], c = sel(); e.target.value = ''; if (!f || !c) return; readAs(f, 'readAsDataURL').then(u => loadImg(u).then(im => { c.cmap = { src: u, w: im.naturalWidth, h: im.naturalHeight }; poiRefresh(); cmapOpen(false); })).catch(() => toast('Das Bild konnte nicht gelesen werden.')); return; }
  if (e.target.dataset.pf) { e.stopPropagation(); if (e.target.tagName === 'SELECT') poiRefresh(); }
}, true);
document.addEventListener('keydown', e => { if (!S.cmapOn) return; const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName); if (e.key === 'Escape') { e.stopPropagation(); if (typing) e.target.blur(); else if (S.placing) { S.placing = false; cmapOpen(false); } else cmapClose(); } else if (!typing && !(e.ctrlKey || e.metaKey)) e.stopPropagation(); }, true);
