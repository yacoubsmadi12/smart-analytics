import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Building2,
  ChevronDown,
  CircleHelp,
  Database,
  Download,
  Gauge,
  Globe2,
  Layers3,
  LogOut,
  MapPin,
  Menu,
  MessageSquareWarning,
  Network,
  PanelLeftClose,
  Search,
  Settings2,
  ShieldCheck,
  Signal,
  Sparkles,
  Target,
  Users,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";

type SourceRow = {
  id: string;
  name: string;
  type: string;
  status: string;
  lastSync: string;
  records: number;
};
type IntegrationRow = {
  id: string;
  provider: string;
  scope: string;
  status: string;
  lastChecked: string;
};
type MapLayers = {
  sites: boolean;
  coverage: boolean;
  complaints: boolean;
  fiber: boolean;
  revenue: boolean;
};

const moduleSlugs: Record<string, string> = {
  "Executive Overview": "executive-overview",
  "Intelligence Map": "intelligence-map",
  Network: "network",
  "Customer Experience": "customer-experience",
  Customers: "customers",
  Complaints: "complaints",
  "Infrastructure / Fiber": "infrastructure-fiber",
  Sales: "sales",
  Marketing: "marketing",
  "Business & Revenue": "business-revenue",
  Priorities: "priorities",
  "AI Assistant": "ai-assistant",
  Alerts: "alerts",
  Reports: "reports",
  "Data Management": "data-management",
  "User Management": "user-management",
  "System Settings": "system-settings",
  "Audit Logs": "audit-logs",
};
const moduleBySlug = Object.fromEntries(
  Object.entries(moduleSlugs).map(([name, slug]) => [slug, name])
);
const nav = [
  ["Executive Overview", Gauge],
  ["Intelligence Map", Globe2],
  ["Network", Signal],
  ["Customer Experience", Users],
  ["Customers", Users],
  ["Complaints", MessageSquareWarning],
  ["Infrastructure / Fiber", Wifi],
  ["Sales", Target],
  ["Marketing", Sparkles],
  ["Business & Revenue", Building2],
  ["Priorities", Zap],
  ["AI Assistant", Bot],
  ["Alerts", AlertTriangle],
  ["Reports", Download],
  ["Data Management", Database],
  ["User Management", ShieldCheck],
  ["System Settings", Settings2],
  ["Audit Logs", Activity],
] as const;
const kpis = [
  {
    label: "Network Health",
    value: "94.8%",
    delta: "+2.4%",
    tone: "good",
    icon: Signal,
  },
  {
    label: "Total Sites",
    value: "1,284",
    delta: "+18",
    tone: "good",
    icon: Network,
  },
  {
    label: "Active Customers",
    value: "2.84M",
    delta: "+4.8%",
    tone: "good",
    icon: Users,
  },
  {
    label: "Open Complaints",
    value: "1,842",
    delta: "-12.6%",
    tone: "good",
    icon: MessageSquareWarning,
  },
  {
    label: "CX Risk",
    value: "18.4%",
    delta: "+1.1%",
    tone: "warn",
    icon: AlertTriangle,
  },
  {
    label: "Revenue at Risk",
    value: "$1.28M",
    delta: "-$184K",
    tone: "bad",
    icon: Building2,
  },
];
const priorities = [
  {
    area: "Amman West",
    issue: "4G congestion at 3 cells",
    impact: "8,420 customers",
    revenue: "$286K",
    score: 94,
    action: "Capacity upgrade",
  },
  {
    area: "Irbid Central",
    issue: "Fiber outage correlation",
    impact: "2,180 customers",
    revenue: "$119K",
    score: 88,
    action: "Dispatch fiber crew",
  },
  {
    area: "Zarqa North",
    issue: "Complaint surge · Internet slow",
    impact: "5,740 customers",
    revenue: "$84K",
    score: 82,
    action: "Tune radio parameters",
  },
  {
    area: "Aqaba Coast",
    issue: "Enterprise churn risk",
    impact: "34 accounts",
    revenue: "$192K",
    score: 76,
    action: "Assign retention squad",
  },
  {
    area: "Salt Heights",
    issue: "Backhaul utilization > 90%",
    impact: "3,100 customers",
    revenue: "$63K",
    score: 71,
    action: "Activate microwave link",
  },
];
const fixes = [
  [
    "Upgrade capacity",
    "Amman West · 3 congested cells",
    "High",
    "+$286K protected",
  ],
  [
    "Repair fiber segment",
    "Irbid Central · node FN-204",
    "High",
    "2,180 customers",
  ],
  [
    "Tune 4G parameters",
    "Zarqa North · complaint hotspot",
    "Medium",
    "-18% complaints",
  ],
  [
    "Retention outreach",
    "Aqaba Coast · 34 enterprise accounts",
    "High",
    "$192K protected",
  ],
  [
    "Shift backhaul traffic",
    "Salt Heights · 92% utilization",
    "Medium",
    "+11% headroom",
  ],
];

function MiniChart() {
  return (
    <div className="mini-chart" aria-label="Network health trend">
      <svg viewBox="0 0 520 120" preserveAspectRatio="none">
        <defs>
          <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#18c7d8" stopOpacity=".28" />
            <stop offset="1" stopColor="#18c7d8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 92 C28 90 38 68 60 74 S95 100 115 76 S150 56 174 66 S205 82 230 54 S260 70 287 42 S319 64 342 45 S372 28 398 42 S428 58 450 26 S480 38 520 16 L520 120 L0 120Z"
          fill="url(#fill)"
        />
        <path
          d="M0 92 C28 90 38 68 60 74 S95 100 115 76 S150 56 174 66 S205 82 230 54 S260 70 287 42 S319 64 342 45 S372 28 398 42 S428 58 450 26 S480 38 520 16"
          fill="none"
          stroke="#18c7d8"
          strokeWidth="3"
        />
      </svg>
      <div className="chart-labels">
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>Now</span>
      </div>
    </div>
  );
}

