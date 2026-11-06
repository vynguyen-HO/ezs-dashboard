/* PFM Shopee — mobile / app-style main page. Reads data/*.csv directly; the full tables live in detail.html. */
(function(){
'use strict';
const TABS=[['overview','Tổng quan'],['live','Live'],['video','Video'],['aff','Affiliate'],['brand','Brand']];
const TITLE={overview:'Shopee',live:'Live',video:'Video',aff:'Affiliate',brand:'Brand & SKU'};
const DETAIL={overview:'thang-nay',live:'brand',video:'brand',aff:'brand',brand:'brand'};
const SUB={'[HO] Live Mega (DD)':['Live Mega','M','#ee6a2c','live'],'[HO] Live BAU':['Live BAU','B','#f2994a','live'],'[HO] Video':['Video HO','V','#2a78d6','video'],
  '[MCN] Live':['Live MCN','L','#8a5cd6','live'],'[MCN] Video':['Video MCN','V','#5b9be0','video']};
const ACC={HO:['HannahOlala','H','#ee6a2c'],HT:['Hannah Team (MCN)','T','#8a5cd6']};
const S={tab:'overview',p:'d'};
let D,BIG=null,bigErr=null;

/* ---------- utils ---------- */
const $=s=>document.querySelector(s);
const dt=s=>Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10));
const ds=t=>new Date(t).toISOString().slice(0,10);
const addD=(s,n)=>ds(dt(s)+n*864e5);
const fd=s=>`${+s.slice(8,10)}/${+s.slice(5,7)}`;
const isDD=s=>+s.slice(8,10)===+s.slice(5,7);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function money(v){if(v==null||!isFinite(v))return '–';const a=Math.abs(v);
  if(a>=1e9)return (v/1e9).toFixed(a>=1e10?1:2).replace('.',',')+' tỷ';
  if(a>=1e6)return Math.round(v/1e6)+' tr';if(a>=1e3)return Math.round(v/1e3)+'k';return Math.round(v)+'đ'}
const int=v=>v==null||!isFinite(v)?'–':Math.round(v).toLocaleString('vi-VN');
const pct=(v,d=0)=>v==null||!isFinite(v)?'–':(v*100).toFixed(d).replace('.',',')+'%';
const chg=(c,p)=>(c==null||p==null||!p)?null:(c-p)/Math.abs(p);
function pill(x,good=1){if(x==null)return '<span class="pill flat">–</span>';const cls=Math.abs(x)<.005||good===0?'flat':((x>0)===(good>0)?'up':'down');
  return `<span class="pill ${cls}">${x>0?'▲':x<0?'▼':''} ${Math.abs(x*100).toFixed(Math.abs(x)<.1?1:0).replace('.',',')}%</span>`}
function parseCSV(t){const L=t.trim().split(/\r?\n/);const h=L[0].split(',');return L.slice(1).map(l=>{const c=[];
  if(l.indexOf('"')<0)c.push(...l.split(','));else{let cur='',q=false;
  for(let i=0;i<l.length;i++){const ch=l[i];if(q){if(ch==='"'){if(l[i+1]==='"'){cur+='"';i++}else q=false}else cur+=ch}else if(ch==='"')q=true;else if(ch===','){c.push(cur);cur=''}else cur+=ch}
  c.push(cur)}const o={};h.forEach((k,i)=>o[k]=c[i]);return o})}
const get=f=>fetch('data/'+f+'?v='+Date.now()).then(r=>{if(!r.ok)throw new Error(f);return r.text()}).then(parseCSV);
const maxD=a=>a.reduce((m,r)=>r.d>m?r.d:m,'0');

