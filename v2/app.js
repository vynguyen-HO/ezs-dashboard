/* EZS Dashboard v2 — desktop layout: sidebar + topbar time filter + KPI cards + Chart.js charts + sortable tables.
   Reads the same data files as the other pages (../shopee/data, ../tiktok/data, ../media/data, ../pr-mkt/data). */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dt=s=>Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10));
const ds=t=>new Date(t).toISOString().slice(0,10);
const addD=(s,n)=>ds(dt(s)+n*864e5);
const fd=s=>s?`${String(+s.slice(8,10)).padStart(2,'0')}/${s.slice(5,7)}`:'';
const vnDay=ts=>ds(ts*1000+7*3600e3);
function money(v){if(v==null||!isFinite(v))return '–';const a=Math.abs(v);
  if(a>=1e9)return (v/1e9).toFixed(a>=1e11?0:a>=1e10?1:2).replace('.',',')+' tỷ';
  if(a>=1e6)return (a>=1e8?Math.round(v/1e6):(v/1e6).toFixed(1).replace('.',','))+' tr';if(a>=1e3)return Math.round(v/1e3)+'k';return Math.round(v)+'đ'}
const int=v=>v==null||!isFinite(v)?'–':Math.round(v).toLocaleString('vi-VN');
const kf=v=>{if(v==null||!isFinite(v))return '–';const a=Math.abs(v),g=v<0?'-':'';return a>=1e6?g+(a/1e6).toFixed(1).replace('.',',')+'M':a>=1e4?g+Math.round(a/1e3)+'k':a>=1e3?g+(a/1e3).toFixed(1).replace('.',',')+'k':g+Math.round(a)};
const pct=v=>v==null||!isFinite(v)?'–':(v*100).toFixed(1).replace('.',',')+'%';
const xx=v=>v==null||!isFinite(v)?'–':v.toFixed(2).replace('.',',');
const chg=(c,p)=>(c==null||p==null||!p)?null:(c-p)/Math.abs(p);
const div=(a,b)=>b?a/b:null;
function parseCSV(t){const L=t.replace(/^﻿/,'').trim().split(/\r?\n/);const h=L[0].split(',');const out=new Array(L.length-1);
  for(let j=1;j<L.length;j++){const l=L[j];let c;if(l.indexOf('"')<0)c=l.split(',');else{c=[];let cur='',q=false;
    for(let i=0;i<l.length;i++){const ch=l[i];if(q){if(ch==='"'){if(l[i+1]==='"'){cur+='"';i++}else q=false}else cur+=ch}else if(ch==='"')q=true;else if(ch===','){c.push(cur);cur=''}else cur+=ch}c.push(cur)}
    const o={};for(let i=0;i<h.length;i++)o[h[i]]=c[i];out[j-1]=o}return out}
const V='?v='+Date.now().toString(36);
const csv=p=>fetch('../'+p+V).then(r=>{if(!r.ok)throw new Error(p);return r.text()}).then(parseCSV);
const json=p=>fetch('../'+p+V).then(r=>{if(!r.ok)throw new Error(p);return r.json()});
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
const YD=addD(today,-1);
const cleanTitle=s=>String(s||'').replace(/^(\s*[\[【][^\]】]*[\]】]\s*)+/,'');
const bkey=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const bk=s=>bkey(s).replace(/^the(?=.{3})/,'')||String(s||'');
/* channel logos (inline SVG) */
const ICON={
  shopee:'<svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="5" fill="#ee4d2d"/><path d="M8.6 8.2V7.6a3.4 3.4 0 0 1 6.8 0v.6" fill="none" stroke="#fff" stroke-width="1.5"/><path d="M5.3 8.2h13.4l-.9 11a1.4 1.4 0 0 1-1.4 1.3H7.6a1.4 1.4 0 0 1-1.4-1.3z" fill="#fff"/><text x="12" y="18.2" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="9" font-weight="700" fill="#ee4d2d">S</text></svg>',
  tiktok:'<svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="5" fill="#000"/><g transform="translate(4.2 3.6) scale(.68)"><path fill="#25f4ee" transform="translate(-.9 -.7)" d="M16.6 5.8a4.8 4.8 0 0 1-3.8-4.3V1h-3.4v13.7a2.9 2.9 0 1 1-2-2.8V8.4a6.3 6.3 0 1 0 5.4 6.3V7.8a8.2 8.2 0 0 0 4.8 1.5V5.9z"/><path fill="#fe2c55" transform="translate(.9 .7)" d="M16.6 5.8a4.8 4.8 0 0 1-3.8-4.3V1h-3.4v13.7a2.9 2.9 0 1 1-2-2.8V8.4a6.3 6.3 0 1 0 5.4 6.3V7.8a8.2 8.2 0 0 0 4.8 1.5V5.9z"/><path fill="#fff" d="M16.6 5.8a4.8 4.8 0 0 1-3.8-4.3V1h-3.4v13.7a2.9 2.9 0 1 1-2-2.8V8.4a6.3 6.3 0 1 0 5.4 6.3V7.8a8.2 8.2 0 0 0 4.8 1.5V5.9z"/></g></svg>',
  web:'<svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1877f2"/><path fill="#fff" d="M13.4 24v-8.6h2.9l.4-3.4h-3.3V9.9c0-1 .3-1.6 1.7-1.6h1.8v-3a24 24 0 0 0-2.6-.1c-2.6 0-4.3 1.6-4.3 4.4V12H7.1v3.4H10V24z"/></svg>'};


/* ---------- data ---------- */
const D={},ST={};
const LOAD={
  sh:async()=>{const [sku,items,aff]=await Promise.all([csv('shopee/data/sku_daily.csv'),csv('shopee/data/items.csv'),csv('shopee/data/aff_brand_daily.csv')]);
    const I={};items.forEach(r=>I[r.item_id]=r);const rows=[];let mx='';
    for(const r of sku){const gl=+r.lc||0,gv=+r.vc||0,o=+r.lo||0;if(!gl&&!gv&&!o)continue;const it=I[r.item_id]||{};
      const b=it.brand||'Chưa xác định';rows.push({d:r.date,ch:r.acc==='HT'?'MCN':'HO',gl,gv,o,lp:+r.lp||0,b,k:bk(b),id:r.item_id});if(r.date>mx)mx=r.date}
    const affR=aff.map(r=>({d:r.date,ch:r.acc==='HT'?'MCN':'HO',b:r.brand||'Khác',k:bk(r.brand||'Khác'),nmv:+r.aff_gmv||0,pl:r.aff_gmv_placed===''||r.aff_gmv_placed==null?null:+r.aff_gmv_placed,o:+r.aff_orders||0}));
    return {rows,aff:affR,items:I,max:mx}},
  shPlan:()=>csv('shopee/data/shp_mtd.csv'),
  tt:async()=>{const [ls,vd]=await Promise.all([csv('tiktok/data/live_sessions.csv'),csv('tiktok/data/video_daily.csv').catch(()=>[])]);
    const live=ls.map(r=>({d:r.date,ch:r.channel,cr:r.creator,ti:r.title,g:+r.gmv||0,o:+r.sku_orders||0,c:+r.customers||0,v:+r.viewers||0,du:+r.duration_min||0}));
    const video=vd.map(r=>({d:r.date,ch:r.channel,cr:r.creator,g:+r.gmv||0}));
    return {live,video,max:[...live,...video].reduce((a,r)=>r.d>a?r.d:a,'')}},
  ttPlan:()=>csv('tiktok/data/tt_mtd.csv'),
  web:async()=>{const [dl,sk,it]=await Promise.all([csv('website/data/web_daily.csv'),csv('website/data/web_sku_daily.csv'),csv('website/data/web_items.csv').catch(()=>[])]);
    const rows=dl.map(r=>({d:r.date,ch:r.channel,o:+r.orders||0,q:+r.qty||0,g:+r.gmv||0,co:+r.cancel_orders||0,cg:+r.cancel_gmv||0}));
    const sku=sk.map(r=>{const b=r.brand||'Chưa xác định';return {d:r.date,ch:r.channel,id:r.sku,b,k:bk(b),camp:r.camp||'–',o:+r.orders||0,q:+r.qty||0,g:+r.gmv||0,co:+r.cancel_orders||0,cg:+r.cancel_gmv||0}});
    const items={};it.forEach(r=>items[r.sku]=r.name);
    return {rows,sku,items,min:rows.reduce((a,r)=>!a||r.d<a?r.d:a,''),max:rows.reduce((a,r)=>r.d>a?r.d:a,'')}},
  ttp:async()=>{const [pd,pr]=await Promise.all([csv('tiktok/data/product_daily.csv'),csv('tiktok/data/products.csv')]);
    const P={};pr.forEach(r=>P[r.product_id]=r);
    return {rows:pd.map(r=>({d:r.date,ch:r.channel,cr:r.creator,id:r.product_id,g:+r.gmv||0,gl:+r.live_direct_gmv||0,gv:+r.video_direct_gmv||0,o:+r.orders||0,b:(P[r.product_id]||{}).brand||'Chưa xác định'})).map(r=>(r.k=bk(r.b),r)),P,
      min:pd.reduce((a,r)=>!a||r.date<a?r.date:a,''),max:pd.reduce((a,r)=>r.date>a?r.date:a,'')}},
  md:async()=>{const [camps,daily]=await Promise.all([csv('media/data/campaigns.csv'),csv('media/data/campaign_daily.csv')]);
    const C={};camps.forEach(c=>C[c.key]=c);let mx='';
    const rows=daily.map(r=>{const c=C[r.key]||{};const ch=c.channel||'?';let f='video';
      if(c.type==='gmv_max_live'||ch==='Shopee'||(c.type==='ads'&&ch==='TikTok'&&/lsa|live|realtime|retarget/i.test(c.name||'')))f='live';
      if(+r.spend&&r.date>mx)mx=r.date;
      return {d:r.date,ch,f,sp:+r.spend||0,rv:+r.revenue||0,od:+r.orders||0,im:+r.impressions||0,cl:+r.clicks||0,camp:c.name||r.key,acc:c.account||''}}).filter(r=>r.sp||r.rv);
    return {rows,max:mx}},
  pr:async()=>{const [C,Vd,F,S2]=await Promise.all([json('pr-mkt/data/channels.json'),json('pr-mkt/data/videos.json'),json('pr-mkt/data/followers.json'),json('pr-mkt/data/status.json')]);
    const names={};C.forEach(c=>names[c.h]=c.d||c.h);const vids=[];
    for(const id in Vd){const v=Vd[id];if(!v.ts)continue;vids.push({d:vnDay(v.ts),ch:v.h,vw:v.s?v.s[0]||0:0,tag:v.tag?1:0,ti:v.title||id})}
    const fdays=Object.keys(F).sort();return {C,names,vids,F,ST:S2,fdays,max:fdays[fdays.length-1]}},
};
function load(k){if(ST[k])return;ST[k]='loading';LOAD[k]().then(r=>{D[k]=r;ST[k]='ok'}).catch(e=>{ST[k]='err';console.error(k,e)}).finally(render)}
const ready=(...k)=>k.every(x=>ST[x]==='ok');
const waitBox=(...k)=>`<div class="loading">${k.some(x=>ST[x]==='err')?'Không tải được dữ liệu ('+k.filter(x=>ST[x]==='err').join(', ')+')':'Đang tải dữ liệu…'}</div>`;

