const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file:///home/claude/atlas/DND5e_Atlas.html'); await p.waitForTimeout(300);
  await p.setInputFiles('#fMap', process.argv[2] || 'map.jpg'); await p.waitForSelector('.detect'); await p.waitForFunction(() => !document.querySelector('.busy'));
  const r = await p.evaluate(() => { const dbg = []; AT_DETECT.autoDetect(AT_DETECT.makeWork(AT_S.img, AT_S.map.w, AT_S.map.h, 1400), dbg); return dbg.sort((a, b) => b[7] - a[7]).slice(0, 10); });
  r.forEach(x => console.log(JSON.stringify(x))); await b.close();
})();
