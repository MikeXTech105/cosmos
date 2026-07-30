import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Download,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import AppSelect from "../../../components/common/AppSelect";
import AppTooltip from "../../../components/common/AppTooltip";
import useCapabilities from "../../../hooks/useCapabilities";
import useLatestRequest from "../../../hooks/useLatestRequest";
import useUrlFilters from "../../../hooks/useUrlFilters";
import { roleService } from "../../../services/rbac/roleService";
import { userService } from "../../../services/rbac/userService";
import { getApiErrorMessage, getApiStatus } from "../../../utils/apiError";
import { downloadCsv } from "../../../utils/csv";
import {
  downloadResponseBlob,
  getDownloadErrorMessage,
} from "../../../utils/fileDownload";
import UserFilters from "./UserFilters";
import UserModal from "./UserModal";
import UserStats from "./UserStats";
import UserTable from "./UserTable";

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const USER_URL_FILTER_SCHEMA = Object.freeze({
  q: Object.freeze({ default: "", type: "string" }),
  role: Object.freeze({ default: "", type: "string" }),
  isActive: Object.freeze({ default: null, type: "boolean" }),
  page: Object.freeze({
    clamp: [1, Number.MAX_SAFE_INTEGER],
    default: 1,
    type: "number",
  }),
  size: Object.freeze({
    clamp: [1, 200],
    default: PAGE_SIZE_OPTIONS[0],
    type: "number",
  }),
});
const USER_EXPORT_COLUMNS = [
  { header: "Full Name", getValue: (user) => user.fullName },
  { header: "Username", getValue: (user) => user.username },
  { header: "Email", getValue: (user) => user.email },
  {
    header: "Role",
    getValue: (user) => user.roles.map((role) => role.name).filter(Boolean).join("; "),
  },
  { header: "Status", getValue: (user) => (user.isActive ? "Active" : "Inactive") },
];

const LIST_KEYS = ["items", "users", "roles", "records", "results", "content"];

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

const extractSingleUser = (payload) => {
  return payload?.user ?? payload?.item ?? payload?.record ?? payload;
};

const extractEntityId = (payload) => {
  const entity = extractSingleUser(payload);

  if (typeof entity === "string" || typeof entity === "number") {
    return entity;
  }

  return entity?.id ?? entity?.userId ?? entity?.userID ?? entity?._id ?? null;
};

const normalizeRole = (role) => {
  if (!role) {
    return null;
  }

  if (typeof role === "string") {
    return {
      description: "Role access profile",
      id: role,
      name: role,
    };
  }

  const id = role.id ?? role.roleId ?? role.value ?? role.name ?? role.roleName;
  const name = role.name ?? role.roleName ?? role.label ?? id;

  if (!id || !name) {
    return null;
  }

  return {
    description: role.description ?? role.summary ?? "Role access profile",
    id,
    name,
  };
};

const normalizeRoles = (roles) => {
  const roleList = Array.isArray(roles) ? roles : roles ? [roles] : [];

  return roleList.map(normalizeRole).filter(Boolean);
};

const normalizeLookupValue = (value) => {
  return String(value ?? "").trim().toLowerCase();
};

const getRawUserRoles = (user) => {
  const assignedRoles =
    user?.roles ?? user?.roleList ?? user?.userRoles ?? user?.assignedRoles;

  if (assignedRoles) {
    return assignedRoles;
  }

  if (user?.role && typeof user.role === "object") {
    return user.role;
  }

  const roleId = user?.roleId ?? user?.roleID ?? user?.role_id;
  const roleName =
    user?.roleName ??
    user?.roleLabel ??
    (typeof user?.role === "string" ? user.role : undefined);

  if (roleId !== undefined || roleName !== undefined) {
    return {
      id: roleId ?? roleName,
      name: roleName ?? roleId,
    };
  }

  return null;
};

const findMatchingRoleOption = (role, roleOptions = []) => {
  const roleId = normalizeLookupValue(role?.id);
  const roleName = normalizeLookupValue(role?.name);

  return roleOptions.find((option) => {
    const optionId = normalizeLookupValue(option.id);
    const optionName = normalizeLookupValue(option.name);

    return (
      (roleId && optionId === roleId) ||
      (roleName && optionName === roleName) ||
      (roleId && optionName === roleId)
    );
  });
};

