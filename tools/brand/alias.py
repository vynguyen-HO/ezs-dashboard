#!/usr/bin/env python3
"""Gộp brand trùng tên giữa Shopee / TikTok / Scom.

Nguồn: tools/brand/brand_alias.csv (alias_key,brand_key,ten_chuan)
  alias_key  brand key của tên biến thể (key = tên bỏ dấu, bỏ ký tự lạ, bỏ "THE" đầu, bỏ đuôi Official/Store/Vietnam/...;
             xem bk() trong v2/app.js và tools/category/build.py). Trống = dòng chỉ đặt tên hiển thị cho brand_key.
  brand_key  key chuẩn mà biến thể gộp vào
  ten_chuan  tên hiển thị trên dashboard cho brand_key (một dòng có là đủ)
Chạy sau khi sửa CSV: python3 tools/brand/alias.py  -> ghi v2/brand_alias.js (dashboard nạp trước app.js)
"""
import csv, json, os

R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(R, 'tools/brand/brand_alias.csv')


def load():
    alias, name = {}, {}
    with open(SRC, newline='', encoding='utf-8-sig') as f:
        for r in csv.DictReader(f):
            a, b, n = r['alias_key'].strip(), r['brand_key'].strip(), r['ten_chuan'].strip()
            if a and a != b: alias[a] = b
            if n: name[b] = n
    return alias, name


if __name__ == '__main__':
    A, N = load()
    out = os.path.join(R, 'v2/brand_alias.js')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('/* sinh từ tools/brand/brand_alias.csv bằng tools/brand/alias.py — đừng sửa tay */\n')
        f.write('const BALIAS=' + json.dumps(A, ensure_ascii=False, sort_keys=True) + ';\n')
        f.write('const BNAME=' + json.dumps(N, ensure_ascii=False, sort_keys=True) + ';\n')
    print(f'{len(A)} alias, {len(N)} tên chuẩn -> {out}')
