"""Update the Tiktok dashboard data (tiktok/data/*.csv) from the GMV sheet and TikTok Shop LIVE exports.

Usage:
  python3 tools/tiktok/update.py --data tiktok/data [--sheet-gmv sheet_gmvdata.json --sheet-daily sheet_daily.json]
                                 [--live-export "Olala MCN_LiveAnalysis_….csv" [--live-export more.xlsx …]]

--live-export: a "LIVE analytics" export (csv or xlsx) from TikTok Shop — the MCN account "Olala MCN" (all HO + Hannah Team
               creators) or one creator's LIVE Manager. One row per LIVE session. Sessions are upserted by Livestream ID,
               so overlapping exports are fine (the later file on the command line wins). Writes live_sessions.csv.

--sheet-gmv:   the JSON answer of Google Sheets get_values on GMV_Data!A1:L40 of GMV_Historical_HannahOlala
               (same file the Media update saves as $RAW/sheet_gmvdata.json).
--sheet-daily: the JSON answer of get_values on Daily_History!A1:E1000 ($RAW/sheet_daily.json).

Only the standard library is used. Writes:
  tt_mtd.csv        current month per sub-channel: plan, MTD, yesterday, last month   (replaced every run)
  tt_month_plan.csv one row per month: TikTok plan, MTD in the sheet, days counted     (upsert by month)
  tt_monthly.csv    one row per month x sub-channel: GMV (MTD, final once the month ends) and plan (upsert by month)
  tt_sub_daily.csv  one row per day x sub-channel: the sheet's "GMV_Yesterday" column   (upsert by date)
"As of" follows the Shopee dashboard: the latest date in Daily_History, counted as the last day in the MTD.
Daily TikTok GMV and all ads numbers are not stored here: the page reads them from media/data/.
Prints a summary; exits non-zero on a problem so nothing half-done gets published.
"""
import argparse, calendar, csv, datetime, json, os, re, sys, time

SUBS = [  # (sheet row name, short name, account, format)
    ('[HO] TikTok_Live', '[HO] Live', 'HO', 'Live'),
    ('[HO] TikTok_Video', '[HO] Video', 'HO', 'Video'),
    ('[MCN] TikTok_Live', '[MCN] Live', 'MCN', 'Live'),
    ('[MCN] TikTok_Video', '[MCN] Video', 'MCN', 'Video'),
]


def num(s):
    s = str(s if s is not None else '').replace(',', '').replace('%', '').strip()
    try:
        return float(s)
    except ValueError:
        return None


def values(path):
    d = json.load(open(path, encoding='utf-8'))
    return d.get('values', d) if isinstance(d, dict) else d


def read(path):
    if not os.path.exists(path):
        return []
    with open(path, encoding='utf-8', newline='') as f:
        return list(csv.DictReader(f))


def write(path, header, rows):
    with open(path, 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=header, lineterminator='\n')
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, '') for k in header})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', required=True)
    ap.add_argument('--sheet-gmv')
    ap.add_argument('--sheet-daily')
    ap.add_argument('--live-export', action='append', help='TikTok Shop "LIVE analytics" export, csv or xlsx (repeatable)')
    a = ap.parse_args()
    D = a.data.rstrip('/') + '/'
    os.makedirs(D, exist_ok=True)
    report = []
    if a.sheet_gmv and a.sheet_daily:
        sheet_update(D, a.sheet_gmv, a.sheet_daily, report)
    if a.live_export:
        live_update(D, a.live_export, report)
    if not report:
        sys.exit('nothing to do: pass --sheet-gmv/--sheet-daily and/or --live-export')
    print('\n'.join(report))
    if any(l.startswith('CẢNH BÁO') for l in report):
        sys.exit(2)


