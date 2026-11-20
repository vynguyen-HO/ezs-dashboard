# Rule so deal: Brand Deal Watch

Rule chung cho agent **Scanner** (`AGENT.md`), agent **QC** (`QC.md`) và `compare.py`.
Muốn đổi cách so deal thì sửa file này trước, rồi sửa `compare.py` cho khớp.

## 1. % saving

```
% saving = 1 - giá bán / tổng giá trị
tổng giá trị = giá gốc + giá trị quà
```

- **Hannah**: giá bán = `GIÁ WEB HANNAH` (cột J), giá gốc = `GIÁ GỐC` (cột G), giá trị quà = `GIÁ QUÀ` (cột H).
- **Brand**: giá bán theo mục 3, giá gốc = giá gạch trên trang SP (không có giá gạch thì lấy chính giá bán), giá trị quà theo mục 2.

## 2. Deal brand "hơn" hoặc "ngang" Hannah

| Mức | Điều kiện | Xử lý |
|---|---|---|
| **TỐT HƠN** | % saving brand > % saving Hannah | Scanner đưa vào hàng chờ QC. **Chỉ mức này mới được báo violate**, và chỉ khi QC xác nhận |
| **NGANG** | % saving brand thấp hơn Hannah không quá 2 điểm % | Vẫn đưa QC kiểm lại (số Scanner có thể sai). QC tính lại vẫn ngang thì chỉ **theo dõi**, không báo violate |
| Không vi phạm | % saving brand thấp hơn Hannah hơn 2 điểm % | Bỏ qua |

Chỉ so cùng sản phẩm, cùng dung tích, cùng số lượng trong combo, trên shop chính hãng / Mall của brand.

### Điều kiện để báo violate (QC bắt buộc)
Một deal chỉ lên dashboard là **violate** khi đủ cả 3:
1. QC đã mở lại đúng trang SP và đọc lại số liệu **của chính QC** (không chép số của Scanner).
2. QC đánh dấu đủ checklist `checks` trong `qc.json`, tất cả `true`:
   `same_product` (đúng SP, dung tích, combo, đã xem ảnh), `official_shop` (shop chính hãng / Mall),
   `seller_voucher_only` (chỉ trừ voucher seller, không trừ voucher sàn), `gifts_checked` (đã kiểm quà, kể cả promotion mua 1 tặng 0đ),
   `gift_ml_both` (quà có ml cho mọi món ở cả 2 bên, hoặc cả 2 bên đều có giá quà).
3. `compare.py` tính lại từ số của QC theo đúng file này ra **TỐT HƠN** (% saving brand > % saving Hannah).

Thiếu 1 điều kiện thì không báo violate.

## 3. Giá bán của brand

- Lấy **giá sau khi trừ giảm giá của seller**: giá seller tự giảm (giá đang bán so với giá gạch) và **voucher của shop/seller** áp được cho 1 sản phẩm này.
- **KHÔNG trừ voucher sàn** (voucher Shopee / TikTok, freeship, voucher thanh toán, xu). Thấy thì chỉ ghi vào `platform_voucher` để tham khảo.
- Voucher shop có điều kiện đơn tối thiểu cao hơn giá 1 sản phẩm thì không trừ.

Ghi vào data: `price` = giá đang bán (sau seller tự giảm), `seller_voucher` = số tiền voucher shop áp được (0 nếu không có).
`compare.py` tính giá bán = `price - seller_voucher`.

## 4. Giá trị quà (2 bên phải tính cùng một cách)

### 4.1 Tìm quà bên brand
- Đọc quà trên thumbnail / thẻ search và trang SP.
- **Quà không hiện trên thumbnail**: mở trang SP kiểm tra promotion **mua 1 tặng thêm sản phẩm 0đ**
  (Shopee: "Quà tặng", "Mua kèm deal sốc" giá 0đ; TikTok: "Quà tặng kèm"; Website: mô tả khuyến mãi). Có món 0đ thì tính là quà.
- Món quà có ghi giá (brand ghi "trị giá …", giá trên trang quà) thì ghi `value`. Món nào cũng ghi `ml` (hoặc g / miếng / viên).

