import {
  Box,
  Download,
  Eye,
  Package,
  Pencil,
  Plus,
  RotateCw,
  Star,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import DataTableShell, {
  DATA_TABLE_HEADER_CLASS,
  DATA_TABLE_ROW_ACTION_CLASS,
  DATA_TABLE_ROW_ACTION_DANGER_CLASS,
} from "../../../components/common/DataTableShell";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import AppTooltip from "../../../components/common/AppTooltip";
import PageHeader from "../../../components/common/PageHeader";
import StatCards from "../../../components/common/StatCards";
import { supplyChainPackagingProfileService } from "../../../services/supplyChain/packagingProfileService";
import {
  fetchSupplyChainPackagingProfiles,
  setPackagingFilters,
  setPackagingPage,
  setPackagingPageSize,
} from "../../../store/slices/supplyChain/packagingProfileSlice";
import { getApiErrorMessage, isConflictError } from "../../../utils/apiError";
import { downloadCsv } from "../../../utils/csv";
import { ProcurementItemAutocomplete } from "../../procurement/ProcurementShared";
import {
  DisabledAction,
  SupplyChainBadge,
  SupplyChainDeleteModal,
  SupplyChainFilterBar,
  SupplyChainInlineError,
  SupplyChainPagination,
  SupplyChainStatusPill,
} from "../SupplyChainShared";
import { formatSupplyChainNumber } from "../supplyChainDisplay";
import useSupplyChainCapabilities from "../useSupplyChainCapabilities";
import useSupplyChainChannels from "../useSupplyChainChannels";

const getItemId = (item) => item?.id ?? item?.itemId ?? "";

const PackagingProfilesPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const state = useSelector((root) => root.supplyChainPackagingProfiles);
  const { channels, error: channelError } = useSupplyChainChannels();
  const [filterItem, setFilterItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [rowConflicts, setRowConflicts] = useState({});
  const [settingDefaultId, setSettingDefaultId] = useState(null);
  const capabilities = useSupplyChainCapabilities({
    label: "SupplyChain.PackagingProfiles",
    resource: "SupplyChain.PackagingProfiles",
    route: "/supply-chain/packaging-profiles",
  });
  const params = useMemo(
    () => ({
      ...state.filters,
      PageNumber: state.pageNumber,
      PageSize: state.pageSize,
    }),
    [state.filters, state.pageNumber, state.pageSize],
  );
  const load = useCallback(
    () => dispatch(fetchSupplyChainPackagingProfiles(params)),
    [dispatch, params],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 250);

    return () => window.clearTimeout(timeout);
  }, [load]);

  const setFilters = (patch) => dispatch(setPackagingFilters(patch));
  const setDefault = async (record) => {
    setSettingDefaultId(record.id);

    try {
      const response =
        await supplyChainPackagingProfileService.setDefault(record.id);
      await supplyChainPackagingProfileService.list({
        ChannelId: record.channelId || undefined,
        ItemId: record.itemId,
        PageNumber: 1,
        PageSize: 200,
      });
      await load();
      toast.success(response.message || "Default packaging profile updated.");
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Unable to set the default profile."),
      );
    } finally {
      setSettingDefaultId(null);
    }
  };
  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");

    try {
      const response = await supplyChainPackagingProfileService.remove(
        deleteTarget.id,
      );
      toast.success(response.message || "Packaging profile deleted.");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Unable to delete the packaging profile.",
      );
      setDeleteError(message);
      if (isConflictError(error)) {
        setRowConflicts((current) => ({
          ...current,
          [deleteTarget.id]: message,
        }));
      } else {
        toast.error(message);
      }
    } finally {
      setDeleting(false);
    }
  };
  const activeFilterCount = [
    Boolean(state.filters.Search.trim()),
    Boolean(state.filters.ItemId),
    Boolean(state.filters.ChannelId),
    state.filters.IsActive !== "",
    state.filters.IsDefault !== "",
  ].filter(Boolean).length;
  const defaultCount = state.list.filter((row) => row.isDefault).length;
  const itemCount = new Set(state.list.map((row) => row.itemId).filter(Boolean))
    .size;
  const dimensions = (row) => {
    const values = [row.length, row.width, row.height];

    return values.every(
      (value) => value !== null && value !== undefined && value !== "",
    )
      ? `${values.map((value) => formatSupplyChainNumber(value)).join(" × ")} ${row.dimensionUnit ?? ""}`.trim()
      : "—";
  };
  const weights = (row) => {
    const gross = formatSupplyChainNumber(row.grossWeight);
    const net = formatSupplyChainNumber(row.netWeight);

    return `${gross} / ${net} ${row.weightUnit ?? ""}`.trim();
  };
  const exportRows = () =>
    downloadCsv({
      columns: [
        { key: "itemCode", label: "Item code" },
        { key: "itemName", label: "Item name" },
        { key: "packagingCode", label: "Packaging code" },
        { key: "packagingName", label: "Packaging name" },
        { key: "channelCode", label: "Channel" },
        { key: "unitsPerBox", label: "Units per box" },
        { key: "dimensions", label: "Dimensions", getValue: dimensions },
        { key: "grossWeight", label: "Gross weight" },
        { key: "netWeight", label: "Net weight" },
        { key: "calculatedVolumetricWeight", label: "Volumetric weight" },
        { key: "isDefault", label: "Default" },
        { key: "isActive", label: "Active" },
      ],
      filename: "supply-chain-packaging-profiles.csv",
      rows: state.list,
    });

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge="Supply Chain"
        description="Maintain channel-aware packaging data while keeping API-calculated volumetric weight authoritative."
        title="Packaging profiles"
        actions={
          <>
            <AppButton disabled={state.loading} variant="secondary" onClick={() => void load()}><RotateCw className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} />Refresh</AppButton>
            {capabilities.canExport ? <AppButton disabled={state.loading || state.list.length === 0} variant="secondary" onClick={() => void exportRows()}><Download className="h-4 w-4" />Export</AppButton> : <DisabledAction reason="Export requires Supply Chain Packaging Profiles export permission."><AppButton disabled variant="secondary"><Download className="h-4 w-4" />Export</AppButton></DisabledAction>}
            {capabilities.canCreate ? <AppButton onClick={() => navigate("/supply-chain/packaging-profiles/new")}><Plus className="h-4 w-4" />New profile</AppButton> : <DisabledAction reason="Creating packaging profiles requires create permission."><AppButton disabled><Plus className="h-4 w-4" />New profile</AppButton></DisabledAction>}
          </>
        }
      />

      <StatCards
        loading={state.loading}
        cards={[
          { icon: Package, label: "Total profiles", value: state.totalCount },
          { icon: Star, hint: "On this page", label: "Default profiles", value: defaultCount },
          { icon: Box, hint: "On this page", label: "Items covered", value: itemCount },
        ]}
      />

      <SupplyChainFilterBar
        activeFilterCount={activeFilterCount}
        onClear={() => {
          setFilterItem(null);
          setFilters({ ChannelId: "", IsActive: "", IsDefault: "", ItemId: "", Search: "" });
        }}
      >
        <AppInput className="min-w-56" label="Search" placeholder="Item or packaging code" value={state.filters.Search} onChange={(event) => setFilters({ Search: event.target.value })} />
        <div className="min-w-64"><ProcurementItemAutocomplete label="Item" value={filterItem} onChange={(item) => { setFilterItem(item); setFilters({ ItemId: getItemId(item) }); }} /></div>
        <AppSelect className="w-52" label="Channel" options={[{ label: "All channels", value: "" }, ...channels.map((channel) => ({ label: `${channel.code} — ${channel.name}`, value: channel.id }))]} value={state.filters.ChannelId} onChange={(value) => setFilters({ ChannelId: value })} />
        <AppSelect className="w-40" label="Status" options={[{ label: "All", value: "" }, { label: "Active", value: true }, { label: "Inactive", value: false }]} value={state.filters.IsActive} onChange={(value) => setFilters({ IsActive: value })} />
        <AppSelect className="w-40" label="Default" options={[{ label: "All", value: "" }, { label: "Default", value: true }, { label: "Not default", value: false }]} value={state.filters.IsDefault} onChange={(value) => setFilters({ IsDefault: value })} />
      </SupplyChainFilterBar>

      <SupplyChainInlineError message={channelError} title="Channels unavailable" />
      <SupplyChainInlineError message={state.error} title="Packaging profiles unavailable" onRetry={load} />

      <DataTableShell
        colGroup={<colgroup><col className="w-[56px]" /><col className="w-56" /><col className="w-36" /><col className="w-36" /><col className="w-28" /><col className="w-44" /><col className="w-44" /><col className="w-36" /><col className="w-24" /><col className="w-28" /><col className="w-44" /></colgroup>}
        columnCount={11}
        emptyHint="Create the first profile or clear the current filters."
        emptyTitle={!state.loading && state.list.length === 0 ? "No packaging profiles yet" : undefined}
        head={<><th className={DATA_TABLE_HEADER_CLASS}>#</th><th className={DATA_TABLE_HEADER_CLASS}>Item</th><th className={DATA_TABLE_HEADER_CLASS}>Packaging code</th><th className={DATA_TABLE_HEADER_CLASS}>Channel</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Units per box</th><th className={DATA_TABLE_HEADER_CLASS}>Dimensions</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Gross / Net weight</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Volumetric weight</th><th className={DATA_TABLE_HEADER_CLASS}>Default</th><th className={DATA_TABLE_HEADER_CLASS}>Status</th><th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Actions</th></>}
        loading={state.loading}
        minWidth="min-w-[1580px]"
      >
        {state.list.map((row, index) => (
          <tr key={row.id}>
            <td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">{(state.pageNumber - 1) * state.pageSize + index + 1}</td>
            <td><p className="font-medium text-slate-800">{row.itemName}</p><p className="text-xs text-slate-500">{row.itemCode}</p></td>
            <td><p className="font-semibold text-slate-900">{row.packagingCode}</p><p className="text-xs text-slate-500">{row.packagingName}</p><span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${row.conversionReady === true ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{row.conversionReady === true ? "Conversion verified" : row.conversionReady === false ? "Needs conversion" : "Readiness unavailable"}</span>{row.conversionReady === true && <p className="mt-1 text-[10px] text-slate-500">{row.sourceQuantityBasis} {row.sourceUnitName || "source units"} = {row.baseQuantityBasis} {row.baseUnitName || "base units"}</p>}<button className="mt-1 block text-xs font-medium text-brand underline" onClick={() => navigate(`/supply-chain/packaging-profiles/${row.id}/edit?step=conversion`)}>Verify / review conversion</button></td>
            <td>{row.channelCode || "All channels"}</td>
            <td className="text-right tabular-nums">{formatSupplyChainNumber(row.unitsPerBox)}</td>
            <td>{dimensions(row)}</td>
            <td className="text-right tabular-nums">{weights(row)}</td>
            <td className="text-right font-medium tabular-nums">{formatSupplyChainNumber(row.calculatedVolumetricWeight)}</td>
            <td>{row.isDefault ? <SupplyChainBadge tone="brand">Default</SupplyChainBadge> : "—"}</td>
            <td><SupplyChainStatusPill active={row.isActive} /></td>
            <td>
              <div className="flex items-center justify-end gap-0.5">
                <AppTooltip label="View profile"><button aria-label="View profile" className={DATA_TABLE_ROW_ACTION_CLASS} type="button" onClick={() => navigate(`/supply-chain/packaging-profiles/${row.id}/edit?mode=view`)}><Eye className="h-4 w-4" /></button></AppTooltip>
                {capabilities.canEdit ? <><AppTooltip label="Edit profile"><button aria-label="Edit profile" className={DATA_TABLE_ROW_ACTION_CLASS} type="button" onClick={() => navigate(`/supply-chain/packaging-profiles/${row.id}/edit`)}><Pencil className="h-4 w-4" /></button></AppTooltip>{row.isDefault ? <AppTooltip label="This is already the default profile"><button aria-label="Already default" className={DATA_TABLE_ROW_ACTION_CLASS} disabled type="button"><Star className="h-4 w-4" /></button></AppTooltip> : <AppTooltip label="Set as default"><button aria-label="Set as default" className={DATA_TABLE_ROW_ACTION_CLASS} disabled={settingDefaultId === row.id} type="button" onClick={() => void setDefault(row)}><Star className="h-4 w-4" /></button></AppTooltip>}</> : null}
                {capabilities.canDelete ? rowConflicts[row.id] ? <AppTooltip label={rowConflicts[row.id]}><button aria-label="Delete profile unavailable" className={DATA_TABLE_ROW_ACTION_DANGER_CLASS} disabled type="button"><Trash2 className="h-4 w-4" /></button></AppTooltip> : <AppTooltip label="Delete profile"><button aria-label="Delete profile" className={DATA_TABLE_ROW_ACTION_DANGER_CLASS} type="button" onClick={() => { setDeleteError(""); setDeleteTarget(row); }}><Trash2 className="h-4 w-4" /></button></AppTooltip> : null}
              </div>
              {rowConflicts[row.id] ? <p className="mt-1 text-right text-[10px] text-red-600">In use</p> : null}
            </td>
          </tr>
        ))}
      </DataTableShell>

      <SupplyChainPagination disabled={state.loading} pageNumber={state.pageNumber} pageSize={state.pageSize} totalCount={state.totalCount} totalPages={state.totalPages} onPageChange={(value) => dispatch(setPackagingPage(value))} onPageSizeChange={(value) => dispatch(setPackagingPageSize(value))} />

      <SupplyChainDeleteModal entityLabel="packaging profile" error={deleteError} isOpen={Boolean(deleteTarget)} loading={deleting} onClose={() => { setDeleteError(""); setDeleteTarget(null); }} onConfirm={remove} />
    </section>
  );
};

export default PackagingProfilesPage;
