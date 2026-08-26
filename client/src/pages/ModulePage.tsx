import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  BarChart3,
  Database,
  Gauge,
  Clock3,
  Loader2,
  KeyRound,
  Search,
  UserCheck,
  UserX,
  Map,
  Network,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Wifi,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { connectionFailureGuidance } from "@/lib/connection-feedback";
import { formatLatency, formatSuccessfulCheck, sourceStatusLabel } from "@/lib/source-observability";
import { filterUsers } from "@/lib/user-directory";
import { temporaryPasswordLabel } from "@/lib/password-expiration";

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
  "executive-overview": { title: "Executive Overview", ar: "", eyebrow: "COMMAND CENTER", summary: "A consolidated view populated only from connected operational sources.", metric: "—", metricLabel: "source data required", rows: [], icon: Gauge, grant: "dashboard.view" },
  "intelligence-map": { title: "Intelligence Map", ar: "", eyebrow: "GEOSPATIAL OPERATIONS", summary: "Explore locations only after a source-backed site inventory is connected.", metric: "—", metricLabel: "mapped sites", rows: [], icon: Map, grant: "map.view" },
  network: { title: "Network", ar: "", eyebrow: "RADIO & CORE PERFORMANCE", summary: "Monitor network KPIs from imported or connected source records.", metric: "—", metricLabel: "source data required", rows: [], icon: Network, grant: "network.view" },
  "customer-experience": { title: "Customer Experience", ar: "", eyebrow: "CX CONTROL ROOM", summary: "Connect service quality to customer impact using source-backed signals.", metric: "—", metricLabel: "source data required", rows: [], icon: Users, grant: "complaints.view" },
  customers: { title: "Customers", ar: "", eyebrow: "CUSTOMER INTELLIGENCE", summary: "Segment customer records only when an authorized customer dataset is available.", metric: "—", metricLabel: "source data required", rows: [], icon: Users, grant: "customers.view" },
  complaints: { title: "Complaints", ar: "", eyebrow: "VOICE OF CUSTOMER", summary: "Prioritize complaint records from connected customer-care sources.", metric: "—", metricLabel: "source data required", rows: [], icon: AlertTriangle, grant: "complaints.view" },
  "infrastructure-fiber": { title: "Infrastructure / Fiber", ar: "", eyebrow: "FIBER & FIELD OPERATIONS", summary: "Track infrastructure records after a source-backed fiber dataset is connected.", metric: "—", metricLabel: "source data required", rows: [], icon: Wifi, grant: "infrastructure.view" },
  sales: { title: "Sales", ar: "", eyebrow: "COMMERCIAL PIPELINE", summary: "Review opportunities only from an authorized CRM or sales source.", metric: "—", metricLabel: "source data required", rows: [], icon: Target, grant: "sales.view" },
  marketing: { title: "Marketing", ar: "", eyebrow: "CAMPAIGN PERFORMANCE", summary: "Compare campaign performance using connected marketing records.", metric: "—", metricLabel: "source data required", rows: [], icon: Sparkles, grant: "marketing.view" },
  "business-revenue": { title: "Business & Revenue", ar: "", eyebrow: "REVENUE COMMAND", summary: "See revenue exposure only when source-backed revenue records are available.", metric: "—", metricLabel: "source data required", rows: [], icon: BarChart3, grant: "revenue.view" },
  priorities: { title: "Priorities", ar: "", eyebrow: "DECISION SUPPORT", summary: "Rank actions from current source-backed signals; no recommendations are invented.", metric: "—", metricLabel: "source data required", rows: [], icon: Gauge, grant: "dashboard.view" },
  "ai-assistant": { title: "AI Assistant", ar: "", eyebrow: "DECISION COPILOT", summary: "Ask questions about connected and permission-scoped telecom data.", metric: "—", metricLabel: "source data required", rows: [], icon: Sparkles, grant: "ai.ask" },
  alerts: { title: "Alerts", ar: "", eyebrow: "ACTIVE SIGNALS", summary: "Review alerts derived from current source-backed operational signals.", metric: "—", metricLabel: "source data required", rows: [], icon: AlertTriangle, grant: "dashboard.view" },
  reports: { title: "Reports", ar: "", eyebrow: "ANALYTICS OUTPUT", summary: "Generate reports only from the current source-backed operational dataset.", metric: "—", metricLabel: "source data required", rows: [], icon: BarChart3, grant: "dashboard.view" },
  "data-management": { title: "Data Management", ar: "", eyebrow: "DATA CONTROL PLANE", summary: "Validate sources, monitor freshness and document the datasets used by analytics.", metric: "—", metricLabel: "connected sources", rows: [], icon: Database, grant: "data.view" },
  "user-management": { title: "User Management", ar: "", eyebrow: "IDENTITY & ACCESS", summary: "Review users, roles and access scope from the administration directory.", metric: "—", metricLabel: "active profiles", rows: [], icon: ShieldCheck, grant: "users.manage" },
  "system-settings": { title: "System Settings", ar: "", eyebrow: "PLATFORM CONFIGURATION", summary: "Control platform configuration without embedding operational data.", metric: "—", metricLabel: "configuration", rows: [], icon: ShieldCheck, grant: "settings.manage" },
  "audit-logs": { title: "Audit Logs", ar: "", eyebrow: "GOVERNANCE TRAIL", summary: "Trace administrative actions recorded by the platform.", metric: "—", metricLabel: "recorded events", rows: [], icon: Activity, grant: "audit.view" },
};

