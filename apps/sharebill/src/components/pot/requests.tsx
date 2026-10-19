"use client";

import { Check, Receipt, X } from "lucide-react";
import {
  AddressChip,
  Amount,
  Avatar,
  AvatarStack,
  Badge,
  Button,
  Card,
  CardBody,
  Empty,
  SectionTitle,
  SourceTag,
  VoteDots,
} from "@vku/ui";
import { useWallet } from "@vku/stellar";
import { TOKEN_CODE, explorer, formatAmount } from "@vku/stellar/server";

import { recordActivity } from "@/lib/api";
import type { PotStateDto } from "@/lib/dto";
import { send, writeClient } from "@/lib/tx";
import { useAction } from "@/components/use-action";

const ORDER = { voting: 0, executed: 1, cancelled: 2 };

export function Requests({
  state,
  names,
}: {
  state: PotStateDto;
  names: Record<string, string>;
}) {
  const wallet = useWallet();
  const { busy, run } = useAction();
  const me = wallet.address;
  const isMember = Boolean(me && state.members.includes(me));

  const rows = [...state.requests].sort(
    (left, right) => ORDER[left.status] - ORDER[right.status] || right.id - left.id,
  );

  async function approve(requestId: number, amount: string) {
    if (!me) return;
    await run(`approve-${requestId}`, async () => {
      const client = await writeClient(me, wallet.sign);
      const { hash } = await send(
        await client.approve({ pot_id: state.id, request_id: requestId, member: me }),
      );
      await recordActivity(state.id, {
        kind: "approved",
        actor: me,
        detail: `Đồng ý chi ${formatAmount(amount)} ${TOKEN_CODE}`,
        txHash: hash,
      });
      return { hash, message: "Đã ghi phiếu đồng ý của bạn" };
    });
  }

  async function cancel(requestId: number) {
    if (!me) return;
    await run(`cancel-${requestId}`, async () => {
      const client = await writeClient(me, wallet.sign);
      const { hash } = await send(
        await client.cancel_request({ pot_id: state.id, request_id: requestId, caller: me }),
      );
      await recordActivity(state.id, {
        kind: "cancelled",
        actor: me,
        detail: `Huỷ yêu cầu #${requestId}`,
        txHash: hash,
      });
      return { hash, message: "Đã huỷ yêu cầu" };
    });
  }

  return (
    <div>
      <SectionTitle
        title="Yêu cầu chi"
        note={`Cần ${state.votesNeeded} trên ${state.members.length} người đồng ý thì hũ mới trả tiền`}
        right={<SourceTag kind="chain" />}
      />

      {rows.length === 0 ? (
        <Empty
          icon={<Receipt />}
          title="Chưa có yêu cầu chi nào"
          body="Khi cần lấy tiền ra khỏi hũ, tạo một yêu cầu để cả nhóm bấm đồng ý."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((request) => {
            const approved = request.approvals.length;
            const mineAlready = Boolean(me && request.approvals.includes(me));
            const voting = request.status === "voting";

            return (
              <Card key={request.id} className={voting ? "border-accent/25" : undefined}>
                <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <Avatar
                      seed={request.requester}
                      name={names[request.requester]}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="font-medium">{request.memo || "Không có ghi chú"}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-faint">
                        <span>{names[request.requester] ?? "Thành viên"} đề nghị trả cho</span>
                        <AddressChip address={request.to} href={explorer.account(request.to)} />
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-5">
                    <div className="text-right">
                      <Amount
                        value={formatAmount(request.amount)}
                        code={TOKEN_CODE}
                        tone={voting ? "default" : "soft"}
                      />
                      <div className="mt-1.5 flex items-center justify-end gap-2">
                        <VoteDots
                          approved={approved}
                          total={state.members.length}
                          needed={state.votesNeeded}
                        />
                        <span className="text-[11px] text-fg-faint">
                          {approved}/{state.votesNeeded}
                        </span>
                      </div>
                    </div>

                    {request.status === "executed" ? (
                      <Badge tone="ok">đã chi</Badge>
                    ) : request.status === "cancelled" ? (
                      <Badge tone="neutral">đã huỷ</Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        {isMember && !mineAlready ? (
                          <Button
                            size="sm"
                            loading={busy === `approve-${request.id}`}
                            onClick={() => void approve(request.id, request.amount)}
                          >
                            <Check />
                            Đồng ý
                          </Button>
                        ) : mineAlready ? (
                          <Badge tone="accent">
                            <Check />
                            bạn đã đồng ý
                          </Badge>
                        ) : null}

                        {me === request.requester ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={busy === `cancel-${request.id}`}
                            onClick={() => void cancel(request.id)}
                            aria-label="Huỷ yêu cầu"
                          >
                            <X />
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </div>
                </CardBody>

                {request.approvals.length > 0 ? (
                  <div className="flex items-center gap-2 border-t border-line-soft px-5 py-3">
                    <span className="text-xs text-fg-faint">Đã đồng ý</span>
                    <AvatarStack
                      people={request.approvals.map((address) => ({
                        seed: address,
                        name: names[address],
                      }))}
                    />
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
