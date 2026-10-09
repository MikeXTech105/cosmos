import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { DEFAULT_WEBSITE_PAGE_SIZE } from "../../../constants/websiteEnums";
import {
  websiteAnnouncementService,
  websiteBlogService,
  websiteDashboardService,
  websiteProductService,
  websiteSettingsService,
  websiteWarrantyService,
} from "../../../services/website/websiteService";
import {
  getApiCorrelationId,
  getApiErrorMessage,
  getApiFieldErrors,
  getApiStatus,
} from "../../../utils/apiError";
import { sortWebsiteAnnouncements } from "../../../utils/websiteContent";
import { getMediaUrl, resolveMediaUrl } from "../../../utils/mediaUrl";

const normalizeWebsiteRecordMedia = (record) => {
  if (!record || typeof record !== "object") return record;

  const media = Array.isArray(record.media)
    ? record.media.map((item) => ({
        ...item,
        publicUrl: resolveMediaUrl(
          item?.publicUrl ?? item?.url ?? item?.imageUrl ?? item?.path,
        ),
      }))
    : record.media;
  const primaryFromMedia = media?.find((item) => item?.isPrimary)?.publicUrl
    ?? media?.find((item) => item?.publicUrl)?.publicUrl;

  return {
    ...record,
    coverImageUrl: getMediaUrl(record, [
      "coverImageUrl",
      "coverImageURL",
      "coverUrl",
      "imageUrl",
      "imagePath",
    ]),
    media,
    primaryImageUrl:
      getMediaUrl(record, [
        "primaryImageUrl",
        "primaryImageURL",
        "imageUrl",
        "imagePath",
        "thumbnailUrl",
      ]) || primaryFromMedia || "",
  };
};

const serializeError = (error, fallback) => ({
  correlationId: getApiCorrelationId(error) || null,
  fieldErrors: getApiFieldErrors(error),
  message: getApiErrorMessage(error, fallback),
  status: getApiStatus(error) || null,
});

const createFetchThunk = (type, loader, fallback) =>
  createAsyncThunk(type, async (arg, { rejectWithValue, signal }) => {
    try {
      return await loader(arg, signal);
    } catch (error) {
      if (signal.aborted) throw error;
      return rejectWithValue(serializeError(error, fallback));
    }
  });

export const fetchWebsiteDashboard = createFetchThunk(
  "website/fetchDashboard",
  (_, signal) => websiteDashboardService.getOverview({ signal }),
  "Unable to load the website dashboard.",
);

export const fetchWebsiteProducts = createFetchThunk(
  "website/fetchProducts",
  (params, signal) => websiteProductService.getList(params, { signal }),
  "Unable to load website products.",
);

export const fetchWebsiteProductById = createFetchThunk(
  "website/fetchProductById",
  (id, signal) => websiteProductService.getById(id, { signal }),
  "Unable to load the website product.",
);

export const fetchWebsiteBlogPosts = createFetchThunk(
  "website/fetchBlogPosts",
  (params, signal) => websiteBlogService.getPosts(params, { signal }),
  "Unable to load blog posts.",
);

export const fetchWebsiteBlogCategories = createFetchThunk(
  "website/fetchBlogCategories",
  (_, signal) => websiteBlogService.getCategories({ signal }),
  "Unable to load blog categories.",
);

export const fetchWebsiteAnnouncements = createFetchThunk(
  "website/fetchAnnouncements",
  (params, signal) => websiteAnnouncementService.getList(params, { signal }),
  "Unable to load announcements.",
);

export const fetchWebsiteWarrantyClaims = createFetchThunk(
  "website/fetchWarrantyClaims",
  (params, signal) => websiteWarrantyService.getList(params, { signal }),
  "Unable to load warranty claims.",
);

export const fetchWebsiteWarrantyDetail = createFetchThunk(
  "website/fetchWarrantyDetail",
  async (id, signal) => {
    const [claim, history, attachments, notes, messages] = await Promise.all([
      websiteWarrantyService.getById(id, { signal }),
      websiteWarrantyService.getHistory(id, { signal }),
      websiteWarrantyService.getAttachments(id, { signal }),
      websiteWarrantyService.getNotes(id, { signal }),
      websiteWarrantyService.getMessages(id, { signal }),
    ]);
    return { attachments, claim, history, messages, notes };
  },
  "Unable to load warranty claim details.",
);

export const fetchWebsiteSettings = createFetchThunk(
  "website/fetchSettings",
  (_, signal) => websiteSettingsService.get({ signal }),
  "Unable to load website settings.",
);

