import { describe, expect, it, vi } from "vitest";

const getPersistedNetworkOperations = vi.hoisted(() => vi.fn());
vi.mock("./db", () => ({ getPersistedNetworkOperations }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type NetworkOperationsResult = Awaited<ReturnType<typeof appRouter.createCaller>> extends never ? never : {
  source: "persisted" | "operational-preview";
  summary: { sites: number; cells: number; customersImpacted: number; openComplaints: number };
  cells: Array<{ cellCode: string; impactedCustomers: number; complaints: number; fiber: number | null }>;
};

function context(role: "admin" | "user"): TrpcContext {
  return {
    user: { id: role === "admin" ? 1 : 2, openId: `network-${role}`, email: `${role}@smart.local`, name: role, loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("network.operations procedure", () => {
  it("returns persisted network operations with customer-impact fields", async () => {
    const persisted: NetworkOperationsResult = {
      source: "persisted",
      summary: { sites: 2, cells: 3, customersImpacted: 4200, openComplaints: 31 },
      cells: [{ cellCode: "CELL-001", impactedCustomers: 1800, complaints: 14, fiber: 96 }],
    };
    getPersistedNetworkOperations.mockResolvedValueOnce(persisted);

    const result = await appRouter.createCaller(context("user")).network.operations();

    expect(getPersistedNetworkOperations).toHaveBeenCalledOnce();
    expect(result.source).toBe("persisted");
    expect(result.summary.customersImpacted).toBe(4200);
    expect(result.cells[0]).toMatchObject({ cellCode: "CELL-001", impactedCustomers: 1800, complaints: 14, fiber: 96 });
  });

  it("returns no operational dataset when persisted records are unavailable", async () => {
    getPersistedNetworkOperations.mockResolvedValueOnce(null);

    const result = await appRouter.createCaller(context("admin")).network.operations();

    expect(result).toBeNull();
  });
});
