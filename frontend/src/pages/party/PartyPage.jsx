import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Contact,
  Download,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import AppTooltip from "../../components/common/AppTooltip";
import {
  findPermissionPage,
  isSuperAdminAuth,
} from "../../hooks/usePermission";
import {
  PARTY_SETTINGS_COMMAND_FIELDS,
  PARTY_SETTINGS_SECTIONS,
} from "./partyColumns";
import PartyFilters from "./PartyFilters";
import {
  buildPartyQueryParams,
  extractEntity,
  extractPagedParties,
  filterPartiesForBusinessView,
  getErrorMessage,
  getPartyGroupCounts,
  getPartyDisplayName,
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

const PARTY_PERMISSIONS = {
  activate: "party.activate",
  create: "party.create",
  deactivate: "party.deactivate",
  delete: "party.delete",
  export: "party.export",
  settings: "party.settings",
  update: "party.update",
  view: "party.view",
};

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
            className="w-full max-w-md overflow-hidden rounded-3xl glass-strong shadow-[0_30px_100px_rgba(79,70,229,0.18)]"
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

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100/60 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                disabled={confirmation.isSubmitting}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 glass px-4 text-sm font-semibold text-slate-700 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
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
  const authPages = useSelector((state) => state.auth.pages ?? []);
  const roles = useSelector((state) => state.auth.roles);
  const user = useSelector((state) => state.auth.user);
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
  const [errorMessage, setErrorMessage] = useState(null);
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

  const isSuperAdmin = useMemo(
    () => isSuperAdminAuth({ roles, user }),
    [roles, user],
  );

  const partyPermission = useMemo(() => {
    return findPermissionPage(authPages, {
      id: "party",
      label: "Party Master",
      route: "/party",
    });
  }, [authPages]);

  const capabilities = useMemo(() => {
    const scopedPermissions = Array.isArray(partyPermission?.permissions)
      ? partyPermission.permissions.map(String)
      : [];
    const permissionSet = new Set(scopedPermissions);

    const hasBooleanPermission = (names) => {
      return names.some((name) => {
        return (
          partyPermission?.[name] === true ||
          partyPermission?.permissions?.[name] === true
        );
      });
    };

    const canPerform = (permission, booleanNames = []) => {
      if (isSuperAdmin) {
        return true;
      }

      if (hasBooleanPermission(booleanNames)) {
        return true;
      }

      return permissionSet.size === 0 || permissionSet.has(permission);
    };

    return {
      canActivate: canPerform(PARTY_PERMISSIONS.activate, ["canActivate"]),
      canCreate: canPerform(PARTY_PERMISSIONS.create, ["canCreate"]),
      canDeactivate: canPerform(PARTY_PERMISSIONS.deactivate, ["canDeactivate"]),
      canDelete: canPerform(PARTY_PERMISSIONS.delete, ["canDelete"]),
      canExport: canPerform(PARTY_PERMISSIONS.export, ["canExport"]),
      canSettings: canPerform(PARTY_PERMISSIONS.settings, ["canSettings"]),
      canUpdate: canPerform(PARTY_PERMISSIONS.update, [
        "canEdit",
        "canUpdate",
      ]),
      canView: canPerform(PARTY_PERMISSIONS.view, ["canView"]),
    };
  }, [isSuperAdmin, partyPermission]);

  const loadParties = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await partyService.getParties(
        buildPartyQueryParams({
          filters: {
            IsActive: filters.IsActive,
            Search: filters.Search,
          },
          page,
          pageSize,
          sort: DEFAULT_SORT,
        }),
      );
      const pagedResult = extractPagedParties(response.data);

      setParties(pagedResult.items);
      setPaginationMeta(buildPaginationMeta({ page, pageSize, pagedResult }));
    } catch (error) {
      setParties([]);
      setErrorMessage(
        getErrorMessage(error, "Unable to load parties. Please try again."),
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters.IsActive, filters.Search, page, pageSize]);

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

  const totalItems = paginationMeta.total;
  const totalPages = Math.max(1, paginationMeta.totalPages);
  const filterControls = useMemo(() => {
    return {
      ...filters,
      Search: searchInput,
    };
  }, [filters, searchInput]);
  const groupCounts = useMemo(() => getPartyGroupCounts(parties), [parties]);
  const displayParties = useMemo(() => {
    return filterPartiesForBusinessView({
      creditFilter: filters.creditLimit,
      group: activeGroup,
      gstFilter: filters.gst,
      parties,
    });
  }, [activeGroup, filters.creditLimit, filters.gst, parties]);
  const stats = useMemo(() => {
    return {
      creditLimitTotal: parties.reduce((total, party) => {
        return total + (Number(party.creditLimit) || 0);
      }, 0),
      customerCount: groupCounts.customers,
      inactive: parties.filter((party) => !party.isActive).length,
      supplierCount: groupCounts.suppliers,
      total: totalItems,
    };
  }, [groupCounts.customers, groupCounts.suppliers, parties, totalItems]);

  const closeFormModal = useCallback(() => {
    setFormModal((current) => ({
      ...current,
      isLoading: false,
      isOpen: false,
    }));
  }, []);

  const closeDetailsModal = useCallback(() => {
    setDetailsModal((current) => ({
      ...current,
      isLoading: false,
      isOpen: false,
    }));
  }, []);

  const closeSettingsModal = useCallback(() => {
    setSettingsModal((current) => ({
      ...current,
      isLoading: false,
      isOpen: false,
    }));
  }, []);

  const openCreateModal = useCallback(() => {
    setFormModal({
      isLoading: false,
      isOpen: true,
      mode: "create",
      party: null,
    });
  }, []);

  const openEditModal = useCallback(async (party) => {
    setFormModal({
      isLoading: true,
      isOpen: true,
      mode: "edit",
      party,
    });

    try {
      const response = await partyService.getPartyById(party.id);

      setFormModal({
        isLoading: false,
        isOpen: true,
        mode: "edit",
        party: extractEntity(response.data),
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load party details."));
      setFormModal((current) => ({
        ...current,
        isLoading: false,
      }));
    }
  }, []);

  const openDetailsModal = useCallback(async (party) => {
    setDetailsModal({
      isLoading: true,
      isOpen: true,
      party,
    });

    try {
      const response = await partyService.getPartyById(party.id);

      setDetailsModal({
        isLoading: false,
        isOpen: true,
        party: extractEntity(response.data),
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load party details."));
      setDetailsModal((current) => ({
        ...current,
        isLoading: false,
      }));
    }
  }, []);

  const openSettingsModal = useCallback(async () => {
    setSettingsModal({
      isLoading: true,
      isOpen: true,
      settings: null,
    });

    try {
      const response = await partyService.getPartySettings();

      setSettingsModal({
        isLoading: false,
        isOpen: true,
        settings: response.data,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load party settings."));
      setSettingsModal((current) => ({
        ...current,
        isLoading: false,
      }));
    }
  }, []);

  const submitParty = useCallback(async (payload) => {
    try {
      if (formModal.mode === "edit") {
        await partyService.updateParty(formModal.party.id, payload);
        toast.success("Party updated successfully");
      } else {
        await partyService.createParty(payload);
        toast.success("Party created successfully");
      }

      closeFormModal();
      await loadParties();
    } catch (error) {
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
  }, [closeFormModal, formModal.mode, formModal.party, loadParties]);

  const submitSettings = useCallback(async (payload) => {
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
  }, [closeSettingsModal]);

  const updatePartyStatus = useCallback(async (party, isActive) => {
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
      await loadParties();
    } catch (error) {
      setParties(previousParties);
      toast.error(getErrorMessage(error, "Unable to update party status."));
    }
  }, [loadParties, parties]);

  const openDeleteConfirmation = useCallback((party) => {
    setConfirmation({
      isOpen: true,
      isSubmitting: false,
      party,
    });
  }, []);

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

    setConfirmation((current) => ({
      ...current,
      isSubmitting: true,
    }));

    try {
      await partyService.deleteParty(confirmation.party.id);
      toast.success("Party deleted successfully");
      closeConfirmation();
      await loadParties();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete party."));
      setConfirmation((current) => ({
        ...current,
        isSubmitting: false,
      }));
    }
  }, [closeConfirmation, confirmation.party, loadParties]);

  const handleFilterChange = useCallback((patch) => {
    const shouldResetPage =
      Object.hasOwn(patch, "Search") || Object.hasOwn(patch, "IsActive");

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
      if (shouldResetPage) {
        setPage(1);
      }
    }
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput(DEFAULT_FILTERS.Search);
    setFilters(DEFAULT_FILTERS);
    setActiveGroup("all");
    setPage(1);
  }, []);

  const handlePageSizeChange = useCallback((event) => {
    setPageSize(Number(event.target.value));
    setPage(1);
  }, []);

  const handleExport = useCallback(() => {
    toast.info("Export is available as a UI action and will connect to reporting.");
  }, []);

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
    <section className="min-w-0 space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand ring-1 ring-inset ring-brand/10">
            <Contact className="h-3.5 w-3.5" />
            Party Master
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
            Party Master
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Manage parties, billing details, credit limits and settings.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
          <AppTooltip label="Refresh Parties">
            <button
              type="button"
              onClick={loadParties}
              disabled={isLoading}
              aria-label="Refresh Parties"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 glass px-3 text-sm font-semibold text-slate-700 transition-all hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98] sm:w-auto"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </AppTooltip>
          <AppTooltip label="Party Settings">
            <button
              type="button"
              onClick={openSettingsModal}
              disabled={!capabilities.canSettings}
              aria-label="Party Settings"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 glass px-3 text-sm font-semibold text-slate-700 transition-all hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98] sm:w-auto"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </AppTooltip>
          <AppTooltip label="Export Parties">
            <button
              type="button"
              onClick={handleExport}
              disabled={!capabilities.canExport}
              aria-label="Export Parties"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 glass px-3 text-sm font-semibold text-slate-700 transition-all hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98] sm:w-auto"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </AppTooltip>
          <AppTooltip label="Add Party">
            <button
              type="button"
              onClick={openCreateModal}
              disabled={!capabilities.canCreate}
              aria-label="Add Party"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98] sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Add Party
            </button>
          </AppTooltip>
        </div>
      </div>

      <PartyStats
        creditLimitTotal={stats.creditLimitTotal}
        customerCount={stats.customerCount}
        inactive={stats.inactive}
        supplierCount={stats.supplierCount}
        total={stats.total}
      />

      <PartyGroups
        activeGroup={activeGroup}
        counts={groupCounts}
        onChange={setActiveGroup}
      />

      <PartyFilters
        filters={filterControls}
        resultCount={displayParties.length}
        onChange={handleFilterChange}
        onClear={clearFilters}
      />

      <PartyTable
        actions={tableActions}
        currentPage={page}
        errorMessage={errorMessage}
        hasError={Boolean(errorMessage)}
        isLoading={isLoading}
        onCreate={openCreateModal}
        onRetry={loadParties}
        pageSize={pageSize}
        parties={displayParties}
      />

      <div className="glass-card flex flex-col gap-3 rounded-2xl px-4 py-3 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between">
        <p>
          <span className="font-semibold text-slate-900">
            {displayParties.length}
          </span>{" "}
          matching parties on this page
          <span className="text-slate-400"> / {totalItems} total</span>
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            Rows
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="h-9 rounded-xl border border-slate-200 bg-white/80 px-2 text-sm font-semibold text-slate-700 outline-none focus:border-brand/30 focus:ring-4 focus:ring-brand/10"
              aria-label="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={isLoading || page <= 1}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 glass px-3 text-sm font-semibold text-slate-700 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="min-w-20 text-center text-xs font-semibold text-slate-500">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={isLoading || page >= totalPages}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 glass px-3 text-sm font-semibold text-slate-700 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-100">
          <AlertTriangle className="h-4 w-4" />
          {errorMessage}
        </div>
      )}

      <PartyFormModal
        isLoading={formModal.isLoading}
        isOpen={formModal.isOpen}
        mode={formModal.mode}
        source={formModal.party}
        submitLabel={formModal.mode === "edit" ? "Save Changes" : "Create Party"}
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
