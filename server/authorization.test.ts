import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(role: "admin" | "user"): TrpcContext {
  return {
    user: { id: 1, openId: `test-${role}`, email: `${role}@example.com`, name: role, loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("server authorization", () => {
  it("allows an authenticated user to read dashboard priorities without requiring seeded records", async () => {
    const result = await appRouter.createCaller(context("user")).dashboard.priorities({ limit: 5 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("rejects non-admin access to audit summary", async () => {
    await expect(appRouter.createCaller(context("user")).admin.auditSummary()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows admin access to audit summary", async () => {
    const result = await appRouter.createCaller(context("admin")).admin.auditSummary();
    expect(result.events24h).toBeGreaterThanOrEqual(0);
  });
});
