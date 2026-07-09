import { Archive, FolderKanban, FolderOpen } from "lucide-react";

import { InventoryStatCard } from "../InventoryShared";

const CategoryStats = ({ active, inactive, total }) => {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <InventoryStatCard
        icon={FolderKanban}
        label="Total Categories"
        value={total}
        colorClass="bg-brand-light text-brand"
      />
      <InventoryStatCard
        icon={FolderOpen}
        label="Active"
        value={active}
        colorClass="bg-emerald-50 text-emerald-600"
      />
      <InventoryStatCard
        icon={Archive}
        label="Inactive"
        value={inactive}
        colorClass="bg-red-50 text-red-500"
      />
    </div>
  );
};

export default CategoryStats;
