import { ShieldCheck, ShieldOff, ShieldPlus } from "lucide-react";
import { memo } from "react";

import MetricCard from "../../../components/common/MetricCard";

const RoleStats = ({ active, inactive, total }) => {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <MetricCard
        icon={ShieldPlus}
        label="Total Roles"
        value={total}
        tone="brand"
      />
      <MetricCard
        icon={ShieldCheck}
        label="Active On Page"
        value={active}
        tone="emerald"
      />
      <MetricCard
        icon={ShieldOff}
        label="Inactive On Page"
        value={inactive}
        tone="red"
      />
    </div>
  );
};

export default memo(RoleStats);
