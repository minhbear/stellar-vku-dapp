/** Amounts are strings in stroops all the way to the browser. */
export type JobStatus = "funded" | "working" | "done" | "cancelled";
export type StepStatus =
  | "open"
  | "submitted"
  | "released"
  | "refunded"
  | "disputed"
  | "split";

export interface StepDto {
  idx: number;
  amount: string;
  deadline: number;
  submittedAt: number;
  status: StepStatus;
  /** When the client's silence starts paying the worker. */
  reviewUntil: number;
}

export interface JobStateDto {
  id: number;
  title: string;
  token: string;
  client: string;
  worker: string | null;
  arbiter: string;
  status: JobStatus;
  total: string;
  locked: string;
  reviewSecs: number;
  createdAt: number;
  steps: StepDto[];
}

export interface JobMetaDto {
  jobId: number;
  inviteCode: string;
  brief: string;
  names: Record<string, string>;
  stepTitles: Record<number, string>;
}

export interface ActivityDto {
  kind: string;
  actor: string;
  detail: string;
  txHash: string | null;
  at: string;
}

export interface JobCardDto {
  id: number;
  title: string;
  status: JobStatus;
  total: string;
  locked: string;
  client: string;
  worker: string | null;
  steps: number;
  done: number;
  names: Record<string, string>;
}
