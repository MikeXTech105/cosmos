import { Save, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import AppTooltip from "../../components/common/AppTooltip";
import { pageService } from "../../services/pageService";
import { permissionService } from "../../services/permissionService";
import { roleService } from "../../services/roleService";
import { permissionColumns } from "./permissionsColumns";
import PermissionsTable from "./PermissionsTable";
import RoleSelector from "./RoleSelector";

const LIST_KEYS = [
  "items",
  "pages",
  "roles",
  "permissions",
  "rolePermissions",
  "records",
  "results",
  "content",
];

const getErrorMessage = (error, fallback) => {
  return (
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message ??
    fallback
  );
};

const extractCollection = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const listKey = LIST_KEYS.find((key) => Array.isArray(payload?.[key]));

  return listKey ? payload[listKey] : [];
};

const normalizeRole = (role) => {
  if (!role) {
    return null;
  }

  if (typeof role === "string") {
    return { id: role, name: role };
  }

  const id = role.id ?? role.roleId ?? role.roleID ?? role._id ?? role.name;
  const name = role.name ?? role.roleName ?? role.label ?? id;

  return id && name ? { id, name } : null;
};

const getPageId = (page) => {
  return page?.id ?? page?.pageId ?? page?.pageID ?? page?._id ?? page?.route;
};

const getParentId = (page) => {
  const parentId =
    page?.parentPageId ?? page?.parentId ?? page?.parent_id ?? page?.parent?.id;

  return parentId === 0 ||
    parentId === "0" ||
    parentId === "" ||
    parentId === null ||
    parentId === undefined
    ? null
    : parentId;
};

const flattenPageRecords = (pages, inheritedParentId = null) => {
  return pages.flatMap((page) => {
    const pageId = getPageId(page);
    const normalizedPage = {
      ...page,
      parentPageId: getParentId(page) ?? inheritedParentId,
    };
    const children = Array.isArray(page.children) ? page.children : [];

    return [normalizedPage, ...flattenPageRecords(children, pageId)];
  });
};

const normalizePage = (page) => {
  if (!page) {
    return null;
  }

  const id = getPageId(page);
  const name = page.name ?? page.pageName ?? page.key ?? page.route;
  const displayName =
    page.displayName ?? page.label ?? page.title ?? page.pageName ?? name;

  if (!id || !name || !displayName) {
    return null;
  }

  return {
    displayName,
    icon: page.icon ?? page.iconName ?? page.moduleIcon ?? "AppWindow",
    id,
    name,
    parentPageId: getParentId(page),
    route: page.route ?? page.path ?? page.url ?? "",
    sortOrder: Number(
      page.sortOrder ??
        page.displayOrder ??
        page.sequence ??
        page.order ??
        page.position ??
        0,
    ),
  };
};

const wouldCreateCycle = (node, parent, nodeMap) => {
  const seen = new Set([String(node.id)]);
  let current = parent;

  while (current) {
    const currentId = String(current.id);

    if (seen.has(currentId)) {
      return true;
    }

    seen.add(currentId);
    current = current.parentPageId
      ? nodeMap.get(String(current.parentPageId))
      : null;
  }

  return false;
};

const sortPages = (pages) => {
  return [...pages].sort((first, second) => {
    if (first.sortOrder !== second.sortOrder) {
      return first.sortOrder - second.sortOrder;
    }

    return first.displayName.localeCompare(second.displayName);
  });
};

const buildPageHierarchy = (pageRecords) => {
  const nodeMap = new Map();

  pageRecords.filter(Boolean).forEach((page) => {
    nodeMap.set(String(page.id), { ...page, children: [] });
  });

  const rootPages = [];

  nodeMap.forEach((page) => {
    const parent = page.parentPageId
      ? nodeMap.get(String(page.parentPageId))
      : null;

    if (parent && !wouldCreateCycle(page, parent, nodeMap)) {
      parent.children.push(page);
    } else {
      rootPages.push(page);
    }
  });

  const flattenTree = (nodes, ancestors = []) => {
    return sortPages(nodes).flatMap((page) => {
      const path = [...ancestors, page.displayName];

      return [
        {
          ...page,
          depth: ancestors.length,
          hierarchyPath: path.join(" / "),
        },
        ...flattenTree(page.children, path),
      ];
    });
  };

  return flattenTree(rootPages);
};

const normalizeBoolean = (value) => {
  if (typeof value === "string") {
    return ["true", "1", "yes", "enabled"].includes(value.toLowerCase());
  }

  return value === true || value === 1;
};

