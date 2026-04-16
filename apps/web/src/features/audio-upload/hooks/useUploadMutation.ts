"use client";
import { useRef } from "react";
import { useUploadAudio } from "@/shared/api/transcription/transcription";

const SESSION_KEY = "summarify_session";

export interface SessionData {
  sessionId: string;
  filename: string;
  lang?: string;
}

type OnSuccess = (sessionId: string, lang?: string) => void;

export function saveSession(data: SessionData): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function loadSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function useUploadMutation(onSuccess: OnSuccess) {
  const langRef = useRef<string | undefined>(undefined);
  const filenameRef = useRef<string>("audio");

  const mutation = useUploadAudio({
    mutation: {
      onSuccess: (response) => {
        const data = "data" in response ? response.data : response;
        if (data && "session_id" in data) {
          const sessionId = data.session_id;
          saveSession({ sessionId, filename: filenameRef.current, lang: langRef.current });
          onSuccess(sessionId, langRef.current);
        }
      },
    },
  });

  const upload = (file: File, lang?: string) => {
    langRef.current = lang;
    filenameRef.current = file.name;
    mutation.mutate({ data: { file, lang } });
  };

  return {
    upload,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error as Error | null,
    reset: mutation.reset,
  };
}
