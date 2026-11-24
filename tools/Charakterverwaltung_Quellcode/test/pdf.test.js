const fs=require('fs');const {readFields}=require('../src/pdfform.js');
(async()=>{for(const f of process.argv.slice(2)){const t=Date.now();const r=await readFields(fs.readFileSync(f));
const ne=Object.entries(r).filter(([k,v])=>v!==''&&v!==false);console.log(f,Object.keys(r).length,'fields',ne.length,'nonempty',Date.now()-t,'ms');
console.log(JSON.stringify(Object.fromEntries(ne)).slice(0,1500));}})();
