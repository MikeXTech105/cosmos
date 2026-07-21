import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";

export const getCurrentProfile = async () => {
  const response = await axiosInstance.get(ENDPOINTS.AUTH_ME);

  return unwrapResponse(response).data;
};

export const updateCurrentProfile = async (payload) => {
  const response = await axiosInstance.put(ENDPOINTS.AUTH_ME_UPDATE, payload);

  return unwrapResponse(response).data;
};
