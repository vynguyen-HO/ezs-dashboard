/* EZS Dashboard — layout demo (not published). One page: overview of 6 modules + one tab per module.
   Each module tab: Tổng quan → Chi tiết, filters: date (global), channel, format (Live / Video).
   Reads the real data files of each dashboard (../media/data, ../pr-mkt/data, ../shopee/data, ../tiktok/data). */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dt=s=>Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10));
const ds=t=>new Date(t).toISOString().slice(0,10);
const addD=(s,n)=>ds(dt(s)+n*864e5);
const fd=s=>s?`${+s.slice(8,10)}/${+s.slice(5,7)}`:'';
const vnDay=ts=>ds(ts*1000+7*3600e3);
function money(v){if(v==null||!isFinite(v))return '–';const a=Math.abs(v);
  if(a>=1e9)return (v/1e9).toFixed(a>=1e10?1:2).replace('.',',')+' tỷ';
  if(a>=1e6)return (a>=1e8?Math.round(v/1e6):(v/1e6).toFixed(1).replace('.',','))+' tr';if(a>=1e3)return Math.round(v/1e3)+'k';return Math.round(v)+'đ'}
const int=v=>v==null||!isFinite(v)?'–':Math.round(v).toLocaleString('vi-VN');
const kf=v=>v==null||!isFinite(v)?'–':v>=1e6?(v/1e6).toFixed(1).replace('.',',')+'M':v>=1e3?Math.round(v/1e3)+'k':Math.round(v)+'';
const xx=v=>v==null||!isFinite(v)?'–':v.toFixed(1).replace('.',',');
const FMT={money,int,x:xx,k:kf};
const chg=(c,p)=>(c==null||p==null||!p)?null:(c-p)/Math.abs(p);
function pill(x,good=1){if(x==null)return '<span class="pill flat">–</span>';const cls=Math.abs(x)<.005||good===0?'flat':((x>0)===(good>0)?'up':'down');
  return `<span class="pill ${cls}">${x>0?'▲':x<0?'▼':''} ${Math.abs(x*100).toFixed(Math.abs(x)<.1?1:0).replace('.',',')}%</span>`}
function parseCSV(t){const L=t.trim().split(/\r?\n/);const h=L[0].split(',');const out=new Array(L.length-1);
  for(let j=1;j<L.length;j++){const l=L[j];let c;if(l.indexOf('"')<0)c=l.split(',');else{c=[];let cur='',q=false;
    for(let i=0;i<l.length;i++){const ch=l[i];if(q){if(ch==='"'){if(l[i+1]==='"'){cur+='"';i++}else q=false}else cur+=ch}else if(ch==='"')q=true;else if(ch===','){c.push(cur);cur=''}else cur+=ch}c.push(cur)}
    const o={};for(let i=0;i<h.length;i++)o[h[i]]=c[i];out[j-1]=o}return out}
const csv=p=>fetch(p).then(r=>{if(!r.ok)throw new Error(p);return r.text()}).then(parseCSV);
const json=p=>fetch(p).then(r=>{if(!r.ok)throw new Error(p);return r.json()});
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
const ANCHOR=addD(today,-1);   // presets end on the last full day

