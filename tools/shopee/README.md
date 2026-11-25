# Cập nhật dữ liệu PFM Shopee (trang /shopee/, /shopee/detail.html và dashboard claude.ai)

Chạy mỗi sáng sau 10h (sheet GMV_Historical tự cập nhật lúc ~10h01).

## Nguồn
| Kênh | acc | Chrome (Claude in Chrome) | Seller Center | Affiliate |
|---|---|---|---|---|
| HO | `HO` | trình duyệt đăng nhập **hannahteam1** (shop hannaholala) | banhang.shopee.vn/creator-center/insight/live/product-list | affiliate.shopee.vn/report/conversion_report |
| Hannah Team | `HT` | trình duyệt đăng nhập **olalamedia2** (shop hannaholala.live) | như trên | như trên |
| MCN hannahteam2 | `hannahteam2` | trình duyệt đăng nhập **hannahteam2** | như trên | như trên |
| MCN hannahteam3 | `hannahteam3` | trình duyệt đăng nhập **hannahteam3** | như trên | như trên |

`acc` là nhãn ghi vào cột `acc` của `sku_daily.csv` / `aff_brand_daily.csv`. Dashboard v2 đổi nhãn sang ID kênh live (HO → hannahteam1, HT → olalamedia2, nhãn khác giữ nguyên) cho bộ lọc "ID kênh"; mọi acc khác `HO` tính là MCN. Thêm ID mới: dùng chính username làm acc (từ 20/11/2026 có hannahteam2, hannahteam3, số từ 01/10/2026).

Mỗi Chrome là một máy/profile khác nhau trong `list_connected_browsers`; nhận ra đúng kênh bằng `user` mà script trả về.

Sheet: `GMV_Historical_HannahOlala` (id `1tQYA095MUFr8uRLVg2mt-F2EDqdzDV1IE2vIDkQNB08`), tab `GMV_Data!A1:L40` và `Daily_History!A1:E1000`.

## Các bước
1. `FROM` = hôm qua − 9 ngày, `TO` = hôm qua (kéo lại 10 ngày để cập nhật trạng thái đơn).
2. Với mỗi kênh, trong Chrome của kênh đó:
   - Mở tab product-list (đợi tải xong), dán nội dung `pull_creator.js` bằng javascript_tool, gọi `await shpPullCreator({acc, from: FROM, to: TO})`. Kiểm tra `user` đúng kênh. Chờ `window.__shp.done === 1` rồi gọi `shpDownloadCreator()` → `~/Downloads/<acc>_lv_<TO>.csv`.
   - Mở tab conversion_report, dán `pull_affiliate.js`, gọi `shpPullAffiliate({acc, from: FROM, to: TO})`, chờ `window.__shpa.done === 1`, gọi `shpDownloadAffiliate()` → `~/Downloads/<acc>_aff_<TO>.csv`. Kiểm tra `user` đúng kênh và `errors` = 0.
   - Nếu trang chuyển về trang đăng nhập: dừng, báo người dùng đăng nhập lại (không tự đăng nhập).
3. Đọc 2 range của sheet, lưu nguyên câu trả lời JSON thành `gmv_data.json` và `daily.json`.
4. Chạy trên Mac (cần pandas: dùng `~/.venvs/ezs/bin/python`, tạo bằng `python3 -m venv ~/.venvs/ezs && ~/.venvs/ezs/bin/pip install pandas`), file lấy thẳng từ `~/Downloads`:
   `~/.venvs/ezs/bin/python tools/shopee/update.py --data shopee/data --lv HO=... --lv HT=... --aff HO=... --aff HT=... --sheet-gmv gmv_data.json --sheet-daily daily.json`
   Đọc kỹ phần in ra: tổng 5 sub-channel phải khớp số Shopee trong sheet, không có dòng CẢNH BÁO.
