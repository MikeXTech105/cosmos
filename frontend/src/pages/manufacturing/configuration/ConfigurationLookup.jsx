import { useCallback, useContext } from "react";
import { CompanyDraftScopeContext } from "../../../hooks/companyDraftScopeContext";
import AppLookup from "../../../components/common/AppLookup";
import { lookupPage } from "../../../utils/lookupPage";
import { productionConfigurationService as service } from "../../../services/manufacturing/productionConfigurationService";
import { lookupLabel } from "./configurationHelpers";
import { useConfigurationRead } from "./configurationHooks";

const sources = {
  operations: { list: (params, options) => service.listMasters("operations", params, options), get: (id, options) => service.master("operations", id, options) },
  workCentres: { list: (params, options) => service.listMasters("work-centres", params, options), get: (id, options) => service.master("work-centres", id, options) },
  machines: { list: (...args) => service.machines(...args), get: (...args) => service.machine(...args) },
  moulds: { list: (...args) => service.moulds(...args), get: (...args) => service.mould(...args) },
  shifts: { list: (...args) => service.hrShifts(...args), get: (...args) => service.hrShift(...args) },
  units: { list: (...args) => service.units(...args), get: (...args) => service.unit(...args) },
};
const permission = (kind, context) => !context || (kind === "machines" ? context.canReadMachines : kind === "moulds" ? context.canReadMoulds : kind === "shifts" ? context.canReadShifts : kind === "units" ? context.canReadUnits : true);
const unwrap = (response, kind) => { const data = response.data ?? response; return data[kind === "shifts" ? "shift" : kind.slice(0, -1)] ?? data; };

export default function ConfigurationLookup({ kind, lookupContext, options = [], onChange, disabled, ...props }) {
  const companyScope = useContext(CompanyDraftScopeContext);
  const allowed = permission(kind, lookupContext);
  return <AppLookup {...props} disabled={disabled || !allowed} initialOptions={allowed ? options : []} scopeKey={`${companyScope}:${lookupContext?.scopeKey ?? ""}:${kind}:${allowed}`}
    getOptionValue={(row) => row.value ?? row.id} getOptionLabel={(row) => row.label ?? lookupLabel(row)}
    loadPage={async ({ search, page, pageSize, signal }) => lookupPage(await sources[kind].list({ Search: search, PageNumber: page, PageSize: pageSize, IsActive: true }, { signal }), page, pageSize)}
    loadById={allowed ? async (id, options) => unwrap(await sources[kind].get(id, options), kind) : undefined}
    onChange={(id, row) => { if (row.id) lookupContext?.remember?.(kind, row); onChange?.(id, row); }} />;
}

export function ConfigurationReferenceLabel({ kind, id, lookupContext }) {
  const companyScope = useContext(CompanyDraftScopeContext);
  const existing = lookupContext?.[kind]?.find((row) => String(row.id) === String(id));
  const allowed = permission(kind, lookupContext);
  const load = useCallback((options) => sources[kind].get(id, options), [id, kind]);
  const state = useConfigurationRead(load, `${companyScope}:${lookupContext?.scopeKey ?? ""}:${kind}:${id}`, Boolean(id) && allowed && !existing);
  if (!id) return "—";
  if (!allowed) return <span className="text-slate-500">Restricted resource</span>;
  const record = existing ?? (state.data ? unwrap({ data: state.data }, kind) : null);
  if (record) return <span>{lookupLabel(record)}{record.isActive === false ? " (inactive)" : ""}</span>;
  return state.error ? <button type="button" className="text-xs text-rose-700 underline" onClick={() => state.reload()}>Name unavailable — retry</button> : <span className="text-slate-400">Loading name…</span>;
}