/* ---------- modules ---------- */
const FORMATS=[['all','Tất cả'],['live','Live'],['video','Video']];
const M=[
 {key:'media',title:'Media',team:'Team Media',c:'--media',src:'Meta Ads, TikTok Ads, Shopee Ads',
  async load(){const [camps,daily]=await Promise.all([csv('../media/data/campaigns.csv'),csv('../media/data/campaign_daily.csv')]);
    const C={};camps.forEach(c=>C[c.key]=c);
    return daily.map(r=>{const c=C[r.key]||{};const ch=c.channel||'?';let f='video';
      if(c.type==='gmv_max_live'||ch==='Shopee'||(c.type==='ads'&&ch==='TikTok'&&/lsa|live|realtime|retarget/i.test(c.name||'')))f='live';
      return {d:r.date,ch,f,sp:+r.spend,rv:+r.revenue,od:+r.orders,im:+r.impressions,cl:+r.clicks,camp:c.name||r.key,acc:c.account||''}}).filter(r=>r.sp||r.rv)},
  channels:['Meta','TikTok','Shopee'],formatNote:'Live = LIVE GMV Max, ads live (LSA), Shopee Live; Video = post / video ads, Product GMV Max.',
  sum:['sp','rv','od','im','cl'],
  metrics:[{k:'sp',l:'Ad Spend',f:'money',good:0},{k:'rv',l:'Ad GMV',f:'money'},{k:'roi',l:'ROAS / ROI',f:'x',calc:s=>s.sp?s.rv/s.sp:null},{k:'od',l:'Orders',f:'int'},
    {k:'aov',l:'AOV',f:'money',calc:s=>s.od?s.rv/s.od:null},{k:'ctr',l:'CTR',f:'pct',calc:s=>s.im?s.cl/s.im:null},{k:'cpc',l:'CPC',f:'money',good:-1,calc:s=>s.cl?s.sp/s.cl:null}],
  kpis:['sp','rv','roi','od','aov'],
  single:true,chanColor:{Meta:'--meta',TikTok:'--tt',Shopee:'--shp'},
  chanDesc:{Meta:'Ads Manager · purchases, ROAS',TikTok:'Ads thường + GMV Max (live / product)',Shopee:'Shopee Live Ads'},
  chanKpis:{Meta:['sp','rv','roi','od','aov','ctr','cpc'],TikTok:['sp','rv','roi','od','aov','ctr'],Shopee:['sp','rv','roi','od','aov']},
  chanLabels:{Meta:{rv:'Purchase Value',od:'Purchases',roi:'ROAS'},TikTok:{roi:'ROI'},Shopee:{roi:'ROAS'}},
  chanFormats:{Meta:['video'],TikTok:['live','video'],Shopee:['live']},dims:[['camp','Campaign'],['ch','Channel'],['acc','Ad Account'],['f','Live / Video'],['d','Date']]},
 {key:'prmkt',title:'Pr_MKT',team:'Team Marketing',c:'--prmkt',src:'TikTok creator Hannah Team (GMV MCN, video, view)',
  async load(){const [chans,G,V]=await Promise.all([json('../pr-mkt/data/channels.json'),json('../pr-mkt/data/gmv.json'),json('../pr-mkt/data/videos.json')]);
    const N={};chans.forEach(c=>N[c.h]=c.d||c.h);this.names=N;const rows=[];
    for(const h in G)for(const d in G[h]){const [t,v,l]=G[h][d];if(l)rows.push({d,ch:h,f:'live',g:l});if(v)rows.push({d,ch:h,f:'video',g:v});if(t-v-l>0)rows.push({d,ch:h,f:'other',g:t-v-l})}
    for(const id in V){const v=V[id];if(!v.ts)continue;rows.push({d:vnDay(v.ts),ch:v.h,f:'video',n:1,vw:v.s?v.s[0]:0,vid:v.title||id})}
    this.channels=[...new Set(rows.map(r=>r.ch))].sort((a,b)=>(a==='hannaholala')-(b==='hannaholala')||a.localeCompare(b));return rows},
  channels:[],formatNote:'Số channel = số kênh creator có hoạt động (live hoặc video) trong kỳ. Video đăng và lượt xem thuộc Video.',
  sum:['n','vw'],distinct:{nch:'ch'},
  metrics:[{k:'nch',l:'Active Channels',f:'int'},{k:'n',l:'Videos Posted',f:'int'},{k:'vw',l:'Views',f:'k'},{k:'vpv',l:'Views / Video',f:'k',calc:s=>s.n?s.vw/s.n:null},
    {k:'vpc',l:'Videos / Channel',f:'x',calc:s=>s.nch?s.n/s.nch:null}],
  kpis:['nch','n','vw','vpv'],rank:'vw',dims:[['ch','Channel'],['vid','Video'],['f','Live / Video'],['d','Date']]},
 {key:'shopee',title:'Shopee',team:'Team Shopee',c:'--shopee',src:'Shopee Creator Center theo SKU (HO + Hannah Team)',big:true,
  async load(){const [sku,items,aff]=await Promise.all([csv('../shopee/data/sku_daily.csv'),csv('../shopee/data/items.csv'),csv('../shopee/data/aff_brand_daily.csv')]);
    const I={};items.forEach(r=>I[r.item_id]=r);const rows=[];
    for(const r of sku){const it=I[r.item_id]||{},ch=r.acc==='HT'?'MCN':'HO',b=it.brand||'Chưa xác định',n=(it.title||r.item_id).replace(/^(\s*[\[【][^\]】]*[\]】]\s*)+/,'');
      const lp=+r.lp||0,vp=+r.vp||0,lo=+r.lo||0;
      const lc=+r.lc||0,vc=+r.vc||0;
      if(lp||lo)rows.push({d:r.date,ch,f:'live',g:lc,gp:lp,gL:lc,o:lo,gpl:lp,brand:b,sku:n});
      if(vp||vc)rows.push({d:r.date,ch,f:'video',g:vc,gp:vp,gV:vc,brand:b,sku:n})}
    for(const r of aff){const nm=+r.aff_gmv||0;if(nm)rows.push({d:r.date,ch:r.acc==='HT'?'MCN':'HO',f:'aff',nmv:nm,ao:+r.aff_orders||0,brand:r.brand||'Khác'})}
    return rows},
  channels:['HO','MCN'],formatNote:'GMV Buyer = GMV đã xác nhận (Creator Center, live + video). NMV = GMV đơn Affiliate đã trừ huỷ / không hợp lệ (chỉ hiện khi Live / Video = Tất cả). Tỷ lệ huỷ = 1 − GMV Buyer ÷ GMV đơn đã đặt. AOV live = GMV đặt live ÷ đơn live.',
  sum:['g','gp','gL','gV','nmv','o','gpl'],
  metrics:[{k:'g',l:'GMV Buyer',f:'money'},{k:'nmv',l:'NMV (Affiliate)',f:'money'},{k:'gL',l:'GMV Live',f:'money'},{k:'gV',l:'GMV Video',f:'money'},
    {k:'cancel',l:'Cancellation Rate',f:'pct',good:-1,calc:s=>s.gp?1-s.g/s.gp:null},{k:'gp',l:'GMV Placed (Seller)',f:'money'},{k:'o',l:'Live Orders',f:'int'},{k:'aov',l:'Live AOV',f:'money',calc:s=>s.o?s.gpl/s.o:null}],
  kpis:['g','nmv','gL','gV','cancel'],dims:[['brand','Brand'],['sku','SKU'],['ch','Channel'],['f','Live / Video'],['d','Date']]},
 {key:'tiktok',title:'Tiktok',team:'Team Tiktok',c:'--tiktok',src:'TikTok Shop Partner Center (Olala MCN), LIVE analytics',
  async load(){const ls=await csv('../tiktok/data/live_sessions.csv');
    return ls.map(r=>({d:r.date,ch:r.channel,f:'live',g:+r.gmv,gL:+r.gmv,o:+r.sku_orders,c:+r.customers,v:+r.viewers,n:1,cr:'@'+r.creator,ses:`${r.title} · ${fd(r.date)} · @${r.creator}`}))},
  channels:['HO','MCN'],formats:['live'],formatNote:'GMV = GMV do creator mang lại (đơn đã đặt). Hiện mới có Live (file LIVE analytics); GMV Video cần file xuất Video Analytics, tỷ lệ huỷ cần file đơn hàng / Product Analytics từ Partner Center.',
  sum:['g','gL','o','c','v','n'],
  metrics:[{k:'g',l:'GMV',f:'money'},{k:'gL',l:'GMV Live',f:'money'},{k:'gV',l:'GMV Video',f:'money',calc:()=>null,na:'needs Video Analytics export'},{k:'aov',l:'AOV',f:'money',calc:s=>s.o?s.g/s.o:null},
    {k:'cancel',l:'Cancellation Rate',f:'pct',good:-1,calc:()=>null,na:'not in LIVE export'},{k:'o',l:'SKU Orders',f:'int'},{k:'c',l:'Customers',f:'int'},{k:'n',l:'LIVE Sessions',f:'int'},{k:'v',l:'Viewers',f:'k'}],
  kpis:['g','gL','gV','aov','cancel'],dims:[['cr','Creator'],['ses','LIVE Session'],['ch','Channel'],['d','Date']]},
 {key:'scom',title:'S.com',team:'Team Facebook / Website',c:'--scom',na:'Chưa nối dữ liệu. Dự kiến: GMV, đơn, AOV website hannaholala.com (Haravan) theo ngày, theo kênh (Facebook, organic…), theo brand.'},
 {key:'hostlive',title:'Hostlive',team:'Team Hostlive',c:'--hostlive',na:'Chưa nối dữ liệu. Dự kiến: GMV, đơn, AOV theo host / phiên live, theo kênh (TikTok, Shopee).'},
];
M.forEach(m=>{m.metrics&&m.metrics.forEach(x=>{if(x.f==='pct')x.fmt=v=>v==null||!isFinite(v)?'–':(v*100).toFixed(1).replace('.',',')+'%';else x.fmt=FMT[x.f]})});
const byKey=Object.fromEntries(M.map(m=>[m.key,m]));

