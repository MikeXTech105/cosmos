import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Download,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import AppSelect from "../../../components/common/AppSelect";
import AppTooltip from "../../../components/common/AppTooltip";
import useCapabilities from "../../../hooks/useCapabilities";
import useLatestRequest from "../../../hooks/useLatestRequest";
import { roleService } from "../../../services/rbac/roleService";
import { getApiErrorMessage, getApiStatus } from "../../../utils/apiError";
import { downloadCsv } from "../../../utils/csv";
import {
  downloadResponseBlob,
  getDownloadErrorMessage,
} from "../../../utils/fileDownload";
import RoleFilters from "./RoleFilters";
import RoleModal from "./RoleModal";
import RoleStats from "./RoleStats";
import RoleTable from "./RoleTable";

const DEFAULT_FILTERS = {
  search: "",
  status: "all",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const ROLE_EXPORT_COLUMNS = [
  { header: "Role Name", getValue: (role) => role.name },
  { header: "Description", getValue: (role) => role.description },
  { header: "Status", getValue: (role) => (role.isActive ? "Active" : "Inactive") },
  { header: "Created Date", getValue: (role) => role.createdAt ?? "" },
  { header: "Updated Date", getValue: (role) => role.updatedAt ?? "" },
];

const LIST_KEYS = ["items", "roles", "records", "results", "content"];

const getErrorMessage = (error, fallback) => {
  return getApiErrorMessage(error, fallback);
};

const extractCollection = (payload, responseMeta) => {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      meta: responseMeta ?? {},
    };
  }

  const listKey = LIST_KEYS.find((key) => Array.isArray(payload?.[key]));
  const items = listKey ? payload[listKey] : [];

  return {
    items,
    meta: {
      ...(responseMeta ?? {}),
      ...(payload?.meta ?? {}),
      ...(payload?.pagination ?? {}),
      total:
        payload?.total ??
        payload?.totalCount ??
        payload?.totalElements ??
        responseMeta?.total ??
        responseMeta?.totalCount ??
        responseMeta?.totalElements,
    },
  };
};

const extractSingleRole = (payload) => {
  return payload?.role ?? payload?.item ?? payload?.record ?? payload;
};

const normalizeActiveState = (role) => {
  const rawValue =
    role?.isActive ?? role?.active ?? role?.enabled ?? role?.status;

  if (rawValue === undefined || rawValue === null) {
    return true;
  }

  if (typeof rawValue === "boolean") {
    return rawValue;
  }

  if (typeof rawValue === "number") {
    return rawValue === 1;
  }

  if (typeof rawValue === "string") {
    return ["active", "enabled", "true", "1"].includes(
      rawValue.trim().toLowerCase(),
    );
  }

  return Boolean(rawValue);
};

const normalizeRole = (role) => {
  if (!role) {
    return null;
  }

  if (typeof role === "string") {
    return {
      createdAt: null,
      description: "",
      id: role,
      isActive: true,
      name: role,
    };
  }

  const name = role.name ?? role.roleName ?? role.label;
  const id = role.id ?? role.roleId ?? role.roleID ?? role._id ?? name;

  if (!id || !name) {
    return null;
  }

  return {
    createdAt: role.createdAt ?? role.createdDate ?? role.createdOn,
    updatedAt: role.updatedAt ?? role.updatedDate ?? role.updatedOn,
    description: role.description ?? role.summary ?? "",
    id,
    isActive: normalizeActiveState(role),
    name,
  };
};

