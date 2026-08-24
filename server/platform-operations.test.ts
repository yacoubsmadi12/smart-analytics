import { describe, expect, it } from "vitest";
import { createOperationalAlerts, createReport, filterOperationalAlerts, type OperationalSite } from "./platform-operations";
import { createPreviewPrioritiesOperations } from "./priorities-analytics";

const sites: OperationalSite[] = [{ id: "AMM-123", name: "Amman West", availability: 94.8, traffic: 12.4, congestion: 94, customers: 8420, complaints: 128, churn: 6.8, fiber: 92, revenueRisk: 185000, salesOpportunities: 14 }, { id: "IRB-204", name: "Irbid Central", availability: 98.2, traffic: 8.1, congestion: 55, customers: 2180, complaints: 20, churn: 2.2, fiber: 62, revenueRisk: 119000, salesOpportunities: 6 }];

describe("platform operational intelligence", () => {
  it("creates typed alerts from network, revenue, fiber and churn signals", () => { const alerts = createOperationalAlerts(sites, "2026-08-24T00:00:00.000Z"); expect(alerts.some(item => item.title.includes("4G congestion"))).toBe(true); expect(alerts.some(item => item.title.includes("Revenue"))).toBe(true); expect(alerts.some(item => item.category === "opportunity")).toBe(true); expect(alerts.some(item => item.title.includes("churn"))).toBe(true); });
  it("filters alerts by severity, category, status and query", () => { const alerts = createOperationalAlerts(sites); expect(filterOperationalAlerts(alerts, { severity: "critical" }).every(item => item.severity === "critical")).toBe(true); expect(filterOperationalAlerts(alerts, { query: "Irbid" }).every(item => item.region === "Irbid Central")).toBe(true); });
  it("generates report summaries and a top-five priority view", () => { const report = createReport("priority", sites); expect(report.title).toBe("Priority Report"); expect(report.summary.totalSites).toBe(2); expect(report.rows.length).toBeLessThanOrEqual(5); expect(createPreviewPrioritiesOperations(sites).priorities.length).toBeGreaterThan(0); });
});
