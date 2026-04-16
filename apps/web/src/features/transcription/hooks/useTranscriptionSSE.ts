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
  startStream: (sessionId: string, lang?: string) => void;
  reset: () => void;
}

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
const MAX_RETRIES = 3;

const IDLE: TranscriptionState = {
  text: "",
  status: "idle",
  segmentCount: 0,
  startedAt: null,
};

function buildStreamUrl(sessionId: string): string {
  return `${BASE_URL}/api/session/${sessionId}/stream`;
}

export function useTranscriptionSSE(): UseTranscriptionSSEReturn {
  const [state, setState] = useState<TranscriptionState>(IDLE);

  const esRef = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);

  const openStream = useCallback((sessionId: string, isRetry = false) => {
    esRef.current?.close();

    if (!isRetry) {
      retriesRef.current = 0;
      sessionIdRef.current = sessionId;
      setState({ text: "", status: "connecting", segmentCount: 0, startedAt: Date.now() });
    } else {
      setState((prev) => ({ ...prev, status: "connecting" }));
    }

    const es = new EventSource(buildStreamUrl(sessionId));
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
          if (sessionIdRef.current) openStream(sessionIdRef.current, true);
        }, delay);
      } else {
        setState((prev) => ({ ...prev, status: "error" }));
      }
    };
  }, []);

  const startStream = useCallback(
    (sessionId: string) => openStream(sessionId),
    [openStream],
  );

  const reset = useCallback(() => {
    esRef.current?.close();
    setState(IDLE);
    retriesRef.current = 0;
    sessionIdRef.current = null;
  }, []);

  // Cleanup only: close EventSource on unmount
  useEffect(() => () => esRef.current?.close(), []);

  return { ...state, startStream, reset };
}
