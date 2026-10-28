import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import productionOrderService from "../../services/manufacturing/productionOrderService";
import { purchaseOrderService } from "../../services/purchase/purchaseOrderService";
import { invoiceService } from "../../services/sales/invoiceService";
import { hrLeaveService } from "../../services/hr/leaveService";
import { myWalletService } from "../../services/rojmel/myWalletService";

const queues = {
  production: { route: "/manufacturing/orders", label: "Orders awaiting release", load: () => productionOrderService.list({ Status: 1, PageNumber: 1, PageSize: 5 }), labelFor: (row) => row.orderNumber, rowRoute: (row) => `/manufacturing/orders/${encodeURIComponent(String(row.id))}` },
  purchase: { route: "/purchase/orders", label: "Draft purchase orders", load: () => purchaseOrderService.getPurchaseOrders({ Status: 1, PageNumber: 1, PageSize: 5 }), labelFor: (row) => [row.purchaseOrderNo, row.supplierName].filter(Boolean).join(" · "), rowRoute: (row) => `/purchase/orders/${encodeURIComponent(String(row.id))}` },
  sales: { route: "/sales/invoices", label: "Draft invoices", load: () => invoiceService.getInvoices({ Status: 1, PageNumber: 1, PageSize: 5 }), labelFor: (row) => [row.invoiceNumber, row.customerName].filter(Boolean).join(" · "), rowRoute: (row) => `/sales/invoices/${encodeURIComponent(String(row.id))}` },
  accounts: { route: "/rojmel/my-wallet", label: "Your recent wallet entries", load: () => myWalletService.getTransactions({ PageNumber: 1, PageSize: 5 }), labelFor: (row) => [row.referenceNo ?? row.referenceNumber, row.description ?? row.notes].filter(Boolean).join(" · ") || "Wallet entry", rowRoute: () => "/rojmel/my-wallet" },
  hr: { route: "/hr/leaves", label: "Pending leave requests", load: () => hrLeaveService.getLeaves({ Status: 1, PageNumber: 1, PageSize: 5 }), labelFor: (row) => [row.employeeName, row.leaveName ?? row.leaveTypeName, row.fromDate].filter(Boolean).join(" · "), rowRoute: () => "/hr/leaves" },
};
export default function TodayQueues({ workspace, tasks }) {
  const definition = queues[workspace];
  const allowed = definition && tasks.some((task) => task.route === definition.route);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ workspace: null, rows: [], total: null, error: "" });
  useEffect(() => {
    if (!allowed) return;
    let current = true;
    definition.load().then((response) => {
      if (!current) return;
      const data = response.data;
      const rows = Array.isArray(data) ? data : data?.items ?? [];
      const total = response.meta?.totalCount ?? data?.totalCount ?? rows[0]?.totalCount ?? (rows.length === 0 ? 0 : null);
      setState({ workspace, rows, total, error: "" });
    }).catch((error) => {
      if (current) setState({ workspace, rows: [], total: null, error: error?.response?.status === 403 ? "You do not have access to this work queue." : "This queue could not be loaded. Open the module or retry; no zero count has been substituted." });
    });
    return () => { current = false; };
  }, [allowed, definition, revision, workspace]);
  if (!allowed) return null;
  const loading = state.workspace !== workspace;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">{definition.label}{!loading && state.total !== null ? ` · ${state.total}` : ""}</h2>{loading ? <p role="status" className="mt-3 text-sm text-slate-500">Loading current work…</p> : state.error ? <div role="alert" className="mt-3 text-sm text-rose-700"><p>{state.error}</p><button type="button" onClick={() => setRevision((value) => value + 1)} className="mt-2 font-semibold underline">Retry queue</button></div> : state.rows.length ? <ul className="mt-3 divide-y divide-slate-100">{state.rows.map((row, index) => <li key={String(row.id ?? index)} className="py-2"><Link to={definition.rowRoute(row)} className="text-sm font-medium text-brand hover:underline">{definition.labelFor(row) || "Open record"}</Link></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">No matching records in this queue.</p>}<Link to={definition.route} className="mt-3 inline-block text-xs font-semibold text-brand">Open work list →</Link></section>;
}