def sheet_update(D, sheet_gmv, sheet_daily, report):
    G, H = values(sheet_gmv), values(sheet_daily)
    dates = [r[0] for r in H[1:] if r and re.match(r'^\d{4}-\d{2}-\d{2}$', str(r[0]))]
    if not dates:
        sys.exit('sheet-daily: no dates found')
    as_of = max(dates)
    month, day = as_of[:7], int(as_of[8:])
    dim = calendar.monthrange(int(month[:4]), int(month[5:]))[1]

    rows = {}  # first occurrence wins: the sheet repeats channel names in a link list further down
    for r in G:
        if r and str(r[0]).strip():
            rows.setdefault(str(r[0]).strip(), r)
    if 'TikTok' not in rows:
        sys.exit('sheet-gmv: no "TikTok" row in GMV_Data')
    # columns: 0 Channel, 5 Actual_GMV_LastMonth, 6 Target, 7 Actual_MTD, 8 GMV_Yesterday
    col = lambda r, i: num(r[i]) if len(r) > i else None
    mtd = []
    for sheet_name, name, acc, fmt in SUBS:
        r = rows.get(sheet_name)
        if not r:
            sys.exit(f'sheet-gmv: missing row {sheet_name}')
        plan, m, y, lm = col(r, 6), col(r, 7), col(r, 8), col(r, 5)
        if m is None:
            sys.exit(f'sheet-gmv: missing MTD for {sheet_name}')
        mtd.append({'sub_channel': name, 'account': acc, 'format': fmt, 'plan': int(plan or 0), 'mtd': int(m),
                    'yesterday': '' if y is None else int(y), 'last_month': '' if lm is None else int(lm), 'as_of': as_of})
    tt = rows['TikTok']
    t_plan, t_mtd, t_y = col(tt, 6), col(tt, 7), col(tt, 8)
    s_mtd = sum(r['mtd'] for r in mtd)
    s_y = sum(r['yesterday'] or 0 for r in mtd)

    write(D + 'tt_mtd.csv', ['sub_channel', 'account', 'format', 'plan', 'mtd', 'yesterday', 'last_month', 'as_of'], mtd)

    pl = [r for r in read(D + 'tt_month_plan.csv') if r['month'] != month]
    pl.append({'month': month, 'plan': int(t_plan or 0), 'sheet_mtd': int(t_mtd or 0), 'days_in_month': dim, 'days_counted': day})
    write(D + 'tt_month_plan.csv', ['month', 'plan', 'sheet_mtd', 'days_in_month', 'days_counted'], sorted(pl, key=lambda r: r['month']))

    mon = [r for r in read(D + 'tt_monthly.csv') if r['month'] != month]
    have = {r['month'] for r in mon}
    # seed last month once from the sheet's "Actual_GMV_LastMonth" column (rounded numbers in the sheet)
    lm_month = f'{int(month[:4]) - (month[5:] == "01")}-{12 if month[5:] == "01" else int(month[5:]) - 1:02d}'
    if lm_month not in have and all(r['last_month'] != '' for r in mtd):
        for r in mtd:
            mon.append({'month': lm_month, 'sub_channel': r['sub_channel'], 'account': r['account'], 'format': r['format'],
                        'gmv': r['last_month'], 'plan': '', 'note': 'số tháng trước làm tròn trong sheet'})
        report.append(f'tt_monthly: thêm {lm_month} từ cột Actual_GMV_LastMonth')
    for r in mtd:
        mon.append({'month': month, 'sub_channel': r['sub_channel'], 'account': r['account'], 'format': r['format'],
                    'gmv': r['mtd'], 'plan': r['plan'], 'note': f'MTD tới {as_of}'})
    order = {s[1]: i for i, s in enumerate(SUBS)}
    write(D + 'tt_monthly.csv', ['month', 'sub_channel', 'account', 'format', 'gmv', 'plan', 'note'],
          sorted(mon, key=lambda r: (r['month'], order.get(r['sub_channel'], 9))))

    sd = [r for r in read(D + 'tt_sub_daily.csv') if r['date'] != as_of]
    for r in mtd:
        if r['yesterday'] != '':
            sd.append({'date': as_of, 'sub_channel': r['sub_channel'], 'gmv': r['yesterday']})
    write(D + 'tt_sub_daily.csv', ['date', 'sub_channel', 'gmv'], sorted(sd, key=lambda r: (r['date'], order.get(r['sub_channel'], 9))))

    report.append(f'sheet tới {as_of}: TikTok MTD {s_mtd/1e9:.2f} tỷ / plan {(t_plan or 0)/1e9:.2f} tỷ '
                     f'({s_mtd/(t_plan or 1)*100:.1f}%), hôm qua {s_y/1e6:.0f} tr')
    for r in mtd:
        report.append(f"  {r['sub_channel']}: MTD {r['mtd']/1e6:,.0f} tr / plan {r['plan']/1e6:,.0f} tr")
    if t_mtd is not None and abs(s_mtd - t_mtd) > 1e6:
        report.append(f'CẢNH BÁO: tổng 4 kênh con ({s_mtd:,.0f}) lệch dòng TikTok trong sheet ({t_mtd:,.0f})')
    if t_y is not None and abs(s_y - t_y) > 1e6:
        report.append(f'CẢNH BÁO: tổng "hôm qua" 4 kênh con lệch dòng TikTok trong sheet')


