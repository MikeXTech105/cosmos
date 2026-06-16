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
        colorClass="bg-indigo-50 text-indigo-600"
      />
    </div>
  );
};

export default ShiftStats;
