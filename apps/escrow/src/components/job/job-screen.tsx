"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase, Undo2 } from "lucide-react";
import {
  AddressChip,
  Amount,
  Avatar,
  Badge,
  Bar,
  Button,
  Card,
  CardBody,
  CopyButton,
  SectionTitle,
  SourceTag,
  Stat,
} from "@vku/ui";
import { NetworkWarning, useWallet } from "@vku/stellar";
import { TOKEN_CODE, explorer, formatAmount } from "@vku/stellar/server";

import { recordActivity, saveName } from "@/lib/api";
import { DEFAULT_ARBITER } from "@/lib/env";
import type { ActivityDto, JobMetaDto, JobStateDto, StepDto } from "@/lib/dto";
import { send, writeClient } from "@/lib/tx";
import { SplitNote } from "@/components/split-note";
import { useAction } from "@/components/use-action";

import { Activity } from "./activity";
import { AcceptModal, ResolveModal } from "./modals";
import { Steps, type Role } from "./steps";

const STATUS = {
  funded: { text: "Chờ người nhận", tone: "warn" as const },
  working: { text: "Đang làm", tone: "accent" as const },
  done: { text: "Đã xong", tone: "ok" as const },
  cancelled: { text: "Đã huỷ", tone: "neutral" as const },
};

/** A ticking clock that only starts in the browser, so no hydration mismatch. */
function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function sumWhere(steps: StepDto[], status: StepDto["status"]): bigint {
  return steps
    .filter((step) => step.status === status)
    .reduce((total, step) => total + BigInt(step.amount), 0n);
}

