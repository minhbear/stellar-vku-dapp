import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}





export interface Job {
  arbiter: string;
  client: string;
  created_at: u64;
  id: u32;
  /**
 * How long the client has to review a handed in milestone.
 */
review_secs: u64;
  status: JobStatus;
  title: string;
  token: string;
  total: i128;
  worker: Option<string>;
}


export interface Step {
  amount: i128;
  /**
 * Hand in before this, or the client may take the money back.
 */
deadline: u64;
  idx: u32;
  status: StepStatus;
  submitted_at: u64;
}

export const Errors = {
  1: {message:"JobNotFound"},
  2: {message:"StepNotFound"},
  3: {message:"NotClient"},
  4: {message:"NotWorker"},
  5: {message:"NotArbiter"},
  6: {message:"NotAParty"},
  7: {message:"JobNotOpen"},
  8: {message:"JobNotWorking"},
  9: {message:"AlreadyTaken"},
  10: {message:"OwnJob"},
  11: {message:"StepNotOpen"},
  12: {message:"StepNotSubmitted"},
  13: {message:"StepNotDisputed"},
  14: {message:"DeadlinePassed"},
  15: {message:"DeadlineNotPassed"},
  16: {message:"ReviewStillOpen"},
  17: {message:"InvalidAmount"},
  18: {message:"InvalidSteps"},
  19: {message:"InvalidShare"}
}

export type DataKey = {tag: "JobCount", values: void} | {tag: "Job", values: readonly [u32]} | {tag: "Steps", values: readonly [u32]};


export enum JobStatus {
  Funded = 0,
  Working = 1,
  Done = 2,
  Cancelled = 3,
}


export enum StepStatus {
  Open = 0,
  Submitted = 1,
  Released = 2,
  Refunded = 3,
  Disputed = 4,
  Split = 5,
}








