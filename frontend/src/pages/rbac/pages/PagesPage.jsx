import { AlertTriangle, FolderTree, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppModal from "../../../components/common/AppModal";
import AppTooltip from "../../../components/common/AppTooltip";
import PageHeader from "../../../components/common/PageHeader";
import {
  findPermissionPage,
  isSuperAdminAuth,
} from "../../../hooks/usePermission";
import {
  clearRbacPageFilters,
  createRbacPage,
  deleteRbacPage,
  fetchRbacPageById,
  fetchRbacPages,
  setRbacPageFilters,
  setRbacPageGroupsExpanded,
  setRbacPageTreeExpanded,
  setRbacPageViewMode,
  toggleRbacPageGroup,
  toggleRbacPageTreeNode,
  updateRbacPage,
} from "../../../store/slices/rbac/pageSlice";
import PageFilters from "./PageFilters";
import PageFormModal from "./PageFormModal";
import PageStats from "./PageStats";
import PageTable from "./PageTable";
import PageTree from "./PageTree";
import {
  extractSinglePage,
  filterPages,
  getDescendantIds,
  getPageErrorMessage,
  getTopLevelCount,
  normalizePage,
  toCreatePagePayload,
  toUpdatePagePayload,
} from "./pageHelpers";

const PAGE_PERMISSION_CODES = {
  create: "pages.create",
  delete: "pages.delete",
  update: "pages.update",
  view: "pages.view",
};

const initialModalState = {
  initialParentId: "",
  isLoading: false,
  isOpen: false,
  mode: "create",
  page: null,
};

const initialConfirmationState = {
  isOpen: false,
  isSubmitting: false,
  page: null,
};

const getPermissionValues = (page) => {
  if (Array.isArray(page?.permissions)) {
    return page.permissions.map(String);
  }

  return [];
};

const hasBooleanPermission = (page, key) => {
  return page?.[key] === true || page?.permissions?.[key] === true;
};

const buildCapabilities = ({ authPages, roles, user }) => {
  if (isSuperAdminAuth({ roles, user })) {
    return {
      canCreate: true,
      canDelete: true,
      canUpdate: true,
      canView: true,
    };
  }

  if (authPages.length === 0) {
    return {
      canCreate: true,
      canDelete: true,
      canUpdate: true,
      canView: true,
    };
  }

  const pagesPermission = findPermissionPage(authPages, {
    label: "Pages",
    route: "/rbac/pages",
  });
  const permissionSet = new Set([
    ...authPages.flatMap(getPermissionValues),
    ...getPermissionValues(pagesPermission),
  ]);

  return {
    canCreate:
      hasBooleanPermission(pagesPermission, "canCreate") ||
      permissionSet.has(PAGE_PERMISSION_CODES.create),
    canDelete:
      hasBooleanPermission(pagesPermission, "canDelete") ||
      permissionSet.has(PAGE_PERMISSION_CODES.delete),
    canUpdate:
      hasBooleanPermission(pagesPermission, "canUpdate") ||
      permissionSet.has(PAGE_PERMISSION_CODES.update),
    canView:
      hasBooleanPermission(pagesPermission, "canView") ||
      permissionSet.has(PAGE_PERMISSION_CODES.view),
  };
};

const DeleteConfirmDialog = ({
  childCount,
  confirmation,
  onCancel,
  onConfirm,
}) => {
  const displayName =
    confirmation.page?.displayName ?? confirmation.page?.name ?? "this page";

  return (
    <AppModal
      isOpen={confirmation.isOpen}
      maxWidth="max-w-md"
      onClose={confirmation.isSubmitting ? undefined : onCancel}
      title="Delete Page?"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            {childCount > 0 ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <Trash2 className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-sm leading-6 text-slate-600">
              This will delete{" "}
              <span className="font-semibold text-slate-950">{displayName}</span>.
              {childCount > 0
                ? ` It currently has ${childCount} descendant page${
                    childCount === 1 ? "" : "s"
                  }; the backend may require reassignment first.`
                : " This action cannot be undone."}
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AppButton
            disabled={confirmation.isSubmitting}
            onClick={onCancel}
            variant="secondary"
          >
            Cancel
          </AppButton>
          <AppButton
            className="bg-red-600 hover:bg-red-700"
            isLoading={confirmation.isSubmitting}
            onClick={onConfirm}
          >
            Delete
          </AppButton>
        </div>
      </div>
    </AppModal>
  );
};

const PagesPage = () => {
  const dispatch = useDispatch();
  const { pages: authPages, roles, user } = useSelector((state) => state.auth);
  const {
    error,
    expandedGroupIds,
    expandedTreeIds,
    filters,
    list,
    loading,
    viewMode,
  } = useSelector((state) => state.rbacPages);
  const [modalState, setModalState] = useState(initialModalState);
  const [confirmation, setConfirmation] = useState(initialConfirmationState);

  const capabilities = useMemo(
    () => buildCapabilities({ authPages: authPages ?? [], roles, user }),
    [authPages, roles, user],
  );

  const loadPages = useCallback(async () => {
    try {
      await dispatch(fetchRbacPages()).unwrap();
    } catch (loadError) {
      toast.error(getPageErrorMessage(loadError, "Unable to load pages."));
    }
  }, [dispatch]);

  useEffect(() => {
    void dispatch(fetchRbacPages());
  }, [dispatch]);

  const filteredPages = useMemo(
    () => filterPages(list, filters),
    [filters, list],
  );
  const parentLookup = useMemo(() => {
    return new Map(list.map((page) => [String(page.id), page]));
  }, [list]);
  const stats = useMemo(
    () => ({
      active: list.filter((page) => page.isActive).length,
      inactive: list.filter((page) => !page.isActive).length,
      topLevel: getTopLevelCount(list),
      total: list.length,
    }),
    [list],
  );
  const childCount = useMemo(() => {
    return confirmation.page
      ? getDescendantIds(list, confirmation.page.id).size
      : 0;
  }, [confirmation.page, list]);

  const closeModal = useCallback(() => {
    setModalState(initialModalState);
  }, []);

  const openCreateModal = useCallback((initialParentId = "") => {
    if (!capabilities.canCreate) {
      toast.error("You don't have permission to create pages.");
      return;
    }

    setModalState({
      initialParentId,
      isLoading: false,
      isOpen: true,
      mode: "create",
      page: null,
    });
  }, [capabilities.canCreate]);

  const openPageModal = useCallback(async (mode, page) => {
    setModalState({
      initialParentId: "",
      isLoading: true,
      isOpen: true,
      mode,
      page,
    });

    try {
      const response = await dispatch(fetchRbacPageById(page.id)).unwrap();
      const latestPage = normalizePage(extractSinglePage(response.data));

      setModalState({
        initialParentId: "",
        isLoading: false,
        isOpen: true,
        mode,
        page: latestPage ?? page,
      });
    } catch (detailError) {
      toast.error(
        getPageErrorMessage(detailError, "Unable to load page details."),
      );
      setModalState((current) => ({
        ...current,
        isLoading: false,
      }));
    }
  }, [dispatch]);

  const submitPage = useCallback(async (values) => {
    try {
      if (modalState.mode === "edit") {
        await dispatch(
          updateRbacPage({
            id: modalState.page.id,
            payload: toUpdatePagePayload(values),
          }),
        ).unwrap();
        toast.success("Page updated successfully");
      } else {
        await dispatch(createRbacPage(toCreatePagePayload(values))).unwrap();
        toast.success("Page created successfully");
      }

      closeModal();
      await dispatch(fetchRbacPages()).unwrap();
    } catch (submitError) {
      toast.error(
        getPageErrorMessage(
          submitError,
          modalState.mode === "edit"
            ? "Unable to update page."
            : "Unable to create page.",
        ),
      );
    }
  }, [closeModal, dispatch, modalState.mode, modalState.page]);

  const openDeleteConfirmation = useCallback((page) => {
    setConfirmation({
      isOpen: true,
      isSubmitting: false,
      page,
    });
  }, []);

  const closeConfirmation = useCallback(() => {
    setConfirmation(initialConfirmationState);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!confirmation.page) {
      return;
    }

    setConfirmation((current) => ({ ...current, isSubmitting: true }));

    try {
      await dispatch(deleteRbacPage(confirmation.page.id)).unwrap();
      toast.success("Page deleted successfully");
      closeConfirmation();
      await dispatch(fetchRbacPages()).unwrap();
    } catch (deleteError) {
      toast.error(getPageErrorMessage(deleteError, "Unable to delete page."));
      setConfirmation((current) => ({ ...current, isSubmitting: false }));
    }
  }, [closeConfirmation, confirmation.page, dispatch]);

  const updateFilters = useCallback((patch) => {
    dispatch(setRbacPageFilters(patch));
  }, [dispatch]);

  const clearFilters = useCallback(() => {
    dispatch(clearRbacPageFilters());
  }, [dispatch]);

  const actions = useMemo(
    () => ({
      canAddChild: capabilities.canCreate,
      canDelete: capabilities.canDelete,
      canEdit: capabilities.canUpdate,
      canView: capabilities.canView,
      onAddChild: (page) => openCreateModal(String(page.id)),
      onDelete: openDeleteConfirmation,
      onEdit: (page) => openPageModal("edit", page),
      onView: (page) => openPageModal("view", page),
    }),
    [
      capabilities.canCreate,
      capabilities.canDelete,
      capabilities.canUpdate,
      capabilities.canView,
      openCreateModal,
      openDeleteConfirmation,
      openPageModal,
    ],
  );

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <FolderTree className="h-3.5 w-3.5" />
            RBAC / Page Management
          </>
        }
        title="Pages"
        description="Define application screens and navigation hierarchy."
        actions={
          <>
            <AppTooltip label="Refresh Pages">
              <AppButton
                className="h-10 w-full px-3 sm:w-auto"
                disabled={loading}
                onClick={loadPages}
                variant="secondary"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </AppButton>
            </AppTooltip>
            <AppTooltip label="Add Page">
              <AppButton
                className="h-10 w-full px-4 sm:w-auto"
                disabled={!capabilities.canCreate}
                onClick={() => openCreateModal()}
              >
                <Plus className="h-4 w-4" />
                Add Page
              </AppButton>
            </AppTooltip>
          </>
        }
      />

      <PageStats
        active={stats.active}
        inactive={stats.inactive}
        topLevel={stats.topLevel}
        total={stats.total}
      />

      <PageFilters
        filters={filters}
        isParentsLoading={loading}
        onChange={updateFilters}
        onClear={clearFilters}
        onViewModeChange={(nextViewMode) =>
          dispatch(setRbacPageViewMode(nextViewMode))
        }
        parentOptions={list}
        parentsError={error}
        resultCount={filteredPages.length}
        viewMode={viewMode}
      />

      {viewMode === "tree" ? (
        <PageTree
          actions={actions}
          errorMessage={error}
          expandedTreeIds={expandedTreeIds}
          hasError={Boolean(error)}
          isLoading={loading}
          onCreate={() => openCreateModal()}
          onExpandTree={(payload) => dispatch(setRbacPageTreeExpanded(payload))}
          onRetry={loadPages}
          onToggleTreeNode={(id) => dispatch(toggleRbacPageTreeNode(id))}
          pages={filteredPages}
        />
      ) : (
        <PageTable
          actions={actions}
          errorMessage={error}
          expandedGroupIds={expandedGroupIds}
          hasError={Boolean(error)}
          isLoading={loading}
          onCreate={() => openCreateModal()}
          onExpandAllGroups={(payload) =>
            dispatch(setRbacPageGroupsExpanded(payload))
          }
          onRetry={loadPages}
          onToggleGroup={(id) => dispatch(toggleRbacPageGroup(id))}
          pages={filteredPages}
          parentLookup={parentLookup}
        />
      )}

      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing{" "}
          <span className="font-semibold text-slate-900">
            {filteredPages.length}
          </span>{" "}
          of <span className="font-semibold text-slate-900">{list.length}</span>{" "}
          pages
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
          {viewMode === "tree" ? "Tree View" : "Grouped Table"}
        </span>
      </div>

      <PageFormModal
        initialParentId={modalState.initialParentId}
        isLoading={modalState.isLoading}
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        onClose={closeModal}
        onSubmit={submitPage}
        page={modalState.page}
        pages={list}
      />

      <DeleteConfirmDialog
        childCount={childCount}
        confirmation={confirmation}
        onCancel={closeConfirmation}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default PagesPage;
