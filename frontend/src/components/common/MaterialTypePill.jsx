import {
  getItemClassificationLabel,
  ITEM_CLASSIFICATION,
  normalizeItemClassification,
} from "../../utils/itemClassification";

const MATERIAL_TYPE_TONES = {
  [ITEM_CLASSIFICATION.FinishedProduct]: {
    dot: "bg-sky-500",
    pill: "bg-sky-50 text-sky-700",
  },
  [ITEM_CLASSIFICATION.RawMaterial]: {
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700",
  },
  [ITEM_CLASSIFICATION.Component]: {
    dot: "bg-violet-500",
    pill: "bg-violet-50 text-violet-700",
  },
  [ITEM_CLASSIFICATION.PackingMaterial]: {
    dot: "bg-teal-500",
    pill: "bg-teal-50 text-teal-700",
  },
};

const MATERIAL_TYPE_PILL_BASE =
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap";

const MaterialTypePill = ({ value }) => {
  const normalizedValue = normalizeItemClassification(value);
  const label = getItemClassificationLabel(normalizedValue);

  if (normalizedValue === null) {
    return (
      <span
        className={`${MATERIAL_TYPE_PILL_BASE} border border-dashed border-slate-300 bg-slate-50 text-slate-500`}
      >
        {label}
      </span>
    );
  }

  const tone = MATERIAL_TYPE_TONES[normalizedValue];

  return (
    <span
      className={[
        MATERIAL_TYPE_PILL_BASE,
        tone.pill,
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`}
      />
      {label}
    </span>
  );
};

export default MaterialTypePill;
