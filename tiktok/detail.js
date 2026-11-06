/* Tiktok · bảng chi tiết — LIVE sessions (live_sessions.csv) + video GMV per creator per day (video_daily.csv), Partner Center Olala MCN. */
(function(){
'use strict';
const S={tab:'overview',p:'30d',f:null,t:null,sort:{}};
let D;
const $=s=>document.querySelector(s);
const dt=s=>Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10));
const ds=t=>new Date(t).toISOString().slice(0,10);
const addD=(s,n)=>ds(dt(s)+n*864e5);
const fd=s=>s?`${+s.slice(8,10)}/${+s.slice(5,7)}/${s.slice(0,4)}`:'';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const int=v=>v==null||!isFinite(v)?'–':Math.round(v).toLocaleString('vi-VN');
const pct=(v,d=1)=>v==null||!isFinite(v)?'–':(v*100).toFixed(d).replace('.',',')+'%';
function parseCSV(t){const L=t.trim().split(/\r?\n/);const h=L[0].split(',');return L.slice(1).filter(Boolean).map(l=>{const c=[];
  if(l.indexOf('"')<0)c.push(...l.split(','));else{let cur='',q=false;
  for(let i=0;i<l.length;i++){const ch=l[i];if(q){if(ch==='"'){if(l[i+1]==='"'){cur+='"';i++}else q=false}else cur+=ch}else if(ch==='"')q=true;else if(ch===','){c.push(cur);cur=''}else cur+=ch}
  c.push(cur)}const o={};h.forEach((k,i)=>o[k]=c[i]);return o})}
const opt=f=>fetch('data/'+f+'?v='+Date.now()).then(r=>r.ok?r.text():'x\n').then(parseCSV).catch(()=>[]);

const root=document.documentElement;
try{const t=localStorage.getItem('tt-theme');if(t)root.dataset.theme=t}catch(e){}
$('#themeBtn').onclick=()=>{const dark=root.dataset.theme?root.dataset.theme==='dark':matchMedia('(prefers-color-scheme:dark)').matches;
  root.dataset.theme=dark?'light':'dark';try{localStorage.setItem('tt-theme',root.dataset.theme)}catch(e){}};

async function load(){
  const [ls,vd]=await Promise.all(['live_sessions.csv','video_daily.csv'].map(opt));
  const rows=ls.map(r=>({d:r.date,id:r.live_id,ch:r.channel,cr:r.creator,n:r.title,st:r.start,dur:+r.duration_min||null,g:+r.gmv,dg:+r.direct_gmv,
    o:+r.sku_orders,it:+r.items,c:+r.customers,v:+r.viewers,pr:+r.products}));
  rows.forEach(r=>{r.aov=r.o?r.g/r.o:null;r.gpm=r.v?r.g/r.v:null});
  const vid=vd.map(r=>({d:r.date,ch:r.channel,cr:r.creator,vg:+r.gmv,vdg:+r.direct_gmv,vit:+r.items}));
  const lend=rows.reduce((m,r)=>r.d>m?r.d:m,''),vend=vid.reduce((m,r)=>r.d>m?r.d:m,'');
  D={rows,vid,vend,lend,end:(vend&&vend<lend?vend:lend)||ds(Date.now()-864e5)};
}
function preset(p){const e=D.end;let f=e,t=e;
  if(p==='7d')f=addD(e,-6);else if(p==='30d')f=addD(e,-29);else if(p==='mtd')f=e.slice(0,8)+'01';
  else if(p==='lm'){t=addD(e.slice(0,8)+'01',-1);f=t.slice(0,8)+'01'}
  return [f,t]}
