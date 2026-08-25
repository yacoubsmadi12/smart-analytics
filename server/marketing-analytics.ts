export type MarketingCampaignInput = {
  id: string;
  name: string;
  region: string;
  status: string;
  budget: number;
  conversionRate: number;
  targetArea: string;
  marketPotential: number | null;
  fiveGPotential: number | null;
  customerSegment: "consumer" | "enterprise" | "high_value" | "unknown";
  churnRisk: number | null;
  complaintRate: number | null;
  networkReadiness: number | null;
  fiberReadiness: number | null;
};

export type MarketingCampaign = MarketingCampaignInput & {
  customerExperienceRisk: boolean;
  riskReasons: string[];
  recommendation: string;
};

export type MarketingOperations = {
  source: "persisted";
  updatedAt: string;
  summary: { campaigns: number; totalBudget: number; averageConversion: number; fiveGPotential: number | null; riskCampaigns: number; targetAreas: number };
  campaigns: MarketingCampaign[];
  segments: Array<{ segment: string; campaigns: number; budget: number; averageConversion: number }>;
};

export function assessCustomerExperienceRisk(input: MarketingCampaignInput) {
  const reasons: string[] = [];
  if (input.churnRisk !== null && input.churnRisk >= 6) reasons.push("High churn");
  if (input.complaintRate !== null && input.complaintRate >= 4) reasons.push("High complaints");
  if (input.networkReadiness !== null && input.networkReadiness < 70) reasons.push("Poor network");
  const customerExperienceRisk = reasons.length >= 2 && input.churnRisk !== null && input.churnRisk >= 6 && input.networkReadiness !== null && input.networkReadiness < 70;
  const recommendation = input.networkReadiness === null ? "Network readiness is not mapped in the connected sources." : customerExperienceRisk ? "Resolve customer experience signals before scaling the campaign." : input.networkReadiness < 70 ? "Coordinate network readiness before launch." : "Proceed with monitored rollout.";
  return { customerExperienceRisk, riskReasons: reasons, recommendation };
}

export function buildMarketingCampaign(input: MarketingCampaignInput): MarketingCampaign { return { ...input, ...assessCustomerExperienceRisk(input) }; }

export function assembleMarketingOperations(source: MarketingOperations["source"], inputs: MarketingCampaignInput[], updatedAt = new Date().toISOString()): MarketingOperations {
  const campaigns = inputs.map(buildMarketingCampaign).sort((a, b) => b.budget - a.budget);
  const totalBudget = campaigns.reduce((sum, item) => sum + item.budget, 0);
  const fiveGValues = campaigns.flatMap(item => item.fiveGPotential === null ? [] : [item.fiveGPotential]);
  const segments = Array.from(new Set(campaigns.map(item => item.customerSegment))).map(segment => { const items = campaigns.filter(item => item.customerSegment === segment); return { segment, campaigns: items.length, budget: items.reduce((sum, item) => sum + item.budget, 0), averageConversion: items.length ? Number((items.reduce((sum, item) => sum + item.conversionRate, 0) / items.length).toFixed(1)) : 0 }; });
  return { source, updatedAt, summary: { campaigns: campaigns.length, totalBudget, averageConversion: campaigns.length ? Number((campaigns.reduce((sum, item) => sum + item.conversionRate, 0) / campaigns.length).toFixed(1)) : 0, fiveGPotential: fiveGValues.length ? Math.round(fiveGValues.reduce((sum, value) => sum + value, 0) / fiveGValues.length) : null, riskCampaigns: campaigns.filter(item => item.customerExperienceRisk).length, targetAreas: new Set(campaigns.map(item => item.targetArea)).size }, campaigns, segments };
}
