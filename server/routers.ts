import { TRPCError } from "@trpc/server";
import { z } from "zod";
import SftpClient from "ssh2-sftp-client";
import mysql from "mysql2/promise";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
  createAiConversation,
  createDataSource,
  createImportRun,
  ensureLocalAdmin,
  getPersistedDashboardSummary,
  getPersistedNetworkOperations,
  getPersistedCustomerExperience,
  getPersistedCustomerOperations,
  getUserByUsername,
  listAiConversations,
  listDataSources,
  listLocalUsers,
  createLocalUser,
  updateLocalUserRole,
  resetLocalUserPassword,
  setLocalUserActive,
  listImportRuns,
  verifyLocalPassword,
} from "./db";
import { storagePut } from "./storage";
import { saveImportMapping, updateDataSourceSync } from "./db";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { createPreviewNetworkOperations } from "./network-analytics";
import { createPreviewCustomerExperience } from "./cx-analytics";
import { createPreviewCustomerOperations } from "./customers-analytics";

const permissionsByRole: Record<string, string[]> = {
  admin: [
    "dashboard.view",
    "map.view",
    "network.view",
    "customers.view",
    "complaints.view",
    "infrastructure.view",
    "sales.view",
    "marketing.view",
    "revenue.view",
    "ai.ask",
    "ai.export",
    "data.view",
    "data.import",
    "users.manage",
    "roles.manage",
    "settings.manage",
    "audit.view",
  ],
  user: [
    "dashboard.view",
    "map.view",
    "network.view",
    "customers.view",
    "complaints.view",
    "infrastructure.view",
    "ai.ask",
    "ai.export",
  ],
};

const priorities = [
  {
    id: "P-001",
    area: "Amman West",
    issue: "4G congestion at 3 cells",
    score: 94,
    customers: 8420,
    revenue: 286000,
    action: "Capacity upgrade",
    severity: "critical",
  },
  {
    id: "P-002",
    area: "Irbid Central",
    issue: "Fiber outage correlation",
    score: 88,
    customers: 2180,
    revenue: 119000,
    action: "Dispatch fiber crew",
    severity: "high",
  },
  {
    id: "P-003",
    area: "Zarqa North",
    issue: "Complaint surge · Internet slow",
    score: 82,
    customers: 5740,
    revenue: 84000,
    action: "Tune radio parameters",
    severity: "high",
  },
  {
    id: "P-004",
    area: "Aqaba Coast",
    issue: "Enterprise churn risk",
    score: 76,
    customers: 34,
    revenue: 192000,
    action: "Assign retention squad",
    severity: "medium",
  },
  {
    id: "P-005",
    area: "Salt Heights",
    issue: "Backhaul utilization > 90%",
    score: 71,
    customers: 3100,
    revenue: 63000,
    action: "Activate microwave link",
    severity: "medium",
  },
];

const mapSites = [
  {
    id: "AMW-042",
    name: "Amman West",
    lat: 31.9539,
    lng: 35.9106,
    status: "healthy",
    availability: 98.6,
    traffic: 1.42,
    congestion: 94,
    cells4g: 18,
    cells5g: 7,
    customers: 8420,
    complaints: 128,
    churn: 3.8,
    fiber: 92,
    salesOpportunities: 14,
    revenueRisk: 184000,
    throughput: 42.8,
  },
  {
    id: "IRC-118",
    name: "Irbid Central",
    lat: 32.5556,
    lng: 35.8497,
    status: "warning",
    availability: 96.1,
    traffic: 0.86,
    congestion: 76,
    cells4g: 14,
    cells5g: 4,
    customers: 6310,
    complaints: 84,
    churn: 5.4,
    fiber: 78,
    salesOpportunities: 9,
    revenueRisk: 96000,
    throughput: 35.2,
  },
  {
    id: "ZN-233",
    name: "Zarqa North",
    lat: 32.0728,
    lng: 36.088,
    status: "critical",
    availability: 91.4,
    traffic: 1.1,
    congestion: 89,
    cells4g: 11,
    cells5g: 2,
    customers: 5140,
    complaints: 176,
    churn: 7.1,
    fiber: 64,
    salesOpportunities: 6,
    revenueRisk: 142000,
    throughput: 21.7,
  },
  {
    id: "AQ-019",
    name: "Aqaba Coast",
    lat: 29.5321,
    lng: 35.0063,
    status: "healthy",
    availability: 99.2,
    traffic: 0.64,
    congestion: 44,
    cells4g: 9,
    cells5g: 3,
    customers: 2980,
    complaints: 22,
    churn: 2.2,
    fiber: 96,
    salesOpportunities: 18,
    revenueRisk: 38000,
    throughput: 51.4,
  },
];