type DatasetDefinition = {
  key: string;
  label: string;
  section: string;
  description: string;
  required: string[];
  optional: string[];
  formats: string;
  relationships: string[];
  consumers: string[];
};

export const DATASET_DEFINITIONS: DatasetDefinition[] = [
  { key: "network-sites", label: "Network Sites", section: "Network", description: "One row per physical tower or site used as the geographic anchor.", required: ["site_code", "name", "latitude", "longitude"], optional: ["region", "status"], formats: "CSV, XLSX, JSON", relationships: ["site_code links cells, KPI, fiber, complaints, sales and revenue"], consumers: ["Intelligence Map", "Network", "CX", "Customers", "Complaints", "Infrastructure", "Sales", "Priorities"] },
  { key: "network-kpis", label: "Network KPI", section: "Network", description: "Time-stamped radio and core measurements for each site or cell.", required: ["site_code or cell_code", "recorded_at", "availability", "congestion", "throughput"], optional: ["traffic_tb", "coverage"], formats: "CSV, XLSX, JSON, API, MySQL", relationships: ["site_code/cell_code must match Network Sites"], consumers: ["Network", "CX", "Complaints", "Business & Revenue", "Priorities"] },
  { key: "complaints", label: "Complaints", section: "Customer Experience", description: "Customer-care cases with severity, status, category and an optional site relationship.", required: ["complaint_id", "category", "severity", "status", "created_at"], optional: ["customer_ref", "site_code", "resolved_at"], formats: "CSV, XLSX, JSON, API, SFTP, MySQL", relationships: ["customer_ref links Customers; site_code links Network Sites"], consumers: ["Customer Experience", "Complaints", "Alerts", "Priorities"] },
  { key: "customers", label: "Customers", section: "Customer Intelligence", description: "Authorized customer or account records used for segment and churn analysis.", required: ["customer_ref", "segment", "region"], optional: ["churn_risk", "lifetime_value", "site_code"], formats: "CSV, XLSX, JSON, API, SFTP, MySQL", relationships: ["customer_ref links Complaints and Sales; site_code links Network Sites"], consumers: ["Customers", "CX", "Complaints", "Sales", "Business & Revenue"] },
  { key: "fiber-infrastructure", label: "Fiber Infrastructure", section: "Infrastructure / Fiber", description: "Fiber nodes and availability records used to assess migration and build opportunities.", required: ["node_code", "status", "availability"], optional: ["site_code", "latitude", "longitude", "link_count", "planned_upgrade"], formats: "CSV, XLSX, JSON, API, SFTP, MySQL", relationships: ["site_code links Network Sites"], consumers: ["Infrastructure / Fiber", "Network", "Sales", "Priorities"] },
  { key: "sales-opportunities", label: "Sales Opportunities", section: "Sales", description: "CRM pipeline records with commercial value and network readiness context.", required: ["opportunity_id", "stage", "value", "probability"], optional: ["customer_ref", "site_code", "region"], formats: "CSV, XLSX, JSON, API, SFTP, MySQL", relationships: ["customer_ref links Customers; site_code links Network Sites"], consumers: ["Sales", "Business & Revenue", "Priorities", "Alerts"] },
  { key: "marketing-campaigns", label: "Marketing Campaigns", section: "Marketing", description: "Campaign performance and target-area records for experience-aware planning.", required: ["campaign_id", "name", "status", "budget"], optional: ["region", "conversion_rate", "customer_segment"], formats: "CSV, XLSX, JSON, API, SFTP, MySQL", relationships: ["region/site_code should align with Network Sites or Customers"], consumers: ["Marketing", "CX", "Customers"] },
  { key: "revenue-exposure", label: "Revenue Exposure", section: "Business & Revenue", description: "Period-based actual revenue and at-risk exposure records.", required: ["period", "region", "at_risk"], optional: ["actual", "customer_ref", "site_code"], formats: "CSV, XLSX, JSON, API, SFTP, MySQL", relationships: ["region/site_code links Network Sites; customer_ref links Customers"], consumers: ["Business & Revenue", "Priorities", "Alerts", "Executive Overview"] },
];

