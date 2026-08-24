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
