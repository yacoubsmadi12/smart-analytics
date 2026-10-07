export function formatPercent(
  value: number | null | undefined,
  digits = 1
): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value)))
    return "—";
  return `${Number(value).toFixed(digits)}%`;
}

export function formatJod(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value)))
    return "—";
  const amount = Number(value);
  if (Math.abs(amount) >= 1_000_000)
    return `${(amount / 1_000_000).toFixed(2)}M JOD`;
  if (Math.abs(amount) >= 1_000) return `${Math.round(amount / 1_000)}K JOD`;
  return `${Math.round(amount).toLocaleString("en-US")} JOD`;
}

export function formatCompact(
  value: number | null | undefined,
  digits = 1
): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value)))
    return "—";
  const amount = Number(value);
  if (Math.abs(amount) >= 1_000_000)
    return `${(amount / 1_000_000).toFixed(digits)}M`;
  if (Math.abs(amount) >= 1_000) return `${(amount / 1_000).toFixed(digits)}K`;
  return Math.round(amount).toLocaleString("en-US");
}

export function formatNumber(
  value: number | null | undefined,
  digits = 0
): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value)))
    return "—";
  return Number(value).toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
}
