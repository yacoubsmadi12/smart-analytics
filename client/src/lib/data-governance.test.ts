import { describe, expect, it } from "vitest";
import { DATASET_DEFINITIONS } from "@/pages/ModulePage";
import {
  buildSyntheticBusinessRevenue,
  buildSyntheticComplaints,
  buildSyntheticCustomerExperience,
  buildSyntheticCustomers,
  buildSyntheticDashboardSummary,
  buildSyntheticInfrastructure,
  buildSyntheticMarketing,
  buildSyntheticNetworkOperations,
  buildSyntheticPriorities,
  buildSyntheticSales,
  syntheticMapSites,
  SYNTHETIC_TOWER_COUNT,
  SYNTHETIC_UPDATED_AT,
} from "../../../server/synthetic-operations";

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

  it("generates an explicitly synthetic network inventory with more than 5,000 distinct towers", () => {
    const sites = syntheticMapSites(SYNTHETIC_TOWER_COUNT);
    expect(sites).toHaveLength(5250);
    expect(sites[0]?.id).toBe("SYN-00001");
    expect(sites[5249]?.id).toBe("SYN-05250");
    expect(new Set(sites.map(site => site.id)).size).toBe(5250);
    expect(sites.every(site => site.name.includes("Synthetic Tower"))).toBe(true);
  });

  it("feeds every operational department from one labelled synthetic dataset", () => {
    const outputs = [
      buildSyntheticDashboardSummary(),
      buildSyntheticNetworkOperations(),
      buildSyntheticCustomerExperience(),
      buildSyntheticCustomers(),
      buildSyntheticComplaints(),
      buildSyntheticInfrastructure(),
      buildSyntheticSales(),
      buildSyntheticMarketing(),
      buildSyntheticBusinessRevenue(),
      buildSyntheticPriorities(),
    ];
    expect(outputs.every(output => output.source === "synthetic")).toBe(true);
    expect(outputs.every(output => output.updatedAt === SYNTHETIC_UPDATED_AT)).toBe(true);
    expect(buildSyntheticNetworkOperations().summary.cells).toBe(21_000);
    expect(buildSyntheticCustomers().summary.smeCustomers).toBeGreaterThan(0);
    expect(buildSyntheticDashboardSummary().sites).toBe(SYNTHETIC_TOWER_COUNT);
  });
});
