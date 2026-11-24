const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/atlas/DND5e_Atlas.html'); await p.waitForTimeout(300);
  await p.setInputFiles('#fMap', 'map2.jpg'); await p.waitForSelector('.detect'); await p.waitForFunction(() => !document.querySelector('.busy'));
  console.log(await p.evaluate(() => [AT_S.det.picking, AT_S.det.info, AT_S.prev.length]));
  const truth = require('./truth2.json');
  const scr = await p.evaluate(([x, y]) => { const v = AT_S.v, r = document.querySelector('#mw').getBoundingClientRect(); return [r.left + v.tx + x * v.s, r.top + v.ty + y * v.s]; }, truth[1]);
  await p.mouse.click(scr[0], scr[1]); await p.waitForTimeout(800); await p.waitForFunction(() => !document.querySelector('.busy'));
  const prev = await p.evaluate(() => AT_S.prev.map(x => [x.x, x.y]));
  console.log(await p.evaluate(() => AT_S.det.info));
  console.log('found', prev.length, 'true', truth.filter(q => prev.some(x => Math.hypot(x[0] - q[0], x[1] - q[1]) < 7)).length);
  await p.screenshot({ path: 'm2pick.png' });
  await p.click('[data-a="detOk"]'); await p.waitForTimeout(200);
  await p.click('#mkBtn'); await p.waitForTimeout(100);
  await p.click('[data-a="zin"]'); await p.click('[data-a="zin"]'); await p.waitForTimeout(100);
  await p.screenshot({ path: 'ring.png' });
  await p.click('#mkBtn'); await p.waitForTimeout(100);
  // click on hidden marker still selects
  const c0 = await p.evaluate(() => { const r = document.querySelector('#mw').getBoundingClientRect(); for (const g of document.querySelectorAll('#ovl .mk')) { const b = g.querySelector('circle,rect').getBoundingClientRect(); const x = b.x + b.width / 2, y = b.y + b.height / 2; if (x > r.left + 400 && x < r.right - 60 && y > r.top + 60 && y < r.bottom - 60) return [x, y, g.dataset.id]; } });
  console.log('c0', c0, await p.evaluate(([x,y]) => document.elementFromPoint(x,y).outerHTML.slice(0,80), c0));
  await p.mouse.click(c0[0], c0[1]); await p.waitForTimeout(150);
  console.log('mk', await p.evaluate(() => AT_S.mk), 'sel', await p.evaluate(() => !!AT_S.sel));
  await p.click('[data-a="nameLabel"]'); await p.waitForTimeout(200);
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape');
  await p.screenshot({ path: 'none.png' });
  console.log('errors', errs); await b.close();
})();
