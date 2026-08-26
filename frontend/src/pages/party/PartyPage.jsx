import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Contact,
  Download,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import AppSelect from "../../components/common/AppSelect";
import AppTooltip from "../../components/common/AppTooltip";
import useCapabilities from "../../hooks/useCapabilities";
import useLatestRequest from "../../hooks/useLatestRequest";
import { getApiStatus } from "../../utils/apiError";
import { downloadCsv } from "../../utils/csv";
import {
  downloadResponseBlob,
  getDownloadErrorMessage,
} from "../../utils/fileDownload";
import {
  PARTY_SETTINGS_COMMAND_FIELDS,
  PARTY_SETTINGS_SECTIONS,
} from "./partyColumns";
import PartyFilters from "./PartyFilters";
import {
  buildPartyQueryParams,
  buildClientPartyView,
  extractEntity,
  extractPagedParties,
  filterPartiesForBusinessView,
  formatBalance,
  getErrorMessage,
  getPartyGroupCounts,
  getPartyGroupCountsFromSummary,
  getPartyDisplayName,
  getPartyCity,
  getPartyState,
  getPartyTypeLabel,
  isPartySummary,
  loadPartyFallbackCollection,
} from "./partyHelpers";
import PartyDetailsModal from "./PartyDetailsModal";
import PartyFormModal from "./PartyFormModal";
import PartyGroups from "./PartyGroups";
import PartyStats from "./PartyStats";
import PartyTable from "./PartyTable";
import { partyService } from "./partyService";

const DEFAULT_FILTERS = {
  Search: "",
  IsActive: "all",
  creditLimit: "all",
  gst: "all",
};

