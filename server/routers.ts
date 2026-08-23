import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { createAiConversation, ensureLocalAdmin, getUserByUsername, listAiConversations, verifyLocalPassword } from "./db";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";

const permissionsByRole: Record<string, string[]> = { admin: ["dashboard.view", "map.view", "network.view", "customers.view", "complaints.view", "infrastructure.view", "sales.view", "marketing.view", "revenue.view", "ai.ask", "ai.export", "data.view", "data.import", "users.manage", "roles.manage", "settings.manage", "audit.view"], user: ["dashboard.view", "map.view", "network.view", "customers.view", "complaints.view", "infrastructure.view", "ai.ask", "ai.export"] };

const priorities = [
  { id: "P-001", area: "Amman West", issue: "4G congestion at 3 cells", score: 94, customers: 8420, revenue: 286000, action: "Capacity upgrade", severity: "critical" },
  { id: "P-002", area: "Irbid Central", issue: "Fiber outage correlation", score: 88, customers: 2180, revenue: 119000, action: "Dispatch fiber crew", severity: "high" },
  { id: "P-003", area: "Zarqa North", issue: "Complaint surge · Internet slow", score: 82, customers: 5740, revenue: 84000, action: "Tune radio parameters", severity: "high" },
  { id: "P-004", area: "Aqaba Coast", issue: "Enterprise churn risk", score: 76, customers: 34, revenue: 192000, action: "Assign retention squad", severity: "medium" },
  { id: "P-005", area: "Salt Heights", issue: "Backhaul utilization > 90%", score: 71, customers: 3100, revenue: 63000, action: "Activate microwave link", severity: "medium" },
];

const mapSites = [
  { id: "AMW-042", name: "Amman West", lat: 31.9539, lng: 35.9106, status: "healthy", availability: 98.6, traffic: 1.42, congestion: 94 },
  { id: "IRC-118", name: "Irbid Central", lat: 32.5556, lng: 35.8497, status: "warning", availability: 96.1, traffic: 0.86, congestion: 76 },
  { id: "ZN-233", name: "Zarqa North", lat: 32.0728, lng: 36.088, status: "critical", availability: 91.4, traffic: 1.1, congestion: 89 },
  { id: "AQ-019", name: "Aqaba Coast", lat: 29.5321, lng: 35.0063, status: "healthy", availability: 99.2, traffic: 0.64, congestion: 44 },
];

const adminOnly = (user: { role: string }) => {
  if (user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin permission required" });
};

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    localLogin: publicProcedure.input(z.object({ username: z.string().min(1).max(80), password: z.string().min(1).max(200) })).mutation(async ({ ctx, input }) => {
      await ensureLocalAdmin();
      const account = await getUserByUsername(input.username.trim().toLowerCase());
      if (!account || !verifyLocalPassword(input.password, account.passwordHash)) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
      const token = await sdk.signSession({ openId: account.openId, appId: ENV.appId, name: account.name || account.username || "Administrator" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 1000 * 60 * 60 * 12 });
      return { success: true, user: { name: account.name, role: account.role } } as const;
    }),
    permissions: protectedProcedure.query(({ ctx }) => ({ role: ctx.user.role, grants: permissionsByRole[ctx.user.role] ?? ["dashboard.view"], menu: permissionsByRole[ctx.user.role]?.map(permission => permission.split(".")[0]) ?? ["dashboard"] })),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  dashboard: router({
    summary: protectedProcedure.query(() => ({ networkHealth: 94.8, sites: 1284, customers: 2840000, openComplaints: 1842, cxRisk: 18.4, revenueAtRisk: 1280000, updatedMinutesAgo: 2 })),
    priorities: protectedProcedure.input(z.object({ limit: z.number().min(1).max(10).default(5) }).optional()).query(({ input }) => priorities.slice(0, input?.limit ?? 5)),
  }),
  map: router({
    sites: protectedProcedure.input(z.object({ statuses: z.array(z.string()).optional() }).optional()).query(({ input }) => input?.statuses?.length ? mapSites.filter(s => input.statuses?.includes(s.status)) : mapSites),
    siteDetails: protectedProcedure.input(z.object({ siteId: z.string() })).query(({ input }) => mapSites.find(s => s.id === input.siteId) ?? null),
  }),
  ai: router({
    ask: protectedProcedure.input(z.object({ question: z.string().min(2).max(2000), domain: z.enum(["network", "cx", "sales", "general"]).default("general") })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && input.domain === "general") throw new TRPCError({ code: "FORBIDDEN", message: "Choose a permitted intelligence domain" });
      const response = await invokeLLM({ messages: [{ role: "system", content: `You are Smart Analytics decision assistant. Answer only from the user's permitted ${input.domain} telecom intelligence context. Do not invent records, expose credentials, or claim actions were executed. Give concise recommendations with assumptions.` }, { role: "user", content: input.question }] });
      const answer = typeof response.choices?.[0]?.message?.content === "string" ? response.choices[0].message.content : "No answer available";
      await createAiConversation({ userId: ctx.user.id, domain: input.domain, question: input.question, answer });
      return { answer, domain: input.domain, loggedAt: new Date() };
    }),
    history: protectedProcedure.input(z.object({ domain: z.string().optional() }).optional()).query(({ ctx, input }) => listAiConversations(ctx.user.id, input?.domain)),
  }),
  data: router({
    sources: protectedProcedure.query(({ ctx }) => { adminOnly(ctx.user); return [{ id: "src-network", name: "Network OSS", type: "API", status: "healthy", lastSync: "2 min ago", records: 1284000 }, { id: "src-cx", name: "CX & Complaints", type: "SFTP", status: "healthy", lastSync: "8 min ago", records: 18420 }, { id: "src-commercial", name: "Commercial CRM", type: "Database", status: "warning", lastSync: "31 min ago", records: 8420 }]; }),
    validate: protectedProcedure.input(z.object({ sourceId: z.string() })).mutation(({ ctx, input }) => { adminOnly(ctx.user); return { sourceId: input.sourceId, valid: true, checkedAt: new Date(), issues: 0 }; }),
    integrations: protectedProcedure.query(({ ctx }) => { adminOnly(ctx.user); return [{ id: "int-map", provider: "Google Maps", scope: "GIS proxy", status: "connected", lastChecked: "just now" }, { id: "int-ai", provider: "Manus LLM", scope: "Decision assistant", status: "connected", lastChecked: "2 min ago" }]; }),
  }),
  admin: router({
    accessCheck: protectedProcedure.query(({ ctx }) => { adminOnly(ctx.user); return { allowed: true, role: ctx.user.role }; }),
    auditSummary: protectedProcedure.query(({ ctx }) => { adminOnly(ctx.user); return { events24h: 184, failedLogins: 3, imports: 12, lastEvent: "Permission policy updated" }; }),
  }),
});

export type AppRouter = typeof appRouter;
