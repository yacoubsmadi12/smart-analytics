import { and, desc, eq, sql } from "drizzle-orm";
import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import {
  aiConversations,
  complaints,
  customers,
  dataSources,
  networkKpis,
  revenues,
  auditLogs,
  importRuns,
  InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function getPersistedDashboardSummary() {
  const db = await getDb();
  if (!db) return null;
  const [network, sites, customerCount, openComplaintCount, risk, revenueRisk] = await Promise.all([
    db.select({ value: sql<string>`avg(${networkKpis.availability})` }).from(networkKpis),
    db.select({ value: sql<number>`count(distinct ${networkKpis.siteId})` }).from(networkKpis),
    db.select({ value: sql<number>`count(*)` }).from(customers),
    db.select({ value: sql<number>`count(*)` }).from(complaints).where(sql`${complaints.status} <> 'resolved'`),
    db.select({ value: sql<string>`avg(${customers.churnRisk})` }).from(customers),
    db.select({ value: sql<string>`sum(${revenues.atRisk})` }).from(revenues),
  ]);
  const numberValue = (value: unknown) => Number(value || 0);
  const summary = { networkHealth: numberValue(network[0]?.value), sites: numberValue(sites[0]?.value), customers: numberValue(customerCount[0]?.value), openComplaints: numberValue(openComplaintCount[0]?.value), cxRisk: numberValue(risk[0]?.value), revenueAtRisk: numberValue(revenueRisk[0]?.value), updatedMinutesAgo: 0 };
  return summary.sites || summary.customers || summary.openComplaints || summary.revenueAtRisk ? summary : null;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

const LOCAL_ADMIN_USERNAME = "admin";
const LOCAL_ADMIN_PASSWORD = "admin";
const LOCAL_ADMIN_SALT = "smart-analytics-local-v1";
export const hashLocalPassword = (password: string, salt = LOCAL_ADMIN_SALT) =>
  scryptSync(password, salt, 64).toString("hex");

export async function ensureLocalAdmin() {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await getUserByUsername(LOCAL_ADMIN_USERNAME);
  if (existing) return existing;
  await db
    .insert(users)
    .values({
      openId: "local_admin",
      username: LOCAL_ADMIN_USERNAME,
      passwordHash: hashLocalPassword(LOCAL_ADMIN_PASSWORD),
      name: "System Administrator",
      loginMethod: "local",
      role: "admin",
    });
  return getUserByUsername(LOCAL_ADMIN_USERNAME);
}

export type LocalRole = "user" | "admin";

export type PublicLocalUser = {
  id: number;
  username: string | null;
  name: string | null;
  email: string | null;
  role: LocalRole;
  isActive: boolean;
  createdAt: Date;
  lastSignedIn: Date;
};

function toPublicLocalUser(user: typeof users.$inferSelect): PublicLocalUser {
  return { id: user.id, username: user.username, name: user.name, email: user.email, role: user.role, isActive: user.isActive, createdAt: user.createdAt, lastSignedIn: user.lastSignedIn };
}

export async function listLocalUsers() {
  const db = await getDb();
  if (!db) return [] as PublicLocalUser[];
  const result = await db.select().from(users).orderBy(desc(users.createdAt));
  return result.map(toPublicLocalUser);
}

export async function createLocalUser(input: { username: string; password: string; name: string; email?: string; role: LocalRole; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const username = input.username.trim().toLowerCase();
  if (await getUserByUsername(username)) throw new Error("Username already exists");
  await db.insert(users).values({ openId: `local_${randomUUID()}`, username, passwordHash: hashLocalPassword(input.password), name: input.name.trim(), email: input.email?.trim() || null, loginMethod: "local", role: input.role });
  const created = await getUserByUsername(username);
  if (!created) throw new Error("User was created but could not be loaded");
  await db.insert(auditLogs).values({ userId: input.actorUserId, action: "user.created", resource: username, metadata: JSON.stringify({ role: input.role }) });
  return toPublicLocalUser(created);
}

export async function updateLocalUserRole(input: { userId: number; role: LocalRole; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const target = await getUserById(input.userId);
  if (!target) throw new Error("User not found");
  if (target.role === "admin" && input.role !== "admin") {
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
    if (admins.length <= 1) throw new Error("The last administrator cannot be demoted");
  }
  await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
  await db.insert(auditLogs).values({ userId: input.actorUserId, action: "user.role_updated", resource: target.username || String(target.id), metadata: JSON.stringify({ from: target.role, to: input.role }) });
  const updated = await getUserById(input.userId);
  return updated ? toPublicLocalUser(updated) : undefined;
}

export async function resetLocalUserPassword(input: { userId: number; password: string; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const target = await getUserById(input.userId);
  if (!target) throw new Error("User not found");
  await db.update(users).set({ passwordHash: hashLocalPassword(input.password), loginMethod: "local" }).where(eq(users.id, input.userId));
  await db.insert(auditLogs).values({ userId: input.actorUserId, action: "user.password_reset", resource: target.username || String(target.id), metadata: JSON.stringify({ targetUserId: target.id }) });
  return { success: true } as const;
}

export async function setLocalUserActive(input: { userId: number; isActive: boolean; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const target = await getUserById(input.userId);
  if (!target) throw new Error("User not found");
  if (!input.isActive && target.id === input.actorUserId) throw new Error("You cannot disable your own account");
  if (!input.isActive && target.role === "admin" && target.isActive) {
    const activeAdmins = await db.select({ id: users.id }).from(users).where(and(eq(users.role, "admin"), eq(users.isActive, true)));
    if (activeAdmins.length <= 1) throw new Error("The last active administrator cannot be disabled");
  }
  await db.update(users).set({ isActive: input.isActive }).where(eq(users.id, input.userId));
  await db.insert(auditLogs).values({ userId: input.actorUserId, action: input.isActive ? "user.enabled" : "user.disabled", resource: target.username || String(target.id), metadata: JSON.stringify({ targetUserId: target.id, isActive: input.isActive }) });
  const updated = await getUserById(input.userId);
  return updated ? toPublicLocalUser(updated) : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return result[0];
}

export function verifyLocalPassword(
  password: string,
  passwordHash: string | null
) {
  if (!passwordHash) return false;
  const actual = Buffer.from(hashLocalPassword(password), "hex");
  const expected = Buffer.from(passwordHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createAiConversation(input: {
  userId: number;
  domain: string;
  question: string;
  answer: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(aiConversations).values(input);
}

export async function listAiConversations(userId: number, domain?: string) {
  const db = await getDb();
  if (!db) return [];
  const condition = domain
    ? and(
        eq(aiConversations.userId, userId),
        eq(aiConversations.domain, domain)
      )
    : eq(aiConversations.userId, userId);
  return db
    .select()
    .from(aiConversations)
    .where(condition)
    .orderBy(desc(aiConversations.createdAt))
    .limit(20);
}

export async function listDataSources() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dataSources).orderBy(desc(dataSources.createdAt));
}

export async function createDataSource(input: {
  name: string;
  type: string;
  connectionRef?: string;
  secretEnv?: string;
  userId: number;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .insert(dataSources)
    .values({
      name: input.name,
      type: input.type,
      connectionRef: input.connectionRef,
      secretEnv: input.secretEnv,
      status: "pending",
    });
  await db
    .insert(auditLogs)
    .values({
      userId: input.userId,
      action: "data_source.created",
      resource: input.name,
      metadata: JSON.stringify({
        type: input.type,
        connectionRef: input.connectionRef,
        secretEnv: input.secretEnv,
      }),
    });
  return result;
}

export async function updateDataSourceSync(sourceId: number, status: string, latencyMs?: number) {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  const update: Record<string, unknown> = { status, lastSyncAt: now };
  if (latencyMs !== undefined) update.latencyMs = latencyMs;
  if (status === "healthy") update.lastSuccessfulCheckAt = now;
  await db.update(dataSources).set(update).where(eq(dataSources.id, sourceId));
}

export async function createImportRun(input: {
  sourceId?: number;
  userId: number;
  method: string;
  fileName?: string;
  status?: "received" | "validated" | "rejected" | "processed";
  rowCount: number;
  validRows: number;
  invalidRows: number;
  schemaJson?: string;
  errorsJson?: string;
  mappingJson?: string;
  storageKey?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(importRuns).values(input);
  await db
    .insert(auditLogs)
    .values({
      userId: input.userId,
      action: "data_import.received",
      resource: input.fileName || input.method,
      metadata: JSON.stringify({
        method: input.method,
        rowCount: input.rowCount,
        validRows: input.validRows,
        invalidRows: input.invalidRows,
      }),
    });
  return result;
}

export async function saveImportMapping(input: {
  importRunId: number;
  userId: number;
  mappingJson: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(importRuns)
    .set({ mappingJson: input.mappingJson })
    .where(eq(importRuns.id, input.importRunId));
  await db
    .insert(auditLogs)
    .values({
      userId: input.userId,
      action: "data_import.mapping_saved",
      resource: String(input.importRunId),
      metadata: input.mappingJson,
    });
}

export async function listImportRuns(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(importRuns)
    .where(eq(importRuns.userId, userId))
    .orderBy(desc(importRuns.createdAt))
    .limit(50);
}

// Feature queries are kept server-side so credentials and authorization never reach the client.
