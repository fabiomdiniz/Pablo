"use client";

import { GameProvider } from "@/context/GameContext";
import PlaylistInput from "@/components/PlaylistInput";
import GameBoard from "@/components/GameBoard";

export default function Home() {
  return (
    <GameProvider>
      <main className="min-h-screen flex flex-col items-center px-4 py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold tracking-tight mb-2 text-spotify-green">
            Pablo
          </h1>
          <p className="text-spotify-gray text-sm">
            Guess the song. Beat the clock. Own the playlist.
          </p>
        </div>

        {/* Playlist input */}
        <PlaylistInput />

        {/* Game board */}
        <GameBoard />

        {/* Footer */}
        <footer className="mt-auto pt-16 pb-4 text-center text-xs text-spotify-gray/50">
          Powered by Spotify Web API
        </footer>
      </main>
    </GameProvider>
  );
}
