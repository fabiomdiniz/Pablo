import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pablo",
  description:
    "A music guessing game. Listen to a song and guess its release date, artist, and title.",
  icons: {
    icon: "/logo.png",
  },
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
        <Script
          src="https://sdk.scdn.co/spotify-player.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
