"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type SSEStatus = "idle" | "connecting" | "streaming" | "done" | "error";

export interface UseTranscriptionSSEReturn {
  text: string;
  status: SSEStatus;
  segmentCount: number;
  elapsedMs: number;
  startStream: (jobId: string, lang?: string) => void;
  reset: () => void;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const MAX_RETRIES = 3;

export function useTranscriptionSSE(): UseTranscriptionSSEReturn {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<SSEStatus>("idle");
  const [segmentCount, setSegmentCount] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const esRef = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Persist jobId and lang across retries
  const jobIdRef = useRef<string | null>(null);
  const langRef = useRef<string | undefined>(undefined);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - (startTimeRef.current ?? Date.now()));
    }, 200);
  }, []);

  const openStream = useCallback(
    (jobId: string, lang?: string, isRetry = false) => {
      esRef.current?.close();

      if (!isRetry) {
        setText("");
        setSegmentCount(0);
        setElapsedMs(0);
        retriesRef.current = 0;
        jobIdRef.current = jobId;
        langRef.current = lang;
        startTimer();
      }

      setStatus("connecting");

      const url = new URL(`${BASE_URL}/api/stream/${jobId}`);
      if (lang) url.searchParams.set("lang", lang);

      const es = new EventSource(url.toString());
      esRef.current = es;

      es.onopen = () => setStatus("streaming");

      es.onmessage = (event: MessageEvent<string>) => {
        if (event.data === "[DONE]") {
          setStatus("done");
          stopTimer();
          es.close();
          return;
        }
        setText((prev) => prev + event.data);
        setSegmentCount((n) => n + 1);
      };

      es.onerror = () => {
        es.close();
        if (retriesRef.current < MAX_RETRIES) {
          retriesRef.current += 1;
          const delay = Math.pow(2, retriesRef.current - 1) * 1000; // 1s, 2s, 4s
          setTimeout(() => {
            if (jobIdRef.current) {
              openStream(jobIdRef.current, langRef.current, true);
            }
          }, delay);
        } else {
          setStatus("error");
          stopTimer();
        }
      };
    },
    [startTimer, stopTimer]
  );

  const startStream = useCallback(
    (jobId: string, lang?: string) => openStream(jobId, lang),
    [openStream]
  );

  const reset = useCallback(() => {
    esRef.current?.close();
    stopTimer();
    setText("");
    setStatus("idle");
    setSegmentCount(0);
    setElapsedMs(0);
    retriesRef.current = 0;
    jobIdRef.current = null;
    langRef.current = undefined;
  }, [stopTimer]);

  useEffect(() => {
    return () => {
      esRef.current?.close();
      stopTimer();
    };
  }, [stopTimer]);

  return { text, status, segmentCount, elapsedMs, startStream, reset };
}
