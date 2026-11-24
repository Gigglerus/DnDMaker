const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '../DND5e_Charakterverwaltung.html');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto(FILE);
  const b64 = fs.readFileSync('/mnt/user-data/uploads/DND/Kairon_von_Plin.pdf').toString('base64');
  await p.evaluate(async (b64) => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); await CM.importFile(new File([bin], 'K.pdf')); }, b64);
  // Startzustand: 30 TP Schaden, 1 Wut verbraucht, vergiftet
  await p.fill('[data-f="hp.cur"]', '82'); await p.dispatchEvent('[data-f="hp.cur"]', 'change');
  await p.fill('[data-f="resources.0.used"]', '1'); await p.dispatchEvent('[data-f="resources.0.used"]', 'change');
  await p.selectOption('#dEff', 'poisoned'); await p.click('[data-a=dEffAdd]');
  await p.click('[data-a=dSave]');
  console.log(await p.evaluate(() => { const c = CM.cur(); return JSON.stringify({ hp: c.hp, rage: CM.resLeft(c, 'rage'), eff: c.effects.map(e => e.id) }); }));
  // Donnernder Schlag als Bonusaktion
  await p.click('.opt.spell:has-text("Donnernder Schlag")'); await p.click('[data-a=cast]');
  // Angriff: Nachteil wegen vergiftet?
  await p.click('.opt.atk:has-text("Hammer d") >> nth=0');
  const panel = await p.textContent('.rollbox'); console.log('dis shown:', /Nachteil durch: Vergiftet/.test(panel), 'smite offered:', /Donnernder Schlag/.test(panel), 'divine smite select:', /Göttliches Niederstrecken/.test(panel));
  await p.selectOption('[data-p=smiteLvl]', { index: 1 }).catch(e => console.log('no slot left for divine smite (expected – slots used by Thunderous Smite: 1 left)'));
  await p.click('[data-a=atkRoll]'); await p.click('[data-a=dmgRoll]');
  console.log(await p.evaluate(() => { const c = CM.cur(); return JSON.stringify({ slots: c.slots[0], eff: c.effects.map(e => e.id), conc: c.concentration, log: c.log.slice(0, 4).map(l => l.de) }); }));
  // Reaktion: Höllischer Tadel
  await p.click('.opt:has-text("Höllischer Tadel")'); await p.click('[data-a=featDo]'); await p.click('[data-a=featDmg]');
  console.log('rebuke', await p.evaluate(() => JSON.stringify({ r: CM.resLeft(CM.cur(), 'rHellish'), react: CM.cur().turn.reactUsed })));
  // Schaden mit Konzentration
  await p.fill('#hpIn', '14'); await p.click('[data-a=dmg]'); console.log('conc banner', await p.isVisible('[data-a=concSave]'));
  await p.click('[data-a=concSave]'); await p.click('[data-a=checkRoll]');
  await p.screenshot({ path: __dirname + '/shots/20_kairon.png', fullPage: true });
  await p.click('[data-a=longRest]'); await p.click('[data-a=lrDo]');
  console.log('after LR', await p.evaluate(() => { const c = CM.cur(); return JSON.stringify({ hp: c.hp, slots: c.slots[0], res: c.resources, eff: c.effects.map(e => e.id), hd: c.hd }); }));
  console.log('ERRORS', errs); await b.close();
})();