const reconcileRolesWithOptions = (roles, roleOptions = []) => {
  return normalizeRoles(roles).map((role) => {
    const matchedRole = findMatchingRoleOption(role, roleOptions);

    if (!matchedRole) {
      return role;
    }

    return {
      ...role,
      description: matchedRole.description ?? role.description,
      id: matchedRole.id,
      name: matchedRole.name,
    };
  });
};

const dedupeRoles = (roles) => {
  const roleMap = new Map();

  roles.filter(Boolean).forEach((role) => {
    const key = String(role.id);

    if (!roleMap.has(key)) {
      roleMap.set(key, role);
    }
  });

  return Array.from(roleMap.values());
};

const normalizeActiveState = (user) => {
  const rawValue =
    user?.isActive ?? user?.active ?? user?.enabled ?? user?.status;

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

const normalizeUser = (user, roleOptions = []) => {
  const fullName =
    user?.fullName ??
    user?.name ??
    user?.displayName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const username =
    user?.username ??
    user?.userName ??
    user?.login ??
    user?.email?.split("@")?.[0] ??
    "user";
  const id = user?.id ?? user?.userId ?? user?.userID ?? user?._id ?? username;

  return {
    createdAt: user?.createdAt ?? user?.createdDate ?? user?.createdOn,
    email: user?.email ?? "",
    fullName: fullName || username,
    id,
    isActive: normalizeActiveState(user),
    roles: dedupeRoles(
      reconcileRolesWithOptions(getRawUserRoles(user), roleOptions),
    ),
    username,
  };
};

const getPrimaryRoleId = (user) => {
  const roleId = user?.roles?.[0]?.id;

  return roleId === undefined || roleId === null ? "" : String(roleId);
};

const mergeDetailWithFallbackRoles = (detailUser, fallbackUser, roleOptions) => {
  const normalizedUser = normalizeUser(detailUser, roleOptions);

  if (normalizedUser.roles.length > 0 || !fallbackUser) {
    return normalizedUser;
  }

  return {
    ...normalizedUser,
    roles: normalizeUser(fallbackUser, roleOptions).roles,
  };
};

const filterUsers = (users, filters) => {
  const query = filters.search.trim().toLowerCase();

  return users.filter((user) => {
    const haystack = [
      user.username,
      user.fullName,
      user.email,
      ...user.roles.map((role) => role.name),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const statusMatches =
      filters.status === "all" ||
      (filters.status === "active" ? user.isActive : !user.isActive);
    const roleMatches =
      filters.roleId === "all" ||
      user.roles.some((role) => String(role.id) === String(filters.roleId));

    return (!query || haystack.includes(query)) && statusMatches && roleMatches;
  });
};

const paginate = (items, currentPage, pageSize) => {
  const start = (currentPage - 1) * pageSize;

  return items.slice(start, start + pageSize);
};

const ConfirmDialog = ({ confirmation, onCancel, onConfirm }) => {
  const user = confirmation.user;
  const displayName = user?.fullName || user?.username || "this user";

  const copy = {
    activate: {
      actionLabel: "Activate",
      buttonClassName: "bg-emerald-600 hover:bg-emerald-700",
      description: `${displayName} will regain access to COSMOS ERP.`,
      icon: UserCheck,
      iconClassName: "bg-emerald-50 text-emerald-600",
      title: "Activate User?",
    },
    deactivate: {
      actionLabel: "Deactivate",
      buttonClassName: "bg-amber-600 hover:bg-amber-700",
      description: `${displayName} will lose access to the system until reactivated.`,
      icon: UserX,
      iconClassName: "bg-amber-50 text-amber-600",
      title: "Deactivate User?",
    },
    delete: {
      actionLabel: "Delete",
      buttonClassName: "bg-red-600 hover:bg-red-700",
      description:
        "This removes the user record from the platform. This action cannot be undone.",
      icon: Trash2,
      iconClassName: "bg-red-50 text-red-600",
      title: "Delete 1 user?",
    },
  }[confirmation.type];

  const Icon = copy?.icon ?? AlertTriangle;

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
            aria-labelledby="confirm-dialog-title"
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
                <Icon aria-hidden="true" className="h-5 w-5" />
              </div>

              <h2
                id="confirm-dialog-title"
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
              title={confirmation.isSubmitting ? "Wait for the current request to finish" : undefined}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
              disabled={confirmation.isSubmitting}
              title={confirmation.isSubmitting ? "Wait for the current request to finish" : undefined}
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

const Users = () => {
  const [users, setUsers] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const {
    activeCount,
    reset: resetUrlFilters,
    setValue: setUrlFilter,
    setValues: setUrlFilters,
    values: urlFilters,
  } = useUrlFilters(USER_URL_FILTER_SCHEMA);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isRolesLoading, setIsRolesLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [rolesError, setRolesError] = useState(null);
  const [modalState, setModalState] = useState({
    isLoading: false,
    isOpen: false,
    mode: "create",
    user: null,
  });
  const [confirmation, setConfirmation] = useState({
    isOpen: false,
    isSubmitting: false,
    type: null,
    user: null,
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
      "assignRole",
      "export",
    ],
    label: "Users",
    resource: "users",
    route: "/users",
  });

  const loadRoles = useCallback(async () => {
    setIsRolesLoading(true);
    setRolesError(null);

    try {
      const response = await roleService.getRoles();
      const collection = extractCollection(response.data, response.meta);
      const normalizedRoles = dedupeRoles(
        collection.items.map(normalizeRole).filter(Boolean),
      );

      setRoleOptions(normalizedRoles);
      return normalizedRoles;
    } catch (error) {
      setRoleOptions([]);
      setRolesError(getErrorMessage(error, "Unable to load roles."));
      return [];
    } finally {
      setIsRolesLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await userService.getUsers();
      const collection = extractCollection(response.data, response.meta);
      const normalizedUsers = collection.items
        .map(normalizeUser)
        .filter((user) => user.id);

      setUsers(normalizedUsers);
    } catch (error) {
      setUsers([]);
      setErrorMessage(
        getErrorMessage(error, "Unable to load users. Please try again."),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadRoles);
  }, [loadRoles]);

  useEffect(() => {
    void Promise.resolve().then(loadUsers);
  }, [loadUsers]);

  useEffect(() => {
    if (
      isRolesLoading ||
      rolesError ||
      !urlFilters.role ||
      roleOptions.some(
        (role) => String(role.id) === String(urlFilters.role),
      )
    ) {
      return;
    }

    setUrlFilter("role", "", { history: "replace" });
  }, [
    isRolesLoading,
    roleOptions,
    rolesError,
    setUrlFilter,
    urlFilters.role,
  ]);

  const filters = useMemo(
    () => ({
      roleId: urlFilters.role || "all",
      search: urlFilters.q,
      status:
        urlFilters.isActive === null
          ? "all"
          : urlFilters.isActive
            ? "active"
            : "inactive",
    }),
    [urlFilters.isActive, urlFilters.q, urlFilters.role],
  );

  const filteredUsers = useMemo(() => filterUsers(users, filters), [
    filters,
    users,
  ]);
  const totalItems = filteredUsers.length;
  const totalPages = Math.max(
    1,
    Math.ceil(totalItems / urlFilters.size),
  );
  const currentPage = Math.min(urlFilters.page, totalPages);
  const paginatedUsers = useMemo(
    () => paginate(filteredUsers, currentPage, urlFilters.size),
    [currentPage, filteredUsers, urlFilters.size],
  );
  const rangeStart = paginatedUsers.length
    ? (currentPage - 1) * urlFilters.size + 1
    : 0;
  const rangeEnd = paginatedUsers.length
    ? rangeStart + paginatedUsers.length - 1
    : 0;
  const pageSizeOptions = useMemo(
    () =>
      [...new Set([...PAGE_SIZE_OPTIONS, urlFilters.size])].sort(
        (left, right) => left - right,
      ),
    [urlFilters.size],
  );
  const stats = useMemo(() => {
    return {
      active: users.filter((user) => user.isActive).length,
      inactive: users.filter((user) => !user.isActive).length,
      total: users.length,
    };
  }, [users]);

  useEffect(() => {
    if (!isLoading && urlFilters.page !== currentPage) {
      setUrlFilter("page", currentPage, { history: "replace" });
    }
  }, [
    currentPage,
    isLoading,
    setUrlFilter,
    urlFilters.page,
  ]);

  const closeModal = useCallback(() => {
    cancelDetailRequests();
    setModalState((current) => ({
      ...current,
      isLoading: false,
      isOpen: false,
    }));
  }, [cancelDetailRequests]);

  const openCreateModal = useCallback(() => {
    if (!capabilities.canCreate || !capabilities.canAssignRole) {
      toast.error("You don't have permission to create users and assign roles.");
      return;
    }

    cancelDetailRequests();
    loadRoles();
    setModalState({
      isLoading: false,
      isOpen: true,
      mode: "create",
      user: null,
    });
  }, [cancelDetailRequests, capabilities.canAssignRole, capabilities.canCreate, loadRoles]);

  const openEditModal = useCallback(async (user) => {
    if (!capabilities.canUpdate || !capabilities.canAssignRole) {
      toast.error("You don't have permission to update users and roles.");
      return;
    }

    const rolesPromise = loadRoles();
    const { requestId, signal } = beginDetailRequest();

    setModalState({
      isLoading: true,
      isOpen: true,
      mode: "edit",
      user: normalizeUser(user, roleOptions),
    });

    try {
      const [response, latestRoleOptions] = await Promise.all([
        userService.getUserById(user.id, { signal }),
        rolesPromise,
      ]);
      if (!isLatestDetailRequest(requestId)) return;

      setModalState({
        isLoading: false,
        isOpen: true,
        mode: "edit",
        user: mergeDetailWithFallbackRoles(
          extractSingleUser(response.data),
          user,
          latestRoleOptions,
        ),
      });
    } catch (error) {
      if (!isLatestDetailRequest(requestId)) return;
      if (getApiStatus(error) === 404) {
        toast.error("This user no longer exists. The list was refreshed.");
        closeModal();
        await loadUsers();
        return;
      }
      toast.error(
        getErrorMessage(error, "Unable to load the latest user details."),
      );
      setModalState((current) => ({
        ...current,
        isLoading: false,
      }));
    }
  }, [
    capabilities.canAssignRole,
    capabilities.canUpdate,
    beginDetailRequest,
    closeModal,
    isLatestDetailRequest,
    loadRoles,
    loadUsers,
    roleOptions,
  ]);

  const submitUser = useCallback(async (payload) => {
    const isEdit = modalState.mode === "edit";
    const maySubmit = isEdit
      ? capabilities.canUpdate && capabilities.canAssignRole
      : capabilities.canCreate && capabilities.canAssignRole;

    if (!maySubmit) {
      toast.error("You don't have permission to save this user.");
      return;
    }

    const { roleId, ...userPayload } = payload;

    try {
      if (modalState.mode === "edit") {
        const previousRoleId = getPrimaryRoleId(modalState.user);

        await userService.updateUser(modalState.user.id, {
          email: userPayload.email,
          fullName: userPayload.fullName,
          isActive: userPayload.isActive,
        });

        if (String(previousRoleId) !== String(roleId)) {
          await userService.assignRoles(modalState.user.id, [roleId]);
          toast.success("Role assignment updated successfully");
        }

        toast.success("User updated successfully");
      } else {
        const response = await userService.createUser({
          username: userPayload.username,
          email: userPayload.email,
          fullName: userPayload.fullName,
          password: userPayload.password,
          isActive: userPayload.isActive,
        });
        const createdUserId = extractEntityId(response.data);

        if (!createdUserId) {
          throw new Error("User created, but API response did not include user id.");
        }

        await userService.assignRoles(createdUserId, [roleId]);
        toast.success("User created successfully");
        toast.success("Role assigned successfully");
      }

      closeModal();
      await Promise.all([loadUsers(), loadRoles()]);
    } catch (error) {
      if (modalState.mode === "edit" && getApiStatus(error) === 404) {
        toast.error("This user no longer exists. The list was refreshed.");
        closeModal();
        await loadUsers();
        return;
      }
      toast.error(
        getErrorMessage(
          error,
          modalState.mode === "edit"
            ? "Unable to update user."
            : "Unable to create user with role.",
          ),
      );
      throw error;
    }
  }, [
    capabilities.canAssignRole,
    capabilities.canCreate,
    capabilities.canUpdate,
    closeModal,
    loadRoles,
    loadUsers,
    modalState.mode,
    modalState.user,
  ]);

  const openConfirmation = useCallback((type, user) => {
    const allowed = {
      activate: capabilities.canActivate,
      deactivate: capabilities.canDeactivate,
      delete: capabilities.canDelete,
    }[type];

    if (!allowed) {
      toast.error("You don't have permission to perform this user action.");
      return;
    }

    setConfirmation({
      isOpen: true,
      isSubmitting: false,
      type,
      user,
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
      type: null,
      user: null,
    });
  }, []);

  const confirmAction = useCallback(async () => {
    if (!confirmation.user) {
      return;
    }

    const allowed = {
      activate: capabilities.canActivate,
      deactivate: capabilities.canDeactivate,
      delete: capabilities.canDelete,
    }[confirmation.type];

    if (!allowed) {
      toast.error("You don't have permission to perform this user action.");
      closeConfirmation();
      return;
    }

    setConfirmation((current) => ({
      ...current,
      isSubmitting: true,
    }));

    try {
      if (confirmation.type === "delete") {
        await userService.deleteUser(confirmation.user.id);
        toast.success("User deleted successfully");
      }

      if (confirmation.type === "activate") {
        await userService.activateUser(confirmation.user.id);
        toast.success("User activated successfully");
      }

      if (confirmation.type === "deactivate") {
        await userService.deactivateUser(confirmation.user.id);
        toast.success("User deactivated successfully");
      }

      closeConfirmation();
      await loadUsers();
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
    confirmation.type,
    confirmation.user,
    loadUsers,
  ]);

  const handleFilterChange = useCallback((patch) => {
    const urlPatch = {};
    let history = "replace";

    if (Object.hasOwn(patch, "search")) {
      urlPatch.q = patch.search;
    }
    if (Object.hasOwn(patch, "status")) {
      urlPatch.isActive =
        patch.status === "all"
          ? null
          : patch.status === "active";
      history = "push";
    }
    if (Object.hasOwn(patch, "roleId")) {
      urlPatch.role =
        patch.roleId === "all" ? "" : patch.roleId;
      history = "push";
    }

    setUrlFilters(urlPatch, { history });
  }, [setUrlFilters]);

  const handlePageSizeChange = useCallback((value) => {
    setUrlFilter("size", Number(value));
  }, [setUrlFilter]);

  const handleExport = useCallback(async () => {
    if (!capabilities.canExport) {
      toast.error("You don't have permission to export users.");
      return;
    }

    const { requestId, signal } = beginExportRequest();
    const exportParams = {
      IsActive:
        filters.status === "all" ? undefined : filters.status === "active",
      RoleId: filters.roleId === "all" ? undefined : filters.roleId,
      Search: filters.search.trim() || undefined,
    };
    setIsExporting(true);

    try {
      const response = await userService.exportUsers(exportParams, { signal });

      if (!isLatestExportRequest(requestId)) return;
      await downloadResponseBlob(response, "users.csv");
      toast.success("Users export downloaded");
    } catch (error) {
      if (signal.aborted || !isLatestExportRequest(requestId)) return;
      if ([404, 405, 501].includes(getApiStatus(error))) {
        await downloadCsv({
          columns: USER_EXPORT_COLUMNS,
          filename: "users.csv",
          rows: filteredUsers,
        });
        toast.success(`Exported ${filteredUsers.length} users`);
      } else {
        toast.error(await getDownloadErrorMessage(error, "Unable to export users."));
      }
    } finally {
      if (isLatestExportRequest(requestId)) setIsExporting(false);
    }
  }, [
    beginExportRequest,
    capabilities.canExport,
    filteredUsers,
    filters,
    isLatestExportRequest,
  ]);

  const tableActions = useMemo(
    () => ({
      canActivate: capabilities.canActivate,
      canDeactivate: capabilities.canDeactivate,
      canDelete: capabilities.canDelete,
      canEdit: capabilities.canUpdate && capabilities.canAssignRole,
      onActivate: (user) => openConfirmation("activate", user),
      onDeactivate: (user) => openConfirmation("deactivate", user),
      onDelete: (user) => openConfirmation("delete", user),
      onEdit: openEditModal,
    }),
    [
      capabilities.canActivate,
      capabilities.canAssignRole,
      capabilities.canDeactivate,
      capabilities.canDelete,
      capabilities.canUpdate,
      openConfirmation,
      openEditModal,
    ],
  );

  return (
    <section className="min-w-0 space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand ring-1 ring-inset ring-brand/10">
            <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
            RBAC / User Management
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
            Users
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Manage platform users, roles and access permissions.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
          <AppTooltip
            label={isLoading ? "Users are already refreshing" : "Refresh Users"}
          >
            <button
              type="button"
              onClick={loadUsers}
              disabled={isLoading}
              aria-label="Refresh Users"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98] sm:w-auto"
            >
              <RefreshCw aria-hidden="true"
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </AppTooltip>
          {capabilities.canExport && (
            <AppTooltip
              label={isExporting ? "User export is in progress" : "Export Users"}
            >
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                aria-busy={isExporting || undefined}
                aria-label="Export Users"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98] sm:w-auto"
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                {isExporting ? "Exporting…" : "Export"}
              </button>
            </AppTooltip>
          )}
          {capabilities.canCreate && capabilities.canAssignRole && (
            <AppTooltip label="Add User">
              <button
                type="button"
                onClick={openCreateModal}
                aria-label="Add User"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.98] sm:w-auto"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                Add User
              </button>
            </AppTooltip>
          )}
        </div>
      </div>

      <UserStats
        active={stats.active}
        inactive={stats.inactive}
        loading={isLoading}
        total={stats.total}
      />

      <UserFilters
        activeFilterCount={activeCount}
        filters={filters}
        isRolesLoading={isRolesLoading}
        roleOptions={roleOptions}
        resultCount={totalItems}
        rolesError={rolesError}
        onChange={handleFilterChange}
        onClear={resetUrlFilters}
      />

      <UserTable
        activeFilterCount={activeCount}
        actions={tableActions}
        currentPage={currentPage}
        errorMessage={errorMessage}
        hasError={Boolean(errorMessage)}
        isLoading={isLoading}
        onClear={resetUrlFilters}
        onCreate={
          capabilities.canCreate && capabilities.canAssignRole
            ? openCreateModal
            : undefined
        }
        onRetry={loadUsers}
        pageSize={urlFilters.size}
        users={paginatedUsers}
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <p>
          Showing{" "}
          <span className="font-semibold text-slate-900">{rangeStart}</span> to{" "}
          <span className="font-semibold text-slate-900">{rangeEnd}</span> of{" "}
          <span className="font-semibold text-slate-900">{totalItems}</span>{" "}
          users
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <span>Rows</span>
            <AppSelect
              value={urlFilters.size}
              onChange={handlePageSizeChange}
              options={pageSizeOptions}
              className="w-20"
              label="Rows per page"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setUrlFilter("page", Math.max(1, currentPage - 1))
              }
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
              onClick={() =>
                setUrlFilter(
                  "page",
                  Math.min(totalPages, currentPage + 1),
                )
              }
              disabled={isLoading || currentPage >= totalPages}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <UserModal
        isLoading={modalState.isLoading}
        isOpen={modalState.isOpen}
        isRolesLoading={isRolesLoading}
        mode={modalState.mode}
        roleOptions={roleOptions}
        rolesError={rolesError}
        user={modalState.user}
        onClose={closeModal}
        onRetryRoles={loadRoles}
        onSubmit={submitUser}
      />

      <ConfirmDialog
        confirmation={confirmation}
        onCancel={closeConfirmation}
        onConfirm={confirmAction}
      />
    </section>
  );
};

export default Users;
