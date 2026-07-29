import { FolderKanban, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import PageHeader from "../../../components/common/PageHeader";
import useLatestRequest from "../../../hooks/useLatestRequest";
import { getApiStatus } from "../../../utils/apiError";
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  fetchCategoryById,
  setCategoryFilters,
  setCategoryPage,
  setCategoryPageSize,
  updateCategory,
} from "../../../store/slices/inventory/categorySlice";
import { InventoryConfirmDialog } from "../InventoryShared";
import {
  buildInventoryQueryParams,
  getActionError,
  getSuccessMessage,
} from "../inventoryHelpers";
import useInventoryCapabilities from "../useInventoryCapabilities";
import CategoryFilters from "./CategoryFilters";
import CategoryFormModal from "./CategoryFormModal";
import CategoryStats from "./CategoryStats";
import CategoryTable from "./CategoryTable";

const CategoriesPage = () => {
  const dispatch = useDispatch();
  const categoriesState = useSelector((state) => state.categories);
  const capabilities = useInventoryCapabilities({
    label: "Categories",
    resource: "categories",
    route: "/categories",
  });
  const [searchInput, setSearchInput] = useState(
    categoriesState.filters.Search,
  );
  const [modal, setModal] = useState({
    entity: null,
    isLoading: false,
    isOpen: false,
    mode: "create",
  });
  const detailPromiseRef = useRef(null);
  const {
    beginRequest: beginDetailRequest,
    cancelAllRequests: cancelDetailRequests,
    isLatestRequest: isLatestDetailRequest,
  } = useLatestRequest();
  const [confirmation, setConfirmation] = useState({
    entity: null,
    isLoading: false,
    isOpen: false,
  });

  const queryParams = useMemo(
    () =>
      buildInventoryQueryParams({
        filters: categoriesState.filters,
        pageNumber: categoriesState.pageNumber,
        pageSize: categoriesState.pageSize,
      }),
    [
      categoriesState.filters,
      categoriesState.pageNumber,
      categoriesState.pageSize,
    ],
  );

  const loadCategories = useCallback(() => {
    return dispatch(fetchCategories(queryParams));
  }, [dispatch, queryParams]);

  useEffect(() => {
    void Promise.resolve().then(loadCategories);
  }, [loadCategories]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      dispatch(setCategoryFilters({ Search: searchInput }));
      dispatch(setCategoryPage(1));
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [dispatch, searchInput]);

  const stats = useMemo(
    () => ({
      active:
        categoriesState.summary?.activeCount ??
        categoriesState.list.filter((category) => category.isActive).length,
      inactive:
        categoriesState.summary?.inactiveCount ??
        categoriesState.list.filter((category) => !category.isActive).length,
      total: categoriesState.summary?.totalCount ?? categoriesState.totalCount,
      metricScope: categoriesState.summaryScope,
      totalScope: "all-matching",
    }),
    [categoriesState.list, categoriesState.summary, categoriesState.summaryScope, categoriesState.totalCount],
  );

  const closeModal = useCallback(() => {
    cancelDetailRequests();
    detailPromiseRef.current?.abort?.();
    detailPromiseRef.current = null;
    setModal((current) => ({ ...current, isOpen: false }));
  }, [cancelDetailRequests]);

  const openCreate = useCallback(() => {
    if (!capabilities.canCreate) {
      return;
    }

    cancelDetailRequests();
    detailPromiseRef.current?.abort?.();
    detailPromiseRef.current = null;
    setModal({
      entity: null,
      isLoading: false,
      isOpen: true,
      mode: "create",
    });
  }, [cancelDetailRequests, capabilities.canCreate]);

  const openEntity = useCallback(
    async (mode, category) => {
      const isAllowed =
        mode === "edit" ? capabilities.canUpdate : capabilities.canView;

      if (!isAllowed) {
        return;
      }

      setModal({ entity: category, isLoading: true, isOpen: true, mode });
      detailPromiseRef.current?.abort?.();
      const requestId = beginDetailRequest();
      const detailPromise = dispatch(fetchCategoryById(category.id));
      detailPromiseRef.current = detailPromise;

      try {
        const response = await detailPromise.unwrap();
        if (!isLatestDetailRequest(requestId)) return;
        setModal({
          entity: response.data?.category ?? response.data,
          isLoading: false,
          isOpen: true,
          mode,
        });
      } catch (error) {
        if (!isLatestDetailRequest(requestId)) return;
        if (getApiStatus(error) === 404) {
          toast.error("This category no longer exists. The list was refreshed.");
          closeModal();
          await loadCategories();
          return;
        }
        toast.error(
          getActionError(error, "Unable to load category details."),
        );
        setModal((current) =>
          current.isOpen &&
          current.mode === mode &&
          String(current.entity?.id) === String(category.id)
            ? { ...current, isLoading: false }
            : current,
        );
      } finally {
        if (detailPromiseRef.current === detailPromise) {
          detailPromiseRef.current = null;
        }
      }
    },
    [
      beginDetailRequest,
      capabilities.canUpdate,
      capabilities.canView,
      closeModal,
      dispatch,
      isLatestDetailRequest,
      loadCategories,
    ],
  );

  const submitCategory = useCallback(
    async (payload) => {
      const isAllowed =
        modal.mode === "edit"
          ? capabilities.canUpdate
          : capabilities.canCreate;

      if (!isAllowed) {
        return;
      }

      try {
        const response =
          modal.mode === "edit"
            ? await dispatch(
                updateCategory({ id: modal.entity.id, payload }),
              ).unwrap()
            : await dispatch(createCategory(payload)).unwrap();

        toast.success(
          getSuccessMessage(
            response,
            modal.mode === "edit"
              ? "Category updated successfully"
              : "Category created successfully",
          ),
        );
        closeModal();
        await loadCategories();
      } catch (error) {
        if (modal.mode === "edit" && getApiStatus(error) === 404) {
          toast.error("This category no longer exists. The list was refreshed.");
          closeModal();
          await loadCategories();
          return;
        }
        toast.error(getActionError(error, "Unable to save category."));
        throw error;
      }
    },
    [
      capabilities.canCreate,
      capabilities.canUpdate,
      closeModal,
      dispatch,
      loadCategories,
      modal.entity,
      modal.mode,
    ],
  );

  const confirmDelete = useCallback(async () => {
    if (!capabilities.canDelete || !confirmation.entity) {
      return;
    }

    setConfirmation((current) => ({ ...current, isLoading: true }));

    try {
      const result = await dispatch(
        deleteCategory(confirmation.entity.id),
      ).unwrap();
      toast.success(
        getSuccessMessage(result.response, "Category deleted successfully"),
      );
      setConfirmation({ entity: null, isLoading: false, isOpen: false });
      await loadCategories();
    } catch (error) {
      toast.error(getActionError(error, "Unable to delete category."));
      setConfirmation((current) => ({ ...current, isLoading: false }));
    }
  }, [
    capabilities.canDelete,
    confirmation.entity,
    dispatch,
    loadCategories,
  ]);

  const filterControls = {
    ...categoriesState.filters,
    Search: searchInput,
  };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <FolderKanban className="h-3.5 w-3.5" />
            Inventory / Category Master
          </>
        }
        title="Categories"
        description="Organize products and services into clear inventory groups."
        actions={
          <>
            <AppButton
              variant="secondary"
              className="h-10"
              disabled={categoriesState.loading}
              onClick={loadCategories}
            >
              <RefreshCw
                className={`h-4 w-4 ${categoriesState.loading ? "animate-spin" : ""}`}
              />
              Refresh
            </AppButton>
            {capabilities.canCreate && (
              <AppButton className="h-10" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add Category
              </AppButton>
            )}
          </>
        }
      />

      <CategoryStats {...stats} loading={categoriesState.loading} />
      <CategoryFilters
        filters={filterControls}
        resultCount={categoriesState.list.length}
        onChange={(patch) => {
          if (Object.hasOwn(patch, "Search")) {
            setSearchInput(patch.Search);
          } else {
            dispatch(setCategoryFilters(patch));
            dispatch(setCategoryPage(1));
          }
        }}
        onClear={() => {
          setSearchInput("");
          dispatch(setCategoryFilters({ Search: "", IsActive: "all" }));
          dispatch(setCategoryPage(1));
        }}
      />

      <CategoryTable
        actions={{
          ...capabilities,
          onDelete: (category) =>
            setConfirmation({
              entity: category,
              isLoading: false,
              isOpen: true,
            }),
          onEdit: (category) => openEntity("edit", category),
          onView: (category) => openEntity("view", category),
        }}
        categories={categoriesState.list}
        error={categoriesState.error}
        isLoading={categoriesState.loading}
        onCreate={capabilities.canCreate ? openCreate : undefined}
        onPageChange={(value) => dispatch(setCategoryPage(value))}
        onPageSizeChange={(value) => dispatch(setCategoryPageSize(value))}
        onRetry={loadCategories}
        pageNumber={categoriesState.pageNumber}
        pageSize={categoriesState.pageSize}
        totalCount={categoriesState.totalCount}
        totalPages={categoriesState.totalPages}
      />

      <CategoryFormModal
        category={modal.entity}
        isLoading={modal.isLoading}
        isOpen={modal.isOpen}
        mode={modal.mode}
        onClose={closeModal}
        onSubmit={submitCategory}
      />

      <InventoryConfirmDialog
        isLoading={confirmation.isLoading}
        isOpen={confirmation.isOpen}
        title="Delete 1 category?"
        description={`${confirmation.entity?.name ?? "This category"} will be permanently removed.`}
        onCancel={() =>
          setConfirmation({
            entity: null,
            isLoading: false,
            isOpen: false,
          })
        }
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default CategoriesPage;
