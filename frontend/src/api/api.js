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
    // Skip auth for profiles endpoint
    if (config.url.includes('/profiles/')) {
      return config;
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Error getting session:", error);
        return Promise.reject(error);
      }

      if (!session) {
        console.warn("No active session found");
        return config; // Continue without auth header
      }

      if (session.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
        console.log("Added auth token to request");
      }

      return config;
    } catch (error) {
      console.error("Error in request interceptor:", error);
      return Promise.reject(error);
    }
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// ⚠️ Response Interceptor: catch global errors
api.interceptors.response.use(
  (response) => {
    console.log("API Response:", response.status, response.config.url);
    return response;
  },
  async (error) => {
    console.error("API Error:", {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      response: error.response?.data
    });

    const status = error.response?.status;

    if (status === 401) {
      const user = JSON.parse(localStorage.getItem("loggedInUser"));
      const role = user?.role;

      if (role === "admin" || role === "employee") {
        toast.error("Session expired. Logging out...");
        await supabase.auth.signOut();
        localStorage.removeItem("loggedInUser");
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      } else {
        console.warn("401 error for customer — not forcing logout.");
      }
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
