import { describe, expect, it, vi } from "vitest";
import { assembleCustomerOperations, buildCustomerArea, filterCustomerAreas, type CustomerAreaInput } from "./customers-analytics";

const input = (overrides: Partial<CustomerAreaInput> = {}): CustomerAreaInput => ({ id: "AMW-042", name: "Amman West", region: "Amman West", customers: 8420, enterpriseCustomers: 650, highValueCustomers: 1010, highChurnCustomers: 320, churnRisk: 3.8, density: 980, latitude: 31.9539, longitude: 35.9106, congestedCells: 3, nearestCongestedCellKm: 0.6, complaints: 128, ...overrides });

describe("customer intelligence analytics", () => {
  it("derives customer segments and proximity status without exceeding the base", () => {
    const area = buildCustomerArea(input());
    expect(area.consumerCustomers).toBe(7770);
    expect(area.smeCustomers).toBeNull();
    expect(area.nearCongestedCell).toBe(true);
    expect(area.customerImpact).toBeGreaterThan(0);
    expect(area.enterpriseCustomers).toBeLessThanOrEqual(area.customers);
    expect(area.customerClusters).toEqual([]);
  });

  it("filters high-value customers within one kilometer of congested cells", () => {
    const areas = [buildCustomerArea(input()), buildCustomerArea(input({ id: "AQ-019", name: "Aqaba Coast", region: "Aqaba", congestedCells: 0, nearestCongestedCellKm: null, highValueCustomers: 420 }))];
    const result = filterCustomerAreas(areas, { segment: "high_value", region: "all", highValueNearCongested: true, highChurnOnly: false });
    expect(result.map(area => area.name)).toEqual(["Amman West"]);
  });

  it("aggregates portfolio totals and preserves map coordinates", () => {
    const result = assembleCustomerOperations("persisted", [input(), input({ id: "IRC-118", name: "Irbid Central", region: "Irbid", customers: 6310, latitude: 32.5556, longitude: 35.8497, congestedCells: 2, nearestCongestedCellKm: 0.8 })], "2026-08-24T08:00:00.000Z");
    expect(result.summary).toMatchObject({ totalCustomers: 14730, areas: 2 });
    expect(result.summary.nearCongestedHighValue).toBeGreaterThan(0);
    expect(result.areas.find(area => area.name === "Irbid Central")).toMatchObject({ latitude: 32.5556, longitude: 35.8497 });
  });

});

const getPersistedCustomerOperations = vi.hoisted(() => vi.fn());
vi.mock("./db", () => ({ getPersistedCustomerOperations }));
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(): TrpcContext { return { user: { id: 2, openId: "customers-user", email: "user@smart.local", name: "Customers User", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"] }; }

describe("customers.operations procedure", () => {
  it("returns persisted customer intelligence through the protected contract", async () => {
    getPersistedCustomerOperations.mockResolvedValueOnce(assembleCustomerOperations("persisted", [input()]));
    const result = await appRouter.createCaller(context()).customers.operations();
    expect(result.source).toBe("persisted");
    expect(result.summary).toHaveProperty("highValueCustomers");
    expect(result.areas[0]).toHaveProperty("latitude");
  });

});
