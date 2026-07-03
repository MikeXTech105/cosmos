import axiosInstance from "../api/axios";
import { ENDPOINTS } from "../api/endpoints";
import { createApiError } from "../utils/apiError";

const unwrapResponse = (response) => {
  const responseData = response.data;

  if (
    responseData?.succeeded === false ||
    responseData?.data?.succeeded === false
  ) {
    throw createApiError(
      responseData?.succeeded === false ? responseData : responseData.data,
      response,
    );
  }

  if (
    responseData?.data &&
    typeof responseData.data === "object" &&
    !Array.isArray(responseData.data)
  ) {
    return {
      ...responseData.data,
      message: responseData.message,
    };
  }

  return responseData;
};

const postAuth = async (endpoint, payload) => {
  const response = await axiosInstance.post(endpoint, payload);

  return unwrapResponse(response);
};

export const authService = {
  login: (payload) => postAuth(ENDPOINTS.LOGIN, payload),

  refreshToken: (payload) => postAuth(ENDPOINTS.REFRESH_TOKEN, payload),

  logout: (payload) => postAuth(ENDPOINTS.LOGOUT, payload),

  forgotPassword: (payload) => postAuth(ENDPOINTS.FORGOT_PASSWORD, payload),

  resetPassword: (payload) => postAuth(ENDPOINTS.RESET_PASSWORD, payload),

  changePassword: (payload) => postAuth(ENDPOINTS.CHANGE_PASSWORD, payload),
};

export const loginUser = authService.login;

export const refreshTokenUser = authService.refreshToken;

export const logoutUser = authService.logout;

export const forgotPassword = authService.forgotPassword;

export const resetPassword = authService.resetPassword;

export const changePassword = authService.changePassword;
