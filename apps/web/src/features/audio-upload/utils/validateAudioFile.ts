const ACCEPTED_MIME = new Set([
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/ogg",
  "audio/flac",
  "audio/x-flac",
  "audio/webm",
]);

const MAX_SIZE_MB = 50;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateAudioFile(file: File): ValidationResult {
  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > MAX_SIZE_MB) {
    return {
      valid: false,
      error: `Fichier trop volumineux (${sizeMb.toFixed(1)} Mo). Limite : ${MAX_SIZE_MB} Mo`,
    };
  }

  if (!ACCEPTED_MIME.has(file.type)) {
    return {
      valid: false,
      error: `Format non supporté (${file.type || "inconnu"}). Formats acceptés : mp3, wav, m4a, ogg, flac`,
    };
  }

  return { valid: true };
}
