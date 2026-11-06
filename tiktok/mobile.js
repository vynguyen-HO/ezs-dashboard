/* Tiktok dashboard — commercial results, mobile / app-style main page.
   live_sessions.csv: TikTok Shop "LIVE analytics" export of the MCN account (HO = hannaholala, MCN = Hannah Team creators),
   one row per LIVE session; video_daily.csv: creator-attributed video GMV per creator per day. Both read from Partner Center
   (Olala MCN) by tools/tiktok/pull_partner.js; no plan on this page. */
(function(){
'use strict';
const TABS=[['overview','Tổng quan'],['live','Phiên live'],['creator','Creator']];
const TITLE={overview:'Tiktok',live:'Phiên live',creator:'Creator'};
const CH={HO:['HannahOlala (HO)','H','#e0457b'],MCN:['Hannah Team (MCN)','T','#8a5cd6']};
const S={tab:'overview',p:'d'};
let D;

/* ---------- utils ---------- */
const $=s=>document.querySelector(s);
const dt=s=>Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10));
const ds=t=>new Date(t).toISOString().slice(0,10);
const addD=(s,n)=>ds(dt(s)+n*864e5);
const fd=s=>`${+s.slice(8,10)}/${+s.slice(5,7)}`;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function money(v){if(v==null||!isFinite(v))return '–';const a=Math.abs(v);
  if(a>=1e9)return (v/1e9).toFixed(a>=1e10?1:2).replace('.',',')+' tỷ';
  if(a>=1e6)return (a>=1e8?Math.round(v/1e6):(v/1e6).toFixed(1).replace('.',','))+' tr';if(a>=1e3)return Math.round(v/1e3)+'k';return Math.round(v)+'đ'}
const int=v=>v==null||!isFinite(v)?'–':Math.round(v).toLocaleString('vi-VN');
const pct=(v,d=0)=>v==null||!isFinite(v)?'–':(v*100).toFixed(d).replace('.',',')+'%';
const chg=(c,p)=>(c==null||p==null||!p)?null:(c-p)/Math.abs(p);
function pill(x,good=1){if(x==null)return '<span class="pill flat">–</span>';const cls=Math.abs(x)<.005||good===0?'flat':((x>0)===(good>0)?'up':'down');
  return `<span class="pill ${cls}">${x>0?'▲':x<0?'▼':''} ${Math.abs(x*100).toFixed(Math.abs(x)<.1?1:0).replace('.',',')}%</span>`}
function parseCSV(t){const L=t.trim().split(/\r?\n/);const h=L[0].split(',');return L.slice(1).filter(Boolean).map(l=>{const c=[];
  if(l.indexOf('"')<0)c.push(...l.split(','));else{let cur='',q=false;
  for(let i=0;i<l.length;i++){const ch=l[i];if(q){if(ch==='"'){if(l[i+1]==='"'){cur+='"';i++}else q=false}else cur+=ch}else if(ch==='"')q=true;else if(ch===','){c.push(cur);cur=''}else cur+=ch}
  c.push(cur)}const o={};h.forEach((k,i)=>o[k]=c[i]);return o})}
const opt=f=>fetch('data/'+f+'?v='+Date.now()).then(r=>r.ok?r.text():'x\n').then(parseCSV).catch(()=>[]);

/* ---------- data ---------- */
async function load(){
  const [ls,vd]=await Promise.all([opt('live_sessions.csv'),opt('video_daily.csv')]);
  const rows=ls.map(r=>({d:r.date,k:r.live_id,ch:r.channel,cr:r.creator,name:r.title,start:r.start,dur:+r.duration_min||0,
    g:+r.gmv,o:+r.sku_orders,c:+r.customers,v:+r.viewers,it:+r.items}));
  const vid=vd.map(r=>({d:r.date,ch:r.channel,cr:r.creator,g:+r.gmv}));
  const lend=rows.reduce((m,r)=>r.d>m?r.d:m,''),vend=vid.reduce((m,r)=>r.d>m?r.d:m,'');
  D={rows,vid,vend,lend,end:vend&&vend<lend?vend:lend};  // video is published ~1 day after live: end on the last day both have
}
function range(p,e){let f=e;
  if(p==='7')f=addD(e,-6);else if(p==='30')f=addD(e,-29);else if(p==='m')f=e.slice(0,8)+'01';
  const n=Math.round((dt(e)-dt(f))/864e5)+1;return {f,e,n,pf:addD(f,-n),pe:addD(f,-1)}}
function sum(f,e,fn){const o={g:0,o:0,c:0,v:0,n:0};for(const r of D.rows){if(r.d<f||r.d>e||(fn&&!fn(r)))continue;o.g+=r.g;o.o+=r.o;o.c+=r.c;o.v+=r.v;o.n++}
  o.aov=o.o?o.g/o.o:null;o.per=o.n?o.g/o.n:null;return o}
