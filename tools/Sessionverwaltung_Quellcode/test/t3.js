const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('dialog', d => d.accept());
  await p.goto('file://' + __dirname + '/../DND5e_Sessionverwaltung.html'); await p.waitForTimeout(400);
  await p.click('[data-a="newCamp"]'); await p.fill('#promptIn', 'Questtest'); await p.click('[data-a="newCampDo"]'); await p.waitForTimeout(300);
  await p.click('[data-a="newSession"]'); await p.fill('[data-in="sess"][data-k="title"]', 'Aufbruch'); await p.waitForTimeout(300);
  await p.click('[data-a="tab"][data-v="pcs"]');
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-a="pickPdf"]')]);
  await fc.setFiles([__dirname + '/Lyra_Testbardin.pdf', __dirname + '/Grom_Testbarbar.pdf']); await p.waitForTimeout(600);
  // NSC als Auftraggeber
  await p.click('[data-a="tab"][data-v="npcs"]'); await p.selectOption('[data-ch="npcProf"]', 'priest'); await p.click('[data-a="npcSave"]'); await p.waitForTimeout(200);
  await p.click('[data-a="tab"][data-v="quests"]'); await p.click('[data-a="qNew"]'); await p.waitForTimeout(200);
  await p.fill('[data-in="q"][data-k="title"]', 'Das gestohlene Relikt'); await p.selectOption('[data-ch="qKind"]', 'main');
  const npcId = await p.evaluate(() => SV_S.camp.npcs[0].id); await p.selectOption('[data-ch="qGiver"]', npcId);
  await p.fill('[data-in="q"][data-k="reward"]', '300 GM');
  await p.check('[data-ch="qPc"] >> nth=0');
  await p.fill('[data-in="q"][data-k="desc"]', 'Aus dem Tempel wurde ein Relikt gestohlen.');
  for (const t of ['Mit dem Priester sprechen', 'Spur zum Hafen folgen', 'Dieb stellen']) { await p.fill('#qStepNew', t); await p.press('#qStepNew', 'Enter'); await p.waitForTimeout(80); }
  await p.check('[data-ch="qStepDone"] >> nth=0'); await p.waitForTimeout(100);
  await p.fill('#qLogNew', 'Die Gruppe hat den Auftrag angenommen.'); await p.click('[data-a="qLogAdd"]'); await p.waitForTimeout(200);
  await p.click('[data-a="qNew"]'); await p.fill('[data-in="q"][data-k="title"]', 'Groms Schuld'); await p.selectOption('[data-ch="qKind"]', 'personal'); await p.check('[data-ch="qPc"] >> nth=1'); await p.waitForTimeout(1000);
  await p.screenshot({ path: __dirname + '/t3_quest.png', fullPage: true });
  await p.selectOption('[data-ch="qPcF"]', { index: 1 }); await p.waitForTimeout(150);
  const filtered = await p.$$eval('.questlist .li', els => els.map(e => e.textContent.slice(0, 40)));
  await p.click('[data-a="tab"][data-v="pcs"]'); await p.waitForTimeout(150);
  await p.screenshot({ path: __dirname + '/t3_pcs.png', fullPage: true });
  await p.click('.pc [data-a="qOpen"] >> nth=0'); await p.waitForTimeout(150);
  const opened = await p.evaluate(() => [SV_S.tab, SV_S.camp.quests.find(q => q.id === SV_S.selQuest).title]);
  await p.click('[data-a="tab"][data-v="sessions"]'); await p.waitForTimeout(150);
  await p.screenshot({ path: __dirname + '/t3_sess.png', fullPage: true });
  await p.click('[data-a="lang"][data-v="en"]'); await p.click('[data-a="tab"][data-v="quests"]'); await p.waitForTimeout(150);
  await p.screenshot({ path: __dirname + '/t3_en.png' });
  console.log(JSON.stringify({ filtered, opened, q: await p.evaluate(() => SV_S.camp.quests.map(q => [q.title, q.kind, q.status, q.giverNpc ? 'npc' : '', q.pcIds.length, q.steps.map(s => (s.done ? '✔' : '·') + s.t).join('|'), q.log.length, q.reward])) }));
  console.log('ERR', errs); await b.close();
})();
