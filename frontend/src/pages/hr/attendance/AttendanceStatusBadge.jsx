import { getAttendanceStatusMeta, NOT_MARKED_META } from "./attendanceHelpers";

const AttendanceStatusBadge = ({
  isNotRequired = false,
  isUnavailable = false,
  status,
}) => {
  const meta = isUnavailable
    ? {
        ...NOT_MARKED_META,
        label: "Unavailable",
        pillClass: "bg-amber-50 text-amber-700 ring-amber-200",
      }
    : isNotRequired
      ? {
          ...NOT_MARKED_META,
          label: "Not Required",
          pillClass: "bg-slate-50 text-slate-500 ring-slate-200",
        }
      : status === undefined || status === null
        ? NOT_MARKED_META
        : getAttendanceStatusMeta(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${meta.pillClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
      {meta.label}
    </span>
  );
};

export default AttendanceStatusBadge;
