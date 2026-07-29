import { Package, Plus, RefreshCw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import PageHeader from "../../../components/common/PageHeader";
import useCreatePermission from "../../../hooks/useCreatePermission";
import useLatestRequest from "../../../hooks/useLatestRequest";
import useUrlFilters from "../../../hooks/useUrlFilters";
import { getApiStatus } from "../../../utils/apiError";
import { categoryService } from "../../../services/inventory/categoryService";
import { unitService } from "../../../services/inventory/unitService";
import {
  createItem,
  deleteItem,
  fetchItemById,
  fetchItems,
  setSelectedItem,
  updateItem,
} from "../../../store/slices/inventory/itemSlice";
import { InventoryConfirmDialog } from "../InventoryShared";
import {
  getActionError,
  getSuccessMessage,
} from "../inventoryHelpers";
import {
  DEFAULT_INVENTORY_PAGE_SIZE,
  MAX_INVENTORY_PAGE_SIZE,
} from "../../../utils/inventoryQuery";
import { ITEM_CLASSIFICATION } from "../../../utils/itemClassification";
import useInventoryCapabilities from "../useInventoryCapabilities";
import CategoryFormModal from "../categories/CategoryFormModal";
import UnitFormModal from "../units/UnitFormModal";
import ItemDetailsPanel from "./ItemDetailsPanel";
import ItemFilters from "./ItemFilters";
import ItemFormModal from "./ItemFormModal";
import ItemStats from "./ItemStats";
import ItemTable from "./ItemTable";
import { getItemTypeLabel, isLowStock } from "./itemHelpers";

const ITEM_SORT_FIELDS = Object.freeze(["name", "itemCode", "createdAt"]);
const ITEM_URL_FILTER_SCHEMA = Object.freeze({
  q: Object.freeze({ default: "", type: "string" }),
  category: Object.freeze({
    default: null,
    type: "number",
    validate: (value) => value > 0,
  }),
  classification: Object.freeze({
    default: null,
    options: Object.values(ITEM_CLASSIFICATION),
    type: "enum",
  }),
  isActive: Object.freeze({ default: null, type: "boolean" }),
  page: Object.freeze({
    clamp: [1, Number.MAX_SAFE_INTEGER],
    default: 1,
    type: "number",
  }),
  size: Object.freeze({
    clamp: [1, MAX_INVENTORY_PAGE_SIZE],
    default: DEFAULT_INVENTORY_PAGE_SIZE,
    type: "number",
  }),
  sort: Object.freeze({
    default: "",
    options: ITEM_SORT_FIELDS,
    type: "enum",
  }),
  dir: Object.freeze({
    default: "asc",
    options: ["asc", "desc"],
    type: "enum",
  }),
});

const getLookupList = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  return data?.items ?? [];
};

const getResponseItem = (response) => {
  const data = response?.data;

  return data?.item ?? data;
};

