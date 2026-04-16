"use client";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LANGUAGES = [
  { value: "auto", label: "Auto-détection" },
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

export function LanguageSelect({ value, onChange, disabled }: LanguageSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="language-select">Langue</Label>
      <Select value={value} onValueChange={(v) => onChange(v ?? "auto")} disabled={disabled}>
        <SelectTrigger id="language-select">
          <SelectValue placeholder="Auto-détection" />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map(({ value: v, label }) => (
            <SelectItem key={v} value={v}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
