import { BarChart3, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import EmptyState from "../../../components/common/EmptyState";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import AppTabs from "../../../components/common/AppTabs";
import PageHeader from "../../../components/common/PageHeader";
import ResponsiveTableRegion from "../../../components/common/ResponsiveTableRegion";
import { itemService } from "../../../services/inventory/itemService";
import {
  fetchCategoryWiseExpense,
  fetchExpenseSummary,
  fetchItemPurchaseHistory,
  fetchPurchaseSummary,
  fetchSupplierOutstanding,
  setPurchaseReportFilters,
} from "../../../store/slices/purchase/purchaseReportSlice";
import {
  EMPTY_VALUE,
  formatDate,
  formatNumber,
} from "../../../utils/format";
import {
  formatCurrency,
  getActionError,
  getMonthStartInputValue,
  getTodayInputValue,
  toNumber,
} from "../purchaseHelpers";
import { PurchaseStatCard } from "../PurchaseShared";

const tabs = [
  { id: "purchaseSummary", label: "Purchase Summary" },
  { id: "supplierOutstanding", label: "Supplier Outstanding" },
  { id: "expenseSummary", label: "Expense Summary" },
  { id: "categoryWiseExpense", label: "Category-wise Expense" },
  { id: "itemPurchaseHistory", label: "Item Purchase History" },
];

const getLookupList = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  return data?.items ?? [];
};

const normalizeRows = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (payload && typeof payload === "object") {
    const arrayValue = Object.values(payload).find(Array.isArray);

    if (arrayValue) {
      return arrayValue;
    }

    return [payload];
  }

  return [];
};

