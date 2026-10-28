import useUserPreferences from "../../hooks/useUserPreferences";

const empty = { views: [], columns: null, density: "comfortable" };
export const isRequiredReportColumn = (column, index) => index === 0 || column.required || ["currency", "qty", "quantity", "pill"].includes(column.format) || /unit|status/i.test(String(column.key));
export default function useReportViewPreferences(report) { return useUserPreferences(`report:${report.id}`, empty); }
