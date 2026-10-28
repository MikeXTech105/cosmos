import { orderText as tr } from "./orderText";
import { useCallback, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Factory, Plus, RefreshCw } from "lucide-react";
import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import productionOrderService from "../../../services/manufacturing/productionOrderService";
import { ManufacturingCard, ManufacturingEmpty, ManufacturingInlineError } from "../ManufacturingShared";
import { WorkspaceNav } from "../WorkspaceShared";
import { ProcurementItemAutocomplete } from "../../procurement/ProcurementShared";
import { Busy, Denied, OrderPager, OrderStatus, TableWrap } from "./OrderShared";
import { useAsyncResource, useItemLabels, useOrderCapabilities } from "./orderHooks";
import { formatOrderQuantity, isBusinessDate, normalizeOrderPage } from "./orderHelpers";
export default function OrdersPage() {
  const capabilities = useOrderCapabilities();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({
    search: searchParams.get("search") ?? "",
    status: searchParams.get("status") ?? "",
    itemId: searchParams.get("itemId") ?? "",
    fromDate: searchParams.get("fromDate") ?? "",
    toDate: searchParams.get("toDate") ?? ""
  }));
  const [validation, setValidation] = useState("");
  const query = searchParams.toString();
  const load = useCallback(({ signal } = {}) => productionOrderService.list({
    ...Object.fromEntries(new URLSearchParams(query)),
    pageNumber: Number(new URLSearchParams(query).get("pageNumber")) || 1,
    pageSize: Number(new URLSearchParams(query).get("pageSize")) || 50
  }, { signal }), [query]);
  const resource = useAsyncResource(load, capabilities.canView);
  const page = normalizeOrderPage(resource.data);
  const itemLabel = useItemLabels(capabilities.canView ? [filters.itemId, ...page.items.map(order => order.itemId)] : []);
  const patchParams = patch => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => value ? next.set(key, String(value)) : next.delete(key));
    setSearchParams(next);
  };
  const apply = event => {
    event.preventDefault();
    if (filters.fromDate && !isBusinessDate(filters.fromDate) || filters.toDate && !isBusinessDate(filters.toDate) || filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
      setValidation("Choose a valid date range.");
      return;
    }
    setValidation("");
    patchParams({
      ...filters,
      search: filters.search.trim(),
      pageNumber: 1
    });
  };
  if (!capabilities.canView) return <Denied />;
  return <div className="space-y-6"><WorkspaceNav /><PageHeader icon={Factory} title={tr("Production orders")} description={tr("Plan drafts, reserve an approved release and record actual partial production in base units.")} actions={<><AppButton variant="secondary" disabled={resource.busy} onClick={resource.reload}><RefreshCw className="h-4 w-4" />{tr("Refresh")}</AppButton>{capabilities.canCreate && <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" to="/manufacturing/orders/new"><Plus className="h-4 w-4" />{tr("New order")}</Link>}</>} />
    <ManufacturingCard title={tr("Find orders")}><form onSubmit={apply} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-6"><AppInput label={tr("Search")} value={filters.search} placeholder={tr("Order number or reference")} onChange={e => setFilters(s => ({
          ...s,
          search: e.target.value
        }))} /><AppSelect label={tr("Order status")} value={filters.status} onChange={status => setFilters(s => ({
          ...s,
          status
        }))} options={[{
          value: "",
          label: tr("All statuses")
        }, ...["Draft", "Released", "In progress", "Completed", "Closed", "Cancelled"].map((label, i) => ({
          value: i + 1,
          label: tr(label)
        }))]} />{itemLabel.canView ? <ProcurementItemAutocomplete label={tr("Finished Item")} value={filters.itemId ? (itemLabel.item?.(filters.itemId) ?? { id: filters.itemId, name: itemLabel(filters.itemId) }) : null} mode="any" onChange={item => setFilters(current => ({ ...current, itemId: String(item?.id ?? "") }))} /> : <p className="self-end pb-3 text-xs text-slate-500">Item search requires Items View permission.</p>}<AppInput label={tr("Business date from")} type="date" value={filters.fromDate} onChange={e => setFilters(s => ({
          ...s,
          fromDate: e.target.value
        }))} /><AppInput label={tr("Business date to")} type="date" value={filters.toDate} onChange={e => setFilters(s => ({
          ...s,
          toDate: e.target.value
        }))} /><div className="flex items-end gap-2"><AppButton type="submit" disabled={resource.busy}>{tr("Apply")}</AppButton><AppButton variant="ghost" onClick={() => {
            setFilters({
              search: "",
              status: "",
              itemId: "",
              fromDate: "",
              toDate: ""
            });
            setSearchParams({});
          }}>{tr("Clear")}</AppButton></div></form>{validation && <p role="alert" className="px-5 pb-4 text-sm text-red-700">{validation}</p>}</ManufacturingCard>
    <ManufacturingInlineError message={resource.error} onRetry={resource.reload} />
    <ManufacturingCard title={tr("Orders")} description={tr("Status and quantity totals are returned by the server. Accepted and rejected output both reduce the released remainder.")}>{resource.busy ? <Busy /> : resource.error ? <ManufacturingEmpty title={tr("Orders could not be loaded")} description={tr("Resolve the error above, then retry. Existing orders and quantities are unavailable until the read succeeds.")} /> : page.items.length ? <TableWrap><thead><tr>{["Order", "Item / base unit", "Status", "Business / due date", "Planned", "Released", "Accepted", "Rejected", "Remainder"].map(text => <th key={text}>{tr(text)}</th>)}</tr></thead><tbody>{page.items.map(order => <tr key={order.id}><td><Link className="font-semibold text-brand underline underline-offset-4" to={`/manufacturing/orders/${order.id}`}>{order.orderNumber || `Order #${order.id}`}</Link></td><td>{itemLabel(order.itemId)}<div className="mt-1 text-xs text-slate-500">{itemLabel.unitLabel?.(order.itemId, order.unitId) ?? tr("Base unit unavailable")}</div></td><td><OrderStatus status={order.status} /></td><td>{order.businessDate}<div className="mt-1 text-xs text-slate-500">{tr("Due")}{order.dueDate}</div></td>{["plannedQuantity", "releasedQuantity", "completedQuantity", "rejectedQuantity", "remainingQuantity"].map(key => <td key={key} className="tabular-nums">{formatOrderQuantity(order[key])}</td>)}</tr>)}</tbody></TableWrap> : <ManufacturingEmpty title={tr(page.totalCount > 0 ? "No orders on this page" : "No production orders")} description={tr(page.totalCount > 0 ? "Matching orders still exist. Return to a previous page or apply the filters again." : "Change the filters or create a production draft using an existing manufactured Item.")} />}{!resource.error && <OrderPager page={{
        ...page,
        pageSize: Number(searchParams.get("pageSize")) || page.pageSize
      }} disabled={resource.busy} onChange={pageNumber => patchParams({
        pageNumber
      })} onPageSizeChange={pageSize => patchParams({
        pageSize,
        pageNumber: 1
      })} />}</ManufacturingCard>
    {!resource.error && page.summary.length > 0 && <ManufacturingCard title={tr("Filtered totals by base unit")}><TableWrap><thead><tr><th>{tr("Base unit")}</th><th>{tr("Planned")}</th><th>{tr("Released")}</th><th>{tr("Accepted")}</th><th>{tr("Rejected")}</th><th>{tr("Remainder")}</th></tr></thead><tbody>{page.summary.map(row => <tr key={row.unitId}><td>{itemLabel.unitName?.(row.unitId) ?? tr("Base unit unavailable")}</td>{["plannedQuantity", "releasedQuantity", "completedQuantity", "rejectedQuantity", "remainingQuantity"].map(key => <td key={key}>{formatOrderQuantity(row[key])}</td>)}</tr>)}</tbody></TableWrap></ManufacturingCard>}
  </div>;
}