/* ---------- state ---------- */
const S={tab:'overview',view:'sum',p:'7',f:null,t:null,ch:{},fmt:{},dim:{},sort:{}};
function preset(p){const e=ANCHOR;if(p==='7')return [addD(e,-6),e];if(p==='30')return [addD(e,-29),e];
  if(p==='mtd')return [e.slice(0,8)+'01',e];if(p==='lm'){const t=addD(e.slice(0,8)+'01',-1);return [t.slice(0,8)+'01',t]}return [S.f,S.t]}
const prevRange=(f,t)=>{const n=Math.round((dt(t)-dt(f))/864e5)+1;return [addD(f,-n),addD(f,-1)]};

/* ---------- engine ---------- */
function pick(m,f,t,extra){const chs=S.ch[m.key],fm=S.fmt[m.key]||'all';
  return m.rows.filter(r=>r.d>=f&&r.d<=t&&(!chs||!chs.size||chs.has(r.ch))&&(fm==='all'||r.f===fm)&&(!extra||extra(r)))}
function total(m,rows){const s={};m.sum.forEach(k=>s[k]=0);for(const r of rows)for(const k of m.sum)if(r[k])s[k]+=r[k];
  if(m.distinct)for(const k in m.distinct)s[k]=new Set(rows.map(r=>r[m.distinct[k]])).size;
  m.metrics.forEach(x=>{if(x.calc)s[x.k]=x.calc(s)});return s}
