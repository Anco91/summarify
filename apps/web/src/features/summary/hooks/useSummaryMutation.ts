"use client";
import { useSummarizeText } from "@/shared/api/summary/summary";
import type { SummarizeResponse } from "@/shared/api/summarifyAPI.schemas";

export type { SummarizeResponse };

export function useSummaryMutation() {
  const mutation = useSummarizeText();

  const summarize = (text: string) => {
    mutation.mutate({ data: { text } });
  };

  // customInstance extrait déjà .data de la réponse Axios → mutation.data IS SummarizeResponse
  const data = mutation.data as SummarizeResponse | undefined;

  return {
    summarize,
    data,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error as Error | null,
    reset: mutation.reset,
  };
}
