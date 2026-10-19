import { NextResponse } from "next/server";

import { readPotCard } from "@/lib/chain";
import { upsertMemberName } from "@/lib/store";
import { isAddress } from "@/lib/tx";

/** Stores a display name for someone who has already joined on chain. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const potId = Number(id);
  if (!Number.isInteger(potId) || potId <= 0) {
    return NextResponse.json({ error: "Mã hũ không hợp lệ" }, { status: 400 });
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

  const onChain = await readPotCard(potId);
  if (!onChain) {
    return NextResponse.json({ error: "Không tìm thấy hũ trên blockchain" }, { status: 404 });
  }
  if (!onChain.members.includes(address)) {
    return NextResponse.json(
      { error: "Ví này chưa tham gia hũ trên blockchain" },
      { status: 403 },
    );
  }

  try {
    await upsertMemberName(potId, address, name);
    return NextResponse.json({ ok: true });
  } catch (caught) {
    console.error("POST members", caught);
    return NextResponse.json({ error: "Không lưu được tên" }, { status: 503 });
  }
}
