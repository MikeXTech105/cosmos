import { useEffect, useState } from "react";
import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import useCapabilities from "../../../hooks/useCapabilities";
import { partyService } from "../../party/partyService";
import { getPartyDisplayName, getPartyType } from "../../party/partyHelpers";
import { getApiErrorMessage } from "../../../utils/apiError";
import { collection } from "./physicalHelpers";
import useProductionText from "../../../hooks/useProductionText";
import { physicalMessages } from "./physicalMessages";
import { usePhysicalContext } from "./physicalHooks";

export function PhysicalLookup({ label, loader, value, onChange, getLabel, filter, disabled = false, allowed = true, allowEmpty = false, selectedOption }) {
  const t = useProductionText(physicalMessages);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ rows: [], loading: false, error: "", total: 0 });
  useEffect(() => {
    if (!allowed) return undefined;
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState((previous) => ({ ...previous, loading: true, error: "" }));
      try {
        const response = await loader({ Search: search, SearchTerm: search, PageNumber: page, PageSize: 50 }, { signal: controller.signal });
        if (active) setState((previous) => ({ rows: page === 1 ? collection(response) : [...previous.rows, ...collection(response)], total: response.data?.totalCount ?? collection(response).length, loading: false, error: "" }));
      } catch (error) { if (active) setState((previous) => ({ ...previous, loading: false, error: getApiErrorMessage(error, "Unable to load choices.") })); }
    }, 250);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [loader, search, page, allowed]);
  const rows = state.rows.filter((row) => !filter || filter(row));
  const options = rows.map((row) => ({ value: row.id, label: getLabel(row) }));
  if (selectedOption && !options.some((option) => String(option.value) === String(selectedOption.value))) options.unshift(selectedOption);
  if (allowEmpty) options.unshift({ value: "", label: t("No supplier filter / default") });
  return <div className="space-y-2"><AppInput label={t("Find {{label}}", { label: t(label).toLowerCase() })} value={search} disabled={!allowed || disabled} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t("Search existing records")} /><AppSelect label={t(label)} value={value} onChange={(id) => onChange(id, rows.find((row) => String(row.id) === String(id)))} options={options} disabled={!allowed || disabled || state.loading} emptyMessage={t(state.loading ? "Loading…" : "No matching records")} />{!allowed && <p className="text-xs text-amber-800">{t("View permission is required for this lookup.")}</p>}{state.error && <p role="alert" className="text-xs text-red-700">{t(state.error)}</p>}{state.rows.length < state.total && <AppButton disabled={disabled || state.loading} variant="ghost" onClick={() => setPage((current) => current + 1)}>{t("Load more choices")}</AppButton>}</div>;
}

const loadSuppliers = (params, options) => partyService.getParties({ ...params, IsActive: true }, options);
const supplierFilter = (row) => ["supplier", "both"].includes(getPartyType(row));
export function SupplierLookup(props) {
  const permission = useCapabilities({ actions: ["view"], pageName: "Party", resource: "Party" });
  const selected = usePhysicalContext(partyService.getPartyById, props.value, permission.canView);
  return <PhysicalLookup label="Supplier" loader={loadSuppliers} getLabel={getPartyDisplayName} filter={supplierFilter} allowed={permission.canView} selectedOption={selected.data ? { value: selected.data.id, label: getPartyDisplayName(selected.data) } : undefined} {...props} />;
}
