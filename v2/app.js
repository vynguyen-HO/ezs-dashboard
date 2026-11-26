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
const fdy=s=>s?`${fd(s)}/${s.slice(0,4)}`:'';
const vnDay=ts=>ds(ts*1000+7*3600e3);
function money(v){if(v==null||!isFinite(v))return '–';const a=Math.abs(v);
  if(a>=1e12)return Math.round(v/1e9).toLocaleString('en-US')+' tỷ';/* từ 1.000 tỷ: dấu , ngăn hàng nghìn (2,804 tỷ) */
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
/* brand key: gộp tên brand giữa các kênh (bỏ dấu, bỏ "THE" đầu, bỏ đuôi như Laboratory / Viet Nam / Beauty / Professional) */
const BSTOP=/(laboratory|laboratories|officialstore|official|store|vietnam|vn|paris|professional|beauty|cosmetics|korea)$/;
/* tên brand khác nhau nhưng là một brand: key → key chuẩn */
const BALIAS={narciso:'narcisorodriguez'};
const bk=s=>{let k=bkey(s).replace(/^the(?=.{3})/,'');for(let i=0;i<2;i++){const k2=k.replace(BSTOP,'');if(k2.length>=3)k=k2}k=BALIAS[k]||k;return k||String(s||'')};
/* channel logos (inline SVG) */
const ICON={
  shopee:'<svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="5" fill="#ee4d2d"/><path d="M8.6 8.2V7.6a3.4 3.4 0 0 1 6.8 0v.6" fill="none" stroke="#fff" stroke-width="1.5"/><path d="M5.3 8.2h13.4l-.9 11a1.4 1.4 0 0 1-1.4 1.3H7.6a1.4 1.4 0 0 1-1.4-1.3z" fill="#fff"/><text x="12" y="18.2" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="9" font-weight="700" fill="#ee4d2d">S</text></svg>',
  tiktok:'<svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="5" fill="#000"/><g transform="translate(4.2 3.6) scale(.68)"><path fill="#25f4ee" transform="translate(-.9 -.7)" d="M16.6 5.8a4.8 4.8 0 0 1-3.8-4.3V1h-3.4v13.7a2.9 2.9 0 1 1-2-2.8V8.4a6.3 6.3 0 1 0 5.4 6.3V7.8a8.2 8.2 0 0 0 4.8 1.5V5.9z"/><path fill="#fe2c55" transform="translate(.9 .7)" d="M16.6 5.8a4.8 4.8 0 0 1-3.8-4.3V1h-3.4v13.7a2.9 2.9 0 1 1-2-2.8V8.4a6.3 6.3 0 1 0 5.4 6.3V7.8a8.2 8.2 0 0 0 4.8 1.5V5.9z"/><path fill="#fff" d="M16.6 5.8a4.8 4.8 0 0 1-3.8-4.3V1h-3.4v13.7a2.9 2.9 0 1 1-2-2.8V8.4a6.3 6.3 0 1 0 5.4 6.3V7.8a8.2 8.2 0 0 0 4.8 1.5V5.9z"/></g></svg>',
  web:'<svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1877f2"/><path fill="#fff" d="M13.4 24v-8.6h2.9l.4-3.4h-3.3V9.9c0-1 .3-1.6 1.7-1.6h1.8v-3a24 24 0 0 0-2.6-.1c-2.6 0-4.3 1.6-4.3 4.4V12H7.1v3.4H10V24z"/></svg>'};


/* ---------- data ---------- */
/* Shopee: acc trong data → ID kênh live (Creator Center). HO = hannahteam1, các ID khác tính là MCN */
const SHID={HO:'hannahteam1',HT:'olalamedia2'},shId=a=>SHID[a]||a||'hannahteam1';
const D={},ST={};
const LOAD={
  sh:async()=>{const [sku,items,aff,afs,ovw,gal]=await Promise.all([csv('shopee/data/sku_daily.csv'),csv('shopee/data/items.csv'),csv('shopee/data/aff_brand_daily.csv'),csv('shopee/data/aff_src_daily.csv').catch(()=>[]),csv('shopee/data/live_overview_daily.csv').catch(()=>[]),csv('shopee/data/live_gap_alloc.csv').catch(()=>[])]);
    const I={};items.forEach(r=>I[r.item_id]=r);const rows=[];let mx='';
    for(const r of sku){const gl=+r.lp||0,gv=+r.vp||0,o=+r.lo||0;/* GMV Seller = GMV đơn đã đặt (placed); GMV Buyer (đã xác nhận) không dùng */if(!gl&&!gv&&!o)continue;const it=I[r.item_id]||{};
      const b=it.brand||'Chưa xác định';rows.push({pf:'sh',d:r.date,ch:r.acc==='HO'?'HO':'MCN',sid:shId(r.acc),gl,gv,o,lp:+r.lp||0,b,k:bk(b),id:r.item_id});if(r.date>mx)mx=r.date}
    /* Creator Center chỉ trả tối đa 1.000 sản phẩm / ngày: phần GMV live còn thiếu so với tổng chính thức (live_overview_daily)
       thành một dòng "Chưa phân bổ brand" để tổng GMV đủ; brand của phần này không biết được */
    const UNB='Chưa phân bổ brand',sum={};for(const r of rows)sum[r.d+'|'+r.sid]=(sum[r.d+'|'+r.sid]||0)+r.gl;const gaps=[];
    const GA={};for(const r of gal){(GA[r.date+'|'+r.acc]=GA[r.date+'|'+r.acc]||[]).push(r)}
    for(const r of ovw){const sid=shId(r.acc),ch=r.acc==='HO'?'HO':'MCN',gap=(+r.placed||0)-(sum[r.date+'|'+sid]||0);if(!(gap>Math.max(5e6,.02*(+r.placed||0))))continue;
      /* phần thiếu đã chia ước tính theo brand (live_gap_alloc: tỷ trọng GMV Affiliate của các sản phẩm không có trong danh sách) */
      let rest=gap;for(const a of GA[r.date+'|'+r.acc]||[]){const v=Math.min(+a.gmv||0,rest);if(v<=0)continue;rest-=v;rows.push({d:r.date,ch,sid,gl:v,gv:0,o:0,lp:0,b:a.brand,k:bk(a.brand),id:'',cut:1,est:1})}
      if(rest>1e6)rows.push({d:r.date,ch,sid,gl:rest,gv:0,o:0,lp:0,b:UNB,k:bk(UNB),id:'',cut:1});gaps.push([r.date,sid,gap,gap-rest])}
    const affR=aff.map(r=>({d:r.date,ch:r.acc==='HO'?'HO':'MCN',sid:shId(r.acc),b:r.brand||'Khác',k:bk(r.brand||'Khác'),nmv:+r.aff_gmv||0,pl:r.aff_gmv_placed===''||r.aff_gmv_placed==null?null:+r.aff_gmv_placed,o:+r.aff_orders||0}));
    /* Affiliate tách Live / Video (aff_src_daily, có từ 10/2026); srcMin = ngày đầu có số tách theo ID kênh */
    const affS={live:[],video:[]},srcMin={};for(const r of afs){const sid=shId(r.acc);if(!srcMin[sid]||r.date<srcMin[sid])srcMin[sid]=r.date;if(!affS[r.src])continue;
      affS[r.src].push({d:r.date,ch:r.acc==='HO'?'HO':'MCN',sid,b:r.brand||'Khác',k:bk(r.brand||'Khác'),nmv:+r.aff_gmv||0,pl:+r.aff_gmv_placed||0,o:+r.aff_orders||0})}
    return {rows,aff:affR,affS,srcMin,gaps,items:I,max:mx}},
  tt:async()=>{const [ls,vd]=await Promise.all([csv('tiktok/data/live_sessions.csv'),csv('tiktok/data/video_daily.csv').catch(()=>[])]);
    const live=ls.map(r=>({d:r.date,ch:r.channel,cr:r.creator,ti:r.title,g:+r.gmv||0,o:+r.sku_orders||0,c:+r.customers||0,v:+r.viewers||0,du:+r.duration_min||0}));
    const video=vd.map(r=>({d:r.date,ch:r.channel,cr:r.creator,g:+r.gmv||0}));
    return {live,video,max:[...live,...video].reduce((a,r)=>r.d>a?r.d:a,'')}},
  web:async()=>{const [dl,sk,it]=await Promise.all([csv('website/data/web_daily.csv'),csv('website/data/web_sku_daily.csv'),csv('website/data/web_items.csv').catch(()=>[])]);
    const rows=dl.map(r=>({d:r.date,ch:r.channel,o:+r.orders||0,q:+r.qty||0,g:+r.gmv||0,co:+r.cancel_orders||0,cg:+r.cancel_gmv||0}));
    const sku=sk.map(r=>{const b=r.brand||'Chưa xác định';return {pf:'wb',d:r.date,ch:r.channel,id:r.sku,b,k:bk(b),camp:r.camp||'–',o:+r.orders||0,q:+r.qty||0,g:+r.gmv||0,co:+r.cancel_orders||0,cg:+r.cancel_gmv||0}});
    const items={};it.forEach(r=>items[r.sku]=r.name);
    return {rows,sku,items,min:rows.reduce((a,r)=>!a||r.d<a?r.d:a,''),max:rows.reduce((a,r)=>r.d>a?r.d:a,'')}},
  ttp:async()=>{const [pd,pr]=await Promise.all([csv('tiktok/data/product_daily.csv'),csv('tiktok/data/products.csv')]);
    const P={};pr.forEach(r=>P[r.product_id]=r);
    return {rows:pd.map(r=>({pf:'tt',d:r.date,ch:r.channel,cr:r.creator,id:r.product_id,g:+r.gmv||0,gl:+r.live_direct_gmv||0,gv:+r.video_direct_gmv||0,o:+r.orders||0,b:(P[r.product_id]||{}).brand||'Chưa xác định'})).map(r=>(r.k=bk(r.b),r)),P,
      min:pd.reduce((a,r)=>!a||r.date<a?r.date:a,''),max:pd.reduce((a,r)=>r.date>a?r.date:a,'')}},
  md:async()=>{const [camps,daily,sts]=await Promise.all([csv('media/data/campaigns.csv'),csv('media/data/campaign_daily.csv'),csv('media/data/campaign_status.csv').catch(()=>[])]);
    const C={},STS={};camps.forEach(c=>C[c.key]=c);sts.forEach(r=>STS[r.key]=r);let mx='',smx='';
    const rows=daily.map(r=>{const c=C[r.key]||{};const ch=c.channel||'?';let f='video';
      if(c.type==='gmv_max_live'||ch==='Shopee'||(c.type==='ads'&&ch==='TikTok'&&/lsa|live|realtime|retarget/i.test(c.name||'')))f='live';
      if(+r.spend&&r.date>mx)mx=r.date;if(ch==='Shopee'&&+r.spend&&r.date>smx)smx=r.date;
      return {k:r.key,d:r.date,ch,f,sp:+r.spend||0,rv:+r.revenue||0,od:+r.orders||0,im:+r.impressions||0,cl:+r.clicks||0,camp:c.name||r.key,acc:c.account||'',ob:c.objective||'(trống)'}}).filter(r=>r.sp||r.rv);
    const shOn=new Set(rows.filter(r=>r.ch==='Shopee'&&r.d===smx&&r.sp).map(r=>r.k));
    const shFresh=smx&&smx>=addD(mx,-1);
    rows.forEach(r=>{r.st=r.ch==='Shopee'?(!shFresh?'na':shOn.has(r.k)?'on':'off'):STS[r.k]?(STS[r.k].status==='ACTIVE'?'on':'off'):'na'});
    return {rows,max:mx,stDay:sts.reduce((a,r)=>r.checked>a?r.checked:a,''),shDay:smx,shFresh}},
  /* category cấp 1/2/3 theo sản phẩm (tools/category/build.py): Shopee = category của Shopee; TikTok / Scom = ước tính theo sản phẩm Shopee cùng brand, tên gần nhất (est=1) */
  cat:async()=>{const r=await csv('category/data/item_cat.csv');const M={sh:{},tt:{},wb:{}};for(const x of r)if(M[x.pf]&&x.c1)M[x.pf][x.id]=[x.c1,x.c2||'',x.c3||'',x.est==='1'];return M},
  fin:async()=>{const r=await csv('finance/data/payments.csv');const rows=r.map(x=>({pf:x.platform,acc:x.account,d:x.date,amt:+x.amount||0,sub:x.subtotal===''||x.subtotal==null?null:+x.subtotal,tax:x.tax===''||x.tax==null?null:+x.tax,st:x.status,kind:x.kind||'',doc:x.doc||''}));
    const mx={},mn={};rows.forEach(x=>{if(!mx[x.pf]||x.d>mx[x.pf])mx[x.pf]=x.d;if(!mn[x.pf]||x.d<mn[x.pf])mn[x.pf]=x.d});return {rows,max:mx,min:mn}},
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
  shAcc:'all',shIds:new Set(),shFmt:'all',ttAcc:'all',ttIds:new Set(),ttFmt:'all',c1:'',c2:'',c3:'',pop:'',mpQ:{},brPf:'all',brPfS:new Set(),brIds:new Set(),brSelS:new Set(),finAcc:'all',finSt:'all',finKind:'all',mdCh:'all',mdSt:'all',mdObj:new Set(),brPfs:new Set(['sh','tt','wb']),brAcc:'all',pdPf:'all',pdQ:'',wbCh:'web',brands:new Set(),brQ:'',brOpen:false,sort:{}};
function preset(p){const e=YD;if(p==='d')return [e,e];if(p==='7')return [addD(e,-6),e];if(p==='30')return [addD(e,-29),e];
  if(p==='mtd')return [e.slice(0,8)+'01',e];if(p==='ytd')return [e.slice(0,4)+'-01-01',e];if(p==='lm'){const t=addD(e.slice(0,8)+'01',-1);return [t.slice(0,8)+'01',t]}return [S.f,S.t]}
const prevRange=(f,t)=>{const n=Math.round((dt(t)-dt(f))/864e5)+1;return [addD(f,-n),addD(f,-1)]};
const days=(f,t)=>{const a=[];for(let d=f;d<=t;d=addD(d,1))a.push(d);return a};
const chartDays=(f,t)=>{const n=days(f,t);return n.length>=7?n:days(addD(t,-13),t)};
const inR=(r,f,t)=>r.d>=f&&r.d<=t;
const accOk=(r,a)=>a==='all'||r.ch===a;
/* category filter: dòng sản phẩm (pf + id) khớp cate 1 / 2 / 3 đang chọn; dòng không có sản phẩm (Affiliate theo brand, phần GMV chưa phân bổ) bị loại khi lọc */
const catOn=()=>!!S.c1;
const catOf=r=>D.cat&&r.pf&&D.cat[r.pf]?D.cat[r.pf][r.id]:null;
const catOk=r=>{if(!S.c1)return true;const c=catOf(r);return !!c&&c[0]===S.c1&&(!S.c2||c[1]===S.c2)&&(!S.c3||c[2]===S.c3)};
const brOk=r=>(!S.brands.size||S.brands.has(r.k))&&catOk(r);
/* lọc theo sản phẩm (brand hoặc category) đang bật */
const pfOn=()=>S.brands.size>0||catOn();
const catLabel=()=>[S.c1,S.c2,S.c3].filter(Boolean).join(' › ');
const fLabel=()=>[S.brands.size?'brand '+brLabel():'',catOn()?'category '+catLabel():''].filter(Boolean).join(' · ');
/* ID kênh (chọn nhiều): Set rỗng = tất cả */
const sidOk=(r,ids)=>!ids||!ids.size||ids.has(r.sid);
const crOk=(r,ids)=>!ids||!ids.size||ids.has(r.cr);

/* ---------- aggregates ---------- */
const affRows=fmt=>D.sh.affS&&D.sh.affS[fmt]?D.sh.affS[fmt]:D.sh.aff;
function shTot(f,t,acc='all',fmt='all',brand=S.brands,ids=null){const s={gl:0,gv:0,o:0,lp:0,nmv:0,apl:0,anm:0,ao:0};if(!D.sh)return s;
  for(const r of D.sh.rows)if(inR(r,f,t)&&accOk(r,acc)&&sidOk(r,ids)&&(!brand||!brand.size||brand.has(r.k))&&catOk(r)){s.gl+=r.gl;s.gv+=r.gv;s.o+=r.o;s.lp+=r.lp}
  /* Affiliate chỉ có theo brand, không lọc được theo category */
  if(!catOn())for(const r of affRows(fmt))if(inR(r,f,t)&&accOk(r,acc)&&sidOk(r,ids)&&(!brand||!brand.size||brand.has(r.k))){s.nmv+=r.nmv;s.ao+=r.o;if(r.pl!=null){s.apl+=r.pl;s.anm+=r.nmv}}
  if(catOn()){s.nmv=null;s.ao=null}
  s.g=fmt==='live'?s.gl:fmt==='video'?s.gv:s.gl+s.gv;s.cancel=s.apl?1-s.anm/s.apl:null;s.aov=div(s.lp,s.o);return s}
function ttTot(f,t,acc='all',fmt='all',ids=null){const s={gl:0,gv:0,o:0,c:0,v:0,n:0,du:0};
  if(pfOn()){if(!D.ttp)return (s.g=0,s);let g=0;for(const r of D.ttp.rows)if(inR(r,f,t)&&accOk(r,acc)&&crOk(r,ids)&&brOk(r)){g+=r.g;s.gl+=r.gl;s.gv+=r.gv;s.o+=r.o}
    s.g=fmt==='live'?s.gl:fmt==='video'?s.gv:g;s.n=null;s.aov=div(g,s.o);s.br=1;return s}
  if(!D.tt)return s;
  if(fmt!=='video')for(const r of D.tt.live)if(inR(r,f,t)&&accOk(r,acc)&&crOk(r,ids)){s.gl+=r.g;s.o+=r.o;s.c+=r.c;s.v+=r.v;s.n++;s.du+=r.du}
  if(fmt!=='live')for(const r of D.tt.video)if(inR(r,f,t)&&accOk(r,acc)&&crOk(r,ids))s.gv+=r.g;
  s.g=s.gl+s.gv;s.aov=div(s.gl,s.o);s.gph=div(s.gl,s.du/60);return s}
const OBJ_N={OUTCOME_SALES:'Sales',OUTCOME_ENGAGEMENT:'Engagement',OUTCOME_AWARENESS:'Awareness',OUTCOME_TRAFFIC:'Traffic',OUTCOME_LEADS:'Leads',OUTCOME_APP_PROMOTION:'App promotion',GMV_MAX:'GMV Max',PRODUCT_SALES:'Product sales',LIVE_ADS:'Live Ads',VIDEO_VIEWS:'Video views',WEB_CONVERSIONS:'Web conversions',ENGAGEMENT:'Engagement',REACH:'Reach',TRAFFIC:'Traffic'};
const objN=o=>OBJ_N[o]||o;
const stOk=r=>S.mdSt==='all'||r.st===S.mdSt;
const roasL=ch=>ch==='TikTok'?'ROI':ch==='all'?'ROAS/ROI':'ROAS';
function mdTot(f,t,ch='all',ob=null,st=false){const s={sp:0,rv:0,od:0,im:0,cl:0};if(!D.md)return s;
  for(const r of D.md.rows)if(inR(r,f,t)&&(ch==='all'||r.ch===ch)&&(!ob||!ob.size||ob.has(r.ch+'|'+r.ob))&&(!st||stOk(r))){s.sp+=r.sp;s.rv+=r.rv;s.od+=r.od;s.im+=r.im;s.cl+=r.cl}
  s.roas=div(s.rv,s.sp);s.ctr=div(s.cl,s.im);s.cpc=div(s.sp,s.cl);s.aov=div(s.rv,s.od);return s}
function webTot(f,t,ch='web'){const s={g:0,o:0,q:0,co:0,cg:0};if(!D.web)return s;for(const r of (pfOn()?D.web.sku.filter(brOk):D.web.rows))if(inR(r,f,t)&&(ch==='all'||r.ch===ch)){s.g+=r.g;s.o+=r.o;s.q+=r.q;s.co+=r.co;s.cg+=r.cg}
  s.aov=div(s.g,s.o);s.cancel=div(s.co,s.o+s.co);return s}
function series(rows,f,t,val,filt){const m={};for(const r of rows)if(inR(r,f,t)&&(!filt||filt(r)))m[r.d]=(m[r.d]||0)+val(r);return m}
function groupSum(rows,key,fields,filt){const G=new Map();for(const r of rows){if(filt&&!filt(r))continue;const k=typeof key==='function'?key(r):r[key];let a=G.get(k);
  if(!a){a={k};fields.forEach(x=>a[x]=0);G.set(k,a)}fields.forEach(x=>a[x]+=r[x]||0)}return [...G.values()]}

/* brands across Shopee (Creator GMV) + TikTok (product GMV) */
function brandTable(f,t,pf,acc,web=false,ids=null){const M=new Map(),has=x=>pf==='all'||(pf instanceof Set?pf.has(x):pf===x),idOk=k=>!ids||!ids.size||ids.has(k);
  const add=(name,field,v)=>{if(!v)return;const k=bk(name);let o=M.get(k);if(!o){o={k,names:{},sh:0,sha:0,shn:0,tt:0,shl:0,shv:0,ttl:0,ttv:0,wb:0,wbg:0};M.set(k,o)}o[field]+=v;o.names[name]=(o.names[name]||0)+v};
  if(has('sh')&&D.sh)for(const r of D.sh.rows)if(inR(r,f,t)&&accOk(r,acc)&&idOk('sh:'+r.sid)&&catOk(r)){add(r.b,'sh',r.gl+r.gv);add(r.b,'shl',r.gl);add(r.b,'shv',r.gv)}
  if(has('sh')&&D.sh&&!catOn())for(const src of ['live','video'])for(const r of (D.sh.affS[src]||[]))if(inR(r,f,t)&&accOk(r,acc)&&idOk('sh:'+r.sid)&&M.has(r.k))M.get(r.k).sha+=r.pl;
  /* NMV Shopee = Affiliate NMV (đã trừ huỷ, mọi nguồn) của brand */
  if(has('sh')&&D.sh&&!catOn())for(const r of D.sh.aff)if(inR(r,f,t)&&accOk(r,acc)&&idOk('sh:'+r.sid)&&M.has(r.k))M.get(r.k).shn+=r.nmv;
  if(has('tt')&&D.ttp)for(const r of D.ttp.rows)if(inR(r,f,t)&&accOk(r,acc)&&idOk('tt:'+r.cr)&&catOk(r)){add(r.b,'tt',r.g);add(r.b,'ttl',r.gl);add(r.b,'ttv',r.gv)}
  if(web&&has('wb')&&acc!=='MCN'&&D.web&&idOk('wb:web'))for(const r of D.web.sku)if(r.ch==='web'&&inR(r,f,t)&&catOk(r)){add(r.b,'wb',r.g);add(r.b,'wbg',r.g+r.cg)}
  return [...M.values()].map(o=>({...o,name:Object.entries(o.names).sort((a,b)=>b[1]-a[1])[0][0],g:o.sh+o.tt+(web?o.wb:0)}))}

/* Shopee live channel IDs present in the data: [[id, 'HO'|'MCN']], by GMV */
let SHI=null;function shIds(){if(SHI)return SHI;const M=new Map();for(const r of D.sh.rows){const o=M.get(r.sid)||{c:r.ch,g:0};o.g+=r.gl+r.gv;M.set(r.sid,o)}
  return SHI=[...M].sort((a,b)=>(a[1].c==='HO'?0:1)-(b[1].c==='HO'?0:1)||b[1].g-a[1].g).map(([i,o])=>[i,o.c])}
/* products across platforms (brand filter applied) */
function prodList(f,t,pf='all',xf=null){const R=[],ok=r=>!xf||xf(r);
  if((pf==='all'||pf==='sh')&&D.sh)groupSum(D.sh.rows.filter(r=>!r.cut&&inR(r,f,t)&&brOk(r)).map(r=>({id:r.id,g:r.gl+r.gv,gl:r.gl,gv:r.gv,o:r.o})),'id',['g','gl','gv','o']).forEach(o=>{if(!o.g)return;const it=D.sh.items[o.k]||{};R.push({...o,pf:'Shopee',name:cleanTitle(it.title||o.k),brand:it.brand||'–'})});
  if((pf==='all'||pf==='tt')&&D.ttp)groupSum(D.ttp.rows.filter(r=>inR(r,f,t)&&brOk(r)&&ok(r)),'id',['g','gl','gv','o']).forEach(o=>{if(!o.g)return;const p=D.ttp.P[o.k]||{};R.push({...o,pf:'TikTok',name:cleanTitle(p.name||o.k),brand:p.brand||'–'})});
  if((pf==='all'||pf==='wb')&&D.web)groupSum(D.web.sku.filter(r=>r.ch==='web'&&inR(r,f,t)&&brOk(r)),'id',['g','o']).forEach(o=>{if(!o.g)return;const b=(D.web.sku.find(r=>r.id===o.k)||{}).b;R.push({...o,gl:null,gv:null,pf:'Website',name:D.web.items[o.k]||o.k,brand:b||'–'})});
  const P={Shopee:'sh',TikTok:'tt',Website:'wb'};R.forEach(o=>{const c=catOf({pf:P[o.pf],id:o.k});o.cat=c?[c[1]||c[0],c[2]].filter(Boolean).join(' › ')+(c[3]?' *':''):'–'});
  return R}
/* brand list for the global filter: all loaded sources, by GMV */
let BR=null,BRsig='';
function brandOpts(){const sig=['sh','ttp','web'].map(k=>ST[k]).join();if(BR&&sig===BRsig)return BR;BRsig=sig;const M=new Map();
  const add=(k,n,v)=>{let o=M.get(k);if(!o){o={k,n:{},g:0};M.set(k,o)}o.g+=v;o.n[n]=(o.n[n]||0)+v+1};
  if(D.sh)D.sh.rows.forEach(r=>add(r.k,r.b,r.gl+r.gv));if(D.ttp)D.ttp.rows.forEach(r=>add(r.k,r.b,r.g));if(D.web)D.web.sku.forEach(r=>add(r.k,r.b,r.g));
  M.delete(bk('Chưa xác định'));M.delete(bk('Khác'));
  BR=[...M.values()].sort((a,b)=>b.g-a.g).map(o=>[o.k,Object.entries(o.n).sort((a,b)=>b[1]-a[1])[0][0]]);return BR}
const brandName=k=>(brandOpts().find(x=>x[0]===k)||[k,k])[1];
const brLabel=()=>{const n=[...S.brands].map(brandName);return n.length<=3?n.join(', '):n.slice(0,3).join(', ')+` +${n.length-3}`};
/* multi-brand picker in the topbar */
function brandPicker(){const n=S.brands.size,q=bkey(S.brQ),O=brandOpts();
  const list=[...O.filter(([k])=>S.brands.has(k)),...O.filter(([k,nm])=>!S.brands.has(k)&&(!q||bkey(nm).includes(q)))].slice(0,n+200);
  return `<div class="bp ${S.brOpen?'open':''}"><button type="button" class="brand-sel bp-btn" id="bpBtn" title="Lọc theo brand (chọn được nhiều)">${n?`Brand: ${esc(n===1?brLabel():n+' brand')}`:'Tất cả brand'} ▾</button>
   ${S.brOpen?`<div class="bp-pop"><div class="bp-top"><input id="bpQ" placeholder="Tìm brand…" value="${esc(S.brQ)}" autocomplete="off"><button type="button" class="bp-clear" id="bpClr" ${n?'':'disabled'}>Bỏ chọn (${n})</button></div>
   <div class="bp-list">${list.map(([k,nm])=>`<label class="bp-it"><input type="checkbox" data-bk="${esc(k)}" ${S.brands.has(k)?'checked':''}><span>${esc(nm)}</span></label>`).join('')||'<div class="bp-empty">Không có brand khớp</div>'}</div>
   <div class="bp-foot"><button type="button" class="bp-done" id="bpDone">Xong</button></div></div>`:''}</div>`}
function bindBrandPicker(){const b=$('#bpBtn');if(!b)return;
  b.onclick=e=>{e.stopPropagation();S.brOpen=!S.brOpen;render();if(S.brOpen){const q=$('#bpQ');q&&q.focus()}};
  const pop=b.parentElement.querySelector('.bp-pop');if(!pop)return;pop.onclick=e=>e.stopPropagation();
  pop.querySelectorAll('input[data-bk]').forEach(c=>c.onchange=()=>{const k=c.dataset.bk;c.checked?S.brands.add(k):S.brands.delete(k);const y=pop.querySelector('.bp-list').scrollTop;render();const l=document.querySelector('#bpBtn+.bp-pop .bp-list');if(l)l.scrollTop=y});
  const q=$('#bpQ');let tm;q.oninput=()=>{clearTimeout(tm);tm=setTimeout(()=>{S.brQ=q.value;render();const n=$('#bpQ');n.focus();n.setSelectionRange(n.value.length,n.value.length)},200)};
  $('#bpClr').onclick=()=>{S.brands.clear();render()};$('#bpDone').onclick=()=>{S.brOpen=false;render()}}
document.addEventListener('click',()=>{if(S.brOpen||S.pop){S.brOpen=false;S.pop='';render()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(S.brOpen||S.pop)){S.brOpen=false;S.pop='';render()}});

/* TikTok: ID kênh = creator, theo GMV (live + video): [[handle,'HO'|'MCN']] */
let TTI=null;function ttIds(){if(TTI)return TTI;const M=new Map();for(const r of [...D.tt.live,...D.tt.video]){const o=M.get(r.cr)||{c:r.ch,g:0};o.g+=r.g;M.set(r.cr,o)}
  return TTI=[...M].filter(([i])=>i).sort((a,b)=>(a[1].c==='HO'?0:1)-(b[1].c==='HO'?0:1)||b[1].g-a[1].g).map(([i,o])=>[i,o.c])}
/* dropdown chọn nhiều (ID kênh): key = tên state (Set) trong S; opts [[value,label]] */
function multiPick(key,label,opts,allLabel='Tất cả ID'){const set=S[key],n=[...set].filter(v=>opts.some(o=>o[0]===v)).length,open=S.pop===key,q=bkey(S.mpQ[key]||'');
  const names=opts.filter(o=>set.has(o[0])).map(o=>o[1]);
  const list=opts.filter(([v,l])=>set.has(v)||!q||bkey(l).includes(q));
  return `<div class="fg"><label>${label}</label><div class="bp ${open?'open':''}"><button type="button" class="brand-sel bp-btn mp-btn" data-mp="${key}">${n?esc(n<=2?names.join(', '):names.slice(0,2).join(', ')+` +${n-2}`):allLabel} ▾</button>
   ${open?`<div class="bp-pop" data-mpop="${key}">${opts.length>8?`<div class="bp-top"><input data-mpq="${key}" placeholder="Tìm…" value="${esc(S.mpQ[key]||'')}" autocomplete="off"><button type="button" class="bp-clear" data-mpclr="${key}" ${n?'':'disabled'}>Bỏ chọn (${n})</button></div>`:`<div class="bp-top"><button type="button" class="bp-clear" data-mpclr="${key}" ${n?'':'disabled'}>Bỏ chọn (${n})</button></div>`}
   <div class="bp-list">${list.map(([v,l])=>`<label class="bp-it"><input type="checkbox" data-mpk="${esc(v)}" ${set.has(v)?'checked':''}><span>${esc(l)}</span></label>`).join('')||'<div class="bp-empty">Không có ID khớp</div>'}</div>
   <div class="bp-foot"><button type="button" class="bp-done" data-mpdone="${key}">Xong</button></div></div>`:''}</div></div>`}
function bindMultiPick(){
  document.querySelectorAll('[data-mp]').forEach(b=>b.onclick=e=>{e.stopPropagation();const k=b.dataset.mp;S.brOpen=false;S.pop=S.pop===k?'':k;render();const q=document.querySelector(`[data-mpq="${k}"]`);q&&q.focus()});
  document.querySelectorAll('[data-mpop]').forEach(pop=>{const k=pop.dataset.mpop,set=S[k];pop.onclick=e=>e.stopPropagation();
    pop.querySelectorAll('input[data-mpk]').forEach(c=>c.onchange=()=>{c.checked?set.add(c.dataset.mpk):set.delete(c.dataset.mpk);const y=pop.querySelector('.bp-list').scrollTop;render();const l=document.querySelector(`[data-mpop="${k}"] .bp-list`);if(l)l.scrollTop=y});
    const q=pop.querySelector('[data-mpq]');if(q){let tm;q.oninput=()=>{clearTimeout(tm);tm=setTimeout(()=>{S.mpQ[k]=q.value;render();const n=document.querySelector(`[data-mpq="${k}"]`);n.focus();n.setSelectionRange(n.value.length,n.value.length)},200)}}
    const c=pop.querySelector('[data-mpclr]');if(c)c.onclick=()=>{set.clear();render()};
    pop.querySelector('[data-mpdone]').onclick=()=>{S.pop='';render()}})}

/* category cấp 1 / 2 / 3: cây theo GMV của các nguồn đã tải */
let CT=null,CTsig='';
function catTree(){const sig=['cat','sh','ttp','web'].map(k=>ST[k]).join();if(CT&&sig===CTsig)return CT;CTsig=sig;const T=new Map();if(!D.cat)return CT=T;
  const add=(r,v)=>{const c=catOf(r);if(!c)return;let a=T.get(c[0]);if(!a){a={g:0,ch:new Map()};T.set(c[0],a)}a.g+=v;if(!c[1])return;let b=a.ch.get(c[1]);if(!b){b={g:0,ch:new Map()};a.ch.set(c[1],b)}b.g+=v;if(c[2])b.ch.set(c[2],(b.ch.get(c[2])||0)+v)};
  if(D.sh)D.sh.rows.forEach(r=>r.id&&add(r,r.gl+r.gv));if(D.ttp)D.ttp.rows.forEach(r=>add(r,r.g));if(D.web)D.web.sku.forEach(r=>add(r,r.g));return CT=T}
const byG=m=>[...m].sort((a,b)=>((b[1].g??b[1])-(a[1].g??a[1]))).map(x=>x[0]);
function catPicker(){if(!ready('cat'))return '';const T=catTree(),a=T.get(S.c1),b=a&&a.ch.get(S.c2);
  const s=(k,ph,opts,dis)=>`<select class="cat-sel" data-s="${k}" ${dis?'disabled':''} title="${ph}"><option value="">${ph}</option>${opts.map(o=>`<option value="${esc(o)}" ${S[k]===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
  return `<span class="cats">${s('c1','Cate 1: tất cả',byG(T))}${s('c2','Cate 2: tất cả',a?byG(a.ch):[],!a)}${s('c3','Cate 3: tất cả',b?byG(b.ch):[],!b)}</span>`}

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
function table(id,title,note,cols,rows,{limit=50,def,total,groups}={}){const st=S.sort[id]||def||{k:cols[1]?cols[1].k:cols[0].k,asc:false};
  const R=[...rows].sort((a,b)=>{const x=a[st.k],y=b[st.k];const c=typeof x==='string'||typeof y==='string'?String(x??'').localeCompare(String(y??''),'vi'):(x??-Infinity)-(y??-Infinity);return st.asc?c:-c});
  return `<div class="table-wrap"><h3><span>${title}</span><small>${note||''}${R.length>limit?` · top ${limit}/${R.length}`:''}</small></h3><div class="tscroll"><table><thead>${groups?`<tr class="tr-grp"><th></th>${groups.map(g=>`<th colspan="${g.span}" class="${g.cls||''}">${g.l}</th>`).join('')}</tr>`:''}<tr><th style="width:36px;cursor:default">#</th>${cols.map(c=>`<th data-t="${id}" data-k="${c.k}" class="${c.r?'r ':''}${c.cls?c.cls+' ':''}${st.k===c.k?'on'+(st.asc?' asc':''):''}">${c.l}</th>`).join('')}</tr></thead><tbody>
  ${total?`<tr class="tr-total"><td></td>${cols.map((c,i)=>`<td class="${c.r?'r':''}${c.cls?' '+c.cls:''}">${i===0?'Tổng':total[c.k]!=null?(c.f?c.f(total[c.k],total):total[c.k]):''}</td>`).join('')}</tr>`:''}
  ${R.slice(0,limit).map((o,i)=>`<tr><td>${rank(i)}</td>${cols.map((c,j)=>`<td class="${c.r?'r':''}${c.cls?' '+c.cls:''}${j===0?' name':''}" ${j===0?`title="${esc(o[c.k])}"`:''}>${c.f?c.f(o[c.k],o):esc(o[c.k])}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${cols.length+1}" style="text-align:center;color:var(--text-3);padding:24px">Không có số trong kỳ này</td></tr>`}
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
  const plan=null;/* chỉ dùng số trên nền tảng, không dùng sheet GMV target */
  const per=`${fd(f)}${f!==t?' – '+fd(t):''}`;

  /* ===== COMMERCIAL ===== */
  h+=`<section class="module">${modHead('Commercial','pink','',`GMV · ${per}${pfOn()?' · '+esc(fLabel()):''}`)}`;
  if(pfOn())h+=`<div class="warnbox">Đang lọc <b>${esc(fLabel())}</b>: Shopee = GMV Seller theo SKU, TikTok = GMV sản phẩm (có từ ${D.ttp?fdy(D.ttp.min):'–'}), Website = GMV sản phẩm.${catOn()?' Category: Shopee theo category Shopee; TikTok và Website ước tính theo sản phẩm Shopee cùng brand, tên gần nhất; Affiliate NMV để trống.':''}</div>`;
  if(!ready('sh','tt'))h+=waitBox('sh','tt');
  else{const src=[['Shopee',sh.g,C.shopee,`Live ${money(sh.gl)} · Video ${money(sh.gv)}`],['TikTok',tt.g,C.tiktok,`Live ${money(tt.gl)} · Video ${money(tt.gv)}`],['Website',wb.g,C.web,hasWeb?`${int(wb.o)} đơn · AOV ${money(wb.aov)}`:'']];
    h+=`<div class="hero-gmv segc"><div><div class="hero-label">GMV tổng</div><div class="segc-top"><span class="hero-value">${money(tot)}</span>${delta(totD)}</div>${hasWeb&&!wbCov?`<div class="kpi-sub">So sánh kỳ trước chỉ tính Shopee + TikTok (website có số từ ${fd(D.web.min)})</div>`:''}
      <div class="segc-row">${src.map(([l,v,c,d])=>`<div class="segc-it" style="flex:${Math.max(v||0,tot*0.2)}"><i style="background:${c}" title="${l}: ${money(v)}"></i><div class="segc-l"><b>${l} ${money(v)}</b> · ${pct(div(v,tot))}</div>${d?`<div class="kpi-sub">${d}</div>`:''}</div>`).join('')}</div></div></div>`;
    h+=`<div class="ch-row">${[
      chCard({cls:'shopee',icon:ICON.shopee,name:'Shopee',go:'shopee',max:D.sh.max,val:money(sh.g),delta:delta(chg(sh.g,shp.g)),share:div(sh.g,tot),
        lines:[sub('Live',money(sh.gl)),sub('Video',money(sh.gv)),sub('HO / MCN',`${money(shTot(f,t,'HO').g)} / ${money(shTot(f,t,'MCN').g)}`),sub('Affiliate NMV',money(sh.nmv),'huỷ '+pct(sh.cancel))]}),
      chCard({cls:'tiktok',icon:ICON.tiktok,name:'TikTok',go:'tiktok',max:D.tt.max,val:money(tt.g),delta:delta(chg(tt.g,ttp.g)),share:div(tt.g,tot),
        lines:[sub('Live',money(tt.gl)),sub('Video',money(tt.gv)),sub('HO / MCN',`${money(ttTot(f,t,'HO').g)} / ${money(ttTot(f,t,'MCN').g)}`),(tt.br?sub('Đơn',int(tt.o),'AOV '+money(tt.aov)):sub('Phiên live',int(tt.n),'AOV '+money(tt.aov)))]}),
      hasWeb?chCard({cls:'web',icon:ICON.web,name:'Hannaholala.com',go:'web',max:D.web.max,val:money(wb.g),delta:wbCov?delta(chg(wb.g,wbp.g)):`<div class="kpi-delta flat">Có số từ ${fd(D.web.min)}</div>`,share:div(wb.g,tot),
        lines:[sub('Đơn',int(wb.o),'AOV '+money(wb.aov)),sub('Nguồn','Báo cáo Haravan','mọi kênh, đã bỏ đơn huỷ')]})
        :chCard({cls:'web',icon:ICON.web,name:'Hannaholala.com',na:ST.web==='err'?'Không tải được dữ liệu website.':'Đang tải…'})].join('')}</div>`;
    const X=chartDays(f,t);const a=series(D.sh.rows,X[0],X[X.length-1],r=>r.gl+r.gv,brOk),b=pfOn()?(D.ttp?series(D.ttp.rows,X[0],X[X.length-1],r=>r.g,brOk):{}):series([...D.tt.live,...D.tt.video],X[0],X[X.length-1],r=>r.g),w=hasWeb?(pfOn()?series(D.web.sku,X[0],X[X.length-1],r=>r.g,r=>r.ch==='web'&&brOk(r)):series(D.web.rows,X[0],X[X.length-1],r=>r.g,r=>r.ch==='web')):{};
    h+=`<div class="chart-grid">${chartCard('ov-daily','GMV theo ngày',`Shopee + TikTok + Website · ${fd(X[0])} – ${fd(X[X.length-1])}`,true)}${ready('ttp')?pfOn()?chartCard('ov-brand','Top 10 sản phẩm',`${esc(fLabel())} · Shopee + TikTok + Website`,true):chartCard('ov-brand','Top 10 Brand',`Shopee + TikTok + Website${D.ttp.min>f?' · TikTok brand có từ '+fd(D.ttp.min):''}`,true):waitBox('ttp')}</div>`;
    plot('ov-daily',barCfg(X.map(fd),[{label:'Shopee',data:X.map(d=>a[d]||0),backgroundColor:C.shopee,borderRadius:3},{label:'TikTok',data:X.map(d=>b[d]||0),backgroundColor:C.tiktok,borderRadius:3},{label:'Website',data:X.map(d=>w[d]||0),backgroundColor:C.web,borderRadius:3}]));
    if(ready('ttp')&&pfOn()){const top=prodList(f,t).sort((x,y)=>y.g-x.g).slice(0,10);const cut=n=>n.length>38?n.slice(0,36)+'…':n;
      plot('ov-brand',barCfg(top.map(o=>cut(o.name)),['Shopee','TikTok','Website'].map((pf,i)=>({label:pf,data:top.map(o=>o.pf===pf?o.g:0),backgroundColor:[C.shopee,C.tiktok,C.web][i],borderRadius:3})),{horizontal:true}))}
    else if(ready('ttp')){const top=brandTable(f,t,'all','all',hasWeb).sort((x,y)=>y.g-x.g).slice(0,10);
      plot('ov-brand',barCfg(top.map(o=>o.name),[{label:'Shopee',data:top.map(o=>o.sh),backgroundColor:C.shopee,borderRadius:3},{label:'TikTok',data:top.map(o=>o.tt),backgroundColor:C.tiktok,borderRadius:3},{label:'Website',data:top.map(o=>o.wb),backgroundColor:C.web,borderRadius:3}],{horizontal:true}))}}
  h+=`</section>`;

  /* ===== MEDIA ===== */
  h+=`<section class="module">${modHead('Media','web','media',`Ads · ${per}`)}`;
  if(!ready('md'))h+=waitBox('md');
  else{h+=`<div class="kpi-grid">${[kpi('Ad Spend',money(md.sp),'web',delta(chg(md.sp,mdp.sp),0)),kpi('Ad GMV',money(md.rv),'pink',delta(chg(md.rv,mdp.rv))),kpi('ROAS/ROI',xx(md.roas),'green',delta(chg(md.roas,mdp.roas))),
      kpi('Đơn từ ads',int(md.od),'gold',delta(chg(md.od,mdp.od)),'AOV '+money(md.aov)),kpi('Spend / GMV tổng',pct(div(md.sp,tot)),'tiktok',null,'Chi phí ads trên GMV Commercial')].join('')}</div>`;
    const X=chartDays(f,t),SP=series(D.md.rows,X[0],X[X.length-1],r=>r.sp),RV=series(D.md.rows,X[0],X[X.length-1],r=>r.rv);
    h+=`<div class="chart-grid wide">${chartCard('ov-md','Spend & Ad GMV theo ngày',`ROAS/ROI trục phải · ${fd(X[0])} – ${fd(X[X.length-1])}`)}<div class="chart-card"><h3>Theo kênh ads</h3><p class="sub">Spend · ROAS (TikTok: ROI)</p>
      ${['Meta','TikTok','Shopee'].map(c=>{const x=mdTot(f,t,c),xp=mdTot(pf,pt,c);return sub(c,money(x.sp),roasL(c)+' '+xx(x.roas)+' · '+(chg(x.sp,xp.sp)==null?'–':(chg(x.sp,xp.sp)>=0?'+':'')+pct(chg(x.sp,xp.sp))))}).join('')}
      ${sub('Số tới',fd(D.md.max))}</div></div>`;
    plot('ov-md',barCfg(X.map(fd),[{label:'Spend',data:X.map(d=>SP[d]||0),backgroundColor:C.web2,borderRadius:3},{label:'Ad GMV',data:X.map(d=>RV[d]||0),backgroundColor:C.web,borderRadius:3},
      {label:'ROAS/ROI',data:X.map(d=>SP[d]?RV[d]/SP[d]:null),type:'line',yAxisID:'y1',borderColor:C.gold,backgroundColor:C.gold,pointRadius:2,tension:.3}],{stacked:false,line:true}))}
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

const UNB='Chưa phân bổ brand';function vShopee(){const [f,t]=[S.f,S.t],[pf,pt]=prevRange(f,t);const [pp,pc]=fresh(D.sh&&D.sh.max);
  let h=secHead(ICON.shopee+' Shopee — Live, Video & Affiliate',pp,pc)+`<div class="filter-bar">${sel('shAcc','Account',S.shAcc,ACC)}${ready('sh')?multiPick('shIds','ID kênh (chọn nhiều)',shIds().filter(([i,c])=>S.shAcc==='all'||c===S.shAcc).map(([i,c])=>[i,`${i} (${c})`])):''}${sel('shFmt','Live / Video',S.shFmt,FMT)}</div>`;
  if(!ready('sh'))return h+waitBox('sh');
  const a=S.shAcc,ids=S.shIds,fm=S.shFmt,s=shTot(f,t,a,fm,S.brands,ids),p=shTot(pf,pt,a,fm,S.brands,ids),shOk=r=>accOk(r,a)&&sidOk(r,ids);
  {const no=[...ids].filter(i=>!D.sh.aff.some(r=>r.sid===i));if(no.length)h+=`<div class="warnbox">ID ${esc(no.join(', '))} chưa có số Affiliate: NMV và tỷ lệ huỷ không tính ID này.</div>`}
  if(catOn())h+=`<div class="warnbox">Đang lọc category <b>${esc(catLabel())}</b> (category Shopee của sản phẩm): Affiliate NMV và tỷ lệ huỷ chỉ có theo brand nên để trống; phần GMV live chưa phân bổ sản phẩm không tính.</div>`;
  {const g=(D.sh.gaps||[]).filter(([d,sd])=>inR({d},f,t)&&(!ids.size||ids.has(sd))&&(a==='all'||(sd==='hannahteam1'?'HO':'MCN')===a));
   if(g.length)h+=`<div class="warnbox">Creator Center chỉ trả tối đa 1.000 sản phẩm mỗi ngày: ${g.map(([d,sd,v,e])=>`${fd(d)} ${esc(sd)} thiếu ${money(v)}${e?` (đã chia ước tính ${money(e)} cho các brand)`:''}`).join(', ')} so với tổng chính thức. Phần thiếu được cộng vào GMV Seller Center và chia về brand theo tỷ trọng GMV Affiliate của các sản phẩm không có trong danh sách Creator Center (brand có dấu * là có phần ước tính); phần không chia được nằm ở dòng "${UNB}".</div>`}
  if(fm!=='all'){const m=shIds().filter(([i,c])=>(a==='all'||c===a)&&(!ids.size||ids.has(i))).map(([i])=>D.sh.srcMin[i]).filter(Boolean).sort().pop();
    if(!m)h+=`<div class="warnbox">Chưa có số Affiliate tách ${fm==='live'?'Live':'Video'}.</div>`;
    else if(pf<m)h+=`<div class="warnbox">Affiliate tách ${fm==='live'?'Live':'Video'} có từ ${fd(m)}; ngày trước đó (kể cả kỳ so sánh) không có số tách nên không tính.</div>`}
  const affL='Affiliate NMV'+(fm==='live'?' (Live)':fm==='video'?' (Video)':'');
  h+=`<div class="kpi-grid">${[kpi('GMV Seller',money(s.g),'shopee',delta(chg(s.g,p.g)),'GMV đơn đã đặt, Creator Center'),kpi('GMV Live',money(s.gl),'pink',delta(chg(s.gl,p.gl))),kpi('GMV Video',money(s.gv),'gold',delta(chg(s.gv,p.gv))),
    kpi(affL,money(s.nmv),'web',delta(chg(s.nmv,p.nmv)),`${int(s.ao)} đơn`),kpi('Tỷ lệ huỷ (Aff'+(fm==='live'?' Live':fm==='video'?' Video':'')+')',pct(s.cancel),'tiktok',delta(chg(s.cancel,p.cancel),-1)),kpi('Đơn live',int(s.o),'green',delta(chg(s.o,p.o)),`AOV ${money(s.aov)}`)].join('')}</div>`;
  const X=chartDays(f,t),flt=r=>shOk(r)&&brOk(r);const L=series(D.sh.rows,X[0],X[X.length-1],r=>r.gl,flt),Vv=series(D.sh.rows,X[0],X[X.length-1],r=>r.gv,flt),N=series(affRows(fm),X[0],X[X.length-1],r=>r.nmv,flt);
  const ds=[];if(fm!=='video')ds.push({label:'Live',data:X.map(d=>L[d]||0),backgroundColor:C.shopee,borderRadius:3,stack:'g'});if(fm!=='live')ds.push({label:'Video',data:X.map(d=>Vv[d]||0),backgroundColor:C.shopee2,borderRadius:3,stack:'g'});
  if(fm==='all')ds.push({label:'Affiliate NMV',data:X.map(d=>N[d]||0),type:'line',borderColor:C.web,backgroundColor:C.web,pointRadius:2,tension:.3,stack:'n'});
  const idl=shIds().filter(([i,c])=>(a==='all'||c===a)&&(!ids.size||ids.has(i))),accs=idl.map(([i])=>shTot(f,t,a,fm,S.brands,new Set([i])).g);
  h+=`<div class="chart-grid wide">${chartCard('sh-daily','GMV theo ngày',`${fd(X[0])} – ${fd(X[X.length-1])}`)}${chartCard('sh-acc','Theo ID kênh','GMV Seller theo ID kênh live')}</div>`;
  plot('sh-daily',barCfg(X.map(fd),ds));plot('sh-acc',donutCfg(idl.map(([i,c])=>`${i} (${c})`),accs,['#e94235','#9aa0a6','#f9ab00','#8e44ad','#00897b','#4285f4']));
  const val=r=>fm==='live'?r.gl:fm==='video'?r.gv:r.gl+r.gv;
  const prevB={};for(const r of D.sh.rows)if(inR(r,pf,pt)&&shOk(r)&&brOk(r))prevB[r.b]=(prevB[r.b]||0)+val(r);
  const affB={};for(const r of affRows(fm))if(inR(r,f,t)&&shOk(r)&&brOk(r))affB[r.k]=(affB[r.k]||0)+r.nmv;
  const aplB={};for(const src of fm==='all'?['live','video']:[fm])for(const r of (D.sh.affS[src]||[]))if(inR(r,f,t)&&shOk(r)&&brOk(r))aplB[r.k]=(aplB[r.k]||0)+r.pl;
  const estB=new Set(D.sh.rows.filter(r=>r.est&&inR(r,f,t)&&shOk(r)&&brOk(r)&&val(r)).map(r=>r.b));
  const B=groupSum(D.sh.rows.filter(r=>inR(r,f,t)&&shOk(r)&&brOk(r)).map(r=>({b:r.b,g:val(r),gl:r.gl,gv:r.gv,o:r.o})),'b',['g','gl','gv','o']).filter(o=>o.g).map(o=>({...o,name:o.k+(estB.has(o.k)?' *':''),nmv:affB[bk(o.k)]||0,apl:o.k===UNB?null:aplB[bk(o.k)]||0,dl:o.k===UNB?null:chg(o.g,prevB[o.k])}));
  const T=B.reduce((x,o)=>x+o.g,0);
  h+=table('sh-brand','GMV theo Brand',`${B.length} brand`,[{k:'name',l:'Brand'},{k:'g',l:'GMV Seller Center',f:money,r:1},{k:'share',l:'Share',f:(v,o)=>shareCell(o.g,o,T),r:1},{k:'gl',l:'Live',f:money,r:1},{k:'gv',l:'Video',f:money,r:1},{k:'apl',l:'GMV Aff đã đặt',f:v=>v==null?'–':money(v),r:1},{k:'nmv',l:'Aff NMV',f:money,r:1},{k:'o',l:'Đơn live',f:int,r:1},{k:'dl',l:'Δ kỳ trước',f:v=>v==null?'–':`<span class="${v>=0?'pos':'neg'}">${v>=0?'+':''}${pct(v)}</span>`,r:1}],
    B.map(o=>({...o,share:o.g})),{limit:30,def:{k:'g',asc:false},total:{g:T,gl:s.gl,gv:s.gv,apl:B.reduce((a,o)=>a+(o.apl||0),0),nmv:s.nmv,o:s.o}});
  const K=groupSum(D.sh.rows.filter(r=>!r.cut&&inR(r,f,t)&&shOk(r)&&brOk(r)).map(r=>({id:r.id+'|'+r.ch+'|'+r.sid,g:val(r),gl:r.gl,gv:r.gv,o:r.o})),'id',['g','gl','gv','o']).filter(o=>o.g)
    .map(o=>{const [id,ch,sd]=o.k.split('|');const it=D.sh.items[id]||{};return {...o,name:cleanTitle(it.title||id),brand:it.brand||'–',ch,sd}});
  h+=table('sh-sku','Top SKU',`${K.length} SKU`,[{k:'name',l:'Sản phẩm'},{k:'brand',l:'Brand'},{k:'sd',l:'ID kênh',f:(v,o)=>`${chTag(o.ch)} ${esc(v)}`},{k:'g',l:'GMV Seller',f:money,r:1},{k:'gl',l:'Live',f:money,r:1},{k:'gv',l:'Video',f:money,r:1},{k:'o',l:'Đơn live',f:int,r:1}],K,{limit:30,def:{k:'g',asc:false}});
  return h+`<div class="info">GMV Seller Center = GMV đơn đã đặt trên Creator Center (Live + Video, theo SKU, chưa trừ huỷ); cả phiên live tính vào ngày bắt đầu phiên, và mỗi ngày Shopee chỉ trả tối đa 1.000 sản phẩm (phần thiếu so với tổng chính thức nằm ở dòng "Chưa phân bổ brand"). GMV Aff đã đặt = GMV đơn Affiliate (kể cả huỷ) từ live + video của kênh theo ngày đặt, đủ mọi sản phẩm, có từ 10/2026; Affiliate ghi số tiền khách trả nên thường thấp hơn Seller Center ở cùng sản phẩm. Affiliate NMV = GMV đơn Affiliate đã trừ huỷ, tính mọi đơn mua qua link của kênh theo ngày đặt, kể cả sản phẩm không gắn giỏ trong live và đơn đặt sau khi live kết thúc, nên một brand có thể có NMV cao hơn GMV Seller. Tỷ lệ huỷ = 1 − NMV ÷ GMV đơn Affiliate đã đặt. Khi chọn Live / Video, Affiliate chỉ tính đơn đến từ live / video của kênh (nguồn trong báo cáo Affiliate, có từ 10/2026). So với ${fd(pf)} – ${fd(pt)}.</div>`}

function vTiktok(){const [f,t]=[S.f,S.t],[pf,pt]=prevRange(f,t);const [pp,pc]=fresh(D.tt&&D.tt.max);
  let h=secHead(ICON.tiktok+' TikTok — Live & Video (Partner Center, Olala MCN)',pp,pc)+`<div class="filter-bar">${sel('ttAcc','Account',S.ttAcc,ACC)}${ready('tt')?multiPick('ttIds','ID kênh (chọn nhiều)',ttIds().filter(([i,c])=>S.ttAcc==='all'||c===S.ttAcc).map(([i,c])=>[i,`@${i} (${c})`])):''}${sel('ttFmt','Live / Video',S.ttFmt,FMT)}</div>`;
  if(pfOn())return h+vTiktokBrand(f,t,pf,pt);
  if(!ready('tt'))return h+waitBox('tt');
  const a=S.ttAcc,fm=S.ttFmt,ids=S.ttIds,s=ttTot(f,t,a,fm,ids),p=ttTot(pf,pt,a,fm,ids),aOk=r=>accOk(r,a)&&crOk(r,ids);
  h+=`<div class="kpi-grid">${[kpi('GMV',money(s.g),'tiktok',delta(chg(s.g,p.g)),'GMV creator mang lại'),kpi('GMV Live',money(s.gl),'pink',delta(chg(s.gl,p.gl))),kpi('GMV Video',money(s.gv),'gold',delta(chg(s.gv,p.gv))),
    kpi('Phiên live',int(s.n),'web',delta(chg(s.n,p.n)),`GMV/giờ live ${money(s.gph)}`),kpi('Đơn SKU',int(s.o),'green',delta(chg(s.o,p.o)),`AOV ${money(s.aov)}`),kpi('Viewers',kf(s.v),'purple',delta(chg(s.v,p.v)),`${int(s.c)} khách mua`)].join('')}</div>`;
  const X=chartDays(f,t),flt=aOk;const L=series(D.tt.live,X[0],X[X.length-1],r=>r.g,flt),Vv=series(D.tt.video,X[0],X[X.length-1],r=>r.g,flt);
  const ds=[];if(fm!=='video')ds.push({label:'Live',data:X.map(d=>L[d]||0),backgroundColor:C.tiktok,borderRadius:3});if(fm!=='live')ds.push({label:'Video',data:X.map(d=>Vv[d]||0),backgroundColor:C.tiktok2,borderRadius:3});
  const rows=[...(fm!=='video'?D.tt.live:[]),...(fm!=='live'?D.tt.video:[])].filter(r=>inR(r,f,t)&&aOk(r));
  const prevC={};[...(fm!=='video'?D.tt.live:[]),...(fm!=='live'?D.tt.video:[])].forEach(r=>{if(inR(r,pf,pt)&&aOk(r))prevC[r.cr]=(prevC[r.cr]||0)+r.g});
  const CR=groupSum(rows.map(r=>({cr:r.cr,ch:r.ch,g:r.g,gl:r.ti!=null?r.g:0,gv:r.ti==null?r.g:0,o:r.o||0,n:r.ti!=null?1:0,v:r.v||0})),'cr',['g','gl','gv','o','n','v']).filter(o=>o.g)
    .map(o=>({...o,name:'@'+o.k,ch:(rows.find(r=>r.cr===o.k)||{}).ch,aov:div(o.gl,o.o),dl:chg(o.g,prevC[o.k])}));
  const top=[...CR].sort((x,y)=>y.g-x.g).slice(0,10);
  h+=`<div class="chart-grid wide">${chartCard('tt-daily','GMV theo ngày',`${fd(X[0])} – ${fd(X[X.length-1])}`)}${chartCard('tt-cr','Top 10 creator','GMV trong kỳ')}</div>`;
  plot('tt-daily',barCfg(X.map(fd),ds));plot('tt-cr',barCfg(top.map(o=>o.name),[{label:'Live',data:top.map(o=>o.gl),backgroundColor:C.tiktok,borderRadius:3},{label:'Video',data:top.map(o=>o.gv),backgroundColor:C.tiktok2,borderRadius:3}],{horizontal:true}));
  const T=CR.reduce((x,o)=>x+o.g,0);
  h+=table('tt-cr','Creator',`${CR.length} creator`,[{k:'name',l:'Creator'},{k:'ch',l:'Acc',f:chTag},{k:'g',l:'GMV',f:money,r:1},{k:'share',l:'Share',f:(v,o)=>shareCell(o.g,o,T),r:1},{k:'gl',l:'Live',f:money,r:1},{k:'gv',l:'Video',f:money,r:1},{k:'n',l:'Phiên',f:int,r:1},{k:'o',l:'Đơn',f:int,r:1},{k:'aov',l:'AOV',f:money,r:1},{k:'dl',l:'Δ kỳ trước',f:v=>v==null?'–':`<span class="${v>=0?'pos':'neg'}">${v>=0?'+':''}${pct(v)}</span>`,r:1}],
    CR.map(o=>({...o,share:o.g})),{limit:30,def:{k:'g',asc:false},total:{g:s.g,gl:s.gl,gv:s.gv,n:s.n,o:s.o,aov:s.aov}});
  if(fm!=='video'){const SS=D.tt.live.filter(r=>inR(r,f,t)&&aOk(r)).map(r=>({...r,name:r.ti||'(không tên)',crn:'@'+r.cr,aov:div(r.g,r.o),gph:div(r.g,r.du/60)}));
    h+=table('tt-ses','Top phiên live',`${SS.length} phiên`,[{k:'name',l:'Phiên'},{k:'d',l:'Ngày',f:fd},{k:'crn',l:'Creator'},{k:'g',l:'GMV',f:money,r:1},{k:'o',l:'Đơn',f:int,r:1},{k:'aov',l:'AOV',f:money,r:1},{k:'v',l:'Viewers',f:kf,r:1},{k:'du',l:'Phút',f:int,r:1},{k:'gph',l:'GMV/giờ',f:money,r:1}],SS,{limit:20,def:{k:'g',asc:false}})}
  return h+`<div class="info">GMV = GMV do creator mang lại (đơn đã đặt), Partner Center Olala MCN. Live theo ngày bắt đầu phiên; Video theo ngày (có từ ${D.tt.video.length?fdy(D.tt.video.reduce((a,r)=>!a||r.d<a?r.d:a,'')):'–'}). So với ${fd(pf)} – ${fd(pt)}.</div>`}

function vTiktokBrand(f,t,pf,pt){if(!ready('ttp'))return waitBox('ttp');const a=S.ttAcc,fm=S.ttFmt,ids=S.ttIds,s=ttTot(f,t,a,fm,ids),p=ttTot(pf,pt,a,fm,ids),bn=esc(fLabel());
  let h=`<div class="warnbox">Lọc <b>${bn}</b>: số lấy từ GMV theo sản phẩm (có từ ${fdy(D.ttp.min)}). Live / Video = GMV trực tiếp trong live / video; phiên live và viewers không chia được theo brand.</div>`;
  h+=`<div class="kpi-grid">${[kpi('GMV sản phẩm',money(s.g),'tiktok',delta(chg(s.g,p.g))),kpi('Live trực tiếp',money(s.gl),'pink',delta(chg(s.gl,p.gl))),kpi('Video trực tiếp',money(s.gv),'gold',delta(chg(s.gv,p.gv))),kpi('Đơn',int(s.o),'green',delta(chg(s.o,p.o)),`AOV ${money(s.aov)}`)].join('')}</div>`;
  const R=D.ttp.rows.filter(r=>inR(r,f,t)&&accOk(r,a)&&crOk(r,ids)&&brOk(r)),X=chartDays(f,t),G=series(D.ttp.rows,X[0],X[X.length-1],r=>r.g,r=>accOk(r,a)&&crOk(r,ids)&&brOk(r));
  const CR=groupSum(R,'cr',['g','gl','gv','o']).filter(o=>o.g).map(o=>({...o,name:'@'+o.k,ch:(R.find(r=>r.cr===o.k)||{}).ch}));
  h+=`<div class="chart-grid wide">${chartCard('tt-daily','GMV theo ngày',`${bn} · ${fd(X[0])} – ${fd(X[X.length-1])}`)}${chartCard('tt-cr','Top 10 creator',bn)}</div>`;
  plot('tt-daily',barCfg(X.map(fd),[{label:'GMV',data:X.map(d=>G[d]||0),backgroundColor:C.tiktok,borderRadius:3}]));
  const top=[...CR].sort((x,y)=>y.g-x.g).slice(0,10);plot('tt-cr',barCfg(top.map(o=>o.name),[{label:'GMV',data:top.map(o=>o.g),backgroundColor:C.tiktok,borderRadius:3}],{horizontal:true}));
  h+=table('tt-crb','Creator',`${CR.length} creator`,[{k:'name',l:'Creator'},{k:'ch',l:'Acc',f:chTag},{k:'g',l:'GMV',f:money,r:1},{k:'gl',l:'Live trực tiếp',f:money,r:1},{k:'gv',l:'Video trực tiếp',f:money,r:1},{k:'o',l:'Đơn',f:int,r:1}],CR,{limit:30,def:{k:'g',asc:false}});
  const PR=prodList(f,t,'tt',r=>accOk(r,a)&&crOk(r,ids));h+=table('tt-prb','Sản phẩm',`${PR.length} sản phẩm`,[{k:'name',l:'Sản phẩm'},{k:'g',l:'GMV',f:money,r:1},{k:'gl',l:'Live',f:money,r:1},{k:'gv',l:'Video',f:money,r:1},{k:'o',l:'Đơn',f:int,r:1}],PR,{limit:30,def:{k:'g',asc:false}});
  return h}

/* Hannaholala.com (Haravan web) */
function vWeb(){const [f,t]=[S.f,S.t],[pf,pt]=prevRange(f,t);const [pp,pc]=fresh(D.web&&D.web.max);
  let h=secHead(ICON.web+' Hannaholala.com — báo cáo Haravan',pp,pc);S.wbCh='web';
  if(!ready('web'))return h+waitBox('web');
  const c=S.wbCh,s=webTot(f,t,c),p=webTot(pf,pt,c),cov=pf>=D.web.min,dd=(x,y,g)=>cov?delta(chg(x,y),g):'<div class="kpi-delta flat">– kỳ trước chưa có số</div>';
  if(f<D.web.min)h+=`<div class="warnbox">Website có số từ ${fd(D.web.min)} (lưu từ sheet getlast); trước ngày đó chưa có.</div>`;
  if(pfOn())h+=`<div class="warnbox">Lọc <b>${esc(fLabel())}</b>: số đơn là số đơn có sản phẩm của brand.</div>`;
  h+=`<div class="kpi-grid">${[kpi('GMV',money(s.g),'web',dd(s.g,p.g),'Đã trừ đơn huỷ'),kpi('Đơn',int(s.o),'pink',dd(s.o,p.o)),kpi('AOV',money(s.aov),'gold',dd(s.aov,p.aov)),
    kpi('Sản phẩm có đơn',int(new Set(D.web.sku.filter(r=>inR(r,f,t)&&brOk(r)&&r.g).map(r=>r.id)).size),'green'),kpi('Brand có đơn',int(new Set(D.web.sku.filter(r=>inR(r,f,t)&&(c==='all'||r.ch===c)&&brOk(r)&&r.g).map(r=>r.k)).size),'purple')].join('')}</div>`;
  const okC=r=>(c==='all'||r.ch===c)&&brOk(r),R=D.web.sku.filter(r=>inR(r,f,t)&&okC(r)),X=chartDays(f,t);
  const chs=c==='all'?['web','harasocial','livestream']:[c],col={web:C.web,harasocial:C.purple,livestream:C.pink};
  const ds=chs.map(ch=>{const m=pfOn()?series(D.web.sku,X[0],X[X.length-1],r=>r.g,r=>r.ch===ch&&brOk(r)):series(D.web.rows,X[0],X[X.length-1],r=>r.g,r=>r.ch===ch);return {label:ch==='web'?'Web':ch==='harasocial'?'Harasocial':'Livestream',data:X.map(d=>m[d]||0),backgroundColor:col[ch],borderRadius:3}});
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
  return h+`<div class="info">Nguồn: báo cáo Haravan (Báo cáo bán hàng, xuất file). Tổng theo ngày (đơn, GMV) = báo cáo "Tháng hiện tại": mọi kênh Haravan, đã bỏ đơn huỷ, GMV = Doanh thu (trước giảm giá đơn). Theo brand / camp / sản phẩm = báo cáo "EZS Dashboard – Scom theo ngày" (Loại sản phẩm = camp); ngày chưa có file theo sản phẩm thì lấy từ sheet Get Last cũ nên tổng theo brand có thể lệch nhẹ so với tổng ngày. Đơn theo brand / sản phẩm đếm đơn có sản phẩm đó nên cộng lại lớn hơn tổng đơn. So với ${fd(pf)} – ${fd(pt)}.</div>`}

function vMedia(){const [f,t]=[S.f,S.t],[pf,pt]=prevRange(f,t);const [pp,pc]=fresh(D.md&&D.md.max);
  let h=secHead('📣 Media — Ads (Meta, TikTok, Shopee)',pp,pc)+`<div class="filter-bar">${sel('mdCh','Kênh ads',S.mdCh,[['all','Tất cả'],['Meta','Meta'],['TikTok','TikTok'],['Shopee','Shopee']])}${sel('mdSt','Trạng thái camp',S.mdSt,[['all','Tất cả'],['on','Active'],['off','Inactive']])}</div>`;
  if(!ready('md'))return h+waitBox('md');
  const c=S.mdCh,OA={};D.md.rows.forEach(r=>{if(c==='all'||r.ch===c){const k=r.ch+'|'+r.ob;OA[k]=(OA[k]||0)+(inR(r,f,t)?r.sp:0)}});
  const OK=Object.keys(OA).sort((a,b)=>OA[b]-OA[a]||a.localeCompare(b)),OB=new Set(OK.filter(k=>S.mdObj.has(k)));
  h=h.replace(/<\/div>$/,`<div class="fg"><label>Objective (chọn nhiều)</label><div class="pf-chips"><button type="button" class="pf-chip ${OB.size?'':'on pf-wb'}" data-mo="*">${OB.size?'':'✓ '}Tất cả</button>${OK.map(k=>{const [ch,o]=k.split('|'),on=OB.has(k);return `<button type="button" class="pf-chip ${on?'on '+(ch==='Meta'?'pf-wb':ch==='Shopee'?'pf-sh':'pf-tt'):''}" data-mo="${esc(k)}" title="${esc(o)}">${on?'✓ ':''}${c==='all'?ch+' · ':''}${esc(objN(o))}${OA[k]?'':' <span style="opacity:.5">(0)</span>'}</button>`}).join('')}</div></div></div>`);
  const s=mdTot(f,t,c,OB,1),p=mdTot(pf,pt,c,OB,1);
  h+=`<div class="kpi-grid">${[kpi('Ad Spend',money(s.sp),'web',delta(chg(s.sp,p.sp),0)),kpi('Ad GMV',money(s.rv),'pink',delta(chg(s.rv,p.rv))),kpi(roasL(c),xx(s.roas),'green',delta(chg(s.roas,p.roas))),
    kpi('Đơn',int(s.od),'gold',delta(chg(s.od,p.od)),`AOV ${money(s.aov)}`),kpi('CTR',pct(s.ctr),'purple',delta(chg(s.ctr,p.ctr))),kpi('CPC',money(s.cpc),'tiktok',delta(chg(s.cpc,p.cpc),-1))].join('')}</div>`;
  const X=chartDays(f,t),flt=r=>(c==='all'||r.ch===c)&&(!OB.size||OB.has(r.ch+'|'+r.ob))&&stOk(r);const SP=series(D.md.rows,X[0],X[X.length-1],r=>r.sp,flt),RV=series(D.md.rows,X[0],X[X.length-1],r=>r.rv,flt);
  h+=`<div class="chart-grid wide">${chartCard('md-daily','Spend & Ad GMV theo ngày',`${roasL(c)} trục phải · ${fd(X[0])} – ${fd(X[X.length-1])}`)}${chartCard('md-ch','Spend theo kênh','Tỷ trọng trong kỳ')}</div>`;
  plot('md-daily',barCfg(X.map(fd),[{label:'Spend',data:X.map(d=>SP[d]||0),backgroundColor:C.web2,borderRadius:3},{label:'Ad GMV',data:X.map(d=>RV[d]||0),backgroundColor:C.web,borderRadius:3},
    {label:roasL(c),data:X.map(d=>SP[d]?RV[d]/SP[d]:null),type:'line',yAxisID:'y1',borderColor:C.gold,backgroundColor:C.gold,pointRadius:2,tension:.3}],{stacked:false,line:true}));
  const chs=['Meta','TikTok','Shopee'];plot('md-ch',donutCfg(chs,chs.map(x=>mdTot(f,t,x,OB,1).sp),[C.web,C.tiktok,C.shopee]));
  const G=groupSum(D.md.rows.filter(r=>inR(r,f,t)&&flt(r)).map(r=>({k:r.camp+'|'+r.ch+'|'+r.acc+'|'+r.ob+'|'+r.st,sp:r.sp,rv:r.rv,od:r.od,im:r.im,cl:r.cl})),'k',['sp','rv','od','im','cl'])
    .map(o=>{const [name,ch,acc,ob,st]=o.k.split('|');return {...o,name,ch,acc,ob:objN(ob),st,roas:div(o.rv,o.sp),ctr:div(o.cl,o.im),cpc:div(o.sp,o.cl)}}).filter(o=>o.sp||o.rv);
  h+=table('md-camp','Campaign',`${G.length} campaign · ${G.filter(o=>o.st==='on').length} active${D.md.stDay?` · trạng thái Meta/TikTok lấy lúc ${fd(D.md.stDay)}, Shopee ${D.md.shFresh?'= có chi tiêu ngày '+fd(D.md.shDay):'chưa có (số Shopee Ads mới tới '+fd(D.md.shDay)+')'}`:''}`,[{k:'name',l:'Campaign'},{k:'ch',l:'Kênh',f:v=>`<span class="tag ${v==='Meta'?'tag-web':v==='Shopee'?'tag-shopee':'tag-tiktok'}">${esc(v)}</span>`},{k:'st',l:'Trạng thái',f:v=>v==='on'?'<span class="st-on">● Active</span>':v==='off'?'<span class="st-off">○ Inactive</span>':'–'},{k:'acc',l:'Account'},{k:'ob',l:'Objective'},{k:'sp',l:'Spend',f:money,r:1},{k:'rv',l:'Ad GMV',f:money,r:1},{k:'roas',l:roasL(c),f:xx,r:1},{k:'od',l:'Đơn',f:int,r:1},{k:'ctr',l:'CTR',f:pct,r:1},{k:'cpc',l:'CPC',f:money,r:1}],
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

/* chi tiết 1 brand: GMV / NMV từng kênh, so sánh, xu hướng theo ngày, top sản phẩm mỗi kênh */
function brandDetail(K,B,f,t,pf,pt,PF,ids){const inK=x=>!K.size||K.has(x.k),nm=K.size?B.filter(x=>K.has(x.k)).map(x=>x.name):[],title=!K.size?'Tất cả brand':nm.length<=3?nm.join(', '):nm.slice(0,3).join(', ')+` +${nm.length-3} brand`;
  const idOk=x=>!ids||!ids.size||ids.has(x),acc=S.brAcc;
  const calc=(a,b)=>{const r={sh:0,shn:0,tt:0,wb:0,wbg:0};
    if(PF.has('sh')){for(const x of D.sh.rows)if(inK(x)&&inR(x,a,b)&&accOk(x,acc)&&idOk('sh:'+x.sid)&&catOk(x))r.sh+=x.gl+x.gv;
      if(!catOn())for(const x of D.sh.aff)if(inK(x)&&inR(x,a,b)&&accOk(x,acc)&&idOk('sh:'+x.sid))r.shn+=x.nmv}
    if(PF.has('tt'))for(const x of D.ttp.rows)if(inK(x)&&inR(x,a,b)&&accOk(x,acc)&&idOk('tt:'+x.cr)&&catOk(x))r.tt+=x.g;
    if(PF.has('wb')&&acc!=='MCN'&&idOk('wb:web'))for(const x of D.web.sku)if(inK(x)&&x.ch==='web'&&inR(x,a,b)&&catOk(x)){r.wb+=x.g;r.wbg+=x.g+x.cg}
    return r};
  const c=calc(f,t),p=calc(pf,pt),G=c.sh+c.tt+c.wbg,N=(c.shn||0)+(c.wb||0);
  const CH=[['sh','Shopee',C.shopee,'pc-sh',c.sh,catOn()?null:c.shn,p.sh,p.shn],['tt','TikTok','#5f6368','pc-tt',c.tt,null,p.tt,null],['wb','Scom','#1877f2','pc-wb',c.wbg,c.wb,p.wbg,p.wb]].filter(x=>PF.has(x[0]));
  const card=([key,l,col,cls,g,n,pg,pn])=>`<div class="bd-card ${cls}"><div class="bd-top"><b>${l}</b><span>${pct(div(g,G))} GMV</span></div>
    <div class="bd-row"><span>GMV</span><b>${money(g)}</b>${delta(chg(g,pg))}</div>
    <div class="bd-row"><span>NMV</span><b>${n==null?'–':money(n)}</b>${n==null?`<div class="kpi-delta flat">${key==='tt'?'chưa có số huỷ':'không lọc được'}</div>`:delta(chg(n,pn))}</div>
    <div class="bd-bar"><i style="width:${Math.min(100,div(g,G)*100||0)}%;background:${col}"></i></div></div>`;
  let h=`<section class="bd"><div class="bd-head"><h3>🔎 ${esc(title)}</h3>${multiPick('brSelS','Brand (chọn nhiều)',B.slice().sort((a,b)=>b.g-a.g).slice(0,400).map(x=>[x.k,x.name]),'Tất cả brand')}
    <div class="bd-sum"><div><span>GMV tổng</span><b>${money(G)}</b></div><div><span>NMV (Shopee + Scom)</span><b>${money(N)}</b></div></div></div>
    <div class="bd-cards">${CH.map(card).join('')}</div>`;
  /* xu hướng theo ngày, mỗi kênh một màu */
  const X=chartDays(f,t),ser={sh:{},tt:{},wb:{}};
  if(PF.has('sh'))for(const x of D.sh.rows)if(inK(x)&&inR(x,X[0],X[X.length-1])&&accOk(x,acc)&&idOk('sh:'+x.sid)&&catOk(x))ser.sh[x.d]=(ser.sh[x.d]||0)+x.gl+x.gv;
  if(PF.has('tt'))for(const x of D.ttp.rows)if(inK(x)&&inR(x,X[0],X[X.length-1])&&accOk(x,acc)&&idOk('tt:'+x.cr)&&catOk(x))ser.tt[x.d]=(ser.tt[x.d]||0)+x.g;
  if(PF.has('wb')&&acc!=='MCN'&&idOk('wb:web'))for(const x of D.web.sku)if(inK(x)&&x.ch==='web'&&inR(x,X[0],X[X.length-1])&&catOk(x))ser.wb[x.d]=(ser.wb[x.d]||0)+x.g+x.cg;
  h+=`<div class="chart-grid wide">${chartCard('bd-day','GMV theo ngày theo kênh',`${esc(title)} · ${fd(X[0])} – ${fd(X[X.length-1])}`)}${chartCard('bd-gn','GMV vs NMV theo kênh',esc(title))}</div>`;
  plot('bd-day',barCfg(X.map(fd),CH.map(x=>({label:x[1],data:X.map(d=>ser[x[0]][d]||0),backgroundColor:x[2],borderRadius:3}))));
  plot('bd-gn',barCfg(CH.map(x=>x[1]),[{label:'GMV',data:CH.map(x=>x[4]),backgroundColor:CH.map(x=>x[2]),borderRadius:4},{label:'NMV',data:CH.map(x=>x[5]||0),backgroundColor:CH.map(x=>x[2]+'66'),borderRadius:4}],{stacked:false}));
  h+=`</section>`;
  return h}
function vBrand(){const [f,t]=[S.f,S.t],[pf,pt]=prevRange(f,t),PF=new Set(S.brPfS.size?['sh','tt','wb'].filter(k=>S.brPfS.has(k)):['sh','tt','wb']),PN={sh:'Shopee',tt:'TikTok',wb:'Scom'};
  /* ID kênh: Shopee ID live + TikTok creator + Scom, theo nền tảng và account đang chọn */
  const accF=c=>S.brAcc==='all'||c===S.brAcc,IDO=ready('sh','tt')?[...(PF.has('sh')?shIds().filter(([i,c])=>accF(c)).map(([i,c])=>['sh:'+i,`Shopee · ${i} (${c})`]):[]),...(PF.has('tt')?ttIds().filter(([i,c])=>accF(c)).map(([i,c])=>['tt:'+i,`TikTok · @${i} (${c})`]):[]),...(PF.has('wb')&&S.brAcc!=='MCN'?[['wb:web','Scom · Hannaholala.com (HO)']]:[])]:[];
  [...S.brIds].forEach(k=>{if(!IDO.some(o=>o[0]===k))S.brIds.delete(k)});
  let h=secHead('🏷️ By Brand — '+['sh','tt','wb'].filter(k=>PF.has(k)).map(k=>PN[k]).join(' + '))+`<div class="filter-bar">${multiPick('brPfS','Kênh (chọn nhiều để so sánh)',[['sh','Shopee'],['tt','TikTok'],['wb','Scom (Hannaholala.com)']],'Shopee + TikTok + Scom')}${sel('brAcc','Account',S.brAcc,ACC)}${IDO.length?multiPick('brIds','ID kênh (chọn nhiều)',IDO):''}</div>`;
  if(!ready('sh','ttp','web','tt'))return h+waitBox('sh','ttp','web','tt');
  const ids=S.brIds;
  if(D.web.min>f&&PF.has('wb'))h+=`<div class="warnbox">Scom theo brand có từ ${fdy(D.web.min)}.</div>`;
  if(S.brAcc==='MCN'&&PF.has('wb'))h+=`<div class="warnbox">Scom là kênh của HO, không tính khi chọn MCN.</div>`;
  if(D.ttp.min>f&&PF.has('tt'))h+=`<div class="warnbox">TikTok theo brand có từ ${fdy(D.ttp.min)}; trước ngày đó chỉ có Shopee.</div>`;
  if(pfOn())h+=`<div class="warnbox">Đang lọc <b>${esc(fLabel())}</b>.${catOn()?' Category: Shopee theo category Shopee; TikTok và Scom ước tính theo sản phẩm Shopee cùng brand, tên gần nhất; cột SP Aff đã đặt để trống.':''}</div>`;
  const bf=o=>!S.brands.size||S.brands.has(o.k);
  const B=brandTable(f,t,PF,S.brAcc,true,ids).filter(o=>o.g&&bf(o)),P=Object.fromEntries(brandTable(pf,pt,PF,S.brAcc,pf>=D.web.min,ids).filter(bf).map(o=>[o.k,o.g]));
  const T=B.reduce((a,o)=>a+o.g,0),wcov=pf>=D.web.min||!PF.has('wb');B.forEach(o=>{o.dl=chg(wcov?o.g:o.g-o.wb,P[o.k]);o.share=o.g});
  /* so sánh kênh: >= 2 ID kênh -> mỗi ID một cột; chưa chọn ID mà >= 2 nền tảng -> cột Shopee / TikTok / Scom.
     Ô tô màu theo GMV so với kênh mạnh nhất của chính brand đó; kênh mạnh nhất in đậm. */
  const pcol=k=>k.startsWith('sh')?C.shopee:k.startsWith('tt')?'#5f6368':'#1877f2';
  const CMP=ids.size>=2?IDO.filter(([k])=>ids.has(k)).map(([k,l],i)=>({k:'c'+i,id:k,l:k==='wb:web'?'Scom':k.startsWith('sh:')?'SP '+k.slice(3):'TT @'+k.slice(3),full:l,col:ids.size>3?PAL[i%PAL.length]:pcol(k)}))
    :PF.size>=2?[['sh','Shopee'],['tt','TikTok'],['wbg','Scom']].filter(([k])=>PF.has(k.slice(0,2))).map(([k,l])=>({k,l,full:l,col:pcol(k)})):[];
  if(ids.size>=2)CMP.forEach(c=>{const M=Object.fromEntries(brandTable(f,t,PF,S.brAcc,true,new Set([c.id])).map(o=>[o.k,o.g]));B.forEach(o=>o[c.k]=M[o.k]||0)});
  B.forEach(o=>{let bk_=null,bv=0;CMP.forEach(c=>{if((o[c.k]||0)>bv){bv=o[c.k];bk_=c}});o.best=bk_?bk_.l:'–';o.bestS=bk_?div(bv,o.g):null;o.bestC=bk_?bk_.col:''});
  const a2h=x=>Math.round(Math.max(0,Math.min(1,x))*255).toString(16).padStart(2,'0');
  const heat=(c)=>(v,o)=>{const mx=Math.max(...CMP.map(x=>o[x.k]||0));if(!v)return '<span class="heat-0">–</span>';const r=mx?v/mx:0;return `<span class="heat${v===mx&&CMP.length>1?' heat-top':''}" style="background:${c.col}${a2h(.08+.42*r)}">${money(v)}</span>`};
  const top=[...B].sort((a,b)=>b.g-a.g).slice(0,10);

  h+=`<div class="chart-grid wide">${chartCard('br-top','Top 10 Brand','GMV theo kênh (cột chồng)',true)}${chartCard('br-d','Brand share %','Top 10 + khác',true)}</div>`;
  {const bc=barCfg(top.map(o=>o.name.length>16?o.name.slice(0,15)+'…':o.name),(CMP.length>=2&&ids.size>=2?CMP.map(c=>[c.k,c.l,c.col]):[['sh','Shopee',C.shopee],['tt','TikTok','#5f6368'],['wbg','Scom','#1877f2']].filter(([k])=>PF.has(k.slice(0,2)))).map(([k,l,c])=>({label:l,data:top.map(o=>o[k]||0),backgroundColor:c,borderRadius:3})),{stacked:true});bc.options.scales.x.ticks.autoSkip=false;plot('br-top',bc)}
  {const pc=donutCfg([...top.map(o=>o.name),'Khác'],[...top.map(o=>o.g),T-top.reduce((a,o)=>a+o.g,0)],[...PAL.slice(0,10),'#dadce0']);pc.type='pie';pc.options.cutout=0;plot('br-d',pc)}
  const dlCol={k:'dl',l:'Δ kỳ trước',f:v=>v==null?'–':`<span class="${v>=0?'pos':'neg'}">${v>=0?'+':''}${pct(v)}</span>`,r:1};
  if(ids.size>=2){const tot={g:T};CMP.forEach(c=>tot[c.k]=B.reduce((a,o)=>a+(o[c.k]||0),0));
    h+=`<div class="cmp-legend">So sánh ${CMP.length} kênh: ${CMP.map(c=>`<span><i style="background:${c.col}"></i>${esc(c.full)}</span>`).join('')}<span class="cmp-note">ô càng đậm = càng gần kênh cao nhất của brand; <b>in đậm</b> = kênh cao nhất</span></div>`;
    h+=table('br-cmp','So sánh brand theo kênh',`${B.length} brand`,[{k:'name',l:'Brand'},{k:'g',l:'GMV',f:money,r:1},{k:'share',l:'Share',f:(v,o)=>shareCell(o.g,o,T),r:1},
      ...CMP.map(c=>({k:c.k,l:esc(c.l),f:heat(c),r:1})),dlCol],
      B,{limit:100,def:{k:'g',asc:false},total:tot})}
  else{const hc=k=>CMP.length>=2?heat(CMP.find(c=>c.k===k)):money,pl={sh:'Shopee',tt:'TikTok',wb:'Scom'};
    if(CMP.length>=2)h+=`<div class="cmp-legend">So sánh ${CMP.length} kênh: ${CMP.map(c=>`<span><i style="background:${c.col}"></i>${esc(c.full)}</span>`).join('')}<span class="cmp-note"><b>in đậm</b> = GMV cao nhất của brand</span></div>`;
    B.forEach(o=>{o.g=(PF.has('sh')?o.sh:0)+(PF.has('tt')?o.tt:0)+(PF.has('wb')?o.wbg:0);o.nt=(PF.has('sh')&&!catOn()?o.shn:0)+(PF.has('wb')?o.wb:0)});
    const gk=['sh','tt','wbg'].filter(k=>PF.has(k.slice(0,2))),gb=v=>(v,o)=>!v?'–':(gk.length>1&&v===Math.max(...gk.map(k=>o[k]||0))?`<b>${money(v)}</b>`:money(v));
    h+=table('br-all',CMP.length>=2?'So sánh brand theo kênh':'Tất cả brand',`${B.length} brand`,[{k:'name',l:'Brand'},
      ...(PF.size>1?[{k:'g',l:'GMV',f:v=>`<b>${money(v)}</b>`,r:1,cls:'pc-all'},{k:'nt',l:'NMV',f:v=>v?money(v):'–',r:1,cls:'pc-alln'},{k:'share',l:'Share',f:(v,o)=>shareCell(o.g,o,T),r:1,cls:'pc-alln'}]:[]),
      ...(PF.has('sh')?[{k:'sh',l:'GMV',f:gb(),r:1,cls:'pc-sh'},{k:'shn',cls:'pc-shn',l:'NMV',f:v=>catOn()||!v?'–':money(v),r:1}]:[]),
      ...(PF.has('tt')?[{k:'tt',l:'GMV',f:gb(),r:1,cls:'pc-tt'},{k:'ttn',cls:'pc-ttn',l:'NMV',f:()=>'<span class="heat-0">–</span>',r:1}]:[]),
      ...(PF.has('wb')?[{k:'wbg',l:'GMV',f:gb(),r:1,cls:'pc-wb'},{k:'wb',cls:'pc-wbn',l:'NMV',f:v=>v?money(v):'–',r:1}]:[])],
    B,{limit:100,def:{k:'g',asc:false},groups:[{l:'',span:1},...(PF.size>1?[{l:'Tổng brand',span:3,cls:'pc-all'}]:[]),...(PF.has('sh')?[{l:'Shopee',span:2,cls:'pc-sh'}]:[]),...(PF.has('tt')?[{l:'TikTok',span:2,cls:'pc-tt'}]:[]),...(PF.has('wb')?[{l:'Scom',span:2,cls:'pc-wb'}]:[])],total:{g:B.reduce((a,o)=>a+o.g,0),nt:B.reduce((a,o)=>a+o.nt,0),sh:B.reduce((a,o)=>a+o.sh,0),shn:B.reduce((a,o)=>a+o.shn,0),tt:B.reduce((a,o)=>a+o.tt,0),wb:B.reduce((a,o)=>a+o.wb,0),wbg:B.reduce((a,o)=>a+o.wbg,0)}});}
  return h+`<div class="info">Shopee = GMV Seller Center (đơn đã đặt) Creator Center theo SKU (Live + Video); cột SP Aff đã đặt = GMV đơn Affiliate từ live + video theo ngày đặt (có từ 10/2026, không cộng vào GMV). TikTok = GMV sản phẩm do creator mang lại (Partner Center, Live/Video trực tiếp là phần GMV ghi nhận ngay trong live / video). Scom = GMV sản phẩm đơn Haravan kênh web (Hannaholala.com), đã trừ đơn huỷ, có từ ${fdy(D.web.min)}. NMV Shopee = Affiliate NMV của brand (đã trừ huỷ, mọi đơn qua link của kênh, có thể cao hơn GMV Creator Center). NMV TikTok: chưa có (Partner Center không có số huỷ / hoàn theo sản phẩm). Scom: báo cáo Haravan đã bỏ đơn huỷ nên NMV = Doanh thu; GMV Scom = NMV + giá trị đơn huỷ (chỉ có ở các ngày lấy từ sheet cũ). Tên brand được gộp giữa các kênh theo chữ cái (bỏ dấu, bỏ "THE"). So với ${fd(pf)} – ${fd(pt)}.</div>`}

function vProduct(){const [f,t]=[S.f,S.t];
  let h=secHead('📦 By Product — top sản phẩm')+`<div class="filter-bar">${sel('pdPf','Nền tảng',S.pdPf,[['all','Shopee + TikTok + Website'],['sh','Shopee'],['tt','TikTok'],['wb','Website']])}<div class="fg" style="flex:1"><label>Tìm sản phẩm / brand</label><input data-s="pdQ" value="${esc(S.pdQ)}" placeholder="vd: whoo, cnp, kem chống nắng"></div></div>`;
  if(!ready('sh','ttp','web'))return h+waitBox('sh','ttp','web');
  const R=prodList(f,t,S.pdPf);
  const q=bkey(S.pdQ);const F=q?R.filter(o=>bkey(o.name+' '+o.brand).includes(q)):R;const T=F.reduce((a,o)=>a+o.g,0);
  h+=`<div class="kpi-grid">${[kpi('GMV sản phẩm',money(T),'pink'),kpi('Số sản phẩm',int(F.length),'gold'),kpi('Shopee',money(F.filter(o=>o.pf==='Shopee').reduce((a,o)=>a+o.g,0)),'shopee'),kpi('TikTok',money(F.filter(o=>o.pf==='TikTok').reduce((a,o)=>a+o.g,0)),'tiktok'),kpi('Website',money(F.filter(o=>o.pf==='Website').reduce((a,o)=>a+o.g,0)),'web')].join('')}</div>`;
  h+=table('pd-all','Top sản phẩm',q?`lọc "${esc(S.pdQ)}"`:'',[{k:'name',l:'Sản phẩm'},{k:'pf',l:'Sàn',f:v=>`<span class="tag ${v==='Shopee'?'tag-shopee':v==='Website'?'tag-web':'tag-tiktok'}">${v}</span>`},{k:'brand',l:'Brand'},{k:'cat',l:'Category'},{k:'g',l:'GMV',f:money,r:1},{k:'share',l:'Share',f:(v,o)=>shareCell(o.g,o,T),r:1},{k:'gl',l:'Live',f:v=>v==null?'–':money(v),r:1},{k:'gv',l:'Video',f:v=>v==null?'–':money(v),r:1},{k:'o',l:'Đơn',f:int,r:1}],
    F.map(o=>({...o,share:o.g})),{limit:100,def:{k:'g',asc:false}});
  return h+`<div class="info">Shopee: GMV Seller (đơn đã đặt) theo SKU (đơn live = đơn đã đặt trong live). TikTok: GMV theo sản phẩm (có từ ${fdy(D.ttp.min)}); cột Live / Video của TikTok là GMV trực tiếp trong live / video. Website: GMV đơn Haravan kênh web, không chia Live / Video. Category (cấp 2 › cấp 3): Shopee theo category Shopee; TikTok và Website không có category nên ước tính theo sản phẩm Shopee cùng brand, tên gần nhất (dấu *).</div>`}

/* Deal Compare 3 kênh: trang riêng (deal/index.html), nhúng bằng iframe */
function vDeal(){return `<div class="info" style="margin:0 0 10px">So sánh % saving cùng SKU (barcode) giữa Scom, Shopee, TikTok, kèm PFM, forecast và điểm ưu tiên deal. Bản chỉ xem, dữ liệu baseline Mega 11.11 (import 18/11), không theo bộ lọc ngày. <a href="../deal/" target="_blank" rel="noopener">Mở toàn màn hình ↗</a></div>
  <div class="deal-layout"><iframe class="deal-frame" src="../deal/?v=20261120" title="Deal Compare 3 kênh" loading="lazy"></iframe>
  <aside class="dw" id="dw" aria-live="polite"><div class="dw-card dw-muted">Đang tải Office…</div></aside></div>`}

/* Brand Deal Watch (tools/deal-watch): văn phòng chibi 2 agent (Scanner quét, QC kiểm) + số deal vi phạm QC đã xác nhận.
   Agent đang làm ở Văn phòng; agent nghỉ đi biển / cafe / đi chơi ở Góc nghỉ. */
const DW_SVG=inner=>`<svg class="dw-bg" viewBox="0 0 280 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${inner}</svg>`;
const DW_SCENE={
  office:{name:'làm việc',svg:DW_SVG(`<rect width="280" height="108" fill="#FDE7F0"/><rect y="108" width="280" height="42" fill="#F3D9C4"/>
    <rect x="20" y="16" width="62" height="46" rx="8" fill="#DDF1FF" stroke="#F9A8D4" stroke-width="3"/><circle cx="38" cy="34" r="6" fill="#fff"/><circle cx="47" cy="32" r="8" fill="#fff"/><circle cx="58" cy="35" r="6" fill="#fff"/>
    <rect x="196" y="22" width="64" height="5" rx="2" fill="#E9B8CB"/><rect x="202" y="10" width="10" height="12" rx="2" fill="#F48FB1"/><rect x="215" y="6" width="8" height="16" rx="2" fill="#B39DDB"/><rect x="226" y="12" width="12" height="10" rx="2" fill="#FFCC80"/>
    <circle cx="250" cy="14" r="7" fill="#A5D6A7"/><rect x="246" y="16" width="8" height="6" rx="1" fill="#F8BBD0"/>
    <path d="M8 150 q4-40 14-52 q6 20 4 52z M18 150 q10-34 22-40 q-6 18-10 40z" fill="#81C784"/><rect x="6" y="128" width="30" height="22" rx="6" fill="#F48FB1"/>`)},
  beach:{name:'đi biển',svg:DW_SVG(`<rect width="280" height="80" fill="#CDEBFF"/><circle cx="230" cy="28" r="14" fill="#FFE082"/>
    <path d="M0 80 q35-8 70 0 t70 0 t70 0 t70 0v22H0z" fill="#7FC8F0"/><rect y="98" width="280" height="52" fill="#FBE3C2"/>
    <path d="M44 150 q-2-46 8-70" stroke="#A1887F" stroke-width="5" fill="none"/><path d="M52 80 q-24-6-34 6 M52 80 q-18-18-36-12 M52 80 q14-20 34-14 M52 80 q22-4 30 10" stroke="#66BB6A" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M206 132 l0-44" stroke="#8D6E63" stroke-width="3"/><path d="M176 92 q30-30 60 0z" fill="#F48FB1"/><path d="M196 92 q10-30 20 0z" fill="#fff" opacity=".7"/>
    <rect x="232" y="118" width="26" height="20" rx="4" fill="#CE93D8"/><rect x="240" y="112" width="10" height="6" rx="2" fill="none" stroke="#AB47BC" stroke-width="2"/>`)},
  cafe:{name:'đi cafe',svg:DW_SVG(`<rect width="280" height="150" fill="#FFF1E6"/><path d="M0 0h280v26H0z" fill="#F8BBD0"/><path d="M0 26 q17 14 35 0 q17 14 35 0 q17 14 35 0 q17 14 35 0 q17 14 35 0 q17 14 35 0 q17 14 35 0 q17 14 35 0z" fill="#F48FB1"/>
    <rect x="20" y="44" width="56" height="40" rx="6" fill="#5D4037"/><text x="48" y="60" text-anchor="middle" font-size="8" fill="#FFF8E1" font-family="Inter,sans-serif">MENU</text><text x="48" y="74" text-anchor="middle" font-size="7" fill="#FFCDD2" font-family="Inter,sans-serif">trà sữa · bánh</text>
    <rect x="176" y="112" width="92" height="8" rx="4" fill="#BCAAA4"/><rect x="218" y="120" width="8" height="30" fill="#A1887F"/>
    <path d="M192 112 l3-22 h14 l3 22z" fill="#FFE0B2"/><rect x="194" y="96" width="16" height="4" fill="#F48FB1"/><path d="M204 90 l6-14" stroke="#EC4899" stroke-width="2.5"/><circle cx="198" cy="108" r="2" fill="#5D4037"/><circle cx="205" cy="106" r="2" fill="#5D4037"/>
    <path d="M232 112 l12-14 l12 14z" fill="#FFF59D" stroke="#F8BBD0" stroke-width="3"/><circle cx="244" cy="96" r="3" fill="#E53935"/>`)},
  play:{name:'đi chơi',svg:DW_SVG(`<rect width="280" height="112" fill="#EDE7F6"/><rect y="112" width="280" height="38" fill="#E1D5E7"/>
    <rect x="16" y="30" width="100" height="82" fill="#fff"/><path d="M12 30 h108 l-6 16 h-96z" fill="#F48FB1"/><path d="M30 30 v16 M48 30 v16 M66 30 v16 M84 30 v16 M102 30 v16" stroke="#fff" stroke-width="7"/>
    <rect x="34" y="58" width="64" height="40" rx="4" fill="#FCE4EC"/><text x="66" y="82" text-anchor="middle" font-size="9" font-weight="700" fill="#DB2777" font-family="Inter,sans-serif">SALE</text>
    <path d="M226 64 q-14-2-14-18 q0-14 14-14 q14 0 14 14 q0 16-14 18z" fill="#F06292"/><path d="M226 64 q4 30-6 56" stroke="#9E9E9E" fill="none"/>
    <path d="M248 72 q-12-2-12-15 q0-12 12-12 q12 0 12 12 q0 13-12 15z" fill="#BA68C8"/><path d="M248 72 q-2 26 6 48" stroke="#9E9E9E" fill="none"/>
    <rect x="186" y="118" width="22" height="24" rx="3" fill="#F8BBD0"/><path d="M191 118 q6-10 12 0" stroke="#EC4899" stroke-width="2" fill="none"/><rect x="210" y="124" width="18" height="18" rx="3" fill="#FFE082"/>`)}};
const DW_DESK=`<svg class="dw-desk" viewBox="0 0 280 44" preserveAspectRatio="none" aria-hidden="true"><rect x="0" y="8" width="280" height="12" rx="6" fill="#E8A9C2"/><rect x="10" y="20" width="260" height="24" fill="#F4C6D7"/></svg>`;
const DW_LAPTOP=`<svg class="dw-laptop" viewBox="0 0 44 30" aria-hidden="true"><rect class="dw-screen" x="6" y="0" width="32" height="22" rx="3"/><rect x="0" y="22" width="44" height="6" rx="3" fill="#B0BEC5"/><circle cx="22" cy="11" r="3" fill="#fff" opacity=".8"/></svg>`;
async function loadWatch(){
  const get=f=>fetch(`../deal/watch/${f}?t=${Date.now()}`).then(r=>r.ok?r.json():null).catch(()=>null);
  const [st,W]=await Promise.all([get('status.json'),get('warnings.json')]);const box=$('#dw');if(!box)return;
  if(!st?.agents){box.innerHTML='<div class="dw-card dw-muted">Agent chưa chạy lượt nào.</div>';return}
  const now=new Date(),hm=s=>s?new Date(s).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}):'–';
  // hoạt động nghỉ đổi theo ngày + giờ, mỗi agent một kiểu
  const day=Math.floor((now-new Date(now.getFullYear(),0,1))/864e5),FUN=['beach','cafe','play'];
  const A=[['scanner','Scanner','Đang quét Shopee, TikTok, Web','Quét giá'],['qc','QC','Đang kiểm ảnh, giá, quà','Kiểm QC']].map(([k,name,doing,short],i)=>{const a=st.agents[k]||{};
    // quá 2 giờ vẫn "working" là lượt bị ngắt giữa chừng, coi như nghỉ
    const on=a.state==='working'&&now-new Date(a.started_at)<2*3600e3,sch=a.schedule||[],cur=sch.filter(h=>h<=now.getHours()).pop();
    return {k,name,on,doing,short,img:`../deal/watch/img/${k}.webp`,next:hm(a.next_run),pending:a.pending,
      line:on?`${doing} từ ${hm(a.started_at)}`:`Xong ${hm(a.finished_at)} · lượt tới ${hm(a.next_run)}`,
      slots:sch.map(h=>`<span class="${h===cur&&on?'run':h<=now.getHours()?'done':'todo'}" title="${name} lượt ${h}h">${h}h</span>`).join('')}});
  const work=A.filter(a=>a.on),rest=A.filter(a=>!a.on);
  // 1 ô duy nhất: nửa trái = văn phòng (agent đang làm), nửa phải = góc nghỉ (cả team đi chung 1 hoạt động, đổi theo giờ)
  const fun=DW_SCENE[FUN[(day+now.getHours())%FUN.length]];
  const girl=(a,cls)=>`<figure class="dw-mini"><img class="dw-girl ${cls}" src="${a.img}" alt="" width="47" height="92" loading="lazy"><figcaption>${a.name}</figcaption></figure>`;
  const room=`<section class="dw-room dw-one" aria-label="${work.length?work.map(a=>a.name).join(', ')+' đang làm việc':'Văn phòng trống'}; ${rest.length?rest.map(a=>a.name).join(', ')+' đang '+fun.name:'không ai nghỉ'}">
    <div class="dw-half work">${DW_SCENE.office.svg}<span class="dw-lbl"><i class="dot ${work.length?'on':''}"></i>Văn phòng</span>
      ${work.length?`<div class="dw-crew">${work.map(a=>girl(a,'bob')).join('')}</div>${DW_DESK}<div class="dw-laptops">${DW_LAPTOP}</div>`:`${DW_DESK}<p class="dw-empty">Trống</p>`}</div>
    <div class="dw-half rest">${fun.svg}<span class="dw-lbl"><i class="dot"></i>${rest.length?'Đang '+fun.name:'Góc nghỉ'}</span>
      ${rest.length?`<div class="dw-crew">${rest.map(a=>girl(a,'sway')).join('')}</div>`:'<p class="dw-empty">Cả team đang làm</p>'}</div></section>`;
  // feedback KA: Đúng = bỏ qua (nhớ trên máy KA), Sai + lý do = mở GitHub issue; QC đọc issue, ghi vào sheet Deal Watch Memory để học
  const fb=dwFb(),WT=(W||[]).slice(0,5);
  const top=WT.map((w,i)=>{const st=fb[dwKey(w)];return `<li class="${w.level==='TỐT HƠN'?'bad':'near'}"><b>${esc(w.brand)}</b> · ${esc(w.product.replace(/^DEAL \d+:\s*/i,'').slice(0,48))}<br><span>${esc(w.channel)} ${int(w.price)} + quà ${int(w.gift_total)} · saving ${w.brand_saving}% vs Hannah ${w.hannah_saving_pct}%</span>${(w.gifts||[]).length?`<br><span>Quà brand: ${esc(w.gifts.map(g=>(g.qty>1?g.qty+'x ':'')+g.name).join(', ').slice(0,70))}</span>`:''}
    <div class="dw-fb" data-i="${i}">${st==='ok'?'<span class="dw-done">KA đã duyệt: đúng</span>':st==='sent'?'<span class="dw-done">Đã gửi feedback sai, QC sẽ học lại</span>':
      `<button type="button" class="dw-btn ok" data-act="ok">Đúng</button><button type="button" class="dw-btn no" data-act="no" aria-expanded="false">Sai</button>
      <div class="dw-why" hidden><label for="dw-why-${i}">Lý do sai</label><textarea id="dw-why-${i}" rows="2" placeholder="VD: quà là 2 món 10ml chứ không phải 55ml"></textarea><button type="button" class="dw-btn send" data-act="send">Gửi feedback</button></div>`}</div></li>`}).join('');
  box.innerHTML=`<div class="dw-card dw-office">
    <div class="dw-head"><b>Văn phòng Deal Watch</b><span class="dw-pill ${work.length?'on':''}">${work.length?`${work.length} đang làm`:'Cả team nghỉ'}</span></div>
    ${room}
    <ul class="dw-status">${A.map(a=>`<li><b>${a.name}</b> ${a.on?`<span class="on">${a.short}</span> từ ${a.line.split(' từ ')[1]}`:`nghỉ · lượt tới ${a.next}`}${a.k==='qc'&&a.pending?` · ${a.pending} chờ QC`:''}</li>`).join('')}</ul>
    <details class="dw-more"><summary>Lịch hôm nay</summary>${A.map(a=>`<div class="dw-line"><b>${a.name}:</b> ${a.line}</div><div class="dw-slots" aria-label="Lịch ${a.name} hôm nay">${a.slots}</div>`).join('')}
    ${st.agents.scanner?.brands?.length?`<div class="dw-line">Scanner lượt gần nhất: ${esc(st.agents.scanner.brands.join(', '))}</div>`:''}</details></div>
  <div class="dw-card">
    <div class="dw-big">${st.violations??0}</div><div class="dw-line">deal violate: deal sàn tốt hơn Hannah, QC đã kiểm lại đủ checklist</div>
    <div class="dw-split"><span class="bad">Violate ${st.violations??0}</span><span class="near">Ngang · chỉ theo dõi ${st.near??0}</span></div>
    ${top?`<ol class="dw-top">${top}</ol>`:''}
    <div class="dw-line">Đã so ${st.scanned??0} SP brand / ${st.deals??0} deal Hannah. % saving = 1 - giá bán / (giá gốc + quà), giá đã trừ voucher shop, không trừ voucher sàn. Deal hiện tối đa 48h sau lần QC.</div></div>`;
  box.onclick=e=>{const b=e.target.closest('[data-act]');if(!b)return;const row=b.closest('.dw-fb'),w=WT[+row.dataset.i];
    if(b.dataset.act==='no'){const f=row.querySelector('.dw-why');f.hidden=!f.hidden;b.setAttribute('aria-expanded',String(!f.hidden));if(!f.hidden)f.querySelector('textarea').focus();return}
    if(b.dataset.act==='send'){const t=row.querySelector('textarea'),why=t.value.trim();if(!why){t.focus();t.setAttribute('aria-invalid','true');return}window.open(dwIssue(w,why),'_blank','noopener')}
    dwFbSet(dwKey(w),b.dataset.act==='ok'?'ok':'sent');loadWatch()}}
const DW_ISSUE='https://github.com/vynguyen-HO/ezs-dashboard/issues/new';
const dwKey=w=>[w.stt,w.channel,w.checked_at].join('|');
function dwFb(){try{return JSON.parse(localStorage.getItem('dw-fb')||'{}')}catch{return {}}}
function dwFbSet(k,v){try{localStorage.setItem('dw-fb',JSON.stringify({...dwFb(),[k]:v}))}catch{}}
function dwIssue(w,why){
  const meta={stt:w.stt,channel:w.channel,url:w.url,checked_at:w.checked_at,brand:w.brand};
  const body=`Deal: ${w.brand} · ${w.product}
STT Hannah: ${w.stt} · Kênh: ${w.channel}
Link: ${w.url||''}
Agent báo: ${w.channel} ${int(w.price)} + quà ${int(w.gift_total)} · saving ${w.brand_saving}% vs Hannah ${w.hannah_saving_pct}% (${w.why||''})
QC kiểm lúc: ${w.checked_at}

Lý do KA đánh giá SAI:
${why}

<!-- deal-watch ${JSON.stringify(meta)} -->`;
  return `${DW_ISSUE}?labels=deal-watch-feedback&title=${encodeURIComponent(`[deal-watch-feedback] ${w.brand} · STT ${w.stt} · ${w.channel}`)}&body=${encodeURIComponent(body)}`}

/* ---------- shell ---------- */

/* Finance */
const FIN={finmeta:['Meta','Invoice Meta Ads','Billing Hub · Payment activity','Số hoá đơn VAT'],fintt:['TikTok','Invoice TikTok Ads','TikTok Ads · Billing','Số hoá đơn'],finsp:['Shopee','Transaction Shopee','Seller Center · Dịch vụ Hiển thị · Lịch sử giao dịch (chỉ nạp tiền)','']};
const stTag=v=>/^paid|thành công|success|completed/i.test(v)?`<span class="st-on">${esc(v)}</span>`:/fail|thất bại|declin/i.test(v)?`<span class="st-bad">${esc(v)}</span>`:esc(v||'–');
const vnd=v=>v==null||!isFinite(v)?'–':Math.round(v).toLocaleString('vi-VN')+' ₫';
function vFin(){const [pf,title,src,docL]=FIN[S.view];const [f,t]=[S.f,S.t];
  let h=secHead('💳 Finance — '+title,D.fin&&D.fin.max[pf]?'Số tới '+fd(D.fin.max[pf]):'');
  if(!ready('fin'))return h+waitBox('fin');
  const all=D.fin.rows.filter(r=>r.pf===pf);
  if(!all.length)return h+`<div class="info">Chưa có dữ liệu ${esc(title)}. Nguồn: ${esc(src)}.</div>`;
  const uq=k=>[...new Set(all.map(r=>r[k]))].filter(Boolean).sort(),accs=uq('acc'),sts=uq('st'),kinds=uq('kind');
  [['finAcc',accs],['finSt',sts],['finKind',kinds]].forEach(([k,l])=>{if(S[k]!=='all'&&!l.includes(S[k]))S[k]='all'});
  const SP=pf==='Shopee',TX=!SP;
  h+=`<div class="filter-bar">${sel('finAcc',SP?'Shop':'Tài khoản',S.finAcc,[['all','Tất cả'],...accs.map(a=>[a,a])])}${SP?'':sel('finSt','Trạng thái',S.finSt,[['all','Tất cả'],...sts.map(a=>[a,a])])}${sel('finKind','Loại',S.finKind,[['all','Tất cả'],...kinds.map(a=>[a,a])])}
    <div class="fg" style="margin-left:auto;flex:none"><label>&nbsp;</label><button type="button" class="btn-dl" id="finExport">⬇ Tải bảng tổng hợp (.csv)</button></div></div>`;
  const ok=r=>(S.finAcc==='all'||r.acc===S.finAcc)&&(SP||S.finSt==='all'||r.st===S.finSt)&&(S.finKind==='all'||r.kind===S.finKind);
  const R=all.filter(r=>inR(r,f,t)&&ok(r)),paid=r=>/^paid|thành công|success|completed/i.test(r.st),bad=r=>/fail|thất bại|declin/i.test(r.st);
  const P=R.filter(paid),B=R.filter(bad),sum=(a,k='amt')=>a.reduce((x,r)=>x+(r[k]||0),0),cntK=k=>R.filter(r=>r.kind===k);
  window.__finExp={pf,f,t,R,docL,SP};
  h+=`<div class="kpi-grid">${(SP?[kpi('Tổng nạp',vnd(sum(R)),'green',null,`${int(R.length)} giao dịch · ${fd(f)} – ${fd(t)}`),kpi('Nạp tiền',vnd(sum(cntK('Nạp tiền'))),'web',null,`${int(cntK('Nạp tiền').length)} lần`),
      kpi('Credit tặng',vnd(sum(cntK('Credit tặng'))),'gold',null,`${int(cntK('Credit tặng').length)} lần`)]
    :pf==='TikTok'?[kpi('Tổng hoá đơn',vnd(sum(R)),'web',null,`${int(R.length)} hoá đơn`),kpi('Subtotal',vnd(sum(R,'sub')),'purple',null,'trước thuế'),kpi('Tax',vnd(sum(R,'tax')),'tiktok'),
      kpi('Paid',vnd(sum(P)),'green',null,`${int(P.length)} hoá đơn`),kpi('No need to pay',vnd(sum(R.filter(r=>/no need/i.test(r.st)))),'gold',null,`${int(R.filter(r=>/no need/i.test(r.st)).length)} hoá đơn`)]
    :[kpi('Đã thanh toán',vnd(sum(P)),'green',null,`${int(P.length)} giao dịch`),kpi('Subtotal',vnd(sum(P,'sub')),'purple',null,'trước thuế · đã thanh toán'),kpi('Tax',vnd(sum(P,'tax')),'tiktok',null,'đã thanh toán'),
      kpi('Thất bại',vnd(sum(B)),'shopee',null,`${int(B.length)} giao dịch`),kpi(docL,int(R.filter(r=>r.doc).length),'web',null,'có số hoá đơn')]).join('')}</div>`;
  const M={},ms=new Set(),gk=r=>SP?r.kind:r.acc;all.filter(r=>ok(r)&&(SP||pf==='TikTok'||paid(r))).forEach(r=>{const m=r.d.slice(0,7);ms.add(m);M[gk(r)+'|'+m]=(M[gk(r)+'|'+m]||0)+Math.abs(r.amt)});
  const ML=[...ms].sort().slice(-12),AC=SP?kinds:[...new Set(all.filter(ok).map(r=>r.acc))].sort();
  h+=`<div class="chart-grid wide">${chartCard('fin-m',(SP?'Nạp tiền':pf==='TikTok'?'Tổng hoá đơn':'Đã thanh toán')+' theo tháng',SP?'12 tháng gần nhất · theo loại':'12 tháng gần nhất · theo tài khoản')}<div class="chart-card"><h3>Nguồn</h3><p class="sub">${esc(src)}</p>${sub('Có số từ',fd(D.fin.min[pf]))}${sub('Tới',fd(D.fin.max[pf]))}${sub('Tổng dòng',int(all.length))}</div></div>`;
  plot('fin-m',barCfg(ML.map(m=>m.slice(5)+'/'+m.slice(2,4)),AC.map((a,i)=>({label:a,data:ML.map(m=>M[a+'|'+m]||0),backgroundColor:PAL[(SP?i+4:i)%PAL.length],borderRadius:3}))));
  h+=table('fin-tx','Giao dịch',`${R.length} dòng trong kỳ`,[{k:'d',l:'Ngày',f:fd},{k:'acc',l:SP?'Shop':'Tài khoản'},{k:'amt',l:'Số tiền',f:vnd,r:1},...(TX?[{k:'sub',l:'Subtotal',f:vnd,r:1},{k:'tax',l:'Tax',f:vnd,r:1}]:[]),{k:'st',l:'Trạng thái',f:stTag},{k:'kind',l:'Loại'},...(docL?[{k:'doc',l:docL}]:[])],
    R,{limit:100,def:{k:'d',asc:false},total:TX?{amt:sum(R),sub:sum(R,'sub'),tax:sum(R,'tax')}:{amt:sum(R)}});
  return h}
function finExport(){const E=window.__finExp;if(!E)return;const q=v=>{v=String(v==null?'':v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  const H=['Nền tảng',E.SP?'Shop':'Tài khoản','Ngày','Số tiền (VND)',...(E.SP?[]:['Subtotal (VND)','Tax (VND)']),'Trạng thái','Loại',...(E.docL?[E.docL]:[])];
  const rows=[...E.R].sort((a,b)=>a.d<b.d?1:-1).map(r=>[E.pf,r.acc,r.d,r.amt,...(E.SP?[]:[r.sub??'',r.tax??'']),r.st,r.kind,...(E.docL?[r.doc]:[])]);
  const s=(k)=>E.R.reduce((x,r)=>x+(r[k]||0),0);
  const tot=['Tổng','','',s('amt'),...(E.SP?[]:[s('sub'),s('tax')]),'','',...(E.docL?['']:[])];
  const flt=`# Bộ lọc: ${fd(E.f)}–${fd(E.t)} · ${E.SP?'Shop':'Tài khoản'}: ${S.finAcc==='all'?'Tất cả':S.finAcc}${E.SP?'':' · Trạng thái: '+(S.finSt==='all'?'Tất cả':S.finSt)} · Loại: ${S.finKind==='all'?'Tất cả':S.finKind}`;
  const csvTxt='﻿'+[[flt],H,...rows,tot].map(r=>r.map(q).join(',')).join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csvTxt],{type:'text/csv;charset=utf-8'}));a.download=`finance_${E.pf.toLowerCase()}_${E.f}_${E.t}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
const NAV=[['Tổng quan',[['overview','📊','Tổng quan']]],['By Channel',[['shopee',ICON.shopee,'Shopee','Live + Video'],['tiktok',ICON.tiktok,'TikTok','HO + MCN'],['web',ICON.web,'Hannaholala.com','Web'],['media','📣','Media','Ads'],['prmkt','📱','Pr_MKT']]],['Analytics',[['brand','🏷️','By Brand'],['product','📦','By Product'],['deal','⚖️','Deal Compare','3 kênh']]],['Finance',[['finmeta','🧾','Invoice Meta Ads'],['fintt','🧾','Invoice TikTok'],['finsp','💱','Transaction Shopee']]]];
const VIEWS={finmeta:vFin,fintt:vFin,finsp:vFin,deal:vDeal,overview:vOverview,shopee:vShopee,tiktok:vTiktok,web:vWeb,media:vMedia,prmkt:vPrmkt,brand:vBrand,product:vProduct};
const TITLES={finmeta:'Invoice Meta Ads',fintt:'Invoice TikTok',finsp:'Transaction Shopee',deal:'Deal Compare 3 kênh',overview:'Tổng quan',shopee:'Shopee',tiktok:'TikTok',web:'Hannaholala.com',media:'Media',prmkt:'Pr_MKT',brand:'By Brand',product:'By Product'};
const NEED={finmeta:['fin'],fintt:['fin'],finsp:['fin'],deal:[],overview:['sh','tt','web','md','pr','ttp'],shopee:['sh','ttp','web'],tiktok:['tt','ttp','web'],web:['web','sh','ttp'],media:['md'],prmkt:['pr'],brand:['sh','ttp','web','tt'],product:['sh','ttp','web']};
for(const v of ['overview','shopee','tiktok','web','product','brand'])NEED[v].push('cat');
const BRAND_VIEWS=['overview','shopee','tiktok','web','product','brand'];
function render(){NEED[S.view].forEach(load);
  const lm=addD(YD.slice(0,8)+'01',-1);
  $('#nav').innerHTML=NAV.map(([lab,items])=>`<div class="nav-section"><div class="nav-label">${lab}</div>${items.map(([k,ic,l,b])=>`<a class="nav-item ${S.view===k?'active':''}" href="#${k}"><span class="icon">${ic}</span>${l}${b?`<span class="badge">${b}</span>`:''}</a>`).join('')}</div>`).join('');
  const upd=[['Shopee',D.sh],['TikTok',D.tt],['Website',D.web],['Media',D.md]].filter(x=>x[1]).map(([n,d])=>`${n} ${fd(d.max)}`).join(' · ');
  {const m=$('#mTitle');if(m)m.textContent=TITLES[S.view]}
  $('#topbar').innerHTML=`<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap"><span class="topbar-title">${TITLES[S.view]}</span><span class="topbar-sub">${S.f===S.t?fd(S.f):fd(S.f)+' – '+fd(S.t)}${upd?' · số tới: '+upd:''}</span></div>
   <div class="time-btns">${[['d','Hôm qua '+fd(YD)],['mtd','MTD T'+(+YD.slice(5,7))],['ytd','YTD '+YD.slice(0,4)],['7','7 ngày'],['30','30 ngày'],['lm','Tháng '+(+lm.slice(5,7))],['c','📅 Tuỳ chọn']].map(([k,l])=>`<button class="tbtn ${S.p===k||(k==='c'&&S.p==='')?'active':''}" data-p="${k}">${l}</button>`).join('')}
   ${BRAND_VIEWS.includes(S.view)?brandPicker()+catPicker():''}
   ${S.p===''||S.showDates?`<span class="dates"><input type="date" id="from" value="${S.f}"> – <input type="date" id="to" value="${S.t}"></span>`:''}</div>`;
  $('#content').innerHTML=VIEWS[S.view]();if(S.view==='deal')loadWatch();
  flushCharts();
  document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{if(b.dataset.p==='c'){S.showDates=!S.showDates;render();return}S.showDates=false;S.p=b.dataset.p;[S.f,S.t]=preset(S.p);render()});
  ['from','to'].forEach(id=>{const e=document.getElementById(id);if(e)e.onchange=()=>{const a=$('#from').value,b=$('#to').value;if(!a||!b)return;S.p='';[S.f,S.t]=a>b?[b,a]:[a,b];render()}});
  document.querySelectorAll('select[data-s]').forEach(e=>e.onchange=()=>{S[e.dataset.s]=e.value;if(e.dataset.s==='shAcc')S.shIds.clear();if(e.dataset.s==='ttAcc')S.ttIds.clear();if(/^c[12]$/.test(e.dataset.s)){S.c3='';if(e.dataset.s==='c1')S.c2=''}render()});
  bindBrandPicker();bindMultiPick();
  document.querySelectorAll('[data-bsel]').forEach(b=>b.onclick=e=>{e.preventDefault();S.brSelS=new Set([b.dataset.bsel]);render();const d=document.querySelector('.bd');d&&d.scrollIntoView({behavior:'smooth',block:'start'})});
  {const x=document.getElementById('finExport');if(x)x.onclick=finExport}
  document.querySelectorAll('[data-mo]').forEach(b=>b.onclick=()=>{const k=b.dataset.mo,O=S.mdObj;if(k==='*')O.clear();else if(O.has(k))O.delete(k);else O.add(k);render()});
  const q=document.querySelector('input[data-s="pdQ"]');if(q){let tm;q.oninput=()=>{clearTimeout(tm);tm=setTimeout(()=>{S.pdQ=q.value;render();const n=document.querySelector('input[data-s="pdQ"]');n.focus();n.setSelectionRange(n.value.length,n.value.length)},300)}}
  document.querySelectorAll('th[data-k]').forEach(th=>th.onclick=()=>{const id=th.dataset.t,k=th.dataset.k,c=S.sort[id];S.sort[id]={k,asc:c&&c.k===k?!c.asc:false};render()});
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{location.hash=b.dataset.go});
}
function menu(open){document.body.classList.toggle('menu-open',open);const b=$('#menuBtn');if(b)b.setAttribute('aria-expanded',open?'true':'false')}
document.addEventListener('click',e=>{if(e.target.closest('#menuBtn'))menu(!document.body.classList.contains('menu-open'));else if(e.target.closest('#scrim')||e.target.closest('.sidebar .nav-item'))menu(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape')menu(false)});
function route(){const v=location.hash.slice(1);S.view=VIEWS[v]?v:'overview';render();window.scrollTo({top:0})}
[S.f,S.t]=preset(S.p);
window.addEventListener('hashchange',route);
window.addEventListener('load',()=>render());
route();
})();
