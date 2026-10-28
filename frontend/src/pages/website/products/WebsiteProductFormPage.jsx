import { ArrowDown, ArrowLeft, ArrowUp, ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppImageUpload from "../../../components/common/AppImageUpload";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import { websiteMediaService, websiteProductService } from "../../../services/website/websiteService";
import { clearWebsiteProductDetail, fetchWebsiteProductById, fetchWebsiteProducts } from "../../../store/slices/website/websiteSlice";
import { getApiErrorMessage, getApiFieldErrors, isConflictError } from "../../../utils/apiError";
import { EMPTY_PRODUCT_FORM, PRODUCT_TEXT_LIMITS, hasIncompleteProductMedia, restoreSavedProductMedia, toProductForm, toProductPayload, validateProductForm } from "./productForm";
import { PUBLISH_STATUS_BODY_OPTIONS, getPublishStatusName, getPublishTransitionWarning } from "../websiteStatus";
import useWebsiteCapabilities from "../useWebsiteCapabilities";
import { GuardedButton, WebsiteConflictPanel, WebsiteConfirmModal, WebsiteErrorState, WebsitePageIntro, WebsiteTextarea, WebsiteToggle } from "../WebsiteShared";
import { WebsiteProductPreview } from "../WebsiteContentPreview";
import useUnsavedChanges from "../../../hooks/useUnsavedChanges";
import { withoutDirtyPrompt } from "../../../utils/dirtyWork";

const Section = ({ children, description, title }) => (
  <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-5"><h2 className="text-base font-semibold text-slate-900">{title}</h2>{description ? <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p> : null}</div>
    {children}
  </section>
);

const WebsiteProductFormPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const websiteCapabilities = useWebsiteCapabilities();
  const capabilities = websiteCapabilities.products;
  const mediaCapabilities = websiteCapabilities.media;
  const [mediaIncomplete, setMediaIncomplete] = useState(false);
  const saveDisabledReason = mediaIncomplete
    ? "The API must return the complete image collection before this product can be safely edited."
    : (isEdit ? capabilities.canEdit : capabilities.canCreate)
    ? ""
    : `You need ${isEdit ? "edit" : "create"} permission for website products.`;
  const detail = useSelector((state) => state.website.productDetail);
  const [form, setForm] = useState(EMPTY_PRODUCT_FORM);
  const [savedFingerprint, setSavedFingerprint] = useState(() => JSON.stringify(EMPTY_PRODUCT_FORM));
  const [uploading, setUploading] = useState(false);
  const savedMedia = useRef(null);
  const formRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [conflict, setConflict] = useState(null);
  const [loadedStatus, setLoadedStatus] = useState("Draft");
  const [loadAttempt, setLoadAttempt] = useState(0);
  useUnsavedChanges({ when: JSON.stringify(form) !== savedFingerprint || saving || uploading });

  useEffect(() => {
    if (!isEdit) return undefined;
    const request = dispatch(fetchWebsiteProductById(id));
    request.unwrap().then((response) => {
      const record = restoreSavedProductMedia(response.data, savedMedia.current);
      setMediaIncomplete(hasIncompleteProductMedia(record));
      const next = toProductForm(record); setForm(next); setSavedFingerprint(JSON.stringify(next));
      setLoadedStatus(getPublishStatusName(response.data?.publishStatus));
    }).catch((error) => {
      if (error?.name !== "AbortError") toast.error(getApiErrorMessage(error, "Unable to load this website product."));
    });
    return () => request.abort();
  }, [dispatch, id, isEdit, loadAttempt]);
  useEffect(() => () => dispatch(clearWebsiteProductDetail()), [dispatch]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([errorKey]) => errorKey !== key && !errorKey.startsWith(`${key}.`))));
  };
  const payload = useMemo(() => toProductPayload(form), [form]);

  const validate = () => {
    const next = validateProductForm(form);
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error("Please correct the highlighted fields.");
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"], [role="alert"]')?.scrollIntoView({ block: "center", behavior: "smooth" }));
    }
    return Object.keys(next).length === 0;
  };

  const applySaved = useCallback((record) => {
    if (!record) return;
    const next = toProductForm(record); setForm(next); setSavedFingerprint(JSON.stringify(next));
    setMediaIncomplete(hasIncompleteProductMedia(record));
    setLoadedStatus(getPublishStatusName(record.publishStatus));
    setConflict(null);
  }, []);

  const save = async (overridePayload = payload) => {
    if (saving || uploading || saveDisabledReason) return;
    const nextErrors = validateProductForm(overridePayload);
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); setConfirm(null); return; }
    setSaving(true);
    setErrors({});
    try {
      const response = isEdit
        ? await websiteProductService.update(id, overridePayload)
        : await websiteProductService.create(overridePayload);
      // Keep the submitted gallery in this editing session: older APIs return only primaryImageUrl.
      savedMedia.current = { id: response.data?.id, rowVersion: response.data?.rowVersion, media: overridePayload.media };
      applySaved({ ...response.data, media: response.data?.media ?? overridePayload.media });
      dispatch(fetchWebsiteProducts({ pageNumber: 1, pageSize: 25 }));
      toast.success(isEdit ? "Website product saved" : "Website product created");
      if (!isEdit && response.data?.id) withoutDirtyPrompt(() => navigate(`/website/products/${response.data.id}/edit`, { replace: true }));
    } catch (error) {
      if (isConflictError(error) && isEdit) {
        try {
          const current = await websiteProductService.getById(id);
          setConflict({ current: current.data, mine: overridePayload });
        } catch (refreshError) {
          toast.error(getApiErrorMessage(refreshError, "Unable to load the saved version."));
        }
      } else {
        setErrors(getApiFieldErrors(error));
        toast.error(getApiErrorMessage(error, "Unable to save this website product."));
      }
    } finally {
      setSaving(false);
      setConfirm(null);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (saving || uploading || (isEdit && detail.loading)) return;
    if (saveDisabledReason) {
      toast.error(saveDisabledReason);
      return;
    }
    if (!validate()) return;
    const warning = getPublishTransitionWarning({ currentStatus: loadedStatus, name: form.name, nextStatus: form.publishStatus });
    if (warning) setConfirm(warning);
    else void save();
  };

  const changeBenefit = (index, value) => update("benefits", form.benefits.map((item, itemIndex) => itemIndex === index ? { ...item, benefitText: value } : item));
  const moveBenefit = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= form.benefits.length) return;
    const benefits = [...form.benefits];
    [benefits[index], benefits[nextIndex]] = [benefits[nextIndex], benefits[index]];
    update("benefits", benefits.map((item, sortOrder) => ({ ...item, sortOrder })));
  };
  const updateMedia = (index, patch) => {
    setForm((current) => ({ ...current, media: current.media.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
    setErrors((current) => ({ ...current, media: undefined, [`media.${index}.publicUrl`]: undefined, [`media.${index}.altText`]: undefined }));
  };
  const removeMedia = (index) => {
    const media = form.media.filter((_, itemIndex) => itemIndex !== index);
    if (media.length && !media.some((item) => item.isPrimary)) media[0] = { ...media[0], isPrimary: true };
    update("media", media);
  };
  const setPrimary = (index) => update("media", form.media.map((item, itemIndex) => ({ ...item, isPrimary: itemIndex === index })));

  if (isEdit && detail.error) return <div className="space-y-5"><PageHeader title="Edit website product" /><WebsiteErrorState error={detail.error} onRetry={() => setLoadAttempt((value) => value + 1)} /><AppButton variant="secondary" onClick={() => navigate("/website/products")}><ArrowLeft className="h-4 w-4" /> Back to products</AppButton></div>;

  return (
    <form ref={formRef} className="space-y-6" onSubmit={submit} noValidate aria-busy={saving || uploading}>
      <PageHeader
        badge="Website catalogue"
        title={isEdit ? "Edit product" : "Add product"}
        description="Website catalogue. Not linked to ERP inventory or stock."
        actions={<><AppButton variant="secondary" onClick={() => navigate("/website/products")}><ArrowLeft className="h-4 w-4" /> Back</AppButton><GuardedButton type="submit" isLoading={saving || detail.loading} disabledReason={uploading ? "Wait for the image upload to finish." : saveDisabledReason}><Save className="h-4 w-4" /> Save product</GuardedButton></>}
      />
      <WebsitePageIntro>These values appear publicly. Confirm with the client before publishing.</WebsitePageIntro>
      <details className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-semibold">Review public product preview</summary><div className="mt-4"><WebsiteProductPreview product={form} /></div></details>
      {mediaIncomplete && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">The API returned only this product’s primary image, without its full gallery or alt text. Saving could remove existing images, so editing is paused until the API returns the complete image collection.</div>}
      {conflict ? <WebsiteConflictPanel current={conflict.current} mine={conflict.mine} resolving={saving} onUseSaved={() => applySaved(conflict.current)} onKeepMine={() => save({ ...conflict.mine, rowVersion: conflict.current.rowVersion })} /> : null}

      {uploading && <p role="status" className="rounded-xl bg-brand-light p-3 text-sm text-brand">Uploading and checking the image. Please wait before saving.</p>}
      {Object.values(errors).some(Boolean) && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><p className="font-semibold">Please correct these fields:</p><ul className="mt-1 list-inside list-disc">{Object.entries(errors).filter(([, error]) => error).map(([key, error]) => <li key={key}>{error}</li>)}</ul></div>}
      <fieldset disabled={saving || (isEdit && detail.loading)} className="min-w-0 space-y-6">
      <Section title="Basics">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AppInput label="Code" required maxLength={PRODUCT_TEXT_LIMITS.code} value={form.code} error={errors.code} onChange={(event) => update("code", event.target.value)} />
          <AppInput label="Name" required maxLength={PRODUCT_TEXT_LIMITS.name} value={form.name} error={errors.name} onChange={(event) => update("name", event.target.value)} />
          <AppInput label="Sort order" required type="number" min="0" max="100000" step="1" error={errors.sortOrder} value={form.sortOrder} onChange={(event) => update("sortOrder", event.target.value)} />
          <AppSelect label="Publish status" required error={errors.publishStatus} options={PUBLISH_STATUS_BODY_OPTIONS} value={form.publishStatus} onChange={(value) => update("publishStatus", value)} />
          <div className="md:col-span-2"><WebsiteToggle label="Active" helperText="Inactive products are withheld from public catalogue results." checked={form.isActive} onChange={(value) => update("isActive", value)} /></div>
          <div className="md:col-span-2 xl:col-span-3"><WebsiteTextarea id="product-description" label="Description" maxLength={PRODUCT_TEXT_LIMITS.description} value={form.description} error={errors.description} onChange={(event) => update("description", event.target.value)} /></div>
        </div>
      </Section>

      <Section title="Commercial" description="Public marketing and purchasing information. Leave unconfirmed values blank.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AppInput label="Display price" type="number" min="0" step="0.01" value={form.displayPrice} error={errors.displayPrice} onChange={(event) => update("displayPrice", event.target.value)} />
          <AppInput label="Currency code" maxLength={PRODUCT_TEXT_LIMITS.currencyCode} value={form.currencyCode} error={errors.currencyCode} onChange={(event) => update("currencyCode", event.target.value.toUpperCase())} />
          <AppInput label="Brand name" maxLength={PRODUCT_TEXT_LIMITS.brandName} value={form.brandName} error={errors.brandName} onChange={(event) => update("brandName", event.target.value)} />
          <AppInput label="Badge" maxLength={PRODUCT_TEXT_LIMITS.badge} value={form.badge} error={errors.badge} onChange={(event) => update("badge", event.target.value)} />
          <AppInput label="Urgency text" maxLength={PRODUCT_TEXT_LIMITS.urgencyText} value={form.urgencyText} error={errors.urgencyText} onChange={(event) => update("urgencyText", event.target.value)} />
          <AppInput label="Availability text" maxLength={PRODUCT_TEXT_LIMITS.availabilityText} value={form.availabilityText} error={errors.availabilityText} onChange={(event) => update("availabilityText", event.target.value)} />
          <div className="md:col-span-2 xl:col-span-3"><AppInput label="Amazon URL" type="url" maxLength={PRODUCT_TEXT_LIMITS.amazonUrl} value={form.amazonUrl} error={errors.amazonUrl} onChange={(event) => update("amazonUrl", event.target.value)} /></div>
        </div>
      </Section>

      <Section title="Used by the website comparison tool" description="These specifications feed the public product comparison experience.">
        <div className="grid gap-4 md:grid-cols-2">
          <AppInput label="Material" maxLength={PRODUCT_TEXT_LIMITS.material} value={form.material} error={errors.material} onChange={(event) => update("material", event.target.value)} />
          <AppInput label="Quantity display" maxLength={PRODUCT_TEXT_LIMITS.quantityDisplay} value={form.quantityDisplay} error={errors.quantityDisplay} onChange={(event) => update("quantityDisplay", event.target.value)} />
          <AppInput label="Warranty display" maxLength={PRODUCT_TEXT_LIMITS.warrantyDisplay} value={form.warrantyDisplay} error={errors.warrantyDisplay} onChange={(event) => update("warrantyDisplay", event.target.value)} />
          <div className="grid gap-3 sm:grid-cols-3 md:col-span-2">
            <WebsiteToggle label="UV resistant" checked={form.isUvResistant} onChange={(value) => update("isUvResistant", value)} />
            <WebsiteToggle label="Rust proof" checked={form.isRustProof} onChange={(value) => update("isRustProof", value)} />
            <WebsiteToggle label="Wind tested" checked={form.isWindTested} onChange={(value) => update("isWindTested", value)} />
          </div>
        </div>
      </Section>

      <Section title="Social proof">
        <div className="grid gap-4 md:grid-cols-2">
          <AppInput label="Rating" type="number" min="0" max="5" step="0.1" value={form.rating} error={errors.rating} onChange={(event) => update("rating", event.target.value)} />
          <AppInput label="Review count" type="number" min="0" max="2147483647" step="1" value={form.reviewCount} error={errors.reviewCount} onChange={(event) => update("reviewCount", event.target.value)} />
        </div>
      </Section>

      <Section title="Benefits" description="Short customer-facing reasons to choose this product.">
        <div className="space-y-3">
          {form.benefits.map((benefit, index) => <div key={index} className="flex items-start gap-2"><div className="flex-1"><AppInput aria-label={`Benefit ${index + 1}`} required maxLength={500} error={errors[`benefits.${index}.benefitText`]} value={benefit.benefitText} onChange={(event) => changeBenefit(index, event.target.value)} /></div><AppButton variant="ghost" aria-label="Move benefit up" disabled={index === 0} onClick={() => moveBenefit(index, -1)}><ArrowUp className="h-4 w-4" /></AppButton><AppButton variant="ghost" aria-label="Move benefit down" disabled={index === form.benefits.length - 1} onClick={() => moveBenefit(index, 1)}><ArrowDown className="h-4 w-4" /></AppButton><AppButton variant="ghost" aria-label="Remove benefit" onClick={() => update("benefits", form.benefits.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4 text-red-500" /></AppButton></div>)}
          <AppButton variant="secondary" onClick={() => update("benefits", [...form.benefits, { benefitText: "", sortOrder: form.benefits.length }])}><Plus className="h-4 w-4" /> Add benefit</AppButton>
        </div>
      </Section>

      <Section title="Media" description="Images are optional. If you add an image row, upload it or remove it before saving. Select one primary image for the catalogue.">
        {errors.media ? <p className="mb-3 text-xs font-medium text-red-600">{errors.media}</p> : null}
        <div className="grid gap-4 xl:grid-cols-2">
          {form.media.map((item, index) => <div key={index} className="rounded-xl border border-slate-200 p-4">
            <AppImageUpload disabled={!mediaCapabilities.canCreate || uploading || saving} required onUploadStateChange={setUploading} label={`Image ${index + 1}`} value={item.publicUrl} uploadHandler={websiteMediaService.uploadImage} onChange={(url) => updateMedia(index, { publicUrl: url })} error={errors[`media.${index}.publicUrl`]} />
            <div className="mt-3"><AppInput label="Alt text" helperText="Optional; describe the image for accessibility." maxLength={500} value={item.altText} error={errors[`media.${index}.altText`]} onChange={(event) => updateMedia(index, { altText: event.target.value })} /></div>
            <div className="mt-3 flex items-center justify-between"><label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="radio" name="primary-media" className="accent-brand" checked={item.isPrimary} onChange={() => setPrimary(index)} /> Primary image</label><AppButton variant="ghost" disabled={uploading} onClick={() => removeMedia(index)}><Trash2 className="h-4 w-4 text-red-500" /> Remove</AppButton></div>
          </div>)}
          <button type="button" disabled={!mediaCapabilities.canCreate || uploading} className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500 transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50" onClick={() => update("media", [...form.media.map((item) => ({ ...item, isPrimary: form.media.length ? item.isPrimary : false })), { altText: "", isPrimary: form.media.length === 0, publicUrl: "", sortOrder: form.media.length }])}><span className="flex flex-col items-center gap-2"><ImagePlus className="h-6 w-6" /> Add image</span></button>
        </div>
      </Section>

      </fieldset>
      <div className="sticky bottom-4 flex justify-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"><AppButton variant="secondary" onClick={() => navigate("/website/products")}>Cancel</AppButton><GuardedButton type="submit" isLoading={saving} disabledReason={uploading ? "Wait for the image upload to finish." : saveDisabledReason}><Save className="h-4 w-4" /> Save product</GuardedButton></div>
      <WebsiteConfirmModal isOpen={Boolean(confirm)} isLoading={saving} title="Confirm public website change" description={confirm} confirmLabel="Save and continue" onClose={() => setConfirm(null)} onConfirm={() => save()} />
    </form>
  );
};

export default WebsiteProductFormPage;
