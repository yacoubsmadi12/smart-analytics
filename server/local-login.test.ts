import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({ ensureLocalAdmin: vi.fn(), getUserByUsername: vi.fn(), verifyLocalPassword: vi.fn(), createAiConversation: vi.fn(), listAiConversations: vi.fn() }));
const sdkMocks = vi.hoisted(() => ({ signSession: vi.fn() }));
vi.mock("./db", () => dbMocks);
vi.mock("./_core/sdk", () => ({ sdk: sdkMocks }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context() {
  let cookie: { name: string; value: string; options: Record<string, unknown> } | undefined;
  const ctx: TrpcContext = { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { cookie: (name: string, value: string, options: Record<string, unknown>) => { cookie = { name, value, options }; }, clearCookie: () => {} } as TrpcContext["res"] };
  return { ctx, getCookie: () => cookie };
}

describe("auth.localLogin", () => {
  beforeEach(() => { vi.clearAllMocks(); dbMocks.getUserByUsername.mockResolvedValue({ id: 1, openId: "local_admin", username: "admin", passwordHash: "hash", name: "System Administrator", role: "admin" }); dbMocks.verifyLocalPassword.mockReturnValue(true); sdkMocks.signSession.mockResolvedValue("signed-local-session"); });

  it("creates an HttpOnly local session for admin", async () => {
    const { ctx, getCookie } = context();
    const result = await appRouter.createCaller(ctx).auth.localLogin({ username: "admin", password: "admin" });
    expect(result.success).toBe(true);
    expect(sdkMocks.signSession).toHaveBeenCalledOnce();
    expect(getCookie()?.value).toBe("signed-local-session");
    expect(getCookie()?.options).toMatchObject({ httpOnly: true, maxAge: 43200000 });
  });

  it("rejects an invalid password", async () => {
    dbMocks.verifyLocalPassword.mockReturnValue(false);
    const { ctx } = context();
    await expect(appRouter.createCaller(ctx).auth.localLogin({ username: "admin", password: "wrong" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(sdkMocks.signSession).not.toHaveBeenCalled();
  });
});
