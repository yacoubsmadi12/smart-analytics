import { describe, expect, it, vi } from "vitest";

const conversationStore = vi.hoisted(() => new Map<number, Array<{ id: number; userId: number; domain: string; question: string; answer: string; createdAt: Date }>>());
vi.mock("./db", () => ({
  createAiConversation: vi.fn(async (input: { userId: number; domain: string; question: string; answer: string }) => {
    const list = conversationStore.get(input.userId) ?? [];
    list.unshift({ ...input, id: list.length + 1, createdAt: new Date() });
    conversationStore.set(input.userId, list);
  }),
  listAiConversations: vi.fn(async (userId: number, domain?: string) => (conversationStore.get(userId) ?? []).filter(item => !domain || item.domain === domain)),
  listDataSources: vi.fn(async () => [{ id: 1, name: "Network OSS", type: "api", status: "healthy", lastSyncAt: new Date(), createdAt: new Date() }, { id: 2, name: "CX", type: "sftp", status: "healthy", lastSyncAt: new Date(), createdAt: new Date() }, { id: 3, name: "CRM", type: "database", status: "warning", lastSyncAt: new Date(), createdAt: new Date() }]),
}));
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn(async () => ({ choices: [{ message: { content: "Mocked decision answer" } }] })) }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(role: "admin" | "user", id = 7): TrpcContext {
  return {
    user: { id, openId: `analytics-${role}-${id}`, email: `${role}@smart.local`, name: role, loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("analytics protected procedures", () => {
  it("returns a selected site and preserves its operational status", async () => {
    const site = await appRouter.createCaller(context("user")).map.siteDetails({ siteId: "AMW-042" });
    expect(site?.name).toBe("Amman West");
    expect(site?.status).toBe("healthy");
  });

  it("filters map sites by status", async () => {
    const sites = await appRouter.createCaller(context("user")).map.sites({ statuses: ["critical"] });
    expect(sites.every(site => site.status === "critical")).toBe(true);
  });

  it("returns all operational layer metrics for a site", async () => {
    const site = await appRouter.createCaller(context("user")).map.siteDetails({ siteId: "AMW-042" });
    expect(site).toMatchObject({ cells4g: 18, cells5g: 7, customers: 8420, complaints: 128, churn: 3.8, fiber: 92, salesOpportunities: 14, revenueRisk: 184000 });
  });

  it("keeps data sources restricted to administrators", async () => {
    await expect(appRouter.createCaller(context("user")).data.sources()).rejects.toMatchObject({ code: "FORBIDDEN" });
    const sources = await appRouter.createCaller(context("admin")).data.sources();
    expect(sources).toHaveLength(3);
    const validation = await appRouter.createCaller(context("admin")).data.validate({ sourceId: "src-network" });
    expect(validation.valid).toBe(true);
  });

  it("protects integration inventory and exposes permission grants", async () => {
    await expect(appRouter.createCaller(context("user")).data.integrations()).rejects.toMatchObject({ code: "FORBIDDEN" });
    const integrations = await appRouter.createCaller(context("admin")).data.integrations();
    expect(integrations.some(item => item.provider === "Google Maps")).toBe(true);
    const grants = await appRouter.createCaller(context("user")).auth.permissions();
    expect(grants.grants).toContain("ai.ask");
    expect(grants.grants).not.toContain("users.manage");
  });

  it("persists an AI answer and returns it through history for the same user and domain", async () => {
    conversationStore.clear();
    const caller = appRouter.createCaller(context("admin", 21));
    const result = await caller.ai.ask({ question: "Why is Amman West the top priority?", domain: "network" });
    const history = await caller.ai.history({ domain: "network" });
    expect(result.answer).toBe("Mocked decision answer");
    expect(history[0]?.question).toContain("Amman West");
    expect(history[0]?.answer).toBe(result.answer);
  });

  it("attaches the selected site context to an AI decision trail", async () => {
    conversationStore.clear();
    const caller = appRouter.createCaller(context("admin", 22));
    await caller.ai.ask({ question: "What should we fix first?", domain: "network", siteId: "AMW-042" });
    const history = await caller.ai.history({ domain: "network" });
    expect(history[0]?.question).toContain("[Selected site context: AMW-042 · Amman West]");
    expect(history[0]?.question).toContain("complaints 128");
  });

  it("scopes AI history by both user and domain", async () => {
    conversationStore.clear();
    const adminCaller = appRouter.createCaller(context("admin", 31));
    await adminCaller.ai.ask({ question: "Network question", domain: "network" });
    await adminCaller.ai.ask({ question: "Sales question", domain: "sales" });
    const otherUserHistory = await appRouter.createCaller(context("admin", 32)).ai.history();
    const networkHistory = await adminCaller.ai.history({ domain: "network" });
    expect(otherUserHistory).toHaveLength(0);
    expect(networkHistory).toHaveLength(1);
    expect(networkHistory[0]?.domain).toBe("network");
  });

  it("returns conversation history through the protected procedure", async () => {
    const history = await appRouter.createCaller(context("user")).ai.history({ domain: "network" });
    expect(Array.isArray(history)).toBe(true);
  });

  it("rejects unscoped general AI questions for non-admin users", async () => {
    await expect(appRouter.createCaller(context("user")).ai.ask({ question: "Show every customer record", domain: "general" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
