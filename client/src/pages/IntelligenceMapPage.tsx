import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Gauge,
  Layers3,
  Loader2,
  MapPin,
  MessageSquareWarning,
  Network,
  RadioTower,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";

interface MapSite {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: "healthy" | "warning" | "critical";
  availability: number;
  traffic: number;
  congestion: number;
  cells4g: number;
  cells5g: number;
  customers: number;
  complaints: number;
  churn: number;
  fiber: number;
  salesOpportunities: number;
  revenueRisk: number;
  throughput: number;
}

type LayerKey =
  | "sites"
  | "fourG"
  | "fiveG"
  | "fiber"
  | "complaints"
  | "churn"
  | "customers"
  | "revenueRisk"
  | "sales";

type StatusFilter = "all" | "healthy" | "warning" | "critical";

const layerDefinitions: Array<{ key: LayerKey; label: string; color: string; icon: typeof RadioTower }> = [
  { key: "sites", label: "Sites", color: "#63e6d3", icon: MapPin },
  { key: "fourG", label: "4G coverage", color: "#38bdf8", icon: RadioTower },
  { key: "fiveG", label: "5G coverage", color: "#a78bfa", icon: Zap },
  { key: "fiber", label: "Fiber", color: "#facc15", icon: Wifi },
  { key: "complaints", label: "Complaints", color: "#fb7185", icon: MessageSquareWarning },
  { key: "churn", label: "Churn risk", color: "#fb923c", icon: AlertTriangle },
  { key: "customers", label: "Customers", color: "#22d3ee", icon: Users },
  { key: "revenueRisk", label: "Revenue risk", color: "#f43f5e", icon: CircleDollarSign },
  { key: "sales", label: "Sales opportunities", color: "#34d399", icon: Target },
];

const statusColors: Record<MapSite["status"], string> = {
  healthy: "#4ade80",
  warning: "#fbbf24",
  critical: "#fb7185",
};

