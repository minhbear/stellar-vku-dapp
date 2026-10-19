import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { readJob } from "@/lib/chain";
import { getJobMeta, listActivity, namesOf, stepTitlesOf } from "@/lib/store";
import { JobScreen } from "@/components/job/job-screen";
import type { ActivityDto, JobMetaDto } from "@/lib/dto";

// Job state lives on the ledger and changes whenever either side acts.
export const dynamic = "force-dynamic";

async function readMeta(jobId: number): Promise<{
  meta: JobMetaDto | null;
  activity: ActivityDto[];
}> {
  try {
    const [doc, rows] = await Promise.all([getJobMeta(jobId), listActivity(jobId)]);
    return {
      meta: doc
        ? {
            jobId,
            inviteCode: doc.inviteCode,
            brief: doc.brief,
            names: namesOf(doc),
            stepTitles: stepTitlesOf(doc),
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
  const state = await readJob(Number(id));
  return { title: state ? state.title : `Việc #${id}` };
}

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobId = Number(id);
  if (!Number.isInteger(jobId) || jobId <= 0) notFound();

  const state = await readJob(jobId);
  if (!state) notFound();

  const { meta, activity } = await readMeta(jobId);
  return <JobScreen state={state} meta={meta} activity={activity} />;
}
