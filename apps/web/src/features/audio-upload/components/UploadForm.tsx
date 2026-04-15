"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SummaryPanel } from "@/features/summary/components/SummaryPanel";
import { useSummaryMutation } from "@/features/summary/hooks/useSummaryMutation";
import { useTranscriptionSSE } from "../hooks/useTranscriptionSSE";
import { useUploadMutation } from "../hooks/useUploadMutation";
import { AudioUploadForm } from "./AudioUploadForm";
import { TranscriptionActions } from "./TranscriptionActions";
import { TranscriptionViewer } from "./TranscriptionViewer";

export function UploadForm() {
  const sse = useTranscriptionSSE();
  const { upload, isPending: isUploading, isError: uploadFailed, error: uploadError } =
    useUploadMutation((jobId, lang) => sse.startStream(jobId, lang));
  const summary = useSummaryMutation();

  const isProcessing = isUploading || sse.status === "connecting" || sse.status === "streaming";

  const submitLabel = isUploading
    ? "Upload en cours..."
    : isProcessing
      ? "Transcription..."
      : "Transcrire";

  return (
    <div className="space-y-6">
      <AudioUploadForm
        onSubmit={(file, lang) => { sse.reset(); summary.reset(); upload(file, lang); }}
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
          onSummarize={() => summary.summarize(sse.text)}
          isSummarizing={summary.isPending}
        />
      )}

      {summary.data && (
        <SummaryPanel summary={summary.data.summary} model={summary.data.model} />
      )}
    </div>
  );
}