5. Đặt `window.SHP_VERSION` trong `shopee/detail.html` thành ngày chạy, commit `shopee/data`, `shopee/detail.html`, `tools/shopee/shop_brand.csv`, push lên `main`. Trang app `shopee/index.html` (+ `shopee/mobile.js`) đọc thẳng các CSV trong `shopee/data` (tự chống cache bằng `?v=<thời điểm tải>`), không cần sửa gì.
6. Dashboard claude.ai (https://claude.ai/artifact/5fsWr4NtQDfiREVsJJBb7L): tải từng file trong `shopee/data` lên làm asset (Artifact publish `asset: true`, mỗi CSV một lần gọi), rồi ArtifactData `update` datasets tương ứng (`sku_daily` ← sku_daily.csv, `items`, `aff_brand_daily`, `shp_monthly`, `shp_month_plan`, `shp_daily`, `shp_mtd`) với `source.url` mới, `source.name`, `updated {at, by}` và ngày trong `description`.

## Lưu ý
- `live_overview_daily.csv` (date, acc, placed, my_placed, orders, confirmed): tổng GMV live chính thức mỗi ngày của Creator Center (`/api/supply/lm/sellercenter/overview/v3`). Danh sách sản phẩm của Creator Center chỉ trả tối đa 1.000 sản phẩm / ngày (cắt trước khi sắp xếp, lọc tên cũng chỉ trong 1.000 đó), nên ngày có phiên quá 1.000 sản phẩm bị thiếu (vd 09/11/2026 olalamedia2 megalive thiếu 16,26 tỷ). `pull_creator.js` lấy thêm dòng `O` (tổng ngày) trong file `_lv_`, update.py ghi vào file này và báo ngày nào thiếu; dashboard cộng phần thiếu thành dòng "Chưa phân bổ brand". Danh sách sản phẩm đầy đủ theo phiên có ở `creator.shopee.vn/supply/api/lm/sellercenter/realtime/dashboard/productList?sessionId=…` nhưng danh sách phiên (`realtime/sessionList`) chỉ giữ vài phiên gần nhất.
- Creator Center ghi cả phiên live vào ngày bắt đầu phiên (megalive 09/11 kéo dài tới 12/11 vẫn tính hết vào 09/11); Affiliate tính theo ngày đặt đơn.
- `aff_src_daily.csv`: Affiliate theo nguồn (`src` live / video / other, từ referrer của báo cáo Affiliate) cho bộ lọc Live / Video; update.py tự ghi từ các file `--aff`, ghép lại tay: `tools/shopee/aff_src.py --data shopee/data --scan ~/Downloads`. Có từ 11/10/2026 (HO, HT), 01/10/2026 (hannahteam2/3).
- `aff_brand_daily.csv`: `aff_gmv` = NMV = tổng `actual_amount` (đơn huỷ có actual_amount 0), `aff_gmv_placed` = NMV + `refunded_amount` (giá trị đơn huỷ / hoàn). Từ 25/11/2026: đơn có `display_order_status` 3 nhưng trạng thái COMPLETED / PAID (bị từ chối hoa hồng, is_fraud, brand không trả hoa hồng — vd Paula's Choice) là đơn thật, KHÔNG phải huỷ; file `_aff_` có thêm cột `refund`, `nocomm` (GMV bị từ chối hoa hồng). Trước đó script coi các đơn này là huỷ nên NMV thấp và tỷ lệ huỷ sai. Đã kéo lại 01/10–24/11/2026 cho HO, hannahteam2; HT, hannahteam3 chưa (captcha). Tỷ lệ huỷ = 1 − NMV ÷ aff_gmv_placed.
- Creator Center trả tối đa 1.000 SKU/ngày; script lấy theo GMV giảm dần.
- Affiliate tự chia nhỏ khung giờ khi một ngày có hơn 9.500 checkout (ngày Mega).
- Tải file: trang Affiliate ghi đè hàm `click()` của trình duyệt nên script bấm link tải trong một iframe ẩn (`shpSaveFile`). Nếu Chrome hỏi "tải xuống nhiều tệp" thì cho phép một lần; không thì file chỉ nằm dạng tạm `.com.google.Chrome.*` trong Downloads.
- Tổng Live tháng phải gần bằng HO Live (Mega + BAU) đơn đã đặt trong sheet; Hannah Team gần bằng các dòng [MCN].

## Code trang dashboard claude.ai
files/app.js, files/brand.js, files/index.html trên dashboard claude.ai là bản đã làm rối (từ 24/10/2026). Bản đọc được = shopee/app.js, shopee/brand.js và phần body của shopee/detail.html (trang bảng chi tiết; shopee/index.html giờ là trang app dạng điện thoại, không có trên dashboard claude.ai). Sửa giao diện thì sửa bản đọc được, chạy tools/shopee/obfuscate.js rồi ghi bản đã làm rối vào dashboard. Tác vụ cập nhật hằng ngày không đụng các file này.
