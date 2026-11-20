# Deal Compare 3 kênh — source

Trang `deal/index.html` (hiện trong **v2 › Analytics › Deal Compare**, nhúng iframe) được build từ thư mục này.

## File

| File | Vai trò |
|---|---|
| `core.js` | Logic dùng chung trang + test Node: đọc sheet theo tên cột, map barcode (Item ID/PID từ TOTAL SKU, fallback so tên), % saving, PFM, forecast, score, MoM + alert, summary theo barcode |
| `head.part`, `app.part` | CSS + giao diện 4 tab (Summary / Scom / Shopee / TikTok), panel update data, MoM, thumbnail |
| `thumbs.js`, `cutout.py` | Ảnh sản phẩm tách nền, nền trắng, theo barcode (chung 3 kênh) → `deal/thumbs/` |
| `rebuild.js` | Tạo `baseline.json` + `bcinfo.json` từ dump sheet trong `data/` |
| `assemble.py` | Ghép thành HTML. `--public` → `../../deal/index.html` (xoá link sheet, noindex) |
| `total_sku.py` (+ `build.py` dùng chung hàm) | Tạo file **TOTAL SKU** (barcode Scom + Item ID Shopee + PID TikTok mới nhất, tạo barcode mới theo quy tắc SKU TRACKING) |

## Build lại

1. Dump các sheet (Sheets API `values.get`, JSON `{range, values}`) vào `tools/deal/data/` — **không commit thư mục này**:
   `total.json` (TOTAL SKU), `scom.json`, `shp.json`, `tts.json` (deal list), `pfm_scom.json`, `pfm_shp.json`, `pfm_tts.json`.
2. `node rebuild.js` → `baseline.json`, `bcinfo.json`
3. Ảnh: `node thumbs.js` (nguồn ảnh theo barcode: ảnh tách nền Drive trong deal list Shopee/TikTok, ảnh hannaholala.com) → `python3 cutout.py` (tải, tách nền bằng rembg, giữ SP chính, nền trắng 128px → `deal/thumbs/<key>.webp`, chung 3 kênh theo barcode). SP không có trên web: thêm link ảnh tìm trên Google/web brand vào `thumbs_extra.json` `{key: [url]}` rồi chạy lại `cutout.py` (chỉ xử lý key chưa có ảnh). Cần `pip install "rembg[cpu]" pillow scipy`.
4. `python3 assemble.py --public` → cập nhật `deal/index.html`
5. Commit: `[deal] rebuild baseline dd/mm`

## Bản đầy đủ vs bản trên repo

- **Claude Artifact gốc** (`python3 assemble.py` → publish): có update data từ Google Sheet, snapshot dùng chung, MoM + alert (saving giảm ≥2pp, stock giảm ≥30%/hết, deal biến mất), thumbnail. Cần runtime của claude.ai (`window.claude.use`).
- **GitHub Pages**: không có runtime đó → tự rơi về chế độ chỉ xem baseline. Link sheet bị xoá vì repo public.

## Lưu ý

Repo public: baseline chứa giá deal + GMV theo SKU. Không đẩy file dump sheet, token hay link sheet nội bộ.
