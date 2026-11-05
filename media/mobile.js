/* Media dashboard — mobile / app-style main page. Reads data/*.csv; the full tables live in detail.html. */
(function(){
'use strict';
const CH=['Meta','TikTok','Shopee'];
const NAME={Meta:'Meta',TikTok:'TikTok',Shopee:'Shopee Live'};
const COL={Meta:'var(--meta)',TikTok:'var(--tiktok)',Shopee:'var(--shopee)'};
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
const dec=v=>v==null||!isFinite(v)?'–':v.toFixed(1).replace('.',',');
const chg=(c,p)=>(c==null||p==null||!p)?null:(c-p)/Math.abs(p);
function pill(x,good=1){if(x==null)return '<span class="pill flat">–</span>';const cls=Math.abs(x)<.005||good===0?'flat':((x>0)===(good>0)?'up':'down');
  return `<span class="pill ${cls}">${x>0?'▲':x<0?'▼':''} ${Math.abs(x*100).toFixed(Math.abs(x)<.1?1:0).replace('.',',')}%</span>`}
function parseCSV(t){const L=t.trim().split(/\r?\n/);const h=L[0].split(',');return L.slice(1).map(l=>{const c=[];let cur='',q=false;
  for(let i=0;i<l.length;i++){const ch=l[i];if(q){if(ch==='"'){if(l[i+1]==='"'){cur+='"';i++}else q=false}else cur+=ch}else if(ch==='"')q=true;else if(ch===','){c.push(cur);cur=''}else cur+=ch}
  c.push(cur);const o={};h.forEach((k,i)=>o[k]=c[i]);return o})}
const get=f=>fetch('data/'+f+'?v='+Date.now()).then(r=>{if(!r.ok)throw new Error(f);return r.text()}).then(parseCSV);
const opt=f=>get(f).catch(()=>null);

/* ---------- data ---------- */
async function load(){
  const [camps,daily,gmvd,lives,lived]=await Promise.all([get('campaigns.csv'),get('campaign_daily.csv'),get('gmv_daily.csv'),opt('tiktok_lives.csv'),opt('tiktok_live_daily.csv')]);
  const C={};camps.forEach(c=>C[c.key]=c);
  const rows=daily.map(r=>{const c=C[r.key]||{};return {d:r.date,k:r.key,ch:c.channel,name:c.name||r.key,sp:+r.spend,rv:+r.revenue,od:+r.orders}});
  const gd={};gmvd.forEach(r=>{(gd[r.channel]=gd[r.channel]||{})[r.date]=+r.gmv});
  const max=rows.filter(r=>r.sp>0).reduce((m,r)=>r.d>m?r.d:m,'0');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
  const L={};(lives||[]).forEach(r=>L[r.room_id]=r);
  D={C,rows,gd,end:max>=today?addD(today,-1):max,L,lr:(lived||[]).map(r=>({d:r.date,k:r.room_id,sp:+r.spend,rv:+r.gmv_all}))};
}
function range(p){const e=D.end;let f=e;
  if(p==='7')f=addD(e,-6);else if(p==='30')f=addD(e,-29);else if(p==='m')f=e.slice(0,8)+'01';
  const n=Math.round((dt(e)-dt(f))/864e5)+1;return {f,e,n,pf:addD(f,-n),pe:addD(f,-1)}}
function sum(f,e,fn){const o={sp:0,rv:0,od:0};for(const r of D.rows){if(r.d<f||r.d>e||(fn&&!fn(r)))continue;o.sp+=r.sp;o.rv+=r.rv;o.od+=r.od}o.roi=o.sp?o.rv/o.sp:null;return o}
function gmv(ch,f,e){const m=D.gd[ch];if(!m)return null;let s=0,n=0;for(const d in m)if(d>=f&&d<=e){s+=m[d];n++}return n?s:null}
function top(f,e,fn,src){const M=new Map();for(const r of src||D.rows){if(r.d<f||r.d>e||(fn&&!fn(r)))continue;const o=M.get(r.k)||{k:r.k,name:r.name,sp:0,rv:0};o.sp+=r.sp;o.rv+=r.rv;M.set(r.k,o)}
  return [...M.values()].filter(o=>o.sp>0).sort((a,b)=>b.sp-a.sp)}

/* ---------- pieces ---------- */
function hero(cur,prv,label){return `<div class="hero"><div class="lb">${label}</div>
  <div class="big">${money(cur.sp)} ${pill(chg(cur.sp,prv.sp),0)}</div>
  <div class="two"><div><span class="lb">Ad GMV</span><b>${money(cur.rv)}</b>${pill(chg(cur.rv,prv.rv))}</div>
  <div><span class="lb">ROI</span><b>${dec(cur.roi)}</b>${pill(chg(cur.roi,prv.roi))}</div></div></div>`}
function chart(fn,color){
  const e=D.end,days=[];for(let i=13;i>=0;i--)days.push(addD(e,-i));
  const v=days.map(d=>sum(d,d,fn));const mx=Math.max(1,...v.map(o=>o.sp));const W=320,H=130,bw=W/days.length;
  const bars=v.map((o,i)=>`<rect data-i="${i}" x="${i*bw+3}" y="${H-o.sp/mx*H}" width="${bw-6}" height="${Math.max(2,o.sp/mx*H)}" rx="4" fill="${color}" opacity="${i===13?1:.55}"/>`).join('');
  const id='c'+Math.random().toString(36).slice(2,7);
  setTimeout(()=>{const box=document.getElementById(id);if(!box)return;const tip=box.querySelector('.tip');
    const show=i=>{tip.innerHTML=`${fd(days[i])} · chi <b>${money(v[i].sp)}</b> · ROI <b>${dec(v[i].roi)}</b>`;box.querySelectorAll('rect').forEach(r=>r.setAttribute('opacity',+r.dataset.i===i?1:.4))};
    box.querySelectorAll('rect').forEach(r=>{r.onclick=r.onmouseenter=()=>show(+r.dataset.i)});show(13)},0);
  return `<div class="chart" id="${id}"><div class="tip"></div><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${bars}</svg><div class="ax"><span>${fd(days[0])}</span><span>${fd(days[13])}</span></div></div>`}
function rows(list,color,sub){if(!list.length)return '<div class="list"><div class="empty">Không có chi tiêu trong kỳ này</div></div>';
  return `<div class="list">${list.slice(0,5).map((o,i)=>`<div class="row" style="cursor:default"><div class="ico" style="background:${color};opacity:${1-i*.12}">${i+1}</div>
  <div class="t"><b>${esc(o.name)}</b><span>${sub(o)}</span></div><div class="r"><b>${dec(o.sp?o.rv/o.sp:null)}</b><span>ROI</span></div></div>`).join('')}</div>`}

/* ---------- screens ---------- */
function overview(R){
  const cur=sum(R.f,R.e),prv=sum(R.pf,R.pe);
  const ch=CH.map(c=>{const o=sum(R.f,R.e,r=>r.ch===c),p=sum(R.pf,R.pe,r=>r.ch===c);
    return `<div class="row" data-go="${c}"><div class="ico" style="background:${COL[c]}">${c[0]}</div>
    <div class="t"><b>${NAME[c]}</b><span>Chi ${money(o.sp)} · ${cur.sp?Math.round(o.sp/cur.sp*100):0}%</span></div>
    <div class="r"><b>${dec(o.roi)}</b>${o.sp?pill(chg(o.roi,p.roi)):'<span>chưa có số</span>'}</div></div>`}).join('');
  const tg=['TikTok','Shopee'].map(c=>{const g=gmv(c,R.f,R.e),pg=gmv(c,R.pf,R.pe);return `<div><span>GMV ${NAME[c]}</span><b>${money(g)}</b>${g==null?'<span>chưa có số</span>':pill(chg(g,pg))}</div>`}).join('');
  return `${hero(cur,prv,'Ad spend · 3 kênh')}
  <h2>Kênh <small>ROI · so với kỳ trước</small></h2><div class="list">${ch}</div>
  <h2>14 ngày gần nhất <small>chạm cột để xem</small></h2>${chart(null,'var(--ink)')}
  <h2>GMV</h2><div class="gmv">${tg}</div>`}
function channel(c,R){
  const fn=r=>r.ch===c;const cur=sum(R.f,R.e,fn),prv=sum(R.pf,R.pe,fn);
  let topHtml;
  if(c==='TikTok'&&D.lr.length){const t=top(R.f,R.e,null,D.lr.map(r=>({...r,name:(D.L[r.k]||{}).live_name||'Phiên live '+fd(r.d)})));
    topHtml=`<h2>Top phiên live <small>theo chi phí</small></h2>${rows(t,COL[c],o=>`Chi ${money(o.sp)} · GMV ${money(o.rv)}`)}`}
  else topHtml=`<h2>${c==='Shopee'?'Top phiên live':'Top chiến dịch'} <small>theo chi phí</small></h2>${rows(top(R.f,R.e,fn),COL[c],o=>`Chi ${money(o.sp)} · GMV ${money(o.rv)}`)}`;
  const g=c==='Meta'?null:gmv(c,R.f,R.e);
  return `${hero(cur,prv,'Ad spend · '+NAME[c])}
  ${g!=null?`<div class="gmv" style="grid-template-columns:1fr"><div><span>GMV ${NAME[c]} (cả kênh)</span><b>${money(g)}</b>${pill(chg(g,gmv(c,R.pf,R.pe)))}</div></div>`:''}
  <h2>14 ngày gần nhất <small>chạm cột để xem</small></h2>${chart(fn,COL[c])}
  ${topHtml}`}

function render(){
  const R=range(S.p);
  const lbl={d:'Hôm qua',7:'7 ngày',30:'30 ngày',m:'Tháng này'}[S.p];
  const title=S.tab==='overview'?'Media':NAME[S.tab];
  $('#app').innerHTML=`<header><h1>${title}</h1><div class="d">${R.n===1?fd(R.e):fd(R.f)+' – '+fd(R.e)}</div></header>
  <div class="seg">${[['d','Hôm qua'],['7','7N'],['30','30N'],['m','Tháng']].map(([k,l])=>`<button data-p="${k}" class="${S.p===k?'on':''}">${l}</button>`).join('')}</div>
  ${S.tab==='overview'?overview(R):channel(S.tab,R)}
  <a class="more" href="detail.html#${S.tab}&${({d:'d',7:'7d',30:'30d',m:'mtd'})[S.p]}">Xem bảng chi tiết →</a>
  <div class="note">${lbl}, so với ${R.n} ngày liền trước. Số hôm nay chưa tính. ${S.tab==='Shopee'?'Dữ liệu Shopee hiện tới 20/10.':''}</div>
  <nav>${[['overview','Tổng quan'],...CH.map(c=>[c,c==='Shopee'?'Shopee':c])].map(([k,l])=>`<button data-t="${k}" class="${S.tab===k?'on':''}"><i></i>${l}</button>`).join('')}</nav>`;
  document.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{S.p=b.dataset.p;render()});
  document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{S.tab=b.dataset.t;render();window.scrollTo({top:0})});
  document.querySelectorAll('[data-go]').forEach(r=>r.onclick=()=>{S.tab=r.dataset.go;render();window.scrollTo({top:0})});
}
load().then(render).catch(e=>{$('#app').innerHTML=`<div class="empty">Không tải được dữ liệu (${esc(e.message)})</div>`});
})();
