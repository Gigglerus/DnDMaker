const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/atlas/DND5e_Atlas.html'); await p.waitForTimeout(300);
  await p.setInputFiles('#fMap', 'map.jpg'); await p.waitForSelector('.detect'); await p.waitForFunction(() => !document.querySelector('.busy'));
  await p.click('[data-a="detClose"]');
  await p.evaluate(() => {
    const D = AT_DATA, W = AT_S.map.w;
    AT_S.cities.push(D.newCity(W - 40, 300, { name: 'Großherzogliche Hafenstadt Nord-Valmora' }));
    AT_S.cities.push(D.newCity(30, 500, { name: 'Westlichste Grenzfeste am Rand' }));
    AT_S.cities.push(D.newCity(1200, 700, { name: 'Mitte ganz normal' }));
    AT_S.labels.push({ id: 'l1', x: W - 150, y: 900, text: 'Königreich der Silbernen Berge', font: 'EB Title', size: 60, color: '#3b2416', bold: false, italic: false, rot: 0, spacing: 0, outline: true, ocolor: '#f6ecd2', ow: 12, opacity: 100 });
    AT_S.selL = 'l1';
    AT_W = 1;
  }).catch(()=>{});
  await p.evaluate(() => AT_APP.refresh());
  await p.waitForTimeout(300);
  console.log(await p.evaluate(() => document.querySelector('#wrapHint') && document.querySelector('#wrapHint').textContent));
  await p.screenshot({ path: 'wrap.png' });
  const [dl] = await Promise.all([p.waitForEvent('download'), (async () => { await p.click('[data-a="exportImg"]'); await p.check('#exMk'); await p.click('[data-x="png"]'); })()]);
  await dl.saveAs('wrapexp.png');
  console.log('errors', errs); await b.close();
})();
