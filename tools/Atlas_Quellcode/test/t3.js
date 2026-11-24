const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file:///home/claude/atlas/DND5e_Atlas.html'); await p.waitForTimeout(300);
  await p.setInputFiles('#fMap', 'map.jpg'); await p.waitForSelector('.detect'); await p.waitForFunction(() => !document.querySelector('.busy'));
  const r = await p.evaluate(() => {
    const wk = AT_DETECT.makeWork(AT_S.img, AT_S.map.w, AT_S.map.h, 1400);
    const res = [];
    for (const col of [[56,104,72],[170,30,30],[30,10,5],[40,40,40]]) {
      // replicate inner
      const n = wk.w*wk.h, m = new Uint8Array(n); for (let i=0;i<n;i++){const r=wk.d[i*4]-col[0],g=wk.d[i*4+1]-col[1],b=wk.d[i*4+2]-col[2]; if(r*r+g*g+b*b<=34*34) m[i]=1;}
      let cnt=0; for(let i=0;i<n;i++) cnt+=m[i];
      res.push([col.join('/'), cnt]);
    }
    return res;
  });
  console.log(JSON.stringify(r)); await b.close();
})();
