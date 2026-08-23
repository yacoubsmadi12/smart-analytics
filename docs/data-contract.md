# Smart Analytics Data Contract

## Finding from the attached Sigma file

The attached file is a product and module specification. It describes the required domains, measures, relationships, and example fields, but it does not contain an actual CSV, XLSX, JSON, database schema DDL, API specification, or SFTP sample payload. Therefore, Smart Analytics must treat the examples as field requirements and must not load them as production records.

## Required source domains

| Domain | Minimum source entities | Required analytical fields |
|---|---|---|
| Network | sites, cells, KPI observations | site/cell identifiers, technology, timestamp, availability, traffic, congestion, throughput, latitude, longitude |
| Customer Experience | complaints, CX events | complaint identifier, customer reference, category, severity, status, timestamp, site/cell or geography |
| Customers | customer profile/segment | customer reference, segment, region/geography, churn risk, lifetime value |
| Infrastructure | fiber nodes/links, backhaul | node/link identifiers, endpoints, status, capacity, availability, coordinates, planned upgrade |
| Sales | opportunities | opportunity identifier, customer reference, stage, value, probability, region, related site |
| Marketing | campaigns and target areas | campaign identifier, target geography/segment, budget, conversion, status, period |
| Revenue | realized and at-risk revenue | period, region, actual revenue, at-risk revenue, customer/opportunity references |

## Accepted intake methods

Manual upload accepts CSV, JSON, XLSX, and XLS files. CSV and JSON are parsed server-side for field discovery and row validation; spreadsheet files are stored for parser and mapping review. API, SFTP, and database sources store only non-sensitive connection references in the application. Credentials must remain in server-side secrets and are never accepted by the browser contract.

## Mapping rule

A source field must be mapped explicitly to a Smart Analytics field before it can feed a module. Unmapped fields remain source metadata and must not silently alter dashboard metrics. Import runs preserve the detected schema, row counts, validation errors, mapping JSON, storage key, status, and audit event.

## Required data to provide for a live connection

To activate a real source, provide the source type, a non-sensitive endpoint or remote path, the expected schema/sample payload, authentication method, and the server-side secret name. Do not paste passwords or API tokens into the UI or into this document.
