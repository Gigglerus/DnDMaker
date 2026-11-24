global.window=global; window.crypto=require('crypto').webcrypto;
window.PdfForm=require('../src/pdfform.js');require('../src/spells.js');require('../src/data.js');require('../src/rules.js');require('../src/import.js');
const fs=require('fs');
(async()=>{for(const f of process.argv.slice(2)){const fl=await window.PdfForm.readFields(fs.readFileSync(f));const ch=window.CM_IMPORT.build(fl,f.split('/').pop());
const o={...ch};delete o.text;console.log(JSON.stringify(o,null,0).slice(0,4000));console.log(ch.spells.map(s=>s.lvl+':'+(s.ref||'?'+s.raw)+(s.prepared?'*':'')).join(' | '));}})();
