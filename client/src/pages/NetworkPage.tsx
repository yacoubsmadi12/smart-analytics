import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Gauge,
  Loader2,
  Network as NetworkIcon,
  Search,
  ShieldCheck,
  Signal,
  Users,
  Wifi,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

type Technology = "2G" | "3G" | "4G" | "5G";
type Status = "healthy" | "warning" | "critical";

type NetworkCell = {
  cellCode: string;
  siteId: string;
  siteName: string;
  technology: Technology;
  availability: number;
  traffic: number;
  congestion: number;
  throughput: number;
  coverage: number;
  impactedCustomers: number;
  complaints: number;
  fiber: number | null;
  reason: string;
  status: Status;
};

type NetworkOperations = {
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
  technology: Record<Technology, { cells: number; availability: number; throughput: number }>;
  sites: Array<{
    id: string;
    name: string;
    region: string;
    status: Status;
    cellCount: number;
    availability: number;
    traffic: number;
    congestion: number;
    throughput: number;
    coverage: number;
    customers: number;
    complaints: number;
    fiber: number | null;
  }>;
  cells: NetworkCell[];
  trends: Array<{ label: string; availability: number; congestion: number; throughput: number }>;
};

const technologyOptions: Array<{ key: Technology; label: string; color: string }> = [
  { key: "2G", label: "2G", color: "#94a3b8" },
  { key: "3G", label: "3G", color: "#f59e0b" },
  { key: "4G", label: "4G", color: "#38bdf8" },
  { key: "5G", label: "5G", color: "#a78bfa" },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatDecimal(value: number, digits = 1) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function severityLabel(status: Status) {
  return status === "critical" ? "Critical" : status === "warning" ? "Warning" : "Healthy";
}

function severityIcon(status: Status) {
  if (status === "critical") return <XCircle size={14} />;
  if (status === "warning") return <AlertCircle size={14} />;
  return <CheckCircle2 size={14} />;
}

function trendPoints(values: number[], min: number, max: number) {
  const spread = Math.max(1, max - min);
  return values.map((value, index) => `${(index / Math.max(1, values.length - 1)) * 100},${92 - ((value - min) / spread) * 72}`).join(" ");
}

export default function NetworkPage() {
  const [, navigate] = useLocation();
  const permissionsQuery = trpc.auth.permissions.useQuery();
  const operationsQuery = trpc.network.operations.useQuery(undefined, { enabled: Boolean(permissionsQuery.data?.grants?.includes("network.view")) });
  const operations = operationsQuery.data as NetworkOperations | undefined;
  const [technology, setTechnology] = useState<Technology | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedCellCode, setSelectedCellCode] = useState<string | null>(null);

  const filteredCells = useMemo(() => {
    const cells = operations?.cells ?? [];
    const normalized = query.trim().toLowerCase();
    return cells.filter(cell => {
      const matchesTech = technology === "all" || cell.technology === technology;
      const matchesQuery = !normalized || `${cell.cellCode} ${cell.siteId} ${cell.siteName}`.toLowerCase().includes(normalized);
      return matchesTech && matchesQuery;
    });
  }, [operations?.cells, query, technology]);

  const worstCells = useMemo(() => [...filteredCells].sort((a, b) => {
    const severity = (value: Status) => value === "critical" ? 3 : value === "warning" ? 2 : 1;
    return severity(b.status) - severity(a.status) || b.congestion - a.congestion || a.availability - b.availability || a.throughput - b.throughput;
  }).slice(0, 10), [filteredCells]);

  const selectedCell = operations?.cells.find(cell => cell.cellCode === selectedCellCode) ?? worstCells[0];
  const trends = operations?.trends ?? [];
  const availabilityValues = trends.map(point => point.availability);
  const congestionValues = trends.map(point => point.congestion);
  const throughputValues = trends.map(point => point.throughput);
  const trendMin = Math.min(...availabilityValues, ...congestionValues, ...throughputValues, 0);
  const trendMax = Math.max(...availabilityValues, ...congestionValues, ...throughputValues, 100);

  if (permissionsQuery.isLoading) return <div className="auth-loading"><Loader2 size={18} className="spin" /> Loading protected network workspace…</div>;
  if (!permissionsQuery.data?.grants?.includes("network.view")) return <main className="module-access-denied"><ShieldCheck size={28} /><h1>Access restricted</h1><p>Your role does not have permission to view Network Operations.</p><button onClick={() => navigate("/")}>Return to command center</button></main>;
  if (operationsQuery.isLoading) return <div className="auth-loading"><Loader2 size={18} className="spin" /> Loading live network operations…</div>;
  if (operationsQuery.isError || !operations) return <main className="module-access-denied"><CircleAlert size={28} /><h1>Network data unavailable</h1><p>We could not load the network operations dataset. Check the source connection and retry.</p><button onClick={() => operationsQuery.refetch()}>Retry network data</button></main>;

  return (
    <main className="standalone-module network-operations-page">
      <header className="standalone-top">
        <button onClick={() => navigate("/")}>← Command Center</button>
        <span className="section-kicker">RADIO & CORE PERFORMANCE</span>
        <span className="module-role"><ShieldCheck size={14} /> Role-scoped view</span>
      </header>

      <section className="standalone-hero network-page-hero">
        <div>
          <span className="section-kicker">NETWORK OPERATIONS</span>
          <h1>Know which cell is failing, and why.</h1>
          <p>Monitor availability, traffic, congestion, throughput and coverage across every technology layer, then connect the KPI breach to customer impact.</p>
        </div>
        <div className="standalone-icon"><NetworkIcon size={28} /></div>
      </section>

      <section className="network-source-strip">
        <div><span className="network-live-dot" /> <b>{operations.source === "persisted" ? "Persisted operational data" : "Operational preview dataset"}</b><span>Updated {formatUpdatedAt(operations.updatedAt)}</span></div>
        <span className="network-source-note">Network engineers · {operations.summary.cells} cells monitored</span>
      </section>

      <section className="network-summary-grid">
        <div className="network-summary-card"><span>Sites</span><strong>{formatNumber(operations.summary.sites)}</strong><small><NetworkIcon size={14} /> mapped sites</small></div>
        <div className="network-summary-card"><span>Cells</span><strong>{formatNumber(operations.summary.cells)}</strong><small><Signal size={14} /> all technologies</small></div>
        <div className="network-summary-card"><span>Availability</span><strong>{formatDecimal(operations.summary.availability)}%</strong><small className={operations.summary.availability < 95 ? "negative" : "positive"}>{operations.summary.availability >= 95 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} network health</small></div>
        <div className="network-summary-card"><span>Traffic</span><strong>{formatDecimal(operations.summary.traffic, 2)} TB</strong><small><Activity size={14} /> current load</small></div>
        <div className="network-summary-card"><span>Congestion</span><strong>{formatDecimal(operations.summary.congestion)}%</strong><small className={operations.summary.congestion >= 80 ? "negative" : "positive"}><Gauge size={14} /> PRB utilization</small></div>
        <div className="network-summary-card"><span>Customer impact</span><strong>{formatNumber(operations.summary.customersImpacted)}</strong><small className={operations.summary.openComplaints > 100 ? "negative" : "positive"}><Users size={14} /> {formatNumber(operations.summary.openComplaints)} complaints</small></div>
      </section>

      <section className="network-technology-grid">
        {technologyOptions.map(option => {
          const item = operations.technology[option.key];
          return <button key={option.key} className={`network-tech-card ${technology === option.key ? "selected" : ""}`} onClick={() => setTechnology(value => value === option.key ? "all" : option.key)}><span className="network-tech-icon" style={{ color: option.color, borderColor: `${option.color}55` }}>{option.key}</span><span><b>{formatNumber(item.cells)}</b><small>{option.label} cells</small></span><span className="network-tech-stat">{formatDecimal(item.availability)}%<small>availability</small></span><ChevronRight size={15} /></button>;
        })}
      </section>

      <section className="network-dashboard-grid">
        <div className="network-panel network-trend-panel">
          <div className="network-panel-head"><div><span className="section-kicker">KPI TRENDS</span><h2>Network performance trend</h2></div><span className="network-period-chip">Latest operating window</span></div>
          <div className="network-trend-legend"><span><i className="availability" />Availability</span><span><i className="congestion" />Congestion</span><span><i className="throughput" />Throughput index</span></div>
          <div className="network-trend-chart">
            {trends.length ? <><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Network KPI trend chart"><polyline className="trend-line availability-line" points={trendPoints(availabilityValues, trendMin, trendMax)} /><polyline className="trend-line congestion-line" points={trendPoints(congestionValues, trendMin, trendMax)} /><polyline className="trend-line throughput-line" points={trendPoints(throughputValues, trendMin, trendMax)} /></svg><div className="network-trend-gridlines"><span /><span /><span /><span /></div><div className="network-trend-labels">{trends.map(point => <small key={point.label}>{point.label}</small>)}</div></> : <div className="network-empty-state">No KPI trend records are available yet.</div>}
          </div>
          <div className="network-trend-readout">{trends.slice(-1).map(point => <div key={point.label}><b>{formatDecimal(point.availability)}%</b><span>availability now</span></div>)}{trends.slice(-1).map(point => <div key={`c-${point.label}`}><b>{formatDecimal(point.congestion)}%</b><span>congestion now</span></div>)}{trends.slice(-1).map(point => <div key={`t-${point.label}`}><b>{formatDecimal(point.throughput)} Mbps</b><span>throughput now</span></div>)}</div>
        </div>
        <div className="network-panel network-technology-panel">
          <div className="network-panel-head"><div><span className="section-kicker">TECHNOLOGY MIX</span><h2>Radio layer health</h2></div><Wifi size={18} /></div>
          <div className="network-tech-bars">{technologyOptions.map(option => { const item = operations.technology[option.key]; const width = `${Math.min(100, Math.max(4, item.availability))}%`; return <div key={option.key}><div><span><i style={{ background: option.color }} />{option.label}</span><b>{formatDecimal(item.availability)}%</b></div><div className="network-bar-track"><span style={{ width, background: option.color }} /></div><small>{formatDecimal(item.throughput)} Mbps average throughput · {formatNumber(item.cells)} cells</small></div>; })}</div>
          <div className="network-technology-note"><CircleAlert size={15} /><span>Tap a technology card above to scope the worst-cell analysis.</span></div>
        </div>
      </section>

      <section className="network-workspace-grid">
        <div className="network-panel network-worst-panel">
          <div className="network-panel-head"><div><span className="section-kicker">WORST KPIs</span><h2>Top 10 worst cells today</h2><p>{filteredCells.length} cells in current view · ranked by severity, congestion and throughput</p></div><div className="network-filter-count">{worstCells.length} shown</div></div>
          <div className="network-cell-toolbar"><label className="network-search"><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search cell or site" /></label><button className={technology === "all" ? "active" : ""} onClick={() => setTechnology("all")}>All</button>{technologyOptions.map(option => <button key={option.key} className={technology === option.key ? "active" : ""} onClick={() => setTechnology(option.key)}>{option.key}</button>)}</div>
          {worstCells.length ? <div className="network-cell-table"><div className="network-cell-table-head"><span>Cell / site</span><span>Tech</span><span>Availability</span><span>Congestion</span><span>Throughput</span><span>Status</span></div>{worstCells.map(cell => <button key={cell.cellCode} className={`network-cell-row ${selectedCell?.cellCode === cell.cellCode ? "selected" : ""}`} onClick={() => setSelectedCellCode(cell.cellCode)}><span><b>{cell.cellCode}</b><small>{cell.siteName}</small></span><span className="network-tech-label">{cell.technology}</span><span>{formatDecimal(cell.availability)}%</span><span className={cell.congestion >= 80 ? "negative" : ""}>{formatDecimal(cell.congestion)}%</span><span>{formatDecimal(cell.throughput)} Mbps</span><span className={`network-status-badge ${cell.status}`}>{severityIcon(cell.status)}{severityLabel(cell.status)}</span></button>)}</div> : <div className="network-empty-state"><Search size={20} /><b>No cells match this view</b><span>Clear the search or select All technologies.</span></div>}
        </div>

        <aside className="network-panel network-detail-panel">
          {selectedCell ? <><div className="network-detail-heading"><div><span className="section-kicker">SELECTED CELL</span><h2>{selectedCell.cellCode}</h2><p>{selectedCell.siteName} · {selectedCell.siteId}</p></div><span className={`network-status-badge ${selectedCell.status}`}>{severityIcon(selectedCell.status)}{severityLabel(selectedCell.status)}</span></div><div className="network-detail-kpis"><div><small>Availability</small><b>{formatDecimal(selectedCell.availability)}%</b></div><div><small>Coverage</small><b>{formatDecimal(selectedCell.coverage)}%</b></div><div><small>Traffic</small><b>{formatDecimal(selectedCell.traffic, 2)} TB</b></div><div><small>Throughput</small><b>{formatDecimal(selectedCell.throughput)} Mbps</b></div></div><div className="network-reason-card"><span><CircleAlert size={15} /> Why is it bad?</span><b>{selectedCell.reason}</b></div><div className="network-impact-list"><div><Users size={15} /><span>Customers impacted</span><b>{formatNumber(selectedCell.impactedCustomers)}</b></div><div><AlertCircle size={15} /><span>Open complaints</span><b>{formatNumber(selectedCell.complaints)}</b></div><div><Wifi size={15} /><span>Fiber context</span><b>{selectedCell.fiber === null ? "Not mapped" : `${formatDecimal(selectedCell.fiber)}% available`}</b></div></div><div className="network-detail-footer"><span>Click another row to inspect a different cell.</span><button onClick={() => setSelectedCellCode(null)}>Reset selection</button></div></> : <div className="network-empty-state"><NetworkIcon size={24} /><b>Select a cell</b><span>Choose a row from Top 10 Worst Cells to inspect its root signal and customer impact.</span></div>}
        </aside>
      </section>
    </main>
  );
}