const normalizePermission = (permission) => {
  const pageId =
    permission?.pageId ??
    permission?.pageID ??
    permission?.page?.id ??
    permission?.page?.pageId ??
    permission?.page?.pageID ??
    permission?.page?._id ??
    permission?.id;

  if (pageId === null || pageId === undefined) {
    return null;
  }

  return permissionColumns.reduce(
    (normalized, column) => ({
      ...normalized,
      [column.key]: normalizeBoolean(permission[column.key]),
    }),
    { pageId },
  );
};

const buildPermissionMatrix = (pages, permissions) => {
  const permissionMap = new Map(
    permissions
      .map(normalizePermission)
      .filter(Boolean)
      .map((permission) => [String(permission.pageId), permission]),
  );

  return Object.fromEntries(
    pages.map((page) => {
      const assignedPermission = permissionMap.get(String(page.id));
      const row = permissionColumns.reduce(
        (permissionRow, column) => ({
          ...permissionRow,
          [column.key]: Boolean(assignedPermission?.[column.key]),
        }),
        { pageId: page.id },
      );

      return [String(page.id), row];
    }),
  );
};

const Permissions = () => {
  const [roles, setRoles] = useState([]);
  const [pages, setPages] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [matrix, setMatrix] = useState({});
  const [isRolesLoading, setIsRolesLoading] = useState(true);
  const [isPagesLoading, setIsPagesLoading] = useState(true);
  const [isPermissionsLoading, setIsPermissionsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [rolesError, setRolesError] = useState(null);
  const [pagesError, setPagesError] = useState(null);
  const [permissionsError, setPermissionsError] = useState(null);
  const permissionRequestId = useRef(0);

  const loadRoles = useCallback(async () => {
    setIsRolesLoading(true);
    setRolesError(null);

    try {
      const response = await roleService.getRoles({ pageSize: 500 });
      const roleMap = new Map();

      extractCollection(response.data)
        .map(normalizeRole)
        .filter(Boolean)
        .forEach((role) => roleMap.set(String(role.id), role));

      setRoles(Array.from(roleMap.values()));
    } catch (error) {
      setRoles([]);
      setRolesError(getErrorMessage(error, "Unable to load roles."));
    } finally {
      setIsRolesLoading(false);
    }
  }, []);

  const loadPages = useCallback(async () => {
    setIsPagesLoading(true);
    setPagesError(null);

    try {
      const response = await pageService.getPages({ pageSize: 500 });
      const normalizedPages = flattenPageRecords(extractCollection(response.data))
        .map(normalizePage)
        .filter(Boolean);

      setPages(buildPageHierarchy(normalizedPages));
    } catch (error) {
      setPages([]);
      setPagesError(getErrorMessage(error, "Unable to load pages."));
    } finally {
      setIsPagesLoading(false);
    }
  }, []);

  const loadRolePermissions = useCallback(async () => {
    if (!selectedRoleId || pages.length === 0) {
      return;
    }

    const requestId = ++permissionRequestId.current;

    setIsPermissionsLoading(true);
    setPermissionsError(null);
    setMatrix(buildPermissionMatrix(pages, []));
    setIsDirty(false);

    try {
      const response =
        await permissionService.getRolePermissions(selectedRoleId);
      const permissions = extractCollection(response.data);

      if (requestId === permissionRequestId.current) {
        setMatrix(buildPermissionMatrix(pages, permissions));
      }
    } catch (error) {
      if (requestId === permissionRequestId.current) {
        setPermissionsError(
          getErrorMessage(error, "Unable to load permissions for this role."),
        );
      }
    } finally {
      if (requestId === permissionRequestId.current) {
        setIsPermissionsLoading(false);
      }
    }
  }, [pages, selectedRoleId]);

  useEffect(() => {
    void Promise.resolve().then(loadRoles);
  }, [loadRoles]);

  useEffect(() => {
    void Promise.resolve().then(loadPages);
  }, [loadPages]);

  useEffect(() => {
    if (!selectedRoleId) {
      return undefined;
    }

    void Promise.resolve().then(loadRolePermissions);
  }, [loadRolePermissions, selectedRoleId]);

  const selectRole = useCallback((roleId) => {
    permissionRequestId.current += 1;
    setSelectedRoleId(roleId);
    setMatrix(roleId ? buildPermissionMatrix(pages, []) : {});
    setPermissionsError(null);
    setIsPermissionsLoading(Boolean(roleId && pages.length > 0));
    setIsDirty(false);
  }, [pages]);

  const isColumnSelected = useCallback((columnKey) => {
    return (
      pages.length > 0 &&
      pages.every((page) => Boolean(matrix[String(page.id)]?.[columnKey]))
    );
  }, [matrix, pages]);

  const isAllSelected = useMemo(() => {
    return (
      pages.length > 0 &&
      pages.every((page) =>
        permissionColumns.every((column) => {
          return Boolean(matrix[String(page.id)]?.[column.key]);
        }),
      )
    );
  }, [matrix, pages]);

  const enabledCount = useMemo(() => {
    return pages.reduce((count, page) => {
      const row = matrix[String(page.id)];

      return (
        count +
        permissionColumns.filter((column) => Boolean(row?.[column.key])).length
      );
    }, 0);
  }, [matrix, pages]);

  const totalCount = pages.length * permissionColumns.length;

  const updateMatrix = useCallback((updater) => {
    setMatrix((current) => updater(current));
    setIsDirty(true);
  }, []);

  const toggleCell = useCallback((pageId, columnKey, checked) => {
    updateMatrix((current) => ({
      ...current,
      [String(pageId)]: {
        ...current[String(pageId)],
        pageId,
        [columnKey]: checked,
      },
    }));
  }, [updateMatrix]);

  const toggleColumn = useCallback((columnKey) => {
    const nextValue = !isColumnSelected(columnKey);

    updateMatrix((current) => {
      return Object.fromEntries(
        pages.map((page) => [
          String(page.id),
          {
            ...current[String(page.id)],
            pageId: page.id,
            [columnKey]: nextValue,
          },
        ]),
      );
    });
  }, [isColumnSelected, pages, updateMatrix]);

  const toggleAll = useCallback(() => {
    const nextValue = !isAllSelected;

    updateMatrix((current) => {
      return Object.fromEntries(
        pages.map((page) => {
          const row = permissionColumns.reduce(
            (nextRow, column) => ({
              ...nextRow,
              [column.key]: nextValue,
            }),
            {
              ...current[String(page.id)],
              pageId: page.id,
            },
          );

          return [String(page.id), row];
        }),
      );
    });
  }, [isAllSelected, pages, updateMatrix]);

  const savePermissions = useCallback(async () => {
    if (!selectedRoleId) {
      return;
    }

    setIsSaving(true);

    try {
      const permissions = pages.map((page) => {
        const row = matrix[String(page.id)] ?? {};

        return permissionColumns.reduce(
          (payload, column) => ({
            ...payload,
            [column.key]: Boolean(row[column.key]),
          }),
          { pageId: page.id },
        );
      });

      await permissionService.updateRolePermissions(
        selectedRoleId,
        permissions,
      );
      setIsDirty(false);
      toast.success("Permissions updated successfully");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update permissions."));
    } finally {
      setIsSaving(false);
    }
  }, [matrix, pages, selectedRoleId]);

  const matrixError = pagesError ?? permissionsError;
  const matrixLoading =
    Boolean(selectedRoleId) && (isPagesLoading || isPermissionsLoading);
  const saveDisabled =
    !selectedRoleId ||
    !isDirty ||
    isSaving ||
    matrixLoading ||
    Boolean(matrixError) ||
    pages.length === 0;

  return (
    <section className="min-w-0 space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand ring-1 ring-inset ring-brand/10">
            <ShieldCheck className="h-3.5 w-3.5" />
            RBAC / Permission Management
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
            Permissions
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Manage role based access control.
          </p>
        </div>

        <AppTooltip label="Save Permissions">
          <button
            type="button"
            onClick={savePermissions}
            disabled={saveDisabled}
            aria-label="Save Permissions"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98] sm:w-auto"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Permissions"}
          </button>
        </AppTooltip>
      </div>

      <RoleSelector
        error={rolesError}
        isDisabled={isSaving}
        isLoading={isRolesLoading}
        roles={roles}
        selectedRoleId={selectedRoleId}
        onChange={selectRole}
        onRetry={loadRoles}
      />

      <PermissionsTable
        enabledCount={enabledCount}
        errorMessage={matrixError}
        isAllSelected={isAllSelected}
        isColumnSelected={isColumnSelected}
        isDisabled={isSaving}
        isLoading={matrixLoading}
        matrix={matrix}
        onRetry={pagesError ? loadPages : loadRolePermissions}
        onToggleAll={toggleAll}
        onToggleCell={toggleCell}
        onToggleColumn={toggleColumn}
        pages={pages}
        selectedRoleId={selectedRoleId}
        totalCount={totalCount}
      />
    </section>
  );
};

export default Permissions;
