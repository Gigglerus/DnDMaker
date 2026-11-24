const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1300, height: 1000 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file:///home/claude/out/DND5e_Startseite.html'); await p.waitForTimeout(800);
const done = await p.$('#setupDone, [data-a="setupOk"], .dlg button.primary'); if (done) { await done.click().catch(()=>{}); await p.waitForTimeout(400); }
await p.screenshot({ path: '/home/claude/session/test/landing.png', fullPage: true }); console.log(await p.$$eval('#chk_session', e => e.map(x => x.textContent)), errs); await b.close(); })();
