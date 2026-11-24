const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('dialog', d => d.accept());
  await p.goto('file://' + __dirname + '/../DND5e_Sessionverwaltung.html'); await p.waitForTimeout(400);
  await p.click('[data-a="newCamp"]'); await p.fill('#promptIn', 'NSC-Quest-Test'); await p.click('[data-a="newCampDo"]'); await p.waitForTimeout(300);
  await p.click('[data-a="newSession"]'); await p.waitForTimeout(150);
  // zwei NSCs
  await p.click('[data-a="tab"][data-v="npcs"]'); await p.selectOption('[data-ch="npcProf"]', 'priest'); await p.click('[data-a="npcSave"]'); await p.waitForTimeout(150);
  await p.click('[data-a="npcNew"]'); await p.selectOption('[data-ch="npcProf"]', 'innkeeper'); await p.click('[data-a="npcSave"]'); await p.waitForTimeout(150);
  const [n1, n2] = await p.evaluate(() => SV_S.camp.npcs.map(n => n.id));
  // Quest 1 über das Questlog
  await p.click('[data-a="tab"][data-v="quests"]'); await p.click('[data-a="qNew"]'); await p.fill('[data-in="q"][data-k="title"]', 'Das gestohlene Relikt');
  await p.selectOption('[data-ch="qGiver"]', n1); await p.waitForTimeout(100);
  await p.selectOption('#qNpcPick', n2); await p.selectOption('#qNpcPickRole', 'info'); await p.click('[data-a="qNpcAdd"]'); await p.waitForTimeout(100);
  await p.fill('[data-in="qNpcNote"][data-i="0"]', 'hat den Dieb gesehen');
  await p.selectOption('[data-ch="qNpcRole"][data-i="0"]', 'witness'); await p.waitForTimeout(100);
  await p.click('[data-a="qNpcNew"]'); await p.waitForTimeout(150);
  await p.screenshot({ path: __dirname + '/t6_quest.png', fullPage: true });
  // Quest 2
  await p.click('[data-a="qNew"]'); await p.fill('[data-in="q"][data-k="title"]', 'Ärger am Hafen'); await p.waitForTimeout(1000);
  // über die NSC-Seite (Schankwirt) zu Quest 2 als Kontakt
  await p.click('[data-a="tab"][data-v="npcs"]'); await p.click('.npclist [data-id="' + n2 + '"]'); await p.waitForTimeout(150);
  const q2 = await p.evaluate(() => SV_S.camp.quests[1].id);
  await p.selectOption('#npcQuestPick', q2); await p.selectOption('#npcQuestRole', 'contact'); await p.click('[data-a="npcQuestAdd"]'); await p.waitForTimeout(150);
  await p.screenshot({ path: __dirname + '/t6_npc.png', fullPage: true });
  const onNpc = await p.$$eval('.qmini .li', e => e.map(x => x.innerText.replace(/\s+/g, ' ')));
  // Priester als Auftraggeber über die NSC-Seite zu Quest 2
  await p.click('.npclist [data-id="' + n1 + '"]'); await p.waitForTimeout(100);
  await p.selectOption('#npcQuestPick', q2); await p.selectOption('#npcQuestRole', 'giver'); await p.click('[data-a="npcQuestAdd"]'); await p.waitForTimeout(100);
  // Entfernen über × auf der NSC-Seite (Quest 1 – Auftraggeber)
  const q1 = await p.evaluate(() => SV_S.camp.quests[0].id);
  await p.click('.qmini [data-a="npcQuestDel"][data-id="' + q1 + '"]'); await p.waitForTimeout(100);
  // Filter im Questlog nach NSC
  await p.click('[data-a="tab"][data-v="quests"]'); await p.selectOption('[data-ch="qNpcF"]', n2); await p.waitForTimeout(150);
  const filt = await p.$$eval('.questlist .li b', e => e.map(x => x.textContent));
  await p.selectOption('[data-ch="qNpcF"]', ''); await p.fill('[data-in="questQ"]', 'Dieb gesehen'); await p.waitForTimeout(500);
  const search = await p.$$eval('.questlist .li b', e => e.map(x => x.textContent));
  await p.click('[data-a="lang"][data-v="en"]'); await p.fill('[data-in="questQ"]', ''); await p.waitForTimeout(400); await p.click('.questlist .li >> nth=0'); await p.waitForTimeout(150);
  await p.screenshot({ path: __dirname + '/t6_en.png', fullPage: true });
  await p.reload(); await p.waitForTimeout(800);
  const st = await p.evaluate(() => SV_S.camp.quests.map(q => [q.title, q.giverNpc ? (SV_S.camp.npcs.find(n => n.id === q.giverNpc) || {}).prof : '-', q.npcs.map(x => (SV_S.camp.npcs.find(n => n.id === x.id) || {}).prof + ':' + x.role + ':' + x.note).join(' | ')]));
  // NSC löschen räumt auf
  await p.evaluate(id => { SV.A.npcDelDo({ dataset: { id } }); }, n2);
  const after = await p.evaluate(() => SV_S.camp.quests.map(q => q.npcs.length));
  console.log(JSON.stringify({ onNpc, filt, search, st, after }, null, 1));
  console.log('ERR', errs); await b.close();
})();
