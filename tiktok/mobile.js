/* Tiktok dashboard — mobile / app-style main page.
   Own data (tiktok/data): GMV per sub-channel vs plan from the GMV sheet (tools/tiktok/update.py).
   Shared data (media/data, written by the Media update): daily TikTok GMV, TikTok ads, live sessions, videos. */
(function(){
'use strict';
const TABS=[['overview','Tổng quan'],['live','Live'],['video','Video'],['ads','Ads']];
const TITLE={overview:'Tiktok',live:'Live',video:'Video',ads:'Ads TikTok'};
const SUB={'[HO] Live':['Live HO','L','#e0457b','live'],'[HO] Video':['Video HO','V','#2a78d6','video'],
  '[MCN] Live':['Live MCN','L','#8a5cd6','live'],'[MCN] Video':['Video MCN','V','#5b9be0','video']};
const TYPE={ads:['Ads thường','A','#2a78d6'],gmv_max_live:['LIVE GMV Max','L','#e0457b'],gmv_max_product:['Product GMV Max','P','#8a5cd6']};
const ACC={Affiliate:['Affiliate','A','#e0457b'],HANNAHOLALA:['HANNAHOLALA','H','#17161a']};
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
  if(a>=1e6)return Math.round(v/1e6)+' tr';if(a>=1e3)return Math.round(v/1e3)+'k';return Math.round(v)+'đ'}
const int=v=>v==null||!isFinite(v)?'–':Math.round(v).toLocaleString('vi-VN');
const dec=v=>v==null||!isFinite(v)?'–':v.toFixed(1).replace('.',',');
const pct=(v,d=0)=>v==null||!isFinite(v)?'–':(v*100).toFixed(d).replace('.',',')+'%';
const chg=(c,p)=>(c==null||p==null||!p)?null:(c-p)/Math.abs(p);
function pill(x,good=1){if(x==null)return '<span class="pill flat">–</span>';const cls=Math.abs(x)<.005||good===0?'flat':((x>0)===(good>0)?'up':'down');
  return `<span class="pill ${cls}">${x>0?'▲':x<0?'▼':''} ${Math.abs(x*100).toFixed(Math.abs(x)<.1?1:0).replace('.',',')}%</span>`}
function parseCSV(t){const L=t.trim().split(/\r?\n/);const h=L[0].split(',');return L.slice(1).map(l=>{const c=[];
  if(l.indexOf('"')<0)c.push(...l.split(','));else{let cur='',q=false;
  for(let i=0;i<l.length;i++){const ch=l[i];if(q){if(ch==='"'){if(l[i+1]==='"'){cur+='"';i++}else q=false}else cur+=ch}else if(ch==='"')q=true;else if(ch===','){c.push(cur);cur=''}else cur+=ch}
  c.push(cur)}const o={};h.forEach((k,i)=>o[k]=c[i]);return o})}
const get=p=>fetch(p+'?v='+Date.now()).then(r=>{if(!r.ok)throw new Error(p.split('/').pop());return r.text()}).then(parseCSV);
const own=f=>get('data/'+f),media=f=>get('../media/data/'+f);
const maxD=a=>a.reduce((m,r)=>r.d>m?r.d:m,'0');
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());

