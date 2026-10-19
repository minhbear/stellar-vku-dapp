import { Client, type Job, type Step } from "@vku/escrow-client";
import { NETWORK, READ_ONLY_ACCOUNT } from "@vku/stellar/server";

import { CONTRACT_ID } from "./env";
import type { JobStateDto, JobStatus, StepDto, StepStatus } from "./dto";

function reader() {
  return new Client({
    contractId: CONTRACT_ID,
    networkPassphrase: NETWORK.passphrase,
    rpcUrl: NETWORK.rpcUrl,
    publicKey: READ_ONLY_ACCOUNT,
  });
}

const JOB_STATUS: JobStatus[] = ["funded", "working", "done", "cancelled"];
const STEP_STATUS: StepStatus[] = [
  "open",
  "submitted",
  "released",
  "refunded",
  "disputed",
  "split",
];

/** Milestones still holding money. */
const LIVE: StepStatus[] = ["open", "submitted", "disputed"];

function toStep(raw: Step, reviewSecs: number): StepDto {
  const submittedAt = Number(raw.submitted_at);
  return {
    idx: raw.idx,
    amount: raw.amount.toString(),
    deadline: Number(raw.deadline),
    submittedAt,
    status: STEP_STATUS[raw.status] ?? "open",
    reviewUntil: submittedAt > 0 ? submittedAt + reviewSecs : 0,
  };
}

export async function readJob(jobId: number): Promise<JobStateDto | null> {
  const client = reader();

  let job: Job;
  try {
    job = (await client.get_job({ job_id: jobId })).result.unwrap();
  } catch {
    return null;
  }

  const steps = (await client.get_steps({ job_id: jobId })).result.map((step) =>
    toStep(step, Number(job.review_secs)),
  );

  const locked = steps
    .filter((step) => LIVE.includes(step.status))
    .reduce((total, step) => total + BigInt(step.amount), 0n);

  return {
    id: job.id,
    title: job.title,
    token: job.token,
    client: job.client,
    worker: job.worker ?? null,
    arbiter: job.arbiter,
    status: JOB_STATUS[job.status] ?? "funded",
    total: job.total.toString(),
    locked: locked.toString(),
    reviewSecs: Number(job.review_secs),
    createdAt: Number(job.created_at),
    steps,
  };
}

/** Light read for the list on the home page. */
export async function readJobCard(jobId: number) {
  const state = await readJob(jobId);
  if (!state) return null;
  return {
    id: state.id,
    title: state.title,
    status: state.status,
    total: state.total,
    locked: state.locked,
    client: state.client,
    worker: state.worker,
    steps: state.steps.length,
    done: state.steps.filter((step) => !LIVE.includes(step.status)).length,
  };
}
