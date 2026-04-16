"use client";
import { Button } from "@/components/ui/button";

interface SummaryActionsProps {
  onSummarize: () => void;
  isSummarizing: boolean;
  disabled?: boolean;
}

export function SummaryActions({ onSummarize, isSummarizing, disabled }: SummaryActionsProps) {
  return (
    <Button onClick={onSummarize} disabled={isSummarizing || disabled}>
      {isSummarizing ? "Résumé en cours..." : "Résumer avec IA"}
    </Button>
  );
}