function formatMoney(value: number) {
  return value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(2)}M` : `$${Math.round(value / 1000)}K`;
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

function IntelligenceMapPage() {
  const [, navigate] = useLocation();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapRetry, setMapRetry] = useState(0);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showLayers, setShowLayers] = useState(true);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    sites: true,
    fourG: false,
    fiveG: false,
    fiber: false,
    complaints: true,
    churn: false,
    customers: false,
    revenueRisk: true,
    sales: false,
  });
  const permissionsQuery = trpc.auth.permissions.useQuery();
  const sitesQuery = trpc.map.sites.useQuery(undefined, { enabled: Boolean(permissionsQuery.data) });
  const selectedDetailsQuery = trpc.map.siteDetails.useQuery(
    { siteId: selectedSiteId || "" },
    { enabled: Boolean(selectedSiteId) },
  );
  const aiHistoryQuery = trpc.ai.history.useQuery({ domain: "network" }, { enabled: Boolean(permissionsQuery.data) });
  const utils = trpc.useUtils();
  const askAi = trpc.ai.ask.useMutation({
    onSuccess: result => {
      setAiAnswer(result.answer);
      void aiHistoryQuery.refetch();
    },
  });

  const sites = (sitesQuery.data || []) as MapSite[];
  const selectedSite = (selectedDetailsQuery.data || sites.find(site => site.id === selectedSiteId) || null) as MapSite | null;
  const filteredSites = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sites.filter(site =>
      (statusFilter === "all" || site.status === statusFilter) &&
      (!term || `${site.id} ${site.name}`.toLowerCase().includes(term)),
    );
  }, [search, sites, statusFilter]);
  const fallbackPosition = (site: MapSite) => ({
    left: `${Math.max(7, Math.min(93, ((site.lng - 34.75) / 2.1) * 100))}%`,
    top: `${Math.max(10, Math.min(90, ((33.2 - site.lat) / 4.2) * 100))}%`,
  });

  const selectSite = (site: MapSite) => {
    setSelectedSiteId(site.id);
    if (mapRef.current) {
      mapRef.current.panTo({ lat: site.lat, lng: site.lng });
      mapRef.current.setZoom(11);
    }
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !sites.length) return;
    const markers: google.maps.Marker[] = [];
    const circles: google.maps.Circle[] = [];
    sites.forEach(site => {
      const marker = new google.maps.Marker({
        map: layers.sites ? map : null,
        position: { lat: site.lat, lng: site.lng },
        title: `${site.id} · ${site.name}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: selectedSiteId === site.id ? 11 : 8,
          fillColor: statusColors[site.status],
          fillOpacity: 1,
          strokeColor: "#071822",
          strokeWeight: 3,
        },
      });
      marker.addListener("click", () => selectSite(site));
      markers.push(marker);
      const overlays: Array<[LayerKey, number, string, number]> = [
        ["fourG", 900, "#38bdf8", 0.13],
        ["fiveG", 450, "#a78bfa", 0.16],
        ["fiber", 300, "#facc15", 0.15],
        ["complaints", Math.max(260, site.complaints * 4), "#fb7185", 0.2],
        ["churn", Math.max(220, site.churn * 120), "#fb923c", 0.18],
        ["customers", Math.max(300, Math.sqrt(site.customers) * 14), "#22d3ee", 0.12],
        ["revenueRisk", Math.max(280, site.revenueRisk / 650), "#f43f5e", 0.2],
        ["sales", Math.max(220, site.salesOpportunities * 42), "#34d399", 0.16],
      ];
      overlays.forEach(([key, radius, color, opacity]) => {
        circles.push(new google.maps.Circle({
          map: layers[key] ? map : null,
          center: { lat: site.lat, lng: site.lng },
          radius,
          fillColor: color,
          fillOpacity: opacity,
          strokeColor: color,
          strokeOpacity: 0.65,
          strokeWeight: 1,
          clickable: false,
        }));
      });
    });
    return () => {
      markers.forEach(marker => marker.setMap(null));
      circles.forEach(circle => circle.setMap(null));
    };
  }, [layers, mapReady, selectedSiteId, sites]);

  if (!permissionsQuery.data) return <div className="auth-loading">Loading protected map…</div>;
  if (!permissionsQuery.data.grants.includes("map.view")) {
    return <main className="module-access-denied"><ShieldCheck size={28} /><h1>Access restricted</h1><p>Your role does not have permission to view the Intelligence Map.</p><button onClick={() => navigate("/")}>Return to command center</button></main>;
  }

  return (
    <main className="standalone-module intelligence-map-page">
      <header className="standalone-top">
        <button onClick={() => navigate("/")}>← Command Center</button>
        <span className="section-kicker">GEOSPATIAL OPERATIONS</span>
        <span className="module-role"><ShieldCheck size={14} /> Role-scoped view</span>
      </header>
      <section className="standalone-hero map-page-hero">
        <div><span className="section-kicker">INTELLIGENCE MAP</span><h1>Network intelligence, by location</h1><p>Explore coverage, customer exposure, complaints, churn, fiber, sales and revenue risk from one operational map.</p></div>
        <div className="standalone-icon"><Layers3 size={28} /></div>
      </section>
      <section className="map-command-bar">
        <div><strong>{sites.length}</strong><span>mapped sites</span></div>
        <div><strong>{sites.filter(site => site.status === "critical").length}</strong><span>critical sites</span></div>
        <div><strong>{formatMoney(sites.reduce((total, site) => total + site.revenueRisk, 0))}</strong><span>revenue risk visible</span></div>
        <div className="map-command-status"><span className="pulse" /> Live operational data</div>
      </section>
      <section className="intelligence-map-workspace">
        <aside className="map-control-panel">
          <div className="map-control-head"><div><span className="section-kicker">MAP CONTROL</span><h2>Operational layers</h2></div><button className="icon-btn" onClick={() => setShowLayers(value => !value)} aria-label="Toggle layer controls"><Layers3 size={16} /></button></div>
          <label className="map-search"><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search site ID or name" /></label>
          <div className="map-filter-row">{(["all", "healthy", "warning", "critical"] as StatusFilter[]).map(status => <button key={status} className={statusFilter === status ? "selected" : ""} onClick={() => setStatusFilter(status)}>{status === "all" ? "All" : status}</button>)}</div>
          {showLayers && <div className="map-layer-list"><div className="map-layer-list-head"><span>Visible overlays</span><small>{Object.values(layers).filter(Boolean).length}/9 active</small></div>{layerDefinitions.map(layer => { const Icon = layer.icon; return <label className="map-layer-toggle" key={layer.key}><input type="checkbox" checked={layers[layer.key]} onChange={event => setLayers(previous => ({ ...previous, [layer.key]: event.target.checked }))} /><span className="layer-swatch" style={{ background: layer.color, boxShadow: `0 0 10px ${layer.color}` }} /><Icon size={14} /><span>{layer.label}</span></label>; })}</div>}
          <div className="map-site-list"><div className="map-layer-list-head"><span>Sites in view</span><small>{filteredSites.length} shown</small></div>{sitesQuery.isLoading ? <div className="module-state compact"><Loader2 size={15} className="spin" /> Loading sites…</div> : sitesQuery.error ? <div className="module-feedback error">Map data is unavailable. Refresh and try again.</div> : filteredSites.map(site => <button key={site.id} className={`map-site-list-item ${selectedSiteId === site.id ? "selected" : ""}`} onClick={() => selectSite(site)}><span className="map-site-dot" style={{ background: statusColors[site.status] }} /><span><b>{site.id}</b><small>{site.name}</small></span><em>{site.status}</em></button>)}</div>
        </aside>
        <section className="map-visual-panel">
          <div className="map-visual-head"><div><span className="section-kicker">LIVE GIS CANVAS</span><h2>Jordan network footprint</h2></div><div className="map-mode-readout"><RadioTower size={14} /> {layers.sites ? "Site markers" : "Overlay view"}</div></div>
          <div className="map-canvas-shell"><MapView key={mapRetry} className="intelligence-map-canvas" initialCenter={{ lat: 31.95, lng: 35.91 }} initialZoom={8} onMapReady={map => { mapRef.current = map; setMapError(null); setMapReady(true); }} onMapError={error => { setMapReady(false); setMapError(error.message); }} />{mapError && <div className="gis-fallback-map"><div className="gis-fallback-grid" />{filteredSites.map(site => <button key={site.id} className={`gis-fallback-marker ${selectedSiteId === site.id ? "selected" : ""}`} style={fallbackPosition(site)} onClick={() => selectSite(site)}><span style={{ background: statusColors[site.status] }} /><small>{site.id}</small></button>)}<div className="gis-fallback-label"><AlertTriangle size={14} /><span>Google Maps unavailable · operational coordinate view</span></div></div>}{selectedSite && <div className="map-selected-pill"><MapPin size={13} /> {selectedSite.id} · {selectedSite.name}<button onClick={() => setSelectedSiteId(null)} aria-label="Clear selected site"><X size={13} /></button></div>}{!mapReady && <div className={`map-loading ${mapError ? "map-loading-error" : ""}`}>{mapError ? <><AlertTriangle size={20} /><b>GIS canvas unavailable</b><span>{mapError}</span><button onClick={() => { setMapError(null); setMapReady(false); setMapRetry(value => value + 1); }}>Retry map connection</button></> : <><Loader2 size={18} className="spin" /> Initializing secure GIS canvas…</>}</div>}</div>
          <div className="map-legend">{layerDefinitions.filter(layer => layers[layer.key]).slice(0, 6).map(layer => <span key={layer.key}><i style={{ background: layer.color }} />{layer.label}</span>)}</div>
        </section>
        <aside className="site-intelligence-panel">
          {selectedSite ? <><div className="site-intelligence-head"><div><span className="section-kicker">SELECTED SITE</span><h2>{selectedSite.id}</h2><p><MapPin size={13} /> {selectedSite.name}</p></div><span className={`site-health-chip ${selectedSite.status}`}><span />{selectedSite.status}</span></div><div className="site-kpi-grid"><span><small>Availability</small><b>{selectedSite.availability}%</b></span><span><small>Throughput</small><b>{selectedSite.throughput} Mbps</b></span><span><small>Traffic</small><b>{selectedSite.traffic} TB</b></span><span><small>Congestion</small><b className={selectedSite.congestion > 85 ? "warning-text" : ""}>{selectedSite.congestion}% PRB</b></span></div><div className="site-intelligence-section"><h3><Network size={14} /> Network KPIs</h3><div className="site-detail-lines"><span>4G cells <b>{selectedSite.cells4g}</b></span><span>5G cells <b>{selectedSite.cells5g}</b></span><span>Fiber availability <b>{selectedSite.fiber}%</b></span></div></div><div className="site-intelligence-section"><h3><Users size={14} /> Customer impact</h3><div className="site-detail-lines"><span>Customers <b>{formatNumber(selectedSite.customers)}</b></span><span>Complaints <b className={selectedSite.complaints > 100 ? "warning-text" : ""}>{formatNumber(selectedSite.complaints)}</b></span><span>Churn risk <b>{selectedSite.churn}%</b></span></div></div><div className="site-intelligence-section"><h3><CircleDollarSign size={14} /> Commercial impact</h3><div className="site-detail-lines"><span>Revenue at risk <b className="warning-text">{formatMoney(selectedSite.revenueRisk)}</b></span><span>Sales opportunities <b className="positive">{selectedSite.salesOpportunities}</b></span></div></div><div className="site-ai-context"><div><Bot size={15} /><span>AI context attached</span></div><small>Ask AI about this site and the current operational signals.</small><form onSubmit={event => { event.preventDefault(); if (aiQuestion.trim()) askAi.mutate({ question: aiQuestion, domain: "network", siteId: selectedSite.id }); }}><input value={aiQuestion} onChange={event => setAiQuestion(event.target.value)} placeholder={`Ask about ${selectedSite.id}…`} /><button type="submit" disabled={askAi.isPending || !aiQuestion.trim()}>{askAi.isPending ? <Loader2 size={14} className="spin" /> : <ArrowUpRight size={14} />}</button></form>{aiAnswer && <p className="site-ai-answer">{aiAnswer}</p>}</div></> : <div className="site-empty-state"><MapPin size={24} /><h2>Select a site</h2><p>Click a marker or site ID to inspect network, customer, commercial and AI context.</p><div className="site-empty-prompt"><Sparkles size={14} /> Site-aware AI activates after selection.</div></div>}
        </aside>
      </section>
      {aiHistoryQuery.data?.length ? <section className="map-ai-history"><div><span className="section-kicker">DECISION TRAIL</span><h2>Recent site-aware questions</h2></div><div>{aiHistoryQuery.data.slice(0, 3).map(item => <span key={item.id}><Clock3 size={12} />{item.question.slice(0, 100)}</span>)}</div></section> : null}
    </main>
  );
}

export default IntelligenceMapPage;
