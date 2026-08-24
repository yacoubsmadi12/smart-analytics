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
export type PrioritiesOperations = { source: "persisted" | "operational-preview"; updatedAt: string; summary: { count: number; critical: number; affectedCustomers: number; revenueRisk: number; highestScore: number }; priorities: PriorityItem[] };

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

export function createPreviewPrioritiesOperations(sites: Array<{ id: string; name: string; congestion: number; customers: number; complaints: number; revenueRisk: number; fiber: number; salesOpportunities: number; throughput: number }>): PrioritiesOperations {
  const inputs = sites.flatMap(site => {
    const items: PriorityInput[] = [];
    if (site.congestion >= 70) items.push({ id: `${site.id}-congestion`, region: site.name, issue: `${site.congestion >= 85 ? "4G congestion" : "Radio capacity pressure"}`, category: "network", score: Math.min(100, Math.round(site.congestion)), severity: site.congestion >= 85 ? "critical" : "high", affectedCustomers: Math.round(site.customers * 0.42), revenueRisk: site.revenueRisk, salesPipeline: site.salesOpportunities * 18000, complaintCount: site.complaints, networkHealth: Math.max(0, 100 - site.congestion), action: "Capacity Upgrade", rationale: `${site.congestion}% congestion is reducing headroom across the customer base.` });
    if (site.fiber < 80) items.push({ id: `${site.id}-fiber`, region: site.name, issue: "Poor backhaul readiness", category: "fiber", score: Math.round(100 - site.fiber), severity: site.fiber < 70 ? "high" : "medium", affectedCustomers: Math.round(site.customers * 0.2), revenueRisk: Math.round(site.revenueRisk * 0.55), salesPipeline: site.salesOpportunities * 12000, complaintCount: Math.round(site.complaints * 0.5), networkHealth: Math.max(0, 100 - site.congestion), action: "Fiber Migration", rationale: `${site.fiber}% fiber readiness limits resilience and commercial headroom.` });
    if (site.complaints >= 100) items.push({ id: `${site.id}-complaints`, region: site.name, issue: "High complaints", category: "customer", score: Math.round(site.complaints / 2), severity: site.complaints >= 150 ? "high" : "medium", affectedCustomers: Math.round(site.customers * 0.28), revenueRisk: Math.round(site.revenueRisk * 0.42), salesPipeline: site.salesOpportunities * 9000, complaintCount: site.complaints, networkHealth: Math.max(0, 100 - site.congestion), action: "Network Investigation", rationale: `${site.complaints} complaints indicate concentrated customer experience pressure.` });
    return items;
  });
  return assemblePrioritiesOperations("operational-preview", inputs);
}
