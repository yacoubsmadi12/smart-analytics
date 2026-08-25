import { describe, expect, it } from "vitest";
import { assembleNetworkOperations, rankWorstCells, type NetworkCell } from "./network-analytics";

const cell = (overrides: Partial<NetworkCell> = {}): NetworkCell => ({
  cellCode: "AMW-042-4G-01",
  siteId: "AMW-042",
  siteName: "Amman West",
  technology: "4G",
  availability: 94,
  traffic: 1.2,
  congestion: 92,
  throughput: 22,
  coverage: 88,
  impactedCustomers: 1200,
  complaints: 24,
  fiber: 92,
  reason: "PRB congestion is above the operating threshold",
  status: "critical",
  ...overrides,
});

describe("network analytics", () => {

  it("ranks critical and congested cells before healthy cells", () => {
    const result = rankWorstCells([
      cell({ cellCode: "HEALTHY", status: "healthy", congestion: 20, availability: 99, throughput: 60 }),
      cell({ cellCode: "WARNING", status: "warning", congestion: 78, availability: 97, throughput: 35 }),
      cell({ cellCode: "CRITICAL", status: "critical", congestion: 91, availability: 93, throughput: 18 }),
    ]);
    expect(result.map(item => item.cellCode)).toEqual(["CRITICAL", "WARNING", "HEALTHY"]);
  });

  it("assembles customer, complaint and fiber impact into the network summary", () => {
    const result = assembleNetworkOperations("persisted", [
      cell({ cellCode: "A", impactedCustomers: 100, complaints: 8, fiber: 92 }),
      cell({ cellCode: "B", technology: "5G", impactedCustomers: 40, complaints: 2, fiber: 92 }),
    ], "2026-08-24T08:00:00.000Z");
    expect(result.updatedAt).toBe("2026-08-24T08:00:00.000Z");
    expect(result.summary).toMatchObject({ sites: 1, cells: 2, customersImpacted: 140, openComplaints: 10 });
    expect(result.sites[0]).toMatchObject({ id: "AMW-042", customers: 140, complaints: 10, fiber: 92 });
  });
});
