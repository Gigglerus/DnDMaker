const { chromium } = require('playwright');
const T = (process.argv[2] || __dirname + '/..');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } }); const p = await ctx.newPage();
  const errs = []; const watch = pg => { pg.on('pageerror', e => errs.push(pg.url().split('/').pop() + ': ' + e.message)); pg.on('dialog', d => d.accept()); };
  watch(p); ctx.on('page', watch);
  // Encounter Builder vorbereiten: gespeicherte Begegnung mit Goblins
  await p.goto('file://' + T + '/DND5e_Encounter_Builder.html'); await p.waitForTimeout(300);
  await p.evaluate(() => { localStorage.setItem('eb.saved', JSON.stringify([{ id: 'e1', name: 'Goblin-Hinterhalt', levels: [5, 5, 5], pnames: [], diff: 'medium', encType: 'ambush', env: 'forest', focus: 'any', items: [{ mid: 'goblin', count: 4 }, { mid: 'hobgoblin', count: 1 }], hint: null, created: 1, updated: 1, combat: null }])); });
  await p.goto('file://' + T + '/DND5e_Sessionverwaltung.html'); await p.waitForTimeout(400);
  await p.click('[data-a="newCamp"]'); await p.fill('#promptIn', 'Bosstest'); await p.click('[data-a="newCampDo"]'); await p.waitForTimeout(300);
  await p.click('[data-a="newSession"]'); await p.fill('[data-in="sess"][data-k="title"]', 'Die Burg'); await p.waitForTimeout(300);
  await p.evaluate(() => { const V = SV; V.addPcs([{ id: 'p1', name: 'Lyra', cls: 'Barde 5', lvl: 5, ac: 14, hp: 38, init: 2, abil: [10, 14, 12, 10, 12, 16], saves: [0, 4, 1, 0, 1, 6], pp: 11, src: 'manual', text: {}, pers: {} }, { id: 'p2', name: 'Grom', cls: 'Barbar 5', lvl: 5, ac: 15, hp: 55, init: 1, abil: [18, 12, 16, 8, 10, 8], saves: [7, 1, 6, -1, 0, -1], pp: 10, src: 'manual', text: {}, pers: {} }]); V.render(); });
  // Begegnung aus dem EB importieren
  await p.click('[data-a="ebImport"]'); await p.waitForTimeout(300);
  const dlgBtns = await p.$$eval('.dlg button, .dlg input', e => e.map(x => (x.dataset.a || x.type) + ':' + x.textContent.trim().slice(0, 30)));
  console.log('dlg', dlgBtns.slice(0, 8));
  await p.locator('.dlg input[type=checkbox]').first().check().catch(e=>console.log('chk',e.message.slice(0,60))); await p.waitForTimeout(200);
  await p.click('[data-a="ebDo"]'); await p.waitForTimeout(300);
  console.log('encs', await p.evaluate(() => SV.curSession().encounters.map(e => e.name + ' ' + e.items.length)));
  await p.screenshot({ path: T + '/s1_session.png', fullPage: true });
  // Begegnung starten
  const [eb] = await Promise.all([ctx.waitForEvent('page'), p.click('[data-a="encStart"] >> nth=0')]);
  await eb.waitForLoadState(); await eb.waitForTimeout(600);
  console.log('EB1', await eb.evaluate(() => { const S = EB_STATE; const e = S.saved.find(x => x.id === S.combatId); return [S.screen, e && e.name, e && e.combat.list.map(x => x.kind + ':' + (x.name || x.mid) + (x.pac ? ' RK' + x.pac : '') + (x.maxHp ? ' TP' + x.maxHp : '')).join(', ')]; }));
  await eb.screenshot({ path: T + '/s2_eb_combat.png' });
  // NSC als Boss
  await p.bringToFront();
  await p.click('[data-a="tab"][data-v="npcs"]'); await p.waitForTimeout(200);
  await p.selectOption('[data-ch="npcProf"]', 'noble'); await p.click('[data-a="npcSave"]'); await p.waitForTimeout(200);
  await p.fill('[data-in="npc"][data-k="name"]', 'Lord Varric Schwarzdorn'); await p.waitForTimeout(100);
  await p.check('[data-ch="bossOn"]'); await p.waitForTimeout(200);
  await p.screenshot({ path: T + '/s3_boss_base.png', fullPage: true });
  // Charakterbogen laden
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-a="bossSheet"]')]);
  await fc.setFiles(T + '/Varric.pdf'); await p.waitForTimeout(900);
  await p.fill('[data-in="boss"][data-k="legRes"]', '2'); await p.fill('[data-in="boss"][data-k="leg"]', 'Schwerthieb: Varric führt einen Langschwertangriff aus.\nBefehl (kostet 2 Aktionen): Ein Verbündeter darf sich bewegen und angreifen.');
  await p.click('[data-a="bossAtkAdd"]'); await p.waitForTimeout(150);
  const n = await p.$$('[data-in="bossAtk"][data-k="n"]'); const last = n.length - 1;
  await p.fill(`[data-in="bossAtk"][data-k="n"] >> nth=${last}`, 'Dolch der Schatten'); await p.fill(`[data-in="bossAtk"][data-k="hit"] >> nth=${last}`, '9'); await p.fill(`[data-in="bossAtk"][data-k="dmg"] >> nth=${last}`, '2W4+5');
  await p.selectOption(`[data-ch="bossAtkT"] >> nth=${last}`, 'necrotic');
  await p.selectOption('[data-ch="boss"][data-k="cr"]', '9'); await p.waitForTimeout(300);
  await p.screenshot({ path: T + '/s4_boss.png', fullPage: true });
  console.log('boss', await p.evaluate(() => { const n = SV_S.npc; return JSON.stringify({ sheet: n.sheet && [n.sheet.name, n.sheet.cls, n.sheet.lvl, n.sheet.ac, n.sheet.hp], b: Object.assign({}, n.boss, { traits: (n.boss.traits || '').slice(0, 80) }) }); }));
  // Boss zur Begegnung hinzufügen und Begegnung erneut starten
  await p.selectOption('[data-ch="bossToEnc"]', { index: 1 }); await p.waitForTimeout(200);
  await p.click('[data-a="tab"][data-v="sessions"]'); await p.waitForTimeout(200);
  await p.screenshot({ path: T + '/s5_session_boss.png', fullPage: true });
  await p.click('[data-a="encStart"] >> nth=0'); await p.waitForTimeout(1200);
  console.log('EB2', await eb.evaluate(() => { const S = EB_STATE; const e = S.saved.find(x => x.id === S.combatId); const boss = S.custom.find(m => m.boss); return [S.screen, e.name, e.combat.list.map(x => x.kind + ':' + (x.name || x.mid) + (x.maxHp ? ' TP' + x.maxHp : '')).join(', '), boss && JSON.stringify({ cr: boss.cr, ac: boss.ac, hp: boss.hp, ab: boss.ab, sv: boss.sv, act: boss.act.map(a => a.n + (a.hit != null ? ' +' + a.hit : '') + ' ' + JSON.stringify(a.dmg || '')), leg: (boss.leg || []).map(a => a.nd), tr: boss.tr.map(t => t.nd).slice(0, 6) })]; }));
  await eb.evaluate(() => { const S = EB_STATE; const b = S.saved.find(x => x.id === S.combatId).combat.list.find(x => x.mid && x.mid.indexOf('sv-npc') === 0); S.sel = b.uid; }); await eb.evaluate(() => document.querySelector('[data-a="select"]') && 0);
  await eb.click('.irow.sel, .irow >> text=Varric').catch(() => {}); await eb.waitForTimeout(300);
  await eb.screenshot({ path: T + '/s6_eb_boss.png', fullPage: true });
  // Kampf starten nur mit Boss (SRD-Grundlage, ohne Bogen) – zweiter NSC
  await p.click('[data-a="tab"][data-v="npcs"]'); await p.click('[data-a="npcNew"]'); await p.selectOption('[data-ch="npcProf"]', 'guard'); await p.click('[data-a="npcSave"]'); await p.waitForTimeout(200);
  await p.check('[data-ch="bossOn"]'); await p.waitForTimeout(200); await p.fill('[data-in="boss"][data-k="hp"]', '80');
  await p.click('[data-a="bossFight"]'); await p.waitForTimeout(1200);
  console.log('EB3', await eb.evaluate(() => { const S = EB_STATE; const e = S.saved.find(x => x.id === S.combatId); const m = e.combat.list.find(x => x.kind === 'm'); const M = S.custom.find(c => c.id === m.mid); return [e.name, e.combat.list.length, m.maxHp, M.ab.join('/'), M.act.map(a => a.n).join('|')]; }));
  // In EB übernehmen
  await p.click('[data-a="bossToEb"]'); await p.waitForTimeout(200);
  console.log('ebcustom', await p.evaluate(() => JSON.parse(localStorage.getItem('eb.custom') || '[]').map(m => m.de + ' HG' + m.cr)));
  console.log('ERR', errs);
  await b.close();
})();
