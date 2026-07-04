"use client";

import { useEffect, useRef, Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { GameProvider, useGame } from "@/context/GameContext";
import { SpotifyPlayerProvider, useSpotifyPlayer } from "@/context/SpotifyPlayerContext";
import PlaylistInput from "@/components/PlaylistInput";
import GameBoard from "@/components/GameBoard";

function PlayerStatus() {
  const { isReady, errorMessage } = useSpotifyPlayer();

  if (errorMessage) {
    return (
      <div className="w-full max-w-xl mb-4 bg-red-900/40 border border-red-700/60 rounded-lg p-3 text-sm text-red-300 text-center">
        {errorMessage}
      </div>
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

function AppContent() {
  const { isAuthenticated, authChecked, checkAuth, state, fetchTracks } = useGame();
  const router = useRouter();
  const autoLoaded = useRef(false);

  // Parse playlist URLs from the address bar
  function getPlaylistsFromUrl(): string[] {
    if (typeof window === "undefined") return [];
    return new URLSearchParams(window.location.search).getAll("p");
  }

  const [urlPlaylists, setUrlPlaylists] = useState<string[]>([]);

  // On mount + auth ready, parse URL and auto-load
  useEffect(() => {
    const urls = getPlaylistsFromUrl();
    setUrlPlaylists(urls);
  }, []);

  useEffect(() => {
    if (!authChecked || !isAuthenticated || autoLoaded.current) return;
    const urls = getPlaylistsFromUrl();
    if (urls.length > 0) {
      autoLoaded.current = true;
      fetchTracks(urls);
    }
  }, [authChecked, isAuthenticated, fetchTracks]);

  // Reset auto-loaded flag on game reset
  const prevPhase = useRef(state.phase);
  useEffect(() => {
    if (state.phase === "idle" && prevPhase.current !== "idle") {
      autoLoaded.current = false;
      router.replace("/", { scroll: false });
    }
    prevPhase.current = state.phase;
  }, [state.phase, router]);

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-spotify-green/30 border-t-spotify-green rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center gap-6 py-16">
        <div className="bg-spotify-light/40 rounded-2xl p-10 text-center max-w-md">
          <svg className="w-16 h-16 text-spotify-green mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          <h2 className="text-xl font-bold text-white mb-2">Log in with Spotify</h2>
          <p className="text-spotify-gray text-sm mb-6">
            Pablo needs your Spotify account to access playlist tracks and play music.
            A Premium account is required for full song playback.
          </p>
          <a
            href="/api/spotify/login"
            className="inline-block px-8 py-3 bg-spotify-green text-black font-bold rounded-full hover:bg-green-400 transition-all text-lg shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
          >
            Log in with Spotify
          </a>
          <p className="text-spotify-gray/50 text-xs mt-4">
            You&apos;ll be redirected to Spotify to authorize, then back here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SpotifyPlayerProvider>
      <div className="flex items-center justify-end w-full max-w-xl mb-2">
        <span className="text-xs text-spotify-green/70 mr-2">✓ Connected to Spotify</span>
        <button
          onClick={async () => {
            await fetch("/api/spotify/logout");
            checkAuth();
          }}
          className="text-xs text-spotify-gray hover:text-white underline transition-colors"
        >
          Disconnect
        </button>
      </div>
      <PlayerStatus />
      <PlaylistInput key={urlPlaylists.join(",") || "empty"} initialUrls={urlPlaylists} />
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
          Powered by Spotify Web API
        </footer>
      </main>
    </GameProvider>
  );
}
