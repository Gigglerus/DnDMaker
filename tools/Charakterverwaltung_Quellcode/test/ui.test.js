const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '../DND5e_Charakterverwaltung.html');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto(FILE); await p.screenshot({ path: __dirname + '/shots/01_welcome.png' });
  async function load(f) { const b64 = fs.readFileSync(f).toString('base64'); await p.evaluate(async ([b64, name]) => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); await CM.importFile(new File([bin], name, { type: 'application/pdf' })); }, [b64, path.basename(f)]); }
  await load('/mnt/user-data/uploads/DND/Kairon_von_Plin.pdf');
  await p.waitForTimeout(200); await p.screenshot({ path: __dirname + '/shots/02_setup.png', fullPage: true });
  await p.click('[data-a=dSave]'); await p.waitForTimeout(100);
  await p.screenshot({ path: __dirname + '/shots/03_main.png', fullPage: true });
  // Kampfrausch
  await p.click('.opt:has-text("Kampfrausch beginnen")'); await p.click('[data-a=featDo]');
  // Angriff mit Hammer
  await p.click('.opt.atk:has-text("Hammer d")'); await p.fill('[data-p=targetAC]', '15'); await p.dispatchEvent('[data-p=targetAC]', 'change');
  await p.click('[data-a=atkRoll]'); await p.waitForTimeout(100);
  await p.click('[data-a=dmgRoll]');
  await p.screenshot({ path: __dirname + '/shots/04_attack.png', fullPage: true });
  const st = await p.evaluate(() => { const c = CM.cur(); return { turn: c.turn, eff: c.effects.map(e => e.id), res: c.resources, log: c.log.slice(0, 6).map(l => l.de) }; });
  console.log(JSON.stringify(st));
  await p.click('[data-a=nextAtk]'); await p.click('[data-a=atkRoll]');
  const st2 = await p.evaluate(() => CM.cur().turn); console.log('after 2nd', st2.attacksLeft, st2.actUsed);
  // Zustand vergiftet hinzufügen
  await p.selectOption('#effSel', 'holdPerson'); await p.fill('#effDC', '13'); await p.click('[data-a=effAdd]');
  await p.screenshot({ path: __dirname + '/shots/05_cond.png', fullPage: true });
  await p.click('[data-a=endRound]'); await p.waitForTimeout(100);
  await p.screenshot({ path: __dirname + '/shots/06_end.png', fullPage: true });
  await p.click('[data-a=erSave]'); await p.waitForTimeout(100);
  await p.click('[data-a=erDo][data-v=next]');
  const st3 = await p.evaluate(() => { const c = CM.cur(); return { round: c.round, turn: c.turn, eff: c.effects.map(e => e.id + ':' + e.rounds) }; }); console.log(JSON.stringify(st3));
  // Malcer
  await load('/mnt/user-data/uploads/DND/Character_Sheet_Justin_LVL4.pdf'); await p.click('[data-a=dSave]');
  await p.click('.opt.spell:has-text("Schauerlicher Strahl")'); await p.click('[data-a=cast]'); await p.click('[data-a=spellAtk]'); await p.click('[data-a=spellDmg]');
  await p.screenshot({ path: __dirname + '/shots/07_malcer.png', fullPage: true });
  const st4 = await p.evaluate(() => { const c = CM.cur(); return { turn: c.turn, pact: c.pact, opts: Object.values(CM.buildOptions(c)).flat().filter(o => o.ok).map(o => o.label) }; }); console.log(JSON.stringify(st4));
  await p.click('.opt.spell:has-text("Zerbersten")').catch(e => console.log('shatter hidden OK'));
  await p.click('[data-a=longRest]'); await p.click('[data-a=lrDo]');
  await p.click('[data-a=lang][data-v=en]'); await p.screenshot({ path: __dirname + '/shots/08_en.png', fullPage: true });
  console.log('ERRORS', errs);
  await b.close();
})();