/* ---------- data ---------- */
async function load(){
  const [mtd,mplan,gmvd,camps,cdaily,lives,ldaily,vids,vdaily]=await Promise.all([own('tt_mtd.csv'),own('tt_month_plan.csv'),
    media('gmv_daily.csv'),media('campaigns.csv'),media('campaign_daily.csv'),media('tiktok_lives.csv'),media('tiktok_live_daily.csv'),
    media('tiktok_videos.csv'),media('tiktok_video_daily.csv')]);
  const asOf=mtd[0]?mtd[0].as_of:null,mp=asOf&&mplan.find(p=>p.month===asOf.slice(0,7));
  const gd={},rep={};let prev=null;
  gmvd.filter(r=>r.channel==='TikTok').sort((a,b)=>a.date<b.date?-1:1).forEach(r=>{const v=r.gmv===''?null:+r.gmv;gd[r.date]=v;if(v&&v===prev)rep[r.date]=1;prev=v});
  const C={};camps.forEach(c=>{if(c.channel==='TikTok')C[c.key]=c});
  const ads=cdaily.filter(r=>C[r.key]).map(r=>{const c=C[r.key];return {d:r.date,k:r.key,name:c.name,type:c.type,acc:c.account,sp:+r.spend,rv:+r.revenue,od:+r.orders}});
  const L={};lives.forEach(r=>L[r.room_id]=r);
  const lr=ldaily.map(r=>({d:r.date,k:r.room_id,acc:r.account,sp:+r.spend,g:+r.gmv_all,o:+r.orders_all,v:+r.views}));
  const V={};vids.forEach(r=>V[r.vid_key]=r);
  const vr=vdaily.map(r=>({d:r.date,k:r.vid_key,sp:+r.spend,g:+r.gmv,o:+r.orders}));
  const t=today(),cap=e=>e>=t?addD(t,-1):e;
  D={mtd:mtd.map(r=>({sub:r.sub_channel,fmt:r.format,plan:+r.plan,mtd:+r.mtd,y:r.yesterday===''?null:+r.yesterday})),asOf,
    dim:mp?+mp.days_in_month:null,dp:mp?+mp.days_counted:null,plan:mp?+mp.plan:null,
    gd,rep,gEnd:cap(Object.keys(gd).filter(d=>gd[d]!=null).sort().pop()||t),
    ads,aEnd:cap(maxD(ads.filter(r=>r.sp>0))),L,lr,V,vr};
}
function range(p,e){let f=e;
  if(p==='7')f=addD(e,-6);else if(p==='30')f=addD(e,-29);else if(p==='m')f=e.slice(0,8)+'01';
  const n=Math.round((dt(e)-dt(f))/864e5)+1;return {f,e,n,pf:addD(f,-n),pe:addD(f,-1)}}
function gsum(f,e){let s=0,n=0;for(const d in D.gd)if(d>=f&&d<=e&&D.gd[d]!=null){s+=D.gd[d];n++}return n?s:null}
function asum(f,e,fn){const o={sp:0,rv:0,od:0};for(const r of D.ads){if(r.d<f||r.d>e||(fn&&!fn(r)))continue;o.sp+=r.sp;o.rv+=r.rv;o.od+=r.od}o.roi=o.sp?o.rv/o.sp:null;return o}
function rsum(src,f,e){const o={sp:0,g:0,o:0};for(const r of src){if(r.d<f||r.d>e)continue;o.sp+=r.sp;o.g+=r.g;o.o+=r.o}o.roi=o.sp?o.g/o.sp:null;return o}
function group(src,f,e){const M=new Map();for(const r of src){if(r.d<f||r.d>e)continue;const o=M.get(r.k)||{k:r.k,sp:0,g:0,o:0,v:0,first:r.d};
  o.sp+=r.sp;o.g+=r.g;o.o+=r.o;o.v+=r.v||0;if(r.d<o.first)o.first=r.d;M.set(r.k,o)}return [...M.values()].filter(o=>o.g>0||o.sp>0).sort((a,b)=>b.g-a.g||b.sp-a.sp)}
const fmtMtd=fmt=>{const r=D.mtd.filter(x=>x.fmt===fmt);return {plan:r.reduce((a,x)=>a+x.plan,0),mtd:r.reduce((a,x)=>a+x.mtd,0)}};

/* ---------- pieces ---------- */
function hero(label,big,dlt,tiles){return `<div class="hero"><div class="lb">${label}</div>
  <div class="big">${big} ${dlt}</div>
  <div class="two">${tiles.map(t=>`<div><span class="lb">${t[0]}</span><b>${t[1]}</b>${t[2]}</div>`).join('')}</div></div>`}
function bar(v,pace,cls=''){const w=Math.max(0,Math.min(1,v||0))*100;
  return `<div class="pg ${cls}"><i style="width:${w}%"></i>${pace!=null?`<u style="left:${Math.min(100,pace*100)}%"></u>`:''}</div>`}
