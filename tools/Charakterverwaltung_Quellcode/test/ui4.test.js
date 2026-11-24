const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../DND5e_Charakterverwaltung.html')); await p.waitForTimeout(300);
  await p.screenshot({ path: __dirname + '/shots/30_welcome.png' });
  const b64 = fs.readFileSync(__dirname + '/Lyra_Testbardin.pdf').toString('base64');
  await p.evaluate(async (b64) => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); await CM.importFile(new File([bin], 'Lyra.pdf')); }, b64);
  await p.click('[data-a=dSave]'); await p.click('.opt.spell:has-text("Feuerball")'); await p.click('[data-a=cast]'); await p.click('[data-a=spellDmg]');
  await p.screenshot({ path: __dirname + '/shots/31_lyra.png', fullPage: true });
  console.log(await p.evaluate(() => JSON.stringify({ res: CM.allRes(CM.cur()).map(r => r.id + ':' + r.max), slots: CM.cur().slots.slice(0, 3) })));
  await p.goto('file:///home/claude/landing/DND5e_Startseite.html'); await p.waitForTimeout(300);
  await p.screenshot({ path: __dirname + '/shots/32_start.png', fullPage: true });
  console.log('ERRORS', errs); await b.close();
})();