const ItemsPage = () => {
  const dispatch = useDispatch();
  const itemsState = useSelector((state) => state.items);
  const {
    activeCount,
    reset: resetUrlFilters,
    setValue: setUrlFilter,
    values: urlFilters,
  } = useUrlFilters(ITEM_URL_FILTER_SCHEMA);
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
  const canCreateUnit = useCreatePermission({
    label: "Units",
    resource: "units",
    route: "/units",
  });
  const [lookups, setLookups] = useState({
    categories: [],
    categoriesError: null,
    categoriesLoading: false,
    units: [],
    unitsError: null,
    unitsLoading: false,
  });
  const lookupCacheRef = useRef({
    categories: { loaded: false, promise: null },
    units: { loaded: false, promise: null },
  });
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
    () => ({
      CategoryId: urlFilters.category ?? undefined,
      IsActive: urlFilters.isActive ?? undefined,
      PageNumber: urlFilters.page,
      PageSize: urlFilters.size,
      ProcurementClassification:
        urlFilters.classification ?? undefined,
      Search: urlFilters.q.trim() || undefined,
      SortBy: urlFilters.sort || undefined,
      SortDirection: urlFilters.sort ? urlFilters.dir : undefined,
    }),
    [urlFilters],
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

    const isCategories = type === "categories";
    const loadingKey = isCategories
      ? "categoriesLoading"
      : "unitsLoading";
    const errorKey = isCategories ? "categoriesError" : "unitsError";
    const request = isCategories
      ? categoryService.getCategories({
          PageNumber: 1,
          PageSize: 200,
          IsActive: true,
        })
      : unitService.getUnits({
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
    const errors = (
      await Promise.all([
        loadLookup("categories"),
        loadLookup("units"),
      ])
    ).filter(Boolean);

    if (errors.length > 0) {
      toast.error([...new Set(errors)].join(" "));
    }
  }, [loadLookup]);

  useEffect(() => {
    void Promise.resolve().then(loadItems);
  }, [loadItems]);

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

  const unitOptions = useMemo(
    () =>
      lookups.units.map((unit) => ({
        value: Number(unit.id),
        label: unit.shortName
          ? `${unit.name} (${unit.shortName})`
          : unit.name,
      })),
    [lookups.units],
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
    void loadLookups();
    setModal({
      entity: null,
      isLoading: false,
      isOpen: true,
      mode: "create",
    });
  }, [cancelDetailRequests, capabilities.canCreate, loadLookups]);

  const openLookupCreate = useCallback(
    (type) => {
      const isAllowed =
        type === "categories" ? canCreateCategory : canCreateUnit;

      if (isAllowed) {
        setLookupCreateModal({ isOpen: true, type });
      }
    },
    [canCreateCategory, canCreateUnit],
  );

  const closeLookupCreate = useCallback(() => {
    setLookupCreateModal({ isOpen: false, type: null });
  }, []);

  const submitLookupCreate = useCallback(
    async (payload, saveAndNew = false) => {
      const type = lookupCreateModal.type;

      if (!type) {
        return;
      }

      const isAllowed =
        type === "categories" ? canCreateCategory : canCreateUnit;

      if (!isAllowed) {
        return;
      }

      try {
        if (type === "categories") {
          await categoryService.createCategory(payload);
          toast.success("Category created successfully");
        } else {
          await unitService.createUnit(payload);
          toast.success("Unit created successfully");
        }

        lookupCacheRef.current[type].loaded = false;
        await loadLookup(type, { force: true });

        if (!saveAndNew) {
          closeLookupCreate();
        }
      } catch (error) {
        toast.error(
          getActionError(
            error,
            type === "categories"
              ? "Unable to create category."
              : "Unable to create unit.",
          ),
        );
        throw error;
      }
    },
    [
      canCreateCategory,
      canCreateUnit,
      closeLookupCreate,
      loadLookup,
      lookupCreateModal.type,
    ],
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
    async (item) => {
      if (!capabilities.canUpdate) {
        return;
      }

      void loadLookups();
      setModal({
        entity: item,
        isLoading: true,
        isOpen: true,
        mode: "edit",
      });
      detailPromiseRef.current?.abort?.();
      const requestId = beginDetailRequest();
      const detailPromise = dispatch(fetchItemById(item.id));
      detailPromiseRef.current = detailPromise;

      try {
        const response = await detailPromise.unwrap();
        if (!isLatestDetailRequest(requestId)) return;
        setModal({
          entity: getResponseItem(response),
          isLoading: false,
          isOpen: true,
          mode: "edit",
        });
      } catch (error) {
        if (!isLatestDetailRequest(requestId)) return;
        if (getApiStatus(error) === 404) {
          toast.error("This item no longer exists. The list was refreshed.");
          closeModal();
          await loadItems();
          return;
        }
        toast.error(getActionError(error, "Unable to load item details."));
        setModal((current) =>
          current.isOpen &&
          current.mode === "edit" &&
          String(current.entity?.id) === String(item.id)
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
      closeModal,
      dispatch,
      isLatestDetailRequest,
      loadItems,
      loadLookups,
    ],
  );

  const submitItem = useCallback(
    async (payload, saveAndNew) => {
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
                updateItem({ id: modal.entity.id, payload }),
              ).unwrap()
            : await dispatch(createItem(payload)).unwrap();
        const responseItem = getResponseItem(response);
        const responseId =
          responseItem?.id ??
          (["number", "string"].includes(typeof responseItem)
            ? responseItem
            : modal.entity?.id);
        const displayPayload = { ...payload };

        delete displayPayload.imageFile;

        const savedItem = {
          ...(modal.entity ?? {}),
          ...displayPayload,
          ...(responseItem && typeof responseItem === "object"
            ? responseItem
            : {}),
          ...(responseId === undefined ? {} : { id: responseId }),
        };

        toast.success(
          getSuccessMessage(
            response,
            modal.mode === "edit"
              ? "Item updated successfully"
              : "Item created successfully",
          ),
        );

        if (savedItem.id !== undefined) {
          dispatch(setSelectedItem(savedItem));
        }
        if (!saveAndNew) {
          closeModal();
        }

        await loadItems();

        if (savedItem.id !== undefined) {
          try {
            await dispatch(fetchItemById(savedItem.id)).unwrap();
          } catch {
            dispatch(setSelectedItem(savedItem));
          }
        }
      } catch (error) {
        if (modal.mode === "edit" && getApiStatus(error) === 404) {
          toast.error("This item no longer exists. The list was refreshed.");
          closeModal();
          await loadItems();
          return;
        }
        toast.error(getActionError(error, "Unable to save item."));
        throw error;
      }
    },
    [
      capabilities.canCreate,
      capabilities.canUpdate,
      closeModal,
      dispatch,
      loadItems,
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
    CategoryId: urlFilters.category ?? "all",
    IsActive:
      urlFilters.isActive === null
        ? "all"
        : urlFilters.isActive
          ? "active"
          : "inactive",
    ProcurementClassification:
      urlFilters.classification ?? "all",
    Search: urlFilters.q,
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
        activeFilterCount={activeCount}
        canCreateCategory={canCreateCategory}
        categoryOptions={categoryOptions}
        filters={filterControls}
        resultCount={itemsState.list.length}
        onCreateCategory={() => openLookupCreate("categories")}
        onChange={(patch) => {
          if (Object.hasOwn(patch, "Search")) {
            setUrlFilter("q", patch.Search);
          }
          if (Object.hasOwn(patch, "CategoryId")) {
            setUrlFilter(
              "category",
              patch.CategoryId === "all" ? null : patch.CategoryId,
            );
          }
          if (Object.hasOwn(patch, "ProcurementClassification")) {
            setUrlFilter(
              "classification",
              patch.ProcurementClassification === "all"
                ? null
                : patch.ProcurementClassification,
            );
          }
          if (Object.hasOwn(patch, "IsActive")) {
            setUrlFilter(
              "isActive",
              patch.IsActive === "all"
                ? null
                : patch.IsActive === "active",
            );
          }
        }}
        onClear={resetUrlFilters}
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
            onPageChange={(value) => setUrlFilter("page", value)}
            onPageSizeChange={(value) => setUrlFilter("size", value)}
            onRetry={loadItems}
            onSelect={selectItem}
            pageNumber={urlFilters.page}
            pageSize={urlFilters.size}
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

      <ItemFormModal
        key={`${modal.isOpen}-${modal.mode}-${modal.entity?.id ?? "new"}`}
        canCreateCategory={canCreateCategory}
        canCreateUnit={canCreateUnit}
        categoryOptions={categoryOptions}
        categoryEmptyMessage={
          lookups.categoriesError
            ? "Unable to load categories. Close and reopen to retry."
            : "No categories yet - add one in Categories."
        }
        categoryLoading={lookups.categoriesLoading}
        isLoading={modal.isLoading}
        isOpen={modal.isOpen}
        item={modal.entity}
        mode={modal.mode}
        onClose={closeModal}
        onCreateCategory={() => openLookupCreate("categories")}
        onCreateUnit={() => openLookupCreate("units")}
        onSubmit={submitItem}
        unitOptions={unitOptions}
        unitEmptyMessage={
          lookups.unitsError
            ? "Unable to load units. Close and reopen to retry."
            : "No units yet - add one in Units."
        }
        unitLoading={lookups.unitsLoading}
      />

      <CategoryFormModal
        category={null}
        isLoading={false}
        isOpen={lookupCreateModal.isOpen && lookupCreateModal.type === "categories"}
        mode="create"
        onClose={closeLookupCreate}
        onSubmit={submitLookupCreate}
      />

      <UnitFormModal
        isLoading={false}
        isOpen={lookupCreateModal.isOpen && lookupCreateModal.type === "units"}
        mode="create"
        onClose={closeLookupCreate}
        onSubmit={submitLookupCreate}
        unit={null}
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
