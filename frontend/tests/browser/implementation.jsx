// Isolated developer fixture. Never imported by the application or Vite build.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import sidebarReducer from "../../src/store/slices/sidebarSlice";
import TodayPage from "../../src/pages/today/TodayPage";
import AppLookup from "../../src/components/common/AppLookup";
import ReportTable from "../../src/pages/reports/ReportTable";
import ReportViewPreferences from "../../src/pages/reports/ReportViewPreferences";
import useReportViewPreferences from "../../src/pages/reports/useReportViewPreferences";
import { LeaveBalanceResults, PayslipResults } from "../../src/pages/hr/HrResults";
import { applyAppTheme } from "../../src/utils/sidebarTheme";
import "../../src/index.css";

const auth = { user: { id: "fixture-operator", companyId: "isolated-ui-fixture", firstName: "Test operator" }, roles: [], pages: [{ pageId: 990, pageName: "Manufacturing.Orders", displayName: "Production Orders", route: "/manufacturing/orders", canView: true }] };
const store = configureStore({ reducer: { auth: (state = auth) => state, sidebar: sidebarReducer } });
const rows = [{ id: "9223372036854775806", reference: "INV-0241", party: "Sample customer A", quantity: "24.123456", amount: "12840.25", status: "Confirmed" }, { id: "9223372036854775805", reference: "INV-0242", party: "Sample customer B", quantity: "7.000001", amount: "3280.00", status: "Draft" }];
const report = { id: "fixture", group: "sales", paginated: true, columns: [{ key: "reference", header: "Invoice" }, { key: "party", header: "Customer" }, { key: "quantity", header: "Quantity", format: "qty" }, { key: "amount", header: "Amount", format: "currency" }, { key: "status", header: "Status" }] };
export function Fixture() {
  const [screen, setScreen] = useState(() => decodeURIComponent(window.location.hash.slice(1)) || "Today workspace");
  const [selected, setSelected] = useState("");
  const [preferences, setPreferences] = useReportViewPreferences(report);
  const [failure, setFailure] = useState(false);
  const catalog = Array.from({ length: 260 }, (_, index) => ({ id: String(9000000000000000n + BigInt(index)), name: `Item ${String(index + 1).padStart(3, "0")} · Sample catalogue` }));
  return <div className="min-h-screen bg-slate-50 text-slate-900"><div className="bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-900">SYNTHETIC COMPONENT VERIFICATION · no authentication, API or SQL writes</div><div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-8"><div className="flex flex-wrap gap-2">{["Today workspace", "Lookup recovery", "Report preferences", "HR results"].map((name) => <button key={name} type="button" onClick={() => { setScreen(name); window.history.replaceState(null, "", `#${encodeURIComponent(name)}`); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-brand">{name}</button>)}<label className="ml-auto text-xs">Theme<select aria-label="Preview theme" className="ml-2 rounded border p-2" onChange={(event) => applyAppTheme(event.target.value)}><option value="indigo">Indigo</option><option value="emerald">Emerald</option><option value="rose">Rose</option></select></label></div>
    {screen === "Today workspace" && <TodayPage showQueues={false} />}
    {screen === "Lookup recovery" && <section className="max-w-xl space-y-5 rounded-2xl border border-slate-200 bg-white p-5"><h1 className="text-xl font-semibold">Search a 260-record catalogue</h1><p className="text-sm text-slate-500">Search “221”, use keyboard arrows, or load later pages. Exact IDs are retained.</p><AppLookup label="Inventory item" value={selected} onChange={setSelected} loadPage={async ({ search, page, pageSize }) => { if (failure) throw Error("Synthetic network failure"); const filtered = catalog.filter((row) => row.name.toLowerCase().includes(search.toLowerCase())); return { items: filtered.slice((page - 1) * pageSize, page * pageSize), hasMore: page * pageSize < filtered.length }; }} loadById={async (id) => catalog.find((row) => row.id === id)} /><label className="flex gap-2 text-sm"><input type="checkbox" checked={failure} onChange={(event) => setFailure(event.target.checked)} />Simulate failed search for recovery test</label><p role="status" className="text-sm">{selected ? "Selection retained. Search can be retried without clearing the form." : "Choose a record."}</p></section>}
    {screen === "Report preferences" && <section className="space-y-4"><h1 className="text-xl font-semibold">Report views and readable records</h1><ReportViewPreferences report={report} query="FromDate=2026-10-01&ToDate=2026-10-28" preferences={preferences} setPreferences={setPreferences} onApply={() => {}} /><div className="rounded-2xl border border-slate-200 bg-white"><ReportTable report={report} rows={rows} filters={{ PageNumber: 1, PageSize: 20 }} meta={{ totalCount: 2 }} onPageChange={() => {}} onPageSizeChange={() => {}} onSortChange={() => {}} /></div></section>}
    {screen === "HR results" && <section className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-5"><h1 className="text-xl font-semibold">Readable leave balance and payslip</h1><LeaveBalanceResults balance={[{ id: "1", leaveName: "Annual leave", openingBalance: "18.00", usedBalance: "4.50", remainingBalance: "13.50" }]} /><PayslipResults payslip={{ employeeName: "Sample employee", employeeCode: "TEST-001", payrollMonth: 10, payrollYear: 2026, payableDays: "26.00", grossSalary: "26000.00", totalDeduction: "1500.00", netSalary: "24500.00", status: 3 }} /></section>}
  </div></div>;
}
const previousRoot = import.meta.hot?.data.root;
const fixtureRoot = previousRoot ?? createRoot(document.getElementById("root"));
if (!previousRoot) applyAppTheme("indigo");
if (import.meta.hot) import.meta.hot.data.root = fixtureRoot;
fixtureRoot.render(<Provider store={store}><MemoryRouter initialEntries={["/today"]}><Fixture /></MemoryRouter></Provider>);
