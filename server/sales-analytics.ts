export type SalesOpportunityInput = {
  id: string;
  accountName: string;
  region: string;
  latitude: number;
  longitude: number;
  stage: string;
  value: number;
  probability: number;
  enterprise: boolean;
  customerSegment: "consumer" | "enterprise" | "high_value" | "unknown";
  networkReadiness: number;
  fiberReadiness: number;
  siteName: string;
};

export type SalesOpportunity = SalesOpportunityInput & {
  weightedValue: number;
  networkIssue: boolean;
  alert: string | null;
};

export type SalesOperations = {
  source: "persisted";
  updatedAt: string;
  summary: { opportunities: number; pipelineValue: number; weightedPipeline: number; enterpriseOpportunities: number; networkAtRisk: number; fiberReady: number };
  stages: Array<{ stage: string; count: number; value: number; share: number }>;
  opportunities: SalesOpportunity[];
};

const numberValue = (value: unknown, fallback = 0) => { const n = Number(value); return Number.isFinite(n) ? n : fallback; };

export function isNetworkReady(readiness: number) { return numberValue(readiness) >= 75; }
export function isFiberReady(readiness: number) { return numberValue(readiness) >= 85; }

export function buildSalesOpportunity(input: SalesOpportunityInput): SalesOpportunity {
  const networkIssue = !isNetworkReady(input.networkReadiness);
  const alert = networkIssue && input.value >= 200000 ? "Network issue may affect this opportunity." : networkIssue ? "Network readiness should be reviewed before commitment." : null;
  return { ...input, weightedValue: Math.round(input.value * Math.max(0, Math.min(100, input.probability)) / 100), networkIssue, alert };
}

export function assembleSalesOperations(source: SalesOperations["source"], inputs: SalesOpportunityInput[], updatedAt = new Date().toISOString()): SalesOperations {
  const opportunities = inputs.map(buildSalesOpportunity).sort((a, b) => b.value - a.value);
  const pipelineValue = opportunities.reduce((sum, item) => sum + item.value, 0);
  const stages = Array.from(new Set(opportunities.map(item => item.stage))).map(stage => { const items = opportunities.filter(item => item.stage === stage); return { stage, count: items.length, value: items.reduce((sum, item) => sum + item.value, 0), share: pipelineValue ? Number((items.reduce((sum, item) => sum + item.value, 0) / pipelineValue * 100).toFixed(1)) : 0 }; }).sort((a, b) => b.value - a.value);
  return { source, updatedAt, summary: { opportunities: opportunities.length, pipelineValue, weightedPipeline: opportunities.reduce((sum, item) => sum + item.weightedValue, 0), enterpriseOpportunities: opportunities.filter(item => item.enterprise).length, networkAtRisk: opportunities.filter(item => item.networkIssue).length, fiberReady: opportunities.filter(item => isFiberReady(item.fiberReadiness)).length }, stages, opportunities };
}

