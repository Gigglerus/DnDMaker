const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '../DND5e_Charakterverwaltung.html');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto(FILE);
  // Leerer Kämpfer Stufe 5
  await p.click('[data-a=newBlank]'); await p.selectOption('[data-f="classes.0.key"]', 'fighter'); await p.fill('[data-f="classes.0.lvl"]', '5'); await p.dispatchEvent('[data-f="classes.0.lvl"]', 'change');
  await p.fill('[data-f="name"]', 'Testkrieger'); await p.dispatchEvent('[data-f="name"]', 'change');
  await p.click('[data-a=dSave]');
  const T = async (lbl) => p.evaluate(() => { const c = CM.cur(); const G = CM.buildOptions(c); return { t: c.turn, ok: Object.fromEntries(Object.entries(G).map(([k, v]) => [k, v.filter(o => o.ok).map(o => o.label)])) }; });
  let s = await T(); console.log('start actions', s.ok.action.length, 'free', s.ok.free);
  // Angriffsaktion: 2 Angriffe
  await p.click('.opt.atk:has-text("Longsword") >> nth=0'); await p.click('[data-a=atkRoll]'); await p.click('[data-a=nextAtk]'); await p.click('[data-a=atkRoll]');
  s = await T(); console.log('after 2 attacks: actUsed', s.t.actUsed, 'attacksLeft', s.t.attacksLeft, 'action opts', s.ok.action.length);
  // Tatendrang
  await p.click('.opt:has-text("Tatendrang")'); await p.click('[data-a=featDo]');
  s = await T(); console.log('after surge: actions', s.t.actions, 'action opts', s.ok.action.length, 'free', s.ok.free);
  // Rückgängig
  await p.click('[data-a=undo]'); s = await T(); console.log('after undo: actions', s.t.actions, 'surge res', await p.evaluate(() => CM.resLeft(CM.cur(), 'actionSurge')));
  // Haste-Effekt
  await p.selectOption('#effSel', 'haste'); await p.click('[data-a=effAdd]'); s = await T(); console.log('haste opts', s.ok.action);
  const ac = await p.evaluate(() => CM.acNow(CM.cur()).total); console.log('AC with haste', ac);
  // Schaden bis 0
  await p.fill('#hpIn', '200'); await p.click('[data-a=dmg]');
  console.log('dead?', await p.evaluate(() => CM.cur().dead));
  await p.click('[data-a=revive]');
  await p.fill('#hpIn', '5'); await p.click('[data-a=dmg]'); console.log('hp', await p.evaluate(() => CM.cur().hp));
  await p.fill('#hpIn', '10'); await p.click('[data-a=dmg]');
  await p.screenshot({ path: __dirname + '/shots/10_zero.png', fullPage: true });
  console.log('incap', await p.evaluate(() => CM.incap(CM.cur())), (await T()).ok);
  for (let i = 0; i < 3; i++) { await p.click('[data-a=sel][data-k=death]'); await p.click('[data-a=checkRoll]'); }
  console.log('death', await p.evaluate(() => ({ d: CM.cur().death, dead: CM.cur().dead, hp: CM.cur().hp.cur, eff: CM.cur().effects.map(e => e.id) })));
  await p.click('[data-a=shortRest]'); await p.screenshot({ path: __dirname + '/shots/11_short.png' });
  await p.click('[data-a=srDo]');
  // Export / Import Roundtrip
  const json = await p.evaluate(() => JSON.stringify({ chars: CM.S.chars }));
  await p.evaluate(async (j) => { await CM.importFile(new File([j], 'g.json')); }, json);
  console.log('chars', await p.evaluate(() => CM.S.chars.length));
  await p.click('[data-a=lang][data-v=en]'); await p.screenshot({ path: __dirname + '/shots/12_en.png', fullPage: true });
  await p.reload(); console.log('persist', await p.evaluate(() => CM.S.chars.length + ' ' + CM.S.lang));
  console.log('ERRORS', errs); await b.close();
})();
