import { Archive, Building2, FolderOpen } from "lucide-react";

import { HrStatCard } from "../HrShared";

const DepartmentStats = ({ active, inactive, metricScope, total, totalScope }) => {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <HrStatCard
        icon={Building2}
        label="Total Departments"
        value={total}
        scope={totalScope}
      />
      <HrStatCard
        icon={FolderOpen}
        label="Active"
        value={active}
        scope={metricScope}
        colorClass="bg-emerald-50 text-emerald-600"
      />
      <HrStatCard
        icon={Archive}
        label="Inactive"
        value={inactive}
        scope={metricScope}
        colorClass="bg-red-50 text-red-500"
      />
    </div>
  );
};

export default DepartmentStats;