function DataIntakePanel() {
  const [method, setMethod] = useState<"manual" | "api" | "sftp" | "database">(
    "manual"
  );
  const [sourceName, setSourceName] = useState("");
  const [connectionRef, setConnectionRef] = useState("");
  const [notice, setNotice] = useState("");
  const { data: importRuns, isLoading: importRunsLoading } =
    trpc.data.importRuns.useQuery();
  const register = trpc.data.registerSource.useMutation({
    onSuccess: () =>
      setNotice(
        "Source configuration saved. Add credentials through server secrets before connecting."
      ),
    onError: e => setNotice(e.message),
  });
  const importFile = trpc.data.manualImport.useMutation({
    onSuccess: result =>
      setNotice(
        `Received ${result.fileName}: ${result.rowCount} rows, ${result.validRows} valid, ${result.invalidRows} invalid.`
      ),
    onError: e => setNotice(e.message),
  });
  const onFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !sourceName.trim()) {
      setNotice("Enter a source name before selecting a file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      importFile.mutate({
        sourceName: sourceName.trim(),
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        base64: value.split(",").pop() || "",
      });
    };
    reader.readAsDataURL(file);
  };
  return (
    <div className="data-intake">
      <div className="module-subhead">
        <b>Connect a real source</b>
        <span>Credentials stay server-side</span>
      </div>
      <div className="intake-grid">
        <label>
          <span>Source name</span>
          <input
            value={sourceName}
            onChange={e => setSourceName(e.target.value)}
            placeholder="Network OSS / CRM / Fiber"
          />
        </label>
        <label>
          <span>Method</span>
          <select
            value={method}
            onChange={e => setMethod(e.target.value as typeof method)}
          >
            <option value="manual">Manual upload</option>
            <option value="api">API endpoint</option>
            <option value="sftp">SFTP server</option>
            <option value="database">Database</option>
          </select>
        </label>
      </div>
      <label className="intake-wide">
        <span>
          {method === "manual"
            ? "Endpoint or server path (optional)"
            : method === "sftp"
              ? "SFTP host and remote path"
              : method === "api"
                ? "API base URL"
                : "Database connection reference"}
        </span>
        <input
          value={connectionRef}
          onChange={e => setConnectionRef(e.target.value)}
          placeholder={
            method === "sftp"
              ? "sftp://host/path"
              : method === "api"
                ? "https://example.internal/api"
                : "Optional reference; never enter a password here"
          }
        />
      </label>
      <div className="intake-actions">
        {method === "manual" && (
          <label className="upload-btn">
            <input
              type="file"
              accept=".csv,.json,.xlsx,.xls"
              onChange={onFile}
            />
            Choose CSV, JSON or spreadsheet
          </label>
        )}
        <button
          className="action-chip"
          disabled={!sourceName.trim() || register.isPending}
          onClick={() =>
            register.mutate({
              name: sourceName.trim(),
              type: method,
              connectionRef: connectionRef.trim() || undefined,
            })
          }
        >
          {register.isPending ? "Saving..." : "Save source configuration"}
        </button>
      </div>
      <small className="intake-help">
        API and SFTP credentials are not collected in the browser. Configure
        them as server secrets, then use this reference to connect and validate
        the source.
      </small>
      {notice && <div className="module-feedback">{notice}</div>}
      <div className="import-history">
        <div className="module-subhead">
          <b>Import history</b>
          <span>
            {importRunsLoading
              ? "Loading..."
              : `${importRuns?.length || 0} runs`}
          </span>
        </div>
        {!importRunsLoading && !importRuns?.length && (
          <div className="module-state">No imports received yet.</div>
        )}
        {importRuns?.slice(0, 6).map(run => (
          <div className="import-run" key={run.id}>
            <span>
              <b>{run.fileName || run.method}</b>
              <small>{new Date(run.createdAt).toLocaleString()}</small>
            </span>
            <span>{run.rowCount} rows</span>
            <span className={run.invalidRows ? "warning-text" : "positive"}>
              {run.validRows} valid · {run.invalidRows} invalid
            </span>
            <span>{run.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntelligenceMap({
  onSite,
  layers,
  exploreOpen,
}: {
  onSite: () => void;
  layers: MapLayers;
  exploreOpen: boolean;
}) {
  const [filter, setFilter] = useState<"all" | "healthy" | "warn" | "critical">(
    "all"
  );
  const [mode, setMode] = useState<"markers" | "heatmap" | "clusters">(
    "markers"
  );
  const [search, setSearch] = useState("");
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const heatRef = useRef<google.maps.Circle[]>([]);
  const revenueRef = useRef<google.maps.Circle[]>([]);
  const clusterRef = useRef<google.maps.Marker[]>([]);
  const points = [
    {
      x: 22,
      y: 32,
      s: "healthy",
      name: "Amman West",
      lat: 31.9539,
      lng: 35.9106,
    },
    {
      x: 34,
      y: 47,
      s: "warn",
      name: "Irbid Central",
      lat: 32.5556,
      lng: 35.8497,
    },
    {
      x: 46,
      y: 27,
      s: "healthy",
      name: "Zarqa North",
      lat: 32.0728,
      lng: 36.088,
    },
    {
      x: 54,
      y: 60,
      s: "critical",
      name: "Aqaba Coast",
      lat: 29.5321,
      lng: 35.0063,
    },
    {
      x: 63,
      y: 39,
      s: "healthy",
      name: "Salt Heights",
      lat: 32.0392,
      lng: 35.7272,
    },
    { x: 71, y: 52, s: "warn", name: "Madaba", lat: 31.7167, lng: 35.7933 },
    { x: 80, y: 30, s: "healthy", name: "Jerash", lat: 32.2746, lng: 35.8961 },
    { x: 88, y: 68, s: "critical", name: "Ma'an", lat: 30.1927, lng: 35.736 },
    { x: 41, y: 73, s: "healthy", name: "Karak", lat: 31.1854, lng: 35.7048 },
  ];
  const visible = useMemo(
    () =>
      points.filter(
        p =>
          (filter === "all" || p.s === filter) &&
          (!search.trim() ||
            p.name.toLowerCase().includes(search.toLowerCase()))
      ),
    [filter, search]
  );
  const isVisible = (point: (typeof points)[number]) =>
    visible.some(item => item.name === point.name);
  const syncMap = () => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker, index) =>
      marker.setMap(
        layers.sites && mode === "markers" && isVisible(points[index])
          ? map
          : null
      )
    );
    heatRef.current.forEach(circle =>
      circle.setMap(layers.complaints && mode === "heatmap" ? map : null)
    );
    revenueRef.current.forEach(circle =>
      circle.setMap(layers.revenue ? map : null)
    );
    clusterRef.current.forEach(marker =>
      marker.setMap(layers.sites && mode === "clusters" ? map : null)
    );
    const match = points.find(
      point => point.name.toLowerCase() === search.trim().toLowerCase()
    );
    if (match && search.trim()) map.panTo({ lat: match.lat, lng: match.lng });
  };
  useEffect(() => {
    syncMap();
  }, [layers, mode, filter, search]);
  return (
    <div className="map-canvas">
      <MapView
        className="real-map"
        initialCenter={{ lat: 31.95, lng: 35.91 }}
        initialZoom={8}
        onMapReady={map => {
          mapRef.current = map;
          markersRef.current = points.map(
            point =>
              new google.maps.Marker({
                map: null,
                position: { lat: point.lat, lng: point.lng },
                title: point.name,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 7,
                  fillColor:
                    point.s === "critical"
                      ? "#f36d76"
                      : point.s === "warn"
                        ? "#f4b84a"
                        : "#4fe0a0",
                  fillOpacity: 1,
                  strokeColor: "#081119",
                  strokeWeight: 2,
                },
              })
          );
          markersRef.current.forEach(marker =>
            marker.addListener("click", onSite)
          );
          heatRef.current = points
            .filter(point => point.s !== "healthy")
            .map(
              point =>
                new google.maps.Circle({
                  map: null,
                  center: { lat: point.lat, lng: point.lng },
                  radius: 4200,
                  fillColor: point.s === "critical" ? "#f36d76" : "#f4b84a",
                  fillOpacity: 0.24,
                  strokeColor: point.s === "critical" ? "#f36d76" : "#f4b84a",
                  strokeOpacity: 0.18,
                  strokeWeight: 1,
                })
            );
          revenueRef.current = points
            .filter((_, index) => index % 3 === 0)
            .map(
              point =>
                new google.maps.Circle({
                  map: null,
                  center: { lat: point.lat, lng: point.lng },
                  radius: 2800,
                  fillColor: "#a178ff",
                  fillOpacity: 0.14,
                  strokeColor: "#a178ff",
                  strokeOpacity: 0.42,
                  strokeWeight: 2,
                })
            );
          clusterRef.current = [
            { lat: 31.9539, lng: 35.9106, label: "4" },
            { lat: 32.0728, lng: 36.088, label: "3" },
            { lat: 29.5321, lng: 35.0063, label: "2" },
          ].map(
            cluster =>
              new google.maps.Marker({
                map: null,
                position: cluster,
                label: {
                  text: cluster.label,
                  color: "#081119",
                  fontWeight: "700",
                },
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 18,
                  fillColor: "#58d8df",
                  fillOpacity: 1,
                  strokeColor: "#0c202b",
                  strokeWeight: 3,
                },
              })
          );
          clusterRef.current.forEach(marker =>
            marker.addListener("click", onSite)
          );
          syncMap();
        }}
      />
      <div className="map-overlay">
        <div className="map-grid" />
        {layers.coverage && <div className="map-river" />}
        {layers.fiber && (
          <>
            <div className="map-road road-a" />
            <div className="map-road road-b" />
            <div className="map-road road-c" />
          </>
        )}
        <div className="map-city city-a">Amman West</div>
        <div className="map-city city-b">Irbid Central</div>
        <div className="map-city city-c">Zarqa North</div>
        {exploreOpen && (
          <div className="map-explore">
            <Search size={13} />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search sites or cells"
            />
            <button onClick={() => setSearch("")}>
              <X size={13} />
            </button>
          </div>
        )}
        <div className="map-filter">
          <button
            className={filter === "all" ? "on" : ""}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={filter === "critical" ? "on" : ""}
            onClick={() => setFilter("critical")}
          >
            Critical
          </button>
          <button
            className={filter === "warn" ? "on" : ""}
            onClick={() => setFilter("warn")}
          >
            Warning
          </button>
          <button
            className={mode === "heatmap" ? "on" : ""}
            onClick={() => setMode(mode === "heatmap" ? "markers" : "heatmap")}
          >
            Heatmap
          </button>
          <button
            className={mode === "clusters" ? "on" : ""}
            onClick={() =>
              setMode(mode === "clusters" ? "markers" : "clusters")
            }
          >
            Cluster {visible.length}
          </button>
        </div>
        <div className="map-controls">
          <button
            onClick={() =>
              mapRef.current?.setZoom((mapRef.current.getZoom() || 8) + 1)
            }
          >
            +
          </button>
          <button
            onClick={() =>
              mapRef.current?.setZoom(
                Math.max(3, (mapRef.current.getZoom() || 8) - 1)
              )
            }
          >
            −
          </button>
          <button
            onClick={() =>
              mapRef.current?.setCenter({ lat: 31.95, lng: 35.91 })
            }
          >
            <Layers3 size={15} />
          </button>
        </div>
        <div className="map-legend">
          <span>
            <i className="dot healthy" />
            Healthy
          </span>
          <span>
            <i className="dot warn" />
            Warning
          </span>
          <span>
            <i className="dot critical" />
            Critical
          </span>
        </div>
      </div>
    </div>
  );
}

