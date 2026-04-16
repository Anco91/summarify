"use client";
import { Button } from "@/components/ui/button";
import { generatePdf } from "../utils/generatePdf";

interface TranscriptionActionsProps {
  text: string;
  filename?: string;
}

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

export function TranscriptionActions({ text, filename = "audio" }: TranscriptionActionsProps) {
  return (
    <Button variant="outline" onClick={() => generatePdf(text, `${baseName(filename)}_transcription`)}>
      Télécharger PDF
    </Button>
  );
}
