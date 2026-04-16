"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { SSEStatus } from "../hooks/useTranscriptionSSE";

interface TranscriptionPanelProps {
  text: string;
  status: SSEStatus;
  segmentCount: number;
  startedAt: number | null;
}

const STATUS_LABEL: Partial<Record<SSEStatus, string>> = {
  connecting: "Connexion...",
  streaming: "Transcription en cours",
  error: "Erreur — reconnexion automatique",
};

function formatElapsed(startedAt: number | null): string {
  if (!startedAt) return "";
  const s = Math.floor((Date.now() - startedAt) / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function TranscriptionPanel({ text, status, segmentCount, startedAt }: TranscriptionPanelProps) {
  const [copied, setCopied] = useState(false);
  const isActive = status === "connecting" || status === "streaming";
  const statusLabel = STATUS_LABEL[status];

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!text && !statusLabel) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {statusLabel && (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <span
                className={`h-2 w-2 rounded-full ${isActive ? "animate-pulse bg-primary" : "bg-destructive"}`}
                aria-hidden
              />
              {statusLabel}
            </span>
          )}
          {(isActive || status === "done") && (
            <div className="flex items-center gap-2">
              {segmentCount > 0 && (
                <Badge variant="secondary">
                  {segmentCount} segment{segmentCount > 1 ? "s" : ""}
                </Badge>
              )}
              {startedAt && (
                <Badge variant="outline" aria-live="off">
                  ⏱ {formatElapsed(startedAt)}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      {text && (
        <CardContent>
          <p
            className="whitespace-pre-wrap leading-relaxed"
            aria-live="polite"
            aria-busy={isActive}
          >
            {text}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={copyToClipboard}
          >
            {copied ? "✓ Copié" : "Copier"}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
