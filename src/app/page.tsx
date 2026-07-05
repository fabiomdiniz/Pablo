"use client";

import { useEffect, useRef, Suspense } from "react";
import { GameProvider, useGame } from "@/context/GameContext";
import { SpotifyPlayerProvider, useSpotifyPlayer } from "@/context/SpotifyPlayerContext";
import PlaylistInput from "@/components/PlaylistInput";
import GameBoard from "@/components/GameBoard";
import type { MusicSource } from "@/lib/types";

/* ── Player status (Spotify only) ── */

function PlayerStatus() {
  const { isReady, errorMessage } = useSpotifyPlayer();
  const { musicSource } = useGame();
  if (musicSource !== "spotify") return null;

  if (errorMessage) {
    return (
      <div className="w-full max-w-xl mb-4 bg-red-900/40 border border-red-700/60 rounded-lg p-3 text-sm text-red-300 text-center">{errorMessage}</div>
    );
  }
  if (!isReady) {
    return (
      <div className="w-full max-w-xl mb-4 bg-yellow-900/30 border border-yellow-700/40 rounded-lg p-3 text-sm text-yellow-300 text-center flex items-center justify-center gap-2">
        <div className="w-3 h-3 border-2 border-yellow-400/40 border-t-yellow-400 rounded-full animate-spin" />
        Connecting to Spotify player...
      </div>
    );
  }
  return (
    <div className="w-full max-w-xl mb-2 flex justify-end">
      <span className="text-xs text-spotify-green/70">✓ Player ready</span>
    </div>
  );
}

/* ── Login screen ── */

function LoginScreen() {
  const { musicSource, setMusicSource } = useGame();

  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <div className="bg-spotify-light/40 rounded-2xl p-8 text-center max-w-md w-full">
        <h2 className="text-xl font-bold text-white mb-1">Choose your music source</h2>
        <p className="text-spotify-gray text-sm mb-6">
          Log in to load playlists and start guessing
        </p>

        {/* Source selector */}
        <div className="flex gap-2 mb-6 bg-spotify-dark rounded-full p-1">
          {(["spotify", "deezer"] as MusicSource[]).map((s) => (
            <button
              key={s}
              onClick={() => setMusicSource(s)}
              className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
                musicSource === s
                  ? "bg-spotify-green text-black"
                  : "text-spotify-gray hover:text-white"
              }`}
            >
              {s === "spotify" ? "Spotify" : "Deezer"}
            </button>
          ))}
        </div>

        {/* Spotify login */}
        {musicSource === "spotify" && (
          <div className="space-y-4">
            <a
              href="/api/spotify/login"
              className="inline-block px-8 py-3 bg-[#1DB954] text-black font-bold rounded-full hover:bg-green-400 transition-all text-lg shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 w-full"
            >
              Log in with Spotify
            </a>
            <p className="text-spotify-gray/50 text-xs">
              Premium account required for playback
            </p>
          </div>
        )}

        {/* Deezer — no login needed */}
        {musicSource === "deezer" && (
          <div className="space-y-4">
            <button
              onClick={() => setMusicSource("deezer")}
              className="inline-block px-8 py-3 bg-[#FF0092] text-white font-bold rounded-full hover:bg-pink-500 transition-all text-lg shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 w-full"
            >
              Continue with Deezer
            </button>
            <p className="text-spotify-gray/60 text-xs leading-relaxed">
              <strong>No login required!</strong> Deezer provides 30-second previews for free.
              Just paste any Deezer playlist URL to start playing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main app content ── */

function AppContent() {
  const { spotifyAuth, deezerAuth, authChecked, checkAuth, musicSource, setMusicSource, state, fetchTracks } = useGame();
  const autoLoaded = useRef(false);

  const isAuthed = musicSource === "deezer" ? true : spotifyAuth; // Deezer needs no login

  // Auto-load playlists from URL on first auth
  useEffect(() => {
    if (!authChecked || !isAuthed || autoLoaded.current) return;
    if (typeof window === "undefined") return;
    const urls = new URLSearchParams(window.location.search).getAll("p");
    if (urls.length > 0) {
      autoLoaded.current = true;
      fetchTracks(urls);
    }
  }, [authChecked, isAuthed, fetchTracks]);

  // Reset flag on game reset
  const prevPhase = useRef(state.phase);
  useEffect(() => {
    if (state.phase === "idle" && prevPhase.current !== "idle") {
      autoLoaded.current = false;
    }
    prevPhase.current = state.phase;
  }, [state.phase]);

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-spotify-green/30 border-t-spotify-green rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthed) {
    return <LoginScreen />;
  }

  return (
    <SpotifyPlayerProvider>
      {/* Top bar */}
      <div className="flex items-center justify-between w-full max-w-xl mb-2">
        {/* Source switch */}
        <div className="flex gap-1 bg-spotify-dark rounded-full p-0.5">
          {(["spotify", "deezer"] as MusicSource[]).map((s) => (
            <button
              key={s}
              onClick={() => setMusicSource(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                musicSource === s
                  ? "bg-spotify-green text-black"
                  : "text-spotify-gray hover:text-white"
              }`}
            >
              {s === "spotify" ? "Spotify" : "Deezer"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-spotify-green/70">
            ✓ {musicSource === "deezer" ? "Deezer" : "Spotify"}
          </span>
          {musicSource === "spotify" && (
            <button
              onClick={async () => {
                await fetch("/api/spotify/logout");
                checkAuth();
              }}
              className="text-xs text-spotify-gray hover:text-white underline transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      <PlayerStatus />
      <PlaylistInput key={`${musicSource}-${isAuthed}`} initialUrls={[]} />
      <GameBoard />
    </SpotifyPlayerProvider>
  );
}

export default function Home() {
  return (
    <GameProvider>
      <main className="min-h-screen flex flex-col items-center px-4 py-10 relative">
        <div className="text-center mb-10">
          <a href="/" className="inline-block">
            <h1 className="text-5xl font-extrabold tracking-tight text-spotify-green hover:text-green-400 transition-colors">
              Pablo
            </h1>
          </a>
        </div>

        <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-4 border-spotify-green/30 border-t-spotify-green rounded-full animate-spin" /></div>}>
          <AppContent />
        </Suspense>

        <footer className="mt-auto pt-16 pb-4 text-center text-xs text-spotify-gray/50">
          Powered by Spotify & Deezer APIs
        </footer>
      </main>
    </GameProvider>
  );
}
