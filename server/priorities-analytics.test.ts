import { describe, expect, it, vi } from "vitest";
import { assemblePrioritiesOperations, calculateImpactScore, rankPriorities, type PriorityInput } from "./priorities-analytics";

const priority = (overrides: Partial<PriorityInput> = {}): PriorityInput => ({ id: "p1", region: "Amman West", issue: "4G congestion", category: "network", score: 94, severity: "critical", affectedCustomers: 8420, revenueRisk: 185000, salesPipeline: 250000, complaintCount: 128, networkHealth: 6, action: "Capacity Upgrade", rationale: "Congestion is reducing headroom.", ...overrides });

describe("daily priorities analytics", () => {
  it("scores financial, customer, complaint and severity impact", () => { expect(calculateImpactScore(priority())).toBe(67); expect(calculateImpactScore(priority({ severity: "medium", revenueRisk: 0, affectedCustomers: 0, complaintCount: 0 }))).toBe(5); });
  it("ranks the highest-impact issues first and limits to five", () => { const ranked = rankPriorities([priority(), ...Array.from({ length: 6 }, (_, index) => priority({ id: `p${index + 2}`, region: `Area ${index}`, severity: "medium", revenueRisk: index * 1000, affectedCustomers: index * 10, complaintCount: index }))]); expect(ranked).toHaveLength(5); expect(ranked[0]?.region).toBe("Amman West"); expect(ranked[0]?.rank).toBe(1); });
  it("aggregates top five impact for the decision queue", () => { const result = assemblePrioritiesOperations("persisted", [priority(), priority({ id: "p2", region: "Irbid Central", issue: "Poor backhaul", severity: "high", revenueRisk: 119000, affectedCustomers: 2180, action: "Fiber Migration" })]); expect(result.summary).toMatchObject({ count: 2, critical: 1, affectedCustomers: 10600, revenueRisk: 304000 }); });
});

const getPersistedPrioritiesOperations = vi.hoisted(() => vi.fn());
vi.mock("./db", () => ({ getPersistedPrioritiesOperations }));
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
const context = (): TrpcContext => ({ user: { id: 2, openId: "priority-user", email: "priority@smart.local", name: "Priority User", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"] });
describe("priorities.operations procedure", () => { it("returns persisted ranking", async () => { getPersistedPrioritiesOperations.mockResolvedValueOnce(assemblePrioritiesOperations("persisted", [priority()])); const result = await appRouter.createCaller(context()).priorities.operations(); expect(result.source).toBe("persisted"); expect(result.priorities[0]?.action).toBe("Capacity Upgrade"); }); it("returns no ranking when persisted signals are unavailable", async () => { getPersistedPrioritiesOperations.mockResolvedValueOnce(null); const result = await appRouter.createCaller(context()).priorities.operations(); expect(result).toBeNull(); }); });
