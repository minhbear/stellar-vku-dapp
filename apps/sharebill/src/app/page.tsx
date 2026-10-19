import { HandCoins, Scale, Vote } from "lucide-react";
import { Card, CardBody, PageHeader, SectionTitle } from "@vku/ui";
import { NetworkWarning } from "@vku/stellar";

import { MyPots } from "@/components/home/my-pots";
import { SplitNote } from "@/components/split-note";

const STEPS = [
  {
    icon: HandCoins,
    title: "Góp vào hũ",
    body: "Mỗi người góp số tiền tuỳ sức mình, không cần chia đều ngay từ đầu.",
  },
  {
    icon: Vote,
    title: "Chi phải có quá nửa đồng ý",
    body: "Muốn lấy tiền ra, tạo một yêu cầu chi. Quá nửa nhóm bấm đồng ý thì hũ tự trả tiền.",
  },
  {
    icon: Scale,
    title: "Hết chuyến thì chia đều",
    body: "Hũ tính lại mỗi người phải chịu bao nhiêu, ai thiếu thì đóng bù, ai góp dư thì nhận lại.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-12">
      <div>
        <NetworkWarning />
        <PageHeader
          title="Hũ tiền chung cho chuyến đi"
          lede="Cả nhóm góp tiền vào một hũ trên blockchain. Không ai giữ tiền hộ ai, và mọi đồng ra vào đều có dấu vết công khai."
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

      <MyPots />

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
