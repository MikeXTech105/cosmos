import { dateTimeOffset } from "../../utils/productionValues";
import { websiteUtcDate } from "../../utils/websiteTime";

export const websiteDateTimeInput = (value, zone) => {
  if (!value || !zone) return "";
  const date = websiteUtcDate(value);
  if (!date) return "";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};
export const websiteScheduleUtc = (value, zone) => {
  if (!value) return null;
  const [date, time] = value.split("T");
  return new Date(dateTimeOffset(date, time, zone)).toISOString();
};
