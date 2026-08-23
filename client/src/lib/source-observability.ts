const statusLabels: Record<string, string> = {
  healthy: "Connected",
  warning: "Needs attention",
  pending: "Not tested",
  critical: "Critical",
  offline: "Offline",
};

export function sourceStatusLabel(status: string) {
  return statusLabels[status.toLowerCase()] || "Unknown";
}

export function formatLatency(latencyMs: number | null | undefined) {
  return latencyMs === null || latencyMs === undefined ? "Not tested" : `${latencyMs} ms`;
}

export function formatSuccessfulCheck(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "Never";
}
