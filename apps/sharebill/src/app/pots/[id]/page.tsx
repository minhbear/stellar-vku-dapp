import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { readPot } from "@/lib/chain";
import { getPotMeta, listActivity, namesOf } from "@/lib/store";
import { PotScreen } from "@/components/pot/pot-screen";
import type { ActivityDto, PotMetaDto } from "@/lib/dto";

// Pot state lives on the ledger and changes whenever anyone acts, so nothing
// here may be cached.
export const dynamic = "force-dynamic";

async function readMeta(potId: number): Promise<{
  meta: PotMetaDto | null;
  activity: ActivityDto[];
}> {
  try {
    const [doc, rows] = await Promise.all([getPotMeta(potId), listActivity(potId)]);
    return {
      meta: doc
        ? {
            potId,
            name: doc.name,
            inviteCode: doc.inviteCode,
            names: namesOf(doc),
            createdAt: doc.createdAt.toISOString(),
          }
        : null,
      activity: rows.map((row) => ({
        kind: row.kind,
        actor: row.actor,
        detail: row.detail,
        txHash: row.txHash,
        at: row.at.toISOString(),
      })),
    };
  } catch {
    // The off chain half being down must not hide the money.
    return { meta: null, activity: [] };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const state = await readPot(Number(id));
  return { title: state ? state.name : `Hũ #${id}` };
}

export default async function PotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const potId = Number(id);
  if (!Number.isInteger(potId) || potId <= 0) notFound();

  const state = await readPot(potId);
  if (!state) notFound();

  const { meta, activity } = await readMeta(potId);
  return <PotScreen state={state} meta={meta} activity={activity} />;
}
