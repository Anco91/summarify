"use client";

interface Props {
  summary: string;
  model: string;
}

export function SummaryPanel({ summary, model }: Props) {
  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold text-indigo-800">Resume IA</p>
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-600">
          {model}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{summary}</p>
    </div>
  );
}
