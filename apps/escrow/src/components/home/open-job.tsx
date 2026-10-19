"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, CodeInput, Field, Modal } from "@vku/ui";

import { resolveInviteCode } from "@/lib/api";

export function OpenJob({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    const input = code.trim();
    setBusy(true);
    try {
      // A number is the job id itself; anything else is an invite code.
      const jobId = /^\d+$/.test(input) ? Number(input) : (await resolveInviteCode(input)).jobId;
      onOpenChange(false);
      setCode("");
      router.push(`/jobs/${jobId}`);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Không tìm thấy việc");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Mở việc bằng mã"
      description="Nhập mã mời 6 ký tự, hoặc số việc nếu bạn đã biết."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Thôi
          </Button>
          <Button onClick={() => void go()} loading={busy} disabled={code.trim().length < 1}>
            Mở việc
          </Button>
        </>
      }
    >
      <Field label="Mã mời hoặc số việc">
        <CodeInput
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="K3PX9A"
          maxLength={10}
          autoFocus
          onKeyDown={(event) => {
            if (event.key === "Enter") void go();
          }}
        />
      </Field>
    </Modal>
  );
}
