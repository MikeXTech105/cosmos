import {
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import AppModal from "../../components/common/AppModal";
import AppSelect from "../../components/common/AppSelect";
import PageHeader from "../../components/common/PageHeader";
import useLatestRequest from "../../hooks/useLatestRequest";
import { applyApiErrorsToForm } from "../../utils/formApiErrors";
import { getApiStatus } from "../../utils/apiError";
import {
  buildOeeListQueryParams,
  extractOeeEntity,
  formatOeeNumber,
  getOeeActionError,
  getOeeBoolean,
  getOeeRecordId,
  getOeeSuccessMessage,
  OEE_STATUS_OPTIONS,
} from "./oeeHelpers";
import {
  OeeConfirmDialog,
  OeeEmptyState,
  OeeNumberInput,
  OeePagination,
  OeeStatCard,
} from "./OeeShared";
import useOeeCapabilities from "./useOeeCapabilities";

const getDefaultValue = (field, entity) => {
  if (!entity) {
    if (field.type === "checkbox") {
      return field.defaultValue ?? true;
    }

    return field.defaultValue ?? "";
  }

  const value = entity[field.name];

  if (field.type === "checkbox") {
    return getOeeBoolean(value, field.defaultValue ?? true);
  }

  if (field.type === "number") {
    return value === null || value === undefined ? "" : String(value);
  }

  return value ?? "";
};

const buildDefaultValues = (fields, entity) => {
  return Object.fromEntries(
    fields.map((field) => [field.name, getDefaultValue(field, entity)]),
  );
};

const validateValues = (fields, values) => {
  const nextErrors = {};

  fields.forEach((field) => {
    const value = values[field.name];

    if (
      field.required &&
      field.type !== "checkbox" &&
      String(value ?? "").trim() === ""
    ) {
      nextErrors[field.name] = `${field.label} is required.`;
      return;
    }

    if (field.type === "number" && String(value ?? "").trim() !== "") {
      const number = Number(value);

      if (!Number.isFinite(number)) {
        nextErrors[field.name] = `${field.label} must be a valid number.`;
      } else if (field.min !== undefined && number < field.min) {
        nextErrors[field.name] = `${field.label} must be at least ${field.min}.`;
      }
    }
  });

  return nextErrors;
};

const OeeMasterFormModal = ({
  config,
  entity,
  isLoading,
  isOpen,
  mode,
  onClose,
  onSubmit,
}) => {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const [values, setValues] = useState(() =>
    buildDefaultValues(config.fields, entity),
  );
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const Icon = config.icon;

  const setValue = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const submitForm = async (event) => {
    event.preventDefault();
    const nextErrors = validateValues(config.fields, values);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(config.toPayload(values));
    } catch (error) {
      applyApiErrorsToForm({
        error,
        formFieldNames: config.fields.map((field) => field.name),
        setError: (name, detail) => {
          setErrors((current) => ({ ...current, [name]: detail.message }));
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = isView
    ? `View ${config.entityLabel}`
    : isEdit
      ? `Edit ${config.entityLabel}`
      : `Add ${config.entityLabel}`;

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth={config.modalWidth ?? "max-w-2xl"}
      onClose={isSubmitting ? undefined : onClose}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{config.modalDescription}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Array.from({ length: config.fields.length }, (_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : (
        <form className="mt-6 space-y-5" onSubmit={submitForm}>
          {errors["root.server"] && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors["root.server"]}
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {config.fields.map((field) => {
              if (field.type === "checkbox") {
                return (
                  <label
                    key={field.name}
                    className={[
                      "flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2",
                      isView ? "cursor-default" : "cursor-pointer",
                    ].join(" ")}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        {field.label}
                      </span>
                      {field.helpText && (
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {field.helpText}
                        </span>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      disabled={isView}
                      checked={Boolean(values[field.name])}
                      className="h-4 w-4 accent-brand"
                      onChange={(event) =>
                        setValue(field.name, event.target.checked)
                      }
                    />
                  </label>
                );
              }

              if (field.type === "number") {
                return (
                  <OeeNumberInput
                    key={field.name}
                    id={field.name}
                    label={field.label}
                    required={field.required}
                    disabled={isView}
                    allowDecimal={field.allowDecimal}
                    value={values[field.name]}
                    error={errors[field.name]}
                    onChange={(value) => setValue(field.name, value)}
                  />
                );
              }

              return (
                <AppInput
                  key={field.name}
                  id={field.name}
                  label={field.label}
                  required={field.required}
                  disabled={isView}
                  value={values[field.name] ?? ""}
                  error={errors[field.name]}
                  placeholder={field.placeholder}
                  onChange={(event) =>
                    setValue(field.name, event.target.value)
                  }
                />
              );
            })}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <AppButton variant="secondary" onClick={onClose}>
              {isView ? "Close" : "Cancel"}
            </AppButton>
            {!isView && (
              <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…">
                {isEdit ? "Save Changes" : `Create ${config.entityLabel}`}
              </AppButton>
            )}
          </div>
        </form>
      )}
    </AppModal>
  );
};

const OeeMasterFilters = ({
  filters,
  resultCount,
  onChange,
  onClear,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Search OEE records"
            value={filters.Search}
            onChange={(event) => onChange({ Search: event.target.value })}
            placeholder="Search records"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <AppSelect
          value={filters.IsActive}
          onChange={(value) => onChange({ IsActive: value })}
          options={OEE_STATUS_OPTIONS}
          aria-label="Status filter"
        />

        <div className="flex items-center justify-between gap-3">
          <span className="whitespace-nowrap text-xs font-semibold text-slate-500">
            {resultCount} shown
          </span>
          <AppButton
            variant="secondary"
            className="h-10 rounded-lg px-3"
            onClick={onClear}
          >
            Clear
          </AppButton>
        </div>
      </div>
    </div>
  );
};

const ActionButton = ({ children, disabled, label, onClick, tone = "default" }) => {
  const buttonClass =
    tone === "danger"
      ? "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40"
      : "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={buttonClass}
    >
      {children}
    </button>
  );
};

const OeeMasterTable = ({
  actions,
  columns,
  config,
  error,
  isLoading,
  onCreate,
  onPageChange,
  onPageSizeChange,
  onRetry,
  pageNumber,
  pageSize,
  records,
  totalCount,
  totalPages,
}) => {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || records.length === 0) {
    return (
      <OeeEmptyState
        icon={config.icon}
        title={`No ${config.pluralLabel.toLowerCase()} found`}
        description={config.emptyDescription}
        error={error}
        onRetry={onRetry}
        action={
          actions.canCreate ? (
            <AppButton className="mt-5 h-10" onClick={onCreate}>
              <Plus className="h-4 w-4" />
              {config.addLabel}
            </AppButton>
          ) : null
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">#</th>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 font-semibold">
                  {column.label}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr key={getOeeRecordId(record)} className="border-t border-slate-100">
                <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
                  {(pageNumber - 1) * pageSize + index + 1}
                </td>
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-slate-700">
                    {column.render ? column.render(record) : record[column.key] ?? "-"}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-0.5">
                    {actions.canView && (
                      <ActionButton
                        label={`View ${config.entityLabel}`}
                        onClick={() => actions.onView(record)}
                      >
                        <Eye className="h-4 w-4" />
                      </ActionButton>
                    )}
                    {actions.canEdit && (
                      <ActionButton
                        label={`Edit ${config.entityLabel}`}
                        onClick={() => actions.onEdit(record)}
                      >
                        <Pencil className="h-4 w-4" />
                      </ActionButton>
                    )}
                    {actions.canDelete && (
                      <ActionButton
                        label={`Delete ${config.entityLabel}`}
                        onClick={() => actions.onDelete(record)}
                        tone="danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </ActionButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <OeePagination
        disabled={isLoading}
        itemCount={records.length}
        itemLabel={config.pluralLabel.toLowerCase()}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
      />
    </div>
  );
};

const OeeMasterPage = ({ config }) => {
  const dispatch = useDispatch();
  const state = useSelector(config.selectState);
  const capabilities = useOeeCapabilities({
    label: config.permissionLabel,
    pageName: config.permissionPageName,
    resource: config.permissionResource,
    route: config.route,
  });
  const [searchInput, setSearchInput] = useState(state.filters.Search);
  const [modal, setModal] = useState({
    entity: null,
    isLoading: false,
    isOpen: false,
    mode: "create",
  });
  const detailPromiseRef = useRef(null);
  const {
    beginRequest: beginDetailRequest,
    cancelAllRequests: cancelDetailRequests,
    isLatestRequest: isLatestDetailRequest,
  } = useLatestRequest();
  const [confirmation, setConfirmation] = useState({
    entity: null,
    isLoading: false,
    isOpen: false,
  });
  const Icon = config.icon;

  const queryParams = useMemo(
    () =>
      buildOeeListQueryParams({
        filters: state.filters,
        pageNumber: state.pageNumber,
        pageSize: state.pageSize,
      }),
    [state.filters, state.pageNumber, state.pageSize],
  );

  const loadRecords = useCallback(() => {
    return dispatch(config.fetchList(queryParams));
  }, [config, dispatch, queryParams]);

  useEffect(() => {
    void Promise.resolve().then(loadRecords);
  }, [loadRecords]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      dispatch(config.setFilters({ Search: searchInput }));
      dispatch(config.setPage(1));
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [config, dispatch, searchInput]);

  const stats = useMemo(
    () => ({
      active:
        state.summary?.activeCount ??
        state.list.filter((record) => getOeeBoolean(record.isActive)).length,
      inactive:
        state.summary?.inactiveCount ??
        state.list.filter((record) => !getOeeBoolean(record.isActive)).length,
      total: state.summary?.totalCount ?? state.totalCount,
      metricScope: state.summaryScope,
      totalScope: "all-matching",
    }),
    [state.list, state.summary, state.summaryScope, state.totalCount],
  );

  const closeModal = useCallback(() => {
    cancelDetailRequests();
    detailPromiseRef.current?.abort?.();
    detailPromiseRef.current = null;
    setModal((current) => ({ ...current, isOpen: false }));
  }, [cancelDetailRequests]);

  const openCreate = useCallback(() => {
    if (!capabilities.canCreate) {
      return;
    }

    cancelDetailRequests();
    detailPromiseRef.current?.abort?.();
    detailPromiseRef.current = null;
    setModal({
      entity: null,
      isLoading: false,
      isOpen: true,
      mode: "create",
    });
  }, [cancelDetailRequests, capabilities.canCreate]);

  const openEntity = useCallback(
    async (mode, record) => {
      const isAllowed =
        mode === "edit" ? capabilities.canUpdate : capabilities.canView;

      if (!isAllowed) {
        return;
      }

      const id = getOeeRecordId(record, config.recordResource);

      if (!id) {
        toast.error(`Unable to find ${config.entityLabel.toLowerCase()} id.`);
        return;
      }

      setModal({ entity: record, isLoading: true, isOpen: true, mode });
      detailPromiseRef.current?.abort?.();
      const requestId = beginDetailRequest();
      const detailPromise = dispatch(config.fetchById(id));
      detailPromiseRef.current = detailPromise;

      try {
        const response = await detailPromise.unwrap();
        if (!isLatestDetailRequest(requestId)) return;

        setModal({
          entity: extractOeeEntity(response.data, config.entityKey),
          isLoading: false,
          isOpen: true,
          mode,
        });
      } catch (error) {
        if (!isLatestDetailRequest(requestId)) return;
        if (getApiStatus(error) === 404) {
          toast.error(`This ${config.entityLabel.toLowerCase()} no longer exists. The list was refreshed.`);
          closeModal();
          await loadRecords();
          return;
        }
        toast.error(
          getOeeActionError(
            error,
            `Unable to load ${config.entityLabel.toLowerCase()} details.`,
          ),
        );
        setModal((current) =>
          current.isOpen &&
          current.mode === mode &&
          String(getOeeRecordId(current.entity, config.recordResource)) === String(id)
            ? { ...current, isLoading: false }
            : current,
        );
      } finally {
        if (detailPromiseRef.current === detailPromise) {
          detailPromiseRef.current = null;
        }
      }
    },
    [
      beginDetailRequest,
      capabilities.canUpdate,
      capabilities.canView,
      closeModal,
      config,
      dispatch,
      isLatestDetailRequest,
      loadRecords,
    ],
  );

  const submitRecord = useCallback(
    async (payload) => {
      const isAllowed =
        modal.mode === "edit"
          ? capabilities.canUpdate
          : capabilities.canCreate;

      if (!isAllowed) {
        return;
      }

      try {
        const response =
          modal.mode === "edit"
            ? await dispatch(
                config.updateEntity({
                  id: getOeeRecordId(modal.entity, config.recordResource),
                  payload,
                }),
              ).unwrap()
            : await dispatch(config.createEntity(payload)).unwrap();

        toast.success(
          getOeeSuccessMessage(
            response,
            modal.mode === "edit"
              ? `${config.entityLabel} updated successfully`
              : `${config.entityLabel} created successfully`,
          ),
        );
        closeModal();
        await loadRecords();
      } catch (error) {
        if (modal.mode === "edit" && getApiStatus(error) === 404) {
          toast.error(`This ${config.entityLabel.toLowerCase()} no longer exists. The list was refreshed.`);
          closeModal();
          await loadRecords();
          return;
        }
        toast.error(
          getOeeActionError(
            error,
            `Unable to save ${config.entityLabel.toLowerCase()}.`,
          ),
        );
        throw error;
      }
    },
    [
      capabilities.canCreate,
      capabilities.canUpdate,
      closeModal,
      config,
      dispatch,
      loadRecords,
      modal.entity,
      modal.mode,
    ],
  );

  const confirmDelete = useCallback(async () => {
    if (!capabilities.canDelete || !confirmation.entity) {
      return;
    }

    const id = getOeeRecordId(confirmation.entity, config.recordResource);

    if (!id) {
      toast.error(`Unable to find ${config.entityLabel.toLowerCase()} id.`);
      return;
    }

    setConfirmation((current) => ({ ...current, isLoading: true }));

    try {
      const result = await dispatch(config.deleteEntity(id)).unwrap();
      toast.success(
        getOeeSuccessMessage(
          result.response,
          `${config.entityLabel} deleted successfully`,
        ),
      );
      setConfirmation({ entity: null, isLoading: false, isOpen: false });
      await loadRecords();
    } catch (error) {
      toast.error(
        getOeeActionError(
          error,
          `Unable to delete ${config.entityLabel.toLowerCase()}.`,
        ),
      );
      setConfirmation((current) => ({ ...current, isLoading: false }));
    }
  }, [
    capabilities.canDelete,
    config,
    confirmation.entity,
    dispatch,
    loadRecords,
  ]);

  const filterControls = {
    ...state.filters,
    Search: searchInput,
  };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <Icon className="h-3.5 w-3.5" />
            OEE / {config.pluralLabel}
          </>
        }
        title={config.title}
        description={config.description}
        actions={
          <>
            <AppButton
              variant="secondary"
              className="h-10"
              disabled={state.loading}
              onClick={loadRecords}
            >
              <RefreshCw
                className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`}
              />
              Refresh
            </AppButton>
            {capabilities.canCreate && (
              <AppButton className="h-10" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                {config.addLabel}
              </AppButton>
            )}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <OeeStatCard
          icon={config.icon}
          label={`Total ${config.pluralLabel}`}
          value={formatOeeNumber(stats.total, { maximumFractionDigits: 0 })}
          scope={stats.totalScope}
        />
        <OeeStatCard
          icon={config.activeIcon ?? config.icon}
          label="Active"
          value={formatOeeNumber(stats.active, { maximumFractionDigits: 0 })}
          scope={stats.metricScope}
          colorClass="bg-emerald-50 text-emerald-600"
        />
        <OeeStatCard
          icon={config.inactiveIcon ?? config.icon}
          label="Inactive"
          value={formatOeeNumber(stats.inactive, { maximumFractionDigits: 0 })}
          scope={stats.metricScope}
          colorClass="bg-amber-50 text-amber-600"
        />
      </div>

      <OeeMasterFilters
        filters={filterControls}
        resultCount={state.list.length}
        onChange={(patch) => {
          if (Object.hasOwn(patch, "Search")) {
            setSearchInput(patch.Search);
          } else {
            dispatch(config.setFilters(patch));
            dispatch(config.setPage(1));
          }
        }}
        onClear={() => {
          setSearchInput("");
          dispatch(config.setFilters({ Search: "", IsActive: "all" }));
          dispatch(config.setPage(1));
        }}
      />

      <OeeMasterTable
        actions={{
          ...capabilities,
          onDelete: (record) =>
            setConfirmation({
              entity: record,
              isLoading: false,
              isOpen: true,
            }),
          onEdit: (record) => openEntity("edit", record),
          onView: (record) => openEntity("view", record),
        }}
        columns={config.columns}
        config={config}
        error={state.error}
        isLoading={state.loading}
        onCreate={capabilities.canCreate ? openCreate : undefined}
        onPageChange={(value) => dispatch(config.setPage(value))}
        onPageSizeChange={(value) => dispatch(config.setPageSize(value))}
        onRetry={loadRecords}
        pageNumber={state.pageNumber}
        pageSize={state.pageSize}
        records={state.list}
        totalCount={state.totalCount}
        totalPages={state.totalPages}
      />

      <OeeMasterFormModal
        key={[
          modal.mode,
          modal.isLoading ? "loading" : "ready",
          getOeeRecordId(modal.entity, config.recordResource) ?? "new",
        ].join("-")}
        config={config}
        entity={modal.entity}
        isLoading={modal.isLoading}
        isOpen={modal.isOpen}
        mode={modal.mode}
        onClose={closeModal}
        onSubmit={submitRecord}
      />

      <OeeConfirmDialog
        isLoading={confirmation.isLoading}
        isOpen={confirmation.isOpen}
        title={`Delete ${config.entityLabel}?`}
        description={`${config.getName(confirmation.entity) || `This ${config.entityLabel.toLowerCase()}`} will be permanently removed.`}
        onCancel={() =>
          setConfirmation({
            entity: null,
            isLoading: false,
            isOpen: false,
          })
        }
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default OeeMasterPage;
