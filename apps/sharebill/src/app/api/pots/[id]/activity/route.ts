import { NextResponse } from "next/server";

import { listActivity, logActivity } from "@/lib/store";
import { isAddress } from "@/lib/tx";

const KINDS = new Set([
  "created",
  "joined",
  "funded",
  "requested",
  "approved",
  "cancelled",
  "settle_started",
  "debt_settled",
  "closed",
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

/** The feed is a convenience index. The proof of what happened is the tx hash. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const potId = Number(id);
  if (!Number.isInteger(potId) || potId <= 0) {
    return NextResponse.json({ error: "Mã hũ không hợp lệ" }, { status: 400 });
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
      potId,
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
