# Brand Deal Watch: hướng dẫn cho agent (chạy mỗi 2 giờ, 8h–22h)

Mục tiêu: scan deal đang bán trên shop chính hãng của các brand (Shopee Mall, TikTok Shop, Website brand),
so với deal list Hannah, rồi cảnh báo deal nào bằng giá hoặc rẻ hơn Hannah.
Kết quả hiện ở **v2 › Analytics › Deal Compare** (bảng Office + số deal vi phạm, đọc `deal/watch/*.json`).

Repo: `C:\Users\win\ezs-dashboard`, branch `main`. Thư mục agent: `tools/deal-watch/` (gọi là `DIR`).
Dữ liệu thô nằm trong `DIR/data/` (gitignore, KHÔNG commit).

## 0. Bắt đầu lượt
- `git pull --rebase` rồi `python DIR/compare.py --start`
- Commit `deal/watch/status.json` với message `[deal-watch] start dd/mm HH:MM` rồi push (để bảng Office hiện "Đang làm việc").

## 1. Lấy deal Hannah
- Sheet `1wwJ29U0Z_c9tlDaStxJJw3gKdWjmVQa_InaQuQ41jGQ`, tab `DL_T11`, range `A2:L` (KHÔNG đọc cột N vì rất dài).
- Ghi nguyên mảng values vào `DIR/data/hannah.json`.
- Sang tháng mới thì đổi tên tab sang tháng đó (VD `DL_T12`) khi tab đó đã có.

## 2. Chọn brand cho lượt này (xoay vòng)
- `DIR/data/state.json` = `{"BRAND": "ISO time scan gần nhất"}`. Lấy **15 brand** có thời gian cũ nhất hoặc chưa scan lần nào.
  (Toàn bộ ~96 brand x 3 kênh không scan hết trong 2 giờ, nên mỗi brand được quét lại khoảng 12 tiếng một lần.)

## 3. Scan (bằng Chrome, công cụ claude-in-chrome)
Với mỗi brand, mỗi kênh:
- **Shopee Mall**: `https://shopee.vn/search?keyword=<brand> <tên SP rút gọn>&filters=mall`, chờ ~4 giây,
  đọc bằng JS: `[...document.querySelectorAll('a[href*="-i."]')].map(a=>a.innerText+' | '+a.href)`
  (tên, giá đang bán, giá gạch, "Free Gift"). Bỏ qua hàng "QUÀ TẶNG KHÔNG BÁN" và hàng "Nhập khẩu" của shop bán lại.
  Khi đã biết link shop chính hãng thì lưu vào `DIR/data/shops.json` và các lượt sau tìm trong shop đó.
- **TikTok Shop**: tìm shop chính hãng của brand (lưu vào `shops.json`) rồi đọc giá sản phẩm.
- **Website brand**: tìm trang chính hãng (lưu vào `shops.json`) rồi đọc giá sản phẩm.
- Chỉ lấy shop **chính hãng/Mall của brand**, bỏ qua shop bán lại.
- Ghép sản phẩm với deal Hannah cùng brand theo **đúng sản phẩm, dung tích và số lượng trong combo**
  (combo 2 chai chỉ so với deal combo 2 chai). Nếu không chắc là cùng sản phẩm thì bỏ qua.
- Thêm mỗi sản phẩm ghép được vào `DIR/data/scanned.json` (list, giữ các bản ghi của lượt trước, ghi đè theo cặp `stt`+`channel`):
  `{"stt": "<STT Hannah>", "channel": "shopee|tiktok|web", "title": "...", "price": 543000, "list_price": 622000, "url": "...", "gift": "...", "scanned_at": "<ISO>"}`
- Bị chặn (captcha, yêu cầu đăng nhập) thì KHÔNG vượt qua: ghi brand/kênh đó vào phần "Không scan được" của báo cáo rồi đi tiếp.
- Cập nhật `state.json` cho brand vừa scan.

## 4. So sánh, cảnh báo, kết thúc lượt
- `python DIR/compare.py --brands "<brand1>, <brand2>, ..."` (các brand vừa scan). Lệnh này ghi `deal/watch/warnings.json` + `status.json`.
- Commit đúng 2 file đó với message `[deal-watch] dd/mm HH:MM: N deal vi phạm` rồi push.
  Nếu bước nào lỗi giữa chừng vẫn phải chạy lệnh này (để bảng Office không kẹt ở "Đang làm việc").
- Câu trả lời cuối: số warning (TỐT HƠN / NGANG), top 5 deal brand rẻ hơn Hannah nhiều nhất, danh sách brand/kênh không scan được.
