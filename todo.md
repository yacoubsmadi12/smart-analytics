# Project TODO

- [x] Establish Smart Analytics dark Telecom NOC/GIS design system and responsive shell
- [x] Add Arabic/English language toggle with RTL/LTR support
- [x] Build permission-aware sidebar navigation and top command bar
- [x] Replace OAuth with secure local session flow and add server-side authorization helpers
- [x] Extend relational schema for telecom analytics, users, roles, permissions, and audit logs
- [x] Add protected tRPC procedures for dashboard, map, priorities, data sources, audit, and AI
- [x] Build executive overview KPIs, trends, top priorities, and Fix 5 actions
- [x] Build interactive intelligence map with layers, filters, clusters, heatmap styling, and site details
- [x] Build network, customer experience, complaints, infrastructure, sales, marketing, revenue, and priorities views
- [x] Build complaint/network correlation and hotspot analysis presentation
- [x] Build AI decision assistant UI with permission-scoped conversation history
- [x] Build data management, validation, integrations, settings, user management, and audit views
- [x] Add realistic preview data without fabricated reviews, ratings, or testimonials
- [x] Add vitest coverage for authorization and analytics procedures
- [x] Run typecheck, tests, and production build
- [x] Verify desktop and mobile rendering with screenshots
- [x] Save final checkpoint and deliver project version
- [x] Implement permission-derived sidebar/topbar visibility using authenticated user role/permission data
- [x] Add protected tRPC procedures for data sources/integrations management and authorization checks
- [x] Improve intelligence map interactions with real filtering/search, clustering, heatmap styling, and map controls
- [x] Expand Vitest coverage for map queries, AI permission paths, and protected data-management endpoints
- [x] Persist AI conversations in the database and add protected history procedures
- [x] Render AI conversation history with loading, empty, and error states
- [x] Add explicit empty-state UI for AI history when no saved conversations exist
- [x] Handle and render AI history query errors in the AI assistant drawer
- [x] Add tests for the ai.history procedure and persisted conversation flow
- [x] Add a Vitest test that persists an AI conversation and verifies it is returned by ai.history
- [x] Add a Vitest test confirming conversation history is scoped by user and domain
- [x] Wire map layer controls and Explore search to real map data behavior
- [x] Implement data-driven clustering and heatmap behavior on the map
- [x] Add integrations management UI and connect validation mutations with feedback states
- [x] Add loading, restricted, empty, and error states for admin data/user/audit/settings screens

# Scope Change: independent module pages and local authentication

- [x] Add a dedicated local login page without Gmail/OAuth dependency
- [x] Add server-side local admin authentication with admin/admin bootstrap and session cookie
- [x] Replace frontend auth assumptions with local session state and logout flow
- [x] Add independent route/page content for Executive Overview
- [x] Add independent route/page content for Intelligence Map
- [x] Add independent route/page content for Network
- [x] Add independent route/page content for Customer Experience
- [x] Add independent route/page content for Customers
- [x] Add independent route/page content for Complaints
- [x] Add independent route/page content for Infrastructure / Fiber
- [x] Add independent route/page content for Sales
- [x] Add independent route/page content for Marketing
- [x] Add independent route/page content for Business & Revenue
- [x] Add independent route/page content for Priorities
- [x] Add independent route/page content for AI Assistant
- [x] Add independent route/page content for Alerts
- [x] Add independent route/page content for Reports
- [x] Add independent route/page content for Data Management
- [x] Add independent route/page content for User Management
- [x] Add independent route/page content for System Settings
- [x] Add independent route/page content for Audit Logs
- [x] Add tests for local login, admin bootstrap, protected session, and route authorization
- [x] Verify all module routes on desktop and mobile and save a new checkpoint
- [x] Remove remaining OAuth-specific frontend wiring from main.tsx and client helpers
- [x] Create dedicated page components for each module instead of only shared Home conditional rendering
- [x] Add Vitest coverage for auth.localLogin, ensureLocalAdmin, local session authentication, and route authorization
- [x] Remove or replace unused OAuth redirect logic in client/src/const.ts
- [x] Add named dedicated module page exports for each sidebar module, including Executive Overview
- [x] Test ensureLocalAdmin bootstrap behavior without inserting fixture data
- [x] Test local session authentication and admin authorization after local login

# Theme Motion Update

