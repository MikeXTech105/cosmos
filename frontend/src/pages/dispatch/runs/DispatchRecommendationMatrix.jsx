import {
  ChevronDown,
  ChevronRight,
  Database,
  Pencil,
} from "lucide-react";
import { useMemo, useState } from "react";

import EmptyState from "../../../components/common/EmptyState";
import AppTooltip from "../../../components/common/AppTooltip";
import ResponsiveTableRegion from "../../../components/common/ResponsiveTableRegion";
import DataTableShell, {
  DATA_TABLE_HEADER_CLASS,
  DATA_TABLE_ROW_ACTION_CLASS,
} from "../../../components/common/DataTableShell";
import {
  formatDispatchNumber,
  getDispatchRoundingLabel,
  getDispatchTierLabel,
} from "../dispatchDisplay";
import { DispatchPill } from "../DispatchShared";

const hasValue = (value) =>
  value !== undefined && value !== null && value !== "";

const ServerValue = ({ label, value }) => (
  <div className="min-w-32 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </p>
    <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">
      {formatDispatchNumber(value)}
    </p>
  </div>
);

const Equation = ({ children, result, resultLabel }) => (
  <div className="flex flex-wrap items-center gap-2">
    {children}
    <span className="text-sm font-semibold text-slate-500">=</span>
    <ServerValue label={resultLabel} value={result} />
  </div>
);

const CalculationStrip = ({ recommendation }) => (
  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
    <p className="text-xs font-semibold text-slate-700">
      {recommendation.warehouseCode} · Server calculation
    </p>
    <div className="space-y-2">
      <Equation
        result={recommendation.totalWarehouseStock}
        resultLabel="Total warehouse stock"
      >
        <ServerValue
          label="Sellable stock"
          value={recommendation.currentSellableQuantity}
        />
        <span className="text-sm font-semibold text-slate-500">+</span>
        <ServerValue
          label="Eligible inbound"
          value={recommendation.eligibleInboundQuantity}
        />
      </Equation>
      <Equation
        result={recommendation.recurringDemand}
        resultLabel="Recurring demand"
      >
        <ServerValue
          label="Recent sales"
          value={recommendation.salesQuantity}
        />
        <span className="text-sm font-semibold text-slate-500">× factor</span>
      </Equation>
      <Equation
        result={recommendation.safetyStock}
        resultLabel="Safety stock"
      >
        <ServerValue
          label="Recurring demand"
          value={recommendation.recurringDemand}
        />
        <span className="text-sm font-semibold text-slate-500">× factor</span>
      </Equation>
      <Equation
        result={recommendation.reorderPoint}
        resultLabel="Reorder point"
      >
        <ServerValue
          label="Recurring demand"
          value={recommendation.recurringDemand}
        />
        <span className="text-sm font-semibold text-slate-500">+</span>
        <ServerValue
          label="Safety stock"
          value={recommendation.safetyStock}
        />
      </Equation>
      <Equation
        result={recommendation.rawShortage}
        resultLabel="Raw shortage"
      >
        <span className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-100">
          max(0, reorder point − total stock)
        </span>
      </Equation>
      <Equation
        result={recommendation.finalRecommendationQuantity}
        resultLabel="Final recommendation"
      >
        <span className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-100">
          max(raw shortage, minimum quantity) → server rounding
        </span>
      </Equation>
    </div>
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
      <Database aria-hidden="true" className="h-3.5 w-3.5" />
      <DispatchPill tone="sky">
        {getDispatchTierLabel(recommendation.tier)}
      </DispatchPill>
      <DispatchPill>
        {getDispatchRoundingLabel(recommendation.roundingMode)}
      </DispatchPill>
      <DispatchPill>
        {formatDispatchNumber(recommendation.unitsPerBox)} units/box
      </DispatchPill>
      <DispatchPill>
        {formatDispatchNumber(recommendation.boxCount)} boxes
      </DispatchPill>
      <DispatchPill>
        Priority {formatDispatchNumber(recommendation.allocationPriority)}
      </DispatchPill>
      <DispatchPill tone={recommendation.allowLooseQuantity ? "emerald" : "slate"}>
        Loose {recommendation.allowLooseQuantity ? "allowed" : "blocked"}
      </DispatchPill>
    </div>
    {hasValue(recommendation.calculationExplanation) ? (
      <p className="whitespace-pre-line text-xs leading-5 text-slate-600">
        {recommendation.calculationExplanation}
      </p>
    ) : (
      <p className="text-xs text-slate-500">
        The server did not return a calculation explanation for this line.
      </p>
    )}
    <p className="text-[11px] text-slate-500">
      Values are displayed exactly as returned by Dispatch Planning. The browser
      does not recalculate recommendations.
    </p>
  </div>
);