const filterRoles = (roles, filters) => {
  const query = filters.search.trim().toLowerCase();

  return roles.filter((role) => {
    const haystack = [role.name, role.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const statusMatches =
      filters.status === "all" ||
      (filters.status === "active" ? role.isActive : !role.isActive);

    return (!query || haystack.includes(query)) && statusMatches;
  });
};

const paginate = (items, currentPage, pageSize) => {
  const start = (currentPage - 1) * pageSize;

  return items.slice(start, start + pageSize);
};

const ConfirmDialog = ({ confirmation, onCancel, onConfirm }) => {
  const role = confirmation.role;
  const displayName = role?.name || "this role";

  const copy = {
    activate: {
      actionLabel: "Activate",
      buttonClassName: "bg-emerald-600 hover:bg-emerald-700",
      description: `${displayName} will become available for user assignment.`,
      icon: ShieldCheck,
      iconClassName: "bg-emerald-50 text-emerald-600",
      title: "Activate Role?",
    },
    deactivate: {
      actionLabel: "Deactivate",
      buttonClassName: "bg-amber-600 hover:bg-amber-700",
      description: `${displayName} will no longer be available for new user assignments.`,
      icon: ShieldOff,
      iconClassName: "bg-amber-50 text-amber-600",
      title: "Deactivate Role?",
    },
    delete: {
      actionLabel: "Delete",
      buttonClassName: "bg-red-600 hover:bg-red-700",
      description:
        "This removes the role from the platform. This action cannot be undone.",
      icon: Trash2,
      iconClassName: "bg-red-50 text-red-600",
      title: "Delete Role?",
    },
  }[confirmation.type];

  const Icon = copy?.icon ?? AlertTriangle;

  return (
    <AnimatePresence>
      {confirmation.isOpen && copy && (
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
            aria-labelledby="role-confirm-dialog-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-6">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${copy.iconClassName}`}
              >
                <Icon className="h-5 w-5" />
              </div>

              <h2
                id="role-confirm-dialog-title"
                className="mt-4 text-lg font-bold tracking-tight text-slate-950"
              >
                {copy.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {copy.description}
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
                className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${copy.buttonClassName}`}
              >
                {confirmation.isSubmitting
                  ? "Processing..."
                  : copy.actionLabel}
              </button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState(DEFAULT_FILTERS.search);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [modalState, setModalState] = useState({
    isLoading: false,
    isOpen: false,
    mode: "create",
    role: null,
  });
  const [confirmation, setConfirmation] = useState({
    isOpen: false,
    isSubmitting: false,
    role: null,
    type: null,
  });
  const {
    beginAbortableRequest: beginExportRequest,
    isLatestRequest: isLatestExportRequest,
  } = useLatestRequest();
  const {
    beginAbortableRequest: beginDetailRequest,
    cancelAllRequests: cancelDetailRequests,
    isLatestRequest: isLatestDetailRequest,
  } = useLatestRequest();

  const capabilities = useCapabilities({
    actions: [
      "view",
      "create",
      "update",
      "delete",
      "activate",
      "deactivate",
      "export",
    ],
    label: "Roles",
    resource: "roles",
    route: "/roles",
  });

  const loadRoles = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await roleService.getRoles();
      const collection = extractCollection(response.data, response.meta);
      const normalizedRoles = collection.items.map(normalizeRole).filter(Boolean);

      setRoles(normalizedRoles);
    } catch (error) {
      setRoles([]);
      setErrorMessage(
        getErrorMessage(error, "Unable to load roles. Please try again."),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadRoles);
  }, [loadRoles]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFilters((current) => {
        if (current.search === searchInput) {
          return current;
        }

        return {
          ...current,
          search: searchInput,
        };
      });
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const filteredRoles = useMemo(() => filterRoles(roles, filters), [
    filters,
    roles,
  ]);
  const totalItems = filteredRoles.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRoles = useMemo(
    () => paginate(filteredRoles, currentPage, pageSize),
    [currentPage, filteredRoles, pageSize],
  );
  const rangeStart = paginatedRoles.length
    ? (currentPage - 1) * pageSize + 1
    : 0;
  const rangeEnd = paginatedRoles.length
    ? rangeStart + paginatedRoles.length - 1
    : 0;
  const filterControls = useMemo(() => {
    return {
      ...filters,
      search: searchInput,
    };
  }, [filters, searchInput]);
  const stats = useMemo(() => {
    return {
      active: roles.filter((role) => role.isActive).length,
      inactive: roles.filter((role) => !role.isActive).length,
      total: roles.length,
    };
  }, [roles]);

  const closeModal = useCallback(() => {
    cancelDetailRequests();
    setModalState((current) => ({
      ...current,
      isLoading: false,
      isOpen: false,
    }));
  }, [cancelDetailRequests]);

  const openCreateModal = useCallback(() => {
    if (!capabilities.canCreate) {
      toast.error("You don't have permission to create roles.");
      return;
    }

    cancelDetailRequests();
    setModalState({
      isLoading: false,
      isOpen: true,
      mode: "create",
      role: null,
    });
  }, [cancelDetailRequests, capabilities.canCreate]);

  const openRoleModal = useCallback(async (mode, role) => {
    const allowed = mode === "edit" ? capabilities.canUpdate : capabilities.canView;

    if (!allowed) {
      toast.error("You don't have permission to open this role.");
      return;
    }

    setModalState({
      isLoading: true,
      isOpen: true,
      mode,
      role,
    });
    const { requestId, signal } = beginDetailRequest();

    try {
      const response = await roleService.getRoleById(role.id, { signal });
      if (!isLatestDetailRequest(requestId)) return;
      setModalState({
        isLoading: false,
        isOpen: true,
        mode,
        role: normalizeRole(extractSingleRole(response.data)),
      });
    } catch (error) {
      if (!isLatestDetailRequest(requestId)) return;
      if (getApiStatus(error) === 404) {
        toast.error("This role no longer exists. The list was refreshed.");
        closeModal();
        await loadRoles();
        return;
      }
      toast.error(
        getErrorMessage(error, "Unable to load the latest role details."),
      );
      setModalState((current) => ({
        ...current,
        isLoading: false,
      }));
    }
  }, [
    beginDetailRequest,
    capabilities.canUpdate,
    capabilities.canView,
    closeModal,
    isLatestDetailRequest,
    loadRoles,
  ]);

  const submitRole = useCallback(async (payload) => {
    const allowed =
      modalState.mode === "edit"
        ? capabilities.canUpdate
        : capabilities.canCreate;

    if (!allowed) {
      toast.error("You don't have permission to save this role.");
      return;
    }

    try {
      if (modalState.mode === "edit") {
        await roleService.updateRole(modalState.role.id, payload);
        toast.success("Role updated successfully");
      } else {
        await roleService.createRole(payload);
        toast.success("Role created successfully");
      }

      closeModal();
      await loadRoles();
    } catch (error) {
      if (modalState.mode === "edit" && getApiStatus(error) === 404) {
        toast.error("This role no longer exists. The list was refreshed.");
        closeModal();
        await loadRoles();
        return;
      }
      toast.error(
        getErrorMessage(
          error,
          modalState.mode === "edit"
            ? "Unable to update role."
            : "Unable to create role.",
          ),
      );
      throw error;
    }
  }, [
    capabilities.canCreate,
    capabilities.canUpdate,
    closeModal,
    loadRoles,
    modalState.mode,
    modalState.role,
  ]);

  const openConfirmation = useCallback((type, role) => {
    const allowed = {
      activate: capabilities.canActivate,
      deactivate: capabilities.canDeactivate,
      delete: capabilities.canDelete,
    }[type];

    if (!allowed) {
      toast.error("You don't have permission to perform this role action.");
      return;
    }

    setConfirmation({
      isOpen: true,
      isSubmitting: false,
      role,
      type,
    });
  }, [
    capabilities.canActivate,
    capabilities.canDeactivate,
    capabilities.canDelete,
  ]);

  const closeConfirmation = useCallback(() => {
    setConfirmation({
      isOpen: false,
      isSubmitting: false,
      role: null,
      type: null,
    });
  }, []);

  const confirmAction = useCallback(async () => {
    if (!confirmation.role) {
      return;
    }

    const allowed = {
      activate: capabilities.canActivate,
      deactivate: capabilities.canDeactivate,
      delete: capabilities.canDelete,
    }[confirmation.type];

    if (!allowed) {
      toast.error("You don't have permission to perform this role action.");
      closeConfirmation();
      return;
    }

    setConfirmation((current) => ({
      ...current,
      isSubmitting: true,
    }));

    try {
      if (confirmation.type === "delete") {
        await roleService.deleteRole(confirmation.role.id);
        toast.success("Role deleted successfully");
      }

      if (
        confirmation.type === "activate" ||
        confirmation.type === "deactivate"
      ) {
        const shouldActivate = confirmation.type === "activate";

        await roleService.updateRole(confirmation.role.id, {
          description: confirmation.role.description,
          isActive: shouldActivate,
          name: confirmation.role.name,
        });
        toast.success(
          shouldActivate
            ? "Role activated successfully"
            : "Role deactivated successfully",
        );
      }

      closeConfirmation();
      await loadRoles();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to complete this action."));
      setConfirmation((current) => ({
        ...current,
        isSubmitting: false,
      }));
    }
  }, [
    capabilities.canActivate,
    capabilities.canDeactivate,
    capabilities.canDelete,
    closeConfirmation,
    confirmation.role,
    confirmation.type,
    loadRoles,
  ]);

  const handleFilterChange = useCallback((patch) => {
    if (Object.hasOwn(patch, "search")) {
      setSearchInput(patch.search);
    }

    const filterPatch = { ...patch };
    delete filterPatch.search;

    if (Object.keys(filterPatch).length) {
      setFilters((current) => ({
        ...current,
        ...filterPatch,
      }));
      setPage(1);
    }
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput(DEFAULT_FILTERS.search);
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  const handlePageSizeChange = useCallback((value) => {
    setPageSize(Number(value));
    setPage(1);
  }, []);

  const handleExport = useCallback(async () => {
    if (!capabilities.canExport) {
      toast.error("You don't have permission to export roles.");
      return;
    }

    const { requestId, signal } = beginExportRequest();
    const exportParams = {
      IsActive:
        filters.status === "all" ? undefined : filters.status === "active",
      Search: filters.search.trim() || undefined,
    };
    setIsExporting(true);

    try {
      const response = await roleService.exportRoles(exportParams, { signal });

      if (!isLatestExportRequest(requestId)) return;
      await downloadResponseBlob(response, "roles.csv");
      toast.success("Roles export downloaded");
    } catch (error) {
      if (signal.aborted || !isLatestExportRequest(requestId)) return;
      if ([404, 405, 501].includes(getApiStatus(error))) {
        await downloadCsv({
          columns: ROLE_EXPORT_COLUMNS,
          filename: "roles.csv",
          rows: filteredRoles,
        });
        toast.success(`Exported ${filteredRoles.length} roles`);
      } else {
        toast.error(await getDownloadErrorMessage(error, "Unable to export roles."));
      }
    } finally {
      if (isLatestExportRequest(requestId)) setIsExporting(false);
    }
  }, [
    beginExportRequest,
    capabilities.canExport,
    filteredRoles,
    filters,
    isLatestExportRequest,
  ]);

  const tableActions = useMemo(
    () => ({
      canActivate: capabilities.canActivate,
      canDeactivate: capabilities.canDeactivate,
      canDelete: capabilities.canDelete,
      canEdit: capabilities.canUpdate,
      canView: capabilities.canView,
      onActivate: (role) => openConfirmation("activate", role),
      onDeactivate: (role) => openConfirmation("deactivate", role),
      onDelete: (role) => openConfirmation("delete", role),
      onEdit: (role) => openRoleModal("edit", role),
      onView: (role) => openRoleModal("view", role),
    }),
    [
      capabilities.canActivate,
      capabilities.canDeactivate,
      capabilities.canDelete,
      capabilities.canUpdate,
      capabilities.canView,
      openConfirmation,
      openRoleModal,
    ],
  );

  return (
    <section className="min-w-0 space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand ring-1 ring-inset ring-brand/10">
            <ShieldCheck className="h-3.5 w-3.5" />
            RBAC / Role Management
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
            Roles
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Define reusable access profiles for teams across COSMOS ERP.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
          <AppTooltip label="Refresh Roles">
            <button
              type="button"
              onClick={loadRoles}
              disabled={isLoading}
              aria-label="Refresh Roles"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98] sm:w-auto"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </AppTooltip>
          {capabilities.canExport && (
            <AppTooltip label="Export Roles">
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                aria-busy={isExporting || undefined}
                aria-label="Export Roles"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98] sm:w-auto"
              >
                <Download className="h-4 w-4" />
                {isExporting ? "Exporting…" : "Export"}
              </button>
            </AppTooltip>
          )}
          {capabilities.canCreate && (
            <AppTooltip label="Add Role">
              <button
                type="button"
                onClick={openCreateModal}
                aria-label="Add Role"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.98] sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Add Role
              </button>
            </AppTooltip>
          )}
        </div>
      </div>

      <RoleStats
        active={stats.active}
        inactive={stats.inactive}
        total={stats.total}
      />

      <RoleFilters
        filters={filterControls}
        resultCount={totalItems}
        onChange={handleFilterChange}
        onClear={clearFilters}
      />

      <RoleTable
        actions={tableActions}
        currentPage={currentPage}
        errorMessage={errorMessage}
        hasError={Boolean(errorMessage)}
        isLoading={isLoading}
        onCreate={capabilities.canCreate ? openCreateModal : undefined}
        onRetry={loadRoles}
        pageSize={pageSize}
        roles={paginatedRoles}
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <p>
          Showing{" "}
          <span className="font-semibold text-slate-900">{rangeStart}</span> to{" "}
          <span className="font-semibold text-slate-900">{rangeEnd}</span> of{" "}
          <span className="font-semibold text-slate-900">{totalItems}</span>{" "}
          roles
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <span>Rows</span>
            <AppSelect
              value={pageSize}
              onChange={handlePageSizeChange}
              options={PAGE_SIZE_OPTIONS}
              className="w-20"
              aria-label="Rows per page"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={isLoading || currentPage <= 1}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="min-w-20 text-center text-xs font-semibold text-slate-500">
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={isLoading || currentPage >= totalPages}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <RoleModal
        isLoading={modalState.isLoading}
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        role={modalState.role}
        onClose={closeModal}
        onSubmit={submitRole}
      />

      <ConfirmDialog
        confirmation={confirmation}
        onCancel={closeConfirmation}
        onConfirm={confirmAction}
      />
    </section>
  );
};

export default Roles;
