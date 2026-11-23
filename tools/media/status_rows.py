#!/usr/bin/env python3
"""Campaign on/off status (Meta + TikTok) -> media/data/campaign_status.csv  (key,status,checked).

Usage: python3 tools/media/status_rows.py <RAW dir> media/data --date YYYY-MM-DD

Raw files (see tools/media/UPDATE.md, step 2b):
  meta_status__<TK>.json              ads_get_ad_entities level campaign, fields [id, effective_status]
                                      (filtered to ACTIVE or not: only rows with effective_status ACTIVE count)
  tt_campstatus__<TK>__pN.json        tool_execute campaign_get, fields [campaign_id, operation_status]
  tt_camplist__<TK>__<LIVE|PRODUCT>__pN.json   gmv_max_campaign_get (step 2 of the runbook, has operation_status)
campaign_get also lists GMV Max campaigns but always as DISABLE, so the GMV Max list wins for those ids.
Every Meta / TikTok campaign of campaigns.csv in an account that has a status file is written:
ACTIVE if found active, else INACTIVE. Accounts without a status file keep their previous rows.
Shopee has no status file: the dashboard treats a Shopee campaign as active when it spent on the last data day.
"""
import csv, glob, json, os, re, sys


def load(path):
    t = open(path, encoding='utf-8').read()
    return json.loads(t[t.index('{'):])


def main():
    a = sys.argv[1:]
    if len(a) < 4 or a[2] != '--date':
        sys.exit(__doc__)
    raw, data, day = a[0], a[1], a[3]
    act, seen, gmv = set(), set(), {}
    for p in glob.glob(os.path.join(raw, 'meta_status__*.json')):
        acc = re.match(r'meta_status__(.+)\.json$', os.path.basename(p)).group(1)
        e = load(p).get('ad_entities', [])
        e = json.loads(e) if isinstance(e, str) else e
        seen.add(('Meta', acc))
        act |= {'M' + r['id'] for r in e if r.get('id') and r.get('effective_status') == 'ACTIVE'}
    for p in glob.glob(os.path.join(raw, 'tt_campstatus__*.json')):
        acc = os.path.basename(p).split('__')[1]
        seen.add(('TikTok', acc))
        act |= {'T' + r['campaign_id'] for r in load(p)['data']['list'] if r.get('operation_status') == 'ENABLE'}
    for p in glob.glob(os.path.join(raw, 'tt_camplist__*.json')):
        for r in (load(p).get('data') or {}).get('list', []):
            if r.get('operation_status'):
                gmv['T' + r['campaign_id']] = r['operation_status'] == 'ENABLE'
    for k, on in gmv.items():
        (act.add if on else act.discard)(k)
    camps = list(csv.DictReader(open(os.path.join(data, 'campaigns.csv'), encoding='utf-8')))
    out = os.path.join(data, 'campaign_status.csv')
    old = {r['key']: r for r in csv.DictReader(open(out, encoding='utf-8'))} if os.path.exists(out) else {}
    rows, n = {}, {'ACTIVE': 0, 'INACTIVE': 0}
    for c in camps:
        k = c['key']
        if (c['channel'], c['account']) in seen or k in gmv:
            st = 'ACTIVE' if k in act else 'INACTIVE'
            rows[k] = {'key': k, 'status': st, 'checked': day}
            n[st] += 1
        elif k in old:
            rows[k] = old[k]
    with open(out, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, ['key', 'status', 'checked'])
        w.writeheader()
        w.writerows(sorted(rows.values(), key=lambda r: r['key']))
    miss = sorted(act - {c['key'] for c in camps})
    print(f"campaign_status.csv: {len(rows)} campaign, kiểm tra {day}: {n['ACTIVE']} ACTIVE, {n['INACTIVE']} INACTIVE; "
          f"tài khoản: {', '.join(sorted(a + '/' + b for a, b in seen))}"
          + (f"; {len(miss)} campaign đang bật chưa có trong campaigns.csv (chưa chi tiêu)" if miss else ''))


if __name__ == '__main__':
    main()
