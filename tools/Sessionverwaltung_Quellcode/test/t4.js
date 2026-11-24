const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('dialog', d => d.accept());
  await p.goto('file://' + __dirname + '/../DND5e_Sessionverwaltung.html'); await p.waitForTimeout(400);
  await p.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 1600; c.height = 1000; const g = c.getContext('2d'); g.fillStyle = '#cfe0b0'; g.fillRect(0, 0, 1600, 1000);
    const src = c.toDataURL('image/png');
    await new Promise(res => { const r = indexedDB.open('dnd5e-atlas', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); tx.objectStore('kv').put({ id: 'm1', name: 'Testland.png', kind: 'raster', src, w: 1600, h: 1000 }, 'map'); tx.objectStore('kv').put({ mapId: 'm1', cities: [{ id: 'c1', name: 'Valdris', x: 300, y: 300, type: 'Großstadt', wealth: 'reich', density: 'hoch', pop: 24000, races: [{ n: 'Zwerg', p: 80 }, { n: 'Mensch', p: 20 }], lodging: 20, restaurants: 30, shops: 120 }] }, 'state'); tx.oncomplete = res; }; });
  });
  await p.click('[data-a="newCamp"]'); await p.fill('#promptIn', 'PoI-Test'); await p.click('[data-a="newCampDo"]'); await p.waitForTimeout(300);
  await p.click('[data-a="newSession"]');
  await p.click('[data-a="tab"][data-v="map"]'); await p.click('[data-a="atlasDb"]'); await p.waitForTimeout(400);
  await p.locator('.city').first().click(); await p.waitForTimeout(150);
  // Ort bearbeiten
  await p.selectOption('[data-ch="cityF"][data-k="wealth"]', 'fürstlich'); await p.waitForTimeout(100);
  await p.fill('[data-in="cityNote"]', 'Sitz des Zwergenkönigs.');
  await p.click('[data-a="cityRaceAdd"]'); await p.fill('[data-in="cityRace"][data-i="2"][data-k="n"]', 'Gnom'); await p.fill('[data-in="cityRace"][data-i="2"][data-k="p"]', '10'); await p.click('[data-a="cityRaceNorm"]'); await p.waitForTimeout(100);
  await p.fill('[data-in="cityN"][data-k="shops"]', '150');
  await p.screenshot({ path: __dirname + '/t4_city.png' });
  // Neuer Ort
  await p.click('[data-a="mapMode"][data-v="city"]'); const box = await p.locator('#mapview').boundingBox();
  await p.mouse.click(box.x + box.width * .7, box.y + box.height * .5); await p.waitForTimeout(200);
  await p.fill('.cname', 'Krähenhain'); await p.press('.cname', 'Tab'); await p.waitForTimeout(150);
  // PoI in Valdris
  await p.locator('.city').first().click(); await p.waitForTimeout(150);
  await p.click('[data-a="poiHere"]'); await p.waitForTimeout(150);
  await p.selectOption('[data-ch="poiKind"]', 'tavern'); await p.waitForTimeout(100);
  const pr1 = await p.evaluate(() => SV_S.poi.goods.map(g => g.n + '=' + g.price));
  await p.selectOption('[data-ch="poiStyle"]', 'poor'); await p.selectOption('[data-ch="poiDistrict"]', 'poor'); await p.waitForTimeout(100);
  const pr2 = await p.evaluate(() => SV_S.poi.goods.map(g => g.n + '=' + g.price));
  await p.click('[data-a="poiGoodAdd"]'); await p.fill('[data-in="poiGood"][data-k="n"] >> nth=-1', 'Zwergenbräu'); const last = p.locator('[data-ch="poiPrice"]').last(); await last.fill('3 SM'); await last.press('Tab'); await p.waitForTimeout(100);
  await p.click('[data-a="poiSave"]'); await p.waitForTimeout(150);
  await p.click('[data-a="poiRoll"][data-k="goods"]'); await p.waitForTimeout(100);
  const kept = await p.evaluate(() => SV_S.poi.goods.filter(g => g.manual).map(g => g.n + '=' + g.price));
  await p.click('[data-a="poiMakeNpc"]'); await p.waitForTimeout(150);
  await p.screenshot({ path: __dirname + '/t4_poi.png', fullPage: true });
  // Auf Karte
  await p.click('[data-a="poiMark"]'); await p.waitForTimeout(150); await p.mouse.click(box.x + 300, box.y + 250); await p.waitForTimeout(200);
  const mk = await p.evaluate(() => { const k = SV_S.camp.maps[0].markers[0]; return k && [k.poiId ? 'poi' : '-', k.label, k.style && k.style.icon]; });
  await p.screenshot({ path: __dirname + '/t4_map.png' });
  // NSC zeigt PoI
  await p.click('[data-a="tab"][data-v="npcs"]'); await p.click('.npclist .li >> nth=0'); await p.waitForTimeout(150);
  const found = await p.$$eval('[data-a="openPoi"]', e => e.map(x => x.textContent));
  await p.click('[data-a="lang"][data-v="en"]'); await p.click('[data-a="tab"][data-v="pois"]'); await p.click('.npclist .li >> nth=0'); await p.waitForTimeout(150);
  await p.screenshot({ path: __dirname + '/t4_en.png', fullPage: true });
  await p.reload(); await p.waitForTimeout(800);
  const st = await p.evaluate(() => ({ cities: SV_S.camp.maps[0].cities.map(c => [c.name, c.wealth, c.shops, c.manual, c.races.map(r => r.n + r.p).join(','), c.notes]), pois: SV_S.camp.pois.map(x => [x.name, x.kind, x.style, x.district, x.city, x.npcIds.length, x.goods.length]), npcs: SV_S.camp.npcs.map(n => [n.name, n.prof, n.city]) }));
  console.log(JSON.stringify({ pr1, pr2, kept, mk, found, st }));
  console.log('ERR', errs); await b.close();
})();
