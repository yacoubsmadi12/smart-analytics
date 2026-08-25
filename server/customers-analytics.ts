export type CustomerSegment = "consumer" | "enterprise" | "sme" | "high_value" | "high_churn";

export type CustomerAreaInput = {
  id: string;
  name: string;
  region: string;
  customers: number;
  enterpriseCustomers: number;
  highValueCustomers: number;
  highChurnCustomers: number;
  churnRisk: number;
  density: number | null;
  latitude: number;
  longitude: number;
  congestedCells: number;
  nearestCongestedCellKm: number | null;
  complaints?: number;
  source?: string;
};

export type CustomerCluster = { id: string; areaId: string; latitude: number; longitude: number; customers: number; segment: "high_value" | "high_churn"; nearCongestedCell: boolean; radiusMeters: number };

export type CustomerArea = CustomerAreaInput & {
  consumerCustomers: number;
  smeCustomers: number | null;
  customerImpact: number;
  segmentMix: { consumer: number; enterprise: number; sme: number | null; highValue: number; highChurn: number };
  nearCongestedCell: boolean;
  customerClusters: CustomerCluster[];
};

export type CustomerOperations = {
  source: "persisted";
  updatedAt: string;
  summary: { totalCustomers: number; customerDensity: number | null; enterpriseCustomers: number; smeCustomers: number | null; highValueCustomers: number; highChurnCustomers: number; areas: number; nearCongestedHighValue: number };
  areas: CustomerArea[];
};

export function buildCustomerArea(input: CustomerAreaInput): CustomerArea {
  const enterpriseCustomers = Math.min(input.customers, Math.max(0, input.enterpriseCustomers));
  const highValueCustomers = Math.min(input.customers, Math.max(0, input.highValueCustomers));
  const highChurnCustomers = Math.min(input.customers, Math.max(0, input.highChurnCustomers));
  const consumerCustomers = Math.max(0, input.customers - enterpriseCustomers);
  const nearCongestedCell = input.congestedCells > 0;
  const customerImpact = Math.round(input.customers * Math.min(0.9, Math.max(0.04, (input.churnRisk / 100) + (input.complaints ?? 0) / Math.max(1, input.customers) * 0.4)));
  return {
    ...input,
    enterpriseCustomers,
    highValueCustomers,
    highChurnCustomers,
    consumerCustomers,
    smeCustomers: null,
    customerImpact,
    segmentMix: { consumer: consumerCustomers, enterprise: enterpriseCustomers, sme: null, highValue: highValueCustomers, highChurn: highChurnCustomers },
    nearCongestedCell,
    // Customer coordinates are not part of the current source schema, so no spatial cluster is invented.
    customerClusters: [],
  };
}

export function filterCustomerAreas(areas: CustomerArea[], filters: { segment: CustomerSegment | "all"; region: string; highValueNearCongested: boolean; highChurnOnly: boolean }) {
  return areas.filter(area => {
    const matchesRegion = filters.region === "all" || area.region === filters.region;
    const matchesSegment = filters.segment === "all" || filters.segment === "sme" ? filters.segment === "all" : filters.segment === "high_value" ? area.highValueCustomers > 0 : filters.segment === "high_churn" ? area.highChurnCustomers > 0 : area.segmentMix.consumer > 0 || area.segmentMix.enterprise > 0;
    const matchesNearby = !filters.highValueNearCongested || (area.highValueCustomers > 0 && area.nearCongestedCell);
    const matchesChurn = !filters.highChurnOnly || area.highChurnCustomers > 0;
    return matchesRegion && matchesSegment && matchesNearby && matchesChurn;
  });
}

export function assembleCustomerOperations(source: CustomerOperations["source"], inputs: CustomerAreaInput[], updatedAt = new Date().toISOString()): CustomerOperations {
  const areas = inputs.map(buildCustomerArea).sort((a, b) => b.customerImpact - a.customerImpact || b.customers - a.customers);
  const totalCustomers = areas.reduce((sum, area) => sum + area.customers, 0);
  const densityValues = areas.flatMap(area => area.density === null ? [] : [area.density]);
  const smeValues = areas.flatMap(area => area.smeCustomers === null ? [] : [area.smeCustomers]);
  return {
    source,
    updatedAt,
    summary: {
      totalCustomers,
      customerDensity: densityValues.length ? Math.round(densityValues.reduce((sum, value) => sum + value, 0) / densityValues.length) : null,
      enterpriseCustomers: areas.reduce((sum, area) => sum + area.enterpriseCustomers, 0),
      smeCustomers: smeValues.length ? smeValues.reduce((sum, value) => sum + value, 0) : null,
      highValueCustomers: areas.reduce((sum, area) => sum + area.highValueCustomers, 0),
      highChurnCustomers: areas.reduce((sum, area) => sum + area.highChurnCustomers, 0),
      areas: areas.length,
      nearCongestedHighValue: areas.filter(area => area.nearCongestedCell).reduce((sum, area) => sum + area.highValueCustomers, 0),
    },
    areas,
  };
}
