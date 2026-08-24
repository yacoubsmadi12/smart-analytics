import { describe, expect, it } from "vitest";
import { TEMPORARY_PASSWORD_TTL_DAYS, temporaryPasswordExpiry } from "./db";

describe("temporary password expiry", () => {
  it("uses the defined seven-day window", () => {
    const issuedAt = new Date("2026-08-24T00:00:00.000Z");
    expect(TEMPORARY_PASSWORD_TTL_DAYS).toBe(7);
    expect(temporaryPasswordExpiry(issuedAt).toISOString()).toBe("2026-08-31T00:00:00.000Z");
  });
});
