import { ArrowLeft, BarChart3, Building2, CircleDollarSign, Database, MapPinned, Network, ShieldAlert, Users, Wifi } from "lucide-react";
import { useLocation } from "wouter";

const regions = ["North", "Central", "South", "East", "West"];
const sampleSites = Array.from({ length: 8 }, (_, index) => ({
  code: `SYN-${String(index + 1).padStart(5, "0")}`,
  region: regions[index % regions.length],
  health: [94, 88, 76, 91, 68, 83, 97, 72][index],
  congestion: [42, 67, 91, 38, 84, 59, 29, 78][index],
}));

export function buildSyntheticDemoSummary(towerCount = 5250) {
  return {
    towerCount,
    cellCount: towerCount * 4,
    kpiRecords: towerCount * 6,
    customerCount: towerCount * 24,
    complaintCount: Math.round(towerCount * 1.6),
    fiberNodes: Math.round(towerCount * 0.24),
    salesOpportunities: Math.round(towerCount * 0.16),
    revenueAtRisk: Math.round(towerCount * 34.2),
  };
}

const summary = buildSyntheticDemoSummary();

function Metric({ icon: Icon, label, value, tone = "" }: { icon: typeof Database; label: string; value: string; tone?: string }) {
  return <div className="synthetic-metric"><span className={tone}><Icon size={17} /></span><small>{label}</small><strong>{value}</strong><em>Synthetic demo signal</em></div>;
}

export default function SyntheticDemoPage() {
  const [, navigate] = useLocation();
  return <main className="standalone-module synthetic-demo-page">
    <header className="synthetic-demo-header"><button className="back-link" onClick={() => navigate("/data-management")}><ArrowLeft size={15} /> Data Management</button><div className="synthetic-badge"><span /> SYNTHETIC DEMO MODE</div></header>
    <section className="synthetic-demo-hero"><div><span className="section-kicker">ISOLATED PREVIEW ENVIRONMENT</span><h1>Large Network Demo</h1><p>Explore how Smart Analytics behaves with a large telecom footprint. Every value on this page is generated for demonstration only and is never written to production tables.</p></div><div className="synthetic-hero-icon"><Network size={32} /><b>5,250</b><small>virtual towers</small></div></section>
    <div className="synthetic-warning"><ShieldAlert size={17} /><span><b>Demo data only.</b> Do not use these numbers for operational decisions. Exit this page to return to source-backed analytics.</span></div>
    <section className="synthetic-metrics-grid"><Metric icon={Building2} label="Network Sites" value={summary.towerCount.toLocaleString()} tone="cyan" /><Metric icon={Wifi} label="Cells" value={summary.cellCount.toLocaleString()} tone="blue" /><Metric icon={BarChart3} label="KPI records" value={summary.kpiRecords.toLocaleString()} tone="purple" /><Metric icon={Users} label="Customers" value={summary.customerCount.toLocaleString()} tone="green" /><Metric icon={ShieldAlert} label="Complaints" value={summary.complaintCount.toLocaleString()} tone="amber" /><Metric icon={CircleDollarSign} label="Revenue at risk" value={`${summary.revenueAtRisk.toLocaleString()} JOD`} tone="red" /></section>
    <section className="synthetic-demo-grid"><div className="synthetic-panel"><div className="panel-heading"><div><span className="section-kicker">NETWORK FOOTPRINT</span><h2>Regional tower health</h2><small>Virtual site inventory generated across five operating regions.</small></div><MapPinned size={19} /></div><div className="synthetic-bars">{regions.map((region, index) => <div className="synthetic-bar-row" key={region}><span>{region}</span><i><em style={{ width: `${[86, 72, 64, 79, 91][index]}%` }} /></i><b>{[1100, 970, 880, 1210, 1090][index].toLocaleString()}</b></div>)}</div></div><div className="synthetic-panel"><div className="panel-heading"><div><span className="section-kicker">CROSS-DOMAIN SIGNALS</span><h2>What the demo connects</h2></div><Database size={19} /></div><div className="synthetic-signal-list"><div><Network size={15} /><span><b>Network</b><small>4G and 5G cells with KPI history</small></span><strong>21,000</strong></div><div><Users size={15} /><span><b>Customer intelligence</b><small>Segments and churn-risk signals</small></span><strong>{summary.customerCount.toLocaleString()}</strong></div><div><CircleDollarSign size={15} /><span><b>Commercial impact</b><small>Pipeline and exposure linked to sites</small></span><strong>{summary.salesOpportunities.toLocaleString()}</strong></div></div></div></section>
    <section className="synthetic-panel synthetic-table-panel"><div className="panel-heading"><div><span className="section-kicker">SITE EXPLORER</span><h2>Sample virtual sites</h2><small>Preview rows only; the full synthetic network remains virtual.</small></div><span className="synthetic-record-count">{summary.towerCount.toLocaleString()} generated</span></div><div className="synthetic-table"><div className="synthetic-table-head"><span>Site</span><span>Region</span><span>Health</span><span>Congestion</span><span>Action</span></div>{sampleSites.map(site => <div className="synthetic-table-row" key={site.code}><b>{site.code}</b><span>{site.region}</span><span className={site.health < 75 ? "risk" : "good"}>{site.health}%</span><span className={site.congestion > 80 ? "risk" : ""}>{site.congestion}%</span><em>{site.congestion > 80 ? "Capacity review" : "Monitor"}</em></div>)}</div></section>
  </main>;
}
