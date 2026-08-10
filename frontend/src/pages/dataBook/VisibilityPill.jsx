import { Globe, Lock } from "lucide-react";

const VisibilityPill = ({ isPrivate }) => {
  const Icon = isPrivate ? Lock : Globe;

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        isPrivate
          ? "border border-amber-200 bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-600",
      ].join(" ")}
    >
      <Icon className="h-3 w-3" />
      {isPrivate ? "Private" : "Public"}
    </span>
  );
};

export default VisibilityPill;