/* ---------- data ---------- */
async function load(){
  const [daily,mtd,mplan]=await Promise.all([get('shp_daily.csv'),get('shp_mtd.csv'),get('shp_month_plan.csv')]);
  const dy={};daily.forEach(r=>{dy[r.date]=r.buyer_gmv===''||r.buyer_gmv==null?null:+r.buyer_gmv});
  const asOf=mtd[0]?mtd[0].as_of:null,mp=asOf&&mplan.find(p=>p.month===asOf.slice(0,7));
  const dim=mp?+mp.days_in_month:null,dp=asOf?+asOf.slice(8,10):null;
  D={dy,end:maxD(daily.map(r=>({d:r.date}))),asOf,dim,dp,
    mtd:mtd.map(r=>({sub:r.sub_channel,plan:+r.plan,buyer:+r.buyer_mtd,seller:+r.seller_mtd,sy:+r.seller_yesterday}))};
}
async function loadBig(){
  const [sku,items,aff]=await Promise.all([get('sku_daily.csv'),get('items.csv'),get('aff_brand_daily.csv')]);
  const it=new Map();items.forEach(r=>it.set(r.item_id,{title:r.title||r.item_id,brand:r.brand||'Chưa xác định'}));
  const rows=sku.map(r=>({d:r.date,id:r.item_id,a:r.acc||'HO',lp:+r.lp||0,lc:+r.lc||0,lo:+r.lo||0,lk:+r.lk||0,vp:+r.vp||0,vc:+r.vc||0}));
  const af=aff.map(r=>({d:r.date,a:r.acc||'HO',b:r.brand,g:+r.aff_gmv||0,c:+r.aff_commission||0,o:+r.aff_orders||0}));
  BIG={it,rows,af,skuEnd:maxD(rows),affEnd:maxD(af)};
}
function range(p,end){const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
  const e=end>=today?addD(today,-1):end;let f=e;
  if(p==='7')f=addD(e,-6);else if(p==='30')f=addD(e,-29);else if(p==='m')f=e.slice(0,8)+'01';
  const n=Math.round((dt(e)-dt(f))/864e5)+1;return {f,e,n,pf:addD(f,-n),pe:addD(f,-1)}}
function daySum(f,e){let s=0,n=0;for(const d in D.dy)if(d>=f&&d<=e&&D.dy[d]!=null){s+=D.dy[d];n++}return n?s:null}
function skuSum(f,e,fn){const o={lp:0,lc:0,lo:0,lk:0,vp:0,vc:0};for(const r of BIG.rows){if(r.d<f||r.d>e||(fn&&!fn(r)))continue;o.lp+=r.lp;o.lc+=r.lc;o.lo+=r.lo;o.lk+=r.lk;o.vp+=r.vp;o.vc+=r.vc}o.all=o.lp+o.vp;return o}
function affSum(f,e,fn){const o={g:0,c:0,o:0};for(const r of BIG.af){if(r.d<f||r.d>e||(fn&&!fn(r)))continue;o.g+=r.g;o.c+=r.c;o.o+=r.o}return o}
function group(src,f,e,key,val){const M=new Map();for(const r of src){if(r.d<f||r.d>e)continue;const v=val(r);if(!v)continue;const k=key(r);M.set(k,(M.get(k)||0)+v)}return M}
const sorted=M=>[...M.entries()].sort((a,b)=>b[1]-a[1]);

/* ---------- pieces ---------- */
function hero(label,big,dlt,tiles){return `<div class="hero"><div class="lb">${label}</div>
  <div class="big">${big} ${dlt}</div>
  <div class="two">${tiles.map(t=>`<div><span class="lb">${t[0]}</span><b>${t[1]}</b>${t[2]}</div>`).join('')}</div></div>`}
function bar(v,pace,cls=''){const w=Math.max(0,Math.min(1,v||0))*100;
  return `<div class="pg ${cls}"><i style="width:${w}%"></i>${pace!=null?`<u style="left:${Math.min(100,pace*100)}%"></u>`:''}</div>`}
function chart(end,val,color,tipFn){
  const days=[];for(let i=13;i>=0;i--)days.push(addD(end,-i));
  const v=days.map(val);const mx=Math.max(1,...v.map(x=>x||0));const W=320,H=130,bw=W/days.length;
  const bars=v.map((x,i)=>{const h=x==null?2:Math.max(2,x/mx*H);const fill=x==null?'var(--ink3)':isDD(days[i])?'var(--shopee)':color;
    return `<rect data-i="${i}" x="${i*bw+3}" y="${H-h}" width="${bw-6}" height="${h}" rx="4" fill="${fill}" opacity="${i===13?1:.55}"/>`}).join('');
  const id='c'+Math.random().toString(36).slice(2,7);
  setTimeout(()=>{const box=document.getElementById(id);if(!box)return;const tip=box.querySelector('.tip');
    const show=i=>{tip.innerHTML=`${fd(days[i])}${isDD(days[i])?' (ngày đôi)':''} · ${v[i]==null?'chưa có số':tipFn(v[i],days[i])}`;box.querySelectorAll('rect').forEach(r=>r.setAttribute('opacity',+r.dataset.i===i?1:.4))};
    box.querySelectorAll('rect').forEach(r=>{r.onclick=r.onmouseenter=()=>show(+r.dataset.i)});show(13)},0);
  return `<div class="chart" id="${id}"><div class="tip"></div><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${bars}</svg><div class="ax"><span>${fd(days[0])}</span><span>${fd(days[13])}</span></div></div>`}
