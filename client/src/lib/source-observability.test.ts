import { describe, expect, it } from "vitest";
import { formatLatency, formatSuccessfulCheck, sourceStatusLabel } from "./source-observability";

describe("source observability formatting", () => {
  it("maps persisted statuses to visible labels", () => {
    expect(sourceStatusLabel("healthy")).toBe("Connected");
    expect(sourceStatusLabel("warning")).toBe("Needs attention");
    expect(sourceStatusLabel("pending")).toBe("Not tested");
  });
  it("shows latency or an explicit not-tested state", () => {
    expect(formatLatency(184)).toBe("184 ms");
    expect(formatLatency(null)).toBe("Not tested");
  });
  it("shows last successful check or Never", () => {
    expect(formatSuccessfulCheck(null)).toBe("Never");
    expect(formatSuccessfulCheck("2026-08-23T10:00:00.000Z")).toContain("2026");
  });
});
