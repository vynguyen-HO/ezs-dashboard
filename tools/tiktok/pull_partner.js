/* TikTok Shop Partner Center (Olala MCN) → LIVE sessions + daily video GMV per creator, read-only, no file export.
   Run in a Chrome tab logged in to Partner Center as Olala MCN, on https://partner.tiktokshop.com/compass/creator-service/account
   (that page's own requests give the signed query string we reuse). See tools/tiktok/UPDATE.md:
     1. paste this file with javascript_tool (right after the page has loaded, ~8 s)
     2. ttPull({from:'YYYY-MM-DD', to:'YYYY-MM-DD'})   → starts in the background; poll window.__tt.done
     3. window.__tt.sessions (CSV), window.__tt.videos (CSV), window.__tt.videoTo (last day with video data), window.__tt.log
   sessions CSV = live_sessions.csv columns (one row per LIVE session that started in [from, to], VN time).
   videos CSV   = date,creator,channel,gmv,direct_gmv,items,videos  (Video Analytics, creator-attributed, per creator per day).
   Same numbers as the "LIVE analytics" / "Video Analytics" pages and their Export files (checked 07/11/2026). */
(function () {
  'use strict';
  const PARTNER = '7494094114027046855', HO = ['hannaholala'];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const T0 = d => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 1000 - 7 * 3600;   // 00:00 VN
  const vn = ts => new Date((ts + 7 * 3600) * 1000).toISOString().slice(0, 16).replace('T', ' ');
  const amt = v => v && typeof v === 'object' ? (v.amount || '0') : (v == null ? '' : v);
  const cell = s => { s = String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').trim(); return /[",]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  function base() {   // signed query of an insights request the page already made, minus the per-request signatures
    const u = performance.getEntriesByType('resource').map(e => e.name)   // the page's own call carries partner_id, msToken… (later ones may not)
      .find(n => /\/api\/v2\/insights\/partner\//.test(n) && new URL(n).searchParams.has('partner_id'));
    if (!u) throw new Error('no Partner Center insights request seen yet: reload the page, wait ~8 s, retry');
    const x = new URL(u); x.searchParams.delete('X-Bogus'); x.searchParams.delete('_signature');
    return x.origin + '/api/v2/insights/partner/' + '%PATH%' + x.search;
  }
  async function post(path, body) {
    for (let k = 0; k < 4; k++) {
      try {
        const j = await (await fetch(window.__tt.base.replace('%PATH%', path), { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();
        if (j.code === 0) return j.data;
        window.__tt.log.push(path + ' code ' + j.code + ' ' + j.message);
        if (j.code === 98001004 || j.code === 36009004) return null;   // invalid params: retrying won't help
      } catch (e) { window.__tt.log.push(path + ' ' + e); }
      await sleep(2000 * (k + 1));
    }
    return null;
  }
  async function creators(days) {   // creators of the MCN (Creator Analytics list; one-day ranges only), handle empty when not authorised
    const out = new Map();
    for (const day of days) for (let page = 0; page < 10; page++) {
      const start = vn(day).slice(0, 10), end = vn(day + 86400).slice(0, 10);
      const d = await post('core/creator/list', { request: { time_descriptor: { start, end, timezone_offset: '25200', granularity: 'all', scenario: 1 }, common_stats_types: [1, 4, 2, 3, 90, 100, 91, 92, 60, 70, 80, 61, 71, 81], filter: { module: 1, search: '' }, list_control: { rules: [{ field: 'CORE_CREATOR_LIST_COMMON_GMV', direction: 2 }], pagination: { size: 50, page } } }, version: '2' });
      if (!d) break;
      for (const s of d.stats || []) { const c = s.common_stats; out.set(c.creator_id, { id: c.creator_id, h: c.creator_handle || '', name: c.creator_name || '' }); }
      if (!(d.list_control && d.list_control.next_pagination && d.list_control.next_pagination.has_more)) break;
    }
    return [...out.values()];
  }
  window.ttPull = function ({ from, to }) {
    const S = window.__tt = { from, to, done: 0, log: [], base: base(), sessions: '', videos: '', nSessions: 0, nVideos: 0 };
    const days = []; for (let t = T0(from); t <= T0(to); t += 86400) days.push(t);
    (async () => {
      try {
        const end = new Date((T0(to) + 86400 + 7 * 3600) * 1000).toISOString().slice(0, 10);
        // Video / core stats are published later than LIVE stats; for a day not published yet the API repeats the last one,
        // so video rows stop at the "available date" of the core stats (chart_types 1).
        const av = await (await fetch(S.base.replace('/api/v2/insights/partner/%PATH%', '/api/v3/insights/partner/available/date'), { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ request: { params: [{ chart_types: 1 }] }, version: '3' }) })).json();
        const ad = av && av.data && av.data.segments && av.data.segments[0] && av.data.segments[0].available_date;
        if (!/^\d{8}$/.test(ad || '')) throw new Error('no available date for core stats');
        S.videoTo = ad.slice(0, 4) + '-' + ad.slice(4, 6) + '-' + ad.slice(6);
        const vdays = days.filter(t => vn(t).slice(0, 10) <= S.videoTo);
        const C = await creators([days[0], days[days.length - 1]]); S.creators = C.length;
        if (!C.length) throw new Error('no creators');
        const ses = [], vid = [];
        for (const c of C) {
          // LIVE sessions of this creator (the list API needs one creator per call)
          for (let page = 0; page < 20; page++) {
            const d = await post('live/list', { request: { common_params: { time_selectors: [{ period: 2, granularity: 1, start_timestamp: String(T0(from)), end_timestamp: String(T0(to) + 86399), timezone_offset: '25200' }], pagination: { size: 50, page } }, search_params: { tt_infos: [c.id], is_live: false }, common_stats_types: [40, 20, 50, 21, 23, 67, 34, 35, 12, 22, 60, 61, 62, 36, 25, 24, 63, 32, 64, 65, 66, 1, 2, 11], partner_id: PARTNER }, version: '2' });
            const st = d && d.segments && d.segments[0] && d.segments[0].stats || [];
            for (const s of st) {
              const x = s.common_stats, t = x.time_info || {}, st0 = +t.start_timestamp;
              if (!st0 || st0 < T0(from) || st0 > T0(to) + 86399) continue;
              const h = c.h || c.id;
              ses.push([vn(st0).slice(0, 10), x.live_id, HO.includes(h.toLowerCase()) ? 'HO' : 'MCN', h, c.name, x.live_name, vn(st0), t.end_timestamp ? vn(+t.end_timestamp) : '',
                Math.round((+x.duration || 0) / 60), amt(x.gmv), amt(x.direct_gmv), x.paid_sku_order_cnt || 0, x.item_sold_cnt || 0, x.buyer_cnt || 0,
                x.total_views_unique_cnt || 0, x.total_views || 0, x.pinned_product_cnt || 0, x.product_impression_cnt || 0, x.product_click_cnt || 0, x.new_follower_cnt || 0,
                'Partner Center API ' + end].map(cell).join(','));
            }
            if (st.length < 50) break;
            await sleep(400);
          }
          // video GMV per day (Video Analytics key metrics)
          for (const t of vdays) {
            const d = await post('item/core/stats', { request: { params: [{ time_selector: { period: 24, base_timestamp: String(t), granularity: 1, timezone_offset: '25200' }, filter: { creator_id: c.id, module: 2 }, mcn_stats_types: [1, 10, 3, 12, 2, 11], common_stats_types: [1, 20, 10, 21] }] }, version: '2' });
            const ts = d && d.segments && d.segments[0] && d.segments[0].timed_stats && d.segments[0].timed_stats[0];
            if (!ts) { S.log.push('video ' + (c.h || c.id) + ' ' + vn(t).slice(0, 10) + ': no data'); continue; }
            const m = ts.mcn || {}, k = ts.common_stats || {}, g = +amt(m.video_gmv) || 0, dg = +amt(k.video_direct_gmv) || 0;
            if (g || dg || +m.video_item_sold_cnt) vid.push([vn(t).slice(0, 10), c.h || c.id, HO.includes((c.h || '').toLowerCase()) ? 'HO' : 'MCN', Math.round(g), Math.round(dg), m.video_item_sold_cnt || 0, k.video_cnt || 0].map(cell).join(','));
            await sleep(300);
          }
        }
        S.nSessions = ses.length; S.nVideos = vid.length;
        S.sessions = 'date,live_id,channel,creator,nickname,title,start,end,duration_min,gmv,direct_gmv,sku_orders,items,customers,viewers,views,products,product_impressions,product_clicks,new_followers,source\n' + ses.join('\n') + '\n';
        S.videos = 'date,creator,channel,gmv,direct_gmv,items,videos\n' + vid.join('\n') + '\n';
      } catch (e) { S.log.push('FATAL ' + e); S.error = String(e); }
      S.done = 1;
    })();
    return { days: days.length };
  };
})();
'pull_partner.js loaded';
