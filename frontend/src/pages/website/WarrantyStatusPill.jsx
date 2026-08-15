import {
  getWarrantyStatusLabel,
  getWarrantyStatusTone,
} from "./warrantyStatus";

const TONES = {
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  green: "bg-green-50 text-green-700 ring-green-200",
  orange: "bg-orange-50 text-orange-700 ring-orange-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
};

const WarrantyStatusPill = ({ value }) => {
  const tone = getWarrantyStatusTone(value);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${TONES[tone] ?? TONES.slate}`}
    >
      {getWarrantyStatusLabel(value)}
    </span>
  );
};

export default WarrantyStatusPill;
