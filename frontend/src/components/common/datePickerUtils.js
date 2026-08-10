const padNumber = (value) => String(value).padStart(2, "0");

export const parseIsoDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ""));
  if (!match) return null;

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(year, month - 1, day, 12);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

export const toIsoDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";

  return [
    date.getFullYear(),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate()),
  ].join("-");
};

export const formatDatePickerValue = (value, type = "date") => {
  const date = parseIsoDate(value);
  if (!date) return "";

  const formattedDate = [
    padNumber(date.getDate()),
    padNumber(date.getMonth() + 1),
    date.getFullYear(),
  ].join("-");

  if (type !== "datetime-local") return formattedDate;

  const time = String(value).split("T")[1]?.slice(0, 5);
  return time ? `${formattedDate}, ${time}` : formattedDate;
};

export const getCalendarDays = (viewDate) => {
  const monthStart = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth(),
    1,
    12,
  );
  const mondayBasedOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - mondayBasedOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
};

export const isDateWithinBounds = (date, min, max) => {
  const value = toIsoDate(date);
  const minDate = String(min ?? "").slice(0, 10);
  const maxDate = String(max ?? "").slice(0, 10);

  if (minDate && value < minDate) return false;
  if (maxDate && value > maxDate) return false;
  return true;
};

export const clampCalendarView = (date, min, max) => {
  const fallback = new Date();
  let nextDate = date instanceof Date && !Number.isNaN(date.getTime())
    ? new Date(date)
    : fallback;
  const minDate = parseIsoDate(min);
  const maxDate = parseIsoDate(max);

  if (minDate && nextDate < minDate) nextDate = minDate;
  if (maxDate && nextDate > maxDate) nextDate = maxDate;

  return new Date(nextDate.getFullYear(), nextDate.getMonth(), 1, 12);
};

export const getTimeFromDateTimeValue = (value, fallback = "09:00") => {
  return String(value ?? "").split("T")[1]?.slice(0, 5) || fallback;
};