const adminOnly = (user: { role: string }) => {
  if (user.role !== "admin")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin permission required",
    });
};

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    localLogin: publicProcedure
      .input(
        z.object({
          username: z.string().min(1).max(80),
          password: z.string().min(1).max(200),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await ensureLocalAdmin();
        const account = await getUserByUsername(
          input.username.trim().toLowerCase()
        );
        if (account?.isActive === false)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This account is disabled. Contact an administrator.",
          });
        if (account?.temporaryPasswordExpiresAt && account.temporaryPasswordExpiresAt.getTime() <= Date.now())
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This temporary password has expired. Ask an administrator to reset it.",
          });
        if (
          !account ||
          !verifyLocalPassword(input.password, account.passwordHash)
        )
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid username or password",
          });
        const token = await sdk.signSession({
          openId: account.openId,
          appId: ENV.appId,
          name: account.name || account.username || "Administrator",
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 1000 * 60 * 60 * 12,
        });
        return {
          success: true,
          user: { name: account.name, role: account.role },
        } as const;
      }),
    permissions: protectedProcedure.query(({ ctx }) => ({
      role: ctx.user.role,
      grants: permissionsByRole[ctx.user.role] ?? ["dashboard.view"],
      menu: permissionsByRole[ctx.user.role]?.map(
        permission => permission.split(".")[0]
      ) ?? ["dashboard"],
    })),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  dashboard: router({
    summary: protectedProcedure.query(async () =>
      (await getPersistedDashboardSummary()) ?? {
        networkHealth: 94.8,
        sites: 1284,
        customers: 2840000,
        openComplaints: 1842,
        cxRisk: 18.4,
        revenueAtRisk: 1280000,
        updatedMinutesAgo: 2,
      }
    ),
    priorities: protectedProcedure
      .input(
        z.object({ limit: z.number().min(1).max(10).default(5) }).optional()
      )
      .query(({ input }) => priorities.slice(0, input?.limit ?? 5)),
  }),
  map: router({
    sites: protectedProcedure
      .input(z.object({ statuses: z.array(z.string()).optional() }).optional())
      .query(({ input }) =>
        input?.statuses?.length
          ? mapSites.filter(s => input.statuses?.includes(s.status))
          : mapSites
      ),
    siteDetails: protectedProcedure
      .input(z.object({ siteId: z.string() }))
      .query(({ input }) => mapSites.find(s => s.id === input.siteId) ?? null),
  }),
  network: router({
    operations: protectedProcedure.query(async () =>
      (await getPersistedNetworkOperations()) ?? createPreviewNetworkOperations(mapSites)
    ),
  }),
  customerExperience: router({
    operations: protectedProcedure.query(async () =>
      (await getPersistedCustomerExperience()) ?? createPreviewCustomerExperience(mapSites)
    ),
  }),
  customers: router({
    operations: protectedProcedure.query(async () =>
      (await getPersistedCustomerOperations()) ?? createPreviewCustomerOperations(mapSites)
    ),
  }),
  ai: router({
    ask: protectedProcedure
      .input(
        z.object({
          question: z.string().min(2).max(2000),
          domain: z
            .enum(["network", "cx", "sales", "general"])
            .default("general"),
          siteId: z.string().min(1).max(40).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && input.domain === "general")
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Choose a permitted intelligence domain",
          });
        const site = input.siteId ? mapSites.find(item => item.id === input.siteId) : undefined;
        const scopedQuestion = site
          ? `[Selected site context: ${site.id} · ${site.name}] Network availability ${site.availability}%, traffic ${site.traffic} TB, congestion ${site.congestion}% PRB, customers ${site.customers}, complaints ${site.complaints}, churn ${site.churn}%, fiber ${site.fiber}%, revenue risk $${site.revenueRisk.toLocaleString()}, sales opportunities ${site.salesOpportunities}.]\n${input.question}`
          : input.question;
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are Smart Analytics decision assistant. Answer only from the user's permitted ${input.domain} telecom intelligence context. Use the selected site context when provided. Do not invent records, expose credentials, or claim actions were executed. Give concise recommendations with assumptions.`,
            },
            { role: "user", content: scopedQuestion },
          ],
        });
        const answer =
          typeof response.choices?.[0]?.message?.content === "string"
            ? response.choices[0].message.content
            : "No answer available";
        await createAiConversation({
          userId: ctx.user.id,
          domain: input.domain,
          question: scopedQuestion,
          answer,
        });
        return { answer, domain: input.domain, loggedAt: new Date() };
      }),
    history: protectedProcedure
      .input(z.object({ domain: z.string().optional() }).optional())
      .query(({ ctx, input }) =>
        listAiConversations(ctx.user.id, input?.domain)
      ),
  }),
  data: router({
    sources: protectedProcedure.query(async ({ ctx }) => {
      adminOnly(ctx.user);
      const rows = await listDataSources();
      return rows.map(row => ({
        id: String(row.id),
        name: row.name,
        type: row.type.toUpperCase(),
        status: row.status,
        lastSync: row.lastSyncAt ? row.lastSyncAt.toISOString() : "Never",
        latencyMs: row.latencyMs ?? null,
        lastSuccessfulCheckAt: row.lastSuccessfulCheckAt ? row.lastSuccessfulCheckAt.toISOString() : null,
        connectionRef: row.connectionRef,
        secretEnv: row.secretEnv,
        records: 0,
      }));
    }),
    importRuns: protectedProcedure.query(({ ctx }) =>
      listImportRuns(ctx.user.id)
    ),
    registerSource: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2).max(120),
          type: z.enum(["manual", "api", "sftp", "database"]),
          connectionRef: z.string().max(200).optional(),
          secretEnv: z.string().regex(/^[A-Z][A-Z0-9_]{2,80}$/).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        adminOnly(ctx.user);
        await createDataSource({ ...input, userId: ctx.user.id });
        return { success: true };
      }),
    testConnection: protectedProcedure
      .input(
        z.object({
          sourceId: z.number().int().positive().optional(),
          type: z.enum(["api", "sftp", "database"]),
          connectionRef: z.string().min(3).max(200),
          secretEnv: z.string().regex(/^[A-Z][A-Z0-9_]{2,80}$/).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        adminOnly(ctx.user);
        const secret = input.secretEnv ? process.env[input.secretEnv] : undefined;
        if (input.type !== "api" && !secret)
          throw new TRPCError({ code: "BAD_REQUEST", message: "A server-side secretEnv is required for live SFTP or database checks" });
        const startedAt = Date.now();
        if (input.type === "api") {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          try {
            const headers: Record<string, string> = {};
            if (secret) headers.Authorization = `Bearer ${secret}`;
            const response = await fetch(input.connectionRef, { headers, signal: controller.signal });
            const latencyMs = Date.now() - startedAt;
            const checkedAt = new Date();
            if (input.sourceId) await updateDataSourceSync(input.sourceId, response.ok ? "healthy" : "warning", latencyMs);
            return { ok: response.ok, status: response.status, checkedAt, latencyMs, lastSuccessfulCheckAt: response.ok ? checkedAt : undefined, message: response.ok ? "API responded successfully" : "API responded with an error" };
          } catch {
            const latencyMs = Date.now() - startedAt;
            const checkedAt = new Date();
            if (input.sourceId) await updateDataSourceSync(input.sourceId, "warning", latencyMs);
            return { ok: false, status: 0, checkedAt, latencyMs, lastSuccessfulCheckAt: undefined, message: "API connection failed or timed out" };
          } finally { clearTimeout(timeout); }
        }
        if (input.type === "sftp") {
          let target: URL;
          try { target = new URL(input.connectionRef); } catch { throw new TRPCError({ code: "BAD_REQUEST", message: "Use an sftp://host/path reference" }); }
          if (target.protocol !== "sftp:" || !target.hostname || !target.pathname)
            throw new TRPCError({ code: "BAD_REQUEST", message: "Use an sftp://host/path reference" });
          let config: Record<string, unknown>;
          try { config = JSON.parse(secret || "{}"); } catch { throw new TRPCError({ code: "BAD_REQUEST", message: "The SFTP secret must be valid JSON configuration" }); }
          const client = new SftpClient();
          try {
            await client.connect({ host: target.hostname, port: Number(config.port || 22), username: String(config.username || ""), password: config.password ? String(config.password) : undefined, privateKey: config.privateKey ? String(config.privateKey) : undefined });
            await client.list(target.pathname);
            const latencyMs = Date.now() - startedAt;
            const checkedAt = new Date();
            if (input.sourceId) await updateDataSourceSync(input.sourceId, "healthy", latencyMs);
            return { ok: true, status: 200, checkedAt, latencyMs, lastSuccessfulCheckAt: checkedAt, message: "SFTP handshake and remote path check succeeded" };
          } catch { const latencyMs = Date.now() - startedAt; const checkedAt = new Date(); if (input.sourceId) await updateDataSourceSync(input.sourceId, "warning", latencyMs); return { ok: false, status: 0, checkedAt, latencyMs, lastSuccessfulCheckAt: undefined, message: "SFTP handshake or remote path check failed" }; }
          finally { await client.end().catch(() => undefined); }
        }
        const uri = secret || "";
        if (!/^mysql:\/\/.+/.test(uri)) throw new TRPCError({ code: "BAD_REQUEST", message: "The database secret must contain a mysql:// connection URI" });
        let connection: Awaited<ReturnType<typeof mysql.createConnection>> | undefined;
        try { connection = await mysql.createConnection(uri); await connection.query("SELECT 1"); const latencyMs = Date.now() - startedAt; const checkedAt = new Date(); if (input.sourceId) await updateDataSourceSync(input.sourceId, "healthy", latencyMs); return { ok: true, status: 200, checkedAt, latencyMs, lastSuccessfulCheckAt: checkedAt, message: "Database handshake succeeded" }; }
        catch { const latencyMs = Date.now() - startedAt; const checkedAt = new Date(); if (input.sourceId) await updateDataSourceSync(input.sourceId, "warning", latencyMs); return { ok: false, status: 0, checkedAt, latencyMs, lastSuccessfulCheckAt: undefined, message: "Database handshake failed" }; }
        finally { await connection?.end().catch(() => undefined); }
      }),
    saveMapping: protectedProcedure
      .input(
        z.object({
          importRunId: z.number().int().positive(),
          mapping: z.record(z.string(), z.string().min(1)),
        })
      )
      .mutation(async ({ ctx, input }) => {
        adminOnly(ctx.user);
        await saveImportMapping({
          importRunId: input.importRunId,
          userId: ctx.user.id,
          mappingJson: JSON.stringify(input.mapping),
        });
        return { success: true };
      }),
    manualImport: protectedProcedure
      .input(
        z.object({
          sourceId: z.number().int().positive().optional(),
          sourceName: z.string().min(2).max(120),
          fileName: z.string().min(1).max(255),
          mimeType: z.string().max(120),
          base64: z.string().min(1).max(20_000_000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        adminOnly(ctx.user);
        const allowed = /\.(csv|json|xlsx|xls)$/i.test(input.fileName);
        if (!allowed)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only CSV, JSON, XLSX, and XLS files are supported",
          });
        const buffer = Buffer.from(input.base64, "base64");
        if (!buffer.length || buffer.length > 15 * 1024 * 1024)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "File is empty or exceeds the 15 MB limit",
          });
        let rowCount = 0;
        let validRows = 0;
        let invalidRows = 0;
        let schema: string | undefined;
        let errors: string[] = [];
        try {
          if (/\.json$/i.test(input.fileName)) {
            const parsed = JSON.parse(buffer.toString("utf8"));
            const rows = Array.isArray(parsed) ? parsed : [parsed];
            rowCount = rows.length;
            validRows = rows.filter(
              row => row && typeof row === "object"
            ).length;
            invalidRows = rowCount - validRows;
            schema = JSON.stringify(
              Object.keys(
                rows.find(row => row && typeof row === "object") || {}
              )
            );
          } else if (/\.csv$/i.test(input.fileName)) {
            const lines = buffer
              .toString("utf8")
              .split(/\r?\n/)
              .filter(Boolean);
            const headers = (lines.shift() || "")
              .split(",")
              .map(item => item.trim())
              .filter(Boolean);
            rowCount = lines.length;
            schema = JSON.stringify(headers);
            const allowedStatuses = new Set(["healthy", "warning", "degraded", "critical"]);
            const errorsByRow = lines.map((line, index) => { const values = line.split(","); const issues: string[] = []; if (!headers.length || values.length !== headers.length) issues.push(`row ${index + 2}: expected ${headers.length} fields, received ${values.length}`); headers.forEach((header, fieldIndex) => { const value = (values[fieldIndex] || "").trim(); const key = header.toLowerCase(); if (!value) issues.push(`row ${index + 2}, ${header}: value is required`); if (key.includes("status") && value && !allowedStatuses.has(value.toLowerCase())) issues.push(`row ${index + 2}, ${header}: unsupported status`); if ((/availability|congestion|throughput|revenue|value|probability|risk|latitude|longitude|lat|lng/.test(key)) && value && Number.isNaN(Number(value))) issues.push(`row ${index + 2}, ${header}: expected a number`); }); return issues; });
            errors = errorsByRow.flat();
            validRows = errorsByRow.filter(issues => issues.length === 0).length;
            invalidRows = rowCount - validRows;
          } else {
            rowCount = 0;
            schema = JSON.stringify({
              format: "spreadsheet",
              note: "Stored for parser/mapping review",
            });
          }
        } catch {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "The file could not be parsed. Check its format and encoding.",
          });
        }
        const uploaded = await storagePut(
          `smart-analytics/imports/${input.fileName}`,
          buffer,
          input.mimeType || "application/octet-stream"
        );
        const run = await createImportRun({
          sourceId: input.sourceId,
          userId: ctx.user.id,
          method: "manual",
          fileName: input.fileName,
          status: invalidRows ? "validated" : "received",
          rowCount,
          validRows,
          invalidRows,
          schemaJson: schema,
          errorsJson: errors.length ? JSON.stringify(errors) : undefined,
          storageKey: uploaded.key,
        });
        if (input.sourceId)
          await updateDataSourceSync(
            input.sourceId,
            invalidRows ? "warning" : "healthy"
          );
        const importRunId = Number((run as any)?.[0]?.insertId || 0);
        return {
          success: true,
          importRunId,
          fileName: input.fileName,
          rowCount,
          validRows,
          invalidRows,
          schema: schema ? JSON.parse(schema) : [],
          errors,
          storageKey: uploaded.key,
        };
      }),
    validate: protectedProcedure
      .input(z.object({ sourceId: z.string() }))
      .mutation(({ ctx, input }) => {
        adminOnly(ctx.user);
        return {
          sourceId: input.sourceId,
          valid: true,
          checkedAt: new Date(),
          issues: 0,
        };
      }),
    integrations: protectedProcedure.query(({ ctx }) => {
      adminOnly(ctx.user);
      return [
        {
          id: "int-map",
          provider: "Google Maps",
          scope: "GIS proxy",
          status: "connected",
          lastChecked: "just now",
        },
        {
          id: "int-ai",
          provider: "Manus LLM",
          scope: "Decision assistant",
          status: "connected",
          lastChecked: "2 min ago",
        },
      ];
    }),
  }),
  admin: router({
    users: protectedProcedure.query(({ ctx }) => {
      adminOnly(ctx.user);
      return listLocalUsers();
    }),
    createUser: protectedProcedure
      .input(z.object({
        username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,80}$/),
        password: z.string().min(8).max(128),
        name: z.string().trim().min(2).max(160),
        email: z.string().trim().email().max(320).optional(),
        role: z.enum(["user", "admin"]),
      }))
      .mutation(async ({ ctx, input }) => {
        adminOnly(ctx.user);
        try {
          return await createLocalUser({ ...input, actorUserId: ctx.user.id });
        } catch (error) {
          const message = error instanceof Error ? error.message : "User could not be created";
          throw new TRPCError({ code: message === "Username already exists" ? "CONFLICT" : "BAD_REQUEST", message });
        }
      }),
    updateUserRole: protectedProcedure
      .input(z.object({ userId: z.number().int().positive(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ ctx, input }) => {
        adminOnly(ctx.user);
        try {
          const updated = await updateLocalUserRole({ ...input, actorUserId: ctx.user.id });
          if (!updated) throw new Error("User role could not be loaded after update");
          return updated;
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "User role could not be updated" });
        }
      }),
    resetPassword: protectedProcedure
      .input(z.object({ userId: z.number().int().positive(), password: z.string().min(8).max(128) }))
      .mutation(async ({ ctx, input }) => {
        adminOnly(ctx.user);
        try {
          return await resetLocalUserPassword({ ...input, actorUserId: ctx.user.id });
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Password could not be reset" });
        }
      }),
    setActive: protectedProcedure
      .input(z.object({ userId: z.number().int().positive(), isActive: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        adminOnly(ctx.user);
        try {
          const updated = await setLocalUserActive({ ...input, actorUserId: ctx.user.id });
          if (!updated) throw new Error("User status could not be loaded after update");
          return updated;
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "User status could not be updated" });
        }
      }),
    accessCheck: protectedProcedure.query(({ ctx }) => {
      adminOnly(ctx.user);
      return { allowed: true, role: ctx.user.role };
    }),
    auditSummary: protectedProcedure.query(({ ctx }) => {
      adminOnly(ctx.user);
      return {
        events24h: 184,
        failedLogins: 3,
        imports: 12,
        lastEvent: "Permission policy updated",
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
