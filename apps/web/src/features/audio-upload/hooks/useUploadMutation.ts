"use client";
import { useMutation } from "@tanstack/react-query";

interface UploadResponse {
  job_id: string;
}

export function useUploadMutation(onSuccess: (jobId: string) => void) {
  return useMutation<UploadResponse, Error, File>({
    mutationFn: async (file: File): Promise<UploadResponse> => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/upload`,
        { method: "POST", body: formData }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `Erreur HTTP ${res.status}`);
      }

      return res.json();
    },
    onSuccess: (data) => onSuccess(data.job_id),
  });
}
