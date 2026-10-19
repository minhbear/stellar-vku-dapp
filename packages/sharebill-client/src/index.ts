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





export interface Pot {
  creator: string;
  id: u32;
  members: Array<string>;
  name: string;
  /**
 * Equal share of the spending per member, fixed when settling starts.
 */
share: i128;
  /**
 * Remainder of the equal split, carried by the creator.
 */
share_rest: i128;
  status: PotStatus;
  token: string;
  /**
 * Everything ever paid into the pot, including settlement top ups.
 */
total_in: i128;
  /**
 * Everything ever paid out of the pot through an approved request.
 */
total_out: i128;
}

export const Errors = {
  1: {message:"PotNotFound"},
  2: {message:"NotMember"},
  3: {message:"AlreadyMember"},
  4: {message:"NotCreator"},
  5: {message:"PotNotOpen"},
  6: {message:"PotNotSettling"},
  7: {message:"InvalidAmount"},
  8: {message:"RequestNotFound"},
  9: {message:"RequestClosed"},
  10: {message:"AlreadyApproved"},
  11: {message:"InsufficientBalance"},
  12: {message:"DebtsOutstanding"},
  13: {message:"NoDebt"},
  14: {message:"PotFull"},
  15: {message:"NoMembers"}
}



export type DataKey = {tag: "PotCount", values: void} | {tag: "Pot", values: readonly [u32]} | {tag: "Paid", values: readonly [u32]} | {tag: "Requests", values: readonly [u32]};



export enum PotStatus {
  Open = 0,
  Settling = 1,
  Closed = 2,
}





export interface SpendRequest {
  amount: i128;
  approvals: Array<string>;
  id: u32;
  memo: string;
  pot_id: u32;
  requester: string;
  status: RequestStatus;
  to: string;
}


export enum RequestStatus {
  Voting = 0,
  Executed = 1,
  Cancelled = 2,
}




