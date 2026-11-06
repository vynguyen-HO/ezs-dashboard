"""Turn the Shopee Live Ads pull (tools/media/pull_shopee_ads.js) into campaign_rows.csv for update_data.py.

Usage:
  python3 tools/media/shopee_ads_rows.py <in> <OUT> [--rows N] [--account NAME]

<in>: either the CSV text itself (a .csv file) or a folder of saved javascript_tool answers c0.txt, c1.txt, …
      each holding one slice of the CSV between « and » (javascript_tool only shows ~1 000 characters per answer).
--rows N: the row count shpAds() reported; the script stops if the joined CSV has a different number of rows.
--account NAME: which shop the pull came from — shop username: hannahteam1 (default), hannahteam3, olalamedia2 —
      update_data.py replaces rows per (date, channel, account), so each
      shop must keep its own name.
Writes <OUT>/campaign_rows.csv (channel Shopee, type live_ads) — or adds to it if the Media pull or another shop
already wrote one (rows of the same account are replaced) — and prints daily totals.
"""
import argparse, csv, io, os, re, sys
from collections import defaultdict

HEAD = ['date', 'channel', 'account', 'type', 'campaign_id', 'campaign', 'objective', 'spend', 'impressions', 'clicks', 'orders', 'revenue', 'views']


def load(src):
    if os.path.isfile(src):
        return open(src, encoding='utf-8').read()
    parts = sorted((f for f in os.listdir(src) if re.match(r'c\d+\.txt$', f)), key=lambda f: int(f[1:-4]))
    text = ''
    for f in parts:
        t = open(os.path.join(src, f), encoding='utf-8').read()
        m = re.search('«(.*)»', t, re.S)
        if not m:
            sys.exit(f'{f}: không thấy đoạn giữa « và »')
        text += m.group(1)
    return text


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('out'); ap.add_argument('--rows', type=int); ap.add_argument('--account', default='hannahteam1')
    a = ap.parse_args()
    rows = list(csv.DictReader(io.StringIO(load(a.src))))
    if a.rows is not None and len(rows) != a.rows:
        sys.exit(f'có {len(rows)} dòng, shpAds báo {a.rows}: thiếu phần, lưu lại các đoạn')
    os.makedirs(a.out, exist_ok=True)
    path = os.path.join(a.out, 'campaign_rows.csv')
    keep = []
    if os.path.exists(path):
        keep = [r for r in csv.DictReader(open(path, encoding='utf-8')) if not (r['channel'] == 'Shopee' and r['account'] == a.account)]
    out, tot = [], defaultdict(lambda: [0, 0, 0])
    for r in rows:
        out.append({'date': r['date'], 'channel': 'Shopee', 'account': a.account, 'type': 'live_ads', 'campaign_id': r['campaign_id'],
                    'campaign': r['title'], 'objective': 'LIVE_ADS', 'spend': r['spend'], 'impressions': r['impressions'],
                    'clicks': r['clicks'], 'orders': r['orders'], 'revenue': r['gmv'], 'views': r['views']})
        t = tot[r['date']]; t[0] += int(r['spend']); t[1] += int(r['gmv']); t[2] += 1
    with open(path, 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=HEAD, lineterminator='\n'); w.writeheader(); w.writerows(keep + out)
    print(f'{path}: {len(out)} dòng Shopee Live Ads {a.account}' + (f' (+{len(keep)} dòng khác giữ nguyên)' if keep else ''))
    for d in sorted(tot):
        s, g, n = tot[d]
        print(f'  {d}: chi {s/1e6:,.1f} tr · GMV {g/1e6:,.1f} tr · ROAS {g/s if s else 0:,.1f} · {n} chiến dịch')


if __name__ == '__main__':
    main()