function table(id,cols,rows,total,def){
  const st=S.sort[id]||def||{k:cols[1][0],asc:false};
  const r=[...rows].sort((a,b)=>{const x=a[st.k],y=b[st.k];const c=typeof x==='string'||typeof y==='string'?String(x??'').localeCompare(String(y??''),'vi'):(x??-Infinity)-(y??-Infinity);return st.asc?c:-c});
  const th=cols.map(([k,l,,c])=>`<th data-t="${id}" data-k="${k}" class="${c||''} ${st.k===k?'sorted'+(st.asc?' asc':''):''}">${l}</th>`).join('');
  const tr=o=>`<tr>${cols.map(([k,,f,c])=>`<td class="${c||''}">${f?f(o[k],o):esc(o[k])}</td>`).join('')}</tr>`;
  const tt=total?`<tr class="tot">${cols.map(([k,,f,c],i)=>`<td class="${c||''}">${i===0?'Tổng':total[k]==null?'':f?f(total[k],total):esc(total[k])}</td>`).join('')}</tr>`:'';
  return `<div class="card"><table><thead><tr>${th}</tr></thead><tbody>${tt}${r.map(tr).join('')||`<tr><td colspan="${cols.length}" class="mut l">Không có số trong khoảng này</td></tr>`}</tbody></table></div>`}
function agg(rows,key,init){const M=new Map();for(const r of rows){const k=key(r);let o=M.get(k);if(!o){o={...init(r),g:0,dg:0,o:0,it:0,c:0,v:0,cnt:0};M.set(k,o)}
  o.g+=r.g;o.dg+=r.dg;o.o+=r.o;o.it+=r.it;o.c+=r.c;o.v+=r.v;o.cnt++}
  return [...M.values()].map(o=>({...o,aov:o.o?o.g/o.o:null,per:o.cnt?o.g/o.cnt:null}))}
const tot=(rows,keys)=>{const o={};keys.forEach(k=>o[k]=rows.reduce((a,r)=>a+(r[k]||0),0));o.aov=o.o?o.g/o.o:null;o.per=o.cnt?o.g/o.cnt:null;return o};
const sel=()=>D.rows.filter(r=>r.d>=S.f&&r.d<=S.t);
const selV=()=>D.vid.filter(r=>r.d>=S.f&&r.d<=S.t);
const vsum=(rows,fn)=>rows.reduce((a,r)=>a+(fn(r)?r.vg:0),0);
const KEYS=['g','dg','o','it','c','v','cnt'];

function overview(){const rows=sel();
  const V=selV(),dset=new Set([...rows.map(r=>r.d),...V.map(r=>r.d)]);
  const days=[...dset].map(d=>{const L=rows.filter(r=>r.d===d),W=V.filter(r=>r.d===d);const o=tot(L.map(r=>({...r,cnt:1})),KEYS);
    o.d=d;o.vg=W.reduce((a,r)=>a+r.vg,0);o.all=o.g+o.vg;
    o.ho=L.filter(r=>r.ch==='HO').reduce((a,r)=>a+r.g,0)+vsum(W,r=>r.ch==='HO');o.mcn=L.filter(r=>r.ch==='MCN').reduce((a,r)=>a+r.g,0)+vsum(W,r=>r.ch==='MCN');return o});
  const T=tot(days,KEYS);['vg','all','ho','mcn'].forEach(k=>T[k]=days.reduce((a,r)=>a+r[k],0));
  const mon=agg(D.rows,r=>r.d.slice(0,7)+'|'+r.ch,r=>({m:r.d.slice(0,7),ch:r.ch}));
  mon.forEach(o=>{o.vg=vsum(D.vid,r=>r.d.slice(0,7)===o.m&&r.ch===o.ch)||null;o.all=o.g+(o.vg||0)});
  return `<h2>GMV theo ngày <small>${fd(S.f)} – ${fd(S.t)} · Partner Center (Olala MCN), HO + MCN</small></h2>
  ${table('days',[['d','Ngày',fd,'l'],['all','GMV live + video',int],['g','GMV live',int],['vg','GMV video',int],['ho','HO',int],['mcn','MCN',int],['o','Đơn SKU live',int],['aov','AOV live',int],['c','Khách live',int],['cnt','Số phiên',int],['v','Người xem',int]],days,T,{k:'d',asc:false})}
  <h2>Theo tháng <small>toàn bộ dữ liệu · video có từ 1/10/2026</small></h2>
  ${table('mon',[['m','Tháng',v=>'T'+(+v.slice(5))+'/'+v.slice(0,4),'l'],['ch','Kênh',esc,'l'],['all','GMV live + video',int],['g','GMV live',int],['vg','GMV video',int],['o','Đơn SKU live',int],['aov','AOV live',int],['cnt','Số phiên',int],['per','GMV / phiên',int]],mon,null,{k:'m',asc:false})}
  <div class="note">GMV live = GMV do creator mang lại trong phiên (đơn đã đặt, gồm hàng mọi shop), tính vào ngày bắt đầu phiên. GMV video = GMV do creator mang lại qua video (Video Analytics), có từ 1/10/2026${D.vend?', số tới '+fd(D.vend):''}. AOV = GMV live ÷ đơn SKU live.</div>`}

