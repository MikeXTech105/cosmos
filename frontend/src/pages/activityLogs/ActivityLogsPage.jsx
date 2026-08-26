import { Clock3, Download, RefreshCw, ScrollText } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../components/common/AppButton";
import AppTooltip from "../../components/common/AppTooltip";
import PageHeader from "../../components/common/PageHeader";
import { ACTIVITY_LOG_EXPORT_LIMIT } from "../../constants/activityLogConstants";
import activityMessages from "../../i18n/locales/en/activityLogs.json";
import { activityLogService } from "../../services/activityLogs/activityLogService";
import {
  clearActivityLogDetail,
  fetchActivityLogById,
  fetchActivityLogs,
  resetActivityLogFilters,
  setActivityLogFilters,
  setActivityLogPage,
  setActivityLogPageSize,
} from "../../store/slices/activityLogSlice";
import { getApiCorrelationId } from "../../utils/apiError";
import { getDownloadErrorMessage, downloadResponseBlob } from "../../utils/fileDownload";
import { countActiveActivityLogFilters } from "../../utils/activityLogQuery";
import ActivityLogDetailModal from "./ActivityLogDetailModal";
import ActivityLogFilters from "./ActivityLogFilters";
import ActivityLogPagination from "./ActivityLogPagination";
import ActivityLogTable from "./ActivityLogTable";
import useActivityLogsCapabilities from "./useActivityLogsCapabilities";

const withSupportReference = (error) => {
  if (!error?.correlationId || String(error.message).includes(error.correlationId)) {
    return error?.message ?? "Unable to load activity logs.";
  }
  return `${error.message} Ref: ${error.correlationId}`;
};

const getExportErrorText = async (error) => {
  const message = await getDownloadErrorMessage(
    error,
    "Unable to export activity logs.",
  );
  let correlationId = getApiCorrelationId(error);

  if (!correlationId && error?.response?.data instanceof Blob) {
    try {
      const text = await error.response.data.text();
      const data = text ? JSON.parse(text) : null;
      correlationId =
        data?.correlationId ?? data?.data?.correlationId ?? data?.traceId ?? "";
    } catch {
      correlationId = "";
    }
  }

  return correlationId && !message.includes(correlationId)
    ? `${message} Ref: ${correlationId}`
    : message;
};

