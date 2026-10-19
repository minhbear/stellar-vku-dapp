import { NextResponse } from "next/server";

import { listActivity, logActivity } from "@/lib/store";
import { isAddress } from "@/lib/tx";

const KINDS = new Set([
  "posted",
  "accepted",
  "cancelled",
  "submitted",
  "approved",
  "claimed",
  "reclaimed",
  "disputed",
  "resolved",
]);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const rows = await listActivity(Number(id));
    return NextResponse.json({
      activity: rows.map((row) => ({
        kind: row.kind,
        actor: row.actor,
        detail: row.detail,
        txHash: row.txHash,
        at: row.at.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ activity: [] });
  }
}

/** A convenience index. The proof of what happened is the transaction hash. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobId = Number(id);
  if (!Number.isInteger(jobId) || jobId <= 0) {
    return NextResponse.json({ error: "Mã công việc không hợp lệ" }, { status: 400 });
  }

  let body: { kind?: string; actor?: string; detail?: string; txHash?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ" }, { status: 400 });
  }

  const kind = String(body.kind ?? "");
  const actor = String(body.actor ?? "");
  if (!KINDS.has(kind) || !isAddress(actor)) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  try {
    await logActivity({
      jobId,
      kind,
      actor,
      detail: String(body.detail ?? "").slice(0, 160),
      txHash: body.txHash ? String(body.txHash).slice(0, 80) : null,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
