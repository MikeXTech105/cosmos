import { FileCheck2, Files, FileX2, FolderTree } from "lucide-react";
import { memo } from "react";

import MetricCard from "../../../components/common/MetricCard";

const PageStats = ({ active, inactive, topLevel, total }) => {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        icon={Files}
        label="Total Pages"
        value={total}
        tone="brand"
      />
      <MetricCard
        icon={FileCheck2}
        label="Active"
        value={active}
        tone="emerald"
      />
      <MetricCard
        icon={FileX2}
        label="Inactive"
        value={inactive}
        tone="red"
      />
      <MetricCard
        icon={FolderTree}
        label="Top-level"
        value={topLevel}
        tone="amber"
      />
    </div>
  );
};

export default memo(PageStats);
