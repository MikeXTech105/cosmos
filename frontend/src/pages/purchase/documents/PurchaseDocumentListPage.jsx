import {
  ArrowRight,
  Ban,
  CheckCircle2,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import useCapabilities from "../../../hooks/useCapabilities";
import useCreatePermission from "../../../hooks/useCreatePermission";
import { categoryService } from "../../../services/inventory/categoryService";
import { itemService } from "../../../services/inventory/itemService";
import { unitService } from "../../../services/inventory/unitService";
import { purchaseBillService } from "../../../services/purchase/purchaseBillService";
import {
  getPartyDisplayName,
  getPartyType,
} from "../../party/partyHelpers";
import { partyService } from "../../party/partyService";
import { PartyFormModal } from "../../party";
import CategoryFormModal from "../../inventory/categories/CategoryFormModal";
import ItemFormModal from "../../inventory/items/ItemFormModal";
import UnitFormModal from "../../inventory/units/UnitFormModal";
import {
  buildListParams,
  formatCurrency,
  formatDate,
  formatNumber,
  getActionError,
  getBalanceAmount,
  getDocumentNumber,
  getPaidAmount,
  getRecordTotal,
  getStatusMeta,
  getSuccessMessage,
  getSupplierName,
  STATUS_OPTIONS,
} from "../purchaseHelpers";
import {
  PurchaseConfirmDialog,
  PurchasePagination,
  PurchaseStatCard,
  PurchaseStatusPill,
} from "../PurchaseShared";
import PurchaseDocumentFormModal from "./PurchaseDocumentFormModal";
import ConvertOrderModal from "./ConvertOrderModal";

const getLookupList = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  return data?.items ?? [];
};

const getResponseRecord = (response, key) => {
  return response?.data?.[key] ?? response?.data ?? null;
};

const ActionButton = ({ disabled, icon: Icon, label, onClick, tone = "default" }) => {
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
      <Icon className="h-4 w-4" />
    </button>
  );
};

