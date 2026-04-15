"use client";

interface Props {
  summary: string;
  model: string;
}

export function SummaryPanel({ summary, model }: Props) {
  return (
    <section
      className="rounded-xl border border-indigo-100 bg-indigo-50 p-5 dark:border-indigo-800 dark:bg-indigo-950"
      aria-label="Résumé généré par l'IA"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold text-indigo-800 dark:text-indigo-200">Résumé IA</p>
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-600 dark:bg-indigo-800 dark:text-indigo-300">
          {model}
        </span>
      </div>
      <p className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-200">
        {summary}
      </p>
    </section>
  );
}