HO_CREATORS = {'hannaholala'}   # everything else in the MCN export is counted as MCN (Hannah Team)
LIVE_COLS = {  # export header -> our column
    'Creator username': 'creator', 'Creator nickname': 'nickname', 'Livestream ID': 'live_id', 'LIVE': 'title', 'Start time': 'time',
    'Creator-attributed GMV': 'gmv', 'Direct GMV': 'direct_gmv', 'Creator-attributed items sold': 'items', 'Creator SKU orders': 'sku_orders',
    'Customers': 'customers', 'Viewers': 'viewers', 'Views': 'views', 'Duration': 'duration', 'Products': 'products',
    'Product impressions': 'product_impressions', 'Product clicks': 'product_clicks', 'New followers': 'new_followers',
}
LIVE_OUT = ['date', 'live_id', 'channel', 'creator', 'nickname', 'title', 'start', 'end', 'duration_min', 'gmv', 'direct_gmv', 'sku_orders',
            'items', 'customers', 'viewers', 'views', 'products', 'product_impressions', 'product_clicks', 'new_followers', 'source']


def xlsx_rows(path):
    """First worksheet of an xlsx as a list of rows (stdlib only)."""
    import zipfile
    import xml.etree.ElementTree as ET
    ns = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
    z = zipfile.ZipFile(path)
    ss = [''.join(t.text or '' for t in si.iter(ns + 't')) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall(ns + 'si')] \
        if 'xl/sharedStrings.xml' in z.namelist() else []
    sheet = sorted(n for n in z.namelist() if re.match(r'xl/worksheets/sheet\d+\.xml$', n))[0]
    rows = []
    for r in ET.fromstring(z.read(sheet)).iter(ns + 'row'):
        row = []
        for c in r.findall(ns + 'c'):
            col = re.match(r'[A-Z]+', c.get('r', 'A')).group()
            idx = 0
            for ch in col:
                idx = idx * 26 + ord(ch) - 64
            while len(row) < idx - 1:
                row.append('')
            v, t = c.find(ns + 'v'), c.get('t')
            row.append(ss[int(v.text)] if t == 's' and v is not None else
                       ''.join(x.text or '' for x in c.iter(ns + 't')) if t == 'inlineStr' else (v.text if v is not None else ''))
        rows.append(row)
    return rows


