export type PriorityInput = {
  id: string;
  region: string;
  issue: string;
  category: "network" | "fiber" | "customer" | "commercial";
  score: number;
  severity: "critical" | "high" | "medium";
  affectedCustomers: number;
  revenueRisk: number;
  salesPipeline: number;
  complaintCount: number;
  networkHealth: number;
  action: string;
  rationale: string;
};

export type PriorityItem = PriorityInput & { rank: number; impactScore: number };
export type PrioritiesOperations = { source: "persisted"; updatedAt: string; summary: { count: number; critical: number; affectedCustomers: number; revenueRisk: number; highestScore: number }; priorities: PriorityItem[] };

export function calculateImpactScore(input: PriorityInput) {
  const financial = Math.min(35, input.revenueRisk / 10000);
  const customer = Math.min(30, input.affectedCustomers / 400);
  const complaints = Math.min(20, input.complaintCount / 10);
  const severity = input.severity === "critical" ? 15 : input.severity === "high" ? 10 : 5;
  return Math.min(100, Math.round(financial + customer + complaints + severity));
}

export function rankPriorities(inputs: PriorityInput[], limit = 5): PriorityItem[] {
  return inputs.map(item => ({ ...item, impactScore: calculateImpactScore(item), rank: 0 })).sort((a, b) => b.impactScore - a.impactScore || b.revenueRisk - a.revenueRisk).slice(0, limit).map((item, index) => ({ ...item, rank: index + 1 }));
}

export function assemblePrioritiesOperations(source: PrioritiesOperations["source"], inputs: PriorityInput[], updatedAt = new Date().toISOString()): PrioritiesOperations {
  const priorities = rankPriorities(inputs, 5);
  return { source, updatedAt, summary: { count: priorities.length, critical: priorities.filter(item => item.severity === "critical").length, affectedCustomers: priorities.reduce((sum, item) => sum + item.affectedCustomers, 0), revenueRisk: priorities.reduce((sum, item) => sum + item.revenueRisk, 0), highestScore: priorities[0]?.impactScore ?? 0 }, priorities };
}

