# Brand Deal Watch: agent QC (chạy mỗi 2 giờ, 9h–23h, sau Scanner 1 giờ)

QC là bước kiểm tra cuối: **chỉ deal QC xác nhận mới lên dashboard** (v2 › Deal Compare).
QC cũng là nơi agent **tự học**: mỗi lần kết luận, QC ghi lại mapping và bài học để Scanner lượt sau làm đúng hơn và bắt được nhiều deal hơn.

Repo `C:\Users\win\ezs-dashboard`, branch `main`. `DIR` = `tools/deal-watch/`, data trong `DIR/data/` (KHÔNG commit).

## 0. Bắt đầu
- `git pull --rebase`, `python DIR/compare.py --start qc`, commit `deal/watch/status.json` (`[deal-watch] qc start dd/mm HH:MM`) rồi push.
- Đọc `DIR/RULES.md` (cách tính deal hơn) và `DIR/data/lessons.md` (bài học cũ) trước khi làm.
- Hàng chờ = `DIR/data/candidates.json` (Scanner tạo). Rỗng thì nhảy tới bước 3.

## 1. Kiểm từng deal nghi vi phạm (bằng Chrome, claude-in-chrome)
Mở `url` của từng candidate (trang sản phẩm, không phải trang search; nếu là trang search thì tìm lại đúng SP rồi dùng link SP):
1. **Đúng shop**: shop chính hãng / Mall của brand, không phải shop bán lại.
2. **Đúng sản phẩm (xem cả ảnh)**: so tên, **ảnh bao bì**, dung tích, số lượng trong combo với deal Hannah (`product`).
   Ảnh SP khác bao bì / khác dung tích / combo khác số lượng thì `rejected`.
3. **Giá bán theo `RULES.md` mục 3**: đọc lại giá đang bán (`price`), giá gạch (`list_price`), voucher shop áp được (`seller_voucher`).
   Voucher sàn (Shopee/TikTok, freeship, thanh toán) chỉ ghi `platform_voucher`, không trừ.
4. **Quà theo `RULES.md` mục 4**: quà không hiện trên thumbnail thì kiểm promotion **mua 1 tặng SP 0đ** trên trang SP.
   Ghi từng món vào `gifts` (luôn có `ml`, có giá thì thêm `value`). `compare.py` tự chọn so theo giá quà hay theo ml,
   và luôn tính **cả 2 bên cùng một cách**: không bao giờ so quà sàn theo ml với giá quà Hannah ở cột H.
   Candidate `THIẾU DỮ LIỆU` = thiếu ml / giá 1 ml: bổ sung `gifts` của brand hoặc `data/hannah_gifts.json` (đọc cột M `Bao gồm`) rồi kết luận.
5. Kết luận (`RULES.md` mục 2, % saving = 1 - giá bán / (giá gốc + quà)):
   - `confirmed`: đúng SP, đúng shop, và % saving brand ≥ % saving Hannah - 2 điểm %.
   - `rejected`: sai SP/shop, hết hàng, hoặc % saving thực tế thấp hơn Hannah quá 2 điểm %.
6. Thêm verdict vào `DIR/data/qc.json` (list, chỉ thêm, không xoá):
   `{"stt","channel","url","price","list_price","seller_voucher","platform_voucher","gifts":[...],"verdict","reason","checked_at":"<ISO có múi giờ>"}`
   Dùng số QC vừa kiểm (không chép số của Scanner). `url` giữ đúng như candidate để không bị hỏi lại.

## 2. Tự học: phát hiện thêm deal vi phạm
- **Mapping**: ghi vào `DIR/data/mappings.json` `{"<link SP>": {"stt": "<STT Hannah>", "ok": true|false, "note": "..."}}`.
  `ok: true` = đúng SP của deal đó, Scanner lượt sau mở thẳng link này. `ok: false` = sai, Scanner bỏ qua cặp này.
- **Quét thêm trong shop**: khi đang ở shop chính hãng, xem thêm các SP khác của brand. Thấy SP nào khớp deal Hannah mà Scanner
  chưa có trong `scanned.json`, thêm vào `scanned.json` (`"match": "sure"`, `"found_by": "qc"`). Lượt sau sẽ được so và QC.
- **Bài học**: khi phát hiện cách nhận diện mới, ghi 1 dòng ngắn vào `DIR/data/lessons.md`, dạng
  `- [BRAND/kênh] <quy tắc>` (VD `- [SVR/shopee] "Bộ đôi" = combo 2; mã CBG06 = combo 2 Gel Moussant 400ml`,
  `- [PHYSIOGEL/shopee] hàng "[DATE ...]" là cận date, vẫn tính nhưng ghi rõ trong reason`).
  Không ghi trùng bài học đã có.

## 3. Kết thúc
- `python DIR/compare.py --qc-finish` → ghi `deal/watch/warnings.json` (chỉ deal confirmed, còn mới trong 48h) và `status.json`.
- Commit đúng 2 file đó (`[deal-watch] qc dd/mm HH:MM: N deal vi phạm`) rồi push lên main. Lỗi giữa chừng vẫn phải chạy bước này.
- Không vượt captcha, không đăng nhập hộ, không gửi email/tin nhắn. Đóng tab Chrome đã mở.
- Báo cáo: số deal confirmed / rejected lượt này, top 5 deal vi phạm (brand, deal, kênh, giá + quà brand so với Hannah), bài học mới đã ghi.
