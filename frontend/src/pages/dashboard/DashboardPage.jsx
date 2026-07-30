import { BarChart3 } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";

import PageHeader from "../../components/common/PageHeader";
import GettingStartedCard from "../gettingStarted/GettingStartedCard";
import {
  fetchDashboard,
  fetchDashboardWidget,
  setDashboardFilters,
} from "../../store/slices/dashboard/dashboardSlice";
import {
  buildDashboardSearchParams,
  getDashboardFiltersFromSearchParams,
} from "./dashboardHelpers";
import DashboardFilters from "./DashboardFilters";
import AlertsPanel from "./widgets/AlertsPanel";
import HrSummaryPanel from "./widgets/HrSummaryPanel";
import OverviewStats from "./widgets/OverviewStats";
import TopParties from "./widgets/TopParties";
import TopSellingItems from "./widgets/TopSellingItems";

const RevenueExpenseTrendChart = lazy(
  () => import("./widgets/RevenueExpenseTrendChart"),
);
const SalesPurchaseTrendChart = lazy(
  () => import("./widgets/SalesPurchaseTrendChart"),
);

const ChartFallback = () => {
  return <div className="h-[360px] animate-pulse rounded-2xl bg-slate-100" />;
};

const DashboardPage = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestRef = useRef(null);
  const widgetRequestRef = useRef({});
  const dashboard = useSelector((state) => state.dashboard);
  const filters = useMemo(
    () => getDashboardFiltersFromSearchParams(searchParams),
    [searchParams],
  );

  const runDashboard = useCallback(() => {
    requestRef.current?.abort?.();
    const request = dispatch(fetchDashboard(filters));

    requestRef.current = request;
    request.finally(() => {
      if (requestRef.current === request) {
        requestRef.current = null;
      }
    });
  }, [dispatch, filters]);

  useEffect(() => {
    const timeoutId = window.setTimeout(runDashboard, 350);

    return () => {
      window.clearTimeout(timeoutId);
      requestRef.current?.abort?.();
      requestRef.current = null;
    };
  }, [runDashboard]);

  const updateFilters = (patch) => {
    const nextFilters = { ...filters, ...patch };

    dispatch(setDashboardFilters(nextFilters));
    setSearchParams(buildDashboardSearchParams(nextFilters), {
      replace: true,
    });
  };

  const retryWidget = (widgetId) => {
    widgetRequestRef.current[widgetId]?.abort?.();

    const request = dispatch(
      fetchDashboardWidget({
        filters,
        widgetId,
      }),
    );

    widgetRequestRef.current[widgetId] = request;
    request.finally(() => {
      if (widgetRequestRef.current[widgetId] === request) {
        delete widgetRequestRef.current[widgetId];
      }
    });
  };

  const isRefreshing = Object.values({
    alerts: dashboard.alerts,
    hrSummary: dashboard.hrSummary,
    overview: dashboard.overview,
    revenueExpenseTrend: dashboard.revenueExpenseTrend,
    salesPurchaseTrend: dashboard.salesPurchaseTrend,
    topParties: dashboard.topParties,
    topSellingItems: dashboard.topSellingItems,
  }).some((widget) => widget.loading);

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <BarChart3 aria-hidden="true" className="h-3.5 w-3.5" />
            Dashboard
          </>
        }
        title="Analytics Overview"
        description="Live platform metrics, trends, top lists, alerts, and workforce signals."
      />

      <GettingStartedCard />

      <DashboardFilters
        filters={filters}
        isRefreshing={isRefreshing}
        onChange={updateFilters}
        onRefresh={runDashboard}
      />

      <OverviewStats
        error={dashboard.overview.error}
        isLoading={dashboard.overview.loading}
        overview={dashboard.overview.data}
        onRetry={() => retryWidget("overview")}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Suspense fallback={<ChartFallback />}>
          <SalesPurchaseTrendChart
            error={dashboard.salesPurchaseTrend.error}
            isLoading={dashboard.salesPurchaseTrend.loading}
            rows={dashboard.salesPurchaseTrend.data}
            onRetry={() => retryWidget("salesPurchaseTrend")}
          />
        </Suspense>
        <Suspense fallback={<ChartFallback />}>
          <RevenueExpenseTrendChart
            error={dashboard.revenueExpenseTrend.error}
            isLoading={dashboard.revenueExpenseTrend.loading}
            rows={dashboard.revenueExpenseTrend.data}
            onRetry={() => retryWidget("revenueExpenseTrend")}
          />
        </Suspense>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TopSellingItems
          error={dashboard.topSellingItems.error}
          filters={filters}
          isLoading={dashboard.topSellingItems.loading}
          rows={dashboard.topSellingItems.data}
          onChange={updateFilters}
          onRetry={() => retryWidget("topSellingItems")}
        />
        <TopParties
          error={dashboard.topParties.error}
          filters={filters}
          isLoading={dashboard.topParties.loading}
          rows={dashboard.topParties.data}
          onChange={updateFilters}
          onRetry={() => retryWidget("topParties")}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <AlertsPanel
          alerts={dashboard.alerts.data}
          error={dashboard.alerts.error}
          filters={filters}
          isLoading={dashboard.alerts.loading}
          onChange={updateFilters}
          onRetry={() => retryWidget("alerts")}
        />
        <HrSummaryPanel
          error={dashboard.hrSummary.error}
          filters={filters}
          isLoading={dashboard.hrSummary.loading}
          summary={dashboard.hrSummary.data}
          onChange={updateFilters}
          onRetry={() => retryWidget("hrSummary")}
        />
      </div>
    </section>
  );
};

export default DashboardPage;
