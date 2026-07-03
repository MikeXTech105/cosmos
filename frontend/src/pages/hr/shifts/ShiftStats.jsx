import { Moon, SunMedium, Timer } from "lucide-react";

import { HrStatCard } from "../HrShared";

const ShiftStats = ({ day, night, total }) => {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <HrStatCard icon={Timer} label="Total Shifts" value={total} />
      <HrStatCard
        icon={SunMedium}
        label="Day Shifts"
        value={day}
        colorClass="bg-amber-50 text-amber-600"
      />
      <HrStatCard
        icon={Moon}
        label="Night Shifts"
        value={night}
        colorClass="bg-brand-light text-brand"
      />
    </div>
  );
};

export default ShiftStats;
