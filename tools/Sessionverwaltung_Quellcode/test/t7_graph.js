const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('dialog', d => d.accept());
  await p.goto('file://' + __dirname + '/../DND5e_Sessionverwaltung.html'); await p.waitForTimeout(400);
  await p.click('[data-a="newCamp"]'); await p.fill('#promptIn', 'Netz-Test'); await p.click('[data-a="newCampDo"]'); await p.waitForTimeout(300);
  await p.click('[data-a="tab"][data-v="pcs"]');
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-a="pickPdf"]')]);
  await fc.setFiles([__dirname + '/Lyra_Testbardin.pdf', __dirname + '/Grom_Testbarbar.pdf']); await p.waitForTimeout(600);
  await p.click('[data-a="tab"][data-v="npcs"]');
  for (const pr of ['king', 'thief', 'innkeeper']) { await p.click('[data-a="npcNew"]'); await p.selectOption('[data-ch="npcProf"]', pr); await p.fill('[data-in="npcCity"]', 'Valdris'); await p.waitForTimeout(950); await p.click('[data-a="npcSave"]'); await p.waitForTimeout(120); }
  const ids = await p.evaluate(() => ({ pc: SV_S.camp.pcs.map(x => x.id), npc: SV_S.camp.npcs.map(x => x.id) }));
  await p.click('[data-a="tab"][data-v="graph"]'); await p.waitForTimeout(200);
  // Gruppen anlegen
  async function group(name, kind) { await p.click('.maptop [data-a="gNewGroup"]'); await p.fill('.cname', name); await p.selectOption('[data-ch="grpKind"]', kind); await p.waitForTimeout(80); }
  await group('Königreich Aldenmark', 'kingdom'); await group('Reich von Sund', 'kingdom'); await group('Die Krähen', 'gang');
  const gid = await p.evaluate(() => SV_S.camp.groups.map(g => g.id));
  // Mitglieder: König → Aldenmark über Gruppen-Editor
  await p.click('[data-a="gSelect"][data-v="grp:' + gid[0] + '"]').catch(() => {});
  await p.evaluate(g => { SV_S.gRel = null; SV_S.gSel = { t: 'grp', id: g }; SV.render(); }, gid[0]);
  await p.selectOption('#gMemberPick', 'npc:' + ids.npc[0]); await p.click('[data-a="gMemberAdd"]'); await p.waitForTimeout(100);
  await p.selectOption('#gMemberPick', 'pc:' + ids.pc[0]); await p.click('[data-a="gMemberAdd"]'); await p.waitForTimeout(100);
  // Dieb → Krähen; Dieb → Aldenmark; dann Sund (Konflikt → wechseln)
  await p.evaluate(n => { SV_S.gRel = null; SV_S.gSel = { t: 'npc', id: n }; SV.render(); }, ids.npc[1]);
  await p.selectOption('#gJoin', gid[2]); await p.click('[data-a="gJoin"]'); await p.waitForTimeout(80);
  await p.selectOption('#gJoin', gid[0]); await p.click('[data-a="gJoin"]'); await p.waitForTimeout(80);
  await p.selectOption('#gJoin', gid[1]); await p.click('[data-a="gJoin"]'); await p.waitForTimeout(120);
  const modal = await p.$eval('.dlg', e => e.innerText.slice(0, 140)).catch(() => 'KEIN DIALOG');
  await p.click('[data-a="gJoinDo"][data-v="replace"]'); await p.waitForTimeout(100);
  // Grom zusätzlich in beide Reiche (Ausnahme)
  await p.evaluate(n => { SV_S.gRel = null; SV_S.gSel = { t: 'pc', id: n }; SV.render(); }, ids.pc[1]);
  await p.selectOption('#gJoin', gid[0]); await p.click('[data-a="gJoin"]'); await p.waitForTimeout(80);
  await p.selectOption('#gJoin', gid[1]); await p.click('[data-a="gJoin"]'); await p.waitForTimeout(120); await p.click('[data-a="gJoinDo"][data-v="also"]'); await p.waitForTimeout(100);
  // Bild für den König
  await p.evaluate(n => { SV_S.gRel = null; SV_S.gSel = { t: 'npc', id: n }; SV.render(); }, ids.npc[0]);
  const [f2] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-a="gImg"]')]); await f2.setFiles(__dirname + '/face.png'); await p.waitForTimeout(400);
  await p.click('[data-a="gAddAll"]'); await p.waitForTimeout(100);
  await p.selectOption('[data-ch="gAdd"]', 'npc:' + ids.npc[2]); await p.waitForTimeout(100); await p.selectOption('[data-ch="gAdd"]', 'npc:' + ids.npc[1]); await p.waitForTimeout(100);
  await p.click('[data-a="gLayout"]'); await p.waitForTimeout(200);
  // Beziehung ziehen: Lyra → Dieb
  await p.click('[data-a="gMode"][data-v="link"]'); await p.waitForTimeout(80);
  await p.click('[data-gn="pc:' + ids.pc[0] + '"]'); await p.waitForTimeout(80);
  await p.click('[data-gn="npc:' + ids.npc[1] + '"]'); await p.waitForTimeout(120);
  await p.fill('[data-in="rel"][data-k="label"]', 'schuldet ihr Geld'); await p.click('[data-a="gLevelSet"][data-v="bad"]'); await p.waitForTimeout(80);
  // Aldenmark ↔ Sund verfeindet (über Panel)
  await p.click('[data-a="gMode"][data-v="select"]');
  await p.evaluate(g => { SV_S.gRel = null; SV_S.gSel = { t: 'grp', id: g }; SV.render(); }, gid[0]);
  await p.selectOption('#gRelTo', 'grp:' + gid[1]); await p.selectOption('#gRelLv', 'enemy'); await p.click('[data-a="gRelAdd"]'); await p.waitForTimeout(80);
  await p.click('[data-a="gDir"][data-v="both"]'); await p.fill('[data-in="rel"][data-k="label"]', 'Grenzkrieg'); await p.waitForTimeout(60);
  // Krähen → König verbündet (Gruppe zu einzelner Person); Wirt ↔ Dieb bekannt; und Gegenrichtung Dieb → Lyra gut
  await p.evaluate(g => { SV_S.gRel = null; SV_S.gSel = { t: 'grp', id: g }; SV.render(); }, gid[2]);
  await p.selectOption('#gRelTo', 'npc:' + ids.npc[0]); await p.selectOption('#gRelLv', 'ally'); await p.click('[data-a="gRelAdd"]'); await p.waitForTimeout(80);
  await p.evaluate(n => { SV_S.gRel = null; SV_S.gSel = { t: 'npc', id: n }; SV.render(); }, ids.npc[2]);
  await p.selectOption('#gRelTo', 'npc:' + ids.npc[1]); await p.selectOption('#gRelLv', 'known'); await p.click('[data-a="gRelAdd"]'); await p.waitForTimeout(80);
  await p.evaluate(n => { SV_S.gRel = null; SV_S.gSel = { t: 'npc', id: n }; SV.render(); }, ids.npc[1]);
  await p.selectOption('#gRelTo', 'pc:' + ids.pc[0]); await p.selectOption('#gRelLv', 'good'); await p.click('[data-a="gRelAdd"]'); await p.waitForTimeout(80);
  await p.click('[data-a="gClose"]'); await p.click('[data-a="gFit"]'); await p.waitForTimeout(200);
  // Knoten ziehen
  const nb = await p.locator('[data-gn="pc:' + ids.pc[1] + '"]').boundingBox();
  await p.mouse.move(nb.x + nb.width / 2, nb.y + nb.height / 2); await p.mouse.down(); await p.mouse.move(nb.x + nb.width / 2 + 60, nb.y + nb.height / 2 + 40, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(100);
  await p.screenshot({ path: __dirname + '/t7_graph.png' });
  const svg = await p.evaluate(() => ({ edges: document.querySelectorAll('.ge').length, mutual: document.querySelectorAll('.gel[marker-start]').length, members: document.querySelectorAll('.gm').length, imgs: document.querySelectorAll('.gn image').length, curved: [...document.querySelectorAll('.gel')].filter(x => x.getAttribute('d').includes('Q')).length }));
  // Rel anklicken → Editor
  await p.click('.ge >> nth=0', { force: true }).catch(() => {}); await p.waitForTimeout(100);
  const relPanel = await p.$eval('.mapside', e => e.innerText.slice(0, 80));
  // NSC-Seite zeigt Netz
  await p.click('[data-a="tab"][data-v="npcs"]'); await p.click('.npclist [data-id="' + ids.npc[1] + '"]'); await p.waitForTimeout(150);
  const mini = await p.$$eval('[data-a="gShowRel"], [data-a="gShow"]', e => e.map(x => x.innerText.replace(/\s+/g, ' ')));
  await p.screenshot({ path: __dirname + '/t7_npc.png', fullPage: true });
  await p.click('[data-a="tab"][data-v="graph"]'); await p.click('[data-a="lang"][data-v="en"]'); await p.waitForTimeout(200);
  await p.evaluate(g => { SV_S.gRel = null; SV_S.gSel = { t: 'grp', id: g }; SV.render(); }, gid[0]); await p.waitForTimeout(100);
  await p.screenshot({ path: __dirname + '/t7_en.png' });
  await p.reload(); await p.waitForTimeout(800);
  const st = await p.evaluate(() => { const c = SV_S.camp; const nm = r => (r.t === 'grp' ? c.groups.find(g => g.id === r.id) : r.t === 'pc' ? c.pcs.find(x => x.id === r.id) : c.npcs.find(x => x.id === r.id)).name.split(' ')[0]; return { groups: c.groups.map(g => g.name + ':' + g.kind + ':' + g.members.map(nm).join('/')), rels: c.rels.map(r => nm(r.a) + (r.dir === 'both' ? '<->' : '->') + nm(r.b) + ':' + r.level + ':' + r.label), nodes: c.graph.nodes.length }; });
  await p.evaluate(id => SV.A.npcDelDo({ dataset: { id } }), ids.npc[1]);
  const after = await p.evaluate(() => ({ rels: SV_S.camp.rels.length, mem: SV_S.camp.groups.map(g => g.members.length), nodes: SV_S.camp.graph.nodes.length }));
  console.log(JSON.stringify({ modal, svg, relPanel, mini, st, after }, null, 1));
  console.log('ERR', errs); await b.close();
})();
