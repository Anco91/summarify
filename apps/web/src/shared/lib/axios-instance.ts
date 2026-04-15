import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const customInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
});

customInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ??
      error.response?.data?.error ??
      error.message ??
      "Une erreur est survenue";
    return Promise.reject(new Error(message));
  }
);
