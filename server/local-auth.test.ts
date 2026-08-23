import { describe, expect, it } from "vitest";
import { scryptSync } from "node:crypto";
import { verifyLocalPassword } from "./db";

describe("local authentication", () => {
  it("accepts the correct password hash and rejects an incorrect password", () => {
    const hash = scryptSync("admin", "smart-analytics-local-v1", 64).toString("hex");
    expect(verifyLocalPassword("admin", hash)).toBe(true);
    expect(verifyLocalPassword("not-admin", hash)).toBe(false);
  });

  it("rejects missing or malformed password hashes safely", () => {
    expect(verifyLocalPassword("admin", null)).toBe(false);
    expect(verifyLocalPassword("admin", "not-a-hex-hash")).toBe(false);
  });
});
