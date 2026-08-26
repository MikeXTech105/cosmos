import { AlertTriangle, FolderTree, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppModal from "../../../components/common/AppModal";
import AppTooltip from "../../../components/common/AppTooltip";
import PageHeader from "../../../components/common/PageHeader";
import useCapabilities from "../../../hooks/useCapabilities";
import useLatestRequest from "../../../hooks/useLatestRequest";
import { getApiStatus } from "../../../utils/apiError";
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
      isBusy={confirmation.isSubmitting}
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
            loadingText="Deleting…"
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
  const detailPromiseRef = useRef(null);
  const {
    beginRequest: beginDetailRequest,
    cancelAllRequests: cancelDetailRequests,
    isLatestRequest: isLatestDetailRequest,
  } = useLatestRequest();

  const capabilities = useCapabilities({
    label: "Pages",
    resource: "pages",
    route: "/rbac/pages",
  });

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
    cancelDetailRequests();
    detailPromiseRef.current?.abort?.();
    detailPromiseRef.current = null;
    setModalState(initialModalState);
  }, [cancelDetailRequests]);

  const openCreateModal = useCallback((initialParentId = "") => {
    if (!capabilities.canCreate) {
      toast.error("You don't have permission to create pages.");
      return;
    }

    cancelDetailRequests();
    detailPromiseRef.current?.abort?.();
    detailPromiseRef.current = null;
    setModalState({
      initialParentId,
      isLoading: false,
      isOpen: true,
      mode: "create",
      page: null,
    });
  }, [cancelDetailRequests, capabilities.canCreate]);

  const openPageModal = useCallback(async (mode, page) => {
    const allowed = mode === "edit" ? capabilities.canUpdate : capabilities.canView;

    if (!allowed) {
      toast.error("You don't have permission to open this page record.");
      return;
    }

    setModalState({
      initialParentId: "",
      isLoading: true,
      isOpen: true,
      mode,
      page,
    });
    detailPromiseRef.current?.abort?.();
    const requestId = beginDetailRequest();
    const detailPromise = dispatch(fetchRbacPageById(page.id));
    detailPromiseRef.current = detailPromise;

    try {
      const response = await detailPromise.unwrap();
      if (!isLatestDetailRequest(requestId)) return;
      const latestPage = normalizePage(extractSinglePage(response.data));

      setModalState({
        initialParentId: "",
        isLoading: false,
        isOpen: true,
        mode,
        page: latestPage ?? page,
      });
    } catch (detailError) {
      if (!isLatestDetailRequest(requestId)) return;
      if (getApiStatus(detailError) === 404) {
        toast.error("This page no longer exists. The list was refreshed.");
        closeModal();
        await loadPages();
        return;
      }
      toast.error(
        getPageErrorMessage(detailError, "Unable to load page details."),
      );
      setModalState((current) =>
        current.isOpen &&
        current.mode === mode &&
        String(current.page?.id) === String(page.id)
          ? { ...current, isLoading: false }
          : current,
      );
    } finally {
      if (detailPromiseRef.current === detailPromise) {
        detailPromiseRef.current = null;
      }
    }
  }, [
    beginDetailRequest,
    capabilities.canUpdate,
    capabilities.canView,
    closeModal,
    dispatch,
    isLatestDetailRequest,
    loadPages,
  ]);

  const submitPage = useCallback(async (values) => {
    const allowed =
      modalState.mode === "edit"
        ? capabilities.canUpdate
        : capabilities.canCreate;

    if (!allowed) {
      toast.error("You don't have permission to save this page.");
      return;
    }

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
      if (modalState.mode === "edit" && getApiStatus(submitError) === 404) {
        toast.error("This page no longer exists. The list was refreshed.");
        closeModal();
        await loadPages();
        return;
      }
      toast.error(
        getPageErrorMessage(
          submitError,
          modalState.mode === "edit"
            ? "Unable to update page."
            : "Unable to create page.",
          ),
      );
      throw submitError;
    }
  }, [
    capabilities.canCreate,
    capabilities.canUpdate,
    closeModal,
    dispatch,
    loadPages,
    modalState.mode,
    modalState.page,
  ]);

  const openDeleteConfirmation = useCallback((page) => {
    if (!capabilities.canDelete) {
      toast.error("You don't have permission to delete pages.");
      return;
    }

    setConfirmation({
      isOpen: true,
      isSubmitting: false,
      page,
    });
  }, [capabilities.canDelete]);

  const closeConfirmation = useCallback(() => {
    setConfirmation(initialConfirmationState);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!confirmation.page) {
      return;
    }

    if (!capabilities.canDelete) {
      toast.error("You don't have permission to delete pages.");
      closeConfirmation();
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
  }, [capabilities.canDelete, closeConfirmation, confirmation.page, dispatch]);

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
            {capabilities.canCreate && (
              <AppTooltip label="Add Page">
                <AppButton
                  className="h-10 w-full px-4 sm:w-auto"
                  onClick={() => openCreateModal()}
                >
                  <Plus className="h-4 w-4" />
                  Add Page
                </AppButton>
              </AppTooltip>
            )}
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
          onCreate={capabilities.canCreate ? () => openCreateModal() : undefined}
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
          onCreate={capabilities.canCreate ? () => openCreateModal() : undefined}
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