- [x] Unify login and platform colors into a telecom-inspired visual system
- [x] Add an animated telecom tower to the login hero and platform background
- [x] Add a performant animated network/grid background shared by login and platform
- [x] Add prefers-reduced-motion fallbacks for all new animations
- [x] Verify desktop/mobile visuals and run typecheck/tests/build
- [x] Save a new checkpoint for the theme update
- [x] Verify updated platform/dashboard telecom theme visually on desktop
- [x] Verify updated platform/dashboard telecom theme visually on mobile
- [x] Save fresh checkpoint after platform visual verification

# English-only UI Update

- [x] Remove Arabic language toggle and all Arabic translation strings from the frontend
- [x] Remove RTL state, dir attributes, and Arabic-specific display logic
- [x] Keep all module pages, login, telecom theme, tower, and motion effects in English
- [x] Verify no Arabic UI strings remain and run typecheck/tests/build
- [x] Save a new English-only checkpoint
- [x] Remove all remaining Arabic literals and translation metadata from Home.tsx
- [x] Simplify frontend copy helpers and data structures to English-only shapes
- [x] Search client source for Arabic and RTL matches and confirm zero results
- [x] Refactor Home copy helper and call sites to English-only signatures
- [x] Refactor Home navigation and KPI/module data to remove empty translation fields
- [x] Save a fresh checkpoint after the English-only refactor
- [x] Remove the bilingual Translation type and helper entirely from Home.tsx
- [x] Replace remaining t(...) wrappers with direct English copy in Home.tsx
- [x] Rerun typecheck/tests/build after removing the helper

# Real Data Sources Update

- [x] Inspect and document Sigma data schema and required source datasets
- [x] Add source configuration model for manual upload, API, database, and SFTP methods
- [x] Add secure server-side ingestion endpoints with validation and audit records
- [x] Add file upload and schema preview for CSV/XLSX/JSON in Data Management
- [x] Add API endpoint configuration with secret-backed credentials and test connection action
- [x] Add SFTP configuration with secret-backed credentials and path validation
- [x] Add import runs, row validation errors, mapping, and last-sync status
- [x] Replace hardcoded analytics preview data with persisted imported source data where available
- [x] Add tests for ingestion validation, source authorization, mapping, and audit logging
- [x] Verify Data Management and source setup flows on desktop/mobile and save checkpoint
- [x] Render the real source intake and import history inside the standalone data-management route
- [x] Ensure standalone Data Management uses live source/import queries instead of static preview rows
- [x] Re-test the standalone route after wiring the live data surface

# Data Source Gap Closure

- [x] Add server-side connection-test procedure for API, SFTP, and database references without exposing credentials
- [x] Render uploaded schema fields and row-level validation errors in Data Management
- [x] Add source field-mapping UI and persist mapping definitions
- [x] Update source status and lastSyncAt after successful import/connection test
- [x] Add Vitest coverage for connection-test authorization, mapping, and audit persistence
- [x] Inspect and document the Sigma data contract from the attached specification
- [x] Replace static preview metrics with persisted source-backed records where matching data exists
- [x] Verify Data Management desktop/mobile and save a new checkpoint
- [x] Add live SFTP handshake using a server-side secret environment reference
- [x] Add live MySQL connection handshake using a server-side secret environment reference
- [x] Return CSV row numbers and field-specific validation errors
- [x] Persist and test source/mapping audit records with isolated database mocks
- [x] Avoid source status updates when sourceId is absent or invalid
- [x] Add field-level validation for required identifiers, status values, and numeric KPI fields
- [x] Add Vitest coverage verifying audit-log payloads for source creation and mapping save

# Database Connection UX Update

- [x] Add animated loading states for source loading and database connection tests
- [x] Add clear database connection error messages with actionable guidance
- [x] Add Vitest coverage for connection loading/error presentation helpers
- [x] Verify the updated Data Management flow on desktop and mobile and save a checkpoint

# Source Status Observability Update

- [x] Persist connection latency and last successful check time for each data source
- [x] Return source status observability fields from the protected sources procedure
- [x] Render visible status badges, latency, and last successful check in Data Management
- [x] Add tests for connection observability persistence and formatting
- [x] Verify source cards on desktop/mobile and save a checkpoint

# User Management Repair

- [x] Diagnose why the User Management create-user and role assignment flow is unavailable or failing
- [x] Add a protected create-user procedure with server-side role validation and password hashing
- [x] Build a working User Management create-user form with role selection and clear feedback
- [x] Add tests for admin authorization, validation, user creation, and assigned roles
- [x] Verify User Management on desktop/mobile and save a checkpoint

