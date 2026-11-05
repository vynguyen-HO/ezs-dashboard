/* PFM Ads Report 2026 — static dashboard (GitHub Pages). Data: data/*.csv */
(function(){
'use strict';
const CH=['Meta','TikTok','Shopee'];
const CHNAME={Meta:'Meta',TikTok:'TikTok',Shopee:'Shopee Live'};
const CHVAR={Meta:'--meta',TikTok:'--tiktok',Shopee:'--shopee'};
const TYPENAME={ads:'Ads thường',gmv_max_live:'LIVE GMV Max',gmv_max_product:'Product GMV Max',live_ads:'Live Ads'};
const NONREV=/ENGAGEMENT|AWARENESS|VIDEO_VIEWS|REACH|TRAFFIC/;
const S={tab:'overview',preset:'d',from:null,to:null,chs:['Meta','TikTok','Shopee'],fmt:''};
const FMTNAME={live:'Live',video:'Video / post'};
const isLive=c=>c.type==='gmv_max_live'||c.type==='live_ads'||(c.channel==='Meta'&&/LSA|LIVE/i.test(c.name||''));
let D=null; const charts={};

/* ---------- utils ---------- */
const $=s=>document.querySelector(s);
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
function parseCSV(t){const L=t.trim().split(/\r?\n/);const h=L[0].split(',');return L.slice(1).map(l=>{const c=[];let cur='',q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(ch==='"'){if(q&&l[i+1]==='"'){cur+='"';i++}else q=!q}else if(ch===','&&!q){c.push(cur);cur=''}else cur+=ch}c.push(cur);const o={};h.forEach((k,i)=>o[k]=c[i]===undefined?'':c[i]);return o})}
const dt=s=>{const [y,m,d]=s.split('-').map(Number);return Date.UTC(y,m-1,d)};
const ds=t=>new Date(t).toISOString().slice(0,10);
const addD=(s,n)=>ds(dt(s)+n*864e5);
const nDays=(a,b)=>Math.round((dt(b)-dt(a))/864e5)+1;
const eom=(y,m)=>new Date(Date.UTC(y,m,0)).getUTCDate();
function shiftMonth(s,k){const [y,m,d]=s.split('-').map(Number);let mm=m-1+k,yy=y+Math.floor(mm/12);mm=((mm%12)+12)%12;const last=eom(yy,mm+1);return `${yy}-${String(mm+1).padStart(2,'0')}-${String(Math.min(d,last)).padStart(2,'0')}`}
const isEom=s=>{const [y,m,d]=s.split('-').map(Number);return d===eom(y,m)};
const fd=s=>{const [y,m,d]=s.split('-');return `${+d}/${+m}`};
const fdy=s=>{const [y,m,d]=s.split('-');return `${+d}/${+m}/${y}`};
const fr=(a,b)=>a===b?fdy(a):`${fd(a)} – ${fdy(b)}`;
function money(v){if(v==null||!isFinite(v))return '–';const a=Math.abs(v);if(a>=1e9)return (v/1e9).toFixed(a>=1e11?0:2).replace('.',',')+' tỷ';if(a>=1e6)return (v/1e6).toFixed(a>=1e8?0:1).replace('.',',')+' tr';if(a>=1e3)return Math.round(v/1e3).toLocaleString('vi-VN')+'k';return Math.round(v).toLocaleString('vi-VN')}
const num=v=>v==null||!isFinite(v)?'–':Math.round(v).toLocaleString('vi-VN');
const dec=(v,k=2)=>v==null||!isFinite(v)?'–':v.toFixed(k).replace('.',',');
const pct=(v,k=1)=>v==null||!isFinite(v)?'–':(v*100).toFixed(k).replace('.',',')+'%';
const div=(a,b)=>b?a/b:null;
const chg=(c,p)=>(p==null||!isFinite(p)||p===0||c==null||!isFinite(c))?null:(c-p)/Math.abs(p);
function dcls(x,good){if(x==null||Math.abs(x)<0.005)return 'flat';if(good===0)return 'flat';return (x>0)===(good>0)?'up':'down'}
function dtxt(x){if(x==null)return '–';const s=(x>0?'+':'')+(x*100).toFixed(Math.abs(x)<0.1?1:0).replace('.',',')+'%';return (x>0?'▲ ':x<0?'▼ ':'')+s}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- data ---------- */
async function load(){
  const get=f=>fetch('data/'+f+'?v='+Date.now()).then(r=>{if(!r.ok)throw new Error(f);return r.text()}).then(parseCSV);
  const [camps,daily,gmvd,gmvm]=await Promise.all([get('campaigns.csv'),get('campaign_daily.csv'),get('gmv_daily.csv'),get('gmv_monthly.csv')]);
  const C={};camps.forEach(c=>{c.fmt=isLive(c)?'live':'video';C[c.key]=c});
  const rows=daily.map(r=>{const c=C[r.key]||{channel:'?',account:'?',type:'?',name:r.key,objective:''};return {fmt:isLive(c)?'live':'video',date:r.date,key:r.key,ch:c.channel,acc:c.account,type:c.type,name:c.name,obj:c.objective,spend:+r.spend,imp:+r.impressions,clk:+r.clicks,ord:+r.orders,rev:+r.revenue,views:+r.views}});
  const last={};rows.forEach(r=>{if(r.spend>0&&(!last[r.ch]||r.date>last[r.ch]))last[r.ch]=r.date});
  const maxDate=CH.map(c=>last[c]).filter(Boolean).sort().pop();
  const gd={};gmvd.forEach(r=>{(gd[r.channel]=gd[r.channel]||{})[r.date]=+r.gmv});
  // today's numbers (Vietnam time) are partial: quick presets end yesterday, today stays pickable by hand
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
  const anchor=maxDate>=today?addD(today,-1):maxDate;
  D={C,rows,all:rows,last,maxDate:anchor,dataMax:maxDate,today,gd,gmvm};
  // optional: Meta ad-level data (creative table); dashboard still works without it
  try{
    const [ai,ad]=await Promise.all([get('meta_ads.csv'),get('meta_ads_daily.csv')]);
    D.mi={};ai.forEach(a=>D.mi[a.ad_id]=a);
    D.ma=ad.map(r=>({date:r.date,ad:r.ad_id,spend:+r.spend,imp:+r.impressions,clk:+r.clicks,ord:+r.orders,rev:+r.revenue}));
    D.maFrom=D.ma.reduce((m,r)=>r.date<m?r.date:m,'9999');
  }catch(e){D.ma=null}
  // optional: TikTok live sessions + per-video ad data
  const opt=f=>get(f).catch(()=>null);
  const [tli,tld,tvi,tvd]=await Promise.all(['tiktok_lives.csv','tiktok_live_daily.csv','tiktok_videos.csv','tiktok_video_daily.csv'].map(opt));
  if(tli&&tld){D.tli={};tli.forEach(r=>D.tli[r.room_id]=r);D.tl=tld.map(r=>({date:r.date,k:r.room_id,acc:r.account,spend:+r.spend,rev:+r.gmv_all,gmv:+r.gmv,ord:+r.orders_all,ords:+r.orders,views:+r.views}));D.tlFrom=minDate(D.tl)}
  if(tvi&&tvd){D.tvi={};tvi.forEach(r=>D.tvi[r.vid_key]=r);D.tv=tvd.map(r=>({date:r.date,k:r.vid_key,spend:+r.spend,rev:+r.gmv,ord:+r.orders}));D.tvFrom=minDate(D.tv)}
}
function applyFilter(){D.rows=D.all.filter(r=>(S.tab!=='overview'||S.chs.includes(r.ch))&&(!S.fmt||r.fmt===S.fmt))}
const gmvOn=ch=>(S.tab!=='overview'||S.chs.includes(ch))&&!(S.fmt==='video'&&ch==='Shopee');
const fmtOk=key=>!S.fmt||((D.C[key]||{}).fmt===S.fmt);
const minDate=a=>a.reduce((m,r)=>r.date<m?r.date:m,'9999');

/* ---------- generic sortable/filterable table (TikTok lives, videos, …) ---------- */
const TB={};
function sumBy(rows,from,to,extra){const M=new Map();for(const r of rows){if(r.date<from||r.date>to)continue;let o=M.get(r.k);if(!o){o={k:r.k,spend:0,rev:0,ord:0,gmv:0,ords:0,views:0,d0:null,d1:null,a0:r.date};M.set(r.k,o)}o.spend+=r.spend;o.rev+=r.rev;o.ord+=r.ord;o.gmv+=r.gmv||0;o.ords+=r.ords||0;o.views+=r.views||0;if(r.date<o.a0)o.a0=r.date;if(r.spend>0){if(!o.d0||r.date<o.d0)o.d0=r.date;if(!o.d1||r.date>o.d1)o.d1=r.date}}
  M.forEach(o=>{if(!o.d0)o.d0=o.d1=o.a0});
  M.forEach(o=>{o.roas=div(o.rev,o.spend);o.cpo=div(o.spend,o.ord);o.cpv=div(o.spend,o.views);if(extra)extra(o)});return M}
function gtable(c){
  const st=TB[c.id]=TB[c.id]||{sort:c.sort||'spend',dir:-1,q:'',lim:25,f:{}};
  let arr=c.rows.slice();
  const T=arr.reduce((s,o)=>s+o.spend,0);
  (c.filters||[]).forEach(f=>{const v=st.f[f.k];if(v)arr=arr.filter(o=>f.get(o)===v)});
  if(st.q){const q=st.q.toLowerCase();arr=arr.filter(o=>c.search(o).toLowerCase().includes(q))}
  const k=st.sort;const sv=o=>{const v=o[k];return typeof v==='string'?v:(v??-1e18)};
  arr.sort((a,b)=>{const x=sv(a),y=sv(b);return (typeof x==='string'?String(y).localeCompare(x):(y-x))*-st.dir});
  const maxS=Math.max(1,...arr.map(o=>o.spend));
  const th=col=>col.s===false?`<th>${col.lab}</th>`:`<th class="s" data-sort="${col.k}">${col.lab}${st.sort===col.k?(st.dir<0?' ↓':' ↑'):''}</th>`;
  const cell=(col,o)=>col.k==='spend'?`<td><span class="bar" style="width:${Math.max(2,o.spend/maxS*60)}px;--c:var(${c.color||'--s1'})"></span>${money(o.spend)}</td>`:col.k==='share'?`<td>${pct(div(o.spend,T),1)}</td>`:`<td>${col.f(o)}</td>`;
  const rows=arr.slice(0,st.lim).map(o=>`<tr>${c.lead?`<td class="num0">${c.lead(o)}</td>`:''}<td class="nm" title="${esc(c.tip?c.tip(o):'')}">${c.name(o)}</td>${c.cols.map(col=>cell(col,o)).join('')}</tr>`).join('');
  const sel=f=>{const opts=[...new Set(c.rows.map(f.get).filter(Boolean))].sort();return `<select data-f="${f.k}"><option value="">${f.all}</option>${opts.map(v=>`<option ${v===st.f[f.k]?'selected':''}>${esc(v)}</option>`).join('')}</select>`};
  return `<div class="tools"><input data-q placeholder="${c.ph||'Tìm…'}" value="${esc(st.q)}">${(c.filters||[]).map(sel).join('')}<span class="cmpinfo">${arr.length} ${c.unit}${c.summary?' · '+c.summary(arr):''}</span></div>
  <div class="tw"><table><thead><tr>${c.lead?`<th class="s" data-sort="${c.leadKey}">${c.leadLab}${st.sort===c.leadKey?(st.dir<0?' ↓':' ↑'):''}</th>`:''}<th class="l">${c.nameLab}</th>${c.cols.map(th).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="${c.cols.length+2}" class="empty">${c.empty}</td></tr>`}</tbody></table></div>
  ${arr.length>st.lim?`<button class="more" data-more>Xem thêm (${arr.length-st.lim})</button>`:''}${c.note?`<div class="note">${c.note}</div>`:''}`;
}
function mountTable(boxId,build){
  const box=document.getElementById(boxId);if(!box)return;
  const draw=(keepFocus)=>{const c=build();box.innerHTML=gtable(c);const st=TB[c.id];
    const q=box.querySelector('[data-q]');q.oninput=()=>{st.q=q.value;st.lim=25;draw(true)};
    if(keepFocus){q.focus();q.setSelectionRange(q.value.length,q.value.length)}
    box.querySelectorAll('select[data-f]').forEach(s=>s.onchange=()=>{st.f[s.dataset.f]=s.value;st.lim=25;draw()});
    const m=box.querySelector('[data-more]');if(m)m.onclick=()=>{st.lim+=50;draw()};
    box.querySelectorAll('th.s').forEach(t=>t.onclick=()=>{const k=t.dataset.sort;if(st.sort===k)st.dir*=-1;else{st.sort=k;st.dir=-1}draw()})};
  draw();
}

/* ---------- TikTok: live sessions & videos ---------- */
const hm=s=>{const m=String(s||'').match(/(?:(\d+)h)?\s*(?:(\d+)m)?/);return m?(+(m[1]||0))*60+(+(m[2]||0)):0};
function liveTable(){
  const M=sumBy(D.tl,S.from,S.to,o=>{const i=D.tli[o.k]||{};o.i=i;o.acc=i.account||'';o.named=!!i.live_name;o.name=i.live_name||('Phiên live '+fd(o.d0)+' (chưa có tên)');o.start=i.launched||o.d0;o.mins=hm(i.duration);o.gpm=o.mins?o.rev/o.mins*60:null});
  const rows=[...M.values()].filter(o=>o.spend>0||o.rev>0);
  return {id:'live',rows,color:'--tiktok',unit:'phiên live',ph:'Tìm tên phiên live…',nameLab:'Phiên live',
    lead:o=>`${fd(o.start.slice(0,10))}<div class="sub">${o.start.slice(11,16)}</div>`,leadKey:'start',leadLab:'Ngày',
    name:o=>`${o.named?esc(o.name):`<span style="color:var(--muted)">${esc(o.name)}</span>`}<div class="sub">${esc(o.acc)}${o.i.duration?' · '+esc(o.i.duration):''} · room ${esc(o.k)}</div>`,tip:o=>o.name,search:o=>o.name+' '+o.k,
    filters:[{k:'acc',all:'Tất cả tài khoản',get:o=>o.acc}],
    cols:[{k:'spend',lab:'Ad spend'},{k:'share',lab:'% spend',s:false},{k:'rev',lab:'Ad GMV <small>all shops</small>',f:o=>money(o.rev)},{k:'roas',lab:'ROI',f:o=>`<b>${dec(o.roas)}</b>`},{k:'gmv',lab:'GMV shop',f:o=>money(o.gmv)},{k:'ord',lab:'Đơn',f:o=>num(o.ord)},{k:'cpo',lab:'CPO',f:o=>money(o.cpo)},{k:'views',lab:'Lượt xem',f:o=>num(o.views)},{k:'cpv',lab:'Chi phí/xem',f:o=>o.cpv==null?'–':Math.round(o.cpv).toLocaleString('vi-VN')+'đ'},{k:'gpm',lab:'Ad GMV/giờ',f:o=>money(o.gpm)}],
    summary:a=>{const s=a.reduce((x,o)=>x+o.spend,0),r=a.reduce((x,o)=>x+o.rev,0);return `tổng ad spend ${money(s)} · ROI ${dec(div(r,s))} · TB ${money(div(s,a.length))}/phiên`},
    empty:'Không có phiên live nào có chi tiêu trong khoảng ngày này.',
    note:`Nguồn: báo cáo LIVE GMV Max theo phiên (room), có từ ${fdy(D.tlFrom)}${S.from<D.tlFrom?' — kỳ chọn bắt đầu trước ngày này nên chưa đủ':''}. Ad GMV (all shops) = toàn bộ GMV phiên live do GMV Max ghi nhận; GMV shop = phần của shop HannahOlala. ROI = Ad GMV ÷ ad spend. Phiên qua nửa đêm được tính theo từng ngày.`};
}
function shopeeSessionTable(){
  const src=D.rows.filter(r=>r.ch==='Shopee').map(r=>({date:r.date,k:r.key,spend:r.spend,rev:r.rev,ord:r.ord,views:r.views}));
  const nice=n=>{const m=String(n).match(/Livestream (\d{4})-(\d\d)-(\d\d) (\d\d:\d\d)/);return m?`Livestream ${+m[3]}/${+m[2]} ${m[4]}${/\[\d+\]/.test(n)?' '+n.match(/\[\d+\]/)[0]:''}`:n};
  const M=sumBy(src,S.from,S.to,o=>{const c=D.C[o.k]||{};o.name=nice(c.name||o.k);o.raw=c.name||'';o.cvr=div(o.ord,o.views);o.dg=(D.gd.Shopee||{})[o.d0]??null;o.sh=o.dg?o.rev/o.dg:null});
  const rows=[...M.values()].filter(o=>o.spend>0||o.rev>0);
  return {id:'shp',rows,color:'--shopee',unit:'phiên live (chiến dịch Live Ads)',ph:'Tìm tên phiên / chiến dịch…',nameLab:'Phiên live',
    lead:o=>`${fd(o.d0)}${o.d1>o.d0?`<div class="sub">→ ${fd(o.d1)}</div>`:''}`,leadKey:'d0',leadLab:'Ngày',
    name:o=>`${esc(o.name)}<div class="sub">${o.raw!==o.name?esc(o.raw)+' · ':''}${esc(o.k.slice(1))}</div>`,tip:o=>o.raw,search:o=>o.name+' '+o.raw+' '+o.k,
    cols:[{k:'spend',lab:'Ad spend'},{k:'share',lab:'% spend',s:false},{k:'rev',lab:'Ad GMV',f:o=>money(o.rev)},{k:'roas',lab:'ROI',f:o=>`<b>${dec(o.roas)}</b>`},{k:'ord',lab:'Đơn',f:o=>num(o.ord)},{k:'cpo',lab:'CPO',f:o=>money(o.cpo)},{k:'views',lab:'Lượt xem (ads)',f:o=>num(o.views)},{k:'cpv',lab:'Chi phí/xem',f:o=>o.cpv==null?'–':Math.round(o.cpv).toLocaleString('vi-VN')+'đ'},{k:'cvr',lab:'CVR',f:o=>pct(o.cvr,2)},{k:'dg',lab:'GMV Live cả ngày',f:o=>money(o.dg)},{k:'sh',lab:'Ad GMV / GMV ngày',f:o=>pct(o.sh,0)}],
    summary:a=>{const s=a.reduce((x,o)=>x+o.spend,0),r=a.reduce((x,o)=>x+o.rev,0);return `tổng ad spend ${money(s)} · ROI ${dec(div(r,s))} · TB ${money(div(s,a.length))}/phiên`},
    empty:'Không có phiên live nào có chi tiêu Live Ads trong khoảng ngày này.',
    note:'Mỗi dòng là một chiến dịch Live Ads (thường ứng với một phiên live; phiên qua nửa đêm có 2 ngày). Ad GMV, đơn, lượt xem là số do Live Ads ghi nhận, có từ 11/4/2026. “GMV Live cả ngày” = GMV Shopee Live (placed) toàn shop của ngày bắt đầu phiên — nếu một ngày có nhiều phiên thì cùng một số. GMV toàn phiên và GMV theo video cần lấy từ Seller Center, sẽ bổ sung khi làm phần cập nhật tự động.'};
}
function videoTable(){
  const SRC={product_gmv_max:'Product GMV Max',video_ads:'Video ads'};
  const M=sumBy(D.tv,S.from,S.to,o=>{const i=D.tvi[o.k]||{};o.i=i;o.acc=i.account||'';o.src=SRC[i.source]||i.source||'';o.ttacc=i.tt_account||'';o.camp=(D.C[i.campaign_key]||{}).name||'';const ph=/^Ad name\d/.test(i.title||'');o.title=o.k==='P-1'?'Thẻ sản phẩm (không gắn video)':(i.title&&!ph?i.title:(o.k[0]==='P'?'Post '+o.k.slice(1):'Ad '+o.k.slice(1)));o.named=!!(i.title&&!ph)});
  const rows=[...M.values()].filter(o=>o.spend>0||o.rev>0);
  const link=o=>o.k[0]==='P'&&o.i.tt_account?` · <a href="https://www.tiktok.com/@${encodeURIComponent(o.i.tt_account)}/video/${o.k.slice(1)}" target="_blank" rel="noopener">xem video</a>`:'';
  return {id:'vid',rows,sort:'rev',color:'--tiktok',unit:'video',ph:'Tìm tiêu đề, tài khoản, sản phẩm…',nameLab:'Video',
    name:o=>`${o.named?esc(o.title):`<span style="color:var(--muted)">${esc(o.title)}</span>`}<div class="sub">${esc(o.src)}${o.ttacc?' · @'+esc(o.ttacc):''}${o.camp?' · '+esc(o.camp):''}${link(o)}</div>`,tip:o=>o.title+(o.camp?' — '+o.camp:''),search:o=>[o.title,o.ttacc,o.camp,o.k].join(' '),
    filters:[{k:'src',all:'Tất cả nguồn',get:o=>o.src},{k:'acc',all:'Tất cả tài khoản ads',get:o=>o.acc}],
    cols:[{k:'rev',lab:'Ad GMV',f:o=>`<b>${money(o.rev)}</b>`},{k:'spend',lab:'Ad spend'},{k:'share',lab:'% spend',s:false},{k:'roas',lab:'ROI',f:o=>dec(o.roas)},{k:'ord',lab:'Đơn',f:o=>num(o.ord)},{k:'cpo',lab:'CPO',f:o=>money(o.cpo)}],
    summary:a=>`tổng ad GMV ${money(a.reduce((x,o)=>x+o.rev,0))}`,
    empty:'Không có video nào có chi tiêu trong khoảng ngày này.',
    note:`GMV theo video ở đây là GMV <b>từ ads</b>: Product GMV Max theo từng post + video ads thường theo từng ad, có từ ${fdy(D.tvFrom)}. GMV tự nhiên (organic) của từng video chưa có trong nguồn ads. Phần lớn post Product GMV Max và video ads không có tiêu đề qua API nên hiện theo ID kèm tên chiến dịch; “Thẻ sản phẩm” = chi tiêu Product GMV Max không gắn video.`};
}

/* ---------- aggregation ---------- */
function agg(from,to,fn){const o={spend:0,imp:0,clk:0,ord:0,rev:0,views:0,n:0};for(const r of D.rows){if(r.date<from||r.date>to)continue;if(fn&&!fn(r))continue;o.spend+=r.spend;o.imp+=r.imp;o.clk+=r.clk;o.ord+=r.ord;o.rev+=r.rev;o.views+=r.views;o.n++}return derive(o)}
function derive(o){o.roas=div(o.rev,o.spend);o.cpo=div(o.spend,o.ord);o.ctr=div(o.clk,o.imp);o.cpc=div(o.spend,o.clk);o.cpm=o.imp?o.spend/o.imp*1000:null;o.aov=div(o.rev,o.ord);o.cpv=div(o.spend,o.views);o.cvr=div(o.ord,o.views);return o}
function gmvSum(ch,from,to){const m=D.gd[ch];if(!m)return null;let s=0,n=0;for(const d in m){if(d>=from&&d<=to){s+=m[d];n++}}return n?s:null}
function byKey(from,to,fn,kf){const M=new Map();for(const r of D.rows){if(r.date<from||r.date>to)continue;if(fn&&!fn(r))continue;const k=kf(r);let o=M.get(k);if(!o){o={k,spend:0,imp:0,clk:0,ord:0,rev:0,views:0,r};M.set(k,o)}o.spend+=r.spend;o.imp+=r.imp;o.clk+=r.clk;o.ord+=r.ord;o.rev+=r.rev;o.views+=r.views}M.forEach(derive);return M}

/* ---------- periods ---------- */
function periods(){
  const {from,to}=S;const n=nDays(from,to);
  let p1={from:addD(from,-n),to:addD(to,-n)};
  let p2,l1,l2,s1='kỳ trước',s2='tháng trước';
  if(n===1){p2={from:addD(from,-7),to:addD(to,-7)};l1='hôm trước';l2='7 ngày trước';s1='hôm qua';s2='−7 ngày'}
  else{
    const wholeMonth=from.endsWith('-01')&&isEom(to)&&from.slice(0,7)===to.slice(0,7);
    p2={from:shiftMonth(from,-1),to:wholeMonth?(()=>{const t=shiftMonth(to.slice(0,8)+'01',-1);const [y,m]=t.split('-').map(Number);return `${t.slice(0,8)}${String(eom(y,m)).padStart(2,'0')}`})():shiftMonth(to,-1)};
    if(wholeMonth){p1=p2;l1='tháng trước';const f2=shiftMonth(from,-2);const [y2,m2]=f2.split('-').map(Number);p2={from:f2,to:f2.slice(0,8)+String(eom(y2,m2)).padStart(2,'0')};l2='2 tháng trước';s1='tháng trước';s2='2 tháng trước'}
    else{l1=`${n} ngày trước đó`;l2='cùng kỳ tháng trước'}
  }
  return {n,p1,p2,l1,l2,s1,s2};
}
function applyPreset(p){
  const m=D.maxDate;S.preset=p;
  if(p==='d'){S.from=S.to=m}
  else if(p==='7d'){S.to=m;S.from=addD(m,-6)}
  else if(p==='30d'){S.to=m;S.from=addD(m,-29)}
  else if(p==='mtd'){S.to=m;S.from=m.slice(0,8)+'01'}
  else if(p==='lm'){const f=shiftMonth(m.slice(0,8)+'01',-1);const [y,mm]=f.split('-').map(Number);S.from=f;S.to=f.slice(0,8)+String(eom(y,mm)).padStart(2,'0')}
  else if(p==='ytd'){S.to=m;S.from=m.slice(0,4)+'-01-01'}
}

/* ---------- small renderers ---------- */
function dl(x,good,label){return `<div class="d ${dcls(x,good)}"><span class="n">${dtxt(x)}</span><span class="t">${label}</span></div>`}
function kpi(lb,v,c,p1,p2,P,good=1,fmt=money){return `<div class="card kpi"><div class="lb">${lb}</div><div class="v">${fmt(c)}</div><div class="ds">${dl(chg(c,p1),good,'vs '+P.s1)}${dl(chg(c,p2),good,'vs '+P.s2)}</div></div>`}
function pill(x,good){return `<span class="pill ${dcls(x,good)}">${dtxt(x)}</span>`}
function setChart(id,cfg){if(charts[id])charts[id].destroy();const el=document.getElementById(id);if(!el||!window.Chart)return;charts[id]=new Chart(el,cfg)}
function chartBase(){const g=css('--line'),t=css('--muted');Chart.defaults.font.family='Inter,system-ui,sans-serif';Chart.defaults.font.size=11.5;Chart.defaults.color=t;return {g,t}}

/* ---------- daily chart ---------- */
function dailyChart(id,fn,stackBy,colors,gmvCh){
  const {g}=chartBase();
  const n=nDays(S.from,S.to);const cf=n<14?addD(S.to,-13):S.from;
  const days=[];for(let d=cf;d<=S.to;d=addD(d,1))days.push(d);
  const M=byKey(cf,S.to,fn,r=>r.date+'|'+stackBy(r));
  const groups=[...new Set([...M.values()].map(o=>o.k.split('|')[1]))];
  const tot=byKey(cf,S.to,fn,r=>r.date);
  groups.sort((a,b)=>{const sa=[...M.values()].filter(o=>o.k.endsWith('|'+a)).reduce((s,o)=>s+o.spend,0),sb=[...M.values()].filter(o=>o.k.endsWith('|'+b)).reduce((s,o)=>s+o.spend,0);return sb-sa});
  const pal=['--s1','--s2','--s3','--s4','--s5','--s6','--s7','--s8'];
  const ds=groups.map((gname,i)=>({type:'bar',label:'Chi phí · '+gname,data:days.map(d=>(M.get(d+'|'+gname)||{}).spend||0),backgroundColor:days.map(d=>{const c=css(colors&&colors[gname]||pal[i%8]);return (d>=S.from&&d<=S.to)||n>=14?c:c+'66'}),stack:'s',yAxisID:'y',order:2,borderRadius:2}));
  ds.push({type:'line',label:'Doanh thu ads',data:days.map(d=>(tot.get(d)||{}).rev||0),borderColor:css('--fg'),backgroundColor:css('--fg'),yAxisID:'y1',pointRadius:days.length>45?0:2.5,borderWidth:2,tension:.25,order:1});
  if(gmvCh){const gd=d=>{let s=0,k=0;gmvCh.forEach(c=>{const v=(D.gd[c]||{})[d];if(v!=null){s+=v;k++}});return k?s:null};
    ds.push({type:'line',label:'Total GMV ('+gmvCh.map(c=>CHNAME[c]).join(' + ')+')',data:days.map(gd),borderColor:css('--muted'),backgroundColor:css('--muted'),borderDash:[5,4],yAxisID:'y1',pointRadius:0,borderWidth:2,tension:.25,order:0,spanGaps:false})}
  setChart(id,{data:{labels:days.map(fd),datasets:ds},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
    plugins:{legend:{position:'bottom',labels:{boxWidth:10,boxHeight:10,usePointStyle:true}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${money(c.parsed.y)}`,footer:it=>{const d=days[it[0].dataIndex];const o=tot.get(d);return o?`ROAS: ${dec(o.roas)}`:''}}}},
    scales:{x:{stacked:true,grid:{display:false},ticks:{maxRotation:0,autoSkipPadding:10}},y:{stacked:true,grid:{color:g},ticks:{callback:v=>money(v)},title:{display:true,text:'Chi phí'}},y1:{position:'right',grid:{display:false},ticks:{callback:v=>money(v)},title:{display:true,text:'Doanh thu'}}}}});
}

