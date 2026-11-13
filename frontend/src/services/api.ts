import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import type { AuthResponse } from "@/types";
import { tokenStorage } from "./tokenStorage";

export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:8000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return null;
  try {
    const response = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/refresh`, {
      refresh_token: refreshToken,
    });
    tokenStorage.setTokens(response.data.access_token, response.data.refresh_token);
    return response.data.access_token;
  } catch {
    tokenStorage.clear();
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry) {
      const url = original.url ?? "";
      const isRefreshCall = url.includes("/auth/refresh");
      const isLoginCall = url.includes("/auth/login") || url.includes("/auth/register");
      if (!isRefreshCall && !isLoginCall && tokenStorage.getRefreshToken()) {
        original._retry = true;
        refreshPromise = refreshPromise ?? refreshAccessToken();
        const token = await refreshPromise;
        refreshPromise = null;
        if (token) {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        }
        window.dispatchEvent(new Event("auth:logout"));
      }
    }
    return Promise.reject(error);
  },
);

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return "The request timed out. Please check that the backend is running and try again.";
    }
    if (!error.response) {
      return `Cannot reach the backend at ${API_BASE_URL}. Start FastAPI and check VITE_API_URL.`;
    }
    const detail = error.response.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item: { msg?: string; loc?: string[] }) => {
          const field = item.loc?.filter((part) => part !== "body").join(".");
          return field ? `${field}: ${item.msg ?? "Invalid value"}` : (item.msg ?? "Invalid value");
        })
        .join(" · ");
    }
    if (error.response.status === 401) return "Your session has expired. Please sign in again.";
    if (error.response.status === 403) return "You do not have permission to perform this action.";
    if (error.response.status === 404) return "The requested item was not found.";
    if (error.response.status === 429) return "Too many requests. Please wait a moment.";
    return "Something went wrong while contacting the server.";
  }
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}
