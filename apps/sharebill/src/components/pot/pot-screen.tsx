"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Scale, UserPlus, Wallet } from "lucide-react";
import {
  AddressChip,
  Amount,
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CopyButton,
  Notice,
  Ring,
  SectionTitle,
  SourceTag,
  Stat,
} from "@vku/ui";
import { NetworkWarning, useWallet } from "@vku/stellar";
import { TOKEN_CODE, explorer, formatAmount } from "@vku/stellar/server";

import { recordActivity, saveMemberName } from "@/lib/api";
import type { ActivityDto, PotMetaDto, PotStateDto } from "@/lib/dto";
import { send, writeClient } from "@/lib/tx";
import { SplitNote } from "@/components/split-note";
import { useAction } from "@/components/use-action";

import { Activity } from "./activity";
import { ContributeModal, JoinModal, SpendModal } from "./modals";
import { Requests } from "./requests";

const STATUS = {
  open: { text: "Đang mở", tone: "accent" as const },
  settling: { text: "Đang quyết toán", tone: "warn" as const },
  closed: { text: "Đã chốt", tone: "neutral" as const },
};

export function PotScreen({
  state,
  meta,
  activity,
}: {
  state: PotStateDto;
  meta: PotMetaDto | null;
  activity: ActivityDto[];
}) {
  const wallet = useWallet();
  const { busy, run } = useAction();
  const [contributing, setContributing] = useState(false);
  const [spending, setSpending] = useState(false);
  const [joining, setJoining] = useState(false);

  const me = wallet.address;
  const isMember = Boolean(me && state.members.includes(me));
  const isCreator = Boolean(me && state.creator === me);
  const mine = state.positions.find((position) => position.address === me);

  const totalIn = BigInt(state.totalIn);
  const balance = BigInt(state.balance);
  const members = BigInt(state.members.length || 1);
  const perHead = state.status === "open" ? BigInt(state.totalOut) / members : BigInt(state.share);
  const debtors = state.positions.filter((position) => BigInt(position.debt) > 0n);
  const ratio = totalIn > 0n ? Number((balance * 1000n) / totalIn) / 1000 : 0;

  async function join(name: string) {
    if (!me) return;
    await run("join", async () => {
      const client = await writeClient(me, wallet.sign);
      const { hash } = await send(await client.join({ pot_id: state.id, member: me }));
      await saveMemberName(state.id, me, name).catch(() => null);
      await recordActivity(state.id, {
        kind: "joined",
        actor: me,
        detail: name,
        txHash: hash,
      });
      setJoining(false);
      return { hash, message: "Bạn đã vào hũ" };
    });
  }

  async function startSettle() {
    if (!me) return;
    await run("settle", async () => {
      const client = await writeClient(me, wallet.sign);
      const { hash } = await send(
        await client.start_settle({ pot_id: state.id, caller: me }),
      );
      await recordActivity(state.id, {
        kind: "settle_started",
        actor: me,
        detail: "Kết thúc chuyến đi",
        txHash: hash,
      });
      return { hash, message: "Đã chốt số liệu, giờ chia đều cho cả nhóm" };
    });
  }

  async function settleDebt() {
    if (!me || !mine) return;
    await run("debt", async () => {
      const client = await writeClient(me, wallet.sign);
      const { hash } = await send(
        await client.settle_debt({ pot_id: state.id, member: me }),
      );
      await recordActivity(state.id, {
        kind: "debt_settled",
        actor: me,
        detail: `Đóng bù ${formatAmount(mine.debt)} ${TOKEN_CODE}`,
        txHash: hash,
      });
      return { hash, message: "Đã đóng bù phần còn thiếu" };
    });
  }

  async function finalize() {
    if (!me) return;
    await run("finalize", async () => {
      const client = await writeClient(me, wallet.sign);
      const { hash } = await send(await client.finalize({ pot_id: state.id, caller: me }));
      await recordActivity(state.id, {
        kind: "closed",
        actor: me,
        detail: "Trả lại tiền dư cho cả nhóm",
        txHash: hash,
      });
      return { hash, message: "Hũ đã chốt, tiền dư đã về ví từng người" };
    });
  }

  const status = STATUS[state.status];

  return (
    <div className="flex flex-col gap-10">
      <div>
        <NetworkWarning />
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-1.5 text-xs text-fg-faint transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Tất cả hũ
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone={status.tone}>{status.text}</Badge>
              <Badge className="font-mono">Hũ #{state.id}</Badge>
              <SourceTag kind="chain" />
            </div>
            <h1 className="text-2xl font-semibold sm:text-3xl">{state.name}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-faint">
              <span>
                Người mở hũ{" "}
                <AddressChip address={state.creator} href={explorer.account(state.creator)} />
              </span>
            </p>
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
        <CardBody className="flex flex-col gap-8 lg:flex-row lg:items-center">
          <div className="flex items-center gap-6">
            <Ring
              ratio={ratio}
              label={
                <Amount value={formatAmount(state.balance)} size="md" tone="accent" />
              }
              sub={TOKEN_CODE}
            />
            <div className="flex flex-col gap-1">
              <p className="text-sm text-fg-soft">Còn trong hũ</p>
              <p className="text-xs text-fg-faint">
                Cả nhóm đã góp {formatAmount(state.totalIn)}, đã chi{" "}
                {formatAmount(state.totalOut)} {TOKEN_CODE}
              </p>
            </div>
          </div>

          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            <Stat label="Đã góp vào">
              <Amount value={formatAmount(state.totalIn)} code={TOKEN_CODE} />
            </Stat>
            <Stat label="Đã chi ra">
              <Amount value={formatAmount(state.totalOut)} code={TOKEN_CODE} tone="soft" />
            </Stat>
            <Stat
              label={state.status === "open" ? "Tạm tính mỗi người" : "Mỗi người chịu"}
              hint={state.status === "open" ? "Sẽ chốt lại khi kết thúc" : undefined}
            >
              <Amount value={formatAmount(perHead)} code={TOKEN_CODE} tone="warn" />
            </Stat>
          </div>
        </CardBody>

        {me ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-line-soft px-5 py-4">
            {!isMember && state.status === "open" ? (
              <Button onClick={() => setJoining(true)} loading={busy === "join"}>
                <UserPlus />
                Tham gia hũ
              </Button>
            ) : null}

            {isMember && state.status === "open" ? (
              <>
                <Button onClick={() => setContributing(true)}>
                  <Wallet />
                  Góp tiền
                </Button>
                <Button variant="secondary" onClick={() => setSpending(true)}>
                  Tạo yêu cầu chi
                </Button>
              </>
            ) : null}

            {isCreator && state.status === "open" ? (
              <Button
                variant="ghost"
                onClick={() => void startSettle()}
                loading={busy === "settle"}
                className="ml-auto"
              >
                <Scale />
                Kết thúc chuyến đi
              </Button>
            ) : null}
          </div>
        ) : null}
      </Card>

      {state.status === "settling" ? (
        <Card className="border-warn/30">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Quyết toán</CardTitle>
              <SourceTag kind="chain" />
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-5">
            <p className="text-sm leading-relaxed text-fg-soft">
              Cả chuyến chi {formatAmount(state.totalOut)} {TOKEN_CODE} cho{" "}
              {state.members.length} người, nên mỗi người chịu {formatAmount(state.share)}{" "}
              {TOKEN_CODE}. Ai góp ít hơn thì đóng bù, ai góp dư thì nhận lại đúng phần dư.
            </p>

            {mine && BigInt(mine.debt) > 0n ? (
              <Notice tone="warn" title="Bạn còn thiếu">
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Amount value={formatAmount(mine.debt)} code={TOKEN_CODE} tone="warn" size="lg" />
                  <Button size="sm" onClick={() => void settleDebt()} loading={busy === "debt"}>
                    Đóng bù ngay
                  </Button>
                </div>
              </Notice>
            ) : null}

            {mine && BigInt(mine.credit) > 0n ? (
              <Notice tone="ok" title="Bạn sẽ nhận lại">
                <Amount value={formatAmount(mine.credit)} code={TOKEN_CODE} tone="ok" size="lg" />
              </Notice>
            ) : null}

            {debtors.length > 0 ? (
              <Notice tone="neutral">
                Còn {debtors.length} người chưa đóng bù. Hợp đồng chỉ cho chốt khi mọi người đã
                đóng đủ, nên không ai bị trả thiếu.
              </Notice>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => void finalize()} loading={busy === "finalize"}>
                  Chốt hũ và trả lại tiền dư
                </Button>
                <p className="text-xs text-fg-faint">
                  Một giao dịch duy nhất trả tiền cho tất cả những người góp dư.
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      ) : null}

      <div>
        <SectionTitle
          title={`Thành viên (${state.members.length})`}
          note={
            state.status === "open"
              ? `Yêu cầu chi cần ${state.votesNeeded} trên ${state.members.length} người đồng ý`
              : undefined
          }
          right={<SourceTag kind="chain" label="số tiền on-chain" />}
        />
        <Card>
          <CardBody className="divide-y divide-line-soft p-0">
            {state.positions.map((position) => {
              const name = meta?.names[position.address];
              const debt = BigInt(position.debt);
              const credit = BigInt(position.credit);
              return (
                <div
                  key={position.address}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar seed={position.address} name={name} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {name ?? "Chưa đặt tên"}
                        {position.address === me ? (
                          <span className="ml-2 text-xs text-accent">bạn</span>
                        ) : null}
                        {position.address === state.creator ? (
                          <span className="ml-2 text-xs text-fg-faint">chủ hũ</span>
                        ) : null}
                      </p>
                      <AddressChip
                        address={position.address}
                        href={explorer.account(position.address)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[11px] text-fg-faint uppercase">Đã góp</p>
                      <Amount value={formatAmount(position.paid)} code={TOKEN_CODE} size="sm" />
                    </div>
                    {state.status !== "open" ? (
                      debt > 0n ? (
                        <Badge tone="warn">thiếu {formatAmount(position.debt)}</Badge>
                      ) : credit > 0n ? (
                        <Badge tone="ok">nhận lại {formatAmount(position.credit)}</Badge>
                      ) : (
                        <Badge tone="neutral">vừa đủ</Badge>
                      )
                    ) : null}
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>

      <Requests state={state} names={meta?.names ?? {}} />

      <Activity potId={state.id} initial={activity} names={meta?.names ?? {}} />

      <div>
        <SectionTitle
          title="Phần nào là blockchain"
          note="Mỗi ô dữ liệu trong trang này đến từ một trong hai chỗ"
        />
        <SplitNote />
      </div>

      <ContributeModal
        open={contributing}
        onOpenChange={setContributing}
        potId={state.id}
        onDone={() => setContributing(false)}
      />
      <SpendModal
        open={spending}
        onOpenChange={setSpending}
        potId={state.id}
        balance={state.balance}
        votesNeeded={state.votesNeeded}
        members={state.members.length}
        onDone={() => setSpending(false)}
      />
      <JoinModal open={joining} onOpenChange={setJoining} onJoin={join} busy={busy === "join"} />
    </div>
  );
}
