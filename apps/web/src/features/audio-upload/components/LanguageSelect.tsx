"use client";

const LANGUAGES = [
  { value: "", label: "Auto-détection" },
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
  { value: "ar", label: "العربية" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
] as const;

interface LanguageSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function LanguageSelect({
  value,
  onChange,
  disabled = false,
}: LanguageSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor="language-select"
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Langue
      </label>
      <select
        id="language-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900
          shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500
          disabled:cursor-not-allowed disabled:opacity-50
          dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
          dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
        aria-label="Sélectionner la langue de transcription"
      >
        {LANGUAGES.map(({ value: v, label }) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
