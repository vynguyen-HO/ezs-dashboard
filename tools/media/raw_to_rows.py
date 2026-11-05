#!/usr/bin/env python3
"""Turn raw API responses (saved as files) into the input CSVs that update_data.py merges.

Usage:
  python3 tools/media/raw_to_rows.py <raw_dir> <out_dir> [--from YYYY-MM-DD] [--to YYYY-MM-DD]

Every file in <raw_dir> is one tool result, saved as-is (JSON). The file NAME says what it is:
  meta_campaign__<ACCOUNT>__*.json  Meta ads_get_ad_entities level=campaign, time_increment "1"
        fields id,name,objective,amount_spent,impressions,clicks,omni_purchase,omni_purchase_values
  meta_ad__<ACCOUNT>__*.json        Meta ads_get_ad_entities level=ad, time_increment "1"
        fields id,name,campaign_id,adset_name,creative_id,amount_spent,impressions,link_click,
               omni_purchase,omni_purchase_values
  meta_creative__*.json             Meta ads_get_creatives (creative_ids lookup)
        fields id,object_type,title,body,effective_object_story_id
  tt_basic__<ACCOUNT>__*.json       TikTok report_integrated_get BASIC, AUCTION_CAMPAIGN,
        dimensions [campaign_id, stat_time_day], metrics campaign_name,objective_type,spend,
        impressions,clicks,video_play_actions,total_onsite_shopping_value,onsite_shopping
  tt_gmvmax__<ACCOUNT>__<LIVE|PRODUCT>__*.json   TikTok gmv_max_report_get,
        dimensions [campaign_id, stat_time_day], metrics cost,gross_revenue,orders,
        all_shops_gross_revenue,all_shops_orders,live_views   (filter campaign_ids of that type)
  tt_room__<ACCOUNT>__*.json        gmv_max_report_get dimensions [room_id, stat_time_day], same metrics
  tt_roominfo__<ACCOUNT>__*.json    gmv_max_report_get dimensions [room_id], ONE campaign_id,
        metrics cost,live_name,live_launched_time,live_duration
  tt_item__<ACCOUNT>__*.json        gmv_max_report_get dimensions [campaign_id, item_id, stat_time_day],
        metrics cost,gross_revenue,orders (filter campaign_ids + item_group_ids)
  tt_ad__<ACCOUNT>__*.json          report_integrated_get BASIC, AUCTION_AD, dimensions [ad_id, stat_time_day],
        metrics ad_name,campaign_id,spend,total_onsite_shopping_value,onsite_shopping
  sheet_daily.json                  Sheets get_values GMV_Historical Daily_History!A1:E1000
  sheet_gmvdata.json                Sheets get_values GMV_Historical GMV_Data!A1:L40
ACCOUNT: Meta = HO.com | HO4D | X1, TikTok = Affiliate | HANNAHOLALA.
A tool result may be the raw JSON, a {"ad_entities": "<json>"} wrapper, or a list of
{"type":"text","text":"<json>"} blocks; all are accepted. Several pages = several files.

Writes to <out_dir> only the files it has input for:
  campaign_rows.csv, meta_ad_rows.csv, meta_ads.csv, tiktok_live_rows.csv, tiktok_lives.csv,
  tiktok_video_rows.csv, tiktok_videos.csv, gmv_rows.csv, gmv_monthly.csv
and prints totals per source so they can be checked before merging.
Rows outside --from/--to are dropped (use it so a long API window does not overwrite older days).
"""
import csv, glob, json, os, re, sys
from collections import defaultdict

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'media', 'data')


def unwrap(x):
    """Return a python object from any of the saved tool-result shapes."""
    if isinstance(x, str):
        try:
            return unwrap(json.loads(x))
        except ValueError:
            return x
    if isinstance(x, list) and x and all(isinstance(b, dict) and b.get('type') == 'text' for b in x):
        return unwrap(''.join(b.get('text', '') for b in x))
    if isinstance(x, dict):
        if 'ad_entities' in x:
            return unwrap(x['ad_entities'])
        if 'creatives' in x and isinstance(x['creatives'], (list, str)):
            return unwrap(x['creatives'])
    return x


