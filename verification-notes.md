
## Database connection UX update

The Data Management route was visually reviewed at 375x812 and 1280x720 after the UX update. Both layouts remain readable without horizontal overflow. The Import history section shows an animated loading indicator and the source setup controls remain aligned. Connection actions now expose animated progress labels, while feedback messages use success/error icons, alert semantics, actionable guidance, and retry controls for source/import-history query failures.

## Source observability verification

The Data Management source cards were reviewed at 375x812 and 1280x720. The responsive layout keeps the source identity, status badge, response latency, and last successful check readable without horizontal overflow. Empty-state behavior remains clear when no sources are configured; populated cards will show Connected, Needs attention, Not tested, Critical, or Offline badges with the corresponding observability details.

## Source status cards verification

The source observability layout was reviewed at 375x812 and 1280x720. The empty Data Management state remains responsive and readable. Populated source cards use a compact two-row layout: identity and status/test action on the first row, followed by response latency and last successful check details. The responsive CSS collapses observability details into a readable vertical stack on mobile.
