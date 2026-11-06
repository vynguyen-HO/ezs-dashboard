/* EZS Dashboard — home page, phone-app style. Overview of the modules + one screen per module (bottom tab bar).
   Each module tab: Tổng quan → Chi tiết, filters: date (global), channel, format (Live / Video).
   Reads the real data files of each dashboard (media/data, pr-mkt/data, shopee/data, tiktok/data). */
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
  async load(){const [camps,daily]=await Promise.all([csv('media/data/campaigns.csv'),csv('media/data/campaign_daily.csv')]);
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
  async load(){const [chans,G,V]=await Promise.all([json('pr-mkt/data/channels.json'),json('pr-mkt/data/gmv.json'),json('pr-mkt/data/videos.json')]);
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
  async load(){const [sku,items,aff]=await Promise.all([csv('shopee/data/sku_daily.csv'),csv('shopee/data/items.csv'),csv('shopee/data/aff_brand_daily.csv')]);
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
  async load(){const ls=await csv('tiktok/data/live_sessions.csv');
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
const days=(f,t)=>{const a=[];for(let d=f;d<=t;d=addD(d,1))a.push(d);return a};
const accent=m=>{const c=selCh(m);return c&&m.chanColor?m.chanColor[c]:m.c};

/* ---------- pieces (phone app style) ---------- */
function spark(vals,color){const W=300,H=40,mx=Math.max(1,...vals);const n=vals.length;if(n<2)return '';
  const pts=vals.map((v,i)=>`${(i/(n-1)*W).toFixed(1)},${(H-3-(v/mx)*(H-6)).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="var(${color})" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`}
function barChart(m,f,t,k){const D=days(f,t).slice(-31);const byD={};for(const r of pick(m,D[0],t))(byD[r.d]=byD[r.d]||[]).push(r);
  const vals=D.map(d=>byD[d]?total(m,byD[d]):null);const mx=Math.max(1,...vals.map(v=>v?v[k]||0:0));const W=320,H=130,bw=W/D.length;
  const bars=vals.map((v,i)=>{const y=v?v[k]||0:0,h=Math.max(2,y/mx*H);return `<rect data-i="${i}" x="${i*bw+bw*.14}" y="${H-h}" width="${bw*.72}" height="${h}" rx="3" fill="${v?`var(${accent(m)})`:'var(--line)'}" opacity=".7"/>`}).join('');
  const id='c'+Math.random().toString(36).slice(2,7);
  setTimeout(()=>{const box=document.getElementById(id);if(!box)return;const tip=box.querySelector('.tip');
    const show=i=>{const v=vals[i];tip.innerHTML=`${fd(D[i])} · ${v?kpisOf(m).slice(0,3).filter(q=>!metric(m,q).na).map(q=>{const mm=metric(m,q);return `${L(m,mm)} <b>${mm.fmt(v[q])}</b>`}).join(' · '):'no data'}`;
      box.querySelectorAll('rect').forEach(r=>r.setAttribute('opacity',+r.dataset.i===i?1:.4))};
    box.querySelectorAll('rect').forEach(r=>{r.onmouseenter=r.onclick=()=>show(+r.dataset.i)});show(D.length-1)},0);
  return `<div class="chart" id="${id}"><div class="tip"></div><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${bars}</svg><div class="ax"><span>${fd(D[0])}</span><span>${fd(D[D.length-1])}</span></div></div>`}
function rankList(m,rows,dim,k,n,label,prvRows){const x=metric(m,k);const g=group(m,rows,dim).filter(o=>o[k]).sort((a,b)=>b[k]-a[k]).slice(0,n);
  if(!g.length)return '<div class="list"><div class="empty">Không có số trong kỳ này</div></div>';
  const P=prvRows?Object.fromEntries(group(m,prvRows,dim).map(o=>[o.k,o[k]])):{};const mx=Math.max(1,...g.map(o=>o[k]));
  return `<div class="list">${g.map((o,i)=>{const name=label?label(o.k):o.k;const sub=kpisOf(m).filter(q=>q!==k&&!metric(m,q).na).slice(0,2).map(q=>{const mm=metric(m,q);return `${L(m,mm)} ${mm.fmt(o[q])}`}).join(' · ');
    return `<div class="row"><div class="ico" style="--c:var(${accent(m)})">${i+1}</div><div class="t"><b title="${esc(name)}">${esc(name)}</b><span>${sub}</span><i class="bar" style="width:${Math.max(3,o[k]/mx*100)}%"></i></div>
    <div class="r"><b>${x.fmt(o[k])}</b>${prvRows?pill(chg(o[k],P[o.k]),x.good??1):''}</div></div>`}).join('')}</div>`}
function table(m,id,rows,dim){const cols=selCh(m)?kpisOf(m).map(k=>metric(m,k)):m.metrics;const st=S.sort[id]||{k:dim==='d'?'_k':cols[0].k,asc:false};
  const lab=dimLabel(m,dim);const g=group(m,rows,dim).map(o=>({...o,_k:o.k,_n:lab(o.k)}));
  g.sort((a,b)=>{const x=a[st.k],y=b[st.k];const c=typeof x==='string'?String(x).localeCompare(String(y),'vi'):(x??-Infinity)-(y??-Infinity);return st.asc?c:-c});
  const T=total(m,rows);const name=(m.dims.find(d=>d[0]===dim)||[0,''])[1];
  return `<div class="tbl"><table><thead><tr><th data-t="${id}" data-k="_k" class="l ${st.k==='_k'?'on'+(st.asc?' asc':''):''}">${esc(name)} (${g.length})</th>${cols.map(c=>`<th data-t="${id}" data-k="${c.k}" class="${st.k===c.k?'on'+(st.asc?' asc':''):''}">${L(m,c)}</th>`).join('')}</tr></thead>
  <tbody><tr class="tot"><td>Total</td>${cols.map(c=>`<td>${c.fmt(T[c.k])}</td>`).join('')}</tr>
  ${g.slice(0,200).map(o=>`<tr><td class="name" title="${esc(o._n)}">${esc(o._n)}</td>${cols.map(c=>`<td>${c.fmt(o[c.k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  ${g.length>200?`<div class="note">Hiện 200 / ${g.length} dòng đầu theo cột đang sắp xếp. Vuốt ngang để xem hết cột.</div>`:'<div class="note">Vuốt ngang để xem hết cột · chạm tiêu đề cột để sắp xếp.</div>'}`}
function dimLabel(m,dim){if(dim==='d')return fd;if(dim==='f')return v=>({live:'Live',video:'Video',other:'Other',aff:'Affiliate'})[v]||v;
  if(dim==='ch'&&m.key==='prmkt')return v=>m.names&&m.names[v]?m.names[v]:v;return v=>v}

/* ---------- screens ---------- */
function card(m){
  if(m.na)return `<a class="mcard na" href="#${m.key}" style="--c:var(${m.c})"><div class="hd"><b>${m.title}</b><span>sắp có</span></div><div class="soon">${esc(m.na)}</div></a>`;
  if(!m.rows)return `<a class="mcard" href="#${m.key}" style="--c:var(${m.c})"><div class="hd"><b>${m.title}</b><span>${m.err?'lỗi':'đang tải…'}</span></div></a>`;
  const [f,t]=[S.f,S.t],[pf,pt]=prevRange(f,t);const cur=total(m,pick(m,f,t)),prv=total(m,pick(m,pf,pt));
  const main=metric(m,m.kpis[0]);const D=days(f,t);const byD={};for(const r of pick(m,f,t))(byD[r.d]=byD[r.d]||[]).push(r);
  return `<a class="mcard" href="#${m.key}" style="--c:var(${m.c})"><div class="hd"><b>${m.title}</b><span>số tới ${fd(lastDate(m))}</span></div>
  <div class="lb">${main.l}</div><div class="big">${main.fmt(cur[main.k])} ${pill(chg(cur[main.k],prv[main.k]),main.good??1)}</div>
  ${spark(D.map(d=>byD[d]?total(m,byD[d])[main.k]||0:0),m.c)}
  <div class="kv">${m.kpis.slice(1).concat(m.metrics.filter(x=>!m.kpis.includes(x.k)).map(x=>x.k)).slice(0,4).map(k=>{const x=metric(m,k);return `<div><span>${x.l}</span><b>${x.fmt(cur[k])}</b></div>`}).join('')}</div></a>`}

function overview(){return `<div class="mods">${M.filter(m=>!m.na).map(card).join('')}</div>
  <h2>Sắp có</h2><div class="mods">${M.filter(m=>m.na).map(card).join('')}</div>`}

function more(){return `<h2>Module khác</h2><div class="list">${M.filter(m=>m.na).map(m=>`<a class="row" href="#${m.key}"><div class="ico" style="--c:var(${m.c})">${m.title[0]}</div><div class="t"><b>${m.title}</b><span>${esc(m.team)} · sắp có</span></div><div class="r"><span>›</span></div></a>`).join('')}</div>
  <h2>Dashboard từng team <small>giao diện riêng, bảng đầy đủ</small></h2><div class="list">
  ${[['media','Media','--media'],['pr-mkt','Pr_MKT','--prmkt'],['shopee','Shopee','--shopee'],['tiktok','Tiktok','--tiktok']].map(([p,n,c])=>`<a class="row" href="${p}/"><div class="ico" style="--c:var(${c})">${n[0]}</div><div class="t"><b>${n}</b><span>${p}/</span></div><div class="r"><span>›</span></div></a>`).join('')}</div>`}

function channelPicker(m){const chs=S.ch[m.key]||new Set();const lab=dimLabel(m,'ch');
  if(m.single){const one=selCh(m);const val=c=>{const r=m.rows?m.rows.filter(x=>x.d>=S.f&&x.d<=S.t&&(c==='*'||x.ch===c)):[];return money(r.reduce((a,x)=>a+(x.sp||0),0))};
    return `<div class="scroll chs"><button data-ch="*" class="${!one?'on':''}" style="--k:var(${m.c})"><b>Tất cả</b><span>${val('*')}</span></button>
    ${m.channels.map(c=>`<button data-ch="${esc(c)}" class="${one===c?'on':''}" style="--k:var(${m.chanColor[c]})"><b>${esc(c)}</b><span>${val(c)}</span></button>`).join('')}</div>`}
  return `<div class="scroll chips"><button data-ch="*" class="${!chs.size?'on':''}">Tất cả</button>${(m.channels||[]).map(c=>`<button data-ch="${esc(c)}" class="${chs.has(c)?'on':''}">${esc(lab(c))}</button>`).join('')}</div>`}
function formatSeg(m){const fm=S.fmt[m.key]||'all',fo=formatsOf(m);
  return `<div class="seg sm">${FORMATS.map(([k,l])=>{const ok=k==='all'||!fo||fo.includes(k);return `<button data-fmt="${k}" class="${fm===k?'on':''}" ${ok?'':'disabled'}>${l}</button>`}).join('')}</div>`}

function module(m){
  const top=`<div class="banner" style="--c:var(${m.c})"><span>${esc(m.team)}</span><b>${esc(m.src||'')}</b></div>`;
  if(m.na)return top+`<div class="list" style="margin-top:14px"><div class="empty">${esc(m.na)}</div></div><div class="note">Bố cục sẽ giống các module khác: tổng quan → chi tiết, lọc ngày / kênh / Live-Video.</div>`;
  if(!m.rows)return top+`<div class="empty" style="padding:60px 18px">${m.err?'Không tải được dữ liệu: '+esc(m.err):'Đang tải dữ liệu'+(m.big?' (file lớn, vài giây)':'')+'…'}</div>`;
  const [f,t]=[S.f,S.t],[pf,pt]=prevRange(f,t);const rows=pick(m,f,t),prows=pick(m,pf,pt),cur=total(m,rows),prv=total(m,prows);
  const K=kpisOf(m),one=selCh(m),bd=one?'acc':'ch',rk=m.rank||K[0],a=accent(m);
  const filters=channelPicker(m)+formatSeg(m)+`<div class="seg sm"><button data-view="sum" class="${S.view==='sum'?'on':''}">Tổng quan</button><button data-view="detail" class="${S.view==='detail'?'on':''}">Chi tiết</button></div>`;
  let body;
  if(S.view==='sum'){const x0=metric(m,K[0]);
    body=`<div class="hero" style="--c:var(${a})"><div class="lb">${L(m,x0)}${one?' · '+one:''}</div><div class="big">${x0.fmt(cur[K[0]])} ${pill(chg(cur[K[0]],prv[K[0]]),x0.good??1)}</div></div>
    <div class="tiles" style="--c:var(${a})">${K.slice(1).map(k=>{const x=metric(m,k);return `<div><span>${L(m,x)}</span><b>${x.fmt(cur[k])}</b>${x.na?`<em>${x.na}</em>`:pill(chg(cur[k],prv[k]),x.good??1)}</div>`}).join('')}</div>
    <h2>${L(m,x0)} by Day <small>chạm cột để xem</small></h2>${barChart(m,f,t,K[0])}
    <h2>${one?'By Ad Account':'By Channel'} <small>${L(m,metric(m,rk))}</small></h2>${rankList(m,rows,bd,rk,6,dimLabel(m,bd),prows)}
    ${(formatsOf(m)&&formatsOf(m).length<2)?'':`<h2>Live / Video</h2>${rankList(m,rows,'f',rk,4,dimLabel(m,'f'),prows)}`}
    <h2>Top 10 ${esc(m.dims[0][1])} <small>${L(m,metric(m,rk))}</small></h2>${rankList(m,rows,m.dims[0][0],rk,10,dimLabel(m,m.dims[0][0]),prows)}`}
  else{const dim=S.dim[m.key]||m.dims[0][0];
    body=`<div class="scroll chips" style="margin-top:4px"><span class="lbl">Xem theo</span>${m.dims.map(([k,l])=>`<button data-dim="${k}" class="${dim===k?'on':''}">${l}</button>`).join('')}</div>${table(m,m.key+'-'+dim,rows,dim)}`}
  return `<div style="--c:var(${a})">`+top+filters+body+`<div class="note">${esc(m.formatNote||'')} So với ${fd(pf)} – ${fd(pt)}.</div></div>`}

/* ---------- render ---------- */
const NAV=[['overview','Tổng quan','--ink'],['media','Media','--media'],['prmkt','Pr_MKT','--prmkt'],['shopee','Shopee','--shopee'],['tiktok','Tiktok','--tiktok'],['more','Thêm','--ink2']];
function render(){
  const m=byKey[S.tab];if(m&&!m.na&&!m.rows&&!m.loading)loadModule(m);
  const title=S.tab==='overview'?'EZS Dashboard':S.tab==='more'?'Thêm':m.title;
  const navOn=byKey[S.tab]&&byKey[S.tab].na?'more':S.tab;
  const back=S.tab==='overview'?'':`<a class="bk" href="#overview" aria-label="Về tổng quan">‹</a>`;
  $('#app').innerHTML=`<header style="--c:var(${m?m.c:'--ink'})"><h1>${back}${title}</h1><div class="d">${fd(S.f)} – ${fd(S.t)}</div></header>
  <div class="seg">${[['7','7N'],['30','30N'],['mtd','Tháng'],['lm','T.trước'],['c','📅']].map(([k,l])=>`<button data-p="${k}" class="${S.p===k||(k==='c'&&S.p==='')?'on':''}">${l}</button>`).join('')}</div>
  ${S.p===''||S.showDates?`<div class="dates"><label>Từ <input type="date" id="from" value="${S.f}"></label><label>Đến <input type="date" id="to" value="${S.t}"></label></div>`:''}
  ${S.tab==='overview'?overview():S.tab==='more'?more():module(m)}
  ${S.tab==='overview'?`<div class="note">So với ${fd(prevRange(S.f,S.t)[0])} – ${fd(prevRange(S.f,S.t)[1])}. Bấm vào một module để xem tổng quan → chi tiết. Số lấy thẳng từ dữ liệu từng dashboard.</div>`:''}
  <nav>${NAV.map(([k,l,c])=>`<a href="#${k}" class="${navOn===k?'on':''}" style="--c:var(${c})"><i></i>${l}</a>`).join('')}</nav>`;
  document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{if(b.dataset.p==='c'){S.showDates=!S.showDates;render();return}S.showDates=false;S.p=b.dataset.p;[S.f,S.t]=preset(S.p);render()});
  ['from','to'].forEach(id=>{const e=document.getElementById(id);if(e)e.onchange=()=>{S.p='';S.f=$('#from').value;S.t=$('#to').value;if(S.f>S.t)[S.f,S.t]=[S.t,S.f];render()}});
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{location.hash=S.tab+(b.dataset.view==='detail'?':detail':'')});
  document.querySelectorAll('[data-dim]').forEach(b=>b.onclick=()=>{S.dim[S.tab]=b.dataset.dim;render()});
  document.querySelectorAll('[data-fmt]').forEach(b=>b.onclick=()=>{S.fmt[S.tab]=b.dataset.fmt;render()});
  document.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{const c=b.dataset.ch;let s=S.ch[S.tab]||new Set();
    const mm=byKey[S.tab];if(c==='*')s=new Set();else if(mm&&mm.single)s=new Set([c]);else{s=new Set(s);s.has(c)?s.delete(c):s.add(c)}S.ch[S.tab]=s;
    if(mm){const fo=formatsOf(mm);if(fo&&S.fmt[S.tab]&&S.fmt[S.tab]!=='all'&&!fo.includes(S.fmt[S.tab]))S.fmt[S.tab]='all'}render()});
  document.querySelectorAll('th[data-k]').forEach(h=>h.onclick=()=>{const id=h.dataset.t,k=h.dataset.k,c=S.sort[id];S.sort[id]={k,asc:c&&c.k===k?!c.asc:false};render()});
}
function loadModule(m){m.loading=true;m.load().then(r=>{m.rows=r}).catch(e=>{m.err=String(e.message||e)}).finally(()=>{m.loading=false;render()})}
function route(){const [tab,view]=location.hash.slice(1).split(':');S.tab=byKey[tab]||tab==='more'?tab:'overview';S.view=view==='detail'?'detail':'sum';render();window.scrollTo({top:0})}
[S.f,S.t]=preset(S.p);
window.addEventListener('hashchange',route);route();
M.filter(m=>!m.na&&!m.big).forEach(loadModule);setTimeout(()=>M.filter(m=>m.big).forEach(m=>{if(!m.rows&&!m.loading)loadModule(m)}),400);
})();