/* ---------- state ---------- */
const S={view:'overview',p:'mtd',f:null,t:null,showDates:false,
  shAcc:'all',shFmt:'all',ttAcc:'all',ttFmt:'all',mdCh:'all',brPf:'all',brAcc:'all',pdPf:'all',pdQ:'',wbCh:'web',brand:'',sort:{}};
function preset(p){const e=YD;if(p==='d')return [e,e];if(p==='7')return [addD(e,-6),e];if(p==='30')return [addD(e,-29),e];
  if(p==='mtd')return [e.slice(0,8)+'01',e];if(p==='lm'){const t=addD(e.slice(0,8)+'01',-1);return [t.slice(0,8)+'01',t]}return [S.f,S.t]}
const prevRange=(f,t)=>{const n=Math.round((dt(t)-dt(f))/864e5)+1;return [addD(f,-n),addD(f,-1)]};
const days=(f,t)=>{const a=[];for(let d=f;d<=t;d=addD(d,1))a.push(d);return a};
const chartDays=(f,t)=>{const n=days(f,t);return n.length>=7?n:days(addD(t,-13),t)};
const inR=(r,f,t)=>r.d>=f&&r.d<=t;
const accOk=(r,a)=>a==='all'||r.ch===a;
const brOk=r=>!S.brand||r.k===S.brand;

/* ---------- aggregates ---------- */
function shTot(f,t,acc='all',fmt='all',brand=S.brand){const s={gl:0,gv:0,o:0,lp:0,nmv:0,apl:0,anm:0,ao:0};if(!D.sh)return s;
  for(const r of D.sh.rows)if(inR(r,f,t)&&accOk(r,acc)&&(!brand||r.k===brand)){s.gl+=r.gl;s.gv+=r.gv;s.o+=r.o;s.lp+=r.lp}
  for(const r of D.sh.aff)if(inR(r,f,t)&&accOk(r,acc)&&(!brand||r.k===brand)){s.nmv+=r.nmv;s.ao+=r.o;if(r.pl!=null){s.apl+=r.pl;s.anm+=r.nmv}}
  s.g=fmt==='live'?s.gl:fmt==='video'?s.gv:s.gl+s.gv;s.cancel=s.apl?1-s.anm/s.apl:null;s.aov=div(s.lp,s.o);return s}
function ttTot(f,t,acc='all',fmt='all'){const s={gl:0,gv:0,o:0,c:0,v:0,n:0,du:0};
  if(S.brand){if(!D.ttp)return (s.g=0,s);let g=0;for(const r of D.ttp.rows)if(inR(r,f,t)&&accOk(r,acc)&&r.k===S.brand){g+=r.g;s.gl+=r.gl;s.gv+=r.gv;s.o+=r.o}
    s.g=fmt==='live'?s.gl:fmt==='video'?s.gv:g;s.n=null;s.aov=div(g,s.o);s.br=1;return s}
  if(!D.tt)return s;
  if(fmt!=='video')for(const r of D.tt.live)if(inR(r,f,t)&&accOk(r,acc)){s.gl+=r.g;s.o+=r.o;s.c+=r.c;s.v+=r.v;s.n++;s.du+=r.du}
  if(fmt!=='live')for(const r of D.tt.video)if(inR(r,f,t)&&accOk(r,acc))s.gv+=r.g;
  s.g=s.gl+s.gv;s.aov=div(s.gl,s.o);s.gph=div(s.gl,s.du/60);return s}
function mdTot(f,t,ch='all'){const s={sp:0,rv:0,od:0,im:0,cl:0};if(!D.md)return s;
  for(const r of D.md.rows)if(inR(r,f,t)&&(ch==='all'||r.ch===ch)){s.sp+=r.sp;s.rv+=r.rv;s.od+=r.od;s.im+=r.im;s.cl+=r.cl}
  s.roas=div(s.rv,s.sp);s.ctr=div(s.cl,s.im);s.cpc=div(s.sp,s.cl);s.aov=div(s.rv,s.od);return s}
function webTot(f,t,ch='web'){const s={g:0,o:0,q:0,co:0,cg:0};if(!D.web)return s;for(const r of (S.brand?D.web.sku.filter(brOk):D.web.rows))if(inR(r,f,t)&&(ch==='all'||r.ch===ch)){s.g+=r.g;s.o+=r.o;s.q+=r.q;s.co+=r.co;s.cg+=r.cg}
  s.aov=div(s.g,s.o);s.cancel=div(s.co,s.o+s.co);return s}
function series(rows,f,t,val,filt){const m={};for(const r of rows)if(inR(r,f,t)&&(!filt||filt(r)))m[r.d]=(m[r.d]||0)+val(r);return m}
function groupSum(rows,key,fields,filt){const G=new Map();for(const r of rows){if(filt&&!filt(r))continue;const k=typeof key==='function'?key(r):r[key];let a=G.get(k);
  if(!a){a={k};fields.forEach(x=>a[x]=0);G.set(k,a)}fields.forEach(x=>a[x]+=r[x]||0)}return [...G.values()]}

/* brands across Shopee (Creator GMV) + TikTok (product GMV) */
function brandTable(f,t,pf,acc,web=false){const M=new Map();
  const add=(name,field,v)=>{if(!v)return;const k=bk(name);let o=M.get(k);if(!o){o={k,names:{},sh:0,tt:0,shl:0,shv:0,ttl:0,ttv:0,wb:0};M.set(k,o)}o[field]+=v;o.names[name]=(o.names[name]||0)+v};
  if(pf!=='tt'&&D.sh)for(const r of D.sh.rows)if(inR(r,f,t)&&accOk(r,acc)){add(r.b,'sh',r.gl+r.gv);add(r.b,'shl',r.gl);add(r.b,'shv',r.gv)}
  if(pf!=='sh'&&D.ttp)for(const r of D.ttp.rows)if(inR(r,f,t)&&accOk(r,acc)){add(r.b,'tt',r.g);add(r.b,'ttl',r.gl);add(r.b,'ttv',r.gv)}
  if(web&&D.web)for(const r of D.web.sku)if(r.ch==='web'&&inR(r,f,t))add(r.b,'wb',r.g);
  return [...M.values()].map(o=>({...o,name:Object.entries(o.names).sort((a,b)=>b[1]-a[1])[0][0],g:o.sh+o.tt+(web?o.wb:0)}))}

/* products across platforms (brand filter applied) */
function prodList(f,t,pf='all'){const R=[];
  if((pf==='all'||pf==='sh')&&D.sh)groupSum(D.sh.rows.filter(r=>inR(r,f,t)&&brOk(r)).map(r=>({id:r.id,g:r.gl+r.gv,gl:r.gl,gv:r.gv,o:r.o})),'id',['g','gl','gv','o']).forEach(o=>{if(!o.g)return;const it=D.sh.items[o.k]||{};R.push({...o,pf:'Shopee',name:cleanTitle(it.title||o.k),brand:it.brand||'–'})});
  if((pf==='all'||pf==='tt')&&D.ttp)groupSum(D.ttp.rows.filter(r=>inR(r,f,t)&&brOk(r)),'id',['g','gl','gv','o']).forEach(o=>{if(!o.g)return;const p=D.ttp.P[o.k]||{};R.push({...o,pf:'TikTok',name:cleanTitle(p.name||o.k),brand:p.brand||'–'})});
  if((pf==='all'||pf==='wb')&&D.web)groupSum(D.web.sku.filter(r=>r.ch==='web'&&inR(r,f,t)&&brOk(r)),'id',['g','o']).forEach(o=>{if(!o.g)return;const b=(D.web.sku.find(r=>r.id===o.k)||{}).b;R.push({...o,gl:null,gv:null,pf:'Website',name:D.web.items[o.k]||o.k,brand:b||'–'})});
  return R}
/* brand list for the global filter: all loaded sources, by GMV */
let BR=null,BRsig='';
function brandOpts(){const sig=['sh','ttp','web'].map(k=>ST[k]).join();if(BR&&sig===BRsig)return BR;BRsig=sig;const M=new Map();
  const add=(k,n,v)=>{let o=M.get(k);if(!o){o={k,n:{},g:0};M.set(k,o)}o.g+=v;o.n[n]=(o.n[n]||0)+v+1};
  if(D.sh)D.sh.rows.forEach(r=>add(r.k,r.b,r.gl+r.gv));if(D.ttp)D.ttp.rows.forEach(r=>add(r.k,r.b,r.g));if(D.web)D.web.sku.forEach(r=>add(r.k,r.b,r.g));
  M.delete(bk('Chưa xác định'));M.delete(bk('Khác'));
  BR=[...M.values()].sort((a,b)=>b.g-a.g).map(o=>[o.k,Object.entries(o.n).sort((a,b)=>b[1]-a[1])[0][0]]);return BR}
const brandName=k=>(brandOpts().find(x=>x[0]===k)||[k,k])[1];

/* ---------- UI pieces ---------- */
function delta(x,good=1){if(x==null)return '<div class="kpi-delta flat">– so với kỳ trước</div>';const cls=Math.abs(x)<.005?'flat':((x>0)===(good>0)?'pos':'neg');
  return `<div class="kpi-delta ${cls}">${x>0?'▲':x<0?'▼':''} ${Math.abs(x*100).toFixed(1).replace('.',',')}% <span style="color:var(--text-3);font-weight:400">vs kỳ trước</span></div>`}
