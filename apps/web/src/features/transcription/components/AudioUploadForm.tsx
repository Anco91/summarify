"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSelect } from "./LanguageSelect";

const ACCEPTED_MIME = new Set([
  "audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4",
  "audio/m4a", "audio/x-m4a", "audio/ogg", "audio/flac",
  "audio/x-flac", "audio/webm",
]);
const MAX_SIZE_MB = 50;

const schema = z.object({
  file: z
    .custom<FileList>()
    .refine((list) => list?.length > 0, "Sélectionnez un fichier audio.")
    .refine(
      (list) => list?.[0]?.size <= MAX_SIZE_MB * 1024 * 1024,
      `Fichier trop volumineux (max ${MAX_SIZE_MB} Mo).`,
    )
    .refine(
      (list) => ACCEPTED_MIME.has(list?.[0]?.type),
      "Format non supporté. Formats acceptés : mp3, wav, m4a, ogg, flac.",
    ),
  lang: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface AudioUploadFormProps {
  onSubmit: (file: File, lang?: string) => void;
  disabled?: boolean;
  submitLabel?: string;
}

export function AudioUploadForm({
  onSubmit,
  disabled,
  submitLabel = "Transcrire",
}: AudioUploadFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { lang: "auto" },
  });

  const lang = watch("lang");

  const submit = ({ file, lang }: FormValues) => {
    onSubmit(file[0], lang === "auto" ? undefined : lang);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="audio-file">
          Fichier audio{" "}
          <span className="text-xs font-normal text-muted-foreground">
            (mp3, wav, m4a, ogg, flac — max {MAX_SIZE_MB} Mo)
          </span>
        </Label>
        <Input
          id="audio-file"
          type="file"
          accept="audio/*"
          aria-describedby={errors.file ? "file-error" : undefined}
          {...register("file")}
        />
        {errors.file && (
          <p id="file-error" role="alert" className="text-sm text-destructive">
            {errors.file.message}
          </p>
        )}
      </div>

      <LanguageSelect
        value={lang}
        onChange={(v) => setValue("lang", v)}
        disabled={disabled}
      />

      <Button type="submit" disabled={disabled}>
        {submitLabel}
      </Button>
    </form>
  );
}
