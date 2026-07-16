const ACTION_ALIASES = {
  edit: "update",
  update: "update",
  assignrole: "assignRole",
  "assign-role": "assignRole",
  assign_role: "assignRole",
};

const ACTION_BOOLEAN_KEYS = {
  view: ["canView", "view"],
  create: ["canCreate", "create"],
  update: ["canUpdate", "canEdit", "update", "edit"],
  delete: ["canDelete", "delete"],
  export: ["canExport", "export"],
  approve: ["canApprove", "approve"],
  confirm: ["canConfirm", "confirm"],
  cancel: ["canCancel", "cancel"],
  convert: ["canConvert", "convert"],
  payment: ["canPayment", "canRecordPayment", "payment", "recordPayment"],
  activate: ["canActivate", "activate"],
  deactivate: ["canDeactivate", "deactivate"],
  assignRole: ["canAssignRole", "assignRole"],
  settings: ["canSettings", "settings"],
};

const normalizeText = (value) => {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

const normalizeIdentifier = (value) => String(value ?? "").trim().toLowerCase();

const normalizePermissionCode = (value) => {
  return String(value ?? "").trim().replace(/\s+/g, "").toLowerCase();
};

export const normalizeRoute = (route) => {
  let normalizedRoute = String(route ?? "").trim();

  if (!normalizedRoute) {
    return "";
  }

  const queryIndex = normalizedRoute.indexOf("?");
  const hashIndex = normalizedRoute.indexOf("#");
  const suffixIndexes = [queryIndex, hashIndex].filter((index) => index >= 0);

  if (suffixIndexes.length > 0) {
    normalizedRoute = normalizedRoute.slice(0, Math.min(...suffixIndexes));
  }

  normalizedRoute = `/${normalizedRoute.replace(/^\/+/, "")}`.replace(
    /\/{2,}/g,
    "/",
  );

  if (normalizedRoute.length > 1) {
    normalizedRoute = normalizedRoute.replace(/\/+$/, "");
  }

  return normalizedRoute;
};

export const getPageLabel = (page) => {
  return (
    page?.pageName ??
    page?.displayName ??
    page?.name ??
    page?.title ??
    page?.label ??
    ""
  );
};

export const getPageRoute = (page) => {
  return normalizeRoute(page?.route ?? page?.path ?? page?.url);
};

export const getPageId = (page) => {
  return page?.pageId ?? page?.id ?? page?._id ?? "";
};

export const normalizeAction = (action) => {
  const value = String(action ?? "").trim();
  const aliasKey = value.replace(/\s+/g, "").toLowerCase();

  return ACTION_ALIASES[value] ?? ACTION_ALIASES[aliasKey] ?? aliasKey;
};

export const normalizePermissionPage = (page) => {
  const permissions = Array.isArray(page?.permissions)
    ? page.permissions.filter((permission) => typeof permission === "string")
    : [];

  return {
    id: normalizeIdentifier(getPageId(page)),
    label: normalizeText(getPageLabel(page)),
    permissionCodes: permissions.map(normalizePermissionCode),
    route: getPageRoute(page),
    source: page ?? null,
  };
};

export const findPermissionPage = (pages, target) => {
  const pageList = Array.isArray(pages) ? pages.filter(Boolean) : [];
  const normalizedTarget = {
    id: normalizeIdentifier(typeof target === "string" ? "" : target?.id),
    label: normalizeText(
      typeof target === "string"
        ? target
        : target?.pageName ?? target?.label ?? target?.name,
    ),
    route: normalizeRoute(typeof target === "string" ? "" : target?.route),
  };

  if (normalizedTarget.id) {
    const idMatch = pageList.find((page) => {
      return normalizeIdentifier(getPageId(page)) === normalizedTarget.id;
    });

    if (idMatch) {
      return idMatch;
    }
  }

  if (normalizedTarget.route) {
    return (
      pageList.find((page) => getPageRoute(page) === normalizedTarget.route) ??
      null
    );
  }

  if (!normalizedTarget.label) {
    return null;
  }

  const labelMatches = pageList.filter((page) => {
    return normalizeText(getPageLabel(page)) === normalizedTarget.label;
  });

  return labelMatches.length === 1 ? labelMatches[0] : null;
};

const getExplicitBooleanCapability = (page, action) => {
  const keys = ACTION_BOOLEAN_KEYS[action];

  if (!keys) {
    return null;
  }

  const nestedPermissions =
    page?.permissions && !Array.isArray(page.permissions)
      ? page.permissions
      : null;
  const explicitValues = keys.flatMap((key) => {
    return [page?.[key], nestedPermissions?.[key]].filter(
      (value) => typeof value === "boolean",
    );
  });

  if (explicitValues.length === 0) {
    return null;
  }

  return explicitValues.every((value) => value === explicitValues[0])
    ? explicitValues[0]
    : false;
};

const getActionCodeAliases = (action) => {
  if (action === "update") {
    return ["update", "edit"];
  }

  if (action === "assignRole") {
    return ["assignrole", "assign-role", "assign_role"];
  }

  return [String(action).toLowerCase()];
};

export const hasPageCapability = (page, { action, resource } = {}) => {
  if (!page) {
    return false;
  }

  const normalizedAction = normalizeAction(action);
  const explicitCapability = getExplicitBooleanCapability(page, normalizedAction);

  if (explicitCapability !== null) {
    return explicitCapability;
  }

  if (!Array.isArray(page.permissions)) {
    return false;
  }

  const resources = (Array.isArray(resource) ? resource : [resource])
    .map(normalizePermissionCode)
    .filter(Boolean);
  const permissionSet = new Set(page.permissions.map(normalizePermissionCode));
  const actionAliases = getActionCodeAliases(normalizedAction);

  if (resources.length === 0) {
    return Array.from(permissionSet).some((permissionCode) => {
      const separatorIndex = permissionCode.lastIndexOf(".");
      const permissionAction = permissionCode.slice(separatorIndex + 1);

      return separatorIndex > 0 && actionAliases.includes(permissionAction);
    });
  }

  return resources.some((resourceName) => {
    return actionAliases.some((actionName) => {
      return permissionSet.has(`${resourceName}.${actionName}`);
    });
  });
};

export const canViewPermission = (page, resource) => {
  return hasPageCapability(page, { action: "view", resource });
};

const getRoleIdentity = (role) => {
  if (typeof role === "string") {
    return role;
  }

  return (
    role?.code ??
    role?.roleCode ??
    role?.name ??
    role?.roleName ??
    role?.label ??
    role?.value ??
    role?.authority ??
    ""
  );
};

const isExplicitSuperAdmin = (value) => {
  if (value?.isSuperAdmin === true) {
    return true;
  }

  const normalizedRole = normalizeText(getRoleIdentity(value)).replace(/\s+/g, "");

  return normalizedRole === "superadmin";
};

export const isSuperAdminAuth = ({ roles = [], user = null } = {}) => {
  if (user?.isSuperAdmin === true) {
    return true;
  }

  const userRoles = Array.isArray(user?.roles)
    ? user.roles
    : user?.roles
      ? [user.roles]
      : [];
  const roleValues = [
    user?.role,
    user?.roleName,
    user?.roleCode,
    ...userRoles,
    ...(Array.isArray(roles) ? roles : [roles]),
  ].filter(Boolean);

  return roleValues.some(isExplicitSuperAdmin);
};

export const canPerformAction = ({
  action,
  pages = [],
  resource,
  roles = [],
  target,
  user = null,
} = {}) => {
  if (isSuperAdminAuth({ roles, user })) {
    return true;
  }

  const page = findPermissionPage(pages, target);

  return hasPageCapability(page, { action, resource });
};