const kpi=(label,val,cls,d,sub)=>`<div class="kpi-card ${cls||''}"><div class="kpi-label">${label}</div><div class="kpi-value">${val}</div>${d??''}${sub?`<div class="kpi-sub">${sub}</div>`:''}</div>`;
const sub=(l,v,s)=>`<div class="sub-kpi"><span class="sub-kpi-label">${l}</span><span class="sub-kpi-val">${v}${s?` <small>${s}</small>`:''}</span></div>`;
const secHead=(t,p,cls='pill-fresh')=>`<div class="sec-head"><h2>${t}</h2>${p?`<span class="pill ${cls}">${p}</span>`:''}</div>`;
const fresh=max=>max?(max>=S.t?['Số tới '+fd(max),'pill-fresh']:['Số tới '+fd(max)+' · chưa có ngày sau','pill-cached']):['',''];
const rank=i=>`<span class="rank ${i<3?'rank-'+(i+1):'rank-n'}">${i+1}</span>`;
const sel=(id,label,val,opts)=>`<div class="fg"><label>${label}</label><select data-s="${id}">${opts.map(([k,l])=>`<option value="${k}" ${val===k?'selected':''}>${l}</option>`).join('')}</select></div>`;
const chTag=c=>c==='HO'?'<span class="tag tag-ho">HO</span>':c==='MCN'?'<span class="tag tag-mcn">MCN</span>':esc(c);
const ACC=[['all','Tất cả (HO + MCN)'],['HO','HO (Hannah Olala)'],['MCN','MCN (Hannah Team)']];
const FMT=[['all','Live + Video'],['live','Live'],['video','Video']];

/* sortable table: cols [{k,l,f(v,row),r:true}] */
function table(id,title,note,cols,rows,{limit=50,def,total}={}){const st=S.sort[id]||def||{k:cols[1]?cols[1].k:cols[0].k,asc:false};
  const R=[...rows].sort((a,b)=>{const x=a[st.k],y=b[st.k];const c=typeof x==='string'||typeof y==='string'?String(x??'').localeCompare(String(y??''),'vi'):(x??-Infinity)-(y??-Infinity);return st.asc?c:-c});
  return `<div class="table-wrap"><h3><span>${title}</span><small>${note||''}${R.length>limit?` · top ${limit}/${R.length}`:''}</small></h3><div class="tscroll"><table><thead><tr><th style="width:36px;cursor:default">#</th>${cols.map(c=>`<th data-t="${id}" data-k="${c.k}" class="${c.r?'r ':''}${st.k===c.k?'on'+(st.asc?' asc':''):''}">${c.l}</th>`).join('')}</tr></thead><tbody>
  ${total?`<tr class="tr-total"><td></td>${cols.map((c,i)=>`<td class="${c.r?'r':''}">${i===0?'Tổng':total[c.k]!=null?(c.f?c.f(total[c.k],total):total[c.k]):''}</td>`).join('')}</tr>`:''}
  ${R.slice(0,limit).map((o,i)=>`<tr><td>${rank(i)}</td>${cols.map((c,j)=>`<td class="${c.r?'r':''}${j===0?' name':''}" ${j===0?`title="${esc(o[c.k])}"`:''}>${c.f?c.f(o[c.k],o):esc(o[c.k])}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${cols.length+1}" style="text-align:center;color:var(--text-3);padding:24px">Không có số trong kỳ này</td></tr>`}
  </tbody></table></div></div>`}
const shareCell=(v,o,tot)=>{const s=div(v,tot);return `<span class="share">${pct(s)}<i style="width:${Math.max(2,(s||0)*80)}px"></i></span>`};

/* ---------- charts ---------- */
const CH=[];const queue=[];
const chartCard=(id,title,subtitle,tall)=>`<div class="chart-card"><h3>${title}</h3><p class="sub">${subtitle||''}</p><div class="chart-box ${tall?'tall':''}"><canvas id="${id}"></canvas></div></div>`;
const plot=(id,cfg)=>queue.push([id,cfg]);
const C={shopee:'#ee4d2d',shopee2:'#f8a48f',tiktok:'#161823',tiktok2:'#8a8d99',web:'#4285f4',web2:'#a8c7fa',gold:'#f9ab00',green:'#34a853',pink:'#e94235',purple:'#8e44ad'};
const PAL=['#ee4d2d','#161823','#4285f4','#f9ab00','#34a853','#8e44ad','#e94235','#00897b','#5f6368','#c2185b','#7cb342','#9aa0a6'];
const moneyAxis={ticks:{callback:v=>money(v)},grid:{color:'#f1f3f4'},beginAtZero:true};
function barCfg(labels,datasets,{stacked=true,horizontal=false,line}={}){const ax=horizontal?'y':'x';
  return {type:'bar',data:{labels,datasets},options:{indexAxis:ax,maintainAspectRatio:false,responsive:true,interaction:{mode:'index',intersect:false},
    plugins:{legend:{position:'bottom',labels:{boxWidth:10,boxHeight:10,font:{size:11}}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.dataset.yAxisID==='y1'?xx(c.raw):money(c.raw)}`}}},
    scales:{[ax]:{stacked,grid:{display:false},ticks:{font:{size:10},autoSkip:true,maxRotation:0}},[horizontal?'x':'y']:{...moneyAxis,stacked},...(line?{y1:{position:'right',grid:{display:false},beginAtZero:true,ticks:{callback:v=>xx(v)}}}:{})}}}}
function donutCfg(labels,data,colors){return {type:'doughnut',data:{labels,datasets:[{data,backgroundColor:colors||PAL,borderWidth:2,borderColor:'#fff'}]},
  options:{maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'right',labels:{boxWidth:10,font:{size:11}}},tooltip:{callbacks:{label:c=>{const t=c.dataset.data.reduce((a,b)=>a+b,0);return `${c.label}: ${money(c.raw)} (${pct(c.raw/t)})`}}}}}}}
function flushCharts(){CH.splice(0).forEach(c=>c.destroy());if(!window.Chart){queue.length=0;return}
  Chart.defaults.font.family="-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif";Chart.defaults.color='#5f6368';
  for(const [id,cfg] of queue.splice(0)){const el=document.getElementById(id);if(el)CH.push(new Chart(el,cfg))}}

/* ---------- views ---------- */
const modHead=(t,cls,go,note)=>`<div class="module-head"><span class="mod-dot ${cls}"></span><h2>${t}</h2>${note?`<span class="mod-note">${note}</span>`:''}${go?`<a class="mod-link" href="#${go}">Xem chi tiết ›</a>`:''}</div>`;
function chCard(o){return `<div class="ch-card ${o.cls}" ${o.go?`data-go="${o.go}"`:''}><div class="ch-top"><b>${o.icon} ${o.name}</b>${o.max?`<span class="pill ${o.max>=S.t?'pill-fresh':'pill-cached'}">số tới ${fd(o.max)}</span>`:''}</div>
  ${o.na?`<div class="ch-na">${o.na}</div>`:`<div class="ch-gmv">${o.val}</div>${o.delta}
  <div class="ch-share"><i style="width:${Math.min(100,(o.share||0)*100)}%"></i></div><div class="kpi-sub">${pct(o.share)} GMV tổng</div>
  <div class="ch-body">${o.lines.join('')}</div>`}</div>`}