def load(path):
    with open(path, encoding='utf-8') as f:
        return unwrap(f.read())


def rows_of(obj):
    """TikTok {data:{list:[...]}} → list; Meta list → list; dict with data list → list."""
    if isinstance(obj, dict):
        d = obj.get('data', obj)
        if isinstance(d, dict) and 'list' in d:
            return d['list']
        if isinstance(d, list):
            return d
        for k in ('ad_entities', 'creatives', 'results'):
            if isinstance(obj.get(k), list):
                return obj[k]
        return []
    return obj if isinstance(obj, list) else []


def val(x):
    if isinstance(x, dict):
        x = x.get('value', 0)
    if x in (None, '', '-', '--'):
        return 0.0
    try:
        return float(str(x).replace(',', ''))
    except ValueError:
        return 0.0


def files(raw, prefix):
    return sorted(glob.glob(os.path.join(raw, prefix + '__*.json')) + glob.glob(os.path.join(raw, prefix + '.json')))


def acct(path):
    parts = os.path.basename(path).split('__')
    return parts[1] if len(parts) > 2 else ''


def tt_flat(r):
    """TikTok list item → (dimensions dict, metrics dict)."""
    return r.get('dimensions', {}), r.get('metrics', {})


def day(s):
    return str(s)[:10]


