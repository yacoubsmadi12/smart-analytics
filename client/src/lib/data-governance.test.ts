import { describe, expect, it } from "vitest";
import { datasetDocs } from "@/pages/ModulePage";

describe("data governance dataset documentation", () => {
  it("documents the core source datasets", () => {
    expect(datasetDocs.map(dataset => dataset.name)).toEqual(["Network Sites", "Network KPI", "Complaints", "Customers"]);
  });

  it("defines required fields, ingestion methods, relationships, and consumers", () => {
    for (const dataset of datasetDocs) {
      expect(dataset.methods).toContain("CSV");
      expect(dataset.required.length).toBeGreaterThan(3);
      expect(dataset.relations.length).toBeGreaterThan(20);
      expect(dataset.usedBy.length).toBeGreaterThan(3);
      expect(dataset.impact.length).toBeGreaterThan(20);
    }
    expect(datasetDocs.find(dataset => dataset.name === "Network Sites")?.required).toContain("site_id");
    expect(datasetDocs.find(dataset => dataset.name === "Complaints")?.required).toContain("complaint_id");
  });
});
