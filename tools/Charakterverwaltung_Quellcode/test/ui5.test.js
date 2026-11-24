const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../DND5e_Charakterverwaltung.html'));
  const load = async f => { const b64 = fs.readFileSync(f).toString('base64'); await p.evaluate(async (b64) => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); await CM.importFile(new File([bin], 'x.pdf')); }, b64); await p.click('[data-a=dSave]'); };
  await load('/mnt/user-data/uploads/DND/Character_Sheet_Justin_LVL4.pdf');
  await p.click('.opt.spell:has-text("Zerbersten")'); await p.click('[data-a=cast]'); await p.click('[data-a=spellDmg]');
  await p.fill('[data-tgt="0"][data-tf="v"]', '17'); await p.dispatchEvent('[data-tgt="0"][data-tf="v"]', 'change');
  await p.click('[data-a=tgtAdd]'); await p.click('[data-a=tgtSt][data-i="1"][data-v=fail]');
  await p.click('[data-a=tgtAdd]'); await p.click('[data-a=tgtSt][data-i="2"][data-v=ok]');
  const t = await p.evaluate(() => ({ tot: CM.S.pan.dres.total, txt: document.querySelector('.rollbox .remind').innerText }));
  console.log(t.tot, '\n' + t.txt);
  await p.screenshot({ path: __dirname + '/shots/40_saves.png', fullPage: true });
  await p.selectOption('select[data-tgt="0"][data-tf=on]', 'none');
  console.log(await p.evaluate(() => document.querySelector('.rollbox .remind').innerText));
  // Kairon Höllischer Tadel
  await load('/mnt/user-data/uploads/DND/Kairon_von_Plin.pdf');
  await p.click('.opt:has-text("Höllischer Tadel")'); await p.click('[data-a=featDo]'); await p.click('[data-a=featDmg]'); await p.click('[data-a=tgtSt][data-i="0"][data-v=ok]');
  console.log(await p.evaluate(() => CM.S.pan.dres.total + ' -> ' + document.querySelector('.rollbox .remind').innerText));
  console.log('ERRORS', errs); await b.close();
})();
