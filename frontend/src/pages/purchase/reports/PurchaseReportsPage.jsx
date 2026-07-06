import { BarChart3, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
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

const formatCell = (key, value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (/amount|total|balance|expense|purchase|paid|outstanding/i.test(key)) {
    return formatCurrency(value);
  }

  if (/date/i.test(key)) {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  }

  if (typeof value === "number") {
    return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};

const ReportTable = ({ emptyLabel, payload }) => {
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

  if (!rows.length || !columns.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-sm">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 font-semibold">
                  {humanize(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-slate-100">
                {columns.map((column) => (
                  <td key={column} className="px-4 py-3 text-slate-700">
                    {formatCell(column, row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <BarChart3 className="h-3.5 w-3.5" />
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
            <RefreshCw
              className={`h-4 w-4 ${reports.loading ? "animate-spin" : ""}`}
            />
            Refresh
          </AppButton>
        }
      />

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                "h-10 rounded-xl px-4 text-sm font-semibold transition-colors",
                activeTab === tab.id
                  ? "bg-brand text-white"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[160px_160px_minmax(240px,1fr)_auto]">
          {showDateFilters ? (
            <>
              <AppInput
                type="date"
                value={dateFilters.FromDate}
                onChange={(event) =>
                  dispatch(
                    setPurchaseReportFilters({ FromDate: event.target.value }),
                  )
                }
                aria-label="From date"
                className="h-10"
              />
              <AppInput
                type="date"
                value={dateFilters.ToDate}
                onChange={(event) =>
                  dispatch(
                    setPurchaseReportFilters({ ToDate: event.target.value }),
                  )
                }
                aria-label="To date"
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
              value={reports.filters.itemId}
              onChange={(value) =>
                dispatch(setPurchaseReportFilters({ itemId: value }))
              }
              options={itemOptions}
              placeholder="Select item"
              aria-label="Select item"
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(([key, value]) => (
            <PurchaseStatCard
              key={key}
              icon={BarChart3}
              label={humanize(key)}
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
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-100">
          {reports.error}
        </div>
      )}

      <ReportTable
        payload={payload}
        emptyLabel={
          reports.loading
            ? "Loading report..."
            : activeTab === "itemPurchaseHistory" && !reports.filters.itemId
              ? "Select an item to view purchase history."
              : "No report data available."
        }
      />
    </section>
  );
};

export default PurchaseReportsPage;
