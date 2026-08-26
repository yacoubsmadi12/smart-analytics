export type CxSeverity = "healthy" | "watch" | "critical";

export type CustomerExperienceAreaInput = {
  id: string;
  name: string;
  region: string;
  customers: number;
  complaints: number;
  churnRisk: number;
  availability: number;
  congestion: number;
  throughput: number;
  fiber: number | null;
  source?: string;
};

export type CustomerExperienceFactor = {
  label: string;
  value: string;
  impact: "high" | "medium" | "low";
  detail: string;
};

export type CustomerExperienceArea = CustomerExperienceAreaInput & {
  cxRisk: number;
  experienceScore: number;
  impactedCustomers: number;
  complaintCorrelation: number;
  complaintRate: number;
  severity: CxSeverity;
  primaryIssue: string;
  factors: CustomerExperienceFactor[];
};

export type CustomerExperienceOperations = {
  source: "persisted" | "synthetic";
  updatedAt: string;
  summary: {
    cxRisk: number;
    customerExperience: number;
    churnRisk: number;
    customers: number;
    impactedCustomers: number;
    complaints: number;
    correlatedComplaints: number;
  };
  areas: CustomerExperienceArea[];
  correlation: Array<{ label: string; complaints: number; correlation: number; status: CxSeverity }>;
  trends: Array<{ label: string; cxRisk: number; experience: number; churnRisk: number }>;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function calculateCxRisk(input: Pick<CustomerExperienceAreaInput, "customers" | "complaints" | "churnRisk" | "availability" | "congestion" | "throughput" | "fiber">) {
  const complaintRate = input.customers > 0 ? (input.complaints / input.customers) * 1000 : 0;
  const fiberGap = input.fiber === null ? 18 : Math.max(0, 100 - input.fiber);
  const throughputGap = Math.max(0, 45 - input.throughput);
  return Math.round(clamp(25 + input.congestion * 0.35 + Math.max(0, 100 - input.availability) * 1.5 + input.churnRisk * 2.2 + complaintRate * 1.5 + fiberGap * 0.15 + throughputGap * 0.08));
}

export function cxSeverity(cxRisk: number): CxSeverity {
  if (cxRisk >= 75) return "critical";
  if (cxRisk >= 50) return "watch";
  return "healthy";
}

export function cxReason(input: CustomerExperienceAreaInput, cxRisk = calculateCxRisk(input)) {
  const reasons = [
    { score: input.congestion, text: "Network congestion is driving slow sessions during busy hours", value: `${input.congestion.toFixed(0)}% congestion`, impact: "high" as const, detail: "Radio utilization is above the comfort zone for a consistent customer journey." },
    { score: input.complaints / Math.max(1, input.customers) * 1000 * 5, text: "Complaint density is elevated versus the customer base", value: `${(input.complaints / Math.max(1, input.customers) * 1000).toFixed(1)} / 1k customers`, impact: "high" as const, detail: "Open complaints are correlated to the same service area." },
    { score: input.churnRisk, text: "Churn propensity is increasing among exposed customers", value: `${input.churnRisk.toFixed(1)}% churn risk`, impact: "medium" as const, detail: "Customer risk is amplified when service friction persists." },
    { score: Math.max(0, 100 - input.availability) * 2, text: "Availability degradation is visible in the service footprint", value: `${input.availability.toFixed(1)}% availability`, impact: "medium" as const, detail: "Lower availability creates repeated failed or interrupted sessions." },
    { score: Math.max(0, 45 - input.throughput), text: "Throughput is below the experience target", value: `${input.throughput.toFixed(1)} Mbps throughput`, impact: "low" as const, detail: "Lower throughput is a secondary contributor to poor perceived quality." },
  ].sort((a, b) => b.score - a.score);
  const primary = reasons[0];
  return {
    primaryIssue: primary?.text ?? `CX risk is ${cxRisk}/100 and should be monitored`,
    factors: reasons.slice(0, 3).map(item => ({ label: item.text, value: item.value, impact: item.impact, detail: item.detail })),
  };
}

export function buildCustomerExperienceArea(input: CustomerExperienceAreaInput): CustomerExperienceArea {
  const cxRisk = calculateCxRisk(input);
  const reason = cxReason(input, cxRisk);
  const complaintRate = input.customers > 0 ? Number((input.complaints / input.customers * 1000).toFixed(1)) : 0;
  const complaintCorrelation = Math.round(clamp(38 + input.congestion * 0.42 + Math.max(0, 98 - input.availability) * 1.1));
  const impactedCustomers = Math.round(input.customers * clamp(cxRisk / 100 * 0.72, 0.04, 0.82));
  return {
    ...input,
    cxRisk,
    experienceScore: Math.round(clamp(100 - cxRisk * 0.72)),
    impactedCustomers,
    complaintRate,
    complaintCorrelation,
    severity: cxSeverity(cxRisk),
    primaryIssue: reason.primaryIssue,
    factors: reason.factors,
  };
}

export function rankCxAreas(areas: CustomerExperienceArea[], limit = areas.length) {
  return [...areas].sort((a, b) => b.cxRisk - a.cxRisk || b.impactedCustomers - a.impactedCustomers).slice(0, limit);
}

export function assembleCustomerExperience(source: CustomerExperienceOperations["source"], inputs: CustomerExperienceAreaInput[], updatedAt = new Date().toISOString()): CustomerExperienceOperations {
  const areas = rankCxAreas(inputs.map(buildCustomerExperienceArea));
  const totalCustomers = areas.reduce((sum, area) => sum + area.customers, 0);
  const weighted = (selector: (area: CustomerExperienceArea) => number) => totalCustomers ? Number((areas.reduce((sum, area) => sum + selector(area) * area.customers, 0) / totalCustomers).toFixed(1)) : 0;
  const complaints = areas.reduce((sum, area) => sum + area.complaints, 0);
  const correlatedComplaints = Math.round(areas.reduce((sum, area) => sum + area.complaints * area.complaintCorrelation / 100, 0));
  const correlation = areas.map(area => ({ label: area.name, complaints: area.complaints, correlation: area.complaintCorrelation, status: area.severity }));
  const cxRisk = weighted(area => area.cxRisk);
  const experience = weighted(area => area.experienceScore);
  const churnRisk = weighted(area => area.churnRisk);
  return {
    source,
    updatedAt,
    summary: { cxRisk, customerExperience: experience, churnRisk, customers: totalCustomers, impactedCustomers: areas.reduce((sum, area) => sum + area.impactedCustomers, 0), complaints, correlatedComplaints },
    areas,
    correlation,
    // A historical trend is not available in the current source schema; do not synthesize one.
    trends: [],
  };
}

