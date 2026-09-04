import { assembleBusinessRevenueOperations, type BusinessRevenueOperations } from "./business-revenue-analytics";
import { assembleComplaintOperations, type ComplaintOperations, type ComplaintRecord } from "./complaints-analytics";
import { assembleCustomerOperations, type CustomerOperations } from "./customers-analytics";
import { assembleCustomerExperience, type CustomerExperienceOperations } from "./cx-analytics";
import { assembleInfrastructureOperations, type InfrastructureOperations, type InfrastructureRecord } from "./infrastructure-analytics";
import { assembleMarketingOperations, type MarketingCampaignInput, type MarketingOperations } from "./marketing-analytics";
import { assembleNetworkOperations, networkReason, networkStatus, type NetworkOperations } from "./network-analytics";
import { assemblePrioritiesOperations, type PrioritiesOperations } from "./priorities-analytics";
import { assembleSalesOperations, type SalesOperations, type SalesOpportunityInput } from "./sales-analytics";

export const SYNTHETIC_TOWER_COUNT = 5_250;
export const SYNTHETIC_REGION_NAMES = ["North", "Central", "South", "East", "West"] as const;
export const SYNTHETIC_UPDATED_AT = "2026-08-26T08:00:00.000Z";

const profiles = [
  { availability: 96.2, congestion: 78, throughput: 29, fiber: 88, customers: 28, complaints: 2, churn: 6.4 },
  { availability: 97.1, congestion: 66, throughput: 34, fiber: 92, customers: 24, complaints: 1, churn: 4.9 },
  { availability: 95.6, congestion: 84, throughput: 24, fiber: 68, customers: 22, complaints: 3, churn: 7.2 },
  { availability: 98.1, congestion: 58, throughput: 39, fiber: 81, customers: 31, complaints: 1, churn: 3.8 },
  { availability: 96.8, congestion: 73, throughput: 31, fiber: 76, customers: 26, complaints: 2, churn: 5.8 },
] as const;

function towerCode(index: number) { return `SYN-${String(index + 1).padStart(5, "0")}`; }
function towerName(index: number) { return `Synthetic Tower ${String(index + 1).padStart(5, "0")}`; }
function coordinate(index: number) { return { latitude: Number((31.15 + ((index * 0.0137) % 3.2)).toFixed(6)), longitude: Number((35.55 + ((index * 0.0191) % 3.1)).toFixed(6)) }; }
function regionIndex(index: number) { return index % SYNTHETIC_REGION_NAMES.length; }
function profileFor(index: number) { return profiles[regionIndex(index)]; }
function variation(index: number, modulus: number, offset = 0) { return ((index * 17 + offset) % modulus) - Math.floor(modulus / 2); }

type SyntheticMapSite = { id: string; name: string; lat: number; lng: number; status: "healthy" | "warning" | "critical"; availability: number; traffic: number; congestion: number; cells4g: number; cells5g: number; customers: number; complaints: number; churn: number; fiber: number; salesOpportunities: number; revenueRisk: number; throughput: number };

let cachedSyntheticMapSites: SyntheticMapSite[] | null = null;
let cachedSyntheticNetworkOperations: NetworkOperations | null = null;

export function syntheticMapSites(count = SYNTHETIC_TOWER_COUNT): SyntheticMapSite[] {
  if (count === SYNTHETIC_TOWER_COUNT && cachedSyntheticMapSites) return cachedSyntheticMapSites;
  const sites = Array.from({ length: count }, (_, index) => {
    const profile = profileFor(index);
    const coordinatePair = coordinate(index);
    const congestion = Math.max(20, Math.min(99, profile.congestion + variation(index, 18)));
    const availability = Math.max(90, Math.min(99.9, profile.availability + variation(index, 12) / 10));
    const customers = profile.customers + Math.max(0, variation(index, 12));
    const complaints = Math.max(0, profile.complaints + (index % 13 === 0 ? 4 : variation(index, 4)));
    const fiber = Math.max(45, Math.min(99, profile.fiber + variation(index, 16)));
    return {
      id: towerCode(index),
      name: towerName(index),
      lat: coordinatePair.latitude,
      lng: coordinatePair.longitude,
      status: networkStatus(availability, congestion),
      availability,
      traffic: Number((0.05 + (index % 12) * 0.03).toFixed(2)),
      congestion,
      cells4g: 1,
      cells5g: 1,
      customers,
      complaints,
      churn: Math.max(1, Number((profile.churn + variation(index, 10) / 10).toFixed(1))),
      fiber,
      salesOpportunities: index % 7 === 0 ? 2 : index % 3 === 0 ? 1 : 0,
      revenueRisk: Math.round(180 + congestion * 7 + (100 - fiber) * 5),
      throughput: Math.max(12, Number((profile.throughput + variation(index, 10) / 2).toFixed(1))),
    };
  });
  if (count === SYNTHETIC_TOWER_COUNT) cachedSyntheticMapSites = sites;
  return sites;
}

