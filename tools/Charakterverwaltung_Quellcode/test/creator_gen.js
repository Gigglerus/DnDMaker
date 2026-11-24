const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///mnt/user-data/uploads/DND/DnDMaker/the-ultimate-dnd5e-creator.html');
  console.log(await p.evaluate(() => JSON.stringify({ S: typeof S !== 'undefined' ? S : null, pdf: typeof pdf, C: C.map(c => c[0]), R: R.map(r => r[0]) })));
  const out = await p.evaluate(async () => {
    const res = {}; let last = null; const oc = URL.createObjectURL; URL.createObjectURL = (bl) => { last = bl; return oc(bl); }; HTMLAnchorElement.prototype.click = function () {};
    for (const [c, lv, r, name] of [[1, 5, 8, 'Lyra Testbardin'], [0, 6, 7, 'Grom Testbarbar'], [10, 3, 3, 'Wexa Hexe'], [6, 3, 3, 'Pala Rache']]) {
      Object.assign(S, { c, lv, r, n: name, u: 0, b: 0 });
      // Zauber wählen falls möglich
      if (c === 1) { S.cz = [0, 14]; S.zs = [29, 30, 44, 53].filter(x => x < G.length); }
      if (c === 10) { S.cz = [16, 1]; S.zs = [38, 40, 44]; }
      if (c === 6) { S.cz = []; S.zs = [31, 33]; S.sub = 2; } else S.sub = -1;
      pdf(); const bl = last; const buf = new Uint8Array(await bl.arrayBuffer()); res[name] = Array.from(buf);
    }
    return res;
  });
  for (const [n, arr] of Object.entries(out)) fs.writeFileSync('test/' + n.replace(/ /g, '_') + '.pdf', Buffer.from(arr));
  console.log('errs', errs); await b.close();
})();
