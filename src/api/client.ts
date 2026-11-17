import axios from "axios";

export const API_BASE = import.meta.env.PROD
  ? ""
  : import.meta.env.VITE_LOCAL_API_BASE;

// Use this for things that must go directly to Railway (e.g. image proxy)
export const RAILWAY_BASE = import.meta.env.VITE_RAILWAY_API_BASE ?? "";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const pin = localStorage.getItem("aca_wholesale_pin");
  config.headers = config.headers || {};
  if (pin) {
    (config.headers as any)["x-wholesale-pin"] = pin;
  } else {
    delete (config.headers as any)["x-wholesale-pin"];
  }
  return config;
});

api.interceptors.response.use(response => response, error => {
  const url = (error.config?.url || "").split(/[?#]/, 1)[0];
  const status = error.response?.status;
  const data = error.response?.data;
  if (!axios.isCancel(error)) {
    console.error("API request failed", {
      method: error.config?.method?.toUpperCase(),
      url,
      status,
      code: data?.code ?? error.code,
      error: status && status < 500 ? data?.error : error.message,
      details: status && status < 500 ? data?.issues ?? data?.details : undefined,
    });
  }
  if (url.startsWith("/api/admin/") && !url.includes("/auth/") &&
      (status === 401 || data?.code === "ACCOUNT_BLOCKED")) {
    window.dispatchEvent(new Event("aca_admin_session_ended"));
  }
  return Promise.reject(error);
});
