"""Brand Deal Watch: Scanner + QC so deal brand (Shopee Mall / TikTok Shop / Website) với deal list Hannah.

Luồng: Scanner (AGENT.md) -> candidates -> QC (QC.md) xác nhận -> chỉ deal QC "confirmed" mới lên dashboard.

Data (tools/deal-watch/data/, KHÔNG commit):
  hannah.json     DL_T11!A2:L raw [[STT, type, _, brand, product, variant, gia_goc, gia_qua, goc+qua, gia_web_hannah, %, kho], ...]
  scanned.json    Scanner ghi: [{"stt","channel","title","price","list_price","gift_items","gift_value",
                                 "url","image","match":"sure|unsure","scanned_at"}]
  candidates.json deal nghi vi phạm, chờ QC (compare.py ghi)
  qc.json         QC ghi verdict: [{"stt","channel","url","price","gift_value","verdict":"confirmed|rejected",
                                     "reason","checked_at"}]  (price/gift_value = số QC kiểm lại trên trang)
  mappings.json   QC ghi: {"<url>": {"stt": "5", "ok": true|false, "note": "..."}} -> Scanner dùng lại / tránh
  lessons.md      QC ghi bài học (cách nhận diện SP, quà, shop) -> Scanner + QC đọc trước mỗi lượt
  state.json      {"BRAND": "ISO scan gần nhất"}
Output (deal/watch/, commit): status.json (bảng Office 2 agent), warnings.json (deal đã QC xác nhận)

python compare.py --plan                 in danh sách brand x kênh cần scan lượt này
python compare.py --start scanner|qc     đánh dấu agent đang làm việc
python compare.py --brands "SVR, ..."    Scanner xong: tính candidates
python compare.py --qc-finish            QC xong: ghi warnings.json từ verdict confirmed
python compare.py --selftest
"""
import csv
import json
import re
import sys
import unicodedata
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
DATA = HERE / "data"
OUT = ROOT / "deal" / "watch"
NEAR = 0.03          # giá brand đắt hơn Hannah dưới 3% vẫn là "ngang"
NEAR_SAVING = 0.02   # % saving brand thấp hơn Hannah dưới 2pp vẫn là "ngang"
TOP_N = 5            # top brand mỗi kênh, scan mọi lượt
ROTATE_N = 5         # brand còn lại xoay vòng mỗi lượt
FRESH_H = 48         # warning cũ hơn 48h không hiện nữa
SCHEDULE = {"scanner": list(range(8, 23, 2)), "qc": list(range(9, 24, 2))}  # khớp 2 cron


def money(v):
    s = str(v if v is not None else "").replace(",", "").replace(".", "").replace("₫", "").strip()
    return int(s) if s.isdigit() else None


def bkey(s):
    s = unicodedata.normalize("NFD", str(s)).encode("ascii", "ignore").decode().upper()
    return re.sub(r"^THE", "", re.sub(r"[^A-Z0-9]", "", s))


