import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  listLocalUsers: vi.fn(),
  createLocalUser: vi.fn(),
  updateLocalUserRole: vi.fn(),
}));
vi.mock("./db", () => dbMocks);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(role: "admin" | "user"): TrpcContext {
  return {
    user: { id: 1, openId: `test-${role}`, email: `${role}@example.com`, name: role, loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("admin user management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.listLocalUsers.mockResolvedValue([{ id: 2, username: "ops", name: "Operations", email: null, role: "user", createdAt: new Date(), lastSignedIn: new Date() }]);
    dbMocks.createLocalUser.mockResolvedValue({ id: 3, username: "analyst", name: "Network Analyst", email: null, role: "user", createdAt: new Date(), lastSignedIn: new Date() });
    dbMocks.updateLocalUserRole.mockResolvedValue({ id: 3, username: "analyst", name: "Network Analyst", email: null, role: "admin", createdAt: new Date(), lastSignedIn: new Date() });
  });

  it("lists users for admins and blocks regular users", async () => {
    const result = await appRouter.createCaller(context("admin")).admin.users();
    expect(result[0]?.username).toBe("ops");
    await expect(appRouter.createCaller(context("user")).admin.users()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("creates a local user with the selected role", async () => {
    const result = await appRouter.createCaller(context("admin")).admin.createUser({ username: "analyst", name: "Network Analyst", password: "secure-pass", role: "user" });
    expect(result.role).toBe("user");
    expect(dbMocks.createLocalUser).toHaveBeenCalledWith(expect.objectContaining({ username: "analyst", role: "user", actorUserId: 1 }));
  });

  it("updates an existing user's role and validates password length", async () => {
    const result = await appRouter.createCaller(context("admin")).admin.updateUserRole({ userId: 3, role: "admin" });
    expect(result.role).toBe("admin");
    await expect(appRouter.createCaller(context("admin")).admin.createUser({ username: "short", name: "Short Password", password: "short", role: "user" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
