# Cập nhật dữ liệu dashboard Media

Chạy tự động 10:30 và 17:00 (giờ Việt Nam) bằng tác vụ lên lịch trên máy Mac của Vy, hoặc chạy tay theo đúng các bước dưới.

- Trang công khai: https://vynguyen-ho.github.io/ezs-dashboard/media/
- Repo trên máy: `~/pfm-ads-dashboard` (remote `origin` = `vynguyen-HO/ezs-dashboard`, branch `main`).
- Dữ liệu: `media/data/`. Script: `tools/media/raw_to_rows.py` (kết quả API thô → file nhập) và `tools/media/update_data.py` (ghép file nhập vào `media/data/`).
- Phạm vi hiện tại: Meta (3 tài khoản), TikTok (2 tài khoản, gồm phiên live và video), sheet GMV. **Shopee chưa tự động** (cần Chrome đăng nhập Seller Center), giữ nguyên dữ liệu Shopee cũ.

Quy tắc chung:
- Chỉ dùng công cụ ĐỌC. Không gọi bất kỳ công cụ tạo / sửa / bật / tắt / xoá nào của Meta hay TikTok.
- Không in, không lưu, không commit token hay mật khẩu. Không sửa file nào ngoài `media/data/`, `tiktok/data/` (và `dashboards.json` nếu cần đổi ngày).
- Nguồn nào lỗi thì bỏ nguồn đó (xoá các file thô của nguồn đó), vẫn cập nhật các nguồn khác, và ghi rõ trong commit message + báo cáo cuối.

## 0. Chuẩn bị

1. Giờ VN: `TZ=Asia/Ho_Chi_Minh date`. Đặt `TO` = hôm nay, `FROM` = hôm nay − 3 ngày (kéo lại 4 ngày để cập nhật đơn về muộn). Số của hôm nay là tạm tính, lần chạy sau sẽ ghi đè.
2. `cd ~/pfm-ads-dashboard && git checkout main && git pull --ff-only origin main`. Nếu có thay đổi chưa commit hoặc pull lỗi: dừng, báo lại, không làm gì thêm.
3. Tạo thư mục thô: `RAW=~/Library/Caches/ezs-media-update/$(date +%Y%m%d-%H%M)/raw` và `OUT=${RAW%/raw}/out` (`mkdir -p`).
4. **Lưu kết quả công cụ thành file trong `$RAW`**, tên theo mẫu ở từng bước (`<loại>__<TÀI_KHOẢN>__<phần>.json`).
   - Nếu công cụ báo kết quả quá lớn và đã lưu ra một đường dẫn: `cp` đúng file đó sang `$RAW/<tên>`.
   - Nếu kết quả trả thẳng: **ngay sau lệnh gọi đó**, chạy `python3 tools/media/save_last.py <tên công cụ> "$RAW/<tên>" '<chuỗi khớp>'`, trong đó `<chuỗi khớp>` là một đoạn chỉ có trong input của lệnh vừa gọi (ví dụ campaign id, `1216140423428044`, `"level": "ad"`, `Daily_History`, `"page": 2`). Ví dụ: `save_last.py ads_get_ad_entities "$RAW/meta_campaign__X1__p1.json" '1216140423428044", "level": "campaign'`. Script lấy nguyên văn kết quả gần nhất khớp cả tên công cụ lẫn chuỗi đó (có thể có phiên khác đang chạy song song); đọc dòng `input` nó in ra để chắc đúng lệnh vừa gọi. Không gõ lại JSON bằng tay.
   - Gọi tuần tự: lưu xong kết quả này mới gọi lệnh tiếp (không chạy song song).
   - Có `next_cursor` / `page_info.total_page` > 1: gọi tiếp từng trang, mỗi trang một file, đuôi `__p2.json`, `__p3.json`…
   - Kết quả rỗng (không có dòng nào) vẫn lưu file bình thường; nguồn không có chiến dịch nào thì không cần gọi.

