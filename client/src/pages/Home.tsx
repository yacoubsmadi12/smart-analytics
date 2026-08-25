import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Activity, ArrowUpRight, BarChart3, Bot, Building2, Database, Gauge, Globe2, Layers3, LogOut, MapPin, Menu, MessageSquareWarning, Network, PanelLeftClose, Search, Settings2, ShieldCheck, Signal, Sparkles, Target, Users, Wifi, X, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";

const moduleSlugs: Record<string, string> = {
  "Executive Overview": "executive-overview", "Intelligence Map": "intelligence-map", Network: "network", "Customer Experience": "customer-experience", Customers: "customers", Complaints: "complaints", "Infrastructure / Fiber": "infrastructure-fiber", Sales: "sales", Marketing: "marketing", "Business & Revenue": "business-revenue", Priorities: "priorities", "AI Assistant": "ai-assistant", Alerts: "alerts", Reports: "reports", "Data Management": "data-management", "User Management": "user-management", "System Settings": "system-settings", "Audit Logs": "audit-logs",
};
const nav = [["Executive Overview", Gauge], ["Intelligence Map", Globe2], ["Network", Signal], ["Customer Experience", Users], ["Customers", Users], ["Complaints", MessageSquareWarning], ["Infrastructure / Fiber", Wifi], ["Sales", Target], ["Marketing", Sparkles], ["Business & Revenue", Building2], ["Priorities", Zap], ["AI Assistant", Bot], ["Alerts", AlertTriangle], ["Reports", BarChart3], ["Data Management", Database], ["User Management", ShieldCheck], ["System Settings", Settings2], ["Audit Logs", Activity]] as const;
const navGrant: Record<string, string> = { "Executive Overview": "dashboard.view", "Intelligence Map": "map.view", Network: "network.view", "Customer Experience": "complaints.view", Customers: "customers.view", Complaints: "complaints.view", "Infrastructure / Fiber": "infrastructure.view", Sales: "sales.view", Marketing: "marketing.view", "Business & Revenue": "revenue.view", Priorities: "dashboard.view", "AI Assistant": "ai.ask", Alerts: "dashboard.view", Reports: "dashboard.view", "Data Management": "data.view", "User Management": "users.manage", "System Settings": "settings.manage", "Audit Logs": "audit.view" };

type Site = { id: string; name: string; lat: number; lng: number; status: string; revenueRisk: number; customers: number; complaints: number; congestion: number };

