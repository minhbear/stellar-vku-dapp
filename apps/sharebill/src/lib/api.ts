import type { ActivityDto, PotCardDto } from "./dto";

/** Calls into the off chain half of the app. */
async function json<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Máy chủ không phản hồi");
  return body;
}

export function fetchMyPots(address: string) {
  return json<{ pots: PotCardDto[] }>(`/api/pots?address=${address}`);
}

export function savePotMeta(input: { potId: number; creator: string; creatorName: string }) {
  return json<{ inviteCode: string }>("/api/pots", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function saveMemberName(potId: number, address: string, name: string) {
  return json<{ ok: boolean }>(`/api/pots/${potId}/members`, {
    method: "POST",
    body: JSON.stringify({ address, name }),
  });
}

export function resolveInviteCode(code: string) {
  return json<{ potId: number; name: string }>(`/api/invites/${code}`);
}

/** Best effort: a missing feed entry must never break a finished payment. */
export function recordActivity(
  potId: number,
  input: { kind: string; actor: string; detail: string; txHash: string | null },
): Promise<unknown> {
  return json<{ ok: boolean }>(`/api/pots/${potId}/activity`, {
    method: "POST",
    body: JSON.stringify(input),
  }).catch(() => null);
}

export function fetchActivity(potId: number) {
  return json<{ activity: ActivityDto[] }>(`/api/pots/${potId}/activity`);
}
