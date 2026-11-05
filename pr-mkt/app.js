/* Pr_MKT (Hannah Team TikTok channels) — mobile / app-style main page.
   Reads data/*.json directly; the full tables live in detail.html (built by tools/cm.py). */
(function(){
'use strict';
const KPI=5000;
const COLS=['#e2552b','#2563eb','#0f9d76','#a855f7','#d97706','#db2777','#475569','#0891b2','#65a30d','#b45309'];
const SEV={bad:[0,'var(--down)','!'],warn:[1,'#d98a1c','!'],info:[2,'var(--ink3)','i']};
const PDET={d:'yday',7:'7d',30:'30d',m:'mtd'};
const S={tab:'overview',ch:null,p:'7'};
let D;

/* ---------- utils ---------- */
const $=s=>document.querySelector(s);
const dt=s=>Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10));
const ds=t=>new Date(t).toISOString().slice(0,10);
const addD=(s,n)=>ds(dt(s)+n*864e5);
const vnDay=sec=>ds(sec*1000+7*36e5);
const fd=s=>`${+s.slice(8,10)}/${+s.slice(5,7)}`;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nf=v=>v==null?'–':Math.round(v).toLocaleString('vi-VN');
const kf=v=>v==null?'–':v>=1e6?(v/1e6).toFixed(v>=1e7?1:2).replace('.',',')+'M':v>=1e4?(v/1e3).toFixed(1).replace('.',',')+'k':nf(v);
function money(v){if(v==null||!isFinite(v))return '–';const a=Math.abs(v);
  if(a>=1e9)return (v/1e9).toFixed(a>=1e10?1:2).replace('.',',')+' tỷ';
  if(a>=1e6)return Math.round(v/1e6)+' tr';if(a>=1e3)return Math.round(v/1e3)+'k';return Math.round(v)+'đ'}
const chg=(c,p)=>(c==null||p==null||!p)?null:(c-p)/Math.abs(p);
function pill(x){if(x==null)return '<span class="pill flat">–</span>';const cls=Math.abs(x)<.005?'flat':x>0?'up':'down';
  return `<span class="pill ${cls}">${x>0?'▲':x<0?'▼':''} ${Math.abs(x*100).toFixed(Math.abs(x)<.1?1:0).replace('.',',')}%</span>`}
function dpill(n){if(n==null)return '<span class="pill flat">–</span>';const cls=n>0?'up':n<0?'down':'flat';
  return `<span class="pill ${cls}">${n>0?'▲ +':n<0?'▼ ':''}${nf(n)}</span>`}
const short=h=>h.replace('hannah.team.chot.don','chốt đơn').replace('hannaholala.mall','mall').replace('its.hannah.team','its').replace('hannah.mega.live','mega.live').replace('hannahteam.','');
const ini=h=>short(h).slice(0,2).toUpperCase();
const get=f=>fetch('data/'+f+'?v='+Date.now()).then(r=>{if(!r.ok)throw new Error(f);return r.json()});

/* ---------- data ---------- */
async function load(){
  const [chans,F,G,ST,V]=await Promise.all(['channels.json','followers.json','gmv.json','status.json','videos.json'].map(get));
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
  const vids=Object.entries(V).map(([id,v])=>({id,h:v.h,d:vnDay(v.ts),ts:v.ts,title:v.title,tag:!!v.tag,s:v.s}));
  // "as of" = day of the latest update (followers snapshot / stats read / newest video), like cm.py build's today
  let end=Object.keys(F).sort().pop()||'0';
  for(const v of Object.values(V)){if(v.s_at&&v.s_at.slice(0,10)>end)end=v.s_at.slice(0,10)}
  for(const v of vids)if(v.d>end)end=v.d;
  if(end>today)end=today;
  const fdays=Object.keys(F).filter(d=>d<=end).sort();
  const fcur={};fdays.forEach(d=>Object.assign(fcur,F[d]));
  const gLast=Object.values(G).reduce((m,x)=>Object.keys(x).reduce((a,d)=>d>a?d:a,m),'0');
  const C=chans.map((c,i)=>({...c,col:COLS[i%COLS.length],f:fcur[c.h]??null,stage:(ST.stage||{})[c.h]}));
  D={C,team:C.filter(c=>!c.main),F,fdays,G,gLast,vids,end,alerts:(ST.alerts||[]).slice().sort((a,b)=>(SEV[a.sev]||SEV.info)[0]-(SEV[b.sev]||SEV.info)[0])};
}
function range(p){const e=D.end;let f=e,t=e;
  if(p==='d'){f=t=addD(e,-1)}else if(p==='7')f=addD(e,-6);else if(p==='30')f=addD(e,-29);else if(p==='m')f=e.slice(0,8)+'01';
  const n=Math.round((dt(t)-dt(f))/864e5)+1;return {f,e:t,n,pf:addD(f,-n),pe:addD(f,-1)}}
