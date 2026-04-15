"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type SSEStatus = "idle" | "connecting" | "streaming" | "done" | "error";

export interface UseTranscriptionSSEReturn {
  text: string;
  status: SSEStatus;
  startStream: (jobId: string) => void;
  reset: () => void;
}

export function useTranscriptionSSE(): UseTranscriptionSSEReturn {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<SSEStatus>("idle");
  const esRef = useRef<EventSource | null>(null);

  const startStream = useCallback((jobId: string) => {
    esRef.current?.close();
    setText("");
    setStatus("connecting");

    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const es = new EventSource(`${baseUrl}/api/stream/${jobId}`);
    esRef.current = es;

    es.onopen = () => setStatus("streaming");

    es.onmessage = (event: MessageEvent<string>) => {
      if (event.data === "[DONE]") {
        setStatus("done");
        es.close();
        return;
      }
      setText((prev) => prev + event.data);
    };

    es.onerror = () => {
      setStatus("error");
      es.close();
    };
  }, []);

  const reset = useCallback(() => {
    esRef.current?.close();
    setText("");
    setStatus("idle");
  }, []);

  useEffect(() => {
    return () => esRef.current?.close();
  }, []);

  return { text, status, startStream, reset };
}
