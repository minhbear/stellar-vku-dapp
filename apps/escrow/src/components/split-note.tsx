import { Database, Link2 } from "lucide-react";
import { Card, CardBody } from "@vku/ui";

const ON_CHAIN = [
  "Tiền của khách bị khoá, không ai rút sớm được",
  "Số tiền và hạn chót của từng mốc",
  "Luật duyệt, luật hết hạn, quyền của người phân xử",
  "Mỗi lần trả tiền là một giao dịch công khai",
];

const OFF_CHAIN = [
  "Mô tả công việc và tên từng mốc",
  "Tên hiển thị của hai bên",
  "Mã mời 6 ký tự",
  "File bàn giao, tin nhắn (nếu thêm sau này)",
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
