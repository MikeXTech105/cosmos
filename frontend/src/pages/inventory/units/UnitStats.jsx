import { Scale, Scale3D, ScaleIcon } from "lucide-react";

import { InventoryStatCard } from "../InventoryShared";

const UnitStats = ({ active, inactive, metricScope, total, totalScope }) => {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <InventoryStatCard
        icon={Scale}
        label="Total Units"
        value={total}
        scope={totalScope}
        colorClass="bg-brand-light text-brand"
      />
      <InventoryStatCard
        icon={Scale3D}
        label="Active"
        value={active}
        scope={metricScope}
        colorClass="bg-emerald-50 text-emerald-600"
      />
      <InventoryStatCard
        icon={ScaleIcon}
        label="Inactive"
        value={inactive}
        scope={metricScope}
        colorClass="bg-red-50 text-red-500"
      />
    </div>
  );
};

export default UnitStats;
