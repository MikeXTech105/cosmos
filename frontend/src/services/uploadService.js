import axiosInstance from "../api/axios";
import { ENDPOINTS } from "../api/endpoints";
import { unwrapResponse } from "./apiServiceUtils";

export const isImageUploadConfigured = () => Boolean(ENDPOINTS.UPLOAD_IMAGE);

const extractUploadUrl = (response) => {
  const data = response?.data ?? response;
  const candidates = [
    data?.url,
    data?.fileUrl,
    data?.imageUrl,
    data?.path,
    data?.file?.url,
    data?.file?.fileUrl,
    data?.file?.imageUrl,
  ];
  const url = candidates.find((candidate) => {
    return typeof candidate === "string" && candidate.trim();
  });

  if (!url) {
    throw new Error("Upload response did not include an image URL.");
  }

  return url;
};

export const uploadService = {
  uploadImage: async (file, onUploadProgress) => {
    if (!ENDPOINTS.UPLOAD_IMAGE) {
      throw new Error("Image upload is not configured.");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosInstance.post(
      ENDPOINTS.UPLOAD_IMAGE,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress,
      },
    );

    return extractUploadUrl(unwrapResponse(response));
  },
};
