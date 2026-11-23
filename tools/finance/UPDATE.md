# Cập nhật module Finance (dashboard v2)

Dữ liệu: `finance/data/payments.csv` (platform,account,date,amount,subtotal,tax,status,kind,doc). Ghép bằng `tools/finance/build.py`.
Site công khai: chỉ lưu ngày, tài khoản, số tiền, trạng thái, loại, số hoá đơn. KHÔNG lưu số thẻ / 4 số cuối, mã tham chiếu, thông tin ngân hàng.
File thô để ở `~/Library/Caches/ezs-finance/` (không commit).

## Invoice Meta Ads
Chrome đăng nhập Business EZS / Olala MCN (lúc lập: Chrome HT, deviceId 5d59c88d…; Chrome HO bị Meta khoá chờ xác minh 23/11/2026).
1. Mở `https://adsmanager.facebook.com/adsmanager/billing_hub/payment_activity?asset_id=<ID>&business_id=342057313164780&payment_account_id=<ID>&placement=BILLING_HUB&date=<start>_<end>`
   (`date` = unix giây 00:00 giờ VN). Tài khoản: HO.com 932082637544640, HO4D 1812342749230140, X1 1216140423428044.
2. Cách nhanh (23/11/2026): trong trang, bắt request GraphQL `BillingHubTransactionsTableConnection` (hook XHR rồi bấm "See more"),
   gọi lại với `variables` = `{count:200, cursor:null, start_time, end_time, id:<ID tài khoản>}` theo TỪNG THÁNG (cursor không dùng được).
   Mỗi giao dịch: `id`, `transaction_time`, `total_amount` (đã gồm thuế), `app_amount` (= Subtotal), `formatted_payment_status`,
   `payment_method_label` (chỉ dùng để phân biệt thẻ / Ad credit), `vat_invoice_id`. Tax = total − app_amount (VAT 10%).
3. Xuất `account,YYYY-MM-DD,total,status,card|Ad credit,FBADS-…,subtotal,tax` → `meta_<ACCOUNT>.csv`.

## Transaction Shopee (tài khoản Dịch vụ Hiển thị)
Seller Center từng shop → Dịch vụ Hiển thị → Tài khoản của tôi → Lịch sử giao dịch (`/portal/marketing/pas/wallet?tab=ads_credit_bill_label`).
Trang gọi `POST /api/pas/v1/transaction_history/get/` body `{"start_time","end_time","transaction_type_list":[],"limit":100,"offset","new_transaction_log_flag":true}`;
`amount` chia 100000 ra VND. Gọi theo từng tháng (Shopee chỉ giữ ~6 tháng). Lưu `date,group,type,amount,transaction_id` vào `sp_<shop>.csv`; build.py chỉ giữ group `topup` (Nạp tiền, Credit tặng).
Đã có (23/11/2026): hannahteam1, olalamedia2 (từ 01/06/2026), hannahteam2, hannahteam3 (từ 01/10/2026). Chrome mỗi shop theo deviceId ở `tools/shopee/README.md`.

## Invoice TikTok
MCP TikTok for Business không có API hoá đơn (23/11/2026), nên đọc trang TikTok Ads Manager → Billing → Invoices
(`https://ads.tiktok.com/i18n/account/payment_invoice?aadvid=<ID>`; Affiliate 7239635595482415105, HANNAHOLALA 7199958863389442049; Chrome HT đã đăng nhập).
1. Bấm nút dạng bảng (icon bên phải "Reports"). Bảng nằm trong shadow DOM (`KS-TABLE…`): đi qua các shadowRoot, đọc từng `tr`
   (ô có `<slot>`: lấy `assignedNodes({flatten:true})`). Cột: số hoá đơn, bên nhận, ngày phát hành, hạn, trạng thái (Paid / No need to pay), tổng tiền.
2. Chuyển trang bằng nút mũi tên phải trong `KS-PAGINATION…` thứ hai (12 hoá đơn / trang), về trang 1 trước khi đọc.
3. Xuất `account,date,amount,status,Hoá đơn,<số hoá đơn>,subtotal,tax` → `tiktok_<ACCOUNT>.csv` (Subtotal / Tax đọc từ ô tổng tiền).
"No need to pay" = hoá đơn không phải trả thêm (đã trả trước / bù bằng credit), vẫn tính vào "Tổng hoá đơn".

## Ghép
```bash
python3 tools/finance/build.py ~/Library/Caches/ezs-finance finance/data
```
File thô của một tài khoản thay các dòng của tài khoản đó trong khoảng ngày của file; tài khoản khác giữ nguyên.
