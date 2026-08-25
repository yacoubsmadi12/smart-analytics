import { describe, expect, it, vi } from "vitest";
import { assembleInfrastructureOperations, buildFiberOpportunity, scoreFiberOpportunity, type InfrastructureRecord } from "./infrastructure-analytics";

const record = (overrides: Partial<InfrastructureRecord> = {}): InfrastructureRecord => ({ id: "INF-001", nodeCode: "FN-118", region: "Amman West", latitude: 31.9539, longitude: 35.9106, fiberAvailability: 92, congestion: 94, status: "critical", backhaul: "mixed", plannedUpgrade: true, linkCount: 3, ...overrides });

describe("infrastructure intelligence analytics", () => {
  it("scores congested fiber-ready nodes as high opportunity", () => {
    expect(scoreFiberOpportunity(record())).toBeGreaterThan(70);
    expect(buildFiberOpportunity(record())).toMatchObject({ recommendedAction: "Fiber Migration", priority: "critical" });
  });
  it("recommends fiber build when congestion has no fiber availability", () => {
    expect(buildFiberOpportunity(record({ fiberAvailability: 42, backhaul: "microwave" }))).toMatchObject({ recommendedAction: "Fiber Build" });
  });
  it("aggregates nodes, links, risk backhaul, and regional opportunities", () => {
    const result = assembleInfrastructureOperations("persisted", [record(), record({ id: "INF-002", nodeCode: "FN-204", region: "Irbid Central", congestion: 35, fiberAvailability: 99, backhaul: "fiber", plannedUpgrade: false, linkCount: 2 })]);
    expect(result.summary).toMatchObject({ fiberNodes: 2, fiberLinks: 5, fiberAvailability: 95.5, migrationOpportunities: 1 });
    expect(result.regions[0]).toMatchObject({ region: "Amman West", opportunities: 1 });
  });
});

const getPersistedInfrastructureOperations = vi.hoisted(() => vi.fn());
vi.mock("./db", () => ({ getPersistedInfrastructureOperations }));
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(): TrpcContext { return { user: { id: 2, openId: "infra-user", email: "user@smart.local", name: "Infrastructure User", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"] }; }

describe("infrastructure.operations procedure", () => {
  it("returns persisted infrastructure intelligence", async () => {
    getPersistedInfrastructureOperations.mockResolvedValueOnce(assembleInfrastructureOperations("persisted", [record()]));
    const result = await appRouter.createCaller(context()).infrastructure.operations();
    expect(result.source).toBe("persisted");
    expect(result.opportunities[0]?.recommendedAction).toBe("Fiber Migration");
  });
});
