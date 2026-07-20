import {
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  ListPlus,
  PackageSearch,
  RefreshCw,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import PageHeader from "../../../components/common/PageHeader";
import { ProcurementItemClassification } from "../../../constants/procurementEnums";
import { itemService } from "../../../services/inventory/itemService";
import { bomService } from "../../../services/procurement/bomService";
import {
  ProcurementEmptyState,
  ProcurementErrorState,
  ProcurementInlineError,
  ProcurementItemAutocomplete,
  ProcurementLoadingRows,
  ProcurementPill,
  ProcurementSectionCard,
} from "../ProcurementShared";
import {
  formatProcurementDate,
  getApiStatus,
  getCollection,
  getFieldErrorMap,
  getItemCode,
  getItemLabel,
  getItemName,
  getProcurementError,
  getRecordId,
  hasDecimalPrecision,
} from "../procurementHelpers";
import useProcurementCapabilities from "../useProcurementCapabilities";
import useLatestRequest from "../useLatestRequest";

const emptyLine = () => ({ componentItem: null, quantityRequired: "" });

const toFormLines = (payload) => {
  const lines = getCollection(payload, ["components", "bomLines"]);

  return lines.map((line) => ({
    componentItem:
      line.componentItem ??
      line.item ?? {
        itemCode: line.componentItemCode ?? line.itemCode,
        itemId: line.componentItemId ?? line.itemId,
        itemName: line.componentItemName ?? line.itemName,
        unitName: line.unitName,
      },
    quantityRequired: String(line.quantityRequired ?? line.quantity ?? ""),
  }));
};

const BomMappingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [bomLoading, setBomLoading] = useState(false);
  const [bomError, setBomError] = useState(null);
  const [issues, setIssues] = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [issuesError, setIssuesError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const capabilities = useProcurementCapabilities({
    label: "ProcurementPlanning.BomMapping",
    resource: "ProcurementPlanning.BomMapping",
    route: "/procurement/bom-mapping",
  });
  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
    reset,
    setError,
    setValue,
  } = useForm({ defaultValues: { components: [] } });
  const { append, fields, remove } = useFieldArray({
    control,
    name: "components",
  });
  const componentValues = useWatch({ control, name: "components" }) ?? [];
  const {
    beginRequest: beginProductsRequest,
    isLatestRequest: isLatestProductsRequest,
  } = useLatestRequest();
  const {
    beginRequest: beginIssuesRequest,
    isLatestRequest: isLatestIssuesRequest,
  } = useLatestRequest();

  const loadProducts = useCallback(async () => {
    const requestId = beginProductsRequest();
    setProductsLoading(true);
    setProductsError(null);
    try {
      const response = await itemService.getItems({
        IsActive: true,
        PageNumber: 1,
        PageSize: 200,
        procurementClassification:
          ProcurementItemClassification.FinishedProduct,
      });
      if (isLatestProductsRequest(requestId)) {
        setProducts(getCollection(response.data));
      }
    } catch (error) {
      if (isLatestProductsRequest(requestId)) {
        setProductsError(error);
      }
    } finally {
      if (isLatestProductsRequest(requestId)) {
        setProductsLoading(false);
      }
    }
  }, [beginProductsRequest, isLatestProductsRequest]);

  const loadIssues = useCallback(async () => {
    const requestId = beginIssuesRequest();
    setIssuesLoading(true);
    setIssuesError(null);
    try {
      const response = await bomService.getIssues({
        PageNumber: 1,
        PageSize: 200,
      });
      if (isLatestIssuesRequest(requestId)) {
        setIssues(getCollection(response.data, ["issues", "bomIssues"]));
      }
    } catch (error) {
      if (isLatestIssuesRequest(requestId)) {
        setIssuesError(error);
      }
    } finally {
      if (isLatestIssuesRequest(requestId)) {
        setIssuesLoading(false);
      }
    }
  }, [beginIssuesRequest, isLatestIssuesRequest]);

  useEffect(() => {
    void Promise.resolve().then(loadProducts);
    void Promise.resolve().then(loadIssues);
  }, [loadIssues, loadProducts]);

  useEffect(() => {
    const requestedProductId = searchParams.get("productId");
    if (!requestedProductId || selectedProduct || products.length === 0) {
      return;
    }

    const matched = products.find(
      (product) =>
        String(getRecordId(product, ["itemId", "productId"])) ===
        requestedProductId,
    );
    if (matched) void Promise.resolve().then(() => setSelectedProduct(matched));
  }, [products, searchParams, selectedProduct]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!selectedProduct) {
        reset({ components: [] });
        return;
      }

      const productId = getRecordId(selectedProduct, ["itemId", "productId"]);
      setBomLoading(true);
      setBomError(null);
      setSaveError("");
      try {
        const response = await bomService.getProductBom(productId);
        if (active) reset({ components: toFormLines(response.data) });
      } catch (error) {
        if (!active) return;
        if (getApiStatus(error) === 404) {
          reset({ components: [] });
        } else {
          setBomError(error);
        }
      } finally {
        if (active) setBomLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [reset, selectedProduct]);

  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }

    const warning = "You have unsaved BOM changes.";
    const beforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = warning;
    };
    const interceptLink = (event) => {
      const anchor = event.target.closest?.("a[href]");
      if (anchor && !window.confirm(`${warning} Leave this page?`)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", interceptLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", interceptLink, true);
    };
  }, [isDirty]);

  const selectProduct = (product) => {
    if (isDirty && !window.confirm("Discard unsaved BOM changes and open another product?")) {
      return;
    }
    const productId = getRecordId(product, ["itemId", "productId"]);
    setSelectedProduct(product);
    setSearchParams(productId ? { productId: String(productId) } : {});
  };

  const validateLines = (data) => {
    const seen = new Set();
    let valid = true;
    const productId = getRecordId(selectedProduct, ["itemId", "productId"]);

    data.components.forEach((line, index) => {
      const componentId = getRecordId(line.componentItem, ["itemId"]);
      const quantity = Number(line.quantityRequired);
      if (!componentId) {
        setError(`components.${index}.componentItem`, {
          message: "Choose a component item.",
        });
        valid = false;
      } else if (String(componentId) === String(productId)) {
        setError(`components.${index}.componentItem`, {
          message: "A product cannot be its own component.",
        });
        valid = false;
      } else if (seen.has(String(componentId))) {
        setError(`components.${index}.componentItem`, {
          message: "This component is already in the BOM.",
        });
        valid = false;
      }
      seen.add(String(componentId));

      if (!(quantity > 0)) {
        setError(`components.${index}.quantityRequired`, {
          message: "Quantity must be greater than zero.",
        });
        valid = false;
      } else if (!hasDecimalPrecision(line.quantityRequired)) {
        setError(`components.${index}.quantityRequired`, {
          message: "Use no more than 6 decimal places.",
        });
        valid = false;
      }
    });

    if (data.components.length === 0) {
      setSaveError("Add at least one component before saving this BOM.");
      valid = false;
    }

    return valid;
  };

  const openConfirmation = handleSubmit((data) => {
    setSaveError("");
    if (validateLines(data)) {
      setConfirmOpen(true);
    }
  });

  const save = handleSubmit(async (data) => {
    if (!validateLines(data) || !selectedProduct) return;
    const productId = getRecordId(selectedProduct, ["itemId", "productId"]);
    const payload = {
      productId,
      components: data.components.map((line) => ({
        componentItemId: getRecordId(line.componentItem, ["itemId"]),
        quantityRequired: Number(line.quantityRequired),
      })),
    };
    setSaving(true);
    setSaveError("");
    try {
      const response = await bomService.saveProductBom(productId, payload);
      const savedLines = toFormLines(response.data);
      reset({ components: savedLines.length ? savedLines : data.components });
      setConfirmOpen(false);
      toast.success(response.message || "Product BOM replaced successfully.");
      await loadIssues();
    } catch (error) {
      const fieldErrors = getFieldErrorMap(error);
      Object.entries(fieldErrors).forEach(([key, message]) => {
        if (key.startsWith("components")) {
          setError(key, { message });
        }
      });
      setSaveError(getProcurementError(error, "Unable to save this BOM."));
    } finally {
      setSaving(false);
    }
  });

  const filteredProducts = products.filter((product) =>
    getItemLabel(product).toLowerCase().includes(productSearch.trim().toLowerCase()),
  );

  const canSave = capabilities.canEdit || capabilities.canCreate;

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={<><GitBranch className="h-3.5 w-3.5" />Procurement Planning</>}
        title="BOM Mapping"
        description="Define the active material recipe for each finished product with explicit replace-all semantics and issue-driven navigation."
        actions={
          <AppButton variant="secondary" onClick={() => { void loadProducts(); void loadIssues(); }}>
            <RefreshCw className="h-4 w-4" />Refresh
          </AppButton>
        }
      />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <ProcurementSectionCard title="Finished products" description="Active items classified as finished products.">
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <AppInput placeholder="Search products" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} />
              <Search className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
            </div>
          </div>
          {productsLoading ? <ProcurementLoadingRows columns={1} rows={8} /> : productsError ? <ProcurementErrorState error={productsError} onRetry={loadProducts} /> : filteredProducts.length === 0 ? <ProcurementEmptyState title="No finished products" description="Classify active products in Item Master before building their BOMs." /> : (
            <div className="max-h-[62vh] overflow-y-auto p-2">
              {filteredProducts.map((product) => {
                const id = getRecordId(product, ["itemId", "productId"]);
                const selected = String(id) === String(getRecordId(selectedProduct, ["itemId", "productId"]));
                return <button key={id} type="button" className={`mb-1 w-full rounded-xl border px-3 py-3 text-left transition-colors ${selected ? "border-brand bg-brand-light" : "border-transparent hover:bg-slate-50"}`} onClick={() => selectProduct(product)}><p className="text-sm font-semibold text-slate-800">{getItemCode(product)}</p><p className="mt-0.5 truncate text-xs text-slate-500">{getItemName(product)}</p></button>;
              })}
            </div>
          )}
        </ProcurementSectionCard>

        <ProcurementSectionCard
          title={selectedProduct ? `Active BOM · ${getItemLabel(selectedProduct)}` : "Active BOM"}
          description="Saving replaces the current active BOM. Previous rows remain inactive in backend history."
          actions={selectedProduct && canSave ? <><AppButton variant="secondary" onClick={() => append(emptyLine())}><ListPlus className="h-4 w-4" />Add component</AppButton><AppButton disabled={!isDirty || bomLoading} onClick={openConfirmation}><Save className="h-4 w-4" />Save replacement</AppButton></> : undefined}
        >
          {!selectedProduct ? <ProcurementEmptyState icon={PackageSearch} title="Choose a finished product" description="Select a product on the left or open an issue below to load its active material recipe." /> : bomLoading ? <ProcurementLoadingRows columns={4} rows={5} /> : bomError ? <ProcurementErrorState error={bomError} /> : (
            <div>
              {fields.length === 0 ? <ProcurementEmptyState title="No active BOM" description="Add the first component to define this product's material recipe." action={canSave ? <AppButton onClick={() => append(emptyLine())}><ListPlus className="h-4 w-4" />Add first component</AppButton> : undefined} /> : (
                <div className="space-y-3 p-4">
                  {fields.map((field, index) => {
                    const selectedItem = componentValues[index]?.componentItem;
                    const unit = selectedItem?.unitName ?? selectedItem?.unit?.name ?? selectedItem?.unitCode ?? "-";
                    return <div key={field.id} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 md:grid-cols-[minmax(0,1fr)_180px_120px_44px] md:items-start"><ProcurementItemAutocomplete disabled={!canSave} error={errors.components?.[index]?.componentItem?.message} excludeItemId={getRecordId(selectedProduct, ["itemId", "productId"])} label={`Component ${index + 1}`} mode="component" required value={selectedItem} onChange={(item) => setValue(`components.${index}.componentItem`, item, { shouldDirty: true, shouldValidate: true })} /><AppInput disabled={!canSave} error={errors.components?.[index]?.quantityRequired?.message} label="Quantity required" min="0" step="any" type="number" required value={componentValues[index]?.quantityRequired ?? ""} onChange={(event) => setValue(`components.${index}.quantityRequired`, event.target.value, { shouldDirty: true, shouldValidate: true })} /><AppInput disabled label="Unit" value={unit} /><div className="pt-6"><AppButton className="h-10 w-10 px-0 text-red-600" disabled={!canSave} variant="ghost" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></AppButton></div></div>;
                  })}
                </div>
              )}
              {isDirty && <div className="mx-4 mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">Unsaved changes · navigating away or choosing another product will ask for confirmation.</div>}
              {saveError && <div className="px-4 pb-4"><ProcurementInlineError message={saveError} title="BOM could not be saved" /></div>}
            </div>
          )}
        </ProcurementSectionCard>
      </div>

      <ProcurementSectionCard title="BOM issues" description="Sold products without an active BOM and active BOMs containing inactive components appear here.">
        {issuesLoading ? <ProcurementLoadingRows columns={5} rows={4} /> : issuesError ? <ProcurementErrorState error={issuesError} onRetry={loadIssues} /> : issues.length === 0 ? <ProcurementEmptyState icon={CheckCircle2} title="No BOM issues" description="All sold finished products have usable active BOMs." /> : (
          <div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Issue</th><th className="px-4 py-3">Last sale</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100 text-sm">{issues.map((issue, index) => <tr key={getRecordId(issue, ["productId", "itemId"]) ?? index}><td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">{index + 1}</td><td className="px-4 py-3"><p className="font-semibold text-slate-800">{issue.productCode ?? issue.itemCode}</p><p className="text-xs text-slate-500">{issue.productName ?? issue.itemName}</p></td><td className="px-4 py-3"><ProcurementPill tone="amber"><AlertTriangle className="h-3 w-3" />{issue.issueTypeName ?? issue.issueType ?? "Needs attention"}</ProcurementPill><p className="mt-1 text-xs text-slate-600">{issue.message ?? issue.description}</p></td><td className="px-4 py-3 text-slate-600">{formatProcurementDate(issue.lastSalesDate ?? issue.lastSoldDate)}</td><td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-0.5"><AppButton className="h-8 px-3" variant="secondary" onClick={() => { const productId = getRecordId(issue, ["productId", "itemId"]); const product = products.find((item) => String(getRecordId(item, ["itemId", "productId"])) === String(productId)) ?? { itemCode: issue.productCode, itemId: productId, itemName: issue.productName }; selectProduct(product); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Open editor</AppButton></div></td></tr>)}</tbody></table></div>
        )}
      </ProcurementSectionCard>

      <AppModal isOpen={confirmOpen} title="Replace this product's active BOM?" onClose={() => !saving && setConfirmOpen(false)}>
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="text-sm font-semibold">Replace-all operation</p><p className="mt-0.5 text-xs leading-5">The submitted component list becomes the entire active BOM. Existing rows not in this list are made inactive and retained in backend history.</p></div></div>
        <p className="mt-4 text-sm text-slate-600">{fields.length} component{fields.length === 1 ? "" : "s"} will be active for <strong>{getItemLabel(selectedProduct)}</strong>.</p>
        <div className="mt-5 flex justify-end gap-2"><AppButton variant="secondary" onClick={() => setConfirmOpen(false)}>Review again</AppButton><AppButton isLoading={saving} onClick={save}><Save className="h-4 w-4" />Replace active BOM</AppButton></div>
      </AppModal>
    </section>
  );
};

export default BomMappingPage;
