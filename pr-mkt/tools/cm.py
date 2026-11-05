#!/usr/bin/env python3
"""Hannah Team Channel Monitor — kho dữ liệu + build.

  python3 cm.py merge <thư_mục_input>      # gộp số mới vào pr-mkt/data/*.json
  python3 cm.py build [--asof 2026-10-21T15:00]   # tạo pr-mkt/detail.html (bảng chi tiết công khai)
                                                  # và pr-mkt/tools/out/artifact.html (bản Claude)
                                                  # (pr-mkt/index.html là trang app, tự đọc data/*.json, không build)
  python3 cm.py todo [--days 8]            # in danh sách video cần đọc lại số (id, handle)

File input (đều không bắt buộc, CSV có dòng tiêu đề, UTF-8, LF):
  videos.csv     h,id,ts,title,tag,failed     ts = epoch giây (trống thì lấy id>>32); tag/failed = 0/1
  stats.csv      id,views,likes,cmts,shares,saves
  followers.csv  h,followers
  gmv.csv        h,date,gmv,video,live        date = YYYY-MM-DD, đơn vị VND
Ngày giờ dùng giờ Việt Nam (UTC+7).
"""
import csv, json, os, sys, datetime as dt

TZ = dt.timezone(dt.timedelta(hours=7))
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                      # pr-mkt/
DATA = os.path.join(ROOT, 'data')


def load(name, default):
    p = os.path.join(DATA, name)
    if not os.path.exists(p):
        return default
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def save(name, obj, indent=1):
    with open(os.path.join(DATA, name), 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=indent)
        f.write('\n')


def now_vn():
    return dt.datetime.now(TZ)


def read_csv(path):
    if not os.path.exists(path):
        return []
    with open(path, encoding='utf-8') as f:
        return [{k.strip(): (v or '').strip() for k, v in r.items()} for r in csv.DictReader(f)]


def merge(indir, at=None):
    at = at or now_vn()
    stamp = at.strftime('%Y-%m-%dT%H:%M+07:00')
    chans = {c['h'] for c in load('channels.json', [])}
    V = load('videos.json', {})
    n_new = n_upd = 0
    for r in read_csv(os.path.join(indir, 'videos.csv')):
        i, h = r['id'], r['h']
        if h not in chans:
            print('! bỏ qua kênh lạ', h); continue
        ts = int(r['ts']) if r.get('ts') else (int(i) >> 32)
        v = V.get(i)
        if v is None:
            V[i] = v = dict(h=h, ts=ts, title=r.get('title') or 'Video', tag=False, failed=False, s=None, s_at=None); n_new += 1
        v['h'] = h; v['ts'] = ts
        if r.get('title'): v['title'] = r['title']
        if r.get('tag') != '': v['tag'] = r.get('tag') in ('1', 'true', 'True')
        if r.get('failed') != '': v['failed'] = r.get('failed') in ('1', 'true', 'True')
    for r in read_csv(os.path.join(indir, 'stats.csv')):
        v = V.get(r['id'])
        if v is None:
            print('! chưa có video', r['id'], '(thêm vào videos.csv trước)'); continue
        v['s'] = [int(float(r['views'] or 0))] + [(int(float(r[k])) if (r.get(k) or '') != '' else None) for k in ('likes', 'cmts', 'shares', 'saves')]  # trống = chưa có số (chỉ có view)
        v['s_at'] = stamp; n_upd += 1
    save('videos.json', V, indent=0)

    F = load('followers.json', {})
    day = at.strftime('%Y-%m-%d')
    fr = read_csv(os.path.join(indir, 'followers.csv'))
    for r in fr:
        if r['h'] in chans and r.get('followers'):
            F.setdefault(day, {})[r['h']] = int(float(r['followers']))
    save('followers.json', F)

    G = load('gmv.json', {})
    gr = read_csv(os.path.join(indir, 'gmv.csv'))
    for r in gr:
        G.setdefault(r['h'], {})[r['date']] = [int(float(r.get(k) or 0)) for k in ('gmv', 'video', 'live')]
    save('gmv.json', G, indent=0)
    print(f'merge: +{n_new} video mới, {n_upd} video có số mới, {len(fr)} followers, {len(gr)} dòng GMV')


def todo(days=8, at=None):
    at = at or now_vn()
    cut = (at - dt.timedelta(days=days)).timestamp()
    V = load('videos.json', {})
    for i, v in sorted(V.items(), key=lambda x: -x[1]['ts']):
        if v['ts'] >= cut:
            print(i, v['h'])


