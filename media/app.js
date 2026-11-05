/* PFM Ads Report 2026 — static dashboard (GitHub Pages). Data: data/*.csv */
(function(){
'use strict';
const CH=['Meta','TikTok','Shopee'];
const CHNAME={Meta:'Meta',TikTok:'TikTok',Shopee:'Shopee Live'};
const CHVAR={Meta:'--meta',TikTok:'--tiktok',Shopee:'--shopee'};
const TYPENAME={ads:'Ads thường',gmv_max_live:'LIVE GMV Max',gmv_max_product:'Product GMV Max',live_ads:'Live Ads'};
const NONREV=/ENGAGEMENT|AWARENESS|VIDEO_VIEWS|REACH|TRAFFIC/;
const S={tab:'overview',preset:'d',from:null,to:null};
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
  const C={};camps.forEach(c=>C[c.key]=c);
  const rows=daily.map(r=>{const c=C[r.key]||{channel:'?',account:'?',type:'?',name:r.key,objective:''};return {date:r.date,key:r.key,ch:c.channel,acc:c.account,type:c.type,name:c.name,obj:c.objective,spend:+r.spend,imp:+r.impressions,clk:+r.clicks,ord:+r.orders,rev:+r.revenue,views:+r.views}});
  const last={};rows.forEach(r=>{if(r.spend>0&&(!last[r.ch]||r.date>last[r.ch]))last[r.ch]=r.date});
  const maxDate=CH.map(c=>last[c]).filter(Boolean).sort().pop();
  const gd={};gmvd.forEach(r=>{(gd[r.channel]=gd[r.channel]||{})[r.date]=+r.gmv});
  D={C,rows,last,maxDate,gd,gmvm};
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
function dailyChart(id,fn,stackBy,colors){
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
  const y=D.maxDate.slice(0,4);const months=[];for(let m=1;m<=+D.maxDate.slice(5,7);m++)months.push(`${y}-${String(m).padStart(2,'0')}`);
  const fn=scope==='overview'?null:(r=>r.ch===scope);
  const M=byKey(y+'-01-01',D.maxDate,fn,r=>r.date.slice(0,7));
  const gk={Meta:'fb',TikTok:'tt',Shopee:'sp'}[scope];
  let prev=null;const tot={spend:0,rev:0,ord:0,gmv:0,plan:0};
  const rows=months.map(mo=>{const o=M.get(mo)||derive({spend:0,imp:0,clk:0,ord:0,rev:0,views:0});const g=D.gmvm.find(r=>r.month===mo)||{};
    let gmv,plan;if(scope==='overview'){gmv=+g.total_actual||0;plan=(+g.fb_plan||0)+(+g.tt_plan||0)+(+g.sp_plan||0)}else{gmv=+g[gk+'_actual']||0;plan=+g[gk+'_plan']||0}
    const mom=prev?chg(o.spend,prev.spend):null,momr=prev?chg(o.roas,prev.roas):null;prev=o;
    tot.spend+=o.spend;tot.rev+=o.rev;tot.ord+=o.ord;tot.gmv+=gmv;tot.plan+=plan;
    const r=plan?gmv/plan:null;const cls=r==null?'':r<0.8?'lo':r<1?'mid':'';
    const cs=gmv?o.spend/gmv:null;
    return `<tr><td>T${+mo.slice(5)}${mo===D.maxDate.slice(0,7)?'<span class="tag">MTD</span>':''}</td><td>${money(o.spend)}</td><td>${mom==null?'–':pill(mom,0)}</td><td>${money(o.rev)}</td><td>${dec(o.roas)}</td><td>${momr==null?'–':pill(momr,1)}</td><td>${num(o.ord)}</td><td>${money(o.cpo)}</td><td>${money(gmv)}</td><td>${money(plan)}</td><td>${r==null?'–':`<span class="prog"><i class="${cls}" style="width:${Math.min(100,r*100)}%"></i></span>${pct(r,0)}`}</td><td>${pct(cs,1)}</td></tr>`});
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
  const tiles=[kpi('Chi phí ads (3 kênh)',null,cur.spend,a.spend,b.spend,P,0),kpi('Doanh thu từ ads',null,cur.rev,a.rev,b.rev,P),kpi('ROAS',null,cur.roas,a.roas,b.roas,P,1,v=>dec(v)),kpi('Đơn hàng từ ads',null,cur.ord,a.ord,b.ord,P,1,num),kpi('CPO',null,cur.cpo,a.cpo,b.cpo,P,-1),
    kpi('GMV TikTok (creator)',null,g('TikTok',S),g('TikTok',P.p1),g('TikTok',P.p2),P),kpi('GMV Shopee Live',null,g('Shopee',S),g('Shopee',P.p1),g('Shopee',P.p2),P)].map(s=>s.replace('<div class="v">null','<div class="v">'));
  const cards=CH.map(c=>{const o=agg(S.from,S.to,r=>r.ch===c),pa=agg(P.p1.from,P.p1.to,r=>r.ch===c),pb=agg(P.p2.from,P.p2.to,r=>r.ch===c);const sh=div(o.spend,cur.spend)||0;
    return `<div class="card ch" style="--c:var(${CHVAR[c]})"><div class="hd"><b>${CHNAME[c]}</b><a data-go="${c}">Chi tiết →</a></div><div class="row">
    <div><div class="lb">Chi phí</div><div class="v">${money(o.spend)}</div>${dl(chg(o.spend,pa.spend),0,P.s1)}${dl(chg(o.spend,pb.spend),0,P.s2)}</div>
    <div><div class="lb">Doanh thu</div><div class="v">${money(o.rev)}</div>${dl(chg(o.rev,pa.rev),1,P.s1)}${dl(chg(o.rev,pb.rev),1,P.s2)}</div>
    <div><div class="lb">ROAS</div><div class="v">${dec(o.roas)}</div>${dl(chg(o.roas,pa.roas),1,P.s1)}${dl(chg(o.roas,pb.roas),1,P.s2)}</div></div>
    <div class="share"><i style="width:${sh*100}%"></i></div><div class="sharelb">${pct(sh,0)} tổng chi phí ads · ${num(o.ord)} đơn · CPO ${money(o.cpo)}</div></div>`}).join('');
  const colors={Meta:'--meta',TikTok:'--tiktok',Shopee:'--shopee'};
  $('#main').innerHTML=`
  <section><h2>Chỉ số chính <small>${fr(S.from,S.to)} · so với ${P.l1} (${fr(P.p1.from,P.p1.to)}) và ${P.l2} (${fr(P.p2.from,P.p2.to)})</small></h2><div class="kpis">${tiles.join('')}</div></section>
  <section><h2>Theo kênh</h2><div class="grid3">${cards}</div></section>
  <section class="grid2"><div class="card"><h2>Chi phí theo ngày & doanh thu ads <small>${nDays(S.from,S.to)<14?'hiển thị 14 ngày gần nhất, kỳ đang chọn đậm màu':''}</small></h2><div class="chartbox"><canvas id="c1"></canvas></div></div>
  <div class="card">${insights('overview',cur,a,b,P,null)}</div></section>
  <section class="card"><h2>Chi tiết theo ngày — 3 kênh <small>GMV = TikTok creator + Shopee Live (chưa gồm Facebook)</small></h2>${dailyTable(null,['TikTok','Shopee'])}</section>
  <section class="card"><h2>So sánh theo kênh & tài khoản</h2>${breakdown(null,r=>CHNAME[r.ch],'Kênh',P)}
  <div style="height:10px"></div>${breakdown(null,r=>CHNAME[r.ch]+' · '+r.acc+(r.ch==='TikTok'?' · '+(TYPENAME[r.type]||r.type):''),'Kênh · tài khoản',P)}</section>
  <section class="card"><h2>PFM theo tháng YTD <small>chi phí & doanh thu ads từ nền tảng; GMV & kế hoạch từ sheet GMV_Data</small></h2>${monthlyTable('overview')}</section>`;
  dailyChart('c1',null,r=>r.ch==='Shopee'?'Shopee Live':r.ch,{Meta:'--meta',TikTok:'--tiktok','Shopee Live':'--shopee'});
  document.querySelectorAll('[data-go]').forEach(a=>a.onclick=()=>go(a.dataset.go));
}
function viewChannel(ch,P){
  const fn=r=>r.ch===ch;
  const cur=agg(S.from,S.to,fn),a=agg(P.p1.from,P.p1.to,fn),b=agg(P.p2.from,P.p2.to,fn);
  const t=[kpi('Chi phí',null,cur.spend,a.spend,b.spend,P,0),kpi('Doanh thu ads',null,cur.rev,a.rev,b.rev,P),kpi('ROAS',null,cur.roas,a.roas,b.roas,P,1,v=>dec(v)),kpi('Đơn hàng',null,cur.ord,a.ord,b.ord,P,1,num),kpi('CPO',null,cur.cpo,a.cpo,b.cpo,P,-1),kpi('Giá trị đơn TB',null,cur.aov,a.aov,b.aov,P)];
  if(ch==='Meta'){t.push(kpi('CTR',null,cur.ctr,a.ctr,b.ctr,P,1,v=>pct(v,2)),kpi('CPC',null,cur.cpc,a.cpc,b.cpc,P,-1),kpi('CPM',null,cur.cpm,a.cpm,b.cpm,P,-1))}
  if(ch==='Shopee'){t.push(kpi('Lượt xem live (ads)',null,cur.views,a.views,b.views,P,1,num),kpi('Tỷ lệ chuyển đổi',null,cur.cvr,a.cvr,b.cvr,P,1,v=>pct(v,2)),kpi('Chi phí / lượt xem',null,cur.cpv,a.cpv,b.cpv,P,-1,v=>v==null?'–':Math.round(v).toLocaleString('vi-VN')+'đ'));const g=p=>gmvSum('Shopee',p.from,p.to);t.push(kpi('GMV Shopee Live (toàn shop)',null,g(S),g(P.p1),g(P.p2),P))}
  if(ch==='TikTok'){const lv=r=>r.ch==='TikTok'&&r.type==='gmv_max_live';const c2=agg(S.from,S.to,lv),a2=agg(P.p1.from,P.p1.to,lv),b2=agg(P.p2.from,P.p2.to,lv);t.push(kpi('ROI LIVE GMV Max',null,c2.roas,a2.roas,b2.roas,P,1,v=>dec(v)),kpi('Lượt xem live (GMV Max)',null,c2.views,a2.views,b2.views,P,1,num));const g=p=>gmvSum('TikTok',p.from,p.to);t.push(kpi('GMV TikTok (creator)',null,g(S),g(P.p1),g(P.p2),P))}
  const tiles=t.map(s=>s.replace('<div class="v">null','<div class="v">'));
  const stack=ch==='TikTok'?(r=>TYPENAME[r.type]||r.type):(r=>r.acc);
  const bkey=ch==='TikTok'?(r=>r.acc+' · '+(TYPENAME[r.type]||r.type)):(r=>r.acc);
  $('#main').innerHTML=`
  <section><h2>${CHNAME[ch]} <small>${fr(S.from,S.to)} · so với ${P.l1} (${fr(P.p1.from,P.p1.to)}) và ${P.l2} (${fr(P.p2.from,P.p2.to)})</small></h2><div class="kpis">${tiles.join('')}</div></section>
  <section class="grid2"><div class="card"><h2>Theo ngày <small>chi phí (cột) theo ${ch==='TikTok'?'loại chiến dịch':'tài khoản'} · doanh thu ads (đường)</small></h2><div class="chartbox"><canvas id="c1"></canvas></div></div>
  <div class="card">${insights(ch,cur,a,b,P,[...byKey(S.from,S.to,fn,r=>r.key).values()])}</div></section>
  <section class="card"><h2>Chi tiết theo ngày <small>${ch==='Meta'?'GMV Facebook theo ngày chưa có nguồn tin cậy':ch==='TikTok'?'GMV = Creator-attributed GMV (sheet); % đóng góp có thể >100% vì LIVE tính all-shops':'GMV = Shopee Live placed GMV'}</small></h2>${dailyTable(fn,ch==='Meta'?null:[ch])}</section>
  <section class="card"><h2>Theo ${ch==='TikTok'?'tài khoản & loại':'tài khoản'}</h2>${breakdown(fn,bkey,ch==='TikTok'?'Tài khoản · loại':'Tài khoản',P)}</section>
  <section class="card"><h2>Chiến dịch <small>${fr(S.from,S.to)}</small></h2><div id="campbox">${campaignTable(ch,P)}</div></section>
  <section class="card"><h2>PFM theo tháng YTD — ${CHNAME[ch]}</h2>${monthlyTable(ch)}
  ${ch==='TikTok'?'<div class="note">Doanh thu TikTok = giá trị đơn shop của ads thường + gross revenue Product GMV Max + all-shops gross revenue LIVE GMV Max. Từ tháng 7, doanh thu LIVE có thể vượt GMV creator vì tính cả toàn phiên live.</div>':''}
  ${ch==='Shopee'?'<div class="note">Dữ liệu chiến dịch Live Ads Shopee có từ 11/4/2026. GMV Shopee Live (placed) theo ngày có từ 24/3/2026; cột GMV tháng lấy từ sheet (GMV Shopee toàn shop).</div>':''}
  ${ch==='Meta'?'<div class="note">Doanh thu Meta = giá trị mua hàng (omni purchase value) do Meta ghi nhận; GMV Facebook lấy từ sheet.</div>':''}</section>`;
  dailyChart('c1',fn,stack,null);
  bindCampaign(ch);
}

/* ---------- shell ---------- */
function syncControls(){
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===S.tab));
  document.querySelectorAll('#presets button').forEach(b=>b.classList.toggle('on',b.dataset.p===S.preset));
  $('#from').value=S.from;$('#to').value=S.to;$('#from').max=$('#to').max=D.maxDate;$('#from').min=$('#to').min='2026-01-01';
  const P=periods();$('#cmpinfo').innerHTML=`Kỳ chọn <b>${fr(S.from,S.to)}</b> (${P.n} ngày) · so với <b>${P.l1}</b> ${fr(P.p1.from,P.p1.to)} & <b>${P.l2}</b> ${fr(P.p2.from,P.p2.to)}`;
  try{history.replaceState(null,'',`#${S.tab}&${S.preset==='custom'?S.from+'_'+S.to:S.preset}`)}catch(e){}
}
function render(){syncControls();const P=periods();if(S.tab==='overview')viewOverview(P);else viewChannel(S.tab,P)}
function go(tab){S.tab=tab;CT.q='';CT.acc='';CT.lim=25;render();window.scrollTo({top:0})}
function readHash(){const h=location.hash.slice(1).split('&');if(['overview',...CH].includes(h[0]))S.tab=h[0];const p=h[1]||'d';if(/^\d{4}-\d\d-\d\d_\d{4}-\d\d-\d\d$/.test(p)){S.preset='custom';[S.from,S.to]=p.split('_');if(S.to>D.maxDate)S.to=D.maxDate;if(S.from>S.to)S.from=S.to}else applyPreset(['d','7d','30d','mtd','lm','ytd'].includes(p)?p:'d')}
function theme(){const r=document.documentElement;let t=null;try{t=localStorage.getItem('pfm-theme')}catch(e){}if(t)r.dataset.theme=t;$('#themeBtn').onclick=()=>{const dark=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;r.dataset.theme=dark?'light':'dark';try{localStorage.setItem('pfm-theme',r.dataset.theme)}catch(e){}render()}}
async function init(){
  theme();
  try{await load()}catch(e){$('#main').innerHTML=`<div class="empty">Không tải được dữ liệu (${esc(e.message)}). Thử tải lại trang.</div>`;return}
  const lastTxt=CH.map(c=>`${CHNAME[c]} ${D.last[c]?fd(D.last[c]):'–'}`).join(' · ');
  $('#asof').textContent=`Số liệu đến ${fdy(D.maxDate)} · ${lastTxt}`+(CH.some(c=>D.last[c]&&D.last[c]<D.maxDate)?' · kênh nào chưa có số ngày gần nhất sẽ hiện 0 cho ngày đó':'');
  $('#foot').innerHTML=`Nguồn: Meta Ads, TikTok Ads (BASIC + GMV Max), Shopee Seller Center (Dịch vụ Hiển thị Livestream), sheet GMV_Historical_HannahOlala. Ngày theo giờ Việt Nam. Doanh thu ads là doanh thu do nền tảng ghi nhận cho quảng cáo, không phải GMV toàn shop.`;
  readHash();
  document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>go(b.dataset.tab));
  document.querySelectorAll('#presets button').forEach(b=>b.onclick=()=>{applyPreset(b.dataset.p);CT.lim=25;render()});
  const onDate=()=>{let f=$('#from').value,t=$('#to').value;if(!f||!t)return;if(t>D.maxDate)t=D.maxDate;if(f>t)[f,t]=[t,f];S.from=f;S.to=t;S.preset='custom';render()};
  $('#from').onchange=onDate;$('#to').onchange=onDate;
  render();
}
init();
})();
