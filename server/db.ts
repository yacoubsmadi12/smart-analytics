import { and, desc, eq } from "drizzle-orm";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { aiConversations, InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

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
      values.role = 'admin';
      updateSet.role = 'admin';
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
const hashLocalPassword = (password: string, salt = LOCAL_ADMIN_SALT) => scryptSync(password, salt, 64).toString("hex");

export async function ensureLocalAdmin() {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await getUserByUsername(LOCAL_ADMIN_USERNAME);
  if (existing) return existing;
  await db.insert(users).values({ openId: "local_admin", username: LOCAL_ADMIN_USERNAME, passwordHash: hashLocalPassword(LOCAL_ADMIN_PASSWORD), name: "System Administrator", loginMethod: "local", role: "admin" });
  return getUserByUsername(LOCAL_ADMIN_USERNAME);
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0];
}

export function verifyLocalPassword(password: string, passwordHash: string | null) {
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

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createAiConversation(input: { userId: number; domain: string; question: string; answer: string }) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(aiConversations).values(input);
}

export async function listAiConversations(userId: number, domain?: string) {
  const db = await getDb();
  if (!db) return [];
  const condition = domain ? and(eq(aiConversations.userId, userId), eq(aiConversations.domain, domain)) : eq(aiConversations.userId, userId);
  return db.select().from(aiConversations).where(condition).orderBy(desc(aiConversations.createdAt)).limit(20);
}

// Feature queries are kept server-side so credentials and authorization never reach the client.