const DEFAULT_SORT = {
  SortBy: "",
  SortDirection: "",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const PARTY_FALLBACK_PAGE_SIZE = 200;
const PARTY_FALLBACK_MAX_RECORDS = 5000;
const PARTY_EXPORT_COLUMNS = [
  { header: "Party Name", getValue: getPartyDisplayName },
  { header: "Type", getValue: getPartyTypeLabel },
  { header: "GSTIN", getValue: (party) => party.gstin ?? "" },
  {
    header: "Mobile",
    getValue: (party) => party.mobileNo ?? party.mobile ?? "",
  },
  { header: "Email", getValue: (party) => party.email ?? "" },
  { header: "City", getValue: getPartyCity },
  { header: "State", getValue: getPartyState },
  {
    header: "Credit Limit",
    getValue: (party) => Number(party.creditLimit) || 0,
  },
  { header: "Opening Balance", getValue: formatBalance },
  {
    header: "Status",
    getValue: (party) => (party.isActive ? "Active" : "Inactive"),
  },
];

const buildPaginationMeta = ({ page, pageSize, pagedResult }) => {
  return {
    page: pagedResult.pageNumber || page,
    pageSize: pagedResult.pageSize || pageSize,
    total: pagedResult.totalCount || 0,
    totalPages: pagedResult.totalPages || 1,
  };
};

const ConfirmDialog = ({ confirmation, onCancel, onConfirm }) => {
  const displayName = getPartyDisplayName(confirmation.party);

  return (
    <AnimatePresence>
      {confirmation.isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onCancel}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="party-confirm-dialog-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <Trash2 className="h-5 w-5" />
              </div>

              <h2
                id="party-confirm-dialog-title"
                className="mt-4 text-lg font-bold tracking-tight text-slate-950"
              >
                Delete Party?
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {displayName} will be removed from Party Master.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                disabled={confirmation.isSubmitting}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={confirmation.isSubmitting}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {confirmation.isSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const PartyPage = () => {
  const [parties, setParties] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState(DEFAULT_FILTERS.Search);
  const [activeGroup, setActiveGroup] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [paginationMeta, setPaginationMeta] = useState({
    page: 1,
    pageSize: PAGE_SIZE_OPTIONS[0],
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [dataMode, setDataMode] = useState("unknown");
  const [partySummary, setPartySummary] = useState(null);
  const [fallbackBaseKey, setFallbackBaseKey] = useState("");
  const [compatibilityNotice, setCompatibilityNotice] = useState("");
  const [formModal, setFormModal] = useState({
    isLoading: false,
    isOpen: false,
    mode: "create",
    party: null,
  });
  const [detailsModal, setDetailsModal] = useState({
    isLoading: false,
    isOpen: false,
    party: null,
  });
  const [settingsModal, setSettingsModal] = useState({
    isLoading: false,
    isOpen: false,
    settings: null,
  });
  const [confirmation, setConfirmation] = useState({
    isOpen: false,
    isSubmitting: false,
    party: null,
  });
  const {
    beginAbortableRequest: beginListRequest,
    isLatestRequest: isLatestListRequest,
  } = useLatestRequest();
  const {
    beginAbortableRequest: beginEditRequest,
    cancelAllRequests: cancelEditRequests,
    isLatestRequest: isLatestEditRequest,
  } = useLatestRequest();
  const {
    beginAbortableRequest: beginDetailsRequest,
    cancelAllRequests: cancelDetailsRequests,
    isLatestRequest: isLatestDetailsRequest,
  } = useLatestRequest();
  const {
    beginAbortableRequest: beginSettingsRequest,
    cancelAllRequests: cancelSettingsRequests,
    isLatestRequest: isLatestSettingsRequest,
  } = useLatestRequest();
  const {
    beginAbortableRequest: beginExportRequest,
    isLatestRequest: isLatestExportRequest,
  } = useLatestRequest();

  const capabilities = useCapabilities({
    actions: [
      "view",
      "create",
      "update",
      "delete",
      "export",
      "activate",
      "deactivate",
      "settings",
    ],
    label: "Party Master",
    resource: "party",
    route: "/party",
  });

  const baseQueryKey = useMemo(
    () => JSON.stringify([filters.Search.trim(), filters.IsActive]),
    [filters.IsActive, filters.Search],
  );

  const loadParties = useCallback(
    async ({ force = false } = {}) => {
      if (!force && dataMode === "client" && fallbackBaseKey === baseQueryKey) {
        return;
      }

      const { requestId, signal } = beginListRequest();
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const baseFilters = {
          ...DEFAULT_FILTERS,
          IsActive: filters.IsActive,
          Search: filters.Search,
        };

        if (
          !force &&
          dataMode === "capped" &&
          fallbackBaseKey === baseQueryKey
        ) {
          const baseResponse = await partyService.getParties(
            buildPartyQueryParams({
              filters: baseFilters,
              group: "all",
              page,
              pageSize,
              sort: DEFAULT_SORT,
            }),
            { signal },
          );
          const basePage = extractPagedParties(baseResponse.data);

          if (!isLatestListRequest(requestId)) return;
          setParties(basePage.items);
          setPaginationMeta(
            buildPaginationMeta({ page, pageSize, pagedResult: basePage }),
          );
          return;
        }

        const response = await partyService.getParties(
          buildPartyQueryParams({
            filters,
            group: activeGroup,
            page,
            pageSize,
            sort: DEFAULT_SORT,
          }),
          { signal },
        );
        const pagedResult = extractPagedParties(response.data);

        if (isPartySummary(pagedResult.summary)) {
          if (!isLatestListRequest(requestId)) return;
          setDataMode("server");
          setFallbackBaseKey("");
          setCompatibilityNotice("");
          setPartySummary(pagedResult.summary);
          setParties(pagedResult.items);
          setPaginationMeta(
            buildPaginationMeta({ page, pageSize, pagedResult }),
          );
          return;
        }

        const fallback = await loadPartyFallbackCollection({
          fetchPage: async (pageNumber, fallbackPageSize) => {
            const fallbackResponse = await partyService.getParties(
              buildPartyQueryParams({
                filters: baseFilters,
                group: "all",
                page: pageNumber,
                pageSize: fallbackPageSize,
                sort: DEFAULT_SORT,
              }),
              { signal },
            );

            return fallbackResponse.data;
          },
          maxRecords: PARTY_FALLBACK_MAX_RECORDS,
          pageSize: PARTY_FALLBACK_PAGE_SIZE,
          signal,
        });

        if (!isLatestListRequest(requestId)) return;
        setPartySummary(null);
        setFallbackBaseKey(baseQueryKey);

        if (fallback.capped) {
          const baseResponse = await partyService.getParties(
            buildPartyQueryParams({
              filters: baseFilters,
              group: "all",
              page,
              pageSize,
              sort: DEFAULT_SORT,
            }),
            { signal },
          );
          const basePage = extractPagedParties(baseResponse.data);

          if (!isLatestListRequest(requestId)) return;
          setDataMode("capped");
          setParties(basePage.items);
          setPaginationMeta(
            buildPaginationMeta({ page, pageSize, pagedResult: basePage }),
          );
          setCompatibilityNotice(
            `Advanced Party Type, GSTIN, and credit-limit filters require server summary support for datasets above ${PARTY_FALLBACK_MAX_RECORDS.toLocaleString()} records. Search and status results remain available.`,
          );
          return;
        }

        setDataMode("client");
        setParties(fallback.items);
        setCompatibilityNotice(
          "Client-filtered across the complete matching collection while server summary support is unavailable.",
        );
      } catch (error) {
        if (signal.aborted || !isLatestListRequest(requestId)) return;
        setParties([]);
        setPartySummary(null);
        setErrorMessage(
          getErrorMessage(error, "Unable to load parties. Please try again."),
        );
      } finally {
        if (isLatestListRequest(requestId)) setIsLoading(false);
      }
    },
    [
      activeGroup,
      baseQueryKey,
      beginListRequest,
      dataMode,
      fallbackBaseKey,
      filters,
      isLatestListRequest,
      page,
      pageSize,
    ],
  );

  useEffect(() => {
    void Promise.resolve().then(loadParties);
  }, [loadParties]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFilters((current) => {
        if (current.Search === searchInput) {
          return current;
        }

        return {
          ...current,
          Search: searchInput,
        };
      });
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const clientView = useMemo(
    () =>
      buildClientPartyView({
        creditFilter: filters.creditLimit,
        group: activeGroup,
        gstFilter: filters.gst,
        page,
        pageSize,
        parties,
      }),
    [activeGroup, filters.creditLimit, filters.gst, page, pageSize, parties],
  );
  const displayParties = dataMode === "client" ? clientView.items : parties;
  const effectivePage = dataMode === "client" ? clientView.page : page;
  const totalItems =
    dataMode === "client" ? clientView.totalCount : paginationMeta.total;
  const totalPages =
    dataMode === "client"
      ? clientView.totalPages
      : Math.max(1, paginationMeta.totalPages);
  const filterControls = useMemo(() => {
    return {
      ...filters,
      Search: searchInput,
    };
  }, [filters, searchInput]);
  const groupCounts = useMemo(() => {
    if (dataMode === "server") {
      return getPartyGroupCountsFromSummary(partySummary);
    }

    if (dataMode === "client") {
      return clientView.groupCounts;
    }

    if (dataMode === "capped") {
      return {
        all: paginationMeta.total,
        both: "—",
        customers: "—",
        suppliers: "—",
      };
    }

    return getPartyGroupCounts(parties);
  }, [
    clientView.groupCounts,
    dataMode,
    paginationMeta.total,
    parties,
    partySummary,
  ]);
  const stats = useMemo(() => {
    if (dataMode === "server") {
      return {
        creditLimitTotal: Number(partySummary.totalCreditLimit) || 0,
        customerCount: Number(partySummary.customerCount) || 0,
        inactive: Number(partySummary.inactiveCount) || 0,
        supplierCount: Number(partySummary.supplierCount) || 0,
        total: Number(partySummary.allCount) || 0,
        metricScope: "all-matching",
        totalScope: "all-matching",
      };
    }

    if (dataMode === "client") {
      return {
        creditLimitTotal: clientView.stats.totalCreditLimit,
        customerCount: clientView.stats.customerCount,
        inactive: clientView.stats.inactiveCount,
        supplierCount: clientView.stats.supplierCount,
        total: clientView.stats.allCount,
        metricScope: "all-matching",
        totalScope: "all-matching",
      };
    }

    return {
      creditLimitTotal: parties.reduce((total, party) => {
        return total + (Number(party.creditLimit) || 0);
      }, 0),
      customerCount: groupCounts.customers,
      inactive: parties.filter((party) => !party.isActive).length,
      supplierCount: groupCounts.suppliers,
      total: totalItems,
      metricScope: "current-page",
      totalScope: "all-matching",
    };
  }, [
    clientView.stats,
    dataMode,
    groupCounts.customers,
    groupCounts.suppliers,
    parties,
    partySummary,
    totalItems,
  ]);

  const closeFormModal = useCallback(() => {
    cancelEditRequests();
    setFormModal((current) => ({
      ...current,
      isLoading: false,
      isOpen: false,
    }));
  }, [cancelEditRequests]);

  const closeDetailsModal = useCallback(() => {
    cancelDetailsRequests();
    setDetailsModal((current) => ({
      ...current,
      isLoading: false,
      isOpen: false,
    }));
  }, [cancelDetailsRequests]);

  const closeSettingsModal = useCallback(() => {
    cancelSettingsRequests();
    setSettingsModal((current) => ({
      ...current,
      isLoading: false,
      isOpen: false,
    }));
  }, [cancelSettingsRequests]);

  const openCreateModal = useCallback(() => {
    if (!capabilities.canCreate) {
      toast.error("You don't have permission to create parties.");
      return;
    }

    setFormModal({
      isLoading: false,
      isOpen: true,
      mode: "create",
      party: null,
    });
  }, [capabilities.canCreate]);

  const openEditModal = useCallback(
    async (party) => {
      if (!capabilities.canUpdate) {
        toast.error("You don't have permission to update parties.");
        return;
      }

      setFormModal({
        isLoading: true,
        isOpen: true,
        mode: "edit",
        party,
      });
      const { requestId, signal } = beginEditRequest();

      try {
        const response = await partyService.getPartyById(party.id, { signal });

        if (!isLatestEditRequest(requestId)) return;
        setFormModal({
          isLoading: false,
          isOpen: true,
          mode: "edit",
          party: extractEntity(response.data),
        });
      } catch (error) {
        if (signal.aborted || !isLatestEditRequest(requestId)) return;
        if (getApiStatus(error) === 404) {
          toast.error("This party no longer exists. The list was refreshed.");
          closeFormModal();
          await loadParties({ force: true });
          return;
        }
        toast.error(getErrorMessage(error, "Unable to load party details."));
        setFormModal((current) => ({
          ...current,
          isLoading: false,
        }));
      }
    },
    [
      beginEditRequest,
      capabilities.canUpdate,
      closeFormModal,
      isLatestEditRequest,
      loadParties,
    ],
  );

  const openDetailsModal = useCallback(
    async (party) => {
      if (!capabilities.canView) {
        toast.error("You don't have permission to view parties.");
        return;
      }

      setDetailsModal({
        isLoading: true,
        isOpen: true,
        party,
      });
      const { requestId, signal } = beginDetailsRequest();

      try {
        const response = await partyService.getPartyById(party.id, { signal });

        if (!isLatestDetailsRequest(requestId)) return;
        setDetailsModal({
          isLoading: false,
          isOpen: true,
          party: extractEntity(response.data),
        });
      } catch (error) {
        if (signal.aborted || !isLatestDetailsRequest(requestId)) return;
        if (getApiStatus(error) === 404) {
          toast.error("This party no longer exists. The list was refreshed.");
          closeDetailsModal();
          await loadParties({ force: true });
          return;
        }
        toast.error(getErrorMessage(error, "Unable to load party details."));
        setDetailsModal((current) => ({
          ...current,
          isLoading: false,
        }));
      }
    },
    [
      beginDetailsRequest,
      capabilities.canView,
      closeDetailsModal,
      isLatestDetailsRequest,
      loadParties,
    ],
  );

  const openSettingsModal = useCallback(async () => {
    if (!capabilities.canSettings) {
      toast.error("You don't have permission to manage party settings.");
      return;
    }

    setSettingsModal({
      isLoading: true,
      isOpen: true,
      settings: null,
    });
    const { requestId, signal } = beginSettingsRequest();

    try {
      const response = await partyService.getPartySettings({ signal });

      if (!isLatestSettingsRequest(requestId)) return;
      setSettingsModal({
        isLoading: false,
        isOpen: true,
        settings: response.data,
      });
    } catch (error) {
      if (signal.aborted || !isLatestSettingsRequest(requestId)) return;
      toast.error(getErrorMessage(error, "Unable to load party settings."));
      setSettingsModal((current) => ({
        ...current,
        isLoading: false,
      }));
    }
  }, [beginSettingsRequest, capabilities.canSettings, isLatestSettingsRequest]);

  const submitParty = useCallback(
    async (payload) => {
      const allowed =
        formModal.mode === "edit"
          ? capabilities.canUpdate
          : capabilities.canCreate;

      if (!allowed) {
        toast.error("You don't have permission to save this party.");
        return;
      }

      try {
        if (formModal.mode === "edit") {
          await partyService.updateParty(formModal.party.id, payload);
          toast.success("Party updated successfully");
        } else {
          await partyService.createParty(payload);
          toast.success("Party created successfully");
        }

        closeFormModal();
        await loadParties({ force: true });
      } catch (error) {
        if (formModal.mode === "edit" && getApiStatus(error) === 404) {
          toast.error("This party no longer exists. The list was refreshed.");
          closeFormModal();
          await loadParties({ force: true });
          return;
        }
        toast.error(
          getErrorMessage(
            error,
            formModal.mode === "edit"
              ? "Unable to update party."
              : "Unable to create party.",
          ),
        );
        throw error;
      }
    },
    [
      capabilities.canCreate,
      capabilities.canUpdate,
      closeFormModal,
      formModal.mode,
      formModal.party,
      loadParties,
    ],
  );

  const submitSettings = useCallback(
    async (payload) => {
      if (!capabilities.canSettings) {
        toast.error("You don't have permission to manage party settings.");
        return;
      }

      try {
        const response = await partyService.updatePartySettings(payload);

        setSettingsModal((current) => ({
          ...current,
          settings: response.data,
        }));
        toast.success("Party settings updated successfully");
        closeSettingsModal();
      } catch (error) {
        toast.error(getErrorMessage(error, "Unable to update party settings."));
        throw error;
      }
    },
    [capabilities.canSettings, closeSettingsModal],
  );

  const updatePartyStatus = useCallback(
    async (party, isActive) => {
      const allowed = isActive
        ? capabilities.canActivate
        : capabilities.canDeactivate;

      if (!allowed) {
        toast.error("You don't have permission to change party status.");
        return;
      }

      const previousParties = parties;

      setParties((current) =>
        current.map((item) =>
          item.id === party.id
            ? {
                ...item,
                isActive,
              }
            : item,
        ),
      );

      try {
        await partyService.changePartyStatus(party.id, { isActive });
        toast.success(
          isActive
            ? "Party activated successfully"
            : "Party deactivated successfully",
        );
        await loadParties({ force: true });
      } catch (error) {
        setParties(previousParties);
        toast.error(getErrorMessage(error, "Unable to update party status."));
      }
    },
    [
      capabilities.canActivate,
      capabilities.canDeactivate,
      loadParties,
      parties,
    ],
  );

  const openDeleteConfirmation = useCallback(
    (party) => {
      if (!capabilities.canDelete) {
        toast.error("You don't have permission to delete parties.");
        return;
      }

      setConfirmation({
        isOpen: true,
        isSubmitting: false,
        party,
      });
    },
    [capabilities.canDelete],
  );

  const closeConfirmation = useCallback(() => {
    setConfirmation({
      isOpen: false,
      isSubmitting: false,
      party: null,
    });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!confirmation.party) {
      return;
    }

    if (!capabilities.canDelete) {
      toast.error("You don't have permission to delete parties.");
      closeConfirmation();
      return;
    }

    setConfirmation((current) => ({
      ...current,
      isSubmitting: true,
    }));

    try {
      await partyService.deleteParty(confirmation.party.id);
      toast.success("Party deleted successfully");
      closeConfirmation();
      await loadParties({ force: true });
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete party."));
      setConfirmation((current) => ({
        ...current,
        isSubmitting: false,
      }));
    }
  }, [
    capabilities.canDelete,
    closeConfirmation,
    confirmation.party,
    loadParties,
  ]);

  const handleFilterChange = useCallback((patch) => {
    setPage(1);

    if (Object.hasOwn(patch, "Search")) {
      setSearchInput(patch.Search);
    }

    const filterPatch = { ...patch };
    delete filterPatch.Search;

    if (Object.keys(filterPatch).length) {
      setFilters((current) => ({
        ...current,
        ...filterPatch,
      }));
    }
  }, []);

  const handleGroupChange = useCallback((group) => {
    setActiveGroup(group);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput(DEFAULT_FILTERS.Search);
    setFilters(DEFAULT_FILTERS);
    setActiveGroup("all");
    setPage(1);
  }, []);

  const handlePageSizeChange = useCallback((value) => {
    setPageSize(Number(value));
    setPage(1);
  }, []);

  const handleExport = useCallback(async () => {
    if (!capabilities.canExport) {
      toast.error("You don't have permission to export parties.");
      return;
    }

    const { requestId, signal } = beginExportRequest();
    const exportParams = buildPartyQueryParams({
      filters,
      group: activeGroup,
      page: undefined,
      pageSize: undefined,
      sort: DEFAULT_SORT,
    });
    setIsExporting(true);

    try {
      const response = await partyService.exportParties(exportParams, {
        signal,
      });

      if (!isLatestExportRequest(requestId)) return;
      await downloadResponseBlob(response, "parties.csv");
      toast.success("Parties export downloaded");
    } catch (error) {
      if (signal.aborted || !isLatestExportRequest(requestId)) return;

      if (![404, 405, 501].includes(getApiStatus(error))) {
        toast.error(
          await getDownloadErrorMessage(error, "Unable to export parties."),
        );
        return;
      }

      try {
        let exportRows;

        if (dataMode === "client") {
          exportRows = filterPartiesForBusinessView({
            creditFilter: filters.creditLimit,
            group: activeGroup,
            gstFilter: filters.gst,
            parties,
          });
        } else {
          const fallback = await loadPartyFallbackCollection({
            fetchPage: async (pageNumber, fallbackPageSize) => {
              const pageResponse = await partyService.getParties(
                buildPartyQueryParams({
                  filters,
                  group: activeGroup,
                  page: pageNumber,
                  pageSize: fallbackPageSize,
                  sort: DEFAULT_SORT,
                }),
                { signal },
              );

              return pageResponse.data;
            },
            maxRecords: PARTY_FALLBACK_MAX_RECORDS,
            pageSize: PARTY_FALLBACK_PAGE_SIZE,
            signal,
          });

          if (fallback.capped) {
            throw new Error(
              `Backend Party export is required above ${PARTY_FALLBACK_MAX_RECORDS.toLocaleString()} matching records.`,
              { cause: error },
            );
          }
          exportRows = fallback.items;
        }

        if (!isLatestExportRequest(requestId)) return;
        await downloadCsv({
          columns: PARTY_EXPORT_COLUMNS,
          filename: "parties.csv",
          rows: exportRows,
        });
        toast.success(`Exported ${exportRows.length} parties`);
      } catch (fallbackError) {
        if (!signal.aborted && isLatestExportRequest(requestId)) {
          toast.error(
            getErrorMessage(fallbackError, "Unable to export parties."),
          );
        }
      }
    } finally {
      if (isLatestExportRequest(requestId)) setIsExporting(false);
    }
  }, [
    activeGroup,
    beginExportRequest,
    capabilities.canExport,
    dataMode,
    filters,
    isLatestExportRequest,
    parties,
  ]);

  const tableActions = useMemo(
    () => ({
      canActivate: capabilities.canActivate,
      canDeactivate: capabilities.canDeactivate,
      canDelete: capabilities.canDelete,
      canEdit: capabilities.canUpdate,
      canView: capabilities.canView,
      onActivate: (party) => updatePartyStatus(party, true),
      onDeactivate: (party) => updatePartyStatus(party, false),
      onDelete: openDeleteConfirmation,
      onEdit: openEditModal,
      onView: openDetailsModal,
    }),
    [
      capabilities.canActivate,
      capabilities.canDeactivate,
      capabilities.canDelete,
      capabilities.canUpdate,
      capabilities.canView,
      openDeleteConfirmation,
      openDetailsModal,
      openEditModal,
      updatePartyStatus,
    ],
  );

  return (
    <section className="min-w-0 space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/20">
            <Contact className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand">
              Accounts directory
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Party Master
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Manage customer and supplier identities, GST details, addresses
              and credit terms.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <AppTooltip label="Refresh Parties">
              <button
                type="button"
                onClick={() => loadParties({ force: true })}
                disabled={isLoading}
                aria-label="Refresh Parties"
                className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </AppTooltip>
            {capabilities.canSettings && (
              <AppTooltip label="Party Settings">
                <button
                  type="button"
                  onClick={openSettingsModal}
                  aria-label="Party Settings"
                  className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 sm:flex-none"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
              </AppTooltip>
            )}
            {capabilities.canExport && (
              <AppTooltip label="Export Parties">
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={isExporting}
                  aria-busy={isExporting || undefined}
                  aria-label="Export Parties"
                  className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                >
                  <Download className="h-4 w-4" />
                  {isExporting ? "Exporting…" : "Export"}
                </button>
              </AppTooltip>
            )}
          </div>
          {capabilities.canCreate && (
            <AppTooltip label="Add Party">
              <button
                type="button"
                onClick={openCreateModal}
                aria-label="Add Party"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:bg-brand-dark active:translate-y-0 active:scale-[0.98] sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Add Party
              </button>
            </AppTooltip>
          )}
        </div>
      </div>

      <PartyStats
        creditLimitTotal={stats.creditLimitTotal}
        customerCount={stats.customerCount}
        inactive={stats.inactive}
        metricScope={stats.metricScope}
        supplierCount={stats.supplierCount}
        total={stats.total}
        totalScope={stats.totalScope}
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <PartyGroups
          embedded
          activeGroup={activeGroup}
          counts={groupCounts}
          onChange={handleGroupChange}
        />

        <PartyFilters
          embedded
          filters={filterControls}
          resultCount={totalItems}
          onChange={handleFilterChange}
          onClear={clearFilters}
        />

        {compatibilityNotice && (
          <div className="border-b border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800 sm:px-5">
            {compatibilityNotice}
          </div>
        )}

        <PartyTable
          embedded
          actions={tableActions}
          currentPage={effectivePage}
          errorMessage={errorMessage}
          hasError={Boolean(errorMessage)}
          isLoading={isLoading}
          onCreate={capabilities.canCreate ? openCreateModal : undefined}
          onRetry={() => loadParties({ force: true })}
          pageSize={pageSize}
          parties={displayParties}
        />

        {!errorMessage && (isLoading || totalItems > 0) && (
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-500 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
            <p>
              Showing{" "}
              <span className="font-bold tabular-nums text-slate-900">
                {displayParties.length ? (effectivePage - 1) * pageSize + 1 : 0}
              </span>
              {"–"}
              <span className="font-bold tabular-nums text-slate-900">
                {displayParties.length
                  ? (effectivePage - 1) * pageSize + displayParties.length
                  : 0}
              </span>{" "}
              of{" "}
              <span className="font-bold tabular-nums text-slate-900">
                {totalItems}
              </span>
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center justify-between gap-2 text-sm font-medium text-slate-600 sm:justify-start">
                <span>Rows per page</span>
                <AppSelect
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  options={PAGE_SIZE_OPTIONS}
                  className="w-20"
                  aria-label="Rows per page"
                />
              </div>

              <div className="flex items-center justify-between gap-2 sm:justify-start">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={isLoading || effectivePage <= 1}
                  aria-label="Previous page"
                  className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="min-w-20 text-center text-xs font-bold tabular-nums text-slate-600">
                  {effectivePage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={isLoading || effectivePage >= totalPages}
                  aria-label="Next page"
                  className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <PartyFormModal
        isLoading={formModal.isLoading}
        isOpen={formModal.isOpen}
        mode={formModal.mode}
        source={formModal.party}
        submitLabel={
          formModal.mode === "edit" ? "Save Changes" : "Create Party"
        }
        onClose={closeFormModal}
        onSubmit={submitParty}
      />

      <PartyDetailsModal
        isLoading={detailsModal.isLoading}
        isOpen={detailsModal.isOpen}
        party={detailsModal.party}
        onClose={closeDetailsModal}
      />

      <PartyFormModal
        description="Update Party settings."
        fields={PARTY_SETTINGS_COMMAND_FIELDS}
        icon="settings"
        isLoading={settingsModal.isLoading}
        isOpen={settingsModal.isOpen}
        mode="settings"
        sections={PARTY_SETTINGS_SECTIONS}
        source={settingsModal.settings}
        submitLabel="Save Settings"
        title="Party Settings"
        onClose={closeSettingsModal}
        onSubmit={submitSettings}
      />

      <ConfirmDialog
        confirmation={confirmation}
        onCancel={closeConfirmation}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default PartyPage;
