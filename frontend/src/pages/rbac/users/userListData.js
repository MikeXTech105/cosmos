import { getApiErrorMessage } from "../../../utils/apiError";

const LIST_KEYS = ["items", "users", "roles", "records", "results", "content"];
const MALFORMED_COLLECTION_MESSAGE =
  "The server returned an invalid collection. Please try again.";

export const extractCollection = (payload, responseMeta) => {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      meta: responseMeta ?? {},
    };
  }

  const listKey = LIST_KEYS.find((key) => Array.isArray(payload?.[key]));

  if (!listKey) {
    throw new Error(MALFORMED_COLLECTION_MESSAGE);
  }

  return {
    items: payload[listKey],
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

const normalizeLookupValue = (value) => {
  return String(value ?? "").trim().toLowerCase();
};

export const normalizeRole = (role) => {
  if (!role) return null;

  if (typeof role === "string") {
    return { description: "Role access profile", id: role, name: role };
  }

  const id = role.id ?? role.roleId ?? role.value ?? role.name ?? role.roleName;
  const name = role.name ?? role.roleName ?? role.label ?? id;

  if (!id || !name) return null;

  return {
    description: role.description ?? role.summary ?? "Role access profile",
    id,
    name,
  };
};

export const normalizeRoles = (roles) => {
  const roleList = Array.isArray(roles) ? roles : roles ? [roles] : [];

  return roleList.map(normalizeRole).filter(Boolean);
};

const getRawUserRoles = (user) => {
  const assignedRoles =
    user?.roles ?? user?.roleList ?? user?.userRoles ?? user?.assignedRoles;

  if (assignedRoles) return assignedRoles;
  if (user?.role && typeof user.role === "object") return user.role;

  const roleId = user?.roleId ?? user?.roleID ?? user?.role_id;
  const roleName =
    user?.roleName ??
    user?.roleLabel ??
    (typeof user?.role === "string" ? user.role : undefined);

  return roleId !== undefined || roleName !== undefined
    ? { id: roleId ?? roleName, name: roleName ?? roleId }
    : null;
};

const findMatchingRoleOption = (role, roleOptions) => {
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

const reconcileRolesWithOptions = (roles, roleOptions) => {
  return normalizeRoles(roles).map((role) => {
    const matchedRole = findMatchingRoleOption(role, roleOptions);

    return matchedRole
      ? {
          ...role,
          description: matchedRole.description ?? role.description,
          id: matchedRole.id,
          name: matchedRole.name,
        }
      : role;
  });
};

export const dedupeRoles = (roles) => {
  const roleMap = new Map();

  roles.filter(Boolean).forEach((role) => {
    const key = String(role.id);
    if (!roleMap.has(key)) roleMap.set(key, role);
  });

  return Array.from(roleMap.values());
};

const normalizeActiveState = (user) => {
  const rawValue = user?.isActive ?? user?.active ?? user?.enabled ?? user?.status;

  if (rawValue === undefined || rawValue === null) return true;
  if (typeof rawValue === "boolean") return rawValue;
  if (typeof rawValue === "number") return rawValue === 1;
  if (typeof rawValue === "string") {
    return ["active", "enabled", "true", "1"].includes(rawValue.trim().toLowerCase());
  }

  return Boolean(rawValue);
};

export const normalizeUser = (user, roleOptions = []) => {
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
    roles: dedupeRoles(reconcileRolesWithOptions(getRawUserRoles(user), roleOptions)),
    username,
  };
};

export const normalizeUsers = (items, roleOptions = []) => {
  if (!Array.isArray(items)) {
    throw new Error(MALFORMED_COLLECTION_MESSAGE);
  }

  const normalizedRoleOptions = Array.isArray(roleOptions) ? roleOptions : [];

  return items.map((user) => normalizeUser(user, normalizedRoleOptions)).filter((user) => user.id);
};

export const filterUsers = (users, filters) => {
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

export const paginate = (items, currentPage, pageSize) => {
  const start = (currentPage - 1) * pageSize;
  return items.slice(start, start + pageSize);
};

export const getUsersLoadErrorMessage = (error) => {
  const message = getApiErrorMessage(error, MALFORMED_COLLECTION_MESSAGE);

  return message === MALFORMED_COLLECTION_MESSAGE ||
    /(?:^|\s)[\w$]+\.(?:find|map|filter) is not a function|\btypeerror\b/i.test(message)
    ? "We couldn't load users. Please try again."
    : message;
};

export const getRolesLoadErrorMessage = (error) => {
  return getApiErrorMessage(error, "Unable to load roles.");
};

export { MALFORMED_COLLECTION_MESSAGE };
