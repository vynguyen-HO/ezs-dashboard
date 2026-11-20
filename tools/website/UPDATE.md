# Cập nhật dữ liệu Website (S.com / Hannaholala.com)

Nguồn: sheet **MIX NOV'2026 Get Last Sheet** (id `1190CMois1ezHXJn8yKvs-ZPGxE5dJ26XjRQW4Ae3kFY`), tab `Final`. Sheet do flow Haravan đổ đơn liên tục, nhưng **chỉ giữ một số dòng giới hạn**: khi đầy, các ngày cũ nhất bị xoá. Vì vậy repo giữ một kho riêng trong `website/data/`, mỗi lần chạy chỉ ghép thêm, không bao giờ xoá ngày cũ.

| File | Nội dung |
|---|---|
| `web_daily.csv` | ngày × kênh (web / harasocial / livestream): đơn, sản phẩm, GMV, đơn huỷ, GMV huỷ |
| `web_sku_daily.csv` | ngày × kênh × SKU × brand × camp: như trên |
| `web_items.csv` | SKU → brand, tên sản phẩm |

- Scom = kênh **web** = Hannaholala.com. Dashboard v2 (ô Website ở Tổng quan) chỉ cộng kênh web vào GMV tổng; harasocial và livestream hiện riêng.
- GMV = số lượng × giá sản phẩm (trước giảm giá đơn), không tính đơn đã huỷ.
- **Không lưu thông tin khách hàng** (tên, SĐT, email, địa chỉ, mã đơn): site public. Chỉ đọc các cột dưới đây.

## Các bước
1. `cd ~/pfm-ads-dashboard && git pull --ff-only origin main`.
2. Gọi Sheets `get_values` cho **4 range, gửi cùng một lượt** (song song), vì flow ghi liên tục và các range đọc cách nhau vài phút sẽ lệch dòng:
   - `Final!A3:A71446` (mã đơn, chỉ để đếm đơn, không ghi ra file)
   - `Final!N3:O71446` (kênh, ngày đặt)
   - `Final!P3:T71446` (trạng thái huỷ ở cột thứ 4)
   - `Final!V3:AA71446` (tên SP, mã SP, hãng, số lượng, giá, camp)
   Kết quả lớn nên công cụ tự lưu ra file (dòng "Output has been saved to …"): dùng đường dẫn đó.
3. `python3 tools/website/update.py --data website/data --a <A> --no <NO> --pt <PT> --va <VA>`
   - Nếu báo "Các range lệch số dòng": đọc lại cả 4 range cùng lúc rồi chạy lại.
   - Đọc phần in ra: khoảng ngày của sheet, số ngày ghi đè, tổng GMV theo tháng. Có dòng CẢNH BÁO (kho bị trống ngày) thì không commit, báo lại.
4. `git status --short` chỉ được đổi `website/data`. Commit `[website] update data tới <dd/mm>`, dòng cuối `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, `git pull --rebase origin main`, `GIT_TERMINAL_PROMPT=0 git push origin main`.

## Quy tắc ghép
Ngày nào có trong sheet thì thay ngày đó trong kho (trạng thái huỷ còn đổi vài ngày sau khi đặt). Riêng ngày cũ nhất của sheet có thể đã bị cắt một phần do giới hạn dòng: chỉ thay khi sheet có ít nhất bằng số đơn kho đang có. Ngày hôm nay (chưa hết ngày) vẫn được ghi, lần chạy sau sẽ thay bằng số đủ.

Phải chạy ít nhất một lần trước khi sheet xoá mất ngày cũ (sheet giữ khoảng 4 tuần, lúc lập ngày 20/11/2026 có từ 22/10), nếu không kho sẽ trống những ngày đó.