function downloadDatasetTemplate(dataset: DatasetDefinition) {
  const header = dataset.required.join(",");
  const blob = new Blob([`${header}\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${dataset.key}-template.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function buildSyntheticNetworkDemoRows(count = 5250) {
  const regions = ["North", "Central", "South", "East", "West"];
  const statuses = ["healthy", "healthy", "healthy", "warning", "critical"];
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    const latitude = (31.15 + ((number * 0.0137) % 3.2)).toFixed(6);
    const longitude = (35.55 + ((number * 0.0191) % 3.1)).toFixed(6);
    return [`SYN-${String(number).padStart(5, "0")}`, `Synthetic Tower ${String(number).padStart(5, "0")}`, regions[index % regions.length], latitude, longitude, statuses[index % statuses.length]].join(",");
  });
}

function downloadSyntheticNetworkDemo(count = 5250) {
  const headers = ["site_code", "name", "region", "latitude", "longitude", "status"];
  const rows = buildSyntheticNetworkDemoRows(count);
  const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `synthetic-network-demo-${count}-towers.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function DataSourceConsole() {
  const [datasetKey, setDatasetKey] = useState(DATASET_DEFINITIONS[0].key);
  const dataset = DATASET_DEFINITIONS.find(item => item.key === datasetKey) ?? DATASET_DEFINITIONS[0];
  const [method, setMethod] = useState<"manual" | "api" | "sftp" | "database">(
    "manual"
  );
  const [sourceName, setSourceName] = useState("");
  const [connectionRef, setConnectionRef] = useState("");
  const [secretEnv, setSecretEnv] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"info" | "success" | "error">("info");
  const showNotice = (message: string, tone: "info" | "success" | "error" = "info") => { setNotice(message); setNoticeTone(tone); };
  const [schemaPreview, setSchemaPreview] = useState<string[]>([]);
  const [rowErrors, setRowErrors] = useState<string[]>([]);
  const [lastRunId, setLastRunId] = useState(0);
  const [mappingText, setMappingText] = useState("{}");
  const utils = trpc.useUtils();
  const { data: sources, isLoading: sourcesLoading, error: sourcesError, refetch: refetchSources } = trpc.data.sources.useQuery();
  const datasetSources = sources?.filter(source => source.datasetKey === datasetKey) ?? [];
  const { data: runs, isLoading: runsLoading, error: runsError, refetch: refetchRuns } = trpc.data.importRuns.useQuery({ datasetKey });
  const register = trpc.data.registerSource.useMutation({
    onSuccess: () => { showNotice("Source configuration saved. Add credentials through server secrets before connecting.", "success"); void utils.data.sources.invalidate(); },
    onError: e => showNotice("Source configuration could not be saved. Check the source name and connection reference, then retry.", "error"),
  });
  const testConnection = trpc.data.testConnection.useMutation({
    onSuccess: result => showNotice(result.ok ? result.message : connectionFailureGuidance(method, result.message), result.ok ? "success" : "error"),
    onError: e => showNotice(connectionFailureGuidance(method, e.message), "error"),
    onSettled: () => { void utils.data.sources.invalidate(); },
  });
  const saveMapping = trpc.data.saveMapping.useMutation({
    onSuccess: () => showNotice("Field mapping saved to the import run.", "success"),
    onError: e => showNotice("Field mapping could not be saved. Confirm the JSON and import run, then retry.", "error"),
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
      showNotice(`Received ${result.fileName}: ${result.rowCount} rows, ${result.validRows} valid, ${result.invalidRows} invalid.`, result.invalidRows ? "error" : "success");
    },
    onError: e => showNotice("The file could not be processed. Confirm the format, encoding, and required fields, then retry.", "error"),
  });
  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !sourceName.trim()) {
      showNotice("Enter a source name before selecting a file.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      upload.mutate({
              datasetKey,
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
      <section className="dataset-workspace-selector">
        <div className="module-subhead"><b>Dataset workspace</b><span>Each section has its own source boundary</span></div>
        <label className="dataset-select-label"><span>Choose the dataset you want to load</span><select value={datasetKey} onChange={event => { setDatasetKey(event.target.value); setSchemaPreview([]); setRowErrors([]); setLastRunId(0); }} aria-label="Dataset workspace">{DATASET_DEFINITIONS.map(item => <option value={item.key} key={item.key}>{item.section} · {item.label}</option>)}</select></label>
        <div className="dataset-documentation">
          <div><span className="section-kicker">DATA DOCUMENTATION</span><h2>{dataset.label}</h2><p>{dataset.description}</p></div>
          <button type="button" className="action-chip" onClick={() => downloadDatasetTemplate(dataset)}>Download template</button>
          <div className="dataset-doc-grid"><div><b>Required fields</b><span>{dataset.required.join(" · ")}</span></div><div><b>Optional fields</b><span>{dataset.optional.join(" · ") || "None documented"}</span></div><div><b>Accepted intake</b><span>{dataset.formats}</span></div><div><b>Relationships</b><span>{dataset.relationships.join(" · ")}</span></div><div><b>Used by</b><span>{dataset.consumers.join(" · ")}</span></div></div>
        </div>
        {datasetKey === "network-sites" && <div className="synthetic-demo-card"><div><span className="section-kicker">ISOLATED TEST DATA</span><h2>Synthetic Network Demo</h2><p>Generate a clearly labelled CSV with 5,250 synthetic towers for load testing and upload-flow validation. It is not inserted into live analytics automatically.</p></div><div className="synthetic-demo-actions"><button type="button" className="action-chip" onClick={() => window.location.href = "/synthetic-demo"}>Open live demo</button><button type="button" className="action-chip" onClick={() => downloadSyntheticNetworkDemo(5250)}>Generate 5,250 towers</button></div></div>}
      </section>
      <div className="module-subhead">
        <b>Connected sources</b>
        <span className={sourcesLoading ? "loading-inline" : ""}>
          {sourcesLoading ? <><Loader2 size={11} className="spin" /> Loading sources</> : `${sources?.length || 0} configured`}
        </span>
      </div>
      {sourcesError && (
        <div className="module-feedback error connection-feedback" role="alert">
          <AlertCircle size={15} />
          <div><b>Sources could not be loaded</b><span>{connectionFailureGuidance("database", sourcesError.message)}</span></div>
          <button type="button" onClick={() => refetchSources()}>Retry</button>
        </div>
      )}
      {!sourcesLoading && !sourcesError && !datasetSources.length && (
        <div className="module-state">
          No source has been configured yet. Add your first API, SFTP, database,
          or file source below.
        </div>
      )}
      {datasetSources.map(source => {
        const statusKey = source.status.toLowerCase().replace(/\s+/g, "-");
        const sourceType = source.type.toLowerCase();
        return (
          <article className="source-card" key={source.id}>
            <div className="source-card-main">
              <div className="source-identity"><b>{source.name}</b><small>{source.type} · {source.records} records</small></div>
              <div className="source-card-actions">
                <span className={`status-badge status-${statusKey}`}><i />{sourceStatusLabel(source.status)}</span>
                {sourceType !== "manual" && source.connectionRef && <button type="button" className="source-test-btn" disabled={testConnection.isPending} onClick={() => testConnection.mutate({ sourceId: Number(source.id), type: sourceType as "api" | "sftp" | "database", connectionRef: source.connectionRef || "", secretEnv: source.secretEnv || undefined })}>{testConnection.isPending ? <><Loader2 size={11} className="spin" /> Checking</> : "Test now"}</button>}
              </div>
            </div>
            <div className="source-observability">
              <span><Clock3 size={12} /><b>Response</b> {formatLatency(source.latencyMs)}</span>
              <span><CheckCircle2 size={12} /><b>Last successful check</b> {formatSuccessfulCheck(source.lastSuccessfulCheckAt)}</span>
            </div>
          </article>
        );
      })}
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
            placeholder={`${dataset.label} source name`}
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
      {method !== "manual" && (
        <label className="intake-wide">
          <span>Server secret name</span>
          <input value={secretEnv} onChange={e => setSecretEnv(e.target.value.toUpperCase())} placeholder="e.g. OSS_DATABASE_URL" autoComplete="off" />
        </label>
      )}
      <div className="intake-actions">
        {method === "manual" && (
          <label className="upload-btn">
            <input
              type="file"
              accept=".csv,.json,.xlsx,.xls"
              disabled={upload.isPending}
              onChange={handleFile}
            />
            {upload.isPending ? <><Loader2 size={13} className="spin" /> Processing file...</> : "Choose CSV, JSON or spreadsheet"}
          </label>
        )}
        <button
          className="action-chip"
          disabled={!sourceName.trim() || register.isPending}
          onClick={() =>
            register.mutate({
              datasetKey,
              name: sourceName.trim(),
              type: method,
              connectionRef: connectionRef.trim() || undefined,
              secretEnv: secretEnv.trim() || undefined,
            })
          }
        >
          {register.isPending ? <><Loader2 size={13} className="spin" /> Saving source...</> : "Save source"}
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
            {testConnection.isPending ? <><Loader2 size={13} className="spin" /> Testing connection...</> : "Test connection"}
          </button>
        )}
      </div>
      <small className="intake-help">
        For API, SFTP, and database sources, store credentials as server secrets
        and keep only the non-sensitive reference here.
      </small>
      {notice && <div className={`module-feedback ${noticeTone === "error" ? "error" : ""} ${noticeTone === "success" ? "success" : ""}`} role={noticeTone === "error" ? "alert" : "status"}>{noticeTone === "error" ? <AlertCircle size={15} /> : noticeTone === "success" ? <CheckCircle2 size={15} /> : <Loader2 size={15} className="feedback-info-icon" />}<span>{notice}</span></div>}
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
                    showNotice("Mapping must be valid JSON. Check commas, quotes, and braces before saving.", "error");
                  }
                }}
              >
                {saveMapping.isPending ? <><Loader2 size={13} className="spin" /> Saving mapping...</> : "Save mapping"}
              </button>
            </div>
          )}
        </div>
      )}
      <div className="module-subhead">
        <b>Import history</b>
        <span className={runsLoading ? "loading-inline" : ""}>{runsLoading ? <><Loader2 size={11} className="spin" /> Loading import history</> : `${runs?.length || 0} runs`}</span>
      </div>
      {runsError && <div className="module-feedback error connection-feedback" role="alert"><AlertCircle size={15} /><div><b>Import history could not be loaded</b><span>{connectionFailureGuidance("database", runsError.message)}</span></div><button type="button" onClick={() => refetchRuns()}>Retry</button></div>}
      {!runsLoading && !runsError && !runs?.length && (
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

function UserManagementPanel() {
  const utils = trpc.useUtils();
  const usersQuery = trpc.admin.users.useQuery();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [resetTarget, setResetTarget] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const refreshUsers = () => void utils.admin.users.invalidate();
  const createUser = trpc.admin.createUser.useMutation({
    onSuccess: () => {
      setFeedback({ message: "User created successfully and is ready for local sign-in.", tone: "success" });
      setUsername(""); setName(""); setEmail(""); setPassword(""); setRole("user");
      refreshUsers();
    },
    onError: error => setFeedback({ message: error.message || "User could not be created. Check the form and try again.", tone: "error" }),
  });
  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { setFeedback({ message: "User role updated successfully.", tone: "success" }); refreshUsers(); },
    onError: error => setFeedback({ message: error.message || "User role could not be updated.", tone: "error" }),
  });
  const resetPassword = trpc.admin.resetPassword.useMutation({
    onSuccess: () => { setFeedback({ message: "Password reset successfully. Share the new temporary password securely.", tone: "success" }); setResetTarget(null); setNewPassword(""); },
    onError: error => setFeedback({ message: error.message || "Password could not be reset.", tone: "error" }),
  });
  const setActive = trpc.admin.setActive.useMutation({
    onSuccess: result => { setFeedback({ message: result.isActive ? "Account enabled successfully." : "Account disabled successfully.", tone: "success" }); refreshUsers(); },
    onError: error => setFeedback({ message: error.message || "Account status could not be updated.", tone: "error" }),
  });
  const filteredUsers = useMemo(() => filterUsers(usersQuery.data ?? [], search, roleFilter, statusFilter), [usersQuery.data, search, roleFilter, statusFilter]);

  return (
    <div className="user-management-panel">
      <div className="user-management-head">
        <div><span className="section-kicker">IDENTITY CONTROL</span><h2>Create and manage users</h2><p>Use local credentials, manage account access, and assign the access role before the user signs in.</p></div>
        <ShieldCheck size={24} />
      </div>
      <form className="user-create-form" onSubmit={event => { event.preventDefault(); setFeedback(null); createUser.mutate({ username, name, email: email || undefined, password, role }); }}>
        <label><span>Full name</span><input value={name} onChange={event => setName(event.target.value)} placeholder="Network Operations" required /></label>
        <label><span>Username</span><input value={username} onChange={event => setUsername(event.target.value.toLowerCase())} placeholder="network.ops" pattern="[a-z0-9._-]{3,80}" required /></label>
        <label><span>Email <em>optional</em></span><input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="ops@example.com" /></label>
        <label><span>Temporary password</span><input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Minimum 8 characters" minLength={8} required /></label>
        <label><span>Role</span><select value={role} onChange={event => setRole(event.target.value as "user" | "admin")}><option value="user">User — operational access</option><option value="admin">Admin — full management access</option></select></label>
        <button className="primary-action user-create-submit" type="submit" disabled={createUser.isPending}>{createUser.isPending ? <><Loader2 size={14} className="spin" /> Creating user…</> : "Create user"}</button>
      </form>
      <p className="user-form-hint">Passwords are hashed server-side. Password values never appear in the user list or audit payload.</p>
      {feedback && <div className={`module-feedback ${feedback.tone}`}>{feedback.message}</div>}
      <div className="user-list-head"><div><span className="section-kicker">ACCESS DIRECTORY</span><h2>Saved users</h2></div><span>{filteredUsers.length} of {usersQuery.data?.length || 0} accounts</span></div>
      <div className="user-directory-controls">
        <label className="user-search"><Search size={14} /><span className="sr-only">Search users</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, username, or email" /></label>
        <label><span className="sr-only">Filter by role</span><select value={roleFilter} onChange={event => setRoleFilter(event.target.value as "all" | "user" | "admin")}><option value="all">All roles</option><option value="admin">Admins</option><option value="user">Users</option></select></label>
        <label><span className="sr-only">Filter by status</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as "all" | "active" | "disabled")}><option value="all">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option></select></label>
      </div>
      {usersQuery.isLoading ? <div className="module-state"><Loader2 size={16} className="spin" /> Loading users…</div> : usersQuery.error ? <div className="module-feedback error">Unable to load users. Refresh the page or check the database connection. {usersQuery.error.message}</div> : usersQuery.data?.length ? filteredUsers.length ? <div className="user-directory">{filteredUsers.map(user => <div className={`user-directory-row ${user.isActive ? "" : "is-disabled"}`} key={user.id}><div className="user-directory-main"><div className="user-directory-identity"><div className="user-avatar">{(user.name || user.username || "U").charAt(0).toUpperCase()}</div><div><b>{user.name || "Unnamed user"}</b><small>@{user.username || "—"} {user.email ? `· ${user.email}` : ""}</small></div></div><span className={`user-status-badge ${user.isActive ? "active" : "disabled"}`}><span />{user.isActive ? "Active" : "Disabled"}</span></div><div className="user-directory-management"><div className="user-directory-role"><select aria-label={`Role for ${user.username || user.id}`} value={user.role} disabled={updateRole.isPending || setActive.isPending} onChange={event => updateRole.mutate({ userId: user.id, role: event.target.value as "user" | "admin" })}><option value="user">User</option><option value="admin">Admin</option></select><small>Last sign-in: {user.lastSignedIn ? new Date(user.lastSignedIn).toLocaleString() : "Never"}</small><small className={user.temporaryPasswordExpiresAt && new Date(user.temporaryPasswordExpiresAt).getTime() <= Date.now() ? "password-expired" : "password-expiry"}><Clock3 size={11} /> {temporaryPasswordLabel(user.temporaryPasswordExpiresAt ? new Date(user.temporaryPasswordExpiresAt) : null)}</small></div><div className="user-row-actions"><button type="button" className="user-row-action" onClick={() => { setResetTarget(resetTarget === user.id ? null : user.id); setNewPassword(""); setFeedback(null); }} disabled={resetPassword.isPending}><KeyRound size={13} /> Reset password</button><button type="button" className={`user-row-action ${user.isActive ? "danger" : "enable"}`} onClick={() => setActive.mutate({ userId: user.id, isActive: !user.isActive })} disabled={setActive.isPending}><>{user.isActive ? <UserX size={13} /> : <UserCheck size={13} />}</> {user.isActive ? "Disable" : "Enable"}</button></div></div>{resetTarget === user.id && <form className="reset-password-inline" onSubmit={event => { event.preventDefault(); resetPassword.mutate({ userId: user.id, password: newPassword }); }}><input type="password" aria-label={`New password for ${user.username || user.id}`} value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="New password · minimum 8 characters" minLength={8} required /><button type="submit" className="user-row-action enable" disabled={resetPassword.isPending}>{resetPassword.isPending ? <><Loader2 size={13} className="spin" /> Saving…</> : "Save password"}</button><button type="button" className="user-row-action" onClick={() => { setResetTarget(null); setNewPassword(""); }}>Cancel</button></form>}</div>)}</div> : <div className="module-state">No users match the current search and filters.</div> : <div className="module-state">No users found. Create the first local account above.</div>}
    </div>
  );
}

