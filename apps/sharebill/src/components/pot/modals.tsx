"use client";

import { useState } from "react";
import { Button, CodeInput, Field, Input, Modal, Notice } from "@vku/ui";
import { useWallet } from "@vku/stellar";
import { TOKEN_CODE, formatAmount, toStroops } from "@vku/stellar/server";

import { recordActivity } from "@/lib/api";
import { isAddress, send, writeClient } from "@/lib/tx";
import { useAction } from "@/components/use-action";

const QUICK = ["10", "25", "50", "100"];

export function ContributeModal({
  open,
  onOpenChange,
  potId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  potId: number;
  onDone: () => void;
}) {
  const wallet = useWallet();
  const { busy, run } = useAction();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const me = wallet.address;
    if (!me) return;

    let stroops: bigint;
    try {
      stroops = toStroops(amount);
      if (stroops <= 0n) throw new Error("Số tiền phải lớn hơn 0");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Số tiền không hợp lệ");
      return;
    }
    setError(null);

    await run("contribute", async () => {
      const client = await writeClient(me, wallet.sign);
      const { hash } = await send(
        await client.contribute({ pot_id: potId, from: me, amount: stroops }),
      );
      await recordActivity(potId, {
        kind: "funded",
        actor: me,
        detail: `Góp ${formatAmount(stroops)} ${TOKEN_CODE}`,
        txHash: hash,
      });
      setAmount("");
      onDone();
      return { hash, message: `Đã góp ${formatAmount(stroops)} ${TOKEN_CODE} vào hũ` };
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Góp tiền vào hũ"
      description="Tiền đi thẳng từ ví của bạn vào hợp đồng. Không ai rút lẻ ra được."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy !== null}>
            Thôi
          </Button>
          <Button onClick={() => void submit()} loading={busy === "contribute"}>
            Góp tiền
          </Button>
        </>
      }
    >
      <Field
        label={`Số tiền (${TOKEN_CODE})`}
        error={error}
        hint={
          wallet.balance === null
            ? undefined
            : `Ví bạn đang có ${formatAmount(wallet.balance)} ${TOKEN_CODE}`
        }
      >
        <CodeInput
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="50"
          inputMode="decimal"
          autoFocus
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        {QUICK.map((value) => (
          <Button key={value} size="sm" variant="outline" onClick={() => setAmount(value)}>
            {value}
          </Button>
        ))}
      </div>
    </Modal>
  );
}

export function SpendModal({
  open,
  onOpenChange,
  potId,
  balance,
  votesNeeded,
  members,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  potId: number;
  balance: string;
  votesNeeded: number;
  members: number;
  onDone: () => void;
}) {
  const wallet = useWallet();
  const { busy, run } = useAction();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const target = to.trim() || wallet.address || "";

  async function submit() {
    const me = wallet.address;
    if (!me) return;

    if (!isAddress(target)) {
      setError("Địa chỉ nhận phải là một ví Stellar hợp lệ");
      return;
    }

    let stroops: bigint;
    try {
      stroops = toStroops(amount);
      if (stroops <= 0n) throw new Error("Số tiền phải lớn hơn 0");
      if (stroops > BigInt(balance)) throw new Error("Hũ không còn đủ tiền");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Số tiền không hợp lệ");
      return;
    }
    setError(null);

    await run("request", async () => {
      const client = await writeClient(me, wallet.sign);
      const { hash } = await send(
        await client.request_spend({
          pot_id: potId,
          requester: me,
          to: target,
          amount: stroops,
          memo: memo.trim().slice(0, 80),
        }),
      );
      await recordActivity(potId, {
        kind: "requested",
        actor: me,
        detail: `${memo.trim() || "Yêu cầu chi"}: ${formatAmount(stroops)} ${TOKEN_CODE}`,
        txHash: hash,
      });
      setAmount("");
      setMemo("");
      onDone();
      return {
        hash,
        message:
          members > 1
            ? "Đã gửi yêu cầu, chờ cả nhóm bấm đồng ý"
            : "Hũ chỉ có bạn nên tiền đã chi luôn",
      };
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Tạo yêu cầu chi"
      description={
        members > 1
          ? `Cần ${votesNeeded} trên ${members} người đồng ý thì hợp đồng mới chuyển tiền.`
          : "Hũ đang chỉ có bạn, nên yêu cầu sẽ được chi ngay."
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy !== null}>
            Thôi
          </Button>
          <Button onClick={() => void submit()} loading={busy === "request"}>
            Gửi yêu cầu
          </Button>
        </>
      }
    >
      <Field label="Chi cho việc gì" hint="Ghi chú này nằm trên blockchain, cả nhóm đọc được">
        <Input
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          placeholder="Tiền khách sạn 2 đêm"
          maxLength={80}
          autoFocus
        />
      </Field>

      <Field
        label={`Số tiền (${TOKEN_CODE})`}
        error={error}
        hint={`Hũ còn ${formatAmount(balance)} ${TOKEN_CODE}`}
      >
        <CodeInput
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="120"
          inputMode="decimal"
        />
      </Field>

      <Field
        label="Trả vào ví nào"
        hint="Để trống thì trả về ví của bạn, trường hợp bạn đã ứng tiền trước"
      >
        <CodeInput
          value={to}
          onChange={(event) => setTo(event.target.value.trim())}
          placeholder={wallet.address ?? "G..."}
        />
      </Field>

      {members === 1 ? (
        <Notice tone="warn">
          Rủ thêm người vào hũ trước khi chi, để thấy rõ luật quá nửa đồng ý hoạt động thế nào.
        </Notice>
      ) : null}
    </Modal>
  );
}

export function JoinModal({
  open,
  onOpenChange,
  onJoin,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoin: (name: string) => Promise<void>;
  busy: boolean;
}) {
  const [name, setName] = useState("");

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Tham gia hũ"
      description="Ví của bạn sẽ ký một giao dịch để ghi tên vào danh sách thành viên trên blockchain."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Thôi
          </Button>
          <Button
            onClick={() => void onJoin(name.trim() || "Thành viên")}
            loading={busy}
          >
            Tham gia
          </Button>
        </>
      }
    >
      <Field label="Tên bạn trong nhóm" hint="Chỉ lưu trong app, không lên blockchain">
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
