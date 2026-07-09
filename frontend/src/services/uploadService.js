import axiosInstance from "../api/axios";
import { ENDPOINTS } from "../api/endpoints";
import { unwrapResponse } from "./apiServiceUtils";

const readFileAsDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });
};

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
      // Temporary fallback: the live Swagger contract has no file upload endpoint.
      // Replace UPLOAD_IMAGE with the real multipart endpoint to switch to server storage.
      onUploadProgress?.({
        loaded: file.size,
        total: file.size,
      });

      return readFileAsDataUrl(file);
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
