import { FolderKanban, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import PageHeader from "../../../components/common/PageHeader";
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
      active: categoriesState.list.filter((category) => category.isActive)
        .length,
      inactive: categoriesState.list.filter((category) => !category.isActive)
        .length,
      total: categoriesState.totalCount,
    }),
    [categoriesState.list, categoriesState.totalCount],
  );

  const closeModal = useCallback(() => {
    setModal((current) => ({ ...current, isOpen: false }));
  }, []);

  const openCreate = useCallback(() => {
    setModal({
      entity: null,
      isLoading: false,
      isOpen: true,
      mode: "create",
    });
  }, []);

  const openEntity = useCallback(
    async (mode, category) => {
      setModal({ entity: category, isLoading: true, isOpen: true, mode });

      try {
        const response = await dispatch(
          fetchCategoryById(category.id),
        ).unwrap();
        setModal({
          entity: response.data?.category ?? response.data,
          isLoading: false,
          isOpen: true,
          mode,
        });
      } catch (error) {
        toast.error(
          getActionError(error, "Unable to load category details."),
        );
        setModal((current) => ({ ...current, isLoading: false }));
      }
    },
    [dispatch],
  );

  const submitCategory = useCallback(
    async (payload) => {
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
        toast.error(getActionError(error, "Unable to save category."));
        throw error;
      }
    },
    [closeModal, dispatch, loadCategories, modal.entity, modal.mode],
  );

  const confirmDelete = useCallback(async () => {
    if (!confirmation.entity) {
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
  }, [confirmation.entity, dispatch, loadCategories]);

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
            <AppButton
              className="h-10"
              disabled={!capabilities.canCreate}
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              Add Category
            </AppButton>
          </>
        }
      />

      <CategoryStats {...stats} />
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
        onCreate={openCreate}
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
        title="Delete Category?"
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
