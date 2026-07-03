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
import { useSelector } from "react-redux";
import { toast } from "sonner";

import AppSelect from "../../../components/common/AppSelect";
import AppTooltip from "../../../components/common/AppTooltip";
import { roleService } from "../../../services/rbac/roleService";
import { userService } from "../../../services/rbac/userService";
import { getApiErrorMessage } from "../../../utils/apiError";
import UserFilters from "./UserFilters";
import UserModal from "./UserModal";
import UserStats from "./UserStats";
import UserTable from "./UserTable";

const DEFAULT_FILTERS = {
  roleId: "all",
  search: "",
  status: "all",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const USER_PERMISSIONS = {
  activate: "users.activate",
  assignRole: "users.assignRole",
  create: "users.create",
  deactivate: "users.deactivate",
  delete: "users.delete",
  update: "users.update",
  view: "users.view",
};

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

const buildPaginationMeta = ({ currentPage, currentPageSize, itemCount, meta }) => {
  const total =
    meta?.total ??
    meta?.totalCount ??
    meta?.totalElements ??
    meta?.count ??
    itemCount;
  const page =
    meta?.page ??
    meta?.pageNumber ??
    meta?.currentPage ??
    currentPage;
  const pageSize =
    meta?.pageSize ??
    meta?.size ??
    meta?.limit ??
    currentPageSize;

  return {
    page: Number(page) || currentPage,
    pageSize: Number(pageSize) || currentPageSize,
    total: Number(total) || itemCount,
  };
};

const buildUserQueryParams = ({ filters, page, pageSize }) => {
  const trimmedSearch = filters.search.trim();
  const hasStatus = filters.status !== "all";

  return {
    isActive: hasStatus ? filters.status === "active" : undefined,
    page,
    pageSize,
    roleId: filters.roleId === "all" ? undefined : filters.roleId,
    search: trimmedSearch || undefined,
    status: hasStatus ? filters.status : undefined,
  };
};

const getPrimaryRoleId = (user) => {
  const roleId = user?.roles?.[0]?.id;

  return roleId === undefined || roleId === null ? "" : String(roleId);
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
      title: "Delete User?",
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
                <Icon className="h-5 w-5" />
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

const Users = () => {
  const authPages = useSelector((state) => state.auth.pages ?? []);
  const [users, setUsers] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState(DEFAULT_FILTERS.search);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [paginationMeta, setPaginationMeta] = useState({
    page: 1,
    pageSize: PAGE_SIZE_OPTIONS[0],
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
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

  const permissionSet = useMemo(() => {
    const permissions = authPages.flatMap((pageItem) => {
      return Array.isArray(pageItem.permissions) ? pageItem.permissions : [];
    });

    return new Set(permissions.map(String));
  }, [authPages]);

  const capabilities = useMemo(() => {
    const canPerform = (permission) => {
      return permissionSet.size === 0 || permissionSet.has(permission);
    };

    return {
      canActivate: canPerform(USER_PERMISSIONS.activate),
      canAssignRole: canPerform(USER_PERMISSIONS.assignRole),
      canCreate: canPerform(USER_PERMISSIONS.create),
      canDeactivate: canPerform(USER_PERMISSIONS.deactivate),
      canDelete: canPerform(USER_PERMISSIONS.delete),
      canUpdate: canPerform(USER_PERMISSIONS.update),
      canView: canPerform(USER_PERMISSIONS.view),
    };
  }, [permissionSet]);

  const loadRoles = useCallback(async () => {
    setIsRolesLoading(true);
    setRolesError(null);

    try {
      const response = await roleService.getRoles({ pageSize: 500 });
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
      const response = await userService.getUsers(
        buildUserQueryParams({ filters, page, pageSize }),
      );
      const collection = extractCollection(response.data, response.meta);
      const normalizedUsers = collection.items
        .map(normalizeUser)
        .filter((user) => user.id);

      setUsers(normalizedUsers);
      setPaginationMeta(
        buildPaginationMeta({
          currentPage: page,
          currentPageSize: pageSize,
          itemCount: normalizedUsers.length,
          meta: collection.meta,
        }),
      );
    } catch (error) {
      setUsers([]);
      setErrorMessage(
        getErrorMessage(error, "Unable to load users. Please try again."),
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    void Promise.resolve().then(loadRoles);
  }, [loadRoles]);

  useEffect(() => {
    void Promise.resolve().then(loadUsers);
  }, [loadUsers]);

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

  const totalItems = paginationMeta.total;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const rangeStart = users.length ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = users.length ? rangeStart + users.length - 1 : 0;
  const filterControls = useMemo(() => {
    return {
      ...filters,
      search: searchInput,
    };
  }, [filters, searchInput]);
  const stats = useMemo(() => {
    return {
      active: users.filter((user) => user.isActive).length,
      inactive: users.filter((user) => !user.isActive).length,
      total: totalItems,
    };
  }, [totalItems, users]);

  const closeModal = useCallback(() => {
    setModalState((current) => ({
      ...current,
      isLoading: false,
      isOpen: false,
    }));
  }, []);

  const openCreateModal = useCallback(() => {
    loadRoles();
    setModalState({
      isLoading: false,
      isOpen: true,
      mode: "create",
      user: null,
    });
  }, [loadRoles]);

  const openEditModal = useCallback(async (user) => {
    const rolesPromise = loadRoles();

    setModalState({
      isLoading: true,
      isOpen: true,
      mode: "edit",
      user: normalizeUser(user, roleOptions),
    });

    try {
      const [response, latestRoleOptions] = await Promise.all([
        userService.getUserById(user.id),
        rolesPromise,
      ]);

      setModalState({
        isLoading: false,
        isOpen: true,
        mode: "edit",
        user: normalizeUser(extractSingleUser(response.data), latestRoleOptions),
      });
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Unable to load the latest user details."),
      );
      setModalState((current) => ({
        ...current,
        isLoading: false,
      }));
    }
  }, [loadRoles, roleOptions]);

  const submitUser = useCallback(async (payload) => {
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
      toast.error(
        getErrorMessage(
          error,
          modalState.mode === "edit"
            ? "Unable to update user."
            : "Unable to create user with role.",
        ),
      );
    }
  }, [closeModal, loadRoles, loadUsers, modalState.mode, modalState.user]);

  const openConfirmation = useCallback((type, user) => {
    setConfirmation({
      isOpen: true,
      isSubmitting: false,
      type,
      user,
    });
  }, []);

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
  }, [closeConfirmation, confirmation.type, confirmation.user, loadUsers]);

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

  const handleExport = useCallback(() => {
    toast.info("Export is available as a UI action and will connect to reporting.");
  }, []);

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
            <ShieldCheck className="h-3.5 w-3.5" />
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
          <AppTooltip label="Refresh Users">
            <button
              type="button"
              onClick={loadUsers}
              disabled={isLoading}
              aria-label="Refresh Users"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98] sm:w-auto"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </AppTooltip>
          <AppTooltip label="Export Users">
            <button
              type="button"
              onClick={handleExport}
              aria-label="Export Users"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98] sm:w-auto"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </AppTooltip>
          <AppTooltip label="Add User">
            <button
              type="button"
              onClick={openCreateModal}
              disabled={!capabilities.canCreate || !capabilities.canAssignRole}
              aria-label="Add User"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98] sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Add User
            </button>
          </AppTooltip>
        </div>
      </div>

      <UserStats
        active={stats.active}
        inactive={stats.inactive}
        total={stats.total}
      />

      <UserFilters
        filters={filterControls}
        isRolesLoading={isRolesLoading}
        roleOptions={roleOptions}
        resultCount={totalItems}
        rolesError={rolesError}
        onChange={handleFilterChange}
        onClear={clearFilters}
      />

      <UserTable
        actions={tableActions}
        currentPage={page}
        errorMessage={errorMessage}
        hasError={Boolean(errorMessage)}
        isLoading={isLoading}
        onCreate={openCreateModal}
        onRetry={loadUsers}
        pageSize={pageSize}
        users={users}
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
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={isLoading || page <= 1}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
