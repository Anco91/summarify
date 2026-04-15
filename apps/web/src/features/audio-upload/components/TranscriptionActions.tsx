"use client";
import { Button } from "@/components/ui/button";
import { generatePdf } from "../utils/generatePdf";

interface TranscriptionActionsProps {
  text: string;
  onSummarize: () => void;
  isSummarizing: boolean;
}

export function TranscriptionActions({ text, onSummarize, isSummarizing }: TranscriptionActionsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => generatePdf(text)}>
        Télécharger PDF
      </Button>
      <Button onClick={onSummarize} disabled={isSummarizing}>
        {isSummarizing ? "Résumé en cours..." : "Résumer avec IA"}
      </Button>
    </div>
  );
}
