import { describe, expect, it, vi } from "vitest";
import { assembleSalesOperations, buildSalesOpportunity, isFiberReady, isNetworkReady, type SalesOpportunityInput } from "./sales-analytics";

const opportunity = (overrides: Partial<SalesOpportunityInput> = {}): SalesOpportunityInput => ({ id: "OPP-001", accountName: "Jordan Enterprise", region: "Amman West", latitude: 31.9539, longitude: 35.9106, stage: "Proposal", value: 250000, probability: 72, enterprise: true, customerSegment: "enterprise", networkReadiness: 6, fiberReadiness: 92, siteName: "Amman West", ...overrides });

describe("sales intelligence analytics", () => {
  it("flags a high-value opportunity near a network issue", () => {
    expect(buildSalesOpportunity(opportunity())).toMatchObject({ weightedValue: 180000, networkIssue: true, alert: "Network issue may affect this opportunity." });
  });
  it("keeps readiness thresholds explicit", () => {
    expect(isNetworkReady(75)).toBe(true);
    expect(isNetworkReady(74.9)).toBe(false);
    expect(isFiberReady(85)).toBe(true);
  });
  it("aggregates pipeline, weighted value, enterprise count and stages", () => {
    const result = assembleSalesOperations("persisted", [opportunity(), opportunity({ id: "OPP-002", value: 100000, probability: 50, networkReadiness: 90, fiberReadiness: 80, enterprise: false, stage: "Qualified" })]);
    expect(result.summary).toMatchObject({ opportunities: 2, pipelineValue: 350000, weightedPipeline: 230000, enterpriseOpportunities: 1, networkAtRisk: 1, fiberReady: 1 });
    expect(result.stages[0]?.stage).toBe("Proposal");
  });
});

const getPersistedSalesOperations = vi.hoisted(() => vi.fn());
vi.mock("./db", () => ({ getPersistedSalesOperations }));
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
function context(): TrpcContext { return { user: { id: 2, openId: "sales-user", email: "user@smart.local", name: "Sales User", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"] }; }
describe("sales.operations procedure", () => {
  it("returns persisted sales operations", async () => { getPersistedSalesOperations.mockResolvedValueOnce(assembleSalesOperations("persisted", [opportunity()])); const result = await appRouter.createCaller(context()).sales.operations(); expect(result.source).toBe("persisted"); expect(result.summary.pipelineValue).toBe(250000); });
});
