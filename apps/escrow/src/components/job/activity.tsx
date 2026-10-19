"use client";

import {
  Avatar,
  Card,
  CardBody,
  DateText,
  Empty,
  SectionTitle,
  SourceTag,
  Timeline,
  TimelineItem,
  TxLink,
} from "@vku/ui";
import { History } from "lucide-react";
import { explorer } from "@vku/stellar/server";

import type { ActivityDto } from "@/lib/dto";

const KIND_LABEL: Record<string, string> = {
  posted: "đăng việc và khoá tiền",
  accepted: "nhận việc",
  cancelled: "huỷ việc và rút tiền về",
  submitted: "bàn giao mốc",
  approved: "duyệt và trả tiền",
  claimed: "tự nhận tiền vì khách im lặng",
  reclaimed: "lấy lại tiền vì trễ hạn",
  disputed: "khiếu nại",
  resolved: "phân xử",
};

export function Activity({
  initial,
  names,
}: {
  jobId: number;
  initial: ActivityDto[];
  names: Record<string, string>;
}) {
  return (
    <div>
      <SectionTitle
        title="Dòng thời gian"
        note="Danh sách này app tự ghi lại cho dễ đọc. Bằng chứng thật là đường dẫn giao dịch bên cạnh."
        right={<SourceTag kind="off" />}
      />

      {initial.length === 0 ? (
        <Empty icon={<History />} title="Chưa có hoạt động nào" />
      ) : (
        <Card>
          <CardBody>
            <Timeline>
              {initial.map((row, index) => (
                <TimelineItem
                  key={`${row.at}-${index}`}
                  last={index === initial.length - 1}
                  dotSize={28}
                  dot={<Avatar seed={row.actor} name={names[row.actor]} size="sm" />}
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p className="text-sm">
                      <span className="font-medium">
                        {names[row.actor] ?? `${row.actor.slice(0, 4)}...${row.actor.slice(-4)}`}
                      </span>{" "}
                      <span className="text-fg-soft">{KIND_LABEL[row.kind] ?? row.kind}</span>
                    </p>
                    <DateText at={Math.floor(new Date(row.at).getTime() / 1000)} />
                  </div>
                  {row.detail ? (
                    <p className="mt-0.5 text-sm text-fg-soft">{row.detail}</p>
                  ) : null}
                  {row.txHash ? (
                    <TxLink href={explorer.tx(row.txHash)} className="mt-1">
                      Giao dịch {row.txHash.slice(0, 8)}
                    </TxLink>
                  ) : null}
                </TimelineItem>
              ))}
            </Timeline>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
