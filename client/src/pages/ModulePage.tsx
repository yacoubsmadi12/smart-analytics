import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ArrowUpRight,
  BarChart3,
  Database,
  Gauge,
  Loader2,
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
import { connectionFailureGuidance } from "@/lib/connection-feedback";
import { formatLatency, formatSuccessfulCheck, sourceStatusLabel } from "@/lib/source-observability";

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
  const { data: runs, isLoading: runsLoading, error: runsError, refetch: refetchRuns } = trpc.data.importRuns.useQuery();
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
      {!sourcesLoading && !sourcesError && !sources?.length && (
        <div className="module-state">
          No source has been configured yet. Add your first API, SFTP, database,
          or file source below.
        </div>
      )}
      {sources?.map(source => {
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
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const createUser = trpc.admin.createUser.useMutation({
    onSuccess: () => {
      setFeedback({ message: "User created successfully and is ready for local sign-in.", tone: "success" });
      setUsername(""); setName(""); setEmail(""); setPassword(""); setRole("user");
      void utils.admin.users.invalidate();
    },
    onError: error => setFeedback({ message: error.message || "User could not be created. Check the form and try again.", tone: "error" }),
  });
  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { setFeedback({ message: "User role updated successfully.", tone: "success" }); void utils.admin.users.invalidate(); },
    onError: error => setFeedback({ message: error.message || "User role could not be updated.", tone: "error" }),
  });

  return (
    <div className="user-management-panel">
      <div className="user-management-head">
        <div><span className="section-kicker">IDENTITY CONTROL</span><h2>Create and manage users</h2><p>Use local credentials and assign the access role before the user signs in.</p></div>
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
      <p className="user-form-hint">Passwords are hashed server-side. The password value never appears in the user list or audit payload.</p>
      {feedback && <div className={`module-feedback ${feedback.tone}`}>{feedback.message}</div>}
      <div className="user-list-head"><div><span className="section-kicker">ACCESS DIRECTORY</span><h2>Saved users</h2></div><span>{usersQuery.data?.length || 0} accounts</span></div>
      {usersQuery.isLoading ? <div className="module-state"><Loader2 size={16} className="spin" /> Loading users…</div> : usersQuery.error ? <div className="module-feedback error">Unable to load users. Refresh the page or check the database connection. {usersQuery.error.message}</div> : usersQuery.data?.length ? <div className="user-directory">{usersQuery.data.map(user => <div className="user-directory-row" key={user.id}><div className="user-directory-identity"><div className="user-avatar">{(user.name || user.username || "U").charAt(0).toUpperCase()}</div><div><b>{user.name || "Unnamed user"}</b><small>@{user.username || "—"} {user.email ? `· ${user.email}` : ""}</small></div></div><div className="user-directory-role"><select aria-label={`Role for ${user.username || user.id}`} value={user.role} disabled={updateRole.isPending} onChange={event => updateRole.mutate({ userId: user.id, role: event.target.value as "user" | "admin" })}><option value="user">User</option><option value="admin">Admin</option></select><small>Last sign-in: {user.lastSignedIn ? new Date(user.lastSignedIn).toLocaleString() : "Never"}</small></div></div>)}</div> : <div className="module-state">No users found. Create the first local account above.</div>}
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