const PurchaseDocumentListPage = ({ config }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const state = useSelector((store) => store[config.selectorKey]);
  const capabilities = useCapabilities({
    actions: ["view", "create", "update", "delete", "confirm", "cancel", "convert"],
    label: config.pageName ?? config.label,
    resource: [config.selectorKey, config.singularLabel, config.pluralLabel],
    route: config.routeBase,
  });
  const canCreateSupplier = useCreatePermission({
    label: "Party Master",
    resource: "party",
    route: "/party",
  });
  const canCreateItem = useCreatePermission({
    label: "Items",
    resource: "items",
    route: "/items",
  });
  const canCreateCategory = useCreatePermission({
    label: "Categories",
    resource: "categories",
    route: "/categories",
  });
  const canCreateUnit = useCreatePermission({
    label: "Units",
    resource: "units",
    route: "/units",
  });
  const [searchInput, setSearchInput] = useState(state.filters.Search);
  const [lookups, setLookups] = useState({
    bills: [],
    billsLoading: false,
    items: [],
    itemsLoading: false,
    suppliers: [],
    suppliersLoading: false,
  });
  const cacheRef = useRef({
    bills: { loaded: false, promise: null },
    items: { loaded: false, promise: null },
    suppliers: { loaded: false, promise: null },
  });
  const [modal, setModal] = useState({
    isLoading: false,
    isOpen: false,
    mode: "create",
    record: null,
  });
  const [lookupCreateModal, setLookupCreateModal] = useState({
    category: false,
    item: false,
    supplier: false,
    unit: false,
  });
  const [itemCreateLookups, setItemCreateLookups] = useState({
    categories: [],
    categoriesLoading: false,
    units: [],
    unitsLoading: false,
  });
  const [confirmation, setConfirmation] = useState({
    action: "delete",
    isLoading: false,
    isOpen: false,
    record: null,
  });
  const [convertOrder, setConvertOrder] = useState({
    isOpen: false,
    order: null,
  });

  const queryParams = useMemo(
    () =>
      buildListParams({
        filters: state.filters,
        pageNumber: state.pageNumber,
        pageSize: state.pageSize,
        type: "document",
      }),
    [state.filters, state.pageNumber, state.pageSize],
  );

  const loadRecords = useCallback(
    () => dispatch(config.fetchThunk(queryParams)),
    [config, dispatch, queryParams],
  );

  const loadLookup = useCallback((type, { force = false } = {}) => {
    const cache = cacheRef.current[type];

    if (cache.loaded && !force) {
      return Promise.resolve();
    }

    if (cache.promise) {
      return cache.promise;
    }

    const request =
      type === "suppliers"
        ? partyService.getParties({
            PageNumber: 1,
            PageSize: 200,
            IsActive: true,
          })
        : type === "items"
          ? itemService.getItems({
              PageNumber: 1,
              PageSize: 200,
              IsActive: true,
            })
          : purchaseBillService.getPurchaseBills({
              PageNumber: 1,
              PageSize: 200,
            });

    setLookups((current) => ({ ...current, [`${type}Loading`]: true }));

    cache.promise = request
      .then((response) => {
        const rows = getLookupList(response).filter((entry) => {
          if (entry?.id === null || entry?.id === undefined) {
            return false;
          }

          if (type === "suppliers") {
            return (
              entry?.isActive !== false &&
              ["supplier", "both"].includes(getPartyType(entry))
            );
          }

          return entry?.isActive !== false;
        });

        cache.loaded = true;
        setLookups((current) => ({
          ...current,
          [type]: rows,
          [`${type}Loading`]: false,
        }));
      })
      .catch((error) => {
        toast.error(getActionError(error, `Unable to load ${type}.`));
        setLookups((current) => ({ ...current, [`${type}Loading`]: false }));
      })
      .finally(() => {
        cache.promise = null;
      });

    return cache.promise;
  }, []);

  const loadLookups = useCallback(
    () =>
      Promise.all([
        loadLookup("suppliers"),
        loadLookup("items"),
        ...(config.supportsBillSelect ? [loadLookup("bills")] : []),
      ]),
    [config.supportsBillSelect, loadLookup],
  );

  useEffect(() => {
    void Promise.resolve().then(loadRecords);
  }, [loadRecords]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      dispatch(config.setFilters({ Search: searchInput }));
      dispatch(config.setPage(1));
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [config, dispatch, searchInput]);

  const supplierOptions = useMemo(
    () =>
      lookups.suppliers.map((supplier) => ({
        value: supplier.id,
        label: getPartyDisplayName(supplier),
      })),
    [lookups.suppliers],
  );

  const itemOptions = useMemo(
    () =>
      lookups.items.map((item) => ({
        value: Number(item.id),
        label: [item.name, item.itemCode].filter(Boolean).join(" - "),
      })),
    [lookups.items],
  );

  const itemsById = useMemo(
    () => new Map(lookups.items.map((item) => [String(item.id), item])),
    [lookups.items],
  );

  const billOptions = useMemo(
    () =>
      lookups.bills.map((bill) => ({
        value: Number(bill.id),
        label: `${getDocumentNumber(bill, "PB")} - ${getSupplierName(bill)}`,
      })),
    [lookups.bills],
  );

  const stats = useMemo(() => {
    const total = state.list.reduce(
      (sum, record) => sum + getRecordTotal(record),
      0,
    );
    const paid = state.list.reduce((sum, record) => sum + getPaidAmount(record), 0);
    const balance = state.list.reduce(
      (sum, record) => sum + getBalanceAmount(record),
      0,
    );

    return {
      balance: formatCurrency(state.summary?.balanceAmount ?? balance),
      count: state.summary?.totalCount ?? state.totalCount,
      paid: formatCurrency(state.summary?.paidAmount ?? paid),
      total: formatCurrency(state.summary?.totalAmount ?? total),
      metricScope: state.summaryScope,
      totalScope: "all-matching",
    };
  }, [state.list, state.summary, state.summaryScope, state.totalCount]);

  const loadItemCreateLookups = useCallback(async () => {
    setItemCreateLookups((current) => ({
      ...current,
      categoriesLoading: true,
      unitsLoading: true,
    }));

    try {
      const [categories, units] = await Promise.all([
        categoryService.getCategories({
          IsActive: true,
          PageNumber: 1,
          PageSize: 200,
        }),
        unitService.getUnits({
          IsActive: true,
          PageNumber: 1,
          PageSize: 200,
        }),
      ]);

      setItemCreateLookups({
        categories: getLookupList(categories),
        categoriesLoading: false,
        units: getLookupList(units),
        unitsLoading: false,
      });
    } catch (error) {
      toast.error(
        getActionError(error, "Unable to load item form lookups."),
      );
      setItemCreateLookups((current) => ({
        ...current,
        categoriesLoading: false,
        unitsLoading: false,
      }));
    }
  }, []);

  const openLookupCreate = useCallback(
    (type) => {
      const allowed = {
        category: canCreateCategory,
        item: canCreateItem,
        supplier: canCreateSupplier,
        unit: canCreateUnit,
      }[type];

      if (!allowed) {
        return;
      }

      if (type === "item") {
        void loadItemCreateLookups();
      }

      setLookupCreateModal((current) => ({ ...current, [type]: true }));
    },
    [
      canCreateCategory,
      canCreateItem,
      canCreateSupplier,
      canCreateUnit,
      loadItemCreateLookups,
    ],
  );

  const closeLookupCreate = useCallback((type) => {
    setLookupCreateModal((current) => ({ ...current, [type]: false }));
  }, []);

  const refreshItemCreateLookup = useCallback(async (type) => {
    if (type === "category") {
      const response = await categoryService.getCategories({
        IsActive: true,
        PageNumber: 1,
        PageSize: 200,
      });
      setItemCreateLookups((current) => ({
        ...current,
        categories: getLookupList(response),
      }));
      return;
    }

    const response = await unitService.getUnits({
      IsActive: true,
      PageNumber: 1,
      PageSize: 200,
    });
    setItemCreateLookups((current) => ({
      ...current,
      units: getLookupList(response),
    }));
  }, []);

  const submitLookupCreate = useCallback(
    async (type, payload, saveAndNew = false) => {
      const allowed = {
        category: canCreateCategory,
        item: canCreateItem,
        supplier: canCreateSupplier,
        unit: canCreateUnit,
      }[type];

      if (!allowed) {
        return;
      }

      try {
        if (type === "supplier") {
          await partyService.createParty(payload);
          toast.success("Supplier created successfully");
          cacheRef.current.suppliers.loaded = false;
          await loadLookup("suppliers", { force: true });
        } else if (type === "item") {
          await itemService.createItem(payload);
          toast.success("Item created successfully");
          cacheRef.current.items.loaded = false;
          await loadLookup("items", { force: true });
        } else if (type === "category") {
          await categoryService.createCategory(payload);
          toast.success("Category created successfully");
          await refreshItemCreateLookup("category");
        } else {
          await unitService.createUnit(payload);
          toast.success("Unit created successfully");
          await refreshItemCreateLookup("unit");
        }

        if (!saveAndNew) {
          closeLookupCreate(type);
        }
      } catch (error) {
        toast.error(getActionError(error, "Unable to create record."));
        throw error;
      }
    },
    [
      canCreateCategory,
      canCreateItem,
      canCreateSupplier,
      canCreateUnit,
      closeLookupCreate,
      loadLookup,
      refreshItemCreateLookup,
    ],
  );

  const openEdit = async (record) => {
    if (!capabilities.canUpdate) {
      return;
    }

    setModal({
      isLoading: true,
      isOpen: true,
      mode: "edit",
      record,
    });

    try {
      const response = await dispatch(config.detailThunk(record.id)).unwrap();

      setModal({
        isLoading: false,
        isOpen: true,
        mode: "edit",
        record: getResponseRecord(response, config.selectorKey.slice(0, -1)),
      });
    } catch (error) {
      toast.error(getActionError(error, "Unable to load details."));
      setModal((current) => ({ ...current, isLoading: false }));
    }
  };

  const submitRecord = async (payload) => {
    if (
      (modal.mode === "edit" && !capabilities.canUpdate) ||
      (modal.mode !== "edit" && !capabilities.canCreate)
    ) {
      return;
    }

    try {
      const response =
        modal.mode === "edit"
          ? await dispatch(
              config.updateThunk({ id: modal.record.id, payload }),
            ).unwrap()
          : await dispatch(config.createThunk(payload)).unwrap();

      toast.success(getSuccessMessage(response, `${config.singularLabel} saved`));
      setModal((current) => ({ ...current, isOpen: false }));
      await loadRecords();
    } catch (error) {
      toast.error(getActionError(error, `Unable to save ${config.singularLabel}.`));
      throw error;
    }
  };

  const runAction = async () => {
    if (!confirmation.record) {
      return;
    }

    const permissionMap = {
      cancel: capabilities.canCancel,
      confirm: capabilities.canConfirm,
      delete: capabilities.canDelete,
    };

    if (!permissionMap[confirmation.action]) {
      return;
    }

    setConfirmation((current) => ({ ...current, isLoading: true }));

    try {
      const actionMap = {
        cancel: config.cancelThunk,
        confirm: config.confirmThunk,
        delete: config.deleteThunk,
      };
      const thunk = actionMap[confirmation.action];
      const response = await dispatch(thunk(confirmation.record.id)).unwrap();
      const actionLabel = {
        cancel: "cancelled",
        confirm: "confirmed",
        delete: "deleted",
      }[confirmation.action];

      toast.success(
        getSuccessMessage(
          response.response ?? response,
          `${config.singularLabel} ${actionLabel}`,
        ),
      );
      setConfirmation({
        action: "delete",
        isLoading: false,
        isOpen: false,
        record: null,
      });
      await loadRecords();
    } catch (error) {
      toast.error(getActionError(error, "Unable to complete action."));
      setConfirmation((current) => ({ ...current, isLoading: false }));
    }
  };

  const submitConvert = async (payload) => {
    if (!capabilities.canConvert || !convertOrder.order) {
      return;
    }

    try {
      const response = await dispatch(
        config.convertThunk({ id: convertOrder.order.id, payload }),
      ).unwrap();
      const billId = response?.data?.id ?? response?.data?.purchaseBillId;

      toast.success(getSuccessMessage(response, "Order converted to bill"));
      setConvertOrder({ isOpen: false, order: null });
      await loadRecords();
      if (billId) {
        navigate(`/purchase/bills/${billId}`);
      }
    } catch (error) {
      toast.error(getActionError(error, "Unable to convert order."));
      throw error;
    }
  };

  const hasFilters =
    Boolean(searchInput) ||
    state.filters.SupplierId !== "all" ||
    (Object.hasOwn(state.filters, "Status") && state.filters.Status !== "all") ||
    Boolean(state.filters.FromDate) ||
    Boolean(state.filters.ToDate);

  const Icon = config.icon;

  const openCreate = () => {
    if (!capabilities.canCreate) {
      return;
    }

    setModal({
      isLoading: false,
      isOpen: true,
      mode: "create",
      record: null,
    });
  };

  const openAction = (action, record) => {
    const permissionMap = {
      cancel: capabilities.canCancel,
      confirm: capabilities.canConfirm,
      delete: capabilities.canDelete,
    };

    if (!permissionMap[action]) {
      return;
    }

    setConfirmation({
      action,
      isLoading: false,
      isOpen: true,
      record,
    });
  };

  const openConvert = (record) => {
    if (!capabilities.canConvert) {
      return;
    }

    setConvertOrder({ isOpen: true, order: record });
  };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <Icon className="h-3.5 w-3.5" />
            Purchase & Expense
          </>
        }
        title={config.label}
        description={`Create and manage ${config.pluralLabel}.`}
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
                New
              </AppButton>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <PurchaseStatCard
          icon={Icon}
          label="Count"
          loading={state.loading}
          value={stats.count}
          scope={stats.totalScope}
          colorClass="bg-brand-light text-brand"
        />
        <PurchaseStatCard
          icon={Icon}
          label="Total"
          loading={state.loading}
          value={stats.total}
          scope={stats.metricScope}
          colorClass="bg-emerald-50 text-emerald-600"
        />
        <PurchaseStatCard
          icon={Icon}
          label={config.supportsPaidAmount ? "Unpaid" : "Paid / Balance"}
          loading={state.loading}
          value={config.supportsPaidAmount ? stats.balance : stats.paid}
          scope={stats.metricScope}
          colorClass="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_220px_180px_160px_160px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={`Search ${config.pluralLabel}...`}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <AppSelect
            value={state.filters.SupplierId}
            onChange={(value) => {
              dispatch(config.setFilters({ SupplierId: value }));
              dispatch(config.setPage(1));
            }}
            options={[{ value: "all", label: "All suppliers" }, ...supplierOptions]}
            aria-label="Filter by supplier"
            creatable={canCreateSupplier}
            createLabel="Create new supplier"
            onCreateClick={() => openLookupCreate("supplier")}
          />
          {Object.hasOwn(state.filters, "Status") ? (
            <AppSelect
              value={state.filters.Status}
              onChange={(value) => {
                dispatch(config.setFilters({ Status: value }));
                dispatch(config.setPage(1));
              }}
              options={STATUS_OPTIONS}
              aria-label="Filter by status"
            />
          ) : (
            <div />
          )}
          <AppInput
            type="date"
            value={state.filters.FromDate}
            onChange={(event) => {
              dispatch(config.setFilters({ FromDate: event.target.value }));
              dispatch(config.setPage(1));
            }}
            aria-label="From date"
            className="h-10"
          />
          <AppInput
            type="date"
            value={state.filters.ToDate}
            onChange={(event) => {
              dispatch(config.setFilters({ ToDate: event.target.value }));
              dispatch(config.setPage(1));
            }}
            aria-label="To date"
            className="h-10"
          />
          <AppButton
            variant="secondary"
            className="h-10 rounded-lg px-3"
            disabled={!hasFilters}
            onClick={() => {
              setSearchInput("");
              dispatch(
                config.setFilters({
                  Search: "",
                  SupplierId: "all",
                  Status: "all",
                  FromDate: "",
                  ToDate: "",
                  SortBy: "",
                  SortDirection: "",
                }),
              );
              dispatch(config.setPage(1));
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </AppButton>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] table-fixed text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  #
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Document #
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Supplier
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Date
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                  Total (₹)
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                  Paid (₹)
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                  Balance (₹)
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="w-52 border-b border-slate-200 px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {state.loading ? (
                Array.from({ length: 5 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={9} className="px-3 py-3">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : state.error || state.list.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    {state.error || `No ${config.pluralLabel} found.`}
                  </td>
                </tr>
              ) : (
                state.list.map((record, index) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
                      {(state.pageNumber - 1) * state.pageSize + index + 1}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-sm font-semibold text-slate-900">
                      {getDocumentNumber(record, config.fallbackPrefix)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-sm text-slate-600">
                      {getSupplierName(record)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-sm text-slate-600">
                      {formatDate(record[config.dateField])}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right text-sm font-semibold tabular-nums text-slate-900">
                      {formatNumber(getRecordTotal(record))}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right text-sm tabular-nums text-slate-600">
                      {formatNumber(getPaidAmount(record))}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right text-sm tabular-nums text-slate-600">
                      {formatNumber(getBalanceAmount(record))}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      <PurchaseStatusPill meta={getStatusMeta(record.status)} />
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <ActionButton
                          icon={Eye}
                          label="View"
                          onClick={() => navigate(config.detailPath(record.id))}
                        />
                        {capabilities.canUpdate && (
                          <ActionButton
                            icon={Pencil}
                            label="Edit"
                            onClick={() => void openEdit(record)}
                          />
                        )}
                        {config.supportsConfirm && capabilities.canConfirm && (
                          <ActionButton
                            icon={CheckCircle2}
                            label="Confirm"
                            onClick={() => openAction("confirm", record)}
                          />
                        )}
                        {config.supportsCancel && capabilities.canCancel && (
                          <ActionButton
                            icon={Ban}
                            label="Cancel"
                            tone="danger"
                            onClick={() => openAction("cancel", record)}
                          />
                        )}
                        {config.supportsConvert && capabilities.canConvert && (
                          <ActionButton
                            icon={ArrowRight}
                            label="Convert to Bill"
                            onClick={() => openConvert(record)}
                          />
                        )}
                        {capabilities.canDelete && (
                          <ActionButton
                            icon={Trash2}
                            label="Delete"
                            tone="danger"
                            onClick={() => openAction("delete", record)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PurchasePagination
          disabled={state.loading}
          itemCount={state.list.length}
          itemLabel={config.pluralLabel}
          onPageChange={(value) => dispatch(config.setPage(value))}
          onPageSizeChange={(value) => dispatch(config.setPageSize(value))}
          pageNumber={state.pageNumber}
          pageSize={state.pageSize}
          totalCount={state.totalCount}
          totalPages={state.totalPages}
        />
      </div>

      <PurchaseDocumentFormModal
        billOptions={billOptions}
        canCreateItem={canCreateItem}
        canCreateSupplier={canCreateSupplier}
        config={config}
        isLoading={modal.isLoading}
        isOpen={modal.isOpen}
        itemEmptyMessage="No items found in inventory."
        itemLoading={lookups.itemsLoading}
        itemOptions={itemOptions}
        itemsById={itemsById}
        mode={modal.mode}
        onClose={() => setModal((current) => ({ ...current, isOpen: false }))}
        onCreateItem={() => openLookupCreate("item")}
        onCreateSupplier={() => openLookupCreate("supplier")}
        onSubmit={submitRecord}
        record={modal.record}
        supplierOptions={supplierOptions}
      />

      <PartyFormModal
        isLoading={false}
        isOpen={lookupCreateModal.supplier}
        mode="create"
        onClose={() => closeLookupCreate("supplier")}
        onSubmit={(payload) => submitLookupCreate("supplier", payload)}
        submitLabel="Create Supplier"
        title="Add Supplier"
      />

      <ItemFormModal
        canCreateCategory={canCreateCategory}
        canCreateUnit={canCreateUnit}
        categoryOptions={itemCreateLookups.categories.map((category) => ({
          value: Number(category.id),
          label: category.name,
        }))}
        categoryEmptyMessage="No categories yet - add one in Categories."
        categoryLoading={itemCreateLookups.categoriesLoading}
        isLoading={false}
        isOpen={lookupCreateModal.item}
        item={null}
        mode="create"
        onClose={() => closeLookupCreate("item")}
        onCreateCategory={() => openLookupCreate("category")}
        onCreateUnit={() => openLookupCreate("unit")}
        onSubmit={(payload, saveAndNew) =>
          submitLookupCreate("item", payload, saveAndNew)
        }
        unitOptions={itemCreateLookups.units.map((unit) => ({
          value: Number(unit.id),
          label: unit.shortName ? `${unit.name} (${unit.shortName})` : unit.name,
        }))}
        unitEmptyMessage="No units yet - add one in Units."
        unitLoading={itemCreateLookups.unitsLoading}
      />

      <CategoryFormModal
        category={null}
        isLoading={false}
        isOpen={lookupCreateModal.category}
        mode="create"
        onClose={() => closeLookupCreate("category")}
        onSubmit={(payload) => submitLookupCreate("category", payload)}
      />

      <UnitFormModal
        isLoading={false}
        isOpen={lookupCreateModal.unit}
        mode="create"
        onClose={() => closeLookupCreate("unit")}
        onSubmit={(payload, saveAndNew) =>
          submitLookupCreate("unit", payload, saveAndNew)
        }
        unit={null}
      />

      {config.supportsConvert && (
        <ConvertOrderModal
          isOpen={convertOrder.isOpen}
          onClose={() => setConvertOrder({ isOpen: false, order: null })}
          onSubmit={submitConvert}
          order={convertOrder.order}
        />
      )}

      <PurchaseConfirmDialog
        confirmLabel={
          confirmation.action === "delete"
            ? "Delete"
            : confirmation.action === "cancel"
              ? "Cancel"
              : "Confirm"
        }
        description={`${getDocumentNumber(
          confirmation.record,
          config.fallbackPrefix,
        )} will be ${confirmation.action}ed.`}
        isLoading={confirmation.isLoading}
        isOpen={confirmation.isOpen}
        title={`${confirmation.action === "delete" ? "Delete" : confirmation.action === "cancel" ? "Cancel" : "Confirm"} ${config.singularLabel}?`}
        tone={confirmation.action === "confirm" ? "primary" : "danger"}
        onCancel={() =>
          setConfirmation({
            action: "delete",
            isLoading: false,
            isOpen: false,
            record: null,
          })
        }
        onConfirm={runAction}
      />
    </section>
  );
};

export default PurchaseDocumentListPage;
