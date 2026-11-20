# Deal Compare 3 kênh — source

Trang `deal/index.html` (hiện trong **v2 › Analytics › Deal Compare**, nhúng iframe) được build từ thư mục này.

## File

| File | Vai trò |
|---|---|
| `core.js` | Logic dùng chung trang + test Node: đọc sheet theo tên cột, map barcode (Item ID/PID từ TOTAL SKU, fallback so tên), % saving, PFM, forecast, score, MoM + alert, summary theo barcode |
| `head.part`, `app.part` | CSS + giao diện 4 tab (Summary / Scom / Shopee / TikTok), panel update data, MoM, thumbnail |
| `thumbs.js`, `pick_white.py` | Ảnh sản phẩm theo barcode (chung 3 kênh), chỉ giữ ảnh nền trắng |
| `rebuild.js` | Tạo `baseline.json` + `bcinfo.json` từ dump sheet trong `data/` |
| `assemble.py` | Ghép thành HTML. `--public` → `../../deal/index.html` (xoá link sheet, noindex) |
| `total_sku.py` (+ `build.py` dùng chung hàm) | Tạo file **TOTAL SKU** (barcode Scom + Item ID Shopee + PID TikTok mới nhất, tạo barcode mới theo quy tắc SKU TRACKING) |

## Build lại

1. Dump các sheet (Sheets API `values.get`, JSON `{range, values}`) vào `tools/deal/data/` — **không commit thư mục này**:
   `total.json` (TOTAL SKU), `scom.json`, `shp.json`, `tts.json` (deal list), `pfm_scom.json`, `pfm_shp.json`, `pfm_tts.json`.
2. `node rebuild.js` → `baseline.json`, `bcinfo.json`
3. Ảnh: `node thumbs.js` rồi `python3 pick_white.py` (cần Pillow) → `thumbs.json` (barcode → ảnh, chung 3 kênh). Chỉ giữ ảnh nền trắng: ảnh tách nền trên Drive (cột "Link hình ảnh sản phẩm chính tách nền" trong deal list Shopee/TikTok, file phải chia sẻ công khai) hoặc ảnh nền trắng trên hannaholala.com. Barcode không có ảnh thì ô hiện tên brand.
4. `python3 assemble.py --public` → cập nhật `deal/index.html`
5. Commit: `[deal] rebuild baseline dd/mm`

## Bản đầy đủ vs bản trên repo

- **Claude Artifact gốc** (`python3 assemble.py` → publish): có update data từ Google Sheet, snapshot dùng chung, MoM + alert (saving giảm ≥2pp, stock giảm ≥30%/hết, deal biến mất), thumbnail. Cần runtime của claude.ai (`window.claude.use`).
- **GitHub Pages**: không có runtime đó → tự rơi về chế độ chỉ xem baseline. Link sheet bị xoá vì repo public.

## Lưu ý

Repo public: baseline chứa giá deal + GMV theo SKU. Không đẩy file dump sheet, token hay link sheet nội bộ.
