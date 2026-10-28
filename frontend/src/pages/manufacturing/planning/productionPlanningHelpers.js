import { compareDecimal } from "../../../utils/productionValues";

export const freshnessLabel = value => ({ 1: "Current", 2: "Stale", 3: "Missing", 4: "No demand" })[value] || "Unavailable";
export function selectablePlanningLine(line) {
  return line.freshness === 1 && line.suggestedProduction != null && compareDecimal(line.suggestedProduction, "0") > 0;
}