function vOverview(){const [f,t]=[S.f,S.t],[pf,pt]=prevRange(f,t);let h='';
  const sh=shTot(f,t),shp=shTot(pf,pt),tt=ttTot(f,t),ttp=ttTot(pf,pt),md=mdTot(f,t),mdp=mdTot(pf,pt);
  const wb=webTot(f,t),wbp=webTot(pf,pt),hasWeb=ready('web');
  const tot=sh.g+tt.g+wb.g,mkt=sh.g+tt.g,wbCov=hasWeb&&pf>=D.web.min,totp=shp.g+ttp.g+(wbCov?wbp.g:0),totD=wbCov?chg(tot,totp):chg(mkt,shp.g+ttp.g);
  let plan=null;if(S.p==='mtd'&&!S.brand&&ready('shPlan','ttPlan')){const pl=D.shPlan.reduce((a,r)=>a+(+r.plan||0),0)+D.ttPlan.reduce((a,r)=>a+(+r.plan||0),0);plan=pl?{pl,ach:mkt/pl}:null}
  const per=`${fd(f)}${f!==t?' – '+fd(t):''}`;

  /* ===== COMMERCIAL ===== */
  h+=`<section class="module">${modHead('Commercial','pink','',`GMV · ${per}${S.brand?' · brand '+esc(brandName(S.brand)):''}`)}`;
  if(S.brand)h+=`<div class="warnbox">Đang lọc brand <b>${esc(brandName(S.brand))}</b>: Shopee = GMV Buyer theo SKU, TikTok = GMV sản phẩm (có từ ${D.ttp?fd(D.ttp.min):'–'}), Website = GMV sản phẩm. Không có % Plan khi lọc brand.</div>`;
  if(!ready('sh','tt'))h+=waitBox('sh','tt');
  else{const mix=[['Shopee Live',sh.gl,C.shopee],['Shopee Video',sh.gv,C.shopee2],['TikTok Live',tt.gl,C.tiktok],['TikTok Video',tt.gv,C.tiktok2],['Website',wb.g,C.web]];
    h+=`<div class="hero-gmv"><div><div class="hero-label">GMV tổng</div><div class="hero-value">${money(tot)}</div>${delta(totD)}${hasWeb&&!wbCov?`<div class="kpi-sub">So sánh kỳ trước chỉ tính Shopee + TikTok (website có số từ ${fd(D.web.min)})</div>`:''}
      <div class="mix">${mix.map(([l,v,c])=>`<i title="${l}: ${money(v)}" style="flex:${v||0};background:${c}"></i>`).join('')}</div>
      <div class="mix-leg">${mix.map(([l,v,c])=>`<span><i style="background:${c}"></i>${l} <b>${pct(div(v,tot))}</b></span>`).join('')}</div></div>
      <div class="hero-side">${plan?`<div class="kpi-label">% Plan tháng ${+YD.slice(5,7)} (Shopee + TikTok)</div><div class="hero-plan">${pct(plan.ach)}</div><div class="bar-plan"><i style="width:${Math.min(100,plan.ach*100)}%"></i></div><div class="kpi-sub">Plan ${money(plan.pl)} · còn ${money(Math.max(0,plan.pl-mkt))}</div>`
        :`<div class="kpi-label">Kỳ trước</div><div class="hero-plan">${money(totp)}</div><div class="kpi-sub">${fd(pf)} – ${fd(pt)}</div>`}</div></div>`;
    h+=`<div class="ch-row">${[
      chCard({cls:'shopee',icon:ICON.shopee,name:'Shopee',go:'shopee',max:D.sh.max,val:money(sh.g),delta:delta(chg(sh.g,shp.g)),share:div(sh.g,tot),
        lines:[sub('Live',money(sh.gl)),sub('Video',money(sh.gv)),sub('HO / MCN',`${money(shTot(f,t,'HO').g)} / ${money(shTot(f,t,'MCN').g)}`),sub('Affiliate NMV',money(sh.nmv),'huỷ '+pct(sh.cancel))]}),
      chCard({cls:'tiktok',icon:ICON.tiktok,name:'TikTok',go:'tiktok',max:D.tt.max,val:money(tt.g),delta:delta(chg(tt.g,ttp.g)),share:div(tt.g,tot),
        lines:[sub('Live',money(tt.gl)),sub('Video',money(tt.gv)),sub('HO / MCN',`${money(ttTot(f,t,'HO').g)} / ${money(ttTot(f,t,'MCN').g)}`),(tt.br?sub('Đơn',int(tt.o),'AOV '+money(tt.aov)):sub('Phiên live',int(tt.n),'AOV '+money(tt.aov)))]}),
      hasWeb?chCard({cls:'web',icon:ICON.web,name:'Hannaholala.com',go:'web',max:D.web.max,val:money(wb.g),delta:wbCov?delta(chg(wb.g,wbp.g)):`<div class="kpi-delta flat">Có số từ ${fd(D.web.min)}</div>`,share:div(wb.g,tot),
        lines:[sub('Đơn',int(wb.o),'AOV '+money(wb.aov)),sub('Sản phẩm',int(wb.q)),sub('Huỷ',int(wb.co)+' đơn',pct(wb.cancel)),sub('Harasocial / Livestream',`${money(webTot(f,t,'harasocial').g)} / ${money(webTot(f,t,'livestream').g)}`,'ngoài GMV tổng')]})
        :chCard({cls:'web',icon:ICON.web,name:'Hannaholala.com',na:ST.web==='err'?'Không tải được dữ liệu website.':'Đang tải…'})].join('')}</div>`;
    const X=chartDays(f,t);const a=series(D.sh.rows,X[0],X[X.length-1],r=>r.gl+r.gv,brOk),b=S.brand?(D.ttp?series(D.ttp.rows,X[0],X[X.length-1],r=>r.g,brOk):{}):series([...D.tt.live,...D.tt.video],X[0],X[X.length-1],r=>r.g),w=hasWeb?(S.brand?series(D.web.sku,X[0],X[X.length-1],r=>r.g,r=>r.ch==='web'&&brOk(r)):series(D.web.rows,X[0],X[X.length-1],r=>r.g,r=>r.ch==='web')):{};
    h+=`<div class="chart-grid">${chartCard('ov-daily','GMV theo ngày',`Shopee + TikTok + Website · ${fd(X[0])} – ${fd(X[X.length-1])}`,true)}${ready('ttp')?S.brand?chartCard('ov-brand','Top 10 sản phẩm',`${esc(brandName(S.brand))} · Shopee + TikTok + Website`,true):chartCard('ov-brand','Top 10 Brand',`Shopee + TikTok + Website${D.ttp.min>f?' · TikTok brand có từ '+fd(D.ttp.min):''}`,true):waitBox('ttp')}</div>`;
    plot('ov-daily',barCfg(X.map(fd),[{label:'Shopee',data:X.map(d=>a[d]||0),backgroundColor:C.shopee,borderRadius:3},{label:'TikTok',data:X.map(d=>b[d]||0),backgroundColor:C.tiktok,borderRadius:3},{label:'Website',data:X.map(d=>w[d]||0),backgroundColor:C.web,borderRadius:3}]));
    if(ready('ttp')&&S.brand){const top=prodList(f,t).sort((x,y)=>y.g-x.g).slice(0,10);const cut=n=>n.length>38?n.slice(0,36)+'…':n;
      plot('ov-brand',barCfg(top.map(o=>cut(o.name)),['Shopee','TikTok','Website'].map((pf,i)=>({label:pf,data:top.map(o=>o.pf===pf?o.g:0),backgroundColor:[C.shopee,C.tiktok,C.web][i],borderRadius:3})),{horizontal:true}))}
    else if(ready('ttp')){const top=brandTable(f,t,'all','all',hasWeb).sort((x,y)=>y.g-x.g).slice(0,10);
      plot('ov-brand',barCfg(top.map(o=>o.name),[{label:'Shopee',data:top.map(o=>o.sh),backgroundColor:C.shopee,borderRadius:3},{label:'TikTok',data:top.map(o=>o.tt),backgroundColor:C.tiktok,borderRadius:3},{label:'Website',data:top.map(o=>o.wb),backgroundColor:C.web,borderRadius:3}],{horizontal:true}))}}
  h+=`</section>`;

  /* ===== MEDIA ===== */
  h+=`<section class="module">${modHead('Media','web','media',`Ads · ${per}`)}`;
  if(!ready('md'))h+=waitBox('md');
  else{h+=`<div class="kpi-grid">${[kpi('Ad Spend',money(md.sp),'web',delta(chg(md.sp,mdp.sp),0)),kpi('Ad GMV',money(md.rv),'pink',delta(chg(md.rv,mdp.rv))),kpi('ROAS',xx(md.roas),'green',delta(chg(md.roas,mdp.roas))),
      kpi('Đơn từ ads',int(md.od),'gold',delta(chg(md.od,mdp.od)),'AOV '+money(md.aov)),kpi('Spend / GMV tổng',pct(div(md.sp,tot)),'tiktok',null,'Chi phí ads trên GMV Commercial')].join('')}</div>`;
    const X=chartDays(f,t),SP=series(D.md.rows,X[0],X[X.length-1],r=>r.sp),RV=series(D.md.rows,X[0],X[X.length-1],r=>r.rv);
    h+=`<div class="chart-grid wide">${chartCard('ov-md','Spend & Ad GMV theo ngày',`ROAS trục phải · ${fd(X[0])} – ${fd(X[X.length-1])}`)}<div class="chart-card"><h3>Theo kênh ads</h3><p class="sub">Spend · ROAS</p>
      ${['Meta','TikTok','Shopee'].map(c=>{const x=mdTot(f,t,c),xp=mdTot(pf,pt,c);return sub(c,money(x.sp),'ROAS '+xx(x.roas)+' · '+(chg(x.sp,xp.sp)==null?'–':(chg(x.sp,xp.sp)>=0?'+':'')+pct(chg(x.sp,xp.sp))))}).join('')}
      ${sub('Số tới',fd(D.md.max))}</div></div>`;
    plot('ov-md',barCfg(X.map(fd),[{label:'Spend',data:X.map(d=>SP[d]||0),backgroundColor:C.web2,borderRadius:3},{label:'Ad GMV',data:X.map(d=>RV[d]||0),backgroundColor:C.web,borderRadius:3},
      {label:'ROAS',data:X.map(d=>SP[d]?RV[d]/SP[d]:null),type:'line',yAxisID:'y1',borderColor:C.gold,backgroundColor:C.gold,pointRadius:2,tension:.3}],{stacked:false,line:true}))}
  h+=`</section>`;

  /* ===== MARKETING ===== */
  h+=`<section class="module">${modHead('Marketing (Pr_MKT)','purple','prmkt',`Kênh TikTok Hannah Team · ${per}`)}`;
  if(!ready('pr'))h+=waitBox('pr');
  else{const P=D.pr,hs=P.C.map(c=>c.h),base=addD(f,-1),v=P.vids.filter(r=>inR(r,f,t)),vp=P.vids.filter(r=>inR(r,pf,pt)),fl=prFollowers(t),flb=prFollowers(base),vw=v.reduce((a,r)=>a+r.vw,0),vwp=vp.reduce((a,r)=>a+r.vw,0);
    const bad=hs.filter(x=>prStatus(x)[1]!=='ok');
    h+=`<div class="kpi-grid">${[kpi('Followers',kf(fl),'purple',`<div class="kpi-delta ${fl>=flb?'pos':'neg'}">${fl-flb>=0?'+':''}${kf(fl-flb)} so với ${fd(base)}</div>`,`${hs.length} kênh`),kpi('Video đăng',int(v.length),'pink',delta(chg(v.length,vp.length))),
      kpi('Views',kf(vw),'web',delta(chg(vw,vwp))),kpi('Vi phạm đang mở',int(hs.reduce((a,x)=>a+prVio(x),0)),'tiktok'),kpi('Kênh cần xử lý',int(bad.length),'shopee',null,bad.slice(0,3).map(x=>esc(P.names[x])).join(', '))].join('')}</div>`}
  h+=`</section>`;
  return h}

