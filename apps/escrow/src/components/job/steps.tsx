"use client";

import {
  Amount,
  Badge,
  Button,
  Card,
  CardBody,
  Countdown,
  SectionTitle,
  SourceTag,
  Timeline,
  TimelineItem,
} from "@vku/ui";
import { TOKEN_CODE, formatAmount } from "@vku/stellar/server";
import { AlertTriangle, Check, Clock, Hand, Scale, Undo2, Upload } from "lucide-react";

import type { JobStateDto, StepDto, StepStatus } from "@/lib/dto";

export type Role = "client" | "worker" | "arbiter" | "visitor";

const STATUS: Record<StepStatus, { text: string; tone: "neutral" | "accent" | "ok" | "warn" | "danger" }> = {
  open: { text: "chưa bàn giao", tone: "neutral" },
  submitted: { text: "đã bàn giao, chờ duyệt", tone: "accent" },
  released: { text: "đã trả cho người làm", tone: "ok" },
  refunded: { text: "đã trả lại khách", tone: "warn" },
  disputed: { text: "đang tranh chấp", tone: "danger" },
  split: { text: "đã chia qua phân xử", tone: "warn" },
};

const DOT: Record<StepStatus, string> = {
  open: "border-line bg-surface-2 text-fg-faint",
  submitted: "border-accent/50 bg-accent-soft text-accent",
  released: "border-ok/50 bg-ok/15 text-ok",
  refunded: "border-warn/50 bg-warn/15 text-warn",
  disputed: "border-danger/50 bg-danger/15 text-danger",
  split: "border-warn/50 bg-warn/15 text-warn",
};

function Icon({ status }: { status: StepStatus }) {
  if (status === "released") return <Check className="size-4" />;
  if (status === "refunded") return <Undo2 className="size-4" />;
  if (status === "disputed") return <AlertTriangle className="size-4" />;
  if (status === "split") return <Scale className="size-4" />;
  if (status === "submitted") return <Upload className="size-4" />;
  return <Clock className="size-4" />;
}

export function Steps({
  state,
  titles,
  role,
  now,
  busy,
  onSubmit,
  onApprove,
  onClaim,
  onReclaim,
  onDispute,
  onResolve,
}: {
  state: JobStateDto;
  titles: Record<number, string>;
  role: Role;
  now: number | null;
  busy: string | null;
  onSubmit: (step: StepDto) => void;
  onApprove: (step: StepDto) => void;
  onClaim: (step: StepDto) => void;
  onReclaim: (step: StepDto) => void;
  onDispute: (step: StepDto) => void;
  onResolve: (step: StepDto) => void;
}) {
  return (
    <div>
      <SectionTitle
        title="Các mốc"
        note="Tiền của từng mốc chỉ rời hợp đồng khi một trong các luật dưới đây được thoả"
        right={<SourceTag kind="chain" />}
      />

      <Card>
        <CardBody>
          <Timeline>
            {state.steps.map((step, index) => {
              const status = STATUS[step.status];
              const overdue = now !== null && now > step.deadline;
              const reviewOver = now !== null && step.reviewUntil > 0 && now >= step.reviewUntil;
              const key = `step-${step.idx}`;

              return (
                <TimelineItem
                  key={step.idx}
                  last={index === state.steps.length - 1}
                  dot={
                    <span
                      className={`flex size-9 items-center justify-center rounded-full border ${DOT[step.status]}`}
                    >
                      <Icon status={step.status} />
                    </span>
                  }
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {titles[step.idx] ?? `Mốc ${step.idx + 1}`}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Badge tone={status.tone}>{status.text}</Badge>
                        {step.status === "open" ? (
                          <span className="text-xs text-fg-faint">
                            hạn bàn giao{" "}
                            <Countdown until={step.deadline} className="inline" />
                          </span>
                        ) : null}
                        {step.status === "submitted" ? (
                          <span className="text-xs text-fg-faint">
                            khách duyệt trong{" "}
                            <Countdown until={step.reviewUntil} className="inline" />
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      <Amount
                        value={formatAmount(step.amount)}
                        code={TOKEN_CODE}
                        tone={step.status === "released" ? "ok" : "default"}
                      />

                      <div className="flex flex-wrap gap-2">
                        {role === "worker" && step.status === "open" && !overdue ? (
                          <Button
                            size="sm"
                            loading={busy === key}
                            onClick={() => onSubmit(step)}
                          >
                            <Upload />
                            Bàn giao
                          </Button>
                        ) : null}

                        {role === "worker" && step.status === "open" && overdue ? (
                          <span className="text-xs text-danger">
                            Trễ hạn, khách có quyền lấy lại tiền mốc này
                          </span>
                        ) : null}

                        {role === "client" && step.status === "open" && overdue ? (
                          <Button
                            size="sm"
                            variant="danger"
                            loading={busy === key}
                            onClick={() => onReclaim(step)}
                          >
                            <Undo2 />
                            Lấy lại tiền
                          </Button>
                        ) : null}

                        {role === "client" && step.status === "submitted" ? (
                          <>
                            <Button
                              size="sm"
                              loading={busy === key}
                              onClick={() => onApprove(step)}
                            >
                              <Check />
                              Duyệt và trả tiền
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              loading={busy === `dispute-${step.idx}`}
                              onClick={() => onDispute(step)}
                            >
                              <Hand />
                              Khiếu nại
                            </Button>
                          </>
                        ) : null}

                        {role === "worker" && step.status === "submitted" ? (
                          reviewOver ? (
                            <Button
                              size="sm"
                              loading={busy === key}
                              onClick={() => onClaim(step)}
                            >
                              <Clock />
                              Khách im lặng, nhận tiền
                            </Button>
                          ) : (
                            <span className="text-xs text-fg-faint">
                              Hết giờ duyệt mà khách im lặng thì bạn tự nhận được
                            </span>
                          )
                        ) : null}

                        {role === "arbiter" && step.status === "disputed" ? (
                          <Button size="sm" variant="secondary" onClick={() => onResolve(step)}>
                            <Scale />
                            Phân xử mốc này
                          </Button>
                        ) : null}

                        {step.status === "disputed" && role !== "arbiter" ? (
                          <span className="text-xs text-fg-faint">
                            Đang chờ người phân xử quyết định
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </TimelineItem>
              );
            })}
          </Timeline>
        </CardBody>
      </Card>
    </div>
  );
}
