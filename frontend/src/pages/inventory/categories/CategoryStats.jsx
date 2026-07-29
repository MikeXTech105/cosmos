import { Archive, FolderKanban, FolderOpen } from "lucide-react";

import { InventoryStatCard } from "../InventoryShared";

const CategoryStats = ({ active, inactive, loading, metricScope, total, totalScope }) => {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <InventoryStatCard
        icon={FolderKanban}
        label="Total Categories"
        value={total}
        loading={loading}
        scope={totalScope}
        colorClass="bg-brand-light text-brand"
      />
      <InventoryStatCard
        icon={FolderOpen}
        label="Active"
        value={active}
        loading={loading}
        scope={metricScope}
        colorClass="bg-emerald-50 text-emerald-600"
      />
      <InventoryStatCard
        icon={Archive}
        label="Inactive"
        value={inactive}
        loading={loading}
        scope={metricScope}
        colorClass="bg-red-50 text-red-500"
      />
    </div>
  );
};

export default CategoryStats;
