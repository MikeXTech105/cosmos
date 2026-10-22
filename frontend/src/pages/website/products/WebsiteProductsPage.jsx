import { Edit3, Package, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import DataTableShell, { DATA_TABLE_ROW_ACTION_DANGER_CLASS, DATA_TABLE_ROW_ACTION_CLASS } from "../../../components/common/DataTableShell";
import PageHeader from "../../../components/common/PageHeader";
import StatCards from "../../../components/common/StatCards";
import { websiteProductService } from "../../../services/website/websiteService";
import { fetchWebsiteDashboard, fetchWebsiteProducts } from "../../../store/slices/website/websiteSlice";
import { getApiErrorMessage } from "../../../utils/apiError";
import PublishStatusPill from "../PublishStatusPill";
import ProductImage from "./ProductImage";
import useWebsiteCapabilities from "../useWebsiteCapabilities";
import { formatWebsiteDateTime } from "../websiteFormat";
import { PUBLISH_STATUS_OPTIONS } from "../websiteStatus";
import { WebsiteBooleanPill, WebsiteConfirmModal, WebsiteErrorState, WebsitePagination } from "../WebsiteShared";

const INITIAL_FILTERS = { isActive: "", pageNumber: 1, pageSize: 25, publishStatus: "", search: "" };

const WebsiteProductsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const capabilities = useWebsiteCapabilities().products;
  const products = useSelector((state) => state.website.products);
  const dashboard = useSelector((state) => state.website.dashboard);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const request = dispatch(fetchWebsiteProducts(filters));
    return () => request.abort();
  }, [dispatch, filters]);
  useEffect(() => {
    const request = dispatch(fetchWebsiteDashboard());
    return () => request.abort();
  }, [dispatch]);

  const stats = useMemo(() => {
    const total = dashboard.data?.totalProducts;
    const published = dashboard.data?.publishedProducts;
    const completePage = products.totalCount <= products.items.length;
    return [
      { key: "total", label: "Total products", value: total, icon: Package },
      { key: "published", label: "Published", value: published, icon: Package },
      completePage ? { key: "draft", label: "Drafts", value: products.items.filter((item) => item.publishStatus === "Draft").length, icon: Package } : null,
    ];
  }, [dashboard.data, products.items, products.totalCount]);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value, pageNumber: key === "pageNumber" ? value : 1 }));
  const refresh = () => {
    dispatch(fetchWebsiteProducts(filters));
    dispatch(fetchWebsiteDashboard());
  };
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await websiteProductService.delete(pendingDelete.id);
      toast.success("Website product deleted");
      setPendingDelete(null);
      refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to delete this product."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Website Management"
        title="Products"
        description="Manage the independent WEWEL website catalogue—never ERP Items or inventory."
        actions={<>
          <AppButton variant="secondary" onClick={refresh} disabled={products.loading}><RefreshCw className={`h-4 w-4 ${products.loading ? "animate-spin" : ""}`} /> Refresh</AppButton>
          {capabilities.canCreate ? <AppButton onClick={() => navigate("/website/products/new")}><Plus className="h-4 w-4" /> Add product</AppButton> : null}
        </>}
      />
      <StatCards cards={stats} loading={dashboard.loading} />

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_180px_auto]">
          <AppInput aria-label="Search website products" placeholder="Search name, slug or description" value={filters.search} onChange={(event) => setFilter("search", event.target.value)} />
          <AppSelect aria-label="Publish status" placeholder="Any status" options={[{ label: "Any status", value: "" }, ...PUBLISH_STATUS_OPTIONS]} value={filters.publishStatus} onChange={(value) => setFilter("publishStatus", value)} />
          <AppSelect aria-label="Active state" placeholder="Any state" options={[{ label: "Any state", value: "" }, { label: "Active", value: true }, { label: "Inactive", value: false }]} value={filters.isActive} onChange={(value) => setFilter("isActive", value)} />
          <AppButton variant="ghost" disabled={!filters.search && filters.publishStatus === "" && filters.isActive === ""} onClick={() => setFilters(INITIAL_FILTERS)}>Clear</AppButton>
        </div>
      </section>
      <WebsiteErrorState error={products.error} onRetry={refresh} />
      <DataTableShell
        columnCount={10}
        loading={products.loading}
        minWidth="min-w-[1260px]"
        emptyTitle={!products.items.length ? "No website products found" : undefined}
        emptyHint="Try changing the filters or create the first catalogue product."
        emptyAction={capabilities.canCreate ? <Link to="/website/products/new"><AppButton><Plus className="h-4 w-4" /> Add product</AppButton></Link> : null}
        head={<><th className="w-14">#</th><th className="w-20">Image</th><th className="w-32">Code</th><th className="w-64">Name</th><th className="w-32 text-right">Price</th><th className="w-32">Rating</th><th className="w-28">Publish status</th><th className="w-24">Active</th><th className="w-24 text-right">Sort order</th><th className="w-24 text-right">Actions</th></>}
      >
        {products.items.map((product, index) => (
          <tr key={product.id} className={product.publishStatus === "Draft" ? "bg-slate-50/50 text-slate-500" : ""}>
            <td className="tabular-nums text-slate-400">{(products.pageNumber - 1) * products.pageSize + index + 1}</td>
            <td><ProductImage url={product.primaryImageUrl} name={product.name} /></td>
            <td className="font-mono text-xs">{product.code || "—"}</td>
            <td><p className="truncate font-semibold text-slate-900">{product.name || "Untitled product"}</p><p className="mt-0.5 truncate text-xs text-slate-400">{product.brandName || "No brand"} · {formatWebsiteDateTime(product.updatedAt)}</p></td>
            <td className="text-right font-medium tabular-nums">{product.displayPrice ?? "—"} {product.currencyCode || ""}</td>
            <td><p className="tabular-nums">{product.rating ?? "—"} / 5</p><p className="mt-0.5 text-xs text-slate-400">{product.reviewCount ?? 0} reviews</p></td>
            <td><PublishStatusPill value={product.publishStatus} /></td>
            <td><WebsiteBooleanPill value={product.isActive} /></td>
            <td className="text-right tabular-nums">{product.sortOrder ?? "—"}</td>
            <td><div className="flex justify-end gap-1">
              {capabilities.canEdit ? <button type="button" className={DATA_TABLE_ROW_ACTION_CLASS} aria-label={`Edit ${product.name}`} onClick={() => navigate(`/website/products/${product.id}/edit`)}><Edit3 className="h-4 w-4" /></button> : null}
              {capabilities.canDelete ? <button type="button" className={DATA_TABLE_ROW_ACTION_DANGER_CLASS} aria-label={`Delete ${product.name}`} onClick={() => setPendingDelete(product)}><Trash2 className="h-4 w-4" /></button> : null}
            </div></td>
          </tr>
        ))}
      </DataTableShell>
      <WebsitePagination disabled={products.loading} pageNumber={products.pageNumber} pageSize={products.pageSize} totalCount={products.totalCount} totalPages={products.totalPages} onPageChange={(value) => setFilter("pageNumber", value)} onPageSizeChange={(value) => setFilter("pageSize", value)} />
      <WebsiteConfirmModal danger isOpen={Boolean(pendingDelete)} isLoading={deleting} title="Delete website product?" description={`This permanently removes “${pendingDelete?.name || "this product"}” from the website catalogue. ERP Items and inventory are not affected.`} confirmLabel="Delete product" onClose={() => setPendingDelete(null)} onConfirm={confirmDelete} />
    </div>
  );
};

export default WebsiteProductsPage;
