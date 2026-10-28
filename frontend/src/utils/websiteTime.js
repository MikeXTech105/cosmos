// Website APIs name these values *Utc. SQL DATETIME2 can serialize without a suffix;
// retain that UTC contract instead of interpreting it in the workstation's timezone.
export const websiteUtcDate = (value) => {
  if (!value) return null;
  const text = String(value);
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(text) ? `${text}Z` : text;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};
