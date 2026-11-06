// Run in a Chrome tab on https://affiliate.shopee.vn/report/conversion_report (logged in to the channel's affiliate account).
// Paste this whole file with javascript_tool, then call:  shpPullAffiliate({acc:'HO', from:'2026-10-11', to:'2026-10-20'})
// Poll window.__shpa.done; when 1, call shpDownloadAffiliate() to save <acc>_aff_<to>.csv to Downloads.
window.shpPullAffiliate = function ({ acc, from, to }) {
  const S = window.__shpa = { acc, from, to, agg: new Map(), AI: {}, done: 0, calls: 0, errors: [], user: null };
  const T0 = d => Math.floor(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 1000) - 7 * 3600;
  const call = async (s, e, p, ps) => { for (let k = 0; k < 5; k++) { try { S.calls++; const j = await (await fetch(`/api/v3/report/list?page_size=${ps}&page_num=${p}&purchase_time_s=${s}&purchase_time_e=${e}&version=1`, { credentials: 'include' })).json(); if (j.code === 0) return j; } catch (x) { } await new Promise(r => setTimeout(r, 3000 * (k + 1))); } return null; };
  const add = (day, list) => (list || []).forEach(c => {
    if (!S.user) S.user = c.affiliate_name;
    let src = 'Khác'; try { src = JSON.parse(c.referrer || '{}').internal_source || 'Khác'; } catch (x) { }
    (c.orders || []).forEach(o => {
      const canc = /CANCEL|INVALID/i.test(o.order_status) || o.display_order_status === 3 ? 1 : 0;
      (o.items || []).forEach(it => {
        const k = day + '|' + it.item_id + '|' + src + '|' + canc; let a = S.agg.get(k);
        if (!a) { a = [day, String(it.item_id), String(it.shop_id), src, canc, 0, 0, 0, 0]; S.agg.set(k, a); if (!S.AI[it.item_id]) S.AI[it.item_id] = [it.shop_name, it.item_name, it.global_category_lv1_name, it.global_category_lv2_name]; }
        a[5]++; a[6] += it.qty || 0; a[7] += (it.actual_amount || 0) / 1e5; a[8] += (it.capped_brand_commission || 0) / 1e5;
      });
    });
  });
  const win = async (day, s, e) => {
    const j = await call(s, e, 1, 500); if (!j) { S.errors.push(day + ' ' + s); return; }
    const tot = j.data.total_count; if (!tot) return;
    if (tot > 9500 && e - s > 60) { const m = Math.floor((s + e) / 2); await win(day, s, m); await win(day, m + 1, e); return; }
    add(day, j.data.list); let n = (j.data.list || []).length, p = 2;
    while (n < tot && p <= 20) { const k = await call(s, e, p, 500); if (!k) { S.errors.push(day + ' ' + s + ' p' + p); break; } add(day, k.data.list); n += (k.data.list || []).length; p++; if (!(k.data.list || []).length) break; }
  };
  const days = []; for (let d = new Date(from + 'T00:00:00Z'); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) days.push(d.toISOString().slice(0, 10));
  (async () => { const q = [...days]; await Promise.all([0, 1, 2].map(async () => { while (q.length) { const d = q.shift(), s = T0(d); await win(d, s, s + 86399); } })); S.done = 1; })();
  return { days: days.length };
};
// Save text as a file in Downloads. affiliate.shopee.vn replaces HTMLElement.prototype.click with its own
// function (checked 06/11/2026), so `a.click()` on the page no longer runs the browser's native click and the
// download was silently dropped. The link is therefore created and clicked inside a hidden same-origin iframe,
// whose HTMLElement.prototype.click is the untouched native one; link and blob URL stay alive for a minute so
// Chrome can finish writing the file. Returns {name, bytes, intercepted} (intercepted: a page listener cancelled it).
window.shpSaveFile = window.shpSaveFile || function (text, name) {
  const blob = new Blob([text], { type: 'text/csv' }), url = URL.createObjectURL(blob);
  const fr = document.createElement('iframe'); fr.style.display = 'none'; document.body.appendChild(fr);
  const d = fr.contentDocument; d.open(); d.write('<!doctype html><body></body>'); d.close();
  const a = d.createElement('a'); a.href = url; a.download = name; d.body.appendChild(a);
  let blocked = false; a.addEventListener('click', e => { blocked = e.defaultPrevented; });
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); fr.remove(); }, 60000);
  return { name, bytes: blob.size, intercepted: blocked };
};
window.shpDownloadAffiliate = function () {
  const S = window.__shpa, esc = v => { v = v == null ? '' : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const rows = [...S.agg.values()].map(a => { const i = S.AI[a[1]] || []; return [a[0], a[1], a[2], esc(a[3]), a[4], a[5], a[6], Math.round(a[7]), Math.round(a[8]), esc(i[0]), esc(String(i[1] || '').slice(0, 120)), esc(i[2]), esc(i[3])].join(','); });
  const text = '﻿date,item_id,shop_id,source,cancelled,orders,qty,gmv,commission,shop,item_name,cat1,cat2\n' + rows.join('\n');
  const name = S.acc + '_aff_' + S.to + '.csv';
  const saved = window.shpSaveFile(text, name);
  return { name, rows: rows.length, bytes: saved.bytes, errors: S.errors.length, user: S.user };
};
'ok';