function top5(list,color,fmt){if(!list.length)return '<div class="list"><div class="empty">Không có số trong kỳ này</div></div>';
  return `<div class="list">${list.slice(0,5).map((o,i)=>{const [t,s,r,rs]=fmt(o);return `<div class="row" style="cursor:default"><div class="ico" style="background:${color};opacity:${1-i*.12}">${i+1}</div>
  <div class="t"><b>${esc(t)}</b><span>${s}</span></div><div class="r"><b>${r}</b>${rs}</div></div>`}).join('')}</div>`}
function accRows(cur,prv,tot){return `<div class="list">${Object.keys(ACC).map(a=>{const [nm,ic,col]=ACC[a];
  return `<div class="row" style="cursor:default"><div class="ico" style="background:${col}">${ic}</div>
  <div class="t"><b>${nm}</b><span>${tot?pct(cur[a]/tot):'–'} tổng</span></div>
  <div class="r"><b>${money(cur[a])}</b>${cur[a]||prv[a]?pill(chg(cur[a],prv[a])):'<span>chưa có số</span>'}</div></div>`}).join('')}</div>`}
const loading=()=>`<div class="empty" style="padding:60px 18px">${bigErr?'Không tải được dữ liệu SKU ('+esc(bigErr)+')':'Đang tải dữ liệu SKU…'}</div>`;
const itemName=id=>{const t=(BIG.it.get(id)||{}).title||id;return t.replace(/^(\s*[\[【][^\]】]*[\]】]\s*)+/,'')||t};
const itemBrand=id=>(BIG.it.get(id)||{}).brand||'Chưa xác định';

/* ---------- screens ---------- */
function overview(R){
  const cur=BIG?skuSum(R.f,R.e).all:null,prv=BIG?skuSum(R.pf,R.pe).all:null;
  const plan=D.mtd.reduce((a,r)=>a+r.plan,0),sel=D.mtd.reduce((a,r)=>a+r.seller,0),buy=D.mtd.reduce((a,r)=>a+r.buyer,0);
  const vs=plan?sel/plan:null,pace=D.dim?D.dp/D.dim:null,rr=vs!=null&&D.dp?vs*D.dim/D.dp:null,left=D.dim-D.dp;
  const need=left>0?Math.max(0,plan-sel)/left:null,mo='T'+(+(D.asOf||'').slice(5,7));
  const rrPill=rr==null?'':`<span class="pill ${rr>=1?'up':'down'}">dự kiến ${pct(rr)}</span>`;
  const subs=D.mtd.map(r=>{const [nm,ic,col,go]=SUB[r.sub]||[r.sub,'?','#888','overview'];const v=r.plan?r.seller/r.plan:null;
    return `<div class="row" data-go="${go}"><div class="ico" style="background:${col}">${ic}</div>
    <div class="t"><b>${esc(nm)}</b><span>${money(r.seller)} / ${money(r.plan)}${r.sy?' · hôm qua '+money(r.sy):''}</span>${bar(v,pace)}</div>
    <div class="r"><b>${pct(v)}</b><span>plan</span></div></div>`}).join('');
  return `${hero('GMV.seller · live + video',BIG?money(cur):'…',cur==null?`<span class="pill flat">${BIG?'chưa có số':'đang tải'}</span>`:pill(chg(cur,prv)),
    [[`Đạt plan ${mo}`,pct(vs),rrPill+bar(vs,pace,'h')],['Cần mỗi ngày',need==null?'–':money(need),`<span class="lb">còn ${left>0?left:0} ngày</span>`]])}
  <h2>${mo} theo kênh · GMV.seller <small>vạch = nhịp cần có</small></h2><div class="list">${subs}</div>
  <div class="gmv" style="margin-top:10px"><div><span>GMV.seller MTD ${mo}</span><b>${money(sel)}</b><span>${pct(vs,1)} plan</span></div><div><span>GMV Buyer MTD (sau huỷ/hoàn)</span><b>${money(buy)}</b><span>${pct(plan?buy/plan:null,1)} plan · sheet dùng số này</span></div></div>
  <h2>14 ngày gần nhất <small>GMV.seller live + video</small></h2>${BIG?chart(R.e,d=>{const o=skuSum(d,d).all;return o||null},'var(--ink)',x=>`GMV.seller <b>${money(x)}</b>`):loading()}`}

