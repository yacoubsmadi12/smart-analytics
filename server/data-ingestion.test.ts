import { describe, expect, it, vi } from "vitest";

const dbSpy = vi.hoisted(() => ({ created: [] as unknown[], mappings: [] as unknown[] }));

vi.mock("./db", () => ({
  listDataSources: vi.fn(async () => []),
  createDataSource: vi.fn(async (input: unknown) => { dbSpy.created.push(input); return { success: true }; }),
  createImportRun: vi.fn(async () => ({ success: true })),
  saveImportMapping: vi.fn(async (input: unknown) => { dbSpy.mappings.push(input); }),
  updateDataSourceSync: vi.fn(async () => undefined),
}));
vi.mock("./storage", () => ({ storagePut: vi.fn(async () => ({ key: "imports/test.csv", url: "/manus-storage/imports/test.csv" })) }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(role: "admin" | "user"): TrpcContext {
  return { user: { id: role === "admin" ? 1 : 2, openId: `${role}-source-test`, username: role, passwordHash: null, name: role === "admin" ? "Administrator" : "Operator", email: null, loginMethod: "local", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("data ingestion authorization and validation", () => {
  it("rejects source management for non-admin users", async () => { const caller = appRouter.createCaller(context("user")); await expect(caller.data.sources()).rejects.toMatchObject({ code: "FORBIDDEN" }); await expect(caller.data.registerSource({ datasetKey: "customers", name: "CRM", type: "api", connectionRef: "https://internal.example/api" })).rejects.toMatchObject({ code: "FORBIDDEN" }); });
  it("rejects unsupported manual upload extensions before storage", async () => { const caller = appRouter.createCaller(context("admin")); await expect(caller.data.manualImport({ datasetKey: "network-sites", sourceName: "Network", fileName: "payload.exe", mimeType: "application/octet-stream", base64: "dGVzdA==" })).rejects.toMatchObject({ code: "BAD_REQUEST" }); });
  it("parses CSV rows and returns row-level validation details", async () => { const caller = appRouter.createCaller(context("admin")); const csv = Buffer.from("site_code,status\nAMM-001,healthy\nAMM-002,warning\nBROKEN\n").toString("base64"); const result = await caller.data.manualImport({ datasetKey: "network-sites", sourceName: "Network", fileName: "network.csv", mimeType: "text/csv", base64: csv }); expect(result.rowCount).toBe(3); expect(result.validRows).toBe(2); expect(result.invalidRows).toBe(1); expect(result.schema).toEqual(["site_code", "status"]); expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining("row 4")])); });
  it("requires a server secret and validates SFTP/database references", async () => { process.env.TEST_SOURCE_DB = "mysql://internal/database"; process.env.TEST_SOURCE_SFTP = JSON.stringify({ username: "test", password: "test" }); const caller = appRouter.createCaller(context("admin")); await expect(caller.data.testConnection({ type: "sftp", connectionRef: "not-a-sftp-reference", secretEnv: "TEST_SOURCE_SFTP" })).rejects.toMatchObject({ code: "BAD_REQUEST" }); await expect(caller.data.testConnection({ type: "database", connectionRef: "mysql://internal/database", secretEnv: "TEST_SOURCE_DB" })).resolves.toMatchObject({ ok: false }); });
  it("keeps mapping changes behind administrator authorization", async () => { const caller = appRouter.createCaller(context("user")); await expect(caller.data.saveMapping({ importRunId: 1, mapping: { site_code: "siteCode" } })).rejects.toMatchObject({ code: "FORBIDDEN" }); });
  it("records source configuration and mapping actions server-side", async () => { const caller = appRouter.createCaller(context("admin")); await expect(caller.data.registerSource({ datasetKey: "network-kpis", name: "Network OSS", type: "sftp", connectionRef: "sftp://nms.internal/inbox" })).resolves.toEqual({ success: true }); await expect(caller.data.saveMapping({ importRunId: 1, mapping: { site_code: "siteCode" } })).resolves.toEqual({ success: true }); expect(dbSpy.created).toHaveLength(1); expect(dbSpy.mappings).toHaveLength(1); });
});
