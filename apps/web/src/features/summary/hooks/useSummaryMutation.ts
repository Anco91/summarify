"use client";
import { useMutation } from "@tanstack/react-query";

export interface SummarizeResponse {
  summary: string;
  model: string;
}

export function useSummaryMutation() {
  return useMutation<SummarizeResponse, Error, string>({
    mutationFn: async (text: string): Promise<SummarizeResponse> => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/summarize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `Erreur HTTP ${res.status}`);
      }

      return res.json();
    },
  });
}
