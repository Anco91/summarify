import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

/**
 * Orval mutator — Orval calls this as customInstance<T>(url: string, config: RequestInit).
 * We adapt the fetch-style RequestInit into an axios call.
 */
export const customInstance = <T>(
  url: string,
  config?: RequestInit,
): Promise<T> => {
  const { method = "GET", body, headers, signal } = config ?? {};

  const source = axios.CancelToken.source();

  // Forward AbortSignal → CancelToken
  if (signal != null) {
    signal.addEventListener("abort", () => source.cancel("AbortSignal fired"));
  }

  const promise = axiosInstance<T>({
    url,
    method,
    data: body,
    headers: headers as Record<string, string>,
    cancelToken: source.token,
  }).then(({ data }) => data);

  // Orval may attach .cancel() to the returned promise
  (promise as Promise<T> & { cancel: () => void }).cancel = () => {
    source.cancel("Request cancelled by Orval");
  };

  return promise;
};
