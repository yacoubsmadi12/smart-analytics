export type MarketingCampaignInput = {
  id: string;
  name: string;
  region: string;
  status: string;
  budget: number;
  conversionRate: number;
  targetArea: string;
  marketPotential: number;
  fiveGPotential: number;
  customerSegment: "consumer" | "enterprise" | "high_value";
  churnRisk: number;
  complaintRate: number;
  networkReadiness: number;
  fiberReadiness: number;
};

export type MarketingCampaign = MarketingCampaignInput & {
  customerExperienceRisk: boolean;
  riskReasons: string[];
  recommendation: string;
};

export type MarketingOperations = {
  source: "persisted" | "operational-preview";
  updatedAt: string;
  summary: { campaigns: number; totalBudget: number; averageConversion: number; fiveGPotential: number; riskCampaigns: number; targetAreas: number };
  campaigns: MarketingCampaign[];
  segments: Array<{ segment: string; campaigns: number; budget: number; averageConversion: number }>;
};

const numeric = (value: unknown, fallback = 0) => { const n = Number(value); return Number.isFinite(n) ? n : fallback; };

export function assessCustomerExperienceRisk(input: MarketingCampaignInput) {
  const reasons: string[] = [];
  if (input.churnRisk >= 6) reasons.push("High churn");
  if (input.complaintRate >= 4) reasons.push("High complaints");
  if (input.networkReadiness < 70) reasons.push("Poor network");
  const customerExperienceRisk = reasons.length >= 2 && input.churnRisk >= 6 && input.networkReadiness < 70;
  return { customerExperienceRisk, riskReasons: reasons, recommendation: customerExperienceRisk ? "Resolve customer experience signals before scaling the campaign." : input.networkReadiness < 70 ? "Coordinate network readiness before launch." : "Proceed with monitored rollout." };
}

export function buildMarketingCampaign(input: MarketingCampaignInput): MarketingCampaign { return { ...input, ...assessCustomerExperienceRisk(input) }; }

export function assembleMarketingOperations(source: MarketingOperations["source"], inputs: MarketingCampaignInput[], updatedAt = new Date().toISOString()): MarketingOperations {
  const campaigns = inputs.map(buildMarketingCampaign).sort((a, b) => b.budget - a.budget);
  const totalBudget = campaigns.reduce((sum, item) => sum + item.budget, 0);
  const segments = Array.from(new Set(campaigns.map(item => item.customerSegment))).map(segment => { const items = campaigns.filter(item => item.customerSegment === segment); return { segment, campaigns: items.length, budget: items.reduce((sum, item) => sum + item.budget, 0), averageConversion: items.length ? Number((items.reduce((sum, item) => sum + item.conversionRate, 0) / items.length).toFixed(1)) : 0 }; });
  return { source, updatedAt, summary: { campaigns: campaigns.length, totalBudget, averageConversion: campaigns.length ? Number((campaigns.reduce((sum, item) => sum + item.conversionRate, 0) / campaigns.length).toFixed(1)) : 0, fiveGPotential: campaigns.length ? Math.round(campaigns.reduce((sum, item) => sum + item.fiveGPotential, 0) / campaigns.length) : 0, riskCampaigns: campaigns.filter(item => item.customerExperienceRisk).length, targetAreas: new Set(campaigns.map(item => item.targetArea)).size }, campaigns, segments };
}

export function createPreviewMarketingOperations(sites: Array<{ id: string; name: string; lat: number; lng: number; congestion: number; fiber: number; churn: number; complaints: number; customers: number; cells5g: number }>): MarketingOperations {
  const names = ["5G Experience Launch", "Retention Wave", "Enterprise 5G", "Fiber Upgrade Q3"];
  const segments: MarketingCampaignInput["customerSegment"][] = ["high_value", "consumer", "enterprise", "enterprise"];
  const inputs = sites.map((site, index) => ({ id: `CMP-${String(index + 1).padStart(3, "0")}`, name: names[index % names.length], region: site.name, status: index === 1 ? "Optimizing" : "Live", budget: [120000, 42000, 120000, 84000][index % 4], conversionRate: [7.8, 9.4, 7.8, 11.2][index % 4], targetArea: site.name, marketPotential: Math.min(99, Math.round(45 + site.customers / 180)), fiveGPotential: Math.min(100, Math.round(35 + site.cells5g * 7)), customerSegment: segments[index % segments.length], churnRisk: site.churn, complaintRate: site.customers ? Number((site.complaints / site.customers * 1000).toFixed(1)) : 0, networkReadiness: Math.max(0, 100 - site.congestion), fiberReadiness: site.fiber }));
  return assembleMarketingOperations("operational-preview", inputs);
}
