import { Edit3, FileText, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import DataTableShell, { DATA_TABLE_ROW_ACTION_CLASS, DATA_TABLE_ROW_ACTION_DANGER_CLASS } from "../../../components/common/DataTableShell";
import PageHeader from "../../../components/common/PageHeader";
import StatCards from "../../../components/common/StatCards";
import { websiteBlogService } from "../../../services/website/websiteService";
import { fetchWebsiteBlogCategories, fetchWebsiteBlogPosts, fetchWebsiteDashboard } from "../../../store/slices/website/websiteSlice";
import { getApiErrorMessage, getApiFieldErrors, isConflictError } from "../../../utils/apiError";
import { slugifyWebsiteTitle } from "../../../utils/websiteContent";
import PublishStatusPill from "../PublishStatusPill";
import useWebsiteCapabilities from "../useWebsiteCapabilities";
import { formatWebsiteDateTime } from "../websiteFormat";
import { PUBLISH_STATUS_OPTIONS, getPublishStatusName } from "../websiteStatus";
import { WebsiteBooleanPill, WebsiteConfirmModal, WebsiteConflictPanel, WebsiteErrorState, WebsitePagination, WebsiteTextarea, WebsiteToggle } from "../WebsiteShared";

const INITIAL_FILTERS = { categoryId: "", pageNumber: 1, pageSize: 25, publishStatus: "", search: "" };
const EMPTY_CATEGORY = { description: "", isActive: true, name: "", rowVersion: null, slug: "", sortOrder: 0 };

// BACKEND: GET /blog-posts and GET /blog-categories could not be authenticated during
// development. These views intentionally use only request-contract fields plus standard ids.
const WebsiteBlogPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const capabilities = useWebsiteCapabilities().blogs;
  const { categories, categoriesError, categoriesLoading, posts } = useSelector((state) => state.website.blog);
  const dashboard = useSelector((state) => state.website.dashboard);
  const [tab, setTab] = useState("posts");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [categoryForm, setCategoryForm] = useState(null);
  const [categoryErrors, setCategoryErrors] = useState({});
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryConflict, setCategoryConflict] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const postRequest = dispatch(fetchWebsiteBlogPosts(filters));
    return () => postRequest.abort();
  }, [dispatch, filters]);
  useEffect(() => {
    const categoriesRequest = dispatch(fetchWebsiteBlogCategories());
    const dashboardRequest = dispatch(fetchWebsiteDashboard());
    return () => { categoriesRequest.abort(); dashboardRequest.abort(); };
  }, [dispatch]);

  const refresh = () => {
    dispatch(fetchWebsiteBlogPosts(filters));
    dispatch(fetchWebsiteBlogCategories());
    dispatch(fetchWebsiteDashboard());
  };
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value, pageNumber: key === "pageNumber" ? value : 1 }));
  const stats = useMemo(() => {
    const total = dashboard.data?.totalBlogPosts;
    const published = dashboard.data?.publishedBlogPosts;
    const completePage = posts.totalCount <= posts.items.length;
    return [
      { label: "Total posts", value: total, icon: FileText },
      { label: "Published", value: published, icon: FileText },
      completePage ? { label: "Drafts", value: posts.items.filter((item) => getPublishStatusName(item.publishStatus) === "Draft").length, icon: FileText } : null,
    ];
  }, [dashboard.data, posts.items, posts.totalCount]);

  const openCategory = (category = EMPTY_CATEGORY) => {
    setCategoryForm({ ...EMPTY_CATEGORY, ...category, slugTouched: Boolean(category.id) });
    setCategoryErrors({});
    setCategoryConflict(null);
  };
  const saveCategory = async (override = categoryForm) => {
    if (!override.name?.trim() || !override.slug?.trim()) {
      setCategoryErrors({ name: !override.name?.trim() ? "Name is required." : "", slug: !override.slug?.trim() ? "Slug is required." : "" });
      return;
    }
    setSavingCategory(true);
    try {
      const payload = { ...override };
      delete payload.id;
      delete payload.slugTouched;
      const response = override.id
        ? await websiteBlogService.updateCategory(override.id, payload)
        : await websiteBlogService.createCategory(payload);
      setCategoryForm((current) => ({ ...current, ...response.data, slugTouched: true }));
      toast.success(override.id ? "Blog category saved" : "Blog category created");
      setCategoryForm(null);
      dispatch(fetchWebsiteBlogCategories());
    } catch (error) {
      if (isConflictError(error) && override.id) {
        try {
          const response = await websiteBlogService.getCategories();
          const current = (Array.isArray(response.data) ? response.data : response.data?.items || []).find((item) => String(item.id) === String(override.id));
          if (current) setCategoryConflict({ current, mine: override });
          else toast.error("The saved category is no longer available.");
        } catch (refreshError) {
          toast.error(getApiErrorMessage(refreshError, "Unable to load the saved category."));
        }
      } else {
        setCategoryErrors(getApiFieldErrors(error));
        toast.error(getApiErrorMessage(error, "Unable to save this category."));
      }
    } finally {
      setSavingCategory(false);
    }
  };
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      if (pendingDelete.type === "post") await websiteBlogService.deletePost(pendingDelete.record.id);
      else await websiteBlogService.deleteCategory(pendingDelete.record.id);
      toast.success(pendingDelete.type === "post" ? "Blog post deleted" : "Blog category deleted");
      setPendingDelete(null);
      refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to delete this record."));
    } finally {
      setDeleting(false);
    }
  };

  const categoryOptions = categories.map((category) => ({ label: category.name, value: category.id }));
  return (
    <div className="space-y-6">
      <PageHeader badge="Website Management" title="Blog" description="Publish website stories and maintain the category list." actions={<><AppButton variant="secondary" onClick={refresh}><RefreshCw className={`h-4 w-4 ${(posts.loading || categoriesLoading) ? "animate-spin" : ""}`} /> Refresh</AppButton>{capabilities.canCreate ? <AppButton onClick={() => tab === "posts" ? navigate("/website/blog/new") : openCategory()}><Plus className="h-4 w-4" /> {tab === "posts" ? "Add post" : "Add category"}</AppButton> : null}</>} />
      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm" role="tablist">
        {[{ id: "posts", label: "Posts" }, { id: "categories", label: "Categories" }].map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${tab === item.id ? "bg-brand text-white" : "text-slate-500 hover:bg-slate-50"}`}>{item.label}</button>)}
      </div>

      {tab === "posts" ? <>
        <StatCards cards={stats} loading={dashboard.loading} />
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-end gap-3"><div className="min-w-64 flex-1"><AppInput label="Search" placeholder="Title, slug or excerpt" value={filters.search} onChange={(event) => setFilter("search", event.target.value)} /></div><AppSelect className="w-56" label="Category" placeholder="Any category" options={[{ label: "Any category", value: "" }, ...categoryOptions]} value={filters.categoryId} onChange={(value) => setFilter("categoryId", value)} /><AppSelect className="w-52" label="Publish status" options={[{ label: "Any status", value: "" }, ...PUBLISH_STATUS_OPTIONS]} value={filters.publishStatus} onChange={(value) => setFilter("publishStatus", value)} /><AppButton variant="ghost" disabled={!filters.search && filters.categoryId === "" && filters.publishStatus === ""} onClick={() => setFilters(INITIAL_FILTERS)}>Clear</AppButton></div></section>
        <WebsiteErrorState error={posts.error} onRetry={refresh} />
        <DataTableShell columnCount={8} loading={posts.loading} minWidth="min-w-[1080px]" emptyTitle={!posts.items.length ? "No blog posts found" : undefined} emptyHint="Try changing the filters or create the first post." head={<><th className="w-14">#</th><th className="w-20">Cover</th><th className="w-72">Title</th><th className="w-40">Category</th><th className="w-32">Publish status</th><th className="w-24">Featured</th><th className="w-44">Published at</th><th className="w-24 text-right">Actions</th></>}>
          {posts.items.map((post, index) => <tr key={post.id} className={getPublishStatusName(post.publishStatus) === "Draft" ? "text-slate-500" : ""}><td>{(posts.pageNumber - 1) * posts.pageSize + index + 1}</td><td>{post.coverImageUrl ? <img src={post.coverImageUrl} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded bg-slate-100"><FileText className="h-4 w-4 text-slate-400" /></div>}</td><td><p className="truncate font-semibold text-slate-900">{post.title || "Untitled post"}</p><p className="mt-0.5 truncate font-mono text-xs text-slate-500">/{post.slug || "—"}</p></td><td>{post.categoryName || categories.find((item) => String(item.id) === String(post.categoryId))?.name || "—"}</td><td><PublishStatusPill value={post.publishStatus} /></td><td><WebsiteBooleanPill value={post.isFeatured} trueLabel="Featured" falseLabel="Standard" /></td><td>{formatWebsiteDateTime(post.publishedAtUtc)}</td><td><div className="flex justify-end gap-1">{capabilities.canEdit ? <button className={DATA_TABLE_ROW_ACTION_CLASS} type="button" aria-label={`Edit ${post.title}`} onClick={() => navigate(`/website/blog/${post.id}/edit`)}><Edit3 className="h-4 w-4" /></button> : null}{capabilities.canDelete ? <button className={DATA_TABLE_ROW_ACTION_DANGER_CLASS} type="button" aria-label={`Delete ${post.title}`} onClick={() => setPendingDelete({ record: post, type: "post" })}><Trash2 className="h-4 w-4" /></button> : null}</div></td></tr>)}
        </DataTableShell>
        <WebsitePagination disabled={posts.loading} pageNumber={posts.pageNumber} pageSize={posts.pageSize} totalCount={posts.totalCount} totalPages={posts.totalPages} onPageChange={(value) => setFilter("pageNumber", value)} onPageSizeChange={(value) => setFilter("pageSize", value)} />
      </> : <>
        <WebsiteErrorState error={categoriesError} onRetry={refresh} />
        <DataTableShell columnCount={7} loading={categoriesLoading} emptyTitle={!categories.length ? "No blog categories" : undefined} emptyHint="Create a category to organise website posts." head={<><th className="w-14">#</th><th className="w-48">Name</th><th className="w-48">Slug</th><th>Description</th><th className="w-24 text-right">Sort order</th><th className="w-24">Active</th><th className="w-24 text-right">Actions</th></>}>
          {categories.map((category, index) => <tr key={category.id}><td>{index + 1}</td><td className="font-semibold text-slate-900">{category.name}</td><td className="font-mono text-xs">{category.slug}</td><td><p className="truncate">{category.description || "—"}</p></td><td className="text-right tabular-nums">{category.sortOrder ?? "—"}</td><td><WebsiteBooleanPill value={category.isActive} /></td><td><div className="flex justify-end gap-1">{capabilities.canEdit ? <button className={DATA_TABLE_ROW_ACTION_CLASS} type="button" aria-label={`Edit ${category.name}`} onClick={() => openCategory(category)}><Edit3 className="h-4 w-4" /></button> : null}{capabilities.canDelete ? <button className={DATA_TABLE_ROW_ACTION_DANGER_CLASS} type="button" aria-label={`Delete ${category.name}`} onClick={() => setPendingDelete({ record: category, type: "category" })}><Trash2 className="h-4 w-4" /></button> : null}</div></td></tr>)}
        </DataTableShell>
      </>}

      <AppModal isOpen={Boolean(categoryForm)} title={categoryForm?.id ? "Edit blog category" : "Add blog category"} isBusy={savingCategory} onClose={() => setCategoryForm(null)}>
        {categoryForm ? <div className="space-y-4">
          {categoryConflict ? <WebsiteConflictPanel current={categoryConflict.current} mine={categoryConflict.mine} resolving={savingCategory} onUseSaved={() => { setCategoryForm({ ...categoryConflict.current, slugTouched: true }); setCategoryConflict(null); }} onKeepMine={() => saveCategory({ ...categoryConflict.mine, rowVersion: categoryConflict.current.rowVersion })} /> : null}
          <AppInput label="Name" required value={categoryForm.name} error={categoryErrors.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value, slug: current.slugTouched ? current.slug : slugifyWebsiteTitle(event.target.value) }))} />
          <AppInput label="Slug" required value={categoryForm.slug} error={categoryErrors.slug} onChange={(event) => setCategoryForm((current) => ({ ...current, slug: slugifyWebsiteTitle(event.target.value), slugTouched: true }))} />
          <WebsiteTextarea id="category-description" label="Description" value={categoryForm.description} onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))} />
          <AppInput label="Sort order" type="number" value={categoryForm.sortOrder} onChange={(event) => setCategoryForm((current) => ({ ...current, sortOrder: event.target.value }))} />
          <WebsiteToggle label="Active" checked={categoryForm.isActive} onChange={(value) => setCategoryForm((current) => ({ ...current, isActive: value }))} />
          <div className="flex justify-end gap-2"><AppButton variant="secondary" onClick={() => setCategoryForm(null)}>Cancel</AppButton><AppButton isLoading={savingCategory} onClick={() => saveCategory()}>Save category</AppButton></div>
        </div> : null}
      </AppModal>
      <WebsiteConfirmModal danger isOpen={Boolean(pendingDelete)} isLoading={deleting} title={`Delete ${pendingDelete?.type || "record"}?`} description={pendingDelete?.type === "category" ? "If this category is in use, the server will keep it and explain the conflict." : "This permanently removes the post from the website content catalogue."} confirmLabel="Delete" onClose={() => setPendingDelete(null)} onConfirm={confirmDelete} />
    </div>
  );
};

export default WebsiteBlogPage;
