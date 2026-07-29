import { Archive, BadgeCheck, FolderOpen } from "lucide-react";

import { HrStatCard } from "../HrShared";

const DesignationStats = ({
  active,
  inactive,
  loading = false,
  metricScope,
  total,
  totalScope,
}) => {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      <HrStatCard
        icon={BadgeCheck}
        label="Total Designations"
        loading={loading}
        value={total}
        scope={totalScope}
      />
      <HrStatCard
        icon={FolderOpen}
        label="Active"
        loading={loading}
        value={active}
        scope={metricScope}
        colorClass="bg-emerald-50 text-emerald-600"
      />
      <HrStatCard
        icon={Archive}
        label="Inactive"
        loading={loading}
        value={inactive}
        scope={metricScope}
        colorClass="bg-red-50 text-red-500"
      />
    </div>
  );
};

export default DesignationStats;
