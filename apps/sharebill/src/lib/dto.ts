/**
 * What the server hands to the browser. Amounts are strings in stroops the
 * whole way: a bigint cannot cross the server boundary, and a number would
 * quietly lose precision.
 */
export type PotStatus = "open" | "settling" | "closed";
export type RequestStatus = "voting" | "executed" | "cancelled";

export interface Position {
  address: string;
  paid: string;
  debt: string;
  credit: string;
}

export interface SpendRequestDto {
  id: number;
  requester: string;
  to: string;
  amount: string;
  memo: string;
  approvals: string[];
  status: RequestStatus;
}

export interface PotStateDto {
  id: number;
  name: string;
  token: string;
  creator: string;
  members: string[];
  status: PotStatus;
  totalIn: string;
  totalOut: string;
  balance: string;
  share: string;
  /** Approvals needed for a spend request to pay out. */
  votesNeeded: number;
  positions: Position[];
  requests: SpendRequestDto[];
}

/** The off chain half: display names, the invite code and the activity feed. */
export interface PotMetaDto {
  potId: number;
  name: string;
  inviteCode: string;
  names: Record<string, string>;
  createdAt: string | null;
}

export interface ActivityDto {
  kind: string;
  actor: string;
  detail: string;
  txHash: string | null;
  at: string;
}

export interface PotCardDto {
  id: number;
  name: string;
  status: PotStatus;
  creator: string;
  balance: string;
  totalIn: string;
  members: string[];
  names: Record<string, string>;
}
