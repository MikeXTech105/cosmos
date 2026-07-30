import { Plus, RefreshCw, Scale } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import PageHeader from "../../../components/common/PageHeader";
import useLatestRequest from "../../../hooks/useLatestRequest";
import { getApiStatus } from "../../../utils/apiError";
import {
  createUnit,
  deleteUnit,
  fetchUnitById,
  fetchUnits,
  setUnitFilters,
  setUnitPage,
  setUnitPageSize,
  updateUnit,
} from "../../../store/slices/inventory/unitSlice";
import {
  InventoryConfirmDialog,
} from "../InventoryShared";
import {
  buildInventoryQueryParams,
  getActionError,
  getSuccessMessage,
} from "../inventoryHelpers";
import useInventoryCapabilities from "../useInventoryCapabilities";
import UnitFilters from "./UnitFilters";
import UnitFormModal from "./UnitFormModal";
import UnitStats from "./UnitStats";
import UnitTable from "./UnitTable";

const UnitsPage = () => {
  const dispatch = useDispatch();
  const unitsState = useSelector((state) => state.units);
  const capabilities = useInventoryCapabilities({
    label: "Units",
    resource: "units",
    route: "/units",
  });
  const [searchInput, setSearchInput] = useState(unitsState.filters.Search);
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
        filters: unitsState.filters,
        pageNumber: unitsState.pageNumber,
        pageSize: unitsState.pageSize,
      }),
    [unitsState.filters, unitsState.pageNumber, unitsState.pageSize],
  );

  const loadUnits = useCallback(() => {
    return dispatch(fetchUnits(queryParams));
  }, [dispatch, queryParams]);

  useEffect(() => {
    void Promise.resolve().then(loadUnits);
  }, [loadUnits]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      dispatch(setUnitFilters({ Search: searchInput }));
      dispatch(setUnitPage(1));
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [dispatch, searchInput]);

  const stats = useMemo(
    () => ({
      active:
        unitsState.summary?.activeCount ??
        unitsState.list.filter((unit) => unit.isActive).length,
      inactive:
        unitsState.summary?.inactiveCount ??
        unitsState.list.filter((unit) => !unit.isActive).length,
      total: unitsState.summary?.totalCount ?? unitsState.totalCount,
      metricScope: unitsState.summaryScope,
      totalScope: "all-matching",
    }),
    [unitsState.list, unitsState.summary, unitsState.summaryScope, unitsState.totalCount],
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
    async (mode, unit) => {
      const isAllowed =
        mode === "edit" ? capabilities.canUpdate : capabilities.canView;

      if (!isAllowed) {
        return;
      }

      setModal({ entity: unit, isLoading: true, isOpen: true, mode });
      detailPromiseRef.current?.abort?.();
      const requestId = beginDetailRequest();
      const detailPromise = dispatch(fetchUnitById(unit.id));
      detailPromiseRef.current = detailPromise;

      try {
        const response = await detailPromise.unwrap();
        if (!isLatestDetailRequest(requestId)) return;
        setModal({
          entity: response.data?.unit ?? response.data,
          isLoading: false,
          isOpen: true,
          mode,
        });
      } catch (error) {
        if (!isLatestDetailRequest(requestId)) return;
        if (getApiStatus(error) === 404) {
          toast.error("This unit no longer exists. The list was refreshed.");
          closeModal();
          await loadUnits();
          return;
        }
        toast.error(getActionError(error, "Unable to load unit details."));
        setModal((current) =>
          current.isOpen &&
          current.mode === mode &&
          String(current.entity?.id) === String(unit.id)
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
      loadUnits,
    ],
  );

  const submitUnit = useCallback(
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
                updateUnit({ id: modal.entity.id, payload }),
              ).unwrap()
            : await dispatch(createUnit(payload)).unwrap();

        toast.success(
          getSuccessMessage(
            response,
            modal.mode === "edit"
              ? "Unit updated successfully"
              : "Unit created successfully",
          ),
        );

        if (!saveAndNew) {
          closeModal();
        }
        await loadUnits();
      } catch (error) {
        if (modal.mode === "edit" && getApiStatus(error) === 404) {
          toast.error("This unit no longer exists. The list was refreshed.");
          closeModal();
          await loadUnits();
          return;
        }
        toast.error(getActionError(error, "Unable to save unit."));
        throw error;
      }
    },
    [
      capabilities.canCreate,
      capabilities.canUpdate,
      closeModal,
      dispatch,
      loadUnits,
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
        deleteUnit(confirmation.entity.id),
      ).unwrap();
      toast.success(
        getSuccessMessage(result.response, "Unit deleted successfully"),
      );
      setConfirmation({ entity: null, isLoading: false, isOpen: false });
      await loadUnits();
    } catch (error) {
      toast.error(getActionError(error, "Unable to delete unit."));
      setConfirmation((current) => ({ ...current, isLoading: false }));
    }
  }, [capabilities.canDelete, confirmation.entity, dispatch, loadUnits]);

  const filterControls = {
    ...unitsState.filters,
    Search: searchInput,
  };
  const activeFilterCount = [
    searchInput.trim(),
    unitsState.filters.IsActive === "all"
      ? ""
      : unitsState.filters.IsActive,
  ].filter(Boolean).length;
  const clearFilters = () => {
    setSearchInput("");
    dispatch(setUnitFilters({ Search: "", IsActive: "all" }));
    dispatch(setUnitPage(1));
  };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <Scale aria-hidden="true" className="h-3.5 w-3.5" />
            Inventory / Unit Master
          </>
        }
        title="Units"
        description="Manage units of measure."
        actions={
          <>
            <AppButton
              variant="secondary"
              className="h-10"
              disabled={unitsState.loading}
              onClick={loadUnits}
            >
              <RefreshCw aria-hidden="true"
                className={`h-4 w-4 ${unitsState.loading ? "animate-spin" : ""}`}
              />
              Refresh
            </AppButton>
            {capabilities.canCreate && (
              <AppButton className="h-10" onClick={openCreate}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Add Unit
              </AppButton>
            )}
          </>
        }
      />

      <UnitStats {...stats} loading={unitsState.loading} />
      <UnitFilters
        filters={filterControls}
        resultCount={unitsState.list.length}
        onChange={(patch) => {
          if (Object.hasOwn(patch, "Search")) {
            setSearchInput(patch.Search);
          } else {
            dispatch(setUnitFilters(patch));
            dispatch(setUnitPage(1));
          }
        }}
        onClear={() => {
          clearFilters();
        }}
      />

      <UnitTable
        activeFilterCount={activeFilterCount}
        actions={{
          ...capabilities,
          onDelete: (unit) =>
            setConfirmation({ entity: unit, isLoading: false, isOpen: true }),
          onEdit: (unit) => openEntity("edit", unit),
          onView: (unit) => openEntity("view", unit),
        }}
        error={unitsState.error}
        isLoading={unitsState.loading}
        onCreate={capabilities.canCreate ? openCreate : undefined}
        onClear={clearFilters}
        onPageChange={(value) => dispatch(setUnitPage(value))}
        onPageSizeChange={(value) => dispatch(setUnitPageSize(value))}
        onRetry={loadUnits}
        pageNumber={unitsState.pageNumber}
        pageSize={unitsState.pageSize}
        totalCount={unitsState.totalCount}
        totalPages={unitsState.totalPages}
        units={unitsState.list}
      />

      <UnitFormModal
        isLoading={modal.isLoading}
        isOpen={modal.isOpen}
        mode={modal.mode}
        unit={modal.entity}
        onClose={closeModal}
        onSubmit={submitUnit}
      />

      <InventoryConfirmDialog
        isLoading={confirmation.isLoading}
        isOpen={confirmation.isOpen}
        title="Delete 1 unit?"
        description={`${confirmation.entity?.name ?? "This unit"} will be permanently removed.`}
        onCancel={() =>
          setConfirmation({ entity: null, isLoading: false, isOpen: false })
        }
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default UnitsPage;
