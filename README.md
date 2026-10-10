# SmartAnalytics — Zain Jordan

SmartAnalytics is an executive **Network + Commercial Intelligence** workspace for Zain Jordan. It connects synthetic network quality, customers, complaints, revenue, marketing and sales signals into decision-ready views.

> **Important:** The default workspace uses synthetic/demo data. It does not represent production OSS, CRM, billing or customer records.

## Product areas

- **Executive Overview** — KPI strip, decision queue, system pulse, network impact, SWOT and executive insight cards.
- **Network Intelligence** — RF performance across 2G/3G/4G/5G, KPI trends, regional correlation and bottleneck thresholds.
- **Coverage & Opportunity Map** — Jordan network map with sites, 4G/5G, fiber, complaints, churn, customer and revenue-risk layers.
- **Problem Areas Map** — map view for operational flags and priority hotspots.
- **Customer Intelligence** — customer experience, customer records and merged complaint intelligence.
- **Business Intelligence** — business/revenue, marketing and sales readiness.
- **Operations** — priorities, alerts and controlled reports.
- **Administration** — data sources, user management, system settings and audit logs.

## Technology

- React + TypeScript + Vite
- Express + tRPC
- Drizzle ORM
- Recharts
- Wouter routing
- Google Maps / visual map fallback
- Vitest server tests

## Local development

```bash
pnpm install
pnpm dev
```

The development server runs on port `3000` by default. Production validation:

```bash
pnpm check
pnpm build
pnpm test
```

## Demo access

The local demo account is provisioned by the server seed configuration. Use the credentials configured for the current workspace; never connect production credentials or customer data to the synthetic mode.

## Data and privacy

- JOD is the financial display currency.
- The operational timezone is **Asia/Amman**.
- Synthetic data is clearly marked in the workspace.
- Customer targeting and commercial workflows must respect consent and role permissions.
- Decision buttons are workflow demonstrations unless a real backend workflow is explicitly connected.

## Configuration

Thresholds and scoring weights are controlled from **System Settings**. Network settings include PRB congestion thresholds, throughput degradation thresholds, complaint/churn signals and decision-score weighting.

## External integrations

The UI is prepared for clean data-service replacement with OSS/PM counters, CRM, billing, complaints systems, email and scheduled reporting. No production integration is assumed by the demo build.
