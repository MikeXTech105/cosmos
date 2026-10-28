import { ArrowLeft, Eye, FileText, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppImageUpload from "../../../components/common/AppImageUpload";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import AppModal from "../../../components/common/AppModal";
import PageHeader from "../../../components/common/PageHeader";
import { WEBSITE_PUBLISH_STATUS } from "../../../constants/websiteEnums";
import { websiteBlogService, websiteMediaService } from "../../../services/website/websiteService";
import { fetchWebsiteBlogCategories, fetchWebsiteBlogPosts } from "../../../store/slices/website/websiteSlice";
import { getApiErrorMessage, getApiFieldErrors, isConflictError } from "../../../utils/apiError";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { slugifyWebsiteTitle } from "../../../utils/websiteContent";
import { PUBLISH_STATUS_BODY_OPTIONS, getPublishStatusName, getPublishTransitionWarning } from "../websiteStatus";
import useWebsiteCapabilities from "../useWebsiteCapabilities";
import { GuardedButton, WebsiteConflictPanel, WebsiteConfirmModal, WebsiteErrorState, WebsiteTextarea, WebsiteToggle } from "../WebsiteShared";
import useProductionRuntime from "../../../hooks/useProductionRuntime";
import { websiteDateTimeInput, websiteScheduleUtc } from "../websiteScheduling";
import { WebsiteArticlePreview } from "../WebsiteContentPreview";
import useUnsavedChanges from "../../../hooks/useUnsavedChanges";
import { withoutDirtyPrompt } from "../../../utils/dirtyWork";

const EMPTY_FORM = {
  categoryId: "", content: "", coverImageUrl: "", excerpt: "", isFeatured: false,
  openGraphImageUrl: "", publishedAtUtc: "", publishStatus: WEBSITE_PUBLISH_STATUS.Draft,
  readTime: "", rowVersion: null, seoDescription: "", seoTitle: "", slug: "", sortOrder: 0, title: "",
};
const toForm = (record = {}, zone) => ({
  ...EMPTY_FORM,
  ...record,
  coverImageUrl: resolveMediaUrl(
    record.coverImageUrl ??
      record.coverImageURL ??
      record.coverUrl ??
      record.imageUrl ??
      record.imagePath,
  ),
  publishStatus: WEBSITE_PUBLISH_STATUS[getPublishStatusName(record.publishStatus)] ?? WEBSITE_PUBLISH_STATUS.Draft,
  publishedAtUtc: websiteDateTimeInput(record.publishedAtUtc, zone),
  originalPublishedAtUtc: record.publishedAtUtc ?? null,
  slugTouched: Boolean(record.id),
});
const Section = ({ children, description, title }) => <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-base font-semibold text-slate-900">{title}</h2>{description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}<div className="mt-5">{children}</div></section>;

// BACKEND: GET /blog-posts/{id} response fields remain unverified because the live API
// required an authenticated session. The adapter preserves all received fields unchanged.
const WebsiteBlogPostFormPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { runtime, loading: runtimeLoading, error: runtimeError } = useProductionRuntime();
  const websiteCapabilities = useWebsiteCapabilities();
  const capabilities = websiteCapabilities.blogs;
  const mediaCapabilities = websiteCapabilities.media;
  const saveDisabledReason = (isEdit ? capabilities.canEdit : capabilities.canCreate)
    ? ""
    : `You need ${isEdit ? "edit" : "create"} permission for website blog posts.`;
  const { categories, categoriesError } = useSelector((state) => state.website.blog);
  const [form, setForm] = useState(EMPTY_FORM);
  const [savedFingerprint, setSavedFingerprint] = useState(() => JSON.stringify(EMPTY_FORM));
  const [categoryDraft, setCategoryDraft] = useState(null);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [createdCategories, setCreatedCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [conflict, setConflict] = useState(null);
  const [loadedStatus, setLoadedStatus] = useState("Draft");
  useUnsavedChanges({ when: JSON.stringify(form) !== savedFingerprint || saving || categorySaving });

  useEffect(() => {
    const request = dispatch(fetchWebsiteBlogCategories());
    return () => request.abort();
  }, [dispatch]);
  useEffect(() => {
    if (!isEdit || runtimeLoading) return;
    const controller = new AbortController();
    websiteBlogService.getPostById(id, { signal: controller.signal })
      .then((response) => {
        const next = toForm(response.data, runtime?.browserTimeZone);
        setForm(next); setSavedFingerprint(JSON.stringify(next));
        setLoadedStatus(getPublishStatusName(response.data?.publishStatus));
        setLoadError(null);
      })
      .catch((error) => {
        if (error?.name !== "CanceledError") setLoadError({ message: getApiErrorMessage(error, "Unable to load this post."), status: error?.response?.status, correlationId: error?.response?.data?.correlationId });
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [id, isEdit, runtime?.browserTimeZone, runtimeLoading]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const buildPayload = (source = form) => {
    const payload = { ...source, categoryId: source.categoryId || null, publishedAtUtc: runtime?.browserTimeZone ? websiteScheduleUtc(source.publishedAtUtc, runtime.browserTimeZone) : source.originalPublishedAtUtc ?? null, sortOrder: Number(source.sortOrder) || 0 };
    delete payload.id;
    delete payload.slugTouched;
    delete payload.originalPublishedAtUtc;
    return payload;
  };
  const applySaved = (record) => {
    const next = toForm(record, runtime?.browserTimeZone);
    setForm(next); setSavedFingerprint(JSON.stringify(next));
    setLoadedStatus(getPublishStatusName(record.publishStatus));
    setConflict(null);
  };
  const save = async (source = form) => {
    let payload;
    try { payload = buildPayload(source); } catch (error) { setErrors({ publishedAtUtc: error.message }); return; }
    setSaving(true);
    try {
      const response = isEdit ? await websiteBlogService.updatePost(id, payload) : await websiteBlogService.createPost(payload);
      applySaved(response.data);
      dispatch(fetchWebsiteBlogPosts({ PageNumber: 1, PageSize: 25 }));
      toast.success(isEdit ? "Blog post saved" : "Blog post created");
      if (!isEdit && response.data?.id) withoutDirtyPrompt(() => navigate(`/website/blog/${response.data.id}/edit`, { replace: true }));
    } catch (error) {
      if (isConflictError(error) && isEdit) {
        try {
          const current = await websiteBlogService.getPostById(id);
          setConflict({ current: current.data, mine: source });
        } catch (refreshError) {
          toast.error(getApiErrorMessage(refreshError, "Unable to load the saved version."));
        }
      } else {
        const fields = getApiFieldErrors(error);
        if (isConflictError(error)) fields.slug = getApiErrorMessage(error, "This slug is already in use.");
        setErrors(fields);
        toast.error(getApiErrorMessage(error, "Unable to save this blog post."));
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
    const next = {};
    if (!form.title.trim()) next.title = "Title is required.";
    if (!form.slug.trim()) next.slug = "Slug is required.";
    if (!form.content.trim()) next.content = "Content is required.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const warning = getPublishTransitionWarning({ currentStatus: loadedStatus, name: form.title, nextStatus: form.publishStatus });
    if (warning) setConfirm(warning);
    else void save();
  };
  const categoryOptions = [...new Map([...categories, ...createdCategories].map((category) => [String(category.id), { label: category.name, value: category.id }])).values()];

  if (loadError) return <div className="space-y-5"><PageHeader title="Edit blog post" /><WebsiteErrorState error={loadError} onRetry={() => window.location.reload()} /><AppButton variant="secondary" onClick={() => navigate("/website/blog")}><ArrowLeft className="h-4 w-4" /> Back to blog</AppButton></div>;

  return (
    <form className="space-y-6" onSubmit={submit} noValidate>
      <PageHeader badge="Website blog" title={isEdit ? "Edit post" : "Add post"} description="Write a draft, review its preview, then choose when to publish." actions={<><AppButton variant="secondary" onClick={() => navigate("/website/blog")}><ArrowLeft className="h-4 w-4" /> Back</AppButton><GuardedButton type="submit" isLoading={saving || loading} disabledReason={saveDisabledReason}><Save className="h-4 w-4" /> Save post</GuardedButton></>} />
      <WebsiteErrorState error={categoriesError} onRetry={() => dispatch(fetchWebsiteBlogCategories())} />
      {conflict ? <WebsiteConflictPanel current={conflict.current} mine={conflict.mine} resolving={saving} onUseSaved={() => applySaved(conflict.current)} onKeepMine={() => save({ ...conflict.mine, rowVersion: conflict.current.rowVersion })} /> : null}
      <Section title="Content">
        <div className="grid gap-4 lg:grid-cols-2">
          <AppInput label="Title" required value={form.title} error={errors.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value, slug: current.slugTouched ? current.slug : slugifyWebsiteTitle(event.target.value) }))} />
          <AppInput label="Slug" required value={form.slug} error={errors.slug} onChange={(event) => setForm((current) => ({ ...current, slug: slugifyWebsiteTitle(event.target.value), slugTouched: true }))} helperText={`Preview: wewel.in/blog/${form.slug || "your-post"}`} />
          <div className="lg:col-span-2"><WebsiteTextarea id="blog-excerpt" label="Excerpt" value={form.excerpt} onChange={(event) => update("excerpt", event.target.value)} /></div>
          <AppSelect id="blog-category" label="Category" placeholder="Choose a category" options={categoryOptions} value={form.categoryId} error={errors.categoryId} onChange={(value) => update("categoryId", value)} creatable={capabilities.canCreate} createLabel="Create blog category" onCreateClick={() => { setCategoryDraft({ name: "", slug: "" }); setCategoryError(""); }} />
          <AppInput label="Read time" placeholder="e.g. 5 min read" value={form.readTime} onChange={(event) => update("readTime", event.target.value)} />
          <AppInput label="Sort order" type="number" value={form.sortOrder} onChange={(event) => update("sortOrder", event.target.value)} />
          <WebsiteToggle label="Featured post" checked={form.isFeatured} onChange={(value) => update("isFeatured", value)} />
          <div className="lg:col-span-2"><AppImageUpload disabled={!mediaCapabilities.canCreate} label="Cover image" value={form.coverImageUrl} uploadHandler={websiteMediaService.uploadImage} onChange={(value) => update("coverImageUrl", value)} error={errors.coverImageUrl} /></div>
          <div className="lg:col-span-2">
            <div className="mb-1.5 flex items-center justify-between"><label htmlFor="blog-content" className="text-[13px] font-medium text-slate-700">Content<span className="ml-0.5 text-red-500">*</span></label><AppButton variant="ghost" className="h-8 px-3 text-xs" onClick={() => setPreview((value) => !value)}><Eye className="h-4 w-4" /> {preview ? "Edit" : "Preview"}</AppButton></div>
            {preview ? <WebsiteArticlePreview title={form.title} excerpt={form.excerpt} coverImageUrl={form.coverImageUrl} content={form.content} /> : <textarea id="blog-content" required value={form.content} onChange={(event) => update("content", event.target.value)} className={`min-h-80 w-full resize-y rounded-xl border bg-white p-4 font-mono text-sm leading-6 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 ${errors.content ? "border-red-400" : "border-slate-200"}`} />}
            <div className="mt-1.5 flex justify-between gap-3 text-xs text-slate-500"><span>Use headings, lists, emphasis and links. Preview before publishing.</span><span className="tabular-nums">{form.content.length} characters</span></div>{errors.content ? <p className="mt-1 text-xs text-red-600">{errors.content}</p> : null}
          </div>
        </div>
      </Section>
      <Section title="Publishing"><div className="grid gap-4 md:grid-cols-2"><AppSelect label="Publish status" options={PUBLISH_STATUS_BODY_OPTIONS} value={form.publishStatus} onChange={(value) => update("publishStatus", value)} /><AppInput label={`Published at (${runtime?.browserTimeZone || "company timezone unavailable"})`} disabled={!runtime?.browserTimeZone} type="datetime-local" value={form.publishedAtUtc} error={errors.publishedAtUtc} onChange={(event) => update("publishedAtUtc", event.target.value)} /></div><p className="mt-3 text-xs text-slate-500">{runtime?.browserTimeZone ? `Enter the company's local time in ${runtime.browserTimeZone}. ${form.publishedAtUtc ? `Scheduled for ${form.publishedAtUtc.replace("T", " ")}.` : "No scheduled time selected."}` : `Existing schedules are retained. Ask your administrator to load company timezone settings. ${runtimeError || ""}`}</p></Section>
      <Section title="SEO"><div className="grid gap-4 lg:grid-cols-2"><AppInput label="SEO title" value={form.seoTitle} onChange={(event) => update("seoTitle", event.target.value)} /><div className="lg:col-span-2"><WebsiteTextarea id="seo-description" label="SEO description" value={form.seoDescription} onChange={(event) => update("seoDescription", event.target.value)} /></div><div className="lg:col-span-2"><AppImageUpload disabled={!mediaCapabilities.canCreate} label="Open Graph image" value={form.openGraphImageUrl} uploadHandler={websiteMediaService.uploadImage} onChange={(value) => update("openGraphImageUrl", value)} /></div></div></Section>
      <div className="sticky bottom-4 flex justify-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"><AppButton variant="secondary" onClick={() => navigate("/website/blog")}>Cancel</AppButton><GuardedButton type="submit" isLoading={saving} disabledReason={saveDisabledReason}><FileText className="h-4 w-4" /> Save post</GuardedButton></div>
      <WebsiteConfirmModal isOpen={Boolean(confirm)} isLoading={saving} title="Confirm public website change" description={confirm} confirmLabel="Save and continue" onClose={() => setConfirm(null)} onConfirm={() => save()} />
      <AppModal isOpen={Boolean(categoryDraft)} isBusy={categorySaving} title="Create blog category" onClose={() => { if (!categorySaving && (!categoryDraft?.name || window.confirm("Discard this unsaved category?"))) setCategoryDraft(null); }}>
        {categoryDraft && <div className="space-y-4"><AppInput label="Category name" required disabled={categorySaving} value={categoryDraft.name} onChange={(event) => setCategoryDraft({ name: event.target.value, slug: slugifyWebsiteTitle(event.target.value) })} /><AppInput label="Category URL name" required disabled={categorySaving} value={categoryDraft.slug} onChange={(event) => setCategoryDraft((current) => ({ ...current, slug: slugifyWebsiteTitle(event.target.value) }))} />{categoryError && <p role="alert" className="text-sm text-red-700">{categoryError}</p>}<AppButton isLoading={categorySaving} disabled={!categoryDraft.name.trim() || !categoryDraft.slug.trim()} onClick={async () => { setCategorySaving(true); setCategoryError(""); try { const response = await websiteBlogService.createCategory({ ...categoryDraft, description: null, sortOrder: 0, isActive: true }); const category = response.data; if (!category?.id) throw new Error("The saved category could not be selected. Refresh categories before trying again."); setCreatedCategories((current) => [...current, category]); update("categoryId", category.id); setCategoryDraft(null); void dispatch(fetchWebsiteBlogCategories()); window.setTimeout(() => document.getElementById("blog-category")?.focus(), 0); } catch (error) { setCategoryError(getApiErrorMessage(error, "Unable to save category.")); } finally { setCategorySaving(false); } }}>Save and select category</AppButton></div>}
      </AppModal>
    </form>
  );
};

export default WebsiteBlogPostFormPage;