export function buildSyntheticNetworkOperations(count = SYNTHETIC_TOWER_COUNT): NetworkOperations {
  if (count === SYNTHETIC_TOWER_COUNT && cachedSyntheticNetworkOperations) return cachedSyntheticNetworkOperations;
  const technologies = ["2G", "3G", "4G", "5G"] as const;
  const cells = Array.from({ length: count * technologies.length }, (_, index) => {
    const towerIndex = Math.floor(index / technologies.length);
    const technology = technologies[index % technologies.length];
    const profile = profileFor(towerIndex);
    const congestion = Math.max(20, Math.min(99, profile.congestion + variation(towerIndex, 18, index)));
    const availability = Math.max(90, Math.min(99.9, profile.availability + variation(towerIndex, 12, index) / 10));
    const throughput = Math.max(12, Number((profile.throughput + variation(towerIndex, 10, index) / 2 + (technology === "5G" ? 7 : technology === "4G" ? 2 : 0)).toFixed(1)));
    const coordinatePair = coordinate(towerIndex);
    return {
      cellCode: `${towerCode(towerIndex)}-${technology}-${String(index % 4 + 1).padStart(2, "0")}`,
      siteId: towerCode(towerIndex),
      siteName: towerName(towerIndex),
      technology,
      availability,
      traffic: Number((0.05 + (towerIndex % 12) * 0.03).toFixed(3)),
      congestion,
      throughput,
      coverage: Math.max(70, Number((availability - 2 - (congestion >= 85 ? 4 : 0)).toFixed(1))),
      impactedCustomers: Math.max(1, Math.round((profile.customers + Math.max(0, variation(towerIndex, 12))) / 4)),
      complaints: Math.max(0, Math.round((profile.complaints + (towerIndex % 13 === 0 ? 4 : 0)) / 2)),
      fiber: profile.fiber,
      reason: networkReason(availability, congestion, throughput),
      status: networkStatus(availability, congestion),
    };
  });
  const result = assembleNetworkOperations("synthetic", cells, SYNTHETIC_UPDATED_AT);
  result.trends = [
    { label: "06:00", availability: 97.8, congestion: 61.2, throughput: 35.4 },
    { label: "08:00", availability: 97.2, congestion: 66.8, throughput: 33.1 },
    { label: "10:00", availability: 96.9, congestion: 70.4, throughput: 31.8 },
    { label: "12:00", availability: 96.6, congestion: 73.1, throughput: 30.2 },
    { label: "14:00", availability: 96.4, congestion: 75.8, throughput: 29.6 },
    { label: "16:00", availability: 96.1, congestion: 78.4, throughput: 28.9 },
  ];
  if (count === SYNTHETIC_TOWER_COUNT) cachedSyntheticNetworkOperations = result;
  return result;
}

export function buildSyntheticCustomerExperience(): CustomerExperienceOperations {
  const inputs = SYNTHETIC_REGION_NAMES.map((region, index) => {
    const profile = profiles[index];
    return { id: `SYN-CX-${index + 1}`, name: `${region} service area`, region, customers: 19_000 + index * 1_250, complaints: 920 + index * 115, churnRisk: profile.churn, availability: profile.availability, congestion: profile.congestion, throughput: profile.throughput, fiber: profile.fiber, source: "synthetic" };
  });
  return assembleCustomerExperience("synthetic", inputs, SYNTHETIC_UPDATED_AT);
}

export function buildSyntheticCustomers(): CustomerOperations {
  const inputs = SYNTHETIC_REGION_NAMES.map((region, index) => {
    const profile = profiles[index];
    const customers = 22_000 + index * 1_250;
    return { id: `SYN-${String(index + 1).padStart(5, "0")}`, name: `${region} customer base`, region, customers, enterpriseCustomers: Math.round(customers * 0.08), smeCustomers: Math.round(customers * 0.22), highValueCustomers: Math.round(customers * 0.16), highChurnCustomers: Math.round(customers * (0.035 + index * 0.006)), churnRisk: profile.churn, density: 420 + index * 85, latitude: coordinate(index * 911).latitude, longitude: coordinate(index * 911).longitude, congestedCells: profile.congestion >= 70 ? 3 : 1, nearestCongestedCellKm: profile.congestion >= 70 ? 0.6 : 1.4, complaints: 920 + index * 115, source: "synthetic" };
  });
  return assembleCustomerOperations("synthetic", inputs, SYNTHETIC_UPDATED_AT);
}

