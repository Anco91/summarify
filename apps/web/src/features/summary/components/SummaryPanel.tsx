"use client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SummaryPanelProps {
  summary: string;
  model: string;
}

export function SummaryPanel({ summary, model }: SummaryPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Résumé IA</CardTitle>
          <Badge variant="secondary">{model}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{summary}</p>
      </CardContent>
    </Card>
  );
}
