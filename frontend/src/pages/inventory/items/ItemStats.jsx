import { AlertTriangle, Boxes, Package, Wrench } from "lucide-react";

import { InventoryStatCard } from "../InventoryShared";

const ItemStats = ({ lowStock, products, services, total }) => {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <InventoryStatCard
        icon={Boxes}
        label="Total Items"
        value={total}
        colorClass="bg-brand-light text-brand"
      />
      <InventoryStatCard
        icon={Package}
        label="Products"
        value={products}
        colorClass="bg-brand-light text-brand"
      />
      <InventoryStatCard
        icon={Wrench}
        label="Services"
        value={services}
        colorClass="bg-emerald-50 text-emerald-600"
      />
      <InventoryStatCard
        icon={AlertTriangle}
        label="Low Stock"
        value={lowStock}
        colorClass="bg-amber-50 text-amber-600"
      />
    </div>
  );
};

export default ItemStats;
