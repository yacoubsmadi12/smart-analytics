# Smart Analytics

Smart Analytics is a unified Telecom Intelligence command center for network operations, customer experience, sales, marketing, infrastructure, revenue, alerts, reports, governance, and AI-assisted decision support. The interface is English-only and uses a dark Telecom NOC visual system with local authentication and role-based access control.

## Technology

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS 4, Lucide Icons |
| Backend | Express 4, tRPC 11, TypeScript |
| Database | MySQL/TiDB through Drizzle ORM |
| Intelligence | Persisted source data with operational fallback analytics and server-side AI integration |
| Authentication | Local username/password sessions with HttpOnly cookies and RBAC |

## Requirements

Install Node.js 22 or newer, pnpm, and a MySQL-compatible database such as MySQL or TiDB. The project does not require Google credentials for maps in the Manus-hosted environment; the map proxy is configured by the platform.

## Download

Clone the private repository after GitHub access has been granted:

```bash
git clone https://github.com/yacoubsmadi12/smart-analytics.git
cd smart-analytics
```

If GitHub asks for credentials, authenticate with GitHub CLI or use an SSH remote:

```bash
gh auth login
git remote set-url origin git@github.com:yacoubsmadi12/smart-analytics.git
```

## Install dependencies

```bash
pnpm install
```

## Environment configuration

Create a local `.env` file from `.env.example` and fill in the values for your environment. Never commit `.env` or production secrets.

```bash
cp .env.example .env
```

`DATABASE_URL` and `JWT_SECRET` are required for local operation. The built-in Forge variables are required when using the platform AI integration. A strong random value should be used for `JWT_SECRET` in production.

## Database

Generate and apply Drizzle migrations against your own database using the project's database workflow. Confirm the connection string before applying migrations, especially when connecting to a shared or production database.

```bash
pnpm db:push
```

For the managed Manus project, database schema changes should be applied through the project management workflow rather than against a local database by accident.

## Run locally

Start the development server:

```bash
pnpm dev
```

Open the URL printed by Vite, normally `http://localhost:3000`.

The default local administrator is:

| Field | Value |
| --- | --- |
| Username | `admin` |
| Password | `admin` |

Change this password before exposing the application to any non-development user. Additional users and roles can be managed from **User Management** after signing in as an administrator.

## Verify the project

```bash
pnpm check
pnpm test
pnpm build
```

The test suite covers local authentication, authorization boundaries, analytics, data ingestion, user administration, AI history, alerts, reports, and operational decision logic.

## Production start

Build and start the bundled server:

```bash
pnpm build
pnpm start
```

Set `NODE_ENV=production`, use a secure database, configure a strong `JWT_SECRET`, and place the application behind HTTPS before production use. Do not commit credentials, uploaded source data, database dumps, or generated build artifacts.

## Main modules

The application includes Executive Overview, Intelligence Map, Network, Customer Experience, Customers, Complaints, Infrastructure / Fiber, Sales, Marketing, Business & Revenue, Priorities, AI Assistant, Alerts, Reports, Data Management, User Management, System Settings, and Audit Logs.

## Data management

Data Management accepts manual CSV, JSON, and spreadsheet imports and provides source configuration, schema preview, validation feedback, mapping, import history, connection observability, and source status indicators. API, SFTP, and database references must use server-side secret configuration; credentials should never be entered into ordinary browser fields or committed to the repository.

## Security notes

This repository is intended to remain private. Keep `.env` files, JWT secrets, database URLs, API keys, SFTP credentials, and customer-level source data outside version control. Review roles and permissions before inviting additional users, and rotate the default administrator password immediately in a real deployment.

## License

Internal project. Add the organization's approved license and contribution policy before making the repository public.
