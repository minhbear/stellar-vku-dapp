# Deploy

Mọi thứ cần để đưa hai app lên mạng. Hợp đồng đã nằm sẵn trên testnet nên phần
này chỉ còn là deploy hai web app và một database.

## Cách 1: Railway cho tất cả (khuyên dùng)

Một project Railway, ba service, dùng chung mạng nội bộ.

### 1. MongoDB

New → Database → **Add MongoDB**. Railway tự tạo biến `MONGO_URL` trong service
đó. Copy giá trị này.

### 2. Service `sharebill`

- New → GitHub Repo → `minhbear/stellar-vku-dapp`
- Settings → Config-as-code → **`apps/sharebill/railway.json`**
- Root Directory để nguyên `/` (Dockerfile build từ gốc repo vì đây là monorepo)
- Variables:
  ```
  MONGODB_URI=${{MongoDB.MONGO_URL}}
  MONGODB_DB=vku_sharebill
  ```
- Settings → Networking → **Generate Domain**

### 3. Service `escrow`

Giống hệt, chỉ khác:

- Config-as-code: **`apps/escrow/railway.json`**
- `MONGODB_DB=vku_escrow`

### 4. Nối ngược về trang khoá học

Trong repo `stellar-vku`, đặt hai biến môi trường rồi deploy lại:

```
NEXT_PUBLIC_SHAREBILL_URL=https://<domain sharebill>
NEXT_PUBLIC_ESCROW_URL=https://<domain escrow>
```

Hai nút trong chuyên đề 4 sẽ tự chuyển từ "Sắp có đường dẫn" thành link thật.

## Cách 2: Vercel cho web, Atlas cho database

Nếu muốn giữ web ở Vercel cho giống trang khoá học:

- Tạo một cluster miễn phí trên MongoDB Atlas, lấy chuỗi kết nối, và mở
  Network Access cho `0.0.0.0/0` (Vercel không có IP cố định).
- Tạo hai project Vercel từ cùng repo này, mỗi project đặt **Root Directory** là
  `apps/sharebill` và `apps/escrow`. Bật "Include files outside root directory".
- Mỗi project đặt `MONGODB_URI` và `MONGODB_DB`.

Vercel tự nhận Next.js nên không cần Dockerfile ở cách này.

## Biến môi trường

| Biến | Bắt buộc | Mặc định |
| --- | --- | --- |
| `MONGODB_URI` | có | không có |
| `MONGODB_DB` | nên đặt | `vku_sharebill` hoặc `vku_escrow` |
| `NEXT_PUBLIC_CONTRACT_ID` | không | địa chỉ hợp đồng hiện tại, nằm sẵn trong mã nguồn |
| `NEXT_PUBLIC_RPC_URL` | không | `https://soroban-testnet.stellar.org` |
| `NEXT_PUBLIC_TOKEN_ID` | không | SAC của XLM trên testnet |
| `NEXT_PUBLIC_DEFAULT_ARBITER` | không (chỉ app escrow) | ví của khoá học |
| `NEXT_PUBLIC_COURSE_URL` | không | trống, link ở footer sẽ ẩn đi |

Các biến `NEXT_PUBLIC_*` được nhúng lúc build. Vì đã có giá trị mặc định ngay
trong mã nguồn nên build không cần biến nào cả, chỉ cần đặt lại khi bạn deploy
hợp đồng mới.

## Nếu SDF reset testnet

Dữ liệu testnet có thể bị xoá. Khi đó:

```bash
npm run contracts:deploy
```

Lấy hai địa chỉ mới trong `deploy/testnet.json`, đặt `NEXT_PUBLIC_CONTRACT_ID`
cho từng service rồi deploy lại. Dữ liệu trong MongoDB vẫn còn nhưng trỏ tới các
hũ và việc cũ, nên tiện nhất là xoá hai database đi làm lại từ đầu.
