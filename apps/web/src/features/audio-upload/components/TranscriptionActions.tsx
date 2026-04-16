"use client";
import { Button } from "@/components/ui/button";
import { generatePdf } from "../utils/generatePdf";

interface TranscriptionActionsProps {
  text: string;
  filename?: string;
  summary?: string;
  onSummarize: () => void;
  isSummarizing: boolean;
}

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

export function TranscriptionActions({
  text,
  filename = "audio",
  summary,
  onSummarize,
  isSummarizing,
}: TranscriptionActionsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => generatePdf(text, `${baseName(filename)}_transcription`)}>
        Télécharger PDF
      </Button>
      {summary && (
        <Button variant="outline" onClick={() => generatePdf(summary, `${baseName(filename)}_resume`)}>
          Télécharger résumé
        </Button>
      )}
      <Button onClick={onSummarize} disabled={isSummarizing}>
        {isSummarizing ? "Résumé en cours..." : "Résumer avec IA"}
      </Button>
    </div>
  );
}
