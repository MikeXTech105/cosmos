import {
  Download,
  Eye,
  Pencil,
  Plus,
  Power,
  Radio,
  RotateCw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import DataTableShell, {
  DATA_TABLE_HEADER_CLASS,
  DATA_TABLE_ROW_ACTION_CLASS,
  DATA_TABLE_ROW_ACTION_DANGER_CLASS,
} from "../../../components/common/DataTableShell";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import AppTooltip from "../../../components/common/AppTooltip";
import PageHeader from "../../../components/common/PageHeader";
import StatCards from "../../../components/common/StatCards";
import { supplyChainChannelService } from "../../../services/supplyChain/channelService";
import {
  fetchSupplyChainChannels,
  setChannelFilters,
  setChannelPage,
  setChannelPageSize,
} from "../../../store/slices/supplyChain/channelSlice";
import {
  getApiErrorMessage,
  getApiFieldErrors,
  isConflictError,
} from "../../../utils/apiError";
import { downloadCsv } from "../../../utils/csv";
import {
  channelSchema,
  getSchemaErrors,
} from "../supplyChainSchemas";
import {
  DisabledAction,
  SupplyChainDeleteModal,
  SupplyChainFilterBar,
  SupplyChainInlineError,
  SupplyChainPagination,
  SupplyChainStatusPill,
} from "../SupplyChainShared";
import useSupplyChainCapabilities from "../useSupplyChainCapabilities";

const emptyForm = () => ({
  code: "",
  description: "",
  isActive: true,
  name: "",
  sortOrder: 0,
});

const ChannelModal = ({
  isOpen,
  mode,
  onClose,
  onSaved,
  record,
}) => {
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const readOnly = mode === "view";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setForm({
        code: record?.code ?? "",
        description: record?.description ?? "",
        isActive: record?.isActive ?? true,
        name: record?.name ?? "",
        sortOrder: record?.sortOrder ?? 0,
      });
      setErrors({});
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [isOpen, record]);

  const submit = async () => {
    const result = channelSchema.safeParse({
      ...form,
      code: form.code.toUpperCase(),
    });

    if (!result.success) {
      setErrors(getSchemaErrors(result));
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const response = record?.id
        ? await supplyChainChannelService.update(record.id, result.data)
        : await supplyChainChannelService.create(result.data);
      toast.success(response.message || `Channel ${record?.id ? "updated" : "created"}.`);
      await onSaved();
      onClose();
    } catch (error) {
      const fieldErrors = getApiFieldErrors(error);
      const message = getApiErrorMessage(error, "Unable to save the channel.");

      setErrors(
        Object.keys(fieldErrors).length > 0
          ? fieldErrors
          : { form: message },
      );
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      isBusy={saving}
      isOpen={isOpen}
      title={
        readOnly
          ? "Channel details"
          : record?.id
            ? "Edit channel"
            : "New channel"
      }
      onClose={saving ? undefined : onClose}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <AppInput
          disabled={readOnly || saving}
          error={errors.code}
          label="Code"
          required
          value={form.code}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              code: event.target.value.toUpperCase(),
            }))
          }
        />
        <AppInput
          disabled={readOnly || saving}
          error={errors.name}
          label="Name"
          required
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
        />
        <div className="sm:col-span-2">
          <AppInput
            disabled={readOnly || saving}
            title={readOnly ? "This channel is read only" : saving ? "The channel is already saving" : undefined}
            error={errors.description}
            label="Description"
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
        </div>
        <AppInput
          disabled={readOnly || saving}
          error={errors.sortOrder}
          label="Sort order"
          min="0"
          type="number"
          value={form.sortOrder}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              sortOrder: event.target.value,
            }))
          }
        />
        <label className="flex items-center gap-2 self-end pb-3 text-sm text-slate-700">
          <input
            checked={form.isActive}
            className="h-4 w-4 rounded border-slate-300 accent-brand"
            disabled={readOnly || saving}
            title={readOnly ? "This channel is read only" : saving ? "The channel is already saving" : undefined}
            type="checkbox"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                isActive: event.target.checked,
              }))
            }
          />
          Channel is active
        </label>
      </div>
      <div className="mt-4">
        <SupplyChainInlineError message={errors.form} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <AppButton variant="secondary" onClick={onClose}>
          {readOnly ? "Close" : "Back"}
        </AppButton>
        {!readOnly ? (
          <AppButton
            isLoading={saving}
            loadingText="Saving…"
            onClick={submit}
          >
            Save channel
          </AppButton>
        ) : null}
      </div>
    </AppModal>
  );
};