# User Directory Controls Update

- [x] Add persisted account-active state with safe migration
- [x] Add protected admin procedures for password reset and account disable/enable
- [x] Record password-reset and account-status changes in audit logs
- [x] Add search and role/status filters to the user directory
- [x] Add reset-password and disable/enable controls with clear feedback
- [x] Add tests for authorization, validation, self-protection, and filtering
- [x] Verify the updated user directory on desktop/mobile and save a checkpoint

# Temporary Password Expiration

- [x] Persist temporary-password expiration metadata with a safe migration
- [x] Apply a defined expiration window when creating or resetting temporary passwords
- [x] Reject expired temporary passwords during local login with a clear message
- [x] Show expiration state and remaining time in User Management without exposing secrets
- [x] Add tests for expiration, reset renewal, disabled accounts, and normal passwords
- [x] Verify the expiration UX on desktop/mobile and save a checkpoint
- [x] Fix duplicate Clock3 import and add temporaryPasswordExpiresAt to the user-directory view type

# Intelligence Map Completion

- [x] Replace the standalone Intelligence Map placeholder route with the real interactive map surface
- [x] Add independent map toggles for Sites, 4G, 5G, Fiber, Complaints, Churn, Customers, Revenue Risk, and Sales Opportunities
- [x] Make Site Details dynamic from the selected site and expose network, traffic, congestion, customers, complaints, churn, fiber, sales, and revenue risk
- [x] Pass the selected site context into AI questions and persisted decision history
- [x] Add tests for map layers, dynamic site details, and selected-site AI context
- [x] Verify Intelligence Map on desktop/mobile and save a checkpoint
- [x] Prevent duplicate Google Maps script loading when navigating between map surfaces
- [x] Perform authenticated mobile verification of /intelligence-map after local login, including layer controls and selected-site details
- [x] Save a new checkpoint after the verified Intelligence Map implementation

# Network Operations Completion

- [x] Replace the standalone Network placeholder with a real network operations dashboard
- [x] Add persisted-source-aware cells, sites, technology, availability, traffic, congestion, throughput, and coverage metrics
- [x] Add a Top 10 Worst Cells view with reason, impacted customers, complaints, and fiber context
- [x] Add KPI trends and technology filters for 2G, 3G, 4G, and 5G
- [x] Add tests for worst-cell ranking, impact analysis, and live network summary data
- [x] Verify Network on desktop/mobile and save a checkpoint
- [x] Fix the NetworkCell type import syntax in the persisted network helper
- [x] Fix quoted numeric technology keys in the Network analytics test
- [x] Add Vitest coverage for network.operations covering persisted return and preview fallback boundary

# Customer Experience Operations

- [x] Replace the Customer Experience placeholder with a dedicated CX control room
- [x] Add protected customer-experience operations data with CX risk, churn risk, complaints, customer impact, and area signals
- [x] Add explainable CX risk factors for locations such as Amman West
- [x] Add complaint correlation, bad-experience areas, filters, and selected-area detail analysis
- [x] Add Vitest coverage for CX scoring, ranking, correlation, and tRPC response shape
- [x] Verify Customer Experience on desktop/mobile and save a checkpoint

# Customer Intelligence Operations

- [x] Replace the Customers placeholder with a dedicated customer intelligence dashboard
- [x] Add protected customer segment and density data with total, enterprise, SME, high-value, and high-churn metrics
- [x] Add customer filters for segment, churn risk, region, and proximity to congested cells
- [x] Add a map view showing high-value customers within 1 km of congested cells
- [x] Add Vitest coverage for customer aggregation, filtering, proximity, and tRPC response shape
- [x] Verify Customers on desktop/mobile and save a checkpoint

# Customer Geospatial Detail Closure

- [x] Add customer-level geospatial points or privacy-safe clusters to customer operations results
- [x] Make the 1 km high-value/congested filter plot matching customer points or clusters, not only area markers
- [x] Re-verify Customers desktop/mobile after customer-level map detail and save a new checkpoint
- [x] Save a new checkpoint after the verified Customers geospatial-detail implementation

# Complaints Intelligence Operations