function vsum(f,e,fn){let g=0;for(const r of D.vid)if(r.d>=f&&r.d<=e&&(!fn||fn(r)))g+=r.g;return g}
function group(f,e,key){const M=new Map();for(const r of D.rows){if(r.d<f||r.d>e)continue;const k=key(r);const o=M.get(k)||{k,ch:r.ch,g:0,o:0,v:0,n:0};
  o.g+=r.g;o.o+=r.o;o.v+=r.v;o.n++;M.set(k,o)}return M}
const sorted=M=>[...M.values()].filter(o=>o.g>0).sort((a,b)=>b.g-a.g);

/* ---------- pieces ---------- */
function hero(label,big,dlt,tiles){return `<div class="hero"><div class="lb">${label}</div>
  <div class="big">${big} ${dlt}</div>
  <div class="two">${tiles.map(t=>`<div><span class="lb">${t[0]}</span><b>${t[1]}</b>${t[2]}</div>`).join('')}</div></div>`}
function bar(v,pace){const w=Math.max(0,Math.min(1,v||0))*100;return `<div class="pg"><i style="width:${w}%"></i>${pace!=null?`<u style="left:${Math.min(100,pace*100)}%"></u>`:''}</div>`}
function chart(end,val,color,tipFn){
  const days=[];for(let i=13;i>=0;i--)days.push(addD(end,-i));
  const v=days.map(val);const mx=Math.max(1,...v.map(x=>x||0));const W=320,H=130,bw=W/days.length;
  const bars=v.map((x,i)=>{const h=!x?2:Math.max(2,x/mx*H);return `<rect data-i="${i}" x="${i*bw+3}" y="${H-h}" width="${bw-6}" height="${h}" rx="4" fill="${!x?'var(--ink3)':color}" opacity="${i===13?1:.55}"/>`}).join('');
  const id='c'+Math.random().toString(36).slice(2,7);
  setTimeout(()=>{const box=document.getElementById(id);if(!box)return;const tip=box.querySelector('.tip');
    const show=i=>{tip.innerHTML=`${fd(days[i])} · ${!v[i]?'không có phiên':tipFn(v[i],days[i])}`;box.querySelectorAll('rect').forEach(r=>r.setAttribute('opacity',+r.dataset.i===i?1:.4))};
    box.querySelectorAll('rect').forEach(r=>{r.onclick=r.onmouseenter=()=>show(+r.dataset.i)});show(13)},0);
  return `<div class="chart" id="${id}"><div class="tip"></div><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${bars}</svg><div class="ax"><span>${fd(days[0])}</span><span>${fd(days[13])}</span></div></div>`}
function top5(list,color,fmt){if(!list.length)return '<div class="list"><div class="empty">Không có phiên live trong kỳ này</div></div>';
  return `<div class="list">${list.slice(0,5).map((o,i)=>{const [t,s,r,rs]=fmt(o);return `<div class="row" style="cursor:default"><div class="ico" style="background:${color};opacity:${1-i*.12}">${i+1}</div>
  <div class="t"><b>${esc(t)}</b><span>${s}</span></div><div class="r"><b>${r}</b>${rs||''}</div></div>`}).join('')}</div>`}
function tiles(list){return `<div class="gmv">${list.map(([l,v,p])=>`<div><span>${l}</span><b>${v}</b>${p}</div>`).join('')}</div>`}
const noData=()=>`<div class="list" style="margin-top:14px"><div class="empty">Chưa có dữ liệu live (xem tools/tiktok/UPDATE.md).</div></div>`;
const when=r=>r.start?fd(r.start)+' '+r.start.slice(11):fd(r.d);

/* ---------- screens ---------- */
function overview(R){
  if(!D.rows.length)return noData();
  const c=sum(R.f,R.e),p=sum(R.pf,R.pe),cv=vsum(R.f,R.e),pv=vsum(R.pf,R.pe);
  const ch=Object.keys(CH).map(k=>{const o=sum(R.f,R.e,r=>r.ch===k),q=sum(R.pf,R.pe,r=>r.ch===k),v=vsum(R.f,R.e,r=>r.ch===k),qv=vsum(R.pf,R.pe,r=>r.ch===k);const [nm,ic,col]=CH[k];
    return `<div class="row" data-go="creator"><div class="ico" style="background:${col}">${ic}</div>
    <div class="t"><b>${nm}</b><span>Live ${money(o.g)} · Video ${money(v)} · ${int(o.o)} đơn live · ${o.n} phiên</span></div>
    <div class="r"><b>${money(o.g+v)}</b>${pill(chg(o.g+v,q.g+qv))}</div></div>`}).join('');
  return `${hero('GMV live + video · HO + MCN',money(c.g+cv),pill(chg(c.g+cv,p.g+pv)),[['GMV live',money(c.g),pill(chg(c.g,p.g))],['GMV video',money(cv),pill(chg(cv,pv))]])}
  ${tiles([['AOV live',money(c.aov),pill(chg(c.aov,p.aov))],['Đơn SKU live',int(c.o),pill(chg(c.o,p.o))],['Số phiên',int(c.n),pill(chg(c.n,p.n))]])}
  <h2>Theo kênh <small>so với kỳ trước</small></h2><div class="list">${ch}</div>
  <h2>14 ngày gần nhất <small>chạm cột để xem</small></h2>${chart(R.e,d=>sum(d,d).g+vsum(d,d),'var(--tiktok)',(x,d)=>{const o=sum(d,d);return `GMV <b>${money(x)}</b> · live ${money(o.g)} · video ${money(vsum(d,d))}`})}`}

