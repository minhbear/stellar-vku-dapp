import { Client, type Pot, type SpendRequest } from "@vku/sharebill-client";
import { NETWORK, READ_ONLY_ACCOUNT } from "@vku/stellar/server";

import { CONTRACT_ID } from "./env";
import type { PotStateDto, PotStatus, Position, RequestStatus, SpendRequestDto } from "./dto";

/**
 * A client with no wallet attached. Reading contract state is a simulated
 * transaction, so it needs a source account but never a signature.
 */
function reader() {
  return new Client({
    contractId: CONTRACT_ID,
    networkPassphrase: NETWORK.passphrase,
    rpcUrl: NETWORK.rpcUrl,
    publicKey: READ_ONLY_ACCOUNT,
  });
}

const POT_STATUS: PotStatus[] = ["open", "settling", "closed"];
const REQUEST_STATUS: RequestStatus[] = ["voting", "executed", "cancelled"];

function toRequest(raw: SpendRequest): SpendRequestDto {
  return {
    id: raw.id,
    requester: raw.requester,
    to: raw.to,
    amount: raw.amount.toString(),
    memo: raw.memo,
    approvals: [...raw.approvals],
    status: REQUEST_STATUS[raw.status] ?? "voting",
  };
}

/** Everything the pot screen needs, straight from the ledger. */
export async function readPot(potId: number): Promise<PotStateDto | null> {
  const client = reader();

  let pot: Pot;
  try {
    const call = await client.get_pot({ pot_id: potId });
    pot = call.result.unwrap();
  } catch {
    return null;
  }

  const [requestsCall, ...positionCalls] = await Promise.all([
    client.get_requests({ pot_id: potId }),
    ...pot.members.map((member) => client.position({ pot_id: potId, member })),
  ]);

  const positions: Position[] = pot.members.map((address, index) => {
    const [paid, debt, credit] = positionCalls[index]!.result.unwrap();
    return {
      address,
      paid: paid.toString(),
      debt: debt.toString(),
      credit: credit.toString(),
    };
  });

  return {
    id: pot.id,
    name: pot.name,
    token: pot.token,
    creator: pot.creator,
    members: [...pot.members],
    status: POT_STATUS[pot.status] ?? "open",
    totalIn: pot.total_in.toString(),
    totalOut: pot.total_out.toString(),
    balance: (pot.total_in - pot.total_out).toString(),
    share: pot.share.toString(),
    votesNeeded: Math.floor(pot.members.length / 2) + 1,
    positions,
    requests: requestsCall.result.map(toRequest),
  };
}

/** Light read for the home page list. */
export async function readPotCard(potId: number) {
  const client = reader();
  try {
    const call = await client.get_pot({ pot_id: potId });
    const pot = call.result.unwrap();
    return {
      id: pot.id,
      name: pot.name,
      status: POT_STATUS[pot.status] ?? "open",
      creator: pot.creator,
      balance: (pot.total_in - pot.total_out).toString(),
      totalIn: pot.total_in.toString(),
      members: [...pot.members],
    };
  } catch {
    return null;
  }
}
