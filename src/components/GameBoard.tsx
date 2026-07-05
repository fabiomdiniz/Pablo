"use client";

import { useGame } from "@/context/GameContext";
import { useSpotifyPlayer } from "@/context/SpotifyPlayerContext";
import HiddenCard from "./HiddenCard";
import RevealedCard from "./RevealedCard";
import AudioPlayer from "./AudioPlayer";
import GameControls from "./GameControls";

export default function GameBoard() {
  const { state } = useGame();
  const { phase, currentTrack, error } = state;
  const { musicSource } = useGame();
  const { isReady } = useSpotifyPlayer();

  // Show error banner
  if (error) {
    return (
      <div className="w-full max-w-xl mx-auto">
        <div className="bg-red-900/40 border border-red-700/60 rounded-xl p-6 text-center">
          <p className="text-red-300 text-lg mb-1">⚠️ {error}</p>
        </div>
      </div>
    );
  }

  // Loading spinner
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="w-12 h-12 border-4 border-spotify-green/30 border-t-spotify-green rounded-full animate-spin" />
        <p className="text-spotify-gray">Fetching tracks from {musicSource === "deezer" ? "Deezer" : "Spotify"}...</p>
      </div>
    );
  }

  // Idle state
  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-spotify-gray">
        <svg className="w-20 h-20 opacity-30" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
        <p className="text-lg">Paste a playlist URL above to get started</p>
      </div>
    );
  }

  // Game phases
  return (
    <div className="w-full max-w-xl mx-auto">
      {currentTrack && (
        <AudioPlayer
          track={currentTrack}
          isPlaying={(phase === "playing" || phase === "revealed") && isReady}
        />
      )}

      <div className="bg-spotify-light/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-800/50 min-h-[400px] flex flex-col items-center justify-center">
        {phase === "ready" && (
          <div className="flex flex-col items-center gap-3 py-16">
            <p className="text-xl text-white font-semibold">
              {state.tracks.length} songs loaded
            </p>
            <p className="text-spotify-gray">
              {isReady ? "Press Start to begin!" : "Waiting for player..."}
            </p>
          </div>
        )}

        {phase === "playing" && currentTrack && <HiddenCard />}

        {phase === "revealed" && currentTrack && (
          <RevealedCard track={currentTrack} />
        )}

        {phase === "finished" && (
          <div className="flex flex-col items-center gap-4 py-16">
            <span className="text-5xl">🏆</span>
            <p className="text-xl text-white font-semibold">
              You made it through all {state.tracks.length} songs!
            </p>
          </div>
        )}
      </div>

      <GameControls />
    </div>
  );
}
