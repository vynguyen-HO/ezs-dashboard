/* Shopee Live Ads (Dịch vụ Hiển thị Livestream) per campaign per day, from Shopee Seller Center (shops hannahteam1, hannahteam3, olalamedia2).
   Run in a tab of https://banhang.shopee.vn/portal/marketing/pas/index (Chrome logged into the shop), see tools/media/UPDATE.md:
     1. paste this file with javascript_tool
     2. await shpAds({from:'YYYY-MM-DD', to:'YYYY-MM-DD'})   -> {days, rows, csv}  (one request per day, ~1 s apart)
   Read-only: the same list request the "Danh sách Chiến dịch" table sends. Money fields from the API are ×100000.
   Shopee only answers for roughly the last 6 months (older days: "code 5 invalid request"); > 500 campaigns are paged.
   CSV: date,campaign_id,title,spend,gmv,orders,impressions,views,clicks  (only campaigns with spend or GMV that day) */
(function () {
  'use strict';
  const EP = '/api/pas/v1/homepage/query/';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const addD = (d, n) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) + n * 864e5).toISOString().slice(0, 10);
  const cell = s => { s = String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').trim(); return /[",]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  async function day(d) {
    const st = Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 1000 - 7 * 3600;   // 00:00 VN
    const L = [];
    for (let off = 0, total = 1; off < total; off += 500) {   // shops with > 500 campaigns: page through
      const body = { start_time: st, end_time: st + 86399, filter_list: [{ campaign_type: 'live_stream_homepage', state: 'all', search_term: '', is_valid_rebate_only: false }], offset: off, limit: 500 };
      const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 20000);
      try {
        const r = await fetch(EP, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), credentials: 'include', signal: ac.signal }).then(x => x.json());
        if (r.code) throw new Error(d + ': code ' + r.code + ' ' + r.msg);
        total = r.data.total; const page = r.data.entry_list || [];
        L.push(...page);
        if (!page.length) break;
      } finally { clearTimeout(t); }
      if (off + 500 < total) await sleep(500);
    }
    if (new Set(L.map(e => e.campaign.campaign_id)).size < L.length) throw new Error(d + ': duplicate campaigns across pages');
    return L.filter(e => e.report && (e.report.cost > 0 || e.report.broad_gmv > 0)).map(e => {
      const p = e.report;
      return [d, e.campaign.campaign_id, e.title, Math.round(p.cost / 1e5), Math.round(p.broad_gmv / 1e5), p.broad_order || 0, p.impression || 0, p.view || 0, p.click || 0].map(cell).join(',');
    });
  }
  window.shpAds = async function ({ from, to }) {
    const rows = [];
    for (let d = from; d <= to; d = addD(d, 1)) { rows.push(...await day(d)); await sleep(1000); }
    return { from, to, rows: rows.length, csv: 'date,campaign_id,title,spend,gmv,orders,impressions,views,clicks\n' + rows.join('\n') + '\n' };
  };
})();
'pull_shopee_ads.js loaded';