const ChannelsPage = () => {
  const dispatch = useDispatch();
  const state = useSelector((root) => root.supplyChainChannels);
  const [modal, setModal] = useState({ mode: "", record: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [rowConflicts, setRowConflicts] = useState({});
  const capabilities = useSupplyChainCapabilities({
    label: "SupplyChain.Channels",
    resource: "SupplyChain.Channels",
    route: "/supply-chain/channels",
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
    () => dispatch(fetchSupplyChainChannels(params)),
    [dispatch, params],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [load]);

  const exportRows = async () => {
    await downloadCsv({
      columns: [
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
        { key: "description", label: "Description" },
        { key: "sortOrder", label: "Sort order" },
        {
          key: "status",
          label: "Status",
          getValue: (row) => (row.isActive ? "Active" : "Inactive"),
        },
      ],
      filename: "supply-chain-channels.csv",
      rows: state.list,
    });
  };

  const changeStatus = async (record) => {
    try {
      const response = await supplyChainChannelService.changeStatus(
        record.id,
        !record.isActive,
      );
      toast.success(response.message || "Channel status updated.");
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to change channel status."));
    }
  };

  const remove = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
      const response = await supplyChainChannelService.remove(deleteTarget.id);
      toast.success(response.message || "Channel deleted.");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to delete the channel.");

      if (isConflictError(error)) {
        setDeleteError(message);
        setRowConflicts((current) => ({
          ...current,
          [deleteTarget.id]: message,
        }));
      } else {
        setDeleteError(message);
        toast.error(message);
      }
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = state.list.filter((row) => row.isActive).length;
  const inactiveCount = state.list.length - activeCount;
  const activeFilterCount = [
    Boolean(state.filters.Search.trim()),
    state.filters.IsActive !== "",
  ].filter(Boolean).length;

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge="Supply Chain"
        description="Maintain the shared sales channels used by imports and procurement planning."
        title="Channels"
        actions={
          <>
            <AppButton
              disabled={state.loading}
              variant="secondary"
              onClick={() => void load()}
            >
              <RotateCw className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} />
              Refresh
            </AppButton>
            {capabilities.canExport ? (
              <AppButton
                disabled={state.loading || state.list.length === 0}
                variant="secondary"
                onClick={() => void exportRows()}
              >
                <Download className="h-4 w-4" />
                Export
              </AppButton>
            ) : (
              <DisabledAction reason="Export requires Supply Chain Channels export permission.">
                <AppButton disabled variant="secondary">
                  <Download className="h-4 w-4" />
                  Export
                </AppButton>
              </DisabledAction>
            )}
            {capabilities.canCreate ? (
              <AppButton
                onClick={() => setModal({ mode: "create", record: null })}
              >
                <Plus className="h-4 w-4" />
                New channel
              </AppButton>
            ) : (
              <DisabledAction reason="Creating channels requires create permission.">
                <AppButton disabled>
                  <Plus className="h-4 w-4" />
                  New channel
                </AppButton>
              </DisabledAction>
            )}
          </>
        }
      />

      <StatCards
        loading={state.loading}
        cards={[
          { icon: Radio, label: "Total channels", value: state.totalCount },
          {
            icon: Power,
            hint: "On this page",
            label: "Active",
            value: activeCount,
          },
          {
            hint: "On this page",
            label: "Inactive",
            value: inactiveCount,
          },
        ]}
      />

      <div className="rounded-xl border border-brand/20 bg-brand-light px-4 py-3 text-sm text-slate-700">
        These shared channels feed Procurement Planning.{" "}
        <Link className="font-semibold text-brand hover:underline" to="/procurement">
          Open Procurement Planning
        </Link>
      </div>

      <SupplyChainFilterBar
        activeFilterCount={activeFilterCount}
        onClear={() =>
          dispatch(setChannelFilters({ IsActive: "", Search: "" }))
        }
      >
        <AppInput
          className="min-w-64 flex-1"
          label="Search"
          placeholder="Code, name, or description"
          value={state.filters.Search}
          onChange={(event) =>
            dispatch(setChannelFilters({ Search: event.target.value }))
          }
        />
        <AppSelect
          className="w-48"
          label="Status"
          options={[
            { label: "All", value: "" },
            { label: "Active", value: true },
            { label: "Inactive", value: false },
          ]}
          value={state.filters.IsActive}
          onChange={(value) =>
            dispatch(setChannelFilters({ IsActive: value }))
          }
        />
      </SupplyChainFilterBar>

      <SupplyChainInlineError
        message={state.error}
        title="Channels unavailable"
        onRetry={load}
      />

      <DataTableShell
        colGroup={
          <colgroup>
            <col className="w-[56px]" />
            <col className="w-32" />
            <col className="w-52" />
            <col />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-44" />
          </colgroup>
        }
        columnCount={7}
        emptyHint="Create the first channel or clear the current filters."
        emptyTitle={!state.loading && state.list.length === 0 ? "No channels yet" : undefined}
        head={
          <>
            <th className={DATA_TABLE_HEADER_CLASS}>#</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Code</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Name</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Description</th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Sort order</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Status</th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Actions</th>
          </>
        }
        loading={state.loading}
        minWidth="min-w-[980px]"
      >
        {state.list.map((row, index) => (
          <tr key={row.id}>
            <td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
              {(state.pageNumber - 1) * state.pageSize + index + 1}
            </td>
            <td className="font-semibold text-slate-900">{row.code}</td>
            <td className="font-medium text-slate-800">{row.name}</td>
            <td className="truncate" title={row.description ?? ""}>
              {row.description || "—"}
            </td>
            <td className="text-right tabular-nums">{row.sortOrder ?? 0}</td>
            <td>
              <SupplyChainStatusPill active={row.isActive} />
            </td>
            <td>
              <div className="flex items-center justify-end gap-0.5">
                <AppTooltip label="View channel">
                  <button
                    aria-label="View channel"
                    className={DATA_TABLE_ROW_ACTION_CLASS}
                    type="button"
                    onClick={() => setModal({ mode: "view", record: row })}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </AppTooltip>
                {capabilities.canEdit ? (
                  <>
                    <AppTooltip label="Edit channel">
                      <button
                        aria-label="Edit channel"
                        className={DATA_TABLE_ROW_ACTION_CLASS}
                        type="button"
                        onClick={() => setModal({ mode: "edit", record: row })}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </AppTooltip>
                    <AppTooltip label={row.isActive ? "Deactivate channel" : "Activate channel"}>
                      <button
                        aria-label={row.isActive ? "Deactivate channel" : "Activate channel"}
                        className={DATA_TABLE_ROW_ACTION_CLASS}
                        type="button"
                        onClick={() => void changeStatus(row)}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    </AppTooltip>
                  </>
                ) : null}
                {capabilities.canDelete ? (
                  rowConflicts[row.id] ? (
                    <AppTooltip label={rowConflicts[row.id]}>
                      <button
                        aria-label="Delete channel unavailable"
                        className={DATA_TABLE_ROW_ACTION_DANGER_CLASS}
                        disabled
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </AppTooltip>
                  ) : (
                    <AppTooltip label="Delete channel">
                      <button
                        aria-label="Delete channel"
                        className={DATA_TABLE_ROW_ACTION_DANGER_CLASS}
                        type="button"
                        onClick={() => {
                          setDeleteError("");
                          setDeleteTarget(row);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </AppTooltip>
                  )
                ) : null}
              </div>
              {rowConflicts[row.id] ? (
                <p className="mt-1 text-right text-[10px] leading-4 text-red-600">
                  In use
                </p>
              ) : null}
            </td>
          </tr>
        ))}
      </DataTableShell>

      <SupplyChainPagination
        disabled={state.loading}
        pageNumber={state.pageNumber}
        pageSize={state.pageSize}
        totalCount={state.totalCount}
        totalPages={state.totalPages}
        onPageChange={(value) => dispatch(setChannelPage(value))}
        onPageSizeChange={(value) => dispatch(setChannelPageSize(value))}
      />

      <ChannelModal
        isOpen={Boolean(modal.record) || modal.mode === "create"}
        mode={modal.mode}
        record={modal.record}
        onClose={() => setModal({ mode: "", record: null })}
        onSaved={load}
      />
      <SupplyChainDeleteModal
        entityLabel="channel"
        error={deleteError}
        isOpen={Boolean(deleteTarget)}
        loading={deleting}
        onClose={() => {
          setDeleteError("");
          setDeleteTarget(null);
        }}
        onConfirm={remove}
      />
    </section>
  );
};

export default ChannelsPage;