function chart(end,val,color,tipFn){
  const days=[];for(let i=13;i>=0;i--)days.push(addD(end,-i));
  const v=days.map(val);const mx=Math.max(1,...v.map(x=>x||0));const W=320,H=130,bw=W/days.length;
  const bars=v.map((x,i)=>{const h=x==null?2:Math.max(2,x/mx*H);
    return `<rect data-i="${i}" x="${i*bw+3}" y="${H-h}" width="${bw-6}" height="${h}" rx="4" fill="${x==null?'var(--ink3)':color}" opacity="${i===13?1:.55}"/>`}).join('');
  const id='c'+Math.random().toString(36).slice(2,7);
  setTimeout(()=>{const box=document.getElementById(id);if(!box)return;const tip=box.querySelector('.tip');
    const show=i=>{tip.innerHTML=`${fd(days[i])} · ${v[i]==null?'chưa có số':tipFn(v[i],days[i])}`;box.querySelectorAll('rect').forEach(r=>r.setAttribute('opacity',+r.dataset.i===i?1:.4))};
    box.querySelectorAll('rect').forEach(r=>{r.onclick=r.onmouseenter=()=>show(+r.dataset.i)});show(13)},0);
  return `<div class="chart" id="${id}"><div class="tip"></div><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${bars}</svg><div class="ax"><span>${fd(days[0])}</span><span>${fd(days[13])}</span></div></div>`}
function top5(list,color,fmt,empty){if(!list.length)return `<div class="list"><div class="empty">${empty||'Không có số trong kỳ này'}</div></div>`;
  return `<div class="list">${list.slice(0,5).map((o,i)=>{const [t,s,r,rs]=fmt(o);return `<div class="row" style="cursor:default"><div class="ico" style="background:${color};opacity:${1-i*.12}">${i+1}</div>
  <div class="t"><b>${esc(t)}</b><span>${s}</span></div><div class="r"><b>${r}</b>${rs}</div></div>`}).join('')}</div>`}
function tiles(list){return `<div class="gmv">${list.map(([l,v,p])=>`<div><span>${l}</span><b>${v}</b>${p}</div>`).join('')}</div>`}
function subRows(filter){const pace=D.dim?D.dp/D.dim:null;
  return `<div class="list">${D.mtd.filter(filter||(()=>1)).map(r=>{const [nm,ic,col,go]=SUB[r.sub]||[r.sub,'?','#888','overview'];const v=r.plan?r.mtd/r.plan:null;
    return `<div class="row" data-go="${go}"><div class="ico" style="background:${col}">${ic}</div>
    <div class="t"><b>${esc(nm)}</b><span>${money(r.mtd)} / ${money(r.plan)}${r.y!=null?' · hôm qua '+money(r.y):''}</span>${bar(v,pace)}</div>
    <div class="r"><b>${pct(v,v!=null&&v<.1?1:0)}</b><span>plan</span></div></div>`}).join('')}</div>`}
const mo=()=>'T'+(+(D.asOf||'').slice(5,7));
function planTiles(plan,got){const pace=D.dim?D.dp/D.dim:null,vs=plan?got/plan:null,rr=vs!=null&&D.dp?vs*D.dim/D.dp:null,left=(D.dim||0)-(D.dp||0);
  const need=left>0?Math.max(0,plan-got)/left:null;const rrPill=rr==null?'':`<span class="pill ${rr>=1?'up':'down'}">dự kiến ${pct(rr)}</span>`;
  return [[`Đạt plan ${mo()}`,pct(vs,vs!=null&&vs<.1?1:0),rrPill+bar(vs,pace,'h')],['Cần mỗi ngày',need==null?'–':money(need),`<span class="lb">còn ${left>0?left:0} ngày</span>`]]}
const roomName=k=>(D.L[k]||{}).live_name||'Phiên live';
const vidName=k=>{const v=D.V[k]||{};if(k.startsWith('P')&&k.slice(1)==='-1')return 'Thẻ sản phẩm (không gắn video)';
  return v.title||(k.startsWith('P')?'Video '+k.slice(1):'Ad '+k.slice(1))};

