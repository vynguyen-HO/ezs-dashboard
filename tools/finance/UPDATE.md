# Cập nhật module Finance (dashboard v2)

Dữ liệu: `finance/data/payments.csv` (platform,account,date,amount,status,kind,doc). Ghép bằng `tools/finance/build.py`.
Site công khai: chỉ lưu ngày, tài khoản, số tiền, trạng thái, loại, số hoá đơn. KHÔNG lưu số thẻ / 4 số cuối, mã tham chiếu, thông tin ngân hàng.
File thô để ở `~/Library/Caches/ezs-finance/` (không commit).

## Invoice Meta Ads
Chrome đăng nhập Business EZS / Olala MCN (lúc lập: Chrome HT, deviceId 5d59c88d…; Chrome HO bị Meta khoá chờ xác minh 23/11/2026).
1. Mở `https://adsmanager.facebook.com/adsmanager/billing_hub/payment_activity?asset_id=<ID>&business_id=342057313164780&payment_account_id=<ID>&placement=BILLING_HUB&date=<start>_<end>`
   (`date` = unix giây 00:00 giờ VN). Tài khoản: HO.com 932082637544640, HO4D 1812342749230140, X1 1216140423428044.
2. Bảng chỉ tải 10 dòng mỗi lần bấm "See more": trong trang chạy vòng lặp bấm "See more" và đọc `document.body.innerText`
   (mỗi giao dịch: ID, ngày, số tiền, phương thức, mã tham chiếu, trạng thái, số hoá đơn VAT FBADS-…, "Download PDF").
3. Xuất từng dòng `account,YYYY-MM-DD,amount,status,card|Ad credit,FBADS-…` ra clipboard (copy listener + click), `pbpaste > meta_<ACCOUNT>.csv`.

## Transaction Shopee (tài khoản Dịch vụ Hiển thị)
Seller Center từng shop → Dịch vụ Hiển thị → Tài khoản của tôi → Lịch sử giao dịch (`/portal/marketing/pas/wallet?tab=ads_credit_bill_label`).
Trang gọi `POST /api/pas/v1/transaction_history/get/` body `{"start_time","end_time","transaction_type_list":[],"limit":100,"offset","new_transaction_log_flag":true}`;
`amount` chia 100000 ra VND. Gọi theo từng tháng (Shopee chỉ giữ ~6 tháng). Lưu `date,group,type,amount,transaction_id` vào `sp_<shop>.csv`.
Đã có: olalamedia2 (từ 01/06/2026). Chưa có: hannahteam1, hannahteam3 (Chrome của shop đó chưa mở lúc lập).

## Invoice TikTok
MCP TikTok for Business không có API hoá đơn / thanh toán (23/11/2026). Cần Chrome đăng nhập ads.tiktok.com (Billing), chưa có.

## Ghép
```bash
python3 tools/finance/build.py ~/Library/Caches/ezs-finance finance/data
```
File thô của một tài khoản thay các dòng của tài khoản đó trong khoảng ngày của file; tài khoản khác giữ nguyên.
