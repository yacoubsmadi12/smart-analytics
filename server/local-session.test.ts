import { describe, expect, it } from "vitest";
import { ensureLocalAdmin } from "./db";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";

describe("local admin session", () => {
  it("bootstraps the local admin account when a database is available", async () => {
    const account = await ensureLocalAdmin();
    if (!account) return;
    expect(account.username).toBe("admin");
    expect(account.role).toBe("admin");
    expect(account.loginMethod).toBe("local");
  });

  it("signs and verifies a local session payload without OAuth", async () => {
    const token = await sdk.signSession({ openId: "local_admin", appId: ENV.appId, name: "System Administrator" });
    const session = await sdk.verifySession(token);
    expect(session).toMatchObject({ openId: "local_admin", appId: ENV.appId, name: "System Administrator" });
  });
});
