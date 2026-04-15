import { Providers } from "./providers";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Summarify — Transcription audio en temps reel",
  description: "Transcrivez vos fichiers audio en temps reel avec IA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
