const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('dialog', d => d.accept());
  await p.goto('file://' + __dirname + '/../DND5e_Sessionverwaltung.html');
  await p.waitForTimeout(500);
  await p.screenshot({ path: __dirname + '/s_welcome.png' });
  await p.click('[data-a="newCamp"]'); await p.fill('#promptIn', 'Testkampagne'); await p.click('[data-a="newCampDo"]'); await p.waitForTimeout(300);
  await p.click('[data-a="newSession"]'); await p.fill('[data-in="sess"][data-k="title"]', 'Ratten im Keller'); await p.fill('[data-in="sess"][data-k="notes"]', 'Die Gruppe trifft Bertram.');
  await p.waitForTimeout(800);
  await p.screenshot({ path: __dirname + '/s_session.png', fullPage: true });
  // PDFs
  await p.click('[data-a="tab"][data-v="pcs"]');
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-a="pickPdf"]')]);
  await fc.setFiles([__dirname + '/Lyra_Testbardin.pdf', __dirname + '/Grom_Testbarbar.pdf', __dirname + '/Wexa_Hexe.pdf']);
  await p.waitForTimeout(800);
  await p.fill('[data-in="pcNote"] >> nth=0', 'Hat eine Schuld beim Gildenmeister.');
  await p.screenshot({ path: __dirname + '/s_pcs.png', fullPage: true });
  // NPC
  await p.click('[data-a="tab"][data-v="npcs"]'); await p.waitForTimeout(200);
  await p.selectOption('[data-ch="npcProf"]', 'king'); await p.waitForTimeout(100);
  await p.click('[data-a="npcSave"]'); await p.waitForTimeout(200);
  await p.click('[data-a="npcNew"]'); await p.selectOption('[data-ch="npcProf"]', 'guard'); await p.fill('[data-in="npcCity"]', 'Eschenfurt'); await p.waitForTimeout(1000);
  await p.click('[data-a="npcSave"]'); await p.waitForTimeout(200);
  await p.screenshot({ path: __dirname + '/s_npc.png', fullPage: true });
  console.log(await p.evaluate(() => JSON.stringify({ pcs: SV_S.camp.pcs.map(x => [x.name, x.cls, x.lvl, x.ac, x.hp, x.pp, x.src, !!x.pdf]), npcs: SV_S.camp.npcs.map(n => [n.name, n.prof, n.race, n.age, n.wealth, n.city]) })));
  console.log('ERR', errs);
  await b.close();
})();
