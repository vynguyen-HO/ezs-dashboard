// Item categories (Shopee global category lv1 / lv2 / lv3) from the Affiliate conversion report, for the category filter.
// Run on https://affiliate.shopee.vn/report/conversion_report (paste tools/shopee/pull_affiliate.js first for shpSaveFile, then this file):
//   shpPullCats({acc:'HO', from:'2025-06-01', to:'2026-11-25', conc:3})   → walks days newest first; poll window.__shpc
//   shpDownloadCats()  → <acc>_cats_<to>.csv (item_id,cat1,cat2,cat3) in Downloads. Read-only, same request as the report page.
window.shpPullCats = function ({ acc, from, to, conc = 3, delay = 0 }) {
  const S = window.__shpc = { acc, from, to, M: new Map(), done: 0, calls: 0, errors: [], day: null, left: 0 };
  const T0 = d => Math.floor(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 1000) - 7 * 3600;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const call = async (s, e, p) => { for (let k = 0; k < 5; k++) { try { S.calls++; if (delay) await sleep(delay); const j = await (await fetch(`/api/v3/report/list?page_size=500&page_num=${p}&purchase_time_s=${s}&purchase_time_e=${e}&version=1`, { credentials: 'include' })).json(); if (j.code === 0) return j; S.lastErr = j.code + ' ' + j.msg; } catch (x) { S.lastErr = String(x); } await sleep(3000 * (k + 1)); } return null; };
  const add = list => (list || []).forEach(c => (c.orders || []).forEach(o => (o.items || []).forEach(it => { if (!S.M.has(String(it.item_id))) S.M.set(String(it.item_id), [it.global_category_lv1_name || '', it.global_category_lv2_name || '', it.global_category_lv3_name || '']); })));
  const win = async (day, s, e) => {
    const j = await call(s, e, 1); if (!j) { S.errors.push(day); return; }
    const tot = j.data.total_count; if (!tot) return;
    if (tot > 9500 && e - s > 60) { const m = Math.floor((s + e) / 2); await win(day, s, m); await win(day, m + 1, e); return; }
    add(j.data.list); let n = (j.data.list || []).length, p = 2;
    while (n < tot && p <= 20) { const k = await call(s, e, p); if (!k) { S.errors.push(day + ' p' + p); break; } add(k.data.list); n += (k.data.list || []).length; p++; if (!(k.data.list || []).length) break; }
  };
  const days = []; for (let t = T0(to); t >= T0(from); t -= 86400) days.push(t); S.left = days.length;
  (async () => {
    let i = 0; const worker = async () => { while (i < days.length) { const t = days[i++]; S.day = new Date((t + 7 * 3600) * 1000).toISOString().slice(0, 10); await win(S.day, t, t + 86399); S.left--; } };
    await Promise.all(Array.from({ length: conc }, worker)); S.done = 1;
  })();
  return 'started ' + days.length + ' days';
};
window.shpDownloadCats = function () {
  const S = window.__shpc, esc = v => { v = v == null ? '' : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const text = '﻿item_id,cat1,cat2,cat3\n' + [...S.M].map(([k, c]) => [k, ...c.map(esc)].join(',')).join('\n');
  const name = S.acc + '_cats_' + S.to + '.csv'; const saved = window.shpSaveFile(text, name);
  return { name, items: S.M.size, bytes: saved.bytes, errors: S.errors.length };
};
'ok';
