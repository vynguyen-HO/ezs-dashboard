# Quy trình cập nhật Hannah Team Channel Monitor

Chạy tự động 9h và 12h (giờ Việt Nam) bằng tác vụ lên lịch, hoặc chạy tay theo đúng các bước dưới.

- Dashboard Claude: https://claude.ai/artifact/DChafwxGYuqzwDhGCdTCLd
- Trang công khai: https://vynguyen-ho.github.io/ezs-dashboard/pr-mkt/
- Kho dữ liệu: `pr-mkt/data/` (channels, videos, followers, gmv, status). Script: `pr-mkt/tools/cm.py`.

## 0. Chuẩn bị
- Giờ VN = UTC+7 (`date -u` rồi cộng 7). T = hôm nay, Y = hôm qua.
- `add_repo vynguyen-HO/ezs-dashboard` (access push), clone, `cd pr-mkt/tools`.
- Tạo thư mục `in/` (không commit). Đọc `../data/channels.json` để có handle, identity_id, cờ studio/nobc/mcn.

## 1. Danh sách video + gắn giỏ (TikTok for Business, chạy trên cloud)
Với mỗi kênh có `identity_id`: `identity_video_get` advertiser_id 7553924625949212680, identity_type BC_AUTH_TT,
identity_authorized_bc_id 7199957727395741697, count 10 (review: 20 vì đăng nhiều).
Mỗi video → 1 dòng `in/videos.csv` (`h,id,ts,title,tag,failed`): ts để trống, title = phần text trước dấu `#` (≤60 ký tự),
tag = 1 nếu anchor_list có phần tử, failed = 1 nếu có anchor status CHECK_FAILED.

## 2. Trình duyệt (Claude in Chrome trên máy người dùng)
Load tool Chrome bằng ToolSearch. Có nhiều trình duyệt thì thử lần lượt (select_browser). Không nhập mật khẩu, không bấm nút trên trang.
Không có trình duyệt nào → bỏ bước 2, vẫn làm bước 1, 3 và báo "chưa cập nhật view/followers/GMV (cần mở Chrome)".

a) **TikTok Studio** (chốt đơn, medep): mở https://www.tiktok.com/tiktokstudio/content, ngay sau khi tải chạy JS gắn hook
   XMLHttpRequest/fetch lưu responseText của URL chứa `item_list`, chờ 6 giây, cuộn mọi khung cuộn được 3 lần (cách 2,5 giây).
   Gộp `item_list` theo item_id. Xác định tài khoản bằng cách đối chiếu item_id với `data/videos.json`.
   Với video có post_time trong 10 ngày gần nhất: thêm dòng videos.csv (ts = post_time, title = desc trước `#`, tag/failed để trống)
   và dòng `in/stats.csv` (`id,views,likes,cmts,shares,saves` = play_count, like_count, comment_count, share_count, favorite_count).
   Bỏ video status 140 (hẹn giờ). status khác 102, in_review = true, hoặc visibility khác 1 → ghi vào violation của kênh (bước 3).
   javascript_tool chỉ trả về ~1.000 ký tự: lưu kết quả vào biến window rồi đọc từng đoạn bằng `.slice()`.
b) **hannah.mega.live** (chưa liên kết Business Center): mở https://www.tiktok.com/@hannah.mega.live, chờ 5 giây,
   lấy id từ các link `a[href*="@hannah.mega.live/video/"]` (12 cái đầu) → videos.csv (tag 1 nếu trang video có anchors).
c) **View/tương tác các kênh còn lại + followers**: `python3 cm.py todo --days 8` cho danh sách id (bỏ kênh studio).
   Trong một tab tiktok.com, chạy vòng lặp nền: fetch(`https://www.tiktok.com/@x/video/<id>`, credentials include), lấy
   `__UNIVERSAL_DATA_FOR_REHYDRATION__` → `webapp.video-detail.itemInfo.itemStruct`: stats (playCount, diggCount, commentCount,
   shareCount, collectCount) → stats.csv; `authorStats.followerCount` theo `author.uniqueId` → `in/followers.csv` (`h,followers`).
   Nghỉ 3 giây giữa các video; 3 lần liền không có dữ liệu (TikTok chặn) → dừng, chờ 1 phút, thử trình duyệt khác với phần còn lại.
   Video không đọc được giữ số cũ.
d) **Partner Center** (GMV, followers chính xác cho kênh MCN): tab https://partner.tiktokshop.com/compass/creator-service/account.
   Ngay sau khi mở trang chạy `performance.setResourceTimingBufferSize(5000)`, chờ 7 giây, lấy URL request
   `/api/v2/insights/partner/core/creator/list` trong `performance.getEntriesByType('resource')`, bỏ tham số X-Bogus, _signature
   → `window.__base` (phần query), `window.__path` (phần path). Gọi POST `__path+__base` với body
   `{request:{time_descriptor:{start:'YYYY-MM-DD',end:'YYYY-MM-DD (ngày sau, loại trừ)',timezone_offset:'25200',granularity:'all',scenario:1},
   common_stats_types:T,filter:{module:m,search:''},list_control:{rules:[{field:R,direction:1}],pagination:{size:50,page:0}}},version:'2'}`
   với m=1 T=[1,4,2,3,90,100,91,92,60,70,80,61,71,81] R='CORE_CREATOR_LIST_COMMON_GMV' (lấy `gmv`);
   m=2 T=[32,12,1,4,3,10] R='CORE_CREATOR_LIST_COMMON_DIRECT_GMV_VIDEO' (`direct_gmv_video`, `follower_cnt`);
   m=3 T=[31,11] R='CORE_CREATOR_LIST_COMMON_DIRECT_GMV_LIVE' (`direct_gmv_live`). Mỗi phần tử: `x.common_stats`, handle ở `creator_handle`, số tiền ở `.amount`.
   Chạy cho từng ngày Y-1 và Y (GMV trễ 1 ngày) → `in/gmv.csv` (`h,date,gmv,video,live`). follower_cnt (m=2, ngày Y) ghi đè followers.csv cho kênh MCN.

## 3. Gộp, nhận định, build
- `python3 cm.py merge in`
- Sửa `../data/status.json`: `alerts` (3–8 việc cần xử lý, tiếng Việt, mỗi việc: id cố định không dấu, sev bad/warn/info, ch, short, title, detail có số liệu),
  `vio` (link CHECK_FAILED, video bị ẩn/xét duyệt), `vioOk` (kênh studio không có vi phạm), `tier`, `stage`
  (S1 chưa gắn giỏ; S2 có giỏ/affiliate, GMV tháng <500 triệu; S3 GMV tháng >500 triệu). Giữ id việc cũ nếu vẫn còn để không mất phần giao việc.
- `python3 cm.py build` → `../index.html` (công khai) và `out/artifact.html`.
- Kiểm tra nhanh: mở `out/artifact.html` bằng Playwright, không có lỗi JS.

## 4. Xuất bản
- Artifact: đọc artifact (action read) rồi publish `out/artifact.html` lên url https://claude.ai/artifact/DChafwxGYuqzwDhGCdTCLd.
- `git add pr-mkt/data pr-mkt/index.html` (không add `tools/in`, `tools/out`), commit "[pr-mkt] update data HHhMM DD/MM",
  `git pull --rebase`, `git push`.

## 5. Báo cáo (3–5 dòng)
Giờ cập nhật, kênh tăng/giảm followers nhiều nhất, video nổi bật, việc mới cần xử lý, nguồn nào lỗi.
