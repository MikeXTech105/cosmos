import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import {
  sanitizeWarrantyClaimParams,
  sanitizeWebsiteAnnouncementParams,
  sanitizeWebsiteBlogParams,
  sanitizeWebsiteProductParams,
} from "../../utils/websiteQuery";
import { unwrapResponse } from "../apiServiceUtils";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import { verifyImageUrl } from "../../utils/verifyImageUrl";

// BACKEND: Authenticated response shape verification remains required for:
// blog posts/categories, announcements, settings, warranty detail/history/
// attachments/notes/customer-messages, and warranty reports/summary.
// These services preserve the server envelope and never rename response fields.

const get = async (url, { params, signal, responseType } = {}) => {
  const response = await axiosInstance.get(url, { params, responseType, signal });
  return responseType === "blob" ? response : unwrapResponse(response);
};

const post = async (url, payload, options) => {
  const response = await axiosInstance.post(url, payload, options);
  return unwrapResponse(response);
};

const put = async (url, payload) => {
  const response = await axiosInstance.put(url, payload);
  return unwrapResponse(response);
};

const remove = async (url) => {
  const response = await axiosInstance.delete(url);
  return unwrapResponse(response);
};

export const websiteDashboardService = {
  getOverview: ({ signal } = {}) =>
    get(ENDPOINTS.WEBSITE_DASHBOARD_OVERVIEW, { signal }),
};

export const websiteProductService = {
  getList: (params, { signal } = {}) =>
    get(ENDPOINTS.WEBSITE_PRODUCTS, {
      params: sanitizeWebsiteProductParams(params),
      signal,
    }),
  getById: (id, { signal } = {}) =>
    get(ENDPOINTS.WEBSITE_PRODUCT_BY_ID(id), { signal }),
  create: (payload) => post(ENDPOINTS.WEBSITE_PRODUCTS, payload),
  update: (id, payload) => put(ENDPOINTS.WEBSITE_PRODUCT_BY_ID(id), payload),
  delete: (id) => remove(ENDPOINTS.WEBSITE_PRODUCT_BY_ID(id)),
};

export const websiteBlogService = {
  getPosts: (params, { signal } = {}) =>
    get(ENDPOINTS.WEBSITE_BLOG_POSTS, {
      params: sanitizeWebsiteBlogParams(params),
      signal,
    }),
  getPostById: (id, { signal } = {}) =>
    get(ENDPOINTS.WEBSITE_BLOG_POST_BY_ID(id), { signal }),
  createPost: (payload) => post(ENDPOINTS.WEBSITE_BLOG_POSTS, payload),
  updatePost: (id, payload) =>
    put(ENDPOINTS.WEBSITE_BLOG_POST_BY_ID(id), payload),
  deletePost: (id) => remove(ENDPOINTS.WEBSITE_BLOG_POST_BY_ID(id)),
  getCategories: ({ signal } = {}) =>
    get(ENDPOINTS.WEBSITE_BLOG_CATEGORIES, { signal }),
  createCategory: (payload) =>
    post(ENDPOINTS.WEBSITE_BLOG_CATEGORIES, payload),
  updateCategory: (id, payload) =>
    put(ENDPOINTS.WEBSITE_BLOG_CATEGORY_BY_ID(id), payload),
  deleteCategory: (id) =>
    remove(ENDPOINTS.WEBSITE_BLOG_CATEGORY_BY_ID(id)),
};

export const websiteAnnouncementService = {
  getList: (params, { signal } = {}) =>
    get(ENDPOINTS.WEBSITE_ANNOUNCEMENTS, {
      params: sanitizeWebsiteAnnouncementParams(params),
      signal,
    }),
  create: (payload) => post(ENDPOINTS.WEBSITE_ANNOUNCEMENTS, payload),
  update: (id, payload) =>
    put(ENDPOINTS.WEBSITE_ANNOUNCEMENT_BY_ID(id), payload),
  delete: (id) => remove(ENDPOINTS.WEBSITE_ANNOUNCEMENT_BY_ID(id)),
};

export const websiteSettingsService = {
  get: ({ signal } = {}) => get(ENDPOINTS.WEBSITE_SETTINGS, { signal }),
  update: (settings) => put(ENDPOINTS.WEBSITE_SETTINGS, { settings }),
};

export const websiteWarrantyService = {
  getList: (params, { signal } = {}) =>
    get(ENDPOINTS.WEBSITE_WARRANTY_CLAIMS, {
      params: sanitizeWarrantyClaimParams(params),
      signal,
    }),
  getById: (id, { signal } = {}) =>
    get(ENDPOINTS.WEBSITE_WARRANTY_CLAIM_BY_ID(id), { signal }),
  getHistory: (id, { signal } = {}) =>
    get(ENDPOINTS.WEBSITE_WARRANTY_HISTORY(id), { signal }),
  getAttachments: (id, { signal } = {}) =>
    get(ENDPOINTS.WEBSITE_WARRANTY_ATTACHMENTS(id), { signal }),
  downloadAttachment: (attachmentId, { signal } = {}) =>
    get(ENDPOINTS.WEBSITE_WARRANTY_ATTACHMENT_DOWNLOAD(attachmentId), {
      responseType: "blob",
      signal,
    }),
  getNotes: (id, { signal } = {}) =>
    get(ENDPOINTS.WEBSITE_WARRANTY_NOTES(id), { signal }),
  addNote: (id, note) =>
    post(ENDPOINTS.WEBSITE_WARRANTY_NOTES(id), { note }),
  getMessages: (id, { signal } = {}) =>
    get(ENDPOINTS.WEBSITE_WARRANTY_MESSAGES(id), { signal }),
  addMessage: (id, message) =>
    post(ENDPOINTS.WEBSITE_WARRANTY_MESSAGES(id), { message }),
  assign: (id, payload) =>
    post(ENDPOINTS.WEBSITE_WARRANTY_ACTION(id, "assign"), payload),
  startReview: (id, payload) =>
    post(ENDPOINTS.WEBSITE_WARRANTY_ACTION(id, "start-review"), payload),
  requestInformation: (id, payload) =>
    post(ENDPOINTS.WEBSITE_WARRANTY_ACTION(id, "request-information"), payload),
  approve: (id, payload) =>
    post(ENDPOINTS.WEBSITE_WARRANTY_ACTION(id, "approve"), payload),
  reject: (id, payload) =>
    post(ENDPOINTS.WEBSITE_WARRANTY_ACTION(id, "reject"), payload),
  resolve: (id, payload) =>
    post(ENDPOINTS.WEBSITE_WARRANTY_ACTION(id, "resolve"), payload),
  complete: (id, payload) =>
    post(ENDPOINTS.WEBSITE_WARRANTY_ACTION(id, "complete"), payload),
  getSummary: ({ signal } = {}) =>
    get(ENDPOINTS.WEBSITE_WARRANTY_SUMMARY, { signal }),
};

export const websiteMediaService = {
  uploadImage: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "website");
    const response = await axiosInstance.post(
      ENDPOINTS.WEBSITE_IMAGE_UPLOAD,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress,
      },
    );
    const unwrapped = unwrapResponse(response);
    if (!unwrapped.data?.url) {
      throw new Error("Upload response did not include a URL.");
    }
    return verifyImageUrl(resolveMediaUrl(unwrapped.data.url));
  },
};
