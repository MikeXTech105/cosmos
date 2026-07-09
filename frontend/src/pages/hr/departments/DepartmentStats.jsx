import { Archive, Building2, FolderOpen } from "lucide-react";

import { HrStatCard } from "../HrShared";

const DepartmentStats = ({ active, inactive, total }) => {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <HrStatCard
        icon={Building2}
        label="Total Departments"
        value={total}
      />
      <HrStatCard
        icon={FolderOpen}
        label="Active"
        value={active}
        colorClass="bg-emerald-50 text-emerald-600"
      />
      <HrStatCard
        icon={Archive}
        label="Inactive"
        value={inactive}
        colorClass="bg-red-50 text-red-500"
      />
    </div>
  );
};

export default DepartmentStats;
