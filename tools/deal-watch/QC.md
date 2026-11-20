# Brand Deal Watch: agent QC (chạy mỗi 2 giờ, 9h–23h, sau Scanner 1 giờ)

QC là bước kiểm tra cuối: QC **kiểm lại từng deal** Scanner đưa vào hàng chờ, và chỉ báo **violate** khi deal sàn **tốt hơn** deal Hannah
(% saving brand > % saving Hannah) theo đúng `RULES.md`. Deal ngang chỉ để theo dõi, không báo.
QC cũng là nơi agent **tự học**: mỗi lần kết luận, QC ghi lại mapping và bài học để Scanner lượt sau làm đúng hơn và bắt được nhiều deal hơn.

Repo `C:\Users\win\ezs-dashboard`, branch `main`. `DIR` = `tools/deal-watch/`, data trong `DIR/data/` (KHÔNG commit).

## 0. Bắt đầu
- `git pull --rebase`, `python DIR/compare.py --start qc`, commit `deal/watch/status.json` (`[deal-watch] qc start dd/mm HH:MM`) rồi push.
- Đọc `DIR/RULES.md` (cách tính deal hơn) và `DIR/data/lessons.md` (bài học cũ) trước khi làm.
- Hàng chờ = `DIR/data/candidates.json` (Scanner tạo). Rỗng thì nhảy tới bước 3.

## 1. Kiểm lại TỪNG deal trong hàng chờ (bằng Chrome, claude-in-chrome)
Hàng chờ gồm deal Scanner tính ra **TỐT HƠN**, **NGANG** (số Scanner có thể sai) và **THIẾU DỮ LIỆU**. Phải kiểm **hết**, không bỏ deal nào;
hết giờ thì phần còn lại để lượt sau (vẫn nằm trong hàng chờ, chưa được báo).

Với mỗi deal, mở `url` (trang SP; nếu là trang search thì tìm lại đúng SP rồi dùng link SP) và **tự đọc lại số liệu**, không chép số của Scanner.
Đánh dấu checklist `checks` (mỗi mục `true` / `false`), khớp `RULES.md` mục 2:

| Mục | Kiểm gì |
|---|---|
| `official_shop` | Shop chính hãng / Mall của brand, không phải shop bán lại |
| `same_product` | Đúng SP: tên, **ảnh bao bì**, dung tích, số lượng combo khớp deal Hannah (`product`) |
| `seller_voucher_only` | `price` = giá đang bán, `list_price` = giá gạch, `seller_voucher` = voucher shop áp được cho 1 SP. Voucher sàn chỉ ghi `platform_voucher`, **không trừ** (RULES.md mục 3) |
| `gifts_checked` | Đã đọc quà trên thumbnail **và** promotion mua 1 tặng SP 0đ trên trang SP; ghi đủ từng món vào `gifts` (RULES.md 4.1) |
| `gift_ml_both` | Cả 2 bên cùng có giá quà, **hoặc** mọi món quà của cả brand lẫn Hannah đều có `ml` (bổ sung `data/hannah_gifts.json` từ cột M `Bao gồm` nếu thiếu). Không bao giờ so quà sàn theo ml với giá quà cột H (RULES.md 4.2) |

Kết luận:
- `confirmed`: số liệu QC đọc lại đã đầy đủ và đúng rule (**mọi** mục checklist `true`). `compare.py` sẽ tự tính lại từ số của QC:
  ra **TỐT HƠN** thì báo violate, ra **NGANG** thì chỉ theo dõi, thấp hơn thì không báo.
- `rejected`: sai shop, sai SP, hết hàng, hoặc không đọc được đủ số liệu theo rule. Ghi rõ lý do trong `reason`.

Thêm verdict vào `DIR/data/qc.json` (list, chỉ thêm, không xoá):
`{"stt","channel","url","price","list_price","seller_voucher","platform_voucher","gifts":[...],"checks":{"official_shop":true,"same_product":true,"seller_voucher_only":true,"gifts_checked":true,"gift_ml_both":true},"verdict","reason","checked_at":"<ISO có múi giờ>"}`
`url` giữ đúng như trong hàng chờ để deal không bị hỏi lại.

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
- Báo cáo: số deal đã kiểm / confirmed / rejected lượt này, số deal violate (tốt hơn Hannah) và theo dõi (ngang), top 5 deal violate (brand, deal, kênh, giá + quà + % saving brand so với Hannah), số deal còn trong hàng chờ, bài học mới đã ghi.
