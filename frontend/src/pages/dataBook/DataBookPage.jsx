import {
  Download,
  Grid3X3,
  Globe,
  Keyboard,
  List,
  Lock,
  NotebookText,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../components/common/AppButton";
import useUnsavedChanges from "../../hooks/useUnsavedChanges";
import AppTooltip from "../../components/common/AppTooltip";
import PageHeader from "../../components/common/PageHeader";
import StatCards from "../../components/common/StatCards";
import {
  DATA_BOOK_TAB_OPTIONS,
  DATA_BOOK_TABS,
  getDataBookTabQuery,
} from "../../constants/dataBookEnums";
import { dataBookService } from "../../services/dataBook/dataBookService";
import {
  createDataBookEntry,
  deleteDataBookEntry,
  fetchDataBookEntries,
  fetchDataBookEntryById,
  fetchDataBookEntryHistory,
  setDataBookFilters,
  setDataBookPage,
  setDataBookPageSize,
  setDataBookTab,
  updateDataBookEntry,
} from "../../store/slices/dataBookSlice";
import {
  getApiCorrelationId,
  getApiErrorMessage,
  getApiStatus,
} from "../../utils/apiError";
import { getDataBookConflictFields } from "../../utils/dataBookHistory";
import {
  downloadResponseBlob,
} from "../../utils/fileDownload";
import { ProcurementTabs } from "../procurement/ProcurementShared";
import DataBookFilters from "./DataBookFilters";
import DataBookGrid from "./DataBookGrid";
import DataBookPagination from "./DataBookPagination";
import DataBookSheetBar from "./DataBookSheetBar";
import DataBookTable from "./DataBookTable";
import DeleteEntryModal from "./DeleteEntryModal";
import EntryDetailModal from "./EntryDetailModal";
import EntryFormModal from "./EntryFormModal";
import EntryHistoryModal from "./EntryHistoryModal";
import useDataBookCapabilities from "./useDataBookCapabilities";

const CONCURRENCY_CODE = "DATA_BOOK_ENTRY_CONCURRENCY_CONFLICT";

const extractEntry = (response) =>
  response?.data?.entry ??
  response?.data?.dataBookEntry ??
  response?.data?.record ??
  response?.data;

const getConflictCode = (error) =>
  error?.conflictCode ??
  error?.data?.conflictCode ??
  error?.apiError?.conflictCode ??
  error?.apiError?.data?.conflictCode ??
  error?.response?.data?.conflictCode ??
  error?.response?.data?.data?.conflictCode;

const isConcurrencyConflict = (error) =>
  getApiStatus(error) === 409 && getConflictCode(error) === CONCURRENCY_CODE;

const getCorrelationId = (error) =>
  error?.correlationId || getApiCorrelationId(error);

const withReference = (message, correlationId) =>
  correlationId && !String(message).includes(correlationId)
    ? `${message} Ref: ${correlationId}`
    : message;

const getErrorText = (error, fallback) =>
  withReference(
    getApiErrorMessage(error, fallback),
    getCorrelationId(error),
  );

const getNotFoundText = (error) =>
  withReference("Entry not found.", getCorrelationId(error));

const writeClipboard = async (value) => {
  if (!globalThis.navigator?.clipboard?.writeText) {
    throw new Error("Clipboard access is unavailable in this browser.");
  }

  await globalThis.navigator.clipboard.writeText(String(value ?? ""));
};

const getBlobErrorText = async (blob, status) => {
  try {
    const text = await blob.text();
    const data = text ? JSON.parse(text) : null;
    const error = { response: { data, status } };
    return withReference(
      getApiErrorMessage(error, "Unable to export Data Book entries."),
      data?.correlationId || data?.data?.correlationId || getApiCorrelationId(error),
    );
  } catch {
    return "Unable to export Data Book entries.";
  }
};

const getStoredViewMode = (category) => {
  try {
    const stored = globalThis.localStorage?.getItem("dataBookViewMode");
    if (stored === "grid" || stored === "list") return stored;
  } catch {
    // A local preference must never prevent Data Book from loading.
  }

  return category ? "grid" : "list";
};

const DataBookPage = () => {
  const dispatch = useDispatch();
  const state = useSelector((storeState) => storeState.dataBook);
  const capabilities = useDataBookCapabilities();
  const [viewMode, setViewMode] = useState(() =>
    getStoredViewMode(state.filters.Category),
  );
  const [activeSheet, setActiveSheet] = useState(
    () => state.filters.Category || null,
  );
  const [ephemeralSheet, setEphemeralSheet] = useState(null);
  const [isNewSheetOpen, setIsNewSheetOpen] = useState(false);
  const [sheetCatalog, setSheetCatalog] = useState({
    categories: [],
    hasUncategorised: false,
  });
  const [gridData, setGridData] = useState({
    entries: [],
    error: "",
    loading: false,
  });
  const [searchValue, setSearchValue] = useState(state.filters.Search);
  const [copyingId, setCopyingId] = useState(null);
  const [gridPending, setGridPending] = useState(0);
  const gridDraftSaver = useRef(null);
  const captureGridPending = useCallback((count, saver) => { setGridPending(count); gridDraftSaver.current = saver; }, []);
  const { confirmLeave } = useUnsavedChanges({ when: gridPending > 0, message: "This sheet has unsaved or pasted rows. Save all before changing the sheet/view, or continue without applying them?" });
  const [exporting, setExporting] = useState(false);
  const [formModal, setFormModal] = useState({
    entry: null,
    isLoading: false,
    isOpen: false,
    mode: "create",
  });
  const [formConflict, setFormConflict] = useState(null);
  const [detailModal, setDetailModal] = useState({
    entry: null,
    isLoading: false,
    isOpen: false,
  });
  const [deleteModal, setDeleteModal] = useState({
    entry: null,
    isLoading: false,
    isOpen: false,
  });
  const [deleteConflict, setDeleteConflict] = useState(null);
  const [historyModal, setHistoryModal] = useState({
    entry: null,
    error: "",
    history: [],
    isLoading: false,
    isOpen: false,
  });
  const openRequestRef = useRef(0);
  const gridRequestRef = useRef(0);

  const queryParams = useMemo(
    () => ({
      ...state.filters,
      Category: viewMode === "grid"
        ? activeSheet ?? state.filters.Category
        : state.filters.Category,
      ...getDataBookTabQuery(state.activeTab),
      PageNumber: viewMode === "grid" ? 1 : state.pageNumber,
      PageSize: viewMode === "grid" ? 200 : state.pageSize,
    }),
    [activeSheet, state.activeTab, state.filters, state.pageNumber, state.pageSize, viewMode],
  );

  const loadEntries = useCallback(
    () => dispatch(fetchDataBookEntries(queryParams)),
    [dispatch, queryParams],
  );

  useEffect(() => {
    void Promise.resolve().then(loadEntries);
  }, [loadEntries, viewMode]);

  const loadSheetCatalog = useCallback(async () => {
    try {
      const items = [];
      let pageNumber = 1;
      let totalPages = 1;

      do {
        const response = await dataBookService.getEntries({
          PageNumber: pageNumber,
          PageSize: 200,
          Visibility: "all",
        });
        items.push(...(
          Array.isArray(response?.data?.items) ? response.data.items : []
        ));
        totalPages = Math.max(1, Number(response?.data?.totalPages) || 1);
        pageNumber += 1;
      } while (pageNumber <= totalPages);

      const next = {
        categories: [...new Set(items
          .map((entry) => String(entry.category ?? "").trim())
          .filter(Boolean))]
          .sort((left, right) => left.localeCompare(right)),
        hasUncategorised: items.some(
          (entry) => !String(entry.category ?? "").trim(),
        ),
      };
      setSheetCatalog(next);
      return next;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    void loadSheetCatalog();
  }, [loadSheetCatalog]);

  const gridQueryParams = useMemo(() => ({
    ...state.filters,
    Category: activeSheet ?? state.filters.Category,
    ...getDataBookTabQuery(state.activeTab),
    PageSize: 200,
  }), [activeSheet, state.activeTab, state.filters]);

  const loadGridEntries = useCallback(async () => {
    const requestId = ++gridRequestRef.current;

    if (viewMode !== "grid" || activeSheet === null) {
      setGridData({ entries: [], error: "", loading: false });
      return;
    }

    setGridData((current) => ({ ...current, error: "", loading: true }));

    try {
      const entries = [];
      let pageNumber = 1;
      let totalPages = 1;

      do {
        const response = await dataBookService.getEntries({
          ...gridQueryParams,
          PageNumber: pageNumber,
        });
        entries.push(...(
          Array.isArray(response?.data?.items) ? response.data.items : []
        ));
        totalPages = Math.max(1, Number(response?.data?.totalPages) || 1);
        pageNumber += 1;
      } while (pageNumber <= totalPages);

      if (gridRequestRef.current !== requestId) return;
      setGridData({
        entries: activeSheet === ""
          ? entries.filter((entry) => !String(entry.category ?? "").trim())
          : entries,
        error: "",
        loading: false,
      });
    } catch (error) {
      if (gridRequestRef.current !== requestId) return;
      setGridData({
        entries: [],
        error: getErrorText(error, "Unable to load this sheet."),
        loading: false,
      });
    }
  }, [activeSheet, gridQueryParams, viewMode]);

  useEffect(() => {
    void loadGridEntries();
  }, [loadGridEntries]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (searchValue !== state.filters.Search) {
        dispatch(setDataBookFilters({ Search: searchValue }));
        dispatch(setDataBookPage(1));
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [dispatch, searchValue, state.filters.Search]);

  const categories = useMemo(() =>
    [...new Set([
      ...sheetCatalog.categories,
      ...state.items.map((entry) => entry.category).filter(Boolean),
      ...(ephemeralSheet ? [ephemeralSheet] : []),
    ])].sort((left, right) => left.localeCompare(right)),
  [ephemeralSheet, sheetCatalog.categories, state.items]);

  const selectViewMode = useCallback((mode) => {
    if (mode !== viewMode && gridPending > 0 && !confirmLeave(() => {})) return;
    if (gridPending > 0) gridDraftSaver.current?.();
    setViewMode(mode);
    try {
      globalThis.localStorage?.setItem("dataBookViewMode", mode);
    } catch {
      // The selected mode still works for this session.
    }
  }, [confirmLeave, gridPending, viewMode]);

  const selectSheet = useCallback((category) => {
    if (category !== activeSheet && gridPending > 0 && !confirmLeave(() => {})) return;
    if (gridPending > 0) gridDraftSaver.current?.();
    setGridPending(0);
    setActiveSheet(category);
    dispatch(setDataBookFilters({ Category: category }));
    dispatch(setDataBookPage(1));
    selectViewMode("grid");
  }, [activeSheet, confirmLeave, dispatch, gridPending, selectViewMode]);

  const refreshAll = useCallback(async () => {
    if (gridPending > 0 && !confirmLeave(() => {})) return;
    if (gridPending > 0) gridDraftSaver.current?.();
    if (ephemeralSheet) {
      setEphemeralSheet(null);
      setActiveSheet(null);
      dispatch(setDataBookFilters({ Category: "" }));
      dispatch(setDataBookPage(1));
    }
    await Promise.all([loadEntries(), loadSheetCatalog(), loadGridEntries()]);
  }, [confirmLeave, dispatch, ephemeralSheet, gridPending, loadEntries, loadGridEntries, loadSheetCatalog]);

  const stats = useMemo(() => {
    const publicOnPage = state.items.filter((entry) => !entry.isPrivate).length;
    const privateOnPage = state.items.filter((entry) => entry.isPrivate).length;
    const publicIsFullScope = state.activeTab === DATA_BOOK_TABS.PUBLIC;
    const privateIsFullScope = state.activeTab === DATA_BOOK_TABS.MY_PRIVATE;

    return [
      {
        hint: "All entries matching the current view",
        icon: NotebookText,
        key: "total",
        label: "Total entries",
        value: state.totalCount,
      },
      {
        hint: publicIsFullScope ? "All matching public entries" : "Current page",
        icon: Globe,
        key: "public",
        label: "Public",
        value: publicIsFullScope ? state.totalCount : publicOnPage,
      },
      {
        hint: privateIsFullScope ? "All matching private entries" : "Current page",
        icon: Lock,
        key: "private",
        label: "My private",
        value: privateIsFullScope ? state.totalCount : privateOnPage,
      },
    ];
  }, [state.activeTab, state.items, state.totalCount]);

  const fetchFullEntry = useCallback(
    async (id) => {
      const response = await dispatch(fetchDataBookEntryById(id)).unwrap();
      return extractEntry(response);
    },
    [dispatch],
  );

  const handleDetailFailure = useCallback(
    async (error, close) => {
      if (getApiStatus(error) === 404) {
        toast.error(getNotFoundText(error));
        close();
        await loadEntries();
        return true;
      }

      toast.error(getErrorText(error, "Unable to load the entry."));
      return false;
    },
    [loadEntries],
  );

  const copyValueFromRow = useCallback(
    async (entry) => {
      setCopyingId(entry.id);
      try {
        const detail = await fetchFullEntry(entry.id);
        await writeClipboard(detail.value);
        toast.success("Value copied");
      } catch (error) {
        await handleDetailFailure(error, () => undefined);
      } finally {
        setCopyingId((current) =>
          String(current) === String(entry.id) ? null : current,
        );
      }
    },
    [fetchFullEntry, handleDetailFailure],
  );

  const copyKnownValue = useCallback(async (value, success = "Value copied") => {
    try {
      await writeClipboard(value);
      toast.success(success);
    } catch (error) {
      toast.error(getErrorText(error, "Unable to copy value."));
    }
  }, []);

  const openCreate = useCallback(() => {
    if (!capabilities.canCreate) return;
    openRequestRef.current += 1;
    setFormConflict(null);
    setFormModal({ entry: null, isLoading: false, isOpen: true, mode: "create" });
  }, [capabilities.canCreate]);

  const openEdit = useCallback(
    async (entry) => {
      if (!capabilities.canEdit || !entry.canEdit) return;
      const requestId = ++openRequestRef.current;
      setFormConflict(null);
      setFormModal({ entry, isLoading: true, isOpen: true, mode: "edit" });

      try {
        const detail = await fetchFullEntry(entry.id);
        if (openRequestRef.current !== requestId) return;
        setFormModal({ entry: detail, isLoading: false, isOpen: true, mode: "edit" });
      } catch (error) {
        if (openRequestRef.current !== requestId) return;
        const closed = await handleDetailFailure(error, () =>
          setFormModal((current) => ({ ...current, isOpen: false })),
        );
        if (!closed) {
          setFormModal((current) => ({ ...current, isLoading: false }));
        }
      }
    },
    [capabilities.canEdit, fetchFullEntry, handleDetailFailure],
  );

  const openDetail = useCallback(
    async (entry) => {
      const requestId = ++openRequestRef.current;
      setDetailModal({ entry, isLoading: true, isOpen: true });

      try {
        const detail = await fetchFullEntry(entry.id);
        if (openRequestRef.current !== requestId) return;
        setDetailModal({ entry: detail, isLoading: false, isOpen: true });
      } catch (error) {
        if (openRequestRef.current !== requestId) return;
        const closed = await handleDetailFailure(error, () =>
          setDetailModal((current) => ({ ...current, isOpen: false })),
        );
        if (!closed) {
          setDetailModal((current) => ({ ...current, isLoading: false }));
        }
      }
    },
    [fetchFullEntry, handleDetailFailure],
  );

  const closeForm = useCallback(() => {
    openRequestRef.current += 1;
    setFormConflict(null);
    setFormModal((current) => ({ ...current, isOpen: false }));
  }, []);

  const loadEditConflict = useCallback(
    async (error, mine) => {
      toast.error(getErrorText(error, "The entry changed before it could be saved."));
      setFormConflict({ fields: [], mine, reloading: true, resolving: true });

      try {
        const current = await fetchFullEntry(formModal.entry.id);
        setFormConflict({
          current,
          fields: getDataBookConflictFields(mine, current),
          mine,
          reloading: false,
          resolving: false,
        });
      } catch (reloadError) {
        if (getApiStatus(reloadError) === 404) {
          toast.error(getNotFoundText(reloadError));
          closeForm();
          await loadEntries();
          return;
        }
        toast.error(getErrorText(reloadError, "Unable to reload the saved entry."));
        setFormConflict((current) => ({
          ...current,
          error: getErrorText(reloadError, "Unable to reload the saved entry."),
          reloading: false,
          resolving: false,
        }));
      }
    },
    [closeForm, fetchFullEntry, formModal.entry, loadEntries],
  );

  const submitForm = useCallback(
    async (payload) => {
      try {
        const response =
          formModal.mode === "edit"
            ? await dispatch(
                updateDataBookEntry({ id: formModal.entry.id, payload }),
              ).unwrap()
            : await dispatch(createDataBookEntry(payload)).unwrap();

        toast.success(
          response.message ||
            (formModal.mode === "edit"
              ? "Entry updated successfully"
              : "Entry created successfully"),
        );
        closeForm();
        await loadEntries();
      } catch (error) {
        if (formModal.mode === "edit" && isConcurrencyConflict(error)) {
          await loadEditConflict(error, payload);
          return;
        }

        if (formModal.mode === "edit" && getApiStatus(error) === 404) {
          toast.error(getNotFoundText(error));
          closeForm();
          await loadEntries();
          return;
        }

        toast.error(getErrorText(error, "Unable to save entry."));
        throw error;
      }
    },
    [closeForm, dispatch, formModal.entry, formModal.mode, loadEditConflict, loadEntries],
  );

  const keepConflictChanges = useCallback(async () => {
    if (!formConflict?.current || !formConflict?.mine) return;
    setFormConflict((current) => ({ ...current, error: "", resolving: true }));
    const payload = {
      ...formConflict.mine,
      rowVersion: formConflict.current.rowVersion,
    };

    try {
      const response = await dispatch(
        updateDataBookEntry({ id: formModal.entry.id, payload }),
      ).unwrap();
      toast.success(response.message || "Entry updated successfully");
      closeForm();
      await loadEntries();
    } catch (error) {
      if (isConcurrencyConflict(error)) {
        await loadEditConflict(error, formConflict.mine);
        return;
      }
      if (getApiStatus(error) === 404) {
        toast.error(getNotFoundText(error));
        closeForm();
        await loadEntries();
        return;
      }
      const message = getErrorText(error, "Unable to save entry.");
      toast.error(message);
      setFormConflict((current) => ({ ...current, error: message, resolving: false }));
    }
  }, [closeForm, dispatch, formConflict, formModal.entry, loadEditConflict, loadEntries]);

  const discardConflictChanges = useCallback(() => {
    if (!formConflict?.current) return;
    setFormModal((current) => ({ ...current, entry: formConflict.current }));
    setFormConflict(null);
  }, [formConflict]);

  const openDelete = useCallback((entry) => {
    if (!capabilities.canDelete || !entry.canDelete) return;
    setDeleteConflict(null);
    setDeleteModal({ entry, isLoading: false, isOpen: true });
  }, [capabilities.canDelete]);

  const confirmDelete = useCallback(async () => {
    if (!deleteModal.entry) return;
    setDeleteModal((current) => ({ ...current, isLoading: true }));
    const rowVersion = deleteConflict?.current?.rowVersion ?? deleteModal.entry.rowVersion;

    try {
      const response = await dispatch(
        deleteDataBookEntry({ id: deleteModal.entry.id, rowVersion }),
      ).unwrap();
      toast.success(response.message || "Entry deleted successfully");
      setDeleteConflict(null);
      setDeleteModal({ entry: null, isLoading: false, isOpen: false });
      await loadEntries();
    } catch (error) {
      if (isConcurrencyConflict(error)) {
        toast.error(getErrorText(error, "The entry changed before it could be deleted."));
        try {
          const selectedVersion = deleteConflict?.current ?? deleteModal.entry;
          const current = await fetchFullEntry(deleteModal.entry.id);
          const selected = { ...selectedVersion, value: current.value };
          setDeleteConflict({
            current,
            fields: getDataBookConflictFields(selected, current),
            resolving: false,
          });
        } catch (reloadError) {
          if (getApiStatus(reloadError) === 404) {
            toast.error(getNotFoundText(reloadError));
            setDeleteConflict(null);
            setDeleteModal({ entry: null, isLoading: false, isOpen: false });
            await loadEntries();
            return;
          }
          toast.error(getErrorText(reloadError, "Unable to reload the saved entry."));
        } finally {
          setDeleteModal((current) => ({ ...current, isLoading: false }));
        }
        return;
      }

      if (getApiStatus(error) === 404) {
        toast.error(getNotFoundText(error));
        setDeleteConflict(null);
        setDeleteModal({ entry: null, isLoading: false, isOpen: false });
        await loadEntries();
        return;
      }

      toast.error(getErrorText(error, "Unable to delete entry."));
      setDeleteModal((current) => ({ ...current, isLoading: false }));
    }
  }, [deleteConflict, deleteModal.entry, dispatch, fetchFullEntry, loadEntries]);

  const loadHistory = useCallback(
    async (entry) => {
      setHistoryModal({ entry, error: "", history: [], isLoading: true, isOpen: true });
      try {
        const response = await dispatch(fetchDataBookEntryHistory(entry.id)).unwrap();
        const payload = response.data;
        const history = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.items)
            ? payload.items
            : [];
        setHistoryModal({ entry, error: "", history, isLoading: false, isOpen: true });
      } catch (error) {
        if (getApiStatus(error) === 404) {
          toast.error(getNotFoundText(error));
          setHistoryModal((current) => ({ ...current, isOpen: false }));
          await loadEntries();
          return;
        }
        const message = getErrorText(error, "Unable to load entry history.");
        toast.error(message);
        setHistoryModal({ entry, error: message, history: [], isLoading: false, isOpen: true });
      }
    },
    [dispatch, loadEntries],
  );

  const exportEntries = useCallback(async () => {
    setExporting(true);
    try {
      const response = await dataBookService.exportEntries(queryParams);
      const contentType = String(response?.headers?.["content-type"] ?? "").toLowerCase();

      if (contentType.includes("json")) {
        const message = await getBlobErrorText(response.data, response.status);
        throw new Error(message);
      }

      const date = new Date().toISOString().slice(0, 10);
      await downloadResponseBlob(response, `cosmos_data_book_${date}.csv`);
      toast.success("Data Book export downloaded");
    } catch (error) {
      if (error?.response?.data instanceof Blob) {
        const message = await getBlobErrorText(
          error.response.data,
          error.response.status,
        );
        toast.error(message);
      } else {
        toast.error(getErrorText(error, "Unable to export Data Book entries."));
      }
    } finally {
      setExporting(false);
    }
  }, [queryParams]);

  const refreshButton = (
    <AppButton
      aria-label="Refresh Data Book"
      className="h-10 px-3.5"
      disabled={state.loading}
      variant="secondary"
      onClick={refreshAll}
    >
      <RefreshCw className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} />
      Refresh
    </AppButton>
  );

  const viewSwitch = (
    <div
      aria-label="Data Book view"
      className="flex h-10 items-center rounded-xl bg-slate-100 p-1"
      role="group"
    >
      <button
        aria-pressed={viewMode === "grid"}
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${
          viewMode === "grid" ? "bg-white text-brand shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"
        }`}
        type="button"
        onClick={() => selectViewMode("grid")}
      >
        <Grid3X3 className="h-4 w-4" />
        Grid
      </button>
      <button
        aria-pressed={viewMode === "list"}
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${
          viewMode === "list" ? "bg-white text-brand shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"
        }`}
        type="button"
        onClick={() => selectViewMode("list")}
      >
        <List className="h-4 w-4" />
        List
      </button>
    </div>
  );

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      {viewSwitch}
      <span aria-hidden="true" className="hidden h-6 w-px bg-slate-200 sm:block" />
      <AppTooltip
        label={state.loading
          ? "Wait for entries to finish loading."
          : "Reload entries and sheets"}
      >
        {refreshButton}
      </AppTooltip>
      {capabilities.canExport ? (
        exporting ? (
          <AppTooltip label="The CSV export is being prepared.">
            <AppButton
              className="h-10 px-3.5"
              disabled
              isLoading
              loadingText="Exporting…"
              variant="secondary"
            />
          </AppTooltip>
        ) : (
          <AppTooltip label="Export the current public and private results as CSV">
            <AppButton className="h-10 px-3.5" variant="secondary" onClick={exportEntries}>
              <Download className="h-4 w-4" />
              Export CSV
            </AppButton>
          </AppTooltip>
        )
      ) : null}
      {capabilities.canCreate ? (
        <AppTooltip label="Use the guided form to create one entry">
          <AppButton className="h-10 px-4" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New entry
          </AppButton>
        </AppTooltip>
      ) : null}
    </div>
  );

  return (
    <section className="min-w-0 space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <PageHeader
          align="center"
          badge={<><NotebookText className="h-3.5 w-3.5" />Reference workspace</>}
          description="Keep repeat-use values organised by sheet, then find and copy them in seconds."
          title="Data Book"
          actions={headerActions}
        />
        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
              {viewMode === "grid" ? <Grid3X3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {viewMode === "grid" ? "Sheet workspace" : "All-entry directory"}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                {viewMode === "grid"
                  ? "Choose a sheet, paste rows from Excel, review changes, then save."
                  : "Search across every sheet, inspect details and export filtered results."}
              </p>
            </div>
          </div>
          {viewMode === "grid" ? (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600">
                <Keyboard className="h-3.5 w-3.5" />
                Shortcuts
              </span>
              <span className="rounded-lg bg-slate-100 px-2 py-1"><kbd className="font-semibold text-slate-700">Tab</kbd> next cell</span>
              <span className="rounded-lg bg-slate-100 px-2 py-1"><kbd className="font-semibold text-slate-700">Enter</kbd> next row</span>
              <span className="rounded-lg bg-slate-100 px-2 py-1"><kbd className="font-semibold text-slate-700">Ctrl S</kbd> save</span>
            </div>
          ) : null}
        </div>
      </div>

      <StatCards cards={stats} loading={state.loading} />

      <ProcurementTabs
        active={state.activeTab}
        tabs={DATA_BOOK_TAB_OPTIONS}
        onChange={(tab) => confirmLeave(() => { if (gridPending > 0) gridDraftSaver.current?.(); setGridPending(0); dispatch(setDataBookTab(tab)); })}
      />

      <DataBookFilters
        categories={categories}
        filters={state.filters}
        mode={viewMode}
        searchValue={searchValue}
        onChange={(patch) => {
          if (Object.hasOwn(patch, "Search")) {
            setSearchValue(patch.Search);
            return;
          }
          if (Object.hasOwn(patch, "Category")) {
            if (patch.Category) {
              selectSheet(patch.Category);
            } else {
              setActiveSheet(null);
              dispatch(setDataBookFilters(patch));
              dispatch(setDataBookPage(1));
              selectViewMode("list");
            }
            return;
          }
          dispatch(setDataBookFilters(patch));
          dispatch(setDataBookPage(1));
        }}
        onClear={() => {
          setSearchValue("");
          if (viewMode === "grid") {
            dispatch(
              setDataBookFilters({
                Category: activeSheet ?? "",
                FromDate: "",
                Search: "",
                ToDate: "",
              }),
            );
            dispatch(setDataBookPage(1));
            return;
          }
          setActiveSheet(null);
          setEphemeralSheet(null);
          dispatch(
            setDataBookFilters({ Category: "", FromDate: "", Search: "", ToDate: "" }),
          );
          dispatch(setDataBookPage(1));
          selectViewMode("list");
        }}
      />

      {viewMode === "grid" ? (
        <>
          <DataBookSheetBar
            activeSheet={activeSheet}
            canCreate={capabilities.canCreate}
            categories={categories}
            hasUncategorised={sheetCatalog.hasUncategorised || state.items.some(
              (entry) => !String(entry.category ?? "").trim(),
            )}
            isNewSheetOpen={isNewSheetOpen}
            onCreateSheet={(category) => {
              if (!sheetCatalog.categories.includes(category)) {
                setEphemeralSheet(category);
              }
              selectSheet(category);
            }}
            onNewSheetOpenChange={setIsNewSheetOpen}
            onSelect={selectSheet}
          />
          <DataBookGrid
            onPendingChange={captureGridPending}
            key={`${state.activeTab}:${activeSheet === null ? "no-sheet" : `sheet-${activeSheet}`}`}
            draftContext={`${state.activeTab}:${activeSheet ?? "none"}`}
            activeSheet={activeSheet}
            capabilities={capabilities}
            copyingId={copyingId}
            entries={gridData.entries}
            error={gridData.error}
            loading={gridData.loading}
            onCommitted={(entry) => {
              if (entry?.category) {
                setSheetCatalog((current) => ({
                  ...current,
                  categories: [...new Set([...current.categories, entry.category])]
                    .sort((left, right) => left.localeCompare(right)),
                }));
                if (entry.category === ephemeralSheet) setEphemeralSheet(null);
              } else if (entry) {
                setSheetCatalog((current) => ({ ...current, hasUncategorised: true }));
              } else {
                void loadSheetCatalog();
              }
            }}
            onCopy={copyValueFromRow}
            onHistory={loadHistory}
            onNewSheet={() => setIsNewSheetOpen(true)}
            onRetry={refreshAll}
          />
        </>
      ) : (
        <>
          <DataBookTable
            capabilities={capabilities}
            copyingId={copyingId}
            entries={state.items}
            error={state.error}
            loading={state.loading}
            pageNumber={state.pageNumber}
            pageSize={state.pageSize}
            onCopy={copyValueFromRow}
            onCreate={openCreate}
            onDelete={openDelete}
            onEdit={openEdit}
            onHistory={loadHistory}
            onRetry={loadEntries}
            onView={openDetail}
          />

          <DataBookPagination
            disabled={state.loading}
            itemCount={state.items.length}
            pageNumber={state.pageNumber}
            pageSize={state.pageSize}
            totalCount={state.totalCount}
            totalPages={state.totalPages}
            onPageChange={(page) => dispatch(setDataBookPage(page))}
            onPageSizeChange={(size) => dispatch(setDataBookPageSize(size))}
          />
        </>
      )}

      <EntryFormModal
        key={`${formModal.isOpen}-${formModal.mode}-${formModal.isLoading}-${formModal.entry?.id ?? "new"}-${formModal.entry?.rowVersion ?? "none"}`}
        categories={categories}
        conflict={formConflict}
        entry={formModal.entry}
        isLoading={formModal.isLoading}
        isOpen={formModal.isOpen}
        mode={formModal.mode}
        onClose={closeForm}
        onDiscardConflict={discardConflictChanges}
        onKeepConflict={keepConflictChanges}
        onSubmit={submitForm}
      />

      <EntryDetailModal
        key={`${detailModal.isOpen}-${detailModal.isLoading}-${detailModal.entry?.id ?? "none"}-${detailModal.entry?.rowVersion ?? "none"}`}
        capabilities={capabilities}
        entry={detailModal.entry}
        isLoading={detailModal.isLoading}
        isOpen={detailModal.isOpen}
        onClose={() => {
          openRequestRef.current += 1;
          setDetailModal((current) => ({ ...current, isOpen: false }));
        }}
        onCopy={copyKnownValue}
        onDelete={(entry) => {
          setDetailModal((current) => ({ ...current, isOpen: false }));
          openDelete(entry);
        }}
        onEdit={(entry) => {
          setDetailModal((current) => ({ ...current, isOpen: false }));
          void openEdit(entry);
        }}
        onHistory={(entry) => {
          setDetailModal((current) => ({ ...current, isOpen: false }));
          void loadHistory(entry);
        }}
      />

      <DeleteEntryModal
        conflict={deleteConflict}
        entry={deleteModal.entry}
        isLoading={deleteModal.isLoading}
        isOpen={deleteModal.isOpen}
        onCancel={() => {
          setDeleteConflict(null);
          setDeleteModal({ entry: null, isLoading: false, isOpen: false });
        }}
        onConfirm={confirmDelete}
      />

      <EntryHistoryModal
        key={`${historyModal.isOpen}-${historyModal.entry?.id ?? "none"}`}
        entry={historyModal.entry ? { ...historyModal.entry, history: historyModal.history } : null}
        error={historyModal.error}
        isLoading={historyModal.isLoading}
        isOpen={historyModal.isOpen}
        onClose={() => setHistoryModal((current) => ({ ...current, isOpen: false }))}
        onCopy={copyKnownValue}
        onRetry={() => loadHistory(historyModal.entry)}
      />
    </section>
  );
};

export default DataBookPage;
