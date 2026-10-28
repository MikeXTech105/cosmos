import api from "../manufacturing/productionApi";
import { unwrapResponse } from "../apiServiceUtils";
import { decimalWire, idWire } from "../../utils/productionValues";

const base = "/api/hr/setup";
const get = async (path, params) => unwrapResponse(await api.get(`${base}/${path}`, { params }));
const save = async (path, id, payload) => unwrapResponse(await (id ? api.put(`${base}/${path}/${id}`, payload) : api.post(`${base}/${path}`, payload)));
export const hrSetupService = {
  adjustments: () => get("attendance-adjustments"),
  runs: (params) => get("payroll-runs", params),
  leaveTypes: () => get("leave-types"),
  saveLeaveType: (id, value) => save("leave-types", id, { ...value, annualQuota: decimalWire(value.annualQuota, { scale: 2, integerDigits: 6 }) }),
  components: () => get("salary-components"),
  saveComponent: (id, value) => save("salary-components", id, { ...value, componentType: Number(value.componentType) }),
  structures: () => get("salary-structures"),
  saveStructure: (id, value) => save("salary-structures", id, { ...value, components: value.components.map((row) => ({ salaryComponentId: idWire(row.salaryComponentId), amount: decimalWire(row.amount, { scale: 2, integerDigits: 16 }) })) }),
  assignments: (employeeId) => get("salary-assignments", { employeeId: employeeId || undefined }),
  assign: (value) => save("salary-assignments", null, { ...value, employeeId: idWire(value.employeeId), salaryStructureId: idWire(value.salaryStructureId) }),
  entitlements: (employeeId) => get(`leave-entitlements/${employeeId}`),
  saveEntitlement: async (value) => unwrapResponse(await api.put(`${base}/leave-entitlements`, { ...value, employeeId: idWire(value.employeeId), leaveTypeId: idWire(value.leaveTypeId), openingBalance: decimalWire(value.openingBalance, { scale: 2, integerDigits: 6 }) })),
  preflight: (period) => get("payroll-preflight", period),
  payrollRates: (period) => get("payroll-rates", period),
};
