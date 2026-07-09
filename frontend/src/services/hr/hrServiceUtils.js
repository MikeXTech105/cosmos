import { sanitizeInventoryListParams } from "../../utils/inventoryQuery";
import { normalizeParams } from "../apiServiceUtils";

export const sanitizeHrListParams = (params = {}, validSortFields = []) => {
  return normalizeParams(
    sanitizeInventoryListParams(params, validSortFields),
  );
};
