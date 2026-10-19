import { NextResponse } from "next/server";

import { readPotCard } from "@/lib/chain";
import { createPotMeta, namesOf, potsForAddress } from "@/lib/store";
import { isAddress } from "@/lib/tx";
import type { PotCardDto } from "@/lib/dto";

/** The pots this address belongs to, with their current state on the ledger. */
export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address") ?? "";
  if (!isAddress(address)) {
    return NextResponse.json({ error: "Địa chỉ ví không hợp lệ" }, { status: 400 });
  }

  try {
    const docs = await potsForAddress(address);
    const cards = await Promise.all(
      docs.map(async (doc) => {
        const state = await readPotCard(doc.potId);
        if (!state) return null;
        return { ...state, names: namesOf(doc) } satisfies PotCardDto;
      }),
    );
    return NextResponse.json({ pots: cards.filter(Boolean) });
  } catch (caught) {
    console.error("GET /api/pots", caught);
    return NextResponse.json({ error: "Không đọc được danh sách hũ" }, { status: 503 });
  }
}

/**
 * Saves the name, the invite code and the member list for a pot that already
 * exists on chain. The chain is the source of truth, so the server reads it
 * first and refuses anything it cannot see there.
 */
export async function POST(request: Request) {
  let body: { potId?: number; creator?: string; creatorName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ" }, { status: 400 });
  }

  const potId = Number(body.potId);
  const creator = String(body.creator ?? "");
  const creatorName = String(body.creatorName ?? "").trim().slice(0, 40) || "Chủ hũ";

  if (!Number.isInteger(potId) || potId <= 0 || !isAddress(creator)) {
    return NextResponse.json({ error: "Thiếu thông tin hũ" }, { status: 400 });
  }

  const onChain = await readPotCard(potId);
  if (!onChain) {
    return NextResponse.json({ error: "Hũ này chưa có trên blockchain" }, { status: 409 });
  }
  if (onChain.creator !== creator) {
    return NextResponse.json({ error: "Bạn không phải người tạo hũ này" }, { status: 403 });
  }

  try {
    const doc = await createPotMeta({ potId, name: onChain.name, creator, creatorName });
    return NextResponse.json({ inviteCode: doc.inviteCode });
  } catch (caught) {
    console.error("POST /api/pots", caught);
    return NextResponse.json({ error: "Không lưu được thông tin hũ" }, { status: 503 });
  }
}
