const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
  await p.goto('file:///home/claude/atlas/DND5e_Atlas.html'); await p.waitForTimeout(300);
  await p.setInputFiles('#fMap', 'map.jpg'); await p.waitForSelector('.detect'); await p.waitForFunction(() => !document.querySelector('.busy'));
  const truth = require('./truth.json');
  const r = await p.evaluate((truth) => {
    let out0; const X = AT_DETECT, wk = X.makeWork(AT_S.img, AT_S.map.w, AT_S.map.h, 2000);
    out0=[]; for (const [dx,dy] of [[0,0],[1,0],[2,1],[-2,0],[3,3],[0,-4]]) { const tt = X.pickExample(wk, truth[0][0]*wk.sc+dx, truth[0][1]*wk.sc+dy, 40); const h = X.findSimilar(wk, tt.tpl, 40, .5); out0.push([dx,dy,tt.tpl.area,tt.tpl.col.join("/"),h.length,truth.filter(q => h.some(x => Math.hypot(x.x - q[0], x.y - q[1]) < 6)).length]); } const t = X.pickExample(wk, truth[0][0] * wk.sc + 1, truth[0][1] * wk.sc, 40);
    const out = { o0: out0, tpl: [t.tpl.area, t.tpl.bw, t.tpl.bh, t.tpl.col] , res: [] };
    for (const st of [0, .3, .5, .7]) { const h = X.findSimilar(wk, t.tpl, 40, st); out.res.push([st, h.length, truth.filter(q => h.some(x => Math.hypot(x.x - q[0], x.y - q[1]) < 6)).length]); }
    // per-truth component check
    out.miss = truth.map(q => { const i = (Math.round(q[1] * wk.sc) * wk.w + Math.round(q[0] * wk.sc)) * 4; return [wk.d[i], wk.d[i + 1], wk.d[i + 2]]; });
    const a = X.autoDetect(X.makeWork(AT_S.img, AT_S.map.w, AT_S.map.h, 1400)); out.auto = [a.hits.length, a.col, truth.filter(q => a.hits.some(x => Math.hypot(x.x - q[0], x.y - q[1]) < 6)).length];
    return out;
  }, truth);
  console.log(JSON.stringify(r)); await b.close();
})();
