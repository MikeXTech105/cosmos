import { Archive, BadgeCheck, FolderOpen } from "lucide-react";

import { HrStatCard } from "../HrShared";

const DesignationStats = ({ active, inactive, metricScope, total, totalScope }) => {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <HrStatCard
        icon={BadgeCheck}
        label="Total Designations"
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

export default DesignationStats;
