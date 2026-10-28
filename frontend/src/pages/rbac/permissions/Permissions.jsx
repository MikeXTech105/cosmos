import {
  CheckCircle2,
  CircleAlert,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppSelect from "../../../components/common/AppSelect";
import AppTooltip from "../../../components/common/AppTooltip";
import PageHeader from "../../../components/common/PageHeader";
import useCapabilities from "../../../hooks/useCapabilities";
import useUnsavedChanges from "../../../hooks/useUnsavedChanges";
import useScopedDraft from "../../../hooks/useScopedDraft";
import { pageService } from "../../../services/rbac/pageService";
import { permissionService } from "../../../services/rbac/permissionService";
import { roleService } from "../../../services/rbac/roleService";
import { getApiErrorMessage } from "../../../utils/apiError";
import { isSuperAdminAuth } from "../../../utils/permissionResolver";
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
  return getApiErrorMessage(error, fallback);
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

const buildPermissionMatrix = (pages, permissions, grantAll = false) => {
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
          [column.key]: grantAll || Boolean(assignedPermission?.[column.key]),
        }),
        { pageId: page.id },
      );

      return [String(page.id), row];
    }),
  );
};

const Permissions = () => {
  const [searchParams] = useSearchParams();
  const capabilities = useCapabilities({
    actions: ["view", "update"],
    label: "Permissions",
    pageName: "Permissions",
    resource: "permissions",
    route: "/permissions",
  });
  const [roles, setRoles] = useState([]);
  const [pages, setPages] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(() => searchParams.get("roleId") || "");
  const [templateRoleId, setTemplateRoleId] = useState("");
  const [templateLoading, setTemplateLoading] = useState(false);
  const [matrix, setMatrix] = useState({});
  const [isRolesLoading, setIsRolesLoading] = useState(true);
  const [isPagesLoading, setIsPagesLoading] = useState(true);
  const [isPermissionsLoading, setIsPermissionsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { confirmLeave } = useUnsavedChanges({ when: isDirty || isSaving, message: "This role has unsaved permission changes. Save or keep a draft before switching. Continue without applying them?" });
  const draft = useScopedDraft({ entity: "role-permissions", context: selectedRoleId || "none", values: matrix, enabled: isDirty });
  const [rolesError, setRolesError] = useState(null);
  const [pagesError, setPagesError] = useState(null);
  const [permissionsError, setPermissionsError] = useState(null);
  const permissionRequestId = useRef(0);
  const selectedRole = useMemo(() => {
    return roles.find((role) => String(role.id) === String(selectedRoleId));
  }, [roles, selectedRoleId]);
  const isSelectedRoleSuperAdmin = useMemo(
    () => isSuperAdminAuth({ roles: selectedRole ? [selectedRole] : [] }),
    [selectedRole],
  );

  const loadRoles = useCallback(async () => {
    setIsRolesLoading(true);
    setRolesError(null);

    try {
      const response = await roleService.getRoles();
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
      const response = await pageService.getPages();
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
        setMatrix(
          buildPermissionMatrix(pages, permissions, isSelectedRoleSuperAdmin),
        );
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
  }, [isSelectedRoleSuperAdmin, pages, selectedRoleId]);

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
    if (isSaving) return;
    confirmLeave(() => {
    if (isDirty) draft.saveDraft();
    permissionRequestId.current += 1;
    setSelectedRoleId(roleId);
    setMatrix(roleId ? buildPermissionMatrix(pages, []) : {});
    setPermissionsError(null);
    setIsPermissionsLoading(Boolean(roleId && pages.length > 0));
    setIsDirty(false);
    });
  }, [confirmLeave, draft, isDirty, isSaving, pages]);

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
    if (!capabilities.canUpdate) {
      toast.error("You don't have permission to update role permissions.");
      return;
    }

    setMatrix((current) => updater(current));
    setIsDirty(true);
  }, [capabilities.canUpdate]);

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
    if (!capabilities.canUpdate) {
      toast.error("You don't have permission to update role permissions.");
      return;
    }

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
      draft.clearDraft();
      toast.success("Permissions updated successfully");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update permissions."));
    } finally {
      setIsSaving(false);
    }
  }, [capabilities.canUpdate, draft, matrix, pages, selectedRoleId]);

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
  const changeState = !selectedRoleId
    ? {
        className: "border-slate-200 bg-slate-50 text-slate-500",
        icon: ShieldCheck,
        label: "No role selected",
      }
    : matrixLoading
      ? {
          className: "border-brand/15 bg-brand-light text-brand",
          icon: RefreshCw,
          iconClassName: "animate-spin",
          label: "Loading access",
        }
      : isDirty
        ? {
            className: "border-amber-200 bg-amber-50 text-amber-700",
            icon: CircleAlert,
            label: "Unsaved changes",
          }
        : {
            className: "border-emerald-200 bg-emerald-50 text-emerald-700",
            icon: CheckCircle2,
            label: "Changes saved",
          };
  const ChangeStateIcon = changeState.icon;

  return (
    <section className="min-w-0 space-y-5 pb-4">
      {selectedRoleId && capabilities.canUpdate && !isSelectedRoleSuperAdmin && <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold">Use an existing role as a template</h2><p className="text-sm text-slate-500">Copy an existing role into this draft, review every grant below, then Save. User assignments and the source role stay unchanged.</p><div className="flex flex-wrap items-end gap-3"><AppSelect label="Template role" className="min-w-64" options={roles.filter((role) => String(role.id) !== String(selectedRoleId) && !isSuperAdminAuth({ roles: [role] })).map((role) => ({ value: role.id, label: role.name }))} value={templateRoleId} onChange={setTemplateRoleId} /><AppButton variant="secondary" disabled={!templateRoleId || isSaving || isPermissionsLoading} isLoading={templateLoading} onClick={async () => { if (!confirmLeave(() => {})) return; const templateRequest = permissionRequestId.current; setTemplateLoading(true); try { const response = await permissionService.getRolePermissions(templateRoleId); if (templateRequest !== permissionRequestId.current) return; setMatrix(buildPermissionMatrix(pages, extractCollection(response.data))); setIsDirty(true); } catch (error) { toast.error(getErrorMessage(error, "Unable to load template permissions.")); } finally { setTemplateLoading(false); } }}>Copy for review</AppButton></div></div>}
      {selectedRoleId && !isPermissionsLoading && <details className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-semibold">Access preview for {selectedRole?.name || "selected role"}{isDirty ? " — unsaved draft" : ""}</summary><p className="mt-2 text-sm text-slate-500">These are this role's grants. The server checks each action; users with multiple roles may have additional access.</p><ul className="mt-3 max-h-72 space-y-2 overflow-auto text-sm">{pages.map((page) => { const grants = permissionColumns.filter((column) => matrix[String(page.id)]?.[column.key]).map((column) => column.label); return grants.length ? <li key={String(page.id)}><strong>{page.displayName || page.name}</strong>: {grants.join(", ")}</li> : null; })}</ul></details>}
      {draft.recoveredDraft && selectedRoleId && !isDirty && !isPermissionsLoading && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><p>A saved draft is available for this role. Permissions apply only after Save.</p><button type="button" className="mr-4 font-semibold underline" disabled={draft.stale || !capabilities.canUpdate || isSelectedRoleSuperAdmin} onClick={() => { setMatrix(draft.recoveredDraft.values); draft.acknowledgeRecovery(); setIsDirty(true); }}>Restore for review</button><button type="button" className="underline" onClick={draft.clearDraft}>Discard draft</button></div>}
      <PageHeader
        badge={
          <>
            <ShieldCheck className="h-3.5 w-3.5" />
            RBAC / Permissions
          </>
        }
        title="Permissions"
        description="Manage role-based access across application pages and actions."
        actions={
          <>
            <div
              role="status"
              aria-live="polite"
              className={[
                "inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold",
                changeState.className,
              ].join(" ")}
            >
              <ChangeStateIcon
                className={["h-4 w-4", changeState.iconClassName ?? ""].join(" ")}
              />
              {changeState.label}
            </div>

            {capabilities.canUpdate && (
              <AppTooltip label="Save Permissions">
                <AppButton
                  aria-label="Save Permissions"
                  className="h-10 w-full px-4 sm:w-auto"
                  disabled={saveDisabled}
                  isLoading={isSaving}
                  loadingText="Saving..."
                  onClick={savePermissions}
                >
                  <Save className="h-4 w-4" />
                  Save changes
                </AppButton>
              </AppTooltip>
            )}
          </>
        }
      />

      <RoleSelector
        error={rolesError}
        isDisabled={isSaving || !capabilities.canUpdate}
        isLoading={isRolesLoading}
        roles={roles}
        selectedRoleId={selectedRoleId}
        onChange={selectRole}
        onRetry={loadRoles}
      />

      <PermissionsTable
        key={selectedRoleId || "no-role"}
        enabledCount={enabledCount}
        errorMessage={matrixError}
        isAllSelected={isAllSelected}
        isColumnSelected={isColumnSelected}
        isDisabled={
          isSaving || !capabilities.canUpdate || isSelectedRoleSuperAdmin
        }
        isLoading={matrixLoading}
        matrix={matrix}
        onRetry={pagesError ? loadPages : loadRolePermissions}
        onToggleAll={toggleAll}
        onToggleCell={toggleCell}
        onToggleColumn={toggleColumn}
        pages={pages}
        selectedRoleId={selectedRoleId}
        selectedRoleName={selectedRole?.name}
        isSuperAdmin={isSelectedRoleSuperAdmin}
        totalCount={totalCount}
      />
    </section>
  );
};

export default Permissions;
