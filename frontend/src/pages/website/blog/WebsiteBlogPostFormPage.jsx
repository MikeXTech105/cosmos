import { ArrowLeft, Eye, FileText, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppImageUpload from "../../../components/common/AppImageUpload";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
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

const EMPTY_FORM = {
  categoryId: "", content: "", coverImageUrl: "", excerpt: "", isFeatured: false,
  openGraphImageUrl: "", publishedAtUtc: "", publishStatus: WEBSITE_PUBLISH_STATUS.Draft,
  readTime: "", rowVersion: null, seoDescription: "", seoTitle: "", slug: "", sortOrder: 0, title: "",
};
const toLocalDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
const toForm = (record = {}) => ({
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
  publishedAtUtc: toLocalDateTime(record.publishedAtUtc),
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
  const websiteCapabilities = useWebsiteCapabilities();
  const capabilities = websiteCapabilities.blogs;
  const mediaCapabilities = websiteCapabilities.media;
  const saveDisabledReason = (isEdit ? capabilities.canEdit : capabilities.canCreate)
    ? ""
    : `You need ${isEdit ? "edit" : "create"} permission for website blog posts.`;
  const { categories, categoriesError } = useSelector((state) => state.website.blog);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [conflict, setConflict] = useState(null);
  const [loadedStatus, setLoadedStatus] = useState("Draft");

  useEffect(() => {
    const request = dispatch(fetchWebsiteBlogCategories());
    return () => request.abort();
  }, [dispatch]);
  useEffect(() => {
    if (!isEdit) return;
    const controller = new AbortController();
    websiteBlogService.getPostById(id, { signal: controller.signal })
      .then((response) => {
        setForm(toForm(response.data));
        setLoadedStatus(getPublishStatusName(response.data?.publishStatus));
        setLoadError(null);
      })
      .catch((error) => {
        if (error?.name !== "CanceledError") setLoadError({ message: getApiErrorMessage(error, "Unable to load this post."), status: error?.response?.status, correlationId: error?.response?.data?.correlationId });
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [id, isEdit]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const buildPayload = (source = form) => {
    const payload = { ...source, categoryId: source.categoryId ? Number(source.categoryId) : null, publishedAtUtc: source.publishedAtUtc ? new Date(source.publishedAtUtc).toISOString() : null, sortOrder: Number(source.sortOrder) || 0 };
    delete payload.id;
    delete payload.slugTouched;
    return payload;
  };
  const applySaved = (record) => {
    setForm(toForm(record));
    setLoadedStatus(getPublishStatusName(record.publishStatus));
    setConflict(null);
  };
  const save = async (source = form) => {
    const payload = buildPayload(source);
    setSaving(true);
    try {
      const response = isEdit ? await websiteBlogService.updatePost(id, payload) : await websiteBlogService.createPost(payload);
      applySaved(response.data);
      dispatch(fetchWebsiteBlogPosts({ PageNumber: 1, PageSize: 25 }));
      toast.success(isEdit ? "Blog post saved" : "Blog post created");
      if (!isEdit && response.data?.id) navigate(`/website/blog/${response.data.id}/edit`, { replace: true });
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
  const categoryOptions = categories.map((category) => ({ label: category.name, value: category.id }));

  if (loadError) return <div className="space-y-5"><PageHeader title="Edit blog post" /><WebsiteErrorState error={loadError} onRetry={() => window.location.reload()} /><AppButton variant="secondary" onClick={() => navigate("/website/blog")}><ArrowLeft className="h-4 w-4" /> Back to blog</AppButton></div>;

  return (
    <form className="space-y-6" onSubmit={submit} noValidate>
      <PageHeader badge="Website blog" title={isEdit ? "Edit post" : "Add post"} description="Create public stories without changing the stored plain/Markdown text format." actions={<><AppButton variant="secondary" onClick={() => navigate("/website/blog")}><ArrowLeft className="h-4 w-4" /> Back</AppButton><GuardedButton type="submit" isLoading={saving || loading} disabledReason={saveDisabledReason}><Save className="h-4 w-4" /> Save post</GuardedButton></>} />
      <WebsiteErrorState error={categoriesError} onRetry={() => dispatch(fetchWebsiteBlogCategories())} />
      {conflict ? <WebsiteConflictPanel current={conflict.current} mine={conflict.mine} resolving={saving} onUseSaved={() => applySaved(conflict.current)} onKeepMine={() => save({ ...conflict.mine, rowVersion: conflict.current.rowVersion })} /> : null}
      <Section title="Content">
        <div className="grid gap-4 lg:grid-cols-2">
          <AppInput label="Title" required value={form.title} error={errors.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value, slug: current.slugTouched ? current.slug : slugifyWebsiteTitle(event.target.value) }))} />
          <AppInput label="Slug" required value={form.slug} error={errors.slug} onChange={(event) => setForm((current) => ({ ...current, slug: slugifyWebsiteTitle(event.target.value), slugTouched: true }))} helperText={`Preview: wewel.in/blog/${form.slug || "your-post"}`} />
          <div className="lg:col-span-2"><WebsiteTextarea id="blog-excerpt" label="Excerpt" value={form.excerpt} onChange={(event) => update("excerpt", event.target.value)} /></div>
          <AppSelect label="Category" placeholder="Choose a category" options={categoryOptions} value={form.categoryId} error={errors.categoryId} onChange={(value) => update("categoryId", value)} />
          <AppInput label="Read time" placeholder="e.g. 5 min read" value={form.readTime} onChange={(event) => update("readTime", event.target.value)} />
          <AppInput label="Sort order" type="number" value={form.sortOrder} onChange={(event) => update("sortOrder", event.target.value)} />
          <WebsiteToggle label="Featured post" checked={form.isFeatured} onChange={(value) => update("isFeatured", value)} />
          <div className="lg:col-span-2"><AppImageUpload disabled={!mediaCapabilities.canCreate} label="Cover image" value={form.coverImageUrl} uploadHandler={websiteMediaService.uploadImage} onChange={(value) => update("coverImageUrl", value)} error={errors.coverImageUrl} /></div>
          <div className="lg:col-span-2">
            <div className="mb-1.5 flex items-center justify-between"><label htmlFor="blog-content" className="text-[13px] font-medium text-slate-700">Content<span className="ml-0.5 text-red-500">*</span></label><AppButton variant="ghost" className="h-8 px-3 text-xs" onClick={() => setPreview((value) => !value)}><Eye className="h-4 w-4" /> {preview ? "Edit" : "Preview"}</AppButton></div>
            {preview ? <div className="min-h-80 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">{form.content || "Nothing to preview yet."}</div> : <textarea id="blog-content" required value={form.content} onChange={(event) => update("content", event.target.value)} className={`min-h-80 w-full resize-y rounded-xl border bg-white p-4 font-mono text-sm leading-6 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 ${errors.content ? "border-red-400" : "border-slate-200"}`} />}
            <div className="mt-1.5 flex justify-between gap-3 text-xs text-slate-500"><span>Body is stored as plain/Markdown text and rendered by the website.</span><span className="tabular-nums">{form.content.length} characters</span></div>{errors.content ? <p className="mt-1 text-xs text-red-600">{errors.content}</p> : null}
          </div>
        </div>
      </Section>
      <Section title="Publishing"><div className="grid gap-4 md:grid-cols-2"><AppSelect label="Publish status" options={PUBLISH_STATUS_BODY_OPTIONS} value={form.publishStatus} onChange={(value) => update("publishStatus", value)} /><AppInput label="Published at (UTC)" type="datetime-local" value={form.publishedAtUtc} onChange={(event) => update("publishedAtUtc", event.target.value)} /></div></Section>
      <Section title="SEO"><div className="grid gap-4 lg:grid-cols-2"><AppInput label="SEO title" value={form.seoTitle} onChange={(event) => update("seoTitle", event.target.value)} /><div className="lg:col-span-2"><WebsiteTextarea id="seo-description" label="SEO description" value={form.seoDescription} onChange={(event) => update("seoDescription", event.target.value)} /></div><div className="lg:col-span-2"><AppImageUpload disabled={!mediaCapabilities.canCreate} label="Open Graph image" value={form.openGraphImageUrl} uploadHandler={websiteMediaService.uploadImage} onChange={(value) => update("openGraphImageUrl", value)} /></div></div></Section>
      <div className="sticky bottom-4 flex justify-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"><AppButton variant="secondary" onClick={() => navigate("/website/blog")}>Cancel</AppButton><GuardedButton type="submit" isLoading={saving} disabledReason={saveDisabledReason}><FileText className="h-4 w-4" /> Save post</GuardedButton></div>
      <WebsiteConfirmModal isOpen={Boolean(confirm)} isLoading={saving} title="Confirm public website change" description={confirm} confirmLabel="Save and continue" onClose={() => setConfirm(null)} onConfirm={() => save()} />
    </form>
  );
};

export default WebsiteBlogPostFormPage;
