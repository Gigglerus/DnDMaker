const { chromium } = require('playwright');
const path = require('path');
const root = path.resolve(__dirname, '..');
const U = 'file://' + root + '/DND5e_Maker.html';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 800 } });
  const errs = [];
  const watch = p => { p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); }); };
  let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

  // 1) Standalone-Tool schreibt Speicher → Maker-Rahmen sieht ihn (gleicher Ursprung)
  const p0 = await ctx.newPage(); watch(p0);
  await p0.goto('file://' + root + '/tools/DND5e_Sessionverwaltung.html'); await p0.waitForTimeout(800);
  await p0.evaluate(() => { localStorage.setItem('probe.key', 'from-standalone'); });
  const dbs0 = await p0.evaluate(async () => (await indexedDB.databases()).map(d => d.name));
  console.log('standalone dbs', dbs0);
  await p0.close();

  const p = await ctx.newPage(); watch(p);
  await p.goto(U); await p.waitForTimeout(500);
  ok(await p.locator('.tool').count() === 6, '6 Karten auf der Startseite');
  ok(await p.locator('#bar').isHidden(), 'Leiste auf der Startseite verborgen');
  await p.screenshot({ path: root + '/test/home.png' });

  const ids = ['creator', 'manager', 'encounter', 'forge', 'world', 'session'];
  for (const id of ids) {
    const t0 = Date.now();
    await p.click('#open_' + id);
    const fr = p.frameLocator('#frame_' + id);
    await p.waitForFunction(i => { const f = document.getElementById('frame_' + i); return f && f.contentDocument && f.contentDocument.readyState === 'complete' && f.contentDocument.body && f.contentDocument.body.innerText.length > 50; }, id, { timeout: 15000 });
    await p.waitForTimeout(700);
    const info = await p.evaluate(i => { const f = document.getElementById('frame_' + i), d = f.contentDocument; return { title: document.title, inner: d.title, len: d.body.innerText.length, hash: location.hash, on: f.classList.contains('on'), vis: getComputedStyle(f).display, h: f.getBoundingClientRect().height, ls: f.contentWindow.localStorage.getItem('probe.key'), href: f.contentWindow.location.href }; }, id);
    ok(info.on && info.vis === 'block' && info.h > 700, id + ' sichtbar (' + info.len + ' Zeichen, ' + (Date.now() - t0) + ' ms)');
    ok(info.title === info.inner && /DND5e/.test(info.title), id + ' Titel: ' + info.title);
    ok(info.hash === '#' + id, id + ' Hash');
    ok(info.ls === 'from-standalone', id + ' sieht localStorage der Einzeldateien');
    await p.screenshot({ path: root + '/test/tool_' + id + '.png' });
    await p.click('#homeBtn'); await p.waitForTimeout(150);
    ok(await p.locator('#bar').isHidden() && await p.locator('#card_' + id + ' .run').innerText() !== '', id + ' zurück zur Startseite, als geöffnet markiert');
  }
  // IndexedDB gemeinsam?
  const dbs = await p.evaluate(async () => (await document.getElementById('frame_session').contentWindow.indexedDB.databases()).map(d => d.name));
  console.log('maker dbs', dbs);
  ok(dbs0.every(n => dbs.includes(n)), 'IndexedDB der Einzeldateien im Maker sichtbar');

  // 2) Zustand bleibt beim Wechseln erhalten
  await p.click('#open_creator');
  await p.evaluate(() => { document.getElementById('frame_creator').contentWindow.__mark = 42; });
  await p.click('[data-go="world"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById('frame_world').classList.contains('on') && !document.getElementById('frame_creator').classList.contains('on')), 'Tab-Wechsel Creator → Atlas');
  await p.click('[data-go="creator"]');
  ok(await p.evaluate(() => document.getElementById('frame_creator').contentWindow.__mark === 42), 'Creator-Zustand nach Wechsel erhalten');

  // 3) Zurück-Taste
  await p.goBack(); await p.waitForTimeout(200);
  ok(await p.evaluate(() => location.hash === '#world' && document.getElementById('frame_world').classList.contains('on')), 'Zurück-Taste → Atlas');

  // 4) „Zur Startseite“-Link in der Charakterverwaltung
  await p.click('[data-go="manager"]'); await p.waitForTimeout(300);
  const link = p.frameLocator('#frame_manager').locator('a[href="DND5e_Startseite.html"]').first();
  ok(await link.count() > 0, 'Charakterverwaltung hat Startseiten-Link');
  await link.click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.body.classList.contains('in-tool') && !!document.getElementById('frame_manager').contentDocument.body.innerText.length), 'Link führt zur Maker-Startseite, Tool bleibt geladen');

  // 5) Sessionverwaltung → Encounter Builder (window.open + eb.launch)
  await p.click('[data-go="session"]').catch(async () => { await p.click('#open_session'); });
  await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    const w = document.getElementById('frame_session').contentWindow;
    const before = document.getElementById('frame_encounter');
    before.contentWindow.__old = 1;
    localStorage.setItem('eb.launch', JSON.stringify({ v: 1, ts: Date.now(), from: 'sv', camp: 'Test', enc: { svId: 'x', name: 'Testkampf', items: [{ mid: 'goblin', count: 2 }], levels: [3, 3], pnames: ['A', 'B'] }, party: [], custom: [] }));
    const ret = w.open(w.SV.toolUrl('encounter', 'DND5e_Encounter_Builder.html'), 'dnd5e-eb');
    return { ret: !!ret, hash: location.hash, fresh: !document.getElementById('frame_encounter').contentWindow.__old, url: w.SV.toolUrl('encounter', 'DND5e_Encounter_Builder.html') };
  });
  console.log(r);
  ok(r.ret && r.hash === '#encounter' && r.fresh, 'Begegnung starten wechselt in den (neu geladenen) Encounter Builder');
  await p.waitForTimeout(1500);
  ok(await p.evaluate(() => localStorage.getItem('eb.launch') === null), 'Encounter Builder hat die Begegnung übernommen');
  await p.screenshot({ path: root + '/test/launch.png' });
  // Creator aus der Sessionverwaltung
  const r2 = await p.evaluate(() => { const w = document.getElementById('frame_session').contentWindow; w.open(w.SV.toolUrl('creator', 'the-ultimate-dnd5e-creator.html'), 'dnd5e-creator'); return location.hash; });
  ok(r2 === '#creator', 'Sessionverwaltung öffnet den Creator im Maker');
  // Fremde Fenster (blob:) bleiben echte Fenster
  const [pop] = await Promise.all([ctx.waitForEvent('page'), p.evaluate(() => { const w = document.getElementById('frame_session').contentWindow; w.open(URL.createObjectURL(new Blob(['hi'], { type: 'text/plain' })), '_blank'); })]);
  ok(!!pop, 'blob:-Fenster öffnet weiter einen neuen Tab'); await pop.close();

  // 6) Direkteinstieg per Hash, Sprache, Einstellungen, schmale Breite
  const q = await ctx.newPage(); watch(q);
  await q.goto(U + '#forge'); await q.waitForTimeout(1200);
  ok(await q.evaluate(() => document.body.classList.contains('in-tool') && !!document.getElementById('frame_forge')), 'Direkteinstieg #forge');
  await q.click('#homeBtn'); await q.click('[data-lang="en"]');
  ok((await q.locator('#open_forge').innerText()).includes('Continue'), 'Englisch + „Continue“ bei offenem Tool');
  await q.click('#setBtn'); await q.screenshot({ path: root + '/test/settings.png' });
  await q.click('[data-d="close"]'); await q.click('[data-lang="de"]');
  await q.setViewportSize({ width: 390, height: 760 }); await q.click('#open_session'); await q.waitForTimeout(900);
  ok(await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'kein Querscrollen bei 390 px');
  await q.screenshot({ path: root + '/test/mobile.png' });

  console.log('\nFehlermeldungen:', errs.length); errs.slice(0, 20).forEach(e => console.log('  ' + e.slice(0, 300)));
  console.log(fails ? fails + ' FEHLGESCHLAGEN' : 'ALLE OK');
  await b.close(); process.exit(fails ? 1 : 0);
})();
