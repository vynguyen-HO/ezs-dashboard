# Brand Deal Watch: agent QC (chạy mỗi 2 giờ, 9h–23h, sau Scanner 1 giờ)

QC là bước kiểm tra cuối: QC **kiểm lại từng deal** Scanner đưa vào hàng chờ, và chỉ báo **violate** khi deal sàn **tốt hơn** deal Hannah
(% saving brand > % saving Hannah) theo đúng `RULES.md`. Deal ngang chỉ để theo dõi, không báo.
QC cũng là nơi agent **tự học**: mỗi lần kết luận, QC ghi lại mapping và bài học để Scanner lượt sau làm đúng hơn và bắt được nhiều deal hơn.

Repo `C:\Users\win\ezs-dashboard`, branch `main`. `DIR` = `tools/deal-watch/`, data trong `DIR/data/` (KHÔNG commit).

## 0. Bắt đầu
- `git pull --rebase`, `python DIR/compare.py --start qc`, commit `deal/watch/status.json` với **đúng dòng `COMMIT:`** lệnh vừa in ra (giờ Việt Nam) rồi push.
- Đọc `DIR/RULES.md` (cách tính deal hơn) và tab **Bài học** của sheet memory (ID `memory_sheet` trong `DIR/data/config.json`) trước khi làm.
- **Feedback KA trước tiên** (mục 2a): xử lý hết feedback mới rồi mới kiểm hàng chờ.
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
- **Bài học**: khi phát hiện cách nhận diện mới, thêm 1 dòng vào tab **Bài học** của sheet memory:
  `Thời gian | Áp dụng cho (Scanner / QC / Scanner + QC) | Brand / kênh | Quy tắc | Nguồn (QC tự học / Feedback KA #issue) | Ghi chú`.
  VD `SVR / shopee | "Bộ đôi" = combo 2; mã CBG06 = combo 2 Gel Moussant 400ml`. Không ghi trùng bài học đã có.

## 2a. Học từ feedback của KA (sheet memory)
KA bấm **Sai** + ghi lý do trên dashboard → mở một GitHub issue có label `deal-watch-feedback`.
- Đọc feedback mới: `gh issue list --repo vynguyen-HO/ezs-dashboard --label deal-watch-feedback --state open --json number,title,body,author,createdAt`.
  Cuối body có `<!-- deal-watch {...} -->` cho biết `stt`, `channel`, `url`, `checked_at` của deal bị báo sai.
- Với mỗi issue:
  1. Thêm 1 dòng vào tab **Feedback KA** của sheet memory: thời gian, người báo (login GitHub), số issue, STT, brand, deal, kênh, link SP,
     agent đã báo gì, lý do KA, `Lỗi của` (Scanner / QC / Rule / Data Hannah), bài học rút ra, đã báo Scanner (Có / Không), trạng thái `Đã học`.
  2. Mở lại deal, kiểm lại theo lý do KA. KA đúng thì thêm verdict `rejected` mới vào `qc.json` (deal rời dashboard ở lần `--qc-finish`)
     và sửa `mappings.json` nếu sai SP. KA sai thì ghi trạng thái `Không đồng ý` và giải thích trong cột bài học.
  3. Rút ra bài học, thêm vào tab **Bài học** (Nguồn = `Feedback KA #<số issue>`).
  4. Comment lên issue: QC đã học gì, đã đổi gì, rồi đóng issue (`gh issue comment` rồi `gh issue close`).
- Không xử lý issue không có label hoặc không có khối `deal-watch` (không phải feedback từ dashboard).

## 2b. Tự học sau mỗi lần đánh giá sai, báo Scanner đổi cách scan
QC tính là "đánh giá sai" khi:
- QC `rejected` một deal Scanner đưa lên (Scanner báo nhầm), **hoặc**
- KA báo sai một deal QC đã `confirmed` (QC báo nhầm), **hoặc**
- QC tìm thêm được deal vi phạm mà Scanner bỏ sót (mục 2, quét thêm trong shop).

Mỗi lần như vậy:
1. Xác định nguyên nhân: sai shop, sai SP / dung tích / combo, đọc sai giá, trừ nhầm voucher sàn, bỏ sót quà 0đ, quy đổi ml sai, sai số liệu Hannah.
2. Ghi 1 bài học vào tab **Bài học**, cột `Áp dụng cho` = `Scanner` nếu Scanner cần đổi cách scan (VD "SVR shopee: mở mục Quà tặng trên trang SP,
   thẻ search không hiện quà"), = `QC` nếu QC cần đổi cách kiểm.
3. Bài học nào đổi **cách scan** (thứ tự mở trang, chỗ đọc giá / quà, shop cần bỏ qua…) thì viết rõ thành bước làm, để Scanner lượt sau làm theo được ngay.
4. Lỗi lặp lại từ 3 lần trở lên cùng một nguyên nhân: ghi đề xuất sửa `AGENT.md` / `RULES.md` vào báo cáo cuối lượt để người duyệt.

## 3. Kết thúc
- `python DIR/compare.py --qc-finish` → ghi `deal/watch/warnings.json` (chỉ deal confirmed, còn mới trong 48h) và `status.json`.
- Commit đúng 2 file đó với **đúng dòng `COMMIT:`** lệnh vừa in ra rồi push lên main. Lỗi giữa chừng vẫn phải chạy bước này.
- Không vượt captcha, không đăng nhập hộ, không gửi email/tin nhắn. Đóng tab Chrome đã mở.
- Báo cáo: số deal đã kiểm / confirmed / rejected lượt này, số deal violate (tốt hơn Hannah) và theo dõi (ngang), top 5 deal violate (brand, deal, kênh, giá + quà + % saving brand so với Hannah), số deal còn trong hàng chờ, số feedback KA đã xử lý, bài học mới đã ghi (và bài học nào gửi Scanner).
