import { NextResponse } from "next/server";

import { resolveInvite } from "@/lib/store";

/** Turns a six character code read out in class into a pot id. */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[A-Za-z0-9]{6}$/.test(code)) {
    return NextResponse.json({ error: "Mã mời gồm 6 ký tự" }, { status: 400 });
  }

  try {
    const doc = await resolveInvite(code);
    if (!doc) return NextResponse.json({ error: "Không tìm thấy mã mời này" }, { status: 404 });
    return NextResponse.json({ potId: doc.potId, name: doc.name });
  } catch {
    return NextResponse.json({ error: "Không tra được mã mời" }, { status: 503 });
  }
}
