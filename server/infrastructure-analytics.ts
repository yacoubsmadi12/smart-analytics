export type InfrastructureRecord = {
  id: string;
  nodeCode: string;
  region: string;
  latitude: number;
  longitude: number;
  fiberAvailability: number;
  congestion: number;
  status: string;
  backhaul: "fiber" | "microwave" | "mixed";
  plannedUpgrade: boolean;
  linkCount: number;
};

export type FiberOpportunity = InfrastructureRecord & {
  opportunityScore: number;
  priority: "critical" | "high" | "watch" | "healthy";
  recommendedAction: "Fiber Migration" | "Fiber Build" | "Microwave Expansion" | "Monitor";
  rationale: string;
};

export type InfrastructureOperations = {
  source: "persisted" | "operational-preview";
  updatedAt: string;
  summary: {
    fiberNodes: number;
    fiberLinks: number;
    fiberAvailability: number;
    backhaulAtRisk: number;
    microwaveSites: number;
    plannedUpgrades: number;
    migrationOpportunities: number;
  };
  opportunities: FiberOpportunity[];
  regions: Array<{ region: string; nodes: number; availability: number; congestion: number; opportunities: number }>;
};

function clamp(value: number, min = 0, max = 100) { return Math.min(max, Math.max(min, value)); }
function numberValue(value: unknown, fallback = 0) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }

export function scoreFiberOpportunity(record: Pick<InfrastructureRecord, "fiberAvailability" | "congestion" | "backhaul" | "plannedUpgrade">) {
  const availabilityGap = Math.max(0, 100 - numberValue(record.fiberAvailability));
  const backhaulPressure = record.backhaul === "microwave" ? 12 : record.backhaul === "mixed" ? 6 : 0;
  const upgradeSignal = record.plannedUpgrade ? 6 : 0;
  return Math.round(clamp(numberValue(record.congestion) * 0.72 + availabilityGap * 0.2 + backhaulPressure + upgradeSignal));
}

export function buildFiberOpportunity(record: InfrastructureRecord): FiberOpportunity {
  const opportunityScore = scoreFiberOpportunity(record);
  const fiberAvailable = record.fiberAvailability >= 85;
  const priority = opportunityScore >= 75 ? "critical" : opportunityScore >= 55 ? "high" : opportunityScore >= 30 ? "watch" : "healthy";
  const recommendedAction = record.congestion >= 70 && fiberAvailable ? "Fiber Migration" : record.congestion >= 70 ? "Fiber Build" : record.backhaul === "microwave" && record.congestion >= 55 ? "Microwave Expansion" : "Monitor";
  const rationale = recommendedAction === "Fiber Migration" ? `High congestion at ${record.congestion}% with ${record.fiberAvailability}% fiber availability makes this a ready migration target.` : recommendedAction === "Fiber Build" ? `Congestion is ${record.congestion}% but fiber availability is only ${record.fiberAvailability}%; plan a new fiber route.` : recommendedAction === "Microwave Expansion" ? "Microwave backhaul is carrying a growing load; expand capacity while fiber is planned." : "No immediate infrastructure intervention is indicated by the current signals.";
  return { ...record, opportunityScore, priority, recommendedAction, rationale };
}

export function assembleInfrastructureOperations(source: InfrastructureOperations["source"], records: InfrastructureRecord[], updatedAt = new Date().toISOString()): InfrastructureOperations {
  const opportunities = records.map(buildFiberOpportunity).sort((a, b) => b.opportunityScore - a.opportunityScore);
  const regions = Array.from(new Set(records.map(record => record.region))).map(region => {
    const items = opportunities.filter(record => record.region === region);
    return { region, nodes: items.length, availability: Number((items.reduce((sum, item) => sum + item.fiberAvailability, 0) / Math.max(1, items.length)).toFixed(1)), congestion: Number((items.reduce((sum, item) => sum + item.congestion, 0) / Math.max(1, items.length)).toFixed(1)), opportunities: items.filter(item => item.recommendedAction === "Fiber Migration" || item.recommendedAction === "Fiber Build").length };
  }).sort((a, b) => b.opportunities - a.opportunities || b.congestion - a.congestion);
  return { source, updatedAt, summary: { fiberNodes: opportunities.length, fiberLinks: opportunities.reduce((sum, item) => sum + item.linkCount, 0), fiberAvailability: Number((opportunities.reduce((sum, item) => sum + item.fiberAvailability, 0) / Math.max(1, opportunities.length)).toFixed(1)), backhaulAtRisk: opportunities.filter(item => item.backhaul !== "fiber" && item.congestion >= 70).length, microwaveSites: opportunities.filter(item => item.backhaul === "microwave" || item.backhaul === "mixed").length, plannedUpgrades: opportunities.filter(item => item.plannedUpgrade).length, migrationOpportunities: opportunities.filter(item => item.recommendedAction === "Fiber Migration").length }, opportunities, regions };
}

export function createPreviewInfrastructureOperations(sites: Array<{ id: string; name: string; lat: number; lng: number; fiber: number; congestion: number; status: string }>): InfrastructureOperations {
  const records: InfrastructureRecord[] = sites.map((site, index) => ({ id: `INF-${String(index + 1).padStart(3, "0")}`, nodeCode: `FN-${String(204 + index * 37).padStart(3, "0")}`, region: site.name, latitude: site.lat, longitude: site.lng, fiberAvailability: site.fiber, congestion: site.congestion, status: site.status, backhaul: site.fiber >= 85 ? "mixed" : "microwave", plannedUpgrade: site.congestion >= 70, linkCount: Math.max(1, Math.round(site.fiber / 30)) }));
  return assembleInfrastructureOperations("operational-preview", records);
}
