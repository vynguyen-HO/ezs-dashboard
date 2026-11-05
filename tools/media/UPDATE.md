# Cập nhật dữ liệu dashboard Media

Chạy tự động 10:30 và 17:00 (giờ Việt Nam) bằng tác vụ lên lịch trên máy Mac của Vy, hoặc chạy tay theo đúng các bước dưới.

- Trang công khai: https://vynguyen-ho.github.io/ezs-dashboard/media/
- Repo trên máy: `~/pfm-ads-dashboard` (remote `origin` = `vynguyen-HO/ezs-dashboard`, branch `main`).
- Dữ liệu: `media/data/`. Script: `tools/media/raw_to_rows.py` (kết quả API thô → file nhập) và `tools/media/update_data.py` (ghép file nhập vào `media/data/`).
- Phạm vi hiện tại: Meta (3 tài khoản), TikTok (2 tài khoản, gồm phiên live và video), sheet GMV. **Shopee chưa tự động** (cần Chrome đăng nhập Seller Center), giữ nguyên dữ liệu Shopee cũ.

Quy tắc chung:
- Chỉ dùng công cụ ĐỌC. Không gọi bất kỳ công cụ tạo / sửa / bật / tắt / xoá nào của Meta hay TikTok.
- Không in, không lưu, không commit token hay mật khẩu. Không sửa file nào ngoài `media/data/` (và `dashboards.json` nếu cần đổi ngày).
- Nguồn nào lỗi thì bỏ nguồn đó (xoá các file thô của nguồn đó), vẫn cập nhật các nguồn khác, và ghi rõ trong commit message + báo cáo cuối.

## 0. Chuẩn bị

1. Giờ VN: `TZ=Asia/Ho_Chi_Minh date`. Đặt `TO` = hôm nay, `FROM` = hôm nay − 3 ngày (kéo lại 4 ngày để cập nhật đơn về muộn). Số của hôm nay là tạm tính, lần chạy sau sẽ ghi đè.
2. `cd ~/pfm-ads-dashboard && git checkout main && git pull --ff-only origin main`. Nếu có thay đổi chưa commit hoặc pull lỗi: dừng, báo lại, không làm gì thêm.
3. Tạo thư mục thô: `RAW=~/Library/Caches/ezs-media-update/$(date +%Y%m%d-%H%M)/raw` và `OUT=${RAW%/raw}/out` (`mkdir -p`).
4. **Lưu kết quả công cụ thành file trong `$RAW`**, tên theo mẫu ở từng bước (`<loại>__<TÀI_KHOẢN>__<phần>.json`).
   - Nếu công cụ báo kết quả quá lớn và đã lưu ra một đường dẫn: `cp` đúng file đó sang `$RAW/<tên>`.
   - Nếu kết quả trả thẳng: ghi nguyên văn JSON trả về vào `$RAW/<tên>` (công cụ Write). Không sửa, không rút gọn.
   - Không chạy song song hai lệnh có thể lưu ra cùng một file tạm; lưu xong file này mới gọi lệnh tiếp.
   - Có `next_cursor` / `page_info.total_page` > 1: gọi tiếp từng trang, mỗi trang một file (`..._p2.json`).

## 1. Meta Ads

Công cụ: `ads_get_ad_entities`, `ads_get_creatives` (MCP Meta Ads). Mỗi lần gọi truyền `client_conversation_id` (20 ký tự ngẫu nhiên A-Z a-z 0-9, giữ nguyên cả lượt chạy), `advertiser_job` = `report_measure_or_look_up`, `scheduled_task_run` = true, `include_additional_context` = false, `reporting_purpose` = ["metric_lookup"]. Bỏ qua mọi `next_actions` / `offer_report`.

Tài khoản: `HO.com` = 932082637544640, `HO4D` = 1812342749230140, `X1` = 1216140423428044.

