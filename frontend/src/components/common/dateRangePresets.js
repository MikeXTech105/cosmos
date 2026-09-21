import { toIsoDate } from "./datePickerUtils";

export const DATE_RANGE_PRESETS = [
  ["today", "Today"], ["yesterday", "Yesterday"],
  ["last7", "Last 7 days"], ["thisWeek", "This week"],
  ["lastWeek", "Last week"], ["last30", "Last 30 days"],
  ["thisMonth", "This month"], ["lastMonth", "Last month"],
  ["yearToDate", "Year to date"], ["lifetime", "Lifetime"],
];

export function getQuickDateRange(preset, now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const start = new Date(end);
  const mondayOffset = (end.getDay() + 6) % 7;
  switch (preset) {
    case "yesterday": start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); break;
    case "last7": start.setDate(start.getDate() - 6); break;
    case "thisWeek": start.setDate(start.getDate() - mondayOffset); break;
    case "lastWeek": start.setDate(start.getDate() - mondayOffset - 7); end.setDate(end.getDate() - mondayOffset - 1); break;
    case "last30": start.setDate(start.getDate() - 29); break;
    case "thisMonth": start.setDate(1); break;
    case "lastMonth": start.setDate(1); start.setMonth(start.getMonth() - 1); end.setDate(0); break;
    case "yearToDate": start.setMonth(0, 1); break;
    case "lifetime": return { fromDate: "", toDate: "" };
    default: break;
  }
  return { fromDate: toIsoDate(start), toDate: toIsoDate(end) };
}
