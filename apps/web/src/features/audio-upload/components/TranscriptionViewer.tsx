"use client";
import { useState } from "react";
import type { SSEStatus } from "../hooks/useTranscriptionSSE";

interface Props {
  text: string;
  status: SSEStatus;
  segmentCount: number;
  elapsedMs: number;
}

const statusLabel: Record<SSEStatus, string | null> = {
  idle: null,
  connecting: "Connexion au serveur...",
  streaming: "Transcription en cours...",
  done: null,
  error: "Erreur de connexion — reconnexion automatique…",
};

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function TranscriptionViewer({
  text,
  status,
  segmentCount,
  elapsedMs,
}: Props) {
  const [copied, setCopied] = useState(false);
  const label = statusLabel[status];
  const isActive = status === "connecting" || status === "streaming";

  const handleCopy = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!text && !label) return null;

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      aria-label="Résultat de la transcription"
    >
      {/* Status bar */}
      {label && (
        <p
          className={`mb-3 flex items-center gap-2 text-sm ${
            status === "error"
              ? "text-red-600 dark:text-red-400"
              : "text-indigo-600 dark:text-indigo-400"
          }`}
          role="status"
          aria-live="polite"
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              status === "error" ? "bg-red-500" : "animate-pulse bg-indigo-500"
            }`}
            aria-hidden="true"
          />
          {label}
        </p>
      )}

      {/* Metadata row */}
      {(isActive || status === "done") && (
        <div className="mb-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          {segmentCount > 0 && (
            <span aria-label={`${segmentCount} segments reçus`}>
              {segmentCount} segment{segmentCount > 1 ? "s" : ""}
            </span>
          )}
          {elapsedMs > 0 && (
            <span
              aria-label={`Durée écoulée : ${formatTime(elapsedMs)}`}
              aria-live="off"
            >
              ⏱ {formatTime(elapsedMs)}
            </span>
          )}
        </div>
      )}

      {/* Transcript text */}
      {text && (
        <div
          aria-live="polite"
          aria-busy={isActive}
          className="relative"
        >
          <p className="whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-100">
            {text}
          </p>

          {/* Copy button — shown when there's text */}
          <button
            type="button"
            onClick={handleCopy}
            disabled={!text}
            className="mt-3 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50
              px-3 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-100
              disabled:cursor-not-allowed disabled:opacity-50
              dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300
              dark:hover:bg-slate-600"
            aria-label={copied ? "Copié !" : "Copier la transcription"}
          >
            {copied ? (
              <>
                <CheckIcon />
                Copié !
              </>
            ) : (
              <>
                <CopyIcon />
                Copier
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
}

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