export const fetchWebsiteWarrantySummary = createFetchThunk(
  "website/fetchWarrantySummary",
  (_, signal) => websiteWarrantyService.getSummary({ signal }),
  "Unable to load the warranty summary.",
);

const getItems = (response) => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.items) ? data.items : [];
};

const getPage = (response) => {
  const data = response?.data;
  const items = getItems(response);
  const pageSize = Number(data?.pageSize) || DEFAULT_WEBSITE_PAGE_SIZE;
  const totalCount = Number(data?.totalCount ?? items.length) || 0;
  return {
    items: items.map(normalizeWebsiteRecordMedia),
    pageNumber: Math.max(1, Number(data?.pageNumber) || 1),
    pageSize,
    totalCount,
    totalPages: Math.max(1, Number(data?.totalPages) || Math.ceil(totalCount / pageSize)),
  };
};

const listState = () => ({
  error: null,
  items: [],
  loading: false,
  pageNumber: 1,
  pageSize: DEFAULT_WEBSITE_PAGE_SIZE,
  requestId: null,
  totalCount: 0,
  totalPages: 1,
});

const initialState = {
  announcements: listState(),
  blog: {
    categories: [],
    categoriesError: null,
    categoriesLoading: false,
    categoriesRequestId: null,
    posts: listState(),
  },
  dashboard: { data: null, error: null, loading: false, requestId: null },
  productDetail: { data: null, error: null, loading: false, requestId: null },
  products: listState(),
  settings: { error: null, items: [], loading: false, requestId: null },
  warranty: {
    ...listState(),
    attachments: [],
    claim: null,
    detailError: null,
    detailLoading: false,
    detailRequestId: null,
    history: [],
    messages: [],
    notes: [],
    summary: null,
    summaryError: null,
    summaryLoading: false,
    summaryRequestId: null,
  },
};

const addListCases = (builder, thunk, select, apply = (page) => page) => {
  builder
    .addCase(thunk.pending, (state, action) => {
      const target = select(state);
      target.loading = true;
      target.error = null;
      target.requestId = action.meta.requestId;
    })
    .addCase(thunk.fulfilled, (state, action) => {
      const target = select(state);
      if (target.requestId !== action.meta.requestId) return;
      Object.assign(target, apply(getPage(action.payload)));
      target.loading = false;
      target.requestId = null;
    })
    .addCase(thunk.rejected, (state, action) => {
      const target = select(state);
      if (target.requestId !== action.meta.requestId) return;
      target.loading = false;
      target.requestId = null;
      if (!action.meta.aborted) target.error = action.payload ?? action.error;
    });
};

