import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pablo — Music Guessing Game",
  description:
    "A music guessing game. Listen to a song and guess its release date, artist, and title.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-spotify-dark text-white antialiased">
        {children}
      </body>
    </html>
  );
}
