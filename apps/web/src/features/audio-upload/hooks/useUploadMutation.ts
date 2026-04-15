"use client";
import { useUploadAudio } from "@/shared/api/transcription/transcription";
import { validateAudioFile } from "../utils/validateAudioFile";

export function useUploadMutation(onSuccess: (jobId: string) => void) {
  const mutation = useUploadAudio({
    mutation: {
      onSuccess: (response) => {
        // Orval returns { data: UploadResponse, status: 200, headers }
        const data = "data" in response ? response.data : response;
        if (data && "job_id" in data) {
          onSuccess(data.job_id);
        }
      },
    },
  });

  const upload = (file: File) => {
    const validation = validateAudioFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
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
