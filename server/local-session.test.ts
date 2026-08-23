import { describe, expect, it } from "vitest";
import { ensureLocalAdmin } from "./db";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";

describe("local admin session", () => {
  it("handles local admin bootstrap safely when no database is configured", async () => {
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      expect(await ensureLocalAdmin()).toBeUndefined();
    } finally {
      if (original === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = original;
    }
  });

  it("signs and verifies a local session payload without OAuth", async () => {
    const token = await sdk.signSession({ openId: "local_admin", appId: ENV.appId, name: "System Administrator" });
    const session = await sdk.verifySession(token);
    expect(session).toMatchObject({ openId: "local_admin", appId: ENV.appId, name: "System Administrator" });
  });
});
