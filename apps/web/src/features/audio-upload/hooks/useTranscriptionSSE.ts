"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type SSEStatus = "idle" | "connecting" | "streaming" | "done" | "error";

export interface TranscriptionState {
  text: string;
  status: SSEStatus;
  segmentCount: number;
  startedAt: number | null;
}

export interface UseTranscriptionSSEReturn extends TranscriptionState {
  startStream: (jobId: string, lang?: string) => void;
  reset: () => void;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const MAX_RETRIES = 3;

const IDLE: TranscriptionState = {
  text: "",
  status: "idle",
  segmentCount: 0,
  startedAt: null,
};

function buildStreamUrl(jobId: string, lang?: string): string {
  const url = new URL(`${BASE_URL}/api/stream/${jobId}`);
  if (lang) url.searchParams.set("lang", lang);
  return url.toString();
}

export function useTranscriptionSSE(): UseTranscriptionSSEReturn {
  const [state, setState] = useState<TranscriptionState>(IDLE);

  const esRef = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);
  const jobIdRef = useRef<string | null>(null);
  const langRef = useRef<string | undefined>(undefined);

  const openStream = useCallback((jobId: string, lang?: string, isRetry = false) => {
    esRef.current?.close();

    if (!isRetry) {
      retriesRef.current = 0;
      jobIdRef.current = jobId;
      langRef.current = lang;
      setState({ text: "", status: "connecting", segmentCount: 0, startedAt: Date.now() });
    } else {
      setState((prev) => ({ ...prev, status: "connecting" }));
    }

    const es = new EventSource(buildStreamUrl(jobId, lang));
    esRef.current = es;

    es.onopen = () => setState((prev) => ({ ...prev, status: "streaming" }));

    es.onmessage = (event: MessageEvent<string>) => {
      if (event.data === "[DONE]") {
        es.close();
        setState((prev) => ({ ...prev, status: "done" }));
        return;
      }
      setState((prev) => ({
        ...prev,
        text: prev.text + event.data,
        segmentCount: prev.segmentCount + 1,
      }));
    };

    es.onerror = () => {
      es.close();
      if (retriesRef.current < MAX_RETRIES) {
        retriesRef.current += 1;
        const delay = 2 ** (retriesRef.current - 1) * 1000;
        setTimeout(() => {
          if (jobIdRef.current) openStream(jobIdRef.current, langRef.current, true);
        }, delay);
      } else {
        setState((prev) => ({ ...prev, status: "error" }));
      }
    };
  }, []);

  const startStream = useCallback(
    (jobId: string, lang?: string) => openStream(jobId, lang),
    [openStream],
  );

  const reset = useCallback(() => {
    esRef.current?.close();
    setState(IDLE);
    retriesRef.current = 0;
    jobIdRef.current = null;
    langRef.current = undefined;
  }, []);

  // Cleanup only: close EventSource on unmount
  useEffect(() => () => esRef.current?.close(), []);

  return { ...state, startStream, reset };
}