/* ---------- screens ---------- */
function overview(R){
  const cur=gsum(R.f,R.e),prv=gsum(R.pf,R.pe);const A=range(S.p,D.aEnd);
  const a=asum(A.f,A.e),ap=asum(A.pf,A.pe);
  const got=D.mtd.reduce((s,r)=>s+r.mtd,0),plan=D.plan||D.mtd.reduce((s,r)=>s+r.plan,0);
  const rep=Object.keys(D.rep).filter(d=>d>=addD(R.e,-13)&&d<=R.e);
  return `${hero('GMV TikTok · tổng kênh',money(cur),cur==null?'<span class="pill flat">chưa có số</span>':pill(chg(cur,prv)),planTiles(plan,got))}
  <h2>${mo()} theo kênh <small>vạch = nhịp cần có</small></h2>${subRows()}
  <h2>14 ngày gần nhất <small>chạm cột để xem</small></h2>${chart(R.e,d=>D.gd[d]??null,'var(--tiktok)',(x,d)=>`GMV <b>${money(x)}</b>${D.rep[d]?' · giống hôm trước':''}`)}
  <h2>Quảng cáo <small>${A.n===1?fd(A.e):fd(A.f)+' – '+fd(A.e)}</small></h2>
  ${tiles([['Ad spend',money(a.sp),pill(chg(a.sp,ap.sp),0)],['ROI',dec(a.roi),pill(chg(a.roi,ap.roi))]])}
  ${rep.length?`<div class="note">Sheet lặp lại số của hôm trước ở ngày ${rep.map(fd).join(', ')}: có thể sheet chưa cập nhật.</div>`:''}`}

function live(R){
  const m=fmtMtd('Live');const cur=rsum(D.lr,R.f,R.e),prv=rsum(D.lr,R.pf,R.pe);
  const t=group(D.lr,R.f,R.e);
  return `${hero(`GMV live · ${mo()} theo sheet`,money(m.mtd),'',planTiles(m.plan,m.mtd))}
  <h2>${mo()} theo kênh</h2>${subRows(r=>r.fmt==='Live')}
  <h2>LIVE GMV Max <small>so với kỳ trước</small></h2>
  ${tiles([['Chi phí ads',money(cur.sp),pill(chg(cur.sp,prv.sp),0)],['GMV phiên live',money(cur.g),pill(chg(cur.g,prv.g))],
    ['ROI',dec(cur.roi),pill(chg(cur.roi,prv.roi))],['Đơn',int(cur.o),pill(chg(cur.o,prv.o))]])}
  <h2>14 ngày gần nhất <small>GMV phiên có chạy ads</small></h2>${chart(R.e,d=>{const o=rsum(D.lr,d,d);return o.g||o.sp?o.g:null},'var(--tiktok)',(x,d)=>{const o=rsum(D.lr,d,d);return `GMV <b>${money(x)}</b> · chi <b>${money(o.sp)}</b>`})}
  <h2>Top 5 phiên live <small>theo GMV</small></h2>${top5(t,'var(--tiktok)',o=>[roomName(o.k),`${fd(o.first)} · chi ${money(o.sp)} · ${int(o.v)} xem`,money(o.g),`<span>ROI ${dec(o.sp?o.g/o.sp:null)}</span>`])}`}

function video(R){
  const m=fmtMtd('Video');const cur=rsum(D.vr,R.f,R.e),prv=rsum(D.vr,R.pf,R.pe);
  const t=group(D.vr,R.f,R.e);
  return `${hero(`GMV video · ${mo()} theo sheet`,money(m.mtd),'',planTiles(m.plan,m.mtd))}
  <h2>${mo()} theo kênh</h2>${subRows(r=>r.fmt==='Video')}
  <h2>Video có chạy ads <small>so với kỳ trước</small></h2>
  ${tiles([['Chi phí ads',money(cur.sp),pill(chg(cur.sp,prv.sp),0)],['GMV từ ads',money(cur.g),pill(chg(cur.g,prv.g))],
    ['ROI',dec(cur.roi),pill(chg(cur.roi,prv.roi))],['Đơn',int(cur.o),pill(chg(cur.o,prv.o))]])}
  <h2>14 ngày gần nhất <small>chi phí ads video</small></h2>${chart(R.e,d=>{const o=rsum(D.vr,d,d);return o.sp||o.g?o.sp:null},'#2a78d6',(x,d)=>{const o=rsum(D.vr,d,d);return `chi <b>${money(x)}</b> · GMV <b>${money(o.g)}</b>`})}
  <h2>Top 5 video <small>theo GMV từ ads</small></h2>${top5(t,'#2a78d6',o=>[vidName(o.k),`${o.k[0]==='P'?'Product GMV Max':'Video ads'} · chi ${money(o.sp)}`,money(o.g),`<span>ROI ${dec(o.sp?o.g/o.sp:null)}</span>`])}`}

