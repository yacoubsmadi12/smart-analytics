import { describe, expect, it, vi } from "vitest";
import { assessCustomerExperienceRisk, assembleMarketingOperations, buildMarketingCampaign, type MarketingCampaignInput } from "./marketing-analytics";

const campaign = (overrides: Partial<MarketingCampaignInput> = {}): MarketingCampaignInput => ({ id: "CMP-001", name: "5G Experience Launch", region: "Amman West", status: "Live", budget: 120000, conversionRate: 7.8, targetArea: "Amman West", marketPotential: 84, fiveGPotential: 86, customerSegment: "high_value", churnRisk: 8.2, complaintRate: 9.4, networkReadiness: 42, fiberReadiness: 92, ...overrides });

describe("marketing intelligence analytics", () => {
  it("flags a campaign where churn, complaints, and network signals are all poor", () => {
    expect(assessCustomerExperienceRisk(campaign())).toMatchObject({ customerExperienceRisk: true, riskReasons: ["High churn", "High complaints", "Poor network"] });
    expect(buildMarketingCampaign(campaign()).recommendation).toContain("before scaling");
  });
  it("allows a healthy area to proceed with monitored rollout", () => {
    expect(assessCustomerExperienceRisk(campaign({ churnRisk: 2, complaintRate: 1.2, networkReadiness: 94 })).customerExperienceRisk).toBe(false);
  });
  it("aggregates campaign budget, conversion, 5G potential and segments", () => {
    const result = assembleMarketingOperations("persisted", [campaign(), campaign({ id: "CMP-002", customerSegment: "enterprise", budget: 80000, conversionRate: 11, networkReadiness: 88 })]);
    expect(result.summary).toMatchObject({ campaigns: 2, totalBudget: 200000, averageConversion: 9.4, fiveGPotential: 86, riskCampaigns: 1, targetAreas: 1 });
    expect(result.segments).toHaveLength(2);
  });
});

const getPersistedMarketingOperations = vi.hoisted(() => vi.fn());
vi.mock("./db", () => ({ getPersistedMarketingOperations }));
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
function context(): TrpcContext { return { user: { id: 2, openId: "marketing-user", email: "user@smart.local", name: "Marketing User", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"] }; }
describe("marketing.operations procedure", () => {
  it("returns persisted campaign operations", async () => { getPersistedMarketingOperations.mockResolvedValueOnce(assembleMarketingOperations("persisted", [campaign()])); const result = await appRouter.createCaller(context()).marketing.operations(); expect(result.source).toBe("persisted"); expect(result.summary.totalBudget).toBe(120000); });
});