## 1. Meta Ads

Công cụ: `ads_get_ad_entities`, `ads_get_creatives` (MCP Meta Ads). Mỗi lần gọi truyền `client_conversation_id` (20 ký tự ngẫu nhiên A-Z a-z 0-9, giữ nguyên cả lượt chạy), `advertiser_job` = `report_measure_or_look_up`, `scheduled_task_run` = true, `include_additional_context` = false, `reporting_purpose` = ["metric_lookup"]. Bỏ qua mọi `next_actions` / `offer_report`.

Tài khoản: `HO.com` = 932082637544640, `HO4D` = 1812342749230140, `X1` = 1216140423428044.

Với mỗi tài khoản, `time_range` = `{"since":"FROM","until":"TO"}`, `time_increment` = "1", `limit` 1000, filtering `[{"field":"amount_spent","operator":"GREATER_THAN","value":["0"]}]`:
- `level` "campaign", fields `["id","name","objective","amount_spent","impressions","clicks","omni_purchase","omni_purchase_values"]` → `meta_campaign__<TK>__p1.json`
- `level` "ad", fields `["id","name","campaign_id","adset_name","creative_id","amount_spent","impressions","link_click","omni_purchase","omni_purchase_values"]` → `meta_ad__<TK>__p1.json`

Lưu ý: Meta có lúc trả trang cuối không có `next_cursor` dù còn dữ liệu. Sau bước 4 so tổng spend theo ad với theo campaign của từng tài khoản; lệch > 3% thì kéo lại phần ad theo từng ngày (`since` = `until`).

Kết quả có thể kèm dòng không có `id` (tổng tài khoản) và dòng spend 0 của vài ngày: bình thường, script tự bỏ. Meta thường không trả `next_cursor`.

Creative mới: lấy `creative_id` của các ad **có spend > 0 trong kỳ** mà chưa có trong `media/data/meta_ads.csv` (so cột `ad_id`), gọi `ads_get_creatives` với `creative_ids` (tối đa 100 / lần), fields `["id","object_type","title","body","effective_object_story_id"]` → `meta_creative__p1.json`, `meta_creative__p2.json`… (kết quả nằm trong khoá `ad_creatives`; nhiều creative không có `title`, bình thường).

## 2. TikTok Ads

Công cụ: `report_integrated_get`, `tool_execute` (MCP TikTok for Business). Tài khoản: `Affiliate` = 7239635595482415105, `HANNAHOLALA` = 7199958863389442049. Shop: `store_ids` = ["7494810385695607528"]. `start_date` = FROM, `end_date` = TO. `page_size` 1000.

Với mỗi tài khoản:
1. **Ads thường (theo chiến dịch)**: `report_integrated_get` report_type BASIC, data_level AUCTION_CAMPAIGN, dimensions `["campaign_id","stat_time_day"]`, metrics `["campaign_name","objective_type","spend","impressions","clicks","video_play_actions","total_onsite_shopping_value","onsite_shopping"]` → `tt_basic__<TK>__p1.json`.
2. **Danh sách GMV Max**: `tool_execute` `gmv_max_campaign_get`, params `{"advertiser_id":..., "filtering":{"gmv_max_promotion_types":["LIVE_GMV_MAX"]}, "fields":["campaign_id","campaign_name","operation_status","modify_time"], "page_size":100}` → lưu `tt_camplist__<TK>__LIVE__p1.json`; tương tự `PRODUCT_GMV_MAX` → `tt_camplist__<TK>__PRODUCT__p1.json`. Gọi hết các trang (`page` 2, 3… tới `total_page`; với `fields` như trên mỗi trang nhỏ), lưu `__p2.json`… Danh sách xếp theo ngày tạo, không theo `modify_time`.
   **Chọn campaign hoạt động** = `operation_status` = ENABLE, hoặc `modify_time` ≥ FROM − 7 ngày. Campaign test vẫn gọi và lưu như thường (toàn số 0 thì script tự bỏ).
