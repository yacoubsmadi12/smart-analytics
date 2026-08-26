import { describe, expect, it } from "vitest";
import { DATASET_DEFINITIONS, buildSyntheticNetworkDemoRows } from "@/pages/ModulePage";

describe("dataset-scoped data management", () => {
  it("documents every operational dataset with required fields, intake methods, relationships, and consumers", () => {
    expect(DATASET_DEFINITIONS.length).toBeGreaterThanOrEqual(8);
    for (const dataset of DATASET_DEFINITIONS) {
      expect(dataset.key).toMatch(/^[a-z0-9-]+$/);
      expect(dataset.required.length).toBeGreaterThan(0);
      expect(dataset.formats).toContain("CSV");
      expect(dataset.relationships.length).toBeGreaterThan(0);
      expect(dataset.consumers.length).toBeGreaterThan(0);
    }
  });

  it("generates an explicitly synthetic network demo with more than 5,000 distinct towers", () => {
    const rows = buildSyntheticNetworkDemoRows(5250);
    expect(rows).toHaveLength(5250);
    expect(rows[0]).toContain("SYN-00001");
    expect(rows[5249]).toContain("SYN-05250");
    expect(new Set(rows).size).toBe(5250);
    expect(rows.every(row => row.includes("Synthetic Tower"))).toBe(true);
  });
});