Với mỗi tài khoản, `time_range` = `{"since":"FROM","until":"TO"}`, `time_increment` = "1", `limit` 1000, filtering `[{"field":"amount_spent","operator":"GREATER_THAN","value":["0"]}]`:
- `level` "campaign", fields `["id","name","objective","amount_spent","impressions","clicks","omni_purchase","omni_purchase_values"]` → `meta_campaign__<TK>__p1.json`
- `level` "ad", fields `["id","name","campaign_id","adset_name","creative_id","amount_spent","impressions","link_click","omni_purchase","omni_purchase_values"]` → `meta_ad__<TK>__p1.json`

Lưu ý: Meta có lúc trả trang cuối không có `next_cursor` dù còn dữ liệu. Sau bước 4 so tổng spend theo ad với theo campaign của từng tài khoản; lệch > 3% thì kéo lại phần ad theo từng ngày (`since` = `until`).

Creative mới: lấy `creative_id` của các ad chưa có trong `media/data/meta_ads.csv` (so cột `ad_id`), gọi `ads_get_creatives` với `creative_ids` (tối đa 100 / lần), fields `["id","object_type","title","body","effective_object_story_id"]` → `meta_creative__p1.json`.

## 2. TikTok Ads

Công cụ: `report_integrated_get`, `tool_execute` (MCP TikTok for Business). Tài khoản: `Affiliate` = 7239635595482415105, `HANNAHOLALA` = 7199958863389442049. Shop: `store_ids` = ["7494810385695607528"]. `start_date` = FROM, `end_date` = TO. `page_size` 1000.

Với mỗi tài khoản:
1. **Ads thường (theo chiến dịch)**: `report_integrated_get` report_type BASIC, data_level AUCTION_CAMPAIGN, dimensions `["campaign_id","stat_time_day"]`, metrics `["campaign_name","objective_type","spend","impressions","clicks","video_play_actions","total_onsite_shopping_value","onsite_shopping"]` → `tt_basic__<TK>__p1.json`.
2. **Danh sách GMV Max**: `tool_execute` `gmv_max_campaign_get`, params `{"advertiser_id":..., "filtering":{"gmv_max_promotion_types":["LIVE_GMV_MAX"]}, "page_size":100}` và tương tự `PRODUCT_GMV_MAX` → ghi lại danh sách `campaign_id` từng loại (không cần lưu file). Bỏ qua campaign đã xoá từ trước FROM.
3. **GMV Max theo chiến dịch**: `tool_execute` `gmv_max_report_get`, params `{"advertiser_id":..., "store_ids":[...], "start_date":FROM, "end_date":TO, "dimensions":["campaign_id","stat_time_day"], "metrics":["cost","gross_revenue","orders","all_shops_gross_revenue","all_shops_orders","live_views"], "filtering":{"campaign_ids":[<LIVE ids, ≤100>]}, "page_size":1000}` → `tt_gmvmax__<TK>__LIVE__p1.json`; lặp với PRODUCT ids → `tt_gmvmax__<TK>__PRODUCT__p1.json`. Bỏ các dòng toàn 0 là bình thường. Chỉ số `roi` luôn trả 0.00, không dùng.
4. **Phiên live theo ngày**: như (3) với LIVE ids nhưng dimensions `["room_id","stat_time_day"]` → `tt_room__<TK>__p1.json`.
5. **Tên phiên live**: với từng LIVE campaign có cost > 0 trong (3), `gmv_max_report_get` dimensions `["room_id"]`, `filtering.campaign_ids` = [đúng 1 id], metrics `["cost","live_name","live_launched_time","live_duration"]` → `tt_roominfo__<TK>__<campaign_id>.json`. (Các metric tên phiên chỉ nhận khi lọc đúng 1 campaign.)
6. **Video Product GMV Max**: với PRODUCT ids có cost > 0: dimensions `["campaign_id","item_group_id"]` (metrics `["cost"]`) để lấy `item_group_id`; rồi dimensions `["campaign_id","item_id","stat_time_day"]`, metrics `["cost","gross_revenue","orders"]`, filtering `campaign_ids` + `item_group_ids` (≤100 mỗi loại) → `tt_item__<TK>__p1.json`. `item_id` = -1 là chi tiêu thẻ sản phẩm không gắn video, giữ nguyên.
7. **Video ads thường (theo ad)**: `report_integrated_get` BASIC, data_level AUCTION_AD, dimensions `["ad_id","stat_time_day"]`, metrics `["ad_name","campaign_id","spend","total_onsite_shopping_value","onsite_shopping"]`, order_field `spend` → `tt_ad__<TK>__p1.json`.

