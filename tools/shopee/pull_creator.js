// Run in a Chrome tab on https://banhang.shopee.vn/creator-center/insight/live/product-list (logged in to the channel).
// Paste this whole file with javascript_tool, then call:  await shpPullCreator({acc:'HO', from:'2026-10-11', to:'2026-10-20'})
// Then poll window.__shp.done; when 1, call shpDownloadCreator() to save <acc>_lv_<to>.csv to Downloads.
window.shpPullCreator = async function ({ acc, from, to }) {
  const lb = performance.getEntriesByType('resource').find(e => /productsList\/v2/.test(e.name));
  if (!lb) throw new Error('Creator Center API not seen yet: reload the product-list page and retry');
  const base = lb.name, vb = new URL(base);
  const vbase = 'https://banhang.shopee.vn/api/supply/sellercenter/video/v2/productlist?' + [...vb.searchParams].filter(([k]) => /SPC/.test(k)).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&') + '&page=1&pageSize=10&sort=&orderBy=&name=&timeDim=1d&endDate=' + to;
  const who = await (await fetch('/api/supply/lm/sellercenter/userInfo', { credentials: 'include' })).json().catch(() => ({}));
  const S = window.__shp = { acc, from, to, user: who.data && (who.data.userName || who.data.username), L: [], V: [], T: {}, log: {}, done: 0, errors: 0 };
  const f = async u => { for (let k = 0; k < 4; k++) { try { const j = await (await fetch(u, { credentials: 'include' })).json(); if (j.code === 0) return j; } catch (e) { } await new Promise(r => setTimeout(r, 2000)); } return null; };
  const mk = (b, day, p) => { const u = new URL(b); u.searchParams.set('timeDim', '1d'); u.searchParams.set('endDate', day); u.searchParams.set('page', p); u.searchParams.set('pageSize', 200); u.searchParams.set('orderBy', 'placedSales'); u.searchParams.set('sort', 'desc'); return u; };
  const days = []; for (let d = new Date(from + 'T00:00:00Z'); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) days.push(d.toISOString().slice(0, 10));
  const jobs = days.flatMap(d => [['L', d], ['V', d]]);
  (async () => {
    const q = [...jobs];
    await Promise.all([0, 1, 2, 3].map(async () => {
      while (q.length) {
        const [kind, day] = q.shift(); let p = 1, n = 0, tot = 0, stop = false;
        do {
          const j = await f(mk(kind === 'L' ? base : vbase, day, p));
          if (!j) { S.log[kind + day] = 'err'; S.errors++; break; }
          tot = j.data.total;
          for (const r of j.data.list || []) {
            const pg = +r.placedSales || 0, cg = +r.confirmedSales || 0;
            if (pg > 0 || cg > 0) {
              if (kind === 'L') { S.L.push([day, r.itemId, r.clicks || 0, r.atc || 0, r.placedOrders || 0, r.placedItemSold || 0, Math.round(pg), r.confirmedOrders || 0, Math.round(cg)]); if (!S.T[r.itemId]) S.T[r.itemId] = r.title; }
              else { S.V.push([day, String(r.itemid), String(r.shopid), r.placedOrders || 0, Math.round(pg), r.confirmedOrders || 0, Math.round(cg)]); if (!S.T[r.itemid]) S.T[r.itemid] = r.name; }
            } else stop = true;
          }
          n += (j.data.list || []).length; p++;
        } while (!stop && n < tot && p < 8);
        S.log[kind + day] = n + '/' + tot;
      }
    }));
    S.done = 1;
  })();
  return { user: S.user, days: days.length };
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
window.shpDownloadCreator = function () {
  const S = window.__shp, esc = v => { v = v == null ? '' : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const rows = [...S.L.map(r => ['L', r[0], r[1], '', esc(S.T[r[1]]), r[2], r[3], r[4], r[5], r[6], r[7], r[8]]), ...S.V.map(r => ['V', r[0], r[1], r[2], esc(S.T[r[1]]), 0, 0, r[3], 0, r[4], r[5], r[6]])];
  const text = '﻿kind,date,item_id,shop_id,title,clicks,atc,placed_orders,placed_items,placed_gmv,confirmed_orders,confirmed_gmv\n' + rows.map(r => r.join(',')).join('\n');
  const name = S.acc + '_lv_' + S.to + '.csv';
  const saved = window.shpSaveFile(text, name);
  return { name, rows: rows.length, bytes: saved.bytes, errors: S.errors, user: S.user };
};
'ok';
