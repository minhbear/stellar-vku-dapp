# Stellar x VKU: hai dapp để học

Hai ứng dụng nhỏ chạy trên **Stellar testnet**, dùng trong buổi học "Phân tích một
dự án fintech ứng dụng blockchain". Sinh viên dùng thật bằng ví của mình, sau đó
phân tích lại xem phần nào của ứng dụng là blockchain và phần nào chỉ là web
thường.

| App | Bài toán đời thật | Luật chi tiền |
| --- | --- | --- |
| **Share Bill** (`apps/sharebill`) | Nhóm bạn đi chơi, góp tiền chung, ai giữ quỹ cũng ngại | Quá nửa thành viên đồng ý thì hũ mới trả tiền |
| **Chốt Job** (`apps/escrow`) | Nhận job freelance xong bị khách bùng, hoặc ứng tiền xong dev biến mất | Khách duyệt, hoặc hết thời gian duyệt, hoặc quá hạn bàn giao |

Hai app cố tình dùng hai pattern khác nhau: một bên luật là **lá phiếu**, một bên
luật là **điều kiện cộng thời gian**.

## Hợp đồng trên testnet

| Thứ | Địa chỉ |
| --- | --- |
| Share Bill | `CCFJKZ32GCBSWVKZ225YDVQOMH6T55HL6QSYAXCWXR3VBEU7XAU5MT74` |
| Chốt Job | `CDZQM46W3OLZNYU64OGJFX2VAADW3DS3TZC5466QYFMAOFJARRSR3TKZ` |
| Token dùng để thanh toán | XLM qua Stellar Asset Contract `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |

Địa chỉ mới nhất luôn nằm trong `deploy/testnet.json`.

## Cấu trúc

```
contracts/          hợp đồng Soroban viết bằng Rust
  sharebill/        hũ tiền chung
  escrow/           hợp đồng giữ tiền theo mốc
packages/
  ui/               design system dùng chung cho cả hai app
  stellar/          kết nối ví Freighter, định dạng số tiền, link explorer
  sharebill-client/ client TypeScript sinh từ hợp đồng
  escrow-client/    client TypeScript sinh từ hợp đồng
apps/
  sharebill/        Next.js, cổng 3101
  escrow/           Next.js, cổng 3102
```

Hai package `*-client` được sinh ra bằng `stellar contract bindings typescript`
và được commit vào repo, nên khi deploy không cần cài Rust hay Stellar CLI.

## Chạy ở máy

Cần Node 20 trở lên, một MongoDB đang chạy, và ví
[Freighter](https://www.freighter.app/) đặt ở mạng Test Net.

```bash
npm install
cp apps/sharebill/.env.example apps/sharebill/.env.local
cp apps/escrow/.env.example apps/escrow/.env.local
# MongoDB nhanh nhất:
docker run -d -p 27017:27017 --name vku-mongo mongo:7

npm run dev:sharebill   # http://localhost:3101
npm run dev:escrow      # http://localhost:3102
```

Chưa có XLM test thì bấm nút **Nhận XLM test** ở góc trên bên phải, friendbot sẽ
gửi về ví.

## Làm việc với hợp đồng

```bash
npm run contracts:test      # 15 bài test, không cần mạng
npm run contracts:build     # ra file wasm
npm run contracts:deploy    # deploy lên testnet, ghi lại deploy/testnet.json
npm run contracts:bindings  # sinh lại hai package client
```

Sau khi deploy lại, nhớ cập nhật `NEXT_PUBLIC_CONTRACT_ID` trong `.env.local` của
từng app và trong biến môi trường trên Railway.

## Deploy

Mỗi app có `Dockerfile` riêng, build từ **gốc repo** (vì là monorepo):

```bash
docker build -f apps/sharebill/Dockerfile -t sharebill .
docker build -f apps/escrow/Dockerfile -t escrow .
```

Trên Railway, tạo hai service trỏ vào cùng repo này, mỗi service dùng file cấu
hình `apps/<tên app>/railway.json`, cộng một service MongoDB. Biến môi trường
duy nhất bắt buộc khi chạy là:

```
MONGODB_URI=<chuỗi kết nối Mongo>
MONGODB_DB=vku_sharebill   # hoặc vku_escrow
```

Các biến `NEXT_PUBLIC_*` đều đã có giá trị mặc định trong mã nguồn, chỉ cần đặt
lại khi bạn deploy hợp đồng mới.

## Phần nào là blockchain

Đây cũng là đáp án cho bài tập cuối buổi.

**Share Bill**

| Trên blockchain | Trong MongoDB |
| --- | --- |
| Tiền trong hũ và số dư từng người | Tên hiển thị của từng người |
| Luật quá nửa đồng ý mới chi được | Mã mời 6 ký tự |
| Ghi chú của mỗi yêu cầu chi | Dòng thời gian hoạt động |
| Phép chia đều và số tiền trả lại | |

**Chốt Job**

| Trên blockchain | Trong MongoDB |
| --- | --- |
| Ngân sách bị khoá trong hợp đồng | Mô tả công việc, tên từng mốc |
| Số tiền và hạn chót của từng mốc | Tên hiển thị của hai bên |
| Luật duyệt, luật hết hạn, quyền phân xử | Mã mời 6 ký tự |
| Mỗi lần trả tiền là một giao dịch | Dòng thời gian hoạt động |

Cả hai app đều gắn nhãn `on-chain` hoặc `off-chain` ngay trên từng khối dữ liệu,
và mỗi hành động thành công đều kèm đường dẫn tới giao dịch trên Stellar Expert.

## Lưu ý

Đây là testnet. XLM trong app là tiền thử nghiệm, không có giá trị thật, và dữ
liệu testnet có thể bị SDF xoá khi họ reset mạng. Nếu điều đó xảy ra, chạy lại
`npm run contracts:deploy` rồi cập nhật địa chỉ hợp đồng.