export function buildSyntheticComplaints(): ComplaintOperations {
  const categories = ["Internet Slow", "Coverage Gap", "Call Drop"];
  const records: ComplaintRecord[] = SYNTHETIC_REGION_NAMES.flatMap((region, regionIndex) => categories.map((category, categoryIndex) => {
    const count = 480 + regionIndex * 70 + categoryIndex * 45;
    const towerIndex = regionIndex * 5;
    return { id: `SYN-C-${regionIndex + 1}-${categoryIndex + 1}`, category, severity: categoryIndex === 0 && regionIndex % 2 === 0 ? "critical" : categoryIndex === 1 ? "high" : "medium", status: categoryIndex === 2 ? "in_progress" : "open", count, region, siteId: towerCode(towerIndex), latitude: coordinate(towerIndex).latitude, longitude: coordinate(towerIndex).longitude, networkRelated: true, coveredWorstCellCount: Math.round(count * 0.72), worstCellCodes: [`${towerCode(towerIndex)}-4G-01`, `${towerCode(towerIndex)}-4G-02`, `${towerCode(towerIndex)}-5G-01`], growthPct: 18 + regionIndex * 4 + categoryIndex * 3 } satisfies ComplaintRecord;
  }));
  return assembleComplaintOperations("synthetic", records, SYNTHETIC_UPDATED_AT);
}

export function buildSyntheticInfrastructure(): InfrastructureOperations {
  const records: InfrastructureRecord[] = Array.from({ length: 1_260 }, (_, index) => {
    const regionIndexValue = regionIndex(index);
    const profile = profileFor(index);
    const coordinatePair = coordinate(index);
    const congestion = Math.max(20, Math.min(99, profile.congestion + variation(index, 18)));
    const fiberAvailability = Math.max(45, Math.min(99, profile.fiber + variation(index, 16)));
    const backhaul = index % 5 === 0 ? "microwave" : index % 7 === 0 ? "mixed" : "fiber";
    return { id: `SYN-F-${String(index + 1).padStart(5, "0")}`, nodeCode: `SYN-NODE-${String(index + 1).padStart(5, "0")}`, region: SYNTHETIC_REGION_NAMES[regionIndexValue], latitude: coordinatePair.latitude, longitude: coordinatePair.longitude, fiberAvailability, congestion, status: congestion >= 85 ? "At risk" : "Operational", backhaul, plannedUpgrade: index % 11 === 0, linkCount: 2 + (index % 6) };
  });
  return assembleInfrastructureOperations("synthetic", records, SYNTHETIC_UPDATED_AT);
}

export function buildSyntheticSales(): SalesOperations {
  const stages = ["Qualified", "Proposal", "Negotiation", "Closed Won"];
  const inputs: SalesOpportunityInput[] = Array.from({ length: 840 }, (_, index) => {
    const regionIndexValue = regionIndex(index);
    const profile = profileFor(index);
    const towerIndex = index % SYNTHETIC_TOWER_COUNT;
    const value = 85_000 + (index % 9) * 38_000 + (regionIndexValue === 0 ? 75_000 : 0);
    return { id: `SYN-O-${String(index + 1).padStart(5, "0")}`, accountName: `Synthetic Account ${String(index + 1).padStart(4, "0")}`, region: SYNTHETIC_REGION_NAMES[regionIndexValue], latitude: coordinate(towerIndex).latitude, longitude: coordinate(towerIndex).longitude, stage: stages[index % stages.length], value, probability: 35 + (index % 6) * 10, enterprise: index % 4 === 0, customerSegment: (index % 4 === 0 ? "enterprise" : index % 3 === 0 ? "high_value" : "consumer") as SalesOpportunityInput["customerSegment"], networkReadiness: Math.max(35, 100 - profile.congestion), fiberReadiness: profile.fiber, siteName: towerName(towerIndex) };
  });
  return assembleSalesOperations("synthetic", inputs, SYNTHETIC_UPDATED_AT);
}

