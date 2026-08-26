import {
  HR_ATTENDANCE_STATUS,
  HR_ATTENDANCE_STATUS_OPTIONS,
  getHrOptionLabel,
} from "../../../utils/hrEnums";
import { getHrRecordId } from "../hrHelpers";

export const ATTENDANCE_STATUS_META = {
  [HR_ATTENDANCE_STATUS.PRESENT]: {
    calendarClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
    dotClass: "bg-emerald-500",
    label: "Present",
    shortLabel: "P",
    pillClass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  [HR_ATTENDANCE_STATUS.ABSENT]: {
    calendarClass: "border-red-200 bg-red-50 text-red-800",
    dotClass: "bg-red-500",
    label: "Absent",
    shortLabel: "A",
    pillClass: "bg-red-50 text-red-700 ring-red-200",
  },
  [HR_ATTENDANCE_STATUS.HALF_DAY]: {
    calendarClass: "border-amber-200 bg-amber-50 text-amber-800",
    dotClass: "bg-amber-500",
    label: "Half Day",
    shortLabel: "HD",
    pillClass: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  [HR_ATTENDANCE_STATUS.ON_LEAVE]: {
    calendarClass: "border-violet-200 bg-violet-50 text-violet-800",
    dotClass: "bg-violet-500",
    label: "On Leave",
    shortLabel: "L",
    pillClass: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  [HR_ATTENDANCE_STATUS.HOLIDAY]: {
    calendarClass: "border-sky-200 bg-sky-50 text-sky-800",
    dotClass: "bg-sky-500",
    label: "Holiday",
    shortLabel: "H",
    pillClass: "bg-sky-50 text-sky-700 ring-sky-200",
  },
  [HR_ATTENDANCE_STATUS.WEEK_OFF]: {
    calendarClass: "border-slate-200 bg-slate-100 text-slate-700",
    dotClass: "bg-slate-400",
    label: "Week Off",
    shortLabel: "WO",
    pillClass: "bg-slate-100 text-slate-600 ring-slate-200",
  },
  [HR_ATTENDANCE_STATUS.WFH]: {
    calendarClass: "border-cyan-200 bg-cyan-50 text-cyan-800",
    dotClass: "bg-cyan-500",
    label: "Work From Home",
    shortLabel: "WFH",
    pillClass: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  },
};

export const NOT_MARKED_META = {
  calendarClass: "border-dashed border-slate-200 bg-white text-slate-500",
  dotClass: "bg-slate-300",
  label: "Not Marked",
  shortLabel: "—",
  pillClass: "bg-slate-100 text-slate-600 ring-slate-200",
};

export const getAttendanceStatusMeta = (status) => {
  const numericStatus = Number(status);

  return (
    ATTENDANCE_STATUS_META[numericStatus] ?? {
      ...NOT_MARKED_META,
      label: getHrOptionLabel(
        HR_ATTENDANCE_STATUS_OPTIONS,
        numericStatus,
        "Unknown",
      ),
    }
  );
};

export const extractAttendanceItems = (response) => {
  const data = response?.data ?? response;

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return Array.isArray(data) ? data : [];
};

export const getPagedResponseMeta = (response) => {
  const data = response?.data ?? response;
  const items = extractAttendanceItems(response);
  const pageSize = Math.max(1, Number(data?.pageSize) || items.length || 1);
  const totalCount = Number(data?.totalCount) || items.length;

  return {
    pageNumber: Number(data?.pageNumber) || 1,
    pageSize,
    totalCount,
    totalPages:
      Number(data?.totalPages) || Math.max(1, Math.ceil(totalCount / pageSize)),
  };
};

export const getAttendanceDateKey = (value) => {
  if (!value) {
    return "";
  }

  const text = String(value);
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);

  if (match) {
    return match[0];
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return text;
  }

  return formatLocalDateKey(date);
};

export const isEmployeeExpectedOnDate = (employee, dateKey) => {
  if (!dateKey) return true;

  const joiningDate = getAttendanceDateKey(employee?.joiningDate);
  const lastWorkingDate = getAttendanceDateKey(
    employee?.lastWorkingDate ?? employee?.resignedDate,
  );

  if (joiningDate && dateKey < joiningDate) return false;
  if (lastWorkingDate && dateKey > lastWorkingDate) return false;

  return true;
};

export const formatLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const shiftDateKey = (dateKey, amount) => {
  const [year, month, day] = String(dateKey).split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  date.setDate(date.getDate() + amount);

  return formatLocalDateKey(date);
};

export const getMonthBounds = (year, month) => {
  const start = new Date(Number(year), Number(month) - 1, 1, 12);
  const end = new Date(Number(year), Number(month), 0, 12);

  return {
    fromDate: formatLocalDateKey(start),
    toDate: formatLocalDateKey(end),
  };
};

export const shiftMonth = ({ month, year }, amount) => {
  const date = new Date(Number(year), Number(month) - 1 + amount, 1, 12);

  return { month: date.getMonth() + 1, year: date.getFullYear() };
};

export const buildMonthDays = (
  year,
  month,
  todayKey = formatLocalDateKey(new Date()),
) => {
  const lastDay = new Date(Number(year), Number(month), 0, 12).getDate();

  return Array.from({ length: lastDay }, (_, index) => {
    const date = new Date(Number(year), Number(month) - 1, index + 1, 12);
    const key = formatLocalDateKey(date);

    return {
      date,
      dayNumber: index + 1,
      isFuture: key > todayKey,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      key,
    };
  });
};

export const mergeEmployeesWithAttendance = (employees, records, dateKey) => {
  const recordByEmployee = new Map();

  records.forEach((record) => {
    const employeeId = record?.employeeId;

    if (employeeId !== undefined && employeeId !== null) {
      recordByEmployee.set(String(employeeId), record);
    }
  });

  return employees.map((employee) => ({
    employee,
    isExpected: isEmployeeExpectedOnDate(employee, dateKey),
    record:
      recordByEmployee.get(String(getHrRecordId(employee, "employee"))) ?? null,
  }));
};

export const summarizeAttendance = (records) => {
  const summary = {
    absent: 0,
    halfDay: 0,
    holiday: 0,
    leave: 0,
    present: 0,
    weekOff: 0,
    wfh: 0,
  };

  records.forEach((record) => {
    const status = Number(record?.attendanceStatus ?? record?.status);

    if (status === HR_ATTENDANCE_STATUS.PRESENT) summary.present += 1;
    if (status === HR_ATTENDANCE_STATUS.ABSENT) summary.absent += 1;
    if (status === HR_ATTENDANCE_STATUS.HALF_DAY) summary.halfDay += 1;
    if (status === HR_ATTENDANCE_STATUS.ON_LEAVE) summary.leave += 1;
    if (status === HR_ATTENDANCE_STATUS.HOLIDAY) summary.holiday += 1;
    if (status === HR_ATTENDANCE_STATUS.WEEK_OFF) summary.weekOff += 1;
    if (status === HR_ATTENDANCE_STATUS.WFH) summary.wfh += 1;
  });

  return summary;
};

export const formatAttendanceMinutes = (minutes) => {
  const value = Number(minutes);

  if (!Number.isFinite(value) || value <= 0) {
    return "—";
  }

  const hours = Math.floor(value / 60);
  const remainingMinutes = value % 60;

  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};
