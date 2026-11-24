const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///tmp/claude-0/-home-claude/7c61749b-eeb4-5a2a-8034-75f1bacd6b38/scratchpad/artifact-files/5cdb4ff8-3de2-43b5-a175-8106a3d6dfd8/tools/the-ultimate-dnd5e-creator.html');
  console.log(await p.evaluate(() => JSON.stringify({ S: typeof S !== 'undefined' ? S : null, pdf: typeof pdf, C: C.map(c => c[0]), R: R.map(r => r[0]) })));
  const out = await p.evaluate(async () => {
    const res = {}; let last = null; const oc = URL.createObjectURL; URL.createObjectURL = (bl) => { last = bl; return oc(bl); }; HTMLAnchorElement.prototype.click = function () {};
    for (const [c, lv, r, name] of [[1, 5, 8, 'Lyra Testbardin'], [0, 6, 7, 'Grom Testbarbar'], [10, 3, 3, 'Wexa Hexe']]) {
      Object.assign(S, { c, lv, r, n: name, u: 0, b: 0 });
      // Zauber wählen falls möglich
      if (c === 1) { S.cz = [0, 14]; S.zs = [29, 30, 44, 53].filter(x => x < G.length); }
      if (c === 10) { S.cz = [16, 1]; S.zs = [38, 40, 44]; }
      pdf(); const bl = last; const buf = new Uint8Array(await bl.arrayBuffer()); res[name] = Array.from(buf);
    }
    return res;
  });
  for (const [n, arr] of Object.entries(out)) fs.writeFileSync('test/' + n.replace(/ /g, '_') + '.pdf', Buffer.from(arr));
  console.log('errs', errs); await b.close();
})();
