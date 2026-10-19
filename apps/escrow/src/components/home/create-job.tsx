"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Amount,
  Button,
  CodeInput,
  Field,
  Input,
  Modal,
  Notice,
  Select,
  Textarea,
} from "@vku/ui";
import { TOKEN_CODE, XLM_SAC, formatAmount, toStroops } from "@vku/stellar/server";
import { useWallet } from "@vku/stellar";

import { recordActivity, saveJobMeta } from "@/lib/api";
import { DEFAULT_ARBITER } from "@/lib/env";
import { describeError } from "@/lib/errors";
import { isAddress, send, writeClient } from "@/lib/tx";

/** Short windows exist so the two clock rules can be shown live in class. */
const REVIEW_OPTIONS = [
  { label: "2 phút (để demo)", value: 120 },
  { label: "10 phút", value: 600 },
  { label: "1 ngày", value: 86_400 },
  { label: "3 ngày", value: 259_200 },
  { label: "7 ngày", value: 604_800 },
];

const DEADLINE_OPTIONS = [
  { label: "5 phút (để demo)", value: 300 },
  { label: "1 giờ", value: 3_600 },
  { label: "1 ngày", value: 86_400 },
  { label: "3 ngày", value: 259_200 },
  { label: "7 ngày", value: 604_800 },
  { label: "14 ngày", value: 1_209_600 },
];

interface StepInput {
  title: string;
  amount: string;
  deadline: number;
}

const BLANK: StepInput = { title: "", amount: "", deadline: 86_400 };

/** Deadlines are picked as "from now", so the clock is read when you submit. */
function deadlinesFrom(steps: StepInput[]): bigint[] {
  const now = Math.floor(Date.now() / 1000);
  return steps.map((step) => BigInt(now + step.deadline));
}

export function CreateJob({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const wallet = useWallet();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [yourName, setYourName] = useState("");
  const [arbiter, setArbiter] = useState(DEFAULT_ARBITER);
  const [reviewSecs, setReviewSecs] = useState(120);
  const [steps, setSteps] = useState<StepInput[]>([
    { title: "Bản nháp đầu tiên", amount: "30", deadline: 300 },
    { title: "Bàn giao hoàn chỉnh", amount: "70", deadline: 3_600 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function patch(index: number, change: Partial<StepInput>) {
    setSteps((current) =>
      current.map((step, position) => (position === index ? { ...step, ...change } : step)),
    );
  }

  let total = 0n;
  let totalValid = true;
  for (const step of steps) {
    try {
      total += toStroops(step.amount || "0");
    } catch {
      totalValid = false;
    }
  }

  async function create() {
    const me = wallet.address;
    if (!me) return;

    if (title.trim().length < 3) {
      setError("Tên công việc hơi ngắn");
      return;
    }
    if (!isAddress(arbiter)) {
      setError("Địa chỉ người phân xử không hợp lệ");
      return;
    }

    let amounts: bigint[];
    try {
      amounts = steps.map((step) => {
        const value = toStroops(step.amount);
        if (value <= 0n) throw new Error("Mỗi mốc phải có số tiền lớn hơn 0");
        return value;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Số tiền không hợp lệ");
      return;
    }
    setError(null);

    setBusy(true);
    try {
      const client = await writeClient(me, wallet.sign);
      const tx = await client.create_job({
        client: me,
        title: title.trim(),
        token: XLM_SAC,
        arbiter,
        review_secs: BigInt(reviewSecs),
        amounts,
        deadlines: deadlinesFrom(steps),
      });
      const { hash, result } = await send(tx);
      const jobId = result.unwrap();

      await saveJobMeta({
        jobId,
        brief: brief.trim(),
        client: me,
        clientName: yourName.trim() || "Bên thuê",
        steps: steps.map((step, index) => ({
          idx: index,
          title: step.title.trim() || `Mốc ${index + 1}`,
        })),
      }).catch(() => null);
      await recordActivity(jobId, {
        kind: "posted",
        actor: me,
        detail: `Khoá ${formatAmount(total)} ${TOKEN_CODE} cho ${steps.length} mốc`,
        txHash: hash,
      });

      toast.success(`Đã đăng việc #${jobId} và khoá tiền vào hợp đồng`);
      onOpenChange(false);
      router.push(`/jobs/${jobId}`);
    } catch (caught) {
      toast.error(describeError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Đăng việc và khoá tiền"
      description="Toàn bộ ngân sách rời ví bạn ngay bây giờ và nằm trong hợp đồng cho tới khi từng mốc được duyệt."
      className="w-[min(44rem,calc(100vw-2rem))]"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Thôi
          </Button>
          <Button onClick={() => void create()} loading={busy} disabled={!totalValid}>
            Khoá {formatAmount(total)} {TOKEN_CODE}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên công việc" className="sm:col-span-2">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Landing page cho shop bánh"
            maxLength={60}
            autoFocus
          />
        </Field>

        <Field label="Mô tả" className="sm:col-span-2" hint="Phần này lưu trong app, không lên blockchain">
          <Textarea
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            placeholder="Một trang giới thiệu, có form đặt bánh, chạy tốt trên điện thoại."
            maxLength={600}
          />
        </Field>

        <Field label="Tên bạn">
          <Input
            value={yourName}
            onChange={(event) => setYourName(event.target.value)}
            placeholder="Minh"
            maxLength={40}
          />
        </Field>

        <Field label="Khách có bao nhiêu lâu để duyệt" hint="Quá hạn này mà im lặng thì người làm tự nhận tiền">
          <Select
            value={reviewSecs}
            onChange={(event) => setReviewSecs(Number(event.target.value))}
          >
            {REVIEW_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Người phân xử"
          className="sm:col-span-2"
          hint="Chỉ được chia tiền giữa hai bên, không bao giờ giữ được đồng nào"
        >
          <CodeInput
            value={arbiter}
            onChange={(event) => setArbiter(event.target.value.trim())}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium tracking-wide text-fg-soft uppercase">Các mốc</p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSteps((current) => [...current, { ...BLANK }])}
            disabled={steps.length >= 6}
          >
            <Plus />
            Thêm mốc
          </Button>
        </div>

        {steps.map((step, index) => (
          <div key={index} className="grid grid-cols-[1fr_6rem_8rem_auto] items-center gap-2">
            <Input
              value={step.title}
              onChange={(event) => patch(index, { title: event.target.value })}
              placeholder={`Mốc ${index + 1}`}
              maxLength={60}
            />
            <CodeInput
              value={step.amount}
              onChange={(event) => patch(index, { amount: event.target.value })}
              placeholder="50"
              inputMode="decimal"
            />
            <Select
              value={step.deadline}
              onChange={(event) => patch(index, { deadline: Number(event.target.value) })}
            >
              {DEADLINE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSteps((current) => current.filter((_, i) => i !== index))}
              disabled={steps.length === 1}
              aria-label="Xoá mốc"
            >
              <Trash2 />
            </Button>
          </div>
        ))}

        <p className="text-xs text-fg-faint">
          Cột giữa là số {TOKEN_CODE} cho mốc đó, cột phải là hạn bàn giao tính từ bây giờ.
        </p>
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      <Notice tone="accent" title="Bạn sắp khoá">
        <Amount value={formatAmount(total)} code={TOKEN_CODE} size="lg" tone="accent" />
      </Notice>
    </Modal>
  );
}