/* ---------- insights ---------- */
function insights(scope,cur,p1,p2,P,camps){
  const out=[];const rec=[];
  const sc=chg(cur.spend,p1.spend),rc=chg(cur.rev,p1.rev),oc=chg(cur.roas,p1.roas);
  const sc2=chg(cur.spend,p2.spend),rc2=chg(cur.rev,p2.rev),oc2=chg(cur.roas,p2.roas);
  if(!cur.spend&&!cur.rev){return '<div class="empty">Không có dữ liệu trong khoảng ngày đã chọn.</div>'}
  const word=x=>x==null?'không so sánh được':(x>=0?'tăng ':'giảm ')+pct(Math.abs(x),0);
  const t1=`So với ${P.l1}: chi phí ${word(sc)}, doanh thu ads ${word(rc)}, ROAS ${dec(p1.roas)} → <b>${dec(cur.roas)}</b>.`;
  out.push({c:oc==null?'info':oc>=0.03?'good':oc<=-0.03?'bad':'info',i:'Δ',t:t1});
  out.push({c:oc2==null?'info':oc2>=0.03?'good':oc2<=-0.03?'bad':'info',i:'Δ',t:`So với ${P.l2}: chi phí ${word(sc2)}, doanh thu ${word(rc2)}, ROAS ${dec(p2.roas)} → ${dec(cur.roas)}.`});
  if(sc!=null&&rc!=null){
    if(sc>0.1&&(rc<sc-0.1)) {out.push({c:'warn',i:'!',t:`Chi phí tăng nhanh hơn doanh thu (${pct(sc,0)} vs ${pct(rc,0)}) — hiệu quả biên đang giảm.`});rec.push('Siết ngân sách các chiến dịch ROAS thấp, nâng mục tiêu ROI/ROAS cho chiến dịch tự động trước khi tăng tiếp ngân sách.')}
    if(sc<-0.1&&rc<sc-0.05) {out.push({c:'warn',i:'!',t:`Cắt chi phí (${pct(sc,0)}) nhưng doanh thu giảm sâu hơn (${pct(rc,0)}) — có thể đã cắt nhầm chiến dịch hiệu quả.`});rec.push('Rà lại các chiến dịch bị giảm ngân sách có ROAS cao kỳ trước và khôi phục ngân sách cho nhóm này.')}
    if(rc>0.1&&oc>0.05) out.push({c:'good',i:'✓',t:`Doanh thu tăng ${pct(rc,0)} với ROAS cải thiện — tăng trưởng có hiệu quả.`});
  }
  if(scope==='overview'){
    const chs=CH.map(c=>({c,cur:agg(S.from,S.to,r=>r.ch===c),p:agg(P.p1.from,P.p1.to,r=>r.ch===c)})).filter(x=>x.cur.spend>0);
    if(chs.length){
      const best=[...chs].sort((a,b)=>(b.cur.roas||0)-(a.cur.roas||0))[0],worst=[...chs].sort((a,b)=>(a.cur.roas||0)-(b.cur.roas||0))[0];
      const big=[...chs].sort((a,b)=>b.cur.spend-a.cur.spend)[0];
      out.push({c:'info',i:'i',t:`${CHNAME[big.c]} chiếm ${pct(big.cur.spend/cur.spend,0)} chi phí. ROAS cao nhất: <b>${CHNAME[best.c]}</b> (${dec(best.cur.roas)}); thấp nhất: ${CHNAME[worst.c]} (${dec(worst.cur.roas)}).`});
      chs.forEach(x=>{const d=chg(x.cur.roas,x.p.roas);if(d!=null&&d<=-0.2&&x.cur.spend/cur.spend>0.1){out.push({c:'bad',i:'▼',t:`ROAS ${CHNAME[x.c]} giảm ${pct(-d,0)} so với ${P.l1} (${dec(x.p.roas)} → ${dec(x.cur.roas)}).`});rec.push(`Kiểm tra ${CHNAME[x.c]}: xem tab kênh để biết chiến dịch nào kéo ROAS xuống.`)}
        if(d!=null&&d>=0.2&&x.cur.spend/cur.spend>0.1)out.push({c:'good',i:'▲',t:`ROAS ${CHNAME[x.c]} tăng ${pct(d,0)} (${dec(x.p.roas)} → ${dec(x.cur.roas)}).`})});
      if(best.c!==worst.c&&(best.cur.roas||0)>1.5*(worst.cur.roas||0))rec.push(`Cân nhắc chuyển một phần ngân sách từ ${CHNAME[worst.c]} sang ${CHNAME[best.c]} cho các phiên live/sale tới, nếu tồn kho và lịch live cho phép.`);
    }
    // plan pacing
    const mo=S.to.slice(0,7);const gm=D.gmvm.find(r=>r.month===mo);
    if(gm&&S.to===D.maxDate){const [y,m,d]=S.to.split('-').map(Number);const el=d/eom(y,m);
      [['fb','Facebook'],['tt','TikTok'],['sp','Shopee']].forEach(([k,lab])=>{const pl=+gm[k+'_plan'],ac=+gm[k+'_actual'];if(pl){const r=ac/pl;if(r<el-0.1){out.push({c:'warn',i:'!',t:`GMV ${lab} tháng ${m}: đạt ${pct(r,0)} kế hoạch, trong khi đã qua ${pct(el,0)} thời gian tháng.`});rec.push(`${lab}: cần ${money((pl-ac)/Math.max(1,eom(y,m)-d))}/ngày trong ${eom(y,m)-d} ngày còn lại để về đích kế hoạch tháng.`)}else if(r>=el)out.push({c:'good',i:'✓',t:`GMV ${lab} tháng ${m}: đạt ${pct(r,0)} kế hoạch — đang đi trước tiến độ (${pct(el,0)} thời gian).`})}})}
  }
  if(camps&&camps.length&&cur.spend>0){
    const avg=cur.roas||0;
    const top=[...camps].filter(c=>c.rev>0).sort((a,b)=>b.rev-a.rev)[0];
    if(top)out.push({c:'info',i:'★',t:`Chiến dịch mang doanh thu lớn nhất: <b>${esc(top.r.name)}</b> — ${money(top.rev)} (${pct(top.rev/(cur.rev||1),0)} doanh thu), ROAS ${dec(top.roas)}.`});
    const weak=camps.filter(c=>c.spend/cur.spend>=0.05&&c.rev>0&&avg&&c.roas<0.5*avg).sort((a,b)=>b.spend-a.spend).slice(0,3);
    if(weak.length){out.push({c:'bad',i:'▼',t:`ROAS thấp dưới một nửa trung bình (${dec(avg)}) nhưng chiếm nhiều chi phí: ${weak.map(c=>`<b>${esc(c.r.name)}</b> (ROAS ${dec(c.roas)}, ${pct(c.spend/cur.spend,0)} chi phí)`).join('; ')}.`});rec.push('Giảm ngân sách hoặc tối ưu (creative, khung giờ live, mục tiêu ROI) cho nhóm chiến dịch ROAS thấp ở trên.')}
    const zero=camps.filter(c=>c.rev===0&&c.spend/cur.spend>=0.02&&!NONREV.test(c.r.obj||''));
    if(zero.length){out.push({c:'warn',i:'!',t:`${zero.length} chiến dịch chuyển đổi tiêu ${money(zero.reduce((s,c)=>s+c.spend,0))} nhưng chưa ghi nhận doanh thu: ${zero.slice(0,3).map(c=>esc(c.r.name)).join(', ')}${zero.length>3?'…':''}.`});rec.push('Kiểm tra tracking/thuộc tính chuyển đổi của các chiến dịch 0 doanh thu; nếu vẫn không ra đơn sau 2–3 ngày thì tắt.')}
    const nonrev=camps.filter(c=>c.rev===0&&NONREV.test(c.r.obj||'')).reduce((s,c)=>s+c.spend,0);
    if(nonrev/cur.spend>0.05)out.push({c:'info',i:'i',t:`${pct(nonrev/cur.spend,0)} chi phí (${money(nonrev)}) thuộc chiến dịch tương tác/xem live/nhận diện — không đo doanh thu trực tiếp, nên ROAS kênh bị kéo xuống.`});
    const stars=camps.filter(c=>avg&&c.roas>=1.5*avg&&c.spend/cur.spend<0.15&&c.spend/cur.spend>=0.01&&c.ord>=3).sort((a,b)=>b.roas-a.roas).slice(0,3);
    if(stars.length)rec.push(`Có thể tăng ngân sách thử 20–30% cho chiến dịch ROAS cao nhưng còn nhỏ: ${stars.map(c=>`${esc(c.r.name)} (ROAS ${dec(c.roas)})`).join('; ')}.`);
  }
  if(nDays(S.from,S.to)>2){
    const bd=byKey(S.from,S.to,scope==='overview'?null:(r=>r.ch===scope),r=>r.date);const arr=[...bd.values()].sort((a,b)=>b.rev-a.rev);
    if(arr[0]&&arr[0].rev>0){const sh=arr[0].rev/(cur.rev||1);out.push({c:'info',i:'◆',t:`Ngày doanh thu ads cao nhất: <b>${fdy(arr[0].k)}</b> — ${money(arr[0].rev)} (${pct(sh,0)} cả kỳ), ROAS ${dec(arr[0].roas)}.`});
      if(sh>0.4)rec.push('Doanh thu phụ thuộc mạnh vào ngày sale đôi — nên duy trì lịch live/ads đều hơn vào ngày thường để giảm rủi ro.')}
  }
  if(scope==='TikTok')out.push({c:'info',i:'i',t:'Doanh thu LIVE GMV Max lấy theo “all-shops gross revenue” (toàn bộ phiên live, kể cả đơn tự nhiên), nên ROAS LIVE thường cao hơn ads thường.'});
  if(!rec.length)rec.push(oc!=null&&oc>=0?'Hiệu quả đang ổn định/tốt lên — giữ cơ cấu ngân sách, tiếp tục test creative mới cho chiến dịch dẫn đầu.':'Theo dõi thêm 1–2 ngày; nếu ROAS tiếp tục giảm, giảm ngân sách nhóm chiến dịch ROAS thấp nhất.');
  return `<div class="ins"><h3>Nhận xét</h3>${out.map(o=>`<div class="it ${o.c}"><span class="ic">${o.i}</span><span>${o.t}</span></div>`).join('')}<h3>Đề xuất</h3>${rec.map(t=>`<div class="it rec"><span class="ic">→</span><span>${t}</span></div>`).join('')}</div>`;
}