def build(asof=None):
    at = dt.datetime.fromisoformat(asof).replace(tzinfo=TZ) if asof else now_vn()
    today = at.strftime('%Y-%m-%d')
    chans = load('channels.json', [])
    V = load('videos.json', {})
    F = load('followers.json', {})
    G = load('gmv.json', {})
    S = load('status.json', {})
    days_f = sorted(d for d in F if d <= today)
    fcur = {}
    for d in days_f:
        fcur.update(F[d])
    prev = [d for d in days_f if d < today]
    base = prev[-1] if prev else None
    gmv_last = max((d for h in G.values() for d in h), default=None)
    month = today[:7]
    nowts = at.timestamp()
    vids, out = [], []
    for c in chans:
        h = c['h']
        mine = sorted(((i, v) for i, v in V.items() if v['h'] == h), key=lambda x: -x[1]['ts'])
        ts_list = [v['ts'] for _, v in mine if v['ts'] <= nowts]
        for i, v in mine:
            t = dt.datetime.fromtimestamp(v['ts'], TZ)
            vids.append(dict(h=h, id=i, d=t.strftime('%Y-%m-%d'), t=t.strftime('%H:%M'), title=v['title'], tag=bool(v['tag']), s=v['s']))
        d7 = (at - dt.timedelta(days=6)).strftime('%Y-%m-%d')
        f = fcur.get(h)
        f0 = F.get(base, {}).get(h) if base else None
        g = G.get(h)
        gm = [sum(x[k] for d, x in g.items() if d.startswith(month)) for k in range(3)] if g is not None else [None] * 3
        p7 = sum(1 for _, v in mine if dt.datetime.fromtimestamp(v['ts'], TZ).strftime('%Y-%m-%d') >= d7 and v['ts'] <= nowts)
        out.append(dict(
            h=h, d=c['d'], main=c.get('main', False), studio=c.get('studio', False), nobc=c.get('nobc', False),
            f=f, f0=f0, df=(f - f0) if (f is not None and f0 is not None) else None,
            p24=sum(1 for t in ts_list if nowts - t <= 86400), p7=p7,
            hs=round((nowts - ts_list[0]) / 3600, 1) if ts_list else 999,
            since=dt.datetime.fromtimestamp(mine[-1][1]['ts'], TZ).strftime('%Y-%m-%d') if mine else None,
            gmv=gm[0], video=gm[1], live=gm[2],
            tier=S.get('tier', {}).get(h), stage=S.get('stage', {}).get(h),
            vio=S.get('vio', {}).get(h, []), vioOk=S.get('vioOk', {}).get(h)))
    gmvd = {h: x for h, x in G.items()}
    dmin = min([v['d'] for v in vids] + [d for x in G.values() for d in x] + [today])
    data = dict(vids=vids, gmvd=gmvd, gmvLast=gmv_last, today=today, base=base, dmin=max(dmin, (at - dt.timedelta(days=60)).strftime('%Y-%m-%d')),
                monthStart=month + '-01', asof=at.strftime('%H:%M %d/%m/%Y'), kpi=5000, channels=out, alerts=S.get('alerts', []))
    js = json.dumps(data, ensure_ascii=False).replace('</', '<\\/')
    tpl = open(os.path.join(HERE, 'template.html'), encoding='utf-8').read()
    art = tpl.replace('/*DATA*/null', js)
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    open(os.path.join(HERE, 'out', 'artifact.html'), 'w', encoding='utf-8').write(art)
    open(os.path.join(ROOT, 'detail.html'), 'w', encoding='utf-8').write(public(art))
    print(f'build: {len(vids)} video, {len(out)} kênh, mốc followers {base}→{today}, GMV đến {gmv_last}')


def public(s):
    s = s.replace('<meta name="viewport"', '<meta name="robots" content="noindex">\n<meta name="viewport"', 1)
    h1 = '<h1>Hannah Team · Channel Monitor</h1>'   # link quay về trang app (pr-mkt/index.html)
    assert h1 in s
    s = s.replace(h1, '<a href="./" style="display:inline-block;margin-bottom:6px;color:inherit;opacity:.75;font-size:13px;font-weight:600;text-decoration:none">← Về app</a>\n    ' + h1, 1)
    old = '  const all=[...SYS.map(a=>({...a,sys:true})),...custom].filter(a=>!a.ch||F.ch.includes(a.ch));'
    pub = ('  if(!window.claude){const all=[...SYS,...custom].filter(a=>!a.ch||F.ch.includes(a.ch));$("#taskmeta").textContent=all.length+" việc";'
           'const box=$("#tasks");box.innerHTML="";for(const a of all){const el=document.createElement("div");el.className="task";'
           'const col=a.sev==="bad"?"var(--bad)":a.sev==="warn"?"var(--warn)":a.sev==="info"?"var(--ok)":"var(--c2)";'
           'el.innerHTML=`<span class="sev" style="background:${col}"></span><div><div class="t"></div><div class="x"></div></div>`;'
           'el.querySelector(".t").textContent=a.title;el.querySelector(".x").textContent=(a.ch?"@"+a.ch+" · ":"")+(a.detail||"");box.append(el)}'
           'const kt=$("#kpitask");if(kt)kt.innerHTML=`<div><div class="l">Việc cần xử lý</div><div class="v num" style="color:var(--warn)">${all.length}</div><div class="d">giao việc trên bản Claude</div></div>`;return}\n')
    assert old in s
    s = s.replace(old, pub + old)
    o2 = '  if(!window.claude||!claude.use){$("#tasknote").textContent="Mở trang trên claude.ai để giao việc cho nhân viên.";return}'
    n2 = ('  if(!window.claude||!claude.use){$("#tasknote").innerHTML=\'Bản xem công khai: không giao việc được ở đây. Giao việc, đổi trạng thái và gửi email trên '
          '<a href="https://claude.ai/artifact/DChafwxGYuqzwDhGCdTCLd" target="_blank" rel="noopener">bản dashboard trên Claude</a>.\';return}')
    assert o2 in s
    return s.replace(o2, n2)


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a:
        print(__doc__); sys.exit(1)
    if a[0] == 'merge':
        merge(a[1])
    elif a[0] == 'build':
        build(a[a.index('--asof') + 1] if '--asof' in a else None)
    elif a[0] == 'todo':
        todo(int(a[a.index('--days') + 1]) if '--days' in a else 8)
