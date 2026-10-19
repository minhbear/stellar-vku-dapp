import { randomInt } from "node:crypto";

import { database } from "./mongo";

export interface JobDoc {
  jobId: number;
  title: string;
  brief: string;
  client: string;
  inviteCode: string;
  createdAt: Date;
  /** Display names for everyone who has touched the job. */
  people: { address: string; name: string }[];
  /** What each milestone actually is. The chain only knows amount and date. */
  steps: { idx: number; title: string }[];
}

export interface ActivityDoc {
  jobId: number;
  kind: string;
  actor: string;
  detail: string;
  txHash: string | null;
  at: Date;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newInviteCode(): string {
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

async function jobs() {
  const db = await database();
  const collection = db.collection<JobDoc>("jobs");
  await collection.createIndexes([
    { key: { jobId: 1 }, unique: true },
    { key: { inviteCode: 1 }, unique: true },
    { key: { "people.address": 1 } },
  ]);
  return collection;
}

async function activities() {
  const db = await database();
  const collection = db.collection<ActivityDoc>("activities");
  await collection.createIndex({ jobId: 1, at: -1 });
  return collection;
}

export async function createJobMeta(input: {
  jobId: number;
  title: string;
  brief: string;
  client: string;
  clientName: string;
  steps: { idx: number; title: string }[];
}): Promise<JobDoc> {
  const collection = await jobs();
  const existing = await collection.findOne({ jobId: input.jobId });
  if (existing) return existing;

  const doc: JobDoc = {
    jobId: input.jobId,
    title: input.title,
    brief: input.brief,
    client: input.client,
    inviteCode: newInviteCode(),
    createdAt: new Date(),
    people: [{ address: input.client, name: input.clientName }],
    steps: input.steps,
  };
  await collection.insertOne(doc);
  return doc;
}

export async function getJobMeta(jobId: number): Promise<JobDoc | null> {
  const collection = await jobs();
  return collection.findOne({ jobId });
}

export async function upsertName(jobId: number, address: string, name: string): Promise<void> {
  const collection = await jobs();
  const updated = await collection.updateOne(
    { jobId, "people.address": address },
    { $set: { "people.$.name": name } },
  );
  if (updated.matchedCount === 0) {
    await collection.updateOne({ jobId }, { $push: { people: { address, name } } });
  }
}

export async function jobsForAddress(address: string, limit = 12): Promise<JobDoc[]> {
  const collection = await jobs();
  return collection
    .find({ "people.address": address })
    .sort({ jobId: -1 })
    .limit(limit)
    .toArray();
}

export async function resolveInvite(code: string): Promise<JobDoc | null> {
  const collection = await jobs();
  return collection.findOne({ inviteCode: code.trim().toUpperCase() });
}

export async function logActivity(doc: Omit<ActivityDoc, "at">): Promise<void> {
  const collection = await activities();
  await collection.insertOne({ ...doc, at: new Date() });
}

export async function listActivity(jobId: number, limit = 30): Promise<ActivityDoc[]> {
  const collection = await activities();
  return collection.find({ jobId }).sort({ at: -1 }).limit(limit).toArray();
}

export function namesOf(doc: JobDoc | null): Record<string, string> {
  if (!doc) return {};
  return Object.fromEntries(doc.people.map((person) => [person.address, person.name]));
}

export function stepTitlesOf(doc: JobDoc | null): Record<number, string> {
  if (!doc) return {};
  return Object.fromEntries(doc.steps.map((step) => [step.idx, step.title]));
}
