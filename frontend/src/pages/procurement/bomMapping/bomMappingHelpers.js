import { manufacturingBomService } from "../../../services/manufacturing/manufacturingService";
import { getApiStatus } from "../../../utils/apiError";

export const manufacturingBomLink = (itemId, bomId) =>
  `/items/${itemId}/edit?tab=manufacturing${bomId ? `&bomId=${bomId}` : ""}`;

export const issueRemediation = (issue) => {
  const code = String(issue?.issueType ?? issue?.code ?? "").toUpperCase();
  if (code === "MISSING_BOM") return { title: "No active effective Manufacturing BOM", action: "Create or activate a BOM" };
  if (code === "BOM_HAS_NO_COMPONENTS") return { title: "BOM has no components", action: "Edit BOM components" };
  if (code === "INACTIVE_COMPONENT") return { title: "Inactive component", action: "Review BOM components" };
  return { title: issue?.issueTypeName ?? code ?? "Needs attention", action: "Review Manufacturing BOM" };
};

export const legacyBomConflictMessage = (error) => getApiStatus(error) === 409
  ? "Procurement BOM editing has moved to Manufacturing. Open the Manufacturing BOM to make changes."
  : null;

export const loadApplicableBom = async (productId, asOfDate) => {
  try {
    const response = await manufacturingBomService.applicable(productId, asOfDate);
    return { bom: response?.data ?? response, missing: false };
  } catch (error) {
    if (getApiStatus(error) === 404) return { bom: null, missing: true };
    throw error;
  }
};
