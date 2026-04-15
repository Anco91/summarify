"use client";
import type { SSEStatus } from "../hooks/useTranscriptionSSE";

interface Props {
  text: string;
  status: SSEStatus;
}

const statusLabel: Record<SSEStatus, string | null> = {
  idle: null,
  connecting: "Connexion au serveur...",
  streaming: "Transcription en cours...",
  done: null,
  error: null,
};

export function TranscriptionViewer({ text, status }: Props) {
  const label = statusLabel[status];

  if (!text && !label) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {label && (
        <p className="mb-3 flex items-center gap-2 text-sm text-indigo-600">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
          {label}
        </p>
      )}
      {text && (
        <p className="whitespace-pre-wrap text-slate-800 leading-relaxed">
          {text}
        </p>
      )}
    </div>
  );
}
