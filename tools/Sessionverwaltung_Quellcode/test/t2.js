const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  // 1) Encounter Builder: Begegnung erzeugen + speichern über die echte Oberfläche-Logik (localStorage)
  const eb = await ctx.newPage(); eb.on('pageerror', e => errs.push('EB ' + e.message));
  await eb.goto('file://' + __dirname + '/DND5e_Encounter_Builder.html'); await eb.waitForTimeout(400);
  await eb.evaluate(() => { localStorage.setItem('eb.saved', JSON.stringify([
    { id: 'e1', name: 'Wegelagerer am Pass', levels: [3, 3, 4, 4], pnames: [], diff: 'medium', encType: 'ambush', env: 'mountain', focus: 'any', items: [{ mid: 'bandit', count: 4 }, { mid: 'bandit-captain', count: 1 }], hint: null },
    { id: 'e2', name: 'Stadtwache', levels: [5, 5, 5], diff: 'hard', encType: 'patrol', env: 'urban', items: [{ mid: 'guard', count: 3, role: 'cityguard:0' }, { mid: 'veteran', count: 1, role: 'cityguard:1' }, { mid: 'cx1', count: 1 }] }])); localStorage.setItem('eb.custom', JSON.stringify([{ id: 'cx1', en: 'Sewer Horror', de: 'Kanalgrauen', cr: '3', ac: 14, hp: 60 }])); localStorage.setItem('cm.chars', JSON.stringify([{ id: 'm1', name: 'Kairon', classStr: 'Kämpfer 4', race: 'Mensch', ac: 18, hp: { max: 40 }, passive: 13, abil: { STR: { score: 16 }, DEX: { score: 12 }, CON: { score: 14 }, INT: { score: 10 }, WIS: { score: 12 }, CHA: { score: 8 } }, saves: {} }])); });
  // 2) Atlas-IndexedDB mit Karte füllen (Format wie Atlas)
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('dialog', d => d.accept());
  await p.goto('file://' + __dirname + '/../DND5e_Sessionverwaltung.html'); await p.waitForTimeout(500);
  await p.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 1600; c.height = 1000; const g = c.getContext('2d'); g.fillStyle = '#cfe0b0'; g.fillRect(0, 0, 1600, 1000); g.fillStyle = '#7fb0d8'; g.fillRect(0, 700, 1600, 300); g.fillStyle = '#a0522d'; [[300, 300], [900, 450], [1300, 250]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); });
    const src = c.toDataURL('image/png');
    await new Promise(res => { const r = indexedDB.open('dnd5e-atlas', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); tx.objectStore('kv').put({ id: 'm1', name: 'Testland.png', kind: 'raster', src, w: 1600, h: 1000 }, 'map'); tx.objectStore('kv').put({ mapId: 'm1', cities: [{ id: 'c1', name: 'Valdris', x: 300, y: 300, type: 'Großstadt', wealth: 'reich', density: 'hoch', pop: 24000, races: [{ n: 'Zwerg', p: 80 }, { n: 'Mensch', p: 20 }], lodging: 20, restaurants: 30, shops: 120 }, { id: 'c2', name: 'Eschenfurt', x: 900, y: 450, type: 'Dorf', wealth: 'arm', races: [{ n: 'Halbling', p: 100 }] }, { id: 'c3', name: 'Nordwacht', x: 1300, y: 250, type: 'Festung', wealth: 'normal', races: [] }] }, 'state'); tx.oncomplete = res; }; });
  });
  await p.click('[data-a="newCamp"]'); await p.fill('#promptIn', 'Kampagne Zwei'); await p.click('[data-a="newCampDo"]'); await p.waitForTimeout(300);
  await p.click('[data-a="newSession"]'); await p.waitForTimeout(200);
  // Encounter import
  await p.click('[data-a="ebImport"]'); await p.waitForTimeout(200);
  await p.screenshot({ path: __dirname + '/t2_ebdlg.png' });
  await p.click('[data-a="ebDo"]'); await p.waitForTimeout(300);
  // Charakterverwaltung
  await p.click('[data-a="tab"][data-v="pcs"]'); await p.click('[data-a="fromManager"]'); await p.click('[data-a="mgrDo"]'); await p.waitForTimeout(200);
  await p.click('[data-a="tab"][data-v="sessions"]'); await p.click('[data-a="pmode"][data-v="pcs"]'); await p.waitForTimeout(200);
  await p.screenshot({ path: __dirname + '/t2_enc.png', fullPage: true });
  // Atlas
  await p.click('[data-a="tab"][data-v="map"]'); await p.click('[data-a="atlasDb"]'); await p.waitForTimeout(500);
  // Marker setzen
  await p.click('[data-a="curType"][data-v="enc"]');
  const box = await p.locator('#mapview').boundingBox();
  await p.mouse.click(box.x + box.width * .5, box.y + box.height * .6); await p.waitForTimeout(200);
  await p.screenshot({ path: __dirname + '/t2_dbg.png' }); console.log(await p.evaluate(() => JSON.stringify([SV_S.mapMode, SV_S.camp.maps.length, SV_S.camp.maps[0] && SV_S.camp.maps[0].markers.length, SV_S.mv])));
  await p.fill('[data-in="mk"][data-k="label"]', 'Hinterhalt'); await p.fill('[data-in="mk"][data-k="note"]', 'Banditen warten hier.');
  await p.click('[data-a="curType"][data-v="treasure"]'); await p.mouse.click(box.x + box.width * .3, box.y + box.height * .3); await p.waitForTimeout(200);
  await p.click('[data-a="mkIcon"][data-v="🐉"]'); await p.waitForTimeout(100);
  await p.click('[data-a="mapMode"][data-v="select"]');
  // Drag marker
  const mk = p.locator('.mk').first(); const mb = await mk.boundingBox();
  await p.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2); await p.mouse.down(); await p.mouse.move(mb.x + 80, mb.y + 40, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(200);
  // Zoom
  await p.mouse.move(box.x + 300, box.y + 300); await p.mouse.wheel(0, -300); await p.waitForTimeout(200);
  // Stadt anklicken
  const city = p.locator('.city').first(); await city.click(); await p.waitForTimeout(200);
  await p.screenshot({ path: __dirname + '/t2_map.png' });
  await p.click('[data-a="npcHere"]'); await p.waitForTimeout(200);
  const npc = await p.evaluate(() => SV_S.npc && [SV_S.npc.city, SV_S.npc.race, SV_S.npc.wealth, SV_S.npc.name]);
  // Stats: Rasse-Verteilung für Valdris (80% Zwerg)
  const dist = await p.evaluate(() => { const c = {}; for (let i = 0; i < 400; i++) { SV.A.npcNew(); c[SV_S.npc.race] = (c[SV_S.npc.race] || 0) + 1; } return c; });
  await p.click('[data-a="npcSave"]'); await p.waitForTimeout(200);
  await p.screenshot({ path: __dirname + '/t2_npc.png' });
  // Notizen
  await p.click('[data-a="tab"][data-v="notes"]'); await p.click('[data-a="newNote"]'); await p.waitForTimeout(100); await p.fill('.ntitle', 'Der Orden des Bernsteins'); await p.fill('.bignote', 'Geheimbund in Valdris.'); await p.waitForTimeout(1200);
  console.log('notes now', await p.evaluate(() => JSON.stringify(SV_S.camp.notes)));
  await p.screenshot({ path: __dirname + '/t2_notes.png' });
  // Englisch
  await p.click('[data-a="lang"][data-v="en"]'); await p.click('[data-a="tab"][data-v="npcs"]'); await p.click('[data-a="npcNew"]'); await p.waitForTimeout(200);
  await p.screenshot({ path: __dirname + '/t2_en.png' });
  // Export + Re-Import
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-a="export"]')]); const path = __dirname + '/export.json'; await dl.saveAs(path);
  const st = await p.evaluate(() => ({ enc: SV_S.camp.sessions[0].encounters.map(e => [e.name, e.items.map(i => i.count + 'x' + i.de + '/' + i.cr).join(',')]), maps: SV_S.camp.maps.map(m => [m.name, m.cities.length, m.markers.map(k => [k.type, k.label, Math.round(k.x), Math.round(k.y), k.sessionId ? 's' : '-', k.style && k.style.icon].join(':'))]), notes: SV_S.camp.notes.map(n => n.title), pcs: SV_S.camp.pcs.map(p => p.name) }));
  console.log(JSON.stringify(st)); console.log('npcHere', npc, JSON.stringify(dist));
  console.log('export size', fs.statSync(path).size);
  // Reload: persists?
  await p.reload(); await p.waitForTimeout(800);
  console.log('after reload', await p.evaluate(() => SV_S.camp && [SV_S.camp.name, SV_S.camp.npcs.length, SV_S.camp.maps[0].markers.length, SV_S.camp.notes[0] && SV_S.camp.notes[0].text]));
  console.log('ERR', errs); await b.close();
})();
