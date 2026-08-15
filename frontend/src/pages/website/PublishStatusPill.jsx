import {
  getPublishStatusLabel,
  getPublishStatusTone,
} from "./websiteStatus";

const TONES = {
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  green: "bg-green-50 text-green-700 ring-green-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
};

const PublishStatusPill = ({ value }) => {
  const tone = getPublishStatusTone(value);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${TONES[tone] ?? TONES.slate}`}
    >
      {getPublishStatusLabel(value)}
    </span>
  );
};

export default PublishStatusPill;
