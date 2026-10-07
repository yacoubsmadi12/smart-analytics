export type DataMode = "demo" | "imported";

let activeDataMode: DataMode =
  process.env.DATA_MODE === "imported" ? "imported" : "demo";

export function getDataMode(): DataMode {
  return activeDataMode;
}

export function setDataMode(mode: DataMode): DataMode {
  activeDataMode = mode;
  return activeDataMode;
}

export function isDemoMode(): boolean {
  return activeDataMode === "demo";
}
