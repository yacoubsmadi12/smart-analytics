export type NetworkTechnology = "2G" | "3G" | "4G" | "5G";
export type NetworkSeverity = "healthy" | "warning" | "critical";

export type NetworkCell = {
  cellCode: string;
  siteId: string;
  siteName: string;
  technology: NetworkTechnology;
  availability: number;
  traffic: number;
  congestion: number;
  throughput: number;
  coverage: number;
  impactedCustomers: number;
  complaints: number;
  fiber: number | null;
  reason: string;
  status: NetworkSeverity;
};

export type NetworkSite = {
  id: string;
  name: string;
  region: string;
  status: NetworkSeverity;
  cellCount: number;
  availability: number;
  traffic: number;
  congestion: number;
  throughput: number;
  coverage: number;
  customers: number;
  complaints: number;
  fiber: number | null;
};

export type NetworkOperations = {
  source: "persisted" | "operational-preview";
  updatedAt: string;
  summary: {
    sites: number;
    cells: number;
    availability: number;
    traffic: number;
    congestion: number;
    throughput: number;
    coverage: number;
    customersImpacted: number;
    openComplaints: number;
  };
  technology: Record<NetworkTechnology, { cells: number; availability: number; throughput: number }>;
  sites: NetworkSite[];
  cells: NetworkCell[];
  trends: Array<{ label: string; availability: number; congestion: number; throughput: number }>;
};

export type NetworkPreviewSite = {
  id: string;
  name: string;
  status: string;
  availability: number;
  traffic: number;
  congestion: number;
  cells4g: number;
  cells5g: number;
  customers: number;
  complaints: number;
  fiber: number;
  throughput: number;
};

export function networkStatus(availability: number, congestion: number): NetworkSeverity {
  if (availability < 95 || congestion >= 85) return "critical";
  if (availability < 98 || congestion >= 70) return "warning";
  return "healthy";
}

export function networkReason(availability: number, congestion: number, throughput: number): string {
  if (congestion >= 85) return "PRB congestion is above the operating threshold";
  if (availability < 95) return "Availability degradation requires investigation";
  if (throughput < 30) return "Throughput is below the 30 Mbps target";
  return "No single KPI breach; monitor trend and traffic headroom";
}

export function rankWorstCells(cells: NetworkCell[], limit = 10): NetworkCell[] {
  return [...cells]
    .sort((a, b) => {
      const severity = (value: NetworkSeverity) => value === "critical" ? 3 : value === "warning" ? 2 : 1;
      return severity(b.status) - severity(a.status) || b.congestion - a.congestion || a.availability - b.availability || a.throughput - b.throughput;
    })
    .slice(0, limit);
}

export function createPreviewNetworkOperations(sites: NetworkPreviewSite[]): NetworkOperations {
  const cells: NetworkCell[] = sites.flatMap(site => {
    const fourG = Math.max(1, site.cells4g);
    const fiveG = Math.max(1, site.cells5g);
    const twoG = Math.max(1, Math.round(fourG * 0.18));
    const threeG = Math.max(1, Math.round(fourG * 0.28));
    const technologyCounts: Array<[NetworkTechnology, number, number]> = [
      ["2G", twoG, 0.91],
      ["3G", threeG, 0.94],
      ["4G", fourG, 1],
      ["5G", fiveG, 1.04],
    ];
    const total = technologyCounts.reduce((sum, [, count]) => sum + count, 0);
    return technologyCounts.flatMap(([technology, count, multiplier]) => Array.from({ length: count }, (_, index) => {
      const congestion = Math.max(18, Math.min(99, site.congestion + (index % 5 - 2) * 3 + (technology === "4G" ? 2 : technology === "5G" ? -6 : 4)));
      const availability = Math.max(86, Math.min(99.9, site.availability - (index % 4) * 0.35 - (technology === "2G" ? 0.6 : 0)));
      const throughput = Math.max(8, Number((site.throughput * multiplier * (1 - Math.min(congestion, 95) / 260)).toFixed(1)));
      const impactedCustomers = Math.max(1, Math.round(site.customers / total * (1 + congestion / 180)));
      const complaints = Math.max(0, Math.round(site.complaints / total * (1 + congestion / 150)));
      return {
        cellCode: `${site.id}-${technology}-${String(index + 1).padStart(2, "0")}`,
        siteId: site.id,
        siteName: site.name,
        technology,
        availability: Number(availability.toFixed(1)),
        traffic: Number((site.traffic / total).toFixed(3)),
        congestion: Number(congestion.toFixed(1)),
        throughput,
        coverage: Number(Math.max(72, site.fiber - (technology === "5G" ? 8 : 0)).toFixed(1)),
        impactedCustomers,
        complaints,
        fiber: site.fiber,
        reason: networkReason(availability, congestion, throughput),
        status: networkStatus(availability, congestion),
      } satisfies NetworkCell;
    }));
  });
  return assembleNetworkOperations("operational-preview", cells);
}