def write(path, header, rows):
    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def main(raw, out, d_from, d_to):
    os.makedirs(out, exist_ok=True)
    inr = lambda d: bool(re.match(r'\d{4}-\d\d-\d\d$', d or '')) and (not d_from or d >= d_from) and (not d_to or d <= d_to)
    report = []

    # ---------- campaign_rows.csv (Meta + TikTok) ----------
    camp = {}  # (date, channel, account, type, cid) -> row
    def add_camp(d, ch, acc, typ, cid, name, obj, spend, imp, clk, orders, rev, views):
        if not inr(d):
            return
        k = (d, ch, acc, typ, cid)
        r = camp.setdefault(k, {'date': d, 'channel': ch, 'account': acc, 'type': typ, 'campaign_id': cid,
                                'campaign': name, 'objective': obj, 'spend': 0, 'impressions': 0, 'clicks': 0,
                                'orders': 0, 'revenue': 0, 'views': 0})
        for c, v in (('spend', spend), ('impressions', imp), ('clicks', clk), ('orders', orders),
                     ('revenue', rev), ('views', views)):
            r[c] += v
        if name and not r['campaign']:
            r['campaign'] = name

    seen = set()
    for p in files(raw, 'meta_campaign'):
        for r in rows_of(load(p)):
            if not r.get('id'):
                continue
            d = day(r.get('date_start', ''))
            key = (d, r['id'])
            if key in seen:      # overlapping pages / fetches
                continue
            seen.add(key)
            add_camp(d, 'Meta', acct(p), 'ads', r['id'], r.get('name', ''), r.get('objective', ''),
                     val(r.get('amount_spent')), val(r.get('impressions')), val(r.get('clicks')),
                     val(r.get('omni_purchase')), val(r.get('omni_purchase_values')), 0)
    seen = set()
    for p in files(raw, 'tt_basic'):
        for r in rows_of(load(p)):
            dm, m = tt_flat(r)
            d, cid = day(dm.get('stat_time_day', '')), str(dm.get('campaign_id', ''))
            if not cid or (d, cid) in seen:
                continue
            seen.add((d, cid))
            add_camp(d, 'TikTok', acct(p), 'ads', cid, m.get('campaign_name', ''), m.get('objective_type', ''),
                     val(m.get('spend')), val(m.get('impressions')), val(m.get('clicks')),
                     val(m.get('onsite_shopping')), val(m.get('total_onsite_shopping_value')),
                     val(m.get('video_play_actions')))
    known = {}
    cpath = os.path.join(ROOT, 'campaigns.csv')
    if os.path.exists(cpath):
        with open(cpath, newline='', encoding='utf-8') as f:
            known = {r['key']: r for r in csv.DictReader(f)}
    seen = set()
    for p in files(raw, 'tt_gmvmax'):
        parts = os.path.basename(p).split('__')
        kind = parts[2].upper() if len(parts) > 3 else ''
        typ = 'gmv_max_live' if kind == 'LIVE' else 'gmv_max_product'
        for r in rows_of(load(p)):
            dm, m = tt_flat(r)
            d, cid = day(dm.get('stat_time_day', '')), str(dm.get('campaign_id', ''))
            if not cid or (d, cid) in seen:
                continue
            seen.add((d, cid))
            name = m.get('campaign_name') or known.get('T' + cid, {}).get('name', '')
            if typ == 'gmv_max_live':
                add_camp(d, 'TikTok', acct(p), typ, cid, name, 'GMV_MAX', val(m.get('cost')), 0, 0,
                         val(m.get('all_shops_orders')), val(m.get('all_shops_gross_revenue')), val(m.get('live_views')))
            else:
                add_camp(d, 'TikTok', acct(p), typ, cid, name, 'GMV_MAX', val(m.get('cost')), 0, 0,
                         val(m.get('orders')), val(m.get('gross_revenue')), 0)
    if camp:
        hd = ['date', 'channel', 'account', 'type', 'campaign_id', 'campaign', 'objective', 'spend', 'impressions',
              'clicks', 'orders', 'revenue', 'views']
        rows = sorted(camp.values(), key=lambda r: (r['date'], r['channel'], r['account'], r['campaign_id']))
        write(os.path.join(out, 'campaign_rows.csv'), hd, [[r[h] if not isinstance(r[h], float) else round(r[h]) for h in hd] for r in rows])
        tot = defaultdict(float)
        for r in rows:
            tot[(r['channel'], r['account'], r['type'])] += r['spend']
        report.append(('campaign_rows', {'/'.join(k): round(v) for k, v in sorted(tot.items())}))

    # ---------- Meta ads ----------
    ad_rows, ad_info, seen = [], {}, set()
    for p in files(raw, 'meta_ad'):
        for r in rows_of(load(p)):
            if not r.get('id'):
                continue
            d = day(r.get('date_start', ''))
            ad_info.setdefault(r['id'], {'ad_id': r['id'], 'campaign_key': 'M' + str(r.get('campaign_id', '')),
                                         'account': acct(p), 'ad_name': r.get('name', ''),
                                         'adset_name': r.get('adset_name', ''), 'creative_id': str(r.get('creative_id', ''))})
            if not inr(d) or (d, r['id']) in seen:
                continue
            seen.add((d, r['id']))
            sp = val(r.get('amount_spent'))
            if sp > 0:
                ad_rows.append([d, r['id'], acct(p), round(sp), round(val(r.get('impressions'))),
                                round(val(r.get('link_click'))), round(val(r.get('omni_purchase'))),
                                round(val(r.get('omni_purchase_values')))])
    cre = {}
    for p in files(raw, 'meta_creative'):
        for c in rows_of(load(p)):
            if isinstance(c, dict) and c.get('id'):
                cre[str(c['id'])] = c
    if ad_rows:
        write(os.path.join(out, 'meta_ad_rows.csv'),
              ['date', 'ad_id', 'account', 'spend', 'impressions', 'clicks', 'orders', 'revenue'], ad_rows)
        report.append(('meta_ad_rows', {'rows': len(ad_rows), 'spend': sum(r[3] for r in ad_rows)}))
    if ad_info:
        clean = lambda s: re.sub(r'\s+', ' ', str(s or '')).strip()[:120]
        rows = []
        for a in ad_info.values():
            c = cre.get(a['creative_id'], {})
            rows.append([a['ad_id'], a['campaign_key'], a['account'], clean(a['ad_name']), clean(a['adset_name']),
                         a['creative_id'], c.get('object_type', ''), clean(c.get('title')), clean(c.get('body')),
                         c.get('effective_object_story_id', '')])
        write(os.path.join(out, 'meta_ads.csv'), ['ad_id', 'campaign_key', 'account', 'ad_name', 'adset_name',
                                                  'creative_id', 'object_type', 'title', 'body', 'story_id'], rows)
        missing = sum(1 for a in ad_info.values() if a['creative_id'] and a['creative_id'] not in cre)
        report.append(('meta_ads', {'ads': len(rows), 'creatives_missing': missing}))

    # ---------- TikTok live rooms ----------
    live = {}
    for p in files(raw, 'tt_room'):
        if os.path.basename(p).startswith('tt_roominfo'):
            continue
        for r in rows_of(load(p)):
            dm, m = tt_flat(r)
            d, rid = day(dm.get('stat_time_day', '')), str(dm.get('room_id', ''))
            if not rid or not inr(d):
                continue
            v = [val(m.get('cost')), val(m.get('gross_revenue')), val(m.get('orders')),
                 val(m.get('all_shops_gross_revenue')), val(m.get('all_shops_orders')), val(m.get('live_views'))]
            if not any(v[:1] + v[1:2] + v[3:4]):
                continue
            k = (d, rid, acct(p))
            live[k] = [a + b for a, b in zip(live.get(k, [0] * 6), v)]
    if live:
        write(os.path.join(out, 'tiktok_live_rows.csv'),
              ['date', 'room_id', 'account', 'spend', 'gmv', 'orders', 'gmv_all', 'orders_all', 'views'],
              [[d, rid, a] + [round(x) for x in v] for (d, rid, a), v in sorted(live.items())])
        report.append(('tiktok_live_rows', {'rows': len(live), 'spend': round(sum(v[0] for v in live.values()))}))
    info = {}
    for p in files(raw, 'tt_roominfo'):
        for r in rows_of(load(p)):
            dm, m = tt_flat(r)
            rid = str(dm.get('room_id', ''))
            if rid and m.get('live_name'):
                info[rid] = [rid, acct(p), m.get('live_name', '').strip(), m.get('live_launched_time', ''), m.get('live_duration', '')]
    if info:
        write(os.path.join(out, 'tiktok_lives.csv'), ['room_id', 'account', 'live_name', 'launched', 'duration'], sorted(info.values()))
        report.append(('tiktok_lives', {'rooms_with_name': len(info)}))

    # ---------- TikTok videos ----------
    vid, vinfo = {}, {}
    for p in files(raw, 'tt_item'):
        for r in rows_of(load(p)):
            dm, m = tt_flat(r)
            d, iid, cid = day(dm.get('stat_time_day', '')), str(dm.get('item_id', '')), str(dm.get('campaign_id', ''))
            if not iid or not inr(d):
                continue
            k = (d, 'P' + iid)
            v = [val(m.get('cost')), val(m.get('gross_revenue')), val(m.get('orders'))]
            vid[k] = ([a + b for a, b in zip(vid[k][0], v)], acct(p)) if k in vid else (v, acct(p))
            vinfo.setdefault('P' + iid, ['P' + iid, 'product_gmv_max', acct(p), '', '', '', 'T' + cid if cid else ''])
    for p in files(raw, 'tt_ad'):
        for r in rows_of(load(p)):
            dm, m = tt_flat(r)
            d, aid = day(dm.get('stat_time_day', '')), str(dm.get('ad_id', ''))
            if not aid or not inr(d):
                continue
            v = [val(m.get('spend')), val(m.get('total_onsite_shopping_value')), val(m.get('onsite_shopping'))]
            if not (v[0] or v[1]):
                continue
            vid[(d, 'A' + aid)] = (v, acct(p))
            vinfo.setdefault('A' + aid, ['A' + aid, 'video_ads', acct(p), re.sub(r'\s+', ' ', m.get('ad_name', '') or '')[:120],
                                         '', '', 'T' + str(m.get('campaign_id', '')) if m.get('campaign_id') else ''])
    if vid:
        write(os.path.join(out, 'tiktok_video_rows.csv'), ['date', 'vid_key', 'account', 'spend', 'gmv', 'orders'],
              [[d, k, a] + [round(x) for x in v] for (d, k), (v, a) in sorted(vid.items())])
        write(os.path.join(out, 'tiktok_videos.csv'), ['vid_key', 'source', 'account', 'title', 'tt_account', 'product', 'campaign_key'],
              sorted(vinfo.values()))
        report.append(('tiktok_video_rows', {'rows': len(vid), 'spend': round(sum(v[0][0] for v in vid.values()))}))

    # ---------- sheet: TikTok creator GMV per day, monthly GMV & plan ----------
    sd = os.path.join(raw, 'sheet_daily.json')
    if os.path.exists(sd):
        vals = load(sd).get('values', [])
        hd = vals[0] if vals else []
        out_rows = []
        if 'date' in hd and 'tt' in hd:
            i_d, i_t = hd.index('date'), hd.index('tt')
            from datetime import date, timedelta
            for r in vals[1:]:
                if len(r) <= i_t or not re.match(r'\d{4}-\d\d-\d\d$', r[i_d]):
                    continue
                y, mo, dd = map(int, r[i_d].split('-'))
                d = (date(y, mo, dd) - timedelta(days=1)).isoformat()   # row D holds yesterday's GMV
                g = val(r[i_t])
                if g > 0 and inr(d):
                    out_rows.append([d, 'TikTok', round(g), ''])
        if out_rows:
            write(os.path.join(out, 'gmv_rows.csv'), ['date', 'channel', 'gmv', 'orders'], out_rows)
            report.append(('gmv_rows TikTok', {r[0]: r[2] for r in out_rows[-5:]}))
    sg = os.path.join(raw, 'sheet_gmvdata.json')
    if os.path.exists(sg):
        vals = load(sg).get('values', [])
        hdr = next((r for r in vals if r and r[0] == 'Channel'), None)
        if hdr:
            ix = {h: i for i, h in enumerate(hdr)}
            par = {r[0]: r for r in vals if r and r[0] in ('Facebook', 'TikTok', 'Shopee')}
            g = lambda ch, col: round(val(par.get(ch, [''] * 20)[ix[col]])) if col in ix and len(par.get(ch, [])) > ix[col] else 0
            month = (d_to or '')[:7]
            if month and par:
                mpath = os.path.join(ROOT, 'gmv_monthly.csv')
                with open(mpath, newline='', encoding='utf-8') as f:
                    rows = [r for r in csv.DictReader(f) if r['month'] != month]
                new = {'month': month, 'fb_plan': g('Facebook', 'Target_GMV (đ)'), 'fb_actual': g('Facebook', 'Actual_GMV_MTD (đ)'),
                       'tt_plan': g('TikTok', 'Target_GMV (đ)'), 'tt_actual': g('TikTok', 'Actual_GMV_MTD (đ)'),
                       'sp_plan': g('Shopee', 'Target_GMV (đ)'), 'sp_actual': g('Shopee', 'Actual_GMV_MTD (đ)')}
                new['total_actual'] = new['fb_actual'] + new['tt_actual'] + new['sp_actual']
                rows.append(new)
                rows.sort(key=lambda r: r['month'])
                hd = ['month', 'fb_plan', 'fb_actual', 'tt_plan', 'tt_actual', 'sp_plan', 'sp_actual', 'total_actual']
                write(os.path.join(out, 'gmv_monthly.csv'), hd, [[r[h] for h in hd] for r in rows])
                report.append(('gmv_monthly ' + month, new))

    for name, data in report:
        print(name, json.dumps(data, ensure_ascii=False))
    if not report:
        print('nothing recognised in', raw)


if __name__ == '__main__':
    a = sys.argv[1:]
    if len(a) < 2:
        sys.exit(__doc__)
    opt = {a[i]: a[i + 1] for i in range(2, len(a) - 1, 2)}
    main(a[0], a[1], opt.get('--from'), opt.get('--to'))