function group(m,rows,key){const G=new Map();for(const r of rows){const k=r[key];if(k==null)continue;let a=G.get(k);if(!a){a=[];G.set(k,a)}a.push(r)}
  return [...G.entries()].map(([k,a])=>({k,...total(m,a)}))}
const metric=(m,k)=>m.metrics.find(x=>x.k===k);
const selCh=m=>{const s=S.ch[m.key];return m.single&&s&&s.size===1?[...s][0]:null};
const kpisOf=m=>{const c=selCh(m);return c&&m.chanKpis?m.chanKpis[c]:m.kpis};
const L=(m,x)=>{const c=selCh(m);return (c&&m.chanLabels&&m.chanLabels[c]&&m.chanLabels[c][x.k])||x.l};
const formatsOf=m=>{const c=selCh(m);return c&&m.chanFormats?m.chanFormats[c]:m.formats};
const lastDate=m=>m.rows.reduce((a,r)=>r.d>a?r.d:a,'');

/* ---------- pieces ---------- */
function spark(vals,color){const W=300,H=42,mx=Math.max(1,...vals);const n=vals.length;if(n<2)return '';
  const pts=vals.map((v,i)=>`${(i/(n-1)*W).toFixed(1)},${(H-3-(v/mx)*(H-6)).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="var(${color})" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`}
function days(f,t){const a=[];for(let d=f;d<=t;d=addD(d,1))a.push(d);return a}
function barChart(m,f,t,k){const x=metric(m,k),D=days(f,t).slice(-62);const byD={};for(const r of pick(m,D[0],t))(byD[r.d]=byD[r.d]||[]).push(r);
  const vals=D.map(d=>byD[d]?total(m,byD[d]):null);const mx=Math.max(1,...vals.map(v=>v?v[k]||0:0));const W=600,H=170,bw=W/D.length;
  const bars=vals.map((v,i)=>{const y=v?v[k]||0:0,h=Math.max(2,y/mx*H);return `<rect data-i="${i}" x="${i*bw+bw*.12}" y="${H-h}" width="${bw*.76}" height="${h}" rx="3" fill="${v?`var(${m.c})`:'var(--line)'}" opacity=".75"/>`}).join('');
  const id='c'+Math.random().toString(36).slice(2,7);
  setTimeout(()=>{const box=document.getElementById(id);if(!box)return;const tip=box.querySelector('.tip');
    const show=i=>{const v=vals[i];tip.innerHTML=`${fd(D[i])} · ${v?kpisOf(m).slice(0,5).filter(q=>!metric(m,q).na).map(q=>{const mm=metric(m,q);return `${L(m,mm)} <b>${mm.fmt(v[q])}</b>`}).join(' · '):'no data'}`;
      box.querySelectorAll('rect').forEach(r=>r.setAttribute('opacity',+r.dataset.i===i?1:.45))};
    box.querySelectorAll('rect').forEach(r=>{r.onmouseenter=r.onclick=()=>show(+r.dataset.i)});show(D.length-1)},0);
  return `<div class="chart" id="${id}"><div class="tip"></div><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${bars}</svg><div class="ax"><span>${fd(D[0])}</span><span>${fd(D[D.length-1])}</span></div></div>`}
function hbars(m,rows,dim,k,n=6,label){const x=metric(m,k);const g=group(m,rows,dim).filter(o=>o[k]).sort((a,b)=>b[k]-a[k]).slice(0,n);const mx=Math.max(1,...g.map(o=>o[k]));
  if(!g.length)return '<div class="empty">Không có số</div>';
  return `<div class="hb">${g.map(o=>`<div class="r"><span title="${esc(label?label(o.k):o.k)}">${esc(label?label(o.k):o.k)}</span><i style="width:${Math.max(2,o[k]/mx*100)}%"></i><b>${x.fmt(o[k])}</b></div>`).join('')}</div>`}
function table(m,id,rows,dim){const cols=selCh(m)?kpisOf(m).map(k=>metric(m,k)):m.metrics;const st=S.sort[id]||{k:dim==='d'?'_k':cols[0].k,asc:false};
  const lab=dimLabel(m,dim);const g=group(m,rows,dim).map(o=>({...o,_k:o.k,_n:lab(o.k)}));
  g.sort((a,b)=>{const x=a[st.k],y=b[st.k];const c=typeof x==='string'?String(x).localeCompare(String(y),'vi'):(x??-Infinity)-(y??-Infinity);return st.asc?c:-c});
  const T=total(m,rows);const name=(m.dims.find(d=>d[0]===dim)||[0,''])[1];
  return `<div class="tbl"><table><thead><tr><th data-t="${id}" data-k="_k" class="l ${st.k==='_k'?'on'+(st.asc?' asc':''):''}">${esc(name)} (${g.length})</th>${cols.map(c=>`<th data-t="${id}" data-k="${c.k}" class="${st.k===c.k?'on'+(st.asc?' asc':''):''}">${L(m,c)}</th>`).join('')}</tr></thead>
  <tbody><tr class="tot"><td>Total</td>${cols.map(c=>`<td>${c.fmt(T[c.k])}</td>`).join('')}</tr>
  ${g.slice(0,300).map(o=>`<tr><td class="name" title="${esc(o._n)}">${esc(o._n)}</td>${cols.map(c=>`<td>${c.fmt(o[c.k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  ${g.length>300?`<div class="note">Hiện 300 / ${g.length} dòng đầu theo cột đang sắp xếp.</div>`:''}`}
function dimLabel(m,dim){if(dim==='d')return fd;if(dim==='f')return v=>({live:'Live',video:'Video',other:'Other',aff:'Affiliate'})[v]||v;
  if(dim==='ch'&&m.key==='prmkt')return v=>m.names&&m.names[v]?m.names[v]:v;return v=>v}

/* ---------- screens ---------- */
function card(m){
  if(m.na)return `<a class="mod na" href="#${m.key}" style="--c:var(${m.c})"><div class="hd"><b>${m.title}</b><span>${m.team}</span></div>
    <div class="soon">${esc(m.na)}</div><div class="go">Xem layout →</div></a>`;
  if(!m.rows)return `<a class="mod" href="#${m.key}" style="--c:var(${m.c})"><div class="hd"><b>${m.title}</b><span>${m.team}</span></div><div class="soon">${m.err?'Không tải được dữ liệu':'Đang tải…'}</div></a>`;
  const [f,t]=[S.f,S.t],[pf,pt]=prevRange(f,t);const cur=total(m,pick(m,f,t)),prv=total(m,pick(m,pf,pt));
  const main=metric(m,m.kpis[0]);const D=days(f,t);const byD={};for(const r of pick(m,f,t))(byD[r.d]=byD[r.d]||[]).push(r);
  return `<a class="mod" href="#${m.key}" style="--c:var(${m.c})"><div class="hd"><b>${m.title}</b><span>số tới ${fd(lastDate(m))}</span></div>
  <div><div class="lb">${main.l}</div><div class="big">${main.fmt(cur[main.k])} ${pill(chg(cur[main.k],prv[main.k]),main.good??1)}</div></div>
  ${spark(D.map(d=>byD[d]?total(m,byD[d])[main.k]||0:0),m.c)}
  <div class="kv">${m.kpis.slice(1).concat(m.metrics.filter(x=>!m.kpis.includes(x.k)).map(x=>x.k)).slice(0,4).map(k=>{const x=metric(m,k);return `<div><span>${x.l}</span><b>${x.fmt(cur[k])}</b></div>`}).join('')}</div>
  <div class="go">Tổng quan → chi tiết</div></a>`}

function overview(){
  return `<h2>Tổng quan EZS <small>${fd(S.f)} – ${fd(S.t)} · so với cùng số ngày liền trước</small></h2>
  <div class="grid">${M.map(card).join('')}</div>
  <div class="note">Demo layout, chưa publish. Mỗi khối là một module; bấm vào để xem tổng quan rồi chi tiết của module đó. Shopee, Tiktok, S.com không hiện plan.</div>`}

function module(m){
  const head=`<div class="crumb"><a href="#overview">Tổng quan EZS</a> / ${m.title}</div>
  <div class="title" style="--c:var(${m.c})"><span class="dot"></span><h1>${m.title}</h1><span class="mut">${esc(m.team)} · ${esc(m.src||'')}</span></div>`;
  if(m.na)return head+`<div class="card" style="margin-top:14px"><div class="empty">${esc(m.na)}</div></div>`+filterBar(m,true)+`<div class="note">Bố cục sẽ giống các module khác: tổng quan (chỉ số chính, xu hướng, cơ cấu) → chi tiết (bảng theo chiều chọn).</div>`;
  if(!m.rows)return head+`<div class="loading">${m.err?'Không tải được dữ liệu: '+esc(m.err):'Đang tải dữ liệu'+(m.big?' (file lớn, vài giây)':'')+'…'}</div>`;
  const [f,t]=[S.f,S.t],[pf,pt]=prevRange(f,t);const rows=pick(m,f,t),cur=total(m,rows),prv=total(m,pick(m,pf,pt));
  const sub=`<div class="seg" style="margin-top:12px"><button data-view="sum" class="${S.view==='sum'?'on':''}">Tổng quan</button><button data-view="detail" class="${S.view==='detail'?'on':''}">Chi tiết</button></div>`;
  let body;
  if(S.view==='sum'){
    const K=kpisOf(m),one=selCh(m),bd=one?'acc':'ch',lab=dimLabel(m,bd),rk=m.rank||K[0];
    body=`<div class="kpis">${K.map((k,i)=>{const x=metric(m,k);return `<div class="kpi ${i?'':'main'}" style="--c:var(${one?m.chanColor[one]:m.c})"><div class="lb">${L(m,x)}</div><div class="v">${x.fmt(cur[k])}</div>${x.na?`<span class="pill flat">${x.na}</span>`:pill(chg(cur[k],prv[k]),x.good??1)}</div>`}).join('')}</div>
    <div class="two" style="margin-top:12px">
      <div class="card"><h3>${L(m,metric(m,K[0]))} by Day <small>tap a bar</small></h3>${barChart(m,f,t,K[0])}</div>
      <div class="card" style="--c:var(${m.c})"><h3>${one?'By Ad Account':'By Channel'} <small>${L(m,metric(m,rk))}</small></h3>${hbars(m,rows,bd,rk,6,lab)}
        ${(formatsOf(m)&&formatsOf(m).length<2)?'':`<h3 style="margin-top:16px">Live / Video</h3>${hbars(m,rows,'f',rk,4,dimLabel(m,'f'))}`}</div>
    </div>
    <h2>Top 10 ${esc(m.dims[0][1])} <small>${L(m,metric(m,rk))}</small></h2>
    <div class="card" style="--c:var(${m.c})">${hbars(m,rows,m.dims[0][0],rk,10,dimLabel(m,m.dims[0][0]))}</div>
    <div class="more"><a href="#${m.key}:detail">Xem bảng chi tiết →</a></div>`}
  else{const dim=S.dim[m.key]||m.dims[0][0];
    body=`<div class="fbar" style="--c:var(${m.c});margin-top:12px"><span class="lbl">Xem theo</span><span class="chips">${m.dims.map(([k,l])=>`<button data-dim="${k}" class="${dim===k?'on':''}">${l}</button>`).join('')}</span></div>
    ${table(m,m.key+'-'+dim,rows,dim)}`}
  return `<div style="--c:var(${m.c})">`+head+filterBar(m)+sub+`<div style="margin-top:12px">${body}</div><div class="note">${esc(m.formatNote||'')} So với ${fd(pf)} – ${fd(pt)}.</div></div>`}

function filterBar(m,disabled){const chs=S.ch[m.key]||new Set(),fm=S.fmt[m.key]||'all';const lab=m.na?(v=>v):dimLabel(m,'ch');
  const chList=m.na?['TikTok','Shopee','Facebook']:(m.channels||[]);const fo=formatsOf(m);const fmts=FORMATS.filter(([k])=>k==='all'||!fo||fo.includes(k));
  if(m.single&&!disabled){const one=selCh(m),rows=m.rows?pick(m,S.f,S.t):[];
    const val=c=>{const r=m.rows?m.rows.filter(x=>x.d>=S.f&&x.d<=S.t&&(c==='*'||x.ch===c)):[];return money(r.reduce((a,x)=>a+(x.sp||0),0))};
    return `<div class="chtabs"><button data-ch="*" class="${!one?'on':''}" style="--k:var(${m.c})"><b>Tất cả kênh</b><span>Ad spend ${val('*')} · chỉ số chung</span></button>
    ${chList.map(c=>`<button data-ch="${esc(c)}" class="${one===c?'on':''}" style="--k:var(${m.chanColor[c]})"><b>${esc(c)}</b><span>Ad spend ${val(c)} · ${esc(m.chanDesc[c]||'')}</span></button>`).join('')}</div>
    <div class="fbar" style="--c:var(${one?m.chanColor[one]:m.c})"><span><span class="lbl">Live / Video</span><span class="chips">${FORMATS.map(([k,l])=>`<button data-fmt="${k}" class="${fm===k?'on':''}" ${!fmts.find(x=>x[0]===k)?'disabled':''}>${l}</button>`).join('')}</span></span></div>`}
  return `<div class="fbar" style="--c:var(${m.c})"><span><span class="lbl">Kênh</span><span class="chips"><button data-ch="*" class="${!chs.size?'on':''}" ${disabled?'disabled':''}>Tất cả</button>${chList.map(c=>`<button data-ch="${esc(c)}" class="${chs.has(c)?'on':''}" ${disabled?'disabled':''}>${esc(lab(c))}</button>`).join('')}</span></span>
  <span><span class="lbl">Live / Video</span><span class="chips">${FORMATS.map(([k,l])=>`<button data-fmt="${k}" class="${fm===k?'on':''}" ${disabled||!fmts.find(x=>x[0]===k)?'disabled':''}>${l}</button>`).join('')}</span></span></div>`}

/* ---------- render ---------- */
function render(){
  const tabs=[['overview','Tổng quan','--ink'],...M.map(m=>[m.key,m.title,m.c])];
  $('#tabs').innerHTML=tabs.map(([k,l,c])=>`<a href="#${k}" class="${S.tab===k?'on':''}" style="--c:var(${c})">${k==='overview'?'':'<i></i>'}${l}</a>`).join('');
  $('#presets').innerHTML=[['7','7 ngày'],['30','30 ngày'],['mtd','Tháng này'],['lm','Tháng trước']].map(([k,l])=>`<button data-p="${k}" class="${S.p===k?'on':''}">${l}</button>`).join('');
  $('#from').value=S.f;$('#to').value=S.t;const [pf,pt]=prevRange(S.f,S.t);$('#cmp').textContent=`so với ${fd(pf)} – ${fd(pt)}`;
  const m=byKey[S.tab];
  if(m&&!m.na&&!m.rows&&!m.loading)loadModule(m);
  $('#main').innerHTML=S.tab==='overview'?overview():module(m);
  document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{S.p=b.dataset.p;[S.f,S.t]=preset(S.p);render()});
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{location.hash=S.tab+(b.dataset.view==='detail'?':detail':'')});
  document.querySelectorAll('[data-dim]').forEach(b=>b.onclick=()=>{S.dim[S.tab]=b.dataset.dim;render()});
  document.querySelectorAll('[data-fmt]').forEach(b=>b.onclick=()=>{S.fmt[S.tab]=b.dataset.fmt;render()});
  document.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{const c=b.dataset.ch;let s=S.ch[S.tab]||new Set();
    const mm=byKey[S.tab];if(c==='*')s=new Set();else if(mm&&mm.single)s=new Set([c]);else{s=new Set(s);s.has(c)?s.delete(c):s.add(c)}S.ch[S.tab]=s;
    if(mm){const fo=formatsOf(mm);if(fo&&S.fmt[S.tab]&&S.fmt[S.tab]!=='all'&&!fo.includes(S.fmt[S.tab]))S.fmt[S.tab]='all'}render()});
  document.querySelectorAll('th[data-k]').forEach(h=>h.onclick=()=>{const id=h.dataset.t,k=h.dataset.k,c=S.sort[id];S.sort[id]={k,asc:c&&c.k===k?!c.asc:false};render()});
}
function loadModule(m){m.loading=true;m.load().then(r=>{m.rows=r}).catch(e=>{m.err=String(e.message||e)}).finally(()=>{m.loading=false;render()})}
function route(){const [tab,view]=location.hash.slice(1).split(':');S.tab=byKey[tab]?tab:'overview';S.view=view==='detail'?'detail':'sum';render();window.scrollTo({top:0})}
['from','to'].forEach(id=>$('#'+id).onchange=()=>{S.p='';S.f=$('#from').value;S.t=$('#to').value;if(S.f>S.t)[S.f,S.t]=[S.t,S.f];render()});
const root=document.documentElement;$('#theme').onclick=()=>{const dark=root.dataset.theme?root.dataset.theme==='dark':matchMedia('(prefers-color-scheme:dark)').matches;root.dataset.theme=dark?'light':'dark'};
[S.f,S.t]=preset(S.p);
window.addEventListener('hashchange',route);route();
// overview needs every module: load the light ones now, Shopee (big files) after
M.filter(m=>!m.na&&!m.big).forEach(loadModule);setTimeout(()=>M.filter(m=>m.big).forEach(m=>{if(!m.rows&&!m.loading)loadModule(m)}),400);
})();
