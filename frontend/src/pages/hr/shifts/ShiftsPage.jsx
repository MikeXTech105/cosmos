import { Clock, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import PageHeader from "../../../components/common/PageHeader";
import {
  createHrShift,
  deleteHrShift,
  fetchHrShiftById,
  fetchHrShifts,
  setHrShiftFilters,
  setHrShiftPage,
  setHrShiftPageSize,
  updateHrShift,
} from "../../../store/slices/hr/shiftSlice";
import {
  buildHrQueryParams,
  extractHrEntity,
  getHrActionError,
  getHrBoolean,
  getHrRecordId,
  getHrSuccessMessage,
} from "../hrHelpers";
import { HrConfirmDialog } from "../HrShared";
import useHrCapabilities from "../useHrCapabilities";
import ShiftFilters from "./ShiftFilters";
import ShiftFormModal from "./ShiftFormModal";
import ShiftGrid from "./ShiftGrid";
import ShiftStats from "./ShiftStats";

const ShiftsPage = () => {
  const dispatch = useDispatch();
  const shiftsState = useSelector((state) => state.hrShifts);
  const capabilities = useHrCapabilities({
    label: "Shifts",
    resource: "shifts",
    route: "/hr/shifts",
  });
  const [searchInput, setSearchInput] = useState(shiftsState.filters.Search);
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
      buildHrQueryParams({
        filters: shiftsState.filters,
        pageNumber: shiftsState.pageNumber,
        pageSize: shiftsState.pageSize,
      }),
    [shiftsState.filters, shiftsState.pageNumber, shiftsState.pageSize],
  );

  const loadShifts = useCallback(() => {
    return dispatch(fetchHrShifts(queryParams));
  }, [dispatch, queryParams]);

  useEffect(() => {
    void Promise.resolve().then(loadShifts);
  }, [loadShifts]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      dispatch(setHrShiftFilters({ Search: searchInput }));
      dispatch(setHrShiftPage(1));
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [dispatch, searchInput]);

  const stats = useMemo(
    () => ({
      day: shiftsState.list.filter(
        (shift) => !getHrBoolean(shift.isNightShift, false),
      ).length,
      night: shiftsState.list.filter((shift) =>
        getHrBoolean(shift.isNightShift, false),
      ).length,
      total: shiftsState.totalCount,
    }),
    [shiftsState.list, shiftsState.totalCount],
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
    async (mode, shift) => {
      const id = getHrRecordId(shift, "shift");

      if (!id) {
        toast.error("Unable to find shift id.");
        return;
      }

      setModal({ entity: shift, isLoading: true, isOpen: true, mode });

      try {
        const response = await dispatch(fetchHrShiftById(id)).unwrap();
        setModal({
          entity: extractHrEntity(response.data, "shift"),
          isLoading: false,
          isOpen: true,
          mode,
        });
      } catch (error) {
        toast.error(getHrActionError(error, "Unable to load shift details."));
        setModal((current) => ({ ...current, isLoading: false }));
      }
    },
    [dispatch],
  );

  const submitShift = useCallback(
    async (payload) => {
      try {
        const response =
          modal.mode === "edit"
            ? await dispatch(
                updateHrShift({
                  id: getHrRecordId(modal.entity, "shift"),
                  payload,
                }),
              ).unwrap()
            : await dispatch(createHrShift(payload)).unwrap();

        toast.success(
          getHrSuccessMessage(
            response,
            modal.mode === "edit"
              ? "Shift updated successfully"
              : "Shift created successfully",
          ),
        );
        closeModal();
        await loadShifts();
      } catch (error) {
        toast.error(getHrActionError(error, "Unable to save shift."));
        throw error;
      }
    },
    [closeModal, dispatch, loadShifts, modal.entity, modal.mode],
  );

  const confirmDelete = useCallback(async () => {
    if (!confirmation.entity) {
      return;
    }

    const id = getHrRecordId(confirmation.entity, "shift");

    if (!id) {
      toast.error("Unable to find shift id.");
      return;
    }

    setConfirmation((current) => ({ ...current, isLoading: true }));

    try {
      const result = await dispatch(deleteHrShift(id)).unwrap();
      toast.success(
        getHrSuccessMessage(result.response, "Shift deleted successfully"),
      );
      setConfirmation({ entity: null, isLoading: false, isOpen: false });
      await loadShifts();
    } catch (error) {
      toast.error(getHrActionError(error, "Unable to delete shift."));
      setConfirmation((current) => ({ ...current, isLoading: false }));
    }
  }, [confirmation.entity, dispatch, loadShifts]);

  const filterControls = {
    ...shiftsState.filters,
    Search: searchInput,
  };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <Clock className="h-3.5 w-3.5" />
            HR / Shifts
          </>
        }
        title="Shifts"
        description="Configure shift timings, grace minutes, weekly hours, and night shifts."
        actions={
          <>
            <AppButton
              variant="secondary"
              className="h-10"
              disabled={shiftsState.loading}
              onClick={loadShifts}
            >
              <RefreshCw
                className={`h-4 w-4 ${shiftsState.loading ? "animate-spin" : ""}`}
              />
              Refresh
            </AppButton>
            <AppButton
              className="h-10"
              disabled={!capabilities.canCreate}
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              Add Shift
            </AppButton>
          </>
        }
      />

      <ShiftStats {...stats} />
      <ShiftFilters
        filters={filterControls}
        resultCount={shiftsState.list.length}
        onChange={(patch) => {
          if (Object.hasOwn(patch, "Search")) {
            setSearchInput(patch.Search);
          } else {
            dispatch(setHrShiftFilters(patch));
            dispatch(setHrShiftPage(1));
          }
        }}
        onClear={() => {
          setSearchInput("");
          dispatch(setHrShiftFilters({ Search: "", IsActive: "all" }));
          dispatch(setHrShiftPage(1));
        }}
      />

      <ShiftGrid
        actions={{
          ...capabilities,
          onDelete: (shift) =>
            setConfirmation({
              entity: shift,
              isLoading: false,
              isOpen: true,
            }),
          onEdit: (shift) => openEntity("edit", shift),
          onView: (shift) => openEntity("view", shift),
        }}
        error={shiftsState.error}
        isLoading={shiftsState.loading}
        onCreate={openCreate}
        onPageChange={(value) => dispatch(setHrShiftPage(value))}
        onPageSizeChange={(value) => dispatch(setHrShiftPageSize(value))}
        onRetry={loadShifts}
        pageNumber={shiftsState.pageNumber}
        pageSize={shiftsState.pageSize}
        shifts={shiftsState.list}
        totalCount={shiftsState.totalCount}
        totalPages={shiftsState.totalPages}
      />

      <ShiftFormModal
        isLoading={modal.isLoading}
        isOpen={modal.isOpen}
        mode={modal.mode}
        onClose={closeModal}
        onSubmit={submitShift}
        shift={modal.entity}
      />

      <HrConfirmDialog
        isLoading={confirmation.isLoading}
        isOpen={confirmation.isOpen}
        title="Delete Shift?"
        description={`${confirmation.entity?.shiftName ?? "This shift"} will be permanently removed.`}
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

export default ShiftsPage;
