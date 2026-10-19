"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Briefcase, Plus, Ticket } from "lucide-react";
import {
  Amount,
  Badge,
  Bar,
  Button,
  Card,
  CardBody,
  Empty,
  Notice,
  SectionTitle,
  Skeleton,
  SourceTag,
} from "@vku/ui";
import { TOKEN_CODE, formatAmount } from "@vku/stellar/server";
import { useWallet } from "@vku/stellar";

import { fetchMyJobs } from "@/lib/api";
import type { JobCardDto } from "@/lib/dto";

import { CreateJob } from "./create-job";
import { OpenJob } from "./open-job";

const STATUS_LABEL = {
  funded: { text: "Chờ người nhận", tone: "warn" as const },
  working: { text: "Đang làm", tone: "accent" as const },
  done: { text: "Đã xong", tone: "ok" as const },
  cancelled: { text: "Đã huỷ", tone: "neutral" as const },
};

interface Loaded {
  owner: string;
  rows: JobCardDto[];
  error: string | null;
}

export function MyJobs() {
  const wallet = useWallet();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [creating, setCreating] = useState(false);
  const [opening, setOpening] = useState(false);

  const address = wallet.address;
  const current = loaded && loaded.owner === address ? loaded : null;
  const jobs = current?.rows ?? null;
  const error = current?.error ?? null;

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    fetchMyJobs(address)
      .then(({ jobs: rows }) => {
        if (!cancelled) setLoaded({ owner: address, rows, error: null });
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setLoaded({
          owner: address,
          rows: [],
          error: caught instanceof Error ? caught.message : "Không tải được danh sách việc",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  if (!address) {
    return (
      <div>
        <SectionTitle title="Việc của bạn" />
        <Empty
          icon={<Briefcase />}
          title="Kết nối ví để bắt đầu"
          body="Bạn cần ví Freighter trên mạng Test Net. Chưa có XLM test thì bấm nút nhận ở góc trên."
        />
      </div>
    );
  }

  return (
    <div>
      <SectionTitle
        title="Việc của bạn"
        right={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setOpening(true)}>
              <Ticket />
              Mở bằng mã
            </Button>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus />
              Đăng việc
            </Button>
          </div>
        }
      />

      {error ? (
        <Notice tone="warn" title="Phần off-chain đang lỗi">
          {error}. Hợp đồng trên blockchain vẫn nguyên, bạn vẫn mở được bằng mã việc.
        </Notice>
      ) : jobs === null ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : jobs.length === 0 ? (
        <Empty
          icon={<Briefcase />}
          title="Chưa có việc nào"
          body="Đăng một việc và chia nó thành vài mốc, rồi gửi mã mời cho người nhận."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus />
              Đăng việc
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {jobs.map((job, index) => {
            const status = STATUS_LABEL[job.status];
            const role = job.client === address ? "Bạn thuê" : "Bạn làm";
            return (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="group animate-rise"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <Card className="h-full transition-colors group-hover:border-accent/40">
                  <CardBody className="flex h-full flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{job.title}</p>
                        <p className="mt-0.5 font-mono text-xs text-fg-faint">
                          Việc #{job.id} · {role}
                        </p>
                      </div>
                      <Badge tone={status.tone}>{status.text}</Badge>
                    </div>

                    <div className="mt-auto">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[11px] tracking-wide text-fg-faint uppercase">
                            Còn khoá trong hợp đồng
                          </p>
                          <Amount
                            value={formatAmount(job.locked)}
                            code={TOKEN_CODE}
                            size="lg"
                            tone="accent"
                          />
                        </div>
                        <p className="text-xs text-fg-faint">
                          {job.done}/{job.steps} mốc xong
                        </p>
                      </div>
                      <Bar ratio={job.steps === 0 ? 0 : job.done / job.steps} className="mt-3" />
                    </div>

                    <div className="flex items-center justify-between border-t border-line-soft pt-3">
                      <SourceTag kind="chain" label="số tiền on-chain" />
                      <span className="flex items-center gap-1 text-xs text-fg-faint transition-colors group-hover:text-accent">
                        Mở việc
                        <ArrowRight className="size-3.5" />
                      </span>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <CreateJob open={creating} onOpenChange={setCreating} />
      <OpenJob open={opening} onOpenChange={setOpening} />
    </div>
  );
}
