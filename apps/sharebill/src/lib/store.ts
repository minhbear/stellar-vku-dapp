import { randomInt } from "node:crypto";

import { database } from "./mongo";

export interface MemberDoc {
  address: string;
  name: string;
  joinedAt: Date;
}

export interface PotDoc {
  potId: number;
  name: string;
  creator: string;
  inviteCode: string;
  createdAt: Date;
  members: MemberDoc[];
}

export interface ActivityDoc {
  potId: number;
  kind: string;
  actor: string;
  detail: string;
  txHash: string | null;
  at: Date;
}

/** No I, O, 0 or 1, so a code read out loud in class cannot be mistyped. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newInviteCode(): string {
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

async function pots() {
  const db = await database();
  const collection = db.collection<PotDoc>("pots");
  await collection.createIndexes([
    { key: { potId: 1 }, unique: true },
    { key: { inviteCode: 1 }, unique: true },
    { key: { "members.address": 1 } },
  ]);
  return collection;
}

async function activities() {
  const db = await database();
  const collection = db.collection<ActivityDoc>("activities");
  await collection.createIndex({ potId: 1, at: -1 });
  return collection;
}

export async function createPotMeta(input: {
  potId: number;
  name: string;
  creator: string;
  creatorName: string;
}): Promise<PotDoc> {
  const collection = await pots();
  const existing = await collection.findOne({ potId: input.potId });
  if (existing) return existing;

  const doc: PotDoc = {
    potId: input.potId,
    name: input.name,
    creator: input.creator,
    inviteCode: newInviteCode(),
    createdAt: new Date(),
    members: [{ address: input.creator, name: input.creatorName, joinedAt: new Date() }],
  };
  await collection.insertOne(doc);
  return doc;
}

export async function getPotMeta(potId: number): Promise<PotDoc | null> {
  const collection = await pots();
  return collection.findOne({ potId });
}

export async function upsertMemberName(
  potId: number,
  address: string,
  name: string,
): Promise<void> {
  const collection = await pots();
  const updated = await collection.updateOne(
    { potId, "members.address": address },
    { $set: { "members.$.name": name } },
  );
  if (updated.matchedCount === 0) {
    await collection.updateOne(
      { potId },
      { $push: { members: { address, name, joinedAt: new Date() } } },
    );
  }
}

export async function potsForAddress(address: string, limit = 12): Promise<PotDoc[]> {
  const collection = await pots();
  return collection
    .find({ "members.address": address })
    .sort({ potId: -1 })
    .limit(limit)
    .toArray();
}

export async function resolveInvite(code: string): Promise<PotDoc | null> {
  const collection = await pots();
  return collection.findOne({ inviteCode: code.trim().toUpperCase() });
}

export async function logActivity(doc: Omit<ActivityDoc, "at">): Promise<void> {
  const collection = await activities();
  await collection.insertOne({ ...doc, at: new Date() });
}

export async function listActivity(potId: number, limit = 30): Promise<ActivityDoc[]> {
  const collection = await activities();
  return collection.find({ potId }).sort({ at: -1 }).limit(limit).toArray();
}

export function namesOf(doc: PotDoc | null): Record<string, string> {
  if (!doc) return {};
  return Object.fromEntries(doc.members.map((member) => [member.address, member.name]));
}
