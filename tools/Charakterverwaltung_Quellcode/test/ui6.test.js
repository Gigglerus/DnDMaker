const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../DND5e_Charakterverwaltung.html'));
  const load = async f => { const b64 = fs.readFileSync(f).toString('base64'); await p.evaluate(async (b64) => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); await CM.importFile(new File([bin], 'x.pdf')); }, b64); await p.click('[data-a=dSave]'); };
  const box = () => p.evaluate(() => [...document.querySelectorAll('.rollbox .remind .row.small')].map(r => r.innerText.replace(/\s+/g, ' ')).join(' | '));
  await load(__dirname + '/Lyra_Testbardin.pdf');
  // Feuerball: Abfrage, Default 1
  await p.click('.opt.spell:has-text("Feuerball")');
  console.log('ask visible', await p.isVisible('[data-p=nTgt]'), 'default', await p.inputValue('[data-p=nTgt]'));
  await p.fill('[data-p=nTgt]', '4'); await p.dispatchEvent('[data-p=nTgt]', 'change');
  await p.click('[data-a=cast]'); await p.click('[data-a=spellDmg]');
  console.log('rows', await p.evaluate(() => CM.S.pan.tgts.length), 'dmg', await p.evaluate(() => CM.S.pan.dres.total));
  await p.click('[data-a=tgtSt][data-i="0"][data-v=ok]'); await p.click('[data-a=tgtSt][data-i="1"][data-v=fail]');
  await p.click('[data-a=tgtSt][data-i="2"][data-v=ok]'); await p.selectOption('select[data-tgt="2"][data-tf=on]', 'none');
  console.log(await box());
  await p.screenshot({ path: __dirname + '/shots/50_fireball.png', fullPage: true });
  // Gehässiger Spott: Einzelziel, keine Abfrage, Erfolg = 0
  await p.click('[data-a=startRound]').catch(() => {}); await p.click('[data-a=endRound]'); await p.click('[data-a=erDo][data-v=next]');
  await p.click('.opt.spell:has-text("Gehässiger Spott")');
  console.log('ask on single?', await p.isVisible('[data-p=nTgt]'));
  await p.click('[data-a=cast]'); await p.click('[data-a=spellDmg]'); await p.click('[data-a=tgtSt][data-i="0"][data-v=ok]');
  console.log(await box());
  console.log('ERRORS', errs); await b.close();
})();