/* GMV is 1 day late: clip the range to the last GMV day, compare with the same number of days before it */
function gmv(hs,f,e,k=0){let s=0,any=false;for(const h of hs){const g=D.G[h];if(!g)continue;any=true;for(const d in g)if(d>=f&&d<=e)s+=g[d][k]}return any?s:null}
function gmvR(hs,R,k=0){const e=R.e>D.gLast?D.gLast:R.e;if(R.f>e)return {cur:null,prv:null,na:true};
  const n=Math.round((dt(e)-dt(R.f))/864e5)+1;return {cur:gmv(hs,R.f,e,k),prv:gmv(hs,addD(R.f,-n),addD(R.f,-1),k),e}}
const vidsIn=(hs,f,e)=>D.vids.filter(v=>hs.includes(v.h)&&v.d>=f&&v.d<=e);
/* views like detail.html: a channel counts only when ≥2 of its videos in range have numbers */
function views(hs,f,e){let s=0;for(const h of hs){const got=vidsIn([h],f,e).filter(v=>v.s);if(got.length>=2)s+=got.reduce((a,v)=>a+v.s[0],0)}return s}
/* followers change: vs the last snapshot before the period start (fallback: first snapshot) */
function fbase(R){const b=D.fdays.filter(d=>d<R.f).pop()||D.fdays[0];return b}
function fdelta(hs,b){let s=0,n=0;for(const h of hs){const c=D.C.find(x=>x.h===h);const v=(D.F[b]||{})[h];if(v!=null&&c.f!=null){s+=c.f-v;n++}}return n?s:null}

/* ---------- pieces ---------- */
function chart(days,val,fmtTip,color){
  const v=days.map(val);const mx=Math.max(1,...v.map(o=>o.y));const W=320,H=130,bw=W/days.length,L=days.length-1;
  const bars=v.map((o,i)=>`<rect data-i="${i}" x="${i*bw+3}" y="${H-Math.max(2,o.y/mx*H)}" width="${bw-6}" height="${Math.max(2,o.y/mx*H)}" rx="4" fill="${color}" opacity="${i===L?1:.55}"/>`).join('');
  const id='c'+Math.random().toString(36).slice(2,7);
  setTimeout(()=>{const box=document.getElementById(id);if(!box)return;const tip=box.querySelector('.tip');
    const show=i=>{tip.innerHTML=fmtTip(days[i],v[i]);box.querySelectorAll('rect').forEach(r=>r.setAttribute('opacity',+r.dataset.i===i?1:.4))};
    box.querySelectorAll('rect').forEach(r=>{r.onclick=r.onmouseenter=()=>show(+r.dataset.i)});show(L)},0);
  return `<div class="chart" id="${id}"><div class="tip"></div><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${bars}</svg><div class="ax"><span>${fd(days[0])}</span><span>${fd(days[L])}</span></div></div>`}
const last14=e=>{const a=[];for(let i=13;i>=0;i--)a.push(addD(e,-i));return a};
function gmvChart(hs,color){return chart(last14(D.gLast),d=>({y:gmv(hs,d,d)||0,l:gmv(hs,d,d,2)||0}),(d,o)=>`${fd(d)} · GMV <b>${money(o.y)}</b> · live <b>${money(o.l)}</b>`,color)}
function vidChart(hs,color){return chart(last14(D.end),d=>{const L=vidsIn(hs,d,d);return {y:L.length,w:L.reduce((a,v)=>a+(v.s?v.s[0]:0),0)}},(d,o)=>`${fd(d)} · <b>${o.y}</b> video · <b>${kf(o.w)}</b> view`,color)}
function topVids(hs,R,color){const T=vidsIn(hs,R.f,R.e).filter(v=>v.s).sort((a,b)=>b.s[0]-a.s[0]).slice(0,5);
  if(!T.length)return '<div class="list"><div class="empty">Chưa có video có số trong kỳ này</div></div>';
  return `<div class="list">${T.map((v,i)=>`<a class="row" href="https://www.tiktok.com/@${esc(v.h)}/video/${esc(v.id)}" target="_blank" rel="noopener"><div class="ico" style="background:${color||D.C.find(c=>c.h===v.h).col};opacity:${1-i*.12}">${i+1}</div>
  <div class="t"><b>${esc(v.title)}</b><span>${hs.length>1?esc(short(v.h))+' · ':''}${fd(v.d)}${v.tag?' · có giỏ':''}</span></div><div class="r"><b>${kf(v.s[0])}</b><span>view</span></div></a>`).join('')}</div>`}
