import { ArrowDown, ArrowLeft, ArrowUp, ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppImageUpload from "../../../components/common/AppImageUpload";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import { WEBSITE_PUBLISH_STATUS } from "../../../constants/websiteEnums";
import { websiteMediaService, websiteProductService } from "../../../services/website/websiteService";
import { clearWebsiteProductDetail, fetchWebsiteProductById, fetchWebsiteProducts } from "../../../store/slices/website/websiteSlice";
import { getApiErrorMessage, getApiFieldErrors, isConflictError } from "../../../utils/apiError";
import { mapProductBenefitsFromResponse, mapProductBenefitsToRequest, validateProductMedia } from "../../../utils/websiteContent";
import { PUBLISH_STATUS_BODY_OPTIONS, getPublishStatusName, getPublishTransitionWarning } from "../websiteStatus";
import useWebsiteCapabilities from "../useWebsiteCapabilities";
import { GuardedButton, WebsiteConflictPanel, WebsiteConfirmModal, WebsiteErrorState, WebsitePageIntro, WebsiteTextarea, WebsiteToggle } from "../WebsiteShared";

const EMPTY_FORM = {
  amazonUrl: "", availabilityText: "", badge: "", benefits: [], brandName: "", code: "",
  currencyCode: "INR", description: "", displayPrice: "", isActive: true, isRustProof: false,
  isUvResistant: false, isWindTested: false, material: "", media: [], name: "", publishStatus: WEBSITE_PUBLISH_STATUS.Draft,
  quantityDisplay: "", rating: "", reviewCount: "", rowVersion: null, sortOrder: 0, urgencyText: "", warrantyDisplay: "",
};

const toForm = (record = {}) => ({
  ...EMPTY_FORM,
  ...record,
  benefits: mapProductBenefitsFromResponse(record.benefits),
  publishStatus: WEBSITE_PUBLISH_STATUS[getPublishStatusName(record.publishStatus)] ?? WEBSITE_PUBLISH_STATUS.Draft,
  // BACKEND: WebsiteProductDto does not expose the complete media collection. Preserve the
  // declared primary URL for editing, but the API must return media ids/alt text for lossless edits.
  media: Array.isArray(record.media)
    ? record.media
    : record.primaryImageUrl
      ? [{ altText: "", isPrimary: true, publicUrl: record.primaryImageUrl, sortOrder: 0 }]
      : [],
});

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
  const saveDisabledReason = (isEdit ? capabilities.canEdit : capabilities.canCreate)
    ? ""
    : `You need ${isEdit ? "edit" : "create"} permission for website products.`;
  const detail = useSelector((state) => state.website.productDetail);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [conflict, setConflict] = useState(null);
  const [loadedStatus, setLoadedStatus] = useState("Draft");

  useEffect(() => {
    if (!isEdit) return undefined;
    const request = dispatch(fetchWebsiteProductById(id));
    request.unwrap().then((response) => {
      setForm(toForm(response.data));
      setLoadedStatus(getPublishStatusName(response.data?.publishStatus));
    }).catch((error) => {
      if (error?.name !== "AbortError") toast.error(getApiErrorMessage(error, "Unable to load this website product."));
    });
    return () => request.abort();
  }, [dispatch, id, isEdit]);
  useEffect(() => () => dispatch(clearWebsiteProductDetail()), [dispatch]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const payload = useMemo(() => ({
    ...form,
    benefits: mapProductBenefitsToRequest(form.benefits),
    displayPrice: form.displayPrice === "" ? null : Number(form.displayPrice),
    rating: form.rating === "" ? null : Number(form.rating),
    reviewCount: form.reviewCount === "" ? null : Number(form.reviewCount),
    sortOrder: Number(form.sortOrder) || 0,
    media: form.media.filter((item) => item.publicUrl).map((item, index) => ({ ...item, altText: item.altText.trim(), sortOrder: index })),
  }), [form]);

  const validate = () => {
    const next = validateProductMedia(form.media);
    if (!form.code.trim()) next.code = "Code is required.";
    if (!form.name.trim()) next.name = "Name is required.";
    if (form.rating !== "" && (Number(form.rating) < 0 || Number(form.rating) > 5)) next.rating = "Rating must be between 0 and 5.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const applySaved = useCallback((record) => {
    if (!record) return;
    setForm(toForm(record));
    setLoadedStatus(getPublishStatusName(record.publishStatus));
    setConflict(null);
  }, []);

  const save = async (overridePayload = payload) => {
    setSaving(true);
    setErrors({});
    try {
      const response = isEdit
        ? await websiteProductService.update(id, overridePayload)
        : await websiteProductService.create(overridePayload);
      applySaved(response.data);
      dispatch(fetchWebsiteProducts({ pageNumber: 1, pageSize: 25 }));
      toast.success(isEdit ? "Website product saved" : "Website product created");
      if (!isEdit && response.data?.id) navigate(`/website/products/${response.data.id}/edit`, { replace: true });
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
  const updateMedia = (index, patch) => update("media", form.media.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const setPrimary = (index) => update("media", form.media.map((item, itemIndex) => ({ ...item, isPrimary: itemIndex === index })));

  if (isEdit && detail.error) return <div className="space-y-5"><PageHeader title="Edit website product" /><WebsiteErrorState error={detail.error} onRetry={() => dispatch(fetchWebsiteProductById(id))} /><AppButton variant="secondary" onClick={() => navigate("/website/products")}><ArrowLeft className="h-4 w-4" /> Back to products</AppButton></div>;

  return (
    <form className="space-y-6" onSubmit={submit} noValidate>
      <PageHeader
        badge="Website catalogue"
        title={isEdit ? "Edit product" : "Add product"}
        description="Website catalogue. Not linked to ERP inventory or stock."
        actions={<><AppButton variant="secondary" onClick={() => navigate("/website/products")}><ArrowLeft className="h-4 w-4" /> Back</AppButton><GuardedButton type="submit" isLoading={saving || detail.loading} disabledReason={saveDisabledReason}><Save className="h-4 w-4" /> Save product</GuardedButton></>}
      />
      <WebsitePageIntro>These values appear publicly. Confirm with the client before publishing.</WebsitePageIntro>
      {conflict ? <WebsiteConflictPanel current={conflict.current} mine={conflict.mine} resolving={saving} onUseSaved={() => applySaved(conflict.current)} onKeepMine={() => save({ ...conflict.mine, rowVersion: conflict.current.rowVersion })} /> : null}

      <Section title="Basics">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AppInput label="Code" required value={form.code} error={errors.code} onChange={(event) => update("code", event.target.value)} />
          <AppInput label="Name" required value={form.name} error={errors.name} onChange={(event) => update("name", event.target.value)} />
          <AppInput label="Sort order" type="number" value={form.sortOrder} onChange={(event) => update("sortOrder", event.target.value)} />
          <AppSelect label="Publish status" options={PUBLISH_STATUS_BODY_OPTIONS} value={form.publishStatus} onChange={(value) => update("publishStatus", value)} />
          <div className="md:col-span-2"><WebsiteToggle label="Active" helperText="Inactive products are withheld from public catalogue results." checked={form.isActive} onChange={(value) => update("isActive", value)} /></div>
          <div className="md:col-span-2 xl:col-span-3"><WebsiteTextarea id="product-description" label="Description" value={form.description} onChange={(event) => update("description", event.target.value)} /></div>
        </div>
      </Section>

      <Section title="Commercial" description="Public marketing and purchasing information. Leave unconfirmed values blank.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AppInput label="Display price" type="number" min="0" step="0.01" value={form.displayPrice} error={errors.displayPrice} onChange={(event) => update("displayPrice", event.target.value)} />
          <AppInput label="Currency code" value={form.currencyCode} onChange={(event) => update("currencyCode", event.target.value.toUpperCase())} />
          <AppInput label="Brand name" value={form.brandName} onChange={(event) => update("brandName", event.target.value)} />
          <AppInput label="Badge" value={form.badge} onChange={(event) => update("badge", event.target.value)} />
          <AppInput label="Urgency text" value={form.urgencyText} onChange={(event) => update("urgencyText", event.target.value)} />
          <AppInput label="Availability text" value={form.availabilityText} onChange={(event) => update("availabilityText", event.target.value)} />
          <div className="md:col-span-2 xl:col-span-3"><AppInput label="Amazon URL" type="url" value={form.amazonUrl} error={errors.amazonUrl} onChange={(event) => update("amazonUrl", event.target.value)} /></div>
        </div>
      </Section>

      <Section title="Used by the website comparison tool" description="These specifications feed the public product comparison experience.">
        <div className="grid gap-4 md:grid-cols-2">
          <AppInput label="Material" value={form.material} onChange={(event) => update("material", event.target.value)} />
          <AppInput label="Quantity display" value={form.quantityDisplay} onChange={(event) => update("quantityDisplay", event.target.value)} />
          <AppInput label="Warranty display" value={form.warrantyDisplay} onChange={(event) => update("warrantyDisplay", event.target.value)} />
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
          <AppInput label="Review count" type="number" min="0" value={form.reviewCount} error={errors.reviewCount} onChange={(event) => update("reviewCount", event.target.value)} />
        </div>
      </Section>

      <Section title="Benefits" description="Short customer-facing reasons to choose this product.">
        <div className="space-y-3">
          {form.benefits.map((benefit, index) => <div key={index} className="flex items-start gap-2"><div className="flex-1"><AppInput aria-label={`Benefit ${index + 1}`} value={benefit.benefitText} onChange={(event) => changeBenefit(index, event.target.value)} /></div><AppButton variant="ghost" aria-label="Move benefit up" disabled={index === 0} onClick={() => moveBenefit(index, -1)}><ArrowUp className="h-4 w-4" /></AppButton><AppButton variant="ghost" aria-label="Move benefit down" disabled={index === form.benefits.length - 1} onClick={() => moveBenefit(index, 1)}><ArrowDown className="h-4 w-4" /></AppButton><AppButton variant="ghost" aria-label="Remove benefit" onClick={() => update("benefits", form.benefits.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4 text-red-500" /></AppButton></div>)}
          <AppButton variant="secondary" onClick={() => update("benefits", [...form.benefits, { benefitText: "", sortOrder: form.benefits.length }])}><Plus className="h-4 w-4" /> Add benefit</AppButton>
        </div>
      </Section>

      <Section title="Media" description="Use meaningful alt text for every public image. Exactly one uploaded image must be primary.">
        {errors.media ? <p className="mb-3 text-xs font-medium text-red-600">{errors.media}</p> : null}
        <div className="grid gap-4 xl:grid-cols-2">
          {form.media.map((item, index) => <div key={`${item.publicUrl}-${index}`} className="rounded-xl border border-slate-200 p-4">
            <AppImageUpload disabled={!mediaCapabilities.canCreate} label={`Image ${index + 1}`} value={item.publicUrl} uploadHandler={websiteMediaService.uploadImage} onChange={(url) => updateMedia(index, { publicUrl: url })} error={errors[`media.${index}.publicUrl`]} />
            <div className="mt-3"><AppInput label="Alt text" required value={item.altText} error={errors[`media.${index}.altText`]} onChange={(event) => updateMedia(index, { altText: event.target.value })} /></div>
            <div className="mt-3 flex items-center justify-between"><label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="radio" name="primary-media" className="accent-brand" checked={item.isPrimary} onChange={() => setPrimary(index)} /> Primary image</label><AppButton variant="ghost" onClick={() => update("media", form.media.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4 text-red-500" /> Remove</AppButton></div>
          </div>)}
          <button type="button" disabled={!mediaCapabilities.canCreate} className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500 transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50" onClick={() => update("media", [...form.media.map((item) => ({ ...item, isPrimary: form.media.length ? item.isPrimary : false })), { altText: "", isPrimary: form.media.length === 0, publicUrl: "", sortOrder: form.media.length }])}><span className="flex flex-col items-center gap-2"><ImagePlus className="h-6 w-6" /> Add image</span></button>
        </div>
      </Section>

      <div className="sticky bottom-4 flex justify-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"><AppButton variant="secondary" onClick={() => navigate("/website/products")}>Cancel</AppButton><GuardedButton type="submit" isLoading={saving} disabledReason={saveDisabledReason}><Save className="h-4 w-4" /> Save product</GuardedButton></div>
      <WebsiteConfirmModal isOpen={Boolean(confirm)} isLoading={saving} title="Confirm public website change" description={confirm} confirmLabel="Save and continue" onClose={() => setConfirm(null)} onConfirm={() => save()} />
    </form>
  );
};

export default WebsiteProductFormPage;
