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
import { categoryService } from "../../../services/inventory/categoryService";
import { unitService } from "../../../services/inventory/unitService";
import {
  createItem,
  deleteItem,
  fetchItemById,
  fetchItems,
  setItemFilters,
  setItemPage,
  setItemPageSize,
  setSelectedItem,
  updateItem,
} from "../../../store/slices/inventory/itemSlice";
import { InventoryConfirmDialog } from "../InventoryShared";
import {
  buildInventoryQueryParams,
  getActionError,
  getSuccessMessage,
  serializeId,
} from "../inventoryHelpers";
import useInventoryCapabilities from "../useInventoryCapabilities";
import ItemDetailsPanel from "./ItemDetailsPanel";
import ItemFilters from "./ItemFilters";
import ItemFormModal from "./ItemFormModal";
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

const getResponseItem = (response) => {
  const data = response?.data;

  return data?.item ?? data;
};

const ItemsPage = () => {
  const dispatch = useDispatch();
  const itemsState = useSelector((state) => state.items);
  const capabilities = useInventoryCapabilities({
    label: "Items",
    resource: "items",
    route: "/items",
  });
  const [searchInput, setSearchInput] = useState(itemsState.filters.Search);
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
        },
      }),
    [itemsState.filters, itemsState.pageNumber, itemsState.pageSize],
  );

  const loadItems = useCallback(() => {
    return dispatch(fetchItems(queryParams));
  }, [dispatch, queryParams]);

  const loadLookup = useCallback((type) => {
    const cache = lookupCacheRef.current[type];

    if (cache.loaded) {
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
      lowStock: itemsState.list.filter(isLowStock).length,
      products: itemsState.list.filter(
        (item) => getItemTypeLabel(item.itemType) !== "Service",
      ).length,
      services: itemsState.list.filter(
        (item) => getItemTypeLabel(item.itemType) === "Service",
      ).length,
      total: itemsState.totalCount,
    }),
    [itemsState.list, itemsState.totalCount],
  );

  const closeModal = useCallback(() => {
    setModal((current) => ({ ...current, isOpen: false }));
  }, []);

  const openCreate = useCallback(() => {
    void loadLookups();
    setModal({
      entity: null,
      isLoading: false,
      isOpen: true,
      mode: "create",
    });
  }, [loadLookups]);

  const selectItem = useCallback(
    async (item) => {
      dispatch(setSelectedItem(item));

      try {
        await dispatch(fetchItemById(item.id)).unwrap();
      } catch (error) {
        toast.error(getActionError(error, "Unable to load item details."));
      }
    },
    [dispatch],
  );

  const openEdit = useCallback(
    async (item) => {
      void loadLookups();
      setModal({
        entity: item,
        isLoading: true,
        isOpen: true,
        mode: "edit",
      });

      try {
        const response = await dispatch(fetchItemById(item.id)).unwrap();
        setModal({
          entity: getResponseItem(response),
          isLoading: false,
          isOpen: true,
          mode: "edit",
        });
      } catch (error) {
        toast.error(getActionError(error, "Unable to load item details."));
        setModal((current) => ({ ...current, isLoading: false }));
      }
    },
    [dispatch, loadLookups],
  );

  const submitItem = useCallback(
    async (payload, saveAndNew) => {
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
        const savedItem = {
          ...(modal.entity ?? {}),
          ...payload,
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
        toast.error(getActionError(error, "Unable to save item."));
        throw error;
      }
    },
    [closeModal, dispatch, loadItems, modal.entity, modal.mode],
  );

  const confirmDelete = useCallback(async () => {
    if (!confirmation.entity) {
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
  }, [confirmation.entity, dispatch, loadItems]);

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
            <AppButton
              className="h-10"
              disabled={!capabilities.canCreate}
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              Add Item
            </AppButton>
          </>
        }
      />

      <ItemStats {...stats} />
      <ItemFilters
        categoryOptions={categoryOptions}
        filters={filterControls}
        resultCount={itemsState.list.length}
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
            onCreate={openCreate}
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

      <ItemFormModal
        key={`${modal.isOpen}-${modal.mode}-${modal.entity?.id ?? "new"}`}
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
        onSubmit={submitItem}
        unitOptions={unitOptions}
        unitEmptyMessage={
          lookups.unitsError
            ? "Unable to load units. Close and reopen to retry."
            : "No units yet - add one in Units."
        }
        unitLoading={lookups.unitsLoading}
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
