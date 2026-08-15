import { ACTIVITY_LOG_SECURITY_ACTIONS } from "../../constants/activityLogConstants";
import { ACTIVITY_EMPTY_VALUE } from "../../utils/activityLogPresentation";

const BRAND_VARIANTS = Object.freeze([
  "bg-brand-light text-brand ring-brand/10",
  "bg-brand/10 text-brand ring-brand/20",
  "bg-brand-light text-brand-dark ring-brand/20",
]);

const hashText = (value) => {
  return [...String(value)].reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
};

const getSecurityTreatment = (value) => {
  const canonical = ACTIVITY_LOG_SECURITY_ACTIONS.find(
    (action) => action.toLowerCase() === String(value).toLowerCase(),
  );

  if (!canonical) return "";
  if (canonical === "LoginFailed") {
    return "bg-red-50 text-red-700 ring-red-200";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
};

const ActivityPill = ({ value }) => {
  const text = String(value ?? "").trim();

  if (!text) return <span className="text-slate-400">{ACTIVITY_EMPTY_VALUE}</span>;

  const treatment =
    getSecurityTreatment(text) ||
    BRAND_VARIANTS[hashText(text) % BRAND_VARIANTS.length];

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${treatment}`}
      title={text}
    >
      <span className="truncate">{text}</span>
    </span>
  );
};

export default ActivityPill;
