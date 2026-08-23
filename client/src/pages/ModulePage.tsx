import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Database,
  Gauge,
  Map,
  Network,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Wifi,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const modules: Record<
  string,
  {
    title: string;
    ar: string;
    eyebrow: string;
    summary: string;
    metric: string;
    metricLabel: string;
    rows: string[][];
    icon: typeof Gauge;
    grant: string;
  }
> = {
  "executive-overview": {
    title: "Executive Overview",
    ar: "",
    eyebrow: "COMMAND CENTER",
    summary:
      "A consolidated view of network health, customer exposure, complaints, revenue and today’s decisions.",
    metric: "96",
    metricLabel: "operational health",
    rows: [
      ["Network health", "94.8%", "+2.4%", "Healthy"],
      ["Open complaints", "1,842", "−12.6%", "Improving"],
      ["Revenue at risk", "$1.28M", "−$184K", "Watch"],
    ],
    icon: Gauge,
    grant: "dashboard.view",
  },
  "intelligence-map": {
    title: "Intelligence Map",
    ar: "",
    eyebrow: "GEOSPATIAL OPERATIONS",
    summary:
      "Explore sites, cells, coverage quality, complaint hotspots and revenue exposure by geography.",
    metric: "1,284",
    metricLabel: "mapped sites",
    rows: [
      ["Amman West", "3 cells", "94% PRB", "Critical"],
      ["Irbid Central", "Fiber node FN-204", "Outage risk", "Warning"],
      ["Aqaba Coast", "Enterprise zone", "99.2%", "Healthy"],
    ],
    icon: Map,
    grant: "map.view",
  },
  network: {
    title: "Network",
    ar: "",
    eyebrow: "RADIO & CORE PERFORMANCE",
    summary:
      "Monitor availability, utilization, throughput and active incidents across the network.",
    metric: "98.6%",
    metricLabel: "availability",
    rows: [
      ["4G PRB utilization", "76.4%", "−3.2%", "Improving"],
      ["Dropped sessions", "0.42%", "−0.08%", "Healthy"],
      ["Backhaul headroom", "18.2%", "+4.5%", "Watch"],
    ],
    icon: Network,
    grant: "network.view",
  },
  "customer-experience": {
    title: "Customer Experience",
    ar: "",
    eyebrow: "CX CONTROL ROOM",
    summary:
      "Connect service quality to customer impact, response times and escalation pressure.",
    metric: "18.4%",
    metricLabel: "CX risk",
    rows: [
      ["First response time", "18 min", "−6 min", "On target"],
      ["Escalations", "74", "+8", "Watch"],
      ["Network-related CX", "68%", "−4.1%", "Correlated"],
    ],
    icon: Users,
    grant: "complaints.view",
  },
  customers: {
    title: "Customers",
    ar: "",
    eyebrow: "CUSTOMER INTELLIGENCE",
    summary:
      "Segment the active base by value, region and churn risk to focus retention actions.",
    metric: "2.84M",
    metricLabel: "active customers",
    rows: [
      ["High value", "184K", "12.8%", "Priority"],
      ["Enterprise", "8,420", "$286K", "Protected"],
      ["At-risk base", "42.1K", "18.4%", "Monitor"],
    ],
    icon: Users,
    grant: "customers.view",
  },
  complaints: {
    title: "Complaints",
    ar: "",
    eyebrow: "VOICE OF CUSTOMER",
    summary:
      "Prioritize open complaints by severity, network correlation and affected customer value.",
    metric: "1,842",
    metricLabel: "open complaints",
    rows: [
      ["Internet slow", "842", "68% network-related", "High"],
      ["No service", "318", "Amman West", "Critical"],
      ["Billing inquiry", "276", "Commercial", "Medium"],
    ],
    icon: AlertTriangle,
    grant: "complaints.view",
  },
  "infrastructure-fiber": {
    title: "Infrastructure / Fiber",
    ar: "",
    eyebrow: "FIBER & FIELD OPERATIONS",
    summary:
      "Track nodes, fiber availability, outages and crew dispatch priorities.",
    metric: "99.1%",
    metricLabel: "fiber availability",
    rows: [
      ["FN-204", "Irbid Central", "Down", "Dispatch"],
      ["FN-118", "Amman West", "92%", "Capacity"],
      ["FN-077", "Salt Heights", "99.8%", "Healthy"],
    ],
    icon: Wifi,
    grant: "infrastructure.view",
  },
  sales: {
    title: "Sales",
    ar: "",
    eyebrow: "COMMERCIAL PIPELINE",
    summary:
      "Review opportunities by stage, probability, region and expected value.",
    metric: "$4.82M",
    metricLabel: "qualified pipeline",
    rows: [
      ["Enterprise connectivity", "$1.28M", "74%", "Proposal"],
      ["Fiber upgrade", "$842K", "58%", "Discovery"],
      ["Managed services", "$2.7M", "36%", "Qualified"],
    ],
    icon: Target,
    grant: "sales.view",
  },
  marketing: {
    title: "Marketing",
    ar: "",
    eyebrow: "CAMPAIGN PERFORMANCE",
    summary:
      "Compare campaign reach, spend and conversion across priority customer segments.",
    metric: "8.7%",
    metricLabel: "conversion rate",
    rows: [
      ["Fiber upgrade Q3", "$84K", "11.2%", "Live"],
      ["Enterprise 5G", "$120K", "7.8%", "Optimizing"],
      ["Retention wave", "$42K", "9.4%", "Live"],
    ],
    icon: Sparkles,
    grant: "marketing.view",
  },
  "business-revenue": {
    title: "Business & Revenue",
    ar: "",
    eyebrow: "REVENUE COMMAND",
    summary:
      "See realized revenue, risk exposure and commercial sensitivity by region.",
    metric: "$1.28M",
    metricLabel: "revenue at risk",
    rows: [
      ["Amman West", "$286K", "8,420 customers", "Urgent"],
      ["Aqaba Coast", "$192K", "34 accounts", "Retention"],
      ["Irbid Central", "$119K", "2,180 customers", "Fiber"],
    ],
    icon: BarChart3,
    grant: "revenue.view",
  },
  priorities: {
    title: "Priorities",
    ar: "",
    eyebrow: "DECISION SUPPORT",
    summary:
      "Rank the five actions with the highest combined customer and revenue impact.",
    metric: "5",
    metricLabel: "actions today",
    rows: [
      ["Capacity upgrade", "94", "$286K", "Amman West"],
      ["Dispatch fiber crew", "88", "$119K", "Irbid Central"],
      ["Retention squad", "76", "$192K", "Aqaba Coast"],
    ],
    icon: Gauge,
    grant: "dashboard.view",
  },
  "ai-assistant": {
    title: "AI Assistant",
    ar: "",
    eyebrow: "DECISION COPILOT",
    summary:
      "Ask permission-scoped questions about network, customer experience and commercial outcomes.",
    metric: "RBAC",
    metricLabel: "scope enforced",
    rows: [
      ["Network diagnosis", "Available", "Protected", "Ask"],
      ["Customer impact", "Available", "Protected", "Ask"],
      ["General intelligence", "Admin only", "Restricted", "Guarded"],
    ],
    icon: Sparkles,
    grant: "ai.ask",
  },
  alerts: {
    title: "Alerts",
    ar: "",
    eyebrow: "ACTIVE SIGNALS",
    summary:
      "Review operational alerts requiring acknowledgement, ownership and resolution.",
    metric: "7",
    metricLabel: "active alerts",
    rows: [
      ["Cell congestion", "Amman West", "4G", "Critical"],
      ["Fiber outage", "Irbid Central", "FN-204", "High"],
      ["Churn signal", "Aqaba Coast", "Enterprise", "Medium"],
    ],
    icon: AlertTriangle,
    grant: "dashboard.view",
  },
  reports: {
    title: "Reports",
    ar: "",
    eyebrow: "ANALYTICS OUTPUT",
    summary:
      "Generate controlled views for operations, executives, CX and commercial leadership.",
    metric: "24",
    metricLabel: "available reports",
    rows: [
      ["Network health", "Daily", "Operations", "Ready"],
      ["CX risk review", "Weekly", "Executive", "Ready"],
      ["Revenue exposure", "Monthly", "Finance", "Ready"],
    ],
    icon: BarChart3,
    grant: "dashboard.view",
  },
  "data-management": {
    title: "Data Management",
    ar: "",
    eyebrow: "DATA CONTROL PLANE",
    summary:
      "Validate sources, monitor freshness and review integration health before analytics use.",
    metric: "3",
    metricLabel: "connected sources",
    rows: [
      ["Network OSS", "API", "1.28M records", "Healthy"],
      ["CX & Complaints", "SFTP", "18.4K records", "Healthy"],
      ["Commercial CRM", "Database", "8.4K records", "Warning"],
    ],
    icon: Database,
    grant: "data.view",
  },
  "user-management": {
    title: "User Management",
    ar: "",
    eyebrow: "IDENTITY & ACCESS",
    summary:
      "Review users, role assignments and access scope across operational domains.",
    metric: "3",
    metricLabel: "active profiles",
    rows: [
      ["System Administrator", "Admin", "All domains", "Active"],
      ["Network Operations", "Operations", "Network + GIS", "Active"],
      ["CX Leadership", "Executive", "CX + Revenue", "Review"],
    ],
    icon: ShieldCheck,
    grant: "users.manage",
  },
  "system-settings": {
    title: "System Settings",
    ar: "",
    eyebrow: "PLATFORM CONFIGURATION",
    summary:
      "Control session policy, language defaults, MFA readiness and data retention policy.",
    metric: "12h",
    metricLabel: "session policy",
    rows: [
      ["Default language", "", "Workspace", "Ready"],
      ["MFA readiness", "Provider ready", "Security", "Ready"],
      ["Audit retention", "90 days", "Governance", "Active"],
    ],
    icon: ShieldCheck,
    grant: "settings.manage",
  },
  "audit-logs": {
    title: "Audit Logs",
    ar: "",
    eyebrow: "GOVERNANCE TRAIL",
    summary:
      "Trace permission changes, validation actions, exports and blocked access attempts.",
    metric: "184",
    metricLabel: "events in 24h",
    rows: [
      ["Permission policy updated", "Admin", "2 min ago", "Allowed"],
      ["Data source validation", "System", "18 min ago", "Success"],
      ["Failed login attempt", "Unknown", "1h ago", "Blocked"],
    ],
    icon: Activity,
    grant: "audit.view",
  },
};

