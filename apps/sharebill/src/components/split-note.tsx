import { Database, Link2 } from "lucide-react";
import { Card, CardBody } from "@vku/ui";

/**
 * The exercise after the demo is to work out which half of the app is the
 * blockchain, so the app says it out loud.
 */
const ON_CHAIN = [
  "Tiền trong hũ, không ai rút lẻ ra được",
  "Luật chi: phải quá nửa thành viên đồng ý",
  "Số tiền từng người đã góp",
  "Phép chia đều và số tiền trả lại cuối chuyến",
];

const OFF_CHAIN = [
  "Tên hiển thị của từng người",
  "Mã mời 6 ký tự",
  "Dòng thời gian hoạt động bạn đang đọc",
  "Ghi chú, hình hoá đơn (nếu thêm sau này)",
];

export function SplitNote() {
  return (
    <Card>
      <CardBody className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-accent">
            <Link2 className="size-4" />
            Nằm trên blockchain
          </p>
          <ul className="mt-3 space-y-2">
            {ON_CHAIN.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-fg-soft">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-off">
            <Database className="size-4" />
            Nằm trong database của app
          </p>
          <ul className="mt-3 space-y-2">
            {OFF_CHAIN.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-fg-soft">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-off" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </CardBody>
    </Card>
  );
}
