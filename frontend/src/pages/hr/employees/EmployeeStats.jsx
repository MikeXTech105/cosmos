import { Building2, UserCheck, UserRound, UserX } from "lucide-react";

import {
  HR_EMPLOYEE_STATUS_KEY,
  getEmployeeStatusKey,
} from "../../../utils/hrEnums";
import { HrStatCard } from "../HrShared";

const EmployeeStats = ({ employees, total }) => {
  const active = employees.filter(
    (employee) =>
      getEmployeeStatusKey(employee.status, employee.statusName) ===
      HR_EMPLOYEE_STATUS_KEY.ACTIVE,
  ).length;
  const resigned = employees.filter(
    (employee) =>
      getEmployeeStatusKey(employee.status, employee.statusName) ===
      HR_EMPLOYEE_STATUS_KEY.RESIGNED,
  ).length;
  const departmentCount = new Set(
    employees.map((employee) => employee.departmentId).filter(Boolean),
  ).size;

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <HrStatCard icon={UserRound} label="Total Employees" value={total} />
      <HrStatCard
        icon={UserCheck}
        label="Active"
        value={active}
        colorClass="bg-emerald-50 text-emerald-600"
      />
      <HrStatCard
        icon={UserX}
        label="Resigned"
        value={resigned}
        colorClass="bg-amber-50 text-amber-600"
      />
      <HrStatCard
        icon={Building2}
        label="Departments"
        value={departmentCount}
        colorClass="bg-brand-light text-brand"
      />
    </div>
  );
};

export default EmployeeStats;
