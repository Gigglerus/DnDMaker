// Bugliste 09.11.: Vorbereiten nach Rast, Reaktions-Hinweis, Entfernen, Hervorhebung, Göttliche Macht fokussieren, Info-Knöpfe
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  p.on('dialog', d => { errs.push('NATIVE DIALOG ' + d.message()); d.dismiss(); });
  await p.goto('file://' + path.resolve(__dirname, '../DND5e_Charakterverwaltung.html'));
  const load = async f => { const b64 = fs.readFileSync(f).toString('base64'); await p.evaluate(async ([b64, n]) => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); await CM.importFile(new File([bin], n)); }, [b64, path.basename(f)]); await p.click('[data-a=dSave]'); };
  const ok = (c, m) => console.log((c ? 'OK  ' : 'FAIL') + ' ' + m);
  await load(__dirname + '/Pala_Rache.pdf');
  // 8/9: Göttliche Macht fokussieren mit beiden Optionen des Schwurs
  const opts = await p.evaluate(() => Object.values(CM.buildOptions(CM.cur())).flat().map(o => o.label + '|' + (o.group || '')));
  ok(opts.some(o => o.startsWith('Gegner verdammen|Göttliche Macht fokussieren')), 'Gegner verdammen als Aktion');
  ok(opts.some(o => o.startsWith('Eid der Feindschaft|Göttliche Macht fokussieren')), 'Eid der Feindschaft als Bonusaktion');
  ok(!(await p.content()).includes('Fokussierte Gottesmacht'), 'kein „Fokussierte Gottesmacht“ mehr');
  await p.click('.opt:has-text("Eid der Feindschaft")'); await p.click('[data-a=featDo]');
  ok(await p.evaluate(() => CM.cur().effects.some(e => e.custom && e.custom.id === 'vowEnmity') && CM.resLeft(CM.cur(), 'channelP') === 0), 'Eid der Feindschaft: Effekt aktiv, Nutzung verbraucht');
  ok(await p.evaluate(() => !Object.values(CM.buildOptions(CM.cur())).flat().find(o => o.label === 'Gegner verdammen').ok), 'Gegner verdammen danach gesperrt');
  // 6: Hervorhebung
  await p.click('.opt.atk >> nth=0');
  ok(await p.isVisible('.opt.sel .selmark') && await p.isVisible('#rollPanel .selband'), 'Ausgewählte Aktion hervorgehoben (Karte + Band)');
  // 2: Reaktion-Hinweis
  ok(await p.isVisible('.rnote'), 'Hinweis bei Reaktionen sichtbar');
  ok((await p.textContent('.opts')).length > 0 && (await p.content()).includes('deine Reichweite verlässt'), 'Auslöser beim Gelegenheitsangriff');
  // 10: Info
  await p.click('.stat .ibtn >> nth=0'); ok(await p.isVisible('.modal .xtab'), 'Info zur RK'); await p.click('[data-a=modalClose]');
  await p.click('[data-a=info][data-k=abil]'); ok((await p.textContent('.modal')).includes('Expertise') || (await p.textContent('.modal')).includes('Übung'), 'Info Attribute/Fertigkeiten'); await p.click('[data-a=modalClose]');
  await p.click('[data-a=sel][data-k=save][data-ab=WIS]'); ok((await p.textContent('#rollPanel')).includes('= WE-Mod.'), 'Rettungswurf-Aufschlüsselung im Wurfbereich');
  // 1: Zauber vorbereiten nach langer Rast
  await p.click('[data-a=longRest]'); ok(await p.isChecked('#lrPrep'), 'Lange Rast: „Danach Zauber vorbereiten“ angehakt'); await p.click('[data-a=lrDo]');
  ok(await p.isVisible('[data-a=prepSave]'), 'Vorbereiten-Dialog öffnet nach Rast');
  await p.fill('#prepNew', 'Wunden heilen'); await p.click('[data-a=prepAdd]');
  await p.click('[data-a=prepTgl]:has-text("Befehl")');
  await p.click('[data-a=prepSave]');
  const sp = await p.evaluate(() => { const c = CM.cur(); return { prep: c.spells.filter(s => s.prepared).map(s => s.ref), opts: Object.values(CM.buildOptions(c)).flat().filter(o => o.k === 'spell').map(o => o.label) }; });
  ok(sp.prep.includes('cure_wounds') && !sp.prep.includes('command'), 'Vorbereitung gespeichert: ' + sp.prep.join(','));
  ok(sp.opts.includes('Wunden heilen') && !sp.opts.includes('Befehl'), 'Nur vorbereitete Zauber in den Optionen: ' + sp.opts.join(','));
  await p.screenshot({ path: __dirname + '/shots/70_bugs.png', fullPage: true });
  // 5: Entfernen über Tab
  await load(__dirname + '/Lyra_Testbardin.pdf');
  ok(await p.evaluate(() => CM.S.chars.length) === 2, 'zwei Charaktere geladen');
  await p.click('.tab.on .tabx'); ok(await p.isVisible('[data-a=delYes]'), 'Entfernen-Dialog'); await p.click('[data-a=delYes]');
  ok(await p.evaluate(() => CM.S.chars.length) === 1, 'Charakter entfernt');
  await p.click('[data-a=delChar]'); await p.click('[data-a=delYes]');
  ok(await p.evaluate(() => CM.S.chars.length) === 0 && await p.isVisible('[data-a=newBlank]'), 'letzter Charakter entfernt → Startseite');
  await p.reload(); ok(await p.evaluate(() => CM.S.chars.length) === 0, 'Entfernen bleibt nach Neuladen');
  console.log('ERRORS', errs); await b.close();
})();
