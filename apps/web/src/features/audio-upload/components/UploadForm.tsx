"use client";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SummaryPanel } from "@/features/summary/components/SummaryPanel";
import { useSummaryMutation } from "@/features/summary/hooks/useSummaryMutation";
import { clearSession, loadSession } from "../hooks/useUploadMutation";
import { useTranscriptionSSE } from "../hooks/useTranscriptionSSE";
import { useUploadMutation } from "../hooks/useUploadMutation";
import { AudioUploadForm } from "./AudioUploadForm";
import { TranscriptionActions } from "./TranscriptionActions";
import { TranscriptionViewer } from "./TranscriptionViewer";

export function UploadForm() {
  const sse = useTranscriptionSSE();
  const [filename, setFilename] = useState("audio");

  const { upload, isPending: isUploading, isError: uploadFailed, error: uploadError } =
    useUploadMutation((sessionId) => sse.startStream(sessionId));

  const summary = useSummaryMutation();

  // Reconnect to in-progress or buffered session from previous page load
  useEffect(() => {
    const session = loadSession();
    if (!session) return;
    setFilename(session.filename);
    sse.startStream(session.sessionId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear localStorage when session is done or on error
  useEffect(() => {
    if (sse.status === "done" || sse.status === "error") {
      clearSession();
    }
  }, [sse.status]);

  const isProcessing = isUploading || sse.status === "connecting" || sse.status === "streaming";

  const submitLabel = isUploading
    ? "Upload en cours..."
    : isProcessing
      ? "Transcription..."
      : "Transcrire";

  return (
    <div className="space-y-6">
      <AudioUploadForm
        onSubmit={(file, lang) => {
          sse.reset();
          summary.reset();
          setFilename(file.name);
          upload(file, lang);
        }}
        disabled={isProcessing}
        submitLabel={submitLabel}
      />

      {uploadFailed && (
        <Alert variant="destructive">
          <AlertDescription>{uploadError?.message}</AlertDescription>
        </Alert>
      )}

      {summary.isError && (
        <Alert variant="destructive">
          <AlertDescription>{summary.error?.message}</AlertDescription>
        </Alert>
      )}

      <TranscriptionViewer
        text={sse.text}
        status={sse.status}
        segmentCount={sse.segmentCount}
        startedAt={sse.startedAt}
      />

      {sse.status === "done" && sse.text && (
        <TranscriptionActions
          text={sse.text}
          filename={filename}
          summary={summary.data?.summary}
          onSummarize={() => summary.summarize(sse.text)}
          isSummarizing={summary.isPending}
        />
      )}

      {summary.data && (
        <SummaryPanel
          summary={summary.data.summary}
          model={summary.data.model}
          filename={filename}
        />
      )}
    </div>
  );
}
