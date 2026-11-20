const C=require('./core.js'),fs=require('fs');const L=f=>JSON.parse(fs.readFileSync('data/'+f)).values;
const idx=C.skuIndex(L('total.json'));
console.log('barcodes',Object.keys(idx.bcInfo).length,'shp ids',Object.keys(idx.ids.SHP.i).length,'tts ids',Object.keys(idx.ids.TTS.i).length);
const src={SCOM:['scom.json','pfm_scom.json'],SHP:['shp.json','pfm_shp.json'],TTS:['tts.json','pfm_tts.json']},out={};
for(const ch in src){const rows=C.parseDeals(ch,L(src[ch][0]),idx);C.attachPfm(ch,rows,C.parsePfm(ch,L(src[ch][1])));C.enrich(rows);out[ch]=rows;
 const h=rows.filter(r=>r.conf===100).length; console.log(ch,rows.length,'mapped',rows.filter(r=>r.bc).length,'conf100',h,'<80',rows.filter(r=>r.bc&&r.conf<80).length);}
const sum=C.summary(out,idx.bcInfo);console.log('summary',sum.length,'>=2ch',sum.filter(s=>['SCOM','SHP','TTS'].filter(c=>s[c+'_n']).length>=2).length);
fs.writeFileSync('baseline.json',JSON.stringify({SCOM:C.pack(out.SCOM),SHP:C.pack(out.SHP),TTS:C.pack(out.TTS)}).replace(/�/g,''));
const bc={};for(const k in idx.bcInfo){const b=idx.bcInfo[k];bc[k]=[b.brand,b.name,b.variant];}
fs.writeFileSync('bcinfo.json',JSON.stringify(bc).replace(/�/g,''));
// spot check: a TTS row with known PID
const w=out.TTS.find(r=>r.item==='1738072573529523944');console.log(w.bc,w.conf,w.sn,'|',w.name.slice(0,50));
