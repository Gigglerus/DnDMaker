const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file:///home/claude/atlas/DND5e_Atlas.html'); await p.waitForTimeout(300);
  await p.setInputFiles('#fMap', process.argv[2]); await p.waitForSelector('.detect'); await p.waitForFunction(() => !document.querySelector('.busy'));
  const truth = require(process.argv[3]);
  const r = await p.evaluate((truth) => {
    const X = AT_DETECT, wk = X.makeWork(AT_S.img, AT_S.map.w, AT_S.map.h, 2000), dbg = [];
    const t = X.pickExample(wk, truth[0][0] * wk.sc + 1, truth[0][1] * wk.sc, 40); X.findSimilar(wk, t.tpl, 40, .5, dbg); return [t.tpl.col, t.tpl.area, dbg];
  }, truth);
  console.log(JSON.stringify(r)); await b.close();
})();