const ActivityLogsPage = () => {
  const dispatch = useDispatch();
  const state = useSelector((storeState) => storeState.activityLogs);
  const { canExport } = useActivityLogsCapabilities();
  const requestRef = useRef(null);
  const detailRequestRef = useRef(null);
  const lastErrorRef = useRef("");
  const lastDetailErrorRef = useRef("");
  const [selectedId, setSelectedId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const listParams = useMemo(
    () => ({
      ...state.filters,
      PageNumber: state.pageNumber,
      PageSize: state.pageSize,
    }),
    [state.filters, state.pageNumber, state.pageSize],
  );

  const runList = useCallback(() => {
    requestRef.current?.abort?.();
    const request = dispatch(fetchActivityLogs(listParams));
    requestRef.current = request;
    request.finally(() => {
      if (requestRef.current === request) requestRef.current = null;
    });
    return request;
  }, [dispatch, listParams]);

  useEffect(() => {
    const timeoutId = window.setTimeout(runList, 300);

    return () => {
      window.clearTimeout(timeoutId);
      requestRef.current?.abort?.();
      requestRef.current = null;
    };
  }, [runList]);

  useEffect(() => {
    if (!state.error) {
      lastErrorRef.current = "";
      return;
    }
    const message = withSupportReference(state.error);
    if (lastErrorRef.current === message) return;
    lastErrorRef.current = message;
    toast.error(message);
  }, [state.error]);

  useEffect(() => {
    if (!state.detailError) {
      lastDetailErrorRef.current = "";
      return;
    }
    const message = withSupportReference(state.detailError);
    if (lastDetailErrorRef.current === message) return;
    lastDetailErrorRef.current = message;
    toast.error(message);
  }, [state.detailError]);

  const openActivity = (activity) => {
    const id = activity?.id;
    if (id === null || id === undefined || id === "") return;
    detailRequestRef.current?.abort?.();
    setCopied(false);
    setSelectedId(id);
    const request = dispatch(fetchActivityLogById(id));
    detailRequestRef.current = request;
    request.finally(() => {
      if (detailRequestRef.current === request) detailRequestRef.current = null;
    });
  };

  const closeDetail = () => {
    detailRequestRef.current?.abort?.();
    detailRequestRef.current = null;
    setSelectedId(null);
    setCopied(false);
    dispatch(clearActivityLogDetail());
  };

  const copySupportReference = async (value) => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable in this browser.");
      }
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      toast.success("Support reference copied");
    } catch (error) {
      toast.error(error.message || "Unable to copy the support reference.");
    }
  };

  const exportLogs = async () => {
    setExporting(true);
    try {
      const response = await activityLogService.exportLogs(listParams);
      const filename = await downloadResponseBlob(response, "activity-logs.csv");
      toast.success(`${filename} downloaded`);
    } catch (error) {
      toast.error(await getExportErrorText(error));
    } finally {
      setExporting(false);
    }
  };

  const activeFilterCount = countActiveActivityLogFilters(state.filters);
  const hasExportCapWarning = state.totalCount > ACTIVITY_LOG_EXPORT_LIMIT;
  const fieldErrors = state.error?.status === 400 ? state.error.fieldErrors : {};

  return (
    <section className="min-w-0 space-y-5">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5 sm:p-6">
          <PageHeader
            align="center"
            badge={
              <>
                <ScrollText className="h-3.5 w-3.5" />
                System audit trail
              </>
            }
            title={activityMessages.page.title}
            description="Review who changed what, when it happened, and the request behind it."
            actions={
              <>
                <AppButton
                  variant="secondary"
                  className="h-10"
                  onClick={runList}
                >
                  <RefreshCw className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} />
                  Refresh
                </AppButton>
                {canExport ? (
                  state.totalCount === 0 ? (
                    <AppTooltip label="No matching activity to export">
                      <AppButton className="h-10 w-full sm:w-auto" disabled>
                        <Download className="h-4 w-4" />
                        Export CSV
                      </AppButton>
                    </AppTooltip>
                  ) : (
                    <AppButton
                      className="h-10 w-full sm:w-auto"
                      isLoading={exporting}
                      loadingText="Exporting…"
                      onClick={exportLogs}
                    >
                      <Download className="h-4 w-4" />
                      Export CSV
                    </AppButton>
                  )
                ) : null}
              </>
            }
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
              <strong className="font-semibold tabular-nums text-slate-800">
                {state.totalCount.toLocaleString("en-IN")}
              </strong>
              recorded events
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5 text-slate-400" />
              Timestamps display in your local time
            </span>
          </div>
          {canExport ? (
            <span className="text-[11px]">Exports the current filtered view, up to 50,000 rows.</span>
          ) : null}
        </div>
      </div>

      {hasExportCapWarning && canExport ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Narrow your filters — only the first 50,000 rows will be exported.
        </div>
      ) : null}

      <ActivityLogFilters
        actions={state.actions}
        activeFilterCount={activeFilterCount}
        actors={state.actors}
        errors={fieldErrors}
        filters={state.filters}
        modules={state.modules}
        resultCount={state.totalCount}
        onChange={(patch) => dispatch(setActivityLogFilters(patch))}
        onClear={() => dispatch(resetActivityLogFilters())}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Activity timeline</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Select any event to inspect changes and request details.
          </p>
        </div>
        <p className="text-xs tabular-nums text-slate-500" aria-live="polite">
          {state.loading
            ? "Updating activity…"
            : `Showing ${state.items.length.toLocaleString("en-IN")} of ${state.totalCount.toLocaleString("en-IN")}`}
        </p>
      </div>

      {state.error ? (
        <div
          className={`rounded-xl border px-4 py-4 ${
            state.error.status === 403
              ? "border-slate-200 bg-white text-slate-600"
              : "border-red-100 bg-red-50 text-red-700"
          }`}
        >
          <p className="text-sm font-medium">{withSupportReference(state.error)}</p>
          {state.error.status !== 403 && state.error.status !== 400 ? (
            <AppButton
              variant="secondary"
              className="mt-3 h-9 rounded-lg px-3"
              onClick={runList}
            >
              Retry
            </AppButton>
          ) : null}
        </div>
      ) : (
        <ActivityLogTable
          filters={state.filters}
          items={state.items}
          loading={state.loading}
          onOpen={openActivity}
          onSort={(SortBy, SortDirection) =>
            dispatch(setActivityLogFilters({ SortBy, SortDirection }))
          }
        />
      )}

      {!state.error ? (
        <ActivityLogPagination
          pageNumber={state.pageNumber}
          pageSize={state.pageSize}
          totalCount={state.totalCount}
          totalPages={state.totalPages}
          onPageChange={(page) => dispatch(setActivityLogPage(page))}
          onPageSizeChange={(size) => dispatch(setActivityLogPageSize(size))}
        />
      ) : null}

      <ActivityLogDetailModal
        activity={state.selected}
        copied={copied}
        error={state.detailError}
        isLoading={state.detailLoading}
        isOpen={selectedId !== null}
        onClose={closeDetail}
        onCopy={copySupportReference}
      />
    </section>
  );
};

export default ActivityLogsPage;
