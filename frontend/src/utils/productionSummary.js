// Summary is an object-valued JsonElement in PagedResult. SQL's FOR JSON aliases
// keep their original Pascal casing through .NET, unlike typed row DTOs.
export function normalizeProductionSummary(value) {
  if (Array.isArray(value)) return value.map(normalizeProductionSummary);
  if (value == null || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key.charAt(0).toLowerCase() + key.slice(1), normalizeProductionSummary(entry)]));
}

export function normalizeProductionRead(value) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return value;
  const result = { ...value };
  if (Object.hasOwn(result, "summary")) result.summary = normalizeProductionSummary(result.summary);
  for (const key of ["rows", "lines"]) {
    if (result[key] && typeof result[key] === "object" && !Array.isArray(result[key])) result[key] = normalizeProductionRead(result[key]);
  }
  return result;
}