function live(R){if(!BIG)return loading();
  const cur=skuSum(R.f,R.e),prv=skuSum(R.pf,R.pe);const cr=c=>c.lk?c.lo/c.lk:null;
  const ac=f=>p=>Object.fromEntries(Object.keys(ACC).map(a=>[a,skuSum(f,p,r=>r.a===a).lp]));
  const t=sorted(group(BIG.rows,R.f,R.e,r=>r.id,r=>r.lp)),od=group(BIG.rows,R.f,R.e,r=>r.id,r=>r.lo);
  return `${hero('GMV.seller · live',money(cur.lp),pill(chg(cur.lp,prv.lp)),
    [['Đơn',int(cur.lo),pill(chg(cur.lo,prv.lo))],['Đơn ÷ click',pct(cr(cur),1),pill(chg(cr(cur),cr(prv)))]])}
  <h2>Theo kênh <small>so với kỳ trước</small></h2>${accRows(ac(R.f)(R.e),ac(R.pf)(R.pe),cur.lp)}
  <h2>14 ngày gần nhất <small>chạm cột để xem</small></h2>${chart(R.e,d=>skuSum(d,d).lp,'var(--ink)',(x,d)=>`GMV.seller live <b>${money(x)}</b>`)}
  <h2>Top 5 SKU live</h2>${top5(t,'var(--shopee)',([id,v])=>[itemName(id),`${esc(itemBrand(id))} · ${int(od.get(id)||0)} đơn`,money(v),''])}`}

function video(R){if(!BIG)return loading();
  const cur=skuSum(R.f,R.e),prv=skuSum(R.pf,R.pe);const sh=c=>c.all?c.vp/c.all:null;
  const ac=(f,e)=>Object.fromEntries(Object.keys(ACC).map(a=>[a,skuSum(f,e,r=>r.a===a).vp]));
  const t=sorted(group(BIG.rows,R.f,R.e,r=>r.id,r=>r.vp));
  return `${hero('GMV.seller · video',money(cur.vp),pill(chg(cur.vp,prv.vp)),
    [['Đã xác nhận',money(cur.vc),pill(chg(cur.vc,prv.vc))],['Video / tổng',pct(sh(cur),1),pill(chg(sh(cur),sh(prv)))]])}
  <h2>Theo kênh <small>so với kỳ trước</small></h2>${accRows(ac(R.f,R.e),ac(R.pf,R.pe),cur.vp)}
  <h2>14 ngày gần nhất <small>chạm cột để xem</small></h2>${chart(R.e,d=>skuSum(d,d).vp,'var(--meta)',x=>`GMV.seller video <b>${money(x)}</b>`)}
  <h2>Top 5 SKU video</h2>${top5(t,'var(--meta)',([id,v])=>[itemName(id),esc(itemBrand(id)),money(v),''])}`}

function aff(R){if(!BIG)return loading();
  const cur=affSum(R.f,R.e),prv=affSum(R.pf,R.pe);
  const ac=(f,e)=>Object.fromEntries(Object.keys(ACC).map(a=>[a,affSum(f,e,r=>r.a===a).g]));
  const t=sorted(group(BIG.af,R.f,R.e,r=>r.b,r=>r.g)),tp=group(BIG.af,R.pf,R.pe,r=>r.b,r=>r.g);
  return `${hero('NMV affiliate',money(cur.g),pill(chg(cur.g,prv.g)),
    [['Đơn',int(cur.o),pill(chg(cur.o,prv.o))],['Hoa hồng',money(cur.c),pill(chg(cur.c,prv.c),0)]])}
  <h2>Theo kênh <small>so với kỳ trước</small></h2>${accRows(ac(R.f,R.e),ac(R.pf,R.pe),cur.g)}
  <h2>14 ngày gần nhất <small>chạm cột để xem</small></h2>${chart(R.e,d=>affSum(d,d).g,'#14915f',x=>`NMV <b>${money(x)}</b>`)}
  <h2>Top 5 brand <small>theo NMV</small></h2>${top5(t,'#14915f',([b,v])=>[b,cur.g?pct(v/cur.g)+' NMV':'',money(v),pill(chg(v,tp.get(b)))])}`}