function DataSourceConsole() {
  const [method, setMethod] = useState<"manual" | "api" | "sftp" | "database">(
    "manual"
  );
  const [sourceName, setSourceName] = useState("");
  const [connectionRef, setConnectionRef] = useState("");
  const [notice, setNotice] = useState("");
  const [schemaPreview, setSchemaPreview] = useState<string[]>([]);
  const [rowErrors, setRowErrors] = useState<string[]>([]);
  const [lastRunId, setLastRunId] = useState(0);
  const [mappingText, setMappingText] = useState("{}");
  const { data: sources, isLoading: sourcesLoading } =
    trpc.data.sources.useQuery();
  const { data: runs, isLoading: runsLoading } =
    trpc.data.importRuns.useQuery();
  const register = trpc.data.registerSource.useMutation({
    onSuccess: () =>
      setNotice(
        "Source configuration saved. Add credentials through server secrets before connecting."
      ),
    onError: e => setNotice(e.message),
  });
  const testConnection = trpc.data.testConnection.useMutation({
    onSuccess: result => setNotice(result.message),
    onError: e => setNotice(e.message),
  });
  const saveMapping = trpc.data.saveMapping.useMutation({
    onSuccess: () => setNotice("Field mapping saved to the import run."),
    onError: e => setNotice(e.message),
  });
  const upload = trpc.data.manualImport.useMutation({
    onSuccess: result => {
      setSchemaPreview(result.schema as string[]);
      setRowErrors(result.errors as string[]);
      setLastRunId(result.importRunId);
      setMappingText(
        JSON.stringify(
          Object.fromEntries(
            (result.schema as string[]).map(field => [field, field])
          ),
          null,
          2
        )
      );
      setNotice(
        `Received ${result.fileName}: ${result.rowCount} rows, ${result.validRows} valid, ${result.invalidRows} invalid.`
      );
    },
    onError: e => setNotice(e.message),
  });
  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !sourceName.trim()) {
      setNotice("Enter a source name before selecting a file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      upload.mutate({
        sourceName: sourceName.trim(),
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        base64:
          String(reader.result || "")
            .split(",")
            .pop() || "",
      });
    reader.readAsDataURL(file);
  };
  return (
    <div className="standalone-data-console">
      <div className="module-subhead">
        <b>Connected sources</b>
        <span>
          {sourcesLoading ? "Loading..." : `${sources?.length || 0} configured`}
        </span>
      </div>
      {!sourcesLoading && !sources?.length && (
        <div className="module-state">
          No source has been configured yet. Add your first API, SFTP, database,
          or file source below.
        </div>
      )}
      {sources?.map(source => (
        <div className="import-run" key={source.id}>
          <span>
            <b>{source.name}</b>
            <small>
              {source.type} · {source.lastSync}
            </small>
          </span>
          <span>{source.records} records</span>
          <span className="positive">{source.status}</span>
          <span>Source</span>
        </div>
      ))}
      <div className="module-subhead">
        <b>Source setup</b>
        <span>Secrets never enter the browser</span>
      </div>
      <div className="intake-grid">
        <label>
          <span>Name</span>
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
            <option value="api">API</option>
            <option value="sftp">SFTP</option>
            <option value="database">Database</option>
          </select>
        </label>
      </div>
      <label className="intake-wide">
        <span>
          {method === "sftp"
            ? "SFTP host and path"
            : method === "api"
              ? "API base URL"
              : method === "database"
                ? "Database reference"
                : "Optional source reference"}
        </span>
        <input
          value={connectionRef}
          onChange={e => setConnectionRef(e.target.value)}
          placeholder="No passwords or tokens in this field"
        />
      </label>
      <div className="intake-actions">
        {method === "manual" && (
          <label className="upload-btn">
            <input
              type="file"
              accept=".csv,.json,.xlsx,.xls"
              onChange={handleFile}
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
          {register.isPending ? "Saving..." : "Save source"}
        </button>
        {method !== "manual" && (
          <button
            className="action-chip"
            disabled={!connectionRef.trim() || testConnection.isPending}
            onClick={() =>
              testConnection.mutate({
                type: method,
                connectionRef: connectionRef.trim(),
              })
            }
          >
            {testConnection.isPending ? "Testing..." : "Test connection"}
          </button>
        )}
      </div>
      <small className="intake-help">
        For API, SFTP, and database sources, store credentials as server secrets
        and keep only the non-sensitive reference here.
      </small>
      {notice && <div className="module-feedback">{notice}</div>}
      {schemaPreview.length > 0 && (
        <div className="schema-preview">
          <div className="module-subhead">
            <b>Detected fields</b>
            <span>{schemaPreview.length} fields</span>
          </div>
          <div className="schema-chips">
            {schemaPreview.map(field => (
              <span key={field}>{field}</span>
            ))}
          </div>
          {rowErrors.length > 0 && (
            <div className="module-feedback error">{rowErrors.join(" · ")}</div>
          )}
          {lastRunId > 0 && (
            <div className="mapping-box">
              <label>
                <span>Field mapping JSON</span>
                <textarea
                  value={mappingText}
                  onChange={e => setMappingText(e.target.value)}
                  rows={4}
                />
              </label>
              <button
                className="action-chip"
                onClick={() => {
                  try {
                    saveMapping.mutate({
                      importRunId: lastRunId,
                      mapping: JSON.parse(mappingText),
                    });
                  } catch {
                    setNotice("Mapping must be valid JSON.");
                  }
                }}
              >
                Save mapping
              </button>
            </div>
          )}
        </div>
      )}
      <div className="module-subhead">
        <b>Import history</b>
        <span>{runsLoading ? "Loading..." : `${runs?.length || 0} runs`}</span>
      </div>
      {!runsLoading && !runs?.length && (
        <div className="module-state">No imports received yet.</div>
      )}
      {runs?.slice(0, 8).map(run => (
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
  );
}

export default function ModulePage({ slug }: { slug: string }) {
  const [, navigate] = useLocation();
  const { data: permissions, isLoading } = trpc.auth.permissions.useQuery();
  const { data: liveSources } = trpc.data.sources.useQuery(undefined, {
    enabled: slug === "data-management",
  });
  const item = modules[slug] || modules.network;
  const allowed = Boolean(permissions?.grants?.includes(item.grant));
  if (isLoading)
    return <div className="auth-loading">Loading protected module…</div>;
  if (!allowed)
    return (
      <main className="module-access-denied">
        <ShieldCheck size={28} />
        <h1>Access restricted</h1>
        <p>Your role does not have permission to view this module.</p>
        <button onClick={() => navigate("/")}>Return to command center</button>
      </main>
    );
  return (
    <main className="standalone-module">
      <header className="standalone-top">
        <button onClick={() => navigate("/")}>← Command Center</button>
        <span className="section-kicker">{item.eyebrow}</span>
        <span className="module-role">
          <ShieldCheck size={14} /> Role-scoped view
        </span>
      </header>
      <section className="standalone-hero">
        <div>
          <span className="section-kicker">{item.eyebrow}</span>
          <h1>{item.title}</h1>
          <p>{item.summary}</p>
        </div>
        <div className="standalone-icon">
          <item.icon size={28} />
        </div>
      </section>
      <section className="standalone-metric">
        <strong>
          {slug === "data-management" ? liveSources?.length || 0 : item.metric}
        </strong>
        <span>{item.metricLabel}</span>
        <ArrowUpRight size={18} />
      </section>
      {slug === "data-management" ? (
        <section className="standalone-panel">
          <DataSourceConsole />
        </section>
      ) : (
        <section className="standalone-panel">
          <div className="standalone-panel-head">
            <div>
              <span className="section-kicker">LIVE MODULE VIEW</span>
              <h2>{item.title} signals</h2>
            </div>
            <button className="action-chip">Export view</button>
          </div>
          <div className="standalone-table">
            <div className="standalone-table-head">
              <span>Signal</span>
              <span>Value</span>
              <span>Context</span>
              <span>Status</span>
            </div>
            {item.rows.map(row => (
              <div className="standalone-row" key={row[0]}>
                {row.map((cell, index) => (
                  <span className={index === 3 ? "status-cell" : ""} key={cell}>
                    {cell}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export const ExecutiveOverviewPage = () => (
  <ModulePage slug="executive-overview" />
);
export const IntelligenceMapPage = () => <ModulePage slug="intelligence-map" />;
export const NetworkPage = () => <ModulePage slug="network" />;
export const CustomerExperiencePage = () => (
  <ModulePage slug="customer-experience" />
);
export const CustomersPage = () => <ModulePage slug="customers" />;
export const ComplaintsPage = () => <ModulePage slug="complaints" />;
export const InfrastructureFiberPage = () => (
  <ModulePage slug="infrastructure-fiber" />
);
export const SalesPage = () => <ModulePage slug="sales" />;
export const MarketingPage = () => <ModulePage slug="marketing" />;
export const BusinessRevenuePage = () => <ModulePage slug="business-revenue" />;
export const PrioritiesPage = () => <ModulePage slug="priorities" />;
export const AIAssistantPage = () => <ModulePage slug="ai-assistant" />;
export const AlertsPage = () => <ModulePage slug="alerts" />;
export const ReportsPage = () => <ModulePage slug="reports" />;
export const DataManagementPage = () => <ModulePage slug="data-management" />;
export const UserManagementPage = () => <ModulePage slug="user-management" />;
export const SystemSettingsPage = () => <ModulePage slug="system-settings" />;
export const AuditLogsPage = () => <ModulePage slug="audit-logs" />;
