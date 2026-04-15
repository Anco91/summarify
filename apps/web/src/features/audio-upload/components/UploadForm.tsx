"use client";
import { useRef } from "react";
import { useTranscriptionSSE } from "../hooks/useTranscriptionSSE";
import { useUploadMutation } from "../hooks/useUploadMutation";
import { TranscriptionViewer } from "./TranscriptionViewer";
import { generatePdf } from "../utils/generatePdf";
import { useSummaryMutation } from "@/features/summary/hooks/useSummaryMutation";
import { SummaryPanel } from "@/features/summary/components/SummaryPanel";

export function UploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { text, status, startStream, reset } = useTranscriptionSSE();
  const upload = useUploadMutation((jobId) => startStream(jobId));
  const summary = useSummaryMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    reset();
    summary.reset();
    upload.mutate(file);
  };

  const isProcessing =
    upload.isPending || status === "connecting" || status === "streaming";

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Fichier audio (mp3, wav, m4a, ogg, flac — max 50 Mo)
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            required
            onChange={() => { reset(); summary.reset(); }}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-4 file:rounded file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
          />
        </label>

        <button
          type="submit"
          disabled={isProcessing}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {upload.isPending ? "Upload en cours..." : isProcessing ? "Transcription..." : "Transcrire"}
        </button>
      </form>

      {upload.isError && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{upload.error.message}</p>
      )}
      {status === "error" && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          Erreur de connexion SSE. Veuillez reessayer.
        </p>
      )}

      <TranscriptionViewer text={text} status={status} />

      {status === "done" && text && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => generatePdf(text)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Telecharger PDF
          </button>
          <button
            onClick={() => summary.mutate(text)}
            disabled={summary.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {summary.isPending ? "Resume en cours..." : "Resumer avec IA"}
          </button>
        </div>
      )}

      {summary.isError && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{summary.error.message}</p>
      )}

      {summary.data && <SummaryPanel summary={summary.data.summary} model={summary.data.model} />}
    </div>
  );
}