function vShopee(){const [f,t]=[S.f,S.t],[pf,pt]=prevRange(f,t);const [pp,pc]=fresh(D.sh&&D.sh.max);
  let h=secHead(ICON.shopee+' Shopee — Live, Video & Affiliate',pp,pc)+`<div class="filter-bar">${sel('shAcc','Account',S.shAcc,ACC)}${sel('shFmt','Live / Video',S.shFmt,FMT)}</div>`;
  if(!ready('sh'))return h+waitBox('sh');
  const a=S.shAcc,fm=S.shFmt,s=shTot(f,t,a,fm),p=shTot(pf,pt,a,fm);
  h+=`<div class="kpi-grid">${[kpi('GMV Buyer',money(s.g),'shopee',delta(chg(s.g,p.g)),'GMV đã xác nhận, Creator Center'),kpi('GMV Live',money(s.gl),'pink',delta(chg(s.gl,p.gl))),kpi('GMV Video',money(s.gv),'gold',delta(chg(s.gv,p.gv))),
    kpi('Affiliate NMV',money(s.nmv),'web',delta(chg(s.nmv,p.nmv)),`${int(s.ao)} đơn`),kpi('Tỷ lệ huỷ (Aff)',pct(s.cancel),'tiktok',delta(chg(s.cancel,p.cancel),-1)),kpi('Đơn live',int(s.o),'green',delta(chg(s.o,p.o)),`AOV ${money(s.aov)}`)].join('')}</div>`;
  const X=chartDays(f,t),flt=r=>accOk(r,a)&&brOk(r);const L=series(D.sh.rows,X[0],X[X.length-1],r=>r.gl,flt),Vv=series(D.sh.rows,X[0],X[X.length-1],r=>r.gv,flt),N=series(D.sh.aff,X[0],X[X.length-1],r=>r.nmv,flt);
  const ds=[];if(fm!=='video')ds.push({label:'Live',data:X.map(d=>L[d]||0),backgroundColor:C.shopee,borderRadius:3,stack:'g'});if(fm!=='live')ds.push({label:'Video',data:X.map(d=>Vv[d]||0),backgroundColor:C.shopee2,borderRadius:3,stack:'g'});
  if(fm==='all')ds.push({label:'Affiliate NMV',data:X.map(d=>N[d]||0),type:'line',borderColor:C.web,backgroundColor:C.web,pointRadius:2,tension:.3,stack:'n'});
  const accs=['HO','MCN'].map(c=>shTot(f,t,c,fm).g);
  h+=`<div class="chart-grid wide">${chartCard('sh-daily','GMV theo ngày',`${fd(X[0])} – ${fd(X[X.length-1])}`)}${chartCard('sh-acc','HO vs MCN','GMV Buyer theo account')}</div>`;
  plot('sh-daily',barCfg(X.map(fd),ds));plot('sh-acc',donutCfg(['HO','MCN (Hannah Team)'],accs,[C.pink,'#9aa0a6']));
  const val=r=>fm==='live'?r.gl:fm==='video'?r.gv:r.gl+r.gv;
  const prevB={};for(const r of D.sh.rows)if(inR(r,pf,pt)&&accOk(r,a)&&brOk(r))prevB[r.b]=(prevB[r.b]||0)+val(r);
  const affB={};for(const r of D.sh.aff)if(inR(r,f,t)&&accOk(r,a)&&brOk(r))affB[r.b]=(affB[r.b]||0)+r.nmv;
  const B=groupSum(D.sh.rows.filter(r=>inR(r,f,t)&&accOk(r,a)&&brOk(r)).map(r=>({b:r.b,g:val(r),gl:r.gl,gv:r.gv,o:r.o})),'b',['g','gl','gv','o']).filter(o=>o.g).map(o=>({...o,name:o.k,nmv:affB[o.k]||0,dl:chg(o.g,prevB[o.k])}));
  const T=B.reduce((x,o)=>x+o.g,0);
  h+=table('sh-brand','GMV theo Brand',`${B.length} brand`,[{k:'name',l:'Brand'},{k:'g',l:'GMV Buyer',f:money,r:1},{k:'share',l:'Share',f:(v,o)=>shareCell(o.g,o,T),r:1},{k:'gl',l:'Live',f:money,r:1},{k:'gv',l:'Video',f:money,r:1},{k:'nmv',l:'Aff NMV',f:money,r:1},{k:'o',l:'Đơn live',f:int,r:1},{k:'dl',l:'Δ kỳ trước',f:v=>v==null?'–':`<span class="${v>=0?'pos':'neg'}">${v>=0?'+':''}${pct(v)}</span>`,r:1}],
    B.map(o=>({...o,share:o.g})),{limit:30,def:{k:'g',asc:false},total:{g:T,gl:s.gl,gv:s.gv,nmv:s.nmv,o:s.o}});
  const K=groupSum(D.sh.rows.filter(r=>inR(r,f,t)&&accOk(r,a)&&brOk(r)).map(r=>({id:r.id+'|'+r.ch,g:val(r),gl:r.gl,gv:r.gv,o:r.o})),'id',['g','gl','gv','o']).filter(o=>o.g)
    .map(o=>{const [id,ch]=o.k.split('|');const it=D.sh.items[id]||{};return {...o,name:cleanTitle(it.title||id),brand:it.brand||'–',ch}});
  h+=table('sh-sku','Top SKU',`${K.length} SKU`,[{k:'name',l:'Sản phẩm'},{k:'brand',l:'Brand'},{k:'ch',l:'Acc',f:chTag},{k:'g',l:'GMV Buyer',f:money,r:1},{k:'gl',l:'Live',f:money,r:1},{k:'gv',l:'Video',f:money,r:1},{k:'o',l:'Đơn live',f:int,r:1}],K,{limit:30,def:{k:'g',asc:false}});
  return h+`<div class="info">GMV Buyer = GMV đã xác nhận (Creator Center, Live + Video, theo SKU). Affiliate NMV = GMV đơn Affiliate đã trừ huỷ. Tỷ lệ huỷ = 1 − NMV ÷ GMV đơn Affiliate đã đặt. So với ${fd(pf)} – ${fd(pt)}.</div>`}

function vTiktok(){const [f,t]=[S.f,S.t],[pf,pt]=prevRange(f,t);const [pp,pc]=fresh(D.tt&&D.tt.max);
  let h=secHead(ICON.tiktok+' TikTok — Live & Video (Partner Center, Olala MCN)',pp,pc)+`<div class="filter-bar">${sel('ttAcc','Account',S.ttAcc,ACC)}${sel('ttFmt','Live / Video',S.ttFmt,FMT)}</div>`;
  if(S.brand)return h+vTiktokBrand(f,t,pf,pt);
  if(!ready('tt'))return h+waitBox('tt');
  const a=S.ttAcc,fm=S.ttFmt,s=ttTot(f,t,a,fm),p=ttTot(pf,pt,a,fm);
  h+=`<div class="kpi-grid">${[kpi('GMV',money(s.g),'tiktok',delta(chg(s.g,p.g)),'GMV creator mang lại'),kpi('GMV Live',money(s.gl),'pink',delta(chg(s.gl,p.gl))),kpi('GMV Video',money(s.gv),'gold',delta(chg(s.gv,p.gv))),
    kpi('Phiên live',int(s.n),'web',delta(chg(s.n,p.n)),`GMV/giờ live ${money(s.gph)}`),kpi('Đơn SKU',int(s.o),'green',delta(chg(s.o,p.o)),`AOV ${money(s.aov)}`),kpi('Viewers',kf(s.v),'purple',delta(chg(s.v,p.v)),`${int(s.c)} khách mua`)].join('')}</div>`;
  const X=chartDays(f,t),flt=r=>accOk(r,a);const L=series(D.tt.live,X[0],X[X.length-1],r=>r.g,flt),Vv=series(D.tt.video,X[0],X[X.length-1],r=>r.g,flt);
  const ds=[];if(fm!=='video')ds.push({label:'Live',data:X.map(d=>L[d]||0),backgroundColor:C.tiktok,borderRadius:3});if(fm!=='live')ds.push({label:'Video',data:X.map(d=>Vv[d]||0),backgroundColor:C.tiktok2,borderRadius:3});
  const rows=[...(fm!=='video'?D.tt.live:[]),...(fm!=='live'?D.tt.video:[])].filter(r=>inR(r,f,t)&&accOk(r,a));
  const prevC={};[...(fm!=='video'?D.tt.live:[]),...(fm!=='live'?D.tt.video:[])].forEach(r=>{if(inR(r,pf,pt)&&accOk(r,a))prevC[r.cr]=(prevC[r.cr]||0)+r.g});
  const CR=groupSum(rows.map(r=>({cr:r.cr,ch:r.ch,g:r.g,gl:r.ti!=null?r.g:0,gv:r.ti==null?r.g:0,o:r.o||0,n:r.ti!=null?1:0,v:r.v||0})),'cr',['g','gl','gv','o','n','v']).filter(o=>o.g)
    .map(o=>({...o,name:'@'+o.k,ch:(rows.find(r=>r.cr===o.k)||{}).ch,aov:div(o.gl,o.o),dl:chg(o.g,prevC[o.k])}));
  const top=[...CR].sort((x,y)=>y.g-x.g).slice(0,10);
  h+=`<div class="chart-grid wide">${chartCard('tt-daily','GMV theo ngày',`${fd(X[0])} – ${fd(X[X.length-1])}`)}${chartCard('tt-cr','Top 10 creator','GMV trong kỳ')}</div>`;
  plot('tt-daily',barCfg(X.map(fd),ds));plot('tt-cr',barCfg(top.map(o=>o.name),[{label:'Live',data:top.map(o=>o.gl),backgroundColor:C.tiktok,borderRadius:3},{label:'Video',data:top.map(o=>o.gv),backgroundColor:C.tiktok2,borderRadius:3}],{horizontal:true}));
  const T=CR.reduce((x,o)=>x+o.g,0);
  h+=table('tt-cr','Creator',`${CR.length} creator`,[{k:'name',l:'Creator'},{k:'ch',l:'Acc',f:chTag},{k:'g',l:'GMV',f:money,r:1},{k:'share',l:'Share',f:(v,o)=>shareCell(o.g,o,T),r:1},{k:'gl',l:'Live',f:money,r:1},{k:'gv',l:'Video',f:money,r:1},{k:'n',l:'Phiên',f:int,r:1},{k:'o',l:'Đơn',f:int,r:1},{k:'aov',l:'AOV',f:money,r:1},{k:'dl',l:'Δ kỳ trước',f:v=>v==null?'–':`<span class="${v>=0?'pos':'neg'}">${v>=0?'+':''}${pct(v)}</span>`,r:1}],
    CR.map(o=>({...o,share:o.g})),{limit:30,def:{k:'g',asc:false},total:{g:s.g,gl:s.gl,gv:s.gv,n:s.n,o:s.o,aov:s.aov}});
  if(fm!=='video'){const SS=D.tt.live.filter(r=>inR(r,f,t)&&accOk(r,a)).map(r=>({...r,name:r.ti||'(không tên)',crn:'@'+r.cr,aov:div(r.g,r.o),gph:div(r.g,r.du/60)}));
    h+=table('tt-ses','Top phiên live',`${SS.length} phiên`,[{k:'name',l:'Phiên'},{k:'d',l:'Ngày',f:fd},{k:'crn',l:'Creator'},{k:'g',l:'GMV',f:money,r:1},{k:'o',l:'Đơn',f:int,r:1},{k:'aov',l:'AOV',f:money,r:1},{k:'v',l:'Viewers',f:kf,r:1},{k:'du',l:'Phút',f:int,r:1},{k:'gph',l:'GMV/giờ',f:money,r:1}],SS,{limit:20,def:{k:'g',asc:false}})}
  return h+`<div class="info">GMV = GMV do creator mang lại (đơn đã đặt), Partner Center Olala MCN. Live theo ngày bắt đầu phiên; Video theo ngày (có từ 01/10/2026). So với ${fd(pf)} – ${fd(pt)}.</div>`}

