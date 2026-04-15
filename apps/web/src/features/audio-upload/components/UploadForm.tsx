"use client";
import { useRef, useState } from "react";
import { SummaryPanel } from "@/features/summary/components/SummaryPanel";
import { useSummaryMutation } from "@/features/summary/hooks/useSummaryMutation";
import { useTranscriptionSSE } from "../hooks/useTranscriptionSSE";
import { useUploadMutation } from "../hooks/useUploadMutation";
import { generatePdf } from "../utils/generatePdf";
import { LanguageSelect } from "./LanguageSelect";
import { TranscriptionViewer } from "./TranscriptionViewer";

export function UploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [lang, setLang] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const { text, status, segmentCount, elapsedMs, startStream, reset } =
    useTranscriptionSSE();

  const { upload, isPending: isUploading, isError: uploadError, error: uploadErr, reset: resetUpload } =
    useUploadMutation((jobId) => startStream(jobId, lang || undefined));

  const summary = useSummaryMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    reset();
    summary.reset();
    try {
      upload(file);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  };

  const handleFileChange = () => {
    setValidationError(null);
    reset();
    summary.reset();
    resetUpload();
  };

  const isProcessing =
    isUploading || status === "connecting" || status === "streaming";

  const displayError =
    validationError ??
    (uploadError ? uploadErr?.message : null);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Fichier audio (mp3, wav, m4a, ogg, flac — max 50 Mo)
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            required
            aria-required="true"
            aria-describedby="file-hint"
            onChange={handleFileChange}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
              file:mr-4 file:rounded file:border-0 file:bg-indigo-50 file:px-3 file:py-1
              file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100
              dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200
              dark:file:bg-indigo-900 dark:file:text-indigo-300"
          />
          <p id="file-hint" className="sr-only">
            Formats acceptés : mp3, wav, m4a, ogg, flac. Taille maximale : 50 Mo.
          </p>
        </label>

        <LanguageSelect value={lang} onChange={setLang} disabled={isProcessing} />

        <button
          type="submit"
          disabled={isProcessing}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white
            shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50
            dark:bg-indigo-500 dark:hover:bg-indigo-600"
          aria-busy={isProcessing}
        >
          {isUploading
            ? "Upload en cours..."
            : isProcessing
              ? "Transcription..."
              : "Transcrire"}
        </button>
      </form>

      {displayError && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400"
        >
          {displayError}
        </p>
      )}

      <TranscriptionViewer
        text={text}
        status={status}
        segmentCount={segmentCount}
        elapsedMs={elapsedMs}
      />

      {status === "done" && text && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => generatePdf(text)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium
              text-slate-700 shadow-sm transition hover:bg-slate-50
              dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Télécharger PDF
          </button>
          <button
            type="button"
            onClick={() => summary.summarize(text)}
            disabled={summary.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white
              shadow-sm transition hover:bg-indigo-700 disabled:opacity-50
              dark:bg-indigo-500 dark:hover:bg-indigo-600"
            aria-busy={summary.isPending}
          >
            {summary.isPending ? "Résumé en cours..." : "Résumer avec IA"}
          </button>
        </div>
      )}

      {summary.isError && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400"
        >
          {summary.error?.message}
        </p>
      )}

      {summary.data && (
        <SummaryPanel summary={summary.data.summary} model={summary.data.model} />
      )}
    </div>
  );
}
