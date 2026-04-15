"use client";
import { useSummarizeText } from "@/shared/api/summary/summary";
import type { SummarizeResponse } from "@/shared/api/summarifyAPI.schemas";

export type { SummarizeResponse };

export function useSummaryMutation() {
  const mutation = useSummarizeText();

  const summarize = (text: string) => {
    mutation.mutate({ data: { text } });
  };

  // Orval wraps response: { data: SummarizeResponse, status: 200, headers }
  const response = mutation.data;
  const data: SummarizeResponse | undefined =
    response && "data" in response ? response.data : undefined;

  return {
    summarize,
    data,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error as Error | null,
    reset: mutation.reset,
  };
}