export function assembleNetworkOperations(source: NetworkOperations["source"], cells: NetworkCell[], updatedAt = new Date().toISOString()): NetworkOperations {
  const sites = Array.from(new Map(cells.map(cell => [cell.siteId, cell])).values()).map(firstCell => {
    const siteCells = cells.filter(cell => cell.siteId === firstCell.siteId);
    const avg = (selector: (cell: NetworkCell) => number) => Number((siteCells.reduce((sum, cell) => sum + selector(cell), 0) / Math.max(1, siteCells.length)).toFixed(1));
    return {
      id: firstCell.siteId,
      name: firstCell.siteName,
      region: firstCell.siteName,
      status: siteCells.some(cell => cell.status === "critical") ? "critical" : siteCells.some(cell => cell.status === "warning") ? "warning" : "healthy",
      cellCount: siteCells.length,
      availability: avg(cell => cell.availability),
      traffic: Number(siteCells.reduce((sum, cell) => sum + cell.traffic, 0).toFixed(2)),
      congestion: avg(cell => cell.congestion),
      throughput: avg(cell => cell.throughput),
      coverage: avg(cell => cell.coverage),
      customers: siteCells.reduce((sum, cell) => sum + cell.impactedCustomers, 0),
      complaints: siteCells.reduce((sum, cell) => sum + cell.complaints, 0),
      fiber: firstCell.fiber,
    } satisfies NetworkSite;
  });
  const technologies = (["2G", "3G", "4G", "5G"] as NetworkTechnology[]).reduce<Record<NetworkTechnology, { cells: number; availability: number; throughput: number }>>((result, technology) => {
    const items = cells.filter(cell => cell.technology === technology);
    result[technology] = {
      cells: items.length,
      availability: items.length ? Number((items.reduce((sum, cell) => sum + cell.availability, 0) / items.length).toFixed(1)) : 0,
      throughput: items.length ? Number((items.reduce((sum, cell) => sum + cell.throughput, 0) / items.length).toFixed(1)) : 0,
    };
    return result;
  }, {} as Record<NetworkTechnology, { cells: number; availability: number; throughput: number }>);
  const avg = (selector: (cell: NetworkCell) => number) => Number((cells.reduce((sum, cell) => sum + selector(cell), 0) / Math.max(1, cells.length)).toFixed(1));
  return {
    source,
    updatedAt,
    summary: {
      sites: sites.length,
      cells: cells.length,
      availability: avg(cell => cell.availability),
      traffic: Number(cells.reduce((sum, cell) => sum + cell.traffic, 0).toFixed(2)),
      congestion: avg(cell => cell.congestion),
      throughput: avg(cell => cell.throughput),
      coverage: avg(cell => cell.coverage),
      customersImpacted: cells.reduce((sum, cell) => sum + cell.impactedCustomers, 0),
      openComplaints: cells.reduce((sum, cell) => sum + cell.complaints, 0),
    },
    technology: technologies,
    sites,
    cells,
    trends: [
      { label: "06:00", availability: Math.max(0, avg(cell => cell.availability) - 1.2), congestion: avg(cell => cell.congestion) + 4, throughput: Math.max(0, avg(cell => cell.throughput) - 4) },
      { label: "10:00", availability: Math.max(0, avg(cell => cell.availability) - 0.6), congestion: avg(cell => cell.congestion) + 2, throughput: Math.max(0, avg(cell => cell.throughput) - 2) },
      { label: "14:00", availability: avg(cell => cell.availability), congestion: avg(cell => cell.congestion), throughput: avg(cell => cell.throughput) },
      { label: "18:00", availability: Math.min(100, avg(cell => cell.availability) + 0.3), congestion: Math.max(0, avg(cell => cell.congestion) - 1), throughput: avg(cell => cell.throughput) + 1.5 },
      { label: "Now", availability: Math.min(100, avg(cell => cell.availability) + 0.5), congestion: Math.max(0, avg(cell => cell.congestion) - 1.8), throughput: avg(cell => cell.throughput) + 2.2 },
    ],
  };
}
