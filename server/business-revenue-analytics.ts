export type BusinessRevenueInput = {
  id: string;
  region: string;
  period: string;
  revenueAtRisk: number;
  customersAtRisk: number;
  enterpriseImpact: number;
  salesPipeline: number;
  revenueOpportunity: number;
  investmentOpportunity: number;
  networkHealth: number;
  networkIssue: boolean;
  action: string;
  status: string;
};

export type BusinessRevenueArea = BusinessRevenueInput & { riskShare: number };
export type BusinessRevenueOperations = {
  source: "persisted" | "operational-preview";
  updatedAt: string;
  summary: { revenueAtRisk: number; customersAtRisk: number; enterpriseImpact: number; salesPipeline: number; revenueOpportunity: number; investmentOpportunity: number; areasAtRisk: number };
  areas: BusinessRevenueArea[];
};

export function buildBusinessRevenueArea(input: BusinessRevenueInput, totalRisk = input.revenueAtRisk): BusinessRevenueArea {
  return { ...input, riskShare: totalRisk ? Number((input.revenueAtRisk / totalRisk * 100).toFixed(1)) : 0 };
}

export function assembleBusinessRevenueOperations(source: BusinessRevenueOperations["source"], inputs: BusinessRevenueInput[], updatedAt = new Date().toISOString()): BusinessRevenueOperations {
  const totalRisk = inputs.reduce((sum, item) => sum + item.revenueAtRisk, 0);
  const areas = inputs.map(item => buildBusinessRevenueArea(item, totalRisk)).sort((a, b) => b.revenueAtRisk - a.revenueAtRisk);
  return { source, updatedAt, summary: { revenueAtRisk: totalRisk, customersAtRisk: inputs.reduce((sum, item) => sum + item.customersAtRisk, 0), enterpriseImpact: inputs.reduce((sum, item) => sum + item.enterpriseImpact, 0), salesPipeline: inputs.reduce((sum, item) => sum + item.salesPipeline, 0), revenueOpportunity: inputs.reduce((sum, item) => sum + item.revenueOpportunity, 0), investmentOpportunity: inputs.reduce((sum, item) => sum + item.investmentOpportunity, 0), areasAtRisk: inputs.filter(item => item.networkIssue).length }, areas };
}

export function createPreviewBusinessRevenueOperations(sites: Array<{ name: string; congestion: number; customers: number; complaints: number; churn: number; revenueRisk: number; salesOpportunities: number; fiber: number }>): BusinessRevenueOperations {
  const inputs = sites.map((site, index) => { const networkIssue = site.congestion >= 70; const revenueAtRisk = [185000, 119000, 84000, 192000][index % 4] ?? Math.round(site.revenueRisk * 0.8); const salesPipeline = site.salesOpportunities * [18000, 21000, 16000, 28000][index % 4]; return { id: `REV-${String(index + 1).padStart(3, "0")}`, region: site.name, period: "2026-08", revenueAtRisk, customersAtRisk: Math.round(site.customers * Math.min(0.4, site.churn / 100 + (networkIssue ? 0.08 : 0))), enterpriseImpact: index % 2 === 0 ? Math.max(12, Math.round(site.customers * 0.012)) : Math.max(6, Math.round(site.customers * 0.006)), salesPipeline, revenueOpportunity: Math.round(salesPipeline * (site.fiber >= 80 ? 0.62 : 0.38)), investmentOpportunity: networkIssue ? Math.round(revenueAtRisk * (site.fiber >= 80 ? 0.42 : 0.68)) : Math.round(revenueAtRisk * 0.12), networkHealth: Math.max(0, 100 - site.congestion), networkIssue, action: networkIssue && site.fiber >= 80 ? "Fiber migration" : networkIssue ? "Capacity upgrade" : "Protect and grow", status: networkIssue ? "Urgent" : "Opportunity" }; });
  return assembleBusinessRevenueOperations("operational-preview", inputs);
}
