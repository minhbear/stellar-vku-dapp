import { Lock, MilestoneIcon, TimerReset } from "lucide-react";
import { Card, CardBody, PageHeader, SectionTitle } from "@vku/ui";
import { NetworkWarning } from "@vku/stellar";

import { MyJobs } from "@/components/home/my-jobs";
import { SplitNote } from "@/components/split-note";

const STEPS = [
  {
    icon: Lock,
    title: "Khách khoá tiền trước",
    body: "Toàn bộ ngân sách nằm trong hợp đồng ngay khi đăng việc, nên người nhận việc thấy tiền có thật.",
  },
  {
    icon: MilestoneIcon,
    title: "Trả theo từng mốc",
    body: "Làm xong mốc nào thì bàn giao mốc đó. Khách bấm duyệt là tiền tự chảy về ví người làm.",
  },
  {
    icon: TimerReset,
    title: "Hai cái đồng hồ giữ công bằng",
    body: "Khách im lặng quá hạn duyệt thì người làm tự nhận tiền. Người làm trễ hạn thì khách lấy lại tiền.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-12">
      <div>
        <NetworkWarning />
        <PageHeader
          title="Nhận job freelance mà không sợ bị bùng"
          lede="Không cần sàn trung gian ôm tiền và thu phần trăm. Tiền nằm trong một hợp đồng công khai, và điều kiện trả tiền được viết sẵn thành luật."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, body }, index) => (
          <Card key={title} className="animate-rise" style={{ animationDelay: `${index * 70}ms` }}>
            <CardBody>
              <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon className="size-5" />
              </span>
              <p className="mt-4 font-semibold">{title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-fg-soft">{body}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <MyJobs />

      <div>
        <SectionTitle
          title="Sau khi dùng xong, thử trả lời"
          note="Phần nào của app này thật sự là blockchain, phần nào chỉ là web thường?"
        />
        <SplitNote />
      </div>
    </div>
  );
}
