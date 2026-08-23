import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ inserts: [] as unknown[], updates: [] as unknown[] }));
const dbMock = vi.hoisted(() => ({
  insert: vi.fn(() => ({
    values: vi.fn(async (payload: unknown) => { state.inserts.push(payload); return {}; }),
  })),
  update: vi.fn(() => ({ set: vi.fn((payload: unknown) => ({ where: vi.fn(async () => { state.updates.push(payload); return {}; }) })) })),
}));

vi.mock("drizzle-orm/mysql2", () => ({ drizzle: vi.fn(() => dbMock) }));

describe("data ingestion audit persistence", () => {
  it("writes auditable source and mapping payloads", async () => {
    process.env.DATABASE_URL = "mysql://test";
    const { createDataSource, saveImportMapping } = await import("./db");
    await createDataSource({ name: "OSS", type: "sftp", connectionRef: "sftp://internal/inbox", userId: 7 });
    await saveImportMapping({ importRunId: 44, userId: 7, mappingJson: JSON.stringify({ site_code: "siteCode" }) });
    const auditEntries = state.inserts.slice(1).filter((entry): entry is { action: string; userId: number; resource: string; metadata: string } => typeof entry === "object" && entry !== null && "action" in entry);
    expect(auditEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({ userId: 7, action: "data_source.created", resource: "OSS", metadata: JSON.stringify({ type: "sftp", connectionRef: "sftp://internal/inbox" }) }),
      expect.objectContaining({ userId: 7, action: "data_import.mapping_saved", resource: "44", metadata: JSON.stringify({ site_code: "siteCode" }) }),
    ]));
  });
  it("persists latency and only advances the successful-check timestamp on healthy checks", async () => {
    const { updateDataSourceSync } = await import("./db");
    await updateDataSourceSync(12, "healthy", 184);
    await updateDataSourceSync(12, "warning", 642);
    const syncUpdates = state.updates.filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null && "status" in entry);
    expect(syncUpdates[0]).toEqual(expect.objectContaining({ status: "healthy", latencyMs: 184, lastSuccessfulCheckAt: expect.any(Date), lastSyncAt: expect.any(Date) }));
    expect(syncUpdates[1]).toEqual(expect.objectContaining({ status: "warning", latencyMs: 642, lastSyncAt: expect.any(Date) }));
    expect(syncUpdates[1]).not.toHaveProperty("lastSuccessfulCheckAt");
  });
});