const RecommendationQuantities = ({ recommendation }) => {
  const overridden =
    Number(recommendation.finalRecommendationQuantity) !==
    Number(recommendation.calculatedRecommendationQuantity);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-slate-500">Calculated</span>
        <span className="font-semibold tabular-nums text-slate-700">
          {formatDispatchNumber(recommendation.calculatedRecommendationQuantity)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-slate-500">Final</span>
        <span className="font-semibold tabular-nums text-slate-900">
          {formatDispatchNumber(recommendation.finalRecommendationQuantity)}
        </span>
      </div>
      {hasValue(recommendation.allocatedQuantity) ? (
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-1 text-xs">
          <span className="text-slate-500">Allocated</span>
          <span className="font-semibold tabular-nums text-amber-700">
            {formatDispatchNumber(recommendation.allocatedQuantity)}
          </span>
        </div>
      ) : null}
      {overridden ? (
        <AppTooltip label={recommendation.overrideReason || "Overridden"}>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Overridden
          </span>
        </AppTooltip>
      ) : null}
    </div>
  );
};

const DispatchRecommendationMatrix = ({
  canOverride,
  isFiltered,
  loading,
  onClear,
  onOverride,
  recommendations,
  view,
}) => {
  const [expandedItems, setExpandedItems] = useState(() => new Set());
  const warehouses = useMemo(() => {
    const map = new Map();
    recommendations.forEach((record) => {
      if (!map.has(String(record.warehouseId))) {
        map.set(String(record.warehouseId), {
          code: record.warehouseCode,
          id: record.warehouseId,
          name: record.warehouseName,
          priority: Number(record.warehousePriority) || 0,
        });
      }
    });
    return [...map.values()].sort(
      (left, right) =>
        left.priority - right.priority ||
        String(left.code).localeCompare(String(right.code)),
    );
  }, [recommendations]);
  const itemRows = useMemo(() => {
    const map = new Map();
    recommendations.forEach((record) => {
      const key = String(record.itemId);
      if (!map.has(key)) {
        map.set(key, {
          channelSku: record.channelSku,
          code: record.itemCode,
          id: record.itemId,
          name: record.itemName,
          records: [],
          tier: record.tier,
        });
      }
      map.get(key).records.push(record);
    });
    return [...map.values()];
  }, [recommendations]);

  const toggleExpanded = (itemId) => {
    setExpandedItems((current) => {
      const next = new Set(current);
      if (next.has(String(itemId))) next.delete(String(itemId));
      else next.add(String(itemId));
      return next;
    });
  };

  if (view === "flat") {
    return (
      <DataTableShell
        columnCount={11}
        mobileConfig={{
          actions: 10,
          fields: [3, 4, 7, 9],
          serial: 0,
          subtitle: 2,
          title: 1,
        }}
        emptyAction={
          isFiltered ? (
            <button
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              type="button"
              onClick={onClear}
            >
              Clear filters
            </button>
          ) : undefined
        }
        emptyContext="Recommendations allocate calculated item demand across eligible warehouses."
        emptyHint={
          isFiltered
            ? "Clear the current recommendation filters to see other lines."
            : "Calculate the run to create its first recommendations."
        }
        emptyTitle={
          !loading && recommendations.length === 0
            ? isFiltered
              ? "No recommendations match these filters"
              : "No recommendations yet"
            : undefined
        }
        emptyVariant={isFiltered ? "filtered" : "empty"}
        head={
          <>
            <th scope="col" aria-label="Row number" className={DATA_TABLE_HEADER_CLASS}><span aria-hidden="true">#</span></th>
            <th scope="col" className={DATA_TABLE_HEADER_CLASS}>Item</th>
            <th scope="col" className={DATA_TABLE_HEADER_CLASS}>Warehouse</th>
            <th scope="col" className={DATA_TABLE_HEADER_CLASS}>Tier</th>
            <th scope="col" className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Sellable</th>
            <th scope="col" className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Inbound</th>
            <th scope="col" className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Calculated</th>
            <th scope="col" className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Final</th>
            <th scope="col" className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Allocated</th>
            <th scope="col" className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Boxes</th>
            <th scope="col" className={`${DATA_TABLE_HEADER_CLASS} text-right`}>Actions</th>
          </>
        }
        loading={loading}
        minWidth="min-w-[1340px]"
      >
        {recommendations.map((record, index) => {
          const overridden =
            Number(record.finalRecommendationQuantity) !==
            Number(record.calculatedRecommendationQuantity);
          return (
            <tr key={record.id}>
              <td className="text-xs font-semibold tabular-nums text-slate-500">
                {index + 1}
              </td>
              <td>
                <p className="font-medium text-slate-900">{record.itemName}</p>
                <p className="text-xs text-slate-500">
                  {record.itemCode} · {record.channelSku}
                </p>
              </td>
              <td>
                <p className="font-medium">{record.warehouseCode}</p>
                <p className="text-xs text-slate-500">{record.warehouseName}</p>
              </td>
              <td><DispatchPill tone="sky">{getDispatchTierLabel(record.tier)}</DispatchPill></td>
              <td className="text-right tabular-nums">{formatDispatchNumber(record.currentSellableQuantity)}</td>
              <td className="text-right tabular-nums">{formatDispatchNumber(record.eligibleInboundQuantity)}</td>
              <td className="text-right tabular-nums">{formatDispatchNumber(record.calculatedRecommendationQuantity)}</td>
              <td className="text-right tabular-nums">
                <span className={overridden ? "font-semibold text-amber-700" : ""}>
                  {formatDispatchNumber(record.finalRecommendationQuantity)}
                </span>
              </td>
              <td className="text-right tabular-nums">{formatDispatchNumber(record.allocatedQuantity)}</td>
              <td className="text-right tabular-nums">{formatDispatchNumber(record.boxCount)}</td>
              <td>
                <div className="flex items-center justify-end gap-0.5">
                  {canOverride ? (
                    <AppTooltip label="Override recommendation">
                      <button
                        aria-label="Override recommendation"
                        className={DATA_TABLE_ROW_ACTION_CLASS}
                        type="button"
                        onClick={() => onOverride(record)}
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </AppTooltip>
                  ) : null}
                  <AppTooltip label="Show server calculation">
                    <button
                      aria-label="Show server calculation"
                      className={DATA_TABLE_ROW_ACTION_CLASS}
                      type="button"
                      onClick={() => toggleExpanded(`record-${record.id}`)}
                    >
                      {expandedItems.has(`record-${record.id}`) ? (
                        <ChevronDown aria-hidden="true" className="h-4 w-4" />
                      ) : (
                        <ChevronRight aria-hidden="true" className="h-4 w-4" />
                      )}
                    </button>
                  </AppTooltip>
                </div>
              </td>
            </tr>
          );
        }).flatMap((row, index) => {
          const record = recommendations[index];
          return expandedItems.has(`record-${record.id}`)
            ? [
                row,
                <tr key={`${record.id}-calculation`}>
                  <td colSpan={11} className="bg-slate-50 px-4 py-4">
                    <CalculationStrip recommendation={record} />
                  </td>
                </tr>,
              ]
            : [row];
        })}
      </DataTableShell>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <ResponsiveTableRegion
        className="max-h-[68vh]"
        mobileConfig={{
          fields: [1, 2, 3],
          serial: "generated",
          title: 0,
        }}
      >
        <table
          className="w-max min-w-full border-separate border-spacing-0 text-sm"
          aria-label="Dispatch recommendation matrix"
        >
          <thead className="sticky top-0 z-20 bg-slate-50">
            <tr>
              <th scope="col" className="sticky left-0 z-30 min-w-64 border-b border-r border-slate-200 bg-slate-50 px-4 py-3.5 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Item
              </th>
              {warehouses.map((warehouse) => (
                <th scope="col"
                  key={warehouse.id}
                  className="min-w-52 border-b border-slate-200 px-4 py-3.5 text-left"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    {warehouse.code}
                  </p>
                  <p className="mt-0.5 text-[10px] font-normal normal-case text-slate-500">
                    {warehouse.name}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }, (_, index) => (
                  <tr key={index}>
                    <td
                      className="border-b border-slate-100 px-4 py-4"
                      colSpan={warehouses.length + 1}
                    >
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              : itemRows.length === 0
                ? (
                    <tr>
                      <td
                        className="p-0"
                        colSpan={warehouses.length + 1}
                      >
                        <EmptyState
                          context="Recommendations allocate calculated item demand across eligible warehouses."
                          hint={
                            isFiltered
                              ? "Clear the current recommendation filters to see other lines."
                              : "Calculate the run to create its first recommendations."
                          }
                          title={
                            isFiltered
                              ? "No recommendations match these filters"
                              : "No recommendations yet"
                          }
                          variant={isFiltered ? "filtered" : "empty"}
                          onAction={isFiltered ? onClear : undefined}
                        />
                      </td>
                    </tr>
                  )
                : itemRows.flatMap((item) => {
                    const recordsByWarehouse = new Map(
                      item.records.map((record) => [
                        String(record.warehouseId),
                        record,
                      ]),
                    );
                    const expanded = expandedItems.has(String(item.id));
                    const mainRow = (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-4 py-3.5">
                          <button
                            className="flex w-full items-start gap-2 text-left"
                            type="button"
                            onClick={() => toggleExpanded(item.id)}
                          >
                            {expanded ? (
                              <ChevronDown aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                            ) : (
                              <ChevronRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                            )}
                            <span>
                              <span className="block font-medium text-slate-900">
                                {item.name}
                              </span>
                              <span className="block text-xs text-slate-500">
                                {item.code} · {item.channelSku}
                              </span>
                            </span>
                          </button>
                        </td>
                        {warehouses.map((warehouse) => {
                          const record = recordsByWarehouse.get(
                            String(warehouse.id),
                          );
                          return (
                            <td
                              key={warehouse.id}
                              className="border-b border-slate-100 px-4 py-3.5 align-top"
                            >
                              {record ? (
                                <div className="group relative">
                                  <RecommendationQuantities
                                    recommendation={record}
                                  />
                                  {canOverride ? (
                                    <AppTooltip label="Override recommendation">
                                      <button
                                        aria-label={`Override ${item.code} for ${warehouse.code}`}
                                        className="absolute -right-1 -top-1 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 opacity-0 shadow-sm ring-1 ring-slate-200 transition hover:text-brand group-hover:opacity-100 focus:opacity-100"
                                        type="button"
                                        onClick={() => onOverride(record)}
                                      >
                                        <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                                      </button>
                                    </AppTooltip>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                    return expanded
                      ? [
                          mainRow,
                          <tr key={`${item.id}-calculation`}>
                            <td
                              className="border-b border-slate-100 bg-slate-50 px-4 py-4"
                              colSpan={warehouses.length + 1}
                            >
                              <div className="grid gap-3 xl:grid-cols-2">
                                {item.records.map((record) => (
                                  <CalculationStrip
                                    key={record.id}
                                    recommendation={record}
                                  />
                                ))}
                              </div>
                            </td>
                          </tr>,
                        ]
                      : [mainRow];
                  })}
          </tbody>
        </table>
      </ResponsiveTableRegion>
    </div>
  );
};

export default DispatchRecommendationMatrix;
