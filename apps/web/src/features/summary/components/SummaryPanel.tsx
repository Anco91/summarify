"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generatePdf } from "@/features/transcription/utils/generatePdf";

interface SummaryPanelProps {
  summary: string;
  model: string;
  filename?: string;
}

export function SummaryPanel({ summary, model, filename = "audio" }: SummaryPanelProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const baseName = filename.replace(/\.[^.]+$/, "");

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Résumé IA</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{model}</Badge>
            <Button variant="ghost" size="sm" onClick={copy}>
              {copied ? "Copié !" : "Copier"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => generatePdf(summary, `${baseName}_resume`)}
            >
              Télécharger
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{summary}</p>
      </CardContent>
    </Card>
  );
}