function brand(R){if(!BIG)return loading();
  const cur=skuSum(R.f,R.e),prv=skuSum(R.pf,R.pe);
  const bm=group(BIG.rows,R.f,R.e,r=>itemBrand(r.id),r=>r.lp+r.vp),bp=group(BIG.rows,R.pf,R.pe,r=>itemBrand(r.id),r=>r.lp+r.vp);
  const sm=group(BIG.rows,R.f,R.e,r=>r.id,r=>r.lp+r.vp),spv=group(BIG.rows,R.pf,R.pe,r=>r.id,r=>r.lp+r.vp);
  return `${hero('GMV.seller · live + video',money(cur.all),pill(chg(cur.all,prv.all)),
    [['Brand có đơn',int(bm.size),pill(chg(bm.size,bp.size))],['SKU có đơn',int(sm.size),pill(chg(sm.size,spv.size))]])}
  <h2>Top 5 brand <small>so với kỳ trước</small></h2>${top5(sorted(bm),'var(--shopee)',([b,v])=>[b,cur.all?pct(v/cur.all)+' tổng':'',money(v),pill(chg(v,bp.get(b)))])}
  <h2>Top 5 SKU</h2>${top5(sorted(sm),'var(--ink)',([id,v])=>[itemName(id),esc(itemBrand(id)),money(v),pill(chg(v,spv.get(id)))])}`}

const NOTE={
  overview:'GMV.seller = GMV đơn đã đặt (chưa trừ hủy/hoàn): số chính của Shopee, dùng để tính % plan ở đây. Theo ngày = live + video theo SKU từ Creator Center (HO + Hannah Team), không gồm Affiliate. GMV Buyer (sau hủy/hoàn) là số sheet GMV_Data dùng để tính % đạt. Vạch trên thanh = số ngày đã qua ÷ số ngày tháng.',
  live:'GMV.seller = GMV đơn đã đặt (chưa trừ hủy/hoàn) theo SKU, Creator Center, HO + Hannah Team.',
  video:'GMV.seller = GMV đơn đã đặt (chưa trừ hủy/hoàn) theo SKU, Creator Center, HO + Hannah Team.',
  aff:'NMV = giá trị đơn qua link Affiliate, đã trừ đơn hủy / không hợp lệ.',
  brand:'GMV.seller (đơn đã đặt) live + video theo SKU; Creator Center lấy tối đa 1.000 SKU/ngày.'};

function render(){
  const end=!BIG?D.end:S.tab==='aff'?BIG.affEnd:BIG.skuEnd;
  const R=range(S.p,end);
  const lbl={d:'Hôm qua',7:'7 ngày',30:'30 ngày',m:'Tháng này'}[S.p];
  const body={overview,live,video,aff,brand}[S.tab](R);
  const asOf=S.tab==='overview'&&D.asOf?` Plan tính đến hết ${fd(D.asOf)}.`:'';
  $('#app').innerHTML=`<header><h1><a href="../" style="color:inherit;text-decoration:none;opacity:.5;margin-right:8px" aria-label="Về trang tổng">←</a>${TITLE[S.tab]}</h1><div class="d">${R.n===1?fd(R.e):fd(R.f)+' – '+fd(R.e)}</div></header>
  <div class="seg">${[['d','Hôm qua'],['7','7N'],['30','30N'],['m','Tháng']].map(([k,l])=>`<button data-p="${k}" class="${S.p===k?'on':''}">${l}</button>`).join('')}</div>
  ${body}
  <a class="more" href="detail.html#${DETAIL[S.tab]}">Xem bảng chi tiết →</a>
  <div class="note">${S.p==='d'?'Ngày '+fd(R.e):lbl}, so với ${R.n} ngày liền trước. Dữ liệu tới ${fd(end)}.${asOf} ${NOTE[S.tab]}</div>
  <nav>${TABS.map(([k,l])=>`<button data-t="${k}" class="${S.tab===k?'on':''}"><i></i>${l}</button>`).join('')}</nav>`;
  document.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{S.p=b.dataset.p;render()});
  document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{S.tab=b.dataset.t;render();window.scrollTo({top:0})});
  document.querySelectorAll('[data-go]').forEach(r=>r.onclick=()=>{S.tab=r.dataset.go;render();window.scrollTo({top:0})});
}
load().then(()=>{render();loadBig().then(render).catch(e=>{bigErr=e.message;render()})})
  .catch(e=>{$('#app').innerHTML=`<div class="empty">Không tải được dữ liệu (${esc(e.message)})</div>`});
})();
