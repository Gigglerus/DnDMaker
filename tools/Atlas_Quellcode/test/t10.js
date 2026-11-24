const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/atlas/DND5e_Atlas.html'); await p.waitForTimeout(300);
  await p.setInputFiles('#fMap', 'map.jpg'); await p.waitForSelector('.detect'); await p.waitForFunction(() => !document.querySelector('.busy'));
  await p.click('[data-a="detOk"]'); await p.waitForTimeout(200);
  await p.evaluate(() => {
    const D = AT_DATA; const names = ['Eichenhain', 'Brückenfurt', 'Rabenstein am See', 'Mühlbach', 'Grauwasser', 'Nord-Valmora', 'Silberau', 'Kesselberg'];
    names.forEach((n, i) => AT_S.cities.push(D.newCity(1300 + (i % 4) * 45, 800 + Math.floor(i / 4) * 40, { name: n, type: i === 0 ? 'Großstadt' : 'Dorf' })));
    AT_S.labels.push({ id: 'l1', x: 1380, y: 950, text: 'Mittelland', font: 'EB Title', size: 40, color: '#3b2416', bold: false, italic: false, rot: 0, spacing: 0, outline: true, ocolor: '#f6ecd2', ow: 12, opacity: 100 });
    AT_APP.refresh();
  });
  await p.waitForTimeout(300);
  // overlap check in screen
  const r = await p.evaluate(() => { const bs = [...document.querySelectorAll('#ovl .mk text')].map(t => t.getBoundingClientRect()); let o = 0; for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) { const a = bs[i], c = bs[j]; if (Math.min(a.right, c.right) - Math.max(a.left, c.left) > 1 && Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) > 1) o++; } return [bs.length, o, AT_S.cities.length]; });
  console.log('names shown, overlaps, cities', r);
  await p.evaluate(() => { const v = AT_S.v, mw = document.querySelector('#mw'); AT_S.v.s = 1.3; AT_S.v.tx = mw.clientWidth / 2 - 1370 * 1.3; AT_S.v.ty = mw.clientHeight / 2 - 850 * 1.3; AT_APP.refresh(); });
  await p.waitForTimeout(200);
  const r2 = await p.evaluate(() => { const bs = [...document.querySelectorAll('#ovl .mk text')].map(t => t.getBoundingClientRect()); let o = 0; for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) { const a = bs[i], c = bs[j]; if (Math.min(a.right, c.right) - Math.max(a.left, c.left) > 1 && Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) > 1) o++; } return [bs.length, o]; });
  console.log('zoomed', r2);
  await p.screenshot({ path: 'names.png' });
  const [dl] = await Promise.all([p.waitForEvent('download'), (async () => { await p.click('[data-a="exportImg"]'); await p.check('#exMk'); await p.click('[data-x="png"]'); })()]);
  await dl.saveAs('namesexp.png'); console.log('errors', errs); await b.close();
})();