3. **Product GMV Max theo chiến dịch**: `tool_execute` `gmv_max_report_get`, params `{"advertiser_id":..., "store_ids":[...], "start_date":FROM, "end_date":TO, "dimensions":["campaign_id","stat_time_day"], "metrics":["cost","gross_revenue","orders","all_shops_gross_revenue","all_shops_orders","live_views"], "filtering":{"campaign_ids":[<PRODUCT ids hoạt động, ≤100>]}, "page_size":1000}` → `tt_gmvmax__<TK>__PRODUCT__p1.json`. Dòng toàn 0 là bình thường. Chỉ số `roi` luôn trả 0.00, không dùng.
   **Không** dùng báo cáo này cho LIVE: với LIVE GMV Max nó không trả số cho các campaign thật (đã thử 11/2026). Số LIVE theo chiến dịch được script cộng từ bước 4.
4. **LIVE GMV Max theo phiên, từng campaign**: với **từng** LIVE campaign hoạt động, `gmv_max_report_get` như (3) nhưng dimensions `["room_id","stat_time_day"]` và `filtering.campaign_ids` = [đúng 1 id đó] → `tt_room__<TK>__<campaign_id>__p1.json`. Tên file phải có campaign_id: script dùng nó để dựng dòng `gmv_max_live` theo chiến dịch. Không tạo file `tt_room__<TK>__p1.json` gộp nhiều campaign (sẽ bị cộng đôi).
5. **Tên phiên live**: với từng LIVE campaign có cost > 0 ở bước 4, `gmv_max_report_get` dimensions `["room_id"]`, `filtering.campaign_ids` = [đúng 1 id], metrics `["cost","live_name","live_launched_time","live_duration"]` (không có `stat_time_day` — các metric tên phiên chỉ nhận như vậy) → `tt_roominfo__<TK>__<campaign_id>.json`. Có thể trả cả phiên cũ cost 0, bình thường.
6. **Video Product GMV Max**: với PRODUCT ids có cost > 0 ở bước 3: dimensions `["campaign_id","item_group_id"]` (metrics `["cost"]`) để lấy `item_group_id`; rồi dimensions `["campaign_id","item_id","stat_time_day"]`, metrics `["cost","gross_revenue","orders"]`, filtering `campaign_ids` + `item_group_ids` (≤100 mỗi loại) → `tt_item__<TK>__p1.json`. Kết quả gọi trung gian `item_group_id` không cần lưu. `item_id` = -1 là chi tiêu thẻ sản phẩm không gắn video, giữ nguyên.
7. **Video ads thường (theo ad)**: `report_integrated_get` (start_date FROM, end_date TO, page_size 1000) BASIC, data_level AUCTION_AD, dimensions `["ad_id","stat_time_day"]`, metrics `["ad_name","campaign_id","spend","total_onsite_shopping_value","onsite_shopping"]`, order_field `spend` → `tt_ad__<TK>__p1.json`.

## 3. Sheet GMV

Công cụ Google Sheets `get_values`, spreadsheet `1tQYA095MUFr8uRLVg2mt-F2EDqdzDV1IE2vIDkQNB08`:
- `Daily_History!A1:E1000` → `sheet_daily.json` (dòng ngày D chứa GMV của ngày D−1; script tự lùi 1 ngày và đọc lùi thêm 7 ngày trước FROM để lấp ngày còn thiếu; chỉ dùng cột `tt` = GMV TikTok creator). Sheet đôi khi lặp lại số của hôm trước khi chưa cập nhật — ghi chú lại nếu hai ngày liền nhau có GMV giống hệt.
- `GMV_Data!A1:L40` → `sheet_gmvdata.json` (kế hoạch và MTD tháng hiện tại → dòng tháng TO trong `gmv_monthly.csv`).
Lần 10:30 chạy sau khi sheet tự cập nhật (~10:01), nên thường có GMV tới hôm qua; trước giờ đó sheet chỉ tới hôm kia. Lần 17:00 vẫn đọc lại sheet bình thường.

