export type ComplaintSeverity = "low" | "medium" | "high" | "critical";
export type ComplaintStatus = "open" | "in_progress" | "resolved";

export type ComplaintRecord = {
  id: string;
  category: string;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  count: number;
  region: string;
  siteId: string | null;
  latitude: number | null;
  longitude: number | null;
  networkRelated: boolean;
  coveredWorstCellCount: number;
  worstCellCodes: string[];
  growthPct?: number;
};

export type ComplaintCategory = {
  category: string;
  count: number;
  networkRelated: number;
  growthPct: number;
  severity: ComplaintSeverity;
};

export type ComplaintHotspot = {
  id: string;
  region: string;
  complaints: number;
  openComplaints: number;
  networkRelated: number;
  networkShare: number;
  coveredWorstCellCount: number;
  coveredShare: number;
  criticalComplaints: number;
  latitude: number | null;
  longitude: number | null;
  worstCells: string[];
  severity: ComplaintSeverity;
  categories: string[];
};

export type ComplaintOperations = {
  source: "persisted";
  updatedAt: string;
  summary: {
    totalComplaints: number;
    openComplaints: number;
    networkRelated: number;
    networkShare: number;
    complaintGrowthPct: number;
    hotspots: number;
    criticalComplaints: number;
    worstCellCoverageShare: number;
    worstCellsInCoverage: number;
  };
  categories: ComplaintCategory[];
  severities: Array<{ severity: ComplaintSeverity; count: number }>;
  hotspots: ComplaintHotspot[];
  trends: Array<{ label: string; count: number }>;
};

const severityWeight: Record<ComplaintSeverity, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const networkCategory = /(internet|slow|service|coverage|signal|speed|data|network|call|drop|outage)/i;

export function isNetworkComplaint(category: string) { return networkCategory.test(category); }

function safeCount(value: number) { return Math.max(0, Math.round(value || 0)); }
function dominantSeverity(records: ComplaintRecord[]): ComplaintSeverity { return records.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity])[0]?.severity ?? "low"; }

export function assembleComplaintOperations(source: ComplaintOperations["source"], records: ComplaintRecord[], updatedAt = new Date().toISOString()): ComplaintOperations {
  const normalized = records.map(record => ({ ...record, count: safeCount(record.count) }));
  const totalComplaints = normalized.reduce((sum, record) => sum + record.count, 0);
  const openComplaints = normalized.filter(record => record.status !== "resolved").reduce((sum, record) => sum + record.count, 0);
  const networkRelated = normalized.filter(record => record.networkRelated).reduce((sum, record) => sum + record.count, 0);
  const criticalComplaints = normalized.filter(record => record.severity === "critical").reduce((sum, record) => sum + record.count, 0);
  const coveredWorstCellCount = normalized.reduce((sum, record) => sum + Math.min(record.count, safeCount(record.coveredWorstCellCount)), 0);
  const groupedCategories = Array.from(new Set(normalized.map(record => record.category))).map(category => {
    const items = normalized.filter(record => record.category === category);
    return { category, count: items.reduce((sum, item) => sum + item.count, 0), networkRelated: items.filter(item => item.networkRelated).reduce((sum, item) => sum + item.count, 0), growthPct: Number((items.reduce((sum, item) => sum + (item.growthPct ?? 0) * item.count, 0) / Math.max(1, items.reduce((sum, item) => sum + item.count, 0))).toFixed(1)), severity: dominantSeverity([...items]) } satisfies ComplaintCategory;
  }).sort((a, b) => b.count - a.count);
  const severityOrder: ComplaintSeverity[] = ["critical", "high", "medium", "low"];
  const severities = severityOrder.map(severity => ({ severity, count: normalized.filter(record => record.severity === severity).reduce((sum, record) => sum + record.count, 0) })).filter(item => item.count > 0);
  const regions = Array.from(new Set(normalized.map(record => record.region || "Unmapped region")));
  const hotspots = regions.map((region, index) => {
    const items = normalized.filter(record => (record.region || "Unmapped region") === region);
    const complaints = items.reduce((sum, item) => sum + item.count, 0);
    const hotspotNetwork = items.filter(item => item.networkRelated).reduce((sum, item) => sum + item.count, 0);
    const covered = items.reduce((sum, item) => sum + Math.min(item.count, safeCount(item.coveredWorstCellCount)), 0);
    const cells = Array.from(new Set(items.flatMap(item => item.worstCellCodes))).slice(0, 3);
    const categories = Array.from(new Set(items.map(item => item.category))).sort();
    return { id: `HOT-${String(index + 1).padStart(3, "0")}`, region, complaints, openComplaints: items.filter(item => item.status !== "resolved").reduce((sum, item) => sum + item.count, 0), networkRelated: hotspotNetwork, networkShare: Number((hotspotNetwork / Math.max(1, complaints) * 100).toFixed(1)), coveredWorstCellCount: covered, coveredShare: Number((covered / Math.max(1, hotspotNetwork) * 100).toFixed(1)), criticalComplaints: items.filter(item => item.severity === "critical").reduce((sum, item) => sum + item.count, 0), latitude: items[0]?.latitude ?? null, longitude: items[0]?.longitude ?? null, worstCells: cells, severity: dominantSeverity([...items]), categories } satisfies ComplaintHotspot;
  }).sort((a, b) => b.complaints - a.complaints);
  const complaintGrowthPct = Number((normalized.reduce((sum, record) => sum + (record.growthPct ?? 0) * record.count, 0) / Math.max(1, totalComplaints)).toFixed(1));
  // Historical complaint periods are not available in the current source schema; do not synthesize a trend.
  return { source, updatedAt, summary: { totalComplaints, openComplaints, networkRelated, networkShare: Number((networkRelated / Math.max(1, totalComplaints) * 100).toFixed(1)), complaintGrowthPct, hotspots: hotspots.length, criticalComplaints, worstCellCoverageShare: Number((coveredWorstCellCount / Math.max(1, networkRelated) * 100).toFixed(1)), worstCellsInCoverage: Array.from(new Set(normalized.flatMap(record => record.worstCellCodes))).length }, categories: groupedCategories, severities, hotspots, trends: [] };
}