## 3. Sheet GMV

Công cụ Google Sheets `get_values`, spreadsheet `1tQYA095MUFr8uRLVg2mt-F2EDqdzDV1IE2vIDkQNB08`:
- `Daily_History!A1:E1000` → `sheet_daily.json` (dòng ngày D chứa GMV của ngày D−1; script tự lùi 1 ngày; chỉ dùng cột `tt` = GMV TikTok creator).
- `GMV_Data!A1:L40` → `sheet_gmvdata.json` (kế hoạch và MTD tháng hiện tại → dòng tháng TO trong `gmv_monthly.csv`).
Lần 10:30 chạy sau khi sheet tự cập nhật (~10:01). Lần 17:00 vẫn đọc lại sheet bình thường.

## 4. Chuyển và kiểm tra

```bash
cd ~/pfm-ads-dashboard
python3 tools/media/raw_to_rows.py "$RAW" "$OUT" --from FROM --to TO
```
Đọc phần in ra rồi kiểm tra trước khi ghép:
- Có đủ dòng cho từng nguồn đã kéo (campaign_rows có Meta/HO.com, Meta/HO4D, Meta/X1, TikTok/<TK>/ads, gmv_max_live, gmv_max_product nếu có chi tiêu).
- `meta_ad_rows` spend so với tổng Meta trong `campaign_rows`: lệch ≤ 3%.
- `tiktok_live_rows` spend ≈ tổng `gmv_max_live` trong `campaign_rows` (lệch ≤ 2%).
- So với dữ liệu đang có cho cùng ngày (ngày FROM..TO−1) trong `media/data/campaign_daily.csv`: spend mỗi kênh không giảm quá 30% (nếu giảm hơn là dấu hiệu kéo thiếu trang → kéo lại, không ghép).
- `meta_ads` báo `creatives_missing` > 0 cho ad mới: chấp nhận được, ghi chú lại.
Nếu một nguồn không đạt: xoá file của nguồn đó trong `$OUT` (ví dụ `meta_ad_rows.csv`, `meta_ads.csv`) và ghi chú, các nguồn khác vẫn ghép.

## 5. Ghép, kiểm tra trang, commit, push

```bash
python3 tools/media/update_data.py "$OUT"
git status --short          # chỉ được có thay đổi trong media/data/
```
Kiểm tra nhanh trang: `python3 -m http.server 8765 --bind 127.0.0.1` (chạy nền), mở `http://127.0.0.1:8765/media/index.html?r=<số ngẫu nhiên>#overview&7d` bằng trình duyệt trong app, xem không lỗi console và các ô có số; tắt server.

Commit & push:
```bash
git add media/data
git commit -m "[media] update data $(TZ=Asia/Ho_Chi_Minh date +%d/%m\ %Hh%M)" -m "<nguồn đã cập nhật, nguồn bị bỏ và lý do>"
git push origin main
```
Push dùng thông tin đăng nhập GitHub đã lưu trong macOS Keychain. Nếu push lỗi đăng nhập: không thử nhập mật khẩu hay token, để nguyên commit trên máy và báo lại.

## 6. Báo cáo cuối

Một đoạn ngắn: khoảng ngày đã cập nhật, tổng ad spend / ad GMV mỗi kênh của hôm qua, nguồn nào bị bỏ và vì sao, commit hash, đã push hay chưa.