def rj(name, default):
    try:
        return json.loads((DATA / name).read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return default


def wj(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")


def load_hannah(rows):
    deals = {}
    for r in rows:
        r = list(r) + [""] * (12 - len(r))
        price = money(r[9])
        if r[0] and r[3] and price:
            base, gift = money(r[6]) or price, money(r[7]) or 0
            deals[str(r[0]).strip()] = {"brand": r[3].strip(), "product": r[4].strip(), "hannah_price": price,
                                        "gift_value": gift, "hannah_saving": 1 - price / (base + gift)}
    return deals


def judge(d, s):
    """So 1 SP brand với deal Hannah: giá thấp hơn, hoặc % saving (tính cả quà) cao hơn."""
    price = money(s.get("price"))
    if not price:
        return None
    hp = d["hannah_price"]
    base = money(s.get("list_price")) or price
    saving = 1 - price / (base + (money(s.get("gift_value")) or 0))
    why = []
    if price < hp:
        why.append("giá thấp hơn")
    if saving > d["hannah_saving"]:
        why.append("saving gồm quà cao hơn")
    level = "TỐT HƠN" if why else None
    if not why:
        if price <= hp * (1 + NEAR):
            why.append("giá ngang")
        if saving >= d["hannah_saving"] - NEAR_SAVING:
            why.append("saving ngang")
        level = "NGANG" if why else None
    if not level:
        return None
    return {**d, **s, "price": price, "level": level, "why": ", ".join(why),
            "diff_pct": round((price - hp) / hp * 100, 1), "brand_saving": round(saving * 100, 1),
            "hannah_saving_pct": round(d["hannah_saving"] * 100, 1)}


def key(x):
    return (str(x.get("stt")), x.get("channel"), x.get("url"))


def candidates(deals, scanned, verdicts, mappings):
    qc_at = {}
    for v in verdicts:
        qc_at[key(v)] = max(qc_at.get(key(v), ""), v.get("checked_at", ""))
    out = []
    for s in scanned:
        d = deals.get(str(s.get("stt", "")).strip())
        m = mappings.get(s.get("url") or "")
        if not d or (m and not m.get("ok") and str(m.get("stt")) == str(s.get("stt"))):
            continue  # QC đã nói URL này không phải deal đó
        if key(s) in qc_at and qc_at[key(s)] >= s.get("scanned_at", ""):
            continue  # QC đã kiểm sau lần scan này (ISO cùng múi giờ so chuỗi được)
        j = judge(d, s)
        if j:
            out.append(j)
    return sorted(out, key=lambda w: w["diff_pct"])


def confirmed(deals, verdicts, now):
    latest = {}
    for v in verdicts:  # verdict mới nhất cho mỗi (stt, channel)
        latest[(str(v["stt"]), v["channel"])] = v
    out = []
    for v in latest.values():
        d = deals.get(str(v["stt"]))
        if not d or v.get("verdict") != "confirmed":
            continue
        if now - datetime.fromisoformat(v["checked_at"]) > timedelta(hours=FRESH_H):
            continue
        j = judge(d, v)
        if j:
            out.append(j)
    return sorted(out, key=lambda w: w["diff_pct"])


def top_brands(since):
    """GMV 30 ngày theo brand mỗi kênh, từ data của repo (Shopee affiliate, TikTok creator, Scom)."""
    g = {"shopee": Counter(), "tiktok": Counter(), "web": Counter()}
    for r in csv.DictReader(open(ROOT / "shopee/data/aff_brand_daily.csv", encoding="utf-8")):
        if r["date"] >= since:
            g["shopee"][bkey(r["brand"])] += float(r["aff_gmv"] or 0)
    brand_of = {r["product_id"]: bkey(r["brand"]) for r in csv.DictReader(open(ROOT / "tiktok/data/products.csv", encoding="utf-8"))}
    for r in csv.DictReader(open(ROOT / "tiktok/data/product_daily.csv", encoding="utf-8")):
        if r["date"] >= since and r["product_id"] in brand_of:
            g["tiktok"][brand_of[r["product_id"]]] += float(r["gmv"] or 0)
    for r in csv.DictReader(open(ROOT / "website/data/web_sku_daily.csv", encoding="utf-8")):
        if r["date"] >= since:
            g["web"][bkey(r["brand"])] += float(r["gmv"] or 0) - float(r["cancel_gmv"] or 0)
    return g


def plan(deal_brands, gmv, state, now):
    """Top TOP_N brand (có trong deal list) mỗi kênh + ROTATE_N brand scan lâu nhất (cả 3 kênh)."""
    names = {bkey(b): b for b in deal_brands}
    pairs = []
    for ch, c in gmv.items():
        pairs += [(names[k], ch, "top") for k, _ in c.most_common() if k in names][:TOP_N]
    tops = {p[0] for p in pairs}
    rest = sorted((b for b in names.values() if b not in tops), key=lambda b: state.get(b, ""))[:ROTATE_N]
    return pairs + [(b, ch, "xoay vòng") for b in rest for ch in gmv]


def read_status():
    try:
        return json.loads((OUT / "status.json").read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return {}


def next_run(now, hours):
    for h in hours:
        t = now.replace(hour=h, minute=0, second=0, microsecond=0)
        if t > now:
            return t
    return (now + timedelta(days=1)).replace(hour=hours[0], minute=0, second=0, microsecond=0)


def set_agent(name, **kw):
    st = {k: v for k, v in read_status().items() if k in ("agents", "violations", "better", "near", "deals", "scanned")}
    st.setdefault("agents", {}).setdefault(name, {}).update(kw, schedule=SCHEDULE[name])
    st.update({k: v for k, v in kw.items() if k in ("violations", "better", "near", "deals", "scanned")})
    wj(OUT / "status.json", st)


def iso(t):
    return t.isoformat(timespec="seconds")


def main(a):
    now = datetime.now().astimezone()
    deals = load_hannah(rj("hannah.json", []))
    if "--plan" in a:
        for b, ch, why in plan({d["brand"] for d in deals.values()}, top_brands((now - timedelta(30)).date().isoformat()), rj("state.json", {}), now):
            print(f"{b}\t{ch}\t{why}")
    elif "--start" in a:
        name = a[a.index("--start") + 1]
        set_agent(name, state="working", started_at=iso(now))
        print(f"{name}: working")
    elif "--qc-finish" in a:
        w = confirmed(deals, rj("qc.json", []), now)
        wj(OUT / "warnings.json", w)
        left = candidates(deals, rj("scanned.json", []), rj("qc.json", []), rj("mappings.json", {}))
        set_agent("qc", state="idle", finished_at=iso(now), next_run=iso(next_run(now, SCHEDULE["qc"])),
                  pending=len(left), violations=len(w), better=sum(x["level"] == "TỐT HƠN" for x in w),
                  near=sum(x["level"] == "NGANG" for x in w))
        print(f"QC: {len(w)} deal vi phạm đã xác nhận, còn {len(left)} chờ QC")
        for x in w:
            print(f"  [{x['level']}] {x['brand']} | {x['product'][:55]} | {x['channel']} {x['price']:,} vs {x['hannah_price']:,} ({x['why']})")
    else:
        brands = [b.strip() for b in a[a.index("--brands") + 1].split(",")] if "--brands" in a else []
        scanned = rj("scanned.json", [])
        c = candidates(deals, scanned, rj("qc.json", []), rj("mappings.json", {}))
        wj(DATA / "candidates.json", c)
        st = rj("state.json", {})
        wj(DATA / "state.json", {**st, **{b: iso(now) for b in brands}})
        set_agent("scanner", state="idle", finished_at=iso(now), next_run=iso(next_run(now, SCHEDULE["scanner"])),
                  brands=brands, pending=len(c), deals=len(deals), scanned=len(scanned))
        print(f"Scanner: {len(c)} deal nghi vi phạm chờ QC / {len(scanned)} SP brand / {len(deals)} deal Hannah")
        for x in c:
            print(f"  [{x['level']}] {x['brand']} | {x['product'][:55]} | {x['channel']} {x['price']:,} vs {x['hannah_price']:,} ({x['why']}) {x.get('url', '')}")


def selftest():
    deals = load_hannah([["5", "BAU", "", "SVR", "Gel 400ml", "Default", "622,000", "470,000", "", "572,000"],
                         ["6", "", "", "SVR", "Combo", "", "1,244,000", "870,000", "", "1,144,000"],
                         ["7", "", "", "SVR", "Tẩy trang", "", "1,048,000", "0", "", "996,000"],
                         ["", "", "", "X", "thiếu STT", "", "", "", "", "100"]])
    assert set(deals) == {"5", "6", "7"} and round(deals["5"]["hannah_saving"], 3) == 0.476
    sc = [{"stt": "5", "channel": "shopee", "url": "u5", "price": "543.000 ₫", "list_price": 622000,
           "scanned_at": "2026-11-20T08:00:00+07:00"},                                                    # giá thấp hơn
          {"stt": "6", "channel": "tiktok", "url": "u6", "price": 1170000, "list_price": 1244000},        # +2.3% -> ngang
          {"stt": "7", "channel": "web", "url": "u7", "price": 1100000, "list_price": 1048000,
           "gift_value": 1200000},                                                                        # đắt hơn nhưng quà lớn -> tốt hơn
          {"stt": "7", "channel": "shopee", "url": "u7b", "price": 1100000, "list_price": 1048000},       # đắt hơn, không quà -> bỏ
          {"stt": "99", "channel": "web", "url": "x", "price": 1}]                                        # không map -> bỏ
    c = candidates(deals, sc, [], {})
    assert [(x["stt"], x["level"]) for x in c] == [("5", "TỐT HƠN"), ("6", "NGANG"), ("7", "TỐT HƠN")], c
    assert "quà" in c[2]["why"]
    # QC đã xem u5 -> không hỏi lại; mapping sai -> bỏ u6
    now = datetime(2026, 11, 20, 10, tzinfo=datetime.now().astimezone().tzinfo)
    v = [{**sc[0], "price": 570000, "verdict": "confirmed", "checked_at": iso(now)},  # QC thấy giá đã đổi
         {**sc[2], "verdict": "rejected", "reason": "khác dung tích", "checked_at": iso(now)}]
    c2 = candidates(deals, sc, v, {"u6": {"stt": "6", "ok": False}})
    assert [x["stt"] for x in c2] == [], c2
    rescan = [{**sc[0], "scanned_at": "2026-11-20T12:00:00+07:00"}]  # scan lại sau QC -> QC lại
    assert [x["stt"] for x in candidates(deals, rescan, v, {})] == ["5"]
    w = confirmed(deals, v, now)
    assert [x["stt"] for x in w] == ["5"] and confirmed(deals, v, now + timedelta(hours=49)) == []
    # plan: top theo GMV mỗi kênh + xoay vòng
    from collections import Counter as C
    p = plan({"SVR", "D'ALBA", "BIFINA", "OBAGI"}, {"shopee": C({"DALBA": 9, "OBAGI": 5, "NOTINDEAL": 99}), "tiktok": C(), "web": C({"SVR": 1})},
             {"BIFINA": "2026-11-01"}, now)
    assert ("D'ALBA", "shopee", "top") in p and ("SVR", "web", "top") in p and ("BIFINA", "tiktok", "xoay vòng") in p
    assert not any(b == "NOTINDEAL" for b, _, _ in p)
    assert next_run(now.replace(hour=22, minute=5), SCHEDULE["scanner"]).hour == 8
    print("selftest OK")


if __name__ == "__main__":
    selftest() if "--selftest" in sys.argv else main(sys.argv[1:])
