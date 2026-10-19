import { NextResponse } from "next/server";

import { readJobCard } from "@/lib/chain";
import { upsertName } from "@/lib/store";
import { isAddress } from "@/lib/tx";

/** Stores a display name for someone the chain already knows about. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobId = Number(id);
  if (!Number.isInteger(jobId) || jobId <= 0) {
    return NextResponse.json({ error: "Mã công việc không hợp lệ" }, { status: 400 });
  }

  let body: { address?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ" }, { status: 400 });
  }

  const address = String(body.address ?? "");
  const name = String(body.name ?? "").trim().slice(0, 40);
  if (!isAddress(address) || name.length === 0) {
    return NextResponse.json({ error: "Thiếu tên hoặc địa chỉ ví" }, { status: 400 });
  }

  const onChain = await readJobCard(jobId);
  if (!onChain) {
    return NextResponse.json({ error: "Không tìm thấy công việc" }, { status: 404 });
  }
  if (onChain.client !== address && onChain.worker !== address) {
    return NextResponse.json(
      { error: "Ví này chưa phải một bên của hợp đồng trên blockchain" },
      { status: 403 },
    );
  }

  try {
    await upsertName(jobId, address, name);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Không lưu được tên" }, { status: 503 });
  }
}
