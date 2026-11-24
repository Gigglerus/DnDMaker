const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('dialog', d => d.accept());
  await p.goto('file:///home/claude/atlas/DND5e_Atlas.html'); await p.waitForTimeout(500);
  await p.screenshot({ path: 'home.png' });
  const t0 = Date.now();
  await p.setInputFiles('#fMap', 'map.jpg');
  await p.waitForSelector('.detect'); await p.waitForFunction(() => !document.querySelector('.busy'), null, { timeout: 30000 });
  console.log('auto ms', Date.now() - t0, await p.$eval('.detect .cnt', e => e.textContent), await p.$eval('.detect .small', e => e.textContent));
  const truth = require('./truth.json');
  const prev = await p.evaluate(() => AT_S.prev.map(x => [Math.round(x.x), Math.round(x.y)]));
  const matched = truth.filter(t => prev.some(q => Math.hypot(q[0] - t[0], q[1] - t[1]) < 6)).length;
  console.log('auto found', prev.length, 'matched truth', matched, '/', truth.length);
  await p.screenshot({ path: 'auto.png' });
  // example mode: click a castle? click first truth city
  await p.click('[data-a="detPick"]');
  const scr = await p.evaluate(([x, y]) => { const v = AT_S.v, r = document.querySelector('#mw').getBoundingClientRect(); return [r.left + v.tx + x * v.s, r.top + v.ty + y * v.s]; }, truth[0]);
  await p.mouse.click(scr[0] + 1, scr[1]);
  await p.waitForTimeout(300); await p.waitForFunction(() => !document.querySelector('.busy'));
  const prev2 = await p.evaluate(() => AT_S.prev.map(x => [Math.round(x.x), Math.round(x.y)]));
  console.log('tpl found', prev2.length, 'matched', truth.filter(t => prev2.some(q => Math.hypot(q[0] - t[0], q[1] - t[1]) < 6)).length, await p.$eval('.detect .small', e => e.textContent));
  await p.click('[data-a="detOk"]'); await p.waitForTimeout(200);
  console.log('cities', await p.evaluate(() => AT_S.cities.length));
  // select first city via list
  await p.click('#items .it'); await p.waitForTimeout(200);
  await p.click('[data-a="set"][data-v="Metropole"]'); await p.waitForTimeout(100);
  console.log(await p.evaluate(() => { const c = AT_S.cities.find(c => c.id === AT_S.sel); return JSON.stringify([c.type, c.density, c.pop, c.lodging, c.restaurants, c.shops, c.races]); }));
  await p.screenshot({ path: 'panel.png' });
  // label
  await p.click('[data-a="mode"][data-m="text"]');
  await p.mouse.click(700, 500); await p.waitForTimeout(200);
  await p.keyboard.type('Königreich Arnor');
  await p.selectOption('#panel select[data-l="font"]', { index: 1 });
  await p.fill('#panel input[type=number][data-l="size"]', '60'); await p.dispatchEvent('#panel input[type=number][data-l="size"]', 'input');
  await p.fill('#panel input[type=number][data-l="rot"]', '-12'); await p.dispatchEvent('#panel input[type=number][data-l="rot"]', 'input');
  await p.waitForTimeout(200);
  console.log('labels', await p.evaluate(() => JSON.stringify(AT_S.labels)));
  await p.screenshot({ path: 'label.png' });
  // export
  const [dl] = await Promise.all([p.waitForEvent('download'), (async () => { await p.click('[data-a="exportImg"]'); await p.click('[data-x="png"]'); })()]);
  await dl.saveAs('export.png'); console.log('export ok');
  const [dl2] = await Promise.all([p.waitForEvent('download'), p.click('[data-a="save"]')]); await dl2.saveAs('proj.json');
  // svg
  await p.setInputFiles('#fMap', 'azg.svg'); await p.waitForSelector('.detect'); await p.waitForTimeout(500); await p.waitForFunction(() => !document.querySelector('.busy'));
  console.log('svg', await p.evaluate(() => JSON.stringify(AT_S.prev.map(x => [x.name, x.type]))));
  await p.screenshot({ path: 'svg.png' });
  // reload & resume
  await p.click('[data-a="detOk"]'); await p.waitForTimeout(800);
  await p.reload(); await p.waitForTimeout(800); const hasRes = await p.$('[data-a="resume"]'); console.log('resume btn', !!hasRes);
  await p.setInputFiles('#fProj', 'proj.json'); await p.waitForTimeout(800);
  console.log('proj reload', await p.evaluate(() => [AT_S.cities.length, AT_S.labels.length]));
  console.log('errors', errs);
  await b.close();
})();
