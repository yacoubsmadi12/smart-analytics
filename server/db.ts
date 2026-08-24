import { and, desc, eq, sql } from "drizzle-orm";
import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import {
  aiConversations,
  complaints,
  customers,
  cells,
  sites,
  fiberInfrastructure,
  salesOpportunities,
  marketingCampaigns,
  dataSources,
  networkKpis,
  revenues,
  auditLogs,
  importRuns,
  InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { assembleNetworkOperations, networkReason, networkStatus, type NetworkCell } from "./network-analytics";
import { assembleCustomerExperience, type CustomerExperienceAreaInput } from "./cx-analytics";
import { assembleInfrastructureOperations } from "./infrastructure-analytics";
import { assembleSalesOperations } from "./sales-analytics";
import { assembleMarketingOperations } from "./marketing-analytics";
import { assembleBusinessRevenueOperations } from "./business-revenue-analytics";
import { assemblePrioritiesOperations, type PriorityInput } from "./priorities-analytics";
import { assembleCustomerOperations, type CustomerAreaInput } from "./customers-analytics";
import { assembleComplaintOperations, isNetworkComplaint, type ComplaintRecord } from "./complaints-analytics";

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

export async function getPersistedNetworkOperations() {
  const db = await getDb();
  if (!db) return null;
  try {
    const [cellRows, kpiRows, complaintRows, customerRows, fiberRows] = await Promise.all([
      db.select({ cell: cells, site: sites }).from(cells).leftJoin(sites, eq(cells.siteId, sites.id)),
      db.select().from(networkKpis).orderBy(desc(networkKpis.recordedAt)).limit(120),
      db.select({ siteId: complaints.siteId, total: sql<number>`count(*)` }).from(complaints).where(sql`${complaints.status} <> 'resolved'`).groupBy(complaints.siteId),
      db.select({ region: customers.region, total: sql<number>`count(*)` }).from(customers).groupBy(customers.region),
      db.select({ region: fiberInfrastructure.region, availability: sql<string>`avg(${fiberInfrastructure.availability})` }).from(fiberInfrastructure).groupBy(fiberInfrastructure.region),
    ]);
    if (!cellRows.length) return null;
    const numberValue = (value: unknown) => Number(value || 0);
    const latestKpi = new Map<number, typeof kpiRows[number]>();
    kpiRows.forEach(row => { if (!latestKpi.has(row.siteId)) latestKpi.set(row.siteId, row); });
    const complaintBySite = new Map<number, number>();
    complaintRows.forEach(row => { if (row.siteId !== null) complaintBySite.set(row.siteId, numberValue(row.total)); });
    const customersByRegion = new Map<string, number>();
    customerRows.forEach(row => { if (row.region) customersByRegion.set(row.region, numberValue(row.total)); });
    const fiberByRegion = new Map<string, number>();
    fiberRows.forEach(row => { if (row.region && row.availability !== null) fiberByRegion.set(row.region, numberValue(row.availability)); });
    const cellsBySite = new Map<number, number>();
    cellRows.forEach(row => cellsBySite.set(row.cell.siteId, (cellsBySite.get(row.cell.siteId) ?? 0) + 1));
    const persistedCells: NetworkCell[] = cellRows.map(({ cell, site }, index) => {
      const kpi = latestKpi.get(cell.siteId);
      const availability = numberValue(cell.availability ?? kpi?.availability);
      const congestion = numberValue(cell.congestion ?? kpi?.congestion);
      const throughput = numberValue(cell.throughput ?? kpi?.throughputMbps);
      const region = site?.region ?? site?.name ?? "Unmapped region";
      const siteKey = site?.siteCode ?? `SITE-${cell.siteId}`;
      const siteName = site?.name ?? siteKey;
      const siteCustomers = customersByRegion.get(region) ?? 0;
      const siteComplaints = complaintBySite.get(cell.siteId) ?? 0;
      return {
        cellCode: cell.cellCode,
        siteId: siteKey,
        siteName,
        technology: cell.technology,
        availability,
        traffic: Number((numberValue(kpi?.trafficTb) / Math.max(1, cellsBySite.get(cell.siteId) ?? 1)).toFixed(3)),
        congestion,
        throughput,
        coverage: availability,
        impactedCustomers: Math.round(siteCustomers / Math.max(1, cellsBySite.get(cell.siteId) ?? 1)),
        complaints: Math.round(siteComplaints / Math.max(1, cellsBySite.get(cell.siteId) ?? 1)),
        fiber: fiberByRegion.get(region) ?? null,
        reason: networkReason(availability, congestion, throughput),
        status: networkStatus(availability, congestion),
      } satisfies NetworkCell;
    });
    const latestTimestamp = kpiRows[0]?.recordedAt?.toISOString() ?? new Date().toISOString();
    const result = assembleNetworkOperations("persisted", persistedCells, latestTimestamp);
    const trendRows = [...kpiRows].reverse().slice(-5);
    if (trendRows.length) {
      result.trends = trendRows.map(row => ({
        label: new Date(row.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        availability: numberValue(row.availability),
        congestion: numberValue(row.congestion),
        throughput: numberValue(row.throughputMbps),
      }));
    }
    return result;
  } catch (error) {
    console.warn("[Database] Network operations query unavailable:", error);
    return null;
  }
}

export async function getPersistedCustomerExperience() {
  const db = await getDb();
  if (!db) return null;
  try {
    const [customerRows, complaintRows, kpiRows, fiberRows] = await Promise.all([
      db.select({ region: customers.region, customers: sql<number>`count(*)`, churnRisk: sql<string>`avg(${customers.churnRisk})` }).from(customers).groupBy(customers.region),
      db.select({ region: customers.region, complaints: sql<number>`count(*)` }).from(complaints).leftJoin(customers, eq(complaints.customerId, customers.id)).where(sql`${complaints.status} <> 'resolved'`).groupBy(customers.region),
      db.select({ region: sites.region, availability: sql<string>`avg(${networkKpis.availability})`, congestion: sql<string>`avg(${networkKpis.congestion})`, throughput: sql<string>`avg(${networkKpis.throughputMbps})` }).from(networkKpis).leftJoin(sites, eq(networkKpis.siteId, sites.id)).groupBy(sites.region),
      db.select({ region: fiberInfrastructure.region, fiber: sql<string>`avg(${fiberInfrastructure.availability})` }).from(fiberInfrastructure).groupBy(fiberInfrastructure.region),
    ]);
    if (!customerRows.length && !complaintRows.length && !kpiRows.length) return null;
    const numberValue = (value: unknown, fallback = 0) => Number(value ?? fallback);
    const complaintByRegion = new Map(complaintRows.map(row => [row.region ?? "Unmapped", numberValue(row.complaints)]));
    const kpiByRegion = new Map(kpiRows.map(row => [row.region ?? "Unmapped", { availability: numberValue(row.availability, 98), congestion: numberValue(row.congestion, 35), throughput: numberValue(row.throughput, 45) }]));
    const fiberByRegion = new Map(fiberRows.map(row => [row.region ?? "Unmapped", numberValue(row.fiber, 80)]));
    const regions = Array.from(new Set([...customerRows.map(row => row.region ?? "Unmapped"), ...complaintRows.map(row => row.region ?? "Unmapped"), ...kpiRows.map(row => row.region ?? "Unmapped")]));
    const inputs: CustomerExperienceAreaInput[] = regions.map((region, index) => {
      const customerRow = customerRows.find(row => (row.region ?? "Unmapped") === region);
      const kpi = kpiByRegion.get(region) ?? { availability: 98, congestion: 35, throughput: 45 };
      return { id: `CX-${String(index + 1).padStart(3, "0")}`, name: region, region, customers: numberValue(customerRow?.customers), complaints: complaintByRegion.get(region) ?? 0, churnRisk: numberValue(customerRow?.churnRisk), availability: kpi.availability, congestion: kpi.congestion, throughput: kpi.throughput, fiber: fiberByRegion.get(region) ?? null, source: "persisted" };
    });
    return assembleCustomerExperience("persisted", inputs);
  } catch (error) {
    console.warn("[Database] Customer experience query unavailable:", error);
    return null;
  }
}

export async function getPersistedCustomerOperations() {
  const db = await getDb();
  if (!db) return null;
  try {
    const [customerRows, complaintRows, siteRows, kpiRows] = await Promise.all([
      db.select({ region: customers.region, customers: sql<number>`count(*)`, enterpriseCustomers: sql<number>`sum(case when ${customers.segment} = 'enterprise' then 1 else 0 end)`, highValueCustomers: sql<number>`sum(case when ${customers.segment} = 'high_value' then 1 else 0 end)`, highChurnCustomers: sql<number>`sum(case when ${customers.churnRisk} >= 7 then 1 else 0 end)`, churnRisk: sql<string>`avg(${customers.churnRisk})` }).from(customers).groupBy(customers.region),
      db.select({ region: customers.region, complaints: sql<number>`count(*)` }).from(complaints).leftJoin(customers, eq(complaints.customerId, customers.id)).where(sql`${complaints.status} <> 'resolved'`).groupBy(customers.region),
      db.select({ id: sites.id, siteCode: sites.siteCode, name: sites.name, region: sites.region, latitude: sites.latitude, longitude: sites.longitude }).from(sites),
      db.select({ siteId: networkKpis.siteId, congestion: sql<string>`avg(${networkKpis.congestion})` }).from(networkKpis).groupBy(networkKpis.siteId),
    ]);
    if (!customerRows.length && !siteRows.length) return null;
    const numberValue = (value: unknown, fallback = 0) => Number(value ?? fallback);
    const complaintByRegion = new Map(complaintRows.map(row => [row.region ?? "Unmapped", numberValue(row.complaints)]));
    const kpiBySite = new Map(kpiRows.map(row => [row.siteId, numberValue(row.congestion)]));
    const regions = Array.from(new Set([...customerRows.map(row => row.region ?? "Unmapped"), ...siteRows.map(row => row.region ?? row.name ?? "Unmapped")]));
    const inputs: CustomerAreaInput[] = regions.map((region, index) => {
      const customerRow = customerRows.find(row => (row.region ?? "Unmapped") === region);
      const regionSite = siteRows.find(site => (site.region ?? site.name ?? "Unmapped") === region);
      const regionSites = siteRows.filter(site => (site.region ?? site.name ?? "Unmapped") === region);
      const congestedCells = regionSites.reduce((sum, site) => sum + (kpiBySite.get(site.id) ?? 0 >= 70 ? 1 : 0), 0);
      return { id: regionSite?.siteCode ?? `CUST-${String(index + 1).padStart(3, "0")}`, name: regionSite?.name ?? region, region, customers: numberValue(customerRow?.customers), enterpriseCustomers: numberValue(customerRow?.enterpriseCustomers), highValueCustomers: numberValue(customerRow?.highValueCustomers), highChurnCustomers: numberValue(customerRow?.highChurnCustomers), churnRisk: numberValue(customerRow?.churnRisk), density: Math.round(numberValue(customerRow?.customers) / Math.max(1, regionSites.length * 10)), latitude: Number(regionSite?.latitude ?? 31.95), longitude: Number(regionSite?.longitude ?? 35.91), congestedCells, nearestCongestedCellKm: congestedCells > 0 ? 0.8 : null, complaints: complaintByRegion.get(region) ?? 0, source: "persisted" };
    });
    return assembleCustomerOperations("persisted", inputs);
  } catch (error) {
    console.warn("[Database] Customer operations query unavailable:", error);
    return null;
  }
}

export async function getPersistedComplaintOperations() {
  const db = await getDb();
  if (!db) return null;
  try {
    const [complaintRows, cellRows] = await Promise.all([
      db.select({ complaint: complaints, site: sites, customer: customers }).from(complaints).leftJoin(sites, eq(complaints.siteId, sites.id)).leftJoin(customers, eq(complaints.customerId, customers.id)),
      db.select({ siteId: cells.siteId, cellCode: cells.cellCode, congestion: cells.congestion, availability: cells.availability }).from(cells),
    ]);
    if (!complaintRows.length) return null;
    const numberValue = (value: unknown) => Number(value ?? 0);
    const worstCellsBySite = new Map<number, string[]>();
    cellRows.forEach(row => {
      const isWorst = numberValue(row.congestion) >= 70 || numberValue(row.availability) < 95;
      if (isWorst) worstCellsBySite.set(row.siteId, [...(worstCellsBySite.get(row.siteId) ?? []), row.cellCode]);
    });
    const records: ComplaintRecord[] = complaintRows.map(({ complaint, site, customer }) => {
      const worstCells = complaint.siteId ? (worstCellsBySite.get(complaint.siteId) ?? []) : [];
      const category = complaint.category || "Uncategorized";
      const networkRelated = isNetworkComplaint(category) || worstCells.length > 0;
      const region = site?.region ?? customer?.region ?? site?.name ?? "Unmapped region";
      return {
        id: String(complaint.id),
        category,
        severity: complaint.severity,
        status: complaint.status,
        count: 1,
        region,
        siteId: complaint.siteId ? String(complaint.siteId) : null,
        latitude: numberValue(site?.latitude) || 31.95,
        longitude: numberValue(site?.longitude) || 35.91,
        networkRelated,
        coveredWorstCellCount: networkRelated && worstCells.length ? 1 : 0,
        worstCellCodes: worstCells.slice(0, 3),
      };
    });
    return assembleComplaintOperations("persisted", records);
  } catch (error) {
    console.warn("[Database] Complaint operations query unavailable:", error);
    return null;
  }
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
export const TEMPORARY_PASSWORD_TTL_DAYS = 7;
export function temporaryPasswordExpiry(now = new Date()) {
  return new Date(now.getTime() + TEMPORARY_PASSWORD_TTL_DAYS * 24 * 60 * 60 * 1000);
}
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
  temporaryPasswordExpiresAt: Date | null;
  createdAt: Date;
  lastSignedIn: Date;
};

function toPublicLocalUser(user: typeof users.$inferSelect): PublicLocalUser {
  return { id: user.id, username: user.username, name: user.name, email: user.email, role: user.role, isActive: user.isActive, temporaryPasswordExpiresAt: user.temporaryPasswordExpiresAt, createdAt: user.createdAt, lastSignedIn: user.lastSignedIn };
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
  await db.insert(users).values({ openId: `local_${randomUUID()}`, username, passwordHash: hashLocalPassword(input.password), temporaryPasswordExpiresAt: temporaryPasswordExpiry(), name: input.name.trim(), email: input.email?.trim() || null, loginMethod: "local", role: input.role });
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
  await db.update(users).set({ passwordHash: hashLocalPassword(input.password), temporaryPasswordExpiresAt: temporaryPasswordExpiry(), loginMethod: "local" }).where(eq(users.id, input.userId));
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


export async function getPersistedInfrastructureOperations() {
  const db = await getDb();
  if (!db) return null;
  try {
    const [fiberRows, siteRows, cellRows] = await Promise.all([
      db.select().from(fiberInfrastructure),
      db.select({ id: sites.id, siteCode: sites.siteCode, name: sites.name, region: sites.region, latitude: sites.latitude, longitude: sites.longitude }).from(sites),
      db.select({ siteId: cells.siteId, congestion: cells.congestion }).from(cells),
    ]);
    if (!fiberRows.length) return null;
    const numberValue = (value: unknown, fallback = 0) => { const number = Number(value); return Number.isFinite(number) ? number : fallback; };
    const congestionByRegion = new Map<string, number[]>();
    cellRows.forEach(row => {
      const site = siteRows.find(item => item.id === row.siteId);
      const region = site?.region ?? site?.name ?? "Unmapped region";
      const values = congestionByRegion.get(region) ?? [];
      values.push(numberValue(row.congestion));
      congestionByRegion.set(region, values);
    });
    const records = fiberRows.map((row, index) => {
      const region = row.region ?? "Unmapped region";
      const regionSites = siteRows.filter(site => (site.region ?? site.name ?? "Unmapped region") === region);
      const site = regionSites[index % Math.max(1, regionSites.length)];
      const congestionValues = congestionByRegion.get(region) ?? [];
      const congestion = congestionValues.length ? congestionValues.reduce((sum, value) => sum + value, 0) / congestionValues.length : 35;
      const fiberAvailability = numberValue(row.availability, 0);
      return { id: String(row.id), nodeCode: row.nodeCode, region, latitude: numberValue(row.latitude ?? site?.latitude, 31.95), longitude: numberValue(row.longitude ?? site?.longitude, 35.91), fiberAvailability, congestion, status: row.status ?? "healthy", backhaul: fiberAvailability >= 95 ? "fiber" : fiberAvailability >= 80 ? "mixed" : "microwave", plannedUpgrade: congestion >= 70 || fiberAvailability < 85, linkCount: Math.max(1, regionSites.length || 1) } as const;
    });
    return assembleInfrastructureOperations("persisted", records);
  } catch (error) {
    console.warn("[Database] Infrastructure operations query unavailable:", error);
    return null;
  }
}


export async function getPersistedSalesOperations() {
  const db = await getDb();
  if (!db) return null;
  try {
    const [opportunityRows, customerRows, siteRows, kpiRows, fiberRows] = await Promise.all([
      db.select().from(salesOpportunities),
      db.select({ id: customers.id, externalRef: customers.externalRef, segment: customers.segment }).from(customers),
      db.select({ id: sites.id, name: sites.name, region: sites.region, latitude: sites.latitude, longitude: sites.longitude }).from(sites),
      db.select({ siteId: networkKpis.siteId, congestion: sql<string>`avg(${networkKpis.congestion})` }).from(networkKpis).groupBy(networkKpis.siteId),
      db.select({ region: fiberInfrastructure.region, availability: sql<string>`avg(${fiberInfrastructure.availability})` }).from(fiberInfrastructure).groupBy(fiberInfrastructure.region),
    ]);
    if (!opportunityRows.length) return null;
    const numberValue = (value: unknown, fallback = 0) => { const n = Number(value); return Number.isFinite(n) ? n : fallback; };
    const kpiBySite = new Map(kpiRows.map(row => [row.siteId, numberValue(row.congestion, 35)]));
    const fiberByRegion = new Map(fiberRows.map(row => [row.region ?? "Unmapped region", numberValue(row.availability, 80)]));
    const inputs = opportunityRows.map((opportunity, index) => {
      const customer = customerRows.find(item => item.id === opportunity.customerId);
      const region = opportunity.region ?? "Unmapped region";
      const site = siteRows.find(item => (item.region ?? item.name) === region) ?? siteRows[index % Math.max(1, siteRows.length)];
      const congestion = site ? numberValue(kpiBySite.get(site.id), 35) : 35;
      const fiberReadiness = numberValue(fiberByRegion.get(region), 80);
      return { id: String(opportunity.id), accountName: customer?.externalRef ?? `Account ${opportunity.id}`, region, latitude: numberValue(site?.latitude, 31.95), longitude: numberValue(site?.longitude, 35.91), stage: opportunity.stage ?? "Qualified", value: numberValue(opportunity.value), probability: numberValue(opportunity.probability), enterprise: customer?.segment === "enterprise", customerSegment: customer?.segment ?? "high_value", networkReadiness: Math.max(0, 100 - congestion), fiberReadiness, siteName: site?.name ?? region } as const;
    });
    return assembleSalesOperations("persisted", inputs);
  } catch (error) {
    console.warn("[Database] Sales operations query unavailable:", error);
    return null;
  }
}


export async function getPersistedMarketingOperations() {
  const db = await getDb();
  if (!db) return null;
  try {
    const [campaignRows, customerRows, complaintRows, siteRows, kpiRows, fiberRows] = await Promise.all([
      db.select().from(marketingCampaigns),
      db.select({ id: customers.id, region: customers.region, segment: customers.segment, churnRisk: customers.churnRisk }).from(customers),
      db.select({ siteId: complaints.siteId, severity: complaints.severity }).from(complaints),
      db.select({ id: sites.id, name: sites.name, region: sites.region, latitude: sites.latitude, longitude: sites.longitude }).from(sites),
      db.select({ siteId: networkKpis.siteId, congestion: sql<string>`avg(${networkKpis.congestion})` }).from(networkKpis).groupBy(networkKpis.siteId),
      db.select({ region: fiberInfrastructure.region, availability: sql<string>`avg(${fiberInfrastructure.availability})` }).from(fiberInfrastructure).groupBy(fiberInfrastructure.region),
    ]);
    if (!campaignRows.length) return null;
    const numberValue = (value: unknown, fallback = 0) => { const n = Number(value); return Number.isFinite(n) ? n : fallback; };
    const customersByRegion = new Map<string, typeof customerRows>();
    for (const customer of customerRows) { const key = customer.region ?? "Unmapped region"; customersByRegion.set(key, [...(customersByRegion.get(key) ?? []), customer]); }
    const complaintsBySite = new Map<number, number>();
    for (const complaint of complaintRows) if (complaint.siteId) complaintsBySite.set(complaint.siteId, (complaintsBySite.get(complaint.siteId) ?? 0) + 1);
    const kpiBySite = new Map(kpiRows.map(row => [row.siteId, numberValue(row.congestion, 35)]));
    const fiberByRegion = new Map(fiberRows.map(row => [row.region ?? "Unmapped region", numberValue(row.availability, 80)]));
    const inputs = campaignRows.map((campaign, index) => {
      const region = campaign.region ?? "Unmapped region";
      const site = siteRows.find(item => (item.region ?? item.name) === region) ?? siteRows[index % Math.max(1, siteRows.length)];
      const regionalCustomers = customersByRegion.get(region) ?? [];
      const avgChurn = regionalCustomers.length ? regionalCustomers.reduce((sum, item) => sum + numberValue(item.churnRisk), 0) / regionalCustomers.length : 0;
      const complaintCount = site ? complaintsBySite.get(site.id) ?? 0 : 0;
      const congestion = site ? numberValue(kpiBySite.get(site.id), 35) : 35;
      return { id: String(campaign.id), name: campaign.name, region, status: campaign.status ?? "Planned", budget: numberValue(campaign.budget), conversionRate: numberValue(campaign.conversionRate), targetArea: region, marketPotential: Math.min(99, Math.round(45 + regionalCustomers.length / 10)), fiveGPotential: Math.min(100, Math.round(45 + (site ? 4 : 0) * 8)), customerSegment: regionalCustomers[0]?.segment ?? "consumer", churnRisk: avgChurn, complaintRate: regionalCustomers.length ? Number((complaintCount / regionalCustomers.length * 1000).toFixed(1)) : 0, networkReadiness: Math.max(0, 100 - congestion), fiberReadiness: numberValue(fiberByRegion.get(region), 80) } as const;
    });
    return assembleMarketingOperations("persisted", inputs);
  } catch (error) {
    console.warn("[Database] Marketing operations query unavailable:", error);
    return null;
  }
}


export async function getPersistedBusinessRevenueOperations() {
  const db = await getDb();
  if (!db) return null;
  try {
    const [revenueRows, customerRows, complaintRows, siteRows, kpiRows, salesRows] = await Promise.all([
      db.select().from(revenues),
      db.select({ id: customers.id, region: customers.region, segment: customers.segment, churnRisk: customers.churnRisk }).from(customers),
      db.select({ siteId: complaints.siteId }).from(complaints),
      db.select({ id: sites.id, name: sites.name, region: sites.region }).from(sites),
      db.select({ siteId: networkKpis.siteId, congestion: sql<string>`avg(${networkKpis.congestion})` }).from(networkKpis).groupBy(networkKpis.siteId),
      db.select({ region: salesOpportunities.region, value: sql<string>`sum(${salesOpportunities.value})` }).from(salesOpportunities).groupBy(salesOpportunities.region),
    ]);
    if (!revenueRows.length) return null;
    const num = (value: unknown, fallback = 0) => { const n = Number(value); return Number.isFinite(n) ? n : fallback; };
    const customersByRegion = new Map<string, typeof customerRows>();
    for (const customer of customerRows) { const key = customer.region ?? "Unmapped region"; customersByRegion.set(key, [...(customersByRegion.get(key) ?? []), customer]); }
    const complaintBySite = new Map<number, number>();
    for (const complaint of complaintRows) if (complaint.siteId) complaintBySite.set(complaint.siteId, (complaintBySite.get(complaint.siteId) ?? 0) + 1);
    const kpiBySite = new Map(kpiRows.map(row => [row.siteId, num(row.congestion, 35)]));
    const pipelineByRegion = new Map(salesRows.map(row => [row.region ?? "Unmapped region", num(row.value)]));
    const inputs = revenueRows.map((row, index) => {
      const region = row.region ?? "Unmapped region";
      const site = siteRows.find(item => (item.region ?? item.name) === region) ?? siteRows[index % Math.max(1, siteRows.length)];
      const regionalCustomers = customersByRegion.get(region) ?? [];
      const customersAtRisk = regionalCustomers.filter(item => num(item.churnRisk) >= 6).length;
      const enterpriseImpact = regionalCustomers.filter(item => item.segment === "enterprise").length;
      const congestion = site ? num(kpiBySite.get(site.id), 35) : 35;
      const networkIssue = congestion >= 70;
      const revenueAtRisk = num(row.atRisk);
      const salesPipeline = num(pipelineByRegion.get(region));
      return { id: String(row.id), region, period: row.period, revenueAtRisk, customersAtRisk, enterpriseImpact, salesPipeline, revenueOpportunity: Math.round(salesPipeline * (networkIssue ? 0.35 : 0.62)), investmentOpportunity: networkIssue ? Math.round(revenueAtRisk * 0.6) : Math.round(revenueAtRisk * 0.12), networkHealth: Math.max(0, 100 - congestion), networkIssue, action: networkIssue ? "Network remediation" : "Protect and grow", status: networkIssue ? "Urgent" : "Opportunity" };
    });
    return assembleBusinessRevenueOperations("persisted", inputs);
  } catch (error) {
    console.warn("[Database] Business & Revenue operations query unavailable:", error);
    return null;
  }
}


export async function getPersistedPrioritiesOperations() {
  const db = await getDb();
  if (!db) return null;
  try {
    const [siteRows, kpiRows, customerRows, complaintRows, revenueRows, salesRows, fiberRows] = await Promise.all([
      db.select({ id: sites.id, name: sites.name, region: sites.region }).from(sites),
      db.select({ siteId: networkKpis.siteId, congestion: sql<string>`avg(${networkKpis.congestion})`, throughput: sql<string>`avg(${networkKpis.throughputMbps})` }).from(networkKpis).groupBy(networkKpis.siteId),
      db.select({ region: customers.region, churnRisk: customers.churnRisk }).from(customers),
      db.select({ siteId: complaints.siteId, severity: complaints.severity, status: complaints.status }).from(complaints),
      db.select({ region: revenues.region, atRisk: revenues.atRisk }).from(revenues),
      db.select({ region: salesOpportunities.region, value: salesOpportunities.value }).from(salesOpportunities),
      db.select({ region: fiberInfrastructure.region, availability: fiberInfrastructure.availability }).from(fiberInfrastructure),
    ]);
    if (!siteRows.length) return null;
    const num = (value: unknown, fallback = 0) => { const n = Number(value); return Number.isFinite(n) ? n : fallback; };
    const kpiBySite = new Map(kpiRows.map(row => [row.siteId, { congestion: num(row.congestion, 35), throughput: num(row.throughput, 0) }]));
    const customersByRegion = new Map<string, number>();
    for (const row of customerRows) { const key = row.region ?? "Unmapped region"; if (num(row.churnRisk) >= 6) customersByRegion.set(key, (customersByRegion.get(key) ?? 0) + 1); }
    const complaintsBySite = new Map<number, number>();
    for (const row of complaintRows) if (row.siteId && row.status !== "resolved") complaintsBySite.set(row.siteId, (complaintsBySite.get(row.siteId) ?? 0) + 1);
    const revenueByRegion = new Map<string, number>();
    for (const row of revenueRows) { const key = row.region ?? "Unmapped region"; revenueByRegion.set(key, (revenueByRegion.get(key) ?? 0) + num(row.atRisk)); }
    const pipelineByRegion = new Map<string, number>();
    for (const row of salesRows) { const key = row.region ?? "Unmapped region"; pipelineByRegion.set(key, (pipelineByRegion.get(key) ?? 0) + num(row.value)); }
    const fiberByRegion = new Map<string, number>();
    for (const row of fiberRows) { const key = row.region ?? "Unmapped region"; fiberByRegion.set(key, Math.max(fiberByRegion.get(key) ?? 0, num(row.availability, 0))); }
    const inputs = siteRows.flatMap(site => {
      const region = site.region ?? site.name;
      const kpi = kpiBySite.get(site.id) ?? { congestion: 35, throughput: 0 };
      const revenueRisk = revenueByRegion.get(region) ?? 0;
      const affectedCustomers = customersByRegion.get(region) ?? 0;
      const complaintCount = complaintsBySite.get(site.id) ?? 0;
      const fiber = fiberByRegion.get(region) ?? 70;
      const networkHealth = Math.max(0, 100 - kpi.congestion);
      const items = [] as PriorityInput[];
      if (kpi.congestion >= 70) items.push({ id: `${site.id}-congestion`, region, issue: "4G congestion", category: "network", score: Math.round(kpi.congestion), severity: kpi.congestion >= 85 ? "critical" : "high", affectedCustomers: Math.max(affectedCustomers, Math.round(kpi.congestion * 8)), revenueRisk, salesPipeline: pipelineByRegion.get(region) ?? 0, complaintCount, networkHealth, action: "Capacity Upgrade", rationale: `${Math.round(kpi.congestion)}% congestion is reducing available headroom.` });
      if (fiber < 80) items.push({ id: `${site.id}-backhaul`, region, issue: "Poor backhaul", category: "fiber", score: Math.round(100 - fiber), severity: fiber < 65 ? "high" : "medium", affectedCustomers: Math.max(affectedCustomers, 80), revenueRisk: Math.round(revenueRisk * 0.55), salesPipeline: pipelineByRegion.get(region) ?? 0, complaintCount, networkHealth, action: "Fiber Migration", rationale: `${Math.round(fiber)}% fiber readiness leaves the site exposed to backhaul pressure.` });
      if (complaintCount >= 3) items.push({ id: `${site.id}-complaints`, region, issue: "High complaints", category: "customer", score: Math.min(100, complaintCount * 8), severity: complaintCount >= 10 ? "high" : "medium", affectedCustomers: Math.max(affectedCustomers, complaintCount * 12), revenueRisk: Math.round(revenueRisk * 0.42), salesPipeline: pipelineByRegion.get(region) ?? 0, complaintCount, networkHealth, action: "Network Investigation", rationale: `${complaintCount} open complaints are concentrated around this site.` });
      return items;
    });
    return inputs.length ? assemblePrioritiesOperations("persisted", inputs) : null;
  } catch (error) {
    console.warn("[Database] Priorities query unavailable:", error);
    return null;
  }
}