export function buildSyntheticMarketing(): MarketingOperations {
  const inputs: MarketingCampaignInput[] = Array.from({ length: 12 }, (_, index) => {
    const regionIndexValue = regionIndex(index);
    const profile = profileFor(index);
    return { id: `SYN-M-${String(index + 1).padStart(3, "0")}`, name: `Synthetic ${SYNTHETIC_REGION_NAMES[regionIndexValue]} 5G campaign`, region: SYNTHETIC_REGION_NAMES[regionIndexValue], status: index % 4 === 0 ? "Planned" : "Active", budget: 55_000 + index * 12_500, conversionRate: 4.8 + (index % 5) * 1.2, targetArea: `${SYNTHETIC_REGION_NAMES[regionIndexValue]} service area`, marketPotential: 18_000 + index * 1_500, fiveGPotential: 62 + (index % 4) * 8, customerSegment: (index % 4 === 0 ? "enterprise" : index % 3 === 0 ? "high_value" : "consumer") as MarketingCampaignInput["customerSegment"], churnRisk: profile.churn, complaintRate: 4.2 + regionIndexValue * 0.8, networkReadiness: Math.max(35, 100 - profile.congestion), fiberReadiness: profile.fiber };
  });
  return assembleMarketingOperations("synthetic", inputs, SYNTHETIC_UPDATED_AT);
}

export function buildSyntheticBusinessRevenue(): BusinessRevenueOperations {
  const inputs = SYNTHETIC_REGION_NAMES.map((region, index) => {
    const profile = profiles[index];
    const revenueAtRisk = 240_000 + index * 62_000;
    return { id: `SYN-R-${index + 1}`, region, period: "2026-08", revenueAtRisk, customersAtRisk: 2_400 + index * 430, enterpriseImpact: 180 + index * 34, salesPipeline: 420_000 + index * 55_000, revenueOpportunity: 160_000 + index * 28_000, investmentOpportunity: 95_000 + index * 22_000, networkHealth: Math.max(0, 100 - profile.congestion), networkIssue: profile.congestion >= 70, action: profile.congestion >= 70 ? "Capacity and fiber remediation" : "Protect and grow", status: profile.congestion >= 70 ? "Urgent" : "Opportunity" };
  });
  return assembleBusinessRevenueOperations("synthetic", inputs, SYNTHETIC_UPDATED_AT);
}

export function buildSyntheticPriorities(): PrioritiesOperations {
  const inputs = SYNTHETIC_REGION_NAMES.flatMap((region, index) => {
    const profile = profiles[index];
    const affectedCustomers = 3_800 + index * 620;
    const revenueRisk = 240_000 + index * 62_000;
    return [
      { id: `SYN-P-${index + 1}-network`, region, issue: "4G congestion", category: "network" as const, score: profile.congestion, severity: profile.congestion >= 80 ? "critical" as const : "high" as const, affectedCustomers, revenueRisk, salesPipeline: 420_000 + index * 55_000, complaintCount: 920 + index * 115, networkHealth: Math.max(0, 100 - profile.congestion), action: "Capacity Upgrade", rationale: `${profile.congestion}% congestion is reducing available headroom across the synthetic service area.` },
      { id: `SYN-P-${index + 1}-fiber`, region, issue: "Backhaul readiness gap", category: "fiber" as const, score: 100 - profile.fiber, severity: profile.fiber < 75 ? "high" as const : "medium" as const, affectedCustomers: Math.round(affectedCustomers * 0.7), revenueRisk: Math.round(revenueRisk * 0.55), salesPipeline: 420_000 + index * 55_000, complaintCount: 920 + index * 115, networkHealth: Math.max(0, 100 - profile.congestion), action: "Fiber Migration", rationale: `${profile.fiber}% fiber readiness leaves the synthetic area exposed to backhaul pressure.` },
    ];
  });
  return assemblePrioritiesOperations("synthetic", inputs, SYNTHETIC_UPDATED_AT);
}

export function buildSyntheticDashboardSummary() {
  const network = buildSyntheticNetworkOperations();
  return { networkHealth: network.summary.availability, sites: SYNTHETIC_TOWER_COUNT, customers: 126_000, openComplaints: 8_400, cxRisk: 62.4, revenueAtRisk: 1_510_000, updatedMinutesAgo: 0, updatedAt: SYNTHETIC_UPDATED_AT, trend: { period: "7d", networkHealth: 1.8, openComplaints: 14.2, cxRisk: -2.1, revenueAtRisk: 4.6, mode: "preview-simulation" as const }, source: "synthetic" as const };
}
