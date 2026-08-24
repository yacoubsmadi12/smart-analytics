import { describe, expect, it, vi } from "vitest";
import { assembleComplaintOperations, createPreviewComplaintOperations, isNetworkComplaint, type ComplaintRecord } from "./complaints-analytics";

const record = (overrides: Partial<ComplaintRecord> = {}): ComplaintRecord => ({ id: "C-001", category: "Internet Slow", severity: "high", status: "open", count: 100, region: "Amman West", siteId: "AMW-042", latitude: 31.9539, longitude: 35.9106, networkRelated: true, coveredWorstCellCount: 72, worstCellCodes: ["AMW-042-4G-01", "AMW-042-4G-02", "AMW-042-4G-03"], growthPct: 42, ...overrides });

describe("complaints intelligence analytics", () => {
  it("classifies network complaint categories", () => {
    expect(isNetworkComplaint("Internet Slow")).toBe(true);
    expect(isNetworkComplaint("Billing Inquiry")).toBe(false);
  });

  it("aggregates totals, network share, and worst-cell coverage", () => {
    const result = assembleComplaintOperations("persisted", [record(), record({ id: "C-002", category: "Billing Inquiry", networkRelated: false, count: 40, coveredWorstCellCount: 0, worstCellCodes: [], growthPct: 6 })]);
    expect(result.summary).toMatchObject({ totalComplaints: 140, networkRelated: 100, networkShare: 71.4, worstCellCoverageShare: 72, worstCellsInCoverage: 3 });
    expect(result.categories[0]).toMatchObject({ category: "Internet Slow", count: 100, growthPct: 42 });
  });

  it("creates a hotspot explanation with the linked worst cells", () => {
    const result = assembleComplaintOperations("persisted", [record()]);
    expect(result.hotspots[0]).toMatchObject({ region: "Amman West", coveredShare: 72, severity: "high", categories: ["Internet Slow"], worstCells: ["AMW-042-4G-01", "AMW-042-4G-02", "AMW-042-4G-03"] });
    expect(result.trends.at(-1)?.label).toBe("Today");
  });

  it("builds preview data with Internet Slow growth at 42 percent", () => {
    const result = createPreviewComplaintOperations([
      { id: "AMW-042", name: "Amman West", lat: 31.9539, lng: 35.9106, complaints: 128, congestion: 94, status: "critical" },
      { id: "IRC-118", name: "Irbid Central", lat: 32.5556, lng: 35.8497, complaints: 62, congestion: 74, status: "warning" },
    ]);
    expect(result.summary.totalComplaints).toBe(190);
    expect(result.summary.complaintGrowthPct).toBeGreaterThan(0);
    expect(result.categories.find(item => item.category === "Internet Slow")).toMatchObject({ growthPct: 42 });
    expect(result.summary.worstCellCoverageShare).toBeCloseTo(71.8, 1);
  });
});

const getPersistedComplaintOperations = vi.hoisted(() => vi.fn());
vi.mock("./db", () => ({ getPersistedComplaintOperations }));
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(): TrpcContext { return { user: { id: 2, openId: "complaints-user", email: "user@smart.local", name: "Complaints User", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"] }; }

describe("complaints.operations procedure", () => {
  it("returns persisted complaint intelligence through the protected contract", async () => {
    getPersistedComplaintOperations.mockResolvedValueOnce(assembleComplaintOperations("persisted", [record()]));
    const result = await appRouter.createCaller(context()).complaints.operations();
    expect(result.source).toBe("persisted");
    expect(result.summary).toHaveProperty("worstCellCoverageShare");
    expect(result.hotspots[0]?.worstCells).toHaveLength(3);
  });

  it("falls back to operational preview when no persisted complaints exist", async () => {
    getPersistedComplaintOperations.mockResolvedValueOnce(null);
    const result = await appRouter.createCaller(context()).complaints.operations();
    expect(result.source).toBe("operational-preview");
    expect(result.categories.length).toBeGreaterThan(0);
  });
});
