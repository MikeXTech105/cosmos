import { AlertTriangle, GitBranch, RotateCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import AppButton from "../../../components/common/AppButton";
import AppLookup from "../../../components/common/AppLookup";
import { lookupPage } from "../../../utils/lookupPage";
import PageHeader from "../../../components/common/PageHeader";
import useCapabilities from "../../../hooks/useCapabilities";
import useProductionRuntime from "../../../hooks/useProductionRuntime";
import { ProcurementItemClassification } from "../../../constants/procurementEnums";
import { itemService } from "../../../services/inventory/itemService";
import { manufacturingBomService } from "../../../services/manufacturing/manufacturingService";
import { bomService } from "../../../services/procurement/bomService";
import {
  ProcurementEmptyState, ProcurementErrorState, ProcurementLoadingRows,
  ProcurementPill, ProcurementSectionCard, ProcurementTabs,
} from "../ProcurementShared";
import {
  formatProcurementDate, getCollection, getItemCode, getItemLabel,
  getItemName, getRecordId,
} from "../procurementHelpers";
import ProcurementTable, { PROCUREMENT_TABLE_HEADER_CLASS } from "../ProcurementTable";
import { issueRemediation, loadApplicableBom, manufacturingBomLink } from "./bomMappingHelpers";

export const ApplicableBomView = ({ bom, missing, productId, canMaintain }) => missing
  ? <ProcurementEmptyState title="No active effective Manufacturing BOM" description="Create or activate a Manufacturing BOM effective for this date." action={canMaintain ? <Link to={manufacturingBomLink(productId)}>Open Manufacturing BOM maintenance</Link> : null} />
  : bom ? <div><p className="font-semibold">Applicable BOM: {bom.bomNumber ?? `Version ${bom.version}`}</p><p className="text-xs text-slate-500">{bom.components?.length ?? 0} components</p><div className="mt-3 space-y-2">{bom.components?.map((line, index) => <div key={line.id ?? line.componentItemId ?? index} className="rounded-lg border border-slate-200 p-3 text-sm">{line.componentItemName ?? line.itemName ?? line.componentItemCode} · {line.quantity ?? line.baseQuantity}</div>)}</div>{bom.components?.length === 0 && <p className="mt-2 text-sm text-amber-700">This BOM has no components.</p>}</div>
    : null;

export const ManufacturingBomListRow = ({ bom, canMaintain, productId }) =>
  <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 py-2 text-sm"><span>{bom.bomNumber} · {bom.finishedItemCode} · {bom.finishedItemName} · v{bom.version}</span>{bom.isDefault === true && <ProcurementPill>Default</ProcurementPill>}{(bom.status === 2 || bom.isActive === true) && <ProcurementPill>Active</ProcurementPill>}<span>{bom.componentCount} raw materials</span><span>{formatProcurementDate(bom.effectiveFrom)}{bom.effectiveTo ? ` – ${formatProcurementDate(bom.effectiveTo)}` : " onward"}</span>{canMaintain && <Link className="text-brand" to={manufacturingBomLink(productId, bom.id)}>Edit</Link>}</div>;

const BomMappingPage = ({ embedded = false, moduleTabs = null }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [issues, setIssues] = useState([]);
  const [list, setList] = useState([]);
  const [applicable, setApplicable] = useState(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bomLoading, setBomLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bomError, setBomError] = useState(null);
  const [bomPageState, setBomPageState] = useState({ productId: "", page: 1 });
  const [bomTotalPages, setBomTotalPages] = useState(1);
  const [view, setView] = useState("products");
  const [refreshKey, setRefreshKey] = useState(0);
  const permissions = useCapabilities({ resource: "Manufacturing.Boms", pageName: "Manufacturing.Boms", actions: ["view", "create", "update"] });
  const canMaintain = permissions.canCreate || permissions.canUpdate;
  const productId = searchParams.get("productId");
  const bomPage = bomPageState.productId === productId ? bomPageState.page : 1;
  const businessContext = useProductionRuntime();
  const asOfDate = businessContext.runtime?.businessDate || "";
  const selected = products.find((product) => String(getRecordId(product, ["itemId", "productId"])) === productId);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [productResponse, issueResponse] = await Promise.all([
        itemService.getItems({ IsActive: true, PageNumber: 1, PageSize: 40, ProcurementClassification: ProcurementItemClassification.FinishedProduct }),
        bomService.getIssues(), // This endpoint intentionally returns an unpaged repair collection.
      ]);
      setProducts(getCollection(productResponse.data));
      setIssues(getCollection(issueResponse.data, ["issues", "bomIssues"]));
    } catch (requestError) { setError(requestError); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void Promise.resolve().then(loadOverview); }, [loadOverview, refreshKey]);
  useEffect(() => {
    let current = true;
    if (!productId || !asOfDate) return () => { current = false; };
    const load = async () => {
      setApplicable(null);
      setList([]);
      setMissing(false);
      setBomError(null);
      setBomLoading(true);
      try {
        const [listResult, applicableResult] = await Promise.allSettled([
          manufacturingBomService.list({ FinishedItemId: productId, PageNumber: bomPage, PageSize: 40 }),
          loadApplicableBom(productId, asOfDate),
        ]);
        if (!current) return;
        if (listResult.status === "fulfilled") {
          const data = listResult.value?.data ?? listResult.value;
          setList(Array.isArray(data) ? data : data?.items ?? []);
          setBomTotalPages(Array.isArray(data) ? 1 : Number(data?.totalPages ?? Math.max(1, Math.ceil(Number(data?.totalCount ?? 0) / 40))));
        } else setBomError(listResult.reason);
        if (applicableResult.status === "fulfilled") {
          setApplicable(applicableResult.value.bom);
          setMissing(applicableResult.value.missing);
        } else setBomError(applicableResult.reason);
      } finally { if (current) setBomLoading(false); }
    };
    void Promise.resolve().then(load);
    return () => { current = false; };
  }, [productId, asOfDate, refreshKey, bomPage]);

  const filtered = products;
  return <section className="min-w-0 space-y-5">
    {!embedded && <PageHeader badge={<><GitBranch className="h-3.5 w-3.5" />Procurement Planning</>} title="BOM Mapping" description="Manufacturing owns the BOM used for procurement planning." />}
    {moduleTabs}
    {!asOfDate && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{businessContext.error ? "The company business date could not be loaded. Ask an authorized administrator or retry before checking effective BOMs." : "Loading the verified company business date…"}<AppButton variant="secondary" onClick={businessContext.reload}>Retry company date</AppButton></p>}
    <div className="flex justify-between gap-3"><ProcurementTabs active={view} tabs={[{ id: "products", label: "Products", icon: GitBranch }, { id: "issues", label: "Issues", icon: AlertTriangle, count: issues.length }]} onChange={setView} /><AppButton variant="secondary" onClick={() => setRefreshKey((key) => key + 1)}><RotateCw className="h-4 w-4" />Refresh</AppButton></div>
    {error && <ProcurementErrorState error={error} onRetry={() => setRefreshKey((key) => key + 1)} />}
    {view === "products" && <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <ProcurementSectionCard title="Finished products" description="Select a product to see its Manufacturing BOM.">
        <div className="p-3"><AppLookup label="Search all finished products" value={productId ?? ""} initialOptions={products} getOptionValue={item => getRecordId(item, ["itemId", "productId"])} getOptionLabel={getItemLabel}
          loadPage={async ({ search, page, pageSize }) => lookupPage(await itemService.getItems({ IsActive: true, Search: search, PageNumber: page, PageSize: pageSize, ProcurementClassification: ProcurementItemClassification.FinishedProduct }), page, pageSize)}
          loadById={async id => (await itemService.getItemById(id)).data} onChange={value => setSearchParams({ productId: String(value) })} /><p className="mt-2 text-xs text-slate-500">Search reaches every catalog page. The shortcuts below show the first loaded page.</p></div>
        {loading ? <ProcurementLoadingRows columns={1} rows={5} /> : <div className="max-h-[62vh] overflow-y-auto p-2">{filtered.map((product) => {
          const id = getRecordId(product, ["itemId", "productId"]);
          return <button key={id} type="button" className={`mb-1 w-full rounded-xl px-3 py-3 text-left ${String(id) === productId ? "bg-brand-light" : "hover:bg-slate-50"}`} onClick={() => setSearchParams({ productId: String(id) })}><p className="text-sm font-semibold">{getItemCode(product)}</p><p className="text-xs text-slate-500">{getItemName(product)}</p></button>;
        })}</div>}
      </ProcurementSectionCard>
      <ProcurementSectionCard title={selected ? `Manufacturing BOM · ${getItemLabel(selected)}` : "Manufacturing BOM"} description={`Applicable on ${asOfDate}. BOM maintenance is in Manufacturing.`} actions={productId && canMaintain ? <Link className="text-sm font-semibold text-brand" to={manufacturingBomLink(productId)}>Open Manufacturing BOM maintenance</Link> : null}>
        {!productId ? <ProcurementEmptyState title="Choose a finished product" /> : bomLoading ? <ProcurementLoadingRows columns={3} rows={4} /> : bomError ? <ProcurementErrorState error={bomError} /> : <div className="space-y-5 p-4">
          <ApplicableBomView bom={applicable} missing={missing} productId={productId} canMaintain={canMaintain} />
          <div><h3 className="mb-2 text-sm font-semibold">BOM versions</h3>{list.map((bom) => <ManufacturingBomListRow key={bom.id} bom={bom} canMaintain={permissions.canUpdate} productId={productId} />)}<div className="mt-3 flex items-center gap-3 text-xs"><AppButton variant="secondary" disabled={bomPage <= 1 || bomLoading} onClick={() => setBomPageState({ productId, page: bomPage - 1 })}>Previous versions</AppButton><span>Page {bomPage} of {Math.max(1, bomTotalPages)}</span><AppButton variant="secondary" disabled={bomPage >= bomTotalPages || bomLoading} onClick={() => setBomPageState({ productId, page: bomPage + 1 })}>More versions</AppButton></div></div>
        </div>}
      </ProcurementSectionCard>
    </div>}
    {view === "issues" && <ProcurementSectionCard title="BOM issues" description="Resolve each issue in Manufacturing BOM maintenance."><ProcurementTable columnCount={4} emptyTitle={!loading && issues.length === 0 ? "No BOM issues" : undefined} head={<><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Product</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Issue</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Last sale</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Action</th></>} loading={loading}>{issues.map((issue, index) => {
      const remediation = issueRemediation(issue);
      const id = getRecordId(issue, ["productId", "itemId"]);
      const mayResolve = issue.issueType === "MISSING_BOM" ? canMaintain : permissions.canUpdate;
      return <tr key={`${id}-${index}`}><td>{issue.productCode ?? issue.itemCode}<p className="text-xs">{issue.productName ?? issue.itemName}</p></td><td><ProcurementPill tone="amber">{remediation.title}</ProcurementPill><p className="text-xs">{issue.message ?? issue.description}</p></td><td>{formatProcurementDate(issue.lastSalesDate ?? issue.lastSoldDate)}</td><td>{mayResolve && id && <Link className="font-semibold text-brand" to={manufacturingBomLink(id, issue.bomId ?? issue.manufacturingBomId)}>{remediation.action}</Link>}</td></tr>;
    })}</ProcurementTable></ProcurementSectionCard>}
  </section>;
};

export default BomMappingPage;
