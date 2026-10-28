import { sanitizeInventoryListParams } from "../../utils/inventoryQuery";
import { normalizeParams } from "../apiServiceUtils";
import { idWire } from "../../utils/productionValues";

export const hrCommandIds = (payload, keys = ["employeeId", "attendanceId", "adjustmentId", "leaveApplicationId", "leaveTypeId", "payrollRunId", "departmentId", "designationId", "shiftId", "reportingManagerId", "salaryAssignmentId"]) => ({
  ...payload,
  ...Object.fromEntries(keys.filter((key) => payload?.[key] !== undefined && payload[key] !== null && payload[key] !== "").map((key) => [key, idWire(payload[key])])),
});

export const sanitizeHrListParams = (params = {}, validSortFields = []) => {
  return normalizeParams(
    sanitizeInventoryListParams(params, validSortFields),
  );
};
