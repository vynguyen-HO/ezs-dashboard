"""Brand Deal Watch: so giá deal brand (Shopee Mall / TikTok Shop / Website) với deal list Hannah.

Input (tools/deal-watch/data/, không commit):
  hannah.json  : DL_T11!A2:L raw values [[STT, type, _, brand, product, variant, gia_goc, gia_qua, goc+qua, gia_web_hannah, %, kho], ...]
  scanned.json : [{"stt": "5", "channel": "shopee|tiktok|web", "title": "...", "price": 543000,
                   "list_price": 622000, "url": "...", "gift": "Free Gift", "scanned_at": "ISO"}]
Output (deal/watch/, commit để v2 › Deal Compare đọc):
  status.json   : trạng thái agent (bảng Office) + số deal vi phạm
  warnings.json : danh sách deal brand ngang/tốt hơn Hannah

python compare.py --start      -> đánh dấu agent đang làm việc
python compare.py --brands "SVR, PHYSIOGEL"  -> chạy so sánh, đánh dấu xong lượt (brands = brand vừa scan)
python compare.py --selftest   -> tự kiểm tra logic
"""
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

HERE = Path(__file__).parent
DATA = HERE / "data"
OUT = HERE.parent.parent / "deal" / "watch"
NEAR = 0.03  # brand đắt hơn Hannah chưa tới 3% vẫn coi là "ngang"
SCHEDULE = list(range(8, 23, 2))  # giờ chạy, khớp cron 0 8-22/2 * * *


def money(v):
    s = str(v).replace(",", "").replace(".", "").replace("₫", "").strip()
    return int(s) if s.isdigit() else None


def load_hannah(rows):
    deals = {}
    for r in rows:
        r = list(r) + [""] * (12 - len(r))
        price = money(r[9])
        if r[0] and r[3] and price:
            deals[str(r[0]).strip()] = {"brand": r[3].strip(), "product": r[4].strip(),
                                        "hannah_price": price, "gift_value": money(r[7]) or 0}
    return deals


def compare(deals, scanned):
    out = []
    for s in scanned:
        d = deals.get(str(s.get("stt", "")).strip())
        price = money(s.get("price"))
        if not d or not price:
            continue
        hp = d["hannah_price"]
        diff = (price - hp) / hp
        if price < hp:
            level = "TỐT HƠN"
        elif diff <= NEAR:
            level = "NGANG"
        else:
            continue
        out.append({**d, **s, "price": price, "level": level, "diff_pct": round(diff * 100, 1)})
    return sorted(out, key=lambda w: w["diff_pct"])


def next_run(now):
    for h in SCHEDULE:
        t = now.replace(hour=h, minute=0, second=0, microsecond=0)
        if t > now:
            return t
    return (now + timedelta(days=1)).replace(hour=SCHEDULE[0], minute=0, second=0, microsecond=0)


def iso(t):
    return t.isoformat(timespec="seconds")


def write_json(name, obj):
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")


def read_status():
    try:
        return json.loads((OUT / "status.json").read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return {}


def start():
    now = datetime.now().astimezone()
    write_json("status.json", {**read_status(), "state": "working", "started_at": iso(now), "schedule": SCHEDULE})
    print("status: working")


def finish(brands):
    deals = load_hannah(json.loads((DATA / "hannah.json").read_text(encoding="utf-8")))
    scanned = json.loads((DATA / "scanned.json").read_text(encoding="utf-8"))
    warnings = compare(deals, scanned)
    now = datetime.now().astimezone()
    write_json("warnings.json", warnings)
    write_json("status.json", {**read_status(), "state": "idle", "finished_at": iso(now),
                               "next_run": iso(next_run(now)), "schedule": SCHEDULE, "brands": brands,
                               "deals": len(deals), "scanned": len(scanned), "violations": len(warnings),
                               "better": sum(w["level"] == "TỐT HƠN" for w in warnings),
                               "near": sum(w["level"] == "NGANG" for w in warnings)})
    print(f"{len(warnings)} warning / {len(scanned)} scanned / {len(deals)} deal Hannah")
    for w in warnings:
        print(f"  [{w['level']}] {w['brand']} | {w['product'][:60]} | {w['channel']} {w['price']:,} vs Hannah {w['hannah_price']:,}")


def selftest():
    deals = load_hannah([["5", "BAU", "", "SVR", "Gel 400ml", "Default", "622,000", "470,000", "", "572,000"],
                         ["6", "", "", "SVR", "Combo", "", "", "", "", "1,144,000"],
                         ["7", "", "", "SVR", "Tẩy trang", "", "", "", "", "996,000"],
                         ["", "", "", "X", "thiếu STT", "", "", "", "", "100"]])
    assert set(deals) == {"5", "6", "7"} and deals["5"]["gift_value"] == 470000
    w = compare(deals, [{"stt": "5", "channel": "shopee", "price": "543.000 ₫"},  # rẻ hơn
                        {"stt": "6", "channel": "tiktok", "price": 1170000},       # +2.3% -> ngang
                        {"stt": "7", "channel": "web", "price": 1100000},          # đắt hơn -> bỏ
                        {"stt": "99", "channel": "web", "price": 1}])              # không map -> bỏ
    assert [(x["stt"], x["level"]) for x in w] == [("5", "TỐT HƠN"), ("6", "NGANG")], w
    t = datetime(2026, 11, 20, 9, 30)
    assert next_run(t).hour == 10 and next_run(t.replace(hour=22, minute=5)) == datetime(2026, 11, 21, 8)
    print("selftest OK")


if __name__ == "__main__":
    a = sys.argv[1:]
    if "--selftest" in a:
        selftest()
    elif "--start" in a:
        start()
    else:
        finish([b.strip() for b in a[a.index("--brands") + 1].split(",")] if "--brands" in a else [])