function live(R){if(!D.rows.length)return noData();
  const c=sum(R.f,R.e),p=sum(R.pf,R.pe);
  const t=D.rows.filter(r=>r.d>=R.f&&r.d<=R.e&&r.g>0).sort((a,b)=>b.g-a.g);
  return `${hero('GMV live',money(c.g),pill(chg(c.g,p.g)),[['GMV / phiên',money(c.per),pill(chg(c.per,p.per))],['Người xem',int(c.v),pill(chg(c.v,p.v))]])}
  <h2>Top 5 phiên <small>theo GMV</small></h2>${top5(t,'var(--tiktok)',r=>[r.name||'Phiên live',`@${esc(r.cr)} · ${when(r)} · ${int(r.o)} đơn · ${int(r.v)} xem`,money(r.g),`<span>AOV ${money(r.o?r.g/r.o:null)}</span>`])}
  <h2>14 ngày gần nhất <small>số phiên mỗi ngày</small></h2>${chart(R.e,d=>sum(d,d).n,'#8a5cd6',(x,d)=>{const o=sum(d,d);return `<b>${x}</b> phiên · GMV <b>${money(o.g)}</b>`})}`}

function creator(R){if(!D.rows.length)return noData();
  const c=sum(R.f,R.e),cv=vsum(R.f,R.e);const m=group(R.f,R.e,r=>r.cr),mp=group(R.pf,R.pe,r=>r.cr);
  const add=(M,f,e)=>{for(const r of D.vid){if(r.d<f||r.d>e)continue;const o=M.get(r.cr)||{k:r.cr,ch:r.ch,g:0,o:0,v:0,n:0};o.vg=(o.vg||0)+r.g;o.g+=r.g;M.set(r.cr,o)}};
  add(m,R.f,R.e);add(mp,R.pf,R.pe);
  return `${hero('GMV live + video · HO + MCN',money(c.g+cv),pill(chg(c.g+cv,sum(R.pf,R.pe).g+vsum(R.pf,R.pe))),[['Creator có GMV',int(sorted(m).length),''],['AOV live',money(c.aov),'']])}
  <h2>Theo creator <small>live + video, so với kỳ trước</small></h2>${top5(sorted(m),'#8a5cd6',o=>['@'+o.k,`${o.ch} · ${o.n} phiên · video ${money(o.vg||0)} · ${int(o.o)} đơn live`,money(o.g),pill(chg(o.g,(mp.get(o.k)||{}).g))])}`}

const NOTE='Nguồn: TikTok Shop Partner Center (Olala MCN), LIVE analytics + Video Analytics. GMV = GMV do creator mang lại (đơn đã đặt, gồm hàng mọi shop). Live tính vào ngày bắt đầu phiên; video có từ 1/10/2026. AOV live = GMV live ÷ đơn SKU live.';

function render(){
  const end=D.end||ds(Date.now()-864e5);const R=range(S.p,end);
  const lbl={d:'Ngày',7:'7 ngày',30:'30 ngày',m:'Tháng'}[S.p];
  const body={overview,live,creator}[S.tab](R);
  $('#app').innerHTML=`<header><h1><a href="../" style="color:inherit;text-decoration:none;opacity:.5;margin-right:8px" aria-label="Về trang tổng">←</a>${TITLE[S.tab]}</h1><div class="d">${R.n===1?fd(R.e):fd(R.f)+' – '+fd(R.e)}</div></header>
  <div class="seg">${[['d','Ngày cuối'],['7','7N'],['30','30N'],['m','Tháng']].map(([k,l])=>`<button data-p="${k}" class="${S.p===k?'on':''}">${l}</button>`).join('')}</div>
  ${body}
  <a class="more" href="detail.html#${S.tab}">Xem bảng chi tiết →</a>
  <div class="note">${lbl} ${R.n===1?fd(R.e):fd(R.f)+' – '+fd(R.e)}, so với ${R.n} ngày liền trước.${D.end?' <b>Live tới '+fd(D.lend)+(D.vend?', video tới '+fd(D.vend):'')+'</b>.':''} ${NOTE}</div>
  <nav>${TABS.map(([k,l])=>`<button data-t="${k}" class="${S.tab===k?'on':''}"><i></i>${l}</button>`).join('')}</nav>`;
  document.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{S.p=b.dataset.p;render()});
  document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{S.tab=b.dataset.t;render();window.scrollTo({top:0})});
  document.querySelectorAll('[data-go]').forEach(r=>r.onclick=()=>{S.tab=r.dataset.go;render();window.scrollTo({top:0})});
}
load().then(render).catch(e=>{$('#app').innerHTML=`<div class="empty">Không tải được dữ liệu (${esc(e.message)})</div>`});
})();
