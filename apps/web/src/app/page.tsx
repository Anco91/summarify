import { UploadForm } from "@/features/audio-upload/components/UploadForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-3xl px-4">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-indigo-600">Summarify</h1>
          <p className="mt-2 text-slate-500">
            Transcription audio en temps reel · Resume IA · Export PDF
          </p>
        </header>
        <UploadForm />
      </div>
    </main>
  );
}
