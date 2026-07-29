import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { formatNumber } from "../../utils/format";

export const REPORT_EXPORT_PAGE_SIZE = 200;
export const REPORT_EXPORT_MAX_ROWS = 10000;

export const buildReportExportPayload = ({ filters, format = "csv", reportId }) => {
  const exportFilters = { ...(filters ?? {}) };
  delete exportFilters.PageNumber;
  delete exportFilters.PageSize;

  return { filters: exportFilters, format, reportId };
};

export const exportReport = ({ filters, format = "csv", reportId }, { signal } = {}) => {
  return axiosInstance.post(
    ENDPOINTS.REPORT_EXPORT,
    buildReportExportPayload({ filters, format, reportId }),
    { responseType: "blob", signal },
  );
};

export const normalizeReportExportPage = (payload) => {
  const envelope = payload?.data ?? payload;
  const rowContainer = envelope?.rows ?? envelope;
  const rows = Array.isArray(rowContainer)
    ? rowContainer
    : Array.isArray(rowContainer?.items)
      ? rowContainer.items
      : [];
  const meta = payload?.meta ?? envelope?.meta ?? envelope?.pagination ?? rowContainer ?? {};
  const pageSize = Number(meta.pageSize) || REPORT_EXPORT_PAGE_SIZE;
  const totalCount = Number(meta.totalCount ?? meta.totalRecords ?? rows.length) || 0;

  return {
    rows,
    totalCount,
    totalPages:
      Number(meta.totalPages) ||
      Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize))),
  };
};

const getRowIdentity = (row, index) => {
  const identity = row?.id ?? row?.transactionId ?? row?.invoiceId ?? row?.billId ?? row?.referenceId;

  return identity === undefined || identity === null
    ? JSON.stringify(row) || `row-${index}`
    : String(identity);
};

export const dedupeReportRows = (rows) => {
  const seen = new Set();

  return rows.filter((row, index) => {
    const identity = getRowIdentity(row, index);

    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
};

export const loadReportFallbackRows = async ({
  currentRows,
  maxRows = REPORT_EXPORT_MAX_ROWS,
  onProgress,
  params,
  report,
  signal,
}) => {
  if (!report.paginated) {
    onProgress?.({ completed: currentRows.length, total: currentRows.length });
    return currentRows;
  }

  const fetchPage = async (PageNumber) => {
    const payload = await report.fetcher(
      { ...params, PageNumber, PageSize: REPORT_EXPORT_PAGE_SIZE },
      { signal },
    );

    return normalizeReportExportPage(payload);
  };
  const firstPage = await fetchPage(1);

  if (firstPage.totalCount > maxRows) {
    throw new Error(
      `This export contains ${formatNumber(firstPage.totalCount, 0)} rows. Backend report export is required above ${formatNumber(maxRows, 0)} rows.`,
    );
  }

  const rows = [...firstPage.rows];
  onProgress?.({ completed: rows.length, total: firstPage.totalCount });

  for (let pageNumber = 2; pageNumber <= firstPage.totalPages; pageNumber += 1) {
    if (signal?.aborted) {
      const error = new Error("Export cancelled");
      error.name = "AbortError";
      throw error;
    }

    const nextPage = await fetchPage(pageNumber);
    rows.push(...nextPage.rows);
    onProgress?.({
      completed: Math.min(rows.length, firstPage.totalCount),
      total: firstPage.totalCount,
    });
  }

  return dedupeReportRows(rows).slice(0, maxRows);
};
