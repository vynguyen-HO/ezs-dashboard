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

| Mức | Điều kiện |
|---|---|
| **TỐT HƠN** | % saving brand > % saving Hannah |
| **NGANG** | % saving brand thấp hơn Hannah không quá 2 điểm % |
| Không vi phạm | % saving brand thấp hơn Hannah hơn 2 điểm % |

Chỉ so cùng sản phẩm, cùng dung tích, cùng số lượng trong combo, trên shop chính hãng / Mall của brand.

## 3. Giá bán của brand

- Lấy **giá sau khi trừ giảm giá của seller**: giá seller tự giảm (giá đang bán so với giá gạch) và **voucher của shop/seller** áp được cho 1 sản phẩm này.
- **KHÔNG trừ voucher sàn** (voucher Shopee / TikTok, freeship, voucher thanh toán, xu). Thấy thì chỉ ghi vào `platform_voucher` để tham khảo.
- Voucher shop có điều kiện đơn tối thiểu cao hơn giá 1 sản phẩm thì không trừ.

Ghi vào data: `price` = giá đang bán (sau seller tự giảm), `seller_voucher` = số tiền voucher shop áp được (0 nếu không có).
`compare.py` tính giá bán = `price - seller_voucher`.

## 4. Giá trị quà của brand

Làm theo thứ tự, dừng ở bước đầu tiên có số:

1. **Quà có ghi giá** (brand ghi "trị giá …", giá trên trang quà, giá bán lẻ của chính món đó trên shop): dùng giá đó.
2. **Quà không hiện trên thumbnail / thẻ search**: mở trang SP và kiểm tra các promotion **mua 1 tặng thêm sản phẩm 0đ**
   (Shopee: "Quà tặng", "Mua kèm deal sốc" giá 0đ; TikTok: "Quà tặng kèm"; Website: mô tả khuyến mãi). Có món 0đ thì tính là quà.
3. **Quà không có giá**: quy đổi theo **giá trên ml** (hoặc trên g / miếng / viên) của sản phẩm chính:
   ```
   giá 1 ml = giá gốc SP chính / dung tích SP chính
   giá trị quà = dung tích quà x giá 1 ml
   ```
   Ví dụ: Sữa rửa mặt 100ml giá 100k tặng 10ml sữa rửa mặt mini ⇒ 1ml = 1k ⇒ quà = 10k, cộng vào tổng giá trị rồi so với Hannah.
   Quà khác loại với SP chính (VD tặng tẩy trang khi mua kem dưỡng) thì lấy giá trên ml của **chính loại đó** trên shop chính hãng.
   Không quy đổi được thì để trống giá trị món đó và ghi rõ trong `reason`.

Ghi vào data `gifts` (list), mỗi món:
`{"name": "SRM mini", "qty": 1, "ml": 10, "value": null, "unit_price": 1000, "source": "thumb|promo_0d|page"}`
- `value`: giá 1 món quà nếu có (bước 1). Có `value` thì `compare.py` tính `qty x value`.
- `ml` + `unit_price` (giá 1 ml): khi phải quy đổi (bước 3). `compare.py` tính `qty x ml x unit_price`.

## 5. Ví dụ

Deal Hannah: giá gốc 622k, quà 470k, giá bán 572k ⇒ saving = 1 - 572 / (622 + 470) = **47,6%**.

Brand: giá gạch 622k, đang bán 570k, voucher shop 40k, voucher Shopee 30k, tặng 2 SRM mini 55ml (không ghi giá, SP chính 400ml).
- Giá bán = 570 - 40 = **530k** (không trừ voucher Shopee 30k).
- Giá 1 ml = 622k / 400 = 1.555đ ⇒ quà = 2 x 55 x 1.555 = **171k**.
- Saving = 1 - 530 / (622 + 171) = **33,2%**, thấp hơn Hannah 14,4 điểm % ⇒ **không vi phạm**.
