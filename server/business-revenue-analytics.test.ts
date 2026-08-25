import { describe, expect, it, vi } from "vitest";
import { assembleBusinessRevenueOperations, buildBusinessRevenueArea, type BusinessRevenueInput } from "./business-revenue-analytics";

const area = (overrides: Partial<BusinessRevenueInput> = {}): BusinessRevenueInput => ({ id: "REV-001", region: "Amman West", period: "2026-08", revenueAtRisk: 185000, customersAtRisk: 8420, enterpriseImpact: 34, salesPipeline: 252000, revenueOpportunity: 156000, investmentOpportunity: 111000, networkHealth: 6, networkIssue: true, action: "Fiber migration", status: "Urgent", ...overrides });

describe("business and revenue analytics", () => {
  it("calculates area risk share against total exposure", () => {
    expect(buildBusinessRevenueArea(area(), 370000).riskShare).toBe(50);
  });
  it("aggregates financial exposure and commercial upside", () => {
    const result = assembleBusinessRevenueOperations("persisted", [area(), area({ id: "REV-002", region: "Aqaba Coast", revenueAtRisk: 100000, customersAtRisk: 120, enterpriseImpact: 8, salesPipeline: 90000, revenueOpportunity: 70000, investmentOpportunity: 12000, networkHealth: 94, networkIssue: false, action: "Protect and grow", status: "Opportunity" })]);
    expect(result.summary).toMatchObject({ revenueAtRisk: 285000, customersAtRisk: 8540, enterpriseImpact: 42, salesPipeline: 342000, revenueOpportunity: 226000, investmentOpportunity: 123000, areasAtRisk: 1 });
    expect(result.areas[0]?.region).toBe("Amman West");
  });
});

const getPersistedBusinessRevenueOperations = vi.hoisted(() => vi.fn());
vi.mock("./db", () => ({ getPersistedBusinessRevenueOperations }));
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
function context(): TrpcContext { return { user: { id: 2, openId: "revenue-user", email: "user@smart.local", name: "Revenue User", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"] }; }
describe("businessRevenue.operations procedure", () => {
  it("returns persisted financial operations", async () => { getPersistedBusinessRevenueOperations.mockResolvedValueOnce(assembleBusinessRevenueOperations("persisted", [area()])); const result = await appRouter.createCaller(context()).businessRevenue.operations(); expect(result.source).toBe("persisted"); expect(result.summary.revenueAtRisk).toBe(185000); });
});
