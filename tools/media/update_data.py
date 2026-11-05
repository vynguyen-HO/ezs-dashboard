#!/usr/bin/env python3
"""Merge freshly pulled data into media/data/*.csv (rows for the given dates are replaced).

Usage:
  python3 tools/media/update_data.py <input_dir>

<input_dir> may contain any of:
  campaign_rows.csv  date,channel,account,type,campaign_id,campaign,objective,spend,impressions,clicks,orders,revenue,views
       channel: Meta | TikTok | Shopee
       type:    ads | gmv_max_live | gmv_max_product | live_ads
       revenue: Meta omni_purchase_values; TikTok BASIC total_onsite_shopping_value,
                GMV Max product gross_revenue, GMV Max live all_shops_gross_revenue; Shopee broad_gmv/1e5
  gmv_rows.csv       date,channel,gmv,orders      (channel TikTok = creator GMV sheet, Shopee = Shopee Live placed GMV)
  gmv_monthly.csv    full replacement of media/data/gmv_monthly.csv
  meta_ad_rows.csv   date,ad_id,account,spend,impressions,clicks,orders,revenue
       Meta ad level (Ads Manager level=ad, time_increment=1): clicks = link_click,
       orders = omni_purchase, revenue = omni_purchase_values
  meta_ads.csv       ad_id,campaign_key,account,ad_name,adset_name,creative_id,object_type,title,body,story_id
       ad info, upserted by ad_id (campaign_key = "M" + campaign_id)
campaign_rows: every (date, channel, account) present replaces the existing rows for that date, channel & account.
gmv_rows: every (date, channel) present replaces the existing rows for that date & channel.
meta_ad_rows: every (date, account) present replaces the existing ad rows for that date & account.
"""
import csv, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'media', 'data')
PREFIX = {'Meta': 'M', 'TikTok': 'T', 'Shopee': 'S'}


def read(p):
    with open(p, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def write(p, header, rows):
    with open(p, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def num(x):
    try:
        return round(float(x or 0))
    except ValueError:
        return 0


def main(src):
    cp = os.path.join(src, 'campaign_rows.csv')
    if os.path.exists(cp):
        new = read(cp)
        camps = {r['key']: r for r in read(os.path.join(ROOT, 'campaigns.csv'))}
        daily = read(os.path.join(ROOT, 'campaign_daily.csv'))
        replace = {(r['date'], r['channel'], r['account']) for r in new}
        keyacc = {k: (c['channel'], c['account']) for k, c in camps.items()}
        daily = [r for r in daily if (r['date'],) + keyacc.get(r['key'], ('?', '?')) not in replace]
        agg = {}
        for r in new:
            key = PREFIX[r['channel']] + (r['campaign_id'] or r['campaign'])
            name = (r['campaign'] or key).replace(',', ' ').replace('"', "'").strip()
            camps[key] = {'key': key, 'channel': r['channel'], 'account': r['account'], 'type': r['type'],
                          'name': name, 'objective': r.get('objective', '') or camps.get(key, {}).get('objective', '')}
            a = agg.setdefault((r['date'], key), [0] * 6)
            for i, c in enumerate(['spend', 'impressions', 'clicks', 'orders', 'revenue', 'views']):
                a[i] += num(r.get(c))
        for (d, k), a in agg.items():
            if any(a):
                daily.append({'date': d, 'key': k, 'spend': a[0], 'impressions': a[1], 'clicks': a[2],
                              'orders': a[3], 'revenue': a[4], 'views': a[5]})
        daily.sort(key=lambda r: (r['date'], r['key']))
        hd = ['date', 'key', 'spend', 'impressions', 'clicks', 'orders', 'revenue', 'views']
        write(os.path.join(ROOT, 'campaign_daily.csv'), hd, [[r[h] for h in hd] for r in daily])
        hc = ['key', 'channel', 'account', 'type', 'name', 'objective']
        write(os.path.join(ROOT, 'campaigns.csv'), hc, [[c.get(h, '') for h in hc] for c in sorted(camps.values(), key=lambda c: c['key'])])
        print('campaign rows merged:', len(agg), 'dates/channels:', sorted(replace))
    gp = os.path.join(src, 'gmv_rows.csv')
    if os.path.exists(gp):
        new = read(gp)
        replace = {(r['date'], r['channel']) for r in new}
        old = [r for r in read(os.path.join(ROOT, 'gmv_daily.csv')) if (r['date'], r['channel']) not in replace]
        rows = sorted(old + new, key=lambda r: (r['channel'], r['date']))
        write(os.path.join(ROOT, 'gmv_daily.csv'), ['date', 'channel', 'gmv', 'orders'],
              [[r['date'], r['channel'], num(r['gmv']), r.get('orders', '')] for r in rows])
        print('gmv rows merged:', sorted(replace))
    mp = os.path.join(src, 'gmv_monthly.csv')
    if os.path.exists(mp):
        rows = read(mp)
        write(os.path.join(ROOT, 'gmv_monthly.csv'), list(rows[0].keys()), [list(r.values()) for r in rows])
        print('gmv_monthly replaced')
    ip = os.path.join(src, 'meta_ads.csv')
    info_path = os.path.join(ROOT, 'meta_ads.csv')
    hi = ['ad_id', 'campaign_key', 'account', 'ad_name', 'adset_name', 'creative_id', 'object_type', 'title', 'body', 'story_id']
    info = {r['ad_id']: r for r in read(info_path)} if os.path.exists(info_path) else {}
    if os.path.exists(ip):
        for r in read(ip):
            old = info.get(r['ad_id'], {})
            info[r['ad_id']] = {h: (r.get(h) or old.get(h, '')).replace('\n', ' ').strip() for h in hi}
        write(info_path, hi, [[info[k].get(h, '') for h in hi] for k in sorted(info)])
        print('meta ad info upserted:', len(info), 'ads')
    ap = os.path.join(src, 'meta_ad_rows.csv')
    if os.path.exists(ap):
        new = read(ap)
        daily_path = os.path.join(ROOT, 'meta_ads_daily.csv')
        daily = read(daily_path) if os.path.exists(daily_path) else []
        replace = {(r['date'], r['account']) for r in new}
        acc = {k: v.get('account', '') for k, v in info.items()}
        for r in new:  # remember the account of ads not yet in meta_ads.csv
            acc.setdefault(r['ad_id'], r['account'])
        daily = [r for r in daily if (r['date'], acc.get(r['ad_id'], '')) not in replace]
        hd = ['date', 'ad_id', 'spend', 'impressions', 'clicks', 'orders', 'revenue']
        for r in new:
            if num(r.get('spend')) > 0:
                daily.append({h: (r[h] if h in ('date', 'ad_id') else num(r.get(h))) for h in hd})
        daily.sort(key=lambda r: (r['date'], r['ad_id']))
        write(daily_path, hd, [[r[h] for h in hd] for r in daily])
        missing = {r['ad_id'] for r in new} - set(info)
        print('meta ad rows merged:', sorted(replace), '| ads without info:', len(missing))


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
