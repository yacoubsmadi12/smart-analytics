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
  density: number;
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
  smeCustomers: number;
  customerImpact: number;
  segmentMix: { consumer: number; enterprise: number; sme: number; highValue: number; highChurn: number };
  nearCongestedCell: boolean;
  customerClusters: CustomerCluster[];
};

export type CustomerOperations = {
  source: "persisted" | "operational-preview";
  updatedAt: string;
  summary: { totalCustomers: number; customerDensity: number; enterpriseCustomers: number; smeCustomers: number; highValueCustomers: number; highChurnCustomers: number; areas: number; nearCongestedHighValue: number };
  areas: CustomerArea[];
};

export function buildCustomerArea(input: CustomerAreaInput): CustomerArea {
  const enterpriseCustomers = Math.min(input.customers, Math.max(0, input.enterpriseCustomers));
  const highValueCustomers = Math.min(input.customers, Math.max(0, input.highValueCustomers));
  const highChurnCustomers = Math.min(input.customers, Math.max(0, input.highChurnCustomers));
  const consumerCustomers = Math.max(0, input.customers - enterpriseCustomers);
  const smeCustomers = Math.round(consumerCustomers * 0.18);
  const nearCongestedCell = input.nearestCongestedCellKm !== null && input.nearestCongestedCellKm <= 1 && input.congestedCells > 0;
  const customerClusters: CustomerCluster[] = [
    { id: `${input.id}-high-value`, areaId: input.id, latitude: input.latitude, longitude: input.longitude, customers: highValueCustomers, segment: "high_value", nearCongestedCell, radiusMeters: nearCongestedCell ? 1000 : 250 },
    { id: `${input.id}-high-churn`, areaId: input.id, latitude: input.latitude + 0.008, longitude: input.longitude + 0.006, customers: highChurnCustomers, segment: "high_churn", nearCongestedCell, radiusMeters: nearCongestedCell ? 1000 : 250 },
  ];
  return {
    ...input,
    enterpriseCustomers,
    highValueCustomers,
    highChurnCustomers,
    consumerCustomers,
    smeCustomers,
    customerImpact: Math.round(input.customers * Math.min(0.9, Math.max(0.04, (input.churnRisk / 100) + (input.complaints ?? 0) / Math.max(1, input.customers) * 0.4))),
    segmentMix: { consumer: consumerCustomers, enterprise: enterpriseCustomers, sme: smeCustomers, highValue: highValueCustomers, highChurn: highChurnCustomers },
    nearCongestedCell,
    customerClusters,
  };
}

export function filterCustomerAreas(areas: CustomerArea[], filters: { segment: CustomerSegment | "all"; region: string; highValueNearCongested: boolean; highChurnOnly: boolean }) {
  return areas.filter(area => {
    const matchesRegion = filters.region === "all" || area.region === filters.region;
    const matchesSegment = filters.segment === "all" || (filters.segment === "high_value" ? area.highValueCustomers > 0 : filters.segment === "high_churn" ? area.highChurnCustomers > 0 : area.segmentMix[filters.segment] > 0);
    const matchesNearby = !filters.highValueNearCongested || (area.highValueCustomers > 0 && area.nearCongestedCell);
    const matchesChurn = !filters.highChurnOnly || area.highChurnCustomers > 0;
    return matchesRegion && matchesSegment && matchesNearby && matchesChurn;
  });
}

export function assembleCustomerOperations(source: CustomerOperations["source"], inputs: CustomerAreaInput[], updatedAt = new Date().toISOString()): CustomerOperations {
  const areas = inputs.map(buildCustomerArea).sort((a, b) => b.customerImpact - a.customerImpact || b.customers - a.customers);
  const totalCustomers = areas.reduce((sum, area) => sum + area.customers, 0);
  const totalArea = Math.max(1, areas.length);
  return {
    source,
    updatedAt,
    summary: {
      totalCustomers,
      customerDensity: Math.round(areas.reduce((sum, area) => sum + area.density, 0) / totalArea),
      enterpriseCustomers: areas.reduce((sum, area) => sum + area.enterpriseCustomers, 0),
      smeCustomers: areas.reduce((sum, area) => sum + area.smeCustomers, 0),
      highValueCustomers: areas.reduce((sum, area) => sum + area.highValueCustomers, 0),
      highChurnCustomers: areas.reduce((sum, area) => sum + area.highChurnCustomers, 0),
      areas: areas.length,
      nearCongestedHighValue: areas.filter(area => area.nearCongestedCell).reduce((sum, area) => sum + area.highValueCustomers, 0),
    },
    areas,
  };
}

export function createPreviewCustomerOperations(sites: Array<{ id: string; name: string; lat: number; lng: number; customers: number; complaints: number; churn: number; congestion: number }>): CustomerOperations {
  return assembleCustomerOperations("operational-preview", sites.map(site => ({
    id: site.id,
    name: site.name,
    region: site.name,
    customers: site.customers,
    enterpriseCustomers: Math.round(site.customers * (site.name === "Aqaba Coast" ? 0.17 : 0.1)),
    highValueCustomers: Math.round(site.customers * (site.name === "Amman West" ? 0.12 : site.name === "Aqaba Coast" ? 0.15 : 0.07)),
    highChurnCustomers: Math.round(site.customers * site.churn / 100),
    churnRisk: site.churn,
    density: Math.round(site.customers / (site.name === "Amman West" ? 8.6 : site.name === "Aqaba Coast" ? 12.2 : 10.4)),
    latitude: site.lat,
    longitude: site.lng,
    congestedCells: site.congestion >= 70 ? Math.max(1, Math.round(site.congestion / 25)) : 0,
    nearestCongestedCellKm: site.congestion >= 70 ? 0.6 : 2.4,
    complaints: site.complaints,
    source: "operational-preview",
  })));
}
