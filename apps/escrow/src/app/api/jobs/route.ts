import { NextResponse } from "next/server";

import { readJobCard } from "@/lib/chain";
import { createJobMeta, jobsForAddress, namesOf } from "@/lib/store";
import { isAddress } from "@/lib/tx";
import type { JobCardDto } from "@/lib/dto";

/** Jobs this address is part of, with their state on the ledger. */
export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address") ?? "";
  if (!isAddress(address)) {
    return NextResponse.json({ error: "Địa chỉ ví không hợp lệ" }, { status: 400 });
  }

  try {
    const docs = await jobsForAddress(address);
    const cards = await Promise.all(
      docs.map(async (doc) => {
        const state = await readJobCard(doc.jobId);
        if (!state) return null;
        return { ...state, names: namesOf(doc) } satisfies JobCardDto;
      }),
    );
    return NextResponse.json({ jobs: cards.filter(Boolean) });
  } catch (caught) {
    console.error("GET /api/jobs", caught);
    return NextResponse.json({ error: "Không đọc được danh sách công việc" }, { status: 503 });
  }
}

/**
 * Saves the brief, the milestone names and the invite code for a job that is
 * already funded on chain. The server checks the chain before writing.
 */
export async function POST(request: Request) {
  let body: {
    jobId?: number;
    brief?: string;
    client?: string;
    clientName?: string;
    steps?: { idx: number; title: string }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ" }, { status: 400 });
  }

  const jobId = Number(body.jobId);
  const client = String(body.client ?? "");
  if (!Number.isInteger(jobId) || jobId <= 0 || !isAddress(client)) {
    return NextResponse.json({ error: "Thiếu thông tin công việc" }, { status: 400 });
  }

  const onChain = await readJobCard(jobId);
  if (!onChain) {
    return NextResponse.json({ error: "Công việc này chưa có trên blockchain" }, { status: 409 });
  }
  if (onChain.client !== client) {
    return NextResponse.json({ error: "Bạn không phải người đăng việc này" }, { status: 403 });
  }

  const steps = Array.isArray(body.steps)
    ? body.steps
        .filter((step) => Number.isInteger(step?.idx))
        .slice(0, 12)
        .map((step) => ({ idx: Number(step.idx), title: String(step.title ?? "").slice(0, 80) }))
    : [];

  try {
    const doc = await createJobMeta({
      jobId,
      title: onChain.title,
      brief: String(body.brief ?? "").slice(0, 600),
      client,
      clientName: String(body.clientName ?? "").trim().slice(0, 40) || "Bên thuê",
      steps,
    });
    return NextResponse.json({ inviteCode: doc.inviteCode });
  } catch (caught) {
    console.error("POST /api/jobs", caught);
    return NextResponse.json({ error: "Không lưu được thông tin công việc" }, { status: 503 });
  }
}
