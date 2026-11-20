# Brand Deal Watch: agent Scanner (chạy mỗi 2 giờ, 8h–22h)

Scanner quét deal trên shop chính hãng của brand (Shopee Mall, TikTok Shop, Website brand) và so với deal list Hannah.
Kết quả của Scanner chỉ là **deal nghi vi phạm** (`candidates.json`). Agent QC (`QC.md`) kiểm lại 1 giờ sau,
và chỉ deal QC xác nhận mới lên **v2 › Analytics › Deal Compare** (bảng Office + số deal vi phạm).

Repo `C:\Users\win\ezs-dashboard`, branch `main`. `DIR` = `tools/deal-watch/`. Data thô trong `DIR/data/` (gitignore, KHÔNG commit).

## 0. Bắt đầu
- `git pull --rebase`, `python DIR/compare.py --start scanner`, commit `deal/watch/status.json` (`[deal-watch] scan start dd/mm HH:MM`) rồi push.
- Đọc `DIR/RULES.md` (cách tính deal hơn) và `DIR/data/mappings.json`.
- Đọc tab **Bài học** của sheet memory (ID `memory_sheet` trong `DIR/data/config.json`), các dòng `Áp dụng cho` có `Scanner`.
  Đây là chỉ dẫn QC gửi sau mỗi lần Scanner đánh giá sai và từ feedback của KA: **làm theo trước mọi hướng dẫn chung bên dưới**.

## 1. Lấy deal Hannah
- Sheet deal list = `deal_sheet`, tab `deal_tab` trong `DIR/data/config.json` (file chỉ trên máy, không commit vì repo public). Range `A2:L` (KHÔNG đọc cột N vì rất dài).
- Ghi nguyên mảng values vào `DIR/data/hannah.json`. Sang tháng mới thì đổi `deal_tab` (VD `DL_T12`) khi tab đó đã có.
- **Quà Hannah ra ml** (RULES.md 4.4): với các brand scan lượt này, đọc thêm cột M `Bao gồm` (range `M2:M`, chỉ các dòng của brand đó)
  và ghi vào `DIR/data/hannah_gifts.json`: `{"<STT>": {"main_ml": <dung tích SP chính>, "gifts": [{"name","qty","ml","unit_price"?}]}}`.
  Đã có STT trong file thì giữ, chỉ thêm STT mới. Quà khác loại SP chính thì điền `unit_price` (giá gốc / dung tích của chính loại đó).

## 2. Danh sách scan lượt này (ưu tiên top brand mỗi kênh)
- `python DIR/compare.py --plan` in ra các dòng `brand  kênh  lý do`:
  - `top`: 5 brand GMV 30 ngày cao nhất của **từng kênh** (Shopee affiliate, TikTok creator, Scom, lấy từ data repo). Scan **mọi lượt**.
  - `xoay vòng`: 5 brand còn lại lâu chưa scan nhất, scan cả 3 kênh.
- Scan theo đúng thứ tự in ra: hết giờ thì dừng ở đó, phần `top` luôn xong trước.

## 3. Scan (bằng Chrome, công cụ claude-in-chrome)
Với mỗi cặp brand x kênh:
- Link trong `mappings.json` có `ok: true` cho deal của brand này: mở thẳng link đó đọc giá + quà (nhanh và chắc nhất).
- **Shopee Mall**: `https://shopee.vn/search?keyword=<brand> <tên SP rút gọn>&filters=mall`, chờ ~4 giây,
  đọc bằng JS: `[...document.querySelectorAll('a[href*="-i."]')].map(a=>a.innerText+' | '+a.href)`.
  Bỏ hàng "QUÀ TẶNG KHÔNG BÁN" và hàng "Nhập khẩu" của shop bán lại. Biết link shop chính hãng thì lưu `DIR/data/shops.json`.
- **TikTok Shop**: tìm shop chính hãng của brand (lưu `shops.json`) rồi đọc giá SP.
- **Website brand**: trang chính hãng (lưu `shops.json`) rồi đọc giá SP.
- Chỉ lấy shop chính hãng/Mall. Ghép SP với deal Hannah cùng brand theo đúng SP, dung tích, số lượng combo.
  - Chắc chắn: `"match": "sure"`.
  - Gần giống nhưng chưa chắc (tên khác, cần xem ảnh/quà): vẫn ghi với `"match": "unsure"` để QC kiểm bằng ảnh. Đừng bỏ qua.
  - Cặp link + STT có `ok: false` trong `mappings.json`: bỏ qua.
- **Giá và quà theo `RULES.md`** (bắt buộc đọc):
  - `price` = giá đang bán (đã gồm seller tự giảm); `seller_voucher` = voucher shop áp được cho 1 SP; voucher sàn chỉ ghi `platform_voucher`, không trừ.
  - Quà: quà không hiện trên thumbnail thì mở trang SP xem promotion **mua 1 tặng SP 0đ**. Món nào cũng ghi `ml`; có giá thì ghi thêm `value`.
    Quà khác loại SP chính thì ghi `unit_price` **giống hệt** `unit_price` của món cùng loại bên Hannah (RULES.md 4.3).
  - Không tự chọn cách tính quà: `compare.py` tự chọn theo giá quà (khi cả 2 bên đều có giá) hoặc theo ml cho **cả 2 bên**.
- Ghi vào `DIR/data/scanned.json` (list, ghi đè theo cặp `stt` + `channel`), dùng **link trang sản phẩm**:
  `{"stt","channel":"shopee|tiktok|web","title","price","list_price","seller_voucher","platform_voucher","gifts":[{"name","qty","ml","value","unit_price","source"}],"url","image","match","scanned_at":"<ISO>"}`
- Bị chặn (captcha, yêu cầu đăng nhập): KHÔNG vượt qua, ghi vào "Không scan được" rồi đi tiếp.

## 4. Kết thúc
- `python DIR/compare.py --brands "<các brand đã scan>"` → `DIR/data/candidates.json` (chờ QC) + `deal/watch/status.json`.
- Commit đúng `deal/watch/status.json` (`[deal-watch] scan dd/mm HH:MM: N chờ QC`) rồi push lên main. Lỗi giữa chừng vẫn phải chạy bước này.
- Không gửi thông báo cho ai: thông báo chỉ đi ra sau QC.
- Báo cáo: số SP đã scan, số deal nghi vi phạm chờ QC, brand/kênh không scan được.