const humanize = (value) => {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const isCurrencyColumn = (key) =>
  /amount|balance|expense|purchase|paid|outstanding/i.test(key);

const formatCell = (key, value) => {
  if (value === null || value === undefined || value === "") {
    return EMPTY_VALUE;
  }

  if (isCurrencyColumn(key)) {
    return formatNumber(value);
  }

  if (/date/i.test(key)) {
    const formattedDate = formatDate(value);

    if (formattedDate !== EMPTY_VALUE) {
      return formattedDate;
    }
  }

  if (typeof value === "number") {
    return formatNumber(value);
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};

const ReportTable = ({
  emptyHint,
  emptyTitle,
  emptyVariant,
  error,
  loading,
  onClear,
  onRetry,
  payload,
}) => {
  const rows = normalizeRows(payload);
  const columns = useMemo(() => {
    const columnSet = new Set();

    rows.forEach((row) => {
      if (row && typeof row === "object" && !Array.isArray(row)) {
        Object.keys(row).forEach((key) => columnSet.add(key));
      }
    });

    return Array.from(columnSet).slice(0, 8);
  }, [rows]);

  if (loading) {
    return (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-11 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (error || !rows.length || !columns.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <EmptyState
          context="Purchase reports turn bills, supplier balances and expenses into reviewable summaries."
          hint={error || emptyHint}
          title={error ? "Couldn't load purchase report" : emptyTitle}
          variant={error ? "error" : emptyVariant}
          onAction={error ? onRetry : emptyVariant === "filtered" ? onClear : undefined}
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <ResponsiveTableRegion
        mobileConfig={{
          fields: [2, 3, 4, 5],
          serial: 0,
          title: 1,
        }}
      >
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" aria-label="Row number" className="px-4 py-3 font-semibold"><span aria-hidden="true">#</span></th>
              {columns.map((column) => (
                <th scope="col"
                  key={column}
                  className={`px-4 py-3 font-semibold ${
                    isCurrencyColumn(column) ||
                    rows.some((row) => typeof row?.[column] === "number")
                      ? "text-right"
                      : ""
                  }`}
                >
                  {humanize(column)}
                  {isCurrencyColumn(column) ? " (₹)" : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-slate-100">
                <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-500">
                  {index + 1}
                </td>
                {columns.map((column) => (
                  <td
                    key={column}
                    className={`px-4 py-3 text-slate-700 ${
                      isCurrencyColumn(column) || typeof row[column] === "number"
                        ? "text-right tabular-nums"
                        : ""
                    }`}
                  >
                    {formatCell(column, row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ResponsiveTableRegion>
    </div>
  );
};

const getSummaryCards = (payload) => {
  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return [];
  }

  return Object.entries(payload)
    .filter(([, value]) => typeof value === "number")
    .slice(0, 4);
};

const PurchaseReportsPage = () => {
  const dispatch = useDispatch();
  const reports = useSelector((state) => state.purchaseReports);
  const [activeTab, setActiveTab] = useState("purchaseSummary");
  const [items, setItems] = useState([]);
  const itemCacheRef = useRef({ loaded: false, promise: null });

  const dateFilters = useMemo(
    () => ({
      FromDate: reports.filters.FromDate || getMonthStartInputValue(),
      ToDate: reports.filters.ToDate || getTodayInputValue(),
    }),
    [reports.filters.FromDate, reports.filters.ToDate],
  );

  const loadItems = useCallback(() => {
    if (itemCacheRef.current.loaded) {
      return Promise.resolve();
    }

    if (itemCacheRef.current.promise) {
      return itemCacheRef.current.promise;
    }

    itemCacheRef.current.promise = itemService
      .getItems({ PageNumber: 1, PageSize: 200, IsActive: true })
      .then((response) => {
        setItems(getLookupList(response));
        itemCacheRef.current.loaded = true;
      })
      .catch((error) =>
        toast.error(getActionError(error, "Unable to load items.")),
      )
      .finally(() => {
        itemCacheRef.current.promise = null;
      });

    return itemCacheRef.current.promise;
  }, []);

  const runReport = useCallback(async () => {
    try {
      if (activeTab === "purchaseSummary") {
        await dispatch(fetchPurchaseSummary(dateFilters)).unwrap();
      } else if (activeTab === "supplierOutstanding") {
        await dispatch(fetchSupplierOutstanding()).unwrap();
      } else if (activeTab === "expenseSummary") {
        await dispatch(fetchExpenseSummary(dateFilters)).unwrap();
      } else if (activeTab === "categoryWiseExpense") {
        await dispatch(fetchCategoryWiseExpense(dateFilters)).unwrap();
      } else if (activeTab === "itemPurchaseHistory" && reports.filters.itemId) {
        await dispatch(fetchItemPurchaseHistory(reports.filters.itemId)).unwrap();
      }
    } catch (error) {
      toast.error(getActionError(error, "Unable to load report."));
    }
  }, [activeTab, dateFilters, dispatch, reports.filters.itemId]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    void runReport();
  }, [runReport]);

  const itemOptions = useMemo(
    () =>
      items.map((item) => ({
        value: Number(item.id),
        label: [item.name, item.itemCode].filter(Boolean).join(" - "),
      })),
    [items],
  );

  const payload = reports[activeTab];
  const cards = getSummaryCards(payload);
  const showDateFilters = [
    "purchaseSummary",
    "expenseSummary",
    "categoryWiseExpense",
  ].includes(activeTab);
  const clearReportFilters = () =>
    dispatch(
      setPurchaseReportFilters({
        FromDate: "",
        ToDate: "",
        itemId: "",
      }),
    );

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <BarChart3 aria-hidden="true" className="h-3.5 w-3.5" />
            Purchase & Expense
          </>
        }
        title="Purchase Reports"
        description="Review purchases, outstanding suppliers, expenses, categories, and item history."
        actions={
          <AppButton
            variant="secondary"
            className="h-10"
            disabled={reports.loading}
            onClick={runReport}
          >
            <RefreshCw aria-hidden="true"
              className={`h-4 w-4 ${reports.loading ? "animate-spin" : ""}`}
            />
            Refresh
          </AppButton>
        }
      />

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <AppTabs
          active={activeTab}
          aria-label="Purchase report sections"
          className="min-w-max"
          id="purchase-report-tabs"
          tabClassName="h-10 rounded-xl px-4 text-sm font-semibold"
          tabs={tabs}
          onChange={setActiveTab}
        />
      </div>

      <div
        id={`purchase-report-tabs-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`purchase-report-tabs-tab-${activeTab}`}
        className="space-y-6"
      >
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[160px_160px_minmax(240px,1fr)_auto]">
          {showDateFilters ? (
            <>
              <AppInput
                label="From date"
                type="date"
                value={dateFilters.FromDate}
                onChange={(event) =>
                  dispatch(
                    setPurchaseReportFilters({ FromDate: event.target.value }),
                  )
                }
                className="h-10"
              />
              <AppInput
                label="To date"
                type="date"
                value={dateFilters.ToDate}
                onChange={(event) =>
                  dispatch(
                    setPurchaseReportFilters({ ToDate: event.target.value }),
                  )
                }
                className="h-10"
              />
            </>
          ) : (
            <>
              <div />
              <div />
            </>
          )}
          {activeTab === "itemPurchaseHistory" ? (
            <AppSelect
              label="Item"
              value={reports.filters.itemId}
              onChange={(value) =>
                dispatch(setPurchaseReportFilters({ itemId: value }))
              }
              options={itemOptions}
              placeholder="Select item"
            />
          ) : (
            <div />
          )}
          <AppButton className="h-10 rounded-lg px-3" onClick={runReport}>
            Run Report
          </AppButton>
        </div>
      </div>

      {cards.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {cards.map(([key, value]) => (
            <PurchaseStatCard
              key={key}
              icon={BarChart3}
              label={humanize(key)}
              loading={reports.loading}
              value={
                /amount|total|balance|expense|purchase|paid|outstanding/i.test(key)
                  ? formatCurrency(value)
                  : toNumber(value)
              }
              colorClass="bg-brand-light text-brand"
            />
          ))}
        </div>
      )}

      {reports.error && (
        <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-100">
          {reports.error}
        </div>
      )}

      <ReportTable
        emptyHint={
          activeTab === "itemPurchaseHistory" && !reports.filters.itemId
            ? "Choose an item above to load its purchase history."
            : showDateFilters
              ? "Clear the report filters to return to the current-month view."
              : "Records will appear after purchase activity is posted."
        }
        emptyTitle={
          activeTab === "itemPurchaseHistory" && !reports.filters.itemId
            ? "Select an item to view purchase history"
            : showDateFilters
              ? "No report rows match these filters"
              : "No purchase report rows yet"
        }
        emptyVariant={showDateFilters ? "filtered" : "empty"}
        error={reports.error}
        loading={reports.loading}
        onClear={clearReportFilters}
        onRetry={runReport}
        payload={payload}
      />
      </div>
    </section>
  );
};

export default PurchaseReportsPage;