function live(){const rows=sel().filter(r=>r.g||r.o);const T=tot(rows.map(r=>({...r,cnt:1})),KEYS);
  return `<h2>Phiên live <small>${fd(S.f)} – ${fd(S.t)} · ${rows.length} phiên</small></h2>
  ${table('live',[['n','Phiên',(v,o)=>`<span title="${esc(o.id)}">${esc(v)}</span>`,'l name'],['cr','Creator',v=>'@'+esc(v),'l'],['ch','Kênh',esc,'l'],['st','Bắt đầu',esc,'l'],['dur','Phút',int],
    ['g','GMV',int],['dg','GMV trực tiếp',int],['o','Đơn SKU',int],['aov','AOV',int],['c','Khách',int],['v','Người xem',int],['gpm','GMV / người xem',int],['pr','Số SP',int]],rows,T,{k:'g',asc:false})}`}

function creator(){const rows=sel(),V=selV();const cr=agg(rows,r=>r.cr,r=>({cr:'@'+r.cr,ch:r.ch}));
  for(const w of V){let o=cr.find(x=>x.cr==='@'+w.cr);if(!o){o={cr:'@'+w.cr,ch:w.ch,g:0,dg:0,o:0,it:0,c:0,v:0,cnt:0,aov:null,per:null};cr.push(o)}o.vg=(o.vg||0)+w.vg}
  cr.forEach(o=>{o.vg=o.vg||0;o.all=o.g+o.vg});const T=tot(cr,KEYS);T.vg=cr.reduce((a,r)=>a+r.vg,0);T.all=T.g+T.vg;
  return `<h2>Theo creator <small>${fd(S.f)} – ${fd(S.t)}</small></h2>
  ${table('cr',[['cr','Creator',null,'l'],['ch','Kênh',esc,'l'],['all','GMV live + video',int],['g','GMV live',int],['vg','GMV video',int],['cnt','Số phiên',int],['per','GMV / phiên',int],['o','Đơn SKU',int],['aov','AOV',int],['c','Khách',int],['v','Người xem',int]],cr,T,{k:'g',asc:false})}`}

function render(){
  if(!S.f){[S.f,S.t]=preset(S.p)}
  $('#from').value=S.f;$('#to').value=S.t;
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===S.tab));
  document.querySelectorAll('#presets button').forEach(b=>b.classList.toggle('on',b.dataset.p===S.p));
  $('#main').innerHTML={overview,live,creator}[S.tab]();
  document.querySelectorAll('th[data-k]').forEach(h=>h.onclick=()=>{const id=h.dataset.t,k=h.dataset.k,cur=S.sort[id];S.sort[id]={k,asc:cur&&cur.k===k?!cur.asc:false};render()});
  history.replaceState(null,'','#'+S.tab+'&'+S.p);
}
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{S.tab=b.dataset.tab;render()});
document.querySelectorAll('#presets button').forEach(b=>b.onclick=()=>{S.p=b.dataset.p;[S.f,S.t]=preset(S.p);render()});
['from','to'].forEach(id=>$('#'+id).onchange=()=>{S.p='';S.f=$('#from').value;S.t=$('#to').value;if(S.f>S.t)[S.f,S.t]=[S.t,S.f];render()});
const h=location.hash.slice(1).split('&');if(['overview','live','creator'].includes(h[0]))S.tab=h[0];if(['d','7d','30d','mtd','lm'].includes(h[1]))S.p=h[1];
load().then(()=>{$('#asof').textContent=D.rows.length?`HO + MCN · live tới ${fd(D.lend)}${D.vend?' · video tới '+fd(D.vend):''}`:'Chưa có dữ liệu';render()})
  .catch(e=>{$('#main').innerHTML=`<div class="loading">Không tải được dữ liệu (${esc(e.message)})</div>`});
})();
