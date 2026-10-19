import type { ActivityDto, JobCardDto } from "./dto";

async function json<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Máy chủ không phản hồi");
  return body;
}

export function fetchMyJobs(address: string) {
  return json<{ jobs: JobCardDto[] }>(`/api/jobs?address=${address}`);
}

export function saveJobMeta(input: {
  jobId: number;
  brief: string;
  client: string;
  clientName: string;
  steps: { idx: number; title: string }[];
}) {
  return json<{ inviteCode: string }>("/api/jobs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function saveName(jobId: number, address: string, name: string) {
  return json<{ ok: boolean }>(`/api/jobs/${jobId}/names`, {
    method: "POST",
    body: JSON.stringify({ address, name }),
  });
}

export function resolveInviteCode(code: string) {
  return json<{ jobId: number; title: string }>(`/api/invites/${code}`);
}

export function recordActivity(
  jobId: number,
  input: { kind: string; actor: string; detail: string; txHash: string | null },
): Promise<unknown> {
  return json<{ ok: boolean }>(`/api/jobs/${jobId}/activity`, {
    method: "POST",
    body: JSON.stringify(input),
  }).catch(() => null);
}

export function fetchActivity(jobId: number) {
  return json<{ activity: ActivityDto[] }>(`/api/jobs/${jobId}/activity`);
}
