import { describe, expect, it } from "vitest";
import { isTemporaryPasswordExpired, temporaryPasswordLabel } from "./password-expiration";

describe("temporary password UI state", () => {
  const now = new Date("2026-08-24T00:00:00.000Z");

  it("shows remaining time for a temporary password", () => {
    expect(isTemporaryPasswordExpired(new Date("2026-08-28T00:00:00.000Z"), now)).toBe(false);
    expect(temporaryPasswordLabel(new Date("2026-08-28T00:00:00.000Z"), now)).toBe("Temporary password expires in 4d");
  });

  it("marks an expired temporary password as requiring a reset", () => {
    expect(isTemporaryPasswordExpired(new Date("2026-08-23T23:59:00.000Z"), now)).toBe(true);
    expect(temporaryPasswordLabel(new Date("2026-08-23T23:59:00.000Z"), now)).toContain("expired");
  });

  it("keeps legacy or permanent passwords without a temporary expiry", () => {
    expect(isTemporaryPasswordExpired(null, now)).toBe(false);
    expect(temporaryPasswordLabel(null, now)).toBe("Standard password — no temporary expiry");
  });
});
