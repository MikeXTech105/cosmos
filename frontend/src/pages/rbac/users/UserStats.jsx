import { UserCheck, UsersRound, UserX } from "lucide-react";
import { memo } from "react";

import MetricCard from "../../../components/common/MetricCard";

const UserStats = ({ active, inactive, total }) => {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <MetricCard icon={UsersRound} label="Total Users" value={total} tone="brand" />
      <MetricCard icon={UserCheck} label="Active On Page" value={active} tone="emerald" />
      <MetricCard icon={UserX} label="Inactive On Page" value={inactive} tone="red" />
    </div>
  );
};

export default memo(UserStats);