function ModuleView({
  active,
  sources,
  integrations,
  sourceLoading,
  sourceError,
  integrationsLoading,
  integrationsError,
  onValidate,
  validationState,
  adminLoading,
  adminError,
  adminAvailable,
}: {
  active: string;
  sources?: SourceRow[];
  integrations?: IntegrationRow[];
  sourceLoading: boolean;
  sourceError?: string;
  integrationsLoading: boolean;
  integrationsError?: string;
  onValidate: (id: string) => void;
  validationState: { id?: string; message?: string; error?: boolean };
  adminLoading: boolean;
  adminError?: string;
  adminAvailable: boolean;
}) {
  const isData = active === "Data Management";
  const isUsers = active === "User Management";
  const isAudit = active === "Audit Logs";
  const isSettings = active === "System Settings";
  const isCorrelation =
    active === "Complaints" ||
    active === "Customer Experience" ||
    active === "Priorities";
  const shell = (content: React.ReactNode) => (
    <section className="panel module-panel">
      <div className="module-head">
        <div>
          <span className="section-kicker">
            {isData
              ? "DATA CONTROL PLANE"
              : isUsers
                ? "IDENTITY & ACCESS"
                : isAudit
                  ? "GOVERNANCE"
                  : isSettings
                    ? "PLATFORM CONFIGURATION"
                    : "OPERATIONS MODULE"}
          </span>
          <h2>{active}</h2>
          <p>
            Live operational view with role-scoped data and decision context.
          </p>
        </div>
        <Badge variant="outline">Live</Badge>
      </div>
      {content}
    </section>
  );
  if ((isUsers || isAudit || isSettings) && adminLoading)
    return shell(
      <div className="module-state">
        {"Loading protected administration view…"}
      </div>
    );
  if ((isUsers || isAudit || isSettings) && adminError)
    return shell(<div className="module-state error">{adminError}</div>);
  if ((isUsers || isAudit || isSettings) && !adminAvailable)
    return shell(
      <div className="module-state error">
        {"This administration view is restricted to authorized administrators."}
      </div>
    );
  const rows =
    active === "Network"
      ? [
          ["Availability", "98.6%", "+1.8%", "On target"],
          ["4G PRB utilization", "76.4%", "-3.2%", "Improving"],
          ["Dropped sessions", "0.42%", "-0.08%", "Healthy"],
          ["Backhaul headroom", "18.2%", "+4.5%", "Watch"],
        ]
      : active === "Complaints" || active === "Customer Experience"
        ? [
            ["Open complaints", "1,842", "-12.6%", "Improving"],
            ["Network-related", "68%", "-4.1%", "Correlated"],
            ["First response", "18 min", "-6 min", "On target"],
            ["Escalations", "74", "+8", "Watch"],
          ]
        : active === "Sales" ||
            active === "Marketing" ||
            active === "Business & Revenue"
          ? [
              ["Pipeline value", "$4.82M", "+12.4%", "Growing"],
              ["Qualified opportunities", "184", "+21", "Healthy"],
              ["Revenue at risk", "$1.28M", "-$184K", "Recovering"],
              ["Campaign conversion", "8.4%", "+1.6%", "Above target"],
            ]
          : active === "Infrastructure / Fiber"
            ? [
                ["Fiber nodes", "482", "+9", "Online"],
                ["Coverage ready", "76.8%", "+3.4%", "Expanding"],
                ["Open work orders", "23", "-7", "Improving"],
                ["Mean repair time", "3.8h", "-0.6h", "On target"],
              ]
            : [
                ["Priority score", "94 / 100", "+6", "Critical"],
                ["Customer impact", "8,420", "-12%", "High"],
                ["Revenue protected", "$286K", "+$42K", "Actionable"],
                ["Next review", "Today 14:00", "—", "Scheduled"],
              ];
  if (isData) {
    return shell(
      <div>
        <div className="module-subhead">
          <b>{"Data sources"}</b>
          <span>
            {sourceLoading
              ? "Loading…"
              : sourceError
                ? "Restricted or unavailable"
                : `${sources?.length || 0} connected`}
          </span>
        </div>
        {sourceLoading && (
          <div className="module-state">{"Loading protected sources…"}</div>
        )}
        {sourceError && <div className="module-state error">{sourceError}</div>}
        {!sourceLoading &&
          !sourceError &&
          (!sources?.length ? (
            <div className="module-state">{"No data sources connected."}</div>
          ) : (
            <div className="module-table">
              {sources.map(source => (
                <div className="module-row" key={source.id}>
                  <div>
                    <b>{source.name}</b>
                    <small>
                      {source.type} · {source.records.toLocaleString()} records
                    </small>
                  </div>
                  <span
                    className={
                      source.status === "warning" ? "warning-text" : "positive"
                    }
                  >
                    {source.status}
                  </span>
                  <small>{source.lastSync}</small>
                  <button
                    className="action-chip"
                    onClick={() => onValidate(source.id)}
                    disabled={validationState.id === source.id}
                  >
                    {validationState.id === source.id
                      ? "Checking…"
                      : "Validate"}
                  </button>
                </div>
              ))}
            </div>
          ))}
        <div className="module-subhead">
          <b>{"Integrations"}</b>
          <span>
            {integrationsLoading
              ? "Loading…"
              : integrationsError
                ? "Unavailable"
                : `${integrations?.length || 0} active`}
          </span>
        </div>
        {integrationsLoading && (
          <div className="module-state">{"Loading integrations…"}</div>
        )}
        {integrationsError && (
          <div className="module-state error">{integrationsError}</div>
        )}
        {!integrationsLoading &&
          !integrationsError &&
          (!integrations?.length ? (
            <div className="module-state">{"No integrations configured."}</div>
          ) : (
            <div className="module-table">
              {integrations.map(item => (
                <div className="module-row" key={item.id}>
                  <div>
                    <b>{item.provider}</b>
                    <small>{item.scope}</small>
                  </div>
                  <span className="positive">{item.status}</span>
                  <small>{item.lastChecked}</small>
                  <button className="action-chip">{"Inspect"}</button>
                </div>
              ))}
            </div>
          ))}
        {validationState.message && (
          <div
            className={
              validationState.error
                ? "module-feedback error"
                : "module-feedback"
            }
          >
            {validationState.message}
          </div>
        )}
        <DataIntakePanel />
      </div>
    );
  }
  if (isUsers)
    return shell(
      <div className="module-table">
        {[
          ["ENG-Yacoub Al-SMADI", "Super Admin", "All domains", "Active"],
          ["Network Operations", "Operations", "Network + GIS", "Active"],
          ["CX Leadership", "Executive", "CX + Revenue", "Pending review"],
        ].map(row => (
          <div className="module-row" key={row[0]}>
            <div>
              <b>{row[0]}</b>
              <small>{row[1]}</small>
            </div>
            <span>{row[2]}</span>
            <small className="positive">{row[3]}</small>
            <button className="action-chip">{"Review"}</button>
          </div>
        ))}
      </div>
    );
  if (isAudit)
    return shell(
      <div className="module-table">
        {[
          ["Permission policy updated", "Admin", "2 min ago", "Allowed"],
          ["Data source validation", "System", "18 min ago", "Success"],
          ["Priority export requested", "Operations", "42 min ago", "Allowed"],
          ["Failed login attempt", "Unknown", "1h ago", "Blocked"],
        ].map(row => (
          <div className="module-row" key={row[0]}>
            <div>
              <b>{row[0]}</b>
              <small>{row[1]}</small>
            </div>
            <span>{row[2]}</span>
            <small
              className={row[3] === "Blocked" ? "warning-text" : "positive"}
            >
              {row[3]}
            </small>
            <button className="action-chip">{"Inspect"}</button>
          </div>
        ))}
      </div>
    );
  if (isSettings)
    return shell(
      <div className="settings-grid">
        <div>
          <small>{"Default language"}</small>
          <b>English only</b>
        </div>
        <div>
          <small>{"Session policy"}</small>
          <b>30 min · secure cookie</b>
        </div>
        <div>
          <small>{"MFA readiness"}</small>
          <b className="positive">Ready for provider</b>
        </div>
        <div>
          <small>{"Data retention"}</small>
          <b>90 days · audit protected</b>
        </div>
      </div>
    );
  return shell(
    <>
      <div className="module-table">
        {rows.map(row => (
          <div className="module-row" key={row[0]}>
            <div>
              <b>{row[0]}</b>
              <small>{"Compared with prior period"}</small>
            </div>
            <span>{row[1]}</span>
            <small
              className={row[2].startsWith("-") ? "positive" : "warning-text"}
            >
              {row[2]}
            </small>
            <button className="action-chip">{row[3]}</button>
          </div>
        ))}
      </div>
      {isCorrelation && (
        <div className="correlation-grid">
          <div>
            <span>Complaint hotspot</span>
            <b>Amman West</b>
            <small>3 cells · 68% network-related</small>
          </div>
          <div>
            <span>Customer exposure</span>
            <b>8,420</b>
            <small>affected accounts</small>
          </div>
          <div>
            <span>Revenue sensitivity</span>
            <b>$286K</b>
            <small>estimated at risk</small>
          </div>
        </div>
      )}
      <div className="correlation-strip">
        <div>
          <Zap size={16} />
          <b>{"Priority engine"}</b>
          <span>
            {
              "Complaint and network signals correlated across protected domains."
            }
          </span>
        </div>
        <button className="text-btn">{"Open analysis"} →</button>
      </div>
    </>
  );
}

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const [active, setActive] = useState(
    () =>
      moduleBySlug[window.location.pathname.slice(1)] || "Executive Overview"
  );
  const [sidebar, setSidebar] = useState(
    () => typeof window !== "undefined" && window.innerWidth > 760
  );
  const [siteOpen, setSiteOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [layersOpen, setLayersOpen] = useState(true);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [layers, setLayers] = useState<MapLayers>({
    sites: true,
    coverage: true,
    complaints: true,
    fiber: true,
    revenue: false,
  });
  const [navQuery, setNavQuery] = useState("");
  const [validationState, setValidationState] = useState<{
    id?: string;
    message?: string;
    error?: boolean;
  }>({});
  const trpcUtils = trpc.useUtils();
  const askAi = trpc.ai.ask.useMutation({
    onSuccess: () => trpcUtils.ai.history.invalidate(),
  });
  const {
    data: aiHistory,
    isLoading: aiHistoryLoading,
    error: aiHistoryError,
  } = trpc.ai.history.useQuery(undefined, {
    enabled: aiOpen && isAuthenticated,
  });
  const {
    data: permissions,
    isLoading: permissionsLoading,
    error: permissionsError,
  } = trpc.auth.permissions.useQuery(undefined, { enabled: isAuthenticated });
  const role = permissions?.role || user?.role || "user";
  const grants = new Set(permissions?.grants || ["dashboard.view"]);
  const { data: dashboardSummary } = trpc.dashboard.summary.useQuery(undefined, { enabled: isAuthenticated });
  const liveKpis = useMemo(() => {
    if (!dashboardSummary) return kpis;
    const formatMoney = (value: number) => `$${(value / 1_000_000).toFixed(2)}M`;
    return kpis.map(item => ({ ...item,
      value: item.label === "Network Health" ? `${dashboardSummary.networkHealth.toFixed(1)}%` : item.label === "Total Sites" ? dashboardSummary.sites.toLocaleString() : item.label === "Active Customers" ? `${(dashboardSummary.customers / 1_000_000).toFixed(2)}M` : item.label === "Open Complaints" ? dashboardSummary.openComplaints.toLocaleString() : item.label === "CX Risk" ? `${dashboardSummary.cxRisk.toFixed(1)}%` : item.label === "Revenue at Risk" ? formatMoney(dashboardSummary.revenueAtRisk) : item.value,
    }));
  }, [dashboardSummary]);
  const {
    data: sources,
    isLoading: sourceLoading,
    error: sourceError,
  } = trpc.data.sources.useQuery(undefined, {
    enabled: isAuthenticated && role === "admin",
  });
  const {
    data: integrations,
    isLoading: integrationsLoading,
    error: integrationsError,
  } = trpc.data.integrations.useQuery(undefined, {
    enabled: isAuthenticated && role === "admin",
  });
  const validateSource = trpc.data.validate.useMutation({
    onMutate: input => {
      setValidationState({ id: input.sourceId });
    },
    onSuccess: () =>
      setValidationState({ message: "Source validated successfully." }),
    onError: error =>
      setValidationState({ message: error.message, error: true }),
  });
  const navGrant: Record<string, string> = {
    "Executive Overview": "dashboard.view",
    "Intelligence Map": "map.view",
    Network: "network.view",
    "Customer Experience": "complaints.view",
    Customers: "customers.view",
    Complaints: "complaints.view",
    "Infrastructure / Fiber": "infrastructure.view",
    Sales: "sales.view",
    Marketing: "marketing.view",
    "Business & Revenue": "revenue.view",
    Priorities: "dashboard.view",
    "AI Assistant": "ai.ask",
    Alerts: "dashboard.view",
    Reports: "dashboard.view",
    "Data Management": "data.view",
    "User Management": "users.manage",
    "System Settings": "settings.manage",
    "Audit Logs": "audit.view",
  };
  const filteredNav = useMemo(
    () =>
      nav.filter(
        n =>
          grants.has(navGrant[n[0]]) &&
          n[0].toLowerCase().includes(navQuery.toLowerCase())
      ),
    [permissions, navQuery]
  );
  return (
    <div className="app-shell">
      <div className="platform-grid" aria-hidden="true" />
      <div className="platform-tower" aria-hidden="true">
        <span />
        <i />
        <b />
      </div>
      <aside className={`sidebar ${sidebar ? "open" : "collapsed"}`}>
        <div className="brand">
          <div className="brand-mark">
            <span />
            <span />
            <span />
          </div>
          {sidebar && (
            <div>
              <strong>
                Smart<span>Analytics</span>
              </strong>
              <small>TELECOM INTELLIGENCE</small>
            </div>
          )}
          <button
            className="icon-btn sidebar-toggle"
            onClick={() => setSidebar(!sidebar)}
          >
            {sidebar ? <PanelLeftClose size={17} /> : <Menu size={18} />}
          </button>
        </div>
        {sidebar && (
          <>
            <div className="workspace">
              <div className="workspace-dot" />
              <div>
                <small>WORKSPACE</small>
                <b>Jordan Operations</b>
              </div>
              <ChevronDown size={14} />
            </div>
            <div className="nav-search">
              <Search size={15} />
              <input
                value={navQuery}
                placeholder={"Filter navigation"}
                onChange={e => setNavQuery(e.target.value)}
              />
            </div>
            <div className="nav-label">{"COMMAND CENTER"}</div>
            <nav>
              {filteredNav.map(([en, Icon]) => (
                <button
                  key={en}
                  className={active === en ? "active" : ""}
                  onClick={() => {
                    setActive(en);
                    navigate(`/${moduleSlugs[en]}`);
                    setSidebar(false);
                  }}
                >
                  <Icon size={17} />
                  <span>{en}</span>
                  {["Alerts", "Priorities"].includes(en) && (
                    <em>{en === "Alerts" ? "7" : "5"}</em>
                  )}
                </button>
              ))}
            </nav>
          </>
        )}
        {sidebar && (
          <div className="sidebar-footer">
            <div className="status-line">
              <span className="pulse" /> All systems operational
            </div>
            <div className="version">v2.4.0 · Last sync 2 min ago</div>
          </div>
        )}
      </aside>
      <main className="main-content">
        <header className="topbar">
          <button
            className="mobile-menu icon-btn"
            onClick={() => setSidebar(true)}
          >
            <Menu size={19} />
          </button>
          <div className="crumb">
            <span>{"Command Center"}</span>
            <b>/</b>
            <strong>{active}</strong>
          </div>
          <div className="top-actions">
            <div className="global-search">
              <Search size={16} />
              <input placeholder={"Search sites, cells, customers..."} />
              <kbd>⌘ K</kbd>
            </div>
            <button className="top-icon">
              <Bot size={18} />
              <i />
            </button>
            <button className="top-icon">
              <AlertTriangle size={18} />
              <i />
            </button>
            <div className="user-pill">
              <div className="avatar">{user?.name?.[0] || "A"}</div>
              <div>
                <b>{user?.name || "Admin User"}</b>
                <small>{role === "admin" ? "Super Admin" : "Operations"}</small>
              </div>
              <ChevronDown size={14} />
            </div>
            {isAuthenticated && (
              <button
                className="icon-btn"
                onClick={() => logout()}
                title="Logout"
              >
                <LogOut size={17} />
              </button>
            )}
          </div>
        </header>
        <div className="page-body">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="live-dot" /> {"LIVE OPERATIONS VIEW"}
              </div>
              <h1>
                {active === "Executive Overview"
                  ? "Good morning, Admin"
                  : active}
              </h1>
              <p>
                {"A clear view of your network, customers and business impact."}
              </p>
            </div>
            <div className="heading-actions">
              <Button variant="outline" className="outline-btn">
                <Download size={16} /> {"Export report"}
              </Button>
              {grants.has("ai.ask") && (
                <Button className="primary-btn" onClick={() => setAiOpen(true)}>
                  <Sparkles size={16} /> {"Ask AI"}
                </Button>
              )}
            </div>
          </div>
          {active !== "Executive Overview" &&
            active !== "Intelligence Map" &&
            active !== "AI Assistant" && (
              <ModuleView
                active={active}
                sources={sources as SourceRow[] | undefined}
                integrations={integrations as IntegrationRow[] | undefined}
                sourceLoading={sourceLoading}
                sourceError={sourceError?.message}
                integrationsLoading={integrationsLoading}
                integrationsError={integrationsError?.message}
                onValidate={id => validateSource.mutate({ sourceId: id })}
                validationState={validationState}
                adminLoading={permissionsLoading}
                adminError={permissionsError?.message}
                adminAvailable={role === "admin"}
              />
            )}
          <section className="kpi-grid">
            {liveKpis.map(k => (
              <div className="kpi-card" key={k.label}>
                <div className="kpi-top">
                  <span>{k.label}</span>
                  <div className={`kpi-icon ${k.tone}`}>
                    <k.icon size={17} />
                  </div>
                </div>
                <div className="kpi-value">{k.value}</div>
                <div
                  className={`kpi-delta ${k.tone === "bad" ? "negative" : ""}`}
                >
                  {k.tone === "bad" ? (
                    <ArrowDownRight size={14} />
                  ) : (
                    <ArrowUpRight size={14} />
                  )}{" "}
                  {k.delta} <small>{"vs last 7 days"}</small>
                </div>
              </div>
            ))}
          </section>
          <div className="content-grid">
            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">NETWORK PERFORMANCE</span>
                  <h2>{"Network health trend"}</h2>
                </div>
                <select>
                  <option>Last 24 hours</option>
                  <option>Last 7 days</option>
                </select>
              </div>
              <div className="chart-metric">
                <strong>94.8%</strong>
                <span className="positive">+2.4%</span>
                <small>availability index</small>
              </div>
              <MiniChart />
            </section>
            <section className="panel health-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">SYSTEM PULSE</span>
                  <h2>{"Operational health"}</h2>
                </div>
                <Activity size={18} className="muted" />
              </div>
              <div className="health-ring">
                <div>
                  <strong>96</strong>
                  <small>/ 100</small>
                </div>
              </div>
              <div className="health-copy">
                <b>{"Strong and stable"}</b>
                <span>{"All core services are within target."}</span>
              </div>
              <div className="health-stats">
                <span>
                  <i className="green" /> Sites online <b>98.6%</b>
                </span>
                <span>
                  <i className="cyan" /> Data freshness <b>99.2%</b>
                </span>
              </div>
            </section>
          </div>
          <div className="content-grid map-row">
            <section className="panel map-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">
                    GEOSPATIAL INTELLIGENCE
                  </span>
                  <h2>{"Intelligence map"}</h2>
                </div>
                <div className="map-actions">
                  <button
                    className={layersOpen ? "selected" : ""}
                    onClick={() => setLayersOpen(!layersOpen)}
                  >
                    <Layers3 size={15} /> {"Layers"}
                  </button>
                  <button
                    className={exploreOpen ? "selected" : ""}
                    onClick={() => setExploreOpen(!exploreOpen)}
                  >
                    <Search size={15} /> {"Explore"}
                  </button>
                </div>
              </div>
              <div className="map-body">
                <IntelligenceMap
                  onSite={() => setSiteOpen(true)}
                  layers={layers}
                  exploreOpen={exploreOpen}
                />
                {layersOpen && (
                  <div className="layer-panel">
                    <b>{"Map layers"}</b>
                    {(
                      [
                        ["sites", "Sites & cells", ""],
                        ["coverage", "Coverage quality", ""],
                        ["complaints", "Complaint hotspots", ""],
                        ["fiber", "Fiber availability", ""],
                        ["revenue", "Revenue at risk", ""],
                      ] as const
                    ).map(([key, en, ar]) => (
                      <label key={key}>
                        <input
                          type="checkbox"
                          checked={layers[key]}
                          onChange={e =>
                            setLayers(prev => ({
                              ...prev,
                              [key]: e.target.checked,
                            }))
                          }
                        />
                        <span>{en}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
          <div className="content-grid bottom-grid">
            <section className="panel priorities-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">DECISION SUPPORT</span>
                  <h2>{"Top priorities today"}</h2>
                </div>
                <button className="text-btn">{"View all"} →</button>
              </div>
              <div className="priority-table">
                <div className="table-head">
                  <span>Priority</span>
                  <span>Area / issue</span>
                  <span>Customer impact</span>
                  <span>Revenue at risk</span>
                  <span>Action</span>
                </div>
                {priorities.map((p, i) => (
                  <div className="table-row" key={p.area}>
                    <span>
                      <b className={`score s${i}`}>{p.score}</b>
                      <small>/{100}</small>
                    </span>
                    <span>
                      <b>{p.area}</b>
                      <small>{p.issue}</small>
                    </span>
                    <span>{p.impact}</span>
                    <span className="money">{p.revenue}</span>
                    <span>
                      <button className="action-chip">{p.action}</button>
                    </span>
                  </div>
                ))}
              </div>
            </section>
            <section className="panel fix-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">SMART RECOMMENDATIONS</span>
                  <h2>{"If I can fix only 5 things today"}</h2>
                </div>
                <CircleHelp size={17} className="muted" />
              </div>
              <div className="fix-list">
                {fixes.map((f, i) => (
                  <div className="fix-item" key={f[0]}>
                    <span className="fix-num">0{i + 1}</span>
                    <div>
                      <b>{f[0]}</b>
                      <small>{f[1]}</small>
                    </div>
                    <span className={`priority-tag ${f[2].toLowerCase()}`}>
                      {f[2]}
                    </span>
                    <em>{f[3]}</em>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
      {aiOpen && (
        <div className="drawer-backdrop" onClick={() => setAiOpen(false)}>
          <aside
            className="site-drawer ai-drawer"
            onClick={e => e.stopPropagation()}
          >
            <div className="drawer-head">
              <div>
                <span className="section-kicker">DECISION COPILOT</span>
                <h2>{"AI decision assistant"}</h2>
                <p>
                  <Sparkles size={14} /> {"Permission-scoped intelligence"}
                </p>
              </div>
              <button className="icon-btn" onClick={() => setAiOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="ai-scope">
              <ShieldCheck size={16} />
              <span>{"Context: Network & Customer Experience"}</span>
              <i>RBAC</i>
            </div>
            <div className="ai-answer">
              {askAi.data ? (
                String(askAi.data.answer)
              ) : (
                <>
                  <Bot size={22} />
                  <b>{"Ask a business question"}</b>
                  <p>
                    {
                      "I can explain network issues, customer impact, priority and next action without exposing restricted data."
                    }
                  </p>
                </>
              )}
            </div>
            <div className="ai-history">
              <div className="history-title">
                <span>{"Recent questions"}</span>
                <small>
                  {aiHistoryLoading
                    ? "Loading..."
                    : aiHistoryError
                      ? "Unavailable"
                      : `${aiHistory?.length || 0} saved`}
                </small>
              </div>
              {aiHistoryError && (
                <div className="ai-history-error">
                  {"Conversation history is temporarily unavailable."}
                </div>
              )}
              {!aiHistoryLoading && !aiHistoryError && !aiHistory?.length && (
                <div className="ai-history-empty">
                  {
                    "No saved questions yet. Ask a question to build your decision trail."
                  }
                </div>
              )}
              {aiHistory?.slice(0, 3).map(item => (
                <button
                  key={item.id}
                  onClick={() => setAiQuestion(item.question)}
                >
                  <span>{item.question}</span>
                  <small>
                    {new Date(item.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </button>
              ))}
            </div>
            <div className="ai-prompts">
              <button
                onClick={() =>
                  setAiQuestion("Why is Amman West the top priority today?")
                }
              >
                Why is Amman West the top priority?
              </button>
              <button
                onClick={() =>
                  setAiQuestion("Which cells correlate with complaint growth?")
                }
              >
                Which cells correlate with complaint growth?
              </button>
            </div>
            <div className="ai-input">
              <input
                value={aiQuestion}
                onChange={e => setAiQuestion(e.target.value)}
                onKeyDown={e =>
                  e.key === "Enter" &&
                  aiQuestion.trim() &&
                  askAi.mutate({ question: aiQuestion, domain: "network" })
                }
                placeholder={"Ask about your operations..."}
              />
              <button
                onClick={() =>
                  aiQuestion.trim() &&
                  askAi.mutate({ question: aiQuestion, domain: "network" })
                }
              >
                <ArrowUpRight size={16} />
              </button>
            </div>
          </aside>
        </div>
      )}
      {siteOpen && (
        <div className="drawer-backdrop" onClick={() => setSiteOpen(false)}>
          <aside className="site-drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-head">
              <div>
                <span className="section-kicker">SITE DETAILS</span>
                <h2>AMW-042 · Amman West</h2>
                <p>
                  <MapPin size={14} /> 31.9539° N, 35.9106° E
                </p>
              </div>
              <button className="icon-btn" onClick={() => setSiteOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="site-status">
              <span className="pulse" /> Operational <b>98.6% availability</b>
            </div>
            <div className="drawer-section">
              <h3>Network KPIs</h3>
              <div className="detail-grid">
                <span>
                  <small>4G availability</small>
                  <b>98.6%</b>
                </span>
                <span>
                  <small>Traffic</small>
                  <b>1.42 TB</b>
                </span>
                <span>
                  <small>Congestion</small>
                  <b className="warning-text">94% PRB</b>
                </span>
                <span>
                  <small>Throughput</small>
                  <b>42.8 Mbps</b>
                </span>
              </div>
            </div>
            <div className="drawer-section">
              <h3>Customer impact</h3>
              <div className="impact-bar">
                <span style={{ width: "72%" }} />
              </div>
              <div className="impact-line">
                <b>8,420</b>
                <span>customers affected</span>
                <em>High impact</em>
              </div>
            </div>
            <div className="drawer-section">
              <h3>Recommended action</h3>
              <div className="recommend">
                <Zap size={17} />
                <div>
                  <b>Capacity upgrade</b>
                  <p>
                    Add 2 carriers to sectors A and C. Expected relief in 48h.
                  </p>
                </div>
              </div>
            </div>
            <Button className="primary-btn drawer-btn">
              Open full site view
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}
