import { AlertTriangle, Boxes, Package, Wrench } from "lucide-react";

const ItemStats = ({ lowStock, metricScope, products, services, total, totalScope }) => {
  const metrics = [
    { label: "Total Items", value: total, scope: totalScope, Icon: Boxes, tone: "brand" },
    { label: "Products", value: products, scope: metricScope, Icon: Package, tone: "sky" },
    { label: "Services", value: services, scope: metricScope, Icon: Wrench, tone: "green" },
    { label: "Low Stock", value: lowStock, scope: metricScope, Icon: AlertTriangle, tone: "amber" },
  ];
  return <dl className="item-master-stats">{metrics.map(({ label, value, scope, Icon, tone }) => <div key={label} className="item-master-stat"><span className={`item-master-stat-icon ${tone}`}><Icon size={18} aria-hidden="true" /></span><div><dt>{label}</dt><dd>{value ?? "—"}</dd><small>{scope === "all-matching" ? "Across matching items" : "On this page"}</small></div></div>)}</dl>;
};

export default ItemStats;