function ads(R){
  const cur=asum(R.f,R.e),prv=asum(R.pf,R.pe);
  const rowsBy=(keys,fn,meta)=>`<div class="list">${keys.map(k=>{const o=asum(R.f,R.e,r=>fn(r)===k),p=asum(R.pf,R.pe,r=>fn(r)===k);const [nm,ic,col]=meta[k];
    return `<div class="row" style="cursor:default"><div class="ico" style="background:${col}">${ic}</div>
    <div class="t"><b>${nm}</b><span>Chi ${money(o.sp)} · ${cur.sp?Math.round(o.sp/cur.sp*100):0}% · GMV ${money(o.rv)}</span></div>
    <div class="r"><b>${dec(o.roi)}</b>${o.sp?pill(chg(o.roi,p.roi)):'<span>không chi</span>'}</div></div>`}).join('')}</div>`;
  return `${hero('Ad spend · TikTok',money(cur.sp),pill(chg(cur.sp,prv.sp),0),[['Ad GMV',money(cur.rv),pill(chg(cur.rv,prv.rv))],['ROI',dec(cur.roi),pill(chg(cur.roi,prv.roi))]])}
  <h2>Theo loại <small>ROI · so với kỳ trước</small></h2>${rowsBy(Object.keys(TYPE),r=>r.type,TYPE)}
  <h2>Theo tài khoản</h2>${rowsBy(Object.keys(ACC),r=>r.acc,ACC)}
  <h2>14 ngày gần nhất <small>chạm cột để xem</small></h2>${chart(R.e,d=>asum(d,d).sp,'var(--ink)',(x,d)=>{const o=asum(d,d);return `chi <b>${money(x)}</b> · ROI <b>${dec(o.roi)}</b>`})}`}

const NOTE={
  overview:'GMV theo ngày = cột tt của sheet Daily_History (GMV TikTok creator), nên tổng có thể khác số MTD theo kênh trong GMV_Data. Plan và MTD theo kênh lấy từ sheet GMV_Data. Vạch trên thanh = số ngày đã qua ÷ số ngày tháng.',
  live:'Plan và MTD theo sheet GMV_Data. LIVE GMV Max = số từ TikTok Ads theo từng phiên (GMV toàn shop trong phiên có chạy ads).',
  video:'Plan và MTD theo sheet GMV_Data. Video có chạy ads = Product GMV Max theo video + video ads thường, số từ TikTok Ads.',
  ads:'Số từ TikTok Ads, hai tài khoản Affiliate và HANNAHOLALA. Ad GMV của LIVE GMV Max là GMV toàn shop trong phiên.'};
const DETAIL={overview:'overview',live:'live',video:'video',ads:'ads'};

function render(){
  const end=S.tab==='overview'?D.gEnd:D.aEnd;const R=range(S.p,end);
  const lbl={d:'Hôm qua',7:'7 ngày',30:'30 ngày',m:'Tháng này'}[S.p];
  const body={overview,live,video,ads}[S.tab](R);
  $('#app').innerHTML=`<header><h1><a href="../" style="color:inherit;text-decoration:none;opacity:.5;margin-right:8px" aria-label="Về trang tổng">←</a>${TITLE[S.tab]}</h1><div class="d">${R.n===1?fd(R.e):fd(R.f)+' – '+fd(R.e)}</div></header>
  <div class="seg">${[['d','Hôm qua'],['7','7N'],['30','30N'],['m','Tháng']].map(([k,l])=>`<button data-p="${k}" class="${S.p===k?'on':''}">${l}</button>`).join('')}</div>
  ${body}
  <a class="more" href="detail.html#${DETAIL[S.tab]}">Xem bảng chi tiết →</a>
  <div class="note">${S.p==='d'?'Ngày '+fd(R.e):lbl}, so với ${R.n} ngày liền trước. Dữ liệu tới ${fd(end)}.${D.asOf?` Plan tính đến hết ${fd(D.asOf)}.`:''} ${NOTE[S.tab]}</div>
  <nav>${TABS.map(([k,l])=>`<button data-t="${k}" class="${S.tab===k?'on':''}"><i></i>${l}</button>`).join('')}</nav>`;
  document.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{S.p=b.dataset.p;render()});
  document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{S.tab=b.dataset.t;render();window.scrollTo({top:0})});
  document.querySelectorAll('[data-go]').forEach(r=>r.onclick=()=>{S.tab=r.dataset.go;render();window.scrollTo({top:0})});
}
load().then(render).catch(e=>{$('#app').innerHTML=`<div class="empty">Không tải được dữ liệu (${esc(e.message)})</div>`});
})();
