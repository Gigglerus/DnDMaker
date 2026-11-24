const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file:///home/claude/atlas/DND5e_Atlas.html'); await p.waitForTimeout(300);
  await p.setInputFiles('#fMap', 'map.jpg'); await p.waitForSelector('.detect'); await p.waitForFunction(() => !document.querySelector('.busy'));
  await p.click('[data-a="detPick"]');
  console.log('picking', await p.evaluate(() => AT_S.det.picking));
  const truth = require('./truth.json');
  const scr = await p.evaluate(([x, y]) => { const v = AT_S.v, r = document.querySelector('#mw').getBoundingClientRect(); return [r.left + v.tx + x * v.s, r.top + v.ty + y * v.s]; }, truth[3]);
  await p.mouse.click(scr[0], scr[1]); await p.waitForTimeout(600);
  console.log(await p.evaluate(() => [AT_S.det.mode, AT_S.det.info, AT_S.prev.length]));
  await p.screenshot({ path: 'pick.png' });
  await b.close();
})();