const websiteSlice = createSlice({
  name: "website",
  initialState,
  reducers: {
    clearWebsiteProductDetail: (state) => {
      state.productDetail = { data: null, error: null, loading: false, requestId: null };
    },
    clearWebsiteWarrantyDetail: (state) => {
      state.warranty.claim = null;
      state.warranty.history = [];
      state.warranty.attachments = [];
      state.warranty.notes = [];
      state.warranty.messages = [];
      state.warranty.detailError = null;
    },
  },
  extraReducers: (builder) => {
    addListCases(builder, fetchWebsiteProducts, (state) => state.products);
    addListCases(builder, fetchWebsiteBlogPosts, (state) => state.blog.posts);
    addListCases(
      builder,
      fetchWebsiteAnnouncements,
      (state) => state.announcements,
      (page) => ({ ...page, items: sortWebsiteAnnouncements(page.items) }),
    );
    addListCases(builder, fetchWebsiteWarrantyClaims, (state) => state.warranty);

    builder
      .addCase(fetchWebsiteDashboard.pending, (state, action) => {
        state.dashboard.loading = true;
        state.dashboard.error = null;
        state.dashboard.requestId = action.meta.requestId;
      })
      .addCase(fetchWebsiteDashboard.fulfilled, (state, action) => {
        if (state.dashboard.requestId !== action.meta.requestId) return;
        state.dashboard.data = action.payload.data;
        state.dashboard.loading = false;
        state.dashboard.requestId = null;
      })
      .addCase(fetchWebsiteDashboard.rejected, (state, action) => {
        if (state.dashboard.requestId !== action.meta.requestId) return;
        state.dashboard.loading = false;
        state.dashboard.requestId = null;
        if (!action.meta.aborted) state.dashboard.error = action.payload ?? action.error;
      })
      .addCase(fetchWebsiteProductById.pending, (state, action) => {
        state.productDetail.loading = true;
        state.productDetail.error = null;
        state.productDetail.requestId = action.meta.requestId;
      })
      .addCase(fetchWebsiteProductById.fulfilled, (state, action) => {
        if (state.productDetail.requestId !== action.meta.requestId) return;
        state.productDetail.data = normalizeWebsiteRecordMedia(action.payload.data);
        state.productDetail.loading = false;
        state.productDetail.requestId = null;
      })
      .addCase(fetchWebsiteProductById.rejected, (state, action) => {
        if (state.productDetail.requestId !== action.meta.requestId) return;
        state.productDetail.loading = false;
        state.productDetail.requestId = null;
        if (!action.meta.aborted) state.productDetail.error = action.payload ?? action.error;
      })
      .addCase(fetchWebsiteBlogCategories.pending, (state, action) => {
        state.blog.categoriesLoading = true;
        state.blog.categoriesError = null;
        state.blog.categoriesRequestId = action.meta.requestId;
      })
      .addCase(fetchWebsiteBlogCategories.fulfilled, (state, action) => {
        if (state.blog.categoriesRequestId !== action.meta.requestId) return;
        state.blog.categories = getItems(action.payload);
        state.blog.categoriesLoading = false;
        state.blog.categoriesRequestId = null;
      })
      .addCase(fetchWebsiteBlogCategories.rejected, (state, action) => {
        if (state.blog.categoriesRequestId !== action.meta.requestId) return;
        state.blog.categoriesLoading = false;
        state.blog.categoriesRequestId = null;
        if (!action.meta.aborted) state.blog.categoriesError = action.payload ?? action.error;
      })
      .addCase(fetchWebsiteWarrantyDetail.pending, (state, action) => {
        state.warranty.detailLoading = true;
        state.warranty.detailError = null;
        state.warranty.detailRequestId = action.meta.requestId;
      })
      .addCase(fetchWebsiteWarrantyDetail.fulfilled, (state, action) => {
        if (state.warranty.detailRequestId !== action.meta.requestId) return;
        state.warranty.claim = action.payload.claim.data;
        state.warranty.history = getItems(action.payload.history);
        state.warranty.attachments = getItems(action.payload.attachments);
        state.warranty.notes = getItems(action.payload.notes);
        state.warranty.messages = getItems(action.payload.messages);
        state.warranty.detailLoading = false;
        state.warranty.detailRequestId = null;
      })
      .addCase(fetchWebsiteWarrantyDetail.rejected, (state, action) => {
        if (state.warranty.detailRequestId !== action.meta.requestId) return;
        state.warranty.detailLoading = false;
        state.warranty.detailRequestId = null;
        if (!action.meta.aborted) state.warranty.detailError = action.payload ?? action.error;
      })
      .addCase(fetchWebsiteSettings.pending, (state, action) => {
        state.settings.loading = true;
        state.settings.error = null;
        state.settings.requestId = action.meta.requestId;
      })
      .addCase(fetchWebsiteSettings.fulfilled, (state, action) => {
        if (state.settings.requestId !== action.meta.requestId) return;
        state.settings.items = getItems(action.payload);
        state.settings.loading = false;
        state.settings.requestId = null;
      })
      .addCase(fetchWebsiteSettings.rejected, (state, action) => {
        if (state.settings.requestId !== action.meta.requestId) return;
        state.settings.loading = false;
        state.settings.requestId = null;
        if (!action.meta.aborted) state.settings.error = action.payload ?? action.error;
      })
      .addCase(fetchWebsiteWarrantySummary.pending, (state, action) => {
        state.warranty.summaryLoading = true;
        state.warranty.summaryError = null;
        state.warranty.summaryRequestId = action.meta.requestId;
      })
      .addCase(fetchWebsiteWarrantySummary.fulfilled, (state, action) => {
        if (state.warranty.summaryRequestId !== action.meta.requestId) return;
        state.warranty.summary = action.payload.data;
        state.warranty.summaryLoading = false;
        state.warranty.summaryRequestId = null;
      })
      .addCase(fetchWebsiteWarrantySummary.rejected, (state, action) => {
        if (state.warranty.summaryRequestId !== action.meta.requestId) return;
        state.warranty.summaryLoading = false;
        state.warranty.summaryRequestId = null;
        if (!action.meta.aborted) state.warranty.summaryError = action.payload ?? action.error;
      });
  },
});

export const {
  clearWebsiteProductDetail,
  clearWebsiteWarrantyDetail,
} = websiteSlice.actions;

export default websiteSlice.reducer;