function vTiktokBrand(f,t,pf,pt){if(!ready('ttp'))return waitBox('ttp');const a=S.ttAcc,fm=S.ttFmt,s=ttTot(f,t,a,fm),p=ttTot(pf,pt,a,fm),bn=esc(brandName(S.brand));
  let h=`<div class="warnbox">Lọc brand <b>${bn}</b>: số lấy từ GMV theo sản phẩm (có từ ${fd(D.ttp.min)}). Live / Video = GMV trực tiếp trong live / video; phiên live và viewers không chia được theo brand.</div>`;
  h+=`<div class="kpi-grid">${[kpi('GMV sản phẩm',money(s.g),'tiktok',delta(chg(s.g,p.g))),kpi('Live trực tiếp',money(s.gl),'pink',delta(chg(s.gl,p.gl))),kpi('Video trực tiếp',money(s.gv),'gold',delta(chg(s.gv,p.gv))),kpi('Đơn',int(s.o),'green',delta(chg(s.o,p.o)),`AOV ${money(s.aov)}`)].join('')}</div>`;
  const R=D.ttp.rows.filter(r=>inR(r,f,t)&&accOk(r,a)&&brOk(r)),X=chartDays(f,t),G=series(D.ttp.rows,X[0],X[X.length-1],r=>r.g,r=>accOk(r,a)&&brOk(r));
  const CR=groupSum(R,'cr',['g','gl','gv','o']).filter(o=>o.g).map(o=>({...o,name:'@'+o.k,ch:(R.find(r=>r.cr===o.k)||{}).ch}));
  h+=`<div class="chart-grid wide">${chartCard('tt-daily','GMV theo ngày',`${bn} · ${fd(X[0])} – ${fd(X[X.length-1])}`)}${chartCard('tt-cr','Top 10 creator',bn)}</div>`;
  plot('tt-daily',barCfg(X.map(fd),[{label:'GMV',data:X.map(d=>G[d]||0),backgroundColor:C.tiktok,borderRadius:3}]));
  const top=[...CR].sort((x,y)=>y.g-x.g).slice(0,10);plot('tt-cr',barCfg(top.map(o=>o.name),[{label:'GMV',data:top.map(o=>o.g),backgroundColor:C.tiktok,borderRadius:3}],{horizontal:true}));
  h+=table('tt-crb','Creator',`${CR.length} creator`,[{k:'name',l:'Creator'},{k:'ch',l:'Acc',f:chTag},{k:'g',l:'GMV',f:money,r:1},{k:'gl',l:'Live trực tiếp',f:money,r:1},{k:'gv',l:'Video trực tiếp',f:money,r:1},{k:'o',l:'Đơn',f:int,r:1}],CR,{limit:30,def:{k:'g',asc:false}});
  const PR=prodList(f,t,'tt');h+=table('tt-prb','Sản phẩm',`${PR.length} sản phẩm`,[{k:'name',l:'Sản phẩm'},{k:'g',l:'GMV',f:money,r:1},{k:'gl',l:'Live',f:money,r:1},{k:'gv',l:'Video',f:money,r:1},{k:'o',l:'Đơn',f:int,r:1}],PR,{limit:30,def:{k:'g',asc:false}});
  return h}

/* Hannaholala.com (Haravan web) */
function vWeb(){const [f,t]=[S.f,S.t],[pf,pt]=prevRange(f,t);const [pp,pc]=fresh(D.web&&D.web.max);
  let h=secHead(ICON.web+' Hannaholala.com — đơn Haravan',pp,pc)+`<div class="filter-bar">${sel('wbCh','Kênh Haravan',S.wbCh,[['web','Web (Hannaholala.com)'],['harasocial','Harasocial'],['livestream','Livestream'],['all','Tất cả kênh']])}</div>`;
  if(!ready('web'))return h+waitBox('web');
  const c=S.wbCh,s=webTot(f,t,c),p=webTot(pf,pt,c),cov=pf>=D.web.min,dd=(x,y,g)=>cov?delta(chg(x,y),g):'<div class="kpi-delta flat">– kỳ trước chưa có số</div>';
  if(f<D.web.min)h+=`<div class="warnbox">Website có số từ ${fd(D.web.min)} (lưu từ sheet getlast); trước ngày đó chưa có.</div>`;
  if(S.brand)h+=`<div class="warnbox">Lọc brand <b>${esc(brandName(S.brand))}</b>: số đơn là số đơn có sản phẩm của brand.</div>`;
  h+=`<div class="kpi-grid">${[kpi('GMV',money(s.g),'web',dd(s.g,p.g),'Đã trừ đơn huỷ'),kpi('Đơn',int(s.o),'pink',dd(s.o,p.o)),kpi('AOV',money(s.aov),'gold',dd(s.aov,p.aov)),
    kpi('Sản phẩm bán',int(s.q),'green',dd(s.q,p.q)),kpi('Tỷ lệ huỷ',pct(s.cancel),'tiktok',dd(s.cancel,p.cancel,-1),`${int(s.co)} đơn · ${money(s.cg)}`),kpi('Brand có đơn',int(new Set(D.web.sku.filter(r=>inR(r,f,t)&&(c==='all'||r.ch===c)&&brOk(r)&&r.g).map(r=>r.k)).size),'purple')].join('')}</div>`;
  const okC=r=>(c==='all'||r.ch===c)&&brOk(r),R=D.web.sku.filter(r=>inR(r,f,t)&&okC(r)),X=chartDays(f,t);
  const chs=c==='all'?['web','harasocial','livestream']:[c],col={web:C.web,harasocial:C.purple,livestream:C.pink};
  const ds=chs.map(ch=>{const m=S.brand?series(D.web.sku,X[0],X[X.length-1],r=>r.g,r=>r.ch===ch&&brOk(r)):series(D.web.rows,X[0],X[X.length-1],r=>r.g,r=>r.ch===ch);return {label:ch==='web'?'Web':ch==='harasocial'?'Harasocial':'Livestream',data:X.map(d=>m[d]||0),backgroundColor:col[ch],borderRadius:3}});
  const CP=groupSum(R,'camp',['g','o','q','co']).filter(o=>o.g||o.co).map(o=>({...o,name:o.k}));
  h+=`<div class="chart-grid wide">${chartCard('wb-daily','GMV theo ngày',`${fd(X[0])} – ${fd(X[X.length-1])}`)}${chartCard('wb-camp','GMV theo camp','Top 8 + khác')}</div>`;
  plot('wb-daily',barCfg(X.map(fd),ds));const c8=[...CP].sort((a,b)=>b.g-a.g),t8=c8.slice(0,8),TC=c8.reduce((a,o)=>a+o.g,0);
  plot('wb-camp',donutCfg([...t8.map(o=>o.name),'Khác'],[...t8.map(o=>o.g),TC-t8.reduce((a,o)=>a+o.g,0)]));
  const prevB={};D.web.sku.forEach(r=>{if(inR(r,pf,pt)&&okC(r))prevB[r.k]=(prevB[r.k]||0)+r.g});
  const B=groupSum(R,'k',['g','o','q','co','cg']).filter(o=>o.g).map(o=>({...o,name:(R.find(r=>r.k===o.k)||{}).b||o.k,aov:div(o.g,o.o),dl:cov?chg(o.g,prevB[o.k]):null,share:o.g}));const T=B.reduce((a,o)=>a+o.g,0);
  h+=table('wb-brand','GMV theo Brand',`${B.length} brand`,[{k:'name',l:'Brand'},{k:'g',l:'GMV',f:money,r:1},{k:'share',l:'Share',f:(v,o)=>shareCell(o.g,o,T),r:1},{k:'o',l:'Đơn',f:int,r:1},{k:'q',l:'SP',f:int,r:1},{k:'aov',l:'GMV/đơn',f:money,r:1},{k:'co',l:'Đơn huỷ',f:int,r:1},{k:'dl',l:'Δ kỳ trước',f:v=>v==null?'–':`<span class="${v>=0?'pos':'neg'}">${v>=0?'+':''}${pct(v)}</span>`,r:1}],
    B,{limit:40,def:{k:'g',asc:false},total:{g:T,o:null,q:B.reduce((a,o)=>a+o.q,0),co:null}});
  const K=groupSum(R,'id',['g','o','q','co']).filter(o=>o.g).map(o=>{const r0=R.find(r=>r.id===o.k)||{};return {...o,name:D.web.items[o.k]||o.k,sku:o.k,brand:r0.b||'–'}});
  h+=table('wb-sku','Top sản phẩm',`${K.length} SKU`,[{k:'name',l:'Sản phẩm'},{k:'sku',l:'Mã SP'},{k:'brand',l:'Brand'},{k:'g',l:'GMV',f:money,r:1},{k:'q',l:'SP',f:int,r:1},{k:'o',l:'Đơn',f:int,r:1},{k:'co',l:'Đơn huỷ',f:int,r:1}],K,{limit:30,def:{k:'g',asc:false}});
  h+=table('wb-camp','Camp',`${CP.length} camp`,[{k:'name',l:'Camp'},{k:'g',l:'GMV',f:money,r:1},{k:'share',l:'Share',f:(v,o)=>shareCell(o.g,o,TC),r:1},{k:'o',l:'Đơn',f:int,r:1},{k:'q',l:'SP',f:int,r:1},{k:'co',l:'Đơn huỷ',f:int,r:1}],CP.map(o=>({...o,share:o.g})),{limit:30,def:{k:'g',asc:false}});
  return h+`<div class="info">Nguồn: đơn Haravan (sheet getlast, lưu kho hằng ngày trong website/data). GMV = số lượng × giá sản phẩm, trước giảm giá đơn, không tính đơn huỷ. Đơn theo brand / camp / SKU đếm đơn có sản phẩm đó nên cộng lại có thể lớn hơn tổng đơn. So với ${fd(pf)} – ${fd(pt)}.</div>`}

