export type OperationalSite = { id: string; name: string; availability: number; traffic: number; congestion: number; customers: number; complaints: number; churn: number; fiber: number; revenueRisk: number; salesOpportunities: number };
export type AlertSeverity = "critical" | "high" | "warning" | "opportunity";
export type OperationalAlert = { id: string; title: string; severity: AlertSeverity; category: "network" | "customer" | "revenue" | "fiber" | "opportunity"; region: string; siteId: string; value: string; description: string; action: string; status: "open" | "acknowledged" | "resolved"; assignee: string | null; createdAt: string };

export function createOperationalAlerts(sites: OperationalSite[], now = new Date().toISOString()): OperationalAlert[] {
  return sites.flatMap(site => {
    const alerts: OperationalAlert[] = [];
    if (site.congestion >= 90) alerts.push({ id: `${site.id}-congestion`, title: "4G congestion above 90%", severity: "critical", category: "network", region: site.name, siteId: site.id, value: `${site.congestion}% PRB`, description: `${site.name} has insufficient radio headroom for the current customer load.`, action: "Capacity Upgrade", status: "open", assignee: null, createdAt: now });
    if (site.complaints >= 100) alerts.push({ id: `${site.id}-complaints`, title: "Complaints concentration increased", severity: "warning", category: "customer", region: site.name, siteId: site.id, value: `${site.complaints} open`, description: `Complaint volume is concentrated around ${site.name} and needs network investigation.`, action: "Network Investigation", status: "open", assignee: null, createdAt: now });
    if (site.revenueRisk >= 180000) alerts.push({ id: `${site.id}-revenue`, title: "Revenue at Risk requires review", severity: "critical", category: "revenue", region: site.name, siteId: site.id, value: `${Math.round(site.revenueRisk / 1000)}K JOD / month`, description: `Network and customer signals expose material monthly revenue at ${site.name}.`, action: "Protect Revenue", status: "open", assignee: null, createdAt: now });
    if (site.fiber >= 85 && site.congestion >= 75) alerts.push({ id: `${site.id}-fiber-opportunity`, title: "Fiber available at congested site", severity: "opportunity", category: "opportunity", region: site.name, siteId: site.id, value: `${site.fiber}% readiness`, description: `Fiber readiness can remove backhaul constraints while ${site.name} is under pressure.`, action: "Fiber Migration", status: "open", assignee: null, createdAt: now });
    if (site.churn >= 6) alerts.push({ id: `${site.id}-churn`, title: "High-value customers entering churn risk", severity: "high", category: "customer", region: site.name, siteId: site.id, value: `${site.churn}% churn risk`, description: `Customer retention risk is elevated in ${site.name}.`, action: "Retention Squad", status: "open", assignee: null, createdAt: now });
    return alerts;
  });
}

export function filterOperationalAlerts(alerts: OperationalAlert[], filters: { severity?: string; category?: string; status?: string; query?: string }) {
  const query = filters.query?.trim().toLowerCase();
  return alerts.filter(alert => (!filters.severity || filters.severity === "all" || alert.severity === filters.severity) && (!filters.category || filters.category === "all" || alert.category === filters.category) && (!filters.status || filters.status === "all" || alert.status === filters.status) && (!query || `${alert.title} ${alert.region} ${alert.description}`.toLowerCase().includes(query)));
}

export type ReportKind = "executive" | "network" | "customer-experience" | "business" | "priority";
export function createReport(kind: ReportKind, sites: OperationalSite[]) {
  const alerts = createOperationalAlerts(sites);
  const totalCustomers = sites.reduce((sum, site) => sum + site.customers, 0);
  const complaints = sites.reduce((sum, site) => sum + site.complaints, 0);
  const revenueRisk = sites.reduce((sum, site) => sum + site.revenueRisk, 0);
  const averageAvailability = sites.length ? sites.reduce((sum, site) => sum + site.availability, 0) / sites.length : 0;
  const rows = sites.map(site => ({ region: site.name, availability: `${site.availability}%`, congestion: `${site.congestion}%`, customers: site.customers, complaints: site.complaints, revenueRisk: site.revenueRisk, action: site.congestion >= 85 ? "Capacity Upgrade" : site.fiber < 75 ? "Fiber Migration" : "Monitor" }));
  const title = ({ executive: "Executive Report", network: "Network Report", "customer-experience": "Customer Experience Report", business: "Business Report", priority: "Priority Report" } as Record<ReportKind, string>)[kind];
  return { kind, title, generatedAt: new Date().toISOString(), summary: { totalSites: sites.length, totalCustomers, complaints, revenueRisk, averageAvailability: Number(averageAvailability.toFixed(2)), alertCount: alerts.length }, rows: kind === "priority" ? rows.sort((a, b) => (b.revenueRisk + b.complaints * 1000 + Number(b.congestion) * 1000) - (a.revenueRisk + a.complaints * 1000 + Number(a.congestion) * 1000)).slice(0, 5) : rows };
}
