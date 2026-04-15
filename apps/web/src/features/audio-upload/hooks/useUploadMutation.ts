"use client";
import { useRef } from "react";
import { useUploadAudio } from "@/shared/api/transcription/transcription";

type OnSuccess = (jobId: string, lang?: string) => void;

export function useUploadMutation(onSuccess: OnSuccess) {
  const langRef = useRef<string | undefined>(undefined);

  const mutation = useUploadAudio({
    mutation: {
      onSuccess: (response) => {
        const data = "data" in response ? response.data : response;
        if (data && "job_id" in data) {
          onSuccess(data.job_id, langRef.current);
        }
      },
    },
  });

  const upload = (file: File, lang?: string) => {
    langRef.current = lang;
    mutation.mutate({ data: { file } });
  };

  return {
    upload,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error as Error | null,
    reset: mutation.reset,
  };
}
