const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file:///home/claude/atlas/DND5e_Atlas.html'); await p.waitForTimeout(300);
  await p.setInputFiles('#fMap', process.argv[2]||'map2.jpg'); await p.waitForSelector('.detect'); await p.waitForFunction(() => !document.querySelector('.busy'));
  const truth = require(process.argv[3]||'./truth2.json');
  const r = await p.evaluate((truth) => {
    const X = AT_DETECT, wk = X.makeWork(AT_S.img, AT_S.map.w, AT_S.map.h, 2000), out = {};
    const sc = h => [h.length, truth.filter(q => h.some(x => Math.hypot(x.x - q[0], x.y - q[1]) < 7)).length];
    out.tpl = [];
    for (const k of [0, 5, 9]) { const t = X.pickExample(wk, truth[k][0] * wk.sc + 1, truth[k][1] * wk.sc, 40); if (t.err) { out.tpl.push(t.err); continue; } for (const st of [.3, .5, .7]) out.tpl.push([k, st].concat(sc(X.findSimilar(wk, t.tpl, 40, st)))); }
    const a = X.autoDetect(X.makeWork(AT_S.img, AT_S.map.w, AT_S.map.h, 1400)); out.auto = a.map(x => sc(x.hits));
    return out;
  }, truth);
  console.log(JSON.stringify(r)); await p.screenshot({ path: 'm2.png' }); await b.close();
})();