export interface Client {
  /**
   * Construct and simulate a join transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Joins an open pot. Anyone holding the pot id (the invite link) may join.
   */
  join: ({pot_id, member}: {pot_id: u32, member: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a approve transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Approves a spend request. Passing half of the members pays it out.
   */
  approve: ({pot_id, request_id, member}: {pot_id: u32, request_id: u32, member: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Money still sitting in the pot.
   */
  balance: ({pot_id}: {pot_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a get_pot transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_pot: ({pot_id}: {pot_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Pot>>>

  /**
   * Construct and simulate a paid_by transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  paid_by: ({pot_id, member}: {pot_id: u32, member: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a finalize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Pays everyone who overpaid and closes the pot. Needs every debt settled.
   */
  finalize: ({pot_id, caller}: {pot_id: u32, caller: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a position transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * What one member paid in, owes, and gets back.
   */
  position: ({pot_id, member}: {pot_id: u32, member: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<readonly [i128, i128, i128]>>>

  /**
   * Construct and simulate a pot_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pot_count: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a contribute transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Pays money into the pot. Amounts do not have to be equal.
   */
  contribute: ({pot_id, from, amount}: {pot_id: u32, from: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a create_pot transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Opens a pot. The creator is its first member.
   */
  create_pot: ({creator, name, token}: {creator: string, name: string, token: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u32>>>

  /**
   * Construct and simulate a settle_debt transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Tops up the shortfall of a member who paid in less than their share.
   */
  settle_debt: ({pot_id, member}: {pot_id: u32, member: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_requests transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_requests: ({pot_id}: {pot_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Array<SpendRequest>>>

  /**
   * Construct and simulate a start_settle transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Ends the trip and fixes the equal split. Open votes are dropped.
   */
  start_settle: ({pot_id, caller}: {pot_id: u32, caller: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a request_spend transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Asks the group to spend from the pot. Only members may ask.
   */
  request_spend: ({pot_id, requester, to, amount, memo}: {pot_id: u32, requester: string, to: string, amount: i128, memo: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u32>>>

  /**
   * Construct and simulate a cancel_request transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Withdraws a request. Only whoever opened it may do that.
   */
  cancel_request: ({pot_id, request_id, caller}: {pot_id: u32, request_id: u32, caller: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

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
      new ContractSpec([ "AAAAAQAAAAAAAAAAAAAAA1BvdAAAAAAKAAAAAAAAAAdjcmVhdG9yAAAAABMAAAAAAAAAAmlkAAAAAAAEAAAAAAAAAAdtZW1iZXJzAAAAA+oAAAATAAAAAAAAAARuYW1lAAAAEAAAAENFcXVhbCBzaGFyZSBvZiB0aGUgc3BlbmRpbmcgcGVyIG1lbWJlciwgZml4ZWQgd2hlbiBzZXR0bGluZyBzdGFydHMuAAAAAAVzaGFyZQAAAAAAAAsAAAA1UmVtYWluZGVyIG9mIHRoZSBlcXVhbCBzcGxpdCwgY2FycmllZCBieSB0aGUgY3JlYXRvci4AAAAAAAAKc2hhcmVfcmVzdAAAAAAACwAAAAAAAAAGc3RhdHVzAAAAAAfQAAAACVBvdFN0YXR1cwAAAAAAAAAAAAAFdG9rZW4AAAAAAAATAAAAQEV2ZXJ5dGhpbmcgZXZlciBwYWlkIGludG8gdGhlIHBvdCwgaW5jbHVkaW5nIHNldHRsZW1lbnQgdG9wIHVwcy4AAAAIdG90YWxfaW4AAAALAAAAQEV2ZXJ5dGhpbmcgZXZlciBwYWlkIG91dCBvZiB0aGUgcG90IHRocm91Z2ggYW4gYXBwcm92ZWQgcmVxdWVzdC4AAAAJdG90YWxfb3V0AAAAAAAACw==",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAADwAAAAAAAAALUG90Tm90Rm91bmQAAAAAAQAAAAAAAAAJTm90TWVtYmVyAAAAAAAAAgAAAAAAAAANQWxyZWFkeU1lbWJlcgAAAAAAAAMAAAAAAAAACk5vdENyZWF0b3IAAAAAAAQAAAAAAAAAClBvdE5vdE9wZW4AAAAAAAUAAAAAAAAADlBvdE5vdFNldHRsaW5nAAAAAAAGAAAAAAAAAA1JbnZhbGlkQW1vdW50AAAAAAAABwAAAAAAAAAPUmVxdWVzdE5vdEZvdW5kAAAAAAgAAAAAAAAADVJlcXVlc3RDbG9zZWQAAAAAAAAJAAAAAAAAAA9BbHJlYWR5QXBwcm92ZWQAAAAACgAAAAAAAAATSW5zdWZmaWNpZW50QmFsYW5jZQAAAAALAAAAAAAAABBEZWJ0c091dHN0YW5kaW5nAAAADAAAAAAAAAAGTm9EZWJ0AAAAAAANAAAAAAAAAAdQb3RGdWxsAAAAAA4AAAAAAAAACU5vTWVtYmVycwAAAAAAAA8=",
        "AAAABQAAAAAAAAAAAAAABVNwZW50AAAAAAAAAQAAAAVzcGVudAAAAAAAAAQAAAAAAAAAA3BvdAAAAAAEAAAAAQAAAAAAAAAHcmVxdWVzdAAAAAAEAAAAAAAAAAAAAAACdG8AAAAAABMAAAAAAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAABkZ1bmRlZAAAAAAAAQAAAAZmdW5kZWQAAAAAAAMAAAAAAAAAA3BvdAAAAAAEAAAAAQAAAAAAAAAGbWVtYmVyAAAAAAATAAAAAQAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAI=",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABAAAAAAAAAAAAAAACFBvdENvdW50AAAAAQAAAAAAAAADUG90AAAAAAEAAAAEAAAAAQAAABpBZGRyZXNzIC0+IGFtb3VudCBwYWlkIGluLgAAAAAABFBhaWQAAAABAAAABAAAAAEAAAAAAAAACFJlcXVlc3RzAAAAAQAAAAQ=",
        "AAAABQAAAAAAAAAAAAAACEFwcHJvdmVkAAAAAQAAAAhhcHByb3ZlZAAAAAUAAAAAAAAAA3BvdAAAAAAEAAAAAQAAAAAAAAAHcmVxdWVzdAAAAAAEAAAAAAAAAAAAAAAGbWVtYmVyAAAAAAATAAAAAAAAAAAAAAAJYXBwcm92YWxzAAAAAAAABAAAAAAAAAAAAAAAB21lbWJlcnMAAAAABAAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAACFJlZnVuZGVkAAAAAQAAAAhyZWZ1bmRlZAAAAAMAAAAAAAAAA3BvdAAAAAAEAAAAAQAAAAAAAAAGbWVtYmVyAAAAAAATAAAAAQAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAI=",
        "AAAAAwAAAAAAAAAAAAAACVBvdFN0YXR1cwAAAAAAAAMAAAAxTWVtYmVycyBtYXkgam9pbiwgZnVuZCB0aGUgcG90IGFuZCBzcGVuZCBmcm9tIGl0LgAAAAAAAARPcGVuAAAAAAAAAEJUcmlwIGlzIG92ZXIsIHRoZSBlcXVhbCBzcGxpdCBpcyBmaXhlZCwgZGVidHMgYXJlIGJlaW5nIHRvcHBlZCB1cC4AAAAAAAhTZXR0bGluZwAAAAEAAAAsRXZlcnlvbmUgaGFzIGJlZW4gcGFpZCBvdXQsIGJhbGFuY2UgaXMgemVyby4AAAAGQ2xvc2VkAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAACVBvdENsb3NlZAAAAAAAAAEAAAAKcG90X2Nsb3NlZAAAAAAAAgAAAAAAAAADcG90AAAAAAQAAAABAAAAAAAAAAJieQAAAAAAEwAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAAClBvdENyZWF0ZWQAAAAAAAEAAAALcG90X2NyZWF0ZWQAAAAAAwAAAAAAAAADcG90AAAAAAQAAAABAAAAAAAAAAdjcmVhdG9yAAAAABMAAAAAAAAAAAAAAARuYW1lAAAAEAAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAAC0RlYnRTZXR0bGVkAAAAAAEAAAAMZGVidF9zZXR0bGVkAAAAAwAAAAAAAAADcG90AAAAAAQAAAABAAAAAAAAAAZtZW1iZXIAAAAAABMAAAABAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAAg==",
        "AAAAAQAAAAAAAAAAAAAADFNwZW5kUmVxdWVzdAAAAAgAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAJYXBwcm92YWxzAAAAAAAD6gAAABMAAAAAAAAAAmlkAAAAAAAEAAAAAAAAAARtZW1vAAAAEAAAAAAAAAAGcG90X2lkAAAAAAAEAAAAAAAAAAlyZXF1ZXN0ZXIAAAAAAAATAAAAAAAAAAZzdGF0dXMAAAAAB9AAAAANUmVxdWVzdFN0YXR1cwAAAAAAAAAAAAACdG8AAAAAABM=",
        "AAAABQAAAAAAAAAAAAAADE1lbWJlckpvaW5lZAAAAAEAAAANbWVtYmVyX2pvaW5lZAAAAAAAAAIAAAAAAAAAA3BvdAAAAAAEAAAAAQAAAAAAAAAGbWVtYmVyAAAAAAATAAAAAAAAAAI=",
        "AAAAAwAAAAAAAAAAAAAADVJlcXVlc3RTdGF0dXMAAAAAAAADAAAAAAAAAAZWb3RpbmcAAAAAAAAAAAAAAAAACEV4ZWN1dGVkAAAAAQAAAAAAAAAJQ2FuY2VsbGVkAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAADVNldHRsZVN0YXJ0ZWQAAAAAAAABAAAADnNldHRsZV9zdGFydGVkAAAAAAADAAAAAAAAAANwb3QAAAAABAAAAAEAAAAAAAAABXNoYXJlAAAAAAAACwAAAAAAAAAAAAAABXNwZW50AAAAAAAACwAAAAAAAAAC",
        "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" ]),
      options
    )
  }
  public readonly fromJSON = {
    join: this.txFromJSON<Result<void>>,
        approve: this.txFromJSON<Result<void>>,
        balance: this.txFromJSON<Result<i128>>,
        get_pot: this.txFromJSON<Result<Pot>>,
        paid_by: this.txFromJSON<i128>,
        finalize: this.txFromJSON<Result<void>>,
        position: this.txFromJSON<Result<readonly [i128, i128, i128]>>,
        pot_count: this.txFromJSON<u32>,
        contribute: this.txFromJSON<Result<void>>,
        create_pot: this.txFromJSON<Result<u32>>,
        settle_debt: this.txFromJSON<Result<void>>,
        get_requests: this.txFromJSON<Array<SpendRequest>>,
        start_settle: this.txFromJSON<Result<void>>,
        request_spend: this.txFromJSON<Result<u32>>,
        cancel_request: this.txFromJSON<Result<void>>
  }
}