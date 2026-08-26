export type BusinessRevenueInput = {
  id: string;
  region: string;
  period: string;
  revenueAtRisk: number;
  customersAtRisk: number;
  enterpriseImpact: number;
  salesPipeline: number;
  revenueOpportunity: number | null;
  investmentOpportunity: number | null;
  networkHealth: number | null;
  networkIssue: boolean | null;
  action: string;
  status: string;
};

export type BusinessRevenueArea = BusinessRevenueInput & { riskShare: number };
export type BusinessRevenueOperations = {
  source: "persisted" | "synthetic";
  updatedAt: string;
  summary: { revenueAtRisk: number; customersAtRisk: number; enterpriseImpact: number; salesPipeline: number; revenueOpportunity: number | null; investmentOpportunity: number | null; areasAtRisk: number };
  areas: BusinessRevenueArea[];
};

export function buildBusinessRevenueArea(input: BusinessRevenueInput, totalRisk = input.revenueAtRisk): BusinessRevenueArea {
  return { ...input, riskShare: totalRisk ? Number((input.revenueAtRisk / totalRisk * 100).toFixed(1)) : 0 };
}

export function assembleBusinessRevenueOperations(source: BusinessRevenueOperations["source"], inputs: BusinessRevenueInput[], updatedAt = new Date().toISOString()): BusinessRevenueOperations {
  const totalRisk = inputs.reduce((sum, item) => sum + item.revenueAtRisk, 0);
  const areas = inputs.map(item => buildBusinessRevenueArea(item, totalRisk)).sort((a, b) => b.revenueAtRisk - a.revenueAtRisk);
  const opportunityValues = inputs.flatMap(item => item.revenueOpportunity === null ? [] : [item.revenueOpportunity]);
  const investmentValues = inputs.flatMap(item => item.investmentOpportunity === null ? [] : [item.investmentOpportunity]);
  return { source, updatedAt, summary: { revenueAtRisk: totalRisk, customersAtRisk: inputs.reduce((sum, item) => sum + item.customersAtRisk, 0), enterpriseImpact: inputs.reduce((sum, item) => sum + item.enterpriseImpact, 0), salesPipeline: inputs.reduce((sum, item) => sum + item.salesPipeline, 0), revenueOpportunity: opportunityValues.length ? opportunityValues.reduce((sum, value) => sum + value, 0) : null, investmentOpportunity: investmentValues.length ? investmentValues.reduce((sum, value) => sum + value, 0) : null, areasAtRisk: inputs.filter(item => item.networkIssue === true).length }, areas };
}
