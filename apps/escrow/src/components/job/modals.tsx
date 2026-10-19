"use client";

import { useState } from "react";
import { Button, Field, Input, Modal, Notice } from "@vku/ui";
import { TOKEN_CODE, formatAmount } from "@vku/stellar/server";

export function AcceptModal({
  open,
  onOpenChange,
  onAccept,
  busy,
  locked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (name: string) => Promise<void>;
  busy: boolean;
  locked: string;
}) {
  const [name, setName] = useState("");

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Nhận việc này"
      description="Sau khi bạn nhận, các mốc bắt đầu chạy và bạn có thể bàn giao từng mốc."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Thôi
          </Button>
          <Button onClick={() => void onAccept(name.trim() || "Người làm")} loading={busy}>
            Nhận việc
          </Button>
        </>
      }
    >
      <Notice tone="accent" title="Tiền đã nằm sẵn trong hợp đồng">
        {formatAmount(locked)} {TOKEN_CODE}. Khách không rút ra được nữa, trừ khi bạn trễ hạn
        bàn giao.
      </Notice>

      <Field label="Tên bạn" hint="Chỉ lưu trong app, không lên blockchain">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Lan"
          maxLength={40}
          autoFocus
        />
      </Field>
    </Modal>
  );
}

const SPLITS = [
  { label: "Người làm nhận hết", bps: 10_000 },
  { label: "Chia đôi", bps: 5_000 },
  { label: "Trả hết về khách", bps: 0 },
];

export function ResolveModal({
  open,
  onOpenChange,
  onResolve,
  busy,
  amount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (bps: number) => Promise<void>;
  busy: boolean;
  amount: string | null;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Phân xử mốc này"
      description="Bạn chỉ được chia số tiền của mốc giữa hai bên. Hợp đồng không cho bạn giữ lại đồng nào."
      footer={
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
          Đóng
        </Button>
      }
    >
      {amount ? (
        <Notice tone="neutral">
          Số tiền đang tranh chấp: {formatAmount(amount)} {TOKEN_CODE}
        </Notice>
      ) : null}

      <div className="flex flex-col gap-2">
        {SPLITS.map((split) => (
          <Button
            key={split.bps}
            variant="secondary"
            loading={busy}
            onClick={() => void onResolve(split.bps)}
            className="justify-between"
          >
            {split.label}
            <span className="font-mono text-xs text-fg-faint">{split.bps / 100}%</span>
          </Button>
        ))}
      </div>
    </Modal>
  );
}
