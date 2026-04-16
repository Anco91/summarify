import Image from "next/image";
import { UploadForm } from "@/features/audio-upload/components/UploadForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-3xl px-4">
        <header className="mb-10 flex flex-col items-center gap-3">
          <Image
            src="/logo_summarify_wt_back.svg"
            alt="Summarify"
            width={220}
            height={64}
            priority
          />
          <p className="text-sm text-muted-foreground">
            Transcription audio en temps réel · Résumé IA
          </p>
        </header>
        <UploadForm />
      </div>
    </main>
  );
}
