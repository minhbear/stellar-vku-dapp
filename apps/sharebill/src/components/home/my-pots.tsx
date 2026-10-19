"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, PiggyBank, Plus, Ticket } from "lucide-react";
import {
  Amount,
  AvatarStack,
  Badge,
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

import { fetchMyPots } from "@/lib/api";
import type { PotCardDto } from "@/lib/dto";

import { CreatePot } from "./create-pot";
import { JoinPot } from "./join-pot";

const STATUS_LABEL = {
  open: { text: "Đang mở", tone: "accent" as const },
  settling: { text: "Đang quyết toán", tone: "warn" as const },
  closed: { text: "Đã chốt", tone: "neutral" as const },
};

interface Loaded {
  owner: string;
  rows: PotCardDto[];
  error: string | null;
}

export function MyPots() {
  const wallet = useWallet();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const address = wallet.address;
  // Results are tagged with the wallet they belong to, so switching accounts
  // shows a spinner instead of the previous account's pots.
  const current = loaded && loaded.owner === address ? loaded : null;
  const pots = current?.rows ?? null;
  const error = current?.error ?? null;

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    fetchMyPots(address)
      .then(({ pots: rows }) => {
        if (!cancelled) setLoaded({ owner: address, rows, error: null });
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setLoaded({
          owner: address,
          rows: [],
          error: caught instanceof Error ? caught.message : "Không tải được danh sách hũ",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  if (!address) {
    return (
      <div>
        <SectionTitle title="Hũ của bạn" />
        <Empty
          icon={<PiggyBank />}
          title="Kết nối ví để bắt đầu"
          body="Bạn cần ví Freighter trên mạng Test Net. Chưa có XLM test thì bấm nút nhận ở góc trên."
        />
      </div>
    );
  }

  return (
    <div>
      <SectionTitle
        title="Hũ của bạn"
        right={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setJoining(true)}>
              <Ticket />
              Vào hũ bằng mã
            </Button>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus />
              Tạo hũ mới
            </Button>
          </div>
        }
      />

      {error ? (
        <Notice tone="warn" title="Phần off-chain đang lỗi">
          {error}. Hũ trên blockchain vẫn còn nguyên, bạn vẫn mở được bằng mã hũ.
        </Notice>
      ) : pots === null ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : pots.length === 0 ? (
        <Empty
          icon={<PiggyBank />}
          title="Chưa có hũ nào"
          body="Tạo hũ cho chuyến đi gần nhất, rồi gửi mã mời cho cả nhóm."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus />
              Tạo hũ mới
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {pots.map((pot, index) => {
            const status = STATUS_LABEL[pot.status];
            return (
              <Link
                key={pot.id}
                href={`/pots/${pot.id}`}
                className="group animate-rise"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <Card className="h-full transition-colors group-hover:border-accent/40">
                  <CardBody className="flex h-full flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{pot.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-fg-faint">Hũ #{pot.id}</p>
                      </div>
                      <Badge tone={status.tone}>{status.text}</Badge>
                    </div>

                    <div className="mt-auto flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[11px] tracking-wide text-fg-faint uppercase">
                          Còn trong hũ
                        </p>
                        <Amount
                          value={formatAmount(pot.balance)}
                          code={TOKEN_CODE}
                          size="lg"
                          tone="accent"
                        />
                      </div>
                      <AvatarStack
                        people={pot.members.map((member) => ({
                          seed: member,
                          name: pot.names[member],
                        }))}
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-line-soft pt-3">
                      <SourceTag kind="chain" label="số tiền on-chain" />
                      <span className="flex items-center gap-1 text-xs text-fg-faint transition-colors group-hover:text-accent">
                        Mở hũ
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

      <CreatePot open={creating} onOpenChange={setCreating} />
      <JoinPot open={joining} onOpenChange={setJoining} />
    </div>
  );
}