def export_rows(path):
    if path.lower().endswith('.xlsx'):
        rows = xlsx_rows(path)
    else:
        rows = list(csv.reader(open(path, encoding='utf-8-sig', newline='')))
    head = [h.strip() for h in rows[0]]
    missing = [k for k in ('Creator username', 'Livestream ID', 'Start time', 'Creator-attributed GMV', 'Creator SKU orders') if k not in head]
    if missing:
        sys.exit(f'{os.path.basename(path)}: không phải file "LIVE analytics" (thiếu cột {", ".join(missing)})')
    out = []
    for r in rows[1:]:
        if len(r) < len(head) or not r[head.index('Livestream ID')].strip():
            continue                      # the CSV export has a second row with metric definitions
        out.append({LIVE_COLS[h]: r[i] for i, h in enumerate(head) if h in LIVE_COLS})
    return out


def money_int(s):
    s = re.sub(r'[^\d]', '', str(s or ''))
    return int(s) if s else 0


def minutes(s):
    m = re.match(r'(?:(\d+)h)?(?:(\d+)min)?(?:(\d+)s)?$', str(s or '').strip())
    return round(int(m.group(1) or 0) * 60 + int(m.group(2) or 0) + int(m.group(3) or 0) / 60) if m else ''


def parse_time(s):
    """'10:00:45 27/10/2026 - 00:00:11 28/10/2026' -> ('2026-10-27 10:00', '2026-10-28 00:00')"""
    p = re.findall(r'(\d{1,2}):(\d{2}):\d{2} (\d{2})/(\d{2})/(\d{4})', str(s or ''))
    iso = [f'{y}-{mo}-{d} {int(h):02d}:{mi}' for h, mi, d, mo, y in p]
    return (iso + ['', ''])[:2]


def live_update(D, files, report):
    have = {r['live_id']: r for r in read(D + 'live_sessions.csv')}
    added = changed = 0
    for path in files:
        rows = export_rows(path)
        for r in rows:
            start, end = parse_time(r.get('time'))
            if not start:
                continue
            o = {'date': start[:10], 'live_id': r['live_id'].strip().lstrip('=').strip('"'), 'start': start, 'end': end,
                 'channel': 'HO' if r['creator'].strip().lower() in HO_CREATORS else 'MCN', 'creator': r['creator'].strip(),
                 'nickname': r.get('nickname', '').strip(), 'title': re.sub(r'\s+', ' ', r.get('title', '')).strip(),
                 'duration_min': minutes(r.get('duration')), 'source': os.path.basename(path)}
            for k in ('gmv', 'direct_gmv', 'sku_orders', 'items', 'customers', 'viewers', 'views', 'products', 'product_impressions', 'product_clicks', 'new_followers'):
                o[k] = money_int(r.get(k))
            if o['live_id'] in have:
                changed += have[o['live_id']].get('gmv') != str(o['gmv'])
            else:
                added += 1
            have[o['live_id']] = o
        ds = sorted(parse_time(r.get('time'))[0][:10] for r in rows if parse_time(r.get('time'))[0])
        report.append(f'{os.path.basename(path)}: {len(rows)} phiên, {ds[0] if ds else "?"}..{ds[-1] if ds else "?"}')
    out = sorted(have.values(), key=lambda r: (r['date'], r['start'], r['live_id']))
    write(D + 'live_sessions.csv', LIVE_OUT, out)
    by = {}
    for r in out:
        b = by.setdefault(r['channel'], [0, 0, 0])
        b[0] += int(r['gmv']); b[1] += int(r['sku_orders']); b[2] += 1
    report.append(f'live_sessions.csv: {len(out)} phiên ({added} mới, {changed} đổi GMV), tới ngày {out[-1]["date"] if out else "?"}; '
                  + ', '.join(f'{k} {v[0]/1e9:,.1f} tỷ / {v[1]:,} đơn / {v[2]} phiên' for k, v in sorted(by.items())))
    zero = [r['live_id'] for r in out if not int(r['gmv']) and int(r['sku_orders'])]
    if zero:
        report.append(f'CẢNH BÁO: {len(zero)} phiên có đơn nhưng GMV = 0 (đọc sai cột?)')


if __name__ == '__main__':
    main()