export interface Client {
  /**
   * Construct and simulate a claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * The client stayed silent past the review window, so the worker takes it.
   */
  claim: ({job_id, idx, worker}: {job_id: u32, idx: u32, worker: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a accept transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Takes the job. From here the worker can hand milestones in.
   */
  accept: ({job_id, worker}: {job_id: u32, worker: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a locked transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Budget still locked in the contract for this job.
   */
  locked: ({job_id}: {job_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a submit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Hands a milestone in and starts the review clock.
   */
  submit: ({job_id, idx, worker}: {job_id: u32, idx: u32, worker: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a approve transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Client accepts the work and the milestone is paid out.
   */
  approve: ({job_id, idx, caller}: {job_id: u32, idx: u32, caller: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a dispute transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Either side can send a handed in milestone to the arbiter.
   */
  dispute: ({job_id, idx, caller}: {job_id: u32, idx: u32, caller: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_job transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_job: ({job_id}: {job_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Job>>>

  /**
   * Construct and simulate a reclaim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Nothing was handed in before the deadline, so the client takes it back.
   */
  reclaim: ({job_id, idx, caller}: {job_id: u32, idx: u32, caller: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a resolve transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * The arbiter splits a disputed milestone. They cannot keep any of it.
   */
  resolve: ({job_id, idx, caller, worker_bps}: {job_id: u32, idx: u32, caller: string, worker_bps: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_steps transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_steps: ({job_id}: {job_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Array<Step>>>

  /**
   * Construct and simulate a job_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  job_count: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a cancel_job transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Pulls the budget back while nobody has taken the job.
   */
  cancel_job: ({job_id, caller}: {job_id: u32, caller: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a create_job transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Posts a job and locks the whole budget in the contract.
   */
  create_job: ({client, title, token, arbiter, review_secs, amounts, deadlines}: {client: string, title: string, token: string, arbiter: string, review_secs: u64, amounts: Array<i128>, deadlines: Array<u64>}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u32>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "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",
        "AAAABQAAAAAAAAAAAAAAC0pvYkFjY2VwdGVkAAAAAAEAAAAMam9iX2FjY2VwdGVkAAAAAgAAAAAAAAADam9iAAAAAAQAAAABAAAAAAAAAAZ3b3JrZXIAAAAAABMAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAADEpvYkNhbmNlbGxlZAAAAAEAAAANam9iX2NhbmNlbGxlZAAAAAAAAAIAAAAAAAAAA2pvYgAAAAAEAAAAAQAAAAAAAAAIcmVmdW5kZWQAAAALAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAADFN0ZXBEaXNwdXRlZAAAAAEAAAANc3RlcF9kaXNwdXRlZAAAAAAAAAMAAAAAAAAAA2pvYgAAAAAEAAAAAQAAAAAAAAAEc3RlcAAAAAQAAAAAAAAAAAAAAAJieQAAAAAAEwAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAADFN0ZXBSZWxlYXNlZAAAAAEAAAANc3RlcF9yZWxlYXNlZAAAAAAAAAQAAAAAAAAAA2pvYgAAAAAEAAAAAQAAAAAAAAAEc3RlcAAAAAQAAAAAAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAPVRydWUgd2hlbiB0aGUgY2xpZW50IHN0YXllZCBzaWxlbnQgYW5kIHRoZSBjbG9jayByZWxlYXNlZCBpdC4AAAAAAAAKYnlfdGltZW91dAAAAAAAAQAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAADFN0ZXBSZXNvbHZlZAAAAAEAAAANc3RlcF9yZXNvbHZlZAAAAAAAAAQAAAAAAAAAA2pvYgAAAAAEAAAAAQAAAAAAAAAEc3RlcAAAAAQAAAAAAAAAAAAAAAl0b193b3JrZXIAAAAAAAALAAAAAAAAAAAAAAAJdG9fY2xpZW50AAAAAAAACwAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAADVN0ZXBSZWNsYWltZWQAAAAAAAABAAAADnN0ZXBfcmVjbGFpbWVkAAAAAAADAAAAAAAAAANqb2IAAAAABAAAAAEAAAAAAAAABHN0ZXAAAAAEAAAAAAAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAADVN0ZXBTdWJtaXR0ZWQAAAAAAAABAAAADnN0ZXBfc3VibWl0dGVkAAAAAAAEAAAAAAAAAANqb2IAAAAABAAAAAEAAAAAAAAABHN0ZXAAAAAEAAAAAAAAAAAAAAACYXQAAAAAAAYAAAAAAAAAAAAAAAxyZXZpZXdfdW50aWwAAAAGAAAAAAAAAAI=",
        "AAAAAAAAAEhUaGUgY2xpZW50IHN0YXllZCBzaWxlbnQgcGFzdCB0aGUgcmV2aWV3IHdpbmRvdywgc28gdGhlIHdvcmtlciB0YWtlcyBpdC4AAAAFY2xhaW0AAAAAAAADAAAAAAAAAAZqb2JfaWQAAAAAAAQAAAAAAAAAA2lkeAAAAAAEAAAAAAAAAAZ3b3JrZXIAAAAAABMAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAADtUYWtlcyB0aGUgam9iLiBGcm9tIGhlcmUgdGhlIHdvcmtlciBjYW4gaGFuZCBtaWxlc3RvbmVzIGluLgAAAAAGYWNjZXB0AAAAAAACAAAAAAAAAAZqb2JfaWQAAAAAAAQAAAAAAAAABndvcmtlcgAAAAAAEwAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAADFCdWRnZXQgc3RpbGwgbG9ja2VkIGluIHRoZSBjb250cmFjdCBmb3IgdGhpcyBqb2IuAAAAAAAABmxvY2tlZAAAAAAAAQAAAAAAAAAGam9iX2lkAAAAAAAEAAAAAQAAA+kAAAALAAAAAw==",
        "AAAAAAAAADFIYW5kcyBhIG1pbGVzdG9uZSBpbiBhbmQgc3RhcnRzIHRoZSByZXZpZXcgY2xvY2suAAAAAAAABnN1Ym1pdAAAAAAAAwAAAAAAAAAGam9iX2lkAAAAAAAEAAAAAAAAAANpZHgAAAAABAAAAAAAAAAGd29ya2VyAAAAAAATAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAADZDbGllbnQgYWNjZXB0cyB0aGUgd29yayBhbmQgdGhlIG1pbGVzdG9uZSBpcyBwYWlkIG91dC4AAAAAAAdhcHByb3ZlAAAAAAMAAAAAAAAABmpvYl9pZAAAAAAABAAAAAAAAAADaWR4AAAAAAQAAAAAAAAABmNhbGxlcgAAAAAAEwAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAADpFaXRoZXIgc2lkZSBjYW4gc2VuZCBhIGhhbmRlZCBpbiBtaWxlc3RvbmUgdG8gdGhlIGFyYml0ZXIuAAAAAAAHZGlzcHV0ZQAAAAADAAAAAAAAAAZqb2JfaWQAAAAAAAQAAAAAAAAAA2lkeAAAAAAEAAAAAAAAAAZjYWxsZXIAAAAAABMAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAAAAAAAHZ2V0X2pvYgAAAAABAAAAAAAAAAZqb2JfaWQAAAAAAAQAAAABAAAD6QAAB9AAAAADSm9iAAAAAAM=",
        "AAAAAAAAAEdOb3RoaW5nIHdhcyBoYW5kZWQgaW4gYmVmb3JlIHRoZSBkZWFkbGluZSwgc28gdGhlIGNsaWVudCB0YWtlcyBpdCBiYWNrLgAAAAAHcmVjbGFpbQAAAAADAAAAAAAAAAZqb2JfaWQAAAAAAAQAAAAAAAAAA2lkeAAAAAAEAAAAAAAAAAZjYWxsZXIAAAAAABMAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAERUaGUgYXJiaXRlciBzcGxpdHMgYSBkaXNwdXRlZCBtaWxlc3RvbmUuIFRoZXkgY2Fubm90IGtlZXAgYW55IG9mIGl0LgAAAAdyZXNvbHZlAAAAAAQAAAAAAAAABmpvYl9pZAAAAAAABAAAAAAAAAADaWR4AAAAAAQAAAAAAAAABmNhbGxlcgAAAAAAEwAAAAAAAAAKd29ya2VyX2JwcwAAAAAABAAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAAAAAAAJZ2V0X3N0ZXBzAAAAAAAAAQAAAAAAAAAGam9iX2lkAAAAAAAEAAAAAQAAA+oAAAfQAAAABFN0ZXA=",
        "AAAAAAAAAAAAAAAJam9iX2NvdW50AAAAAAAAAAAAAAEAAAAE",
        "AAAAAAAAADVQdWxscyB0aGUgYnVkZ2V0IGJhY2sgd2hpbGUgbm9ib2R5IGhhcyB0YWtlbiB0aGUgam9iLgAAAAAAAApjYW5jZWxfam9iAAAAAAACAAAAAAAAAAZqb2JfaWQAAAAAAAQAAAAAAAAABmNhbGxlcgAAAAAAEwAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAADdQb3N0cyBhIGpvYiBhbmQgbG9ja3MgdGhlIHdob2xlIGJ1ZGdldCBpbiB0aGUgY29udHJhY3QuAAAAAApjcmVhdGVfam9iAAAAAAAHAAAAAAAAAAZjbGllbnQAAAAAABMAAAAAAAAABXRpdGxlAAAAAAAAEAAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAAAAAAdhcmJpdGVyAAAAABMAAAAAAAAAC3Jldmlld19zZWNzAAAAAAYAAAAAAAAAB2Ftb3VudHMAAAAD6gAAAAsAAAAAAAAACWRlYWRsaW5lcwAAAAAAA+oAAAAGAAAAAQAAA+kAAAAEAAAAAw==" ]),
      options
    )
  }
  public readonly fromJSON = {
    claim: this.txFromJSON<Result<void>>,
        accept: this.txFromJSON<Result<void>>,
        locked: this.txFromJSON<Result<i128>>,
        submit: this.txFromJSON<Result<void>>,
        approve: this.txFromJSON<Result<void>>,
        dispute: this.txFromJSON<Result<void>>,
        get_job: this.txFromJSON<Result<Job>>,
        reclaim: this.txFromJSON<Result<void>>,
        resolve: this.txFromJSON<Result<void>>,
        get_steps: this.txFromJSON<Array<Step>>,
        job_count: this.txFromJSON<u32>,
        cancel_job: this.txFromJSON<Result<void>>,
        create_job: this.txFromJSON<Result<u32>>
  }
}