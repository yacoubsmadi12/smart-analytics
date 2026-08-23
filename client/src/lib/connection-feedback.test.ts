import { describe, expect, it } from "vitest";
import { connectionFailureGuidance } from "./connection-feedback";

describe("connectionFailureGuidance", () => {
  it("explains missing server secrets", () => {
    expect(connectionFailureGuidance("database", "The database secret is missing")).toContain("Add the required secret");
  });
  it("explains database reference format errors", () => {
    expect(connectionFailureGuidance("database", "The database secret must contain a mysql:// connection URI")).toContain("Use a mysql:// URI");
  });
  it("explains endpoint timeouts with network checks", () => {
    expect(connectionFailureGuidance("database", "ETIMEDOUT")).toContain("host, port, firewall rules");
  });
  it("explains rejected handshakes with credential guidance", () => {
    expect(connectionFailureGuidance("SFTP", "Database handshake failed")).toContain("server-side credentials");
  });
});
