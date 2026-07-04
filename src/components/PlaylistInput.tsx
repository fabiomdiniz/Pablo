"use client";

import { useState, useRef, useEffect } from "react";
import { useGame } from "@/context/GameContext";

export default function PlaylistInput() {
  const { state, fetchTracks } = useGame();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = state.phase === "loading";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const urls = input
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (urls.length === 0) return;
    await fetchTracks(urls);
  };

  // Reset input when user resets the game
  useEffect(() => {
    if (state.phase === "idle" && state.error === null) {
      setInput("");
    }
  }, [state.phase, state.error]);

  const tracksLoaded = state.phase !== "idle" && state.phase !== "loading";

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto mb-8">
      <label className="block text-sm font-medium text-spotify-gray mb-2">
        Paste Spotify playlist URL(s) — one per line or comma-separated
      </label>
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          placeholder={
            "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M\nhttps://open.spotify.com/playlist/...\nspotify:playlist:37i9dQZF1DXcBWIGoYBM5M"
          }
          rows={3}
          className="w-full px-4 py-3 bg-spotify-light border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-spotify-green focus:border-transparent resize-none disabled:opacity-50"
        />
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="text-xs text-spotify-gray">
          Supports: open.spotify.com/playlist/... or spotify:playlist:... or plain IDs
        </div>
        {!tracksLoaded ? (
          <button
            type="submit"
            disabled={isLoading || input.trim().length === 0}
            className="px-6 py-2 bg-spotify-green text-black font-semibold rounded-full hover:bg-green-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Spinner />
                Loading...
              </span>
            ) : (
              "Load Tracks"
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setInput("");
              window.dispatchEvent(new Event("resetGame"));
            }}
            className="px-6 py-2 bg-spotify-light text-white font-medium rounded-full hover:bg-gray-600 transition-colors text-sm"
          >
            New Playlist
          </button>
        )}
      </div>

      {tracksLoaded && (
        <div className="mt-2 text-sm text-spotify-green">
          ✓ {state.tracks.length} playable tracks loaded
        </div>
      )}
    </form>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