### 4.2 Chọn cách tính: theo giá quà hay theo ml
| Trường hợp | Cách tính cho **cả 2 bên** |
|---|---|
| Brand có giá **mọi** món quà **và** Hannah có giá quà (cột H) | **Theo giá quà**: brand = tổng `value`, Hannah = cột H |
| **Một trong 2 bên** thiếu giá quà | **Theo ml**: quy đổi quà của **cả brand lẫn Hannah** theo giá 1 ml |

- Bên không có quà tính là "có giá quà = 0".
- **Cấm so lệch**: KHÔNG được tính quà sàn theo ml mà quà Hannah lại lấy giá quà brand đưa (cột H), và ngược lại.
  Đã chuyển sang ml thì quà Hannah cũng phải quy đổi theo ml từ danh sách quà của deal Hannah (cột `Bao gồm`).

### 4.3 Quy đổi theo ml
```
giá 1 ml = giá gốc SP chính / dung tích SP chính
giá trị quà = số lượng x dung tích quà x giá 1 ml
```
- Giá gốc = giá gạch / giá niêm yết của SP chính, **không dùng giá đang bán**.
- **Cùng một loại quà thì dùng cùng một giá 1 ml cho cả 2 bên.** Mặc định lấy giá 1 ml từ giá gốc Hannah (cột G) / dung tích SP chính của deal.
- Quà khác loại với SP chính (VD tặng serum khi mua sữa rửa mặt) thì dùng giá 1 ml của **chính loại đó** (giá gốc / dung tích, lấy từ deal list Hannah hoặc shop chính hãng), cũng dùng chung cho 2 bên.
- Ví dụ: Sữa rửa mặt 100ml giá gốc 100k tặng 10ml sữa rửa mặt mini ⇒ 1ml = 1k ⇒ quà = 10k.
- Không quy đổi được một món ở bên nào thì không kết luận được: để `compare.py` báo thiếu dữ liệu, QC bổ sung.

### 4.4 Ghi data
- Brand, trong `scanned.json` / `qc.json`, `gifts` mỗi món:
  `{"name": "Gel 55ml", "qty": 2, "ml": 55, "value": null, "unit_price": null, "source": "thumb|promo_0d|page"}`
- Hannah, trong `data/hannah_gifts.json` (agent đọc từ cột `Bao gồm` của deal list):
  `{"<STT>": {"main_ml": 400, "gifts": [{"name": "Gel 55ml", "qty": 2, "ml": 55}, {"name": "Serum 2ml", "qty": 1, "ml": 2, "unit_price": 27533}]}}`
- `unit_price` để trống = dùng giá 1 ml của SP chính (giá gốc Hannah / `main_ml`). Quà khác loại thì điền `unit_price`, và điền **giống nhau** ở cả 2 bên.

## 5. Ví dụ (deal SVR Gel 400ml)

Deal Hannah: giá gốc 622k, giá bán 572k, quà cột H = 470k, `Bao gồm` = 2 Gel 55ml + 1 Serum 2ml.
Brand: giá gạch 622k, đang bán 570k, voucher shop 40k, voucher Shopee 30k, tặng 2 Gel 55ml **không ghi giá**.

- Giá bán brand = 570 - 40 = **530k** (không trừ voucher Shopee 30k).
- Brand thiếu giá quà ⇒ **cả 2 bên tính theo ml**. Giá 1 ml Gel = 622k / 400 = 1.555đ; Serum 30ml giá gốc 826k ⇒ 27.533đ/ml.
- Quà brand = 2 x 55 x 1.555 = **171k** ⇒ saving brand = 1 - 530 / (622 + 171) = **33,2%**.
- Quà Hannah = 2 x 55 x 1.555 + 1 x 2 x 27.533 = **226k** ⇒ saving Hannah = 1 - 572 / (622 + 226) = **32,6%**.
- Brand 33,2% > Hannah 32,6% ⇒ **TỐT HƠN** (vi phạm).
- Nếu so lệch (quà brand theo ml, Hannah lấy 470k cột H) thì Hannah ra 47,6% và deal này bị bỏ sót. Đây là lý do phải tính cùng một cách.
