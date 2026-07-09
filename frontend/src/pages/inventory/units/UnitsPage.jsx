import { Plus, RefreshCw, Scale } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import PageHeader from "../../../components/common/PageHeader";
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
      active: unitsState.list.filter((unit) => unit.isActive).length,
      inactive: unitsState.list.filter((unit) => !unit.isActive).length,
      total: unitsState.totalCount,
    }),
    [unitsState.list, unitsState.totalCount],
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
    async (mode, unit) => {
      setModal({ entity: unit, isLoading: true, isOpen: true, mode });

      try {
        const response = await dispatch(fetchUnitById(unit.id)).unwrap();
        setModal({
          entity: response.data?.unit ?? response.data,
          isLoading: false,
          isOpen: true,
          mode,
        });
      } catch (error) {
        toast.error(getActionError(error, "Unable to load unit details."));
        setModal((current) => ({ ...current, isLoading: false }));
      }
    },
    [dispatch],
  );

  const submitUnit = useCallback(
    async (payload, saveAndNew) => {
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
        toast.error(getActionError(error, "Unable to save unit."));
        throw error;
      }
    },
    [closeModal, dispatch, loadUnits, modal.entity, modal.mode],
  );

  const confirmDelete = useCallback(async () => {
    if (!confirmation.entity) {
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
  }, [confirmation.entity, dispatch, loadUnits]);

  const filterControls = {
    ...unitsState.filters,
    Search: searchInput,
  };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <Scale className="h-3.5 w-3.5" />
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
              <RefreshCw
                className={`h-4 w-4 ${unitsState.loading ? "animate-spin" : ""}`}
              />
              Refresh
            </AppButton>
            <AppButton
              className="h-10"
              disabled={!capabilities.canCreate}
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              Add Unit
            </AppButton>
          </>
        }
      />

      <UnitStats {...stats} />
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
          setSearchInput("");
          dispatch(setUnitFilters({ Search: "", IsActive: "all" }));
          dispatch(setUnitPage(1));
        }}
      />

      <UnitTable
        actions={{
          ...capabilities,
          onDelete: (unit) =>
            setConfirmation({ entity: unit, isLoading: false, isOpen: true }),
          onEdit: (unit) => openEntity("edit", unit),
          onView: (unit) => openEntity("view", unit),
        }}
        error={unitsState.error}
        isLoading={unitsState.loading}
        onCreate={openCreate}
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
        title="Delete Unit?"
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