export function JobScreen({
  state,
  meta,
  activity,
}: {
  state: JobStateDto;
  meta: JobMetaDto | null;
  activity: ActivityDto[];
}) {
  const wallet = useWallet();
  const { busy, run } = useAction();
  const now = useNow();
  const [accepting, setAccepting] = useState(false);
  const [resolving, setResolving] = useState<StepDto | null>(null);

  const me = wallet.address;
  const role: Role =
    me === state.client
      ? "client"
      : me && me === state.worker
        ? "worker"
        : me === state.arbiter
          ? "arbiter"
          : "visitor";

  const released = sumWhere(state.steps, "released");
  const refunded = sumWhere(state.steps, "refunded");
  const split = sumWhere(state.steps, "split");
  const finished = state.steps.filter(
    (step) => step.status !== "open" && step.status !== "submitted" && step.status !== "disputed",
  ).length;

  const names = meta?.names ?? {};
  const status = STATUS[state.status];

  async function accept(name: string) {
    if (!me) return;
    await run("accept", async () => {
      const client = await writeClient(me, wallet.sign);
      const { hash } = await send(await client.accept({ job_id: state.id, worker: me }));
      await saveName(state.id, me, name).catch(() => null);
      await recordActivity(state.id, {
        kind: "accepted",
        actor: me,
        detail: name,
        txHash: hash,
      });
      setAccepting(false);
      return { hash, message: "Bạn đã nhận việc này" };
    });
  }

  async function cancelJob() {
    if (!me) return;
    await run("cancel", async () => {
      const client = await writeClient(me, wallet.sign);
      const { hash } = await send(await client.cancel_job({ job_id: state.id, caller: me }));
      await recordActivity(state.id, {
        kind: "cancelled",
        actor: me,
        detail: `Rút lại ${formatAmount(state.total)} ${TOKEN_CODE}`,
        txHash: hash,
      });
      return { hash, message: "Đã huỷ việc và rút tiền về ví" };
    });
  }

  function stepAction(
    step: StepDto,
    key: string,
    kind: string,
    message: string,
    call: (client: Awaited<ReturnType<typeof writeClient>>) => Promise<unknown>,
  ) {
    if (!me) return;
    void run(key, async () => {
      const client = await writeClient(me, wallet.sign);
      const { hash } = (await call(client)) as { hash: string | null };
      await recordActivity(state.id, {
        kind,
        actor: me,
        detail: `${meta?.stepTitles[step.idx] ?? `Mốc ${step.idx + 1}`}: ${formatAmount(step.amount)} ${TOKEN_CODE}`,
        txHash: hash,
      });
      return { hash, message };
    });
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <NetworkWarning />
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-1.5 text-xs text-fg-faint transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Tất cả việc
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone={status.tone}>{status.text}</Badge>
              <Badge className="font-mono">Việc #{state.id}</Badge>
              <SourceTag kind="chain" />
              {role !== "visitor" ? (
                <Badge tone="accent">
                  {role === "client" ? "bạn là bên thuê" : role === "worker" ? "bạn làm việc này" : "bạn phân xử"}
                </Badge>
              ) : null}
            </div>
            <h1 className="text-2xl font-semibold sm:text-3xl">{state.title}</h1>
            {meta?.brief ? (
              <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-fg-soft">
                {meta.brief}
              </p>
            ) : null}
          </div>

          {meta ? (
            <div className="shrink-0 rounded-xl border border-line bg-surface px-4 py-3">
              <div className="flex items-center justify-between gap-6">
                <p className="text-[11px] tracking-wide text-fg-faint uppercase">Mã mời</p>
                <SourceTag kind="off" label="off-chain" />
              </div>
              <div className="mt-1 flex items-center gap-1">
                <span className="font-mono text-xl font-semibold tracking-[0.2em]">
                  {meta.inviteCode}
                </span>
                <CopyButton value={meta.inviteCode} />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Card>
        <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Còn khoá trong hợp đồng">
            <Amount value={formatAmount(state.locked)} code={TOKEN_CODE} tone="accent" size="lg" />
          </Stat>
          <Stat label="Đã trả người làm">
            <Amount value={formatAmount(released)} code={TOKEN_CODE} tone="ok" />
          </Stat>
          <Stat label="Đã trả lại khách">
            <Amount value={formatAmount(refunded)} code={TOKEN_CODE} tone="soft" />
          </Stat>
          <Stat label="Chia qua phân xử">
            <Amount value={formatAmount(split)} code={TOKEN_CODE} tone="warn" />
          </Stat>
        </CardBody>
        <div className="px-5 pb-5">
          <div className="mb-2 flex items-center justify-between text-xs text-fg-faint">
            <span>
              {finished}/{state.steps.length} mốc đã xong
            </span>
            <span>Tổng ngân sách {formatAmount(state.total)} {TOKEN_CODE}</span>
          </div>
          <Bar ratio={state.steps.length === 0 ? 0 : finished / state.steps.length} />
        </div>

        {me ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-line-soft px-5 py-4">
            {state.status === "funded" && role !== "client" ? (
              <Button onClick={() => setAccepting(true)} loading={busy === "accept"}>
                <Briefcase />
                Nhận việc này
              </Button>
            ) : null}

            {state.status === "funded" && role === "client" ? (
              <>
                <p className="text-sm text-fg-soft">
                  Gửi mã mời cho người bạn muốn thuê. Tiền đã khoá sẵn nên họ thấy việc là thật.
                </p>
                <Button
                  variant="ghost"
                  className="ml-auto"
                  loading={busy === "cancel"}
                  onClick={() => void cancelJob()}
                >
                  <Undo2 />
                  Huỷ và rút tiền về
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </Card>

      <div>
        <SectionTitle title="Các bên" right={<SourceTag kind="chain" />} />
        <Card>
          <CardBody className="grid gap-5 sm:grid-cols-3">
            <Party label="Bên thuê" address={state.client} name={names[state.client]} />
            <Party
              label="Người làm"
              address={state.worker}
              name={state.worker ? names[state.worker] : undefined}
              empty="Chưa có ai nhận"
            />
            <Party
              label="Người phân xử"
              address={state.arbiter}
              name={names[state.arbiter] ?? (state.arbiter === DEFAULT_ARBITER ? "Trọng tài lớp học" : undefined)}
              note="Chỉ được chia tiền giữa hai bên"
            />
          </CardBody>
        </Card>
      </div>

      <Steps
        state={state}
        titles={meta?.stepTitles ?? {}}
        role={role}
        now={now}
        busy={busy}
        onSubmit={(step) =>
          stepAction(step, `step-${step.idx}`, "submitted", "Đã bàn giao, khách bắt đầu có thời gian duyệt", (client) =>
            writeStep(client.submit({ job_id: state.id, idx: step.idx, worker: me! })),
          )
        }
        onApprove={(step) =>
          stepAction(step, `step-${step.idx}`, "approved", "Đã duyệt, tiền đã sang ví người làm", (client) =>
            writeStep(client.approve({ job_id: state.id, idx: step.idx, caller: me! })),
          )
        }
        onClaim={(step) =>
          stepAction(step, `step-${step.idx}`, "claimed", "Hết giờ duyệt, tiền đã về ví bạn", (client) =>
            writeStep(client.claim({ job_id: state.id, idx: step.idx, worker: me! })),
          )
        }
        onReclaim={(step) =>
          stepAction(step, `step-${step.idx}`, "reclaimed", "Quá hạn bàn giao, tiền đã quay về ví bạn", (client) =>
            writeStep(client.reclaim({ job_id: state.id, idx: step.idx, caller: me! })),
          )
        }
        onDispute={(step) =>
          stepAction(step, `dispute-${step.idx}`, "disputed", "Đã chuyển mốc này cho người phân xử", (client) =>
            writeStep(client.dispute({ job_id: state.id, idx: step.idx, caller: me! })),
          )
        }
        onResolve={(step) => setResolving(step)}
      />

      <Activity jobId={state.id} initial={activity} names={names} />

      <div>
        <SectionTitle
          title="Phần nào là blockchain"
          note="Mỗi ô dữ liệu trong trang này đến từ một trong hai chỗ"
        />
        <SplitNote />
      </div>

      <AcceptModal
        open={accepting}
        onOpenChange={setAccepting}
        onAccept={accept}
        busy={busy === "accept"}
        locked={state.locked}
      />

      <ResolveModal
        open={resolving !== null}
        onOpenChange={(next) => !next && setResolving(null)}
        busy={busy === "resolve"}
        amount={resolving?.amount ?? null}
        onResolve={async (bps) => {
          const step = resolving;
          if (!step || !me) return;
          await run("resolve", async () => {
            const client = await writeClient(me, wallet.sign);
            const { hash } = await send(
              await client.resolve({
                job_id: state.id,
                idx: step.idx,
                caller: me,
                worker_bps: bps,
              }),
            );
            await recordActivity(state.id, {
              kind: "resolved",
              actor: me,
              detail: `Chia ${bps / 100}% cho người làm`,
              txHash: hash,
            });
            setResolving(null);
            return { hash, message: "Đã phân xử xong mốc này" };
          });
        }}
      />
    </div>
  );
}

/** Every contract call here returns the same shape, so unwrap it in one place. */
async function writeStep(pending: Promise<Parameters<typeof send>[0]>) {
  return send(await pending);
}

function Party({
  label,
  address,
  name,
  empty,
  note,
}: {
  label: string;
  address: string | null;
  name?: string;
  empty?: string;
  note?: string;
}) {
  return (
    <div>
      <p className="text-[11px] tracking-wide text-fg-faint uppercase">{label}</p>
      {address ? (
        <div className="mt-2 flex items-center gap-2.5">
          <Avatar seed={address} name={name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{name ?? "Chưa đặt tên"}</p>
            <AddressChip address={address} href={explorer.account(address)} />
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-fg-faint">{empty}</p>
      )}
      {note ? <p className="mt-2 text-xs text-fg-faint">{note}</p> : null}
    </div>
  );
}