function vMedia(){const [f,t]=[S.f,S.t],[pf,pt]=prevRange(f,t);const [pp,pc]=fresh(D.md&&D.md.max);
  let h=secHead('📣 Media — Ads (Meta, TikTok, Shopee)',pp,pc)+`<div class="filter-bar">${sel('mdCh','Kênh ads',S.mdCh,[['all','Tất cả'],['Meta','Meta'],['TikTok','TikTok'],['Shopee','Shopee']])}</div>`;
  if(!ready('md'))return h+waitBox('md');
  const c=S.mdCh,s=mdTot(f,t,c),p=mdTot(pf,pt,c);
  h+=`<div class="kpi-grid">${[kpi('Ad Spend',money(s.sp),'web',delta(chg(s.sp,p.sp),0)),kpi('Ad GMV',money(s.rv),'pink',delta(chg(s.rv,p.rv))),kpi('ROAS',xx(s.roas),'green',delta(chg(s.roas,p.roas))),
    kpi('Đơn',int(s.od),'gold',delta(chg(s.od,p.od)),`AOV ${money(s.aov)}`),kpi('CTR',pct(s.ctr),'purple',delta(chg(s.ctr,p.ctr))),kpi('CPC',money(s.cpc),'tiktok',delta(chg(s.cpc,p.cpc),-1))].join('')}</div>`;
  const X=chartDays(f,t),flt=r=>c==='all'||r.ch===c;const SP=series(D.md.rows,X[0],X[X.length-1],r=>r.sp,flt),RV=series(D.md.rows,X[0],X[X.length-1],r=>r.rv,flt);
  h+=`<div class="chart-grid wide">${chartCard('md-daily','Spend & Ad GMV theo ngày',`ROAS trục phải · ${fd(X[0])} – ${fd(X[X.length-1])}`)}${chartCard('md-ch','Spend theo kênh','Tỷ trọng trong kỳ')}</div>`;
  plot('md-daily',barCfg(X.map(fd),[{label:'Spend',data:X.map(d=>SP[d]||0),backgroundColor:C.web2,borderRadius:3},{label:'Ad GMV',data:X.map(d=>RV[d]||0),backgroundColor:C.web,borderRadius:3},
    {label:'ROAS',data:X.map(d=>SP[d]?RV[d]/SP[d]:null),type:'line',yAxisID:'y1',borderColor:C.gold,backgroundColor:C.gold,pointRadius:2,tension:.3}],{stacked:false,line:true}));
  const chs=['Meta','TikTok','Shopee'];plot('md-ch',donutCfg(chs,chs.map(x=>mdTot(f,t,x).sp),[C.web,C.tiktok,C.shopee]));
  const G=groupSum(D.md.rows.filter(r=>inR(r,f,t)&&flt(r)).map(r=>({k:r.camp+'|'+r.ch+'|'+r.acc,sp:r.sp,rv:r.rv,od:r.od,im:r.im,cl:r.cl})),'k',['sp','rv','od','im','cl'])
    .map(o=>{const [name,ch,acc]=o.k.split('|');return {...o,name,ch,acc,roas:div(o.rv,o.sp),ctr:div(o.cl,o.im),cpc:div(o.sp,o.cl)}}).filter(o=>o.sp||o.rv);
  h+=table('md-camp','Campaign',`${G.length} campaign`,[{k:'name',l:'Campaign'},{k:'ch',l:'Kênh',f:v=>`<span class="tag ${v==='Meta'?'tag-web':v==='Shopee'?'tag-shopee':'tag-tiktok'}">${esc(v)}</span>`},{k:'acc',l:'Account'},{k:'sp',l:'Spend',f:money,r:1},{k:'rv',l:'Ad GMV',f:money,r:1},{k:'roas',l:'ROAS',f:xx,r:1},{k:'od',l:'Đơn',f:int,r:1},{k:'ctr',l:'CTR',f:pct,r:1},{k:'cpc',l:'CPC',f:money,r:1}],
    G,{limit:40,def:{k:'sp',asc:false},total:{sp:s.sp,rv:s.rv,roas:s.roas,od:s.od,ctr:s.ctr,cpc:s.cpc}});
  return h}

/* Pr_MKT */
const prFAt=(h,d)=>{let v=null;for(const x of D.pr.fdays){if(x>d)break;const y=D.pr.F[x][h];if(y!=null)v=y}return v};
const prFollowers=d=>D.pr.C.reduce((a,c)=>a+(prFAt(c.h,d)||0),0);
const prVio=h=>((D.pr.ST.vio||{})[h]||[]).length;
function prStatus(h){const al=(D.pr.ST.alerts||[]).filter(a=>a.ch===h);if(prVio(h))return ['Vi phạm','bad'];if(al.some(a=>a.sev==='bad'))return ['Cần xử lý','bad'];if(al.some(a=>a.sev==='warn'))return ['Lưu ý','warn'];return ['Ổn','ok']}
function vPrmkt(){const [f,t]=[S.f,S.t],[pf,pt]=prevRange(f,t);const [pp,pc]=fresh(D.pr&&D.pr.max);
  let h=secHead('📱 Pr_MKT — kênh TikTok Hannah Team',pp,pc);if(!ready('pr'))return h+waitBox('pr');
  const P=D.pr,base=addD(f,-1),v=P.vids.filter(r=>inR(r,f,t)),vp=P.vids.filter(r=>inR(r,pf,pt));const hs=P.C.map(c=>c.h);
  const fl=prFollowers(t),flb=prFollowers(base),vw=v.reduce((a,r)=>a+r.vw,0),vwp=vp.reduce((a,r)=>a+r.vw,0);
  h+=`<div class="kpi-grid">${[kpi('Followers',kf(fl),'purple',`<div class="kpi-delta ${fl>=flb?'pos':'neg'}">${fl-flb>=0?'+':''}${kf(fl-flb)} so với ${fd(base)}</div>`,`${hs.length} kênh`),kpi('Video đăng',int(v.length),'pink',delta(chg(v.length,vp.length))),
    kpi('Views',kf(vw),'web',delta(chg(vw,vwp))),kpi('Views / video',kf(div(vw,v.length)),'gold',delta(chg(div(vw,v.length),div(vwp,vp.length)))),kpi('Vi phạm đang mở',int(hs.reduce((a,x)=>a+prVio(x),0)),'tiktok'),kpi('Kênh cần xử lý',int(hs.filter(x=>prStatus(x)[1]!=='ok').length),'shopee')].join('')}</div>`;
  const X=chartDays(f,t);const N=series(P.vids,X[0],X[X.length-1],()=>1),W=series(P.vids,X[0],X[X.length-1],r=>r.vw);
  h+=`<div class="chart-grid">${chartCard('pr-daily','Video đăng theo ngày',`${fd(X[0])} – ${fd(X[X.length-1])} · views trục phải`)}${chartCard('pr-fl','Followers theo kênh',`tại ${fd(t)}`)}</div>`;
  const cfg=barCfg(X.map(fd),[{label:'Video',data:X.map(d=>N[d]||0),backgroundColor:C.purple,borderRadius:3},{label:'Views',data:X.map(d=>W[d]||0),type:'line',yAxisID:'y1',borderColor:C.gold,backgroundColor:C.gold,pointRadius:2,tension:.3}],{stacked:false,line:true});
  cfg.options.scales.y.ticks={callback:v=>int(v)};cfg.options.scales.y1.ticks={callback:v=>kf(v)};cfg.options.plugins.tooltip.callbacks.label=c=>`${c.dataset.label}: ${c.dataset.label==='Views'?kf(c.raw):int(c.raw)}`;plot('pr-daily',cfg);
  const FL=hs.map(x=>({n:P.names[x],v:prFAt(x,t)||0})).sort((a,b)=>b.v-a.v);const fc=barCfg(FL.map(o=>o.n),[{label:'Followers',data:FL.map(o=>o.v),backgroundColor:C.purple,borderRadius:3}],{horizontal:true});
  fc.options.scales.x.ticks={callback:v=>kf(v)};fc.options.plugins.tooltip.callbacks.label=c=>'Followers: '+int(c.raw);fc.options.plugins.legend.display=false;plot('pr-fl',fc);
  const by={};v.forEach(r=>{const o=by[r.ch]=by[r.ch]||{n:0,vw:0,tag:0};o.n++;o.vw+=r.vw;o.tag+=r.tag});
  const R=hs.map(x=>{const [st,k]=prStatus(x),a=prFAt(x,t),b=prFAt(x,base),o=by[x]||{n:0,vw:0,tag:0};return {name:P.names[x],st,k,stage:(P.ST.stage||{})[x]||'',tier:(P.ST.tier||{})[x]||'',fl:a,dfl:a!=null&&b!=null?a-b:null,n:o.n,vw:o.vw,vpv:div(o.vw,o.n),cart:div(o.tag,o.n),vio:prVio(x)}});
  h+=table('pr-ch','Kênh','trạng thái · stage · tier',[{k:'name',l:'Kênh'},{k:'st',l:'Trạng thái',f:(v,o)=>`<span class="st ${o.k}">${v}</span>`},{k:'stage',l:'Stage'},{k:'tier',l:'Tier'},{k:'fl',l:'Followers',f:kf,r:1},{k:'dfl',l:'Δ Followers',f:v=>v==null?'–':`<span class="${v>=0?'pos':'neg'}">${v>0?'+':''}${kf(v)}</span>`,r:1},
    {k:'n',l:'Video',f:int,r:1},{k:'vw',l:'Views',f:kf,r:1},{k:'vpv',l:'Views/video',f:kf,r:1},{k:'cart',l:'Gắn giỏ',f:pct,r:1},{k:'vio',l:'Vi phạm',f:int,r:1}],R,{limit:50,def:{k:'fl',asc:false}});
  const al=(P.ST.alerts||[]).filter(a=>a.ch).sort((a,b)=>(a.sev==='bad'?0:1)-(b.sev==='bad'?0:1));
  if(al.length)h+=`<div class="table-wrap"><h3><span>Cần xử lý</span><small>${al.length} cảnh báo</small></h3><ul class="alerts">${al.map(a=>`<li><span class="st ${a.sev==='bad'?'bad':'warn'}">${a.sev==='bad'?'Xử lý':'Lưu ý'}</span><div><b>${esc(a.short||a.title)}</b><br><span>${esc(P.names[a.ch]||a.ch)}</span></div></li>`).join('')}</ul></div>`;
  return h}