export default function ModulePage({ slug }: { slug: string }) {
  const [, navigate] = useLocation();
  const { data: permissions, isLoading } = trpc.auth.permissions.useQuery();
  const { data: liveSources } = trpc.data.sources.useQuery(undefined, {
    enabled: slug === "data-management",
  });
  const { data: managedUsers } = trpc.admin.users.useQuery(undefined, {
    enabled: slug === "user-management" && Boolean(permissions?.grants?.includes("users.manage")),
  });
  const { data: dashboardSummary } = trpc.dashboard.summary.useQuery(undefined, {
    enabled: Boolean(permissions),
  });
  const item = modules[slug] || modules.network;
  const liveMetric = dashboardSummary ? ({
    "executive-overview": `${dashboardSummary.networkHealth.toFixed(1)}%`,
    network: `${dashboardSummary.networkHealth.toFixed(1)}%`,
    customers: `${(dashboardSummary.customers / 1_000_000).toFixed(2)}M`,
    complaints: dashboardSummary.openComplaints.toLocaleString(),
    "business-revenue": `$${(dashboardSummary.revenueAtRisk / 1_000_000).toFixed(2)}M`,
  } as Record<string, string>)[slug] : undefined;
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
          {slug === "data-management" ? liveSources?.length || 0 : slug === "user-management" ? managedUsers?.length || 0 : liveMetric || item.metric}
        </strong>
        <span>{item.metricLabel}</span>
        <ArrowUpRight size={18} />
      </section>
      {slug === "data-management" ? (
        <section className="standalone-panel">
          <DataSourceConsole />
        </section>
      ) : slug === "user-management" ? (
        <section className="standalone-panel">
          <UserManagementPanel />
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