type Metric = { label: string; value: string; note: string; icon: typeof Signal; tone: "good" | "warn" | "neutral" };
function formatMoney(value: number) { if (!value) return "—"; return value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(2)}M` : `$${Math.round(value / 1_000)}K`; }
function formatMetric(value: number | undefined, suffix = "") { return value === undefined || value === null || !Number.isFinite(value) ? "—" : `${value.toLocaleString()}${suffix}`; }

function CommandMap({ sites }: { sites: Site[] }) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = sites.map(site => new google.maps.Marker({
      map,
      position: { lat: site.lat, lng: site.lng },
      title: `${site.id} · ${site.name}`,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: site.status === "critical" ? "#f36d76" : site.status === "warning" ? "#f4b84a" : "#4fe0a0",
        fillOpacity: 1,
        strokeColor: "#081119",
        strokeWeight: 2,
      },
    }));
    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
  }, [sites]);

  const center = sites[0] ? { lat: sites[0].lat, lng: sites[0].lng } : { lat: 0, lng: 0 };
  return (
    <div className="map-canvas command-map">
      {sites.length ? <MapView className="real-map" initialCenter={center} initialZoom={8} onMapReady={map => { mapRef.current = map; }} /> : <div className="map-empty-canvas"><MapPin size={20} /><b>No source-backed sites available</b><span>Connect or import a Network Sites dataset to populate the map.</span></div>}
      <div className="map-legend"><span><i className="dot healthy" />Healthy</span><span><i className="dot warn" />Warning</span><span><i className="dot critical" />Critical</span></div>
    </div>
  );
}

function MetricCard({ metric }: { metric: Metric }) { const Icon = metric.icon; return <div className={`command-metric ${metric.tone}`}><div><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small></div><Icon size={18} /></div>; }

export default function Home() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [sidebar, setSidebar] = useState(() => typeof window !== "undefined" && window.innerWidth > 760);
  const [navQuery, setNavQuery] = useState("");
  const permissionsQuery = trpc.auth.permissions.useQuery();
  const summaryQuery = trpc.dashboard.summary.useQuery();
  const prioritiesQuery = trpc.dashboard.priorities.useQuery({ limit: 5 });
  const sitesQuery = trpc.map.sites.useQuery();
  const alertsQuery = trpc.alerts.operations.useQuery();
  const grants = new Set(permissionsQuery.data?.grants ?? []);
  const filteredNav = useMemo(() => nav.filter(([name]) => grants.has(navGrant[name]) && name.toLowerCase().includes(navQuery.toLowerCase())), [permissionsQuery.data?.grants, navQuery]);
  const summary = summaryQuery.data;
  const sites = (sitesQuery.data ?? []) as Site[];
  const priorities = prioritiesQuery.data ?? [];
  const openAlerts = (alertsQuery.data ?? []).filter(alert => alert.status === "open").length;
  const metrics: Metric[] = [
    { label: "Network Health", value: formatMetric(summary?.networkHealth, "%"), note: summary ? "Source-backed average" : "Awaiting KPI data", icon: Signal, tone: summary ? "good" : "neutral" },
    { label: "Total Sites", value: formatMetric(summary?.sites), note: summary ? "From connected sources" : "Awaiting site inventory", icon: Network, tone: summary ? "good" : "neutral" },
    { label: "Active Customers", value: summary?.customers ? `${(summary.customers / 1_000_000).toFixed(2)}M` : "—", note: summary ? "Source-backed count" : "Awaiting customer data", icon: Users, tone: summary ? "good" : "neutral" },
    { label: "Open Complaints", value: formatMetric(summary?.openComplaints), note: summary ? "Unresolved source records" : "Awaiting complaint data", icon: MessageSquareWarning, tone: summary ? "warn" : "neutral" },
    { label: "CX Risk", value: formatMetric(summary?.cxRisk, "%"), note: summary ? "Derived from customer signals" : "Awaiting CX inputs", icon: AlertTriangle, tone: summary ? "warn" : "neutral" },
    { label: "Revenue at Risk", value: formatMoney(summary?.revenueAtRisk ?? 0), note: summary ? "Source-backed revenue data" : "Awaiting revenue data", icon: Building2, tone: summary ? "warn" : "neutral" },
  ];
  const sourceReady = Boolean(summary || sites.length || priorities.length || openAlerts);
  const handleNav = (name: string) => navigate(`/${moduleSlugs[name]}`);
  return <div className="app-shell"><div className="platform-grid" aria-hidden="true" /><div className="platform-tower" aria-hidden="true"><span /><i /><b /></div><aside className={`sidebar ${sidebar ? "open" : "collapsed"}`}><div className="brand"><div className="brand-mark"><span /><span /><span /></div>{sidebar && <div><strong>Smart<span>Analytics</span></strong><small>TELECOM INTELLIGENCE</small></div>}<button className="icon-btn sidebar-toggle" onClick={() => setSidebar(value => !value)} aria-label="Toggle navigation">{sidebar ? <PanelLeftClose size={17} /> : <Menu size={18} />}</button></div>{sidebar && <><div className="workspace-pill"><span className="pulse" /><div><small>WORKSPACE</small><b>Source-backed command center</b></div></div><label className="nav-search"><Search size={14} /><input value={navQuery} onChange={event => setNavQuery(event.target.value)} placeholder="Filter navigation" /></label><nav className="main-nav"><span className="nav-label">COMMAND CENTER</span>{filteredNav.map(([name, Icon]) => <button key={name} className={name === "Executive Overview" ? "active" : ""} onClick={() => handleNav(name)}><Icon size={16} /><span>{name}</span>{name === "Priorities" && priorities.length > 0 && <em>{priorities.length}</em>}{name === "Alerts" && openAlerts > 0 && <em>{openAlerts}</em>}</button>)}</nav></>}</aside><main className="main-content"><header className="topbar"><button className="mobile-menu" onClick={() => setSidebar(value => !value)}><Menu size={17} /></button><div className="breadcrumbs"><span>Command Center</span><b>/</b><strong>Executive Overview</strong></div><div className="topbar-actions"><label className="global-search"><Search size={14} /><input placeholder="Search source-backed records" /></label><button className="icon-btn" onClick={() => handleNav("AI Assistant")} aria-label="Open AI Assistant"><Bot size={17} /></button><button className="icon-btn" onClick={() => handleNav("Alerts")} aria-label="Open alerts"><AlertTriangle size={17} /></button><div className="user-chip"><span>{(user?.name || "A").slice(0, 1).toUpperCase()}</span><div><b>{user?.name || "Administrator"}</b><small>{user?.role === "admin" ? "Administrator" : "Authorized user"}</small></div></div><button className="icon-btn" onClick={() => void logout()} aria-label="Log out"><LogOut size={17} /></button></div></header><section className="command-hero"><div><span className="section-kicker"><i className="live-dot" /> SOURCE-BACKED OPERATIONS VIEW</span><h1>Good morning, {user?.name || "Administrator"}</h1><p>Monitor your network, customer and business signals from connected source data.</p></div><div className="hero-actions"><button className="action-chip" onClick={() => handleNav("Reports")}><BarChart3 size={14} /> Generate report</button><button className="primary-action" onClick={() => handleNav("AI Assistant")}><Sparkles size={14} /> Ask AI</button></div></section><section className="command-metrics">{metrics.map(metric => <MetricCard key={metric.label} metric={metric} />)}</section>{!sourceReady && <div className="source-unavailable-banner"><Database size={16} /><div><b>No operational source data connected</b><span>The command center is intentionally empty until an authorized administrator imports or connects source datasets.</span></div><button onClick={() => handleNav("Data Management")}>Open Data Management <ArrowUpRight size={14} /></button></div>}<section className="command-grid"><div className="panel command-chart-panel"><div className="panel-head"><div><span className="section-kicker">NETWORK PERFORMANCE</span><h2>Source-backed network view</h2></div><span className="status-badge">{sourceReady ? "Connected data" : "Awaiting data"}</span></div>{summary ? <div className="summary-readout"><strong>{formatMetric(summary.networkHealth, "%")}</strong><span>network health from persisted KPIs</span></div> : <div className="empty-chart"><Activity size={22} /><b>No KPI trend to display</b><span>Import Network KPI records to calculate the trend.</span></div>}<div className="chart-placeholder"><span /><span /><span /><span /><span /><span /></div></div><div className="panel command-pulse-panel"><div className="panel-head"><div><span className="section-kicker">SYSTEM PULSE</span><h2>Operational health</h2></div><Gauge size={18} /></div><div className="pulse-score"><strong>{summary ? formatMetric(summary.networkHealth) : "—"}</strong><span>{summary ? "source-backed score" : "No source data"}</span></div><div className="pulse-note">{summary ? "Calculated from persisted operational records." : "Connect a source to activate system health calculations."}</div></div></section><section className="command-lower-grid"><div className="panel command-map-panel"><div className="panel-head"><div><span className="section-kicker">GEOSPATIAL INTELLIGENCE</span><h2>Source-backed site map</h2></div><button className="text-btn" onClick={() => handleNav("Intelligence Map")}>Open map <ArrowUpRight size={14} /></button></div><CommandMap sites={sites} /></div><div className="panel command-priority-panel"><div className="panel-head"><div><span className="section-kicker">DECISION QUEUE</span><h2>Top priorities</h2></div><button className="text-btn" onClick={() => handleNav("Priorities")}>View all <ArrowUpRight size={14} /></button></div>{priorities.length ? <div className="priority-list">{priorities.map((item, index) => <button key={item.id} onClick={() => handleNav("Priorities")}><span>{index + 1}</span><div><b>{item.issue}</b><small>{item.region} · Score {item.impactScore}</small></div><ArrowUpRight size={14} /></button>)}</div> : <div className="module-state"><Zap size={18} /><b>No source-backed priorities</b><span>Priorities will appear after network, customer, complaint, revenue, or sales data is imported.</span></div>}</div></section><footer className="command-footer"><span><ShieldCheck size={13} /> All displayed metrics are source-backed or explicitly marked unavailable.</span><button onClick={() => handleNav("Data Management")}>Manage source data <ArrowUpRight size={13} /></button></footer></main></div>;
}
