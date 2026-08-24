export const TEMPORARY_PASSWORD_TTL_DAYS = 7;

export function isTemporaryPasswordExpired(expiresAt: Date | null | undefined, now = new Date()) {
  return Boolean(expiresAt && expiresAt.getTime() <= now.getTime());
}

export function temporaryPasswordLabel(expiresAt: Date | null | undefined, now = new Date()) {
  if (!expiresAt) return "Standard password — no temporary expiry";
  const remainingMs = expiresAt.getTime() - now.getTime();
  if (remainingMs <= 0) return "Temporary password expired — reset required";
  const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  if (remainingHours < 24) return `Temporary password expires in ${remainingHours}h`;
  const remainingDays = Math.ceil(remainingHours / 24);
  return `Temporary password expires in ${remainingDays}d`;
}
