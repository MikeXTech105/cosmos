import { Package, Plus, RefreshCw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import PageHeader from "../../../components/common/PageHeader";
import useCreatePermission from "../../../hooks/useCreatePermission";
import { categoryService } from "../../../services/inventory/categoryService";
import {
  deleteItem,
  fetchItemById,
  fetchItems,
  setItemFilters,
  setItemPage,
  setItemPageSize,
  setSelectedItem,
} from "../../../store/slices/inventory/itemSlice";
import { InventoryConfirmDialog } from "../InventoryShared";
import {
  buildInventoryQueryParams,
  getActionError,
  getSuccessMessage,
  serializeId,
} from "../inventoryHelpers";
import useInventoryCapabilities from "../useInventoryCapabilities";
import CategoryFormModal from "../categories/CategoryFormModal";
import ItemDetailsPanel from "./ItemDetailsPanel";
import ItemFilters from "./ItemFilters";
import ItemStats from "./ItemStats";
import ItemTable from "./ItemTable";
import { getItemTypeLabel, isLowStock } from "./itemHelpers";

const getLookupList = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  return data?.items ?? [];
};

const ItemsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const itemsState = useSelector((state) => state.items);
  const capabilities = useInventoryCapabilities({
    label: "Items",
    resource: "items",
    route: "/items",
  });
  const canCreateCategory = useCreatePermission({
    label: "Categories",
    resource: "categories",
    route: "/categories",
  });
  const [searchInput, setSearchInput] = useState(itemsState.filters.Search);
  const [lookups, setLookups] = useState({
    categories: [],
    categoriesError: null,
    categoriesLoading: false,
  });
  const lookupCacheRef = useRef({
    categories: { loaded: false, promise: null },
  });
  const [lookupCreateModal, setLookupCreateModal] = useState({
    isOpen: false,
    type: null,
  });
  const [confirmation, setConfirmation] = useState({
    entity: null,
    isLoading: false,
    isOpen: false,
  });

  const queryParams = useMemo(
    () =>
      buildInventoryQueryParams({
        filters: itemsState.filters,
        pageNumber: itemsState.pageNumber,
        pageSize: itemsState.pageSize,
        extra: {
          Barcode: itemsState.filters.Barcode?.trim() || undefined,
          ItemCode: itemsState.filters.ItemCode?.trim() || undefined,
          CategoryId:
            itemsState.filters.CategoryId === "all"
              ? undefined
              : serializeId(itemsState.filters.CategoryId),
          ProcurementClassification:
            itemsState.filters.ProcurementClassification === "all"
              ? undefined
              : serializeId(
                  itemsState.filters.ProcurementClassification,
                ),
        },
      }),
    [itemsState.filters, itemsState.pageNumber, itemsState.pageSize],
  );

  const loadItems = useCallback(() => {
    return dispatch(fetchItems(queryParams));
  }, [dispatch, queryParams]);

  const loadLookup = useCallback((type, { force = false } = {}) => {
    const cache = lookupCacheRef.current[type];

    if (cache.loaded && !force) {
      return Promise.resolve(null);
    }

    if (cache.promise) {
      return cache.promise;
    }

    const loadingKey = "categoriesLoading";
    const errorKey = "categoriesError";
    const request = categoryService.getCategories({
      PageNumber: 1,
      PageSize: 200,
      IsActive: true,
    });

    setLookups((current) => ({
      ...current,
      [loadingKey]: true,
      [errorKey]: null,
    }));

    cache.promise = request
      .then((response) => {
        const items = getLookupList(response).filter((entry) => {
          return (
            entry?.isActive !== false &&
            entry?.id !== null &&
            entry?.id !== undefined &&
            Boolean(String(entry?.name ?? "").trim())
          );
        });

        cache.loaded = true;
        setLookups((current) => ({
          ...current,
          [type]: items,
          [loadingKey]: false,
          [errorKey]: null,
        }));

        return null;
      })
      .catch((error) => {
        const message = getActionError(
          error,
          `Unable to load ${type}.`,
        );

        setLookups((current) => ({
          ...current,
          [loadingKey]: false,
          [errorKey]: message,
        }));

        return message;
      })
      .finally(() => {
        cache.promise = null;
      });

    return cache.promise;
  }, []);

  const loadLookups = useCallback(async () => {
    const error = await loadLookup("categories");

    if (error) {
      toast.error(error);
    }
  }, [loadLookup]);

  useEffect(() => {
    void Promise.resolve().then(loadItems);
  }, [loadItems]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      dispatch(setItemFilters({ Search: searchInput }));
      dispatch(setItemPage(1));
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [dispatch, searchInput]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  const categoryOptions = useMemo(
    () =>
      lookups.categories.map((category) => ({
        value: Number(category.id),
        label: category.name,
      })),
    [lookups.categories],
  );

  const stats = useMemo(
    () => ({
      lowStock:
        itemsState.summary?.lowStockCount ??
        itemsState.list.filter(isLowStock).length,
      products: itemsState.summary?.productCount ?? itemsState.list.filter(
        (item) => getItemTypeLabel(item.itemType) !== "Service",
      ).length,
      services: itemsState.summary?.serviceCount ?? itemsState.list.filter(
        (item) => getItemTypeLabel(item.itemType) === "Service",
      ).length,
      total: itemsState.summary?.totalCount ?? itemsState.totalCount,
      metricScope: itemsState.summaryScope,
      totalScope: "all-matching",
    }),
    [itemsState.list, itemsState.summary, itemsState.summaryScope, itemsState.totalCount],
  );

  const openCreate = useCallback(() => {
    if (!capabilities.canCreate) {
      return;
    }

    navigate("/items/new");
  }, [capabilities.canCreate, navigate]);

  const openLookupCreate = useCallback(
    (type) => {
      if (type === "categories" && canCreateCategory) {
        setLookupCreateModal({ isOpen: true, type });
      }
    },
    [canCreateCategory],
  );

  const closeLookupCreate = useCallback(() => {
    setLookupCreateModal({ isOpen: false, type: null });
  }, []);

  const submitLookupCreate = useCallback(
    async (payload, saveAndNew = false) => {
      if (lookupCreateModal.type !== "categories" || !canCreateCategory) {
        return;
      }

      try {
        await categoryService.createCategory(payload);
        toast.success("Category created successfully");

        lookupCacheRef.current.categories.loaded = false;
        await loadLookup("categories", { force: true });

        if (!saveAndNew) {
          closeLookupCreate();
        }
      } catch (error) {
        toast.error(getActionError(error, "Unable to create category."));
        throw error;
      }
    },
    [canCreateCategory, closeLookupCreate, loadLookup, lookupCreateModal.type],
  );

  const selectItem = useCallback(
    async (item) => {
      if (!capabilities.canView) {
        return;
      }

      dispatch(setSelectedItem(item));

      try {
        await dispatch(fetchItemById(item.id)).unwrap();
      } catch (error) {
        toast.error(getActionError(error, "Unable to load item details."));
      }
    },
    [capabilities.canView, dispatch],
  );

  const openEdit = useCallback(
    (item) => {
      if (!capabilities.canUpdate) {
        return;
      }

      navigate(`/items/${item.id}/edit`);
    },
    [capabilities.canUpdate, navigate],
  );

  const confirmDelete = useCallback(async () => {
    if (!capabilities.canDelete || !confirmation.entity) {
      return;
    }

    setConfirmation((current) => ({ ...current, isLoading: true }));

    try {
      const result = await dispatch(
        deleteItem(confirmation.entity.id),
      ).unwrap();
      toast.success(
        getSuccessMessage(result.response, "Item deleted successfully"),
      );
      setConfirmation({ entity: null, isLoading: false, isOpen: false });
      await loadItems();
    } catch (error) {
      toast.error(getActionError(error, "Unable to delete item."));
      setConfirmation((current) => ({ ...current, isLoading: false }));
    }
  }, [capabilities.canDelete, confirmation.entity, dispatch, loadItems]);

  const filterControls = {
    ...itemsState.filters,
    Search: searchInput,
  };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <Package className="h-3.5 w-3.5" />
            Inventory / Item Master
          </>
        }
        title="Items"
        description="Manage your products and services."
        actions={
          <>
            <AppButton
              variant="secondary"
              className="h-10"
              disabled={itemsState.loading}
              onClick={loadItems}
            >
              <RefreshCw
                className={`h-4 w-4 ${itemsState.loading ? "animate-spin" : ""}`}
              />
              Refresh
            </AppButton>
            {capabilities.canCreate && (
              <AppButton className="h-10" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add Item
              </AppButton>
            )}
          </>
        }
      />

      <ItemStats {...stats} />
      <ItemFilters
        canCreateCategory={canCreateCategory}
        categoryOptions={categoryOptions}
        filters={filterControls}
        resultCount={itemsState.list.length}
        onCreateCategory={() => openLookupCreate("categories")}
        onChange={(patch) => {
          if (Object.hasOwn(patch, "Search")) {
            setSearchInput(patch.Search);
          } else {
            dispatch(setItemFilters(patch));
            dispatch(setItemPage(1));
          }
        }}
        onClear={() => {
          setSearchInput("");
          dispatch(
            setItemFilters({
              Search: "",
              IsActive: "all",
              CategoryId: "all",
              ProcurementClassification: "all",
              Barcode: "",
              ItemCode: "",
            }),
          );
          dispatch(setItemPage(1));
        }}
      />

      <div className="grid min-w-0 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="h-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ItemTable
            actions={{
              ...capabilities,
              onDelete: (item) =>
                setConfirmation({
                  entity: item,
                  isLoading: false,
                  isOpen: true,
                }),
              onEdit: openEdit,
              onView: selectItem,
            }}
            error={itemsState.error}
            isLoading={itemsState.loading}
            items={itemsState.list}
            onCreate={capabilities.canCreate ? openCreate : undefined}
            onPageChange={(value) => dispatch(setItemPage(value))}
            onPageSizeChange={(value) => dispatch(setItemPageSize(value))}
            onRetry={loadItems}
            onSelect={selectItem}
            pageNumber={itemsState.pageNumber}
            pageSize={itemsState.pageSize}
            selectedId={itemsState.selected?.id}
            totalCount={itemsState.totalCount}
            totalPages={itemsState.totalPages}
          />
        </div>
        <div className="h-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ItemDetailsPanel
            canEdit={capabilities.canEdit}
            isLoading={itemsState.detailLoading}
            item={itemsState.selected}
            onEdit={openEdit}
          />
        </div>
      </div>

      <CategoryFormModal
        category={null}
        isLoading={false}
        isOpen={lookupCreateModal.isOpen && lookupCreateModal.type === "categories"}
        mode="create"
        onClose={closeLookupCreate}
        onSubmit={submitLookupCreate}
      />

      <InventoryConfirmDialog
        isLoading={confirmation.isLoading}
        isOpen={confirmation.isOpen}
        title="Delete Item?"
        description={`${confirmation.entity?.name ?? "This item"} will be permanently removed.`}
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

export default ItemsPage;
