import axios from "axios";
import { supabase } from "../api/supabaseClient";
import { toast } from "react-toastify";

const API_BASE_URL = "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔐 Request Interceptor: attach Supabase access token
api.interceptors.request.use(
  async (config) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ⚠️ Response Interceptor: catch global errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;

    if (status === 401) {
      toast.error("Session expired. Logging out...");
      await supabase.auth.signOut();
      setTimeout(() => {
        window.location.href = "/"; // or "/login"
      }, 1500);
    } else if (status === 500) {
      toast.error("Server error. Please try again later.");
    } else if (status >= 400) {
      const msg = error.response?.data?.detail || "Something went wrong.";
      toast.error(msg);
    }

    return Promise.reject(error);
  }
);

export default api;
