"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Field, Input, Modal, Notice } from "@vku/ui";
import { XLM_SAC } from "@vku/stellar/server";
import { useWallet } from "@vku/stellar";

import { recordActivity, savePotMeta } from "@/lib/api";
import { describeError } from "@/lib/errors";
import { send, writeClient } from "@/lib/tx";

export function CreatePot({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const wallet = useWallet();
  const router = useRouter();
  const [name, setName] = useState("");
  const [yourName, setYourName] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!wallet.address) return;
    setBusy(true);
    try {
      const client = await writeClient(wallet.address, wallet.sign);
      const tx = await client.create_pot({
        creator: wallet.address,
        name: name.trim(),
        token: XLM_SAC,
      });
      const { hash, result } = await send(tx);
      const potId = result.unwrap();

      // The pot exists on chain now. The name and the invite code are extras.
      await savePotMeta({
        potId,
        creator: wallet.address,
        creatorName: yourName.trim() || "Chủ hũ",
      }).catch(() => null);
      await recordActivity(potId, {
        kind: "created",
        actor: wallet.address,
        detail: name.trim(),
        txHash: hash,
      });

      toast.success(`Đã mở hũ #${potId} trên blockchain`);
      onOpenChange(false);
      setName("");
      router.push(`/pots/${potId}`);
    } catch (caught) {
      toast.error(describeError(caught));
    } finally {
      setBusy(false);
    }
  }

  const ready = name.trim().length >= 3 && Boolean(wallet.address);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Tạo hũ mới"
      description="Hũ sẽ được mở bằng một giao dịch trên Stellar. Bạn là thành viên đầu tiên."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Thôi
          </Button>
          <Button onClick={() => void create()} loading={busy} disabled={!ready}>
            Mở hũ
          </Button>
        </>
      }
    >
      <Field label="Tên chuyến đi" hint="Ví dụ: Đà Nẵng 3 ngày, Team building cuối năm">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Đà Nẵng 3 ngày"
          maxLength={60}
          autoFocus
        />
      </Field>

      <Field label="Tên bạn trong nhóm" hint="Chỉ để cả nhóm nhận ra nhau, không lên blockchain">
        <Input
          value={yourName}
          onChange={(event) => setYourName(event.target.value)}
          placeholder="Minh"
          maxLength={40}
        />
      </Field>

      <Notice tone="neutral">
        Hũ dùng XLM test. Ví của bạn sẽ hỏi ký một giao dịch, phí khoảng vài phần nghìn XLM.
      </Notice>
    </Modal>
  );
}
