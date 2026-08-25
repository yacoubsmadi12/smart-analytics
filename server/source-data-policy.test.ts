import { describe, expect, it } from "vitest";
import { assembleComplaintOperations, type ComplaintRecord } from "./complaints-analytics";
import { buildCustomerArea, type CustomerAreaInput } from "./customers-analytics";
import { buildFiberOpportunity, type InfrastructureRecord } from "./infrastructure-analytics";
import { assembleMarketingOperations, type MarketingCampaignInput } from "./marketing-analytics";
import { assembleBusinessRevenueOperations, type BusinessRevenueInput } from "./business-revenue-analytics";

describe("source-backed data policy", () => {
  it("does not synthesize complaint history", () => {
    const record: ComplaintRecord = { id: "source-1", category: "Network", severity: "high", status: "open", count: 1, region: "Source region", siteId: null, latitude: null, longitude: null, networkRelated: true, coveredWorstCellCount: 0, worstCellCodes: [] };
    expect(assembleComplaintOperations("persisted", [record]).trends).toEqual([]);
  });

  it("does not fabricate customer SME counts or spatial clusters", () => {
    const input: CustomerAreaInput = { id: "source-area", name: "Source area", region: "Source region", customers: 10, enterpriseCustomers: 2, highValueCustomers: 1, highChurnCustomers: 1, churnRisk: 3, density: null, latitude: 1, longitude: 1, congestedCells: 1, nearestCongestedCellKm: null };
    const area = buildCustomerArea(input);
    expect(area.smeCustomers).toBeNull();
    expect(area.customerClusters).toEqual([]);
  });

  it("keeps unmapped infrastructure metadata explicit", () => {
    const record: InfrastructureRecord = { id: "source-node", nodeCode: "NODE-1", region: "Source region", latitude: 1, longitude: 1, fiberAvailability: 50, congestion: 80, status: "Unknown", backhaul: "unknown", plannedUpgrade: null, linkCount: null };
    const opportunity = buildFiberOpportunity(record);
    expect(opportunity.backhaul).toBe("unknown");
    expect(opportunity.plannedUpgrade).toBeNull();
    expect(opportunity.linkCount).toBeNull();
  });

  it("does not create marketing potential or revenue opportunity values without source fields", () => {
    const campaign: MarketingCampaignInput = { id: "source-campaign", name: "Source campaign", region: "Source region", status: "Unmapped", budget: 1, conversionRate: 1, targetArea: "Source region", marketPotential: null, fiveGPotential: null, customerSegment: "unknown", churnRisk: null, complaintRate: null, networkReadiness: null, fiberReadiness: null };
    expect(assembleMarketingOperations("persisted", [campaign]).summary.fiveGPotential).toBeNull();
    const revenue: BusinessRevenueInput = { id: "source-revenue", region: "Source region", period: "source", revenueAtRisk: 1, customersAtRisk: 0, enterpriseImpact: 0, salesPipeline: 0, revenueOpportunity: null, investmentOpportunity: null, networkHealth: null, networkIssue: null, action: "Network linkage unavailable", status: "Unmapped" };
    expect(assembleBusinessRevenueOperations("persisted", [revenue]).summary.revenueOpportunity).toBeNull();
    expect(assembleBusinessRevenueOperations("persisted", [revenue]).summary.investmentOpportunity).toBeNull();
  });
});
