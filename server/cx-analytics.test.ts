import { describe, expect, it, vi } from "vitest";
import { assembleCustomerExperience, buildCustomerExperienceArea, calculateCxRisk, rankCxAreas, type CustomerExperienceAreaInput } from "./cx-analytics";

const area = (overrides: Partial<CustomerExperienceAreaInput> = {}): CustomerExperienceAreaInput => ({ id: "AMW-042", name: "Amman West", region: "Amman West", customers: 8420, complaints: 128, churnRisk: 3.8, availability: 98.6, congestion: 94, throughput: 42.8, fiber: 92, ...overrides });

describe("customer experience analytics", () => {
  it("calculates a higher CX risk when congestion, complaint density and churn rise", () => {
    const healthy = calculateCxRisk(area({ complaints: 12, churnRisk: 1.2, congestion: 35, availability: 99.4 }));
    const stressed = calculateCxRisk(area({ complaints: 220, churnRisk: 9.2, congestion: 94, availability: 91 }));
    expect(stressed).toBeGreaterThan(healthy);
    expect(buildCustomerExperienceArea(area({ complaints: 220, churnRisk: 9.2, congestion: 94, availability: 91 })).factors.length).toBe(3);
  });

  it("ranks areas by risk and exposes explainable customer impact", () => {
    const result = rankCxAreas([buildCustomerExperienceArea(area({ id: "LOW", name: "Low", congestion: 30, complaints: 10, churnRisk: 1 })), buildCustomerExperienceArea(area({ id: "HIGH", name: "High", congestion: 95, complaints: 180, churnRisk: 8 }))]);
    expect(result[0]?.id).toBe("HIGH");
    expect(result[0]?.impactedCustomers).toBeGreaterThan(0);
    expect(result[0]?.factors.some(factor => factor.label.toLowerCase().includes("congestion"))).toBe(true);
  });

  it("assembles weighted summary and complaint correlation", () => {
    const result = assembleCustomerExperience("persisted", [area({ id: "A", name: "A", customers: 1000, complaints: 30 }), area({ id: "B", name: "B", customers: 3000, complaints: 60, congestion: 80 })], "2026-08-24T08:00:00.000Z");
    expect(result.updatedAt).toBe("2026-08-24T08:00:00.000Z");
    expect(result.summary).toMatchObject({ customers: 4000, complaints: 90 });
    expect(result.summary.correlatedComplaints).toBeGreaterThan(0);
    expect(result.correlation).toHaveLength(2);
  });

});

const getPersistedCustomerExperience = vi.hoisted(() => vi.fn());
vi.mock("./db", () => ({ getPersistedCustomerExperience }));
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(): TrpcContext { return { user: { id: 2, openId: "cx-user", email: "user@smart.local", name: "CX User", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"] }; }

describe("customerExperience.operations procedure", () => {
  it("returns persisted CX fields through the protected router contract", async () => {
    const persisted = assembleCustomerExperience("persisted", [area({ id: "AMW-042", name: "Amman West" })]);
    getPersistedCustomerExperience.mockResolvedValueOnce(persisted);
    const result = await appRouter.createCaller(context()).customerExperience.operations();
    expect(result.source).toBe("persisted");
    expect(result.summary).toHaveProperty("cxRisk");
    expect(result.areas[0]).toHaveProperty("factors");
  });

});
