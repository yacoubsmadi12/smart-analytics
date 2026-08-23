export function connectionFailureGuidance(method: string, message: string) {
  const detail = message.toLowerCase();
  if (detail.includes("mysql://")) return "The database reference is invalid. Use a mysql:// URI and keep credentials in the server secret store.";
  if (detail.includes("secret")) return "Server credentials are missing or invalid. Add the required secret in the server environment, then retry.";
  if (detail.includes("timeout") || detail.includes("timed out") || detail.includes("etimedout") || detail.includes("econn")) return `The ${method} endpoint did not respond. Check host, port, firewall rules, and remote availability before retrying.`;
  if (detail.includes("failed") || detail.includes("rejected") || detail.includes("denied")) return `The ${method} endpoint rejected the handshake. Verify the server-side credentials, permissions, and path, then retry.`;
  return `${message}. Verify the non-sensitive reference and server-side secret, then try again.`;
}