## 4. Chuyển và kiểm tra

```bash
cd ~/pfm-ads-dashboard
python3 tools/media/raw_to_rows.py "$RAW" "$OUT" --from FROM --to TO
```
Đọc phần in ra rồi kiểm tra trước khi ghép:
- Có đủ dòng cho từng nguồn đã kéo (campaign_rows có Meta/HO.com, Meta/HO4D, Meta/X1, TikTok/<TK>/ads, gmv_max_live, gmv_max_product nếu có chi tiêu).
- `meta_ad_rows` spend so với tổng Meta trong `campaign_rows`: lệch ≤ 3%.
- Dòng `campaign_rows + LIVE GMV Max from rooms` có `gmv_max_live spend` = `tiktok_live_rows` spend (cùng nguồn, phải bằng nhau) và > 0 nếu trong kỳ có live.
- `gmv_monthly` có cả fb, tt, sp khác 0 (nếu một kênh = 0 là đọc sai sheet → xoá `gmv_monthly.csv` khỏi `$OUT`).
- So với dữ liệu đang có cho cùng ngày (ngày FROM..TO−1) trong `media/data/campaign_daily.csv`: spend mỗi kênh không giảm quá 30% (nếu giảm hơn là dấu hiệu kéo thiếu trang → kéo lại, không ghép).
- `meta_ads` báo `new_ads_without_creative` > 0: chấp nhận được, ghi chú lại (ad cũ đã có creative trong repo thì giữ nguyên).
Nếu một nguồn không đạt: xoá file của nguồn đó trong `$OUT` (ví dụ `meta_ad_rows.csv`, `meta_ads.csv`) và ghi chú, các nguồn khác vẫn ghép.

## 5. Ghép, kiểm tra trang, commit, push

```bash
python3 tools/media/update_data.py "$OUT"
# dashboard Tiktok: GMV theo kênh con + plan, dùng lại 2 file sheet đã lưu ở bước 3
python3 tools/tiktok/update.py --data tiktok/data --sheet-gmv "$RAW/sheet_gmvdata.json" --sheet-daily "$RAW/sheet_daily.json"
git status --short          # chỉ được có thay đổi trong media/data/ và tiktok/data/
```
Bước Tiktok: bỏ qua nếu nguồn sheet bị bỏ ở bước 4. Nếu script dừng lỗi hoặc in `CẢNH BÁO`: `git checkout tiktok/data`, ghi chú trong commit message, Media vẫn commit bình thường.
Kiểm tra nhanh trang: `python3 -m http.server 8765 --bind 127.0.0.1` (chạy nền), chờ tới khi `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8765/media/` trả 200, rồi mở `http://127.0.0.1:8765/media/?r=<số ngẫu nhiên>` (giao diện app) và `http://127.0.0.1:8765/media/detail.html?r=<số>#overview&7d` (bảng chi tiết), thêm `http://127.0.0.1:8765/tiktok/?r=<số>` (dashboard Tiktok) bằng trình duyệt trong app, xem không lỗi console và các ô có số; tắt server.

Commit & push:
```bash
git add media/data tiktok/data
git commit -m "[media] update data $(TZ=Asia/Ho_Chi_Minh date +%d/%m\ %Hh%M)" -m "<nguồn đã cập nhật, nguồn bị bỏ và lý do>"
git push origin main
```
Push dùng thông tin đăng nhập GitHub đã lưu trong macOS Keychain. Nếu push lỗi đăng nhập: không thử nhập mật khẩu hay token, để nguyên commit trên máy và báo lại.

## 6. Báo cáo cuối

Một đoạn ngắn: khoảng ngày đã cập nhật, tổng ad spend / ad GMV mỗi kênh của hôm qua, nguồn nào bị bỏ và vì sao, commit hash, đã push hay chưa.