function alertRows(list,max){if(!list.length)return '<div class="list"><div class="empty">Không có việc cần xử lý</div></div>';
  return `<div class="list">${list.slice(0,max||99).map(a=>{const s=SEV[a.sev]||SEV.info;return `<div class="row" data-al><div class="ico" style="background:${s[1]}">${s[2]}</div>
  <div class="t"><b>${esc(a.short||a.title)}</b><span>${a.ch?esc(short(a.ch)):'Chung'}</span><div class="x">${esc(a.title)}. ${esc(a.detail||'')}</div></div></div>`}).join('')}</div>`}

/* ---------- screens ---------- */
function overview(R){
  const T=D.team.map(c=>c.h);const g=gmvR(T,R);const b=fbase(R);
  const nv=vidsIn(T,R.f,R.e).length,pv=vidsIn(T,R.pf,R.pe).length;
  const fsum=D.team.reduce((a,c)=>a+(c.f||0),0);const hit=D.team.filter(c=>c.f>=KPI).length;
  const list=[...D.team].sort((a,b)=>(b.f||0)-(a.f||0)).concat(D.C.filter(c=>c.main)).map(c=>{const cg=gmvR([c.h],R);
    return `<div class="row" data-go="${esc(c.h)}"><div class="ico" style="background:${c.col}">${ini(c.h)}</div>
    <div class="t"><b>${esc(short(c.h))}</b><span>${nf(c.f)} · ${c.main?'kênh chính':c.f>=KPI?'đạt KPI':Math.round((c.f||0)/KPI*100)+'% KPI'}</span></div>
    <div class="r"><b>${D.G[c.h]?(cg.na?'–':money(cg.cur)):'–'}</b><span>${D.G[c.h]?'GMV':'ngoài MCN'}</span></div></div>`}).join('');
  return `<div class="hero"><div class="lb">GMV · ${D.team.length} kênh team</div>
  <div class="big">${g.na?'–':money(g.cur)} ${g.na?'':pill(chg(g.cur,g.prv))}</div>
  <div class="two"><div><span class="lb">Followers</span><b>${nf(fsum)}</b>${dpill(fdelta(T,b))}</div>
  <div><span class="lb">Video đăng</span><b>${nf(nv)}</b>${pill(chg(nv,pv))}</div></div></div>
  <h2>Kênh <small>${hit}/${D.team.length} đạt KPI 5.000 followers</small></h2><div class="list">${list}</div>
  <h2>GMV 14 ngày <small>chạm cột để xem</small></h2>${gmvChart(T,'var(--tiktok)')}
  <h2>Cần xử lý <small>${D.alerts.length} việc</small></h2>${alertRows(D.alerts,3)}`}
function videoTab(R){
  const T=D.team.map(c=>c.h);const L=vidsIn(T,R.f,R.e),P=vidsIn(T,R.pf,R.pe);const tg=L.filter(v=>v.tag).length;
  return `<div class="hero"><div class="lb">Video đăng · ${D.team.length} kênh team</div>
  <div class="big">${nf(L.length)} ${pill(chg(L.length,P.length))}</div>
  <div class="two"><div><span class="lb">View</span><b>${kf(views(T,R.f,R.e))}</b><span class="lb">video trong kỳ</span></div>
  <div><span class="lb">Có giỏ</span><b>${L.length?Math.round(tg/L.length*100)+'%':'–'}</b><span class="lb">${tg}/${L.length} video</span></div></div></div>
  <h2>14 ngày gần nhất <small>video / ngày</small></h2>${vidChart(T,'var(--tiktok)')}
  <h2>Top video <small>theo view</small></h2>${topVids(T,R)}`}
function alertTab(){const n=k=>D.alerts.filter(a=>a.sev===k).length;
  return `<div class="hero"><div class="lb">Việc cần xử lý</div><div class="big">${D.alerts.length}</div>
  <div class="two"><div><span class="lb">Gấp</span><b>${n('bad')}</b></div><div><span class="lb">Cần làm</span><b>${n('warn')}</b></div></div></div>
  <h2>Danh sách <small>chạm để xem chi tiết</small></h2>${alertRows(D.alerts)}`}