function vBrand(){const [f,t]=[S.f,S.t],[pf,pt]=prevRange(f,t);
  let h=secHead('🏷️ By Brand — Shopee + TikTok')+`<div class="filter-bar">${sel('brPf','Nền tảng',S.brPf,[['all','Shopee + TikTok'],['sh','Shopee'],['tt','TikTok']])}${sel('brAcc','Account',S.brAcc,ACC)}</div>`;
  if(!ready('sh','ttp'))return h+waitBox('sh','ttp');
  if(D.ttp.min>f&&S.brPf!=='sh')h+=`<div class="warnbox">TikTok theo brand có từ ${fd(D.ttp.min)}; trước ngày đó chỉ có Shopee.</div>`;
  const B=brandTable(f,t,S.brPf,S.brAcc).filter(o=>o.g),P=Object.fromEntries(brandTable(pf,pt,S.brPf,S.brAcc).map(o=>[o.k,o.g]));
  const T=B.reduce((a,o)=>a+o.g,0);B.forEach(o=>{o.dl=chg(o.g,P[o.k]);o.share=o.g});
  const top=[...B].sort((a,b)=>b.g-a.g).slice(0,15);
  h+=`<div class="kpi-grid">${[kpi('GMV (brand)',money(T),'pink',delta(chg(T,Object.values(P).reduce((a,b)=>a+b,0)))),kpi('Số brand',int(B.length),'gold'),kpi('Top brand',esc(top[0]?top[0].name:'–'),'shopee',`<div class="kpi-sub">${top[0]?money(top[0].g)+' · '+pct(top[0].g/T):''}</div>`),
    kpi('Top 10 chiếm',pct(div(top.slice(0,10).reduce((a,o)=>a+o.g,0),T)),'web')].join('')}</div>`;
  h+=`<div class="chart-grid wide">${chartCard('br-top','Top 15 Brand','Shopee vs TikTok',true)}${chartCard('br-d','Brand share %','Top 8 + khác',true)}</div>`;
  plot('br-top',barCfg(top.map(o=>o.name),[{label:'Shopee',data:top.map(o=>o.sh),backgroundColor:C.shopee,borderRadius:3},{label:'TikTok',data:top.map(o=>o.tt),backgroundColor:C.tiktok,borderRadius:3}],{horizontal:true}));
  const t8=top.slice(0,8);plot('br-d',donutCfg([...t8.map(o=>o.name),'Khác'],[...t8.map(o=>o.g),T-t8.reduce((a,o)=>a+o.g,0)]));
  h+=table('br-all','Tất cả brand',`${B.length} brand`,[{k:'name',l:'Brand'},{k:'g',l:'GMV',f:money,r:1},{k:'share',l:'Share',f:(v,o)=>shareCell(o.g,o,T),r:1},{k:'sh',l:'Shopee',f:money,r:1},{k:'shl',l:'SP Live',f:money,r:1},{k:'shv',l:'SP Video',f:money,r:1},{k:'tt',l:'TikTok',f:money,r:1},{k:'ttl',l:'TT Live',f:money,r:1},{k:'ttv',l:'TT Video',f:money,r:1},{k:'dl',l:'Δ kỳ trước',f:v=>v==null?'–':`<span class="${v>=0?'pos':'neg'}">${v>=0?'+':''}${pct(v)}</span>`,r:1}],
    B,{limit:100,def:{k:'g',asc:false},total:{g:T,sh:B.reduce((a,o)=>a+o.sh,0),tt:B.reduce((a,o)=>a+o.tt,0)}});
  return h+`<div class="info">Shopee = GMV Buyer Creator Center theo SKU (Live + Video). TikTok = GMV sản phẩm do creator mang lại (Partner Center, Live/Video trực tiếp là phần GMV ghi nhận ngay trong live / video). Tên brand được gộp giữa 2 sàn theo chữ cái (bỏ dấu). So với ${fd(pf)} – ${fd(pt)}.</div>`}

function vProduct(){const [f,t]=[S.f,S.t];
  let h=secHead('📦 By Product — top sản phẩm')+`<div class="filter-bar">${sel('pdPf','Nền tảng',S.pdPf,[['all','Shopee + TikTok + Website'],['sh','Shopee'],['tt','TikTok'],['wb','Website']])}<div class="fg" style="flex:1"><label>Tìm sản phẩm / brand</label><input data-s="pdQ" value="${esc(S.pdQ)}" placeholder="vd: whoo, cnp, kem chống nắng"></div></div>`;
  if(!ready('sh','ttp','web'))return h+waitBox('sh','ttp','web');
  const R=prodList(f,t,S.pdPf);
  const q=bkey(S.pdQ);const F=q?R.filter(o=>bkey(o.name+' '+o.brand).includes(q)):R;const T=F.reduce((a,o)=>a+o.g,0);
  h+=`<div class="kpi-grid">${[kpi('GMV sản phẩm',money(T),'pink'),kpi('Số sản phẩm',int(F.length),'gold'),kpi('Shopee',money(F.filter(o=>o.pf==='Shopee').reduce((a,o)=>a+o.g,0)),'shopee'),kpi('TikTok',money(F.filter(o=>o.pf==='TikTok').reduce((a,o)=>a+o.g,0)),'tiktok'),kpi('Website',money(F.filter(o=>o.pf==='Website').reduce((a,o)=>a+o.g,0)),'web')].join('')}</div>`;
  h+=table('pd-all','Top sản phẩm',q?`lọc "${esc(S.pdQ)}"`:'',[{k:'name',l:'Sản phẩm'},{k:'pf',l:'Sàn',f:v=>`<span class="tag ${v==='Shopee'?'tag-shopee':v==='Website'?'tag-web':'tag-tiktok'}">${v}</span>`},{k:'brand',l:'Brand'},{k:'g',l:'GMV',f:money,r:1},{k:'share',l:'Share',f:(v,o)=>shareCell(o.g,o,T),r:1},{k:'gl',l:'Live',f:v=>v==null?'–':money(v),r:1},{k:'gv',l:'Video',f:v=>v==null?'–':money(v),r:1},{k:'o',l:'Đơn',f:int,r:1}],
    F.map(o=>({...o,share:o.g})),{limit:100,def:{k:'g',asc:false}});
  return h+`<div class="info">Shopee: GMV Buyer theo SKU (đơn live = đơn đã đặt trong live). TikTok: GMV theo sản phẩm (có từ ${fd(D.ttp.min)}); cột Live / Video của TikTok là GMV trực tiếp trong live / video. Website: GMV đơn Haravan kênh web, không chia Live / Video.</div>`}

/* ---------- shell ---------- */
const NAV=[['Tổng quan',[['overview','📊','Tổng quan']]],['By Channel',[['shopee',ICON.shopee,'Shopee','Live + Video'],['tiktok',ICON.tiktok,'TikTok','HO + MCN'],['web',ICON.web,'Hannaholala.com','Web'],['media','📣','Media','Ads'],['prmkt','📱','Pr_MKT']]],['Analytics',[['brand','🏷️','By Brand'],['product','📦','By Product']]]];
const VIEWS={overview:vOverview,shopee:vShopee,tiktok:vTiktok,web:vWeb,media:vMedia,prmkt:vPrmkt,brand:vBrand,product:vProduct};
const TITLES={overview:'Tổng quan',shopee:'Shopee',tiktok:'TikTok',web:'Hannaholala.com',media:'Media',prmkt:'Pr_MKT',brand:'By Brand',product:'By Product'};
const NEED={overview:['sh','tt','web','md','pr','shPlan','ttPlan','ttp'],shopee:['sh','ttp','web'],tiktok:['tt','ttp','web'],web:['web','sh','ttp'],media:['md'],prmkt:['pr'],brand:['sh','ttp'],product:['sh','ttp','web']};
const BRAND_VIEWS=['overview','shopee','tiktok','web','product'];
function render(){NEED[S.view].forEach(load);
  const lm=addD(YD.slice(0,8)+'01',-1);
  $('#nav').innerHTML=NAV.map(([lab,items])=>`<div class="nav-section"><div class="nav-label">${lab}</div>${items.map(([k,ic,l,b])=>`<a class="nav-item ${S.view===k?'active':''}" href="#${k}"><span class="icon">${ic}</span>${l}${b?`<span class="badge">${b}</span>`:''}</a>`).join('')}</div>`).join('');
  const upd=[['Shopee',D.sh],['TikTok',D.tt],['Website',D.web],['Media',D.md]].filter(x=>x[1]).map(([n,d])=>`${n} ${fd(d.max)}`).join(' · ');
  $('#topbar').innerHTML=`<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap"><span class="topbar-title">${TITLES[S.view]}</span><span class="topbar-sub">${S.f===S.t?fd(S.f):fd(S.f)+' – '+fd(S.t)}${upd?' · số tới: '+upd:''}</span></div>
   <div class="time-btns">${[['d','Hôm qua '+fd(YD)],['mtd','MTD T'+(+YD.slice(5,7))],['7','7 ngày'],['30','30 ngày'],['lm','Tháng '+(+lm.slice(5,7))],['c','📅 Tuỳ chọn']].map(([k,l])=>`<button class="tbtn ${S.p===k||(k==='c'&&S.p==='')?'active':''}" data-p="${k}">${l}</button>`).join('')}
   ${BRAND_VIEWS.includes(S.view)?`<select id="brandSel" class="brand-sel" title="Lọc theo brand"><option value="">Tất cả brand</option>${brandOpts().map(([k,n])=>`<option value="${esc(k)}" ${S.brand===k?'selected':''}>${esc(n)}</option>`).join('')}${S.brand&&!brandOpts().some(x=>x[0]===S.brand)?`<option value="${esc(S.brand)}" selected>${esc(S.brand)}</option>`:''}</select>`:''}
   ${S.p===''||S.showDates?`<span class="dates"><input type="date" id="from" value="${S.f}"> – <input type="date" id="to" value="${S.t}"></span>`:''}</div>`;
  $('#content').innerHTML=VIEWS[S.view]();
  flushCharts();
  document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{if(b.dataset.p==='c'){S.showDates=!S.showDates;render();return}S.showDates=false;S.p=b.dataset.p;[S.f,S.t]=preset(S.p);render()});
  ['from','to'].forEach(id=>{const e=document.getElementById(id);if(e)e.onchange=()=>{const a=$('#from').value,b=$('#to').value;if(!a||!b)return;S.p='';[S.f,S.t]=a>b?[b,a]:[a,b];render()}});
  document.querySelectorAll('select[data-s]').forEach(e=>e.onchange=()=>{S[e.dataset.s]=e.value;render()});
  const bs=$('#brandSel');if(bs)bs.onchange=()=>{S.brand=bs.value;render()};
  const q=document.querySelector('input[data-s="pdQ"]');if(q){let tm;q.oninput=()=>{clearTimeout(tm);tm=setTimeout(()=>{S.pdQ=q.value;render();const n=document.querySelector('input[data-s="pdQ"]');n.focus();n.setSelectionRange(n.value.length,n.value.length)},300)}}
  document.querySelectorAll('th[data-k]').forEach(th=>th.onclick=()=>{const id=th.dataset.t,k=th.dataset.k,c=S.sort[id];S.sort[id]={k,asc:c&&c.k===k?!c.asc:false};render()});
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{location.hash=b.dataset.go});
}
function route(){const v=location.hash.slice(1);S.view=VIEWS[v]?v:'overview';render();window.scrollTo({top:0})}
[S.f,S.t]=preset(S.p);
window.addEventListener('hashchange',route);
window.addEventListener('load',()=>render());
route();
})();
