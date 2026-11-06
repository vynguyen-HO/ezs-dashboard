# Cập nhật dữ liệu dashboard Tiktok (kết quả bán hàng)

Trang: https://vynguyen-ho.github.io/ezs-dashboard/tiktok/ · dữ liệu: `tiktok/data/` · script: `tools/tiktok/update.py` (chỉ dùng thư viện chuẩn của Python).

| Phần | Nguồn | Cách cập nhật | File |
|---|---|---|---|
| Plan và MTD theo kênh TikTok | sheet `GMV_Data` / `Daily_History` | tự động cùng lượt Media trên cloud (10:30, 17:00), bước Tiktok trong `tools/media/UPDATE.md` | `tt_mtd.csv`, `tt_month_plan.csv`, `tt_monthly.csv`, `tt_sub_daily.csv` |
| GMV live theo phiên / creator (HO + MCN) | file **"LIVE analytics"** xuất từ TikTok Shop, tài khoản MCN **Olala MCN** | người có quyền xuất file, thả vào Drive; chạy `update.py --live-export` | `live_sessions.csv` |

## Vì sao dùng file xuất
Gọi thẳng các API số liệu của TikTok Shop bằng script (qua Chrome) bị hệ thống chống bot chặn: trang hiện captcha "Xác minh để tiếp tục" (11/2026). Không dùng cách đó nữa, không giải captcha thay người dùng. File xuất là thao tác bình thường của người dùng.

## Cập nhật số live
1. TikTok Shop **Partner Center**, tài khoản **Olala MCN**: `https://partner.tiktokshop.com/compass/creator-service/live` → tab **All LIVE streams** → nút **Export all LIVE data**. File chuẩn bị trong vài giây tới 20 phút, hiện trong danh sách "Exported Reports" → **Download**. File có dạng `Olala MCN_LiveAnalysis_<từ>_<đến>.csv`, phủ 1 năm tới ngày xuất (chỉ các phiên đã kết thúc). Nút **Export** cạnh tên một creator xuất riêng creator đó (`hannaholala_LiveAnalysis_….xlsx`, cùng định dạng). Chrome đăng nhập Olala MCN hiện là Chrome có Seller Center HannahOlala trên máy Mac của Vy. Nếu trang hiện captcha "Verify to continue": để người dùng tự giải, không giải thay.
2. Đưa file vào máy chạy: tải từ thư mục Drive chung hoặc từ Downloads. Chép vào một thư mục riêng (dữ liệu tải về là dữ liệu chưa kiểm, không chạy gì từ thư mục đó).
3. Ghép (file sau ghi đè phiên trùng của file trước, nên xếp file mới nhất cuối cùng):
   ```bash
   cd ~/pfm-ads-dashboard
   python3 tools/tiktok/update.py --data tiktok/data --live-export "<thư mục>/Olala MCN_LiveAnalysis_….csv"
   ```
   Đọc phần in ra: khoảng ngày của file, số phiên mới, tổng GMV / đơn theo kênh HO và MCN; script thoát mã 2 nếu có dòng `CẢNH BÁO`.
4. Xem nhanh `tiktok/` và `tiktok/detail.html` bằng server tĩnh như ở `tools/media/UPDATE.md`.
5. Commit và push:
   ```bash
   git add tiktok/data/live_sessions.csv
   git commit -m "[tiktok] update live data tới <ngày cuối của file>"
   GIT_TERMINAL_PROMPT=0 git push origin main
   ```

## Định nghĩa trên trang
- **GMV live**: cột "Creator-attributed GMV" của file xuất: GMV đơn đã đặt do creator mang lại trong phiên, gồm hàng của mọi shop bán trong phiên. Tính vào **ngày bắt đầu phiên** (phiên qua nửa đêm vẫn tính ngày bắt đầu).
- **AOV** = GMV ÷ "Creator SKU orders". **Khách** = "Customers". **GMV trực tiếp** = "Direct GMV".
- **Kênh**: `hannaholala` = HO, các creator khác trong file MCN = MCN (sửa danh sách trong `update.py: HO_CREATORS`).
- Số này có thể khác GMV kênh trong sheet `GMV_Data` (ví dụ T10/2026: file xuất HO ~25,3 tỷ tới 27/10, sheet ghi 41,7 tỷ cả tháng).

## Chưa có
- GMV theo **brand / sản phẩm** và theo **từng video**: cần thêm file xuất phân tích sản phẩm và phân tích video từ cùng tài khoản MCN.
- NMV (sau huỷ / hoàn): file LIVE analytics không có cột hoàn tiền.