function channel(h,R){
  const c=D.C.find(x=>x.h===h);const g=gmvR([h],R);const b=fbase(R);
  const nv=vidsIn([h],R.f,R.e).length,pv=vidsIn([h],R.pf,R.pe).length;const mcn=!!D.G[h];
  const al=D.alerts.filter(a=>a.ch===h);
  const lb=c.main?'Followers · kênh chính':c.f>=KPI?'Followers · đạt KPI 5.000':`Followers · ${Math.round((c.f||0)/KPI*100)}% KPI 5.000`;
  const split=mcn&&!g.na?`<div class="gmv" style="margin-top:10px"><div><span>GMV live</span><b>${money(gmvR([h],R,2).cur)}</b></div><div><span>GMV video</span><b>${money(gmvR([h],R,1).cur)}</b></div></div>`:'';
  return `<div class="hero"><div class="lb">${lb}</div>
  <div class="big">${nf(c.f)} ${dpill(fdelta([h],b))}</div>
  <div class="two"><div><span class="lb">GMV</span><b>${mcn?(g.na?'–':money(g.cur)):'–'}</b>${mcn&&!g.na?pill(chg(g.cur,g.prv)):'<span class="lb">ngoài MCN</span>'}</div>
  <div><span class="lb">Video đăng</span><b>${nf(nv)}</b>${pill(chg(nv,pv))}</div></div></div>
  ${split}
  ${mcn?`<h2>GMV 14 ngày <small>chạm cột để xem</small></h2>${gmvChart([h],c.col)}`:`<h2>14 ngày gần nhất <small>video / ngày</small></h2>${vidChart([h],c.col)}`}
  ${al.length?`<h2>Cần xử lý <small>${al.length} việc</small></h2>${alertRows(al)}`:''}
  <h2>Top video <small>theo view</small></h2>${topVids([h],R,c.col)}`}

/* ---------- render + routing (hash: #ch=<handle> | #video | #viec) ---------- */
function fromHash(){const h=decodeURIComponent(location.hash.slice(1));
  if(h.startsWith('ch=')&&D.C.some(c=>c.h===h.slice(3))){S.ch=h.slice(3);S.tab='overview'}
  else{S.ch=null;S.tab=h==='video'||h==='viec'?h:'overview'}}
function go(hash){if(location.hash.slice(1)!==hash)location.hash=hash;else{fromHash();render()}window.scrollTo({top:0})}
function render(){
  const R=range(S.p);const lbl={d:'Hôm qua',7:'7 ngày',30:'30 ngày',m:'Tháng này'}[S.p];
  const b=fbase(R);const gl=D.gLast<R.e;
  const title=S.ch?`<button class="bk" data-back aria-label="Quay lại">‹</button>${esc(short(S.ch))}`:'<a href="../" style="color:inherit;text-decoration:none;opacity:.5;margin-right:8px" aria-label="Về trang tổng">←</a>'+(S.tab==='video'?'Video':S.tab==='viec'?'Cần xử lý':'Hannah Team');
  const det=S.ch?`${S.ch}&${PDET[S.p]}`:S.tab==='viec'?'all':`build&${PDET[S.p]}`;
  const body=S.ch?channel(S.ch,R):S.tab==='video'?videoTab(R):S.tab==='viec'?alertTab():overview(R);
  const note=S.tab==='viec'&&!S.ch?`Cập nhật ${fd(D.end)}. Giao việc trên bản dashboard Claude.`
    :`${lbl}${R.n>1?` (${fd(R.f)}–${fd(R.e)})`:''}, so với ${R.n} ngày liền trước. Followers so với ${fd(b)}.${gl?` GMV trễ 1 ngày, có đến ${fd(D.gLast)}.`:''} Cập nhật ${fd(D.end)}.`;
  $('#app').innerHTML=`<header><h1>${title}</h1><div class="d">${S.tab==='viec'&&!S.ch?fd(D.end):R.n===1?fd(R.e):fd(R.f)+' – '+fd(R.e)}</div></header>
  ${S.tab==='viec'&&!S.ch?'':`<div class="seg">${[['d','Hôm qua'],['7','7N'],['30','30N'],['m','Tháng']].map(([k,l])=>`<button data-p="${k}" class="${S.p===k?'on':''}">${l}</button>`).join('')}</div>`}
  ${body}
  <a class="more" href="detail.html#${encodeURIComponent(det).replace(/%26/g,'&')}">Xem bảng chi tiết →</a>
  <div class="note">${note}</div>
  <nav>${[['overview','Tổng quan'],['video','Video'],['viec','Cần xử lý']].map(([k,l])=>`<button data-t="${k}" class="${S.tab===k?'on':''}"><i></i>${l}</button>`).join('')}</nav>`;
  document.querySelectorAll('.seg button').forEach(x=>x.onclick=()=>{S.p=x.dataset.p;render()});
  document.querySelectorAll('nav button').forEach(x=>x.onclick=()=>go(x.dataset.t==='overview'?'':x.dataset.t));
  document.querySelectorAll('[data-go]').forEach(x=>x.onclick=()=>go('ch='+x.dataset.go));
  document.querySelectorAll('[data-al]').forEach(x=>x.onclick=()=>x.classList.toggle('open'));
  const bk=document.querySelector('[data-back]');if(bk)bk.onclick=()=>{if(history.length>1&&S._fromApp)history.back();else go('')};
}
window.addEventListener('hashchange',()=>{fromHash();S._fromApp=true;render()});
load().then(()=>{fromHash();render()}).catch(e=>{$('#app').innerHTML=`<div class="empty">Không tải được dữ liệu (${esc(e.message)})</div>`});
})();
