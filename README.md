# ezs-dashboard

Tổng hợp các dashboard PFM, chạy trên GitHub Pages:
https://vynguyen-ho.github.io/ezs-dashboard/

## Các dashboard

| Thư mục | Tên | Team | Trạng thái |
|---|---|---|---|
| `/` | Dashboard Overview | PFM | Trang tổng (PFM Total làm sau) |
| `media/` | Media | Media | Live |
| `pr-mkt/` | Pr_MKT | Marketing | Live |
| `shopee/` | Shopee | Shopee | Live |
| `tiktok/` | Tiktok | Tiktok | Live |
| `facebook-hannaholala/` | Facebook_Hannaholala.com | Facebook | Coming soon |
| `hostlive/` | Hostlive | Hostlive | Coming soon |

Nguồn thông tin chuẩn cho người và AI: [`dashboards.json`](dashboards.json)
(slug, team, đường dẫn, thư mục data, script cập nhật, trạng thái).

## Quy ước

- Mỗi dashboard chỉ ghi dữ liệu vào `<slug>/data/` của chính nó.
- Script cập nhật nằm trong `tools/<slug>/`.
- Commit message có prefix: `[media] update data 05/11`, `[pr-mkt] fix chart`.
- Thêm dashboard mới: tạo thư mục, thêm một mục vào `dashboards.json`, thẻ trên trang chủ tự xuất hiện.
- Đổi `status` từ `coming_soon` sang `live` để mở link trên trang chủ.

## Lưu ý

Repo dùng GitHub Pages nên mọi dữ liệu trong repo đều xem được bằng link. Không đẩy token, API key, `.env` hay dữ liệu khách hàng.

## Giao diện

Mỗi dashboard có trang chính kiểu app điện thoại (`<slug>/index.html`, dùng chung `assets/app.css`)
và bảng chi tiết đầy đủ (`<slug>/detail.html`), có link qua lại.