- [x] Replace the Complaints placeholder with a dedicated complaints control room
- [x] Add protected complaint totals, open status, network-related share, categories, severity, growth, and hotspot data
- [x] Correlate complaint hotspots with coverage of worst network cells and explain the affected share
- [x] Add category, severity, region, and network-related filters with selected hotspot detail
- [x] Add Vitest coverage for complaint aggregation, growth, hotspot correlation, and tRPC response shape
- [x] Verify Complaints on desktop/mobile and save a checkpoint
- [x] Align the complaint coverage test with the precise 71.8% calculation and 72% displayed rounding
- [x] Make the Complaints category filter match hotspot categories directly instead of using volume heuristics
- [x] Save a new checkpoint after the verified Complaints Intelligence implementation

# Infrastructure / Fiber Operations

- [x] Replace the Infrastructure / Fiber placeholder with a dedicated infrastructure control room
- [x] Add protected fiber nodes, links, availability, backhaul, microwave, and planned-upgrade data
- [x] Add Fiber Opportunity analysis combining site congestion and fiber availability
- [x] Add recommended infrastructure actions such as Fiber Migration with selected-site detail
- [x] Add Vitest coverage for infrastructure aggregation, opportunity scoring, and tRPC response shape
- [x] Verify Infrastructure / Fiber on desktop/mobile and save a checkpoint

# Sales Intelligence Operations

- [x] Replace the Sales placeholder with a dedicated sales intelligence dashboard
- [x] Add protected opportunity, pipeline, value, enterprise, stage, and customer-location data
- [x] Add network readiness and fiber readiness signals for each sales opportunity
- [x] Add high-value opportunity alerts when nearby sites have network issues
- [x] Add Vitest coverage for sales aggregation, readiness scoring, alerts, and tRPC response shape
- [x] Verify Sales on desktop/mobile and save a checkpoint

# Marketing Intelligence Operations

- [x] Replace the Marketing placeholder with a dedicated marketing intelligence dashboard
- [x] Add protected campaign, target-area, market-potential, performance, 5G-potential, and segment data
- [x] Add area-level churn, complaint, and network signals for campaign readiness
- [x] Add a Customer Experience Risk warning for campaigns targeting high-risk areas
- [x] Add Vitest coverage for campaign aggregation, performance, risk scoring, and tRPC response shape
- [x] Verify Marketing on desktop/mobile and save a checkpoint
- [x] Focus the default Marketing detail on a campaign with Customer Experience Risk when one exists

# Business & Revenue Intelligence Operations

- [x] Replace the Business & Revenue placeholder with a dedicated financial intelligence dashboard
- [x] Add protected revenue-at-risk, customers-at-risk, enterprise-impact, sales-pipeline, and opportunity data
- [x] Add region-level linkage between network health, customer exposure, and monthly revenue risk
- [x] Add revenue opportunities and investment opportunities with recommended actions
- [x] Add Vitest coverage for revenue aggregation, risk scoring, opportunity ranking, and tRPC response shape
- [x] Verify Business & Revenue on desktop/mobile and save a checkpoint

# Daily Priorities Intelligence Operations

- [x] Replace the Priorities placeholder with a dedicated Top 5 decision-support dashboard
- [x] Add protected priority signals combining network, customer, complaints, revenue, and sales impact
- [x] Add explainable priority scoring, severity, affected customers, revenue risk, and recommended action
- [x] Add persisted aggregation with a safe operational preview fallback
- [x] Add Vitest coverage for priority ranking, impact scoring, and tRPC response shape
- [x] Verify Priorities on desktop/mobile and save a checkpoint

# Platform Operations Completion

- [x] Upgrade AI Assistant into a data-grounded conversational decision copilot with map/site context
- [x] Add actionable AI answers for network, complaints, churn, congestion, fiber, and daily priorities questions
- [x] Replace Alerts placeholder with persisted alert records and filterable acknowledge/assign/resolve actions
- [x] Connect alerts to related sites, cells, complaints, revenue risk, and opportunities
- [x] Replace Reports placeholder with report type selection, live summary generation, and CSV export
- [x] Complete Data Management, User Management, System Settings, and Audit Logs gaps shown in the supplied screens
- [x] Add Vitest coverage for AI, alerts, reports, settings, and audit workflows
- [x] Verify all affected modules on desktop/mobile and save a checkpoint

# GitHub Delivery

- [ ] Create a private GitHub repository and push the current Smart Analytics project
- [ ] Verify the remote repository contents and provide download/install/run instructions