/* ---------- monthly YTD ---------- */
function monthlyTable(scope){
  const y=D.dataMax.slice(0,4);const months=[];for(let m=1;m<=+D.dataMax.slice(5,7);m++)months.push(`${y}-${String(m).padStart(2,'0')}`);
  const fn=scope==='overview'?null:(r=>r.ch===scope);
  const M=byKey(y+'-01-01',D.dataMax,fn,r=>r.date.slice(0,7));
  const gk={Meta:'fb',TikTok:'tt',Shopee:'sp'}[scope];
  let prev=null;const tot={spend:0,rev:0,ord:0,gmv:0,plan:0};
  const rows=months.map(mo=>{const o=M.get(mo)||derive({spend:0,imp:0,clk:0,ord:0,rev:0,views:0});const g=D.gmvm.find(r=>r.month===mo)||{};
    let gmv,plan;if(scope==='overview'){gmv=+g.total_actual||0;plan=(+g.fb_plan||0)+(+g.tt_plan||0)+(+g.sp_plan||0)}else{gmv=+g[gk+'_actual']||0;plan=+g[gk+'_plan']||0}
    const mom=prev?chg(o.spend,prev.spend):null,momr=prev?chg(o.roas,prev.roas):null;prev=o;
    tot.spend+=o.spend;tot.rev+=o.rev;tot.ord+=o.ord;tot.gmv+=gmv;tot.plan+=plan;
    const r=plan?gmv/plan:null;const cls=r==null?'':r<0.8?'lo':r<1?'mid':'';
    const cs=gmv?o.spend/gmv:null;
    return `<tr><td>T${+mo.slice(5)}${mo===D.dataMax.slice(0,7)?'<span class="tag">MTD</span>':''}</td><td>${money(o.spend)}</td><td>${mom==null?'–':pill(mom,0)}</td><td>${money(o.rev)}</td><td>${dec(o.roas)}</td><td>${momr==null?'–':pill(momr,1)}</td><td>${num(o.ord)}</td><td>${money(o.cpo)}</td><td>${money(gmv)}</td><td>${money(plan)}</td><td>${r==null?'–':`<span class="prog"><i class="${cls}" style="width:${Math.min(100,r*100)}%"></i></span>${pct(r,0)}`}</td><td>${pct(cs,1)}</td></tr>`});
  const tr=tot.plan?tot.gmv/tot.plan:null;
  rows.push(`<tr class="tot"><td>YTD</td><td>${money(tot.spend)}</td><td></td><td>${money(tot.rev)}</td><td>${dec(div(tot.rev,tot.spend))}</td><td></td><td>${num(tot.ord)}</td><td>${money(div(tot.spend,tot.ord))}</td><td>${money(tot.gmv)}</td><td>${money(tot.plan)}</td><td>${pct(tr,0)}</td><td>${pct(div(tot.spend,tot.gmv),1)}</td></tr>`);
  const lab=scope==='overview'?'GMV toàn kênh':`GMV ${scope==='Meta'?'Facebook':scope==='Shopee'?'Shopee':'TikTok'}`;
  return `<div class="tw"><table><thead><tr><th>Tháng</th><th>Chi phí ads</th><th>MoM</th><th>Doanh thu ads</th><th>ROAS</th><th>ΔROAS MoM</th><th>Đơn ads</th><th>CPO</th><th>${lab}</th><th>Kế hoạch</th><th>% KH</th><th>Chi phí/GMV</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

/* ---------- breakdown table ---------- */
function breakdown(fn,kf,label,P,extra){
  const cur=byKey(S.from,S.to,fn,kf),a=byKey(P.p1.from,P.p1.to,fn,kf),b=byKey(P.p2.from,P.p2.to,fn,kf);
  const keys=[...new Set([...cur.keys(),...a.keys()])].sort((x,y)=>((cur.get(y)||{}).spend||0)-((cur.get(x)||{}).spend||0));
  const T=agg(S.from,S.to,fn),TA=agg(P.p1.from,P.p1.to,fn),TB=agg(P.p2.from,P.p2.to,fn);
  const z=derive({spend:0,imp:0,clk:0,ord:0,rev:0,views:0});
  const row=(name,o,pa,pb,cls='')=>`<tr class="${cls}"><td>${name}</td><td>${money(o.spend)}</td><td>${pill(chg(o.spend,pa.spend),0)}</td><td>${pct(div(o.spend,T.spend),0)}</td><td>${money(o.rev)}</td><td>${pill(chg(o.rev,pa.rev),1)}</td><td>${pill(chg(o.rev,pb.rev),1)}</td><td><b>${dec(o.roas)}</b></td><td>${pill(chg(o.roas,pa.roas),1)}</td><td>${num(o.ord)}</td><td>${money(o.cpo)}</td>${extra?extra(o):''}</tr>`;
  const body=keys.map(k=>row(esc(k),cur.get(k)||z,a.get(k)||z,b.get(k)||z)).join('')+row('Tổng',T,TA,TB,'tot');
  const ex=extra?extra(null):'';
  return `<div class="tw"><table><thead><tr><th>${label}</th><th>Chi phí</th><th>vs ${P.l1}</th><th>% chi phí</th><th>Doanh thu</th><th>vs ${P.l1}</th><th>vs ${P.l2}</th><th>ROAS</th><th>ΔROAS</th><th>Đơn</th><th>CPO</th>${ex}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/* ---------- campaign table ---------- */
const CT={sort:'spend',dir:-1,q:'',lim:25,acc:''};
function campaignTable(ch,P){
  const fn=r=>r.ch===ch;
  const cur=byKey(S.from,S.to,fn,r=>r.key),prv=byKey(P.p1.from,P.p1.to,fn,r=>r.key);
  const T=agg(S.from,S.to,fn);
  let arr=[...cur.values()].filter(o=>o.spend>0||o.rev>0);
  const accs=[...new Set(arr.map(o=>o.r.acc+(ch==='TikTok'?' · '+(TYPENAME[o.r.type]||o.r.type):'')))].sort();
  if(CT.acc)arr=arr.filter(o=>(o.r.acc+(ch==='TikTok'?' · '+(TYPENAME[o.r.type]||o.r.type):''))===CT.acc);
  if(CT.q){const q=CT.q.toLowerCase();arr=arr.filter(o=>o.r.name.toLowerCase().includes(q))}
  arr.forEach(o=>{const p=prv.get(o.k);o.ds=p?chg(o.spend,p.spend):null;o.dr=(p&&p.spend>=1e5&&o.spend>=1e5)?chg(o.roas,p.roas):null;o.isnew=!p||p.spend===0});
  const k=CT.sort;arr.sort((a,b)=>((b[k]??-1e18)-(a[k]??-1e18))*-CT.dir);
  const maxS=Math.max(1,...arr.map(o=>o.spend));
  const extraH=ch==='Meta'?'<th>CTR</th><th>CPC</th>':ch==='Shopee'?'<th>Lượt xem</th><th>CVR</th>':'<th>Lượt xem live</th>';
  const extraR=o=>ch==='Meta'?`<td>${pct(o.ctr,2)}</td><td>${money(o.cpc)}</td>`:ch==='Shopee'?`<td>${num(o.views)}</td><td>${pct(o.cvr,2)}</td>`:`<td>${o.views?num(o.views):'–'}</td>`;
  const th=(key,lab)=>`<th class="s" data-sort="${key}">${lab}${CT.sort===key?(CT.dir<0?' ↓':' ↑'):''}</th>`;
  const rows=arr.slice(0,CT.lim).map(o=>`<tr><td class="nm" title="${esc(o.r.name)}">${esc(o.r.name)}${o.isnew&&ch!=='Shopee'&&nDays(S.from,S.to)<=31?'<span class="tag">mới</span>':''}<div style="font-size:11px;color:var(--muted)">${esc(o.r.acc)}${ch==='TikTok'?' · '+(TYPENAME[o.r.type]||o.r.type):''}${o.r.obj&&o.r.obj!=='GMV_MAX'&&o.r.obj!=='LIVE_ADS'?' · '+esc(o.r.obj.replace('OUTCOME_','').toLowerCase()):''}</div></td><td><span class="bar" style="width:${Math.max(2,o.spend/maxS*60)}px;--c:var(${CHVAR[ch]})"></span>${money(o.spend)}</td><td>${pct(div(o.spend,T.spend),1)}</td><td>${o.ds==null?'–':pill(o.ds,0)}</td><td>${money(o.rev)}</td><td><b>${dec(o.roas)}</b></td><td>${o.dr==null?'–':pill(o.dr,1)}</td><td>${num(o.ord)}</td><td>${money(o.cpo)}</td>${extraR(o)}</tr>`).join('');
  return `<div class="tools"><input id="cq" placeholder="Tìm chiến dịch…" value="${esc(CT.q)}"><select id="cacc"><option value="">Tất cả tài khoản</option>${accs.map(a=>`<option ${a===CT.acc?'selected':''}>${esc(a)}</option>`).join('')}</select><span class="cmpinfo">${arr.length} chiến dịch có chi tiêu/doanh thu</span></div>
  <div class="tw"><table id="ctab"><thead><tr><th>Chiến dịch</th>${th('spend','Chi phí')}<th>% chi phí</th>${th('ds','Δ chi phí')}${th('rev','Doanh thu')}${th('roas','ROAS')}${th('dr','ΔROAS')}${th('ord','Đơn')}${th('cpo','CPO')}${extraH}</tr></thead><tbody>${rows||'<tr><td colspan="12" class="empty">Không có chiến dịch nào trong khoảng ngày này.</td></tr>'}</tbody></table></div>
  ${arr.length>CT.lim?`<button class="more" id="cmore">Xem thêm (${arr.length-CT.lim})</button>`:''}<div class="note">Δ so với ${P.l1} (${fr(P.p1.from,P.p1.to)}). “mới” = không chi tiêu ở kỳ so sánh.</div>`;
}
function bindCampaign(ch){
  const q=$('#cq');if(q)q.oninput=()=>{CT.q=q.value;CT.lim=25;rerenderCamp(ch)};
  const a=$('#cacc');if(a)a.onchange=()=>{CT.acc=a.value;rerenderCamp(ch)};
  const m=$('#cmore');if(m)m.onclick=()=>{CT.lim+=50;rerenderCamp(ch)};
  document.querySelectorAll('#ctab th.s').forEach(th=>th.onclick=()=>{const k=th.dataset.sort;if(CT.sort===k)CT.dir*=-1;else{CT.sort=k;CT.dir=-1}rerenderCamp(ch)});
}
/* ---------- Meta creative table ---------- */
const AT={sort:'spend',dir:-1,q:'',lim:25,acc:'',camp:'',by:'ad'};
function adAgg(from,to,kf){const M=new Map();if(!D.ma)return M;for(const r of D.ma){if(r.date<from||r.date>to)continue;const i=D.mi[r.ad]||{};const k=kf(r,i);let o=M.get(k);if(!o){o={k,spend:0,imp:0,clk:0,ord:0,rev:0,views:0,ads:new Set(),i};M.set(k,o)}o.spend+=r.spend;o.imp+=r.imp;o.clk+=r.clk;o.ord+=r.ord;o.rev+=r.rev;o.ads.add(r.ad)}M.forEach(derive);return M}
function creativeTable(P){
  if(!D.ma)return '<div class="empty">Chưa có dữ liệu theo ad creative (thiếu meta_ads_daily.csv).</div>';
  const kf=AT.by==='creative'?((r,i)=>i.creative_id||r.ad):((r)=>r.ad);
  const keep=i=>(!AT.acc||i.account===AT.acc)&&(!AT.camp||i.campaign_key===AT.camp)&&fmtOk(i.campaign_key);
  const cur=adAgg(S.from,S.to,kf),prv=adAgg(P.p1.from,P.p1.to,kf);
  const all=[...cur.values()].filter(o=>o.spend>0&&fmtOk(o.i.campaign_key));
  const T=all.reduce((s,o)=>s+o.spend,0);
  let arr=all.filter(o=>keep(o.i));
  const accs=[...new Set(all.map(o=>o.i.account).filter(Boolean))].sort();
  const camps=[...new Map(all.filter(o=>!AT.acc||o.i.account===AT.acc).map(o=>[o.i.campaign_key,(D.C[o.i.campaign_key]||{}).name||o.i.campaign_key])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  if(AT.q){const q=AT.q.toLowerCase();arr=arr.filter(o=>[o.i.ad_name,o.i.title,o.i.body,o.i.adset_name].some(s=>(s||'').toLowerCase().includes(q)))}
  arr.forEach(o=>{const p=prv.get(o.k);o.ds=p?chg(o.spend,p.spend):null;o.dr=(p&&p.spend>=1e5&&o.spend>=1e5)?chg(o.roas,p.roas):null;o.isnew=!p||p.spend===0});
  const k=AT.sort;arr.sort((a,b)=>((b[k]??-1e18)-(a[k]??-1e18))*-AT.dir);
  const maxS=Math.max(1,...arr.map(o=>o.spend));
  const th=(key,lab)=>`<th class="s" data-sort="${key}">${lab}${AT.sort===key?(AT.dir<0?' ↓':' ↑'):''}</th>`;
  const TYP={VIDEO:'Video',SHARE:'Link/post',PHOTO:'Ảnh',STATUS:'Bài viết',POST_DELETED:'Bài đã xoá',PRIVACY_CHECK_FAIL:'Bài riêng tư',INVALID:'—'};
  const rows=arr.slice(0,AT.lim).map(o=>{const i=o.i;const cn=(D.C[i.campaign_key]||{}).name||'';
    const name=AT.by==='creative'?(i.title||i.body||i.ad_name||o.k):(i.ad_name||o.k);
    const tip=[i.title,i.body].filter(Boolean).join(' — ');
    const link=i.story_id?` · <a href="https://www.facebook.com/${encodeURIComponent(i.story_id)}" target="_blank" rel="noopener">xem bài</a>`:'';
    return `<tr><td class="nm" title="${esc(tip||name)}">${esc(name)}${o.isnew&&nDays(S.from,S.to)<=31?'<span class="tag">mới</span>':''}<div style="font-size:11px;color:var(--muted)">${esc(i.account||'?')}${i.object_type?' · '+esc(TYP[i.object_type]||i.object_type):''}${AT.by==='creative'&&o.ads.size>1?` · ${o.ads.size} ad`:''} · ${esc(cn)}${link}</div></td><td><span class="bar" style="width:${Math.max(2,o.spend/maxS*60)}px;--c:var(--meta)"></span>${money(o.spend)}</td><td>${pct(div(o.spend,T),1)}</td><td>${o.ds==null?'–':pill(o.ds,0)}</td><td>${money(o.rev)}</td><td><b>${dec(o.roas)}</b></td><td>${o.dr==null?'–':pill(o.dr,1)}</td><td>${num(o.ord)}</td><td>${money(o.cpo)}</td><td>${pct(o.ctr,2)}</td><td>${money(o.cpc)}</td></tr>`}).join('');
  const covered=S.from>=D.maFrom;
  return `<div class="tools"><span class="seg" id="aby"><button data-by="ad" class="${AT.by==='ad'?'on':''}">Theo ad</button><button data-by="creative" class="${AT.by==='creative'?'on':''}">Theo creative</button></span>
  <input id="aq" placeholder="Tìm tên ad, nội dung…" value="${esc(AT.q)}"><select id="aacc"><option value="">Tất cả tài khoản</option>${accs.map(a=>`<option ${a===AT.acc?'selected':''}>${esc(a)}</option>`).join('')}</select>
  <select id="acamp" style="max-width:260px"><option value="">Tất cả chiến dịch</option>${camps.map(([key,n])=>`<option value="${esc(key)}" ${key===AT.camp?'selected':''}>${esc(n)}</option>`).join('')}</select><span class="cmpinfo">${arr.length} ${AT.by==='creative'?'creative':'ad'} có chi tiêu</span></div>
  <div class="tw"><table id="atab"><thead><tr><th>${AT.by==='creative'?'Creative':'Ad'}</th>${th('spend','Ad spend')}<th>% spend</th>${th('ds','Δ spend')}${th('rev','Ad GMV')}${th('roas','ROAS')}${th('dr','ΔROAS')}${th('ord','Đơn')}${th('cpo','CPO')}${th('ctr','CTR')}${th('cpc','CPC')}</tr></thead><tbody>${rows||'<tr><td colspan="11" class="empty">Không có ad nào có chi tiêu trong khoảng ngày này.</td></tr>'}</tbody></table></div>
  ${arr.length>AT.lim?`<button class="more" id="amore">Xem thêm (${arr.length-AT.lim})</button>`:''}
  <div class="note">Dữ liệu theo ad có từ ${fdy(D.maFrom)}${covered?'':' — kỳ đang chọn bắt đầu trước ngày này nên số theo ad chưa đủ'}. CTR, CPC tính theo link click. “Theo creative” gộp các ad dùng chung một creative. Δ so với ${P.l1}.</div>`;
}
function bindCreative(){
  const q=$('#aq');if(q)q.oninput=()=>{AT.q=q.value;AT.lim=25;rerenderCreative()};
  const a=$('#aacc');if(a)a.onchange=()=>{AT.acc=a.value;AT.camp='';rerenderCreative()};
  const c=$('#acamp');if(c)c.onchange=()=>{AT.camp=c.value;rerenderCreative()};
  const m=$('#amore');if(m)m.onclick=()=>{AT.lim+=50;rerenderCreative()};
  document.querySelectorAll('#aby button').forEach(b=>b.onclick=()=>{AT.by=b.dataset.by;AT.lim=25;rerenderCreative()});
  document.querySelectorAll('#atab th.s').forEach(th=>th.onclick=()=>{const k=th.dataset.sort;if(AT.sort===k)AT.dir*=-1;else{AT.sort=k;AT.dir=-1}rerenderCreative()});
}
function rerenderCreative(){const box=$('#adbox');if(!box)return;const pos=$('#aq')&&document.activeElement===$('#aq');box.innerHTML=creativeTable(periods());bindCreative();if(pos){const q=$('#aq');q.focus();q.setSelectionRange(q.value.length,q.value.length)}}
function rerenderCamp(ch){const box=$('#campbox');const pos=$('#cq')&&document.activeElement===$('#cq');box.innerHTML=campaignTable(ch,periods());bindCampaign(ch);if(pos){const q=$('#cq');q.focus();q.setSelectionRange(q.value.length,q.value.length)}}


/* ---------- daily detail table ---------- */
function dailyTable(fn,gch){
  const n=nDays(S.from,S.to);const cf=n<14?addD(S.to,-13):S.from;
  const M=byKey(addD(cf,-1),S.to,fn,r=>r.date);
  const days=[];for(let d=S.to;d>=cf;d=addD(d,-1))days.push(d);
  const g=d=>{if(!gch)return null;let s=0,k=0;gch.forEach(c=>{const v=(D.gd[c]||{})[d];if(v!=null){s+=v;k++}});return k?s:null};
  const z=derive({spend:0,imp:0,clk:0,ord:0,rev:0,views:0});
  const rows=days.map(d=>{const o=M.get(d)||z,p=M.get(addD(d,-1))||z;const gv=g(d);const inR=d>=S.from&&d<=S.to;
    return `<tr${inR&&n<14?' style="font-weight:600"':''}><td>${fd(d)}${dt(d)%(7*864e5)===2*864e5?'':''}</td><td>${money(o.spend)}</td><td>${p.spend?pill(chg(o.spend,p.spend),0):'–'}</td><td>${money(o.rev)}</td><td>${p.rev?pill(chg(o.rev,p.rev),1):'–'}</td>${gch?`<td>${money(gv)}</td><td>${gv?pct(o.rev/gv,0):'–'}</td>`:''}<td><b>${dec(o.roas)}</b></td><td>${p.roas?pill(chg(o.roas,p.roas),1):'–'}</td><td>${num(o.ord)}</td><td>${money(o.cpo)}</td></tr>`}).join('');
  return `<div class="tw" style="max-height:440px;overflow-y:auto"><table><thead><tr><th>Ngày</th><th>Chi phí</th><th>vs hôm trước</th><th>Doanh thu ads</th><th>vs hôm trước</th>${gch?'<th>GMV</th><th>% đóng góp ads</th>':''}<th>ROAS</th><th>ΔROAS</th><th>Đơn</th><th>CPO</th></tr></thead><tbody>${rows}</tbody></table></div>${n<14?'<div class="note">Hiển thị 14 ngày gần nhất; ngày trong kỳ chọn in đậm.</div>':''}`;
}

/* ---------- views ---------- */
function viewOverview(P){
  const cur=agg(S.from,S.to),a=agg(P.p1.from,P.p1.to),b=agg(P.p2.from,P.p2.to);
  const g=(ch,p)=>gmvSum(ch,p.from,p.to);
  const gch=['TikTok','Shopee'].filter(gmvOn);const tg=p=>{const v=gch.map(c=>g(c,p));return v.every(x=>x==null)?null:v.reduce((s,x)=>s+(x||0),0)};const gl=gch.map(c=>CHNAME[c]).join(' + ')||'—';
  const gv=r=>gch.includes(r.ch);
  const cg=agg(S.from,S.to,gv),ag=agg(P.p1.from,P.p1.to,gv),bg=agg(P.p2.from,P.p2.to,gv);
  const fix=s=>s.replace('<div class="v">null','<div class="v">');
  const hero=[kpi(`Ad spend <small>${S.chs.length===3?'3 kênh':S.chs.map(c=>CHNAME[c]).join(' + ')}${S.fmt?' · '+FMTNAME[S.fmt]:''}</small>`,null,cur.spend,a.spend,b.spend,P,0),kpi('Ad GMV <small>doanh thu từ ads</small>',null,cur.rev,a.rev,b.rev,P),kpi('ROAS / ROI <small>ad GMV ÷ ad spend</small>',null,cur.roas,a.roas,b.roas,P,1,v=>dec(v)),kpi(`Total GMV <small>${gl}</small>`,null,tg(S),tg(P.p1),tg(P.p2),P)].map(fix);
  const tiles=[kpi('Đơn hàng từ ads',null,cur.ord,a.ord,b.ord,P,1,num),kpi('CPO',null,cur.cpo,a.cpo,b.cpo,P,-1),
    kpi(`Chi phí ads / GMV <small>${gl}</small>`,null,div(cg.spend,tg(S)),div(ag.spend,tg(P.p1)),div(bg.spend,tg(P.p2)),P,-1,v=>pct(v,1)),
    ...(gmvOn('TikTok')?[kpi('GMV TikTok (creator)',null,g('TikTok',S),g('TikTok',P.p1),g('TikTok',P.p2),P)]:[]),...(gmvOn('Shopee')?[kpi('GMV Shopee Live',null,g('Shopee',S),g('Shopee',P.p1),g('Shopee',P.p2),P)]:[])].map(fix);
  const cards=CH.filter(c=>S.chs.includes(c)).map(c=>{const o=agg(S.from,S.to,r=>r.ch===c),pa=agg(P.p1.from,P.p1.to,r=>r.ch===c),pb=agg(P.p2.from,P.p2.to,r=>r.ch===c);const sh=div(o.spend,cur.spend)||0;
    const noG=c==='Meta'||!gmvOn(c);const gc=noG?null:g(c,S),gpa=noG?null:g(c,P.p1),gpb=noG?null:g(c,P.p2);
    return `<div class="card ch" style="--c:var(${CHVAR[c]})"><div class="hd"><b>${CHNAME[c]}</b><a data-go="${c}">Chi tiết →</a></div><div class="row r4">
    <div><div class="lb">Ad spend</div><div class="v">${money(o.spend)}</div>${dl(chg(o.spend,pa.spend),0,P.s1)}${dl(chg(o.spend,pb.spend),0,P.s2)}</div>
    <div><div class="lb">Ad GMV</div><div class="v">${money(o.rev)}</div>${dl(chg(o.rev,pa.rev),1,P.s1)}${dl(chg(o.rev,pb.rev),1,P.s2)}</div>
    <div><div class="lb">${c==='Meta'?'ROAS':'ROI'}</div><div class="v">${dec(o.roas)}</div>${dl(chg(o.roas,pa.roas),1,P.s1)}${dl(chg(o.roas,pb.roas),1,P.s2)}</div>
    <div><div class="lb">GMV</div>${noG?`<div class="v">–</div><div class="sharelb">${c==='Meta'?'chỉ có theo tháng (bảng YTD)':'không tách được theo bộ lọc'}</div>`:`<div class="v">${money(gc)}</div>${dl(chg(gc,gpa),1,P.s1)}${dl(chg(gc,gpb),1,P.s2)}`}</div></div>
    <div class="share"><i style="width:${sh*100}%"></i></div><div class="sharelb">${pct(sh,0)} tổng ad spend · ${num(o.ord)} đơn · CPO ${money(o.cpo)}${gc?` · ad GMV = ${pct(o.rev/gc,0)} GMV`:''}</div></div>`}).join('');
  const colors={Meta:'--meta',TikTok:'--tiktok',Shopee:'--shopee'};
  $('#main').innerHTML=`
  <section><h2>Theo kênh <small>${fr(S.from,S.to)} · so với ${P.l1} (${fr(P.p1.from,P.p1.to)}) và ${P.l2} (${fr(P.p2.from,P.p2.to)})</small></h2><div class="grid3">${cards||'<div class="empty">Chưa chọn kênh nào.</div>'}</div>
  <div class="note">GMV theo ngày: TikTok = GMV creator (sheet), Shopee = GMV Shopee Live, có từ 24/3/2026; GMV Facebook chỉ có theo tháng (bảng YTD cuối trang).${S.fmt?' Bộ lọc Live / Video chỉ áp cho số ads; GMV TikTok creator không tách được theo live/video'+(S.fmt==='video'?', GMV Shopee Live bị loại vì là GMV live':'')+'. Bảng YTD: GMV & kế hoạch lấy từ sheet, không lọc.':''}</div></section>
  <section class="card"><h2>Ad spend theo ngày, ad GMV & total GMV <small>${nDays(S.from,S.to)<14?'hiển thị 14 ngày gần nhất, kỳ đang chọn đậm màu':''}</small></h2><div class="chartbox"><canvas id="c1"></canvas></div></section>
  <section class="card"><h2>PFM theo tháng YTD <small>chi phí & doanh thu ads từ nền tảng; GMV & kế hoạch từ sheet GMV_Data</small></h2>${monthlyTable('overview')}</section>`;
  dailyChart('c1',null,r=>r.ch==='Shopee'?'Shopee Live':r.ch,{Meta:'--meta',TikTok:'--tiktok','Shopee Live':'--shopee'},gch.length?gch:null);
  document.querySelectorAll('[data-go]').forEach(a=>a.onclick=()=>go(a.dataset.go));
}
function viewChannel(ch,P){
  const fn=r=>r.ch===ch;
  const cur=agg(S.from,S.to,fn),a=agg(P.p1.from,P.p1.to,fn),b=agg(P.p2.from,P.p2.to,fn);
  const t=[kpi('Chi phí',null,cur.spend,a.spend,b.spend,P,0),kpi('Doanh thu ads',null,cur.rev,a.rev,b.rev,P),kpi('ROAS',null,cur.roas,a.roas,b.roas,P,1,v=>dec(v)),kpi('Đơn hàng',null,cur.ord,a.ord,b.ord,P,1,num),kpi('CPO',null,cur.cpo,a.cpo,b.cpo,P,-1),kpi('Giá trị đơn TB',null,cur.aov,a.aov,b.aov,P)];
  if(ch==='Meta'){
    t[0]=kpi('Ad spend',null,cur.spend,a.spend,b.spend,P,0);t[1]=kpi('Ad GMV <small>purchase value Meta ghi nhận</small>',null,cur.rev,a.rev,b.rev,P);
    const mo=S.to.slice(0,7),gm=m=>{const r=D.gmvm.find(x=>x.month===m);return r&&+r.fb_actual?+r.fb_actual:null},pl=m=>{const r=D.gmvm.find(x=>x.month===m);return r&&+r.fb_plan?+r.fb_plan:null};
    const m1=shiftMonth(mo+'-01',-1).slice(0,7),m2=shiftMonth(mo+'-01',-2).slice(0,7),gv=gm(mo),pv=pl(mo);
    t.splice(3,0,`<div class="card kpi"><div class="lb">GMV Facebook T${+mo.slice(5)} <small>${mo===D.maxDate.slice(0,7)?'MTD, ':''}theo tháng (sheet)</small></div><div class="v">${money(gv)}</div><div class="ds">${dl(chg(gv,gm(m1)),1,'vs T'+(+m1.slice(5)))}${pv?`<div class="d flat"><span class="n">${pct(gv/pv,0)}</span><span class="t">kế hoạch tháng</span></div>`:''}</div></div>`);
    t.push(kpi('CTR',null,cur.ctr,a.ctr,b.ctr,P,1,v=>pct(v,2)),kpi('CPC',null,cur.cpc,a.cpc,b.cpc,P,-1),kpi('CPM',null,cur.cpm,a.cpm,b.cpm,P,-1))}
  if(ch==='Shopee'){t[0]=kpi('Ad spend',null,cur.spend,a.spend,b.spend,P,0);t[1]=kpi('Ad GMV <small>Live Ads</small>',null,cur.rev,a.rev,b.rev,P);t[2]=kpi('ROI <small>ad GMV ÷ ad spend</small>',null,cur.roas,a.roas,b.roas,P,1,v=>dec(v));t.push(kpi('Lượt xem live (ads)',null,cur.views,a.views,b.views,P,1,num),kpi('Tỷ lệ chuyển đổi',null,cur.cvr,a.cvr,b.cvr,P,1,v=>pct(v,2)),kpi('Chi phí / lượt xem',null,cur.cpv,a.cpv,b.cpv,P,-1,v=>v==null?'–':Math.round(v).toLocaleString('vi-VN')+'đ'));const g=p=>gmvSum('Shopee',p.from,p.to);t.push(kpi('GMV Shopee Live (toàn shop)',null,g(S),g(P.p1),g(P.p2),P))}
  if(ch==='TikTok'){t[0]=kpi('Ad spend',null,cur.spend,a.spend,b.spend,P,0);t[1]=kpi('Ad GMV',null,cur.rev,a.rev,b.rev,P);t[2]=kpi('ROI <small>ad GMV ÷ ad spend</small>',null,cur.roas,a.roas,b.roas,P,1,v=>dec(v));
    const lv=r=>r.ch==='TikTok'&&r.type==='gmv_max_live';const c2=agg(S.from,S.to,lv),a2=agg(P.p1.from,P.p1.to,lv),b2=agg(P.p2.from,P.p2.to,lv);t.push(kpi('ROI LIVE GMV Max',null,c2.roas,a2.roas,b2.roas,P,1,v=>dec(v)),kpi('Lượt xem live (GMV Max)',null,c2.views,a2.views,b2.views,P,1,num));const g=p=>gmvSum('TikTok',p.from,p.to);t.push(kpi('GMV TikTok (creator)',null,g(S),g(P.p1),g(P.p2),P))}
  const tiles=t.map(s=>s.replace('<div class="v">null','<div class="v">'));
  const stack=ch==='TikTok'?(r=>TYPENAME[r.type]||r.type):(r=>r.acc);
  const bkey=ch==='TikTok'?(r=>r.acc+' · '+(TYPENAME[r.type]||r.type)):(r=>r.acc);
  $('#main').innerHTML=`
  <section><h2>${CHNAME[ch]} <small>${fr(S.from,S.to)} · so với ${P.l1} (${fr(P.p1.from,P.p1.to)}) và ${P.l2} (${fr(P.p2.from,P.p2.to)})</small></h2><div class="kpis">${tiles.join('')}</div></section>
  <section class="grid2"><div class="card"><h2>Theo ngày <small>chi phí (cột) theo ${ch==='TikTok'?'loại chiến dịch':'tài khoản'} · doanh thu ads (đường)</small></h2><div class="chartbox"><canvas id="c1"></canvas></div></div>
  <div class="card">${insights(ch,cur,a,b,P,[...byKey(S.from,S.to,fn,r=>r.key).values()])}</div></section>
  <section class="card"><h2>Chi tiết theo ngày <small>${ch==='Meta'?'GMV Facebook theo ngày chưa có nguồn tin cậy':ch==='TikTok'?'GMV = Creator-attributed GMV (sheet); % đóng góp có thể >100% vì LIVE tính all-shops':'GMV = Shopee Live placed GMV'}</small></h2>${dailyTable(fn,ch==='Meta'?null:[ch])}</section>
  <section class="card"><h2>Theo ${ch==='TikTok'?'tài khoản & loại':'tài khoản'}</h2>${breakdown(fn,bkey,ch==='TikTok'?'Tài khoản · loại':'Tài khoản',P)}</section>
  <section class="card"><h2>${ch==='Meta'?'PFM theo chiến dịch':'Chiến dịch'} <small>${fr(S.from,S.to)}</small></h2><div id="campbox">${campaignTable(ch,P)}</div></section>
  ${ch==='Meta'?`<section class="card"><h2>PFM theo ad creative <small>${fr(S.from,S.to)}</small></h2><div id="adbox">${creativeTable(P)}</div></section>`:''}
  ${ch==='Shopee'&&S.fmt!=='video'?`<section class="card"><h2>PFM theo phiên live <small>${fr(S.from,S.to)} · Live Ads</small></h2><div id="shpbox"></div></section>`:''}
  ${ch==='TikTok'?`${S.fmt==='video'?'':`<section class="card"><h2>PFM theo phiên live <small>${fr(S.from,S.to)} · LIVE GMV Max</small></h2><div id="livebox">${D.tl?'':'<div class="empty">Chưa có dữ liệu theo phiên live (thiếu tiktok_live_daily.csv).</div>'}</div></section>`}
  ${S.fmt==='live'?'':`<section class="card"><h2>GMV theo video <small>${fr(S.from,S.to)} · từ ads</small></h2><div id="vidbox">${D.tv?'':'<div class="empty">Chưa có dữ liệu theo video (thiếu tiktok_video_daily.csv).</div>'}</div></section>`}`:''}
  <section class="card"><h2>PFM theo tháng YTD — ${CHNAME[ch]}</h2>${monthlyTable(ch)}
  ${ch==='TikTok'?'<div class="note">Doanh thu TikTok = giá trị đơn shop của ads thường + gross revenue Product GMV Max + all-shops gross revenue LIVE GMV Max. Từ tháng 7, doanh thu LIVE có thể vượt GMV creator vì tính cả toàn phiên live.</div>':''}
  ${ch==='Shopee'?'<div class="note">Dữ liệu chiến dịch Live Ads Shopee có từ 11/4/2026. GMV Shopee Live (placed) theo ngày có từ 24/3/2026; cột GMV tháng lấy từ sheet (GMV Shopee toàn shop).</div>':''}
  ${ch==='Meta'?'<div class="note">Doanh thu Meta = giá trị mua hàng (omni purchase value) do Meta ghi nhận; GMV Facebook lấy từ sheet.</div>':''}</section>`;
  dailyChart('c1',fn,stack,null);
  bindCampaign(ch);
  if(ch==='Meta')bindCreative();
  if(ch==='Shopee'&&S.fmt!=='video')mountTable('shpbox',shopeeSessionTable);
  if(ch==='TikTok'){if(D.tl&&S.fmt!=='video')mountTable('livebox',liveTable);if(D.tv&&S.fmt!=='live')mountTable('vidbox',videoTable)}
}

/* ---------- shell ---------- */
function syncControls(){
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===S.tab));
  document.querySelectorAll('#presets button').forEach(b=>b.classList.toggle('on',b.dataset.p===S.preset));
  $('#from').value=S.from;$('#to').value=S.to;$('#from').max=$('#to').max=D.dataMax;$('#from').min=$('#to').min='2026-01-01';
  document.querySelectorAll('#fch button').forEach(b=>b.classList.toggle('on',S.chs.includes(b.dataset.ch)));$('#fch').style.display=S.tab==='overview'?'':'none';
  document.querySelectorAll('#ffmt button').forEach(b=>b.classList.toggle('on',b.dataset.f===S.fmt));
  const fl=[S.tab==='overview'&&S.chs.length<3?S.chs.map(c=>CHNAME[c]).join(' + '):'',S.fmt?FMTNAME[S.fmt]:''].filter(Boolean).join(' · ');
  const P=periods();$('#cmpinfo').innerHTML=(fl?`<span class="fl">Đang lọc: <b>${fl}</b> <a id="fclear">bỏ lọc</a></span> · `:'')+`Kỳ chọn <b>${fr(S.from,S.to)}</b> (${P.n} ngày) · so với <b>${P.l1}</b> ${fr(P.p1.from,P.p1.to)} & <b>${P.l2}</b> ${fr(P.p2.from,P.p2.to)}`;
  try{history.replaceState(null,'',`#${S.tab}&${S.preset==='custom'?S.from+'_'+S.to:S.preset}`+(S.fmt?'&f='+S.fmt:'')+(S.chs.length<3?'&ch='+S.chs.join('.'):''))}catch(e){}
}
function render(){applyFilter();syncControls();const P=periods();if(S.tab==='overview')viewOverview(P);else viewChannel(S.tab,P)}
function go(tab){S.tab=tab;CT.q='';CT.acc='';CT.lim=25;AT.q='';AT.acc='';AT.camp='';AT.lim=25;Object.keys(TB).forEach(k=>delete TB[k]);render();window.scrollTo({top:0})}
function readHash(){const h=location.hash.slice(1).split('&');if(['overview',...CH].includes(h[0]))S.tab=h[0];const p=h[1]||'d';if(/^\d{4}-\d\d-\d\d_\d{4}-\d\d-\d\d$/.test(p)){S.preset='custom';[S.from,S.to]=p.split('_');if(S.to>D.dataMax)S.to=D.dataMax;if(S.from>S.to)S.from=S.to}else applyPreset(['d','7d','30d','mtd','lm','ytd'].includes(p)?p:'d');
  h.slice(2).forEach(x=>{const [k,v]=x.split('=');if(k==='f'&&FMTNAME[v])S.fmt=v;if(k==='ch'&&v){const l=v.split('.').filter(c=>CH.includes(c));if(l.length)S.chs=l}})}
function theme(){const r=document.documentElement;let t=null;try{t=localStorage.getItem('pfm-theme')}catch(e){}if(t)r.dataset.theme=t;$('#themeBtn').onclick=()=>{const dark=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;r.dataset.theme=dark?'light':'dark';try{localStorage.setItem('pfm-theme',r.dataset.theme)}catch(e){}render()}}
async function init(){
  theme();
  try{await load()}catch(e){$('#main').innerHTML=`<div class="empty">Không tải được dữ liệu (${esc(e.message)}). Thử tải lại trang.</div>`;return}
  const lastTxt=CH.map(c=>`${CHNAME[c]} ${D.last[c]?fd(D.last[c]):'–'}`).join(' · ');
  $('#asof').textContent=`Số liệu đến ${fdy(D.dataMax)}${D.dataMax>=D.today?' (hôm nay tạm tính, các nút chọn nhanh dừng ở hôm qua)':''} · ${lastTxt}`+(CH.some(c=>D.last[c]&&D.last[c]<D.maxDate)?' · kênh nào chưa có số ngày gần nhất sẽ hiện 0 cho ngày đó':'');
  $('#foot').innerHTML=`Nguồn: Meta Ads, TikTok Ads (BASIC + GMV Max), Shopee Seller Center (Dịch vụ Hiển thị Livestream), sheet GMV_Historical_HannahOlala. Ngày theo giờ Việt Nam. Doanh thu ads là doanh thu do nền tảng ghi nhận cho quảng cáo, không phải GMV toàn shop.`;
  readHash();
  document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>go(b.dataset.tab));
  document.querySelectorAll('#presets button').forEach(b=>b.onclick=()=>{applyPreset(b.dataset.p);CT.lim=25;render()});
  const onDate=()=>{let f=$('#from').value,t=$('#to').value;if(!f||!t)return;if(t>D.dataMax)t=D.dataMax;if(f>t)[f,t]=[t,f];S.from=f;S.to=t;S.preset='custom';render()};
  $('#from').onchange=onDate;$('#to').onchange=onDate;
  document.querySelectorAll('#fch button').forEach(b=>b.onclick=()=>{const c=b.dataset.ch;S.chs=S.chs.includes(c)?S.chs.filter(x=>x!==c):CH.filter(x=>x===c||S.chs.includes(x));if(!S.chs.length)S.chs=[c];render()});
  document.querySelectorAll('#ffmt button').forEach(b=>b.onclick=()=>{S.fmt=b.dataset.f;Object.keys(TB).forEach(k=>delete TB[k]);render()});
  $('#cmpinfo').addEventListener('click',e=>{if(e.target.id==='fclear'){S.fmt='';S.chs=CH.slice();render()}});
  render();
}
init();
})();
